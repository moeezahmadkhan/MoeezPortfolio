# Portfolio v2 — 3D Stage Implementation Plan (2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the WebGL signature — a pointer-reactive wizard set piece behind the hero and a shader backdrop that tints with the section you are reading — without moving the shell's Lighthouse numbers or making any content depend on the canvas.

**Architecture:** One `<Canvas>`, mounted once, `position: fixed` behind the document, lazily imported so the shell paints first. Two layers inside it: a fullscreen shader quad that is always on, and a hero stage that stops doing work once the hero scrolls away. All per-frame state lives in module singletons read inside `useFrame`, never in React state.

**Tech Stack:** three.js 0.169, @react-three/fiber 8, @react-three/drei 9, @react-three/postprocessing 2, raw GLSL, KTX2/Basis via the salvaged `useKtx2Gltf`.

**Spec:** `docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md`
**Architecture doc:** `docs/redesign/ARCHITECTURE.md` (§2 layering, §3 module contracts, §5 perf budget)
**Predecessor:** `docs/superpowers/plans/2026-08-31-portfolio-shell.md` must be complete and merged.

## Global Constraints

- All work in `frontend/`. Branch `redesign/v2` continues.
- **Nothing in the DOM may depend on the canvas.** With WebGL blocked the site must remain complete.
- `prefersReducedMotion()` or `!hasWebGL()` ⇒ no canvas at all, and the three.js chunk is never fetched.
- No React state is written on scroll, pointer move, or per frame. Singletons only.
- The 3D bundle must be a separate lazy chunk. The initial JS budget is 250 KB gzip excluding it.
- LCP stays the hero *text*. Never make the canvas the largest paint.
- Teal (`--teal`) stays reserved for chat — the backdrop tints use gold and ink only.
- One easing helper (`damp`) for all frame interpolation, frame-rate independent.

---

### Task 1: Scroll and pointer singleton

**Files:**
- Create: `frontend/src/lib/scrollState.ts`
- Create: `frontend/src/lib/frame.ts`
- Test: `frontend/src/lib/scrollState.test.ts`, `frontend/src/lib/frame.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `scrollState: { progress: number; raw: number; pointerX: number; pointerY: number; heroVisible: number }` — mutable singleton.
  - `useScrollTracker(): void` — installs passive listeners.
  - `heroVisibility(heroBottom: number, viewportHeight: number): number` — pure, 1 when the hero fills the screen, 0 once it has left.
  - `damp(current: number, target: number, lambda: number, dt: number): number` — pure, frame-rate independent easing. Every `useFrame` in this plan uses it.

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/frame.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { damp } from './frame'

describe('damp', () => {
  it('returns the current value when dt is zero', () => {
    expect(damp(0, 10, 4, 0)).toBe(0)
  })

  it('moves toward the target without overshooting', () => {
    const next = damp(0, 10, 4, 1 / 60)
    expect(next).toBeGreaterThan(0)
    expect(next).toBeLessThan(10)
  })

  it('converges to the target over time', () => {
    let v = 0
    for (let i = 0; i < 240; i++) v = damp(v, 10, 4, 1 / 60)
    expect(v).toBeCloseTo(10, 2)
  })

  it('is frame-rate independent: 120 half-steps ≈ 60 full steps', () => {
    let a = 0
    for (let i = 0; i < 60; i++) a = damp(a, 1, 4, 1 / 60)
    let b = 0
    for (let i = 0; i < 120; i++) b = damp(b, 1, 4, 1 / 120)
    expect(Math.abs(a - b)).toBeLessThan(0.01)
  })
})
```

`frontend/src/lib/scrollState.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { heroVisibility, scrollState } from './scrollState'

describe('heroVisibility', () => {
  it('is 1 while the hero still fills the viewport', () => {
    expect(heroVisibility(900, 900)).toBe(1)
  })

  it('is 0 once the hero has fully left', () => {
    expect(heroVisibility(0, 900)).toBe(0)
    expect(heroVisibility(-200, 900)).toBe(0)
  })

  it('falls off linearly across the last screen of the hero', () => {
    expect(heroVisibility(450, 900)).toBeCloseTo(0.5, 5)
  })
})

describe('scrollState', () => {
  it('starts at a neutral pose', () => {
    expect(scrollState).toMatchObject({
      progress: 0,
      pointerX: 0,
      pointerY: 0,
      heroVisible: 1,
    })
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- src/lib/frame.test.ts src/lib/scrollState.test.ts`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write `frame.ts`**

```ts
/**
 * Frame-rate independent exponential easing. `lambda` is roughly "how fast",
 * in reciprocal seconds. Using this everywhere means a 144Hz monitor and a
 * 60Hz one show the same motion, which naive `v += (t - v) * 0.1` does not.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  if (dt <= 0) return current
  return target + (current - target) * Math.exp(-lambda * dt)
}
```

- [ ] **Step 4: Write `scrollState.ts`**

```ts
import { useEffect } from 'react'

/**
 * Per-frame state, deliberately OUTSIDE React. Scroll and pointer events fire far
 * more often than React should re-render; the render loop reads these fields every
 * frame instead. Never lift this into useState or context.
 */
export const scrollState = {
  progress: 0, // 0 at the top of the document, 1 at the bottom
  raw: 0, // scrollY in px
  pointerX: 0, // -1 (left edge) .. 1 (right edge)
  pointerY: 0, // -1 (top) .. 1 (bottom)
  heroVisible: 1, // 1 while the hero owns the screen, 0 once it has gone
}

/** Pure: how much of the hero is still on screen, given its bottom edge in px. */
export function heroVisibility(heroBottom: number, viewportHeight: number): number {
  if (viewportHeight <= 0) return 0
  return Math.min(1, Math.max(0, heroBottom / viewportHeight))
}

export function useScrollTracker(): void {
  useEffect(() => {
    const hero = document.getElementById('top')

    const readScroll = () => {
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      scrollState.raw = window.scrollY
      scrollState.progress = max > 0 ? window.scrollY / max : 0
      if (hero) {
        scrollState.heroVisible = heroVisibility(
          hero.getBoundingClientRect().bottom,
          window.innerHeight,
        )
      }
    }

    const readPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1
      scrollState.pointerY = (e.clientY / window.innerHeight) * 2 - 1
    }

    readScroll()
    window.addEventListener('scroll', readScroll, { passive: true })
    window.addEventListener('resize', readScroll, { passive: true })
    window.addEventListener('pointermove', readPointer, { passive: true })
    return () => {
      window.removeEventListener('scroll', readScroll)
      window.removeEventListener('resize', readScroll)
      window.removeEventListener('pointermove', readPointer)
    }
  }, [])
}
```

- [ ] **Step 5: Run them and watch them pass**

Run: `npm test -- src/lib/frame.test.ts src/lib/scrollState.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/lib/frame.* src/lib/scrollState.*
git commit -m "feat: per-frame scroll and pointer state, outside React"
```

---

### Task 2: Wizard mood singleton

**Files:**
- Create: `frontend/src/three/wizardState.ts`
- Test: `frontend/src/three/wizardState.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `WizardMode = 'idle' | 'attentive' | 'casting'`; `wizardState: { mode: WizardMode; intensity: number }`; `setWizardMode(mode: WizardMode): void`; `targetIntensity(mode: WizardMode): number`. Plan 3's `useChat` calls `setWizardMode`.

- [ ] **Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { setWizardMode, targetIntensity, wizardState } from './wizardState'

describe('wizardState', () => {
  beforeEach(() => setWizardMode('idle'))

  it('starts idle', () => {
    expect(wizardState.mode).toBe('idle')
  })

  it('changes mode in place without replacing the object', () => {
    const ref = wizardState
    setWizardMode('casting')
    expect(ref.mode).toBe('casting')
  })

  it('maps each mode to a wand intensity, brightest while casting', () => {
    expect(targetIntensity('idle')).toBeLessThan(targetIntensity('attentive'))
    expect(targetIntensity('attentive')).toBeLessThan(targetIntensity('casting'))
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/three/wizardState.test.ts`
Expected: FAIL — cannot resolve `./wizardState`.

- [ ] **Step 3: Write the implementation**

```ts
export type WizardMode = 'idle' | 'attentive' | 'casting'

/**
 * The wizard's mood. Written by the chat UI, read inside useFrame. A singleton for
 * the same reason scrollState is one: a keystroke in the chat box must not
 * re-render the canvas tree.
 */
export const wizardState = {
  mode: 'idle' as WizardMode,
  intensity: 0, // eased toward targetIntensity(mode) in the frame loop
}

export function setWizardMode(mode: WizardMode): void {
  wizardState.mode = mode
}

/** Wand-glow strength per mood. */
export function targetIntensity(mode: WizardMode): number {
  switch (mode) {
    case 'casting':
      return 1
    case 'attentive':
      return 0.55
    default:
      return 0.25
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- src/three/wizardState.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/three/wizardState.*
git commit -m "feat: wizard mood singleton the chat can drive"
```

---

### Task 3: Stage mount gate and the static fallback

**Files:**
- Create: `frontend/src/three/stageGate.ts`
- Create: `frontend/src/three/StageMount.tsx`, `Stage.css`
- Create: `frontend/src/components/site/StaticHeroArt.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/three/stageGate.test.ts`, `frontend/src/three/StageMount.test.tsx`

**Interfaces:**
- Consumes: `hasWebGL`, `prefersReducedMotion` (Plan 1 Task 3).
- Produces:
  - `shouldRenderStage(opts: { webgl: boolean; reducedMotion: boolean; saveData: boolean }): boolean` — pure.
  - `<StageMount />` — renders either `<StaticHeroArt />` or a `React.lazy` `<Stage />`, and is what `App.tsx` mounts. Task 4 creates `Stage.tsx` itself.

- [ ] **Step 1: Write the failing tests**

`frontend/src/three/stageGate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { shouldRenderStage } from './stageGate'

const base = { webgl: true, reducedMotion: false, saveData: false }

describe('shouldRenderStage', () => {
  it('renders when WebGL is available and motion is welcome', () => {
    expect(shouldRenderStage(base)).toBe(true)
  })

  it('refuses without WebGL', () => {
    expect(shouldRenderStage({ ...base, webgl: false })).toBe(false)
  })

  it('refuses under reduced motion', () => {
    expect(shouldRenderStage({ ...base, reducedMotion: true })).toBe(false)
  })

  it('refuses when the visitor asked to save data', () => {
    expect(shouldRenderStage({ ...base, saveData: true })).toBe(false)
  })
})
```

`frontend/src/three/StageMount.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/media', () => ({
  hasWebGL: () => false,
  prefersReducedMotion: () => false,
  isCoarsePointer: () => false,
}))

describe('StageMount', () => {
  it('falls back to static art when the gate refuses, and loads no WebGL', async () => {
    const { StageMount } = await import('./StageMount')
    render(<StageMount />)
    expect(screen.getByRole('img', { name: /wizard/i })).toBeInTheDocument()
    expect(document.querySelector('canvas')).toBeNull()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npm test -- src/three/stageGate.test.ts src/three/StageMount.test.tsx`
Expected: FAIL — modules do not resolve.

- [ ] **Step 3: Write `stageGate.ts`**

```ts
/**
 * Whether to mount WebGL at all. Pure so the policy is testable without a GPU.
 * Every "no" here must still leave a complete site behind — the canvas is
 * decoration, never content.
 */
export function shouldRenderStage(opts: {
  webgl: boolean
  reducedMotion: boolean
  saveData: boolean
}): boolean {
  return opts.webgl && !opts.reducedMotion && !opts.saveData
}

/** Reads the Save-Data client hint, where the browser exposes it. */
export function prefersSaveData(): boolean {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(conn?.saveData)
}
```

- [ ] **Step 4: Write `StaticHeroArt.tsx`**

```tsx
/**
 * The no-WebGL / reduced-motion hero art. A still frame of the same wizard, so the
 * fallback reads as a deliberate composition rather than an empty right column.
 * Generated by `npm run shoot:hero` in Task 7.
 */
export function StaticHeroArt() {
  return (
    <div className="stage stage--static" aria-hidden="false">
      <img src="/shots/hero-wizard.webp" alt="Illustration of a robed wizard holding a lit wand" />
    </div>
  )
}
```

- [ ] **Step 5: Write `StageMount.tsx` and `Stage.css`**

```tsx
import { Suspense, lazy } from 'react'
import { hasWebGL, prefersReducedMotion } from '../lib/media'
import { StaticHeroArt } from '../components/site/StaticHeroArt'
import { prefersSaveData, shouldRenderStage } from './stageGate'
import './Stage.css'

// Lazy so three.js, drei, and postprocessing land in their own chunk that a
// reduced-motion or no-WebGL visitor never downloads.
const Stage = lazy(() => import('./Stage').then((m) => ({ default: m.Stage })))

export function StageMount() {
  const allowed = shouldRenderStage({
    webgl: hasWebGL(),
    reducedMotion: prefersReducedMotion(),
    saveData: prefersSaveData(),
  })

  if (!allowed) return <StaticHeroArt />

  return (
    <Suspense fallback={<StaticHeroArt />}>
      <Stage />
    </Suspense>
  )
}
```

```css
/* Stage.css */
.stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.stage canvas {
  display: block;
}

.stage--static {
  display: grid;
  place-items: center end;
  padding-right: 6vw;
}

.stage--static img {
  max-height: 70svh;
  width: auto;
  opacity: 0.9;
}

@media (max-width: 899px) {
  .stage--static {
    place-items: start center;
    padding: calc(var(--nav-h) + var(--s-5)) 0 0;
  }
  .stage--static img {
    max-height: 40svh;
  }
}
```

The DOM must sit above the canvas. Add to `src/styles/base.css`:

```css
.nav,
main,
.footer {
  position: relative;
  z-index: 2;
}
```

- [ ] **Step 6: Mount it in `App.tsx`**

Add `useScrollTracker()` and `<StageMount />` — the stage goes first so it paints behind everything:

```tsx
import { StageMount } from './three/StageMount'
import { useScrollTracker } from './lib/scrollState'
// ...existing imports

export default function App() {
  useScrollTracker()
  return (
    <>
      <StageMount />
      <Nav />
      {/* ...unchanged */}
    </>
  )
}
```

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npm test -- src/three src/App.test.tsx`
Expected: PASS. `App.test.tsx` from Plan 1 still passes — jsdom reports no WebGL, so the static path renders and the section-order assertion is unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/three/stageGate.* src/three/StageMount.* src/three/Stage.css \
  src/components/site/StaticHeroArt.tsx src/styles/base.css src/App.tsx
git commit -m "feat: gate WebGL behind capability, with real art as the fallback"
```

---

### Task 4: The canvas and the shader backdrop

**Files:**
- Create: `frontend/src/three/Stage.tsx`
- Create: `frontend/src/three/Backdrop.tsx`
- Create: `frontend/src/three/tint.ts`
- Test: `frontend/src/three/tint.test.ts`

**Interfaces:**
- Consumes: `scrollState` (Task 1), `damp` (Task 1), `NAV_ITEMS` (Plan 1 Task 7).
- Produces: `<Stage />` (default export shape: named export `Stage`); `sectionTint(id: string): [number, number, number]` — linear RGB triple per section.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { sectionTint } from './tint'

describe('sectionTint', () => {
  it('gives every nav section a tint', () => {
    for (const id of ['', 'about', 'work', 'skills', 'experience', 'contact']) {
      const tint = sectionTint(id)
      expect(tint).toHaveLength(3)
      expect(tint.every((c) => c >= 0 && c <= 1)).toBe(true)
    }
  })

  it('warms the hero and cools the deeper sections', () => {
    const hero = sectionTint('')
    const experience = sectionTint('experience')
    expect(hero[0]).toBeGreaterThan(experience[0])
  })

  it('never returns the reserved chat teal', () => {
    // teal #5fd3c6 has a green channel far above its red channel; no backdrop tint may.
    for (const id of ['', 'about', 'work', 'skills', 'experience', 'contact']) {
      const [r, g] = sectionTint(id)
      expect(g).toBeLessThanOrEqual(r)
    }
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/three/tint.test.ts`
Expected: FAIL — cannot resolve `./tint`.

- [ ] **Step 3: Write `tint.ts`**

```ts
/**
 * Backdrop colour per section. Gold and ink only — teal is reserved for the chat
 * surface, so "the machine is speaking" stays a distinct signal.
 */
const TINTS: Record<string, [number, number, number]> = {
  '': [0.55, 0.42, 0.22], // hero — warmest
  about: [0.42, 0.33, 0.19],
  work: [0.3, 0.25, 0.17],
  skills: [0.26, 0.22, 0.16],
  experience: [0.2, 0.17, 0.13],
  contact: [0.34, 0.27, 0.17],
}

export function sectionTint(id: string): [number, number, number] {
  return TINTS[id] ?? TINTS['']
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npm test -- src/three/tint.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write `Backdrop.tsx`**

```tsx
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, ShaderMaterial, Vector2 } from 'three'
import { damp } from '../lib/frame'
import { scrollState } from '../lib/scrollState'
import { sectionTint } from './tint'

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uScroll;
  uniform vec3  uTint;
  uniform vec2  uResolution;

  // Value noise + 4-octave fbm. Cheap enough to run fullscreen every frame.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

    // Slow upward drift, so it reads as heat haze rather than a moving texture.
    float f = fbm(uv * aspect * 3.0 + vec2(0.0, -uTime * 0.035 - uScroll * 0.6));

    // Ember specks: sparse, high-frequency, drifting a little faster.
    float e = fbm(uv * aspect * 22.0 + vec2(uTime * 0.05, -uTime * 0.12));
    float embers = smoothstep(0.86, 0.99, e) * 0.5;

    // Radial falloff keeps the centre readable and the edges dark.
    float vignette = smoothstep(1.15, 0.25, length((uv - 0.5) * aspect * 2.0));

    vec3 color = uTint * (f * 0.34 + embers) * vignette;
    gl_FragColor = vec4(color, 1.0);
  }
`

export function Backdrop({ activeId }: { activeId: string }) {
  const { size } = useThree()
  const target = useRef(new Color())
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        depthWrite: false,
        depthTest: false,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uTint: { value: new Color(...sectionTint('')) },
          uResolution: { value: new Vector2(size.width, size.height) },
        },
      }),
    [],
  )

  useFrame((_, dt) => {
    const u = material.uniforms
    u.uTime.value += dt
    u.uScroll.value = damp(u.uScroll.value, scrollState.progress, 3, dt)
    u.uResolution.value.set(size.width, size.height)

    target.current.setRGB(...sectionTint(activeId))
    const tint = u.uTint.value as Color
    tint.r = damp(tint.r, target.current.r, 2, dt)
    tint.g = damp(tint.g, target.current.g, 2, dt)
    tint.b = damp(tint.b, target.current.b, 2, dt)
  })

  // A full-clip-space triangle: three vertices, no matrices, no culling surprises.
  return (
    <mesh frustumCulled={false} renderOrder={-1} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
```

- [ ] **Step 6: Write `Stage.tsx`**

```tsx
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { Suspense, useMemo, useState } from 'react'
import { NAV_ITEMS } from '../components/layout/Nav'
import { useSectionObserver } from '../lib/useSectionObserver'
import { Backdrop } from './Backdrop'

export function Stage() {
  const ids = useMemo(() => NAV_ITEMS.map((i) => i.id), [])
  const activeId = useSectionObserver(ids)
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
        camera={{ position: [0, 0.4, 4.2], fov: 38 }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr((d) => Math.min(2, d + 0.25))}
        />
        <AdaptiveDpr pixelated />
        <Backdrop activeId={activeId} />
        <Suspense fallback={null}>{/* HeroStage arrives in Task 5 */}</Suspense>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 7: Verify it renders**

```bash
npm run build && npm run preview
```

Open the site, confirm: a slow drifting warm haze behind the content, the tint cooling as you scroll into Experience, no horizontal scrollbar, the text fully legible over it. If the backdrop washes out the copy, lower the `0.34` multiplier in `FRAG`, not the text contrast.

- [ ] **Step 8: Commit**

```bash
git add src/three/Stage.tsx src/three/Backdrop.tsx src/three/tint.*
git commit -m "feat: one shader quad behind the whole page, tinted by section"
```

---

### Task 5: The hero wizard

**Files:**
- Create: `frontend/src/three/lights.ts`
- Create: `frontend/src/three/HeroWizard.tsx`
- Create: `frontend/src/three/heroPose.ts`
- Modify: `frontend/src/three/Stage.tsx`
- Test: `frontend/src/three/heroPose.test.ts`

**Interfaces:**
- Consumes: `useKtx2Gltf` from `src/three/ktx2.ts` (salvaged, Plan 1 Task 2), `applyWizardingMaterials` from `src/three/characterMaterial.ts`, `scrollState`, `damp`, `wizardState`, `targetIntensity`.
- Produces: `<HeroWizard />`; `heroPose(pointerX, pointerY, heroVisible)` → `{ yaw, pitch, lift, opacity }`, pure and clamped.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { heroPose, MAX_TILT } from './heroPose'

describe('heroPose', () => {
  it('is centred when the pointer is centred', () => {
    const pose = heroPose(0, 0, 1)
    expect(pose.yaw).toBeCloseTo(0)
    expect(pose.pitch).toBeCloseTo(0)
  })

  it('clamps tilt at the extremes of the viewport', () => {
    expect(heroPose(5, 5, 1).yaw).toBeLessThanOrEqual(MAX_TILT)
    expect(heroPose(-5, -5, 1).yaw).toBeGreaterThanOrEqual(-MAX_TILT)
  })

  it('fades and lifts the model away as the hero leaves', () => {
    const visible = heroPose(0, 0, 1)
    const gone = heroPose(0, 0, 0)
    expect(gone.opacity).toBe(0)
    expect(visible.opacity).toBe(1)
    expect(gone.lift).toBeGreaterThan(visible.lift)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/three/heroPose.test.ts`
Expected: FAIL — cannot resolve `./heroPose`.

- [ ] **Step 3: Write `heroPose.ts`**

```ts
export const MAX_TILT = 0.18 // radians — beyond this the model reads as spinning, not reacting

export type Pose = { yaw: number; pitch: number; lift: number; opacity: number }

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Pure target pose for a given pointer position and hero visibility. */
export function heroPose(pointerX: number, pointerY: number, heroVisible: number): Pose {
  return {
    yaw: clamp(pointerX * MAX_TILT, -MAX_TILT, MAX_TILT),
    pitch: clamp(-pointerY * MAX_TILT * 0.6, -MAX_TILT, MAX_TILT),
    // As the hero scrolls away the figure drifts up and out rather than clipping.
    lift: (1 - heroVisible) * 1.6,
    opacity: heroVisible,
  }
}
```

- [ ] **Step 4: Write `lights.ts`**

```tsx
/** The hero lighting rig, kept in one place so the mood is tunable from one file. */
export function HeroLights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      {/* Key: warm, high and to the camera's left, the way a candle would sit. */}
      <spotLight
        position={[-3.2, 4.2, 3.4]}
        angle={0.5}
        penumbra={0.9}
        intensity={26}
        color="#ffcf94"
      />
      {/* Rim: cold and behind, so the silhouette separates from the dark ground. */}
      <pointLight position={[2.6, 1.4, -2.4]} intensity={12} color="#9fd8ff" />
      {/* Fill: dim, front, keeps the face out of pure silhouette on mobile. */}
      <pointLight position={[0, 0.6, 3.2]} intensity={5} color="#e7c27d" />
    </>
  )
}
```

- [ ] **Step 5: Write `HeroWizard.tsx`**

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import type { Group, Mesh, PointLight } from 'three'
import { MeshStandardMaterial } from 'three'
import { damp } from '../lib/frame'
import { scrollState } from '../lib/scrollState'
import { applyWizardingMaterials } from './characterMaterial'
import { useKtx2Gltf } from './ktx2'
import { heroPose } from './heroPose'
import { targetIntensity, wizardState } from './wizardState'

const MODEL = '/models/wizard_improved.glb'
// Model-space position of the wand tip. Tune by eye; everything glowing hangs off it.
const WAND_TIP: [number, number, number] = [0.62, 1.12, 0.18]

export function HeroWizard() {
  const { scene } = useKtx2Gltf(MODEL)
  const group = useRef<Group>(null)
  const glow = useRef<PointLight>(null)

  // Clone so HMR never mutates the cached GLTF's shared materials.
  const model = useMemo(() => {
    const copy = scene.clone(true)
    applyWizardingMaterials(copy)
    copy.traverse((child) => {
      const mesh = child as Mesh
      if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
        mesh.material.transparent = true
      }
    })
    return copy
  }, [scene])

  useEffect(() => () => model.traverse(() => {}), [model])

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return

    const visible = scrollState.heroVisible
    g.visible = visible > 0.01
    // Once the hero is gone the model costs one visibility check per frame, nothing more.
    if (!g.visible) return

    const pose = heroPose(scrollState.pointerX, scrollState.pointerY, visible)
    const t = state.clock.elapsedTime

    g.rotation.y = damp(g.rotation.y, pose.yaw + Math.sin(t * 0.18) * 0.06, 2.6, dt)
    g.rotation.x = damp(g.rotation.x, pose.pitch, 2.6, dt)
    g.position.y = damp(g.position.y, -0.9 + pose.lift + Math.sin(t * 0.7) * 0.045, 2.2, dt)

    model.traverse((child) => {
      const mesh = child as Mesh
      if (mesh.isMesh && mesh.material instanceof MeshStandardMaterial) {
        mesh.material.opacity = pose.opacity
      }
    })

    wizardState.intensity = damp(
      wizardState.intensity,
      targetIntensity(wizardState.mode),
      3,
      dt,
    )
    if (glow.current) {
      // A slow flicker on top of the mood level, so the wand never looks like a lamp.
      glow.current.intensity =
        (2 + wizardState.intensity * 9) * (0.88 + Math.sin(t * 5.3) * 0.12)
    }
  })

  return (
    <group ref={group} position={[1.55, -0.9, 0]} scale={1.35} dispose={null}>
      <primitive object={model} />
      <pointLight ref={glow} position={WAND_TIP} color="#ffd79a" distance={3.4} decay={2} />
      <Sparkles count={26} scale={[0.9, 1.2, 0.9]} position={WAND_TIP} size={2.4} speed={0.35} color="#f6dfa6" />
    </group>
  )
}
```

- [ ] **Step 6: Mount it in `Stage.tsx`**

Replace the `Suspense` placeholder from Task 4:

```tsx
        <Suspense fallback={null}>
          <HeroLights />
          <HeroWizard />
        </Suspense>
```

and add the two imports. Also add drei's `<Preload all />` inside the same `Suspense` so the GLB finishes decoding before it is first shown.

- [ ] **Step 7: Run the tests and look at it**

Run: `npm test -- src/three/heroPose.test.ts`
Expected: PASS, 3 tests.

```bash
npm run build && npm run preview
```

Check by eye: the wizard sits in the right-hand column on desktop (the hero copy reserves 42% there), tracks the pointer gently, drifts up and fades as you scroll to About, and never overlaps the hero text. On mobile it should sit behind and above the copy without obscuring it — if it does, reduce `scale` and raise the `position` Y in the `<group>` under a `isCoarsePointer()` branch.

- [ ] **Step 8: Commit**

```bash
git add src/three/HeroWizard.tsx src/three/heroPose.* src/three/lights.ts src/three/Stage.tsx
git commit -m "feat: the wizard, reacting to the pointer and leaving with the hero"
```

---

### Task 6: Drag to orbit

**Files:**
- Create: `frontend/src/three/useDragOrbit.ts`
- Modify: `frontend/src/three/HeroWizard.tsx`, `frontend/src/three/Stage.css`
- Test: `frontend/src/three/useDragOrbit.test.ts`

**Interfaces:**
- Consumes: `damp` (Task 1).
- Produces: `orbitState: { offset: number; velocity: number; dragging: boolean }`; `useDragOrbit(): void` (installs listeners on the hero region); `applyDrag(offset: number, dx: number): number` — pure.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { applyDrag, MAX_ORBIT } from './useDragOrbit'

describe('applyDrag', () => {
  it('turns horizontal pixels into rotation', () => {
    expect(applyDrag(0, 100)).toBeGreaterThan(0)
    expect(applyDrag(0, -100)).toBeLessThan(0)
  })

  it('clamps so the model can never spin away from the camera', () => {
    expect(applyDrag(0, 100000)).toBeLessThanOrEqual(MAX_ORBIT)
    expect(applyDrag(0, -100000)).toBeGreaterThanOrEqual(-MAX_ORBIT)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- src/three/useDragOrbit.test.ts`
Expected: FAIL — cannot resolve `./useDragOrbit`.

- [ ] **Step 3: Write `useDragOrbit.ts`**

```ts
import { useEffect } from 'react'

export const MAX_ORBIT = 0.9 // radians either way — a look around, not a turntable
const PX_TO_RAD = 0.004

export const orbitState = { offset: 0, dragging: false }

/** Pure: new orbit offset after dragging `dx` pixels. */
export function applyDrag(offset: number, dx: number): number {
  const next = offset + dx * PX_TO_RAD
  return Math.min(MAX_ORBIT, Math.max(-MAX_ORBIT, next))
}

/**
 * Drag-to-orbit on the hero. The canvas itself is pointer-events:none so it never
 * eats clicks; the hero SECTION is what listens, and only while it is on screen.
 */
export function useDragOrbit(): void {
  useEffect(() => {
    const hero = document.getElementById('top')
    if (!hero) return
    let lastX = 0

    const down = (e: PointerEvent) => {
      // Ignore drags that start on a link or button — those are clicks.
      if ((e.target as HTMLElement).closest('a, button')) return
      orbitState.dragging = true
      lastX = e.clientX
      hero.classList.add('is-dragging')
    }
    const move = (e: PointerEvent) => {
      if (!orbitState.dragging) return
      orbitState.offset = applyDrag(orbitState.offset, e.clientX - lastX)
      lastX = e.clientX
    }
    const up = () => {
      orbitState.dragging = false
      hero.classList.remove('is-dragging')
    }

    hero.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      hero.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])
}
```

- [ ] **Step 4: Use it in `HeroWizard.tsx`**

Call `useDragOrbit()` at the top of the component, and fold the offset into the yaw line, springing back to zero when released:

```tsx
    const orbit = orbitState.dragging
      ? orbitState.offset
      : (orbitState.offset = damp(orbitState.offset, 0, 1.4, dt))

    g.rotation.y = damp(g.rotation.y, pose.yaw + orbit + Math.sin(t * 0.18) * 0.06, 2.6, dt)
```

Add a grab cursor to `Stage.css`:

```css
#top {
  cursor: grab;
}

#top.is-dragging {
  cursor: grabbing;
}

#top a,
#top button {
  cursor: pointer;
}
```

- [ ] **Step 5: Run it and watch it pass**

Run: `npm test -- src/three/useDragOrbit.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Verify by hand**

`npm run preview`, then drag across the hero: the wizard turns with the drag, springs back on release, and clicking the CTAs still navigates (the `closest('a, button')` guard). On touch, dragging must not block vertical scrolling — the listener is passive and never calls `preventDefault`.

- [ ] **Step 7: Commit**

```bash
git add src/three/useDragOrbit.* src/three/HeroWizard.tsx src/three/Stage.css
git commit -m "feat: drag the hero to look around the wizard"
```

---

### Task 7: Post-processing, the static fallback frame, and the performance gate

**Files:**
- Modify: `frontend/src/three/Stage.tsx`
- Modify: `frontend/vite.config.ts` (manual chunks)
- Create: `frontend/tools/shoot_hero.mjs`
- Modify: `frontend/package.json`
- Create: `frontend/public/shots/hero-wizard.webp` (generated)

**Interfaces:**
- Consumes: everything above.
- Produces: the finished stage; `npm run shoot:hero` regenerates the fallback image.

- [ ] **Step 1: Add the post chain**

In `Stage.tsx`, wrap the scene contents with the composer. Bloom is what makes the wand and the emissive `Glow_*` materials read as magic rather than as bright pixels:

```tsx
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
// inside <Canvas>, after the scene contents:
        <EffectComposer disableNormalPass>
          <Bloom intensity={0.75} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.72} eskil={false} />
        </EffectComposer>
```

- [ ] **Step 2: Split the 3D chunk**

In `vite.config.ts`, add to the returned config:

```ts
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            three: ['three', '@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          },
        },
      },
    },
```

- [ ] **Step 3: Verify the chunk is genuinely lazy**

```bash
npm run build
```

Read the output sizes. Expected: a `three-*.js` chunk of roughly 600–900 KB raw, listed separately from the entry chunk, and an entry chunk under 250 KB gzip. Then:

```bash
npm run preview
```

In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce", hard-reload, and confirm in the Network panel that **no `three-*.js` request is made**. If it is requested, the `lazy()` boundary has been bypassed — fix that before continuing.

- [ ] **Step 4: Generate the static fallback frame**

Create `frontend/tools/shoot_hero.mjs`:

```js
// Renders the live hero and crops the wizard out of it, so the reduced-motion
// fallback is the same character in the same pose rather than a stand-in.
import { mkdirSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4173/'
mkdirSync('public/shots', { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2500)) // let the model load and settle

await page.screenshot({
  path: 'public/shots/hero-wizard.png',
  clip: { x: 820, y: 120, width: 560, height: 700 },
  omitBackground: false,
})
await browser.close()
console.log('wrote public/shots/hero-wizard.png — convert to webp next')
```

Add scripts to `package.json`:

```json
    "shoot:hero": "node tools/shoot_hero.mjs && cwebp -q 82 public/shots/hero-wizard.png -o public/shots/hero-wizard.webp && rm public/shots/hero-wizard.png",
```

Run it against a live `npm run preview`. If `cwebp` is not installed (`sudo apt install webp`), keep the PNG and point `StaticHeroArt` at it instead — a working fallback matters more than the format.

- [ ] **Step 5: Measure against the budget**

With `npm run preview` running, in a fresh Chrome profile:

- Lighthouse mobile: performance ≥ 85, accessibility ≥ 95. Record both numbers.
- Performance panel, scroll the whole page: no long task over 200ms after load; frame rate stays above 50fps on the hero.
- Scroll past the hero and confirm in the Performance panel that GPU work drops — the wizard's `useFrame` early-returns and only the backdrop quad remains.

If performance is under 85, in this order: drop `dpr` to `[1, 1.5]`, reduce `Sparkles count`, then lower the fbm octaves in `Backdrop` from 4 to 3. Do not fix it by removing the fallback path or by deferring content.

- [ ] **Step 6: Re-shoot the whole site and critique it**

```bash
npm run shoot
```

**Invoke the `design-critique-loop` skill** on `.shots/*.png`. The specific question for this pass: does the 3D read as intentional craft, or as a screensaver behind text? Fix what it finds.

- [ ] **Step 7: Full green check**

Run: `npm test && npm run build`
Expected: both pass, including every Plan 1 test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bloom, a lazy 3D chunk, and a real fallback frame

The three.js chunk is only fetched when the visitor can and wants to see it;
reduced-motion and no-WebGL visitors get a still of the same wizard instead.
Lighthouse mobile: <record the number>."
```

---

## Self-Review

**Spec coverage:** Spec §5 "3D architecture" — backdrop (Task 4), hero set piece with pointer parallax and drag-orbit (Tasks 5–6), wizard state machine (Task 2, consumed by Plan 3), perf mechanisms and the reduced-motion/WebGL gate (Tasks 3 and 7). Spec §8 "usable with WebGL disabled" — Task 3 Step 7 and Task 7 Step 3.

**Placeholder scan:** the only deferred item is the `HeroStage` placeholder inside `Stage.tsx` at Task 4 Step 6, filled in Task 5 Step 6 within the same plan.

**Type consistency:** `damp` (Task 1) is used unchanged in Tasks 4, 5, 6. `scrollState.heroVisible` is written by `useScrollTracker` (Task 1) and read in `HeroWizard` (Task 5). `wizardState`/`targetIntensity` (Task 2) are read in Task 5 and written by Plan 3. `sectionTint` (Task 4) takes the same ids `NAV_ITEMS` produces (Plan 1 Task 7), with `''` as the pre-intersection hero default — matching `useSectionObserver`'s documented initial return.

**Carried risk:** `WAND_TIP` in Task 5 is a by-eye constant for this specific GLB. If the wand glow floats off the model, tune that triple — it is the only magic number in the file and is commented as such.
