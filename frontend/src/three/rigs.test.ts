import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '../components/layout/Nav'
import { SECTION_IDS } from '../components/layout/Nav'
import {
  MOBILE_STATIONS,
  nextRig,
  RIGS,
  rigFor,
  stationFor,
  PINNED_SECTION_ID,
  HERO_RIG_ID,
  HERO_SECTION_ID,
} from './rigs'

describe('rigFor', () => {
  const ids = ['', ...NAV_ITEMS.map((i) => i.id)]

  it('resolves every section id to a RigSpec or null without throwing', () => {
    for (const id of ids) {
      expect(() => rigFor(id)).not.toThrow()
    }
  })

  it('every returned model path starts with /models/ and ends in .glb', () => {
    for (const id of ids) {
      const rig = rigFor(id)
      if (!rig) continue
      expect(rig.model.startsWith('/models/')).toBe(true)
      expect(rig.model.endsWith('.glb')).toBe(true)
    }
  })

  it("maps the hero ('') to the wizard", () => {
    const hero = rigFor('')
    expect(hero).not.toBeNull()
    expect(hero?.model).toBe('/models/wizard_improved.glb')
  })

  it('no two rigs share an id', () => {
    const seen = new Set<string>()
    for (const id of ids) {
      const rig = rigFor(id)
      if (!rig) continue
      expect(seen.has(rig.id)).toBe(false)
      seen.add(rig.id)
    }
  })

  it('leaves an unmapped section without a model on desktop', () => {
    expect(rigFor('about')).toBeNull()
  })
})

describe('nextRig preload order', () => {
  // Guards against the exact drift Finding 4 fixed: a section added to RIGS
  // that the (formerly hand-maintained) preload order silently never reached.
  it('every entry in RIGS is reachable by walking nextRig from the hero', () => {
    const expected = new Set(Object.values(RIGS).map((r) => r.id))
    const reached = new Set<string>()
    let id: string | undefined = RIGS[''].id
    while (id !== undefined) {
      reached.add(id)
      id = nextRig(id)?.id
    }
    expect(reached).toEqual(expected)
  })

  it('returns null for an unrecognised or final rig id', () => {
    expect(nextRig('not-a-real-rig')).toBeNull()
    expect(nextRig(undefined)).toBeNull()
    const all = Object.values(RIGS)
    const last = all[all.length - 1]
    expect(last).toBeDefined()
    expect(nextRig(last?.id)).toBeNull()
  })

  it('names a pinned section that RIGS actually has a rig for', () => {
    // Three files agree on this id: this table, Experience.tsx (which registers
    // the section with the scroll tracker AND renders it as the DOM id), and
    // CharacterRig (which decides whose yaw the scroll drives). Nothing tells
    // you when they stop agreeing — the model just quietly stops turning — so
    // the id is exported from here and asserted to resolve.
    expect(RIGS[PINNED_SECTION_ID]).toBeDefined()
    expect(RIGS[PINNED_SECTION_ID].id).toBe(PINNED_SECTION_ID)
  })
})

describe('the mobile gate', () => {
  // The phone gets the hero's model and nothing else: a 0.2-scale figure parked
  // at z -2.6 behind the copy was never a character on a 390px screen, and it
  // cost a full GLB download over cellular to render a speck. Both the mount
  // (SceneDirector's `rigFor`) and the lookahead prefetch (`nextRig`) route
  // through these two functions, so gating here is what actually stops the
  // download rather than just hiding the result.
  it('keeps the hero on mobile', () => {
    const hero = rigFor('', true)
    expect(hero).not.toBeNull()
    expect(hero?.id).toBe(HERO_RIG_ID)
  })

  it('never names a model other than the hero on mobile', () => {
    // The payload invariant, stated as what it actually is. Mobile used to
    // return null below the hero, which stopped the download AND threw away the
    // figure; it now returns the hero spec for every section so one rig can
    // travel the page. What must not change is the set of files a phone can be
    // asked to fetch: exactly one.
    const heroModel = RIGS[''].model
    for (const id of [...SECTION_IDS, '', 'not-a-section']) {
      expect(rigFor(id, true)?.model).toBe(heroModel)
    }
  })

  it('keeps one rig identity across every section on mobile, so it is never remounted', () => {
    // Load-bearing: SceneDirector bails when the incoming rig's id matches the
    // current one. A changing id here would cross-fade and remount the rig at
    // every section boundary — six dissolves instead of one travelling figure,
    // and a fresh material clone each time.
    const ids = new Set(SECTION_IDS.map((id) => rigFor(id, true)?.id))
    expect(ids).toEqual(new Set([HERO_RIG_ID]))
  })

  it('still mounts every rig on desktop', () => {
    for (const [sectionId, spec] of Object.entries(RIGS)) {
      expect(rigFor(sectionId, false)?.id).toBe(spec.id)
    }
  })

  it('preloads nothing past the hero on mobile', () => {
    // The whole point of the gate: no second or third GLB fetch on a phone.
    for (const spec of Object.values(RIGS)) {
      expect(nextRig(spec.id, true)).toBeNull()
    }
  })

  it('still walks the whole preload chain on desktop', () => {
    expect(nextRig(HERO_RIG_ID, false)).not.toBeNull()
  })
})

describe('mobile stations', () => {
  // Regression guard on the tuning, not on exact numbers: at camera z 4.2 /
  // fov 38 the viewport is ~1.34 world units wide at 390px, and the hero used
  // to sit at scale 0.3 — a figure roughly a tenth of the screen, which read as
  // sparkle dust rather than as a wizard (see .shots/mobile-top.png before that
  // change). Anything below half the desktop scale is back in that territory.
  it('sizes the hero station to read as a figure, not a speck', () => {
    expect(MOBILE_STATIONS[HERO_SECTION_ID].scale).toBeGreaterThan(RIGS[''].scale * 0.4)
  })

  it('stands the hero station at the bottom of the frame, centred', () => {
    // Matches where Stage.css puts the no-WebGL fallback on mobile
    // (`place-items: end center`), so canvas and fallback agree on where the
    // figure is.
    const hero = MOBILE_STATIONS[HERO_SECTION_ID]
    expect(hero.position[0]).toBe(0)
    expect(hero.position[1]).toBeLessThan(0)
  })

  it('gives every observed section a station of its own', () => {
    // A missing row is not an error anywhere — `stationFor` falls back to the
    // hero — so the figure would simply stop moving for that section with
    // nothing to show for it.
    for (const id of SECTION_IDS) {
      expect(MOBILE_STATIONS[id], id).toBeDefined()
    }
  })

  it('falls back to the hero station for the pre-intersection state', () => {
    // useSectionObserver reports '' before it commits anything, and that state
    // IS the hero.
    expect(stationFor('')).toBe(MOBILE_STATIONS[HERO_SECTION_ID])
    expect(stationFor('not-a-section')).toBe(MOBILE_STATIONS[HERO_SECTION_ID])
  })

  it('keeps every station below the hero smaller and dimmer than the hero itself', () => {
    // Below the hero the figure has no reserved strip: it holds a corner while
    // body copy owns the middle, behind .stage__scrim. A station that crept back
    // up toward the hero's size or presence is the drift that puts a lit figure
    // behind a paragraph and moves check:contrast the wrong way.
    const hero = MOBILE_STATIONS[HERO_SECTION_ID]
    for (const [id, station] of Object.entries(MOBILE_STATIONS)) {
      if (id === HERO_SECTION_ID) continue
      expect(station.scale, id).toBeLessThan(hero.scale)
      expect(station.presence, id).toBeLessThan(hero.presence)
    }
  })

  it('leaves the pinned section no station yaw of its own', () => {
    // pinnedYaw already turns that rig from the smoothed pinnedProgress. A
    // station yaw here would be a constant fighting a scroll-driven term.
    expect(MOBILE_STATIONS[PINNED_SECTION_ID].yaw).toBe(0)
  })
})

describe('the hero section id', () => {
  it('resolves the hero rig from the id the observer actually reports', () => {
    // The hero section's DOM id is 'top' (Hero.tsx), and it is observed
    // alongside the nav sections so that scrolling back up is a positive
    // report rather than the absence of one — see useSectionObserver's test.
    // The table still keys the hero on '', the pre-intersection default, so
    // this normalisation is what joins the two.
    expect(rigFor(HERO_SECTION_ID)?.id).toBe(HERO_RIG_ID)
    expect(rigFor(HERO_SECTION_ID, true)?.id).toBe(HERO_RIG_ID)
    expect(rigFor('')?.id).toBe(HERO_RIG_ID)
  })

  it('is the id Hero.tsx actually renders and Nav actually observes', () => {
    expect(SECTION_IDS[0]).toBe(HERO_SECTION_ID)
    expect(SECTION_IDS).toContain('about')
  })
})
