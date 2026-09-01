import { useEffect } from 'react'
import { damp } from '../lib/frame'
import { ORBIT_FRICTION_LAMBDA, ORBIT_RETURN_LAMBDA } from './motion'

export const MAX_ORBIT = 0.9 // radians either way — a look around, not a turntable
const PX_TO_RAD = 0.004

export type OrbitState = { offset: number; velocity: number; dragging: boolean }

export const orbitState: OrbitState = { offset: 0, velocity: 0, dragging: false }

/** Pure: new orbit offset after dragging `dx` pixels. */
export function applyDrag(offset: number, dx: number): number {
  const next = offset + dx * PX_TO_RAD
  return Math.min(MAX_ORBIT, Math.max(-MAX_ORBIT, next))
}

/**
 * One frame of a released drag: momentum first, then the spring home.
 *
 * `velocity` had been declared on `orbitState` since the file was written and
 * never once read or assigned — a released drag damped straight back to rest,
 * so a flick and a slow drag ended identically. This is what it was for.
 *
 * Mutates in place, like `advanceSmooth` in lib/scrollState.ts: this runs every
 * frame forever, and a fresh object per frame would be garbage the collector
 * has to chase during exactly the gesture it is meant to smooth.
 */
export function advanceOrbit(state: OrbitState, dt: number): void {
  state.velocity = damp(state.velocity, 0, ORBIT_FRICTION_LAMBDA, dt)
  const carried = state.offset + state.velocity * dt
  const settled = damp(carried, 0, ORBIT_RETURN_LAMBDA, dt)
  state.offset = Math.min(MAX_ORBIT, Math.max(-MAX_ORBIT, settled))
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
    let lastT = 0

    const down = (e: PointerEvent) => {
      // Ignore drags that start on a link or button — those are clicks.
      if ((e.target as HTMLElement).closest('a, button')) return
      orbitState.dragging = true
      // A new grab starts from a standstill, never from the last flick's speed.
      orbitState.velocity = 0
      lastX = e.clientX
      lastT = e.timeStamp
      hero.classList.add('is-dragging')
    }
    const move = (e: PointerEvent) => {
      if (!orbitState.dragging) return
      const dx = e.clientX - lastX
      // `e.timeStamp`, not `performance.now()`: it is the moment the browser
      // recorded the input, so a coalesced batch of moves reports the interval
      // it actually covered rather than the interval it was delivered in.
      const dt = Math.max(1, e.timeStamp - lastT) / 1000
      orbitState.offset = applyDrag(orbitState.offset, dx)
      orbitState.velocity = (dx * PX_TO_RAD) / dt
      lastX = e.clientX
      lastT = e.timeStamp
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
