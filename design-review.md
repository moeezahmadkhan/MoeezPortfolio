# Design review — moeezahmadkhan.com

Judge the page like you didn't build it.
One pass, three viewports, one verdict. The screenshots supply the evidence; re-reading
`site/index.html` supplies only the page you meant to ship.

Re-shoot after every fix. A fix is unproven until it is photographed.

> The earlier version of this file, `frontend/docs/design-review.md` in the old repo,
> reviews the wizard site — `Sections.tsx`, nine chapters, R3F, licensed-IP risk. That
> site is archived at tag `v1-wizard-site`. None of its files exist here. This is the
> review for what actually ships.

---

## STEP 0 — THE ASK · bigger lever than any checklist

Not: "review my portfolio."

> Review moeezahmadkhan.com against `design-tokens.md` and `build-plan.md`.
> **Page job:** an engineering lead who has never heard of Moeez decides in under
> 60 seconds that he ships measured systems, then books at cal.com or takes the CV.
> Judge it at **390px first**. Return three findings, ranked, each with the fix and
> the file. Then tell me what to cut.

`artifact + page job + standard + hardest viewport + verdict you want`

### The tension unique to this site

The old site's risk was licensed IP. This one's risk is the opposite and harder: the
page's entire claim is **"I ship models that get measured, not demoed."** It publishes
its own failures — 22 criticals open, Nexis reaching zero users, a figure marked
*approximate, I never instrumented it*. Every review must answer one question before
any other:

**Is every number on this page still traceable to `content/evidence-ledger.md`, and is
every bar still arithmetic?**

A decorative bar, a rounded-up figure, or a claim that has drifted from the ledger does
not cost polish here — it costs the only thing the page is selling. A visitor who
catches one invented number has correctly concluded the rest are invented too.

The second tension: **the instrument must not out-argue the text.** The turret is an
enhancement over a page that is complete without it. If a reading exists only inside
the canvas, the no-JS visitor, the screen reader and the crawler all lose it.

---

## 1 · Re-state the job

Write the job down before looking again. A review without a target is taste, and taste
argues forever.

- Audience: engineering leads, technical founders, recruiters at AI product companies.
  Remote-first. Not other 3D developers.
- Success: a cal.com booking. Second: CV download or email. Nothing else counts.
- Four stations (`site/index.html`, `#vanguard #sumero #pawlyse #nexis`). Each must
  justify its scroll cost against that job. Vanguard and Sumero carry the strongest
  numbers; Nexis is the one that admits a failure, and it earns its place by doing so.
- The turret (`site/src/scene/turret.js`) is atmosphere **and** argument: every bar is
  scaled by a number that also appears as text. It has no other licence to exist.

## 2 · Shoot before you judge

Judge the production build, never the dev server. Chunk splitting, the no-JS path and
the lazy three import only exist after `vite build`.

```bash
cd site
npm run verify          # build + gates + the whole Playwright suite
npx playwright test tests/screens.spec.js
```

`tests/screens.spec.js` writes the state set to `test-results/screens/<project>/` and
attaches each shot to the report. Projects are `desktop` (1440×900) and `mobile`
(Pixel 7); the spec resizes once to 768 itself.

| Shot | What it proves |
| --- | --- |
| `before-scene` | the static instrument, complete, with the three chunk held back mid-flight |
| `stage` | the turret at rest — framing, fog, which station is lit |
| `mid-rotation` | the transit. A frame that reads as clipping or as a dead panel is a fail |
| `foot-of-page` | the contact block, and that the loop paused off screen |
| `fallback` | the text path after "Read as text" — the state every declined visitor gets |
| `stage-768` | the breakpoint where the stage stops sitting beside the hero |

Shoot two more by hand, because no test asserts how they *look*:

- `prefers-reduced-motion: reduce` — the turret must hold a composed still at a detent,
  never a frozen mid-tumble.
- `javaScriptEnabled: false` at 390 — the page every crawler and locked-down laptop gets.

**Framing is measured, not eyeballed.** The scene exposes three readbacks for exactly
this, and they are cheaper and more honest than looking:

```js
canvas.getRenderStats()   // draw calls, triangles, geometries, textures
canvas.captureFrame()     // lit pixels, coverage, distinct tones, checksum, bounding box
canvas.readInstrument()   // per station: bar ratios drawn, ratios declared, which is lit
```

If `captureFrame().bounds` touches column 0 or column `width - 1`, the ring is being
cropped by the canvas rather than receding into fog. That is a framing bug, not a
lighting one, and `tests/webgl-proof.spec.js` fails on it.

## 3 · Read the images back — the one people skip

Feed the screenshots in **as images**, not as a description of them. Text-only
self-review agrees with itself every time and misses everything that only exists
visually — a caption set over the bar it describes, a station clipped against the frame,
a fill that has drifted a shade off cyanotype.

## 4 · Score the tells — binary. No partial credit

Pass or fail, never "mostly fine". Every fail names a coordinate: which station, which
viewport, which file.

## 5 · Extract the system back out, and diff it

Recover the palette from the live page and diff it against `design-tokens.md`.

**Known drift, already on the record.** Do not re-discover these:

| Doc said | Ships as | Standing |
| --- | --- | --- |
| Iron oxide `#A63D2A` | `#C04A34` | **closed.** `#A63D2A` reached only 2.79:1 on plate, under the 3:1 floor for a bar fill. The doc now carries the shipped value and the reason |
| Six hexes restated in `turret.js` | scene reads the custom properties | **closed.** One source of truth, asserted by `tests/webgl-proof.spec.js` |
| "Six values, each with one job" | plus `--cyanotype-lift`, `--brass-text` | **open, accepted.** Contrast lifts of the same two metals, justified in-code. They are the seventh and eighth, and a ninth is a finding |
| Stack: React Three Fiber + drei (`build-plan.md` §5) | vanilla three, no React | **closed.** The plan now records what shipped and why |

The check that matters is whether *new* drift has appeared since. Recover the palette
from the live page and diff it against the table above.

The governing rule to test every new colour against: **colour always means a reading.**
Cyanotype is the only data ink, brass is fixtures and never information, sodium is the
one lamp, iron oxide is a value outside its limit and nothing else. A chromatic pixel
that is not one of those four things is the finding.

## 6 · Re-check the CSS is from this decade

Shipping and working is not the same as current. On this page specifically:

- `@layer` ordering in `main.css` — a later fix appended outside its layer silently wins.
- `.stage { aspect-ratio: 4/3 }` reserving the canvas box. This is the whole reason CLS
  stays at zero when the turret mounts. Anything that makes stage height content-driven
  breaks it.
- `.defer-paint { content-visibility: auto }` on the stations, and whether
  `contain-intrinsic-size` still matches their real height — if it drifts, the scrollbar
  jumps and `detentFromScroll()` maps to the wrong station.
- `color-mix()` on the index highlight, against the four-value palette rule.

## 7 · Floor check, then the verdict

Floor fails are blocking, not notes. Most of this is already asserted — run it rather
than re-audit it by hand:

```bash
npx playwright test tests/accessibility.spec.js tests/static-path.spec.js
npm run gates
```

What the suite covers: contrast computed from the tokens rather than eyeballed, heading
order, the no-JS path carrying every case study, the canvas excluded from the
accessibility tree, DPR capped, CLS on mount, draw calls and triangles.

What it does **not** cover, so check by hand every pass:

- Keyboard, top to bottom. 19 stops at 390, ending at the CV link. The ring is
  `2px solid var(--sodium)` — confirm it is visible over the *plate*, not just over the
  page ground, because the index rows and the stage are lighter than the ground.
- `prefers-reduced-motion` is honoured in three separate places —
  `html { scroll-behavior }`, the `REDUCED` branch in `turret.js` that snaps to the
  detent, and the smooth `scrollIntoView` on a station click. All three, not one.
- Nothing load-bearing exists only inside the canvas. The turret draws no text at all
  by design; the caption and the index carry every word. Verify that is still true.
- LCP is the positioning line, which is text in the HTML response. Fonts are preloaded.
  If the LCP element ever becomes the canvas, the build order has inverted.

## 8 · Check the renderer, not just the picture

The scene is 500 lines and it is the part most likely to rot silently, because a
renderer that is subtly wrong still renders. Each of these has a way to check it:

| Claim | How to check |
| --- | --- |
| The 3D never lands on the first-load path | `npm run gates` — the entry chunk may not reference three, and some lazy chunk must import the three chunk by name |
| Every bar is the number the prose quotes | `readInstrument()` vs the figures parsed out of the document |
| A zero reading draws nothing, not a sliver | Nexis draws one fill, not three |
| The whole ring is in frame | `captureFrame().bounds` clear of both edges |
| Fog colour is the plate behind the canvas | fogging toward the page ground makes distant stations *darker* than their own background, so they advance as they recede |
| One geometry per shape, one material per colour | `getRenderStats().geometries` — four stations must not multiply it |
| The loop pauses off screen and on a hidden tab | count `requestAnimationFrame` calls while scrolled away |
| Dispose releases everything | the toggle removes canvas, caption and every `aria-current` |
| A lost context leaves a working page | `WEBGL_lose_context`, then the static plate must be visible |
| DPR capped at 2 desktop / 1.5 mobile | `canvas.width / getBoundingClientRect().width` |

Two known non-defects, so nobody re-files them: `powerPreference: 'high-performance'`
can wake a laptop's discrete GPU for a decorative scene, and there is no
`webglcontextrestored` handler — once lost, the visitor stays on the text path for the
session. Both are deliberate.

---

# THE SCORECARD — mark every box

A blank box is a fail.

### FIRST GLANCE
- [ ] Reads as **this** engineer — a specific person with named systems and published failures
- [ ] Three things recalled with the tab closed, and at least one is a *number*
- [ ] Boldness spent in exactly one place (the turret), quiet around it
- [ ] Nothing on screen looks generated

### EVIDENCE — the thing this page lives or dies on
- [ ] Every figure traces to `content/evidence-ledger.md`
- [ ] Every bar in the canvas equals a figure in the DOM — `readInstrument()` agrees with the text
- [ ] Filled vs hollow still means measured vs not measured, and the legend still says so
- [ ] The admissions survive: not measured against a labelled set, no throughput figure,
      approximate, never reached production
- [ ] No number rounded into a claim it cannot support
- [ ] The avatar row is still the *only* decorative element, still below the
      booking control, and still labelled as not a measurement. A second
      decorative thing anywhere on the page is a finding

### STRUCTURE
- [ ] Section spacing encodes hierarchy — the four stations read heavier than the contact block
- [ ] 390px: no horizontal scroll, no heading orphaned from the figure it labels
- [ ] The index rail carries each station's governing threshold, and `aria-current` follows the turret
- [ ] Not every station the same eyebrow-over-figure block
- [ ] No dead frame mid-rotation, and no station clipped against the canvas edge at rest

### TYPE & COLOUR
- [ ] The palette recovers to the four meaning-bearing inks plus their two contrast lifts — not a ninth tint
- [ ] Display is Bodoni Moda, body Archivo, data IBM Plex Mono. Data is set as data
- [ ] Sodium appears only as the lamp: focus, the lit station, the booking control
- [ ] Iron oxide appears only where a value is outside its limit
- [ ] The caption band never sits over a reading at any width

### COPY
- [ ] No "elevate", "seamlessly", "leverage", "unlock the power of"
- [ ] No invented stats, no logo wall, no skill bars
- [ ] Every station name carries its plain translation within one glance
- [ ] Every heading says something a competitor could not

### FLOOR — BLOCKING
- [ ] Visible focus ring on all 19 stops, against plate as well as ground
- [ ] Body contrast ≥ 4.5:1, measured from the tokens
- [ ] Real heading order, canvas correctly excluded, caption is a live region
- [ ] `prefers-reduced-motion` honoured in all three places
- [ ] `npm run gates` green — entry ≤150KB, three chunk ≤200KB, first view ≤1.5MB, build ≤6MB
- [ ] No console errors, and the context-loss path actually renders the static plate

---

## The three fastest wins

**CLOSE THE TAB.** Name three things you remember. Fewer than two and the design failed.
The harder version for this page: if none of the three is a *number*, the instrument ate
the evidence and the whole thesis inverted.

**SWAP THE NAME.** Would the page work unchanged for a different engineer? Here the test
is sharper than usual — the numbers are his, so if the page still reads fine with them
removed, they are not doing the work they are supposed to be doing.

**ONE CUT PER PASS.** A review that only adds is a wishlist. Four stations, a turret, an
index rail, a text toggle, three CTAs in the hero — every pass names the thing that
leaves.

---

## Rank it, or the fix list is noise

**BLOCKING** — floor fails, anything broken at 390, anything that breaks on a phone GPU,
and any number that no longer traces to the ledger. Nothing ships until these clear.

**STRUCTURAL** — station order, hierarchy, token drift, instrument-versus-evidence
balance. Costs a rebuilt station, not a repaint.

**POLISH** — spacing, wording, micro-detail. Real, but never why a page reads as
generated.

Three findings maximum. A twelve-item list gets skimmed and nothing structural gets
fixed — which is the one category that changes how the page reads.

---

## Verdict template

```
VERDICT   ship · fix-then-ship · rebuild the stage

1 BLOCKING     what · where (station + viewport) · proof · fix · file
2 STRUCTURAL   what · where · proof · fix · file
3 POLISH       what · where · proof · fix · file

CUT           one element, named
RE-SHOOT      1440 / 768 / 390 + the changed station
```

**Proof is not optional in this template.** Every finding names the measurement that
produced it — a pixel tally, a bounding box, a contrast ratio, a gate number, a failing
test. This page argues that claims need evidence; a review of it that runs on taste
alone has not read its own subject.

---

Standard judged against: `design-tokens.md` · `design-system.md` · `build-plan.md`
Content source: `content/copy.md` · Figures: `content/evidence-ledger.md`
Markup: `site/index.html` · Tokens: `site/src/styles/main.css`
Enhancement: `site/src/enhance.js` · Scene: `site/src/scene/turret.js`
Gates: `site/scripts/gates.mjs` · Tests: `site/tests/`
Figures: `site/tools/` — `npm run figures` re-renders the portraits and the
social card from `site/tools/models/*.glb`. The models and their Draco and
Basis decoders never reach the build; only the images do.
