#!/usr/bin/env node
// prism.mjs — PRISM's own checks, in bare node: 1.x's numbers (enemy.js:620,
// 702, 728-730, 773-777, 813-817, 1000, 2447-2488, 2666-2681, 2728-2732, 2779, 3007-3027;
// main.js:257-258, 2410-2421, 9384-9400, 10398-10407, 1967-1982,
// 10569-10584; tuning.js:32, 314), asserted against the sim on its fixed
// 1/60 s step. A lone shard is checked against an ORACLE: 1.x's own
// per-frame arithmetic for the PRISM case of update() and the squash spring
// after it (with 1.x's literals, not the tuning file's), so every step's
// position, spin, clock and squash must match 1.x's frame for frame. The
// pair is checked for 1.x's links (opposite orbits, twinIdx, the survivor's
// rage) and for the spec's fix to the volley rhythm (arcade-mode.md §5.4).
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import { headliner } from '../../js/sim/director/arcade.js?v=159';
import look from '../../js/render/looks/prism.js?v=159';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.prism, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);
const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);
// the steps a 1.x countdown of t lasts on the fixed step (t −= dt, out at
// ≤ 0): 1.2 s is 72, 0.75 s is 45, but 2.8 s is 169 — 168 × 1/60 leaves a
// hair over zero, as it did in 1.x at 60 Hz
const clockSteps = (t) => { let n = 0; while (t > 0) { t -= dt; n++; } return n; };
const P_CALM = clockSteps(2.8), P_RAGED = clockSteps(0.75), HALF = Math.round(1.4 / dt);

// A world with no director, the hero standing at `hero`, never running out
// of lives. add() puts a PRISM down anchored (no swarm forces, no crowd, so
// only its own step moves it).
function world({ seed = 1, hero = [0, 0], arena } = {}) {
  const w = createWorld({ seed, mode: 'arcade', ...(arena ? { arena } : {}) });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  return w;
}
const add = (w, x, z, o = {}) => { const g = api.spawn(w, 'prism', x, z, o); g.anchored = true; return g; };
const run = (w, n) => { for (let i = 0; i < n; i++) step(w, IDLE); };
const gelBullets = (w) => w.bullets.filter((b) => !b.hero);

// 1.x's PRISM, frame by frame (enemy.js:2461-2487, then the squash spring
// 2728-2731; a bullet hit lands after the update, enemy.js:1607), in 1.x's
// literals, a lone calm shard (no twin), the hero standing still. The clamp
// is the core's (at the body's own radius r, where 1.x used the CFG 0.85).
function oracle(steps, { x, z, hero = [0, 0], hx = 19, hz = 11, r = 0.85, sign = 1, speedMult = 1, iM = 1, raged = false, hits = new Set() }) {
  let fireT = null, spin = 0, sq = 1, sqV = 0, shots = [];
  const out = [null];
  for (let i = 1; i <= steps; i++) {
    const ddx = hero[0] - x, ddz = hero[1] - z, dist = Math.hypot(ddx, ddz) || 0.001;
    const ex = x, ez = z;
    const want = raged ? 6.0 : 7.2;
    const pspd = 1.5 * speedMult * (raged ? 1.45 : 1);
    const perpX = -ddz / dist, perpZ = ddx / dist;
    const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
    x += ((ddx / dist) * radial * 0.5 + perpX * sign) * pspd * dt;
    z += ((ddz / dist) * radial * 0.5 + perpZ * sign) * pspd * dt;
    x = clampN(x, -(hx - r), hx - r); z = clampN(z, -(hz - r), hz - r);
    spin += (raged ? 1.6 : 0.8) * dt;
    fireT = (fireT ?? 1.2) - dt;
    let fired = null;
    if (fireT <= 0) {
      if (raged) { fireT = 0.75 * iM; fired = { ring: 10, x: ex, z: ez }; }
      else {
        fireT = 2.8 * iM;
        const baseA = Math.atan2(hero[1] - ez, hero[0] - ex), span = Math.PI * 0.26;
        fired = { x: ex, z: ez, angles: [0, 1, 2, 3].map((j) => baseA - span / 2 + j * (span / 3)) };
      }
      shots.push(i);
    }
    sqV = (sqV - (sq - 1) * 0.18) * 0.90;
    sq = Math.max(0.55, Math.min(1.55, sq + sqV));
    if (hits.has(i)) sqV -= 0.75;
    out.push({ x, z, spin, fireT, sq, sqV, fired });
  }
  out.shots = shots;
  return out;
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.85, hp 3, speed 1.5, 0xff55cc, bullets 0xff99ee, no interval (1.x enemy.js:620)',
    S.radius === 0.85 && S.hp === 3 && S.speed === 1.5 && S.color === 0xff55cc && S.bulletColor === 0xff99ee && S.fireInterval === null);
  check('its own body, no contact damage, MASS, not a biter (1.x enemy.js:773, main.js:2410-2421, tuning.js:314, 496-513)',
    S.family === 'custom' && S.contact === false && S.role === 'MASS' && S.revenge === null);
  check('as a boss hp 9 (× 3) and the core\'s radius × 1.5 (1.x main.js:9384-9389)', S.bossHp === 9 && T.variants.boss.radius === 1.5 && S.noHpMult === undefined);
  check('the orbit: 7.2 calm, 6.0 raged, ± 1.5 band, radial 0.5, tangent 1, the coin at 0.5 (1.x enemy.js:702, 2461-2466)',
    S.orbit.want === 7.2 && S.orbit.wantRaged === 6.0 && S.orbit.band === 1.5 && S.orbit.radial === 0.5 && S.orbit.tangent === 1 && S.orbit.flip === 0.5);
  check('raged × 1.45; spin 0.8 / 1.6 rad/s (1.x enemy.js:2462, 2470)', S.rageSpeed === 1.45 && S.spin.calm === 0.8 && S.spin.raged === 1.6);
  check('the clocks: first 1.2, 1.x\'s twin stagger 1.4; calm a 4-fan over 0.26π every 2.8; raged a 10-ring from 0 every 0.75 (1.x enemy.js:2471-2485)',
    S.fire.first === 1.2 && S.fire.twinStagger === 1.4 && S.fire.calm.every === 2.8 && S.fire.calm.count === 4 && near(S.fire.calm.span, Math.PI * 0.26)
    && S.fire.raged.every === 0.75 && S.fire.raged.count === 10 && S.fire.raged.base === 0);
  check('the spec\'s fix is on: twin 1 half a period behind (arcade-mode.md §5.4)', S.fire.strictTurns === true);
  check('tell 0.3 s before a volley; the rage pop 0.5 s; "THE SURVIVOR RAGES!" 1.1 s, shake 0.3 (1.x enemy.js:2456, 2679; main.js:10398-10407)',
    S.tell === 0.3 && S.phaseFlash === 0.5 && S.rage.label === 'THE SURVIVOR RAGES!' && S.rage.banner === 1.1 && S.rage.shake === 0.3);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2731)',
    S.squash.spring === 0.18 && S.squash.damp === 0.90 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('a boss death throws 14 extra droplets (1.x main.js:4499)', S.bossDeath.extraDroplets === 14);
  check('its death voice is 1.x\'s non-blob pop: square 380 → 55 Hz, 0.18 s at 0.22, noise 0.09 for 0.13 s (1.x main.js:4476-4480, audio.js:248)',
    S.deathSound.wave === 'square' && S.deathSound.f0 === 380 && S.deathSound.f1 === 55 && S.deathSound.dur === 0.18 && S.deathSound.vol === 0.22
    && S.deathSound.noiseVol === 0.09 && S.deathSound.noiseDur === 0.13);
  const L = S.look;
  check('the satin `omega` family: roughness 0.04, transmission 0.40, wobble 0.35 (1.x tuning.js:32, enemy.js:323, 813-817)',
    L.roughness === 0.04 && L.transmission === 0.40 && L.wobble === 0.35);
  check('the shard: an octahedron of detail 0 stretched 0.8 × 1.35 × 0.8 (1.x enemy.js:776-777)',
    L.octa.detail === 0 && L.octa.scale[0] === 0.8 && L.octa.scale[1] === 1.35 && L.octa.scale[2] === 0.8 && L.sqFloor === 0.1);
  check('the tell 0x88104f / raged 0xaa2200 at 30 rad/s; the pop 0xffee88 / 0xff5500 at 60 (1.x enemy.js:2668-2669, 2680-2681)',
    L.tell.calm === 0x88104f && L.tell.raged === 0xaa2200 && L.tell.rate === 30 && L.phaseFlash.colors[0] === 0xffee88 && L.phaseFlash.colors[1] === 0xff5500 && L.phaseFlash.rate === 60);
  check('the aura: 0xffcc33 / 0xff2200, 1.7 × r, inner 0.82, 40 segs, y 0.04, 0.6 then 0.45 ± 0.3 at 5; raged 1.15 ± 0.1 at 20 (1.x main.js:1967-1982, 10579-10582)',
    L.aura.color === 0xffcc33 && L.aura.raged === 0xff2200 && L.aura.radius === 1.7 && L.aura.inner === 0.82 && L.aura.segs === 40 && L.aura.y === 0.04
    && L.aura.opacity0 === 0.6 && L.aura.opacity[0] === 0.45 && L.aura.opacity[1] === 0.3 && L.aura.rate === 5 && L.aura.ragedScale[0] === 1.15 && L.aura.ragedScale[1] === 0.1 && L.aura.ragedRate === 20);
  const src = readFileSync(new URL('../../js/sim/species/prism.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('the director\'s headliner: the TWIN PRISMS on one seed parity at wave 8, OMEGA on the other (1.x main.js:255-261)',
    headliner(8, 1).kind === 'prism' && headliner(8, 0).kind === 'omega' && headliner(16, 1).kind === 'omega' && headliner(16, 0).kind === 'prism'
    && T.waves.boss.prism.t[0] === 0 && T.waves.boss.prism.t[1] === 0.4);
}

// ── a lone shard, frame for frame against 1.x ────────────────────────
{
  const N = 60 * 12;
  for (const [x, z, hero, label] of [[12, 0, [0, 0], 'far: closing in'], [4, 3, [0, 0], 'near: backing off'], [-7, 1, [0, 0], 'in the band: pure orbit'], [14, -8, [2, 3], 'from a corner, in a wide arena']]) {
    const w = world({ seed: 5, hero });
    const g = add(w, x, z);
    check(`(${label}) the orbit sign is a coin: ± 1, drawn from the run's rng`, Math.abs(g.s.orbitSign) === 1 && g.s.twin === null && g.s.twinIdx === 0 && g.s.phase === 1 && !g.s.raged);
    const want = oracle(N, { x, z, hero, sign: g.s.orbitSign });
    let bad = null;
    const shots = [];
    for (let i = 1; i <= N && !bad; i++) {
      step(w, IDLE);
      const o = want[i], s = g.s;
      if (!near(g.x, o.x) || !near(g.z, o.z) || !near(s.spin, o.spin, 1e-7) || !near(s.fireT, o.fireT, 1e-9) || !near(g.sq, o.sq) || !near(g.sqV, o.sqV))
        bad = `step ${i}: x ${g.x}/${o.x} z ${g.z}/${o.z} spin ${s.spin}/${o.spin} fireT ${s.fireT}/${o.fireT} sq ${g.sq}/${o.sq}`;
      const shot = evs(w, 'gelShot');
      if (shot.length) shots.push(i);
      if (!bad && (!!shot.length !== !!o.fired)) bad = `step ${i}: fired ${!!shot.length} vs 1.x ${!!o.fired}`;
      if (!bad && o.fired) {
        const nb = gelBullets(w).slice(-4);
        const okN = nb.length === 4 && nb.every((b) => b.color === 0xff99ee && b.src === 'prism' && near(b.speed, 7) && near(b.x - b.vx * dt, o.fired.x) && near(b.z - b.vz * dt, o.fired.z));
        const okA = okN && o.fired.angles.every((a, j) => angDiff(Math.atan2(nb[j].vz, nb[j].vx), a) < 1e-9);
        if (!okA) bad = `step ${i}: the fan ${nb.map((b) => Math.atan2(b.vz, b.vx).toFixed(4))} vs ${o.fired.angles.map((a) => a.toFixed(4))}`;
      }
    }
    check(`(${label}) position, spin, clock and squash match 1.x every step for 12 s`, !bad, bad || '');
    check(`(${label}) the first 4-fan at 1.2 s (step 72), then every 2.8 s (1.x's clock: ${P_CALM} steps); aimed from where it stood, 0xff99ee, 7 u/s`,
      P_CALM >= 168 && P_CALM <= 169 && shots.length === 4 && shots[0] === 72 && shots.every((t, i) => !i || t - shots[i - 1] === P_CALM), `${shots}`);
    check(`(${label}) the tell: g.tell is 1 for the last 0.3 s before a volley and 0 otherwise`, (() => {
      const w2 = world({ seed: 5, hero }); const g2 = add(w2, x, z);
      let ok = true;
      for (let i = 1; i <= 240; i++) { step(w2, IDLE); const inTell = g2.s.fireT < 0.3; if (g2.tell !== (inTell ? 1 : 0)) ok = false; if ((i === 53 || i === 72) && g2.tell !== 0) ok = false; if ((i === 55 || i === 71) && g2.tell !== 1) ok = false; }
      return ok;
    })());
  }
  // the band: it holds its distance
  {
    const w = world({ seed: 2 }); const g = add(w, 7.2, 0);
    let dmin = 99, dmax = 0;
    for (let i = 0; i < 600; i++) { step(w, IDLE); const d = Math.hypot(g.x, g.z); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); }
    check('in the band it orbits at 1.5 u/s and never leaves 7.2 ± 1.5 (the tangent walks it out a little, 1.x too)', dmin >= 7.2 - 1e-9 && dmax < 8.7 && near(Math.hypot(g.velX, g.velZ), 1.5, 0.05), `${dmin} ${dmax} ${Math.hypot(g.velX, g.velZ)}`);
  }
  // the wave's escalation: speed × speedMult, the clock × intervalMult
  {
    const w = world({ seed: 2 }); const g = add(w, 12, 0, { speedMult: 1.73, intervalMult: 0.615 });
    const want = oracle(400, { x: 12, z: 0, sign: g.s.orbitSign, speedMult: 1.73, iM: 0.615 });
    let bad = null;
    for (let i = 1; i <= 400 && !bad; i++) { step(w, IDLE); const o = want[i]; if (!near(g.x, o.x) || !near(g.z, o.z) || !near(g.s.fireT, o.fireT)) bad = `step ${i}`; }
    check('at wave 8\'s 1.73 / 0.615 the orbit and the 1.72 s clock (104 steps) match 1.x frame for frame', !bad && want.shots[0] === 72 && want.shots[1] === 72 + 104 && clockSteps(2.8 * 0.615) === 104, bad || `${want.shots}`);
  }
  // hits: 1 damage, 1.x's non-blob spring kicked after the update
  {
    const w = world({ seed: 3 }); const g = add(w, 12, 0, { isBoss: true, hp: S.bossHp });
    check('a boss: r 1.275, hp 9 of 9', near(g.r, 1.275) && g.hp === 9 && g.maxHp === 9 && g.isBoss);
    const plan = new Set([30, 100, 200]), hitSteps = [];
    for (let i = 1; i <= 300; i++) { step(w, IDLE); if (evs(w, 'hit').length) hitSteps.push(i); if (plan.has(i)) api.heroBullet(w, g.x, g.z, 0); }
    const want = oracle(300, { x: 12, z: 0, sign: g.s.orbitSign, r: 1.275, hits: new Set(hitSteps) });
    const w2 = world({ seed: 3 }); const g2 = add(w2, 12, 0, { isBoss: true, hp: S.bossHp });
    let bad = null;
    for (let i = 1; i <= 300 && !bad; i++) { step(w2, IDLE); if (plan.has(i)) api.heroBullet(w2, g2.x, g2.z, 0); const o = want[i]; if (!near(g2.sq, o.sq) || !near(g2.sqV, o.sqV)) bad = `step ${i}: sq ${g2.sq}/${o.sq}`; }
    check('three hits land, 9 − 3 hp, still phase 1 (no hp phases) and the squash is 1.x\'s 0.18 / 0.90 spring', hitSteps.length === 3 && g.hp === 6 && g.s.phase === 1 && !g.s.raged && !bad, `${hitSteps} ${g.hp} ${bad || ''}`);
    while (g.hp > 1) { g.hp--; }
    run(w, 60);
    check('… a lone boss at 1 hp is still calm: PRISM has no hp phases (1.x enemy.js:1688)', g.s.phase === 1 && !g.s.raged && g.alive);
  }
  // the hit circle is the boss's 1.275 (1.x e.radius = CFG × 1.5)
  {
    // a shard that does not move (speedMult 0) and bullets that hang where they are put
    const w = world({ seed: 3 }); const g = add(w, 12, 0, { isBoss: true, hp: S.bossHp, speedMult: 0 });
    const still = () => { const b = w.bullets[w.bullets.length - 1]; b.vx = b.vz = 0; };
    api.heroBullet(w, g.x + 1.275 + 0.15 - 0.01, g.z, 0); still(); step(w, IDLE);
    const hitA = evs(w, 'hit').length;
    api.heroBullet(w, g.x + 1.275 + 0.15 + 0.01, g.z, 0); still(); step(w, IDLE);
    const hitB = evs(w, 'hit').length;
    check('a bullet just inside the boss\'s 1.275 + 0.15 circle hits, one just outside misses (no long body, no blocks)', hitA === 1 && hitB === 0 && g.hp === 8);
  }
  // the walls: the core clamps it at its own radius
  {
    const w = world({ seed: 3, hero: [-17, 0] }); const g = add(w, 17, 0, { isBoss: true, hp: S.bossHp });
    let maxX = 0; for (let i = 0; i < 900; i++) { step(w, IDLE); maxX = Math.max(maxX, Math.abs(g.x), Math.abs(g.z) * 19 / 11); }
    check('it stays inside the arena (the core\'s clamp at the boss radius, where 1.x clamped at the CFG 0.85: a 0.425 u deviation)', Math.abs(g.x) <= 19 - 1.275 + 1e-9 && Math.abs(g.z) <= 11 - 1.275 + 1e-9);
  }
}

// ── the pair ──────────────────────────────────────────────────────────
{
  // links on arrival (main.js:9392-9400)
  const w = world({ seed: 11 });
  const a = add(w, 12, 0, { isBoss: true, hp: S.bossHp });
  const b = add(w, -12, 0, { isBoss: true, hp: S.bossHp });
  check('the second finds the first: twinIdx 0 / 1, each holding the other', a.s.twinIdx === 0 && b.s.twinIdx === 1 && a.s.twin === b && b.s.twin === a);
  check('… and takes the OPPOSITE orbit sign', b.s.orbitSign === -a.s.orbitSign && Math.abs(a.s.orbitSign) === 1);
  {
    const wn = world({ seed: 11 }); const p1 = add(wn, 12, 0), p2 = add(wn, -12, 0);
    check('two PRISMS that are not bosses do not pair (1.x linked them in its boss branch, main.js:9381-9400)', p1.s.twin === null && p2.s.twin === null && p2.s.twinIdx === 0);
  }
  const c = add(w, 0, 8, { isBoss: true, hp: S.bossHp });
  check('a third (never in 1.x\'s classic) pairs with nobody', c.s.twin === null && a.s.twin === b && b.s.twin === a);
  c.alive = false; w.gels = w.gels.filter((g) => g.alive);
  // they orbit opposite ways
  run(w, 120);
  const cross = (g) => Math.sign(g.x * g.velZ - g.z * g.velX);
  check('they orbit the hero in opposite directions', cross(a) === -cross(b) && cross(a) !== 0);

  // the survivor rages the step after its twin dies (enemy.js:2453-2459)
  api.kill(w, a, 'hero');
  check('set-up: twin 0 killed', !a.alive && b.s.phase === 1);
  step(w, IDLE);
  const ph = evs(w, 'phase');
  check('the step after: phase 3, raged, the 0.5 s strobe running', b.s.phase === 3 && b.s.raged && b.s.twinRaged && near(b.s.phaseFlashT, 0.5 - dt));
  check('… "THE SURVIVOR RAGES!" for 1.1 s with a 0.3 shake, once', ph.length === 1 && ph[0].id === b.id && ph[0].phase === 3 && ph[0].label === 'THE SURVIVOR RAGES!' && ph[0].dur === 1.1 && ph[0].shake === 0.3);
  check('… and the core shakes the screen 0.3 (1.x addShake(0.3), main.js:10405)', evs(w, 'shake').length === 1 && evs(w, 'shake')[0].amount === 0.3);
  step(w, IDLE);
  check('… and only once', evs(w, 'phase').length === 0 && b.s.twinRaged);
  // raged: speed × 1.45 toward a 6.0 orbit, spin 1.6
  {
    const w2 = world({ seed: 11 });
    const a2 = add(w2, 12, 0, { isBoss: true, hp: S.bossHp }), b2 = add(w2, -12, 0, { isBoss: true, hp: S.bossHp });
    run(w2, 30);
    api.kill(w2, a2, 'hero');
    step(w2, IDLE);
    const spin0 = b2.s.spin, x0 = b2.x, z0 = b2.z;
    step(w2, IDLE);
    const sp = Math.hypot(b2.x - x0, b2.z - z0) / dt;
    check('raged it moves at 1.5 × 1.45 × √(0.5² + 1) (closing from 12) and spins 1.6 rad/s', near(sp, 1.5 * 1.45 * Math.hypot(0.5, 1), 1e-9) && near(b2.s.spin - spin0, 1.6 * dt), `${sp}`);
    let dmin = 99;
    for (let i = 0; i < 900; i++) { step(w2, IDLE); dmin = Math.min(dmin, Math.hypot(b2.x, b2.z)); }
    const dEnd = Math.hypot(b2.x, b2.z);
    check('… closing from 12 it stops at the raged band\'s outer edge, 6.0 + 1.5 = 7.5, and orbits there (the calm one rides 8.7)', dmin > 7.45 && dmin <= 7.5 + 1e-9 && dEnd > 7.45 && dEnd < 7.52, `${dmin} ${dEnd}`);
    // the pending calm clock runs on; the next volley is a 10-ring, then one every 0.75 s
    const w3 = world({ seed: 11 });
    const a3 = add(w3, 12, 0, { isBoss: true, hp: S.bossHp }), b3 = add(w3, -12, 0.5, { isBoss: true, hp: S.bossHp });
    run(w3, 10); api.kill(w3, b3, 'hero');
    const shots = [];
    let first = null;
    for (let i = 11; i <= 400; i++) {
      step(w3, IDLE);
      if (evs(w3, 'gelShot').length) { shots.push(i); if (!first) first = gelBullets(w3).slice(-10); }
    }
    check('the calm clock is not reset by the rage: twin 0\'s first shot, raged, lands on its calm clock\'s step (72)', shots[0] === 72 && a3.s.raged, `${shots}`);
    check('… a 10-ring from angle 0 (0xff99ee, 7 u/s), then every 0.75 s (45 steps)', first && first.length === 10
      && first.every((bl, i) => bl.color === 0xff99ee && bl.src === 'prism' && near(bl.speed, 7) && angDiff(Math.atan2(bl.vz, bl.vx), (i * Math.PI * 2) / 10) < 1e-9)
      && P_RAGED === 45 && shots.length >= 4 && shots.every((t, i) => !i || t - shots[i - 1] === 45), `${shots}`);
    check('… g.tell runs 0.3 s before each ring too', (() => {
      const w4 = world({ seed: 11 }); const a4 = add(w4, 12, 0, { isBoss: true, hp: S.bossHp }), b4 = add(w4, -12, 0.5, { isBoss: true, hp: S.bossHp });
      api.kill(w4, b4, 'hero'); run(w4, 72 + 26); const before = a4.tell; run(w4, 2); const at = a4.tell; run(w4, 17); const fired = a4.tell;
      return a4.s.raged && before === 0 && at === 1 && fired === 0 && a4.s.rings === 2;   // 0.75 − 26/60 > 0.3, − 28/60 < 0.3; the ring at 117
    })());
  }

  // the rhythm: the director's 0.4 s between the two (main.js:257-258), at a
  // wave's intervalMult. Each is live from its first step, as 1.x's were: 1.x
  // spawned a body in the frame's spawn pass (main.js:9350-9400) and updated
  // it later in that same frame (main.js:10369), with no appear phase, and its
  // clock starts on that first update (enemy.js:2471, `??=` on first use). So
  // twin 0, put down before step 1, is first stepped at step 1 and fires on
  // its 72nd update, step 72 (A1 − 1 + 1.2 s); twin 1, 24 steps later, is
  // first stepped at step 25
  {
    const A1 = 1, B1 = 25;                                     // the pair's first update frames
    const FIRST = A1 - 1 + clockSteps(1.2);                    // 1.x enemy.js:2471: twin 0's 1.2 s → step 72
    const rhythm = (strict, iM = 1) => {
      const was = S.fire.strictTurns; S.fire.strictTurns = strict;
      const w = world({ seed: 4 });
      const o = { isBoss: true, hp: S.bossHp, intervalMult: iM };
      const a = api.spawn(w, 'prism', 12, 0, o); a.anchored = true;
      run(w, 24);
      const b = api.spawn(w, 'prism', -12, 0, o); b.anchored = true;
      const sa = [], sb = [];
      for (let i = 25; i <= 900; i++) {
        step(w, IDLE);
        for (const e of evs(w, 'gelShot')) (e.id === a.id ? sa : e.id === b.id ? sb : []).push(i);
      }
      S.fire.strictTurns = was;
      return { a, b, sa, sb };
    };
    const gaps = (xs, n) => xs.every((t, i) => !i || t - xs[i - 1] === n);
    const r = rhythm(true);
    check(`(strict turns) twin 0's first volley 1.2 s after its first active step (step ${A1}): step ${FIRST}, then every ${P_CALM}`, FIRST === 72 && r.sa[0] === FIRST && r.sa.length >= 4 && gaps(r.sa, P_CALM), `${r.sa}`);
    check(`(strict turns) twin 1's first volley lands HALF A PERIOD (1.4 s, ${HALF} steps) after twin 0's, and the pair alternates`,
      r.sb[0] === FIRST + HALF && r.sb.length >= 4 && gaps(r.sb, P_CALM) && r.sa.slice(1).every((t, i) => t > r.sb[i] && Math.abs((t - r.sb[i]) - HALF) <= 1), `${r.sa} | ${r.sb}`);
    check('(strict turns) twinIdx 1, opposite orbits, through the director\'s timing', r.b.s.twinIdx === 1 && r.a.s.twinIdx === 0 && r.b.s.orbitSign === -r.a.s.orbitSign);
    // wave 8's 0.615: a 1.72 s period (104 steps)
    const P8 = clockSteps(2.8 * 0.615), H8 = Math.round(1.4 * 0.615 / dt);
    const r8 = rhythm(true, 0.615);
    check(`(strict turns, wave 8) twin 0 at ${FIRST} (1.x's first volley is not scaled by iM, enemy.js:2471) then every ${P8}; twin 1 ${H8} steps (half of 1.72 s) after each`,
      r8.sa[0] === FIRST && gaps(r8.sa, P8) && r8.sb[0] === FIRST + H8 && gaps(r8.sb, P8) && r8.sa.length >= 7 && r8.sb.length >= 7, `${r8.sa} | ${r8.sb}`);
    // 1.x's own clock for twin 1: `1.2 + _twinIdx × 1.4` from its own first
    // update (enemy.js:2471) — 1.x's float sum, 2.5999…, runs 157 steps
    const r1 = rhythm(false, 0.615), lit = clockSteps(1.2 + 1 * 1.4), LIT = B1 - 1 + lit;
    check(`(1.x's literal, wave 8) twin 1 at 1.2 + 1.4 after ITS OWN first step (step ${B1}): ${LIT}, ${LIT - (FIRST + P8)} steps after twin 0's second — the spec's trap, "effectively together" (arcade-mode.md §5.4: 3.0 s against 1.2 + 1.72, 0.08 s apart)`,
      r1.sa[0] === FIRST && r1.sa[1] === FIRST + P8 && r1.sb[0] === LIT && Math.abs((r1.sb[0] - r1.sa[1]) * dt - 0.08) < dt, `${r1.sb} ${r1.sa}`);
  }
  // strict turns when the first is already firing: still half a period behind the sibling's NEXT
  {
    const w = world({ seed: 4 });
    const a = add(w, 12, 0, { isBoss: true, hp: S.bossHp });
    run(w, 100);                                   // a fired at 72; its next is at 72 + P_CALM
    const b = add(w, -12, 0, { isBoss: true, hp: S.bossHp });
    const sb = [];
    for (let i = 101; i <= 600; i++) { step(w, IDLE); for (const e of evs(w, 'gelShot')) if (e.id === b.id) sb.push(i); }
    check(`a late twin lands half a period after the first's next volley (${72 + P_CALM} + ${HALF}) and keeps turns`, sb[0] === 72 + P_CALM + HALF && sb[1] === sb[0] + P_CALM, `${sb}`);
  }
}

// ── through the real director: wave 8 on an odd seed ─────────────────
// The hero stands still and every other body is cleared off the floor the
// step it lands (a hero who kills everything), so the rounds clear and the
// run reaches its first boss; from then on nothing is touched.
{
  const seed = [1, 3, 5, 7].find((s) => headliner(8, s).kind === 'prism');
  const toBoss = (w) => {
    const spawned = [];
    let steps = 0;
    while (steps < 60 * 400) {
      step(w, IDLE); steps++;
      for (const e of evs(w, 'spawn')) if (e.kind === 'prism') spawned.push({ tick: w.tick, boss: e.boss });
      if (w.gels.filter((g) => g.kind === 'prism').length === 2) break;
      for (const g of w.gels.slice()) if (g.alive && g.state === 'active' && g.kind !== 'prism') api.kill(w, g, 'env');
    }
    return { steps, spawned };
  };
  const w = createWorld({ seed, mode: 'arcade' });
  w.hero.lives = 1e9;
  const { steps, spawned } = toBoss(w);
  const bosses = w.gels.filter((g) => g.kind === 'prism');
  // in the worlds (v45) 1.x's 9 is fought × waves.boss.worldHp
  const hp9 = Math.round(9 * (T.waves.boss.worldHp?.prism ?? 1));
  check(`wave 8 brings two PRISMS as bosses: hp ${hp9} (1.x's 9 × the worlds'), r 1.275, 0.4 s apart`, w.wave === 8 && bosses.length === 2 && bosses.every((g) => g.isBoss && g.maxHp === hp9 && g.hp === hp9 && near(g.r, 1.275))
    && spawned.length === 2 && spawned.every((e) => e.boss) && spawned[1].tick - spawned[0].tick === Math.round(0.4 / dt), `wave ${w.wave} n ${bosses.length} ${JSON.stringify(spawned)}`);
  if (bosses.length === 2) {
    const [p, q] = bosses;
    check('… paired on arrival: twinIdx 0 / 1, opposite orbits, the wave\'s speedMult and intervalMult', p.s.twinIdx === 0 && q.s.twinIdx === 1 && p.s.twin === q && q.s.twin === p && q.s.orbitSign === -p.s.orbitSign && p.speedMult === q.speedMult && p.intervalMult === q.intervalMult && p.intervalMult < 1);
    const P = 2.8 * p.intervalMult;
    const sa = [], sb = [];
    for (let i = 1; i <= 600; i++) { step(w, IDLE); for (const e of evs(w, 'gelShot')) { if (e.id === p.id) sa.push(i); else if (e.id === q.id) sb.push(i); } }
    check(`… and they alternate: twin 1 half a period (${(P / 2).toFixed(3)} s) behind twin 0, within a step`, sa.length >= 3 && sb.length >= 3
      && sb.every((t, i) => Math.abs((t - sa[i]) * dt - P / 2) <= dt + 1e-9 && (sa[i + 1] == null || Math.abs((sa[i + 1] - t) * dt - P / 2) <= dt + 1e-9)), `${sa} | ${sb}`);
  }
  // determinism: the same seed, the same run, through the pair's volleys
  const w1 = createWorld({ seed, mode: 'arcade' }), w2 = createWorld({ seed, mode: 'arcade' });
  w1.hero.lives = w2.hero.lives = 1e9;
  const s1 = toBoss(w1), s2 = toBoss(w2);
  for (let i = 0; i < 300; i++) { step(w1, IDLE); step(w2, IDLE); }
  const sig = (w) => JSON.stringify([w.bullets.map((b) => [b.x, b.z, b.vx]), w.gels.filter((g) => g.kind === 'prism').map((g) => [g.x, g.z, g.s.orbitSign, g.s.fireT])]);
  check('two runs from the seed agree to the bullet', s1.steps === s2.steps && s1.steps === steps && sig(w1) === sig(w2) && w1.bullets.some((b) => b.src === 'prism'));
}

// ── the look, in bare node ────────────────────────────────────────────
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'prism', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel of 1.x\'s omega family (uRadius 0.85, wobble 0.35, roughness 0.04, transmission 0.40)',
    v.own === true && matArgs[0] === 0xff55cc && matArgs[1] === 'omega' && matArgs[2] === 0.85 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.04) && near(v.mat.transmission, 0.40) && v.mesh.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);
  // the shard: an octahedron of 6 vertices at ± 0.68 across and ± 1.1475 up
  const pos = v.mesh.geometry.getAttribute('position');
  let xMax = 0, yMax = 0, zMax = 0;
  for (let i = 0; i < pos.count; i++) { xMax = Math.max(xMax, Math.abs(pos.getX(i))); yMax = Math.max(yMax, Math.abs(pos.getY(i))); zMax = Math.max(zMax, Math.abs(pos.getZ(i))); }
  check('the shard is OctahedronGeometry(0.85, 0) × (0.8, 1.35, 0.8): 8 faces, tips at ± 0.68 across and ± 1.1475 up', pos.count === 24 && near(xMax, 0.68, 1e-6) && near(zMax, 0.68, 1e-6) && near(yMax, 1.1475, 1e-6));
  check('the aura is a 40-segment ring, inner 0.82 of its outer, drawn, not added (v104: no glow), double-sided, no depth write, 0xffcc33 at 0.6, flat on the floor at y 0.04, off until a boss wears it',
    v.aura.geometry.parameters.innerRadius === 0.82 && v.aura.geometry.parameters.outerRadius === 1 && v.aura.geometry.parameters.thetaSegments === 40
    && v.auraMat.blending === THREE.NormalBlending && v.auraMat.side === THREE.DoubleSide && v.auraMat.depthWrite === false && v.auraMat.transparent === true
    && v.auraMat.color.getHex() === 0xffcc33 && near(v.auraMat.opacity, 0.6) && near(v.aura.rotation.x, -Math.PI / 2) && near(v.aura.position.y, 0.04) && v.aura.visible === false);

  const w = world({ seed: 9 });
  const g = add(w, 12, 0);
  v.root.position.set(g.x, 0, g.z);
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const wp = new THREE.Vector3().setFromMatrixPosition(v.core.matrixWorld);
  check('the shard\'s centre stands at 0.85 (the CFG radius) over the body', near(wp.y, 0.85) && near(wp.x, 12) && v.core.position.y === 0.85);
  check('no aura on a plain shard', !v.aura.visible && !v.auraOn);
  run(w, 30);
  look.update(v, g, w, 0, 1);
  check('it spins about y by the sim\'s angle (0.8 rad/s calm)', near(v.core.rotation.y, g.s.spin) && near(g.s.spin, 0.8 * 30 * dt, 1e-9));
  // squash: about the centre, (1/√sq, sq, 1/√sq), the view's floor squash undone
  g.sq = 0.7;
  v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));   // what the view does
  look.update(v, g, w, 0, 1);
  v.root.updateMatrixWorld(true);
  const p2 = new THREE.Vector3(), q2 = new THREE.Quaternion(), s2 = new THREE.Vector3();
  v.core.matrixWorld.decompose(p2, q2, s2);
  check('1.x\'s squash scales the shard about its centre: still at 0.85, scale (1/√sq, sq, 1/√sq)',
    near(p2.y, 0.85, 1e-9) && near(s2.y, 0.7, 1e-9) && near(s2.x, 1 / Math.sqrt(0.7), 1e-9) && near(s2.z, 1 / Math.sqrt(0.7), 1e-9));
  g.sq = 1; v.squash.scale.set(1, 1, 1);
  look.update(v, g, w, 0, 0.5);
  check('while it swells into being it grows from the floor', near(v.core.position.y, 0.425) && near(v.core.scale.x, 0.5));
  look.update(v, g, w, 0, 1);
  // a boss: × 1.5, the aura at 1.7 × 1.275 breathing 0.45 ± 0.3 at 5 rad/s
  const wb = world({ seed: 9 }); const gb = add(wb, 12, 0, { isBoss: true, hp: S.bossHp });
  look.update(v, gb, wb, 0, 1);
  check('a boss is the same shard × 1.5 with its centre still at 0.85 (1.x main.js:9388 scaled the mesh and left it)', near(v.core.scale.x, 1.5) && near(v.core.scale.y, 1.5) && near(v.core.position.y, 0.85));
  check('… wearing the aura at 1.7 × 1.275 = 2.1675, 0xffcc33, 0.45 at t 0', v.aura.visible && v.auraOn && near(v.aura.scale.x, 2.1675) && v.auraMat.color.getHex() === 0xffcc33 && near(v.auraMat.opacity, 0.45));
  look.update(v, gb, wb, Math.PI / 10, 1);
  check('… breathing to 0.75 at the top of sin(5 t)', near(v.auraMat.opacity, 0.75) && near(v.aura.scale.x, 2.1675));
  // the tell, the hit flash over it, the rage pop and the red aura
  gb.tell = 1; gb.flash = 0; gb.s.raged = false; gb.s.phaseFlashT = 0;
  look.update(v, gb, wb, 0.01, 1);
  check('the tell strobes 0x88104f at sin(30 t) > 0 …', v.mat.emissive.getHex() === 0x88104f, v.mat.emissive.getHex().toString(16));
  look.update(v, gb, wb, Math.PI / 30 + 0.01, 1);
  check('… and black on the other half', v.mat.emissive.getHex() === 0x000000);
  gb.s.raged = true; look.update(v, gb, wb, 0.01, 1);
  check('raged, the tell is 0xaa2200 and the aura 0xff2200 at 1.15 ± 0.1 × sin(20 t)', v.mat.emissive.getHex() === 0xaa2200 && v.auraMat.color.getHex() === 0xff2200 && near(v.aura.scale.x, 2.1675 * (1.15 + 0.1 * Math.sin(0.2))));
  gb.s.phaseFlashT = 0.4; look.update(v, gb, wb, 0.01, 1);
  check('the rage pop outranks the tell: 0xffee88 at sin(60 t) > 0 …', v.mat.emissive.getHex() === 0xffee88);
  look.update(v, gb, wb, Math.PI / 60 + 0.01, 1);
  check('… 0xff5500 on the other half', v.mat.emissive.getHex() === 0xff5500);
  v.mat.emissive.setScalar(0.6); gb.flash = 0.1; look.update(v, gb, wb, 0.01, 1);
  check('… and the hit flash outranks both', v.mat.emissive.r === 0.6 && v.mat.emissive.g === 0.6);
  gb.flash = 0; gb.s.phaseFlashT = 0; gb.tell = 0;
  // the kill: a dying view gets no update, so the body redraws itself as the
  // frame is drawn — the aura gone, the shard popping as 1.x's did
  look.update(v, gb, wb, 0, 1);
  v.root.updateMatrixWorld(true);
  check('a live boss view shows its aura when drawn', v.aura.visible === true);
  v.dyingT = 0.14; v.squash.scale.setScalar(1); v.root.scale.setScalar(1 + 0.5 * 1.3);   // what the core's stepFx does, halfway through
  v.root.updateMatrixWorld(true);
  check('a dying view hides the aura without an update (1.x disposed it the frame the boss died)', v.aura.visible === false);
  {
    const p3 = new THREE.Vector3(), q3 = new THREE.Quaternion(), s3 = new THREE.Vector3();
    v.core.matrixWorld.decompose(p3, q3, s3);
    check('… and the shard pops about its own centre (still at 0.85), unsquashed, from the CFG size: a boss too (1.x _deathBaseScale 1, enemy.js:1482-1484)',
      near(p3.y, 0.85, 1e-9) && near(s3.x, 1.65, 1e-9) && near(s3.y, 1.65, 1e-9) && near(s3.z, 1.65, 1e-9), `${p3.y} ${s3.x} ${s3.y}`);
  }
  v.dyingT = 0; v.root.scale.setScalar(1);
  look.update(v, gb, wb, 0, 1); v.root.updateMatrixWorld(true);
  check('… and a live one, updated, shows it again', v.aura.visible === true);
  look.reset(v);
  check('a pooled view comes back with no aura, at 0xffcc33 / 0.6', !v.aura.visible && !v.auraOn && v.auraMat.color.getHex() === 0xffcc33 && near(v.auraMat.opacity, 0.6));
  // the rage pop's clock pauses under a hit flash (1.x enemy.js:2650 runs first)
  {
    const w5 = world({ seed: 11 }); const a5 = add(w5, 12, 0, { isBoss: true, hp: S.bossHp }), b5 = add(w5, -12, 0, { isBoss: true, hp: S.bossHp });
    api.kill(w5, a5, 'hero'); step(w5, IDLE);
    b5.flash = 1; const t0 = b5.s.phaseFlashT; run(w5, 5);
    check('the rage strobe\'s clock holds while the hit flash is on, as 1.x\'s emissive order had it', near(b5.s.phaseFlashT, t0));
  }
  // … for exactly as many frames as 1.x's: it tested `_flashT > 0` and then
  // counted it down (enemy.js:2650-2652), so a 0.12 s flash (enemy.js:1606)
  // holds the strobe 8 frames, not the 7 the core's flash stays above zero
  {
    let f = 0.12, n1x = 0; while (f > 0) { f -= dt; n1x++; }
    const w6 = world({ seed: 11 }); const a6 = add(w6, 12, 0, { isBoss: true, hp: S.bossHp }), b6 = add(w6, -12, 0, { isBoss: true, hp: S.bossHp });
    api.kill(w6, a6, 'hero'); run(w6, 2);
    api.heroBullet(w6, b6.x, b6.z, 0); step(w6, IDLE);
    const landed = evs(w6, 'hit').length === 1 && b6.hp === S.bossHp - 1;
    let held = 0, prev = b6.s.phaseFlashT;
    for (let i = 0; i < 14; i++) { step(w6, IDLE); if (b6.s.phaseFlashT === prev) held++; prev = b6.s.phaseFlashT; }
    check(`a hit holds the rage strobe ${n1x} steps (1.x's frames), then it counts on`, T.gel.flash === 0.12 && n1x === 8 && landed && held === n1x && b6.s.phaseFlashT > 0,
      `held ${held} landed ${landed}`);
  }
}

if (failed) { console.log(`✗ prism: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ prism: ${passed} checks`);
