import { describe, expect, it } from 'vitest'
import { ORBIT_FRICTION_LAMBDA } from './motion'
import { advanceOrbit, applyDrag, MAX_ORBIT, type OrbitState } from './useDragOrbit'

describe('applyDrag', () => {
  it('turns horizontal pixels into rotation', () => {
    expect(applyDrag(0, 100)).toBeGreaterThan(0)
    expect(applyDrag(0, -100)).toBeLessThan(0)
  })

  it('clamps so the model can never spin away from the camera', () => {
    expect(applyDrag(0, 100000)).toBeLessThanOrEqual(MAX_ORBIT)
    expect(applyDrag(0, -100000)).toBeGreaterThanOrEqual(-MAX_ORBIT)
  })
})

describe('advanceOrbit', () => {
  const state = (offset: number, velocity: number): OrbitState => ({
    offset,
    velocity,
    dragging: false,
  })

  it('carries a flick past the point the finger left off', () => {
    // The whole point of momentum: releasing mid-gesture should not stop the
    // figure dead. Before this, a release damped straight back to rest and a
    // flick and a slow drag felt identical.
    const s = state(0.2, 1.5)
    advanceOrbit(s, 1 / 60)
    expect(s.offset).toBeGreaterThan(0.2)
  })

  it('bleeds the velocity away rather than spinning forever', () => {
    // Three seconds, not one. The first version of this test asserted the
    // velocity was under 0.05 after a single second, which is not a property of
    // "it stops" — it is a statement that ORBIT_FRICTION_LAMBDA is about 3.7.
    // At 2.2 a flick still holds 11% of its speed at one second and is long
    // gone by three. The monotonic decay below is the real guard; the endpoint
    // just has to be far enough out to be about stopping rather than tuning.
    const s = state(0, 2)
    let previous = Infinity
    for (let i = 0; i < 180; i++) {
      advanceOrbit(s, 1 / 60)
      expect(Math.abs(s.velocity)).toBeLessThan(previous)
      previous = Math.abs(s.velocity)
    }
    expect(Math.abs(s.velocity)).toBeLessThan(0.05)
  })

  it('comes back to rest', () => {
    const s = state(0.6, 1)
    for (let i = 0; i < 600; i++) advanceOrbit(s, 1 / 60)
    expect(Math.abs(s.offset)).toBeLessThan(0.01)
  })

  it('never lets momentum throw the figure past its limit', () => {
    // A hard flick must not become a turntable. MAX_ORBIT is a look around.
    const s = state(MAX_ORBIT, 50)
    for (let i = 0; i < 30; i++) {
      advanceOrbit(s, 1 / 60)
      expect(Math.abs(s.offset)).toBeLessThanOrEqual(MAX_ORBIT + 1e-9)
    }
  })

  it('leaves a rig that was never touched exactly where it stands', () => {
    const s = state(0, 0)
    advanceOrbit(s, 1 / 60)
    expect(s.offset).toBe(0)
    expect(s.velocity).toBe(0)
  })

  it('is frame-rate independent', () => {
    // One 1/30s step must land where two 1/60s steps do, near enough. A 144Hz
    // monitor and a 60Hz one have to show the same motion.
    const slow = state(0.5, 1)
    const fast = state(0.5, 1)
    advanceOrbit(slow, 1 / 30)
    advanceOrbit(fast, 1 / 60)
    advanceOrbit(fast, 1 / 60)
    expect(slow.offset).toBeCloseTo(fast.offset, 2)
  })

  it('names its friction rate rather than burying a literal', () => {
    expect(typeof ORBIT_FRICTION_LAMBDA).toBe('number')
    expect(ORBIT_FRICTION_LAMBDA).toBeGreaterThan(0)
  })
})
