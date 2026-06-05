import { describe, it, expect } from 'vitest'
import { activeIndex, settleTarget, nextCue } from './scrollMath'

const TOPS = [0, 1000, 2000, 5000] // ascending section tops (px)

describe('activeIndex', () => {
  it('returns the last section whose top is at or above the anchor', () => {
    expect(activeIndex(0, TOPS)).toBe(0)
    expect(activeIndex(999, TOPS)).toBe(0)
    expect(activeIndex(1000, TOPS)).toBe(1)
    expect(activeIndex(2500, TOPS)).toBe(2)
    expect(activeIndex(9999, TOPS)).toBe(3)
  })
})

describe('settleTarget', () => {
  it('returns the nearest top when inside the magnet zone', () => {
    expect(settleTarget(1100, TOPS, 300)).toBe(1000) // 100px away, zone 300
    expect(settleTarget(1850, TOPS, 300)).toBe(2000) // 150px away
  })
  it('returns null when no boundary is within the magnet zone', () => {
    expect(settleTarget(1500, TOPS, 300)).toBeNull() // 500px from either seam
  })
  it('returns null when already essentially on a boundary (deadzone)', () => {
    expect(settleTarget(1001, TOPS, 300)).toBeNull() // within 2px deadzone
  })
})

describe('nextCue', () => {
  it('is active when within threshold of the next boundary below', () => {
    expect(nextCue(900, TOPS, 150)).toEqual({ active: true, nextIndex: 1 }) // 100px to 1000
    expect(nextCue(700, TOPS, 150)).toEqual({ active: false, nextIndex: 1 }) // 300px to 1000
  })
  it('reports no next section past the final boundary', () => {
    expect(nextCue(5000, TOPS, 150)).toEqual({ active: false, nextIndex: null })
  })
})
