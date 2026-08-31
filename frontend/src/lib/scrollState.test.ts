import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_FRAME_DT,
  SCROLL_LAMBDA,
  advanceSmooth,
  heroVisibility,
  registerPinnedSection,
  scrollState,
  sectionProgress,
  useScrollTracker,
} from './scrollState'

describe('heroVisibility', () => {
  it('is 1 while the hero still fills the viewport', () => {
    expect(heroVisibility(900, 900)).toBe(1)
  })

  it('is 0 once the hero has fully left', () => {
    expect(heroVisibility(0, 900)).toBe(0)
    expect(heroVisibility(-200, 900)).toBe(0)
  })

  it('falls off linearly across the last screen of the hero', () => {
    expect(heroVisibility(450, 900)).toBeCloseTo(0.5, 5)
  })
})

describe('sectionProgress', () => {
  it('is 0 when section is entirely below the viewport', () => {
    expect(sectionProgress({ top: 1000, height: 100 }, 900)).toBe(0)
  })

  it('is 1 when section is entirely above the viewport', () => {
    expect(sectionProgress({ top: -500, height: 100 }, 900)).toBe(1)
  })

  it('is between 0 and 1 when section top sits at viewport midpoint', () => {
    const progress = sectionProgress({ top: 450, height: 100 }, 900)
    expect(progress).toBeGreaterThan(0)
    expect(progress).toBeLessThan(1)
  })

  it('returns 0 when viewportHeight is 0', () => {
    expect(sectionProgress({ top: 100, height: 100 }, 0)).toBe(0)
  })

  it('returns 0 when viewportHeight is negative', () => {
    expect(sectionProgress({ top: 100, height: 100 }, -100)).toBe(0)
  })
})

describe('scrollState', () => {
  it('starts at a neutral pose', () => {
    expect(scrollState).toMatchObject({
      progress: 0,
      pointerX: 0,
      pointerY: 0,
      heroVisible: 1,
      pinnedProgress: 0,
    })
  })
})

describe('advanceSmooth', () => {
  const target = { progress: 1, heroVisible: 0, pinnedProgress: 1 }
  const fresh = () => ({ progress: 0, heroVisible: 1, pinnedProgress: 0 })

  it('leaves the smoothed value untouched when dt is zero or negative', () => {
    const s = fresh()
    advanceSmooth(s, target, 0)
    expect(s).toEqual(fresh())
    advanceSmooth(s, target, -1 / 60)
    expect(s).toEqual(fresh())
  })

  it('approaches the target monotonically and never overshoots it', () => {
    const s = fresh()
    let previous = s.progress
    for (let i = 0; i < 60; i++) {
      advanceSmooth(s, target, 1 / 60)
      expect(s.progress).toBeGreaterThan(previous)
      expect(s.progress).toBeLessThanOrEqual(target.progress)
      previous = s.progress
    }
    expect(s.progress).toBeCloseTo(target.progress, 2)
  })

  it('smooths every scroll channel, not just progress', () => {
    const s = fresh()
    for (let i = 0; i < 60; i++) advanceSmooth(s, target, 1 / 60)
    expect(s.heroVisible).toBeCloseTo(target.heroVisible, 2)
    expect(s.pinnedProgress).toBeCloseTo(target.pinnedProgress, 2)
  })

  it('lands in the same place after 100ms whether that took 6 frames or 14', () => {
    const six = fresh()
    for (let i = 0; i < 6; i++) advanceSmooth(six, target, 0.1 / 6)
    const fourteen = fresh()
    for (let i = 0; i < 14; i++) advanceSmooth(fourteen, target, 0.1 / 14)
    expect(six.progress).toBeCloseTo(fourteen.progress, 10)
    expect(six.heroVisible).toBeCloseTo(fourteen.heroVisible, 10)
  })

  it('clamps a backgrounded tab’s enormous dt so the first frame back cannot snap', () => {
    const away = fresh()
    advanceSmooth(away, target, 30)
    const clamped = fresh()
    advanceSmooth(clamped, target, MAX_FRAME_DT)
    expect(away.progress).toBeCloseTo(clamped.progress, 10)
    expect(away.progress).toBeLessThan(target.progress)
  })

  it('eases at the site’s scroll lambda', () => {
    const s = fresh()
    advanceSmooth(s, target, 0.1)
    expect(s.progress).toBeCloseTo(1 - Math.exp(-SCROLL_LAMBDA * 0.1), 10)
  })
})

// The rAF loop is the whole point of the hook, so the tests drive it by hand:
// real frames would make timing the assertions impossible.
let frames: Array<{ id: number; cb: FrameRequestCallback }> = []
let nextFrameId = 1
let cancelled: number[] = []

function stubRaf() {
  frames = []
  nextFrameId = 1
  cancelled = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextFrameId++
    frames.push({ id, cb })
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelled.push(id)
    frames = frames.filter((f) => f.id !== id)
  })
}

function runFrame(now: number) {
  const due = frames
  frames = []
  act(() => {
    for (const f of due) f.cb(now)
  })
}

describe('useScrollTracker', () => {
  afterEach(() => {
    registerPinnedSection(null)
    document.body.innerHTML = ''
  })

  it('reads layout once per frame however many scroll events fire', () => {
    stubRaf()
    document.body.innerHTML = '<section id="top"></section>'
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect')
    renderHook(() => useScrollTracker())
    rect.mockClear()

    // A wheel gesture delivers a burst of scroll events between two frames.
    for (let i = 0; i < 8; i++) window.dispatchEvent(new Event('scroll'))
    expect(rect).not.toHaveBeenCalled()

    runFrame(16)
    expect(rect).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 8; i++) window.dispatchEvent(new Event('scroll'))
    runFrame(32)
    expect(rect).toHaveBeenCalledTimes(2)
    rect.mockRestore()
  })

  it('keeps advancing the smooth channel on frames with no scroll at all', () => {
    stubRaf()
    document.body.innerHTML = '<section id="top"></section>'
    renderHook(() => useScrollTracker())
    // The very first frame only seeds the timestamp — there is no earlier one to
    // measure a dt against — so the motion starts on the second.
    runFrame(16)
    scrollState.heroVisible = 0
    scrollState.smooth.heroVisible = 1

    runFrame(32)
    const afterOne = scrollState.smooth.heroVisible
    expect(afterOne).toBeLessThan(1)
    // No scroll event in between: the smoothed value must still be travelling,
    // not frozen part-way where the last event left it.
    runFrame(48)
    expect(scrollState.smooth.heroVisible).toBeLessThan(afterOne)
  })

  it('cancels its frame loop on unmount and never schedules a second one', () => {
    stubRaf()
    document.body.innerHTML = '<section id="top"></section>'
    const { unmount } = renderHook(() => useScrollTracker())
    runFrame(16)
    expect(frames).toHaveLength(1)

    const pending = frames[0].id
    unmount()
    expect(cancelled).toContain(pending)
    expect(frames).toHaveLength(0)

    // And nothing reanimates it: a scroll after unmount must not resurrect a loop.
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect')
    window.dispatchEvent(new Event('scroll'))
    runFrame(48)
    expect(frames).toHaveLength(0)
    expect(rect).not.toHaveBeenCalled()
    rect.mockRestore()
  })
})
