import { motion } from 'framer-motion'
import './Hero.css'

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16, delayChildren: 0.4 },
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
  return (
    // Tall pinned section: the sticky stage holds the hero centred while the
    // figurine turns a full 360° behind it (see CameraRig KEYS + WizardModel spin),
    // then releases into the About chapter.
    <header className="hero" id="top">
      <div className="hero__stage">
        <motion.div className="hero__inner" variants={container} initial="hidden" animate="show">
          <motion.p className="eyebrow hero__eyebrow" variants={rise}>
            ✦ Chapter I — The Conjuring ✦
          </motion.p>

          <motion.div className="hero__flourish" variants={rise} aria-hidden="true" />

          <motion.h1 className="hero__name" variants={rise}>
            <span className="hero__name-line">Moeez Ahmad</span>
            <span className="hero__name-line hero__name-line--gold">Khan</span>
          </motion.h1>

          <motion.p className="hero__title" variants={rise}>
            AI&nbsp;/&nbsp;ML&nbsp;Engineer — autonomous agents, computer-vision pipelines
            <br />
            &amp; generative systems, conjured from brief to deploy.
          </motion.p>

          <motion.code className="hero__spell" variants={rise}>
            &gt; cast("intelligence") · YOLO · ArcFace · QLoRA · FAISS · LLMs
          </motion.code>

          <motion.div className="hero__actions" variants={rise}>
            <a className="btn btn--primary" href="#grimoire">Open the Grimoire</a>
            <a className="btn btn--ghost" href="/Moeez_Ahmad_Khan_CV.pdf" target="_blank" rel="noreferrer">
              The Scroll (CV)
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__scroll"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
        >
          <span>scroll to descend</span>
          <span className="hero__scroll-line" />
        </motion.div>
      </div>
    </header>
  )
}
