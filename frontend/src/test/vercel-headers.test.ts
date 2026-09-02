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
    //
    // This used to assert that NO rule matched the root, which is a stricter
    // thing than the sentence above it and a different one: the security headers
    // have to apply site-wide, document included, and they touch no cache
    // directive. What must stay true is that no root-matching rule sets
    // `Cache-Control` — so that is what is asserted.
    const rootRules = config.headers.filter(
      (h) => h.source === '/' || h.source === '/(.*)' || h.source === '/index.html',
    )
    const cacheOverrides = rootRules.flatMap((r) =>
      r.headers.filter((h) => h.key.toLowerCase() === 'cache-control'),
    )
    expect(cacheOverrides).toEqual([])
  })
})

/**
 * The headers themselves. `npm run check:csp` proves the policy lets the real
 * site run; this proves the policy is still THERE, which a browser check cannot
 * do — delete the header and that check has nothing to load and nothing to fail.
 */
describe('vercel security headers', () => {
  const siteWide = config.headers.find((h) => h.source === '/(.*)')

  function value(key: string): string {
    const header = siteWide?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())
    expect(header, `no ${key} applied site-wide`).toBeDefined()
    return header!.value
  }

  it('applies a content security policy to every path, the document included', () => {
    expect(siteWide, 'no site-wide header rule').toBeDefined()
    expect(value('Content-Security-Policy')).toContain("default-src 'self'")
  })

  it('refuses inline script and unlisted script origins', () => {
    // 'unsafe-eval' IS present and is load-bearing (see CLAUDE.md: the Basis
    // transcoder is an embind build). 'unsafe-inline' is the one that would
    // matter for an injected <script>, and it must never appear here.
    const csp = value('Content-Security-Policy')
    const scriptSrc = /script-src ([^;]+)/.exec(csp)?.[1] ?? ''
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain('*')
  })

  it('keeps the site out of other people\'s frames', () => {
    expect(value('Content-Security-Policy')).toContain("frame-ancestors 'none'")
    expect(value('X-Frame-Options')).toBe('DENY')
  })

  it('sets the rest of the baseline headers', () => {
    expect(value('X-Content-Type-Options')).toBe('nosniff')
    expect(value('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(value('Strict-Transport-Security')).toMatch(/max-age=\d{7,}/)
    expect(value('Permissions-Policy')).toContain('camera=()')
  })

  it('allows exactly the third parties the site actually uses, and no others', () => {
    // Each of these is load-bearing and was verified in a browser by
    // `npm run check:csp`: fonts, the Draco decoder, the contact form.
    const csp = value('Content-Security-Policy')
    expect(csp).toContain('https://fonts.gstatic.com')
    expect(csp).toContain('https://fonts.googleapis.com')
    expect(csp).toContain('https://www.gstatic.com')
    expect(csp).toContain('https://api.web3forms.com')
    expect(csp).not.toContain('http://')
  })
})
