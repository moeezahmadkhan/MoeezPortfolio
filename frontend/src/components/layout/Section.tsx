import type { ReactNode } from 'react'
import './Section.css'

type SectionProps = {
  id: string
  title: string
  eyebrow?: string
  density?: 'default' | 'tight'
  children: ReactNode
}

export function Section({ id, title, eyebrow, density = 'default', children }: SectionProps) {
  const headingId = `${id}-heading`
  const className = density === 'tight' ? 'section section--tight' : 'section'
  return (
    <section id={id} className={className} aria-labelledby={headingId}>
      <div className="section__inner">
        <header className="section__head">
          {eyebrow && <p className="section__eyebrow">{eyebrow}</p>}
          <h2 id={headingId} className="section__title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}
