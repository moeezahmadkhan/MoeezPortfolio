import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../scroll'

// Keyframes the camera glides through as the reader descends the page.
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.0, pos: [0, 0.4, 6.4], look: [0, 0.2, 0] }, // hero — face on
  { at: 0.28, pos: [2.6, 0.9, 5.0], look: [0, 0.3, 0] }, // about — orbit right
  { at: 0.52, pos: [-2.8, 1.5, 5.4], look: [0, 0.4, 0] }, // spells — orbit left & up
  { at: 0.76, pos: [1.8, 0.2, 5.6], look: [0, 0.1, 0] }, // grimoire — swing back low
  { at: 1.0, pos: [0, 0.5, 7.4], look: [0, 0.2, 0] }, // owl post — pull back center
]

const cur = new THREE.Vector3()
const curLook = new THREE.Vector3()
const target = new THREE.Vector3()
const targetLook = new THREE.Vector3()

function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

function sample(p: number, key: 'pos' | 'look', out: THREE.Vector3) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i]
    const b = KEYS[i + 1]
    if (p >= a.at && p <= b.at) {
      const local = smoothstep((p - a.at) / (b.at - a.at))
      out.fromArray(a[key]).lerp(new THREE.Vector3().fromArray(b[key]), local)
      return
    }
  }
  out.fromArray(KEYS[KEYS.length - 1][key])
}

export function CameraRig() {
  const { camera } = useThree()
  let inited = false

  useFrame((_, delta) => {
    const p = scrollState.progress
    sample(p, 'pos', target)
    sample(p, 'look', targetLook)

    // Gentle pointer parallax, eased out as you scroll deeper.
    const parallax = (1 - p) * 0.6
    target.x += scrollState.pointerX * parallax
    target.y += -scrollState.pointerY * parallax * 0.5

    if (!inited) {
      cur.copy(target)
      curLook.copy(targetLook)
      inited = true
    }

    // Frame-rate independent smoothing.
    const a = 1 - Math.pow(0.0015, delta)
    cur.lerp(target, a)
    curLook.lerp(targetLook, a)
    camera.position.copy(cur)
    camera.lookAt(curLook)
  })

  return null
}
