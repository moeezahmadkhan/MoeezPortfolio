import { describe, expect, it } from 'vitest'
import { MARKER_BASE_WIDTH, markerGeometry, markerTransform } from './navMarker'

describe('markerGeometry', () => {
  it('sits at the active link and matches its width', () => {
    const g = markerGeometry({ offsetLeft: 240, offsetWidth: 50 })
    expect(g.visible).toBe(true)
    expect(g.x).toBe(240)
    expect(g.scaleX).toBeCloseTo(50 / MARKER_BASE_WIDTH, 6)
  })

  it('hides rather than parking at the first item when nothing is active', () => {
    // At the hero no nav item is active. A marker parked under "About" would be
    // claiming the visitor is somewhere they are not.
    const g = markerGeometry(null)
    expect(g.visible).toBe(false)
  })

  it('never produces a zero or negative scale', () => {
    // A zero scale collapses the marker to nothing and, on the way back out,
    // animates from a degenerate matrix. Guard the input rather than the CSS.
    expect(markerGeometry({ offsetLeft: 0, offsetWidth: 0 }).scaleX).toBeGreaterThan(0)
    expect(markerGeometry({ offsetLeft: 0, offsetWidth: -20 }).scaleX).toBeGreaterThan(0)
  })
})

describe('markerTransform', () => {
  it('moves and scales on transform alone, never on layout', () => {
    // `width` is a layout-triggering property and animating it re-flows the nav
    // every frame — motion-language.test.ts forbids it. Scaling a fixed-width
    // base is how this marker changes width without changing its box.
    const css = markerTransform(markerGeometry({ offsetLeft: 120, offsetWidth: 75 }))
    expect(css).toContain('translateX(120px)')
    expect(css).toContain(`scaleX(${75 / MARKER_BASE_WIDTH})`)
    expect(css).not.toMatch(/width|left|margin/)
  })

  it('renders an invisible marker without moving it somewhere arbitrary', () => {
    const css = markerTransform(markerGeometry(null))
    expect(css).toContain('translateX(0px)')
  })
})
