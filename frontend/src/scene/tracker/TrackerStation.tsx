import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, WRIST_ANCHOR, localProgress } from './phases'
import { ScanRings } from './ScanRings'
import { Heartbeat } from './Heartbeat'
import { WristTiles } from './WristTiles'
import { DataStream } from './DataStream'
import { AICore } from './AICore'
import { HudText } from './HudText'
import { InsightCards } from './InsightCards'

const RING_FLOOR_Y = -1.32
/** Base yaw of the cricketer — turned to face the camera/viewer. */
const FACING_Y = -1.5

useGLTF.preload('/models/cricket_improved.glb')

export function TrackerStation() {
  const group = useRef<THREE.Group>(null)
  const figure = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/cricket_improved.glb')

  // Clone + tune materials so HMR / remounts never mutate shared state.
  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry = mesh.geometry.clone()
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone()
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mat = mesh.material as THREE.MeshStandardMaterial
        if (mat) {
          mat.envMapIntensity = 0.6
          mat.emissive = new THREE.Color('#0a2630')
          mat.emissiveIntensity = 0.25
        }
      }
    })
    return clone
  }, [scene])

  useEffect(
    () => () =>
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.geometry?.dispose?.()
          const mat = m.material as THREE.Material
          mat?.dispose?.()
        }
      }),
    [model],
  )

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999

    if (!figure.current) return
    const t = state.clock.elapsedTime
    figure.current.position.y = Math.sin(t * 0.8) * 0.04
    figure.current.rotation.y = FACING_Y + Math.sin(t * 0.18) * 0.12
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* cool scanner light rig, local to the station */}
      <pointLight position={[2, 3, 3]} intensity={6} color="#35e0ff" distance={14} decay={2} />
      <pointLight position={[-2.5, 1.5, 2]} intensity={3} color="#1f8fb0" distance={12} decay={2} />
      <spotLight position={[0, 5, 4]} angle={0.6} penumbra={1} intensity={10} color="#bfefff" target-position={[STATION[0], 0.5, 0]} />

      {/* gentle wrist fill so the watch lifts out of shadow — kept dim to stay under Bloom */}
      <pointLight
        position={[WRIST_ANCHOR[0], WRIST_ANCHOR[1], WRIST_ANCHOR[2] + 0.2]}
        intensity={1.1}
        color="#dff6ff"
        distance={0.9}
        decay={2}
      />

      {/* scan platform rings on the floor */}
      <group position={[0, RING_FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[1.5, 1.55, 64]} />
          <meshBasicMaterial color="#35e0ff" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[2.0, 2.02, 64]} />
          <meshBasicMaterial color="#35e0ff" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* the static cricketer */}
      <group ref={figure}>
        <Center>
          <primitive object={model} scale={3} />
        </Center>
      </group>

      {/* pulsing scan rings around the figure */}
      <ScanRings />

      {/* hero ECG trace + climbing BPM at the wrist */}
      <Heartbeat />

      {/* orbiting watch metric tiles around the wrist */}
      <WristTiles />

      {/* particles streaming wrist→datastore + glowing store cube */}
      <DataStream />

      {/* AI answer beat: glowing wireframe icosahedron above the figure */}
      <AICore />

      {/* holographic HUD: saved stat readout */}
      <HudText />

      {/* scroll-cycled AI insight cards near the core */}
      <InsightCards />
    </group>
  )
}
