# Smooth, Self-Narrating Scroll — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the whole-page scroll feel premium (softer easing + scenes that settle on their seam without ever trapping the user) and lightly self-narrating (a quiet "next → section · plain-language" cue near each seam, plus a back-to-top cue at the end).

**Architecture:** One shared `chapters.ts` registry (id + numeral + theme + plain name) feeds three consumers: the existing `ScrollRail`, a new `useScrollSettle()` proximity-settle hook, and a new `<ScrollCues>` overlay. All scroll geometry lives in a pure, unit-tested `scrollMath.ts` module; the hook and overlay only add DOM measurement and Lenis calls around it. Nothing changes the existing `scrollState` singleton or the R3F camera pipeline.

**Tech Stack:** Vite + React + TypeScript, Lenis (smooth scroll, already installed), Vitest (added here for the pure math), puppeteer-core (already installed) for visual verification.

**Working directory:** All paths are relative to `frontend/`. Run all commands from `frontend/`. The dev server (`npm run dev`, http://localhost:5173) must be running for visual-verification steps.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/scrollMath.ts` | **new** — pure scroll geometry (no DOM, no Lenis). Unit-tested. |
| `src/scrollMath.test.ts` | **new** — Vitest tests for `scrollMath`. |
| `src/chapters.ts` | **new** — shared chapter registry (id, numeral, theme, plain, at). |
| `src/components/ScrollRail.tsx` | modify — import the shared `chapters` instead of its local copy. |
| `src/smoothScroll.ts` | modify — soften Lenis easing + tune wheel/touch feel. |
| `src/useScrollSettle.ts` | **new** — proximity-settle hook (DOM measure + `scrollMath` + `lenis.scrollTo`). |
| `src/components/ScrollCues.tsx` | **new** — fixed overlay: next-section cue + end/back-to-top cue. |
| `src/components/ScrollCues.css` | **new** — cue styling. |
| `src/App.tsx` | modify — mount `useScrollSettle()` and `<ScrollCues>`. |
| `scripts/capture.mjs` | **new** — dev-only parametrized scroll-screenshot utility. |
| `package.json` | modify — add `vitest` devDep + `test` script. |

---

## Task 1: Pure scroll math (`scrollMath.ts`) — TDD

The bug-prone geometry (magnet zones, off-by-one boundary picks) lives here as pure
functions so it can be unit-tested without a browser.

**Files:**
- Modify: `package.json`
- Create: `src/scrollMath.ts`
- Test: `src/scrollMath.test.ts`

- [ ] **Step 1: Add Vitest**

Edit `package.json` — add the script and devDependency:

```jsonc
// in "scripts":
"test": "vitest run",
// in "devDependencies":
"vitest": "^2.1.8"
```

Run: `npm install`
Expected: installs vitest, exit 0.

- [ ] **Step 2: Write the failing test**

Create `src/scrollMath.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { activeIndex, settleTarget, nextCue } from './scrollMath'

const TOPS = [0, 1000, 2000, 5000] // ascending section tops (px)

describe('activeIndex', () => {
  it('returns the last section whose top is at or above the anchor', () => {
    expect(activeIndex(0, TOPS)).toBe(0)
    expect(activeIndex(999, TOPS)).toBe(0)
    expect(activeIndex(1000, TOPS)).toBe(1)
    expect(activeIndex(2500, TOPS)).toBe(2)
    expect(activeIndex(9999, TOPS)).toBe(3)
  })
})

describe('settleTarget', () => {
  it('returns the nearest top when inside the magnet zone', () => {
    expect(settleTarget(1100, TOPS, 300)).toBe(1000) // 100px away, zone 300
    expect(settleTarget(1850, TOPS, 300)).toBe(2000) // 150px away
  })
  it('returns null when no boundary is within the magnet zone', () => {
    expect(settleTarget(1500, TOPS, 300)).toBeNull() // 500px from either seam
  })
  it('returns null when already essentially on a boundary (deadzone)', () => {
    expect(settleTarget(1001, TOPS, 300)).toBeNull() // within 2px deadzone
  })
})

describe('nextCue', () => {
  it('is active when within threshold of the next boundary below', () => {
    expect(nextCue(900, TOPS, 150)).toEqual({ active: true, nextIndex: 1 }) // 100px to 1000
    expect(nextCue(700, TOPS, 150)).toEqual({ active: false, nextIndex: 1 }) // 300px to 1000
  })
  it('reports no next section past the final boundary', () => {
    expect(nextCue(5000, TOPS, 150)).toEqual({ active: false, nextIndex: null })
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/scrollMath.test.ts`
Expected: FAIL — cannot resolve `./scrollMath` (module not found).

- [ ] **Step 4: Implement `scrollMath.ts`**

Create `src/scrollMath.ts`:

```ts
/**
 * Pure scroll geometry — no DOM, no Lenis. All inputs are plain numbers so this
 * is fully unit-testable (see scrollMath.test.ts). `tops` is always the ascending
 * list of section top offsets in document pixels.
 */

/** Index of the section occupying `anchorY` (e.g. viewport-center in doc px). */
export function activeIndex(anchorY: number, tops: number[]): number {
  let idx = 0
  for (let i = 0; i < tops.length; i++) {
    if (anchorY >= tops[i]) idx = i
    else break
  }
  return idx
}

/**
 * Nearest section top to settle onto, or null if none is worth settling to.
 * `magnetPx` is the half-width of the magnet zone; `deadzonePx` suppresses
 * re-triggering when we're already on a boundary.
 */
export function settleTarget(
  scrollY: number,
  tops: number[],
  magnetPx: number,
  deadzonePx = 2,
): number | null {
  let best: number | null = null
  let bestDist = Infinity
  for (const top of tops) {
    const d = Math.abs(top - scrollY)
    if (d < bestDist) {
      bestDist = d
      best = top
    }
  }
  if (best === null) return null
  if (bestDist <= deadzonePx) return null // already there
  if (bestDist > magnetPx) return null // too far → leave it free
  return best
}

/**
 * Whether to show the "next section" cue and which index is next.
 * Active when the next boundary below the current scroll is within `thresholdPx`.
 */
export function nextCue(
  scrollY: number,
  tops: number[],
  thresholdPx: number,
  epsilonPx = 4,
): { active: boolean; nextIndex: number | null } {
  let nextIndex: number | null = null
  for (let i = 0; i < tops.length; i++) {
    if (tops[i] > scrollY + epsilonPx) {
      nextIndex = i
      break
    }
  }
  if (nextIndex === null) return { active: false, nextIndex: null }
  const dist = tops[nextIndex] - scrollY
  return { active: dist <= thresholdPx, nextIndex }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/scrollMath.test.ts`
Expected: PASS — all three describe blocks green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/scrollMath.ts src/scrollMath.test.ts
git commit -m "feat: pure scroll geometry module (settle + cue math) with vitest"
```

---

## Task 2: Visual-capture dev utility (`scripts/capture.mjs`)

A reusable parametrized screenshot tool so later tasks can verify scroll feel/cues.
Used only in verification steps; never imported by the app.

**Files:**
- Create: `scripts/capture.mjs`

- [ ] **Step 1: Create the script**

Create `scripts/capture.mjs`:

```js
// Dev-only scroll-capture utility. Run from frontend/ with the dev server up:
//   node scripts/capture.mjs <outDir> <pos1> <pos2> ...
// Each pos is a scroll fraction 0..1. Optionally append "settle" as the FIRST
// arg after outDir to scroll-then-pause (tests the proximity settle).
import puppeteer from 'puppeteer-core'

const args = process.argv.slice(2)
const outDir = args[0] || '/tmp/cap'
const settle = args[1] === 'settle'
const positions = (settle ? args.slice(2) : args.slice(1)).map(Number)
if (positions.length === 0) positions.push(0, 0.5, 1)

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 4500)) // preloader + conjuring reveal

await page.evaluate((d) => {
  // node can't mkdir from the page; expose dir for filename only
  window.__d = d
}, outDir)

let i = 0
for (const p of positions) {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: max * p, behavior: 'auto' })
  }, p)
  // If testing settle, nudge slightly off the seam then wait for the magnet.
  if (settle) {
    await page.evaluate(() => window.scrollBy({ top: 60, behavior: 'auto' }))
  }
  await new Promise((r) => setTimeout(r, settle ? 1600 : 1300))
  await page.screenshot({ path: `${outDir}/p${String(i).padStart(2, '0')}_${Math.round(p * 100)}.png` })
  i++
}
await browser.close()
console.log('captured', positions.length, 'frames to', outDir)
```

- [ ] **Step 2: Smoke-test it**

Run (dev server must be up):
```bash
mkdir -p /tmp/cap-smoke && node scripts/capture.mjs /tmp/cap-smoke 0 0.5 1
```
Expected: prints `captured 3 frames to /tmp/cap-smoke`; three PNGs exist. Open them to confirm the page renders (hero at 0, a mid section at 0.5, owl-post at 1).

> If node prints `ERR_MODULE_NOT_FOUND` for `puppeteer-core`, you are not running from `frontend/`. `cd` into `frontend/` and retry — module resolution walks up to `frontend/node_modules`.

- [ ] **Step 3: Commit**

```bash
git add scripts/capture.mjs
git commit -m "chore: add dev-only scroll-capture screenshot utility"
```

---

## Task 3: Shared chapter registry (`chapters.ts`) + refactor `ScrollRail`

**Files:**
- Create: `src/chapters.ts`
- Modify: `src/components/ScrollRail.tsx`

- [ ] **Step 1: Create the registry**

Create `src/chapters.ts`:

```ts
export interface Chapter {
  id: string // matches the section element id in the DOM
  numeral: string // roman numeral shown on the rail
  theme: string // themed display name
  plain: string // plain-language translation
  at: number // measured scroll fraction (0..1) — rail dot placement only
}

/**
 * Single source of truth for the page's chapters. `at` is an approximate measured
 * fraction kept in hand-sync with CameraRig KEYS, used ONLY for rail dot placement.
 * Settle/cue logic measures live DOM offsets and never relies on `at`.
 */
export const chapters: Chapter[] = [
  { id: 'top',        numeral: 'I',   theme: 'The Conjuring', plain: 'intro',        at: 0.0 },
  { id: 'wizard',     numeral: 'II',  theme: 'The Mind',      plain: 'about me',     at: 0.197 },
  { id: 'spells',     numeral: 'III', theme: 'Spells',        plain: 'skills',       at: 0.301 },
  { id: 'grimoire',   numeral: 'IV',  theme: 'The Grimoire',  plain: 'projects',     at: 0.793 },
  { id: 'tracker',    numeral: 'V',   theme: 'The Pulse',     plain: 'live AI demo', at: 0.854 },
  { id: 'chronicles', numeral: 'VI',  theme: 'The Path',      plain: 'experience',   at: 0.914 },
  { id: 'owlpost',    numeral: 'VII', theme: 'Owl Post',      plain: 'contact',      at: 1.0 },
]
```

- [ ] **Step 2: Refactor `ScrollRail.tsx` to import it**

In `src/components/ScrollRail.tsx`:

Delete the local `chapters` array (the `const chapters = [ ... ]` block and its
explanatory comment) and add the import at the top:

```ts
import { chapters } from '../chapters'
```

Then update the render `.map` so it uses the new field names (`numeral` replaces
`label`). Replace the existing `<ul className="rail__marks">` block with:

```tsx
<ul className="rail__marks">
  {chapters.map((c) => (
    <li key={c.id} className="rail__mark-item" style={{ '--at': `${c.at * 100}%` } as React.CSSProperties}>
      <a href={`#${c.id}`} className="rail__mark" aria-label={`Chapter ${c.numeral}`} onClick={(e) => onJump(e, c.id)}>
        <span className="rail__dot" />
        <span className="rail__num">{c.numeral}</span>
      </a>
    </li>
  ))}
</ul>
```

(Everything else in `ScrollRail.tsx` — `onJump`, `useScroll`, the `rail__fill` —
stays exactly as is.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: exit 0, no errors.

- [ ] **Step 4: Visual-verify the rail is unchanged**

With the dev server up:
```bash
mkdir -p /tmp/cap-rail && node scripts/capture.mjs /tmp/cap-rail 0 0.3 0.85
```
Open the PNGs: the right-edge wand rail with roman-numeral dots (I…VII) still
renders and its fill still tracks scroll. No visual regression.

- [ ] **Step 5: Commit**

```bash
git add src/chapters.ts src/components/ScrollRail.tsx
git commit -m "refactor: extract shared chapters registry with plain-language labels"
```

---

## Task 4: Tune Lenis feel (`smoothScroll.ts`)

**Files:**
- Modify: `src/smoothScroll.ts`

- [ ] **Step 1: Soften the easing + tune wheel/touch**

In `src/smoothScroll.ts`, replace the `new Lenis({ ... })` options object with:

```ts
lenis = new Lenis({
  lerp: 0.08, // a touch more glide than the previous 0.1 → weighted, premium feel
  wheelMultiplier: 1,
  touchMultiplier: 1.2, // slightly livelier on touch without feeling twitchy
  smoothWheel: true,
  autoRaf: false,
})
```

(Do not change anything else — the `prefersReducedMotion()` early-return,
`getLenis()`, the StrictMode cleanup, and the `autoRaf: false` contract with
`ScrollDriver` all stay.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Manual feel check**

With the dev server up, open http://localhost:5173 and scroll with a wheel/trackpad.
Expected: motion glides slightly longer than before, no stutter, still settles
quickly (not floaty/seasick). If it feels too loose, nudge `lerp` up toward `0.09`;
if too stiff, down toward `0.07`. Leave at the value that feels controlled.

- [ ] **Step 4: Commit**

```bash
git add src/smoothScroll.ts
git commit -m "feat: soften Lenis easing and tune wheel/touch feel"
```

---

## Task 5: Proximity-settle hook (`useScrollSettle.ts`)

Scenes "land" on their seam when you stop near one — but never trap you.

**Files:**
- Create: `src/useScrollSettle.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the hook**

Create `src/useScrollSettle.ts`:

```ts
import { useEffect } from 'react'
import type Lenis from 'lenis'
import { getLenis, prefersReducedMotion } from './smoothScroll'
import { chapters } from './chapters'
import { settleTarget } from './scrollMath'

const IDLE_MS = 140 // how long the user must pause before we assist
const MAGNET_FRACTION = 1 / 3 // magnet zone half-width, as a fraction of viewport
const SETTLE_DURATION = 0.7 // seconds
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Live document-pixel tops of each section, ascending. */
function sectionTops(): number[] {
  const tops: number[] = []
  for (const c of chapters) {
    const el = document.getElementById(c.id)
    if (el) tops.push(el.getBoundingClientRect().top + window.scrollY)
  }
  return tops.sort((a, b) => a - b)
}

/**
 * When the user stops scrolling near a section seam, gently complete the scroll so
 * the scene lands centered. Only magnetizes near seams (a tall section read
 * mid-way is never yanked) and any user input cancels an in-flight settle.
 * Disabled under prefers-reduced-motion.
 */
export function useScrollSettle() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const lenis = getLenis()
    if (!lenis) return

    let idle: ReturnType<typeof setTimeout> | undefined
    let settling = false

    const onScroll = (instance: Lenis) => {
      if (settling) return // ignore our own programmatic scroll
      if (idle) clearTimeout(idle)
      idle = setTimeout(() => {
        const target = settleTarget(
          instance.scroll,
          sectionTops(),
          window.innerHeight * MAGNET_FRACTION,
        )
        if (target === null) return
        settling = true
        lenis.scrollTo(target, {
          duration: SETTLE_DURATION,
          easing: easeOutCubic,
          onComplete: () => {
            settling = false
          },
        })
      }, IDLE_MS)
    }

    // Any genuine user input cancels an in-flight assist. Lenis interrupts the
    // programmatic scrollTo on user scroll by default (lock:false); we just clear
    // the flag so the next pause can re-arm.
    const cancel = () => {
      settling = false
    }

    lenis.on('scroll', onScroll)
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchstart', cancel, { passive: true })
    return () => {
      lenis.off('scroll', onScroll)
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchstart', cancel)
      if (idle) clearTimeout(idle)
    }
  }, [])
}
```

- [ ] **Step 2: Mount it in `App.tsx`**

In `src/App.tsx`, add the import alongside the other scroll imports:

```ts
import { useScrollSettle } from './useScrollSettle'
```

And call it immediately after `useScrollTracker()` (order matters — `useSmoothScroll`
must create the Lenis instance first):

```ts
  useSmoothScroll()
  useScrollTracker()
  useScrollSettle()
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 4: Verify settle lands centered (and does not trap)**

With the dev server up:
```bash
mkdir -p /tmp/cap-settle && node scripts/capture.mjs /tmp/cap-settle settle 0.18 0.3 0.85
```
The `settle` mode scrolls to each fraction, nudges 60px off the seam, then waits for
the magnet. Open the PNGs:
- Frames at `0.18`/`0.3`/`0.85` should show their section **top-aligned/centered**
  (the magnet pulled the 60px nudge back to the seam).

Then verify no-trap on a tall section:
```bash
mkdir -p /tmp/cap-notrap && node scripts/capture.mjs /tmp/cap-notrap 0.5
```
At `0.5` you are mid-way through a tall section (spells/grimoire), far from any seam.
Expected: the frame stays where it landed — no jump to a boundary.

- [ ] **Step 5: Commit**

```bash
git add src/useScrollSettle.ts src/App.tsx
git commit -m "feat: proximity-settle scroll so scenes land on their seam without trapping"
```

---

## Task 6: Scroll cues overlay (`ScrollCues.tsx` + `.css`)

A quiet "next → section · plain" cue near each seam, and a back-to-top cue at the end.

**Files:**
- Create: `src/components/ScrollCues.tsx`
- Create: `src/components/ScrollCues.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ScrollCues.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { getLenis, prefersReducedMotion } from '../smoothScroll'
import { chapters } from '../chapters'
import { activeIndex, nextCue } from '../scrollMath'
import './ScrollCues.css'

const CUE_FRACTION = 0.16 // show the cue in the last 16% of the current section

/**
 * Fixed bottom-center wayfinding overlay. A single rAF loop reads scroll + live
 * section tops and mutates its own refs directly (no per-frame React state), in
 * keeping with the scrollState singleton philosophy. `visible` gates it off during
 * the preloader.
 */
export function ScrollCues({ visible }: { visible: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const reduced = prefersReducedMotion()

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const root = rootRef.current
      const text = textRef.current
      if (!root || !text) return

      const scrollY = window.scrollY
      const vh = window.innerHeight
      const tops = chapters.map((c) => {
        const el = document.getElementById(c.id)
        return el ? el.getBoundingClientRect().top + scrollY : Number.POSITIVE_INFINITY
      })
      const valid = tops.filter((t) => Number.isFinite(t)) as number[]
      if (valid.length < 2) {
        root.style.opacity = '0'
        return
      }

      const idx = activeIndex(scrollY + vh * 0.5, valid)

      // Final section → end cue (back to top).
      if (idx >= valid.length - 1) {
        root.dataset.mode = 'end'
        text.textContent = "you've reached the end"
        root.style.opacity = '1'
        return
      }

      // Hide in the hero so we don't double Hero's own "scroll to descend" cue.
      if (idx === 0) {
        root.dataset.mode = 'next'
        root.style.opacity = '0'
        return
      }

      // Next-section cue: threshold = 16% of the CURRENT section's height.
      const threshold = (valid[idx + 1] - valid[idx]) * CUE_FRACTION
      const { active, nextIndex } = nextCue(scrollY, valid, threshold)
      root.dataset.mode = 'next'
      if (active && nextIndex !== null) {
        const c = chapters[nextIndex]
        text.textContent = `${c.theme} · ${c.plain}`
        root.style.opacity = '1'
      } else {
        root.style.opacity = '0'
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const toTop = () => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { duration: 1.0 })
    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <div
      ref={rootRef}
      className={`scroll-cues${reduced ? ' scroll-cues--static' : ''}`}
      data-mode="next"
      style={{ opacity: 0, visibility: visible ? 'visible' : 'hidden' }}
    >
      <span className="scroll-cues__label" aria-hidden="true">next</span>
      <span className="scroll-cues__arrow" aria-hidden="true">↓</span>
      <span ref={textRef} className="scroll-cues__text" aria-hidden="true" />
      <button className="scroll-cues__top" onClick={toTop}>↑ back to top</button>
    </div>
  )
}
```

- [ ] **Step 2: Create the styles**

Create `src/components/ScrollCues.css`:

```css
.scroll-cues {
  position: fixed;
  left: 50%;
  bottom: 2.2rem;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.9rem;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--parchment-dim);
  pointer-events: none; /* overlay never blocks scroll/clicks… */
  transition: opacity 0.5s ease;
}

/* …except the explicit back-to-top button. */
.scroll-cues__top {
  pointer-events: auto;
  cursor: pointer;
  background: none;
  border: 1px solid rgba(231, 194, 125, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: var(--gold);
  transition: border-color 0.3s ease, color 0.3s ease;
}
.scroll-cues__top:hover {
  border-color: var(--gold);
  color: var(--gold-bright);
}

.scroll-cues__label {
  color: var(--gold-deep);
}
.scroll-cues__arrow {
  color: var(--gold);
  animation: cue-bob 1.8s ease-in-out infinite;
}
.scroll-cues__text {
  color: var(--parchment);
}

/* Mode switching: next vs end. */
.scroll-cues[data-mode='next'] .scroll-cues__top {
  display: none;
}
.scroll-cues[data-mode='end'] .scroll-cues__label,
.scroll-cues[data-mode='end'] .scroll-cues__arrow {
  display: none;
}

@keyframes cue-bob {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(3px); opacity: 1; }
}

/* Reduced motion: keep the cues (they're informational) but kill movement. */
.scroll-cues--static {
  transition: none;
}
.scroll-cues--static .scroll-cues__arrow {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .scroll-cues__arrow { animation: none; }
  .scroll-cues { transition: none; }
}
```

- [ ] **Step 3: Mount it in `App.tsx`**

In `src/App.tsx`, add the import:

```ts
import { ScrollCues } from './components/ScrollCues'
```

And render it next to `<ScrollRail />` (it reads `loaded` so it stays hidden during
the preloader):

```tsx
      <Candles />
      <Cursor />
      <ScrollRail />
      <ScrollCues visible={loaded} />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: exit 0.

- [ ] **Step 5: Verify cues read correctly at seams + end**

With the dev server up:
```bash
mkdir -p /tmp/cap-cues && node scripts/capture.mjs /tmp/cap-cues 0.28 0.5 0.78 1.0
```
Open the PNGs and confirm the bottom-center overlay:
- Near a seam (e.g. `0.28` approaching spells→grimoire region, `0.78` approaching
  grimoire→tracker): shows `next ↓ {Theme} · {plain}` matching the **upcoming**
  section (cross-check against the registry).
- Mid-section away from a seam (`0.5`): overlay is hidden (opacity 0).
- Final frame (`1.0`, owl-post): shows `you've reached the end` + a `↑ back to top`
  button.

> Cue wording is `Theme · plain`, e.g. `The Grimoire · projects`. If a cue names the
> section you're leaving rather than the one ahead, the boundary math is off — re-check
> `nextCue` usage, not the CSS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScrollCues.tsx src/components/ScrollCues.css src/App.tsx
git commit -m "feat: bottom-center scroll cues — next-section wayfinding + back-to-top"
```

---

## Task 7: Reduced-motion + full-build verification

**Files:** none (verification only)

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: `tsc -b && vite build` both succeed, exit 0, no type errors.

- [ ] **Step 2: Reduced-motion behavior**

Add a temporary check using the capture script with reduced motion emulated. Create
`scripts/capture-rm.mjs` by copying `scripts/capture.mjs` and inserting, right after
`const page = await browser.newPage()`:

```js
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
```

Run:
```bash
mkdir -p /tmp/cap-rm && node scripts/capture-rm.mjs /tmp/cap-rm 0 0.5 1
```
Expected: page scrolls natively (no Lenis), scenes do NOT auto-settle, and the cues
still render (static, no bobbing arrow). Confirm via the PNGs the end frame still
shows the back-to-top cue. Then delete the temp file:

```bash
rm scripts/capture-rm.mjs
```

- [ ] **Step 3: Run the unit tests once more**

Run: `npm test`
Expected: `scrollMath.test.ts` all green.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "test: verify smooth-scroll feel, cues, and reduced-motion fallback" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** registry (Task 3) ✓; Lenis tuning (Task 4) ✓; proximity settle incl. no-trap + cancel + reduced-motion (Task 5) ✓; next-section + end cues, preloader/hero guards, ARIA/pointer-events (Task 6) ✓; reduced-motion + ARIA verification (Tasks 6–7) ✓. Out-of-scope items (HUD, dual headings, captions) intentionally absent.
- **Type consistency:** `chapters` fields (`id/numeral/theme/plain/at`) are used identically in `ScrollRail`, `useScrollSettle`, and `ScrollCues`. `scrollMath` signatures (`activeIndex`, `settleTarget`, `nextCue`) match their tests and call sites.
- **ARIA:** decorative cue text/arrow/label are `aria-hidden`; `back to top` is a real `<button>` with a visible text label (accessible name = "back to top").
