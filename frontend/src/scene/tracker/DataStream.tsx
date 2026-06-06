import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, DATASTORE_POS, localProgress, ramp } from './phases'

const COUNT = 60
const dummy = new THREE.Object3D()

/** Three stacked "data layers" — reads as a holographic store, never a flat block. */
const SLAB_Y = [-0.17, 0, 0.17]

export function DataStream() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const store = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const from = useMemo(() => new THREE.Vector3(...WRIST_ANCHOR), [])
  const to = useMemo(() => new THREE.Vector3(...DATASTORE_POS), [])
  const offsets = useMemo(() => Array.from({ length: COUNT }, (_, i) => i / COUNT), [])

  // One shared slab material so the whole stack pulses together on save.
  const slabMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#08251c',
        emissive: '#2bd47e',
        emissiveIntensity: 0.35,
        metalness: 0.35,
        roughness: 0.3,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  )

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
    // Always softly lit; flares on the save beat with a slow idle shimmer.
    const shimmer = 0.35 + Math.sin(t * 1.6) * 0.08
    slabMat.emissiveIntensity = shimmer + save * 2.4
    if (store.current) store.current.scale.setScalar(0.95 + save * 0.18)
    if (halo.current) {
      const hm = halo.current.material as THREE.MeshBasicMaterial
      hm.opacity = 0.12 + save * 0.35
      halo.current.rotation.z = t * 0.4
    }
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#7cffb0" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>

      <group ref={store} position={DATASTORE_POS}>
        {/* stacked data layers with glowing holo edges */}
        {SLAB_Y.map((y) => (
          <mesh key={y} position={[0, y, 0]} material={slabMat}>
            <boxGeometry args={[0.52, 0.12, 0.52]} />
            <Edges threshold={15} color="#9bffd0" />
          </mesh>
        ))}
        {/* faint orbiting halo ring so the store reads as "active storage" */}
        <mesh ref={halo} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.46, 48]} />
          <meshBasicMaterial color="#7cffb0" transparent opacity={0.12} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}
