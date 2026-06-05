import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NODES, nodePosition, streamGlow, spellState } from './spell'

/** Catmull-Rom curve threaded through all node positions — the bolt's flight path. */
function usePath() {
  return useMemo(() => {
    const pts = NODES.map((_, i) => new THREE.Vector3(...nodePosition(i)))
    return new THREE.CatmullRomCurve3(pts)
  }, [])
}

/** One glowing tube segment between consecutive nodes; opacity follows streamGlow. */
function Stream({ segIndex }: { segIndex: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...nodePosition(segIndex))
    const b = new THREE.Vector3(...nodePosition(segIndex + 1))
    const curve = new THREE.LineCurve3(a, b)
    return new THREE.TubeGeometry(curve, 8, 0.02, 6, false)
  }, [segIndex])

  useFrame(() => {
    if (mat.current) mat.current.opacity = streamGlow(spellState.progress, segIndex, NODES.length) * 0.8
  })

  return (
    <mesh geometry={geom}>
      <meshBasicMaterial ref={mat} color="#7fd0c4" transparent opacity={0} toneMapped={false} />
    </mesh>
  )
}

export function SpellBolt() {
  const path = usePath()
  const bolt = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const p = spellState.progress
    // bolt visible only while traveling (0 < p < 1)
    const traveling = p > 0.001 && p < 0.999
    path.getPoint(THREE.MathUtils.clamp(p, 0, 1), tmp)
    if (bolt.current) {
      bolt.current.visible = traveling
      bolt.current.position.copy(tmp)
    }
    if (light.current) {
      light.current.visible = traveling
      light.current.position.copy(tmp)
    }
  })

  return (
    <group>
      {NODES.slice(0, -1).map((_, i) => (
        <Stream key={i} segIndex={i} />
      ))}
      <mesh ref={bolt} visible={false}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <pointLight ref={light} color="#bfefff" intensity={6} distance={4} decay={2} visible={false} />
    </group>
  )
}
