import defaultCorpus from './corpus.generated.json' with { type: 'json' }
import {
  buildRefusalReply,
  buildSystemPrompt,
  fence,
  FALLBACK_REPLY,
  MAX_INPUT_MESSAGES,
  MAX_MESSAGE_CHARS,
  MAX_OUTPUT_TOKENS,
  MAX_TURNS,
  CASCADE_BUDGET_MS,
  MODEL_TIMEOUT_MS,
  MODELS,
  OPENROUTER_ENDPOINT,
  RATE_PER_HOUR,
  RATE_PER_MIN,
} from './persona.js'
import { isAllowedOrigin } from './request.js'
import { retrieve, type Chunk } from './retrieval.js'

export type ChatRole = 'user' | 'assistant'
export type ChatMessage = { role: ChatRole; content: string }

// Sanitize, drop junk, truncate, and keep only the most recent MAX_TURNS messages.
/**
 * Whatever else was retrieved, ship the block that carries his real LinkedIn and
 * email alongside it.
 *
 * The live eval found every model in the cascade inventing a way to reach him —
 * `moeez@khan.pro`, `hey@moeezahmadkhan.com`, and a truncated
 * `linkedin.com/in/moeez-ahmad-khan` that resolves to nobody — in about 4% of
 * the replies that reached a model. The system prompt forbids that twice. It
 * also, in the same breath, ORDERS the model to point at LinkedIn and email
 * when it cannot answer. When retrieval hands over the skills chunk and not the
 * contact chunk, those two instructions cannot both be obeyed, and the model
 * resolves the contradiction by improvising an address.
 *
 * Fixing that in the prompt would be arguing with a model about arithmetic it
 * cannot do. Fixing it here removes the contradiction: the details are always
 * in front of it, so "give the exact link from the notes" is always possible.
 *
 * Returns the list unchanged when the contact block is already in it, or when
 * the corpus has no such block (a corpus with no links must not fabricate one).
 */
export function withContactBlock(chunks: Chunk[], corpus: Chunk[]): Chunk[] {
  if (chunks.length === 0) return chunks
  const contact = corpus.find((c) => /linkedin\.com\/in\//i.test(c.text))
  if (!contact || chunks.some((c) => c.id === contact.id)) return chunks
  return [...chunks, contact]
}

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
    // Every visitor turn is fenced. The notes block is delimited by markers, and
    // a visitor who types the closing marker could otherwise convince a model
    // that the notes had ended — the live eval watched one do exactly that, and
    // the model then answered from general knowledge about an unrelated project.
    // Chunk text has always been fenced; the visitor is the untrusted side and
    // was not.
    messages: [
      { role: 'system', content: system },
      ...messages.map((m) => (m.role === 'user' ? { ...m, content: fence(m.content) } : m)),
    ],
    max_tokens: MAX_OUTPUT_TOKENS,
  }
}

export type RateLimiter = {
  check: (ip: string, now: number) => { allowed: boolean }
  /** Addresses currently held. Exposed so the eviction below is observable. */
  size: () => number
}

const WINDOW_MS = 3_600_000

/**
 * In-memory and best-effort: it resets on a cold start and is not shared across
 * instances, so the real ceiling is looser than the constants suggest. It is a
 * brake on casual abuse, not the spend control — that is a hard credit cap on
 * the OpenRouter key, which is the only limit an attacker cannot outrun by
 * arriving on a second instance.
 *
 * Entries whose whole window has expired are dropped on each call. Without that
 * the map grows by one entry per address for the life of the instance, which on
 * a warm one is a slow leak an attacker controls the rate of.
 */
export function createRateLimiter(): RateLimiter {
  const hits = new Map<string, number[]>()
  return {
    check(ip, now) {
      for (const [key, times] of hits) {
        if (times.length === 0 || now - times[times.length - 1] >= WINDOW_MS) hits.delete(key)
      }

      const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
      const lastMin = recent.filter((t) => now - t < 60_000).length
      if (lastMin >= RATE_PER_MIN || recent.length >= RATE_PER_HOUR) {
        hits.set(ip, recent)
        return { allowed: false }
      }
      recent.push(now)
      hits.set(ip, recent)
      return { allowed: true }
    },
    size: () => hits.size,
  }
}

// Module singleton used by the live adapters (tests pass their own limiter).
const defaultLimiter = createRateLimiter()

export type ChatResult = { status: number; body: { reply: string } }

export type HandleArgs = {
  messages: ChatMessage[]
  ip: string
  /** The request's `Origin` header. Absent means a caller that is not a browser. */
  origin: string | undefined
  /** Extra origins beyond the production site — preview deploys, and the dev server. */
  allowedOrigins?: string[]
  apiKey: string | undefined
  now?: number
  rateLimiter?: RateLimiter
  fetchImpl?: typeof fetch
  /** Tests pass their own signal; production leaves this unset for a per-model timeout. */
  signal?: AbortSignal
  /** Tests pass their own notes; production uses the corpus built at build time. */
  corpus?: Chunk[]
  /**
   * Reads the wall clock while the cascade runs. `now` above is a single stamp
   * for rate limiting; this one has to ADVANCE, or a budget measured against it
   * could never expire — and an unfalsifiable budget is not a budget. Tests
   * inject a clock they control.
   */
  clock?: () => number
}

export async function handleChatRequest(args: HandleArgs): Promise<ChatResult> {
  const now = args.now ?? Date.now()
  const rl = args.rateLimiter ?? defaultLimiter
  const doFetch = args.fetchImpl ?? fetch

  // Origin first, ahead of the rate limiter: a rejected caller must not be able
  // to spend a real visitor's allowance, or to put an entry in the limiter's map.
  if (!isAllowedOrigin(args.origin, args.allowedOrigins)) {
    return { status: 403, body: { reply: FALLBACK_REPLY } }
  }

  // Then size, before anything walks the array. Refusing whole is the point:
  // truncating would still have touched every element to decide what to keep.
  if (Array.isArray(args.messages) && args.messages.length > MAX_INPUT_MESSAGES) {
    return { status: 400, body: { reply: FALLBACK_REPLY } }
  }

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
  const chunks = withContactBlock(retrieve(lastUser?.content ?? '', corpus), corpus)

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

  // The cascade's own wall clock. Without it, four models timing out in turn is
  // half a minute of a visitor watching a typing indicator — and long enough
  // that the platform may kill the function first, replacing a graceful
  // fallback with a 504 and no reply at all.
  const clock = args.clock ?? (() => Date.now())
  const deadline = clock() + CASCADE_BUDGET_MS

  for (const model of MODELS) {
    // Stop before starting a call that cannot finish inside the budget. Better to
    // hand over the fallback now than to spend the remaining seconds and have the
    // platform decide the ending.
    if (clock() >= deadline) break

    // Each model also gets its own deadline, so one hung upstream cannot consume
    // what is left for the others. AbortSignal.timeout rejects the fetch, which
    // the catch below treats like any other failure and falls through.
    const remaining = deadline - clock()
    const signal = args.signal ?? AbortSignal.timeout(Math.min(MODEL_TIMEOUT_MS, remaining))
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
