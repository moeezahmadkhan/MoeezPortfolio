# Chapter VI — "The Pact" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new scroll-pinned 3D chapter ("The Pact") between Grimoire and Tracker that animates an AI founder↔investor matchmaking pipeline (deck ingest → LLM analysis + score → the binding pact) as the user scrolls.

**Architecture:** Mirrors the existing `scene/spell/` (The Conjuring) chapter. One shared `<Canvas>` already mounted in `Scene.tsx`; we add a world-space "station" group driven by the global `scrollState` singleton read inside `useFrame`. Pure beat/score math lives in a testable `phases.ts`. Founder/investor are abstract luminous sigils — no new GLB assets. HTML overlay + CSS mirror `Conjuring()`. Chapter ordering is kept in sync across `chapters.ts`, `CameraRig.tsx` KEYS, and `App.tsx` composition; `ScrollRail` reads `chapters.ts` automatically.

**Tech Stack:** React 18 + TypeScript, React Three Fiber + drei (`Billboard`, `Text`, `Sparkles`), Vite, Vitest (pure-math tests), puppeteer-core (scroll-offset calibration).

**Correctness gates:** `npm run build` (runs `tsc -b`) and `npm run test` (vitest). All commands run from `/home/quids/MoeezPortfolio/frontend`.

**Verification note (from project memory):** Headless screenshots of reveal-animated HTML render black under SwiftShader (rAF starvation). Verify HTML via `textContent`/build, verify math via vitest, and hand the 3D visual polish to the user in a real browser. Do **not** judge the beats from headless pixels.

---

### Task 1: Pact beat & score math (`phases.ts`) — TDD

**Files:**
- Create: `frontend/src/scene/pact/phases.ts`
- Test: `frontend/src/scene/pact/phases.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/scene/pact/phases.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  localProgress, SECTION_START, SECTION_END,
  ingestProgress, analysisProgress, pactProgress,
  scoreValue, SCORE_TARGET, INGEST_END, LEGILIMENCY_END,
} from './phases'

describe('localProgress', () => {
  it('ramps 0→1 across the section band and clamps outside', () => {
    expect(localProgress(SECTION_START - 0.1)).toBe(0)
    expect(localProgress(SECTION_START)).toBe(0)
    expect(localProgress((SECTION_START + SECTION_END) / 2)).toBeCloseTo(0.5, 5)
    expect(localProgress(SECTION_END)).toBe(1)
    expect(localProgress(SECTION_END + 0.1)).toBe(1)
  })
})

describe('beat ramps', () => {
  it('ingest fills over [0, INGEST_END] then holds at 1', () => {
    expect(ingestProgress(0)).toBe(0)
    expect(ingestProgress(INGEST_END)).toBe(1)
    expect(ingestProgress(1)).toBe(1)
  })
  it('analysis fills over [INGEST_END, LEGILIMENCY_END]', () => {
    expect(analysisProgress(INGEST_END)).toBe(0)
    expect(analysisProgress(LEGILIMENCY_END)).toBe(1)
    expect(analysisProgress(0)).toBe(0)
  })
  it('pact fills over [LEGILIMENCY_END, 1]', () => {
    expect(pactProgress(LEGILIMENCY_END)).toBe(0)
    expect(pactProgress(1)).toBe(1)
    expect(pactProgress(INGEST_END)).toBe(0)
  })
})

describe('scoreValue', () => {
  it('is 0 before analysis, counts up to SCORE_TARGET by the end of beat 2', () => {
    expect(scoreValue(0)).toBe(0)
    expect(scoreValue(INGEST_END)).toBe(0)
    expect(scoreValue(LEGILIMENCY_END)).toBe(SCORE_TARGET)
    expect(scoreValue(1)).toBe(SCORE_TARGET)
  })
  it('is monotonically non-decreasing through beat 2', () => {
    let prev = -1
    for (let lp = 0; lp <= 1.0001; lp += 0.05) {
      const v = scoreValue(lp)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/scene/pact/phases.test.ts`
Expected: FAIL — `Failed to resolve import "./phases"` (file does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `frontend/src/scene/pact/phases.ts`:

```ts
import * as THREE from 'three'

/**
 * World-space anchor for the Pact station. Only one station is visible at a time
 * (visibility is gated by localProgress), so this may share space with others.
 * Placed straight ahead and deep so the camera dollies forward into it — distinct
 * from the lateral Spell (−13) and Tracker (+12) stations.
 */
export const STATION: [number, number, number] = [0, 0, -7]

/**
 * Pact band in GLOBAL scroll fraction (0→1 down the whole page). PROVISIONAL —
 * recalibrated in Task 9 after the 250vh section is inserted. START is nudged
 * slightly before the measured section top so the station isn't gated off at the
 * very entry (mirrors spell.ts START 0.47 vs measured 0.498).
 */
export const SECTION_START = 0.66
export const SECTION_END = 0.74

/** Global progress → local 0→1 within the Pact band. */
export function localProgress(progress: number): number {
  return THREE.MathUtils.clamp(
    (progress - SECTION_START) / (SECTION_END - SECTION_START),
    0,
    1,
  )
}

/** Beat boundaries in LOCAL progress (0→1 across the pinned runway). */
export const INGEST_END = 0.33
export const LEGILIMENCY_END = 0.66

/** Clamped smoothstep — 0 at/below start, 1 at/above end, eased between. */
export function smooth01(x: number, start: number, end: number): number {
  if (end <= start) return x >= end ? 1 : 0
  const t = THREE.MathUtils.clamp((x - start) / (end - start), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Beat 1 — deck flies in and is ingested (0→1 across [0, INGEST_END]). */
export function ingestProgress(lp: number): number {
  return smooth01(lp, 0, INGEST_END)
}

/** Beat 2 — the core reads the deck (0→1 across [INGEST_END, LEGILIMENCY_END]). */
export function analysisProgress(lp: number): number {
  return smooth01(lp, INGEST_END, LEGILIMENCY_END)
}

/** Beat 3 — founder & investor bind (0→1 across [LEGILIMENCY_END, 1]). */
export function pactProgress(lp: number): number {
  return smooth01(lp, LEGILIMENCY_END, 1)
}

/** Final score the readout resolves to. */
export const SCORE_TARGET = 82

/** The single score number, counting up as the analysis beat progresses. */
export function scoreValue(lp: number): number {
  return Math.round(SCORE_TARGET * analysisProgress(lp))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/scene/pact/phases.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/scene/pact/phases.ts frontend/src/scene/pact/phases.test.ts
git commit -m "feat(pact): beat & score math for The Pact chapter"
```

---

### Task 2: Beat 1 — `DeckIngest.tsx`

**Files:**
- Create: `frontend/src/scene/pact/DeckIngest.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/scene/pact/DeckIngest.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, ingestProgress } from './phases'

const PAGES = 5
const START_POS = new THREE.Vector3(-5, 2.4, 2) // flies in from the upper-left
const END_POS = new THREE.Vector3(0, 0.6, 0) // the analysis core

/** A glowing stack of pitch-deck pages that drifts in and is drawn into the core. */
export function DeckIngest() {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const p = ingestProgress(localProgress(scrollState.progress))
    const g = group.current
    if (!g) return
    g.position.lerpVectors(START_POS, END_POS, p)
    g.scale.setScalar(THREE.MathUtils.lerp(1, 0.15, p)) // shrinks into the core
    g.rotation.y = p * Math.PI * 1.5
    g.visible = p < 0.999
    g.children.forEach((child) => {
      const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
      m.opacity = 1 - p * 0.6
    })
  })

  return (
    <group ref={group}>
      {Array.from({ length: PAGES }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.9, 1.25]} />
          <meshStandardMaterial
            color="#ece2cf"
            emissive="#e7c27d"
            emissiveIntensity={0.4}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/scene/pact/DeckIngest.tsx
git commit -m "feat(pact): beat 1 — deck ingest"
```

---

### Task 3: Beat 2 — `AnalysisCore.tsx` (with score billboard)

**Files:**
- Create: `frontend/src/scene/pact/AnalysisCore.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/scene/pact/AnalysisCore.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, analysisProgress, scoreValue } from './phases'

const ORBS = 6

/** The core that "reads" the deck — pulsing wireframe, insight orbs flung outward,
 *  and a single score number that counts up on a billboard. */
export function AnalysisCore() {
  const core = useRef<THREE.Mesh>(null)
  const orbs = useRef<THREE.Group>(null)
  // troika Text exposes imperative `.text` / `.fillOpacity` / `.sync()` — typed as any.
  const scoreText = useRef<any>(null)

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    const a = analysisProgress(lp)
    const now = state.clock.elapsedTime

    if (core.current) {
      core.current.rotation.y = now * 0.4
      const pulse = Math.sin(now * 3) * 0.05
      const mat = core.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + a * (1.2 + pulse)
    }

    if (orbs.current) {
      const r = a * 1.8
      orbs.current.children.forEach((child, i) => {
        const ang = (i / ORBS) * Math.PI * 2 + now * 0.2
        child.position.set(Math.cos(ang) * r, Math.sin(ang) * r * 0.5, Math.sin(ang) * r)
        ;(child as THREE.Mesh).visible = a > 0.05
      })
    }

    if (scoreText.current) {
      scoreText.current.text = a > 0.02 ? String(scoreValue(lp)) : ''
      scoreText.current.fillOpacity = a
      scoreText.current.sync?.()
    }
  })

  return (
    <group position={[0, 0.6, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#7fd0c4" emissive="#7fd0c4" emissiveIntensity={0.6} wireframe />
      </mesh>

      <group ref={orbs}>
        {Array.from({ length: ORBS }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial color="#e7c27d" emissive="#e7c27d" emissiveIntensity={1.4} />
          </mesh>
        ))}
      </group>

      <Billboard position={[0, 1.5, 0]}>
        <Text ref={scoreText} fontSize={0.6} color="#f6dfa6" anchorX="center" anchorY="middle" fillOpacity={0}>
          {''}
        </Text>
        <Text position={[0, -0.42, 0]} fontSize={0.12} color="#cdbfae" anchorX="center" anchorY="top">
          PITCH SCORE
        </Text>
      </Billboard>
    </group>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/scene/pact/AnalysisCore.tsx
git commit -m "feat(pact): beat 2 — analysis core + score readout"
```

---

### Task 4: Beat 3 — `ThePact.tsx`

**Files:**
- Create: `frontend/src/scene/pact/ThePact.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/scene/pact/ThePact.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { localProgress, pactProgress } from './phases'

const FOUNDER_FAR = new THREE.Vector3(-2.4, 0.6, 0)
const INVESTOR_FAR = new THREE.Vector3(2.4, 0.6, 0)
const FOUNDER_NEAR = new THREE.Vector3(-0.55, 0.6, 0)
const INVESTOR_NEAR = new THREE.Vector3(0.55, 0.6, 0)
const CARDS = 3

/** Founder & investor sigils drift together over a portal ring; a binding cord
 *  forms between them; faint activity cards rise as a nod to the kanban board. */
export function ThePact() {
  const founder = useRef<THREE.Group>(null)
  const investor = useRef<THREE.Group>(null)
  const cord = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const cards = useRef<THREE.Group>(null)

  useFrame((state) => {
    const p = pactProgress(localProgress(scrollState.progress))
    const now = state.clock.elapsedTime

    if (founder.current) founder.current.position.lerpVectors(FOUNDER_FAR, FOUNDER_NEAR, p)
    if (investor.current) investor.current.position.lerpVectors(INVESTOR_FAR, INVESTOR_NEAR, p)

    if (cord.current) {
      cord.current.scale.x = Math.max(0.001, p)
      ;(cord.current.material as THREE.MeshStandardMaterial).emissiveIntensity = p * 2
      cord.current.visible = p > 0.02
    }

    if (ring.current) {
      ring.current.rotation.z = now * 0.3
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + p * 0.4
    }

    if (cards.current) {
      const t = THREE.MathUtils.clamp((p - 0.55) / 0.45, 0, 1) // appear once the bond is formed
      cards.current.children.forEach((child, i) => {
        child.position.y = 1.2 + i * 0.28 + t * 0.2
        ;((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = t * 0.7
      })
    }
  })

  return (
    <group>
      {/* world portal ring on the floor */}
      <mesh ref={ring} position={[0, -1.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.66, 80]} />
        <meshBasicMaterial color="#7fd0c4" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* founder sigil */}
      <group ref={founder}>
        <mesh>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#e7c27d" emissive="#e7c27d" emissiveIntensity={1.2} />
        </mesh>
        <Billboard position={[0, 0.55, 0]}>
          <Text fontSize={0.13} color="#cdbfae" anchorX="center">
            FOUNDER
          </Text>
        </Billboard>
      </group>

      {/* investor sigil */}
      <group ref={investor}>
        <mesh>
          <octahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial color="#7fb6d8" emissive="#7fb6d8" emissiveIntensity={1.2} />
        </mesh>
        <Billboard position={[0, 0.55, 0]}>
          <Text fontSize={0.13} color="#cdbfae" anchorX="center">
            INVESTOR
          </Text>
        </Billboard>
      </group>

      {/* binding cord (grows from 0 width as the pact forms) */}
      <mesh ref={cord} position={[0, 0.6, 0]}>
        <boxGeometry args={[1.1, 0.04, 0.04]} />
        <meshStandardMaterial color="#f6dfa6" emissive="#f6dfa6" emissiveIntensity={0} />
      </mesh>

      {/* kanban-nod activity cards */}
      <group ref={cards} position={[1.5, 0, 0]}>
        {Array.from({ length: CARDS }).map((_, i) => (
          <mesh key={i} position={[0, 1.2 + i * 0.28, 0]}>
            <planeGeometry args={[0.5, 0.18]} />
            <meshStandardMaterial
              color="#9ad6b4"
              emissive="#9ad6b4"
              emissiveIntensity={0.5}
              transparent
              opacity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
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
git add frontend/src/scene/pact/ThePact.tsx
git commit -m "feat(pact): beat 3 — the binding pact"
```

---

### Task 5: Station root `PactStation.tsx` + render in scene

**Files:**
- Create: `frontend/src/scene/pact/PactStation.tsx`
- Modify: `frontend/src/scene/Scene.tsx` (import at top near line 21; render near line 81 after `<SpellStation />`)

- [ ] **Step 1: Write the station root**

Create `frontend/src/scene/pact/PactStation.tsx`:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { STATION, localProgress } from './phases'
import { DeckIngest } from './DeckIngest'
import { AnalysisCore } from './AnalysisCore'
import { ThePact } from './ThePact'

/** The Pact chamber. Lit, floor-ringed, and gated to its scroll band. */
export function PactStation() {
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    if (group.current) group.current.visible = lp > 0.001 && lp < 0.999
  })

  return (
    <group ref={group} position={STATION} dispose={null}>
      {/* chamber light rig — cool key + warm fill so the sigils read against the dark */}
      <pointLight position={[0, 3, 3]} intensity={5} color="#bfefff" distance={16} decay={2} />
      <pointLight position={[3, 1, 2]} intensity={2.5} color="#e7c27d" distance={12} decay={2} />
      <spotLight
        position={[0, 5, 4]}
        angle={0.7}
        penumbra={1}
        intensity={9}
        color="#dff6ff"
        target-position={[STATION[0], 0.4, STATION[2]]}
      />

      {/* floor rune ring */}
      <group position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[2.4, 2.46, 80]} />
          <meshBasicMaterial color="#7fd0c4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <ringGeometry args={[1.0, 1.03, 64]} />
          <meshBasicMaterial color="#e7c27d" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <DeckIngest />
      <AnalysisCore />
      <ThePact />

      <Sparkles count={50} scale={[8, 4, 4]} size={3} speed={0.2} color="#7fd0c4" opacity={0.5} />
    </group>
  )
}
```

- [ ] **Step 2: Import it in `Scene.tsx`**

In `frontend/src/scene/Scene.tsx`, add the import alongside the other station imports (after the `SpellStation` import, ~line 21):

```tsx
import { PactStation } from './pact/PactStation'
```

- [ ] **Step 3: Render it in `Scene.tsx`**

In `frontend/src/scene/Scene.tsx`, add `<PactStation />` right after `<SpellStation />` (~line 81):

```tsx
        <TrackerStation />
        <SpellStation />
        <PactStation />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/scene/pact/PactStation.tsx frontend/src/scene/Scene.tsx
git commit -m "feat(pact): station root + mount in scene"
```

---

### Task 6: Legend content in `data.ts`

**Files:**
- Modify: `frontend/src/data.ts` (append at end)

- [ ] **Step 1: Add the pact steps data**

Append to `frontend/src/data.ts`:

```ts
export type PactStep = {
  name: string // themed pipeline step
  tags: string[] // real stack chips
}

/** The four pipeline steps shown in the Pact chapter legend. */
export const pactSteps: PactStep[] = [
  { name: 'Ingest', tags: ['Deck upload', 'Parsing'] },
  { name: 'Legilimency', tags: ['LLM deck analysis'] },
  { name: 'The Match', tags: ['Embeddings + matching'] },
  { name: 'The Pact', tags: ['FastAPI', 'React', 'Kanban'] },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors (data is unused until Task 7 — `tsc` does not flag unused exports).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/data.ts
git commit -m "feat(pact): legend step data"
```

---

### Task 7: HTML overlay `Pact()` + CSS + wire into `App.tsx`

**Files:**
- Modify: `frontend/src/components/Sections.tsx` (import `pactSteps`; add `Pact()` export)
- Modify: `frontend/src/components/sections.css` (append pact styles)
- Modify: `frontend/src/App.tsx` (import `Pact`; render between `<Grimoire />` and `<Tracker />`)

- [ ] **Step 1: Extend the data import in `Sections.tsx`**

In `frontend/src/components/Sections.tsx`, change the data import line:

```tsx
import { projects, spellbook, chronicles } from '../data'
```

to:

```tsx
import { projects, spellbook, chronicles, pactSteps } from '../data'
```

- [ ] **Step 2: Add the `Pact()` component to `Sections.tsx`**

Add this export to `frontend/src/components/Sections.tsx` (place it after the `Grimoire()` export so file order matches page order):

```tsx
export function Pact() {
  return (
    <section id="pact" className="section section--pact pact--pinned">
      <div className="pact__stage">
        <MaskReveal>
          <span className="eyebrow">Chapter VI — The Pact</span>
        </MaskReveal>
        <span className="section__cat section__cat--project">
          ✦ Project · AI founder–investor matchmaking
        </span>
        <IgniteHeading className="section__title" text="The deck, read. The deal, bound." />
        <Reveal delay={0.1}>
          <p className="pact__lede">
            A founder uploads a pitch deck. An LLM reads it, scores it, and surfaces it to the
            investors who actually fit — then binds the two together to carry the deal forward.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <ol className="pact__legend">
            {pactSteps.map((s) => (
              <li key={s.name} className="pact__legend-item">
                <span className="pact__legend-name">{s.name}</span>
                <span className="pact__legend-tags">{s.tags.join(' · ')}</span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add the CSS to `sections.css`**

Append to `frontend/src/components/sections.css`:

```css
/* ── Chapter VI — The Pact (pinned 3D) ───────────────────────────── */
.pact--pinned {
  height: 250vh;
  padding: 0;
}

.pact__stage {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2rem;
  padding: clamp(2rem, 6vw, 6rem);
  box-sizing: border-box;
}

/* legibility scrim — dark on the left (text), transparent right (3D chamber) */
.pact__stage::before {
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
.pact__stage > * {
  position: relative;
}

.pact__lede {
  max-width: 30rem;
  color: var(--parchment-dim);
  font-size: 1.15rem;
  line-height: 1.6;
}

.pact__legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 30rem;
}
.pact__legend-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(231, 194, 125, 0.14);
  padding-bottom: 0.4rem;
}
.pact__legend-name {
  font-family: var(--font-display);
  color: var(--gold-bright);
}
.pact__legend-tags {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--rune);
  letter-spacing: 0.04em;
}
```

- [ ] **Step 4: Wire into `App.tsx`**

In `frontend/src/App.tsx`, add `Pact` to the existing `Sections` import (the line importing `Grimoire`, `Tracker`, etc. from `./components/Sections`), then render it in `<main>` between `<Grimoire />` and `<Tracker />`:

```tsx
        <Grimoire />
        <Pact />
        <Tracker />
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Verify the section renders in the DOM (textContent, not pixels)**

Start the dev server in the background, then assert the heading text is present:

```bash
npm run dev &
sleep 4
curl -s http://localhost:5173/ >/dev/null && echo "dev up"
node -e "fetch('http://localhost:5173/src/components/Sections.tsx').then(r=>r.text()).then(t=>console.log(t.includes('Chapter VI — The Pact') ? 'PACT SECTION PRESENT' : 'MISSING'))"
```

Expected: `PACT SECTION PRESENT`. (The reveal-animated DOM may screenshot black — that's expected; we are checking source/text, not pixels.) Leave the dev server running for Task 9, or stop it with `kill %1`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Sections.tsx frontend/src/components/sections.css frontend/src/App.tsx
git commit -m "feat(pact): HTML overlay, styles, and page wiring"
```

---

### Task 8: Register chapter + provisional camera keyframes — TDD on ordering

**Files:**
- Modify: `frontend/src/chapters.ts` (insert `pact`, renumber VI–IX)
- Modify: `frontend/src/scene/CameraRig.tsx` (insert provisional pact keyframes)
- Test: `frontend/src/chapters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/chapters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { chapters } from './chapters'

describe('chapters', () => {
  it('lists all nine chapters in scroll order including The Pact', () => {
    expect(chapters.map((c) => c.id)).toEqual([
      'top', 'wizard', 'spells', 'conjuring', 'grimoire',
      'pact', 'tracker', 'chronicles', 'owlpost',
    ])
  })
  it('numbers them sequentially I→IX', () => {
    expect(chapters.map((c) => c.numeral)).toEqual([
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX',
    ])
  })
  it('has ascending, in-range at fractions', () => {
    for (let i = 0; i < chapters.length; i++) {
      expect(chapters[i].at).toBeGreaterThanOrEqual(0)
      expect(chapters[i].at).toBeLessThanOrEqual(1)
      if (i > 0) expect(chapters[i].at).toBeGreaterThan(chapters[i - 1].at)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/chapters.test.ts`
Expected: FAIL — current `chapters` has 8 entries and no `pact`.

- [ ] **Step 3: Update `chapters.ts`**

Replace the `grimoire`→`owlpost` rows in `frontend/src/chapters.ts` with these (provisional `at` values — recalibrated in Task 9):

```ts
  { id: 'grimoire',   numeral: 'V',    theme: 'The Grimoire',          plain: 'projects',               at: 0.620 },
  { id: 'pact',       numeral: 'VI',   theme: 'The Pact',              plain: 'AI matchmaking',         at: 0.690 },
  { id: 'tracker',    numeral: 'VII',  theme: 'The Pulse',             plain: 'live AI demo',           at: 0.770 },
  { id: 'chronicles', numeral: 'VIII', theme: 'The Path',              plain: 'experience',             at: 0.925 },
  { id: 'owlpost',    numeral: 'IX',   theme: 'Owl Post',              plain: 'contact',                at: 0.985 },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/chapters.test.ts`
Expected: PASS.

- [ ] **Step 5: Insert provisional pact camera keyframes in `CameraRig.tsx`**

In `frontend/src/scene/CameraRig.tsx`, the grimoire keyframe is `{ at: 0.690, pos: [4.5, 0.4, 4.6], look: [0, 0.0, 0] }` and the tracker entry is `{ at: 0.735, pos: [12, 1.0, 6.2], look: [12, 0.5, 0] }`. Insert two pact keyframes between them and push the existing later fractions out to make room. Replace the grimoire-through-owlpost block with:

```tsx
  { at: 0.640, pos: [4.5, 0.4, 4.6],  look: [0, 0.0, 0] },     // grimoire (projects) — center framing
  { at: 0.690, pos: [0, 1.1, 1.0],    look: [0, 0.6, -7] },    // pact — entry, dolly toward the deep-center chamber
  { at: 0.760, pos: [0, 1.3, 0.2],    look: [0, 0.5, -7] },    // pact — held across the pinned span
  { at: 0.790, pos: [12, 1.0, 6.2],   look: [12, 0.5, 0] },    // tracker — entry
  { at: 0.900, pos: [12.6, 1.5, 7.8], look: [12, 0.9, 0] },    // tracker — held
  { at: 0.945, pos: [-4.5, 1.6, 4.2], look: [0, 0.3, 0] },     // chronicles
  { at: 1.0,   pos: [0, 1.0, 10.5],   look: [0, 0.2, 0] },     // owlpost
```

Note: the pact `pos`/`look` aim at `STATION = [0, 0, -7]` from the front; these are provisional and refined in Task 9.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/chapters.ts frontend/src/chapters.test.ts frontend/src/scene/CameraRig.tsx
git commit -m "feat(pact): register chapter VI + provisional camera keyframes"
```

---

### Task 9: Calibrate scroll fractions to measured offsets

Inserting the 250vh pinned section increases total page height, so **every** chapter's `at` fraction shifts (the denominator grew). This task measures the real offsets and snaps `chapters.ts`, `CameraRig.tsx`, and `pact/phases.ts` to them.

**Files:**
- Create: `frontend/scripts/measure.mjs`
- Modify: `frontend/src/chapters.ts`, `frontend/src/scene/CameraRig.tsx`, `frontend/src/scene/pact/phases.ts`

- [ ] **Step 1: Write the measurement script**

Create `frontend/scripts/measure.mjs`:

```js
// Print each section's scroll-offset fraction: (section top px) / (max scroll px).
// Usage: dev server running on :5173, then `node scripts/measure.mjs`
import puppeteer from 'puppeteer-core'

const ids = ['top', 'wizard', 'spells', 'conjuring', 'grimoire', 'pact', 'tracker', 'chronicles', 'owlpost']
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForFunction(() => !document.querySelector('.preloader'), { timeout: 45000 }).catch(() => {})
await new Promise((r) => setTimeout(r, 2500))
const fracs = await page.evaluate((ids) => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return ids.map((id) => {
    const el = document.getElementById(id)
    if (!el) return [id, null]
    const top = el.getBoundingClientRect().top + window.scrollY
    return [id, +(top / max).toFixed(3)]
  })
}, ids)
console.log(JSON.stringify(fracs))
await browser.close()
```

- [ ] **Step 2: Run the measurement**

Ensure the dev server is running (`npm run dev &` if not), then:

```bash
node scripts/measure.mjs
```

Expected: a JSON array like `[["top",0],["wizard",0.11],...,["pact",0.6x],["tracker",0.7x],...]`. Record these numbers.

- [ ] **Step 3: Update `chapters.ts` `at` values**

Set each chapter's `at` to its measured fraction (the rail dots are placed by these). Keep `top` at `0.0`. Verify ordering test still passes:

Run: `npm run test -- src/chapters.test.ts`
Expected: PASS (fractions still strictly ascending).

- [ ] **Step 4: Update `CameraRig.tsx` KEYS fractions**

For each keyframe, set its `at` to the measured fraction of the chapter it frames. For the "held" keyframes (hero hold, spells held, conjuring held, **pact held**, tracker held), set them between their chapter's entry fraction and the next chapter's entry fraction — keep them roughly at the same *relative* position they had before (e.g. pact-held ≈ entry + 0.6 × (next_entry − entry)). The `pos`/`look` values stay; only `at` changes (plus optional pact `pos`/`look` polish in the browser).

- [ ] **Step 5: Update `pact/phases.ts` band to match**

Set:
- `SECTION_START` = measured `pact` fraction − `0.02` (nudge so the station isn't gated off at entry, mirroring spell.ts).
- `SECTION_END` = measured `tracker` fraction + `0.005`.

- [ ] **Step 6: Typecheck + tests**

Run: `npx tsc -b && npm run test`
Expected: build clean, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/scripts/measure.mjs frontend/src/chapters.ts frontend/src/scene/CameraRig.tsx frontend/src/scene/pact/phases.ts
git commit -m "feat(pact): calibrate scroll fractions + camera to measured offsets"
```

---

### Task 10: Full build, test, and visual handoff

**Files:** none (verification only)

- [ ] **Step 1: Full correctness gate**

Run: `npm run build && npm run test`
Expected: `tsc -b` clean, `vite build` succeeds, all vitest suites pass.

- [ ] **Step 2: Capture the pact chamber for a sanity check**

With the dev server running, screenshot the chamber via the existing peek script (the 3D canvas renders under SwiftShader even though reveal-animated HTML may be black):

```bash
node scripts/peek.mjs /tmp/peek pact
```

Then `Read` `/tmp/peek/pact.png`. Expect to see the lit chamber / sigils / rune ring (not a fully black frame). If black, note it may be rAF starvation rather than a real bug — defer to the live-browser check.

- [ ] **Step 3: User visual confirmation (required)**

Ask the user to run `npm run dev` and scroll Chapter VI in a real browser to confirm: (a) deck flies in and ingests, (b) core reads + score counts to 82, (c) founder/investor sigils bind with the cord + cards, (d) camera frames the chamber and hands off smoothly to The Tracker, (e) chapters V–IX read correctly on the rail. Adjust `STATION`, camera `pos`/`look`, and beat thresholds based on their feedback.

- [ ] **Step 4: Final commit (if adjustments were made)**

```bash
git add -A
git commit -m "polish(pact): tune chamber framing & beats from live review"
```

---

## Self-Review

**Spec coverage:**
- Chapter VI "The Pact", `Nodus Pactum`, between Grimoire and Tracker → Tasks 7, 8 ✓
- Renumber Tracker→VII, Chronicles→VIII, Owl Post→IX → Task 8 ✓
- Beat 1 ingest → Task 2 ✓; Beat 2 analysis + single score → Task 3 ✓; Beat 3 pact + kanban-nod cards → Task 4 ✓
- One shared Canvas, scrollState-driven, no new GLB → Tasks 2–5 ✓
- Abstract founder/investor sigils → Task 4 ✓
- HTML overlay copy + legend with tags (LLM deck analysis · Embeddings + matching · FastAPI · React · Kanban) → Tasks 6, 7 ✓
- Scrim text-left/3D-right → Task 7 CSS ✓
- App.tsx / chapters.ts / CameraRig.tsx / Scene.tsx wiring → Tasks 5, 7, 8 ✓
- Scroll/camera recalibration (the flagged risk) → Task 9 ✓
- ScrollRail updates automatically (reads chapters.ts) — verified, no extra task needed ✓
- Verification via build/test/textContent + user browser check (per memory) → Tasks 7, 10 ✓

**Placeholder scan:** No "TBD"/"implement later". The only deferred values are the provisional scroll fractions, which are explicitly computed and replaced in Task 9 with a concrete measurement procedure — not placeholders.

**Type consistency:** `localProgress`, `ingestProgress`, `analysisProgress`, `pactProgress`, `scoreValue`, `STATION`, `SECTION_START/END`, `INGEST_END`, `LEGILIMENCY_END`, `SCORE_TARGET` defined in Task 1 and consumed identically in Tasks 2–5/9. `pactSteps`/`PactStep` defined in Task 6, consumed in Task 7. `Pact` exported in Task 7, imported in Task 7 App.tsx wiring. Component names `DeckIngest`/`AnalysisCore`/`ThePact`/`PactStation` consistent across Tasks 2–5.
