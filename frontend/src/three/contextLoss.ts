/**
 * Watches a canvas for WebGL context loss.
 *
 * A browser may take the GPU context away at any time, and phones do it
 * routinely: under memory pressure, when the tab is backgrounded, when too many
 * contexts exist at once. When it happens the canvas goes blank and three.js
 * does not bring it back on its own — so a hero built on WebGL simply
 * disappears and stays gone for the rest of the visit, no matter how the
 * visitor scrolls.
 *
 * Nothing in this codebase handled that until now, and no desktop harness can
 * see it: SwiftShader never loses a context. It is invisible until someone
 * reports "the model vanished on my phone".
 *
 * `preventDefault` on the loss event is the load-bearing line, not boilerplate.
 * It is how a page tells the browser it intends to come back; without it
 * `webglcontextrestored` is never fired at all, and a transient blip becomes
 * permanent.
 */
export function watchContextLoss(
  canvas: HTMLCanvasElement,
  on: { lost: () => void; restored: () => void },
): () => void {
  const onLost = (event: Event) => {
    event.preventDefault()
    on.lost()
  }
  const onRestored = () => on.restored()

  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', onRestored)

  return () => {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', onRestored)
  }
}
