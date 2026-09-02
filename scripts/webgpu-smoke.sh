#!/usr/bin/env bash
# WEBGPU (BETA) smoke test — the only gate that actually runs the TSL path.
#
# WHY THIS EXISTS. smoke.sh and cabinets.sh both rewrite the importmap to the
# CLASSIC three bundle before booting, so neither has ever executed a single
# line of the node-graph build. Every showpiece art pass shipped on nothing but
# a hand-run check that happened to be done that day:
#   v218 goo/gel dome · v222 corpse gel · v223 arena floor · v228 arena pass 2
# A broken node graph ships GREEN through both existing gates. This closes that.
#
# WHAT IT PROVES, honestly: that the WebGPU build loads, its node graphs
# compile, and a real run drives them without throwing. It does NOT prove
# anything about real WebGPU hardware — this sandbox has no WebGPU device, so
# r180 falls back to its own WebGL2 backend (the same adaptive path v192 added
# for unsupported browsers). The script reports which backend it got. That is
# still the failure mode worth catching: a bad TSL node graph throws on either
# backend, because the graph is built before the backend is chosen.
#
# The vacuous-pass trap this guards against: if the flag silently failed and
# the CLASSIC bundle loaded instead, every check below would pass while testing
# nothing. So it asserts IS_GPU and that the floor is a NodeMaterial carrying a
# colorNode — the exact thing makeFloorMat() only builds on the TSL side.
#
# Requirements: same as cabinets.sh — node with playwright, Chromium, python3.
# Unlike the other two gates this fetches NOTHING: it wants the repo's own
# vendored r180 build (toko-drop/vendor/three.webgpu.min.js), not an npm copy.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${GPU_DIR:-/tmp/toko-webgpu}"
PORT="${GPU_PORT:-8765}"

mkdir -p "$WORK"

# 1) Fresh copy of the game. The vendored three builds come with it — the whole
#    point is to run the r180 webgpu bundle this repo actually ships.
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
# The live site serves from the REPO ROOT, so index.html reaches siblings like
# ../toko/js/signature.js. Mirror them or the run fills with 404s that look
# like real failures (same reasoning as cabinets.sh).
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

# 2) Append the probe (test-only; never shipped)
python3 - "$WORK/testbed/js/main.js" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
s += '''

// ── WEBGPU gate probe (appended by scripts/webgpu-smoke.sh; not shipped) ─────
if (location.hash === '#gpuprobe') {
  window._G = {
    state:   () => gameState,
    isGpu:   () => IS_GPU,
    backend: () => (renderer.backend && renderer.backend.isWebGPUBackend)
                     ? 'webgpu' : 'webgl2-fallback',
    // makeFloorMat() only builds a node material on the TSL side; a
    // ShaderMaterial here means the classic bundle loaded and this whole run
    // proved nothing (v223 rim/grid/pool + v228 mass/pops/prizes live here).
    floor:   () => ({ type: floor.material.type, node: !!floor.material.colorNode }),
    // v218's gel dome and v222's corpse gel ride the enemy/chunk materials.
    enemyMat: () => {
      const e = enemies.find(x => x.alive);
      if (!e) return null;
      const m = e.mat;
      return { type: m.type, node: !!(m.colorNode || m.positionNode || m.emissiveNode) };
    },
    protect: () => { player._mercyT = 9e9; },
    begin:   () => { startGame(); },
    counts:  () => ({ alive: enemies.filter(e => e.alive).length, score }),
    killSome: (n) => { let k = 0; for (const e of enemies) { if (k >= n) break;
      if (e.alive) { e.hp = 1; if (e.hit(e.position.x, e.position.z)) onKill(e); k++; } } return k; },
  };
}
'''
open(p, 'w').write(s)
EOF

# 3) Serve + drive (exact-PID cleanup — pkill is blocked in some sandboxes)
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });

// Arm the flag BEFORE any page script: index.html's boot script reads this
// key and writes the importmap from it, so this exercises the real toggle
// rather than a statically rewritten importmap.
await p.addInitScript(() => { try { localStorage.setItem('tokoDropGpu', '1'); } catch (e) {} });

const fail = async (msg) => {
  console.log('✗ WEBGPU SMOKE FAIL: ' + msg);
  if (errs.length) console.log('  errors: ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(1);
};

await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html#gpuprobe',
             { waitUntil: 'domcontentloaded' });
try {
  await p.waitForFunction('window._G && window._G.state() === \"title\"', null, { timeout: 90000 });
} catch (e) { await fail('never reached the title screen (WebGPU build did not boot)'); }

// The vacuous-pass guard: prove we are actually on the node-graph build.
if (!(await p.evaluate('window._G.isGpu()')))
  await fail('IS_GPU false — the CLASSIC bundle loaded, so nothing TSL was tested');
const backend = await p.evaluate('window._G.backend()');
const fl = await p.evaluate('window._G.floor()');
if (!fl.node)
  await fail('floor is ' + fl.type + ' without a colorNode — the TSL floor graph is not live');
console.log('· backend: ' + backend + '  · floor: ' + fl.type + ' (node graph live)');

await p.evaluate('(() => { window._G.protect(); window._G.begin(); return null; })()');
try {
  await p.waitForFunction('window._G.state() === \"playing\"', null, { timeout: 40000 });
} catch (e) { await fail('never reached play'); }

// Let a real wave build so the gel domes are alive and the floor is answering
// live enemies (v228 mass), then kill through some so the corpse-gel and
// pop-ripple paths run too.
await p.waitForTimeout(6000);
const before = await p.evaluate('window._G.counts()');
if (!before.alive) await fail('no enemies alive after 6s — nothing exercised the gel materials');
const em = await p.evaluate('window._G.enemyMat()');
if (em && !em.node)
  await fail('live enemy material is ' + em.type + ' with no node — the gel graph is not live');

const killed = await p.evaluate('window._G.killSome(6)');
await p.waitForTimeout(1500);
const after = await p.evaluate('window._G.counts()');
if (!killed) await fail('killSome() killed nothing — corpse/pop paths never ran');
if (after.score <= 0) await fail('score never moved despite ' + killed + ' kills');

if (errs.length) await fail(errs.length + ' page/console error(s)');

console.log('· played 6s, ' + before.alive + ' bodies alive, ' + killed + ' killed, score ' + after.score);
console.log('· enemy material: ' + (em ? em.type + ' (node graph live)' : 'n/a'));
console.log('');
console.log('✔ webgpu smoke passed: TSL build boots, node graphs run, zero errors');
console.log('  (backend ' + backend + ' — node graphs are built before the backend is chosen,');
console.log('   so this catches broken TSL either way; it does not test real WebGPU hardware)');
await b.close();
"
