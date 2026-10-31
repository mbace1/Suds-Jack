// curbking.js — CURB KING, THE DRIVEWAY's boss (v45): HOPPA's hop, at a
// king's size. It shuffles a beat, squats (the tell: it glows, and the spot it
// will land on is marked), leaps in a high arc to where you are about to be,
// and lands with a shockwave ring. In the air it is over your head — it cannot
// touch you and your shots pass under it — so the window is the squat and the
// landing. Landing ON you hurts.
//
//   REST    it shuffles at you
//   CROUCH  `crouch` s still, g.tell rising; the landing spot locked
//   HOP     `flight` s along a straight line to it, s.y a parabola to `height`
//   land    the ring, a shake, then REST — raging (bosskit.js, at half health)
//           it squats again at once for a second hop, then rests; the ring
//           comes doubled; every `brood.every`th landing shakes HOPPA loose
// Numbers: js/tuning/species/curbking.js. Seeded: w.rng only.
import { steerTo } from './base.js?v=66';
import { rage, range, inside } from './bosskit.js?v=66';
import { TUNING } from '../../tuning.js?v=66';

function squat(w, g, S, crouch) {
  const s = g.s, h = w.hero;
  const px = h.x + (h.velX || 0) * S.lead, pz = h.z + (h.velZ || 0) * S.lead;
  let dx = px - g.x, dz = pz - g.z; const d = Math.hypot(dx, dz) || 1e-6;
  const L = Math.max(S.reach[0], Math.min(S.reach[1], d));
  dx /= d; dz /= d;
  const p = inside(w, g.x + dx * L, g.z + dz * L, g.r);
  s.tx = p.x; s.tz = p.z;
  s.state = 'crouch'; s.t = crouch; s.crouch = crouch; g.sqV += S.crouchSquash;
  g.faceX = dx; g.faceZ = dz;
}

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'rest'; s.t = range(w, S.firstRest); s.y = 0; s.crouch = S.crouch;
    s.fx = g.x; s.fz = g.z; s.tx = g.x; s.tz = g.z; s.turn = 0; s.landings = 0; s.second = false;
    s.enraged = false;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, R = S.rage;
    const mad = rage(w, g, S);
    s.t -= dt;
    g.anchored = true;                        // a king is not shoved about by the crowd
    if (s.state === 'rest') {
      steerTo(g, h.x, h.z, api.speed(g));
      g.tell = 0;
      if (s.t <= 0) squat(w, g, S, mad ? R.crouch : S.crouch);
    } else if (s.state === 'crouch') {
      g.tell = 1 - Math.max(0, s.t) / s.crouch;
      if (s.t <= 0) {
        s.state = 'hop'; s.t = S.flight; s.fx = g.x; s.fz = g.z;
        g.sqV += S.launchSquash; g.tell = 0;
        w.events.push({ type: 'hopUp', x: g.x, z: g.z, id: g.id });
      }
    } else {
      const u = Math.min(1, 1 - s.t / S.flight);
      g.x = s.fx + (s.tx - s.fx) * u; g.z = s.fz + (s.tz - s.fz) * u;
      s.y = 4 * S.height * u * (1 - u);
      if (u >= 1) land(w, g, S, api, mad);
    }
  },

  // in the air it is over your head
  hitTest(w, g, x, z, r) { return g.s.y < air(g) && Math.hypot(g.x - x, g.z - z) < r + g.r; },
  touches(w, g) { const h = w.hero; return g.s.y < air(g) && Math.hypot(g.x - h.x, g.z - h.z) < g.r + 0.5; },
};

const air = (g) => TUNING.species[g.kind].airborne;

function land(w, g, S, api, mad) {
  const s = g.s, R = S.rage;
  s.y = 0; s.landings++;
  g.sqV += S.landSquash;
  s.turn ^= 1;
  const a = api.fire.aimAngle(w, g.x, g.z) + s.turn * Math.PI / S.ring.count, opts = { color: S.bulletColor, src: g.kind };
  api.fire.ring(w, g.x, g.z, S.ring.count, a, { ...opts, speedMult: S.ring.speed });
  if (mad) api.fire.ring(w, g.x, g.z, S.ring2.count, a + Math.PI / S.ring2.count, { ...opts, speedMult: S.ring2.speed });
  w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
  w.events.push({ type: 'hopLand', x: g.x, z: g.z, id: g.id, r: g.r, big: true });
  w.events.push({ type: 'shake', amount: S.landShake, id: g.id, kind: g.kind, x: g.x, z: g.z });
  // raging: every third landing shakes HOPPA loose, two of them, either side
  if (mad && s.landings % R.brood.every === 0) {
    const n = Math.min(R.brood.n, api.childrenAllowed(w));
    for (let i = 0; i < n; i++) {
      const a2 = w.rng.next() * Math.PI * 2, p = inside(w, g.x + Math.cos(a2) * g.r * 1.4, g.z + Math.sin(a2) * g.r * 1.4, 1);
      api.spawn(w, R.brood.kind, p.x, p.z, { child: true, speedMult: g.speedMult, intervalMult: g.intervalMult });
    }
  }
  // raging, the first hop of a pair squats again at once
  if (mad && !s.second) { s.second = true; squat(w, g, S, R.crouch); return; }
  s.second = false;
  s.state = 'rest'; s.t = range(w, mad ? R.rest : S.rest);
}
