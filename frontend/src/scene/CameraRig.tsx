import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState, responsiveState } from '../scroll'

// `at` = scroll fraction → camera pos/look. Fractions are derived from the real
// section offsets measured via puppeteer (1440×900 viewport, 2026-06-04).
// The duplicated hero pose (0.0 + 0.10) HOLDS the camera still through the hero
// runway so the figurine can finish its full 360° spin before the descent begins.
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.0,   pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — closer + framed higher for a more commanding figurine
  { at: 0.10,  pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — hold while figurine spins 360°
  { at: 0.130, pos: [4.5, 1.8, 3.8],  look: [0, 0.3, 0] },    // about (#wizard) — measured 0.124
  { at: 0.195, pos: [-4.5, 2.6, 4.2], look: [0, 0.5, 0] },    // spells — entry (measured 0.189)
  { at: 0.440, pos: [-3.6, 2.2, 4.4], look: [0, 0.4, 0] },    // spells — held across 01–04
  { at: 0.500, pos: [-13, 1.25, 10.5], look: [-13, 0.55, 0] }, // conjuring (service) — entry, spell chamber far-left (measured 0.498)
  { at: 0.630, pos: [-13, 1.55, 10.0], look: [-13, 0.7, 0] },  // conjuring — held across the pinned span
  { at: 0.690, pos: [4.5, 0.4, 4.6],  look: [0, 0.0, 0] },     // grimoire (projects) — center framing (measured held 0.695)
  { at: 0.735, pos: [12, 1.0, 6.2],   look: [12, 0.5, 0] },   // tracker — entry (measured 0.731)
  { at: 0.860, pos: [12.6, 1.5, 7.8], look: [12, 0.9, 0] },   // tracker — held
  { at: 0.917, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },    // chronicles (measured 0.917)
  { at: 1.0,   pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },    // owlpost
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
    const intro = THREE.MathUtils.smoothstep(scrollState.progress / 0.10, 0, 1)
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
