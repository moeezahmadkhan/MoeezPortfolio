import type { Project } from '../../content'
import { clearProjectFocus, setProjectFocus } from '../../lib/focusState'
import { useScramble } from '../../lib/useScramble'
import { Tag } from '../ui/Tag'
import './ProjectCard.css'

export function ProjectCard({ project }: { project: Project }) {
  const headingId = `project-${project.slug}`
  return (
    <article
      className="card"
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
        <ul className="card__detail">
          {project.detail.map((line) => (
            <li key={line.slice(0, 24)}>{line}</li>
          ))}
        </ul>
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
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...useScramble(label)}>
      {label}
    </a>
  )
}
