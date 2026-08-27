import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { familiar } from '../data'
import { sendToFamiliar, type ChatMessage } from './familiarClient'
import { Markdown } from './Markdown'
import './GrimoireChat.css'

const GREETING: ChatMessage = { role: 'assistant', content: familiar.greeting }
const MAX_INPUT = 1000 // keep in sync with MAX_MESSAGE_CHARS in api/_core/persona.ts

export function GrimoireChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  // Auto-scroll to the latest message.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // Focus the input when the panel opens, and hand focus back to whatever opened it
  // on close. Without the restore, dismissing the panel drops focus to <body> and a
  // keyboard user restarts from the top of the document.
  useEffect(() => {
    if (open) {
      returnFocusTo.current = document.activeElement as HTMLElement | null
      inputRef.current?.focus()
    } else {
      returnFocusTo.current?.focus()
      returnFocusTo.current = null
    }
  }, [open])

  // The panel declares aria-modal="true", which is a promise: Escape dismisses it and
  // Tab stays inside. Neither was true — and on mobile the header close button is the
  // only other way out, so a clipped header meant no way out at all.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function ask(text: string) {
    const content = text.trim().slice(0, MAX_INPUT)
    if (!content || sending) return
    const next = [...messages, { role: 'user', content } as ChatMessage]
    setMessages(next)
    setInput('')
    setSending(true)
    const reply = await sendToFamiliar(next)
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setSending(false)
  }

  const showStarters = messages.length === 1 && !sending

  return (
    <>
      <button
        className={'grim-launcher' + (open ? ' grim-launcher--hidden' : '')}
        onClick={() => setOpen(true)}
        aria-label="Open the Talking Grimoire — ask the Familiar about Moeez"
      >
        <span className="grim-launcher__book" aria-hidden="true">📖</span>
        <span className="grim-launcher__tip">Ask the Familiar</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="grim-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="The Talking Grimoire"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="grim-head">
              <span className="grim-head__title">📖 The Familiar</span>
              <button className="grim-head__close" onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>

            <div
              className="grim-body"
              ref={bodyRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-busy={sending}
            >
              {messages.map((m, i) => (
                <div key={i} className={'grim-msg grim-msg--' + m.role}>
                  {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
                </div>
              ))}

              {showStarters && (
                <div className="grim-chips">
                  {familiar.starters.map((q) => (
                    <button key={q} className="grim-chip" onClick={() => ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {sending && <div className="grim-msg grim-msg--assistant grim-typing">consulting the grimoire…</div>}
            </div>

            <form
              className="grim-input"
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
            >
              <input
                ref={inputRef}
                className="grim-input__box"
                value={input}
                maxLength={MAX_INPUT}
                placeholder="Ask the Familiar…"
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button className="grim-input__send" type="submit" disabled={sending || !input.trim()} aria-label="Send">
                ➤
              </button>
            </form>

            <a className="grim-cta" href="#owlpost" onClick={() => setOpen(false)}>
              🦉 Owl my master
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
