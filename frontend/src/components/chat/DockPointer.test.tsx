import { readFileSync } from 'node:fs'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { scrollState } from '../../lib/scrollState'
import { ChatDock } from './ChatDock'
import {
  DockPointer,
  POINTER_MEDIA,
  POINTER_MIN_WIDTH,
  POINTER_PROPERTY,
  TRAIL_LAG,
  TRAIL_LENGTH,
  arrowProgress,
  forgetDockOpened,
  COMPACT_TRAIL_LENGTH,
} from './DockPointer'

/**
 * Drives the media queries the component gates on. POINTER_MEDIA is included by
 * default because a narrow viewport is a separate decision, tested on its own.
 */
function stubMedia(matching: string[] = []) {
  matching = [POINTER_MEDIA, ...matching]
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        matches: matching.includes(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  )
}

/** Replaces rAF with a hand-cranked queue so frames are stepped, never awaited. */
function stubFrames() {
  let next = 1
  let pending: Array<[number, FrameRequestCallback]> = []
  let requests = 0
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = next++
    requests++
    pending.push([id, cb])
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    pending = pending.filter(([pendingId]) => pendingId !== id)
  })
  let clock = 0
  return {
    step(ms = 16.7) {
      clock += ms
      const due = pending
      pending = []
      for (const [, cb] of due) act(() => cb(clock))
    },
    get requests() {
      return requests
    },
  }
}

/** Each arrow's written progress, in DOM order (top of the trail first). */
function written(container: HTMLElement): number[] {
  return [...container.querySelectorAll<HTMLElement>('[data-arrow]')].map((el) =>
    Number(el.style.getPropertyValue(POINTER_PROPERTY)),
  )
}

/** The same values ordered leader-first, so index 0 is the arrow nearest the dock. */
function byTrailIndex(container: HTMLElement): number[] {
  const arrows = [...container.querySelectorAll<HTMLElement>('[data-arrow]')]
  const out: number[] = []
  for (const el of arrows) {
    out[Number(el.dataset.arrow)] = Number(el.style.getPropertyValue(POINTER_PROPERTY))
  }
  return out
}

beforeEach(() => {
  stubMedia()
  forgetDockOpened()
  scrollState.smooth.progress = 0
})

afterEach(() => {
  forgetDockOpened()
  scrollState.smooth.progress = 0
})

describe('arrowProgress', () => {
  it('gives the leader the most travel and every follower less', () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      for (let i = 1; i < TRAIL_LENGTH; i++) {
        expect(arrowProgress(p, i - 1)).toBeGreaterThanOrEqual(arrowProgress(p, i))
      }
    }
    // ...and strictly, somewhere in the middle, or there is no visible trail.
    expect(arrowProgress(0.5, 0)).toBeGreaterThan(arrowProgress(0.5, TRAIL_LENGTH - 1))
  })

  it('never overshoots past the launcher and never runs backwards', () => {
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      let last = -1
      for (let step = 0; step <= 100; step++) {
        const value = arrowProgress(step / 100, i)
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
        expect(value).toBeGreaterThanOrEqual(last)
        last = value
      }
    }
  })

  it('parks the whole trail at the launcher by the foot of the page', () => {
    for (let i = 0; i < TRAIL_LENGTH; i++) expect(arrowProgress(1, i)).toBe(1)
    for (let i = 0; i < TRAIL_LENGTH; i++) expect(arrowProgress(0, i)).toBe(0)
  })

  it('is a short trail, not a swarm', () => {
    expect(TRAIL_LENGTH).toBe(3)
    // The lag has to leave room for the leader to still arrive by the foot.
    expect(TRAIL_LAG * (TRAIL_LENGTH - 1)).toBeLessThan(1)
  })
})

describe('DockPointer', () => {
  it('renders nothing when the dock is open', () => {
    const { container } = render(<DockPointer visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('is decorative: hidden from assistive tech and contributing no name', () => {
    const { container } = render(<DockPointer visible />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root.textContent).toBe('')
    expect(container.querySelectorAll('[data-arrow]')).toHaveLength(TRAIL_LENGTH)
  })

  it('never sits between the visitor and the launcher', () => {
    const css = readFileSync('src/components/chat/DockPointer.css', 'utf8')
    expect(css).toMatch(/pointer-events:\s*none/)
  })

  it('renders a static form under prefers-reduced-motion, with no frame loop', () => {
    stubMedia(['(prefers-reduced-motion: reduce)'])
    const frames = stubFrames()
    const { container } = render(<DockPointer visible />)
    expect(frames.requests).toBe(0)
    // Still visible — a visitor who dislikes motion still benefits from being
    // told the dock is there — but parked at the launcher, not mid-flight.
    expect(written(container)).toEqual(Array(TRAIL_LENGTH).fill(1))
  })

  it('advances the trail toward the launcher as the page scrolls', () => {
    const frames = stubFrames()
    const { container } = render(<DockPointer visible />)

    const samples: number[][] = []
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      scrollState.smooth.progress = progress
      frames.step()
      samples.push(byTrailIndex(container))
    }

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      for (let s = 1; s < samples.length; s++) {
        expect(samples[s][i]).toBeGreaterThanOrEqual(samples[s - 1][i])
      }
    }
    expect(samples[0]).toEqual(Array(TRAIL_LENGTH).fill(0))
    expect(samples[samples.length - 1]).toEqual(Array(TRAIL_LENGTH).fill(1))
    // Mid-page the leader is measurably ahead of the tail.
    expect(samples[2][0]).toBeGreaterThan(samples[2][TRAIL_LENGTH - 1])
  })

  it('puts the leader nearest the launcher, at the foot of the trail', () => {
    const { container } = render(<DockPointer visible />)
    const order = [...container.querySelectorAll<HTMLElement>('[data-arrow]')].map(
      (el) => el.dataset.arrow,
    )
    // DOM order is top-of-trail first, so the leader (index 0) is last.
    expect(order).toEqual(['2', '1', '0'])
  })

  /** Every media query false: a narrow viewport, motion allowed. */
  const narrowScreen = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList

  it('falls back to the compact trail on a screen with no gutter', () => {
    // Below POINTER_MIN_WIDTH the copy runs to the edge, so the full trail would
    // come down on a paragraph — measured: at 390 all three land on body text.
    // It does not follow that a narrow screen should get nothing: that is where
    // the launcher competes hardest for attention. So the trail shrinks into the
    // dock's own corner, above the launcher, where the dock already floats over
    // the content and no paragraph is disturbed.
    vi.stubGlobal('matchMedia', narrowScreen)
    const frames = stubFrames()
    const { container } = render(<DockPointer visible />)
    const arrows = container.querySelectorAll('[data-arrow]')
    expect(arrows).toHaveLength(COMPACT_TRAIL_LENGTH)
    expect(container.querySelector('.dock-pointer--compact')).not.toBeNull()
    // Still decorative, still animated, still never a hit target.
    expect(container.querySelector('.dock-pointer')).toHaveAttribute('aria-hidden', 'true')
    expect(frames.requests).toBeGreaterThan(0)
  })

  it('keeps the compact trail shorter than the full one, and still ordered', () => {
    // The corner has room for a hint, not for a parade.
    expect(COMPACT_TRAIL_LENGTH).toBeLessThan(TRAIL_LENGTH)
    expect(COMPACT_TRAIL_LENGTH).toBeGreaterThanOrEqual(1)
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      for (let i = 1; i < COMPACT_TRAIL_LENGTH; i++) {
        const ahead = arrowProgress(progress, i - 1, COMPACT_TRAIL_LENGTH)
        const behind = arrowProgress(progress, i, COMPACT_TRAIL_LENGTH)
        expect(ahead, `arrow ${i} must never lead arrow ${i - 1}`).toBeGreaterThanOrEqual(behind)
      }
    }
  })

  it('parks the compact trail at the launcher by the foot of the page', () => {
    // Whatever the trail length, the last arrow must still arrive — a hint that
    // never lands reads as broken rather than as travel.
    const lastIndex = COMPACT_TRAIL_LENGTH - 1
    expect(arrowProgress(1, lastIndex, COMPACT_TRAIL_LENGTH)).toBe(1)
    expect(arrowProgress(0, 0, COMPACT_TRAIL_LENGTH)).toBe(0)
  })

  it('still retires on a narrow screen once the dock has been opened', () => {
    vi.stubGlobal('matchMedia', narrowScreen)
    const { container } = render(<DockPointer visible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('asks for a viewport wide enough to clear the content column', () => {
    // --maxw is 1120px; the trail's LEFT edge sits 88px in (a 72px right inset
    // plus its own 16px width), so it needs that much gutter on each side.
    expect(POINTER_MIN_WIDTH).toBeGreaterThanOrEqual(1120 + 2 * 88)
    expect(POINTER_MEDIA).toBe(`(min-width: ${POINTER_MIN_WIDTH}px)`)
  })

  it('stops the frame loop when it unmounts', () => {
    const frames = stubFrames()
    const { unmount } = render(<DockPointer visible />)
    frames.step()
    const before = frames.requests
    unmount()
    frames.step()
    expect(frames.requests).toBe(before)
  })
})

describe('ChatDock with the pointer', () => {
  it('points at the launcher while the dock is closed', () => {
    const { container } = render(<ChatDock />)
    expect(container.querySelector('[data-arrow]')).not.toBeNull()
  })

  it('retires the pointer for good once the visitor opens the dock', async () => {
    const { container } = render(<ChatDock />)
    await userEvent.click(screen.getByRole('button', { name: /ask moeez/i }))
    expect(container.querySelector('[data-arrow]')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /hide chat/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.querySelector('[data-arrow]')).toBeNull()
  })

  it('does not gesture again on a reload in the same session', async () => {
    const first = render(<ChatDock />)
    await userEvent.click(screen.getByRole('button', { name: /ask moeez/i }))
    first.unmount()

    const second = render(<ChatDock />)
    expect(second.container.querySelector('[data-arrow]')).toBeNull()
  })
})
