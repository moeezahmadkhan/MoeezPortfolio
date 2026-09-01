# Motion Phase 2: Choreography and Hero Reactivity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a section change read as a figure arriving rather than a cross-fade, and make the hero respond to the visitor with weight.

**Architecture:** Two independent strands. Drag-orbit gains release momentum by finally using the `velocity` field that has been declared and unused since it was written. Section changes gain a short scripted entry from a new pure, table-driven `three/choreography.ts`, driven by the rig's own existing fade value — no new state, no new timers, and no new scroll input.

**Tech Stack:** React 18, @react-three/fiber, Vitest. All maths pure and unit-tested, following `rigPose.ts`'s conventions.

**Spec:** `docs/superpowers/specs/2026-09-01-motion-system-design.md`

**Depends on:** Phase 1 (`2026-09-01-motion-phase-1-exits.md`) should land first — `npm run check:motion` is how this phase proves it broke nothing.

## Global Constraints

Copied verbatim from the spec and `frontend/CLAUDE.md`. Every task's requirements implicitly include these.

- All commands run from `frontend/`. `npm run build` runs `tsc -b` first; a type error fails the build.
- Anything driven by time in JS uses `damp` from `src/lib/frame.ts`, never `v += (t - v) * 0.1`. A 144Hz monitor and a 60Hz one must show the same motion.
- Anything driven by scroll reads the **smoothed** channel (`scrollState.smooth`), never the raw position.
- Every damping rate is a named constant in `three/motion.ts` or `lib/scrollState.ts`. A bare numeric lambda in a `damp(...)` call is a number nobody can re-tune.
- Per-frame state lives in mutable module singletons. **Never** React state in a per-frame path.
- No per-frame allocation in the frame loop. Pure helpers write into a caller-owned object and return it, the way `rigPose` does.
- Never animate a layout-triggering property. `transform`, `opacity` and three.js object properties only.
- **Section membership comes from `useSectionObserver` only. No scroll-fraction table, ever** — that is what got v1 deleted.
- No pinning, no scroll-jacking, no scroll library.
- Content never moves to accommodate the model. The model gets reserved space or it recedes.
- The site stays complete and readable with WebGL gated off.
- Choreography reads the rig's own fade and `scrollState.smooth`. Nothing else.

---

### Task 1: Orbit momentum, as pure maths

**Files:**
- Modify: `frontend/src/three/motion.ts`
- Modify: `frontend/src/three/useDragOrbit.ts`
- Test: `frontend/src/three/useDragOrbit.test.ts`

**Interfaces:**
- Consumes: `damp` from `src/lib/frame.ts`; existing `MAX_ORBIT` and `orbitState`.
- Produces:
  - `export const ORBIT_FRICTION_LAMBDA = 2.2` in `three/motion.ts`
  - `export type OrbitState = { offset: number; velocity: number; dragging: boolean }` in `useDragOrbit.ts`
  - `export function advanceOrbit(state: OrbitState, dt: number): void` — **mutates in place**, matching `advanceSmooth`'s precedent in `lib/scrollState.ts`.

Task 2 calls `advanceOrbit` from the frame loop.

- [ ] **Step 1: Write the failing test**

`frontend/src/three/useDragOrbit.test.ts` already exists with two tests. Add these imports **at the top of the file**, beside the ones already there — not at the bottom, where the `describe` block goes:

```ts
import { ORBIT_FRICTION_LAMBDA } from './motion'
import { advanceOrbit, MAX_ORBIT, type OrbitState } from './useDragOrbit'
```

If the file already imports `MAX_ORBIT` or other names from `./useDragOrbit`, merge into that existing import rather than adding a second one from the same module.

Then append this block at the end of the file:

```ts
describe('advanceOrbit', () => {
  const state = (offset: number, velocity: number): OrbitState => ({
    offset,
    velocity,
    dragging: false,
  })

  it('carries a flick past the point the finger left off', () => {
    // The whole point of momentum: releasing mid-gesture should not stop the
    // figure dead. Before this, a release damped straight back to rest and a
    // flick and a slow drag felt identical.
    const s = state(0.2, 1.5)
    advanceOrbit(s, 1 / 60)
    expect(s.offset).toBeGreaterThan(0.2)
  })

  it('bleeds the velocity away rather than spinning forever', () => {
    const s = state(0, 2)
    let previous = Infinity
    for (let i = 0; i < 60; i++) {
      advanceOrbit(s, 1 / 60)
      expect(Math.abs(s.velocity)).toBeLessThan(previous)
      previous = Math.abs(s.velocity)
    }
    expect(Math.abs(s.velocity)).toBeLessThan(0.05)
  })

  it('comes back to rest', () => {
    const s = state(0.6, 1)
    for (let i = 0; i < 600; i++) advanceOrbit(s, 1 / 60)
    expect(Math.abs(s.offset)).toBeLessThan(0.01)
  })

  it('never lets momentum throw the figure past its limit', () => {
    // A hard flick must not become a turntable. MAX_ORBIT is a look around.
    const s = state(MAX_ORBIT, 50)
    for (let i = 0; i < 30; i++) {
      advanceOrbit(s, 1 / 60)
      expect(Math.abs(s.offset)).toBeLessThanOrEqual(MAX_ORBIT + 1e-9)
    }
  })

  it('leaves a rig that was never touched exactly where it stands', () => {
    const s = state(0, 0)
    advanceOrbit(s, 1 / 60)
    expect(s.offset).toBe(0)
    expect(s.velocity).toBe(0)
  })

  it('is frame-rate independent', () => {
    // One 1/30s step must land where two 1/60s steps do, near enough. A 144Hz
    // monitor and a 60Hz one have to show the same motion.
    const slow = state(0.5, 1)
    const fast = state(0.5, 1)
    advanceOrbit(slow, 1 / 30)
    advanceOrbit(fast, 1 / 60)
    advanceOrbit(fast, 1 / 60)
    expect(slow.offset).toBeCloseTo(fast.offset, 2)
  })

  it('names its friction rate rather than burying a literal', () => {
    expect(typeof ORBIT_FRICTION_LAMBDA).toBe('number')
    expect(ORBIT_FRICTION_LAMBDA).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend
npx vitest run src/three/useDragOrbit.test.ts
```

Expected: FAIL — `advanceOrbit` and `ORBIT_FRICTION_LAMBDA` are not exported.

- [ ] **Step 3: Add the friction constant**

In `frontend/src/three/motion.ts`, add after `ORBIT_RETURN_LAMBDA`:

```ts
/**
 * How fast a released flick's velocity bleeds away.
 *
 * Slower than ORBIT_RETURN_LAMBDA on purpose: the return spring and the
 * friction run at the same time, and if friction were the faster of the two the
 * velocity would be gone before it had moved anything and a flick would be
 * indistinguishable from letting go.
 */
export const ORBIT_FRICTION_LAMBDA = 2.2
```

- [ ] **Step 4: Implement `advanceOrbit` and track velocity while dragging**

In `frontend/src/three/useDragOrbit.ts`:

Add the imports:

```ts
import { damp } from '../lib/frame'
import { ORBIT_FRICTION_LAMBDA, ORBIT_RETURN_LAMBDA } from './motion'
```

Replace the `orbitState` declaration with:

```ts
export type OrbitState = { offset: number; velocity: number; dragging: boolean }

export const orbitState: OrbitState = { offset: 0, velocity: 0, dragging: false }
```

Add after `applyDrag`:

```ts
/**
 * One frame of a released drag: momentum first, then the spring home.
 *
 * `velocity` had been declared on `orbitState` since the file was written and
 * never once read or assigned — a released drag damped straight back to rest,
 * so a flick and a slow drag felt the same. This is what it was for.
 *
 * Mutates in place, like `advanceSmooth` in lib/scrollState.ts: this runs every
 * frame forever and a fresh object per frame would be garbage the collector has
 * to chase during exactly the gesture it is meant to smooth.
 */
export function advanceOrbit(state: OrbitState, dt: number): void {
  state.velocity = damp(state.velocity, 0, ORBIT_FRICTION_LAMBDA, dt)
  const carried = state.offset + state.velocity * dt
  const settled = damp(carried, 0, ORBIT_RETURN_LAMBDA, dt)
  state.offset = Math.min(MAX_ORBIT, Math.max(-MAX_ORBIT, settled))
}
```

Then make the pointer handlers record velocity. Replace the `down` and `move` handlers inside `useDragOrbit`:

```ts
    let lastX = 0
    let lastT = 0

    const down = (e: PointerEvent) => {
      // Ignore drags that start on a link or button — those are clicks.
      if ((e.target as HTMLElement).closest('a, button')) return
      orbitState.dragging = true
      orbitState.velocity = 0
      lastX = e.clientX
      lastT = e.timeStamp
      hero.classList.add('is-dragging')
    }
    const move = (e: PointerEvent) => {
      if (!orbitState.dragging) return
      const dx = e.clientX - lastX
      // `e.timeStamp`, not `performance.now()`: it is the moment the browser
      // recorded the input, so a coalesced batch of moves reports the interval
      // it actually covered rather than the interval it was delivered in.
      const dt = Math.max(1, e.timeStamp - lastT) / 1000
      orbitState.offset = applyDrag(orbitState.offset, dx)
      orbitState.velocity = (dx * PX_TO_RAD) / dt
      lastX = e.clientX
      lastT = e.timeStamp
      hero.classList.add('is-dragging')
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd frontend
npx vitest run src/three/useDragOrbit.test.ts && npx tsc -b
```

Expected: PASS, types clean.

- [ ] **Step 6: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/three/useDragOrbit.ts frontend/src/three/useDragOrbit.test.ts frontend/src/three/motion.ts
git commit -m "feat: a released drag carries its momentum

orbitState.velocity had been declared and never read since the file was
written, so a flick and a slow drag ended identically."
```

---

### Task 2: Spend the momentum in the frame loop, and deepen the pointer response

**Files:**
- Modify: `frontend/src/three/CharacterRig.tsx`
- Modify: `frontend/src/three/rigPose.ts`
- Modify: `frontend/src/three/motion.ts`
- Test: `frontend/src/three/rigPose.test.ts`

**Interfaces:**
- Consumes: `advanceOrbit` and `orbitState` from Task 1.
- Produces: `export const PITCH_LAMBDA` in `three/motion.ts`; `MAX_TILT` retuned in `rigPose.ts`. No signature changes.

- [ ] **Step 1: Write the failing test for the deeper tilt**

Add to the `describe('rigPose', ...)` block in `frontend/src/three/rigPose.test.ts`:

```ts
  it('turns far enough to read as attending to the visitor', () => {
    // 0.18 rad is about ten degrees, which measured as shy: the figure barely
    // acknowledged the pointer. The ceiling is where it starts reading as
    // spinning rather than looking, which MAX_FOCUS_TURN already marks.
    expect(MAX_TILT).toBeGreaterThan(0.2)
    expect(MAX_TILT).toBeLessThan(MAX_FOCUS_TURN)
  })
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend
npx vitest run src/three/rigPose.test.ts
```

Expected: FAIL — `expected 0.18 to be greater than 0.2`.

- [ ] **Step 3: Retune the tilt and add the pitch rate**

In `frontend/src/three/rigPose.ts`, replace the `MAX_TILT` declaration:

```ts
// Beyond this the model reads as reacting to the pointer, not spinning.
// Raised from 0.18 (about ten degrees), which measured as shy — the figure
// barely acknowledged the visitor. Tuned by shot review at both widths; the
// ceiling is MAX_FOCUS_TURN, past which it reads as a turntable.
export const MAX_TILT = 0.28
```

In `frontend/src/three/motion.ts`, add after `TURN_LAMBDA`:

```ts
/**
 * How fast the rig's pitch settles. Deliberately slower than TURN_LAMBDA so the
 * head leads and the body follows, instead of the whole figure turning as one
 * rigid piece.
 */
export const PITCH_LAMBDA = 2.0
```

- [ ] **Step 4: Wire both into the frame loop**

In `frontend/src/three/CharacterRig.tsx`:

Update the import from `./motion` to include `PITCH_LAMBDA`, and the import from `./useDragOrbit` to include `advanceOrbit`.

Replace the `const orbit = ...` expression:

```tsx
    // Written as a statement, not a nested ternary with an inline function: this
    // runs every frame and a closure here would be a per-frame allocation.
    let orbit = 0
    if (isHero) {
      if (orbitState.dragging) {
        orbit = orbitState.offset
      } else {
        advanceOrbit(orbitState, dt)
        orbit = orbitState.offset
      }
    }
```

Then change the pitch line to use its own rate:

```tsx
    g.rotation.x = damp(g.rotation.x, pose.pitch, PITCH_LAMBDA, dt)
```

- [ ] **Step 5: Verify**

```bash
cd frontend
npm test && npx tsc -b && npm run build
```

Expected: all pass. `motion-language.test.ts` will confirm `PITCH_LAMBDA` is a named constant rather than a literal.

- [ ] **Step 6: Look at it**

```bash
cd frontend
npx vite preview --port 4174 --strictPort &
sleep 4
npm run shoot
```

Review `.shots/desktop-top.png` and `.shots/mobile-top.png`. The figure should read as attending, not spinning. If 0.28 is too much, lower toward 0.24 and re-shoot — the test's bound (`> 0.2`) leaves room.

- [ ] **Step 7: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/three/CharacterRig.tsx frontend/src/three/rigPose.ts frontend/src/three/rigPose.test.ts frontend/src/three/motion.ts
git commit -m "feat: the hero attends to the visitor, and the head leads the body"
```

---

### Task 3: Choreography maths

**Files:**
- Create: `frontend/src/three/choreography.ts`
- Test: `frontend/src/three/choreography.test.ts`

**Interfaces:**
- Consumes: `HERO_RIG_ID` from `three/rigs.ts`.
- Produces:
  - `export type EntryOffsets = { lift: number; yaw: number; scale: number }`
  - `export function entryOffsets(rigId: string, progress: number, out: EntryOffsets): EntryOffsets`
  - `export const ENTRIES: Readonly<Record<string, EntryOffsets>>`

Task 4 calls `entryOffsets` from the frame loop with a hoisted `out` object.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/three/choreography.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ENTRIES, entryOffsets, type EntryOffsets } from './choreography'
import { HERO_RIG_ID } from './rigs'

const out = (): EntryOffsets => ({ lift: 0, yaw: 0, scale: 0 })

describe('entryOffsets', () => {
  it('is fully settled once the rig has finished fading in', () => {
    // The offsets exist to describe an arrival. A rig that has arrived must sit
    // exactly where rigs.ts puts it, or every section would be subtly misplaced.
    for (const id of Object.keys(ENTRIES)) {
      const o = entryOffsets(id, 1, out())
      expect(o.lift).toBeCloseTo(0, 6)
      expect(o.yaw).toBeCloseTo(0, 6)
      expect(o.scale).toBeCloseTo(0, 6)
    }
  })

  it('is at full amplitude when the rig has not started arriving', () => {
    const o = entryOffsets('work', 0, out())
    expect(o.yaw).toBeCloseTo(ENTRIES.work.yaw, 6)
    expect(o.lift).toBeCloseTo(ENTRIES.work.lift, 6)
  })

  it('closes on the resting pose without reversing', () => {
    // A move that overshoots and comes back reads as the figure changing its
    // mind. Every offset must shrink monotonically as the rig arrives.
    let previous = Infinity
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const o = entryOffsets('work', p, out())
      const magnitude = Math.abs(o.lift) + Math.abs(o.yaw) + Math.abs(o.scale)
      expect(magnitude).toBeLessThanOrEqual(previous + 1e-9)
      previous = magnitude
    }
  })

  it('leaves the hero alone', () => {
    // The hero is already on screen when the page loads (skipInitialFade), so
    // an entry move would play against a figure that never entered.
    const o = entryOffsets(HERO_RIG_ID, 0, out())
    expect(o).toEqual({ lift: 0, yaw: 0, scale: 0 })
  })

  it('gives an unknown rig no choreography rather than throwing', () => {
    expect(entryOffsets('not-a-rig', 0, out())).toEqual({ lift: 0, yaw: 0, scale: 0 })
  })

  it('clamps progress, so a stray value cannot invert the move', () => {
    expect(entryOffsets('work', -3, out()).yaw).toBeCloseTo(ENTRIES.work.yaw, 6)
    expect(entryOffsets('work', 4, out()).yaw).toBeCloseTo(0, 6)
  })

  it('writes into and returns the same out object, mutating it in place', () => {
    const o = out()
    expect(entryOffsets('work', 0.5, o)).toBe(o)
    expect(o.yaw).not.toBe(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd frontend
npx vitest run src/three/choreography.test.ts
```

Expected: FAIL — `Failed to resolve import "./choreography"`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/three/choreography.ts`:

```ts
import { HERO_RIG_ID } from './rigs'

/**
 * How a rig arrives, over and above its cross-fade.
 *
 * A section change used to be a bare opacity swap: the outgoing rig dimmed, the
 * incoming one brightened, and nothing else about either of them differed. This
 * gives each arrival a short move to settle out of, so a new section reads as a
 * figure taking its place rather than as a dissolve.
 *
 * Deliberately NOT scroll-driven. The only input is the rig's own fade value,
 * which CharacterRig already tracks — so this adds no state, no timers, and
 * critically no scroll-fraction table. A table keyed on scroll fractions is
 * what got v1 deleted, and nothing here may reintroduce one.
 */
export type EntryOffsets = { lift: number; yaw: number; scale: number }

const NONE: EntryOffsets = { lift: 0, yaw: 0, scale: 0 }

/**
 * Amplitudes at the moment a rig begins arriving, decaying to zero as it
 * settles. `lift` is world units, `yaw` radians, `scale` a multiplier delta.
 *
 * The hero is absent on purpose: it mounts already materialised
 * (`skipInitialFade`), so an entry move would play against a figure that never
 * entered. Values are small — this is a figure stepping into place, not a
 * camera move.
 */
export const ENTRIES: Readonly<Record<string, EntryOffsets>> = {
  work: { lift: 0.34, yaw: -0.5, scale: -0.08 },
  experience: { lift: -0.28, yaw: 0.44, scale: -0.06 },
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * The offsets for `rigId` at `progress` (its own cross-fade, 0 to 1), written
 * into `out`.
 *
 * `out` is caller-owned and reused every frame, exactly as `rigPose` does: this
 * runs once per mounted rig per frame and returning a fresh object literal here
 * would be a per-frame allocation.
 *
 * The decay is linear in `progress` rather than eased, because `progress` is
 * already the damped fade — easing it twice would stack a second curve on a
 * value that has one.
 */
export function entryOffsets(rigId: string, progress: number, out: EntryOffsets): EntryOffsets {
  const entry = rigId === HERO_RIG_ID ? NONE : (ENTRIES[rigId] ?? NONE)
  const remaining = 1 - clamp01(progress)
  out.lift = entry.lift * remaining
  out.yaw = entry.yaw * remaining
  out.scale = entry.scale * remaining
  return out
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd frontend
npx vitest run src/three/choreography.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/three/choreography.ts frontend/src/three/choreography.test.ts
git commit -m "feat: pure per-rig entry choreography, driven by the rig's own fade"
```

---

### Task 4: Play the choreography

**Files:**
- Modify: `frontend/src/three/CharacterRig.tsx`

**Interfaces:**
- Consumes: `entryOffsets`, `EntryOffsets` from Task 3; the existing `fade` ref and `baseScale` in `CharacterRig`.
- Produces: nothing new. This is the final wiring.

- [ ] **Step 1: Hoist the offsets object and apply it**

In `frontend/src/three/CharacterRig.tsx`:

Add the import:

```tsx
import { entryOffsets, type EntryOffsets } from './choreography'
```

Beside the existing `pose` ref, add:

```tsx
  // Reused every frame for the same reason `pose` is — see rigPose.
  const entry = useRef<EntryOffsets>({ lift: 0, yaw: 0, scale: 0 }).current
```

Inside `useFrame`, after the existing `rigPose(...)` call, add:

```tsx
    // The rig's own cross-fade is the only input: no scroll fraction, no timer.
    entryOffsets(spec.id, fade.current, entry)
```

Then fold the offsets into the three damped targets. Change the yaw target to add `entry.yaw`:

```tsx
    g.rotation.y = damp(
      g.rotation.y,
      BASE_YAW + pose.yaw + orbit + pinnedTurn + entry.yaw + Math.sin(t * 0.18) * 0.06,
      TURN_LAMBDA,
      dt,
    )
```

Change the lift target to add `entry.lift`:

```tsx
    g.position.y = damp(
      g.position.y,
      basePosition[1] + pose.lift + entry.lift + Math.sin(t * 0.7) * 0.045,
      LIFT_LAMBDA,
      dt,
    )
```

And animate scale, which is currently only a static prop:

```tsx
    // `scale` was a fixed prop until now. Setting it here as well is safe —
    // three reads the object's own scale each frame, and the prop only seeds it.
    g.scale.setScalar(damp(g.scale.x, baseScale * (1 + entry.scale), LIFT_LAMBDA, dt))
```

- [ ] **Step 2: Verify nothing regressed**

```bash
cd frontend
npm test && npx tsc -b && npm run build
```

Expected: all pass.

- [ ] **Step 3: Verify the transition by sampling it, not by screenshotting it**

`tools/shoot.mjs` waits for a settled scene and is blind by construction to anything visible only mid-transition — this is recorded in `frontend/CLAUDE.md`. So confirm the entry by watching the model settle in a browser:

```bash
cd frontend
npx vite preview --port 4174 --strictPort &
sleep 4
```

Then in a browser at 1440x900, scroll from About into Work and watch the model take its place. It should arrive with a short turn-and-settle, not simply brighten. Scroll back and forth several times: two quick crossings must produce two independently settling figures, never a popped or dropped one — `SceneDirector` already guarantees this and the change must not break it.

- [ ] **Step 4: Confirm the whole gate set**

```bash
cd frontend
npm run check:contrast && npm run check:motion && npm run shoot
```

Expected: all pass. Then confirm the mobile budget is unchanged — still exactly one GLB on a phone:

```bash
cd frontend
grep -n "mobile" src/three/rigs.ts | head -5
```

Expected: the mobile gate in `rigFor`/`nextRig` is untouched.

- [ ] **Step 5: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/src/three/CharacterRig.tsx
git commit -m "feat: a section's model arrives rather than merely brightening"
```

---

### Task 5: Record what changed and why

**Files:**
- Modify: `frontend/CLAUDE.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documentation only.

- [ ] **Step 1: Document the new rules**

Add to `frontend/CLAUDE.md`, in the "Motion — the rules that keep being rediscovered" section:

```markdown
- **Choreography reads the rig's own fade and nothing else** (`three/choreography.ts`). It is
  deliberately not scroll-driven: a table keyed on scroll fractions is what got v1 deleted. If a
  section's model needs to move differently, add a row to `ENTRIES`, never a scroll input.
- `orbitState.velocity` is live now — `advanceOrbit` spends it on release momentum. It sat declared
  and unread from the day the file was written, which is why a flick and a slow drag used to end
  identically.
- Pitch settles at `PITCH_LAMBDA`, deliberately slower than `TURN_LAMBDA`, so the head leads the body.
```

- [ ] **Step 2: Final verification**

```bash
cd frontend
npm test && npx tsc -b && npm run build && npm run check:contrast && npm run check:motion && npm run shoot
```

Expected: every command exits zero.

- [ ] **Step 3: Commit**

```bash
cd /home/moeez/Documents/projects/3jsPortfolio/MoeezPortfolio
git add frontend/CLAUDE.md
git commit -m "docs: the motion rules Phase 2 adds"
```

---

## Phase 2 acceptance

- Choreography and momentum maths are pure and unit-tested, alongside `rigPose`/`motion`.
- A section change reads as an arrival; verified by watching it, since `shoot` cannot see mid-transition states.
- `npm run check:motion`, `check:contrast` and `shoot` all still pass.
- Mobile payload unchanged: one GLB, no post-processing below the hero.
- No new scroll listener, no scroll-fraction table, no per-frame allocation.

## If this fights the content

Per the spec's risk section: Phase 2 is the direction that buried content in v1. If choreography starts pulling attention off the copy, cut it — `git revert` the Task 3 and 4 commits. Phase 1 stands alone and is the part that has to land.
