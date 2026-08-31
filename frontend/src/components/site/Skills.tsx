import { skills } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Tag } from '../ui/Tag'
import './Skills.css'

export function Skills() {
  return (
    <Section id="skills" title="Skills" density="tight">
      <Reveal>
        <div className="skills">
          {skills.map((group, i) => (
            <div className="skills__group" key={group.title}>
              <h3 className="skills__title" id={`skills-${i}`}>
                {group.title}
              </h3>
              <ul className="skills__items" aria-labelledby={`skills-${i}`}>
                {group.items.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}
