// warden.js — WARDEN, 1.x's shield-bearer (v124; enemy.js:1755-1767,
// main.js:10703-10720). A teal gel dome that never attacks: the threat is
// what it protects. It plods straight at you and stands still once it is
// close, and every OTHER living body inside its aura shrugs off your shots
// (the bullet is spent, no damage) — the boss too, never another WARDEN and
// never itself, so the priority target is always killable. Kill it first.
//
// 1.x tested the aura per bullet, at the bullet test, against the living
// wardens (`enemies.some(w => w.alive && …)`), after every body had moved and
// the crowd had been solved (main.js:10369, 10426, 10636-10712). 2.0's core
// resets g.shield on every body at the top of each step and reads it at its
// bullet test, so the WARDEN raises it twice:
//   - in its own step, on the bodies in its aura where they stand then: the
//     fallback for a bullet that meets a ward before the bullet test has
//     asked any WARDEN anything this step;
//   - again at the bullet test, from where everybody stands after the moves
//     and the crowd, which is where 1.x took it. The core asks a body's
//     hitTest for every bullet it tests against that body, so the first ask
//     this step re-takes every living WARDEN's aura (`settle`). The hero's
//     dash asks hitTest too, but in the hero's step, before the WARDENs have
//     stepped; that ask is not taken for the bullet test.
// And when a WARDEN dies mid-step — a bullet earlier in the same step's test
// — its wards lose the shield at once unless another living WARDEN also
// covers them, so the next bullet that step lands, as it did in 1.x's
// per-bullet `w.alive`.
//
// Numbers: js/tuning/species/warden.js. Contract: docs/SIM_CONTRACT.md.
import { TUNING } from '../../tuning.js?v=20';

export default {
  init(w, g) {
    g.s.covered = [];        // the bodies it shields this step
    g.s.tick = -1;           // the step it last stepped in (its shield is up only then)
    g.s.settled = -1;        // the step its aura was last re-taken at the bullet test
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    // the walk (enemy.js:1758-1761): straight at the hero until within stopAt
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || S.distFloor;
    if (dist > S.stopAt) {
      const v = api.speed(g);
      g.vx = (dx / dist) * v; g.vz = (dz / dist) * v;
      g.faceX = dx / dist; g.faceZ = dz / dist;
    }
    g.s.tick = w.tick;
    cover(w, g, S.aura);
  },

  // its own body is the plain circle (main.js:10651-10653); a call after its
  // step this step is the core's bullet test reaching it
  hitTest(w, g, x, z, r) {
    if (g.s.tick === w.tick && g.s.settled !== w.tick) settle(w, g.kind);
    return Math.hypot(g.x - x, g.z - z) < r + g.r;
  },

  // the shield drops with the WARDEN (enemy.js:3008: the ring and the rule
  // together): a ward stays shielded this step only if another living WARDEN
  // shields it this step too
  onKill(w, g) {
    const others = live(w, g.kind).filter((k) => k !== g);
    for (const o of g.s.covered) {
      if (o.shield && !others.some((k) => k.s.covered.includes(o))) o.shield = false;
    }
    g.s.covered.length = 0;
  },
};

// the aura (main.js:10706-10708): every other living non-WARDEN body whose
// centre is strictly inside it, the boss included
function cover(w, g, aura) {
  const c = g.s.covered;
  c.length = 0;
  for (const o of w.gels) {
    if (o === g || !o.alive || o.kind === g.kind) continue;
    if (Math.hypot(g.x - o.x, g.z - o.z) < aura) { o.shield = true; c.push(o); }
  }
}

// the living WARDENs whose shield is up this step: every one that has stepped,
// which is every one from its first step (1.x's rule asked only w.alive, and a
// body was alive from its constructor, main.js:10706-10708, enemy.js:662; 2.0's
// director lands its spawns before the bodies step). Only a body the core
// still holds inert (state 'appear', a brood's wait, which no WARDEN is) has
// not stepped, and shields nothing
const live = (w, kind) => w.gels.filter((k) => k.kind === kind && k.alive && k.s.tick === w.tick);

// re-take every living WARDEN's aura from where the bodies stand now: drop
// what they raised in their steps, then raise it again
function settle(w, kind) {
  const ws = live(w, kind), aura = TUNING.species[kind].aura;
  for (const k of ws) for (const o of k.s.covered) o.shield = false;
  for (const k of ws) { k.s.settled = w.tick; cover(w, k, aura); }
}
