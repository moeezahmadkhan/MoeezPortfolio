import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Billboard, Text, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, pactProgress } from './phases'
import { applyWizardingMaterials, disposeModel } from '../characterMaterial'

useGLTF.preload('/models/pact_pair.glb')

// The founder (young, satchel, offering a chalice) and the investor (robed,
// staff) come as ONE composed mesh, already posed facing each other. We place
// them as a single unit and let the bond form between them.
// ── live-tunable transform (station-local space) ──────────────────────────
const PAIR_POS: [number, number, number] = [0, 0.5, 0]
const PAIR_SCALE = 2.6
/** Turn the pair's separation axis toward world-X so both read side-by-side. */
const PAIR_FACING_Y = Math.PI / 2
/** Horizontal offset of each figure's head, for the floating labels. */
const LABEL_X = 1.0
const CARDS = 3

/** The founder & investor stand together over a portal ring; as the pact forms
 *  they rise into being, a binding cord + chalice-glow ignites between them, and
 *  faint activity cards rise as a kanban nod. */
export function ThePact() {
  const pair = useRef<THREE.Group>(null)
  const bond = useRef<THREE.PointLight>(null)
  const bondOrb = useRef<THREE.Mesh>(null)
  const cord = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const cards = useRef<THREE.Group>(null)

  const { scene } = useGLTF('/models/pact_pair.glb')
  const model = useMemo(() => {
    const clone = scene.clone(true)
    applyWizardingMaterials(clone)
    return clone
  }, [scene])
  useEffect(() => () => disposeModel(model), [model])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const p = pactProgress(lp) // the bond beat — only the final third
    const now = state.clock.elapsedTime

    // The pair is conjured in early (over the first fifth of the chapter) and
    // stays present; the bond between them is what forms later.
    if (pair.current) {
      const rise = easeOut(THREE.MathUtils.clamp(lp / 0.2, 0, 1))
      pair.current.scale.setScalar(PAIR_SCALE * rise)
      pair.current.position.y = PAIR_POS[1] + Math.sin(now * 0.7) * 0.03
    }

    // Chalice-glow + cord between them ignite as the deal is struck.
    if (bond.current) bond.current.intensity = p * 3.2 + Math.sin(now * 3) * 0.3 * p
    if (bondOrb.current) {
      ;(bondOrb.current.material as THREE.MeshBasicMaterial).opacity = p * 0.85
      bondOrb.current.scale.setScalar(0.6 + p * 0.8)
    }
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

      {/* the founder + investor pair, conjured up as one unit */}
      <group ref={pair} position={PAIR_POS} scale={0.001}>
        <group rotation={[0, PAIR_FACING_Y, 0]}>
          <Center>
            <primitive object={model} />
          </Center>
        </group>
      </group>

      {/* floating labels over each figure */}
      <Billboard position={[-LABEL_X, 1.35, 0]}>
        <Text fontSize={0.13} color="#cdbfae" anchorX="center">
          FOUNDER
        </Text>
      </Billboard>
      <Billboard position={[LABEL_X, 1.35, 0]}>
        <Text fontSize={0.13} color="#cdbfae" anchorX="center">
          INVESTOR
        </Text>
      </Billboard>

      {/* the bond struck between them — chalice glow + binding cord */}
      <group position={[0, 0.15, 0]}>
        <pointLight ref={bond} color="#f6dfa6" intensity={0} distance={3.5} decay={2} />
        <mesh ref={bondOrb}>
          <sphereGeometry args={[0.12, 18, 18]} />
          <meshBasicMaterial
            color="#fff1c4"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        <Sparkles count={18} scale={1.4} size={3} speed={0.4} color="#ffcf8f" />
      </group>

      {/* binding cord (grows from 0 width as the pact forms) */}
      <mesh ref={cord} position={[0, 0.15, 0]}>
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

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
