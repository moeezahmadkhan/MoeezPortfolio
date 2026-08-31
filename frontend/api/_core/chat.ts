import defaultCorpus from './corpus.generated.json' with { type: 'json' }
import {
  buildRefusalReply,
  buildSystemPrompt,
  FALLBACK_REPLY,
  MAX_MESSAGE_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_TURNS,
  MODEL_TIMEOUT_MS,
  MODELS,
  OPENROUTER_ENDPOINT,
  RATE_PER_HOUR,
  RATE_PER_MIN,
} from './persona.js'
import { retrieve, type Chunk } from './retrieval.js'

export type ChatRole = 'user' | 'assistant'
export type ChatMessage = { role: ChatRole; content: string }

// Sanitize, drop junk, truncate, and keep only the most recent MAX_TURNS messages.
export function capMessages(messages: ChatMessage[]): ChatMessage[] {
  const clean = (Array.isArray(messages) ? messages : [])
    .filter((m): m is ChatMessage =>
      !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim().length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
  return clean.slice(-MAX_TURNS)
}

export type OpenRouterBody = {
  model: string
  messages: { role: 'system' | ChatRole; content: string }[]
  max_tokens: number
}

// Builds the OpenRouter payload for one model. The system prompt is passed in rather
// than imported: it is built per request from the chunks retrieval returned, and a
// visitor's turns stay in their own messages, outside it.
export function buildRequestBody(
  messages: ChatMessage[],
  model: string,
  system: string,
): OpenRouterBody {
  return {
    model,
    messages: [{ role: 'system', content: system }, ...messages],
    max_tokens: MAX_OUTPUT_TOKENS,
  }
}

export type RateLimiter = { check: (ip: string, now: number) => { allowed: boolean } }

// In-memory, best-effort (resets on cold start; not shared across instances). IP keys are never pruned — safe only on short-lived serverless instances.
export function createRateLimiter(): RateLimiter {
  const hits = new Map<string, number[]>()
  return {
    check(ip, now) {
      const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000)
      const lastMin = recent.filter((t) => now - t < 60_000).length
      if (lastMin >= RATE_PER_MIN || recent.length >= RATE_PER_HOUR) {
        hits.set(ip, recent)
        return { allowed: false }
      }
      recent.push(now)
      hits.set(ip, recent)
      return { allowed: true }
    },
  }
}

// Module singleton used by the live adapters (tests pass their own limiter).
const defaultLimiter = createRateLimiter()

export type ChatResult = { status: number; body: { reply: string } }

export type HandleArgs = {
  messages: ChatMessage[]
  ip: string
  apiKey: string | undefined
  now?: number
  rateLimiter?: RateLimiter
  fetchImpl?: typeof fetch
  /** Tests pass their own signal; production leaves this unset for a per-model timeout. */
  signal?: AbortSignal
  /** Tests pass their own notes; production uses the corpus built at build time. */
  corpus?: Chunk[]
}

export async function handleChatRequest(args: HandleArgs): Promise<ChatResult> {
  const now = args.now ?? Date.now()
  const rl = args.rateLimiter ?? defaultLimiter
  const doFetch = args.fetchImpl ?? fetch

  if (!args.apiKey) {
    console.warn('[chat] OPENROUTER_API_KEY is not set')
    return { status: 500, body: { reply: FALLBACK_REPLY } }
  }
  if (!rl.check(args.ip, now).allowed) {
    return { status: 429, body: { reply: FALLBACK_REPLY } }
  }

  const capped = capMessages(args.messages)
  if (capped.length === 0) {
    return { status: 400, body: { reply: FALLBACK_REPLY } }
  }

  // Retrieve against the LAST user message: that is the question being asked, and
  // scoring the whole transcript lets an earlier topic outvote the current one.
  const corpus = args.corpus ?? (defaultCorpus as Chunk[])
  const lastUser = [...capped].reverse().find((m) => m.role === 'user')
  const chunks = retrieve(lastUser?.content ?? '', corpus)

  // Nothing in the notes covers this. `retrieve` already applied COVERAGE_FLOOR, so
  // this is not "the best chunk was weak" — it is "he never wrote this down".
  //
  // The model is not called at all. A model handed no notes and asked a question is
  // a model with only its own general knowledge to answer from, and no wording of a
  // system prompt makes that reliably safe. Not asking is the only guarantee — and
  // it is also the cheapest and the fastest path through this function.
  if (chunks.length === 0) {
    return { status: 200, body: { reply: buildRefusalReply(corpus) } }
  }

  const system = buildSystemPrompt(chunks)

  for (const model of MODELS) {
    // Each model gets its own deadline so one hung upstream can't consume the whole
    // cascade's budget. AbortSignal.timeout rejects the fetch, which the catch below
    // treats like any other failure and falls through to the next model.
    const signal = args.signal ?? AbortSignal.timeout(MODEL_TIMEOUT_MS)
    try {
      const res = await doFetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Moeez Portfolio - Chat',
        },
        body: JSON.stringify(buildRequestBody(capped, model, system)),
      })
      if (!res.ok) continue
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const reply = data.choices?.[0]?.message?.content?.trim()
      if (!reply) continue
      return { status: 200, body: { reply } }
    } catch {
      continue
    }
  }
  return { status: 502, body: { reply: FALLBACK_REPLY } }
}
