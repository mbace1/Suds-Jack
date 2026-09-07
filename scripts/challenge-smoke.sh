#!/usr/bin/env bash
# CHALLENGE smoke test — a DIRECTED room plays, runs its whole clock, and
# grades. (v242, design/CAMPAIGN_LEVELS.md via the Godot port's challenges.gd.)
#
# WHY THIS EXISTS, separately from level-smoke.sh. That gate proves an
# AUTHORED level: every spawn it compares against was hand-placed in the file.
# A challenge has no spawns at all — it is the ordinary wave director pinned
# to one difficulty, re-rolled every time the room is cleared, for as long as
# the level's clock runs. Nothing about that is checkable against the file, so
# it needs its own questions:
#
#   · bodies arrive at all, from the director rather than from a timeline;
#   · the room is RE-ROLLED — a challenge that spawns one wave and then stands
#     empty for the remaining fifty seconds is the failure mode here, and
#     spawnWave() zeroing waveTimer is exactly how it would happen;
#   · the level ends on ITS OWN clock, near its duration, not on a wave;
#   · the score is graded against the file's tiers, and the same score always
#     earns the same grade (the boundaries are level.js gradeFor, one place);
#   · the best grade is remembered.
#
# Same probe-owns-the-clock recipe as level-smoke.sh, and the same reasons:
# under headless Chromium rAF fires once and chained timers stall, so the
# probe replaces performance.now() and calls loop() itself. Rendering and the
# HUD are stubbed — 60 s of level in about a second.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${CH_DIR:-/tmp/toko-challenge}"
PORT="${CH_PORT:-8773}"
LEVEL="${1:-ch-first-light}"

mkdir -p "$WORK"
rm -rf "$WORK/testbed"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do
  rm -rf "${WORK:?}/$sib"
  if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi
done

python3 - "$WORK/testbed/js/main.js" <<'EOF'
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8').read()
s += r'''

// ── CHALLENGE PROBE (test only; appended by scripts/challenge-smoke.sh) ──────
if (location.hash === '#chprobe') {
  window._C = {
    ready: () => !!pendingLevel,
    // v242: the campaign screen and its unlock chain, from the probe's side.
    campaign: () => ({
      ids: CAMPAIGN_IDS,
      unlocked: CAMPAIGN_IDS.map((_, i) => campaignUnlocked(i)),
      progress: campaignProgress(),
    }),
    open: () => { showCampaign(); const n = document.querySelectorAll('#campaign-panel [data-pick]').length;
                  const locked = document.querySelectorAll('#campaign-panel [data-ui]').length - n - 1;
                  document.getElementById('campaign-panel').remove(); gameState = 'title';
                  return { pickable: n, locked }; },
    run: () => {
      const L = pendingLevel;
      startRun();
      renderer.render = () => {};
      drawHUD = () => {};
      // The run's OWN starting hp, read before the bot is made immortal below
      // — otherwise ONE LIFE measures the probe's override, not the twist.
      const hpAtStart = player.maxHp;
      const realNow = performance.now.bind(performance);
      let fakeNow = realNow();
      performance.now = () => fakeNow;
      const arrivals = [];        // { t } per body first seen, on the LEVEL clock
      const limit = Math.ceil((L.duration + 8) / 0.05);
      let steps = 0, rooms = 0, wasEmpty = true;
      // A body that can fire is a shooter; TUNING names them.
      const SHOOT = new Set(TUNING.waves.shooters.map(n => EnemyType[n]));
      const SUPPORT = new Set(['WARDEN','SIREN','SHEPHERD'].map(n => EnemyType[n]));
      let seenShooters = 0, seenMelee = 0, seenSupport = 0;
      for (; steps < limit && gameState === 'playing'; steps++) {
        fakeNow += 50;
        player.maxHp = 999; player.hp = 999; player._mercyT = 9e9;   // nobody is holding the stick
        loop();
        const clock = customLevel ? customLevel.clock : 0;
        // A directed room PINS `wave` to its difficulty, so counting changes
        // to it would always say 1. Count REFILLS: the floor going from empty
        // to occupied is one room rolled.
        const live = enemies.some(e => e.alive);
        if (live && wasEmpty) rooms++;
        wasEmpty = !live;
        for (const e of enemies) {
          if (e._probed) continue;
          e._probed = true;
          arrivals.push(+clock.toFixed(2));
          if (SHOOT.has(e.type)) seenShooters++; else seenMelee++;
          if (SUPPORT.has(e.type)) seenSupport++;
        }
        // Clear the floor now and then so the room must re-roll to keep the
        // pressure up — which is the behaviour under test.
        if (steps % 60 === 0) for (const e of enemies) if (e.alive) { e.hp = 1; if (e.hit(e.position.x, e.position.z)) onKill(e); }
      }
      const last = arrivals.length ? arrivals[arrivals.length - 1] : 0;
      return {
        id: L.id, duration: L.duration, difficulty: L.director && L.director.difficulty,
        tiers: L.grade && L.grade.tiers, state: gameState, steps,
        bodies: arrivals.length, firstAt: arrivals[0], lastAt: last, rooms,
        // v243: what the TWIST did, measured rather than asserted.
        twist: (L.rules && L.rules.twist) || null, maxHp: hpAtStart,
        shooterShare: seenShooters + seenMelee ? seenShooters / (seenShooters + seenMelee) : -1,
        support: seenSupport,
        result: lastLevelResult,
        // The same score must always earn the same grade, and the boundary is
        // level.js's, not a second copy here.
        gradeAt: (L.grade ? [0, L.grade.tiers[0] - 1, L.grade.tiers[0], L.grade.tiers[3]] : []).map(v => levelGradeFor(L, v)),
        best: levelBestFor(L.id),
      };
    },
  };
}
'''
open(p, 'w', encoding='utf-8').write(s)
EOF

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" LEVEL="$LEVEL" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 900, height: 600 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 200)); });
let checks = 0, fails = 0;
const ok = (name, cond, extra = '') => { checks++; if (cond) console.log('  ✓ ' + name); else { fails++; console.log('  ✘ ' + name + ' ' + extra); } };
const fail = async (msg) => { console.log('✗ CHALLENGE SMOKE FAIL: ' + msg); if (errs.length) console.log('  errors: ' + errs.slice(0,3).join(' | ')); await b.close(); process.exit(1); };

// A campaign is PROGRESS, so the gate must start from nothing every time or
// yesterday's bests would decide today's lock state.
await p.addInitScript(() => { try { localStorage.clear(); } catch (e) {} });
await p.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html?level=' + process.env.LEVEL + '#chprobe', { waitUntil: 'domcontentloaded' });
try { await p.waitForFunction('window._C && window._C.ready()', null, { timeout: 90000 }); }
catch (e) { await fail('the challenge never loaded (?level= did not arm pendingLevel)'); }
// ── v242: the campaign, BEFORE anything has been played ────────────────────
const c0 = await p.evaluate(() => window._C.campaign());
ok('the campaign has levels in order', Array.isArray(c0.ids) && c0.ids.length >= 3, JSON.stringify(c0.ids));
ok('the first is open and the rest are locked', c0.unlocked[0] === true && c0.unlocked.slice(1).every(u => u === false), JSON.stringify(c0.unlocked));
const o0 = await p.evaluate(() => window._C.open());
ok('the picker offers only the open one', o0.pickable === 1, JSON.stringify(o0));
ok('the level under test is in the campaign', c0.ids.includes(process.env.LEVEL), process.env.LEVEL);

const r = await p.evaluate(() => window._C.run());

ok('it is a DIRECTED room (no authored timeline)', Number.isInteger(r.difficulty), JSON.stringify(r.difficulty));
ok('it carries grade tiers', Array.isArray(r.tiers) && r.tiers.length === 4, JSON.stringify(r.tiers));
ok('the director filled the room', r.bodies > 0, 'bodies=' + r.bodies);
ok('the first bodies arrive early', r.firstAt !== undefined && r.firstAt < 5, 'firstAt=' + r.firstAt);
ok('the room is RE-ROLLED, not spawned once', r.rooms > 1, 'rooms=' + r.rooms);
ok('bodies keep arriving past the halfway mark', r.lastAt > r.duration * 0.5, 'lastAt=' + r.lastAt + ' of ' + r.duration);
ok('the level ended on its own clock', r.state !== 'playing' && !!r.result, 'state=' + r.state);
ok('…at about its duration', r.result && Math.abs(r.result.time - r.duration) <= 2.0, 'time=' + (r.result && r.result.time) + ' vs ' + r.duration);
ok('the run was graded', r.result && typeof r.result.grade === 'string', JSON.stringify(r.result && r.result.grade));
ok('the grade boundaries are level.js\'s and hold', JSON.stringify(r.gradeAt) === JSON.stringify(['', '', 'C', 'S']), JSON.stringify(r.gradeAt));
ok('cleared agrees with the grade', r.result && r.result.cleared === (r.result.grade !== ''));
ok('the best is remembered', r.best && r.best.score >= 0 && typeof r.best.grade === 'string', JSON.stringify(r.best));
// ── v242: and AFTER it — the run just played is what unlocks the next ──────
// Only the FIRST level can be asked this: clearing level four does not open
// level two, and asserting otherwise would be the gate misreading itself.
const c1 = await p.evaluate(() => window._C.campaign());
if (process.env.LEVEL === c0.ids[0]) {
  ok('playing and clearing the first opens the second', c1.unlocked[0] && c1.unlocked[1], JSON.stringify(c1.unlocked));
  ok('but no further than that', c1.unlocked.length < 3 || !c1.unlocked[2], JSON.stringify(c1.unlocked));
  ok('progress counts the clear', c1.progress.cleared === 1 && c1.progress.total === c0.ids.length, JSON.stringify(c1.progress));
  const o1 = await p.evaluate(() => window._C.open());
  ok('and the picker now offers two', o1.pickable === 2, JSON.stringify(o1));
} else {
  ok('a cleared level is remembered wherever it sits in the order', c1.progress.cleared === 1, JSON.stringify(c1.progress));
}

// ── v243: the twist did something, and it is the right something ───────────
if (r.twist === 'artillery') {
  ok('ARTILLERY: the room is the gun club', r.shooterShare > 0.9, 'shooter share=' + r.shooterShare.toFixed(2));
} else if (r.twist === 'onelife') {
  ok('ONE LIFE: one hit ends it', r.maxHp === 1, 'maxHp=' + r.maxHp);
} else if (r.twist === 'focus') {
  ok('FOCUS: the support species arrive', r.support > 0, 'support=' + r.support);
} else if (r.twist) {
  ok('the twist is carried into the run', typeof r.twist === 'string', r.twist);
} else {
  ok('a plain room has no twist and most bodies are not shooters', r.shooterShare < 0.8, 'shooter share=' + r.shooterShare.toFixed(2));
}

ok('no page errors', errs.length === 0, errs.slice(0,2).join(' | '));

console.log('  · ' + r.bodies + ' bodies over ' + r.rooms + ' rooms, ended ' + (r.result && r.result.time) + 's, score ' + (r.result && r.result.score) + ' → grade ' + JSON.stringify(r.result && r.result.grade));
await b.close();
if (fails) { console.log('✗ CHALLENGE SMOKE FAIL: ' + fails + ' of ' + checks); process.exit(1); }
console.log('✔ challenge smoke passed: ' + checks + ' checks — a directed room fills, re-rolls, runs its clock and grades');
"
