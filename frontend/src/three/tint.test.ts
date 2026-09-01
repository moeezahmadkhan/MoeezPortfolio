import { describe, expect, it } from 'vitest'
import { SECTION_ORDER, sectionTint } from './tint'

describe('sectionTint', () => {
  it('gives every nav section a tint', () => {
    for (const id of ['', 'about', 'work', 'skills', 'experience', 'contact']) {
      const tint = sectionTint(id)
      expect(tint).toHaveLength(3)
      expect(tint.every((c) => c >= 0 && c <= 1)).toBe(true)
    }
  })

  it('warms the hero and cools the deeper sections', () => {
    const hero = sectionTint('')
    const experience = sectionTint('experience')
    expect(hero[0]).toBeGreaterThan(experience[0])
  })

  it('never returns the reserved chat teal', () => {
    // teal #5fd3c6 has a green channel far above its red channel; no backdrop tint may.
    for (const id of ['', 'about', 'work', 'skills', 'experience', 'contact']) {
      const [r, g] = sectionTint(id)
      expect(g).toBeLessThanOrEqual(r)
    }
  })

  it('separates every neighbouring pair enough to be seen', () => {
    // On mobile there is no model below the hero any more (rigs.ts's mobile
    // gate), so this colour IS the section-to-section signal. The old table was
    // a pure brightness ramp stepping 0.04 between work and skills — a
    // difference nobody sees on a phone at half brightness, drawn over ~500ms
    // by BACKDROP_TINT_LAMBDA. Distance is measured in the same linear RGB the
    // shader multiplies by, which is what the eye actually receives here.
    const MIN_SEPARATION = 0.1
    for (let i = 1; i < SECTION_ORDER.length; i++) {
      const a = sectionTint(SECTION_ORDER[i - 1])
      const b = sectionTint(SECTION_ORDER[i])
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      expect([SECTION_ORDER[i - 1], SECTION_ORDER[i], distance >= MIN_SEPARATION]).toEqual([
        SECTION_ORDER[i - 1],
        SECTION_ORDER[i],
        true,
      ])
    }
  })

  it('lists every nav section in page order, so the separation check covers them all', () => {
    expect(SECTION_ORDER).toEqual(['', 'about', 'work', 'skills', 'experience', 'contact'])
  })
})
