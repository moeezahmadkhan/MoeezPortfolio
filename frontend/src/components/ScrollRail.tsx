import { useScroll, useSpring, motion } from 'framer-motion'
import './ScrollRail.css'

const chapters = [
  { id: 'top', label: 'I' },
  { id: 'wizard', label: 'II' },
  { id: 'spells', label: 'III' },
  { id: 'grimoire', label: 'IV' },
  { id: 'chronicles', label: 'V' },
  { id: 'owlpost', label: 'VI' },
]

/** A vertical "wand" on the page edge whose glowing core fills with scroll progress. */
export function ScrollRail() {
  const { scrollYProgress } = useScroll()
  const fill = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })

  return (
    <nav className="rail" aria-label="Chapters">
      <div className="rail__track">
        <motion.div className="rail__fill" style={{ scaleY: fill }} />
      </div>
      <ul className="rail__marks">
        {chapters.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className="rail__mark" aria-label={`Chapter ${c.label}`}>
              <span className="rail__dot" />
              <span className="rail__num">{c.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
