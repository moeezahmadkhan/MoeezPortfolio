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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SECTION_IDS } from '../components/layout/Nav'
import { usePageVisible } from '../lib/usePageVisible'
import { useSectionObserver } from '../lib/useSectionObserver'
import { Backdrop } from './Backdrop'
import { HeroLights } from './lights'
import { SceneDirector } from './SceneDirector'
import { watchContextLoss } from './contextLoss'
import { stageDpr, useIsMobileStage } from './useStageViewport'
// Cursor affordance for the hero's drag-to-orbit — split out of Stage.css (which
// StageMount imports eagerly for the static-art fallback) so a reduced-motion or
// no-WebGL visitor, who never gets useDragOrbit's listeners, never gets this
// cursor either. See StageCursor.css for the full rationale.
import './StageCursor.css'

export function Stage({
  onContextLost,
  onContextRestored,
}: {
  /** The GPU took the canvas away — show something else until it comes back. */
  onContextLost: () => void
  onContextRestored: () => void
}) {
  // Includes the hero, so scrolling back up reports 'top' rather than reporting
  // nothing and leaving the last section latched. See SECTION_IDS.
  const ids = useMemo(() => SECTION_IDS, [])
  const activeId = useSectionObserver(ids)
  // A background tab still gets throttled animation frames rather than none, so
  // without this the GPU keeps drawing a scene nobody is looking at.
  const visible = usePageVisible()
  // Asked once, here, and passed down — it decides which rigs exist at all,
  // where the hero stands, which way a dissolving rig drifts, and how much the
  // renderer is allowed to spend. Those must never disagree. See
  // useStageViewport.
  const mobile = useIsMobileStage()
  // What this display and this viewport between them allow. Never more than the
  // monitor can actually show — see stageDpr.
  const dprCeiling = stageDpr(
    typeof window === 'undefined' ? 1 : window.devicePixelRatio,
    mobile,
  )
  // Whether SceneDirector currently holds any rig at all — including one still
  // fading out. Stable identity so it is not a fresh prop every render.
  const [rigMounted, setRigMounted] = useState(true)
  const onMountedChange = useCallback((m: boolean) => setRigMounted(m), [])
  const [dpr, setDpr] = useState(dprCeiling)

  // A resize across the breakpoint changes the ceiling, and dragging a window
  // between a retina and a non-retina monitor changes the display ratio; the
  // live dpr has to come down with either rather than keep the old value.
  useEffect(() => {
    setDpr((d) => Math.min(d, dprCeiling))
  }, [dprCeiling])

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        // The canvas element, not the renderer, is what fires these — and the
        // listeners must be attached the moment it exists, because a context
        // can be lost before the first frame is ever drawn.
        onCreated={({ gl }) => watchContextLoss(gl.domElement, {
          lost: onContextLost,
          restored: onContextRestored,
        })}
        // 'never' stops the loop outright while the tab is in the background.
        // R3F renders one frame on the way back, so returning to the tab shows
        // the scene where it left off rather than a blank canvas.
        frameloop={visible ? 'always' : 'never'}
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
        camera={{ position: [0, 0.4, 4.2], fov: 38 }}
      >
        <PerformanceMonitor
          // `Math.min`, not a bare 1: a decline must only ever lower the ratio.
          // Assigning 1 outright would RAISE it on a display whose ceiling is
          // already below that.
          onDecline={() => setDpr((d) => Math.min(d, 1))}
          onIncline={() => setDpr((d) => Math.min(dprCeiling, d + 0.25))}
        />
        <AdaptiveDpr pixelated />
        <Backdrop activeId={activeId} mobile={mobile} />
        <HeroLights />
        <SceneDirector activeId={activeId} mobile={mobile} onMountedChange={onMountedChange} />
        <Preload all />
        {/* The composer is a second full-screen render target plus, for
            `mipmapBlur`, a whole mip chain rebuilt every frame. On desktop that
            is always worth it — a model presides over most of the page. On
            mobile the gate in rigs.ts leaves the hero as the only rig, so for
            every section below it Bloom would spend a full pass hunting for
            bright pixels that are not there, and Vignette would darken edges
            the backdrop's own falloff already darkens.

            So on mobile it runs exactly while a rig is on stage, which is the
            hero band and nowhere else. Dropping it outright was tried first and
            was the wrong trade: the halo around the wand tip is the one thing
            making the figure read as lit rather than as a dark shape, and it is
            the hero — the first screen anyone sees — that loses it.

            `rigMounted` stays true through a rig's fade-out, not just while it
            is the current one, so the halo is never yanked off a wand that is
            still dissolving.

            This installed version of @react-three/postprocessing (2.19.1)
            replaced the brief's `disableNormalPass` prop with
            `enableNormalPass`, which already defaults to off — the normal pass
            is only needed for SSGI, which nothing here uses, so the default is
            exactly what we want. */}
        {(!mobile || rigMounted) && (
          <EffectComposer>
            <Bloom intensity={0.75} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette offset={0.28} darkness={0.72} eskil={false} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
