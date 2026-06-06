import * as THREE from 'three'

/**
 * World-space anchor for the Pact station. Only one station is visible at a time
 * (visibility is gated by localProgress), so this may share space with others.
 * Offset to the left of centre (clear of the wizard figurine at the origin, which
 * would otherwise occlude a centre-axis chamber) — sitting between the Spell
 * chamber (−13) and the Tracker (+12) like its lateral siblings.
 */
export const STATION: [number, number, number] = [-7, 0, -1]

/**
 * Pact band in GLOBAL scroll fraction (0→1 down the whole page). Calibrated from
 * scripts/measure.mjs (2026-06-06, page with both Pact + Marauder's Map): pact top
 * ≈ 0.546, tracker top ≈ 0.661. START is nudged slightly before the measured section
 * top so the station isn't gated off at the very entry; END meets the tracker band.
 */
export const SECTION_START = 0.534
export const SECTION_END = 0.661

/** Global progress → local 0→1 within the Pact band. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Beat boundaries in LOCAL progress (0→1 across the pinned runway). */
export const INGEST_END = 0.33
export const LEGILIMENCY_END = 0.66

/** Clamped smoothstep — 0 at/below start, 1 at/above end, eased between. */
function smooth01(x: number, start: number, end: number): number {
  if (end <= start) return x >= end ? 1 : 0
  const t = THREE.MathUtils.clamp((x - start) / (end - start), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Beat 1 — deck flies in and is ingested (0→1 across [0, INGEST_END]). */
export function ingestProgress(lp: number): number {
  return smooth01(lp, 0, INGEST_END)
}

/** Beat 2 — the core reads the deck (0→1 across [INGEST_END, LEGILIMENCY_END]). */
export function analysisProgress(lp: number): number {
  return smooth01(lp, INGEST_END, LEGILIMENCY_END)
}

/** Beat 3 — founder & investor bind (0→1 across [LEGILIMENCY_END, 1]). */
export function pactProgress(lp: number): number {
  return smooth01(lp, LEGILIMENCY_END, 1)
}

/** Final score the readout resolves to. */
export const SCORE_TARGET = 82

/** The single score number, counting up as the analysis beat progresses. */
export function scoreValue(lp: number): number {
  return Math.round(SCORE_TARGET * analysisProgress(lp))
}
