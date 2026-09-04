#!/usr/bin/env bash
# level-smoke.sh — P1's browser gate: an authored level actually PLAYS.
#
# scripts/level-check.mjs proves a level file parses and schedules in bare
# node. This proves the other half, in the real game in headless Chromium:
# opened with ?level=<id>, the level loads, a run starts, every authored spawn
# appears — at the authored second, at the authored position, as the authored
# type — and, once the timeline is spent and the floor is cleared, the level
# ends on the results card rather than rolling another wave.
#
# Same recipe as smoke.sh (a throwaway copy, a probe APPENDED to main.js that
# never ships, Chromium under virtual time, console lines as the verdict),
# except that the probe OWNS THE CLOCK and steps the game loop itself in a
# synchronous burst — see the note in it.
# The probe has module scope in main.js, so it reads `activeLevel`,
# `enemies` and `waveTimer` directly and calls startGame() itself.
#
# Requirements: Chromium at $CHROMIUM, python3. Nothing is fetched.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROMIUM="${CHROMIUM:-/opt/pw-browsers/chromium}"
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

# The probe. Appended, never shipped.
python3 - "$WORK/testbed/js/main.js" <<'EOF'
import sys
p = sys.argv[1]
src = open(p, encoding='utf-8').read()
src += r'''

// ── LEVEL PROBE (test only; appended by scripts/level-smoke.sh) ──────────────
(async () => {
  const out = (m) => console.log('LEVELPROBE: ' + m);
  try {
    for (let i = 0; i < 200 && !activeLevel; i++) await new Promise(r => setTimeout(r, 25));
    if (!activeLevel) { out('FATAL: level did not load'); return; }
    const L = activeLevel;
    out(`loaded ${L.id} spawns=${L.spawns.length} duration=${L.duration}`);
    startGame();
    out(`started arena=${HALF_X}x${HALF_Z} state=${gameState}`);
    // The pixels are not under test and swiftshader makes each frame cost
    // ~150 ms of real time; the simulation is the whole point. Stub the
    // draw so 53 s of level time fits the budget.
    renderer.render = () => {};
    const want = L.spawns.map(s => ({ t: s.t, type: EnemyType[s.type], name: s.type, px: s.px, pz: s.pz }));
    const seen = [];
    let done = false;
    // THE CLOCK IS OURS. loop() reads performance.now() once per call and
    // derives dt from it, so the probe replaces the clock with a counter,
    // advances it 50 ms (loop() clamps dt at 0.05 anyway) and calls loop()
    // synchronously — no timers, no requestAnimationFrame, and none of
    // headless Chromium's virtual-time policies in the path. Three earlier
    // cuts of this gate relied on rAF (fires once, then never) and then on
    // chained setTimeout (stops at ~20 s of game time for a reason nobody
    // could see in the console); a burst of plain calls has no such reason.
    const realNow = performance.now.bind(performance);
    const realStart = realNow();
    let fakeNow = realStart;
    performance.now = () => fakeNow;
    // Neither picture is under test. renderer.render was stubbed above; the
    // HUD is a canvas-2D pass that is just as slow under swiftshader.
    drawHUD = () => {};
    let steps = 0, lastMark = -1;
    const limit = Math.ceil((L.duration + 10) / 0.05);
    for (; steps < limit && gameState === 'playing'; steps++) {
      fakeNow += 50;
      // Nobody is holding the stick: without this the first pounce ends the
      // run at ~6 s and the timeline is never spent. The bodies are what is
      // under test, not the player's survival.
      player.maxHp = 999; player.hp = 999;
      loop();
      const mark = Math.floor(waveTimer / 5);
      if (mark !== lastMark) { lastMark = mark; out(`t=${waveTimer.toFixed(2)} steps=${steps} enemies=${enemies.length} pending=${pendingSpawns.length} state=${gameState}`); }
      for (const e of enemies) {
        if (e._probed) continue;
        e._probed = true;
        seen.push({ t: waveTimer, type: e.type, x: e.position.x, z: e.position.z });
      }
      if (seen.length >= want.length) {
        // The timeline is spent: clear the floor so the level can end. Every
        // step, not once — a cube takes more than one hit, SPLITTA splits, and
        // the clear needs every body dead AND done dying. Same idiom as
        // smoke.sh's harness: hit(), then destroy() if it is still standing.
        done = true;
        for (const e of enemies) if (e.alive) { e.hp = 1; e.hit(e.position.x, e.position.z); if (e.alive) e.destroy(); }
      }
      if (steps % 500 === 0) out(`real ${((realNow() - realStart) / 1000).toFixed(1)}s at step ${steps}`);
    }
    if (gameState !== 'gameover') out(`timed out at t=${waveTimer.toFixed(2)} state=${gameState} seen=${seen.length} pending=${pendingSpawns.length}`);
    let bad = 0;
    out(`seen ${seen.length} of ${want.length}`);
    // The cross-build format tools/level-parity.mjs (Godot port) reads:
    // one first-sighting line per body. The gate below saves them.
    const names = Object.fromEntries(Object.entries(EnemyType).map(([k, v]) => [v, k]));
    seen.forEach((s, i) => out(`SPAWN ${i} ${names[s.type]} t=${s.t.toFixed(3)} x=${s.x.toFixed(3)} z=${s.z.toFixed(3)}`));
    for (let i = 0; i < want.length; i++) {
      const w = want[i], s = seen[i];
      if (!s) { out(`MISSING ${i} ${w.name} @${w.t}s`); bad++; continue; }
      // The pump spawns and update() runs in the same loop() call, so a body
      // is first seen one step (0.05 s) into its life; the very first spawn
      // also gets the game's own initial frame. Two frames of motion at
      // pounce speed (~8 u/s) is under 1.0 unit and 0.15 s.
      const dt = Math.abs(s.t - w.t), dx = Math.abs(s.x - w.px), dz = Math.abs(s.z - w.pz);
      const okT = dt <= 0.15, okP = dx <= 1.0 && dz <= 1.0, okTy = s.type === w.type;
      if (!(okT && okP && okTy)) {
        out(`MISMATCH ${i} ${w.name}: t ${w.t}->${s.t.toFixed(3)} pos (${w.px},${w.pz})->(${s.x.toFixed(2)},${s.z.toFixed(2)}) type ${w.type}->${s.type}`);
        bad++;
      }
    }
    out(`ended state=${gameState} wave=${wave} steps=${steps}`);
    if (gameState !== 'gameover') { out('FAIL: the level did not end on the results card'); bad++; }
    if (wave !== 1) { out('FAIL: a level rolled a second wave (wave=' + wave + ')'); bad++; }
    out(bad ? `FAIL ${bad}` : 'ALL OK');
  } catch (e) { out('FATAL: ' + e.message + '\n' + e.stack); }
})();
'''
open(p, 'w', encoding='utf-8').write(src)
EOF

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$WORK" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

echo "· playing level '$LEVEL' headless"
# --autoplay-policy: without it every sound call re-tries AudioContext.resume()
# and Chrome logs the refusal — 637,000 console lines in one run, measured —
# and that pipe is what "stalled" the first attempts at this gate.
# The level runs ~duration seconds of virtual time plus the clear beat.
LOG=$(timeout 180 "$CHROMIUM" --headless=new --disable-gpu --no-sandbox \
  --enable-unsafe-swiftshader --enable-logging=stderr --v=0 --no-proxy-server \
  --autoplay-policy=no-user-gesture-required --window-size=480,320 --virtual-time-budget=8000 --dump-dom "http://127.0.0.1:$PORT/testbed/index.html?level=$LEVEL" \
  2>&1 >/dev/null | grep -i "CONSOLE" || true)
printf '%s
' "$LOG" > "$WORK/console.log"
# The spawn log, for the Godot port's cross-build parity gate.
{ echo "$LOG" | grep -o "LEVELPROBE: SPAWN [^\"]*" | sed "s/LEVELPROBE: //" > "$WORK/seen-$LEVEL.txt"; } || true
echo "$LOG" | grep -o "LEVELPROBE: [^\"]*" | head -60
echo "$LOG" | grep -o "LEVEL: [^\"]*" | head -3
if echo "$LOG" | grep -qi "uncaught\|SyntaxError\|TypeError\|ReferenceError"; then
  echo "$LOG" | grep -i "uncaught\|error" | head -5
  echo "✗ LEVEL SMOKE FAIL: the game threw"
  exit 1
fi
if ! echo "$LOG" | grep -q "LEVELPROBE: ALL OK"; then
  echo "✗ LEVEL SMOKE FAIL: the level did not play as authored"
  exit 1
fi
echo "✔ level smoke passed: '$LEVEL' loads, every spawn lands as authored, and the level ends"
