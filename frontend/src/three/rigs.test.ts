import { describe, expect, it } from 'vitest'
import { NAV_ITEMS } from '../components/layout/Nav'
import { rigFor } from './rigs'

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
