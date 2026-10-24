// glowa.js — GLOWA, THE DEEP's gel (world 8). An anglerfish: it creeps at
// you holding its lure out in front (g.s.lx, lz: where the light is, for the
// look). When you come within `bite.range` of the light it tells for
// `bite.tell` s and lunges along that line at `bite.speed`; then it rests.
// Seeded: w.rng only.
import { steerTo } from './base.js?v=43';

export default {
  init(w, g, api) { const s = g.s; s.state = 'creep'; s.t = 0; s.lx = g.x; s.lz = g.z; s.dx = 0; s.dz = 1; },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, B = S.bite;
    s.t -= dt;
    if (s.state === 'creep') {
      steerTo(g, h.x, h.z, api.speed(g));
      g.tell = 0;
      const reach = g.r * S.lure.reach;
      s.lx = g.x + g.faceX * reach; s.lz = g.z + g.faceZ * reach;
      if (s.t <= 0 && Math.hypot(h.x - s.lx, h.z - s.lz) < B.range) {
        const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 1;
        s.dx = dx / d; s.dz = dz / d; s.state = 'tell'; s.t = B.tell; g.sqV -= 0.6;
      }
    } else if (s.state === 'tell') {
      g.tell = 1 - Math.max(0, s.t) / B.tell;
      if (s.t <= 0) { s.state = 'bite'; s.t = B.time; g.sqV += 0.8; w.events.push({ type: 'bite', id: g.id, x: g.x, z: g.z }); }
    } else if (s.state === 'bite') {
      g.vx = s.dx * B.speed; g.vz = s.dz * B.speed; g.tell = 0;
      if (s.t <= 0) { s.state = 'creep'; s.t = B.rest; }
    }
    if (s.state !== 'creep') { const reach = g.r * S.lure.reach; s.lx = g.x + s.dx * reach; s.lz = g.z + s.dz * reach; }
  },
};
