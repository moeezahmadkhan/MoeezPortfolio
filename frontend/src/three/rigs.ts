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
 * nothing else, which is the whole reason the v1 station system was deleted.
 *
 * Sections absent from this table simply have no model; the hero rig (`''`) is
 * the pre-intersection default, i.e. what shows before the observer has reported
 * anything.
 *
 * Hero position/scale are HeroWizard's original tuned constants, carried over
 * verbatim (see CharacterRig) — not to be adjusted here. Work and Experience were
 * tuned against `.shots/desktop-work.png`, `.shots/desktop-experience.png`, and
 * their mobile counterparts.
 */
const RIGS: Record<string, RigSpec> = {
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
