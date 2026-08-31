import { Suspense, lazy } from 'react'
import { hasWebGL, prefersReducedMotion } from '../lib/media'
import { StaticHeroArt } from '../components/site/StaticHeroArt'
import { prefersSaveData, shouldRenderStage } from './stageGate'
import './Stage.css'

// Lazy so three.js, drei, and postprocessing land in their own chunk that a
// reduced-motion or no-WebGL visitor never downloads.
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })))

export function StageMount() {
  const allowed = shouldRenderStage({
    webgl: hasWebGL(),
    reducedMotion: prefersReducedMotion(),
    saveData: prefersSaveData(),
  })

  if (!allowed) return <StaticHeroArt />

  return (
    <Suspense fallback={<StaticHeroArt />}>
      <Stage />
    </Suspense>
  )
}
