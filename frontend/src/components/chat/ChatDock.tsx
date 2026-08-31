import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChatMessage } from './ChatMessage'
import { DockPointer, hasDockOpened, rememberDockOpened } from './DockPointer'
import { useChat } from './useChat'
import './ChatDock.css'

const STARTERS = [
  'What are you working on now?',
  'How does Project Horus work?',
  'Are you a fit for a computer-vision role?',
]

/** Tab stops inside the panel. A disabled Send button is not one of them. */
const FOCUSABLE = 'button, input, textarea, a[href]'

function focusablesIn(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute('disabled'),
  )
}

export function ChatDock() {
  const { messages, status, send, open, setOpen } = useChat()
  const [draft, setDraft] = useState('')
  const launcher = useRef<HTMLButtonElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  // The pointer's whole justification is that the visitor has not found the dock
  // yet. Once they have, it has nothing left to say, so it retires for the rest
  // of the session rather than gesturing at a thing they already know about.
  const [pointed, setPointed] = useState(() => !hasDockOpened())

  useEffect(() => {
    if (!open) return
    rememberDockOpened()
    setPointed(false)
  }, [open])

  useEffect(() => {
    if (open) input.current?.focus()
    // Only pull focus back on a real close. Without the guard this effect fires on
    // mount and drops a keyboard visitor into the corner before they read a word.
    else if (wasOpen.current) launcher.current?.focus({ preventScroll: true })
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || !panel.current) return
      // The panel is modal in effect, so Tab must not walk the page behind it.
      const focusable = focusablesIn(panel.current)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!panel.current.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  useEffect(() => {
    // scrollTop rather than scrollTo(): the smooth variant is a motion the reduced
    // -motion visitor never asked for, and jsdom does not implement it.
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages.length, status])

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  return (
    <div className="chat">
      {open && (
        <div
          ref={panel}
          className="chat__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          aria-describedby="chat-disclaimer"
        >
          <header className="chat__head">
            <p className="chat__title" id="chat-title">
              Ask Moeez
            </p>
            <p className="chat__disclaimer" id="chat-disclaimer">
              AI trained on my notes
            </p>
            <button type="button" className="chat__close" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>

          <div className="chat__body" ref={scroller}>
            {messages.length === 0 && (
              <div className="chat__empty">
                <p>
                  Ask me about my work. I answer from my own notes — if I haven't written it down,
                  I'll say so.
                </p>
                <div className="chat__starters" role="group" aria-label="Suggested questions">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => void send(starter)}>
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ul className="chat__log" role="log" aria-live="polite" aria-label="Conversation">
              {messages.map((message, i) => (
                <ChatMessage key={`${i}-${message.content.slice(0, 12)}`} message={message} />
              ))}
              {status === 'sending' && (
                <li className="chat__typing">
                  <span className="chat__sr">Thinking…</span>
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                </li>
              )}
            </ul>
          </div>

          <form className="chat__form" onSubmit={onSubmit}>
            <label className="chat__sr" htmlFor="chat-input">
              Your question
            </label>
            <input
              id="chat-input"
              ref={input}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about a project…"
              autoComplete="off"
              maxLength={1000}
            />
            <button type="submit" disabled={status === 'sending' || draft.trim() === ''}>
              Send
            </button>
          </form>
        </div>
      )}

      <DockPointer visible={!open && pointed} />

      <button
        ref={launcher}
        type="button"
        className="chat__launcher"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Hide chat' : 'Ask Moeez'}
      </button>
    </div>
  )
}
