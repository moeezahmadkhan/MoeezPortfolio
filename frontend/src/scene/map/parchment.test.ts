import { describe, it, expect } from 'vitest'
import { PARCHMENT_SVG, INK_SVG, MAP_VIEWBOX, MAP_MOTTO } from './parchment'

describe('map parchment art', () => {
  it('both layers are SVGs sized to the table aspect', () => {
    for (const svg of [PARCHMENT_SVG, INK_SVG]) {
      expect(svg.trimStart().startsWith('<svg')).toBe(true)
      expect(svg).toContain(`viewBox="${MAP_VIEWBOX}"`)
      expect(svg).toContain('width="700"')
      expect(svg).toContain('height="460"')
    }
  })

  it('ink layer carries the original motto banner', () => {
    expect(INK_SVG).toContain(MAP_MOTTO)
    expect(MAP_MOTTO).toBe('IT KNOWS WHO PASSES')
  })

  it('uses no Warner Bros. Marauder’s Map text (IP guard)', () => {
    const blob = (PARCHMENT_SVG + INK_SVG).toLowerCase()
    for (const term of ['marauder', 'moony', 'wormtail', 'padfoot', 'prongs', 'messrs']) {
      expect(blob).not.toContain(term)
    }
  })
})
