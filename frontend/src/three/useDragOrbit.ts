import { useEffect } from 'react'

export const MAX_ORBIT = 0.9 // radians either way — a look around, not a turntable
const PX_TO_RAD = 0.004

export const orbitState = { offset: 0, velocity: 0, dragging: false }

/** Pure: new orbit offset after dragging `dx` pixels. */
export function applyDrag(offset: number, dx: number): number {
  const next = offset + dx * PX_TO_RAD
  return Math.min(MAX_ORBIT, Math.max(-MAX_ORBIT, next))
}

/**
 * Drag-to-orbit on the hero. The canvas itself is pointer-events:none so it never
 * eats clicks; the hero SECTION is what listens, and only while it is on screen.
 *
 * `enabled` gates installation entirely — only the hero rig should pass `true`,
 * since `#top` is the hero section element and dragging any other rig was never
 * a feature. Defaults to `true` so this stays a drop-in for the hero's own use.
 */
export function useDragOrbit(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return
    const hero = document.getElementById('top')
    if (!hero) return
    let lastX = 0

    const down = (e: PointerEvent) => {
      // Ignore drags that start on a link or button — those are clicks.
      if ((e.target as HTMLElement).closest('a, button')) return
      orbitState.dragging = true
      lastX = e.clientX
      hero.classList.add('is-dragging')
    }
    const move = (e: PointerEvent) => {
      if (!orbitState.dragging) return
      orbitState.offset = applyDrag(orbitState.offset, e.clientX - lastX)
      lastX = e.clientX
    }
    const up = () => {
      orbitState.dragging = false
      hero.classList.remove('is-dragging')
    }

    // None of these call preventDefault, so all four can be passive — that's
    // latency hygiene for the browser's scroll/gesture heuristics, not a
    // behavioural change.
    hero.addEventListener('pointerdown', down, { passive: true })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up, { passive: true })
    window.addEventListener('pointercancel', up, { passive: true })
    return () => {
      hero.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [enabled])
}
