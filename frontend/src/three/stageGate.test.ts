import { describe, expect, it } from 'vitest'
import { shouldRenderStage } from './stageGate'

const base = { webgl: true, reducedMotion: false, saveData: false }

describe('shouldRenderStage', () => {
  it('renders when WebGL is available and motion is welcome', () => {
    expect(shouldRenderStage(base)).toBe(true)
  })

  it('refuses without WebGL', () => {
    expect(shouldRenderStage({ ...base, webgl: false })).toBe(false)
  })

  it('refuses under reduced motion', () => {
    expect(shouldRenderStage({ ...base, reducedMotion: true })).toBe(false)
  })

  it('refuses when the visitor asked to save data', () => {
    expect(shouldRenderStage({ ...base, saveData: true })).toBe(false)
  })
})
