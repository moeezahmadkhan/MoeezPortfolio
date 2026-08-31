import { useEffect } from 'react'
import { experience } from '../../content'
import { hasWebGL, prefersReducedMotion } from '../../lib/media'
import { registerPinnedSection } from '../../lib/scrollState'
import { prefersSaveData, shouldRenderStage } from '../../three/stageGate'
import { Section } from '../layout/Section'
import { Reveal } from '../ui/Reveal'
import { Timeline } from '../ui/Timeline'
import './Pinned.css'

/**
 * The pinned moment: the model holds the centre here and turns through this
 * section's own scroll span (see CharacterRig's `PINNED_SECTION_ID`). The
 * layout only narrows to make room for it when the stage will actually
 * render — the same gate StageMount itself uses — so a reduced-motion,
 * no-WebGL, or save-data visitor gets the section's normal full-width
 * layout instead of copy stranded beside an empty column.
 */
export function Experience() {
  useEffect(() => {
    registerPinnedSection('experience')
    return () => registerPinnedSection(null)
  }, [])

  const pinned = shouldRenderStage({
    webgl: hasWebGL(),
    reducedMotion: prefersReducedMotion(),
    saveData: prefersSaveData(),
  })

  return (
    <Section id="experience" title="Experience" className={pinned ? 'pinned' : undefined}>
      <Reveal>
        <Timeline roles={experience} />
      </Reveal>
    </Section>
  )
}
