import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState, responsiveState } from '../scroll'

const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.0, pos: [0, 1.15, 5.5], look: [0, 0.16, 0] },
  { at: 0.2, pos: [4.5, 1.8, 3.8], look: [0, 0.3, 0] },
  { at: 0.4, pos: [-4.5, 2.6, 4.2], look: [0, 0.5, 0] },
  { at: 0.6, pos: [4.5, 0.4, 4.6], look: [0, 0.0, 0] },
  { at: 0.8, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },
  { at: 1.0, pos: [0, 1.0, 10.5], look: [0, 0.2, 0] },
]

const current = new THREE.Vector3()
const currentLook = new THREE.Vector3()
const target = new THREE.Vector3()
const targetLook = new THREE.Vector3()

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function sampleKeyframes(progress: number, key: 'pos' | 'look', destination: THREE.Vector3) {
  for (let index = 0; index < KEYS.length - 1; index++) {
    const currentKey = KEYS[index]
    const nextKey = KEYS[index + 1]
    if (progress >= currentKey.at && progress <= nextKey.at) {
      const local = smoothstep((progress - currentKey.at) / (nextKey.at - currentKey.at))
      destination.fromArray(currentKey[key]).lerp(new THREE.Vector3().fromArray(nextKey[key]), local)
      return
    }
  }
  destination.fromArray(KEYS[KEYS.length - 1][key])
}

export function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const progress = scrollState.progress
    sampleKeyframes(progress, 'pos', target)
    sampleKeyframes(progress, 'look', targetLook)

    // Steady on first page, light parallax after intro completes.
    const intro = THREE.MathUtils.smoothstep(scrollState.progress / 0.25, 0, 1)
    const parallax = THREE.MathUtils.lerp(0.08, 0.6, intro)
    target.x += scrollState.pointerX * parallax
    target.y += -scrollState.pointerY * parallax * 0.5

    // Reduce motion smoothing slightly for crisper responsiveness.
    const smooth = 1 - Math.pow(0.055, delta)
    current.lerp(target, smooth)
    currentLook.lerp(targetLook, smooth)

    // Apply responsive zoom + smooth it.
    const nextZoom = THREE.MathUtils.lerp(camera.zoom, responsiveState.zoom, 0.08)
    camera.zoom = nextZoom
    camera.updateProjectionMatrix()

    camera.position.copy(current)
    camera.lookAt(currentLook)
  })

  return null
}
