# Motion system: every surface leaves, and the 3D earns its place

**Date:** 2026-09-01
**Status:** approved, ready for an implementation plan
**Scope:** two phases, sequenced. Phase 1 is correctness and ships alone. Phase 2 is quality and sits on top of it.

## Why this exists

The site's motion is in better shape than it looks from the inside, and worse in one specific way.

Measured in a real browser on 2026-09-01:

- A full-page scroll with the WebGL loop running holds **240 frames at a median 16.7ms, zero frames over 20ms, zero long tasks.** There is no jank.
- The smoothed scroll channel does its job: under discrete wheel notches the raw position moves on **12%** of frames and the eased channel on **64%**.
- oryzo.ai, the visual reference, is **23.4MB / 20.6s to network-idle / 3595 DOM nodes**, against our 3.1MB / 2.3s / 283. Its DOM layer animates on 13% of frames — exactly its raw-scroll frames, i.e. it scrubs raw scroll.

So the gap is not smoothness of the plumbing. It is that **surfaces arrive without leaving**, and that the 3D does less than it could.

Three instances of the same defect have been found by hand, one at a time:

| Surface | Symptom | Cause |
| --- | --- | --- |
| Mobile menu | `transitionDuration: 0s`; hard snap | toggles `display`, which no transition could reach |
| Chat panel | gone from the DOM on the next frame; **zero** frames at partial opacity | `{open && <panel/>}` — React cannot animate what it has unmounted |
| Invalid field border | flips to the error colour instantly | no `transition` on the base rule |

Two are fixed. The pattern is not, and finding the third by hand is not a strategy.

## The finding that shapes Phase 1

A source-level detector was prototyped over every CSS state rule: **22 state rules scanned, 12 flagged, roughly 10 of them false positives.** It flagged `.btn--solid:hover` while `.btn` transitions `background` two rules above it, and flagged `.field input[aria-invalid]` whose base rule had been given a transition an hour earlier.

That failure is the useful result. **CSS source cannot be linted for this, because the cascade is what decides the answer.** Every genuine bug so far was found by driving a browser and sampling `getComputedStyle` across a state change.

It did surface one true positive, since confirmed in the browser:

- **The active-nav underline pops.** As the active section changes, the marker hands off between links at opacity `1 → 1` in a single frame. `.nav__link` transitions only `color`; the `::after` marker is not transitioned at all. It fires five times per scroll, at the top of the viewport.

## Non-goals

Recorded so they are not re-proposed:

- **Lusion's WebGL-Scroll-Sync** (absolute canvas, offset per frame). It solves canvas-to-DOM-element drift. Our canvas has no DOM targets to drift against, and its 25% vertical padding would undo the mobile fill-rate work.
- **CSS scroll-driven animations** (`animation-timeline: view()`). Not Baseline — no Firefox at all — so they could only layer over the `IntersectionObserver` we already have, and there is no jank for them to fix.
- **A pinned scroll-as-timeline hero**, a scroll library, or scroll-jacking. This is the v1 architecture and it is out of scope by decision, not by oversight.
- Re-tuning anything that currently measures clean.

---

# Phase 1 — no surface arrives without a way to leave

## 1.1 The gate: `frontend/tools/check_motion.mjs`

A browser-driven check, modelled on `tools/check_contrast.mjs`, which already works this way and catches things unit tests cannot.

**Scenario-driven, not selector-driven.** Every bug found so far came from an action ("close the panel"), never from reading a selector. A scenario is:

```js
{
  name: 'chat panel closes',
  viewport: [390, 844],
  setup: async (page) => { /* reach the state under test */ },
  act: async (page) => { /* the one interaction being measured */ },
  watch: '.chat__panel',
  minIntermediateFrames: 4,
}
```

For each scenario the checker samples the watched element every frame across a fixed window after `act`, building a per-frame signature from `opacity`, `transform`, `color`, `background-color`, `border-color` and `display`. It then counts frames whose signature differs from **both** the first and last sample — the frames that are genuinely mid-transition. Fewer than `minIntermediateFrames` fails.

This generalises past opacity: a border-colour snap and a transform snap both register, and a surface that is simply static produces no change at all and is skipped rather than failed.

`minIntermediateFrames` defaults to **4**. At 60Hz the site's shortest state change (0.2s) spans roughly twelve frames and its longest (0.6s) about thirty-six, so four is a floor that a real transition clears comfortably while a snap — which produces exactly zero — cannot. It is a per-scenario field so a deliberately brisk surface can lower it with the reason recorded at the call site.

**Starting scenarios:** mobile menu open, mobile menu close, chat panel open, chat panel close, field becomes invalid, card hover, active-nav marker handoff during scroll.

Exits non-zero with the failing scenario named. Wired as `npm run check:motion`, alongside `check:contrast`.

## 1.2 One cheap source lint

The specific smell behind two of the three bugs is narrow enough to catch in source, and worth catching early: **an element whose only motion is a `@keyframes` entrance.** Keyframes play on mount and say nothing about leaving. Added to `src/test/motion-language.test.ts`, which already lints the stylesheets, with the recorded exception list starting empty.

## 1.3 The nav marker

Replace the per-link `.nav__link[aria-current]::after` with a single marker element inside `.nav__links`, positioned by `transform: translateX()` and `scaleX()` from the active link's offset and width. One element that moves is the only version of this that can ease; five elements that each blink cannot.

- Desktop only. Below the 780px breakpoint the menu is a vertical panel where a sliding underline reads as noise; the mobile menu keeps colour-only indication.
- Recompute on active change and on resize, via the existing `useMatchMedia`/`ResizeObserver` patterns. Not per frame — the active item changes on section crossings, not continuously.
- Hidden entirely when no section is active (the hero), rather than parked at item zero.
- `transform` only, so it never re-flows the nav.

## 1.4 Record the verdicts

The ~10 false positives get confirmed in the browser once and written down in `frontend/CLAUDE.md`, so the next audit does not re-litigate `.btn--solid:hover`.

## Phase 1 acceptance

- `npm run check:motion` passes, and fails if any scenario's transition is removed.
- The nav marker slides; measured with the same probe that caught it popping.
- `npm test`, `npx tsc -b`, `npm run check:contrast` all still pass.
- Phase 1 is independently shippable. Nothing in it depends on Phase 2.

---

# Phase 2 — the 3D does more

## 2.1 Per-section choreography

Today a section change is a bare cross-fade: the outgoing rig's opacity falls, the incoming rig's rises, and nothing else about them differs. Each rig gets a short scripted entry instead.

New pure module `frontend/src/three/choreography.ts`, beside `motion.ts` and following `rigPose.ts`'s conventions exactly — pure, table-driven, writing into a caller-owned object so the frame loop allocates nothing:

```ts
entryOffsets(rigId: string, progress: number, out: EntryOffsets): EntryOffsets
```

`progress` is **the rig's own fade value**, which `CharacterRig` already tracks. No new state, no new timers, and — critically — no new scroll input.

Per-rig table with a shared default, so a rig without an entry keeps exactly today's behaviour. Offsets are limited to `lift`, `yaw` and `scale`, added to the existing damped targets so the entry inherits the site's settle rather than introducing a second one.

## 2.2 Hero reactivity

Two corrections to earlier assumptions, both verified in source:

- **Mobile is not input-less.** `useDragOrbit` installs on the hero rig at every viewport, so a phone already has drag-to-orbit. What it lacks is passive parallax and release momentum.
- **`orbitState.velocity` is declared and never written or read.** Dead state — and precisely the hook momentum needs.

Work:

1. **Release momentum.** A released drag currently damps straight back to rest at `ORBIT_RETURN_LAMBDA`. Track velocity while dragging, carry it on release, then settle. Pure function beside `applyDrag`, unit-tested for the properties that matter: it must decay monotonically, never exceed `MAX_ORBIT`, and come to rest.
2. **Deepen the pointer response.** `MAX_TILT` is 0.18 rad (~10°) and reads as shy. Raise it toward ~0.28 rad (~16°) as a starting value, then tune by shot review at both widths; the ceiling is the point where the figure reads as spinning rather than attending, which `MAX_FOCUS_TURN` (0.4 rad) already marks. Give pitch a slightly slower lambda than yaw so the head leads the body instead of turning as one rigid piece.
3. Both are constants in `motion.ts`/`rigPose.ts`, re-tunable in one place, per the existing rule.

## 2.3 Hard limits

These are the v1 failure conditions, written as constraints so implementation is bound by them:

- Section membership comes from `useSectionObserver` only. **No scroll-fraction table, ever** — that is what got v1 deleted.
- No pinning, no scroll-jacking, no scroll library.
- Content never moves to accommodate the model. The model gets reserved space (`--figure-band`, the desktop column) or it recedes.
- The site stays complete and readable with WebGL gated off. Every gate in `stageGate.ts` still leaves a whole site behind.
- Choreography reads the rig's own fade and `scrollState.smooth`. Nothing else.

## Phase 2 acceptance

- Choreography maths covered by unit tests the way `rigPose`/`motion` are.
- `npm run shoot` at both widths shows no regression; `check:contrast` and `check:motion` still pass.
- Mobile payload unchanged: still one GLB, still no post-processing below the hero.
- No new scroll listener and no new per-frame allocation.

---

## Testing strategy

| Layer | Covered by |
| --- | --- |
| Pure maths (choreography, momentum, marker position) | vitest, alongside `rigPose.test.ts` |
| Exit behaviour of every interactive surface | `npm run check:motion` (browser) |
| Body-copy legibility over the live backdrop | `npm run check:contrast` (existing) |
| Layout and framing at both widths | `npm run shoot` (existing) |
| Motion language (curves, layout properties, named lambdas) | `motion-language.test.ts` (existing, extended in 1.2) |

## Risks

- **Phase 2 is the direction that buried content in v1.** The limits in 2.3 are the mitigation, and they are only as good as the discipline applied. If choreography starts fighting the copy, cut it — Phase 1 stands alone and is the part that has to land.
- **The scenario gate only covers scenarios someone wrote.** It cannot prove the absence of snapping surfaces, only the presence of the ones under test. Accepted: it converts a class of bug from "found by accident" to "found once, then guarded".
- **`@starting-style` and `allow-discrete` are Baseline but recent.** A browser without them snaps, which is the pre-existing behaviour, so there is nothing to fall back to. Recorded rather than mitigated.
