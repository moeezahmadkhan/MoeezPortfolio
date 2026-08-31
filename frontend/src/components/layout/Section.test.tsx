import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Section } from './Section'

describe('Section', () => {
  it('renders a labelled landmark with the given id', () => {
    const { container } = render(
      <Section id="work" title="Work">
        <p>body</p>
      </Section>,
    )
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('id', 'work')
    const heading = screen.getByRole('heading', { level: 2, name: 'Work' })
    expect(section).toHaveAttribute('aria-labelledby', heading.id)
  })
})
