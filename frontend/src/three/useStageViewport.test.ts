import { describe, expect, it } from 'vitest'
import { DPR_CEILING, DPR_CEILING_MOBILE, stageDpr } from './useStageViewport'

describe('stageDpr', () => {
  // Measured against the built site: at a 1440x900 viewport on a dpr-1 display
  // the canvas backing store came back 2160x1350. R3F's `dpr` prop had been
  // given a bare 1.5, which is a value, not a cap — so every dpr-1 monitor (an
  // ordinary external display, a non-retina laptop) rendered 2.25x the pixels
  // it could show and downsampled them away.
  it('never renders more pixels than the display has', () => {
    expect(stageDpr(1, false)).toBe(1)
    expect(stageDpr(1, true)).toBe(1)
  })

  it('still caps a dense display at the viewport budget', () => {
    expect(stageDpr(2, false)).toBe(DPR_CEILING)
    expect(stageDpr(3, false)).toBe(DPR_CEILING)
    expect(stageDpr(3, true)).toBe(DPR_CEILING_MOBILE)
  })

  it('holds mobile to a tighter budget than desktop', () => {
    expect(DPR_CEILING_MOBILE).toBeLessThan(DPR_CEILING)
    expect(stageDpr(3, true)).toBeLessThan(stageDpr(3, false))
  })

  it('takes the display ratio when it sits between 1 and the ceiling', () => {
    expect(stageDpr(1.25, false)).toBeCloseTo(1.25, 6)
  })

  it('falls back to 1 when the browser reports nothing usable', () => {
    // Never 0 or NaN: either would size the backing store to nothing.
    expect(stageDpr(0, false)).toBe(1)
    expect(stageDpr(Number.NaN, false)).toBe(1)
  })
})
