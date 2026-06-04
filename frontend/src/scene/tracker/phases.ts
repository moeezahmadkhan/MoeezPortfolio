import * as THREE from 'three'

/**
 * World placement of the whole tracker station, offset from the wizard at the
 * origin so the camera physically travels to a separate "scanner" space.
 */
export const STATION: [number, number, number] = [12, 0, 0]

/** Local-space anchors (relative to the station group). */
export const WRIST_ANCHOR: [number, number, number] = [0.5, 0.3, 0.4]
export const DATASTORE_POS: [number, number, number] = [2.0, 0.9, 0]
export const AICORE_POS: [number, number, number] = [0, 2.4, 0]

/**
 * Scroll fractions spanning the pinned #tracker section. CALIBRATE in Step 2
 * from measured DOM offsets; keep in sync with the #tracker CameraRig KEYS.
 */
export const SECTION_START = 0.705
export const SECTION_END = 0.857

/** Maps global scroll progress (0→1 across the page) to 0→1 local progress within the tracker section. */
export function localProgress(progress: number) {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Eased 0→1 ramp of t across [start,end]. Requires start < end. */
export function ramp(t: number, start: number, end: number) {
  return THREE.MathUtils.smoothstep(t, start, end)
}

/** 0→1→0 bump of t across [start,peak,end]. */
export function pulse(t: number, start: number, peak: number, end: number) {
  if (t <= start || t >= end) return 0
  return t < peak
    ? THREE.MathUtils.smoothstep(t, start, peak)
    : 1 - THREE.MathUtils.smoothstep(t, peak, end)
}
