#!/usr/bin/env node
// bambu.mjs — BAMBU's own checks, in bare node: 1.x's numbers (enemy.js:591,
// 865-933, 1468-1470, 1584-1601, 1627-1639, 2537-2560, 2811-2868, 3078-3079;
// main.js:10501-10520; tuning.js:30, 83-91), asserted against the sim on its
// fixed 1/60 s step. The timeline is checked against an ORACLE: 1.x's own
// per-frame arithmetic (the movement switch, then the fire tick, then the
// frame's collisions), run from the same start, so the steps the stalk grows
// on, the telegraphs start on, the lobs leave and land on, and the shots pop
// segments on must match 1.x's frame for frame.
import { readFileSync } from 'node:fs';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';
import { createWorld, step, api } from '../../js/sim/world.js?v=156';
import { TUNING as T } from '../../js/tuning.js?v=156';
import behaviour from '../../js/sim/species/bambu.js?v=156';
import look from '../../js/render/looks/bambu.js?v=156';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.bambu, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// A world with one BAMBU (anchored: nothing but its own step moves it) and a
// hero who never runs out of lives, standing at the origin.
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, mortal = false } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  if (!mortal) w.hero.lives = 1e9;
  const g = api.spawn(w, 'bambu', x, z, o);
  g.anchored = true;
  return { w, g };
}
// a hero bullet that touches the stalk in the next step (it moves 0.4, the
// smallest stalk is 0.6 + 0.15)
const shoot = (w, g) => api.heroBullet(w, g.x, g.z, 0);
const evs = (w, type) => w.events.filter((e) => e.type === type);

// 1.x per frame: the movement switch (emerge, grow), the fire tick (wait,
// telegraph, lob, land), then the frame's collisions (a hit pops a segment)
function oracle(steps, { iM = 1, hits = new Set() } = {}) {
  let emergeT = S.emerge, growT = S.growEvery, fireT = S.firstLob, state = 'waiting', timer = 0, segs = 1, hp = 1;
  const ev = { grow: [], tell: [], launch: [], land: [], pop: [], dead: null, segsAt: [] };
  for (let i = 1; i <= steps; i++) {
    if (emergeT > 0) emergeT -= dt;
    if (emergeT <= 0) { growT -= dt; if (growT <= 0 && segs < S.segments) { growT = S.growEvery; segs++; hp++; ev.grow.push(i); } }
    if (state === 'waiting') { fireT -= dt; if (fireT <= 0 && emergeT <= 0) { state = 'tele'; timer = S.lobTelegraph; ev.tell.push(i); } }
    else if (state === 'tele') { timer -= dt; if (timer <= 0) { state = 'lob'; timer = S.lobFlight; ev.launch.push(i); } }
    else if (state === 'lob') { timer -= dt; if (timer <= 0) { state = 'waiting'; fireT = S.fireInterval * iM; ev.land.push(i); } }
    if (hits.has(i)) { segs--; hp--; ev.pop.push(i); if (hp <= 0) { ev.dead = i; break; } }
    ev.segsAt[i] = segs;
  }
  return ev;
}

// ── the CFG row and TUNING.bambu ──────────────────────────────────────
{
  check('CFG: tan 0xaa8844, radius 0.7, speed 0, hp 1, lob 0xddbb44 every 4.0 s (1.x enemy.js:591)',
    S.color === 0xaa8844 && S.radius === 0.7 && S.speed === 0 && S.hp === 1 && S.bulletColor === 0xddbb44 && S.fireInterval === 4.0);
  check('its own family, HOLDER, no contact damage in classic, bites FAN, never takes the elite hp multiplier',
    S.family === 'custom' && S.role === 'HOLDER' && S.contact === false && S.revenge === 'FAN' && S.noHpMult === true);
  check('TUNING.bambu (1.x tuning.js:83-91): 3 segments of 0.6, telegraph 0.7, flight 1.0, arc 2.4, blob 0.34, spread 1.2, ring 0.55..0.95',
    S.segments === 3 && S.segHeight === 0.6 && S.lobTelegraph === 0.7 && S.lobFlight === 1.0 && S.lobArcHeight === 2.4
    && S.lobBlobRadius === 0.34 && S.lobSpread === 1.2 && S.ring.inner === 0.55 && S.ring.outer === 0.95);
  check('the constructor\'s literals (1.x enemy.js:880, 884, 886): emerge 0.6, first lob 1.3, a segment every 0.18',
    S.emerge === 0.6 && S.firstLob === 1.3 && S.growEvery === 0.18);
  check('the hitbox is max(0.6, 0.6 × segments) (1.x enemy.js:1469)', S.hitRadius.min === 0.6 && S.hitRadius.perSeg === 0.6);
  const L = S.look;
  check('the segments flare 0.20 + 0.02 i → 0.36 + 0.03 i, a 1.14 × 0.06 lip, 14 sides (1.x tuning.js:85-87, enemy.js:1590-1595)',
    L.flareBottom === 0.20 && L.flareBottomStep === 0.02 && L.flareTop === 0.36 && L.flareTopStep === 0.03
    && L.lipScale === 1.14 && L.lipHeight === 0.06 && L.sides === 14);
  check('the material is 1.x\'s bambu family: roughness 0.20, transmission 0.10, wobble 0.35 (1.x tuning.js:30)',
    L.roughness === 0.20 && L.transmission === 0.10 && L.wobble === 0.35);
  check('breath 0.05 at 2.4 rad/s, strain 0.14 (1.x enemy.js:2551-2557)', L.breatheAmp === 0.05 && L.breatheRate === 2.4 && L.strain === 0.14);
  check('the orb r 0.35, opacity 0.9, scale 0.6 + 0.9 p; the ring flashes at 22 / 40 rad/s (1.x enemy.js:891-901, 2831-2840, 2855-2856)',
    L.orb.r === 0.35 && L.orb.opacity === 0.9 && L.orb.scale0 === 0.6 && L.orb.scaleGain === 0.9
    && L.telegraphFlashRate === 22 && L.telegraphOpacity[0] === 0.75 && L.telegraphOpacity[1] === 0.2
    && L.flightFlashRate === 40 && L.flightOpacity[0] === 0.85 && L.flightOpacity[1] === 0.25 && L.ringSegs === 28);
  check('a pop throws 3 tan chunks of 0.14, outward 3, up 2–5 (1.x enemy.js:1630-1637)',
    L.popChunks === 3 && L.popSize === 0.14 && L.popSpeed === 3 && L.popUp[0] === 2 && L.popUp[1] === 5 && L.popColor === 0xaa8844);
  check('HOLDER is 1.x\'s: the wave\'s current at 0.25, nothing else (1.x tuning.js:292)',
    T.movement.roles.HOLDER.current === 0.25 && T.movement.roles.HOLDER.dodge === 0 && T.movement.roles.HOLDER.flock === 0);
  const src = readFileSync(new URL('../../js/sim/species/bambu.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
}

// ── the stalk: emerge, grow, the hitbox ───────────────────────────────
{
  const { w, g } = world();
  check('it starts as one segment: hp 1, hitbox 0.6, maxHp 3', g.s.segs === 1 && g.hp === 1 && near(g.r, 0.6) && g.maxHp === 3);
  const or = oracle(200);
  const grows = [];
  const segsAt = [], rAt = [];
  for (let i = 1; i <= 200; i++) {
    step(w, IDLE);
    if (evs(w, 'grow').length) grows.push(i);
    segsAt[i] = g.s.segs; rAt[i] = g.r;
  }
  check('it grows on 1.x\'s frames: two more segments, 0.18 s apart once the 0.6 s emergence is done',
    JSON.stringify(grows) === JSON.stringify(or.grow) && grows.length === 2, `${grows} vs ${or.grow}`);
  check('… at 0.77 s and 0.95 s (frames 46 and 57)', grows[0] === 46 && grows[1] === 57, `${grows}`);
  check('the emergence takes 36 steps (0.6 s)', (() => { const q = world(); let n = 0; while (q.g.s.emergeT > 0) { step(q.w, IDLE); n++; } return n === 36; })());
  check('full height: 3 segments, hp 3, hitbox 1.8', segsAt[200] === 3 && g.hp === 3 && near(rAt[200], 1.8));
  check('the hitbox is 0.6 / 1.2 / 1.8 with the segments', near(rAt[45], 0.6) && near(rAt[46], 1.2) && near(rAt[57], 1.8));
  check('it never walks: speed 0, anchored, it stands where it was put for 10 s',
    (() => { for (let i = 0; i < 600; i++) step(w, IDLE); return g.x === 10 && g.z === 0; })());
  check('no squash spring (1.x enemy.js:2727): sq stays 1', g.sq === 1 && g.sqV === 0);
}

// ── elites do not grow it ─────────────────────────────────────────────
{
  const { w, g } = world({ o: { variant: 'elite' } });
  check('elite: still hp 1 and a 0.6 hitbox at spawn (noHpMult; the 1.x getter ignores _radiusMult)', g.hp === 1 && near(g.r, 0.6));
  for (let i = 0; i < 120; i++) step(w, IDLE);
  check('elite: full height is still hp 3 and 1.8', g.hp === 3 && near(g.r, 1.8));
  const b = world({ o: { variant: 'elitelite', hp: 9 } }).g;
  check('any spawn hp is overridden to 1 (1.x enemy.js:876)', b.hp === 1);
}

// ── the lob cycle, frame for frame ────────────────────────────────────
for (const iM of [1, 0.89, 0.505]) {
  const { w, g } = world({ seed: 7, o: { intervalMult: iM } });
  const N = 1500, or = oracle(N, { iM });
  const tells = [], launches = [], lands = [], ends = [];
  let prev = g.s.state, lobs = [], targets = [], heroAt = [], gelShots = 0, lobInfo = [], made = [], atLaunch = null, flightOff = 0, flightN = 0;
  for (let i = 1; i <= N; i++) {
    step(w, IDLE);
    if (evs(w, 'tell').length) { tells.push(i); targets.push([g.s.tx, g.s.tz]); heroAt.push([w.hero.x, w.hero.z]); }
    if (evs(w, 'gelShot').length) {
      gelShots++; launches.push(i);
      atLaunch = { gx: g.x, gz: g.z, ringX: g.s.tx, ringZ: g.s.tz, lobsThen: w.lobs.length };
    }
    const l = w.lobs[w.lobs.length - 1];
    if (l && l.t > 0 && l.t <= dt + 1e-12) { made.push(i); lobInfo.push({ ...l, ...atLaunch }); }
    // in flight, the blob is where 1.x's is: p = 1 − timer/1.0, frame by frame (1.x enemy.js:2857-2861)
    if (l && g.s.state === 'lobbing') {
      const p = Math.max(0, Math.min(1, 1 - g.s.timer / S.lobFlight));
      flightOff = Math.max(flightOff, Math.abs(l.x - (l.x0 + (l.tx - l.x0) * p)), Math.abs(l.z - (l.z0 + (l.tz - l.z0) * p)));
      flightN++;
    }
    if (evs(w, 'lobLand').length) lands.push({ i, e: evs(w, 'lobLand')[0] });
    if (prev === 'lobbing' && g.s.state === 'waiting') ends.push(i);
    prev = g.s.state;
    lobs.push(w.lobs.length);
  }
  const tag = `iM ${iM}`;
  check(`${tag}: the telegraphs start on 1.x's frames (1.3 s, then 4.0 × iM + 1.7 s apart)`,
    JSON.stringify(tells) === JSON.stringify(or.tell) && tells.length >= 3, `${tells.slice(0, 4)} vs ${or.tell.slice(0, 4)}`);
  check(`${tag}: the first telegraph is at 1.3 s (frame 78)`, tells[0] === 78);
  check(`${tag}: the lobs leave on 1.x's frames, 0.7 s after each telegraph`,
    JSON.stringify(launches) === JSON.stringify(or.launch) && launches.every((s, k) => s - tells[k] === 42), `${launches.slice(0, 3)}`);
  check(`${tag}: the cycle ends (the fire clock restarts) on 1.x's landing frames, 1.0 s after each launch`,
    JSON.stringify(ends) === JSON.stringify(or.land) && ends.every((s, k) => s - launches[k] === 60), `${ends.slice(0, 3)} vs ${or.land.slice(0, 3)}`);
  check(`${tag}: the blob is handed to the core on the first flight step (the core counts the step a lob is made in as flight)`,
    made.length === launches.length && made.every((m, k) => m === launches[k] + 1) && lobInfo.every((l) => l.lobsThen === 0), `${made.slice(0, 3)} vs ${launches.slice(0, 3)}`);
  check(`${tag}: … so it flies at 1.x's p on every step of the flight`, flightN > 100 && flightOff < 1e-9, `${flightOff}`);
  check(`${tag}: … and lands on 1.x's landing frame, the step the cycle ends`,
    lands.length === ends.length && lands.every((l, k) => l.i === ends[k]), `${lands.map((l) => l.i).slice(0, 3)} vs ${ends.slice(0, 3)}`);
  check(`${tag}: next telegraph comes 4.0 × iM after the landing`,
    tells.slice(1).every((s, k) => near((s - ends[k]) * dt, S.fireInterval * iM, dt + 1e-9)));
  check(`${tag}: each target is the hero's spot within ±1.2 on each axis`,
    targets.every(([x, z], k) => Math.abs(x - heroAt[k][0]) <= 1.2 && Math.abs(z - heroAt[k][1]) <= 1.2));
  check(`${tag}: each lob flies from the stalk to its target, 1.0 s, arc 2.4, splash 0.95, 0.34 wide, in 0xddbb44`,
    lobInfo.every((l) => l.x0 === l.gx && l.z0 === l.gz && l.tx === l.ringX && l.tz === l.ringZ && l.flight === 1.0 && l.height === 2.4
      && l.splash === 0.95 && l.size === 0.34 && l.color === 0xddbb44 && l.src === 'bambu'));
  check(`${tag}: … and lands exactly on the ring`,
    lands.every((l, k) => near(l.e.x, lobInfo[k].ringX, 1e-9) && near(l.e.z, lobInfo[k].ringZ, 1e-9)));
  check(`${tag}: one lob in the air at a time, never a pool bullet`, Math.max(...lobs) === 1 && w.gelBullets === 0 && gelShots === launches.length);
  // lobs[i − 1] is how many were in the air after step i
  check(`${tag}: the blob lands 60 steps (1.0 s) after the launch, in the air after each step between`,
    lands.every((l, k) => l.i - launches[k] === 60 && lobs[launches[k] - 1] === 0 && lobs.slice(launches[k], l.i - 1).every((n) => n === 1) && lobs[l.i - 1] === 0));
}

// ── the target spread is the seeded U(−1.2, 1.2), per axis ─────────────
{
  const dx = [], dz = [];
  for (let seed = 1; seed <= 60; seed++) {
    const { w, g } = world({ seed });
    for (let i = 0; i < 78; i++) step(w, IDLE);
    dx.push(g.s.tx - w.hero.x); dz.push(g.s.tz - w.hero.z);
  }
  check('the spread fills ±1.2 on both axes and never passes it',
    Math.max(...dx.map(Math.abs)) <= 1.2 && Math.max(...dz.map(Math.abs)) <= 1.2
    && Math.max(...dx) > 0.9 && Math.min(...dx) < -0.9 && Math.max(...dz) > 0.9 && Math.min(...dz) < -0.9);
  const a = world({ seed: 5 }), b = world({ seed: 5 });
  for (let i = 0; i < 78; i++) { step(a.w, IDLE); step(b.w, IDLE); }
  check('same seed, same target (the run replays)', a.g.s.tx === b.g.s.tx && a.g.s.tz === b.g.s.tz);
}

// ── the splash: inside the ring's outer edge + the hero's 0.5, at the instant it lands ──
{
  const at = (off, { mercy = 0, x = 0, z = 0 } = {}) => {
    const { w, g } = world({ seed: 3 });
    for (let i = 0; i < 120; i++) step(w, IDLE);            // launched
    const h = w.hero;
    h.x = h.px = g.s.tx + off; h.z = h.pz = g.s.tz; h.mercy = mercy;
    let hurt = 0, lingered = 0, splashAt = -1;
    for (let i = 121; i <= 300; i++) {
      step(w, IDLE);
      if (evs(w, 'lobLand').length) splashAt = i;
      hurt += evs(w, 'hurt').filter((e) => e.by === 'bambu').length;
      lingered = Math.max(lingered, w.hazards.length);
    }
    return { hurt, lingered, splashAt };
  };
  const r1 = at(1.44), r2 = at(1.46), r3 = at(0, { mercy: 5 }), r4 = at(0);
  check('a hero 1.44 from the target is hit as it lands', r1.hurt === 1, `${r1.hurt}`);
  check('a hero 1.46 from the target is not', r2.hurt === 0, `${r2.hurt}`);
  check('nothing lands on a hero in mercy', r3.hurt === 0);
  check('the splash hurts once and nothing lingers', r4.hurt === 1 && r4.lingered === 0);
  // standing in the ring through the telegraph and flight does nothing: only the instant counts
  const { w, g } = world({ seed: 3 });
  for (let i = 0; i < 78; i++) step(w, IDLE);
  let early = 0;
  for (let i = 79; i < 178; i++) { w.hero.x = g.s.tx; w.hero.z = g.s.tz; step(w, IDLE); early += evs(w, 'hurt').length; }
  check('the ring itself never hurts: no damage through the telegraph and flight', early === 0);
}

// ── the lob is not a bullet ───────────────────────────────────────────
{
  const { w, g } = world({ seed: 4 });
  for (let i = 0; i < 150; i++) step(w, IDLE);
  const l = w.lobs[0];
  w.hero.x = l.x + 0.6; w.hero.z = l.z;        // right beside the blob, mid-flight
  const g0 = w.grazes;
  for (let i = 0; i < 10; i++) step(w, IDLE);
  check('it cannot be grazed', w.grazes === g0);
  // a stream of hero bullets through the blob's path does not touch it
  const lb = w.lobs[0];
  for (let i = 0; i < 6; i++) { api.heroBullet(w, lb.x - 0.2, lb.z, 0); step(w, IDLE); }
  check('it cannot be shot down', w.lobs.length === 1 && w.lobs[0] === lb);
}

// ── shots pop segments, and they grow back ────────────────────────────
{
  // one shot during the emergence kills it
  const { w, g } = world();
  for (let i = 0; i < 10; i++) step(w, IDLE);
  shoot(w, g); step(w, IDLE);
  check('one hit kills it while it is tiny (one segment, hp 1)', !g.alive && evs(w, 'kill').length === 1);
  const k = evs(w, 'kill')[0];
  check('… it dies at a 0.6 radius: not big, a 0.9 puddle', near(k.r, 0.6) && !k.big && near(k.r * T.death.puddle, 0.9));
}
{
  // a pop at full height with the grow clock already run out grows back the next step
  const { w, g } = world();
  for (let i = 0; i < 100; i++) step(w, IDLE);
  shoot(w, g); step(w, IDLE);
  const pop = evs(w, 'segPop')[0];
  check('a shot pops the top segment: segments 2, hp 2, hitbox 1.2', g.s.segs === 2 && g.hp === 2 && near(g.r, 1.2) && pop && pop.segs === 2);
  check('… and the chunks leave from 1.5 high ((2 + 0.5) × 0.6)', near(pop.y, 1.5) && near(g.s.popY, 1.5) && g.s.pops === 1);
  check('… no squash: 1.x skips the spring for BAMBU', (() => { step(w, IDLE); return g.sq === 1; })());
  check('… and it is back to three on the very next step (its grow clock had run out)', g.s.segs === 3 && g.hp === 3 && near(g.r, 1.8));
  // a second pop inside 0.18 s of that growth waits out the clock
  shoot(w, g); step(w, IDLE);
  let back = 0;
  for (let i = 1; i <= 20 && !back; i++) { step(w, IDLE); if (g.s.segs === 3) back = i + 1; }
  check('a pop inside 0.18 s of the last growth waits out the grow clock (11 steps from the growth)', back === 11, `${back}`);
}
{
  // hits on given frames, against the oracle: the death frame and every pop
  const hits = new Set([100, 106, 112, 118, 124, 130, 136, 142]);
  const or = oracle(200, { hits });
  const { w, g } = world();
  const pops = [];
  let dead = null;
  for (let i = 1; i <= 200 && g.alive; i++) {
    if (hits.has(i)) shoot(w, g);
    step(w, IDLE);
    if (evs(w, 'segPop').length) pops.push(i);
    if (!g.alive) dead = i;
    else if (g.s.segs !== or.segsAt[i]) { check(`segments on frame ${i}`, false, `${g.s.segs} vs ${or.segsAt[i]}`); break; }
  }
  check('a stream every 6 steps (1.x\'s gun at 60 fps) pops on 1.x\'s frames and kills on 1.x\'s frame',
    JSON.stringify(pops) === JSON.stringify(or.pop) && dead === or.dead, `${pops} / ${dead} vs ${or.pop} / ${or.dead}`);
  check('… it takes 6 hits, not 3: the stalk regrows under fire (spec trap 17)', pops.length === 6);
}
{
  // the real gun: the hero standing off and firing at a full stalk
  const { w, g } = world({ x: 6, z: 0 });
  for (let i = 0; i < 70; i++) step(w, IDLE);
  const hitsAt = [];
  let n = 0;
  for (let i = 71; i <= 400 && g.alive; i++) {
    step(w, { mx: 0, mz: 0, ax: 1, az: 0, aim: true, fire: true, dash: false });
    if (evs(w, 'hit').some((e) => e.id === g.id)) { hitsAt.push(i); n++; }
  }
  const or = oracle(400, { hits: new Set(hitsAt) });
  check('under the real gun it dies on the hit 1.x would have died on', !g.alive && or.dead === hitsAt[hitsAt.length - 1], `${hitsAt}`);
  check('… after more than 3 hits (it regrows)', n > 3, `${n}`);
}
{
  // a WARDEN's aura blocks before 1.x's hit() runs: no segment lost
  const { w, g } = world();
  for (let i = 0; i < 100; i++) step(w, IDLE);
  g.shield = true;
  const r = behaviour.onHit(w, g, { x: g.x, z: g.z }, api);
  check('a shielded stalk loses no segment to a blocked shot', g.s.segs === 3 && r !== 'block' && r !== 'pass' && g.s.pops === 0);
  g.shield = false;
}
{
  // damage that is not a shot still takes a segment (hp is the segments)
  const { w, g } = world();
  for (let i = 0; i < 100; i++) step(w, IDLE);
  g.hp = 1;                                   // two hits' worth from somewhere else
  step(w, IDLE);
  check('hp lost to anything else takes its segments with it', g.s.segs <= 2 && g.s.segs === g.hp);
}

// ── death mid-cycle: the ring goes, the blob never lands ───────────────
{
  const { w, g } = world({ seed: 2 });
  for (let i = 0; i < 140; i++) step(w, IDLE);            // in the air
  check('(set-up) a lob is in the air', w.lobs.length === 1 && g.s.state === 'lobbing');
  api.kill(w, g, 'hero');
  let landed = 0, hurt = 0;
  for (let i = 0; i < 120; i++) { w.hero.x = g.s.tx; w.hero.z = g.s.tz; step(w, IDLE); landed += evs(w, 'lobLand').length; hurt += evs(w, 'hurt').length; }
  check('killed mid-flight: the blob is gone and nothing lands', w.lobs.length === 0 && landed === 0 && hurt === 0);
}
{
  const { w, g } = world({ seed: 2 });
  for (let i = 0; i < 100; i++) step(w, IDLE);            // telegraphing
  check('(set-up) a telegraph is running', g.s.state === 'telegraphing');
  api.kill(w, g, 'hero');
  let launched = 0;
  for (let i = 0; i < 200; i++) { step(w, IDLE); launched += w.lobs.length; }
  check('killed mid-telegraph: no lob ever leaves', launched === 0);
}

// ── HARDCADE: the corpse bites FAN ────────────────────────────────────
{
  const { w, g } = world({ mode: 'hardcade' });
  w.wave = 3;
  for (let i = 0; i < 100; i++) step(w, IDLE);
  w.hero.x = 0; w.hero.z = 0;
  api.kill(w, g, 'hero');
  // v103: the corpse warns `tell` s (a seed, its lines drawn) before the FAN leaves it
  const warned = w.seeds.length === 1 && !w.bullets.some((b) => b.revenge);
  for (let i = 0; i <= Math.round(T.revenge.tell / dt); i++) step(w, IDLE);
  check('HARDCADE: the corpse warns before it bites (a seed, nothing in the air)', warned);
  const fan = w.bullets.filter((b) => b.revenge);
  const aim = Math.atan2(-g.z, -g.x), ang = fan.map((b) => Math.atan2(b.vz, b.vx) - aim).map((a) => Math.atan2(Math.sin(a), Math.cos(a))).sort((a, b) => a - b);
  // 1.x's FAN is 5 bullets 0.5 rad apart; the owner's density dial scales the count (TUNING.revenge)
  const R = T.revenge, n = Math.max(1, Math.round(R.fan.count * R.density));
  check('HARDCADE: a FAN from the corpse (1.x: 5 bullets, 0.5 rad apart), aimed at the hero',
    fan.length === n && ang.every((a, k) => near(a, (k - (n - 1) / 2) * R.fan.spread, 1e-9)), `${fan.length} ${ang.map((a) => a.toFixed(3))}`);
  check('… in poison green 0x8ee447 (1.x revengeColor of 0xddbb44)', fan.every((b) => b.color === 0x8ee447), `${fan[0]?.color?.toString(16)}`);
}

// ── the look: the tower, the orb, the ring, the pops ──────────────────
{
  let matArgs = null;
  const ctx = { THREE, TSL: null, GEL_TIME: { value: 0 }, T, S, scene: new THREE.Scene(), geo: {},
    gelMaterial: (hex, fam, r, o) => {
      matArgs = [hex, fam, r, o];
      const m = new THREE.MeshPhysicalNodeMaterial(); m.emissive = new THREE.Color();
      m.gel = { hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 }, wobble: { value: o?.wobble }, radius: { value: r } };
      return m;
    } };
  const v = { kind: 'bambu', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
  v.squash.add(v.body); v.root.add(v.squash);
  check('the look builds its own body, one gel material of 1.x\'s bambu family (uRadius 0.7, wobble 0.35)',
    v.own === true && matArgs[0] === 0xaa8844 && matArgs[2] === 0.7 && matArgs[3].wobble === 0.35 && near(v.mat.roughness, 0.20) && near(v.mat.transmission, 0.10));
  // the segments: 1.x's flare and lips
  const cyl = (i) => v.segs[i].children[0].geometry.parameters, lip = (i) => v.segs[i].children[1].geometry.parameters;
  check('segment i flares 0.20 + 0.02 i at the foot to 0.36 + 0.03 i at the top, 0.6 tall, 14 sides',
    [0, 1, 2].every((i) => near(cyl(i).radiusBottom, 0.20 + 0.02 * i) && near(cyl(i).radiusTop, 0.36 + 0.03 * i) && cyl(i).height === 0.6 && cyl(i).radialSegments === 14));
  check('… stands at 0.6 i, its lip 1.14 × the top and 0.06 tall at 0.6 (i + 1)',
    [0, 1, 2].every((i) => near(v.segs[i].position.y, 0.6 * i) && near(lip(i).radiusTop, 1.14 * (0.36 + 0.03 * i)) && lip(i).height === 0.06
      && near(v.segs[i].children[1].position.y, 0.6) && near(v.segs[i].children[0].position.y, 0.3)));
  check('every part of the stalk wears the one material', v.segs.every((s) => s.children.every((m) => m.material === v.mat)));

  const { w, g } = world({ seed: 9 });
  v.root.position.set(g.x, 0, g.z);
  look.update(v, g, w, 0, 1);
  check('at its arrival it is flat on the floor (scale.y 0.01) with one segment showing',
    near(v.body.scale.y, 0.01) && v.segs.map((s) => s.visible).join() === 'true,false,false');
  for (let i = 0; i < 18; i++) step(w, IDLE);
  look.update(v, g, w, 0, 1);
  check('half way out of the floor at 0.3 s (only its height moves)', near(v.body.scale.y, 1 - g.s.emergeT / 0.6) && near(v.body.scale.y, 0.5, 0.02) && v.body.scale.x === 1);
  for (let i = 18; i < 77; i++) step(w, IDLE);
  look.update(v, g, w, 0, 1);
  check('grown: three segments, no strain, breath zero at t 0', v.segs.every((s) => s.visible) && near(v.body.scale.y, 1) && near(v.body.scale.x, 1));
  look.update(v, g, w, Math.PI / (2 * 2.4), 1);
  check('the breath: 5% taller, 2.5% narrower at its crest', near(v.body.scale.y, 1.05) && near(v.body.scale.x, 0.975));
  check('no orb and no ring while it waits', !v.orb.visible && !v.ring.visible);
  step(w, IDLE);                               // the telegraph starts (frame 78)
  look.update(v, g, w, 0, 1);
  check('the telegraph lays the ring at the target, flat at 0.02, in world space',
    v.ring.visible && near(v.root.position.x + v.ring.position.x, g.s.tx) && near(v.root.position.z + v.ring.position.z, g.s.tz)
    && near(v.ring.position.y, 0.02) && near(v.ring.rotation.x, -Math.PI / 2));
  check('… the ring is 1.x\'s 0.55..0.95, 28 segments, double-sided, no depth write',
    v.ring.geometry.parameters.innerRadius === 0.55 && v.ring.geometry.parameters.outerRadius === 0.95 && v.ring.geometry.parameters.thetaSegments === 28
    && v.ringMat.side === THREE.DoubleSide && v.ringMat.depthWrite === false && v.ringMat.color.getHex() === 0xddbb44);
  check('… the orb waits for the telegraph\'s first tick', !v.orb.visible);
  check('… and the ring opens at its built 0.6: the flash writes from the next tick (1.x enemy.js:917, 2825-2832)', v.ringMat.opacity === 0.6);
  const opac = [], orbY = [], orbS = [], strain = [];
  for (let i = 79; i <= 119; i++) {
    step(w, IDLE); look.update(v, g, w, 0, 1);
    opac.push([g.s.lobT, v.ringMat.opacity]); orbY.push(v.orb.position.y); orbS.push(v.orb.scale.x); strain.push(v.body.scale.y);
  }
  check('the ring flashes sin(22 t) > 0 ? 0.75 : 0.2 through the telegraph', opac.every(([t, o]) => o === (Math.sin(22 * t) > 0 ? 0.75 : 0.2)));
  check('the orb climbs to the top of the stalk (y = p × 1.8) and grows 0.6 → 1.5',
    orbY.every((y, k) => k === 0 || y >= orbY[k - 1]) && near(orbY[orbY.length - 1], (1 - g.s.timer / 0.7) * 1.8) && orbY[orbY.length - 1] > 1.7
    && near(orbS[0], 0.6 + 0.9 * (1 / 42), 1e-6) && orbS[orbS.length - 1] > 1.45);
  check('the stalk strains as the shot climbs, read before the tick as 1.x did (40 of 42 steps in on the last telegraph step)',
    strain.every((y, k) => k === 0 || y <= strain[k - 1] + 1e-12) && near(strain[strain.length - 1], 1 - 0.14 * (40 / 42), 1e-6)
    && near(v.body.scale.x, 1 + 0.07 * (40 / 42), 1e-6));
  check('the orb is drawn, not added (v104: no glow) gold at 0.9, no depth write, inside the stalk (it breathes and strains with it)',
    v.orb.material.blending === THREE.NormalBlending && v.orb.material.opacity === 0.9 && v.orb.material.depthWrite === false && v.orb.parent === v.body);
  step(w, IDLE); look.update(v, g, w, 0, 1);   // the launch
  check('at the launch the orb goes and the ring stays; the stalk is at full strain, 14% shorter and 7% fatter (41 of 42)',
    !v.orb.visible && v.ring.visible && near(v.body.scale.y, 1 - 0.14 * (41 / 42), 1e-6) && near(v.body.scale.x, 1 + 0.07 * (41 / 42), 1e-6));
  step(w, IDLE); look.update(v, g, w, 0, 1);
  check('… and snaps back the step after', near(v.body.scale.y, 1) && near(v.body.scale.x, 1));
  const fl = [];
  for (let i = 122; i <= 178; i++) { step(w, IDLE); look.update(v, g, w, 0, 1); fl.push([g.s.lobT, v.ringMat.opacity]); }
  check('in flight the ring flashes faster: sin(40 t) > 0 ? 0.85 : 0.25', fl.every(([t, o]) => o === (Math.sin(40 * t) > 0 ? 0.85 : 0.25)));
  step(w, IDLE); step(w, IDLE); look.update(v, g, w, 0, 1);
  check('landed: the ring is gone', !v.ring.visible && g.s.state === 'waiting');

  // the core's ripple and tear: 1.x writes them for blobs only
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('the core\'s ripple and tear land on stand-ins: the stalk\'s own stay at rest (1.x writes them for blobs only, enemy.js:1612, 2704-2709, 2986-2989)',
    v.mat.gel !== v.gel && v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.gel.hitDir.value.x === 0
    && v.mat.gel.wobble === v.gel.wobble && v.mat.gel.radius === v.gel.radius);
  v.mat.gel.hit.value = 0; v.mat.gel.tear.value = 0;

  // a pop throws three chunks from where the segment was, and they fall —
  // on the sim's clock: a frame with no step (a pause) holds them still
  // a chunk's matrix is a scale and a place, no turn (an idle slot is scale 0; three's decompose calls that 1)
  const P = v.pool, at = (i) => { const e = new THREE.Matrix4().fromArray(P.mesh.instanceMatrix.array, i * 16).elements;
    return { p: new THREE.Vector3(e[12], e[13], e[14]), s: new THREE.Vector3(e[0], e[5], e[10]) }; };
  const shown = () => Array.from({ length: S.look.popPool }, (_, i) => at(i)).filter((c) => c.s.y > 0);
  let clock = 10;
  const frame = (steps = 1) => { for (let i = 0; i < steps; i++) step(w, IDLE); look.update(v, g, w, (clock += 1 / 60), 1); };
  shoot(w, g); frame();
  check('a pop: two segments show, three chunks fly from 1.5 high at the stalk', v.segs.map((s) => s.visible).join() === 'true,true,false' && shown().length === 3
    && shown().every((c) => near(c.p.y, 1.5, 1e-6) && near(c.s.y, 0.14, 1e-6) && near(c.p.x, g.x, 1e-5) && near(c.p.z, g.z, 1e-5)));
  check('… in tan goo, one pool in the scene for every stalk', P.mesh.material.color.getHex() === 0xaa8844 && P.mesh.parent === ctx.scene && P.mesh.count === S.look.popPool);
  const still = shown().map((c) => c.p.y).join();
  for (let i = 0; i < 20; i++) look.update(v, g, w, (clock += 1 / 60), 1);
  check('… a pause holds them where they are', shown().map((c) => c.p.y).join() === still);
  for (let i = 0; i < 66; i++) frame();
  check('… outward at 3 u/s and down to the floor', shown().length >= 3 && shown().every((c) => c.p.y === 0 && Math.hypot(c.p.x - g.x, c.p.z - g.z) > 1.2));
  for (let i = 0; i < 20; i++) frame();
  check('… gone after their 1.4 s', P.chunks.length === 0 && shown().length === 0);

  // the world-standing parts hide while a killed view swells
  for (let i = 0; i < 400 && g.s.state !== 'telegraphing'; i++) step(w, IDLE);
  look.update(v, g, w, (clock += 1 / 60), 1);
  check('(set-up) a ring is showing', v.ring.visible && v.fx.visible);
  check('a later telegraph opens on the ring as the last flight left it: the flash writes from the next tick (1.x enemy.js:2825-2832)',
    g.s.lobT === 0 && v.ringMat.opacity === fl[fl.length - 1][1]);
  v.dyingT = 0.2; v.root.updateMatrixWorld(true);
  check('a dying view hides its ring (1.x hid it at death, enemy.js:3079)', !v.fx.visible);
  v.dyingT = 0; v.root.updateMatrixWorld(true);
  look.reset(v);
  check('reset: a pooled view comes back with no ring or orb, its ring at the built 0.6', !v.ring.visible && !v.orb.visible && v.fx.visible && v.ringMat.opacity === 0.6 && v.g === null);
  check('the ring hangs off the root, not the stalk', v.fx.parent === v.root && v.ring.parent === v.fx);

  // the kill: a shot kill pops the last segment, so the stalk is gone and
  // only its chunks fly on; the breath and strain drop back to 1
  {
    const q = world({ seed: 11 });
    const u = { kind: 'bambu', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, dyingT: 0, ...look.build(ctx) };
    u.squash.add(u.body); u.root.add(u.squash);
    check('every view shares the one chunk pool', u.pool === P);
    for (let i = 0; i < 20; i++) step(q.w, IDLE);
    u.root.position.set(q.g.x, 0, q.g.z);
    look.update(u, q.g, q.w, (clock += 1 / 60), 1);
    check('(set-up) half out of the floor, one segment', u.body.scale.y < 0.7 && u.segs[0].visible && !u.segs[1].visible);
    shoot(q.w, q.g); step(q.w, IDLE);
    check('(set-up) one shot kills it and pops its segment', !q.g.alive && q.g.s.segs === 0 && q.g.s.pops === 1);
    u.dyingT = 0.28; ctx.GEL_TIME.value = clock; u.root.updateMatrixWorld(true);
    check('dying: no segment left to swell (1.x removed it, enemy.js:1628-1629), scale back to 1 (enemy.js:3024-3027)',
      u.segs.every((s) => !s.visible) && u.body.scale.x === 1 && u.body.scale.y === 1 && u.body.scale.z === 1 && !u.fx.visible);
    check('… and the killing pop throws its three chunks from 0.3 high', P.chunks.length === 3 && P.chunks.every((c) => near(c.y, 0.3) && near(c.x, q.g.x)));
    u.root.updateMatrixWorld(true);
    check('… once', P.chunks.length === 3);
    // the view is gone: nothing calls update, so the pool runs on the frame clock
    for (let i = 0; i < 40; i++) { ctx.GEL_TIME.value = (clock += 1 / 60); P.mesh.onBeforeRender(); }
    check('… they fly on after the stalk has gone (the frame clock): 3 u/s outward for 0.67 s',
      P.chunks.length === 3 && P.chunks.every((c) => Math.hypot(c.x - q.g.x, c.z - q.g.z) > 1));
    for (let i = 0; i < 60; i++) { ctx.GEL_TIME.value = (clock += 1 / 60); P.mesh.onBeforeRender(); }
    check('… and are gone after their 1.4 s', P.chunks.length === 0 && shown().length === 0);
    ctx.GEL_TIME.value = 0;
  }
}

// ── this game's dashes take hp without a shot: what they take pops ─────
{
  const dashAt = (segsWanted, dashMode = 'cut') => {
    const w = createWorld({ seed: 1, mode: 'arcade', dashMode });
    w.director = { step() {} }; w.hero.lives = 1e9;
    const g = api.spawn(w, 'bambu', 2.5, 0); g.anchored = true;
    for (let i = 0; i < 200 && g.s.segs < segsWanted; i++) step(w, IDLE);
    const pops0 = g.s.pops, events = [];
    step(w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
    for (let i = 0; i < 12 && g.alive; i++) { events.push(...w.events); step(w, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false }); }
    events.push(...w.events);
    return { w, g, pops: g.s.pops - pops0, events };
  };
  const full = dashAt(3);
  const cut = T.hero.cut.hits;
  check(`the CUT dash takes ${cut} of a full stalk's 3: ${3 - cut} left, the ${cut} it took popped from the top (1.5, then 0.9)`,
    full.g.alive && full.pops === cut && full.events.filter((e) => e.type === 'segPop').map((e) => e.y.toFixed(2)).join() === '1.50,0.90'.split(',').slice(0, cut).join(),
    `${full.g.s.segs} segs, ${full.pops} pops`);
  const two = dashAt(2);
  const k = two.events.find((e) => e.type === 'kill');
  check(`… a two-segment stalk dies to it, and both segments pop as it goes`, !two.g.alive && two.g.s.segs === 0 && two.pops === 2 && k?.src === 'dash',
    `${two.g.alive} ${two.g.s.segs} ${two.pops}`);
  check('… dying at the radius the core reported for it (the radius it was cut at)', near(k.r, 1.2) && near(two.g.r, 1.2));
  const push = createWorld({ seed: 1, mode: 'arcade', dashMode: 'push' });
  push.director = { step() {} };
  const pg = api.spawn(push, 'bambu', 1.5, 0);
  for (let i = 0; i < 100; i++) step(push, IDLE);
  const x0 = pg.x;
  let moved = 0;
  step(push, { mx: 1, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: true });
  for (let i = 0; i < 30; i++) { step(push, IDLE); moved = Math.max(moved, Math.abs(pg.x - x0)); }
  check('the PUSH dash shoves it (it writes no position of its own, so a knock carries) and takes no segment at dash level 0',
    moved > 0.3 && pg.s.segs === 3 && pg.s.pops === 0, `moved ${moved}`);
}

// ── the death voice: its own, not the blob's (1.x main.js:4476-4480, audio.js:246) ──
check('it dies with 1.x\'s bambu voice: a triangle 480 → 190 Hz over 0.30 s at 0.26, no noise',
  S.deathSound && S.deathSound.wave === 'triangle' && S.deathSound.f0 === 480 && S.deathSound.f1 === 190 && S.deathSound.dur === 0.30
  && S.deathSound.vol === 0.26 && !S.deathSound.noiseVol);

if (failed) { console.log(`✗ bambu: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ bambu: ${passed} checks`);
