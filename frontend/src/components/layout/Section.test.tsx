import { readFileSync } from 'node:fs'
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

describe('anchored sections clear the fixed nav', () => {
  const css = readFileSync('src/components/layout/Section.css', 'utf8')

  it('reserves the nav height as scroll margin', () => {
    // Measured before this: scroll-margin-top computed to 0px under a 64px
    // fixed nav, so every anchor jump and every scrollIntoView parked the
    // section heading underneath the header. Reproduced on Skills and Contact
    // at 390x844.
    expect(css).toMatch(/scroll-margin-top:\s*calc\(var\(--nav-h\)\s*\+\s*var\(--s-3\)\)/)
  })
})
