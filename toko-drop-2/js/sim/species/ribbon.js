// ribbon.js — RIBBON, 1.x's v251 arc-mover (a tester in the real waves from
// wave 2): a cyan gel strip whose body IS its own recent path. It has no gun
// and no special hits; the threat is the length of it — it hurts to touch
// anywhere along the strip, and a bullet or a cutting dash lands anywhere
// along it too, at the width it has there.
//
// 1.x js/enemy.js at v268: the constructor 973-990, `_arcSteer` 1266-1288,
// `_buildRibbon` / `_updateRibbon` 1386-1439, `hitTest` / `touches` 1441-1459,
// the movement branch 1704-1710; main.js routes its three contact sites to
// them (the bullet test 10649-10652, the dash cut 10166, contact 10894).
// Every number is tuning/species/ribbon.js.
//
// THE STEER (enemy.js:1272-1288), each step, from wherever the swarm forces
// (its SCHOOL role: dodge, flock, the wave's current — world.js runs them
// before this step, as 1.x main.js:10239-10360 ran them before e.update) and
// last step's crowd and knock left the head:
//   want    = the angle from the head to the hero
//   phase  += dt · weaveHz;  desired = want + sin(phase) · weaveAmp
//   heading += clamp(desired − heading, ±turnRate · dt)   (wrapped to ±π)
//   the head steps speed · dt along the heading; if the arena wall clamps
//   that step, the heading bends a further turnRate · dt · wallBend off it.
// The serpentine is a heading OFFSET, so the path curves; a long body draws
// its own recent heading, so an instant turn would render as a corner — the
// turn-rate limit is what no other body has.
//
// THE BODY (enemy.js:1391-1418): `samples` points, newest first. Spawned, it
// lies straight up the screen from the spawn point, `step` apart. After the
// steer, whenever the head stands `step` or more from the newest point, the
// head's position becomes the newest and the oldest is dropped — sampled BY
// DISTANCE, so its length (samples × step) is a design number, not a
// frame-rate artefact. One point a step, as 1.x: a PUSH dash's knock
// (force × heavy / r = 24.75 u/s, TUNING.hero.push) carries the head about
// 0.45 u a step with its own pace, so while it lasts the links open up to a
// step plus a step's throw: a shoved body stretches, then draws back in over
// 22 samples (test/species/ribbon.mjs measures both).
//
// HITTING IT (enemy.js:1452-1459): a point of radius r touches it if it is
// within (radius + r) of the newest point, or (width · (1 − i / samples) + r)
// of point i ≥ 1 — the body is the trail, never the head circle. The same
// test serves a hero bullet (world.js), the dash cut (hero.js asks hitTest
// at TUNING.hero.dashKill.reach) and contact (the hero's own radius,
// main.js:10894).
//
// It writes the head itself (1.x set group.position from the clamped step),
// so nothing from outside is lost: the forces and the crowd moved g.x before
// it reads it, and a knock (the PUSH dash's shove) is integrated by the core
// after it, on top of the steer, through the same wall clamp. The PUSH dash's
// shove is measured from the head only (hero.js), so it moves a RIBBON by its
// head.
import { TUNING } from '../../tuning.js?v=32';

const TAU = Math.PI * 2;

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.heading = Math.atan2(-g.z, -g.x);                          // at the arena's centre (1.x enemy.js:980)
    s.phase = w.rng.range(S.arc.phase0[0], S.arc.phase0[1]);    // (1.x enemy.js:980)
    g.faceX = Math.cos(s.heading); g.faceZ = Math.sin(s.heading);
    // the strip, laid straight toward −z from the spawn (1.x enemy.js:1394)
    s.trail = [];
    for (let i = 0; i < S.trail.samples; i++) s.trail.push({ x: g.x, z: g.z - i * S.trail.step });
    s.bent = false;                                              // the wall clamped this step's move
  },

  step(w, g, dt, api) {
    const S = api.S(g), A = S.arc, s = g.s, h = w.hero;
    // the steer (1.x enemy.js:1274-1281)
    const want = Math.atan2(h.z - g.z, h.x - g.x);
    s.phase += dt * A.weaveHz;
    const desired = want + Math.sin(s.phase) * A.weaveAmp;
    let d = desired - s.heading;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const max = A.turnRate * dt;
    s.heading += Math.max(-max, Math.min(max, d));
    // the step, and the wall (1.x enemy.js:1282-1287). 1.x clamped at the CFG
    // radius; the core's own clamp stands a body at g.r, so the bend is asked
    // of the same wall the body is held by (for any but an elite, the same)
    const spd = api.speed(g);
    const nx = g.x + Math.cos(s.heading) * spd * dt;
    const nz = g.z + Math.sin(s.heading) * spd * dt;
    const bx = w.hx - g.r, bz = w.hz - g.r;
    const cx = Math.max(-bx, Math.min(bx, nx)), cz = Math.max(-bz, Math.min(bz, nz));
    s.bent = cx !== nx || cz !== nz;
    if (s.bent) s.heading += A.turnRate * dt * A.wallBend;      // on a wall: bend off it
    g.x = cx; g.z = cz;
    g.faceX = Math.cos(s.heading); g.faceZ = Math.sin(s.heading);
    // the body follows (1.x enemy.js:1418): the head becomes the newest point
    // once it is a step from the last one
    const tr = s.trail;
    if (Math.hypot(g.x - tr[0].x, g.z - tr[0].z) >= S.trail.step) {
      const p = tr.pop();
      p.x = g.x; p.z = g.z;
      tr.unshift(p);
    }
  },

  hitTest: (w, g, x, z, r) => onStrip(g, x, z, r),

  // contact is the same body, at the hero's own radius (1.x enemy.js:1459,
  // main.js:10894 `e.touches(px, pz, PLAYER_RADIUS)`; the core's contact reach)
  touches: (w, g) => TUNING.species[g.kind].contact && onStrip(g, w.hero.x, w.hero.z, TUNING.gel.contactRadius),
};

// the strip, along its length at the width it has there (1.x enemy.js:1452-1457):
// the newest point at the head's radius, point i ≥ 1 at width × (1 − i / n)
function onStrip(g, x, z, r) {
  const S = TUNING.species[g.kind], tr = g.s.trail, n = tr.length;
  for (let i = 0; i < n; i++) {
    const half = i === 0 ? S.radius : S.trail.width * (1 - i / n);
    if (Math.hypot(tr[i].x - x, tr[i].z - z) < half + r) return true;
  }
  return false;
}
