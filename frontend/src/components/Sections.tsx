import { useRef, useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { numeralFor } from '../chapters'
import { Reveal, IgniteHeading, MaskReveal } from './Reveal'
import { OwlPostForm } from './OwlPostForm'
import { Tilt } from './Tilt'
import { projects, spellbook, chronicles, pactSteps, trackerSteps } from '../data'
import { revealState, PIPELINE_BEATS, EDGE_STACK } from '../scene/map/map'
import { useParallax } from './useParallax'
import './sections.css'

export function About() {
  return (
    <section id="wizard" className="section section--about">
      <div className="section__wrap about">
        <MaskReveal className="about__eyebrow">
          <span className="eyebrow">Chapter {numeralFor('wizard')} — The Wizard</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="The mind behind the wand" />

        <div className="about__body">
          <div className="about__copy">
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
          </div>

          <Reveal delay={0.15} className="about__portrait-wrap">
            <figure className="about__portrait">
              <span className="about__portrait-corner about__portrait-corner--tl" aria-hidden />
              <span className="about__portrait-corner about__portrait-corner--br" aria-hidden />
              <img src="/moeez.jpeg" alt="Moeez Ahmad Khan" loading="lazy" width={400} height={400} />
              <figcaption className="about__portrait-cap">
                <span className="about__portrait-id">SUBJECT Nº MAK·01</span>
                <span className="about__portrait-name">// engineer of spells</span>
              </figcaption>
            </figure>
          </Reveal>
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
          <span className="eyebrow">Chapter {numeralFor('spells')} — The Arsenal</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="Spells & Incantations" />

        <div className="spells__steps">
          <div className="spells__index">
            <div className="spells__count" aria-hidden>
              {String(step + 1).padStart(2, '0')}
              <span className="spells__index-total">/ {String(spellbook.length).padStart(2, '0')}</span>
            </div>
            <ol className="spells__toc" aria-label="Schools of magic">
              {spellbook.map((group, i) => (
                <li
                  key={group.title}
                  className={`spells__toc-item${i === step ? ' is-active' : ''}${
                    i < step ? ' is-past' : ''
                  }`}
                  aria-current={i === step ? 'true' : undefined}
                >
                  <span className="spells__toc-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="spells__toc-title">{group.title}</span>
                </li>
              ))}
            </ol>
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
                <h3 className="spell-group__title">
                  {group.title}
                  <span className="spell-group__count">{group.spells.length} incantations</span>
                </h3>
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
          <span className="spell-card__corner spell-card__corner--tr" aria-hidden />
          <span className="spell-card__corner spell-card__corner--bl" aria-hidden />
          <div className="spell-card__head">
            <span className="spell-card__index">Nº{String(i + 1).padStart(2, '0')}</span>
            <span className="spell-card__glyph">{p.glyph}</span>
          </div>
          <p className="spell-card__incant">// {p.incantation}</p>
          <h3 className="spell-card__name">{p.name}</h3>
          <p className="spell-card__blurb">{p.blurb}</p>
          <ul className="spell-card__tags">
            {p.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          {p.links && (
            <div className="spell-card__links">
              {p.links.demo && (
                <a className="spell-card__link" href={p.links.demo} target="_blank" rel="noreferrer">
                  <span className="spell-card__link-rune">✦</span> Live demo
                </a>
              )}
              {p.links.repo && (
                <a className="spell-card__link" href={p.links.repo} target="_blank" rel="noreferrer">
                  <span className="spell-card__link-rune">⌥</span> View code
                </a>
              )}
              {p.links.caseStudy && (
                <a className="spell-card__link" href={p.links.caseStudy} target="_blank" rel="noreferrer">
                  <span className="spell-card__link-rune">❧</span> Case study
                </a>
              )}
            </div>
          )}
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
          <span className="eyebrow">Chapter {numeralFor('grimoire')} — The Grimoire</span>
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

export function Pact() {
  return (
    <section id="pact" className="section section--pact pact--pinned">
      <div className="pact__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter {numeralFor('pact')} — The Pact</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">
          ✦ Project · AI founder–investor matchmaking
        </span>
        <IgniteHeading className="section__title" text="The deck, read. The deal, bound." />
        <Reveal delay={0.06}>
          <p className="fact-strip">Silmaril AI · founder–investor matching · QUIDSol</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="pact__lede">
            A founder uploads a pitch deck. An LLM reads it, scores it, and surfaces the
            investors who actually fit — then binds founder to backer to carry the deal forward.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <ol className="pact__legend">
            {pactSteps.map((s) => (
              <li key={s.name} className="pact__legend-item">
                <span className="pact__legend-name">{s.name}</span>
                <span className="pact__legend-tags">{s.tags.join(' · ')}</span>
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
          <span className="eyebrow">Chapter {numeralFor('tracker')} — The Tracker</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">✦ Project · live demo</span>
        <IgniteHeading className="section__title" text="It reads the pulse" />
        <Reveal delay={0.06}>
          <p className="fact-strip">Whoop wearable AI chat · Ecommerce Steem · in production</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="tracker__lede">
            A wrist. A heartbeat climbing under effort. The signal is caught,
            saved, and read — an intelligence that answers for the body in motion.
          </p>
        </Reveal>
        {/* Mobile-only readout — on desktop the live numbers float in the 3D HUD,
            but that collides with the copy in a portrait frame, so it carries
            here instead (see Heartbeat/WristTiles/HudText/InsightCards). */}
        <Reveal delay={0.18}>
          <ul className="tracker__vitals" aria-label="Live readout">
            {[
              { k: '158', u: 'bpm · peak', hot: true },
              { k: '2.4k', u: 'steps' },
              { k: '310', u: 'cal' },
              { k: '96%', u: 'SpO₂' },
              { k: '~4 min', u: 'recovery' },
            ].map((v) => (
              <li key={v.u} className={`tracker__vital${v.hot ? ' tracker__vital--hot' : ''}`}>
                <span className="tracker__vital-k">{v.k}</span>
                <span className="tracker__vital-u">{v.u}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.24}>
          <ul className="tracker__strip">
            {trackerSteps.map((s) => (
              <li key={s.name} className="tracker__strip-item">
                <span className="tracker__strip-name">{s.name}</span>
                <span className="tracker__strip-tags">{s.tags.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

export function Marauders() {
  const [sworn, setSworn] = useState(false)

  const onSwear = () => {
    if (sworn) {
      revealState.active = false // "Mischief managed" — MapStation eases it back down
      setSworn(false)
    } else {
      revealState.requested = true // canvas reads the singleton
      setSworn(true)
    }
  }

  return (
    <section id="map" className="section section--map map--pinned">
      <div className="map__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter {numeralFor('map')} — The Marauder's Map</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">✦ Project · live demo · on-device</span>
        <IgniteHeading className="section__title" text="It knows who passes" />
        <Reveal delay={0.06}>
          <p className="fact-strip">Project Horus · on-device identity · QUIDSol</p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="map__lede">
            A camera watches the threshold. A palm-sized NPU — no cloud behind it — wakes
            on motion, follows the footsteps, and names who just passed. Detection, tracking,
            and re-identification run entirely on the device; no footage ever leaves the room.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <button type="button" className="cast-btn" onClick={onSwear}>
            <span className="cast-btn__rune">✦</span>
            {sworn ? 'Mischief managed' : 'I solemnly swear that I am up to no good'}
          </button>
          <p className="cast-gloss">— runs the live detection demo</p>
        </Reveal>
        <Reveal delay={0.24}>
          <ol className="map__stages">
            {PIPELINE_BEATS.map((beat, i) => (
              <li key={beat} className="map__stages-item">
                <span className="map__stages-name">{beat}</span>
                <span className="map__stages-tags">{EDGE_STACK[i] ?? ''}</span>
              </li>
            ))}
          </ol>
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
          <span className="eyebrow">Chapter {numeralFor('chronicles')} — Chronicles</span>
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
          <span className="eyebrow">Chapter {numeralFor('owlpost')} — Owl Post</span>
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
