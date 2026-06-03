# Scroll Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add solais.ai-style scroll polish — Lenis smooth inertia scroll, masked text reveals, a pinned Spells `01–04` step-through, and parallax on project cards — without breaking the static-scene / moving-camera architecture.

**Architecture:** Lenis smooths the *real* document scroll (no container transform), so `position: sticky`, IntersectionObserver, and framer-motion `whileInView` keep working. Lenis's RAF is driven from inside the R3F `<Canvas>` frame loop so the camera samples the smoothed scroll value with zero tearing. The existing `scrollState` singleton keeps its exact shape; only its data source changes. Reveals, parallax, and the pinned section build on framer-motion (already a dependency) + CSS.

**Tech Stack:** React 18, TypeScript, Vite, @react-three/fiber + drei, framer-motion, **lenis (new)**, puppeteer-core (verification).

---

## Verification model (read first)

This project has **no test runner, linter, or formatter** (see `CLAUDE.md`). The only correctness gates are:

1. `npm run build` — runs `tsc -b` first, so any type error fails the build.
2. Headless puppeteer screenshots of the WebGL output (system Chrome + SwiftShader).

Every task below therefore ends with a **build gate** and, where the change is visual, a **screenshot gate** — these replace unit tests. All commands run from the `frontend/` directory:

```bash
cd /home/quids/MoeezPortfolio/frontend
```

The dev server runs on `http://localhost:5173`. The `prefers-reduced-motion` checks use Chrome's emulation flag in the screenshot script.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/package.json` | declares the new `lenis` dependency |
| `frontend/scripts/shoot.cjs` | **new** — reusable puppeteer screenshot harness (scroll to fractions, capture, reduced-motion toggle) |
| `frontend/src/smoothScroll.ts` | **new** — owns the Lenis instance: `useSmoothScroll()` hook, `getLenis()`, `prefersReducedMotion()` |
| `frontend/src/scroll.ts` | `scrollState` singleton (unchanged shape) + `useScrollTracker` rewritten to read from Lenis, native fallback |
| `frontend/src/scene/Scene.tsx` | renders `<ScrollDriver/>` inside `<Canvas>` to drive `lenis.raf` from the frame loop |
| `frontend/src/scene/ScrollDriver.tsx` | **new** — one-line R3F component: `useFrame` → `lenis.raf` |
| `frontend/src/components/Reveal.tsx` | adds `MaskReveal` primitive alongside existing `Reveal` / `IgniteHeading` |
| `frontend/src/components/useParallax.ts` | **new** — `useParallax(speed)` hook returning a framer-motion `y` value |
| `frontend/src/components/Sections.tsx` | pinned Spells restructure; `MaskReveal` on titles/eyebrows; parallax on Grimoire cards |
| `frontend/src/components/sections.css` | sticky stage, `01–04` index/step styles, mask util, parallax |
| `frontend/src/scene/CameraRig.tsx` | re-timed `KEYS` fractions for the now-taller Spells |
| `frontend/src/components/ScrollRail.tsx` | anchor clicks routed through `lenis.scrollTo` |

---

## Task 1: Verification harness (screenshot script) + Lenis dependency

**Files:**
- Create: `frontend/scripts/shoot.cjs`
- Modify: `frontend/package.json` (add `lenis`)

- [ ] **Step 1: Install Lenis**

Run:
```bash
cd /home/quids/MoeezPortfolio/frontend && npm install lenis
```
Expected: `package.json` gains `"lenis": "^1.x"` under dependencies; exit 0.

- [ ] **Step 2: Create the reusable screenshot harness**

Create `frontend/scripts/shoot.cjs`:

```js
// Usage: node scripts/shoot.cjs <url> <outDir> [fractions] [--reduced]
// Captures the page at each scroll fraction (0..1 of document height).
// Example: node scripts/shoot.cjs http://localhost:5173 .shots 0,0.25,0.5,0.75,1
const puppeteer = require('puppeteer-core')
const fs = require('fs')

const CHROME = '/usr/bin/google-chrome-stable'

async function main() {
  const [url, outDir, fracArg] = process.argv.slice(2)
  const reduced = process.argv.includes('--reduced')
  const fractions = (fracArg || '0,0.25,0.5,0.75,1').split(',').map(Number)
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--window-size=1440,900'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
  if (reduced) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  }
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  // let the preloader finish + scene settle
  await new Promise((r) => setTimeout(r, 6000))

  for (const f of fractions) {
    await page.evaluate((frac) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: max * frac, behavior: 'auto' })
    }, f)
    await new Promise((r) => setTimeout(r, 1500))
    const name = `${outDir}/${reduced ? 'rm-' : ''}f${String(f).replace('.', '_')}.png`
    await page.screenshot({ path: name })
    console.log('shot', name)
  }
  await browser.close()
}
main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Capture a baseline of the current site (before any effects)**

Run (two terminals, or background the dev server):
```bash
cd /home/quids/MoeezPortfolio/frontend
npm run dev &            # leave running
sleep 4
node scripts/shoot.cjs http://localhost:5173 .shots/baseline 0,0.2,0.4,0.6,0.8,1
```
Expected: six PNGs under `.shots/baseline/`. Open them; confirm the wizard is framed at each chapter. These are the "before" reference for the camera re-timing in Task 7.

- [ ] **Step 4: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
echo ".shots/" >> .gitignore
git add package.json package-lock.json scripts/shoot.cjs .gitignore
git commit -m "chore: add lenis dep + puppeteer screenshot harness"
```

---

## Task 2: Lenis smooth-scroll foundation

**Files:**
- Create: `frontend/src/smoothScroll.ts`
- Create: `frontend/src/scene/ScrollDriver.tsx`
- Modify: `frontend/src/scroll.ts`
- Modify: `frontend/src/scene/Scene.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create the Lenis owner module**

Create `frontend/src/smoothScroll.ts`:

```ts
import Lenis from 'lenis'
import { useEffect } from 'react'

let lenis: Lenis | null = null

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getLenis(): Lenis | null {
  return lenis
}

/**
 * Instantiate a single Lenis instance for the app. We pass autoRaf:false and
 * drive lenis.raf() from the R3F frame loop (see ScrollDriver) so the camera
 * samples the smoothed scroll value with no tearing. Disabled entirely under
 * prefers-reduced-motion (native scroll is restored).
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      smoothWheel: true,
      autoRaf: false,
    })
    return () => {
      lenis?.destroy()
      lenis = null
    }
  }, [])
}
```

- [ ] **Step 2: Create the frame-loop driver**

Create `frontend/src/scene/ScrollDriver.tsx`:

```tsx
import { useFrame } from '@react-three/fiber'
import { getLenis } from '../smoothScroll'

/** Drives Lenis's RAF from inside the R3F loop. Renders nothing. */
export function ScrollDriver() {
  useFrame((state) => {
    getLenis()?.raf(state.clock.elapsedTime * 1000)
  })
  return null
}
```

- [ ] **Step 3: Rewrite the scroll tracker to read from Lenis (native fallback kept)**

In `frontend/src/scroll.ts`, replace the body of `useScrollTracker`'s effect. Keep `scrollState` / `responsiveState` exactly as-is. The new effect:

```ts
import { useEffect } from 'react'
import { getLenis, prefersReducedMotion } from './smoothScroll'

export const scrollState = {
  progress: 0,
  raw: 0,
  pointerX: 0,
  pointerY: 0,
}

export const responsiveState = { zoom: 1 }

export function useScrollTracker() {
  useEffect(() => {
    const nativeScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0
    }
    const onPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }
    const onResize = () => {
      const vw = window.innerWidth
      responsiveState.zoom = vw < 640 ? 0.92 : vw < 1024 ? 0.96 : 1
    }

    // Lenis drives scrollState when smooth scrolling is on; otherwise native.
    const lenis = getLenis()
    let detach = () => {}
    if (lenis && !prefersReducedMotion()) {
      const onLenis = (e: { scroll: number; limit: number }) => {
        scrollState.raw = e.scroll
        scrollState.progress = e.limit > 0 ? Math.min(e.scroll / e.limit, 1) : 0
      }
      lenis.on('scroll', onLenis)
      detach = () => lenis.off('scroll', onLenis)
    } else {
      nativeScroll()
      window.addEventListener('scroll', nativeScroll, { passive: true })
      window.addEventListener('resize', nativeScroll)
      detach = () => {
        window.removeEventListener('scroll', nativeScroll)
        window.removeEventListener('resize', nativeScroll)
      }
    }

    onResize()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      detach()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])
}
```

> Note: `useScrollTracker` must run **after** `useSmoothScroll` so `getLenis()` is populated. App.tsx ordering is handled in Step 5.

- [ ] **Step 4: Mount the driver inside the Canvas**

In `frontend/src/scene/Scene.tsx`, import and render `<ScrollDriver/>` as a child of `<Canvas>` (anywhere inside the canvas tree, e.g. next to the camera rig):

```tsx
import { ScrollDriver } from './ScrollDriver'
// ...inside <Canvas> ... </Canvas>:
<ScrollDriver />
```

- [ ] **Step 5: Initialise Lenis in App, before the tracker**

In `frontend/src/App.tsx`, import and call `useSmoothScroll()` immediately before the existing `useScrollTracker()` call:

```tsx
import { useSmoothScroll } from './smoothScroll'
// ...
useSmoothScroll()
useScrollTracker()
```

- [ ] **Step 6: Build gate**

Run:
```bash
cd /home/quids/MoeezPortfolio/frontend && npm run build
```
Expected: PASS (no TS errors). `lenis` types resolve.

- [ ] **Step 7: Visual gate — scene still tracks scroll**

Run:
```bash
cd /home/quids/MoeezPortfolio/frontend
npm run dev &
sleep 4
node scripts/shoot.cjs http://localhost:5173 .shots/t2 0,0.25,0.5,0.75,1
```
Expected: five PNGs; the camera still moves through chapters as before (compare to `.shots/baseline`). Manually: scrolling in a real browser now feels smooth/inertial. Then verify reduced-motion still works:
```bash
node scripts/shoot.cjs http://localhost:5173 .shots/t2 0,0.5,1 --reduced
```
Expected: `rm-*.png` render correctly (native scroll path, no crash).

- [ ] **Step 8: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/smoothScroll.ts src/scene/ScrollDriver.tsx src/scroll.ts src/scene/Scene.tsx src/App.tsx
git commit -m "feat: lenis smooth scroll driven from R3F frame loop"
```

---

## Task 3: Smooth anchor navigation (ScrollRail)

**Files:**
- Modify: `frontend/src/components/ScrollRail.tsx`

- [ ] **Step 1: Route anchor clicks through Lenis**

In `frontend/src/components/ScrollRail.tsx`, add an `onClick` to the `<a>` that uses Lenis when available and falls back to native:

```tsx
import { getLenis } from '../smoothScroll'
// ...
const onJump = (e: React.MouseEvent, id: string) => {
  const lenis = getLenis()
  if (!lenis) return // reduced-motion / not ready → let native #anchor work
  e.preventDefault()
  lenis.scrollTo(`#${id}`, { offset: 0 })
}
// ...in the map:
<a href={`#${c.id}`} onClick={(e) => onJump(e, c.id)} className="rail__mark" aria-label={`Chapter ${c.label}`}>
```

- [ ] **Step 2: Build gate**

Run: `cd /home/quids/MoeezPortfolio/frontend && npm run build`
Expected: PASS.

- [ ] **Step 3: Visual gate**

In a real browser at `localhost:5173`, click each wand mark (I–VI); the page glides smoothly to each chapter instead of jumping.

- [ ] **Step 4: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/components/ScrollRail.tsx
git commit -m "feat: smooth wand-nav anchors via lenis.scrollTo"
```

---

## Task 4: Masked text reveals

**Files:**
- Modify: `frontend/src/components/Reveal.tsx`
- Modify: `frontend/src/components/Sections.tsx`

- [ ] **Step 1: Add the `MaskReveal` primitive**

Append to `frontend/src/components/Reveal.tsx` (keep existing exports):

```tsx
/** Content wipes up from behind a mask when scrolled into view. */
export function MaskReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <span className={className} style={{ display: 'block', overflow: 'hidden' }}>
      <motion.span
        style={{ display: 'block' }}
        initial={{ y: '110%' }}
        whileInView={{ y: '0%' }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.9, ease, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}
```

> `ease` is already defined at the top of this file (`[0.16, 1, 0.3, 1]`). Reuse it; do not redefine.

- [ ] **Step 2: Apply to section eyebrows/titles**

In `frontend/src/components/Sections.tsx`, wrap section eyebrows in `MaskReveal`. Example for the About section eyebrow (apply the same pattern to Spells/Grimoire/Chronicles/OwlPost eyebrows):

```tsx
import { Reveal, IgniteHeading, MaskReveal } from './Reveal'
// replace: <Reveal><p className="eyebrow">…</p></Reveal>
// with:
<MaskReveal><p className="eyebrow">Chapter III — The Arsenal</p></MaskReveal>
```

Keep `IgniteHeading` for the `section__title`s (the word-stagger is intentional). Only the eyebrows switch to the mask wipe so the two motions read as distinct.

- [ ] **Step 3: Build gate**

Run: `cd /home/quids/MoeezPortfolio/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Visual gate**

Browser: scroll each chapter into view; eyebrows wipe up from behind a clean edge (no overflow leaking). Reduced-motion screenshot still renders (motion is opacity/transform that settles; acceptable):
```bash
node scripts/shoot.cjs http://localhost:5173 .shots/t4 0.3,0.5,0.7
```

- [ ] **Step 5: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/components/Reveal.tsx src/components/Sections.tsx
git commit -m "feat: masked text reveal primitive on section eyebrows"
```

---

## Task 5: Parallax depth on Grimoire cards

**Files:**
- Create: `frontend/src/components/useParallax.ts`
- Modify: `frontend/src/components/Sections.tsx`

- [ ] **Step 1: Create the hook**

Create `frontend/src/components/useParallax.ts`:

```ts
import { useRef } from 'react'
import { useScroll, useTransform, type MotionValue } from 'framer-motion'
import { prefersReducedMotion } from '../smoothScroll'

/**
 * Returns a [ref, y] pair. `y` drifts the element by `speed` px across the
 * element's scroll-through-viewport range (negative speed = faster than scroll).
 * No-op under reduced motion.
 */
export function useParallax(speed = 60): [React.RefObject<HTMLElement>, MotionValue<number>] {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const reduced = prefersReducedMotion()
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [speed, -speed])
  return [ref, y]
}
```

- [ ] **Step 2: Apply staggered parallax to project cards**

In `frontend/src/components/Sections.tsx`, the Grimoire section maps `projects` into `<Tilt className="spell-card">`. Wrap each card in a `motion.div` whose `y` comes from `useParallax`, staggering the speed per index. Since hooks cannot be called in a `.map` callback, extract the card into a small component in the same file:

```tsx
import { motion } from 'framer-motion'
import { useParallax } from './useParallax'

function GrimoireCard({ p, i }: { p: (typeof projects)[number]; i: number }) {
  const [ref, y] = useParallax(40 + (i % 3) * 18)
  return (
    <motion.div ref={ref as React.RefObject<HTMLDivElement>} style={{ y }}>
      <Tilt className="spell-card">
        <div className="spell-card__glyph">{p.glyph}</div>
        <p className="spell-card__incant">“{p.incantation}”</p>
        <h3 className="spell-card__name">{p.name}</h3>
        <p className="spell-card__blurb">{p.blurb}</p>
        <ul className="spell-card__tags">
          {p.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Tilt>
    </motion.div>
  )
}
```

Then in `Grimoire()` replace the inline card markup in the map with `<GrimoireCard key={p.name} p={p} i={i} />`.

> Verify the exact current card JSX (`Sections.tsx` ~lines 86–96) and move it verbatim into `GrimoireCard` so no markup/classes change — only the wrapping `motion.div` is added.

- [ ] **Step 3: Build gate**

Run: `cd /home/quids/MoeezPortfolio/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Visual gate**

Browser: scrolling through Grimoire, cards drift at slightly different rates (depth). Confirm no layout overlap at the extremes. Reduced-motion: cards sit static.

- [ ] **Step 5: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/components/useParallax.ts src/components/Sections.tsx
git commit -m "feat: staggered parallax depth on grimoire cards"
```

---

## Task 6: Pinned Spells `01–04` step-through

**Files:**
- Modify: `frontend/src/components/Sections.tsx`
- Modify: `frontend/src/components/sections.css`

- [ ] **Step 1: Restructure the Spells component into a tall pinned section**

Replace `Spells()` in `frontend/src/components/Sections.tsx`. There are exactly 4 `spellbook` groups, so 4 steps. Outer section is tall; an inner sticky stage shows the active group:

```tsx
import { useRef } from 'react'
import { useScroll, useTransform, useMotionValueEvent, motion } from 'framer-motion'
import { useState } from 'react'

export function Spells() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  })
  const [step, setStep] = useState(0)
  const last = spellbook.length - 1
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const idx = Math.min(last, Math.floor(p * spellbook.length))
    setStep(idx < 0 ? 0 : idx)
  })

  return (
    <section id="spells" ref={ref} className="section section--spells spells--pinned">
      <div className="spells__stage">
        <MaskReveal><p className="eyebrow">Chapter III — The Arsenal</p></MaskReveal>
        <IgniteHeading className="section__title" text="Spells & Incantations" />

        <div className="spells__steps">
          <div className="spells__index" aria-hidden>
            {String(step + 1).padStart(2, '0')}
            <span className="spells__index-total">/ {String(spellbook.length).padStart(2, '0')}</span>
          </div>

          <div className="spells__panel">
            {spellbook.map((group, i) => (
              <motion.div
                key={group.title}
                className="spell-group spell-group--step"
                animate={{ opacity: i === step ? 1 : 0, y: i === step ? 0 : 24 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ pointerEvents: i === step ? 'auto' : 'none' }}
              >
                <h3 className="spell-group__title">{group.title}</h3>
                <ul className="spell-group__list">
                  {group.spells.map((s) => (
                    <li key={s} className="spell-chip">
                      <span className="spell-chip__rune">✦</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

> `useState` may already be imported at the top of `Sections.tsx`; if so, don't duplicate the import — add the missing named imports only.

- [ ] **Step 2: Add the pinned-section CSS**

Append to `frontend/src/components/sections.css`:

```css
/* Pinned Spells: tall section (one viewport per step + one) with a sticky stage. */
.spells--pinned {
  height: 500vh;            /* 4 steps + 1; tune for pacing */
  padding: 0;
}
.spells__stage {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2rem;
  padding: clamp(2rem, 6vw, 6rem);
  box-sizing: border-box;
}
.spells__steps {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 2fr);
  align-items: center;
  gap: clamp(1rem, 5vw, 4rem);
  min-height: 42vh;
}
.spells__index {
  font-family: 'Cinzel', serif;
  font-size: clamp(4rem, 14vw, 12rem);
  line-height: 0.9;
  color: var(--gold);
  opacity: 0.85;
}
.spells__index-total {
  display: block;
  font-size: 0.18em;
  letter-spacing: 0.3em;
  opacity: 0.6;
}
.spells__panel {
  position: relative;
  min-height: 38vh;
}
.spell-group--step {
  position: absolute;
  inset: 0;
}

/* Reduced motion: drop the pin, restore a normal stacked grid. */
@media (prefers-reduced-motion: reduce) {
  .spells--pinned { height: auto; }
  .spells__stage { position: static; height: auto; }
  .spell-group--step { position: static; opacity: 1 !important; transform: none !important; }
  .spells__panel { min-height: 0; }
}
```

> The reduced-motion block restores readable static stacking; under reduced motion `scrollYProgress` still updates `step` harmlessly but all groups are visible and `opacity:1 !important` overrides the inline animate.

- [ ] **Step 3: Build gate**

Run: `cd /home/quids/MoeezPortfolio/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Visual gate (pin behaviour)**

```bash
cd /home/quids/MoeezPortfolio/frontend
npm run dev &
sleep 4
node scripts/shoot.cjs http://localhost:5173 .shots/t6 0,0.2,0.3,0.4,0.5,0.6,0.8,1
```
Browser check: scrolling through the Spells region keeps the heading pinned while the `01 → 04` index and the four skill groups advance one at a time. Reduced-motion screenshot shows all four groups stacked statically:
```bash
node scripts/shoot.cjs http://localhost:5173 .shots/t6 0.3,0.5 --reduced
```

> The camera framing in the back half of the page will look *off* here — that's expected and fixed in Task 7, because the taller Spells has shifted every later chapter's scroll fraction.

- [ ] **Step 5: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/components/Sections.tsx src/components/sections.css
git commit -m "feat: pinned Spells 01-04 step-through"
```

---

## Task 7: Re-time the camera for the taller page

**Files:**
- Modify: `frontend/src/scene/CameraRig.tsx`

The Spells section is now ~5 viewports instead of ~1, so each chapter falls at a different fraction of total scroll. The `KEYS` array must be re-tuned so each camera move lands on its chapter again.

- [ ] **Step 1: Measure the new chapter scroll fractions**

With the dev server running, capture the real top offset of each section as a fraction of scrollable height:

```bash
cd /home/quids/MoeezPortfolio/frontend
node -e "
const puppeteer=require('puppeteer-core');
(async()=>{
  const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome-stable',headless:'new',args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox','--window-size=1440,900']});
  const p=await b.newPage(); await p.setViewport({width:1440,height:900});
  await p.goto('http://localhost:5173',{waitUntil:'networkidle2'});
  await new Promise(r=>setTimeout(r,5000));
  const data=await p.evaluate(()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    const ids=['top','wizard','spells','grimoire','chronicles','owlpost'];
    return ids.map(id=>{const el=id==='top'?document.body:document.getElementById(id);
      const top=id==='top'?0:el.getBoundingClientRect().top+window.scrollY;
      return {id, frac:+(top/max).toFixed(3)};});
  });
  console.log(JSON.stringify(data,null,2)); await b.close();
})();
"
```
Expected: a list like `[{id:'top',frac:0},{id:'wizard',frac:0.07},{id:'spells',frac:0.14},{id:'grimoire',frac:0.55},...]`. **Record these fractions** — they drive the next step.

- [ ] **Step 2: Re-tune `KEYS` to the measured fractions**

In `frontend/src/scene/CameraRig.tsx`, update each keyframe's `at` to sit at (or just after) the matching chapter fraction from Step 1, keeping the existing `pos`/`look` values. Add an extra keyframe inside the Spells range if the long pinned section needs a held/zoomed framing across its steps. Template (replace fractions with your measured values):

```ts
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.00, pos: [0, 1.15, 5.5],  look: [0, 0.16, 0] }, // top / hero
  { at: 0.07, pos: [4.5, 1.8, 3.8], look: [0, 0.3, 0]  }, // wizard (about)
  { at: 0.16, pos: [-4.5, 2.6, 4.2],look: [0, 0.5, 0]  }, // spells — entry
  { at: 0.45, pos: [-3.6, 2.2, 4.4],look: [0, 0.4, 0]  }, // spells — held across 01–04 (optional)
  { at: 0.58, pos: [4.5, 0.4, 4.6], look: [0, 0.0, 0]  }, // grimoire
  { at: 0.78, pos: [-4.5, 1.6, 4.2],look: [0, 0.3, 0]  }, // chronicles
  { at: 1.00, pos: [0, 1.0, 10.5],  look: [0, 0.2, 0]  }, // owlpost
]
```

> Also check the intro-parallax constant in `CameraRig`'s `useFrame`: `scrollState.progress / 0.25`. With the hero now a smaller fraction of the page, the intro hold ends too late. Lower the divisor to roughly the new `wizard`/`spells` boundary (e.g. `/ 0.08`) so parallax eases in right after the hero.

- [ ] **Step 3: Build gate**

Run: `cd /home/quids/MoeezPortfolio/frontend && npm run build`
Expected: PASS.

- [ ] **Step 4: Visual gate — framing restored at every chapter**

```bash
cd /home/quids/MoeezPortfolio/frontend
node scripts/shoot.cjs http://localhost:5173 .shots/t7 0,0.07,0.16,0.4,0.58,0.78,1
```
Compare each shot against `.shots/baseline`: the wizard should be framed well at the hero, about, spells (across its steps), grimoire, chronicles, and the final pull-back. Iterate Step 2 fractions/positions until framing reads correctly at each chapter.

- [ ] **Step 5: Commit**

```bash
cd /home/quids/MoeezPortfolio/frontend
git add src/scene/CameraRig.tsx
git commit -m "feat: re-time camera keyframes for taller pinned page"
```

---

## Task 8: Final full-site verification

**Files:** none (verification only).

- [ ] **Step 1: Clean build**

Run:
```bash
cd /home/quids/MoeezPortfolio/frontend && npm run build
```
Expected: PASS with no warnings about missing modules/types.

- [ ] **Step 2: Full motion pass**

```bash
cd /home/quids/MoeezPortfolio/frontend
npm run dev &
sleep 4
node scripts/shoot.cjs http://localhost:5173 .shots/final 0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1
```
Manually confirm in a browser: (a) smooth inertia scroll, (b) wand-nav glides, (c) eyebrows wipe up, (d) Spells pins and steps 01→04, (e) Grimoire cards parallax, (f) camera framed at every chapter.

- [ ] **Step 3: Reduced-motion pass**

```bash
node scripts/shoot.cjs http://localhost:5173 .shots/final 0,0.25,0.5,0.75,1 --reduced
```
Confirm: native scroll, no pin (Spells groups stacked & readable), no parallax drift, page fully usable. No console errors.

- [ ] **Step 4: Stop the dev server**

```bash
pkill -f vite || true
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** smooth scroll (T2/T3) ✓, masked reveals (T4) ✓, pinned Spells 01–04 (T6) ✓, parallax (T5) ✓, camera re-timing (T7) ✓, reduced-motion for all four (T2/T4/T5/T6 + T8 verify) ✓, headless verification harness (T1) ✓, three-way coupling kept in sync — ScrollRail stays 6 chapters (T3), KEYS re-timed (T7), section ids unchanged ✓.
- **Placeholders:** none — every code step has full code; the only "fill in your value" is the *measured* camera fractions in T7, which are inherently runtime-measured (the measurement command is provided).
- **Type consistency:** `getLenis()`/`prefersReducedMotion()`/`useSmoothScroll()` defined in T2 and reused in T3/T5; `MaskReveal` defined T4 used T6; `useParallax` defined T5 used T5; `scrollState` shape unchanged so scene consumers untouched.
