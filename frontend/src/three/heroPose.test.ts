import { describe, expect, it } from 'vitest'
import { heroPose, MAX_TILT } from './heroPose'

describe('heroPose', () => {
  it('is centred when the pointer is centred', () => {
    const pose = heroPose(0, 0, 1)
    expect(pose.yaw).toBeCloseTo(0)
    expect(pose.pitch).toBeCloseTo(0)
  })

  it('clamps tilt at the extremes of the viewport', () => {
    expect(heroPose(5, 5, 1).yaw).toBeLessThanOrEqual(MAX_TILT)
    expect(heroPose(-5, -5, 1).yaw).toBeGreaterThanOrEqual(-MAX_TILT)
  })

  it('fades and lifts the model away as the hero leaves', () => {
    const visible = heroPose(0, 0, 1)
    const gone = heroPose(0, 0, 0)
    expect(gone.opacity).toBe(0)
    expect(visible.opacity).toBe(1)
    expect(gone.lift).toBeGreaterThan(visible.lift)
  })
})
