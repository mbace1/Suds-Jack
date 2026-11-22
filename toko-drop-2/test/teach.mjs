#!/usr/bin/env node
// teach.mjs — the first-time tags (sim/teach.js, v115), in bare node: STEP OUT! over a giant gathering with you in or
// near its ring, CLEAR THE LANE! over a ram's warning lane with you in or near it; nothing when you are far, nothing
// counted while the tags cannot be seen; LEARNED for good once you get out of one in time (in it while it warned, out
// of it when it came), and not by being hit; and never past `cap` showings.
//
//   node test/teach.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=160';
import { TUNING as T } from '../js/tuning.js?v=160';
import { reach } from '../js/sim/slam.js?v=160';
import { inLane } from '../js/sim/posts.js?v=160';
import { create, update, learned } from '../js/sim/teach.js?v=160';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const H = T.hints, L = T.sizes.slam, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const quiet = (world, keepPosts = false) => {
  const w = createWorld({ seed: 3, mode: 'arcade', world });
  w.director = { step() {} }; w.gels.length = 0; w.bullets.length = 0; if (!keepPosts) w.posts.length = 0;
  w.hero.invinc = 1e9;
  return w;
};
const put = (h, x, z) => { h.x = h.px = x; h.z = h.pz = z; };

// ── the slam ─────────────────────────────────────────────────────────
// stand the hero `at(g)` metres from a still giant through its first warning, `then(g)` from its last steps on
const slamRun = (at, then = at, k = create(), show = true) => {
  const w = quiet(4), g = api.spawn(w, 'globbo', 0, 0, { size: 5 });
  g.state = 'active'; g.speedMult = 0; g.anchored = true;
  const tags = [];
  let slammed = false;
  for (let i = 0; i < (L.first + 3) / dt && !slammed; i++) {
    const late = g.slam?.phase === 'warn' && g.slam.t < 6 * dt;
    put(w.hero, (late ? then : at)(g), 0);
    step(w, IDLE);
    slammed = w.events.some((e) => e.type === 'slam');
    for (const t of update(k, w, show)) tags.push(t);
  }
  update(k, w, show);   // the frame after: the warning has ended
  return { k, tags, slammed, g };
};
{
  const inside = (g) => reach(g) - 1, outside = (g) => reach(g) + 1.5, far = (g) => reach(g) + H.near + 3;
  const a = slamRun(inside, outside);
  check('in a giant\'s ring as it gathers, STEP OUT! is over it', a.slammed && a.tags.length > 0 && a.tags.every((t) => t.kind === 'slam' && t.x === 0 && t.z === 0 && t.y > a.g.r * 3), `${a.tags.length} tags`);
  check('…and getting out before it lands learns it for good', learned(a.k, 'slam') && a.k.slam === H.cap && a.k.dirty, `${a.k.slam}`);
  const b = slamRun(inside);
  check('hit by it (still in it when it lands), it is shown once and not learned', b.slammed && b.tags.length > 0 && b.k.slam === 1, `${b.k.slam}`);
  const c = slamRun(outside);
  check('near its ring, not in it: shown, counted once, not learned', c.slammed && c.tags.length > 0 && c.k.slam === 1, `${c.k.slam}`);
  const d = slamRun(far);
  check('far from it: nothing shown, nothing counted', d.slammed && d.tags.length === 0 && d.k.slam === 0 && !d.k.dirty, `${d.tags.length} / ${d.k.slam}`);
  const e = slamRun(inside, inside, create(), false);
  check('while the tags cannot be seen (paused, dying), nothing is counted', e.tags.length === 0 && e.k.slam === 0, `${e.tags.length} / ${e.k.slam}`);
  const f = slamRun(inside, outside, create(), false);
  check('…but getting out in time is still learned', learned(f.k, 'slam'));
  const done = slamRun(inside, inside, create({ slam: H.cap - 1 }));
  const after = slamRun(inside, inside, done.k);
  check(`shown ${H.cap} times, it stops`, done.tags.length > 0 && done.k.slam === H.cap && after.tags.length === 0, `${done.k.slam}, then ${after.tags.length}`);
  check('a stored count is read as a count, clamped', create({ slam: 'x' }).slam === 0 && create({ slam: 99 }).slam === H.cap && create({ ram: 2.7 }).ram === 2);
}

// ── the rams ─────────────────────────────────────────────────────────
{
  const R = T.posts.worlds[3].rams;
  // stand the hero `where(p)` through the first warning of the first ram, `then(p)` from its last steps on
  const ramRun = (where, then = where, k = create()) => {
    const w = quiet(3, true), p = w.posts.find((q) => q.ram);
    const tags = [];
    let came = false, warned = false;
    for (let i = 0; i < 2 * R.period / dt && !came; i++) {
      const late = p.ram.stage === 'warn' && (w.time / R.period + p.ram.phase) % 1 * R.period > R.warn - 6 * dt;
      const [x, z] = (late ? then : where)(p, w);
      put(w.hero, x, z);
      step(w, IDLE);
      if (p.ram.stage === 'warn') warned = true;
      if (warned && p.ram.stage === 'punch') came = true;
      for (const t of update(k, w)) tags.push(t);
    }
    update(k, w);
    return { k, tags, came, p, w };
  };
  const at = (depth, across = 0) => (p) => { const m = p.ram, c = m.side * (m.half - depth); return m.zWalls ? [m.along + across, c] : [c, m.along + across]; };
  // in the lane's middle; beside it, just clear of the hero's whole body; well away from it
  const inLaneMid = at(R.reach / 2), out = (p) => at(R.reach / 2, p.r + T.hero.radius + 0.6)(p), away = (p) => at(R.reach / 2, p.r + T.hero.radius + H.near + 3)(p);
  const a = ramRun(inLaneMid, out);
  const m = a.p.ram, end = m.side * (m.half - R.reach - H.past);
  check('in a ram\'s lane as it warns, CLEAR THE LANE! is on the floor past the lane\'s end', a.came && a.tags.length > 0 && a.tags.every((t) => t.kind === 'ram' && Math.abs((m.zWalls ? t.z : t.x) - end) < 1e-9), `${a.tags.length} tags`);
  // a lane across the screen (portrait: the long walls are the x walls) puts it to the side of the lane, away from the hero
  {
    const w = createWorld({ seed: 3, mode: 'arcade', world: 3, arena: T.arena.portrait, shape: 'portrait' });
    const p = w.posts.find((q) => q.ram), q = p?.ram;
    if (q && !q.zWalls) {
      w.director = { step() {} }; w.gels.length = 0; w.hero.invinc = 1e9;
      const k = create(), c = q.side * (q.half - R.reach / 2), tags = [];
      for (let i = 0; i < 2 * R.period / dt && !tags.length; i++) { put(w.hero, c, q.along + 0.3); step(w, IDLE); tags.push(...update(k, w)); }
      const t = tags[0];
      check('…and where the lane runs across the screen, beside it on the side away from the hero', t && Math.abs(t.x - q.side * (q.half - R.reach - H.past)) < 1e-9 && Math.abs(t.z - (q.along - p.r - H.beside)) < 1e-9, JSON.stringify(t));
    } else check('a portrait sewer has its rams in the x walls', false, `${q?.zWalls}`);
  }
  check('…and stepping out before it comes learns it for good', learned(a.k, 'ram') && a.k.ram === H.cap, `${a.k.ram}`);
  const b = ramRun(inLaneMid);
  check('still in the lane when it comes: shown, counted once, not learned', b.came && b.tags.length > 0 && b.k.ram === 1, `${b.k.ram}`);
  const c = ramRun(away);
  check('away from it: nothing shown, nothing counted', c.came && c.tags.length === 0 && c.k.ram === 0, `${c.tags.length} / ${c.k.ram}`);
  // the lane itself, as clear() and the tags read it
  const w = quiet(3, true), p = w.posts.find((q) => q.ram), q = p.ram, cIn = q.side * (q.half - 1), cPast = q.side * (q.half - R.reach - 1);
  const pt = (along, c) => (q.zWalls ? [q.along + along, c] : [c, q.along + along]);
  check('a ram\'s lane runs from its wall to its reach, its width across', inLane(w, p, ...pt(0, cIn), 0) > 0 && inLane(w, p, ...pt(0, cPast), 0) < 0 && inLane(w, p, ...pt(p.r + 0.3, cIn), 0) < 0 && inLane(w, p, ...pt(p.r + 0.3, cIn), 0.5) > 0);
  check('…and a post that is no ram has none', inLane(w, { r: 1, x: 0, z: 0 }, 0, 0, 1) === -1);
}

console.log(failed ? `\n✗ teach: ${failed} failed, ${passed} passed` : `✔ teach: ${passed} checks`);
process.exit(failed ? 1 : 0);
