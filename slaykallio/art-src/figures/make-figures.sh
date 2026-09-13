#!/usr/bin/env bash
# The ten creature plates: generated → keyed → fitted → gated → contact sheet.
#   GEMINI_API_KEY=... bash slaykallio/art-src/figures/make-figures.sh [name ...]
# With no names it does all ten. Raws are kept next to the specs so a re-roll
# can be compared against what it replaced instead of silently overwriting it.
#
# ONE FIGURE PER fitclip CALL, deliberately. fitclip fits a whole CLIP at one
# COMMON scale, which is right for six frames of one person walking and exactly
# wrong here: a pigeon and the bear must not be normalised to the same height.
# Every plate fills its own cell and the size difference comes from `scale` in
# data.js (0.42 → 1.32), the same way it already does for the 23 people.
set -u
cd "$(dirname "$0")/../../.." || exit 1
# @napi-rs/canvas is a global install here, the same way the CI gate has it.
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
KIT=turf/tools/spritekit
SPECS=slaykallio/art-src/figures
RAW=$SPECS/raw
OUT=slaykallio/figures
mkdir -p "$RAW"

ALL="rat bin-rat king-rat blob-spawn blob tar-blob pigeon gull gull-king the-bear"
NAMES="${*:-$ALL}"
fail=0

for n in $NAMES; do
  spec="$SPECS/$n.spec.txt"
  [ -f "$spec" ] || { echo "!! no spec for $n"; fail=1; continue; }
  printf '%-11s ' "$n"

  node "$KIT/build-figure.mjs" "$spec" "$n" > "$RAW/$n.prompt.txt" || { echo "prompt FAILED"; fail=1; continue; }
  # 2:3 — the portrait cell every cast plate is cut to (192x288).
  ASPECT=2:3 node "$KIT/gen.mjs" "$RAW/$n.prompt.txt" "$RAW/$n.raw.png" >/dev/null || { echo "gen FAILED"; fail=1; continue; }
  node kindling/tools/cut.mjs key "$RAW/$n.raw.png" "$RAW/$n.keyed.png" >/dev/null || { echo "key FAILED"; fail=1; continue; }
  node "$KIT/fitclip.cjs" "$RAW" "$OUT" "$n.keyed.png" >/dev/null || { echo "fit FAILED"; fail=1; continue; }
  mv -f "$OUT/$n.keyed.png" "$OUT/$n.png"
  # ABSOLUTE, per file. A relative check is exactly wrong for a set where a rat
  # and a bear are SUPPOSED to disagree about everything.
  if node "$KIT/verify.cjs" "$OUT/$n.png" >/dev/null 2>&1; then echo "ok"; else
    echo "VERIFY FAILED"; node "$KIT/verify.cjs" "$OUT/$n.png" | sed 's/^/             /'; fail=1
  fi
done

# A contact sheet, because no gate can tell you a drawing is GOOD.
node "$KIT/contact.cjs" "$SPECS/_sheet.png" 5 192 288 \
  $(for n in $NAMES; do echo "$OUT/$n.png"; done) && echo "→ $SPECS/_sheet.png"
exit $fail
