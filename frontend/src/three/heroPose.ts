export const MAX_TILT = 0.18 // radians — beyond this the model reads as spinning, not reacting

export type Pose = { yaw: number; pitch: number; lift: number; opacity: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Pure target pose for a given pointer position and hero visibility. */
export function heroPose(pointerX: number, pointerY: number, heroVisible: number): Pose {
  return {
    yaw: clamp(pointerX * MAX_TILT, -MAX_TILT, MAX_TILT),
    pitch: clamp(-pointerY * MAX_TILT * 0.6, -MAX_TILT, MAX_TILT),
    // As the hero scrolls away the figure drifts up and out rather than clipping.
    lift: (1 - heroVisible) * 1.6,
    opacity: heroVisible,
  }
}
