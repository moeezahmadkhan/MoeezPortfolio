import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState, responsiveState } from '../../scroll'
import { localProgress, revealState, detectionAt, PASSERSBY } from './map'

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** Holographic status line above the map: confidence, FPS, edge label, present count.
 * Guarded setState only fires when the rendered string actually changes. */
export function DetectionHud() {
  const [line, setLine] = useState('AWAITING OATH')
  const root = useRef<THREE.Group>(null)

  useFrame(() => {
    // Hidden on the stacked mobile layout — this status line lands on the
    // chapter heading there; the HTML legend carries the pipeline instead.
    if (root.current) root.current.visible = !responsiveState.isMobile
    if (responsiveState.isMobile) return
    const drive = driveNow()
    const det = detectionAt(drive)
    const count = PASSERSBY.filter((p) => drive >= p.at && det.locked).length
    const next = det.locked
      ? `CONF ${Math.round(det.confidence * 100)}% · 30 FPS · EDGE NPU · ${count} PRESENT`
      : drive > 0.02
        ? `SCANNING ${Math.round(det.confidence * 100)}%…`
        : 'AWAITING OATH'
    setLine((prev) => (prev === next ? prev : next))
  })

  return (
    <group ref={root}>
      <Billboard position={[0, 1.6, 0]}>
        <Text
          fontSize={0.16}
          color="#bfefff"
          anchorX="center"
          outlineWidth={0.004}
          outlineColor="#07070d"
          letterSpacing={0.05}
        >
          {line}
        </Text>
      </Billboard>
    </group>
  )
}
