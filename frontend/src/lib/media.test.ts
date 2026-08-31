import { describe, expect, it, vi } from 'vitest'
import { hasWebGL, isCoarsePointer, prefersReducedMotion, resetWebGLCache } from './media'

function stubMatchMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('media', () => {
  it('reports reduced motion when the query matches', () => {
    stubMatchMedia(['(prefers-reduced-motion: reduce)'])
    expect(prefersReducedMotion()).toBe(true)
  })

  it('reports no reduced motion otherwise', () => {
    stubMatchMedia([])
    expect(prefersReducedMotion()).toBe(false)
  })

  it('detects a coarse pointer', () => {
    stubMatchMedia(['(pointer: coarse)'])
    expect(isCoarsePointer()).toBe(true)
  })

  it('reports no WebGL when getContext yields nothing', () => {
    resetWebGLCache()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(hasWebGL()).toBe(false)
  })

  it('reports WebGL when a context is returned', () => {
    resetWebGLCache()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as RenderingContext)
    expect(hasWebGL()).toBe(true)
  })
})
