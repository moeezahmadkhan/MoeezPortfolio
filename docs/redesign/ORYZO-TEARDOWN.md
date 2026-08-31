# oryzo.ai — Teardown

**What it is:** a satirical single-page product site for a fictional "AI-powered cork coaster",
built by [Lusion](https://lusion.co/) as a self-promo piece. The joke is the payload; the
craft is the point. Last line of the footer: *"We caught your attention with a non-existent
product. If we can sell a coaster, imagine what we can do for your brand."*

**Why it matters to this project:** it is the clearest public example of the exact thing the
v2 portfolio wants — a full-bleed WebGL stage that a DOM page scrolls *through*, with one
hero object handed continuously from section to section, cursor-reactive camera, and
per-section cinematic grading.

Everything below is derived from the shipped build: `oryzo.html` (71 KB), the single
`/_astro/hoisted.CRsATKbF.js` bundle (1.07 MB, class names not mangled), `index.TL6TuoJb.css`
(69 KB), and the asset manifest referenced inside them.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Site generator | Astro (static, one `hoisted.*.js` entry, no framework runtime) |
| 3D | **three.js r178 — "modified by Lusion"** (forked; `REVISION="178 - modified by Lusion"`) |
| Scroll | **Custom.** No Lenis, no ScrollTrigger. Own `ScrollPane` / `ScrollManager` |
| DOM animation | GSAP + **SplitText** only (151 refs). No timelines driving 3D |
| UI animation | **Rive** (`/rive/oryzo.riv`, `rive.wasm` + `rive_fallback.wasm`) |
| Post-processing | **Custom.** Own `PostEffect` base + queue. Not pmndrs `postprocessing` |
| Video | Vimeo player, lazy, behind a `#video-overlay` |
| Analytics | Cloudflare beacon only |
| Hosting hints | Cloudflare |

No React, no R3F, no Drei, no physics engine, no GLTF loader. Everything is hand-rolled
against raw three.js.

---

## 2. Page shape

```
<body>
  <canvas id="canvas">          <!-- ONE canvas, fixed, full-bleed, behind everything -->
  <div id="ui">
    <div id="site-content">     <!-- the scroll container, transform: translate3d -->
      <div id="pages-container">
        <div id="home" class="page">
          <div id="hero"       class="section">
          <div id="ai"         class="section">
          <div id="wearable"   class="section">
          <div id="features"   class="section">
          <div id="encryption" class="section">
          <div id="grip"       class="section">
          <div id="sustainability" class="section">
          <div id="testimonies"    class="section">
          <div id="social-content" class="section">
          <div id="product"    class="section">
          <div id="open-weight" class="section">
          <div id="footer"     class="section">
    <header id="site-header">   <!-- fixed chrome -->
    <footer id="site-footer">
    <div id="scroll-indicator">
    <div id="preloader">
    <div id="video-overlay">
```

12 sections. The DOM is ordinary flow markup; the canvas never moves. Every 3D beat is
derived from where a DOM element currently sits on screen.

---

## 3. The scroll system

`class ScrollPane` → `class ScrollManager extends ScrollPane` (singleton `scrollManager`).

**It keeps native scroll.** It does not hijack it:

- `history.scrollRestoration = "manual"`
- Listens to `window.scroll` (passive) to stay in sync with real scroll position
- Adds wheel/touch inertia on top, then writes `translate3d(...)` to `#site-content`
- Keyboard: ArrowUp/Down = ±100px, PageUp/Down = ±1 viewport
- `ResizeObserver` on the content element re-measures
- Tunables: `frictionCoeffFrom = 2.1`, `frictionCoeffTo = 1.9`,
  `frictionCoeffWeightDivisor = 5`, `wheelEaseCoeff = 12`, plus a `snapList`
- `isMoveable` is gated: scroll is frozen while page transition is running, while the
  mobile menu is open, and while the video overlay is open

### `ScrollDomRange` — the primitive everything else is built on

`scrollManager.getDomRange(el)` returns a cached, per-frame-updated object. The important
fields:

| Field | Meaning |
|---|---|
| `ratio` | `-1` = fully below viewport, `0` = filling viewport, `1` = fully above. Clamped. |
| `screenRatio` | same idea remapped `[1 → -1]` across entry→exit |
| `showScreenOffset` | `0` at the moment the top edge touches the bottom of the viewport, `1` when it reaches the top |
| `hideScreenOffset` | mirror of the above for the exit |
| `isActive` | `ratio` within `[-1, 1]` |
| `screenX/screenY`, `left/right/top/bottom`, `width/height` | live rect in scroll space |

It also accepts a **pair** of elements (`getDomRange([a, b])`) to make a range that spans
from the top of `a` to the bottom of `b` — that is how a beat can straddle several blocks.

Everything downstream is one line:

```js
const r = scrollManager.getDomRange(this.domContainer)
const activeRatio = math.fit(r.hideScreenOffset, -1, -0.5, 1, 0)   // 0..1
```

`math.fit(v, inMin, inMax, outMin, outMax, ease?)` and `math.unClampedFit` are the workhorses.
`ease.cubicOut` etc. are passed as the 6th arg. This is the whole "scroll-driven" mechanism —
no timeline library, no scrubbing, just remapped rects.

---

## 4. Scene architecture — the important idea

There is **one** `THREE.Scene`, **one** camera, and **one** render call per frame. Sections
do not own scenes and nothing gets swapped in or out.

```js
properties.camera = new TAAPerspectiveCamera(20, 1, 0.2, 3)   // fov 20, near .2, far 3
```

Note the scale: near/far of `0.2`/`3`. The world is modelled at real-world coaster size in
metres. Depth precision is free.

`class Visuals` holds every scene module, all permanently added to the graph:

```
gobo, bg, heroScene, handScene, wearableScene, tableScene,
sustainabilityScene, stackScene, footerScene, coaster, sketches
```

The frame is three phases:

```js
// App.update(dt)
cameraControls.preUpdate(dt)   // RESET camera to neutral
visuals.preUpdate(dt)          // every scene CONTRIBUTES, weighted by its scroll ratio
cameraControls.update(dt)      // resolve: apply mouse-look, view offset, matrices
visuals.update(dt)             // run the scenes
postprocessing.render(scene, camera, true)
```

And inside `Visuals.preUpdate`:

```js
postprocessing.blendProfile(DEFAULT_POST_PROFILE, 1)  // reset grade
gobo.reset()
coaster.resetTransform()                              // reset the hero object
...every scene's preUpdate()...
postprocessing.syncProfile()                          // push blended grade into effects
```

**This reset-then-blend pattern is the core trick.** Every frame starts from a neutral
state; each scene writes into shared state with a weight equal to its own scroll activity.
Two adjacent sections both partially active produce a genuine cross-fade of camera, object
transform, and colour grade for free — no transition code, no state machine, no "which
section am I in" branching.

### The single shared hero object

`class Coaster` is instantiated once. Every section that wants it writes a named ratio:

```js
featureSectionRatio, encryptionSectionTopToFrontRatio, encryptionSectionZoomRatio,
oryzoProRatio, oryzoProMaxRatio, handSectionHighlightRatio, condomSceneRatio,
stackBlendToImageRatio, coffeeShadowStrength, extraBumpScale, wearableBlendingRatio, ...
```

Its material reads those as uniforms. One mesh, one draw, continuous across the whole page.
The product literally never leaves the screen — that is the thing that makes the site feel
like one shot rather than twelve scroll tricks.

---

## 5. Camera

`class CameraControls` (singleton `cameraControls`).

**Reset (every frame, in `preUpdate`):**
```js
position = (0,0,5); quaternion = identity; fov = 60;
cameraDistance = 1; zoom = 1; viewOffsetX = viewOffsetY = 0; needsClipping = false;
```

**Resolve (in `update`):**
```js
cam.position.copy(this.position)
cam.quaternion.copy(this.quaternion)
cam.fov = this.fov;  cam.zoom = this.zoom

cam.translateZ(-cameraDistance)          // step back to the pivot
cam.quaternion.multiply(mouseLookQuat)   // rotate about the pivot
cam.translateZ(+cameraDistance)          // step forward again

cam.setViewOffset(w, h, -viewOffsetX*w, -viewOffsetY*h, w, h)
```

The `translateZ(-d) → rotate → translateZ(+d)` sandwich means the cursor **orbits the
subject** rather than swivelling the camera in place. That is why the hero reads as
parallax around the coaster instead of a wobble.

**Mouse-look damping:**
```js
let l = 1 - Math.exp(-dt * properties.cameraLookEaseFactor)     // frame-rate independent
l = math.saturate(Math.max(Math.abs(scrollManager.scrollViewDelta) * 10, l))
properties.cameraLookX += (targetX - properties.cameraLookX) * l
```

Note the second line: **the smoothing factor is boosted by scroll velocity.** While the user
is scrolling fast, the mouse-look snaps instead of lagging, so it never fights the
scroll-driven camera move. Subtle, and the reason the two inputs coexist.

**Shipped tuning values** (`class Properties`):
```
cameraLookStrength      = 0.05   // radians — ~2.9°. Deliberately tiny.
cameraLookEaseFactor    = 5
cameraDistance          = 0.01   // default; sections override
cameraShakePositionStrength = 0.5 , speed 0.15
cameraShakeRotationStrength = 0.003, speed 0.3
bgColorHex              = "#100904"
```

**Mobile:** `DeviceOrientationControls` drives a synthetic mouse. Two nested slerps —
a fast target (`1-exp(-dt*10)`) and a slow base (`1-exp(-dt*6)`) — and the *delta between
them* is used as the look input. Result: it self-recentres, so it never depends on the
device's absolute heading and cannot drift.

---

## 6. Baked camera + object animation (`class FrameAnimation`)

This is how every "cinematic" move on the site is authored. The camera is animated in a DCC
(Blender/C4D), then **baked per-frame** and exported to a `.buf` file.

```js
this.cameraAnimation.preInit(cameraControls, "/models/hero_camera.buf")
this.coasterAnimation.preInit(coaster.container, "/models/coaster_hero_animation.buf")
...
this.cameraAnimation.applyTransformByRatio(scrollRatio)   // 0..1 → frame index
```

`applyTransform(f)` floors to `i`, takes `i+1`, and blends by the fraction:
- `position` — `Vector3.lerp`
- `orient` — `Quaternion.slerp`
- `scale` — `lerp`, uniform or per-axis
- `focal` — **real lens focal length in mm**, converted to `fov` via
  `2 * atan(aperture/2 / focal)` with `aperture = 41.4214` at a 2048×1024 reference frame

So the camera is not hand-tuned in code. It is shot in 3D software, with a real lens, and
scrubbed by scroll. The baked animations shipped:

```
hero_camera.buf, coaster_hero_animation.buf, hand_animation.buf,
stack_camera.buf, COASTER_FLIP_ANIM.buf,
featuresAnimations/CAMERA_ANIM.buf, featuresAnimations/COASTER_ANIM.buf,
featuresAnimations/COFFEE_ANIM.buf
```

**This is the single most copyable technique on the site.**

---

## 7. Post-processing

`class Postprocessing` with a queue of `PostEffect`s, in order:

```
TAA  →  Fxaa / Smaa (one active)  →  Bokeh (DOF)  →  AppleEfx  →
PostLayer (magazine)  →  Bloom (+ lens dirt)  →  BlurBox  →
ScreenPaintDistortion  →  Final (grade)
```

`checkTAARenderTarget()` picks the AA: if TAA is running, use FXAA as the cheap companion;
if not, use SMAA (which needs `smaa-area.png` + `smaa-search.png`). MSAA path replaces all
three when available.

### `class PostProfile` — the reason it feels graded

A **blendable bag of grade parameters**, with `blend(other, t)` that `mix()`es numbers and
`lerp()`s hex colours:

```
bloomAmount, bloomRadius (.25), bloomThreshold (.3), bloomSmoothWidth (.75),
bloomLumaStrength, bloomSelectiveStrength, bloomSaturation,
haloWidth (.75), haloRGBShift (.03), haloLeft/Mid/RightColorHex, haloStrength,
haloMaskInner (.3), haloMaskOuter (.5),
vignetteFrom (2), vignetteTo (3), vignetteColorHex,
saturation, contrast, brightness, tintColorHex ("#0044ef"), tintOpacity,
screenPaintDistortion{Amount, RGBShift (.5), ColorMultiplier (20), Multiplier (5)},
cameraMotionBlurAmount,
bokehAmount, bokehFNumber (.181), bokehFocusDistance (4.5),
bokehFocalLength (.344), bokehKFilmHeight (19.26),
smaaThreshold (.05), upscalerSharpness (1)
```

Each scene declares one or more named profiles and blends them by its own scroll ratio:

```js
postprocessing.blendProfile(POST_PROFILE, math.fit(t, 0, .1, 0, 1))
postprocessing.blendProfile(APPLE_PROFILE, this.highlightRatio)
```

Because `Visuals.preUpdate` resets to `DEFAULT_POST_PROFILE` first, the grade of the frame is
just the weighted sum of whichever sections are on screen. Colour, bloom, DOF and vignette
all cross-fade section-to-section without any transition logic.

---

## 8. Bridging DOM and WebGL

Three mechanisms, all worth stealing:

**`class DomGLRect extends Vector4`** — a DOM rect expressed in GL space.

**`blurBox`** — a post-process pass that draws a rounded, blurred, tinted rectangle *anchored
to a DOM element*:
```js
blurBox.anchor(scrollManager.getDomRange(heroCard))
blurBox.x += offset
blurBox.outline = 1
blurBox.color.setStyle("#FFEDD6")
blurBox.colorAlphaA = .15 * a;  blurBox.blurRadiusA = .08 * a
```
The frosted card behind the hero copy is not CSS `backdrop-filter` — it is a WebGL pass that
knows where the DOM element is.

**Shader-side DOM rects** — the hero passes the copy block's rect straight into a uniform so
the 3D can blur *behind the text specifically*:
```js
const o = domCopy.getBoundingClientRect()
u_blurRect.value.set(o.left + o.width*.5, o.top + o.height*.5, o.width, o.height*1.5)
u_blurRectRadius.value = o.height * .75
```

**CSS custom property handoff** — sections push their own scroll ratio back into CSS so DOM
styling can react without JS per-element writes:
```js
domContainer.style.setProperty("--active-ratio", activeRatio)
```

---

## 9. Asset pipeline

Everything is a custom format. There is no glTF, no Draco, no KTX2.

### `.buf` — geometry and baked animation
A length-prefixed JSON header followed by raw typed arrays:
```
[uint32 headerByteLength][JSON header][packed attribute data...]

header = { vertexCount, indexCount, attributes: [
  { id, componentSize, storageType: "Int16Array"|..., needsPack,
    packedComponents: [{ from, delta }, ...] }
]}
```
Attributes are quantised to ints and dequantised on load with a per-component
`from`/`delta`. Zero-dependency parser, tiny payload, and it doubles as the animation
container (attributes `position`, `orient`, `scale`, `focal`).

### `.sog` — 3D Gaussian Splats
`/splats/props.sog` and `/splats/table_reflection.sog`. The `.sog` file is a **stored (method
0) ZIP** parsed by hand from the local-file headers, containing `meta.json` plus image planes
(`LDR_RGB1_0.png`, harmonics webps). Contents: quantised `means` (min/max), `scales`, `sh0`
and `shN` with codebooks.

`class Splats extends Object3D` is a from-scratch three.js splat renderer:
- splat parameters packed into textures (`splatTexture`, `sh0Texture`, `shNTexture`,
  `splatIndexTexture`)
- depth sorting offloaded to a **Web Worker** (`/_astro/SplatsWorker-*.js`), which posts back
  `SORT_DONE` with an index buffer and a `validCount`; the main thread sets
  `geometry.setDrawRange(0, validCount*6)`
- dequantisation uniforms: `means_mins/maxs`, `scales_mins/maxs`, `sh0_mins/maxs`,
  `shN_mins/maxs`
- the splat fragment shader `#include`s `taaJitteringFrag` so splats participate in TAA
- `opacity` and `colorMultiplier` so a splat cloud can be dimmed (the table reflection runs
  at `0.5`/`0.5`)

So the desk, wall, pinboard and props are photographic Gaussian-splat captures, and the
coaster is a shaded polygonal mesh sitting inside them. That mix is what makes the product
read as "photographed" without a full PBR environment.

### Textures
- **RGB + Height packed at runtime**: `textureHelper.loadRGBATexture(DIFF.webp, HEIGHT.webp)`
  merges two webps into one RGBA texture. Cheaper than one webp with alpha.
- **HDR in webp via RGBM**: `loadRGBMTexture("hero/env_hand.webp", { maxRange: 20 })`.
  No `.hdr`/`.exr` anywhere.
- **Mobile variants by convention**: `getMobileUrl(url)` → `foo.webp` becomes
  `foo_MOBILE.webp`. Any loader called with `{ autoMobile: true }` swaps automatically.
- **AVIF when supported**, PNG otherwise (gobo textures).

### Text in WebGL
`class MSDFTextGeometry` + `class TextLayout` with `/fonts/msdf/Inter.json` and
`Inter.webp` — signed-distance-field text rendered inside the 3D scene (uniforms
`uStrokeColor`, `uStrokeInsetWidth`, `uStrokeOutsetWidth`, `uThreshold`).

---

## 10. Motion helpers worth lifting

| Class | What it does |
|---|---|
| `SecondOrderDynamics` | The `f`/`z`/`r` spring (defaults `1.5`, `0.8`, `2`), scalar or `Vector3`, with a stability-clamped "robust" mode. Overshoot and anticipation without a tween library. |
| `BrownianMotion` | fBm handheld-camera drift. `positionFrequency .25`, `positionAmplitude .3`, `rotationFrequency .25`, `rotationAmplitude .003`, 3 fractal octaves. Kills the "dead CG camera" feel. |
| `WiggleSystem` / `WiggleJoint` | Secondary/jiggle bone physics (`stiffness 150`, `damping 10`) uploaded as a `DataTexture` of bone matrices — GPU skinning of the wobble. Used on the hand. |
| `Gobo` | Animated light-cookie projection (`gobo_b_*`, `gobo_c_*` textures, 512² RT, `speed 4`, mouse-reactive). Fake dappled light. Reset every frame like everything else. |
| `Ease`, `Tween` | Tiny in-house tween used for page opacity. GSAP is not used for 3D. |
| `LetterFlippers` | The flip-board text effect in the encryption section. |
| `BlueNoise` | Per-frame blue-noise offset for dithering/sampling. |

---

## 11. Loading and first paint

`class Preloader` draws on a **2D canvas**, not WebGL — so the loader is alive before any GL
context work happens.

Progress is split:
- **90%** asset loading (`_targetPercent` from the loader), with a `MIN_PRELOAD_DURATION = 1s`
  floor so it never flashes
- **10%** shader compilation: `properties.compileList` is drained one material per frame via
  `renderer.compileAsync(mesh, camera)`

That second part is the reason the first scroll has no hitch — every shader the page will
ever need is compiled behind the progress bar, not on first appearance.

Loader items carry a `weight` so big textures dominate the bar honestly
(`smaa-area.png` weight 32, `smaa-search.png` weight 0.1).

---

## 12. Performance and capability handling

```js
DPR              = Math.min(1.5, devicePixelRatio)   // hard cap
USE_PIXEL_LIMIT  = true
MAX_PIXEL_COUNT  = 2560 * 1440                       // then downscale + sharpen
webglOpts        = { antialias: false, alpha: false, xrCompatible: true }
```

- `antialias: false` always — AA is done in the post queue instead.
- WebGL2 preferred with `HalfFloatType` render targets; WebGL1 fallback probes
  `OES_texture_float` / `OES_texture_half_float` and falls back again to
  `USE_FLOAT_PACKING` (encoding floats into RGBA8) if neither exists.
- `class Support` gates on browser + WebGL and shows an explicit unsupported message
  (`device` / `browser` / `webgl` — three different messages).
- Bloom drops `USE_HD` without `*_texture_float_linear`; `Bokeh.quality = isMobile ? 0 : 1`.
- Mobile takes `_MOBILE` texture variants, a 4-column grid, and device-orientation camera.
- Section DOM is `visibility: hidden` when its `ScrollDomRange.isActive` is false —
  offscreen sections cost nothing to style.

### Dev flags shipped to production

`class Settings` parses `window.location.search`, so these work on the live site:

```
?SHOW_FPS=1        ?IS_DEV=1        ?LOOK_DEV_MODE=1
?HIDE_UI=1         ?SKIP_ANIMATION=1
?DPR=1             ?UP_SCALE=1      ?USE_PIXEL_LIMIT=0
?JUMP_SECTION=grip&JUMP_OFFSET=0.5
```

`JUMP_SECTION` is the useful one — deep-link straight to a section for review. There is also
a `class GUI` (dat.GUI-style) and `PostProfile.addGui()` wired up, plus `class ImageExporter`
for grabbing frames. Worth copying wholesale as a workflow.

---

## 13. Design system (CSS)

**Fonts:** `halyard-display-variable` + `halyard-text-variable` (Typekit) for UI,
self-hosted `DM Mono 400` for labels/specs, `Literata` for the editorial/magazine block.

**Palette** (dark, warm, no pure black or white in the base):
```css
--color-black:        #100904;   /* page ground, also the WebGL clear colour */
--color-white:        #ffedd7;   /* warm off-white — the "white" */
--color-brown:        #382416;
--color-grey-brown:   #6c5f51;
--color-green:        #445231;
--color-green-light:  #5d6c49;
--color-green-lightest: #f6e0c6;
--color-orange:       #dc5000;   /* the single accent */
```

**Fluid unit** — the sharpest idea in the CSS:
```css
--screen-unit: min(
  var(--inner-width) / (1920 - 60*2),          /* width-driven */
  calc(var(--vh)*100) / 1024 * 1.25            /* height-driven */
);
```
Type scales with **whichever axis is tighter**, so a short wide window shrinks the type
instead of overflowing it vertically. Every size is `calc(N * var(--screen-unit))` where `N`
is the literal pixel value from the 1920×1024 design file — the design comp maps 1:1 to code.

```
--h1 164   --h2 68   --h3 45   --h4 32   --h5 20
--sub1 24  --sub2 16
--body1 38 --body2 24 --body3 18
--quote 30 --link-header 16 --btn 16 --default 18
```

Mobile (`≤767.98px`) redefines `--screen-unit` against a 375px comp and drops the whole
scale (`--h1: 96`), plus `--grid-columns: 16 → 4`.

**Grid:** a 16-column grid where gap and column widths are derived from a single ratio
(`--grid-gap-scale: 24/90`), exposing `--grid-span-1` … `--grid-span-16` as ready-made
widths. `--site-padding-x: 3.125vw`.

**Structural motifs:** `.o-container`, `.o-grid`, `.o-dashline` (the dashed rules used as
section separators everywhere), `.desktop-only` / `.mobile-only`, `.prevent-select`.

---

## 14. Content and tone

The narrative arc is a straight parody of an AI model launch, and each beat is a different
3D idea:

| # | Section | Beat | 3D |
|---|---|---|---|
| 1 | `hero` | "Made for mugs. Built for tables." | Splat desk + coaster, baked camera, video CTA |
| 2 | `ai` | "It's the result of unprecedented AI\* breakthroughs" (\* *Adobe Illustrator*) | Hand model, hover-reactive, wiggle bones |
| 3 | `wearable` | "So portable, it's wearable" — a fake magazine spread | Gallery, frame animation, `PostLayer` |
| 4 | `features` | Lift / thermal / circularity, with a fake temperature slider (`T = 10 / 1 / 0.1` — LLM sampling temperature) | Baked camera + coaster + coffee animations |
| 5 | `encryption` | "Smart flip encryption. Write a message. Flip." | `LetterFlippers`, coaster flip animation |
| 6 | `grip` | "Friction coefficient (est): 0.80", microscope zoom | Zoom box, micro-texture, a tardigrade |
| 7 | `sustainability` | Cork facts (25 years, 9 years, 0 W) | Bark scene, SDF text |
| 8 | `testimonies` | Five fake reviews (astronaut, pirate, AI influencer…) | DOM table + `TestimoniesStars` |
| 9 | `social-content` | Horizontal card rail of fake social posts | Scroll-driven X translate |
| 10 | `product` | ORYZO / Pro / Pro Max — 1, 2, 3 cork layers | `StackScene`, `stack_camera.buf` |
| 11 | `open-weight` | Fake arXiv page: Abstract, BibTeX, "WoodenBench", Peer Review | Sketches |
| 12 | `footer` | The reveal + the pitch | `FooterScene` |

Recurring jokes, all delivered as real spec-sheet UI: *Connectivity: None. Pairing: Not
Required. Updates: Never.* / *Runs on RTX 3090* / *Legacy Support: backward compatible since
the 5th millennium BCE* / *Drop-Tested — Damage: The Floor ;)*.

Disclaimer is present and explicit in the footer: *"This entire site is a fictional creative
project by Lusion. Oryzo doesn't exist."*

---

## 15. What to take for the v2 portfolio

Ranked by value-per-effort:

1. **Reset-then-blend frame.** One scene, one camera. Every frame: reset camera + hero
   transform + post profile to neutral, then let each section contribute weighted by its own
   `ScrollDomRange`. Cross-fades come free; there is no transition code to write or debug.
   This is the architectural decision that makes everything else cheap.

2. **`ScrollDomRange`.** ~40 lines. `getDomRange(el)` → `ratio` / `showScreenOffset` /
   `hideScreenOffset`, plus `math.fit(v, a, b, c, d, ease)`. Replaces ScrollTrigger entirely
   for driving 3D, and it is far easier to reason about.

3. **Baked camera animation.** Animate the camera in Blender with a real lens, bake per-frame
   position/quaternion/focal, export, and scrub by scroll ratio. Directly answers "scroll-driven
   model transitions" — and the wizard GLBs can be posed the same way.

4. **Orbit-style mouse-look with velocity-boosted damping.** The
   `translateZ(-d) → rotate → translateZ(+d)` sandwich, `1 - exp(-dt*k)` smoothing, and
   `max(|scrollDelta|*10, k)` so the cursor never fights the scroll. `lookStrength = 0.05 rad`
   — small numbers.

5. **Blendable `PostProfile`.** One flat object of grade parameters with `blend(other, t)`.
   Gives every section its own look with no per-section pipeline.

6. **Preload = assets + `compileAsync`.** 2D-canvas loader, and drain a shader compile list
   one material per frame behind the last 10% of the bar.

7. **`--screen-unit: min(width-based, height-based)`.** Comp pixel values map 1:1 into
   `calc()`. Cheapest possible fluid type system, and it does not break on short windows.

8. **Dev query flags in production.** `?JUMP_SECTION=`, `?SHOW_FPS=1`, `?SKIP_ANIMATION=1`,
   `?DPR=1`. Ten lines of `URLSearchParams` that pay for themselves in the first hour of
   iterating on a scroll site.

Things to **not** copy: the Gaussian-splat pipeline (needs a capture rig and a custom sorter
worker), the fork of three.js, and the custom `.buf`/`.sog` formats — glTF + Draco is fine at
portfolio scale. Take the architecture, not the asset engineering.

---

## 16. Sources

- Live site: <https://oryzo.ai/>
- Studio: <https://lusion.co/>
- The in-joke repo linked from the site: <https://github.com/lusionltd/ORYZO-1>
- Analysed build: `oryzo.html`, `/_astro/hoisted.CRsATKbF.js`, `/_astro/index.TL6TuoJb.css`,
  `/_astro/SplatsWorker-DSMxtdkh.js` (fetched 2026-09-01)

All class names, defaults and shader/uniform names quoted above are read directly from the
shipped bundle, which is minified but not name-mangled.
