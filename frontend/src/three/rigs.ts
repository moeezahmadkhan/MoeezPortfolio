export type RigSpec = {
  id: string
  model: string
  position: [number, number, number]
  scale: number
  mobilePosition: [number, number, number]
  mobileScale: number
}

/**
 * Which model presides over which section. Keyed on the section ids
 * `useSectionObserver` reports (the same ids `NAV_ITEMS` exports) — NOT on scroll
 * fractions. Adding or reordering a section requires editing this table and
 * nothing else: both `rigFor` and the preload order below (`nextRig`) are
 * derived from this table alone, which is the whole reason the v1 station
 * system was deleted — there is nowhere else to keep in sync.
 *
 * Sections absent from this table simply have no model; the hero rig (`''`) is
 * the pre-intersection default, i.e. what shows before the observer has reported
 * anything.
 *
 * Hero position/scale are HeroWizard's original tuned constants, carried over
 * verbatim (see CharacterRig) — not to be adjusted here. Work and Experience were
 * tuned against `.shots/desktop-work.png`, `.shots/desktop-experience.png`, and
 * their mobile counterparts.
 *
 * Preload order (see `nextRig`) is this table's own key order, hero first —
 * relies on the JS spec guaranteeing that non-numeric-string object keys
 * enumerate in insertion order. Every key here (`''`, `'work'`, `'experience'`)
 * is non-numeric, so that holds; don't add a purely-numeric-looking key (e.g.
 * `'1'`) without re-checking this, since those sort before string keys instead.
 */
/**
 * The one section whose model turns with the visitor's own scroll rather than
 * only with the pointer (the "pinned moment"). Exported from here, beside the
 * table it must be a key of, because three separate files have to agree on it:
 * this table, `Experience.tsx` (which both registers the section with the
 * scroll tracker and renders it as the DOM id the tracker measures), and
 * `CharacterRig` (which decides whose yaw the scroll drives). If they ever
 * disagree the model simply stops turning, with no error anywhere — so
 * `rigs.test.ts` asserts this resolves to a real rig.
 */
export const PINNED_SECTION_ID = 'experience'

/**
 * The one rig with a continuous "how much of me is still on screen" measure:
 * the hero slides off under the rest of the page rather than being handed over
 * by SceneDirector. Named here, beside the table that defines it, because
 * `motion.ts` and `CharacterRig` both have to agree on which rig that is.
 */
export const HERO_RIG_ID = 'hero'

export const RIGS: Record<string, RigSpec> = {
  '': {
    id: HERO_RIG_ID,
    model: '/models/wizard_improved.glb',
    position: [1.4, -0.21, 0],
    scale: 1.3,
    mobilePosition: [0, -1.21, 0],
    mobileScale: 0.3,
  },
  work: {
    id: 'work',
    model: '/models/spellcaster.glb',
    position: [1.9, 0.72, -0.95],
    scale: 0.78,
    mobilePosition: [0.45, 1.15, -2.6],
    mobileScale: 0.2,
  },
  experience: {
    id: 'experience',
    model: '/models/pact_pair.glb',
    position: [1.55, -0.75, -0.9],
    scale: 0.95,
    mobilePosition: [0.45, 1.15, -2.6],
    mobileScale: 0.2,
  },
}

export function rigFor(activeId: string): RigSpec | null {
  return RIGS[activeId] ?? null
}

/**
 * The rig-bearing sections in on-page order — hero first, then whichever
 * others carry a model, in the order they appear in `RIGS` above. Derived
 * from `RIGS` itself (see the docstring on `RIGS`) rather than restated as a
 * second hand-maintained list, so a section added to `RIGS` is automatically
 * reachable here too — `rigs.test.ts`'s "every rig is reachable from the
 * preload chain" test guards against this drifting back out of sync. Drives
 * lookahead preloading: while a given rig is current, the *next* one in this
 * list is the one worth fetching ahead of time.
 */
const ORDER: RigSpec[] = Object.values(RIGS)

/**
 * Given the id of the rig currently on screen, returns the rig that follows
 * it (worth preloading now) or `null` if there is none — either because
 * `currentRigId` is the last rig in the sequence, or unrecognised.
 */
export function nextRig(currentRigId: string | undefined): RigSpec | null {
  const idx = ORDER.findIndex((r) => r.id === currentRigId)
  if (idx === -1) return null
  return ORDER[idx + 1] ?? null
}
