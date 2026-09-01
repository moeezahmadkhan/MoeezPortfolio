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
npm run check:contrast # measure body-copy contrast against the LIVE backdrop
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
- Every damping rate is a named constant in `three/motion.ts` (or `lib/scrollState.ts` for the scroll
  signal itself). A bare numeric lambda in a `damp(...)` call is a number nobody can re-tune.
- `src/test/motion-language.test.ts` asserts all of the above against the source. If a rule is wrong,
  change it there and here together; do not special-case a change through it.
- **Anything that appears must also have a way to leave.** Two surfaces shipped with an entrance and
  no exit, and both were invisible to every test: the mobile menu toggles `display`, which no
  transition could reach, and the chat panel was `{open && <panel/>}` — React cannot animate an
  element it has already unmounted. Both now stay in the DOM and hide with `display`, using
  `@starting-style` for the way in and `transition-behavior: allow-discrete` for the way out. A
  `@keyframes` entrance is the smell: it plays on mount and has nothing to say about leaving.
  A panel kept mounted for this reason MUST carry `aria-hidden` and `inert` while closed.
- Per-frame state lives in mutable module singletons (`scrollState`, `wizardState`, `focusState`, `orbitState`) read inside the frame loop. **Never** React state in a per-frame or per-pointer-event path.
- Never key motion to hard-coded scroll fractions. Section membership comes from `useSectionObserver`; a scroll-fraction table is what got v1 deleted.
- **The hero is an observed section, `'top'` (`SECTION_IDS` in Nav.tsx), not the absence of one.**
  `useSectionObserver` only commits a truthy id, so while the hero went unobserved there was no way
  back to "nothing owns the screen": scrolling to About and returning to the top latched `active` on
  `'about'` forever — the nav underlined About at the top of the page, and SceneDirector faded the
  hero model out and never brought it back (fatal on mobile, where the gate leaves the hero as the
  only model). `rigFor` normalises `'top'` to the table's `''` key. Anything else observing sections
  must use `SECTION_IDS`, never `NAV_ITEMS` alone.
- **Still screenshots cannot verify motion.** `tools/shoot.mjs` waits for `window.__modelReady`, which latches only once a rig has settled — so it is blind by construction to anything visible only mid-transition. Verify time-varying work by sampling state deliberately or asserting on it in a test.
- `tools/shoot.mjs` waits on three things per section, and needs all three: the page to hold still for
  several polls (`scroll-behavior: smooth` means `scrollIntoView` returns before the scroll starts),
  the section's expected rig to report ready, and every `Reveal` in view to reach full opacity. Its
  per-width `DESKTOP_RIG` / `MOBILE_RIG` maps encode the mobile gate above; a stale entry there shows
  up as a 15s timeout, not a wrong picture.

**3D on mobile — the gate, not a style:**
- Below the hero's `@media (min-width: 900px)` breakpoint (or on any coarse pointer), the hero is the
  ONLY rig that mounts. `rigFor(activeId, mobile)` resolves every other section to `null`, and
  `nextRig(id, mobile)` returns `null`, so the work and experience models are never fetched either —
  measured, that is 2.45MB of GLB a phone no longer downloads.
- `useIsMobileStage()` (`three/useStageViewport.ts`) is the single source of that answer. `Stage` asks
  once and passes it down. It decides four things that must never disagree: which rigs exist, where
  the hero stands, which way a dissolving rig drifts (`EXIT_LIFT` vs `EXIT_LIFT_MOBILE`), and how much
  the renderer may spend. Do not recompute it locally.
- Mobile caps `dpr` at 1, runs the post-processing chain only while a rig is actually on stage, and
  compiles the backdrop shader with `MOBILE` defined (2 fbm octaves, no embers — 2 noise evaluations
  per pixel instead of 6). Desktop is untouched by all of it.
- **The figure gets a reserved strip on mobile, it is not dimmed into the background.** `--figure-band`
  (tokens.css) is the mobile equivalent of the desktop hero's `padding-right: 42%`: Hero.css spends it
  as `padding-bottom` to lift the copy clear, and `Stage.css` sizes the no-WebGL still to the same
  strip. `MOBILE_PRESENCE` (`rigPose.ts`) and that still's opacity must stay equal — the canvas and
  the picture standing in for it are the same figure in the same place.
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
- **Nothing fixed may hit-test space it does not occupy.** `.chat` is a fixed flex column whose box is
  far larger than its controls; it measured 343x106 at 390 wide and swallowed every click in it,
  leaving all four footer links unreachable on a phone. The frame is `pointer-events: none` and each
  control takes its own back. The footer separately spends `--dock-clearance` to keep its last line
  out from under the launcher pill.

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
