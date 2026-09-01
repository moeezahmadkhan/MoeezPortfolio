export type WizardMode = 'idle' | 'attentive' | 'casting'

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

/**
 * The wizard's mood. Written by the chat UI, read inside useFrame. A singleton for
 * the same reason scrollState is one: a keystroke in the chat box must not
 * re-render the canvas tree.
 *
 * `intensity` is seeded at the idle level rather than at 0. It is eased toward
 * `targetIntensity(mode)` in the frame loop, and starting it dark meant the
 * wand — which is most of what lights the figure — ignited over roughly a
 * second on every page load. That contradicts the hero's `skipInitialFade`,
 * whose entire point is that the first thing a visitor sees is a scene already
 * settled rather than one assembling itself. A mood CHANGE should still be
 * something you watch arrive; the opening state should not be.
 */
export const wizardState = {
  mode: 'idle' as WizardMode,
  intensity: targetIntensity('idle'),
}

export function setWizardMode(mode: WizardMode): void {
  wizardState.mode = mode
}
