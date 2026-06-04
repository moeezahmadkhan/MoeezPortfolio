import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, localProgress, ramp } from './phases'

const N = 80          // ECG samples
const WIDTH = 1.4     // world width of the trace

/** A single PQRST-ish blip centred over the rolling window. */
function ecg(x: number) {
  const d = x - 0.5
  const spike = Math.exp(-Math.pow(d * 30, 2)) * 1.0      // tall R
  const dip = -Math.exp(-Math.pow((d - 0.03) * 40, 2)) * 0.35
  return spike + dip
}

export function Heartbeat() {
  const beat = useRef<THREE.Mesh>(null)
  const text = useRef<any>(null)
  const lastBpm = useRef(-1)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return g
  }, [])

  const lineMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#ff3344' }), [])
  const line = useMemo(() => new THREE.Line(geometry, lineMaterial), [geometry, lineMaterial])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const intensity = ramp(lp, 0.15, 0.4)            // heartbeat ramps in
    const bpm = Math.round(72 + intensity * (158 - 72))
    const t = state.clock.elapsedTime
    const speed = 0.6 + intensity * 1.2              // trace scrolls faster as HR rises

    // update ECG positions
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1)
      const rolled = (u + t * speed) % 1
      const y = ecg(rolled) * (0.12 + intensity * 0.28)
      pos.setXYZ(i, (u - 0.5) * WIDTH, y, 0)
    }
    pos.needsUpdate = true
    geometry.computeBoundingSphere()

    // BPM text — only update + re-sync troika when the integer changes
    if (text.current && bpm !== lastBpm.current) {
      lastBpm.current = bpm
      text.current.text = `${bpm}`
      text.current.sync?.()
    }

    // beat marker pulse (synced to bpm)
    if (beat.current) {
      const hz = bpm / 60
      const s = Math.abs(Math.sin(t * Math.PI * hz)) * 0.05 * intensity
      beat.current.scale.setScalar(0.06 + s)
      ;(beat.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + intensity * 0.6
    }
  })

  return (
    <group position={WRIST_ANCHOR}>
      <primitive object={line} />
      <Text ref={text} position={[0, 0.45, 0]} fontSize={0.34} color="#ff4d5e" anchorX="center" anchorY="middle">
        72
      </Text>
      <Text position={[0, 0.2, 0]} fontSize={0.1} color="#ff8a96" anchorX="center" anchorY="middle">
        BPM
      </Text>
      <mesh ref={beat} position={[WIDTH / 2, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff5566" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
