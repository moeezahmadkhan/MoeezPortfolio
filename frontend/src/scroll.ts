import { useEffect } from 'react'
import type Lenis from 'lenis'
import { getLenis } from './smoothScroll'

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

export const responsiveState = {
  zoom: 1, // computed once per resize
}

export function useScrollTracker() {
  useEffect(() => {
    const nativeScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }
    const onPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onResize = () => {
      const vw = window.innerWidth
      responsiveState.zoom = vw < 640 ? 0.92 : vw < 1024 ? 0.96 : 1
    }

    // When Lenis is active, read its smoothed scroll; otherwise fall back to
    // native window scroll (e.g. under prefers-reduced-motion).
    // getLenis() is populated by useSmoothScroll(), which must run before this
    // hook in App.tsx; otherwise we silently fall back to native scroll.
    const lenis = getLenis()
    let detach = () => {}
    if (lenis) {
      const onLenis = (instance: Lenis) => {
        scrollState.raw = instance.scroll
        scrollState.progress = instance.limit > 0
          ? Math.min(instance.scroll / instance.limit, 1)
          : 0
      }
      lenis.on('scroll', onLenis)
      detach = () => lenis.off('scroll', onLenis)
    } else {
      nativeScroll()
      window.addEventListener('scroll', nativeScroll, { passive: true })
      window.addEventListener('resize', nativeScroll)
      detach = () => {
        window.removeEventListener('scroll', nativeScroll)
        window.removeEventListener('resize', nativeScroll)
      }
    }

    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      detach()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])
}
