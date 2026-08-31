import { describe, expect, it } from 'vitest'
import { experience, profile, projects, skills } from './index'

const PLACEHOLDER = /\b(tbd|todo|lorem|xxx|placeholder|coming soon)\b/i

describe('content', () => {
  it('has a complete profile', () => {
    expect(profile.name).toBe('Moeez Ahmad Khan')
    expect(profile.thesis.length).toBeGreaterThan(20)
    expect(profile.email).toMatch(/@/)
    expect(profile.stats.length).toBeGreaterThanOrEqual(3)
    expect(profile.socials.every((s) => s.href.startsWith('https://'))).toBe(true)
  })

  it('has at least three featured projects, each fully described', () => {
    const featured = projects.filter((p) => p.featured)
    expect(featured.length).toBeGreaterThanOrEqual(3)
    for (const p of featured) {
      expect(p.name).not.toBe('')
      expect(p.outcome.length).toBeGreaterThan(20)
      expect(p.detail.length).toBeGreaterThanOrEqual(2)
      expect(p.stack.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('uses unique slugs', () => {
    const slugs = projects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('links absolutely or not at all', () => {
    for (const p of projects) {
      for (const href of Object.values(p.links ?? {})) {
        expect(href).toMatch(/^https:\/\//)
      }
    }
  })

  it('contains no placeholder copy anywhere', () => {
    const blob = JSON.stringify({ profile, projects, skills, experience })
    expect(blob).not.toMatch(PLACEHOLDER)
  })

  it('describes every role with real bullets', () => {
    expect(experience.length).toBeGreaterThanOrEqual(3)
    for (const role of experience) {
      expect(role.bullets.length).toBeGreaterThanOrEqual(2)
      expect(role.org).not.toBe('')
    }
  })

  it('groups skills without empty groups', () => {
    expect(skills.length).toBeGreaterThanOrEqual(3)
    expect(skills.every((g) => g.items.length > 0)).toBe(true)
  })
})
