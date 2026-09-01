# Motion Phase 1: Every Surface Leaves — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "a surface that arrives without a way to leave" a defect the build catches, and fix the one remaining instance of it.

**Architecture:** A browser-driven scenario gate (`tools/check_motion.mjs`) samples computed style every frame across a real interaction and fails when a state change produces zero intermediate frames. A source-level lint catches the specific smell that caused two of the three known bugs. The active-nav underline is rebuilt as one sliding marker, because five blinking `::after` pseudo-elements cannot ease.

**Tech Stack:** Node 22 + puppeteer-core (already a dev dependency, driving system Chrome), Vitest, React 18, plain CSS with design tokens.

**Spec:** `docs/superpowers/specs/2026-09-01-motion-system-design.md`

## Global Constraints

Copied verbatim from the spec and `frontend/CLAUDE.md`. Every task's requirements implicitly include these.

- All commands run from `frontend/`. `npm test` is `vitest run`; `npm run build` runs `tsc -b` first and a type error fails the build.
- CSS transitions use a shared easing token from `styles/tokens.css`. There are exactly two: `--ease` for anything arriving and settling, `--ease-loop` for anything `infinite`. Nothing hardcodes its own curve — `src/test/motion-language.test.ts` enforces this.
- Never animate a layout-triggering property: `top`, `left`, `right`, `bottom`, `inset`, `width`, `height`, `min/max-width`, `min/max-height`, `margin`, `padding`, `gap`, `font-size`, `line-height`, `flex`, `grid-template-*`. Prefer `transform` and `opacity`.
- Every damping rate is a named constant in `three/motion.ts` or `lib/scrollState.ts`. No bare numeric lambdas in a `damp(...)` call.
- Per-frame state lives in mutable module singletons read inside the frame loop. **Never** React state in a per-frame or per-pointer-event path.
- Banned words anywhere in `src/`, enforced by `src/test/copy-voice.test.ts`: grimoire, owl post, owlpost, spellbook, incantation, chronicles, familiar, muggle, hogwarts.
- Honour `prefers-reduced-motion`. `base.css` neutralises all transitions and animations globally under it; do not fight that.
- A panel kept mounted purely so it can animate out MUST carry `aria-hidden` and `inert` while closed.
- `minIntermediateFrames` default is **4**.

---

### Task 1: The motion gate harness, with its first scenario

**Files:**
- Create: `frontend/tools/check_motion.mjs`
- Modify: `frontend/package.json` (scripts block)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `tools/check_motion.mjs` exporting nothing (it is a CLI), and an `npm run check:motion` script. Later tasks add entries to its `SCENARIOS` array, whose shape is `{ name, viewport: [number, number], setup?: string, act: string, watch: string, minIntermediateFrames?: number }` where `setup` and `act` are **source strings of in-page functions**.

- [ ] **Step 1: Read the model this is built on**

Read `frontend/tools/check_contrast.mjs` end to end. The new tool follows its shape exactly: launch system Chrome via puppeteer-core, loop viewports, collect failures into an array, print one line per check, `process.exit(1)` if any failed.

Note especially its launch options, which this tool reuses verbatim:

```js
executablePath: '/usr/bin/google-chrome-stable',
args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
```

- [ ] **Step 2: Write the tool**

Create `frontend/tools/check_motion.mjs`:

```js
// Fails the build when an interactive surface changes state without animating.
//
// This class of bug has now shipped three times — the mobile menu snapped
// because it toggles `display`, the chat panel vanished on the next frame
// because it was conditionally rendered, and the contact form's invalid border
// flipped instantly. None of them was visible to a unit test: jsdom resolves no
// stylesheets, has no layout, and has no compositor.
//
// A source-level lint cannot do this either. That was prototyped and it flagged
// 12 of 22 state rules with roughly 10 false positives, because the CASCADE
// decides the answer: `.btn--solid:hover` looks untransitioned until you notice
// `.btn` two rules above it. `getComputedStyle` resolves the cascade for free,
// so the check runs in a browser.
//
// It is scenario-driven rather than selector-driven because every bug found so
// far came from an action ("close the panel"), never from reading a selector.
//
// Usage: `npm run check:motion` against a running preview (SHOOT_URL overrides
// the origin). Exits non-zero naming the scenario that snapped.
import puppeteer from 'puppeteer-core'

const URL = process.env.SHOOT_URL ?? 'http://localhost:4174/'

// How many frames to watch after the interaction. At 60Hz this is two thirds of
// a second — comfortably past the site's longest state change (0.6s).
const WINDOW_FRAMES = 40

// A real transition spans roughly twelve frames at the site's shortest duration
// (0.2s) and thirty-six at its longest (0.6s). Four is a floor a transition
// clears easily and a snap — which produces exactly zero — cannot.
const DEFAULT_MIN_INTERMEDIATE = 4

const SCENARIOS = [
  {
    name: 'chat panel closes',
    viewport: [390, 844],
    setup: `async () => {
      document.querySelector('.chat__launcher').click()
      await new Promise((r) => setTimeout(r, 600))
    }`,
    act: `() => document.querySelector('.chat__close').click()`,
    watch: '.chat__panel',
  },
]

/**
 * Runs one scenario and reports how many frames the watched element spent
 * looking like neither its start state nor its end state.
 *
 * Everything happens inside one in-page rAF loop, including the interaction.
 * Driving the click from Node instead would put it on a different clock from
 * the sampling and the first frames of the transition would be missed.
 */
async function runScenario(page, scenario) {
  return page.evaluate(
    async ({ watch, actSrc, setupSrc, frames }) => {
      if (setupSrc) await new Function('return (' + setupSrc + ')')()()

      // Re-queried every frame on purpose: an element REMOVED mid-transition is
      // the exact bug being hunted, and a captured reference would keep
      // reporting stale style for a node no longer in the document.
      const signature = () => {
        const el = document.querySelector(watch)
        if (!el) return 'gone'
        const s = getComputedStyle(el)
        return [
          s.opacity, s.transform, s.color, s.backgroundColor,
          s.borderColor, s.display, s.translate, s.scale,
        ].join('|')
      }

      const act = new Function('return (' + actSrc + ')')()
      const rows = []
      await new Promise((resolve) => {
        let f = 0
        const tick = () => {
          f++
          // Two frames of baseline first, so `rows[0]` is the settled start
          // state rather than whatever the click itself produced.
          if (f === 3) act()
          rows.push(signature())
          if (f < frames) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })

      const first = rows[0]
      const last = rows[rows.length - 1]
      return {
        changed: first !== last,
        intermediate: rows.filter((r) => r !== first && r !== last).length,
        first,
        last,
      }
    },
    {
      watch: scenario.watch,
      actSrc: scenario.act,
      setupSrc: scenario.setup ?? null,
      frames: WINDOW_FRAMES,
    },
  )
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
})

const failures = []

for (const scenario of SCENARIOS) {
  const [width, height] = scenario.viewport
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  // The scene fades in over roughly a second; measuring through that would
  // report motion this check did not cause.
  await page.waitForFunction(() => window.__modelReady && window.__modelReady.hero, {
    timeout: 20000,
  })
  await new Promise((r) => setTimeout(r, 1200))

  const min = scenario.minIntermediateFrames ?? DEFAULT_MIN_INTERMEDIATE
  const result = await runScenario(page, scenario)

  if (!result.changed) {
    failures.push(`${scenario.name}: nothing changed at all — the scenario no longer exercises anything`)
    console.log(`✗ ${scenario.name.padEnd(34)} no state change`)
  } else if (result.intermediate < min) {
    failures.push(`${scenario.name}: ${result.intermediate} intermediate frames, needs ${min}`)
    console.log(`✗ ${scenario.name.padEnd(34)} ${result.intermediate} intermediate frames (needs ${min}) — it snaps`)
  } else {
    console.log(`✓ ${scenario.name.padEnd(34)} ${result.intermediate} intermediate frames`)
  }
  await page.close()
}

await browser.close()

if (failures.length) {
  console.error('\nsurfaces that change state without animating:')
  for (const f of failures) console.error(`  ${f}`)
  process.exit(1)
}
console.log(`\nall ${SCENARIOS.length} scenario(s) animate`)
```

- [ ] **Step 3: Wire the npm script**

In `frontend/package.json`, add to `scripts`, immediately after `check:contrast`:

```json
"check:motion": "node tools/check_motion.mjs"
```

- [ ] **Step 4: Verify it passes against the current code**

```bash
cd frontend
npm run build
npx vite preview --port 4174 --strictPort &
sleep 4
npm run check:motion
```

Expected: `✓ chat panel closes   9 intermediate frames` (the exact count may vary by a frame or two) and `all 1 scenario(s) animate`.

- [ ] **Step 5: Verify it FAILS when the transition is removed**

A gate that has never failed is not known to work. Temporarily break it:

```bash
cd frontend
# Comment out the transition on .chat__panel
sed -i 's/^  transition-behavior: allow-discrete;/  \/* transition-behavior: allow-discrete; *\//' src/components/chat/ChatDock.css
npm run build && npm run check:motion; echo "exit: $?"
```

Expected: `✗ chat panel closes ... it snaps` and `exit: 1`.

Then restore:

```bash
cd frontend
git checkout src/components/chat/ChatDock.css
npm run build && npm run check:motion
```

Expected: passing again.

- [ ] **Step 6: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/tools/check_motion.mjs frontend/package.json
git commit -m "test: a gate that fails when a surface changes state without animating

Scenario-driven and browser-driven, because both matter. Every instance of
this bug was found by performing an action, never by reading a selector; and
a source-level prototype flagged 12 of 22 state rules with roughly 10 false
positives, because the cascade is what decides the answer.

Verified in both directions: it passes on the fixed chat panel and fails when
the panel's transition is commented out."
```

---

### Task 2: The remaining scenarios

**Files:**
- Modify: `frontend/tools/check_motion.mjs` (the `SCENARIOS` array only)

**Interfaces:**
- Consumes: the `SCENARIOS` shape and `runScenario` from Task 1.
- Produces: five further guarded surfaces. No new exports.

- [ ] **Step 1: Add the scenarios**

Replace the `SCENARIOS` array in `frontend/tools/check_motion.mjs` with:

```js
const SCENARIOS = [
  {
    name: 'chat panel opens',
    viewport: [390, 844],
    act: `() => document.querySelector('.chat__launcher').click()`,
    watch: '.chat__panel',
  },
  {
    name: 'chat panel closes',
    viewport: [390, 844],
    setup: `async () => {
      document.querySelector('.chat__launcher').click()
      await new Promise((r) => setTimeout(r, 600))
    }`,
    act: `() => document.querySelector('.chat__close').click()`,
    watch: '.chat__panel',
  },
  {
    name: 'mobile menu opens',
    viewport: [390, 844],
    act: `() => document.querySelector('.nav__toggle').click()`,
    watch: '.nav__links',
  },
  {
    name: 'mobile menu closes',
    viewport: [390, 844],
    setup: `async () => {
      document.querySelector('.nav__toggle').click()
      await new Promise((r) => setTimeout(r, 600))
    }`,
    act: `() => document.querySelector('.nav__toggle').click()`,
    watch: '.nav__links',
  },
  {
    name: 'field turns invalid',
    viewport: [390, 844],
    setup: `async () => {
      document.getElementById('contact').scrollIntoView()
      await new Promise((r) => setTimeout(r, 900))
    }`,
    // Submitting an empty form is what marks the fields invalid; that is the
    // real path a visitor takes, not a synthetic attribute flip.
    act: `() => document.querySelector('.contact__form button[type=submit]').click()`,
    watch: '.field input',
  },
  {
    name: 'project card on hover',
    viewport: [1440, 900],
    setup: `async () => {
      document.getElementById('work').scrollIntoView()
      await new Promise((r) => setTimeout(r, 1200))
    }`,
    // :hover cannot be forced from script, so drive the same declarations the
    // hover rule sets. If .card's transition is ever dropped this still fails.
    act: `() => {
      const c = document.querySelector('.card')
      c.style.borderColor = 'rgb(231 194 125 / 0.36)'
      c.style.transform = 'translateY(-2px)'
    }`,
    watch: '.card',
  },
]
```

- [ ] **Step 2: Confirm the submit-button selector is right**

The `field turns invalid` scenario depends on the contact form's markup. Verify before running:

```bash
cd frontend
grep -n "type=\"submit\"\|className=\"contact__form\"\|<form" src/components/site/Contact.tsx
```

If the class or button differs, correct the `act` string to match what is actually there. Do not guess.

- [ ] **Step 3: Run the gate**

```bash
cd frontend
npm run build
npm run check:motion
```

Expected: six lines. `chat panel opens`, `chat panel closes`, `mobile menu opens`, `mobile menu closes` and `project card on hover` pass.

**`field turns invalid` is expected to FAIL only if the form does not mark fields invalid on empty submit.** If it fails with `no state change`, the scenario is wrong, not the site: fix the scenario (check what `aria-invalid` is actually set on and when) rather than changing the site.

- [ ] **Step 4: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/tools/check_motion.mjs
git commit -m "test: guard every interactive surface, not just the one that broke"
```

---

### Task 3: Lint the smell that caused two of the three bugs

**Files:**
- Modify: `frontend/src/test/motion-language.test.ts`

**Interfaces:**
- Consumes: the file's existing `cssFiles` array and `stripComments` helper.
- Produces: one further assertion in the `CSS motion` describe block. No new exports.

- [ ] **Step 1: Write the failing test**

Add inside the existing `describe('CSS motion', ...)` block in `frontend/src/test/motion-language.test.ts`:

```ts
  it('never gives an element an entrance with no way to leave', () => {
    // The smell behind two of the three snapping surfaces: a `@keyframes`
    // entrance plays once, on mount, and says nothing about leaving. The chat
    // panel had `animation: chat-in` and vanished between two frames; the
    // mobile menu had no motion at all. A transition has both directions.
    //
    // A one-shot `animation` is only a problem when the element it decorates
    // can go away again. Looping animations (the scroll cue) and elements that
    // also declare a transition are fine.
    const offenders: string[] = []
    for (const file of cssFiles) {
      const css = stripComments(readFileSync(file, 'utf8'))
      for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = block[1].trim()
        const body = block[2]
        if (selector.startsWith('@')) continue
        const animation = body.match(/(?:^|[;\s])animation\s*:([^;]*)/)
        if (!animation) continue
        if (/\binfinite\b/.test(animation[1])) continue
        if (/(?:^|[;\s])transition\s*:/.test(body)) continue
        offenders.push(`${file}: ${selector} has a one-shot animation and no transition`)
      }
    }
    expect(offenders).toEqual([])
  })
```

- [ ] **Step 2: Run it and see where it stands**

```bash
cd frontend
npx vitest run src/test/motion-language.test.ts
```

Expected: **PASS.** `chat-in` was already removed, and the only remaining one-shot animations should be none. If it FAILS, it has found a real fourth instance — read the offender, fix that surface the way the chat panel was fixed (`@starting-style` + `transition-behavior: allow-discrete`), and add a `check_motion` scenario for it before continuing.

- [ ] **Step 3: Verify the lint actually catches the original bug**

```bash
cd frontend
cat >> src/components/chat/ChatDock.css <<'EOF'
.motion-lint-probe { animation: chat-probe 0.3s var(--ease) both; }
@keyframes chat-probe { from { opacity: 0; } to { opacity: 1; } }
EOF
npx vitest run src/test/motion-language.test.ts
```

Expected: FAIL, naming `.motion-lint-probe`.

Then remove the probe:

```bash
cd frontend
git checkout src/components/chat/ChatDock.css
npx vitest run src/test/motion-language.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/test/motion-language.test.ts
git commit -m "test: an entrance animation with no transition beside it is a smell

Verified against a deliberately planted offender, then removed."
```

---

### Task 4: The nav marker's position, as a pure function

**Files:**
- Create: `frontend/src/components/layout/navMarker.ts`
- Test: `frontend/src/components/layout/navMarker.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const MARKER_BASE_WIDTH = 100`
  - `export type MarkerGeometry = { x: number; scaleX: number; visible: boolean }`
  - `export function markerGeometry(link: { offsetLeft: number; offsetWidth: number } | null): MarkerGeometry`
  - `export function markerTransform(geometry: MarkerGeometry): string`

Task 5 consumes both functions and the constant.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/layout/navMarker.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MARKER_BASE_WIDTH, markerGeometry, markerTransform } from './navMarker'

describe('markerGeometry', () => {
  it('sits at the active link and matches its width', () => {
    const g = markerGeometry({ offsetLeft: 240, offsetWidth: 50 })
    expect(g.visible).toBe(true)
    expect(g.x).toBe(240)
    expect(g.scaleX).toBeCloseTo(50 / MARKER_BASE_WIDTH, 6)
  })

  it('hides rather than parking at the first item when nothing is active', () => {
    // At the hero no nav item is active. A marker parked under "About" would be
    // claiming the visitor is somewhere they are not.
    const g = markerGeometry(null)
    expect(g.visible).toBe(false)
  })

  it('never produces a zero or negative scale', () => {
    // A zero scale collapses the marker to nothing and, on the way back out,
    // animates from a degenerate matrix. Guard the input rather than the CSS.
    expect(markerGeometry({ offsetLeft: 0, offsetWidth: 0 }).scaleX).toBeGreaterThan(0)
    expect(markerGeometry({ offsetLeft: 0, offsetWidth: -20 }).scaleX).toBeGreaterThan(0)
  })
})

describe('markerTransform', () => {
  it('moves and scales on transform alone, never on layout', () => {
    // `width` is a layout-triggering property and animating it re-flows the nav
    // every frame — motion-language.test.ts forbids it. Scaling a fixed-width
    // base is how this marker changes width without changing its box.
    const css = markerTransform(markerGeometry({ offsetLeft: 120, offsetWidth: 75 }))
    expect(css).toContain('translateX(120px)')
    expect(css).toContain(`scaleX(${75 / MARKER_BASE_WIDTH})`)
    expect(css).not.toMatch(/width|left|margin/)
  })

  it('renders an invisible marker without moving it somewhere arbitrary', () => {
    const css = markerTransform(markerGeometry(null))
    expect(css).toContain('translateX(0px)')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend
npx vitest run src/components/layout/navMarker.test.ts
```

Expected: FAIL — `Failed to resolve import "./navMarker"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/layout/navMarker.ts`:

```ts
/**
 * The width the marker element is actually laid out at. Its real width comes
 * from scaling this, never from changing the box: `width` is a layout-triggering
 * property and animating it would re-flow the nav on every section crossing.
 */
export const MARKER_BASE_WIDTH = 100

export type MarkerGeometry = { x: number; scaleX: number; visible: boolean }

/**
 * Where the underline should sit, given the active link's own offset box.
 *
 * This replaced a per-link `::after`. Five pseudo-elements that each blink on
 * and off cannot ease between themselves — measured, the marker handed over at
 * opacity 1 to 1 in a single frame, five times per scroll. One element that
 * moves can.
 *
 * `null` means no section owns the screen, which is the hero. The marker hides
 * rather than parking under the first item, because parking would claim the
 * visitor is somewhere they are not.
 */
export function markerGeometry(
  link: { offsetLeft: number; offsetWidth: number } | null,
): MarkerGeometry {
  if (!link) return { x: 0, scaleX: 1, visible: false }
  // A zero or negative width would collapse the marker and then animate out of a
  // degenerate matrix on the way back. Clamp the input, not the stylesheet.
  const width = Math.max(1, link.offsetWidth)
  return { x: link.offsetLeft, scaleX: width / MARKER_BASE_WIDTH, visible: true }
}

/** The `transform` value for a geometry — transform only, by construction. */
export function markerTransform(geometry: MarkerGeometry): string {
  return `translateX(${geometry.x}px) scaleX(${geometry.scaleX})`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd frontend
npx vitest run src/components/layout/navMarker.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/components/layout/navMarker.ts frontend/src/components/layout/navMarker.test.ts
git commit -m "feat: pure geometry for a nav underline that can actually move"
```

---

### Task 5: Wire the marker into the nav

**Files:**
- Modify: `frontend/src/components/layout/Nav.tsx`
- Modify: `frontend/src/components/layout/Nav.css`

**Interfaces:**
- Consumes: `MARKER_BASE_WIDTH`, `markerGeometry`, `markerTransform` from Task 4; the existing `SECTION_IDS` and `active` value in `Nav.tsx`.
- Produces: a `.nav__marker` element inside `.nav__links`. Task 6 watches this selector.

- [ ] **Step 1: Add the marker element and its positioning effect**

In `frontend/src/components/layout/Nav.tsx`:

Add to the imports:

```tsx
import { MARKER_BASE_WIDTH, markerGeometry, markerTransform } from './navMarker'
```

Add these refs and the effect inside `Nav()`, after the existing `const [open, setOpen] = useState(false)`:

```tsx
  const listRef = useRef<HTMLElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)

  // Position the marker whenever the active section changes, and on resize.
  // NOT per frame: the active item changes on section crossings, not
  // continuously, so a rAF loop here would burn a frame's work to write the
  // same transform it wrote last time.
  useEffect(() => {
    const place = () => {
      const marker = markerRef.current
      if (!marker) return
      const link = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]') ?? null
      const geometry = markerGeometry(
        link ? { offsetLeft: link.offsetLeft, offsetWidth: link.offsetWidth } : null,
      )
      marker.style.transform = markerTransform(geometry)
      marker.style.opacity = geometry.visible ? '1' : '0'
    }
    place()
    window.addEventListener('resize', place, { passive: true })
    return () => window.removeEventListener('resize', place)
  }, [active])
```

Add `ref={listRef}` to the existing `<nav id="nav-links" ...>` element, and add the marker as its **last** child, after the `NAV_ITEMS.map(...)` block and after the CV link:

```tsx
          <span className="nav__marker" ref={markerRef} aria-hidden="true" />
```

Ensure `useRef` is in the React import at the top of the file.

- [ ] **Step 2: Remove the old underline and style the marker**

In `frontend/src/components/layout/Nav.css`, DELETE these two rules entirely:

```css
.nav__link[aria-current='true'] {
  position: relative;
}

.nav__link[aria-current='true']::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -6px;
  height: 1px;
  background: var(--gold);
}
```

Then add, immediately after the `.nav__cv` rule:

```css
/* One marker that slides, not five that blink.
   The old version was a `::after` on whichever link was current, so the
   underline did not move between items — it ceased to exist on one and began
   on the next. Measured during a scroll: the handover happened at opacity 1 to
   1 in a single frame, five times per pass, at the top of the viewport.

   Laid out at MARKER_BASE_WIDTH (navMarker.ts) and scaled to each link's real
   width, because `width` is layout-triggering and animating it would re-flow
   the nav on every section crossing. `transform-origin: left` is what makes the
   scale grow rightward from the link's left edge rather than from its middle. */
.nav__marker {
  position: absolute;
  left: 0;
  bottom: -6px;
  width: 100px; /* MARKER_BASE_WIDTH */
  height: 1px;
  background: var(--gold);
  transform-origin: left;
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.32s var(--ease),
    opacity 0.32s var(--ease);
}
```

The marker needs a positioned ancestor. Add `position: relative;` to the existing `@media (min-width: 780px) .nav__links` rule.

Finally, hide it below the breakpoint — the mobile menu is a vertical panel where a sliding underline reads as noise, and it keeps colour-only indication:

```css
@media (max-width: 779px) {
  .nav__marker {
    display: none;
  }
}
```

- [ ] **Step 3: Verify types and the existing suite**

```bash
cd frontend
npx tsc -b && npm test
```

Expected: types clean, all tests pass. `Nav.test.tsx` asserts `aria-current` on links, which is untouched.

- [ ] **Step 4: Verify the marker actually slides**

```bash
cd frontend
npm run build
npx vite preview --port 4174 --strictPort &
sleep 4
```

Then in a browser at 1440x900, scroll from the hero through Work and watch the underline. It must travel between items, not blink. Confirm the hero shows no marker at all.

- [ ] **Step 5: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/components/layout/Nav.tsx frontend/src/components/layout/Nav.css
git commit -m "fix: the nav underline travels between items instead of blinking

It was a ::after on whichever link was current, so it did not move between
items — it stopped existing on one and started on the next, at opacity 1 to 1
in a single frame, five times per scroll."
```

---

### Task 6: Guard the marker, and record the false-positive verdicts

**Files:**
- Modify: `frontend/tools/check_motion.mjs` (`SCENARIOS` array)
- Modify: `frontend/CLAUDE.md`

**Interfaces:**
- Consumes: the `.nav__marker` element from Task 5; the `SCENARIOS` shape from Task 1.
- Produces: the completed Phase 1 gate. Nothing downstream consumes this.

- [ ] **Step 1: Add the marker scenario**

Append to the `SCENARIOS` array in `frontend/tools/check_motion.mjs`:

```js
  {
    name: 'nav marker moves between sections',
    viewport: [1440, 900],
    setup: `async () => {
      document.getElementById('about').scrollIntoView()
      await new Promise((r) => setTimeout(r, 1400))
    }`,
    act: `() => document.getElementById('work').scrollIntoView()`,
    watch: '.nav__marker',
    // The scroll itself is smooth and takes a while, so the marker's own
    // transition starts partway through the window rather than at frame three.
    minIntermediateFrames: 4,
  },
```

- [ ] **Step 2: Run the full gate**

```bash
cd frontend
npm run build
npm run check:motion
```

Expected: seven scenarios, all passing.

- [ ] **Step 3: Record the verdicts so the next audit does not re-litigate them**

Add to `frontend/CLAUDE.md`, inside the "Motion — the rules that keep being rediscovered" section:

```markdown
- **`npm run check:motion` is the gate for this, and it runs in a browser on purpose.** A source-level
  lint was prototyped and flagged 12 of 22 state rules with roughly 10 false positives, because the
  cascade decides the answer. Confirmed NOT snapping, verified in the browser — do not re-report these:
  `.btn--solid:hover` and `.btn--ghost:hover` (the `.btn` base transitions `background`, `border-color`
  and `color`), `.field input[aria-invalid]` (the base rule transitions `border-color`),
  `.nav__link[aria-current]` (`.nav__link` transitions `color`), and `.nav__links.is-open`'s layout
  properties (they change together with `display`, under the panel's own fade).
```

- [ ] **Step 4: Full verification**

```bash
cd frontend
npm test && npx tsc -b && npm run build && npm run check:contrast && npm run check:motion && npm run shoot
```

Expected: every command exits zero.

- [ ] **Step 5: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/tools/check_motion.mjs frontend/CLAUDE.md
git commit -m "test: guard the nav marker, and record which suspects were innocent"
```

---

## Phase 1 acceptance

- `npm run check:motion` passes with seven scenarios and has been demonstrated to fail when a transition is removed.
- `motion-language.test.ts` catches an entrance animation with no transition beside it, demonstrated against a planted offender.
- The nav underline slides; the hero shows no marker.
- `npm test`, `npx tsc -b`, `npm run build`, `npm run check:contrast`, `npm run shoot` all pass.
- Nothing here depends on Phase 2. This is shippable on its own.
