import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'

useGLTF.preload('/models/wizard.glb')

type Props = {
  /** 0 → 1 reveal progress driven by the intro timeline */
  reveal?: number
}

export function WizardModel({ reveal = 1 }: Props) {
  const group = useRef<THREE.Group>(null)
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
          // A faint warm emissive so the figurine reads as lit from within candlelight.
          mat.emissive = new THREE.Color('#3a2a12')
          mat.emissiveIntensity = 0.18
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
  })

  return (
    <group ref={group} position={[0, 0.05, 0]} dispose={null}>
      <Center>
        <primitive object={model} scale={2.5} />
      </Center>
    </group>
  )
}

function easeOut(x: number) {
  return 1 - Math.pow(1 - x, 3)
}
