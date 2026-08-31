import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
// From the concrete file, not the `@react-three/drei` barrel — see the comment on
// the drei imports in Stage.tsx for why.
import { Sparkles } from '@react-three/drei/core/Sparkles'
import type { Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
import { damp } from '../lib/frame'
import { scrollState } from '../lib/scrollState'
import { isCoarsePointer } from '../lib/media'
import { applyWizardingMaterials } from './characterMaterial'
import { useKtx2Gltf } from './ktx2'
import { heroPose } from './heroPose'
import { targetIntensity, wizardState } from './wizardState'
import { orbitState, useDragOrbit } from './useDragOrbit'

const MODEL = '/models/wizard_improved.glb'
// Model-space position of the wand tip. `gltf-transform inspect` puts this GLB's
// whole bounding box at roughly [-0.36, 0.26] x [-0.5, 0.5] x [-0.26, 0.26] — much
// smaller than the brief's original guess assumed — so this was tuned by rendering
// a temporary debug marker at the candidate position and nudging it onto the wand
// tip visible in the screenshot. See task-5-report.md for the values it moved through.
const WAND_TIP: [number, number, number] = [0.16, -0.1, 0.18]

// Desktop: the hero copy reserves the right ~42% of the row (see Hero.css), so the
// model sits centred in that reserved column. Mobile: there is no reserved column —
// the copy runs full width — so the model shrinks and moves up and behind it, read
// as an ambient background shape rather than a competing figure.
const DESKTOP_POSITION: [number, number, number] = [1.4, -0.21, 0]
const DESKTOP_SCALE = 1.3
const MOBILE_POSITION: [number, number, number] = [0, -1.21, 0]
const MOBILE_SCALE = 0.3
// The GLB's forward axis faces away from the camera as exported; rotate the whole
// rig 180° so the figure reads face-on rather than showing the back of the head.
const BASE_YAW = Math.PI

export function HeroWizard() {
  useDragOrbit()
  const { scene } = useKtx2Gltf(MODEL)
  const group = useRef<Group>(null)
  const glow = useRef<PointLight>(null)

  // Mobile placement is a one-time layout decision, not a per-frame concern — this
  // component is remounted on a hard breakpoint change (page reload), same as
  // shouldRenderStage's own capability checks.
  const mobile = useMemo(
    () => isCoarsePointer() || (typeof window !== 'undefined' && window.innerWidth < 900),
    [],
  )
  const basePosition = mobile ? MOBILE_POSITION : DESKTOP_POSITION
  const baseScale = mobile ? MOBILE_SCALE : DESKTOP_SCALE

  // Clone so HMR never mutates the cached GLTF's shared materials. Collecting the
  // transparent materials once here — instead of re-traversing the scene graph every
  // frame just to touch `.opacity` — keeps the frame body allocation-free.
  const { model, materials } = useMemo(() => {
    const copy = scene.clone(true)
    applyWizardingMaterials(copy)
    const mats: MeshStandardMaterial[] = []
    copy.traverse((child) => {
      const mesh = child as Mesh
      const mat = mesh.material as MeshStandardMaterial | undefined
      if (mesh.isMesh && mat && 'transparent' in mat) {
        mat.transparent = true
        mats.push(mat)
      }
    })
    return { model: copy, materials: mats }
  }, [scene])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return

    const visible = scrollState.heroVisible
    g.visible = visible > 0.01
    // Once the hero is gone the model costs one visibility check per frame, nothing more.
    if (!g.visible) return

    const pose = heroPose(scrollState.pointerX, scrollState.pointerY, visible)
    const t = state.clock.elapsedTime

    const orbit = orbitState.dragging
      ? orbitState.offset
      : (orbitState.offset = damp(orbitState.offset, 0, 1.4, dt))

    g.rotation.y = damp(
      g.rotation.y,
      BASE_YAW + pose.yaw + orbit + Math.sin(t * 0.18) * 0.06,
      2.6,
      dt,
    )
    g.rotation.x = damp(g.rotation.x, pose.pitch, 2.6, dt)
    g.position.y = damp(
      g.position.y,
      basePosition[1] + pose.lift + Math.sin(t * 0.7) * 0.045,
      2.2,
      dt,
    )

    for (let i = 0; i < materials.length; i++) {
      materials[i].opacity = pose.opacity
    }

    wizardState.intensity = damp(
      wizardState.intensity,
      targetIntensity(wizardState.mode),
      3,
      dt,
    )
    if (glow.current) {
      // A slow flicker on top of the mood level, so the wand never looks like a lamp.
      glow.current.intensity =
        (2 + wizardState.intensity * 9) * (0.88 + Math.sin(t * 5.3) * 0.12)
    }
  })

  return (
    <group ref={group} position={basePosition} scale={baseScale} dispose={null}>
      <primitive object={model} />
      {/* distance/scale below are proportioned to the GLB's true ~1-unit-tall bounding
          box, not the brief's 3.4/[0.9,1.2,0.9] defaults, which were sized for a model
          roughly 3x this one's scale and bathed the whole figure instead of the wand. */}
      <pointLight ref={glow} position={WAND_TIP} color="#ffd79a" distance={1.1} decay={2} />
      <Sparkles
        count={16}
        scale={[0.14, 0.18, 0.14]}
        position={WAND_TIP}
        size={2.4}
        speed={0.35}
        color="#f6dfa6"
      />
    </group>
  )
}
