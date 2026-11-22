#!/usr/bin/env node
// floorshift.mjs — an arcade world's floor that moves for a wave (v44,
// sim/floorshift.js), in bare node: which waves, never a challenge's or a
// boss's, warned before it moves, the floor really moving and the hero kept on
// it, whole again at the next wave, and sized off the world's floor even while
// a challenge has its walls closed in.
import { createWorld, step } from '../js/sim/world.js?v=160';
import { TUNING as T } from '../js/tuning.js?v=160';
// the floor's moves are held on 1.x's pressure: under v54's gentler ramp the
// shifted wave can clear before the 12 s these checks watch it for
T.waves.gentle = null;
import { shiftFor } from '../js/sim/floorshift.js?v=160';
import { trialFor } from '../js/sim/challenge.js?v=160';

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const dt = T.sim.dt, E = T.waves.rhythm.bossEvery, WARN = T.worlds.shift.warn;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const withShift = T.worlds.list.map((W, i) => (W.shift ? i + 1 : 0)).filter(Boolean);

// a run brought to the start of wave `n` of world `k`, the floor empty
function at(k, n, { seed = 5, mode = 'arcade' } = {}) {
  const w = createWorld({ seed, mode, world: k });
  w.hero.invinc = 1e9;
  step(w, IDLE);
  w.gels = []; w.dir.queue = []; w.dir.wave = (k - 1) * E + n - 1; w.dir.gapT = 1e-9;
  step(w, IDLE);
  return w;
}
const run = (w, s) => { const ev = []; for (let i = 0; i < s / dt; i++) { step(w, IDLE); ev.push(...w.events); } return ev; };

// which waves
{
  check('three worlds have a shift: the river, the ice, the core', withShift.join() === '6,7,9', withShift.join());
  let clash = [];
  for (const k of withShift) {
    const S = T.worlds.list[k - 1].shift, wave = (k - 1) * E + S.at;
    for (let s = 0; s < 8; s++) if (trialFor(wave, s, k)) clash.push(`trial ${k}:${wave}`);
    if (wave % E === 0) clash.push(`boss ${k}:${wave}`);
  }
  check('a shift wave is never a challenge wave or a boss wave', !clash.length, clash.join(' '));
  const w = createWorld({ seed: 5, mode: 'arcade', world: 6 });
  const S = T.worlds.list[5].shift, wave = 5 * E + S.at;
  check('only its own wave of its own world', shiftFor(w, wave) === S && !shiftFor(w, wave - 1) && !shiftFor(w, wave + 1));
  check('…and only in ARCADE and HARDCADE', !shiftFor({ mode: 'campaign', world: 6 }, wave) && !shiftFor({ mode: 'survival', world: 6 }, wave) && !!shiftFor({ mode: 'hardcade', world: 6 }, wave));
}

// each shift: warned, then the floor moves, the hero kept on it, and whole again after
for (const k of withShift) {
  const S = T.worlds.list[k - 1].shift, w = at(k, S.at);
  const warned = w.events.some((e) => e.type === 'shiftWarn' && e.kind === S.kind) && !w.region;
  check(`world ${k} (${S.kind}): the wave starts with a warning and the floor still whole`, warned && w.shift?.phase === 'warn');
  const ev = run(w, WARN + 0.1);
  check(`world ${k}: after ${WARN} s the floor takes the shape`, ev.some((e) => e.type === 'shift') && !!w.region);
  // v59: it closes in on its shape rather than snapping to it — a corner of the floor is still floor as it
  // starts, and a shape that leaves the corners leaves them once it has closed
  const cx = w.shift.box.hx * 0.9, cz = w.shift.box.hz * 0.9, cornerAtStart = w.region.contains(cx, cz, 0);
  // it moves: sample its box and a probe point's distance over a period, for as long as its wave lasts
  // (v59: a smaller floor holds fewer bodies, so a short wave can end inside the watch)
  const seen = new Set(); let outside = 0, watched = 0, cornerClosed = null, end = false;
  for (let i = 0; i < 12 / dt; i++) {
    // the hero leans on the edge, toward the far corner: the floor must hold it
    step(w, { ...IDLE, mx: 0.7, mz: -0.7 });
    if (w.events.some((e) => e.type === 'shiftEnd')) { end = true; break; }
    watched++;
    if (i === Math.ceil((T.worlds.shift.close + 0.1) / dt)) cornerClosed = !w.region.contains(cx, cz, 0);
    if (i % 30 === 0) seen.add(`${w.region.halfX.toFixed(1)}:${w.region.halfZ.toFixed(1)}:${w.region.sdf(0, 0).toFixed(1)}`);
    if (!w.region.contains(w.hero.x, w.hero.z, 0)) outside++;
  }
  if (S.parts.some((p) => p.kind === 'circle')) check(`world ${k}: the floor closes in on its shape over ${T.worlds.shift.close} s instead of snapping`, cornerAtStart && cornerClosed === true, JSON.stringify({ cornerAtStart, cornerClosed }));
  check(`world ${k}: the floor moves (${seen.size} different shapes in ${(watched * dt).toFixed(1)} s)`, seen.size >= 6 && watched * dt >= 6);
  check(`world ${k}: and the hero is kept on it`, outside === 0, `${outside} steps off it`);
  // the next wave: whole again
  if (!end) {
    w.dir.gapT = 1e-9; w.dir.queue = []; w.gels = [];
    const before = w.dir.wave;
    for (let i = 0; i < 2 / dt && w.dir.wave === before; i++) { step(w, IDLE); if (w.events.some((e) => e.type === 'shiftEnd')) end = true; }
  }
  check(`world ${k}: at the next wave the floor is whole again`, end && !w.region && !w.shift, JSON.stringify({ end, region: !!w.region, wave: w.dir.wave }));
}

// sized off the world's floor, not its walls
{
  const k = 9, S = T.worlds.list[k - 1].shift, w = at(k, S.at);
  const home = { hx: w.hx, hz: w.hz };
  // the walls closed in by a challenge still running
  w.squeeze = { phase: 'hold', t: 0, from: home, to: { hx: home.hx * 0.7, hz: home.hz * 0.7 }, home, back: false, world: k };
  w.hx = home.hx * 0.7; w.hz = home.hz * 0.7;
  w.shift = null;
  const { start } = await import('../js/sim/floorshift.js?v=160');
  start(w, S);
  check('a shift begun while the walls are in is sized off the world\'s floor', w.shift.box.hx === home.hx && w.shift.box.hz === home.hz, JSON.stringify(w.shift.box));
}

// the same seed, the same floor
{
  const F = T.worlds.list[6].shift.at, a = at(7, F, { seed: 9 }), b = at(7, F, { seed: 9 });
  run(a, WARN + 3); run(b, WARN + 3);
  check('a shift replays from its seed', a.region.sdf(1, 1) === b.region.sdf(1, 1) && a.hero.x === b.hero.x);
}

console.log(failed ? `\n✗ floorshift: ${failed} failed, ${passed} passed` : `✔ floorshift: ${passed} checks`);
process.exit(failed ? 1 : 0);
