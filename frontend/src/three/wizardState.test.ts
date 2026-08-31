import { beforeEach, describe, expect, it } from 'vitest'
import { setWizardMode, targetIntensity, wizardState } from './wizardState'

describe('wizardState', () => {
  beforeEach(() => setWizardMode('idle'))

  it('starts idle', () => {
    expect(wizardState.mode).toBe('idle')
  })

  it('changes mode in place without replacing the object', () => {
    const ref = wizardState
    setWizardMode('casting')
    expect(ref.mode).toBe('casting')
  })

  it('maps each mode to a wand intensity, brightest while casting', () => {
    expect(targetIntensity('idle')).toBeLessThan(targetIntensity('attentive'))
    expect(targetIntensity('attentive')).toBeLessThan(targetIntensity('casting'))
  })
})
