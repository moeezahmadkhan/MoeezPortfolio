import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useMemo, useState } from 'react'
import { NAV_ITEMS } from '../components/layout/Nav'
import { useSectionObserver } from '../lib/useSectionObserver'
import { Backdrop } from './Backdrop'

export function Stage() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), [])
  const activeId = useSectionObserver(ids)
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
          onIncline={() => setDpr((d) => Math.min(2, d + 0.25))}
        />
        <AdaptiveDpr pixelated />
        <Backdrop activeId={activeId} />
        <Suspense fallback={null}>{/* HeroStage arrives in Task 5 */}</Suspense>
      </Canvas>
    </div>
  )
}
