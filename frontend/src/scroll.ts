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
  // True when the stacked mobile/tablet layout is active (matches the ≤1024px
  // CSS block). Drives the responsive zoom and other ≤1024 tweaks.
  isMobile: typeof window !== 'undefined' && window.innerWidth < 1024,
  // True only on the true phone layout — coarse pointer OR <720px — matching the
  // mobile CAMERA track (CameraRig) and Scene tier. The pipeline node labels +
  // the compact-constellation scale key off THIS, not isMobile: in the 720–1024
  // band the desktop camera is still active and frames the full labelled arc, so
  // suppressing labels / shrinking orbs there left "no circles, no text".
  isPhone:
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 720),
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
      // Phones keep zoom at 1 (was 0.78) so the models read large in the
      // foreground — the mobile camera track + wider FOV handle framing instead
      // of shrinking the whole scene. Tablets still ease back slightly.
      responsiveState.zoom = vw < 640 ? 1 : vw < 1024 ? 0.95 : 1
      responsiveState.isMobile = vw < 1024
      responsiveState.isPhone =
        window.matchMedia?.('(pointer: coarse)').matches || vw < 720
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
