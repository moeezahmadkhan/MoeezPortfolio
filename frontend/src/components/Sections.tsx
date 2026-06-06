import { useRef, useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { Reveal, IgniteHeading, MaskReveal } from './Reveal'
import { OwlPostForm } from './OwlPostForm'
import { Tilt } from './Tilt'
import { projects, spellbook, chronicles } from '../data'
import { spellState, NODES } from '../scene/spell/spell'
import { useParallax } from './useParallax'
import './sections.css'

export function About() {
  return (
    <section id="wizard" className="section section--about">
      <div className="section__wrap about">
        <MaskReveal className="about__eyebrow">
          <span className="eyebrow">Chapter II — The Wizard</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="The mind behind the wand" />
        <Reveal delay={0.1}>
          <p className="about__lede">
            I’m <strong>Moeez Ahmad Khan</strong> — an AI/ML engineer who treats models like spells:
            precise incantations that turn raw data into something that <em>acts</em>. I architect
            autonomous agents, high-performance computer-vision pipelines, and generative systems,
            then carry them from research into production-ready software.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="about__sub">
            Trained at Information Technology University, Lahore (BSCS — specializing in Agentic AI,
            Computer Vision &amp; Reinforcement Learning), I live in the space between a research
            paper and a deploy button.
          </p>
        </Reveal>

        <div className="about__stats">
          {[
            { k: '15+', v: 'production AI deployments' },
            { k: '3', v: 'houses served — Steem · QUIDSol · ITU' },
            { k: '∞', v: 'agents conjured' },
          ].map((s, i) => (
            <Reveal key={s.v} delay={0.1 * i} className="stat">
              <span className="stat__k">{s.k}</span>
              <span className="stat__v">{s.v}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Spells() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })
  const [step, setStep] = useState(0)
  const last = spellbook.length - 1
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const idx = Math.floor(p * spellbook.length)
    setStep(Math.max(0, Math.min(last, idx)))
  })

  return (
    <section id="spells" ref={ref} className="section section--spells spells--pinned">
      <div className="spells__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter III — The Arsenal</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="Spells & Incantations" />

        <div className="spells__steps">
          <div className="spells__index" aria-hidden>
            {String(step + 1).padStart(2, '0')}
            <span className="spells__index-total">/ {String(spellbook.length).padStart(2, '0')}</span>
          </div>

          <div className="spells__panel">
            {spellbook.map((group, i) => (
              <motion.div
                key={group.title}
                className="spell-group spell-group--step"
                animate={{ opacity: i === step ? 1 : 0, y: i === step ? 0 : 24 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ pointerEvents: i === step ? 'auto' : 'none' }}
              >
                <h3 className="spell-group__title">{group.title}</h3>
                <ul className="spell-group__list">
                  {group.spells.map((s) => (
                    <li key={s} className="spell-chip">
                      <span className="spell-chip__rune">✦</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GrimoireCard({ p, i }: { p: (typeof projects)[number]; i: number }) {
  const [ref, y] = useParallax(40 + (i % 3) * 18)
  return (
    <motion.div ref={ref as React.RefObject<HTMLDivElement>} style={{ y }}>
      <Reveal delay={0.06 * i}>
        <Tilt className="spell-card">
          <div className="spell-card__glyph">{p.glyph}</div>
          <p className="spell-card__incant">“{p.incantation}”</p>
          <h3 className="spell-card__name">{p.name}</h3>
          <p className="spell-card__blurb">{p.blurb}</p>
          <ul className="spell-card__tags">
            {p.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Tilt>
      </Reveal>
    </motion.div>
  )
}

export function Grimoire() {
  return (
    <section id="grimoire" className="section section--grimoire">
      <div className="section__wrap">
        <MaskReveal>
          <span className="eyebrow">Chapter V — The Grimoire</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">✦ Projects · shipped work</span>
        <IgniteHeading className="section__title" text="Built & shipped" />
        <div className="grimoire__grid">
          {projects.map((p, i) => (
            <GrimoireCard key={p.name} p={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function Conjuring() {
  const [cast, setCast] = useState(false)

  const onCast = () => {
    spellState.requested = true
    setCast(true) // local flag only drives the button label; canvas reads the singleton
  }

  return (
    <section id="conjuring" className="section section--conjuring conjuring--pinned">
      <div className="conjuring__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter IV — The Conjuring of Apps</span>
        </MaskReveal>
        <span className="section__cat section__cat--service">✦ Service · full-stack AI, brief to deploy</span>
        <IgniteHeading className="section__title" text="One spell, end to end" />
        <Reveal delay={0.1}>
          <p className="conjuring__lede">
            From a brief to a living product — retrieval-augmented intelligence, a
            FastAPI spine, containerized and summoned onto AWS or GCP. Cast the spell and
            watch a full-stack AI app assemble itself, A&nbsp;→&nbsp;Z.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <button type="button" className="cast-btn" onClick={onCast}>
            <span className="cast-btn__rune">✦</span>
            {cast ? 'Recast the spell' : 'Cast the spell'}
          </button>
        </Reveal>
        <Reveal delay={0.24}>
          <ol className="conjuring__legend">
            {NODES.map((n) => (
              <li key={n.name} className="conjuring__legend-item">
                <span className="conjuring__legend-name">{n.name}</span>
                <span className="conjuring__legend-tags">{n.tags.join(' · ')}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}

export function Tracker() {
  return (
    <section id="tracker" className="section section--tracker tracker--pinned">
      <div className="tracker__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter VI — The Tracker</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">✦ Project · live demo</span>
        <IgniteHeading className="section__title" text="It reads the pulse" />
        <Reveal delay={0.1}>
          <p className="tracker__lede">
            A wrist. A heartbeat climbing under effort. The signal is caught,
            saved, and read — an intelligence that answers for the body in motion.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export function Chronicles() {
  return (
    <section id="chronicles" className="section section--chronicles">
      <div className="section__wrap">
        <MaskReveal>
          <span className="eyebrow">Chapter VII — Chronicles</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="The path so far" />
        <div className="timeline">
          <motion.span
            className="timeline__line"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: '-20% 0px' }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          />
          {chronicles.map((c, i) => (
            <Reveal key={c.house} delay={0.12 * i} className="chron">
              <span className="chron__node" />
              <p className="chron__era">{c.era}</p>
              <h3 className="chron__role">
                {c.role} <span className="chron__house">· {c.house}</span>
              </h3>
              <ul className="chron__deeds">
                {c.deeds.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function OwlPost() {
  return (
    <section id="owlpost" className="section section--owl">
      <div className="section__wrap owl">
        <MaskReveal>
          <span className="eyebrow">Chapter VIII — Owl Post</span>
        </MaskReveal>
        <IgniteHeading className="section__title section__title--center" text="Send an owl" />
        <Reveal delay={0.1}>
          <p className="owl__lede">
            Building something that needs intelligence woven into it? Let’s talk shop —
            agents, vision pipelines, or model deployment.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <OwlPostForm />
        </Reveal>
        <Reveal delay={0.2} className="owl__links">
          <a className="owl__link" href="mailto:kmoeez2018@gmail.com">
            <span className="owl__rune">✉</span> kmoeez2018@gmail.com
          </a>
          <a className="owl__link" href="https://github.com/moeezahmadkhan" target="_blank" rel="noreferrer">
            <span className="owl__rune">⌥</span> github.com/moeezahmadkhan
          </a>
          <span className="owl__link owl__link--static">
            <span className="owl__rune">⌖</span> Lahore, Pakistan
          </span>
        </Reveal>
        <Reveal delay={0.3}>
          <a className="btn btn--primary owl__cta" href="/Moeez_Ahmad_Khan_CV.pdf" target="_blank" rel="noreferrer">
            Unfurl the full scroll (CV)
          </a>
        </Reveal>
        <p className="owl__footer">Conjured with React · three.js · a little Lumos. © {`${2026}`} Moeez Ahmad Khan</p>
      </div>
    </section>
  )
}
