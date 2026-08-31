import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// React only enables act() support when this flag is set. Without it, every direct
// act() call in a test logs a warning to stderr.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// jsdom implements neither of these, and both are used by the site.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

if (!window.IntersectionObserver) {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
    root = null
    rootMargin = ''
    thresholds: number[] = []
  }
  window.IntersectionObserver = NoopObserver as unknown as typeof window.IntersectionObserver
}

// jsdom's canvas getContext() exists but has no WebGL backend: requesting 'webgl' or
// 'webgl2' logs a noisy "Not implemented" to stderr and returns undefined. Stub it to
// a clean `null` so capability probes like hasWebGL() behave (return false) without
// polluting test output. Individual tests can still vi.spyOn(...) over this.
const originalGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  contextId: string,
  ...rest: unknown[]
) {
  if (contextId === 'webgl' || contextId === 'webgl2') return null
  return (originalGetContext as (...a: unknown[]) => unknown).call(this, contextId, ...rest)
} as typeof HTMLCanvasElement.prototype.getContext
