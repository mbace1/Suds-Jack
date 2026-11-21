#!/usr/bin/env node
// fanner.mjs — FANNER's own checks, in bare node: 1.x's numbers (enemy.js:580,
// 674, 680-681, 712, 2259-2271, 2686-2687, 2693-2698, 2732-2769, 2904-2932;
// tuning.js:42, 50, 301, 511), asserted against the sim stepping on its fixed
// 1/60 s. The cycle is checked against an ORACLE: 1.x's own per-frame
// arithmetic for the fire clock and the tell (enemy.js:2784, 2904-2913), run
// from the same starting clock, so the steps the glows start and the fans
// leave on must match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import look from '../../js/render/looks/fanner.js?v=159';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.fanner, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const QUIET = -1e9;                       // a clock that never comes round

// A world with nothing in it but one FANNER (anchored: no swarm current or
// crowd, so what moves it is its own step), the hero at the origin and never
// running out of lives, so a long test is not cut short by the fans it is
// counting. `still` stops the strafe timer from ever flipping.
function world({ seed = 1, mode = 'arcade', x = 8, z = 0, o = {}, quiet = false, still = false, mortal = false } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  if (!mortal) w.hero.lives = 1e9;
  const g = api.spawn(w, 'fanner', x, z, o);
  g.anchored = true;
  if (quiet) g.s.t = QUIET;
  if (still) g.s.strafeT = -QUIET;
  return { w, g };
}
const shotsOf = (w) => w.events.filter((e) => e.type === 'gelShot' && e.kind === 'fanner');
const snap = (b) => ({ x: b.x, z: b.z, px: b.px, pz: b.pz, vx: b.vx, vz: b.vz, r: b.r, color: b.color, src: b.src, revenge: b.revenge, homing: b.homing });
function stepNew(w, input = IDLE) {
  const before = new Set(w.bullets);
  step(w, input);
  return w.bullets.filter((b) => !before.has(b));
}

// 1.x's fire clock and tell, frame by frame (enemy.js:2784 `_t += dt`, then
// _tick 2904-2913): which frames the glow starts on and the fan leaves on
function oracle(t0, interval, steps) {
  let t = t0, tele = false, teleT = 0;
  const starts = [], fires = [];
  for (let i = 1; i <= steps; i++) {
    t += dt;
    if (!tele && t >= interval) { t = 0; teleT = 0.4; tele = true; starts.push(i); }
    if (tele) { teleT -= dt; if (teleT <= 0) { tele = false; fires.push(i); } }
  }
  return { starts, fires };
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.75, hp 3, speed 1.4 (1.x enemy.js:580)', S.radius === 0.75 && S.hp === 3 && S.speed === 1.4);
  check('CFG: magenta body 0xff00aa, bullets 0xff66cc, every 1.5 s', S.color === 0xff00aa && S.bulletColor === 0xff66cc && S.fireInterval === 1.5);
  check('a blob dome, HOLDER, no contact damage in classic, bites FAN (1.x tuning.js:301, 511)', S.family === 'blob' && S.role === 'HOLDER' && S.contact === false && S.revenge === 'FAN');
  check('HOLDER is 1.x\'s: the current at 0.25 and nothing else (1.x tuning.js:292)',
    T.movement.roles.HOLDER.current === 0.25 && T.movement.roles.HOLDER.dodge === 0 && T.movement.roles.HOLDER.flock === 0 && T.movement.roles.HOLDER.weave === 0);
  check('holds 8 ± 1.5 and always strafes (1.x enemy.js:2260, 2267-2269)', S.hold === 8 && S.holdBand === 1.5 && S.strafe === 1);
  check('strafes +perp first, flips after 1.5 + U(0, 1) s, then every 2.5 + U(0, 1) s (1.x enemy.js:680-681, 2265)',
    S.strafeDir0 === 1 && S.strafeStart[0] === 1.5 && S.strafeStart[1] === 2.5 && S.strafeFlip[0] === 2.5 && S.strafeFlip[1] === 3.5);
  check('the fire clock starts in U(0, 0.5) (1.x enemy.js:674)', S.fireStart[0] === 0 && S.fireStart[1] === 0.5);
  check('tell 0.4 s, squash −0.8, every 3rd volley wide (1.x enemy.js:2907, 2915, 2920-2921)', S.tellTime === 0.4 && S.fireSquash === -0.8 && S.wideEvery === 3);
  check('fans: 6 over 0.6π, 9 over 0.95π, at 7 u/s (1.x enemy.js:2922-2927)',
    S.fan.n === 6 && near(S.fan.span, Math.PI * 0.6) && S.wide.n === 9 && near(S.wide.span, Math.PI * 0.95) && S.bulletSpeedMult === 1);
  check('the pancake is 1.x\'s (tuning.js:42), and agrees with the core\'s copy',
    S.look.shape.x === 1.30 && S.look.shape.y === 0.66 && S.look.shape.z === 1.08
    && ['x', 'y', 'z'].every((k) => T.blob.shapes.fanner[k] === S.look.shape[k]));
  check('it sways 0.10 rad at 7 rad/s (1.x tuning.js:50) and glows 0x440022 (1.x enemy.js:2687)',
    S.look.sway === 0.10 && S.look.swayRate === 7 && S.look.tellEmissive === 0x440022);
  check('1.x\'s velocity easing, 0.3 a step (enemy.js:2697)', S.velSmooth === 0.3);
  // the look's formula leans on the core's blob numbers: assert they are 1.x's
  check('the smear and breath the look reads are 1.x\'s: 0.10 per u/s capped 0.35, nose tilt 0.35 (tuning.js:46), breath 0.13 at 2.4 rad/s (tuning.js:53, enemy.js:2746)',
    T.blob.dragStretchPerSpeed === 0.10 && T.blob.dragMax === 0.35 && T.blob.rearDragTilt === 0.35 && T.blob.breatheAmp === 0.13 && T.blob.breatheHz === 2.4);
  check('the death screen calls it 1.x\'s "pink fanner" (main.js:5026)', S.deathLabel === 'pink fanner');
  const src = readFileSync(new URL('../../js/sim/species/fanner.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  const tun = readFileSync(new URL('../../js/tuning/species/fanner.js', import.meta.url), 'utf8');
  const lookSrc = readFileSync(new URL('../../js/render/looks/fanner.js', import.meta.url), 'utf8');
  const self = readFileSync(new URL(import.meta.url), 'utf8');
  check('every game-module import in its four files carries ?v=159 (node builtins exempt)', [src, tun, lookSrc, self].every((s) => [...s.matchAll(/from\s+'(\.\.?\/[^']+)'/g)].every((m) => m[1].endsWith('?v=159'))));
  check('the look keeps no clock of its own (it is handed the frame time; 1.x read _wobbleT)', !/Date\.now|performance\./.test(lookSrc));
}

// ── the walk: the hold band and the strafe (1.x enemy.js:2259-2271) ──
{
  const spd = S.speed;                       // speedMult 1
  // far: in AND across, not normalised — √2 × speed
  let { w, g } = world({ x: 15, z: 0, quiet: true, still: true });
  step(w, IDLE);
  // hero at the origin: u = (−1, 0), perp = (−u.z, u.x) = (0, −1)
  check('beyond 9.5 it walks in and strafes at once: (u + perp) × 1.4 × dt', near(g.x, 15 - spd * dt, 1e-12) && near(g.z, -spd * dt, 1e-12), `${g.x}, ${g.z}`);
  check('so it moves at √2 × its speed', near(Math.hypot(g.x - 15, g.z), Math.SQRT2 * spd * dt, 1e-12));

  // in the band: the strafe alone, square to the line to you
  ({ w, g } = world({ x: 8, z: 0, quiet: true, still: true }));
  step(w, IDLE);
  check('between 6.5 and 9.5 it only strafes, square to you, at its speed', g.x === 8 && near(g.z, -spd * dt, 1e-12), `${g.x}, ${g.z}`);

  // near: backs off AND strafes
  ({ w, g } = world({ x: 3, z: 4, quiet: true, still: true }));       // 5 away
  step(w, IDLE);
  const ux = -3 / 5, uz = -4 / 5, px = -uz, pz = ux;
  check('inside 6.5 it backs off and strafes: (−u + perp) × 1.4 × dt',
    near(g.x, 3 + (-ux + px) * spd * dt, 1e-12) && near(g.z, 4 + (-uz + pz) * spd * dt, 1e-12), `${g.x}, ${g.z}`);

  // the band's edges are 9.5 and 6.5, exactly
  ({ w, g } = world({ x: 9.5, z: 0, quiet: true, still: true })); step(w, IDLE);
  check('at exactly 9.5 it does not walk in', g.x === 9.5);
  ({ w, g } = world({ x: 6.5, z: 0, quiet: true, still: true })); step(w, IDLE);
  check('at exactly 6.5 it does not back off', g.x === 6.5);

  // far away it comes in to the band and circles you there
  ({ w, g } = world({ x: 17, z: 9, quiet: true }));
  let inside = false, stayed = true;
  for (let i = 0; i < 1200; i++) {
    step(w, IDLE);
    const d = Math.hypot(g.x, g.z);
    if (d <= 9.5) inside = true;
    if (inside && (d > 9.5 + Math.SQRT2 * spd * dt || d < 6.5)) stayed = false;
  }
  check('from far off it comes into the band and stays in it, circling', inside && stayed, `d ${Math.hypot(g.x, g.z)}`);

  // the strafe flips on its timer: first after 1.5-2.5 s, then every 2.5-3.5 s
  ({ w, g } = world({ seed: 11, x: 8, z: 0, quiet: true }));
  const t0 = g.s.strafeT;
  let dir = g.s.strafeDir, flips = [], cross = [], onTime = true;
  for (let i = 1; i <= 60 * 30; i++) {
    const timer = g.s.strafeT, ox = g.x, oz = g.z;
    step(w, IDLE);
    if (g.s.strafeDir !== dir) { flips.push(i); dir = g.s.strafeDir; if (!(timer - dt <= 0)) onTime = false; }
    else if (timer - dt <= 0) onTime = false;
    cross.push(Math.sign(ox * (g.z - oz) - oz * (g.x - ox)));   // which way round you it went this step
  }
  check('the first strafe timer is 1.5 + U(0, 1) s (1.x enemy.js:681)', t0 >= 1.5 && t0 < 2.5, `${t0}`);
  check('every FANNER starts strafing +perp', world({ seed: 99, quiet: true }).g.s.strafeDir === 1);
  check('the strafe flips exactly when its timer runs out', onTime && flips.length >= 8, `${flips.length} flips`);
  check('the first flip comes at the first timer', Math.abs(flips[0] * dt - t0) <= dt + 1e-9, `${flips[0] * dt} vs ${t0}`);
  const gaps = flips.slice(1).map((f, k) => (f - flips[k]) * dt);
  check('then every 2.5-3.5 s (1.x enemy.js:2265)', gaps.every((s) => s >= 2.5 - 1e-9 && s <= 3.5 + dt + 1e-9), gaps.map((s) => s.toFixed(3)).join(' '));
  check('and the timers are not all the same (U(0, 1) each time)', new Set(gaps.map((s) => s.toFixed(4))).size > 3);
  check('each flip turns it round you the other way',
    flips.every((f) => cross[f - 2] !== 0 && cross[f - 1] !== 0 && cross[f - 2] === -cross[f - 1]), flips.map((f) => `${cross[f - 2]}→${cross[f - 1]}`).join(' '));

  // the wave's escalation and SWIFT scale the walk (1.x enemy.js:1699)
  ({ w, g } = world({ x: 8, quiet: true, still: true, o: { speedMult: 1.448 } }));
  step(w, IDLE);
  check('the wave\'s speedMult scales the walk', near(-g.z, spd * 1.448 * dt, 1e-12));
  ({ w, g } = world({ x: 8, quiet: true, still: true, o: { affix: 'swift' } }));
  g.anchored = true;
  step(w, IDLE);
  check('so does SWIFT (×1.35)', near(-g.z, spd * T.variants.swiftSpeed * dt, 1e-12));

  // 2.0's curbs: strafing into one it slides along it (1.x had none)
  ({ w, g } = world({ x: 0, z: 0, quiet: true, still: true }));
  const edge = w.hz - g.r;
  g.z = -edge; w.hero.x = 8; w.hero.z = -edge;            // you beside it on the top curb: perp is ±z
  g.s.strafeDir = -1;                                     // strafing into the curb
  for (let i = 0; i < 90; i++) step(w, IDLE);
  check('strafing into the curb it is held on it', g.z === -edge && g.x === 0, `${g.x}, ${g.z}`);

  // its own velocity (1.x _velX, enemy.js:2693-2698)
  ({ w, g } = world({ x: 8, z: 0, quiet: true, still: true }));
  step(w, IDLE);
  check('its own velocity is this step\'s walk, eased 0.3 a step', near(g.s.velZ, -spd * 0.3, 1e-12) && g.s.velX === 0, `${g.s.velX}, ${g.s.velZ}`);
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('strafing, it settles on the strafe speed', near(Math.hypot(g.s.velX, g.s.velZ), spd, 1e-3), `${Math.hypot(g.s.velX, g.s.velZ)}`);
  // the swarm's current is not its own walk (not anchored this time)
  const { w: w2, g: g2 } = world({ x: 8, z: 0, quiet: true, still: true });
  g2.anchored = false;
  step(w2, IDLE);
  const moved = Math.hypot(g2.x - 8, g2.z) / dt;
  check('the wave\'s current moves it but is not in its own velocity (the strafe alone: 1.4 u/s, eased 0.3)',
    !near(moved, spd, 1e-3) && near(Math.hypot(g2.s.velX, g2.s.velZ), spd * 0.3, 1e-12), `moved ${moved}, own ${Math.hypot(g2.s.velX, g2.s.velZ)}`);
}

// ── the glow-and-fan cycle ────────────────────────────────────────────
function cycle({ seed = 3, im = 1, at = [8, 0], hitAt = -1, steps = 900 } = {}) {
  const { w, g } = world({ seed, x: at[0], z: at[1], o: { intervalMult: im } });
  const t0 = g.s.t, log = [];
  for (let i = 1; i <= steps && g.alive; i++) {
    const pre = { x: g.x, z: g.z, tele: g.s.tele };
    if (i === hitAt) api.heroBullet(w, g.x - 0.5, g.z, 0);
    const born = stepNew(w, IDLE).filter((b) => !b.hero);
    const ev = shotsOf(w)[0] || null;
    log.push({ i, pre, tell: g.tell, startedTell: !pre.tele && g.s.tele, ended: pre.tele && !g.s.tele, ev, x: g.x, z: g.z, sqV: g.sqV, hp: g.hp,
      fan: ev ? born.map(snap) : null, hx: w.hero.x, hz: w.hero.z });
  }
  return { w, g, t0, log };
}

{
  const { t0, log } = cycle({ steps: 1000 });
  check('the fire clock starts in [0, 0.5) s (1.x enemy.js:674)', t0 >= 0 && t0 < 0.5, `t0 ${t0}`);
  const starts = log.filter((e) => e.startedTell).map((e) => e.i), fires = log.filter((e) => e.ev).map((e) => e.i);
  const o = oracle(t0, S.fireInterval, log.length);
  check('it glows and fans, over and over (10 times in 16.7 s)', starts.length >= 10 && fires.length >= 10, `${starts.length} glows, ${fires.length} fans`);
  check('every glow starts on 1.x\'s frame', starts.join() === o.starts.join(), `${starts.slice(0, 6)} vs 1.x ${o.starts.slice(0, 6)}`);
  check('every fan leaves on 1.x\'s frame', fires.join() === o.fires.join(), `${fires.slice(0, 6)} vs 1.x ${o.fires.slice(0, 6)}`);
  check('the first glow starts 1.5 s less the starting clock in', Math.abs(starts[0] * dt - (1.5 - t0)) <= dt, `${starts[0] * dt} vs ${1.5 - t0}`);
  check('the glow lasts 0.4 s, to the step', fires.every((f, k) => Math.abs((f - starts[k]) * dt - 0.4) <= dt + 1e-9), `${fires.map((f, k) => f - starts[k])}`);
  const gaps = starts.slice(1).map((s, k) => s - starts[k]);
  check('glow start to glow start is the interval, 1.5 s (the clock counts through the glow), not 1.9',
    gaps.every((n) => Math.abs(n * dt - 1.5) <= dt), `gaps ${gaps}`);

  // the volleys: 6, 6, 9, 6, 6, 9, …
  const fans = log.filter((e) => e.ev);
  check('volleys go 6, 6, 9 and round again (1.x enemy.js:2920-2924)',
    fans.every((e, k) => e.ev.n === ((k + 1) % 3 === 0 ? 9 : 6) && e.fan.length === e.ev.n && e.ev.wide === ((k + 1) % 3 === 0)),
    fans.map((e) => e.fan.length).join(' '));

  // the glow the look draws
  const s0 = starts[0], f0 = fires[0];
  const tells = log.filter((e) => e.i >= s0 && e.i <= f0).map((e) => e.tell);
  check('no glow on the step the tell starts (1.x reads the flag before the tick)', tells[0] === 0);
  check('then it glows every step of the tell, its progress climbing linearly', tells.slice(1).every((v, k) => near(v, (k + 1) * dt / S.tellTime, 1e-9)), tells.slice(0, 4).join(' '));
  check('still glowing on the step it fires, gone the step after', tells[tells.length - 1] > 0.95 && log.find((e) => e.i === f0 + 1).tell === 0);
  check('the glow is 0.4 s of steps long', log.filter((e) => e.i > s0 && e.i <= f0 && e.tell > 0).length === f0 - s0);
  check('between tells there is no glow', log.filter((e) => e.i > f0 && e.i < starts[1]).every((e) => e.tell === 0));

  // a normal fan
  const n0 = fans[0], ox = n0.ev.x, oz = n0.ev.z, aim = Math.atan2(n0.hz - oz, n0.hx - ox);
  check('the fan leaves from where it stands this step', n0.fan.every((b) => near(b.px, ox, 1e-12) && near(b.pz, oz, 1e-12)) && near(n0.x, ox) && near(n0.z, oz));
  check('and has already flown its first step (bullets move the step they are fired, 1.x main.js:10428)',
    n0.fan.every((b) => near(Math.hypot(b.x - b.px, b.z - b.pz), 7 * dt, 1e-9)));
  const nang = n0.fan.map((b) => Math.atan2(b.vz, b.vx));
  check('6 bullets, aim − 0.3π + j × 0.12π: 108° wide, 21.6° apart', nang.every((a, j) => angDiff(a, aim - 0.3 * Math.PI + j * 0.12 * Math.PI) < 1e-9),
    nang.map((a) => ((a - aim) * 180 / Math.PI).toFixed(1)).join(' '));
  check('with NO centre bullet: the nearest two straddle the aim at ±10.8°',
    near(Math.min(...nang.map((a) => angDiff(a, aim))), 0.06 * Math.PI, 1e-9) && nang.filter((a) => near(angDiff(a, aim), 0.06 * Math.PI, 1e-9)).length === 2);
  check('the event carries the aim and the count', near(n0.ev.angle, aim, 1e-12) && n0.ev.n === 6 && n0.ev.wide === false);
  check('at 7 u/s, radius 0.15, in 0xff66cc, from the fanner',
    n0.fan.every((b) => near(Math.hypot(b.vx, b.vz), 7, 1e-9) && b.r === 0.15 && b.color === 0xff66cc && b.src === 'fanner' && !b.revenge && !b.homing));
  check('and flattens it: a −0.8 kick to the squash spring', n0.sqV < -0.79 && n0.sqV > -0.81, `sqV ${n0.sqV}`);

  // the wide fan
  const w0 = fans[2], wx = w0.ev.x, wz = w0.ev.z, waim = Math.atan2(w0.hz - wz, w0.hx - wx);
  const wang = w0.fan.map((b) => Math.atan2(b.vz, b.vx));
  check('the 3rd: 9 bullets, aim − 0.475π + j × 0.11875π: 171° wide, 21.375° apart',
    wang.every((a, j) => angDiff(a, waim - 0.475 * Math.PI + j * 0.11875 * Math.PI) < 1e-9), wang.map((a) => ((a - waim) * 180 / Math.PI).toFixed(2)).join(' '));
  check('its 5th flies straight at you', angDiff(wang[4], waim) < 1e-9);
  check('it squashes the same', w0.sqV < -0.79 && w0.sqV > -0.81);
  check('the 6th volley is wide too, the 4th and 5th are not', fans[5].ev.wide && !fans[3].ev.wide && !fans[4].ev.wide);
}

// the fan leaves from where it has walked to this step (1.x _tick re-reads its position)
{
  const { w, g } = world({ seed: 7, x: 8, z: 0 });
  g.s.strafeT = -QUIET;
  let got = null;
  for (let i = 0; i < 400 && !got; i++) {
    const px = g.x, pz = g.z;
    step(w, IDLE);
    const ev = shotsOf(w)[0];
    if (ev) got = { px, pz, ev, x: g.x, z: g.z };
  }
  check('strafing, the fan leaves from this step\'s walked spot, not last step\'s',
    got && got.ev.x === got.x && got.ev.z === got.z && near(Math.hypot(got.x - got.px, got.z - got.pz), S.speed * dt, 1e-12),
    got && `${got.ev.x},${got.ev.z} vs ${got.px},${got.pz}`);
}

// it aims where you are NOW
{
  const { w, g } = world({ seed: 5, x: 8, z: 0 });
  let fired = null;
  for (let i = 0; i < 400 && !fired; i++) {
    if (g.s.tele) { w.hero.x = 0; w.hero.z = 3; }        // you step aside during the glow
    step(w, IDLE);
    if (shotsOf(w).length) fired = { ev: shotsOf(w)[0], x: g.x, z: g.z };
  }
  check('the aim is taken as it fans, not as the glow starts', fired && angDiff(fired.ev.angle, Math.atan2(3 - fired.z, 0 - fired.x)) < 1e-9);
}

// standing exactly on it: the squash, but no volley, and the count does not move
{
  const { w, g } = world({ seed: 6, x: 0, z: 0 });
  let empty = null;
  for (let i = 0; i < 200 && !empty; i++) {
    const tele = g.s.tele;
    step(w, IDLE);
    if (tele && !g.s.tele) empty = { sqV: g.sqV, shot: g.s.shot, bullets: w.bullets.length, ev: shotsOf(w).length };
  }
  check('with you right on it, the glow ends in a squash and no bullets (1.x enemy.js:2918 `len > 0`)',
    empty && empty.bullets === 0 && empty.ev === 0 && empty.sqV < -0.79, JSON.stringify(empty));
  check('and the volley count does not move', empty && empty.shot === 0);
  w.hero.x = -8; w.hero.z = 0;                          // you step off it
  const ns = [];
  for (let i = 0; i < 400 && ns.length < 3; i++) { step(w, IDLE); for (const e of shotsOf(w)) ns.push(e.n); }
  check('so the next three volleys are still 6, 6, 9', ns.join() === '6,6,9', ns.join());
}

// 1.x's code fact (species-b.md §4.4): at its hold range the 6-fan misses a
// hero who stands still; only the wide fan's centre bullet is aimed
{
  const { w, g } = world({ seed: 12, x: 8, z: 0 });
  const tag = new Map();
  let hits = 0, byWide = 0, byNormal = 0, lives = w.hero.lives, volleys = 0;
  for (let i = 0; i < 60 * 30; i++) {
    const born = stepNew(w, IDLE).filter((b) => !b.hero);
    const ev = shotsOf(w)[0];
    if (ev) { volleys++; for (const b of born) tag.set(b, ev.wide); }
    if (w.hero.lives < lives) {
      lives = w.hero.lives; hits++;
      for (const [b, wide] of tag) if (b.dead && Math.hypot(b.x - w.hero.x, b.z - w.hero.z) < b.r + T.hero.hitRadius + 0.2) { if (wide) byWide++; else byNormal++; tag.delete(b); }
    }
    for (const [b] of tag) if (b.dead) tag.delete(b);
  }
  check('a still hero at its hold range is hit, over and over', hits >= 5 && volleys >= 18, `${hits} hits in ${volleys} volleys`);
  check('only ever by the wide fan (its centre bullet); the 6-fan\'s inner pair passes either side', byWide === hits && byNormal === 0, `wide ${byWide}, normal ${byNormal}`);
  // close in (inside ≈ 3.5) the 6-fan's inner pair does catch a still hero
  const c = world({ seed: 12, x: 1.5, z: 0 });
  c.g.s.t = 1.5; c.g.s.shot = 0;                        // the next glow starts now: a NORMAL volley, ~2.4 away when it lands
  let closeHit = false, firstN = 0;
  for (let i = 0; i < 90 && !closeHit; i++) {
    step(c.w, IDLE);
    const ev = shotsOf(c.w)[0]; if (ev && !firstN) firstN = ev.n;
    if (c.w.hero.lives < 1e9) closeHit = true;
  }
  check('close in, the 6-fan\'s inner pair does catch you (it misses beyond ≈ 3.5 u)', firstN === 6 && closeHit);
}

// escalation: the wave's intervalMult shortens the cycle; the glow does not
{
  const { t0, log } = cycle({ im: 0.505, steps: 600 });
  const starts = log.filter((e) => e.startedTell).map((e) => e.i), fires = log.filter((e) => e.ev).map((e) => e.i);
  const o = oracle(t0, S.fireInterval * 0.505, log.length);
  check('at wave 10 (intervalMult 0.505) it glows every 0.758 s, on 1.x\'s frames', starts.length >= 12 && starts.join() === o.starts.join() && fires.join() === o.fires.join(),
    `${starts.slice(0, 5)} vs ${o.starts.slice(0, 5)}`);
  check('and the glow is still 0.4 s', fires.every((f, k) => Math.abs((f - starts[k]) * dt - 0.4) <= dt + 1e-9));
  // at the floor (0.35, wave 26+) the period, 0.525 s, still holds the whole 0.4 s glow
  const fl = cycle({ im: 0.35, steps: 400 });
  const o2 = oracle(fl.t0, S.fireInterval * 0.35, fl.log.length);
  check('at the 0.35 floor too', fl.log.filter((e) => e.ev).map((e) => e.i).join() === o2.fires.join() && o2.fires.length >= 12);
}

// a hit does not interrupt the glow
{
  const plain = cycle({ seed: 9, steps: 300 });
  const s0 = plain.log.find((e) => e.startedTell).i, f0 = plain.log.find((e) => e.ev).i;
  const hit = cycle({ seed: 9, steps: 300, hitAt: s0 + 5 });
  check('a hit mid-glow lands (1 damage)', hit.g.hp === S.hp - 1);
  check('and the fan comes on the same step', hit.log.find((e) => e.ev)?.i === f0);
}

// it dies to 3 ordinary hits and leaves nothing behind
{
  const { w, g } = world({ x: 8, quiet: true, still: true });
  let kills = 0, blocks = 0;
  for (let i = 0; i < 3; i++) {
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    kills += w.events.filter((e) => e.type === 'kill' && e.kind === 'fanner').length;
    blocks += w.events.filter((e) => e.type === 'block').length;
  }
  check('three hero bullets kill it, none blocked', kills === 1 && blocks === 0 && !g.alive);
  check('it leaves no children and nothing on the floor', w.gels.length === 0 && w.hazards.length === 0 && w.lobs.length === 0);
  const { w: w2, g: g2 } = world({ x: 8, quiet: true, still: true });
  g2.hp = 1; api.heroBullet(w2, g2.x - 0.5, g2.z, 0); step(w2, IDLE);
  const k = w2.events.find((e) => e.type === 'kill');
  check('its kill event is big (0.75 qualifies, 1.x main.js:4495), in its colour', k && k.big && k.color === 0xff00aa && k.r === 0.75);
  check('a dead FANNER fires nothing in ARCADE', w2.bullets.filter((b) => !b.hero).length === 0);
}

// classic: touching it does not hurt
{
  const { w, g } = world({ x: 0.3, z: 0, quiet: true, mortal: true });
  for (let i = 0; i < 60; i++) { w.hero.x = g.x; w.hero.z = g.z; step(w, IDLE); }
  check('in classic its touch is harmless', w.hero.lives === T.hero.lives);
}

// HARDCADE: it bites FAN — 5 slow bullets 0.5 rad apart at you, in deep venom
{
  const { w, g } = world({ mode: 'hardcade', x: 6, z: 4, quiet: true, still: true });
  w.wave = 3;
  g.hp = 1;
  api.heroBullet(w, g.x - 0.5, g.z, 0);
  step(w, IDLE);
  for (let i = 0; i < 120 && w.seeds.length; i++) step(w, IDLE);   // v103: the corpse warns before it bites
  const bite = w.bullets.filter((b) => b.revenge);
  const aim = Math.atan2(0 - g.z, 0 - g.x);
  const angs = bite.map((b) => Math.atan2(b.vz, b.vx));
  const n = Math.max(1, Math.round(T.revenge.fan.count * T.revenge.density));
  check(`${n} corpse bullets (1.x: 5, at density ${T.revenge.density})`, bite.length === n && T.revenge.fan.count === 5, `${bite.length}`);
  check('at 0.5 rad steps about the aim (≈115° at 5)', angs.every((a, k) => angDiff(a, aim + (k - (n - 1) / 2) * 0.5) < 1e-9));
  check('at 4.2 u/s in 0xcb009b', bite.every((b) => near(Math.hypot(b.vx, b.vz), 4.2, 1e-9) && b.color === 0xcb009b), bite.map((b) => b.color.toString(16)).join(' '));
  const { w: w2, g: g2 } = world({ mode: 'hardcade', x: 6, z: 4, quiet: true, still: true });
  w2.wave = 2; g2.hp = 1; api.heroBullet(w2, g2.x - 0.5, g2.z, 0); step(w2, IDLE);
  check('and not before wave 3', w2.bullets.filter((b) => b.revenge).length === 0);
}

// determinism: the same seed, the same fans
{
  const a = cycle({ seed: 21, steps: 600 }), b = cycle({ seed: 21, steps: 600 });
  const sig = (r) => r.w.bullets.map((x) => `${x.x.toFixed(9)},${x.z.toFixed(9)}`).join(';') + `|${r.g.x},${r.g.z}|${r.g.s.strafeT}`;
  check('a run replays from its seed', sig(a) === sig(b) && a.w.bullets.length > 0);
  const c = cycle({ seed: 22, steps: 600 });
  check('another seed starts its clocks elsewhere', c.t0 !== a.t0 && c.g.s.strafeT !== a.g.s.strafeT);
}

// ── the look: 1.x's scale block (enemy.js:2732-2769) ──────────────────
{
  // a stand-in three: just enough Object3D for build() and update()
  class O3 {
    constructor() { this.children = []; this.scale = { set(x, y, z) { this.v = [x, y, z]; }, v: [1, 1, 1] }; this.rotation = { set(x, y, z) { this.v = [x, y, z]; }, v: [0, 0, 0] }; }
    add(c) { this.children.push(c); }
  }
  class Mesh extends O3 { constructor(geo, mat) { super(); this.geo = geo; this.mat = mat; } }
  const emissive = { hex: -1, setHex(h) { this.hex = h; return this; } };
  const ctx = { THREE: { Group: O3, Mesh }, geo: { blob: 'dome' }, T, S, gelMaterial: (hex, fam, r) => ({ hex, fam, r, emissive }) };
  const built = look.build(ctx);
  check('build: one gel dome in its colour, blob family, unit radius (1.x makeSatinMat(color, \'blob\', 1))',
    built.mesh.geo === 'dome' && built.mat.hex === 0xff00aa && built.mat.fam === 'blob' && built.mat.r === 1 && built.own === true && built.body.children[0] === built.mesh);
  check('each view sways on its own phase', typeof built.swayPhase === 'number' && built.swayPhase >= 0 && built.swayPhase < Math.PI * 2);
  const v = { S, phase: 0, ...built, swayPhase: 0 };
  const sh = S.look.shape, B = T.blob;
  const squash = (sq) => [1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)];
  const world3 = (sq) => { const a = squash(sq), b = v.body.scale.v; return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; };
  const g = { r: 0.75, sq: 1, tell: 0, flash: 0, s: { velX: 0, velZ: 0 } };

  look.update(v, g, null, 0, 1);            // at rest, mid-breath zero, mid-sway zero (time 0, phases 0)
  check('at rest it is r × the pancake: 1.95 wide, 0.84 tall over the dome\'s 1.7, 1.62 long',
    near(v.mesh.scale.v[0], 0.75 * sh.x) && near(v.mesh.scale.v[1], 0.75 * sh.y) && near(v.mesh.scale.v[2], 0.75 * sh.z));
  check('it faces +z until it first walks (1.x _moveYaw = 0), level', v.yaw === 0 && v.mesh.rotation.v.every((x) => x === 0));

  // the sway: 0.10 sin(7 t) about its own long axis, always
  const tq = Math.PI / 14;                  // a quarter of the 7 rad/s sway
  look.update(v, g, null, tq, 1);
  check('the sway rolls it 0.10 rad at the top of the swing (rotation.z, 1.x enemy.js:2765)', near(v.mesh.rotation.v[2], 0.10, 1e-12) && v.mesh.rotation.v[0] === 0);
  look.update(v, g, null, 3 * tq, 1);
  check('and −0.10 at the other end: a 7 rad/s (≈ 1.1 Hz) rock', near(v.mesh.rotation.v[2], -0.10, 1e-12));
  let maxRock = 0;
  for (let t = 0; t < 3; t += 0.01) { look.update(v, g, null, t, 1); maxRock = Math.max(maxRock, Math.abs(v.mesh.rotation.v[2])); }
  check('never more than 0.10 rad', maxRock <= 0.10 + 1e-12 && maxRock > 0.099);
  const v2 = { ...v, swayPhase: 1.1 }; look.update(v2, g, null, 0, 1);
  check('a view\'s own phase shifts its swing', near(v2.mesh.rotation.v[2], 0.10 * Math.sin(1.1), 1e-12));

  g.tell = 1; emissive.hex = -1; look.update(v, g, null, 0, 1);
  check('the tell does not swell it (1.x inflates SPITTOR only)', near(v.mesh.scale.v[0], 0.75 * sh.x) && near(v.mesh.scale.v[1], 0.75 * sh.y) && near(v.mesh.scale.v[2], 0.75 * sh.z));
  check('it glows 0x440022, dark magenta', emissive.hex === 0x440022);
  emissive.hex = -1; g.tell = 0.02; look.update(v, g, null, 0, 1);
  check('from the tell\'s first glowing step, at full strength (1.x sets it flat)', emissive.hex === 0x440022);
  emissive.hex = -1; g.flash = 0.1; g.tell = 1; look.update(v, g, null, 0, 1);
  check('the hit flash outranks the tell glow', emissive.hex === -1);
  emissive.hex = -1; g.flash = 0; g.tell = 1; g.affix = 'volatile'; look.update(v, g, null, 0, 1);
  check('a VOLATILE fuse outranks the tell too (1.x enemy.js:2653-2656 before 2686)', emissive.hex === -1);
  g.affix = null;
  emissive.hex = -1; g.flash = 0; g.tell = 0; look.update(v, g, null, 0, 1);
  check('no tell, no glow of its own', emissive.hex === -1);

  // squashed, breathing and dragging: the mesh carries 1.x's whole scale, and
  // the body group undoes the squash group exactly
  g.sq = 0.7; g.s.velX = 0; g.s.velZ = -1.4;
  const time = 0.37, b = B.breatheAmp * Math.sin(time * B.breatheHz);
  look.update(v, g, null, time, 1);
  const sx = 1 / Math.sqrt(0.7), drag = Math.min(1.4 * B.dragStretchPerSpeed, B.dragMax);
  const want = [0.75 * sh.x * sx * (1 - b * 0.5), 0.75 * sh.y * (0.7 * (1 + b) - drag * 0.25), 0.75 * sh.z * (sx * (1 - b * 0.5) + drag)];
  check('squashed, breathing and dragging, its shape is 1.x\'s formula', v.mesh.scale.v.every((x, k) => near(x, want[k], 1e-12)), `${v.mesh.scale.v} vs ${want}`);
  check('the body group cancels the squash group, so the mesh\'s scale is the whole story', world3(0.7).every((x) => near(x, 1, 1e-12)), `${world3(0.7)}`);
  check('it turns to its heading, nose lifting with the drag, still rocking (1.x rotation (−0.35 drag, yaw, rock))',
    near(v.yaw, Math.atan2(0, -1.4)) && near(v.mesh.rotation.v[0], -drag * B.rearDragTilt) && near(v.mesh.rotation.v[1], v.yaw) && near(v.mesh.rotation.v[2], 0.10 * Math.sin(7 * time), 1e-12));
  g.s.velZ = -10; look.update(v, g, null, time, 1);
  check('the smear caps at 0.35', near(v.mesh.scale.v[2], 0.75 * sh.z * (sx * (1 - b * 0.5) + 0.35)));
  g.s.velX = 0.3; g.s.velZ = 0.1; const yaw = v.yaw; look.update(v, g, null, time, 1);
  check('below 0.4 u/s it holds its heading', v.yaw === yaw);
  g.sq = 1; g.s.velX = g.s.velZ = 0; g.r = 0.75 * 1.2; look.update(v, g, null, 0, 0.5);
  check('the radius it is drawn at is the body\'s own (elite × 1.2) × the view\'s swell grow (TUNING.gel.swell)', near(v.mesh.scale.v[0], 0.75 * 1.2 * 0.5 * sh.x));
  v.yaw = 2; look.reset(v);
  check('reset: a reused view faces +z again', v.yaw === 0);

  // in the sim: strafing in its band it turns side-on to you and holds there
  const { w, g: gg } = world({ seed: 4, x: 8, z: 0, quiet: true, still: true });
  const vv = { S, phase: 0, ...look.build(ctx) };
  for (let i = 0; i < 60; i++) { step(w, IDLE); look.update(vv, gg, w, i * dt, 1); }
  const toHero = Math.atan2(0 - gg.x, 0 - gg.z);       // the yaw that would face you
  check('a strafing FANNER faces along its strafe, square to you', Math.abs(angDiff(vv.yaw, toHero) - Math.PI / 2) < 0.05, `${vv.yaw} vs ${toHero}`);
}

if (failed) { console.log(`✗ fanner: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ fanner: ${passed} checks`);
