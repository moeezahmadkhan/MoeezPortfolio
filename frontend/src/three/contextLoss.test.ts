import { describe, expect, it, vi } from 'vitest'
import { watchContextLoss } from './contextLoss'

function canvasWithEvents() {
  return document.createElement('canvas')
}

/** A `webglcontextlost` event, which must be cancelable for preventDefault to mean anything. */
function lostEvent() {
  return new Event('webglcontextlost', { cancelable: true })
}

describe('watchContextLoss', () => {
  it('tells the browser we intend to restore, then reports the loss', () => {
    // `preventDefault` is the whole reason this wrapper exists rather than two
    // bare addEventListener calls. Without it the browser will never fire
    // `webglcontextrestored`, and the canvas stays dead for the rest of the
    // page's life — which is exactly the "it vanished and never came back"
    // symptom this is here to stop.
    const canvas = canvasWithEvents()
    const lost = vi.fn()
    watchContextLoss(canvas, { lost, restored: vi.fn() })

    const event = lostEvent()
    canvas.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(lost).toHaveBeenCalledTimes(1)
  })

  it('reports a restored context', () => {
    const canvas = canvasWithEvents()
    const restored = vi.fn()
    watchContextLoss(canvas, { lost: vi.fn(), restored })

    canvas.dispatchEvent(new Event('webglcontextrestored'))

    expect(restored).toHaveBeenCalledTimes(1)
  })

  it('stops listening once cleaned up', () => {
    // The canvas outlives a React effect on a fast remount; a listener left
    // behind would call setState on a component that is gone.
    const canvas = canvasWithEvents()
    const lost = vi.fn()
    const stop = watchContextLoss(canvas, { lost, restored: vi.fn() })

    stop()
    canvas.dispatchEvent(lostEvent())

    expect(lost).not.toHaveBeenCalled()
  })

  it('survives a loss and a later restore, in that order', () => {
    const canvas = canvasWithEvents()
    const calls: string[] = []
    watchContextLoss(canvas, {
      lost: () => calls.push('lost'),
      restored: () => calls.push('restored'),
    })

    canvas.dispatchEvent(lostEvent())
    canvas.dispatchEvent(new Event('webglcontextrestored'))
    canvas.dispatchEvent(lostEvent())

    expect(calls).toEqual(['lost', 'restored', 'lost'])
  })
})
