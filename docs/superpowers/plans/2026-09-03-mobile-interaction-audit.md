# Mobile interaction, accent & chat links — audit record

Date: 2026-09-03
Branch: `mobile-interaction-and-accent`
Plan: `docs/superpowers/plans/2026-09-03-mobile-interaction-and-accent.md`
Spec: `docs/superpowers/specs/2026-09-03-mobile-interaction-and-accent-design.md`

Baseline screenshots were captured **before any edit** and kept outside the repo
(the scratchpad), because `frontend/.gitignore` carried an uncommitted change
from another session and staging it would have swept that into this work.

## The defect table, before and after

All at 390x844, `deviceScaleFactor: 2`, mobile + touch, against the production
build served by `vite preview`.

| Defect | Before | After |
|---|---|---|
| Hero overflows the screen | `.hero` 911.09px vs 844svh — 67.09px of the figure's strip below the fold | **844.00px, exactly the viewport** |
| Anchored headings cut by the nav | `scroll-margin-top: 0px` under a 64px fixed nav | **80px**; Skills title lands at y=74 |
| Work is a wall of text | `#work` 3894.44px; first card 917px; document 9430px | **`#work` 2893.66px; first card 475px; document 8170px** |
| Dock arrows on body copy | both at x=342; `elementsFromPoint` returned `card__body` for each | **0 `.dock-pointer` elements anywhere on the page** |

Hero detail after: copy ends at 554.6, the band starts at 557, the figure's head
is at ~620 — no overlap, and the eyebrow clears the nav at y=71.4. At 768x1024
the hero is 1024px, also an exact fit.

## Gate suite

| Gate | Result |
|---|---|
| `npm test` | **511 passed**, 55 files |
| `npm run build` (`tsc -b` first) | clean |
| `npm run check:motion` | all 8 scenarios animate |
| `npm run check:contrast` | all 14 samples clear 4.5:1 |
| `npm run check:stations` | push-in and every handover animate |
| `npm run check:scramble` | all checks passed, max neighbour drift 0.00px |
| `npm run check:csp` | OK — model decoded, webfonts loaded |
| `npm run persona` | 16 chunks, corpus byte-identical (`git status` clean) |

Contrast, every sample: `.hero__thesis` 5.75, `.hero__meta` 5.62 mobile /
7.11 desktop, `.about__copy p` 6.89, `.card__outcome` 16.59, `.skills__title`
11.39, `.timeline__bullets li` 6.89, `.contact__meta` 6.89.

`.hero__meta` moved 5.73 → 5.62 on mobile: the copy now sits nearer the lit
figure because the band narrowed. Well clear of the 4.5:1 floor.

## Desktop diff — the strict half

Every `1440-*` pair compared against its baseline. **Two differences, both
permitted by the spec, and nothing else.**

1. **A uniform 80px downward shift** of every section. This is
   `scroll-margin-top` doing its job: `shoot.mjs` uses `scrollIntoView`, which
   now honours it, so the page comes to rest 80px earlier. It is not a layout
   change — the shift is *identical* on every section (Work 302→382, Skills
   207→287), which is what proves the document itself did not move. Only where
   a scroll stops changed.
2. **Accent hue on the five opt-in elements.** Visible in `desktop-skills`: the
   group headings are gold in the baseline and rose (hue 18) after. The nav
   marker matches.

Verified on desktop directly: `.card__more-summary` computes to `display: none`
on all five cards, every `<details>` is `open`, and `.is-near` marks nothing
(no element registers on a fine pointer). The three-arrow dock trail is intact
above 1360px.

`desktop-contact` also shows a brighter backdrop, which is the same 80px rest
offset changing where the backdrop shader's radial falloff sits behind the
copy — `check:contrast` samples it at 6.89:1.

## Mobile diff — the expected half

`mobile-work` is the clearest: the baseline shows two teal chevrons sitting
directly on the bullet text with the card running off the bottom of the screen
and the launcher over the copy. After, the whole Relay card fits on one screen —
title, outcome, a collapsed `DETAILS` control, stack chips and the outbound
link — with no chevrons anywhere and the launcher clear of the card.

`mobile-top`: the baseline has the chevrons over the figure; after, they are
gone, the whole hero fits, and the scroll cue is visible.

## Interactions, checked in the browser

- **`is-near`** marks exactly one card at a time and walks down with the scroll:
  Relay → Relay → Silmaril AI → Wearable AI chat → QuerySphere → QuerySphere.
  Never more than one.
- **The mobile menu decode** ran on all five links (each froze its own width,
  which `run()` does synchronously), every width was released afterwards, and
  every label came back exactly: About, Work, Skills, Experience, Contact.
- **Chat links**, against a live reply through the dev server. Asked "Where can
  I find your code and your LinkedIn?" and got both URLs back as real anchors:
  `href` exact, `target="_blank"`, `rel="noreferrer noopener"`, teal and
  underlined, with the sentence's full stop left outside the link.
- **The launcher hint** fires once the reader leaves the hero and retires for
  the session as soon as the dock is opened.

## Two tool bugs this work surfaced

Both were latent and both would have gone on lying:

1. **`check_contrast.mjs` scraped `getComputedStyle().color` with a
   `/[\d.]+/` regex**, which is only ever correct for `rgb()`. Chrome
   serializes a colour authored in a modern space in that space, so
   `oklch(0.827 0.078 18)` was read as `rgb(0.827, 0.078, 18)` — essentially
   black — and failed a perfectly legible heading at 1.03:1. It now paints the
   computed colour into a 1x1 canvas and reads the pixel back, so any syntax
   resolves to the sRGB actually shown, gamut clipping included.
2. **`shoot.mjs` waited on the wrong viewport.** `Reveal` observes with
   `rootMargin: '0px 0px -12% 0px'`, so an element whose top is inside the
   bottom 12% correctly has not fired — but the wait measured the *full*
   viewport and so waited for something that was never coming. It had simply
   never caught one until the project cards got shorter and a card landed with
   its top at 785 in an 844px viewport, 42px inside the excluded band. The wait
   now asks the same question `Reveal` does.

## One browser behaviour worth keeping

A registered `@property` custom property **will not transition on `<html>` or
`<body>`**. Measured synchronously with identical inline setup on all three: a
plain `<div>` starts the transition (`getAnimations()` reports it) and body and
html both report zero, while `transitionProperty` computes to `--accent` on all
three. The declaration is accepted and silently never fires. `App.tsx` therefore
renders a `display: contents` wrapper to host the ramp — no box, no containing
block, so the fixed nav and dock still resolve against the viewport. Recorded in
`frontend/CLAUDE.md`.

Also worth knowing for anyone verifying by hand here: `vite preview` serves a
cacheable `index.html`, so a browser will happily keep loading a deleted
stylesheet after a rebuild. Hard-reload after every build or you will measure the
previous one. And this harness's rAF runs at roughly 2Hz in an unfocused tab,
which freezes the animation clock — sample synchronous signals
(`getAnimations()`, a synchronously-set style) rather than frame counts.

## Deferred, deliberately

1. **Magnetic buttons following a touch drag.** Requested at approval and called
   out then. `readPointer` returns on `pointerType === 'touch'` and two tests
   pin that down; reversing it spends a `pointermove` listener on every phone to
   produce a ~6px lean underneath the finger causing it. The press-scale added in
   this work is the visible touch equivalent. To do it: delete the `pointerType`
   guard, invert `costs no pointer listener on a coarse pointer` and `holds the
   offset at exactly zero on a coarse pointer`, register on coarse pointers.

2. **`content/persona/qa.md` and `voice.md` are still empty.** All 16 corpus
   chunks come from `src/content/index.ts`; **zero** are in Moeez's own voice.
   The corpus is current, not stale — `npm run persona` rebuilds it byte for
   byte — so this is the single biggest remaining lever on chat quality, and it
   cannot be done for him: both files state that an invented answer is a defect.
   The 20 unanswered headings include "What was actually hard about Horus?",
   "What are you weakest at?" and "Why should I hire you over another AI
   engineer?". When he answers any of them the follow-up is mechanical: paste,
   `npm run persona`, `npm run eval:chat`.

`npm run eval:chat` was not run: it needs `OPENROUTER_API_KEY` in the
environment. The live chat check above went through `npm run dev`, which holds
the key, and confirmed the reply path end to end.
