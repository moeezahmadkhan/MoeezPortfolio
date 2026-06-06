import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, revealState } from './map'

const BOX_POS: [number, number, number] = [3.0, -0.6, -1.2]
const MAP_CENTER = new THREE.Vector3(0, -1.1, 0)
const BOX_VEC = new THREE.Vector3(...BOX_POS)

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** The AIBox-1688 edge device: a pulsing NPU core with a closed local inference
 * loop (box ↔ map center) — the visual opposite of a stream-to-cloud sink. */
export function EdgeBox() {
  const core = useRef<THREE.Mesh>(null)
  const pulse = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const drive = driveNow()

    if (core.current) {
      const mat = core.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.0 + Math.sin(t * 4) * 0.5 * (0.3 + drive)
    }
    if (pulse.current) {
      const k = (Math.sin(t * 2) + 1) / 2
      pulse.current.position.lerpVectors(BOX_VEC, MAP_CENTER, k)
      pulse.current.visible = drive > 0.05
    }
  })

  return (
    <group>
      <group position={BOX_POS}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.34, 0.5]} />
          <meshStandardMaterial color="#10131a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh ref={core} position={[0, 0.22, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.18]} />
          <meshStandardMaterial color="#35e0ff" emissive="#35e0ff" emissiveIntensity={1.2} />
        </mesh>
        <pointLight position={[0, 0.4, 0]} intensity={2} color="#35e0ff" distance={3} decay={2} />
        <Billboard position={[0, 0.72, 0]}>
          <Text fontSize={0.1} color="#bfefff" anchorX="center" outlineWidth={0.003} outlineColor="#07070d">
            LOCAL · NO CLOUD
          </Text>
        </Billboard>
      </group>

      <mesh ref={pulse}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#35e0ff" />
      </mesh>
    </group>
  )
}
