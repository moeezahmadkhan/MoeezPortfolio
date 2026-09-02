import { describe, it, expect } from 'vitest'
import {
  clientIp,
  isAllowedOrigin,
  isLoopbackOrigin,
  parseAllowedOrigins,
  PRODUCTION_ORIGINS,
} from './request'

describe('clientIp', () => {
  it('prefers x-vercel-forwarded-for, which the platform sets and a client cannot forge', () => {
    expect(
      clientIp({ 'x-vercel-forwarded-for': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }),
    ).toBe('9.9.9.9')
  })

  it('falls back to x-real-ip when the vercel header is absent', () => {
    expect(clientIp({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' })).toBe('9.9.9.9')
  })

  it('takes the LAST x-forwarded-for entry, the one the edge appended', () => {
    // A visitor who sends their own X-Forwarded-For lands in the FIRST position;
    // the real address is whatever the proxy appended after it. Reading [0] is
    // the bug this function exists to close.
    expect(clientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.9' })).toBe('203.0.113.9')
  })

  it('reads a single-entry x-forwarded-for unchanged', () => {
    expect(clientIp({ 'x-forwarded-for': '203.0.113.9' })).toBe('203.0.113.9')
  })

  it('handles a header delivered as an array', () => {
    expect(clientIp({ 'x-forwarded-for': ['1.1.1.1, 203.0.113.9'] })).toBe('203.0.113.9')
  })

  it('returns a constant when no address header is present, so every such caller shares one bucket', () => {
    expect(clientIp({})).toBe('unknown')
    expect(clientIp({ 'x-forwarded-for': '  ,  ' })).toBe('unknown')
  })
})

describe('isAllowedOrigin', () => {
  it('allows the production site', () => {
    expect(isAllowedOrigin('https://moeezahmadkhan.com')).toBe(true)
    expect(isAllowedOrigin('https://www.moeezahmadkhan.com')).toBe(true)
  })

  it('rejects a missing Origin, which is what a scripted caller sends', () => {
    // Browsers set Origin on every POST. curl does not.
    expect(isAllowedOrigin(undefined)).toBe(false)
    expect(isAllowedOrigin('')).toBe(false)
  })

  it('rejects another site', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
  })

  it('rejects a lookalike that merely starts or ends with the real host', () => {
    expect(isAllowedOrigin('https://moeezahmadkhan.com.evil.example')).toBe(false)
    expect(isAllowedOrigin('https://notmoeezahmadkhan.com')).toBe(false)
    expect(isAllowedOrigin('https://moeezahmadkhan.com.evil.example/')).toBe(false)
  })

  it('rejects the http scheme of an allowed host', () => {
    expect(isAllowedOrigin('http://moeezahmadkhan.com')).toBe(false)
  })

  it('does not allow localhost in production, only when explicitly passed in', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(false)
    expect(isAllowedOrigin('http://localhost:5173', ['http://localhost:5173'])).toBe(true)
  })

  it('allows an extra origin supplied by configuration, for preview deployments', () => {
    expect(isAllowedOrigin('https://preview-abc.vercel.app', ['https://preview-abc.vercel.app'])).toBe(true)
    // and only that one — configuring a preview must not open every Vercel project
    expect(isAllowedOrigin('https://someone-else.vercel.app', ['https://preview-abc.vercel.app'])).toBe(false)
  })

  it('keeps the production list to https origins with no trailing slash', () => {
    for (const o of PRODUCTION_ORIGINS) expect(o).toMatch(/^https:\/\/[^/]+$/)
  })
})

describe('parseAllowedOrigins', () => {
  it('splits a comma-separated env var and trims each entry', () => {
    expect(parseAllowedOrigins('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it('drops empty entries and a trailing slash, so config typos do not silently fail closed', () => {
    expect(parseAllowedOrigins('https://a.example/,, ')).toEqual(['https://a.example'])
  })

  it('returns an empty list for undefined', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([])
  })
})

describe('isLoopbackOrigin', () => {
  it('accepts the dev server on any loopback host and port', () => {
    expect(isLoopbackOrigin('http://localhost:5173')).toBe(true)
    expect(isLoopbackOrigin('http://127.0.0.1:4173')).toBe(true)
    expect(isLoopbackOrigin('http://[::1]:5173')).toBe(true)
  })

  it('rejects a remote host, including one that merely mentions localhost', () => {
    expect(isLoopbackOrigin('http://192.168.1.20:5173')).toBe(false)
    expect(isLoopbackOrigin('https://localhost.evil.example')).toBe(false)
    expect(isLoopbackOrigin('https://evil.example/?x=localhost')).toBe(false)
  })

  it('rejects nonsense rather than throwing', () => {
    expect(isLoopbackOrigin(undefined)).toBe(false)
    expect(isLoopbackOrigin('not a url')).toBe(false)
  })
})
