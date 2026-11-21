#!/usr/bin/env node
// siren.mjs — SIREN's own checks, in bare node: 1.x's numbers (enemy.js:597,
// 668, 671, 1165-1169, 1698-1700, 1819-1842, 2694-2697, 2731-2769, 2968-3000;
// main.js: 2410-2420, 2518-2541, 9436, 10367-10397, 10586-10620; tuning.js:39,
// 307, 496-497), asserted
// against the sim stepping on its fixed 1/60 s, and the look against real three.
// Also how it meets 2.0's core: the arena's walls, a knock, the PUSH and CUT
// test dashes, and the death pop an own look must hand back (enemy.js:2981, 3026).
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import behaviour from '../../js/sim/species/siren.js?v=159';
import look from '../../js/render/looks/siren.js?v=159';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.siren, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a world with nothing in it but one SIREN, the hero at the origin;
// anchored (no swarm forces, no crowd) unless asked, so what moves it is its
// own step. Every body is spawned outright and is live from its first step,
// as 1.x's were (no appear: the pump pushed it at main.js:9436, before the
// update loop at 10367-10369)
function world({ seed = 1, mode = 'arcade', x = 9, z = 0, o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  const g = api.spawn(w, 'siren', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
function add(w, kind, x, z, o = {}) {
  const b = api.spawn(w, kind, x, z, o);
  b.anchored = true;
  return b;
}
// 1.x's own frame arithmetic: how many steps of `dt` until a timer at `from` runs out
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };
const screams = (w) => w.events.filter((e) => e.type === 'scream');
// step until it screams; the step number, or −1
function untilScream(w, max = 60 * 20) {
  for (let i = 1; i <= max; i++) { step(w, IDLE); if (screams(w).length) return i; }
  return -1;
}
const QUIET = 1e9;                                   // a scream timer that never runs out

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.75, hp 3, speed 1.2, lilac 0xbb66ff (1.x enemy.js:597)', S.radius === 0.75 && S.hp === 3 && S.speed === 1.2 && S.color === 0xbb66ff);
  check('CFG: no gun', S.bulletColor === null && S.fireInterval === null);
  check('a blob dome, SUPPORT, harmless to touch in classic (not in MELEE_TYPES), not a biter',
    S.family === 'blob' && S.role === 'SUPPORT' && S.contact === false && S.revenge === null);
  check('it keeps 9 from you: closes past 10, backs off inside 8 at 1.3× (1.x enemy.js:1821-1823)', S.keep === 9 && S.keepBand === 1 && S.retreat === 1.3);
  check('first inhale after 2.5 + U·1.5 s, then every 3.5 + U·1.5 s; the inhale is 0.8 s (1.x enemy.js:1166, 1832, 1838)',
    S.screamFirst[0] === 2.5 && S.screamFirst[1] === 4.0 && S.screamEvery[0] === 3.5 && S.screamEvery[1] === 5.0 && S.inhale === 0.8);
  check('the scream: reach 7, a 3 s surge at 1.6× (1.x main.js:2541, 10392; enemy.js:1700)', S.reach === 7 && S.surgeTime === 3 && S.surgeMult === 1.6);
  check('its silhouette is the default dome {1.05, 0.82, 1.05} (1.x tuning.js:39)', T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.siren);
  check('its look smooths its own velocity 0.3 a step (1.x enemy.js:2696-2697)', S.velSmooth === 0.3);
  const L = S.look, R = L.ring;
  check('the inhale v141 wrote: a 45% swell, strobing 0x6633aa / 0x220044 on sin(20·clock) (1.x enemy.js:1828-1829)',
    L.swell === 0.45 && L.strobeHz === 20 && L.strobe[0] === 0x6633aa && L.strobe[1] === 0x220044);
  check('the ring: RingGeometry(0.82, 1.0, 40) at y 0.05, violet, 0.7 fading over 0.55 s (1.x main.js:2520-2537)',
    R.inner === 0.82 && R.outer === 1.0 && R.segments === 40 && R.y === 0.05 && R.color === 0xbb66ff && R.opacity === 0.7 && R.life === 0.55);
  check('the wail, for the sound: sawtooth 700 → 1500 and square 705 → 1520 Hz, 0.45 s, plus a 0.3 s hiss (1.x audio.js:259-263)',
    S.sound.scream[0].from === 700 && S.sound.scream[0].to === 1500 && S.sound.scream[1].from === 705 && S.sound.scream[1].to === 1520 && S.sound.noise.dur === 0.3);
  const src = readFileSync(new URL('../../js/sim/species/siren.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:668, 671, 1165-1169) ────────────
{
  const ts = [], cs = [], ps = [];
  let fresh = true;
  for (let seed = 1; seed <= 200; seed++) {
    const { g } = world({ seed });
    ts.push(g.s.screamT); cs.push(g.s.clock); ps.push(g.s.phase);
    fresh &&= g.s.inhaleT === 0 && g.s.screams === 0 && g.s.velX === 0 && g.s.velZ === 0 && g.tell === 0;
  }
  check('it starts cruising, no scream yet', fresh);
  check('the first scream timer is in [2.5, 4.0) and spread over it', ts.every((t) => t >= 2.5 && t < 4.0) && Math.min(...ts) < 2.6 && Math.max(...ts) > 3.9);
  check('its clock and phase start anywhere in [0, 2π)', [cs, ps].every((a) => a.every((v) => v >= 0 && v < Math.PI * 2) && Math.min(...a) < 0.3 && Math.max(...a) > 6));
}

// ── the hold: closes past 10, backs off inside 8, stands between ─────
{
  // far: it closes at spd, straight at you
  let { w, g } = world({ x: 15, z: 8 });
  g.s.screamT = QUIET;
  let exact = true, along = true, ticks = true;
  for (let i = 0; i < 60; i++) {
    const x0 = g.x, z0 = g.z, c0 = g.s.clock;
    step(w, IDLE);
    exact &&= near(Math.hypot(g.x - x0, g.z - z0), S.speed * dt, 1e-12);
    along &&= angDiff(Math.atan2(g.z - z0, g.x - x0), Math.atan2(-z0, -x0)) < 1e-9;
    ticks &&= near(g.s.clock, c0 + dt, 1e-12);
  }
  check('past 10 it closes at its speed (1.2 u/s), straight at you (1.x enemy.js:1822)', exact && along);
  check('its own clock advances dt a step (1.x enemy.js:2724-2725 `_wobbleT += dt`)', ticks);
  // near: it backs straight away at 1.3 × spd
  ({ w, g } = world({ x: 4, z: -3 }));
  g.s.screamT = QUIET;
  exact = true; along = true;
  for (let i = 0; i < 60; i++) {
    const x0 = g.x, z0 = g.z;
    step(w, IDLE);
    exact &&= near(Math.hypot(g.x - x0, g.z - z0), S.speed * S.retreat * dt, 1e-12);
    along &&= angDiff(Math.atan2(g.z - z0, g.x - x0), Math.atan2(z0, x0)) < 1e-9;
  }
  check('inside 8 it backs straight away at 1.3 × its speed (1.56 u/s) (1.x enemy.js:1823)', exact && along);
  // between: it stands, the band's edges included
  for (const d of [8, 8.5, 9, 9.99, 10]) {
    const r = world({ x: d, z: 0 });
    r.g.s.screamT = QUIET;
    for (let i = 0; i < 30; i++) step(r.w, IDLE);
    check(`at ${d} it holds its ground`, r.g.x === d && r.g.z === 0, `${r.g.x}`);
  }
  // it settles at the edge of the band from either side
  ({ w, g } = world({ x: -17, z: 9 }));
  g.s.screamT = QUIET;
  for (let i = 0; i < 60 * 12; i++) step(w, IDLE);
  const din = Math.hypot(g.x, g.z);
  check('walking in from far it parks just inside 10', din <= 10 && din > 10 - S.speed * dt * 1.01, `${din}`);
  ({ w, g } = world({ x: 2, z: 1 }));
  g.s.screamT = QUIET;
  for (let i = 0; i < 60 * 6; i++) step(w, IDLE);
  const dout = Math.hypot(g.x, g.z);
  check('pressed, it backs out to just past 8', dout >= 8 && dout < 8 + S.speed * S.retreat * dt * 1.01, `${dout}`);
  // it faces you
  check('it looks at you', near(g.faceX, -g.x / dout, 1e-6) && near(g.faceZ, -g.z / dout, 1e-6));
  // the wave's escalation and SWIFT reach it (1.x enemy.js:1699)
  for (const [o, mult, name] of [[{ speedMult: 1.73 }, 1.73, 'wave 8\'s speedMult (1.73)'], [{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)']]) {
    for (const [x, k] of [[15, 1], [4, S.retreat]]) {
      const r = world({ x, z: 0, o });
      r.g.s.screamT = QUIET;
      const x0 = r.g.x;
      step(r.w, IDLE);
      check(`${name} scales its ${k === 1 ? 'approach' : 'retreat'}`, near(Math.abs(r.g.x - x0), S.speed * mult * k * dt, 1e-12));
    }
  }
  // the swarm still carries it; its own velocity, what the look reads, is only its own walk
  const r = world({ seed: 3, x: 9, z: 0, anchored: false });
  r.g.s.screamT = QUIET;
  let own = true, ownX = 0, ownZ = 0;
  for (let i = 0; i < 120; i++) {
    const vx0 = r.g.s.velX, vz0 = r.g.s.velZ;
    step(r.w, IDLE);
    own &&= near(r.g.s.velX, vx0 + (r.g.vx - vx0) * S.velSmooth, 1e-12) && near(r.g.s.velZ, vz0 + (r.g.vz - vz0) * S.velSmooth, 1e-12);
    ownX += r.g.vx * dt; ownZ += r.g.vz * dt;
  }
  check('a SUPPORT body is carried by the swarm forces beyond its own walk', Math.hypot(r.g.x - 9 - ownX, r.g.z - ownZ) > 0.1, `${r.g.x} ${r.g.z} own ${ownX} ${ownZ}`);
  check('… while its look\'s velocity is its own walk alone, smoothed 0.3 a step (1.x `_velX`)', own);
}

// ── the cycle: cruise → 0.8 s inhale → scream, on 1.x's frame arithmetic ──
{
  const { w, g } = world({ seed: 4, x: 16, z: 2 });
  const t0 = g.s.screamT, nIn = stepsDown(t0), nOut = stepsDown(S.inhale);
  const log = [];
  for (let i = 1; i <= nIn + nOut + 5; i++) {
    const x0 = g.x;
    step(w, IDLE);
    log.push({ i, inhaleT: g.s.inhaleT, tell: g.tell, moved: g.x !== x0, scream: screams(w).length });
  }
  const start = log.findIndex((e) => e.inhaleT > 0) + 1, at = log.findIndex((e) => e.scream) + 1;
  check('the inhale begins on the step its timer runs out', start === nIn, `step ${start} want ${nIn}`);
  check('… at 0.8 s, not yet counted down', log[start - 1].inhaleT === S.inhale);
  check('it screams 0.8 s later, on the step the inhale runs out', at === nIn + nOut, `step ${at} want ${nIn + nOut}`);
  check('the first scream comes 3.3–4.8 s after it arrives', at * dt >= 3.3 && at * dt < 4.8 + 2 * dt, `${(at * dt).toFixed(3)} s`);
  check('one scream, and the next timer is a fresh 3.5 + U·1.5 s draw', log.filter((e) => e.scream).length === 1 && g.s.inhaleT <= 0
    && g.s.screamT >= 3.5 - 5 * dt && g.s.screamT < 5.0);
  const inh = log.slice(start, at - 1);
  check('the tell: k = 1 − inhaleT / 0.8 every step of the inhale (1.x enemy.js:1827)', inh.length === nOut - 1 && inh.every((e) => near(e.tell, 1 - e.inhaleT / S.inhale, 1e-12)));
  check('… rising from 1/48 to 47/48', near(inh[0].tell, 1 / 48, 1e-6) && near(inh[inh.length - 1].tell, 47 / 48, 1e-6) && inh.every((e, k) => k === 0 || e.tell > inh[k - 1].tell));
  check('no tell while it cruises, on the step the inhale starts, or the step it screams', log.slice(0, start).every((e) => e.tell === 0) && log[at - 1].tell === 0 && log.slice(at).every((e) => e.tell === 0));
  check('it keeps walking while it inhales', inh.every((e) => e.moved));
  // with the tell off, 1.x as it drew: nothing
  S.inhaleTell = false;
  const r = world({ seed: 4, x: 16, z: 2 });
  let tells = 0;
  for (let i = 0; i < nIn + nOut + 5; i++) { step(r.w, IDLE); if (r.g.tell !== 0) tells++; }
  S.inhaleTell = true;
  check('with `inhaleTell` off it shows no tell at all, and screams on the same step', tells === 0 && r.g.s.screams === 1);
}
{
  // many screams: the gap is a fresh 3.5–5.0 s draw plus the 0.8 s inhale
  const { w, g } = world({ seed: 9 });
  let last = 0, bad = 0, nextT = null;
  const gaps = [];
  for (let i = 1; i <= 60 * 60; i++) {
    step(w, IDLE);
    if (screams(w).length) {
      if (last) { gaps.push(i - last); if (i - last !== stepsDown(nextT) + stepsDown(S.inhale)) bad++; }
      last = i; nextT = g.s.screamT;
    }
  }
  check('over a minute it screams again and again', gaps.length >= 9 && gaps.length <= 14, `${gaps.length + 1} screams`);
  check('each gap is its own draw + 0.8 s on 1.x\'s frame arithmetic: 4.3–5.8 s', bad === 0 && gaps.every((k) => k >= 258 && k <= 348), gaps.join(' '));
  check('and the draws differ', new Set(gaps).size > gaps.length / 2);
}

// ── the scream: who surges, how far, how long ─────────────────────────
{
  const { w, g } = world({ x: 9, z: 0 });            // it holds at 9: it screams from exactly (9, 0)
  w.hero.mercy = 1e9;
  const early = add(w, 'globbo', 12, 0);            // moved to the front of the step order
  w.gels.splice(w.gels.indexOf(early), 1); w.gels.unshift(early);
  const inside = add(w, 'globbo', 9 - 6.99, 0);     // centre 6.99 away
  const edge = add(w, 'globbo', 2, 0);              // exactly 7 away: 1.x's test is strict
  const far = add(w, 'globbo', 9, 7.5);
  const sister = add(w, 'siren', 9, 3);
  const boss = add(w, 'globbo', 11, -3, { isBoss: true });
  const dead = add(w, 'globbo', 10, 2);
  const arriving = api.spawn(w, 'globbo', 7, 4);   // only just arrived, unanchored: on the floor all the same
  for (const b of [early, inside, edge, far, boss, dead]) b.s.pounceT = QUIET;
  sister.s.screamT = QUIET;
  g.s.inhaleT = dt / 2;                             // the inhale runs out on step 1
  dead.alive = false;
  const at = untilScream(w, 120);
  const e = screams(w)[0];
  check('the step its inhale runs out, it screams', at === 1, `step ${at}`);
  check('the scream is reported where it stood, with its reach', e && e.id === g.id && e.x === 9 && e.z === 0 && e.reach === 7 && g.s.screams === 1 && g.s.screamX === 9 && g.s.screamZ === 0);
  check('a body within 7 surges: 3 s at 1.6× — counted down already this step, being later in the order',
    inside.surgeMult === 1.6 && near(inside.surgeT, S.surgeTime - dt, 1e-12), `${inside.surgeT}`);
  check('a body earlier in the order surges from the next step (1.x\'s frame order)', early.surgeMult === 1.6 && early.surgeT === S.surgeTime);
  check('the speed it walks at is 1.6×', near(api.speed(inside), T.species.globbo.speed * 1.6, 1e-12));
  check('exactly 7 away is out of reach', edge.surgeT === 0 && edge.surgeMult === 1);
  check('farther is out of reach', far.surgeT === 0);
  check('another SIREN is immune', sister.surgeT === 0);
  check('a boss is immune', boss.surgeT === 0);
  check('a dead body is not surged', dead.surgeT === 0);
  check('a body that has only just arrived is on the floor, and surges like the rest: later in the order, counted down already (1.x: pushed at main.js:9436, before the loop that screams)',
    arriving.state === 'active' && arriving.t === dt && arriving.surgeMult === 1.6 && near(arriving.surgeT, S.surgeTime - dt, 1e-12), `${arriving.state} ${arriving.surgeT}`);
  check('it does not surge itself', g.surgeT === 0);
  // how long: while surgeT > 0 after the core's count-down
  let n = 1;
  while (inside.surgeT > 0 && n < 400) { step(w, IDLE); if (inside.surgeT > 0) n++; }
  check('the surge lasts 3 s (1.x\'s count: set to 3, counted down before it is read)', n === stepsDown(S.surgeTime) - 1, `${n} steps`);
}
{
  // a brood still waiting out its parent's death pop is not on 1.x's floor:
  // 1.x raised a SPLITTA's `_childrenReady` only when its 0.28 s pop ran out
  // (enemy.js:2968-3000, counted down inside the update loop at main.js:10408)
  // and built the GLOBBOs after that loop (main.js:10586-10620), so the
  // scream's sweep over `enemies` (main.js:10388-10394) misses them until the
  // frame after: the core holds them in state 'appear' for that wait
  const { w, g } = world({ x: 9, z: 0 });
  w.hero.mercy = 1e9;
  const parent = add(w, 'splitta', 9, 3);
  api.kill(w, parent, 'env');                       // dead before step 1: its pop starts counting on step 1
  const brood = w.gels.filter((o) => o.kind === 'globbo');
  for (const b of brood) { b.s.pounceT = QUIET; b.anchored = true; }
  const inReach = () => brood.every((b) => Math.hypot(b.x - g.s.screamX, b.z - g.s.screamZ) < S.reach);
  g.s.inhaleT = dt / 2;                             // scream on step 1, mid-wait
  const at = untilScream(w, 2);
  check('a SPLITTA\'s three GLOBBOs wait out its pop in the core\'s wait', brood.length === 3 && brood.every((b) => b.state === 'appear'));
  check('… and a scream over them then surges none of them (1.x: not built yet)',
    at === 1 && inReach() && brood.every((b) => b.surgeT === 0 && b.surgeMult === 1), brood.map((b) => `${b.state} ${b.surgeT}`).join(' '));
  // they land on the step the pop runs out (1.x: `_deathT -= dt` from 0.28
  // until ≤ 0); a scream that very step, from a SIREN ahead of them in the
  // order, still misses them: 1.x screamed in the loop and built them after it
  const land = stepsDown(T.blob.death);
  let n = 1;
  while (n < land - 1) { step(w, IDLE); n++; }
  check('… still waiting the step before the pop runs out', brood.every((b) => b.state === 'appear'));
  g.s.inhaleT = dt / 2;
  step(w, IDLE); n++;
  check(`they land on the step the 0.28 s pop runs out (step ${land})`, n === land && brood.every((b) => b.state === 'active'), `${n}: ${brood.map((b) => b.state)}`);
  check('… and the scream that same step misses them (1.x built them after its loop)',
    screams(w).length === 1 && inReach() && brood.every((b) => b.surgeT === 0 && b.surgeMult === 1), brood.map((b) => b.surgeT).join(' '));
  // from the next step they are bodies like any other
  g.s.inhaleT = dt / 2;
  step(w, IDLE);
  check('the step after, a scream surges them: later in the order than the SIREN, counted down already',
    screams(w).length === 1 && inReach() && brood.every((b) => b.surgeMult === 1.6 && near(b.surgeT, S.surgeTime - dt, 1e-12)), brood.map((b) => b.surgeT).join(' '));
}
{
  // a second scream refreshes the surge, never stacks it
  const { w, g } = world({ x: 9, z: 0 });
  const b = add(w, 'globbo', 6, 0);
  b.s.pounce = 'crouch'; b.s.pounceT = QUIET; w.hero.mercy = 1e9;   // crouched: it stays put
  g.s.screamT = dt / 2;
  untilScream(w, 120);
  for (let i = 0; i < 60; i++) step(w, IDLE);
  const mid = b.surgeT;
  g.s.inhaleT = dt / 2;                              // scream again now
  step(w, IDLE);
  check('a second scream sets the surge back to 3 s, not 3 + what was left', mid > 1.9 && mid < 2.1 && near(b.surgeT, S.surgeTime - dt, 1e-12), `${mid} → ${b.surgeT}`);
}
{
  // it screams from where its own move this step leaves it (1.x screamed after moving)
  const { w, g } = world({ x: 15, z: 0 });
  g.s.inhaleT = dt / 2;
  untilScream(w, 120);
  const e = screams(w)[0];
  check('closing in, it screams from where this step\'s walk left it', e && e.x === g.x && e.z === g.z && g.x < 15);
}
{
  // the surge reaches what reads a body's walking speed: a stalking GLOBBO walks 1.6× as far
  const run = (loud) => {
    const { w, g } = world({ x: 9, z: 0 });
    const b = add(w, 'globbo', 12, 3);
    b.s.pounceT = QUIET; w.hero.mercy = 1e9;
    g.s.screamT = loud ? dt / 2 : QUIET;
    for (let i = 0; i < 1 + stepsDown(S.inhale); i++) step(w, IDLE);
    const out = [];
    for (let i = 0; i < 30; i++) { const x0 = b.x, z0 = b.z; step(w, IDLE); out.push(Math.hypot(b.x - x0, b.z - z0)); }
    return out;
  };
  const loud = run(true), quiet = run(false);
  check('a surged GLOBBO stalks at 1.6× (1.x: GLOBBO\'s stalk reads spd)', loud.every((d, k) => near(d / quiet[k], 1.6, 1e-9)), `${(loud[0] / quiet[0]).toFixed(6)}`);
}
{
  // an elite: twice the hp, 1.2× the size, the same 7 reach (SIREN_RADIUS is a constant)
  const { w, g } = world({ x: 9, z: 0, o: { variant: 'elite' } });
  check('an elite has 6 hp and a 0.9 radius', g.hp === 6 && near(g.r, 0.9, 1e-12));
  const a = add(w, 'globbo', 9 - 6.99, 0), b = add(w, 'globbo', 2, 0);
  a.s.pounceT = b.s.pounceT = QUIET; w.hero.mercy = 1e9;
  g.s.inhaleT = dt / 2;
  untilScream(w, 120);
  check('… and screams to the same 7', a.surgeT > 0 && b.surgeT === 0);
}

{
  // backed into a wall it is held there, as the core holds every body; its
  // look's velocity is what its walk actually did (1.x measured the move)
  const { w, g } = world({ x: 19 - 0.75, z: 0 });
  w.hero.x = w.hero.px = 12;                         // 6.25 away: it wants to back off, into the wall
  g.s.screamT = QUIET;
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('pressed against a wall it stays at the wall', g.x === 19 - 0.75 && g.z === 0, `${g.x}`);
  check('… and its look sees no walk, so it neither smears nor turns', g.s.velX === 0 && g.s.velZ === 0, `${g.s.velX}`);
  g.s.inhaleT = dt / 2;
  untilScream(w, 2);
  const e = screams(w)[0];
  check('… and screams from where it stands, inside the arena', e && e.x === 19 - 0.75 && e.z === 0, e && `${e.x}`);
}
{
  // a knock (the PUSH dash's shove) moves it on top of its walk; it screams
  // from where that leaves it (the core integrates the knock after the step)
  const { w, g } = world({ x: 9, z: 0 });
  g.kx = 10; g.kz = -4;
  g.s.inhaleT = dt / 2;
  const x0 = g.x;
  untilScream(w, 2);
  const e = screams(w)[0];
  check('a knock carries it (a shove is not thrown away)', g.x > x0 + 0.1 && g.z < 0, `${g.x} ${g.z}`);
  check('… and the scream goes out from where the step left it, knock and all', e && e.x === g.x && e.z === g.z, e && `${e.x},${e.z} vs ${g.x},${g.z}`);
}
{
  // the PUSH dash: a SIREN is shoved like any body that is not planted; the
  // shove is outside movement, so its look's velocity stays its own walk
  const run = (dash) => {
    const w = createWorld({ seed: 5, mode: 'arcade', dashMode: 'push' });
    w.director = { step() {} };
    const g = api.spawn(w, 'siren', 8, 0);
    g.s.screamT = QUIET;
    w.hero.x = w.hero.px = 6; w.hero.z = w.hero.pz = 0;
    let core = 0, own = 0, x9 = 0;
    for (let i = 0; i < 40; i++) {
      step(w, { mx: dash && i === 0 ? 1 : 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: dash && i === 0 });
      core = Math.max(core, g.velX); own = Math.max(own, Math.hypot(g.s.velX, g.s.velZ));
      if (i === 8) x9 = g.x;                       // the dash's ploughing ends about here
    }
    return { g, core, own, x9 };
  };
  const pushed = run(true), quiet = run(false);
  check('the PUSH dash shoves it well past where its own retreat takes it', pushed.x9 - quiet.x9 > 1.5, `${pushed.x9} vs ${quiet.x9}`);
  check('… while its look\'s velocity never exceeds its own retreat (1.56 u/s)', pushed.core > 3 && pushed.own <= S.speed * S.retreat * (1 + 1e-9), `core ${pushed.core} own ${pushed.own}`);
}
{
  // the CUT dash: it takes the cut's hits like any body (no hit test of its own)
  const w = createWorld({ seed: 5, mode: 'arcade', dashMode: 'cut' });
  w.director = { step() {} };
  const g = api.spawn(w, 'siren', 9, 0);
  g.anchored = true; g.s.screamT = QUIET;
  w.hero.x = w.hero.px = 6; w.hero.z = w.hero.pz = 0;
  for (let i = 0; i < 20; i++) step(w, { mx: i === 0 ? 1 : 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: i === 0 });
  check(`a CUT dash through it takes ${T.hero.cut.hits} of its 3 hp`, g.alive && g.hp === S.hp - T.hero.cut.hits, `${g.hp}`);
}

// ── contact: it never hurts to touch in classic ───────────────────────
{
  const { w, g } = world({ x: 0.4, z: 0 });
  g.s.screamT = QUIET;
  for (let i = 0; i < 30; i++) { g.x = 0.4; step(w, IDLE); }
  check('standing in it does not hurt (1.x MELEE_TYPES has no SIREN)', w.hero.lives === T.hero.lives && !w.events.some((e) => e.type === 'hurt'));
}

// ── it dies to three hits and leaves nothing behind ───────────────────
{
  for (const mode of ['arcade', 'hardcade']) {
    const { w, g } = world({ mode, x: 9 });
    w.wave = 8;
    g.s.screamT = QUIET;
    let kills = [];
    for (let k = 0; k < 3; k++) {
      api.heroBullet(w, g.x - 0.6, g.z, 0);
      step(w, IDLE);
      kills = kills.concat(w.events.filter((e) => e.type === 'kill' && e.kind === 'siren'));
      if (k < 2) check(`${mode}: hit ${k + 1} takes a point and flashes`, g.alive && g.hp === 2 - k && g.flash > 0);
    }
    check(`${mode}: the third hit kills it, a big death (r 0.75 ≥ 0.75)`, kills.length === 1 && !g.alive && kills[0].big === true);
    const R = T.revenge;
    const corpse = mode === 'hardcade' && R.who === 'all' ? Math.max(1, Math.round(R.ring.small * R.density)) : 0;
    check(`${mode}: no children, no death ring${corpse ? `, a ${corpse}-ring of corpse fire` : ', no corpse fire'}`, w.gels.length === 0 && w.bullets.length === corpse);
  }
  // a dead SIREN screams no more
  const { w, g } = world({ x: 9 });
  g.s.screamT = dt / 2;
  step(w, IDLE);
  api.kill(w, g, 'env');
  let any = false;
  for (let i = 0; i < 120; i++) { step(w, IDLE); any ||= screams(w).length > 0; }
  check('killed mid-inhale, it never screams', !any);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: 14, z: 6, anchored: false });
    const out = [];
    for (let i = 0; i < 900; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.screams}`); }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed screams elsewhen', trail(11) !== trail(12));
}

// ── the look: 1.x's scale block, the inhale v141 meant, the ScreamRing ──
{
  let matArgs = null;
  const scene = new THREE.Scene(), clock = { value: 0 };
  const ctx = { THREE, TSL: THREE.TSL, GEL_TIME: clock, T, S, scene, geo: { blob: new THREE.SphereGeometry(1, 8, 6) },
    gelMaterial: (hex, fam, r, o) => { matArgs = [hex, fam, r, o]; const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color(); return m; } };
  const v = { kind: 'siren', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 1.234, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  const ring = v.ring.mesh, rmat = v.ring.mat, geo = ring.geometry.parameters;
  check('it builds its own body: one plain gel dome of the blob family (uWobble 1, uRadius 1)',
    v.own === true && matArgs[0] === 0xbb66ff && matArgs[1] === 'blob' && matArgs[2] === 1 && matArgs[3] === undefined && v.mesh.geometry === ctx.geo.blob && v.mesh.material === v.mat);
  check('the ring is RingGeometry(0.82, 1.0, 40), drawn, not added (v104: no glow) violet, no depth write, both sides',
    geo.innerRadius === 0.82 && geo.outerRadius === 1.0 && geo.thetaSegments === 40 && rmat.blending === THREE.NormalBlending
    && rmat.depthWrite === false && rmat.side === THREE.DoubleSide && rmat.transparent && rmat.color.getHex() === 0xbb66ff);
  check('… lying flat on the floor in the scene, not under the body, unseen until a scream', ring.parent === scene && near(ring.rotation.x, -Math.PI / 2) && ring.position.y === 0.05 && !ring.visible);

  const sh = T.blob.shape, B = T.blob, L = S.look;
  const emissive = (hex) => { v.mat.emissive.setHex(hex); };
  const g = { r: 0.75, sq: 1, tell: 0, flash: 0, velX: 0, velZ: 0, s: { clock: 0, phase: 0, velX: 0, velZ: 0, screams: 0, screamX: 0, screamZ: 0 } };
  const squash = (sq) => v.squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  // the whole transform: squash group × body group × mesh
  const total = () => { v.root.updateMatrixWorld(true); const s = new THREE.Vector3(); v.mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s; };
  squash(1); emissive(0x123456);
  look.update(v, g, null, 0.77, 1);
  check('at rest it is r × the dome: 0.79 wide, 1.05 tall (species-a.md §2.10.1)',
    near(v.mesh.scale.x, 0.75 * sh.x) && near(v.mesh.scale.y, 0.75 * sh.y) && near(v.mesh.scale.z, 0.75 * sh.z) && near(0.75 * sh.y * 1.7, 1.05, 0.01));
  check('it breathes on its own clock, not the render\'s', (look.update(v, g, null, 3.1, 1), near(v.mesh.scale.y, 0.75 * sh.y)));
  check('… and without an inhale it leaves the glow alone', v.mat.emissive.getHex() === 0x123456);
  g.r = 0.9; look.update(v, g, null, 0, 1);
  check('an elite is drawn at its own radius, 1.2× (1.x `r·rm`)', near(v.mesh.scale.x, 0.9 * sh.x) && near(v.mesh.scale.y, 0.9 * sh.y));
  g.r = 0.75; look.update(v, g, null, 0, 0.5);
  check('it grows in with the view\'s swell (actors.js hands it `grow`; the body is live all along)', near(v.mesh.scale.x, 0.375 * sh.x));
  // squashed, breathing and dragging: the squash group × the body group × the mesh is 1.x's own scale
  g.sq = 0.7; squash(0.7); g.s = { ...g.s, clock: 0.37, phase: 0.2, velX: 2.5, velZ: 0 };
  look.update(v, g, null, 9, 1);
  const b = B.breatheAmp * Math.sin(0.37 * B.breatheHz + 0.2), sx = 1 / Math.sqrt(0.7), drag = Math.min(2.5 * B.dragStretchPerSpeed, B.dragMax);
  const want = [0.75 * sh.x * sx * (1 - b * 0.5), 0.75 * sh.y * (0.7 * (1 + b) - drag * 0.25), 0.75 * sh.z * (sx * (1 - b * 0.5) + drag)];
  const got = [v.mesh.scale.x, v.mesh.scale.y, v.mesh.scale.z];
  check('squashed, breathing and dragging, its mesh is 1.x\'s formula (1.x enemy.js:2747-2769)', got.every((x, k) => near(x, want[k], 1e-12)), `${got} vs ${want}`);
  const tot = total();
  check('… and the squash group above it is undone exactly', near(tot.x, want[0], 1e-9) && near(tot.y, want[1], 1e-9) && near(tot.z, want[2], 1e-9), `${tot.x} ${tot.y} ${tot.z}`);
  check('it turns to its OWN heading, nose lifting with the drag', near(v.yaw, Math.atan2(2.5, 0)) && near(v.mesh.rotation.x, -drag * B.rearDragTilt) && v.mesh.rotation.z === 0);
  g.s.velX = 0.3; g.s.velZ = 0.1; const yaw = v.yaw; look.update(v, g, null, 0, 1);
  check('below 0.4 u/s it holds its heading', v.yaw === yaw);
  // the inhale: 1 + 0.45·k on every axis, and the strobe on its own clock
  g.sq = 1; squash(1); g.s.velX = 0; g.s.velZ = 0; g.s.clock = 0; g.s.phase = 0;
  look.update(v, g, null, 0, 1);
  const rest = [v.mesh.scale.x, v.mesh.scale.y, v.mesh.scale.z];
  g.tell = 0.5; g.s.clock = 0.05;                       // sin(20 · 0.05) > 0: the bright half
  const b2 = B.breatheAmp * Math.sin(0.05 * B.breatheHz);
  look.update(v, g, null, 0, 1);
  check('mid-inhale it is swollen to 1.225× (1 + 0.45 × 0.5) all round (1.x enemy.js:1828)',
    near(v.mesh.scale.x, 0.75 * sh.x * (1 - b2 * 0.5) * 1.225, 1e-12) && near(v.mesh.scale.y, 0.75 * sh.y * (1 + b2) * 1.225, 1e-12) && near(v.mesh.scale.z, 0.75 * sh.z * (1 - b2 * 0.5) * 1.225, 1e-12) && v.mesh.scale.y > rest[1] * 1.2);
  check('… glowing 0x6633aa on the bright half of sin(20·clock)', v.mat.emissive.getHex() === 0x6633aa, v.mat.emissive.getHexString());
  g.s.clock = 0.2; look.update(v, g, null, 0, 1);       // sin(4) < 0
  check('… and 0x220044 on the dark half (1.x enemy.js:1829)', v.mat.emissive.getHex() === 0x220044, v.mat.emissive.getHexString());
  emissive(0x999999); g.flash = 0.1; look.update(v, g, null, 0, 1);
  check('the hit flash outranks the strobe', v.mat.emissive.getHex() === 0x999999);
  g.flash = 0; g.tell = 1; look.update(v, g, null, 0, 1);
  check('at the top of the inhale it is 1.45× itself', near(v.mesh.scale.x / (0.75 * sh.x * (1 - B.breatheAmp * Math.sin(0.2 * B.breatheHz) * 0.5)), 1.45, 1e-12));
  g.tell = 0;
  emissive(0x662200); g.affix = 'volatile'; g.tell = 0.5; look.update(v, g, null, 0, 1);
  check('a VOLATILE body\'s smoulder outranks the strobe too (1.x enemy.js:2653-2656)', v.mat.emissive.getHex() === 0x662200);
  g.affix = null; g.tell = 0;

  // the death pop: the core grows the root and stops updating the view; the
  // mesh goes back to 1.x's plain round base, r × the elite's 1.2
  g.sq = 0.62; squash(0.62); g.tell = 0.8; g.s.velX = 3; g.s.clock = 1.1;
  look.update(v, g, null, 0, 1);
  const tilt = v.mesh.rotation.x, head = v.mesh.rotation.y;
  v.r = 0.9; v.dyingT = 0.14; squash(1); v.root.scale.setScalar(1 + 0.5 * B.deathSwell);   // what actors.js does
  v.mesh.onBeforeRender();
  const dpop = total();
  check('dying, it pops as a round dome of its own size × (1 + 1.3t) (1.x enemy.js:2981, 3026)',
    near(dpop.x, 0.9 * 1.65, 1e-9) && near(dpop.y, 0.9 * 1.65, 1e-9) && near(dpop.z, 0.9 * 1.65, 1e-9), `${dpop.x} ${dpop.y} ${dpop.z}`);
  check('… keeping its heading and tilt', v.mesh.rotation.x === tilt && v.mesh.rotation.y === head && tilt !== 0);
  v.dyingT = 0; v.root.scale.setScalar(1); squash(0.62); look.update(v, g, null, 0, 1);
  const live = [v.mesh.scale.x, v.mesh.scale.y];
  v.mesh.onBeforeRender();
  check('alive, the hook leaves its pose alone', v.mesh.scale.x === live[0] && v.mesh.scale.y === live[1] && v.body.scale.y !== 1);
  g.sq = 1; squash(1); g.tell = 0; g.s.velX = 0; g.s.clock = 0.2; v.r = undefined;

  // the ring: let out where it screamed, 1 → 7 and 0.7 → 0 over 0.55 s, on the gel clock
  g.s.screams = 1; g.s.screamX = 3; g.s.screamZ = -2;
  clock.value = 10; look.update(v, g, null, 10, 1);
  check('a scream lets the ring out where it screamed, at full 0.7 and radius 1', ring.visible && ring.position.x === 3 && ring.position.z === -2 && ring.position.y === 0.05
    && near(ring.scale.x, 1) && near(rmat.opacity, 0.7));
  clock.value = 10.275; ring.onBeforeRender();
  check('half way it is 4× (outer radius 4) at 0.35 (1.x main.js:2534-2536)', near(ring.scale.x, 4, 1e-9) && near(ring.scale.z, 4, 1e-9) && near(rmat.opacity, 0.35, 1e-9));
  v.root.updateMatrixWorld(true);
  const pos = new THREE.Vector3(); ring.matrixWorld.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
  check('… flat, and where it was let out (it does not follow the body)', near(pos.x, 3) && near(pos.z, -2) && near(pos.y, 0.05));
  look.update(v, g, null, 10.3, 1);
  check('the same scream does not restart it', near(v.ring.start, 10));
  clock.value = 10.5499; ring.onBeforeRender();
  check('it ends at outer radius 7, the surge\'s exact reach', near(ring.scale.x, 1 + (0.5499 / 0.55) * 6, 1e-9) && ring.scale.x > 6.98);
  clock.value = 10.56; ring.onBeforeRender();
  check('and is gone once its 0.55 s are up — with no help from the body (it may be dead)', !ring.visible && rmat.opacity === 0);
  g.s.screams = 2; g.s.screamX = -1; g.s.screamZ = 1; look.update(v, g, null, 15, 1);
  check('the next scream lets it out again', ring.visible && ring.position.x === -1 && near(v.ring.start, 15));
  // a pooled view comes back clean
  v.yaw = 2; look.reset(v);
  check('a reused view faces forward again (1.x `_moveYaw = 0`), with no scream seen', v.yaw === 0 && v.seen === 0);
  const fresh = { ...g, s: { ...g.s, screams: 0 } };
  ring.visible = false; look.update(v, fresh, null, 20, 1);
  check('… and a fresh SIREN lets no ring out until it screams', !ring.visible);
}

if (failed) { console.log(`✗ siren: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ siren: ${passed} checks`);
