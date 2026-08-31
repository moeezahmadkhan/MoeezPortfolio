export type WizardMode = 'idle' | 'attentive' | 'casting'

/**
 * The wizard's mood. Written by the chat UI, read inside useFrame. A singleton for
 * the same reason scrollState is one: a keystroke in the chat box must not
 * re-render the canvas tree.
 */
export const wizardState = {
  mode: 'idle' as WizardMode,
  intensity: 0, // eased toward targetIntensity(mode) in the frame loop
}

export function setWizardMode(mode: WizardMode): void {
  wizardState.mode = mode
}

/** Wand-glow strength per mood. */
export function targetIntensity(mode: WizardMode): number {
  switch (mode) {
    case 'casting':
      return 1
    case 'attentive':
      return 0.55
    default:
      return 0.25
  }
}
