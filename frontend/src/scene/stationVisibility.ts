/**
 * Station render-visibility gate.
 *
 * Each scroll-station (Spell/Pact/Tracker/Map) used to render only inside its own
 * clamped local span (`lp > 0.001 && lp < 0.999`). Because the camera *leaves* a
 * station (its "held" keyframe) well before that station's span ends and *arrives*
 * at the next one before its span begins, the long lateral whip-pans between
 * far-apart stations crossed a moment where the previous station had already
 * popped out and the next hadn't popped in yet — a black "dead zone".
 *
 * Gating visibility on the section span PLUS a scroll-fraction margin keeps the
 * departing station rendered as it recedes and brings the arriving one in early,
 * so the transition reads as a continuous pan through the hall instead of two
 * pops into/out of nothing. The animation timing still uses the clamped
 * `localProgress`, so only what's drawn changes — not how anything animates.
 */
export const VISIBLE_MARGIN = 0.07

export function visibleInSpan(
  progress: number,
  start: number,
  end: number,
  margin = VISIBLE_MARGIN,
): boolean {
  return progress > start - margin && progress < end + margin
}
