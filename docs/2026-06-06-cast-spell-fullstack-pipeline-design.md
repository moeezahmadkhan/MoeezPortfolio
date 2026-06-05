# Cast Spell — Full-Stack AI Pipeline Chapter

**Date:** 2026-06-06
**Status:** Approved (design), pending implementation

## Goal

Add a **click-to-cast 3D spell** that showcases Moeez's ability to build a full-stack
AI-driven app **end-to-end (A→Z)** — framed for client acquisition. A visitor clicks
**Cast Spell**; a bolt fires from a runic focus and travels a path, igniting six glowing
rune-orbs one by one (the build pipeline), with magic streams flowing between them. The
final "Live App" orb blooms brightest. The spell is replayable (**Recast**).

This is a new **scroll chapter inserted after the Grimoire (projects)**, with its own 3D
"spell chamber" the camera flies to — architecturally mirroring the existing
`TrackerStation` (Chapter V).

## Why click-to-cast (not scroll-driven)

The visitor performs the magic themselves — a hands-on, replayable moment that grabs
client attention. The cast animation is driven independently of scroll.

## Chapter placement & renumbering

Inserted between **Grimoire (IV)** and **Tracker**. Resulting order:

| # | id | theme | plain |
|---|----|-------|-------|
| I | top | The Conjuring | intro |
| II | wizard | The Mind | about |
| III | spells | Spells | skills |
| IV | grimoire | The Grimoire | projects |
| **V** | **conjuring** | **The Conjuring of Apps** | **full-stack AI build** |
| VI | tracker | The Pulse | live AI demo |
| VII | chronicles | The Path | experience |
| VIII | owlpost | Owl Post | contact |

Three coupled places must stay in sync (per CLAUDE.md): section `id`s in `Sections.tsx`,
`KEYS` fractions in `CameraRig.tsx`, and `chapters` in `chapters.ts`. The Tracker's
`SECTION_START/END` in `scene/tracker/phases.ts` and the new chapter's section window must
be **re-measured** from live DOM offsets (puppeteer, 1440×900) after the section is added.

## The 3D spell (igniting rune-node pipeline)

- **Spell chamber** lives at its own world offset, planned `[-13, 0, 0]` (camera swings
  **left** — distinct from the Tracker at `[12, 0, 0]` on the right). Visibility gated by
  the chapter's `localProgress` (hidden outside the section), same as `TrackerStation`.
- **Six rune-orbs** along a gentle arc, dim and gently floating in the **idle** state.
- **On Cast:** a bolt fires from a floating runic focus near the chamber entrance and
  travels the arc; each orb **ignites in sequence** with a bloom flare; energy streams
  flow node→node as each lights. The final orb ("Live App") blooms brightest with a label.
- **Replay:** the button reads **Recast** after the first cast.
- **Reduced motion** (`prefers-reduced-motion`): skip the bolt travel; snap to the
  fully-lit end state.

### The six nodes (A→Z, client-grab framing)

themed name · what it is · stack tags:

1. **The Brief** — your idea / spec — `Discovery`, `Scope`
2. **The Mind** — retrieval + reasoning — `RAG`, `LangChain`, `LLMs`
3. **The Conduit** — backend API — `FastAPI`, `REST`
4. **The Vessel** — containerize — `Docker`
5. **The Summoning** — deploy to cloud — `AWS`, `GCP`, `CI/CD`
6. **Live App** — delivered, end to end — `Full-stack AI`

Content lives as a typed `pipeline` array in `src/data.ts` (same convention as `projects`).

## Module layout

- `src/scene/spell/spell.ts` — chamber `STATION` offset, node definitions (themed name,
  subtitle, tags, position along the arc), `SECTION_START/END` + `localProgress`, and the
  **`spellState` singleton** (`{ requested: boolean, casting: boolean, progress: number }`)
  — out-of-React, same pattern as `scrollState`, so clicks/scroll never re-render the canvas.
- `src/scene/spell/SpellStation.tsx` — group gated by section visibility; runs the cast
  timeline in `useFrame` (consumes `spellState.requested`, captures a start time off
  `state.clock`, ramps `spellState.progress` 0→1 over ~3s, clears `requested`); holds the
  chamber's cool/gold light rig.
- `src/scene/spell/PipelineNodes.tsx` — the six rune-orbs + billboarded labels; each orb's
  glow/emissive and label opacity driven by cast progress vs its position in the sequence.
- `src/scene/spell/SpellBolt.tsx` — the traveling bolt + inter-node energy streams.
- `src/components/Sections.tsx` — new **`Conjuring`** component: eyebrow + `IgniteHeading`
  title + lede + a themed **Cast Spell** button that sets `spellState.requested = true`.
- Wiring: add `<Conjuring/>` station to `Scene.tsx`, `<Conjuring/>` section to `App.tsx`
  between `<Grimoire/>` and `<Tracker/>`, new chapter to `chapters.ts`, new keyframe(s) to
  `CameraRig.tsx`.

## Data flow

```
HTML "Cast Spell" button  ──set──▶  spellState.requested = true   (module singleton)
                                          │
SpellStation useFrame  ──reads──▶  detects requested → starts ramp → spellState.progress 0→1
                                          │
PipelineNodes / SpellBolt useFrame  ──read progress──▶  ignite orbs, fly bolt, flow streams
```

No new React state in the canvas tree. The button is HTML, outside the canvas; setting the
singleton triggers no re-render (and a click re-render would be harmless anyway).

## Error / edge handling

- **Cast while casting:** ignore new `requested` until current ramp finishes (or restart —
  decide in impl; default: ignore until done, then button shows Recast).
- **Section not in view:** station group `visible = false`; cast timeline paused.
- **Reduced motion:** progress jumps to 1 on request.
- **No GLB needed** — the chamber is built from procedural geometry + the shared
  environment/bloom, so no new large asset and no load gating.

## Testing / verification

- `npm run build` (runs `tsc -b`) is the correctness gate — must stay green.
- Headless screenshots via puppeteer-core + system Chrome
  (`--use-gl=angle --use-angle=swiftshader`): capture **idle**, **mid-cast**, and **final
  lit** states; confirm orbs/labels/bolt render and bloom reads correctly.
- Re-measure section scroll fractions after the chapter is in the DOM; update `CameraRig`
  `KEYS` and `phases.ts` windows so the camera lands on the chamber and the Tracker still
  triggers correctly.
- Manual check at http://localhost:5173/ throughout.

## Out of scope (YAGNI)

- No scroll-driven auto-cast (click only).
- No per-node detail pages or click-through.
- No sound (existing "sound toggle" idea is separate/future).
- No new 3D model asset.
