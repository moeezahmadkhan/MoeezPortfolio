# The Tracker Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scroll-driven 3D "Tracker" chapter (Chapter V, after Grimoire) where a static cricketer figure on a holographic scanner station has his heart rate spike, the watch's data is captured & saved, and an AI core surfaces an insight — told purely through 3D design.

**Architecture:** A self-contained `src/scene/tracker/` group lives at a new world anchor inside the single existing `<Canvas>`; the camera flies to it via new `CameraRig` keyframes (scene never re-mounts). All FX are driven by the global `scrollState` singleton inside `useFrame` and gated by per-beat phase windows derived from a calibrated section scroll range. The cricket GLB is static (no rig, watch baked in), so heartbeat/scan/data FX are holographic overlays anchored to tunable local constants.

**Tech Stack:** React, TypeScript, three.js 0.169, @react-three/fiber, @react-three/drei 9.122 (`<Text>`, `<Line>`), @react-three/postprocessing (existing Bloom). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-04-tracker-chapter-design.md`

**Verification model:** This project has no unit-test runner (per `frontend/CLAUDE.md`). Each task is verified by:
- `npm run build` (run from `frontend/`) — the `tsc -b` typecheck is the correctness gate; it must pass.
- The screenshot harness for visual tasks: start the dev server, then `node scripts/shoot.cjs http://localhost:5173 .shots/<dir> <fractions>` and **look at the PNGs** with the Read tool.

All commands below run from `/home/quids/MoeezPortfolio/frontend` unless noted. The branch `feat/tracker-chapter` already exists and holds the spec commit.

---

## Task 1: Add the Tracker HTML chapter (renumber downstream)

**Files:**
- Modify: `frontend/src/components/Sections.tsx`
- Modify: `frontend/src/components/sections.css`
- Modify: `frontend/src/App.tsx:69-76`
- Modify: `frontend/src/components/ScrollRail.tsx:5-12`

- [ ] **Step 1: Add the `Tracker` section component**

In `frontend/src/components/Sections.tsx`, add this component after `Grimoire` (before `Chronicles`). It is a tall **pinned** section (sticky stage) providing the scroll runway for the 3D beats; the 3D itself renders in the canvas behind it.

```tsx
export function Tracker() {
  return (
    <section id="tracker" className="section section--tracker tracker--pinned">
      <div className="tracker__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter V — The Tracker</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="It reads the pulse" />
        <Reveal delay={0.1}>
          <p className="tracker__lede">
            A wrist. A heartbeat climbing under effort. The signal is caught,
            saved, and read — an intelligence that answers for the body in motion.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Renumber the eyebrows of the following chapters**

In the same file, change `Chronicles`' eyebrow from `Chapter V — Chronicles` to `Chapter VI — Chronicles`, and `OwlPost`'s eyebrow from `Chapter VI — Owl Post` to `Chapter VII — Owl Post`.

- [ ] **Step 3: Add the pinned section CSS**

Append to `frontend/src/components/sections.css` (mirrors the `spells--pinned` pattern — a tall section with a centered sticky stage so the 3D beats have scroll runway):

```css
/* ── Chapter V — The Tracker (pinned runway) ── */
.tracker--pinned {
  height: 300vh;
  padding: 0;
}
.tracker__stage {
  position: sticky;
  top: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2rem;
  max-width: var(--wrap, 1100px);
  margin: 0 auto;
  padding: 0 clamp(1.2rem, 5vw, 4rem);
  pointer-events: none;
}
.tracker__lede {
  max-width: 32ch;
  color: var(--ink-200, #c9c4d4);
  font-family: var(--font-body, 'Cormorant Garamond', serif);
  font-size: clamp(1.1rem, 2.2vw, 1.5rem);
  line-height: 1.5;
}
```

> If `sections.css` does not define `--wrap`/`--ink-200`/`--font-body`, copy the concrete values used by `.section--spells`/`.spells__stage` in the same file instead.

- [ ] **Step 4: Render `<Tracker />` in App between Grimoire and Chronicles**

In `frontend/src/App.tsx`, update the import on line 9 and the `<main>` block (lines 69-76):

```tsx
import { About, Spells, Grimoire, Tracker, Chronicles, OwlPost } from './components/Sections'
```

```tsx
      <main>
        <Hero />
        <About />
        <Spells />
        <Grimoire />
        <Tracker />
        <Chronicles />
        <OwlPost />
      </main>
```

- [ ] **Step 5: Add the rail mark and relabel**

In `frontend/src/components/ScrollRail.tsx`, replace the `chapters` array (lines 5-12):

```tsx
const chapters = [
  { id: 'top', label: 'I' },
  { id: 'wizard', label: 'II' },
  { id: 'spells', label: 'III' },
  { id: 'grimoire', label: 'IV' },
  { id: 'tracker', label: 'V' },
  { id: 'chronicles', label: 'VI' },
  { id: 'owlpost', label: 'VII' },
]
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: PASS (no TS errors).

- [ ] **Step 7: Commit**

```bash
git add src/components/Sections.tsx src/components/sections.css src/App.tsx src/components/ScrollRail.tsx
git commit -m "feat: add pinned Tracker chapter (HTML) after Grimoire; renumber chapters"
```

---

## Task 2: Calibrate scroll fractions and add the camera keyframes

The Tracker section adds page height, so every section's scroll fraction shifts. This task measures the real fractions and wires the camera to fly to the station anchor.

**Files:**
- Create: `frontend/src/scene/tracker/phases.ts`
- Modify: `frontend/src/scene/CameraRig.tsx:9-18`

- [ ] **Step 1: Create the phases/constants module**

`frontend/src/scene/tracker/phases.ts` (one home for the section scroll range, the station's world placement, and the local-progress + easing helpers used by every FX child):

```ts
import * as THREE from 'three'

/**
 * World placement of the whole tracker station, offset from the wizard at the
 * origin so the camera physically travels to a separate "scanner" space.
 */
export const STATION: [number, number, number] = [12, 0, 0]

/** Local-space anchors (relative to the station group). */
export const WRIST_ANCHOR: [number, number, number] = [0.5, 0.3, 0.4]
export const DATASTORE_POS: [number, number, number] = [2.0, 0.9, 0]
export const AICORE_POS: [number, number, number] = [0, 2.4, 0]

/**
 * Scroll fractions spanning the pinned #tracker section. CALIBRATE in Step 2
 * from measured DOM offsets; keep in sync with the #tracker CameraRig KEYS.
 */
export const SECTION_START = 0.74
export const SECTION_END = 0.90

/** 0→1 progress within the tracker section. */
export function localProgress(progress: number) {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Eased 0→1 ramp of t across [start,end]. */
export function ramp(t: number, start: number, end: number) {
  return THREE.MathUtils.smoothstep(t, start, end)
}

/** 0→1→0 bump of t across [start,peak,end]. */
export function pulse(t: number, start: number, peak: number, end: number) {
  if (t <= start || t >= end) return 0
  return t < peak
    ? THREE.MathUtils.smoothstep(t, start, peak)
    : 1 - THREE.MathUtils.smoothstep(t, peak, end)
}
```

- [ ] **Step 2: Measure the real section fractions**

Start the dev server in the background, then capture nothing — just read offsets:

Run:
```bash
npm run dev &  # if not already running
sleep 4
node -e "const p=require('puppeteer-core');(async()=>{const b=await p.launch({executablePath:'/usr/bin/google-chrome-stable',headless:'new',args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--window-size=1440,900']});const pg=await b.newPage();await pg.setViewport({width:1440,height:900});await pg.goto('http://localhost:5173',{waitUntil:'networkidle2'});await new Promise(r=>setTimeout(r,6000));const o=await pg.evaluate(()=>{const max=document.documentElement.scrollHeight-innerHeight;return Object.fromEntries([...document.querySelectorAll('main section[id]')].map(s=>[s.id,{start:+(s.offsetTop/max).toFixed(3),end:+((s.offsetTop+s.offsetHeight-innerHeight)/max).toFixed(3)}]))});console.log(JSON.stringify(o,null,2));await b.close()})()"
```
Expected: a JSON map like `{ "tracker": { "start": 0.74, "end": 0.90 }, ... }`. Record the `tracker.start`/`tracker.end` and every section's `start`.

- [ ] **Step 3: Update `SECTION_START`/`SECTION_END`**

Set `SECTION_START` = measured `tracker.start` and `SECTION_END` = measured `tracker.end` in `phases.ts`. (Leaving a little inside the held range is fine — the beats only need to finish before `tracker.end`.)

- [ ] **Step 4: Update the camera keyframes**

In `frontend/src/scene/CameraRig.tsx`, replace the `KEYS` array (lines 9-18). Use the measured `start` of each section for its `at`. The two `tracker` keys frame the station (at `STATION = [12,0,0]`) and HOLD across the pinned beats; pos/look X are offset by +12 to match the station. Replace the numeric `at` values below with your measured fractions:

```ts
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.0,  pos: [0, 1.15, 5.5],  look: [0, 0.16, 0] },   // hero
  { at: 0.10, pos: [0, 1.15, 5.5],  look: [0, 0.16, 0] },   // hero — hold for 360° spin
  { at: 0.17, pos: [4.5, 1.8, 3.8], look: [0, 0.3, 0] },    // about (#wizard) — measured start
  { at: 0.27, pos: [-4.5, 2.6, 4.2], look: [0, 0.5, 0] },   // spells — entry
  { at: 0.52, pos: [-3.6, 2.2, 4.4], look: [0, 0.4, 0] },   // spells — held
  { at: 0.68, pos: [4.5, 0.4, 4.6], look: [0, 0.0, 0] },    // grimoire — measured start
  { at: 0.75, pos: [12, 1.2, 5.2],  look: [12, 0.4, 0] },   // tracker — entry (= SECTION_START)
  { at: 0.86, pos: [12.6, 1.0, 5.0], look: [12, 0.5, 0] },  // tracker — held across beats
  { at: 0.92, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },   // chronicles — measured start
  { at: 1.0,  pos: [0, 1.0, 10.5],  look: [0, 0.2, 0] },    // owlpost
]
```

> The two tracker `at` values should bracket `[SECTION_START, SECTION_END]`. The fly-from-grimoire interpolation (X sweeping 4.5 → 12) is what reads as "the camera travels to the station."

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS. (`phases.ts` exports are unused until Task 3 — that's fine; `tsc` does not error on unused module exports.)

- [ ] **Step 6: Commit**

```bash
git add src/scene/tracker/phases.ts src/scene/CameraRig.tsx
git commit -m "feat: tracker scroll-range constants + camera keyframes flying to the station"
```

---

## Task 3: TrackerStation base — the cricketer, lights, and scan platform

**Files:**
- Create: `frontend/src/scene/tracker/TrackerStation.tsx`
- Modify: `frontend/src/scene/Scene.tsx:14-19,71-98`

- [ ] **Step 1: Create `TrackerStation.tsx` (model + lights + platform only)**

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, localProgress } from './phases'

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
        if (m.isMesh && m.geometry) m.geometry.dispose?.()
      }),
    [model],
  )

  useFrame((state) => {
    if (!figure.current) return
    const t = state.clock.elapsedTime
    // Idle: slow bob + a gentle turn so the static sculpt feels alive.
    figure.current.position.y = Math.sin(t * 0.8) * 0.04
    figure.current.rotation.y = -0.4 + Math.sin(t * 0.18) * 0.12
    // localProgress is consumed by FX children; referenced here to keep the
    // station "active" only within its scroll range (cheap visibility cull).
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999
  })

  return (
    <group ref={group} position={STATION}>
      {/* cool scanner light rig, local to the station */}
      <pointLight position={[2, 3, 3]} intensity={6} color="#35e0ff" distance={14} decay={2} />
      <pointLight position={[-2.5, 1.5, 2]} intensity={3} color="#1f8fb0" distance={12} decay={2} />
      <spotLight position={[0, 5, 4]} angle={0.6} penumbra={1} intensity={10} color="#bfefff" target-position={[0, 0.5, 0]} />

      {/* scan platform rings on the floor */}
      <group position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
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
    </group>
  )
}
```

- [ ] **Step 2: Mount it in the scene + preload**

In `frontend/src/scene/Scene.tsx`, add the import near the other scene imports (after line 19):

```tsx
import { TrackerStation } from './tracker/TrackerStation'
```

Inside the `<Suspense fallback={null}>` block (after the `<RuneCircle />` on line 77), add:

```tsx
        <TrackerStation />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify — cricketer at the station**

Run (dev server must be running):
```bash
node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t3 0.74,0.78,0.82,0.86
```
Then Read the PNGs in `.shots/tracker-t3/`. Expected: the cricketer figure is framed on a glowing cyan ring platform, lit cool, against the dark background. (If off-frame, nudge the tracker camera `pos`/`look` in `CameraRig.tsx` and re-shoot.)

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/TrackerStation.tsx src/scene/Scene.tsx
git commit -m "feat: TrackerStation base — cricketer, cool light rig, scan platform"
```

---

## Task 4: ScanRings — pulsing tracking rings

**Files:**
- Create: `frontend/src/scene/tracker/ScanRings.tsx`
- Modify: `frontend/src/scene/tracker/TrackerStation.tsx`

- [ ] **Step 1: Create `ScanRings.tsx`**

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, ramp } from './phases'

const COUNT = 3

/** Concentric rings that expand + fade outward from the figure during tracking. */
export function ScanRings() {
  const rings = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const gate = ramp(lp, 0.15, 0.45) * (1 - ramp(lp, 0.85, 1.0))
    const t = state.clock.elapsedTime
    rings.current.forEach((m, i) => {
      if (!m) return
      const phase = (t * 0.5 + i / COUNT) % 1
      const s = 0.4 + phase * 2.2
      m.scale.set(s, s, s)
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity = gate * (1 - phase) * 0.6
    })
  })

  return (
    <group position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: COUNT }).map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) rings.current[i] = el }}>
          <ringGeometry args={[0.95, 1.0, 64]} />
          <meshBasicMaterial color="#35e0ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Render it inside the station**

In `TrackerStation.tsx`, import and place `<ScanRings />` inside the `<group ref={group} position={STATION}>`, after the figure group:

```tsx
import { ScanRings } from './ScanRings'
```
```tsx
        <ScanRings />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t4 0.78,0.80,0.82`
Read the PNGs. Expected: expanding cyan rings around the figure in the mid-section range.

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/ScanRings.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat: ScanRings — pulsing tracking rings gated to the track beat"
```

---

## Task 5: Heartbeat — the hero ECG + BPM

**Files:**
- Create: `frontend/src/scene/tracker/Heartbeat.tsx`
- Modify: `frontend/src/scene/tracker/TrackerStation.tsx`

- [ ] **Step 1: Create `Heartbeat.tsx`**

A live red ECG trace (a `THREE.Line` whose y-values are recomputed each frame) + a BPM number that climbs from 72→158, anchored at `WRIST_ANCHOR`. A small sphere "beat" marker pulses in sync.

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, localProgress, ramp } from './phases'

const N = 80          // ECG samples
const WIDTH = 1.4     // world width of the trace

/** A single PQRST-ish blip centred at x0 over the rolling window. */
function ecg(x: number) {
  // x in [0,1]; produce a flat line with a sharp spike near 0.5
  const d = x - 0.5
  const spike = Math.exp(-Math.pow(d * 30, 2)) * 1.0      // tall R
  const dip = -Math.exp(-Math.pow((d - 0.03) * 40, 2)) * 0.35
  return spike + dip
}

export function Heartbeat() {
  const line = useRef<THREE.Line>(null)
  const beat = useRef<THREE.Mesh>(null)
  const text = useRef<any>(null)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    return g
  }, [])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const intensity = ramp(lp, 0.15, 0.4)            // heartbeat ramps in
    const bpm = Math.round(72 + intensity * (158 - 72))
    const t = state.clock.elapsedTime
    const speed = 0.6 + intensity * 1.2              // trace scrolls faster as HR rises

    // update ECG positions
    const pos = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1)
      const rolled = (u + t * speed) % 1
      const y = ecg(rolled) * (0.12 + intensity * 0.28)
      pos.setXYZ(i, (u - 0.5) * WIDTH, y, 0)
    }
    pos.needsUpdate = true
    geometry.computeBoundingSphere()

    // BPM text
    if (text.current) text.current.text = `${bpm}`

    // beat marker pulse (synced to bpm)
    if (beat.current) {
      const hz = bpm / 60
      const s = 0.05 + Math.abs(Math.sin(t * Math.PI * hz)) * 0.05 * intensity
      beat.current.scale.setScalar(0.06 + s)
      ;(beat.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + intensity * 0.6
    }
  })

  return (
    <group position={WRIST_ANCHOR}>
      {/* ECG trace */}
      <primitive object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ff3344' }))} ref={line} />
      {/* BPM readout */}
      <Text ref={text} position={[0, 0.45, 0]} fontSize={0.34} color="#ff4d5e" anchorX="center" anchorY="middle">
        72
      </Text>
      <Text position={[0, 0.2, 0]} fontSize={0.1} color="#ff8a96" anchorX="center" anchorY="middle">
        BPM
      </Text>
      {/* pulse marker */}
      <mesh ref={beat} position={[WIDTH / 2, 0, 0]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ff5566" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}
```

> Note: `THREE.Line` is constructed inline and passed via `<primitive>` so it isn't confused with SVG `<line>`. The `line` ref is retained for clarity though geometry is updated directly.

- [ ] **Step 2: Render inside the station**

In `TrackerStation.tsx`:
```tsx
import { Heartbeat } from './Heartbeat'
```
```tsx
        <Heartbeat />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t5 0.76,0.80,0.84`
Read the PNGs. Expected: a red ECG trace + climbing BPM number near the wrist, brighter/taller deeper into the section. Adjust `WRIST_ANCHOR` in `phases.ts` if it doesn't sit by the wrist.

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/Heartbeat.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat: Heartbeat — hero ECG trace + climbing BPM at the wrist"
```

---

## Task 6: DataStream + DataStore — capture & save

**Files:**
- Create: `frontend/src/scene/tracker/DataStream.tsx`
- Modify: `frontend/src/scene/tracker/TrackerStation.tsx`

- [ ] **Step 1: Create `DataStream.tsx`**

Instanced particles travel from the wrist to a data-store cube that brightens as it "fills."

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, DATASTORE_POS, localProgress, ramp } from './phases'

const COUNT = 60
const dummy = new THREE.Object3D()

export function DataStream() {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const store = useRef<THREE.Mesh>(null)
  const from = useMemo(() => new THREE.Vector3(...WRIST_ANCHOR), [])
  const to = useMemo(() => new THREE.Vector3(...DATASTORE_POS), [])
  const offsets = useMemo(() => Array.from({ length: COUNT }, (_, i) => i / COUNT), [])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.45, 0.7)
    const t = state.clock.elapsedTime
    if (mesh.current) {
      for (let i = 0; i < COUNT; i++) {
        const p = (offsets[i] + t * 0.5) % 1
        dummy.position.lerpVectors(from, to, p)
        dummy.position.y += Math.sin(p * Math.PI) * 0.25 // gentle arc
        const s = save > 0 ? 0.03 : 0
        dummy.scale.setScalar(s)
        dummy.updateMatrix()
        mesh.current.setMatrixAt(i, dummy.matrix)
      }
      mesh.current.instanceMatrix.needsUpdate = true
    }
    if (store.current) {
      const mat = store.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.2 + save * 2.5
      store.current.scale.setScalar(0.9 + save * 0.2)
    }
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#7cffb0" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
      <mesh ref={store} position={DATASTORE_POS}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#0c2e22" emissive="#2bd47e" emissiveIntensity={0.2} metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Render inside the station**

In `TrackerStation.tsx`:
```tsx
import { DataStream } from './DataStream'
```
```tsx
        <DataStream />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t6 0.82,0.85,0.88`
Read the PNGs. Expected: green particles streaming from the wrist toward a glowing store cube that brightens in the save range.

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/DataStream.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat: DataStream + DataStore — wrist data flowing into a filling store"
```

---

## Task 7: AICore — the answering intelligence

**Files:**
- Create: `frontend/src/scene/tracker/AICore.tsx`
- Modify: `frontend/src/scene/tracker/TrackerStation.tsx`

- [ ] **Step 1: Create `AICore.tsx`**

A green icosahedron that ingests the saved data and brightens/scales up during the answer beat.

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { AICORE_POS, localProgress, ramp } from './phases'

export function AICore() {
  const mesh = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const answer = ramp(lp, 0.7, 0.95)
    const t = state.clock.elapsedTime
    if (mesh.current) {
      mesh.current.rotation.x = t * 0.3
      mesh.current.rotation.y = t * 0.4
      const s = 0.1 + answer * 0.4 + Math.sin(t * 3) * 0.02 * answer
      mesh.current.scale.setScalar(s)
      const mat = mesh.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.3 + answer * 3
    }
    if (halo.current) halo.current.intensity = answer * 4
  })

  return (
    <group position={AICORE_POS}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#0c2e22" emissive="#3dffa6" emissiveIntensity={0.3} metalness={0.4} roughness={0.2} wireframe />
      </mesh>
      <pointLight ref={halo} color="#3dffa6" intensity={0} distance={6} decay={2} />
    </group>
  )
}
```

- [ ] **Step 2: Render inside the station**

In `TrackerStation.tsx`:
```tsx
import { AICore } from './AICore'
```
```tsx
        <AICore />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t7 0.86,0.88,0.90`
Read the PNGs. Expected: a glowing green wireframe core above the figure, brightest near the end of the section.

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/AICore.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat: AICore — answering intelligence brightening on the answer beat"
```

---

## Task 8: HudText — stat readout + the AI answer

**Files:**
- Create: `frontend/src/scene/tracker/HudText.tsx`
- Modify: `frontend/src/scene/tracker/TrackerStation.tsx`

- [ ] **Step 1: Create `HudText.tsx`**

Holographic readouts via drei `<Text>` (blooms in-world). Stat lines reveal during save; the AI answer reveals during the answer beat. Reveal is a visibility toggle + a small rise (no per-frame troika re-sync).

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { DATASTORE_POS, AICORE_POS, localProgress, ramp } from './phases'

export function HudText() {
  const stats = useRef<THREE.Group>(null)
  const answer = useRef<THREE.Group>(null)

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.5, 0.7)
    const ans = ramp(lp, 0.72, 0.92)
    if (stats.current) {
      stats.current.visible = save > 0.05
      stats.current.scale.setScalar(0.85 + save * 0.15)
    }
    if (answer.current) {
      answer.current.visible = ans > 0.05
      answer.current.position.y = AICORE_POS[1] - 0.9 + ans * 0.1
    }
  })

  return (
    <group>
      <group ref={stats} position={[DATASTORE_POS[0], DATASTORE_POS[1] + 0.7, DATASTORE_POS[2]]} visible={false}>
        <Text fontSize={0.12} color="#7cffb0" anchorX="center" anchorY="middle" lineHeight={1.5}>
          {'♥ 158 bpm\nsteps 2.4k\ncal 310\n▮▮▮▮ saved'}
        </Text>
      </group>
      <group ref={answer} position={[AICORE_POS[0], AICORE_POS[1] - 0.9, AICORE_POS[2]]} visible={false}>
        <Text fontSize={0.16} color="#bfffe0" anchorX="center" anchorY="middle" maxWidth={3.2} textAlign="center">
          {'Peak exertion detected — recovery ~4 min.'}
        </Text>
      </group>
    </group>
  )
}
```

- [ ] **Step 2: Render inside the station**

In `TrackerStation.tsx`:
```tsx
import { HudText } from './HudText'
```
```tsx
        <HudText />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Visual verify**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-t8 0.84,0.88,0.90`
Read the PNGs. Expected: green stat lines by the store during save, and the AI answer line under the core near the end.

- [ ] **Step 5: Commit**

```bash
git add src/scene/tracker/HudText.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat: HudText — holographic stat readout + AI answer line"
```

---

## Task 9: Integration pass — beat timing, reduced motion, full sweep

**Files:**
- Modify (tuning only): `frontend/src/scene/tracker/phases.ts`, `frontend/src/scene/CameraRig.tsx`

- [ ] **Step 1: Full-section screenshot sweep**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-final 0.74,0.77,0.80,0.83,0.86,0.89`
Read all PNGs in order. Confirm the four beats read in sequence: (1) cricketer arrives, (2) heartbeat spikes, (3) data streams + saves, (4) AI core + answer. Tune the `ramp(...)` windows in each FX component and/or the tracker camera `at`/`pos`/`look` in `CameraRig.tsx` so the beats are well-spaced and framed. Re-shoot until satisfied.

- [ ] **Step 2: Reduced-motion sanity check**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/tracker-rm 0.80,0.86 --reduced`
Read the PNGs. Expected: the scene still composes correctly (beats resolve by scroll position; nothing depends on autonomous motion). No action needed unless something is missing.

- [ ] **Step 3: Confirm earlier chapters still frame correctly**

The re-timed `KEYS` affect every chapter. Run: `node scripts/shoot.cjs http://localhost:5173 .shots/full 0,0.17,0.3,0.5,0.68,0.8,0.92,1`
Read the PNGs. Expected: hero, about, spells, grimoire, tracker, chronicles, owlpost each frame sensibly. Fix any `KEYS` regressions.

- [ ] **Step 4: Final build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit any tuning**

```bash
git add src/scene/tracker/phases.ts src/scene/CameraRig.tsx
git commit -m "feat: tune Tracker beat timing + camera framing across the chapter"
```

---

## Self-Review Notes (author)

- **Spec coverage:** purpose/4-beat narrative (Tasks 3–8), static-mesh constraint → holographic overlays at tunable anchors (`phases.ts`, every FX), tech aesthetic + reuse of Bloom (Task 3 lights, emissive FX), single-canvas camera travel (Task 2), `src/scene/tracker/` component breakdown (Tasks 3–8 = TrackerStation/Heartbeat/ScanRings/DataStream/AICore/HudText), scroll→beat phase windows (`phases.ts` + each FX), placement after Grimoire + three coupled files (Task 1) + camera (Task 2), verification via build + puppeteer (every task), performance (preload + instancing + material clone, Tasks 3/6), out-of-scope items honored (no backend/anim/new post).
- **Heartbeat = hero:** largest readout, dedicated task, climbs 72→158, synced pulse marker.
- **No new dependencies:** drei `<Text>`/`<Line>`, three primitives, instancing — all already installed.
- **Known tuning surface:** exact scroll fractions and FX windows are calibrated in Tasks 2 and 9 from measured DOM offsets and screenshots — not guessable up front because the new pinned section changes page height.
