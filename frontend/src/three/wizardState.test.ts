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

  it('starts the wand already lit at the idle level, not dark', () => {
    // The hero mounts with `skipInitialFade`, i.e. already materialised rather
    // than dissolving in — that is deliberate, the first thing a visitor sees
    // should be a settled scene. Seeding this at 0 contradicted it: the wand,
    // which is most of what lights the figure, ramped up from black over about
    // a second, so for that second the hero was a dark shape. Screenshots taken
    // right after the rig reported ready came back with no visible figure at
    // all, which is what surfaced it.
    expect(wizardState.intensity).toBeCloseTo(targetIntensity('idle'), 6)
    expect(wizardState.intensity).toBeGreaterThan(0)
  })
})
