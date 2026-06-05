import { useScroll, useSpring, motion } from 'framer-motion'
import { getLenis } from '../smoothScroll'
import { chapters } from '../chapters'
import './ScrollRail.css'

/** A vertical "wand" on the page edge whose glowing core fills with scroll progress. */
export function ScrollRail() {
  const onJump = (e: React.MouseEvent, id: string) => {
    const lenis = getLenis()
    if (!lenis) return // reduced-motion / not ready → let native #anchor work
    e.preventDefault()
    lenis.scrollTo(`#${id}`, { offset: 0 })
  }

  const { scrollYProgress } = useScroll()
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  return (
    <nav className="rail" aria-label="Chapters">
      <div className="rail__track">
        <motion.div className="rail__fill" style={{ scaleY: fill }} />
      </div>
      <ul className="rail__marks">
        {chapters.map((c) => (
          <li key={c.id} className="rail__mark-item" style={{ '--at': `${c.at * 100}%` } as React.CSSProperties}>
            <a href={`#${c.id}`} className="rail__mark" aria-label={`Chapter ${c.numeral}`} onClick={(e) => onJump(e, c.id)}>
              <span className="rail__dot" />
              <span className="rail__num">{c.numeral}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
