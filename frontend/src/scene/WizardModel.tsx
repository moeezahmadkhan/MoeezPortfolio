import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Sparkles } from '@react-three/drei'
import * as THREE from 'three'

useGLTF.preload('/models/wizard.glb')

/**
 * Wand-tip magic position, in the scaled + centred model space.
 * Baked glow lives at Blender (0.31, -0.24, 0.18) → glTF (0.31, 0.18, 0.24);
 * the in-scene primitive is scaled 2.5, so the FX sits at ×2.5 of that.
 * Tune here if the model's transform changes.
 */
const WAND_TIP: [number, number, number] = [0.775, 0.45, 0.6]

type Props = {
  /** 0 → 1 reveal progress driven by the intro timeline */
  reveal?: number
}

export function WizardModel({ reveal = 1 }: Props) {
  const group = useRef<THREE.Group>(null)
  const wandLight = useRef<THREE.PointLight>(null)
  const { scene } = useGLTF('/models/wizard.glb')

  // Clone so HMR / multiple mounts never share mutated material state.
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat) {
          mat.envMapIntensity = 0.9
          // `Glow_*` materials (glowing eyes + wand magic) carry baked emissive
          // from the GLB — leave them so Bloom can pick them up.
          if (!mat.name?.startsWith('Glow')) {
            // A faint warm emissive so the figurine reads as lit from within candlelight.
            mat.emissive = new THREE.Color('#3a2a12')
            mat.emissiveIntensity = 0.18
          }
        }
      }
    })
    return clone
  }, [scene])

  useEffect(() => () => model.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) m.geometry.dispose?.()
  }), [model])

  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    // Slow conjuring rotation + gentle hover.
    group.current.rotation.y += delta * 0.18
    group.current.position.y = Math.sin(t * 0.8) * 0.06
    // Reveal: rise out of the rune circle and settle.
    const r = THREE.MathUtils.clamp(reveal, 0, 1)
    group.current.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, easeOut(r)))
    // Pulse the wand-tip light like a charged spell.
    if (wandLight.current) {
      wandLight.current.intensity = (0.9 + Math.sin(t * 3.1) * 0.45) * r
    }
  })

  return (
    <group ref={group} position={[0, 0.05, 0]} dispose={null}>
      <Center>
        <primitive object={model} scale={2.5} />
      </Center>
      {/* Wand-tip magic: pulsing light + floating sparks, attached to the
          rotating group so they stay on the wand as the figurine turns. */}
      <group position={WAND_TIP}>
        <pointLight
          ref={wandLight}
          color="#ffd9a0"
          intensity={1.1}
          distance={2.4}
          decay={2}
        />
        <Sparkles
          count={16}
          scale={0.55}
          size={2.4}
          speed={0.5}
          noise={0.5}
          color="#ffcf8f"
        />
      </group>
    </group>
  )
}

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
