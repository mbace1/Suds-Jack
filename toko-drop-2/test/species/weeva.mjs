#!/usr/bin/env node
// weeva.mjs — WEEVA's own checks, in bare node: 1.x's numbers (enemy.js:581,
// 668-679, 2273-2278, 2741-2769, 2948-2957; tuning.js:43, 49, 301, 511),
// asserted against the sim stepping on its fixed 1/60 s.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=161';
import { TUNING as T } from '../../js/tuning.js?v=161';
import look from '../../js/render/looks/weeva.js?v=161';
import beh from '../../js/sim/species/weeva.js?v=161';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.weeva, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a world with nothing in it but one WEEVA (anchored: no swarm current or
// crowd, so what moves it is its own step), the hero at the origin and
// untouchable (so the run cannot end under a spiral it is standing in)
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, safe = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  const g = api.spawn(w, 'weeva', x, z, o);
  g.anchored = true;
  if (safe) w.hero.mercy = 1e9;
  return { w, g };
}
const shotsOf = (w) => w.events.filter((e) => e.type === 'gelShot' && e.kind === 'weeva');
// step once and return the bullets that were born this step
function stepNew(w, input = IDLE) {
  const before = new Set(w.bullets);
  step(w, input);
  return w.bullets.filter((b) => !before.has(b));
}
// 1.x's own frame arithmetic: steps until a clock that is bumped THEN tested
// (1.x `_t += dt; if (_t >= interval)`) first reaches `to` from `from`
const firstFire = (from, to) => { let t = from, n = 0; do { t += dt; n++; } while (!(t >= to)); return n; };
// 1.x's arm: the angle of shot k (0-based), the turn read before accel grows
function arm(n, im = 1) {
  const out = [];
  let a = S.spiralStart, acc = 0;
  for (let k = 0; k < n; k++) { out.push(a); a += (S.spiralStep + acc) / im; acc = Math.min(acc + S.spiralAccel, S.spiralAccelMax); }
  return out;
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.8, hp 3, speed 0.6 (1.x enemy.js:581)', S.radius === 0.8 && S.hp === 3 && S.speed === 0.6);
  check('CFG: body 0x4422ee, bullets 0x6644ff, every 0.16 s', S.color === 0x4422ee && S.bulletColor === 0x6644ff && S.fireInterval === 0.16);
  check('a blob dome, HOLDER, no contact damage in classic, bites FAN', S.family === 'blob' && S.role === 'HOLDER' && S.contact === false && S.revenge === 'FAN');
  check('meander 0.5 at 0.7 / 0.5 rad/s, closing at 0.45 (1.x enemy.js:2276-2277)',
    S.meander === 0.5 && S.meanderRateX === 0.7 && S.meanderRateZ === 0.5 && S.close === 0.45);
  check('body clock U(0, 2π), fire clock U(0, 0.5) (1.x enemy.js:668, 674)',
    S.clockStart[0] === 0 && near(S.clockStart[1], Math.PI * 2) && S.fireStart[0] === 0 && S.fireStart[1] === 0.5);
  check('the arm: from +x, 0.38 rad a shot, +0.002 a shot up to +0.4 (1.x enemy.js:678, 2949, 2954)',
    S.spiralStart === 0 && S.spiralStep === 0.38 && S.spiralAccel === 0.002 && S.spiralAccelMax === 0.4 && S.bulletSpeedMult === 1);
  check('the taller drill dome is 1.x\'s (tuning.js:43)', S.look.shape.x === 0.98 && S.look.shape.y === 1.02 && S.look.shape.z === 0.98);
  check('the drill vibrates 0.03 at 40 rad/s (1.x tuning.js:49)', S.look.vibrate === 0.03 && S.look.vibrateRate === 40);
  const src = readFileSync(new URL('../../js/sim/species/weeva.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the contrast floor: WEEVA is the one blob under it (1.x v246) ─────
{
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const hex = S.color, L = 0.2126 * lin(((hex >> 16) & 255) / 255) + 0.7152 * lin(((hex >> 8) & 255) / 255) + 0.0722 * lin((hex & 255) / 255);
  const C = T.material.contrast, rim = Math.max(0, Math.min(1, (C.minLum - L) / C.minLum)) * C.rim;
  check('its linear luminance is 0.0855, under the 0.16 floor', near(L, 0.0855, 5e-4), `L ${L}`);
  check('so the gel rims it at ≈1.025 and lifts its base ×1.12 (species-b.md §2.14.4)', near(rim, 1.025, 0.005) && near(C.minLum * C.lift / L, 1.124, 0.005), `rim ${rim}`);
}

// ── the walk ──────────────────────────────────────────────────────────
{
  // exactly 1.x's formula, step by step, its clock advancing after the walk
  const { w, g } = world({ seed: 4, x: 10, z: 3 });
  const c0 = g.s.clock;
  check('the body clock starts in [0, 2π)', c0 >= 0 && c0 < Math.PI * 2);
  let x = 10, z = 3, c = c0, worst = 0;
  for (let i = 0; i < 600; i++) {
    const dx = -x, dz = -z, d = Math.hypot(dx, dz) || 0.001;
    x += (Math.sin(c * 0.7) * 0.5 + (dx / d) * 0.45) * 0.6 * dt;
    z += (Math.cos(c * 0.5) * 0.5 + (dz / d) * 0.45) * 0.6 * dt;
    c += dt;
    step(w, IDLE);
    worst = Math.max(worst, Math.hypot(g.x - x, g.z - z));
  }
  check('it walks 1.x\'s meander-and-close, to the step, for 10 s', worst < 1e-9, `off by ${worst}`);
  check('its clock ran with the sim', near(g.s.clock, c0 + 600 * dt, 1e-9));

  // the close: the same pull at every range — there is no hold band
  const pulls = [1, 4, 9, 16].map((dist) => {
    const r = world({ seed: 7, x: dist, z: 0 });
    const cc = r.g.s.clock, x0 = r.g.x, z0 = r.g.z;
    step(r.w, IDLE);
    const mx = Math.sin(cc * 0.7) * 0.5 * 0.6 * dt, mz = Math.cos(cc * 0.5) * 0.5 * 0.6 * dt;
    return { px: (r.g.x - x0 - mx) / dt, pz: (r.g.z - z0 - mz) / dt };
  });
  check('at 1, 4, 9 and 16 away it closes at the same 0.27 u/s (0.45 × 0.6), straight at you',
    pulls.every((p) => near(p.px, -0.27, 1e-9) && near(p.pz, 0, 1e-9)), JSON.stringify(pulls));

  // and it keeps closing until it is on top of you
  const far = world({ seed: 2, x: 12, z: -6 });
  let closest = Infinity;
  for (let i = 0; i < 60 * 90; i++) { step(far.w, IDLE); closest = Math.min(closest, Math.hypot(far.g.x, far.g.z)); }
  check('from 13 away it comes within 0.5 of you inside 90 s (no minimum distance)', closest < 0.5, `closest ${closest}`);

  // standing on the hero: no NaN, only the meander moves it
  const on = world({ seed: 3, x: 0, z: 0 });
  const cc = on.g.s.clock;
  step(on.w, IDLE);
  check('right on top of you it only meanders, and never NaNs',
    near(on.g.x, Math.sin(cc * 0.7) * 0.5 * 0.6 * dt, 1e-12) && near(on.g.z, Math.cos(cc * 0.5) * 0.5 * 0.6 * dt, 1e-12));

  // the meander's own periods
  check('the meander repeats every 9.0 s across and 12.6 s down', near(2 * Math.PI / S.meanderRateX, 8.976, 1e-3) && near(2 * Math.PI / S.meanderRateZ, 12.566, 1e-3));

  // the wave's escalation and the SWIFT affix scale the walk (1.x enemy.js:1699)
  const a = world({ seed: 5, x: 15 }), b = world({ seed: 5, x: 15, o: { speedMult: 1.448 } }), sw = world({ seed: 5, x: 15, o: { affix: 'swift' } });
  step(a.w, IDLE); step(b.w, IDLE); step(sw.w, IDLE);
  check('the wave\'s speedMult scales the walk', near(b.g.x - 15, (a.g.x - 15) * 1.448, 1e-12) && near(b.g.z, a.g.z * 1.448, 1e-12));
  check('so does SWIFT (×1.35)', near(sw.g.x - 15, (a.g.x - 15) * T.variants.swiftSpeed, 1e-12));

  // the curbs (1.x had none; 2.0 contains everything)
  const edge = world({ seed: 6, x: 18.19, z: 0 });
  edge.w.hero.x = 30;                                  // pull it at the wall
  for (let i = 0; i < 120; i++) step(edge.w, IDLE);
  check('the arena\'s curbs hold it in', edge.g.x <= edge.w.hx - edge.g.r + 1e-12);
}

// ── the spiral ────────────────────────────────────────────────────────
function run({ seed = 3, im = 1, shots = 40, at = [6, 4], hitAt = [] } = {}) {
  const { w, g } = world({ seed, x: at[0], z: at[1], o: { intervalMult: im } });
  const t0 = g.s.t, log = [];
  for (let i = 1; log.length < shots && i < 100000; i++) {
    if (hitAt.includes(i)) api.heroBullet(w, g.x - 0.5, g.z, 0);
    // a snapshot of each new bullet as it was born (the pool keeps moving them)
    const fresh = stepNew(w).filter((b) => !b.hero && b.src === 'weeva' && !b.revenge).map((b) => ({ ...b }));
    if (fresh.length) log.push({ i, b: fresh, ev: shotsOf(w), gx: g.x, gz: g.z });
  }
  return { w, g, t0, log };
}

{
  const { t0, log } = run({ shots: 60 });
  check('the fire clock starts in [0, 0.5) s (1.x enemy.js:674)', t0 >= 0 && t0 < 0.5, `t0 ${t0}`);
  check('one bullet a shot, one gelShot event with it', log.every((e) => e.b.length === 1 && e.ev.length === 1));
  check('the first shot comes when the clock, bumped then tested, reaches 0.16 s', log[0].i === firstFire(t0, 0.16), `step ${log[0].i} want ${firstFire(t0, 0.16)}`);
  const gaps = log.slice(1).map((e, k) => e.i - log[k].i);
  check('then every 10 steps: 0.16 s rounded up to a whole step, as 1.x\'s `_t = 0` did (6 a second)',
    gaps.every((n) => n === 10) && 9 * dt < 0.16 && 10 * dt >= 0.16, `gaps ${[...new Set(gaps)]}`);
  const want = arm(60);
  const angs = log.map((e) => Math.atan2(e.b[0].vz, e.b[0].vx));
  check('the first bullet flies along +x, for every WEEVA', near(log[0].b[0].vx, 7, 1e-12) && near(log[0].b[0].vz, 0, 1e-12));
  check('the arm turns 0.38, then 0.382, 0.384 … rad a shot, clockwise on screen', angs.every((a, k) => angDiff(a, want[k]) < 1e-9),
    angs.slice(0, 4).map((a) => a.toFixed(4)).join(' '));
  check('turn 1 is 0.38, turn 2 0.382, turn 10 0.398', near(want[1] - want[0], 0.38, 1e-12) && near(want[2] - want[1], 0.382, 1e-12) && near(want[10] - want[9], 0.398, 1e-12));
  check('each bullet leaves from where the body walked to that step', log.every((e) => e.b[0].px === e.gx && e.b[0].pz === e.gz && e.ev[0].x === e.gx && e.ev[0].z === e.gz));
  check('at 7 u/s, radius 0.15, in 0x6644ff, from the weeva, not homing',
    log.every((e) => near(Math.hypot(e.b[0].vx, e.b[0].vz), 7, 1e-9) && e.b[0].r === 0.15 && e.b[0].color === 0x6644ff && e.b[0].src === 'weeva' && !e.b[0].homing && !e.b[0].revenge));
  check('the event names the angle it fired at', log.every((e, k) => e.ev[0].angle === want[k] && e.ev[0].spiral === true));
}

// the acceleration caps after 200 shots: 0.78 rad a shot from then on
{
  const { g, log } = run({ shots: 260 });
  const want = arm(260), angs = log.map((e) => Math.atan2(e.b[0].vz, e.b[0].vx));
  check('260 shots down, every angle is still 1.x\'s', angs.every((a, k) => angDiff(a, want[k]) < 1e-8));
  check('the turn has grown to 0.78 rad and stays there', near(want[220] - want[219], 0.78, 1e-9) && near(want[259] - want[258], 0.78, 1e-9) && near(want[150] - want[149], 0.38 + 0.002 * 149, 1e-9));
  check('the arm\'s accel holds at 0.4', near(g.s.accel, 0.4, 1e-12) && g.s.shots === 260);
}

// escalation: intervalMult shortens the cadence AND widens every turn (bullets-graze.md §5.3)
{
  const r10 = run({ im: 0.505, shots: 30 });
  const g10 = r10.log.slice(1).map((e, k) => e.i - r10.log[k].i);
  check('at wave 10 (intervalMult 0.505) it fires every 5 steps: 0.0808 s rounded up (12 a second)', g10.every((n) => n === 5), `${[...new Set(g10)]}`);
  const w10 = arm(30, 0.505), a10 = r10.log.map((e) => Math.atan2(e.b[0].vz, e.b[0].vx));
  check('and the arm turns 0.38 / 0.505 = 0.752 rad a shot to start', near(w10[1], 0.38 / 0.505, 1e-12) && a10.every((a, k) => angDiff(a, w10[k]) < 1e-9));
  const r26 = run({ im: 0.35, shots: 20 });
  const g26 = r26.log.slice(1).map((e, k) => e.i - r26.log[k].i);
  check('at the 0.35 floor (wave 26) every 4 steps: 0.056 s rounded up (15 a second)', g26.every((n) => n === 4), `${[...new Set(g26)]}`);
  check('the wave-10 first shot still waits for its own clock', r10.log[0].i === firstFire(r10.t0, 0.16 * 0.505));
}

// how often a fresh WEEVA fires on its very first step: its clock starts
// past 0.16 − dt about 71% of the time ("about two times in three")
{
  let first = 0;
  const n = 400;
  for (let s = 1; s <= n; s++) {
    const { w } = world({ seed: 1000 + s });
    if (stepNew(w).some((b) => b.src === 'weeva')) first++;
  }
  check('about two fresh WEEVAs in three fire on their first step', first / n > 0.62 && first / n < 0.80, `${first} of ${n}`);
}

// a hit does not touch the spiral
{
  const plain = run({ seed: 9, shots: 30 });
  const hit = run({ seed: 9, shots: 30, hitAt: [plain.log[5].i - 3, plain.log[9].i] });
  check('two hits land (2 damage)', hit.g.hp === S.hp - 2);
  check('and the shots come on the same steps at the same angles',
    hit.log.every((e, k) => e.i === plain.log[k].i && angDiff(Math.atan2(e.b[0].vz, e.b[0].vx), Math.atan2(plain.log[k].b[0].vz, plain.log[k].b[0].vx)) < 1e-12));
}

// it dies to 3 ordinary hits and leaves nothing behind
{
  const { w, g } = world({ x: 10 });
  let kills = 0, blocks = 0, big = null;
  for (let i = 0; i < 3; i++) {
    api.heroBullet(w, g.x - 0.5, g.z, 0);
    step(w, IDLE);
    const k = w.events.filter((e) => e.type === 'kill' && e.kind === 'weeva');
    kills += k.length; if (k.length) big = k[0].big;
    blocks += w.events.filter((e) => e.type === 'block').length;
  }
  check('three hero bullets kill it, none blocked', kills === 1 && blocks === 0 && !g.alive);
  check('it is a big death (r 0.8 ≥ 0.75: the shockwave)', big === true);
  check('it leaves no children', w.gels.length === 0);
  const n = w.bullets.filter((b) => !b.hero).length;
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('and its spiral stops with it', w.bullets.filter((b) => !b.hero && b.src === 'weeva').length <= n);
}

// classic: touching it does not hurt
{
  const { w, g } = world({ x: 0.3, z: 0, safe: false });
  g.s.t = -1e9;                                    // keep the arm quiet while you stand in it
  for (let i = 0; i < 60; i++) { w.hero.x = g.x; w.hero.z = g.z; step(w, IDLE); }
  check('in classic its touch is harmless', w.hero.lives === T.hero.lives);
}

// HARDCADE: it bites FAN — 5 slow bullets 0.5 rad apart about you, in deep venom
{
  const { w, g } = world({ mode: 'hardcade', x: 6, z: 8, safe: false });
  w.wave = 3;
  g.hp = 1; g.s.t = -1e9;
  api.heroBullet(w, g.x - 0.5, g.z, 0);
  let fresh = stepNew(w);
  for (let i = 0; i < 120 && w.seeds.length; i++) fresh = stepNew(w);   // v103: the corpse warns before it bites
  const bite = fresh.filter((b) => b.revenge);
  const aim = Math.atan2(0 - g.z, 0 - g.x);
  const angs = bite.map((b) => Math.atan2(b.vz, b.vx));
  check('five corpse bullets', bite.length === 5, `${bite.length}`);
  check('at −1.0, −0.5, 0, +0.5, +1.0 rad about the aim', angs.every((a, k) => angDiff(a, aim + (k - 2) * 0.5) < 1e-9));
  check('at 4.2 u/s in 0x3e00cb (species-b.md §2.12.1)', bite.every((b) => near(Math.hypot(b.vx, b.vz), 4.2, 1e-9) && b.color === 0x3e00cb), bite.map((b) => b.color.toString(16)).join(' '));
}

// determinism: the same seed, the same spiral and the same walk
{
  const a = run({ seed: 21, shots: 50 }), b = run({ seed: 21, shots: 50 });
  const sig = (r) => r.w.bullets.map((x) => `${x.x.toFixed(9)},${x.z.toFixed(9)}`).join(';') + `|${r.g.x},${r.g.z}`;
  check('a run replays from its seed', sig(a) === sig(b) && a.w.bullets.length > 0);
  const c = run({ seed: 22, shots: 50 });
  check('another seed starts its clocks elsewhere', c.t0 !== a.t0 && c.g.s.clock !== a.g.s.clock);
}

// the smoothed velocity the look turns by: 1.x's _velX/_velZ, 0.3 a step,
// of the body's OWN walk only — not the swarm forces run before it, nor the
// crowd after it (1.x enemy.js:692, 2696-2697; species-b.md §2.9)
{
  check('it smooths 0.3 a step (1.x enemy.js:2696-2697)', S.walkSmooth === 0.3);
  const orig = beh.step;
  let x0 = 0, z0 = 0, x1 = 0, z1 = 0;
  beh.step = function (w, g, dt, a) { x0 = g.x; z0 = g.z; orig.call(this, w, g, dt, a); x1 = g.x; z1 = g.z; };
  try {
    // seed 2 at wave 1: the 'stream' current, which a HOLDER rides at 0.25
    const { w, g } = world({ seed: 2, x: 9, z: -4 });
    g.anchored = false;
    check('it starts still', g.s.velX === 0 && g.s.velZ === 0);
    let ex = 0, ez = 0, worst = 0, apart = 0;
    for (let i = 0; i < 240; i++) {
      step(w, IDLE);
      ex += ((x1 - x0) / dt - ex) * 0.3; ez += ((z1 - z0) / dt - ez) * 0.3;
      worst = Math.max(worst, Math.hypot(g.s.velX - ex, g.s.velZ - ez));
      apart = Math.max(apart, Math.hypot(g.velX - g.s.velX, g.velZ - g.s.velZ));
    }
    check('it is the walk alone, smoothed 0.3 a step, for 4 s', worst < 1e-9, `off by ${worst}`);
    check('so the swarm current it rides (0.3 u/s on a HOLDER) is not in it', apart > 0.2, `apart ${apart}`);
    const top = (0.5 * Math.SQRT2 + 0.45) * 0.6;
    check(`and it never exceeds the walk's own top speed, ${top.toFixed(3)} u/s`, Math.hypot(g.s.velX, g.s.velZ) <= top + 1e-9);
  } finally { beh.step = orig; }
}

// a SIREN's surge speeds the walk ×1.6 while it lasts (1.x enemy.js:1698-1700)
{
  const a = world({ seed: 5, x: 15 }), b = world({ seed: 5, x: 15 });
  b.g.surgeT = 3; b.g.surgeMult = 1.6;
  step(a.w, IDLE); step(b.w, IDLE);
  check('a surged WEEVA walks 1.6× as far', near(b.g.x - 15, (a.g.x - 15) * 1.6, 1e-12) && near(b.g.z, a.g.z * 1.6, 1e-12));
}

// an elite (1.x main.js:9402-9406): twice the hp, 1.2× the body, the same spiral
{
  const plain = run({ seed: 13, shots: 20 });
  const { w, g } = world({ seed: 13, x: 6, z: 4, o: { variant: 'elite' } });
  check('an elite WEEVA has 6 hp and radius 0.96', g.hp === 6 && g.maxHp === 6 && near(g.r, 0.96));
  const log = [];
  for (let i = 1; log.length < 20 && i < 10000; i++) {
    const fresh = stepNew(w).filter((b) => b.src === 'weeva' && !b.hero);
    if (fresh.length) log.push({ i, a: Math.atan2(fresh[0].vz, fresh[0].vx) });
  }
  check('and fires on the same steps, at the same angles, as a plain one',
    log.every((e, k) => e.i === plain.log[k].i && angDiff(e.a, Math.atan2(plain.log[k].b[0].vz, plain.log[k].b[0].vx)) < 1e-12));
}

// a full pool: 1.x's spawnDir returns with no bullet (bullet.js:92-93) but
// the arm still turns and speeds up (enemy.js:2953-2954)
{
  const { w, g } = world({ seed: 17, x: 6, z: 4 });
  const fill = [];
  while (w.gelBullets < T.bullets.maxGel) fill.push(api.fire.emit(w, 18, -10, 0, { speedMult: 0, life: 1e9, src: 'test' }));
  const want = arm(13);
  let heard = 0, refusedShots = 0;
  for (let i = 0; g.s.shots < 12 && i < 10000; i++) {
    const before = g.s.shots;
    const fresh = stepNew(w).filter((b) => b.src === 'weeva');
    heard += shotsOf(w).length;
    if (g.s.shots > before && !fresh.length) refusedShots++;
  }
  check('twelve shots come due with the pool full: no bullet leaves, none is heard', refusedShots === 12 && heard === 0 && w.refused >= 12, `${refusedShots} refused, ${heard} heard`);
  check('but the arm has turned on twelve shots, and its accel grown', near(g.s.angle, want[12], 1e-12) && near(g.s.accel, 0.024, 1e-12));
  for (const b of fill.slice(0, 20)) b.dead = true;
  let next = null;
  for (let i = 0; !next && i < 100; i++) next = stepNew(w).find((b) => b.src === 'weeva') ?? null;
  check('when the pool frees, the next bullet leaves at the 13th angle', next && angDiff(Math.atan2(next.vz, next.vx), want[12]) < 1e-12);
}

// ── the look: 1.x's scale block (enemy.js:2732-2769) ──────────────────
{
  const node = () => ({ rotation: { set(x, y, z) { this.v = [x, y, z]; } }, scale: { set(x, y, z) { this.v = [x, y, z]; } } });
  const body = node(), mesh = node();
  const v = { S, phase: 0, vx: 0, vz: 0, yaw: 0, body, mesh, blobT: T.blob };
  const g = { r: 0.8, sq: 1, tell: 0, flash: 0, s: { velX: 0, velZ: 0, clock: 0 } };
  const B = T.blob;
  check('the blob numbers the look reads are 1.x\'s: breath 0.13 at 2.4 rad/s, drag 0.10 a u/s to 0.35, tilt 0.35 (1.x tuning.js:46, 53; enemy.js:2749)',
    B.breatheAmp === 0.13 && B.breatheHz === 2.4 && B.dragStretchPerSpeed === 0.10 && B.dragMax === 0.35 && B.rearDragTilt === 0.35
    && S.look.breatheXZ === 0.5 && S.look.dragSink === 0.25 && S.look.yawMinSpeed === 0.4 && S.look.sqFloor === 0.1);
  const lookSrc = readFileSync(new URL('../../js/render/looks/weeva.js', import.meta.url), 'utf8');
  check('the look draws no random of its own: the drill\'s phase is the body clock\'s', !/Math\.random/.test(lookSrc));
  // 1.x's own mesh scale (enemy.js:2766-2769) for a breath on the render
  // clock, the drill on the body clock, a squash and a drag
  const ref = (time, clock, sq, sp) => {
    const b = 0.13 * Math.sin(time * 2.4), jit = 0.03 * Math.sin(clock * 40), sx = 1 / Math.sqrt(Math.max(sq, 0.1));
    const drag = Math.min(sp * 0.10, 0.35), sxz = sx * (1 - b * 0.5);
    return [0.8 * 0.98 * (sxz + jit), 0.8 * 1.02 * (sq * (1 + b) - drag * 0.25 - jit), 0.8 * 0.98 * (sxz + drag)];
  };
  const same = (a, b, e = 1e-12) => a.every((x, k) => near(x, b[k], e));
  // the body group undoes the view's squash group, so what the mesh carries IS 1.x's transform
  const undone = (sq) => same(body.scale.v, [Math.sqrt(sq), 1 / sq, Math.sqrt(sq)]);

  look.update(v, g, null, 0, 1);
  check('at rest (no breath, no buzz) it is r × the drill dome: 1.57 wide, 1.39 tall',
    same(mesh.scale.v, [0.8 * 0.98, 0.8 * 1.02, 0.8 * 0.98]) && undone(1)
    && near(2 * 0.8 * 0.98, 1.568) && near(0.8 * 1.02 * 1.7, 1.387, 1e-3));
  // the vibration's crest: wider by 0.03 and shorter by 0.03, 6.4 times a second — on the BODY's clock
  const crest = Math.PI / 80;
  g.s.clock = crest;
  look.update(v, g, null, 0, 1);
  check('the drill buzz is 1.x\'s: +0.03 across, −0.03 tall at the crest of sin(40 × its own clock)', same(mesh.scale.v, ref(0, crest, 1, 0)), `${mesh.scale.v} vs ${ref(0, crest, 1, 0)}`);
  check('and the crest is 0.03, not 0.03 × the shape', near(mesh.scale.v[0] - 0.8 * 0.98, 0.8 * 0.98 * 0.03) && near(0.8 * 1.02 - mesh.scale.v[1], 0.8 * 1.02 * 0.03));
  look.update(v, g, null, 100.37, 1);
  const bAt = 0.13 * Math.sin(100.37 * 2.4);
  check('the render clock moves its breath but not its drill (1.x: sin(_wobbleT × 40), enemy.js:2762)',
    same(mesh.scale.v, ref(100.37, crest, 1, 0)) && near(mesh.scale.v[0], 0.8 * 0.98 * ((1 - bAt * 0.5) + 0.03)));
  check('it buzzes at 40 rad/s, ≈ 6.4 Hz', near(S.look.vibrateRate / (2 * Math.PI), 6.37, 0.01));
  // the sim's clock IS 1.x's _wobbleT, so the drill replays from the seed
  {
    const a = world({ seed: 31, x: 8, z: 2 }), b = world({ seed: 31, x: 8, z: 2 });
    for (let i = 0; i < 90; i++) { step(a.w, IDLE); step(b.w, IDLE); }
    check('the clock the drill reads replays from the seed', a.g.s.clock === b.g.s.clock && a.g.s.clock > 1.5);
  }
  // squashed, breathing, buzzing and dragging at once — by the sim's own-walk
  // velocity; the view's own (current and crowd included) is not read
  g.sq = 0.7; g.s.velX = 3; g.s.velZ = 0; v.vx = -40; v.vz = 25; g.s.clock = 2.2;
  const t = 0.37;
  look.update(v, g, null, t, 1);
  check('squashed, breathing, buzzing and dragging, its shape is 1.x\'s formula, squash included', same(mesh.scale.v, ref(t, 2.2, 0.7, 3)) && undone(0.7), `${mesh.scale.v} vs ${ref(t, 2.2, 0.7, 3)}`);
  const drag = Math.min(3 * 0.10, 0.35);
  check('it turns to the heading of its own walk, nose lifting with the drag, and never rolls',
    near(v.yaw, Math.atan2(3, 0)) && near(mesh.rotation.v[0], -drag * 0.35) && mesh.rotation.v[2] === 0 && mesh.rotation.v[1] === v.yaw);
  check('the body group carries no rotation of its own: 1.x\'s R·S sits on one mesh', body.rotation.v === undefined);
  g.s.velX = 0.3; const yaw = v.yaw; g.s.velZ = 0.1; look.update(v, g, null, t, 1);
  check('below 0.4 u/s it holds its heading (1.x enemy.js:2755)', v.yaw === yaw);
  // a hit's flattest squash: the width divides by 0.55, never below 1.x's 0.1 floor
  g.sq = 0.55; g.s.velX = g.s.velZ = 0; g.s.clock = 0;
  look.update(v, g, null, 0, 1);
  check('flattened to 0.55 it is 1.x\'s 1/√0.55 wide and 0.55 tall, and the group undoes the spring', same(mesh.scale.v, ref(0, 0, 0.55, 0)) && undone(0.55));
  // an elite's radius carries through
  g.sq = 1; g.r = 0.8 * T.variants.elite.radius;
  look.update(v, g, null, 0, 1);
  check('a bigger body (elite radius 0.96) scales the whole dome (1.x `r × rm`, enemy.js:2766-2769)', near(g.r, 0.96) && near(mesh.scale.v[1], 0.96 * 1.02));
  // the swell grow the view hands every look (TUNING.gel.swell)
  look.update(v, g, null, 0, 0.5);
  check('half grown it is half the dome', near(mesh.scale.v[1], 0.96 * 1.02 * 0.5));
  // a pooled view starts facing +z again (1.x `_moveYaw = 0`, enemy.js:806)
  v.yaw = 2.1; look.reset(v);
  check('a reused view faces +z, not where its last body looked', v.yaw === 0);
}

if (failed) { console.log(`✗ weeva: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ weeva: ${passed} checks`);
