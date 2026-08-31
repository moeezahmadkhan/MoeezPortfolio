import { describe, expect, it } from 'vitest'
import { MAX_FOCUS_TURN, MAX_TILT, rigPose, type Pose } from './rigPose'

// Finding 3 changed rigPose to write into a caller-supplied output object
// instead of allocating a fresh one per call — each test gets its own so
// mutation from one call can never leak into another's assertions.
function makePose(): Pose {
  return { yaw: 0, pitch: 0, lift: 0, opacity: 0 }
}

describe('rigPose', () => {
  it('is centred when the pointer is centred and there is no focus bias', () => {
    const pose = rigPose(0, 0, 0, 1, makePose())
    expect(pose.yaw).toBeCloseTo(0)
    expect(pose.pitch).toBeCloseTo(0)
  })

  it('clamps yaw and pitch at the tilt limit for extreme pointer values', () => {
    expect(rigPose(5, 5, 0, 1, makePose()).yaw).toBeLessThanOrEqual(MAX_TILT)
    expect(rigPose(-5, -5, 0, 1, makePose()).yaw).toBeGreaterThanOrEqual(-MAX_TILT)
    expect(rigPose(5, 5, 0, 1, makePose()).pitch).toBeLessThanOrEqual(MAX_TILT)
    expect(rigPose(-5, -5, 0, 1, makePose()).pitch).toBeGreaterThanOrEqual(-MAX_TILT)
  })

  it('a non-zero focusBias turns the model beyond the pointer-only contribution, within a hard clamp', () => {
    const noFocus = rigPose(0, 0, 0, 1, makePose())
    const focused = rigPose(0, 0, 0.3, 1, makePose())
    expect(focused.yaw).toBeGreaterThan(noFocus.yaw)
    // Beyond what pointer parallax alone could ever produce...
    expect(focused.yaw).toBeGreaterThan(MAX_TILT)
    // ...but still short of a model that reads as spinning.
    expect(focused.yaw).toBeLessThanOrEqual(MAX_FOCUS_TURN)
  })

  it('clamps an extreme focusBias at the hard limit', () => {
    expect(rigPose(0, 0, 50, 1, makePose()).yaw).toBeLessThanOrEqual(MAX_FOCUS_TURN)
    expect(rigPose(0, 0, -50, 1, makePose()).yaw).toBeGreaterThanOrEqual(-MAX_FOCUS_TURN)
  })

  it('gives zero opacity when the rig is not visible', () => {
    expect(rigPose(0, 0, 0, 0, makePose()).opacity).toBe(0)
    expect(rigPose(0, 0, 0, 1, makePose()).opacity).toBe(1)
  })

  it('lift grows as visibility falls', () => {
    const visible = rigPose(0, 0, 0, 1, makePose())
    const gone = rigPose(0, 0, 0, 0, makePose())
    expect(gone.lift).toBeGreaterThan(visible.lift)
  })

  it('writes into and returns the same out object, mutating it in place', () => {
    const out = makePose()
    const returned = rigPose(0.5, 0.5, 0.1, 1, out)
    expect(returned).toBe(out)
    expect(out.yaw).not.toBe(0)
  })
})
