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

  it('offers work, résumé, LinkedIn, and GitHub as the calls to action', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: /view work/i })).toHaveAttribute('href', '#work')
    expect(screen.getByRole('link', { name: /résumé/i })).toHaveAttribute('href', profile.cvUrl)
    expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
      'href',
      'https://github.com/moeezahmadkhan',
    )
  })

  // LinkedIn is where Moeez wants visitors to end up, and until now it appeared
  // only in the footer and the contact list — the two places furthest from where
  // a recruiter starts reading. The hero is the most-seen part of the page.
  it('puts LinkedIn in the hero, with the href read from the content module', () => {
    render(<Hero />)
    const linkedin = profile.socials.find((s) => s.label === 'LinkedIn')
    expect(linkedin, 'profile.socials must carry a LinkedIn entry').toBeDefined()
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
      'href',
      linkedin!.href,
    )
  })

  it('opens every external call to action safely in a new tab', () => {
    render(<Hero />)
    for (const name of [/résumé/i, /linkedin/i, /github/i]) {
      const link = screen.getByRole('link', { name })
      expect(link, String(name)).toHaveAttribute('target', '_blank')
      expect(link, String(name)).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    }
  })
})
