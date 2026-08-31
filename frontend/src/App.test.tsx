import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders exactly one h1', () => {
    render(<App />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders every section landmark in reading order', () => {
    const { container } = render(<App />)
    const ids = [...container.querySelectorAll('section[id]')].map((el) => el.id)
    expect(ids).toEqual(['top', 'about', 'work', 'skills', 'experience', 'contact'])
  })

  it('has a skip link that targets the main landmark', () => {
    const { container } = render(<App />)
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
    expect(container.querySelector('main')).toHaveAttribute('id', 'main')
  })
})
