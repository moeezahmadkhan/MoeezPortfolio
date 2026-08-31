import { profile } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { StatStrip } from '../ui/StatStrip'
import './About.css'

export function About() {
  return (
    <Section id="about" title="About">
      <div className="about">
        <Reveal>
          <div className="about__copy">
            {profile.bio.map((para) => (
              <p key={para.slice(0, 24)}>{para}</p>
            ))}
            <StatStrip items={profile.stats} />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <figure className="about__portrait">
            <img src={profile.portrait} alt={`${profile.name}, portrait`} loading="lazy" />
          </figure>
        </Reveal>
      </div>
    </Section>
  )
}
