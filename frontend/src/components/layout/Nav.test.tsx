import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Nav, NAV_ITEMS } from './Nav'

describe('Nav', () => {
  it('renders one anchor per section', () => {
    render(<Nav />)
    const nav = screen.getByRole('navigation', { name: /primary/i })
    expect(nav).toBeInTheDocument()
    for (const item of NAV_ITEMS) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', `#${item.id}`)
    }
  })

  it('exposes a resume link that opens the CV', () => {
    render(<Nav />)
    expect(screen.getByRole('link', { name: /résumé/i })).toHaveAttribute(
      'href',
      '/Moeez_Ahmad_Khan_CV.pdf',
    )
  })
})
