// hoppa.js — HOPPA, the driveway's curb-hopper (2.0's own, world 2). A fat
// lime gel that does not walk so much as bound: it shuffles a beat, squats
// (the tell: it glows, and its landing spot is marked on the floor), then
// hops in a high arc to where you are about to be and lands with a slow ring
// of shots. In the air it is over your head — it cannot touch you and your
// bullets pass under it — so the window is the squat and the landing.
//
//   REST    it shuffles at you at its walking speed
//   CROUCH  `crouch` s: no movement, g.tell rising; the landing spot (where
//           you will be in `lead` s, `reach` u away at most) is locked
//   HOP     `flight` s along a straight line to the spot, s.y a parabola to
//           `height`; above `airborne` it is untouchable
//   land    a squash, a ring of `ringCount` shots, then REST
// Numbers: js/tuning/species/hoppa.js. Seeded: w.rng only.
import { steerTo } from './base.js?v=67';

const range = (w, [a, b]) => a + w.rng.next() * (b - a);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'rest'; s.t = range(w, S.firstRest); s.y = 0;
    s.fx = g.x; s.fz = g.z; s.tx = g.x; s.tz = g.z; s.turn = 0;
    s.anch = !!g.anchored;   // its own ANCHORED affix, if it has one
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.t -= dt;
    // in the air the crowd does not shove it about: it is over their heads
    g.anchored = s.anch || s.state === 'hop';
    if (s.state === 'rest') {
      steerTo(g, h.x, h.z, api.speed(g));
      g.tell = 0;
      if (s.t <= 0) {
        // where you will be, no farther than it can hop
        const px = h.x + (h.velX || 0) * S.lead, pz = h.z + (h.velZ || 0) * S.lead;
        let dx = px - g.x, dz = pz - g.z; const d = Math.hypot(dx, dz) || 1e-6;
        const L = Math.max(S.reach[0], Math.min(S.reach[1], d));
        dx /= d; dz /= d;
        s.tx = Math.max(-w.hx + g.r, Math.min(w.hx - g.r, g.x + dx * L));
        s.tz = Math.max(-w.hz + g.r, Math.min(w.hz - g.r, g.z + dz * L));
        s.state = 'crouch'; s.t = S.crouch; g.sqV += S.crouchSquash;
        g.faceX = dx; g.faceZ = dz;
      }
    } else if (s.state === 'crouch') {
      g.tell = 1 - Math.max(0, s.t) / S.crouch;
      if (s.t <= 0) {
        s.state = 'hop'; s.t = S.flight; s.fx = g.x; s.fz = g.z;
        g.sqV += S.launchSquash; g.tell = 0;
        w.events.push({ type: 'hopUp', x: g.x, z: g.z, id: g.id });
      }
    } else {
      // the line from the take-off to the spot, set straight (the crowd and
      // the swarm forces do not steer a body in the air)
      const u = Math.min(1, 1 - s.t / S.flight);
      g.x = s.fx + (s.tx - s.fx) * u; g.z = s.fz + (s.tz - s.fz) * u;
      s.y = 4 * S.height * u * (1 - u);
      if (u >= 1) {
        s.y = 0; s.state = 'rest'; s.t = range(w, S.rest);
        g.sqV += S.landSquash;
        s.turn ^= 1;
        api.fire.ring(w, g.x, g.z, S.ringCount, api.fire.aimAngle(w, g.x, g.z) + s.turn * Math.PI / S.ringCount,
          { color: S.bulletColor, src: g.kind, speedMult: S.ringSpeed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
        w.events.push({ type: 'hopLand', x: g.x, z: g.z, id: g.id, r: g.r });
      }
    }
  },

  // in the air it is over your head
  hitTest(w, g, x, z, r) { return g.s.y < this.air(g) && Math.hypot(g.x - x, g.z - z) < r + g.r; },
  touches(w, g) { const h = w.hero; return g.s.y < this.air(g) && Math.hypot(g.x - h.x, g.z - h.z) < g.r + 0.5; },
  air: (g) => 0.9 * (g.r / 0.75),
};
