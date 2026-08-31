import { describe, expect, it } from 'vitest'
import { heroVisibility, scrollState } from './scrollState'

describe('heroVisibility', () => {
  it('is 1 while the hero still fills the viewport', () => {
    expect(heroVisibility(900, 900)).toBe(1)
  })

  it('is 0 once the hero has fully left', () => {
    expect(heroVisibility(0, 900)).toBe(0)
    expect(heroVisibility(-200, 900)).toBe(0)
  })

  it('falls off linearly across the last screen of the hero', () => {
    expect(heroVisibility(450, 900)).toBeCloseTo(0.5, 5)
  })
})

describe('scrollState', () => {
  it('starts at a neutral pose', () => {
    expect(scrollState).toMatchObject({
      progress: 0,
      pointerX: 0,
      pointerY: 0,
      heroVisible: 1,
    })
  })
})
