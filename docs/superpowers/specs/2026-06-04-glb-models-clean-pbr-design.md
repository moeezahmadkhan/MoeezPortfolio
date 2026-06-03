# Design: Clean-PBR + Web-Optimization Pass for Wizard & Cricket GLB Models

**Date:** 2026-06-04
**Status:** Approved (pending Blender MCP connection)

## Goal

Improve the visual design/style of two Tripo-generated GLB models to a **modern, clean
PBR** look while making them **lightweight enough for real-time three.js** on the web.

## Source assets

| Model | Verts | Faces | Texture | Size |
|-------|------:|------:|---------|-----:|
| `wizard figurine 3d model tripo moeez.glb` | 266K | 501K | 4096² base-color only | 16 MB |
| `cricket player 3d model.glb` | 246K | 459K | 4096² base-color only | 15 MB |

Located in `~/Desktop/DevSteem Blender/3js/`. Consumed by this portfolio
(`frontend/public/models/`). Each is a single dense triangle mesh with one PBR material
whose only map is a base-color texture with lighting/AO baked into the albedo → visually
flat and far too heavy for real-time.

## Approach (B — full optimize + clean PBR)

Per-model pipeline, executed in Blender via the blender-mcp bridge:

1. **Import** the GLB into a clean scene.
2. **Fix misaligned eyes** — inspect via viewport screenshots; correct geometry asymmetry
   and/or texture/UV misplacement so the eyes read correctly.
3. **Decimate** ~500K → ~80–120K tris, silhouette-preserving. Keep the original high-poly
   as a bake source.
4. **Bake a normal map** from the original high-poly onto the decimated mesh so surface
   detail survives the reduction.
5. **Clean PBR material** — dedicated roughness (not baked-flat), normal map wired,
   correct color spaces (base color sRGB, normal/roughness non-color), 2K textures.
6. **Studio lighting + camera viewpoint** — set up clean lighting and a good viewpoint;
   iterate against viewport screenshots until it reads well.
7. **Export** optimized GLB with meshopt/Draco compression. Target ~2–3 MB each.
8. **Place** results in `frontend/public/models/`.

## Workflow

Screenshot-driven iteration: after material/lighting/eye edits, capture the Blender
viewport, review, refine. Geometry is reduced but likeness is preserved (not re-generated).

## Success criteria

- Eyes visually aligned/correct on both models.
- Clean PBR response (proper roughness + normal map), modern studio look.
- Each exported GLB ≈ 2–3 MB, ~80–120K tris, loads/performs smoothly in three.js.
- Likeness of original figurines preserved.

## Out of scope

- Quad retopology / full re-bake of all maps (Approach C).
- Re-generating the models via Tripo/Hunyuan.
- Animation/rigging.
