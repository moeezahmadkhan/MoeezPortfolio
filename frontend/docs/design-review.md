# Design review — The Wizard's Archive

> **This reviews the archived site.** The Wizard's Archive is preserved at tag
> `v1-wizard-site`; `moeezahmadkhan.com` now serves the rebuild, whose files —
> four stations, vanilla three, no React — are in the other repo. The review
> for what ships is `design-review.md` there. Everything below still applies
> to this repo's `frontend/`, and to nothing else.

Judge the page like you didn't build it.
One pass, three viewports, one verdict. The screenshots supply the evidence; re-reading
`Sections.tsx` supplies only the page you meant to ship.

Re-shoot after every fix. A fix is unproven until it is photographed.

---

## STEP 0 — THE ASK · bigger lever than any checklist

Not: "review my portfolio."

> Review the Wizard's Archive landing page against `frontend/.superdesign/design-system.md`.
> **Page job:** a hiring manager or founder who has never heard of Moeez decides in under
> 60 seconds that he ships real AI/ML systems, then clicks GitHub, the CV, or Owl Post.
> Judge it at **390px first**. Return three findings, ranked, each with the fix and the file.
> Then tell me what to cut.

`artifact + page job + standard + hardest viewport + verdict you want`

### The tension unique to this site

The theme is the differentiator **and** the main risk. Every review must answer one
question before any other: **does the wizarding metaphor carry the evidence, or hide it?**
A visitor who leaves remembering "cool 3D wizard" and not "ships computer-vision and
generative-AI systems" is a failed page, no matter how good the render looks.

---

## 1 · Re-state the job — `/BRAINSTORMING`

Write the job down before looking again. A review without a target is taste, and taste
argues forever.

- Audience: recruiter / eng manager / technical founder. Not other 3D devs.
- Success: GitHub click, CV download, or Owl Post submit.
- Nine chapters (`src/chapters.ts`, I–IX). Each one must justify its scroll cost against
  that job. `The Pact`, `The Pulse`, `The Marauder's Map` are the *proof* chapters —
  they carry model work. `The Conjuring` and the rail are *atmosphere*.

## 2 · Shoot before you judge — PLAYWRIGHT · CHROME-DEVTOOLS-MCP

WebGL will not render in a plain headless browser. Drive system Chrome:

```bash
cd frontend && npm run build && npm run preview   # judge the build, not the dev server
# headless WebGL: /usr/bin/google-chrome-stable --use-gl=angle --use-angle=swiftshader
```

Capture at **1440 / 768 / 390**, and because the camera is scroll-driven, a single
full-page shot is not evidence. Shoot **per chapter**, at the settled scroll fraction:

| Shot set | What it proves |
| --- | --- |
| `hero` at each width | first contact, LCP element, CTA visibility |
| One shot per chapter id `wizard spells pact tracker map chronicles grimoire owlpost` | model framing, copy/model collision |
| Mid-transition (between two `at` fractions) | station dead zones — a black frame between stations is a fail |
| `GrimoireChat` open, `OwlPostForm` filled + submitted + error state | the only two real interactions on the page |
| Intro (`CinematicIntro`) and intro-skipped | most visitors see the intro once; you never do |

Plus the accessibility tree and one Lighthouse run. Evidence first, opinion second.
Existing baselines live in `.playwright-mcp/` (`d-1440-*`, `t-768-hero`, `m-390-*`).

**Mobile framing is measured, not eyeballed.** If any chapter's figure sits off-frame at
390, that is a `KEYS_MOBILE` drift, not a CSS bug:

```bash
node tools/measure_mobile.mjs     # re-measure chapter fractions at 390×844
node tools/shot_chars.mjs         # Conjuring / Pact / Map framing, intro skipped
npx vitest run src/scene/spans.test.ts   # chapters.ts ↔ KEYS ↔ spans.ts must agree
```

## 3 · Read the images back — `/DESIGN-CRITIQUE-LOOP` · the one people skip

Feed the screenshots in **as images**, not as a description of them. Text-only
self-review agrees with itself every time and misses everything that only exists
visually — bloom blowing out gold text, a model silhouetted to black, a card whose
border vanished against the vignette.

## 4 · Score the tells — binary. No partial credit

Pass or fail, never "mostly fine". Every fail names a coordinate: which chapter, which
viewport, which file.

## 5 · Extract your own style back out — SUPERDESIGN

```
superdesign: extract style from <the live URL>
```

Diff the recovered system against `frontend/.superdesign/design-system.md`. Known
starting drift, already on the record — the design system says *tone is opacity, never a
new hex*, while `src/styles/global.css` ships **eight** palette hexes (`--ink`,
`--parchment`, `--parchment-dim`, `--gold`, `--gold-bright`, `--gold-deep`, `--ember`,
`--rune`). If the extraction comes back with more gold tints than the seven-step opacity
ladder allows, that gap **is** the finding.

Also check the doc's own claim: *the 3D scene is the artwork, the HTML is a HUD.* If any
HTML element out-shouts the canvas, the build has drifted from the plan it was approved
against.

## 6 · Re-check the CSS is from this decade — MODERN-WEB-GUIDANCE

Every layout primitive verified against live best practice. Shipping and working is not
the same as current. On this page specifically: the pinned/`svh` section behaviour in
`components/sections.css`, the Lenis-vs-native scroll fallback, and whether the sticky
nav offset still derives from `--nav-h` rather than a hardcoded 80px.

## 7 · Floor check, then the verdict — `/A11Y-DEBUGGING` · `/DEBUG-OPTIMIZE-LCP`

Floor fails are blocking, not notes.

- Keyboard alone, top to bottom: nav links, GitHub/LinkedIn, chapter index dialog,
  Grimoire chat, Owl Post. A focus ring must be visible **against the candlelit dark** —
  a gold ring on gold chrome is a fail even though it technically exists.
- `MotionConfig reducedMotion="user"` covers framer-motion only. Verify by hand what it
  does **not** cover: the `CinematicIntro` ramp, Lenis smooth scroll, `Cursor.tsx` sparks,
  Sparkles/Float/Bloom in the R3F loop.
- The canvas is `aria-hidden` atmosphere. Confirm nothing load-bearing — a project name,
  a metric, a label — exists *only* as a drei `<Text>` inside it.
- LCP budget: the preloader gates on `useProgress`, behind `wizard.glb` (~3.6MB) plus
  three more character GLBs and their KTX2 textures. Name the real LCP element at 390 on
  a throttled connection and state its number.

---

# THE SCORECARD — mark every box

A blank box is a fail.

### FIRST GLANCE
- [ ] Reads as **this** engineer, not a wizard template with a name dropped in
- [ ] Three things recalled with the tab closed — and at least one is a *capability*, not a prop
- [ ] Boldness spent in exactly one place (the hero conjuring), quiet around it

### STRUCTURE
- [ ] Section spacing encodes hierarchy — proof chapters (Pact / Pulse / Map) read heavier than atmosphere
- [ ] 390px: no horizontal scroll, no heading orphaned from the model it labels
- [ ] Roman numerals earn their place — order carries information, or they go
- [ ] Not every chapter a centred eyebrow over a tilt card
- [ ] No black dead-zone frame between two stations mid-scroll

### TYPE & COLOUR
- [ ] 4–6 hexes recover cleanly from the live page, not eight near-golds
- [ ] Display face is Cinzel/Cinzel Decorative — not Inter, Poppins, Montserrat, system-ui
- [ ] Gold appears only where §"Where gold is allowed" permits it
- [ ] Bloom does not eat text legibility at any chapter

### COPY
- [ ] No "elevate", "seamlessly", "unlock the power of"
- [ ] No invented stats, no placeholder logo wall
- [ ] Every themed name carries its plain translation within one glance (`chapters.ts` `plain`)
- [ ] Every heading says something a competitor could not — content lives in `src/data.ts`

### FLOOR — BLOCKING
- [ ] Visible keyboard focus ring on every interactive element, against dark
- [ ] Body contrast ≥ 4.5:1 (`--parchment-dim` on `--ink` is the one to actually measure)
- [ ] Real heading order, alt text present, canvas correctly excluded
- [ ] `prefers-reduced-motion` honoured **including** intro, Lenis, cursor, and scene motion
- [ ] LCP inside budget at 390 on throttled network
- [ ] No WebGL context loss / console errors on a mid-tier phone (`SceneBoundary` fallback actually renders)

---

## The three fastest wins

**CLOSE THE TAB.** Name three things you remember. Fewer than two and the design failed —
no amount of spacing repairs that. For this page there is a harder version: if all three
are visual (wizard, candles, gold), the theme ate the evidence.

**SWAP THE NAME.** Would the page work unchanged for a different engineer? If yes, none of
it is his and none of it is the work.

**ONE CUT PER PASS.** A review that only adds is a wishlist. Nine chapters, a rail, a
cursor, a chat, an intro, scroll cues — every pass names the thing that leaves.

---

## Rank it, or the fix list is noise

**BLOCKING** — floor fails, anything broken at 390, anything that breaks on a phone GPU.
Nothing ships until these clear.

**STRUCTURAL** — chapter order, hierarchy, token drift, theme-vs-evidence balance. Costs a
rebuilt chapter, not a repaint.

**POLISH** — spacing, wording, micro-detail. Real, but never why a page reads as AI.

Three findings maximum. A twelve-item list gets skimmed and nothing structural gets fixed
— which is the one category that changes how the page reads.

---

## Verdict template

```
VERDICT   ship · fix-then-ship · rebuild the hero

1 BLOCKING     what · where (chapter + viewport) · fix · file
2 STRUCTURAL   what · where · fix · file
3 POLISH       what · where · fix · file

CUT           one element, named
RE-SHOOT      1440 / 768 / 390 + the changed chapter
```

Standard judged against: `frontend/.superdesign/design-system.md`
Content source: `src/data.ts` · Chapter order: `src/chapters.ts` · Tokens: `src/styles/global.css`
