import type { Project } from '../../content'
import { clearProjectFocus, setProjectFocus } from '../../lib/focusState'
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
              <a href={project.links.repo} target="_blank" rel="noreferrer noopener">
                {project.name} code
              </a>
            )}
            {project.links.demo && (
              <a href={project.links.demo} target="_blank" rel="noreferrer noopener">
                {project.name} live
              </a>
            )}
            {project.links.writeup && (
              <a href={project.links.writeup} target="_blank" rel="noreferrer noopener">
                {project.name} write-up
              </a>
            )}
          </p>
        )}
      </div>
    </article>
  )
}
