#!/usr/bin/env bash
# PLAY READER smoke test (v268) — a real session through the real game, and the
# reader's record of it checked line by line.
#
# WHY THIS EXISTS. scripts/playlog-check.mjs proves the ARITHMETIC in bare node:
# given these records, this report. It cannot notice a hook falling out of
# main.js — a pod collected without podTaken(), a death screen that never calls
# end() — and a reader that silently stops hearing the game reports "0 quits"
# forever, which reads exactly like good news. This plays the session instead.
#
# What it drives, the way a player would: the title read for two seconds, the
# ARCADE door, a pod at the feet (taken) and one far off (left to time out), a
# wave, a kill, a death to a TORO, the death screen read, ARCADE again; a tab
# hidden mid-run that comes back and dies (NOT a quit); a third run with the tab
# closed (the one quit); a RELOAD — the store must carry the afternoon — then
# the CAMPAIGN door, the room list read, a room cleared, the run history. Then:
# every record type in order, each number the report quotes, the shared site
# log's lines, the HOW YOU PLAY panel, and no page errors. Exact-PID cleanup; no
# network; the vendored three.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${PL_DIR:-/tmp/toko-playlog}"
PORT="${PL_PORT:-8767}"

mkdir -p "$WORK"
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

# The probe (test-only; never shipped): the moves a player makes that a script
# cannot make with a thumb — dying on cue, a pod at the feet, hiding the tab.
python3 - "$WORK/testbed/js/main.js" <<'EOF2'
import sys
p = sys.argv[1]
s = open(p).read()
s += '''

// ── PLAY READER gate probe (appended by scripts/playlog-smoke.sh; not shipped) ─
if (location.hash === '#plprobe') {
  window._PL = {
    state: () => gameState,
    rep:   () => summarisePlay(playReader.records()),
    recs:  () => playReader.records(),
    live:  () => playReader.live,
    alive: () => enemies.filter(e => e.alive).length,
    pods:  () => {
      const near = new Powerup(scene, player.position.x, player.position.z, 'L'); powerups.push(near);
      const far  = new Powerup(scene, -8, 12, 'B'); far._life = 0.05; powerups.push(far);
      return powerups.length;
    },
    wave:  () => { spawnWave(); return wave; },
    kill:  () => { const e = enemies.find(x => x.alive); if (e) onKill(e); return !!e; },
    die:   () => { player._shield = false; player._dashTime = 0; player._mercyT = 0; player._invincBoost = 0; player.hp = 1;
                   if (tryHitPlayer('bullet', EnemyType.TORO)) triggerGameOver(); return gameState; },
    toTitle: () => { returnToTitle(); return gameState; },
    hide:  on => { Object.defineProperty(document, 'hidden', { value: on, configurable: true });
                   document.dispatchEvent(new Event('visibilitychange')); return playReader.live; },
    leave: () => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); return playReader.live; },
    clearRoom: () => { endLevelRun('clear'); return gameState; },
    history: () => { showRunHistory(); return document.getElementById('rh-play')?.innerText ?? null; },
    hub:   () => { try { return JSON.parse(localStorage.getItem('tokoPlayLog.v1') || '[]').filter(x => x.game === 'tokodrop'); } catch (_) { return []; } },
  };
}
'''
open(p, 'w').write(s)
EOF2

cat > "$WORK/session.mjs" <<'EOF3'
import { chromium } from 'PLAYWRIGHT_PATH';
const URL = `http://127.0.0.1:${process.env.PORT}/testbed/index.html#plprobe`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 900, height: 620 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
const wait = ms => page.evaluate(m => new Promise(r => setTimeout(r, m)), ms);
const ev = (f, a) => page.evaluate(f, a);
const tap = (sel, i) => page.$$eval(sel, (es, k) => es[k].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), i);
const doors = () => page.waitForFunction(() => document.getElementById('doors-slot')?.children.length === 2 && window._PL, null, { timeout: 30000 });
const playing = () => page.waitForFunction(() => window._PL.state() === 'playing', null, { timeout: 20000 });
let n = 0, bad = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) { bad++; console.log('  ✗ ' + name + (extra ? '  (' + extra + ')' : '')); } else console.log('  ✓ ' + name); };

// ── page load 1 ──
await page.goto(URL, { waitUntil: 'load' });
await doors();
await ev(() => { localStorage.removeItem('tokoDropPlay.v1'); localStorage.removeItem('tokoPlayLog.v1'); localStorage.setItem('tokoDropCabinet', ''); });
await wait(2000);                                     // the title, read
await tap('#doors-slot > div', 0);                    // ARCADE
await playing();
check('the ARCADE door opens a run in the reader', await ev(() => window._PL.live()));
await wait(800);
await ev(() => window._PL.pods());
await wait(1200);                                     // the near pod is collected; the far one times out
await ev(() => window._PL.wave());
await page.waitForFunction(() => window._PL.alive() > 0, null, { timeout: 15000 });
await ev(() => window._PL.kill());
await ev(() => window._PL.die());
await wait(1500);                                     // the death screen, read
await ev(() => window._PL.toTitle());
await tap('#doors-slot > div', 0);                    // went again
await playing();
check('a hidden tab leaves the run open', await ev(() => window._PL.hide(true)) === true);
await ev(() => window._PL.hide(false));
await wait(600);
await ev(() => window._PL.die()); await wait(300); await ev(() => window._PL.toTitle());
await tap('#doors-slot > div', 0);
await playing();
await wait(700);
await ev(() => window._PL.hide(true));
await ev(() => window._PL.leave());                   // the tab is closed mid-run

// ── page load 2: the store carries the afternoon ──
// a RELOAD, not goto(URL): the same URL with a #hash is a same-document
// navigation — no new page, no new reader, and the check would test nothing
await page.reload({ waitUntil: 'load' });
await doors();
await tap('#doors-slot > div', 1);                    // CAMPAIGN
await page.waitForFunction(() => document.getElementById('campaign-rooms'), null, { timeout: 10000 });
await wait(1500);                                     // the list, read
await tap('#campaign-rooms > div:not(:first-child)', 0);   // the first room row (row 0 is the world's heading)
await playing();
await wait(900);
await ev(() => window._PL.clearRoom());
await page.waitForFunction(() => document.getElementById('campaign-rooms'), null, { timeout: 10000 });
await ev(() => window._PL.hide(false));
await page.$eval('#campaign-back', e => e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
await wait(400);

const recs = await ev(() => window._PL.recs());
const rep = await ev(() => window._PL.rep());
const runs = recs.filter(r => r.type === 'run');
const tag = r => r.type + (r.reason ? ':' + r.reason : '') + (r.outcome ? ':' + r.outcome : '');
// the navigation itself fires a real pagehide + visibilitychange on the old page:
// more abandon lines for the SAME run, which is exactly what summarise() dedupes
check('record types, in order', recs.map(tag).join(' ') ===
  'title run:died restart abandon:hidden run:died restart abandon:hidden abandon:leave abandon:leave abandon:hidden pick title run:clear',
  recs.map(tag).join(' '));
check('the first title wait is the two seconds read', (() => { const s = recs[0]?.secs; return s >= 2 && s < 8; })(), JSON.stringify(recs[0]));
check('run 1: arcade, died to a TORO, in THE SURFACE',
  runs[0]?.mode === 'arcade' && runs[0]?.outcome === 'died' && runs[0]?.killer === 'TORO' && runs[0]?.world === 'THE SURFACE',
  JSON.stringify(runs[0] && [runs[0].mode, runs[0].outcome, runs[0].killer, runs[0].world]));
check('run 1: the pod at the feet taken, the far one left to expire',
  JSON.stringify(runs[0]?.pods) === JSON.stringify({ offered: { L: 1, B: 1 }, taken: { L: 1 }, expired: 1 }), JSON.stringify(runs[0]?.pods));
check('run 1: the wave, the kill and the hit counted', runs[0]?.wave === 2 && runs[0]?.kills === 1 && runs[0]?.hits === 1,
  JSON.stringify({ wave: runs[0]?.wave, kills: runs[0]?.kills, hits: runs[0]?.hits }));
const rs = recs.filter(r => r.type === 'restart');
check('went again from the death screen, and the gap is the time it was read',
  rs[0]?.afterOutcome === 'died' && rs[0].gapS >= 1.4 && rs[0].gapS < 8, JSON.stringify(rs[0]));
check('the pocketed run came back and finished: not a quit', runs.length === 3 && rep.quits === 1, `runs ${runs.length} quits ${rep.quits}`);
check('the closed tab is the one quit, in arcade, in THE SURFACE',
  JSON.stringify(rep.quitsByMode) === '{"arcade":1}' && JSON.stringify(rep.quitsByWorld) === '{"THE SURFACE":1}', JSON.stringify([rep.quitsByMode, rep.quitsByWorld]));
check('the room list was read before a pick', (() => { const p = recs.find(r => r.type === 'pick'); return p?.room === 'first-light' && p.secs >= 1.4 && p.secs < 8; })(),
  JSON.stringify(recs.find(r => r.type === 'pick')));
check('the room run: campaign, graded, in its world',
  runs[2]?.mode === 'campaign' && runs[2]?.outcome === 'clear' && /^[SABCF]$/.test(runs[2]?.grade) && runs[2]?.room === 'first-light' && runs[2]?.world === 'THE SURFACE',
  JSON.stringify(runs[2] && [runs[2].mode, runs[2].outcome, runs[2].grade, runs[2].room, runs[2].world]));
check('the report: 4 plays, 2 deaths, went again after both',
  rep.plays === 4 && rep.deaths === 2 && rep.wentAgain === 2 && rep.pods.takeRate === 0.5 && JSON.stringify(rep.pods.neverTaken) === '["B"]',
  JSON.stringify({ plays: rep.plays, deaths: rep.deaths, wentAgain: rep.wentAgain, pods: rep.pods }));
const hub = (await ev(() => window._PL.hub())).filter(h => h.type === 'run' || h.type === 'abandon');   // the shell logs its own 'session' lines
check('the shared site log: a line per run, ONE per quit, however often it was hidden',
  hub.map(h => h.type).join(',') === 'run,abandon,run,abandon,run', hub.map(h => h.type).join(','));
check('the shared log carries no per-run detail', hub.every(h => !('pods' in h) && !('runId' in h)));
const box = await ev(() => window._PL.history());
check('the run history shows HOW YOU PLAY with the numbers',
  !!box && box.includes('HOW YOU PLAY') && box.includes('4 plays') && box.includes('went again 2/2') && box.includes('pods 1/2'), JSON.stringify(box));
check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

await b.close();
if (bad) { console.log('✗ PLAYLOG SMOKE FAIL: ' + bad + '/' + n + ' checks failed'); process.exit(1); }
console.log('✔ playlog smoke passed: ' + n + ' checks — the reader hears a real session, across a reload');
EOF3
sed -i "s#PLAYWRIGHT_PATH#$PLAYWRIGHT#" "$WORK/session.mjs"

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" node "$WORK/session.mjs"
