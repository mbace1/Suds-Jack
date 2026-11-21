#!/usr/bin/env node
// orange.mjs — ORANGE CUBE's own checks, in bare node: 1.x's numbers
// (enemy.js:584, 738, 1000, 1209-1214, 1222-1227, 1486-1579, 2361-2397,
// 2657-2658, 2739-2740, 2770-2777, 3013-3029; tuning.js:56-62, 303, 496, 510;
// bullet.js:91-107; crowd.js:107-116; main.js:2410-2420, 5030), asserted
// against the sim stepping on its fixed 1/60 s, and its look against a real
// three. Timing is checked against 1.x's own per-frame countdown arithmetic.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=159';
import { TUNING as T } from '../../js/tuning.js?v=159';
import { waveScale } from '../../js/sim/director/arcade.js?v=159';
import { revengeColor } from '../../js/sim/color.js?v=159';
import { makeRng } from '../../js/sim/rng.js?v=159';
import behaviour from '../../js/sim/species/orange.js?v=159';
import look from '../../js/render/looks/orange.js?v=159';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.orange, F = S.flop, W = S.wall, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const [K, C] = T.gel.sq.cube;
const L0 = F.halfExtent * S.radius, D0 = L0 * Math.SQRT2;
const QUIET = 1e9;                         // a wall clock that never comes round
const D8 = 0.707;

// a world with nothing in it but one ORANGE CUBE, the hero where asked and
// never out of lives; anchored (no swarm forces, no crowd) unless asked, so
// what moves it is its own step
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true, quiet = false } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'orange', x, z, o);
  g.anchored = anchored;
  if (quiet) g.s.fireT = QUIET;
  return { w, g };
}
// force a target (the flop rule, not the target rule, is under test)
const aim = (g, tx, tz) => { g.s.hasTarget = true; g.s.tx = tx; g.s.tz = tz; g.s.moveT = 0; };
// 1.x's own frame arithmetic
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };   // a countdown
const stepsUp = (dur) => { let t = 0, n = 0; while (!(Math.min(1, t / dur) >= 1)) { t += dt; n++; } return n; }; // a flop
const sprung = (sq, sqV, kick) => (sqV - (sq - 1) * K) * C + kick;
const cycleOf = (spd, rm = 1) => { const L = F.halfExtent * S.radius * rm, c = (2 * L) / Math.max(spd, F.minSpeed), f = Math.min(F.timeMax, c * F.shareOfCycle); return { L, stride: 2 * L, cycle: c, flop: f, rest: Math.max(F.restMin, c - f) }; };
const until = (w, pred, max = 600) => { for (let i = 1; i <= max; i++) { step(w, IDLE); if (pred()) return i; } return -1; };
const shotsOf = (w) => w.events.filter((e) => e.type === 'gelShot' && e.kind === 'orange');
const wallOf = (w) => w.bullets.filter((b) => !b.hero && b.src === 'orange' && !b.revenge);
// 1.x's eight headings and the one it snaps a bearing to: the nearest by angle
const COMPASS = [[1, 0], [-1, 0], [0, 1], [0, -1], [D8, D8], [-D8, D8], [D8, -D8], [-D8, -D8]];

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.75, hp 4, speed 1.4 (1.x enemy.js:584)', S.radius === 0.75 && S.hp === 4 && S.speed === 1.4);
  check('CFG: body 0xff8800, bullets 0xff6600; its fireInterval 3.2 is carried, never read', S.color === 0xff8800 && S.bulletColor === 0xff6600 && S.fireInterval === 3.2);
  check('a rounded cube, DRIFTER, no contact damage in classic, bites AIMED (1.x tuning.js:303, 496, 510; main.js:2410-2420)',
    S.family === 'cube' && S.role === 'DRIFTER' && S.contact === false && S.revenge === 'AIMED');
  check('the death screen calls it 1.x\'s "orange cube" (main.js:5030)', S.deathLabel === 'orange cube');
  const R = T.movement.roles.DRIFTER;
  check('DRIFTER is 1.x\'s: dodge 0.3, flock 0.6, current 1.0, weave 0.25 (1.x tuning.js:287-319)', R.dodge === 0.3 && R.flock === 0.6 && R.current === 1.0 && R.weave === 0.25);
  check('the target: 6 + U·3 from you, clamped ±10, re-picked within 2.6 or after 5 s (1.x enemy.js:1573-1577, 2367)',
    S.target.ring[0] === 6 && S.target.ring[1] === 9 && S.target.box === 10 && S.target.arrive === 2.6 && S.target.giveUp === 5);
  check('the flop: arc 135° → 45°, −0.32 landing, ≤ 0.30 s and 0.65 of the cycle (1.x tuning.js:58-60)',
    F.arcStartDeg === 135 && F.arcEndDeg === 45 && F.landSquish === -0.32 && F.timeMax === 0.30 && F.shareOfCycle === 0.65);
  check('half-extent 0.9 r (a 1.8 r box), rests ≥ 0.02 s, speed floor 0.01, first rest U·0.25 (1.x enemy.js:738, 1213, 1497, 1501, 1564)',
    F.halfExtent === 0.9 && F.restMin === 0.02 && F.minSpeed === 0.01 && F.firstRest[0] === 0 && F.firstRest[1] === 0.25 && F.keep === 0.7);
  check('the wall: first 1.5–2.5 s, then 3.0–4.5 s apart (1.x enemy.js:1227, 2392)', W.firstShot[0] === 1.5 && W.firstShot[1] === 2.5 && W.cadence[0] === 3.0 && W.cadence[1] === 4.5);
  check('the wall: min(12, 6 + 2·⌊(1 − iM)/0.09⌋) bullets, 4.0 wide, diagonals 0.707, 7 u/s (1.x enemy.js:1225-1226, 2379, 2389)',
    W.shots === 6 && W.shotsPerTier === 2 && W.shotsMax === 12 && W.tierStep === 0.09 && W.width === 4.0 && W.diag === 0.707 && W.bulletSpeedMult === 1);
  check('the strobe: the last 0.6 s, 0x442200 / black at 20 rad/s (1.x enemy.js:2657-2658)',
    S.tellTime === 0.6 && S.look.strobeOn === 0x442200 && S.look.strobeOff === 0 && S.look.strobeRate === 20);
  const lk = S.look;
  check('the look: RoundedBox corner 0.18, 4 segments (enemy.js:738); breath 0.10 at 2.4 rad/s, half across (tuning.js:61, enemy.js:2773-2775)',
    lk.corner === 0.18 && lk.segments === 4 && lk.breatheAmp === 0.10 && lk.breatheRate === 2.4 && lk.breatheXZ === 0.5 && lk.sqFloor === 0.1);
  const src = readFileSync(new URL('../../js/sim/species/orange.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits, no death of its own, the core\'s circle and no contact', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:1209-1214, 1222-1227) ───────────
{
  const rests = [], fires = [];
  let fresh = true;
  for (let seed = 1; seed <= 300; seed++) {
    const { g } = world({ seed });
    rests.push(g.s.rest); fires.push(g.s.fireT);
    fresh &&= g.s.flopping === false && g.s.hasTarget === false && g.s.moveT === 0 && g.s.shots === 6;
  }
  check('it starts at rest, with no target yet (1.x picks it on the first update) and a wall of 6', fresh);
  check('the first rest is in [0, 0.25) and spread over it', rests.every((t) => t >= 0 && t < 0.25) && Math.min(...rests) < 0.01 && Math.max(...rests) > 0.24);
  check('the first wall is 1.5–2.5 s away, spread over it (1.x `1.5 + rand`)', fires.every((t) => t >= 1.5 && t < 2.5) && Math.min(...fires) < 1.52 && Math.max(...fires) > 2.48);
  // the count is fixed at spawn from the wave's intervalMult
  for (const [iM, n] of [[1, 6], [0.945, 6], [0.89, 8], [0.835, 8], [0.78, 10], [0.725, 12], [0.505, 12], [0.35, 12]]) {
    const { g } = world({ o: { intervalMult: iM } });
    check(`iM ${iM}: a wall of ${n} (bullets-graze.md §5.3)`, g.s.shots === n, `${g.s.shots}`);
  }
  const byWave = [1, 2, 3, 4, 5, 6, 8, 10, 26].map((wave) => world({ o: { intervalMult: waveScale(wave).intervalMult } }).g.s.shots);
  check('by the director\'s own waves: 6 6 8 8 10 12 12 12 12 (waves 1-6, 8, 10, 26)', byWave.join(' ') === '6 6 8 8 10 12 12 12 12', byWave.join(' '));
}

// ── where it goes: the target (1.x enemy.js:1572-1579, 2363-2369) ────
{
  const ds = [], quads = new Set();
  let boxed = true;
  for (let seed = 1; seed <= 400; seed++) {
    const { w, g } = world({ seed, x: 15, z: 8, hero: [0, 0], quiet: true });
    step(w, IDLE);
    const d = Math.hypot(g.s.tx, g.s.tz);
    ds.push(d); quads.add(`${Math.sign(g.s.tx)},${Math.sign(g.s.tz)}`);
    boxed &&= g.s.hasTarget && Math.abs(g.s.tx) <= 10 && Math.abs(g.s.tz) <= 10;
  }
  check('its first step picks a target 6–9 from you (unclamped with you mid-arena)', ds.every((d) => d >= 6 - 1e-12 && d < 9) && Math.min(...ds) < 6.05 && Math.max(...ds) > 8.95, `${Math.min(...ds)} ${Math.max(...ds)}`);
  check('…at any angle', quads.size === 4 && boxed);
  let clamped = 0, inBox = true;
  for (let seed = 1; seed <= 300; seed++) {
    const { w, g } = world({ seed, x: -10, z: 0, hero: [16, 9], quiet: true });
    step(w, IDLE);
    inBox &&= g.s.tx <= 10 && g.s.tz <= 10 && g.s.tx >= -10 && g.s.tz >= -10;
    if (g.s.tx === 10 || g.s.tz === 10) clamped++;
  }
  check('with you in a corner, the target is clamped into the ±10 box (v47: it must be reachable)', inBox && clamped > 200, `${clamped}`);

  // resting within 2.6: a new target that step, and no flop — so the rest does not count down
  const a = world({ x: 0, z: 0, hero: [-12, 0], quiet: true });
  aim(a.g, 2.5, 0); a.g.s.rest = 0.1;
  step(a.w, IDLE);
  check('resting within 2.6 of its target it picks a new one, and that step it does not flop (its rest holds)',
    !(a.g.s.tx === 2.5 && a.g.s.tz === 0) && a.g.s.moveT === 0 && a.g.s.rest === 0.1 && !a.g.s.flopping);
  const b = world({ x: 0, z: 0, hero: [-12, 0], quiet: true });
  aim(b.g, 2.61, 0); b.g.s.rest = 0.1;
  step(b.w, IDLE);
  check('…at 2.61 it keeps it, and the rest counts down', b.g.s.tx === 2.61 && near(b.g.s.rest, 0.1 - dt, 1e-15) && near(b.g.s.moveT, dt, 1e-15));
  // mid-flop it never re-picks, however close
  const c = world({ x: 0, z: 0, hero: [-12, 0], quiet: true });
  aim(c.g, 2.7, 0); c.g.s.rest = 0.001;
  step(c.w, IDLE);
  let held = c.g.s.flopping, steps = 0;
  while (c.g.s.flopping && steps++ < 60) { step(c.w, IDLE); held &&= c.g.s.tx === 2.7 || !c.g.s.flopping; }
  check('mid-flop it holds its target even inside 2.6 (1.x `!_flopActive &&`)', held && Math.hypot(c.g.x - 2.7, c.g.z) < 2.6);
  // the give-up: more than 5 s of chasing, at rest
  const d = world({ x: 0, z: 0, hero: [-12, 0], quiet: true });
  aim(d.g, 9, 0); d.g.s.rest = 1; d.g.s.moveT = 5 - dt - 1e-9;
  step(d.w, IDLE);
  check('chasing 5 s is not yet giving up', d.g.s.tx === 9 && d.g.s.moveT > 5 - 1e-6);
  step(d.w, IDLE);
  check('…past 5 s, at rest, it gives up and picks another', d.g.s.tx !== 9 && d.g.s.moveT === 0);
  // an unreachable target is dropped after 5 s, at the first rest past it
  const e = world({ x: -15, z: -8, hero: [-12, 0], quiet: true });
  aim(e.g, 15, 8);
  let n = 0, chased = 0;
  while (e.g.s.tx === 15 && n++ < 1200) { const was = { m: e.g.s.moveT, f: e.g.s.flopping }; step(e.w, IDLE); if (e.g.s.tx === 15) chased = e.g.s.moveT; else check('…the step it drops it, it was resting and past 5 s', !was.f && was.m + dt > 5, JSON.stringify(was)); }
  const cyc = cycleOf(S.speed);
  check('a target 30 u off is chased for just over 5 s (within one rest), then dropped', n * dt > 5 && n * dt <= 5 + cyc.rest + 2 * dt, `${n * dt}`);
}

// ── one flop on a FREE heading (1.x enemy.js:1509-1513, 1542-1565) ───
{
  const { w, g } = world({ x: -4, z: 1, hero: [12, -8], quiet: true });
  aim(g, -4 + 3, 1 + 4);                                   // the target 3 across, 4 down: heading (0.6, 0.8)
  g.s.rest = 0.001;
  const spd = S.speed, { L, stride, flop } = cycleOf(spd);
  const log = [];
  let x0 = null, kinematic = true, lifted = 0;
  for (let i = 0; i < 60; i++) {
    const pre = { sq: g.sq, sqV: g.sqV };
    step(w, IDLE);
    if (x0 == null && g.s.flopping) x0 = { x: g.s.x0, z: g.s.z0, dx: g.s.dirX, dz: g.s.dirZ };
    if (!g.s.tumble) { if (x0) break; continue; }
    const p = Math.min(1, g.s.t / g.s.dur), ang = (135 - 90 * p) * Math.PI / 180;
    const disp = p >= 1 ? stride : L + D0 * Math.cos(ang);
    kinematic &&= near(g.x, x0.x + x0.dx * disp, 1e-12) && near(g.z, x0.z + x0.dz * disp, 1e-12) && near(g.s.lift, p >= 1 ? L : D0 * Math.sin(ang), 1e-12);
    lifted = Math.max(lifted, g.s.lift);
    log.push({ p, landed: !g.s.flopping, sqV: g.sqV, rest: g.s.rest, pre });
  }
  check('it flops straight at its target, diagonally: heading (0.6, 0.8), not a cardinal', x0 && near(x0.dx, 0.6, 1e-12) && near(x0.dz, 0.8, 1e-12) && x0.x === -4 && x0.z === 1, JSON.stringify(x0));
  check('it faces its heading', near(g.faceX, 0.6, 1e-12) && near(g.faceZ, 0.8, 1e-12));
  check('the flop lasts min(0.30, 0.65·cycle) = 0.30 s at speed 1.4, on 1.x\'s frame arithmetic', log.length === stepsUp(flop) && near(g.s.dur, flop), `${log.length} steps`);
  check('each step the centre sits L + D·cos(ang) along the heading and D·sin(ang) up, ang 135° → 45° linear in time', kinematic);
  check('it lifts to D = L√2 = 0.955 at the top of the arc', near(lifted, D0, 3e-3) && lifted <= D0 + 1e-12, `${lifted}`);
  check('a flop advances exactly one face, 2L = 1.35, along the diagonal', near(Math.hypot(g.x - x0.x, g.z - x0.z), 1.35, 1e-12) && near((g.z - x0.z) / (g.x - x0.x), 4 / 3, 1e-12));
  const land = log[log.length - 1];
  check('the landing kicks the squash spring flat: −0.32 (1.x enemy.js:1561)', land.landed && near(land.sqV, sprung(land.pre.sq, land.pre.sqV, F.landSquish), 1e-12));
  check('and it rests for the rest of the cycle, max(0.02, cycle − flop)', near(land.rest, cycleOf(spd).rest, 1e-12), `${land.rest}`);
}

// ── the cadence: cycle = 2L / spd, so the average ground speed is spd ──
for (const [wave, flopWant, restWant] of [[1, 0.300, 0.627], [2, 0.300, 0.544], [6, 0.300, 0.322], [10, 0.300, 0.205]]) {
  const mult = waveScale(wave).speedMult;
  const { w, g } = world({ x: -16, z: 0, hero: [0, -9], quiet: true, o: { speedMult: mult } });
  aim(g, 18, 0);                                            // far beyond the arena: it never arrives
  const c = cycleOf(S.speed * mult);
  check(`wave ${wave} (×${mult.toFixed(3)}): flop ${flopWant} s, rest ${restWant} s (spec §6.3: wave 2 is 0.30 + 0.54)`, near(c.flop, flopWant, 6e-4) && near(c.rest, restWant, 6e-4), `${c.flop} ${c.rest}`);
  const lands = [];
  for (let i = 1; i <= 290; i++) {                          // inside the 5 s give-up
    const was = g.s.flopping;
    step(w, IDLE);
    if (was && !g.s.flopping) lands.push(i);
  }
  const gaps = lands.slice(1).map((v, k) => v - lands[k]);
  const want = stepsDown(c.rest) + stepsUp(c.flop) - 1;
  check(`wave ${wave}: every cycle is one rest and one flop on 1.x's frame arithmetic (${want} steps)`, gaps.length >= 4 && gaps.every((k) => k === want), gaps.join(' '));
  const pace = (gaps.length * c.stride) / (gaps.reduce((a, b) => a + b, 0) * dt);
  check(`wave ${wave}: its ground speed is spd = ${(S.speed * mult).toFixed(3)} u/s, to the step`, Math.abs(pace / (S.speed * mult) - 1) < 1 / want + 1e-9, `${pace}`);
}

// ── the walls turn it back (1.x enemy.js:1527-1531) ──────────────────
{
  const w0 = createWorld({});
  const cases = [
    { at: [0, w0.hz - 1.5], to: [1, 14], want: [0, -1], name: 'the bottom wall: a steep heading into it is turned back along z' },
    { at: [w0.hx - 1.5, 0], to: [21, 1], want: [-1, 0], name: 'the right wall: turned back along x' },
    { at: [-(w0.hx - 1.5), -(w0.hz - 1.5)], to: [-21, -13], want: [1, 0], name: 'a corner: x is asked first' },
    { at: [0, w0.hz - 2.5], to: [1, 14], want: null, name: 'a stride short of the wall it keeps its heading' },
  ];
  for (const k of cases) {
    const { w, g } = world({ x: k.at[0], z: k.at[1], hero: [0, 0], quiet: true });
    aim(g, k.to[0], k.to[1]); g.s.rest = 0.001;
    step(w, IDLE);
    const hx = k.to[0] - k.at[0], hz = k.to[1] - k.at[1], hl = Math.hypot(hx, hz);
    const ok = k.want ? g.s.dirX === k.want[0] && g.s.dirZ === k.want[1] : near(g.s.dirX, hx / hl, 1e-12) && near(g.s.dirZ, hz / hl, 1e-12);
    check(k.name, g.s.flopping && ok, `${g.s.dirX},${g.s.dirZ}`);
  }
  // a long natural run with you in a corner: it never leaves the arena, and every landing is a whole face
  const { w, g } = world({ seed: 9, x: 0, z: 0, hero: [w0.hx - 0.6, w0.hz - 0.6], quiet: true });
  let inside = true, faces = true, x0 = 0, z0 = 0, landings = 0, diagonal = 0;
  for (let i = 0; i < 3600; i++) {
    const was = g.s.flopping;
    step(w, IDLE);
    if (!was && g.s.flopping) { x0 = g.s.x0; z0 = g.s.z0; if (Math.abs(g.s.dirX) > 1e-6 && Math.abs(g.s.dirZ) > 1e-6) diagonal++; }
    if (was && !g.s.flopping) { landings++; faces &&= near(Math.hypot(g.x - x0, g.z - z0), 1.35, 1e-9); }
    inside &&= Math.abs(g.x) <= w.hx - g.r + 1e-9 && Math.abs(g.z) <= w.hz - g.r + 1e-9;
  }
  check('chasing targets round you in a corner for 60 s it stays inside, a whole face a flop', inside && faces && landings > 60, `${landings}`);
  check('…and most of its flops are diagonal (a free heading)', diagonal > landings * 0.4, `${diagonal}/${landings}`);
}

// ── the wall (1.x enemy.js:2373-2395) ────────────────────────────────
{
  // the first one, on 1.x's countdown from its starting clock
  const { w, g } = world({ seed: 3, x: 6, z: 0, hero: [-6, 0] });
  g.s.rest = QUIET;                                          // a still cube: what is under test is the gun
  const t0 = g.s.fireT, ex = g.x, ez = g.z;
  const at = until(w, () => shotsOf(w).length > 0);
  check('the first wall leaves on 1.x\'s countdown from 1.5–2.5 s', at === stepsDown(t0), `${at} vs ${stepsDown(t0)}`);
  const bs = wallOf(w), ev = shotsOf(w)[0];
  check('a wall of 6 at wave 1, told as one gelShot', bs.length === 6 && ev.n === 6 && ev.id === g.id && near(ev.x, ex) && near(ev.z, ez));
  check('…every bullet 0xff6600, from `orange`, plain (not revenge, not homing), the gel bullet\'s size and life',
    bs.every((b) => b.color === 0xff6600 && b.src === 'orange' && !b.revenge && !b.homing && b.r === T.bullets.gelRadius && near(b.life, T.bullets.life - dt, 1e-12)));
  check('…all flying parallel, straight at you along −x at 7 u/s', bs.every((b) => near(b.vx, -7, 1e-9) && near(b.vz, 0, 1e-9)));
  const offs = bs.map((b) => b.pz - ez);
  check('…from a line through the cube square to the heading, 4.0 wide: −2 … +2, 0.8 apart (perp = (−fz, fx))',
    bs.every((b) => near(b.px, ex, 1e-12)) && offs.every((o, k) => near(o, 2 - k * 0.8, 1e-12)), offs.map((o) => o.toFixed(3)).join(' '));
  check('after it, a fresh clock 3.0–4.5 s and a fresh target', g.s.fireT >= 3.0 && g.s.fireT < 4.5 && g.s.moveT === 0 && g.s.hasTarget);
  check('…and no strobe the step it fires', g.tell === 0);

  // the cadence over a long run: never × intervalMult, every gap 1.x's countdown
  const run = (iM, seed) => {
    const r = world({ seed, x: 6, z: 0, hero: [-6, 0], o: { intervalMult: iM } });
    r.g.s.rest = QUIET;
    const fires = [], clocks = [r.g.s.fireT], ns = [];
    for (let i = 1; i <= 60 * 60; i++) {
      step(r.w, IDLE);
      const sh = shotsOf(r.w);
      if (sh.length) { fires.push(i); clocks.push(r.g.s.fireT); ns.push(sh[0].n); }
    }
    return { fires, clocks, ns };
  };
  const a = run(1, 7), b = run(0.35, 7);
  const gapsOk = a.fires.every((f, k) => (k === 0 ? f : f - a.fires[k - 1]) === stepsDown(a.clocks[k]));
  check('a minute of walls: each one on 1.x\'s countdown from the clock the last one set', gapsOk && a.fires.length >= 13, `${a.fires.length}`);
  const secs = a.fires.slice(1).map((f, k) => (f - a.fires[k]) * dt);
  check('…3.0–4.5 s apart, spread over it', secs.every((s) => s >= 3.0 && s < 4.5 + dt) && Math.min(...secs) < 3.4 && Math.max(...secs) > 4.1, secs.map((s) => s.toFixed(2)).join(' '));
  check('the cadence is not scaled by the wave: iM 0.35 fires on the same steps as iM 1 (seed alike)', a.fires.join() === b.fires.join());
  check('…only the count escalates: 6 against 12', a.ns.every((n) => n === 6) && b.ns.every((n) => n === 12));

  // the snap: the bearing to you, to the nearest of 8 compass headings
  let snapOk = true, count = 0;
  for (let deg = 3; deg < 360; deg += 10) {
    const th = deg * Math.PI / 180;
    const r = world({ x: 0, z: 0, hero: [Math.cos(th) * 5, Math.sin(th) * 5] });
    r.g.s.rest = QUIET; r.g.s.fireT = dt / 2;
    step(r.w, IDLE);
    const want = Math.round(th / (Math.PI / 4)) * (Math.PI / 4), bl = wallOf(r.w);
    snapOk &&= bl.length === 6 && bl.every((x) => angDiff(Math.atan2(x.vz, x.vx), want) < 1e-9);
    count++;
  }
  check('the heading snaps to the nearest of 8 compass directions, all round (36 bearings)', snapOk && count === 36);
  const tie = world({ x: 0, z: 0, hero: [Math.cos(Math.PI / 8) * 5, Math.sin(Math.PI / 8) * 5] });
  tie.g.s.rest = QUIET; tie.g.s.fireT = dt / 2; step(tie.w, IDLE);
  check('exactly between +x and the diagonal (22.5°) the cardinal wins: 1.x\'s diagonal is 0.707, a hair short', wallOf(tie.w).every((x) => near(x.vz, 0, 1e-12) && x.vx > 0));
  const top = world({ x: 2, z: 3, hero: [2, 3] });
  top.w.hero.mercy = 1e9; top.g.s.rest = QUIET; top.g.s.fireT = dt / 2; step(top.w, IDLE);
  check('on top of you it fires along +x (1.x\'s first heading wins a dead heat)', wallOf(top.w).length === 6 && wallOf(top.w).every((x) => x.vx > 0 && near(x.vz, 0, 1e-12)));

  // a diagonal wall: 1.x's raw (0.707, 0.707) heading and its perpendicular, unnormalised
  const dg = world({ x: 0, z: 0, hero: [4, 4], o: { intervalMult: waveScale(6).intervalMult } });
  dg.g.s.rest = QUIET; dg.g.s.fireT = dt / 2; step(dg.w, IDLE);
  const db = wallOf(dg.w), sp = 7 * Math.hypot(D8, D8);
  check('a diagonal wall of 12 at wave 6, every bullet along (0.707, 0.707) at 7 × 0.99985 u/s', db.length === 12 && db.every((x) => near(x.vx, D8 * 7, 1e-9) && near(x.vz, D8 * 7, 1e-9) && near(x.speed, sp, 1e-12)));
  check('…on the line square to it: (−0.707 t, 0.707 t), t = −2 … +2, 0.364 apart', db.every((x, k) => { const t = (k / 11 - 0.5) * 4; return near(x.px, -D8 * t, 1e-12) && near(x.pz, D8 * t, 1e-12); }));
  for (const [iM, n, gap] of [[1, 6, 0.8], [0.89, 8, 4 / 7], [0.78, 10, 4 / 9], [0.725, 12, 4 / 11]]) {
    const r = world({ x: 0, z: 0, hero: [0, 6], o: { intervalMult: iM } });
    r.g.s.rest = QUIET; r.g.s.fireT = dt / 2; step(r.w, IDLE);
    const bl = wallOf(r.w), xs = bl.map((x) => x.px);
    check(`iM ${iM}: ${n} bullets ${gap.toFixed(3)} apart, always 4.0 end to end, flying +z`, bl.length === n && near(Math.max(...xs) - Math.min(...xs), 4, 1e-12)
      && xs.every((x, k) => k === 0 || near(xs[k - 1] - x, gap, 1e-12)) && bl.every((x) => near(x.vz, 7, 1e-9)));
  }

  // it fires while it moves, from where it stood at the top of its step (1.x ex, ez)
  const mv = world({ x: -6, z: 0, hero: [8, 0] });
  aim(mv.g, 6, 0); mv.g.s.rest = 0.001; mv.g.s.fireT = QUIET;
  step(mv.w, IDLE); step(mv.w, IDLE); step(mv.w, IDLE);
  const before = { x: mv.g.x, z: mv.g.z };
  mv.g.s.fireT = dt / 2;
  step(mv.w, IDLE);
  const mb = wallOf(mv.w), cx = mb.reduce((s, b) => s + b.px, 0) / mb.length, cz = mb.reduce((s, b) => s + b.pz, 0) / mb.length;
  check('mid-flop it fires anyway, its tumble going on', mv.g.s.flopping && mb.length === 6);
  check('…the wall centred where the step began, not where the flop has carried it', near(cx, before.x, 1e-12) && near(cz, before.z, 1e-12) && mv.g.x > before.x + 0.01, `${cx} ${before.x} ${mv.g.x}`);
  check('…and the fire re-picks its target without breaking the flop in progress', mv.g.s.moveT === 0 && mv.g.s.tx !== 6);
}

// ── the strobe: the last 0.6 s of its clock (1.x enemy.js:2657) ───────
{
  const { w, g } = world({ seed: 5, x: 6, z: 0, hero: [-6, 0] });
  g.s.rest = QUIET;
  let agree = true, ramp = true, last = 0, told = 0, fired = 0, beforeFire = 0;
  for (let i = 0; i < 60 * 12; i++) {
    step(w, IDLE);
    agree &&= (g.tell > 0) === (g.s.fireT < 0.6) && g.tell >= 0 && g.tell < 1;
    if (shotsOf(w).length) { fired++; beforeFire = Math.max(beforeFire, last); ramp &&= g.tell === 0; told = 0; }
    else if (g.tell > 0) { ramp &&= g.tell > last || told === 0; told++; }
    last = g.tell;
  }
  check('g.tell is on exactly while its clock is under 0.6 s', agree && fired >= 2);
  check('…rising through the tell toward 1, and off the step it fires', ramp && beforeFire > 0.97, `${beforeFire}`);
}

// ── its touch does not hurt in classic; it is killed in 4 hits ────────
{
  const { w, g } = world({ x: 0.3, z: 0, hero: [0, 0], quiet: true });
  g.s.rest = QUIET;
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('standing in it for 2 s hurts nothing (not in MELEE_TYPES)', w.hero.lives === 1e9 && w.hero.mercy <= 0);
  for (const mode of ['arcade', 'hardcade']) {
    const r = world({ mode, x: 10, z: 0, hero: [0, 0], quiet: true });
    r.w.wave = 3; r.g.s.rest = QUIET;
    let ok = true;
    for (let k = 1; k <= 4; k++) {
      api.heroBullet(r.w, r.g.x - 0.5, r.g.z, 0);
      const pre = { sq: r.g.sq, sqV: r.g.sqV };
      step(r.w, IDLE);
      if (k < 4) ok &&= r.g.alive && r.g.hp === 4 - k && r.g.flash > 0 && near(r.g.sqV, sprung(pre.sq, pre.sqV, T.gel.sq.hit), 1e-12);
    }
    const kills = r.w.events.filter((e) => e.type === 'kill' && e.kind === 'orange');
    check(`${mode}: three hits flash and squash it (−0.75), the fourth kills it`, ok && !r.g.alive && kills.length === 1);
    check(`${mode}: a big body (0.75): the core\'s shockwave, puddle and chunks`, kills[0]?.big === true && kills[0].r === 0.75 && kills[0].color === 0xff8800);
    check(`${mode}: no children`, r.w.gels.length === 0);
    for (let i = 0; i < 120 && r.w.seeds.length; i++) step(r.w, IDLE);   // v103: the corpse warns before it bites
    const rv = r.w.bullets.filter((b) => b.revenge);
    if (mode === 'arcade') check('arcade: a corpse fires nothing', rv.length === 0);
    else {
      // 1.x's AIMED bite is 3 at ±0.14 (tuning.js:496-516); the core's
      // `density` knob scales the count, so read it rather than assume 1
      const R = T.revenge, n = Math.max(1, Math.round(R.aimed.count * R.density));
      const a0 = Math.atan2(r.w.hero.z - kills[0].z, r.w.hero.x - kills[0].x);
      const want = Array.from({ length: n }, (_, k) => a0 + (k - (n - 1) / 2) * R.aimed.spread);
      check(`hardcade wave 3: it bites AIMED — ${R.aimed.count} × density slow bullets ${R.aimed.spread} rad apart at you, in 1.x's dark blood 0xcb3200`,
        R.aimed.count === 3 && R.aimed.spread === 0.14 && rv.length === n && revengeColor('orange') === 0xcb3200
        && rv.every((b) => b.color === 0xcb3200 && near(b.speed, 7 * R.speedMult, 1e-12))
        && rv.every((b, k) => angDiff(Math.atan2(b.vz, b.vx), want[k]) < 1e-9), `${rv.length}`);
    }
  }
}

// ── the swarm forces stick only while it rests (species-b §10.4 trap 15) ──
{
  const { w, g } = world({ seed: 4, x: -6, z: 3, hero: [8, -2], anchored: false, quiet: true });
  let restMoved = 0, flopExact = true, x0 = null, origin = true, rests = 0;
  for (let i = 0; i < 600; i++) {
    const was = g.s.flopping, px = g.x, pz = g.z;
    step(w, IDLE);
    if (!was && !g.s.tumble) { rests++; restMoved = Math.max(restMoved, Math.hypot(g.x - px, g.z - pz)); }
    if (g.s.flopping && !was) x0 = [g.s.x0, g.s.z0];
    else if (g.s.tumble && x0) origin &&= g.s.x0 === x0[0] && g.s.z0 === x0[1];
    if (g.s.tumble && g.s.flopping) {
      const ang = (135 - 90 * Math.min(1, g.s.t / g.s.dur)) * Math.PI / 180, disp = L0 + D0 * Math.cos(ang);
      flopExact &&= near(g.x, g.s.x0 + g.s.dirX * disp, 1e-12) && near(g.z, g.s.z0 + g.s.dirZ * disp, 1e-12);
    }
  }
  check('resting, a DRIFTER is carried by the swarm forces', rests > 50 && restMoved > 0.005, `${restMoved}`);
  check('flopping, its position is written from the flop\'s origin (the forces of a flop step are lost)', flopExact);
  check('…and with nothing pushing it, the origin holds for the whole flop', origin);
}

// ── the crowd's nudge moves the tumble's origin, unclamped (1.x crowd.js:107-116) ──
{
  const ref = world({ x: -5, z: -2, hero: [12, 0], quiet: true }), poked = world({ x: -5, z: -2, hero: [12, 0], quiet: true });
  for (const r of [ref, poked]) { aim(r.g, 1, 2); r.g.s.rest = 0.001; }
  for (let i = 0; i < 6; i++) { step(ref.w, IDLE); step(poked.w, IDLE); }
  check('(both mid-flop, in step)', ref.g.s.flopping && poked.g.s.flopping && ref.g.x === poked.g.x);
  // a nudge between steps, as the crowd solver gives one (it records it in nudgedX/Z)
  poked.g.x += 0.1; poked.g.z -= 0.05; poked.g.nudgedX = 0.1; poked.g.nudgedZ = -0.05;
  let same = true;
  for (let i = 0; i < 40 && (ref.g.s.flopping || poked.g.s.flopping); i++) {
    step(ref.w, IDLE); step(poked.w, IDLE);
    same &&= near(poked.g.x - ref.g.x, 0.1, 1e-12) && near(poked.g.z - ref.g.z, -0.05, 1e-12);
  }
  check('a nudge mid-flop carries the rest of the tumble with it, and the landing', same && !poked.g.s.flopping);
  // 1.x adds the nudge to `_flopX0` BEFORE it clamps the position: a push into
  // the wall the clamp mostly refused still carries the whole tumble
  const wl = world({ x: 0, z: 0, hero: [0, -9], quiet: true }), wr = world({ x: 0, z: 0, hero: [0, -9], quiet: true });
  for (const r of [wl, wr]) {
    const hz = r.w.hz - r.g.r;
    r.g.z = r.g.px = r.g.pz = hz - 0.2; aim(r.g, 0, -9); r.g.s.rest = 0.001;   // tumbling away from the bottom wall
    step(r.w, IDLE);
  }
  check('(both tumbling away from the wall, in step)', wl.g.s.flopping && wl.g.s.dirZ < -0.99 && wl.g.z === wr.g.z);
  wl.g.z += 0.01; wl.g.nudgedZ = 0.06;                     // the solver pushed 0.06 toward the wall; the clamp let 0.01 through
  step(wl.w, IDLE); step(wr.w, IDLE);
  check('…the origin takes the unclamped 0.06, not the 0.01 the clamp let through', near(wl.g.s.z0 - wr.g.s.z0, 0.06, 1e-12) && near(wl.g.z - wr.g.z, 0.06, 1e-12), `${wl.g.z - wr.g.z}`);
  wl.g.x += 0.3;                                            // anything else that moves it mid-flop (a swarm force, a poke) is overwritten
  step(wl.w, IDLE); step(wr.w, IDLE);
  check('…and nothing but the crowd moves it: a mid-flop shove is lost', near(wl.g.x, wr.g.x, 1e-12));
  // the real crowd: two cubes chasing keep a pad apart and still flop in whole faces
  const w = createWorld({ seed: 3 });
  w.director = { step() {} };
  w.hero.x = w.hero.px = 12; w.hero.lives = 1e9;
  const a = api.spawn(w, 'orange', -6, 0), b = api.spawn(w, 'orange', -6, 1.2);
  a.s.fireT = b.s.fireT = QUIET;
  let minD = Infinity, flops = 0;
  for (let i = 0; i < 600; i++) { const was = a.s.flopping; step(w, IDLE); if (was && !a.s.flopping) flops++; if (i > 30) minD = Math.min(minD, Math.hypot(a.x - b.x, a.z - b.z)); }
  check('two cubes side by side are held apart by the crowd and keep tumbling', minD > 2 * S.radius && flops >= 6, `${minD} ${flops}`);
}

// ── SWIFT and a SIREN's surge speed its flop the same way (api.speed) ──
{
  for (const [o, mult, name] of [[{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)'], [{}, 1.6, 'a surge (×1.6)']]) {
    const { w, g } = world({ x: -10, quiet: true, o });
    if (!o.affix) { g.surgeT = 1e9; g.surgeMult = 1.6; }
    aim(g, 10, 0); g.s.rest = 0.001;
    until(w, () => g.s.flopping);
    until(w, () => !g.s.flopping);
    check(`${name} shortens its cycle: the rest after a flop is its own`, near(g.s.rest, cycleOf(S.speed * mult).rest, 1e-12), `${g.s.rest}`);
  }
}

// ── against 1.x's own code, transcribed literally and fed the same stream ──
// The constructor (enemy.js:1209-1227), _flopMove (1494-1566, exact = true),
// _orangeTarget (1572-1579) and the update branch (2361-2395), with 1.x's
// literals rather than this port's tuning, run beside the sim. Free bodies
// read the position the swarm forces and the last crowd left (1.x's `ex`) and
// carry the crowd's unclamped nudge into the flop origin (crowd.js:107-116).
{
  const C4 = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  const D8x = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }, { x: 0.707, z: 0.707 }, { x: -0.707, z: 0.707 }, { x: 0.707, z: -0.707 }, { x: -0.707, z: -0.707 }];
  const oneX = (R, iM, x, z) => ({ x, z, flopActive: false, flopRest: R() * 0.25, flopDir: C4[Math.floor(R() * 4)], target: null, moveT: 0,
    totalShots: Math.min(12, 6 + Math.floor(iM > 0 ? (1 - iM) / 0.09 : 0) * 2), fireT: 1.5 + R() });
  const updateX = (e, R, P, ex, ez, spd, rm, halfX, halfZ) => {
    const target = () => { const ang = R() * Math.PI * 2, rad = 6 + R() * 3; return { x: Math.max(-10, Math.min(10, P.x + Math.cos(ang) * rad)), z: Math.max(-10, Math.min(10, P.z + Math.sin(ang) * rad)) }; };
    const flopMove = (wantX, wantZ) => {
      const L = 0.75 * 0.9 * rm, D = L * Math.SQRT2, stride = 2 * L, cycle = stride / Math.max(spd, 0.01);
      if (!e.flopActive) {
        e.flopRest -= dt; if (e.flopRest > 0) return;
        const len = Math.hypot(wantX, wantZ);
        let dir = { x: wantX / len, z: wantZ / len };
        if (Math.abs(e.x + dir.x * stride) > halfX - 0.75) dir = { x: -(Math.sign(e.x) || 1), z: 0 };
        else if (Math.abs(e.z + dir.z * stride) > halfZ - 0.75) dir = { x: 0, z: -(Math.sign(e.z) || 1) };
        e.flopDir = dir; e.x0 = e.x; e.z0 = e.z; e.flopT = 0; e.flopDur = Math.min(0.30, cycle * 0.65); e.flopActive = true;
      }
      e.flopT += dt;
      const p = Math.min(1, e.flopT / e.flopDur), ang = (135 + (45 - 135) * p) * Math.PI / 180, disp = L + D * Math.cos(ang);
      e.x = e.x0 + e.flopDir.x * disp; e.z = e.z0 + e.flopDir.z * disp;
      if (p >= 1) { e.x = e.x0 + e.flopDir.x * stride; e.z = e.z0 + e.flopDir.z * stride; e.flopActive = false; e.flopRest = Math.max(0.02, cycle - e.flopDur); }
    };
    e.x = ex; e.z = ez;
    if (!e.target) { e.target = target(); e.moveT = 0; }
    e.moveT += dt;
    const tdx = e.target.x - ex, tdz = e.target.z - ez, td = Math.hypot(tdx, tdz);
    if (!e.flopActive && (td < 2.6 || e.moveT > 5)) { e.target = target(); e.moveT = 0; }
    else flopMove(tdx / (td || 1), tdz / (td || 1));
    e.fireT -= dt;
    const shots = [];
    if (e.fireT <= 0) {
      const adx = P.x - ex, adz = P.z - ez, al = Math.hypot(adx, adz) || 1;
      let best = 0, bestDot = -Infinity;
      for (let k = 0; k < 8; k++) { const dot = D8x[k].x * adx / al + D8x[k].z * adz / al; if (dot > bestDot) { bestDot = dot; best = k; } }
      const fd = D8x[best];
      for (let s = 0; s < e.totalShots; s++) { const t = (s / (e.totalShots - 1) - 0.5) * 4.0; shots.push({ x: ex - fd.z * t, z: ez + fd.x * t, vx: fd.x * 7, vz: fd.z * 7 }); }
      e.fireT = 3.0 + R() * 1.5; e.target = target(); e.moveT = 0;
    }
    return shots;
  };
  const sameShots = (got, want) => got.length === want.length && want.every((q, k) => near(got[k].px, q.x, 1e-9) && near(got[k].pz, q.z, 1e-9) && near(got[k].vx, q.vx, 1e-9) && near(got[k].vz, q.vz, 1e-9));
  const fresh = (w) => w.bullets.filter((b) => b.src === 'orange' && near(b.life, T.bullets.life - dt, 1e-12));
  // one body, anchored: its own step is all that moves it
  let solo = true, walls = 0, flops = 0;
  for (let seed = 1; seed <= 6 && solo; seed++) {
    for (const [iM, sm] of [[1, 1], [0.725, 1.35 * 1.2]]) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const x = seed * 3 - 10, z = (seed % 3) * 3 - 3;
      const g = api.spawn(w, 'orange', x, z, { intervalMult: iM, speedMult: sm }); g.anchored = true;
      const e = oneX(R.next, iM, x, z);
      for (let i = 0; i < 900 && solo; i++) {
        const t = i * dt, ex = e.x, ez = e.z, was = e.flopActive;
        step(w, { ...IDLE, mx: Math.cos(t * 0.7 + seed), mz: Math.sin(t * 1.1) * 0.8 });
        const want = updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, ex, ez, 1.4 * sm, 1, w.hx, w.hz);
        if (want.length) walls++;
        if (!was && e.flopActive) flops++;
        solo &&= near(g.x, e.x, 1e-9) && near(g.z, e.z, 1e-9) && g.s.flopping === e.flopActive && sameShots(fresh(w), want);
      }
    }
  }
  check(`alone, it moves and fires exactly as 1.x's code does (12 runs of 15 s: ${flops} flops, ${walls} walls)`, solo && walls > 40 && flops > 200);
  // five free bodies: the swarm forces, the crowd and its clamp at the walls
  const entry = new Map(), exit = new Map(), orig = behaviour.step;
  behaviour.step = function (w, g, d, a) { entry.set(g.id, { x: g.x, z: g.z }); orig.call(this, w, g, d, a); exit.set(g.id, { x: g.x, z: g.z }); };
  let crowd = true, clamped = 0;
  try {
    for (let seed = 1; seed <= 4 && crowd; seed++) {
      const w = createWorld({ seed }); w.director = { step() {} }; w.hero.lives = 1e9; w.hero.mercy = 1e9;
      const R = makeRng(0); R.state = w.rng.state;
      const pairs = [];
      for (let k = 0; k < 5; k++) {
        const x = -14 + k * 1.6 + seed, z = -6 + (k % 2) * 1.4 + seed;
        pairs.push({ g: api.spawn(w, 'orange', x, z), e: oneX(R.next, 1, x, z) });
      }
      for (let i = 0; i < 1200 && crowd; i++) {
        const t = i * dt;
        step(w, { ...IDLE, mx: Math.cos(t * 0.5 + seed) * 0.7, mz: Math.sin(t * 0.9) * 0.7 });
        for (const { g, e } of pairs) {
          const en = entry.get(g.id), out = exit.get(g.id);
          updateX(e, R.next, { x: w.hero.x, z: w.hero.z }, en.x, en.z, 1.4, 1, w.hx, w.hz);
          crowd &&= near(out.x, e.x, 1e-9) && near(out.z, e.z, 1e-9) && g.s.flopping === e.flopActive;
          if (Math.abs(g.x) >= w.hx - g.r - 1e-12 || Math.abs(g.z) >= w.hz - g.r - 1e-12) clamped++;
          if (e.flopActive) { e.x0 += g.nudgedX; e.z0 += g.nudgedZ; }    // 1.x's crowd, after the update
        }
      }
    }
  } finally { behaviour.step = orig; }
  check(`in a crowd, by the walls, it tumbles exactly as 1.x's code does (the origin takes the crowd's unclamped nudge; ${clamped} steps at a wall)`, crowd && clamped > 50);
}

// ── determinism ─────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, g } = world({ seed, x: -9, z: 5, hero: [6, -3], anchored: false });
    const out = [];
    for (let i = 0; i < 900; i++) { step(w, IDLE); out.push(`${g.x.toFixed(9)},${g.z.toFixed(9)},${g.s.tx.toFixed(9)},${w.bullets.length}`); }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed tumbles and fires another way', trail(11) !== trail(12));
}

// ── the look ─────────────────────────────────────────────────────────
{
  const TSL = THREE.TSL, scene = new THREE.Scene(), GEL_TIME = TSL.uniform(0);
  const made = [];
  const gelMaterial = (hex, fam, r) => {
    const m = new THREE.MeshPhysicalNodeMaterial();
    m.gel = { hit: TSL.uniform(0), hitDir: TSL.uniform(new THREE.Vector2()), tear: TSL.uniform(0), wobble: TSL.uniform(0.35) };
    made.push({ hex, fam, r, m });
    return m;
  };
  const ctx = { THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S, kind: 'orange' };
  // a view the way actors.js makes one
  const view = () => {
    const v = { kind: 'orange', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, look.build({ ...ctx }));
    v.squash.add(v.body); v.root.add(v.squash); look.reset(v);
    return v;
  };
  const v = view();
  const geo = v.body.geometry, bb = geo.boundingBox;
  check('build: its own body, own: true, one gel material in orange, the cube family, unit radius (1.x makeSatinMat(color, \'cube\', …))',
    v.own === true && made.length === 1 && made[0].hex === 0xff8800 && made[0].fam === 'cube' && made[0].r === 1 && v.mat === made[0].m);
  check('the body is 1.x\'s RoundedBox: 1.8 radii a side (1.35 at 0.75), centred', near(bb.min.x, -0.9, 1e-6) && near(bb.max.y, 0.9, 1e-6) && near(bb.min.z, -0.9, 1e-6));
  const c = S.look.corner / S.radius, inner = 0.9 - c, pos = geo.attributes.position, nor = geo.attributes.normal;
  let onSurface = true, smooth = true;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const qx = Math.max(Math.abs(x) - inner, 0), qy = Math.max(Math.abs(y) - inner, 0), qz = Math.max(Math.abs(z) - inner, 0);
    const l = Math.hypot(qx, qy, qz);
    onSurface &&= near(l, c, 1e-6);
    if (l > 1e-6) smooth &&= near(nor.getX(i), Math.sign(x) * qx / l, 1e-6) && near(nor.getY(i), Math.sign(y) * qy / l, 1e-6);
  }
  check('every vertex sits the corner radius (0.18 at r 0.75) off the inner box, with the corner\'s own normal: rounded, smooth', onSurface && smooth && pos.count > 2000);
  check('every view shares the one geometry', view().body.geometry === geo);
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('the core\'s ripple and tear land on stand-ins: the cube\'s own stay at rest (1.x writes them for blobs only)',
    made[0].m.gel !== v.gel && v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.mat.gel.wobble === v.gel.wobble);

  const Wd = { time: 0 };
  const g = { r: 0.75, sq: 1, tell: 0, flash: 0, affix: null, s: { tumble: false } };
  const box = () => { v.root.updateMatrixWorld(true); return new THREE.Box3().setFromObject(v.body, true); };
  v.squash.scale.set(0.5, 2, 0.5);                       // what the core set; the look takes it over
  look.update(v, g, Wd, 0, 1);
  check('at rest: r × the box, upright, unturned, its centre at L = 0.675 and its bottom on the floor', near(v.body.scale.x, 0.75) && near(v.body.scale.y, 0.75) && near(v.body.position.y, L0, 1e-12)
    && v.body.quaternion.equals(new THREE.Quaternion()) && v.squash.scale.x === 1 && v.squash.scale.y === 1 && near(box().min.y, 0, 1e-6));
  g.sq = 0.7; v.phase = 0.4;
  const t = 1.9, br = 0.10 * Math.sin(t * 2.4 + 0.4), sx = 1 / Math.sqrt(0.7);
  look.update(v, g, Wd, t, 1);
  check('squashed and breathing: (sx·(1 − b/2), sq·(1 + b), sx·(1 − b/2)) × r (1.x enemy.js:2770-2777)',
    near(v.body.scale.x, 0.75 * sx * (1 - br / 2), 1e-12) && near(v.body.scale.y, 0.75 * 0.7 * (1 + br), 1e-12) && near(v.body.scale.z, v.body.scale.x, 1e-15));
  const sb = box();
  check('…about its centre, as 1.x\'s mesh origin is: a landing squash lifts its bottom face off the floor', near((sb.min.y + sb.max.y) / 2, L0, 1e-6) && sb.min.y > 0.05, `${sb.min.y}`);
  g.r = 0.9; g.sq = 1; v.phase = 0; look.update(v, g, Wd, 0, 1);
  check('an elite is drawn at its own radius, centre at 0.9·r', near(v.body.scale.x, 0.9) && near(v.body.position.y, 0.81, 1e-12));
  g.r = 0.75; look.update(v, g, Wd, 0, 0.5);
  check('it grows in with the view\'s swell (TUNING.gel.swell)', near(v.body.scale.x, 0.375) && near(box().min.y, 0, 1e-6));

  // the tumble: 1.x's transform — centre D·sin(ang) up, turned p·90° about (dz, 0, −dx)
  g.r = 0.75; g.sq = 0.6;                                // mid-flop the spring is not drawn
  let planted = true, exact = true, flat = true, top = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.6, 0.8], [-Math.SQRT1_2, Math.SQRT1_2]]) {
    Object.assign(g.s, { tumble: true, x0: 2, z0: -1, dirX: dx, dirZ: dz });
    for (const along of [0, 0.2, 0.45, 0.675, 0.9, 1.2, 1.35]) {
      v.root.position.set(2 + dx * along - dz * 0.03, 0, -1 + dz * along + dx * 0.03);   // a crowd nudge across the line changes nothing
      look.update(v, g, Wd, 0, 1);
      v.root.updateMatrixWorld(true);
      const ang = Math.acos(Math.max(-1, Math.min(1, (along - L0) / D0))), p = (135 * Math.PI / 180 - ang) / (Math.PI / 2);
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(dz, 0, -dx).normalize(), p * Math.PI / 2);
      exact &&= near(v.body.position.y, D0 * Math.sin(ang), 1e-9) && Math.abs(v.body.quaternion.dot(q)) > 1 - 1e-12;
      if (dx === 0 || dz === 0) {                         // a square heading: the leading bottom edge stays planted
        const edge = new THREE.Vector3(dx * 0.9, -0.9, dz * 0.9).applyMatrix4(v.body.matrixWorld);
        planted &&= near(edge.y, 0, 1e-9) && near(edge.x + dz * 0.03, 2 + dx * L0, 1e-9) && near(edge.z - dx * 0.03, -1 + dz * L0, 1e-9);
      }
      flat &&= near(v.body.scale.x, 0.75) && near(v.body.scale.y, 0.75) && v.squash.scale.y === 1;
      if (along === 0.675 && dx === 1) top = v.body.position.y;
    }
  }
  check('mid-flop: 1.x\'s transform, for square and diagonal headings alike', exact);
  check('…a square heading pivots on its planted leading edge', planted);
  check('…rigid and unsquashed (1.x `scale(rm)` mid-tumble), and up to D = 0.955 at the top', flat && near(top, D0, 1e-9));

  // the strobe: under the hit flash and the volatile fuse (enemy.js:2650-2658)
  Object.assign(g.s, { tumble: false }); g.sq = 1;
  const e = v.mat.emissive;
  const at = (time, gg) => { e.setHex(0x123456); look.update(v, gg, Wd, time, 1); return e.getHex(); };
  const on = Math.PI / 40, off = 3 * Math.PI / 40;        // sin(20t) = +1, −1
  check('telling: 0x442200 while sin(20 t) > 0', at(on, { ...g, tell: 0.5 }) === 0x442200);
  check('…black while it is < 0 (a ≈ 3.2 Hz square wave)', at(off, { ...g, tell: 0.5 }) === 0x000000);
  check('…not telling: the core\'s glow is left alone', at(on, { ...g, tell: 0 }) === 0x123456);
  check('…the hit flash outranks it', at(on, { ...g, tell: 0.5, flash: 0.1 }) === 0x123456);
  check('…and so does the volatile fuse', at(on, { ...g, tell: 0.5, affix: 'volatile' }) === 0x123456);

  // the kill: flat where it popped, swelling about its own centre (enemy.js:3013-3029, 2968-2984)
  Object.assign(g.s, { tumble: true, x0: 0, z0: 0, dirX: 0.6, dirZ: 0.8 }); g.sq = 1;
  v.root.position.set(0.6 * 0.5, 0, 0.8 * 0.5);
  look.update(v, g, Wd, 0, 1);
  const popY = v.body.position.y;
  v.dyingT = 0.2; v.root.scale.setScalar(1.6);
  v.root.updateMatrixWorld(true);
  v.body.onBeforeRender();
  v.root.updateMatrixWorld(true);
  const centre = new THREE.Vector3().setFromMatrixPosition(v.body.matrixWorld);
  check('killed mid-flop it snaps flat (1.x destroy), unsquashed', v.body.quaternion.equals(new THREE.Quaternion()) && near(v.body.scale.x, 0.75));
  check('…and swells about its own centre, which stays at the height it popped at', near(centre.y, popY, 1e-9) && popY > L0, `${centre.y} ${popY}`);
  v.root.scale.setScalar(2.3); v.body.onBeforeRender(); v.root.updateMatrixWorld(true);
  check('…all the way to 2.3×', near(new THREE.Vector3().setFromMatrixPosition(v.body.matrixWorld).y, popY, 1e-9));
  v.dyingT = 0; v.root.scale.setScalar(1); look.reset(v);
  Object.assign(g.s, { tumble: false });
  look.update(v, g, Wd, 0, 1);
  check('a pooled view comes back upright and live', !v.popped && near(v.body.position.y, L0, 1e-12) && v.body.quaternion.equals(new THREE.Quaternion()));
}

if (failed) { console.log(`✗ orange: ${failed} of ${failed + passed} checks failed`); process.exit(1); }
console.log(`✔ orange: ${passed} checks`);
