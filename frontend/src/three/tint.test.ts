import { describe, expect, it } from 'vitest'
import { sectionTint } from './tint'

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
})
