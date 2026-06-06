import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center, Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../scroll'

useGLTF.preload('/models/wizard_improved.glb')

/**
 * Wand-tip magic position, in the scaled + centred model space.
 * For wizard_improved.glb the wooden wand points down-forward; its free tip is
 * at glTF (0.10, -0.28, -0.20). The model is scaled ×2.5, so the FX sits there ×2.5.
 * Tune here if the model's transform changes.
 */
const WAND_TIP: [number, number, number] = [0.28, -0.66, -0.48]

/**
 * Base facing rotation (radians, Y). wizard_improved.glb faces +X (glTF); rotating
 * -90° turns the face toward the camera (+Z). Applied to a group that wraps BOTH the
 * model and the wand FX, so the magic stays locked to the wand at every spin angle.
 */
const BASE_FACING_Y = -Math.PI / 2

type Props = {
  /** 0 → 1 reveal progress driven by the intro timeline */
  reveal?: number
}

export function WizardModel({ reveal = 1 }: Props) {
  const group = useRef<THREE.Group>(null)
  const wandLight = useRef<THREE.PointLight>(null)
  const spinRef = useRef(0)
  const { scene } = useGLTF('/models/wizard_improved.glb')

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
          mat.envMapIntensity = 1.15
          // Force a crisp PBR finish so eyes and wand pops don't look flat or grainy.
          if (mat.roughness !== undefined && !Number.isNaN(mat.roughness)) mat.roughness = Math.min(mat.roughness, 0.35)
          if (mat.metalness !== undefined && !Number.isNaN(mat.metalness)) mat.metalness = Math.max(mat.metalness, 0.05)

          // `Glow_*` materials (eyes + wand magic) carry baked emissive
          // from the GLB — keep them and lift contrast so Bloom sees pupils/wand.
          if (mat.name?.startsWith('Glow')) {
            mat.needsUpdate = true
          } else {
            mat.emissive = new THREE.Color('#3a2a12')
            mat.emissiveIntensity = 0.24
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
    const dt = delta

    const r = THREE.MathUtils.clamp(reveal, 0, 1)
    group.current.scale.setScalar(THREE.MathUtils.clamp(easeOut(r), 0, 1))
    if (r < 0.999) {
      group.current.position.y = 0
      group.current.rotation.y = -t * 0.4
      return
    }

    group.current.position.y = THREE.MathUtils.lerp(0, Math.sin(t * 0.8) * 0.05, 0.02)

    // Scroll-locked full 360° across the pinned hero runway: the spin tracks
    // scroll closely so a complete turn lands by ~0.09, just before the camera
    // begins its descent (CameraRig holds the hero pose to ~0.10). Once the turn
    // completes, a gentle sine sway (eased in by `intro`) keeps it alive without
    // re-spinning.
    const intro = THREE.MathUtils.clamp(scrollState.progress / 0.09, 0, 1)
    const sway = intro * Math.sin(t * 0.25) * 0.18
    const targetY = intro * Math.PI * 2 + sway
    const spinSmooth = 1 - Math.pow(0.12, dt)
    spinRef.current = THREE.MathUtils.lerp(spinRef.current, targetY, spinSmooth)
    group.current.rotation.y = spinRef.current

    if (wandLight.current) {
      wandLight.current.intensity = 1.3 + Math.sin(t * 3.1) * 0.55
    }
  })

  return (
    <group ref={group} position={[0, 0.05, 0]} dispose={null}>
      {/* Base-facing group wraps BOTH the model and the wand FX so they rotate
          together — the magic stays locked to the wand at every spin angle. */}
      <group rotation={[0, BASE_FACING_Y, 0]}>
      <Center>
        <primitive object={model} scale={2.5} />
      </Center>
      {/* Wand-tip magic: pulsing light + floating sparks, attached to the
          rotating group so they stay on the wand as the figurine turns. */}
      <group position={WAND_TIP}>
        {/* Outer wand glow orb */}
        <mesh>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshBasicMaterial color="#fff4d6" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight
          ref={wandLight}
          color="#ffe2b0"
          intensity={1.6}
          distance={3.4}
          decay={2}
        />
        <Sparkles
          count={30}
          scale={0.95}
          size={3.4}
          speed={0.6}
          noise={0.55}
          color="#ffcf8f"
        />
      </group>
      </group>
    </group>
  )
}

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
