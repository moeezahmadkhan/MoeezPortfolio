import type { ReactNode } from 'react'
import './Section.css'

type SectionProps = {
  id: string
  title: string
  density?: 'default' | 'tight'
  /** Extra class appended to the root `<section>` — e.g. a one-off layout
   * variant scoped to a single section, kept out of this shared component. */
  className?: string
  children: ReactNode
}

export function Section({ id, title, density = 'default', className, children }: SectionProps) {
  const headingId = `${id}-heading`
  const base = density === 'tight' ? 'section section--tight' : 'section'
  const withExtra = className ? `${base} ${className}` : base
  return (
    <section id={id} className={withExtra} aria-labelledby={headingId}>
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
