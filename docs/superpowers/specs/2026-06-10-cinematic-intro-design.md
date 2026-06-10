# Cinematic Intro — "The Opening Incantation"

**Date:** 2026-06-10
**Status:** Approved (design)
**Scope:** A cinematic full-screen title sequence that plays after the loader and dissolves into the existing hero. Inspired by a Harry-Potter-themed portfolio (big film-style lettering revealing over a misty Hogwarts-night sky).

---

## 1. Goal

Add a signature opening moment to the portfolio: giant Harry-Potter-style lettering ("Welcome To…" → "My Name Is Moeez Ahmad Khan") revealing over an atmospheric misty night sky with a castle silhouette and moon, recolored to the site's existing candle-gold / ink palette so it flows seamlessly into the wizard scene that follows.

This spec covers **only** the intro sequence. Other magical touches (wand cursor, Marauder's-Map gate, Sorting Hat, ambiance) are deferred — see §9 Roadmap.

## 2. Decisions locked during brainstorming

| Decision | Choice |
| --- | --- |
| Visual mood | **Themed** — candle-gold + ink palette (not the reference's cool teal), so it matches the rest of the site. |
| Flow | **Play before the hero.** Keep the existing `Lumos %` preloader, then play the cinematic sequence as its own full-screen beat, then dissolve into the existing Chapter-I hero. |
| Lettering | **Authentic "Harry P" film font**, self-hosted, scoped to the title cards only. Licensing is a personal-use gray area; this is the owner's call. Cinzel Decorative is the fallback if the font is swapped out. |
| Copy | Card 1: "Welcome To The Archive". Card 2: "Moeez Ahmad Khan". |
| Audio | None. |

## 3. Placement in the boot flow

```
phase: 'loading'  →  'intro'  →  'live'
        │              │           │
   Lumos preloader  CinematicIntro  hero + scene fully interactive
   (asset load)     full-screen     (existing behavior)
```

- `App.tsx` gains a `phase` state machine. Today it has `loaded` (boolean) + a `reveal` ramp; this generalizes that.
- `loading`: the existing preloader is shown while drei `useProgress` reports assets loading. Unchanged.
- When assets finish (the current `!active && progress >= 100` condition), instead of going straight to interactive, enter `intro` and mount `<CinematicIntro onDone={...} />`.
- The existing wizard "conjure" `reveal` ramp (0→1 over 1.8s) starts **when the intro begins**, so the figurine conjures behind the curtain and is already alive when the intro dissolves.
- `CinematicIntro` calls `onDone` → `phase = 'live'`; the overlay fades out (framer-motion `AnimatePresence` exit), revealing the hero underneath.
- If the intro was already seen this session (see §6), skip straight from `loading` → `live`.

## 4. Component architecture

New, self-contained component: `src/components/CinematicIntro.tsx` (+ `CinematicIntro.css`). Pure DOM/CSS/SVG — **no changes to the R3F scene** (`src/scene/`).

A fixed, full-viewport overlay at `z-index: 200` (above the page content and the `#root::before` vignette at z-index 50; below the `#root::after` parchment grain at z-index 9999, which is `pointer-events:none` and harmlessly textures over it).

Layer stack (back → front):

1. **Sky** — radial-gradient background in the gold/ink palette.
2. **Fog** — three large blurred radial-gradient `<div>`s drifting on slow, offset CSS keyframes (`transform` only, GPU-friendly).
3. **Castle** — inline SVG silhouette (turreted Hogwarts-ish skyline) anchored bottom, filled with near-ink color.
4. **Moon** — soft gold radial glow near top-center.
5. **Birds** — 2–3 small drifting marks for life (subtle, low opacity).
6. **Title** — the cards, rendered in the self-hosted intro font.
7. **Skip control** — quiet "Enter ✦" / skip affordance, bottom-right.

The title font is declared via `@font-face` and applied through a single class (e.g. `.intro__title`) so it never leaks into the rest of the site's typography.

## 5. Sequence & timing

Auto-plays, ~6.5s total, then dissolves:

- **Card 1** (~0–3s): eyebrow `✦  ✦  ✦` · title **"Welcome To The Archive"** — fades/rises in, holds, fades out.
- **Card 2** (~3–6.5s): eyebrow `My Name Is` · title **"Moeez Ahmad Khan"** — fades/rises in, holds.
- **Dissolve** (~6.5s): whole overlay fades out over ~1s, revealing the hero.

Timings are constants at the top of the component for easy tuning. Card transitions use the site's existing easing feel (`[0.16, 1, 0.3, 1]`).

## 6. Behaviors

- **Skip** — a skip button (bottom-right), plus `Esc` key and click-anywhere-to-skip, all call `onDone` immediately (with a short fade so it isn't jarring).
- **Once per session** — on completion/skip, set a `sessionStorage` flag (`introSeen`). On mount, if the flag is set, the intro is bypassed (`loading` → `live` directly). A full refresh in a new tab replays it; navigating/scrolling within the session does not.
- **Reduced motion** — when `prefers-reduced-motion: reduce`, the drifting fog/bird animations are disabled; the sequence shows the final title statically for a brief beat then dissolves. (The site already globally clamps animation/transition durations under reduced motion via `global.css`; the component must still gate its JS-driven timers so it doesn't hang.)
- **No layout shift** — the overlay is `position: fixed`; mounting/unmounting it does not affect document flow or scroll position.

## 7. Assets

- Self-host the intro font under `public/fonts/` as WOFF2 (+ WOFF fallback), declared via `@font-face`.
- **Open item:** the actual font file must be sourced and dropped in. The owner confirms whether to keep "Harry P" (personal-use license caveat) or swap to the OFL-safe Cinzel Decorative. The component must look correct with either, since the `@font-face` `src` is the only thing that changes.
- No new 3D assets, no network HDRI, no new dependencies (framer-motion is already present).

## 8. Testing

- **Unit (vitest):** the once-per-session gate logic — extract the "should the intro play?" decision into a tiny pure helper (reads/writes a passed-in storage-like object) and test: plays when unseen, skipped when seen, and the flag is set on completion. This mirrors the repo's existing pattern of pure `*.ts` + `*.test.ts` (e.g. `chapters.ts`/`chapters.test.ts`).
- **Build gate:** `npm run build` (runs `tsc -b`) must pass.
- **Visual:** verified via the existing `puppeteer-core` screenshot path (system Chrome with SwiftShader) — capture the two card states and the dissolved hero.

## 9. Roadmap (future — separate specs, NOT this work)

Captured so they aren't lost; each gets its own brainstorm → spec → plan later:

- Wand-cursor spell-casting (gesture/shape recognition triggering effects).
- Marauder's-Map front gate ("I solemnly swear…" ink-drawing entry).
- Sorting-Hat house reveal (themes accents for the visit).
- Richer Great-Hall ambiance (drifting candles / embers / mouse-reactive fog).

## 10. Out of scope

- Audio / ambient sound.
- Any change to the 3D scene, camera rig, scroll math, or existing chapters.
- The roadmap items in §9.
- A skip-intro user *preference* persisted across sessions (only per-session is in scope).
