# Design plan — tokens

Step 3. Colour, type, layout, signature, motion. No implementation.

Derived from `design-system.md`'s closing direction: this is a **console**, not a
music site. Original arcane instrument room — brass, ink, lens, lamp — with none
of the licensed wizarding vocabulary. Banned throughout: scarlet + gold, green +
silver, navy + gold, navy + neon cyan.

The governing rule, taken from the Vanguard console because it came out of a real
constraint on a real device: **colour always means a reading.** Nothing else is
allowed to be chromatic.

---

## Colour

Six values. Each has one job and is used for nothing else.

| Token | Hex | Job |
|---|---|---|
| **Lampblack** | `#0A0C0B` | Page ground. Carbon black with a green cast, never pure black — pure black beside live readings reads as a dead panel rather than an unlit one. |
| **Plate** | `#151A18` | Instrument housing. Every DOM panel, station body, and HUD surface. The material the console is milled from. |
| **Cyanotype** | `#2F6E8F` | **The only data ink.** Every measured value, bar track, axis, and retrieval rank. Its *density* is the reading — see Signature. |
| **Brass** | `#8A6E3E` | Fixtures only. Bezels, hairline rules, the turret ring, the detent marks. Structure that holds instruments; never information. |
| **Sodium** | `#F2C14E` | The single light source. Focus ring, the station currently in the light path, and the booking control. One lamp in the room. |
| **Iron oxide** | `#A63D2A` | A value outside its limit. Nothing else, ever. Not a brand colour, not a hover, not an underline. |

**Why not the obvious alert red.** Iron oxide is what brass and steel actually do
when they fail — oxidation, not a warning sticker. It sits in the same mineral
family as the fixtures, so a failed reading looks like the instrument corroding
rather than like a notification.

Contrast floor: Cyanotype at full density on Lampblack, and Sodium on Lampblack,
both clear 4.5:1. Cyanotype below roughly 55% density stops being body-legible —
so anything drawn fainter than that is decoration or a bar fill, never text.

---

## Type

Three faces, three jobs, one strict rule for choosing between them.

**The rule.** If a value was *measured*, it is mono. If it is an *argument*, it is
the body face. If it is an *identity marker*, it is the display face. No element
does double duty.

### 1. Display — Bodoni Moda (variable)

High-contrast engraved letterforms, the vernacular of a scale etched into a brass
plate. **Used exactly twice on the whole page**: the wordmark and the booking
control. That is the restraint — a display face that appears twice is a signature;
one that appears eleven times is a theme.

Set at optical sizes only, wide tracking, never below 24px, never in a paragraph.

### 2. Body — Archivo (variable)

A sturdy grotesque that holds up at 15–19px over long measures. It carries every
argument on the page: the constraint paragraph, the failure paragraph, the "said
plainly" block, the About. Deliberately not Inter — Inter is the default any brief
would produce, and Archivo's slightly narrower, squarer forms sit better against
the mono without competing with it.

### 3. Utility / data — IBM Plex Mono

Half this page's content is latencies, thresholds, model ids, commit counts and
match scores. **That data is set as data.** Plex Mono has tabular figures, an
instrument lineage that is real rather than borrowed, and a lowercase that stays
readable in prose when a model id appears mid-sentence.

It carries two textures:

- **Figures.** Large tabular numerals — `10,291`, `0.45`, `93.0%`, `140s`.
- **Micro-labels.** 10px, uppercase, tracked 1.5–2px. The strongest recurring
  texture on the page, and the one device inherited directly from the Mola Zone
  reading.

### Scale

| Step | Size | Face | Use |
|---|---|---|---|
| Micro | 10px / +2px tracking | Mono, uppercase | Eyebrows, axis labels, source citations |
| Caption | 12px | Mono | Stat-row labels, control hints |
| Body | 16px | Archivo | Prose |
| Lead | 19px | Archivo | Positioning line, station opening sentence |
| Figure | 44px | Mono | The number in a stats cell |
| Headline | 56px | Mono | Station headlines — because every station headline *is* a number |
| Wordmark | 28px / +6px tracking | Bodoni Moda | Twice only |

---

## Layout

### Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│ MOEEZ AHMAD KHAN                          ⌐ ¬ read as text  ⌐ ¬ book │  ← reticle HUD, fixed
│                                           ∟ ┘              ∟ ┘       │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   I ship models that get measured,          ┌─────────────────────┐  │
│   not demoed.                               │                     │  │
│                                             │   [ canvas ]        │  │
│   A face pipeline that publishes why it     │                     │  │
│   rejected 74% of what it saw. A clinical   │   turret, station   │  │
│   assistant graded on 214 prompts, with     │   in light path     │  │
│   22 criticals still open.                  │                     │  │
│                                             └─────────────────────┘  │
│   ⌐ book a 30-minute call ¬                                          │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────┐  ┌────────────────────────┐  │
│  │ ARGUMENT PLANE — DOM, fixed depth  │  │  INSTRUMENT — canvas   │  │
│  │                                    │  │                        │  │
│  │ 0.45 ─ EDGE VISION ─ SOLO          │  │   gauge bars against   │  │
│  │                                    │  │   limits, funnel       │  │
│  │ 10,291 faces seen.                 │  │   narrowing            │  │
│  │ 2,676 good enough to trust.        │  │                        │  │
│  │                                    │  │   ▓▓▓▓▓▓▓░░░  26.0%    │  │
│  │ [prose]                            │  │                        │  │
│  │                                    │  │   ← drag the limit     │  │
│  │ THE CONSTRAINT   [prose]           │  │                        │  │
│  │ WHAT WENT WRONG  [prose]           │  └────────────────────────┘  │
│  │ SAID PLAINLY     [prose]           │                              │
│  │                                    │  ┌────────────────────────┐  │
│  │  4    512    0.45    26.0%         │  │ INDEX — fixed rail     │  │
│  │  ─────────────────────────         │  │                        │  │
│  │  ⌐ open the rejection detail ¬     │  │ ● 0.45   vanguard      │  │
│  └────────────────────────────────────┘  │ ○ 93.0%  sumero        │  │
│                                          │ ○ 140s   pawlyse       │  │
│         … stations 2, 3, 4 repeat …      │ ○ 11×w   nexis         │  │
│                                          │ ─────────────────────  │  │
│                                          │ ⌐ book a call ¬        │  │
│                                          └────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│  BOOK 30 MINUTES.        remote only · reply within one working day  │
│  ⌐ book ¬  ⌐ email ¬  ⌐ github ¬  ⌐ linkedin ¬  ⌐ cv ¬               │
└──────────────────────────────────────────────────────────────────────┘
```

**Fast lane, desktop.** Two routes, both permanent:

1. **The index rail** — fixed, right column, always on screen. Four stations
   labelled by their own governing threshold, plus the booking control. One click
   to any station; one click to the call. Never scrolls away.
2. **`read as text`** — top-right, always visible. Drops the canvas entirely and
   renders the whole page as a single document: positioning line, four case
   studies, About, contact. This is the route for the recruiter with eleven tabs
   and the one for a locked-down work browser. It is not a degraded mode; it is
   the same words at the same weight.

### Mobile

```
┌───────────────────────────┐
│ MOEEZ AHMAD KHAN     ≡    │  ← ≡ opens: 4 stations + read as text
├───────────────────────────┤
│                           │
│  I ship models that get   │
│  measured, not demoed.    │
│                           │
│  A face pipeline that     │
│  publishes why it         │
│  rejected 74% of what     │
│  it saw. …                │
│                           │
│ ┌───────────────────────┐ │
│ │  [ canvas — 1 station ]│ │  ← one instrument, viewport-height,
│ │   in light path        │ │    never taller than 60vh
│ └───────────────────────┘ │
├───────────────────────────┤
│ 0.45 ─ EDGE VISION ─ SOLO │
│                           │
│ 10,291 faces seen.        │
│ 2,676 good enough         │
│ to trust.                 │
│                           │
│ [prose]                   │
│                           │
│ THE CONSTRAINT            │
│ [prose]                   │
│                           │
│ WHAT WENT WRONG           │
│ [prose]                   │
│                           │
│ SAID PLAINLY              │
│ [prose]                   │
│                           │
│  4      512               │
│  0.45   26.0%             │
│  ⌐ open the detail ¬      │
├───────────────────────────┤
│   … stations 2, 3, 4 …    │
├───────────────────────────┤
│  BOOK 30 MINUTES.         │
│  remote only · reply      │
│  within one working day   │
├───────────────────────────┤
│ ⌐ book a 30-minute call ¬ │  ← sticky, always docked
└───────────────────────────┘
```

**Fast lane, mobile.** The booking control is docked to the bottom of the
viewport from first paint and never leaves. `read as text` sits in the `≡` sheet
alongside the four station jumps. On mobile the canvas is capped at 60vh and
carries one station at a time — the argument plane is the page, and the
instrument is an inset within it.

**Load order, both breakpoints.** Positioning line, station headlines and the
booking control are HTML on first paint. The canvas initialises after. If WebGL
never starts, nothing above is missing.

---

## Signature

**The exposure bar** — every measured value on the page is drawn in cyanotype ink
whose density *is* its own confidence, the way a cyanotype print darkens with
exposure, so a 0.93 match renders visibly denser than a 0.45 one and any number
the site never actually measured renders as a bare unfilled outline you can spot
from across the room.

That last clause is the page. The 88.8% that is only "the share that cleared a
threshold" draws as an outline. So does Nexis's two-minute runtime. So does every
Vanguard latency, because none was ever instrumented. A visitor scanning the page
sees which claims are filled and which are hollow before reading a word — and the
hollow ones are on the page voluntarily.

---

## Motion

**One orchestrated moment: "Exposure."**

On first paint, every figure on the screen is present as a bare cyanotype outline.
Over roughly 900ms, ink floods each one to its own confidence density — different
numbers arriving at different depths, in a single staggered wash, the way a print
develops. Measured values fill. Unmeasured ones stay outline and stop.

**What it means.** The page states its thesis before the reader has read a
sentence: these numbers were measured, those were not, and I am showing you both.
It is the site performing its own honesty rather than claiming it.

**What it deliberately is not.** No count-up. Numbers do not tick from zero — a
tick-up is the single most generic data motion available and it says nothing about
the value, only that it is a number. Density says something true.

Everything else is quiet: the turret rotates on scroll with no easing flourish,
controls have a 120ms state change, and there is no ambient drift. One moment, once
per visit, then stillness.

`prefers-reduced-motion` renders the final state — every value at its correct
density, outlines still hollow. Nothing is lost, because the meaning is in the end
state, not the transition.

---

# Interrogation, round 1

*Which of this would I have produced for any "magical 3D portfolio" brief?*

### 1. Brass + candle-yellow + lampblack as atmosphere

**Before:** Brass bezels, candle-yellow glow and black ground carrying the mood —
the palette any "arcane instrument room" prompt produces, including one aimed at a
brief with no numbers in it at all.

**After:** Brass and Sodium demoted to *fixtures* — brass touches only the turret
ring, the detents and the hairlines; sodium is one lamp, appearing on the focus
ring, the active station and the booking control and nowhere else. The working
colour of the page becomes Cyanotype, and it is the only ink allowed to carry a
value.

**Why:** the atmosphere version decorates. The fixture version obeys the rule that
colour always means a reading, so brass reads as "structure," sodium as "here,"
and cyanotype as "measurement." A visitor learns the code in two seconds without
a legend.

### 2. Roman numerals on the four stations

**Before:** `I · II · III · IV` in the display face — orrery-flavoured, and the
move I would make for any four-part magical scroll.

**After:** Each station is labelled by **its own governing threshold**:
`0.45` Vanguard · `93.0%` Sumero · `140s` Pawlyse · `11×w` Nexis.

**Why:** numbering that carries no information is decoration wearing a structural
costume. A threshold as a label is true, unique to the system it names, and
teaches the visitor what that station is about before they arrive. It also makes
the index rail readable as an instrument panel rather than a table of contents.

### 3. Ambient rotation of the platform

**Before:** The world rotates smoothly and continuously with scroll — the default
"rotating 3D portfolio" motion, and the same thing an album site does.

**After:** The turret **detents**. It moves continuously while scrolling but seats
with a discrete click into four fixed positions, exactly like a filter wheel
seating a lens into a light path. Between detents nothing is in focus; on a detent,
one instrument is lit by the single sodium lamp and its argument plane is legible.

**Why:** continuous rotation says "look at my world." Detents say "one specimen is
under examination at a time," which is the posture the brief's page job needs, and
it makes scroll position self-correcting instead of approximate.

---

# Interrogation, round 2

*Go deeper. What survived round 1 that is still a designer's default rather than
this brief's material?*

### 4. Cyanotype itself

**Before:** "Cyanotype blueprint blue" — the reflexive palette for anything
technical. Blueprints are *drawings*. This brief's material world is bounding
boxes, embedding clusters, agent traces and retrieval ranks. None of those are
drawings, and picking blue because engineering is blue would be exactly the
default the plan is supposed to avoid.

**After:** Cyanotype stays, but bound to a mechanic instead of a mood. A cyanotype
darkens in proportion to exposure. A match score, a retrieval rank and a
confidence band are all magnitudes between 0 and 1. **Density = confidence** makes
the pigment's physical behaviour isomorphic to the data, so the choice is
load-bearing: remove the blue and you lose the encoding, not the vibe.

**Why:** this is the difference between a palette that suits the subject and one
that *is* the subject. It also generates the Signature and the Motion for free,
which is the test of a real system.

### 5. The display face carrying the hero

**Before:** Bodoni Moda setting the wordmark, the positioning line and four
station numerals — "characterful display used with restraint," where restraint
still means six or seven appearances. Every instrument-room brief lands here.

**After:** Bodoni appears **twice**: wordmark and booking control. The positioning
line moves to Archivo at 19px lead. **Every station headline moves to Plex Mono at
56px** — because every station headline is a number: `10,291 faces seen. 2,676
good enough to trust.` `214 prompts graded. 22 criticals still open.` `Ten model
calls, 140 seconds, six citations.`

**Why:** the page's real display type is its data. Setting headlines in the mono
collapses the hierarchy in a way that is true rather than clever — the figures are
the argument, so the figures get the size. And a display face used exactly twice
is a mark; used seven times it is a mood board.

### 6. The sticky booking pill

**Before:** A rounded pill labelled "Book a call," bottom-right, drop shadow. The
SaaS default, and it would look identical on a page about anything.

**After:** The persistent controls are drawn as **reticle brackets** — `⌐ book a
30-minute call ¬` — corner marks with the middle open, no fill, no shadow, 1px
brass. This is Vanguard's own output: the pipeline draws a bracket around every
face it finds, and the brief names the region-of-interest reticle as the product's
mark.

**Why:** the one persistent element on the page is drawn in the visual language of
the work the page is about. A visitor who reaches the Vanguard station recognises
the shape they have been clicking since the hero, which is the cheapest and most
durable kind of coherence. It also kills the pill, the shadow and the radius in
one move — nothing here is rounded and friendly, because instruments are not.

### 7. "Drag the threshold" as a widget

**Before:** An interactive slider on the Vanguard station, sitting in a card,
looking like a settings control. Interactive-demo-shaped.

**After:** The draggable element **is the limit line on the gauge itself** — the
tick mark that the bar is measured against. Dragging it recomputes the funnel from
the same arithmetic the pipeline uses: widen it and the survivor count rises while
more survivors are wrong; tighten it and the count collapses. Reset returns to
`0.45`, the value actually shipped.

**Why:** a slider in a card is a control panel bolted onto a diagram. Moving the
limit line is the operator's real gesture, and the Vanguard brief calls that exact
loop — model behaviour made legible and tunable by a non-engineer — the actual
engineering achievement. The interaction should be the thing being claimed.

---

## What is left to decide in Step 4

Numeric budgets, the fallback contract, and the stack call. Nothing above assumes
a framework, and the argument plane is deliberately specified as DOM at a fixed
depth so it can be rendered and read with no canvas at all.
