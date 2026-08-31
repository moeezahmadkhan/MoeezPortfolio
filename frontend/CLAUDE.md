# CLAUDE.md

This file guides Claude Code when working in the frontend directory.

## What this is

A single-page portfolio for **Moeez Ahmad Khan**, AI/ML engineer. Clean, readable design focused on recruiting and direct outreach. The hero section includes a 3D animated wizard model as a visual signature, but this is decoration, not navigation — all content lives in scrollable HTML below. Static site, no backend.

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
- `src/lib/` — utilities: `media.ts` (reduced-motion / coarse-pointer / WebGL probes), `contactForm.ts` (validation + Web3Forms payload), and their tests. `scrollState.ts` (the mutable scroll/pointer singleton) arrives with the 3D stage.
- `src/styles/` — the design tokens and base styles. Currently still `global.css`; it becomes `tokens.css` + `base.css` in the shell plan's Task 5.
- `src/three/` — salvaged 3D pieces: `ktx2.ts` (useKtx2Gltf loader), `characterMaterial.ts` (apply wizard material tint + glow passthrough).
- `src/test/` — `copy-voice.test.ts` (enforces no wizard vocabulary in src/); `setup.ts`; other tests.
- `api/` — serverless functions (Vercel). Currently `familiar.ts` + `_core/` (to be renamed to `chat.ts` in upcoming work).

**What is still being built:**

- `src/components/` — does not exist yet. Needs layout (Nav, Section, Footer), site (Hero, About, Work, Skills, Experience, Contact, ProjectCard), ui (Button, Tag, Reveal, Timeline), and chat (ChatDock, ChatPanel, useChat).
- `src/three/Stage.tsx`, `Backdrop.tsx`, `HeroWizard.tsx`, `WandFX.tsx`, `lights.ts`, `wizardState.ts` — the 3D canvas tree (partially described in `docs/redesign/ARCHITECTURE.md`).
- Chat retrieval and persona (`api/_core/retrieval.ts`, corpus generation, persona system prompt refinement).

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
