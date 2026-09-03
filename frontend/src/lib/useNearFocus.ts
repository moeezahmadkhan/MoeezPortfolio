import { useEffect, useRef } from 'react'
import { useMatchMedia } from './useMatchMedia'

/**
 * What a touch visitor gets in place of `:hover`.
 *
 * Every hover affordance on this site is switched off on a coarse pointer, for
 * reasons that have not changed: `mouseenter` fires on a tap, so a decode or a
 * lift would sit between the press and the navigation. But switching them off
 * left a phone with a static page, and the card lift is not decoration — it is
 * the affordance that says a card is a thing rather than a paragraph.
 *
 * So the TRIGGER moves instead of the effect disappearing. The element a reader
 * has scrolled to the middle of the screen is the element they are looking at,
 * and it gets what a cursor would have given it. No tap is involved, so nothing
 * is delayed and no state can stick after a finger leaves.
 *
 * One observer is shared across every registration, constructed on the first
 * and disconnected on the last — the same lifecycle `registerMagnetic` gives
 * its window listeners, and for the same reason: a fine-pointer visitor
 * registers nothing, so nothing is ever constructed.
 */
export const NEAR_CLASS = 'is-near'

/**
 * A 10% band across the middle of the viewport.
 *
 * Tighter than `useSectionObserver`'s 15%, because that one picks a section and
 * this one picks a card. Widen it and a tall section marks two cards at once,
 * which reads as a bug rather than as attention.
 */
export const NEAR_ROOT_MARGIN = '-45% 0px -45% 0px'

let observer: IntersectionObserver | null = null
/** Everything registered, marked or not — what decides when to disconnect. */
const registered = new Set<Element>()
/** Only what is currently inside the band, and how deeply. */
const ratios = new Map<Element, number>()
let marked: Element | null = null

/**
 * Winner-take-all, like `useSectionObserver`. Without it every card inside a
 * tall section carries the mark at once.
 */
function pick(): void {
  let best: Element | null = null
  let bestRatio = 0
  for (const [el, ratio] of ratios) {
    if (ratio > bestRatio) {
      best = el
      bestRatio = ratio
    }
  }
  if (best === marked) return
  marked?.classList.remove(NEAR_CLASS)
  best?.classList.add(NEAR_CLASS)
  marked = best
}

function ensureObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) ratios.set(entry.target, entry.intersectionRatio)
        else ratios.delete(entry.target)
      }
      pick()
    },
    { rootMargin: NEAR_ROOT_MARGIN, threshold: [0, 0.25, 0.5, 1] },
  )
  return observer
}

/**
 * Adds one element to the shared observer. Returns the teardown.
 *
 * The class is written straight onto the node. This is deliberately not React
 * state: a scroll down a section crosses every card in it, and routing that
 * through `setState` would re-render one component per crossing for a change
 * the compositor could have made alone.
 */
export function registerNear(el: Element): () => void {
  registered.add(el)
  ensureObserver().observe(el)

  return () => {
    registered.delete(el)
    ratios.delete(el)
    observer?.unobserve(el)
    el.classList.remove(NEAR_CLASS)
    if (marked === el) marked = null
    if (registered.size === 0) {
      observer?.disconnect()
      observer = null
      ratios.clear()
      marked = null
      return
    }
    pick()
  }
}

/** Test-only: drops the shared observer and every mark. */
export function resetNearFocus(): void {
  observer?.disconnect()
  observer = null
  registered.clear()
  ratios.clear()
  marked?.classList.remove(NEAR_CLASS)
  marked = null
}

/**
 * Spread the returned ref onto the element that should take the mark.
 *
 * Gated on a LIVE coarse-pointer query rather than a one-shot probe, so a
 * hybrid laptop that gains or loses a mouse mid-visit registers or unregisters
 * rather than staying wrong until reload — the same choice `Magnetic` makes.
 */
export function useNearFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const coarse = useMatchMedia('(pointer: coarse)')

  useEffect(() => {
    if (!coarse || !ref.current) return
    return registerNear(ref.current)
  }, [coarse])

  return ref
}
