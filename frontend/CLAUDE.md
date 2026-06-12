# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page personal portfolio for **Moeez Ahmad Khan** (AI/ML Engineer). It is themed as a Harry Potter / wizarding "archive": a candlelit 3D hero with a floating wizard figurine, followed by scroll-driven chapters (About, Spells, Grimoire of projects, Chronicles, Owl-post contact). Pure front end — no backend, no API.

## Commands

```bash
npm run dev      # Vite dev server (host:true → exposed on LAN, default port 5173)
npm run build    # tsc -b (typecheck) then vite build → dist/
npm run preview  # serve the production build
```

There is no test runner, linter, or formatter configured. `npm run build` is the only correctness gate — it runs `tsc -b` first, so a type error fails the build. Type-check without bundling via `npx tsc -b`.

## Architecture

Two visual layers stacked by `App.tsx`:

1. **A fixed full-viewport WebGL canvas** (`src/scene/`) rendered once, behind everything.
2. **Scrollable HTML content** (`src/components/`) on top.

The 3D scene never re-mounts as you scroll. Instead the **camera moves through the static scene** while HTML chapters scroll past — this is the core trick of the site.

### The scroll bridge (`src/scroll.ts`)

`scrollState` is a **module-level mutable singleton**, deliberately *outside* React state. A scroll/pointer listener (installed by `useScrollTracker`) writes `progress` (0→1 down the page), `raw` px, and `pointerX/Y` (−1→1) into it. The R3F components read it inside their `useFrame` loops every frame. This keeps scrolling from ever triggering a React re-render of the Canvas tree. **Do not lift `scrollState` into `useState`/context** — that would re-render the whole scene on every scroll event.

### The scene (`src/scene/`)

- `Scene.tsx` — the `<Canvas>`: lighting rig (candlelight + spot/rim/key lights), `Environment` with inline `Lightformer`s (no network HDRI), `Sparkles`, `ContactShadows`, and the `EffectComposer` post chain (**Bloom** is what makes the gold glow, plus Vignette + SMAA). Performance is adaptive: `PerformanceMonitor` + `AdaptiveDpr` drop the `dpr` on slow devices.
- `CameraRig.tsx` — drives the camera. `KEYS` is a keyframe array (`at` = scroll fraction → camera `pos`/`look`). It samples + smoothsteps between keyframes by `scrollState.progress`, adds eased pointer parallax, and lerps frame-rate-independently. **To re-time the camera per chapter, edit `KEYS`.** A second array, **`KEYS_MOBILE`, is selected on phones** (`pointer: coarse` / width < 720) because the pinned sections collapse to natural height there (see `sections.css`), so the desktop fractions no longer line up with the chapters. Its `at` fractions are MEASURED at 390×844 via `tools/measure_mobile.mjs`, and its poses pull in + aim the look-point *below* each model so the figure lifts into the cleared top band of the portrait frame (the character stations reserve their top ~50svh for the 3D, copy drops to the bottom — see the mobile block in `sections.css`). Mobile also widens the camera `fov` (`Scene.tsx`) and stops the `responsiveState.zoom` shrink (`scroll.ts`) so models read large. Each MODEL chapter (conjuring/pact/tracker/map) gets an **entry + hold key PAIR** at the same pose so the camera SETTLES on the figure through that section's reading window instead of continuously drifting toward the next far-offset station (which slid models off-frame mid-section); text chapters keep a single key. **If you add/remove a chapter or change a model-station's mobile layout, re-run `measure_mobile.mjs` and resync `KEYS_MOBILE` fractions.**

Stations are far apart in world space (x = −13…22), so the long camera whip-pans between them used to cross a black "dead zone" — the previous station popped out at its span edge before the next popped in. `src/scene/stationVisibility.ts` (`visibleInSpan`) gates each station's `.visible` on its `SECTION_START/END` **plus a scroll margin**, so a station stays rendered as it recedes / arrives early; animation timing still uses the clamped `localProgress`. Desktop additionally lingers the Pact "held" key (0.645) before whipping to the Tracker. A mobile-only front fill `pointLight` (centered, tight decay) in `Scene.tsx` lifts the central figurine (hero/about/grimoire/chronicles) out of silhouette without reaching the offset stations.
- `WizardModel.tsx` — loads `/models/wizard.glb` (a static, rig-less mesh, ~3.6MB after meshopt compression; animated purely in-scene via Float + rotation). The `reveal` prop (0→1) scales it up out of the rune circle during the intro. Materials are cloned + tweaked (emissive warmth) so HMR never mutates shared state. The GLB carries **baked emissive `Glow_*` materials** (glowing eyes + wand magic) — the material traversal skips `Glow_*` so it doesn't clobber them, and Bloom makes them glow. A pulsing `pointLight` + `Sparkles` at `WAND_TIP` give the wand its animated magic. The model is rebuilt from `tools/wizard.original.glb` via `tools/build_wizard.sh` (Blender glow/2K-textures → gltf-transform meshopt); see `docs/wizard-glb-improvement.md`.
- `RuneCircle.tsx` — procedural sigil on the floor; fades out by ~22% scroll (`scrollState.progress`).
- `Candlelight.tsx` — a `pointLight` flickering via layered sines.

### The intro timeline (`App.tsx`)

drei's `useProgress` gates a preloader. When assets finish loading, a `requestAnimationFrame` ramp drives `reveal` 0→1 over 1.8s, passed into `Scene → WizardModel` to "conjure" the figurine. The preloader fades out via framer-motion `AnimatePresence`.

### HTML chapters (`src/components/`)

- `data.ts` — **all portfolio content** (projects, spellbook/skills, chronicles/experience) lives here as typed arrays. Edit copy here, not in JSX.
- `Sections.tsx` — `About`, `Spells`, `Grimoire`, `Chronicles`, `OwlPost` — maps over `data.ts` into the wizard-themed sections.
- `Reveal.tsx` — `Reveal` (scroll-into-view blur+rise) and `IgniteHeading` (per-word stagger). Shared scroll-reveal primitives built on framer-motion `whileInView`.
- `Hero.tsx`, `Tilt.tsx` (pointer tilt cards), `ScrollRail.tsx` (chapter progress wand on the page edge), `Cursor.tsx` (custom wand-tip cursor + sparks, disabled on coarse pointers).

> Note: `App.tsx` currently renders `<Hero>` plus a placeholder "Grimoire — coming next" section. The full chapter components (`Sections.tsx`, `ScrollRail.tsx`, `Cursor.tsx`, `data.ts`, etc.) exist but are **not yet wired into `App.tsx`** — wiring them in (and matching section `id`s to `CameraRig` `KEYS` and `ScrollRail` chapters) is the in-progress work.

### Section ↔ camera ↔ rail coupling

Three places share the chapter ordering and must stay in sync: the section `id`s in `Sections.tsx`, the `KEYS` scroll fractions in `CameraRig.tsx`, and the `chapters` anchors in `ScrollRail.tsx`. Changing the number/order of chapters means updating all three.

## Conventions

- **Design tokens** live in `src/styles/global.css` as CSS custom properties (palette: ink `#07070d`, gold `#e7c27d`, rune-teal; fonts Cinzel / Cormorant Garamond / JetBrains Mono loaded in `index.html`). Use the variables; don't hard-code hex in components except inside the 3D scene where three.js needs literal colors.
- Each component pairs with a sibling `.css` file imported at the top.
- Wizarding metaphor is intentional throughout copy and class names (spells = skills, grimoire = projects, owl post = contact, "incantations" = playful project names). Keep new content in voice.

## Verifying 3D renders headlessly

`puppeteer-core` is a dev dependency for screenshotting the WebGL output. Drive it with system Chrome (`/usr/bin/google-chrome-stable`) using `--use-gl=angle --use-angle=swiftshader`. The `glBlitFramebuffer` WebGL warning under SwiftShader is harmless.

## Large assets

`wizard.glb` and the CV PDF live under `public/` and are served as-is. The shipped model is `public/models/wizard.glb` (~3.6MB, meshopt-compressed). Its uncompressed source is `tools/wizard.original.glb` (kept out of `public/` so it isn't bundled); regenerate the shipped model with `tools/build_wizard.sh`. Two extra source GLBs and a PDF sit in the repo root (not served).

### Other characters (Spellcaster, Pact pair)

Raw Tripo character GLBs (~500k tris, 15MB) are optimized for the web with `tools/build_character.sh <input.glb> <public/models/out.glb> [ratio]` — a gltf-transform `dedup → weld → simplify → meshopt` pipeline (~125k tris / ~1.4MB out, matching the wizard's footprint). No Blender needed: geometry only, textures are left as-is. The shipped characters are `public/models/spellcaster.glb` (Conjuring chapter, `src/scene/spell/SpellCaster.tsx`) and `public/models/pact_pair.glb` (a single mesh holding the founder + investor as a composed pair, `src/scene/pact/ThePact.tsx`). Their raw sources sit in the repo root.

All character glow/theme is done **in React, not baked**: `src/scene/characterMaterial.ts` (`applyWizardingMaterials`) gives each cloned model the warm emissive tint + crisp PBR finish (and passes `Glow_*` materials through untouched), and each scene adds its own FX (wand-tip orb + light + Sparkles, chalice/bond glow) at a tunable model-space coord — same approach as `WizardModel`. Tune the per-character transform constants at the top of `SpellCaster.tsx` / `ThePact.tsx`. Verify framing headlessly with `tools/shot_chars.mjs` (skips the cinematic intro, then screenshots the Conjuring/Pact/Map scenes).

### Marauder's Map art + detected subject

The map table (`src/scene/map/MapTable.tsx`) is textured with **`public/maraudersmap.png`** — the illustration the user supplied (a Marauder's-Map scene with a baked-in "TARGET TELEMETRY LOG" panel: SCANNED SUBJECT ID, IMAGE EMBEDDINGS, COMPARISON_MATCH — the AI/vision angle drawn right into the art). It arrived as a 2.6MB SVG wrapping a 1013×1024 raster; `tools/extract_map_png.mjs` pulls the PNG out so we ship that directly instead of rasterizing a huge data-URI SVG. The material carries an emissive copy of the texture (`emissiveIntensity` ≈ 0.7) so it stays legible in the candlelit hall and its gold/teal ink blooms. (The old procedural `parchment.ts`/`useSvgTexture` path is no longer used by MapTable but is kept for its tests.)

On top of the map, `public/walker.svg` (a flat teal hooded-walker silhouette — needs explicit `width`/`height` so `TextureLoader` rasterizes it) is billboarded along the patrol path by `src/scene/map/Walker.tsx`, so the gold detection reticle locks onto it like a vision-model bounding box.
