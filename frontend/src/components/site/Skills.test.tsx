import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { skills } from '../../content'
import { Skills } from './Skills'

describe('Skills', () => {
  it('renders each group as a labelled list', () => {
    render(<Skills />)
    for (const group of skills) {
      const list = screen.getByRole('list', { name: group.title })
      for (const item of group.items) {
        expect(within(list).getByText(item)).toBeInTheDocument()
      }
    }
  })
})
