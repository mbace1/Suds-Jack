#!/usr/bin/env bash
# LEVEL EDITOR smoke test — drives the editor the way a thumb would, then plays
# what it authored and checks the game did what the level said.
#
# WHY THIS EXISTS. The editor's whole promise is that a spawn placed at (x, z)
# at t seconds is a body standing at (x, z) t seconds into the run. smoke.sh
# boots the game and cabinets.sh plays the cabinets; neither opens ?editor, so
# nothing else can catch the editor mounting, a tap landing on the wrong tile,
# a level failing to round-trip through storage, or play-from-here firing the
# spawns it was told to skip.
#
# What it checks, in order: the editor mounts over the real game (?editor);
# a tap on the arena adds a spawn at the playhead, at the world point under
# the tap; a second kind of thing (a pickup) lands to the RIGHT of the first
# when tapped to the right of it; save → new → load brings the spawns back;
# export → import round-trips; PLAY from 0.5s runs the level, the enemy
# appears within a body-width of where it was placed, the pickup appears,
# and the run ends CLEARED on the level's own clock and hands the editor a
# result. Exact-PID cleanup; no network; the vendored three.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${ED_DIR:-/tmp/toko-editor}"
PORT="${ED_PORT:-8766}"

mkdir -p "$WORK"
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

# The probe (test-only; never shipped): reads game state the editor's API
# deliberately does not expose.
python3 - "$WORK/testbed/js/main.js" <<'EOF2'
import sys
p = sys.argv[1]
s = open(p).read()
s += '''

// ── LEVEL EDITOR gate probe (appended by scripts/editor-smoke.sh; not shipped) ─
if (location.hash === '#edprobe') {
  window._E = {
    state:    () => gameState,
    level:    () => customLevel ? { name: customLevel.level.name, fromT: customLevel.fromT, kills: customLevel.kills } : null,
    enemies:  () => enemies.filter(e => e.alive).map(e => ({ type: e.type, x: e.position.x, z: e.position.z })),
    powerups: () => powerups.filter(p => !p.collected).map(p => ({ id: p._type, x: p.x, z: p.z })),
    pending:  () => pendingSpawns.length,
    waveT:    () => waveTimer,
    half:     () => ({ x: HALF_X, z: HALF_Z }),
    protect:  () => { player._mercyT = 9e9; },
    typeName: (v) => Object.keys(EnemyType).find(k => EnemyType[k] === v),
  };
}
'''
open(p, 'w').write(s)
EOF2

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 480, height: 860 }, hasTouch: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
let n = 0, bad = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { bad++; console.log('  ✗ ' + name + (extra ? '  (' + extra + ')' : '')); } else console.log('  ✓ ' + name); };
const fail = async (msg) => {
  console.log('✗ EDITOR SMOKE FAIL: ' + msg);
  if (errs.length) console.log('  errors: ' + errs.slice(0, 4).join(' | '));
  await b.close(); process.exit(1);
};
const ev = (s) => p.evaluate(s);

await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html?editor#edprobe', { waitUntil: 'domcontentloaded' });
try { await p.waitForFunction('window.__ed && window.__ed.active() && window._E && window._E.state() === \"editor\"', null, { timeout: 90000 }); }
catch (e) { await fail('the editor never mounted (state=' + (await ev('window._E && window._E.state()').catch(() => '?')) + ')'); }
console.log('· editor mounted over the game');

// The bars are real DOM, and they must not cover the whole screen.
check('top bar + timeline present', await ev('!!document.querySelector(\"#tded .ed-top\") && !!document.querySelector(\"#tded #ed-tlc\")'));
check('menus carry the real roster', await ev('document.querySelector(\"#ed-enemy\").options.length > 20 && document.querySelector(\"#ed-pickup\").options.length > 5'));

// ── author a level with taps ──────────────────────────────────────────
await ev('window.__ed.newLevel(\"GATE\"); window.__ed.setDuration(8);');
const cx = 240, cy = 430;   // roughly the arena's middle on a 480×860 phone
await ev('window.__ed.setPlayhead(1.0); window.__ed.arm(\"enemy\", \"GLOBBO\");');
await p.touchscreen.tap(cx, cy);
await p.waitForTimeout(150);
let lv = await ev('window.__ed.level()');
check('a tap on the arena added a spawn', lv.spawns.length === 1, JSON.stringify(lv.spawns));
const s0 = lv.spawns[0] || {};
check('…of the armed enemy at the playhead', s0.type === 'GLOBBO' && s0.t === 1.0, JSON.stringify(s0));
const under = await ev('window.__ed.screenToWorld(' + cx + ',' + cy + ')');
check('…at the world point under the tap', under && Math.abs(s0.px - under.x) < 0.01 && Math.abs(s0.pz - under.z) < 0.01, JSON.stringify([s0.px, s0.pz, under]));
check('…inside the arena', Math.abs(s0.px) < (await ev('window._E.half().x')) && Math.abs(s0.pz) < (await ev('window._E.half().z')));

await ev('window.__ed.setPlayhead(2.0); window.__ed.arm(\"pickup\", \"hp\");');
await p.touchscreen.tap(cx + 90, cy);
await p.waitForTimeout(150);
lv = await ev('window.__ed.level()');
const pk = lv.spawns.find(s => s.kind === 'pickup') || {};
check('a pickup tap added a pickup spawn', lv.spawns.length === 2 && pk.id === 'hp' && pk.t === 2.0, JSON.stringify(lv.spawns));
check('screen-right landed world-right', pk.px > s0.px + 1, pk.px + ' vs ' + s0.px);

// tapping an existing spawn selects it instead of stacking another
await ev('window.__ed.arm(\"enemy\", \"GLOBBO\");');
await p.touchscreen.tap(cx, cy);
await p.waitForTimeout(150);
lv = await ev('window.__ed.level()');
check('a tap on an existing spawn selects rather than duplicates', lv.spawns.length === 2 && (await ev('document.querySelector(\"#ed-insp\").classList.contains(\"on\")')));

// ── storage + text round-trips ────────────────────────────────────────
check('save', await ev('window.__ed.save()'));
await ev('window.__ed.newLevel(\"SCRATCH\")');
check('new level is empty', (await ev('window.__ed.level().spawns.length')) === 0);
check('load brings the saved level back', (await ev('window.__ed.load(\"gate\")')) && (await ev('window.__ed.level().spawns.length')) === 2);
const txt = await ev('window.__ed.exportText()');
await ev('window.__ed.newLevel(\"SCRATCH2\")');
check('export → import round-trips', (await p.evaluate(t => window.__ed.importText(t), txt)) === true && (await ev('window.__ed.exportText()')) === txt);
check('the example level loads', (await ev('window.__ed.load(\"__example\")')) && (await ev('window.__ed.level().spawns.length')) > 10);
check('…and back to ours', (await ev('window.__ed.load(\"gate\")')) && (await ev('window.__ed.level().spawns.length')) === 2);

// ── play from 0.5s ────────────────────────────────────────────────────
await ev('window.__ed.setPlayhead(0.5);');
check('play starts a run', await ev('window.__ed.play()'));
try { await p.waitForFunction('window._E.state() === \"playing\"', null, { timeout: 20000 }); }
catch (e) { await fail('play never reached the playing state'); }
// AFTER startGame(): player.reset() clears mercy, so arming it earlier is undone.
await ev('window._E.protect();');
const cl = await ev('window._E.level()');
check('the run carries the level and the playhead', cl && cl.name === 'GATE' && Math.abs(cl.fromT - 0.5) < 1e-6, JSON.stringify(cl));
check('the editor bars are hidden during the run', await ev('document.getElementById(\"tded\").style.display === \"none\"'));
check('pending spawns = both (nothing dropped, nothing fired early)', (await ev('window._E.pending()')) === 2, String(await ev('window._E.pending()')));

// the enemy is due at 1.0 - 0.5 = 0.5s of level time
try { await p.waitForFunction('window._E.enemies().length >= 1', null, { timeout: 30000 }); }
catch (e) { await fail('the placed enemy never spawned'); }
const wt = await ev('window._E.waveT()');
const en = (await ev('window._E.enemies()'))[0];
check('the enemy spawned on time', wt >= 0.5 - 1e-6 && wt < 1.5, 'waveTimer=' + wt.toFixed(2));
check('the enemy is the one placed', (await p.evaluate(v => window._E.typeName(v), en.type)) === 'GLOBBO');
check('the enemy stands where it was placed', Math.hypot(en.x - s0.px, en.z - s0.pz) < 1.5, JSON.stringify([en, s0.px, s0.pz]));
try { await p.waitForFunction('window._E.powerups().length >= 1', null, { timeout: 30000 }); }
catch (e) { await fail('the placed pickup never appeared'); }
const pu = (await ev('window._E.powerups()'))[0];
check('the pickup is the one placed, where it was placed', pu.id === 'hp' && Math.hypot(pu.x - pk.px, pu.z - pk.pz) < 0.5, JSON.stringify([pu, pk]));

// the level is 8s long, played from 0.5 → ends at 7.5s of level time
try { await p.waitForFunction('window._E.state() === \"editor\"', null, { timeout: 120000 }); }
catch (e) { await fail('the run never ended on the level clock (state=' + (await ev('window._E.state()')) + ', waveT=' + (await ev('window._E.waveT()')) + ')'); }
const res = await ev('window.__ed.lastResult()');
check('the run ended cleared, on the clock, and reported back', res && res.outcome === 'clear' && res.time >= 7.4, JSON.stringify(res));
check('no bodies left behind', (await ev('window._E.enemies().length')) === 0 && (await ev('window._E.powerups().length')) === 0);
check('the editor is back with the level intact', (await ev('window.__ed.active()')) && (await ev('window.__ed.level().spawns.length')) === 2);
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await b.close();
if (bad) { console.log('✗ EDITOR SMOKE FAIL: ' + bad + '/' + n + ' checks failed'); process.exit(1); }
console.log('✔ editor smoke passed: ' + n + ' checks — taps land, levels round-trip, play-from-here plays what was placed');
"
