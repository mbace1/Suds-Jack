#!/usr/bin/env bash
# build-itch.sh — the HTML5 zip itch.io takes: index.html at the root and
# only what the page loads (js/, vendor/, levels/), nothing a player does not
# need (test/, scripts/, docs/, the design notes). The game has no build step,
# so this is a copy, not a compile: the zip plays exactly the bytes the smoke
# gate ran.
#
#   scripts/build-itch.sh            → dist/toko-drop-2-v<N>-itch.zip
#   node scripts/itch-check.mjs <zip>   boots it the way itch serves it
set -euo pipefail
cd "$(dirname "$0")/.."
N=$(grep -m1 -oE '^## v[0-9]+' VERSIONS.md | tr -dc '0-9')
OUT=dist/toko-drop-2-v$N-itch.zip
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
cp index.html "$STAGE/"
cp -r js vendor levels "$STAGE/"
# vendor/README.md says where three.js came from: a licence note, kept
rm -f "$OUT"; mkdir -p dist
(cd "$STAGE" && zip -qr -X "$OLDPWD/$OUT" .)
FILES=$(unzip -Z1 "$OUT" | grep -vc '/$')
SIZE=$(du -k "$OUT" | cut -f1)
# itch's HTML5 limits: 1000 files and 500 MB extracted (itch.io/docs/creators/html5)
[ "$FILES" -le 1000 ] || { echo "✗ $FILES files: itch takes at most 1000" >&2; exit 1; }
echo "✔ $OUT — v$N, $FILES files, ${SIZE} KB"
