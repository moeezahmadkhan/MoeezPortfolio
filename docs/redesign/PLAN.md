# PLAN — Portfolio v2 implementation

Reads with `ARCHITECTURE.md` (what the code is) and
`docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md` (what and why).

Phases ship in order. **Every phase ends green**: `npm run build` passes, `npm test` passes, and
the site is deployable at that point. No phase leaves the site broken waiting on the next one.

Branch: `redesign/v2`. Tag the current tree `v1-wizard-world` before the first deletion so the
old world stays recoverable.

---

## Phase 0 — Prep and demolition

**Goal:** a clean, buildable shell with the salvaged core intact and nothing wizard-world left.

1. `git tag v1-wizard-world && git push --tags`; branch `redesign/v2`.
2. Move salvaged files into their new homes: `src/scene/ktx2.ts` → `src/three/ktx2.ts`,
   `src/scene/characterMaterial.ts` → `src/three/characterMaterial.ts`,
   `src/scroll.ts` → `src/lib/scrollState.ts` (trim to the fields ARCHITECTURE lists).
3. Rename API routes: `api/familiar.ts` → `api/chat.ts`, `api/_core/familiar.ts` →
   `api/_core/chat.ts`; keep the handler logic, caps, and rate limiter as-is for now.
4. Delete the v1 tree listed in ARCHITECTURE §1 (stations, camera rig, sections, old chat UI,
   `data.ts`).
5. Reduce `App.tsx` to a composition root rendering an empty `<main>`.
6. Add `src/lib/media.ts` (`prefersReducedMotion`, `hasWebGL`, `isCoarsePointer`).

**Done when:** `npm run build` passes on a page that renders nothing but a heading, and
`git grep -i "grimoire\|owl post\|spellbook\|station"` returns only `docs/`.

---

## Phase 1 — Content model and design tokens

**Goal:** the real facts, typed, before any layout is written.

1. Write `src/content/profile.ts`, `projects.ts`, `skills.ts`, `experience.ts` with the types in
   ARCHITECTURE §3. Port the real facts out of the old `data.ts` and the CV:
   Ecommerce Steem / QUIDSol / ITU roles; Project Horus, Silmaril AI, the Whoop chat system,
   Query Sphere, Airbnb replica.
2. **Open item for Moeez:** each featured project needs a one-line `outcome` and, where a real
   number exists, a `metric`. Placeholders are not acceptable — a project ships without a metric
   rather than with an invented one.
3. `src/styles/tokens.css` + `base.css`: palette, 8px space scale, type scale, one easing curve.
4. Load the three fonts in `index.html` with `font-display: swap` and preload the display face.
5. Vitest: assert every project has non-empty `name`/`outcome`/`stack`, every link is absolute,
   and no string contains a placeholder marker.

**Done when:** tests pass and every fact the site will show exists in `src/content/`.

---

## Phase 2 — The clean shell (no 3D, no chat)

**Goal:** the entire portfolio, readable and responsive, with WebGL never loaded. This is the
phase that has to satisfy a recruiter on its own.

1. `layout/Section.tsx` (landmark + heading + rhythm), `Nav.tsx` (anchors, active link from
   `useSectionObserver`, mobile drawer), `Footer.tsx`.
2. `site/Hero.tsx` — name, thesis, CTAs, scroll cue. Text is the LCP element.
3. `site/About.tsx` with `ui/StatStrip.tsx`; `site/Skills.tsx` with `ui/Tag.tsx`.
4. `site/Work.tsx` + `ProjectCard.tsx` — featured cards with screenshot, outcome, metric, stack,
   links; then the compact "Earlier work" list.
5. `site/Experience.tsx` with `ui/Timeline.tsx`.
6. `site/Contact.tsx` — email, location, socials, form posting to `/api/contact`.
7. `ui/Reveal.tsx` — the one scroll-reveal primitive, `prefers-reduced-motion` aware.
8. Responsive pass at 390 / 768 / 1440; keyboard pass; contrast pass.

**Verify:** `tools/shoot.mjs` at both widths, then the `design-critique-loop` skill against the
anti-slop checklist. Lighthouse a11y ≥ 95 with no canvas on the page.

**Done when:** the site is genuinely shippable as a static portfolio.

---

## Phase 3 — The 3D signature

**Goal:** the hero set piece and the backdrop, added without moving the Phase-2 numbers much.

1. `three/Stage.tsx` — the single canvas, dynamically imported, gated by `hasWebGL()` and
   `prefersReducedMotion()`; `StaticHeroArt` fallback (pre-rendered WebP via `shoot.mjs`).
2. `three/lights.ts` + `three/HeroWizard.tsx` — KTX2 load, materials, idle float, pointer
   parallax, drag-to-orbit, `heroVisible` gating.
3. `three/WandFX.tsx` — pulsing point light + sparkles at the wand tip, driven by
   `wizardState.intensity`.
4. `three/Backdrop.tsx` + `shaders/backdrop.{vert,frag}` — fbm drift, embers, section tint
   lerped from `useSectionObserver`.
5. Bloom + vignette post chain; `PerformanceMonitor`/`AdaptiveDpr` tuning.
6. Perf pass against the ARCHITECTURE §5 budget: confirm the 3D chunk is lazy, LCP unchanged,
   and the frame body early-returns once the hero is off screen.

**Verify:** Lighthouse mobile performance ≥ 85; screenshots at both widths; confirm the site is
complete with WebGL blocked.

**Done when:** the hero is the memorable moment and nothing below it depends on the canvas.

---

## Phase 4 — The chatbot that talks like you

**Goal:** first-person, grounded, non-hallucinating, and visibly tied to the wizard.

1. `content/persona/voice.md` — **hand-authored by Moeez.** How he writes: sentence length,
   what he never says, how he describes his own work, how he handles "are you available".
2. `content/persona/qa.md` — **hand-authored by Moeez.** 20-30 real recruiter/client questions
   answered in his own words. This file is what makes the bot sound like him; nothing else can
   substitute for it.
3. `tools/build_persona_index.mjs` → `api/_core/corpus.generated.json`; `npm run persona` script;
   a test that fails if the committed corpus is stale.
4. `api/_core/retrieval.ts` + `retrieval.test.ts` — BM25-lite, pure, tested on ranking,
   stopwords, and empty queries.
5. `api/_core/persona.ts` — rewrite the system prompt to the ARCHITECTURE §4 shape (first
   person, grounding, boundaries, leads, length). Delete the Familiar third-person persona.
6. Wire retrieval into `api/_core/chat.ts`; keep caps, rate limiting, cascade, and fallback.
7. `tools/check_models.mjs` — verify every `MODELS` id against
   `https://openrouter.ai/api/v1/models`; non-zero exit on a dead id.
8. `components/chat/` — `ChatDock` launcher, `ChatPanel` (focus trap, `Esc`, `aria-live`),
   `ChatMessage`, `useChat`, `chatClient`. Label: "Ask Moeez · AI trained on my notes".
9. Wire `useChat` → `setWizardMode`: open = `attentive`, in-flight = `casting`, settle = `idle`.
10. `tools/chat_eval.mjs` — ten scripted questions; assert first person, no invented facts,
    correct deflection on salary and off-topic.

**Done when:** the eval passes and a cold visitor can ask "is he a fit for a CV role?" and get a
specific, true, first-person answer.

---

## Phase 5 — Ship polish

1. `index.html`: title, description, OG/Twitter image (render one from the hero), JSON-LD
   `Person` schema, favicon set, canonical URL.
2. `sitemap.xml`, `robots.txt`.
3. Final `design-critique-loop` pass across all sections at both widths.
4. Final Lighthouse run against `npm run preview`; record the numbers in the PR.
5. Rewrite `README.md` and `frontend/CLAUDE.md` to describe v2 — the current CLAUDE.md documents
   the station/camera-rig architecture that no longer exists and would actively mislead.
6. `node tools/check_models.mjs`, then deploy with `./ship`.

---

## Sequencing notes

- Phases 2 and 4 are the ones with real risk; 3 is contained because the canvas is optional by
  construction.
- Phase 4 **blocks on Moeez writing `voice.md` and `qa.md`.** Everything else in Phase 4 can be
  built against a stub corpus, but the bot does not sound like him until those exist. Start
  writing them during Phase 2.
- The Phase-1 open item (real project outcomes and metrics) blocks Phase 2's Work section from
  being finished, not from being built.

## Definition of done for the whole redesign

- All spec §8 success criteria met.
- `npm run build` and `npm test` green.
- Lighthouse: performance ≥ 85 mobile, a11y ≥ 95.
- Site complete and usable with WebGL disabled and reduced motion on.
- Chat eval passes with zero invented facts.
- Docs (`README.md`, `frontend/CLAUDE.md`) describe the shipped architecture.
