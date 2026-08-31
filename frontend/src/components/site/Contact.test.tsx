import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { profile } from '../../content'
import { Contact } from './Contact'

describe('Contact', () => {
  it('shows the direct email as a mailto link', () => {
    render(<Contact />)
    expect(screen.getByRole('link', { name: profile.email })).toHaveAttribute(
      'href',
      `mailto:${profile.email}`,
    )
  })

  it('reports field errors instead of submitting an empty form', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<Contact />)
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(await screen.findByText(/please share your name/i)).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('posts a valid message and confirms it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }),
    )
    render(<Contact />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Sam Recruiter')
    await userEvent.type(screen.getByLabelText(/email/i), 'sam@example.com')
    await userEvent.type(screen.getByLabelText(/message/i), 'We have a CV role open.')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/thanks/i))
  })
})
