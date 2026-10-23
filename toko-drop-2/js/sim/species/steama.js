// steama.js — STEAMA, THE BOILER ROOM's gel (world 5). It walks at you, and
// every `every` s swells for `tell` s (g.tell) and vents: a scalding cloud
// on the floor where it stands (api.fire.hazard: it hurts to stand in) and a
// slow ring of shots. Its cloud is what makes it a place rather than a body:
// kill it in the open, or fight round the steam. Seeded: w.rng only.
import { steerTo } from './_base.js?v=29';

const range = (w, [a, b]) => a + w.rng.next() * (b - a);

export default {
  init(w, g, api) { const S = api.S(g); g.s.t = range(w, S.every); g.s.venting = false; },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.t -= dt;
    if (!s.venting) {
      steerTo(g, h.x, h.z, api.speed(g));
      if (s.t <= 0) { s.venting = true; s.t = S.tell; g.sqV += 0.4; }
      g.tell = 0;
    } else {
      g.tell = 1 - Math.max(0, s.t) / S.tell;
      if (s.t <= 0) {
        s.venting = false; s.t = range(w, S.every); g.tell = 0; g.sqV -= 0.9;
        api.fire.hazard(w, g.x, g.z, { r: S.cloud.r, life: S.cloud.life, src: g.kind, color: 0xffd0b0 });
        api.fire.ring(w, g.x, g.z, S.ring, w.rng.next() * Math.PI * 2, { color: S.bulletColor, src: g.kind, speedMult: S.ringSpeed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
        w.events.push({ type: 'vent', id: g.id, x: g.x, z: g.z, r: S.cloud.r });
      }
    }
  },
};
