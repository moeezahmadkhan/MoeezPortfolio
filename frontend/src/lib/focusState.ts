/**
 * What the visitor is currently pointing at or has focused. Written by DOM event
 * handlers, read inside useFrame. A singleton for the same reason scrollState is
 * one: hovering a card must not re-render the canvas tree.
 *
 * `source` matters because keyboard focus should not be cleared by an unrelated
 * pointer leave — a keyboard user tabbing through cards would otherwise flicker.
 */
export const focusState = {
  projectSlug: null as string | null,
  source: null as 'pointer' | 'keyboard' | null,
}

export function setProjectFocus(slug: string, source: 'pointer' | 'keyboard'): void {
  focusState.projectSlug = slug
  focusState.source = source
}

export function clearProjectFocus(slug?: string): void {
  // Only clear if the caller owns the current focus, so a pointerleave on one card
  // cannot wipe the keyboard focus that has since moved to another.
  if (slug && focusState.projectSlug !== slug) return
  focusState.projectSlug = null
  focusState.source = null
}
