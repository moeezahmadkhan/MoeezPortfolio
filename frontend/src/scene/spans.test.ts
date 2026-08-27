import { describe, it, expect } from 'vitest'
import { DESKTOP_SPANS, MOBILE_SPANS, type StationName } from './spans'
import { chapters } from '../chapters'

/**
 * The camera track and the station spans are hand-synced numbers in two files. Nothing
 * checked that they agreed, so they drifted: beats were authored for scroll positions
 * the camera had already left, and the mobile spans were never re-measured at all when
 * the mobile camera track was. These tests are that missing guard — if a chapter is
 * added, removed or resized, one of them fails instead of a chapter silently going
 * unwatchable.
 */

const STATIONS: StationName[] = ['pact', 'tracker', 'map']

describe('station spans', () => {
  it('covers every pinned station on both viewports', () => {
    for (const s of STATIONS) {
      expect(DESKTOP_SPANS[s]).toBeDefined()
      expect(MOBILE_SPANS[s]).toBeDefined()
    }
  })

  it.each(STATIONS)('%s span runs forwards and stays inside the page', (s) => {
    for (const table of [DESKTOP_SPANS, MOBILE_SPANS]) {
      const [entry, hold] = table[s]
      expect(entry).toBeGreaterThan(0)
      expect(hold).toBeGreaterThan(entry)
      expect(hold).toBeLessThanOrEqual(1)
    }
  })

  it.each(STATIONS)('%s holds long enough for its beats to play', (s) => {
    // Beats are authored across local 0→1. A window this narrow would flash the
    // choreography past the viewer even with the camera pointed correctly.
    for (const table of [DESKTOP_SPANS, MOBILE_SPANS]) {
      const [entry, hold] = table[s]
      expect(hold - entry).toBeGreaterThan(0.05)
    }
  })

  it('orders the stations the same way on both viewports', () => {
    const order = (t: typeof DESKTOP_SPANS) => STATIONS.slice().sort((a, b) => t[a][0] - t[b][0])
    expect(order(DESKTOP_SPANS)).toEqual(STATIONS)
    expect(order(MOBILE_SPANS)).toEqual(STATIONS)
  })

  it('starts each station within reach of its chapter marker', () => {
    // chapters[].at drives rail dot placement and is measured on desktop, so it should
    // track the desktop entry key closely. A large gap means one of them went stale.
    for (const s of STATIONS) {
      const chapter = chapters.find((c) => c.id === s)
      expect(chapter, `no chapter for station ${s}`).toBeDefined()
      expect(Math.abs(chapter!.at - DESKTOP_SPANS[s][0])).toBeLessThan(0.03)
    }
  })
})
