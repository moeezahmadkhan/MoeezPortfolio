import { describe, it, expect } from 'vitest'
import {
  localProgress,
  revealProgress,
  detectionAt,
  walkerPosition,
  SECTION_START,
  SECTION_END,
} from './map'

describe('localProgress', () => {
  it('clamps below the section to 0 and above it to 1', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
  it('is ~0.5 at the section midpoint', () => {
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
  })
})

describe('revealProgress', () => {
  it('clamps to [0,1] and rises linearly', () => {
    expect(revealProgress(0, 0, 2)).toBe(0)
    expect(revealProgress(1, 0, 2)).toBe(0.5)
    expect(revealProgress(5, 0, 2)).toBe(1)
  })
  it('guards against zero/negative duration', () => {
    expect(revealProgress(10, 5, 0)).toBe(0)
  })
})

describe('detectionAt', () => {
  it('confidence climbs with progress and locks past the threshold', () => {
    expect(detectionAt(0).locked).toBe(false)
    expect(detectionAt(1).locked).toBe(true)
    expect(detectionAt(1).confidence).toBe(1)
  })
  it('tightens the box as confidence climbs', () => {
    expect(detectionAt(1).boxScale).toBeLessThan(detectionAt(0).boxScale)
  })
})

describe('walkerPosition', () => {
  it('spans left→right across the table at table height', () => {
    const [x0, y0] = walkerPosition(0)
    const [x1] = walkerPosition(1)
    expect(x0).toBeLessThan(0)
    expect(x1).toBeGreaterThan(0)
    expect(y0).toBeCloseTo(-1.17, 2) // TABLE_Y + 0.03
  })
})
