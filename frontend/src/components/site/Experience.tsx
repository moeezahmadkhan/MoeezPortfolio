import { experience } from '../../content'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Timeline } from '../ui/Timeline'

export function Experience() {
  return (
    <Section id="experience" title="Experience">
      <Reveal>
        <Timeline roles={experience} />
      </Reveal>
    </Section>
  )
}
