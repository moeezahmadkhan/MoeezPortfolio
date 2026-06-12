import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, localProgress, spellState, castProgress, CAST_DURATION } from './spell'
import { PipelineNodes } from './PipelineNodes'
import { SpellBolt } from './SpellBolt'
import { SpellCaster } from './SpellCaster'

const RING_FLOOR_Y = -1.32
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function SpellStation() {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999

    const now = state.clock.elapsedTime

    // Consume a cast request: stamp its start (or jump to lit end if reduced motion).
    if (spellState.requested) {
      spellState.requested = false
      spellState.hasCast = true
      if (reduceMotion) {
        spellState.startedAt = -1
        spellState.progress = 1
      } else {
        spellState.startedAt = now
      }
    }

    // Drive the active ramp.
    if (spellState.startedAt >= 0) {
      spellState.progress = castProgress(now, spellState.startedAt, CAST_DURATION)
      if (spellState.progress >= 1) spellState.startedAt = -1 // finished → idle-lit
    }
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* chamber light rig — cool key + warm fill so orbs read against the dark */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#bfefff" distance={16} decay={2} />
      <pointLight position={[-3, 1, 2]} intensity={2.5} color="#e7c27d" distance={12} decay={2} />
      <spotLight
        position={[0, 5, 4]}
        angle={0.7}
        penumbra={1}
        intensity={9}
        color="#dff6ff"
        target-position={[STATION[0], 0.4, 0]}
      />

      {/* casting circle on the floor */}
      <group position={[0, RING_FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[2.4, 2.46, 80]} />
          <meshBasicMaterial color="#7fd0c4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.0, 1.03, 64]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* the caster — a wizard mid-incantation, wand thrust down the pipeline */}
      <SpellCaster />

      <PipelineNodes />
      <SpellBolt />

      <Sparkles count={50} scale={[8, 4, 4]} size={3} speed={0.2} color="#7fd0c4" opacity={0.5} />
    </group>
  )
}
