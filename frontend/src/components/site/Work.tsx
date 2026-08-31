import { projects } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { ProjectCard } from './ProjectCard'
import './Work.css'

export function Work() {
  const featured = projects.filter((p) => p.featured)
  const earlier = projects.filter((p) => !p.featured)

  return (
    <Section id="work" title="Work">
      <div className="work__grid">
        {featured.map((project, i) => (
          <Reveal key={project.slug} delay={i * 60}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>

      {earlier.length > 0 && (
        <div className="work__earlier">
          <h3 className="work__earlier-title" id="earlier-work">
            Earlier work
          </h3>
          <ul className="work__list" aria-labelledby="earlier-work">
            {earlier.map((project) => (
              <li className="work__list-item" key={project.slug}>
                <span className="work__list-name">{project.name}</span>
                <span className="work__list-outcome">{project.outcome}</span>
                <span className="work__list-stack">{project.stack.join(' · ')}</span>
                {project.links?.repo && (
                  <a href={project.links.repo} target="_blank" rel="noreferrer noopener">
                    {project.name} code
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}
