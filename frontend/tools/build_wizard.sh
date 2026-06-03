#!/usr/bin/env bash
# Full wizard.glb improvement pipeline. Run from anywhere:
#   tools/build_wizard.sh
# 1) Blender adds glowing eyes + wand magic and downscales textures to 2K.
# 2) gltf-transform welds/dedups and applies meshopt geometry compression.
# Source of truth is tools/wizard.original.glb; output is public/models/wizard.glb.
set -euo pipefail
cd "$(dirname "$0")/.."   # -> frontend/

echo "[1/2] Blender: glow + 2K textures ..."
blender --background --python tools/improve_wizard.py 2>&1 \
  | grep -E "CURL_FACES|RESIZED|EXPORTED" || true

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
echo "[2/2] gltf-transform: weld + dedup + meshopt ..."
npx gltf-transform dedup  public/models/wizard.glb "$TMP/d.glb"  >/dev/null
npx gltf-transform weld   "$TMP/d.glb"             "$TMP/w.glb"  >/dev/null
npx gltf-transform meshopt "$TMP/w.glb"            public/models/wizard.glb >/dev/null

printf 'done -> public/models/wizard.glb  (%s)\n' \
  "$(du -h public/models/wizard.glb | cut -f1)"
