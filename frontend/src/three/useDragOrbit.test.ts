import { describe, expect, it } from 'vitest'
import { applyDrag, MAX_ORBIT } from './useDragOrbit'

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
