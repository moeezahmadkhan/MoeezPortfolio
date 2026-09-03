import { describe, expect, it } from 'vitest'
import {
  DISSOLVE_PHASE,
  HERO_EXIT_SCALE,
  HERO_EXIT_YAW,
  HERO_EXIT_Z,
  PUSH_PHASE,
  TURN_PHASE,
  heroExit,
} from './choreography'
import { heroExitProgress } from '../lib/scrollState'

describe('heroExitProgress', () => {
  it('is 0 at the top of the page and 1 once the hero has given up its extra height', () => {
    // 1373px hero in a 763px viewport: 610px of extra height to travel.
    expect(heroExitProgress(0, 1373, 763)).toBe(0)
    expect(heroExitProgress(-305, 1373, 763)).toBeCloseTo(0.5, 2)
    expect(heroExitProgress(-610, 1373, 763)).toBe(1)
  })

  it('clamps rather than running past either end', () => {
    expect(heroExitProgress(200, 1373, 763)).toBe(0)
    expect(heroExitProgress(-5000, 1373, 763)).toBe(1)
  })

  it('stays at 0 for a hero with no room to play a sequence', () => {
    // The desktop layout and a short phone both land here: no extra height, so
    // no exit, and the figure is left exactly as the station placed it.
    expect(heroExitProgress(-400, 763, 763)).toBe(0)
    expect(heroExitProgress(-400, 600, 763)).toBe(0)
  })

  it('is not a document-scroll fraction — a taller hero only changes its own timing', () => {
    // The whole point: this reads one element's rect, so nothing elsewhere on
    // the page can re-time it. Same scroll distance, different hero height,
    // different progress — and no other input exists.
    expect(heroExitProgress(-305, 1373, 763)).toBeCloseTo(0.5, 2)
    expect(heroExitProgress(-305, 2136, 763)).toBeCloseTo(0.222, 2)
  })
})

describe('heroExit', () => {
  it('leaves the figure completely alone at rest', () => {
    // Term by term rather than toEqual: HERO_EXIT_YAW is negative, so `yaw` at
    // rest is -0, and a deep-equality check distinguishes that from +0 while
    // nothing that reads it ever could.
    const rest = heroExit(0)
    expect(rest.yaw).toBeCloseTo(0, 10)
    expect(rest.scale).toBeCloseTo(0, 10)
    expect(rest.z).toBeCloseTo(0, 10)
    expect(rest.dissolve).toBeCloseTo(0, 10)
  })

  it('turns AWAY from the reader, never toward them', () => {
    // Measured, not reasoned: at +1.9 the figure rotated the wrong way. The
    // station's rest pose is already three-quarters turned, so a positive yaw
    // brought the face round to camera — the opposite of vanishing into a cloak.
    expect(HERO_EXIT_YAW).toBeLessThan(0)
  })

  it('turns first, before the push has begun', () => {
    const early = heroExit(0.2)
    expect(Math.abs(early.yaw)).toBeGreaterThan(0)
    expect(early.scale).toBe(0)
    expect(early.z).toBe(0)
    expect(early.dissolve).toBe(0)
  })

  it('overlaps the phases, so the figure never visibly stops between beats', () => {
    // Run them end to end and it reads as three animations rather than one exit.
    expect(PUSH_PHASE.from).toBeLessThan(TURN_PHASE.to)
    expect(DISSOLVE_PHASE.from).toBeLessThan(PUSH_PHASE.to)
    const mid = heroExit(0.5)
    expect(Math.abs(mid.yaw)).toBeGreaterThan(0)
    expect(mid.scale).toBeGreaterThan(0)
  })

  it('is fully turned, pushed and gone by the end', () => {
    const end = heroExit(1)
    expect(end.yaw).toBeCloseTo(HERO_EXIT_YAW, 5)
    expect(end.yaw).toBeLessThan(0)
    expect(end.scale).toBeCloseTo(HERO_EXIT_SCALE, 5)
    expect(end.z).toBeCloseTo(HERO_EXIT_Z, 5)
    expect(end.dissolve).toBe(1)
  })

  it('never travels past the camera', () => {
    // The camera sits at z 4.2 and the station starts at z 0.
    expect(HERO_EXIT_Z).toBeLessThan(4.2)
  })

  it('moves every term monotonically forward', () => {
    let previous = heroExit(0)
    for (let p = 0.05; p <= 1.0001; p += 0.05) {
      const now = heroExit(p)
      expect(Math.abs(now.yaw)).toBeGreaterThanOrEqual(Math.abs(previous.yaw))
      expect(now.scale).toBeGreaterThanOrEqual(previous.scale)
      expect(now.z).toBeGreaterThanOrEqual(previous.z)
      expect(now.dissolve).toBeGreaterThanOrEqual(previous.dissolve)
      previous = now
    }
  })
})
