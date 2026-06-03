import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../scroll'

/** A rotating arcane sigil that sits on the floor and casts the wizard's glow upward. */
export function RuneCircle() {
  const root = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  const outer = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (inner.current) inner.current.rotation.z += delta * 0.12
    if (outer.current) outer.current.rotation.z -= delta * 0.07
    // Dissolve the sigil as the reader leaves the hero (gone by ~22% scroll).
    if (root.current) {
      const fade = THREE.MathUtils.clamp(1 - scrollState.progress * 4.5, 0, 1)
      root.current.visible = fade > 0.001
      root.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined
        if (m && 'opacity' in m) {
          if ((m.userData as any).base === undefined) (m.userData as any).base = m.opacity
          m.opacity = (m.userData as any).base * fade
        }
      })
    }
  })

  const gold = new THREE.Color('#e7c27d')
  const rune = new THREE.Color('#86d8cb')

  return (
    <group ref={root} position={[0, -1.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* soft glow disc */}
      <mesh>
        <circleGeometry args={[2.6, 64]} />
        <meshBasicMaterial color="#1b1305" transparent opacity={0.55} />
      </mesh>

      <group ref={outer}>
        <mesh>
          <ringGeometry args={[2.25, 2.32, 96]} />
          <meshBasicMaterial color={gold} toneMapped={false} transparent opacity={1} />
        </mesh>
        {/* outer tick runes */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 2.0, Math.sin(a) * 2.0, 0]} rotation={[0, 0, a]}>
              <planeGeometry args={[0.05, 0.22]} />
              <meshBasicMaterial color={gold} toneMapped={false} transparent opacity={0.8} />
            </mesh>
          )
        })}
      </group>

      <group ref={inner}>
        <mesh>
          <ringGeometry args={[1.45, 1.49, 96]} />
          <meshBasicMaterial color={rune} toneMapped={false} transparent opacity={0.85} />
        </mesh>
        {/* triangular sigil */}
        {Array.from({ length: 3 }).map((_, i) => {
          const a = (i / 3) * Math.PI * 2 + Math.PI / 2
          const next = ((i + 1) / 3) * Math.PI * 2 + Math.PI / 2
          const p1 = new THREE.Vector3(Math.cos(a) * 1.45, Math.sin(a) * 1.45, 0)
          const p2 = new THREE.Vector3(Math.cos(next) * 1.45, Math.sin(next) * 1.45, 0)
          const mid = p1.clone().add(p2).multiplyScalar(0.5)
          const len = p1.distanceTo(p2)
          const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x)
          return (
            <mesh key={i} position={mid} rotation={[0, 0, ang]}>
              <planeGeometry args={[len, 0.025]} />
              <meshBasicMaterial color={rune} toneMapped={false} transparent opacity={0.55} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
