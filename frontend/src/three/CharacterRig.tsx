import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
// From the concrete file, not the `@react-three/drei` barrel — see the comment on
// the drei imports in Stage.tsx for why.
import { Sparkles } from '@react-three/drei/core/Sparkles'
import type { Group, Mesh, MeshStandardMaterial, PointLight, Points } from 'three'
import { projects } from '../content'
import { damp } from '../lib/frame'
import { focusState } from '../lib/focusState'
import { scrollState } from '../lib/scrollState'
import { applyWizardingMaterials, cloneMaterials, disposeMaterials } from './characterMaterial'
import { useKtx2Gltf } from './ktx2'
import { markModelReady } from './modelReadiness'
import {
  INTENSITY_LAMBDA,
  LIFT_LAMBDA,
  PITCH_LAMBDA,
  TURN_LAMBDA,
  advanceFade,
  rigVisibility,
} from './motion'
import { entryOffsets, type EntryOffsets } from './choreography'
import { pinnedYaw, rigPose, type Pose } from './rigPose'
import { targetIntensity, wizardState } from './wizardState'
import { advanceOrbit, orbitState, useDragOrbit } from './useDragOrbit'
import { HERO_RIG_ID, type RigSpec } from './rigs'

// Model-space position of the wand tip, tuned against the hero wizard's own
// geometry (see task-5-report.md from the predecessor plan). Reused as a shared
// "wand glow" anchor across every rig — a stylistic constant for the site's
// magic-light accent, not a per-model measurement.
const WAND_TIP: [number, number, number] = [0.16, -0.1, 0.18]

// Every shipped GLB's forward axis faces away from the camera as exported —
// rotate the whole rig 180° so the figure reads face-on rather than showing
// the back of the head.
const BASE_YAW = Math.PI

// Which way the Work rig turns for each featured project, derived from the
// featured grid's own layout (Work.css: the first card spans the full row,
// every card after it alternates between the grid's two columns) rather than
// a table keyed on specific slugs — so reordering or renaming a project in
// content/projects.ts can't silently point the model at the wrong side.
// Built once, at module scope, so useFrame only ever does a Map lookup.
const FOCUS_YAW_MAGNITUDE = 0.24
const FOCUS_YAW_BIAS: ReadonlyMap<string, number> = (() => {
  const bias = new Map<string, number>()
  const featured = projects.filter((p) => p.featured)
  featured.forEach((project, i) => {
    if (i === 0) {
      bias.set(project.slug, 0) // the full-width lead card — no side to turn toward
      return
    }
    const onLeft = (i - 1) % 2 === 0
    bias.set(project.slug, onLeft ? -FOCUS_YAW_MAGNITUDE : FOCUS_YAW_MAGNITUDE)
  })
  return bias
})()

// How bright the wand gets while a project card holds focus — brighter than
// idle or attentive, shy of full "casting" so this reads as "attentive to the
// visitor" without fighting the chat UI's own mood signal.
const FOCUS_INTENSITY_TARGET = 0.75

// How far into its fade-in a rig counts as "visibly settled" for
// `markModelReady` — high enough that a screenshot taken right after isn't
// noticeably dimmer than the fully-settled model, low enough to fire before
// `FADE_LAMBDA` (motion.ts) has asymptotically crept the last few percent
// forever.
const READY_FADE_THRESHOLD = 0.95

/**
 * One rig, wearing whichever model `spec` names. Absorbs everything the
 * predecessor plan's `HeroWizard` did — pointer parallax, drag-to-orbit, the
 * wand-tip light and sparkles, the visibility fade and lift — generalised so any
 * section's model gets the same treatment, with the hero's own tuned constants
 * (`spec.position`/`spec.scale` for `'hero'`) carried over verbatim.
 *
 * `skipInitialFade` lets `SceneDirector` mount the very first rig of the page
 * (always the hero, before the visitor has done anything) already fully
 * materialised — the hero previously used `scrollState.heroVisible` directly
 * and was never seen fading in, and this preserves that. It only affects the
 * very first frame's starting value; a later cross-fade back to the hero
 * mounts a fresh instance with `skipInitialFade` unset and dissolves in as
 * normal.
 */
export function CharacterRig({
  spec,
  fadeIn,
  skipInitialFade = false,
  mobile,
}: {
  spec: RigSpec
  fadeIn: boolean
  skipInitialFade?: boolean
  mobile: boolean
}) {
  const isHero = spec.id === HERO_RIG_ID
  // Only the hero section installs the drag-orbit listeners — `#top` is the hero
  // section element, and dragging any other rig was never a feature.
  useDragOrbit(isHero)

  const { scene } = useKtx2Gltf(spec.model)
  const group = useRef<Group>(null)
  const glowRef = useRef<PointLight>(null)
  const sparklesRef = useRef<Points>(null)
  // This rig's own cross-fade progress, independent of the hero's scroll-driven
  // heroVisible fraction (see the frame loop below).
  const fade = useRef(skipInitialFade ? 1 : 0)
  // Reused every frame instead of a fresh `{ yaw, pitch, lift, opacity }`
  // object literal per call — `rigPose` writes into this in place.
  const pose = useRef<Pose>({ yaw: 0, pitch: 0, lift: 0, opacity: 0 }).current
  // Reused every frame for the same reason `pose` is — see rigPose.
  const entry = useRef<EntryOffsets>({ lift: 0, yaw: 0, scale: 0 }).current
  // Latches once this rig's `markModelReady` fires, so the check is a single
  // property write on the settling frame rather than every frame after.
  const reportedReady = useRef(false)

  // `mobile` arrives from `Stage`, which asks `useIsMobileStage` once for the
  // whole scene. It used to be recomputed here, per mounted rig — which was
  // fine while it only chose a position, and is not now that the same answer
  // also decides which rigs exist (rigs.ts's gate) and which way a dissolving
  // one drifts. Those three cannot be allowed to disagree.
  const basePosition = mobile ? spec.mobilePosition : spec.position
  const baseScale = mobile ? spec.mobileScale : spec.scale

  // `scene.clone(true)` deep-clones the node hierarchy, but three's Mesh#copy()
  // assigns the *same* material reference(s) as the source — it does not clone
  // them (see `cloneMaterials`'s doc comment). `scene` here is the cached GLTF
  // scene from `useKtx2Gltf`'s URL-keyed cache, and this rig mounts repeatedly
  // as sections change, so without `cloneMaterials` every mount of the same
  // model would fight over one shared set of materials. `cloneMaterials` runs
  // first so `applyWizardingMaterials` — including its `Glow_*` emissive
  // pass-through — operates on this instance's own materials. Collecting the
  // transparent materials once here — instead of re-traversing the scene graph
  // every frame just to touch `.opacity` — keeps the frame body allocation-free.
  const { model, materials } = useMemo(() => {
    const copy = scene.clone(true)
    cloneMaterials(copy)
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

  // Now that this rig owns its materials outright (cloned above, not shared with
  // the cache), it must dispose them on unmount or every mount leaks GPU memory.
  // Geometry is NOT disposed — it's still shared with the cache and other
  // mounts of the same model still read it.
  useEffect(() => {
    return () => disposeMaterials(model)
  }, [model])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return

    // This rig's own cross-fade, driven by SceneDirector's fadeIn prop, always
    // advances — including while invisible — so an incoming rig actually ramps
    // 0 → 1 rather than freezing at 0 behind the early return below.
    fade.current = advanceFade(fade.current, fadeIn, dt)
    // Only the incoming rig ever reports ready — an outgoing one's fade only
    // ever heads toward 0, so it would never cross the threshold anyway.
    if (fadeIn && !reportedReady.current && fade.current > READY_FADE_THRESHOLD) {
      reportedReady.current = true
      markModelReady(spec.id)
    }
    // The hero additionally tracks how much of it is still on screen as the
    // visitor scrolls past. `rigVisibility` owns which scroll channel that
    // reads — the smoothed one, so this fade glides with the scroll instead of
    // stepping with the wheel like the raw field does.
    const visible = rigVisibility(spec.id, fade.current, scrollState)
    g.visible = visible > 0.01
    // Once a rig has fully faded out it costs one visibility check per frame,
    // nothing more.
    if (!g.visible) return

    // Only the Work rig turns toward a focused project card — a visitor
    // tabbing through Work's links while a different section owns the screen
    // still updates focusState, but that section's model shouldn't react to it.
    const isWorkRig = spec.id === 'work'
    const focusedSlug = isWorkRig ? focusState.projectSlug : null
    const focusBias = focusedSlug !== null ? (FOCUS_YAW_BIAS.get(focusedSlug) ?? 0) : 0
    rigPose(scrollState.pointerX, scrollState.pointerY, focusBias, visible, pose, mobile)
    // The rig's own cross-fade is the only input: no scroll fraction, no timer.
    entryOffsets(spec.id, fade.current, entry)
    const t = state.clock.elapsedTime

    // Written as a statement, not a nested ternary with an inline call: this
    // runs every frame, and `advanceOrbit` mutates `orbitState` in place rather
    // than returning a fresh object, so the assignment has to be a statement.
    let orbit = 0
    if (isHero) {
      if (!orbitState.dragging) advanceOrbit(orbitState, dt)
      orbit = orbitState.offset
    }

    // Only the pinned section's own rig turns with scroll; `pinnedYaw` returns
    // zero for everyone else, so a stale `pinnedProgress` left behind after
    // `registerPinnedSection(null)` can't leak into another section's pose.
    // Added into the same damped yaw as everything else, so the turn inherits
    // the usual settle speed rather than stepping with the wheel.
    // The SMOOTHED pinnedProgress. The damp below would absorb a wheel notch
    // eventually, but it would absorb it as a shove: the target jumps, the yaw
    // lurches after it, and the turn reads as the model being dragged rather
    // than as the model turning. Feeding it a continuous target instead means
    // the only lag left is the one we chose (TURN_LAMBDA).
    const pinnedTurn = pinnedYaw(spec.id, scrollState.smooth.pinnedProgress)

    g.rotation.y = damp(
      g.rotation.y,
      BASE_YAW + pose.yaw + orbit + pinnedTurn + entry.yaw + Math.sin(t * 0.18) * 0.06,
      TURN_LAMBDA,
      dt,
    )
    g.rotation.x = damp(g.rotation.x, pose.pitch, PITCH_LAMBDA, dt)
    g.position.y = damp(
      g.position.y,
      basePosition[1] + pose.lift + entry.lift + Math.sin(t * 0.7) * 0.045,
      LIFT_LAMBDA,
      dt,
    )
    // `scale` was a fixed prop until now. Setting it here as well is safe —
    // three reads the object's own scale each frame, and the prop only seeds it.
    g.scale.setScalar(damp(g.scale.x, baseScale * (1 + entry.scale), LIFT_LAMBDA, dt))

    for (let i = 0; i < materials.length; i++) {
      materials[i].opacity = pose.opacity
    }

    // A focused project card brightens the wand on top of whatever the chat
    // UI's mood already asks for — never dimmer than that baseline.
    const cardFocused = focusedSlug !== null && FOCUS_YAW_BIAS.has(focusedSlug)
    const intensityTarget = cardFocused
      ? Math.max(targetIntensity(wizardState.mode), FOCUS_INTENSITY_TARGET)
      : targetIntensity(wizardState.mode)
    wizardState.intensity = damp(wizardState.intensity, intensityTarget, INTENSITY_LAMBDA, dt)
    // Both the wand light and the sparkles ride on `pose.opacity` — the exact
    // same value driving the body materials above — so the FX can never lead
    // the body's own fade-in (Finding 2: previously both rendered at full
    // configuration regardless of `fade`, so a visitor saw a bright wand tip
    // and floating sparkles over a body that was still materialising).
    if (glowRef.current) {
      // A slow flicker on top of the mood level, so the wand never looks like a lamp.
      glowRef.current.intensity =
        (2 + wizardState.intensity * 9) * (0.88 + Math.sin(t * 5.3) * 0.12) * pose.opacity
    }
    if (sparklesRef.current) {
      // Sparkles' own particle shader has no per-frame opacity uniform to
      // drive (its alpha comes from a static per-particle buffer attribute
      // baked in at creation), so scaling the whole point cloud toward zero
      // is the allocation-free way to tie it to the same fade curve.
      sparklesRef.current.scale.setScalar(pose.opacity)
    }
  })

  return (
    // `dispose={null}` stays: R3F's default auto-dispose walks this whole subtree
    // on unmount and disposes BOTH geometry and material on everything under it,
    // which would dispose the geometries still shared with the GLTF cache. The
    // `useEffect` above disposes the (now-owned) materials by hand instead, and
    // leaves geometry alone.
    <group ref={group} position={basePosition} scale={baseScale} dispose={null}>
      <primitive object={model} />
      <pointLight ref={glowRef} position={WAND_TIP} color="#ffd79a" distance={1.1} decay={2} />
      <Sparkles
        ref={sparklesRef}
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
