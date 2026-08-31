# Portfolio v2 — 3D Interactions Implementation Plan (2b of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single hero set piece into a 3D presence that runs the length of the page — the model changing as you move between sections, reacting to what you point at, and holding one pinned moment — using Moeez's own wizard models.

**Architecture:** A director component owns one model slot in the existing canvas and cross-fades between per-section rigs as `useSectionObserver` reports a new active section. Reaction state (which project is hovered, how far through the pinned section you are) lives in the same mutable-singleton pattern as `scrollState` and `wizardState`, so pointer and scroll activity still never re-render the canvas tree. Models load lazily per section, not upfront.

**Tech Stack:** three.js 0.169, @react-three/fiber 8, @react-three/drei 9, @react-three/postprocessing 2, raw GLSL, KTX2/Basis via `useKtx2Gltf`.

**Spec:** `docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md`
**Reference:** `https://oryzo.ai/` — cursor-reactive hero object, scroll-driven model transitions, one pinned showcase moment. Its motion craft only; nothing about its content or tone.
**Predecessor:** `docs/superpowers/plans/2026-08-31-portfolio-3d-stage.md` must be complete — this plan builds directly on `Stage`, `Backdrop`, `HeroWizard`, `scrollState`, and `wizardState`.

## Global Constraints

- All work in `frontend/`. Branch `redesign/v2`.
- **The v1 trap.** The deleted v1 site was a scroll-driven 3D world with camera "stations" whose scroll fractions had to be resynced across three files on every content edit. Nothing in this plan may reintroduce that. Section membership comes from `IntersectionObserver` via `useSectionObserver`; **no hard-coded scroll fractions, no keyframe tables keyed to document position.** Adding or reordering a section must require no numeric resync anywhere.
- **Content never depends on the canvas.** With WebGL blocked, `prefers-reduced-motion` set, or save-data on, the site stays complete and every interaction still works. All of this plan sits behind the existing `shouldRenderStage` gate.
- **No model loads before it is needed.** `wizard_improved.glb` is ~850 kB; `spellcaster.glb` and `pact_pair.glb` are ~1.25 MB each. Loading all of them at once would triple the 3D payload for a visitor who never scrolls. Each rig mounts only when its section is near.
- Allocate nothing inside `useFrame`. Hoist vectors, colours, and arrays.
- `damp()` from `src/lib/frame.ts` is the only easing helper in the render loop; `var(--ease)` the only CSS curve.
- Accessibility already shipped and is binding: tap targets ≥44px, form controls 16px, mobile section padding 64px, body measure ~72ch, canvas `aria-hidden` + `pointer-events: none`. Nothing here may regress it, and **every pointer interaction must have a keyboard equivalent**.
- Wizard-metaphor vocabulary stays banned in `src/` (`grimoire`, `owl post`, `owlpost`, `spellbook`, `incantation`, `chronicles`, `familiar`, `muggle`, `hogwarts`). The word "wizard" is fine.
- `npm run build` and `npm test` green with pristine output at the end of every task.

---

### Task 1: Interaction state singletons

**Files:**
- Create: `frontend/src/lib/focusState.ts`
- Modify: `frontend/src/lib/scrollState.ts`
- Test: `frontend/src/lib/focusState.test.ts`, `frontend/src/lib/scrollState.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `focusState: { projectSlug: string | null; source: 'pointer' | 'keyboard' | null }`, `setProjectFocus(slug, source)`, `clearProjectFocus()`.
  - `sectionProgress(rect: { top: number; height: number }, viewportHeight: number): number` — pure, 0 as a section's top reaches the bottom of the viewport, 1 as its bottom leaves the top. Clamped.
  - `scrollState.pinnedProgress: number` — written by the tracker for whichever section is registered as pinned.
  - `registerPinnedSection(id: string | null): void`.

- [ ] **Step 1: Write the failing tests**

`focusState.test.ts` must cover: initial state is null/null; `setProjectFocus('horus', 'pointer')` mutates in place (capture the object reference first and assert through it, as `wizardState.test.ts` does); `clearProjectFocus()` returns to null; a keyboard focus does not get overwritten by a pointer leave for a different slug.

`sectionProgress` cases: a section entirely below the viewport gives 0; entirely above gives 1; one whose top sits at the viewport midpoint gives a value strictly between 0 and 1; `viewportHeight` of 0 gives 0 rather than NaN.

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- src/lib/focusState.test.ts src/lib/scrollState.test.ts`
Expected: FAIL — `focusState` does not resolve, `sectionProgress` is not exported.

- [ ] **Step 3: Write `focusState.ts`**

```ts
/**
 * What the visitor is currently pointing at or has focused. Written by DOM event
 * handlers, read inside useFrame. A singleton for the same reason scrollState is
 * one: hovering a card must not re-render the canvas tree.
 *
 * `source` matters because keyboard focus should not be cleared by an unrelated
 * pointer leave — a keyboard user tabbing through cards would otherwise flicker.
 */
export const focusState = {
  projectSlug: null as string | null,
  source: null as 'pointer' | 'keyboard' | null,
}

export function setProjectFocus(slug: string, source: 'pointer' | 'keyboard'): void {
  focusState.projectSlug = slug
  focusState.source = source
}

export function clearProjectFocus(slug?: string): void {
  // Only clear if the caller owns the current focus, so a pointerleave on one card
  // cannot wipe the keyboard focus that has since moved to another.
  if (slug && focusState.projectSlug !== slug) return
  focusState.projectSlug = null
  focusState.source = null
}
```

- [ ] **Step 4: Extend `scrollState.ts`**

Add `pinnedProgress: 0` to the singleton, the pure helper, and the registration:

```ts
/** Pure: how far the viewport has travelled through a section, 0 → 1. */
export function sectionProgress(
  rect: { top: number; height: number },
  viewportHeight: number,
): number {
  if (viewportHeight <= 0) return 0
  const total = rect.height + viewportHeight
  const travelled = viewportHeight - rect.top
  return Math.min(1, Math.max(0, travelled / total))
}

let pinnedId: string | null = null
export function registerPinnedSection(id: string | null): void {
  pinnedId = id
}
```

Inside the existing `readScroll` handler in `useScrollTracker`, after the hero measurement, add the pinned read — reusing the one rect-read-per-event budget the tracker already has:

```ts
      if (pinnedId) {
        const el = document.getElementById(pinnedId)
        if (el) {
          const r = el.getBoundingClientRect()
          scrollState.pinnedProgress = sectionProgress(
            { top: r.top, height: r.height },
            window.innerHeight,
          )
        }
      }
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npm test -- src/lib/focusState.test.ts src/lib/scrollState.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/focusState.* src/lib/scrollState.*
git commit -m "feat: track what the visitor points at and how far through a section they are"
```

---

### Task 2: The scene director

**Files:**
- Create: `frontend/src/three/SceneDirector.tsx`
- Create: `frontend/src/three/rigs.ts`
- Modify: `frontend/src/three/Stage.tsx`
- Test: `frontend/src/three/rigs.test.ts`

**Interfaces:**
- Consumes: `useSectionObserver` (via `Stage`'s existing `activeId`), `damp`, `scrollState`.
- Produces:
  - `rigFor(activeId: string): RigSpec | null` — pure; maps a section id to which model shows there and its pose.
  - `RigSpec = { id: string; model: string; position: [number,number,number]; scale: number; mobileScale: number; mobilePosition: [number,number,number] }`
  - `<SceneDirector activeId={string} />` — mounts at most one rig at a time and cross-fades.

- [ ] **Step 1: Write the failing test**

`rigs.test.ts`: every id in `NAV_ITEMS` plus `''` resolves to either a `RigSpec` or `null` without throwing; every returned `model` path starts with `/models/` and ends `.glb`; the hero (`''`) maps to the wizard; no two rigs share an `id`; every rig defines both a desktop and a mobile scale, and the mobile scale is smaller.

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/three/rigs.test.ts` → FAIL, module does not resolve.

- [ ] **Step 3: Write `rigs.ts`**

Keyed on section id — the same ids `NAV_ITEMS` exports — so adding a section is a one-line change here and nothing else.

```ts
export type RigSpec = {
  id: string
  model: string
  position: [number, number, number]
  scale: number
  mobilePosition: [number, number, number]
  mobileScale: number
}

/**
 * Which model presides over which section. Keyed on the section ids
 * useSectionObserver reports — NOT on scroll fractions. Adding or reordering a
 * section requires editing this table and nothing else, which is the whole
 * reason the v1 station system was deleted.
 *
 * Sections absent from this table simply have no model, and the hero rig is the
 * pre-intersection default.
 */
const RIGS: Record<string, RigSpec> = {
  '': {
    id: 'hero',
    model: '/models/wizard_improved.glb',
    position: [1.55, -0.9, 0],
    scale: 1.35,
    mobilePosition: [0, 0.35, -1.2],
    mobileScale: 0.75,
  },
  work: {
    id: 'work',
    model: '/models/spellcaster.glb',
    position: [-1.9, -0.8, -0.4],
    scale: 1.2,
    mobilePosition: [0, 0.3, -1.6],
    mobileScale: 0.62,
  },
  experience: {
    id: 'experience',
    model: '/models/pact_pair.glb',
    position: [1.8, -0.85, -0.3],
    scale: 1.1,
    mobilePosition: [0, 0.25, -1.7],
    mobileScale: 0.58,
  },
}

export function rigFor(activeId: string): RigSpec | null {
  return RIGS[activeId] ?? (activeId === '' ? RIGS[''] : null)
}
```

The positions above are **starting guesses**. Tuning them against real screenshots is part of Task 6, not a defect.

- [ ] **Step 4: Write `SceneDirector.tsx`**

Contract: renders at most one rig; cross-fades opacity when `activeId` changes; suspends per rig so a model downloads only when its section becomes active; unmounts a rig once faded out so its GPU memory is released.

```tsx
import { Suspense, useEffect, useRef, useState } from 'react'
import { CharacterRig } from './CharacterRig'
import { rigFor, type RigSpec } from './rigs'

export function SceneDirector({ activeId }: { activeId: string }) {
  const target = rigFor(activeId)
  // Keep the outgoing rig mounted until it has faded, so the swap is a dissolve
  // rather than a pop.
  const [current, setCurrent] = useState<RigSpec | null>(target)
  const [outgoing, setOutgoing] = useState<RigSpec | null>(null)
  const timer = useRef<number>()

  useEffect(() => {
    if (target?.id === current?.id) return
    setOutgoing(current)
    setCurrent(target)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOutgoing(null), 900)
    return () => window.clearTimeout(timer.current)
  }, [target?.id])

  return (
    <>
      {current && (
        <Suspense fallback={null}>
          <CharacterRig key={current.id} spec={current} fadeIn />
        </Suspense>
      )}
      {outgoing && (
        <Suspense fallback={null}>
          <CharacterRig key={outgoing.id} spec={outgoing} fadeIn={false} />
        </Suspense>
      )}
    </>
  )
}
```

- [ ] **Step 5: Mount it in `Stage.tsx`**

`Stage` already computes `activeId` for the backdrop tint. Pass the same value to `SceneDirector`, replacing the direct `HeroWizard` mount — the hero is now just the rig for `''`.

- [ ] **Step 6: Run the tests and commit**

```bash
git add src/three/rigs.* src/three/SceneDirector.tsx src/three/Stage.tsx
git commit -m "feat: one model slot, handed between sections as you read"
```

---

### Task 3: The character rig

**Files:**
- Create: `frontend/src/three/CharacterRig.tsx`
- Modify: `frontend/src/three/HeroWizard.tsx` (extract shared behaviour, or retire it into the rig)
- Test: `frontend/src/three/rigPose.test.ts`
- Create: `frontend/src/three/rigPose.ts`

**Interfaces:**
- Consumes: `useKtx2Gltf`, `applyWizardingMaterials`, `damp`, `scrollState`, `wizardState`, `focusState`, `RigSpec`.
- Produces: `<CharacterRig spec: RigSpec, fadeIn: boolean />`; `rigPose(pointerX, pointerY, focusBias, visible)` — pure, returning `{ yaw, pitch, lift, opacity }`.

- [ ] **Step 1: Write the failing test for `rigPose`**

Cases: centred pointer with no focus gives ~0 yaw; yaw and pitch clamp at the tilt limit for extreme pointer values; a non-zero `focusBias` shifts yaw beyond the pointer's contribution but still within a hard clamp; `visible: 0` gives `opacity: 0`; `lift` grows as `visible` falls.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Write `rigPose.ts`**

Generalises Task 5's `heroPose` from the predecessor plan: the same clamped pointer parallax, plus a `focusBias` term that lets a hovered project card turn the model. Keep `MAX_TILT` at 0.18 rad and clamp the combined result — a model that swings wildly reads as broken, not responsive.

- [ ] **Step 4: Write `CharacterRig.tsx`**

One component that loads any `RigSpec`'s model and animates it. Responsibilities:
- Load via `useKtx2Gltf` (never `useGLTF` — drei does not wire KTX2, and every one of these GLBs carries Basis textures).
- Clone the scene in a `useMemo` so HMR never mutates the cached GLTF's shared materials, and run `applyWizardingMaterials`, which passes `Glow_*` emissive materials through untouched for bloom.
- Collect the cloned materials **once** into a hoisted array so the per-frame opacity fade mutates that array rather than calling `scene.traverse` every frame.
- Pick `position`/`scale` from the spec's desktop or mobile pair via `isCoarsePointer()` or a width check.
- Per frame: `rigPose` → damped yaw/pitch/lift, a slow idle bob, the fade toward `fadeIn ? 1 : 0`, and the wand-glow intensity from `wizardState.intensity`.
- Early-return from the frame body when opacity has reached 0 and the rig is outgoing.

- [ ] **Step 5: Verify visually, then commit**

Screenshot at 1440 and 390 (see the verification recipe in Task 6) and confirm each rig appears in its own section without touching copy.

```bash
git commit -m "feat: one rig that can wear any of the models"
```

---

### Task 4: Projects that answer the pointer

**Files:**
- Modify: `frontend/src/components/site/ProjectCard.tsx`
- Modify: `frontend/src/three/CharacterRig.tsx`
- Modify: `frontend/src/components/site/ProjectCard.css`
- Test: `frontend/src/components/site/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: `setProjectFocus`, `clearProjectFocus`, `focusState`.
- Produces: project cards that report what is hovered or focused; a model that turns toward the active card and brightens its wand.

- [ ] **Step 1: Write the failing test**

`ProjectCard.test.tsx`: pointer-entering a card sets `focusState.projectSlug` to that card's slug with source `'pointer'`; pointer-leaving clears it; **focusing the card's link via keyboard sets it with source `'keyboard'`**, and blurring clears it. The keyboard case is not optional — it is how this interaction stays available to someone not using a mouse.

- [ ] **Step 2: Run it and watch it fail**

- [ ] **Step 3: Wire the card**

Add `onPointerEnter`/`onPointerLeave` and `onFocus`/`onBlur` (the latter on the `<article>`, using focus bubbling from its links) that call the focus setters with the card's slug. Pass `clearProjectFocus(slug)` so one card's leave cannot clear another's focus.

Add a CSS affordance so the reaction is not WebGL-only: a subtle border/elevation change on `:hover` and `:focus-within`, using existing tokens. This is what a no-WebGL visitor gets, and it must look deliberate on its own.

- [ ] **Step 4: React in the rig**

In `CharacterRig`'s frame body, derive a `focusBias` from `focusState.projectSlug` — for example, the index of the focused project mapped to a small yaw offset, so the model turns toward the card's side of the grid — and raise `wizardState.intensity`'s target while a card is focused. Damp both; never snap.

- [ ] **Step 5: Verify and commit**

Confirm by hovering in a real browser and by tabbing with the keyboard that the model responds to both, and that the CSS affordance stands on its own with WebGL disabled.

```bash
git commit -m "feat: the model looks at the project you are looking at"
```

---

### Task 5: The pinned moment

**Files:**
- Modify: `frontend/src/components/site/Skills.tsx` (or Experience — decide by eye)
- Modify: `frontend/src/three/CharacterRig.tsx`
- Modify: `frontend/src/three/Stage.tsx`
- Create: `frontend/src/components/site/Pinned.css`

**Interfaces:**
- Consumes: `registerPinnedSection`, `scrollState.pinnedProgress`.
- Produces: one section where the model holds the centre and turns through its own scroll span.

- [ ] **Step 1: Register the section**

`Stage` (or the chosen section component) calls `registerPinnedSection('<id>')` on mount and `registerPinnedSection(null)` on unmount, so the tracker only measures while it is mounted.

- [ ] **Step 2: Drive rotation from local progress**

In `CharacterRig`, when the rig's id matches the pinned section, add `scrollState.pinnedProgress * TURN` (roughly one half-turn across the section) to the damped yaw. Because `pinnedProgress` is computed from the section's own rect, this stays correct no matter where the section sits in the document — the property the v1 station system lacked.

- [ ] **Step 3: Give the copy room**

The model needs the centre for this beat, so the section's content should sit to one side while it is active. Use a CSS grid change scoped to that section — not a JS layout change — and make sure the mobile layout keeps the copy above the model rather than behind it.

- [ ] **Step 4: Verify the no-WebGL path**

With the canvas gated off, the section must still read as a normal, well-composed section. If the copy looks stranded to one side without the model, adjust so the layout stands alone.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: one section where the model holds the centre"
```

---

### Task 6: Interaction polish, performance, and the visual pass

**Files:**
- Create: `frontend/src/components/ui/Magnetic.tsx`, `Magnetic.css`
- Modify: `frontend/src/components/site/Hero.tsx`
- Modify: `frontend/vite.config.ts` if chunking needs it
- Test: `frontend/src/components/ui/Magnetic.test.tsx`

**Interfaces:**
- Produces: `<Magnetic>` — a wrapper giving its child a small cursor-follow offset on fine pointers, inert under `prefers-reduced-motion` and on coarse pointers.

- [ ] **Step 1: Magnetic CTAs**

Wrap the hero's three CTAs. The offset is a few pixels of `translate` damped toward the cursor while it is within a radius; it must never move the element far enough to break the ≥44px hit area or to make the button hard to click. Disabled entirely when `prefersReducedMotion()` or `isCoarsePointer()`. Test both gates.

- [ ] **Step 2: Model payload discipline**

Confirm in the Network panel that visiting the page and stopping at the hero downloads **only** `wizard_improved.glb` — not the spellcaster or pact pair. If all models load upfront, the per-rig `Suspense` boundary is not doing its job; fix it before continuing.

Record the actual transferred bytes for: hero only, hero → work, and a full scroll to the bottom.

- [ ] **Step 3: Frame budget**

With the Performance panel, scroll the whole page and confirm: no long task over 200ms after load, frame rate above 50fps through each transition, and GPU work dropping when no rig is active. If a cross-fade drops frames, shorten it or reduce the outgoing rig's work — do not remove the dissolve.

- [ ] **Step 4: The visual pass**

```
npm run build
SHOOT_URL=http://localhost:4175/ npm run shoot
```

**`tools/shoot.mjs` defaults to port 4173, which an unrelated project occupies on this machine — always pass `SHOOT_URL`.**

Read back every `desktop-*.png` and `mobile-*.png`. Tune the `rigs.ts` position/scale constants until, at both widths: no model overlaps copy, each model is fully in frame rather than clipped at an edge, and the transitions land the model somewhere deliberate. Then invoke the `design-critique-loop` skill on the results.

- [ ] **Step 5: Lighthouse and the fallback paths**

Re-run Lighthouse mobile: accessibility must stay at 100 and performance at or above the pre-plan number. Then verify with WebGL disabled and with `prefers-reduced-motion: reduce`: every section still reads, the project hover affordance still works, and no model or canvas is fetched.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: magnetic CTAs, and the model payload only arrives when earned"
```

---

## Self-Review

**Spec coverage:** The spec's §5 3D architecture named a hero set piece, section backdrops, and a chat-reactive wizard; this plan extends that to per-section rigs and pointer reaction, which the spec did not anticipate but does not forbid — the binding constraints it does impose (content independent of the canvas, reduced-motion and WebGL gates, no content buried in a rig) are carried into this plan's Global Constraints verbatim and enforced per task.

**The v1 regression risk is the thing to watch.** Every task keys off section ids from `IntersectionObserver`, and the one place that maps sections to models is a single table in `rigs.ts`. If a reviewer finds a scroll fraction hard-coded anywhere in this plan's output, that is an Important finding regardless of whether it works.

**Type consistency:** `RigSpec` is defined in `rigs.ts` (Task 2) and consumed by `SceneDirector` (Task 2) and `CharacterRig` (Task 3). `focusState`/`setProjectFocus`/`clearProjectFocus` are defined in Task 1 and consumed in Tasks 3 and 4. `sectionProgress`/`registerPinnedSection`/`scrollState.pinnedProgress` are defined in Task 1 and consumed in Task 5.

**Open judgment calls left to the implementer, deliberately:** which section gets the pinned moment, the exact rig transforms, and the cross-fade duration. All three are visual decisions that cannot be specified correctly in text and must be tuned against screenshots.
