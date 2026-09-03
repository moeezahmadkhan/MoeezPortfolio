import { damp } from '../lib/frame'
import { HERO_RIG_ID } from './rigs'

/**
 * The site's motion signature: every easing rate the frame loop uses, in one
 * place, in reciprocal seconds (see `damp`). These lived as bare literals
 * inside `CharacterRig`'s frame body until three separate features needed the
 * same numbers; naming them here is what keeps the rig, the pinned turn and
 * the chat dock's pointer moving at one speed instead of three.
 *
 * `SCROLL_LAMBDA` and `MAX_FRAME_DT` deliberately do NOT live here. They govern
 * the scroll *signal* rather than anything drawn: they are consumed by
 * `lib/scrollState.ts`'s own rAF loop, which knows nothing about three.js and
 * must not — the smoothed channel exists for DOM consumers too. Importing them
 * from `three/` would point the dependency the wrong way round.
 */

/** How fast a rig's own cross-fade chases SceneDirector's fadeIn/fadeOut. */
export const FADE_LAMBDA = 4

/** How fast the rig's yaw and pitch settle onto their target rotation. */
export const TURN_LAMBDA = 2.6

/**
 * How fast the rig's pitch settles. Deliberately slower than TURN_LAMBDA so the
 * head leads and the body follows, instead of the whole figure turning as one
 * rigid piece.
 */
export const PITCH_LAMBDA = 2.0

/** How fast the rig's vertical position settles — slower than the turn, so the figure never bobs. */
export const LIFT_LAMBDA = 2.2

/**
 * How fast the mobile rig travels between two of `rigs.ts`'s `MOBILE_STATIONS`.
 *
 * Deliberately the slowest thing that moves the figure — slower than
 * `LIFT_LAMBDA`, which settles a pose. This is not a settle: it is one figure
 * crossing the screen from one corner to another as a section hands over, and
 * at `LIFT_LAMBDA` it arrived before the section it belonged to had finished
 * scrolling into place, which reads as a snap rather than as a journey.
 */
export const STATION_LAMBDA = 1.5

/**
 * How fast the hero's opening push-in settles.
 *
 * Slower than `STATION_LAMBDA` because it runs exactly once, on the first
 * screen a visitor ever sees, and it is the only motion on the page at that
 * moment — nothing else is competing for the eye, so it can afford the time.
 */
export const INTRO_LAMBDA = 1.2

/** How fast a released drag-orbit unwinds back to the rig's resting yaw. */
export const ORBIT_RETURN_LAMBDA = 1.4

/**
 * How fast a released flick's velocity bleeds away.
 *
 * Slower than ORBIT_RETURN_LAMBDA on purpose: the return spring and the
 * friction run at the same time, and if friction were the faster of the two the
 * velocity would be spent before it had moved anything — which is exactly the
 * behaviour momentum was added to replace.
 */
export const ORBIT_FRICTION_LAMBDA = 2.2

/** How fast the wand light's brightness follows a change of mood. */
export const INTENSITY_LAMBDA = 3

/**
 * How fast the backdrop's noise field drifts toward the page's scroll position.
 * Slower than the scroll channel that feeds it (SCROLL_LAMBDA = 6) on purpose:
 * the ground behind the figure should read as weather that the page disturbs,
 * not as a second scrollbar tracking it.
 */
export const BACKDROP_SCROLL_LAMBDA = 3

/** How fast the backdrop crosses from one section's tint to the next. Slowest
 *  thing on the site — a colour that changes at a rate you can name reads as a
 *  transition rather than as a mood. */
export const BACKDROP_TINT_LAMBDA = 2

/**
 * The shape of `scrollState` that motion is allowed to read: both the raw
 * channel and the smoothed one, so this module — not each call site — decides
 * which of the two anything animated is entitled to look at.
 */
export type ScrollChannels = {
  heroVisible: number
  /** 0..1 across the hero's own extra height; drives the exit sequence. */
  heroExit: number
  progress: number
  pinnedProgress: number
  smooth: { heroVisible: number; heroExit: number; progress: number; pinnedProgress: number }
}

/** One frame of a rig's own cross-fade, toward present (1) or gone (0). */
export function advanceFade(fade: number, fadeIn: boolean, dt: number): number {
  return damp(fade, fadeIn ? 1 : 0, FADE_LAMBDA, dt)
}

/**
 * How visible a rig is this frame: its own cross-fade scaled by how much of its
 * section is still on screen.
 *
 * Only the hero has a continuous section measure — it slides off under the rest
 * of the page, so it is half-gone for a whole screen of scrolling. Every other
 * rig's section either owns the screen or does not, and SceneDirector's
 * cross-fade already covers the handover, so they are simply fully present once
 * faded in.
 *
 * The hero's measure is read from the **smoothed** channel, never the raw one.
 * A wheel notch lands the raw value on its new number in a single frame, and
 * this one number drives the body's material opacity, the wand light and the
 * sparkle cloud together — so reading raw here made all three step at once
 * while the rotation and lift beside them glided (D1).
 *
 * `atHeroStation` is what keeps that measure from destroying the mobile
 * stations. On mobile the hero rig no longer belongs to the hero alone — it
 * stays mounted and travels the whole page (see `rigs.ts`'s `rigFor`), and
 * `heroVisible` decays to zero one screen below the top. Applied unconditionally
 * it would fade the figure out at precisely the moment it should be setting off
 * for the About station. So the measure applies only while the hero station is
 * the one that owns the screen; past that, the rig's own cross-fade is the
 * whole answer and the station's `presence` (applied in `rigPose`) decides how
 * far forward it stands.
 *
 * Desktop passes `true` — it has no stations, its hero rig only ever presides
 * over the hero, and it is unchanged by all of this.
 */
export function rigVisibility(
  rigId: string,
  fade: number,
  scroll: ScrollChannels,
  atHeroStation: boolean = true,
): number {
  const sectionVisible = rigId === HERO_RIG_ID && atHeroStation ? scroll.smooth.heroVisible : 1
  return fade * sectionVisible
}
