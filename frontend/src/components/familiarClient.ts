// Thin client for the Familiar chat proxy. Pure-ish: fetch is injectable for tests.

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export const CLIENT_FALLBACK =
  'The Familiar must rest a moment. Owl my master directly via the Owl Post below.'

export async function sendToFamiliar(
  messages: ChatMessage[],
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  try {
    const res = await fetchImpl('/api/familiar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
    const data = (await res.json().catch(() => null)) as { reply?: string } | null
    return data?.reply?.trim() || CLIENT_FALLBACK
  } catch {
    return CLIENT_FALLBACK
  }
}
