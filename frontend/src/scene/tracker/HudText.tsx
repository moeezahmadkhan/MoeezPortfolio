import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { DATASTORE_POS, localProgress, ramp, metricsAt } from './phases'

export function HudText() {
  const stats = useRef<THREE.Group>(null)
  const statText = useRef<any>(null)
  const last = useRef('')

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.5, 0.7)
    if (stats.current) {
      stats.current.visible = save > 0.05
      stats.current.scale.setScalar(0.85 + save * 0.15)
    }
    if (statText.current) {
      const m = metricsAt(lp)
      const str =
        `♥ ${m.bpm}  ·  ${(m.steps / 1000).toFixed(1)}k steps\n` +
        `${m.cal} cal  ·  SpO2 ${m.spo2}%\n` +
        `recovery ${m.recoveryMin} min\n` +
        `▮▮▮▮ saved`
      if (last.current !== str) {
        last.current = str
        statText.current.text = str
        statText.current.sync?.()
      }
    }
  })

  return (
    <group
      ref={stats}
      position={[DATASTORE_POS[0], DATASTORE_POS[1] + 0.8, DATASTORE_POS[2]]}
      visible={false}
    >
      <Text
        ref={statText}
        fontSize={0.12}
        color="#7cffb0"
        anchorX="center"
        anchorY="middle"
        lineHeight={1.5}
        textAlign="center"
      >
        {'♥ 158  ·  2.4k steps\n310 cal  ·  SpO2 96%\nrecovery 4 min\n▮▮▮▮ saved'}
      </Text>
    </group>
  )
}
