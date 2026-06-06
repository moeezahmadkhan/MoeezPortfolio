# Chapter VI — "The Pact" (Founder ↔ Investor AI matchmaking)

**Date:** 2026-06-06
**Status:** Approved design, ready for implementation plan
**Type:** New scroll-pinned 3D chapter for the HP-themed portfolio

## Goal

Showcase a new project — an AI system where a founder uploads a pitch deck, an LLM
analyzes it and produces a score, founders and investors are matched by fit, and the
matched pair "binds the deal." Present it as a full dedicated scroll-pinned 3D chapter
(highest-impact treatment), modeled on the existing "The Conjuring" and "The Tracker"
chapters.

HP framing: **The Pact**, incantation **"Nodus Pactum"** — leaning on the matchmaking
("an unbreakable vow" binding founder and investor).

## Placement

Inserted **between Grimoire (V) and Tracker**. Renumbering:

| Numeral | Chapter | id |
|---------|---------|-----|
| V | The Grimoire (projects) | `grimoire` |
| **VI** | **The Pact (NEW)** | **`pact`** |
| VII | The Pulse / Tracker | `tracker` |
| VIII | The Path / Chronicles | `chronicles` |
| IX | Owl Post | `owlpost` |

## Architecture (mirrors `scene/spell/` + The Conjuring)

- **One shared `<Canvas>`** (already mounted in `Scene.tsx`) — no new canvas. A new
  world-space "station" group is added and rendered alongside the existing stations.
- **Driven by the global `scrollState` singleton** (`src/scroll.ts`) read inside
  `useFrame` — no React re-renders on scroll, consistent with the rest of the scene.
- **No new heavy GLB models.** Founder and investor are abstract luminous runic sigils
  (orbs/geometry + beams), keeping the chapter lightweight and consistent with the
  existing abstract visual language (orbs, beams, rune rings, Sparkles).

### 3D beats (local progress 0→1 over a 250vh pinned runway)

| Beat | Local range | 3D behavior |
|------|-------------|-------------|
| 1. Ingest | 0.00–0.33 | A glowing pitch-deck slab (stacked parchment pages) flies in and is drawn into the central core. |
| 2. Legilimency | 0.33–0.66 | The core "reads" the deck — scanning beams sweep, insight orbs extract outward, and a **single score number** resolves on a billboard label (e.g. "SCORE 82" with a bar). |
| 3. The Pact | 0.66–1.00 | Two sigils (founder ✦ / investor ✦) drift together over a glowing "world" portal ring; a binding light-cord forms between them (the handshake/deal). Faint activity cards trail upward as a light nod to the kanban "deal continues." |

## Files

### New
- `frontend/src/scene/pact/phases.ts` — `SECTION_START`, `SECTION_END`,
  `localProgress(progress)`, and beat threshold constants. Pattern from
  `scene/spell/spell.ts` and `scene/tracker/phases.ts`.
- `frontend/src/scene/pact/PactStation.tsx` — root `<group>` positioned in world space;
  lighting rig; floor rune ring; mounts the three beat sub-components; reads
  `scrollState.progress` → `localProgress()` and gates each beat. Pattern from
  `SpellStation.tsx` / `TrackerStation.tsx` (~90–120 lines).
- `frontend/src/scene/pact/DeckIngest.tsx` — beat 1 (deck slab fly-in + dissolve).
- `frontend/src/scene/pact/AnalysisCore.tsx` — beat 2 (core, scan beams, insight orbs,
  score billboard).
- `frontend/src/scene/pact/ThePact.tsx` — beat 3 (two sigils, portal ring, binding cord,
  trailing activity cards).

### Modified
- `frontend/src/components/Sections.tsx` — add `Pact()` component. Structure mirrors
  `Conjuring()`: `<section id="pact" className="section section--pact pact--pinned">` →
  `<div className="pact__stage">` with:
  - eyebrow: "Chapter VI — The Pact"
  - category: "✦ Project · AI founder–investor matchmaking"
  - `IgniteHeading` title: "The deck, read. The deal, bound."
  - short lede paragraph (deck → analysis → score → founder & investor bound)
  - a legend (`<ol>`) listing pipeline steps with tech tags
- `frontend/src/components/sections.css` — `.pact--pinned { height: 250vh; padding: 0; }`
  and `.pact__stage { position: sticky; top: 0; height: 100vh; ... }` plus a text-left /
  3D-right legibility scrim (`.pact__stage::before`), copied from `.conjuring__stage`.
  Reuse legend styles.
- `frontend/src/App.tsx` — import `Pact`, render `<Pact />` between `<Grimoire />` and
  `<Tracker />`.
- `frontend/src/chapters.ts` — insert `{ id: 'pact', numeral: 'VI', theme: 'The Pact',
  plain: 'AI matchmaking', at: <calibrated> }`; renumber Tracker→VII, Chronicles→VIII,
  Owl Post→IX; recompute all `at` fractions after the insertion point.
- `frontend/src/scene/CameraRig.tsx` — insert 2 keyframes (pact entry + held) into `KEYS`
  and shift the fractions of all subsequent keyframes.
- `frontend/src/scene/Scene.tsx` — render `<PactStation />` inside the `<Canvas>`.

## HTML overlay content

- **Eyebrow:** Chapter VI — The Pact
- **Category:** ✦ Project · AI founder–investor matchmaking
- **Title (IgniteHeading):** The deck, read. The deal, bound.
- **Lede:** A founder uploads a pitch deck. An LLM reads it, scores it, and surfaces it to
  the investors who actually fit — then binds the two together to take the deal forward.
- **Legend / pipeline steps with tags:**
  - Ingest — *deck upload, parsing*
  - Legilimency — *LLM deck analysis*
  - The Match — *Embeddings + matching*
  - The Pact — *FastAPI · React · Kanban*

**Tech tags (confirmed):** LLM deck analysis · Embeddings + matching · FastAPI · React ·
Kanban.

## Scroll/camera calibration (the one fiddly part)

Inserting a 250vh pinned section increases total page scroll height, so every chapter's
fractional `at` value after the insertion point shifts. Approach:

1. Give The Pact its own scroll band immediately after Grimoire's band.
2. Recompute `chapters.ts` `at` fractions and `CameraRig.tsx` `KEYS` fractions from the
   total vh budget (sum of section heights), keeping each chapter's band proportional.
3. Set `pact/phases.ts` `SECTION_START`/`SECTION_END` to match the new Pact band and the
   new CameraRig fractions.
4. Fine-tune by checking scroll-position math; expect one calibration iteration.

**Verification note:** headless screenshots of reveal-animated HTML render as black
(SwiftShader starves rAF), so calibration is verified via scroll math / `textContent`
audits, not pixels. Visual polish of the 3D beats is confirmed by the user in a real
browser.

## Out of scope (YAGNI)

- New GLB character models (founder/investor are abstract sigils).
- A separate dual-number score readout (single score number only).
- A full interactive kanban in 3D (only faint trailing activity cards as a nod).
- A "cast"-style button interaction (beats are scroll-driven, like The Tracker).

## Success criteria

- New Chapter VI appears between Grimoire and Tracker; chapter rail shows VI–IX correctly.
- Scrolling through the 250vh runway plays the three beats in order with the camera framing
  the station, then hands off smoothly to The Tracker.
- No regression in scroll/camera flow for chapters after the insertion point.
- Performance unchanged (no heavy assets added).
