# Design — The Tracker chapter (cricketer heartbeat-tracking AI, in 3D)

**Date:** 2026-06-04
**Status:** Approved design, pre-implementation
**Stack:** React + three.js / @react-three/fiber + @react-three/drei (existing portfolio)

## 1. Purpose

Add a new scroll-driven 3D chapter to the existing wizard-themed portfolio that
showcases a heartbeat/activity tracking AI app the author built — **told entirely
through 3D design, with no on-screen product name**.

The narrative, in four beats:

1. **Playing** — a cricketer is active on a scan platform.
2. **Heartbeat spikes** — exertion drives his heart rate up; the watch on his wrist
   reads it. *This is the hero element.*
3. **Tracked & saved** — the watch's data (HR, motion, calories) streams into a
   glowing data store.
4. **AI answers** — an AI core ingests the saved data and surfaces an insight
   ("Peak exertion detected — recovery ~4 min").

The cricketer is the **tracked subject**, not the AI.

## 2. Constraints discovered from the asset

`public/models/cricket_improved.glb`:

- Single **static, rig-less** mesh (Tripo-generated, Draco-compressed, ~3.8 MB).
- **No animations.**
- **No separate "watch" node** — the watch is fused into the one mesh, so it cannot
  be isolated, lit, or moved on its own.
- Single material (baseColor / normal / metallicRoughness textures).
- Bounding box ≈ 0.67 units tall, roughly centered on the origin.

**Implication:** the cricketer is a static hero figure. All sense of motion,
heartbeat, and tracking is conveyed by **holographic 3D FX placed around the
figure** — never by animating his body or by lighting the watch mesh. Heartbeat/
scan FX anchor to a **tunable `WRIST_ANCHOR` constant** (mirrors the wizard's
`WAND_TIP` pattern in `WizardModel.tsx`).

## 3. Aesthetic

A deliberate **tech shift** out of the candlelit hall: a cool, dark holographic
"scanner station." Cyan/teal HUD glow for tracking, red for the heartbeat, soft
green for the AI core/answer. The existing **Bloom** post chain makes all emissive
FX glow — no new post-processing needed. The dark ink background and fog already in
`Scene.tsx` carry over and suit the tech register.

## 4. Architecture

Honors the site's core trick: **one WebGL canvas the camera flies through; the
scene never re-mounts** (see `frontend/CLAUDE.md`).

- The tracker scene is a **self-contained group at a new world anchor** (offset from
  the wizard, e.g. to one side / below), mounted once inside `Scene.tsx`'s
  `<Suspense>`.
- The **camera travels to it** via new `CameraRig` keyframes (placed after the
  Grimoire keyframe). Candlelight is physically elsewhere, so it naturally falls
  off; the tracker group **carries its own cool cyan light rig** so it reads as tech
  without disturbing the hall.
- All animation is driven by the existing **`scrollState` singleton** read inside
  `useFrame` (no React re-renders), exactly like `RuneCircle` and the pinned Spells.

### Component breakdown (`src/scene/tracker/`)

Each unit is small, single-purpose, and receives a 0–1 phase value — no unit reads
another's internals.

| File | Responsibility | Depends on |
|------|----------------|------------|
| `TrackerStation.tsx` | Top group. Loads + places the cricket GLB (static, slow idle bob like the wizard). Owns the local cyan light rig + scan platform. Computes **local beat progress** from `scrollState.progress` over `[SECTION_START, SECTION_END]`, splits into 4 phase windows, passes each child its 0–1 value. | `scrollState`, `useGLTF` |
| `Heartbeat.tsx` | **Hero.** Live ECG ribbon (a drei `<Line>` / tube whose points scroll) + large BPM `<Text>` climbing 72→158, red emissive, glow pulsing in sync. Anchored at `WRIST_ANCHOR`. | phase 2–3 value |
| `ScanRings.tsx` | Concentric rings pulsing outward from the figure/watch. | phase 2–3 value |
| `DataStream.tsx` | Particles flowing wrist → `DataStore` node; the store fills as data arrives. | phase 3 value |
| `AICore.tsx` | Pulsing icosahedron that brightens as it ingests the saved data. | phase 4 value |
| `HudText.tsx` | Holographic readouts via drei `<Text>` (troika — blooms in-world): stat lines + final AI answer line. | phase values |

drei `<Text>` (not `<Html>`) is used for readouts so they live in 3D space, receive
Bloom, and respect occlusion/fog — consistent with one rendered world.

## 5. Data flow (scroll → beats)

- The HTML chapter is a **tall pinned section**, same mechanism as Spells
  (`spells--pinned` + `useScroll({ target: ref })`). The pinned height gives the
  scroll runway for the 4 beats.
- `TrackerStation` defines `SECTION_START`/`SECTION_END` scroll fractions, normalizes
  `scrollState.progress` to a local `t` ∈ [0,1], and derives four overlapping phase
  windows (e.g. 0–0.30 play, 0.20–0.55 heartbeat, 0.45–0.80 save, 0.70–1.0 answer).
  Each FX eases in/out across its window.
- Because beats resolve by **scroll position**, the sequence is inherently
  reduced-motion friendly (no autonomous fast motion); it also honors the existing
  `MotionConfig reducedMotion="user"`.

## 6. Placement & the three coupled places

Inserted **after Grimoire**. New chapter order:

`I top · II wizard · III spells · IV grimoire · V tracker · VI chronicles · VII owlpost`

Three places that share chapter ordering must be updated together (per CLAUDE.md):

1. **`src/components/Sections.tsx`** — new `Tracker` section component with
   `id="tracker"`, pinned, eyebrow "Chapter V — The Tracker" + title + short copy
   that scrolls past while the camera holds on the station. Renumber Chronicles → VI,
   Owl-post → VII.
2. **`src/scene/CameraRig.tsx`** — insert keyframe(s) for the station after the
   grimoire keyframe; re-time downstream `at` fractions. Keep `SECTION_START/END` in
   `TrackerStation` in sync with these `at` values.
3. **`src/components/ScrollRail.tsx`** — insert `{ id: 'tracker', label: 'V' }` and
   relabel the following marks.

`App.tsx` renders `<Tracker />` between `<Grimoire />` and `<Chronicles />`.

### Files touched / added

- **New:** `src/scene/tracker/TrackerStation.tsx`, `Heartbeat.tsx`, `ScanRings.tsx`,
  `DataStream.tsx`, `AICore.tsx`, `HudText.tsx`.
- **New:** CSS for the tracker section (sibling `.css`, imported by the section), or
  an addition to `sections.css` following the pinned-Spells styles.
- **Edit:** `Scene.tsx` (mount `<TrackerStation />`, `useGLTF.preload` the cricket
  GLB), `CameraRig.tsx`, `Sections.tsx`, `ScrollRail.tsx`, `App.tsx`.
- Copy may live inline in the section (it's a single chapter; `data.ts` not required).

## 7. Copy (draft, author to refine)

- Eyebrow: **Chapter V — The Tracker**
- Title: **"It reads the pulse"** (or author's choice; no product name)
- Beat micro-labels (HUD, optional): `LIVE` · `♥ RISING` · `SAVING` · `INSIGHT`
- AI answer line: *"Peak exertion detected — recovery ~4 min."*

## 8. Performance

- One extra ~3.8 MB Draco GLB; `useGLTF.preload` it alongside the wizard. The model
  loads behind the existing preloader.
- Reuse adaptive `dpr` (`PerformanceMonitor` + `AdaptiveDpr`) already in `Scene.tsx`.
- Keep particle counts modest (data stream ≲ a few hundred points; instanced).
- Clone GLB materials on mount (HMR safety), same as `WizardModel`.

## 9. Verification

- `npm run build` — the `tsc -b` typecheck is the project's only correctness gate.
- Puppeteer screenshot harness (existing) — capture the station at ~4 scroll
  positions spanning `[SECTION_START, SECTION_END]` to confirm each beat renders
  (system Chrome, `--use-gl=angle --use-angle=swiftshader`).

## 10. Out of scope (YAGNI)

- No real-time/interactive AI, no live data, no backend (site is pure front end).
- No skeletal animation or watch-mesh isolation (asset doesn't support it).
- No new post-processing passes.
