import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/media', () => ({
  hasWebGL: () => false,
  prefersReducedMotion: () => false,
  isCoarsePointer: () => false,
}))

describe('StageMount', () => {
  it('falls back to static art when the gate refuses, and loads no WebGL', async () => {
    const { StageMount } = await import('./StageMount')
    render(<StageMount />)
    expect(screen.getByRole('img', { name: /wizard/i })).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
