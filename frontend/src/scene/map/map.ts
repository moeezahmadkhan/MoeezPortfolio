import * as THREE from 'three'

/** World placement of the whole map station — right of the Tracker [12], so the
 * camera keeps travelling outward before returning for the closing chapters. */
export const STATION: [number, number, number] = [22, 0, 0]

/** Map-table surface height in station-local space (cf. Tracker's RING_FLOOR_Y). */
export const TABLE_Y = -1.2

/** Tilt (radians) of the whole map station toward the camera, so the parchment
 * reads as an unfurled map on an easel rather than a flat floor. The entire
 * station tilts as one unit, keeping footprints, reticle and name-tags coplanar
 * with the table surface (billboards still face the camera). */
export const MAP_TILT = 0.34

/**
 * Scroll fractions spanning the pinned #map section. Recalibrated 2026-06-06 after the
 * Pact chapter was inserted (scripts/measure.mjs): map section ≈ 0.799 → 0.937 at
 * 1440×900. START is padded slightly before the section top (as in the original) so
 * the station is already lit at the entry; the brief overlap with the tracker band is
 * harmless since the two chambers sit far apart (tracker +12, map +22).
 * Keep in sync with the #map CameraRig KEYS.
 */
export const SECTION_START = 0.787
export const SECTION_END = 0.937

/** Global scroll progress (0→1) → 0→1 local progress within the map section. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Clamped 0→1 linear ramp of `now` across [start, start+duration]. */
export function revealProgress(now: number, start: number, duration: number): number {
  if (duration <= 0) return 0
  return THREE.MathUtils.clamp((now - start) / duration, 0, 1)
}

/** Duration of one reveal sweep, in seconds. */
export const REVEAL_DURATION = 2.6

/**
 * Out-of-React reveal state — written by the HTML incantation button, read in
 * useFrame. Same pattern as scrollState/spellState; never lift into useState.
 *   requested → a new "swear" was asked for (consumed by MapStation → startedAt)
 *   active    → the map is currently revealed (false after "Mischief managed")
 *   startedAt → clock time the reveal ramp began (-1 when idle)
 *   progress  → 0→1 reveal ramp, driven each frame
 *   sworn     → true after the first swear
 */
export const revealState = {
  requested: false,
  active: false,
  startedAt: -1,
  progress: 0,
  sworn: false,
}

/** Local-space patrol route position at parameter t (0→1) — a gentle S across the
 * map table (X spread, Z weave) at table height. */
export function walkerPosition(t: number): [number, number, number] {
  const x = THREE.MathUtils.lerp(-2.6, 2.6, t)
  const z = Math.sin(t * Math.PI * 1.5) * 1.1
  return [x, TABLE_Y + 0.03, z]
}

export interface Detection {
  confidence: number // 0→1
  boxScale: number   // loose (1.6) → tight (1.0)
  locked: boolean
}

/** Confidence threshold past which the reticle locks and names resolve. */
export const LOCK_AT = 0.6

/** Detection readout at drive progress `p` (0→1). */
export function detectionAt(p: number): Detection {
  const c = THREE.MathUtils.clamp(p, 0, 1)
  return {
    confidence: c,
    boxScale: THREE.MathUtils.lerp(1.6, 1.0, c),
    locked: c >= LOCK_AT,
  }
}

/** A person the map can reveal — themed, generic (no real/owned data). `at` is the
 * 0→1 patrol-path parameter where this passer-by's name resolves. */
export interface Passerby {
  name: string
  at: number
}

export const PASSERSBY: Passerby[] = [
  { name: 'The Apprentice', at: 0.12 },
  { name: 'The Scribe', at: 0.34 },
  { name: 'The Warden', at: 0.55 },
  { name: 'The Archivist', at: 0.74 },
  { name: 'The Prefect', at: 0.9 },
]

/** Themed pipeline beats shown in the HTML legend. */
export const PIPELINE_BEATS = ['Motion', 'Detect', 'Track', 'Identify', 'Log']

/** Edge-stack chips paired with the beats (the fresh "on-device" angle). */
export const EDGE_STACK = [
  'RV1688 NPU',
  'On-device detection',
  'Re-ID embeddings',
  'Vector match',
  'No cloud',
]
