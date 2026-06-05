import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, localProgress, ramp, metricsAt } from './phases'

const N = 80          // ECG samples
const WIDTH = 1.0     // world width of the trace

/** A single PQRST-ish blip centred over the rolling window. */
function ecg(x: number) {
  const d = x - 0.5
  const spike = Math.exp(-Math.pow(d * 30, 2)) * 1.0      // tall R
  const dip = -Math.exp(-Math.pow((d - 0.03) * 40, 2)) * 0.35
  return spike + dip
}

export function Heartbeat() {
  const root = useRef<THREE.Group>(null)
  const beat = useRef<THREE.Mesh>(null)
  const text = useRef<any>(null)
  const label = useRef<any>(null)
  const lastBpm = useRef(-1)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return g
  }, [])

  const lineMaterial = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#ff3344', transparent: true }),
    [],
  )
  const line = useMemo(() => {
    const l = new THREE.Line(geometry, lineMaterial)
    l.frustumCulled = false
    return l
  }, [geometry, lineMaterial])

  useEffect(() => () => {
    geometry.dispose()
    lineMaterial.dispose()
  }, [geometry, lineMaterial])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const intensity = ramp(lp, 0.15, 0.4)            // heartbeat ramps in
    // recede as the "saved" stats hand off to the datastore, so the live trace
    // never crowds the save/answer beats
    const fade = ramp(lp, 0.05, 0.18) * (1 - ramp(lp, 0.48, 0.58))
    const bpm = metricsAt(lp).bpm
    const t = state.clock.elapsedTime
    const speed = 0.6 + intensity * 1.2              // trace scrolls faster as HR rises

    if (root.current) root.current.visible = fade > 0.01
    lineMaterial.opacity = fade
    if (text.current) text.current.fillOpacity = fade
    if (label.current) label.current.fillOpacity = fade

    // update ECG positions
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1)
      const rolled = (u + t * speed) % 1
      const y = ecg(rolled) * (0.12 + intensity * 0.28)
      pos.setXYZ(i, (u - 0.5) * WIDTH, y, 0)
    }
    pos.needsUpdate = true

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
      ;(beat.current.material as THREE.MeshBasicMaterial).opacity = (0.4 + intensity * 0.6) * fade
    }
  })

  return (
    // floated up-right as the top of the vitals column — high enough to clear the
    // datastore cube, the torso, and the left-hand chapter copy
    <group ref={root} position={[WRIST_ANCHOR[0] + 1.4, WRIST_ANCHOR[1] + 1.7, WRIST_ANCHOR[2]]}>
      <primitive object={line} />
      <Text ref={text} position={[0, 0.48, 0]} fontSize={0.34} color="#ff4d5e" anchorX="center" anchorY="middle">
        72
      </Text>
      <Text ref={label} position={[0, 0.23, 0]} fontSize={0.1} color="#ff8a96" anchorX="center" anchorY="middle">
        BPM
      </Text>
      <mesh ref={beat} position={[-WIDTH / 2, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff5566" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
