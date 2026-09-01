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
import { exposeRigTelemetry, rigTelemetry } from './rigTelemetry'
import {
  INTENSITY_LAMBDA,
  INTRO_LAMBDA,
  LIFT_LAMBDA,
  PITCH_LAMBDA,
  STATION_LAMBDA,
  TURN_LAMBDA,
  advanceFade,
  rigVisibility,
} from './motion'
import {
  HERO_INTRO,
  HERO_INTRO_DOLLY,
  entryOffsets,
  introOffsets,
  type EntryOffsets,
} from './choreography'
import { pinnedYaw, rigPose, type Pose } from './rigPose'
import { targetIntensity, wizardState } from './wizardState'
import { advanceOrbit, orbitState, useDragOrbit } from './useDragOrbit'
import { HERO_RIG_ID, HERO_SECTION_ID, RIGS, stationFor, type RigSpec } from './rigs'

// Model-space position of the wand tip, tuned against the hero wizard's own
// geometry (see task-5-report.md from the predecessor plan). Reused as a shared
// "wand glow" anchor across every rig — a stylistic constant for the site's
// magic-light accent, not a per-model measurement.
const WAND_TIP: [number, number, number] = [0.16, -0.1, 0.18]

// How far the wand's light carries, in world units, at the hero's own desktop
// scale. Scaled by the rig's current scale every frame — see the frame loop.
const GLOW_DISTANCE = 1.1

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
  activeId = HERO_SECTION_ID,
}: {
  spec: RigSpec
  fadeIn: boolean
  skipInitialFade?: boolean
  mobile: boolean
  /**
   * The section that owns the screen right now. Only mobile reads it: there,
   * this one rig stays mounted for the whole page and travels between
   * `MOBILE_STATIONS`, so the active section is what decides where it stands.
   * Desktop hands each section its own rig and ignores this entirely.
   */
  activeId?: string
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
  // A second reusable offsets object, because the intro's offsets are ADDED to
  // the entry's rather than replacing them, and one object cannot be both the
  // destination and an addend without the first write clobbering the second.
  const introEntry = useRef<EntryOffsets>({ lift: 0, yaw: 0, scale: 0 }).current
  // The one-shot opening push-in's progress, 0 to 1. Only ever advanced by the
  // rig that mounted already materialised — see the frame loop.
  const intro = useRef(0)
  // Latches once the telemetry singleton has had a real frame written into it.
  const exposed = useRef(false)
  // Latches once this rig's `markModelReady` fires, so the check is a single
  // property write on the settling frame rather than every frame after.
  const reportedReady = useRef(false)

  // `mobile` arrives from `Stage`, which asks `useIsMobileStage` once for the
  // whole scene. It used to be recomputed here, per mounted rig — which was
  // fine while it only chose a position, and is not now that the same answer
  // also decides which rigs exist (rigs.ts's gate) and which way a dissolving
  // one drifts. Those three cannot be allowed to disagree.
  // On mobile the figure's placement comes from the active section's station,
  // not from the spec — one rig, six stations, travelling between them. On
  // desktop the spec is still the whole answer, exactly as before.
  const station = stationFor(activeId)
  const atHeroStation = activeId === HERO_SECTION_ID || activeId === ''
  const basePosition = mobile ? station.position : spec.position
  const baseScale = mobile ? station.scale : spec.scale
  const stationYaw = mobile ? station.yaw : 0
  // Where the rig is mounted, which is only ever the FIRST station it sees.
  // Everything after that is damped toward `basePosition` in the frame loop, so
  // the mount position must not follow the active section or a rig would
  // teleport to each new station and then damp from there.
  //
  // The rig that opens the page mounts already displaced by its push-in, not on
  // its mark. Measured with `npm run check:stations` before this: mounting on
  // the mark made the frame loop damp the figure BACKWARDS to the dolly and
  // then forwards again — a pull-back the entrance was never supposed to have,
  // and the probe read it as `z 0.000 -> -0.009`, no travel at all.
  const mountPosition = useRef<[number, number, number]>(
    skipInitialFade
      ? [basePosition[0], basePosition[1] + HERO_INTRO.lift, basePosition[2] + HERO_INTRO_DOLLY]
      : basePosition,
  ).current
  const mountScale = useRef(
    skipInitialFade ? baseScale * (1 + HERO_INTRO.scale) : baseScale,
  ).current

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
    // The hero's scroll-driven `heroVisible` measure applies only while the
    // hero station owns the screen. On mobile this rig outlives the hero
    // section (see rigs.ts's rigFor), and applied unconditionally the measure
    // would fade it out one screen down — exactly where it should instead be
    // setting off for the About station. Desktop always passes true.
    const visible = rigVisibility(spec.id, fade.current, scrollState, !mobile || atHeroStation)
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
    rigPose(
      scrollState.pointerX,
      scrollState.pointerY,
      focusBias,
      visible,
      pose,
      mobile,
      mobile ? station.presence : undefined,
    )
    // The rig's own cross-fade is the only input: no scroll fraction, no timer.
    entryOffsets(spec.id, fade.current, entry)

    // The one-shot opening push-in, on top of whatever the entry above asked
    // for. Only the rig that mounted already materialised has one — every other
    // rig arrives by cross-fade and gets its move from `ENTRIES`. Advancing
    // this ref is the only timer-like state on the rig, and it is a damp toward
    // 1, not a clock: a 144Hz display and a 60Hz one see the same arrival.
    let introDolly = 0
    if (skipInitialFade) {
      intro.current = damp(intro.current, 1, INTRO_LAMBDA, dt)
      introDolly = introOffsets(intro.current, introEntry)
      entry.lift += introEntry.lift
      entry.yaw += introEntry.yaw
      entry.scale += introEntry.scale
    }

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
      BASE_YAW +
        stationYaw +
        pose.yaw +
        orbit +
        pinnedTurn +
        entry.yaw +
        Math.sin(t * 0.18) * 0.06,
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
    // x and z were fixed by the mount prop until stations existed: a desktop
    // rig never moves sideways, it hands over to another rig. The mobile rig
    // does move — it is the same figure crossing the screen — so both axes are
    // damped toward the active station at STATION_LAMBDA, the slowest of the
    // rig's rates, because this is a journey rather than a settle. On desktop
    // the target is the spec's own constant, so these two damps are no-ops.
    g.position.x = damp(g.position.x, basePosition[0], STATION_LAMBDA, dt)
    g.position.z = damp(g.position.z, basePosition[2] + introDolly, STATION_LAMBDA, dt)
    // `scale` was a fixed prop until now. Setting it here as well is safe —
    // three reads the object's own scale each frame, and the prop only seeds it.
    // STATION_LAMBDA on mobile so size travels with position; a scale that
    // arrived at LIFT_LAMBDA while the figure was still crossing read as the
    // model growing in place and then sliding.
    g.scale.setScalar(
      damp(g.scale.x, baseScale * (1 + entry.scale), mobile ? STATION_LAMBDA : LIFT_LAMBDA, dt),
    )

    for (let i = 0; i < materials.length; i++) {
      materials[i].opacity = pose.opacity
    }

    // Published for `tools/check_stations.mjs`, which is the only thing that can
    // see the push-in and the station travel — both are mid-transition states,
    // and a screenshot only ever catches a settled one. Six writes into a
    // preallocated object; nothing allocates. Only the rig that is fading IN
    // publishes, so an outgoing rig mid-dissolve cannot overwrite the readings
    // of the one that has taken over.
    if (fadeIn) {
      rigTelemetry.x = g.position.x
      rigTelemetry.y = g.position.y
      rigTelemetry.z = g.position.z
      rigTelemetry.scale = g.scale.x
      rigTelemetry.opacity = pose.opacity
      rigTelemetry.intro = intro.current
      // Published only once there is something real to read. Exposing it from an
      // effect instead let a probe sample the untouched singleton — all zeros —
      // as if it were the rig's first frame, which read as "the figure never
      // moved and was never lit".
      if (!exposed.current) {
        exposed.current = true
        exposeRigTelemetry()
      }
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
      // The halo has to shrink with the figure. `distance` is a world-space
      // radius: three does not scale it with the parent group the way it scales
      // the light's position, so a rig standing at a 0.66-scale mobile station
      // kept a halo sized for the 1.3-scale desktop hero. Measured in
      // .shots/mobile-skills.png at the first pass: the body was a smudge
      // inside its own glow, and what read on screen was sparkle dust, not a
      // figure. Divided by the hero's own desktop scale so the desktop hero,
      // the case GLOW_DISTANCE was tuned against, comes out unchanged.
      glowRef.current.distance = GLOW_DISTANCE * (g.scale.x / RIGS[''].scale)
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
    <group ref={group} position={mountPosition} scale={mountScale} dispose={null}>
      <primitive object={model} />
      <pointLight
        ref={glowRef}
        position={WAND_TIP}
        color="#ffd79a"
        distance={GLOW_DISTANCE}
        decay={2}
      />
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
