/**
 * Pure scroll geometry — no DOM, no Lenis. All inputs are plain numbers so this
 * is fully unit-testable (see scrollMath.test.ts). `tops` is always the ascending
 * list of section top offsets in document pixels.
 */

/** Index of the section occupying `anchorY` (e.g. viewport-center in doc px). */
export function activeIndex(anchorY: number, tops: number[]): number {
  if (tops.length === 0) return 0
  let idx = 0
  for (let i = 0; i < tops.length; i++) {
    if (anchorY >= tops[i]) idx = i
    else break
  }
  return idx
}

/**
 * Nearest section top to settle onto, or null if none is worth settling to.
 * `magnetPx` is the half-width of the magnet zone; `deadzonePx` suppresses
 * re-triggering when we're already on a boundary.
 */
export function settleTarget(
  scrollY: number,
  tops: number[],
  magnetPx: number,
  deadzonePx = 2,
): number | null {
  let best: number | null = null
  let bestDist = Infinity
  for (const top of tops) {
    const d = Math.abs(top - scrollY)
    // strict < keeps tie-breaks at the lower boundary (ascending tops assumed)
    if (d < bestDist) {
      bestDist = d
      best = top
    }
  }
  if (best === null) return null
  if (bestDist <= deadzonePx) return null // already there
  if (bestDist > magnetPx) return null // too far → leave it free
  return best
}

/**
 * Whether to show the "next section" cue and which index is next.
 * Active when the next boundary below the current scroll is within `thresholdPx`.
 */
export function nextCue(
  scrollY: number,
  tops: number[],
  thresholdPx: number,
  epsilonPx = 4,
): { active: boolean; nextIndex: number | null } {
  let nextIndex: number | null = null
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] > scrollY + epsilonPx) {
      nextIndex = i
      break
    }
  }
  if (nextIndex === null) return { active: false, nextIndex: null }
  const dist = tops[nextIndex] - scrollY
  return { active: dist <= thresholdPx, nextIndex }
}
