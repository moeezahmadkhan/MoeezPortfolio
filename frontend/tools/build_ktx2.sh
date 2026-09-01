#!/usr/bin/env bash
# Add KTX2 / Basis-Universal GPU textures to the shipped character models.
#
#   tools/build_ktx2.sh
#
# Why: the meshopt/draco GLBs in public/models already download small (~1MB),
# but their JPEG textures decode to 5-22 MB of *GPU memory* each — ~130 MB of
# VRAM across the four models, which is a lot for low-end phones. ETC1S (Basis)
# textures stay GPU-compressed, cutting that ~8x, while download stays flat.
#
# Recipe per model: (downscale any 2K basecolor to 1K) -> etc1s -> re-apply the
# model's own geometry codec (draco or meshopt), which gltf-transform strips
# when it rewrites the file. The React side decodes KTX2 via /public/basis/ (see
# src/three/ktx2.ts); drei's useGLTF wires Draco + meshopt but NOT KTX2 itself.
#
# Requires the Khronos `ktx` CLI on PATH (KhronosGroup/KTX-Software).
set -euo pipefail
cd "$(dirname "$0")/.."   # -> frontend/

GT() { npx --no-install gltf-transform "$@"; }
QUALITY="${KTX_QUALITY:-200}"   # ETC1S quality 1-255 (higher = better, larger)

# model | geometry-codec (draco|meshopt) | resize-to (px, or 0 = keep)
#
# cricket_improved.glb was dropped from this list when it was deleted from
# public/models/: rigs.ts never named it, so it was 817KB of GLB shipped in
# every deploy for no section. Recover it from git history and add its row back
# if a section ever claims it.
#
# wizard_improved.glb stays on draco rather than joining the other two on
# meshopt, despite meshopt saving the 98KB draco decoder download. Converting it
# was measured: 849.5 KB -> 1.15 MB, so the model grows by three times what the
# decoder costs. Draco wins for this mesh.
MODELS=(
  "wizard_improved.glb draco   1024"
  "spellcaster.glb     meshopt 0"
  "pact_pair.glb       meshopt 0"
)

for row in "${MODELS[@]}"; do
  read -r name codec resize <<<"$row"
  src="public/models/$name"
  [ -f "$src" ] || { echo "skip (missing): $src"; continue; }
  before=$(stat -c%s "$src")
  tmp="$(mktemp -d)"; cur="$src"

  if [ "$resize" != "0" ]; then
    GT resize "$cur" "$tmp/r.glb" --width "$resize" --height "$resize" >/dev/null
    cur="$tmp/r.glb"
  fi
  GT etc1s "$cur" "$tmp/k.glb" --quality "$QUALITY" >/dev/null
  GT "$codec" "$tmp/k.glb" "$src" >/dev/null
  rm -rf "$tmp"

  after=$(stat -c%s "$src")
  printf '%-22s %5d KB -> %5d KB  (etc1s q%s, %s)\n' \
    "$name" $((before/1024)) $((after/1024)) "$QUALITY" "$codec"
done
echo "done. KTX2 GPU textures applied to public/models/*.glb"
