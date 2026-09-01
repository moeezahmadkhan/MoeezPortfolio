import { HERO_RIG_ID } from './rigs'

/**
 * How a rig arrives, over and above its cross-fade.
 *
 * A section change used to be a bare opacity swap: the outgoing rig dimmed, the
 * incoming one brightened, and nothing else about either of them differed. This
 * gives each arrival a short move to settle out of, so a new section reads as a
 * figure taking its place rather than as a dissolve.
 *
 * Deliberately NOT scroll-driven. The only input is the rig's own fade value,
 * which CharacterRig already tracks — so this adds no state, no timers, and
 * critically no scroll-fraction table. A table keyed on scroll fractions is
 * what got v1 deleted, and nothing here may reintroduce one.
 */
export type EntryOffsets = { lift: number; yaw: number; scale: number }

const NONE: EntryOffsets = { lift: 0, yaw: 0, scale: 0 }

/**
 * Amplitudes at the moment a rig begins arriving, decaying to zero as it
 * settles. `lift` is world units, `yaw` radians, `scale` a multiplier delta.
 *
 * The hero is absent on purpose: it mounts already materialised
 * (`skipInitialFade`), so an entry move would play against a figure that never
 * entered. Values are small — this is a figure stepping into place, not a
 * camera move.
 */
export const ENTRIES: Readonly<Record<string, EntryOffsets>> = {
  work: { lift: 0.34, yaw: -0.5, scale: -0.08 },
  experience: { lift: -0.28, yaw: 0.44, scale: -0.06 },
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * The offsets for `rigId` at `progress` (its own cross-fade, 0 to 1), written
 * into `out`.
 *
 * `out` is caller-owned and reused every frame, exactly as `rigPose` does: this
 * runs once per mounted rig per frame and returning a fresh object literal here
 * would be a per-frame allocation.
 *
 * The decay is linear in `progress` rather than eased, because `progress` is
 * already the damped fade — easing it twice would stack a second curve on a
 * value that has one.
 */
export function entryOffsets(rigId: string, progress: number, out: EntryOffsets): EntryOffsets {
  const entry = rigId === HERO_RIG_ID ? NONE : (ENTRIES[rigId] ?? NONE)
  const remaining = 1 - clamp01(progress)
  out.lift = entry.lift * remaining
  out.yaw = entry.yaw * remaining
  out.scale = entry.scale * remaining
  return out
}
