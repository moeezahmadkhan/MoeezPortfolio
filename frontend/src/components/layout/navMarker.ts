/**
 * The width the marker element is actually laid out at. Its real width comes
 * from scaling this, never from changing the box: `width` is a layout-triggering
 * property and animating it would re-flow the nav on every section crossing.
 */
export const MARKER_BASE_WIDTH = 100

export type MarkerGeometry = { x: number; scaleX: number; visible: boolean }

/**
 * Where the underline should sit, given the active link's own offset box.
 *
 * This replaced a per-link `::after`. Five pseudo-elements that each blink on
 * and off cannot ease between themselves — measured during a scroll, the marker
 * handed over at opacity 1 to 1 in a single frame, five times per pass, at the
 * top of the viewport. One element that moves can.
 *
 * `null` means no section owns the screen, which is the hero. The marker hides
 * rather than parking under the first item, because parking would claim the
 * visitor is somewhere they are not.
 */
export function markerGeometry(
  link: { offsetLeft: number; offsetWidth: number } | null,
): MarkerGeometry {
  if (!link) return { x: 0, scaleX: 1, visible: false }
  // A zero or negative width would collapse the marker and then animate out of
  // a degenerate matrix on the way back. Clamp the input, not the stylesheet.
  const width = Math.max(1, link.offsetWidth)
  return { x: link.offsetLeft, scaleX: width / MARKER_BASE_WIDTH, visible: true }
}

/** The `transform` value for a geometry — transform only, by construction. */
export function markerTransform(geometry: MarkerGeometry): string {
  return `translateX(${geometry.x}px) scaleX(${geometry.scaleX})`
}
