import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, ramp } from './phases'

const COUNT = 3

/** Concentric rings that expand + fade outward from the figure during tracking. */
export function ScanRings() {
  const rings = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const gate = ramp(lp, 0.15, 0.45) * (1 - ramp(lp, 0.85, 1.0))
    const t = state.clock.elapsedTime
    rings.current.forEach((m, i) => {
      if (!m) return
      const phase = (t * 0.5 + i / COUNT) % 1
      const s = 0.4 + phase * 2.2
      m.scale.set(s, s, s)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = gate * (1 - phase) * 0.6
    })
  })

  return (
    <group position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) rings.current[i] = el }}>
          <ringGeometry args={[0.95, 1.0, 64]} />
          <meshBasicMaterial color="#35e0ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
