import type { ReactNode } from 'react'
import './Section.css'

type SectionProps = {
  id: string
  title: string
  eyebrow?: string
  children: ReactNode
}

export function Section({ id, title, eyebrow, children }: SectionProps) {
  const headingId = `${id}-heading`
  return (
    <section id={id} className="section" aria-labelledby={headingId}>
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
