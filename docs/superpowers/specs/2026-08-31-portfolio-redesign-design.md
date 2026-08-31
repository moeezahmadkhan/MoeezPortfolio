# Portfolio Redesign — Design Spec

**Date:** 2026-08-31
**Owner:** Moeez Ahmad Khan
**Status:** approved decisions, pending spec review

## 1. Why

The current site is a Harry-Potter-themed 3D scroll world. It is technically impressive but
optimised for wonder, not for the people who actually decide things: recruiters and clients.
Section names ("Spells", "Grimoire", "Owl Post") must be decoded, content is buried inside a
camera rig, and the chatbot speaks *about* Moeez in the third person as "the Familiar".

The redesign keeps the 3D craft as the signature and rebuilds everything around it as a
readable, professional AI/ML engineer portfolio. Reference for structure and readability:
`https://muhammadahmad.vercel.app/` (a different person's site — used for information
architecture only, never for content).

## 2. Decisions locked

| Question | Decision |
|---|---|
| Identity | Clean shell, 3D as the signature. Recruiter can skim in 30s. |
| Codebase | New app shell; salvage the 3D asset/loading core and the chat proxy. |
| Chatbot | First-person as Moeez, grounded in a real corpus with retrieval. |
| Chat model | Keep the free OpenRouter cascade (with a liveness checker). |
| 3D placement | Hero set piece · shader backdrops between sections · wizard reacts to chat. |
| 3D *not* used for | Project thumbnails — those are real screenshots. |
| Aesthetic | Dark arcane-tech: ink ground, gold single accent, modern type, generous space. |
| Copy | Plain section names. Wizard vocabulary survives only as micro-copy and easter eggs. |

## 3. Information architecture

Single page, anchor nav, seven regions:

1. **Hero** — name, one-line thesis ("AI/ML engineer — computer vision, LLM systems, and the
   infrastructure that keeps them up"), primary CTAs (View work · Résumé · GitHub), scroll cue.
   3D wizard set piece behind.
2. **About** — 3-4 sentence bio, portrait, stat strip (years shipping, domains, current role).
3. **Work** — featured projects as cards: real name, one-line outcome, metric where one exists,
   stack tags, links (repo / demo / write-up), screenshot. Featured first, then "Earlier work"
   as a compact list.
4. **Skills** — grouped chips: MLOps & Orchestration · Model Deployment & Serving · Cloud &
   Infrastructure · Languages.
5. **Experience** — timeline: Ecommerce Steem (AI Developer, Jan 2026–present), QUIDSol
   (AI & CV Developer, 2025–present), ITU (Teacher's Assistant, 2024–2025).
6. **Contact** — email, location, form (existing Owl Post handler, renamed), social links.
7. **Chat dock** — persistent launcher, bottom-right, on every section.

Content lives in typed modules under `src/content/`, never in JSX.

## 4. Visual system

- **Palette:** ink `#07070d` ground, raised surface `#0e0e17`, gold `#e7c27d` as the *only*
  accent, rune-teal `#5fd3c6` reserved for the chat/AI surface, text `#ece9e4` / muted `#9a978f`.
- **Type:** one modern sans for UI and body (Geist or Inter), one display face for section
  headings and the hero name, JetBrains Mono for metrics and tags. Three faces total, no more.
- **Rhythm:** 8px spacing scale, max content width ~1120px, sections separated by generous
  vertical space rather than dividers.
- **Motion:** restrained. Scroll-reveal is a short fade + 8px rise, one easing curve site-wide.
  Everything respects `prefers-reduced-motion`.

## 5. 3D architecture (summary — details in ARCHITECTURE.md)

One persistent `<Canvas>` fixed behind the document, three layers:

- **Backdrop** — fullscreen GLSL quad: flowing noise + embers, tinted by the active section.
  Always rendered, costs one draw call.
- **HeroStage** — the wizard GLB, candle-warm lighting, wand particle FX, pointer parallax and
  a small drag-to-orbit. Visible only while the hero is on screen; unmounted from the render
  loop after that.
- **Wizard state machine** — `idle | attentive | casting`. Chat open switches to `attentive`;
  a reply streaming switches to `casting` (wand pulse + sparks).

Scroll and pointer state stays in the existing module-singleton pattern so scrolling never
re-renders the React tree. Performance: adaptive DPR, KTX2 GPU textures, `frameloop="demand"`
when nothing is animating, canvas skipped entirely below a WebGL/`prefers-reduced-motion` gate.

## 6. Chatbot architecture (summary — details in ARCHITECTURE.md)

**Voice:** first person. "I built Project Horus…". Never claims facts absent from the corpus.

**Grounding:** a persona corpus in `content/persona/` — `voice.md` (how Moeez writes),
`facts.md` (generated from `src/content/*` and the CV), `qa.md` (answers Moeez writes himself in
his own words). A build step chunks these into `api/_core/corpus.generated.json`.

**Retrieval:** BM25-lite keyword scoring inside the serverless function, top-k chunks injected
into the system prompt. No vector database and no embedding provider — the corpus is a few
thousand words, and the free OpenRouter tier has no reliable embeddings endpoint. If the corpus
outgrows this, swap the retrieval module; nothing else changes.

**Guardrails:** never invent employers, dates, or numbers; never commit to salary, availability
dates, or contractual terms — those deflect to email; off-topic requests (homework, general
coding help) are declined; the reply is capped and rate-limited per IP as today.

**Reliability:** the free model cascade goes stale — it already did once, burning five upstream
404s per request. `tools/check_models.mjs` verifies every id against the OpenRouter model list
and fails loudly, run before each deploy.

## 7. What is salvaged vs deleted

**Salvaged:** `src/scene/ktx2.ts`, `src/scene/characterMaterial.ts`, `tools/build_character.sh`,
`tools/build_ktx2.sh`, `tools/build_wizard.sh`, the `public/models/*.glb` assets, the API
handler shape in `api/_core/`, the Owl Post contact handler, `src/scroll.ts` singleton pattern.

**Deleted:** every station (`src/scene/{tracker,map,pact,spell}/`), `CameraRig`, `ScrollDriver`,
`stationVisibility`, `spans`, `CinematicIntro`, `ScrollRail`, `Candles`, `RuneCircle`,
`Sections.tsx`, `GrimoireChat`, `chapters.ts`, and the wizard-metaphor copy in `data.ts`.

## 8. Success criteria

- A recruiter reaches name, role, three real projects with metrics, and the résumé link without
  interacting with anything 3D.
- Lighthouse: performance ≥ 85 mobile, accessibility ≥ 95, LCP < 2.5s on a mid-range phone.
- The site is usable and complete with WebGL disabled or `prefers-reduced-motion` set.
- The chatbot answers ten scripted recruiter questions from corpus facts only, in first person,
  with zero invented details.
- `npm run build` (typecheck + bundle) and `npm test` pass.

## 9. Risks

- **Free-tier chat models rot.** Mitigated by the liveness checker and the graceful fallback
  reply; accepted as a cost of the $0 constraint.
- **First-person impersonation.** Mitigated by a visible "AI trained on Moeez's notes" label on
  the dock and hard guardrails against commitments.
- **3D budget on low-end mobile.** Mitigated by the reduced-motion/WebGL gate, adaptive DPR, and
  the fact that no content depends on the canvas.

## 10. Out of scope

Blog/CMS, i18n, dark/light toggle (the site is dark by design), 3D project thumbnails,
server-side rendering.
