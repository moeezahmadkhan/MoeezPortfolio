export type Message = { role: 'user' | 'assistant'; content: string }

/**
 * The only reply composed in the browser.
 *
 * Everything else a visitor reads comes back from `/api/chat` — including the
 * server's own fallback and its refusal. This one covers the case where the
 * request never got an answer at all (offline, DNS, a proxy serving HTML), so
 * there is nothing to render but this.
 */
export const OFFLINE_REPLY =
  "I can't reach the chat right now. Email me at kmoeez2018@gmail.com and I'll reply myself."

export async function postChat(messages: Message[], signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  })

  // The API answers with a usable reply on 429 (rate limited), 500 (no key) and
  // 502 (every model down) as well as 200, so a non-ok status is not itself an
  // error — a missing or unparseable reply is.
  let data: { reply?: string }
  try {
    data = (await res.json()) as { reply?: string }
  } catch {
    throw new Error(`unreadable response (HTTP ${res.status})`)
  }
  if (!data.reply) throw new Error(`no reply (HTTP ${res.status})`)
  return data.reply
}
