import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '../components/layout/Nav'
import { nextRig, RIGS, rigFor, PINNED_SECTION_ID } from './rigs'

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

  it('every rig defines a desktop and mobile scale, and mobile is smaller', () => {
    for (const id of ids) {
      const rig = rigFor(id)
      if (!rig) continue
      expect(typeof rig.scale).toBe('number')
      expect(typeof rig.mobileScale).toBe('number')
      expect(rig.mobileScale).toBeLessThan(rig.scale)
    }
  })

  it('leaves an unmapped section without a model', () => {
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
