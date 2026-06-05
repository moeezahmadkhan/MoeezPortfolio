# Cast Spell — Full-Stack AI Pipeline Chapter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-to-cast 3D "spell" chapter (after Grimoire) that ignites a six-node A→Z full-stack AI build pipeline, framed for client acquisition.

**Architecture:** A new self-contained `scene/spell/` station — mirroring `scene/tracker/` — placed at world offset `[-13,0,0]`, gated by its chapter's scroll window. A pure-logic `spell.ts` holds the cast-timeline math (unit-tested with vitest) plus an out-of-React `spellState` singleton (same pattern as `scrollState`). An HTML `Conjuring` section holds the "Cast Spell" button that flips `spellState.requested`; `useFrame` reads the singleton, ramps `progress` 0→1, and node/bolt/stream glow is derived from that progress. Camera flies left to the chamber; later chapters renumber and scroll fractions are re-measured.

**Tech Stack:** Vite + React + TypeScript, react-three-fiber, drei, postprocessing (Bloom), framer-motion, three.js, vitest.

**Spec:** `docs/2026-06-06-cast-spell-fullstack-pipeline-design.md`

---

## File Structure

- Create `frontend/src/scene/spell/spell.ts` — types, node defs, `STATION`, `SECTION_START/END`, `localProgress`, `castProgress`/`nodeGlow`/`streamGlow` (pure), `spellState` singleton.
- Create `frontend/src/scene/spell/spell.test.ts` — unit tests for the pure functions.
- Create `frontend/src/scene/spell/PipelineNodes.tsx` — six rune-orbs + billboard labels.
- Create `frontend/src/scene/spell/SpellBolt.tsx` — traveling bolt + inter-node energy streams.
- Create `frontend/src/scene/spell/SpellStation.tsx` — chamber group, lights, runs cast timeline in `useFrame`.
- Modify `frontend/src/data.ts` — add typed `pipeline` array.
- Modify `frontend/src/components/Sections.tsx` — add `Conjuring` section component.
- Modify `frontend/src/components/sections.css` — styles for `Conjuring` + cast button.
- Modify `frontend/src/scene/Scene.tsx` — mount `<SpellStation/>`.
- Modify `frontend/src/App.tsx` — render `<Conjuring/>` between `<Grimoire/>` and `<Tracker/>`.
- Modify `frontend/src/chapters.ts` — insert chapter, renumber romans.
- Modify `frontend/src/scene/CameraRig.tsx` — insert chamber keyframe(s), recalibrate.
- Modify `frontend/src/scene/tracker/phases.ts` — re-measured `SECTION_START/END`.

All commands run from `frontend/` unless noted.

---

## Task 1: Pure cast-timeline math (`spell.ts`) — TDD

**Files:**
- Create: `frontend/src/scene/spell/spell.ts`
- Test: `frontend/src/scene/spell/spell.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// frontend/src/scene/spell/spell.test.ts
import { describe, it, expect } from 'vitest'
import { castProgress, nodeGlow, streamGlow } from './spell'

describe('castProgress', () => {
  it('ramps 0→1 across [start, start+duration] and clamps outside', () => {
    expect(castProgress(0, 0, 3)).toBe(0)
    expect(castProgress(1.5, 0, 3)).toBeCloseTo(0.5, 5)
    expect(castProgress(3, 0, 3)).toBe(1)
    expect(castProgress(5, 0, 3)).toBe(1)        // past the end → clamped
    expect(castProgress(-2, 0, 3)).toBe(0)       // before start → clamped
  })
  it('returns 0 for a non-positive duration', () => {
    expect(castProgress(5, 0, 0)).toBe(0)
  })
})

describe('nodeGlow', () => {
  const N = 6
  it('is 0 before the bolt reaches the node and 1 once fully passed', () => {
    expect(nodeGlow(0, 0, N)).toBeGreaterThan(0) // first node sits at path 0 → lights immediately
    expect(nodeGlow(0, 5, N)).toBe(0)            // last node dark at the start
    expect(nodeGlow(1, 5, N)).toBe(1)            // last node fully lit at the end
  })
  it('lights nodes in sequence — earlier nodes lead later ones', () => {
    const p = 0.5
    expect(nodeGlow(p, 1, N)).toBeGreaterThan(nodeGlow(p, 4, N))
  })
  it('is monotonic non-decreasing in progress for a given node', () => {
    expect(nodeGlow(0.6, 3, N)).toBeGreaterThanOrEqual(nodeGlow(0.4, 3, N))
  })
})

describe('streamGlow', () => {
  const N = 6 // 5 segments, indices 0..4
  it('segment 0 leads segment 3 mid-cast', () => {
    expect(streamGlow(0.4, 0, N)).toBeGreaterThan(streamGlow(0.4, 3, N))
  })
  it('all segments fully lit at progress 1, none at 0', () => {
    expect(streamGlow(1, 4, N)).toBe(1)
    expect(streamGlow(0, 0, N)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- spell`
Expected: FAIL — `Cannot find module './spell'` (file not created yet).

- [ ] **Step 3: Write the minimal implementation**

```ts
// frontend/src/scene/spell/spell.ts
import * as THREE from 'three'

/** Clamped 0→1 linear ramp of `now` across [start, start+duration]. */
export function castProgress(now: number, start: number, duration: number): number {
  if (duration <= 0) return 0
  return THREE.MathUtils.clamp((now - start) / duration, 0, 1)
}

/** Rise window (in progress units) over which a node fades from dark to fully lit. */
const RISE = 0.14

/**
 * Glow (0→1) of node `index` of `count` at cast `progress`. Nodes sit evenly along
 * the path at i/(count-1); each ignites with a smoothstep as the bolt passes and
 * then stays lit (monotonic in progress). count<=1 → single node lights at 0.
 */
export function nodeGlow(progress: number, index: number, count: number): number {
  const nodeAt = count <= 1 ? 0 : index / (count - 1)
  return THREE.MathUtils.smoothstep(progress, nodeAt, Math.min(1, nodeAt + RISE))
}

/**
 * Glow (0→1) of the stream segment `segIndex` (0..count-2) connecting node segIndex
 * to segIndex+1, at cast `progress`. Fills as the bolt travels that span.
 */
export function streamGlow(progress: number, segIndex: number, count: number): number {
  if (count <= 1) return 0
  const start = segIndex / (count - 1)
  const end = (segIndex + 1) / (count - 1)
  return THREE.MathUtils.smoothstep(progress, start, end)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- spell`
Expected: PASS (all cases in the three describe blocks).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/scene/spell/spell.ts frontend/src/scene/spell/spell.test.ts
git commit -m "feat: pure cast-timeline math for spell chapter"
```

---

## Task 2: Chamber constants, node defs, section window, and `spellState` singleton

**Files:**
- Modify: `frontend/src/scene/spell/spell.ts`
- Test: `frontend/src/scene/spell/spell.test.ts`

- [ ] **Step 1: Add tests for `localProgress` and the node geometry helper**

Append to `frontend/src/scene/spell/spell.test.ts`:

```ts
import { localProgress, SECTION_START, SECTION_END, NODES, nodePosition } from './spell'

describe('localProgress', () => {
  it('clamps to 0 below the section and 1 above it', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
  it('is 0.5 at the section midpoint', () => {
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
  })
})

describe('NODES / nodePosition', () => {
  it('defines six pipeline nodes ending in the live app', () => {
    expect(NODES).toHaveLength(6)
    expect(NODES[5].name).toMatch(/Live App/i)
  })
  it('spreads nodes left→right along the arc (x increases with index)', () => {
    expect(nodePosition(0)[0]).toBeLessThan(nodePosition(5)[0])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- spell`
Expected: FAIL — `localProgress`/`NODES`/`nodePosition`/`SECTION_*` not exported.

- [ ] **Step 3: Implement the constants, node defs, geometry, and singleton**

Append to `frontend/src/scene/spell/spell.ts`:

```ts
/** World placement of the spell chamber — left of the wizard (Tracker is on the right). */
export const STATION: [number, number, number] = [-13, 0, 0]

/**
 * Scroll fractions spanning the pinned #conjuring section. PLACEHOLDER values —
 * Task 9 re-measures real DOM offsets and overwrites these two numbers.
 */
export const SECTION_START = 0.62
export const SECTION_END = 0.72

/** Global scroll progress → 0→1 local progress within the conjuring section. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

export interface PipelineNode {
  name: string       // themed title shown big
  sub: string        // plain-language one-liner
  tags: string[]     // stack chips
  color: string      // orb hue (three.js literal)
}

/** The six A→Z build stages (client-grab framing). Single source of truth. */
export const NODES: PipelineNode[] = [
  { name: 'The Brief',     sub: 'Your idea, scoped',        tags: ['Discovery', 'Scope'],     color: '#e7c27d' },
  { name: 'The Mind',      sub: 'Retrieval + reasoning',    tags: ['RAG', 'LangChain', 'LLMs'], color: '#7fd0c4' },
  { name: 'The Conduit',   sub: 'Backend API',              tags: ['FastAPI', 'REST'],        color: '#7fb6d8' },
  { name: 'The Vessel',    sub: 'Containerized',            tags: ['Docker'],                 color: '#9b8cff' },
  { name: 'The Summoning', sub: 'Deployed to the cloud',    tags: ['AWS', 'GCP', 'CI/CD'],    color: '#ffa64d' },
  { name: 'Live App',      sub: 'Delivered, end to end',    tags: ['Full-stack AI'],          color: '#ffe2b0' },
]

/** Local-space position of node `i` along a gentle left→right, slightly rising arc. */
export function nodePosition(i: number): [number, number, number] {
  const n = NODES.length - 1
  const t = n === 0 ? 0 : i / n // 0→1
  const x = THREE.MathUtils.lerp(-3.2, 3.2, t)
  const y = 0.2 + Math.sin(t * Math.PI) * 0.9 // arch upward in the middle
  const z = -Math.cos(t * Math.PI) * 0.6      // gentle bow toward camera at the ends
  return [x, y, z]
}

/**
 * Out-of-React cast state — written by the HTML Cast button, read in useFrame.
 * Same pattern as scrollState: never lift into useState/context.
 *   requested → a new cast was asked for (consumed by SpellStation to set startedAt)
 *   startedAt → clock time the active cast began (-1 when idle)
 *   progress  → 0→1 driven each frame from castProgress()
 *   hasCast   → true after the first cast (button label flips to "Recast")
 */
export const spellState = {
  requested: false,
  startedAt: -1,
  progress: 0,
  hasCast: false,
}

/** Duration of one cast, in seconds. */
export const CAST_DURATION = 3.0
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- spell`
Expected: PASS (all five describe blocks).

- [ ] **Step 5: Typecheck**

Run: `npm run build`
Expected: build succeeds (no type errors).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/scene/spell/spell.ts frontend/src/scene/spell/spell.test.ts
git commit -m "feat: spell chamber constants, node defs, and spellState singleton"
```

---

## Task 3: Pipeline rune-orbs + labels (`PipelineNodes.tsx`)

**Files:**
- Create: `frontend/src/scene/spell/PipelineNodes.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// frontend/src/scene/spell/PipelineNodes.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { NODES, nodePosition, nodeGlow, spellState } from './spell'

/** One glowing rune-orb whose emissive/scale follow its place in the cast sequence. */
function Orb({ index }: { index: number }) {
  const node = NODES[index]
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const label = useRef<THREE.Group>(null)
  const pos = nodePosition(index)
  const isFinal = index === NODES.length - 1

  useFrame((state) => {
    const g = nodeGlow(spellState.progress, index, NODES.length)
    const t = state.clock.elapsedTime
    if (mat.current) {
      // idle dim baseline 0.12 → fully lit; final orb blooms brightest
      mat.current.emissiveIntensity = (0.12 + g * (isFinal ? 3.4 : 2.2)) * (0.9 + 0.1 * Math.sin(t * 2 + index))
    }
    if (mesh.current) {
      const s = 0.18 + g * (isFinal ? 0.16 : 0.08)
      mesh.current.scale.setScalar(s + Math.sin(t * 1.6 + index) * 0.004)
    }
    if (label.current) {
      const m = label.current.children[0] as THREE.Mesh
      ;(m?.material as THREE.Material | undefined) && (((m.material as any).opacity = g))
      label.current.position.y = 0.42 + Math.sin(t * 1.2 + index) * 0.01
    }
  })

  return (
    <group position={pos}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={mat}
          color={node.color}
          emissive={node.color}
          emissiveIntensity={0.12}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <Billboard ref={label}>
        <Text
          fontSize={0.16}
          color={node.color}
          anchorX="center"
          anchorY="bottom"
          material-transparent
          material-opacity={0}
          outlineWidth={0.004}
          outlineColor="#07070d"
        >
          {node.name}
        </Text>
        <Text
          position={[0, -0.04, 0]}
          fontSize={0.085}
          color="#cdbfae"
          anchorX="center"
          anchorY="top"
          material-transparent
          material-opacity={0}
        >
          {node.sub}
        </Text>
      </Billboard>
    </group>
  )
}

export function PipelineNodes() {
  return (
    <group>
      {NODES.map((_, i) => (
        <Orb key={i} index={i} />
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds. (Note: the sub-label opacity is driven via the parent group's child; if drei's `Text` ref typing complains, drive both Texts with `material-opacity` refs instead — see Task 5 wiring. Keep build green before moving on.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/scene/spell/PipelineNodes.tsx
git commit -m "feat: pipeline rune-orbs with sequenced ignition glow"
```

---

## Task 4: Traveling bolt + energy streams (`SpellBolt.tsx`)

**Files:**
- Create: `frontend/src/scene/spell/SpellBolt.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// frontend/src/scene/spell/SpellBolt.tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NODES, nodePosition, streamGlow, spellState } from './spell'

/** Catmull-Rom curve threaded through all node positions — the bolt's flight path. */
function usePath() {
  return useMemo(() => {
    const pts = NODES.map((_, i) => new THREE.Vector3(...nodePosition(i)))
    return new THREE.CatmullRomCurve3(pts)
  }, [])
}

/** One glowing tube segment between consecutive nodes; opacity follows streamGlow. */
function Stream({ segIndex }: { segIndex: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const geom = useMemo(() => {
    const a = new THREE.Vector3(...nodePosition(segIndex))
    const b = new THREE.Vector3(...nodePosition(segIndex + 1))
    const curve = new THREE.LineCurve3(a, b)
    return new THREE.TubeGeometry(curve, 8, 0.02, 6, false)
  }, [segIndex])

  useFrame(() => {
    if (mat.current) mat.current.opacity = streamGlow(spellState.progress, segIndex, NODES.length) * 0.8
  })

  return (
    <mesh geometry={geom}>
      <meshBasicMaterial ref={mat} color="#7fd0c4" transparent opacity={0} />
    </mesh>
  )
}

export function SpellBolt() {
  const path = usePath()
  const bolt = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const p = spellState.progress
    // bolt visible only while traveling (0 < p < 1)
    const traveling = p > 0.001 && p < 0.999
    path.getPoint(THREE.MathUtils.clamp(p, 0, 1), tmp)
    if (bolt.current) {
      bolt.current.visible = traveling
      bolt.current.position.copy(tmp)
    }
    if (light.current) {
      light.current.visible = traveling
      light.current.position.copy(tmp)
    }
  })

  return (
    <group>
      {NODES.slice(0, -1).map((_, i) => (
        <Stream key={i} segIndex={i} />
      ))}
      <mesh ref={bolt} visible={false}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <pointLight ref={light} color="#bfefff" intensity={6} distance={4} decay={2} visible={false} />
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/scene/spell/SpellBolt.tsx
git commit -m "feat: traveling spell bolt and inter-node energy streams"
```

---

## Task 5: Chamber station + cast timeline (`SpellStation.tsx`)

**Files:**
- Create: `frontend/src/scene/spell/SpellStation.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// frontend/src/scene/spell/SpellStation.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import {
  STATION, localProgress, spellState, castProgress, CAST_DURATION,
} from './spell'
import { PipelineNodes } from './PipelineNodes'
import { SpellBolt } from './SpellBolt'

const RING_FLOOR_Y = -1.32
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function SpellStation() {
  const group = useRef<THREE.Group>(null)
  const focus = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999

    const now = state.clock.elapsedTime

    // Consume a cast request: stamp its start (or jump to lit end if reduced motion).
    if (spellState.requested) {
      spellState.requested = false
      spellState.hasCast = true
      if (reduceMotion) {
        spellState.startedAt = -1
        spellState.progress = 1
      } else {
        spellState.startedAt = now
      }
    }

    // Drive the active ramp.
    if (spellState.startedAt >= 0) {
      spellState.progress = castProgress(now, spellState.startedAt, CAST_DURATION)
      if (spellState.progress >= 1) spellState.startedAt = -1 // finished → idle-lit
    }

    // Idle caster focus spin.
    if (focus.current) focus.current.rotation.y = now * 0.6
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* chamber light rig — cool key + warm fill so orbs read against the dark */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#bfefff" distance={16} decay={2} />
      <pointLight position={[-3, 1, 2]} intensity={2.5} color="#e7c27d" distance={12} decay={2} />
      <spotLight position={[0, 5, 4]} angle={0.7} penumbra={1} intensity={9} color="#dff6ff" target-position={[STATION[0], 0.4, 0]} />

      {/* casting circle on the floor */}
      <group position={[0, RING_FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[2.4, 2.46, 80]} />
          <meshBasicMaterial color="#7fd0c4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.0, 1.03, 64]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* runic caster focus at the path's start (spins idly, source of the bolt) */}
      <mesh ref={focus} position={[-3.2, 0.2, -0.6]}>
        <torusGeometry args={[0.22, 0.03, 12, 32]} />
        <meshStandardMaterial color="#e7c27d" emissive="#e7c27d" emissiveIntensity={1.4} />
      </mesh>

      <PipelineNodes />
      <SpellBolt />

      <Sparkles count={50} scale={[8, 4, 4]} size={3} speed={0.2} color="#7fd0c4" opacity={0.5} />
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/scene/spell/SpellStation.tsx
git commit -m "feat: spell chamber station with cast timeline driver"
```

---

## Task 6: Pipeline content in `data.ts` (optional mirror for HTML) + Conjuring section

> NOTE: the 3D nodes already live in `spell.ts:NODES`. To avoid two sources of truth, the HTML section imports `NODES` from `spell.ts` rather than re-declaring content in `data.ts`. No `data.ts` change is needed. (This task is intentionally a no-op for `data.ts`; the section is built in Task 7.)

- [ ] **Step 1:** Confirm `spell.ts` `NODES` is exported (done in Task 2). No code change. Skip to Task 7.

---

## Task 7: `Conjuring` HTML section + Cast button

**Files:**
- Modify: `frontend/src/components/Sections.tsx`
- Modify: `frontend/src/components/sections.css`

- [ ] **Step 1: Add the `Conjuring` component to `Sections.tsx`**

Add this import near the top of `frontend/src/components/Sections.tsx` (with the other imports):

```tsx
import { useState } from 'react'
import { spellState, NODES } from '../scene/spell/spell'
```

(Adjust the existing `import { useRef, useState } from 'react'` line if `useState` is already imported — do not import it twice.)

Add this component (e.g. directly after the `Grimoire` function):

```tsx
export function Conjuring() {
  const [cast, setCast] = useState(false)

  const onCast = () => {
    spellState.requested = true
    setCast(true) // local flag only drives the button label; canvas reads the singleton
  }

  return (
    <section id="conjuring" className="section section--conjuring conjuring--pinned">
      <div className="conjuring__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter V — The Conjuring of Apps</span>
        </MaskReveal>
        <IgniteHeading className="section__title" text="One spell, end to end" />
        <Reveal delay={0.1}>
          <p className="conjuring__lede">
            From a brief to a living product — retrieval-augmented intelligence, a
            FastAPI spine, containerized and summoned onto AWS or GCP. Cast the spell and
            watch a full-stack AI app assemble itself, A&nbsp;→&nbsp;Z.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <button type="button" className="cast-btn" onClick={onCast}>
            <span className="cast-btn__rune">✦</span>
            {cast ? 'Recast the spell' : 'Cast the spell'}
          </button>
        </Reveal>
        <Reveal delay={0.24}>
          <ol className="conjuring__legend">
            {NODES.map((n) => (
              <li key={n.name} className="conjuring__legend-item">
                <span className="conjuring__legend-name">{n.name}</span>
                <span className="conjuring__legend-tags">{n.tags.join(' · ')}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add styles to `sections.css`**

Append to `frontend/src/components/sections.css`:

```css
/* ── Chapter V — The Conjuring of Apps ── */
.section--conjuring {
  min-height: 100vh;
}
.conjuring--pinned {
  position: sticky;
  top: 0;
}
.conjuring__stage {
  max-width: 40rem;
  padding: 12vh 6vw;
}
.conjuring__lede {
  margin-top: 1rem;
  color: var(--ink-2, #cdbfae);
  font-family: 'Cormorant Garamond', serif;
  font-size: 1.25rem;
  line-height: 1.6;
}
.cast-btn {
  margin-top: 1.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.4rem;
  font-family: 'Cinzel', serif;
  letter-spacing: 0.06em;
  font-size: 0.95rem;
  color: #07070d;
  background: linear-gradient(180deg, #f0d39a, #e7c27d);
  border: none;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(231, 194, 125, 0.5);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.cast-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 36px rgba(231, 194, 125, 0.8);
}
.cast-btn__rune {
  color: #7fd0c4;
}
.conjuring__legend {
  margin-top: 2rem;
  list-style: none;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}
.conjuring__legend-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgba(231, 194, 125, 0.18);
  padding-top: 0.5rem;
}
.conjuring__legend-name {
  font-family: 'Cinzel', serif;
  color: var(--gold, #e7c27d);
  font-size: 0.95rem;
}
.conjuring__legend-tags {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: #8aa;
  text-align: right;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Sections.tsx frontend/src/components/sections.css
git commit -m "feat: Conjuring HTML chapter with Cast Spell button"
```

---

## Task 8: Wire station + section + rail (Scene, App, chapters)

**Files:**
- Modify: `frontend/src/scene/Scene.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/chapters.ts`

- [ ] **Step 1: Mount the station in `Scene.tsx`**

Add the import alongside `import { TrackerStation } from './tracker/TrackerStation'`:

```tsx
import { SpellStation } from './spell/SpellStation'
```

Add `<SpellStation />` inside the `<Suspense>` block, right after `<TrackerStation />`:

```tsx
        <TrackerStation />
        <SpellStation />
```

- [ ] **Step 2: Render the section in `App.tsx`**

Update the Sections import to include `Conjuring`:

```tsx
import { About, Spells, Grimoire, Conjuring, Tracker, Chronicles, OwlPost } from './components/Sections'
```

Insert `<Conjuring />` between `<Grimoire />` and `<Tracker />` in the `<main>`:

```tsx
        <Grimoire />
        <Conjuring />
        <Tracker />
```

- [ ] **Step 3: Insert the chapter into `chapters.ts` and renumber**

Replace the `chapters` array body so the new chapter sits after grimoire and later romans shift:

```ts
export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',    theme: 'The Conjuring',      plain: 'intro',        at: 0.0 },
  { id: 'wizard',     numeral: 'II',   theme: 'The Mind',           plain: 'about me',     at: 0.197 },
  { id: 'spells',     numeral: 'III',  theme: 'Spells',             plain: 'skills',       at: 0.301 },
  { id: 'grimoire',   numeral: 'IV',   theme: 'The Grimoire',       plain: 'projects',     at: 0.612 },
  { id: 'conjuring',  numeral: 'V',    theme: 'The Conjuring of Apps', plain: 'full-stack AI', at: 0.70 },
  { id: 'tracker',    numeral: 'VI',   theme: 'The Pulse',          plain: 'live AI demo', at: 0.83 },
  { id: 'chronicles', numeral: 'VII',  theme: 'The Path',           plain: 'experience',   at: 0.91 },
  { id: 'owlpost',    numeral: 'VIII', theme: 'Owl Post',           plain: 'contact',      at: 1.0 },
]
```

(The `at` values are approximate — rail dot placement only. Task 9 fine-tunes them from measurement.)

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/scene/Scene.tsx frontend/src/App.tsx frontend/src/chapters.ts
git commit -m "feat: wire spell chamber into scene, page, and chapter rail"
```

---

## Task 9: Camera keyframe + scroll-fraction recalibration (measure → set)

**Files:**
- Modify: `frontend/src/scene/CameraRig.tsx`
- Modify: `frontend/src/scene/spell/spell.ts` (`SECTION_START/END`)
- Modify: `frontend/src/scene/tracker/phases.ts` (`SECTION_START/END`)
- Modify: `frontend/src/chapters.ts` (`at` values)

- [ ] **Step 1: Add a provisional chamber keyframe to `CameraRig.tsx`**

The chamber is at world x ≈ -13. Insert a keyframe after grimoire and before tracker. Replace the `KEYS` array's grimoire→tracker span with (provisional fractions; refined in Step 3):

```ts
  { at: 0.612, pos: [4.5, 0.4, 4.6],   look: [0, 0.0, 0] },     // grimoire (measured 0.612)
  { at: 0.66,  pos: [-13, 1.4, 7.0],   look: [-13, 0.6, 0] },   // conjuring — entry (provisional)
  { at: 0.74,  pos: [-13, 1.6, 8.4],   look: [-13, 0.7, 0] },   // conjuring — held (provisional)
  { at: 0.83,  pos: [12, 1.0, 6.2],    look: [12, 0.5, 0] },    // tracker — entry (provisional)
  { at: 0.92,  pos: [12.6, 1.5, 7.8],  look: [12, 0.9, 0] },    // tracker — held (provisional)
  { at: 0.96,  pos: [-4.5, 1.6, 4.2],  look: [0, 0.3, 0] },     // chronicles (provisional)
```

(Keep the existing hero/about/spells keyframes above and the owlpost keyframe at `at: 1.0` below unchanged.)

- [ ] **Step 2: Build and start the dev server**

Run: `npm run build` (expect success), then ensure the dev server is running at http://localhost:5173/.

- [ ] **Step 3: Measure real section offsets headlessly**

Create a throwaway script `frontend/tools/measure.mjs`:

```js
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
const data = await p.evaluate(() => {
  const docH = document.documentElement.scrollHeight - window.innerHeight
  const ids = ['top','wizard','spells','grimoire','conjuring','tracker','chronicles','owlpost']
  return ids.map((id) => {
    const el = document.getElementById(id)
    const top = el ? el.getBoundingClientRect().top + window.scrollY : null
    return { id, frac: top == null ? null : +(top / docH).toFixed(3) }
  })
})
console.log(JSON.stringify(data, null, 2))
await b.close()
```

Run: `node frontend/tools/measure.mjs`
Expected: a JSON array of `{id, frac}` for all eight sections.

- [ ] **Step 4: Set the measured fractions**

Using the measured `frac` for each id:
- In `chapters.ts`, set each chapter's `at` to its measured `frac`.
- In `CameraRig.tsx`, set the `at` of the conjuring/tracker/chronicles keyframes to align with the measured fractions (entry ≈ section frac; held ≈ frac + ~half the section's span, matching how tracker's two keyframes bracket its window today).
- In `spell.ts`, set `SECTION_START` = conjuring frac, `SECTION_END` = tracker frac (the conjuring section spans up to where the tracker begins).
- In `phases.ts`, set the tracker's `SECTION_START` = tracker frac, `SECTION_END` = chronicles frac (re-measured; replaces the old 0.705/0.857).

- [ ] **Step 5: Verify camera lands on the chamber and tracker still triggers**

Run: `npm run build` (expect success). Then screenshot at three scroll fractions (conjuring entry, conjuring mid, tracker mid) — see Task 10 for the screenshot harness — and confirm: the chamber (orbs) is centered during the conjuring window, and the tracker (cricketer + scan rings) still appears during its window.

- [ ] **Step 6: Remove the throwaway script and commit**

```bash
rm frontend/tools/measure.mjs
git add frontend/src/scene/CameraRig.tsx frontend/src/scene/spell/spell.ts frontend/src/scene/tracker/phases.ts frontend/src/chapters.ts
git commit -m "fix: recalibrate camera + section windows for the spell chapter"
```

---

## Task 10: Visual verification — idle, mid-cast, final

**Files:**
- (Create + remove a throwaway screenshot script.)

- [ ] **Step 1: Write a screenshot harness**

Create `frontend/tools/shot.mjs`:

```js
import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--window-size=1440,900'],
})
const p = await b.newPage()
await p.setViewport({ width: 1440, height: 900 })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2500)) // let preloader + reveal finish

// scroll to the conjuring section
await p.evaluate(() => document.getElementById('conjuring')?.scrollIntoView())
await new Promise((r) => setTimeout(r, 1500))
await p.screenshot({ path: '.shots/conjuring-idle.png' })

// cast the spell
await p.evaluate(() => document.querySelector('.cast-btn')?.click())
await new Promise((r) => setTimeout(r, 1200)) // mid-cast (~40% of 3s)
await p.screenshot({ path: '.shots/conjuring-midcast.png' })
await new Promise((r) => setTimeout(r, 2200)) // final lit
await p.screenshot({ path: '.shots/conjuring-final.png' })

await b.close()
```

- [ ] **Step 2: Run it**

Run (dev server up): `node frontend/tools/shot.mjs`
Expected: three PNGs in `.shots/`.

- [ ] **Step 3: Inspect the screenshots**

Read each PNG. Confirm:
- **idle:** orbs dim, "Cast the spell" button visible, no bolt.
- **midcast:** bolt visible partway along the arc, early orbs/streams lit, later ones still dim.
- **final:** all six orbs lit, labels visible, "Live App" brightest, streams fully drawn, button reads "Recast the spell".

If any check fails, fix the relevant component (Tasks 3–5) and re-shoot before continuing.

- [ ] **Step 4: Clean up**

```bash
rm frontend/tools/shot.mjs
```

(Leave `.shots/` PNGs — they're already gitignored per repo setup; if not, do not commit them.)

- [ ] **Step 5: Final full build + test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests pass.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "test: verify spell chapter renders idle/mid-cast/final states"
```

---

## Self-Review

**Spec coverage:**
- Click-to-cast, replayable → Task 5 (timeline), Task 7 (button + Recast label). ✓
- New chapter after Grimoire, renumber → Task 8 (chapters/App), Task 9 (camera). ✓
- Igniting rune-node pipeline, six A→Z nodes → Tasks 2, 3, 4. ✓
- Left-side chamber `[-13,0,0]` → Task 2 `STATION`, Task 9 camera. ✓
- `spellState` singleton, no scroll re-render → Task 2, consumed Task 5/7. ✓
- Reduced motion snaps to lit end → Task 5. ✓
- Three coupled places synced + re-measured fractions → Tasks 8 & 9. ✓
- Verify via build + puppeteer screenshots → Tasks 9, 10. ✓
- No new GLB asset → procedural geometry only (Tasks 3–5). ✓

**Placeholder scan:** `SECTION_START/END` and camera `at` values are explicitly provisional and resolved by measurement in Task 9 (not silent TODOs). No other placeholders.

**Type consistency:** `spellState` shape (`requested`/`startedAt`/`progress`/`hasCast`) defined in Task 2, consumed identically in Tasks 3/4/5/7. `nodeGlow`/`streamGlow`/`castProgress`/`localProgress`/`nodePosition`/`NODES`/`CAST_DURATION`/`STATION` signatures match across tasks.
