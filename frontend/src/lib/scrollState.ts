import { useEffect } from 'react'

/**
 * Per-frame state, deliberately OUTSIDE React. Scroll and pointer events fire far
 * more often than React should re-render; the render loop reads these fields every
 * frame instead. Never lift this into useState or context.
 */
export const scrollState = {
  progress: 0, // 0 at the top of the document, 1 at the bottom
  raw: 0, // scrollY in px
  pointerX: 0, // -1 (left edge) .. 1 (right edge)
  pointerY: 0, // -1 (top) .. 1 (bottom)
  heroVisible: 1, // 1 while the hero owns the screen, 0 once it has gone
}

/** Pure: how much of the hero is still on screen, given its bottom edge in px. */
export function heroVisibility(heroBottom: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  return Math.min(1, Math.max(0, heroBottom / viewportHeight))
}

export function useScrollTracker(): void {
  useEffect(() => {
    const hero = document.getElementById('top')

    const readScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? window.scrollY / max : 0
      if (hero) {
        scrollState.heroVisible = heroVisibility(
          hero.getBoundingClientRect().bottom,
          window.innerHeight,
        )
      }
    }

    const readPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }

    readScroll()
    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('resize', readScroll, { passive: true })
    window.addEventListener('pointermove', readPointer, { passive: true })
    return () => {
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', readScroll)
      window.removeEventListener('pointermove', readPointer)
    }
  }, [])
}
