import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { AICORE_POS, localProgress, pulse, metricsAt, type Metrics } from './phases'

const ANS_START = 0.7
const ANS_END = 1.0

interface Card {
  text: (m: Metrics) => string
}

const CARDS: Card[] = [
  { text: (m) => `Peak HR ${m.bpm} · Zone ${m.zone}` },
  { text: () => 'Recovery ~4 min' },
  { text: () => 'Sleep debt 1.2h → prioritize rest' },
]

const SPAN = (ANS_END - ANS_START) / CARDS.length
const M0 = metricsAt(0)

export function InsightCards() {
  const groups = useRef<(THREE.Group | null)[]>([])
  const texts = useRef<any[]>([])
  const last = useRef<string[]>([])

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const m = metricsAt(lp)
    CARDS.forEach((card, i) => {
      const s = ANS_START + i * SPAN
      const o = pulse(lp, s, s + SPAN * 0.5, s + SPAN) // fade in/out across this card's sub-range
      const g = groups.current[i]
      if (g) {
        g.visible = o > 0.02
        g.scale.setScalar(0.9 + o * 0.1)
        g.position.y = AICORE_POS[1] - 0.9 + o * 0.12
      }
      const txt = texts.current[i]
      if (txt) {
        const str = card.text(m)
        if (last.current[i] !== str) {
          last.current[i] = str
          txt.text = str
          txt.sync?.()
        }
      }
    })
  })

  return (
    <group>
      {CARDS.map((card, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el
          }}
          position={[AICORE_POS[0], AICORE_POS[1] - 0.9, AICORE_POS[2]]}
          visible={false}
        >
          <Billboard>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[2.0, 0.4]} />
              <meshBasicMaterial color="#06251c" transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <Text
              ref={(el) => {
                texts.current[i] = el
              }}
              fontSize={0.16}
              color="#bfffe0"
              anchorX="center"
              anchorY="middle"
              maxWidth={3.2}
              textAlign="center"
            >
              {card.text(M0)}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
