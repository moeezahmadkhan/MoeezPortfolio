import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { prefersReducedMotion } from '../smoothScroll'
import './Hero.css'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.14, delayChildren: 0.35 },
  },
}

const rise = {
  hidden: { opacity: 0, y: 26, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
  },
}

export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null)

  // Faint pointer parallax on the copy block — the figurine already reacts to
  // the pointer in the 3D scene, so the text drifts the opposite way a touch to
  // feel like it shares the same air. CSS vars + a transition keep it cheap;
  // skipped on coarse pointers and under reduced motion.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return

    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2
        const ny = (e.clientY / window.innerHeight - 0.5) * 2
        stage.style.setProperty('--px', String(-nx * 7))
        stage.style.setProperty('--py', String(-ny * 5))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    // Tall pinned section: the sticky stage holds the hero centred while the
    // figurine turns a full 360° behind it (see CameraRig KEYS + WizardModel spin),
    // then releases into the About chapter.
    <header className="hero" id="top">
      <div className="hero__stage" ref={stageRef}>
        <motion.div className="hero__inner" variants={container} initial="hidden" animate="show">
          <motion.div className="hero__status" variants={rise}>
            <span className="hero__status-dot" aria-hidden="true" />
            Available for new conjurings
            <span className="hero__status-sep" aria-hidden="true" />
            <span className="hero__status-loc">Remote · Lahore, PK</span>
          </motion.div>

          <motion.p className="eyebrow hero__eyebrow" variants={rise}>
            <span className="hero__eyebrow-rule" aria-hidden="true" />
            Chapter I — The Conjuring
          </motion.p>

          <motion.h1 className="hero__name" variants={rise} aria-label="Moeez Ahmad Khan">
            <span className="hero__name-line" data-text="Moeez">Moeez</span>
            <span className="hero__name-line" data-text="Ahmad">Ahmad</span>
            <span className="hero__name-line hero__name-line--gold" data-text="Khan">Khan</span>
          </motion.h1>

          <motion.p className="hero__title" variants={rise}>
            AI&nbsp;/&nbsp;ML engineer building autonomous agents, computer-vision
            pipelines &amp; generative systems — conjured from brief to deploy.
          </motion.p>

          <motion.code className="hero__spell" variants={rise} aria-hidden="true">
            <span className="hero__spell-prompt">&gt;</span> cast(<span className="hero__spell-arg">"intelligence"</span>) · YOLO · ArcFace · QLoRA · FAISS · LLMs
            <span className="hero__spell-caret" />
          </motion.code>

          <motion.div className="hero__actions" variants={rise}>
            <a className="btn btn--primary" href="#grimoire">
              <span>Open the Grimoire</span>
              <span className="btn__glyph" aria-hidden="true">→</span>
            </a>
            <a className="btn btn--ghost" href="/Moeez_Ahmad_Khan_CV.pdf" target="_blank" rel="noreferrer">
              <span>The Scroll (CV)</span>
              <span className="btn__glyph" aria-hidden="true">↗</span>
            </a>
            <a
              className="btn btn--ghost"
              href="https://github.com/moeezahmadkhan"
              target="_blank"
              rel="noreferrer"
              aria-label="The Spellbook — Moeez on GitHub"
            >
              <span>The Spellbook (GitHub)</span>
              <span className="btn__glyph" aria-hidden="true">↗</span>
            </a>
          </motion.div>
        </motion.div>

        <motion.a
          href="#wizard"
          className="hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 1 }}
          aria-label="Scroll to descend into the archive"
        >
          <span>scroll to descend</span>
          <span className="hero__scroll-line" aria-hidden="true" />
        </motion.a>
      </div>
    </header>
  )
}
