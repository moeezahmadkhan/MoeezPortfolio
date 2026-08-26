# The Wizard's Archive — design system

Version 2.0, 2026-08-27. Supersedes the ad-hoc tokens in `src/styles/global.css`.

**Lineage:** structure, typographic scale, chrome density and motion grammar are
adapted from mola-zone.com (see `website/mola-zone.com/design.md`). Palette identity
is this project's own. The fold is **inspired-by**: mola's discipline, our hue.

**The one rule that governs everything below:** the 3D scene is the artwork; the HTML
is a HUD. Every time HTML competes with the canvas, the HTML loses. mola proves this —
its largest type on the entire page is 16px.

---

## 1. Colour

Achromatic chrome, gold reserved for magic.

### Base channels

```css
--ink-rgb:       7, 7, 13;        /* #07070d — the void behind everything */
--parchment-rgb: 236, 226, 207;   /* #ece2cf — ink ON the void */
--gold-rgb:      231, 194, 125;   /* #e7c27d — ritual accent, rationed */
```

### The opacity ladder (mola's `--c-primary-*`, our hue)

Tone is opacity, never a new hex. Seven steps, no exceptions:

```css
--ink-25 … --ink-100:        rgb(var(--ink-rgb) / .25 … 1)
--parchment-25:  rgb(var(--parchment-rgb) / .25)   /* hairlines, disabled */
--parchment-40:  … / .40                            /* micro-legal, footer */
--parchment-50:  … / .50                            /* inactive nav */
--parchment-70:  … / .70   ← DEFAULT TEXT COLOUR
--parchment-90:  … / .90                            /* headings */
--parchment-100: … / 1                              /* rare emphasis */
--gold-40 / --gold-70 / --gold-100
```

Body text is **70%**, not 100%. That single decision is most of why mola reads
expensive. Full-strength parchment is an emphasis tool, not a default.

### Where gold is allowed

Gold appears in exactly six places. Anywhere else is a bug:

1. POI sigils in the hub (idle `--gold-70`, hover `--gold-100`)
2. The active nav item / current chapter marker
3. The wand cursor and its sparks
4. Focus rings (`outline: 1px solid var(--gold-100)`)
5. Inline links inside body copy (underline only, `--gold-70`)
6. Anything emissive inside the WebGL scene — bloom, candlelight, wand tip

Retired from the DOM: `--ember`, `--rune`, all gold gradients, all gold glows on
panels/cards, `--gold-bright`, `--gold-deep`. They stay in `three.js` material code
where literal colours are required.

### Surfaces

```css
--surface-void:    #07070d;   /* page + hub */
--surface-panel:   #0b0b12;   /* overlay panels, one step off the void */
--surface-invert:  #ece2cf;   /* rare inverted block: CV, final CTA */
--hairline:        rgb(var(--parchment-rgb) / .25);   /* every border, 1px */
```

There are no filled cards. Structure is drawn with hairlines and space.

---

## 2. Typography

### Families (unchanged, re-roled)

```css
--font-display: 'Cinzel', serif;              /* chapter titles ONLY */
--font-body:    'Cormorant Garamond', serif;  /* reading copy ONLY */
--font-hud:     'JetBrains Mono', monospace;  /* ALL chrome, labels, numerals */
```

`Cinzel Decorative` is dropped. The HUD font does the work Kern does on mola —
nav, POI labels, eyebrows, buttons, footer, metadata, roman numerals.

### Scale

Two scales, and knowing which one you are in is the whole skill.

**HUD scale** — anything that is interface. Ceiling is 16px, like mola.

| token | size / weight / case / tracking | use |
|---|---|---|
| `--t-micro` | 9px / 400 / none / .18px | legal, timestamps |
| `--t-label` | **10px / 700 / uppercase / 1.5px** | nav, POI, buttons, eyebrows |
| `--t-meta` | 12px / 500 / uppercase / .66px | tags, chapter numerals |
| `--t-hud` | 13px / 400 / none / normal | HUD body, captions |
| `--t-hud-lg` | 16px / 700 / uppercase / 1px | the one loud HUD line (`ENTER THE ARCHIVE`) |

**Reading scale** — only inside an opened chapter, where copy must actually be read.

| token | value | use |
|---|---|---|
| `--t-body` | 17px / 400 / 1.65 line-height, `--font-body` | paragraphs, max 62ch |
| `--t-lead` | 21px / 400 / 1.5 | chapter opener paragraph |
| `--t-title` | `clamp(28px, 4vw, 44px)` / 500 / 2px tracking, `--font-display` | chapter title |

The hub has **no reading-scale type at all**. Nothing above 16px lives over the world.

### Rules

- Every uppercase run is tracked. Never set uppercase at `letter-spacing: normal`.
- Never track lowercase body copy.
- One title per view. If two things look like titles, one is wrong.
- Numerals are roman, HUD font, `--t-meta`: `IV · THE PACT`.

---

## 3. Shape & space

```css
--r-none: 0;      /* default — borders, panels, inputs, cards */
--r-pill: 999px;  /* controls only: transport, language, back pill */
```

mola: radius 0 on 448 of 465 elements. Match that ratio. Retire `--r-sharp`,
`--r-base`, `--r-soft` — a 2px radius is a decision nobody can defend.

Spacing is a 4px grid: `4 8 12 16 24 32 48 64 96 128`. Chrome uses 8/12/16;
reading layouts use 24/32/48; chapter rhythm uses 64/96/128.

```css
--chrome-top:    24px;   /* hairline bar. mola's is 23px. */
--chrome-bottom: 56px;   /* fixed footer */
--gutter:        clamp(16px, 4vw, 48px);
--measure:       62ch;   /* hard cap on any paragraph */
```

---

## 4. Motion

```css
--ease-quart:  cubic-bezier(.77, 0, .175, 1);   /* camera flights, panels */
--ease-out:    cubic-bezier(.165, .84, .44, 1); /* entrances */
--ease-in:     cubic-bezier(.895, .03, .685, .22);
--ease-simple: cubic-bezier(.4, 0, .2, 1);      /* colour, opacity */

--d-instant: 150ms;  /* opacity, hover */
--d-quick:   250ms;  /* transform + opacity pairs */
--d-move:    500ms;  /* panel slides */
--d-flight: 1100ms;  /* hub → chapter camera flight, --ease-quart */
```

Rules:
- **Never `transition: all`.** Name the properties. mola names every one.
- Animate `opacity`, `transform`, `filter`, and custom properties. Nothing else.
- Reveal-on-scroll is a 12px rise + fade over `--d-quick`. No blur, no scale, no rotate.
- `prefers-reduced-motion`: camera flights become 200ms cuts, reveals become instant,
  ambient float continues (it is atmosphere, not information).

---

## 5. Components

### Top bar — `.archiveBar`
24px tall, `position: fixed`, hairline bottom border, no background (the world shows
through). Left: sigil mark + `MOEEZ AHMAD KHAN` at `--t-label`. Centre: nothing.
Right: `HALL AMBIENCE — OFF` transport (pill, `--t-label`) + `MENU`.
Active chapter gets a 1px gold underline, `--gold-100`.

### Footer — `.archiveFooter`
56px, fixed, `--t-micro` at `--parchment-40`. Left: `© 2026 · BUILT WITH THREE.JS`.
Right: GitHub · LinkedIn · Email, 16px icons, `currentColor`, hairline hover.

### POI sigil — `.poiSigil`
44×44 hit target, HTML anchored to a 3D position, projected each frame.
- Idle: 9px gold ring, `--gold-70`, slow 4s breathe (opacity .7 → 1).
- Hover: ring expands to 14px over `--d-quick`, label fades in beside it at
  `--t-label`, `--parchment-100`.
- Off-screen: `width: 0` (mola's approach) — never unmounted, never a layout shift.
- Depth: sigils behind other geometry drop to `--gold-40` and stop breathing.
- Focusable, `role="link"`, keyboard-reachable in reading order.

### Zone prompt — `.zonePrompt`
Fullscreen, centred, non-interactive layer for the single entry instruction.
`--t-hud-lg`, `--parchment-70`. One instruction, ever: `SCROLL TO EXPLORE`.
Fades out permanently on first input.

### Chapter panel — `.chapterPanel`
Slides over the live world from the bottom, `--surface-panel` at 96% with a
`backdrop-filter: blur(12px)`, hairline top border, `--d-move --ease-quart`.
The canvas keeps rendering behind it. Header: `IV · THE PACT` (`--t-meta`) and a
`← THE HALL` pill on the left. Reading copy capped at `--measure`.

### Button — `.spellBtn`
Hairline box, radius 0, `--t-label`, 12px 20px padding, transparent background.
Hover: border → `--gold-70`, text → `--parchment-100`. No fill, no shadow, no glow.
Primary CTA differs by border weight and gold, never by a filled slab.

### Input — `.owlField`
Bottom border only, `--hairline`, radius 0, `--font-body` at `--t-body`.
Focus: border → `--gold-70`. Label above at `--t-label`.

---

## 6. Layout archetypes

**Hub** — no document scroll. Fixed canvas + POI layer + chrome. Wheel/drag drives the
camera, never the document.

**Chapter** — the world stays live behind; a local scroll timeline runs 0→1 within this
chapter, driving both the camera's entry→hold flight and the section choreography.
Copy sits in a single 62ch column, gutter-aligned, never centred.

**Overlay post** — CV, a project case, the ambience credits: a panel, not a page.

---

## 7. Anti-patterns (all currently present in the codebase)

1. Gold gradients on panels and cards. Gold is light, not paint.
2. Text glow / `text-shadow` on headings. Bloom belongs in the 3D scene.
3. Serif set in uppercase at small sizes for labels — that is the HUD font's job.
4. More than one accent hue on screen (gold + ember + teal together).
5. 40px+ HTML headings over the canvas. Ceiling over the world is 16px.
6. `transition: all`.
7. Radii between 1px and 10px.
8. Filled card backgrounds where a hairline would do.
