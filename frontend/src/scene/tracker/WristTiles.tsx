import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, localProgress, ramp, metricsAt, type Metrics } from './phases'

interface Tile {
  key: string
  color: string
  angle: number // base angle around the wrist (radians)
  format: (m: Metrics) => string
}

const TILES: Tile[] = [
  { key: 'bpm', color: '#ff4d5e', angle: Math.PI * 0.5, format: (m) => `♥ ${m.bpm}` },
  { key: 'cal', color: '#8fe9ff', angle: Math.PI * 0.85, format: (m) => `${m.cal} cal` },
  { key: 'steps', color: '#7cffb0', angle: Math.PI * 1.2, format: (m) => `${(m.steps / 1000).toFixed(1)}k` },
  { key: 'spo2', color: '#8fe9ff', angle: Math.PI * 1.55, format: (m) => `SpO2 ${m.spo2}%` },
]

const RADIUS = 0.6
const ANCHOR = new THREE.Vector3(...WRIST_ANCHOR)
const M0 = metricsAt(0)

export function WristTiles() {
  const root = useRef<THREE.Group>(null)
  const tiles = useRef<(THREE.Group | null)[]>([])
  const texts = useRef<any[]>([])
  const last = useRef<string[]>([])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    // visible across the live + save beats, gone by the AI answer beat
    const vis = ramp(lp, 0.18, 0.4) * (1 - ramp(lp, 0.62, 0.78))
    if (root.current) {
      root.current.visible = vis > 0.02
      root.current.scale.setScalar(0.7 + vis * 0.3)
    }
    if (vis <= 0.02) return

    const m = metricsAt(lp)
    const t = state.clock.elapsedTime
    TILES.forEach((tile, i) => {
      const g = tiles.current[i]
      if (g) {
        const a = tile.angle + t * 0.15 // slow orbit
        g.position.set(
          ANCHOR.x + Math.cos(a) * RADIUS,
          ANCHOR.y + Math.sin(a) * RADIUS * 0.6 + 0.15,
          ANCHOR.z,
        )
      }
      const txt = texts.current[i]
      if (txt) {
        const str = tile.format(m)
        if (last.current[i] !== str) {
          last.current[i] = str
          txt.text = str
          txt.sync?.()
        }
      }
    })
  })

  return (
    <group ref={root} visible={false}>
      {TILES.map((tile, i) => (
        <group
          key={tile.key}
          ref={(el) => {
            tiles.current[i] = el
          }}
        >
          <Billboard>
            <mesh>
              <planeGeometry args={[0.42, 0.16]} />
              <meshBasicMaterial color="#06222b" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[0.46, 0.2]} />
              <meshBasicMaterial
                color={tile.color}
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <Text
              ref={(el) => {
                texts.current[i] = el
              }}
              position={[0, 0, 0.01]}
              fontSize={0.09}
              color={tile.color}
              anchorX="center"
              anchorY="middle"
            >
              {tile.format(M0)}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
