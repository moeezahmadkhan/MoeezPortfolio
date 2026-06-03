# Wizard GLB improvement — spec (2026-06-03)

Improve `public/models/wizard.glb` (the hero figurine) for the candlelit wizarding portfolio.

## Source asset
- Single fused Tripo mesh, 1 PBR material, 1 set of baked textures.
- 266,261 verts / 501,160 faces.
- Textures: 3 × 4096² JPG (basecolor, normal, roughness-metallic).
- File size: ~16 MB. Bounds (Blender Z-up): x[-0.355,0.355] y[-0.259,0.259] z[-0.5,0.5], centered at origin.
- Chibi Harry-Potter style: curly hair, round glasses, grey robe, wand with a ball tip in the right hand.

## Goals (approved)
1. **Web optimization, quality-preserving.** Keep full geometry; rely on Draco mesh
   compression + texture downscale 4096²→2048². Target ~3–4 MB, no visible quality loss.
2. **Glowing eyes** — *subtle warm* inner light at the eyes (behind glasses). Reads as
   "lit from within", catches the scene Bloom. Not supernatural.
3. **Magic wand** — *gold* emissive glowing orb baked at the wand tip + a few tiny emissive
   spark specks. Plus an **animated in-scene effect** (small pulsing pointLight + drei
   `Sparkles`) at the tip, wired in `WizardModel.tsx`.

## Method
- Headless Blender (`blender --background --python tools/improve_wizard.py`); Blender 4.0.2.
- Eyes/wand tip located in model space via a render-verify loop (render → view → adjust coords).
- Glow geometry added as separate objects with materials named `Glow_*` so they're identifiable.
- Export: glTF binary, 2K textures, original material/textures preserved.
- Geometry compression: this Blender build ships **without the Draco library**
  (`libextern_draco.so` missing), so compression is applied afterwards with
  `gltf-transform` (weld + dedup + **meshopt**). drei's `useGLTF` decodes meshopt
  by default with a bundled decoder — no external CDN (Draco would need the gstatic CDN).
- Full pipeline is one command: `tools/build_wizard.sh`.

## Result (verified)
- **16.0 MB → 3.6 MB** (~4.4×), full geometry + quality preserved.
- Extensions: `EXT_meshopt_compression`, `KHR_materials_emissive_strength`, `KHR_mesh_quantization`.
- `npm run build` passes; headless Chrome (puppeteer-core + SwiftShader) confirms the model
  decodes and renders in-scene with the wand magic glowing gold + animated sparkles, no console errors.

## Runtime coupling (important)
`WizardModel.tsx` traverses every mesh and overrides `emissive`/`emissiveIntensity`.
That would clobber the new glow. The traversal must **skip materials whose name starts
with `Glow_`** so the baked emissive eyes/wand survive. The wand-tip scene FX
(pointLight + Sparkles) is added inside the same `<Center>` group, at the tip's scaled
local coords (tunable constant).

## Deliverables
- `public/models/wizard.glb` — improved (original backed up to `public/models/wizard.original.glb`).
- `tools/improve_wizard.py` — repeatable Blender script.
- `WizardModel.tsx` — glow-preserving traversal + wand-tip FX.

## Verification
- Render front / 3-quarter / face / wand close-ups after changes and inspect.
- Confirm final file size and that `npm run build` passes and the model still loads.
