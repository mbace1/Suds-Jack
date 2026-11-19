#!/usr/bin/env node
// slam.mjs — a giant's slam (sim/slam.js, v112), in bare node: a size-5 body gathers on its own beat, told with
// its reach, holding still and squashing; it slams: inside the ring you are hit (named for it), outside or in a
// dash you are not; the bodies in reach are thrown out; a tank never slams, nor a boss; two giants do not slam as one.
//
//   node test/slam.mjs
import { createWorld, step, api } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import { reach } from '../js/sim/slam.js?v=157';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const L = T.sizes.slam, dt = T.sim.dt, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const quiet = (o = {}) => { const w = createWorld({ seed: 3, mode: 'arcade', world: 4, ...o }); w.director = { step() {} }; w.gels.length = 0; w.bullets.length = 0; w.posts.length = 0; return w; };
const giant = (w, x, z, kind = 'globbo', size = 5, still = false) => { const g = api.spawn(w, kind, x, z, { size }); g.state = 'active'; if (still) { g.speedMult = 0; g.anchored = true; } return g; };

// ── the beat, told, still, squashed ──────────────────────────────────
{
  const w = quiet(), g = giant(w, 0, -6);
  w.hero.x = w.hero.px = 14; w.hero.z = w.hero.pz = 8; w.hero.invinc = 1e9;
  const log = []; let still = true, sqMin = 9, x0 = null;
  for (let i = 0; i < 14 / dt; i++) {
    step(w, IDLE);
    for (const e of w.events) if (e.type === 'slamWarn' || e.type === 'slam') log.push({ type: e.type, t: w.time, r: e.r });
    if (g.slam?.phase === 'warn') { if (x0 === null) x0 = [g.x, g.z]; else if (Math.hypot(g.x - x0[0], g.z - x0[1]) > 1e-9) still = false; sqMin = Math.min(sqMin, g.sq); } else x0 = null;
  }
  const first = L.first + (g.id % 5) * L.stagger, warns = log.filter((e) => e.type === 'slamWarn'), slams = log.filter((e) => e.type === 'slam');
  check('a giant is told, then slams, on its own beat', warns.length >= 2 && slams.length >= 2 && Math.abs(warns[0].t - first) < 2 * dt && Math.abs(slams[0].t - warns[0].t - L.warn) < 2 * dt && Math.abs(warns[1].t - slams[0].t - L.every) < 2 * dt,
    JSON.stringify(log.slice(0, 4).map((e) => [e.type, +e.t.toFixed(2)])));
  check('…the warning carries its reach (its rim and some)', Math.abs(warns[0].r - (g.r + L.reach)) < 1e-9 && warns[0].r === slams[0].r, `${warns[0]?.r}`);
  check('…and while it gathers it holds still, squashing down', still && sqMin < L.squash + 0.05, `still ${still}, squash ${sqMin.toFixed(2)}`);
}

// ── inside the ring you are hit, outside not, and a dash or mercy goes through ──
{
  const at = (dist, dash = false) => {
    const w = quiet(), g = giant(w, 0, 0, 'globbo', 5, true), h = w.hero;
    h.x = h.px = reach(g) + dist; h.z = h.pz = 0; h.invinc = 0;
    let hit = null;
    for (let i = 0; i < (L.first + 2.5) / dt && !hit; i++) {
      const warnEnds = g.slam?.phase === 'warn' && g.slam.t < 4 * dt;
      step(w, { ...IDLE, dash: dash && warnEnds ? { x: 0, z: 1 } : false });
      h.x = reach(g) + dist; h.z = 0;   // kept where the check wants it
      if (w.killedBy || h.lives < T.hero.lives || h.mercy > 0) hit = w.killedBy ?? 'hit';
      if (w.events.some((e) => e.type === 'slam')) { if (!hit) hit = 'missed'; }
    }
    return hit;
  };
  const inside = at(-1.2), outside = at(1.0);
  check('inside the ring when it lands, you are hit — and named for it', inside && inside !== 'missed', `${inside}`);
  check('outside it, nothing', outside === 'missed', `${outside}`);
}

// ── the bodies in reach are thrown out ───────────────────────────────
{
  const w = quiet(), g = giant(w, 0, 0, 'globbo', 5, true), near = giant(w, reach(g) - 0.8, 0, 'globbo', 2), far = giant(w, reach(g) + 4, 0, 'globbo', 2);
  near.speedMult = far.speedMult = 0; near.anchored = far.anchored = true;
  w.hero.x = w.hero.px = 20; w.hero.z = w.hero.pz = 10; w.hero.invinc = 1e9;
  let kNear = 0, kFar = 0;
  for (let i = 0; i < (L.first + 2) / dt; i++) { step(w, IDLE); if (w.events.some((e) => e.type === 'slam')) { kNear = near.kx; kFar = Math.hypot(far.kx, far.kz); break; } }
  check('the bodies in its reach are thrown out, those past it untouched', kNear > 3 && kFar < 1e-9, `${kNear.toFixed(2)} / ${kFar}`);
}

// ── who slams ────────────────────────────────────────────────────────
{
  const w = quiet(), tank = giant(w, -8, 0, 'globbo', 4), boss = giant(w, 8, 0, 'globbo', 5);
  boss.isBoss = true;
  w.hero.x = w.hero.px = 0; w.hero.z = w.hero.pz = 10; w.hero.invinc = 1e9;
  let n = 0;
  for (let i = 0; i < 12 / dt; i++) { step(w, IDLE); n += w.events.filter((e) => e.type === 'slamWarn').length; }
  check('a tank never slams, nor a boss', n === 0, `${n}`);
  const v = quiet(), a = giant(v, -8, 0), b = giant(v, 8, 0), seen = new Map();
  v.hero.x = v.hero.px = 0; v.hero.z = v.hero.pz = 10; v.hero.invinc = 1e9;
  for (let i = 0; i < 6 / dt; i++) { step(v, IDLE); for (const e of v.events) if (e.type === 'slam' && !seen.has(e.id)) seen.set(e.id, v.time); }
  check('two giants do not slam as one', seen.size === 2 && Math.abs(seen.get(a.id) - seen.get(b.id)) > 0.2, JSON.stringify([...seen.values()].map((t) => +t.toFixed(2))));
}

console.log(failed ? `\n✗ slam: ${failed} failed, ${passed} passed` : `✔ slam: ${passed} checks`);
process.exit(failed ? 1 : 0);
