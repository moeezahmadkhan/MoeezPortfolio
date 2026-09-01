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

/**
 * The DOM id of the hero section (`Hero.tsx`), and therefore the id
 * `useSectionObserver` reports while the visitor is up there.
 *
 * The table below keys the hero on `''` — the pre-intersection default, what
 * shows before the observer has said anything — and that stays. This constant
 * is what joins the two, because the hero is now an observed section like any
 * other (see `SECTION_IDS` in Nav.tsx for why it had to become one).
 */
export const HERO_SECTION_ID = 'top'

export const RIGS: Record<string, RigSpec> = {
  '': {
    id: HERO_RIG_ID,
    model: '/models/wizard_improved.glb',
    position: [1.4, -0.21, 0],
    scale: 1.3,
    // Retuned against .shots/mobile-top.png. The old 0.3 put the figure at
    // roughly a tenth of a 390px screen — that shot showed sparkle dust and no
    // wizard at all. The camera is fixed (z 4.2, fov 38), so at 390x844 the
    // frame is ~1.34 world units wide by ~2.89 tall, and this model is a bust
    // about 1 unit tall per unit of scale, centred on its own origin. 0.82
    // therefore fills a bit over a quarter of the screen's height, and
    // y -1.25 stands it on the bottom edge, low enough that the head clears the
    // hero's button row and the crop falls at the chest, as it does on desktop.
    // Centred and bottom-anchored to match where Stage.css puts the no-WebGL
    // fallback at this width (`place-items: end center`), so canvas and
    // fallback agree about where the figure is. Kept at z 0: pushing it forward
    // shrinks the frame it is measured against, and on a portrait screen that
    // makes width, not height, the binding constraint.
    mobilePosition: [0, -1.25, 0],
    mobileScale: 0.82,
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

/**
 * The rig for a section, or `null` for a section that has none.
 *
 * `mobile` is the gate, not a style: a phone gets the hero's model and nothing
 * else. The work and experience rigs were tuned to `mobileScale: 0.2` at
 * `z: -2.6`, which on a 390px screen rendered a speck behind the copy — and
 * cost a whole GLB over cellular to do it. Gating here rather than at the
 * renderer is deliberate: `SceneDirector` reaches both the mount and the
 * lookahead prefetch (`nextRig`) through this table, so a `null` here is what
 * actually stops the download instead of hiding what arrived.
 */
export function rigFor(activeId: string, mobile: boolean = false): RigSpec | null {
  const spec = RIGS[activeId === HERO_SECTION_ID ? '' : activeId] ?? null
  if (!spec) return null
  if (mobile && spec.id !== HERO_RIG_ID) return null
  return spec
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
export function nextRig(
  currentRigId: string | undefined,
  mobile: boolean = false,
): RigSpec | null {
  // On mobile the hero is the only rig that will ever mount (see `rigFor`), so
  // there is nothing ahead worth fetching — returning null here is what keeps
  // the phone's download at one model rather than three.
  if (mobile) return null
  const idx = ORDER.findIndex((r) => r.id === currentRigId)
  if (idx === -1) return null
  return ORDER[idx + 1] ?? null
}
