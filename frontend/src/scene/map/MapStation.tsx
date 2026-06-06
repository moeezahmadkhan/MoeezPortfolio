import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, MAP_TILT, localProgress, revealState, revealProgress, REVEAL_DURATION } from './map'
import { MapTable } from './MapTable'
import { Walker } from './Walker'
import { NameTag } from './NameTag'
import { EdgeBox } from './EdgeBox'
import { DetectionHud } from './DetectionHud'

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function MapStation() {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999

    const now = state.clock.elapsedTime

    // Consume an oath request (mirror SpellStation): stamp start, or jump if reduced motion.
    if (revealState.requested) {
      revealState.requested = false
      revealState.active = true
      revealState.sworn = true
      if (reduceMotion) {
        revealState.startedAt = -1
        revealState.progress = 1
      } else {
        revealState.startedAt = now
      }
    }

    // Drive the active reveal ramp.
    if (revealState.startedAt >= 0) {
      revealState.progress = revealProgress(now, revealState.startedAt, REVEAL_DURATION)
      if (revealState.progress >= 1) revealState.startedAt = -1
    }

    // "Mischief managed" → ease the reveal back down.
    if (!revealState.active && revealState.startedAt < 0) {
      revealState.progress = THREE.MathUtils.lerp(revealState.progress, 0, 0.1)
    }
  })

  return (
    <group ref={group} position={STATION} rotation={[MAP_TILT, 0, 0]} dispose={null}>
      {/* light rig: warm parchment key + cool detection rim */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#ffe2b0" distance={16} decay={2} />
      <pointLight position={[-3, 1.5, 2]} intensity={3} color="#35e0ff" distance={12} decay={2} />
      <spotLight
        position={[0, 5, 4]}
        angle={0.7}
        penumbra={1}
        intensity={9}
        color="#dff6ff"
        target-position={[STATION[0], 0.2, 0]}
      />

      <MapTable />
      <Walker />
      <NameTag />
      <EdgeBox />
      <DetectionHud />

      <Sparkles count={40} scale={[7, 3, 4]} size={3} speed={0.18} color="#e7c27d" opacity={0.5} />
    </group>
  )
}
