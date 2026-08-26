/**
 * Measured scroll spans for every pinned 3D station — the single place the
 * choreography and the camera agree on where a chapter starts and stops.
 *
 * Each entry is [entry, hold]:
 *   entry — the measured top of the section, where the camera begins arriving
 *   hold  — the camera's "held" keyframe, where it settles and stops moving
 *
 * `localProgress` runs 0→1 across [entry, hold], NOT across the whole section. That
 * distinction is the whole point of this file. Previously the spans ran to the *next*
 * section's top, so a station's payoff beats were scheduled for scroll positions the
 * camera had already flown past: the Tracker's save/answer/insight beats all played at
 * x≈12 while the camera framed the Map at x=22, and on phones the Marauder's Map never
 * reached its lock threshold at all. Ending the span at the hold key means every beat
 * is authored inside the window the camera is actually looking, and each station simply
 * holds its final state while the camera departs.
 *
 * Stations stay *rendered* past `hold` — see stationVisibility.ts, whose margin covers
 * the whip-pan — so ending the span early costs nothing visually.
 *
 * Regenerate after ANY change to the number or height of chapters:
 *   node scripts/measure.mjs          # desktop, 1440×900
 *   PORT=5173 node tools/measure_mobile.mjs   # portrait, 390×844
 * Measured 2026-08-26 for the nine-chapter page (Conjuring removed).
 */

export type StationName = 'pact' | 'tracker' | 'map'
export type Span = readonly [entry: number, hold: number]

/** 1440×900. Section tops from scripts/measure.mjs; holds sit ~65% into each span. */
export const DESKTOP_SPANS: Record<StationName, Span> = {
  pact: [0.359, 0.455],
  tracker: [0.507, 0.622],
  map: [0.684, 0.799],
}

/**
 * 390×844 portrait. The pinned sections collapse to natural height on phones, so
 * these are genuinely different fractions — not the desktop numbers scaled. Leaving
 * them un-branched is what previously stranded the mobile choreography.
 */
export const MOBILE_SPANS: Record<StationName, Span> = {
  pact: [0.378, 0.457],
  tracker: [0.499, 0.587],
  map: [0.634, 0.719],
}

/**
 * Matches the gate used by CameraRig and Scene. Evaluated once at import, like the
 * camera track it must agree with — a mid-session resize past the breakpoint would
 * otherwise desync the spans from the keys it is paired with.
 */
export const isPhoneViewport =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720)

export function spanFor(name: StationName): Span {
  return isPhoneViewport ? MOBILE_SPANS[name] : DESKTOP_SPANS[name]
}
