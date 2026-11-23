#!/usr/bin/env node
// magna.mjs — MAGNA's own checks, in bare node: 1.x's numbers (enemy.js:599,
// 668, 671, 1171-1184, 1888-1906, 2694-2697, 2731-2769, 3011; main.js:
// 2410-2420, 2542-2544, 10189-10213, and the frame order around the pull:
// after the pump lands new bodies 9350-9436 and the hero moves 9439, before
// the swarm forces 10231-10360 and the bodies' updates 10369;
// tuning.js:39, 308, 496-497), asserted against the sim stepping on its fixed
// 1/60 s, and the look against real three. The test dashes (PUSH, CUT) are
// the core's; they are checked here only as dashes that break the hold.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=163';
import { TUNING as T } from '../../js/tuning.js?v=163';
import behaviour from '../../js/sim/species/magna.js?v=163';
import look from '../../js/render/looks/magna.js?v=163';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const S = T.species.magna, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const DASH_Z = { ...IDLE, mz: 1, dash: true };       // a dash along +z, the press on this step

// a world with nothing in it but MAGNAs, the hero at the origin; anchored (no
// swarm forces, no crowd) unless asked, so what moves a body is its own step
function world({ seed = 1, mode = 'arcade', at = [[9, 0]], o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  const gs = at.map(([x, z]) => add(w, x, z, o, anchored));
  return { w, g: gs[0], gs };
}
function add(w, x, z, o = {}, anchored = true) {
  const b = api.spawn(w, 'magna', x, z, o);                       // live from its first step (no appear: 1.x had none)
  b.anchored = anchored;
  return b;
}
// 1.x's own frame arithmetic: how many decrements of `dt` until a timer at `from` runs out
const stepsDown = (from) => { let t = from, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; };
// one step; how far the pull moved the hero (the input is IDLE, so nothing else does)
function pulled(w) {
  const x0 = w.hero.x, z0 = w.hero.z;
  step(w, IDLE);
  return [w.hero.x - x0, w.hero.z - z0];
}

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.8, hp 4, speed 0.9, amber 0xff9944 (1.x enemy.js:599)', S.radius === 0.8 && S.hp === 4 && S.speed === 0.9 && S.color === 0xff9944);
  check('CFG: no gun', S.bulletColor === null && S.fireInterval === null);
  check('a blob dome, SUPPORT, harmless to touch in classic (not in MELEE_TYPES), not a biter',
    S.family === 'blob' && S.role === 'SUPPORT' && S.contact === false && S.revenge === null);
  check('it walks in only while farther than 8 + 1 (1.x enemy.js:1890-1891)', S.keep === 8 && S.keepBand === 1);
  check('the pull: reach 11, release 1.2, 1.1 u/s each, capped 2.0 u/s (1.x main.js:2542-2543, 10202-10207)',
    S.reach === 11 && S.release === 1.2 && S.pull === 1.1 && S.cap === 2.0);
  check('a dash grants 1.2 s of immunity (1.x main.js:10194)', S.immune === 1.2);
  check('the tether glows 0.3 + 0.15·|sin(6·clock)|, easing 0.25 a step (1.x enemy.js:1902-1903)',
    S.tether.base === 0.3 && S.tether.amp === 0.15 && S.tether.hz === 6 && S.tether.ease === 0.25);
  const Lt = S.look.tether;
  check('the tether: BoxGeometry(0.09, 0.02, 1), 0xffaa55, y 0.45, scale.z ≥ 0.01 (1.x enemy.js:1175-1181, 1898-1901)',
    Lt.width === 0.09 && Lt.thick === 0.02 && Lt.color === 0xffaa55 && Lt.y === 0.45 && Lt.minLen === 0.01);
  check('its silhouette is the default dome {1.05, 0.82, 1.05} (1.x tuning.js:39)', T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.magna);
  check('its look smooths its own velocity 0.3 a step (1.x enemy.js:2696-2697)', S.velSmooth === 0.3);
  check('the 2.0 movement profile is 1.x SUPPORT: dodge 0.5, flock 0.3, current 0.6, weave 0.3 (1.x tuning.js:287-298)',
    T.movement.roles.SUPPORT && T.movement.roles.SUPPORT.dodge === 0.5 && T.movement.roles.SUPPORT.flock === 0.3 && T.movement.roles.SUPPORT.current === 0.6 && T.movement.roles.SUPPORT.weave === 0.3);
  const src = readFileSync(new URL('../../js/sim/species/magna.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
}

// ── its starting state (1.x enemy.js:668, 671, 1182) ─────────────────
{
  const cs = [], ps = [];
  let fresh = true;
  for (let seed = 1; seed <= 200; seed++) {
    const { g } = world({ seed });
    cs.push(g.s.clock); ps.push(g.s.phase);
    fresh &&= g.s.held === false && g.s.tether === 0 && g.s.immune === 0 && g.s.velX === 0 && g.s.velZ === 0 && g.tell === 0;
  }
  check('it starts holding nothing, its tether unlit (1.x `_pullActive = false`, opacity 0)', fresh);
  check('its clock and phase start anywhere in [0, 2π)', [cs, ps].every((a) => a.every((v) => v >= 0 && v < Math.PI * 2) && Math.min(...a) < 0.3 && Math.max(...a) > 6));
}

// ── the walk: it closes while farther than 9, then stands ────────────
{
  let { w, g } = world({ at: [[15, 8]] });
  let exact = true, along = true, ticks = true;
  for (let i = 0; i < 60; i++) {
    const x0 = g.x, z0 = g.z, c0 = g.s.clock;
    step(w, IDLE);
    exact &&= near(Math.hypot(g.x - x0, g.z - z0), S.speed * dt, 1e-12);
    along &&= angDiff(Math.atan2(g.z - z0, g.x - x0), Math.atan2(w.hero.z - z0, w.hero.x - x0)) < 1e-9;
    ticks &&= near(g.s.clock, c0 + dt, 1e-12);
  }
  check('past 9 it closes at its speed (0.9 u/s), straight at you (1.x enemy.js:1891-1893)', exact && along);
  check('its own clock advances dt a step (1.x enemy.js:2724-2725 `_wobbleT += dt`)', ticks);
  // it never backs away, and within 9 it stands, the edge included
  for (const d of [0.5, 1.2, 3, 8, 9]) {
    const r = world({ at: [[d, 0]] });
    for (let i = 0; i < 30; i++) step(r.w, IDLE);
    check(`at ${d} it stands its ground (it never backs off)`, r.g.x === d && r.g.z === 0, `${r.g.x}`);
  }
  // it parks just inside 9 (the pull drawing you in only helps it)
  ({ w, g } = world({ at: [[-17, 9]] }));
  for (let i = 0; i < 60 * 12; i++) step(w, IDLE);
  const d = Math.hypot(g.x - w.hero.x, g.z - w.hero.z);
  check('walking in from far, it stops once it is within 9', d <= 9, `${d}`);
  check('it looks at you', near(g.faceX, (w.hero.x - g.x) / d, 1e-6) && near(g.faceZ, (w.hero.z - g.z) / d, 1e-6));
  // the wave's escalation and SWIFT reach it (1.x enemy.js:1699: spd = speed × _speedMult)
  for (const [o, mult, name] of [[{ speedMult: 1.73 }, 1.73, 'wave 8\'s speedMult (1.73)'], [{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)']]) {
    const r = world({ at: [[15, 0]], o });
    const x0 = r.g.x;
    step(r.w, IDLE);
    check(`${name} speeds its walk`, near(x0 - r.g.x, S.speed * mult * dt, 1e-12), `${x0 - r.g.x}`);
  }
  // a SIREN's surge reaches it (1.x: spd × 1.6 while _surgeT > 0)
  const r = world({ at: [[15, 0]] });
  r.g.surgeT = 3; r.g.surgeMult = 1.6;
  const x0 = r.g.x;
  step(r.w, IDLE);
  check('a SIREN\'s surge reaches its walk (1.6×)', near(x0 - r.g.x, S.speed * 1.6 * dt, 1e-12));
  // its own velocity, what the look reads: only its own walk, smoothed 0.3 a step
  ({ w, g } = world({ at: [[6, 4]], anchored: false }));
  let still = true, carried = false;
  for (let i = 0; i < 120; i++) {
    const x0 = g.x, z0 = g.z;
    step(w, IDLE);
    carried ||= Math.hypot(g.x - x0, g.z - z0) > 1e-4;
    still &&= g.s.velX === 0 && g.s.velZ === 0;
  }
  check('the swarm still carries a MAGNA that stands …', carried);
  check('… while its look\'s velocity stays its own walk alone (none) (1.x `_velX`)', still);
  ({ w, g } = world({ at: [[15, 0]] }));
  step(w, IDLE);
  check('walking, its look\'s velocity eases 0.3 of the way to its walk a step', near(g.s.velX, -S.speed * S.velSmooth, 1e-12) && g.s.velZ === 0);
}

// ── the pull (1.x main.js:10189-10213) ───────────────────────────────
{
  // one MAGNA: 1.1 u/s straight at it, as a position nudge on top of your own move
  let { w, g } = world({ at: [[9, 0]] });
  let [px, pz] = pulled(w);
  check('within reach it drags you 1.1 u/s toward it (1.1 / 60 a step)', near(px, S.pull * dt, 1e-15) && pz === 0 && g.s.held, `${px}`);
  ({ w, g } = world({ at: [[6, -8]] }));
  [px, pz] = pulled(w);
  check('… along the line to it', near(Math.hypot(px, pz), S.pull * dt, 1e-15) && angDiff(Math.atan2(pz, px), Math.atan2(-8, 6)) < 1e-12);
  // it adds to what you did this step
  ({ w, g } = world({ at: [[9, 0]] }));
  step(w, { ...IDLE, mz: 1 });
  const wz = T.hero.speed * dt, wl = Math.hypot(9, wz);
  check('it adds to your own walk (6 u/s down, then 1.1 u/s toward it from where that left you)',
    near(w.hero.x, (9 / wl) * S.pull * dt, 1e-15) && near(w.hero.z, wz - (wz / wl) * S.pull * dt, 1e-15));
  // over a second, 1.1 u, and it reels you in to just inside 1.2
  ({ w, g } = world({ at: [[9, 0]] }));
  for (let i = 0; i < 60; i++) step(w, IDLE);
  check('a second of it is 1.1 u', near(w.hero.x, 1.1, 1e-12), `${w.hero.x}`);
  for (let i = 0; i < 60 * 10; i++) step(w, IDLE);
  const md = g.x - w.hero.x;
  check('it reels you in until you are within 1.2, and lets go there (no pull at the singularity)', md <= S.release && md > S.release - S.pull * dt * 1.01 && !g.s.held, `${md}`);
  // the edges of its reach, both strict
  for (const [d, held] of [[11, false], [10.999, true], [1.2, false], [1.201, true]]) {
    const r = world({ at: [[d, 0]] });
    const [qx] = pulled(r.w);
    check(`at ${d} it ${held ? 'holds' : 'does not hold'} you`, r.g.s.held === held && (held ? qx > 0 : qx === 0), `${qx}`);
  }
  // at 11 it does not hold; it walks in, and holds the next step
  ({ w, g } = world({ at: [[11, 0]] }));
  const [a1] = pulled(w), [a2] = pulled(w);
  check('from 11 it walks in and takes hold the step after (the walk follows the pull, as in 1.x)', a1 === 0 && near(a2, S.pull * dt, 1e-15) && near(g.x, 11 - 2 * S.speed * dt, 1e-12));
  // touching it does not hurt in classic
  ({ w, g } = world({ at: [[0.6, 0]] }));
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('standing on it costs no life (classic: not in MELEE_TYPES)', w.hero.lives === T.hero.lives && !w.events.some((e) => e.type === 'hurt'));
}

// ── stacking: the sum, capped at 2.0 u/s in its own direction ────────
{
  // two square to each other: 1.556 u/s, under the cap
  let { w } = world({ at: [[9, 0], [0, 9]] });
  let [px, pz] = pulled(w);
  check('two MAGNAs pull as their sum (under the cap)', near(px, S.pull * dt, 1e-15) && near(pz, S.pull * dt, 1e-15));
  // two facing each other cancel
  ({ w } = world({ at: [[9, 0], [-9, 0]] }));
  [px, pz] = pulled(w);
  check('… so two either side of you cancel out', near(px, 0, 1e-15) && near(pz, 0, 1e-15));
  // three bunched: 3.2 u/s, capped to 2.0 along the sum
  const bunch = [[9, 0], [9 * Math.cos(0.3), 9 * Math.sin(0.3)], [9 * Math.cos(-0.3), 9 * Math.sin(-0.3)]];
  const sum = bunch.reduce((a, [x, z]) => [a[0] + (x / 9) * S.pull, a[1] + (z / 9) * S.pull], [0, 0]);
  ({ w } = world({ at: bunch }));
  [px, pz] = pulled(w);
  check('three bunched MAGNAs (3.2 u/s) are capped at 2.0 u/s', Math.hypot(...sum) > 3 && near(Math.hypot(px, pz), S.cap * dt, 1e-15) && angDiff(Math.atan2(pz, px), Math.atan2(sum[1], sum[0])) < 1e-12, `${Math.hypot(px, pz) / dt}`);
  // capped on the whole floor, whatever the order: the running sum telescopes
  const odd = [[9, 0], [9, 0.1], [-9, 0]];
  const want = odd.reduce((a, [x, z]) => { const l = Math.hypot(x, z); return [a[0] + (x / l) * S.pull, a[1] + (z / l) * S.pull]; }, [0, 0]);
  let same = true;
  for (const order of [[0, 1, 2], [2, 0, 1], [1, 2, 0]]) {
    ({ w } = world({ at: order.map((i) => odd[i]) }));
    [px, pz] = pulled(w);
    same &&= near(px, want[0] * dt, 1e-15) && near(pz, want[1] * dt, 1e-15);
  }
  check('the cap is on the floor\'s SUM: two over it and a third against them pull exactly the sum, in any order', Math.hypot(...want) < S.cap && same);
  // four on one line: the cap, not 4.4 u/s
  ({ w } = world({ at: [[9, 0], [10, 0], [8, 0], [9, 0.5]] }));
  [px, pz] = pulled(w);
  check('four on one side still pull 2.0 u/s (33% of your 6 u/s)', near(Math.hypot(px, pz), S.cap * dt, 1e-15));
}

// ── 1.x's frame order: the pull, then the swarm forces, then the walk ─
// 1.x moves the hero by the floor's pull (main.js:10189-10213) BEFORE the
// swarm forces move the bodies (main.js:10231-10360) and before each body's
// own update walks it toward player.position (main.js:10369): the hold is
// read off where a MAGNA stood at the end of the last frame, and the walk
// heads for where the pull has left you.
{
  // a sidestep (the swarm's dodge) carries it across 11 during the step: the
  // hold is decided by where it stood before it, both ways
  const side = T.movement.dodge.speed * T.movement.roles.SUPPORT.dodge;
  for (const [x0, vx, held] of [[11.05, -side, false], [10.95, side, true]]) {
    const { w, g } = world({ at: [[x0, 0]], anchored: false });
    Object.assign(g, { dodgeT: T.movement.dodge.time, dodgeVx: vx, dodgeVz: 0, dodgeCd: 99 });
    const [qx] = pulled(w);
    const crossed = held ? g.x > S.reach : g.x < S.reach - S.speed * dt;
    check(`standing at ${x0} when the step starts, a sidestep across 11 does not change the hold: it ${held ? 'holds' : 'does not hold'} (1.x main.js:10196-10202 before 10231+)`,
      crossed && g.s.held === held && (held ? near(qx, S.pull * dt, 1e-15) : qx === 0), `${g.x} ${qx}`);
  }
  // the walk heads for where the pull leaves you: two at right angles pull
  // you off the axis, and the one on it walks at where you will be
  {
    const { w, gs: [a] } = world({ at: [[10, 0], [0, 10]] });
    step(w, IDLE);
    const hp = S.pull * dt, tx = hp - 10, tz = hp, tl = Math.hypot(tx, tz);
    check('it walks at where the pull has left you, not where you stood (1.x enemy.js:1891-1893 after main.js:10209-10212)',
      near(w.hero.x, hp, 1e-15) && near(w.hero.z, hp, 1e-15) && near(a.x, 10 + (tx / tl) * S.speed * dt, 1e-12) && near(a.z, (tz / tl) * S.speed * dt, 1e-12) && a.z > 0, `${a.x} ${a.z}`);
  }
  // … and it is the pulled distance that the keep reads: at 9.01 the pull
  // brings you within 9 of it, so it stands
  {
    const { w, g } = world({ at: [[9.01, 0]] });
    const [qx] = pulled(w);
    check('9.01 away, the pull draws you within 9 of it and it stands rather than walks', near(qx, S.pull * dt, 1e-15) && g.x === 9.01, `${g.x}`);
  }
  // a new MAGNA holds you from its FIRST step, wherever it is in the step
  // order. 1.x had no arrival phase: the pump lands it (main.js:9350-9436,
  // `enemies.push(en)` 9436; alive from its constructor, enemy.js:662) before
  // the hero moves (player.update, 9439) and before the pull (10189-10213),
  // which reads every living MAGNA where it stands with no arrival gate — so
  // it holds on the frame it lands, from the spot it was placed. Landed
  // between two steps here, as the director lands it at the top of a step.
  for (const first of [false, true]) {
    const { w, g: b } = world({ at: [[0, 9]] });
    const [q0x, q0z] = pulled(w);                                   // the one already there, alone
    const a = add(w, 9, 0);
    if (first) { w.gels.splice(w.gels.indexOf(a), 1); w.gels.unshift(a); }
    const h = w.hero, la = Math.hypot(a.x - h.x, a.z - h.z), lb = Math.hypot(b.x - h.x, b.z - h.z);
    const ex = ((a.x - h.x) / la + (b.x - h.x) / lb) * S.pull * dt, ez = ((a.z - h.z) / la + (b.z - h.z) / lb) * S.pull * dt;
    const [qx, qz] = pulled(w);
    check(`a new MAGNA (${first ? 'first' : 'last'} in the step order) pulls on its first step, from where it landed (1.x main.js:9436 before 10189-10213)`,
      q0x === 0 && near(q0z, S.pull * dt, 1e-15) && near(qx, ex, 1e-15) && near(qz, ez, 1e-15) && qx > 0 && a.s.held && b.s.held, `${q0x}/${q0z} ${qx}/${ex} ${qz}/${ez}`);
  }
  // … and landed by the director, in the step itself: the director runs before
  // the hero and the bodies, as 1.x's pump runs before player.update and the pull
  {
    const { w, g: b } = world({ at: [[0, 9]] });
    let a = null;
    w.director = { step(w2) { if (w2.tick === 5) { a = api.spawn(w2, 'magna', 9, 0); a.anchored = true; } } };
    for (let i = 0; i < 4; i++) step(w, IDLE);
    const h = w.hero, lb = Math.hypot(b.x - h.x, b.z - h.z), la = Math.hypot(9 - h.x, 0 - h.z);
    const ex = ((9 - h.x) / la + (b.x - h.x) / lb) * S.pull * dt, ez = ((0 - h.z) / la + (b.z - h.z) / lb) * S.pull * dt;
    const [qx, qz] = pulled(w);
    check('a MAGNA the director lands holds you on the step it lands (1.x: the pump at main.js:9350-9436 runs before the pull)',
      a && a.s.held && b.s.held && near(qx, ex, 1e-15) && near(qz, ez, 1e-15) && qx > 0, `${qx}/${ex} ${qz}/${ez}`);
  }
}

// ── a dash breaks the hold: the dash and 1.2 s after it ──────────────
{
  const { w, g } = world({ at: [[9, 0]] });
  for (let i = 0; i < 30; i++) step(w, IDLE);
  check('held before the dash', g.s.held);
  // the dash: 0.18 s, 11 steps; the immunity is set every step of it
  step(w, DASH_Z);
  let dashSteps = 1, free = true;
  while (w.hero.dash > 0) { free &&= !g.s.held && g.s.immune === S.immune; step(w, IDLE); dashSteps++; }
  check('the dash is 11 steps, and none of them is held (immunity 1.2 throughout)', dashSteps === 11 && free, `${dashSteps}`);
  check('… the step it ends, the clock first runs down', !g.s.held && near(g.s.immune, S.immune - dt, 1e-15));
  // then nothing pulls until the clock is out: stepsDown(1.2) decrements, the first on the dash's last step
  const n = stepsDown(S.immune);
  let after = 0, x0 = w.hero.x, z0 = w.hero.z, moved = false;
  while (!g.s.held && after < 200) { step(w, IDLE); after++; if (!g.s.held) moved ||= w.hero.x !== x0 || w.hero.z !== z0; }
  check(`the hold comes back ${n - 1} steps after the dash's last step (1.2 s on 1.x's frame clock)`, after === n - 1, `${after}`);
  check('… with no pull at all in between', !moved);
  check('… and the pull resumes at full strength', near(Math.hypot(w.hero.x - x0, w.hero.z - z0), S.pull * dt, 1e-12));
  check('the hold is broken for the dash and 1.2 s more: ≈ 1.38 s in all', near((dashSteps + after) * dt, 0.18 + 1.2, 1.5 * dt));
}

// ── the immunity is the floor's: every MAGNA, and one that arrives late ──
{
  // two MAGNAs share one clock
  let { w, gs } = world({ at: [[9, 0], [-9, 1]] });
  step(w, DASH_Z);
  while (w.hero.dash > 0) step(w, IDLE);
  let k = 0;
  while (!gs[0].s.held && k < 200) { step(w, IDLE); k++; check(`two MAGNAs agree on the clock (${k})`, gs[0].s.immune === gs[1].s.immune && gs[0].s.held === gs[1].s.held); if (gs[0].s.held) break; }
  // control: one MAGNA watching from the start; the first step it holds after a dash at step 1
  const firstHeld = (spawnAt, x = 9) => {
    const r = world({ at: spawnAt === 0 ? [[x, 0]] : [] });
    let g = r.g;
    for (let i = 1; i <= 200; i++) {
      if (i === spawnAt) g = add(r.w, x, 0);
      step(r.w, i === 1 ? DASH_Z : IDLE);
      if (g && g.s.held) return i;
    }
    return -1;
  };
  const ctl = firstHeld(0);
  check('control: a dash at step 1 frees you until step 11 + 71', ctl === 11 + stepsDown(S.immune) - 1, `${ctl}`);
  // one arriving mid-immunity next to one already there takes its clock, either order
  for (const first of [false, true]) {
    ({ w, gs } = world({ at: [[9, 0]] }));
    step(w, DASH_Z);
    for (let i = 0; i < 30; i++) step(w, IDLE);
    const late = add(w, -9, 2);
    if (first) { w.gels.splice(w.gels.indexOf(late), 1); w.gels.unshift(late); }
    step(w, IDLE);
    check(`a MAGNA arriving mid-immunity (${first ? 'before' : 'after'} the other in the step order) takes the floor's clock`, late.s.immune === gs[0].s.immune && late.s.immune > 0 && !late.s.held);
  }
  // with nobody watching, it reads the clock back off the hero's dash cooldown
  for (const at of [12, 20, 40, 55]) check(`a MAGNA arriving to an empty floor at step ${at}, after a dash at step 1, waits for the same step as the control`, firstHeld(at) === ctl, `${firstHeld(at)} vs ${ctl}`);
  // the documented gap: once the cooldown is out (0.75 s after the dash) the
  // last 0.45 s cannot be read back, and it takes hold at once
  const gap = firstHeld(60);
  check('the gap (contractGaps): arriving to an empty floor 0.75–1.2 s after a dash, it takes hold at once', gap === 60, `${gap}`);
  // not gated on mercy (1.x: the pull keeps working through the i-frames)
  ({ w, gs } = world({ at: [[9, 0]] }));
  step(w, IDLE);
  api.hurt(w, 'test');
  check('a hit gives mercy …', w.hero.mercy > 0);
  const [mx] = pulled(w);
  check('… and the pull keeps working through it', near(mx, S.pull * dt, 1e-15) && gs[0].s.held);
}

// ── the test dashes (TUNING.hero.push / cut): a dash is a dash to the hold ──
{
  // PUSH: the shove is carried on top of its walk, and the hold breaks as for any dash
  {
    const w = createWorld({ seed: 3, mode: 'arcade', dashMode: 'push' });
    w.director = { step() {} };
    const g = add(w, 3, 0, {}, false);
    const x0 = g.x;
    step(w, { ...IDLE, mx: 1, dash: true });                         // dash at it along +x: it is ploughed ahead of you
    let free = !g.s.held, n = 1;
    while (w.hero.dash > 0) { step(w, IDLE); free &&= !g.s.held; n++; }
    check('PUSH: a shove knocks it away from you, carried on top of its own walk', g.x > x0 + 0.5 && g.kx !== 0, `${g.x} ${g.kx}`);
    check('PUSH: and the hold is broken through the dash', free && n === 11, `${n}`);
  }
  // CUT: a dash through it cuts it (2 of its 4 HP); two dashes kill it, and the hold breaks as for any dash
  {
    const w = createWorld({ seed: 3, mode: 'arcade', dashMode: 'cut' });
    w.director = { step() {} };
    const g = add(w, 3, 0);
    step(w, { ...IDLE, mx: 1, dash: true });
    let free = !g.s.held;
    while (w.hero.dash > 0) { step(w, IDLE); free &&= !g.s.held; }
    check(`CUT: a dash through it takes ${T.hero.cut.hits} of its ${S.hp} HP, and it holds nothing through the dash`, g.alive && g.hp === S.hp - T.hero.cut.hits && free, `${g.hp}`);
    for (let i = 0; i < 60; i++) step(w, IDLE);                       // the cooldown runs out
    let kill = null;
    step(w, { ...IDLE, mx: -1, dash: true });
    for (let i = 0; i < 20 && !kill; i++) { kill = w.events.find((e) => e.type === 'kill' && e.id === g.id) || kill; if (!kill) step(w, IDLE); }
    check('CUT: a second dash back through it kills it (src \'dash\')', kill && kill.src === 'dash' && !g.alive, `${g.hp}`);
  }
}

// ── the tether's glow: the tell (1.x enemy.js:1902-1903) ─────────────
{
  const { w, g } = world({ at: [[9, 0]] });
  let exact = true;
  for (let i = 0; i < 40; i++) {
    const o0 = g.s.tether, c0 = g.s.clock;
    step(w, IDLE);
    exact &&= near(g.s.tether, o0 + (S.tether.base + S.tether.amp * Math.abs(Math.sin(c0 * S.tether.hz)) - o0) * S.tether.ease, 1e-15);
  }
  check('while it holds, the glow closes 0.25 of the gap a step toward 0.3 + 0.15·|sin(6·clock)|, on the clock before it advances', exact);
  let lo = 1, hi = 0;
  for (let i = 0; i < 120; i++) { step(w, IDLE); lo = Math.min(lo, g.s.tether); hi = Math.max(hi, g.s.tether); }
  check('… settling into a 0.30–0.45 shimmer', lo > 0.29 && hi < 0.45 && hi - lo > 0.08, `${lo} ${hi}`);
  // the dash lets go: it fades by 0.75 a step
  const o0 = g.s.tether;
  step(w, DASH_Z);
  check('a dash lets go, and the glow fades a quarter a step', !g.s.held && near(g.s.tether, o0 * 0.75, 1e-15));
  for (let i = 0; i < 40; i++) step(w, IDLE);
  check('… down to nothing', g.s.tether < 1e-4);
}

// ── it dies like any 4-HP dome ───────────────────────────────────────
{
  const { w, g } = world({ at: [[5, 0]] });
  let hits = 0, kill = null;
  for (let i = 0; i < 240 && !kill; i++) {
    step(w, { ...IDLE, aim: true, fire: true });
    hits += w.events.filter((e) => e.type === 'hit' && e.id === g.id).length;
    kill = w.events.find((e) => e.type === 'kill' && e.id === g.id) || null;
  }
  check('4 hero bullets kill it', kill && hits === 4 && !g.alive, `${hits}`);
  check('… a big death (r 0.8), in amber, and nothing comes out of it', kill && kill.big && kill.color === 0xff9944 && w.gels.length === 0);
  const x0 = w.hero.x;
  step(w, IDLE);
  check('dead, it pulls no more', w.hero.x === x0);
}

// ── determinism ──────────────────────────────────────────────────────
{
  const trail = (seed) => {
    const { w, gs } = world({ seed, at: [[12, 3], [-10, -4]], anchored: false });
    const out = [];
    for (let i = 0; i < 900; i++) {
      step(w, i === 300 ? DASH_Z : IDLE);
      out.push(`${w.hero.x.toFixed(9)},${w.hero.z.toFixed(9)},${gs.map((g) => `${g.x.toFixed(9)}:${g.s.tether.toFixed(9)}`).join('/')}`);
    }
    return out.join(';');
  };
  check('a run replays from its seed', trail(11) === trail(11));
  check('another seed shimmers elsewhen', trail(11) !== trail(12));
}

// ── the look: 1.x's scale block, and the tether ──────────────────────
{
  let matArgs = null;
  const scene = new THREE.Scene(), clock = { value: 0 };
  const ctx = { THREE, TSL: THREE.TSL, GEL_TIME: clock, T, S, scene, geo: { blob: new THREE.SphereGeometry(1, 8, 6) },
    gelMaterial: (hex, fam, r, o) => { matArgs = [hex, fam, r, o]; const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color(); return m; } };
  const v = { kind: 'magna', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 1.234, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash); scene.add(v.root);
  const tm = v.tether, tmat = v.tmat, gp = tm.geometry.parameters;
  check('it builds its own body: one plain gel dome of the blob family (uWobble 1, uRadius 1)',
    v.own === true && matArgs[0] === 0xff9944 && matArgs[1] === 'blob' && matArgs[2] === 1 && matArgs[3] === undefined && v.mesh.geometry === ctx.geo.blob && v.mesh.material === v.mat);
  check('the tether is BoxGeometry(0.09, 0.02, 1), drawn, not added (v104: no glow) 0xffaa55, no depth write, unlit to start (1.x enemy.js:1175-1180)',
    gp.width === 0.09 && gp.height === 0.02 && gp.depth === 1 && tmat.blending === THREE.NormalBlending && tmat.depthWrite === false
    && tmat.transparent && tmat.color.getHex() === 0xffaa55 && tmat.opacity === 0 && !tm.visible && tmat.isMeshBasicNodeMaterial);
  const v2 = { ...look.build(ctx) };
  check('every view shares one tether box', v2.tether.geometry === tm.geometry);

  const sh = T.blob.shape, B = T.blob, L = S.look;
  const g = { r: 0.8, sq: 1, tell: 0, flash: 0, x: 0, z: 0, px: 0, pz: 0, s: { clock: 0, phase: 0, velX: 0, velZ: 0, tether: 0 } };
  const squash = (sq) => v.squash.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  const total = () => { v.root.updateMatrixWorld(true); const s = new THREE.Vector3(); v.mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s; };
  squash(1); v.mat.emissive.setHex(0x123456);
  look.update(v, g, null, 0.77, 1);
  check('at rest it is r × the dome: 0.84 wide, 1.12 tall (species-a.md §2.10.1)',
    near(v.mesh.scale.x, 0.8 * sh.x) && near(v.mesh.scale.y, 0.8 * sh.y) && near(v.mesh.scale.z, 0.8 * sh.z) && near(0.8 * sh.x, 0.84, 1e-9) && near(0.8 * sh.y * 1.7, 1.12, 0.01));
  check('it breathes on its own clock, not the render\'s', (look.update(v, g, null, 3.1, 1), near(v.mesh.scale.y, 0.8 * sh.y)));
  check('… and it has no body tell: it leaves the glow to the core', v.mat.emissive.getHex() === 0x123456);
  g.r = 0.96; look.update(v, g, null, 0, 1);
  check('an elite is drawn at its own radius, 1.2× (1.x `r·rm`)', near(v.mesh.scale.x, 0.96 * sh.x) && near(v.mesh.scale.y, 0.96 * sh.y));
  g.r = 0.8; look.update(v, g, null, 0, 0.5);
  check('it swells in with the view (actors.js `grow`, TUNING.gel.swell): drawn at grow × r', near(v.mesh.scale.x, 0.4 * sh.x));
  g.sq = 0.7; squash(0.7); g.s = { ...g.s, clock: 0.37, phase: 0.2, velX: 2.5, velZ: 0 };
  look.update(v, g, null, 9, 1);
  const b = B.breatheAmp * Math.sin(0.37 * B.breatheHz + 0.2), sx = 1 / Math.sqrt(0.7), drag = Math.min(2.5 * B.dragStretchPerSpeed, B.dragMax);
  const want = [0.8 * sh.x * sx * (1 - b * 0.5), 0.8 * sh.y * (0.7 * (1 + b) - drag * 0.25), 0.8 * sh.z * (sx * (1 - b * 0.5) + drag)];
  const got = [v.mesh.scale.x, v.mesh.scale.y, v.mesh.scale.z];
  check('squashed, breathing and dragging, its mesh is 1.x\'s formula (1.x enemy.js:2747-2769)', got.every((x, k) => near(x, want[k], 1e-12)), `${got} vs ${want}`);
  const tot = total();
  check('… and the squash group above it is undone exactly', near(tot.x, want[0], 1e-9) && near(tot.y, want[1], 1e-9) && near(tot.z, want[2], 1e-9));
  check('it turns to its OWN heading, nose lifting with the drag', near(v.yaw, Math.atan2(2.5, 0)) && near(v.mesh.rotation.x, -drag * B.rearDragTilt) && v.mesh.rotation.z === 0);
  g.s.velX = 0.3; g.s.velZ = 0.1; const yaw = v.yaw; look.update(v, g, null, 0, 1);
  check('below 0.4 u/s it holds its heading', v.yaw === yaw);
  g.sq = 1; squash(1); g.s.velX = 0; g.s.velZ = 0;

  // the tether: from the drawn MAGNA to the drawn hero
  const hero = { alive: true, x: -1, z: 1, px: -1, pz: 1 };
  const W = { hero };
  Object.assign(g, { x: 3, z: 4, px: 3, pz: 4 }); v.root.position.set(3, 0, 4);
  g.s.tether = 0.4;
  look.update(v, g, W, 0, 1);
  scene.updateMatrixWorld(true);
  const ends = [-0.5, 0.5].map((z) => new THREE.Vector3(0, 0, z).applyMatrix4(tm.matrixWorld));
  check('holding, it is lit at the sim\'s opacity', tm.visible && v.fx.visible && tmat.opacity === 0.4);
  check('… stretched to the distance between you (5), at y 0.45 (1.x enemy.js:1898-1901)', near(tm.scale.z, 5) && near(ends[0].y, 0.45) && near(ends[1].y, 0.45));
  check('… one end in the MAGNA, the other in you', near(ends[0].x, 3, 1e-9) && near(ends[0].z, 4, 1e-9) && near(ends[1].x, -1, 1e-9) && near(ends[1].z, 1, 1e-9), `${ends[0].toArray()} ${ends[1].toArray()}`);
  check('… turned along the line, atan2(dx, dz) (1.x enemy.js:1899-1900)', near(tm.rotation.y, Math.atan2(-4, -3)));
  // between steps, the hero is drawn as far through the step as the body
  Object.assign(g, { px: 2, x: 4, pz: 4, z: 4 }); v.root.position.set(3, 0, 4);
  Object.assign(hero, { px: 0, x: 1, pz: 0, z: 0 });
  look.update(v, g, W, 0, 1);
  scene.updateMatrixWorld(true);
  const far = new THREE.Vector3(0, 0, 0.5).applyMatrix4(tm.matrixWorld);
  check('half way through a step, it reaches the hero half way through it too', near(far.x, 0.5, 1e-9) && near(far.z, 0, 1e-9), far.toArray().join());
  // touching: still a 0.01 sliver, never a zero scale
  Object.assign(g, { px: 0, x: 0, pz: 0, z: 0 }); v.root.position.set(0, 0, 0);
  Object.assign(hero, { px: 0, x: 0, pz: 0, z: 0 });
  look.update(v, g, W, 0, 1);
  check('on top of you it is a 0.01 sliver, never a zero scale', tm.scale.z === 0.01);
  // unlit, or you are gone: not drawn
  g.s.tether = 0; look.update(v, g, W, 0, 1);
  check('let go and faded, it is not drawn', !tm.visible && tmat.opacity === 0);
  g.s.tether = 0.4; hero.alive = false; look.update(v, g, W, 0, 1);
  check('with you gone, it is not drawn', !tm.visible);
  hero.alive = true; look.update(v, g, W, 0, 1);
  // killed: it hides through the dome's last 0.28 s (1.x enemy.js:3011)
  v.dyingT = 0.2; scene.updateMatrixWorld(true);
  check('killed, it hides at once while the dome plays out its death', !v.fx.visible);
  v.dyingT = 0; scene.updateMatrixWorld(true);
  check('… and a living view shows it again', v.fx.visible && tm.visible);
  check('it hangs off the view\'s root, so it goes with the pooled view', v.fx.parent === v.root && tm.parent === v.fx);
  v.yaw = 2; look.reset(v);
  check('a reused view faces forward again (1.x `_moveYaw = 0`), its tether unlit', v.yaw === 0 && !tm.visible && tmat.opacity === 0);
}

if (failed) { console.log(`✗ magna: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ magna: ${passed} checks`);
