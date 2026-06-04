import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { DATASTORE_POS, AICORE_POS, localProgress, ramp } from './phases'

export function HudText() {
  const stats = useRef<THREE.Group>(null)
  const answer = useRef<THREE.Group>(null)

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.5, 0.7)
    const ans = ramp(lp, 0.72, 0.92)
    if (stats.current) {
      stats.current.visible = save > 0.05
      stats.current.scale.setScalar(0.85 + save * 0.15)
    }
    if (answer.current) {
      answer.current.visible = ans > 0.05
      answer.current.position.y = AICORE_POS[1] - 0.9 + ans * 0.1
    }
  })

  return (
    <group>
      <group ref={stats} position={[DATASTORE_POS[0], DATASTORE_POS[1] + 0.7, DATASTORE_POS[2]]} visible={false}>
        <Text fontSize={0.12} color="#7cffb0" anchorX="center" anchorY="middle" lineHeight={1.5}>
          {'♥ 158 bpm\nsteps 2.4k\ncal 310\n▮▮▮▮ saved'}
        </Text>
      </group>
      <group ref={answer} position={[AICORE_POS[0], AICORE_POS[1] - 0.9, AICORE_POS[2]]} visible={false}>
        <Text fontSize={0.16} color="#bfffe0" anchorX="center" anchorY="middle" maxWidth={3.2} textAlign="center">
          {'Peak exertion detected — recovery ~4 min.'}
        </Text>
      </group>
    </group>
  )
}
