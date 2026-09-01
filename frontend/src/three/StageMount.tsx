import { Suspense, lazy } from 'react'
import { hasWebGL, prefersReducedMotion } from '../lib/media'
import { StaticHeroArt } from '../components/site/StaticHeroArt'
import { prefersSaveData, shouldRenderStage } from './stageGate'
import './Stage.css'

// Lazy so three.js, drei, and postprocessing land in their own chunk that a
// reduced-motion or no-WebGL visitor never downloads.
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })))

/**
 * What stands in the canvas's place while its chunk is still downloading.
 *
 * Emphatically NOT `StaticHeroArt`. That component's still frame is a 346KB
 * PNG, and using it here made every WebGL visitor fetch it and then discard it
 * a second later when the real canvas mounted — measured at 16% of the mobile
 * payload, spent on a frame nobody looks at for long. This is the same warm
 * pool of light the scene opens on, drawn in CSS, and it weighs nothing.
 */
function StagePlaceholder() {
  return <div className="stage stage--loading" aria-hidden="true" />
}

export function StageMount() {
  const allowed = shouldRenderStage({
    webgl: hasWebGL(),
    reducedMotion: prefersReducedMotion(),
    saveData: prefersSaveData(),
  })

  if (!allowed) return <StaticHeroArt />

  return (
    <Suspense fallback={<StagePlaceholder />}>
      <Stage />
    </Suspense>
  )
}
