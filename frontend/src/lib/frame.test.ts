import { describe, expect, it } from 'vitest'
import { damp } from './frame'

describe('damp', () => {
  it('returns the current value when dt is zero', () => {
    expect(damp(0, 10, 4, 0)).toBe(0)
  })

  it('moves toward the target without overshooting', () => {
    const next = damp(0, 10, 4, 1 / 60)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(10)
  })

  it('converges to the target over time', () => {
    let v = 0
    for (let i = 0; i < 240; i++) v = damp(v, 10, 4, 1 / 60)
    expect(v).toBeCloseTo(10, 2)
  })

  it('is frame-rate independent: 120 half-steps ≈ 60 full steps', () => {
    let a = 0
    for (let i = 0; i < 60; i++) a = damp(a, 1, 4, 1 / 60)
    let b = 0
    for (let i = 0; i < 120; i++) b = damp(b, 1, 4, 1 / 120)
    expect(Math.abs(a - b)).toBeLessThan(0.01)
  })
})
