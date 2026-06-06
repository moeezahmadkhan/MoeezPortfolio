import { useEffect } from 'react'
import type Lenis from 'lenis'
import { getLenis, prefersReducedMotion } from './smoothScroll'
import { chapters } from './chapters'
import { settleTarget } from './scrollMath'

const IDLE_MS = 140 // how long the user must pause before we assist
const MAGNET_FRACTION = 1 / 3 // magnet zone half-width, as a fraction of viewport
const SETTLE_DURATION = 0.7 // seconds
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Live document-pixel tops of each section, ascending. */
function sectionTops(): number[] {
  const tops: number[] = []
  for (const c of chapters) {
    const el = document.getElementById(c.id)
    if (el) tops.push(el.getBoundingClientRect().top + window.scrollY)
  }
  return tops.sort((a, b) => a - b)
}

/**
 * When the user stops scrolling near a section seam, gently complete the scroll so
 * the scene lands centered. Only magnetizes near seams (a tall section read
 * mid-way is never yanked) and any user input cancels an in-flight settle.
 * Disabled under prefers-reduced-motion.
 */
export function useScrollSettle() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const lenis = getLenis()
    if (!lenis) return

    let idle: ReturnType<typeof setTimeout> | undefined
    let settling = false

    const onScroll = (instance: Lenis) => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) return
      if (settling) return // ignore our own programmatic scroll
      if (idle) clearTimeout(idle)
      idle = setTimeout(() => {
        const target = settleTarget(
          lenis.scroll,
          sectionTops(),
          window.innerHeight * MAGNET_FRACTION,
        )
        if (target === null) return
        settling = true
        lenis.scrollTo(target, {
          duration: SETTLE_DURATION,
          easing: easeOutCubic,
          onComplete: () => {
            settling = false
          },
        })
      }, IDLE_MS)
    }

    // Any genuine user input cancels an in-flight assist. Lenis interrupts the
    // programmatic scrollTo on user scroll by default (lock:false); we just clear
    // the flag so the next pause can re-arm.
    const cancel = () => {
      settling = false
    }

    lenis.on('scroll', onScroll)
    // Any user-initiated scroll cancels an in-flight assist so it can re-arm.
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    window.addEventListener('keydown', cancel)
    window.addEventListener('pointerdown', cancel)
    return () => {
      lenis.off('scroll', onScroll)
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      window.removeEventListener('keydown', cancel)
      window.removeEventListener('pointerdown', cancel)
      if (idle) clearTimeout(idle)
    }
  }, [])
}
