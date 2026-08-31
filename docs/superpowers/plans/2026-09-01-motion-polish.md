# Plan 2c — motion polish: every animation smooth

Spec: `docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md`
Reference: https://oryzo.ai/ — motion craft only, never its content or layout.
Branch: `redesign/v2`, after Plan 2b.

Moeez, 2026-09-01: *"make sure that each animation is smooth and proper 3d smooth animations, following oryzo.ai"*.

## What oryzo actually does that we do not

Its 3D never reacts to the raw scroll position. Scroll feeds a **smoothed** value, and everything
downstream — camera, model rotation, opacity — chases that smoothed value with frame-rate-independent
easing. That single indirection is why its motion reads as heavy and continuous instead of stepping
with the wheel. We already have the easing primitive (`damp`) and we already use it for rotation and
position. We do **not** have the smoothed scroll signal, and three things still ride raw scroll.

## Audited defects (read from the code, 2026-09-01, at commit 7605afa)

| # | Where | Defect |
|---|---|---|
| D1 | `CharacterRig.tsx` — `const visible = fade.current * sectionVisible` | The hero's `sectionVisible` is `scrollState.heroVisible`, written straight from the scroll event. `visible` becomes `pose.opacity`, which drives **material opacity, wand light intensity and sparkle scale** with no damping at all. A mouse wheel delivers discrete jumps, so the hero's exit steps. Rotation and Y position next to it *are* damped — only the fade is raw. |
| D2 | `scrollState.ts` — `useScrollTracker` | State is written in the `scroll` listener. Scroll can fire more than once per frame, so work is repeated and the frame loop can read a value written mid-frame. It also calls `getBoundingClientRect()` twice **inside the listener**, forcing layout on the scroll path. Correct shape: the listener sets a dirty flag; one rAF loop does the reads and the writes, once per frame, before the render loop reads them. |
| D3 | `scrollState` has no smoothed channel | `progress`, `heroVisible` and `pinnedProgress` are raw. Every future scroll-linked animation — Plan 2b Task 5's pinned rotation, Plan 3 Task 10's arrow trail — will inherit the stepping unless a smoothed channel exists to read instead. |
| D4 | damping constants (`2.6`, `2.2`, `1.4`, `3`, `4`) are inline literals in one file | They are the site's motion signature and are about to be needed by the arrows and the pinned moment too. Name them once. |

D1 is the visible one. D2 is the one that costs frames. D3 is the one that makes every later task correct by default.

---

### Task 1: a smoothed scroll channel, driven by one rAF loop

**Files:** modify `src/lib/scrollState.ts`, `src/lib/scrollState.test.ts`

**Produces:** `scrollState.smooth = { progress, heroVisible, pinnedProgress }`, advanced once per frame by
`damp` toward the raw values. Raw fields stay — they are the truth, and non-motion consumers (tests,
the observer) keep reading them.

- [ ] **Step 1: failing tests.** Pure-function level: given a raw target and a sequence of `dt`s, the
      smoothed value approaches the target monotonically, never overshoots, and — the property that
      matters — reaches the same place after 100ms whether that took 6 frames or 14. A `dt` of 0
      leaves it unchanged. Then, at hook level: a burst of N scroll events between two frames results
      in exactly one set of reads, not N (assert on a spied `getBoundingClientRect`).
- [ ] **Step 2: run them, watch them fail.**
- [ ] **Step 3: implement.** Listener sets `dirty = true` and nothing else. One `requestAnimationFrame`
      loop: if dirty, do the rect reads and write the raw fields, clear the flag; then always advance
      the smooth fields by `damp(..., SCROLL_LAMBDA, dt)` with `dt` from the rAF timestamp, clamped
      (a backgrounded tab returns a huge `dt` — clamp to ~0.1s or the first frame back snaps).
      Cancel the loop on unmount. Pointer stays event-driven; it is already damped downstream.
- [ ] **Step 4: verify.** In a real browser, step `scrollY` in wheel-sized increments and log raw vs
      smoothed each frame: smoothed must lag and never step. Confirm no forced-layout warning on the
      scroll path in the Performance panel.
- [ ] **Step 5:** `git commit -m "perf: one frame loop owns the scroll signal, and it is smoothed"`

### Task 2: the hero's fade stops stepping with the wheel

**Files:** modify `src/three/CharacterRig.tsx`, `src/three/motion.ts` (new), tests alongside.

- [ ] **Step 1: failing test.** Extract the frame's visibility maths into a pure helper in a new
      `src/three/motion.ts` and test it: fed a raw `heroVisible` that jumps 1 → 0.4 in one step, the
      returned visibility moves a fraction of the way, not all of it; fed the same target repeatedly
      it converges. This is the test that proves D1 reproduces first — assert the current code jumps.
- [ ] **Step 2: run, watch fail.**
- [ ] **Step 3: implement.** The rig reads `scrollState.smooth.heroVisible` instead of the raw field.
      Keep `fade` as it is — it is already damped. Move the lambdas (D4) into `motion.ts` as named
      constants: `FADE_LAMBDA`, `SCROLL_LAMBDA`, `TURN_LAMBDA`, `LIFT_LAMBDA`, `ORBIT_RETURN_LAMBDA`,
      `INTENSITY_LAMBDA`, each with one line saying what it governs.
- [ ] **Step 4: verify — sampled, not screenshotted.** Stills cannot evidence this
      (`screenshot-verification-blind-spot`). Drive a browser, step the scroll through the hero's exit
      in ~10 increments, and at each step record material opacity, wand intensity and sparkle scale
      together. Opacity must change by a *fraction* of the scroll step each frame, the three values
      must stay locked to each other, and none may lead the body.
- [ ] **Step 5:** `git commit -m "fix: the hero fades with the scroll, not in steps with the wheel"`

### Task 3: sweep every remaining animation

**Files:** whatever the sweep finds; `Reveal.css`, `Button.css`, `Nav.css`, `ProjectCard.css`, `base.css`,
plus any rig/dock motion added by Plan 2b Task 5/6.

- [ ] **Step 1.** Enumerate every animated property on the site — CSS transitions and every `useFrame`
      write — into a table: property, driver (time / pointer / scroll / state), easing, duration,
      reduced-motion behaviour.
- [ ] **Step 2.** Every row must satisfy: frame-rate independent if JS-driven; a shared easing token if
      CSS-driven (`--ease` exists — nothing may hardcode its own curve); animating only `transform`
      and `opacity`, never `top`/`left`/`width`/`height` (`base.css:70` animates `top` on the skip
      link — that one is fine, it is a focus affordance, off the scroll path; confirm and note it);
      and neutralised under `prefers-reduced-motion`. Fix every row that fails; record the table in
      the task report.
- [ ] **Step 3. Frame budget.** Performance trace over a full-page scroll at 4× CPU throttle: no long
      task over 200ms after load, >50fps over the hero, no forced synchronous layout on the scroll path.
- [ ] **Step 4:** `git commit -m "polish: one motion language across the whole site"`

## Constraints (inherited, non-negotiable)

- Zero new dependencies. `damp` + rAF is the whole toolkit; no scroll library, no GSAP, no Lenis.
- Nothing scroll-driven may use a hard-coded scroll-fraction table — that is what got v1 deleted.
- Reduced motion still means: no canvas, nothing 3D fetched, and every reveal instant.
- No React state in a per-frame path, ever.
