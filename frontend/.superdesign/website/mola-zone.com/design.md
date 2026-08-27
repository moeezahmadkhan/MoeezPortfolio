# mola-zone.com — extracted design DNA

Source: https://mola-zone.com/ (Yamê "Molazone", Nuxt + WebGL). Extracted 2026-08-26
by direct browser inspection (superdesign `extract-website` returned no payloads for
this site — heavy client-rendered WebGL app, nothing crawlable).

## 1. The structural idea (most important finding)

**It is not a scrolling page. It is one fixed WebGL world with an HTML HUD on top.**

- `document.scrollHeight === innerHeight` (900 === 900). There is no document scroll.
  Wheel/drag input drives the **camera through a 3D world**; the DOM never moves.
- DOM tree is flat and tiny:
  ```
  div.app.dark
    div.webglRenderTargetContainer  [fixed, 100vw x 100vh]
      canvas.webglRenderTarget      [absolute]
    header.appHeader                [relative, 23px tall — a hairline bar]
      div.navigation | header.appLogo | div.controls
    div.webglObject                 [fixed, 44x44]  ← 3D-anchored HTML
      a.uiPointOfInterest           [44x44 hotspot]
    div.uiZoneOfInterest            [fixed, fullscreen prompt layer]
      div.uiHeading.heading-1       "SCROLL TO EXPLORE"
    footer.appFooter                [fixed, 64px]
  ```
- **`webglObject` / `uiPointOfInterest`**: HTML markers projected to screen space from
  3D positions each frame. 15 of them, one per piece of content. Off-screen markers
  are collapsed to `width: 0` rather than unmounted.
- **Content lives on routes, not sections.** Every POI is an `<a href>` into
  `/posts/*`: `/posts/shop`, `/posts/tourdates`, `/posts/premium`,
  `/posts/youtube?id=shoot`, `/posts/video?id=cave`, `/posts/vinyl`, `/posts/radio`…
  Clicking opens an overlay panel over the still-running world. The world is the
  index; the panels are the pages.
- Persistent chrome: hairline top bar (`Play · TOUR 2025 · Shop · ÉBĒM Vault · Menu`),
  an always-on audio transport (`Now Playing — Yamê, Bizarre (Instrumental) ON`),
  fixed footer (copyright · legal · social icons · EN|FR).
- Onboarding is a single fullscreen zone prompt: `SCROLL TO EXPLORE`.
- Loader is a full-bleed art plate with a centred dotted ring + `100%` counter,
  and a portrait-orientation lock notice on mobile.

## 2. Colour

Pure achromatic. **No accent hue anywhere.**

```
--dark:       11, 11, 12     /* #0b0b0c — surfaces */
--light:      255, 255, 255  /* #ffffff — ink on dark */
--sand-white: 240, 237, 235  /* #f0edeb — inverted panels */
--fade-black: rgba(0,0,0,.5)
--fade-white: hsla(0,0%,100%,.5)
body background: #000000
```

Opacity — not hue — is the entire tonal scale. One channel triple, seven steps:

```
--c-primary-25/40/50/60/70/80/90/100  = rgba(var(--light), .25 … 1)
--c-secondary-25/40/…/100             = rgba(var(--dark),  .25 … 1)
--c-primary   = var(--c-primary-70)   /* default text is 70% white, not 100% */
--c-secondary = rgb(var(--dark))
```

Component tokens derive from those, never from literals:
`--btn-bg: var(--c-secondary)`, `--btn-border: var(--c-primary)`,
`--ui-button-border: #7b7a79`, `--color-border-input-bottom: hsla(0,0%,100%,.25)`.

## 3. Typography

**One family, three weights, everything small.**

- `Kern, sans-serif` @ 400 / 500 / 700 — self-hosted, used for 100% of the page.
- Measured sizes across the whole rendered page:

  | role | size / weight / case | count |
  |------|----------------------|-------|
  | body / links | 13px / 400 / none | 38 |
  | labels, nav, buttons | **10px / 700 / uppercase** | 23 |
  | micro-legal | 9px / 400 | 4 |
  | secondary | 12px / 400–500 | 5 |
  | largest text on page | **16px / 700 / uppercase** | 1 |

- There is **no 48px hero headline**. The art is the headline; type is a HUD.
- Tracking is deliberate on every uppercase run: `1.5px`, `1px`, `0.7px`, `0.66px`,
  `0.63px`, `0.44px`, `0.18px`, and one `4%`. Lowercase body stays `normal`.

## 4. Shape, motion, texture

- Radius: `0px` on 448 of 465 elements. `22px` on the 15 pill controls (transport,
  language toggle). `50px` on 2 round buttons. Sharp by default, pill by exception.
- Easing tokens:
  ```
  --ease-in-out-simple: cubic-bezier(.4,0,.2,1)
  --ease-in-out-quart:  cubic-bezier(.77,0,.175,1)
  --ease-out-simple:    cubic-bezier(.165,.84,.44,1)
  --ease-in-simple:     cubic-bezier(.895,.03,.685,.22)
  ```
- Durations are short and property-scoped, never `all`: `color .2s`,
  `opacity .15s ease-out`, `transform .25s, opacity .25s`, `transform .5s`,
  `opacity .5s cubic-bezier(.87,0,.13,1)`, `filter 1s`,
  `stroke .25s ease-in-out, fill .25s ease-in-out`.
- A custom property is itself animated: `--sound-btn-intensity .5s` (audio reactivity
  fed into CSS).
- Layout tokens: `--header-height: 80px`, plus Nuxt-hashed per-component vars
  (`--height`, `--progress`) for scroll/progress-driven styling.
- Art direction: **white hand-drawn engraving line-art on black** — hatched clouds,
  dotted rings, radial mandalas, tarot/woodcut figures, occult sigils. Illustration
  carries all the character; the UI stays bureaucratically plain so it never competes.

## 5. Transferable rules

1. The world is the navigation. Scroll moves a camera, not a document.
2. Anchor HTML markers to 3D objects; open content as overlay routes over the live world.
3. Chrome is hairline and permanent: top bar, fixed footer, one transport control.
4. Two colours and an opacity ladder. Hue restraint makes the illustration loud.
5. Type is HUD-scale (9–16px), uppercase + tracked for labels, one family.
6. Radius 0 everywhere except pill-shaped controls.
7. Transition named properties only, 0.15–0.5s, quart/out-simple easing.
8. Give the visitor exactly one instruction on entry ("SCROLL TO EXPLORE").
