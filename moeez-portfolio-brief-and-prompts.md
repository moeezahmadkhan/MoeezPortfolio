# moeezahmadkhan.com v2 — Brief & Prompt Chain

Filled-in version of the playbook, using your resume, your live site, and Mola Zone as the reference. Every step has a copy-paste prompt. Run them in order; don't advance until the exit criterion is met.

**Two things read first:**

1. I could not read your live site's content — it's a client-rendered SPA, so a fetch returns only the meta tags (`Moeez Ahmad Khan · AI/ML Engineer` / "Conjuring intelligent systems: agents, computer vision, and generative AI"). Everything below is built from your resume plus those tags. To critique what's actually on screen now, drop in screenshots at 1440 and 390 and I'll score them against Appendix A.
2. **The Harry Potter theme is a liability and needs to be converted, not deleted.** Warner Bros. owns that IP: the crest, house names and colours, character names, the marks, the specific spell vocabulary. A portfolio is a commercial document — it's the thing you send to hiring managers at companies with legal teams. Beyond the risk, a licensed-IP skin reads as fan work; an *original* arcane system that you authored reads as design capability, which is the thing you're actually selling. The fix is to keep the register (magical academia, ritual apparatus, candlelight, instruments) and drop every trademarked signifier. That conversion is baked into the brief below.

---

## Toolchain map

Which skill or command drives each step. Bracketed items are plugins/slash-commands — if you don't have one installed, the written prompt under that step does the same work manually.

| Step | Skill / command | What it's doing |
|---|---|---|
| 0 | `/BRAINSTORMING` | Requirements before pixels. The brief itself. |
| 1 | `/BRAINSTORMING` → `DOC-COAUTHORING` | Interview-first content extraction, then draft the case studies. |
| 2 | `SUPERDESIGN` (extract) | Pull real DNA off mola-zone.com into `design-system.md`. |
| 3 | `FRONTEND-DESIGN` | Token system only. Colour, type, layout, signature, motion. No code. |
| 4 | `FRONTEND-DESIGN` + `MODERN-WEB-GUIDANCE` | Thesis, fallback, fast lane, numeric budgets, stack call. |
| 5 | `SUPERDESIGN CANVAS` | Three hero branches side by side, compared as images. |
| 6 | `MODERN-WEB-GUIDANCE` | Build to plan; primitives checked against live best practice. |
| 7 | `/DESIGN-CRITIQUE-LOOP` ×2 clean | Screenshot → read back → score → fix → re-shoot. |
| 8 | `/A11Y-DEBUGGING` + `/DEBUG-OPTIMIZE-LCP` | Focus, contrast, reduced motion, LCP/INP/CLS. Floor, not feature. |
| 9 | `/DEBUG-OPTIMIZE-LCP` (verify) | Final measurement on real hardware, then ship. |

Two rules about the toolchain: **name the skill in the prompt** — `Use frontend-design.` at the top of a message changes the output materially — and **never let a skill skip a gate.** `SUPERDESIGN CANVAS` will happily branch heroes off a brief you haven't written; that's how you end up back at the generic look with extra steps.

---

## Step 0 — The brief · `/BRAINSTORMING`

```
SUBJECT      Moeez Ahmad Khan. AI/ML engineer, Lahore. Ships production systems in
             three specific areas: real-time computer vision pipelines
             (YOLO/SCRFD → ArcFace → FAISS), multi-agent orchestration over MCP,
             and RAG-backed backends. Full lifecycle: model orchestration →
             Docker/AWS → monitoring.

AUDIENCE     Engineering leads and technical recruiters at AI product companies,
             mostly remote/international. They are skeptical, they have many tabs
             open, and a meaningful share of them will open the network panel.
             Secondary: creative-dev studios, who judge on craft.

PAGE JOB     One: get an intro call booked. Not "showcase skills."

EVIDENCE     1. Project Horus — automated student ID pipeline. YOLO/SCRFD
                detection, ArcFace embeddings, FAISS vector matching.
             2. Silmaril AI — VC platform. Parses pitch decks into financial
                metrics, outputs company scores and founder insights.
             3. Ecommerce Steem — real-time human/animal tracking platform with
                live dashboard analytics; low-latency edge inference for Whoop
                wearables.
             4. MCP automation pipelines bridging LLMs to developer tools.
             5. TA for graduate-level Agentic AI at ITU.
             → Each needs a number. See Step 1.

MATERIAL     Bounding boxes and confidence scores overlaid on a live feed.
WORLD        Face-embedding clusters in vector space. Agent-to-agent message
             traces. Retrieval hits ranked by cosine distance. Latency
             histograms. Docker layer diagrams. Edge devices sipping power.
             AND, layered on top: instrument-room magic — brass astronomical
             apparatus, ink and lens, candle-sodium light, engraved sigils,
             ledgers, a rotating orrery.

3D THESIS    The world is a rotating observatory platform. Scrolling rotates the
             world past a fixed viewer, moving through four stations. Each
             station is one of your real systems, rendered as a working magical
             instrument — not an illustration of it, a functioning depiction of
             what the system actually does.

BANNED       Licensed IP: Hogwarts crest, house names, house colours (scarlet+
             gold, green+silver), character or spell names, the lightning bolt,
             the owl, the round glasses, the castle silhouette, "Muggle."
             Generic magic: floating candles as the only idea, parchment texture
             on every surface, wizard-hat cursor, quill icons, a wand that
             just shoots sparkles.
             Generic 3D: particle starfield, torus knot, navy + neon cyan,
             bloom on everything, custom lag-follow cursor, scroll-jack snapping.
             Generic copy: "Creative Developer," "I craft digital experiences,"
             skill bars with percentages, a tech-logo marquee.
```

---

## Step 1 — Content & proof inventory · `/BRAINSTORMING` → `DOC-COAUTHORING`

Your resume is written in responsibility language ("Architecting," "Engineering a full-stack platform"). That's fine on a CV and fatal on a portfolio. Recruiters discount responsibility claims; they can't discount numbers.

**Prompt:**

```
Use /brainstorming. Here is my brief and my resume [paste both].

Interview me before writing anything. Ask, one question at a time, the 8
questions you need to turn Horus, Silmaril AI, and the Steem tracking
platform into case studies that a skeptical staff engineer would believe.

For each project I need: the problem, my specific role vs. the team's, one
hard constraint I worked under, one quantified outcome, and one thing that
went wrong and what I did about it.

Push back hard when an answer is vague or unquantified. Don't accept
"improved reliability" — ask for the before and after number. Don't write
any copy until all 8 are answered.
```

Numbers you almost certainly have and should dig up: faces/sec through the Horus pipeline, FAISS index size and query latency, ArcFace match accuracy at your chosen threshold, p95 latency on the Whoop chat path, decks parsed by Silmaril, model size after QLoRA vs. before.

Once the interview is answered, switch skills to draft:

```
Use doc-coauthoring. Turn my 8 answers into the site's copy: positioning
line, four case studies, about paragraph, CTA copy and post-click state.
Iterate section by section — show me one, take my edits, then move on.
Plain verbs, sentence case, no filler. Active voice on every control label.
```

**Exit:** every section has real text with at least one number per project. Zero placeholders.

---

## Step 2 — Reference DNA · `SUPERDESIGN` (extract)

Mola Zone is Studio 9P's site for Yamê's album *Ebêm*. What it actually does: <cite index="11-1">it drops you onto a rotating platform where Yamê rides a motorcycle while the world scrolls past, shifting between the desert, forest and palace settings from his short film. You can hop on the bike in a mini-game, hunt for easter eggs in the scenery, and unlock extra content as you go. Every environment was modelled and textured in Blender.</cite>

**Take these five things:**

| DNA | What it means for you |
|---|---|
| The world moves, the viewer doesn't | Scroll rotates the platform. No flying camera, no scroll-jack. Cheap to control, always composed, never disorienting. |
| Distinct environment zones as chapters | Their desert/forest/palace = your four stations. Each zone gets its own palette shift and light, so "where am I" is answered by colour before it's answered by text. |
| An optional playable moment | One thing to touch. **Optional** — never a gate on the information. |
| Easter eggs that unlock content | Your existing AI chatbot *is* this mechanic, if you reframe it. |
| Blender-authored, baked, stylized | Baked lighting in Blender → light textures, no runtime lights, fast on mobile. This is how these sites stay under budget. |

**Leave these behind:** the album-promo structure (no CTA, no urgency — Yamê doesn't need a job), the celebrity-at-centre framing, and the assumption that visitors will explore. Yours must also serve someone who has 40 seconds.

**Prompt:**

```
superdesign: extract style from https://mola-zone.com/en and write
design-system.md

Then, in the same file:

Reference mechanics: rotating platform, world scrolls past the viewer,
distinct biome zones, an optional mini-game, hidden collectibles that
unlock content, all Blender-modelled with baked lighting.

Write design-system.md as ANALYSIS, not a spec to copy. For each of the five
mechanics above, answer: what does it accomplish, why does it work for an
album site, and what is the equivalent move for an AI/ML engineering
portfolio whose page job is booking a call?

Then list three things about Mola Zone I should explicitly NOT copy, and say
why each one fails for my brief.
```

---

## Step 3 — Design plan, no code · `FRONTEND-DESIGN`

**Prompt:**

```
Use frontend-design. Plan only — no code, no HTML, not one line.

From my brief, produce:

COLOUR — 4-6 named hex values, each with a job in the interface. The theme is
original arcane instrument-room, not licensed wizarding IP. Explicitly do not
use scarlet+gold, green+silver, or navy+gold. Consider palettes drawn from
what my systems actually look like: cyanotype blueprint blue, oxidised brass,
lamp-black ink, sodium candle-yellow, and one alert colour that reads as a
confidence score rather than an accent.

TYPE — 3 faces with roles. A characterful display used with restraint; a body
face; a mono/utility face, since half my content is latencies, model names and
match scores and that data should be set as data.

LAYOUT — ASCII wireframes, desktop and mobile, both now. Show the four
stations and where the fast-lane text path lives.

SIGNATURE — the one element the site is remembered by, in one sentence.

MOTION — one orchestrated moment. Name it. Say what it means.

Then interrogate your own plan: which parts of this would you have produced
for any other "magical 3D portfolio" brief? List them, kill them, replace each
with something derived from the material world in my brief — bounding boxes,
embedding clusters, agent traces, retrieval ranks. Show before/after and
justify each swap. Run that interrogation twice.
```

### The four stations (a starting concept — argue with it)

Each is a real system rendered as working apparatus, and in each case the magic device does *literally what the system does*:

- **The Scrying Basin — Project Horus.** A still water surface with faces surfacing in it. Detection draws an engraved rune-frame around each face; the frame's thickness is the confidence score. Matched identities resolve into a sigil; unmatched ones dissolve. That is SCRFD → ArcFace → FAISS, drawn honestly.
- **The Familiar Ring — agentic AI / MCP.** Several small brass automata around a circle, passing objects along glowing conduits. Each conduit lights when a message passes. MCP is the conduit standard; that's the whole point of the protocol and it's visible.
- **The Card Vault — RAG / FAISS.** A wall of catalogue drawers. A query sends light down the wall, three drawers slide open, and their contents assemble into an answer. Ranked retrieval, shown rather than described.
- **The Assay Table — Silmaril AI.** Pitch-deck parchments on a balance scale. Metrics burn out of the page as they're extracted; the score settles as weight. Founder insights annotate the margin.

### Signature: the cast

You already built an AI chatbot into the site. Reframe it as **the cast** — a single input at the base of the platform. Typing a question and sending it casts it into the world: the platform rotates to the relevant station, that station animates its response, and the answer arrives as text in the DOM. It's your unlock mechanic, your easter-egg system, your navigation, and a live demo of an agent routing a query — all one element. Nobody else's portfolio has this. Spend your boldness here and keep everything else quiet.

**Exit:** every token traces to a line in the brief. If you can't say why a hex is that hex, it's a default.

---

## Step 4 — 3D thesis, fallback, budget · `FRONTEND-DESIGN` + `MODERN-WEB-GUIDANCE`

**Prompt:**

```
Use frontend-design for 1-3 and modern-web-guidance for 4-5. Before any
hero code, write and commit to:

1. THESIS. One sentence: what the WebGL is for. Mine is "it is the work" —
   the scene demonstrates rendering and interaction skill I'm selling, and
   each station demonstrates a system I actually built.

2. FALLBACK. Design the no-WebGL path now, not later. Context lost, iOS low
   power mode, corporate locked-down laptop, a recruiter on a train. It must
   be a designed static page, not a blank canvas. Describe it.

3. FAST LANE. This is non-negotiable and it's where world-portfolios lose
   hires. Design the path for a recruiter with 40 seconds: a visible text
   route to projects, resume, and the CTA that requires zero exploration and
   zero scrolling through the world. Where does it live, what does it look
   like, and how do I stop it from feeling like an apology for the 3D?

4. BUDGET. Write these as gates, then hold them:
   - initial JS before 3D: <=150KB gzipped
   - three.js chunk, lazy: <=200KB gzipped
   - total first-view weight: <=1.5MB; whole world <=6MB
     (Messenger by Abeto ships a full multiplayer 3D world at 5.7MB — that's
     the bar, not 30MB of GLB)
   - LCP <2.5s on throttled mid-tier mobile; INP <200ms; CLS <0.1
   - 60fps desktop, >=30fps mobile floor
   - <100 draw calls, <300k triangles on screen
   - KTX2/Basis textures, Draco or meshopt geometry
   - DPR capped at 2 desktop / 1.5 mobile

5. STACK. React Three Fiber + drei, given four stations with state and an
   agent input. Justify or overrule.
```

Two Blender rules that decide whether this ships: **bake everything** (lighting into textures, zero runtime lights beyond one ambient), and **build one station fully before modelling the others**. Four half-finished stations is the failure mode.

**Exit:** thesis, fallback, fast lane, and numeric budgets written down.

---

## Step 5 — Branch the hero · `SUPERDESIGN CANVAS`

**Prompt:**

```
superdesign: 3 hero branches from that plan

From the approved plan, build 3 standalone hero variants as separate
single-file pages. Same copy and same tokens in all three. Vary only:

A) Platform rotates on scroll, viewer fixed, station arrives from the right.
B) Platform is static; the four stations orbit the viewer.
C) No rotation at all — the cast input is the entire hero, and the world
   assembles in response to the first question asked.

Screenshot each at 1440 and 390 and show me all six images together.
Throwaway code, no shared abstractions.

For each, tell me: does it survive the first 3 seconds with no motion? Does
it work as a still image? Would it be different if I were a different
engineer?
```

C is the dark horse. It puts your one genuinely unique asset first and costs almost nothing to load.

**Exit:** one branch chosen, one refinement pass done, the other two deleted.

---

## Step 6 — Build · `MODERN-WEB-GUIDANCE`

**Prompt:**

```
Use modern-web-guidance. Build to the approved plan exactly. Order is not
negotiable:

1. Full semantic HTML page first. Real headings, real links, all four project
   case studies as text, the CTA working, indexable, zero JavaScript
   required. Ship-quality on its own — this is what recruiters and crawlers
   and screen readers get.
2. Mount the canvas behind/around that DOM as enhancement. aria-hidden on
   decorative canvas. Anything the 3D communicates must also exist as text.
3. Dynamic-import three.js. The LCP element is text, never the canvas.
4. Reserve the canvas box with aspect-ratio so CLS stays at 0.
5. Dispose geometries, materials, textures and render targets on unmount.
   Pause the render loop on tab hide and when the canvas leaves the viewport.
6. Cap DPR. Raycast at 30fps, not every frame.
7. Progressive load: station 1 blocks first paint, stations 2-4 stream in.

Check every layout primitive against current best practice rather than
defaults. Watch CSS specificity — section-level and element-level padding
rules cancelling each other is the recurring bug here.
```

**Exit:** JS disabled → the page still reads and the CTA still works.

---

## Step 7 — Critique loop · `/DESIGN-CRITIQUE-LOOP` · repeat ×2 clean

**Prompt:**

```
/design-critique-loop

Screenshot at 1440, 768 and 390. Also capture: the first frame before the
scene loads, mid-rotation between two stations, and the static fallback.

Read the images back and score against my banned list one item at a time,
with a present/absent verdict for each. Add these three:
- Does anything read as licensed Warner Bros. IP?
- Can I tell what this person does for a living from the 1440 screenshot
  alone, without scrolling?
- Is the CTA visible in the first viewport on 390?

Then fix only the three worst problems and re-shoot. Three per pass, no more.
```

**Exit:** two consecutive passes with nothing scored present.

---

## Step 8 — Floor check · `/A11Y-DEBUGGING` + `/DEBUG-OPTIMIZE-LCP`

**Prompt:**

```
/a11y-debugging

Audit the built page. Report per item with a pass/fail, then fix:
keyboard focus visibility and tab order including the cast input, contrast
over the animated canvas, prefers-reduced-motion behaviour, heading order,
canvas content duplicated as text, 200% zoom, webglcontextlost fallback.
```

```
/debug-optimize-lcp

Measure LCP, INP and CLS on a throttled mid-tier mobile profile, plus
bundle sizes and frame rate. Compare every number against my Step 4 budget
and tell me which gates fail. Fix the failures in order of severity.
```

Checklist the two commands are being held to:

- Visible keyboard focus everywhere; full keyboard path to the CTA; the cast input reachable by Tab.
- Body text ≥4.5:1. **Text over the rotating world needs a solid or scrim backing** — animated backgrounds fail contrast intermittently, which is worse than failing constantly.
- `prefers-reduced-motion`: platform holds a composed still frame per station, no rotation, no idle animation. Not frozen mid-tumble.
- Headings in order. All canvas content duplicated as text. Page usable at 200% zoom.
- `webglcontextlost` handler that swaps in the fallback.
- Measure every Step 4 number on a throttled mid-tier mobile profile. Waived numbers get written down with a reason.
- No autoplay audio, ever. If there's ambient sound, it's opt-in and the control is visible.

---

## Step 9 — Ship · `/DEBUG-OPTIMIZE-LCP` (verify on real hardware)

- OG image that shows the world and names you and what you do. Your current OG is a 400×400 headshot with `twitter:card: summary` — that renders as a small square in every share. Move to `summary_large_image` with a 1200×630 render.
- Analytics event on the CTA and on the cast input. If the job is booking calls, measure booked calls.
- Test on a real phone, on cellular, outdoors.
- Keep a `notes.md` of what you tried and rejected, so the next revision starts from there instead of zero.

---

## The one-paragraph version

Keep the magic, drop the trademarks. Take Mola Zone's *mechanic* — world rotates past a fixed viewer through distinct zones, with optional play and unlockable content — and fill those zones with your actual systems drawn as working instruments: a scrying basin that does face matching, a familiar ring that does agent messaging, a card vault that does retrieval. Make your existing chatbot the signature by turning it into the cast that drives navigation. Build the whole thing as text first, WebGL second, and give the 40-second recruiter a fast lane that doesn't feel like an apology.
