import { Component, Suspense, lazy, useCallback, useState, type ReactNode } from 'react'
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

  return <LiveStage />
}

/**
 * Catches anything the WebGL subtree throws and shows the still frame instead.
 *
 * Losing the GPU context does not merely blank the canvas — measured, it throws
 * `Cannot read properties of null (reading 'alpha')` from inside three's
 * renderer, and React tears down the whole stage subtree in response. The
 * wrapper div goes with it. So the hero ends up empty and stays empty, which is
 * precisely the failure a visitor reports as "the model vanished and never came
 * back". Phones lose contexts routinely; SwiftShader never does, which is why
 * no desktop harness had ever shown this.
 *
 * A boundary is the right shape here because the specific exception is three's,
 * not ours: we cannot patch every line that might touch a dead context, but we
 * can guarantee that whatever it throws, the visitor still sees a figure.
 */
class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    // Not silently swallowed: this is a real failure and the console is where
    // anyone debugging a blank hero will look first.
    console.error('[stage] WebGL subtree failed, falling back to the still frame:', error)
  }

  render() {
    return this.state.failed ? <StaticHeroArt /> : this.props.children
  }
}

/**
 * The canvas, plus what stands in for it when the GPU takes it away.
 *
 * A phone drops the WebGL context routinely — memory pressure, backgrounding,
 * too many contexts — and three.js does not recover on its own, so the hero
 * would simply be empty for the rest of the visit. Nothing handled that, and no
 * desktop harness can see it: SwiftShader never loses a context.
 *
 * The Canvas stays MOUNTED through the loss on purpose. Unmounting it would
 * take the element with it, and `webglcontextrestored` only ever fires on the
 * element that lost the context — so tearing it down would turn a blip into a
 * permanent downgrade. The still frame is laid over the top instead, and lifts
 * again if the context comes back.
 */
function LiveStage() {
  const [lost, setLost] = useState(false)
  const onContextLost = useCallback(() => setLost(true), [])
  const onContextRestored = useCallback(() => setLost(false), [])

  return (
    <StageBoundary>
      <Suspense fallback={<StagePlaceholder />}>
        <Stage onContextLost={onContextLost} onContextRestored={onContextRestored} />
        {lost && <StaticHeroArt />}
      </Suspense>
    </StageBoundary>
  )
}
