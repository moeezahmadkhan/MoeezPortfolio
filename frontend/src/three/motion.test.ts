import { describe, expect, it } from 'vitest'
import { advanceSmooth } from '../lib/scrollState'
import {
  BACKDROP_SCROLL_LAMBDA,
  BACKDROP_TINT_LAMBDA,
  FADE_LAMBDA,
  INTENSITY_LAMBDA,
  LIFT_LAMBDA,
  ORBIT_RETURN_LAMBDA,
  TURN_LAMBDA,
  advanceFade,
  rigVisibility,
  type ScrollChannels,
} from './motion'

/** A scrollState-shaped double, raw and smoothed starting in agreement. */
function channels(heroVisible = 1): ScrollChannels {
  return {
    heroVisible,
    progress: 0,
    pinnedProgress: 0,
    smooth: { heroVisible, progress: 0, pinnedProgress: 0 },
  }
}

/** One frame of the scroll tracker's own smoothing pass. */
function frame(scroll: ScrollChannels, dt = 1 / 60): void {
  advanceSmooth(scroll.smooth, scroll, dt)
}

describe('the motion signature', () => {
  // Extracting these must not retune the site. Each was an inline literal in
  // CharacterRig's frame body; if one of these numbers changes, it should be
  // because someone deliberately re-tuned the motion, not because a refactor
  // rounded it.
  it('keeps the lambdas the site shipped with', () => {
    expect(FADE_LAMBDA).toBe(4)
    expect(TURN_LAMBDA).toBe(2.6)
    expect(LIFT_LAMBDA).toBe(2.2)
    expect(ORBIT_RETURN_LAMBDA).toBe(1.4)
    expect(INTENSITY_LAMBDA).toBe(3)
    expect(BACKDROP_SCROLL_LAMBDA).toBe(3)
    expect(BACKDROP_TINT_LAMBDA).toBe(2)
  })

  // The backdrop sits behind the figure, so if it settled faster than the
  // figure did the ground would arrive before the thing standing on it.
  it('never lets the backdrop settle faster than the figure it stands behind', () => {
    expect(BACKDROP_SCROLL_LAMBDA).toBeLessThanOrEqual(TURN_LAMBDA + 0.4)
    expect(BACKDROP_TINT_LAMBDA).toBeLessThan(LIFT_LAMBDA)
  })
})

describe('advanceFade', () => {
  it('does not move on a zero-length frame', () => {
    expect(advanceFade(0, true, 0)).toBe(0)
  })

  it('climbs toward 1 while fading in and falls toward 0 while fading out', () => {
    expect(advanceFade(0, true, 1 / 60)).toBeGreaterThan(0)
    expect(advanceFade(0, true, 1 / 60)).toBeLessThan(1)
    expect(advanceFade(1, false, 1 / 60)).toBeLessThan(1)
    expect(advanceFade(1, false, 1 / 60)).toBeGreaterThan(0)
  })

  it('reaches the same place after 100ms at 60Hz as at 144Hz', () => {
    let slow = 0
    for (let i = 0; i < 6; i++) slow = advanceFade(slow, true, 0.1 / 6)
    let fast = 0
    for (let i = 0; i < 14; i++) fast = advanceFade(fast, true, 0.1 / 14)
    expect(fast).toBeCloseTo(slow, 6)
  })
})

describe('rigVisibility', () => {
  it('is a non-hero rig’s own cross-fade, whatever the hero is doing', () => {
    const scroll = channels(0)
    expect(rigVisibility('work', 0.5, scroll)).toBeCloseTo(0.5, 6)
    expect(rigVisibility('experience', 1, scroll)).toBeCloseTo(1, 6)
  })

  it('scales the hero by its own cross-fade too', () => {
    expect(rigVisibility('hero', 0.5, channels(1))).toBeCloseTo(0.5, 6)
  })

  // D1. A wheel notch moves the raw hero measure in one discrete jump. The
  // rig's visibility must not follow it in one jump: it drives material
  // opacity, the wand light and the sparkle cloud all at once, so a step here
  // is a step in everything the visitor can see.
  it('moves only a fraction of the way when a wheel notch drops the hero 1 → 0.4', () => {
    const scroll = channels(1)
    scroll.heroVisible = 0.4 // the notch: raw lands on its new value immediately
    frame(scroll)

    const visible = rigVisibility('hero', 1, scroll)
    expect(visible).toBeLessThan(1) // it did start moving
    expect(visible).toBeGreaterThan(0.9) // but it did not arrive
  })

  it('converges on the target when the scroll stops there', () => {
    const scroll = channels(1)
    scroll.heroVisible = 0.4
    for (let i = 0; i < 120; i++) frame(scroll)
    expect(rigVisibility('hero', 1, scroll)).toBeCloseTo(0.4, 3)
  })

  // The measurement from Task 1, re-run through the rig: over one wheel
  // gesture the largest single-frame jump in the raw channel was 0.1112. The
  // fade must not inherit that.
  it('never steps as far in one frame as the raw channel does', () => {
    const NOTCH = 0.1112
    const FRAMES_PER_NOTCH = 3 // ~20 notches/second at 60Hz — a brisk flick
    const scroll = channels(1)

    let rawStep = 0
    let visibleStep = 0
    let previousRaw = scroll.heroVisible
    let previousVisible = rigVisibility('hero', 1, scroll)

    for (let f = 0; f < 30; f++) {
      if (f % FRAMES_PER_NOTCH === 0) {
        scroll.heroVisible = Math.max(0, scroll.heroVisible - NOTCH)
      }
      frame(scroll)
      const visible = rigVisibility('hero', 1, scroll)
      rawStep = Math.max(rawStep, Math.abs(scroll.heroVisible - previousRaw))
      visibleStep = Math.max(visibleStep, Math.abs(visible - previousVisible))
      previousRaw = scroll.heroVisible
      previousVisible = visible
    }

    expect(rawStep).toBeCloseTo(NOTCH, 6)
    expect(visibleStep).toBeLessThan(rawStep * 0.6)
  })
})
