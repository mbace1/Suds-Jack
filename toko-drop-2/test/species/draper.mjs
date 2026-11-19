#!/usr/bin/env node
// draper.mjs — DRAPER's own checks, in bare node: 1.x's numbers (enemy.js:
// 548-552, 619, 771-772, 811-817, 1000, 1097-1105, 1607, 1678-1682,
// 2200-2232, 2649-2690, 2726-2737, 2779, 2873-2958, 3013-3027; bullet.js:91-94;
// main.js:2410-2421, 4476-4480, 9406; tuning.js:32, 292, 313, 496-497, 511),
// asserted against the sim on its fixed 1/60 s step and the look against real
// three. The hold, the weave clock, the wind-up and every curtain are checked
// against an ORACLE: 1.x's own per-frame arithmetic for the DRAPER case of
// update() and the non-blob squash spring after it, in 1.x's literals (not the
// tuning file's), drawing its gaps from a copy of the run's rng, with the hero
// walking a path — so every step's position, clocks, spool and squash, and
// every bullet of every curtain, must match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=156';
import { makeRng } from '../../js/sim/rng.js?v=156';
import { TUNING as T } from '../../js/tuning.js?v=156';
import { BEHAVIOUR } from '../../js/sim/species/index.js?v=156';
import { LOOKS } from '../../js/render/looks/index.js?v=156';
import behaviour from '../../js/sim/species/draper.js?v=156';
import look from '../../js/render/looks/draper.js?v=156';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const S = T.species.draper, H = S.hold, C = S.curtain, L = S.look, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const evs = (w, type) => w.events.filter((e) => e.type === type);
// 1.x's clock: how many frames of `v -= dt` until `v <= 0` (enemy.js:2211, 2228)
const frames = (v) => { let n = 0; do { v -= dt; n++; } while (v > 0); return n; };

// a world with nothing in it but what a check puts there; the hero where
// asked, never running out of lives
function world({ seed = 1, mode = 'arcade', hero = [0, 0], dashMode = 'pass', invincible = false, arena = T.arena.landscape } = {}) {
  const w = createWorld({ seed, mode, dashMode, arena });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  w.hero.x = w.hero.px = hero[0]; w.hero.z = w.hero.pz = hero[1];
  if (invincible) w.hero.invinc = 1e9;        // no bullet lands, so every one of a curtain stays to be counted
  return w;
}
// a DRAPER where it is put: anchored (no swarm forces, no crowd) unless
// asked, so its own step is all that moves it; `still` holds it at speed 0.
// It is live from its first step (the core's arrival rule: 1.x had no appear
// phase), so no check asks for one: step 1 below is 1.x's first update
function put(w, x, z, { o = {}, anchored = true, still = false } = {}) {
  const g = api.spawn(w, 'draper', x, z, { ...(still ? { speedMult: 0 } : {}), ...o });
  g.anchored = anchored;
  return g;
}
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
// the bullets a step put on the floor: those not there before it
const fresh = (w, before) => w.bullets.filter((b) => !before.has(b));
const seen = (w) => new Set(w.bullets);

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.8, hp 5, speed 0.9, violet 0x9955ff, bullets 0xcc88ff, reload 5.0 s (1.x enemy.js:619)',
    S.radius === 0.8 && S.hp === 5 && S.speed === 0.9 && S.color === 0x9955ff && S.bulletColor === 0xcc88ff && S.fireInterval === 5.0);
  check('its own body (a loom), HOLDER, harmless to touch in classic (not in MELEE_TYPES), elites multiply its hp',
    S.family === 'custom' && S.role === 'HOLDER' && S.contact === false && !S.noHpMult);
  check('a HARDCADE biter, dialect FAN (1.x tuning.js:496-497, 511)', S.revenge === 'FAN');
  const MR = T.movement.roles.HOLDER;
  check('HOLDER\'s share of the swarm forces: dodge 0, flock 0, current 0.25, weave 0 (1.x tuning.js:292)',
    MR.dodge === 0 && MR.flock === 0 && MR.current === 0.25 && MR.weave === 0);
  check('the hold: 11 ± 1.5; distance floor 0.001 (1.x enemy.js:1682, 2204-2206)', H.distance === 11 && H.band === 1.5 && S.distFloor === 0.001);
  check('the weave: first U(2, 4), wind-up only within 17, wind-up 0.9 s, spools 18 rad/s (1.x enemy.js:2208, 2213, 2229)',
    S.weaveFirst[0] === 2 && S.weaveFirst[1] === 4 && S.range === 17 && S.windup === 0.9 && S.spoolSpin === 18);
  check('the curtain: 15 slots 0.85 apart about slot 7, a 2-slot gap at 2..12, speedMult 0.72 (1.x enemy.js:2218-2223)',
    C.slots === 15 && C.centre === 7 && C.spacing === 0.85 && C.gap[0] === 2 && C.gap[1] === 12 && C.gapWidth === 2 && C.speedMult === 0.72);
  check('the curtain\'s ends are carried inside 1.x\'s square cull, max(HALF_X, HALF_Z) + 2 (bullet.js:134, main.js:10428), past the core\'s walls + 1.5',
    S.cull.square === 2 && S.cull.core === 1.5);
  check('the non-blob squash spring 0.18 / 0.90, held to 0.55..1.55 (1.x enemy.js:2728-2731)',
    S.squash.spring === 0.18 && S.squash.damp === 0.90 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('the kill voice is 1.x\'s non-blob pop: square 380 → 55 Hz over 0.18 s, 0.22, with a 0.13 s hiss at 0.09 (main.js:4476-4480, audio.js:243-249)',
    S.deathSound.wave === 'square' && S.deathSound.f0 === 380 && S.deathSound.f1 === 55 && S.deathSound.dur === 0.18 && S.deathSound.vol === 0.22
    && S.deathSound.noiseVol === 0.09 && S.deathSound.noiseDur === 0.13);
  check('the loom: BoxGeometry(1.5, 0.9, 0.4) in the omega satin — roughness 0.04, transmission 0.40, wobble 0.35 (enemy.js:323, 772; tuning.js:32)',
    L.loom.width === 1.5 && L.loom.height === 0.9 && L.loom.depth === 0.4 && L.roughness === 0.04 && L.transmission === 0.40 && L.wobble === 0.35 && L.sqFloor === 0.1);
  check('the spools: CylinderGeometry(0.14, 0.14, 1.0, 8) at ±0.78, unlit 0xcc88ff (enemy.js:1099-1103)',
    L.spool.radius === 0.14 && L.spool.height === 1.0 && L.spool.segments === 8 && L.spool.x === 0.78 && L.spool.color === 0xcc88ff);
  check('the strobe 1.x wrote (0x5522aa / 0x110022 at 22) is kept, off: 1.x painted black over it the same frame (enemy.js:2212, 2688-2689)',
    L.strobe.on === false && L.strobe.colors[0] === 0x5522aa && L.strobe.colors[1] === 0x110022 && L.strobe.rate === 22);
  const src = readFileSync(new URL('../../js/sim/species/draper.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no special hits, no contact and no death of its own', !behaviour.onHit && !behaviour.onKill && !behaviour.hitTest && !behaviour.touches);
  check('the registries hold this behaviour and this look', BEHAVIOUR.draper === behaviour && LOOKS.draper === look);
  check('the base bullet is 7 u/s for 4 s, so a curtain bullet flies at 5.04 for 20.16 u (bullet.js:94, bullets-graze.md §3.2)',
    T.bullets.gelSpeed === 7 && T.bullets.life === 4 && near(T.bullets.gelSpeed * C.speedMult, 5.04, 1e-12));
}

// ── the hold (1.x enemy.js:2204-2207) ────────────────────────────────
{
  const one = (x, z, o = {}) => { const w = world(); const g = put(w, x, z, { o }); step(w, IDLE); return g; };
  let g = one(15, 0);
  check('too far (d > 12.5): it walks straight at you at 0.9 u/s', near(g.x, 15 - 0.9 * dt, 1e-12) && g.z === 0, `${g.x}`);
  g = one(15, 0, { speedMult: 1.5 });
  check('… at its speed × the wave\'s speedMult (× 1.5: 1.35 u/s)', near(g.x, 15 - 1.35 * dt, 1e-12));
  g = one(15, 0, { affix: 'swift' });
  check('… × SWIFT\'s 1.35 (main.js:9415-9416)', near(g.x, 15 - 0.9 * T.variants.swiftSpeed * dt, 1e-12));
  { const w = world(); g = put(w, 15, 0); g.surgeT = 3; g.surgeMult = 1.6; step(w, IDLE);
    check('… × a SIREN\'s surge while it lasts (1.x enemy.js:1699-1700)', near(g.x, 15 - 0.9 * 1.6 * dt, 1e-12)); }
  g = one(5, 0);
  check('too close (d < 9.5): it backs straight off at the same 0.9 u/s', near(g.x, 5 + 0.9 * dt, 1e-12) && g.z === 0, `${g.x}`);
  g = one(-6, -6);
  const u = 1 / Math.SQRT2;
  check('… along the line to you, from (−6, −6) out toward (−7, −7)', near(g.x, -6 - u * 0.9 * dt, 1e-12) && near(g.z, -6 - u * 0.9 * dt, 1e-12));
  g = one(11, 0);
  check('in the band it stands', g.x === 11 && g.z === 0 && g.vx === 0 && g.vz === 0);
  check('the band is strict: 12.5 stands, 12.5 + ε walks in; 9.5 stands, 9.5 − ε backs off (enemy.js:2205-2206)',
    one(12.5, 0).x === 12.5 && one(12.5 + 1e-9, 0).x < 12.5 + 1e-9 && one(9.5, 0).x === 9.5 && one(9.5 - 1e-9, 0).x > 9.5 - 1e-9);
  g = one(0, 0);
  check('standing on you, the distance floors at 0.001 and it stays put (1.x enemy.js:1682)', g.x === 0 && g.z === 0);
  g = one(15, 0);
  check('its face is square to you: faceX/Z the unit line to you (enemy.js:2207 rotation.y = atan2(ddx, ddz))', near(g.faceX, -1) && g.faceZ === 0);
  g = one(3, -4);
  check('… from (3, −4): (−0.6, 0.8)', near(g.faceX, -0.6, 1e-12) && near(g.faceZ, 0.8, 1e-12));
  { const w = world({ hero: [4, 0] }); const ga = put(w, 0, 3);
    check('it is born facing you (1.x\'s update turned it from its first frame)', near(ga.faceX, 0.8, 1e-12) && near(ga.faceZ, -0.6, 1e-12)); }
  {
    // the arrival: 1.x made a body in the spawn pump (main.js:9350-9371) ahead of
    // the update loop of the same frame (main.js:10367-10369), and it had no
    // appear phase — so its first update, the frame it was made, already walked
    // it, turned it and ran its clock (enemy.js:2204-2208, 2228). A bare
    // spawn here, no options at all, is that body.
    const w = world();
    const g = api.spawn(w, 'draper', 15, 0); g.anchored = true;
    const w0 = g.s.weave;
    check('a bare spawn is live at once: active, no appear to wait out (the core\'s arrival rule, 1.x had none)', g.state === 'active');
    step(w, IDLE);
    check('… its first step walks it in at 0.9 u/s, as 1.x\'s first update did (enemy.js:2205)', near(g.x, 15 - 0.9 * dt, 1e-12) && g.z === 0, `${g.x}`);
    check('… and runs its weave clock one step down from the U(2, 4) it was made with (enemy.js:2208, 2228)', near(g.s.weave, w0 - dt, 1e-12) && g.s.windup === 0);
    w.hero.x = w.hero.px = g.x; w.hero.z = w.hero.pz = 4;
    step(w, IDLE);
    check('… and every step after turns it to wherever you went (enemy.js:2207)', near(g.faceX, 0, 1e-9) && near(g.faceZ, 1, 1e-12), `${g.faceX} ${g.faceZ}`);
  }
}
{
  // twenty seconds from far off, you standing still: in to the band's edge, then it holds
  const w = world(), g = put(w, -16, 0);
  let arrived = -1;
  for (let i = 0; i < 1200; i++) { step(w, IDLE); if (arrived < 0 && Math.hypot(g.x, g.z) <= 12.5) arrived = i; }
  check('from 16 it walks in to 12.5 in (16 − 12.5) / 0.9 s, then holds there', Math.abs(arrived - Math.round(3.5 / 0.9 / dt)) <= 1
    && near(Math.hypot(g.x, g.z), 12.5, 0.9 * dt), `${arrived} ${Math.hypot(g.x, g.z)}`);
}

// ── the weave clock, the wind-up, the reload (1.x enemy.js:2208-2229) ─
{
  // first clocks: U(2, 4), one per body, from the run's rng
  let lo = Infinity, hi = -Infinity;
  for (let seed = 1; seed <= 300; seed++) { const w = world({ seed }); const g = put(w, -11, 0); lo = Math.min(lo, g.s.weave); hi = Math.max(hi, g.s.weave); }
  check('the first weave clock is U(2, 4) s, drawn at its making (1.x enemy.js:2208)', lo >= 2 && hi < 4 && lo < 2.05 && hi > 3.95, `${lo} ${hi}`);

  for (const im of [1, 0.8, 0.55]) {
    const w = world({ seed: 5, invincible: true }), g = put(w, -11, 0, { o: { intervalMult: im } });
    const w0 = g.s.weave;
    const windupAt = [], curtainAt = [];
    let was = false, n = 0;
    for (let i = 1; i <= 1600; i++) {
      step(w, IDLE);
      const up = g.s.windup > 0;
      if (up && !was) windupAt.push(i);
      was = up;
      if (g.s.curtains > n) { n = g.s.curtains; curtainAt.push(i); }
    }
    const k1 = frames(w0), wu = frames(0.9), re = frames(5.0 * im);
    check(`× ${im}: the first wind-up starts the step its weave clock (${w0.toFixed(3)} s) runs out: step ${k1}`, windupAt[0] === k1, `${windupAt[0]}`);
    check(`× ${im}: … and the curtain looms ${wu} steps later (0.9 s, the step the wind-up runs out)`, curtainAt[0] === k1 + wu, `${curtainAt[0]}`);
    const per = wu + re;
    check(`× ${im}: then a wind-up every ${re} + ${wu} = ${per} steps: the reload (5.0 × ${im} s) runs only between wind-ups`,
      curtainAt.length >= 3 && curtainAt.every((c, j) => j === 0 || c - curtainAt[j - 1] === per) && windupAt.every((a, j) => a === curtainAt[j] - wu),
      `${curtainAt} / ${windupAt}`);
  }
  check('at wave 1, curtain to curtain is 355 steps: 5.92 s, not the CFG\'s 5.0', frames(0.9) === 54 && frames(5.0) === 301);
}
{
  // the range: a clock run out with you 17 or more off waits, and the wind-up starts the first step you are inside
  const w = world({ hero: [0, 0], invincible: true }), g = put(w, -18, 0, { still: true });
  g.s.weave = 0.05;
  run(w, 200);
  check('a clock run out with you 18 off: no wind-up, the clock still running (negative)', g.s.windup === 0 && g.s.curtains === 0 && near(g.s.weave, 0.05 - 200 * dt, 1e-9), `${g.s.weave}`);
  w.hero.x = w.hero.px = -1; step(w, IDLE);
  check('… exactly 17 off is not inside (strictly dist < 17)', g.s.windup === 0);
  w.hero.x = w.hero.px = -1.000001; step(w, IDLE);
  check('… a hair inside 17, the wind-up starts that step, a whole 0.9 s', g.s.windup === 0.9);
  w.hero.x = w.hero.px = 15;
  const before = seen(w);
  let at = -1;
  for (let i = 1; i <= 80 && at < 0; i++) { step(w, IDLE); if (g.s.curtains) at = i; }
  check('… and runs out whatever you do after: you 33 off, the curtain looms 54 steps on', at === 54, `${at}`);
  const bs = fresh(w, before);
  check('… aimed where you are THEN', bs.length === 13 && bs.every((b) => near(b.vx, 5.04, 1e-9) && near(b.vz, 0, 1e-9)));
  check('the weave clock does not run through the wind-up, and is reloaded at the curtain (5.0 × intervalMult)', near(g.s.weave, 5.0, 1e-12));
}

// ── the curtain (1.x enemy.js:2214-2224) ─────────────────────────────
{
  const w = world({ hero: [0, 0], invincible: true }), g = put(w, -11, 0, { still: true });
  g.s.weave = dt / 2;
  step(w, IDLE);
  check('the clock out with you 11 off: the wind-up starts', g.s.windup === 0.9);
  w.hero.x = w.hero.px = 0; w.hero.z = w.hero.pz = 6;     // you step aside while it winds up
  const before = seen(w);
  run(w, 53);
  check('… nothing looms through the wind-up', g.s.curtains === 0 && fresh(w, before).length === 0);
  step(w, IDLE);
  const bs = fresh(w, before), ev = evs(w, 'gelShot');
  const d = Math.hypot(11, 6), fx = 11 / d, fz = 6 / d, px = -fz, pz = fx;
  check('the curtain: 13 bullets, one gelShot event from its centre', bs.length === 13 && ev.length === 1 && ev[0].x === -11 && ev[0].z === 0 && ev[0].kind === 'draper');
  check('every one marching along the line to where you are now, at 7 × 0.72 = 5.04 u/s', bs.every((b) => near(b.vx, fx * 5.04, 1e-9) && near(b.vz, fz * 5.04, 1e-9)));
  const slots = bs.map((b) => {
    const ox = b.px - -11, oz = b.pz - 0, along = ox * fx + oz * fz, o = ox * px + oz * pz;
    return { k: o / 0.85 + 7, along };
  });
  check('… each on the line square to the aim through its centre (lateral (−fz, fx))', slots.every((s) => near(s.along, 0, 1e-9)));
  check('… at the slots (k − 7) × 0.85, k whole', slots.every((s) => near(s.k, Math.round(s.k), 1e-9)));
  const ks = slots.map((s) => Math.round(s.k)).sort((a, b) => a - b);
  const missing = [...Array(15).keys()].filter((k) => !ks.includes(k));
  check('… of 0..14 with exactly two, side by side, left empty: the way through', ks.length === 13 && new Set(ks).size === 13 && missing.length === 2 && missing[1] === missing[0] + 1, `${missing}`);
  check('… the gap at 2..12, as the sim reports it', missing[0] >= 2 && missing[0] <= 12 && g.s.gap === missing[0], `${missing[0]} ${g.s.gap}`);
  const offs = bs.map((b) => (b.px - -11) * px + (b.pz - 0) * pz);
  check('… so both end slots always stand: the wall spans ±5.95 across the line', ks[0] === 0 && ks[12] === 14
    && near(Math.min(...offs), -5.95, 1e-9) && near(Math.max(...offs), 5.95, 1e-9), `${Math.min(...offs)} ${Math.max(...offs)}`);
  check('… in 0xcc88ff, its own (src draper), the plain bullet: radius 0.15, 4 s, not homing, not corpse fire',
    bs.every((b) => b.color === 0xcc88ff && b.src === 'draper' && b.r === T.bullets.gelRadius && near(b.life, 4 - dt, 1e-12) && b.homing === 0 && !b.revenge && !b.hero));
  check('the curtain moves on its own step: one step of 5.04 u/s from where it spawned', bs.every((b) => near(b.x - b.px, b.vx * dt, 1e-12)));
  check('the sim raises no tell for the wind-up (1.x\'s strobe never reached the screen)', g.tell === 0);
}
{
  // the gaps: 2..12, every one of them, from the run's rng (1.x: 2 + floor(random × 11))
  const count = new Map();
  let agree = true;
  for (let seed = 1; seed <= 330; seed++) {
    const w = world({ seed, invincible: true });
    const r = makeRng(0); r.state = w.rng.state;
    const g = put(w, -11, 0, { still: true });
    r.next();                                    // its first weave clock
    g.s.weave = 0;
    run(w, 1 + frames(0.9));
    const want = 2 + Math.floor(r.next() * 11);
    if (g.s.curtains !== 1 || g.s.gap !== want) agree = false;
    count.set(g.s.gap, (count.get(g.s.gap) || 0) + 1);
  }
  const keys = [...count.keys()].sort((a, b) => a - b);
  check('the gap is 2 + floor(rng × 11) from the run\'s rng, after its first weave clock', agree);
  check('… so every gap 2..12 turns up, and no other', keys.length === 11 && keys[0] === 2 && keys[10] === 12 && [...count.values()].every((n) => n > 10), `${keys}`);
}
{
  // standing exactly on its centre: 1.x's aim is (0, 0) — a curtain stacked on the centre with no velocity
  const w = world({ hero: [3, 2], invincible: true }), g = put(w, 3, 2, { still: true });
  g.s.weave = 0;
  const before = seen(w);
  run(w, 1 + frames(0.9));
  const bs = fresh(w, before);
  check('you standing exactly on it: 13 bullets on its centre, standing still (1.x\'s fx = fz = 0)',
    g.s.curtains === 1 && bs.length === 13 && bs.every((b) => b.x === 3 && b.z === 2 && b.vx === 0 && b.vz === 0));
}
{
  // a curtain loomed at a slant against a wall: its end slots stand past the wall. 1.x culled a bullet only past
  // max(HALF_X, HALF_Z) + 2 on either axis (bullet.js:130-135, main.js:10428), so they marched back onto the floor
  // as part of the wall; the core culls per axis at the walls + 1.5, so the behaviour carries them in itself
  const SQ = (w) => Math.max(w.hx, w.hz) + 2;
  const slant = (arena, at, hero, label) => {
    const w = world({ hero, invincible: true, arena }), g = put(w, at[0], at[1], { still: true });
    const r = makeRng(0); r.state = w.rng.state;                    // after its first weave clock was drawn
    g.s.weave = 0;
    const d = Math.hypot(hero[0] - at[0], hero[1] - at[1]), fx = (hero[0] - at[0]) / d, fz = (hero[1] - at[1]) / d;
    run(w, frames(0.9));                                             // the wind-up starts on the first step; the curtain is the next
    const gap = 2 + Math.floor(r.next() * 11);                       // the run's next draw is the gap
    const ob = [];
    for (let k = 0; k < 15; k++) if (k !== gap && k !== gap + 1) {
      const o = (k - 7) * 0.85;
      ob.push({ k, x: at[0] - fz * o, z: at[1] + fx * o, vx: fx * 5.04, vz: fz * 5.04, life: 4 });
    }
    const inCore = (b) => Math.abs(b.x) <= w.hx + 1.5 && Math.abs(b.z) <= w.hz + 1.5;
    let ok = true, bad = '', most = 0, hidden = 0, firstIn = new Map(), stray = false;
    for (let i = 0; i < 260; i++) {
      step(w, IDLE);
      for (let j = ob.length - 1; j >= 0; j--) {
        const b = ob[j];
        b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
        if (b.life <= 0 || Math.abs(b.x) > SQ(w) || Math.abs(b.z) > SQ(w)) ob.splice(j, 1);
        else if (inCore(b) && !firstIn.has(b.k)) firstIn.set(b.k, i);
      }
      if (i === 0) hidden = g.s.carried.length;
      const want = ob.filter(inCore), got = w.bullets.filter((b) => b.src === 'draper');
      if (got.some((b) => !inCore(b))) stray = true;
      most = Math.max(most, got.length);
      const match = want.every((c) => got.some((b) => near(b.x, c.x, 1e-9) && near(b.z, c.z, 1e-9) && near(b.life, c.life, 1e-9)));
      if (ok && !(match && got.length === want.length)) { ok = false; bad = `step ${i}: ${got.length} vs 1.x's ${want.length}`; }
    }
    const late = [...firstIn.values()].filter((t) => t > 0).length;
    check(`${label}: the ends past the core's keep box are carried, not culled (${hidden} of 13), and come onto the floor the step 1.x's do (${late} late)`,
      g.s.curtains === 1 && hidden >= 2 && late === hidden, `${hidden} ${late}`);
    check(`${label}: … every step, the floor holds exactly 1.x's bullets inside the keep box, where and as old as 1.x's — all 13 at once`,
      ok && most === 13 && !stray, `${bad} most ${most}`);
    check(`${label}: … and every one of them has left the floor or run out by 4 s, as 1.x's did`, ob.length === 0 && w.bullets.filter((b) => b.src === 'draper').length === 0);
    check(`${label}: … nothing is carried after`, g.s.carried.length === 0);
    return { w, g };
  };
  slant(T.arena.landscape, [0, -10.2], [8, -3], 'landscape, against the far wall');
  slant(T.arena.portrait, [-10.2, 4], [-3, -4.5], 'portrait, against the left wall');
  // killed while it carries: what is on the floor flies on, nothing breaks (the carried ends go with it, the gap)
  {
    const w = world({ hero: [8, -3], invincible: true }), g = put(w, 0, -10.2, { still: true });
    g.s.weave = 0; run(w, 1 + frames(0.9));
    const on = w.bullets.filter((b) => b.src === 'draper').length, carried = g.s.carried.length;
    api.kill(w, g, 'hero');
    let threw = null;
    try { run(w, 120); } catch (e) { threw = e; }
    check('killed while it carries curtain ends: the bullets on the floor fly on, and nothing throws',
      !threw && carried >= 2 && w.bullets.filter((b) => b.src === 'draper').length === on, `${threw} ${carried} ${on}`);
  }
}

// ── against 1.x frame by frame: the hold, the clocks, the curtains, the spring ──
{
  // 1.x's DRAPER (enemy.js:1678-1682, 2204-2229) and its non-blob squash
  // (enemy.js:2728-2731) in its literals, drawing from a copy of the run's
  // rng; the hero walking a path in and out of every band and out past 17;
  // the core's wall clamp at the body's radius
  const path = [[0, 0, 200], [-1, 0, 60], [0, 0, 90], [1, 0, 170], [0, 0, 260], [-1, 0, 55], [0, -1, 40], [0, 1, 90],
    [0.6, -0.8, 70], [0, 0, 380], [-0.6, 0.8, 120], [0, 0, 300]];
  const kicks = new Set([30, 31, 250, 640]);
  for (const [mult, im] of [[1, 1], [1.3, 0.7]]) {
    const w = world({ seed: 11, hero: [0, 0], invincible: true });
    const r = makeRng(0); r.state = w.rng.state;
    const g = put(w, -14, 3, { o: { speedMult: mult, intervalMult: im } });
    const o = { x: -14, z: 3, weave: 2.0 + r.next() * 2, windup: 0, spool: 0, sq: 1, sqV: 0 };
    // 1.x's bullets: spawnDir's (bullet.js:91-117), then bullets.update's move, age and SQUARE cull — |x| or |z| past
    // max(HALF_X, HALF_Z) + 2 (bullet.js:130-135, main.js:10428), not the core's per-axis keep box
    const ob = [], SQ = Math.max(w.hx, w.hz) + 2, inCore = (b) => Math.abs(b.x) <= w.hx + 1.5 && Math.abs(b.z) <= w.hz + 1.5;
    let ok = true, bad = '', bbad = '', i = 0, wall = 0, curtains = 0, bulletsOk = true, arms = new Set(), waited = false, outside = 0;
    const came = new Set();
    for (const [mx, mz, steps] of path) {
      for (let k = 0; k < steps; k++, i++) {
        step(w, { ...IDLE, mx, mz });
        const h = w.hero;
        const ex = o.x, ez = o.z, ddx = h.x - ex, ddz = h.z - ez, dist = Math.hypot(ddx, ddz) || 0.001;
        const spd = 0.9 * mult;
        if (dist > 11 + 1.5) { o.x += (ddx / dist) * spd * dt; o.z += (ddz / dist) * spd * dt; arms.add('in'); }
        else if (dist < 11 - 1.5) { o.x -= (ddx / dist) * spd * dt; o.z -= (ddz / dist) * spd * dt; arms.add('out'); }
        else arms.add('hold');
        if (o.windup > 0) {
          o.windup -= dt;
          o.spool += dt * 18;
          if (o.windup <= 0) {
            const fx = ddx / dist, fz = ddz / dist, px2 = -fz, pz2 = fx;
            const gap = 2 + Math.floor(r.next() * 11);
            curtains++;
            for (let k2 = 0; k2 < 15; k2++) {
              if (k2 === gap || k2 === gap + 1) continue;
              const off = (k2 - 7) * 0.85;
              ob.push({ x: ex + px2 * off, z: ez + pz2 * off, vx: fx * 7 * 0.72, vz: fz * 7 * 0.72, life: 4, id: `${curtains}:${k2}`, out: false });
            }
            o.weave = 5.0 * im;
          }
        } else {
          o.weave -= dt;
          if (o.weave <= 0 && dist >= 17) waited = true;
          if (o.weave <= 0 && dist < 17) o.windup = 0.9;
        }
        const bx = w.hx - 0.8, bz = w.hz - 0.8;
        if (Math.abs(o.x) > bx || Math.abs(o.z) > bz) wall++;
        o.x = clamp(o.x, -bx, bx); o.z = clamp(o.z, -bz, bz);
        o.sqV = (o.sqV - (o.sq - 1.0) * 0.18) * 0.90;
        o.sq = Math.max(0.55, Math.min(1.55, o.sq + o.sqV));
        if (!(near(g.x, o.x, 1e-9) && near(g.z, o.z, 1e-9) && near(g.s.weave, o.weave, 1e-9) && near(g.s.windup, o.windup, 1e-9)
          && near(g.s.spool, o.spool, 1e-9) && near(g.sq, o.sq, 1e-12) && near(g.sqV, o.sqV, 1e-12))) {
          if (ok) bad = `step ${i}: (${g.x}, ${g.z}) weave ${g.s.weave} windup ${g.s.windup} vs (${o.x}, ${o.z}) weave ${o.weave} windup ${o.windup}`;
          ok = false;
        }
        // every bullet of every curtain as 1.x's bullets.update moved, aged and culled it: the ones inside the core's
        // keep box must be on the floor exactly there, as old, flying the same way — and nothing else may be
        for (let j = ob.length - 1; j >= 0; j--) {
          const b = ob[j];
          b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
          if (b.life <= 0 || Math.abs(b.x) > SQ || Math.abs(b.z) > SQ) { ob.splice(j, 1); continue; }
          if (!inCore(b)) { if (!b.out) outside++; b.out = true; } else if (b.out) came.add(b.id);
        }
        const want = ob.filter(inCore), got = w.bullets.filter((b) => !b.hero && b.src === 'draper');
        const match = want.every((c) => got.some((b) => near(b.x, c.x, 1e-9) && near(b.z, c.z, 1e-9) && near(b.vx, c.vx, 1e-9) && near(b.vz, c.vz, 1e-9) && near(b.life, c.life, 1e-9)));
        if (!(match && got.length === want.length)) { if (bulletsOk) bbad = `step ${i}: ${got.length} bullets on the floor vs 1.x's ${want.length}`; bulletsOk = false; }
        // a hit after the step: 1.x's hit() kicks _sqV −= 0.75 (enemy.js:1607), as the core's bullet test does
        if (kicks.has(i)) { o.sqV += -0.75; g.sqV += T.gel.sq.hit; }
      }
    }
    check(`× ${mult} speed, × ${im} reload: ${i} steps of 1.x's hold, weave clock, wind-up, spools and non-blob spring, step for step (arms: ${[...arms].join(', ')})`,
      ok && arms.size === 3, bad);
    check(`× ${mult} / × ${im}: … ${curtains} curtains, every bullet on the floor where 1.x's was, as old and flying as it did, and none 1.x`
      + ` did not have there (${outside} went past the core's keep box, ${came.size} of them came back onto the floor)`,
      bulletsOk && curtains >= 3 && g.s.curtains === curtains, `${bbad} — ${curtains} ${g.s.curtains}`);
    check(`× ${mult} / × ${im}: … a clock that ran out with you past 17 waited`, waited);
    check(`× ${mult} / × ${im}: … and the walk never met a wall the oracle had to clamp`, wall === 0, `${wall}`);
  }
  // the spring is 1.x's non-blob one, not the core's blob one
  const w = world(), g = put(w, 11, 0, { still: true });
  step(w, IDLE); g.sqV += T.gel.sq.hit; run(w, 12);
  let bq = 1, bv = T.gel.sq.hit; const [kb, cb] = T.gel.sq.blob;
  for (let j = 0; j < 12; j++) { bv = (bv - (bq - 1) * kb) * cb; bq = clamp(bq + bv, 0.55, 1.55); }
  let nq = 1, nv = T.gel.sq.hit;
  for (let j = 0; j < 12; j++) { nv = (nv - (nq - 1) * 0.18) * 0.90; nq = clamp(nq + nv, 0.55, 1.55); }
  check('a hit squashes it on 1.x\'s non-blob spring (0.18 / 0.90), not the gel dome\'s (0.24 / 0.86)', near(g.sq, nq, 1e-12) && !near(g.sq, bq, 1e-6), `${g.sq} ${nq} ${bq}`);
}

// ── hits, touch, its corpse, a shove ─────────────────────────────────
{
  // five of your shots kill it (1 hp a hit, the 0.8 circle)
  const w = world({ hero: [0, 0] }), g = put(w, 5, 0, { still: true });
  const hits = [];
  for (let i = 0; i < 120 && g.alive; i++) { step(w, { ...IDLE, aim: true, fire: true }); for (const e of evs(w, 'hit')) if (e.id === g.id) hits.push(g.hp); }
  check('your shots take 1 hp each: 5 hits and it dies (1.x enemy.js:619, 1603-1607)', !g.alive && hits.join() === '4,3,2,1,0', hits.join());
  // touching it does not hurt
  const wt = world({ hero: [0, 0] }); put(wt, 0.6, 0, { still: true });
  run(wt, 30);
  check('standing in it does not hurt you (not in 1.x\'s MELEE_TYPES, main.js:2410-2421)', wt.hero.lives === 1e9 && wt.hero.mercy <= 0);
  // its corpse: HARDCADE's FAN from wave 3
  const corpse = (mode, wave) => {
    const wc = world({ mode, hero: [0, 0] }); wc.wave = wave;
    const gc = put(wc, -11, 0, { still: true });
    const before = seen(wc);
    api.kill(wc, gc, 'hero');
    for (let i = 0; i < 120 && wc.seeds.length; i++) step(wc, IDLE);   // v103: the corpse warns before it bites
    return fresh(wc, before);
  };
  const fan = corpse('hardcade', 7), aim = 0;
  const angles = fan.map((b) => Math.atan2(b.vz, b.vx)).sort((a, b) => a - b);
  check('in HARDCADE its corpse bites FAN: 5 slow bullets 0.5 rad apart at you (1.x tuning.js:511, 515; main.js:4409-4415)',
    fan.length === 5 && fan.every((b) => b.revenge && b.src === 'draper' && near(Math.hypot(b.vx, b.vz), 7 * T.revenge.speedMult, 1e-9))
    && angles.every((a, j) => near(a, aim + (j - 2) * 0.5, 1e-9)), `${fan.length} ${angles}`);
  check('… not in ARCADE, and not before wave 3 (1.x tuning.js:498)', corpse('arcade', 7).length === 0 && corpse('hardcade', 2).length === 0);
  // the PUSH dash's shove is carried, not thrown away
  const shoved = (dashMode) => {
    const wp = world({ hero: [0, 0], dashMode }), gp = put(wp, 2, 0, { anchored: false });
    step(wp, { ...IDLE, mx: 1, dash: true }); run(wp, 40);
    return gp;
  };
  const gp = shoved('push'), gq = shoved('pass');
  check('a PUSH dash shoves it away and the shove carries it (its own walk on top)', gp.x - gq.x > 2, `${gp.x} ${gq.x}`);
}

// ── determinism ──────────────────────────────────────────────────────
{
  const go = () => {
    const w = world({ seed: 7, hero: [0, 0] });
    put(w, -12, 4, { anchored: false }); put(w, 12, -3, { anchored: false });
    for (let i = 0; i < 900; i++) step(w, { ...IDLE, mx: Math.sin(i / 30), mz: Math.cos(i / 45) * 0.5 });
    return w.gels.map((g) => `${g.x},${g.z},${g.sq},${g.s.weave},${g.s.gap}`).join(';') + '|' + w.bullets.map((b) => `${b.x},${b.z}`).join(';');
  };
  check('a run replays from its seed', go() === go());
}

// ── the look: the loom, its face, the spools, the squash, the death ───
{
  let matArgs = null;
  const scene = new THREE.Scene();
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene, geo: {}, kind: 'draper',
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, tear: { value: 0 }, hitDir: { value: new THREE.Vector2() } };
      return m;
    } };
  const v = { kind: 'draper', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0.4, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel of 1.x\'s omega family (uRadius 0.8, wobble 0.35, roughness 0.04, transmission 0.40)',
    v.own === true && matArgs[0] === 0x9955ff && matArgs[1] === 'omega' && matArgs[2] === 0.8 && matArgs[3].wobble === 0.35
    && near(v.mat.roughness, 0.04) && near(v.mat.transmission, 0.40) && v.mesh.material === v.mat);
  check('no hit ripple and no death thrash (1.x: blob bodies only) — the core sees no gel handle, the look keeps it', v.mat.gel === undefined && v.gel && v.gel.hit);
  const P = v.mesh.geometry.parameters;
  check('the loom is BoxGeometry(1.5, 0.9, 0.4), one segment a side, centred (1.x enemy.js:772)',
    v.mesh.geometry.type === 'BoxGeometry' && P.width === 1.5 && P.height === 0.9 && P.depth === 0.4
    && P.widthSegments === 1 && P.heightSegments === 1 && P.depthSegments === 1);
  const SP = v.spools[0].geometry.parameters;
  check('two spools, CylinderGeometry(0.14, 0.14, 1.0, 8), children of the loom at (±0.78, 0, 0), unlit 0xcc88ff (enemy.js:1099-1104)',
    v.spools.length === 2 && v.spools.every((s) => s.parent === v.mesh && s.material === v.spoolMat) && v.spools[0].geometry.type === 'CylinderGeometry'
    && SP.radiusTop === 0.14 && SP.radiusBottom === 0.14 && SP.height === 1.0 && SP.radialSegments === 8
    && v.spools[0].position.x === -0.78 && v.spools[1].position.x === 0.78 && v.spools.every((s) => s.position.y === 0 && s.position.z === 0)
    && v.spoolMat.isMeshBasicNodeMaterial && v.spoolMat.color.getHex() === 0xcc88ff);

  // 1.x's mesh matrix: T(x, 0.8, z) · R(0, atan2(ddx, ddz), 0) · S(sx·rm, sq·rm, sx·rm) (enemy.js:1000, 2207, 2779)
  const want = (x, y, z, ry, sx, sy) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sx));
  const same = (m, e, eps = 1e-9) => m.elements.every((a, i) => near(a, e.elements[i], eps));
  const sync = (g, w, time, grow = 1) => {
    v.root.position.set(g.x, 0, g.z);
    v.squash.scale.set(1 / Math.sqrt(g.sq), g.sq, 1 / Math.sqrt(g.sq));
    look.update(v, g, w, time, grow);
    v.root.updateMatrixWorld(true);
  };
  const w = world({ hero: [0, 0] }), g = put(w, -11, 0, { still: true });
  step(w, IDLE);
  sync(g, w, 0);
  check('the loom\'s centre stands at 0.8, the CFG radius — hanging 0.35 off the floor (1.x enemy.js:1000)', same(v.mesh.matrixWorld, want(-11, 0.8, 0, Math.PI / 2, 1, 1)));
  check('… its broad face (local +z) turned to you', (() => { const n = new THREE.Vector3(0, 0, 1).transformDirection(v.mesh.matrixWorld); return near(n.x, 1) && near(n.z, 0); })());
  const sp = new THREE.Vector3().setFromMatrixPosition(v.spools[1].matrixWorld);
  check('… the spools standing at its ends, across your line', near(sp.x, -11) && near(sp.y, 0.8) && near(Math.abs(sp.z), 0.78));
  g.faceX = 0.6; g.faceZ = 0.8;
  sync(g, w, 0);
  check('it turns by the sim\'s face: atan2(faceX, faceZ) (enemy.js:2207)', near(v.mesh.rotation.y, Math.atan2(0.6, 0.8)) && same(v.mesh.matrixWorld, want(-11, 0.8, 0, Math.atan2(0.6, 0.8), 1, 1)));
  g.faceX = 1; g.faceZ = 0;
  g.s.spool = 1.1;
  sync(g, w, 0);
  check('the spools tumble about their own x by the sim\'s spool angle (enemy.js:2213)', v.spools.every((s) => near(s.rotation.x, 1.1) && s.rotation.y === 0 && s.rotation.z === 0));
  g.s.spool = 0;
  g.sq = 0.7;
  sync(g, w, 0);
  check('1.x\'s squash is the mesh\'s own scale (1/√sq, sq, 1/√sq) about its centre, still at 0.8 (enemy.js:2732, 2779)',
    same(v.mesh.matrixWorld, want(-11, 0.8, 0, Math.PI / 2, 1 / Math.sqrt(0.7), 0.7)));
  g.sq = 2e-3;
  sync(g, w, 0);
  check('… the across-scale floored at 1/√0.1 (enemy.js:2732)', near(v.mesh.scale.x, 1 / Math.sqrt(0.1)) && near(v.mesh.scale.y, 2e-3));
  g.sq = 1;
  const we = world({ hero: [0, 0] }), ge = put(we, -11, 0, { o: { variant: 'elite' }, still: true });
  step(we, IDLE);
  sync(ge, we, 0);
  check('an elite is the same loom × 1.2 about a centre still at 0.8 (main.js:9406, enemy.js:1000, 2779)', same(v.mesh.matrixWorld, want(-11, 0.8, 0, Math.PI / 2, 1.2, 1.2)));
  // the swell: 2.0's alone and the VIEW's alone (TUNING.gel.swell, from the body's
  // first step) — 1.x had no appear and drew its body whole from the frame it was
  // made. The body under the swell is live, so the look draws what the sim holds:
  // its face is the one its own first step turned (enemy.js:2207; 1.x made it in
  // the spawn pump ahead of that frame's update loop, main.js:9350-9371, 10367-10369)
  const wa = world({ hero: [0, 5] }), ga = put(wa, 0, 0);
  wa.hero.x = wa.hero.px = 5; wa.hero.z = wa.hero.pz = 0;   // you go elsewhere before it lands
  step(wa, IDLE);
  sync(ga, wa, 0.1, 0.5);
  check('while the view swells it in it grows from the floor (here at grow 0.5): the loom\'s centre at 0.8 × grow, its size × grow',
    ga.state === 'active' && near(v.mesh.position.y, 0.4) && near(v.mesh.scale.x, 0.5), `${ga.state}`);
  check('… already facing you, wherever you went: its own first step turned it, and the look adds no face of its own (enemy.js:2207)',
    near(ga.faceX, 1, 1e-12) && ga.faceZ === 0 && near(v.mesh.rotation.y, Math.PI / 2));
  check('… and already backing off you along that line, live under the swell (enemy.js:2206)', near(ga.x, -0.9 * dt, 1e-12) && ga.z === 0, `${ga.x}`);
  // the glow: the core's, unless the strobe is switched on
  v.mat.emissive.setScalar(0.5); g.s.windup = 0.5;
  sync(g, w, 0);
  check('through a wind-up the look leaves the emissive to the core: 1.x\'s strobe never showed (enemy.js:2688-2689)', near(v.mat.emissive.r, 0.5));
  L.strobe.on = true;
  sync(g, w, 0.01);
  const lit = v.mat.emissive.getHex();
  sync(g, w, (Math.PI + 0.01 * 22) / 22);
  const dark = v.mat.emissive.getHex();
  check('with look.strobe.on, the strobe 1.x wrote: 0x5522aa / 0x110022 on sin(clock × 22) (enemy.js:2212)',
    [lit, dark].sort().join() === [0x5522aa, 0x110022].sort().join() && lit !== dark, `${lit.toString(16)} ${dark.toString(16)}`);
  v.mat.emissive.setScalar(1); g.flash = 0.1;
  sync(g, w, 0.01);
  check('… under the hit flash, which outranks it (1.x enemy.js:2650-2652)', near(v.mat.emissive.r, 1));
  g.flash = 0; g.s.windup = 0; v.mat.emissive.setScalar(0);
  sync(g, w, 0.01);
  check('… and only while it winds up', v.mat.emissive.getHex() === 0);
  L.strobe.on = false;

  // the death: the core resets the squash group and swells the root by k about the floor;
  // 1.x swelled the loom about its centre from scale 1, an elite's too, its face and spools where they were
  ge.sq = 0.8; ge.s.spool = 2.0; ge.faceX = 0; ge.faceZ = 1; sync(ge, we, 0);
  for (const dyingT of [0.27, 0.14, 0.01]) {
    const k = 1 + (1 - dyingT / T.blob.death) * T.blob.deathSwell;
    v.dyingT = dyingT; v.squash.scale.setScalar(1); v.root.scale.setScalar(k);       // what the core does (actors.js stepFx)
    v.root.updateMatrixWorld(true);
    check(`dying (${dyingT} s left): a uniform 1 × ${k.toFixed(3)} about a centre still at 0.8, face and spools as they were (enemy.js:1482-1484, 3013-3027)`,
      same(v.mesh.matrixWorld, want(-11, 0.8, 0, 0, k, k)) && v.spools.every((s) => near(s.rotation.x, 2.0)));
  }
  v.dyingT = 0; v.root.scale.setScalar(1); ge.sq = 1;
  look.reset(v);
  check('reset: a pooled view comes back unturned, unsquashed, its spools upright', v.mesh.rotation.y === 0 && v.body.scale.x === 1 && v.spools.every((s) => s.rotation.x === 0));
  g.faceX = 1; g.faceZ = 0; g.s.spool = 0;
  sync(g, w, 0);
  check('… and wears the loom where it should on its next update', same(v.mesh.matrixWorld, want(-11, 0.8, 0, Math.PI / 2, 1, 1)));
}

if (failed) { console.log(`✗ draper: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ draper: ${passed} checks`);
