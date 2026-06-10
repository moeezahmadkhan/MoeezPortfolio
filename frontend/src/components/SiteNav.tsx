import { useEffect, useState } from 'react'
import './SiteNav.css'

const LINKS = [
  { href: '#wizard', label: 'The Wizard' },
  { href: '#spells', label: 'Spells' },
  { href: '#grimoire', label: 'Grimoire' },
  { href: '#chronicles', label: 'Chronicles' },
]

/* Sticky wizard nav — solais-style mono bar + pill CTA, hidden over the hero,
   slides in once the reader descends past the first screen. */
export function SiteNav() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.7)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = (e: React.MouseEvent) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className={`nav ${visible ? 'nav--visible' : ''}`}>
      <a className="nav__brand" href="#" onClick={toTop} aria-label="Back to top">
        <span className="nav__rune">✦</span>
        <span className="nav__brand-text">M·A·K</span>
        <span className="nav__brand-sub">// the archive</span>
      </a>

      <nav className="nav__links" aria-label="Chapters">
        {LINKS.map((l) => (
          <a key={l.href} className="nav__link" href={l.href}>
            {l.label}
          </a>
        ))}
      </nav>

      <a className="nav__cta" href="#owlpost">
        Send an Owl <span className="nav__rune">✦</span>
      </a>
    </header>
  )
}
