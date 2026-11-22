#!/usr/bin/env node
// goo.mjs — the goo's droplets (js/render/goo-sim.js), in bare node: what a
// drop does when it lands (splash, bounce, slide) is decided by how fast and
// how fat it is, a stain stretches along a low approach, a drop that meets a
// body rides it and drips off its foot, the rail is a wall, and — the rule
// the floor's film is built on — no goo is made or lost between the drops
// and the stamps they lay down.
//
// Usage: node test/goo.mjs           (exit 1 on any failure)
import { GooSim, BODY, STAMP, AIR, SLIDE, RIDE, CLING, radiusAt, wallLen, wallS, wallXZ } from '../js/render/goo-sim.js?v=162';
import { TUNING as T } from '../js/tuning.js?v=162';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const G = T.goo, dt = 1 / 60, HX = 19, HZ = 11, VOL = 4 / 3 * Math.PI;
// the view's dice are Math.random; seeded so a run of this gate is a replay
Math.random = ((a) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; })(20261023);

const none = new Float32Array(0);
// run a sim until every drop is gone, summing what it laid down
function settle(sim, bodies = none, nb = 0, steps = 1200) {
  const out = { vol: 0, stamps: [], seen: new Set(), maxX: 0, maxZ: 0 };
  for (let s = 0; s < steps && sim.n; s++) {
    sim.step(dt, bodies, nb, HX, HZ);
    for (let i = 0; i < sim.ns; i++) { const o = i * STAMP; out.vol += sim.stamps[o + 6]; out.stamps.push(Array.from(sim.stamps.subarray(o, o + STAMP))); }
    for (let i = 0; i < sim.n; i++) { out.seen.add(sim.st[i]); out.maxX = Math.max(out.maxX, Math.abs(sim.x[i]) + sim.r[i]); out.maxZ = Math.max(out.maxZ, Math.abs(sim.z[i]) + sim.r[i]); }
  }
  return out;
}
const long = { ...G, life: 60, stampCap: 1 << 16 };   // nothing times out: every drop lands and runs dry

// ── volume: every drop of a kill's spray ends up in the stamps ──
{
  const sim = new GooSim(4000, long);
  let v0 = 0;
  for (let i = 0; i < 300; i++) {
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 7, r = 0.02 + Math.random() * 0.07;
    sim.emit(0, 0.6, 0, Math.cos(a) * sp, 2 + Math.random() * 6, Math.sin(a) * sp, r, 0.2, 1, 0.4);
    v0 += VOL * r ** 3;
  }
  const o = settle(sim);
  check('a spray settles: every drop lands and runs dry', sim.n === 0, `${sim.n} left`);
  check('no goo is made or lost: what flew is what the floor got (within 0.1%)', Math.abs(o.vol - v0) / v0 < 1e-3, `${(o.vol / v0).toFixed(5)}`);
  check('it splashed, bounced and slid', sim.stats.splashed > 0 && sim.stats.bounced > 0 && o.seen.has(SLIDE), JSON.stringify(sim.stats));
  check('the rail is a wall: no drop ever stood past it', o.maxX <= HX + 1e-4 && o.maxZ <= HZ + 1e-4, `${o.maxX.toFixed(3)}, ${o.maxZ.toFixed(3)}`);
  check('every stamp lies on the floor', o.stamps.every((s) => Math.abs(s[0]) <= HX + 0.01 && Math.abs(s[1]) <= HZ + 0.01 && s[6] > 0 && s[5] > 0));
}

// ── a landing is decided by speed and size ──
const land = (r, vy, vx = 0) => { const sim = new GooSim(64, long); sim.emit(0, r + 0.001, 0, vx, vy, 0, r, 1, 1, 1); sim.step(dt, none, 0, HX, HZ); return sim; };
{
  const S = G.splash, B = G.bounce;
  const fat = land(S.minR * 1.5, -(S.speed + 2));
  check('a fast fat drop splashes: a crown of finer drops flies on', fat.stats.splashed === 1 && fat.n >= 2 && Array.from(fat.r.subarray(0, fat.n)).every((r) => r < S.minR * 1.5), `n ${fat.n}`);
  const fine = land(B.maxR * 0.6, -(B.speed + 1));
  check('a fast fine drop bounces back up, a little smaller', fine.stats.bounced === 1 && fine.n === 1 && fine.vy[0] > 0 && fine.r[0] < B.maxR * 0.6);
  const slow = land(0.03, -2, 3);
  check('a slow one lands and slides on, leaving its impact behind', slow.n === 1 && slow.st[0] === SLIDE && slow.ns === 1 && slow.vx[0] > 0);
  // spatter: a low approach leaves a long stain along the travel, a drop that falls straight a round one
  const low = land(0.03, -1.5, 5), steep = land(0.03, -3, 0);
  const lenOf = (sim) => sim.stamps[4];
  check('a stain stretches along a low approach (1 / sin of the angle)', lenOf(low) > 0.03 && lenOf(steep) < 1e-6, `${lenOf(low).toFixed(3)} vs ${lenOf(steep).toFixed(3)}`);
  check('…pointing the way the drop went', low.stamps[2] > 0.99);
}

// ── a body: a drop that meets it rides it, creeps down and drips off ──
{
  const sim = new GooSim(64, long);
  const R = 0.6, H = R * 1.4, bodies = new Float32Array(BODY);
  bodies.set([0, 0, R, H, 1, 0, 7, 0]);
  sim.emit(-2, 0.6, 0, 6, 1.5, 0, 0.03, 0, 1, 0);
  let rode = false, onSkin = true, dripped = false, x0 = 0;
  for (let s = 0; s < 400; s++) {
    bodies[0] += 1 * dt;                                         // the body walks on at 1 m/s
    sim.step(dt, bodies, 1, HX, HZ);
    if (sim.st[0] === RIDE) {
      if (!rode) x0 = sim.x[0] - bodies[0];
      rode = true;
      const d = Math.hypot(sim.x[0] - bodies[0], sim.z[0] - bodies[1]), want = radiusAt(0, R, H, sim.y[0]) + 0.03 * G.ride.proud;
      if (Math.abs(d - want) > 1e-3) onSkin = false;
    }
    if (rode && sim.st[0] === SLIDE) { dripped = true; break; }
  }
  check('a drop thrown at a body sticks to it', rode && sim.stats.rode === 1);
  check('…and is carried on its skin as it walks', rode && onSkin && x0 < 0);
  check('…until it creeps down to the foot and drips off onto the floor', dripped);
  // the body gone (dead, or cloaked): what it carried falls off
  const s2 = new GooSim(8, long);
  s2.emit(-2, 0.6, 0, 6, 1.5, 0, 0.03, 0, 1, 0);
  bodies[0] = 0;
  for (let s = 0; s < 60 && s2.st[0] !== RIDE; s++) s2.step(dt, bodies, 1, HX, HZ);
  s2.step(dt, bodies, 0, HX, HZ);
  check('a body that goes leaves its goo in the air', s2.st[0] === AIR);
  // the hero wears fine drops only
  const hero = new Float32Array(BODY); hero.set([0, 0, 0.5, 1, 0, 0, -1, 2]);
  const s3 = new GooSim(8, long);
  s3.emit(-1.5, 0.5, 0, 6, 0.5, 0, G.ride.heroMaxR * 2, 0, 1, 0);
  for (let s = 0; s < 40; s++) s3.step(dt, hero, 1, HX, HZ);
  check('a fat drop flies past the hero rather than sticking to him', s3.stats.rode === 0);
}

// ── the wall (v81): a drop that meets the rail below the wall's height clings, runs down it and lands ──
{
  const Wl = G.wall, PL = wallLen(HX, HZ);
  // the rail unwrapped and back, on every wall
  let round = true;
  for (let side = 0; side < 4; side++) for (const f of [0.1, 0.5, 0.9]) {
    const o = wallXZ(side, (side % 2 ? [2 * HX, 2 * HX + 2 * HZ, 4 * HX + 2 * HZ][side - 1] ?? 4 * HX + 2 * HZ : side ? 2 * HX + 2 * HZ : 0) + f * (side % 2 ? 2 * HZ : 2 * HX), HX, HZ, { x: 0, z: 0 });
    const s = wallS(side, o.x, o.z, HX, HZ), back = wallXZ(side, s, HX, HZ, { x: 0, z: 0 });
    if (Math.abs(back.x - o.x) > 1e-9 || Math.abs(back.z - o.z) > 1e-9 || s < 0 || s > PL) round = false;
  }
  check('the rail unwraps into one line and back, wall by wall', round);
  // a fine drop thrown low at the far wall (too fine to splash)
  const sim = new GooSim(64, long);
  sim.emit(2, 0.5, -HZ + 1, 0, 1.5, -6, 0.03, 1, 0.5, 0);
  let clung = false, ran = 0, wallVol = 0, floorVol = 0, landed = false, maxY = 0, minY = 9, placed = true, onWall = true;
  for (let st = 0; st < 900 && sim.n; st++) {
    sim.step(dt, none, 0, HX, HZ);
    for (let i = 0; i < sim.nws; i++) { const o = i * STAMP; wallVol += sim.wstamps[o + 6]; if (sim.wstamps[o] < 0 || sim.wstamps[o] > PL || sim.wstamps[o + 1] < 0 || sim.wstamps[o + 1] > Wl.h + 0.01 || !(sim.wstamps[o + 6] > 0)) placed = false; }
    for (let i = 0; i < sim.ns; i++) floorVol += sim.stamps[i * STAMP + 6];
    if (sim.n && sim.st[0] === CLING) {
      clung = true; ran++; maxY = Math.max(maxY, sim.y[0]); minY = Math.min(minY, sim.y[0]);
      if (Math.abs(sim.z[0] - (-HZ)) > sim.r[0] * Wl.proud + 1e-6) onWall = false;   // on the far wall, proud of it by its radius × proud
    }
    if (clung && sim.n && sim.st[0] === SLIDE) landed = true;
  }
  check('a drop thrown at the rail below the wall clings to it', clung && sim.stats.clung === 1, JSON.stringify(sim.stats));
  check('…runs DOWN the wall, streaking it as it goes', ran > 5 && minY < maxY - 0.1 && wallVol > 0, `${ran} steps, y ${maxY.toFixed(2)} → ${minY.toFixed(2)}, ${wallVol.toExponential(2)} m³ on the wall`);
  check('…standing on its wall as it runs', onWall);
  check('…every wall stamp lies on the wall (s along the rail, y up it), with goo in it', placed);
  check('…and at the foot it slides on across the floor', landed && floorVol > 0, `landed ${landed}, floor ${floorVol.toExponential(2)}`);
  const V0 = VOL * 0.03 ** 3;
  check('no goo is made or lost between the wall and the floor', sim.n === 0 && Math.abs(wallVol + floorVol - V0) / V0 < 1e-3, `${((wallVol + floorVol) / V0).toFixed(5)}`);
  // a fast fat one throws a crown back off the wall
  const s2 = new GooSim(64, long);
  s2.emit(0, 0.6, -HZ + 0.5, 0, 0.5, -8, 0.06, 1, 1, 1);
  for (let st = 0; st < 10 && !s2.stats.splashed; st++) s2.step(dt, none, 0, HX, HZ);
  const back = s2.n >= 2 && Array.from(s2.vz.subarray(0, s2.n)).every((v) => v > 0);
  check('a fast fat drop splashes off the wall: a crown of finer drops flies back into the arena', s2.stats.splashed === 1 && s2.stats.clung === 0 && back, `n ${s2.n}, ${JSON.stringify(s2.stats)}`);
  // above the wall the rail is what it was: an invisible wall the drop bounces off
  const s3 = new GooSim(8, long);
  s3.emit(0, Wl.h + 0.5, -HZ + 0.3, 0, 0.5, -6, 0.03, 1, 1, 1);
  for (let st = 0; st < 6; st++) s3.step(dt, none, 0, HX, HZ);
  check('above the wall\'s height a drop bounces off the rail as before', s3.stats.clung === 0 && s3.n === 1 && s3.st[0] === AIR && s3.vz[0] > 0);
  // the wall off: every drop meets the old rail
  const s4 = new GooSim(8, { ...long, wall: { ...Wl, on: false } });
  s4.emit(2, 0.5, -HZ + 1, 0, 1.5, -6, 0.03, 1, 0.5, 0);
  for (let st = 0; st < 30; st++) s4.step(dt, none, 0, HX, HZ);
  check('with the wall off nothing clings', s4.stats.clung === 0 && s4.nws === 0);
}

// ── bodies in the goo (v84): the wet map, spray and tracks ──
{
  const W = G.wet;
  // a pool at the middle of the floor, and a body running through it fast
  const sim = new GooSim(512, long); sim.setArena(HX, HZ);
  sim.wetAdd(0, 0, 0.05, 0.2, 1, 0.4);
  check('the wet map reads a pool where goo was laid, and nothing where none was', sim.wetAt(0, 0) === 1 && sim.wetAt(6, 6) === 0);
  const b = new Float32Array(BODY); b.set([-0.4, 0, 0.5, 0.7, 6, 0, 3, 0]);
  for (let s = 0; s < 8; s++) { b[0] += 6 * dt; sim.step(dt, b, 1, HX, HZ); }
  const n = sim.n;
  check('a body running through a pool throws drops out of its foot', sim.stats.sprayed > 0 && n > 0, JSON.stringify(sim.stats));
  let hue = true, behind = 0;
  for (let i = 0; i < n; i++) { if (Math.abs(sim.cr[i] - 0.2) > 1e-3 || Math.abs(sim.cg[i] - 1) > 1e-3) hue = false; if (sim.vx[i] < 0) behind++; }
  check('…in the pool\'s own colour, mostly back the way it came', hue && behind > n * 0.6, `${behind} of ${n} thrown back`);
  // the foot: it picks goo up while it stands in the pool and lays it down once out and walking
  const s2 = new GooSim(64, long); s2.setArena(HX, HZ);
  s2.wetAdd(0, 0, 0.05, 1, 0.5, 0);
  const c = new Float32Array(BODY); c.set([0, 0, 0.5, 0.7, 1.2, 0, 4, 0]);
  for (let s = 0; s < 30; s++) s2.step(dt, c, 1, HX, HZ);
  const fw = s2.feet.get(4)?.fw ?? 0;
  check('a foot standing in the pool takes goo on', fw > 1e-5 && fw <= W.tracks.cap + 1e-9, `${fw.toExponential(2)} m³`);
  let laid = 0, laidHue = true;
  for (let s = 0; s < 240; s++) {
    c[0] += 1.2 * dt; s2.step(dt, c, 1, HX, HZ);
    for (let i = 0; i < s2.ns; i++) { const o = i * STAMP; if (s2.stamps[o] > 1.5) { laid += s2.stamps[o + 6]; if (Math.abs(s2.stamps[o + 7] - 1) > 1e-3 || Math.abs(s2.stamps[o + 8] - 0.5) > 1e-3) laidHue = false; } }
  }
  check('…and lays it behind it as tracks once it has walked out, in the goo\'s colour', laid > 0 && laidHue && (s2.feet.get(4)?.fw ?? 0) < fw * 0.2 && s2.stats.tracked > 0, `${laid.toExponential(2)} m³ laid, ${s2.stats.tracked} stamps`);
  check('a slow walk sprays nothing', s2.stats.sprayed === 0);
  // the dry control
  const s3 = new GooSim(64, long);
  const d = new Float32Array(BODY); d.set([0, 0, 0.5, 0.7, 6, 0, 5, 0]);
  for (let s = 0; s < 30; s++) { d[0] += 6 * dt; s3.step(dt, d, 1, HX, HZ); }
  check('on a dry floor a running body throws nothing and leaves nothing', s3.stats.sprayed === 0 && s3.stats.stamps === 0 && s3.n === 0);
  // the map drains
  const s4 = new GooSim(8, long); s4.setArena(HX, HZ);
  s4.wetAdd(0, 0, 0.001, 1, 1, 1);
  const w0 = s4.wetAt(0, 0);
  for (let s = 0; s < 600; s++) s4.step(dt, none, 0, HX, HZ);
  check('the wet map drains with time', w0 > 0 && s4.wetAt(0, 0) < w0 * 0.3, `${w0.toFixed(3)} → ${s4.wetAt(0, 0).toFixed(3)}`);
  // the hero mid-dash is a body nothing rides, but one that sprays
  const s5 = new GooSim(64, long);
  s5.emit(-1.5, 0.5, 0, 6, 0.5, 0, 0.02, 0, 1, 0);
  const dashing = new Float32Array(BODY); dashing.set([0, 0, 0.5, 1, 0, 0, -1, 3]);
  for (let s = 0; s < 40; s++) s5.step(dt, dashing, 1, HX, HZ);
  check('a drop flies past the hero mid-dash rather than riding him', s5.stats.rode === 0);
}

// ── the pool: a full one refuses, it does not overwrite ──
{
  const sim = new GooSim(10, long);
  let ok = 0; for (let i = 0; i < 15; i++) ok += sim.emit(0, 1, 0, 0, 0, 0, 0.03, 1, 1, 1) ? 1 : 0;
  check('a full pool takes no more drops and says so', ok === 10 && sim.stats.refused === 5);
}

// ── cost: a full pool steps in well under a frame in bare node ──
{
  const sim = new GooSim(G.cap, G), bodies = new Float32Array(32 * BODY);
  for (let k = 0; k < 32; k++) bodies.set([(k % 8) * 4 - 14, Math.floor(k / 8) * 4 - 6, 0.6, 0.84, 1, 0, k, 0], k * BODY);
  const top = () => { while (sim.n < G.cap - 64) for (let i = 0; i < 64; i++) { const a = Math.random() * 6.283; sim.emit((Math.random() * 2 - 1) * 15, 0.6, (Math.random() * 2 - 1) * 8, Math.cos(a) * 5, 4, Math.sin(a) * 5, 0.02 + Math.random() * 0.06, 1, 1, 1); } };
  const t = [];
  for (let s = 0; s < 240; s++) { top(); const t0 = performance.now(); sim.step(dt, bodies, 32, HX, HZ); t.push(performance.now() - t0); }
  t.sort((a, b) => a - b);
  const p50 = t[t.length >> 1];
  check(`a full pool (${G.cap} drops) steps in under 4 ms here`, p50 < 4, `${p50.toFixed(2)} ms`);
  console.log(`  · ${G.cap} drops step in ${p50.toFixed(2)} ms (p50, bare node)`);
}

console.log(`${failed ? '✗' : '✔'} goo: ${passed} checks${failed ? `, ${failed} failed` : ''}`);
process.exit(failed ? 1 : 0);
