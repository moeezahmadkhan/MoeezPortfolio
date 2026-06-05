# Tracker Watch Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Tracker chapter's watch-tracking beat with orbiting metric tiles, more tracked data types, and scroll-driven AI insight cards.

**Architecture:** All work stays inside the existing tracker scene group (`src/scene/tracker/`). A single pure `metricsAt(lp)` function in `phases.ts` becomes the source of truth for every readout. Two new components (`WristTiles`, `InsightCards`) are mounted in `TrackerStation`; `Heartbeat` and `HudText` are refactored to read from `metricsAt`. Everything is driven by the `scrollState` singleton inside `useFrame` — no React re-renders, no new deps, no post-processing changes.

**Tech Stack:** React + TypeScript, @react-three/fiber, @react-three/drei (`Text`, `Billboard`), three.js. Spec: `docs/superpowers/specs/2026-06-05-tracker-watch-detail-design.md`.

---

## Notes for the implementer

- **There is no unit-test runner in this repo.** Per `frontend/CLAUDE.md`, the only correctness gate is the TypeScript build. The fast per-task check is `npx tsc -b` (typecheck, no bundle); the full gate is `npm run build`. Run all commands from `frontend/`.
- **Visual verification** uses the existing puppeteer harness `scripts/shoot.cjs` (system Chrome + SwiftShader). The `glBlitFramebuffer` WebGL warning under SwiftShader is harmless.
- **Ref callbacks use block bodies** (`ref={(el) => { arr.current[i] = el }}`) — an arrow that *returns* the assignment trips React's ref-cleanup typing.
- **troika `<Text>` perf rule:** never reassign `.text` + call `.sync()` every frame. Only do it when the rendered string actually changes, tracked via a `last` ref. This pattern already exists in `Heartbeat.tsx`.
- Coordinates in these components are **local to the station group** (mounted inside `<group position={STATION}>` in `TrackerStation`), so `WRIST_ANCHOR` / `AICORE_POS` / `DATASTORE_POS` are used directly.

---

## File Structure

- **Create** `src/scene/tracker/WristTiles.tsx` — orbiting metric chips around the wrist.
- **Create** `src/scene/tracker/InsightCards.tsx` — scroll-cycled AI insight cards near the core.
- **Modify** `src/scene/tracker/phases.ts` — add `Metrics` interface + `metricsAt(lp)`.
- **Modify** `src/scene/tracker/Heartbeat.tsx` — read bpm from `metricsAt`.
- **Modify** `src/scene/tracker/HudText.tsx` — richer saved readout; remove the static answer line.
- **Modify** `src/scene/tracker/TrackerStation.tsx` — mount the two new components.

---

## Task 1: Add `metricsAt` source-of-truth to `phases.ts`

**Files:**
- Modify: `src/scene/tracker/phases.ts` (append after the existing `pulse` function)

- [ ] **Step 1: Add the `Metrics` interface and `metricsAt` function**

Append to the end of `src/scene/tracker/phases.ts`:

```ts
/** All tracked watch values at a given local progress — single source of truth. */
export interface Metrics {
  bpm: number          // 72 → 158
  cal: number          // 0 → 310 active calories
  steps: number        // 0 → 2400
  spo2: number         // 98 → 96 (dips under exertion)
  zone: number         // HR zone 1 → 3, derived from bpm
  recoveryMin: number  // recovery guidance, surfaces in save/answer beats
  sleepDebtH: number   // sleep guidance, answer beat
}

/**
 * Maps local progress to every watch metric. HR/cal/steps/SpO2 climb with the
 * live ramp (same window Heartbeat uses); zone/recovery/sleep are derived
 * guidance that only reads meaningfully once data is collected.
 */
export function metricsAt(lp: number): Metrics {
  const live = ramp(lp, 0.15, 0.4)
  const bpm = Math.round(72 + live * (158 - 72))
  return {
    bpm,
    cal: Math.round(live * 310),
    steps: Math.round(live * 2400),
    spo2: Math.round(98 - live * 2),
    zone: bpm < 100 ? 1 : bpm < 140 ? 2 : 3,
    recoveryMin: 4,
    sleepDebtH: 1.2,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors (exit 0).

- [ ] **Step 3: Commit**

```bash
git add src/scene/tracker/phases.ts
git commit -m "feat(tracker): metricsAt — single source of truth for watch metrics"
```

---

## Task 2: Refactor `Heartbeat` to read bpm from `metricsAt`

**Files:**
- Modify: `src/scene/tracker/Heartbeat.tsx:6` (import) and `:44-45` (bpm computation)

- [ ] **Step 1: Add `metricsAt` to the phases import**

Change line 6 from:

```ts
import { WRIST_ANCHOR, localProgress, ramp } from './phases'
```

to:

```ts
import { WRIST_ANCHOR, localProgress, ramp, metricsAt } from './phases'
```

- [ ] **Step 2: Use `metricsAt().bpm` instead of the inline formula**

In the `useFrame` callback, change:

```ts
    const intensity = ramp(lp, 0.15, 0.4)            // heartbeat ramps in
    const bpm = Math.round(72 + intensity * (158 - 72))
```

to:

```ts
    const intensity = ramp(lp, 0.15, 0.4)            // heartbeat ramps in
    const bpm = metricsAt(lp).bpm
```

(`intensity` is still used below for trace amplitude/speed and the beat-marker pulse — leave the rest of the function unchanged.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/tracker/Heartbeat.tsx
git commit -m "refactor(tracker): Heartbeat reads bpm from metricsAt"
```

---

## Task 3: Create `WristTiles` and mount it

**Files:**
- Create: `src/scene/tracker/WristTiles.tsx`
- Modify: `src/scene/tracker/TrackerStation.tsx` (import + mount)

- [ ] **Step 1: Write `WristTiles.tsx`**

Create `src/scene/tracker/WristTiles.tsx` with exactly:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { WRIST_ANCHOR, localProgress, ramp, metricsAt, type Metrics } from './phases'

interface Tile {
  key: string
  color: string
  angle: number // base angle around the wrist (radians)
  format: (m: Metrics) => string
}

const TILES: Tile[] = [
  { key: 'bpm', color: '#ff4d5e', angle: Math.PI * 0.5, format: (m) => `♥ ${m.bpm}` },
  { key: 'cal', color: '#8fe9ff', angle: Math.PI * 0.85, format: (m) => `${m.cal} cal` },
  { key: 'steps', color: '#7cffb0', angle: Math.PI * 1.2, format: (m) => `${(m.steps / 1000).toFixed(1)}k` },
  { key: 'spo2', color: '#8fe9ff', angle: Math.PI * 1.55, format: (m) => `SpO2 ${m.spo2}%` },
]

const RADIUS = 0.6
const ANCHOR = new THREE.Vector3(...WRIST_ANCHOR)
const M0 = metricsAt(0)

export function WristTiles() {
  const root = useRef<THREE.Group>(null)
  const tiles = useRef<(THREE.Group | null)[]>([])
  const texts = useRef<any[]>([])
  const last = useRef<string[]>([])

  useFrame((state) => {
    const lp = localProgress(scrollState.progress)
    // visible across the live + save beats, gone by the AI answer beat
    const vis = ramp(lp, 0.18, 0.4) * (1 - ramp(lp, 0.62, 0.78))
    if (root.current) {
      root.current.visible = vis > 0.02
      root.current.scale.setScalar(0.7 + vis * 0.3)
    }
    if (vis <= 0.02) return

    const m = metricsAt(lp)
    const t = state.clock.elapsedTime
    TILES.forEach((tile, i) => {
      const g = tiles.current[i]
      if (g) {
        const a = tile.angle + t * 0.15 // slow orbit
        g.position.set(
          ANCHOR.x + Math.cos(a) * RADIUS,
          ANCHOR.y + Math.sin(a) * RADIUS * 0.6 + 0.15,
          ANCHOR.z,
        )
      }
      const txt = texts.current[i]
      if (txt) {
        const str = tile.format(m)
        if (last.current[i] !== str) {
          last.current[i] = str
          txt.text = str
          txt.sync?.()
        }
      }
    })
  })

  return (
    <group ref={root} visible={false}>
      {TILES.map((tile, i) => (
        <group
          key={tile.key}
          ref={(el) => {
            tiles.current[i] = el
          }}
        >
          <Billboard>
            <mesh>
              <planeGeometry args={[0.42, 0.16]} />
              <meshBasicMaterial color="#06222b" transparent opacity={0.55} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0, -0.001]}>
              <planeGeometry args={[0.46, 0.2]} />
              <meshBasicMaterial
                color={tile.color}
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
            <Text
              ref={(el) => {
                texts.current[i] = el
              }}
              position={[0, 0, 0.01]}
              fontSize={0.09}
              color={tile.color}
              anchorX="center"
              anchorY="middle"
            >
              {tile.format(M0)}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Mount `WristTiles` in `TrackerStation`**

In `src/scene/tracker/TrackerStation.tsx`, add the import after the `Heartbeat` import (line 8):

```ts
import { WristTiles } from './WristTiles'
```

Then mount it right after the `<Heartbeat />` line (line 96), so it reads:

```tsx
      {/* hero ECG trace + climbing BPM at the wrist */}
      <Heartbeat />

      {/* orbiting watch metric tiles around the wrist */}
      <WristTiles />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/tracker/WristTiles.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat(tracker): WristTiles — orbiting watch metric chips at the wrist"
```

---

## Task 4: Enrich `HudText` saved readout and drop the static answer line

**Files:**
- Modify: `src/scene/tracker/HudText.tsx` (full rewrite of the file)

- [ ] **Step 1: Rewrite `HudText.tsx`**

Replace the entire contents of `src/scene/tracker/HudText.tsx` with:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { DATASTORE_POS, localProgress, ramp, metricsAt } from './phases'

export function HudText() {
  const stats = useRef<THREE.Group>(null)
  const statText = useRef<any>(null)
  const last = useRef('')

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const save = ramp(lp, 0.5, 0.7)
    if (stats.current) {
      stats.current.visible = save > 0.05
      stats.current.scale.setScalar(0.85 + save * 0.15)
    }
    if (statText.current) {
      const m = metricsAt(lp)
      const str =
        `♥ ${m.bpm}  ·  ${(m.steps / 1000).toFixed(1)}k steps\n` +
        `${m.cal} cal  ·  SpO2 ${m.spo2}%\n` +
        `recovery ${m.recoveryMin} min\n` +
        `▮▮▮▮ saved`
      if (last.current !== str) {
        last.current = str
        statText.current.text = str
        statText.current.sync?.()
      }
    }
  })

  return (
    <group
      ref={stats}
      position={[DATASTORE_POS[0], DATASTORE_POS[1] + 0.8, DATASTORE_POS[2]]}
      visible={false}
    >
      <Text
        ref={statText}
        fontSize={0.12}
        color="#7cffb0"
        anchorX="center"
        anchorY="middle"
        lineHeight={1.5}
        textAlign="center"
      >
        {'♥ 158  ·  2.4k steps\n310 cal  ·  SpO2 96%\nrecovery 4 min\n▮▮▮▮ saved'}
      </Text>
    </group>
  )
}
```

(The old `answer` `<group>` and the `AICORE_POS` import are intentionally gone — the AI answer is taken over by `InsightCards` in Task 5.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/scene/tracker/HudText.tsx
git commit -m "feat(tracker): richer saved readout; move AI answer out of HudText"
```

---

## Task 5: Create `InsightCards` and mount it

**Files:**
- Create: `src/scene/tracker/InsightCards.tsx`
- Modify: `src/scene/tracker/TrackerStation.tsx` (import + mount)

- [ ] **Step 1: Write `InsightCards.tsx`**

Create `src/scene/tracker/InsightCards.tsx` with exactly:

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../../scroll'
import { AICORE_POS, localProgress, pulse, metricsAt, type Metrics } from './phases'

const ANS_START = 0.7
const ANS_END = 1.0

interface Card {
  text: (m: Metrics) => string
}

const CARDS: Card[] = [
  { text: (m) => `Peak HR ${m.bpm} · Zone ${m.zone}` },
  { text: () => 'Recovery ~4 min' },
  { text: () => 'Sleep debt 1.2h → prioritize rest' },
]

const SPAN = (ANS_END - ANS_START) / CARDS.length
const M0 = metricsAt(0)

export function InsightCards() {
  const groups = useRef<(THREE.Group | null)[]>([])
  const texts = useRef<any[]>([])
  const last = useRef<string[]>([])

  useFrame(() => {
    const lp = localProgress(scrollState.progress)
    const m = metricsAt(lp)
    CARDS.forEach((card, i) => {
      const s = ANS_START + i * SPAN
      const o = pulse(lp, s, s + SPAN * 0.5, s + SPAN) // fade in/out across this card's sub-range
      const g = groups.current[i]
      if (g) {
        g.visible = o > 0.02
        g.scale.setScalar(0.9 + o * 0.1)
        g.position.y = AICORE_POS[1] - 0.9 + o * 0.12
      }
      const txt = texts.current[i]
      if (txt) {
        const str = card.text(m)
        if (last.current[i] !== str) {
          last.current[i] = str
          txt.text = str
          txt.sync?.()
        }
      }
    })
  })

  return (
    <group>
      {CARDS.map((card, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el
          }}
          position={[AICORE_POS[0], AICORE_POS[1] - 0.9, AICORE_POS[2]]}
          visible={false}
        >
          <Billboard>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[2.0, 0.4]} />
              <meshBasicMaterial color="#06251c" transparent opacity={0.5} depthWrite={false} />
            </mesh>
            <Text
              ref={(el) => {
                texts.current[i] = el
              }}
              fontSize={0.16}
              color="#bfffe0"
              anchorX="center"
              anchorY="middle"
              maxWidth={3.2}
              textAlign="center"
            >
              {card.text(M0)}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  )
}
```

- [ ] **Step 2: Mount `InsightCards` in `TrackerStation`**

In `src/scene/tracker/TrackerStation.tsx`, add the import after the `HudText` import (line 11):

```ts
import { InsightCards } from './InsightCards'
```

Then mount it right after the `<HudText />` line (line 105), so it reads:

```tsx
      {/* holographic HUD: saved stat readout */}
      <HudText />

      {/* scroll-cycled AI insight cards near the core */}
      <InsightCards />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/scene/tracker/InsightCards.tsx src/scene/tracker/TrackerStation.tsx
git commit -m "feat(tracker): InsightCards — scroll-cycled AI insights replace static line"
```

---

## Task 6: Full build + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Full production build (the project's correctness gate)**

Run: `npm run build`
Expected: `tsc -b` passes and `vite build` writes `dist/` with no errors.

- [ ] **Step 2: Start the dev server in the background**

Run: `npm run dev`
Expected: Vite prints `Local: http://localhost:5173/` (note the actual port if different).

- [ ] **Step 3: Screenshot the four beats across the tracker section**

The tracker spans global scroll `0.705 → 0.857` (`SECTION_START`/`SECTION_END`). These fractions land roughly on play / live / save / answer beats:

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/watch-detail 0.72,0.75,0.79,0.83,0.85`
Expected: prints `shot .shots/watch-detail/f0_72.png` … `f0_85.png` (5 files).

- [ ] **Step 4: Inspect the screenshots**

Open the PNGs in `.shots/watch-detail/` and confirm:
- `f0_75` (live beat): orbiting tiles (♥ bpm, cal, steps, SpO2) visible around the wrist, ECG + BPM still present.
- `f0_79` (save beat): tiles still up; the multi-line saved readout (`♥ … · steps`, `cal · SpO2`, `recovery`, `saved`) shows over the data store.
- `f0_83` / `f0_85` (answer beat): tiles have faded out; an AI insight card is visible near the glowing core; different fractions show different cards.

Note: under SwiftShader an empty/garbled frame can mean the scene hadn't settled — re-run Step 3 (the harness already waits 6s for the preloader). The `glBlitFramebuffer` warning is harmless.

- [ ] **Step 5: Reduced-motion sanity check (optional but quick)**

Run: `node scripts/shoot.cjs http://localhost:5173 .shots/watch-detail 0.75,0.79,0.85 --reduced`
Expected: `rm-` prefixed PNGs render the same beats (beats are scroll-driven, so reduced motion should look equivalent).

- [ ] **Step 6: Stop the dev server**

Stop the background `npm run dev` process.

- [ ] **Step 7: Commit any screenshots you want to keep (optional)**

`.shots/` is git-ignored by default; only commit if you intend to track them. No code commit is needed for this task.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §4 `metricsAt` → Task 1. §5 B `WristTiles` → Task 3. §5 C richer `HudText` → Task 4. §5 D `InsightCards` → Task 5. §5 `TrackerStation` mounts → Tasks 3 & 5. Heartbeat refactor (§4) → Task 2. §8 verification → Task 6. All covered.
- **Placeholder scan:** every code step contains complete code; no TBD/TODO; verification commands are exact.
- **Type consistency:** `Metrics` is defined in Task 1 and imported via `type Metrics` in Tasks 3 & 5; `metricsAt` signature `(lp: number) => Metrics` is used consistently; `pulse`/`ramp`/`localProgress` are existing exports in `phases.ts`. Property names (`bpm`, `cal`, `steps`, `spo2`, `zone`, `recoveryMin`, `sleepDebtH`) match across all consumers.
