import { useEffect } from 'react'

/**
 * A module-level scroll singleton read inside R3F's useFrame loop.
 * Kept outside React state so scrolling never triggers re-renders of the
 * Canvas tree — the scene just samples these values each frame.
 */
export const scrollState = {
  progress: 0, // 0 → 1 down the whole page
  raw: 0, // pixels
  pointerX: 0, // -1 → 1, for camera parallax
  pointerY: 0, // -1 → 1
}

export function useScrollTracker() {
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }
    const onPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])
}
