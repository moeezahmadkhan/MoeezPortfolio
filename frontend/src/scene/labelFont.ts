/**
 * Shared typeface for every in-scene floating label (orb stages, map name-tags,
 * pact roles). drei's <Text> (troika) ignores the page's CSS @font-face, so it
 * would otherwise fall back to default sans — clashing with the wizarding
 * inscriptional look. This is the same Cinzel used by `--font-display` in the
 * HTML chapters, so the 3D labels read as one family with the rest of the site.
 */
export const LABEL_FONT = '/fonts/Cinzel-SemiBold.ttf'
