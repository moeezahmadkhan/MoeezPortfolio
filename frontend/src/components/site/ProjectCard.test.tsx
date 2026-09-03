import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/**
 * Tabs forward until `target` has focus. Bounded, so a card that never gives it
 * focus fails the assertion that follows rather than hanging the run.
 */
async function tabTo(user: ReturnType<typeof userEvent.setup>, target: HTMLElement) {
  for (let i = 0; i < 6 && document.activeElement !== target; i++) await user.tab()
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

    // The detail disclosure's <summary> precedes the links in DOM order. Above
    // 900px it is `display: none` and so is not in the tab order at all, but
    // jsdom applies no CSS and cannot see that — so tab to the link rather than
    // assume it is first.
    await tabTo(user, screen.getByRole('link', { name: /code/i }))

    expect(screen.getByRole('link', { name: /code/i })).toHaveFocus()
    expect(focusState.projectSlug).toBe(project.slug)
    expect(focusState.source).toBe('keyboard')
  })

  it('keeps every outbound link nameable while its text is decoding', () => {
    // The hover decode rewrites the link's own text, so the accessible name has
    // to come from somewhere the animation cannot touch. Asserting it here is
    // also the only thing that notices if the decode is ever unwired from the
    // card: the hook's own tests would still pass.
    render(<ProjectCard project={project} />)
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('aria-label', link.textContent)
    }
  })

  it('clears project focus when the tabbed-to link blurs', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={project} />)

    await tabTo(user, screen.getByRole('link', { name: /code/i }))
    await user.tab()

    expect(focusState.projectSlug).toBe(null)
    expect(focusState.source).toBe(null)
  })
})

describe('the touch stand-in for hover', () => {
  const css = readFileSync('src/components/site/ProjectCard.css', 'utf8')

  it('gives .card.is-near the same affordance as :hover, on a coarse pointer only', () => {
    // The lift must live behind the pointer query. A fine pointer already has
    // :hover, and a card that ALSO lit on scroll there would fight the cursor.
    const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))
    expect(css).toContain('@media (pointer: coarse)')
    expect(coarse).toContain('.card.is-near')
  })

  it('strips the lift from .is-near under reduced motion, keeping the tint', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('.card.is-near')
    expect(reduced).toContain('transform: none')
  })
})

function stubMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('the detail disclosure', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is open on a wide screen, so desktop is exactly as it was', () => {
    stubMedia([])
    render(<ProjectCard project={project} />)
    expect(screen.getByRole('group')).toHaveAttribute('open')
  })

  it('is closed below 900px, where four bullets are two screens of text', () => {
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    expect(screen.getByRole('group')).not.toHaveAttribute('open')
  })

  it('never hides the bullets from the accessible tree', () => {
    // <details> keeps its content in the DOM and in the a11y tree, so every
    // bullet is still reachable. This is deferral, not removal.
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    for (const line of project.detail) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
  })

  it('labels the disclosure', () => {
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})
