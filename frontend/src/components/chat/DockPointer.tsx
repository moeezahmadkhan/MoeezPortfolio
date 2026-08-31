import { useEffect, useRef } from 'react'
import { scrollState } from '../../lib/scrollState'
import { useMatchMedia } from '../../lib/useMatchMedia'
import './DockPointer.css'

/**
 * How many arrows the trail carries. Three reads as travel; more reads as a
 * swarm, and this is a portfolio, not a growth funnel.
 */
export const TRAIL_LENGTH = 3

/**
 * How far behind its predecessor each arrow sits, measured in scroll progress.
 * The lag is what makes the trail stretch as the leader pulls toward the dock —
 * without it three arrows would move as one rigid stick.
 */
export const TRAIL_LAG = 0.12

/** The custom property the frame loop writes; DockPointer.css reads it. */
export const POINTER_PROPERTY = '--dock-pointer-p'

/**
 * The narrowest viewport that has somewhere to put this.
 *
 * The trail is a fixed overlay 16px wide whose right edge sits 72px in from the
 * layout edge (the dock's 24px inset plus the 48px that centres it over the
 * launcher pill), so its left edge is 88px in. The content column is `--maxw`,
 * centred. The trail therefore stands entirely in the gutter — outside every
 * card, rule and paragraph — only from 1120 + 2 x 88 = 1296 *layout* pixels up.
 * A media query measures the viewport instead, which is up to 17px wider than
 * the layout box wherever the browser paints a classic scrollbar, so the
 * declared threshold carries that back and leaves enough margin that a chevron
 * never grazes a card edge on the way past.
 *
 * Below that it has nowhere to stand, and this was measured rather than
 * guessed. At 1280 the chevrons sit inside the project cards. At 1024 and 768
 * they land on a paragraph in one section out of six sampled. At 390 the copy
 * runs edge to edge and all three come down squarely on body text, a long way
 * above the launcher they are pointing at. Clutter over someone's writing is
 * worse than saying nothing, so on a narrower screen this says nothing: the
 * launcher is already a fixed, labelled, 44px control in the corner, and on a
 * phone it is the most prominent thing on screen after the copy itself.
 */
export const POINTER_MIN_WIDTH = 1360
export const POINTER_MEDIA = `(min-width: ${POINTER_MIN_WIDTH}px)`

/** Below this a rewrite would move the arrow by well under a device pixel. */
const WRITE_EPSILON = 0.002

/** Remembered per tab, so a reload mid-visit does not start gesturing again. */
const SEEN_KEY = 'moeez:chat-opened'

export function hasDockOpened(): boolean {
  // Private-mode Safari throws on access rather than returning null, and a dead
  // storage must degrade to "show the pointer", never to a crash.
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function rememberDockOpened(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* nothing to do: the pointer simply reappears on the next load */
  }
}

/** Test-only: clears the session memory. */
export function forgetDockOpened(): void {
  try {
    sessionStorage.removeItem(SEEN_KEY)
  } catch {
    /* nothing to do */
  }
}

/**
 * Pure: how far along its path arrow `index` should sit at this scroll
 * progress, 0 (start of the path) to 1 (parked at the launcher).
 *
 * Index 0 is the leader. Every arrow covers the same distance, but each starts
 * moving `TRAIL_LAG` of the page later than the one ahead of it, and the span
 * is shortened by the total lag so even the last arrow arrives by the foot of
 * the page. Three properties the test pins down, because the whole point of the
 * trail is that it reads as travel rather than as jitter:
 *
 *  - monotonic in `progress`, so scrolling down only ever moves an arrow toward
 *    the dock and scrolling up only ever walks it back;
 *  - clamped to [0, 1], so no arrow overshoots past the launcher;
 *  - ordered, so arrow i is never ahead of arrow i-1.
 */
export function arrowProgress(progress: number, index: number): number {
  const span = 1 - TRAIL_LAG * (TRAIL_LENGTH - 1)
  const value = (progress - TRAIL_LAG * index) / span
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** DOM order runs top-of-trail first, so the leader sits last — nearest the dock. */
const ARROWS = Array.from({ length: TRAIL_LENGTH }, (_, i) => TRAIL_LENGTH - 1 - i)

/**
 * A short trail of arrows that travels toward the chat launcher as the visitor
 * scrolls. Decorative in the strictest sense: `aria-hidden`, `pointer-events:
 * none`, no text, and it retires the moment the dock has been opened.
 *
 * The travel is scroll-driven, not a timer. It reads `scrollState.smooth`, the
 * eased channel, so the arrows inherit the site's glide instead of stepping
 * with each wheel notch — and so nothing here needs a `damp` of its own, which
 * would only stack a second lag on top of the first. The loop writes one custom
 * property per arrow; React never re-renders for a scroll.
 */
export function DockPointer({ visible }: { visible: boolean }) {
  const reduced = useMatchMedia('(prefers-reduced-motion: reduce)')
  const wide = useMatchMedia(POINTER_MEDIA)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    const arrows = [...root.current.querySelectorAll<HTMLElement>('[data-arrow]')]
    const indices = arrows.map((el) => Number(el.dataset.arrow))

    if (reduced) {
      // Still shown — knowing the dock exists is information, not decoration —
      // but parked at the launcher rather than caught mid-flight.
      for (const el of arrows) el.style.setProperty(POINTER_PROPERTY, '1')
      return
    }

    const last = arrows.map(() => Number.NaN)
    const write = () => {
      for (let i = 0; i < arrows.length; i++) {
        const p = arrowProgress(scrollState.smooth.progress, indices[i])
        if (Math.abs(p - last[i]) < WRITE_EPSILON) continue
        last[i] = p
        arrows[i].style.setProperty(POINTER_PROPERTY, p.toFixed(3))
      }
    }

    // Once synchronously, so the first painted frame is already in the right
    // place for a visitor who reloaded halfway down the page.
    write()
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      write()
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, visible, wide])

  if (!visible || !wide) return null

  return (
    <div className="dock-pointer" aria-hidden="true" ref={root}>
      {ARROWS.map((index) => (
        <span className="dock-pointer__arrow" key={index} data-arrow={index}>
          <svg viewBox="0 0 16 9" width="16" height="9" focusable="false">
            <path
              d="M1 1l7 6 7-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      ))}
    </div>
  )
}
