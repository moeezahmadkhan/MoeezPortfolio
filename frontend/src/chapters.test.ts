import { describe, it, expect } from 'vitest'
import { chapters, numeralFor } from './chapters'

describe('chapters', () => {
  it('lists all ten chapters in scroll order including The Pact and the Marauder\'s Map', () => {
    expect(chapters.map((c) => c.id)).toEqual([
      'top', 'wizard', 'spells', 'pact',
      'tracker', 'map', 'chronicles', 'grimoire', 'owlpost',
    ])
  })
  it('numbers them sequentially I→IX', () => {
    expect(chapters.map((c) => c.numeral)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
    ])
  })
  it('has ascending, in-range at fractions', () => {
    for (let i = 0; i < chapters.length; i++) {
      expect(chapters[i].at).toBeGreaterThanOrEqual(0)
      expect(chapters[i].at).toBeLessThanOrEqual(1)
      if (i > 0) expect(chapters[i].at).toBeGreaterThan(chapters[i - 1].at)
    }
  })
})

describe('numeralFor', () => {
  it('returns the numeral that the rail shows for that chapter', () => {
    expect(numeralFor('top')).toBe('I')
    expect(numeralFor('pact')).toBe('IV')
    expect(numeralFor('owlpost')).toBe(chapters[chapters.length - 1].numeral)
  })

  it('throws on an unknown id rather than rendering a wrong number', () => {
    expect(() => numeralFor('conjuring')).toThrow(/unknown chapter id/)
  })
})
