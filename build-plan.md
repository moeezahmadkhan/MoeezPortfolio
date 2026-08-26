# Build plan — thesis, fallback, fast lane, budget, stack

Step 4. Written and committed **before any hero code exists**. Sections 1–3 are
design decisions; 4–5 are engineering gates checked against current web practice.

---

## 1. Thesis

**The WebGL is the work: the scene itself is the rendering and interaction
engineering being sold, and each station is a working depiction of a system that
actually shipped.**

Two consequences that constrain everything downstream.

**It is not an illustration of the work, so it may not lie.** A station's gauge
moves because the same arithmetic the pipeline uses recomputed it, not because a
designer keyframed a satisfying curve. Vanguard's funnel narrows to 26.0% because
2,676 of 10,291 cleared the gate. Drag the limit and the number that appears is
the number that limit would actually produce. The moment a reading is decorative,
the station is a lie about a system whose entire selling point is that it does not
lie about itself.

**It is the demo, so its own performance is part of the claim.** A portfolio that
argues "I ship models that get measured" while dropping frames has refuted itself
before the reader finishes the sentence. The budgets in section 4 are therefore
not hygiene — they are the same claim as the copy, made in a different medium. A
janky scene is a failed evaluation.

---

## 2. Fallback — the no-WebGL path

Designed now, as a first-class rendering of the same page. Not a stub, not an
apology, and **not a separate URL**.

### What triggers it

| Condition | Detection | Result |
|---|---|---|
| No WebGL2 context | `canvas.getContext('webgl2')` returns null at boot | Static path, permanently |
| Context lost | `webglcontextlost` event | Freeze to static path, keep scroll position, no reload |
| iOS Low Power Mode / thermal throttle | rAF probe: sustained < 20fps for 3s after warm-up | Offer static path via a persistent control; do not switch without consent mid-read |
| Data saver / weak device | `navigator.connection.saveData`, `deviceMemory <= 4` | Static path by default, 3D offered behind a control |
| `prefers-reduced-motion: reduce` | Media query | 3D renders, but static: no rotation, no Exposure sweep, end state only |
| JavaScript disabled entirely | No JS executes | Static path, because it is what the server sent |

Order matters: the static path is the **default** output of the server, and the
canvas upgrades it. Nothing has to fail for the static page to exist — it is what
exists before the upgrade runs.

### What it looks like

The signature survives intact, which is the whole reason this fallback is
cheap. **The exposure bar is CSS and SVG, not WebGL.** A measured value's ink
density is a `background` on a `<span>`; a hollow outline is a border with no
fill. Every number on the static page still shows whether it was measured.

Each station becomes an **engraved plate**: a single inline SVG, ~4–8KB, in the
same brass-on-plate language as the 3D instrument.

```
┌─────────────────────────────────────────────────────────┐
│ 0.45 ─ EDGE VISION ─ SOLO                               │
│                                                         │
│  10,291 faces seen.                                     │
│  2,676 good enough to trust.                            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  THE GATE                                         │  │
│  │                                                   │  │
│  │  seen      ████████████████████████████  10,291   │  │
│  │  kept      ███████                        2,676   │  │
│  │  known     ██████                         2,376   │  │
│  │  stranger  █                                300   │  │
│  │                                                   │  │
│  │  blur      ▓▓▓▓▓▓▓▓▓▓│▓▓▓▓▓        floor 100      │  │
│  │  face area ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│▓        min 2.00%     │  │
│  │  yaw       ▓▓▓▓▓│▓▓▓▓▓▓▓▓▓▓▓        max 12°       │  │
│  │                 └ the limit                       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [prose] THE CONSTRAINT / WHAT WENT WRONG / SAID PLAINLY│
│                                                         │
│   4      512      0.45      26.0%                       │
│  ─────────────────────────────────────                  │
│  ⌐ open the rejection detail ¬                          │
└─────────────────────────────────────────────────────────┘
```

The four plates:

| Station | Static plate |
|---|---|
| Vanguard | The funnel as four stacked bars, plus three gauge bars with their limit ticks |
| Sumero | A 20-row grading grid, pass/partial/fail cells, 22 marked open in iron oxide |
| Pawlyse | A 140-second budget bar segmented by stage, with citations accumulating to a cap of 6 |
| Nexis | Eleven weighted bars summing to 100, with the model id shown as swappable underneath |

**The one thing genuinely lost** is the draggable limit on Vanguard. The static
plate shows the shipped value `0.45` and three precomputed alternatives as a small
table — widen, ship, tighten — so the *idea* survives even where the interaction
cannot. It is stated as a table, not mourned as a missing feature.

No "your browser does not support…" message appears anywhere. The static page
never mentions the 3D, because a reader who never sees the 3D has not missed
anything they can act on.

---

## 3. Fast lane

The non-negotiable one. This is where world-portfolios lose hires: a recruiter
with 40 seconds cannot find the stack, the availability, or the calendar link, so
they close the tab and the beautiful world is worth nothing.

### Where it lives

**Two routes, both permanent, both visible without scrolling.**

**A. The index rail** (desktop) / **the sheet** (mobile). Fixed, never scrolls
away. Four stations labelled by their governing threshold, then the call:

```
● 0.45   vanguard    edge vision · solo
○ 93.0%  sumero      clinical LLM · eval harness
○ 140s   pawlyse     research agent
○ 11×w   nexis       LLM scoring
─────────────────────────────────────
⌐ book a 30-minute call ¬
⌐ read as text ¬     ⌐ CV, PDF ¬
```

One click reaches any station. One click reaches the calendar. Nothing requires
travelling through the world.

**B. `read as text`.** Drops the canvas and renders the entire page as a single
document — positioning line, four case studies at full length, About, contact.
Same URL, same content, same words at the same weight. It is the identical
content the fallback serves, which is why it costs nothing to maintain and cannot
drift out of sync.

### The 40-second path, timed

| Second | What they have |
|---|---|
| 0–2 | Positioning line, in HTML, first paint. Three numbers in it. |
| 2–5 | Index rail visible: four systems, each labelled with a real threshold |
| 5–8 | `remote only · reply within one working day` — visible in the header block, not buried in a footer |
| 8–40 | Either one station read in full, or `read as text` and scan everything, or straight to `book a 30-minute call` |

Availability and response time sit **above the fold**, in the hero block. They are
the two facts a recruiter is actually screening for and they are cheap to show.

### How it avoids feeling like an apology for the 3D

Five decisions, and they matter more than the feature itself:

1. **It is never labelled as a fallback.** The control says `read as text`. Not
   "simple version", not "accessibility mode", not "having trouble?". It is a
   reading mode, the way a manual has a schematic and an index.

2. **It is styled at full strength.** Same palette, same three faces, same
   exposure bars, same engraved plates. It looks like the same instrument opened
   flat on the bench. A stripped, greyscale, Times-New-Roman fallback *is* an
   apology; a designed one is a second view.

3. **It sits beside the primary control, not beneath it.** `⌐ book a 30-minute
   call ¬` and `⌐ read as text ¬` are peers in the same bracket row. Nothing about
   the arrangement implies one is for people who could not have the other.

4. **The 3D never gates anything.** No unlocks, no collectibles, no "explore to
   reveal". Every claim on the page is reachable in text. The world is the reward
   for depth, never the toll gate — which means the text route is not a shortcut
   past the content, it is the content.

5. **The instruments are legitimately better in 3D, and only there.** The
   draggable limit, the turret detent, the Exposure sweep. The text route is not a
   lesser copy of a richer thing; it is the same evidence without the
   demonstration. That is an honest trade and the page does not pretend otherwise.

---

## 4. Budget — gates, and how each is held

Every gate below has a measurement method and a failure action. A gate without
enforcement is a wish.

### Weight

| Gate | Limit | Measured by | On breach |
|---|---|---|---|
| Initial JS before 3D | **≤ 150KB gzip** | `rollup-plugin-visualizer` + a CI size check on the entry chunk | Build fails |
| three.js chunk, lazy | **≤ 200KB gzip** | Same, on the dynamically-imported chunk | Build fails |
| Total first view | **≤ 1.5MB** | Lighthouse total byte weight, mobile preset | Build fails |
| Whole world, all assets | **≤ 6MB** | Sum of `dist/assets` 3D payload | Build fails |

The reference bar is right: Messenger by Abeto ships a full multiplayer 3D world
at 5.7MB. A 30MB GLB is not a rich scene, it is an unoptimised one.

**How the 150KB is actually spent.** React + React DOM is ~45KB gzip. The DOM
app — argument plane, index rail, exposure bars, routing between world and text —
is the rest. This fits *only* if the 3D layer is behind a dynamic `import()` and
nothing in the entry graph transitively pulls `three`. That is a lint rule, not a
hope: a CI check greps the entry chunk for `three` and fails if it appears.

**How the 200KB is spent.** three.js core, tree-shaken, is the bulk. Which forces
three rules:

- **Import from `drei` per-component**, never the barrel. `import { useGLTF } from
  '@react-three/drei/core/useGltf'`-style deep imports only.
- **No `@react-three/postprocessing`.** It is heavy, it costs a full-screen pass,
  and the brief bans bloom on everything anyway. The look is baked, not
  post-processed.
- **No 3D text.** No `drei/Text`, no troika. Every label lives in the DOM
  argument plane — which the thesis already required, and which incidentally
  avoids troika's inability to parse WOFF2.

### Core Web Vitals

| Gate | Limit | Condition |
|---|---|---|
| LCP | **< 2.5s** | Throttled mid-tier mobile, Lighthouse mobile preset |
| INP | **< 200ms** | Field-equivalent, measured on the interactive gauges |
| CLS | **< 0.1** | Full scroll of the page |

**LCP is the positioning line, and it is text.** It ships in the HTML response, so
the preload scanner finds it immediately — no JavaScript in its critical path.
Fonts are the risk: Bodoni Moda, Archivo and Plex Mono are all `preload`ed as
`woff2` with `font-display: swap`, subset to Latin, and the hero is styled to be
legible in the fallback metric so the swap does not move it.

**INP is the draggable limit.** The recompute is arithmetic over four counters,
well under 50ms, so it runs synchronously for immediate visual feedback. The
canvas response is decoupled: the DOM number updates on the input event, the 3D
gauge follows on the next frame. Pointer handling is throttled to one update per
frame with `requestAnimationFrame`, not per `pointermove`.

**CLS is the canvas and the fonts.** The canvas container has a reserved
`aspect-ratio` and a fixed height from first paint, so the 3D upgrade never
resizes anything. Every station plate declares `contain-intrinsic-size` alongside
`content-visibility: auto` so off-screen stations are skipped for layout and paint
without the scrollbar jumping.

### Runtime

| Gate | Limit | Held by |
|---|---|---|
| Desktop | **60fps** | Draw-call and triangle budget below |
| Mobile floor | **≥ 30fps** | Mobile render tier |
| Draw calls | **< 100 on screen** | Merged static geometry; instancing for repeated parts; one station lit at a time |
| Triangles | **< 300k on screen** | Only the detented station and its two neighbours are in the scene graph; the rest are unmounted, not just hidden |
| DPR | **2 desktop / 1.5 mobile**, hard cap | Set at renderer init and on resize |

**The mobile render tier**, carried over from what already burned once on the
previous build: no shadows, no SMAA, reduced DPR. Realtime shadows on the mobile
tier produced `glBlitFramebuffer` warning spam and cost frames for a result nobody
could see at that size. Lighting is baked in Blender regardless, so shadows are a
cost with no benefit on any tier.

**Frame budget discipline.** No per-frame allocation in `useFrame` — vectors and
quaternions are module-scope scratch objects. No `setState` in the render loop;
scroll and rotation live in refs, and React re-renders only when the detented
station changes.

### Assets

| Gate | Rule |
|---|---|
| Textures | **KTX2 / Basis**, transcoded on the GPU. No PNG or JPEG in the 3D payload. |
| Geometry | **Draco or meshopt.** meshopt preferred — faster decode, smaller decoder, and it composes with KTX2 cleanly. |
| Atlasing | One atlas per station, so a station is one material and a handful of draw calls |
| Loading | Station 1 loads with the page; stations 2–4 prefetch on idle via `requestIdleCallback`, never on the critical path |
| Raw sources | `.blend`, source PNGs and uncompressed GLB stay out of the repo's tracked tree — they are inputs, not artifacts |

### Enforcement

A single `npm run gates` runs the size checks, the entry-chunk `three` grep, and
Lighthouse against a local production build, and exits non-zero on any breach. It
runs in CI on every push and is the last command before deploy. **A budget that is
only in a document is not a budget.**

---

## 5. Stack — React Three Fiber + drei

**Verdict: keep it. Justified, with three hard constraints attached.**

### Why it survives the 150KB gate

The DOM app is not optional. The argument plane, the index rail, the exposure
bars, the text route and the fallback are all real UI with real state, and they
must render with no canvas at all. Something is managing that regardless — so
React's ~45KB is spent on work that has to happen, not on the 3D.

Given React is already present, R3F's marginal cost is small, and the alternative
is worse: hand-writing the synchronisation between a vanilla three.js scene and a
React DOM tree that shares scroll position, detent index, the dragged threshold
value and the current station. That synchronisation layer is the exact code R3F
already is, and mine would be buggier and no smaller.

### Why not vanilla three.js

It would save roughly 40KB gzip. It would cost the shared-state layer above, plus
the declarative unmounting that the triangle budget depends on — "only the
detented station and its neighbours exist in the scene graph" is one conditional
render in R3F and a manual lifecycle in vanilla. The 40KB is not worth
hand-rolling a reconciler.

### Why not a heavier framework

Nothing here needs SSR-with-hydration complexity, a router, or a data layer. Four
stations, one scroll axis, one draggable value. Vite plus React plus R3F, built to
a static bundle, served from a CDN. The page has no server.

### The three constraints

1. **drei is a menu, not a meal.** Deep per-component imports only. The barrel
   import pulls a large graph and would eat the 200KB chunk on its own.
2. **No postprocessing package.** The look is baked lighting and material work.
   Bloom-on-everything is banned by the brief and would cost a full-screen pass on
   the mobile tier.
3. **No 3D text anywhere.** All type is DOM. This follows from the thesis, holds
   the chunk budget, keeps every word selectable and searchable, and makes the
   text route free.

### Overruled from the brief's assumption

The brief said "four stations with state **and an agent input**." **I am dropping
the agent input**, and this is the one place I am overruling the plan rather than
implementing it.

The previous build had a chat familiar. On this page it costs an LLM endpoint, a
key to protect, a rate limit, an abuse surface, latency on a page whose thesis is
measured performance, and — worst — it invites the visitor to spend their 40
seconds talking to a bot instead of clicking `book a 30-minute call`. A chat
widget competes with the only conversion the page has, exactly like the mini-game
did in Step 2.

The instinct behind it is right, though: prove you can build agentic systems. That
proof already exists on the page as evidence rather than as a toy — Sumero's
triage router at 93.0%, Pawlyse's ten-call research loop against a 140-second
budget, Nexis's swappable per-stage models. Showing the graded eval is a stronger
claim than shipping an ungraded chatbot, and it is on-thesis: **measured, not
demoed.**

If you want it back, say so and it goes in as a fifth station with its own numbers
rather than as a widget in the corner.

---

## Gate check before Step 6

- [ ] `npm run gates` exists and fails the build on any breach
- [ ] Entry chunk contains no reference to `three`
- [ ] Static path renders every claim with the canvas deleted from the DOM
- [ ] Availability and response time are above the fold
- [ ] `read as text` and `book a 30-minute call` are peers in the same control row
