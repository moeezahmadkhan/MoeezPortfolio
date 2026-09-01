# Mobile intro and mobile stations

Date: 2026-09-02
Status: approved

## Why

Measured on a 390x844 emulation, against oryzo.ai on the same harness:

- **oryzo intro:** the wordmark and the product start around 60% scale and grow into
  place with the layout already resolved. Nothing pops in at final size.
- **oryzo body:** every section is a full-viewport pinned panel. The subject owns
  50-70% of the screen, copy is a small bottom card, and `SCROLL TO CONTINUE` plus
  the brand pill stay stuck. 51,317px of document for an 844px viewport.
- **ours, intro:** none. First paint is the final state.
- **ours, body:** the hero figure is a sliver at the bottom, half-covered by the
  chat launcher and the scroll cue. Below the hero, 7,877px of page with no figure
  at all, because `rigFor(id, mobile)` returns `null` for every non-hero section.

That `null` is deliberate and stays deliberate: it is what keeps a phone from
fetching 2.45MB of extra GLB. This design gives mobile a travelling figure and a
real entrance **without** relaxing it.

Explicitly not adopted, and already recorded in `frontend/CLAUDE.md`: oryzo's
pinned scroll-as-timeline and its studio's WebGL-Scroll-Sync technique. Our canvas
has no DOM targets to drift against, and a 51k-pixel document would undo the
measured payload work.

## Decisions taken

1. Mobile reuses the hero model across every section. No new model downloads.
2. The entrance is a push-in plus staged copy. No blocking preloader; nothing is
   gated behind an animation.
3. Below the hero the figure anchors to a corner per section, with a scrim between
   canvas and copy. No per-section reserved band (it would add ~1000px of page).
4. `--figure-band` grows from `clamp(150px, 25svh, 240px)` to
   `clamp(220px, 38svh, 340px)` so the hero figure reads as the subject.

## Architecture

### Stations

`rigFor(activeId, mobile)` returns the **same hero spec, with the same `spec.id`,
for every section** on mobile. `SceneDirector`'s effect compares
`incomingId === (target?.id ?? null)` and bails when they match, so it never
cross-fades and never unmounts. One rig stays mounted for the whole page.

`nextRig(id, mobile)` still returns `null`. The prefetch gate is unchanged, and a
phone still downloads exactly one GLB.

A new `MOBILE_STATIONS` table in `rigs.ts`, keyed on the section ids
`useSectionObserver` reports — never on scroll fractions:

| section | position | scale | yaw | presence |
|---|---|---|---|---|
| `top` | `[0.00, -1.25, 0.0]` | 0.82 | 0.00 | 0.80 |
| `about` | `[0.42, 0.95, -1.4]` | 0.30 | -0.55 | 0.42 |
| `work` | `[-0.44, -0.85, -1.6]` | 0.26 | 0.48 | 0.40 |
| `skills` | `[-0.42, 1.00, -1.7]` | 0.24 | 0.62 | 0.36 |
| `experience` | `[0.44, -0.90, -1.3]` | 0.32 | 0.00 | 0.44 |
| `contact` | `[0.00, 0.20, -2.6]` | 0.22 | -0.30 | 0.22 |

`experience` holds `yaw: 0` because `pinnedYaw` already drives that section's turn
from `smooth.pinnedProgress`. Adding a station yaw there would fight it.

`CharacterRig` today damps `position.y` only. It gains `position.x`, `position.z`
and a station-driven scale, all through `damp` at a new named `STATION_LAMBDA` in
`three/motion.ts`, deliberately slower than `LIFT_LAMBDA`: this is a journey across
the screen, not a settle. No bare numeric lambda.

The active station arrives as a prop, `Stage -> SceneDirector -> CharacterRig`. It
changes on section boundaries only. It is not per-frame state and does not belong
in a module singleton.

### The visibility change this forces

`rigVisibility` scales the hero rig's fade by `scroll.smooth.heroVisible`, which
decays to zero once the hero leaves the screen. With one persistent mobile rig that
would fade the figure out exactly where it should be travelling.

`rigVisibility` therefore takes the active station id. `heroVisible` applies only
while the hero station is active; every other station is fully present and is then
scaled by its own `presence` value. `MOBILE_PRESENCE` becomes the hero station's
presence rather than a single global constant. Desktop has no stations and is
untouched.

### Intro

`frontend/CLAUDE.md` records that the hero "mounts with `skipInitialFade`, so it
must LOOK settled on the first frame; a wand igniting from black over a second does
not." The intro therefore moves the figure and never touches its opacity: full
brightness from frame one, starting `z -0.55` back at `0.88x` scale, settling
forward over roughly 1.2s.

This reuses `choreography.ts`'s existing linear decay rather than adding a second
curve. A `HERO_INTRO` row is added whose progress input is a one-shot damped
`intro` ref in `CharacterRig`, seeded when `skipInitialFade` is set, instead of the
rig's cross-fade. Still no timers, still no scroll input, still no scroll-fraction
table.

Hero copy staggers on `transition-delay` at 120 / 220 / 380 / 520 / 620ms for role,
name, thesis, actions and meta, on `var(--ease)`.

### Scrim

A mobile-only `.stage__scrim`, fixed, between the canvas and the content. Copy sits
over a slight darkening; the figure's corners stay clear. `npm run check:contrast`
is the gate, not the token values.

## What this breaks, and how it is handled

- **`src/test/motion-language.test.ts`** — the rule "never gives an element an
  entrance with no way to leave" flags any one-shot `animation` on an element with
  no matching `transition`. The hero intro is a genuine one-shot on an element that
  never leaves. A recorded `ENTRANCE_EXCEPTIONS` list is added beside the existing
  `LAYOUT_EXCEPTIONS`, and documented in `frontend/CLAUDE.md` the way the
  `.skip-link` exception already is. It is a recorded exception, not a workaround.
- **`tools/shoot.mjs`** — `MOBILE_RIG` maps every non-hero section to `null`. All
  six become `'hero'`. A stale entry here surfaces as a 15s timeout per section,
  not a wrong picture.
- **`src/three/rigs.test.ts`** — the "hero is the only rig on mobile" assertions
  change shape. The invariant that survives is the payload one: on mobile,
  `rigFor` never returns a spec whose `model` is anything but the hero's, and
  `nextRig` always returns `null`.

## Budgets that must not regress

- Mobile first-visit payload stays ~1.89MB. One GLB, not three.
- No frame over 20ms and no long task on a full-page scroll (measured 2026-09-01:
  240 frames, median 16.7ms).
- `npm run check:contrast` passes at both widths.
- `npm run check:motion` passes.
