import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, DATASTORE_POS, localProgress, ramp } from './phases'

const COUNT = 60
const dummy = new THREE.Object3D()

export function DataStream() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const store = useRef<THREE.Mesh>(null)
  const from = useMemo(() => new THREE.Vector3(...WRIST_ANCHOR), [])
  const to = useMemo(() => new THREE.Vector3(...DATASTORE_POS), [])
  const offsets = useMemo(() => Array.from({ length: COUNT }, (_, i) => i / COUNT), [])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.45, 0.7)
    const t = state.clock.elapsedTime
    if (mesh.current) {
      for (let i = 0; i < COUNT; i++) {
        const p = (offsets[i] + t * 0.5) % 1
        dummy.position.lerpVectors(from, to, p)
        dummy.position.y += Math.sin(p * Math.PI) * 0.25 // gentle arc
        const s = save > 0 ? 0.03 : 0
        dummy.scale.setScalar(s)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
      }
      mesh.current.instanceMatrix.needsUpdate = true
    }
    if (store.current) {
      const mat = store.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.2 + save * 2.5
      store.current.scale.setScalar(0.9 + save * 0.2)
    }
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#7cffb0" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <mesh ref={store} position={DATASTORE_POS}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#0c2e22" emissive="#2bd47e" emissiveIntensity={0.2} metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}
