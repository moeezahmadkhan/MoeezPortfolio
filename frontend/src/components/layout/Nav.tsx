import { useEffect, useMemo, useRef, useState } from 'react'
import { profile } from '../../content'
import { useScramble } from '../../lib/useScramble'
import { useSectionObserver } from '../../lib/useSectionObserver'
import { markerGeometry, markerTransform } from './navMarker'
import './Nav.css'

export const NAV_ITEMS = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Work' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
]

/**
 * Every section the page observes, in page order — the hero first, then the
 * nav's own.
 *
 * The hero has no nav item, which is why it was originally left out; that was
 * the bug. `useSectionObserver` only commits a truthy id, so with the hero
 * unobserved there was no way back to "no section owns the screen": scrolling
 * to About and returning to the top left `active` stuck on 'about'. The nav
 * kept About underlined at the top of the page, and SceneDirector — reading a
 * section that has no rig — faded the hero model out and never brought it
 * back. On mobile, where the gate leaves the hero as the only model, one
 * scroll emptied the scene for the rest of the visit.
 *
 * Observing the hero makes returning to it a positive report rather than the
 * absence of one. It matches no nav item, so nothing is highlighted while the
 * visitor is up there — which is correct.
 */
export const SECTION_IDS = ['top', ...NAV_ITEMS.map((i) => i.id)]

/**
 * One nav item, its own component so the decode's hook is called once per link
 * rather than inside a `.map` callback.
 */
function NavLink({
  id,
  label,
  current,
  onNavigate,
}: {
  id: string
  label: string
  current: boolean
  onNavigate: () => void
}) {
  return (
    <a
      href={`#${id}`}
      className="nav__link"
      aria-current={current ? 'true' : undefined}
      onClick={onNavigate}
      {...useScramble(label)}
    >
      {label}
    </a>
  )
}

/** Written once: the decode resolves back to this exact string. */
const CV_LABEL = 'Résumé'

function CvLink() {
  return (
    <a
      className="nav__cv"
      href={profile.cvUrl}
      target="_blank"
      rel="noreferrer"
      {...useScramble(CV_LABEL)}
    >
      {CV_LABEL}
    </a>
  )
}

export function Nav() {
  const ids = useMemo(() => SECTION_IDS, [])
  const active = useSectionObserver(ids)
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)

  // Place the marker whenever the active section changes, and on resize.
  //
  // NOT per frame: the active item changes on section crossings, not
  // continuously, so a rAF loop here would burn a frame's work rewriting the
  // transform it wrote last time. The travel between items is the CSS
  // transition's job, not this effect's.
  useEffect(() => {
    const place = () => {
      const marker = markerRef.current
      if (!marker) return
      const link = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? null
      const geometry = markerGeometry(
        link ? { offsetLeft: link.offsetLeft, offsetWidth: link.offsetWidth } : null,
      )
      marker.style.transform = markerTransform(geometry)
      marker.style.opacity = geometry.visible ? '1' : '0'
    }
    place()
    window.addEventListener('resize', place, { passive: true })
    return () => window.removeEventListener('resize', place)
  }, [active])

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
        <nav
          id="nav-links"
          aria-label="Primary"
          className={`nav__links${open ? ' is-open' : ''}`}
          ref={listRef}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.id}
              id={item.id}
              label={item.label}
              current={active === item.id}
              onNavigate={() => setOpen(false)}
            />
          ))}
          <CvLink />
          <span className="nav__marker" ref={markerRef} aria-hidden="true" />
        </nav>
      </div>
    </header>
  )
}
