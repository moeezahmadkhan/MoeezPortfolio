// Beyond this the model reads as reacting to the pointer, not spinning.
export const MAX_TILT = 0.18
// A hard ceiling on the COMBINED yaw (pointer + focus). Wider than MAX_TILT alone
// so a focused project card can visibly turn the model past its pointer-only
// range, but a model that swings wildly still reads as broken, not responsive.
export const MAX_FOCUS_TURN = 0.4

export type Pose = { yaw: number; pitch: number; lift: number; opacity: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Pure target pose for a given pointer position, focus bias, and rig visibility.
 * Generalises the predecessor plan's `heroPose`: the same clamped pointer
 * parallax, plus a `focusBias` term (a hovered/focused project card, wired up by
 * a later task) that lets the model turn further than the pointer alone would
 * ever push it, still bounded by `MAX_FOCUS_TURN`.
 */
export function rigPose(
  pointerX: number,
  pointerY: number,
  focusBias: number,
  visible: number,
): Pose {
  const pointerYaw = clamp(pointerX * MAX_TILT, -MAX_TILT, MAX_TILT)
  return {
    yaw: clamp(pointerYaw + focusBias, -MAX_FOCUS_TURN, MAX_FOCUS_TURN),
    pitch: clamp(-pointerY * MAX_TILT * 0.6, -MAX_TILT, MAX_TILT),
    // As a rig fades away (scrolled off, or cross-fading out) the figure drifts
    // up and out rather than clipping.
    lift: (1 - visible) * 1.6,
    opacity: visible,
  }
}
