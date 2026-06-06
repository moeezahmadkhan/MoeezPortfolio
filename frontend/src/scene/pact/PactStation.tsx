import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, localProgress } from './phases'
import { DeckIngest } from './DeckIngest'
import { AnalysisCore } from './AnalysisCore'
import { ThePact } from './ThePact'

/** The Pact chamber. Lit, floor-ringed, and gated to its scroll band. */
export function PactStation() {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* chamber light rig — cool key + warm fill so the sigils read against the dark */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#bfefff" distance={16} decay={2} />
      <pointLight position={[3, 1, 2]} intensity={2.5} color="#e7c27d" distance={12} decay={2} />
      <spotLight
        position={[0, 5, 4]}
        angle={0.7}
        penumbra={1}
        intensity={9}
        color="#dff6ff"
        target-position={[STATION[0], 0.4, STATION[2]]}
      />

      {/* floor rune ring */}
      <group position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[2.4, 2.46, 80]} />
          <meshBasicMaterial color="#7fd0c4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.0, 1.03, 64]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <DeckIngest />
      <AnalysisCore />
      <ThePact />

      <Sparkles count={50} scale={[8, 4, 4]} size={3} speed={0.2} color="#7fd0c4" opacity={0.5} />
    </group>
  )
}
