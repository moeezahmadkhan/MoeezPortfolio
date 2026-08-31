import { useCallback, useRef, useState } from 'react'
import { setWizardMode } from '../../three/wizardState'
import { OFFLINE_REPLY, postChat, type Message } from './chatClient'

export type ChatStatus = 'idle' | 'sending' | 'error'

/**
 * The conversation, and the wizard's mood alongside it.
 *
 * `open` lives here rather than in the dock because opening the panel is what
 * makes the model look up — the mood transition belongs with the state change,
 * not with the markup.
 */
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [open, setOpenState] = useState(false)
  const inFlight = useRef<AbortController>()

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    setWizardMode(next ? 'attentive' : 'idle')
  }, [])

  const send = useCallback(
    async (text: string) => {
      const content = text.trim()
      if (!content || status === 'sending') return

      const next: Message[] = [...messages, { role: 'user', content }]
      setMessages(next)
      setStatus('sending')
      setWizardMode('casting')

      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller

      try {
        const reply = await postChat(next, controller.signal)
        // A refusal and a server fallback both arrive here. Neither is an error:
        // "I haven't written that down" is a correct answer, and the visitor
        // should read it exactly like any other.
        setMessages([...next, { role: 'assistant', content: reply }])
        setStatus('idle')
      } catch {
        // Keep the question visible — losing what the visitor typed is worse than
        // showing that the answer failed.
        setMessages([...next, { role: 'assistant', content: OFFLINE_REPLY }])
        setStatus('error')
      } finally {
        setWizardMode('attentive')
      }
    },
    [messages, status],
  )

  return { messages, status, send, open, setOpen }
}
