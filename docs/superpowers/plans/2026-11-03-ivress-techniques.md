# Plan — techniques from brand.ivress.co.jp, adapted to the v2 portfolio

**Date:** 2026-11-03
**Source studied:** https://brand.ivress.co.jp/en/ (found via landing.love), live build, desktop 1440×900 and mobile 390×844.
**Method:** drove the page in Playwright (loader, click-to-start, full scroll of all 9 chapters, cursor movement, press-and-hold), read the network waterfall and `performance` resource sizes, and grepped the shipped bundles (`_astro/site.*.js`, `renderer.*.js`, `loader.*.js`, `CommonScripts.*.js`, `index.*.css`). Class names are minified, but string literals, uniform names and debug-GUI labels survive, which is where most of the findings below come from.

Part A is the teardown. Part B is the plan. Part B is constrained by the locked decisions in `portfolio-v2-redesign-decisions` and `docs/redesign/ARCHITECTURE.md`: clean recruiter shell, 3D is decoration and never content, the site stays complete with WebGL off, no GSAP and no Lenis.

---

## Part A — Teardown

### A1. What it is

A Japanese company's brand-story site, told as a wordless myth in 9 chapters: Prologue, Encounter, Power, Oath, Bond, Trial, Expansion, Spiral, IVRESS. It has one screen and one canvas. Scrolling advances a single continuous WebGL film, and the DOM supplies only the captions and the HUD. At the end it fades to black and loops back to the Prologue.

### A2. Stack

| Layer | Choice | Evidence |
|---|---|---|
| Site generator | Astro, static, with EN/JP routes | `/_astro/*` bundles, `CommonScripts.astro_astro_type_script…` |
| 3D | three.js **r182** with `WebGPURenderer`, falling back to WebGL2 (`forceWebGL: !isWebGPU`), and **TSL** node materials | `window.__THREE__ = "182"`, TSL deprecation warnings, `forceWebGL` in `renderer.*.js` |
| Scroll | **Lenis 1.3.17** smooth scroll over a native 20,700 px document, plus a `virtualScroll` value | `html.lenis`, `window.lenisVersion` |
| Tweening | **GSAP 3.13** | `window.gsapVersions` |
| Audio | **Howler**, plus a hand-built Web Audio graph | `Howl` ×43, `createConvolver`, `createBiquadFilter` |
| Assets | Draco and KTX2 (Basis) transcoders, EXR baked lighting, Opus audio | `/draco/*.wasm`, `/basis/*.wasm`, `*.exr`, `*.opus` |
| Debug | A GUI panel ships in production: folders such as "Scene5 Wraith World", "Sky Particles", "Show Curves", "saveLights" | string literals in `site.*.js` |

### A3. Page shape and flow

1. **Loader.** A black screen shows the tagline "Here lies a world that rejects the light", a `progressbar` with a percentage, and `loader.png`. `history.scrollRestoration = 'manual'` and `scrollTo(0,0)` force the start position.
2. **Title card.** "THE MYTH OF / IVRESS / A WOVEN MYTH" is set in a very condensed display serif. It reveals letter by letter, with each glyph its own span, over the dark Prologue bridge scene. Scrolling is locked (`lenis-stopped`).
3. **CLICK TO START.** A circular ring button. The click unlocks audio, starts Lenis, auto-scrolls about 280 px into chapter 1 and swaps the title for the HUD.
4. **HUD.** Top left shows the chapter name ("PROLOGUE"). Its letters roll vertically between chapters, because the snapshot shows all nine names stacked in one list. Bottom left shows a large condensed numeral "01" with a small "/09". Each digit is a 0–9 strip that translates, like an odometer. Bottom right says "SCROLL TO CONTINUE". Top right holds SOUND (an animated bars icon) and JP.
5. **Chapters.** One caption line per chapter, centred near the bottom, in Josefin Sans. It reveals **word by word from `blur(12px)` to `blur(0)`**, so mid-scroll frames show half-blurred words. Chapter by chapter:
   - 01 Prologue: a lone figure with a glowing scarf on a stone bridge under arches. Cold blue, with a shaft of light at the far door.
   - 02 Encounter: a fresnel orange sphere (bubble) holding a captive spirit. A blue fog ground, then a warm gold arena ringed with stones and shadow monsters with glowing eyes.
   - 03 Power: a burst of cyan particles rises from a white pyramid, then forms constellation-like shapes.
   - 04/05 Oath and Bond: grey dusk landscape. A gold particle ribbon flows along a curve from the hero to a distant glowing castle.
   - 06 Trial: a grey world full of eyes, and a shadow army. A sword of light fills the frame. A **HOLD TO INTERACT** ring appears.
   - 07 Expansion: the castle as a sculpture of gold dust with god rays. A particle "carpet" spreads over the hills, and light lines draw paths between settlements.
   - 08 Spiral: the whole frame twists into an orange vortex, a domain-warped swirl centred on the castle.
   - 09 IVRESS: the vortex contracts into a sphere and the camera pulls back into space. Glassy planets drift past. The IVRESS logo sits inside the sphere, with a footer (Corporate Site, Careers, Contact, Privacy, socials).
6. **End.** The screen fades to black, then **loops back to the Prologue** (`canWebsiteLoopBack`, `isLoopingBack`, `scene1FadeoutActive`).

### A4. Scroll system

- Lenis smooths native scroll. A global store holds `scroll`, `virtualScroll`, `scrollDirection`, `currentIndex`, and per-section progress uniforms (`sections.oneProgress`, `twoProgress`, … `lockedSixthProgress`, `fourthProgress`). The shader graph reads these directly, as in `oneProgress.smoothstep(.9,.97)`.
- **Idle autoscroll** (`autoscrollEnabled`, `autoscrollSpeedMultiplier`): leave the page alone and it plays itself.
- Each chapter is a scroll range, and transitions are `smoothstep` windows over the section progress.
- All captions are `position: fixed` overlays that are always present in the DOM. Visibility is driven by per-word opacity and blur, not by document flow. That is why every caption reports as "visible" at every scroll position.

### A5. Scene architecture

- **6 scenes, 6 GLBs plus 6 camera GLBs** (`scene1.glb`, `scene1_cam.glb`, …). Each camera is a Blender-animated camera, exported separately and **scrubbed by section progress** (`clipAction`, "Progress t"). This is the same pattern as oryzo's `FrameAnimation`, and the pattern v1 of this portfolio was deleted for.
- **Lights live in the GLB plus a JSON override** ("GLB lights: 7 Config lights: 8"). A debug panel edits lights live and saves them (`saveLights`, `exportJSON`).
- **Scene 2 uses baked lighting:** `ivress_scene2_bake_clean.glb` plus `ivress_scene2_bake_packed.exr` plus a 580 KB JSON describing the packing.
- **Characters** use VAT (vertex animation textures) playback ("VAT Playback"), morph targets, and a "scarf assembly" driven by `fourthProgress`.
- **Particles** are GPU systems built with TSL `compute()` and `storage` buffers on `InstancedMesh`. Debug labels include "Scene3/4/6 Particles", "Sky Particles", "curl frequency / amplitude / time scale", "noise scale / amp (fine)", "paths_spread", and "Found 15 curves in scene6_curve". Particles **flow along authored Blender curves with curl-noise offset**: the gold ribbon, the settlement paths, and the castle dust.
- **Fresnel sphere** (`sphere_fresnel`, `wraith_world_sphere`) for the bubble and the end-sphere.
- **Fog** comes from a fake fog plane plus per-section mist (`mists.element(currentIndex)`) and per-section far thresholds and colours, which are uniform arrays indexed by chapter.
- **`scenes_array.ktx2`** is a texture array, sampled with depth `(index+1) mod 5` and noise-warped UVs. It is used as an overlay and transition texture between scenes.

### A6. Post-processing (`renderer.*.js`)

The chain is a scene pass, then fog factor, then **bloom**, then tone mapping, then **vignette** (aspect-corrected), then **grain**. On top of that:
- **A structure-tensor filter** (`structureTensorNode`). This is an anisotropic Kuwahara painterly filter, and it is why the 3D reads as illustration rather than CG.
- **Cursor fluid simulation**, desktop only: stable-fluids at `simRes 128`, `dyeRes 512`, 4 pressure iterations, `curlStrength 20`, `pointerScale 45`, `distortionStrength 0.015`. It distorts the final image where the cursor moves, as a faint smoke-swirl.
- **Shader warmup.** `warmupFramesPerSection = 3` and `warmupTotalSections = 6`. Behind the loader, the renderer draws every section for 3 frames so that each pipeline compiles before the user reaches it. Without this, the first entry into each chapter would hitch.
- **Scissor and overlay render target** for the HUD-layer camera (`cameraOverlay`).

### A7. Interaction

- **Cursor:** fluid distortion (A6) plus a pointer-lerped value fed to scenes (`pointerLerp`, `pointerPosition`).
- **Hold to interact (Trial chapter).** Pressing and holding **anywhere** tweens `holdProgress` 0 to 1. The grey world lifts and inverts. A black-hole sphere grows ("Wraith World"), and a **second, gold-coloured caption** blurs in ("A shadow that tests the traveler…"). Releasing tweens it back. It is a hidden layer of lore behind the main story.
- **SOUND toggle** with bars-icon animation, and a **JP/EN** switch.

### A8. Audio

Music comes in 3 Opus parts (about 400–500 KB each). Ambient loops ("chimes-particles-forest-amb", "whoosh-loop", "whoosh-epee-loop") and a start SFX play through Howler. **On chapter transitions, a high-pass filter sweep plus convolution reverb** (from `impulse_response.mp3`) is wet/dry-mixed in, so the soundtrack "washes" as scenes change. The click-to-start gate exists for the audio unlock.

### A9. Design system

| Token | Value |
|---|---|
| Black | `#000203` |
| White | `#FAF5F0` (warm off-white) |
| Highlight | `#f9b639` (gold, used for the hold-layer caption) |
| Display | "Basilia Compress D" (self-hosted woff2), an ultra-condensed high-contrast serif |
| Body | Josefin Sans (Google Fonts), with wide tracking on labels |
| JP story | A-OTF Ryumin Pr6N |
| Main ease | `cubic-bezier(.25, 1, .5, 1)` (out-quart). Also `cubic-bezier(.19, 1, .22, 1)` (out-expo) |
| Text reveal | `filter: blur(12px)` to `blur(0)` with opacity, staggered per word or letter |
| Breakpoints | 1024 / 980 / 768 / 767 / 579 / 420 / 380 / 375 / 374, plus `(pointer: fine)` for cursor-only behaviour |

Mobile runs the same experience in a centred portrait layout. The canvas is capped at DPR 1 in the test (390×844 drawing buffer).

### A10. Weaknesses (do not copy)

- **About 60 MB transferred.** `scene4.glb` alone is 14 MB, `scene5.glb` 10 MB, and `fog.png` 3.2 MB as a PNG. Everything is preloaded behind the loader, so first meaningful paint waits on all of it.
- **No `prefers-reduced-motion` handling** anywhere in the CSS or JS. There is no reduced path at all.
- **Content is hostage to WebGL.** The captions exist in the HTML (good for SEO), but they are only readable while the film plays.
- **Click-to-start gate** before any content, plus **idle autoscroll** and a **loop**. All three take control away from the reader.
- Shipped debug GUI code, a 404 on `site.webmanifest` and `apple-touch-icon.png`, a WebGPU blending error on mobile ("SubtractiveBlending requires material.premultipliedAlpha"), and about 35 deprecation warnings.

---

## Part B — Dev plan

### B0. Fit check against locked decisions

IVRESS is a *scroll-film*: the page **is** the 3D, and the copy is subtitles. The v2 portfolio deliberately is not that. v1 was a scroll-driven world, and it was deleted because content was buried in the rig. So this plan **does not** adopt the scroll-film structure, the baked camera scrubbing, the click-to-start gate, the autoscroll or the loop. It lifts the **craft layer**: type motion, HUD, grade, particles, warmup and one hidden interaction. Each of these attaches to what already exists: `useSectionObserver`, `scrollState.smooth`, `tint.ts`, `wizardState`, `Stage.tsx`'s `EffectComposer`, and the `stageGate.ts` capability gate.

There is **no stack migration.** WebGPU and TSL would mean three r169 to r18x plus R3F v9 / React 19, which is a separate project for no recruiter-visible gain. Every effect below is written in GLSL on the existing WebGL renderer.

Constraints that apply to every task:
- The site stays complete with WebGL off, with reduced motion, and with Save-Data on (`shouldRenderStage`).
- Under reduced motion, every DOM animation shows its end state immediately. `Reveal` already does this, so new code follows the same pattern.
- No model or particle overlaps copy on mobile.
- Motion changes are verified by reading the frame loop and by unit tests on the state functions, **not by still screenshots** (see `screenshot-verification-blind-spot`).
- No new dependency unless a task says so. GSAP and Lenis are explicitly excluded.

### Phase 1 — DOM craft (no WebGL, highest value per hour)

**Task 1.1 — Word-by-word blur reveal.**
- Files: `frontend/src/components/ui/Reveal.tsx`, `Reveal.css`, `Reveal.test.tsx` (new if absent).
- Add `split?: 'words'` to `Reveal`. With it set, wrap each word of a *string* child in `<span class="reveal-word" style="--i:n">`. The full text stays in the DOM, so screen readers read one string: put `aria-label` on the wrapper and `aria-hidden` on the spans.
- CSS: each word goes from `opacity:0; filter:blur(12px); transform:translateY(.2em)` to the shown state. Use `transition-delay: calc(var(--i) * 40ms)` and the easing `cubic-bezier(.25,1,.5,1)`, defined once as `--ease-out-quart` in the global tokens. Cap the total stagger at about 600 ms on long paragraphs.
- Use it on: the hero subline, and section intro lines. Do not use it on body paragraphs or project cards, because recruiters scan those.
- Test: reduced motion renders shown, the split keeps the accessible text intact, and non-string children fall back to whole-block reveal.

**Task 1.2 — Section counter HUD (the "01/09" odometer).**
- Files: new `frontend/src/components/layout/SectionCounter.tsx` and `.css`, mounted in `App.tsx`. It reuses `SECTION_IDS` and `useSectionObserver`.
- Bottom-left fixed: a large numeral in the display face, then "/0N". Each digit is a vertical 0–9 strip translated by `translateY(-digit * 1em)` with `--ease-out-quart`. Above it sits the section name, which rolls via the existing `useScramble`, or the same strip technique applied to words.
- `aria-hidden="true"`, because `Nav` already carries the real navigation state. Desktop and `(pointer: fine)` only. It hides on mobile, where it would collide with copy and the chat dock. Under reduced motion, it swaps with no roll.
- Test: digit-to-offset is a pure function and gets unit-tested. The observer-to-index mapping reuses `useSectionObserver`'s tests.

**Task 1.3 — Hero title letter reveal.**
- Files: `frontend/src/components/site/Hero.tsx` and its CSS.
- Per-letter spans with the same blur-and-rise and a staggered delay, played once on load. Only the name line gets this treatment. `aria-label` keeps it one word.
- Check against the hero exit motion (`heroExitProgress` in `lib/scrollState.ts`, tested by `three/heroExit.test.ts`) so the two do not fight. The reveal finishes before any exit can start.

**Task 1.4 — Film grain overlay (CSS, not a post pass).**
- Files: global CSS plus one small tiling noise asset (about 128×128 WebP, under 10 KB).
- `body::after` gets a fixed, `pointer-events:none` grain at about 4–6% opacity with `mix-blend-mode: overlay`. It animates with `steps(6)` background-position jitter. Under reduced motion it stays static.
- Why CSS: `Stage.tsx` deliberately runs the `EffectComposer` on the hero only, as its comments explain. A grain post pass would either cover the hero alone or force the composer on for the whole page. A CSS layer covers DOM and canvas uniformly at roughly zero GPU cost.

### Phase 2 — WebGL polish (cheap, low risk)

**Task 2.1 — Shader and pipeline warmup.**
- Files: `frontend/src/three/Stage.tsx` or `SceneDirector.tsx`, plus `modelReadiness.ts`.
- After models load, before `markModelReady`, call `await gl.compileAsync(scene, camera)` for every rig and material state a section can show, including casting and tinted states. IVRESS renders 3 frames per section behind its loader for the same reason. `WebGLRenderer.compileAsync` exists since r158 and uses `KHR_parallel_shader_compile` where available. Kick it off from the existing `whenIdle` so that it cannot block first paint.
- Verify: add a test that the readiness latch waits for compile. Then manually confirm on a cold load that the first scroll into each section shows no hitch. Note that rAF timing *is* measurable here (`perf-unmeasurable-in-this-sandbox`), so a frame-time probe across the first transition is valid evidence.

**Task 2.2 — Per-section fog and grade crossfade.**
- Files: `frontend/src/three/tint.ts`, `Backdrop.tsx`.
- Extend `TINTS` from one colour to `{ base, mist, glow }` per section, the same idea as IVRESS's `mists[currentIndex]` uniform arrays. `Backdrop` damps all three toward the active section's values through the existing `damp` and smoothed-scroll channel.
- Keep the neighbour-separation property that `tint.test.ts` asserts, and extend the test to cover the new fields.

### Phase 3 — Signature moment: spell-dust formation

This is the one big lift. It is IVRESS's gold-dust castle and particle ribbon, rebuilt around the wizard.

**Task 3.1 — Particle field component.**
- Files: new `frontend/src/three/SpellDust.tsx`, `spellDust.glsl.ts`, `spellDust.test.ts`.
- One `THREE.Points` draw call. Positions are sampled once from the wizard GLB surface with `MeshSurfaceSampler` (from `three/examples/jsm`, already installed with three) to form shape A. Shape B is a target set, a sigil sampled from an SVG path or a second mesh.
- The vertex shader mixes A and B by a `uMorph` uniform, adds 3D curl noise scaled by `uTurbulence` and per-particle delay, and uses additive blending for gold sparkle that `Bloom` picks up. All animation happens on the GPU. The CPU updates only uniforms.
- Budget: about 20k points on desktop and about 5k on mobile, chosen in `rigs.ts` next to the existing model gate. Pause the update when the page is hidden (`usePageVisible`).

**Task 3.2 — Trigger and choreography.**
- Drive `uMorph` and `uTurbulence` from **state**, not scroll fractions. When `wizardState.mode === 'casting'` (the chatbot is replying), dust lifts off the wizard, swirls, and settles back. When the Contact section is active, dust assembles into the sigil. Use the `damp` easing that is already in place. Add no timeline library.
- Test: the uniform targets are a pure function of `(mode, activeSection)` and are table-tested, in the same style as `choreography.test.ts`.

### Phase 4 — Optional (only after Phases 1–3 ship and he asks)

**Task 4.1 — Hold to reveal ("true sight").** The IVRESS "Wraith World" pattern. On the hero only, pressing and holding a visible "Hold to see" ring button, or holding Space while it has focus, tweens a `holdProgress`. The grade desaturates and inverts, the wizard's eyes and wand glow, and one gold `--hl-color` line blurs in. That line must come from his real content. Releasing reverses it.
- It is desktop and pointer:fine only, plus the keyboard path. Long-press on touch fights text selection and the context menu.
- Moeez supplies the line, and none is invented. This depends on the open items in `portfolio-v2-redesign-decisions`.

**Task 4.2 — Cursor fluid distortion.** A stable-fluids sim at 128×128 feeding a screen-space UV distortion of about 0.015 in the hero composer only, gated on `(pointer: fine)`. GPU cost is **not measurable in this sandbox**, so it ships behind a flag only after Moeez checks it on real hardware.

**Task 4.3 — Painterly filter.** A Kuwahara pass on the hero backdrop for the illustrated look. It is expensive and the gain is uncertain, so it is an experiment only.

### Explicitly skipped (with reason)

| IVRESS feature | Why not |
|---|---|
| Scroll-film structure, baked camera GLB scrubbing per scene | This is exactly what v1 was deleted for. Content would get buried again. |
| Click-to-start gate | It blocks recruiters from content. It exists for audio, which is also skipped. |
| Idle autoscroll and the end-of-page loop | It takes control from the reader and breaks Footer and Contact as the end. |
| Sound design (Howler, HPF and reverb transitions) | Audio on a portfolio is a net negative for the audience. Revisit only if he asks for it explicitly, and then make it opt-in and lazy. |
| WebGPU / TSL migration | It needs three r18x plus R3F v9 / React 19, which is a separate project with no visible gain. |
| VAT character animation, baked EXR lightmaps | The models are already optimised GLBs with materials. There is no authored animation pipeline to feed them. |
| Lenis and GSAP | Excluded by an existing decision. `damp` plus one rAF loop already covers smoothing. |
| 60 MB preload | The opposite of the budget. Models stay at about 1 MB, lazy, behind `stageGate`. |

### Order, effort, and done-criteria

| Phase | Tasks | Rough effort | Done when |
|---|---|---|---|
| 1 | 1.1–1.4 | 1–2 sessions | Tests pass. Reduced-motion and no-WebGL paths are complete. Mid-transition frames have been captured deliberately and look right. |
| 2 | 2.1–2.2 | 1 session | No first-entry hitch in a frame-time probe. `tint.test.ts` is extended and green. |
| 3 | 3.1–3.2 | 2–3 sessions | One draw call. The budgets hold under `rigs.ts`. Uniform choreography is table-tested. Dust never covers copy on mobile. |
| 4 | any | per request | Moeez signs off on real hardware. |

Ship each phase with `./ship` (gates, then push to both accounts, then `vercel --prod`), never as separate push and deploy steps.

### Open questions for Moeez

1. **Shape B for the dust sigil.** Options are his initials, a logo mark, or a wand-rune. He supplies or approves it, and none is invented.
2. **Hold-to-reveal line (Task 4.1).** It must come from his real material, if he wants the feature at all.
3. **Display face.** IVRESS's condensed serif (Basilia Compress) is licensed and not to be reused. Should the counter and title use the existing display face, or does he want a condensed one (for example a free condensed serif from Google Fonts)?
