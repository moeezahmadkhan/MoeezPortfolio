import { afterEach, describe, expect, it, vi } from 'vitest'
import { NEAR_CLASS, registerNear, resetNearFocus } from './useNearFocus'

type Cb = (entries: IntersectionObserverEntry[]) => void

let callback: Cb
let constructed = 0
let disconnected = 0
let observing: Element[] = []
let options: IntersectionObserverInit | undefined

function stubObserver() {
  constructed = 0
  disconnected = 0
  observing = []
  options = undefined
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Cb, init?: IntersectionObserverInit) {
        constructed += 1
        callback = cb
        options = init
      }
      observe(el: Element) {
        observing.push(el)
      }
      unobserve(el: Element) {
        observing = observing.filter((o) => o !== el)
      }
      disconnect() {
        disconnected += 1
      }
    },
  )
}

function entry(target: Element, ratio: number): IntersectionObserverEntry {
  return {
    target,
    intersectionRatio: ratio,
    isIntersecting: ratio > 0,
  } as IntersectionObserverEntry
}

function makeCards(n: number): HTMLElement[] {
  document.body.innerHTML = Array.from({ length: n }, () => '<article></article>').join('')
  return [...document.body.querySelectorAll('article')] as HTMLElement[]
}

afterEach(() => {
  resetNearFocus()
  document.body.innerHTML = ''
})

describe('useNearFocus', () => {
  it('marks exactly one element — the deepest into the band', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    registerNear(a)
    registerNear(b)

    callback([entry(a, 0.3), entry(b, 0.9)])
    expect(b.classList.contains(NEAR_CLASS)).toBe(true)
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
  })

  it('moves the mark rather than accumulating marks', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    registerNear(a)
    registerNear(b)

    callback([entry(a, 0.9), entry(b, 0.1)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    callback([entry(a, 0.1), entry(b, 0.95)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
    expect(b.classList.contains(NEAR_CLASS)).toBe(true)
    expect(document.querySelectorAll(`.${NEAR_CLASS}`)).toHaveLength(1)
  })

  it('marks nothing when every element has left the band', () => {
    stubObserver()
    const [a] = makeCards(1)
    registerNear(a)

    callback([entry(a, 0.8)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    callback([entry(a, 0)])
    expect(document.querySelectorAll(`.${NEAR_CLASS}`)).toHaveLength(0)
  })

  it('shares one observer across every registration', () => {
    stubObserver()
    const [a, b, c] = makeCards(3)
    registerNear(a)
    registerNear(b)
    registerNear(c)

    expect(constructed).toBe(1)
    expect(observing).toHaveLength(3)
  })

  it('disconnects once the last element unregisters, and strips its class', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    const offA = registerNear(a)
    const offB = registerNear(b)

    callback([entry(a, 0.9)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    offA()
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
    expect(disconnected).toBe(0)

    offB()
    expect(disconnected).toBe(1)
  })

  it('uses a band across the middle of the viewport, not the whole viewport', () => {
    // A card must light when the reader is LOOKING at it, not when it has
    // merely entered the screen — the same reasoning as useSectionObserver's
    // rootMargin, tightened because this picks one card, not one section.
    stubObserver()
    const [a] = makeCards(1)
    registerNear(a)

    expect(options?.rootMargin).toBe('-45% 0px -45% 0px')
  })
})
