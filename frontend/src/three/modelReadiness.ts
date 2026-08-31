// Debug-only readiness channel for `tools/shoot.mjs`. `CharacterRig` marks a
// rig ready once its cross-fade has visibly settled in — i.e. not just
// "Suspense resolved" (the model bytes are in), but "the scene has actually
// rendered it at close to full opacity" — so the screenshot tool can wait on
// real, honest state instead of guessing a fixed sleep. A production visitor
// never reads `window.__modelReady`, so this costs exactly one property
// write per rig per page load and nothing more.

declare global {
  interface Window {
    __modelReady?: Record<string, true>
  }
}

/** Marks rig `id` (e.g. 'hero', 'work', 'experience') as visibly settled. */
export function markModelReady(id: string): void {
  if (typeof window === 'undefined') return
  ;(window.__modelReady ??= {})[id] = true
}
