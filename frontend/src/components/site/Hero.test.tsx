import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { profile } from '../../content'
import { Hero } from './Hero'

describe('Hero', () => {
  it('renders the name as the only h1 and the thesis as text', () => {
    render(<Hero />)
    expect(screen.getByRole('heading', { level: 1, name: profile.name })).toBeInTheDocument()
    expect(screen.getByText(profile.thesis)).toBeInTheDocument()
  })

  it('offers work, résumé, and GitHub as the three calls to action', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /view work/i })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: /résumé/i })).toHaveAttribute('href', profile.cvUrl)
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      'https://github.com/moeezahmadkhan',
    )
  })
})
