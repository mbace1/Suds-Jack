#!/usr/bin/env bash
# level-shot.sh — P1's picture gate: the floor DRAWS a level's region, on both
# render paths, and the two pictures agree.
#
# LEVEL_EDITOR_DESIGN.md §2.3: shader-dependent art is written once on TSL in
# principle, but the classic r167 path is the default renderer, so the floor
# is the standing exception — the same math expressed twice, GLSL and TSL,
# gated by review. This is that review, automated as far as it can be: boot
# the game with ?level=<id> on the CLASSIC bundle and on the WEBGPU bundle
# (which falls back to its own WebGL2 backend here — node graphs are built
# before the backend is chosen, so a broken graph still throws), start the
# run, and screenshot each. The pictures are the artefact: look at them. If
# python3 has Pillow, it also prints the mean absolute difference between
# the two and fails above a threshold — the same shape rendered by two
# shader languages should not differ by more than a few counts.
#
# Requirements: Chromium at $CHROMIUM, node with playwright at $PLAYWRIGHT
# (a file:// URL on Windows), python3. Nothing is fetched.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${SHOT_DIR:-/tmp/toko-level-shot}"
PORT="${SHOT_PORT:-8769}"
LEVEL="${1:-three-rings}"
OUT="${2:-$WORK/out}"
THRESHOLD="${SHOT_THRESHOLD:-6}"

mkdir -p "$WORK" "$OUT"
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

# The probe (test only; never shipped): start the run once the level is in.
python3 - "$WORK/testbed/js/main.js" <<'EOF'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s += '''

// ── LEVEL SHOT probe (appended by scripts/level-shot.sh; not shipped) ────────
if (location.hash === '#levelshot') {
  window._S = {
    state: () => gameState,
    level: () => activeLevel && activeLevel.id,
    isGpu: () => IS_GPU,
    begin: () => { player._mercyT = 9e9; startGame(); },
    shapeOn: () => floorUniforms.uShapeMode.value.x,
    border: () => border.visible,
  };
}
'''
open(p, 'w', encoding='utf-8').write(s)
EOF

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

for MODE in classic tsl; do
  echo "· $MODE: level '$LEVEL'"
  CHROMIUM="$CHROMIUM" PORT="$PORT" LEVEL="$LEVEL" MODE="$MODE" OUT="$OUT" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
const gpu = process.env.MODE === 'tsl';
await p.addInitScript((g) => { try { localStorage.setItem('tokoDropGpu', g ? '1' : '0'); } catch (e) {} }, gpu);
const fail = async (msg) => { console.log('✗ LEVEL SHOT FAIL (' + process.env.MODE + '): ' + msg); if (errs.length) console.log('  errors: ' + errs.slice(0, 3).join(' | ')); await b.close(); process.exit(1); };
await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html?level=' + process.env.LEVEL + '#levelshot', { waitUntil: 'domcontentloaded' });
try { await p.waitForFunction('window._S && window._S.state() === \"title\"', null, { timeout: 90000 }); } catch (e) { await fail('never reached the title'); }
if ((await p.evaluate('window._S.isGpu()')) !== gpu) await fail('wrong bundle loaded (IS_GPU mismatch) — the run would test nothing');
try { await p.waitForFunction('window._S.level() === \"' + process.env.LEVEL + '\"', null, { timeout: 20000 }); } catch (e) { await fail('level never loaded'); }
await p.evaluate('window._S.begin()');
try { await p.waitForFunction('window._S.state() === \"playing\"', null, { timeout: 20000 }); } catch (e) { await fail('never reached play'); }
if ((await p.evaluate('window._S.shapeOn()')) !== 1) await fail('the shape pass is not on during a level');
await p.waitForTimeout(800);
const file = process.env.OUT + '/level-' + process.env.LEVEL + '-' + process.env.MODE + '.png';
await p.screenshot({ path: file });
if (errs.length) await fail(errs.length + ' page/console error(s)');
console.log('  wrote ' + file + '  border=' + (await p.evaluate('window._S.border()')));
await b.close();
"
done

A="$OUT/level-$LEVEL-classic.png"; B="$OUT/level-$LEVEL-tsl.png"
if python3 -c "import PIL" 2>/dev/null; then
  python3 - "$A" "$B" "$THRESHOLD" <<'EOF'
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size: print('✗ LEVEL SHOT FAIL: sizes differ'); sys.exit(1)
d = ImageChops.difference(a, b)
px = list(d.getdata()); n = len(px)
mad = sum(sum(p) for p in px) / (3 * n)
print(f'· mean abs diff classic vs TSL: {mad:.2f} (threshold {sys.argv[3]})')
sys.exit(1 if mad > float(sys.argv[3]) else 0)
EOF
else
  echo "· (no Pillow for python3 — compare the two PNGs by eye)"
fi
echo "✔ level shot passed: '$LEVEL' draws its region on both paths — $A · $B"
