# Mobile interaction, section accent, and chat links — design

Date: 2026-09-03
Status: approved, ready for planning

## Why

Three requests, one sweep:

1. The hover affordances the desktop site spends real effort on are switched off
   entirely on a coarse pointer, and nothing replaces them. A phone visitor gets
   a static page.
2. The mobile layout has four measured defects (below).
3. The theme should shift colour as the reader moves down the page, the way
   oryzo.ai does.

Plus two follow-ons raised at approval: the chat must render the links it already
emits as clickable, and the whole change must be audited afterwards to prove the
desktop UI did not move.

## What was measured, not assumed

All from the running dev build at 390x844, `deviceScaleFactor: 2, mobile, touch`.

| Defect | Measurement |
|---|---|
| Hero figure clipped | `.hero` box is 911.09px against an 844px `svh`. Content 590px + `--figure-band` 320.72px. The band loses 67px — 21% of the figure's reserved strip is below the fold at scroll 0. |
| Every anchored heading cut | `scroll-margin-top` computes to `0px` on `.section`, under a 64px fixed nav. Confirmed visually on Skills and Contact. |
| Work is a wall of text | `#work` is 3894.44px tall. Card heights: 917, 467, 451, 429, 667. The document is 9430px for an 844px viewport. |
| Dock arrows sit on body copy | Both compact arrows centre at x=342. `document.elementsFromPoint(342, 732)` and `(342, 757)` both return `['card__body', 'card', 'reveal is-shown', 'work__grid']`. |

`DockPointer.tsx`'s own comment already concluded that below `POINTER_MIN_WIDTH`
the trail "has nowhere to stand ... so on a narrower screen this says nothing".
`COMPACT_TRAIL_LENGTH` reintroduced exactly the overlap that reasoning ruled out.

### Chat, measured

- `npm run persona` regenerates `api/_core/corpus.generated.json` byte-identically,
  so the committed corpus is **not stale**.
- All 16 chunks have `source: 'src/content/index.ts'`. **Zero** come from
  `content/persona/qa.md` or `content/persona/voice.md`.
- Both persona files are entirely unanswered. `build_persona_index.mjs` drops any
  heading whose body is under eight words, so they contribute nothing.
- The corpus **does** carry URLs in prose (the LinkedIn profile,
  `https://github.com/moeezahmadkhangit`, `https://moeezahmadkhan.com`,
  QuerySphere's source and live links).
- `SYSTEM_PROMPT` already orders the model to "Copy a link from the notes exactly,
  character for character."

So the model emits links today. `ChatMessage.tsx` renders `{message.content}`
inside a `<p>`, which is why none of them are clickable. This is a rendering
defect, not a prompt or corpus defect.

## Non-goals

- No light theme. `tokens.css` states there is no light theme; that stands.
- `--gold` is not repointed. `--accent` is a new, opt-in token.
- The chat teal stays reserved for the AI surface. No accent in the ramp goes
  near its hue.
- No answers are written into `qa.md` or `voice.md`. Those files say in their own
  text that an invented answer is a defect, and CLAUDE.md forbids inventing facts.
- No scroll-fraction tables anywhere. Section membership comes from
  `useSectionObserver`, as it already does.

---

## 1. Touch hover — the `is-near` primitive

**New file:** `src/lib/useNearFocus.ts`

One module-level shared `IntersectionObserver`, created lazily on first
registration and disconnected when the last element unregisters — the same
lifecycle `registerMagnetic` uses for its window listeners, so a fine-pointer
visitor pays nothing.

- `rootMargin: '-45% 0px -45% 0px'` — a 10% band across the viewport's middle.
  Narrower than `useSectionObserver`'s 15% band on purpose: this picks one card,
  not one section.
- Winner-take-all, like `useSectionObserver`: the registered element with the
  greatest `intersectionRatio` inside the band holds `is-near`, and every other
  registered element has it removed. Without this every card in a tall section
  lights at once.
- The class is toggled on the DOM node directly. Not React state: a scroll that
  crosses six cards would otherwise re-render six components.
- Registration is gated on `isCoarsePointer()`. On a fine pointer nothing
  registers, no observer is ever constructed, and `:hover` alone rules.

**Consumers:** `.card` (ProjectCard), `.tl__item` (Timeline).

**CSS:** extend the existing selector rather than duplicating the rule.

```css
@media (pointer: coarse) {
  .card.is-near { /* same declarations as .card:hover */ }
}
```

The `prefers-reduced-motion` block that already strips `transform` from
`.card:hover` gains `.card.is-near`, so the border tint survives and the lift
does not.

**Tests:** `src/lib/useNearFocus.test.ts` — registers two elements, drives the
observer callback, asserts exactly one carries `is-near`; asserts a coarse-pointer
check gates registration; asserts the observer is disconnected on last unregister.

## 2. Press feedback

Inside `@media (pointer: coarse)` only:

- `.btn:active`, `.tag:active`, `.nav__link:active`, `.chat__starters button:active`
- `transform: scale(0.98)` plus the same border/background the hover state sets
- `transition` uses `--ease`, per the motion rules

`transform` and paint only. Nothing here re-flows.

`.card` itself is not a tap target (its links are), so it gets no `:active` rule —
`is-near` is its affordance.

## 3. Scramble decode on the mobile menu

`src/lib/useScramble.ts` gains a returned `run()`:

- `run()` is the current `onMouseEnter` body **minus** the `isCoarsePointer()`
  bail. It keeps the `prefersReducedMotion()` bail.
- `onMouseEnter` is unchanged and keeps its coarse bail, so a tap still never
  puts a decode between the press and the navigation — the reason that bail
  exists.

`Nav.tsx` passes each `NavLink` an `openSeq` counter (incremented every time the
mobile panel opens) and its `index`. `NavLink` runs an effect on `openSeq` that
calls `run()` after `index * 60ms`, cleared on unmount and on a re-open. The
panel is a vertical column, so the width freeze already in the hook covers the
only reflow risk.

**Tests:** extend `src/lib/useScramble.test.tsx` — on a coarse pointer
`onMouseEnter` still no-ops but `run()` decodes; under reduced motion both
no-op. `npm run check:scramble` already exercises the decode in a browser.

## 4. Magnetic on touch — deferred, with reason

Requested, and deliberately **not** in this spec's implementation scope.

`readPointer` returns early on `pointerType === 'touch'`, and two tests pin that
down: `costs no pointer listener on a coarse pointer` and `holds the offset at
exactly zero on a coarse pointer`. Reversing it spends a `pointermove` listener
on every phone to produce a ~6px lean underneath the fingertip that is causing
it — the finger occludes the whole affordance.

Section 2's press-scale is the visible touch equivalent. If the lean is still
wanted after seeing the press feedback land, it is a small follow-up: delete the
`pointerType` guard, invert both tests, and register on coarse pointers.

## 5. Section accent shift

**`src/styles/tokens.css`:**

```css
@property --accent {
  syntax: '<color>';
  inherits: true;
  initial-value: #e7c27d;
}
```

Registration is what makes a custom property interpolable; an unregistered one
snaps. `@property` is Baseline (Firefox 128+, July 2024).

The ramp holds lightness and chroma constant and rotates hue only, so every
accent has **identical contrast against the ground by construction**. That is
what stops six colours reading as a rainbow:

```css
:root                       { --accent: oklch(0.827 0.078 84);  } /* gold — hero */
[data-section='about']      { --accent: oklch(0.827 0.078 62);  }
[data-section='work']       { --accent: oklch(0.827 0.078 40);  }
[data-section='skills']     { --accent: oklch(0.827 0.078 18);  }
[data-section='experience'] { --accent: oklch(0.827 0.078 352); }
[data-section='contact']    { --accent: oklch(0.827 0.078 326); }

:root { transition: --accent 700ms var(--ease); }
```

`oklch(0.827 0.078 84)` is `#e7c27d` — the ramp starts on the existing gold
rather than beside it. The arc runs gold → copper → muted rose. The chat teal is
near hue 190; the ramp's closest approach is 326, so the two voices never
converge.

Alpha uses go through `color-mix(in oklab, var(--accent) 36%, transparent)`,
which transitions because `--accent` does. `--gold-rgb` stays for everything
that keeps the fixed gold.

**Who spends `--accent`:** section kicker and rule, the nav marker,
`.card__metric`, `.tag` border, the Skills group headings.

**Who keeps `--gold`:** `.hero__role` (brand anchor, and the first coloured thing
anyone sees), the Contact email link, `.btn--solid`'s fill, and everything on the
chat surface. This is the line that keeps `npm run check:contrast` meaningful —
nothing it samples changes hue.

**Driver:** `App.tsx` calls `useSectionObserver(SECTION_IDS)` and writes
`document.documentElement.dataset.section` in an effect. One extra observer
alongside Nav's and Stage's; they already run two. No new scroll input.

Reduced motion is handled by the global block in `base.css`, which collapses the
duration — the accent snaps rather than sliding, which is correct.

**Tests:** `src/styles/tokens.test.ts` asserts every id in `SECTION_IDS` has an
`--accent` row, and that all rows share the same L and C values.
`src/test/motion-language.test.ts` will see the new transition and must find
`var(--ease)` on it.

## 6. Mobile layout

**a. `scroll-margin-top`.** `.section { scroll-margin-top: calc(var(--nav-h) + var(--s-3)); }`
One line. Fixes every cut heading and every anchor jump.

**b. Work cards.** `.card__detail` moves inside a `<details class="card__more">`.
`ProjectCard` reads `useMatchMedia('(max-width: 899px)')` and sets
`open={!narrow}`, so desktop is unchanged and narrow screens get the bullets
collapsed. The summary label is `Details` — UI chrome, not portfolio content, so
no fact is invented and `src/content/` is untouched.

The disclosure itself is not animated. It re-flows the document, and
`::details-content` with `interpolate-size` is not Baseline. The chevron rotates
on `[open]` via `transform`. A tap-driven disclosure is off the scroll path, so
the no-layout-animation rule is satisfied rather than excepted.

Target: `#work` from 3894px to roughly 1500px. **Measured after, not assumed.**

**c. DockPointer.** Delete the compact trail below `POINTER_MIN_WIDTH` —
`COMPACT_TRAIL_LENGTH`, its arrows, and `.dock-pointer--compact`. Replace with a
one-shot ring pulse on the launcher itself, fired once when the reader first
scrolls past the hero and gated by the existing `hasDockOpened()` session key.
One shot, so `--ease`, not `--ease-loop`. Tests referencing `COMPACT_TRAIL_LENGTH`
are repointed at the pulse.

**d. Hero clip.** A genuine squeeze: 590px of copy plus a 320px band against an
844px screen. Both give a little.

- `.hero__thesis` drops one clamp step on `max-width: 899px`.
- `--figure-band` goes from `clamp(220px, 38svh, 340px)` to
  `clamp(200px, 34svh, 300px)` — 287px at 844px tall.

Projected 520 + 287 = 807px, inside 844. CLAUDE.md records that the band and the
hero station's scale move together, so `MOBILE_STATIONS`' hero row drops from
scale 1.15 to approximately 1.08. **That number is tuned in the browser against
`check:stations` and a re-shoot, not fixed here.**

**e. Section rhythm.** Vertical padding in `Section.css` steps down below 900px.

## 7. Chat — clickable links

**New file:** `src/components/chat/linkify.ts`

A pure function: string in, `Array<string | {href, text}>` out. `ChatMessage`
maps it to text nodes and `<a>` elements.

- No `dangerouslySetInnerHTML`. The model's output is untrusted text and must
  stay text; only the structure around it is ours.
- Matches `https?://…` and bare `mailto:`-able email addresses.
- Trailing sentence punctuation belongs to the sentence, not the URL — strip
  `[.,;:)\]]+$`, reusing the rule `persona.ts`'s `linkedInUrlFrom` already
  applies.
- Only `http:`, `https:` and `mailto:` schemes produce an `<a>`. Anything else
  stays plain text, so a `javascript:` string in a reply can never become a link.
- External links get `target="_blank" rel="noreferrer"`, matching `CvLink`.
- **Truncation guard:** `MAX_OUTPUT_TOKENS` is 256, so a reply can end mid-URL.
  A URL match that runs to the very end of a message whose text shows no
  terminal punctuation is rendered as plain text rather than as a link to a
  truncated address.

`ChatDock.css` gets a `.chat__msg a` rule — underline plus `--teal`, since this
is the AI surface and the teal reservation applies here rather than the accent.

**Tests:** `src/components/chat/linkify.test.ts` — a bare URL, a URL followed by
a period, an email, two links in one message, a `javascript:` string staying
inert, and the truncation guard. Plus a `ChatMessage` render test asserting a
real `<a href>` reaches the DOM.

## 8. Feeding the model newer detail

The corpus is current and complete with respect to `src/content/`. The gap is
that **nothing in it is in his own voice**, because `qa.md` and `voice.md` are
empty.

This spec does not fill them. What it does:

- Adds `npm run persona` to the verification sequence, so any content change made
  here is reflected in the corpus rather than drifting from it.
- Reports the 20 unanswered `qa.md` headings back to Moeez as the highest-leverage
  chat improvement available, to be answered by him and then built with
  `npm run persona` and graded with `npm run eval:chat`.

If he answers even a handful, that is a separate, small, mechanical follow-up:
paste, build, eval.

## 9. The audit

Requested explicitly: prove the UI is right afterwards and that nothing changed
that should not have.

`tools/audit.mjs` is dead v1 code — it references `grimoire`, `owlpost` and
`chapters`, none of which exist. It is not used and is not repaired here.
`tools/shoot.mjs` is the working tool: two widths, every section, into `.shots/`.

**Procedure:**

1. **Before any edit:** `npm run build && npm run preview`, then `npm run shoot`.
   Copy `.shots/` to `.shots-baseline/`.
2. Implement.
3. `npm run shoot` again and compare each pair.
   - **Desktop (1440) must be identical except the accent hue** on the five
     elements listed in section 5. Any other desktop difference is a regression
     and gets fixed before proceeding.
   - **Mobile (390) is expected to differ** on exactly: hero band and figure
     scale, section heading offsets, Work card height, and the absent dock
     arrows. Anything else differing is unintended.
4. Re-measure the four numbers in the defect table and record the new values.

**Gate suite, in order:**

```
npm test
npm run build          # tsc -b type gate
npm run check:motion   # every new state change must animate
npm run check:contrast # accent ramp + hero band both touch it
npm run check:stations # hero station scale changed
npm run check:scramble # the decode's new trigger
npm run check:csp      # nothing here should touch it; run it to prove that
npm run persona        # corpus must rebuild identically
npm run eval:chat      # link rendering must not change what the model says
```

`check:contrast` samples the smallest body copy in every section at both widths;
the floor to hold is the recorded 5.73:1. `check:stations` asserts the push-in
travels forward and stays lit, and that a section change catches the figure in
flight.

## Risks

- **The hero band arithmetic is projected, not measured.** 807px assumes the
  thesis loses ~70px at one clamp step down. If it loses less, the band or the
  type gives further. Tuned in the browser.
- **`transition: --accent` on `:root` repaints every inheritor for 700ms.** It is
  paint-only and fires once per section change, but `check:motion` must confirm
  it does not collide with the existing per-frame work. The measured baseline is
  240 frames, median 16.7ms, zero frames over 20ms — that is what a regression
  would be measured against.
- **The `<details>` collapse hides real content on mobile.** It is one tap away
  and native to keyboard and screen reader, but it is a genuine information-
  density trade and should be looked at in the re-shoot before it is kept.
