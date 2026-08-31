import type { ReactNode } from 'react'
import './Section.css'

type SectionProps = {
  id: string
  title: string
  density?: 'default' | 'tight'
  children: ReactNode
}

export function Section({ id, title, density = 'default', children }: SectionProps) {
  const headingId = `${id}-heading`
  const className = density === 'tight' ? 'section section--tight' : 'section'
  return (
    <section id={id} className={className} aria-labelledby={headingId}>
      <div className="section__inner">
        <header className="section__head">
          <h2 id={headingId} className="section__title">
            {title}
          </h2>
        </header>
        {children}
      </div>
    </section>
  )
}
