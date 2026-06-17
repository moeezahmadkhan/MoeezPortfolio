import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState, responsiveState } from '../scroll'

// `at` = scroll fraction → camera pos/look. Fractions are derived from the real
// section offsets measured via puppeteer (1440×900 viewport, 2026-06-04).
// The duplicated hero pose (0.0 + 0.10) HOLDS the camera still through the hero
// runway so the figurine can finish its full 360° spin before the descent begins.
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  // Recalibrated 2026-06-06 via scripts/measure.mjs for the page carrying BOTH the
  // Pact and Marauder's Map chapters. Entry keys sit on measured section tops; "held"
  // keys sit ~65–70% into each pinned span so the camera holds before transitioning.
  { at: 0.0,   pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — closer + framed higher for a more commanding figurine
  { at: 0.06,  pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — hold while figurine spins 360°
  { at: 0.094, pos: [4.5, 1.8, 3.8],  look: [0, 0.3, 0] },    // about (#wizard) — measured 0.094
  { at: 0.143, pos: [-4.5, 2.6, 4.2], look: [0, 0.5, 0] },    // spells — entry (measured 0.143)
  { at: 0.272, pos: [-3.6, 2.2, 4.4], look: [0, 0.4, 0] },    // spells — held across the pinned span
  { at: 0.378, pos: [-13, 1.25, 10.5], look: [-13, 0.55, 0] }, // conjuring (service) — entry, spell chamber far-left (measured 0.378)
  { at: 0.442, pos: [-13, 1.55, 10.0], look: [-13, 0.7, 0] },  // conjuring — held across the pinned span
  { at: 0.495, pos: [-7, 1.1, 5.0],   look: [-7, 0.5, -1] },   // pact — entry, framing the left-offset chamber (measured 0.495)
  { at: 0.585, pos: [-7, 1.35, 4.0],  look: [-7, 0.45, -1] },  // pact — held late so the camera lingers on the pair, then whips to the tracker
  { at: 0.612, pos: [12, 1.0, 6.2],   look: [12, 0.5, 0] },   // tracker — entry (measured 0.612)
  { at: 0.690, pos: [12.6, 1.5, 7.8], look: [12, 0.9, 0] },   // tracker — held
  { at: 0.753, pos: [22, 1.25, 5.2],  look: [22, -0.45, 0] }, // map (Marauder's Map) — entry: closer + tilted down to fill frame (measured 0.753)
  { at: 0.830, pos: [22, 1.7, 6.1],   look: [22, -0.2, 0] },  // map — held: ease back/up, table stays large and legible
  { at: 0.894, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },    // chronicles (measured 0.894)
  { at: 0.942, pos: [4.5, 0.4, 4.6],  look: [0, 0.0, 0] },    // grimoire (projects) — center framing, now just before contact (measured 0.942)
  { at: 1.0,   pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },    // owlpost
]

// ── Mobile camera track ────────────────────────────────────────────────────
// On phones the pinned sections collapse to natural height (see sections.css),
// so the desktop `at` fractions no longer line up with where each chapter sits —
// the camera would drift off the models and leave them as background scenery.
// These keys use fractions MEASURED on a 390×844 portrait viewport
// (tools/measure_mobile.mjs) and frame each model centred + closer so the 3D is
// the foreground on mobile, not a backdrop. One key per chapter (no entry/held
// pair) gives smooth continuous motion without the desktop pin holds.
// Each MODEL chapter gets an entry + hold PAIR at the same pose (fractions measured
// at 390×844 via tools/measure_mobile.mjs, bracketing that section's reading window)
// so the camera SETTLES on the figure while you read instead of continuously
// drifting toward the next far-offset station — which used to slide each model off
// frame mid-section. The hold→next-entry gaps are short, turning the long lateral
// moves into quick whip-pans (the station-visibility margin keeps both ends in
// frame). About/Spells/Grimoire/Chronicles are text/photo chapters (the central
// wizard is incidental there), so they keep a single key.
const KEYS_MOBILE: typeof KEYS = [
  { at: 0.0,   pos: [0, 0.7, 3.9],     look: [0, 0.12, 0] },     // hero — close, figurine fills the portrait frame
  { at: 0.07,  pos: [0, 0.7, 3.9],     look: [0, 0.12, 0] },     // hero — hold while the figurine spins 360°
  { at: 0.125, pos: [2.1, 1.1, 3.5],   look: [0, 0.25, 0] },     // about — tight 3/4 (text + photo card)
  { at: 0.221, pos: [-2.2, 1.3, 3.7],  look: [0, 0.35, 0] },     // spells — orbit the central wizard (skill chips)
  { at: 0.351, pos: [-11.1, 0.9, 9.0], look: [-11.1, -0.25, 1.4] }, // conjuring — pulled back so the full caster reads in the top band (entry)
  { at: 0.423, pos: [-11.1, 0.9, 9.0], look: [-11.1, -0.25, 1.4] }, // conjuring — hold through the reading window
  { at: 0.481, pos: [-7, 0.6, 6.0],    look: [-7, -0.45, -1] },  // pact — both figures lifted above copy (entry)
  { at: 0.538, pos: [-7, 0.6, 6.0],    look: [-7, -0.45, -1] },  // pact — hold through the reading window
  { at: 0.585, pos: [12, 0.95, 8.6],   look: [12, -0.2, 0] },    // tracker — pulled back so the whole cricketer reads (entry)
  { at: 0.639, pos: [12, 0.95, 8.6],   look: [12, -0.2, 0] },    // tracker — hold through the reading window
  { at: 0.684, pos: [22, 2.9, 8.0],    look: [22, -0.85, 0.35] }, // map — angled down, parchment fills top band (entry)
  { at: 0.748, pos: [22, 2.9, 8.0],    look: [22, -0.85, 0.35] }, // map — hold through the reading window
  { at: 0.800, pos: [-2.1, 1.3, 3.8],  look: [0, 0.3, 0] },      // chronicles — central wizard (timeline)
  { at: 0.888, pos: [2.4, 0.35, 3.8],  look: [0, 0.05, 0] },     // grimoire — central wizard, low hero angle (cards), now before contact
  { at: 0.971, pos: [0, 0.9, 8.0],     look: [0, 0.2, 0] },      // owlpost — pull back
]

const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720)

const ACTIVE_KEYS = isMobile ? KEYS_MOBILE : KEYS

const current = new THREE.Vector3()
const currentLook = new THREE.Vector3()
const target = new THREE.Vector3()
const targetLook = new THREE.Vector3()

function smoothstep(value: number) {
  return value * value * (3 - 2 * value)
}

function sampleKeyframes(progress: number, key: 'pos' | 'look', destination: THREE.Vector3) {
  for (let index = 0; index < ACTIVE_KEYS.length - 1; index++) {
    const currentKey = ACTIVE_KEYS[index]
    const nextKey = ACTIVE_KEYS[index + 1]
    if (progress >= currentKey.at && progress <= nextKey.at) {
      const local = smoothstep((progress - currentKey.at) / (nextKey.at - currentKey.at))
      destination.fromArray(currentKey[key]).lerp(new THREE.Vector3().fromArray(nextKey[key]), local)
      return
    }
  }
  destination.fromArray(ACTIVE_KEYS[ACTIVE_KEYS.length - 1][key])
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
