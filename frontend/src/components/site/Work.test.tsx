import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { projects } from '../../content'
import { Work } from './Work'

describe('Work', () => {
  it('renders every featured project as an article with a heading', () => {
    render(<Work />)
    for (const project of projects.filter((p) => p.featured)) {
      const card = screen.getByRole('article', { name: project.name })
      expect(within(card).getByText(project.outcome)).toBeInTheDocument()
      for (const tech of project.stack) {
        expect(within(card).getByText(tech)).toBeInTheDocument()
      }
    }
  })

  it('lists the non-featured projects separately', () => {
    render(<Work />)
    const earlier = screen.getByRole('list', { name: /earlier work/i })
    for (const project of projects.filter((p) => !p.featured)) {
      expect(within(earlier).getByText(project.name)).toBeInTheDocument()
    }
  })

  it('opens external project links in a new tab safely', () => {
    render(<Work />)
    const withRepo = projects.find((p) => p.links?.repo)
    if (!withRepo) return
    const link = screen.getByRole('link', { name: new RegExp(`${withRepo.name}.*(code|repo)`, 'i') })
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })
})
