# Smooth, self-narrating scroll — design

**Date:** 2026-06-05
**Status:** Approved (pending spec review)

## Goal

Make the whole-page scroll feel premium *and* legible to a non-technical client.
Two halves:

1. **Feel** — motion that glides and lets each scene "land," without ever hijacking
   the wheel.
2. **Clarity (lightweight)** — wayfinding cues so the client always knows they can
   keep going and what's next, with a one-word plain-language translation of each
   metaphor-named section.

Explicitly **out of scope** (decided during brainstorming): persistent section HUD,
dual-line section headings, per-scene case-study captions. This is feel + light
wayfinding only.

## Context

- Smooth scroll already exists: single Lenis instance (`src/smoothScroll.ts`,
  `lerp: 0.1`, `autoRaf: false`), driven from the R3F frame loop via
  `src/scene/ScrollDriver.tsx`. Disabled under `prefers-reduced-motion` (native
  scroll restored).
- Scroll signals live in a module singleton `scrollState` (`src/scroll.ts`), read
  inside `useFrame` so scrolling never re-renders the Canvas tree.
- `src/components/ScrollRail.tsx` already renders a persistent vertical "wand" rail
  with chapter dots + click-to-jump (`lenis.scrollTo('#id')`). It contains a local
  `chapters` array with measured scroll fractions (`at`).
- Sections have stable ids: `top` (hero), `wizard`, `spells`, `grimoire`,
  `tracker`, `chronicles`, `owlpost`.
- Hero (`src/components/Hero.tsx`) already shows a themed "scroll to descend" start
  cue.
- Design tokens in `src/styles/global.css`: `--gold`, `--parchment`,
  `--parchment-dim`, `--rune`, `--font-mono`, etc.

## Components

### 1. Shared chapter registry — `src/chapters.ts` (new)

Single source of truth, extracted from `ScrollRail.tsx` and enriched with
plain-language names. De-duplicates the `at` fractions that currently live only in
the rail.

```ts
export interface Chapter {
  id: string       // matches the section element id
  numeral: string  // roman numeral shown on the rail
  theme: string    // themed display name
  plain: string    // plain-language translation (one word/phrase)
  at: number       // measured scroll fraction (0..1), kept in sync with CameraRig
}

export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',   theme: 'The Conjuring',     plain: 'intro',         at: 0.0   },
  { id: 'wizard',     numeral: 'II',  theme: 'The Mind',          plain: 'about me',      at: 0.197 },
  { id: 'spells',     numeral: 'III', theme: 'Spells',            plain: 'skills',        at: 0.301 },
  { id: 'grimoire',   numeral: 'IV',  theme: 'The Grimoire',      plain: 'projects',      at: 0.793 },
  { id: 'tracker',    numeral: 'V',   theme: 'The Pulse',         plain: 'live AI demo',  at: 0.854 },
  { id: 'chronicles', numeral: 'VI',  theme: 'The Path',          plain: 'experience',    at: 0.914 },
  { id: 'owlpost',    numeral: 'VII', theme: 'Owl Post',          plain: 'contact',       at: 1.0   },
]
```

`ScrollRail.tsx` is refactored to import `chapters` (it already needs `id`,
`numeral`→`label`, `at`). Theme/plain are additive; the rail ignores fields it
doesn't use.

> Note: `at` fractions remain measured/visual approximations kept in sync by hand
> with `CameraRig` KEYS, exactly as today. The settle hook (below) does **not** rely
> on `at`; it measures live boundaries from the DOM. `at` stays purely for the
> rail's dot placement and is the one approximate value in the registry.

### 2. Motion feel

**2a. Lenis tuning** (`src/smoothScroll.ts`)
- Soften smoothing: `lerp` ≈ `0.085` (slightly more glide than current `0.1`).
- Tune `wheelMultiplier` and `touchMultiplier` for a weighted, premium momentum
  (exact values dialed during verification).
- No structural change: still `autoRaf: false`, still driven by `ScrollDriver`,
  still fully disabled under `prefers-reduced-motion`.

**2b. Proximity settle** — `src/useScrollSettle.ts` (new hook)
- Subscribes to Lenis `scroll` events; tracks velocity and idle.
- On scroll **idle** (velocity below ε for ~140ms) it measures the live top offset
  of each section element (`getBoundingClientRect`), finds the nearest section
  boundary, and **only if** the current scroll is within a magnet zone (~⅓ of
  viewport height from that boundary) eases the remaining distance:
  `lenis.scrollTo(targetTop, { duration: 0.7, easing: expoOut })`.
- **Never traps:**
  - Magnetizes only near seams — a section taller than the viewport that you are
    reading mid-way is never yanked (you're outside any magnet zone).
  - Cancels immediately if the user scrolls during the assist (listen for the next
    user-initiated scroll / wheel / touch and abort via `lenis.stop()`/no-op).
  - No-op if already within a few px of the boundary (prevents re-trigger loops).
- Disabled entirely under `prefers-reduced-motion` (returns early, native scroll).
- Depends on: `getLenis()`, the live DOM section offsets, the chapter `id` list.

### 3. Scroll cues — `src/components/ScrollCues.tsx` + `ScrollCues.css` (new)

One fixed, low-opacity overlay, bottom-center. A single rAF loop reads scroll
position + section boundaries and **mutates its own refs' style/text directly** —
no React state churn per frame, matching the `scrollState` philosophy.

- **Next-section cue:** when the viewport is within the last ~16% of the current
  section (approaching the next boundary), fade in:
  `next ↓  {nextChapter.theme} · {nextChapter.plain}` (e.g.
  `next ↓  The Grimoire · projects`). Fades back out once the next section's title
  is in view.
- **End cue:** when the current section is the last (`owlpost`), the overlay
  becomes `you've reached the end · ↑ back to top`. The "back to top" portion is a
  real `<button>` that eases to top (`lenis.scrollTo(0)` / native fallback).
- **Top guard:** while in the hero (`top`), ScrollCues is hidden so it doesn't
  double Hero's existing "scroll to descend" cue. Hero's start cue is left as-is.
- **Preloader guard:** hidden until `loaded` (App already tracks this — pass a prop
  or read a shared flag; simplest is a `visible` prop from `App`).
- Lives in `App.tsx` alongside `<ScrollRail />` / `<Cursor />`.

**What it depends on:** `chapters` registry, live section DOM offsets, `getLenis()`.

### 4. Accessibility & safety

- **Reduced motion:** settle hook disabled; Lenis disabled (native scroll). Cues
  still render (they're informational) but with no slide/pulse animation — static
  opacity only. Respect via `prefersReducedMotion()` (already in `smoothScroll.ts`).
- **ARIA:** decorative cue text is `aria-hidden="true"`. The "back to top" control
  is a real focusable `<button>` with an accessible label.
- **No hijack guarantee:** settle only near seams + cancels on user input; cues
  never block pointer events except the explicit back-to-top button
  (`pointer-events: none` on the overlay, `auto` on the button).

## Data flow

```
wheel/touch ─▶ Lenis (smoothScroll.ts, tuned) ─▶ 'scroll' event
                                   │
                 ┌─────────────────┼──────────────────────┐
                 ▼                 ▼                        ▼
        scroll.ts singleton   useScrollSettle()      ScrollCues rAF loop
        (camera, unchanged)   (idle? near seam?       (which section? near
                               → lenis.scrollTo)        boundary? → DOM text)
```

All three read the same Lenis instance; the registry (`chapters.ts`) is the shared
vocabulary for names. ScrollDriver continues to pump `lenis.raf()` from the R3F
loop — unchanged.

## Error handling / edge cases

- **Lenis not ready / reduced-motion:** `getLenis()` returns `null` → settle hook
  no-ops, cue back-to-top falls back to native anchor scroll, exactly like the rail
  does today.
- **Resize:** section offsets are measured live each idle/frame (no cached layout),
  so resizing mid-scroll can't desync the settle/cue boundaries.
- **Very short final section:** end cue keyed off "current === last chapter," not a
  fixed pixel band, so it shows regardless of `owlpost` height.
- **Rapid flicking:** settle waits for genuine idle; continuous flicks never
  trigger it.

## Testing / verification

Scroll feel can't be meaningfully unit-tested; verification is observational using
the existing puppeteer-core harness (`/usr/bin/google-chrome-stable`,
`--use-gl=angle --use-angle=swiftshader`):

1. **Settle lands centered:** scroll to ~80% into a section, stop, wait, screenshot
   → scene is centered on the seam.
2. **No-trap:** scroll to mid-point of a tall section (tracker), stop → no movement.
3. **Cues read correctly:** screenshot near each seam → `next ↓ {theme} · {plain}`
   matches the upcoming section; final section shows the end cue.
4. **Reduced-motion:** emulate `prefers-reduced-motion: reduce` → native scroll,
   no settle, static cues.
5. Manual feel pass on real hardware for momentum/lerp dial-in.

## Files

| File | Change |
|------|--------|
| `src/chapters.ts` | **new** — shared registry (id, numeral, theme, plain, at) |
| `src/components/ScrollRail.tsx` | refactor to import `chapters` |
| `src/smoothScroll.ts` | tune lerp + wheel/touch multipliers |
| `src/useScrollSettle.ts` | **new** — proximity settle hook |
| `src/components/ScrollCues.tsx` | **new** — next-section + end cues overlay |
| `src/components/ScrollCues.css` | **new** — cue styling (gold/mono, low-opacity) |
| `src/App.tsx` | mount `useScrollSettle()` + `<ScrollCues />` |
