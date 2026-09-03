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

/**
 * The hero's opening push-in: how far back and how much smaller the figure
 * starts on the first frame of a visit, before settling forward.
 *
 * Separate from `ENTRIES` because it is driven by a different progress. Every
 * row in `ENTRIES` decays in its rig's own cross-fade, and the hero has no
 * cross-fade to decay in — it mounts with `skipInitialFade`, at `fade = 1`,
 * which is exactly why `ENTRIES` has no hero row. `CharacterRig` runs a
 * one-shot damped `intro` progress for this instead.
 *
 * Crucially this moves the figure and never touches its opacity. The hero must
 * LOOK settled and lit on the first frame — a wand igniting out of black over a
 * second is the failure this is written to avoid — so the entrance is a figure
 * arriving from slightly back, at full brightness, not a figure materialising.
 *
 * `yaw` is a few degrees, not a spin: enough that the head is still turning as
 * it comes to rest.
 */
export const HERO_INTRO: EntryOffsets = { lift: -0.18, yaw: 0.22, scale: -0.12 }

/**
 * How far back along z the hero starts its push-in, in world units.
 *
 * `EntryOffsets` carries no z term because no other entrance needs one — a rig
 * handing over to another moves within the frame. An arrival from nothing is
 * the one case that reads as depth, and the camera is fixed (z 4.2, fov 38), so
 * this is the only lever that changes the figure's distance rather than its
 * size on screen. Paired with `HERO_INTRO.scale` rather than replacing it:
 * dolly alone at this distance is nearly imperceptible.
 */
export const HERO_INTRO_DOLLY = -0.55

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
  return decay(entry, progress, out)
}

/**
 * The hero's push-in offsets at `progress` (its one-shot intro, 0 to 1),
 * written into `out`. Returns the z dolly separately, since `EntryOffsets` has
 * no z term — see `HERO_INTRO_DOLLY`.
 *
 * Shares `decay` with `entryOffsets` on purpose: there is one arrival curve on
 * this site, and the reason it is linear (the progress feeding it is already
 * damped) applies identically here.
 */
export function introOffsets(progress: number, out: EntryOffsets): number {
  decay(HERO_INTRO, progress, out)
  return HERO_INTRO_DOLLY * (1 - clamp01(progress))
}

function decay(entry: EntryOffsets, progress: number, out: EntryOffsets): EntryOffsets {
  const remaining = 1 - clamp01(progress)
  out.lift = entry.lift * remaining
  out.yaw = entry.yaw * remaining
  out.scale = entry.scale * remaining
  return out
}

/**
 * The hero's exit: it turns, then pushes toward the reader, then dissolves.
 *
 * Driven by `scrollState.smooth.heroExit` — one progress across the hero's own
 * extra height — and by nothing else. That is deliberately not the banned
 * pattern: the rule that killed v1 was a table keyed to fractions of the WHOLE
 * DOCUMENT, where adding a section silently re-timed every animation. This
 * reads one element's own rect, so no other section can reach it.
 *
 * The phases OVERLAP on purpose. Run them end to end and the figure visibly
 * stops between beats, which reads as three animations rather than one exit.
 * The turn is most of the way through before the push begins, and the dissolve
 * starts while the push is still travelling — so what you see is a figure
 * turning away as it comes toward you and going as it arrives.
 */
export type HeroExit = { yaw: number; scale: number; z: number; x: number; dissolve: number }

/** Where each phase starts and ends within the exit, 0..1. */
export const TURN_PHASE = { from: 0, to: 0.55 }
export const PUSH_PHASE = { from: 0.35, to: 1 }
export const DISSOLVE_PHASE = { from: 0.5, to: 1 }

/**
 * How far the figure turns, in radians. NEGATIVE: it turns away from the
 * reader, not toward them.
 *
 * This is what stands in for the cloak wrapping around it. The model is a
 * single mesh with no skeleton and no separable garment — 1 node, 1 material,
 * 0 skins, 0 animations — so nothing about it can actually be wrapped. Turning
 * it away puts the cloak between the reader and the figure, which is the same
 * picture arrived at honestly.
 *
 * The sign was measured, not reasoned. At +1.9 the figure rotated the WRONG
 * way: the station's resting pose is already three-quarters turned, so a
 * positive yaw brought the face round to camera — the opposite of vanishing
 * into a cloak. -1.3 carries the same rest pose through profile and on to the
 * back.
 */
export const HERO_EXIT_YAW = -1.3

/** How much bigger it gets as it pushes in. */
export const HERO_EXIT_SCALE = 0.85

/** How far it travels toward the camera, in world units. The camera sits at z 4.2. */
export const HERO_EXIT_Z = 1.6

/**
 * How far it drifts sideways as it pushes in, in world units, as a FRACTION of
 * wherever the caller says its home is.
 *
 * Desktop stands the figure in the right-hand column (RIGS[''] x = 1.4) with the
 * copy beside it, so a straight push toward the camera grows it into the edge of
 * the frame. Drifting it back toward centre as it grows keeps the whole figure
 * in shot for the whole zoom. Mobile's figure is already centred, so its caller
 * passes 0 and this term does nothing there.
 */
export const HERO_EXIT_X_FRACTION = -0.8

/**
 * The exit that does nothing, for every rig and every layout that has none.
 * Frozen and shared: this is read in a frame loop and must not allocate.
 */
export const NO_EXIT: Readonly<HeroExit> = Object.freeze({
  yaw: 0,
  scale: 0,
  z: 0,
  x: 0,
  dissolve: 0,
})

/** Pure: 0 before a phase, 1 after it, linear across it. */
function phase(p: number, span: { from: number; to: number }): number {
  const t = (p - span.from) / (span.to - span.from)
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/**
 * Pure: the hero's exit offsets at progress `p`.
 *
 * Every term is 0 at p = 0, so a hero with no room to play the sequence — the
 * desktop layout, or a short phone — is left exactly as it was. The caller adds
 * these to the station's own pose rather than replacing it.
 */
export function heroExit(p: number, homeX = 0): HeroExit {
  const turn = phase(p, TURN_PHASE)
  const push = phase(p, PUSH_PHASE)
  return {
    yaw: HERO_EXIT_YAW * turn,
    scale: HERO_EXIT_SCALE * push,
    z: HERO_EXIT_Z * push,
    // Relative to where the figure actually stands, so a layout that centres it
    // gets no drift at all rather than a hard-coded shove.
    x: homeX * HERO_EXIT_X_FRACTION * push,
    dissolve: phase(p, DISSOLVE_PHASE),
  }
}
