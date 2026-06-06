# The Marauder's Map — Edge-AI Attendance Chapter

**Date:** 2026-06-06
**Status:** Approved design, pending implementation
**Type:** New 3D scene chapter (portfolio)

## Summary

Add a new immersive 3D chapter to Moeez's portfolio — **Chapter VII, "The Marauder's Map"** — that showcases an **edge-AI attendance / movement-detection capability**: an AIBox-1688-class device running a *local, on-device* model that detects a moving person, tracks their movement, and resolves their identity. It is built as a self-contained 3D scene module mirroring the existing `scene/tracker/` and `scene/spell/` modules: the camera travels through world space to a glowing parchment "map" where footsteps appear, a detection reticle locks onto a moving presence, and name-tags resolve — all framed as the map's own *local* magic.

### Creative framing

The **Marauder's Map** metaphor: in canon, a magical parchment that detects people moving through the castle and labels each by name — almost exactly an attendance/movement-tracking system. The AIBox doing **local on-device inference (no cloud)** maps onto "the magic happens within the parchment itself."

### Hard constraints (from brainstorming)

1. **No product names.** Moeez does not own this project (only Query Sphere). Copy sells the *capability* (edge NPU, on-device detection + re-identification, motion-triggered capture, privacy — nothing leaves the device), never a named product. All on-map names/data are themed and **generic**, not real attendance data.
2. **Capability over duplication.** This is the same system as the Grimoire's existing "Project Horus" card. The new chapter becomes its real home; the Grimoire card is **de-named** to a generic CV one-liner (separate small edit).
3. **Edge emphasis is the new angle.** The existing Horus card already lists YOLO/SCRFD/ArcFace/FAISS. The chapter's *fresh* contribution is the **on-device / edge NPU / real-time-on-constrained-hardware / fully-local** story.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Format | Full dedicated 3D scene chapter (not a Grimoire card, not folded into an existing chapter) |
| Interaction | Incantation toggle button: "I solemnly swear that I am up to no good" ↔ "Mischief managed", writing an out-of-React singleton (same pattern as Conjuring's Cast button) |
| Moving "person" rendering | **Authentic Marauder's-Map style** — footprint trail + detection reticle + resolving name-tag. **No 3D body / no GLB** (lighter, faster, truer to metaphor) |
| Existing Grimoire "Project Horus" card | **De-name** to a generic CV capability card (keep it, strip the product name) |
| World placement | `STATION = [22, 0, 0]` — right of the Tracker at `[12]`, so the camera keeps travelling outward before returning for the closing chapters |
| Chapter position | New Chapter VII, inserted after Tracker (VI). Chronicles → VIII, Owl Post → IX |

## Architecture

Follows the established two-layer pattern: a fixed WebGL canvas (`scene/`) the camera moves through, and scrollable HTML chapters (`components/`) on top. The new chapter adds one self-contained scene module plus one HTML section, wired through the same five coupling points every chapter touches.

### New scene module: `src/scene/map/`

Mirrors `src/scene/tracker/` in structure and conventions (visibility-gated station group, local light rig, out-of-React state read in `useFrame`, cloned/disposed resources, `dispose={null}`).

#### `map.ts` — pure logic + data (unit-tested, like `spell.ts`)

- `STATION: [number, number, number] = [22, 0, 0]` — world placement.
- `SECTION_START`, `SECTION_END` — scroll fractions of the pinned `#map` section, **calibrated from measured DOM offsets** during implementation (placeholder values to start, like the other modules' comments note).
- `localProgress(progress)` — global scroll → 0→1 within the section (clamped), same shape as `tracker/phases.ts`.
- `revealState` — out-of-React singleton, a clone of `spellState`: `{ requested, active, startedAt, progress, sworn }`. The HTML button sets `requested` (swear) / clears `active` (mischief managed); `MapStation` consumes it in `useFrame`. **Never lift into React state.**
- `revealProgress(now, start, duration)` — clamped 0→1 ramp (mirror `castProgress`).
- `walkerPosition(t): [x, y, z]` — parametric patrol path across the map plane (e.g. a corridor route); `t` in 0→1.
- `detectionAt(p): { confidence, boxScale, locked }` — confidence climbs with `p`, box tightens (`boxScale` loose→tight), `locked` true past a threshold.
- `PASSERSBY: { name, at, footprints }[]` — a small list (4–5) of themed **generic** names placed on the map that resolve on reveal. No real/owned data.
- `EDGE_STACK: string[]` and/or `PIPELINE_BEATS: string[]` — strings for the HTML legend (e.g. beats: Motion → Detect → Track → Identify → Log; stack chips: "RV1688 NPU", "On-device detection", "Re-ID embeddings", "Vector match", "No cloud").

#### `MapStation.tsx` — the station group (mirrors `TrackerStation`/`SpellStation`)

- Visibility gate: `group.visible = lp > 0.001 && lp < 0.999`.
- Local light rig (parchment-warm key + cool detection rim), `dispose={null}`.
- Consumes `revealState.requested` → stamps `startedAt`; drives `progress` each frame; reduced-motion → jump straight to lit (copy SpellStation's consume logic).
- Mounts the children below.

#### Child components (each one clear purpose, drei primitives reused)

- `MapTable.tsx` — horizontal aged-parchment plane with faint **gold corridor line-art** built from thin emissive line meshes (no texture fetch — honors the no-network convention). Decorative ring/frame border reusing the `ringGeometry` pattern.
- `Walker.tsx` — sequenced footprint decals appearing along `walkerPosition(t)` + a detection reticle/box that animates loose→tight as `detectionAt` locks. Idle patrol so it's alive on arrival; intensified by the reveal.
- `NameTag.tsx` — billboarded labels (drei `Text` + `Billboard`, like `HudText`) resolving from `· · ·` / "scanning" to a name on lock, anchored above each passer-by marker.
- `EdgeBox.tsx` — the AIBox-1688 device: a small glowing artifact with a pulsing NPU core and a **closed local inference loop** (walker → box → walker), visually the *opposite* of the Tracker's stream-to-cloud cube, to sell "on-device". A small "LOCAL · NO CLOUD" cue.
- `DetectionHud.tsx` — holographic readout (mirrors `HudText`/`InsightCards`): confidence %, "30 FPS · EDGE NPU", person count, "LOCAL · NO CLOUD", ticking bounding-box coords.

#### `map.test.ts` — unit tests (vitest, `npm test`)

- `revealProgress` clamps to [0,1] and is monotonic.
- `walkerPosition` endpoints sane (t=0 and t=1 within map bounds).
- `detectionAt`: confidence monotonic; `locked` flips at the threshold; `boxScale` tightens monotonically.
- `localProgress` clamps to [0,1].

### HTML section: new `Marauders()` in `src/components/Sections.tsx`

Pinned section (like `tracker--pinned` / `conjuring--pinned`) so it holds while the camera sits on the station:

- `<section id="map" className="section section--map map--pinned">`.
- Eyebrow: "Chapter VII — The Marauder's Map".
- Category: "✦ Project · live demo · on-device".
- `IgniteHeading` title (e.g. "It sees who passes").
- Lede: capability-focused, edge-emphasis — motion-triggered capture, on-device detection + re-identification on an edge NPU (AIBox-class RV1688), real-time, fully local; **no footage leaves the device**. No product name.
- **Incantation toggle button** — reuses `.cast-btn` styling; `onClick` writes `revealState` (swear → reveal; toggle label to "Mischief managed" → clear). Local `useState` drives only the label, like `Conjuring`.
- Legend: `PIPELINE_BEATS` / `EDGE_STACK` from `map.ts`, reusing `.conjuring__legend` markup/CSS.

### CSS: `src/components/sections.css`

Add `.section--map`, `.map--pinned`, `.map__stage`, `.map__lede` mirroring the `.tracker--pinned` / `.conjuring--pinned` rules. Reuse `.cast-btn` and `.conjuring__legend` (no new button/legend styling needed).

## The coupling (five sync points + de-name edit)

Adding a chapter changes total page height, which shifts **every** scroll fraction. All of the following must end consistent, calibrated from a single puppeteer measurement pass:

1. **`App.tsx`** — import and render `<Marauders/>` immediately after `<Tracker/>`.
2. **`scene/Scene.tsx`** — import and mount `<MapStation/>` alongside `<TrackerStation/>`.
3. **`scene/CameraRig.tsx`** — insert map entry + held `KEYS` at world x≈22 (a `pos`/`look` pair like the tracker's two keyframes); **recalibrate every downstream `at` fraction** from measured offsets.
4. **`chapters.ts`** — insert `{ id:'map', numeral:'VII', theme:"The Marauder's Map", plain:'edge AI · on-device demo', at:<measured> }`; renumber Chronicles → VIII, Owl Post → IX; recalibrate all `at`. `ScrollRail` reads `chapters.ts`, so it follows automatically.
5. **`scene/map/map.ts`** — set `SECTION_START`/`SECTION_END` from measured DOM offsets; **re-verify** `tracker/phases.ts` and `spell/spell.ts` fractions, since total height changed.

Plus: update the eyebrow numerals inside `Sections.tsx` for `Chronicles` (VII → VIII) and `OwlPost` (VIII → IX).

### Separate small edit: de-name the Grimoire card (`src/data.ts`)

First `projects[]` entry: drop the "Project Horus" product name → a generic capability **title** (e.g. "Real-Time Vision · Attendance"), keep a playful `incantation` (e.g. "Oculus Reparo"), generic edge-CV `blurb`, existing `tags`. Stays a terse one-liner so it does not compete with the immersive chapter.

## Data flow

1. Scroll → `scrollState.progress` (existing singleton) → `localProgress()` gates `MapStation` visibility and drives ambient patrol/detection.
2. Incantation button click → `revealState.requested = true` (+ label `useState`) → `MapStation` consumes in `useFrame`, stamps `startedAt`, ramps `revealState.progress` 0→1 → footprints/name-tags/HUD intensify and lock. "Mischief managed" clears `active`.
3. `useFrame` reads `revealProgress`/`detectionAt`/`walkerPosition` to position footprints, tighten the reticle, resolve `NameTag` text, and pulse the `EdgeBox` local loop. **No React re-renders from scroll or animation.**

## Error handling / edge cases

- **Reduced motion:** reveal jumps straight to fully-lit (no ramp), matching `SpellStation`.
- **Visibility gate** prevents the station rendering/animating outside its scroll window (same as tracker/spell).
- **Resource hygiene:** any cloned geometry/material disposed on unmount; `dispose={null}` on the group (follow `TrackerStation`).
- **Calibration drift:** if section offsets are mis-measured the camera frames the wrong spot — mitigated by the single measurement pass covering *all* fractions at once.

## Testing & verification

- `npm test` (vitest) — `map.ts` unit tests pass.
- `npm run build` (`tsc -b && vite build`) — the correctness gate; must pass clean.
- **Puppeteer** (system Chrome `/usr/bin/google-chrome-stable`, `--use-gl=angle --use-angle=swiftshader`): measure every section's DOM offset after adding `#map`, recalibrate fractions, and confirm the station renders at the map scroll position. Per the known headless gotcha, **audit `textContent`** for the HTML reveals (rAF is starved under SwiftShader, so reveal-animated HTML can screenshot black) rather than relying on pixels for the HTML layer. The `glBlitFramebuffer` WebGL warning under SwiftShader is harmless.

## Scope guardrails (YAGNI)

- No GLB for the walker; no webcam; no real attendance data — a stylized demo.
- Reuse `ringGeometry`, drei `Text`/`Billboard`, `Sparkles`, the button→singleton pattern, and existing pinned-section / `.cast-btn` / `.conjuring__legend` CSS.
- Keep all names/data generic and themed; nothing tied to an owned product.

## Out of scope

- Per-project detail pages, sound, streaming chat, RAG showcase (tracked separately as "next ideas").
- Any real-time/live camera or model inference in the browser.
</content>
</invoke>
