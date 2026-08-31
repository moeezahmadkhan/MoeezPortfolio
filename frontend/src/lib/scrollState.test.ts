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
