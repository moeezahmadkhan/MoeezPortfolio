import { MAX_MESSAGE_CHARS, MAX_TURNS, MODEL, SYSTEM_PROMPT } from './persona'

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

export function buildRequestBody(messages: ChatMessage[]): OpenRouterBody {
  return {
    model: MODEL,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...capMessages(messages)],
  }
}
