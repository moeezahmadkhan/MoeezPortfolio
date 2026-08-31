import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('renders React into a DOM and matches on accessible roles', () => {
    render(<h1>Moeez Ahmad Khan</h1>)
    expect(screen.getByRole('heading', { name: 'Moeez Ahmad Khan' })).toBeInTheDocument()
  })
})
