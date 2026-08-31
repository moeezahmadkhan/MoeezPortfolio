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
export const RIGS: Record<string, RigSpec> = {
  '': {
    id: 'hero',
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
    mobilePosition: [0.85, 1.55, -2.6],
    mobileScale: 0.2,
  },
  experience: {
    id: 'experience',
    model: '/models/pact_pair.glb',
    position: [1.55, -0.75, -0.9],
    scale: 0.95,
    mobilePosition: [0.85, 1.55, -2.6],
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
