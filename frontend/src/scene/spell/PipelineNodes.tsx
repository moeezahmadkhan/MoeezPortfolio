import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { NODES, nodePosition, nodeGlow, spellState } from './spell'

/** One glowing rune-orb whose emissive/scale + labels follow its place in the cast sequence. */
function Orb({ index }: { index: number }) {
  const node = NODES[index]
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const nameMat = useRef<THREE.MeshBasicMaterial>(null)
  const subMat = useRef<THREE.MeshBasicMaterial>(null)
  const pos = nodePosition(index)
  const isFinal = index === NODES.length - 1

  useFrame((state) => {
    const g = nodeGlow(spellState.progress, index, NODES.length)
    const t = state.clock.elapsedTime
    if (mat.current) {
      // idle dim baseline 0.12 → fully lit; final orb blooms brightest
      mat.current.emissiveIntensity =
        (0.12 + g * (isFinal ? 3.4 : 2.2)) * (0.9 + 0.1 * Math.sin(t * 2 + index))
    }
    if (mesh.current) {
      const s = 0.18 + g * (isFinal ? 0.16 : 0.08)
      mesh.current.scale.setScalar(s + Math.sin(t * 1.6 + index) * 0.004)
    }
    if (nameMat.current) nameMat.current.opacity = g
    if (subMat.current) subMat.current.opacity = g * 0.85
  })

  return (
    <group position={pos}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={mat}
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.12}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <Billboard position={[0, 0.42, 0]}>
        <Text
          fontSize={0.16}
          color={node.color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.004}
          outlineColor="#07070d"
        >
          {node.name}
          <meshBasicMaterial ref={nameMat} transparent opacity={0} color={node.color} toneMapped={false} />
        </Text>
        <Text position={[0, -0.04, 0]} fontSize={0.085} color="#cdbfae" anchorX="center" anchorY="top">
          {node.sub}
          <meshBasicMaterial ref={subMat} transparent opacity={0} color="#cdbfae" toneMapped={false} />
        </Text>
      </Billboard>
    </group>
  )
}

export function PipelineNodes() {
  return (
    <group>
      {NODES.map((_, i) => (
        <Orb key={i} index={i} />
      ))}
    </group>
  )
}
