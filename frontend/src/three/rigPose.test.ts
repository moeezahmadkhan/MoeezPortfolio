import { describe, expect, it } from 'vitest'
import { MAX_FOCUS_TURN, MAX_TILT, rigPose } from './rigPose'

describe('rigPose', () => {
  it('is centred when the pointer is centred and there is no focus bias', () => {
    const pose = rigPose(0, 0, 0, 1)
    expect(pose.yaw).toBeCloseTo(0)
    expect(pose.pitch).toBeCloseTo(0)
  })

  it('clamps yaw and pitch at the tilt limit for extreme pointer values', () => {
    expect(rigPose(5, 5, 0, 1).yaw).toBeLessThanOrEqual(MAX_TILT)
    expect(rigPose(-5, -5, 0, 1).yaw).toBeGreaterThanOrEqual(-MAX_TILT)
    expect(rigPose(5, 5, 0, 1).pitch).toBeLessThanOrEqual(MAX_TILT)
    expect(rigPose(-5, -5, 0, 1).pitch).toBeGreaterThanOrEqual(-MAX_TILT)
  })

  it('a non-zero focusBias turns the model beyond the pointer-only contribution, within a hard clamp', () => {
    const noFocus = rigPose(0, 0, 0, 1)
    const focused = rigPose(0, 0, 0.3, 1)
    expect(focused.yaw).toBeGreaterThan(noFocus.yaw)
    // Beyond what pointer parallax alone could ever produce...
    expect(focused.yaw).toBeGreaterThan(MAX_TILT)
    // ...but still short of a model that reads as spinning.
    expect(focused.yaw).toBeLessThanOrEqual(MAX_FOCUS_TURN)
  })

  it('clamps an extreme focusBias at the hard limit', () => {
    expect(rigPose(0, 0, 50, 1).yaw).toBeLessThanOrEqual(MAX_FOCUS_TURN)
    expect(rigPose(0, 0, -50, 1).yaw).toBeGreaterThanOrEqual(-MAX_FOCUS_TURN)
  })

  it('gives zero opacity when the rig is not visible', () => {
    expect(rigPose(0, 0, 0, 0).opacity).toBe(0)
    expect(rigPose(0, 0, 0, 1).opacity).toBe(1)
  })

  it('lift grows as visibility falls', () => {
    const visible = rigPose(0, 0, 0, 1)
    const gone = rigPose(0, 0, 0, 0)
    expect(gone.lift).toBeGreaterThan(visible.lift)
  })
})
