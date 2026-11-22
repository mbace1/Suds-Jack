#!/usr/bin/env node
// botfly.mjs — BOTFLY's own checks, in bare node: 1.x's numbers (enemy.js:594,
// 668-674, 745-746, 810-817, 1230-1247, 2280-2294, 2650-2685, 2728-2779,
// 2784-2785, 2873-2875, 2934-2946, 3004-3033; bullet.js:91-131, 196-203;
// main.js:2408-2420, 4476, 5042, 10473-10479; audio.js:252-253; tuning.js:32,
// 307, 510), asserted against the sim on its fixed 1/60 s step. The flight is
// checked against an ORACLE: 1.x's own per-frame arithmetic for the BOTFLY
// case of update() and _tick() — the orbit, the charge read, the non-blob
// squash spring, the clock and the shot — and bullet.js's homing lerp for its
// shots, in 1.x's literals (not the tuning file's), from the same seeded
// draws, so every step's position, every shot and every shot's path must
// match 1.x's frame for frame.
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=162';
import { makeRng } from '../../js/sim/rng.js?v=162';
import { TUNING as T } from '../../js/tuning.js?v=162';
import { waveScale } from '../../js/sim/director/arcade.js?v=162';
import look, { pose } from '../../js/render/looks/botfly.js?v=162';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const S = T.species.botfly, L = S.look, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const FIRE = { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);
const shotsOf = (w) => w.bullets.filter((b) => b.src === 'botfly' && !b.revenge && !b.dead);

// A world with one BOTFLY (anchored unless told otherwise: no swarm forces, no
// crowd, so only its own step moves it), the hero standing at `hero`, never
// running out of lives. `rng` is a copy of the run's seeded stream from just
// before the spawn, so the oracle can draw the same clock and orbit sign.
function world({ seed = 1, x = 8, z = 0, o = {}, hero = [0, 0], mode = 'arcade', anchored = true, ghost = false } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  if (ghost) w.hero.mercy = 1e9;                 // invincible: its shots pass through and fly their whole life
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  const rng = makeRng(0); rng.state = w.rng.state;
  const g = api.spawn(w, 'botfly', x, z, o);
  if (anchored) g.anchored = true;
  return { w, g, rng };
}
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
// one step, returning the bullets it put on the floor
function stepShots(w, input = IDLE) {
  const before = new Set(w.bullets);
  step(w, input);
  return w.bullets.filter((b) => !before.has(b));
}
// the steps a clock of `period` takes: 1.x adds dt a frame and fires at ≥ period, resetting to 0
const stepsFor = (t0, period) => { let t = t0, n = 0; do { t += 1 / 60; n++; } while (t < period); return n; };

// 1.x's BOTFLY, frame by frame (enemy.js:1680-1682, 2280-2287, 2682-2683,
// 2728-2731, 2784-2785, 2875, 2934-2946) and its shots' homing and flight
// (bullet.js:121-135, 196-203), in 1.x's literals, on the landscape arena.
// `heroAt(i)` is where the hero stood on step i (it moves before the bodies,
// in 1.x and in 2.0). `hits` kicks the spring after a step (a hit lands after
// the update, enemy.js:1607). The wall clamp (by the body's radius) and the
// bullet cull (the arena + 1.5) are the core's: 1.x had no wall for a BOTFLY
// and culled at max(HALF_X, HALF_Z) + 2; these runs never reach either.
function oracle(steps, { x, z, rng, heroAt, speedMult = 1, intervalMult = 1, hits = new Set(), r = 0.5, hx = 19, hz = 11 }) {
  let t = 0 + (0.5 - 0) * rng.next();                      // enemy.js:674
  const orbit = rng.next() < 0.5 ? -1 : 1;                 // enemy.js:1235
  let sq = 1, sqV = 0;
  const speed = 7 * 0.62, bullets = [], out = [null];
  for (let i = 1; i <= steps; i++) {
    const [px, pz] = heroAt(i);
    const ddx = px - x, ddz = pz - z, dist = Math.hypot(ddx, ddz) || 0.001;
    const want = 8, perpX = -ddz / dist, perpZ = ddx / dist;
    const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
    const spd = 2.0 * speedMult;
    x += (ddx / dist * radial + perpX * orbit * 0.8) * spd * dt;
    z += (ddz / dist * radial + perpZ * orbit * 0.8) * spd * dt;
    x = clamp(x, -(hx - r), hx - r); z = clamp(z, -(hz - r), hz - r);
    const charge = t >= 3.8 * intervalMult - 0.5;
    sqV = (sqV - (sq - 1) * 0.18) * 0.90;
    sq = Math.max(0.55, Math.min(1.55, sq + sqV));
    t += dt;
    let shot = null;
    if (t >= 3.8 * intervalMult) {
      t = 0;
      const dl = Math.hypot(px - x, pz - z) || 1;
      shot = { x, z, x0: x, z0: z, vx: ((px - x) / dl) * speed, vz: ((pz - z) / dl) * speed, life: 4, dead: false };
      bullets.push(shot);
      sqV -= 0.5;
    }
    for (const b of bullets) {
      if (b.dead) continue;
      const dx = px - b.x, dz = pz - b.z, len = Math.hypot(dx, dz) || 1;
      const turn = Math.min(1, 1.8 * dt);
      b.vx += ((dx / len) * speed - b.vx) * turn;
      b.vz += ((dz / len) * speed - b.vz) * turn;
      b.x += b.vx * dt; b.z += b.vz * dt;
      if ((b.life -= dt) <= 0 || Math.abs(b.x) > hx + 1.5 || Math.abs(b.z) > hz + 1.5) b.dead = true;
    }
    if (hits.has(i)) sqV -= 0.75;
    out.push({ x, z, charge, sq, sqV, shot: shot && { x: shot.x0, z: shot.z0 }, live: bullets.filter((b) => !b.dead).map((b) => ({ ...b })) });
  }
  return { out, orbit };
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.5, hp 2, speed 2.0, body 0xff55bb, bullets 0xff66ee, every 3.8 s (1.x enemy.js:594)',
    S.radius === 0.5 && S.hp === 2 && S.speed === 2.0 && S.color === 0xff55bb && S.bulletColor === 0xff66ee && S.fireInterval === 3.8);
  check('its own body, no contact damage, HOLDER, an AIMED biter, "pink Botfly" (1.x enemy.js:745, main.js:2408-2420, 5042, tuning.js:307, 510)',
    S.family === 'custom' && S.contact === false && S.role === 'HOLDER' && S.revenge === 'AIMED' && S.deathLabel === 'pink Botfly' && S.name === 'BOTFLY');
  check('the orbit: holds 8 ± 1.5, radial 1, the drift 0.8 in a sign drawn 50/50 (1.x enemy.js:2283-2287, 1235)',
    S.hold === 8 && S.holdBand === 1.5 && S.radial === 1 && S.orbit === 0.8 && S.orbitNegative === 0.5);
  check('the shot: the clock from U(0, 0.5); 0.62 × 7 u/s, homing turnRate 1.8, a −0.5 squash kick (1.x enemy.js:674, 2941-2942)',
    S.fireStart[0] === 0 && S.fireStart[1] === 0.5 && S.shot.speedMult === 0.62 && S.shot.turnRate === 1.8 && S.shot.squash === -0.5);
  check('the charge: the last 0.5 s of the clock (1.x enemy.js:2683)', S.chargeWindow === 0.5);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2731)',
    S.squashSpring.spring === 0.18 && S.squashSpring.damp === 0.90 && S.squashSpring.min === 0.55 && S.squashSpring.max === 1.55);
  check('the launch zip: triangle 380 → 1150 Hz, 0.16 s at 0.14 (1.x audio.js:253)',
    S.sound.shot.wave === 'triangle' && S.sound.shot.f0 === 380 && S.sound.shot.f1 === 1150 && S.sound.shot.dur === 0.16 && S.sound.shot.vol === 0.14);
  check('the look: a 12 × 9 sphere in the omega satin 0.04 / 0.40, wobble 0.35; hover 1.5 ± 0.22 @ 3 (1.x enemy.js:323, 746, 1233, 2288, tuning.js:32)',
    L.segments[0] === 12 && L.segments[1] === 9 && L.gelFamily === 'omega' && L.roughness === 0.04 && L.transmission === 0.40 && L.wobble === 0.35
    && L.hover.base === 1.5 && L.hover.amp === 0.22 && L.hover.rate === 3 && L.sqFloor === 0.1);
  check('the wings: 0.62 × 0.3 at ±(r + 0.18), 0.12 up, 0xffaadd at 0.55, flapping 0.45 ± 0.5 @ 22 (1.x enemy.js:1236-1245, 2290-2292)',
    L.wing.size[0] === 0.62 && L.wing.size[1] === 0.3 && L.wing.out === 0.18 && L.wing.y === 0.12 && L.wing.color === 0xffaadd && L.wing.opacity === 0.55
    && L.wing.flap.base === 0.45 && L.wing.flap.amp === 0.5 && L.wing.flap.rate === 22);
  check('the charge flicker: 0x661144 / black at 25 rad/s (1.x enemy.js:2684)', L.charge.on === 0x661144 && L.charge.off === 0x000000 && L.charge.rate === 25);
  check('its swarm profile is HOLDER: only the wave\'s current, at 0.25 (1.x tuning.js:292, 307)',
    T.movement.roles.HOLDER.current === 0.25 && T.movement.roles.HOLDER.dodge === 0 && T.movement.roles.HOLDER.flock === 0 && T.movement.roles.HOLDER.weave === 0);
}

// ── spawning: the CFG body, an elite ─────────────────────────────────
{
  const { g } = world();
  check('a BOTFLY: 2 hp, radius 0.5', g.hp === 2 && g.maxHp === 2 && g.r === 0.5);
  const e = world({ o: { variant: 'elite' } }).g;
  check('an elite: 4 hp = ceil(2 × 2), radius 0.6 = 0.5 × 1.2 (1.x main.js:9402-9422)', e.hp === 4 && near(e.r, 0.6));
  const signs = new Set();
  for (let seed = 1; seed <= 16; seed++) signs.add(world({ seed }).g.s.orbit);
  check('the orbit sign is ±1 by the seed (1.x enemy.js:1235)', signs.size === 2 && [...signs].every((s) => s === 1 || s === -1));
  const a = world({ seed: 9 }).g, b = world({ seed: 9 }).g;
  check('the same seed gives the same sign and clock (w.rng, never Math.random)', a.s.orbit === b.s.orbit && a.s.t === b.s.t);
}

// ── 25 s of flight, frame for frame against 1.x ──────────────────────
// The hero walks a slow figure so the shots have to turn after it; it is
// in mercy throughout, so every shot flies its whole 4 s and the paths can
// be compared to the end.
{
  const STEPS = 1500, hits = new Set([120, 121, 900]);
  const { w, g, rng } = world({ seed: 5, x: 8, z: 0, ghost: true });
  const path = (i) => ({ ...IDLE, mx: 0.3 * Math.sin(i * 0.01), mz: 0.25 * Math.cos(i * 0.017) });
  const heroes = [null], snaps = [null];
  for (let i = 1; i <= STEPS; i++) {
    const shots = stepShots(w, path(i));
    if (hits.has(i)) g.sqV -= 0.75;
    heroes.push([w.hero.x, w.hero.z]);
    snaps.push({ x: g.x, z: g.z, tell: g.tell, charge: g.s.charge, sq: g.sq, sqV: g.sqV, shots: shots.map((b) => ({ ...b })),
      live: shotsOf(w).map((b) => ({ x: b.x, z: b.z, vx: b.vx, vz: b.vz, homing: b.homing })), events: evs(w, 'gelShot') });
  }
  const { out: o, orbit } = oracle(STEPS, { x: 8, z: 0, rng, heroAt: (i) => heroes[i], hits });
  let posOk = true, tellOk = true, sqOk = true, shotOk = true, pathOk = true, nShots = 0, maxLive = 0, minSpeed = Infinity, bad = '';
  for (let i = 1; i <= STEPS; i++) {
    const a = snaps[i], e = o[i];
    if (!(near(a.x, e.x) && near(a.z, e.z))) { posOk = false; bad ||= `step ${i}: (${a.x}, ${a.z}) vs (${e.x}, ${e.z})`; }
    if (a.charge !== e.charge || a.tell !== (e.charge ? 1 : 0)) { tellOk = false; bad ||= `step ${i}: charge ${a.charge} vs ${e.charge}`; }
    if (!near(a.sq, e.sq) || !near(a.sqV, e.sqV)) { sqOk = false; bad ||= `step ${i}: sq ${a.sq}/${a.sqV} vs ${e.sq}/${e.sqV}`; }
    if (!!e.shot !== (a.shots.length === 1) || a.shots.length > 1) { shotOk = false; bad ||= `step ${i}: ${a.shots.length} shots vs ${e.shot ? 1 : 0}`; }
    if (e.shot && a.shots.length === 1) {
      nShots++;
      const b = a.shots[0];
      if (!(near(b.px, e.shot.x) && near(b.pz, e.shot.z) && near(b.speed, 7 * 0.62) && b.color === 0xff66ee && b.r === T.bullets.gelRadius && b.homing === 0
        && a.events.length === 1 && a.events[0].homing === true && a.events[0].id === g.id)) { shotOk = false; bad ||= `step ${i}: a shot's origin, speed, colour or event`; }
    }
    if (a.live.length !== e.live.length) { pathOk = false; bad ||= `step ${i}: ${a.live.length} shots live vs ${e.live.length}`; continue; }
    maxLive = Math.max(maxLive, a.live.length);
    for (let k = 0; k < a.live.length; k++) {
      const p = a.live[k], q = e.live[k];
      minSpeed = Math.min(minSpeed, Math.hypot(p.vx, p.vz));
      if (!(near(p.x, q.x, 1e-8) && near(p.z, q.z, 1e-8) && near(p.vx, q.vx, 1e-8) && near(p.vz, q.vz, 1e-8))) { pathOk = false; bad ||= `step ${i}: shot ${k} at (${p.x}, ${p.z}) vs (${q.x}, ${q.z})`; }
    }
  }
  check('25 s of flight: the orbit matches 1.x\'s frame for frame (the band, the radial, the 0.8 drift in its sign)', posOk, bad);
  check('… the charge is 1.x\'s: the last 0.5 s of the clock, read before the tick', tellOk, bad);
  check('… the squash spring is 1.x\'s non-blob one, through three hit kicks and every launch\'s −0.5', sqOk, bad);
  check('… every shot leaves on 1.x\'s step from where the move put it, at 4.34 u/s in 0xff66ee, with a homing gelShot', shotOk && nShots >= 6, `${nShots} shots; ${bad}`);
  check('… and every shot flies 1.x\'s path: the velocity lerp at 1.8 toward where the hero is now, integrated after it', pathOk && maxLive >= 1, bad);
  check('… which is not a constant-speed turn: a turning shot slows (the speed is not renormalised, bullets-graze.md §2.4)', minSpeed < 7 * 0.62 - 0.01, `${minSpeed}`);
  check('… none of them on the core\'s homing while a BOTFLY steps', snaps.every((s) => !s || s.live.every((b) => b.homing === 0)));
  check('the orbit\'s sign is the oracle\'s draw', g.s.orbit === orbit);
}

// ── the orbit: speeds, the band, the radial, the wave's scale ─────────
{
  const speedOf = (w, g) => { const x = g.x, z = g.z; step(w, IDLE); return Math.hypot(g.x - x, g.z - z) / dt; };
  const { w, g } = world({ x: 8, z: 0 });
  check('in the band (8 ± 1.5) it only drifts: 0.8 × 2.0 = 1.6 u/s round the hero', near(speedOf(w, g), 1.6, 1e-9) && near(Math.hypot(g.x, g.z), 8, 5e-3));
  const far = world({ x: 12, z: 0 }), sign = far.g.s.orbit;
  step(far.w, IDLE);
  check('beyond 9.5 it closes at the full speed on top of the drift: −2.0 in x, 1.6 in z in its sign (√(1 + 0.64) × 2 = 2.56 u/s)',
    near(far.g.x, 12 - 2.0 * dt) && near(far.g.z, -sign * 1.6 * dt) && near(Math.hypot(far.g.x - 12, far.g.z) / dt, 2 * Math.sqrt(1.64)));
  const close = world({ x: 5, z: 0 });
  step(close.w, IDLE);
  check('inside 6.5 it backs off at the full speed', near(close.g.x, 5 + 2.0 * dt));
  const edge = world({ x: 9.4, z: 0 }); step(edge.w, IDLE);
  check('at 9.4 (inside the band) there is no radial part: the drift alone, square to the hero', near(edge.g.x, 9.4, 1e-12) && near(Math.abs(edge.g.z), 1.6 * dt, 1e-12));
  const sc = waveScale(8), w8 = world({ o: { speedMult: sc.speedMult } });
  check(`at wave 8 it drifts 1.6 × ${sc.speedMult.toFixed(3)} u/s`, near(speedOf(w8.w, w8.g), 1.6 * sc.speedMult, 1e-9));
  const sw = world({ o: { affix: 'swift' } });
  check('a SWIFT one drifts × 1.35 (the core\'s api.speed)', near(speedOf(sw.w, sw.g), 1.6 * T.variants.swiftSpeed, 1e-9));
  // 1.x's spd carries a SIREN's surge (× 1.6 while _surgeT > 0, enemy.js:1699-1700): the orbit reads api.speed
  const su = world({ x: 8, z: 0 }); su.g.surgeT = 5; su.g.surgeMult = 1.6;
  check('a SIREN\'s surge drives the orbit too: 1.6 × 1.6 u/s (1.x enemy.js:1699-1700)', near(speedOf(su.w, su.g), 1.6 * 1.6, 1e-9));
  // the wave's current moves an unanchored one, at HOLDER's 0.25
  const free = world({ anchored: false, x: 8, z: 0 }), pinned = world({ x: 8, z: 0 });
  step(free.w, IDLE); step(pinned.w, IDLE);
  check('unanchored, the wave\'s current moves it too, at HOLDER\'s 0.25 of it (the core\'s swarm forces)', near(Math.hypot(free.g.x - pinned.g.x, free.g.z - pinned.g.z), T.movement.current.pincer * 0.25 * dt, 1e-4), `${Math.hypot(free.g.x - pinned.g.x, free.g.z - pinned.g.z) / dt}`);
  // 2.0's walls hold it (1.x had none: species-a.md §1.1)
  const wall = world({ hero: [0, 6], x: 0, z: 10.4 });
  run(wall.w, 120);
  check('the core keeps it inside the walls, where 1.x let it orbit off the floor', Math.abs(wall.g.z) <= wall.w.hz - wall.g.r + 1e-9 && Math.abs(wall.g.x) <= wall.w.hx - wall.g.r + 1e-9);
  // a shove still lands: the step moves it by adding, and the core adds the knock after
  const kn = world({ x: 8, z: 0 }), still = world({ x: 8, z: 0 });
  kn.g.kx = 10;
  step(kn.w, IDLE); step(still.w, IDLE);
  // the core decays the knock, then adds it to what the step moved (world.js gelStep)
  check('an outside knock (the PUSH dash) still moves it: added after the step, not thrown away', near(kn.g.x - still.g.x, 10 * Math.exp(-T.gel.knockFriction * dt) * dt, 1e-12) && near(kn.g.z, still.g.z, 1e-12));
}

// ── the clock: the first shot, the period × iM, the charge window ─────
{
  const firsts = [];
  for (let seed = 1; seed <= 30; seed++) {
    const { w, g } = world({ seed });
    const t0 = g.s.t;
    let n = 0;
    for (; n < 400; n++) { step(w, IDLE); if (evs(w, 'gelShot').length) break; }
    firsts.push((n + 1) * dt);
    if ((n + 1) !== stepsFor(t0, 3.8)) check(`seed ${seed}: the first shot on 1.x's step`, false, `${n + 1} vs ${stepsFor(t0, 3.8)}`);
  }
  const lo = Math.min(...firsts), hi = Math.max(...firsts);
  check('the first shot lands 3.3–3.8 s after arrival on every seed (the clock starts at U(0, 0.5), enemy.js:674)', lo >= 3.3 - dt - 1e-9 && hi <= 3.8 + dt + 1e-9, `${lo.toFixed(3)}..${hi.toFixed(3)}`);
  check('… and the window is used: it varies with the seed', hi - lo > 0.3, `${lo.toFixed(3)}..${hi.toFixed(3)}`);
  for (const iM of [1, waveScale(5).intervalMult, waveScale(10).intervalMult]) {
    const { w } = world({ o: { intervalMult: iM } });
    const at = [];
    for (let i = 0; i < 3000 && at.length < 5; i++) { step(w, IDLE); if (evs(w, 'gelShot').length) at.push(i); }
    const gaps = at.slice(1).map((t, k) => t - at[k]), want = stepsFor(0, 3.8 * iM);
    check(`then every 3.8 × ${iM.toFixed(3)} s, the remainder dropped: ${want} steps`, gaps.length === 4 && gaps.every((n) => n === want), `${gaps} vs ${want}`);
  }
  // the charge: on for the last 0.5 s before each shot, one run a cycle, read before the tick
  const { w, g } = world();
  let shot = 0, on = 0, runs = 0, prev = 0, onShotStep = false;
  for (let i = 0; i < 1000 && shot < 2; i++) {
    step(w, IDLE);
    if (evs(w, 'gelShot').length) { shot++; onShotStep = g.tell === 1; if (shot === 1) { on = 0; runs = 0; prev = 0; } continue; }
    if (shot === 1) { if (g.tell) on++; if (g.tell && !prev) runs++; prev = g.tell; }
  }
  const wantOn = stepsFor(0, 3.8) - stepsFor(0, 3.8 - 0.5) - 1;
  check(`between two shots the charge is on for the last 0.5 s (${wantOn} steps before the shot's), in one run`, on === wantOn && runs === 1, `${on} steps, ${runs} runs`);
  check('… and still on for the step that launches (1.x read it before the tick)', onShotStep);
  check('… and the step after a launch it is off', (step(w, IDLE), g.tell === 0 && g.s.charge === false));
  // the window is the LAST 0.5 s at any wave: 3.8 × iM − 0.5, not (3.8 − 0.5) × iM (1.x enemy.js:2683)
  {
    const iM = 0.7, f = world({ o: { intervalMult: iM } });
    let n = 0, lit = 0;
    for (let i = 0; i < 1000 && n < 2; i++) {
      step(f.w, IDLE);
      if (evs(f.w, 'gelShot').length) { n++; continue; }
      if (n === 1 && f.g.tell) lit++;
    }
    const want = stepsFor(0, 3.8 * iM) - stepsFor(0, 3.8 * iM - 0.5) - 1;
    check(`at intervalMult ${iM} the charge is still the last 0.5 s of the clock (${want} steps), not scaled with it`, lit === want, `${lit} vs ${want}`);
  }
}

// ── a run replays from its seed ──────────────────────────────────────
{
  const replay = () => {
    const { w } = world({ seed: 77, anchored: false, ghost: true });
    api.spawn(w, 'botfly', -6, 3);
    const trace = [];
    for (let i = 0; i < 900; i++) {
      step(w, { ...IDLE, mx: Math.sin(i * 0.02), mz: Math.cos(i * 0.013) });
      trace.push(w.gels.map((g) => `${g.x},${g.z},${g.sq}`).join('|'), w.bullets.map((b) => `${b.x},${b.z},${b.vx},${b.vz}`).join('|'));
    }
    return trace.join('\n');
  };
  check('two runs from one seed are the same run, step for step (w.rng only; no Math.random, no clock)', replay() === replay());
}

// ── the shot itself ──────────────────────────────────────────────────
{
  const { w, g } = world({ x: 8, z: 0, hero: [0, 0] });
  g.s.t = 3.8 - dt / 2;                         // the next step fires
  const sq0 = g.sq, x0 = g.x, z0 = g.z;
  const shots = stepShots(w);
  const b = shots[0];
  check('one bullet a shot', shots.length === 1 && g.s.shots === 1);
  check('… from where this step\'s move put it (_tick re-reads the position, enemy.js:2875), not where it began',
    near(b.px, g.x) && near(b.pz, g.z) && !(near(b.px, x0) && near(b.pz, z0)));
  check('… aimed at the hero, at 0.62 × 7 = 4.34 u/s, in 0xff66ee, a plain 0.15 gel bullet with a 4 s life',
    near(Math.atan2(b.vz, b.vx), Math.atan2(-g.z, -g.x)) && near(b.speed, 4.34) && near(Math.hypot(b.vx, b.vz), 4.34, 1e-9)
    && b.color === 0xff66ee && b.src === 'botfly' && !b.hero && !b.revenge && b.r === 0.15 && near(b.life, 4 - dt));
  check('… the clock resets to 0 (the remainder dropped)', g.s.t === 0);
  const e = evs(w, 'gelShot');
  check('… a gelShot event (1.x\'s launch zip), flagged homing', e.length === 1 && e[0].kind === 'botfly' && e[0].homing === true && near(e[0].x, b.px));
  // the −0.5 kick lands after this step's spring: at rest the spring left sqV 0, so −0.5 is what is left
  check('… and the launch kicks the squash spring −0.5, after this step\'s spring (enemy.js:2942)', near(g.sqV, -0.5) && near(g.sq, sq0));
  // standing exactly on it: 1.x's aim is (0, 0) / 1, so the shot sits still until the homing moves it
  const on = world({ x: 3, z: 2, hero: [3, 2], o: { speedMult: 0 }, ghost: true });
  on.g.s.t = 3.8 - dt / 2;
  const [still] = stepShots(on.w);
  check('standing exactly on it, the shot is launched with no velocity (1.x\'s `|| 1`, enemy.js:2937)', still && still.vx === 0 && still.vz === 0 && near(still.x, 3) && near(still.z, 2));
  step(on.w, IDLE);
  check('… and the homing leaves it there while you stay', still.vx === 0 && still.vz === 0);
  on.w.hero.x = 5; step(on.w, IDLE);
  check('… then pulls it after you once you move: 3% of 4.34 the first step', near(still.vx, 4.34 * Math.min(1, 1.8 * dt), 1e-9) && near(still.vz, 0));
}

// ── the homing: 1.x's lerp, steered once a step, outliving its BOTFLY ──
{
  // one step of 1.x's steer from (vx, vz) at (x, z) toward the hero at (hx, hz)
  const lerp = (b, hx, hz) => {
    const dx = hx - b.x, dz = hz - b.z, len = Math.hypot(dx, dz) || 1, k = Math.min(1, 1.8 * dt);
    const vx = b.vx + ((dx / len) * 4.34 - b.vx) * k, vz = b.vz + ((dz / len) * 4.34 - b.vz) * k;
    return { vx, vz, x: b.x + vx * dt, z: b.z + vz * dt };
  };
  // two BOTFLYs: a shot is steered once a step, not once per BOTFLY
  const { w, g } = world({ x: 8, z: 0, hero: [0, 0], ghost: true });
  const g2 = api.spawn(w, 'botfly', -8, 0); g2.anchored = true;
  g.s.t = 3.8 - dt / 2; g2.s.t = 0;
  const [b] = stepShots(w);
  // turn it across the hero's line so the steer has something to do
  b.vx = 0; b.vz = 4.34;
  let once = true;
  for (let i = 0; i < 20; i++) {
    const want = lerp(b, w.hero.x, w.hero.z);
    step(w, IDLE);
    if (!(near(b.vx, want.vx) && near(b.vz, want.vz) && near(b.x, want.x) && near(b.z, want.z))) once = false;
  }
  check('with two BOTFLYs up, each shot is steered by 1.x\'s lerp exactly once a step', once && b.homing === 0 && b.lerpTurn === 1.8);
  // a second shot from the other one, launched mid-list: steered the step it is launched, once
  g2.s.t = 3.8 - dt / 2;
  const before = { x: b.x, z: b.z, vx: b.vx, vz: b.vz };
  const [c] = stepShots(w);
  const wantB = lerp(before, w.hero.x, w.hero.z);
  check('… a shot launched by the later BOTFLY is steered the step it leaves, and the older one is still steered once',
    c && c.src === 'botfly' && near(b.vx, wantB.vx) && near(b.vz, wantB.vz) && near(Math.hypot(c.vx, c.vz), 4.34, 1e-9));
  // the shooter dies: the survivor keeps steering its shot with the lerp
  api.kill(w, g, 'env');
  let kept = true;
  for (let i = 0; i < 20; i++) {
    const want = lerp(b, w.hero.x, w.hero.z);
    step(w, IDLE);
    if (!(near(b.vx, want.vx) && near(b.vz, want.vz) && near(b.x, want.x))) kept = false;
  }
  check('when its BOTFLY dies a shot flies on under the lerp while another BOTFLY steps (1.x steers it for its whole 4 s)', kept && b.homing === 0 && !b.dead);
  // the last one dies: the shots are handed to the core's homing (the same 1.8, as a turn cap)
  api.kill(w, g2, 'env');
  check('when the last BOTFLY dies its shots are handed to the core\'s homing, 1.8 (nothing steps to run the lerp)',
    b.homing === 1.8 && !b.lerpTurn && c.homing === 1.8 && !c.lerpTurn);
  const sp0 = Math.hypot(b.vx, b.vz);
  step(w, IDLE);
  check('… which flies them at their full 4.34 again, turning toward you', near(Math.hypot(b.vx, b.vz), b.speed, 1e-9) && sp0 <= 4.34 + 1e-9);
  // a BOTFLY that has only just arrived counts: 1.x had no arrival phase (an
  // arrival is pushed at main.js:9436 and updated that same frame, main.js:
  // 10367-10369), and bullets.update steered every homing shot whoever fired it
  // (main.js:10428, bullet.js:124-129). So a fresh one steps, and steers, from
  // its first step, and the shot stays on 1.x's lerp
  const ap = world({ x: 8, z: 0, ghost: true });
  ap.g.s.t = 3.8 - dt / 2;
  const [d] = stepShots(ap.w);
  const fresh = api.spawn(ap.w, 'botfly', -8, 0); fresh.anchored = true;   // arrives: no opts, no appear
  api.kill(ap.w, ap.g, 'env');
  check('… and a BOTFLY that has only just arrived is a steerer: the shot stays on 1.x\'s lerp (no arrival phase in 1.x, main.js:9436, 10367-10369)',
    fresh.state === 'active' && d.lerpTurn === 1.8 && d.homing === 0);
  const fx0 = fresh.x;
  let fresh1 = true;
  for (let i = 0; i < 20; i++) {
    const want = lerp(d, ap.w.hero.x, ap.w.hero.z);
    step(ap.w, IDLE);
    if (!(near(d.vx, want.vx) && near(d.vz, want.vz) && near(d.x, want.x) && near(d.z, want.z))) fresh1 = false;
  }
  check('… steering it with the lerp, exactly once a step, from its own first step (bullet.js:196-203)',
    fresh1 && fresh.x !== fx0 && d.homing === 0 && !d.dead);
  // a body the core still holds inert (a brood waiting out its parent's death
  // pop, SIM_CONTRACT) does not step, so it cannot steer: the shot goes to the
  // core's homing rather than flying un-steered, since 1.x steered it every
  // frame of its 4 s (bullet.js:124-129). No BOTFLY is ever such a brood; this
  // holds the hand-off to what a body that steps can do
  const held = world({ x: 8, z: 0, ghost: true });
  held.g.s.t = 3.8 - dt / 2;
  const [hd] = stepShots(held.w);
  const wait = api.spawn(held.w, 'botfly', -8, 0, { child: true });
  wait.state = 'appear'; wait.t = -0.3;
  api.kill(held.w, held.g, 'env');
  check('… while a BOTFLY the core holds inert (state \'appear\') is not one: the shot goes to the core\'s homing, 1.8', hd.homing === 1.8 && !hd.lerpTurn);
  // a shot is a plain lerp toward the hero: it chases you (1.x's turnRate 1.8 closes 3% of the gap a step)
  const ch = world({ x: 8, z: 0, hero: [0, 0], ghost: true });
  ch.g.s.t = 3.8 - dt / 2;
  const [e] = stepShots(ch.w);
  ch.w.hero.x = 0; ch.w.hero.z = 4;               // the hero has stepped aside
  const v0 = { vx: e.vx, vz: e.vz };
  step(ch.w, IDLE);
  const want = lerp({ x: e.x - e.vx * dt, z: e.z - e.vz * dt, ...v0 }, 0, 4);
  check('one step of the steer is v + (t − v) · min(1, 1.8 · dt) toward where the hero is now (bullet.js:196-203)',
    near(e.vx, want.vx) && near(e.vz, want.vz));
}

// ── hits, the kill, no touch, HARDCADE ────────────────────────────────
{
  const { w, g } = world({ x: 8, z: 0 });
  const aimAt = () => { const dx = g.x - w.hero.x, dz = g.z - w.hero.z, l = Math.hypot(dx, dz) || 1; return { ...FIRE, ax: dx / l, az: dz / l }; };
  let hitAt = -1;
  for (let i = 0; i < 90 && hitAt < 0; i++) { step(w, aimAt()); if (evs(w, 'hit').some((e) => e.id === g.id)) hitAt = i; }
  check('a hero bullet hits the 0.5 circle on the floor: an ordinary hit, 2 → 1, the flash', hitAt > 0 && g.hp === 1 && near(g.flash, T.gel.flash));
  let killed = null;
  for (let i = 0; i < 90 && !killed; i++) { step(w, aimAt()); killed = evs(w, 'kill').find((e) => e.id === g.id) || null; }
  check('a second hit kills it: one kill on the streak', killed && !g.alive && w.kills === 1 && killed.kind === 'botfly' && !killed.big);
  const el = world({ x: 8, z: 0, o: { variant: 'elite' } });
  let hits = 0;
  for (let i = 0; i < 400 && el.g.alive; i++) { step(el.w, (() => { const dx = el.g.x, dz = el.g.z, l = Math.hypot(dx, dz) || 1; return { ...FIRE, ax: dx / l, az: dz / l }; })()); hits += evs(el.w, 'hit').filter((e) => e.id === el.g.id).length; }
  check('an elite takes 4', !el.g.alive && hits === 4, `${hits}`);
  // no contact damage
  const t2 = world({ hero: [8, 0], o: { speedMult: 0 } });
  const lives = t2.w.hero.lives; run(t2.w, 60);
  check('standing on it costs nothing: it is not melee in classic (1.x main.js:2408-2420)', t2.w.hero.lives === lives && !evs(t2.w, 'hurt').length);
  // HARDCADE: its corpse fires the AIMED burst — a plain one, never homing (1.x main.js:4410)
  const hc = world({ mode: 'hardcade', x: 8, z: 0 });
  hc.w.wave = 5; hc.g.hp = 1;
  for (let i = 0; i < 90 && hc.g.alive; i++) step(hc.w, (() => { const dx = hc.g.x, dz = hc.g.z, l = Math.hypot(dx, dz) || 1; return { ...FIRE, ax: dx / l, az: dz / l }; })());
  for (let i = 0; i <= Math.round(T.revenge.tell / dt); i++) step(hc.w, IDLE);   // v103: it warns first
  const rev = hc.w.bullets.filter((b) => b.revenge);
  check('in HARDCADE its corpse fires the AIMED burst of 3, not homing', !hc.g.alive && rev.length === Math.max(1, Math.round(T.revenge.aimed.count * T.revenge.density))
    && rev.every((b) => b.homing === 0 && !b.lerpTurn), `${rev.length}`);
  // a shot that hits you is spent like any gel bullet
  const hurt = world({ x: 8, z: 0, hero: [0, 0] });
  hurt.g.s.t = 3.8 - dt / 2;
  const lv = hurt.w.hero.lives;
  for (let i = 0; i < 400 && hurt.w.hero.lives === lv; i++) step(hurt.w, IDLE);
  check('a shot that reaches a hero standing still hurts, named for the BOTFLY', hurt.w.hero.lives === lv - 1 && hurt.w.killedBy === 'botfly');
}

// ── the look: the hovering ball, its wings, the squash, the charge, the death ──
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'botfly', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  look.reset(v);
  check('the look builds its own body: one gel of 1.x\'s omega family (uRadius 0.5, wobble 0.35, roughness 0.04, transmission 0.40)',
    v.own === true && matArgs[0] === 0xff55bb && matArgs[1] === 'omega' && matArgs[2] === 0.5 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.04) && near(v.mat.transmission, 0.40) && v.ball.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);
  const pos = v.ball.geometry.getAttribute('position');
  let allOn = true; for (let i = 0; i < pos.count; i++) if (!near(Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)), 0.5, 1e-6)) allOn = false;
  check('the ball is SphereGeometry(0.5, 12, 9): 13 × 10 vertices, every one 0.5 out, centred on its origin (1.x enemy.js:746)',
    pos.count === 130 && allOn && v.ball.geometry.parameters.widthSegments === 12 && v.ball.geometry.parameters.heightSegments === 9, `${pos.count}`);
  const [lw, rw] = v.wings;
  check('two wings, children of the ball: PlaneGeometry(0.62, 0.3) at (∓0.68, 0.12, 0) (1.x enemy.js:1241-1245)',
    v.wings.length === 2 && lw.parent === v.ball && rw.parent === v.ball && lw.geometry.parameters.width === 0.62 && lw.geometry.parameters.height === 0.3
    && near(lw.position.x, -0.68) && near(rw.position.x, 0.68) && lw.position.y === 0.12 && rw.position.y === 0.12 && lw.position.z === 0);
  check('… one translucent pink: MeshBasic 0xffaadd at 0.55, double-sided, no depth write (1.x enemy.js:1236-1239)',
    lw.material === rw.material && v.wingMat.color.getHex() === 0xffaadd && v.wingMat.transparent && v.wingMat.opacity === 0.55
    && v.wingMat.side === THREE.DoubleSide && v.wingMat.depthWrite === false && v.wingMat.isMeshBasicNodeMaterial);
  // 1.x's pose
  const p0 = pose(L, 0.4, 1.1);
  check('the pose: the centre at 1.5 + 0.22·sin(3·wob + phase), the left wing at 0.45 + 0.5·sin(22·wob) (1.x enemy.js:2288-2292)',
    near(p0.y, 1.5 + 0.22 * Math.sin(1.2 + 1.1)) && near(p0.flap, 0.45 + 0.5 * Math.sin(8.8)));
  let lo = Infinity, hi = -Infinity, flo = Infinity, fhi = -Infinity;
  for (let k = 0; k < 2000; k++) { const p = pose(L, k * 0.0137, 0.3); lo = Math.min(lo, p.y); hi = Math.max(hi, p.y); flo = Math.min(flo, p.flap); fhi = Math.max(fhi, p.flap); }
  check('… so it hovers 1.28–1.72 and the wings sweep −0.05 to 0.95 rad', near(lo, 1.28, 1e-3) && near(hi, 1.72, 1e-3) && near(flo, -0.05, 1e-3) && near(fhi, 0.95, 1e-3));

  // what the view does around update(): the root at the body, the squash group (1/√sq, sq, 1/√sq) about the floor
  const sync = (g, w, time, grow = 1) => {
    v.root.position.set(g.x, 0, g.z);
    v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
    look.update(v, g, w, time, grow);
    v.root.updateMatrixWorld(true);
  };
  const want = (x, y, z, sx, sy) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sx));
  const same = (m, e, eps = 1e-9) => m.elements.every((a, i) => near(a, e.elements[i], eps));
  const { w, g } = world({ x: 6, z: -2 });
  const tm = 0.7, pw = pose(L, tm + v.wob, v.bob);
  sync(g, w, tm);
  check('the ball\'s centre hovers at the pose\'s height over the body, unturned, at scale 1 (1.x enemy.js:1234, 2288)',
    same(v.ball.matrixWorld, want(6, pw.y, -2, 1, 1)));
  check('… the wings flap opposite ways about their own centres (1.x enemy.js:2291 `wi === 0 ? 1 : -1`)',
    near(lw.rotation.z, pw.flap) && near(rw.rotation.z, -pw.flap) && lw.rotation.x === 0 && lw.rotation.y === 0);
  const wp = new THREE.Vector3().setFromMatrixPosition(rw.matrixWorld);
  check('… the right wing hangs at the ball\'s side: (x + 0.68, hover + 0.12, z)', near(wp.x, 6.68) && near(wp.y, pw.y + 0.12) && near(wp.z, -2));
  g.sq = 0.7;
  sync(g, w, tm);
  check('1.x\'s squash is the ball\'s own scale (1/√sq, sq, 1/√sq), about its hovering centre (enemy.js:2732, 2779)',
    same(v.ball.matrixWorld, want(6, pw.y, -2, 1 / Math.sqrt(0.7), 0.7)));
  g.sq = 2e-3; sync(g, w, tm);
  check('… with the across-scale floored at 1/√0.1 (enemy.js:2732)', near(v.ball.scale.x, 1 / Math.sqrt(0.1)) && near(v.ball.scale.y, 2e-3));
  g.sq = 1;
  const el = world({ x: 6, z: -2, o: { variant: 'elite' } }).g;
  sync(el, w, tm);
  check('an elite is the same ball × 1.2 at the same height, wings and all', same(v.ball.matrixWorld, want(6, pw.y, -2, 1.2, 1.2)));
  sync(g, w, tm, 0.5);
  check('while it swells into being it grows up out of the floor', near(v.ball.position.y, pw.y * 0.5) && near(v.ball.scale.x, 0.5));
  // the charge flicker
  sync(g, w, tm);
  g.flash = 0; g.s.charge = true; v.mat.emissive.setScalar(0);
  look.update(v, g, w, 0.05, 1);                    // sin(1.25) > 0
  check('the charge flickers 0x661144 while sin(25t) > 0 (1.x enemy.js:2684)', v.mat.emissive.getHex() === 0x661144);
  look.update(v, g, w, 0.15, 1);                    // sin(3.75) < 0
  check('… black on the other half', v.mat.emissive.getHex() === 0x000000);
  g.flash = 0.1; v.mat.emissive.setScalar(0.6);
  look.update(v, g, w, 0.05, 1);
  check('the hit flash outranks it: the core\'s white is left alone', near(v.mat.emissive.r, 0.6) && near(v.mat.emissive.g, 0.6));
  g.flash = 0; g.affix = 'volatile'; v.mat.emissive.setHex(0x662200);
  look.update(v, g, w, 0.05, 1);
  check('… and so does a VOLATILE fuse', v.mat.emissive.getHex() === 0x662200);
  g.affix = null; g.s.charge = false; v.mat.emissive.setHex(0x123456);
  look.update(v, g, w, 0.05, 1);
  check('not charging, the look leaves the core\'s emissive alone', v.mat.emissive.getHex() === 0x123456);

  // the death: the core resets the squash group and swells the root by k about the floor;
  // 1.x swelled the ball about its centre, held where it died, the wings frozen
  g.sq = 0.8;
  sync(g, w, tm);
  const hy = v.hoverY, flap = lw.rotation.z;
  for (const dyingT of [0.27, 0.14, 0.01]) {
    const k = 1 + (1 - dyingT / T.blob.death) * T.blob.deathSwell;
    v.dyingT = dyingT; v.squash.scale.setScalar(1); v.root.scale.setScalar(k);       // what the core does (actors.js stepFx)
    v.root.updateMatrixWorld(true);
    check(`dying (${dyingT} s left): a uniform ${k.toFixed(3)} about the centre still at ${hy.toFixed(3)}, the wings where they stopped (1.x enemy.js:3013-3033)`,
      same(v.ball.matrixWorld, want(6, hy, -2, k, k)) && lw.rotation.z === flap);
  }
  v.dyingT = 0; v.root.scale.setScalar(1); g.sq = 1;
  look.reset(v);
  check('reset: a pooled view comes back unflapped at rest, with a new clock', lw.rotation.z === 0 && rw.rotation.z === 0 && v.body.scale.x === 1
    && v.ball.position.y === 1.5 && v.ball.scale.x === 1 && v.wob >= 0 && v.wob < Math.PI * 2);
  sync(g, w, tm);
  check('… and the next sync puts it back in the air', same(v.ball.matrixWorld, want(6, pose(L, tm + v.wob, v.bob).y, -2, 1, 1)));
}

if (failed) { console.log(`✗ botfly: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ botfly: ${passed} checks`);
