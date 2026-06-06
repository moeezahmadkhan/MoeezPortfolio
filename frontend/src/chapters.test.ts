import { describe, it, expect } from 'vitest'
import { chapters } from './chapters'

describe('chapters', () => {
  it('lists all ten chapters in scroll order including The Pact and the Marauder\'s Map', () => {
    expect(chapters.map((c) => c.id)).toEqual([
      'top', 'wizard', 'spells', 'conjuring', 'grimoire',
      'pact', 'tracker', 'map', 'chronicles', 'owlpost',
    ])
  })
  it('numbers them sequentially I→X', () => {
    expect(chapters.map((c) => c.numeral)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
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
