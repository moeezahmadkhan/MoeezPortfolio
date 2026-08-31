import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Reveal } from './Reveal'

vi.mock('../../lib/media', () => ({ prefersReducedMotion: () => true }))

describe('Reveal', () => {
  it('renders its children visible immediately under reduced motion', () => {
    render(
      <Reveal>
        <p>content</p>
      </Reveal>,
    )
    const el = screen.getByText('content').parentElement as HTMLElement
    expect(el.className).toContain('is-shown')
  })
})
