# The Marauder's Map — Edge-AI Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained 3D chapter ("The Marauder's Map", Chapter VII) showcasing an on-device edge-AI attendance / movement-detection capability, mirroring the existing `scene/tracker/` and `scene/spell/` modules.

**Architecture:** A new `src/scene/map/` scene module (pure-logic `map.ts` + visual components) renders a parchment "map" at world `[22,0,0]` where footsteps appear, a detection reticle locks, and name-tags resolve. An incantation toggle button in a new pinned HTML section writes an out-of-React `revealState` singleton (same pattern as Conjuring's Cast button) read in `useFrame`. Adding a chapter shifts every scroll fraction, so a final puppeteer measurement pass recalibrates the camera/chapter/section constants together.

**Tech Stack:** Vite + React + TS, react-three-fiber + drei, framer-motion, vitest (`npm test`), `tsc -b && vite build` (`npm run build`).

**Working directory:** all commands run from `frontend/` (the npm project root). All `src/...` paths are relative to `frontend/`.

**Conventions to follow:** out-of-React singletons read in `useFrame` (never lift into React state); clone+dispose materials; `dispose={null}` on station groups; reduced-motion jumps straight to lit; three.js literal colors inside the scene; reuse design-token CSS classes. Only `map.ts` is unit-tested (TDD); visual three.js components are verified by `npx tsc -b` + the final puppeteer render check, matching how `TrackerStation`/`SpellBolt` are handled in this repo.

---

### Task 1: `map.ts` pure logic + `revealState` singleton (TDD)

**Files:**
- Create: `src/scene/map/map.ts`
- Test: `src/scene/map/map.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/scene/map/map.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  localProgress,
  revealProgress,
  detectionAt,
  walkerPosition,
  SECTION_START,
  SECTION_END,
} from './map'

describe('localProgress', () => {
  it('clamps below the section to 0 and above it to 1', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
  it('is ~0.5 at the section midpoint', () => {
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
  })
})

describe('revealProgress', () => {
  it('clamps to [0,1] and rises linearly', () => {
    expect(revealProgress(0, 0, 2)).toBe(0)
    expect(revealProgress(1, 0, 2)).toBe(0.5)
    expect(revealProgress(5, 0, 2)).toBe(1)
  })
  it('guards against zero/negative duration', () => {
    expect(revealProgress(10, 5, 0)).toBe(0)
  })
})

describe('detectionAt', () => {
  it('confidence climbs with progress and locks past the threshold', () => {
    expect(detectionAt(0).locked).toBe(false)
    expect(detectionAt(1).locked).toBe(true)
    expect(detectionAt(1).confidence).toBe(1)
  })
  it('tightens the box as confidence climbs', () => {
    expect(detectionAt(1).boxScale).toBeLessThan(detectionAt(0).boxScale)
  })
})

describe('walkerPosition', () => {
  it('spans left→right across the table at table height', () => {
    const [x0, y0] = walkerPosition(0)
    const [x1] = walkerPosition(1)
    expect(x0).toBeLessThan(0)
    expect(x1).toBeGreaterThan(0)
    expect(y0).toBeCloseTo(-1.17, 2) // TABLE_Y + 0.03
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- map.test`
Expected: FAIL — `Cannot find module './map'`.

- [ ] **Step 3: Write the implementation**

Create `src/scene/map/map.ts`:

```ts
import * as THREE from 'three'

/** World placement of the whole map station — right of the Tracker [12], so the
 * camera keeps travelling outward before returning for the closing chapters. */
export const STATION: [number, number, number] = [22, 0, 0]

/** Map-table surface height in station-local space (cf. Tracker's RING_FLOOR_Y). */
export const TABLE_Y = -1.2

/**
 * Scroll fractions spanning the pinned #map section. PLACEHOLDER values — Task 11
 * recalibrates these from measured DOM offsets and keeps them in sync with the
 * #map CameraRig KEYS.
 */
export const SECTION_START = 0.86
export const SECTION_END = 0.95

/** Global scroll progress (0→1) → 0→1 local progress within the map section. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Clamped 0→1 linear ramp of `now` across [start, start+duration]. */
export function revealProgress(now: number, start: number, duration: number): number {
  if (duration <= 0) return 0
  return THREE.MathUtils.clamp((now - start) / duration, 0, 1)
}

/** Duration of one reveal sweep, in seconds. */
export const REVEAL_DURATION = 2.6

/**
 * Out-of-React reveal state — written by the HTML incantation button, read in
 * useFrame. Same pattern as scrollState/spellState; never lift into useState.
 *   requested → a new "swear" was asked for (consumed by MapStation → startedAt)
 *   active    → the map is currently revealed (false after "Mischief managed")
 *   startedAt → clock time the reveal ramp began (-1 when idle)
 *   progress  → 0→1 reveal ramp, driven each frame
 *   sworn     → true after the first swear
 */
export const revealState = {
  requested: false,
  active: false,
  startedAt: -1,
  progress: 0,
  sworn: false,
}

/** Local-space patrol route position at parameter t (0→1) — a gentle S across the
 * map table (X spread, Z weave) at table height. */
export function walkerPosition(t: number): [number, number, number] {
  const x = THREE.MathUtils.lerp(-2.6, 2.6, t)
  const z = Math.sin(t * Math.PI * 1.5) * 1.1
  return [x, TABLE_Y + 0.03, z]
}

export interface Detection {
  confidence: number // 0→1
  boxScale: number   // loose (1.6) → tight (1.0)
  locked: boolean
}

/** Confidence threshold past which the reticle locks and names resolve. */
export const LOCK_AT = 0.6

/** Detection readout at drive progress `p` (0→1). */
export function detectionAt(p: number): Detection {
  const c = THREE.MathUtils.clamp(p, 0, 1)
  return {
    confidence: c,
    boxScale: THREE.MathUtils.lerp(1.6, 1.0, c),
    locked: c >= LOCK_AT,
  }
}

/** A person the map can reveal — themed, generic (no real/owned data). `at` is the
 * 0→1 patrol-path parameter where this passer-by's name resolves. */
export interface Passerby {
  name: string
  at: number
}

export const PASSERSBY: Passerby[] = [
  { name: 'The Apprentice', at: 0.12 },
  { name: 'The Scribe', at: 0.34 },
  { name: 'The Warden', at: 0.55 },
  { name: 'The Archivist', at: 0.74 },
  { name: 'The Prefect', at: 0.9 },
]

/** Themed pipeline beats shown in the HTML legend. */
export const PIPELINE_BEATS = ['Motion', 'Detect', 'Track', 'Identify', 'Log']

/** Edge-stack chips paired with the beats (the fresh "on-device" angle). */
export const EDGE_STACK = [
  'RV1688 NPU',
  'On-device detection',
  'Re-ID embeddings',
  'Vector match',
  'No cloud',
]
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- map.test`
Expected: PASS (all 7 assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/scene/map/map.ts src/scene/map/map.test.ts
git commit -m "feat: map module logic + revealState singleton (tested)"
```

---

### Task 2: De-name the Grimoire card

**Files:**
- Modify: `src/data.ts:10-17` (first `projects[]` entry)

- [ ] **Step 1: Replace the named card with a generic capability card**

In `src/data.ts`, replace the first object in the `projects` array (currently `name: 'Project Horus'`) with:

```ts
  {
    name: 'Real-Time Vision · Attendance',
    incantation: 'Oculus Reparo',
    blurb:
      'An edge computer-vision pipeline: motion-triggered capture, on-device person detection and re-identification on a palm-sized NPU — real-time, fully local, no footage leaving the device.',
    tags: ['Edge NPU', 'Detection', 'Re-ID', 'FAISS', 'Real-time CV'],
    glyph: '👁',
  },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data.ts
git commit -m "refactor: de-name the vision card to a generic capability"
```

---

### Task 3: `MapTable.tsx` — parchment plane + corridor line-art

**Files:**
- Create: `src/scene/map/MapTable.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/MapTable.tsx`:

```tsx
import * as THREE from 'three'
import { TABLE_Y } from './map'

/** Faint gold corridor bars laid on the parchment (local plane XY after rotation). */
const CORRIDORS: { x: number; y: number; w: number; h: number }[] = [
  { x: 0, y: 1.4, w: 6.2, h: 0.03 },
  { x: 0, y: -1.4, w: 6.2, h: 0.03 },
  { x: -2.6, y: 0, w: 0.03, h: 2.8 },
  { x: 2.6, y: 0, w: 0.03, h: 2.8 },
  { x: -1.0, y: 0.4, w: 2.6, h: 0.025 },
  { x: 1.2, y: -0.5, w: 2.2, h: 0.025 },
  { x: 0.2, y: 0, w: 0.025, h: 1.8 },
]

/** Horizontal aged-parchment map with emissive gold corridor line-art (no texture
 * fetch — honors the no-network convention). Rotated flat like the floor rings. */
export function MapTable() {
  return (
    <group position={[0, TABLE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* parchment slab */}
      <mesh receiveShadow>
        <planeGeometry args={[7, 4.6]} />
        <meshStandardMaterial
          color="#241d10"
          emissive="#6b5526"
          emissiveIntensity={0.22}
          roughness={0.95}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* corridor bars, lifted slightly toward the viewer */}
      {CORRIDORS.map((c, i) => (
        <mesh key={i} position={[c.x, c.y, 0.012]}>
          <planeGeometry args={[c.w, c.h]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (Component is not yet mounted; this only proves it compiles.)

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/MapTable.tsx
git commit -m "feat: parchment map table with corridor line-art"
```

---

### Task 4: `Walker.tsx` — footprint trail + detection reticle

**Files:**
- Create: `src/scene/map/Walker.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/Walker.tsx`:

```tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, revealState, walkerPosition, detectionAt } from './map'

const FOOT_COUNT = 10

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
  const feet = useRef<THREE.Mesh[]>([])
  const footIdx = useMemo(() => Array.from({ length: FOOT_COUNT }, (_, i) => i), [])

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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/Walker.tsx
git commit -m "feat: walker footprint trail + detection reticle"
```

---

### Task 5: `NameTag.tsx` — resolving billboarded labels

**Files:**
- Create: `src/scene/map/NameTag.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/NameTag.tsx`:

```tsx
import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { scrollState } from '../../scroll'
import { localProgress, revealState, detectionAt, walkerPosition, PASSERSBY } from './map'

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** One label per passer-by; resolves from "· · ·" to the name once the reveal sweep
 * passes its position and detection has locked. State flips at most a few times, so
 * a guarded setState here is cheap (not per-frame churn). */
function Tag({ name, at }: { name: string; at: number }) {
  const [resolved, setResolved] = useState(false)
  const pos = walkerPosition(at)

  useFrame(() => {
    const drive = driveNow()
    const next = drive >= at && detectionAt(drive).locked
    if (next !== resolved) setResolved(next)
  })

  return (
    <Billboard position={[pos[0], pos[1] + 0.6, pos[2]]}>
      <Text
        fontSize={0.16}
        color={resolved ? '#ffe2b0' : '#7fd0c4'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.004}
        outlineColor="#07070d"
      >
        {resolved ? name : '· · ·'}
      </Text>
    </Billboard>
  )
}

export function NameTag() {
  return (
    <>
      {PASSERSBY.map((p) => (
        <Tag key={p.name} name={p.name} at={p.at} />
      ))}
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/NameTag.tsx
git commit -m "feat: resolving name-tags over detected passers-by"
```

---

### Task 6: `EdgeBox.tsx` — the AIBox device + closed local loop

**Files:**
- Create: `src/scene/map/EdgeBox.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/EdgeBox.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, revealState } from './map'

const BOX_POS: [number, number, number] = [3.0, -0.6, -1.2]
const MAP_CENTER = new THREE.Vector3(0, -1.1, 0)
const BOX_VEC = new THREE.Vector3(...BOX_POS)

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** The AIBox-1688 edge device: a pulsing NPU core with a closed local inference
 * loop (box ↔ map center) — the visual opposite of a stream-to-cloud sink. */
export function EdgeBox() {
  const core = useRef<THREE.Mesh>(null)
  const pulse = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const drive = driveNow()

    if (core.current) {
      const mat = core.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 1.0 + Math.sin(t * 4) * 0.5 * (0.3 + drive)
    }
    if (pulse.current) {
      const k = (Math.sin(t * 2) + 1) / 2
      pulse.current.position.lerpVectors(BOX_VEC, MAP_CENTER, k)
      pulse.current.visible = drive > 0.05
    }
  })

  return (
    <group>
      <group position={BOX_POS}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.34, 0.5]} />
          <meshStandardMaterial color="#10131a" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh ref={core} position={[0, 0.22, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.18]} />
          <meshStandardMaterial color="#35e0ff" emissive="#35e0ff" emissiveIntensity={1.2} />
        </mesh>
        <pointLight position={[0, 0.4, 0]} intensity={2} color="#35e0ff" distance={3} decay={2} />
        <Billboard position={[0, 0.72, 0]}>
          <Text fontSize={0.1} color="#bfefff" anchorX="center" outlineWidth={0.003} outlineColor="#07070d">
            LOCAL · NO CLOUD
          </Text>
        </Billboard>
      </group>

      <mesh ref={pulse}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#35e0ff" />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/EdgeBox.tsx
git commit -m "feat: edge AIBox device with closed local inference loop"
```

---

### Task 7: `DetectionHud.tsx` — holographic readout

**Files:**
- Create: `src/scene/map/DetectionHud.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/DetectionHud.tsx`:

```tsx
import { useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { scrollState } from '../../scroll'
import { localProgress, revealState, detectionAt, PASSERSBY } from './map'

function driveNow(): number {
  return revealState.active
    ? revealState.progress
    : localProgress(scrollState.progress) * 0.6
}

/** Holographic status line above the map: confidence, FPS, edge label, present count.
 * Guarded setState only fires when the rendered string actually changes. */
export function DetectionHud() {
  const [line, setLine] = useState('AWAITING OATH')

  useFrame(() => {
    const drive = driveNow()
    const det = detectionAt(drive)
    const count = PASSERSBY.filter((p) => drive >= p.at && det.locked).length
    const next = det.locked
      ? `CONF ${Math.round(det.confidence * 100)}% · 30 FPS · EDGE NPU · ${count} PRESENT`
      : drive > 0.02
        ? `SCANNING ${Math.round(det.confidence * 100)}%…`
        : 'AWAITING OATH'
    setLine((prev) => (prev === next ? prev : next))
  })

  return (
    <Billboard position={[0, 1.6, 0]}>
      <Text
        fontSize={0.16}
        color="#bfefff"
        anchorX="center"
        outlineWidth={0.004}
        outlineColor="#07070d"
        letterSpacing={0.05}
      >
        {line}
      </Text>
    </Billboard>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/DetectionHud.tsx
git commit -m "feat: detection HUD readout"
```

---

### Task 8: `MapStation.tsx` — assemble the station + consume the oath

**Files:**
- Create: `src/scene/map/MapStation.tsx`

- [ ] **Step 1: Write the component**

Create `src/scene/map/MapStation.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, localProgress, revealState, revealProgress, REVEAL_DURATION } from './map'
import { MapTable } from './MapTable'
import { Walker } from './Walker'
import { NameTag } from './NameTag'
import { EdgeBox } from './EdgeBox'
import { DetectionHud } from './DetectionHud'

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function MapStation() {
  const group = useRef<THREE.Group>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999

    const now = state.clock.elapsedTime

    // Consume an oath request (mirror SpellStation): stamp start, or jump if reduced motion.
    if (revealState.requested) {
      revealState.requested = false
      revealState.active = true
      revealState.sworn = true
      if (reduceMotion) {
        revealState.startedAt = -1
        revealState.progress = 1
      } else {
        revealState.startedAt = now
      }
    }

    // Drive the active reveal ramp.
    if (revealState.startedAt >= 0) {
      revealState.progress = revealProgress(now, revealState.startedAt, REVEAL_DURATION)
      if (revealState.progress >= 1) revealState.startedAt = -1
    }

    // "Mischief managed" → ease the reveal back down.
    if (!revealState.active && revealState.startedAt < 0) {
      revealState.progress = THREE.MathUtils.lerp(revealState.progress, 0, 0.1)
    }
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* light rig: warm parchment key + cool detection rim */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#ffe2b0" distance={16} decay={2} />
      <pointLight position={[-3, 1.5, 2]} intensity={3} color="#35e0ff" distance={12} decay={2} />
      <spotLight
        position={[0, 5, 4]}
        angle={0.7}
        penumbra={1}
        intensity={9}
        color="#dff6ff"
        target-position={[STATION[0], 0.2, 0]}
      />

      <MapTable />
      <Walker />
      <NameTag />
      <EdgeBox />
      <DetectionHud />

      <Sparkles count={40} scale={[7, 3, 4]} size={3} speed={0.18} color="#e7c27d" opacity={0.5} />
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/map/MapStation.tsx
git commit -m "feat: assemble MapStation + consume the incantation oath"
```

---

### Task 9: `Marauders()` HTML section + CSS

**Files:**
- Modify: `src/components/Sections.tsx` (add import + new exported component)
- Modify: `src/components/sections.css` (append map section styles)

- [ ] **Step 1: Add the import**

In `src/components/Sections.tsx`, below the existing `import { spellState, NODES } from '../scene/spell/spell'` line, add:

```tsx
import { revealState, PIPELINE_BEATS, EDGE_STACK } from '../scene/map/map'
```

- [ ] **Step 2: Add the `Marauders` component**

In `src/components/Sections.tsx`, add this exported function (place it right after the `Tracker` component):

```tsx
export function Marauders() {
  const [sworn, setSworn] = useState(false)

  const onSwear = () => {
    if (sworn) {
      revealState.active = false // "Mischief managed" — MapStation eases it back down
      setSworn(false)
    } else {
      revealState.requested = true // canvas reads the singleton
      setSworn(true)
    }
  }

  return (
    <section id="map" className="section section--map map--pinned">
      <div className="map__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter VII — The Marauder's Map</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">✦ Project · live demo · on-device</span>
        <IgniteHeading className="section__title" text="It sees who passes" />
        <Reveal delay={0.1}>
          <p className="map__lede">
            A camera at the threshold. Motion stirs and a palm-sized edge device — an NPU
            with no cloud behind it — wakes, captures the figure, follows the footsteps,
            and names who just passed. Detection, tracking, and re-identification all run
            on the device itself; no footage ever leaves the room.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <button type="button" className="cast-btn" onClick={onSwear}>
            <span className="cast-btn__rune">✦</span>
            {sworn ? 'Mischief managed' : 'I solemnly swear that I am up to no good'}
          </button>
        </Reveal>
        <Reveal delay={0.24}>
          <ol className="conjuring__legend">
            {PIPELINE_BEATS.map((beat, i) => (
              <li key={beat} className="conjuring__legend-item">
                <span className="conjuring__legend-name">{beat}</span>
                <span className="conjuring__legend-tags">{EDGE_STACK[i] ?? ''}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
```

(`useState`, `MaskReveal`, `Reveal`, `IgniteHeading` are already imported at the top of the file.)

- [ ] **Step 3: Append the CSS**

At the end of `src/components/sections.css`, append:

```css
/* ── Chapter VII — The Marauder's Map (pinned runway) ── */
.section--map.map--pinned {
  height: 300vh;
  padding: 0;
}
.map__stage {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  max-width: 42rem;
  padding: clamp(2rem, 6vw, 6rem);
  box-sizing: border-box;
}
/* legibility scrim so copy reads over the 3D map behind it */
.map__stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(7, 7, 13, 0.82) 0%,
    rgba(7, 7, 13, 0.55) 45%,
    rgba(7, 7, 13, 0) 82%
  );
  pointer-events: none;
  z-index: -1;
}
.map__stage > * { position: relative; }
.map__lede {
  max-width: 34ch;
  color: var(--parchment-dim);
  font-family: var(--font-body);
  font-size: clamp(1.1rem, 2.2vw, 1.5rem);
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .section--map.map--pinned { height: auto; }
  .map__stage { position: static; min-height: 0; }
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sections.tsx src/components/sections.css
git commit -m "feat: Marauder's Map HTML section + incantation toggle"
```

---

### Task 10: Wire the station + section into the app (uncalibrated)

**Files:**
- Modify: `src/scene/Scene.tsx` (import + mount `MapStation`)
- Modify: `src/App.tsx` (import + render `Marauders`)

- [ ] **Step 1: Mount the station in the scene**

In `src/scene/Scene.tsx`, add the import beside the other station imports:

```tsx
import { MapStation } from './map/MapStation'
```

Then, immediately after `<SpellStation />` (inside the `<Suspense>` block, next to `<TrackerStation />`), add:

```tsx
        <MapStation />
```

- [ ] **Step 2: Render the section**

In `src/App.tsx`, update the Sections import to include `Marauders`:

```tsx
import { About, Spells, Grimoire, Conjuring, Tracker, Marauders, Chronicles, OwlPost } from './components/Sections'
```

Then render `<Marauders />` between `<Tracker />` and `<Chronicles />` in the `<main>`:

```tsx
        <Tracker />
        <Marauders />
        <Chronicles />
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc -b` passes and `vite build` completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/Scene.tsx src/App.tsx
git commit -m "feat: mount MapStation + render the Marauder's Map section"
```

> After this task the chapter exists but the camera does not yet travel to it and downstream scroll fractions are stale. Task 11 calibrates everything.

---

### Task 11: Calibrate camera, chapters, and section fractions (puppeteer measurement pass)

Adding a 300vh section grows the page, so **every** scroll fraction shifts. This task measures the real offsets once and updates all coupled constants together.

**Files:**
- Modify: `src/scene/CameraRig.tsx` (`KEYS`)
- Modify: `src/chapters.ts` (add `map`, renumber, recalibrate `at`)
- Modify: `src/components/Sections.tsx` (eyebrow numerals for Chronicles → VIII, Owl Post → IX)
- Modify: `src/scene/map/map.ts` (`SECTION_START` / `SECTION_END`)
- Verify/adjust: `src/scene/tracker/phases.ts`, `src/scene/spell/spell.ts` (`SECTION_START` / `SECTION_END`)
- Create (temporary, untracked): `tools/measure-sections.mjs`

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev`
Note the URL (default `http://localhost:5173`).

- [ ] **Step 2: Write the measurement script**

Create `tools/measure-sections.mjs`:

```js
import puppeteer from 'puppeteer-core'

const URL = process.env.URL || 'http://localhost:5173'
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const data = await page.evaluate(() => {
  const denom = document.documentElement.scrollHeight - window.innerHeight
  const ids = ['top', 'wizard', 'spells', 'conjuring', 'grimoire', 'tracker', 'map', 'chronicles', 'owlpost']
  return ids.map((id) => {
    const el = document.getElementById(id)
    if (!el) return { id, missing: true }
    const top = el.offsetTop
    const h = el.offsetHeight
    return {
      id,
      start: +(top / denom).toFixed(3),
      end: +((top + h) / denom).toFixed(3),
    }
  })
})
console.log(JSON.stringify(data, null, 2))
await browser.close()
```

- [ ] **Step 3: Run the measurement**

Run: `node tools/measure-sections.mjs`
Expected: a JSON array of `{ id, start, end }` fractions for all nine sections (none `missing`). Record these values — they drive every edit below. (`top` may lack an explicit `id`; if `top` shows `missing`, treat its `start` as `0.0`.)

- [ ] **Step 4: Update `chapters.ts`**

Set each chapter's `at` to that section's measured `start`, insert the `map` chapter after `tracker`, and renumber. Replace the `chapters` array in `src/chapters.ts` with (substitute the measured `start` value for every `at`):

```ts
export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',    theme: 'The Conjuring',         plain: 'intro',                  at: 0.0 },
  { id: 'wizard',     numeral: 'II',   theme: 'The Mind',              plain: 'about me',               at: /* measured wizard.start */ 0 },
  { id: 'spells',     numeral: 'III',  theme: 'Spells',                plain: 'skills',                 at: /* measured spells.start */ 0 },
  { id: 'conjuring',  numeral: 'IV',   theme: 'The Conjuring of Apps', plain: 'service · full-stack AI', at: /* measured conjuring.start */ 0 },
  { id: 'grimoire',   numeral: 'V',    theme: 'The Grimoire',          plain: 'projects',               at: /* measured grimoire.start */ 0 },
  { id: 'tracker',    numeral: 'VI',   theme: 'The Pulse',             plain: 'live AI demo',           at: /* measured tracker.start */ 0 },
  { id: 'map',        numeral: 'VII',  theme: "The Marauder's Map",    plain: 'edge AI · on-device',    at: /* measured map.start */ 0 },
  { id: 'chronicles', numeral: 'VIII', theme: 'The Path',              plain: 'experience',             at: /* measured chronicles.start */ 0 },
  { id: 'owlpost',    numeral: 'IX',   theme: 'Owl Post',              plain: 'contact',                at: /* measured owlpost.start */ 0 },
]
```

(Replace each `/* measured … */ 0` with the actual number; remove the comments.)

- [ ] **Step 5: Update `CameraRig.tsx` `KEYS`**

Update every existing keyframe's `at` to the new measured `start` for its section, and insert two `map` keyframes (entry + held) before the chronicles keyframe. The map station is at world x=22, so mirror the Tracker's framing offsets. Replace the post-tracker tail of the `KEYS` array so it reads:

```ts
  { at: /* tracker.start */ 0,        pos: [12, 1.0, 6.2],   look: [12, 0.5, 0] },   // tracker — entry
  { at: /* tracker.start+0.12 */ 0,   pos: [12.6, 1.5, 7.8], look: [12, 0.9, 0] },   // tracker — held
  { at: /* map.start */ 0,            pos: [22, 1.0, 6.4],   look: [22, 0.5, 0] },    // map — entry
  { at: /* map.start+0.12 */ 0,       pos: [22.6, 1.6, 7.8], look: [22, 0.9, 0] },   // map — held
  { at: /* chronicles.start */ 0,     pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },    // chronicles
  { at: 1.0,                          pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },    // owlpost
```

Also update the earlier keyframes (`wizard`, `spells`, `conjuring`, `grimoire`) `at` values to their new measured `start`s. Keep the two hero keyframes (`at: 0.0` and `at: 0.10`) unchanged. (Substitute measured numbers; remove comments. For the "held" keyframes, use the section `start` plus a small offset that stays below the next section's `start` — `+0.12` is the starting guess; reduce it if it overruns.)

- [ ] **Step 6: Update `map.ts` section window**

In `src/scene/map/map.ts`, set:

```ts
export const SECTION_START = /* measured map.start */ 0
export const SECTION_END = /* measured map.end */ 0
```

(Substitute the measured `map.start` and `map.end`.)

- [ ] **Step 7: Re-verify tracker + spell windows**

The `tracker` and `conjuring` sections moved. In `src/scene/tracker/phases.ts` set `SECTION_START` = measured `tracker.start` and `SECTION_END` = measured `tracker.end` (matching the prior ~0.17 span if the held keyframe needs it). In `src/scene/spell/spell.ts` set `SECTION_START` = measured `conjuring.start − 0.03` (the existing pad-before-top trick) and `SECTION_END` = measured `conjuring.end`. Keep the existing pad rationale noted in each file's comment.

- [ ] **Step 8: Rebuild and re-measure to confirm stability**

Run: `npm run build`
Expected: passes.
Run: `node tools/measure-sections.mjs` again.
Expected: fractions match what you wrote (within ±0.005). If a held keyframe's `at` is ≥ the next section's `start`, reduce the `+0.12` offset until ordered.

- [ ] **Step 9: Remove the temporary script and commit**

```bash
rm tools/measure-sections.mjs
git add src/scene/CameraRig.tsx src/chapters.ts src/components/Sections.tsx src/scene/map/map.ts src/scene/tracker/phases.ts src/scene/spell/spell.ts
git commit -m "feat: calibrate camera/chapters/section fractions for the new chapter"
```

---

### Task 12: Final verification

**Files:** none (verification only); may re-create `tools/measure-sections.mjs` transiently for the render check.

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: all suites pass (including `map.test.ts`).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `tsc -b` + `vite build` succeed with no errors.

- [ ] **Step 3: Render check at the map chapter**

With `npm run dev` running, drive puppeteer (system Chrome, `--use-gl=angle --use-angle=swiftshader`) to scroll to the `map.start` fraction and screenshot the canvas. Confirm the parchment table + reticle + HUD render (the `glBlitFramebuffer` SwiftShader warning is harmless). Per the headless gotcha, **audit the section's `textContent`** (`#map` heading "It sees who passes", the incantation button label, and the legend beats) rather than relying on HTML pixels, since reveal-animated HTML can screenshot black under SwiftShader.

- [ ] **Step 4: Interaction smoke check**

In puppeteer, click the `.cast-btn` inside `#map`, wait ~3s, and assert the button's `textContent` flips to "Mischief managed". Click again and assert it returns to "I solemnly swear that I am up to no good".

- [ ] **Step 5: Final commit (if any cleanup)**

```bash
git status   # ensure tools/measure-sections.mjs is not committed
git commit -am "chore: verification cleanup" --allow-empty
```

---

## Self-review notes

- **Spec coverage:** scene module (`map.ts` + `MapTable`/`Walker`/`NameTag`/`EdgeBox`/`DetectionHud`/`MapStation`) → Tasks 1,3–8; HTML section + incantation toggle → Task 9; CSS → Task 9; five coupling points → Tasks 10–11; de-named Grimoire card → Task 2; reduced-motion → Tasks 1/8 (jump-to-lit) + Task 9 CSS; verification (tests/build/puppeteer/textContent audit) → Tasks 11–12. All spec sections map to a task.
- **Type consistency:** `revealState` shape, `detectionAt`/`walkerPosition`/`localProgress`/`revealProgress` signatures, `PASSERSBY`/`PIPELINE_BEATS`/`EDGE_STACK`, `STATION`, `TABLE_Y`, `REVEAL_DURATION` are defined once in Task 1 and consumed unchanged in Tasks 3–9.
- **Calibration values** are intentionally runtime-measured (Task 11) with a concrete script and an explicit "which measured field → which constant" mapping — not placeholders.
</content>
