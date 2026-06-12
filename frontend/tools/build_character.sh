#!/usr/bin/env bash
# Optimize a raw Tripo character GLB for the web scene:
#   tools/build_character.sh <input.glb> <public/models/out.glb> [simplify-ratio]
# Pipeline: dedup -> weld -> simplify (meshopt simplifier) -> meshopt compression.
# Textures are left as-is (Tripo ships 1K here, same as the shipped wizard).
set -euo pipefail
cd "$(dirname "$0")/.."   # -> frontend/
SRC="$1"; OUT="$2"; RATIO="${3:-0.25}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "[1/4] dedup ..."     ; npx --no-install gltf-transform dedup    "$SRC"       "$TMP/d.glb"  >/dev/null
echo "[2/4] weld ..."      ; npx --no-install gltf-transform weld     "$TMP/d.glb" "$TMP/w.glb"  >/dev/null
echo "[3/4] simplify ($RATIO) ..."; npx --no-install gltf-transform simplify "$TMP/w.glb" "$TMP/s.glb" --ratio "$RATIO" --error 0.0015 >/dev/null
echo "[4/4] meshopt ..."   ; npx --no-install gltf-transform meshopt  "$TMP/s.glb" "$OUT"        >/dev/null
printf 'done -> %s  (%s)\n' "$OUT" "$(du -h "$OUT" | cut -f1)"
