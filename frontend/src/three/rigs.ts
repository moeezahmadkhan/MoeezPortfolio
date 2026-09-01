export type RigSpec = {
  id: string
  model: string
  position: [number, number, number]
  scale: number
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
 * Desktop only. A phone resolves every section to the hero row (see `rigFor`)
 * and takes its placement from `MOBILE_STATIONS` below, so these positions and
 * scales are now purely the desktop composition — the `mobilePosition` /
 * `mobileScale` fields this type used to carry were removed rather than left as
 * a second table that could disagree with the stations.
 *
 * Hero position/scale are HeroWizard's original tuned constants, carried over
 * verbatim (see CharacterRig) — not to be adjusted here. Work and Experience
 * were tuned against `.shots/desktop-work.png` and `.shots/desktop-experience.png`.
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
  },
  work: {
    id: 'work',
    model: '/models/spellcaster.glb',
    position: [1.9, 0.72, -0.95],
    scale: 0.78,
  },
  experience: {
    id: 'experience',
    model: '/models/pact_pair.glb',
    position: [1.55, -0.75, -0.9],
    scale: 0.95,
  },
}

/**
 * Where the hero's model stands on mobile for a given section, and how present
 * it is allowed to be while it stands there.
 *
 * This is the mobile equivalent of the desktop rig table above, with one
 * decisive difference: every row wears the SAME model. A phone downloads
 * `wizard_improved.glb` and nothing else (see `rigFor`), so the figure that
 * presides over Work is the figure that presided over the hero, moved. That is
 * the whole reason mobile can have a travelling figure at all without the
 * 2.45MB the work and experience models would cost.
 *
 * Keyed on the section ids `useSectionObserver` reports (`SECTION_IDS` in
 * Nav.tsx), NEVER on scroll fractions — a table keyed on scroll fractions is
 * what got v1 deleted.
 *
 * `presence` is the ceiling on the figure's opacity in that station. Below the
 * hero the figure shares the screen with body copy rather than standing in a
 * reserved strip, so it stays low and to one side at low presence behind
 * `.stage__scrim` — never centred behind a paragraph. The hero's own 0.80 is
 * the value `Stage.css` gives the no-WebGL still at the same width; the canvas
 * and the picture standing in for it must agree.
 *
 * **The offsets are frustum arithmetic, not taste.** The camera is fixed at
 * z 4.2, fov 38, and a 390x844 viewport, so at distance d the frame is
 * `0.6886 * d` tall and `0.318 * d` wide. At z 0 that is 2.89 by 1.34; at
 * z -1.2 it is 3.72 by 1.72, half-width 0.86. The first pass at these stations
 * used x = +/-0.42 believing that was a corner — at these distances it is a
 * fifth of the way off centre, which is why the figure landed squarely on the
 * Skills chips and the Contact copy. Anything edited here must be re-derived
 * against the distance the row actually uses, and then re-shot: `npm run shoot`
 * writes `.shots/mobile-<section>.png` for exactly this.
 *
 * Sides alternate down the page (right, left, right, left, centre) so a section
 * change reads as the figure crossing the screen. That crossing IS the mobile
 * transition — there is no second model to hand over to.
 *
 * `experience` holds `yaw: 0` deliberately. `pinnedYaw` already turns that
 * section's rig from the smoothed `pinnedProgress`; a station yaw there would
 * be a second, constant term fighting a scroll-driven one.
 */
export type Station = {
  position: [number, number, number]
  scale: number
  yaw: number
  presence: number
}

export const MOBILE_STATIONS: Readonly<Record<string, Station>> = {
  // scale 1.15, not the 0.82 this row carried while `--figure-band` was 25svh.
  // The band grew to 38svh and the copy moved up off it; the figure did not
  // grow to follow, so the entrance simply gained 17% of empty screen above the
  // head. At z 0 the frame is 2.89 world units tall, the band is ~1.1 of them,
  // and this bust is about one unit tall per unit of scale — so 1.15 puts the
  // head near the top of the band while staying inside the 1.34-unit width.
  [HERO_SECTION_ID]: { position: [0, -1.25, 0], scale: 1.15, yaw: 0, presence: 0.8 },
  about: { position: [0.52, -1.35, -1.1], scale: 0.68, yaw: -0.45, presence: 0.34 },
  work: { position: [-0.55, -1.4, -1.2], scale: 0.66, yaw: 0.42, presence: 0.32 },
  skills: { position: [0.56, -1.45, -1.3], scale: 0.64, yaw: -0.55, presence: 0.3 },
  experience: { position: [-0.52, -1.35, -1.1], scale: 0.7, yaw: 0, presence: 0.36 },
  contact: { position: [0, -1.3, -1.9], scale: 0.56, yaw: 0.25, presence: 0.24 },
}

/**
 * The station for a section, falling back to the hero's.
 *
 * The fallback is not defensive padding: `useSectionObserver` reports `''`
 * before it has committed anything, and that pre-intersection state IS the
 * hero, exactly as `RIGS`'s `''` key is.
 */
export function stationFor(activeId: string): Station {
  return MOBILE_STATIONS[activeId] ?? MOBILE_STATIONS[HERO_SECTION_ID]
}

/**
 * The rig for a section, or `null` for a section that has none.
 *
 * `mobile` is still the payload gate it always was — a phone gets the hero's
 * model and nothing else — but it no longer gates the figure's *presence*.
 * Returning `null` below the hero left a phone with 7,877px of page and no
 * figure at all; the model was already downloaded and decoded, and we were
 * throwing it away at the first section boundary.
 *
 * So on mobile every section resolves to the hero spec, **including its
 * `spec.id`**. That identity is load-bearing: `SceneDirector` compares the
 * incoming rig's id against the current one and bails when they match, so a
 * stable id means the rig is never cross-faded, never unmounted, and never
 * re-cloned. One mounted rig travels between `MOBILE_STATIONS` for the whole
 * page instead of six rigs dissolving into each other.
 *
 * The download gate is unchanged and is enforced in two places that agree:
 * here, where mobile can only ever name the hero's model, and in `nextRig`,
 * which still refuses to prefetch anything on mobile.
 */
export function rigFor(activeId: string, mobile: boolean = false): RigSpec | null {
  if (mobile) return RIGS['']
  return RIGS[activeId === HERO_SECTION_ID ? '' : activeId] ?? null
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
