import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { profile } from '../../content'
import { About } from './About'

describe('About', () => {
  it('renders every bio paragraph', () => {
    render(<About />)
    for (const para of profile.bio) {
      expect(screen.getByText(para)).toBeInTheDocument()
    }
  })

  it('renders the stat strip as a description list', () => {
    render(<About />)
    for (const stat of profile.stats) {
      expect(screen.getByText(stat.value)).toBeInTheDocument()
      expect(screen.getByText(stat.label)).toBeInTheDocument()
    }
  })

  it('gives the portrait real alternative text', () => {
    render(<About />)
    expect(screen.getByRole('img', { name: /moeez ahmad khan/i })).toHaveAttribute(
      'src',
      profile.portrait,
    )
  })
})
