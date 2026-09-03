import { useEffect } from 'react'
import { damp } from './frame'
import { isCoarsePointer } from './media'

/**
 * Per-frame state, deliberately OUTSIDE React. Scroll and pointer events fire far
 * more often than React should re-render; the render loop reads these fields every
 * frame instead. Never lift this into useState or context.
 */
export const scrollState = {
  progress: 0, // 0 at the top of the document, 1 at the bottom
  raw: 0, // scrollY in px
  pointerX: 0, // -1 (left edge) .. 1 (right edge)
  pointerY: 0, // -1 (top) .. 1 (bottom)
  heroVisible: 1, // 1 while the hero owns the screen, 0 once it has gone
  heroExit: 0, // 0..1 across the hero's OWN extra height — drives the exit sequence
  pinnedProgress: 0, // 0..1, how far through the pinned section the viewport has travelled
  /**
   * The same three scroll measures, eased toward the raw ones once per frame.
   * A wheel notch moves the raw fields in one discrete jump, so anything that
   * animates off them steps; anything that animates off `smooth` glides. Motion
   * reads here. Everything else — tests, the section observer, any logic that
   * needs the truth rather than a nice curve — keeps reading the raw fields.
   */
  smooth: {
    progress: 0,
    heroVisible: 1,
    heroExit: 0,
    pinnedProgress: 0,
  },
}

export type SmoothScroll = typeof scrollState.smooth

/**
 * How fast the smoothed channel chases the raw one, in reciprocal seconds.
 * ~6 puts it 45% of the way there after 100ms: the lag reads as weight rather
 * than as lateness. This is the site's motion signature — one number, one place.
 */
export const SCROLL_LAMBDA = 6

/**
 * The same chase, for a coarse pointer.
 *
 * `SCROLL_LAMBDA` exists to absorb the mouse wheel's notch: the raw scroll
 * position lands on its new number in a single frame, and the lag on the way
 * there is what turns a step into a glide. A finger has no notch. Touch
 * scrolling — and the momentum phase after the finger lifts — already delivers
 * a continuous position at frame rate, so on a phone that same lag has nothing
 * to absorb and spends itself entirely on being late behind a finger that is
 * still on the glass. Higher lambda, shorter lag: ~11 is still slow enough to
 * take several frames to arrive (so a programmatic jump — an anchor link, a
 * restored scroll position — still eases rather than snaps), and fast enough
 * that the backdrop no longer trails the drag.
 */
export const SCROLL_LAMBDA_TOUCH = 11

/**
 * Pure: which chase rate this device's scrolling wants. Separated from the
 * probe so the policy is testable without a matchMedia.
 */
export function scrollLambda(coarsePointer: boolean): number {
  return coarsePointer ? SCROLL_LAMBDA_TOUCH : SCROLL_LAMBDA
}

/**
 * The longest frame we will ease across. A backgrounded tab hands the first
 * frame back a `dt` of seconds or minutes, and `damp` over that is
 * indistinguishable from a snap — the exact stepping we are here to remove.
 */
export const MAX_FRAME_DT = 0.1

/** Pure: how much of the hero is still on screen, given its bottom edge in px. */
export function heroVisibility(heroBottom: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  return Math.min(1, Math.max(0, heroBottom / viewportHeight))
}

/**
 * Pure: how far the reader has scrolled through the hero's own EXTRA height.
 *
 * 0 while the first screen is still in place, 1 once the hero's bottom edge has
 * reached the bottom of the viewport — which is exactly the moment About is
 * about to take over. Everything between is the room the taller hero buys for
 * the exit sequence.
 *
 * This is NOT the scroll-fraction table that got v1 deleted, and the difference
 * matters. That table keyed motion to fractions of the WHOLE DOCUMENT, so
 * adding a section silently re-timed every animation on the site. This is
 * derived from one element's own rect and its own height: make the hero taller
 * or shorter and the sequence simply has more or less room, and no other
 * section can affect it at all.
 *
 * `heroVisible` cannot do this job. It is `bottom / viewportHeight` clamped to
 * 1, so on a hero taller than the screen it sits pinned at 1 through all of the
 * extra height and only starts moving in the last viewport — the sequence would
 * do nothing for most of the scroll it was given.
 */
export function heroExitProgress(
  heroTop: number,
  heroHeight: number,
  viewportHeight: number,
): number {
  const extra = heroHeight - viewportHeight
  // A hero no taller than the screen has no room to play a sequence in, so it
  // never starts one. This is the desktop case and the short-phone case both.
  if (extra <= 0) return 0
  return Math.min(1, Math.max(0, -heroTop / extra))
}

/** Pure: how far the viewport has travelled through a section, 0 → 1. */
export function sectionProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) return 0
  const total = rect.height + viewportHeight
  const travelled = viewportHeight - rect.top
  return Math.min(1, Math.max(0, travelled / total))
}

/**
 * Advance every smoothed channel one frame toward its raw target. Mutates in
 * place: this runs once per frame forever, and a fresh object per frame would
 * be garbage the collector has to chase during exactly the scroll the smoothing
 * is meant to protect.
 */
export function advanceSmooth(
  smooth: SmoothScroll,
  target: { progress: number; heroVisible: number; heroExit: number; pinnedProgress: number },
  dt: number,
  lambda: number = SCROLL_LAMBDA,
): void {
  const step = Math.min(dt, MAX_FRAME_DT)
  smooth.progress = damp(smooth.progress, target.progress, lambda, step)
  smooth.heroVisible = damp(smooth.heroVisible, target.heroVisible, lambda, step)
  smooth.heroExit = damp(smooth.heroExit, target.heroExit, lambda, step)
  smooth.pinnedProgress = damp(smooth.pinnedProgress, target.pinnedProgress, lambda, step)
}

let pinnedId: string | null = null
export function registerPinnedSection(id: string | null): void {
  pinnedId = id
}

export function useScrollTracker(): void {
  useEffect(() => {
    const hero = document.getElementById('top')
    // Read once, here, rather than per frame: a device does not grow a mouse
    // mid-visit, and this is a matchMedia call inside a rAF loop otherwise.
    const lambda = scrollLambda(isCoarsePointer())
    // The scroll listener sets this and does nothing else. Scroll can fire many
    // times between two frames — a single wheel gesture does — and each of the
    // reads below forces layout, so doing them in the listener made the browser
    // recompute style mid-gesture once per event for a value nobody could see
    // until the next frame anyway.
    let dirty = false
    let frame = 0
    let previous = 0

    const markDirty = () => {
      dirty = true
    }

    const readScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? window.scrollY / max : 0
      if (hero) {
        // One rect read, two measures off it.
        const heroRect = hero.getBoundingClientRect()
        scrollState.heroVisible = heroVisibility(heroRect.bottom, window.innerHeight)
        scrollState.heroExit = heroExitProgress(
          heroRect.top,
          heroRect.height,
          window.innerHeight,
        )
      }
      if (pinnedId) {
        const el = document.getElementById(pinnedId)
        if (el) {
          const r = el.getBoundingClientRect()
          scrollState.pinnedProgress = sectionProgress(
            { top: r.top, height: r.height },
            window.innerHeight,
          )
        }
      }
    }

    const readPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      // The first frame has no earlier timestamp to measure against, so it
      // eases by nothing and only seeds the clock. Inventing a 1/60 here would
      // be a guess, and a wrong one on a 144Hz display.
      const dt = previous === 0 ? 0 : (now - previous) / 1000
      previous = now
      if (dirty) {
        dirty = false
        readScroll()
      }
      // Unconditional: if the smooth pass only ran on dirty frames it would
      // stop the instant the wheel did, freezing part-way to the target instead
      // of coasting into it.
      advanceSmooth(scrollState.smooth, scrollState, dt, lambda)
    }

    // Read once synchronously so a rig mounting alongside this hook doesn't see
    // a frame of zeroes, and start the smoothed channel already at the answer —
    // a reload halfway down the page should not ease in from the top.
    readScroll()
    scrollState.smooth.progress = scrollState.progress
    scrollState.smooth.heroVisible = scrollState.heroVisible
    scrollState.smooth.heroExit = scrollState.heroExit
    scrollState.smooth.pinnedProgress = scrollState.pinnedProgress

    frame = requestAnimationFrame(tick)
    window.addEventListener('scroll', markDirty, { passive: true })
    window.addEventListener('resize', markDirty, { passive: true })
    // The pointer stays event-driven: it is damped downstream in the rig, and it
    // costs no layout read, so there is nothing to batch.
    window.addEventListener('pointermove', readPointer, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', markDirty)
      window.removeEventListener('resize', markDirty)
      window.removeEventListener('pointermove', readPointer)
    }
  }, [])
}
