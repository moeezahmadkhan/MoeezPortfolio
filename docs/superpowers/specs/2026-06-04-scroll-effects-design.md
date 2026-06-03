# Scroll Effects — Design Spec

**Date:** 2026-06-04
**Project:** MoeezPortfolio (`frontend/`) — Harry Potter–themed AI/ML portfolio
**Goal:** Bring a few solais.ai-style scroll effects into the site — smoother feel and more cinematic motion — *without* cloning it, and without breaking the static-scene / moving-camera architecture.

## Scope

Four effects, chosen by the user:

1. **Smooth inertia scroll** (Lenis) — the foundation.
2. **Masked text reveals** — headings/eyebrows wipe up from behind a mask.
3. **Pinned Spells section** — the Spells (skills) chapter pins while its 4 groups step through as `01–04`.
4. **Parallax depth layers** — Grimoire project cards drift at staggered speeds.

Approach **A**: `lenis` (one new ~3kb dep) + framer-motion (already a dependency) + CSS `position: sticky`. No GSAP, no hand-rolled smoothing.

## Architectural constraints (must not break)

- `scrollState` in `src/scroll.ts` is a module-level mutable singleton read inside R3F `useFrame` loops. It must **not** be lifted into React state.
- The 3D scene never re-mounts; the camera moves through it driven by `scrollState.progress` (0→1).
- Three places share chapter ordering and must stay in sync: section `id`s in `Sections.tsx`, `KEYS` fractions in `CameraRig.tsx`, `chapters` anchors in `ScrollRail.tsx`.
- `npm run build` (runs `tsc -b` first) is the only correctness gate. No linter/test runner.

## Design

### 1. Smooth inertia scroll (foundation)

- Add `lenis` to `frontend/package.json`.
- New hook `useSmoothScroll()` (in `src/scroll.ts` or a new `src/smoothScroll.ts`) instantiates a single Lenis instance and exposes it (module-level ref) so `ScrollRail` can call `lenis.scrollTo`.
- **Do not** let Lenis run its own internal RAF. Instead a tiny `<ScrollDriver/>` component rendered **inside `<Canvas>`** (in `Scene.tsx`) calls `useFrame((state) => lenis.raf(state.clock.elapsedTime * 1000))`. This ties Lenis's smoothing to the R3F render loop so the camera samples the freshest smoothed scroll value each frame with no tearing.
- Rewrite `useScrollTracker`'s scroll handler to read from Lenis's event instead of `window.scrollY`:
  `lenis.on('scroll', ({ scroll, limit }) => { scrollState.raw = scroll; scrollState.progress = limit > 0 ? scroll / limit : 0 })`.
  `scrollState` keeps the exact same shape — no scene code changes.
- ScrollRail anchor clicks (`#spells`, etc.) route through `lenis.scrollTo(target)` so the wand nav glides instead of jumping.
- **`prefers-reduced-motion`:** if set, skip Lenis entirely. Fall back to the current native-scroll `onScroll` handler. The site must remain fully functional with Lenis disabled.

Lenis keeps the *real* document scroll position (it does not transform a container), so `position: sticky`, IntersectionObserver, and framer-motion `whileInView` all keep working unchanged.

### 2. Masked text reveals

- New primitive `MaskReveal` in `src/components/Reveal.tsx`:
  - An `overflow: hidden` wrapper; the child translates from `y: 110%` → `0` on `whileInView` (`once: true`), reusing the existing `ease = [0.16, 1, 0.3, 1]`.
  - Props mirror `Reveal` (`delay`, `className`).
- Apply to section eyebrows and `section__title`s (where it reads as a clean cinematic wipe).
- Keep `IgniteHeading` as-is for the hero/word-stagger feel; `MaskReveal` is the additive upgrade, not a replacement.
- Tiny CSS util (one class) for the mask wrapper, added near the existing reveal styles.
- **Reduced motion:** wrapper renders content statically (no transform), or motion collapses to opacity-only.

### 3. Pinned Spells (01–04 step-through)

- There are exactly **4 spellbook groups** in `data.ts` → 4 steps.
- Restructure `Spells()` in `Sections.tsx`:
  - Outer `<section id="spells">` becomes tall: height ≈ `(4 + 1) × 100vh` (≈ `500vh`; tune for pacing).
  - Inside, a `position: sticky; top: 0; height: 100vh` stage holds: the masked title, a large rotating `01–04` index, and the active group's chips.
  - Local scroll progress via framer-motion `useScroll({ target: sectionRef, offset: [...] })`. Map progress → active step; cross-fade between the 4 groups, each group's chips wiping in (reusing `MaskReveal`-style motion).
- **Camera re-timing (the one invasive change):** a taller Spells shifts every later chapter's position in the global 0→1 progress. Re-tune `CameraRig.KEYS` `at` fractions to the new section boundaries so each chapter still gets its intended camera move. Verify framing at each chapter with the headless puppeteer screenshot workflow (system Chrome, `--use-gl=angle --use-angle=swiftshader`).
- `ScrollRail` stays 6 chapters; the `#spells` anchor still targets the section top; the fill bar auto-tracks via `scrollYProgress`.
- **Reduced motion:** section collapses back to the current static grid (no pin, no step animation) — guard the tall height + sticky behind the motion preference.

### 4. Parallax depth layers

- New hook `useParallax(speed)` using framer-motion `useScroll` + `useTransform` → returns a `y` motion value tied to scroll.
- Apply to Grimoire (`#grimoire`) project `Tilt` cards with staggered speeds for depth. Optionally to a section background glyph.
- Works on the real scroll position Lenis preserves.
- **Reduced motion:** hook returns a static `0` (no-op).

## Reduced-motion summary

All four effects must respect `prefers-reduced-motion: reduce`:
- Lenis off (native scroll).
- Masked reveals → static / opacity-only.
- Pinned Spells → static grid, no pin.
- Parallax → no-op.

## Files touched

| File | Change |
|------|--------|
| `frontend/package.json` | add `lenis` |
| `src/scroll.ts` (or new `src/smoothScroll.ts`) | Lenis hook + rewritten `useScrollTracker`; reduced-motion fallback |
| `src/scene/Scene.tsx` | `<ScrollDriver/>` inside `<Canvas>` driving `lenis.raf` |
| `src/components/Reveal.tsx` | `MaskReveal` primitive |
| `src/components/Sections.tsx` | pinned Spells restructure; `MaskReveal` on titles/eyebrows; `useParallax` on Grimoire cards |
| `src/components/sections.css` | sticky stage, step/index styles, mask util, parallax |
| `src/scene/CameraRig.tsx` | re-time `KEYS` fractions for taller Spells |
| `src/components/ScrollRail.tsx` | route anchor clicks through `lenis.scrollTo` |

## Sequencing (de-risk order)

1. **Lenis foundation** → verify the scene still tracks scroll correctly.
2. **Masked reveals + parallax** → purely additive, low risk.
3. **Pinned Spells + camera re-time** → the invasive one; verify framing at each chapter with headless screenshots.

## Verification

- `npm run build` passes (`tsc -b` type gate).
- Dev server walkthrough: scroll feels smooth; reveals wipe; Spells pins and steps `01–04`; Grimoire cards parallax.
- Headless puppeteer screenshots at each chapter scroll fraction confirm the camera still frames the wizard correctly after `KEYS` re-timing.
- Toggle `prefers-reduced-motion` and confirm the site is fully usable with all effects degraded gracefully.
