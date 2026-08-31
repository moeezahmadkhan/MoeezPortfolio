import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { profile } from '../content'

const html = readFileSync('index.html', 'utf8')

/** The one JSON-LD block in the document head, parsed. */
function personSchema(): Record<string, unknown> {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  expect(match, 'index.html must carry a JSON-LD block').not.toBeNull()
  return JSON.parse(match![1])
}

describe('document head', () => {
  it('carries a canonical URL', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/moeezahmadkhan\.com\/" \/>/)
  })

  it('describes a Person, and the schema is valid JSON', () => {
    const schema = personSchema()
    expect(schema['@type']).toBe('Person')
    expect(schema.name).toBe(profile.name)
  })

  // The whole point of `sameAs` is to tell a search engine that this site and
  // that LinkedIn profile are the same person, which is what makes the profile
  // surface for searches of his name. A URL typed here by hand would drift the
  // moment he edits profile.ts, and nothing would report it.
  it('claims every social profile the content module lists, character for character', () => {
    const sameAs = personSchema().sameAs as string[]
    for (const social of profile.socials) {
      // The personal site is already `url`; sameAs is for profiles elsewhere.
      if (social.href.includes('moeezahmadkhan.com')) continue
      expect(sameAs, social.label).toContain(social.href)
    }
  })

  it('points search engines at the sitemap, and the sitemap at the site', () => {
    const robots = readFileSync('public/robots.txt', 'utf8')
    expect(robots).toContain('Sitemap: https://moeezahmadkhan.com/sitemap.xml')
    expect(readFileSync('public/sitemap.xml', 'utf8')).toContain(
      '<loc>https://moeezahmadkhan.com/</loc>',
    )
  })
})
