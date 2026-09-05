#!/usr/bin/env bash
# level-smoke.sh — a bundled level actually PLAYS, in the real game.
#
# scripts/level-check.mjs proves a level file parses and compiles in bare node.
# This proves the other half in headless Chromium: opened with ?level=<id>, the
# file loads, the run starts, every authored spawn appears — at the authored
# second, at the authored position, as the authored type — and the run ends on
# the level's own clock. Pickups are counted as they land, too.
#
# It also writes $LEVEL_DIR/seen-<id>.txt: one first-sighting line per body,
#   SPAWN <i> <TYPE> t=<s> x=<x> z=<z>
# which is the CROSS-BUILD format the Godot port's tools/level-parity.mjs
# diffs against its own trace of the same file. Same level, two engines, same
# bodies in the same places at the same seconds — or one of them is wrong.
#
# The probe OWNS THE CLOCK (the lesson PR #447's cut of this gate paid for):
# under headless Chromium rAF fires once and then never, and chained
# setTimeout stalls at ~20 s of game time. So it replaces performance.now()
# with a counter, advances it 50 ms (loop() clamps dt at 0.05 anyway) and calls
# loop() synchronously — 45 s of level in about a second of real time — with
# rendering and the HUD stubbed, because the pixels are not what is under test.
#
#   scripts/level-smoke.sh [level-id]      # default first-light
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${LEVEL_DIR:-/tmp/toko-level}"
PORT="${LEVEL_PORT:-8767}"
LEVEL="${1:-first-light}"

mkdir -p "$WORK"
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

python3 - "$WORK/testbed/js/main.js" <<'EOF2'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s += r'''

// ── LEVEL PROBE (test only; appended by scripts/level-smoke.sh) ──────────────
if (location.hash === '#lvprobe') {
  window._L = {
    ready: () => !!pendingLevel,
    level: () => window._L._lv,
    run: () => {
      const L = pendingLevel; window._L._lv = L;
      const want = L.spawns.map(s => s.kind === 'pickup'
        ? { t: s.t, pickup: s.id, px: s.px, pz: s.pz }
        : { t: s.t, type: EnemyType[s.type], name: s.type, px: s.px, pz: s.pz });
      startRun();                       // routes to playLevel() because pendingLevel is armed
      // The box and the region AS PLAYED (endLevelRun() puts the device's own
      // rectangle back, so read them now, not after).
      const box = [HALF_X, HALF_Z], regionKind = arena.shape.kind;
      renderer.render = () => {};
      drawHUD = () => {};
      const realNow = performance.now.bind(performance);
      let fakeNow = realNow();
      performance.now = () => fakeNow;
      const seen = [], seenPk = [];
      const limit = Math.ceil((L.duration + 5) / 0.05);
      let steps = 0;
      for (; steps < limit && gameState === 'playing'; steps++) {
        fakeNow += 50;
        player.maxHp = 999; player.hp = 999; player._mercyT = 9e9;   // nobody is holding the stick
        loop();
        for (const e of enemies) {
          if (e._probed) continue;
          e._probed = true;
          seen.push({ t: waveTimer, type: e.type, x: e.position.x, z: e.position.z });
        }
        for (const p of powerups) {
          if (p._probed) continue;
          p._probed = true;
          seenPk.push({ t: waveTimer, id: p._type, x: p.x, z: p.z });
        }
      }
      const names = Object.fromEntries(Object.entries(EnemyType).map(([k, v]) => [v, k]));
      const lines = seen.map((s, i) => `SPAWN ${i} ${names[s.type]} t=${s.t.toFixed(3)} x=${s.x.toFixed(3)} z=${s.z.toFixed(3)}`);
      const wantE = want.filter(w => !w.pickup), wantP = want.filter(w => w.pickup);
      const bad = [];
      wantE.forEach((w, i) => {
        const s = seen[i];
        if (!s) { bad.push(`MISSING ${i} ${w.name} @${w.t}s`); return; }
        // The pump spawns and update() runs in the same loop() call, so a body
        // is first seen one step (0.05 s) into its life; two frames of motion
        // at pounce speed is under 1.0 unit and 0.15 s.
        if (!(Math.abs(s.t - w.t) <= 0.15 && Math.abs(s.x - w.px) <= 1.0 && Math.abs(s.z - w.pz) <= 1.0 && s.type === w.type))
          bad.push(`MISMATCH ${i} ${w.name}: t ${w.t}->${s.t.toFixed(3)} pos (${w.px},${w.pz})->(${s.x.toFixed(2)},${s.z.toFixed(2)}) type ${w.type}->${s.type}`);
      });
      wantP.forEach((w, i) => {
        const s = seenPk[i];
        if (!s) { bad.push(`MISSING pickup ${i} ${w.pickup} @${w.t}s`); return; }
        if (!(Math.abs(s.t - w.t) <= 0.15 && Math.abs(s.x - w.px) <= 0.5 && Math.abs(s.z - w.pz) <= 0.5 && s.id === w.pickup))
          bad.push(`MISMATCH pickup ${i} ${w.pickup}: t ${w.t}->${s.t.toFixed(3)} pos (${w.px},${w.pz})->(${s.x.toFixed(2)},${s.z.toFixed(2)}) id ${s.id}`);
      });
      return { id: L.id, duration: L.duration, arena: box, regionKind, steps, state: gameState,
               waveT: waveTimer, seen: seen.length, wantE: wantE.length, seenPk: seenPk.length, wantP: wantP.length,
               result: lastLevelResult, bad, lines };
    },
  };
}
'''
open(p, 'w', encoding='utf-8').write(s)
EOF2

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" LEVEL="$LEVEL" WORK="$WORK" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
const fail = async (msg) => {
  console.log('✗ LEVEL SMOKE FAIL (' + process.env.LEVEL + '): ' + msg);
  if (errs.length) console.log('  errors: ' + errs.slice(0, 4).join(' | '));
  await b.close(); process.exit(1);
};
await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html?level=' + process.env.LEVEL + '#lvprobe', { waitUntil: 'domcontentloaded' });
try { await p.waitForFunction('window._L && window._L.ready()', null, { timeout: 90000 }); }
catch (e) { await fail('the level never loaded (?level= did not arm pendingLevel)'); }
const r = await p.evaluate(() => window._L.run());
console.log('· ' + r.id + ': ' + r.duration + 's in a ' + r.regionKind + ' region (box ' + r.arena[0] + 'x' + r.arena[1] + ') — ' + r.steps + ' steps, ended in state ' + r.state + ' at t=' + r.waveT.toFixed(2));
console.log('· enemies seen ' + r.seen + '/' + r.wantE + ' · pickups seen ' + r.seenPk + '/' + r.wantP);
writeFileSync(process.env.WORK + '/seen-' + process.env.LEVEL + '.txt', r.lines.join('\n') + '\n');
console.log('· wrote ' + process.env.WORK + '/seen-' + process.env.LEVEL + '.txt (' + r.lines.length + ' SPAWN lines, the cross-build format)');
for (const m of r.bad) console.log('  ✗ ' + m);
if (r.bad.length) await fail(r.bad.length + ' spawn(s) did not land as authored');
if (r.seen !== r.wantE || r.seenPk !== r.wantP) await fail('count mismatch');
if (!(r.result && r.result.outcome === 'clear')) await fail('the run did not end CLEARED on the level clock (result=' + JSON.stringify(r.result) + ', state=' + r.state + ')');
if (r.waveT < r.duration - 0.2) await fail('the run ended early at t=' + r.waveT.toFixed(2));
// The file's region is the one that PLAYED: a shape object must not have been
// flattened to the device rectangle (that is the whole point of arena.js).
const lvl = JSON.parse(await p.evaluate(() => JSON.stringify(window._L.level())));
const fileKind = typeof lvl.arena === 'string' ? 'rect' : (lvl.arena.shapes.length === 1 ? lvl.arena.shapes[0].kind : (lvl.arena.combine || 'intersect'));
if (r.regionKind !== fileKind) await fail('the region that played was ' + r.regionKind + ' but the file says ' + fileKind);
if (errs.length) await fail('page errors');
await b.close();
console.log('✔ level smoke passed: every authored spawn landed where and when the file says, and the run ended on the level clock');
"
