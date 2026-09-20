#!/usr/bin/env bash
# scripts/soak.sh — THE LONG GAME. A scripted player is driven through the real
# loop to wave 40 in both modes, and the run is asserted, not just printed.
#
#   scripts/soak.sh              # both modes to wave 40
#   scripts/soak.sh 60 melee     # one mode, further out
#
# WHY THIS EXISTS (v258). Every other gate proves a thing BOOTS or that one
# short scripted sequence behaves. None of them plays the game for eight
# minutes, and the long game is where the wave director's arithmetic actually
# lands. Its first run found three things the short runs could not:
#
#   1. A FREEZE. A live-floor hold written as an early `return` inside loop()
#      skipped the player, the enemies, collisions and the round-end check. A
#      full floor stopped the game dead — one boss round ran 3359 seconds.
#      `maxRoundS` below is that assertion.
#   2. NO CEILING ON THE LIVE FLOOR. waves.caps bounds what a wave DRAWS, not
#      what STANDS, so carry-over stacked survivors under the next draw: 29
#      bodies through wave 12, 91 past wave 30. `maxAliveCap` is that one.
#   3. A DIFFICULTY CEILING. A flat revenge fieldCap bound from wave 6 to wave
#      40 — 34 waves of identical bullet pressure. Not assertable (it is a
#      curve, not a limit), but the printed table makes it obvious: watch the
#      `rev` column climb, or not.
#
# HOW DEEP TO RUN IT, and why the default is 40. The freeze above was
# reinstated as a negative control and the gate was run at **wave 12: it
# PASSED**. The hold it breaks is never reached that early — the floor never
# fills. At wave 40 the same build failed loudly (wave 18 ran 9814 s). A short
# soak proves nothing about the long game, which is the whole point of it:
# run it to 40 or not at all.
#
# The bot is INVINCIBLE on purpose. This gate is not about difficulty — a
# mortal bot dies at wave 8-12 and never reaches the arithmetic under test. It
# is a consistent, mediocre player whose only job is to keep the loop busy for
# forty waves. Nothing here measures fun.
#
# The clock is frozen (performance.now() replaced by a counter, loop() called
# synchronously, render and HUD stubbed) — the same trick level-smoke.sh uses,
# because under headless Chromium rAF fires once and then never.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
PLAYWRIGHT="${PLAYWRIGHT:-/opt/node22/lib/node_modules/playwright/index.mjs}"
WORK="${SOAK_DIR:-/tmp/toko-soak}"
PORT="${SOAK_PORT:-8769}"
TO_WAVE="${1:-40}"
MODES="${2:-both}"

rm -rf "$WORK"; mkdir -p "$WORK"
cp -r toko-drop "$WORK/testbed"
for sib in hub toko; do if [ -d "$sib" ]; then cp -r "$sib" "$WORK/$sib"; fi; done

# The probe, appended to the COPY's main.js. Nothing test-only reaches the tree.
cat >> "$WORK/testbed/js/main.js" <<'PROBE'

// ── SOAK PROBE (test only; appended by scripts/soak.sh) ─────────────────────
if (location.hash === '#soak') {
  let bot = { mx: 0, mz: 0, ax: 0, az: 0 };
  input.getMoveDir = () => ({ x: bot.mx, z: bot.mz });
  input.getAimDir  = () => ({ x: bot.ax, z: bot.az, valid: !!(bot.ax || bot.az) });
  window._S = {
    run({ melee, toWave }) {
      meleeOnlyMode = melee;
      renderer.render = () => {}; drawHUD = () => {};
      startGame();
      const realNow = performance.now.bind(performance);
      let fakeNow = realNow(); performance.now = () => fakeNow;
      const rows = []; let cur = null, idleT = 0, maxAlive = 0, maxBul = 0, maxRev = 0, ms = 0, steps = 0;
      const t0 = fakeNow;
      const flush = () => { if (cur) rows.push({ ...cur, dur: +((fakeNow - cur.t0) / 1000).toFixed(1),
        idle: +idleT.toFixed(1), maxAlive, maxBullets: maxBul, maxRevenge: maxRev,
        msPerStep: +(ms / Math.max(1, steps)).toFixed(3),
        scene: scene.children.length, enemies: enemies.length, bullets: bullets.active.length,
        powerups: powerups.length, gates: gates.length, dmgNums: damageNumbers.length }); };
      // A hard step budget: a frozen loop must END this run, not hang the gate.
      const MAX_STEPS = 200000;
      let n = 0;
      while (gameState === 'playing' && wave <= toWave && n++ < MAX_STEPS) {
        player.maxHp = 999; player.hp = 999; player._mercyT = 9e9;
        const px = player.position.x, pz = player.position.z;
        let ne = null, nd = 1e9, td = 1e9, tx = 0, tz = 0;
        for (const e of enemies) { if (!e.alive) continue;
          const d = Math.hypot(e.position.x - px, e.position.z - pz) - e.radius;
          if (d < nd) { nd = d; ne = e; } if (d < td) { td = d; tx = e.position.x; tz = e.position.z; } }
        for (const b of bullets.active) { if (b.isPlayer) continue;
          const d = Math.hypot(b.mesh.position.x - px, b.mesh.position.z - pz);
          if (d < td) { td = d; tx = b.mesh.position.x; tz = b.mesh.position.z; } }
        let mx = 0, mz = 0;
        if (td < 4.5) { const dx = px - tx, dz = pz - tz, l = Math.hypot(dx, dz) || 1; mx = dx / l; mz = dz / l; }
        else if (ne) { const dx = ne.position.x - px, dz = ne.position.z - pz, l = Math.hypot(dx, dz) || 1;
          mx = -dz / l * 0.8 + (l > 7 ? dx / l * 0.5 : -dx / l * 0.3);
          mz =  dx / l * 0.8 + (l > 7 ? dz / l * 0.5 : -dz / l * 0.3); }
        if (Math.abs(px) > HALF_X - 2.5) mx -= Math.sign(px) * 0.9;
        if (Math.abs(pz) > HALF_Z - 2.5) mz -= Math.sign(pz) * 0.9;
        const ml = Math.hypot(mx, mz) || 1; bot.mx = mx / ml; bot.mz = mz / ml;
        if (ne) { const dx = ne.position.x - px, dz = ne.position.z - pz, l = Math.hypot(dx, dz) || 1;
          bot.ax = dx / l; bot.az = dz / l; } else { bot.ax = 0; bot.az = 0; }
        if (td < 1.4 && (mx || mz)) player.dash({ x: bot.mx, z: bot.mz, valid: true });
        fakeNow += 50;
        const r0 = realNow(); loop(); ms += realNow() - r0; steps++;
        if (!cur || cur.wave !== wave) { flush();
          cur = { wave, kind: waveKind(wave), t0: fakeNow, at: +((fakeNow - t0) / 1000).toFixed(0) };
          idleT = 0; maxAlive = 0; maxBul = 0; maxRev = 0; ms = 0; steps = 0; }
        let alive = 0; for (const e of enemies) if (e.alive) alive++;
        if (alive === 0) idleT += 0.05;
        maxAlive = Math.max(maxAlive, alive);
        let eb = 0, rb = 0; for (const b of bullets.active) if (!b.isPlayer) { eb++; if (b.revenge) rb++; }
        maxBul = Math.max(maxBul, eb); maxRev = Math.max(maxRev, rb);
      }
      flush(); performance.now = realNow;
      return { melee, wave, t: +((fakeNow - t0) / 1000).toFixed(0), steps: n, rows };
    },
  };
}
PROBE

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

CHROMIUM="$CHROMIUM" PORT="$PORT" TO_WAVE="$TO_WAVE" MODES="$MODES" WORK="$WORK" \
node --input-type=module -e "
import { chromium } from '$PLAYWRIGHT';
import { writeFileSync } from 'node:fs';
const TO = +process.env.TO_WAVE;
const modes = process.env.MODES === 'both' ? [true, false]
            : [process.env.MODES === 'melee'];
// The thresholds. Each one is a bug this gate has already caught once.
const LIMITS = {
  maxRoundS: 90,      // a round longer than this is a stall, not a fight (the freeze was 3359)
  maxAlive: 140,      // the live floor has a ceiling; carry-over must not stack past it
  sceneGrowth: 2.5,   // last-quarter scene objects vs first-quarter — a leak grows without bound
};
const b = await chromium.launch({ executablePath: process.env.CHROMIUM,
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const all = []; const bad = [];
for (const melee of modes) {
  const page = await (await b.newContext({ viewport: { width: 700, height: 560 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto('http://127.0.0.1:' + process.env.PORT + '/testbed/index.html#soak', { waitUntil: 'load' });
  await page.waitForFunction('window._S', null, { timeout: 90000 });
  const r = await page.evaluate(([m, w]) => window._S.run({ melee: m, toWave: w }), [melee, TO]);
  r.errs = errs; all.push(r);
  const tag = melee ? 'CLOSE COMBAT' : 'CLASSIC';
  console.log('');
  console.log('· ' + tag + ': reached wave ' + r.wave + ' in ' + r.t + 's of game (' + r.steps + ' steps)');
  console.log('  wave kind      at    dur  idle  alive  eBul  rev   ms/step | scene  pu gate');
  for (const w of r.rows) if (w.kind !== 'normal' || w.wave % 5 === 0 || w.wave <= 2)
    console.log('  ' + String(w.wave).padStart(4) + ' ' + w.kind.padEnd(8) + ' ' + String(w.at).padStart(4) + 's '
      + String(w.dur).padStart(5) + ' ' + String(w.idle).padStart(5) + ' ' + String(w.maxAlive).padStart(6) + ' '
      + String(w.maxBullets).padStart(5) + ' ' + String(w.maxRevenge).padStart(4) + ' '
      + String(w.msPerStep).padStart(8) + ' | ' + String(w.scene).padStart(5) + ' '
      + String(w.powerups).padStart(3) + ' ' + String(w.gates).padStart(4));
  // ── assertions ──
  if (errs.length) bad.push(tag + ': ' + errs.length + ' page error(s) — ' + [...new Set(errs)].slice(0, 2).join(' | '));
  if (r.wave < TO) bad.push(tag + ': stalled at wave ' + r.wave + ' of ' + TO + ' (a frozen loop looks exactly like this)');
  const longest = r.rows.reduce((a, w) => w.dur > a.dur ? w : a, { dur: 0, wave: 0 });
  if (longest.dur > LIMITS.maxRoundS) bad.push(tag + ': wave ' + longest.wave + ' ran ' + longest.dur + 's (limit ' + LIMITS.maxRoundS + ') — the round never ended');
  const peak = r.rows.reduce((a, w) => w.maxAlive > a.maxAlive ? w : a, { maxAlive: 0, wave: 0 });
  if (peak.maxAlive > LIMITS.maxAlive) bad.push(tag + ': wave ' + peak.wave + ' held ' + peak.maxAlive + ' live bodies (limit ' + LIMITS.maxAlive + ')');
  const q = Math.max(1, Math.floor(r.rows.length / 4));
  const avg = ws => ws.reduce((s, w) => s + w.scene, 0) / ws.length;
  const first = avg(r.rows.slice(0, q)), last = avg(r.rows.slice(-q));
  console.log('  scene objects: first quarter ' + first.toFixed(0) + ' -> last quarter ' + last.toFixed(0)
    + ' (x' + (last / first).toFixed(2) + ', limit x' + LIMITS.sceneGrowth + ')');
  if (last / first > LIMITS.sceneGrowth) bad.push(tag + ': scene objects grew x' + (last / first).toFixed(2) + ' — a leak');
  await page.context().close();
}
writeFileSync(process.env.WORK + '/soak.json', JSON.stringify(all, null, 1));
console.log('');
console.log('· wrote ' + process.env.WORK + '/soak.json');
await b.close();
if (bad.length) { for (const m of bad) console.log('  ✗ ' + m); console.log('✗ SOAK FAIL'); process.exit(1); }
console.log('✔ soak passed: ' + modes.length + ' mode(s) played to wave ' + TO + ' — no stalls, no leaks, the floor stayed bounded');
"
