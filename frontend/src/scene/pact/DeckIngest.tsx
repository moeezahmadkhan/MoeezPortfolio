import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, ingestProgress } from './phases'

const PAGES = 5
const START_POS = new THREE.Vector3(-5, 2.4, 2) // flies in from the upper-left
const END_POS = new THREE.Vector3(0, 0.6, 0) // the analysis core

/** A glowing stack of pitch-deck pages that drifts in and is drawn into the core. */
export function DeckIngest() {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const p = ingestProgress(localProgress(scrollState.progress))
    const g = group.current
    if (!g) return
    g.position.lerpVectors(START_POS, END_POS, p)
    g.scale.setScalar(THREE.MathUtils.lerp(1, 0.15, p)) // shrinks into the core
    g.rotation.y = p * Math.PI * 1.5
    g.visible = p < 0.999
    g.children.forEach((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.opacity = 1 - p * 0.6
    })
  })

  return (
    <group ref={group}>
      {Array.from({ length: PAGES }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 1.25]} />
          <meshStandardMaterial
            color="#ece2cf"
            emissive="#e7c27d"
            emissiveIntensity={0.4}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
