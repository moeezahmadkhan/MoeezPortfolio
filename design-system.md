# Design system — analysis, not a template

Step 2 of the rebuild. This reads Mola Zone (`mola-zone.com/en`, the Yamê album
site) for what it is *doing*, then asks what the equivalent move is for a page
whose only job is booking a 30-minute call with an AI/ML engineer.

Nothing here is a spec to copy. Where a Mola Zone decision translates, the
translation is written out. Where it does not, it is listed under
[What not to copy](#what-not-to-copy).

---

## How this was extracted, and what is missing

The Superdesign CLI extractor returned empty twice — the site is a Nuxt shell
around a single WebGL canvas, and there is almost no DOM for a static extractor
to read. So the site was loaded in a real browser and interrogated directly:
computed styles across every text node, the font-face rules, the accessibility
tree, and the console.

**Limit worth stating.** Two of the site's own JavaScript chunks returned 503
during the visit, so the loader stalled and the 3D world never rendered. The
palette, type system, DOM architecture and navigation model below are measured
from the live page. The *world* — biomes, collectibles, the mini-game — is read
from the brief and from the loader frame, not from first-hand observation. Any
claim about how the world behaves is inference and is marked as such.

---

## The measured DNA

### Palette — two values and a warning light

| Role | Value | Where |
|---|---|---|
| Ground | `#000000` | `body` background |
| Ink | `#ffffff` | 71 text nodes — the dominant text colour |
| Near-black panel | `#0b0b0c` | 17 nodes — panels that sit *on* the ground without being it |
| Warm paper | `#f0edeb` | 17 backgrounds — the inverted surface |
| One cool tint | `rgb(199, 216, 235)` | exactly 1 node |

Pure black and pure white, one near-black for panel separation, one warm
off-white for inverted surfaces, and a single cool tint used **once** on the
entire page.

The discipline is the point: this is a two-ink press. The artwork carries all
visual load through line density — hatching, stipple, dot rules — and colour is
withheld almost entirely. When one tint does appear, it means something.

### Type — one family, seven sizes, none of them large

Self-hosted variable `Kern` (100–900), used at 400 / 500 / 700. No serif. No
monospace. Every DOM text size on the page:

```
9px · 10px · 11px · 12px · 13px · 16px · 19px
```

**The largest DOM text on an award-shortlist music site is 19 pixels.** All the
display type lives inside the canvas, drawn as artwork. The DOM is a HUD.

The texture is in the tracking, not the size:

| Weight | Size | Tracking | Transform |
|---|---|---|---|
| 700 | 10px | 0.44 – 1.5px | uppercase |
| 500 | 12px | 4% | uppercase |
| 400 | 11px | 0.44px | uppercase |
| 400 | 12px | 2px | uppercase |

Small, bold, uppercase, widely tracked. That letterspaced micro-label is the
single strongest recurring texture in the interface — and it is exactly the same
device the Vanguard console already uses for its own micro-labels, which is a
useful coincidence rather than a reason to copy.

### Architecture — 465 DOM nodes and one canvas

The entire experience is one `<canvas>`. The DOM holds a header (audio toggle,
three links), an audio status readout, a loader percentage, and a footer
(copyright, two legal PDFs, three social icons, EN/FR). That is the whole page.

**The DOM is the instrument panel around the world, never the world itself.**
Everything expressive is rendered; everything operable is DOM. That separation is
the most portable idea on the site and it survives translation completely.

### Sound is a first-class control

The header's first element is `Play`, and a persistent readout shows `Now
Playing` with an `ON` state. Audio is not decoration bolted on — it has the most
prominent control on the page.

---

## The five mechanics

For each: what it accomplishes, why it works for an album site, and what the
equivalent move is for a portfolio that has to produce a booked call.

### 1. Rotating platform — the world turns, the viewer does not

**What it accomplishes.** It removes navigation as a decision. There is no map,
no menu of destinations, no wondering what you have missed. Scroll is a single
one-dimensional control over a world that has been arranged in a fixed order, and
the viewer is always correctly framed because the camera never had to be aimed.
It also makes the content set feel finite and knowable — a turntable has an end,
and you can feel yourself approaching it.

**Why it works for an album.** An album is an ordered, closed set. Track 1
through track N, meant in that sequence. A rotating platform is that shape made
spatial: the medium and the metaphor agree, so the interaction teaches you the
structure without a word of explanation.

**The equivalent move.** Your evidence set is also ordered and closed — four
systems, in a deliberate sequence, ending on the weakest attribution. So keep the
rotation, but change what it means. On an album site the rotation is a
*turntable*. On your page it should read as an **instrument being indexed** — a
carousel of specimens rotating into an inspection position, the way a microscope
turret or a filter wheel clicks a lens into the light path. Same mechanic, and it
earns the same "there are four of these and I am on the second" legibility, but
the metaphor now says *examination* rather than *playback*, which is the mode the
page needs the visitor in.

One hard requirement the album site does not have: **scroll must never trap the
reader.** Mola Zone can afford to make you travel through the world to reach
something, because travelling *is* the product. Your visitor has many tabs open
and one question — is this person worth 30 minutes. Rotation must always be
skippable, and the CTA must be reachable without completing the tour.

### 2. World scrolls past the viewer — motion belongs to the content

**What it accomplishes.** The viewer is stationary and the world moves. This is
subtly different from flying a camera through a scene: it makes the visitor an
observer rather than a traveller, so nothing is ever behind them and there is no
spatial memory to maintain. It also makes reading possible — text held at a fixed
depth stays legible while the world moves behind it.

**Why it works for an album.** You listen to a record; you do not walk through
it. Observer framing is the correct posture, and the whole site is about being
*shown* something.

**The equivalent move.** This one transfers unchanged and is the single most
valuable mechanic on the site for your brief, because **it is what lets the copy
be readable at all.** Your stations carry real prose — a constraint paragraph, a
failure paragraph, a "said plainly" paragraph. That text must sit in a fixed,
stationary plane at a fixed size with a stable contrast, while the instrument
rotates behind it. The moment text moves with the world, the page stops being
evidence and becomes a showreel, and the skeptical staff engineer closes the tab.

Concretely: the world is `<canvas>`, the argument is DOM, in the layer above it,
selectable and searchable. That also means the evidence survives with JavaScript
disabled and with WebGL unavailable — which matters, because some of the people
this page is for will open it in a locked-down work browser.

### 3. Distinct biome zones — each region looks like what it contains

**What it accomplishes.** It gives location an identity. You know which part of
the world you are in from the silhouette and the line texture alone, before
reading anything. It also converts scroll position into memory: "the spiral part"
is a thing a person can hold and return to.

**Why it works for an album.** Different tracks have different moods. Giving each
its own visual biome makes a fifty-minute record navigable at a glance and gives
fans something to compare and name.

**The equivalent move.** This is the mechanic your brief already had — "each
station is one of your real systems, rendered as a working magical instrument."
The translation is to make the biome distinction come from **what the system
actually does**, not from a decorative theme applied to it:

| Station | What the zone is made of |
|---|---|
| Vanguard | Gauge bars against limits. Thresholds, verdict dots, a funnel that narrows 10,291 → 2,676. Reticles, because the product draws one around every face it finds. |
| Sumero | A grading grid. Pass / partial / fail cells across 20 categories, with 22 cells marked open. A triage fork that routes three ways. |
| Pawlyse | A depleting clock. 140 seconds spending down across stages, citations accumulating to a cap of six, one distance cutoff at 0.43 that things fall below. |
| Nexis | Eleven weighted bars summing to a fixed total, and a model id that can be swapped underneath without the weights moving. |

If a visitor can tell which station they are in from the *shape of the
measurement*, the biome mechanic has done its job — and unlike an album, each
biome here is also a factual claim you can defend.

### 4. Optional mini-game — a reason to stay that is not content

**What it accomplishes.** Dwell time and agency. It converts a passive viewer
into someone who did something, and people remember what they did far better than
what they watched. Critically it is *optional*: the site works if you ignore it.

**Why it works for an album.** Fan engagement is the product. Time spent in the
world is a win by itself, and there is no competing conversion to protect.

**The equivalent move — and this is where I would push back hardest on the
brief.** You have exactly one conversion and a visitor with a dozen tabs. A game
competes with your CTA for the only attention you get, and losing that trade
costs you the thing the page exists for.

So take the mechanic's *mechanism* — interaction that produces understanding —
and point it at the evidence instead. **Make one threshold draggable.** On the
Vanguard station, let the visitor move the quality limit and watch the funnel
recompute: widen it and more faces survive and more of them are wrong; tighten it
and the survivors are clean but the count collapses. That is not a game, it is
the actual product experience — the Vanguard brief calls the operator's ability
to move a limit and watch the numbers move "the actual engineering achievement" —
and thirty seconds of it teaches a hiring engineer more about how you think than
the paragraph beside it.

Rules that keep it from becoming a game: one interaction per page, not four. It
must be discoverable in under two seconds. Nothing is unlocked, scored, or won.
And the numbers it produces must be real — recomputed from the same arithmetic
the pipeline uses, not a canned animation.

### 5. Hidden collectibles that unlock content — reward for exploration

**What it accomplishes.** It rewards a second visit and creates a reason to talk
about the site. It also lets the creator hide bonus material without cluttering
the main path.

**Why it works for an album.** Fans return. Scarcity and discovery are native to
music culture, and an unlockable B-side is a real reward to a real audience that
already wants more.

**The equivalent move.** Nothing on your page may be hidden, because **your
audience does not return.** A recruiter reads once, on one device, often at
speed. Anything gated behind discovery is, for practical purposes, not published.

But invert the mechanic and it becomes the strongest idea on this page. Mola Zone
hides the good stuff and rewards you for finding it. **You should surface the
stuff nobody else shows and make it impossible to miss.** Your "said plainly"
blocks — 88.8% is the share that cleared a threshold, not measured accuracy; 22
criticals still open; Nexis never reached production — are exactly the material a
normal portfolio hides. Putting them at the same visual weight as the wins is the
discovery moment, and it happens on first read instead of third.

The collectible mechanic that *does* transfer: **a rewarding depth layer that is
optional but visible.** Every station gets one control — `Open the rejection
detail`, `Read a failing case` — that opens the receipt behind a claim. Signposted,
one click, no hunting. The reward is the same (you found the real thing); the
cost of missing it is zero.

---

## What not to copy

### 1. The loading screen as an experience

Mola Zone holds you at a percentage counter inside a full-screen illustration
while a large 3D world downloads. That is defensible for an album site: the wait
is part of arriving somewhere, the visitor came deliberately, and there is
nothing else they were trying to do.

**Why it fails for your brief.** A loader is a bounce risk positioned exactly
where your funnel is widest. Your visitor did not come deliberately — they
clicked a link in an application or a DM, they are comparing you against other
candidates, and their patience is measured against a CV that opens instantly.
Worse, a percentage counter blocks Largest Contentful Paint by construction, and
your own Step 8 sets LCP as a floor.

The site's stall proves the point twice over: two chunks 503'd during this
extraction and the world never appeared at all. On an album site that costs one
fan one visit. On your page it costs you the interview, because the failure mode
of a WebGL-gated portfolio is a black rectangle where the evidence should be.

**Instead:** the hero's positioning line, the four station headlines, and the
booking control render as HTML on first paint, before any 3D initialises. The
world arrives progressively behind text that is already readable. The page must
be fully usable — and bookable — if WebGL never starts.

### 2. Pure black, two-ink, artwork-carries-everything

The two-ink press is genuinely beautiful and it is right for Yamê: the album art
is the product, the artwork is a commissioned illustrative universe, and monochrome
line work signals craft and coherence across a whole release.

**Why it fails for your brief.** Your content is *measurements*. A gauge that says
pass, margin or fail cannot say it in one ink. The Vanguard console solved this
already, and its reasoning is better than anything I would invent: base is graphite
with a slight green cast rather than pure black, because the console runs beside a
live camera feed in a control room and pure black next to video reads as a dead
panel; and there is exactly one accent family, a measurement scale, so colour
always means a reading and nothing else is allowed to be colourful.

That rule is stricter and more interesting than monochrome, and it is *yours* —
it came out of a real constraint on a real device. Take the discipline from Mola
Zone (withhold colour until it means something) and take the palette from your own
product.

Also worth noticing as a tension rather than a rule: Mola Zone self-hosts a
variable webfont, while Vanguard loads no webfont at all because the device is
offline and invisible text is not a design. Your portfolio is online and can
afford type — but the reason Vanguard could not is a story worth telling on the
page.

### 3. Navigation dissolved into the world

Mola Zone's DOM navigation is three links — tour dates, shop, vault — and
everything else is reached by travelling. There is no menu of destinations,
because wandering is the product.

**Why it fails for your brief.** Two kinds of visitor arrive at your page and only
one of them will scroll. The engineering lead might travel the whole tour. The
recruiter with eleven tabs wants your stack, your availability and a calendar link
in fifteen seconds, and if the only route to them is through a rotating world,
they leave without ever seeing that you are remote-only and reply within a day.

**Instead:** a persistent, boring, always-visible route to the call. A sticky
control that never leaves the viewport, four station labels that jump directly,
and a text-only path through every claim on the page. The world is the reward for
the visitor who wants depth — never the toll gate for the one who does not.

---

## What this implies, in one paragraph

Keep Mola Zone's **structural** decisions: one canvas for the world, DOM as the
instrument panel, a single ordered scroll axis, per-zone visual identity, and
colour withheld until it carries meaning. Reject its **commitment** decisions: the
loading gate, monochrome, and navigation-by-exploration. Then replace the borrowed
palette and metaphor with ones taken from your own systems — graphite rather than
black, a pass/margin/fail gauge ramp as the only accent family, letterspaced
monospace micro-labels against large tabular figures, and a rotation that reads as
inspection rather than playback.

The resulting page is not a music site with engineering content in it. It is a
console — which is what you actually build.

Tokens, type scale, motion budgets and the numeric performance floor are Step 3,
and they should be derived from that last paragraph rather than from this one.
