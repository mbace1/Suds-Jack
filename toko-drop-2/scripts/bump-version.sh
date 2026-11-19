#!/usr/bin/env bash
set -euo pipefail

# bump-version.sh <N> — move every place the release number lives, together:
#   - the game's ?v=N cache tokens, in every page and module that carries
#     the old one (found by searching for it, never from a hand-kept list —
#     a list is how a module gets left a version behind)
#   - the HUD label  2.0 · vN
#   - VERSIONS.md: a dated ## vN stub on top, to fill in before committing
#     (the pre-commit hook refuses it while it still says TODO)
#
# Vendored three.js keeps its own ?v=rREVISION token: those bytes change only
# when three is upgraded, so a bump leaves them (and every phone's cache) be.
#
# Usage:  scripts/bump-version.sh 2
# Then:   fill in the VERSIONS.md bullets, run scripts/smoke.sh, commit.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NEW="${1:-}"
if [[ ! "$NEW" =~ ^[1-9][0-9]*$ ]]; then
  echo "usage: scripts/bump-version.sh <new-version-number>" >&2
  exit 1
fi
OLD=$(grep -m1 -oE '^## v[0-9]+' VERSIONS.md | grep -oE '[0-9]+' || true)
if [[ -z "$OLD" ]]; then
  echo "could not read the current version from VERSIONS.md" >&2
  exit 1
fi
if (( NEW <= OLD )); then
  echo "v$NEW is not newer than the current v$OLD" >&2
  exit 1
fi

# Refuse to stack a second stub on an unfilled one: the hook would then have
# two TODOs to find, and the buried one is the one that ships.
if grep -qE '^\*\*TODO: one-line title\*\*$|^- TODO$' VERSIONS.md; then
  echo "VERSIONS.md still holds an unfilled bump stub — fill in (or delete) v$OLD first" >&2
  exit 1
fi

# Refuse to bump from a state that already disagrees with itself — the bump
# would carry the disagreement forward under a new number.
node scripts/check-tokens.mjs >/dev/null || {
  echo "the cache tokens disagree before bumping — run: node scripts/check-tokens.mjs" >&2
  exit 1
}

echo "version  v$OLD -> v$NEW   (cache tokens ?v=$OLD -> ?v=$NEW, HUD label 2.0 · v$NEW)"

# 1) cache tokens: every game page/module still carrying ?v=OLD
FILES=$(grep -rlE "\?v=${OLD}([^0-9]|$)" . \
  --include='*.html' --include='*.js' --include='*.mjs' --include='*.css' \
  --include='*.webmanifest' --include='*.json' \
  --exclude-dir=.git --exclude-dir=vendor --exclude-dir=scripts \
  --exclude-dir=test --exclude-dir=.github --exclude-dir=node_modules \
  --exclude-dir=itch --exclude-dir=tools || true)   # v156: the itch kit's .html is a release's build, rebuilt, never bumped
for f in $FILES; do
  perl -pi -e "s/\\?v=${OLD}(?![0-9])/?v=${NEW}/g" "$f"
  echo "  · $f"
done

# 1b) v156: the tests and the tools import the game's modules with the same token, and must move with them. A
#     test left on the old token loads a SECOND copy of each module it names (the game's own modules now import each
#     other at the new one), so a switch it flips in its copy is not the one the game reads: at v156 five suites
#     (director, pickups, floorshift, record, hero) failed for exactly that, against code with nothing wrong in it
for f in $(grep -rlE "\?v=${OLD}([^0-9]|$)" test scripts --include='*.mjs' --include='*.js' --include='*.cjs' || true); do
  perl -pi -e "s/\\?v=${OLD}(?![0-9])/?v=${NEW}/g" "$f"
  echo "  · $f"
done

# 2) HUD label, in every page that carries it (check-tokens reads them all)
LABELLED=$(grep -rlF "2.0 · v$OLD" . --include='*.html' \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=vendor \
  --exclude-dir=itch --exclude-dir=tools || true)   # v156: not the itch kit's built .html
for f in $LABELLED; do
  perl -pi -e "s/2\\.0 · v${OLD}(?![0-9])/2.0 · v${NEW}/g" "$f"
done

# 3) VERSIONS.md — a stub above the newest entry
DATE=$(date +%F)
STUB="## v$NEW — $DATE
**TODO: one-line title**
- TODO
- Cache tokens \`?v=$OLD\` → \`?v=$NEW\`; HUD label → \`2.0 · v$NEW\`

---
"
awk -v stub="$STUB" '!done && /^## v[0-9]/ { print stub; done = 1 } { print }' \
  VERSIONS.md > VERSIONS.md.tmp && mv VERSIONS.md.tmp VERSIONS.md

# 4) and prove the result agrees with itself
node scripts/check-tokens.mjs

echo ""
echo "✔ bumped to v$NEW. Fill in the VERSIONS.md v$NEW entry, run scripts/smoke.sh, then commit."
if (( NEW % 10 == 0 )); then
  FROM=$(( NEW - 10 )); (( FROM < 1 )) && FROM=1
  echo "⚠ v$NEW is a multiple of 10 — roll v${FROM}–v$(( NEW - 1 )) into the VERSIONS.md Archive (the hook enforces it)."
fi
