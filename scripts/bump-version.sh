#!/usr/bin/env bash
set -euo pipefail

# bump-version.sh <new-game-version>
#
# Bumps every place a release touches, in one command:
#   - cache-bust token  ?v=N  across the module graph (index.html + 3 js files)
#   - HUD label          fillText('vN')  in main.js
#   - README H1          # Toko Drop — vN
#   - VERSIONS.md        prepends a dated ## vN stub to fill in
#
# The cache-bust token and the game version are DIFFERENT numbers (token tracks
# every module-graph change; game version is the public release number). The
# token is auto-incremented from its current value; the game version is the arg.
#
# Usage:  scripts/bump-version.sh 57
# Then:   fill in the real VERSIONS.md bullets and commit.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NEW_V="${1:-}"
if [[ -z "$NEW_V" || ! "$NEW_V" =~ ^[0-9]+$ ]]; then
  echo "usage: scripts/bump-version.sh <new-game-version-number>" >&2
  exit 1
fi

OLD_V=$(grep -oE "fillText\('v[0-9]+'" toko-drop/js/main.js | grep -oE '[0-9]+' | head -1)
OLD_T=$(grep -oE 'main\.js\?v=[0-9]+' toko-drop/index.html | grep -oE '[0-9]+$' | head -1)
if [[ -z "$OLD_V" || -z "$OLD_T" ]]; then
  echo "could not detect current HUD version or cache token" >&2
  exit 1
fi
NEW_T=$(( OLD_T + 1 ))

echo "game version  v$OLD_V -> v$NEW_V"
echo "cache token   ?v=$OLD_T -> ?v=$NEW_T"

# 1) cache-bust token across the whole module graph
# (vendor/three.webgpu.min.js carries a patched-in token on its internal
#  ./three.core.min.js import — the split r180 build's relative import is
#  tokenless upstream, and a tokenless new path is the v118/v119 CDN trap.)
for f in toko-drop/index.html toko-drop/js/main.js toko-drop/js/player.js toko-drop/js/designer.js toko-drop/js/lang.js toko-drop/js/enemy.js toko-drop/js/audio.js toko-drop/js/retro.js toko-drop/sw.js toko-drop/vendor/three.webgpu.min.js; do
  sed -i "s/?v=$OLD_T/?v=$NEW_T/g" "$f"
done

# 2) HUD label
sed -i "s/fillText('v$OLD_V'/fillText('v$NEW_V'/" toko-drop/js/main.js

# 3) README H1
sed -i "s/^# Toko Drop — v[0-9]\+/# Toko Drop — v$NEW_V/" README.md

# 4) VERSIONS.md — prepend a stub above the newest existing entry
DATE=$(date +%F)
STUB="## v$NEW_V — $DATE\n**TODO: one-line summary**\n- TODO\n- Cache-bust \`?v=$OLD_T\` → \`?v=$NEW_T\`; HUD label → v$NEW_V\n\n---\n"
awk -v stub="$STUB" '
  !ins && /^## v[0-9]/ { printf "%s\n", stub; ins=1 }
  { print }
' VERSIONS.md > VERSIONS.md.tmp && mv VERSIONS.md.tmp VERSIONS.md

echo ""
echo "✔ bumped. Now fill in the real VERSIONS.md v$NEW_V bullets, then commit."
if [[ $(( NEW_V % 10 )) -eq 0 ]]; then
  echo "⚠ v$NEW_V is a multiple of 10 — archive v$(( NEW_V - 9 ))–v$(( NEW_V - 1 )) in VERSIONS.md (pre-commit hook enforces this)."
fi
