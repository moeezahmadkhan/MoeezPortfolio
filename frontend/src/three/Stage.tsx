import { Canvas } from '@react-three/fiber'
// Imported from their concrete files, not the `@react-three/drei` barrel: the barrel
// re-exports everything, including modules (VideoTexture, FaceLandmarker) that hold
// their own internal dynamic `import()`. Even unused, that import() call site was
// enough to make Rollup hoist Vite's shared preload-helper module into the "three"
// chunk, which in turn forced the eager entry chunk into a static import edge on it —
// defeating the whole lazy-load gate. Pulling in only the three files this component
// actually needs avoids dragging that graph in at all.
import { AdaptiveDpr } from '@react-three/drei/core/AdaptiveDpr'
import { PerformanceMonitor } from '@react-three/drei/core/PerformanceMonitor'
import { Preload } from '@react-three/drei/core/Preload'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useState } from 'react'
import { NAV_ITEMS } from '../components/layout/Nav'
import { useSectionObserver } from '../lib/useSectionObserver'
import { Backdrop } from './Backdrop'
import { HeroLights } from './lights'
import { SceneDirector } from './SceneDirector'
// Cursor affordance for the hero's drag-to-orbit — split out of Stage.css (which
// StageMount imports eagerly for the static-art fallback) so a reduced-motion or
// no-WebGL visitor, who never gets useDragOrbit's listeners, never gets this
// cursor either. See StageCursor.css for the full rationale.
import './StageCursor.css'

export function Stage() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), [])
  const activeId = useSectionObserver(ids)
  // Capped to [1, 1.5] (not the usual [1, 2]) — measured performance budget: see
  // task-6-7-report.md.
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
        camera={{ position: [0, 0.4, 4.2], fov: 38 }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr((d) => Math.min(1.5, d + 0.25))}
        />
        <AdaptiveDpr pixelated />
        <Backdrop activeId={activeId} />
        <HeroLights />
        <SceneDirector activeId={activeId} />
        <Preload all />
        {/* This installed version of @react-three/postprocessing (2.19.1) replaced the
            brief's `disableNormalPass` prop with `enableNormalPass`, which already
            defaults to off — the normal pass is only needed for SSGI, which nothing
            here uses, so the default is exactly what we want. */}
        <EffectComposer>
          <Bloom intensity={0.75} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.72} eskil={false} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
