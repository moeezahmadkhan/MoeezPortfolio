import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, pactProgress } from './phases'

// Reuse models already loaded elsewhere — useGLTF caches by URL, so these are cache
// hits with no extra download (the founder is the hero wizard, the investor is the
// Tracker's athlete). preload is idempotent if those chapters loaded them first.
useGLTF.preload('/models/wizard_improved.glb')
useGLTF.preload('/models/cricket_improved.glb')

// Standing positions: the two figures drift from apart → together as the pact forms.
const FOUNDER_FAR = new THREE.Vector3(-3.0, -0.9, 0)
const INVESTOR_FAR = new THREE.Vector3(3.0, -0.9, 0)
const FOUNDER_NEAR = new THREE.Vector3(-1.15, -0.9, 0)
const INVESTOR_NEAR = new THREE.Vector3(1.15, -0.9, 0)
// The two GLBs have different native sizes (wizard renders at 2.5, cricket at 3 in
// their own chapters), so scale each to roughly match here. Tune live in-browser.
const FOUNDER_SCALE = 0.5
const INVESTOR_SCALE = 1.05
const CARDS = 3

/** Founder (the wizard) & investor (the athlete) drift together over a portal ring;
 *  a binding cord forms between them; faint activity cards rise as a kanban nod. */
export function ThePact() {
  const founder = useRef<THREE.Group>(null)
  const investor = useRef<THREE.Group>(null)
  const cord = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const cards = useRef<THREE.Group>(null)

  // Object3D.clone(true) deep-copies the scene graph but SHARES geometry/material
  // buffers with the cached original, so this is cheap. Because the buffers are
  // shared, we must NOT mutate materials or dispose them here (the wizard/tracker
  // chapters render the same originals).
  const wizard = useGLTF('/models/wizard_improved.glb').scene
  const cricket = useGLTF('/models/cricket_improved.glb').scene
  const founderModel = useMemo(() => wizard.clone(true), [wizard])
  const investorModel = useMemo(() => cricket.clone(true), [cricket])

  useFrame((state) => {
    const p = pactProgress(localProgress(scrollState.progress))
    const now = state.clock.elapsedTime

    if (founder.current) founder.current.position.lerpVectors(FOUNDER_FAR, FOUNDER_NEAR, p)
    if (investor.current) investor.current.position.lerpVectors(INVESTOR_FAR, INVESTOR_NEAR, p)

    if (cord.current) {
      cord.current.scale.x = Math.max(0.001, p)
      ;(cord.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p * 2
      cord.current.visible = p > 0.02
    }

    if (ring.current) {
      ring.current.rotation.z = now * 0.3
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + p * 0.4
    }

    if (cards.current) {
      const t = THREE.MathUtils.clamp((p - 0.55) / 0.45, 0, 1) // appear once the bond is formed
      cards.current.children.forEach((child, i) => {
        child.position.y = 1.2 + i * 0.28 + t * 0.2
        ;((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = t * 0.7
      })
    }
  })

  return (
    <group>
      {/* world portal ring on the floor */}
      <mesh ref={ring} position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.66, 80]} />
        <meshBasicMaterial color="#7fd0c4" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* founder — the wizard, on the left, angled to face the investor (+X) */}
      <group ref={founder} rotation={[0, -0.6, 0]}>
        <Center>
          <primitive object={founderModel} scale={FOUNDER_SCALE} />
        </Center>
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.14} color="#cdbfae" anchorX="center">
            FOUNDER
          </Text>
        </Billboard>
      </group>

      {/* investor — the athlete, on the right, angled to face the founder (−X) */}
      <group ref={investor} rotation={[0, Math.PI + 0.6, 0]}>
        <Center>
          <primitive object={investorModel} scale={INVESTOR_SCALE} />
        </Center>
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.14} color="#cdbfae" anchorX="center">
            INVESTOR
          </Text>
        </Billboard>
      </group>

      {/* binding cord (grows from 0 width as the pact forms) */}
      <mesh ref={cord} position={[0, 0.1, 0]}>
        <boxGeometry args={[1.7, 0.04, 0.04]} />
        <meshStandardMaterial color="#f6dfa6" emissive="#f6dfa6" emissiveIntensity={0} />
      </mesh>

      {/* kanban-nod activity cards */}
      <group ref={cards} position={[1.8, 0, 0]}>
        {Array.from({ length: CARDS }).map((_, i) => (
          <mesh key={i} position={[0, 1.2 + i * 0.28, 0]}>
            <planeGeometry args={[0.5, 0.18]} />
            <meshStandardMaterial
              color="#9ad6b4"
              emissive="#9ad6b4"
              emissiveIntensity={0.5}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
