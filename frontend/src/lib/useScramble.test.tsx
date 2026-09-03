import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GLYPHS } from './scramble'
import { useScramble } from './useScramble'

function stubMatchMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

/** Frames only advance when a test says so, so the decode can be inspected mid-flight. */
let pending = new Map<number, FrameRequestCallback>()
let nextId = 0
let clock = 0

function nextFrame(at: number) {
  clock = at
  const due = [...pending.values()]
  pending = new Map()
  for (const cb of due) cb(at)
}

function Link({ label }: { label: string }) {
  return <a href="#work" {...useScramble(label)}>{label}</a>
}

/** Fires the decode on demand, the way the mobile menu does on open. */
function RunLink({ label }: { label: string }) {
  const { run, ...decode } = useScramble(label)
  return (
    <>
      <a href="#work" {...decode}>
        {label}
      </a>
      <button type="button" onClick={run}>
        run
      </button>
    </>
  )
}

beforeEach(() => {
  pending = new Map()
  nextId = 0
  clock = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    pending.set(++nextId, cb)
    return nextId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending.delete(id)
  })
  vi.spyOn(performance, 'now').mockImplementation(() => clock)
  // jsdom measures every box as zero; a real width is what the freeze is for.
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 84,
  } as DOMRect)
  stubMatchMedia([])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useScramble', () => {
  it('decodes the label on hover and lands back on it exactly', () => {
    render(<Link label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    nextFrame(0)
    expect(link.textContent).not.toBe('View work')
    for (const char of link.textContent!.replace(/ /g, '')) expect(GLYPHS).toContain(char)

    nextFrame(500)
    expect(link.textContent).toBe('View work')
  })

  it('holds the accessible name still while the text is glyphs', () => {
    render(<Link label="View work" />)
    const link = screen.getByRole('link')
    fireEvent.mouseEnter(link)
    nextFrame(0)
    // Found by role and name: the name comes from aria-label, not from the
    // punctuation currently on screen.
    expect(screen.getByRole('link', { name: 'View work' })).toBe(link)
  })

  it('freezes the box on enter and releases it on the way out', () => {
    render(<Link label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    expect(link.style.width).toBe('84px')

    fireEvent.mouseLeave(link)
    expect(link.style.width).toBe('')
  })

  it('restores the label outright when the pointer leaves mid-decode', () => {
    render(<Link label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    nextFrame(100)
    expect(link.textContent).not.toBe('View work')

    fireEvent.mouseLeave(link)
    expect(link.textContent).toBe('View work')
  })

  it('does nothing under reduced motion', () => {
    stubMatchMedia(['(prefers-reduced-motion: reduce)'])
    render(<Link label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')
    expect(link.style.width).toBe('')
  })

  it('does nothing on a coarse pointer, where mouseenter means a tap', () => {
    stubMatchMedia(['(pointer: coarse)'])
    render(<Link label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')
  })

  it('stops the frame loop when the element unmounts mid-decode', () => {
    const { unmount } = render(<Link label="View work" />)
    fireEvent.mouseEnter(screen.getByRole('link'))
    nextFrame(100)
    expect(pending.size).toBe(1)

    unmount()
    expect(pending.size).toBe(0)
  })
})

describe('run()', () => {
  it('decodes on a coarse pointer, where onMouseEnter deliberately will not', () => {
    // The coarse bail on onMouseEnter exists because mouseenter fires on a TAP
    // there, and a decode between the press and the navigation is a delay
    // nobody asked for. That reasoning is about the tap, not about the effect:
    // opening a menu is a different gesture on a different control, and the
    // links it reveals are not being pressed.
    stubMatchMedia(['(pointer: coarse)'])
    render(<RunLink label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    nextFrame(0)
    expect(link.textContent).not.toBe('View work')
    for (const char of link.textContent!.replace(/ /g, '')) expect(GLYPHS).toContain(char)

    nextFrame(500)
    expect(link.textContent).toBe('View work')
  })

  it('still does nothing under reduced motion', () => {
    // That bail is about the motion itself, not about the tap, so it stays.
    stubMatchMedia(['(prefers-reduced-motion: reduce)'])
    render(<RunLink label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')
    expect(link.style.width).toBe('')
  })

  it('freezes the box for the decode, as the hover path does', () => {
    stubMatchMedia(['(pointer: coarse)'])
    render(<RunLink label="View work" />)

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    expect(screen.getByRole('link').style.width).toBe('84px')
  })
})
