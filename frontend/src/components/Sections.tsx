import { motion } from 'framer-motion'
import { Reveal, IgniteHeading, MaskReveal } from './Reveal'
import { Tilt } from './Tilt'
import { projects, spellbook, chronicles } from '../data'
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
  return (
    <section id="spells" className="section section--spells">
      <div className="section__wrap">
        <MaskReveal>
          <span className="eyebrow">Chapter III — The Arsenal</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="Spells & Incantations" />
        <div className="spells__grid">
          {spellbook.map((group, i) => (
            <Reveal key={group.title} delay={0.08 * i} className="spell-group">
              <h3 className="spell-group__title">{group.title}</h3>
              <ul className="spell-group__list">
                {group.spells.map((s) => (
                  <li key={s} className="spell-chip">
                    <span className="spell-chip__rune">✦</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Grimoire() {
  return (
    <section id="grimoire" className="section section--grimoire">
      <div className="section__wrap">
        <MaskReveal>
          <span className="eyebrow">Chapter IV — The Grimoire</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="Works of conjuring" />
        <div className="grimoire__grid">
          {projects.map((p, i) => (
            <Reveal key={p.name} delay={0.06 * i}>
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
          ))}
        </div>
      </div>
    </section>
  )
}

export function Chronicles() {
  return (
    <section id="chronicles" className="section section--chronicles">
      <div className="section__wrap">
        <MaskReveal>
          <span className="eyebrow">Chapter V — Chronicles</span>
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
          <span className="eyebrow">Chapter VI — Owl Post</span>
        </MaskReveal>
        <IgniteHeading className="section__title section__title--center" text="Send an owl" />
        <Reveal delay={0.1}>
          <p className="owl__lede">
            Building something that needs intelligence woven into it? Let’s talk shop —
            agents, vision pipelines, or model deployment.
          </p>
        </Reveal>
        <Reveal delay={0.2} className="owl__links">
          <a className="owl__link" href="mailto:kmoeez2018@gmail.com">
            <span className="owl__rune">✉</span> kmoeez2018@gmail.com
          </a>
          <a className="owl__link" href="tel:+923035772640">
            <span className="owl__rune">☎</span> 0303 577 2640
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
