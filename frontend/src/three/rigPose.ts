import { PINNED_SECTION_ID } from './rigs'

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
 *
 * Writes into the caller-supplied `out` object instead of allocating a fresh
 * one — this runs once per active rig per frame inside `useFrame`, and a
 * literal-object return there would be a per-frame allocation. Callers hoist
 * one `Pose` per rig instance and reuse it every frame; `out` is returned too,
 * purely for call-site convenience.
 */
export function rigPose(
  pointerX: number,
  pointerY: number,
  focusBias: number,
  visible: number,
  out: Pose,
): Pose {
  const pointerYaw = clamp(pointerX * MAX_TILT, -MAX_TILT, MAX_TILT)
  out.yaw = clamp(pointerYaw + focusBias, -MAX_FOCUS_TURN, MAX_FOCUS_TURN)
  out.pitch = clamp(-pointerY * MAX_TILT * 0.6, -MAX_TILT, MAX_TILT)
  // As a rig fades away (scrolled off, or cross-fading out) the figure drifts
  // up and out rather than clipping.
  out.lift = (1 - visible) * 1.6
  out.opacity = visible
  return out
}

// Roughly a half-turn across the pinned section: enough to read as a
// deliberate, scroll-driven turn rather than the pointer-parallax wobble every
// other rig gets, but short of a full rotation, which starts to look like a
// turntable demo.
export const PINNED_TURN = Math.PI * 0.85

/**
 * Pure: how far the pinned section's rig has turned, given how far the viewport
 * has travelled through that section. Every other rig gets zero — a stale
 * `pinnedProgress` left behind after `registerPinnedSection(null)` must not
 * leak into some other section's pose.
 *
 * `progress` is clamped: `sectionProgress` already clamps, but this is the
 * function that decides how far a model spins, and a single bad rect read
 * should not be able to overspin it.
 */
export function pinnedYaw(rigId: string, progress: number): number {
  if (rigId !== PINNED_SECTION_ID) return 0
  return clamp(progress, 0, 1) * PINNED_TURN
}
