#!/usr/bin/env node
// omega.mjs — OMEGA's own checks, in bare node: 1.x's numbers (enemy.js:593,
// 702, 741-745, 816, 1001, 1229, 1467, 1683-1700, 2399-2445, 2666-2672,
// 2728-2736, 2961-2966; main.js:1967-1982, 2410-2421, 5041, 9382-9391,
// 10569-10584; tuning.js:32, 306), asserted against the sim on its fixed
// 1/60 s step. The three acts are checked against an ORACLE: 1.x's own
// per-frame arithmetic for the OMEGA case of update() — the phase read, the
// orbit, the clock, the three volleys — and the non-blob squash spring after
// it (with 1.x's literals, not the tuning file's), run from the same seeded
// draws, so every step's position, every volley's step and every bullet's
// angle must match 1.x's frame for frame.
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=158';
import { makeRng } from '../../js/sim/rng.js?v=158';
import { TUNING as T } from '../../js/tuning.js?v=158';
import { headliner, schedule, waveScale } from '../../js/sim/director/arcade.js?v=158';
import look from '../../js/render/looks/omega.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const S = T.species.omega, L = S.look, W = T.waves, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const FIRE = { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);

// A world with one OMEGA (a boss unless told otherwise; anchored: no swarm
// forces, no crowd, so only its own step moves it), the hero standing at
// `hero`, never running out of lives. `rng` is a copy of the run's seeded
// stream from just before the spawn, so the oracle can draw the same sign,
// first clock and spiral start.
function world({ seed = 1, x = 7.5, z = 0, boss = true, o = {}, hero = [0, 0], mortal = false, mode = 'arcade', arena } = {}) {
  const w = createWorld({ seed, mode, ...(arena ? { arena } : {}) });
  w.director = { step() {} };
  if (!mortal) w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  const rng = makeRng(0); rng.state = w.rng.state;
  const g = api.spawn(w, 'omega', x, z, { ...(boss ? { isBoss: true, hp: S.bossHp } : {}), ...o });
  g.anchored = true;
  return { w, g, rng };
}
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
// one step, returning the bullets it put on the floor
function stepShots(w, input = IDLE) {
  const before = new Set(w.bullets);
  step(w, input);
  return w.bullets.filter((b) => !before.has(b));
}

// 1.x's OMEGA, frame by frame (enemy.js:1680-1702, 2399-2445, 2961-2966,
// then the squash spring 2728-2730), in 1.x's literals, on the landscape
// arena, the hero standing still. `hpAt` sets the hp before a step (what a
// hit on the step before would have left); `hits` kicks the spring after a
// step (the hit lands after the update, enemy.js:1607). The wall clamp is
// the core's — by the body's radius, where 1.x used the CFG 0.95 — which
// this oracle's runs never reach.
function oracle(steps, { x, z, rng, hero = [0, 0], r = S.radius * T.variants.boss.radius, hx = 19, hz = 11,
                         boss = true, maxHp = 15, hpAt = new Map(), speedMult = 1, intervalMult = 1, hits = new Set() }) {
  let hp = maxHp, phase = 1, enraged = false, phaseFlashT = 0;
  const orbitSign = rng.next() < 0.5 ? 1 : -1;
  let fireT = 1.2 + rng.next() * 0.6;
  let spiralA = null, rotY = 0, rotX = 0, sq = 1, sqV = 0;
  const out = [null];
  for (let i = 1; i <= steps; i++) {
    if (hpAt.has(i)) hp = hpAt.get(i);
    const x0 = x, z0 = z;
    const ddx = hero[0] - x, ddz = hero[1] - z, dist = Math.hypot(ddx, ddz) || 0.001;
    if (boss) {
      const frac = hp / maxHp;
      const want = frac <= 0.33 ? 3 : frac <= 0.66 ? 2 : 1;
      if (want > phase) { phase = want; phaseFlashT = 0.5; }
      enraged = phase === 3;
    }
    const spd = 1.3 * speedMult * (enraged ? 1.45 : 1);
    const want = phase === 2 ? 6.2 : 7.5;
    const pspd = spd * (phase === 2 ? 1.18 : 1);
    const perpX = -ddz / dist, perpZ = ddx / dist;
    const radial = dist > want + 1.5 ? 1 : dist < want - 1.5 ? -1 : 0;
    x += (ddx / dist * radial * 0.5 + perpX * orbitSign) * pspd * dt;
    z += (ddz / dist * radial * 0.5 + perpZ * orbitSign) * pspd * dt;
    x = clamp(x, -(hx - r), hx - r); z = clamp(z, -(hz - r), hz - r);
    rotY += 0.6 * dt; rotX += 0.25 * dt;
    fireT -= dt;
    let shots = null;
    if (fireT <= 0) {
      if (phase === 3) {
        fireT = 0.7 * intervalMult;
        shots = []; for (let k = 0; k < 12; k++) shots.push((k / 12) * Math.PI * 2);
      } else if (phase === 2) {
        fireT = 0.24 * intervalMult;
        spiralA = (spiralA ?? rng.next() * Math.PI * 2) + 0.55;
        shots = [spiralA, spiralA + Math.PI];
      } else {
        fireT = 0.9 * intervalMult;
        const baseA = Math.atan2(hero[1] - z0, hero[0] - x0), count = 5, span = Math.PI * 0.35;
        shots = []; for (let j = 0; j < count; j++) shots.push(baseA - span / 2 + j * (span / (count - 1)));
      }
    }
    const popOn = phaseFlashT > 0;                   // no hit flash in an oracle run: the chain reaches the pop
    if (popOn) phaseFlashT -= dt;
    const tell = fireT < 0.25;
    sqV = (sqV - (sq - 1) * 0.18) * 0.90;
    sq = Math.max(0.55, Math.min(1.55, sq + sqV));
    if (hits.has(i)) sqV -= 0.75;
    out.push({ x, z, x0, z0, phase, enraged, phaseFlashT, popOn, fireT, shots, tell, rotY, rotX, sq, sqV, spd, pspd });
  }
  return out;
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.95, hp 5, speed 1.3, body 0x00eeff, bullets 0x66f2ff, no interval (1.x enemy.js:593)',
    S.radius === 0.95 && S.hp === 5 && S.speed === 1.3 && S.color === 0x00eeff && S.bulletColor === 0x66f2ff && S.fireInterval === null);
  check('its own body, no contact damage, MASS, not a biter by species (1.x enemy.js:741-745, main.js:2410-2421, 5041, tuning.js:306, 496-513)',
    S.family === 'custom' && S.contact === false && S.role === 'MASS' && S.revenge === null && S.deathLabel === 'Omega boss');
  check('a boss: hp 15 = ceil(5 × 3), phase 2 at ≤ 0.66, phase 3 at ≤ 0.33, enraged × 1.45, a 0.5 s pop (1.x main.js:9384, enemy.js:1689-1697)',
    S.bossHp === 15 && S.bossHp === Math.ceil(S.hp * W.boss.hpMult) && S.phases.p2 === 0.66 && S.phases.p3 === 0.33 && S.enrageSpeed === 1.45 && S.phaseFlash === 0.5);
  check('the first volley 1.2 + U(0, 0.6) s after arrival (1.x enemy.js:1229)', S.firstFire[0] === 1.2 && S.firstFire[1] === 0.6);
  check('the orbit: 7.5 (phase 2: 6.2, × 1.18), ±0.5 radial outside a ±1.5 band, tangent 1 (1.x enemy.js:2405-2411)',
    S.orbit.want.p1 === 7.5 && S.orbit.want.p2 === 6.2 && S.orbit.band === 1.5 && S.orbit.radial === 0.5 && S.orbit.tangent === 1 && S.phase2Speed === 1.18);
  check('the spin 0.6 / 0.25 rad/s (1.x enemy.js:2419-2420)', S.spin.y === 0.6 && S.spin.x === 0.25);
  check('act one: a 5-fan over 0.35π every 0.9 × iM (1.x enemy.js:2434-2441)', S.fan.period === 0.9 && S.fan.count === 5 && near(S.fan.span, Math.PI * 0.35));
  check('act two: two opposite bullets every 0.24 × iM, + 0.55 a volley (1.x enemy.js:2427-2433)', S.spiral.period === 0.24 && S.spiral.step === 0.55 && S.spiral.arms === 2);
  check('act three: a 12-ring from angle 0 every 0.7 × iM (1.x enemy.js:2422-2425, 2961-2966)', S.ring.period === 0.7 && S.ring.count === 12 && S.ring.base === 0);
  check('the tell is the last 0.25 s of the clock (1.x enemy.js:2670)', S.tellWindow === 0.25);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2730)',
    S.squash.spring === 0.18 && S.squash.damp === 0.90 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('the look: omega satin 0.04 / 0.40, wobble 0.35, an icosahedron of detail 0, the sq floor 0.1 (1.x tuning.js:32, enemy.js:323, 745, 2733)',
    L.roughness === 0.04 && L.transmission === 0.40 && L.wobble === 0.35 && L.detail === 0 && L.sqFloor === 0.1);
  check('the strobes: cyan / amber / red at 30 rad/s; gold / orange at 60 (1.x enemy.js:2666-2672)',
    L.tell.p1 === 0x0088aa && L.tell.p2 === 0x885500 && L.tell.p3 === 0xaa2200 && L.tell.off === 0x000000 && L.tell.rate === 30
    && L.phaseFlash.a === 0xffee88 && L.phaseFlash.b === 0xff5500 && L.phaseFlash.rate === 60);
  check('the aura: 1.7 × r out, 0.82 in, 40 segments, y 0.04, 0xffcc33 at 0.6 then 0.45 ± 0.3 @ 5; red 0xff2200 at 1.15 ± 0.1 @ 20 (1.x main.js:1967-1982, 10578-10583)',
    L.aura.outer === 1.7 && L.aura.inner === 0.82 && L.aura.segments === 40 && L.aura.y === 0.04 && L.aura.color === 0xffcc33 && L.aura.enraged === 0xff2200
    && L.aura.opacity0 === 0.6 && L.aura.opacity.base === 0.45 && L.aura.opacity.amp === 0.3 && L.aura.opacity.rate === 5
    && L.aura.enragedScale.base === 1.15 && L.aura.enragedScale.amp === 0.1 && L.aura.enragedScale.rate === 20);
}

// ── the boss wave spawns it: the headliner, 1.x's hp and radius ──────
{
  check('wave 8 headlines OMEGA on an even seed, the PRISMS on an odd one (1.x main.js:251-261)',
    headliner(8, 4).kind === 'omega' && headliner(8, 3).kind === 'prism' && headliner(16, 3).kind === 'omega');
  const plan = schedule(8, makeRng(4), 4);
  check('… its schedule opens with OMEGA at 0 s, flagged a boss', plan.list[0].kind === 'omega' && plan.list[0].t === 0 && plan.list[0].boss === true);
  const { g } = world();
  check('a boss OMEGA: 15 hp of 15, radius 1.425 = 0.95 × 1.5 (1.x main.js:9384-9389)', g.hp === 15 && g.maxHp === 15 && near(g.r, 1.425) && g.isBoss);
  const plain = world({ boss: false }).g;
  check('off the boss wave it is the CFG body: 5 hp, radius 0.95', plain.hp === 5 && plain.maxHp === 5 && plain.r === 0.95 && !plain.isBoss);
}

// ── the first volley: 1.2–1.8 s after arrival, seeded ─────────────────
{
  const firsts = [];
  for (let seed = 1; seed <= 30; seed++) {
    const { w, g } = world({ seed });
    let n = 0;
    for (; n < 200; n++) { step(w, IDLE); if (evs(w, 'gelShot').length) break; }
    firsts.push((n + 1) * dt);
    if (seed === 1) check('the first volley is act one\'s fan: 5 bullets, a gelShot event naming the phase', g.s.fanVolleys === 1 && evs(w, 'gelShot')[0].phase === 1 && w.bullets.length === 5);
  }
  const lo = Math.min(...firsts), hi = Math.max(...firsts);
  check('the first volley lands 1.2–1.8 s after arrival on every seed (1.x enemy.js:1229)', lo >= 1.2 - 1e-9 && hi <= 1.8 + dt + 1e-9, `${lo.toFixed(3)}..${hi.toFixed(3)}`);
  check('… and the window is used: it varies with the seed', hi - lo > 0.3, `${lo.toFixed(3)}..${hi.toFixed(3)}`);
  const a = world({ seed: 7 }).g, b = world({ seed: 7 }).g;
  check('the same seed gives the same orbit sign and clock (w.rng, never Math.random)', a.s.orbitSign === b.s.orbitSign && a.s.fireT === b.s.fireT);
}

// ── the three acts, frame for frame against 1.x ───────────────────────
{
  const STEPS = 1500, hpAt = new Map([[400, 9], [900, 4]]), hits = new Set([150, 151, 700]);
  const { w, g, rng } = world({ seed: 11 });
  const o = oracle(STEPS, { x: 7.5, z: 0, rng, hpAt, hits });
  let posOk = true, shotsOk = true, phaseOk = true, tellOk = true, sqOk = true, spinOk = true, bad = '';
  const volleys = { 1: 0, 2: 0, 3: 0 };
  let pops = 0;
  for (let i = 1; i <= STEPS; i++) {
    if (hpAt.has(i)) g.hp = hpAt.get(i);
    const shots = stepShots(w);
    if (hits.has(i)) g.sqV -= 0.75;
    const e = o[i];
    if (!(near(g.x, e.x) && near(g.z, e.z))) { posOk = false; bad ||= `step ${i}: (${g.x}, ${g.z}) vs (${e.x}, ${e.z})`; }
    if (g.s.phase !== e.phase || g.s.enraged !== e.enraged || !near(g.s.phaseFlashT, e.phaseFlashT) || g.s.popOn !== e.popOn) { phaseOk = false; bad ||= `step ${i}: phase ${g.s.phase} vs ${e.phase}, pop ${g.s.popOn} vs ${e.popOn}`; }
    if (g.s.popOn) pops++;
    if ((g.tell === 1) !== e.tell) { tellOk = false; bad ||= `step ${i}: tell ${g.tell} vs ${e.tell}`; }
    if (!near(g.sq, e.sq) || !near(g.sqV, e.sqV)) { sqOk = false; bad ||= `step ${i}: sq ${g.sq} vs ${e.sq}`; }
    if (!near(g.s.rotY, e.rotY) || !near(g.s.rotX, e.rotX)) { spinOk = false; bad ||= `step ${i}: spin`; }
    const want = e.shots || [];
    if (shots.length !== want.length) { shotsOk = false; bad ||= `step ${i}: ${shots.length} bullets vs ${want.length}`; continue; }
    if (!shots.length) continue;
    volleys[e.phase]++;
    const got = shots.map((b) => Math.atan2(b.vz, b.vx)).sort((p, q) => p - q);
    const exp = want.map((a) => Math.atan2(Math.sin(a), Math.cos(a))).sort((p, q) => p - q);
    for (let k = 0; k < got.length; k++) if (angDiff(got[k], exp[k]) > 1e-9) { shotsOk = false; bad ||= `step ${i}: angle ${got[k]} vs ${exp[k]}`; }
    for (const b of shots) {
      if (!(near(b.px, e.x0) && near(b.pz, e.z0) && near(Math.hypot(b.vx, b.vz), T.bullets.gelSpeed) && b.color === S.bulletColor && b.src === 'omega' && !b.hero && b.r === T.bullets.gelRadius)) {
        shotsOk = false; bad ||= `step ${i}: a bullet's origin, speed, colour or source`;
      }
    }
  }
  check('25 s of the three acts: the orbit matches 1.x\'s frame for frame (sign, band, radial, tangent, 1.18, 1.45)', posOk, bad);
  check('… the acts turn where 1.x\'s turn, and the pop clock runs 0.5 s down', phaseOk, bad);
  // 1.x wears the pop on every frame its clock is > 0 before the countdown: 0.5 by 1/60 — 31 frames at an
  // exact 60 Hz, since thirty steps of 1/60 leave a hair of the 0.5 (the same float arithmetic, so the same count)
  let popFrames = 0; for (let p = 0.5; p > 0; p -= 1 / 60) popFrames++;
  check(`… and each act change wears the pop for 1.x's ${popFrames} frames (its last is the one that takes the clock to 0)`, pops === 2 * popFrames && popFrames >= 30, `${pops} vs 2 × ${popFrames}`);
  check('… every volley lands on 1.x\'s step, with 1.x\'s count and angles, from where the step began, at 7 u/s in 0x66f2ff', shotsOk, bad);
  check('… each act fired: fans, then spiral pairs, then rings', volleys[1] >= 5 && volleys[2] >= 20 && volleys[3] >= 10, JSON.stringify(volleys));
  check('… the tell is 1.x\'s: the last 0.25 s of the clock (all of act two, whose period is 0.24)', tellOk, bad);
  check('… the squash spring is 1.x\'s non-blob one, through three hit kicks', sqOk, bad);
  check('… and the crystal turns 0.6 / 0.25 rad/s', spinOk, bad);
  check('the core keeps it inside the walls', Math.abs(g.x) <= w.hx - g.r + 1e-9 && Math.abs(g.z) <= w.hz - g.r + 1e-9);
}

// ── the acts: by hp, only ever up; a non-boss has one act ─────────────
{
  const { w, g } = world();
  g.hp = 10; step(w, IDLE);
  check('15–10 hp is act one (10/15 > 0.66)', g.s.phase === 1 && !g.s.enraged && !evs(w, 'phase').length);
  g.hp = 9; step(w, IDLE);
  const p2 = evs(w, 'phase');
  check('9 hp (0.6 ≤ 0.66) turns act two, with a phase event and the 0.5 s pop (1.x enemy.js:1689-1693)',
    g.s.phase === 2 && !g.s.enraged && p2.length === 1 && p2[0].phase === 2 && p2[0].id === g.id && near(g.s.phaseFlashT, 0.5 - dt) && g.s.popOn);
  check('… the event is 1.x\'s popup: `BOSS PHASE 2!` for 1.1 s, with its 0.3 shake (main.js:10401-10404)',
    p2[0].label === 'BOSS PHASE 2!' && p2[0].dur === 1.1 && p2[0].shake === 0.3 && evs(w, 'shake').some((e) => e.amount === 0.3 && e.id === g.id));
  g.hp = 5; step(w, IDLE);
  check('5 hp (0.333 > 0.33) is still act two', g.s.phase === 2 && !evs(w, 'phase').length);
  g.hp = 4; step(w, IDLE);
  const p3 = evs(w, 'phase');
  check('4 hp turns act three: enraged', g.s.phase === 3 && g.s.enraged && p3.length === 1 && p3[0].phase === 3 && p3[0].label === 'BOSS PHASE 3!');
  g.hp = 15; step(w, IDLE);
  check('an act never goes back', g.s.phase === 3 && g.s.enraged);
  // the pop's clock holds while a hit flash is on (1.x enemy.js:2650-2669),
  // frame for frame: the hit that turns the act lands just before it does
  // (as heroBulletsHit leaves it), a second one mid-pop; 1.x's chain is
  // `if (_flashT > 0) _flashT −= dt; else if (_phaseFlashT > 0) _phaseFlashT −= dt`
  const { w: w2, g: g2 } = world();
  const hitAfter = new Set([0, 15]);
  let fT = 0, pT = 0, popOk = true, held = 0, popBad = '', popWorn = 0, popWant = 0;
  for (let i = 1; i <= 50; i++) {
    if (hitAfter.has(i - 1)) { g2.flash = T.gel.flash; g2.sqV += T.gel.sq.hit; fT = 0.12; if (i === 1) g2.hp = 9; }
    step(w2, IDLE);
    if (i === 1) pT = 0.5;
    let wear = false;
    if (fT > 0) { fT -= dt; held++; } else if (pT > 0) { wear = true; pT -= dt; }
    if (wear) popWant++;
    if (g2.s.popOn) popWorn++;
    if (g2.s.popOn !== wear) { popOk = false; popBad ||= `step ${i}: pop worn ${g2.s.popOn} vs ${wear}`; }
    if (!near(g2.s.phaseFlashT, pT, 1e-12)) { popOk = false; popBad ||= `step ${i}: ${g2.s.phaseFlashT} vs ${pT}`; }
  }
  check('the pop\'s clock holds while the hit flash is on — 8 frames a hit, as 1.x\'s, not the core\'s 7', popOk && held === 16, popBad || `${held}`);
  check('… and the pop is worn on exactly the frames 1.x\'s chain reaches it', popWorn === popWant && popWant >= 30, `${popWorn} vs ${popWant}`);
  const { w: w4, g: g4 } = world({ o: { affix: 'volatile' } });
  g4.hp = 9; run(w4, 30);
  check('… and for good under a VOLATILE fuse, which outranks it in 1.x\'s chain', near(g4.s.phaseFlashT, 0.5) && !g4.s.popOn);
  const { w: w3, g: g3 } = world({ boss: false });
  g3.hp = 1; run(w3, 2);
  check('a non-boss OMEGA stays in act one whatever its hp (1.x enemy.js:1688)', g3.s.phase === 1 && !g3.s.enraged && !evs(w3, 'phase').length);
}

// ── the orbit: speeds, the band, the radial, the wave's scale ─────────
{
  const speedOf = (w, g) => { const x = g.x, z = g.z; step(w, IDLE); return Math.hypot(g.x - x, g.z - z) / dt; };
  const { w, g } = world();
  check('in the band (7.5 ± 1.5) the orbit is pure tangent at 1.3 u/s', near(speedOf(w, g), 1.3, 1e-9) && near(Math.hypot(g.x, g.z), 7.5, 1e-3));
  g.hp = 9; step(w, IDLE);
  check('act two: × 1.18 → 1.534 u/s', near(speedOf(w, g), 1.3 * 1.18, 1e-9));
  g.hp = 4; step(w, IDLE);
  check('act three: × 1.45 → 1.885 u/s', near(speedOf(w, g), 1.3 * 1.45, 1e-9));
  // beyond the band it closes at half speed on top of the tangent
  const far = world({ x: 12, z: 0 });
  const sign = far.g.s.orbitSign;
  step(far.w, IDLE);
  check('beyond 9 it closes: radial −0.5 × 1.3 in x, the tangent 1.3 in z (in its sign)',
    near(far.g.x, 12 - 0.5 * 1.3 * dt) && near(far.g.z, -sign * 1.3 * dt));
  const close = world({ x: 3, z: 0 });
  step(close.w, IDLE);
  check('inside 6 it backs off: radial +0.5 × 1.3', near(close.g.x, 3 + 0.5 * 1.3 * dt));
  const two = world({ x: 7.5, z: 0 });
  two.g.hp = 9; step(two.w, IDLE);
  const d0 = Math.hypot(two.g.x, two.g.z); step(two.w, IDLE);
  check('act two wants 6.2: at 7.5 (inside 6.2 ± 1.5) still pure tangent', near(Math.hypot(two.g.x, two.g.z), d0, 2e-4));
  const twoFar = world({ x: 8, z: 0 }); twoFar.g.hp = 9; step(twoFar.w, IDLE);
  const x0 = twoFar.g.x; step(twoFar.w, IDLE);
  check('… and at 8 (past 7.7) it closes', twoFar.g.x < x0 - 0.3 * 1.3 * 1.18 * dt);
  // the sign is the run's seed
  const signs = new Set();
  for (let seed = 1; seed <= 12; seed++) signs.add(world({ seed }).g.s.orbitSign);
  check('the orbit sign is ±1 by the seed (1.x enemy.js:702)', signs.size === 2 && [...signs].every((s) => s === 1 || s === -1));
  check('it faces the hero from where its step began', near(g.faceX, -g.px / Math.hypot(g.px, g.pz)) && near(g.faceZ, -g.pz / Math.hypot(g.px, g.pz)));
  // the wave's escalation: arcade-mode.md §5.3's table at wave 8
  const sc = waveScale(8);
  const w8 = world({ o: { speedMult: sc.speedMult } });
  check('at wave 8 it moves 2.25 u/s, enraged 3.26 (arcade-mode.md §5.3)', near(speedOf(w8.w, w8.g), 2.25, 0.02) && near(1.3 * sc.speedMult * 1.45, 3.26, 0.02),
    `${(1.3 * sc.speedMult).toFixed(3)} / ${(1.3 * sc.speedMult * 1.45).toFixed(3)}`);
}

// ── the clocks: assigned, × the wave's iM; the tell window ───────────
{
  const gaps = (w, g, n, setup) => {
    setup?.();
    const at = [];
    for (let i = 0; i < 2000 && at.length < n; i++) { step(w, IDLE); if (evs(w, 'gelShot').length) at.push(i); }
    return at.slice(1).map((t, k) => t - at[k]);
  };
  for (const iM of [1, waveScale(8).intervalMult]) {
    const { w, g } = world({ o: { intervalMult: iM } });
    const fan = gaps(w, g, 4);
    check(`act one fires every 0.9 × ${iM.toFixed(3)} s, in whole steps`, fan.every((n) => Math.abs(n * dt - 0.9 * iM) < dt), `${fan}`);
    const sp = gaps(w, g, 6, () => { g.hp = 9; });
    check(`act two every 0.24 × ${iM.toFixed(3)} s`, sp.every((n) => Math.abs(n * dt - 0.24 * iM) < dt), `${sp}`);
    const ri = gaps(w, g, 4, () => { g.hp = 4; });
    check(`act three every 0.7 × ${iM.toFixed(3)} s`, ri.every((n) => Math.abs(n * dt - 0.7 * iM) < dt), `${ri}`);
  }
  // the tell: g.tell = 1 for the last 0.25 s of the clock, and on in one run
  const { w, g } = world();
  let tells = 0, runs = 0, prev = 0, shot = 0;
  for (let i = 0; i < 400; i++) {
    step(w, IDLE);
    if (evs(w, 'gelShot').length) { shot++; if (shot === 2) break; if (shot === 1) { tells = 0; runs = 0; prev = g.tell; } continue; }
    if (shot === 1) { if (g.tell === 1) tells++; if (g.tell && !prev) runs++; prev = g.tell; }
  }
  check('between two fans the tell is on for the last 0.25 s (14–15 steps), in one run', tells >= 14 && tells <= 15 && runs === 1, `${tells} steps, ${runs} runs`);
  check('… and the fan ticks: its gelShot is not a spiral', evs(w, 'gelShot').length === 1 && evs(w, 'gelShot')[0].spiral === false);
  // act two: the act one clock it inherited runs out first, then the 0.24
  // period is inside the 0.25 window, so the crystal tells all the way through
  g.hp = 9;
  for (let i = 0; i < 200 && !g.s.spiralVolleys; i++) step(w, IDLE);
  check('act two\'s first pair waits out the clock act one left it', g.s.spiralVolleys === 1 && evs(w, 'gelShot')[0].spiral === true);
  let on = 0; for (let i = 0; i < 60; i++) { step(w, IDLE); on += g.tell; }
  check('act two\'s 0.24 period is inside the window: the crystal tells all the way through', on === 60, `${on} of 60`);
  check('… and its pairs are a spiral: no tick every 0.24 s (1.x\'s gels fire silently)', g.s.spiralVolleys >= 4);
}

// ── hits, the kill, no touch ──────────────────────────────────────────
{
  const { w, g } = world({ x: 5, z: 0 });
  // the hero holds the trigger with the aim on the crystal, wherever its orbit has taken it
  const aimAt = () => { const dx = g.x - w.hero.x, dz = g.z - w.hero.z, l = Math.hypot(dx, dz) || 1; return { ...FIRE, ax: dx / l, az: dz / l }; };
  let hitAt = -1;
  for (let i = 0; i < 60 && hitAt < 0; i++) { step(w, aimAt()); if (evs(w, 'hit').some((e) => e.id === g.id)) hitAt = i; }
  check('a hero bullet hits the 1.425 circle: an ordinary hit, 15 → 14, the flash, the squash', hitAt > 0 && g.hp === 14 && near(g.flash, T.gel.flash) && g.sqV < 0);
  const phases = [], shakes = [], score0 = w.score, grazes0 = w.grazes;
  let killed = null;
  for (let i = 0; i < 1200 && !killed; i++) {
    step(w, aimAt());
    for (const e of evs(w, 'phase')) phases.push(e);
    for (const e of evs(w, 'shake')) if (e.id === g.id) shakes.push(e.amount);
    killed = evs(w, 'kill').find((e) => e.id === g.id) || null;
  }
  check('shot down it passes act two then three, each announced as 1.x did: the popup for 1.1 s and a 0.3 shake (main.js:10398-10407)',
    phases.map((e) => e.phase).join(',') === '2,3' && phases.map((e) => e.label).join(',') === 'BOSS PHASE 2!,BOSS PHASE 3!'
    && phases.every((e) => e.dur === 1.1 && e.id === g.id) && shakes.join(',') === '0.3,0.3',
    `${phases.map((e) => e.phase)} / ${shakes}`);
  check('and dies as a boss: the kill event is flagged, one streak kill (1.x: no boss bonus)', killed && killed.boss && killed.kind === 'omega' && !g.alive && w.kills === 1
    && w.score - score0 - (w.grazes - grazes0) * T.graze.points === T.score.perKill, `${w.score - score0}`);
  // no contact damage
  const { w: w2, g: g2 } = world({ hero: [7.5, 0] });
  const lives = w2.hero.lives; run(w2, 60);
  check('standing on it costs nothing: a boss is not melee in classic (1.x main.js:2410-2421)', w2.hero.lives === lives && !evs(w2, 'hurt').length);
  // HARDCADE: a boss corpse blooms the RING (core, 1.x main.js:4390-4420)
  const hc = world({ mode: 'hardcade', x: 5, z: 0 });
  hc.w.wave = 8; hc.g.hp = 1;
  for (let i = 0; i < 60 && hc.g.alive; i++) step(hc.w, FIRE);
  for (let i = 0; i < 120 && hc.w.seeds.length; i++) step(hc.w, IDLE);   // v103: the corpse warns before it bites
  const rev = hc.w.bullets.filter((b) => b.revenge);
  check('in HARDCADE its corpse fires the boss ring of 14', !hc.g.alive && rev.length === Math.max(1, Math.round(T.revenge.ring.boss * T.revenge.density)), `${rev.length}`);
}

// ── the look: the crystal, the squash, the spin, the strobes, the aura ──
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'omega', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel of 1.x\'s omega family (uRadius 0.95, wobble 0.35, roughness 0.04, transmission 0.40)',
    v.own === true && matArgs[0] === 0x00eeff && matArgs[1] === 'omega' && matArgs[2] === 0.95 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.04) && near(v.mat.transmission, 0.40) && v.mesh.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);
  // the crystal: an icosahedron of radius 0.95, twenty faces, twelve corners
  const pos = v.mesh.geometry.getAttribute('position');
  let allOn = true; const corners = new Set();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (!near(Math.hypot(x, y, z), 0.95, 1e-6)) allOn = false;
    corners.add(`${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`);
  }
  check('the crystal is IcosahedronGeometry(0.95, 0): 20 flat faces, 12 corners, every one 0.95 out (1.x enemy.js:745)', pos.count === 60 && allOn && corners.size === 12, `${pos.count} verts, ${corners.size} corners`);
  // the aura ring: 0.82..1, scaled to 1.7 × r
  const ap = v.aura.geometry.getAttribute('position');
  let rMin = Infinity, rMax = 0;
  for (let i = 0; i < ap.count; i++) { const r = Math.hypot(ap.getX(i), ap.getY(i)); rMin = Math.min(rMin, r); rMax = Math.max(rMax, r); }
  check('the aura is a ring 0.82..1 (× 1.7 r when worn), flat, drawn, not added (v104: no glow), 0xffcc33 at 0.6', near(rMin, 0.82, 1e-6) && near(rMax, 1, 1e-6)
    && near(v.aura.rotation.x, -Math.PI / 2) && v.aura.position.y === 0.04 && v.auraMat.transparent && v.auraMat.blending === THREE.NormalBlending
    && v.auraMat.depthWrite === false && v.auraMat.side === THREE.DoubleSide && v.auraMat.opacity === 0.6 && v.auraMat.color.getHex() === 0xffcc33);

  // 1.x's own mesh matrix: T(x, centre, z) · R(rotX, rotY, 0; XYZ) · S(sx·m, sq·m, sx·m) (enemy.js:1001, 2419-2420, 2760)
  const want = (x, y, z, rx, ry, sx, sy) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0, 'XYZ')), new THREE.Vector3(sx, sy, sx));
  const same = (m, e, eps = 1e-9) => m.elements.every((a, i) => near(a, e.elements[i], eps));
  // what the view does around update(): the root at the body, the squash group (1/√sq, sq, 1/√sq) about the floor
  const sync = (g, w, time, grow = 1) => {
    v.root.position.set(g.x, 0, g.z);
    v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
    look.update(v, g, w, time, grow);
    v.root.updateMatrixWorld(true);
  };

  // a plain OMEGA: centre at 0.95, scale 1, no aura
  const plain = world({ boss: false, x: 10, z: 0 });
  sync(plain.g, plain.w, 0);
  check('the crystal\'s centre stands at 0.95, the CFG radius, at scale 1 (1.x enemy.js:1001)', same(v.mesh.matrixWorld, want(10, 0.95, 0, 0, 0, 1, 1)));
  check('off the boss wave there is no aura', !v.aura.visible);
  // a boss: the same crystal × 1.5, centre still at 0.95; the aura at 1.7 × 1.425
  const { w, g } = world({ x: 10, z: 0 });
  sync(g, w, 0);
  check('a boss is the same crystal × 1.5 about a centre still at 0.95 — 0.475 into the floor, as 1.x (main.js:9389, enemy.js:1001, 2760)',
    same(v.mesh.matrixWorld, want(10, 0.95, 0, 0, 0, 1.5, 1.5)));
  check('… wearing the aura at 1.7 × 1.425 = 2.4225, gold, breathing 0.45 at t = 0', v.aura.visible && near(v.aura.scale.x, 2.4225) && v.auraMat.color.getHex() === 0xffcc33 && near(v.auraMat.opacity, 0.45));
  const ap0 = new THREE.Vector3().setFromMatrixPosition(v.aura.matrixWorld);
  check('… flat on the floor under the crystal, unsquashed', near(ap0.x, 10) && near(ap0.y, 0.04) && near(ap0.z, 0));
  sync(g, w, 0.3);
  check('… 0.45 + 0.3·sin(5t)', near(v.auraMat.opacity, 0.45 + 0.3 * Math.sin(1.5)));
  g.s.enraged = true; g.s.phase = 3;
  sync(g, w, 0.3);
  check('enraged: the aura is red and scaled 1.15 + 0.1·sin(20t) (1.x main.js:10581-10583)',
    v.auraMat.color.getHex() === 0xff2200 && near(v.aura.scale.x, 2.4225 * (1.15 + 0.1 * Math.sin(6))));
  g.s.enraged = false; g.s.phase = 1;
  // the spin
  g.s.rotY = 1.2; g.s.rotX = 0.5;
  sync(g, w, 0);
  check('the crystal turns by the sim\'s angles: 0.6 / 0.25 rad/s about y / x, Euler XYZ (1.x enemy.js:2419-2420)',
    near(v.mesh.rotation.y, 1.2) && near(v.mesh.rotation.x, 0.5) && v.mesh.rotation.order === 'XYZ' && same(v.mesh.matrixWorld, want(10, 0.95, 0, 0.5, 1.2, 1.5, 1.5)));
  // squash: the mesh's own scale, so it squashes in the crystal's spinning frame, about its centre
  g.sq = 0.7;
  sync(g, w, 0);
  check('1.x\'s squash is the mesh\'s own scale (1/√sq, sq, 1/√sq) × 1.5, in its spinning frame, about a centre still at 0.95 (enemy.js:2733-2736, 2760)',
    same(v.mesh.matrixWorld, want(10, 0.95, 0, 0.5, 1.2, 1.5 / Math.sqrt(0.7), 0.7 * 1.5)));
  g.sq = 2e-3;                                     // the across-scale's floor: 1/√max(sq, 0.1)
  sync(g, w, 0);
  check('… with the across-scale floored at 1/√0.1 (enemy.js:2733)', near(v.mesh.scale.x, 1.5 / Math.sqrt(0.1)) && near(v.mesh.scale.y, 2e-3 * 1.5));
  g.sq = 1;
  // a body swelling into being grows from the floor
  sync(g, w, 0, 0.5);
  check('while it swells into being it grows from the floor', near(v.mesh.position.y, 0.475) && near(v.mesh.scale.x, 0.75));
  // the strobes
  sync(g, w, 0);
  g.flash = 0; g.s.phaseFlashT = 0; g.s.popOn = false; g.tell = 1; g.s.phase = 1;
  look.update(v, g, w, 0.05, 1);   // sin(1.5) > 0
  check('the fire tell: cyan 0x0088aa while sin(30t) > 0 in act one', v.mat.emissive.getHex() === 0x0088aa);
  look.update(v, g, w, 0.12, 1);   // sin(3.6) < 0
  check('… black on the other half', v.mat.emissive.getHex() === 0x000000);
  g.s.phase = 2; look.update(v, g, w, 0.05, 1);
  check('… amber 0x885500 in act two', v.mat.emissive.getHex() === 0x885500);
  g.s.phase = 3; look.update(v, g, w, 0.05, 1);
  check('… red 0xaa2200 in act three', v.mat.emissive.getHex() === 0xaa2200);
  g.s.phaseFlashT = 0.3; g.s.popOn = true;
  look.update(v, g, w, 0.01, 1);   // sin(0.6) > 0
  check('the phase pop outranks it: 0xffee88 while sin(60t) > 0', v.mat.emissive.getHex() === 0xffee88);
  look.update(v, g, w, 0.07, 1);   // sin(4.2) < 0
  check('… 0xff5500 on the other half', v.mat.emissive.getHex() === 0xff5500);
  g.flash = 0.1; v.mat.emissive.setScalar(0.6);
  look.update(v, g, w, 0.01, 1);
  check('the hit flash outranks both: the core\'s white is left alone', near(v.mat.emissive.r, 0.6) && near(v.mat.emissive.g, 0.6));
  g.flash = 0; g.affix = 'volatile'; v.mat.emissive.setHex(0x662200);
  look.update(v, g, w, 0.01, 1);
  check('… and so does a VOLATILE fuse: the core\'s smoulder is left alone', v.mat.emissive.getHex() === 0x662200);
  g.affix = null; g.s.phaseFlashT = 0; g.s.popOn = false; g.tell = 0;

  // the death: the core resets the squash group and swells the root by k about the floor;
  // 1.x swelled the crystal about its centre, the squash reset and the spin stopped
  g.sq = 0.8; g.s.rotY = 2.0; g.s.rotX = 0.7;
  sync(g, w, 0);
  for (const dyingT of [0.27, 0.14, 0.01]) {
    const k = 1 + (1 - dyingT / T.blob.death) * T.blob.deathSwell;
    v.dyingT = dyingT; v.squash.scale.setScalar(1); v.root.scale.setScalar(k);       // what the core does (actors.js stepFx)
    v.root.updateMatrixWorld(true);
    check(`dying (${dyingT} s left): a uniform 1.5 × ${k.toFixed(3)} about a centre still at 0.95, the spin where it stopped, no aura (1.x enemy.js:2981, 3013-3029)`,
      same(v.mesh.matrixWorld, want(10, 0.95, 0, 0.7, 2.0, 1.5 * k, 1.5 * k)) && !v.fx.visible);
  }
  v.dyingT = 0; v.root.scale.setScalar(1); g.sq = 1;
  // a pooled one comes back clean
  look.reset(v);
  sync(g, w, 0);
  check('reset: a pooled view comes back with the aura worn again, and the crystal where it should be', v.aura.visible && v.fx.visible && same(v.mesh.matrixWorld, want(10, 0.95, 0, 0.7, 2.0, 1.5, 1.5)));
  look.reset(v);
  check('… and reset itself leaves no aura, 0.6 opacity, an unturned crystal', !v.aura.visible && v.auraMat.opacity === 0.6 && v.mesh.rotation.y === 0 && v.body.scale.x === 1);
}

if (failed) { console.log(`✗ omega: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ omega: ${passed} checks`);
