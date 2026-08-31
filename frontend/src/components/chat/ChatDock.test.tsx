import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatDock } from './ChatDock'

function mockReply(reply: string, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => ({ reply }),
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function launcher() {
  return screen.getByRole('button', { name: /ask moeez/i })
}

/** Everything Tab can reach inside the open panel, in document order. */
function focusablesIn(panel: HTMLElement) {
  return [...panel.querySelectorAll<HTMLElement>('button, input, textarea, a[href]')].filter(
    (el) => !el.hasAttribute('disabled'),
  )
}

describe('ChatDock', () => {
  it('starts closed, showing only a labelled launcher', () => {
    render(<ChatDock />)
    expect(launcher()).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not steal focus from the page on first render', () => {
    render(<ChatDock />)
    // The dock mounts on every page load. Pulling focus to a fixed launcher would
    // drop a keyboard visitor at the bottom-right corner before they read a word.
    expect(document.body).toHaveFocus()
  })

  it('opens on click and focuses the input', async () => {
    render(<ChatDock />)
    await userEvent.click(launcher())
    expect(screen.getByRole('dialog', { name: /ask moeez/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())
  })

  it('says plainly that it is an AI trained on notes', async () => {
    render(<ChatDock />)
    await userEvent.click(launcher())
    expect(screen.getByText(/ai trained on my notes/i)).toBeInTheDocument()
  })

  it('sends a question and shows the reply in a live region', async () => {
    mockReply('I used FAISS for the index.')
    render(<ChatDock />)
    await userEvent.click(launcher())
    await userEvent.type(screen.getByRole('textbox'), 'How does Horus work?{Enter}')
    const log = await screen.findByRole('log')
    expect(log).toHaveAttribute('aria-live', 'polite')
    await waitFor(() => expect(log).toHaveTextContent('I used FAISS for the index.'))
    expect(log).toHaveTextContent('How does Horus work?')
  })

  it('clears the input once the question is sent', async () => {
    mockReply('ok')
    render(<ChatDock />)
    await userEvent.click(launcher())
    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'anything{Enter}')
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('renders a refusal exactly like any other answer', async () => {
    // A refusal is Moeez saying he has not written that down. It is a correct
    // answer, so it must not carry an error role, an alert, or its own styling.
    mockReply("I haven't written that down here, so I'd rather not guess at it.")
    render(<ChatDock />)
    await userEvent.click(launcher())
    await userEvent.type(screen.getByRole('textbox'), 'favourite film?{Enter}')
    const log = await screen.findByRole('log')
    await waitFor(() => expect(log).toHaveTextContent(/haven't written that down/i))
    const answers = log.querySelectorAll('.chat__msg--moeez')
    expect(answers).toHaveLength(1)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(log.querySelector('[class*="error"]')).toBeNull()
  })

  it('keeps the question and answers in place when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    render(<ChatDock />)
    await userEvent.click(launcher())
    await userEvent.type(screen.getByRole('textbox'), 'are you free for work?{Enter}')
    const log = await screen.findByRole('log')
    await waitFor(() => expect(log).toHaveTextContent(/kmoeez2018@gmail\.com/))
    expect(log).toHaveTextContent('are you free for work?')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('offers starter questions that send on click', async () => {
    const fetchMock = mockReply('an answer')
    render(<ChatDock />)
    await userEvent.click(launcher())
    const starters = screen.getByRole('group', { name: /suggested questions/i })
    const first = within(starters).getAllByRole('button')[0]
    const question = first.textContent ?? ''
    await userEvent.click(first)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(await screen.findByText(question)).toBeInTheDocument()
  })

  it('traps Tab inside the panel while it is open', async () => {
    render(<ChatDock />)
    await userEvent.click(launcher())
    const panel = screen.getByRole('dialog')
    const focusable = focusablesIn(panel)
    expect(focusable.length).toBeGreaterThan(1)

    // Walk the whole ring with real key events: focus must never land outside.
    for (let i = 0; i <= focusable.length; i++) {
      await userEvent.tab()
      expect(panel.contains(document.activeElement)).toBe(true)
    }

    focusable[focusable.length - 1].focus()
    await userEvent.tab()
    expect(focusable[0]).toHaveFocus()

    focusable[0].focus()
    await userEvent.tab({ shift: true })
    expect(focusable[focusable.length - 1]).toHaveFocus()
  })

  it('closes on Escape and returns focus to the launcher', async () => {
    render(<ChatDock />)
    const button = launcher()
    await userEvent.click(button)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(button).toHaveFocus())
  })

  it('closes on the close button and returns focus to the launcher', async () => {
    render(<ChatDock />)
    const button = launcher()
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(button).toHaveFocus())
  })

  it('tells assistive tech whether the panel is open', async () => {
    render(<ChatDock />)
    expect(launcher()).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(launcher())
    expect(screen.getByRole('button', { name: /hide chat/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('hides the decorative typing dots from assistive tech', async () => {
    let resolve: (value: unknown) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise((r) => (resolve = r))),
    )
    const { container } = render(<ChatDock />)
    await userEvent.click(launcher())
    await userEvent.type(screen.getByRole('textbox'), 'hello{Enter}')
    const typing = await waitFor(() => {
      const el = container.querySelector('.chat__typing')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(typing.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    await act(async () => {
      resolve({ ok: true, status: 200, json: async () => ({ reply: 'done' }) })
    })
    await waitFor(() => expect(container.querySelector('.chat__typing')).toBeNull())
  })
})
