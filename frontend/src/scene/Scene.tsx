import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Environment,
  Lightformer,
  Sparkles,
  ContactShadows,
  Float,
  AdaptiveDpr,
  PerformanceMonitor,
} from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { KernelSize } from 'postprocessing'
import * as THREE from 'three'
import { WizardModel } from './WizardModel'
import { RuneCircle } from './RuneCircle'
import { Candlelight } from './Candlelight'
import { CameraRig } from './CameraRig'
import { ScrollDriver } from './ScrollDriver'

export function Scene({ reveal }: { reveal: number }) {
  const [dpr, setDpr] = useState(1.5)

  return (
    <Canvas
      shadows
      dpr={dpr}
      gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
      camera={{ position: [0, 0.4, 6.4], fov: 38 }}
    >
      <color attach="background" args={['#07070d']} />
      <fog attach="fog" args={['#07070d', 6, 16]} />

      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(Math.min(window.devicePixelRatio, 2))}
      />
      <AdaptiveDpr pixelated />
      <ScrollDriver />
      <CameraRig />

      {/* ── Lighting: low moody hall to hide model artifacts ── */}
      <ambientLight intensity={0.06} color="#4a3e56" />
      <hemisphereLight args={['#2a2440', '#0a0a12', 0.12]} />
      <Candlelight position={[2.6, 1.8, 2.2]} intensity={2.2} seed={0} />
      <Candlelight position={[-2.8, 1.2, 1.6]} intensity={1.8} color="#ffa64d" seed={3.2} speed={1.3} />
      <Candlelight position={[0, 3.2, -1.5]} intensity={1.6} color="#ffd9a0" seed={1.1} speed={0.8} />

      {/* cool rim light from behind: reduced to avoid washing out */}
      <spotLight
        position={[-3, 4, -4]}
        angle={0.5}
        penumbra={1}
        intensity={12}
        color="#7fb6d8"
      />

      {/* warm key light: toned down to reduce visible seams/artifacts */}
      <spotLight
        position={[1.5, 2.2, 5]}
        target-position={[0, 0.3, 0]}
        angle={0.6}
        penumbra={0.9}
        intensity={14}
        distance={18}
        color="#ffe2b0"
      />

      <pointLight position={[0, 0.6, 3.5]} intensity={1.8} color="#fff0d6" distance={10} decay={2} />

      <Suspense fallback={null}>
        {/* rotationIntensity set to 0 so we can fully control Y rotation in WizardModel for scroll-driven intro */}
        <Float speed={1.4} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.05, 0.08]}>
          <WizardModel reveal={reveal} />
        </Float>

        <RuneCircle />

        {/* Floating golden dust + finer white motes */}
        <Sparkles count={70} scale={[8, 6, 8]} size={5} speed={0.25} color="#f3d99b" opacity={0.7} />
        <Sparkles count={120} scale={[10, 7, 10]} size={1.6} speed={0.15} color="#ffffff" opacity={0.35} />

        <ContactShadows
          position={[0, -1.34, 0]}
          opacity={0.18}
          scale={9}
          blur={2.6}
          far={4}
          color="#000000"
        />

        {/* Inline environment (no network fetch) for soft PBR reflections */}
        <Environment resolution={256}>
          <Lightformer intensity={0.9} color="#ffcaa0" position={[0, 4, 2]} scale={[8, 3, 1]} />
          <Lightformer intensity={0.4} color="#7fb6d8" position={[-4, 1, -3]} scale={[4, 6, 1]} />
          <Lightformer intensity={0.3} color="#e7c27d" position={[4, 0, 2]} scale={[4, 4, 1]} />
        </Environment>
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.35}
          kernelSize={KernelSize.LARGE}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.25} darkness={0.92} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
