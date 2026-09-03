# CLAUDE.md

This file guides Claude Code when working in the frontend directory.

## What this is

A single-page portfolio for **Moeez Ahmad Khan**, AI/ML engineer. Clean, readable design focused on recruiting and direct outreach. A 3D model presides over the hero and follows the visitor down the page, changing with the section — decoration, never navigation. All content lives in scrollable HTML, and the site is complete and readable with the canvas gated off entirely. Static site plus a small serverless chat API.

## Commands

From `frontend/`:

```bash
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # tsc -b (typecheck first) then vite build → dist/
npm run preview        # serve the production build
npm test               # vitest run — jsdom environment, @testing-library/react
npm run shoot          # screenshot every section at both widths (needs a preview running)
npm run check:contrast # measure body-copy contrast against the LIVE backdrop, every section
npm run check:motion   # assert every state change actually animates, in a real browser
npm run check:stations # assert the push-in and the mobile station travel actually move
npm run check:scramble # assert the nav's hover decode and the chat message entrance run
```

The build fails if TypeScript errors exist. Type-check without bundling: `npx tsc -b`.

## Current state

The v1 architecture (Harry Potter–themed 3D scroll gallery with station cameras, chapters, scroll rails) was deleted and tagged as `v1-wizard-world` for recovery. This is v2.

**Directories that exist today:**

- `src/content/` — all portfolio data: `profile.ts`, `projects.ts`, `skills.ts`, `experience.ts`, `index.ts`. Each is a typed module; this is the single source of truth for visible strings on the site and for the chatbot.
- `src/lib/` — utilities: `media.ts` (reduced-motion / coarse-pointer / WebGL probes), `contactForm.ts` (validation + Web3Forms payload), `useSectionObserver.ts` (IntersectionObserver-driven active-section tracking), and their tests. Plus the per-frame layer: `scrollState.ts` (the mutable scroll/pointer singleton, and the smoothed channel motion reads), `frame.ts` (`damp`), `focusState.ts`, `useMatchMedia.ts`, `idle.ts`.
- `src/styles/` — `tokens.css` (design tokens as CSS custom properties) and `base.css` (reset + element defaults).
- `src/components/` — the built shell: `layout/` (Nav, Section, Footer), `site/` (Hero, About, Work, ProjectCard, Skills, Experience, Contact), `ui/` (Button, Tag, StatStrip, Reveal, Timeline), each paired with a `.css` file and most with a `.test.tsx`.
- `src/three/` — the 3D stage, live on the page. `StageMount.tsx` (lazy boundary + the gate), `Stage.tsx` (canvas root; computes the active section id via `useSectionObserver`), `SceneDirector.tsx` (cross-fades one rig out while the next fades in, queueing so a fast second transition cannot truncate the first), `CharacterRig.tsx` (one rig that wears whichever model `rigs.ts` names for the section), `rigs.ts` (the section-id -> model table, plus `PINNED_SECTION_ID`), `rigPose.ts` (pure pose maths, writes into a caller-owned object to stay allocation-free per frame), `Backdrop.tsx`, `lights.tsx`, `tint.ts`, `useDragOrbit.ts`, `wizardState.ts`, `modelReadiness.ts`, `stageGate.ts`, `ktx2.ts`, `characterMaterial.ts`.
- `src/test/` — `copy-voice.test.ts` (enforces no wizard vocabulary in src/); `setup.ts`; other tests.
- `api/` — serverless functions (Vercel). `familiar.ts` + `_core/{familiar,persona}.ts`, carried over from v1: the OpenRouter free-model cascade, per-model timeout, token caps and per-IP rate limiting all still apply. The persona itself is v1's and is being rewritten (first person, strictly grounded); the transport around it is being kept.

**What is still being built:**

- Motion polish (`docs/superpowers/plans/2026-09-01-motion-polish.md`) — a smoothed scroll channel plus a sweep of every animated property.
- The chat dock — `src/components/chat/` (ChatDock, ChatPanel, useChat, DockPointer) does not exist yet.
- Chat retrieval and persona (`api/_core/retrieval.ts`, corpus generation, the persona rewrite).

See `docs/redesign/PLAN.md` and `docs/superpowers/plans/` for the work ahead.

## Conventions

**Portfolio content:**
- All visible text (projects, skills, roles, bio, links, copy) lives in `src/content/` as TypeScript modules. Edit copy there, never invent JSX strings.
- Never invent facts: no metrics, dates, client names, or employer details that are not already in the content files. Point people to email if asked for something not in the data.

**Design & styling:**
- Design tokens (colors, spacing, type scales) live in `src/styles/tokens.css` as CSS custom properties. Use the variables in components; only bare colors are allowed inside `three/` where Three.js needs literal hex values.
- Each component pairs with a `.css` file, imported at the top.

**Copy voice — explicit ban on wizarding vocabulary:**
- Section names are: Work, About, Skills, Experience, Contact.
- The following words are **strictly banned** and will cause the build to fail if found in `src/`: grimoire, owl post, owlpost, spellbook, incantation, chronicles, familiar, muggle, hogwarts.
- This replaces the old file's instruction to "keep new content in voice" — that instruction is revoked. Copy must be plain, direct, and professional.
- `src/test/copy-voice.test.ts` checks for these words on every build; do not work around it.

**Motion — the rules that keep being rediscovered:**
- Anything driven by time in JS uses `damp` from `src/lib/frame.ts`, never `v += (t - v) * 0.1`. A 144Hz monitor and a 60Hz one must show the same motion.
- Anything driven by scroll reads the **smoothed** channel, not the raw scroll position — raw scroll steps with the mouse wheel.
- CSS transitions use a shared easing token from `styles/tokens.css`. Nothing hardcodes its own curve.
  There are exactly two: `--ease` for anything arriving and settling, `--ease-loop` for anything
  `infinite` (an out-curve on a loop snaps to each extreme and hangs there). A third needs a reason.
- Never animate a layout-triggering property — `top`, `left`, `width`, `height`, `margin`, `padding`,
  `gap`, `font-size`. Prefer `transform` and `opacity`; a paint-only change (a colour, a border tint)
  on a discrete hover or focus is fine, but nothing on the scroll path may re-flow the document.
  One recorded exception, `base.css`'s `.skip-link` sliding down on `top`: it is positioned off-screen
  by `top`, it runs at most once a visit, and it is nowhere near the scroll path.
- `STATION_LAMBDA` (station travel) is the slowest rate that moves the figure, below `LIFT_LAMBDA`:
  a journey across the screen, not a settle. `INTRO_LAMBDA` is slower still — it runs once, on the
  first screen, with nothing competing for the eye.
- Every damping rate is a named constant in `three/motion.ts` (or `lib/scrollState.ts` for the scroll
  signal itself). A bare numeric lambda in a `damp(...)` call is a number nobody can re-tune.
- `src/test/motion-language.test.ts` asserts all of the above against the source. If a rule is wrong,
  change it there and here together; do not special-case a change through it.
- **One recorded entrance exception: the hero's opening stagger.** `hero-in` (Hero.css) is a one-shot
  `@keyframes` with no matching transition, listed in `ENTRANCE_EXCEPTIONS` in
  `motion-language.test.ts`. The rule below is about surfaces that come and go; the hero's copy is on
  the page from first paint to last, so there is no exit to describe. It is also the only form that
  survives its own failure — a transition would need JS to add a class after mount, and if that JS
  never ran the copy would sit at `opacity: 0` forever, where `animation-fill-mode: both` cannot
  strand it. The exception is keyed on the animation NAME, so it cannot quietly widen.
- **The hero's model enters by moving, never by fading.** `HERO_INTRO` / `HERO_INTRO_DOLLY`
  (`choreography.ts`) start the figure back along z and smaller, at FULL opacity, driven by a one-shot
  damped `intro` ref rather than by the rig's fade (the hero mounts at `fade = 1`, which is why
  `ENTRIES` has no hero row). It **mounts already displaced** — mounting on its mark made the frame
  loop damp backwards to the dolly first, a pull-back nobody asked for, and `check:stations` read it
  as no travel at all.
- **Anything that appears must also have a way to leave.** Two surfaces shipped with an entrance and
  no exit, and both were invisible to every test: the mobile menu toggles `display`, which no
  transition could reach, and the chat panel was `{open && <panel/>}` — React cannot animate an
  element it has already unmounted. Both now stay in the DOM and hide with `display`, using
  `@starting-style` for the way in and `transition-behavior: allow-discrete` for the way out. A
  `@keyframes` entrance is the smell: it plays on mount and has nothing to say about leaving.
  A panel kept mounted for this reason MUST carry `aria-hidden` and `inert` while closed.
- Per-frame state lives in mutable module singletons (`scrollState`, `wizardState`, `focusState`, `orbitState`) read inside the frame loop. **Never** React state in a per-frame or per-pointer-event path.
- Never key motion to hard-coded scroll fractions. Section membership comes from `useSectionObserver`; a scroll-fraction table is what got v1 deleted.
- **`npm run check:motion` is the gate for this, and it runs in a browser on purpose.** A source-level
  lint was prototyped and flagged 12 of 22 state rules with roughly 10 false positives, because the
  cascade decides the answer. Confirmed NOT snapping, verified in the browser — do not re-report
  these: `.btn--solid:hover` and `.btn--ghost:hover` (the `.btn` base transitions `background`,
  `border-color` and `color`), `.field input[aria-invalid]` (base transitions `border-color`; the
  `field turns invalid` scenario covers it), `.nav__link[aria-current]` (`.nav__link` transitions
  `color`), and `.nav__links.is-open`'s layout properties (they change together with `display`, under
  the panel's own fade; both menu scenarios cover it).
- **The gate asserts on `getAnimations()`, not on a frame count, and samples every frame of its
  window.** Both were learned the hard way. Puppeteer under SwiftShader runs rAF at **12Hz**, not 60
  — anti-throttling flags change nothing, it is software rendering — so a frame-count floor measures
  the harness. And sampling animations at one chosen frame misses any transition that starts late:
  the nav marker only begins moving once a smooth scroll has settled and the observer has fired.
- **The hero is an observed section, `'top'` (`SECTION_IDS` in Nav.tsx), not the absence of one.**
  `useSectionObserver` only commits a truthy id, so while the hero went unobserved there was no way
  back to "nothing owns the screen": scrolling to About and returning to the top latched `active` on
  `'about'` forever — the nav underlined About at the top of the page, and SceneDirector faded the
  hero model out and never brought it back (fatal on mobile, where the gate leaves the hero as the
  only model). `rigFor` normalises `'top'` to the table's `''` key. Anything else observing sections
  must use `SECTION_IDS`, never `NAV_ITEMS` alone.
- **Choreography reads the rig's own fade and nothing else** (`three/choreography.ts`). It is
  deliberately not scroll-driven: a table keyed on scroll fractions is what got v1 deleted. If a
  section's model needs to move differently, add a row to `ENTRIES`, never a scroll input. The
  entry decays linearly in the fade because the fade is already damped — easing it again stacks a
  second curve on a value that has one.
- `orbitState.velocity` is live now — `advanceOrbit` spends it on release momentum. It sat declared
  and unread from the day the file was written, which is why a flick and a slow drag used to end
  identically.
- Pitch settles at `PITCH_LAMBDA`, deliberately slower than `TURN_LAMBDA`, so the head leads the body.
- **Still screenshots cannot verify motion.** `tools/shoot.mjs` waits for `window.__modelReady`, which latches only once a rig has settled — so it is blind by construction to anything visible only mid-transition. Verify time-varying work by sampling state deliberately or asserting on it in a test.
- **`npm run check:stations` is that sampling, made permanent.** The rig publishes its live transform
  into `three/rigTelemetry.ts` (a per-frame singleton, like `scrollState`; exposed as `window.__rig`
  only once a real frame has been written into it, so a probe cannot sample the untouched object and
  read it as "never moved"). `tools/check_stations.mjs` asserts the push-in travels forward and stays
  LIT throughout, and that a section change catches the figure in flight rather than at its
  destination. Assertions are on values and wall-clock, never on frame counts — SwiftShader's rAF is
  12Hz and a frame-count floor measures the harness.
- **The hover decode is text, so its cost is layout.** `lib/scramble.ts` + `lib/useScramble.ts` swap a
  label's characters for terminal glyphs on hover and resolve them back left to right (adapted from
  the Devsteem site, which drives the same effect with GSAP's ScrambleTextPlugin — this is thirty
  lines and no dependency). Every glyph in a proportional font has its own advance, so the element's
  width is frozen with one measurement on `mouseenter` and released on the way out: one reflow per
  hover instead of one per frame. `aria-label` holds the accessible name still while `textContent` is
  punctuation, and nothing runs under reduced motion or on a coarse pointer, where `mouseenter` fires
  on a tap. `npm run check:scramble` measures the neighbour drift that justifies all of it.
- **The section accent (`--accent`) cannot live on `<html>` or `<body>`.** It is a registered
  `@property` (`syntax: '<color>'`), which is what lets it interpolate at all — an unregistered
  custom property is an opaque string to the animation engine and swaps between two frames. But
  registration is only half of it. Measured in Chrome, synchronously, with identical inline setup on
  all three elements: a plain `<div>` starts the transition (`getAnimations()` reports it) and
  **`<body>` and `<html>` both report zero**, while `transitionProperty` computes to `--accent` on
  all three. The declaration is accepted and simply never fires on the two elements that propagate
  to the viewport. That is why `App.tsx` renders a `.app` wrapper carrying `data-section`, and why
  `tokens.css` puts the ramp and the transition on `.app` rather than `:root`. The wrapper is
  `display: contents`, so it creates no box and no containing block and the fixed nav and chat dock
  still resolve against the viewport. Verified: a contents wrapper runs the transition and its
  descendants inherit the interpolated `oklab()` value mid-flight.
- **The ramp rotates hue with lightness and chroma held constant** (`oklch(0.827 0.078 H)`). That is
  the design, not a detail: identical L and C means identical contrast against a live shader ground
  by construction rather than by measurement, and it is the reason `check:contrast` still reads the
  same numbers after the accent moved. `tokens.test.ts` asserts every row shares L and C and that
  the whole arc stays more than 60 degrees clear of the chat teal (~hue 190). `--gold` is NOT
  repointed — `--accent` is additive, spent on five things only (skills headings, timeline periods,
  card metric, tag borders, nav marker); the hero eyebrow, the contact email and the solid button
  keep the fixed gold.
- **Measuring a colour means painting it, never scraping the serialization.**
  `getComputedStyle(el).color` is not always `rgb(...)`: Chrome serializes a colour authored in a
  modern space in that space, so `color: var(--accent)` comes back as `oklch(0.827 0.078 18)`.
  `check_contrast.mjs` used to regex three numbers out of that string and read them as R, G, B —
  turning that oklch into `rgb(0.827, 0.078, 18)`, essentially black, and failing a perfectly
  legible heading at 1.03:1. It now fills a 1x1 canvas with the computed colour and reads the pixel
  back, which resolves any syntax the browser can parse down to the sRGB it will actually paint,
  gamut clipping included — which is the thing being measured anyway.
- **`Magnetic` is live on touch, and the release is what makes that safe.** The lean used to be
  excluded on a coarse pointer, nominally because a fingertip covers the control it leans toward.
  That is true of the control UNDER the finger and false of its neighbours — the activation band
  reaches `MAGNETIC_RADIUS_PX` (96px) from a control's edge, so a drag passing 50-70px away leaves a
  visible 1.6-3.1px lean. What the exclusion actually bought was avoiding a stale pointer: a mouse is
  always somewhere and `pointermove` keeps `pointer` fresh, but a finger only exists between
  `pointerdown` and `pointerup`, so after it lifts the last touched position would sit in `pointer`
  forever and every nearby control would lean at a finger that is no longer on the glass.
  `releasePointer` sends the pointer to `-Infinity` on `pointerup` AND `pointercancel` — both,
  because a drag the browser takes over for scrolling fires only `pointercancel`, which is exactly
  the gesture a phone makes most. Infinity rather than a flag, so `magneticOffset`'s existing
  radius check does the work and the lean eases home on the curve it arrived on.
  `releasePointer` ignores a mouse `pointerup`, or every click would drop the cursor.
- **The magnetic loop does not spin during a scroll, and that was measured.** Scrolling the whole
  8170px page cost exactly ONE tick — 4 style writes for 4 controls — before the loop idled out,
  and reading all four rects costs 0.0033ms against a 16.7ms budget. `wake()` is bound to `scroll`
  because scrolling moves a control under a stationary pointer, but with every offset already 0 the
  tick sets `busy = false` and stops. Reduced motion still opts out entirely: that exclusion is
  about the movement, not the input device.
- **A chat message arrives on a transition, like the panel around it.** `.chat__msg` starts from
  `@starting-style` rather than a `@keyframes` for exactly the reason above it in this list — the log
  is replaced wholesale on a new conversation, and a keyframe entrance has nothing to say about
  leaving.
- `tools/shoot.mjs` waits on three things per section, and needs all three: the page to hold still for
  several polls (`scroll-behavior: smooth` means `scrollIntoView` returns before the scroll starts),
  the section's expected rig to report ready, and every `Reveal` in view to reach full opacity. Its
  per-width `DESKTOP_RIG` / `MOBILE_RIG` maps encode the mobile gate above; a stale entry there shows
  up as a 15s timeout, not a wrong picture. Every `MOBILE_RIG` row is now `'hero'`, because that one
  rig is on stage for every section.

**3D on mobile — one model, six stations:**
- Below the hero's `@media (min-width: 900px)` breakpoint (or on any coarse pointer), the hero's is
  the ONLY model that loads. That gate has not moved: `nextRig(id, mobile)` still returns `null`, so
  the work and experience models are never fetched — measured, 2.45MB of GLB a phone never downloads.
- What DID move: `rigFor(activeId, mobile)` no longer returns `null` below the hero. It returns the
  hero spec, **with the same `spec.id`**, for every section. That identity is load-bearing —
  `SceneDirector` bails when the incoming id matches the current one, so the rig is never cross-faded,
  never unmounted, never re-cloned. One rig stays mounted and travels the whole page.
- Returning `null` there was throwing away a model that had already been downloaded and decoded, at
  the first section boundary: 7,877px of page with no figure on it at all.
- Where it travels to is `MOBILE_STATIONS` (`rigs.ts`), keyed on the ids `useSectionObserver` reports
  — never scroll fractions. Each row carries `position`, `scale`, `yaw` and `presence`.
- **Those offsets are frustum arithmetic, not taste.** Camera fixed at z 4.2, fov 38, 390x844: at
  distance `d` the frame is `0.6886 * d` tall and `0.318 * d` wide. At z 0 that is 2.89 x 1.34; at
  z -1.2, 3.72 x 1.72 (half-width 0.86). The first pass used x = ±0.42 believing that was a corner —
  it is a fifth of the way off centre, and the figure landed squarely on the Skills chips. Re-derive
  against the row's own distance, then re-shoot.
- Sides alternate down the page (right, left, right, left, centre). That crossing IS the mobile
  transition; there is no second model to hand over to.
- **The wand's `distance` does not scale with the rig.** It is a world-space radius, and three scales
  a child light's position with the parent group but not its reach — so a 0.66-scale station kept a
  halo sized for the 1.3-scale desktop hero and the figure read as sparkle dust inside its own glow.
  `CharacterRig` divides `GLOW_DISTANCE` by the hero's desktop scale every frame.
- `rigVisibility` takes `atHeroStation`. The hero rig's `smooth.heroVisible` measure now applies only
  while the hero station owns the screen: applied unconditionally it faded the travelling figure out
  one screen down, exactly where it should have been arriving at About.
- `useIsMobileStage()` (`three/useStageViewport.ts`) is the single source of that answer. `Stage` asks
  once and passes it down. It decides four things that must never disagree: which rigs exist, where
  the hero stands, which way a dissolving rig drifts (`EXIT_LIFT` vs `EXIT_LIFT_MOBILE`), and how much
  the renderer may spend. Do not recompute it locally.
- Mobile caps `dpr` at 1, runs the post-processing chain only while a rig is actually on stage, and
  compiles the backdrop shader with `MOBILE` defined (2 fbm octaves, no embers — 2 noise evaluations
  per pixel instead of 6). Desktop is untouched by all of it.
- **The HERO figure gets a reserved strip on mobile, it is not dimmed into the background.**
  `--figure-band` (tokens.css) is the mobile equivalent of the desktop hero's `padding-right: 42%`:
  Hero.css spends it as `padding-bottom` to lift the copy clear, and `Stage.css` sizes the no-WebGL
  still to the same strip. `MOBILE_PRESENCE` (`rigPose.ts`) and that still's opacity must stay equal
  — the canvas and the picture standing in for it are the same figure in the same place.
- The band is `clamp(200px, 34svh, 300px)`. It was 25svh, which made the figure a sliver under the
  copy, then 38svh — which did not FIT: measured at 390x844, 590.37px of copy plus a 320.72px band
  is 911.09px on an 844px screen, so a fifth of the strip sat below the fold and the figure was
  cropped at the shoulders on first paint. Both sides gave: the band came down to 34svh and
  `.hero__thesis` takes one step down below 900px. The hero is now exactly 844px at 390x844 and
  1024px at 768x1024.
- **The band and the hero station's scale move together — in ONE direction.** Growing the token
  alone lifted the copy and left 17% of empty screen above an unchanged head, which is where that
  rule came from. Shrinking it does not have the same effect and the scale stayed at 1.15: the band
  is space reserved in the COPY's layout, while the figure stands in a fixed, full-viewport canvas
  placed by `MOBILE_STATIONS` alone, so narrowing the band moves the copy and not the model.
  Measured after: copy ends at 554.6, the band starts at 557, the head is at ~620 — no overlap,
  nothing newly cropped, `check:stations` clean and `check:contrast` 5.62:1 on `.hero__meta`.
  `rigs.test.ts` asserts the band string and the scale together so the next change to either has to
  look at the other.
- **Below the hero there is no reserved strip.** The figure stays low and to one side at a much lower
  `presence` behind `.stage__scrim` (Stage.css), a fixed mobile-only gradient between canvas and copy.
  Reserving a band per section instead would have added roughly 1000px to a 7,877px page. The scrim
  is not a substitute for measuring: `npm run check:contrast` is the gate.
- `dpr` is `stageDpr(window.devicePixelRatio, mobile)`, never a bare number. R3F's `dpr` prop is a
  value, not a cap: passing 1.5 made every dpr-1 display render 2.25x the pixels it can show
  (measured: a 2160x1350 backing store in a 1440x900 dpr-1 viewport). `PerformanceMonitor`'s
  `onDecline` must lower with `Math.min`, never assign.
- `wizardState.intensity` is seeded at the idle level, not 0. The hero mounts with `skipInitialFade`,
  so it must LOOK settled on the first frame; a wand igniting from black over a second does not.

**Motion facts, measured 2026-09-01, so they are not re-litigated by guess:**
- A full-page scroll with the WebGL loop running: 240 frames, median 16.7ms, **zero** frames over
  20ms, **zero** long tasks. There is no jank to chase; do not "optimise" motion without a
  measurement showing a regression against this.
- The smoothed scroll channel works: under discrete wheel notches the raw position moves on 12% of
  frames and the eased channel on 64%. Measure this with `scrollTo({behavior:'instant'})` — `scrollBy`
  obeys `scroll-behavior: smooth` and the browser pre-smooths the gesture, measuring nothing.
- oryzo.ai for comparison: 23.4MB, 20.6s to network-idle, 3595 DOM nodes, and a 51,317px document for
  an 844px viewport — a pinned scroll-as-timeline. Its DOM layer scrubs RAW scroll (animates on 13% of
  frames, exactly its scroll frames), so it is not the thing to copy for smoothness. Its studio's
  published WebGL-Scroll-Sync technique (absolute canvas offset per frame) solves canvas-to-DOM-element
  drift; our canvas has no DOM targets to drift against, and its 25% vertical padding would undo the
  mobile fill-rate work. Deliberately not adopted.
- CSS scroll-driven animations (`animation-timeline: view()`) are NOT Baseline — no Firefox at all —
  so they can only ever layer over the IntersectionObserver `Reveal` we already have. Considered and
  declined: there is no jank to fix, and scrubbing all 14 reveals would be more motion, not better.

**Payload facts, so they are not re-litigated by guess:**
- Measured first-visit payload: ~1.89MB mobile, plus ~2.45MB more across a full desktop scroll.
  Benchmarked against oryzo.ai (the motion reference) on the same harness: 3.1MB vs 23.4MB, 2.3s vs
  20.6s to network-idle, 283 vs 3595 DOM nodes. Performance is not the gap; do not trade it away.
- `wizard_improved.glb` stays Draco while the other two are meshopt. Converting it was measured:
  849.5 KB -> 1.15 MB, three times what the 98KB Draco decoder costs. Do not "fix" the inconsistency.
- The 515KB Basis transcoder is required — all shipped GLBs declare `KHR_texture_basisu`.
- `StageMount`'s Suspense fallback is a CSS-only `StagePlaceholder`, NOT `StaticHeroArt`. The latter's
  still frame is a 346KB PNG that every WebGL visitor used to download and discard.

**WebGL context loss is a real, routine failure on phones — and it used to take the hero with it.**
- Measured with `WEBGL_lose_context`: losing the context threw `Cannot read properties of null
  (reading 'alpha')` from inside three's renderer, and React tore down the entire `.stage` subtree —
  the wrapper div included. The hero went empty and stayed empty for the rest of the visit. That is
  the failure a visitor reports as "the model vanished and never came back".
- `StageBoundary` in `StageMount.tsx` catches it and renders `StaticHeroArt`, so the hero always shows
  a figure. `three/contextLoss.ts` additionally calls `preventDefault()` on the loss event, which is
  what permits `webglcontextrestored` to fire at all — without it, a transient blip is permanent.
- **No desktop harness can see this**: SwiftShader never loses a context. The
  `hero survives losing the GPU` scenario in `check_motion.mjs` forces it deliberately, and was
  verified to fail when the boundary's fallback is removed.

**Accessibility:**
- Honour `prefers-reduced-motion` in all animations and transitions (check `lib/media.ts` helper).
- Canvas is `aria-hidden` and decorative only.
- All content is accessible via keyboard and screen reader; do not rely on 3D for meaning.
- **Contrast is measured against the rendered backdrop, never inferred from the tokens.** The palette
  alone says 6.9:1; a shader is painting the ground behind the copy, and on mobile that ground
  measured 3.85x brighter than on desktop — same text, same colour, 3.73:1 versus 5.79:1 — because a
  phone puts the copy over the middle of the screen where the backdrop's radial falloff peaks. That
  is why `Backdrop.tsx` compiles a lower `GROUND_GAIN` for mobile, and why `npm run check:contrast`
  exists. jsdom cannot see any of this: no layout, no compositor, no shader.
- **That check samples every section, not just the hero.** Hero-only was defensible while the mobile
  gate left nothing behind the copy below it; `MOBILE_STATIONS` put a lit figure on screen for the
  whole page, and the check could not see it. It now scrolls each section into view, waits out
  `STATION_LAMBDA`, and samples the smallest body copy in each. Measured after the stations landed:
  every sample 5.73:1 or better at both widths.
- **Nothing fixed may hit-test space it does not occupy.** `.chat` is a fixed flex column whose box is
  far larger than its controls; it measured 343x106 at 390 wide and swallowed every click in it,
  leaving all four footer links unreachable on a phone. The frame is `pointer-events: none` and each
  control takes its own back. The footer separately spends `--dock-clearance` to keep its last line
  out from under the launcher pill.

**Security headers — the policy is verified in a browser, never by reading it:**
- `vercel.json` carries the site's `Content-Security-Policy` and the rest of the security
  headers. `npm run check:csp` serves the built `dist/` through a server that replays those
  exact headers and loads it in Chrome. Neither `npm run dev` nor `vite preview` sends any of
  them, so this is the only local check that can see a policy break at all — every other gate
  passes on a page the live site would refuse to render.
- **`script-src` needs `'unsafe-eval'`, and that is not laziness.** The Basis/KTX2 transcoder
  is an Emscripten **embind** build: `__embind_register_function` -> `craftInvokerFunction` ->
  `new Function`. It runs inside a Blob worker, and a Blob worker inherits the document's
  policy, so there is nowhere looser to put it. Removing it does not degrade the 3D — every
  KTX2 texture fails to decode and no model reaches the stage. Fixing it properly means
  recompiling the transcoder with `-sDYNAMIC_EXECUTION=0`, not editing this header.
  What the policy still buys with it present: no inline `<script>`, no script from an
  unlisted origin, no framing, no `<base>` rewrite, no `<object>`. The delivery vectors are
  shut; only string-to-code inside already-trusted script is open.
- That failure arrives as an uncaught `EvalError`, **not** as a `securitypolicyviolation`
  event, because it happens inside the worker. The check listens on `pageerror` and `console`
  for that reason; a violation-event-only check reports a clean pass on a broken site.
- `connect-src` needs `blob:` (the loaders fetch their own worker payloads), `www.gstatic.com`
  (drei fetches the Draco decoder from a CDN — `useGLTF(url, true, ...)`), and
  `api.web3forms.com` (the contact form posts there from the browser).
- `window.__modelReady` is a **map of rig id to `true`**, not a boolean. A `=== true` wait is
  always false and makes any check built on it meaningless in both directions.

**The chat API's trust boundary:**
- `api/_core/request.ts` decides who is calling. `clientIp` reads `x-vercel-forwarded-for` or
  `x-real-ip` — headers the platform sets — and falls back to the **LAST** `x-forwarded-for`
  entry. Never entry `[0]`: a proxy appends, so the front of that list is written by the
  caller, and a rate limiter keyed on it is a formality anyone can bypass with a random value
  per request.
- `/api/chat` refuses any request whose `Origin` is not his site (403), ahead of the rate
  limiter so a rejected caller cannot spend a visitor's allowance. Preview deployments are
  allowed by setting `CHAT_ALLOWED_ORIGINS` in the Vercel project — deliberately not a
  `*.vercel.app` wildcard, which anyone can deploy under.
- The rate limiter stays in-memory and per-instance. It is a brake on casual abuse, not the
  spend control: a **hard credit cap on the OpenRouter key** is the only limit an attacker
  cannot outrun by arriving on a second instance.
- `npm run dev` binds **loopback only**, because the dev middleware holds the real
  `OPENROUTER_API_KEY`. `npm run dev:lan` publishes it to the network for phone testing; that
  is a deliberate choice, not the default.

## 3D model pipeline (salvaged)

Three character models ship with KTX2 ETC1S texture compression:
- `public/models/wizard_improved.glb` (~850 KB, Draco + KTX2 — the only model a phone ever loads)
- `public/models/spellcaster.glb`, `pact_pair.glb` (meshopt + KTX2, desktop only)

`cricket_improved.glb` was deleted: `rigs.ts` never named it, so it was 817KB shipped in every deploy
for no section. It is in git history, and `tools/build_ktx2.sh` records how to bring its row back.

**Loading:** Use `useKtx2Gltf(path)` from `src/three/ktx2.ts`, not `useGLTF`. Drei's `useGLTF` auto-wires Draco and meshopt but not KTX2; this helper attaches a `KTX2Loader` pointed at `public/basis/` (self-hosted Basis transcoder, copied from three.js examples).

**Building:** 
- `tools/build_wizard.sh` — regenerates wizard from `tools/wizard.original.glb` (Blender → gltf-transform meshopt).
- `tools/build_character.sh <input.glb> <output.glb>` — optimizes raw Tripo GLBs (gltf-transform: dedup → weld → simplify → meshopt).
- `tools/build_ktx2.sh` — applies ETC1S compression to any of the above (requires Khronos `ktx` CLI on PATH).

Run in that order if updating models. See `docs/redesign/ARCHITECTURE.md` section 5 for performance budget and rationale.

**Materials:** Apply `applyWizardingMaterials` from `src/three/characterMaterial.ts` to cloned models. It adds warm emissive tint, preserves `Glow_*` materials for Bloom, and keeps the model readable in candlelit scenes.

## Testing

- **Unit tests:** `vitest run` — tests live alongside code as `.test.ts` files.
- **Copy voice:** `src/test/copy-voice.test.ts` — fails the build if banned words appear in `src/`.
- **Content shape:** `src/content/content.test.ts` — validates that the profile, projects, skills, and experience modules match their TypeScript shapes.
- **Type gate:** `npm run build` runs `tsc -b` first; a type error fails the build.

## Deployment

Vercel (manual via `./ship` from the repo root). GitHub Actions and the Vercel GitHub App are locked by the EMU account. `OPENROUTER_API_KEY` must be set as a Vercel project env var for the chat API to work; without it, a fallback reply is returned.
