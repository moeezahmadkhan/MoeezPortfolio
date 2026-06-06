import { describe, it, expect } from 'vitest'
import {
  castProgress, nodeGlow, streamGlow,
  localProgress, SECTION_START, SECTION_END, NODES, nodePosition,
} from './spell'

describe('castProgress', () => {
  it('ramps 0→1 across [start, start+duration] and clamps outside', () => {
    expect(castProgress(0, 0, 3)).toBe(0)
    expect(castProgress(1.5, 0, 3)).toBeCloseTo(0.5, 5)
    expect(castProgress(3, 0, 3)).toBe(1)
    expect(castProgress(5, 0, 3)).toBe(1)        // past the end → clamped
    expect(castProgress(-2, 0, 3)).toBe(0)       // before start → clamped
  })
  it('returns 0 for a non-positive duration', () => {
    expect(castProgress(5, 0, 0)).toBe(0)
  })
})

describe('nodeGlow', () => {
  const N = 6
  it('is 0 before the bolt reaches the node and 1 once fully passed', () => {
    expect(nodeGlow(0, 0, N)).toBe(0)            // node 0 sits at path 0 → dark until the cast begins
    expect(nodeGlow(0.07, 0, N)).toBeGreaterThan(0) // first node ignites first, as the bolt leaves the focus
    expect(nodeGlow(0.14, 0, N)).toBe(1)         // first node fully lit after its rise window
    expect(nodeGlow(0, 5, N)).toBe(0)            // last node dark at the start
    expect(nodeGlow(1, 5, N)).toBe(1)            // last node fully lit at the end
  })
  it('lights nodes in sequence — earlier nodes lead later ones', () => {
    const p = 0.5
    expect(nodeGlow(p, 1, N)).toBeGreaterThan(nodeGlow(p, 4, N))
  })
  it('is monotonic non-decreasing in progress for a given node', () => {
    expect(nodeGlow(0.6, 3, N)).toBeGreaterThanOrEqual(nodeGlow(0.4, 3, N))
  })
})

describe('streamGlow', () => {
  const N = 6 // 5 segments, indices 0..4
  it('segment 0 leads segment 3 mid-cast', () => {
    expect(streamGlow(0.4, 0, N)).toBeGreaterThan(streamGlow(0.4, 3, N))
  })
  it('all segments fully lit at progress 1, none at 0', () => {
    expect(streamGlow(1, 4, N)).toBe(1)
    expect(streamGlow(0, 0, N)).toBe(0)
  })
})

describe('localProgress', () => {
  it('clamps to 0 below the section and 1 above it', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
  it('is 0.5 at the section midpoint', () => {
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
  })
})

describe('NODES / nodePosition', () => {
  it('defines the AI build pipeline ending in the live app', () => {
    expect(NODES).toHaveLength(8)
    expect(NODES[NODES.length - 1].name).toMatch(/Live App/i)
  })
  it('spreads nodes left→right along the arc (x increases with index)', () => {
    expect(nodePosition(0)[0]).toBeLessThan(nodePosition(NODES.length - 1)[0])
  })
})
