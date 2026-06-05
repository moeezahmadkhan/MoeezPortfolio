# Design — Tracker chapter: richer watch tracking (orbiting tiles, more metrics, AI insight cards)

**Date:** 2026-06-05
**Status:** Approved design, pre-implementation
**Stack:** React + three.js / @react-three/fiber + @react-three/drei (existing portfolio)
**Builds on:** `docs/superpowers/specs/2026-06-04-tracker-chapter-design.md`

## 1. Purpose

Enrich the existing **Tracker chapter** (cricketer heartbeat-tracking AI) so the
"watch tracking" beat reads as a real wearable surfacing many signals, and the AI
beat reads as genuine analysis rather than one static line. No new product name,
no backend — pure in-scene 3D FX, consistent with the rest of the site.

Three additions, confirmed with the author:

1. **Richer watch readout** — holographic metric **tiles orbiting the wrist**.
2. **More tracked data types** — HR, calories, steps, SpO2, plus derived
   recovery/sleep guidance flowing into the saved data.
3. **Smarter AI insights** — **scroll-driven cycling insight cards** replacing the
   single answer line.

## 2. Constraints (unchanged from base chapter)

- The cricket GLB (`public/models/cricket_improved.glb`) is a single static,
  rig-less mesh; the watch is fused into it and **cannot be moved or lit**. All
  watch UI is holographic FX anchored to the `WRIST_ANCHOR` constant.
- Animation is driven only by the `scrollState` singleton read inside `useFrame`
  (no React re-renders), exactly like the existing tracker components.
- The existing **Bloom** post chain makes all emissive FX glow; no new
  post-processing.
- drei `<Text>` (troika) is used for all readouts so they live in 3D space, receive
  Bloom, and respect fog/occlusion.

## 3. Beat timing (unchanged)

Local progress `lp` ∈ [0,1] spans `[SECTION_START, SECTION_END]` in `phases.ts`.
The four overlapping beats stay as today:

| Beat | Window (`lp`) | What's live |
|------|---------------|-------------|
| Play | 0.0 – 0.30 | figure idles on platform |
| Live / heartbeat | 0.15 – 0.45 | ECG + BPM + **orbiting tiles** climb |
| Save | 0.45 – 0.70 | data streams to store; **rich saved readout** |
| AI answer | 0.70 – 1.00 | core brightens; **cycling insight cards** |

## 4. One source of truth for the numbers — `metricsAt(lp)`

Add a pure function to `src/scene/tracker/phases.ts` so every readout agrees on the
same values (the ECG number, the orbiting tiles, the saved block, and the AI cards
must never disagree):

```ts
export interface Metrics {
  bpm: number      // 72 → 158
  cal: number      // 0 → 310 (active calories)
  steps: number    // 0 → 2400
  spo2: number     // 98 → 96 (dips slightly under exertion)
  zone: number     // 1 → 3 (HR zone, derived from bpm)
  recoveryMin: number // ~4 (derived, surfaces in save/answer)
  sleepDebtH: number  // ~1.2 (derived guidance, answer beat)
}
export function metricsAt(lp: number): Metrics
```

- HR / cal / steps / SpO2 interpolate against the **live ramp** `ramp(lp, 0.15, 0.4)`
  (same ramp `Heartbeat` already uses), so they climb in lockstep with the ECG.
- `zone`, `recoveryMin`, `sleepDebtH` are **derived constants/formulas** — a watch
  doesn't measure sleep mid-match, so these are reported as guidance and only
  appear in the save/answer beats, not as live-climbing tiles.

`Heartbeat.tsx` is refactored to read `metricsAt(lp).bpm` instead of computing bpm
inline, removing the duplicated formula.

## 5. Component breakdown

### B. `WristTiles.tsx` (new) — orbiting metric tiles

Four billboarded chips arcing around `WRIST_ANCHOR`, each = a thin rounded backing
plane + a drei `<Text>`:

- **♥ 158** (red `#ff4d5e`) — leads the arc
- **310 cal**, **2.4k steps**, **SpO2 96%** (cyan/teal `#8fe9ff` / `#7cffb0`)

Behaviour:

- Chips sit at radius ≈ 0.55 around `WRIST_ANCHOR`, fanned over an arc, **slowly
  orbiting** (gentle, clock-driven). Each child wrapped in drei `<Billboard>` so it
  always faces the camera and stays legible.
- Group opacity/scale fades in on the live beat (`ramp(lp, 0.18, 0.4)`) and **fades
  out as the AI beat begins** (`1 - ramp(lp, 0.62, 0.78)`) so it never clutters the
  answer. Net visibility ≈ live + save beats.
- Values come from `metricsAt(lp)`. Text `.sync()` is called **only when the
  integer changes** (the perf pattern already in `Heartbeat.tsx`), tracked via a
  `lastValues` ref — never sync every frame.
- Geometry/materials created in `useMemo`, disposed on unmount (matches existing
  tracker components).

### C. `HudText.tsx` (edit) — richer saved readout, drop static answer line

- The saved stat block over the data store grows to all tracked types, e.g.:
  `♥ 158 · 2.4k steps · 310 cal · SpO2 96% · recovery 4 min · ▮▮▮▮ saved`,
  with values pulled from `metricsAt(lp)` (synced on integer change).
- The single static AI **answer** `<group>` is **removed** from `HudText` — that
  job moves to `InsightCards`. `HudText` keeps only the saved-data readout.

### D. `InsightCards.tsx` (new) — scroll-driven cycling AI insights

Across the answer beat (`lp` 0.70 → 1.00), 2–3 holographic cards fade in/out near
`AICORE_POS`, **selected by scroll position** (no autonomous timers):

1. `Peak HR 158 · Zone 3`
2. `Recovery ~4 min`
3. `Sleep debt 1.2h → prioritize rest`

- The answer window is split into N equal sub-ranges; a card's opacity is a `pulse`
  (fade-in/out) centred on its sub-range, so scrolling reveals them in sequence and
  scrolling back reverses — inherently reduced-motion friendly.
- Each card = backing plane + drei `<Text>`, billboarded, soft green `#bfffe0`.
- Card text from `metricsAt(lp)` where applicable (HR/zone), constants for
  recovery/sleep guidance. Sync on change only.

### `TrackerStation.tsx` (edit)

Mount `<WristTiles />` and `<InsightCards />` alongside the existing children. No
other structural change.

## 6. Files touched / added

- **New:** `src/scene/tracker/WristTiles.tsx`, `src/scene/tracker/InsightCards.tsx`
- **Edit:** `src/scene/tracker/phases.ts` (add `Metrics` + `metricsAt`),
  `Heartbeat.tsx` (use `metricsAt().bpm`), `HudText.tsx` (richer saved block, drop
  answer line), `TrackerStation.tsx` (mount the two new components)
- No CSS changes (all 3D), no `App.tsx` / `CameraRig` / `ScrollRail` /
  `Sections.tsx` changes (chapter structure unchanged).

## 7. Performance

- ~3 extra billboarded `<Text>` chips (tiles) + ~3 cards. Reuse the
  sync-on-integer-change guard so troika re-layout happens only on value change.
- No new GLBs, lights, or post passes. Particle counts unchanged.
- Create geometry/materials in `useMemo`; dispose on unmount.

## 8. Verification

- `npm run build` — the `tsc -b` typecheck is the project's only correctness gate.
- Puppeteer screenshot harness — capture ~4 scroll positions across
  `[SECTION_START, SECTION_END]` to confirm: tiles fade in on the live beat, rich
  saved block on the save beat, and the cards cycle across the answer beat (system
  Chrome, `--use-gl=angle --use-angle=swiftshader`; the `glBlitFramebuffer` warning
  under SwiftShader is harmless).

## 9. Out of scope (YAGNI)

- No per-metric colored particle streams (keep the single data stream).
- No watch-mesh isolation or skeletal animation (asset can't support it).
- No new post-processing passes, no backend, no real AI.
- No changes to chapter ordering or the three coupled places (Sections / CameraRig
  / ScrollRail).
