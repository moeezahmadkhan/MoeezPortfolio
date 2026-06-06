import { describe, it, expect, vi } from 'vitest'
import { sendToFamiliar, CLIENT_FALLBACK, type ChatMessage } from './familiarClient'

const msgs: ChatMessage[] = [{ role: 'user', content: 'hi' }]

describe('sendToFamiliar', () => {
  it('returns the reply on a successful response', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ reply: 'Well met!' }), { status: 200 }))
    expect(await sendToFamiliar(msgs, f as unknown as typeof fetch)).toBe('Well met!')
  })

  it('POSTs the messages to /api/familiar', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ reply: 'x' }), { status: 200 }))
    await sendToFamiliar(msgs, f as unknown as typeof fetch)
    expect(f).toHaveBeenCalledWith('/api/familiar', expect.objectContaining({ method: 'POST' }))
    const sent = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)
    expect(sent.messages).toEqual(msgs)
  })

  it('uses the server-provided reply even on a non-OK status', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ reply: 'resting' }), { status: 429 }))
    expect(await sendToFamiliar(msgs, f as unknown as typeof fetch)).toBe('resting')
  })

  it('falls back when the network throws', async () => {
    const f = vi.fn(async () => { throw new Error('offline') })
    expect(await sendToFamiliar(msgs, f as unknown as typeof fetch)).toBe(CLIENT_FALLBACK)
  })
})
