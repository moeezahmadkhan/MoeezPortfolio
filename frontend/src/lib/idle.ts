// A busy `useFrame` render loop (the Canvas here renders every frame, with
// Bloom/Vignette postprocessing on top) can leave the main thread with no
// truly idle gaps for a long time, especially on software rendering or a
// weak GPU — `requestIdleCallback` alone could then defer far longer than
// intended. Its own `timeout` option forces the callback to run by this
// deadline regardless, so a lookahead fetch still starts promptly on a busy
// page instead of only ever running on a quiet one.
const IDLE_TIMEOUT_MS = 1500

/**
 * Schedules `cb` for a browser idle period (or after `IDLE_TIMEOUT_MS`,
 * whichever comes first), falling back to a short timeout on engines without
 * `requestIdleCallback` (Safari). Returns a canceller so a caller that
 * unmounts or moves on before the callback fires can drop it.
 */
export function whenIdle(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => cb(), { timeout: IDLE_TIMEOUT_MS })
    return () => window.cancelIdleCallback?.(id)
  }
  const id = window.setTimeout(cb, 1)
  return () => window.clearTimeout(id)
}
