import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { experience } from '../../content'
import { Experience } from './Experience'

describe('Experience', () => {
  it('renders each role with its org, period, and bullets', () => {
    render(<Experience />)
    for (const role of experience) {
      const heading = screen.getByRole('heading', { name: `${role.title} · ${role.org}` })
      const item = heading.closest('li') as HTMLElement
      expect(within(item).getByText(role.period)).toBeInTheDocument()
      for (const bullet of role.bullets) {
        expect(within(item).getByText(bullet)).toBeInTheDocument()
      }
    }
  })
})
