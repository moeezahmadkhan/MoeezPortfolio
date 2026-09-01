/**
 * Backdrop colour per section. Gold and ink only — teal is reserved for the chat
 * surface, so "the machine is speaking" stays a distinct signal.
 *
 * These used to be a single monotonic brightness ramp, darkening 0.55 → 0.20
 * down the page. That reads on a desktop where a different model presides over
 * each section anyway — but on mobile the model gate (rigs.ts) leaves the hero
 * as the only rig, so this colour is now the *only* signal that the section
 * changed, and neighbouring steps of 0.04 drawn over half a second are not a
 * signal anyone perceives on a phone.
 *
 * So the table alternates instead of ramping: each section differs from the one
 * before it in hue as well as level, and the page breathes warm → cool → warm
 * on the way down rather than fading uniformly out. The overall arc still holds
 * (the hero is the warmest thing on the site, experience the deepest ink); it
 * is the neighbour-to-neighbour distance that had to grow. `tint.test.ts`
 * asserts that distance, so a future re-tune cannot quietly flatten it again.
 */
const TINTS: Record<string, [number, number, number]> = {
  '': [0.58, 0.44, 0.22], // hero — the warmest thing on the site
  about: [0.44, 0.34, 0.2], // still lit, a step back from the hero
  work: [0.3, 0.26, 0.2], // cooler and greyer: the cards carry this section
  skills: [0.4, 0.29, 0.15], // back toward amber at a lower level
  experience: [0.24, 0.2, 0.15], // deepest ink
  contact: [0.46, 0.34, 0.18], // warms again to close
}

/**
 * The sections in page order. Exported so the neighbour-separation test walks
 * the same sequence a visitor scrolls through, rather than restating it.
 */
export const SECTION_ORDER: readonly string[] = Object.keys(TINTS)

export function sectionTint(id: string): [number, number, number] {
  return TINTS[id] ?? TINTS['']
}
