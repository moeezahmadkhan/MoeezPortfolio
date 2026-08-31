# CLAUDE.md

This file guides Claude Code when working in the frontend directory.

## What this is

A single-page portfolio for **Moeez Ahmad Khan**, AI/ML engineer. Clean, readable design focused on recruiting and direct outreach. A 3D model presides over the hero and follows the visitor down the page, changing with the section — decoration, never navigation. All content lives in scrollable HTML, and the site is complete and readable with the canvas gated off entirely. Static site plus a small serverless chat API.

## Commands

From `frontend/`:

```bash
npm run dev       # Vite dev server on http://localhost:5173
npm run build     # tsc -b (typecheck first) then vite build → dist/
npm run preview   # serve the production build
npm test          # vitest run — jsdom environment, @testing-library/react
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
- Per-frame state lives in mutable module singletons (`scrollState`, `wizardState`, `focusState`, `orbitState`) read inside the frame loop. **Never** React state in a per-frame or per-pointer-event path.
- Never key motion to hard-coded scroll fractions. Section membership comes from `useSectionObserver`; a scroll-fraction table is what got v1 deleted.
- **Still screenshots cannot verify motion.** `tools/shoot.mjs` waits for `window.__modelReady`, which latches only once a rig has settled — so it is blind by construction to anything visible only mid-transition. Verify time-varying work by sampling state deliberately or asserting on it in a test.

**Accessibility:**
- Honour `prefers-reduced-motion` in all animations and transitions (check `lib/media.ts` helper).
- Canvas is `aria-hidden` and decorative only.
- All content is accessible via keyboard and screen reader; do not rely on 3D for meaning.

## 3D model pipeline (salvaged)

Four character models ship with KTX2 ETC1S texture compression:
- `public/models/wizard_improved.glb` (~850 KB after meshopt + KTX2)
- `public/models/spellcaster.glb`, `pact_pair.glb`, `cricket_improved.glb`

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
