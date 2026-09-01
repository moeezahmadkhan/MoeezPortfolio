import { isCoarsePointer } from '../lib/media'
import { useMatchMedia } from '../lib/useMatchMedia'

/**
 * The single source of truth, on the JS side, for the width at which the hero
 * layout gains its reserved right column — must match Hero.css's own
 * `@media (min-width: 900px)`.
 */
export const DESKTOP_COLUMN_QUERY = '(min-width: 900px)'

/**
 * How far the device-pixel-ratio is allowed to climb, per viewport.
 *
 * Desktop's 1.5 is a measured performance budget (see task-6-7-report.md), not
 * the usual [1, 2]. Mobile is pinned at 1: at 390x844 the difference between 1
 * and 1.5 is 585x1266 versus 390x844 pixels — 2.25x the fill — for a noise
 * field and one figure standing behind body copy.
 */
export const DPR_CEILING = 1.5
export const DPR_CEILING_MOBILE = 1

/**
 * The ratio to render at: whichever is smaller, what the display actually has
 * or what this viewport's budget allows.
 *
 * The `Math.min` is the whole point, and it was missing. R3F's `dpr` prop takes
 * a value, not a cap, so passing a bare 1.5 made every dpr-1 display render at
 * 1.5 and downsample — measured on the built site as a 2160x1350 backing store
 * inside a 1440x900 dpr-1 viewport, 2.25x the fill rate for pixels the monitor
 * cannot show. Ordinary external monitors are dpr 1; this was the common case,
 * not the edge one.
 *
 * The floor exists because `devicePixelRatio` is 0 in some embedded webviews
 * and can arrive as NaN from a stubbed `window`; either would size the backing
 * store to nothing.
 */
export function stageDpr(devicePixelRatio: number, mobile: boolean): number {
  const ceiling = mobile ? DPR_CEILING_MOBILE : DPR_CEILING
  const reported = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.min(Math.max(reported, 1), ceiling)
}

/**
 * Whether the stage is running in its mobile shape.
 *
 * Two questions in one, deliberately: a phone (coarse pointer) and a desktop
 * window narrowed past the hero's column breakpoint both get the mobile
 * treatment, because in both cases there is no reserved column to stand a
 * figure in. Reactive via `useMatchMedia`, which re-renders only on an actual
 * breakpoint crossing, so a resize follows the CSS live instead of freezing
 * whatever was true at mount.
 *
 * Hoisted out of `CharacterRig`, where this expression used to be evaluated
 * once per mounted rig. It now decides three separate things — which rigs
 * exist at all (`rigs.ts`'s gate), where the hero stands, and which way a
 * dissolving rig drifts — and those must not be able to disagree with each
 * other. One hook, called once in `Stage`, passed down.
 */
export function useIsMobileStage(): boolean {
  const hasDesktopColumn = useMatchMedia(DESKTOP_COLUMN_QUERY)
  return isCoarsePointer() || !hasDesktopColumn
}
