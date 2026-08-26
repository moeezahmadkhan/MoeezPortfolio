import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState, responsiveState } from '../scroll'

// `at` = scroll fraction → camera pos/look. Fractions are derived from the real
// section offsets measured via puppeteer (1440×900 viewport, 2026-06-04).
// The duplicated hero pose (0.0 + 0.10) HOLDS the camera still through the hero
// runway so the figurine can finish its full 360° spin before the descent begins.
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  // Re-measured 2026-08-26 via scripts/measure.mjs for the nine-chapter page (the
  // Conjuring service chapter was removed). Entry keys sit on measured section tops;
  // "held" keys sit ~65% into each pinned span. The station spans in scene/spans.ts
  // are generated from these same numbers — change one, regenerate the other.
  { at: 0.0,   pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — closer + framed higher for a more commanding figurine
  { at: 0.065, pos: [0, 1.12, 5.0],   look: [0, 0.22, 0] },   // hero — hold while figurine spins 360°
  { at: 0.118, pos: [4.5, 1.8, 3.8],  look: [0, 0.3, 0] },    // about (#wizard) — measured 0.118
  { at: 0.170, pos: [-4.5, 2.6, 4.2], look: [0, 0.5, 0] },    // spells — entry (measured 0.170)
  { at: 0.293, pos: [-3.6, 2.2, 4.4], look: [0, 0.4, 0] },    // spells — held across the pinned span
  { at: 0.359, pos: [-7, 1.1, 5.0],   look: [-7, 0.5, -1] },  // pact — entry (measured 0.359)
  { at: 0.455, pos: [-7, 1.35, 4.0],  look: [-7, 0.45, -1] }, // pact — held; the bond finishes forming here
  { at: 0.507, pos: [12, 1.0, 6.2],   look: [12, 0.5, 0] },   // tracker — entry (measured 0.507)
  { at: 0.622, pos: [12.6, 1.5, 7.8], look: [12, 0.9, 0] },   // tracker — held; save → answer → insights all play inside this window
  { at: 0.684, pos: [22, 1.25, 5.2],  look: [22, -0.45, 0] }, // map — entry (measured 0.684)
  { at: 0.799, pos: [22, 1.7, 6.1],   look: [22, -0.2, 0] },  // map — held; reticle locks and names resolve here
  { at: 0.861, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },    // chronicles (measured 0.861)
  { at: 0.923, pos: [4.5, 0.4, 4.6],  look: [0, 0.0, 0] },    // grimoire (projects) — measured 0.923
  { at: 0.974, pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },    // owlpost — entry (measured 0.974)
  { at: 1.0,   pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },    // owlpost — terminal hold, so the contact chapter is framed while it is read
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
  // Re-measured 2026-08-26 via `PORT=5173 node tools/measure_mobile.mjs` at 390×844.
  // Model chapters get an entry + hold pair bracketing the reading window; text/photo
  // chapters (about, spells, chronicles, grimoire) keep a single key.
  { at: 0.0,   pos: [0, 0.7, 3.9],     look: [0, 0.12, 0] },  // hero — close, figurine fills the portrait frame
  { at: 0.07,  pos: [0, 0.7, 3.9],     look: [0, 0.12, 0] },  // hero — hold while the figurine spins 360°
  { at: 0.145, pos: [2.1, 1.1, 3.5],   look: [0, 0.25, 0] },  // about — tight 3/4 (text + photo card)
  { at: 0.268, pos: [-2.2, 1.3, 3.7],  look: [0, 0.35, 0] },  // spells — orbit the central wizard
  { at: 0.378, pos: [-7, 0.6, 6.0],    look: [-7, -0.45, -1] }, // pact — both figures lifted above copy (entry)
  { at: 0.457, pos: [-7, 0.6, 6.0],    look: [-7, -0.45, -1] }, // pact — hold through the reading window
  { at: 0.499, pos: [12, 0.95, 8.6],   look: [12, -0.2, 0] }, // tracker — pulled back so the whole cricketer reads (entry)
  { at: 0.587, pos: [12, 0.95, 8.6],   look: [12, -0.2, 0] }, // tracker — hold through the reading window
  { at: 0.634, pos: [22, 2.9, 8.0],    look: [22, -0.85, 0.35] }, // map — angled down, parchment fills top band (entry)
  { at: 0.719, pos: [22, 2.9, 8.0],    look: [22, -0.85, 0.35] }, // map — hold; the reticle locks here
  { at: 0.783, pos: [-2.1, 1.3, 3.8],  look: [0, 0.3, 0] },   // chronicles — central wizard (timeline)
  { at: 0.883, pos: [2.4, 0.35, 3.8],  look: [0, 0.05, 0] },  // grimoire — central wizard, low hero angle (cards)
  { at: 0.964, pos: [0, 0.9, 8.0],     look: [0, 0.2, 0] },   // owlpost — pull back (entry)
  { at: 1.0,   pos: [0, 0.9, 8.0],     look: [0, 0.2, 0] },   // owlpost — terminal hold
]

const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 720)

const ACTIVE_KEYS = isMobile ? KEYS_MOBILE : KEYS

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

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

/** Reduced motion: hold the containing chapter's entry pose (no continuous travel). */
function sampleStepped(progress: number, key: 'pos' | 'look', destination: THREE.Vector3) {
  let active = ACTIVE_KEYS[0]
  for (const k of ACTIVE_KEYS) {
    if (progress >= k.at) active = k
    else break
  }
  destination.fromArray(active[key])
}

export function CameraRig() {
  const { camera } = useThree()

  useFrame((_, delta) => {
    const progress = scrollState.progress
    if (reduceMotion) {
      // Step between chapter entry poses with a short micro-lerp; no parallax,
      // no continuous large-field travel (the primary vestibular trigger here).
      sampleStepped(progress, 'pos', target)
      sampleStepped(progress, 'look', targetLook)
    } else {
      sampleKeyframes(progress, 'pos', target)
      sampleKeyframes(progress, 'look', targetLook)

      // Steady on first page, light parallax after intro completes.
      const intro = THREE.MathUtils.smoothstep(scrollState.progress / 0.10, 0, 1)
      const parallax = THREE.MathUtils.lerp(0.08, 0.6, intro)
      target.x += scrollState.pointerX * parallax
      target.y += -scrollState.pointerY * parallax * 0.5
    }

    // Reduce motion smoothing slightly for crisper responsiveness.
    // (~150ms settle under reduced motion so pose changes read as cuts, not flights)
    const smooth = reduceMotion ? 1 - Math.pow(0.002, delta) : 1 - Math.pow(0.055, delta)
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
