/**
 * Whether to mount WebGL at all. Pure so the policy is testable without a GPU.
 * Every "no" here must still leave a complete site behind — the canvas is
 * decoration, never content.
 */
export function shouldRenderStage(opts: {
  webgl: boolean
  reducedMotion: boolean
  saveData: boolean
}): boolean {
  return opts.webgl && !opts.reducedMotion && !opts.saveData
}

/** Reads the Save-Data client hint, where the browser exposes it. */
export function prefersSaveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}
