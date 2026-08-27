import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, revealState, walkerPosition, detectionAt } from './map'

const FOOT_COUNT = 10
/** Silhouette plane: matches walker.svg's 200×340 viewBox aspect. */
const FIG_W = 0.5
const FIG_H = 0.85

/** Ambient drive when the oath hasn't been sworn — keeps the map alive on arrival. */
function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** A traveling presence: a footprint trail along the patrol path + a detection
 * reticle that tightens from searching to locked as confidence climbs. */
export function Walker() {
  const reticle = useRef<THREE.Group>(null)
  const figure = useRef<THREE.Group>(null)
  const figMat = useRef<THREE.MeshBasicMaterial>(null)
  const feet = useRef<THREE.Mesh[]>([])
  const footIdx = useMemo(() => Array.from({ length: FOOT_COUNT }, (_, i) => i), [])

  // The detected subject: a flat teal silhouette walking the patrol path, so the
  // reticle reading over it looks like a vision-model box on a camera frame.
  const fig = useTexture('/walker.svg')
  useEffect(() => {
    fig.colorSpace = THREE.SRGBColorSpace
    fig.anisotropy = 4
  }, [fig])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const cycle = (t * 0.08) % 1
    const drive = driveNow()
    const det = detectionAt(drive)

    const lead = walkerPosition(cycle)
    if (reticle.current) {
      reticle.current.position.set(lead[0], lead[1] + 0.45, lead[2])
      reticle.current.scale.setScalar(det.boxScale)
      reticle.current.visible = drive > 0.02
    }

    if (figure.current) {
      figure.current.position.set(lead[0], lead[1] + FIG_H / 2, lead[2])
      figure.current.visible = drive > 0.02
    }
    if (figMat.current) figMat.current.opacity = drive > 0.02 ? 0.92 : 0

    feet.current.forEach((m, i) => {
      if (!m) return
      const ft = (cycle - i * 0.025 + 1) % 1
      const p = walkerPosition(ft)
      m.position.set(p[0], p[1], p[2])
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - i / FOOT_COUNT) * 0.7 * (drive > 0.02 ? 1 : 0.25)
    })
  })

  return (
    <group>
      {footIdx.map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) feet.current[i] = el
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.06, 14]} />
          <meshBasicMaterial color="#7fd0c4" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* the detected subject — a teal walker silhouette, always facing the camera */}
      <group ref={figure}>
        <Billboard>
          <mesh>
            <planeGeometry args={[FIG_W, FIG_H]} />
            <meshBasicMaterial
              ref={figMat}
              map={fig}
              transparent
              opacity={0}
              depthWrite={false}
              toneMapped={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </Billboard>
      </group>

      {/* square detection reticle (4-segment ring rotated to axis-align) */}
      <group ref={reticle} rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <mesh>
          <ringGeometry args={[0.34, 0.37, 4]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}
