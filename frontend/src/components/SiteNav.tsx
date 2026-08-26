import { useEffect, useState } from 'react'
import { chapters } from '../chapters'
import './SiteNav.css'

/* Themed label + plain-language translation, so a visitor who doesn't speak
   Hogwarts can still map the chapters (same pattern as "The Scroll (CV)"). */
const LINKS = [
  { href: '#wizard', label: 'The Wizard', plain: 'about' },
  { href: '#spells', label: 'Spells', plain: 'skills' },
  { href: '#grimoire', label: 'Grimoire', plain: 'projects' },
  { href: '#chronicles', label: 'Chronicles', plain: 'experience' },
]

const SOCIALS = [
  {
    href: 'https://github.com/moeezahmadkhan',
    label: 'GitHub',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    ),
  },
  {
    href: 'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/',
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden>
        <path d="M13.63 13.63h-2.37V9.92c0-.89-.02-2.03-1.24-2.03-1.24 0-1.43.97-1.43 1.96v3.78H6.22V6h2.28v1.04h.03c.32-.6 1.09-1.24 2.25-1.24 2.4 0 2.85 1.58 2.85 3.64v4.19ZM3.54 4.96a1.38 1.38 0 1 1 0-2.75 1.38 1.38 0 0 1 0 2.75ZM4.73 13.63H2.36V6h2.37v7.63ZM14.82 0H1.18C.53 0 0 .52 0 1.16v13.68C0 15.48.53 16 1.18 16h13.63c.65 0 1.19-.52 1.19-1.16V1.16C16 .52 15.46 0 14.82 0Z" />
      </svg>
    ),
  },
]

/* Sticky wizard nav — solais-style mono bar + pill CTA, hidden over the hero,
   slides in once the reader descends past the first screen. */
export function SiteNav() {
  const [visible, setVisible] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!indexOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIndexOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [indexOpen])

  const toTop = (e: React.MouseEvent) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
    <header className={`nav ${visible ? 'nav--visible' : ''}`} role="none">
      <a className="nav__brand" href="#" onClick={toTop} aria-label="Back to top">
        <span className="nav__rune">✦</span>
        <span className="nav__brand-text">M·A·K</span>
        <span className="nav__brand-sub">// the archive</span>
      </a>

      <nav className="nav__links" aria-label="Chapters">
        {LINKS.map((l) => (
          <a key={l.href} className="nav__link" href={l.href}>
            {l.label}
            <span className="nav__link-plain"> · {l.plain}</span>
          </a>
        ))}
      </nav>

      <div className="nav__end">
        <div className="nav__socials">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              className="nav__social"
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              title={s.label}
            >
              {s.icon}
            </a>
          ))}
        </div>
        <a className="nav__cta" href="#owlpost">
          Send an Owl <span className="nav__rune">✦</span>
        </a>
        <button
          type="button"
          className="nav__index-btn"
          aria-label="Open chapter index"
          aria-expanded={indexOpen}
          aria-controls="nav-index"
          onClick={() => setIndexOpen(true)}
        >
          ☰
        </button>
      </div>

    </header>

      {/* Grimoire index — full-screen table of contents for small screens.
          Rendered outside the header: its backdrop-filter/transform would
          otherwise become the containing block for this fixed overlay. */}
      <div id="nav-index" className={`nav__index ${indexOpen ? 'nav__index--open' : ''}`} role="dialog" aria-modal="true" aria-label="Chapter index">
        <div className="nav__index-head">
          <span className="nav__index-title">✦ The Index</span>
          <button type="button" className="nav__index-close" aria-label="Close chapter index" onClick={() => setIndexOpen(false)}>
            ✕
          </button>
        </div>
        <ol className="nav__index-list">
          {chapters.map((c) => (
            <li key={c.id}>
              <a href={`#${c.id}`} onClick={() => setIndexOpen(false)}>
                <span className="nav__index-numeral">{c.numeral}</span>
                <span className="nav__index-theme">{c.theme}</span>
                <span className="nav__index-plain">{c.plain}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="nav__index-socials">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>
              {s.icon} {s.label}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
