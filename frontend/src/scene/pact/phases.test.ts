import { describe, it, expect } from 'vitest'
import {
  localProgress, SECTION_START, SECTION_END,
  ingestProgress, analysisProgress, pactProgress,
  scoreValue, SCORE_TARGET, INGEST_END, LEGILIMENCY_END,
} from './phases'

describe('localProgress', () => {
  it('ramps 0→1 across the section band and clamps outside', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_START)).toBe(0)
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
    // interior point is linear (a smoothstep would read 0.15625 here, not 0.25)
    expect(localProgress(SECTION_START + 0.25 * (SECTION_END - SECTION_START))).toBeCloseTo(0.25, 5)
    expect(localProgress(SECTION_END)).toBe(1)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
})

describe('beat ramps', () => {
  it('ingest fills over [0, INGEST_END] then holds at 1', () => {
    expect(ingestProgress(0)).toBe(0)
    expect(ingestProgress(INGEST_END)).toBe(1)
    expect(ingestProgress(1)).toBe(1)
  })
  it('analysis fills over [INGEST_END, LEGILIMENCY_END]', () => {
    expect(analysisProgress(INGEST_END)).toBe(0)
    expect(analysisProgress(LEGILIMENCY_END)).toBe(1)
    expect(analysisProgress(0)).toBe(0)
  })
  it('pact fills over [LEGILIMENCY_END, 1]', () => {
    expect(pactProgress(LEGILIMENCY_END)).toBe(0)
    expect(pactProgress(1)).toBe(1)
    expect(pactProgress(INGEST_END)).toBe(0)
  })
})

describe('scoreValue', () => {
  it('is 0 before analysis, counts up to SCORE_TARGET by the end of beat 2', () => {
    expect(scoreValue(0)).toBe(0)
    expect(scoreValue(INGEST_END)).toBe(0)
    expect(scoreValue(LEGILIMENCY_END)).toBe(SCORE_TARGET)
    expect(scoreValue(1)).toBe(SCORE_TARGET)
  })
  it('is monotonically non-decreasing through beat 2', () => {
    let prev = -1
    for (let lp = 0; lp <= 1.0001; lp += 0.01) {
      const v = scoreValue(lp)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
