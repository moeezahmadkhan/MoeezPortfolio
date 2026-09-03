# Mobile Interaction, Section Accent & Chat Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give touch visitors the affordances the desktop site already has, fix four measured mobile layout defects, shift the accent colour by section, and render the links the chat already emits as clickable — proving afterwards that desktop did not move.

**Architecture:** One new shared-observer primitive (`useNearFocus`) supplies "hover" on a coarse pointer, mirroring how `registerMagnetic` shares one rAF loop. The accent is a registered `@property` custom property on `<html>`, driven by the existing `useSectionObserver` — no scroll fractions. Chat links are parsed into React nodes; no HTML is ever injected.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + @testing-library/react, plain CSS with custom properties, Puppeteer-based check scripts.

**Spec:** `docs/superpowers/specs/2026-09-03-mobile-interaction-and-accent-design.md`

## Global Constraints

Copied verbatim from `frontend/CLAUDE.md` and the spec. Every task's requirements implicitly include these.

- **All commands run from `frontend/`.** The repo root holds `docs/`, `backend/`, `ml/`; the site is in `frontend/`.
- **Two easing curves only.** `--ease` for anything arriving and settling, `--ease-loop` for anything `infinite`. `src/styles/tokens.test.ts` asserts `tokens.css` contains exactly two `cubic-bezier` occurrences. Never declare a curve inline.
- **Never animate a layout-triggering property:** `top`, `left`, `right`, `bottom`, `inset`, `width`, `height`, `min-width`, `min-height`, `max-width`, `margin`, `padding`, `gap`, `font-size`. Prefer `transform` and `opacity`. A paint-only change (colour, border tint) on a discrete hover or focus is fine.
- **Anything that appears must also have a way to leave.** `src/test/motion-language.test.ts` flags any CSS block with a one-shot `animation` and no `transition` in the same block. `ENTRANCE_EXCEPTIONS = ['hero-in']` is the only exemption and must not be widened.
- **Never key motion to hard-coded scroll fractions.** Section membership comes from `useSectionObserver`.
- **Per-frame state lives in mutable module singletons.** Never React state in a per-frame or per-pointer-event path.
- **Banned words** (build fails, `src/test/copy-voice.test.ts`): grimoire, owl post, owlpost, spellbook, incantation, chronicles, familiar, muggle, hogwarts.
- **All visible portfolio text lives in `src/content/`.** Never invent metrics, dates, client names or employer details. UI chrome labels (e.g. a disclosure's "Details") are not portfolio content and may be written in JSX.
- **`--gold` is not repointed.** `--accent` is a new, opt-in token. `--gold: #e7c27d`, `--teal: #5fd3c6`, `--ink: #07070d` are asserted by `tokens.test.ts` and must survive verbatim.
- **The chat teal stays reserved for the AI surface.** No accent hue goes near it.
- **Design tokens live in `src/styles/tokens.css`.** Use the variables in components; bare hex is allowed only inside `src/three/`.
- **`npm run build` runs `tsc -b` first.** A type error fails the build.
- Commit after every task.

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `src/lib/useNearFocus.ts` | Shared IntersectionObserver that marks the one registered element nearest the viewport's centre with `is-near`. Coarse pointer only. |
| `src/lib/useNearFocus.test.ts` | Its unit tests. |
| `src/components/chat/linkify.ts` | Pure string → `Array<string \| LinkPart>` splitter. No React, no DOM. |
| `src/components/chat/linkify.test.ts` | Its unit tests. |

**Modified**

| Path | Change |
|---|---|
| `src/components/site/ProjectCard.tsx` | Attach `useNearFocus`; wrap `.card__detail` in a `<details>` on narrow screens. |
| `src/components/site/ProjectCard.css` | `is-near` selector; disclosure styling. |
| `src/components/ui/Timeline.tsx` | Attach `useNearFocus` to each item. |
| `src/components/ui/Timeline.css` | `is-near` selector; `--accent` on `.timeline__period`. |
| `src/components/ui/Button.css` | Coarse-pointer `:active` press state. |
| `src/components/ui/Tag.css` | Coarse-pointer `:active`; `--accent` border. |
| `src/lib/useScramble.ts` | Return `run()`. |
| `src/lib/useScramble.test.tsx` | Cover `run()`. |
| `src/components/layout/Nav.tsx` | Staggered decode on mobile-menu open. |
| `src/components/layout/Nav.css` | `--accent` on `.nav__marker`; coarse `:active`. |
| `src/styles/tokens.css` | `@property --accent`, the six-row ramp, the transition, the narrowed `--figure-band`. |
| `src/styles/tokens.test.ts` | Assert the ramp's shape. |
| `src/App.tsx` | Write `documentElement.dataset.section`. |
| `src/components/layout/Section.css` | `scroll-margin-top`; mobile rhythm. |
| `src/components/site/Skills.css` | `--accent` on `.skills__title`. |
| `src/components/site/Hero.css` | Mobile thesis step-down. |
| `src/three/rigs.ts` | `MOBILE_STATIONS` hero scale, retuned against the new band. |
| `src/components/chat/DockPointer.tsx` | Delete the compact trail. |
| `src/components/chat/DockPointer.css` | Delete `--compact` rules. |
| `src/components/chat/DockPointer.test.tsx` | Repoint the compact-trail tests. |
| `src/components/chat/ChatDock.tsx` | Launcher hint state. |
| `src/components/chat/ChatDock.css` | Launcher pulse ring; `.chat__msg a`. |
| `src/components/chat/ChatMessage.tsx` | Render linkified parts. |

---

### Task 1: Capture the audit baseline

No source changes. This must run **before any edit** or the audit in Task 11 has nothing to compare against.

**Files:**
- Create: `.shots-baseline/` (git-ignored)
- Modify: `frontend/.gitignore`

- [ ] **Step 1: Confirm the working tree is clean of this plan's files**

```bash
cd frontend && git status --short
```

Expected: nothing under `src/` modified. If another session has edits there, stop and ask — `frontend/CLAUDE.md` records that other sessions edit this repo, and a baseline captured over someone else's work is worthless.

- [ ] **Step 2: Build and start the preview server**

```bash
npm run build && npm run preview &
```

Expected: `tsc -b` passes, Vite reports a local preview URL (usually `http://localhost:4173`).

- [ ] **Step 3: Shoot the baseline**

```bash
npm run shoot
```

Expected: `shot 2 widths into .shots/`. `tools/shoot.mjs` writes `.shots/<width>-<section>.png` for both widths and every section.

- [ ] **Step 4: Preserve it under a name Task 11 can find**

```bash
rm -rf .shots-baseline && cp -r .shots .shots-baseline && ls .shots-baseline | wc -l
```

Expected: a non-zero count, matching `ls .shots | wc -l`.

- [ ] **Step 5: Record the four defect numbers**

With the preview still running, in a browser at 390x844 (mobile emulation, dpr 2):

```js
const hero = document.querySelector('.hero')
console.log({
  heroH: hero.getBoundingClientRect().height,   // baseline: 911.09
  svh: innerHeight,                              // 844
  scrollMarginTop: getComputedStyle(document.getElementById('work')).scrollMarginTop, // '0px'
  workH: document.getElementById('work').getBoundingClientRect().height, // 3894.44
  docH: document.documentElement.scrollHeight,   // 9430
})
```

Paste the output into the commit message. These are the numbers Task 11 re-measures.

- [ ] **Step 6: Ignore the baseline directory and commit**

Add to `frontend/.gitignore` if `.shots` is listed but `.shots-baseline` is not:

```
.shots-baseline/
```

```bash
git add .gitignore
git commit -m "chore: ignore the screenshot audit baseline

Baseline captured before the mobile interaction work. Measured at 390x844:
hero 911.09px vs 844svh, scroll-margin-top 0px, #work 3894.44px, doc 9430px."
```

---

### Task 2: `useNearFocus` — the touch-hover primitive

**Files:**
- Create: `src/lib/useNearFocus.ts`
- Test: `src/lib/useNearFocus.test.ts`

**Interfaces:**
- Consumes: `useMatchMedia` from `src/lib/useMatchMedia.ts` — `(query: string) => boolean`.
- Produces:
  - `NEAR_CLASS: string` (`'is-near'`)
  - `NEAR_ROOT_MARGIN: string` (`'-45% 0px -45% 0px'`)
  - `registerNear(el: Element): () => void`
  - `useNearFocus<T extends HTMLElement>(): React.RefObject<T>`
  - `resetNearFocus(): void` — test-only

- [ ] **Step 1: Write the failing test**

Create `src/lib/useNearFocus.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NEAR_CLASS, registerNear, resetNearFocus } from './useNearFocus'

type Cb = (entries: IntersectionObserverEntry[]) => void

let callback: Cb
let disconnected = 0
let observing: Element[] = []

function stubObserver() {
  disconnected = 0
  observing = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: Cb) {
        callback = cb
      }
      observe(el: Element) {
        observing.push(el)
      }
      unobserve(el: Element) {
        observing = observing.filter((o) => o !== el)
      }
      disconnect() {
        disconnected += 1
      }
    },
  )
}

function entry(target: Element, ratio: number): IntersectionObserverEntry {
  return {
    target,
    intersectionRatio: ratio,
    isIntersecting: ratio > 0,
  } as IntersectionObserverEntry
}

function makeCards(n: number): HTMLElement[] {
  document.body.innerHTML = Array.from({ length: n }, () => '<article></article>').join('')
  return [...document.body.querySelectorAll('article')] as HTMLElement[]
}

afterEach(() => {
  resetNearFocus()
  document.body.innerHTML = ''
})

describe('useNearFocus', () => {
  it('marks exactly one element — the deepest into the band', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    registerNear(a)
    registerNear(b)

    callback([entry(a, 0.3), entry(b, 0.9)])
    expect(b.classList.contains(NEAR_CLASS)).toBe(true)
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
  })

  it('moves the mark rather than accumulating marks', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    registerNear(a)
    registerNear(b)

    callback([entry(a, 0.9), entry(b, 0.1)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    callback([entry(a, 0.1), entry(b, 0.95)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
    expect(b.classList.contains(NEAR_CLASS)).toBe(true)
    expect(document.querySelectorAll(`.${NEAR_CLASS}`)).toHaveLength(1)
  })

  it('marks nothing when every element has left the band', () => {
    stubObserver()
    const [a] = makeCards(1)
    registerNear(a)

    callback([entry(a, 0.8)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    callback([{ target: a, intersectionRatio: 0, isIntersecting: false } as IntersectionObserverEntry])
    expect(document.querySelectorAll(`.${NEAR_CLASS}`)).toHaveLength(0)
  })

  it('shares one observer across every registration', () => {
    stubObserver()
    const spy = vi.spyOn(window, 'IntersectionObserver')
    const [a, b, c] = makeCards(3)
    registerNear(a)
    registerNear(b)
    registerNear(c)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(observing).toHaveLength(3)
  })

  it('disconnects once the last element unregisters, and strips its class', () => {
    stubObserver()
    const [a, b] = makeCards(2)
    const offA = registerNear(a)
    const offB = registerNear(b)

    callback([entry(a, 0.9)])
    expect(a.classList.contains(NEAR_CLASS)).toBe(true)

    offA()
    expect(a.classList.contains(NEAR_CLASS)).toBe(false)
    expect(disconnected).toBe(0)

    offB()
    expect(disconnected).toBe(1)
  })

  it('uses a band across the middle of the viewport, not the whole viewport', () => {
    // A card must light when the reader is looking at it, not when it has
    // merely entered the screen — the same reasoning as useSectionObserver's
    // rootMargin, tightened because this picks one card, not one section.
    stubObserver()
    const spy = vi.spyOn(window, 'IntersectionObserver')
    const [a] = makeCards(1)
    registerNear(a)
    expect(spy.mock.calls[0][1]?.rootMargin).toBe('-45% 0px -45% 0px')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/useNearFocus.test.ts
```

Expected: FAIL — `Failed to resolve import "./useNearFocus"`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/useNearFocus.ts`:

```ts
import { useEffect, useRef } from 'react'
import { useMatchMedia } from './useMatchMedia'

/**
 * What a touch visitor gets in place of `:hover`.
 *
 * Every hover affordance on this site is switched off on a coarse pointer, for
 * good reasons that have not changed: `mouseenter` fires on a tap, so a decode
 * or a lift would sit between the press and the navigation. But switching them
 * off left a phone with a static page, and the card lift is not decoration —
 * it is the affordance that says a card is a thing rather than a paragraph.
 *
 * So the trigger moves instead of disappearing. The element a reader has
 * scrolled to the middle of the screen is the element they are looking at, and
 * it gets what a cursor would have given it. No tap is involved, so nothing is
 * delayed and no state can stick after the finger leaves.
 *
 * One observer is shared across every registration, created on the first and
 * disconnected on the last — the same lifecycle `registerMagnetic` gives its
 * window listeners, and for the same reason: a fine-pointer visitor registers
 * nothing, so nothing is ever constructed.
 */
export const NEAR_CLASS = 'is-near'

/**
 * A 10% band across the middle of the viewport.
 *
 * Tighter than `useSectionObserver`'s 15%, because that one picks a section and
 * this one picks a card. Widen it and a tall section lights two cards at once,
 * which reads as a bug rather than as attention.
 */
export const NEAR_ROOT_MARGIN = '-45% 0px -45% 0px'

let observer: IntersectionObserver | null = null
/** Everything registered, marked or not — what decides when to disconnect. */
const registered = new Set<Element>()
/** Only what is currently inside the band, and how deeply. */
const ratios = new Map<Element, number>()
let marked: Element | null = null

/**
 * Winner-take-all, like `useSectionObserver`. Without it every card inside a
 * tall section carries the mark at once.
 */
function pick(): void {
  let best: Element | null = null
  let bestRatio = 0
  for (const [el, ratio] of ratios) {
    if (ratio > bestRatio) {
      best = el
      bestRatio = ratio
    }
  }
  if (best === marked) return
  marked?.classList.remove(NEAR_CLASS)
  best?.classList.add(NEAR_CLASS)
  marked = best
}

function ensureObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) ratios.set(entry.target, entry.intersectionRatio)
        else ratios.delete(entry.target)
      }
      pick()
    },
    { rootMargin: NEAR_ROOT_MARGIN, threshold: [0, 0.25, 0.5, 1] },
  )
  return observer
}

/**
 * Adds one element to the shared observer. Returns the teardown.
 *
 * The class is written straight onto the node. This is deliberately not React
 * state: a scroll down a section crosses every card in it, and routing that
 * through `setState` would re-render one component per crossing for a change
 * the compositor could have made alone.
 */
export function registerNear(el: Element): () => void {
  registered.add(el)
  ensureObserver().observe(el)

  return () => {
    registered.delete(el)
    ratios.delete(el)
    observer?.unobserve(el)
    el.classList.remove(NEAR_CLASS)
    if (marked === el) marked = null
    if (registered.size === 0) {
      observer?.disconnect()
      observer = null
      ratios.clear()
      marked = null
      return
    }
    pick()
  }
}

/** Test-only: drops the shared observer and every mark. */
export function resetNearFocus(): void {
  observer?.disconnect()
  observer = null
  registered.clear()
  ratios.clear()
  marked?.classList.remove(NEAR_CLASS)
  marked = null
}

/**
 * Spread the returned ref onto the element that should take the mark.
 *
 * Gated on a LIVE coarse-pointer query rather than a one-shot probe, so a
 * hybrid laptop that gains or loses a mouse mid-visit registers or unregisters
 * rather than staying wrong until reload — the same choice `Magnetic` makes.
 */
export function useNearFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const coarse = useMatchMedia('(pointer: coarse)')

  useEffect(() => {
    if (!coarse || !ref.current) return
    return registerNear(ref.current)
  }, [coarse])

  return ref
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/useNearFocus.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useNearFocus.ts src/lib/useNearFocus.test.ts
git commit -m "feat: add useNearFocus, the coarse-pointer stand-in for :hover

One shared IntersectionObserver marks the single registered element deepest
into a 10% band across the viewport's middle. Winner-take-all so a tall
section never lights two cards, class written straight to the node so a
scroll past six cards is not six re-renders, and the observer is constructed
on the first registration and disconnected on the last — a fine-pointer
visitor registers nothing and pays nothing."
```

---

### Task 3: Wire `is-near` into cards and the timeline

**Files:**
- Modify: `src/components/site/ProjectCard.tsx`, `src/components/site/ProjectCard.css`
- Modify: `src/components/ui/Timeline.tsx`, `src/components/ui/Timeline.css`
- Test: `src/components/site/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: `useNearFocus` from Task 2.
- Produces: `.card.is-near` and `.timeline__item.is-near` styled inside `@media (pointer: coarse)`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/site/ProjectCard.test.tsx`:

```tsx
import { readFileSync } from 'node:fs'

describe('the touch stand-in for hover', () => {
  const css = readFileSync('src/components/site/ProjectCard.css', 'utf8')

  it('gives .card.is-near the same affordance as :hover, on a coarse pointer only', () => {
    // The lift must live behind the pointer query. A fine pointer already has
    // :hover, and a card that also lit on scroll there would fight the cursor.
    const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))
    expect(coarse).toContain('.card.is-near')
  })

  it('strips the lift from .is-near under reduced motion, keeping the tint', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toContain('.card.is-near')
    expect(reduced).toContain('transform: none')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/site/ProjectCard.test.tsx
```

Expected: FAIL — the `@media (pointer: coarse)` slice does not contain `.card.is-near`.

- [ ] **Step 3: Implement**

In `src/components/site/ProjectCard.tsx`, import the hook and attach the ref to the `<article>`:

```tsx
import { useNearFocus } from '../../lib/useNearFocus'
```

```tsx
export function ProjectCard({ project }: { project: Project }) {
  const headingId = `project-${project.slug}`
  const nearRef = useNearFocus<HTMLElement>()
  return (
    <article
      className="card"
      ref={nearRef}
      aria-labelledby={headingId}
      onPointerEnter={() => setProjectFocus(project.slug, 'pointer')}
      onPointerLeave={() => clearProjectFocus(project.slug)}
      onFocus={() => setProjectFocus(project.slug, 'keyboard')}
      onBlur={() => clearProjectFocus(project.slug)}
    >
```

In `src/components/site/ProjectCard.css`, extend the reduced-motion block and add the coarse-pointer rule. Replace the existing reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
  .card:hover,
  .card:focus-within,
  .card.is-near {
    transform: none;
  }
}
```

And add, next to the existing `@media (pointer: coarse)` block at the foot of the file:

```css
@media (pointer: coarse) {
  /* What a phone gets instead of :hover. `is-near` is written by
     lib/useNearFocus.ts onto whichever card is deepest into the middle of the
     screen — the card the reader is actually looking at. Same declarations as
     the :hover rule above, deliberately: this is the same affordance reaching
     the same person by a different route, not a second, weaker one.

     Behind the pointer query because a fine pointer already has :hover, and a
     card that ALSO lit on scroll there would contradict the cursor. */
  .card.is-near {
    border-color: rgb(var(--gold-rgb) / 0.36);
    transform: translateY(-2px);
    box-shadow: 0 12px 24px -18px rgb(var(--gold-rgb) / 0.45);
  }
}
```

In `src/components/ui/Timeline.tsx`, give each item the ref. The file currently maps inline, and a hook cannot be called inside a `.map` callback — so extract a `TimelineRow`, for the same reason `NavLink` and `CardLink` are their own components. Replace the file's body with:

```tsx
import type { Role } from '../../content'
import { useNearFocus } from '../../lib/useNearFocus'
import './Timeline.css'

/**
 * One role, its own component so `useNearFocus` is called once per row rather
 * than inside a `.map` callback.
 */
function TimelineRow({ role }: { role: Role }) {
  const nearRef = useNearFocus<HTMLLIElement>()
  return (
    <li className="timeline__item" ref={nearRef}>
      <p className="timeline__period">{role.period}</p>
      <div className="timeline__body">
        <h3 className="timeline__role">{`${role.title} · ${role.org}`}</h3>
        <ul className="timeline__bullets">
          {role.bullets.map((bullet) => (
            <li key={bullet.slice(0, 24)}>{bullet}</li>
          ))}
        </ul>
      </div>
    </li>
  )
}

export function Timeline({ roles }: { roles: Role[] }) {
  return (
    <ol className="timeline">
      {roles.map((role) => (
        <TimelineRow role={role} key={`${role.org}-${role.period}`} />
      ))}
    </ol>
  )
}
```

In `src/components/ui/Timeline.css`:

```css
@media (pointer: coarse) {
  /* The timeline's rows are separated by a hairline and nothing else, so on a
     phone there is no signal at all for which one is being read. is-near warms
     the rule the row sits on. Paint only — a row that also lifted would drag
     the rows under it. */
  .timeline__item.is-near {
    border-top-color: rgb(var(--gold-rgb) / 0.36);
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/site/ProjectCard.test.tsx src/components/ui/
```

Expected: PASS.

- [ ] **Step 5: Run the whole suite and the type gate**

```bash
npm test && npx tsc -b
```

Expected: all green. `motion-language.test.ts` must stay green — the new rules animate `border-color`, `transform` and `box-shadow`, none of which are layout properties, and they are transitions on `.card`'s existing `transition`, not new animations.

- [ ] **Step 6: Commit**

```bash
git add src/components/site/ProjectCard.tsx src/components/site/ProjectCard.css \
        src/components/ui/Timeline.tsx src/components/ui/Timeline.css \
        src/components/site/ProjectCard.test.tsx
git commit -m "feat: cards and timeline rows respond on touch

A phone got no hover affordance at all: every one on the site is gated off a
coarse pointer, and nothing replaced them. useNearFocus marks whichever card
is centred in the viewport and it takes the same lift :hover gives — same
declarations, so it reads as the same affordance, not a weaker second one.
Timeline rows warm their rule instead of lifting; a row that lifted would
drag the rows beneath it."
```

---

### Task 4: Press feedback on coarse pointers

**Files:**
- Modify: `src/components/ui/Button.css`, `src/components/ui/Tag.css`, `src/components/layout/Nav.css`, `src/components/chat/ChatDock.css`
- Test: `src/test/motion-language.test.ts` (must stay green — no new test file)

**Interfaces:**
- Consumes: nothing.
- Produces: `:active` states scoped to `@media (pointer: coarse)`.

- [ ] **Step 1: Write the failing test**

Append to `src/styles/tokens.test.ts` — this belongs with the design-token assertions because it is a cross-component rule:

```ts
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function walk(dir: string, match: RegExp): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return walk(full, match)
    return match.test(entry) ? [full] : []
  })
}

describe('press feedback', () => {
  // A tap has no hover to precede it, so without an :active state a control on
  // a phone gives no sign it was hit until the page has already changed.
  const controls = [
    ['src/components/ui/Button.css', '.btn:active'],
    ['src/components/ui/Tag.css', '.tag:active'],
    ['src/components/layout/Nav.css', '.nav__link:active'],
    ['src/components/chat/ChatDock.css', '.chat__launcher:active'],
  ] as const

  for (const [file, selector] of controls) {
    it(`gives ${selector} a press state behind the coarse-pointer query`, () => {
      const css = readFileSync(file, 'utf8')
      const coarse = css.slice(css.indexOf('@media (pointer: coarse)'))
      expect(css).toContain('@media (pointer: coarse)')
      expect(coarse).toContain(selector)
    })
  }

  it('never presses with a scale that would re-flow anything', () => {
    // scale is a transform. A press implemented with padding or font-size
    // would re-flow the row the control sits in.
    for (const file of walk('src', /\.css$/)) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      for (const block of css.matchAll(/([^{}]*:active[^{}]*)\{([^{}]*)\}/g)) {
        expect(block[2]).not.toMatch(/(?:^|[;\s])(padding|font-size|width|height)\s*:/)
      }
    }
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/styles/tokens.test.ts
```

Expected: FAIL on all four `:active` assertions.

- [ ] **Step 3: Implement**

Append to `src/components/ui/Button.css`:

```css
@media (pointer: coarse) {
  /* A tap has no hover in front of it. Without this the only sign a button was
     pressed is the page already having changed, which on a slow connection is
     a second of nothing. `scale` is a transform, so the row the button sits in
     never re-flows; `.btn` already transitions, and scale settles on --ease
     with everything else. */
  .btn:active {
    transform: scale(0.98);
  }

  .btn--solid:active {
    background: var(--gold-bright);
  }

  .btn--ghost:active {
    border-color: rgb(var(--gold-rgb) / 0.5);
    color: var(--gold);
  }
}
```

`.btn`'s existing `transition` shorthand must gain `transform`:

```css
  transition:
    background 0.2s var(--ease),
    border-color 0.2s var(--ease),
    color 0.2s var(--ease),
    transform 0.2s var(--ease);
```

Append to `src/components/ui/Tag.css`:

```css
.tag {
  transition:
    border-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

@media (pointer: coarse) {
  .tag:active {
    border-color: rgb(var(--gold-rgb) / 0.4);
    color: var(--text);
  }
}
```

(Merge the `transition` into the existing `.tag` block rather than declaring a second one.)

Append to `src/components/layout/Nav.css`:

```css
@media (pointer: coarse) {
  /* The mobile menu's rows are the primary navigation on a phone, and a tap on
     one gives no feedback before the smooth scroll starts moving. Colour only:
     a row that also scaled would shift its neighbours in a vertical panel. */
  .nav__link:active,
  .nav__cv:active {
    color: var(--text);
  }
}
```

In `src/components/chat/ChatDock.css`, beside the existing `.chat__launcher:hover`:

```css
@media (pointer: coarse) {
  /* The launcher has a hover lift that a phone never sees. This is the same
     gesture, downward, on the press. */
  .chat__launcher:active {
    transform: scale(0.97);
  }

  .chat__starters button:active {
    border-color: var(--teal);
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/styles/tokens.test.ts src/test/motion-language.test.ts
```

Expected: PASS. `motion-language` must stay green: every new declaration is `transform`, `background`, `border-color` or `color`, and every transition names `var(--ease)`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Button.css src/components/ui/Tag.css \
        src/components/layout/Nav.css src/components/chat/ChatDock.css \
        src/styles/tokens.test.ts
git commit -m "feat: press feedback for tap targets on a coarse pointer

A tap has no hover before it, so until now the only confirmation a control was
hit was the page having already changed. Scale on the buttons and the
launcher, colour on the nav rows — a row that scaled would shift its
neighbours in a vertical panel. Transform and paint only; nothing re-flows.
A test asserts no :active rule anywhere animates padding, font-size, width or
height."
```

---

### Task 5: The scramble decode reaches the mobile menu

**Files:**
- Modify: `src/lib/useScramble.ts`
- Modify: `src/components/layout/Nav.tsx`
- Test: `src/lib/useScramble.test.tsx`

**Interfaces:**
- Consumes: `SCRAMBLE_MS`, `revealedCount`, `scrambleFrame` from `src/lib/scramble.ts` (unchanged).
- Produces: `useScramble(label: string)` now returns `{ ref, run, onMouseEnter, onMouseLeave, 'aria-label' }` — `run: () => void` is added; every existing key keeps its current type and behaviour.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/useScramble.test.tsx`:

The file drives frames by hand (`pending`, `nextFrame`, the stubbed `requestAnimationFrame` in its `beforeEach`) and renders a `<Link>` probe rather than using `renderHook`. Match that harness exactly. Add a second probe beside the existing `Link`, near the top of the file:

```tsx
/** Fires the decode on demand, the way the mobile menu does on open. */
function RunLink({ label }: { label: string }) {
  const { run, ...decode } = useScramble(label)
  return (
    <>
      <a href="#work" {...decode}>
        {label}
      </a>
      <button type="button" onClick={run}>
        run
      </button>
    </>
  )
}
```

Then append:

```tsx
describe('run()', () => {
  it('decodes on a coarse pointer, where onMouseEnter deliberately will not', () => {
    // The coarse bail on onMouseEnter exists because mouseenter fires on a TAP
    // and the decode would sit between the press and the navigation. Opening a
    // menu is not a tap on the link being decoded, so that reasoning does not
    // reach run() — and this is the only way a phone sees the effect at all.
    stubMatchMedia(['(pointer: coarse)'])
    render(<RunLink label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.mouseEnter(link)
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    nextFrame(0)
    expect(link.textContent).not.toBe('View work')
    for (const char of link.textContent!.replace(/ /g, '')) expect(GLYPHS).toContain(char)

    nextFrame(500)
    expect(link.textContent).toBe('View work')
  })

  it('still does nothing under reduced motion', () => {
    // That bail is about the motion itself, not about the tap, so it stays.
    stubMatchMedia(['(prefers-reduced-motion: reduce)'])
    render(<RunLink label="View work" />)
    const link = screen.getByRole('link')

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    expect(pending.size).toBe(0)
    expect(link.textContent).toBe('View work')
    expect(link.style.width).toBe('')
  })

  it('freezes the box for the decode, as the hover path does', () => {
    stubMatchMedia(['(pointer: coarse)'])
    render(<RunLink label="View work" />)

    fireEvent.click(screen.getByRole('button', { name: 'run' }))
    expect(screen.getByRole('link').style.width).toBe('84px')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/lib/useScramble.test.tsx
```

Expected: FAIL — `result.current.run is not a function`.

- [ ] **Step 3: Implement**

In `src/lib/useScramble.ts`, split the decode out of `onMouseEnter`:

```ts
  /**
   * Runs the decode outright, whatever the pointer is.
   *
   * `onMouseEnter` bails on a coarse pointer because `mouseenter` fires on a
   * TAP there, and a decode between the press and the navigation is a delay
   * the visitor did not ask for. That reasoning is about the tap, not about
   * the effect: opening the mobile menu is a different gesture on a different
   * control, and the links it reveals are not being pressed. So the menu can
   * call this and a phone finally sees the decode the desktop nav has always
   * had.
   *
   * Reduced motion still stops it. That bail is about the motion itself.
   */
  const run = useCallback(() => {
    const node = nodeRef.current
    if (!node || prefersReducedMotion()) return
    settle()
    node.style.width = `${node.getBoundingClientRect().width}px`
    const started = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / SCRAMBLE_MS)
      if (t >= 1) return settle()
      node.textContent = scrambleFrame(label, revealedCount(label, t))
      frameRef.current = requestAnimationFrame(step)
    }
    frameRef.current = requestAnimationFrame(step)
  }, [label, settle])

  const onMouseEnter = useCallback(() => {
    if (isCoarsePointer()) return
    run()
  }, [run])
```

Return it:

```ts
  return { ref, run, onMouseEnter, onMouseLeave: settle, 'aria-label': label }
}
```

**Important:** `NavLink`, `CvLink` and `CardLink` spread this object onto a DOM element. `run` is not a valid DOM attribute and React will warn. Each consumer must destructure it off:

```tsx
function NavLink({ id, label, current, onNavigate, openSeq, index }: {
  id: string
  label: string
  current: boolean
  onNavigate: () => void
  openSeq: number
  index: number
}) {
  const { run, ...decode } = useScramble(label)

  // Staggered on the panel opening, not on a tap. `openSeq` increments each
  // time the menu opens, so re-opening replays it; the timer is cleared on the
  // way out so a menu closed mid-stagger leaves no decode running against a
  // hidden panel.
  useEffect(() => {
    if (openSeq === 0) return
    const timer = window.setTimeout(run, index * 60)
    return () => window.clearTimeout(timer)
  }, [openSeq, index, run])

  return (
    <a
      href={`#${id}`}
      className="nav__link"
      aria-current={current ? 'true' : undefined}
      onClick={onNavigate}
      {...decode}
    >
      {label}
    </a>
  )
}
```

Do the same destructure in `CvLink` (`const { run: _run, ...decode } = useScramble(CV_LABEL)`) and in `CardLink` in `ProjectCard.tsx`.

In `Nav()`, track the counter and pass it down:

```tsx
  const [openSeq, setOpenSeq] = useState(0)
```

```tsx
        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          onClick={() =>
            setOpen((v) => {
              if (!v) setOpenSeq((n) => n + 1)
              return !v
            })
          }
        >
```

```tsx
          {NAV_ITEMS.map((item, index) => (
            <NavLink
              key={item.id}
              id={item.id}
              label={item.label}
              current={active === item.id}
              onNavigate={() => setOpen(false)}
              openSeq={openSeq}
              index={index}
            />
          ))}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/lib/useScramble.test.tsx src/components/layout/Nav.test.tsx
```

Expected: PASS, and no `React does not recognize the "run" prop` warning in the output. If one appears, a consumer is still spreading `run`.

- [ ] **Step 5: Verify the decode in a real browser**

```bash
npm run build && npm run preview &
npm run check:scramble
```

Expected: PASS. This measures the neighbour drift the width freeze exists to prevent.

- [ ] **Step 6: Commit**

```bash
git add src/lib/useScramble.ts src/lib/useScramble.test.tsx src/components/layout/Nav.tsx src/components/site/ProjectCard.tsx
git commit -m "feat: the hover decode reaches the mobile menu

onMouseEnter keeps its coarse-pointer bail — mouseenter fires on a tap there,
and a decode between the press and the navigation is a delay nobody asked
for. But that reasoning is about the tap, not the effect. run() exposes the
decode directly, and the mobile panel plays it down its links on open,
staggered 60ms apart. Reduced motion still stops it; that bail is about the
motion itself.

Consumers destructure run off before spreading, or React warns about an
unknown DOM attribute."
```

---

### Task 6: The section accent ramp

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/tokens.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/site/Skills.css`, `src/components/ui/Timeline.css`, `src/components/ui/Tag.css`, `src/components/site/ProjectCard.css`, `src/components/layout/Nav.css`

**Interfaces:**
- Consumes: `SECTION_IDS` from `src/components/layout/Nav.tsx` — `string[]`, `['top', 'about', 'work', 'skills', 'experience', 'contact']`. `useSectionObserver(ids: string[]): string`.
- Produces: `--accent` as a registered `<color>` custom property on `:root`, and `document.documentElement.dataset.section` holding the active section id.

- [ ] **Step 1: Write the failing test**

Append to `src/styles/tokens.test.ts`:

```ts
describe('the section accent ramp', () => {
  const SECTIONS = ['about', 'work', 'skills', 'experience', 'contact']

  it('registers --accent so it can interpolate at all', () => {
    // An UNregistered custom property is a string to the animation engine and
    // snaps between values. @property with syntax '<color>' is what makes the
    // 700ms transition below mean anything.
    expect(tokens).toMatch(/@property\s+--accent\s*\{/)
    expect(tokens).toContain("syntax: '<color>'")
    expect(tokens).toContain('inherits: true')
    expect(tokens).toContain('initial-value: #e7c27d')
  })

  it('gives every observed section its own accent row', () => {
    for (const id of SECTIONS) {
      expect(tokens).toContain(`[data-section='${id}']`)
    }
  })

  it('holds lightness and chroma constant across the whole ramp', () => {
    // This is what stops six colours reading as a rainbow, and it is also what
    // keeps check:contrast honest: rotating hue alone cannot change how a
    // colour measures against the ground.
    const rows = [...tokens.matchAll(/--accent:\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)]
    expect(rows.length).toBe(SECTIONS.length + 1) // the five sections plus :root
    const lightness = new Set(rows.map((r) => r[1]))
    const chroma = new Set(rows.map((r) => r[2]))
    expect([...lightness]).toEqual(['0.827'])
    expect([...chroma]).toEqual(['0.078'])
  })

  it('never approaches the chat teal', () => {
    // Teal is reserved for the AI surface: it is how a visitor tells the
    // machine's voice from Moeez's page. --teal is near hue 190.
    const hues = [...tokens.matchAll(/--accent:\s*oklch\([\d.]+\s+[\d.]+\s+([\d.]+)\)/g)].map(
      (m) => Number(m[1]),
    )
    for (const hue of hues) {
      const distance = Math.min(Math.abs(hue - 190), 360 - Math.abs(hue - 190))
      expect(distance).toBeGreaterThan(60)
    }
  })

  it('transitions the accent on the shared easing token', () => {
    expect(tokens).toMatch(/transition:\s*--accent\s+\d+ms\s+var\(--ease\)/)
  })

  it('does not repoint --gold', () => {
    // --accent is additive. Repointing --gold would drag the contact email,
    // the solid button and the hero eyebrow along with it, and check:contrast
    // samples the first of those.
    expect(tokens).toContain('--gold: #e7c27d')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/styles/tokens.test.ts
```

Expected: FAIL — no `@property --accent` block.

- [ ] **Step 3: Implement the tokens**

At the top of `src/styles/tokens.css`, above `:root`:

```css
/* The accent that travels down the page.

   Registered, not merely declared. An unregistered custom property is an
   opaque string to the animation engine: assigning a new value swaps it
   between two frames, so the transition below would do nothing at all.
   `syntax: '<color>'` is what lets it interpolate, in oklab, like any other
   animatable colour. Baseline since July 2024 (Firefox 128).

   The initial value IS --gold. The ramp starts on the site's own accent
   rather than beside it, so the hero looks exactly as it always has and the
   colour only begins to move once the reader does. */
@property --accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #e7c27d;
}
```

Inside `:root`, beside the accent block:

```css
  /* The base of the ramp — oklch(0.827 0.078 84) is #e7c27d written so the
     rows below can rotate away from it without changing anything else. */
  --accent: oklch(0.827 0.078 84);
```

After the `:root` block:

```css
/* Hue rotates; lightness and chroma do not.

   That constraint is the whole design. Six freely-chosen colours read as a
   rainbow and measure differently against the ground — and the ground here is
   a live shader, which is why `npm run check:contrast` exists at all. Holding
   L and C fixed means every accent on this page has the SAME contrast as the
   gold it started from, by construction rather than by measurement, and the
   only thing that changes is which way the warmth leans.

   The arc runs gold -> copper -> muted rose, and stops well short of the chat
   teal (hue ~190). Teal is how a visitor tells the machine's voice from
   Moeez's page; an accent that drifted into it would blur the one distinction
   the palette is built to carry.

   Keyed on the ids useSectionObserver reports, never on scroll fractions. The
   hero has no row: it keeps :root's gold, which is why returning to the top
   returns to the colour the site opened with. */
[data-section='about'] {
  --accent: oklch(0.827 0.078 62);
}
[data-section='work'] {
  --accent: oklch(0.827 0.078 40);
}
[data-section='skills'] {
  --accent: oklch(0.827 0.078 18);
}
[data-section='experience'] {
  --accent: oklch(0.827 0.078 352);
}
[data-section='contact'] {
  --accent: oklch(0.827 0.078 326);
}

/* Declared on the element whose property actually changes — the data attribute
   is written on <html>, so the transition has to live here or nothing eases.

   700ms is slower than any hover on the site and deliberately so: this is not
   a response to an action, it is the page changing temperature underneath a
   reader who is looking at something else. Fast enough to have finished before
   they arrive, slow enough that they never catch it moving.

   The reduced-motion block in base.css collapses this to 0.01ms, so a visitor
   who asked for stillness gets each section's accent outright. */
:root {
  transition: --accent 700ms var(--ease);
}
```

- [ ] **Step 4: Run the token test**

```bash
npx vitest run src/styles/tokens.test.ts
```

Expected: PASS.

- [ ] **Step 5: Drive it from the active section**

In `src/App.tsx`:

```tsx
import { useEffect, useMemo } from 'react'
import { Nav, SECTION_IDS } from './components/layout/Nav'
import { useSectionObserver } from './lib/useSectionObserver'
```

```tsx
/**
 * Publishes the active section onto <html> so tokens.css can shift --accent.
 *
 * An attribute rather than an inline style, because the ramp belongs in the
 * stylesheet with the rest of the palette — a component writing colours would
 * put six hex values somewhere nobody looks for them.
 *
 * A third observer alongside Nav's and Stage's. They already run two, each
 * cheap and each answering for its own concern; sharing one would mean
 * threading the answer through props from a component that has no other reason
 * to know it.
 */
function useAccentSection(): void {
  const ids = useMemo(() => SECTION_IDS, [])
  const active = useSectionObserver(ids)

  useEffect(() => {
    if (!active) return
    document.documentElement.dataset.section = active
    return () => {
      delete document.documentElement.dataset.section
    }
  }, [active])
}
```

Call it from `App`:

```tsx
export default function App() {
  useScrollTracker()
  useAccentSection()
```

- [ ] **Step 6: Spend the accent, deliberately and narrowly**

Only these five. Everything else keeps `--gold`.

`src/components/site/Skills.css` — `.skills__title`:

```css
  color: var(--accent);
```

`src/components/ui/Timeline.css` — `.timeline__period`:

```css
  color: var(--accent);
```

`src/components/site/ProjectCard.css` — `.card__metric`:

```css
  color: var(--accent);
```

`src/components/ui/Tag.css` — `.tag`:

```css
  /* color-mix rather than a second token: --accent transitions, so anything
     derived from it with color-mix transitions too. An rgb triple could not —
     a custom property holding "231 194 125" is a string, not a colour. */
  border: 1px solid color-mix(in oklab, var(--accent) 22%, transparent);
```

`src/components/layout/Nav.css` — `.nav__marker`:

```css
  background: var(--accent);
```

**Do not touch:** `.hero__role`, the Contact email link, `.btn--solid`'s background, or anything on the chat surface.

- [ ] **Step 7: Verify in a browser**

```bash
npm test && npm run build && npm run preview &
npm run check:motion
npm run check:contrast
```

Expected: all PASS. `check:contrast` must hold the recorded 5.73:1 floor at both widths in every section — if it drops, an accent has reached body copy and the wrong selector was changed.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.test.ts src/App.tsx \
        src/components/site/Skills.css src/components/ui/Timeline.css \
        src/components/ui/Tag.css src/components/site/ProjectCard.css \
        src/components/layout/Nav.css
git commit -m "feat: the accent shifts hue by section

--accent is a registered @property, so it interpolates instead of snapping,
and every row rotates hue while holding lightness and chroma fixed. That is
the design, not an implementation detail: identical L and C means identical
contrast against a live shader ground, by construction rather than by
measurement, and it is why check:contrast still reads 5.73:1 everywhere.

--gold is untouched. --accent is additive and spent on exactly five things:
the skills headings, the timeline periods, the card metric, the tag borders
and the nav marker. The hero eyebrow, the contact email and the solid button
keep the gold, and the chat keeps its teal — the ramp stops 60 degrees short
of it so the machine's voice never blurs into the page's."
```

---

### Task 7: Anchors clear the nav, and mobile gets its rhythm back

**Files:**
- Modify: `src/components/layout/Section.css`
- Test: `src/components/layout/Section.test.tsx`

**Interfaces:**
- Consumes: `--nav-h` (`64px`), `--s-3` (`16px`) from tokens.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `src/components/layout/Section.test.tsx`:

```tsx
import { readFileSync } from 'node:fs'

describe('anchored sections clear the fixed nav', () => {
  const css = readFileSync('src/components/layout/Section.css', 'utf8')

  it('reserves the nav height as scroll margin', () => {
    // Measured before this: scroll-margin-top computed to 0px under a 64px
    // fixed nav, so every anchor jump and every scrollIntoView parked the
    // section heading underneath the header. Confirmed on Skills and Contact.
    expect(css).toMatch(/scroll-margin-top:\s*calc\(var\(--nav-h\)\s*\+\s*var\(--s-3\)\)/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/layout/Section.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/components/layout/Section.css`, in the `.section` block:

```css
.section {
  padding-block: var(--s-7);
  /* The nav is fixed and 64px tall, and every in-page link and every
     scrollIntoView aims at the section's own top edge — which put the heading
     squarely underneath the header. Measured: scroll-margin-top computed to
     0px, and Skills and Contact both landed with their titles half-covered.
     Not a layout property in the animated sense: nothing transitions it, it
     only moves where a scroll comes to rest. */
  scroll-margin-top: calc(var(--nav-h) + var(--s-3));
}
```

And give mobile its own rhythm — the file currently jumps from `--s-7` (64px) straight to `--s-10` (192px) at 900px, so a phone gets the desktop's narrow value with none of its width:

```css
@media (max-width: 899px) {
  /* A phone reads a shorter measure, so it needs less air between sections,
     not the same amount. 48px between a section's last line and the next
     heading; the desktop's 192px would be a third of the screen. */
  .section {
    padding-block: var(--s-6);
  }

  .section--tight {
    padding-block: var(--s-5);
  }

  .section__head {
    margin-bottom: var(--s-5);
  }
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/layout/Section.test.tsx && npm test
```

Expected: PASS.

- [ ] **Step 5: Verify in the browser at 390x844**

Build, preview, then in the console:

```js
getComputedStyle(document.getElementById('work')).scrollMarginTop  // expect '80px'
location.hash = '#skills'
// The Skills heading must be fully visible below the nav, not clipped by it.
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Section.css src/components/layout/Section.test.tsx
git commit -m "fix: anchored headings no longer land under the fixed nav

scroll-margin-top computed to 0px against a 64px fixed header, so every
in-page link and every scrollIntoView parked the section title behind it —
reproduced on Skills and Contact at 390x844.

Mobile also gets its own vertical rhythm. The file went from 64px straight to
the desktop's 192px at 900px, which gave a phone the narrow value with none of
the width it was chosen for."
```

---

### Task 8: Work cards stop being a wall of text

**Files:**
- Modify: `src/components/site/ProjectCard.tsx`, `src/components/site/ProjectCard.css`
- Test: `src/components/site/ProjectCard.test.tsx`

**Interfaces:**
- Consumes: `useMatchMedia` from `src/lib/useMatchMedia.ts`.
- Produces: `.card__more` (`<details>`), `.card__more-summary` (`<summary>`). `.card__detail` keeps its class and its content unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/components/site/ProjectCard.test.tsx`:

`ProjectCard.test.tsx` already declares the `project` fixture at the top of the file — reuse it, do not redeclare it. It has no `matchMedia` stub yet, so add one modelled on `Magnetic.test.tsx`'s:

```tsx
import { afterEach, vi } from 'vitest'

function stubMedia(matching: string[]) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matching.includes(query),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('the detail disclosure', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is open on a wide screen, so desktop is exactly as it was', () => {
    stubMedia([]) // nothing matches: not narrow
    render(<ProjectCard project={project} />)
    expect(screen.getByRole('group')).toHaveAttribute('open')
  })

  it('is closed below 900px, where four bullets are two screens of text', () => {
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    expect(screen.getByRole('group')).not.toHaveAttribute('open')
  })

  it('never hides the bullets from the accessible tree', () => {
    // A <details> keeps its content in the DOM and in the a11y tree; a reader
    // can still reach every bullet. This is deferral, not removal.
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    for (const line of project.detail) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
  })

  it('labels the disclosure', () => {
    stubMedia(['(max-width: 899px)'])
    render(<ProjectCard project={project} />)
    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/site/ProjectCard.test.tsx
```

Expected: FAIL — no element with role `group`.

- [ ] **Step 3: Implement**

In `src/components/site/ProjectCard.tsx`:

```tsx
import { useMatchMedia } from '../../lib/useMatchMedia'
```

Inside `ProjectCard`:

```tsx
  // Measured at 390x844: #work was 3894px and the first card alone 917px — four
  // bullets of four to six lines each, under an outcome paragraph that already
  // says what the project is. The information is not the problem; carrying all
  // of it above the fold on a phone is. Deferred, never removed: <details>
  // keeps every line in the DOM and in the accessible tree, one tap away.
  //
  // Open on desktop, where the two-column grid has the room and where nothing
  // about the current layout was wrong.
  const narrow = useMatchMedia('(max-width: 899px)')
```

Replace the `<ul className="card__detail">` block with:

```tsx
        <details className="card__more" open={!narrow}>
          <summary className="card__more-summary">Details</summary>
          <ul className="card__detail">
            {project.detail.map((line) => (
              <li key={line.slice(0, 24)}>{line}</li>
            ))}
          </ul>
        </details>
```

In `src/components/site/ProjectCard.css`:

```css
/* The disclosure is deliberately not animated.

   Opening it re-flows the card and everything under it, and the only way to
   ease that is to animate a layout property — exactly what the motion rules
   forbid. `::details-content` with `interpolate-size` would do it honestly but
   is not Baseline. So the panel snaps and the CHEVRON carries the motion: a
   transform, on the shared curve, on an element nothing else depends on.

   This is also off the scroll path. The rule is about anything that re-flows
   the document while the page is moving; a disclosure only ever opens because
   someone tapped it. */
.card__more-summary {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  /* A tap target, not a line of text. */
  min-height: 44px;
  margin-top: var(--s-3);
  font-family: var(--font-mono);
  font-size: var(--t-micro);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
  transition: color 0.2s var(--ease);
}

/* Safari draws its own triangle through ::-webkit-details-marker, which
   `list-style: none` does not reach. */
.card__more-summary::-webkit-details-marker {
  display: none;
}

.card__more-summary::after {
  content: '';
  width: 6px;
  height: 6px;
  border-right: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  transform: rotate(45deg) translate(-2px, -2px);
  transition: transform 0.2s var(--ease);
}

.card__more[open] .card__more-summary::after {
  transform: rotate(-135deg) translate(-2px, -2px);
}

.card__more-summary:hover,
.card__more-summary:focus-visible {
  color: var(--text);
}

@media (min-width: 900px) {
  /* Desktop is open and stays open, so the control is noise there. Hidden with
     `display`, not `visibility`, so it takes no row in the card either. */
  .card__more-summary {
    display: none;
  }
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/site/ProjectCard.test.tsx && npm test && npx tsc -b
```

Expected: PASS.

- [ ] **Step 5: Measure the result**

Build, preview, and at 390x844:

```js
console.log({
  workH: document.getElementById('work').getBoundingClientRect().height, // was 3894.44
  docH: document.documentElement.scrollHeight,                           // was 9430
})
```

Record both numbers in the commit message. If `workH` has not dropped by at least a third, the disclosure is rendering open — check `useMatchMedia` is seeing the query.

- [ ] **Step 6: Commit**

```bash
git add src/components/site/ProjectCard.tsx src/components/site/ProjectCard.css src/components/site/ProjectCard.test.tsx
git commit -m "fix: project detail collapses on a phone

Measured at 390x844: #work was 3894px, the first card alone 917px — four
bullets of four to six lines under an outcome paragraph that already says
what the project is. The writing is not the problem; carrying all of it above
the fold on a 390px screen is.

<details>, so every line stays in the DOM and in the accessible tree one tap
away. Open on desktop, where nothing about the layout was wrong. The panel
itself does not animate — easing a disclosure means animating a layout
property, and ::details-content is not Baseline — so the chevron carries the
motion on a transform instead."
```

---

### Task 9: The dock stops drawing on his copy

**Files:**
- Modify: `src/components/chat/DockPointer.tsx`, `src/components/chat/DockPointer.css`
- Modify: `src/components/chat/ChatDock.tsx`, `src/components/chat/ChatDock.css`
- Test: `src/components/chat/DockPointer.test.tsx`

**Interfaces:**
- Consumes: `hasDockOpened()`, `POINTER_MEDIA`, `POINTER_MIN_WIDTH` — all already exported from `DockPointer.tsx` and unchanged.
- Produces: `DockPointer` renders `null` below `POINTER_MEDIA`. `COMPACT_TRAIL_LENGTH` is **removed**. `ChatDock` puts `chat__launcher--hint` on the launcher while the hint is live.

- [ ] **Step 1: Write the failing test**

Replace the compact-trail cases in `src/components/chat/DockPointer.test.tsx` with:

```tsx
describe('below POINTER_MIN_WIDTH', () => {
  it('renders nothing at all', () => {
    // Measured at 390x844 with the compact trail in place: both chevrons
    // centred at x=342 and document.elementsFromPoint returned
    // ['card__body', 'card', 'reveal is-shown', 'work__grid'] for each. The
    // trail was drawing on Moeez's writing.
    //
    // This component's own POINTER_MIN_WIDTH comment already reached that
    // conclusion — "below that it has nowhere to stand ... so on a narrower
    // screen this says nothing". The compact trail walked it back. The
    // launcher's own pulse says the same thing without borrowing anyone's
    // space.
    stubMedia([]) // POINTER_MEDIA does not match
    const { container } = render(<DockPointer visible />)
    expect(container.querySelector('.dock-pointer')).toBeNull()
  })
})

it('no longer exports a compact trail length', async () => {
  const module = await import('./DockPointer')
  expect('COMPACT_TRAIL_LENGTH' in module).toBe(false)
})
```

Keep every existing wide-screen test — `arrowProgress`, `TRAIL_LENGTH`, the session memory — unchanged.

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/chat/DockPointer.test.tsx
```

Expected: FAIL — `.dock-pointer` is rendered, and `COMPACT_TRAIL_LENGTH` is still exported.

- [ ] **Step 3: Implement the removal**

In `src/components/chat/DockPointer.tsx`:

- Delete the `COMPACT_TRAIL_LENGTH` export and its doc comment entirely.
- In the component, return `null` when the viewport is narrow:

```tsx
  if (!visible || !wide) return null
```

- Simplify the render to the wide trail only:

```tsx
    <div className="dock-pointer" aria-hidden="true" ref={root}>
      {arrowsFor(TRAIL_LENGTH).map((index) => (
```

- Extend `POINTER_MIN_WIDTH`'s doc comment with the measurement that settled it:

```
 * A compact variant was tried below this width — two chevrons tucked into the
 * dock's own corner rather than three crossing the page — on the reasoning
 * that a narrow screen is where the launcher competes hardest for attention.
 * It did not hold. Measured at 390x844, both chevrons centred at x=342 and
 * `document.elementsFromPoint` returned the project card's body for each: the
 * corner is only empty until the page scrolls under it, and on a phone the
 * copy runs edge to edge, so there is no corner. It is removed. The launcher
 * itself carries the hint instead (ChatDock.css's `chat__launcher--hint`),
 * which borrows no space it does not already own.
```

In `src/components/chat/DockPointer.css`, delete every `.dock-pointer--compact` rule and the comment block introducing them.

- [ ] **Step 4: Implement the launcher hint**

In `src/components/chat/ChatDock.tsx`, add the hint state beside the existing `visible` logic for the pointer:

```tsx
  // What replaces the pointer trail on a narrow screen. The launcher is
  // already a fixed, labelled, 44px control in the corner — it does not need
  // an arrow to be found, it needs one moment of movement so the eye lands on
  // it once. Two beats, then it is done for the session.
  const [hinting, setHinting] = useState(false)

  useEffect(() => {
    if (hasDockOpened() || hinting) return
    // Fires when the reader has left the hero — the same moment the trail used
    // to start travelling. No timer: a hint that arrives while someone is still
    // reading the first screen is an interruption.
    const onScroll = () => {
      if (window.scrollY < window.innerHeight * 0.8) return
      setHinting(true)
      window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hinting])
```

Add the class to the launcher, and clear the hint when the dock opens (beside the existing `rememberDockOpened()` call):

```tsx
      <button
        type="button"
        className={`chat__launcher${hinting ? ' chat__launcher--hint' : ''}`}
```

In `src/components/chat/ChatDock.css`:

```css
/* The narrow-screen replacement for the pointer trail.

   A ring on a pseudo-element rather than on the button, so nothing about the
   launcher's own box, shadow or hit area changes while it plays.

   Two beats, not infinite: this is a hint, not a beacon, and an element that
   pulses forever in the corner of a portfolio is an advertisement. `--ease` is
   correct precisely because it is not a loop — it arrives and settles, twice.

   It carries a transition as well as the animation, and that is the way OUT:
   when the class comes off, opacity eases the ring away instead of cutting it.
   An animation alone would have nothing to say about leaving, which is the
   smell src/test/motion-language.test.ts exists to catch. */
.chat__launcher {
  position: relative;
}

.chat__launcher::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid var(--teal);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s var(--ease);
}

.chat__launcher--hint::after {
  animation: dock-hint 1.6s var(--ease) 2 both;
}

@keyframes dock-hint {
  0% {
    opacity: 0.9;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}
```

- [ ] **Step 5: Run the tests**

```bash
npx vitest run src/components/chat/ && npm test && npx tsc -b
```

Expected: PASS. `motion-language.test.ts` must stay green — `dock-hint` animates only `opacity` and `transform`, and the block declaring it also declares a `transition`, so the "entrance with no way to leave" rule is satisfied without widening `ENTRANCE_EXCEPTIONS`.

- [ ] **Step 6: Verify nothing draws on the copy**

Build, preview, at 390x844 scrolled to `#work`:

```js
document.querySelectorAll('.dock-pointer').length  // expect 0
```

And confirm the ring plays once on first scroll past the hero, and not again after opening the dock and reloading (the `moeez:chat-opened` session key).

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/DockPointer.tsx src/components/chat/DockPointer.css \
        src/components/chat/DockPointer.test.tsx src/components/chat/ChatDock.tsx \
        src/components/chat/ChatDock.css
git commit -m "fix: the dock pointer stops drawing on his writing

Measured at 390x844: both compact chevrons centred at x=342, and
elementsFromPoint returned the project card's body for each. The corner the
compact trail was tucked into is only empty until the page scrolls under it,
and on a phone the copy runs edge to edge — so there is no corner.

POINTER_MIN_WIDTH's own comment had already reached that conclusion before
the compact variant walked it back. It is removed, and the launcher carries
the hint itself: a two-beat ring on a pseudo-element, fired once the reader
has left the hero, retired for the session as soon as the dock is opened. It
borrows no space it does not already own."
```

---

### Task 10: Chat links become clickable

**Files:**
- Create: `src/components/chat/linkify.ts`, `src/components/chat/linkify.test.ts`
- Modify: `src/components/chat/ChatMessage.tsx`, `src/components/chat/ChatDock.css`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type LinkPart = { href: string; text: string }`
  - `linkify(text: string): Array<string | LinkPart>`

- [ ] **Step 1: Write the failing test**

Create `src/components/chat/linkify.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { linkify } from './linkify'

const links = (text: string) =>
  linkify(text).filter((part): part is { href: string; text: string } => typeof part !== 'string')

describe('linkify', () => {
  it('leaves ordinary prose as one string', () => {
    expect(linkify('I build low-latency backend APIs.')).toEqual([
      'I build low-latency backend APIs.',
    ])
  })

  it('finds a bare https URL', () => {
    expect(links('My code is on GitHub: https://github.com/moeezahmadkhangit')).toEqual([
      { href: 'https://github.com/moeezahmadkhangit', text: 'https://github.com/moeezahmadkhangit' },
    ])
  })

  it('leaves the sentence its full stop', () => {
    // persona.ts already strips this when it reads a URL out of the corpus, for
    // the same reason: trailing punctuation belongs to the sentence, not to the
    // address, and a link with a period on the end 404s.
    const parts = linkify('Find me at https://moeezahmadkhan.com.')
    expect(links('Find me at https://moeezahmadkhan.com.')).toEqual([
      { href: 'https://moeezahmadkhan.com', text: 'https://moeezahmadkhan.com' },
    ])
    expect(parts[parts.length - 1]).toBe('.')
  })

  it('handles a URL wrapped in parentheses', () => {
    expect(links('(https://querysphere.moeezahmadkhan.com/)')).toEqual([
      {
        href: 'https://querysphere.moeezahmadkhan.com/',
        text: 'https://querysphere.moeezahmadkhan.com/',
      },
    ])
  })

  it('makes an email address mailable', () => {
    expect(links('Email me at kmoeez2018@gmail.com and I answer.')).toEqual([
      { href: 'mailto:kmoeez2018@gmail.com', text: 'kmoeez2018@gmail.com' },
    ])
  })

  it('finds every link in a message, in order', () => {
    const parts = links(
      'LinkedIn: https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/ or kmoeez2018@gmail.com',
    )
    expect(parts.map((p) => p.href)).toEqual([
      'https://www.linkedin.com/in/moeez-ahmad-khan-68a403364/',
      'mailto:kmoeez2018@gmail.com',
    ])
  })

  it('never produces a javascript: link', () => {
    // The model's output is untrusted text. Only three schemes may become an
    // href; anything else stays exactly what it is — text.
    expect(links('javascript:alert(1)')).toEqual([])
    expect(linkify('javascript:alert(1)')).toEqual(['javascript:alert(1)'])
  })

  it('never produces a data: link', () => {
    expect(links('data:text/html,<script>alert(1)</script>')).toEqual([])
  })

  it('leaves a URL that runs off the end of a truncated reply as plain text', () => {
    // MAX_OUTPUT_TOKENS is 256, so a reply can stop mid-address. A link to
    // half a URL is worse than no link: it looks live and goes nowhere.
    expect(links('The repo is at https://github.com/moeezahmadkhangit/quer')).toEqual([])
  })

  it('still links a URL that ends a properly finished sentence', () => {
    expect(links('The repo is at https://github.com/moeezahmadkhangit/querysphere.')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx vitest run src/components/chat/linkify.test.ts
```

Expected: FAIL — cannot resolve `./linkify`.

- [ ] **Step 3: Write the implementation**

Create `src/components/chat/linkify.ts`:

```ts
/**
 * Splits a reply into text and links.
 *
 * The model already emits URLs: SYSTEM_PROMPT orders it to "Copy a link from
 * the notes exactly, character for character", and the corpus carries the
 * LinkedIn profile, the GitHub account, the site and QuerySphere's two links.
 * They simply arrived as plain text inside a <p>, so a visitor asking "where
 * is your code?" got an address they had to select and paste.
 *
 * A splitter rather than an HTML builder, deliberately. The reply is untrusted
 * text — it comes from a model that a visitor is allowed to talk to — and it
 * must stay text. The caller maps these parts to React nodes, so the structure
 * is ours and only the characters are the model's. There is no path here that
 * could reach dangerouslySetInnerHTML.
 */
export type LinkPart = { href: string; text: string }

/**
 * Only these three become an href. Everything else — `javascript:`, `data:`,
 * `file:` — stays exactly what it is: text on the page.
 */
const SAFE_SCHEMES = ['http:', 'https:', 'mailto:']

/**
 * Candidates, not verdicts. Each match is checked against SAFE_SCHEMES before
 * it becomes a link, so a widened pattern can never widen what is clickable.
 */
const CANDIDATE = /(https?:\/\/[^\s<>]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

/** Trailing sentence punctuation is the sentence's, not the URL's. */
const TRAILING = /[.,;:!?)\]}'"]+$/

/**
 * Whether a match that runs to the very end of the message can be trusted.
 *
 * MAX_OUTPUT_TOKENS is 256, so a reply can stop in the middle of an address.
 * A link to half a URL is worse than no link at all: it looks live, and it
 * goes nowhere. If the message does not end in sentence punctuation, the last
 * token is assumed cut off and is left as text.
 */
function looksComplete(message: string): boolean {
  return /[.!?)\]}'"]\s*$/.test(message)
}

export function linkify(text: string): Array<string | LinkPart> {
  const parts: Array<string | LinkPart> = []
  let cursor = 0

  for (const match of text.matchAll(CANDIDATE)) {
    const start = match.index ?? 0
    let raw = match[0]

    // Give the punctuation back before deciding anything else about it.
    const trimmed = raw.replace(TRAILING, '')
    const tail = raw.slice(trimmed.length)
    raw = trimmed

    const href = match[2] ? `mailto:${raw}` : raw
    const reachesEnd = start + match[0].length >= text.length

    let safe = false
    try {
      safe = SAFE_SCHEMES.includes(new URL(href).protocol)
    } catch {
      safe = false
    }
    if (reachesEnd && !looksComplete(text)) safe = false

    if (start > cursor) parts.push(text.slice(cursor, start))
    if (safe) parts.push({ href, text: raw })
    else parts.push(raw)
    if (tail) parts.push(tail)
    cursor = start + match[0].length
  }

  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts.length > 0 ? parts : [text]
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/chat/linkify.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Render the parts**

Rewrite `src/components/chat/ChatMessage.tsx`:

```tsx
import type { Message } from './chatClient'
import { linkify } from './linkify'

/**
 * One turn. A refusal, a rate-limit notice and an ordinary answer all arrive as
 * the same assistant message and are all drawn the same way — there is no error
 * variant here on purpose. "I haven't written that down" is a correct answer,
 * and styling it as a failure would tell the visitor something went wrong.
 *
 * The body runs through `linkify` because the model is told to hand over exact
 * links from the notes and does, and a visitor should not have to select and
 * paste an address out of a chat bubble. Parts, not markup: the reply is
 * untrusted text and stays text — React builds the anchors around it.
 */
export function ChatMessage({ message }: { message: Message }) {
  const mine = message.role === 'assistant'
  return (
    <li className={`chat__msg chat__msg--${mine ? 'moeez' : 'visitor'}`}>
      <span className="chat__who">{mine ? 'Moeez' : 'You'}</span>
      <p>
        {linkify(message.content).map((part, i) =>
          typeof part === 'string' ? (
            part
          ) : (
            <a key={i} href={part.href} target="_blank" rel="noreferrer noopener">
              {part.text}
            </a>
          ),
        )}
      </p>
    </li>
  )
}
```

Add a render test to `src/components/chat/ChatDock.test.tsx`:

```tsx
it('renders a link in a reply as a real anchor', () => {
  render(<ChatMessage message={{ role: 'assistant', content: 'My code: https://github.com/moeezahmadkhangit.' }} />)
  const link = screen.getByRole('link')
  expect(link).toHaveAttribute('href', 'https://github.com/moeezahmadkhangit')
  expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
})
```

- [ ] **Step 6: Style the links**

In `src/components/chat/ChatDock.css`, beside `.chat__msg p`:

```css
/* Teal, not the accent: this is the chat surface, and the whole point of the
   reservation is that the machine's voice looks different from the page. */
.chat__msg a {
  color: var(--teal);
  text-decoration: underline;
  text-underline-offset: 2px;
  /* The same reason .chat__msg p breaks anywhere: a full LinkedIn URL in a
     343px panel has to break mid-token or it pushes a horizontal scrollbar
     into the dock. */
  overflow-wrap: anywhere;
}
```

- [ ] **Step 7: Run everything and confirm the model's replies are unchanged**

```bash
npm test && npx tsc -b && npm run persona
npm run eval:chat
```

`npm run persona` must report `wrote 16 chunks` and leave the file byte-identical — nothing in this task touches `src/content/`. `eval:chat` needs `OPENROUTER_API_KEY`; if it is absent, note that and move on rather than skipping the rest.

- [ ] **Step 8: Commit**

```bash
git add src/components/chat/linkify.ts src/components/chat/linkify.test.ts \
        src/components/chat/ChatMessage.tsx src/components/chat/ChatDock.test.tsx \
        src/components/chat/ChatDock.css
git commit -m "feat: links in a chat reply are clickable

Never a model or a corpus problem: SYSTEM_PROMPT already orders exact links
from the notes, and the corpus carries the LinkedIn profile, the GitHub
account, the site and QuerySphere's two links. ChatMessage dropped them into a
<p>, so a visitor asking where the code is got an address to select and paste.

A splitter, not an HTML builder. The reply is untrusted text and stays text;
React builds the anchors around it, so nothing here can reach
dangerouslySetInnerHTML. Only http, https and mailto become an href — a
javascript: or data: string renders as the characters it is. And a URL that
runs off the end of a reply the 256-token cap cut short stays plain text: a
link to half an address looks live and goes nowhere."
```

---

### Task 11: The hero fits the screen again

**Files:**
- Modify: `src/styles/tokens.css`, `src/components/site/Hero.css`, `src/three/rigs.ts`
- Test: `src/three/rigs.test.ts`

**Interfaces:**
- Consumes: `--figure-band`, `MOBILE_STATIONS` from `src/three/rigs.ts`.
- Produces: a narrowed `--figure-band` and a hero station scale retuned to match it.

**This task is measured in the browser. The numbers below are the starting point, not the answer.**

- [ ] **Step 1: Reproduce the defect**

Build, preview, at 390x844:

```js
const h = document.querySelector('.hero')
const cs = getComputedStyle(h)
console.log({
  heroH: h.getBoundingClientRect().height,  // 911.09 — overflows
  svh: innerHeight,                          // 844
  band: cs.paddingBottom,                    // 320.72
  copy: h.getBoundingClientRect().height - parseFloat(cs.paddingBottom), // ~590
})
```

The band is 320.72px but only 253px of it is on screen: 21% of the figure's reserved strip sits below the fold at scroll 0.

- [ ] **Step 2: Narrow the band and step the thesis down**

In `src/styles/tokens.css`, extend the `--figure-band` comment and change the value:

```
     Narrowed again from `clamp(220px, 38svh, 340px)`, and this time because the
     hero did not FIT. Measured at 390x844: 590px of copy plus a 320.72px band
     is 911px against an 844px screen, so the bottom 67px of the strip — a fifth
     of the figure — was below the fold at scroll 0. 38svh was chosen against
     oryzo.ai's 50-70% and it is still the right ambition; it was simply more
     than the copy left over. The copy gives a step at the same time (Hero.css's
     narrow-screen `.hero__thesis`), so the figure loses the smaller half of the
     difference.
```

```css
  --figure-band: clamp(200px, 34svh, 300px);
```

In `src/components/site/Hero.css`, inside the existing `@media (max-width: 899px)` block:

```css
  /* One step down from the fluid size, on a phone only.

     The thesis is six lines at 390px and each of them costs the figure a
     millimetre of its strip. This is the copy's half of the arithmetic in
     tokens.css's --figure-band comment: neither the writing nor the model
     could have the space it wanted, so both gave a little rather than one of
     them being cut off. */
  .hero__thesis {
    font-size: var(--t-body);
  }
```

- [ ] **Step 3: Re-measure and confirm it fits**

Rebuild, preview, at 390x844:

```js
const h = document.querySelector('.hero')
console.log(h.getBoundingClientRect().height, innerHeight)
```

Expected: the first number is **less than or equal to** the second. If it is not, take another step off the thesis or another 10svh off the band and re-measure. Do not proceed until it fits.

Check 768x1024 as well — the tall-screen case the `::before`/`::after` 3:1 split exists for.

- [ ] **Step 4: Retune the hero station**

`frontend/CLAUDE.md` records: "The band and the hero station's scale move together — growing the token alone lifted the copy and left 17% of empty screen above an unchanged head."

The band shrank by roughly 10%, so the hero row of `MOBILE_STATIONS` in `src/three/rigs.ts:142` comes down from `1.15` toward `1.08`. The row is keyed on `HERO_SECTION_ID` (`'top'`, `rigs.ts:65`), not on a literal:

```ts
  [HERO_SECTION_ID]: { position: [0, -1.25, 0], scale: 1.08, yaw: 0, presence: 0.8 },
```

Set it, rebuild, and look at the hero at 390x844: the figure should fill its strip with no empty band above its head and nothing clipped at the bottom. Adjust and repeat until it does.

Rewrite that row's comment with the new arithmetic. The existing one records the 25svh → 38svh growth and the 0.82 → 1.15 scale that followed it; keep that history and add the reason for coming back down — the band had to give 4svh so the hero would fit an 844px screen at all.

- [ ] **Step 5: Update the station test**

In `src/three/rigs.test.ts`, update whichever assertion pins the hero station's scale to the new value, and add:

```ts
import { readFileSync } from 'node:fs'
import { HERO_SECTION_ID, MOBILE_STATIONS } from './rigs'

it('keeps the hero station in step with --figure-band', () => {
  // Recorded because these two have come apart twice. The band is the strip
  // the figure stands in; the scale is how much of it the figure fills. Change
  // one without the other and you get either a head floating in an empty band
  // or a figure cropped by the fold — both have shipped.
  const tokens = readFileSync('src/styles/tokens.css', 'utf8')
  expect(tokens).toContain('--figure-band: clamp(200px, 34svh, 300px)')
  expect(MOBILE_STATIONS[HERO_SECTION_ID].scale).toBeCloseTo(1.08, 2)
})
```

If Step 4's tuning lands on a scale other than 1.08, put the measured value in both the table and this assertion.

- [ ] **Step 6: Run the browser gates that this touches**

```bash
npm test && npm run build && npm run preview &
npm run check:stations
npm run check:contrast
```

Expected: both PASS. `check:stations` asserts the push-in travels forward and stays lit and that a section change catches the figure in flight; `check:contrast` must still read 5.73:1 or better at both widths — a figure that moved closer to the copy is exactly what would break it.

- [ ] **Step 7: Commit**

```bash
git add src/styles/tokens.css src/components/site/Hero.css src/three/rigs.ts src/three/rigs.test.ts
git commit -m "fix: the hero fits an 844px screen again

Measured at 390x844: 590px of copy plus a 320.72px figure band is 911px on an
844px screen, so a fifth of the strip reserved for the model sat below the
fold at scroll 0 — the figure was cropped at the shoulders on first paint.

Both sides give. The band goes to clamp(200px, 34svh, 300px) and the thesis
takes one step down on narrow screens only. The hero station's scale comes
down with the band, because CLAUDE.md records what happens when those two move
apart: a head floating in an empty strip, or a figure cut off by the fold.
A test now pins them to each other."
```

---

### Task 12: The audit

No source changes unless the audit finds a regression.

**Files:**
- Read: `.shots-baseline/`, `.shots/`
- Create: `docs/superpowers/plans/2026-09-03-mobile-interaction-audit.md`

- [ ] **Step 1: Run the full gate suite**

```bash
cd frontend
npm test
npm run build
npm run preview &
npm run check:motion
npm run check:contrast
npm run check:stations
npm run check:scramble
npm run check:csp
npm run persona
```

Record each result. `check:contrast` must report 5.73:1 or better in every section at both widths. `npm run persona` must report `wrote 16 chunks` and leave `api/_core/corpus.generated.json` unchanged — `git status` proves it.

- [ ] **Step 2: Re-shoot**

```bash
npm run shoot
```

- [ ] **Step 3: Compare desktop — the strict half**

For every `1440-*.png` pair, open `.shots-baseline/` and `.shots/` side by side.

**Permitted differences, and nothing else:**
- `.skills__title` colour
- `.timeline__period` colour
- `.card__metric` colour
- `.tag` border colour
- `.nav__marker` colour

Any other desktop difference is a regression. Fix it before continuing — in particular check that `.card__more-summary` is genuinely `display: none` at 1440 and that the `<details>` is open.

- [ ] **Step 4: Compare mobile — the expected half**

For every `390-*.png` pair.

**Expected differences:**
- Hero: figure no longer cropped, thesis one step smaller
- Every section: heading clear of the nav
- Work: cards collapsed to title, metric, outcome, `Details`, stack, links
- Everywhere: no chevrons over the copy
- Accent hue per section

Anything else differing is unintended.

- [ ] **Step 5: Re-measure the defect table**

At 390x844:

```js
const hero = document.querySelector('.hero')
console.log({
  heroH: hero.getBoundingClientRect().height,          // baseline 911.09 — must be <= 844
  scrollMarginTop: getComputedStyle(document.getElementById('work')).scrollMarginTop, // was '0px'
  workH: document.getElementById('work').getBoundingClientRect().height,  // was 3894.44
  docH: document.documentElement.scrollHeight,          // was 9430
  arrows: document.querySelectorAll('.dock-pointer').length, // was 2, must be 0
})
```

- [ ] **Step 6: Check the touch interactions by hand**

In mobile emulation with touch on:
- Scroll through Work — exactly one card carries the lift at a time, and it is the centred one.
- Open the mobile menu — the five links decode in sequence.
- Press a button — it scales down and back.
- Open the chat, ask "where is your code?" — the GitHub URL in the reply is a real anchor and opens in a new tab.
- Scroll past the hero on a fresh session — the launcher ring pulses twice, then stops.

- [ ] **Step 7: Write the audit record**

Create `docs/superpowers/plans/2026-09-03-mobile-interaction-audit.md` with: the gate suite results, the before/after defect table, the list of desktop differences found (ideally only the five accent elements), and anything deferred.

- [ ] **Step 8: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add docs/superpowers/plans/2026-09-03-mobile-interaction-audit.md
git commit -m "docs: audit record for the mobile interaction work

Gate suite results, the before/after defect measurements, and the desktop
screenshot diff — which should show the five accent-bearing elements and
nothing else."
```

---

## Deferred, deliberately

Both are recorded in the spec with their reasoning. Neither is forgotten.

1. **Magnetic buttons following a touch drag.** Requested. `readPointer` returns on `pointerType === 'touch'` and two tests pin that down. It spends a `pointermove` listener on every phone to produce a ~6px lean underneath the finger causing it. Task 4's press-scale is the visible equivalent. If it is still wanted: delete the `pointerType` guard, invert `costs no pointer listener on a coarse pointer` and `holds the offset at exactly zero on a coarse pointer`, and register on coarse pointers.

2. **Answering `content/persona/qa.md`.** All 20 headings are empty, so **zero** of the corpus's 16 chunks are in Moeez's own voice — every one is generated from `src/content/index.ts`. This is the single biggest available improvement to chat quality, and it cannot be done for him: the file states that an invented answer is a defect, and CLAUDE.md forbids inventing facts. When he answers any of them, the follow-up is mechanical — paste, `npm run persona`, `npm run eval:chat`.
