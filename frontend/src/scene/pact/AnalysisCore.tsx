import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, analysisProgress, scoreValue } from './phases'

const ORBS = 6

/** The core that "reads" the deck — pulsing wireframe, insight orbs flung outward,
 *  and a single score number that counts up on a billboard. */
export function AnalysisCore() {
  const core = useRef<THREE.Mesh>(null)
  const orbs = useRef<THREE.Group>(null)
  // troika Text exposes imperative `.text` / `.fillOpacity` / `.sync()` — typed as any.
  const scoreText = useRef<any>(null)
  const scoreLabel = useRef<any>(null)
  const lastScore = useRef('')

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const a = analysisProgress(lp)
    const now = state.clock.elapsedTime

    if (core.current) {
      core.current.rotation.y = now * 0.4
      const pulse = Math.sin(now * 3) * 0.05
      const mat = core.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + a * (1.2 + pulse)
    }

    if (orbs.current) {
      const r = a * 1.8
      orbs.current.children.forEach((child, i) => {
        const ang = (i / ORBS) * Math.PI * 2 + now * 0.2
        child.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.5, Math.sin(ang) * r)
        ;(child as THREE.Mesh).visible = a > 0.05
      })
    }

    if (scoreText.current) {
      // The score is a rounded integer that changes ~82 times across the beat;
      // only re-layout the glyphs when the string actually changes (cf. HudText).
      scoreText.current.fillOpacity = a
      const next = a > 0.02 ? String(scoreValue(lp)) : ''
      if (next !== lastScore.current) {
        lastScore.current = next
        scoreText.current.text = next
        scoreText.current.sync?.()
      }
    }
    // Fade the static label in alongside the number so it doesn't float alone in beat 1.
    if (scoreLabel.current) scoreLabel.current.fillOpacity = a
  })

  return (
    <group position={[0, 0.6, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#7fd0c4" emissive="#7fd0c4" emissiveIntensity={0.6} wireframe />
      </mesh>

      <group ref={orbs}>
        {Array.from({ length: ORBS }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#e7c27d" emissive="#e7c27d" emissiveIntensity={1.4} />
          </mesh>
        ))}
      </group>

      <Billboard position={[0, 1.5, 0]}>
        <Text ref={scoreText} fontSize={0.6} color="#f6dfa6" anchorX="center" anchorY="middle" fillOpacity={0}>
          {''}
        </Text>
        <Text ref={scoreLabel} position={[0, -0.42, 0]} fontSize={0.12} color="#cdbfae" anchorX="center" anchorY="top" fillOpacity={0}>
          PITCH SCORE
        </Text>
      </Billboard>
    </group>
  )
}
