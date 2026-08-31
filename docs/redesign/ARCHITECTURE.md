# ARCHITECTURE — Portfolio v2

Companion to `docs/superpowers/specs/2026-08-31-portfolio-redesign-design.md`.
That spec says *what* and *why*. This file says *exactly what code exists, what each module
owns, and what its contract is*.

Stack stays **Vite 5 + React 18 + TypeScript + react-three-fiber**, deployed on Vercel with
serverless functions under `frontend/api/`. No framework migration: Next.js would buy SSR we do
not need and cost the working KTX2/meshopt pipeline.

---

## 1. Target file tree

```
frontend/
  index.html                     # fonts, meta, OG tags, JSON-LD person schema
  vite.config.ts
  api/
    chat.ts                      # POST /api/chat        (renamed from familiar.ts)
    _core/
      chat.ts                    # provider cascade, caps, rate limit  (salvaged)
      persona.ts                 # system prompt, models, knobs        (rewritten)
      retrieval.ts               # BM25-lite over corpus chunks        (new)
      corpus.generated.json      # build artifact, committed           (new)
      chat.test.ts
      retrieval.test.ts
  content/
    persona/
      voice.md                   # how Moeez writes — hand-authored
      qa.md                      # Q&A in Moeez's own words — hand-authored
      facts.md                   # GENERATED from src/content + CV
  public/
    models/{wizard_improved,spellcaster,pact_pair,cricket_improved}.glb
    basis/                       # self-hosted KTX2 transcoder
    fonts/
    shots/                       # project screenshots (new)
    Moeez_Ahmad_Khan_CV.pdf
  src/
    main.tsx
    App.tsx                      # composition root only — no logic
    content/
      profile.ts                 # name, thesis, bio, stats, socials
      projects.ts                # Project[] — featured + earlier
      skills.ts                  # SkillGroup[]
      experience.ts              # Role[]
      index.ts                   # barrel
    lib/
      scrollState.ts             # module singleton (salvaged pattern)
      useSectionObserver.ts      # active section id -> nav + backdrop tint
      useReveal.ts               # scroll-reveal primitive
      media.ts                   # prefersReducedMotion(), hasWebGL(), isCoarse()
      contactForm.ts             # validate + Web3Forms payload (salvaged owlPost.ts)
      cx.ts
    styles/
      tokens.css                 # design tokens (colors, space, type scale)
      base.css                   # reset + element defaults
    components/
      layout/  Nav.tsx  Section.tsx  Footer.tsx
      site/    Hero.tsx  About.tsx  Work.tsx  ProjectCard.tsx
               Skills.tsx  Experience.tsx  Contact.tsx
      ui/      Button.tsx  Tag.tsx  StatStrip.tsx  Reveal.tsx  Timeline.tsx
      chat/    ChatDock.tsx  ChatPanel.tsx  ChatMessage.tsx
               useChat.ts  chatClient.ts  chat.test.ts
    three/
      StageMount.tsx             # lazy boundary + the render gate
      Stage.tsx                  # the single <Canvas> root
      SceneDirector.tsx          # cross-fades one rig out as the next fades in
      CharacterRig.tsx           # one rig, wearing whichever model the section names
      rigs.ts                    # section id -> model table; PINNED_SECTION_ID
      rigPose.ts                 # pure pose maths (pointer, focus, pinned turn)
      Backdrop.tsx               # fullscreen shader quad
      lights.tsx                 # shared lighting rig
      tint.ts                    # per-section backdrop tint
      useDragOrbit.ts            # drag-to-turn, springs back
      wizardState.ts             # idle | attentive | casting singleton
      modelReadiness.ts          # window.__modelReady, for the screenshot tool
      stageGate.ts               # WebGL / reduced-motion / save-data gate
      ktx2.ts                    # salvaged as-is
      characterMaterial.ts       # salvaged as-is; clones materials per mount
      shaders/backdrop.vert  backdrop.frag
  tools/
    build_character.sh  build_ktx2.sh  build_wizard.sh   # salvaged
    build_persona_index.mjs      # md -> corpus.generated.json   (new)
    check_models.mjs             # OpenRouter model liveness      (new)
    shoot.mjs                    # puppeteer screenshots for review
```

**Deleted outright:** `src/scene/{tracker,map,pact,spell}/`, `CameraRig.tsx`,
`ScrollDriver.tsx`, `stationVisibility.ts`, `spans.ts`, `Scene.tsx`, `RuneCircle.tsx`,
`Candlelight.tsx`, `WizardModel.tsx` (superseded by `CharacterRig.tsx`), `chapters.ts`,
`smoothScroll.ts`, `useScrollSettle.ts`, `components/{Sections,ScrollRail,ScrollCues,Candles,CinematicIntro,GrimoireChat,Hero,Tilt,SceneBoundary}.tsx`,
`src/data.ts`. Tags the old tree as `v1-wizard-world` before deleting so it stays recoverable.

---

## 2. Layering

```
┌─ DOM (z-index 2) ──────────────────────────────────────────┐
│  Nav · Hero copy · About · Work · Skills · Experience ·     │
│  Contact · Footer · ChatDock                               │
├─ WebGL canvas, position:fixed, inset:0 (z-index 0) ────────┤
│  Backdrop quad (always)  +  HeroStage (hero in view only)  │
└────────────────────────────────────────────────────────────┘
```

The canvas never re-mounts. DOM scrolls over it. No camera rig, no stations — the hero is the
only 3D "place", so the camera is effectively static and the *model* moves, not the camera.
That is the single biggest simplification versus v1.

### State flow

```
scroll / pointer events ──► lib/scrollState.ts (mutable singleton, NOT React state)
                                    │
                                    ├─► three/* useFrame reads it every frame
                                    └─► useSectionObserver (IntersectionObserver, not scroll math)
                                                │
                                                ├─► Nav active link (React state, ~7 renders total)
                                                └─► Backdrop tint uniform

chat open / streaming ──► three/wizardState.ts ──► CharacterRig reads it in useFrame
```

Rule carried over from v1 and still binding: **never lift `scrollState` into React state or
context.** Section tracking uses `IntersectionObserver`, not scroll fractions, so adding or
reordering a section requires no numeric resync anywhere. This kills the v1
`Sections ↔ CameraRig KEYS ↔ ScrollRail` three-way coupling that made every content edit risky.

---

## 3. Module contracts

### `src/content/*` — the single source of content truth

```ts
// projects.ts
export type Project = {
  slug: string
  name: string
  outcome: string          // one line: what it does + the result
  metric?: string          // e.g. "sub-2s p95 on-device" — only if real
  detail: string[]         // 2-3 bullets, plain engineering language
  stack: string[]
  shot?: string            // /shots/<slug>.webp
  links?: { repo?: string; demo?: string; writeup?: string }
  featured: boolean
}
export const projects: Project[]
```

`experience.ts` (`Role = { period, title, org, bullets: string[] }`), `skills.ts`
(`SkillGroup = { title, items: string[] }`), `profile.ts` (`name`, `thesis`, `bio`,
`stats: {label, value}[]`, `email`, `location`, `socials`).

Every visible string in the site comes from here. `tools/build_persona_index.mjs` also reads
these modules, so the chatbot and the page can never disagree about the facts.

### `src/lib/scrollState.ts`

```ts
export const scrollState = { progress: 0, raw: 0, pointerX: 0, pointerY: 0, heroVisible: 1 }
export function useScrollTracker(): void   // installs passive listeners, writes the singleton
```

`heroVisible` (1 → 0 as the hero leaves the viewport) is what lets `Stage` drop the hero layer
out of the render loop.

### `src/three/Stage.tsx`

```tsx
export function Stage() {
  if (!hasWebGL() || prefersReducedMotion()) return <StaticHeroArt />   // graceful, no canvas
  return (
    <Canvas className="stage" dpr={[1, 2]} frameloop="always"
            gl={{ antialias: false, powerPreference: 'high-performance' }}
            camera={{ position: [0, 0.6, 4.2], fov: 38 }}>
      <PerformanceMonitor onDecline={dropDpr} />
      <AdaptiveDpr pixelated />
      <Backdrop />
      <Suspense fallback={null}>
        <HeroStage />          {/* self-gates on scrollState.heroVisible */}
      </Suspense>
      <EffectComposer disableNormalPass>
        <Bloom intensity={0.7} luminanceThreshold={0.6} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  )
}
```

Contract: `Stage` mounts exactly once, in `App.tsx`, above all DOM sections. It reads nothing
from React state. `StaticHeroArt` is a pre-rendered WebP of the wizard, so the reduced-motion
and no-WebGL paths still look intentional.

### `src/three/Backdrop.tsx`

A single `<mesh>` with an orthographic fullscreen quad and a `ShaderMaterial`:

```glsl
// backdrop.frag (shape)
uniform float uTime;      // clock
uniform float uScroll;    // scrollState.progress
uniform vec3  uTintA;     // active section tint, lerped
uniform vec3  uTintB;
// fbm noise -> slow vertical drift -> ember specks -> vignette
```

Uniforms are written in `useFrame` from `scrollState` and the section observer's tint. One draw
call, no textures, no allocation per frame. Tint per section: hero=gold, work=teal-lean,
experience=deep ink — subtle enough that it reads as depth, not as a colour change.

### `src/three/CharacterRig.tsx`

One component for every section's model — the hero's original `HeroWizard` generalised, carrying
its tuned constants over verbatim. `rigs.ts` maps a section id to a model; `SceneDirector` mounts
the rig for the active section and keeps the outgoing one alive until it has finished dissolving.

Loads its GLB through the salvaged `useKtx2Gltf` (not `useGLTF` — drei auto-wires Draco/meshopt
but not KTX2). Deep-clones the cached scene, then clones its **materials** (three's `Mesh.copy`
assigns the same material references, so without this every mount of a model would fight over one
set) and applies `applyWizardingMaterials`, which passes `Glow_*` through untouched. Materials are
disposed by hand on unmount; geometry is not, because the cache still owns it.

Behaviour per frame:

- Idle bob + slow Y drift, both damped.
- Pointer parallax: yaw/pitch eased toward `scrollState.pointerX/Y`, clamped to ±0.18 rad.
- Focus bias: the Work rig turns toward whichever project card is hovered **or focused**, derived
  from the grid's own layout rather than a slug table, and bounded by `MAX_FOCUS_TURN`.
- The pinned turn: in `PINNED_SECTION_ID`'s section only, `pinnedYaw` adds up to `PINNED_TURN`
  of rotation driven by how far the viewport has travelled through that section.
- Drag-to-orbit on the hero: pointer-down adds a damped yaw offset, springs back on release.
- Cross-fade: each rig owns a `fade` chasing `fadeIn`. The wand light and the sparkles both ride
  the same `pose.opacity` as the body materials, so FX can never lead the body in. The very first
  rig of a page load mounts already materialised (`skipInitialFade`) — the hero never had an
  entrance and must not gain one.
- Once fully faded out, the frame body costs one visibility check and returns.
- Reads `wizardState.mode` for the wand's brightness.

### `src/three/wizardState.ts`

```ts
export type WizardMode = 'idle' | 'attentive' | 'casting'
export const wizardState = { mode: 'idle' as WizardMode, intensity: 0 }
export function setWizardMode(m: WizardMode): void
```

Written by the chat hook, read in `useFrame`. Deliberately a singleton for the same reason
`scrollState` is: chat typing must not re-render the canvas tree.

### `src/components/chat/useChat.ts`

```ts
export function useChat(): {
  messages: ChatMessage[]
  send(text: string): Promise<void>
  status: 'idle' | 'sending' | 'error'
}
```

Owns the transcript, calls `chatClient.post`, and drives `setWizardMode` — `attentive` when the
panel opens, `casting` while a request is in flight, `idle` 1.5s after it settles.

---

## 4. Chat pipeline

```
visitor question
      │
      ▼
POST /api/chat  { messages: [{role, content}] }
      │
      ├─ caps: MAX_MESSAGE_CHARS (1000), MAX_TURNS (12), rate limit per IP (15/min, 60/hr)
      │
      ├─ retrieval.ts: score corpus chunks against the last user message (BM25-lite),
      │                take top 6 chunks (~1200 tokens), tag each with its source file
      │
      ├─ persona.ts: SYSTEM_PROMPT (first-person Moeez + guardrails) + retrieved chunks
      │
      ├─ _core/chat.ts: try MODELS in order, MODEL_TIMEOUT_MS = 12s each, first success wins
      │
      ▼
{ reply: string }        // or FALLBACK_REPLY on total failure
```

### `retrieval.ts` contract

```ts
export type Chunk = { id: string; source: string; heading: string; text: string; tokens: number }
export function retrieve(query: string, corpus: Chunk[], k = 6): Chunk[]
```

Pure function, no I/O, fully unit-testable. BM25-lite = term frequency × inverse document
frequency over a stopword-filtered, stemmed-ish token set, plus a small boost when a query term
appears in the chunk heading. Chosen over embeddings because the corpus is a few thousand words,
the free OpenRouter tier exposes no dependable embeddings endpoint, and this adds zero runtime
services. Swappable: if the corpus grows past ~50k words, replace this one file.

### `corpus.generated.json`

Built by `tools/build_persona_index.mjs`: reads `content/persona/*.md` plus `src/content/*.ts`,
splits on markdown headings into ≤200-word chunks, writes the `Chunk[]`. Committed so the
serverless function needs no filesystem access at runtime. Regenerated by `npm run persona`,
and CI-checked to be in sync (the build fails if regenerating produces a diff).

### Persona prompt shape (`persona.ts`)

```
You are Moeez Ahmad Khan, an AI/ML engineer. You are answering visitors on your own portfolio.

VOICE: <voice.md rules — direct, concrete, no marketing adjectives, short sentences>
GROUNDING: Answer only from the CONTEXT below and the conversation. If the context does not
  cover it, say so plainly and point to email. Never invent employers, dates, metrics, or
  client names.
BOUNDARIES: Do not commit to salary, rates, start dates, or contract terms — say those are
  worth a direct conversation and give the email. Decline off-topic requests (homework,
  general coding help, current events).
LEADS: If someone describes a role or project, ask one useful follow-up and surface the email.
LENGTH: 1-4 short sentences unless asked for detail.

CONTEXT:
<top-k retrieved chunks, each prefixed with its source heading>
```

The dock is labelled **"Ask Moeez · AI trained on my notes"** — first person, honestly framed.

---

## 5. Performance budget

| Item | Budget | Mechanism |
|---|---|---|
| Initial JS | < 250 KB gzip | Vite manual chunks; three/postprocessing in a lazy chunk |
| Wizard GLB | 850 KB | already meshopt + KTX2 ETC1S (~8× less VRAM than JPEG) |
| LCP | < 2.5s mobile | LCP element is hero *text*, not the canvas; canvas loads after |
| Canvas cost when hero off-screen | ~1 draw call | HeroStage self-gates on `heroVisible` |
| Chat reply | < 12s worst case | per-model timeout, then fallback |

The 3D bundle (`three`, `@react-three/*`, `postprocessing`) is dynamically imported so the
document and all content paint before WebGL work begins. Reduced-motion and no-WebGL visitors
never download it.

---

## 6. Accessibility rules

- Every section is a landmark with a heading; nav links are real anchors.
- The canvas is `aria-hidden` and purely decorative — no content lives only in 3D.
- Chat dock is a `<dialog>`-semantics panel: focus trap, `Esc` closes, focus returns to launcher,
  messages in an `aria-live="polite"` log.
- Visible focus rings on the gold accent, contrast ≥ 4.5:1 for body text on ink.
- `prefers-reduced-motion` kills reveals, parallax, and the canvas in one branch (`lib/media.ts`).

---

## 7. Testing & verification

- **Unit (vitest):** `retrieval.test.ts` (ranking, empty query, stopwords), `chat.test.ts`
  (caps, rate limit, cascade fallback), `useChat` reducer, content-shape assertions.
- **Type/build gate:** `npm run build` = `tsc -b && vite build`. A type error fails the build.
- **Visual:** `tools/shoot.mjs` (puppeteer-core + system Chrome, `--use-gl=angle
  --use-angle=swiftshader`) screenshots hero/work/chat at 1440 and 390 wide; then the
  `design-critique-loop` skill reviews them.
- **Lighthouse:** run against `npm run preview` before each deploy; thresholds in the spec.
- **Chat eval:** ten scripted recruiter questions in `tools/chat_eval.mjs`, checked for
  first-person voice, no invented facts, and correct deflection on salary/off-topic.

---

## 8. Deployment

Vercel, manual (`./ship`) — GitHub Actions and the Vercel GitHub App are locked by the EMU
account. `OPENROUTER_API_KEY` is a Vercel project env var; the API route returns the fallback
reply if it is missing, so a key-less preview still renders. Run `node tools/check_models.mjs`
before shipping; it fails if any id in `MODELS` no longer resolves.
