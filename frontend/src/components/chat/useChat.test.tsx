import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setWizardMode, wizardState } from '../../three/wizardState'
import { useChat } from './useChat'

/** The API answers with a usable `reply` on 200, 429, 500 and 502 alike. */
function mockReply(reply: string, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => ({ reply }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// wizardState is a module singleton shared across tests, exactly as it is across
// the app. Reset it so one test's mood cannot decide the next one's assertion.
beforeEach(() => setWizardMode('idle'))

describe('useChat', () => {
  it('appends the question and then the answer', async () => {
    mockReply('I built it with FAISS.')
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('How does Horus work?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.messages[0]).toEqual({ role: 'user', content: 'How does Horus work?' })
    expect(result.current.messages[1]).toEqual({ role: 'assistant', content: 'I built it with FAISS.' })
    expect(result.current.status).toBe('idle')
  })

  it('posts the whole transcript to /api/chat', async () => {
    const fetchMock = mockReply('one')
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('first'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    await act(() => result.current.send('second'))
    await waitFor(() => expect(result.current.messages).toHaveLength(4))
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/chat')
    expect(JSON.parse((init as RequestInit).body as string).messages).toEqual([
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'one' },
      { role: 'user', content: 'second' },
    ])
  })

  it('ignores an empty message', async () => {
    mockReply('unused')
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('   '))
    expect(result.current.messages).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces an error turn instead of losing the question', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('hello'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.messages[0].content).toBe('hello')
    expect(result.current.messages[1].content).toMatch(/kmoeez2018@gmail\.com/)
  })

  it("shows the server's own fallback as an ordinary answer, not an error", async () => {
    // 429 (rate limited) and 500 (no key) both carry a real reply. Rendering those
    // as a failure state would tell the visitor something broke when nothing did.
    mockReply("I can't answer right now — the model behind this chat is down.", 500)
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.status).toBe('idle')
    expect(result.current.messages[1].content).toMatch(/can't answer right now/)
  })

  it('keeps a refusal as an ordinary answer — it is a correct outcome', async () => {
    mockReply("I haven't written that down here, so I'd rather not guess at it.")
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('what is your favourite film?'))
    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.status).toBe('idle')
    expect(result.current.messages[1].role).toBe('assistant')
  })

  it('falls back when the endpoint answers without a reply', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 405, json: async () => ({}) }))
    const { result } = renderHook(() => useChat())
    await act(() => result.current.send('hi'))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.messages[1].content).toMatch(/kmoeez2018@gmail\.com/)
  })

  it('sets the wizard casting while in flight and attentive after', async () => {
    mockReply('done')
    const { result } = renderHook(() => useChat())
    const pending = act(() => result.current.send('hi'))
    expect(wizardState.mode).toBe('casting')
    await pending
    await waitFor(() => expect(wizardState.mode).toBe('attentive'))
  })

  it('makes the wizard attentive when the panel opens', () => {
    const { result } = renderHook(() => useChat())
    act(() => result.current.setOpen(true))
    expect(result.current.open).toBe(true)
    expect(wizardState.mode).toBe('attentive')
    act(() => result.current.setOpen(false))
    expect(result.current.open).toBe(false)
    expect(wizardState.mode).toBe('idle')
  })
})
