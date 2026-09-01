import { describe, expect, it } from 'vitest'
import { ENTRIES, entryOffsets, type EntryOffsets } from './choreography'
import { HERO_RIG_ID } from './rigs'

const out = (): EntryOffsets => ({ lift: 0, yaw: 0, scale: 0 })

describe('entryOffsets', () => {
  it('is fully settled once the rig has finished fading in', () => {
    // The offsets exist to describe an arrival. A rig that has arrived must sit
    // exactly where rigs.ts puts it, or every section would be subtly misplaced.
    for (const id of Object.keys(ENTRIES)) {
      const o = entryOffsets(id, 1, out())
      expect(o.lift).toBeCloseTo(0, 6)
      expect(o.yaw).toBeCloseTo(0, 6)
      expect(o.scale).toBeCloseTo(0, 6)
    }
  })

  it('is at full amplitude when the rig has not started arriving', () => {
    const o = entryOffsets('work', 0, out())
    expect(o.yaw).toBeCloseTo(ENTRIES.work.yaw, 6)
    expect(o.lift).toBeCloseTo(ENTRIES.work.lift, 6)
  })

  it('closes on the resting pose without reversing', () => {
    // A move that overshoots and comes back reads as the figure changing its
    // mind. Every offset must shrink monotonically as the rig arrives.
    let previous = Infinity
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const o = entryOffsets('work', p, out())
      const magnitude = Math.abs(o.lift) + Math.abs(o.yaw) + Math.abs(o.scale)
      expect(magnitude).toBeLessThanOrEqual(previous + 1e-9)
      previous = magnitude
    }
  })

  it('leaves the hero alone', () => {
    // The hero is already on screen when the page loads (skipInitialFade), so
    // an entry move would play against a figure that never entered.
    const o = entryOffsets(HERO_RIG_ID, 0, out())
    expect(o).toEqual({ lift: 0, yaw: 0, scale: 0 })
  })

  it('gives an unknown rig no choreography rather than throwing', () => {
    expect(entryOffsets('not-a-rig', 0, out())).toEqual({ lift: 0, yaw: 0, scale: 0 })
  })

  it('clamps progress, so a stray value cannot invert the move', () => {
    expect(entryOffsets('work', -3, out()).yaw).toBeCloseTo(ENTRIES.work.yaw, 6)
    expect(entryOffsets('work', 4, out()).yaw).toBeCloseTo(0, 6)
  })

  it('writes into and returns the same out object, mutating it in place', () => {
    const o = out()
    expect(entryOffsets('work', 0.5, o)).toBe(o)
    expect(o.yaw).not.toBe(0)
  })
})
