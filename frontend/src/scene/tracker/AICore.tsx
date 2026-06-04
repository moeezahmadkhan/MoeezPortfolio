import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { AICORE_POS, localProgress, ramp } from './phases'

export function AICore() {
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const answer = ramp(lp, 0.7, 0.95)
    const t = state.clock.elapsedTime
    if (mesh.current) {
      mesh.current.rotation.x = t * 0.3
      mesh.current.rotation.y = t * 0.4
      const s = 0.1 + answer * 0.4 + Math.sin(t * 3) * 0.02 * answer
      mesh.current.scale.setScalar(s)
      const mat = mesh.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.3 + answer * 3
    }
    if (halo.current) halo.current.intensity = answer * 4
  })

  return (
    <group position={AICORE_POS}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#0c2e22" emissive="#3dffa6" emissiveIntensity={0.3} metalness={0.4} roughness={0.2} wireframe />
      </mesh>
      <pointLight ref={halo} color="#3dffa6" intensity={0} distance={6} decay={2} />
    </group>
  )
}
