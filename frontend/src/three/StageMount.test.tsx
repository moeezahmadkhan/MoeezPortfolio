import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const media = vi.hoisted(() => ({ webgl: false }))

vi.mock('../lib/media', () => ({
  hasWebGL: () => media.webgl,
  prefersReducedMotion: () => false,
  isCoarsePointer: () => false,
}))

// A Stage module whose import never settles, so what renders is the Suspense
// fallback — the exact state every WebGL visitor is in while the three chunk
// (~280KB gzipped) is still in flight.
vi.mock('./Stage', () => new Promise(() => {}))

describe('StageMount', () => {
  it('falls back to static art when the gate refuses, and loads no WebGL', async () => {
    media.webgl = false
    const { StageMount } = await import('./StageMount')
    render(<StageMount />)
    expect(screen.getByRole('img', { name: /wizard/i })).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })

  it('requests no image while the stage chunk is still loading', async () => {
    // The still frame is a 346KB PNG. Using it as the Suspense fallback meant
    // every WebGL visitor downloaded it and threw it away a second later — 16%
    // of the measured mobile payload for a frame nobody sees for long. The
    // placeholder that stands in for it is CSS, and costs nothing.
    media.webgl = true
    const { StageMount } = await import('./StageMount')
    render(<StageMount />)
    expect(document.querySelector('img')).toBeNull()
    // ...and it is still a stage-shaped layer, not a hole in the page.
    expect(document.querySelector('.stage')).not.toBeNull()
  })
})
