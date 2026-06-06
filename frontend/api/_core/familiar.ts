import {
  FALLBACK_REPLY,
  MAX_MESSAGE_CHARS,
  MAX_TURNS,
  MODELS,
  OPENROUTER_ENDPOINT,
  RATE_PER_HOUR,
  RATE_PER_MIN,
  SYSTEM_PROMPT,
} from './persona.js'

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
}

// Builds the OpenRouter payload for one model. Caller caps messages first (see capMessages).
export function buildRequestBody(messages: ChatMessage[], model: string): OpenRouterBody {
  return {
    model,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
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

export type FamiliarResult = { status: number; body: { reply: string } }

export type HandleArgs = {
  messages: ChatMessage[]
  ip: string
  apiKey: string | undefined
  now?: number
  rateLimiter?: RateLimiter
  fetchImpl?: typeof fetch
}

export async function handleFamiliarRequest(args: HandleArgs): Promise<FamiliarResult> {
  const now = args.now ?? Date.now()
  const rl = args.rateLimiter ?? defaultLimiter
  const doFetch = args.fetchImpl ?? fetch

  if (!args.apiKey) {
    console.warn('[familiar] OPENROUTER_API_KEY is not set')
    return { status: 500, body: { reply: FALLBACK_REPLY } }
  }
  if (!rl.check(args.ip, now).allowed) {
    return { status: 429, body: { reply: FALLBACK_REPLY } }
  }

  const capped = capMessages(args.messages)
  if (capped.length === 0) {
    return { status: 400, body: { reply: FALLBACK_REPLY } }
  }

  for (const model of MODELS) {
    try {
      const res = await doFetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Moeez Portfolio - Familiar',
        },
        body: JSON.stringify(buildRequestBody(capped, model)),
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
