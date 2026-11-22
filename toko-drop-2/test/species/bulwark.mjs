#!/usr/bin/env node
// bulwark.mjs — BULWARK's own checks, in bare node: 1.x's numbers (enemy.js:
// 596, 644-648, 668, 1149-1158, 1682, 1697-1698, 1793-1817, 3010; main.js:
// 1349-1394, 2410-2421, 9402-9416, 10636-10720; tuning.js:39-44, 307,
// 496-497), asserted against the sim stepping on its fixed 1/60 s, and the
// look against real three.
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=162';
import { TUNING as T } from '../../js/tuning.js?v=162';
import look from '../../js/render/looks/bulwark.js?v=162';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const DEG = Math.PI / 180;

const S = T.species.bulwark, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a world with nothing in it but what a check puts there; the hero at the origin
function world({ seed = 1, mode = 'arcade', dashMode = 'pass' } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  return w;
}
// a body where it is put: anchored (no swarm forces, no crowd, no shove) and,
// unless asked to walk, at speed 0
function put(w, kind, x, z, o = {}, { walk = false, anchored = true } = {}) {
  const g = api.spawn(w, kind, x, z, { ...(walk ? {} : { speedMult: 0 }), ...o });
  g.anchored = anchored;
  return g;
}
// face it at the hero exactly, so its own turn this step leaves the facing as set
function faceHero(w, g) { const d = Math.hypot(w.hero.x - g.x, w.hero.z - g.z); g.faceX = (w.hero.x - g.x) / d; g.faceZ = (w.hero.z - g.z) / d; }
// one hero bullet that, after its next 0.4 u move, sits 0.9 r out from g's
// centre at angle phi (world), flying inward — what the next step's test sees
function shootAtAngle(w, g, phi) {
  const d0 = 0.9 * g.r + T.bullets.heroSpeed * dt;
  api.heroBullet(w, g.x + Math.cos(phi) * d0, g.z + Math.sin(phi) * d0, phi + Math.PI);
}
const has = (w, type, id, f = () => true) => w.events.some((e) => e.type === type && e.id === id && f(e));
// 1.x's facing, transcribed (enemy.js:1682, 1800-1806), to replay a trace against
function face1x(fx, fz, gx, gz, hx, hz) {
  const ddx = hx - gx, ddz = hz - gz, dist = Math.hypot(ddx, ddz) || 0.001;
  const tx = ddx / (dist || 1), tz = ddz / (dist || 1), turn = Math.min(1, 2.2 * dt);
  fx += (tx - fx) * turn; fz += (tz - fz) * turn;
  const fl = Math.hypot(fx, fz) || 1;
  return [fx / fl, fz / fl];
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.9, hp 4, speed 1.5, steel blue 0x7f93c4 (1.x enemy.js:596)', S.radius === 0.9 && S.hp === 4 && S.speed === 1.5 && S.color === 0x7f93c4);
  check('CFG: no gun, never fires (enemy.js:596)', S.bulletColor === null && S.fireInterval === null);
  check('a blob dome, MASS, hurts to touch in classic (MELEE_TYPES, main.js:2412), not a biter (tuning.js:496-497)',
    S.family === 'blob' && S.role === 'MASS' && S.contact === true && S.revenge === null && !S.noHpMult);
  check('its silhouette is the default dome {1.05, 0.82, 1.05} (1.x tuning.js:39-44, enemy.js:801-806)',
    T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.bulwark);
  check('it walks until within 1.3, turns at min(1, 2.2·dt), blocks at dot > 0.5 (enemy.js:1797, 1802; main.js:10690)',
    S.holdAt === 1.3 && S.turnRate === 2.2 && S.blockDot === 0.5 && S.distFloor === 0.001);
  const P = S.plate;
  check('the plate: Box(1.7, 1.15, 0.16) in 0xc7d4f2, 0.6 up, radius + 0.25 out, glint 0.75 + 0.2·|sin 2.2t| (enemy.js:1154-1156, 1808-1814)',
    P.size[0] === 1.7 && P.size[1] === 1.15 && P.size[2] === 0.16 && P.color === 0xc7d4f2 && P.y === 0.6 && P.gap === 0.25
    && P.glintBase === 0.75 && P.glintAmp === 0.2 && P.glintHz === 2.2);
  const K = S.spark;
  check('a blocked shot: 3 steel droplets of 0.08, ±0.8 rad about the hit, 4 u/s out, 2–4 up, from mid-height + 0.15 (main.js:10694-10698)',
    K.count === 3 && K.color === 0xc7d4f2 && K.size === 0.08 && K.spread === 1.6 && K.speed === 4 && K.up[0] === 2 && K.up[1] === 4 && K.lift === 0.15);
  check('… on the goo pool\'s physics: life 1.4, gravity 14, keep 0.35 on landing, spring 0.32/0.80, shrink 0.3 (main.js:1353, 1373-1387)',
    K.life === 1.4 && K.gravity === 14 && K.floorAt === 0.01 && K.floorKeep === 0.35 && K.landSquash === 0.4 && K.spring === 0.32 && K.damp === 0.8
    && K.sqMin === 0.55 && K.sqMax === 1.4 && K.sxFloor === 0.1 && K.shrink === 0.3);
}

// ── the walk (enemy.js:1793-1800) ────────────────────────────────────
{
  const w = world(), g = put(w, 'bulwark', 9, 0, {}, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('it walks straight at you at 1.5 u/s: one second from (9, 0) is (7.5, 0)', near(g.x, 9 - 60 * 1.5 * dt, 1e-9) && g.z === 0, `${g.x}, ${g.z}`);
}
{
  const w = world(), g = put(w, 'bulwark', 6, 8, {}, { walk: true });
  step(w, IDLE);
  check('… along the line to you (from (6, 8): −0.6, −0.8)', near(g.x, 6 - 0.6 * 1.5 * dt, 1e-12) && near(g.z, 8 - 0.8 * 1.5 * dt, 1e-12));
}
{
  const w = world(), g = put(w, 'bulwark', 9, 0, { speedMult: 1.4 }, { walk: true });
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('the wave\'s speedMult multiplies the walk (1.x _speedMult, enemy.js:1697)', near(g.x, 9 - 60 * 1.5 * 1.4 * dt, 1e-9), `${g.x}`);
  const w2 = world(), g2 = put(w2, 'bulwark', 9, 0, { affix: 'swift' }, { walk: true });
  for (let i = 0; i < 60; i++) step(w2, IDLE);
  check('… the SWIFT affix × 1.35 (main.js:9416)', near(g2.x, 9 - 60 * 1.5 * 1.35 * dt, 1e-9), `${g2.x}`);
  const w3 = world(), g3 = put(w3, 'bulwark', 9, 0, {}, { walk: true });
  g3.surgeT = 10; g3.surgeMult = 1.6;
  for (let i = 0; i < 60; i++) step(w3, IDLE);
  check('… and a SIREN\'s surge × 1.6 (enemy.js:1698)', near(g3.x, 9 - 60 * 1.5 * 1.6 * dt, 1e-9), `${g3.x}`);
}
{
  const w = world(), g = put(w, 'bulwark', 1.31, 0, {}, { walk: true });
  step(w, IDLE);
  const once = g.x;
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('it holds once within 1.3: a step from 1.31 takes it to 1.31 − 1.5/60, then it stands', near(once, 1.31 - 1.5 * dt, 1e-12) && g.x === once && g.z === 0, `${once} → ${g.x}`);
  const w2 = world(), g2 = put(w2, 'bulwark', 1.3, 0, {}, { walk: true });
  for (let i = 0; i < 60; i++) step(w2, IDLE);
  check('… at exactly 1.3 it does not move (dist > 1.3 walks, enemy.js:1797)', g2.x === 1.3 && g2.z === 0);
  const w3 = world(), g3 = put(w3, 'bulwark', 0, 0, {}, { walk: true });
  for (let i = 0; i < 30; i++) step(w3, IDLE);
  check('on top of you it stands still and keeps a unit facing (the || 0.001 guard, no NaN)', g3.x === 0 && g3.z === 0 && near(Math.hypot(g3.faceX, g3.faceZ), 1) && Number.isFinite(g3.faceX));
}

// ── the facing (enemy.js:1157, 1800-1806) ────────────────────────────
{
  const w = world(), g = put(w, 'bulwark', 5, 0);
  check('it spawns facing +z, toward the bottom of the screen (enemy.js:1157)', g.faceX === 0 && g.faceZ === 1);
  step(w, IDLE);
  const turn = 2.2 * dt, fx = -turn, fz = 1 - turn, fl = Math.hypot(fx, fz);
  check('one step turns it by the lerp min(1, 2.2·dt) toward you, renormalised: (−0.0367, 0.9633)/|…|',
    near(g.faceX, fx / fl, 1e-15) && near(g.faceZ, fz / fl, 1e-15), `${g.faceX}, ${g.faceZ}`);
  const ang = () => Math.atan2(g.faceX, g.faceZ);
  for (let i = 1; i < 15; i++) step(w, IDLE);
  check('… a quarter turn is not a snap: 30.9° round after 0.25 s', near(ang(), -30.927 * DEG, 0.001 * DEG), `${ang() / DEG}`);
  for (let i = 15; i < 60; i++) step(w, IDLE);
  check('… 78.0° after 1 s', near(ang(), -78.015 * DEG, 0.001 * DEG), `${ang() / DEG}`);
  for (let i = 60; i < 180; i++) step(w, IDLE);
  check('… and squared up to you by 3 s (89.86°), its length kept 1', near(ang(), -89.864 * DEG, 0.001 * DEG) && near(Math.hypot(g.faceX, g.faceZ), 1, 1e-12), `${ang() / DEG}`);
}
{
  // a hero exactly behind it: the lerp is on the vector, and straight back
  // has no sideways part — the plate shrinks, renormalises, and stays (1.x
  // as written; any offset at all lets it come round)
  const w = world(), g = put(w, 'bulwark', 0, 5);
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('1.x\'s lerp: a hero dead behind gives it nothing to turn by — it stays facing away', g.faceX === 0 && g.faceZ === 1);
  const w2 = world(), g2 = put(w2, 'bulwark', 0.5, 5), want = Math.atan2(-0.5, -5);
  for (let i = 0; i < 120; i++) step(w2, IDLE);
  const a2 = Math.atan2(g2.faceX, g2.faceZ);
  for (let i = 120; i < 240; i++) step(w2, IDLE);
  const a4 = Math.atan2(g2.faceX, g2.faceZ);
  check('… half a unit off that line it comes round: 151.4° of 174.3° in 2 s, 174.0° in 4 s', near(a2, -151.37 * DEG, 0.01 * DEG) && near(a4, -174.03 * DEG, 0.01 * DEG) && angDiff(a4, want) < 0.3 * DEG,
    `${a2 / DEG}, ${a4 / DEG}`);
}
{
  // a trace: it walks, the hero strafes round it, the facing is 1.x's step by step
  const w = world(), g = put(w, 'bulwark', 8, 3, {}, { walk: true });
  let fx = 0, fz = 1, worst = 0;
  for (let i = 0; i < 240; i++) {
    const mx = Math.cos(i * 0.05), mz = Math.sin(i * 0.05);
    const gx = g.x, gz = g.z;
    step(w, { ...IDLE, mx, mz });
    [fx, fz] = face1x(fx, fz, gx, gz, w.hero.x, w.hero.z);
    worst = Math.max(worst, Math.abs(fx - g.faceX), Math.abs(fz - g.faceZ));
  }
  check('a four-second trace with the hero circling: the facing is 1.x\'s formula step for step, walking and holding', worst < 1e-12, `${worst}`);
}

// ── the plate (main.js:10683-10700) ──────────────────────────────────
// layout: a BULWARK at (5, 0) facing the hero at the origin (−x), standing still
{
  const w = world(), g = put(w, 'bulwark', 5, 0); faceHero(w, g);
  shootAtAngle(w, g, Math.PI); step(w, IDLE);
  check('a shot dead on its face is spent: a block by the plate, no hit, no damage', has(w, 'block', g.id, (e) => e.by === 'plate') && !has(w, 'hit', g.id)
    && g.hp === 4 && g.flash <= 0 && !w.bullets.some((b) => b.hero), `hp ${g.hp}`);
  check('… reported as a plate block, with where the bullet and the body were (for the look\'s sparks)',
    has(w, 'plate', g.id, (e) => e.n === 1 && near(e.gx, 5) && e.gz === 0 && e.r === 0.9 && near(e.x, 5 - 0.81, 1e-9)) && g.s.blocks === 1);
  for (let i = 0; i < 20; i++) { shootAtAngle(w, g, Math.PI); step(w, IDLE); }
  check('… however many land there', g.hp === 4 && g.alive && g.s.blocks === 21);
}
{
  const w = world(), g = put(w, 'bulwark', 5, 0); faceHero(w, g);
  shootAtAngle(w, g, Math.PI + 59 * DEG); step(w, IDLE);
  const at59 = has(w, 'block', g.id) && g.hp === 4;
  shootAtAngle(w, g, Math.PI - 59 * DEG); step(w, IDLE);
  const atm59 = has(w, 'block', g.id) && g.hp === 4;
  check('59° either side of its facing is still the plate', at59 && atm59);
  shootAtAngle(w, g, Math.PI + 61 * DEG); step(w, IDLE);
  check('61° is past it: the shot lands (1 damage, the flash)', has(w, 'hit', g.id) && !has(w, 'block', g.id) && g.hp === 3 && g.flash > 0);
  shootAtAngle(w, g, Math.PI - 61 * DEG); step(w, IDLE);
  check('… on either side', has(w, 'hit', g.id) && g.hp === 2);
  shootAtAngle(w, g, Math.PI / 2); step(w, IDLE);
  check('a shot on its flank lands', has(w, 'hit', g.id) && g.hp === 1);
  shootAtAngle(w, g, 0); step(w, IDLE);
  check('… and four from behind kill it (hp 4)', !g.alive && w.events.some((e) => e.type === 'kill' && e.id === g.id && e.kind === 'bulwark') && w.kills === 1);
}
{
  // 1.x moves (and turns) every body before it tests a single bullet
  // (enemy.update, then main.js:10636), so the block reads the facing this
  // step turned to: 61° off the hero before the step is 59.1° after it
  const w = world(), g = put(w, 'bulwark', 5, 0), off = 61 * DEG;
  g.faceX = Math.cos(Math.PI + off); g.faceZ = Math.sin(Math.PI + off);
  shootAtAngle(w, g, Math.PI); step(w, IDLE);
  const after = angDiff(Math.atan2(g.faceZ, g.faceX), Math.PI);
  check('the block reads the facing this step turned to: a shot 61° off it before the step (dot 0.485) is 59.1° off after, and blocked',
    Math.cos(off) < 0.5 && near(after, 59.13 * DEG, 0.01 * DEG) && has(w, 'block', g.id, (e) => e.by === 'plate') && g.hp === 4, `${after / DEG}`);
  const w2 = world(), g2 = put(w2, 'bulwark', 5, 0), off2 = 63 * DEG;
  g2.faceX = Math.cos(Math.PI + off2); g2.faceZ = Math.sin(Math.PI + off2);
  shootAtAngle(w2, g2, Math.PI); step(w2, IDLE);
  check('… while 63° off is still past it after the step (61.1°): the shot lands', has(w2, 'hit', g2.id) && g2.hp === 3);
}
{
  const w = world(), g = put(w, 'bulwark', 5, 0); faceHero(w, g);
  const n = w.bullets.length;
  shootAtAngle(w, g, Math.PI);
  const b = w.bullets[n]; b.pierce = true;
  step(w, IDLE);
  check('even a piercing shot (a LASER\'s) is spent on the plate (main.js:10690)', has(w, 'block', g.id) && !w.bullets.includes(b) && g.hp === 4);
}
{
  const w = world(), g = put(w, 'bulwark', 5, 0, { variant: 'elite' }); faceHero(w, g);
  check('an elite is 1.2× as big and has 2× the hp (main.js:9402-9406)', near(g.r, 0.9 * 1.2) && g.hp === 8);
  shootAtAngle(w, g, Math.PI); step(w, IDLE);
  check('… and its bigger plate arc is the same ±60°', has(w, 'block', g.id) && g.hp === 8);
  const w2 = world(), g2 = put(w2, 'bulwark', 5, 0, { variant: 'elitelite' });
  check('an elitelite has ceil(4 × 1.5) = 6 hp, at its own size (main.js:9407-9411)', g2.hp === 6 && g2.r === 0.9);
}
{
  // the plate is tested before a WARDEN's aura (main.js:10683-10720)
  const w = world(), g = put(w, 'bulwark', 5, 0), W = put(w, 'warden', 5, -3); faceHero(w, g);
  shootAtAngle(w, g, Math.PI); step(w, IDLE);
  check('inside a WARDEN\'s aura, a shot on the plate is still the plate\'s block', has(w, 'block', g.id, (e) => e.by === 'plate') && has(w, 'plate', g.id) && g.hp === 4);
  shootAtAngle(w, g, 0); step(w, IDLE);
  check('… and one on its back is the aura\'s, not the plate\'s', has(w, 'block', g.id, (e) => e.by === 'aura') && !has(w, 'plate', g.id) && g.hp === 4);
  void W;
}

// ── in a fight ───────────────────────────────────────────────────────
{
  // it walks at you while you fire straight at it: by the time the first
  // shot arrives it has turned its plate on you, and nothing lands
  const w = world(), g = put(w, 'bulwark', 8, 0, {}, { walk: true });
  let hits = 0, blocks = 0;
  for (let i = 0; i < 60 * 6; i++) {
    step(w, { ...IDLE, ax: 1, az: 0, aim: true, fire: true });
    hits += w.events.filter((e) => e.type === 'hit' && e.id === g.id).length;
    blocks += w.events.filter((e) => e.type === 'block' && e.id === g.id).length;
  }
  check('firing straight at it as it comes: every shot ends on the plate, it arrives unhurt', hits === 0 && blocks > 20 && g.hp === 4, `hits ${hits}, blocks ${blocks}`);
  check('… and holding at 1.3, it hurts to touch (r + 0.5 = 1.4, main.js:10886-10906)', w.hero.lives < T.hero.lives && w.killedBy === 'bulwark', `lives ${w.hero.lives}`);
}
{
  // the flank: it squares up to you at (0, 0); you step out to (6, 6), below
  // it, and fire up. Its plate cannot snap round, so the first shots land.
  const w = world(), g = put(w, 'bulwark', 6, 0); faceHero(w, g);
  w.hero.x = 6; w.hero.z = 6; w.hero.px = 6; w.hero.pz = 6;
  let early = 0, late = 0;
  for (let i = 0; i < 60; i++) {
    step(w, { ...IDLE, ax: 0, az: -1, aim: true, fire: true });
    const n = w.events.filter((e) => e.type === 'hit' && e.id === g.id).length;
    if (i < 15) early += n; else late += n;
  }
  check('a quick side-step opens its flank: the shots that arrive before it turns land', early >= 1 && g.hp < 4, `early ${early}, hp ${g.hp}`);
  check('… then it has turned, and they stop (60° of the way round in 0.25 s)', late === 0, `late ${late}`);
}
{
  const w = world(), g = api.spawn(w, 'bulwark', 6, 3);
  let shots = 0;
  for (let i = 0; i < 60 * 20; i++) { step(w, IDLE); shots += w.events.filter((e) => e.type === 'gelShot').length; }
  check('twenty seconds in the arena: not one shot of its own', shots === 0 && w.gelBullets === 0);
  void g;
}
{
  const w = world({ mode: 'hardcade' }); w.wave = 12;
  const g = put(w, 'bulwark', 5, 0);
  api.kill(w, g, 'hero');
  check('HARDCADE: its corpse does not fire back (not a biter, tuning.js:496-497)', !w.events.some((e) => e.type === 'revenge') && w.bullets.length === 0);
}
{
  // the PUSH dash: it moves only by its velocity, so the core carries the
  // shove on top of its walk. The hero dashes AWAY from it (−x), once with
  // 1.x's dash and once with PUSH, so the only difference is the knock.
  const run = (dashMode) => {
    const w = world({ dashMode }), g = put(w, 'bulwark', 1.6, 0, {}, { walk: true, anchored: false }); faceHero(w, g);
    step(w, { ...IDLE, mx: -1, dash: true });
    const kx = g.kx;
    for (let i = 1; i < 30; i++) step(w, IDLE);
    return { w, g, kx };
  };
  const a = run('push'), b = run('pass');
  check('a PUSH dash knocks it away from you (+x), and the knock is kept on top of its walk', a.kx > 5 && b.kx === 0 && a.g.x > b.g.x + 1 && a.g.alive && a.g.hp === 4,
    `kx ${a.kx.toFixed(3)}, ${a.g.x.toFixed(3)} vs ${b.g.x.toFixed(3)}`);
  check('… and it keeps facing you through it (unit, pointing back at the hero)', near(Math.hypot(a.g.faceX, a.g.faceZ), 1, 1e-12) && a.g.faceX < -0.99 && a.w.hero.x < -4);
}
{
  const trace = (seed) => {
    const w = world({ seed }), g = put(w, 'bulwark', 7, -4, {}, { walk: true, anchored: false });
    const out = [];
    for (let i = 0; i < 300; i++) { step(w, { ...IDLE, mx: Math.sin(i * 0.03), ax: 1, aim: true, fire: i % 2 === 0 }); out.push(g.x, g.z, g.faceX, g.faceZ, g.hp); }
    return out.join(',');
  };
  check('a run replays from its seed', trace(3) === trace(3));
}

// ── the look ─────────────────────────────────────────────────────────
{
  let matArgs = null, tear = null;
  const scene = new THREE.Scene(), clock = { value: 0 }, TSL = THREE.TSL;
  const ctx = { THREE, TSL, GEL_TIME: clock, T, S, kind: 'bulwark', scene, geo: { blob: new THREE.SphereGeometry(1, 8, 6) },
    gelMaterial: (hex, fam, r, o) => { matArgs = [hex, fam, r, o]; const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color(); tear = TSL.uniform(0); m.gel = { tear }; return m; } };
  const mk = () => ({ kind: 'bulwark', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0.7, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) });
  const v = mk();
  check('the body is the plain gel dome in 0x7f93c4, shaped by the core (not `own`)',
    !v.own && matArgs[0] === 0x7f93c4 && matArgs[1] === 'blob' && matArgs[2] === 1 && matArgs[3] === undefined && v.body.geometry === ctx.geo.blob && v.body.material === v.mat);
  const pg = v.plate.geometry.parameters, pm = v.plateMat;
  check('the plate: Box(1.7, 1.15, 0.16), unlit (a basic material), translucent, pale steel',
    pg.width === 1.7 && pg.height === 1.15 && pg.depth === 0.16 && pm.isMeshBasicNodeMaterial && pm.transparent && pm.color.getHex() === 0xc7d4f2);
  // its opacity is the glint × (tear is 0): find the tear uniform in the graph
  const uses = (n, want, seen = new Set()) => {
    if (!n || typeof n !== 'object' || seen.has(n)) return false;
    if (n === want) return true;
    seen.add(n);
    return Object.values(n).some((c) => c && typeof c === 'object' && (c.isNode || Array.isArray(c)) && uses(c, want, seen));
  };
  check('… its opacity is the glint, put out by the death thrash (tear): the plate falls with the bulwark (enemy.js:3010)',
    pm.opacityNode?.isNode && uses(pm.opacityNode, v.glint) && uses(pm.opacityNode, tear));
  check('… and a plate put out is discarded (alphaTest at 0: no colour and no depth, as 1.x\'s visible = false)',
    pm.alphaTestNode?.isNode && (pm.alphaTestNode.value ?? pm.alphaTestNode.node?.value) === 0);

  const g = { id: 1, kind: 'bulwark', state: 'active', r: 0.9, x: 0, z: 0, faceX: 0.6, faceZ: 0.8, s: { blocks: 0, log: [] } };
  look.update(v, g, null, 1.5, 1);
  check('it rides under the body\'s root, not its squash (1.x\'s plate is its own mesh)', v.plate.parent === v.root);
  check('… at radius + 0.25 out along the facing, 0.6 up (enemy.js:1808-1811)',
    near(v.plate.position.x, 0.6 * 1.15, 1e-12) && near(v.plate.position.y, 0.6) && near(v.plate.position.z, 0.8 * 1.15, 1e-12));
  check('… squared up to it: rotation.y = atan2(fx, fz) (enemy.js:1812)', near(v.plate.rotation.y, Math.atan2(0.6, 0.8)) && v.plate.rotation.x === 0 && v.plate.rotation.z === 0);
  const fwd = new THREE.Vector3(0, 0, 1).applyEuler(v.plate.rotation);
  check('… so its thin side (0.16) faces where it faces', near(fwd.x, 0.6, 1e-12) && near(fwd.z, 0.8, 1e-12));
  check('… glinting 0.75 + 0.2·|sin(2.2·t)| (enemy.js:1814)', near(v.glint.value, 0.75 + 0.2 * Math.abs(Math.sin(2.2 * (1.5 + 0.7)))));
  look.update(v, g, null, 2.9, 1);
  check('… on the clock, inside 0.75–0.95', near(v.glint.value, 0.75 + 0.2 * Math.abs(Math.sin(2.2 * (2.9 + 0.7)))) && v.glint.value >= 0.75 && v.glint.value <= 0.95);
  look.update(v, { ...g, r: 1.08 }, null, 2.9, 1);
  check('an elite\'s plate stands further out (1.08 + 0.25) but is the same slab', near(Math.hypot(v.plate.position.x, v.plate.position.z), 1.33, 1e-12) && v.plate.scale.x === 1);
  look.update(v, g, null, 2.9, 0.5);
  check('2.0: it swells in with the body (the view\'s swell grow, TUNING.gel.swell)', near(v.plate.scale.x, 0.5) && near(v.plate.position.y, 0.3));

  // the sparks, off the real sim
  const sp = v.sparks, mesh = sp.mesh, rnd = Math.random;
  check('the sparks live in the scene, shared by every BULWARK there', mesh.parent === scene && mk().sparks === sp && scene.children.filter((c) => c === mesh).length === 1);
  check('… a pool of 96, nothing in the air yet', mesh.instanceMatrix.count === 96 && mesh.count === 0);
  const w = world(), b = put(w, 'bulwark', 5, 0); faceHero(w, b);
  shootAtAngle(w, b, Math.PI); step(w, IDLE);
  Math.random = () => 0.5;                                  // the middle of every 1.x roll
  clock.value = 10; look.update(v, b, w, 10, 1);
  const at = (i) => { const m = new THREE.Matrix4(), q = new THREE.Vector3(), s = new THREE.Vector3(); mesh.getMatrixAt(i, m); m.decompose(q, new THREE.Quaternion(), s); return { q, s }; };
  const d0 = sp.drops.filter((d) => d.live);
  check('a shot the plate took throws three droplets', mesh.count === 3 && d0.length === 3);
  check('… from the bullet at the body\'s mid-height + 0.15 (a blob\'s fxY is its radius)', near(at(0).q.x, 5 - 0.81, 1e-6) && near(at(0).q.y, 0.9 + 0.15, 1e-6) && near(at(0).q.z, 0, 1e-6));
  check('… back along the hit (out of the plate, toward you) at 4 u/s, 3 up, 0.08 big',
    d0.every((d) => near(Math.hypot(d.vx, d.vz), 4) && angDiff(Math.atan2(d.vz, d.vx), Math.PI) < 1e-9 && d.vy === 3) && near(at(0).s.y, 0.08, 1e-6));
  look.update(v, b, w, 10, 1); mesh.onBeforeRender(); look.update(v, b, w, 10, 1);
  check('one block throws once, however many frames draw it', mesh.count === 3);
  Math.random = () => 0;
  for (let i = 0; i < 4; i++) { shootAtAngle(w, b, Math.PI + 20 * DEG); step(w, IDLE); }
  look.update(v, b, w, 10, 1);
  const d1 = sp.drops.filter((d) => d.live).slice(3);
  check('four blocks across four steps with no frame between: all twelve droplets', mesh.count === 15 && d1.length === 12);
  const a1 = Math.PI + 20 * DEG - 0.8, bx = 5 + Math.cos(Math.PI + 20 * DEG) * 0.81, bz = Math.sin(Math.PI + 20 * DEG) * 0.81;
  check('… each from where its bullet was, spread ±0.8 (rand 0 → −0.8), 2 up, and as far into its flight as its block is old (3, 2, 1, 0 steps)',
    d1.every((d, i) => {
      const j = 3 - Math.floor(i / 3), f = j / 60;
      return angDiff(Math.atan2(d.vz, d.vx), a1) < 1e-6 && near(d.vy, 2 - 14 * f, 1e-9) && near(d.x, bx + Math.cos(a1) * 4 * f, 1e-6) && near(d.z, bz + Math.sin(a1) * 4 * f, 1e-6)
        && near(d.life, 1.4 - f, 1e-9);
    }));
  // a block long gone by the time a frame looks: nothing (1.x's droplets would have landed and shrunk away)
  shootAtAngle(w, b, Math.PI); step(w, IDLE);
  for (let i = 0; i < 90; i++) step(w, IDLE);
  look.update(v, b, w, 10, 1);
  check('… and a block older than a droplet\'s 1.4 s life throws nothing', mesh.count === 15 && b.s.blocks === 6);
  Math.random = rnd;

  // killed in the very step its plate blocked: hp 1, a shot on the face and
  // one in the back in the same step — gone from the world before any frame
  const w2 = world(), k = put(w2, 'bulwark', -5, 2, { hp: 1 }); faceHero(w2, k);
  const face = Math.atan2(k.faceZ, k.faceX);
  shootAtAngle(w2, k, face); shootAtAngle(w2, k, face + Math.PI); step(w2, IDLE);
  check('(a bulwark blocked a shot and died in the same step)', !k.alive && has(w2, 'plate', k.id) && w2.events.some((e) => e.type === 'kill' && e.id === k.id));
  look.update(v, b, w2, 10, 1);
  const dk = sp.drops.filter((d) => d.live);
  check('… still throws its sparks, from where it stood (its `plate` event)', dk.length === 18
    && near(Math.hypot(dk[15].x - k.x, dk[15].z - k.z), 0.81, 1e-6) && near(dk[15].y, 0.9 + 0.15, 1e-6));
  mesh.onBeforeRender(); look.update(v, b, w2, 10, 1);
  check('… once', sp.drops.filter((d) => d.live).length === 18);
  // with no BULWARK view left to update, the scene's mesh still reads the world
  const w3 = world(), k3 = put(w3, 'bulwark', 4, -3, { hp: 1 }); faceHero(w3, k3);
  look.update(v, b, w3, 10, 1);
  const f3 = Math.atan2(k3.faceZ, k3.faceX);
  shootAtAngle(w3, k3, f3); shootAtAngle(w3, k3, f3 + Math.PI); step(w3, IDLE);
  mesh.onBeforeRender();
  check('… and with no BULWARK view left to look, the scene\'s own render still catches the last step\'s', sp.drops.filter((d) => d.live).length === 21);
  // a frame that runs several steps (main.js catches up to sim.maxSteps): a
  // body a frame has shown blocks in one step and dies to a shot in its back
  // in the next — the last step's events hold no `plate` for it
  const w5 = world(), k5 = put(w5, 'bulwark', 3, 4, { hp: 1 }); faceHero(w5, k5);
  look.update(v, k5, w5, 10, 1);
  const f5 = Math.atan2(k5.faceZ, k5.faceX);
  shootAtAngle(w5, k5, f5); step(w5, IDLE);
  const blocked = has(w5, 'plate', k5.id);
  shootAtAngle(w5, k5, f5 + Math.PI); step(w5, IDLE);
  check('(a bulwark blocked a shot, then died a step later, before the next frame)', blocked && !k5.alive && !has(w5, 'plate', k5.id) && w5.events.some((e) => e.type === 'kill' && e.id === k5.id));
  mesh.onBeforeRender();
  const d5 = sp.drops.filter((d) => d.live).slice(21);
  check('… still throws its sparks, a step into their flight', d5.length === 3 && d5.every((d) => near(d.life, 1.4 - 1 / 60, 1e-9)) && !sp.bodies.has(k5));
  mesh.onBeforeRender(); look.update(v, b, w5, 10, 1);
  check('… once', sp.drops.filter((d) => d.live).length === 24);
  // and one a frame has shown that blocks and dies in the same step throws once, not twice
  const w6 = world(), k6 = put(w6, 'bulwark', -3, -4, { hp: 1 }); faceHero(w6, k6);
  look.update(v, k6, w6, 10, 1);
  const f6 = Math.atan2(k6.faceZ, k6.faceX);
  shootAtAngle(w6, k6, f6); shootAtAngle(w6, k6, f6 + Math.PI); step(w6, IDLE);
  mesh.onBeforeRender(); mesh.onBeforeRender();
  check('… and a shown body blocked and killed in one step throws its three once (its log, not its event as well)',
    !k6.alive && has(w6, 'plate', k6.id) && sp.drops.filter((d) => d.live).length === 27);

  // flight: 1.x's chunk physics on the frame clock
  const d = d0[0], y0 = d.y, x0 = d.x;
  clock.value = 10 + 1 / 60; mesh.onBeforeRender();
  check('they fly on the gel clock (onBeforeRender): gravity 14, 4 u/s out', near(d.vy, 3 - 14 / 60, 1e-12) && near(d.y, y0 + (3 - 14 / 60) / 60, 1e-12) && near(d.x, x0 - 4 / 60, 1e-12));
  let landed = false;
  for (let i = 2; i <= 60; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); if (d.y === 0 && d.vy === 0) landed = true; }
  check('… land, squash and skid to a stop (× 0.35 a landing)', landed && d.live && Math.abs(d.vx) < 0.05);
  for (let i = 61; i <= 80; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); }
  check('… shrink over their last 0.3 s', d.live && d.life < 0.3 && at(0).s.y < 0.06);
  for (let i = 81; i <= 90; i++) { clock.value = 10 + i / 60; mesh.onBeforeRender(); }
  check('… and are gone after 1.4 s', !sp.drops.some((q) => q.live) && mesh.count === 0);

  // a full pool reuses the droplet with the least life left
  const w4 = world(), b4 = put(w4, 'bulwark', 5, 0); faceHero(w4, b4);
  for (let t = 0; t < 40; t++) { shootAtAngle(w4, b4, Math.PI); step(w4, IDLE); look.update(v, b4, w4, 12 + t / 60, 1); }
  check('a full pool (40 blocks, 120 droplets) holds 96 and reuses the oldest', mesh.count === 96 && b4.s.blocks === 40);
}

if (failed) { console.log(`✗ bulwark: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ bulwark: ${passed} checks`);
