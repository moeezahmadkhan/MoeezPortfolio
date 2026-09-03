import type { Project } from '../../content'
import { clearProjectFocus, setProjectFocus } from '../../lib/focusState'
import { useMatchMedia } from '../../lib/useMatchMedia'
import { useNearFocus } from '../../lib/useNearFocus'
import { useScramble } from '../../lib/useScramble'
import { Tag } from '../ui/Tag'
import './ProjectCard.css'

export function ProjectCard({ project }: { project: Project }) {
  const headingId = `project-${project.slug}`
  const nearRef = useNearFocus<HTMLElement>()
  // Measured at 390x844: #work was 3894px and the first card alone 917px —
  // four bullets of four to six lines each, sitting under an outcome paragraph
  // that already says what the project is. The writing is not the problem;
  // carrying all of it above the fold on a 390px screen is.
  //
  // Deferred, never removed: <details> keeps every line in the DOM and in the
  // accessible tree, one tap away. Open on desktop, where the two-column grid
  // has the room and nothing about the layout was wrong.
  const narrow = useMatchMedia('(max-width: 899px)')
  return (
    <article
      className="card"
      ref={nearRef}
      aria-labelledby={headingId}
      onPointerEnter={() => setProjectFocus(project.slug, 'pointer')}
      onPointerLeave={() => clearProjectFocus(project.slug)}
      onFocus={() => setProjectFocus(project.slug, 'keyboard')}
      onBlur={() => clearProjectFocus(project.slug)}
    >
      {project.shot && (
        <img className="card__shot" src={project.shot} alt="" loading="lazy" aria-hidden="true" />
      )}
      <div className="card__body">
        <h3 className="card__title" id={headingId}>
          {project.name}
        </h3>
        {project.metric && <p className="card__metric">{project.metric}</p>}
        <p className="card__outcome">{project.outcome}</p>
        <details className="card__more" open={!narrow}>
          <summary className="card__more-summary">Details</summary>
          <ul className="card__detail">
            {project.detail.map((line) => (
              <li key={line.slice(0, 24)}>{line}</li>
            ))}
          </ul>
        </details>
        <ul className="card__stack">
          {project.stack.map((tech) => (
            <Tag key={tech}>{tech}</Tag>
          ))}
        </ul>
        {project.links && (
          <p className="card__links">
            {project.links.repo && (
              <CardLink href={project.links.repo} label={`${project.name} code`} />
            )}
            {project.links.demo && (
              <CardLink href={project.links.demo} label={`${project.name} live`} />
            )}
            {project.links.writeup && (
              <CardLink href={project.links.writeup} label={`${project.name} write-up`} />
            )}
          </p>
        )}
      </div>
    </article>
  )
}

/**
 * One outbound link, its own component so the decode's hook is called once per
 * link rather than conditionally inside the card — a project with a demo and
 * one without would otherwise run a different number of hooks.
 */
function CardLink({ href, label }: { href: string; label: string }) {
  const { run: _run, ...decode } = useScramble(label)
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...decode}>
      {label}
    </a>
  )
}
