import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Vercel serves everything in `public/` with `max-age=0, must-revalidate` by
 * default — measured on the live site, and it applied even to Vite's
 * content-hashed `/assets/*`. That means every repeat visitor revalidates the
 * whole payload: ~1 MB of three.js, an 849 kB model, and a 527 kB Basis
 * transcoder, none of which had changed.
 *
 * These rules are the fix, so they are worth a test — a caching regression is
 * invisible locally and only shows up as a slow site for returning visitors.
 */
const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

function cacheControlFor(source: string): string {
  const rule = config.headers.find((h) => h.source === source)
  expect(rule, `no rule for ${source}`).toBeDefined()
  const header = rule!.headers.find((h) => h.key.toLowerCase() === 'cache-control')
  expect(header, `no Cache-Control for ${source}`).toBeDefined()
  return header!.value
}

describe('vercel cache headers', () => {
  it('caches the fingerprinted bundles forever', () => {
    // Vite puts a content hash in these filenames, so the URL changes whenever
    // the bytes do. `immutable` is safe here and nowhere else.
    const value = cacheControlFor('/assets/(.*)')
    expect(value).toContain('immutable')
    expect(value).toContain('max-age=31536000')
  })

  it('caches the models and the transcoder hard, but not forever', () => {
    // These filenames carry NO hash. `immutable` would pin a replaced model in
    // visitors' browsers for a year, so this trades a week of hard caching for
    // the ability to swap a model and have it picked up.
    const value = cacheControlFor('/(models|basis|fonts)/(.*)')
    expect(value).not.toContain('immutable')
    expect(value).toContain('stale-while-revalidate')
    const maxAge = Number(/max-age=(\d+)/.exec(value)?.[1])
    expect(maxAge).toBeGreaterThanOrEqual(3600)
    expect(maxAge).toBeLessThanOrEqual(60 * 60 * 24 * 30)
  })

  it('never caches the document itself, so a deploy is visible immediately', () => {
    // index.html carries the hashed asset URLs; caching it would strand a
    // visitor on an old build. Vercel's default (max-age=0) is what we want, so
    // the rule to check is that nothing here overrides it.
    const overridesRoot = config.headers.some(
      (h) => h.source === '/' || h.source === '/(.*)' || h.source === '/index.html',
    )
    expect(overridesRoot).toBe(false)
  })
})
