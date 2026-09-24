#!/usr/bin/env bash
# campaign-bot.sh — v265. Plays every campaign room N times with a bot and
# prints how often it lived and what it was graded. A MEASURING INSTRUMENT,
# not a gate: it never fails a build. Its job is the question the level gates
# cannot answer — is this room the right difficulty for where it sits?
#
#   scripts/campaign-bot.sh              # human-like bot, 10 runs a room
#   SKILL=1 scripts/campaign-bot.sh      # the perfect-aim bot
#   RUNS=20 ONLY=7,9 scripts/campaign-bot.sh
#
# TWO bots, because one bot is one opinion (Slay Kallio's lesson):
#   SKILL=1   perfect aim, reads the field every frame — "is S reachable?"
#   SKILL=0.6 sees threats later, re-reads the field every 0.25 s, aims with
#             about ±12° of jitter — a rough stand-in for a person
# The human-like bot DODGES AWAY from the nearest bullet; it does not look for
# the gap in THE VEIN's sweep, so it under-rates flawless rooms under a sweep.
# Read its flawless column with that in mind.
#
# NOISE: at 10 runs a room's lived rate is worth about ±3 (binomial). Two runs
# of identical content read 9/10 and 5/10 on the same room in v265. Do not tune
# on a difference smaller than that; raise RUNS instead.
#
# The clock is owned by the probe (level-smoke's lesson) and ONE fake clock
# spans every run in a page — restarting it per run sent the game's timestamp
# backwards and every run after the third timed out doing nothing.
set -euo pipefail
cd "$(dirname "$0")/.."
CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${CAMPAIGN_DIR:-/tmp/toko-campaign}"
PORT="${CAMPAIGN_PORT:-8771}"
rm -rf "$WORK"; mkdir -p "$WORK"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi; done
cat >> "$WORK/testbed/js/main.js" <<'PROBE'
// ── CAMPAIGN BOT (test only; appended by scripts/campaign-bot.sh) ──────────
if (location.hash === '#room') {
  let bot = { mx: 0, mz: 0, ax: 0, az: 0 };
  input.getMoveDir = () => ({ x: bot.mx, z: bot.mz });
  input.getAimDir  = () => ({ x: bot.ax, z: bot.az, valid: !!(bot.ax || bot.az) });
  const realNow = performance.now.bind(performance);
  let fakeNow = realNow();   // ONE clock for every run in this page — it must never go backwards
  window._R = {
    rooms: () => campaignRooms(),
    async play(index, skill = 1) {
      renderer.render = () => {}; drawHUD = () => {};
      window.requestAnimationFrame = () => 0;
      const room = campaignRooms()[index];
      const level = await loadBundledLevel(room.id);
      performance.now = () => fakeNow;
      let hits = 0;
      lastLevelResult = null;
      campaignRoom = { level, room }; playLevel(level, 0, room);
      const oh = player.hit.bind(player); player.hit = (...a) => { hits++; return oh(...a); };
      const look = TUNING.depth.looks[_depthIdx]?.name, rule = worldRule();
      let steps = 0;
      const human = skill < 1, react = human ? 0.25 : 0.05, jitter = human ? 0.22 : 0;
      let seeT = 0, hold = null;
      // step until the ROOM reports — a death plays out before it does
      while (!lastLevelResult && steps < 20 * 120) {
        seeT -= 0.05;
        if (hold && seeT > 0) { fakeNow += 50; loop(); steps++; if (gameState === 'gameover') returnToTitle(); continue; }   // still acting on the last look
        seeT = react;
        const px = player.position.x, pz = player.position.z;
        let ne = null, nd = 1e9, td = 1e9, tx = 0, tz = 0;
        for (const e of enemies) { if (!e.alive) continue; const d = Math.hypot(e.position.x - px, e.position.z - pz) - e.radius; if (d < nd) { nd = d; ne = e; } if (d < td) { td = d; tx = e.position.x; tz = e.position.z; } }
        for (const b of bullets.active) { if (b.isPlayer) continue; const d = Math.hypot(b.mesh.position.x - px, b.mesh.position.z - pz); if (d < td) { td = d; tx = b.mesh.position.x; tz = b.mesh.position.z; } }
        let mx = 0, mz = 0;
        if (td < 4.5 * skill) { const dx = px - tx, dz = pz - tz, l = Math.hypot(dx, dz) || 1; mx = dx / l; mz = dz / l; }
        else if (ne) { const dx = ne.position.x - px, dz = ne.position.z - pz, l = Math.hypot(dx, dz) || 1; mx = -dz / l * 0.8 + (l > 7 ? dx / l * 0.5 : -dx / l * 0.3); mz = dx / l * 0.8 + (l > 7 ? dz / l * 0.5 : -dz / l * 0.3); }
        if (Math.abs(px) > HALF_X - 2.5) mx -= Math.sign(px) * 0.9;
        if (Math.abs(pz) > HALF_Z - 2.5) mz -= Math.sign(pz) * 0.9;
        const ml = Math.hypot(mx, mz) || 1; bot.mx = mx / ml; bot.mz = mz / ml;
        if (ne) { const a = Math.atan2(ne.position.z - pz, ne.position.x - px) + (Math.random() - 0.5) * 2 * jitter; bot.ax = Math.cos(a); bot.az = Math.sin(a); } else { bot.ax = 0; bot.az = 0; }
        hold = true;
        if (td < 1.4 && (mx || mz)) player.dash({ x: bot.mx, z: bot.mz, valid: true });
        fakeNow += 50; loop(); steps++;
        if (gameState === 'gameover') returnToTitle();   // a death reports once its screen is dismissed
      }
      performance.now = realNow; player.hit = oh;
      const res = lastLevelResult;
      const grade = res ? campaignGrade(room, level, res) : '?';
      return { id: room.id, world: room.world + 1, look, rule, goal: room.goal, need: room.kills ?? null,
               bodies: roomBodies(level), dur: level.duration, outcome: res?.outcome, kills: res?.kills, time: res?.time, hits, grade };
    },
  };
}
PROBE
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1
CHROMIUM="$CHROMIUM" PORT="$PORT" node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
const RUNS = +(process.env.RUNS || 10), WORKERS = +(process.env.WORKERS || 4), SKILL = +(process.env.SKILL || 0.6);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
const url = 'http://127.0.0.1:' + process.env.PORT + '/testbed/index.html#room';
let n = 0;
const probe = await (await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })).newPage();
await probe.goto(url, { waitUntil: 'load' });
await probe.waitForFunction(() => window._R, null, { timeout: 30000 });
const count = await probe.evaluate(() => window._R.rooms().length);
await probe.context().browser().close();
const rooms = [...Array(count).keys()].filter(i => !ONLY || ONLY.includes(i + 1));
const rows = [];
async function worker(k) {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM, args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const i of rooms.filter((_, j) => j % WORKERS === k)) {
    const page = await (await b.newContext({ viewport: { width: 900, height: 560 } })).newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message.slice(0, 140)));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => window._R, null, { timeout: 30000 });
    for (let r = 0; r < RUNS; r++) { const x = await page.evaluate(([i, sk]) => window._R.play(i, sk), [i, SKILL]); x.index = i; x.errs = [...errs]; errs.length = 0; rows.push(x); }
    await page.context().close();
  }
  await b.close();
}
await Promise.all([...Array(WORKERS).keys()].map(worker));
rows.sort((a, b) => a.index - b.index);
const w = (s, n) => String(s ?? '').padEnd(n);
console.log('SKILL ' + SKILL + ', ' + RUNS + ' runs a room');
console.log(w('#', 3) + w('room', 13) + w('world', 13) + w('goal', 10) + w('bodies', 7) + w('lived', 7) + 'S  A  B  C  F');
const ids = [...new Set(rows.map(r => r.index))];
for (const i of ids) {
  const rs = rows.filter(r => r.index === i), c = g => rs.filter(r => r.grade === g).length;
  console.log(w(i + 1, 3) + w(rs[0].id, 13) + w(rs[0].look, 13) + w(rs[0].goal, 10) + w(rs[0].bodies, 7) + w(rs.filter(r => r.outcome !== 'dead').length + '/' + rs.length, 7) + ['S','A','B','C','F'].map(g => String(c(g)).padEnd(3)).join(''));
}
const errs = rows.flatMap(r => r.errs);
if (errs.length) { console.log('page errors:', [...new Set(errs)].slice(0, 5)); process.exit(1); }
"
