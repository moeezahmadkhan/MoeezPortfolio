// Capability probes. Each one is called at render time rather than cached at module
// load, because a visitor can flip the OS reduced-motion switch while the tab is open.

function matches(query: string): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

export function prefersReducedMotion(): boolean {
  return matches('(prefers-reduced-motion: reduce)')
}

export function isCoarsePointer(): boolean {
  return matches('(pointer: coarse)')
}

let webglCache: boolean | undefined

export function hasWebGL(): boolean {
  // This one IS cached: creating a probe context is expensive and the answer cannot
  // change within a page lifetime.
  if (webglCache !== undefined) return webglCache
  try {
    const canvas = document.createElement('canvas')
    webglCache = Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    webglCache = false
  }
  return webglCache
}

/** Test-only: clears the WebGL probe cache. */
export function resetWebGLCache(): void {
  webglCache = undefined
}
