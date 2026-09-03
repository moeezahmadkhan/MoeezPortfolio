import { describe, expect, it } from 'vitest'
import {
  HERO_EXIT_X_FRACTION,
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

describe('the exit is smooth by construction', () => {
  // Frame timing cannot be measured in this project's harnesses — Puppeteer
  // under SwiftShader runs rAF at 12Hz and an unfocused tab at ~1.3Hz, so a
  // frame count measures the harness. What CAN be proved is that the curve the
  // damping follows has no steps in it: a continuous input can only ever
  // produce continuous motion, whatever rate reads it.

  it('never jumps — a small step in progress moves every term a small amount', () => {
    const STEP = 0.001
    // Generous bounds: each term's full travel times a few steps' worth. The
    // point is to catch a discontinuity, not to pin the exact slope.
    let previous = heroExit(0, 1.4)
    for (let p = STEP; p <= 1.0001; p += STEP) {
      const now = heroExit(p, 1.4)
      expect(Math.abs(now.yaw - previous.yaw)).toBeLessThan(0.05)
      expect(Math.abs(now.scale - previous.scale)).toBeLessThan(0.05)
      expect(Math.abs(now.z - previous.z)).toBeLessThan(0.05)
      expect(Math.abs(now.x - previous.x)).toBeLessThan(0.05)
      expect(Math.abs(now.dissolve - previous.dissolve)).toBeLessThan(0.05)
      previous = now
    }
  })

  it('starts and ends at rest on every term, so nothing snaps at either edge', () => {
    for (const term of ['yaw', 'scale', 'z', 'x', 'dissolve'] as const) {
      expect(Math.abs(heroExit(0, 1.4)[term])).toBeCloseTo(0, 10)
    }
    // And clamps rather than continuing past the end.
    expect(heroExit(1.5, 1.4)).toEqual(heroExit(1, 1.4))
  })
})

describe('the sideways drift', () => {
  it('is relative to where the layout actually stands the figure', () => {
    // Desktop stands it in the right-hand column at x 1.4; mobile centres it.
    const desktop = heroExit(1, 1.4)
    expect(desktop.x).toBeCloseTo(1.4 * HERO_EXIT_X_FRACTION, 5)
    expect(desktop.x).toBeLessThan(0) // back toward centre, not further out
  })

  it('does nothing at all for a centred figure', () => {
    // Mobile passes 0, so the drift term cannot shove a centred figure sideways.
    // toBeCloseTo, not toBe: 0 * a negative fraction is -0, which deep equality
    // distinguishes from +0 while nothing that reads it ever could.
    expect(heroExit(1, 0).x).toBeCloseTo(0, 10)
    expect(heroExit(0.5, 0).x).toBeCloseTo(0, 10)
  })
})
