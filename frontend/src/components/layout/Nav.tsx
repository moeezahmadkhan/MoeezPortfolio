import { useEffect, useMemo, useState } from 'react'
import { profile } from '../../content'
import { useSectionObserver } from '../../lib/useSectionObserver'
import './Nav.css'

export const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

export function Nav() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), [])
  const active = useSectionObserver(ids)
  const [open, setOpen] = useState(false)

  // Close the mobile menu on Escape and whenever a link is followed.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="nav">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="nav__inner">
        <a className="nav__brand" href="#top">
          {profile.name}
        </a>
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
        <nav id="nav-links" aria-label="Primary" className={`nav__links${open ? ' is-open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="nav__link"
              aria-current={active === item.id ? 'true' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a className="nav__cv" href={profile.cvUrl} target="_blank" rel="noreferrer">
            Résumé
          </a>
        </nav>
      </div>
    </header>
  )
}
