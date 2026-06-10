# Cinematic Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen cinematic title sequence ("Welcome To The Archive" → "Moeez Ahmad Khan") that plays after the loader and dissolves into the existing hero.

**Architecture:** A self-contained `CinematicIntro` overlay (pure DOM/CSS/SVG — the R3F scene is untouched) mounted by `App.tsx` between a new `loading → intro → live` phase machine. A tiny pure helper gates the intro to once per session. The wizard "conjure" ramp runs while the intro plays, so the figurine is alive when the overlay dissolves.

**Tech Stack:** React 18, TypeScript, framer-motion (already present), Vite, vitest. No new dependencies.

**Working directory:** all paths are relative to `frontend/`. Run all commands from `frontend/`.

---

## File Structure

- Create: `frontend/src/components/introGate.ts` — pure once-per-session gate (testable).
- Create: `frontend/src/components/introGate.test.ts` — vitest for the gate.
- Create: `frontend/src/components/CinematicIntro.tsx` — the overlay component.
- Create: `frontend/src/components/CinematicIntro.css` — overlay styles + `@font-face`.
- Create: `frontend/public/fonts/.gitkeep` — folder for the self-hosted title font.
- Modify: `frontend/index.html` — add Cinzel Decorative (the font fallback) to the Google Fonts link.
- Modify: `frontend/src/App.tsx` — phase machine + mount `CinematicIntro`.

---

## Task 1: Once-per-session gate helper

**Files:**
- Create: `frontend/src/components/introGate.ts`
- Test: `frontend/src/components/introGate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/introGate.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { shouldPlayIntro, markIntroSeen } from './introGate'

// Minimal in-memory stand-in for the parts of Storage we use.
function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => { m.set(k, v) },
  }
}

describe('introGate', () => {
  it('plays when the flag was never set', () => {
    expect(shouldPlayIntro(fakeStorage())).toBe(true)
  })

  it('does not play once marked seen', () => {
    const s = fakeStorage()
    markIntroSeen(s)
    expect(shouldPlayIntro(s)).toBe(false)
  })

  it('markIntroSeen persists the flag', () => {
    const s = fakeStorage()
    markIntroSeen(s)
    expect(s.getItem('introSeen')).toBe('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/introGate.test.ts`
Expected: FAIL — `Failed to resolve import "./introGate"` / module not found.

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/introGate.ts`:

```ts
// Pure gate so the cinematic intro plays at most once per browser session.
// Takes a Storage-like object (sessionStorage in the app, a fake in tests).
export type IntroStorage = Pick<Storage, 'getItem' | 'setItem'>

const KEY = 'introSeen'

export function shouldPlayIntro(storage: IntroStorage): boolean {
  return storage.getItem(KEY) !== '1'
}

export function markIntroSeen(storage: IntroStorage): void {
  storage.setItem(KEY, '1')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/introGate.test.ts`
Expected: PASS — 3 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/introGate.ts frontend/src/components/introGate.test.ts
git commit -m "feat: once-per-session intro gate helper"
```

---

## Task 2: Font fallback + font folder

The authentic "Harry P" font is self-hosted and is an open item (owner drops the file in). The component must render correctly without it, falling back to Cinzel Decorative. This task makes that fallback available.

**Files:**
- Create: `frontend/public/fonts/.gitkeep`
- Modify: `frontend/index.html` (the Google Fonts `<link href=...>`, currently around lines 28-31)

- [ ] **Step 1: Create the fonts folder placeholder**

```bash
mkdir -p frontend/public/fonts
printf '' > frontend/public/fonts/.gitkeep
```

- [ ] **Step 2: Add Cinzel Decorative to the Google Fonts link**

In `frontend/index.html`, find this line:

```html
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap"
```

Replace it with (adds `Cinzel+Decorative`):

```html
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Cinzel+Decorative:wght@700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=JetBrains+Mono:wght@400;500&display=swap"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/index.html frontend/public/fonts/.gitkeep
git commit -m "chore: add Cinzel Decorative fallback + public/fonts folder for intro title"
```

> **Note for the owner:** drop the title font at `frontend/public/fonts/HarryP.woff2` (and optionally `.woff`). Until then the title renders in Cinzel Decorative, which is the approved fallback.

---

## Task 3: Intro stylesheet

**Files:**
- Create: `frontend/src/components/CinematicIntro.css`

- [ ] **Step 1: Write the stylesheet**

Create `frontend/src/components/CinematicIntro.css` with the full contents:

```css
/* Self-hosted title font. Falls back to Cinzel Decorative until the file is
   added at /fonts/HarryP.woff2 (see plan Task 2). */
@font-face {
  font-family: 'Harry P';
  src: url('/fonts/HarryP.woff2') format('woff2'),
       url('/fonts/HarryP.woff') format('woff');
  font-display: swap;
}

/* Full-viewport cinematic overlay. z-index sits above page content + the
   #root::before vignette (z 50) but below the #root::after grain (z 9999,
   pointer-events:none) which harmlessly textures over it. */
.intro {
  position: fixed;
  inset: 0;
  z-index: 200;
  overflow: hidden;
  background: #000;
  cursor: pointer;
  user-select: none;
}

/* Sky — the approved candle-gold / ink palette. */
.intro__sky {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 16%,
    #241a10 0%, #140d09 40%, #0a0710 78%, var(--ink) 100%);
}

.intro__moon {
  position: absolute;
  top: 12%;
  left: 50%;
  width: 120px;
  height: 120px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(circle, #fff3d8 0%, var(--gold) 45%, rgba(231, 194, 125, 0) 72%);
  box-shadow: 0 0 90px 28px rgba(231, 194, 125, 0.3);
}

.intro__fog {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.5;
  background: radial-gradient(circle, #5a4424 0%, rgba(90, 68, 36, 0) 70%);
  animation: intro-drift 18s ease-in-out infinite alternate;
}
.intro__fog--1 { width: 46vw; height: 38vh; left: -8vw; top: 34%; }
.intro__fog--2 { width: 40vw; height: 34vh; right: -6vw; top: 18%; animation-duration: 24s; animation-direction: alternate-reverse; }
.intro__fog--3 { width: 52vw; height: 40vh; left: 22vw; bottom: -14vh; animation-duration: 30s; }

@keyframes intro-drift {
  from { transform: translate(-6%, 0) scale(1); }
  to   { transform: translate(10%, -5%) scale(1.16); }
}

.intro__castle {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 58%;
  fill: #0a0710;
  opacity: 0.95;
}

.intro__bird {
  position: absolute;
  font-size: 14px;
  color: #000;
  opacity: 0.5;
  animation: intro-fly 11s linear infinite;
}
.intro__bird--2 { animation-delay: 3.5s; }
@keyframes intro-fly {
  0%   { transform: translate(0, 0); opacity: 0.5; }
  50%  { transform: translate(46px, -12px); }
  100% { transform: translate(92px, 6px); opacity: 0; }
}

.intro__center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 6vw;
}

.intro__card { display: flex; flex-direction: column; align-items: center; }

.intro__eyebrow {
  font-family: var(--font-display);
  letter-spacing: 0.34em;
  text-transform: uppercase;
  font-size: 0.85rem;
  color: var(--gold);
  margin-bottom: 0.9rem;
}

.intro__title {
  font-family: 'Harry P', 'Cinzel Decorative', var(--font-display);
  font-weight: 900;
  line-height: 1.04;
  font-size: clamp(2.4rem, 8vw, 5.5rem);
  color: #f6ecd6;
  text-shadow: 0 2px 30px rgba(231, 194, 125, 0.5);
}

.intro__skip {
  position: absolute;
  right: 26px;
  bottom: 22px;
  font-family: var(--font-display);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-size: 0.72rem;
  color: var(--gold);
  background: transparent;
  border: 1px solid rgba(231, 194, 125, 0.4);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.intro__skip:hover { background: rgba(231, 194, 125, 0.12); border-color: var(--gold); }

/* Reduced motion: kill the ambient drift (the JS timeline is shortened
   separately in the component). */
@media (prefers-reduced-motion: reduce) {
  .intro__fog, .intro__bird { animation: none; }
}
```

- [ ] **Step 2: Verify it is syntactically valid by typecheck-adjacent build later**

No standalone command for CSS; it is validated when imported by the component and built in Task 6. Proceed.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CinematicIntro.css
git commit -m "feat: cinematic intro stylesheet (themed fog/castle/title)"
```

---

## Task 4: CinematicIntro component

**Files:**
- Create: `frontend/src/components/CinematicIntro.tsx`

- [ ] **Step 1: Write the component**

Create `frontend/src/components/CinematicIntro.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './CinematicIntro.css'

const EASE = [0.16, 1, 0.3, 1] as const

// Timeline (ms).
const CARD_SWAP = 3000   // card 1 → card 2
const FINISH = 6500      // dissolve into the hero
const REDUCED_FINISH = 2000 // shortened path under prefers-reduced-motion

const CARDS = [
  { eyebrow: '✦  ✦  ✦', title: 'Welcome To The Archive' },
  { eyebrow: 'My Name Is', title: 'Moeez Ahmad Khan' },
]

// Hogwarts-ish turreted skyline.
const CASTLE =
  'M0,160 L0,96 L18,96 L18,80 L26,80 L26,96 L48,96 L48,60 L54,52 L60,60 L60,96 ' +
  'L92,96 L92,40 L98,40 L98,26 L104,26 L104,40 L110,40 L110,96 L150,96 L150,70 ' +
  'L158,62 L166,70 L166,96 L210,96 L210,30 L216,30 L216,14 L222,14 L222,30 L228,30 ' +
  'L228,96 L270,96 L270,66 L278,58 L286,66 L286,96 L330,96 L330,82 L338,74 L346,82 ' +
  'L346,96 L372,96 L372,88 L382,88 L382,96 L400,96 L400,160 Z'

export function CinematicIntro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const done = useRef(false)
  const [reduced] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  const finish = () => {
    if (done.current) return
    done.current = true
    onDone()
  }

  useEffect(() => {
    const timers: number[] = []
    if (reduced) {
      setStep(1)
      timers.push(window.setTimeout(finish, REDUCED_FINISH))
    } else {
      timers.push(window.setTimeout(() => setStep(1), CARD_SWAP))
      timers.push(window.setTimeout(finish, FINISH))
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => {
      timers.forEach((t) => clearTimeout(t))
      window.removeEventListener('keydown', onKey)
    }
    // finish is stable for the life of the component (guarded by done ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  const card = CARDS[step]

  return (
    <motion.div
      className="intro"
      onClick={finish}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: 'easeInOut' }}
      role="dialog"
      aria-label="Intro sequence"
    >
      <div className="intro__sky" />
      <div className="intro__moon" />
      <div className="intro__fog intro__fog--1" />
      <div className="intro__fog intro__fog--2" />
      <div className="intro__fog intro__fog--3" />
      <svg className="intro__castle" viewBox="0 0 400 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path d={CASTLE} />
      </svg>
      <span className="intro__bird" style={{ top: '30%', left: '24%' }}>{'⌃'}</span>
      <span className="intro__bird intro__bird--2" style={{ top: '38%', left: '60%' }}>{'⌃'}</span>

      <div className="intro__center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="intro__card"
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="intro__eyebrow">{card.eyebrow}</p>
            <h1 className="intro__title">{card.title}</h1>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        className="intro__skip"
        onClick={(e) => { e.stopPropagation(); finish() }}
      >
        Enter {'✦'}
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (The component is not yet imported anywhere; this confirms it compiles in isolation.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/CinematicIntro.tsx
git commit -m "feat: CinematicIntro overlay component (two-card sequence, skip, reduced-motion)"
```

---

## Task 5: Wire the phase machine into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add imports**

In `frontend/src/App.tsx`, after the existing component imports (after the `GrimoireChat` import on line 10), add:

```tsx
import { CinematicIntro } from './components/CinematicIntro'
import { shouldPlayIntro, markIntroSeen } from './components/introGate'
```

- [ ] **Step 2: Replace the state + intro-timeline effects**

Replace this block (currently lines 18-46):

```tsx
  const { progress, active } = useProgress()
  const [loaded, setLoaded] = useState(false)
  const [reveal, setReveal] = useState(0)
  const raf = useRef<number>()

  useSmoothScroll()
  useScrollTracker()
  useScrollSettle()

  // Once assets finish, hold a beat then drive the conjuring reveal 0 → 1.
  useEffect(() => {
    if (!active && progress >= 100 && !loaded) {
      const t = setTimeout(() => setLoaded(true), 500)
      return () => clearTimeout(t)
    }
  }, [active, progress, loaded])

  useEffect(() => {
    if (!loaded) return
    const start = performance.now()
    const DURATION = 1800
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setReveal(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [loaded])
```

with:

```tsx
  const { progress, active } = useProgress()
  const [phase, setPhase] = useState<'loading' | 'intro' | 'live'>('loading')
  const [reveal, setReveal] = useState(0)
  const raf = useRef<number>()
  const ramped = useRef(false)

  useSmoothScroll()
  useScrollTracker()
  useScrollSettle()

  // Once assets finish, hold a beat then leave the loader. Play the cinematic
  // intro unless it was already seen this session.
  useEffect(() => {
    if (phase !== 'loading') return
    if (!active && progress >= 100) {
      const t = setTimeout(() => {
        setPhase(shouldPlayIntro(window.sessionStorage) ? 'intro' : 'live')
      }, 500)
      return () => clearTimeout(t)
    }
  }, [active, progress, phase])

  // Drive the conjuring reveal 0 → 1 once we leave the loader, so the figurine
  // is alive behind the intro and ready when it dissolves. Runs exactly once.
  useEffect(() => {
    if (phase === 'loading' || ramped.current) return
    ramped.current = true
    const start = performance.now()
    const DURATION = 1800
    const tick = (now: number) => {
      const p = Math.min((now - start) / DURATION, 1)
      setReveal(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [phase])

  const handleIntroDone = () => {
    markIntroSeen(window.sessionStorage)
    setPhase('live')
  }
```

- [ ] **Step 3: Update the render — ScrollCues, preloader, and mount the intro**

In the returned JSX:

(a) Change the `ScrollCues` line from:

```tsx
      <ScrollCues visible={loaded} />
```
to:
```tsx
      <ScrollCues visible={phase === 'live'} />
```

(b) Change the preloader gate from:

```tsx
      <AnimatePresence>
        {!loaded && (
```
to:
```tsx
      <AnimatePresence>
        {phase === 'loading' && (
```

(c) Immediately after the closing `</AnimatePresence>` of the preloader block (currently line 73), add the intro overlay:

```tsx
      <AnimatePresence>
        {phase === 'intro' && <CinematicIntro onDone={handleIntroDone} />}
      </AnimatePresence>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (Confirms `loaded` has no remaining references and the new wiring compiles.)

- [ ] **Step 5: Verify `loaded` is fully removed**

Run: `grep -n "loaded" src/App.tsx`
Expected: no output (the symbol is gone; all gates now use `phase`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: loading -> intro -> live phase machine; mount CinematicIntro"
```

---

## Task 6: Full build + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npx vitest run`
Expected: PASS — all suites pass, including `introGate.test.ts`.

- [ ] **Step 2: Production build (the correctness gate)**

Run: `npm run build`
Expected: `tsc -b` passes, then Vite emits `dist/` with no errors.

- [ ] **Step 3: Manual smoke in the dev server**

Run: `npm run dev`, open the printed URL in a browser.
Expected sequence: `Lumos %` preloader → fog/castle/moon with "Welcome To The Archive" → "Moeez Ahmad Khan" → dissolves into the existing hero. Confirm: the "Enter ✦" button, `Esc`, and clicking anywhere all skip immediately; reloading the same tab does NOT replay the intro (open a fresh tab to replay).

- [ ] **Step 4: (Optional) headless screenshot**

Use the repo's existing `puppeteer-core` screenshot path (system Chrome with `--use-gl=angle --use-angle=swiftshader`, per `frontend/CLAUDE.md`) to capture the two card states and the dissolved hero. The `glBlitFramebuffer` SwiftShader warning is harmless.

- [ ] **Step 5: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "test: verify cinematic intro build + sequence"
```

---

## Self-Review notes (already applied)

- **Spec coverage:** §3 flow → Task 5; §4 layers → Tasks 3-4; §5 sequence/timing → Task 4 constants; §6 skip/once-per-session/reduced-motion → Tasks 1, 4; §7 font self-host + fallback → Tasks 2-3; §8 testing → Tasks 1, 6. §9 roadmap and §10 out-of-scope are intentionally not implemented.
- **Type consistency:** `shouldPlayIntro`/`markIntroSeen`/`IntroStorage` are used identically in Tasks 1 and 5; `CinematicIntro({ onDone })` defined in Task 4 matches its use in Task 5; `phase` union `'loading' | 'intro' | 'live'` is consistent across Task 5.
- **No placeholders:** every code step is complete and runnable; the only deferred artifact is the optional font binary, which has an approved live fallback.
