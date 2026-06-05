import Lenis from 'lenis'
import { useEffect } from 'react'

let lenis: Lenis | null = null

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getLenis(): Lenis | null {
  return lenis
}

/**
 * Instantiate a single Lenis instance for the app. We pass autoRaf:false and
 * drive lenis.raf() from the R3F frame loop (see ScrollDriver) so the camera
 * samples the smoothed scroll value with no tearing. Disabled entirely under
 * prefers-reduced-motion (native scroll is restored).
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({
      lerp: 0.08, // a touch more glide than the previous 0.1 → weighted, premium feel
      wheelMultiplier: 1,
      touchMultiplier: 1.2, // slightly livelier on touch without feeling twitchy
      smoothWheel: true,
      autoRaf: false,
    })
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])
}
