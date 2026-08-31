import { skills } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Tag } from '../ui/Tag'
import './Skills.css'

export function Skills() {
  return (
    <Section id="skills" title="Skills" eyebrow="03">
      <div className="skills">
        {skills.map((group, i) => (
          <Reveal key={group.title} delay={i * 50}>
            <div className="skills__group">
              <h3 className="skills__title" id={`skills-${i}`}>
                {group.title}
              </h3>
              <ul className="skills__items" aria-labelledby={`skills-${i}`}>
                {group.items.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
