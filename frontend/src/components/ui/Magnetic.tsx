import { useEffect, useRef, type ReactNode } from 'react'
import { damp } from '../../lib/frame'
import { useMatchMedia } from '../../lib/useMatchMedia'
import './Magnetic.css'

/**
 * How far a control may lean, in px, on either axis. Deliberately tiny. The
 * effect has to read as the control noticing you, not as the control moving —
 * and every safety property below is stated in terms of this number, so raising
 * it without raising MAGNETIC_MIN_TARGET_PX breaks a test rather than the site.
 */
export const MAGNETIC_MAX_PX = 6

/** How far outside the control's own box the lean starts, in px. */
export const MAGNETIC_RADIUS_PX = 96

/**
 * The smallest box a magnetic control may occupy. A translation cannot change a
 * target's size, but it can move the target off the spot the visitor aimed at,
 * so what has to survive is the OVERLAP between the resting box and the leaning
 * one: (size - MAGNETIC_MAX_PX) must still be >= 44 on both axes. Magnetic.css
 * enforces this as a min-width/min-height; the test asserts the arithmetic.
 */
export const MAGNETIC_MIN_TARGET_PX = 52

/** How fast the offset chases the pointer, in reciprocal seconds. */
export const MAGNETIC_LAMBDA = 13

/** The longest frame worth easing across — a backgrounded tab hands back seconds. */
const MAX_FRAME_DT = 0.1

/** Below this the offset is indistinguishable from rest, so the loop may stop. */
const SETTLED_PX = 0.01

export type MagneticRect = { left: number; top: number; width: number; height: number }
export type MagneticOffset = { x: number; y: number }

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Pure: how far a control at `rect` should lean toward a pointer at (px, py).
 * Writes into the caller-owned `out` rather than allocating, because this runs
 * once per control per frame.
 *
 * Two properties this function must have, both proved in Magnetic.test.tsx:
 *
 *  - It is bounded by MAGNETIC_MAX_PX on each axis, so the overlap between the
 *    resting box and the leaning one never falls below 44x44 for a control of
 *    at least MAGNETIC_MIN_TARGET_PX.
 *  - It can never evade a cursor. The offset takes the sign of the gap and is
 *    scaled by that gap over the control's half-extent, so it is always a small
 *    fraction of the distance still to travel: the control moves toward the
 *    pointer, by less than the gap, and so can never sidestep or overshoot.
 */
export function magneticOffset(
  px: number,
  py: number,
  rect: MagneticRect,
  out: MagneticOffset,
): MagneticOffset {
  out.x = 0
  out.y = 0
  if (!Number.isFinite(px) || !Number.isFinite(py)) return out
  if (!(rect.width > 0) || !(rect.height > 0)) return out

  // Distance from the pointer to the nearest point of the box — 0 while it is
  // inside — so the activation band hugs a wide button rather than ballooning
  // into a circle around its centre.
  const edgeX = Math.max(rect.left - px, 0, px - (rect.left + rect.width))
  const edgeY = Math.max(rect.top - py, 0, py - (rect.top + rect.height))
  const edge = Math.hypot(edgeX, edgeY)
  if (edge >= MAGNETIC_RADIUS_PX) return out

  const strength = 1 - edge / MAGNETIC_RADIUS_PX
  const dx = px - (rect.left + rect.width / 2)
  const dy = py - (rect.top + rect.height / 2)
  out.x = clamp(dx / (rect.width / 2), -1, 1) * MAGNETIC_MAX_PX * strength
  out.y = clamp(dy / (rect.height / 2), -1, 1) * MAGNETIC_MAX_PX * strength
  return out
}

/**
 * One pointer listener and one frame loop for every magnetic control on the
 * page, not one each. Per-pointer state lives here as a mutable module
 * singleton for the same reason scrollState does: a pointer moving across the
 * hero must never re-render React.
 */
type MagneticNode = { el: HTMLElement; x: number; y: number }

const nodes = new Set<MagneticNode>()
const pointer = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY }

// Hoisted scratch. The loop reads every rect before writing any transform, so N
// controls cost one layout pass rather than N interleaved read/write pairs, and
// the pool means that costs no allocation per frame either.
const rectPool: MagneticRect[] = []
const offset: MagneticOffset = { x: 0, y: 0 }
let frame = 0
// -1, not 0: a rAF timestamp of exactly 0 is legal, and using 0 as the "no
// baseline yet" sentinel would make that frame reset the clock forever.
let previous = -1

function rectAt(index: number): MagneticRect {
  let rect = rectPool[index]
  if (!rect) {
    rect = { left: 0, top: 0, width: 0, height: 0 }
    rectPool[index] = rect
  }
  return rect
}

function tick(now: number): void {
  const dt = previous < 0 ? 0 : Math.min((now - previous) / 1000, MAX_FRAME_DT)
  previous = now

  let index = 0
  for (const node of nodes) {
    const box = node.el.getBoundingClientRect()
    const rect = rectAt(index++)
    // The measured box already carries this frame's lean; subtracting it back
    // out recovers the resting box, or the offset would feed on itself.
    rect.left = box.left - node.x
    rect.top = box.top - node.y
    rect.width = box.width
    rect.height = box.height
  }

  index = 0
  let busy = false
  for (const node of nodes) {
    magneticOffset(pointer.x, pointer.y, rectAt(index++), offset)
    node.x = damp(node.x, offset.x, MAGNETIC_LAMBDA, dt)
    node.y = damp(node.y, offset.y, MAGNETIC_LAMBDA, dt)
    if (Math.abs(node.x) < SETTLED_PX && Math.abs(node.y) < SETTLED_PX) {
      node.x = 0
      node.y = 0
    }
    if (node.x !== 0 || node.y !== 0 || offset.x !== 0 || offset.y !== 0) busy = true
    node.el.style.setProperty('--magnetic-x', `${node.x.toFixed(2)}px`)
    node.el.style.setProperty('--magnetic-y', `${node.y.toFixed(2)}px`)
  }

  // Idle out once nothing is leaning and nothing wants to. A hero that has
  // scrolled away should not be holding a rAF open.
  if (busy) {
    frame = requestAnimationFrame(tick)
  } else {
    frame = 0
    previous = -1
  }
}

function wake(): void {
  if (frame === 0 && nodes.size > 0) {
    previous = -1
    frame = requestAnimationFrame(tick)
  }
}

function readPointer(event: PointerEvent | MouseEvent): void {
  pointer.x = event.clientX
  pointer.y = event.clientY
  wake()
}

/**
 * Sends the pointer away, so every control relaxes back to rest.
 *
 * This is what a touch pointer needs and a mouse does not, and it is the whole
 * reason touch was excluded before rather than merely untested. A mouse is
 * always somewhere: `pointermove` keeps firing, so `pointer` is never stale. A
 * finger only exists between `pointerdown` and `pointerup` — after it lifts no
 * further event arrives, so the last touched position would stay in `pointer`
 * forever and every control near it would sit leaning at a finger that is no
 * longer on the glass.
 *
 * Infinity rather than a flag, because `magneticOffset` already returns a zero
 * offset for a pointer beyond MAGNETIC_RADIUS_PX — the release needs no special
 * case anywhere else, and the lean eases home on the same damped curve it
 * arrived on instead of snapping.
 */
function releasePointer(event: PointerEvent): void {
  if (event.pointerType !== 'touch') return
  pointer.x = Number.NEGATIVE_INFINITY
  pointer.y = Number.NEGATIVE_INFINITY
  wake()
}

/**
 * Adds an element to the shared loop. Returns the teardown. The window
 * listeners exist only while at least one element is registered, which is how
 * a reduced-motion visitor pays nothing at all: no element ever registers, so
 * nothing is ever listened for.
 */
export function registerMagnetic(el: HTMLElement): () => void {
  const node: MagneticNode = { el, x: 0, y: 0 }
  if (nodes.size === 0) {
    window.addEventListener('pointermove', readPointer, { passive: true })
    // Scrolling moves the control under a stationary cursor, which changes the
    // target without a pointer event to announce it.
    window.addEventListener('scroll', wake, { passive: true })
    // A finger that has left the glass is not a pointer any more. Both events,
    // because a gesture the browser takes over for scrolling ends in
    // `pointercancel` and never fires `pointerup` at all — miss that one and
    // the lean sticks after exactly the gesture a phone makes most.
    window.addEventListener('pointerup', releasePointer, { passive: true })
    window.addEventListener('pointercancel', releasePointer, { passive: true })
  }
  nodes.add(node)
  wake()

  return () => {
    nodes.delete(node)
    el.style.removeProperty('--magnetic-x')
    el.style.removeProperty('--magnetic-y')
    if (nodes.size === 0) {
      window.removeEventListener('pointermove', readPointer)
      window.removeEventListener('scroll', wake)
      window.removeEventListener('pointerup', releasePointer)
      window.removeEventListener('pointercancel', releasePointer)
      if (frame !== 0) cancelAnimationFrame(frame)
      frame = 0
      previous = -1
    }
  }
}

/**
 * Wraps one control so it leans a few pixels toward the pointer as the pointer
 * approaches — a cursor, or a finger while it is on the glass.
 *
 * Touch was excluded at first on the reasoning that a fingertip covers the
 * control it is leaning toward. That is true of the control directly under the
 * finger and false of its neighbours: the activation band reaches
 * MAGNETIC_RADIUS_PX (96px) from a control's edge, and a finger occludes
 * roughly half that, so the buttons a finger passes NEAR lean visibly while it
 * drags. What the exclusion actually bought was avoiding the stale-pointer
 * problem, and `releasePointer` above solves that directly.
 *
 * There is no keyboard equivalent of the lean, and there should not be: it
 * carries no information. What a keyboard user gets instead is the focus
 * affordance on the control itself (see Button.css), which is styled to read as
 * strongly as the hover state so a focused CTA never looks dead beside a
 * hovered sibling.
 *
 * Reduced motion still opts out entirely, and that is the one exclusion that
 * remains: it is about the movement, not about the input device.
 */
export function Magnetic({ children }: { children: ReactNode }) {
  const reduced = useMatchMedia('(prefers-reduced-motion: reduce)')
  const live = !reduced
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!live || !ref.current) return
    return registerMagnetic(ref.current)
  }, [live])

  return (
    <span className={live ? 'magnetic magnetic--live' : 'magnetic'} ref={ref}>
      {children}
    </span>
  )
}
