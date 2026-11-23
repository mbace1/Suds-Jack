#!/usr/bin/env node
// shepherd.mjs — SHEPHERD's own checks, in bare node: 1.x's numbers
// (enemy.js:557-560, 569-571, 622-624, 662, 669-670, 783-787, 811-817, 1000,
// 1134-1147, 1607, 1682, 1699-1700, 1769-1791, 2726-2737, 2779, 3009;
// main.js:2410-2421, 4476-4481, 9406, 10233-10260, 10369; tuning.js:32, 297,
// 314, 496-497), asserted
// against the sim on its fixed 1/60 s step and the look against real three.
// The pocket is checked against an ORACLE: 1.x's own per-frame arithmetic for
// the SHEPHERD case of update() and the non-blob squash spring after it, in
// 1.x's literals (not the tuning file's), with the hero walking a path — so
// every step's position, spin and squash must match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=163';
import { TUNING as T } from '../../js/tuning.js?v=163';
import { BEHAVIOUR } from '../../js/sim/species/index.js?v=163';
import behaviour from '../../js/sim/species/shepherd.js?v=163';
import look from '../../js/render/looks/shepherd.js?v=163';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const S = T.species.shepherd, H = S.hold, L = S.look, R = L.ring, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);

// The bodies a SHEPHERD herds are stand-ins that never move on their own: a
// PYRA kind (role FIXED, so the swarm forces give it nothing but the herd)
// with no behaviour, in this process only.
BEHAVIOUR.pyra = { step() {} };

// a world with nothing in it but what a check puts there; the hero where
// asked, never running out of lives
function world({ seed = 1, mode = 'arcade', hero = [0, 0], dashMode = 'pass' } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  return w;
}
// a SHEPHERD where it is put: anchored (no swarm forces, no crowd) unless
// asked, so its own step is all that moves it; `still` holds it at speed 0.
// Every body is live from its first step (1.x had no appear phase: a body is
// alive from its constructor, enemy.js:662), so there is nothing to skip.
function put(w, x, z, { o = {}, anchored = true, still = false } = {}) {
  const g = api.spawn(w, 'shepherd', x, z, { ...(still ? { speedMult: 0 } : {}), ...o });
  g.anchored = anchored;
  return g;
}
const stand = (w, x, z) => api.spawn(w, 'pyra', x, z);
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.6, hp 3, speed 1.6, teal 0x66ffcc (1.x enemy.js:624)', S.radius === 0.6 && S.hp === 3 && S.speed === 1.6 && S.color === 0x66ffcc);
  check('CFG: no gun, never fires (1.x enemy.js:624, 2788-2790)', S.bulletColor === null && S.fireInterval === null);
  check('its own body (a spire), HERDER, harmless to touch in classic (not in MELEE_TYPES), not a biter',
    S.family === 'custom' && S.role === 'HERDER' && S.contact === false && S.revenge === null && !S.noHpMult);
  const MR = T.movement.roles.HERDER;
  check('HERDER\'s share of the swarm forces: dodge 0.6, flock 0, current 0.3, weave 0.2 (1.x tuning.js:297)',
    MR.dodge === 0.6 && MR.flock === 0 && MR.current === 0.3 && MR.weave === 0.2);
  check('the herd: 7.5 ring (SHEPHERD_RADIUS), 2.8 u/s at you, not inside 1.2 (1.x enemy.js:571, main.js:10246-10257)',
    S.herd.radius === 7.5 && S.herd.speed === 2.8 && S.herd.stopAt === 1.2);
  check('the pocket: hold 9 ± 1, back off × 1.15, circle × 0.8; distance floor 0.001 (1.x enemy.js:1682, 1774-1783)',
    H.distance === 9 && H.band === 1 && H.backOff === 1.15 && H.circle === 0.8 && S.distFloor === 0.001);
  check('the baton spins 2.2 rad/s (1.x enemy.js:1785)', S.spin === 2.2);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2731)',
    S.squash.spring === 0.18 && S.squash.damp === 0.90 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('the kill voice is 1.x\'s non-blob pop: square 380 → 55 Hz over 0.18 s, 0.22, with a 0.13 s hiss at 0.09 (main.js:4476-4481, audio.js:243-249)',
    S.deathSound.wave === 'square' && S.deathSound.f0 === 380 && S.deathSound.f1 === 55 && S.deathSound.dur === 0.18 && S.deathSound.vol === 0.22
    && S.deathSound.noiseVol === 0.09 && S.deathSound.noiseDur === 0.13);
  check('the spire: ConeGeometry(0.75 r, 2.6 r, 6) in the omega satin — roughness 0.04, transmission 0.40, wobble 0.35 (enemy.js:323, 786; tuning.js:32)',
    L.coneRadius === 0.75 && L.coneHeight === 2.6 && L.coneSegments === 6 && L.roughness === 0.04 && L.transmission === 0.40 && L.wobble === 0.35 && L.sqFloor === 0.1);
  check('the ring: RingGeometry(7.5 − 0.14, 7.5, 64) at y 0.05, 0x66ffcc, built at 0.18, then 0.16 + 0.10·sin(4t) (enemy.js:1139-1145, 1788)',
    R.width === 0.14 && R.segments === 64 && R.color === 0x66ffcc && R.opacity0 === 0.18 && R.y === 0.05 && R.base === 0.16 && R.amp === 0.10 && R.hz === 4.0);
  const src = readFileSync(new URL('../../js/sim/species/shepherd.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits, no contact and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
  check('the registry holds this behaviour', BEHAVIOUR.shepherd === behaviour);
}

// ── the pocket (1.x enemy.js:1774-1784) ──────────────────────────────
{
  const one = (x, z, o = {}) => { const w = world(); const g = put(w, x, z, { o }); step(w, IDLE); return g; };
  let g = one(15, 0);
  check('too far (d > 10): it closes in straight at you at 1.6 u/s', near(g.x, 15 - 1.6 * dt, 1e-12) && g.z === 0 && g.s.mode === 'close', `${g.x}`);
  g = one(15, 0, { speedMult: 1.5 });
  check('… at its speed × the wave\'s speedMult (× 1.5: 2.4 u/s)', near(g.x, 15 - 2.4 * dt, 1e-12));
  g = one(15, 0, { affix: 'swift' });
  check('… × SWIFT\'s 1.35', near(g.x, 15 - 1.6 * T.variants.swiftSpeed * dt, 1e-12));
  { const w = world(); g = put(w, 15, 0); g.surgeT = 3; g.surgeMult = 1.6; step(w, IDLE);
    check('… × a SIREN\'s surge while it lasts (1.x enemy.js:1699-1700)', near(g.x, 15 - 1.6 * 1.6 * dt, 1e-12)); }
  g = one(5, 0);
  check('too close (d < 8): it backs straight off at 1.6 × 1.15 = 1.84 u/s — "it\'s not a body"', near(g.x, 5 + 1.84 * dt, 1e-12) && g.z === 0 && g.s.mode === 'back', `${g.x}`);
  g = one(9, 0);
  check('in the pocket: it circles at 1.6 × 0.8 = 1.28 u/s along (−dz, dx)/d — from (9, 0), straight up −z', g.x === 9 && near(g.z, -1.28 * dt, 1e-12) && g.s.mode === 'circle', `${g.x}, ${g.z}`);
  g = one(0, 9);
  check('… from (0, 9), along +x', near(g.x, 1.28 * dt, 1e-12) && g.z === 9);
  g = one(-6, -6);
  const u = [6 / Math.hypot(6, 6), 6 / Math.hypot(6, 6)];
  check('… from (−6, −6) along (−u_z, u_x): (−0.905, 0.905) × dt', near(g.x, -6 - u[1] * 1.28 * dt, 1e-12) && near(g.z, -6 + u[0] * 1.28 * dt, 1e-12));
  check('the band is strict: d = 10 circles, d = 10 + ε closes; d = 8 circles, d = 8 − ε backs off (enemy.js:1775, 1778)',
    one(10, 0).s.mode === 'circle' && one(10 + 1e-9, 0).s.mode === 'close' && one(8, 0).s.mode === 'circle' && one(8 - 1e-9, 0).s.mode === 'back');
  g = one(0, 0);
  check('standing on you, the distance floors at 0.001 and it stays put (1.x enemy.js:1682)', g.x === 0 && g.z === 0 && g.s.mode === 'back');
  check('it faces you', near(one(15, 0).faceX, -1) && one(15, 0).faceZ === 0);
}
{
  // twenty seconds from far off, you standing still: in, then round and round
  const w = world(), g = put(w, 15, 0);
  let entered = -1, rMin = Infinity, rMax = 0, monotone = true, prevA = Math.atan2(g.z, g.x), turned = 0, circling = 0, n = 0;
  for (let i = 0; i < 1200; i++) {
    step(w, IDLE);
    const r = Math.hypot(g.x, g.z), a = Math.atan2(g.z, g.x);
    if (entered < 0 && r <= 10) entered = i;
    if (entered >= 0) {
      rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); n++;
      if (g.s.mode === 'circle') { circling++; const d = Math.atan2(Math.sin(a - prevA), Math.cos(a - prevA)); if (d >= 0) monotone = false; turned += d; }
    }
    prevA = a;
  }
  check('from 15 it walks in to the pocket\'s edge in (15 − 10) / 1.6 s', entered === Math.ceil((5 / 1.6) / dt) - 1 || entered === Math.ceil((5 / 1.6) / dt), `${entered}`);
  check('… and from then on keeps between 8 and 10 (+ one step) of you', rMin >= 8 && rMax <= 10 + 1.6 * dt, `${rMin} ${rMax}`);
  check('… circling (almost every step), always the same way round: its bearing only ever falls', monotone && circling / n > 0.9, `${circling}/${n}`);
  check('… at 1.28 u/s round a 10 u pocket: about 0.128 rad a second', near(-turned / (circling * dt), 0.128, 0.002), `${-turned / (circling * dt)}`);
}

// ── against 1.x frame by frame: the pocket, the spin and the spring ──
{
  // 1.x's SHEPHERD (enemy.js:1680-1700, 1774-1785, 2728-2731) in its literals,
  // the hero walking a path; the core's wall clamp at the body's radius (1.x
  // had none on this walk: see the port's report)
  const path = [[1, 0, 70], [0, 1, 50], [-1, 0, 150], [0, -1, 110], [0.6, 0.8, 90], [0, 0, 130]];
  const kicks = new Set([60, 61, 200, 410]);
  for (const mult of [1, 1.3]) {
    const w = world({ hero: [0, 0] }), g = put(w, -12, 4, { o: { speedMult: mult } });
    const o = { x: -12, z: 4, spin: 0, sq: 1, sqV: 0 };
    let ok = true, bad = '', i = 0, wall = 0, modes = new Set();
    for (const [mx, mz, steps] of path) {
      for (let k = 0; k < steps; k++, i++) {
        step(w, { ...IDLE, mx, mz });
        const h = w.hero;
        const ddx = h.x - o.x, ddz = h.z - o.z, dist = Math.hypot(ddx, ddz) || 0.001;
        const spd = 1.6 * mult;
        if (dist > 9 + 1) { o.x += (ddx / dist) * spd * dt; o.z += (ddz / dist) * spd * dt; }
        else if (dist < 9 - 1) { o.x -= (ddx / dist) * spd * 1.15 * dt; o.z -= (ddz / dist) * spd * 1.15 * dt; }
        else { o.x += (-ddz / dist) * spd * 0.8 * dt; o.z += (ddx / dist) * spd * 0.8 * dt; }
        const bx = w.hx - 0.6, bz = w.hz - 0.6;
        if (Math.abs(o.x) > bx || Math.abs(o.z) > bz) wall++;
        o.x = clamp(o.x, -bx, bx); o.z = clamp(o.z, -bz, bz);
        o.spin += 2.2 * dt;
        o.sqV = (o.sqV - (o.sq - 1.0) * 0.18) * 0.90;
        o.sq = Math.max(0.55, Math.min(1.55, o.sq + o.sqV));
        modes.add(g.s.mode);
        if (!(near(g.x, o.x, 1e-9) && near(g.z, o.z, 1e-9) && near(g.s.spin, o.spin, 1e-9) && near(g.sq, o.sq, 1e-12) && near(g.sqV, o.sqV, 1e-12))) {
          if (ok) bad = `step ${i}: (${g.x}, ${g.z}) sq ${g.sq} vs (${o.x}, ${o.z}) sq ${o.sq}`;
          ok = false;
        }
        // a hit after the step: 1.x's hit() kicks _sqV −= 0.75 (enemy.js:1607), as the core's bullet test does
        if (kicks.has(i)) { o.sqV += -0.75; g.sqV += T.gel.sq.hit; }
      }
    }
    check(`× ${mult}: ${i} steps of 1.x's pocket, spin and non-blob spring, step for step, the hero walking (all three arms: ${[...modes].join(', ')})`,
      ok && modes.size === 3, bad);
    check(`× ${mult}: … and the walk never met a wall the oracle had to clamp`, wall === 0, `${wall}`);
  }
  // the spring is 1.x's non-blob one, not the core's blob one
  const w = world(), g = put(w, 9, 0, { still: true });
  step(w, IDLE); g.sqV += T.gel.sq.hit; run(w, 12);
  let bq = 1, bv = T.gel.sq.hit; const [kb, cb] = T.gel.sq.blob;
  for (let j = 0; j < 12; j++) { bv = (bv - (bq - 1) * kb) * cb; bq = clamp(bq + bv, 0.55, 1.55); }
  let nq = 1, nv = T.gel.sq.hit;
  for (let j = 0; j < 12; j++) { nv = (nv - (nq - 1) * 0.18) * 0.90; nq = clamp(nq + nv, 0.55, 1.55); }
  check('a hit squashes it on 1.x\'s non-blob spring (0.18 / 0.90), not the gel dome\'s (0.24 / 0.86)', near(g.sq, nq, 1e-12) && !near(g.sq, bq, 1e-6), `${g.sq} ${nq} ${bq}`);
}

{
  // A body is live from the step it arrives in, so the hero — who moves after
  // the director's spawn and before the bodies — can kick it before its own
  // first step: a dash through it in the very step the director lands it.
  // 1.x's spring starts from rest (enemy.js:669-670) and runs on the kicked
  // velocity (enemy.js:2730-2731): sqV = (kick − (1 − 1)·0.18)·0.90.
  const firstStep = (dashMode, kick) => {
    const w = world({ hero: [0, 0], dashMode });
    let g = null;
    w.director = { step(w, dt, api) { if (w.tick === 1) g = api.spawn(w, 'shepherd', 1, 0); } };
    step(w, { ...IDLE, mx: 1, dash: true });
    const kicked = evs(w, dashMode === 'cut' ? 'dashCut' : 'shove').length === 1;
    let qV = (kick - (1 - 1) * 0.18) * 0.90, q = clamp(1 + qV, 0.55, 1.55);
    const one = near(g.sqV, qV, 1e-12) && near(g.sq, q, 1e-12), at1 = `${g.sqV} ${g.sq} vs ${qV} ${q}`;
    let rest = true;
    for (let j = 0; j < 20; j++) {
      step(w, IDLE);
      qV = (qV - (q - 1) * 0.18) * 0.90; q = clamp(q + qV, 0.55, 1.55);
      if (!(near(g.sqV, qV, 1e-12) && near(g.sq, q, 1e-12))) rest = false;
    }
    return { kicked, one, rest, at1 };
  };
  const cut = firstStep('cut', -0.75);
  check('a CUT dash through it in the step it lands: 1.x\'s hit kick −0.75 (enemy.js:1607) on 1.x\'s non-blob spring from rest, that step and the next twenty (enemy.js:669-670, 2730-2731)',
    cut.kicked && cut.one && cut.rest, cut.at1);
  const push = firstStep('push', T.hero.push.squash);
  check('… and a PUSH dash\'s shove the same (its kick is 2.0\'s, the spring 1.x\'s)', push.kicked && push.one && push.rest, push.at1);
}

// ── the herd it lays on the others (main.js:10233-10260, by the core) ──
{
  const herdStep = ({ sx = 2, sz = 0, bx, bz, hero = [-10, 0], second = null, kill = false, boss = false } = {}) => {
    const w = world({ hero });
    const s = put(w, sx, sz, { still: true });
    if (second) put(w, second[0], second[1], { still: true });
    const b = boss ? api.spawn(w, 'pyra', bx, bz, { isBoss: true }) : stand(w, bx, bz);
    if (kill) api.kill(w, s, 'env');
    const x0 = b.x, z0 = b.z;
    step(w, IDLE);
    return { dx: b.x - x0, dz: b.z - z0, b, w };
  };
  let r = herdStep({ bx: 6, bz: 0 });
  check('a body 4 off the SHEPHERD and 16 off you is dragged 2.8 u/s straight at you', near(r.dx, -2.8 * dt, 1e-12) && r.dz === 0, `${r.dx}`);
  r = herdStep({ bx: 6, bz: 3 });
  const ux = (-10 - 6) / Math.hypot(16, 3), uz = -3 / Math.hypot(16, 3);
  check('… along the line to you, wherever it stands in the ring', near(r.dx, ux * 2.8 * dt, 1e-12) && near(r.dz, uz * 2.8 * dt, 1e-12));
  r = herdStep({ bx: 9.5, bz: 0 });
  check('the ring is inclusive: a body exactly 7.5 off is herded (d² ≤ 7.5²)', near(r.dx, -2.8 * dt, 1e-12));
  r = herdStep({ bx: 9.6, bz: 0 });
  check('… one 7.6 off is not', r.dx === 0 && r.dz === 0);
  r = herdStep({ sx: -5, bx: -9, bz: 0 });
  check('a body within 1.2 of you is left where it is', r.dx === 0 && r.dz === 0);
  // the stop is strict and sits at 1.2: pd > 1.2 is dragged (main.js:10249)
  const dragged = (pd) => herdStep({ sx: -5, bx: -10 + pd, bz: 0 }).dx;
  check('… the stop is at 1.2: 1.25 off you is still dragged at 2.8 u/s, 1.15 off is not (main.js:10249)',
    near(dragged(1.25), -2.8 * dt, 1e-12) && dragged(1.15) === 0, `${dragged(1.25)} ${dragged(1.15)}`);
  r = herdStep({ bx: 6, bz: 0, boss: true });
  check('a boss inside the ring is never herded (main.js:10241: a boss skips the swarm forces)', r.dx === 0 && r.dz === 0);
  r = herdStep({ bx: 6, bz: 0, second: [6, 4] });
  check('two SHEPHERDs covering one body drag it no faster: one pull, they don\'t stack', near(r.dx, -2.8 * dt, 1e-12), `${r.dx}`);
  r = herdStep({ bx: 6, bz: 0, kill: true });
  check('a dead SHEPHERD herds nothing: the knot loosens', r.dx === 0 && r.dz === 0);
  {
    // a SHEPHERD is never herded, not even by another: one beside another moves exactly as one alone
    const pair = (withOther) => {
      const w = world({ hero: [-10, 0] });
      const a = put(w, 0, 5, { anchored: false, still: true });
      if (withOther) put(w, 3, 5, { still: true });
      run(w, 30);
      return [a.x, a.z];
    };
    const [p, q] = [pair(true), pair(false)];
    check('a SHEPHERD is never herded, not even by another (main.js:10243)', p[0] === q[0] && p[1] === q[1], `${p} vs ${q}`);
  }
  {
    // 1.x had no arrival gate on the herd: every frame main.js collects every
    // ALIVE SHEPHERD (main.js:10236) — alive from its constructor (enemy.js:662)
    // — and drags the others before any body's own update (main.js:10369). So
    // one in the arena before a frame herds IN that frame: the body moves on
    // step 1, the full 2.8·dt, while 2.0's view is still swelling it in (that
    // swell is the view's alone)
    const w = world({ hero: [-10, 0] });
    const s = put(w, 2, 0, { still: true });
    const b = stand(w, 6, 0);
    let n = 0;
    for (; n < 60 && b.x === 6; n++) step(w, IDLE);
    check('a SHEPHERD herds from its first step, as 1.x\'s did from its first frame (main.js:10236, 10369; enemy.js:662): the body moves on step 1',
      n === 1 && near(b.x, 6 - 2.8 * dt, 1e-12) && s.state === 'active', `${n} ${b.x}`);
    check('… while its view is still swelling in (2.0\'s swell is render-only, TUNING.gel.swell)', s.t < T.gel.swell, `${s.t}`);
  }
  {
    // the same from the director: a SHEPHERD spawned in a step herds in that
    // step (the director runs before the swarm forces)
    const w = world({ hero: [-10, 0] });
    let s = null;
    w.director = { step(w, dt, api) { if (w.tick === 1) { s = api.spawn(w, 'shepherd', 2, 0, { speedMult: 0 }); s.anchored = true; } } };
    const b = stand(w, 6, 0);
    step(w, IDLE);
    check('… and one the director spawns in a step herds in that same step', s && near(b.x, 6 - 2.8 * dt, 1e-12), `${b.x}`);
  }
}

// ── it never attacks, and touching it does not hurt ──────────────────
{
  const w = world({ hero: [0, 0] });
  const g = put(w, -12, 4, { anchored: false });
  let shots = 0;
  for (let i = 0; i < 600; i++) { step(w, { ...IDLE, mx: Math.sin(i / 40), mz: Math.cos(i / 55) * 0.6 }); shots += evs(w, 'gelShot').length; }
  check('ten seconds near you: not one bullet, not one shot', shots === 0 && w.bullets.every((b) => b.hero) && w.gelBullets === 0);
  const w2 = world({ hero: [0, 0] });
  put(w2, 0.3, 0, { still: true });
  let hurt = 0;
  for (let i = 0; i < 60; i++) { step(w2, IDLE); hurt += evs(w2, 'hurt').length; }
  check('standing on it for a second costs nothing ("Never touches you", not in MELEE_TYPES)', hurt === 0 && w2.hero.lives === 1e9);
}

// ── hits and death: ordinary ─────────────────────────────────────────
{
  const w = world({ hero: [0, 0] });
  const g = put(w, 9, 0, { still: true });
  let kills = [];
  for (let k = 0; k < 3; k++) { api.heroBullet(w, g.x - 0.5, g.z, 0); step(w, IDLE); kills.push(...evs(w, 'kill')); }
  check('three shots kill it (hp 3, the 0.6 circle)', !g.alive && kills.length === 1 && kills[0].kind === 'shepherd' && near(kills[0].r, 0.6));
  const we = world(); const ge = put(we, 9, 0, { o: { variant: 'elite' } });
  check('an elite is 0.72 across and takes 6 (the core\'s ×1.2, ×2; 1.x main.js:9403-9406)', near(ge.r, 0.72) && ge.hp === 6);
  const hc = world({ mode: 'hardcade' }); hc.wave = 6;
  const gh = put(hc, 9, 0, { still: true });
  api.kill(hc, gh, 'hero');
  check('in HARDCADE its corpse does not bite: not a biter (1.x tuning.js:496-497)', hc.bullets.length === 0 && evs(hc, 'revenge').length === 0);
}

// ── the dashes: a PUSH carries it off, a CUT hurts it ────────────────
{
  const DASH = { ...IDLE, mx: 1, dash: true };
  // the same walking SHEPHERD (backing off you, 2 away), with and without a PUSH dash into it
  const shoved = (dash) => {
    const w = world({ hero: [0, 0], dashMode: 'push' });
    const g = put(w, 2, 0, { anchored: false });
    let shove = 0;
    for (let i = 0; i < 41; i++) { step(w, dash && i === 0 ? DASH : IDLE); shove += evs(w, 'shove').length; }
    return { g, shove };
  };
  const push = shoved(true), none = shoved(false);
  check('a PUSH dash shoves it, and its step carries the knock on top of its own walk (it moves by velocity, never by writing x/z)',
    push.shove === 1 && none.shove === 0 && push.g.x - none.g.x > 1.5, `${push.g.x} vs ${none.g.x}`);
  const cut = (() => { const w = world({ hero: [0, 0], dashMode: 'cut' }); const g = put(w, 2, 0, { still: true }); let c = 0; for (let i = 0; i < 20; i++) { step(w, i === 0 ? DASH : IDLE); c += evs(w, 'dashCut').length; } return { g, c }; })();
  check(`a CUT dash through it takes ${T.hero.cut.hits} of its 3 hp, once`, cut.g.alive && cut.g.hp === 3 - T.hero.cut.hits && cut.c === 1, `${cut.g.hp}`);
  const pass = (() => { const w = world({ hero: [0, 0] }); const g = put(w, 2, 0, { still: true }); for (let i = 0; i < 20; i++) step(w, i === 0 ? DASH : IDLE); return { w, g }; })();
  check('1.x\'s PASS dash goes through it untouched', pass.g.hp === 3 && pass.w.hero.lives === 1e9);
}

// ── determinism ──────────────────────────────────────────────────────
{
  const go = () => {
    const w = world({ seed: 7, hero: [0, 0] });
    put(w, -12, 4, { anchored: false }); put(w, 12, -3, { anchored: false });
    stand(w, -6, 2); stand(w, 7, 1);
    for (let i = 0; i < 500; i++) step(w, { ...IDLE, mx: Math.sin(i / 30), mz: Math.cos(i / 45) * 0.5 });
    return w.gels.map((g) => `${g.x},${g.z},${g.sq}`).join(';');
  };
  check('a run replays from its seed', go() === go());
}

// ── the look: the spire, the spin, the squash, the ring, the death ────
{
  let matArgs = null;
  const scene = new THREE.Scene();
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene, geo: {}, kind: 'shepherd',
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'shepherd', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0.4, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel of 1.x\'s omega family (uRadius 0.6, wobble 0.35, roughness 0.04, transmission 0.40)',
    v.own === true && matArgs[0] === 0x66ffcc && matArgs[1] === 'omega' && matArgs[2] === 0.6 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.04) && near(v.mat.transmission, 0.40) && v.mesh.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);
  const P = v.mesh.geometry.parameters, pos = v.mesh.geometry.getAttribute('position');
  let yMin = Infinity, yMax = -Infinity, rOut = 0;
  for (let i = 0; i < pos.count; i++) { yMin = Math.min(yMin, pos.getY(i)); yMax = Math.max(yMax, pos.getY(i)); rOut = Math.max(rOut, Math.hypot(pos.getX(i), pos.getZ(i))); }
  check('the spire is ConeGeometry(0.45, 1.56, 6): centred, 0.78 down to 0.78 up, 0.45 across at the base (1.x enemy.js:786)',
    v.mesh.geometry.type === 'ConeGeometry' && near(P.radius, 0.45) && near(P.height, 1.56) && P.radialSegments === 6 && P.heightSegments === 1 && !P.openEnded
    && near(yMin, -0.78, 1e-6) && near(yMax, 0.78, 1e-6) && near(rOut, 0.45, 1e-6));
  const RP = v.ring.geometry.parameters;
  check('the ring is RingGeometry(7.36, 7.5, 64), flat at y 0.05, drawn, not added (v104: no glow), no depth write, double-sided, 0x66ffcc at 0.18 as built (enemy.js:1137-1145)',
    v.ring.geometry.type === 'RingGeometry' && near(RP.innerRadius, 7.36) && near(RP.outerRadius, 7.5) && RP.thetaSegments === 64
    && near(v.ring.rotation.x, -Math.PI / 2) && v.ring.position.y === 0.05 && v.ringMat.transparent && v.ringMat.blending === THREE.NormalBlending
    && v.ringMat.depthWrite === false && v.ringMat.side === THREE.DoubleSide && v.ringMat.color.getHex() === 0x66ffcc && v.ringMat.opacity === 0.18);
  check('… its outer edge IS the herd\'s radius (the rule and the tell cannot drift, enemy.js:569-571)', near(RP.outerRadius, S.herd.radius));

  // 1.x's mesh matrix: T(x, 0.6, z) · R(0, spin, 0) · S(sx·rm, sq·rm, sx·rm) (enemy.js:1000, 1785, 2779)
  const want = (x, y, z, ry, sx, sy) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sx));
  const same = (m, e, eps = 1e-9) => m.elements.every((a, i) => near(a, e.elements[i], eps));
  // what the view does round update(): the root at the body, the squash group (1/√sq, sq, 1/√sq) about the floor
  const sync = (g, w, time, grow = 1) => {
    v.root.position.set(g.x, 0, g.z);
    v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
    look.update(v, g, w, time, grow);
    v.root.updateMatrixWorld(true);
  };
  const w = world(), g = put(w, 9, 0, { still: true });
  sync(g, w, 0);
  check('the spire\'s centre stands at 0.6, the CFG radius, unturned at scale 1 (1.x enemy.js:1000)', same(v.mesh.matrixWorld, want(9, 0.6, 0, 0, 1, 1)));
  check('the ring hangs off the root, flat on the floor round it, unsquashed and unscaled', v.fx.parent === v.root
    && (() => { const p = new THREE.Vector3().setFromMatrixPosition(v.ring.matrixWorld), s = new THREE.Vector3().setFromMatrixScale(v.ring.matrixWorld); return near(p.x, 9) && near(p.y, 0.05) && near(p.z, 0) && near(s.x, 1) && near(s.y, 1) && near(s.z, 1); })());
  check('while the herd is on the ring breathes 0.16 + 0.10·sin(4t + phase) (enemy.js:1788)', near(v.ringMat.opacity, 0.16 + 0.10 * Math.sin(0.4)));
  sync(g, w, 0.7);
  check('… on the body\'s own clock', near(v.ringMat.opacity, 0.16 + 0.10 * Math.sin(2.8 + 0.4)));
  g.s.spin = 1.3;
  sync(g, w, 0);
  check('the spire turns by the sim\'s baton angle (2.2 rad/s, enemy.js:1785)', near(v.mesh.rotation.y, 1.3) && same(v.mesh.matrixWorld, want(9, 0.6, 0, 1.3, 1, 1)));
  g.sq = 0.7;
  sync(g, w, 0);
  check('1.x\'s squash is the mesh\'s own scale (1/√sq, sq, 1/√sq) about its centre, still at 0.6 (enemy.js:2732, 2779)',
    same(v.mesh.matrixWorld, want(9, 0.6, 0, 1.3, 1 / Math.sqrt(0.7), 0.7)));
  check('… and the ring does not squash with it', (() => { const s = new THREE.Vector3().setFromMatrixScale(v.ring.matrixWorld); return near(s.x, 1) && near(s.y, 1) && near(s.z, 1); })());
  g.sq = 2e-3;
  sync(g, w, 0);
  check('… the across-scale floored at 1/√0.1 (enemy.js:2732)', near(v.mesh.scale.x, 1 / Math.sqrt(0.1)) && near(v.mesh.scale.y, 2e-3));
  g.sq = 1;
  const we = world(), ge = put(we, 9, 0, { o: { variant: 'elite' } });
  ge.s.spin = 1.3;
  sync(ge, we, 0);
  check('an elite is the same spire × 1.2 about a centre still at 0.6 (main.js:9406, enemy.js:1000, 2779)', same(v.mesh.matrixWorld, want(9, 0.6, 0, 1.3, 1.2, 1.2)));
  check('… inside the same 7.5 ring (the herd does not grow with it)', (() => { const s = new THREE.Vector3().setFromMatrixScale(v.ring.matrixWorld); return near(s.x, 1); })());
  sync(g, w, 0, 0.5);
  check('while it swells into being it grows from the floor', near(v.mesh.position.y, 0.3) && near(v.mesh.scale.x, 0.5));
  const wa = world(), ga = put(wa, 9, 0);
  sync(ga, wa, 0.2, 0.5);
  check('… but its ring is lit through the swell, full-size: the herd is on from its first step (1.x built it at 0.18 and pulsed it from its first update, enemy.js:1141, 1788)',
    near(v.ringMat.opacity, 0.16 + 0.10 * Math.sin(0.8 + 0.4)) && v.ring.parent === v.fx && v.fx.parent === v.root
    && (() => { const s = new THREE.Vector3().setFromMatrixScale(v.ring.matrixWorld); return near(s.x, 1) && near(s.y, 1) && near(s.z, 1); })());
  v.mat.emissive.setScalar(1); g.flash = 0.1;
  sync(g, w, 0);
  check('the look leaves the emissive to the core (the hit flash, a VOLATILE fuse, the death glow)', near(v.mat.emissive.r, 1));
  v.mat.emissive.setScalar(0); g.flash = 0;

  // the death: the core resets the squash group and swells the root by k about the floor;
  // 1.x swelled the spire about its centre, the squash reset and the spin stopped, the ring out
  g.sq = 0.8; g.s.spin = 2.0;
  sync(ge, we, 0); ge.sq = 0.8; ge.s.spin = 2.0; sync(ge, we, 0);
  for (const dyingT of [0.27, 0.14, 0.01]) {
    const k = 1 + (1 - dyingT / T.blob.death) * T.blob.deathSwell;
    v.dyingT = dyingT; v.squash.scale.setScalar(1); v.root.scale.setScalar(k);       // what the core does (actors.js stepFx)
    v.root.updateMatrixWorld(true);
    check(`dying (${dyingT} s left): an elite's uniform 1.2 × ${k.toFixed(3)} about a centre still at 0.6, the spin where it stopped, the ring out (enemy.js:2976-2981, 3009)`,
      same(v.mesh.matrixWorld, want(9, 0.6, 0, 2.0, 1.2 * k, 1.2 * k)) && !v.fx.visible);
  }
  v.dyingT = 0; v.root.scale.setScalar(1); g.sq = 1; ge.sq = 1;
  look.reset(v);
  check('reset: a pooled view comes back with the ring as built and an unturned spire', v.ringMat.opacity === 0.18 && v.mesh.rotation.y === 0 && v.body.scale.x === 1);
  g.s.spin = 0;
  sync(g, w, 0);
  check('… and wears the ring and the spire again on its next update', v.fx.visible && same(v.mesh.matrixWorld, want(9, 0.6, 0, 0, 1, 1)));
}

if (failed) { console.log(`✗ shepherd: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ shepherd: ${passed} checks`);
