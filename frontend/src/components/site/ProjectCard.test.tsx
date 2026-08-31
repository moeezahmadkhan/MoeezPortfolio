import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Project } from '../../content'
import { clearProjectFocus, focusState } from '../../lib/focusState'
import { ProjectCard } from './ProjectCard'

// A standalone fixture, not one of the real content/projects.ts entries, so this
// test controls exactly what links exist to tab to.
const project: Project = {
  slug: 'test-project',
  name: 'Test Project',
  outcome: 'Ships a thing reliably.',
  detail: ['Does a thing.'],
  stack: ['TypeScript'],
  links: { repo: 'https://example.com/repo' },
  featured: true,
}

describe('ProjectCard', () => {
  beforeEach(() => clearProjectFocus())

  it('sets project focus with source "pointer" on pointer enter', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={project} />)
    const card = screen.getByRole('article', { name: project.name })

    await user.hover(card)

    expect(focusState.projectSlug).toBe(project.slug)
    expect(focusState.source).toBe('pointer')
  })

  it('clears project focus on pointer leave', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={project} />)
    const card = screen.getByRole('article', { name: project.name })

    await user.hover(card)
    await user.unhover(card)

    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })

  it('sets project focus with source "keyboard" when a link inside is tabbed to', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={project} />)

    await user.tab()

    expect(screen.getByRole('link', { name: /code/i })).toHaveFocus()
    expect(focusState.projectSlug).toBe(project.slug)
    expect(focusState.source).toBe('keyboard')
  })

  it('clears project focus when the tabbed-to link blurs', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={project} />)

    await user.tab()
    await user.tab()

    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })
})
