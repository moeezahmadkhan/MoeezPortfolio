import { PINNED_SECTION_ID } from './rigs'
import { describe, expect, it } from 'vitest'
import {
  EXIT_LIFT,
  EXIT_LIFT_MOBILE,
  MOBILE_PRESENCE,
  MAX_FOCUS_TURN,
  MAX_TILT,
  rigPose,
  type Pose,
  PINNED_TURN,
  pinnedYaw,
} from './rigPose'

// Finding 3 changed rigPose to write into a caller-supplied output object
// instead of allocating a fresh one per call — each test gets its own so
// mutation from one call can never leak into another's assertions.
function makePose(): Pose {
  return { yaw: 0, pitch: 0, lift: 0, opacity: 0 }
}

describe('rigPose', () => {
  it('turns far enough to read as attending to the visitor', () => {
    // 0.18 rad is about ten degrees, which measured as shy: the figure barely
    // acknowledged the pointer. The ceiling is where it starts reading as
    // spinning rather than looking, which MAX_FOCUS_TURN already marks.
    expect(MAX_TILT).toBeGreaterThan(0.2)
    expect(MAX_TILT).toBeLessThan(MAX_FOCUS_TURN)
  })

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

  it('holds the mobile figure back behind the copy, and still hides it completely when gone', () => {
    // On a phone the figure stands under the hero copy rather than beside it,
    // so at full strength it competes with the text for the same pixels.
    // Stage.css already halves the no-WebGL fallback's opacity at this width
    // for exactly that reason; the live canvas has to agree with it.
    expect(rigPose(0, 0, 0, 1, makePose(), true).opacity).toBeCloseTo(MOBILE_PRESENCE, 6)
    expect(MOBILE_PRESENCE).toBeGreaterThan(0)
    expect(MOBILE_PRESENCE).toBeLessThan(1)
    // Still all the way to nothing — a recessive figure is not a permanently
    // half-visible one.
    expect(rigPose(0, 0, 0, 0, makePose(), true).opacity).toBe(0)
  })

  it('lift grows as visibility falls', () => {
    const visible = rigPose(0, 0, 0, 1, makePose())
    const gone = rigPose(0, 0, 0, 0, makePose())
    expect(gone.lift).toBeGreaterThan(visible.lift)
  })

  describe('the exit drift', () => {
    // Which way a dissolving figure leaves depends on where it was standing.
    // On desktop the rig sits mid-right, so drifting up carries it out of
    // frame. On mobile it stands at the bottom of the screen with the copy
    // above it, so the same upward drift walked the fading figure straight
    // through the text it was meant to be getting out of the way of.
    it('drifts the desktop rig up and out as it fades', () => {
      expect(rigPose(0, 0, 0, 0, makePose(), false).lift).toBeCloseTo(EXIT_LIFT, 6)
    })

    it('sinks the mobile rig under the page instead of up through the copy', () => {
      expect(rigPose(0, 0, 0, 0, makePose(), true).lift).toBeCloseTo(EXIT_LIFT_MOBILE, 6)
      expect(EXIT_LIFT_MOBILE).toBeLessThan(0)
      expect(EXIT_LIFT).toBeGreaterThan(0)
    })

    it('leaves a fully present rig exactly where it stands, either way', () => {
      expect(rigPose(0, 0, 0, 1, makePose(), false).lift).toBeCloseTo(0, 6)
      expect(rigPose(0, 0, 0, 1, makePose(), true).lift).toBeCloseTo(0, 6)
    })

    it('moves monotonically away from rest as the rig fades, on both viewports', () => {
      // A drift that reverses part-way reads as the figure changing its mind.
      for (const mobile of [false, true]) {
        let previous = 0
        for (let visible = 1; visible >= 0; visible -= 0.1) {
          const lift = Math.abs(rigPose(0, 0, 0, visible, makePose(), mobile).lift)
          expect(lift).toBeGreaterThanOrEqual(previous - 1e-9)
          previous = lift
        }
      }
    })
  })

  it('writes into and returns the same out object, mutating it in place', () => {
    const out = makePose()
    const returned = rigPose(0.5, 0.5, 0.1, 1, out)
    expect(returned).toBe(out)
    expect(out.yaw).not.toBe(0)
  })

  describe('pinnedYaw', () => {
    it('is zero for a rig that is not the pinned one, at any progress', () => {
      expect(pinnedYaw('hero', 0.5)).toBe(0)
      expect(pinnedYaw('work', 1)).toBe(0)
    })

    it('turns the pinned rig from nothing to the full turn across the section', () => {
      expect(pinnedYaw(PINNED_SECTION_ID, 0)).toBe(0)
      expect(pinnedYaw(PINNED_SECTION_ID, 1)).toBeCloseTo(PINNED_TURN, 6)
      expect(pinnedYaw(PINNED_SECTION_ID, 0.5)).toBeCloseTo(PINNED_TURN / 2, 6)
    })

    it('is monotonic, so scrolling one way never turns the model the other way', () => {
      let previous = -Infinity
      for (let p = 0; p <= 1; p += 0.05) {
        const yaw = pinnedYaw(PINNED_SECTION_ID, p)
        expect(yaw).toBeGreaterThanOrEqual(previous)
        previous = yaw
      }
    })

    it('clamps progress, so a rect read outside the section cannot overspin it', () => {
      expect(pinnedYaw(PINNED_SECTION_ID, -0.4)).toBe(0)
      expect(pinnedYaw(PINNED_SECTION_ID, 2.5)).toBeCloseTo(PINNED_TURN, 6)
    })
  })
})
