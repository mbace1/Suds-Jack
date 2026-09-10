#!/usr/bin/env node
// crowd-check.mjs — the swarm arrives as a fan, not a pile (v245).
//
// Bare node, no browser. Fake bodies pursue one point at a body's speed and
// js/crowd.js keeps them apart each frame, exactly as main.js calls it. Two
// things are pinned: that the hard RESOLVE is byte-for-byte the inline solver
// it replaced (so nothing already balanced moved), and that the new COMFORT and
// SLIDE terms do the one job they were written for — nine bodies arriving from
// ONE side spread round the target instead of queuing on the line to it.
import { resolveCrowd, CROWD_DEFAULTS } from '../toko-drop/js/crowd.js';

let checks = 0, fails = 0;
const ok = (name, cond, info = '') => { checks++; if (!cond) { fails++; console.error(`✘ ${name} ${info}`); } else console.log(`  ok   ${name}`); };
const HX = 11, HZ = 18, DT = 1 / 60;

function bodies(n, spread = 0.6, z0 = 7, r = 0.45) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ position: { x: ((i % 3) - 1) * spread, z: z0 + Math.floor(i / 3) * 0.9 }, radius: r, alive: true });
  return out;
}
// The pursuit never stops (contact IS the attack) and flockmates pull on each
// other at the game's cohesion rate — the two things that made the pile.
function pursue(bs, target, speed, stop = 0.05, dt = DT) {
  for (const b of bs) {
    const dx = target.x - b.position.x, dz = target.z - b.position.z, d = Math.hypot(dx, dz);
    if (d > stop) { b.position.x += dx / d * speed * dt; b.position.z += dz / d * speed * dt; b._velX = dx / d * speed; b._velZ = dz / d * speed; } else { b._velX = 0; b._velZ = 0; }
    // the game's own movement clamps a body to the arena; the fake pursuit must too, or the clamp check measures the fake
    b.position.x = Math.max(-HX + b.radius, Math.min(HX - b.radius, b.position.x)); b.position.z = Math.max(-HZ + b.radius, Math.min(HZ - b.radius, b.position.z));
    let cx = 0, cz = 0, n = 0;
    for (const o of bs) { if (o === b) continue; const ox = o.position.x - b.position.x, oz = o.position.z - b.position.z; if (ox * ox + oz * oz > 16) continue; cx += ox; cz += oz; n++; }
    if (n) { const gl = Math.hypot(cx, cz) || 1; b.position.x += (cx / gl) * 0.5 * dt; b.position.z += (cz / gl) * 0.5 * dt; }
  }
}
function run(cfg, frames = 360, target = { x: 0, z: 0 }) {
  const bs = bodies(9);
  for (let f = 0; f < frames; f++) { pursue(bs, target, 3.0); resolveCrowd(bs, DT, HX, HZ, target, cfg); }
  return bs;
}
const pileR = (bs, t) => Math.max(...bs.map(b => Math.hypot(b.position.x - t.x, b.position.z - t.z)));
const overlaps = bs => { let n = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = bs[i], b = bs[j]; if (Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z) < a.radius + b.radius - 1e-9) n++; } return n; };
const coverage = (bs, t) => { const ang = bs.map(b => Math.atan2(b.position.z - t.z, b.position.x - t.x)).sort((p, q) => p - q); let gap = 0; for (let i = 0; i < ang.length; i++) { const nxt = i + 1 < ang.length ? ang[i + 1] : ang[0] + Math.PI * 2; gap = Math.max(gap, nxt - ang[i]); } return (Math.PI * 2 - gap) * 180 / Math.PI; };
const nn = bs => { let s = 0; for (const a of bs) { let m = 1e9; for (const b of bs) { if (a === b) continue; m = Math.min(m, Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z)); } s += m; } return s / bs.length; };

// ── 1. the hard resolve is the old inline solver, exactly ─────────────────
// (a copy of what main.js had, as a reference; run both on the same bodies)
function oldSolver(enemies) {
  for (let _pass = 0; _pass < 2; _pass++) for (let _i = 0; _i < enemies.length; _i++) { const _a = enemies[_i]; if (!_a.alive) continue;
    for (let _j = _i + 1; _j < enemies.length; _j++) { const _b = enemies[_j]; if (!_b.alive) continue;
      const _dx = _a.position.x - _b.position.x, _dz = _a.position.z - _b.position.z, _d = Math.hypot(_dx, _dz), _min = _a.radius + _b.radius + 0.25;
      if (_d < _min && _d > 0.001 && _a._affix !== 'anchored' && _b._affix !== 'anchored') {
        const _over = (_min - _d) * 0.5, _nx = _dx / _d, _nz = _dz / _d;
        _a.position.x += _nx * _over; _a.position.z += _nz * _over; _b.position.x -= _nx * _over; _b.position.z -= _nz * _over;
        _a.position.x = Math.max(-HX + _a.radius, Math.min(HX - _a.radius, _a.position.x)); _a.position.z = Math.max(-HZ + _a.radius, Math.min(HZ - _a.radius, _a.position.z));
        _b.position.x = Math.max(-HX + _b.radius, Math.min(HX - _b.radius, _b.position.x)); _b.position.z = Math.max(-HZ + _b.radius, Math.min(HZ - _b.radius, _b.position.z));
      } } }
}
{
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const mk = () => { const out = []; for (let i = 0; i < 14; i++) out.push({ position: { x: rnd() * 4 - 2, z: rnd() * 4 - 2 }, radius: 0.35 + rnd() * 0.7, alive: rnd() > 0.1, _affix: rnd() > 0.85 ? 'anchored' : null }); return out; };
  seed = 7; const A = mk(); seed = 7; const B = mk();
  oldSolver(A); resolveCrowd(B, DT, HX, HZ, null, { pad: 0.25, comfort: 1, push: 0, slide: 0, passes: 2 });
  const same = A.every((a, i) => Object.is(a.position.x, B[i].position.x) && Object.is(a.position.z, B[i].position.z));
  ok('the hard resolve is byte-for-byte the inline solver it replaced (comfort 1, no push, no slide)', same);
}

// ── 2. nine from one door: a fan, not a pile ──────────────────────────────
const T = { x: 0, z: 0 };
const fresh = run(CROWD_DEFAULTS);
const stale = run({ pad: 0.25, comfort: 1, push: 0, slide: 0, passes: 2 });
const covF = coverage(fresh, T), covS = coverage(stale, T);
console.log(`  old solver: nn=${nn(stale).toFixed(2)} pile=${pileR(stale, T).toFixed(2)} cov=${covS.toFixed(0)}°  ·  v245: nn=${nn(fresh).toFixed(2)} pile=${pileR(fresh, T).toFixed(2)} cov=${covF.toFixed(0)}°`);
ok('no two bodies overlap when they arrive', overlaps(fresh) === 0, `overlaps=${overlaps(fresh)}`);
ok('they still ARRIVE — the nearest body reaches the target', Math.min(...fresh.map(b => Math.hypot(b.position.x, b.position.z))) < 0.6, JSON.stringify(fresh.map(b => +Math.hypot(b.position.x, b.position.z).toFixed(2))));
ok('they spread round the target: coverage ≥ 240°', covF >= 240, `coverage=${covF.toFixed(0)}°`);
ok('nearest-neighbour spacing is at least a quarter wider than the old solver left it', nn(fresh) >= nn(stale) * 1.25, `v245=${nn(fresh).toFixed(2)} old=${nn(stale).toFixed(2)}`);
ok('the pack is wider than a pile: outermost body ≥ 1.2× the old radius', pileR(fresh, T) >= pileR(stale, T) * 1.2, `v245=${pileR(fresh, T).toFixed(2)} old=${pileR(stale, T).toFixed(2)}`);
// A standing body in the path of a school is shoved by the hard RESOLVE —
// that is old behaviour and it stays. What v245 promises is that the new
// terms never HOLD IT BACK (a body not closing on the target is nobody's
// tailgater) — and what they turn out to give it is shelter: the school
// behind it is held off and slides round, so it is shoved less than half
// as far as the old solver shoved it. Same scene, new terms on and off.
{ const scene = cfg => { const bs = bodies(9); const holder = { position: { x: 0, z: 6 }, radius: 0.6, alive: true, _velX: 0, _velZ: 0 }; bs.push(holder);
    for (let f = 0; f < 240; f++) { pursue(bs.filter(b => b !== holder), T, 3.0); holder._velX = 0; holder._velZ = 0; resolveCrowd(bs, DT, HX, HZ, T, cfg); }
    return Math.hypot(holder.position.x, holder.position.z - 6); };
  const on = scene(CROWD_DEFAULTS), off = scene({ ...CROWD_DEFAULTS, push: 0, slide: 0 });
  ok('a body holding its ground is never held back — and a stream now flows ROUND it: shoved no further than before, in fact under half', on <= off * 0.5, `with=${on.toFixed(2)} without=${off.toFixed(2)}`); }
{ const a = run(CROWD_DEFAULTS), b = run(CROWD_DEFAULTS); ok('deterministic — the same input gives the same swarm', a.every((p, i) => p.position.x === b[i].position.x && p.position.z === b[i].position.z)); }
{ const bs = bodies(9); bs[4]._affix = 'anchored'; const x = bs[4].position.x, z = bs[4].position.z; for (let f = 0; f < 120; f++) { pursue(bs.filter(b => b !== bs[4]), T, 3); resolveCrowd(bs, DT, HX, HZ, T, CROWD_DEFAULTS); } ok('an anchored body is never moved', bs[4].position.x === x && bs[4].position.z === z); }
{ const bs = run(CROWD_DEFAULTS, 360, { x: HX - 0.2, z: HZ - 0.2 }); ok('every body stays inside the arena clamp', bs.every(b => Math.abs(b.position.x) <= HX - b.radius + 1e-9 && Math.abs(b.position.z) <= HZ - b.radius + 1e-9)); }
{ const bs = bodies(9); bs[2]._flopActive = true; bs[2]._flopX0 = bs[2].position.x; bs[2]._flopZ0 = bs[2].position.z; for (let f = 0; f < 60; f++) { const px = bs[2].position.x, pz = bs[2].position.z; pursue(bs, T, 3); const mx = bs[2].position.x - px, mz = bs[2].position.z - pz; bs[2]._flopX0 += mx; bs[2]._flopZ0 += mz; resolveCrowd(bs, DT, HX, HZ, T, CROWD_DEFAULTS); } ok('a flopping cube\'s tumble origin follows every nudge', Math.abs(bs[2]._flopX0 - bs[2].position.x) < 1e-9 && Math.abs(bs[2]._flopZ0 - bs[2].position.z) < 1e-9); }
{ const a = run(CROWD_DEFAULTS, 360); const bs = bodies(9); for (let f = 0; f < 180; f++) { pursue(bs, T, 3, 0.05, DT * 2); resolveCrowd(bs, DT * 2, HX, HZ, T, CROWD_DEFAULTS); } ok('at half the frame rate the fan is the same shape (dt-scaled): coverage within 25°', Math.abs(coverage(bs, T) - covF) <= 25, `30fps=${coverage(bs, T).toFixed(0)}° 60fps=${covF.toFixed(0)}°`); }

console.log(`\n${checks - fails} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
