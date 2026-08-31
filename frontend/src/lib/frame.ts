/**
 * Frame-rate independent exponential easing. `lambda` is roughly "how fast",
 * in reciprocal seconds. Using this everywhere means a 144Hz monitor and a
 * 60Hz one show the same motion, which naive `v += (t - v) * 0.1` does not.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current
  return target + (current - target) * Math.exp(-lambda * dt)
}
