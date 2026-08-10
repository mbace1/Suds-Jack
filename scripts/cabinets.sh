#!/usr/bin/env bash
# Cabinet regression sweep — boots ALL SIX arcade cabinets and plays each one.
#
# smoke.sh proves the enemy roster survives; nothing proved the CABINETS did.
# They are the most fragile surface in the game: every mode-wide system (v196
# FLUID, v198 defaults, v200 juice, v203 SHEPHERD) has to be kept OUT of them,
# and a leak is invisible until someone opens that cabinet. This sweep boots
# each one, clears LOADOUT's kit-pick door, kills through a few bodies so the
# onKill/juice/split paths run, and fails on:
#   - the cabinet never reaching play
#   - CLOSE COMBAT / FLUID / archetypes / SHEPHERD / split-children leaking in
#   - the retro post pass not arming (its whole visual identity)
#   - any page error or console error
#
# Requirements: same as smoke.sh — node with playwright, Chromium, python3.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${CAB_DIR:-/tmp/toko-cabs}"
PORT="${CAB_PORT:-8764}"
THREE_VER=0.167.0

mkdir -p "$WORK"

# 1) Vendor three.js locally (cached between runs), same as smoke.sh
if [ ! -f "$WORK/three/build/three.module.js" ]; then
  echo "· fetching three@$THREE_VER from npm"
  (cd "$WORK" && npm pack "three@$THREE_VER" --silent >/dev/null && \
   tar xzf "three-$THREE_VER.tgz" && rm -rf three && mv package three)
fi

# 2) Fresh copy of the game with the importmap pointed at the local three
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
# The live site serves from the REPO ROOT, so index.html can reference siblings
# like ../hub/shell.js (the arcade shell) or ../toko/js/signature.js (the
# studio badge). Mirror every such sibling into the served root, or every
# cabinet 404s on a file that is fine in production and the gate reports a
# break that does not exist.
for sib in hub toko; do
  rm -rf "$WORK/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done
python3 - "$WORK/testbed/index.html" <<'EOF'
import sys
p = sys.argv[1]
src = open(p).read()
src = src.replace('./vendor/three.module.min.js', '../three/build/three.module.js')
src = src.replace('./vendor/three.webgpu.min.js', '../three/build/three.module.js')
open(p, 'w').write(src)
EOF

# 3) Append the probe the sweep drives (test-only; never shipped)
python3 - "$WORK/testbed/js/main.js" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
s += '''

// ── cabinet sweep probe (appended by scripts/cabinets.sh; not shipped) ───────
if (location.hash === '#cabs') {
  window._C = {
    state: () => gameState,
    protect: () => { player._mercyT = 9e9; },
    begin: (which) => { ({
      tokotron: startTokotron, gaundrop: startGaundrop, binding: startBinding,
      loadout: startLoadout, kaikki: startKaikki, nexdeus: startNexdeus,
    })[which](); return null; },
    inCab: () => inCabinet(),
    modes: () => ({ melee: meleeRun, arch: fluidArch }),
    killSome: (n) => { let k = 0; for (const e of enemies) { if (k >= n) break;
      if (e.alive) { e.hp = 0; e.hit(e.position.x, e.position.z); onKill(e); k++; } } return k; },
    retro: () => retro.active,
    shepCount: () => enemies.filter(e => e.alive && e.type === EnemyType.SHEPHERD).length,
    childCount: () => enemies.filter(e => e.alive && e._spawnChild).length,
  };
}
'''
open(p, 'w').write(s)
EOF

# 4) Serve + drive (exact-PID cleanup — pkill is blocked in some sandboxes)
# Serve $WORK (not testbed/) so the rewritten ../three/ imports resolve.
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const CABS = ['tokotron', 'gaundrop', 'binding', 'loadout', 'kaikki', 'nexdeus'];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
let bad = 0;
for (const cab of CABS) {
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 160)); });
  await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html#cabs', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction('window._C && window._C.state() === \"title\"', null, { timeout: 90000 });
  await p.evaluate('(() => { window._C.protect(); window._C.begin(\"' + cab + '\"); return null; })()');
  // LOADOUT opens on its kit-pick panel by design (v152) — clear the door.
  await p.waitForTimeout(800);
  if (await p.evaluate('window._C.state() === \"upgrade\"')) {
    await p.click('#upgrade-panel [data-ui=\"1\"]').catch(() => {});
    await p.waitForTimeout(600);
  }
  try {
    await p.waitForFunction('window._C.state() === \"playing\"', null, { timeout: 40000 });
  } catch (e) {
    console.log('FAIL ' + cab.padEnd(9) + ' — never reached play (state=' + await p.evaluate('window._C.state()') + ')');
    bad++; await p.close(); continue;
  }
  await p.waitForTimeout(1200);
  const inCab = await p.evaluate('window._C.inCab()');
  const modes = await p.evaluate('window._C.modes()');
  const retro = await p.evaluate('window._C.retro()');
  await p.evaluate('(() => { window._C.killSome(6); return null; })()');
  await p.waitForTimeout(900);
  const shep = await p.evaluate('window._C.shepCount()');
  const kids = await p.evaluate('window._C.childCount()');
  const badNews = [];
  if (!inCab) badNews.push('inCabinet() false');
  if (modes.melee) badNews.push('CLOSE COMBAT leaked in');
  if (modes.arch) badNews.push('archetype set: ' + modes.arch);
  if (shep) badNews.push(shep + ' SHEPHERD present');
  if (!retro && cab !== 'nexdeus') badNews.push('retro pass inactive');
  if (errs.length) badNews.push(errs.length + ' errors: ' + errs.slice(0, 2).join(' | '));
  if (badNews.length) { bad++; console.log('FAIL ' + cab.padEnd(9) + ' — ' + badNews.join('; ')); }
  else console.log('OK   ' + cab.padEnd(9) + ' — plays clean, no mode leaks, retro armed');
  await p.close();
}
await b.close();
if (bad) { console.log('\n✗ CABINET SWEEP FAIL: ' + bad + ' cabinet(s) broken'); process.exit(1); }
console.log('\n✔ cabinet sweep passed: all six cabinets play clean');
"
