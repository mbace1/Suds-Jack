// maw.js — MAW, THE SEWER's boss (v45): WORMA's cycle at a boss's size and
// with a boss's fire. It swims under the floor where nothing can reach it —
// only a bulge in the floor shows where — heads for a point a few metres from
// you, comes up (the tell: the bulge swells and glows), breaks the floor with
// a ring, sprays a turning three-arm spiral while it stands, and goes back
// down. You get it while it is up; it cannot get you while it is down.
// Raging (bosskit.js, at half health) it comes up sooner, and every hole it
// goes down fills with sludge (a floor hazard).
//
//   UNDER  swims for its point (re-aimed at you as you move)
//   RISE   `rise` s still, g.tell rising
//   UP     `up` s: the ring as it breaks the floor, then the spiral
//   SINK   `sink` s going down, still hittable, then UNDER
// g.s.up is how far out of the floor it stands (0..1), for the look (worma's).
// Numbers: js/tuning/species/maw.js. Seeded: w.rng only.
import { steerTo } from './base.js?v=68';
import { rage, range, inside } from './bosskit.js?v=68';

function aim(w, g, S) {
  const h = w.hero, a = Math.atan2(g.z - h.z, g.x - h.x) + (w.rng.next() - 0.5) * 1.8, d = range(w, S.surface);
  const p = inside(w, h.x + Math.cos(a) * d, h.z + Math.sin(a) * d, g.r + 0.5);
  g.s.tx = p.x; g.s.tz = p.z;
}

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'under'; s.t = range(w, S.firstUnder); s.up = 0; s.spin = w.rng.next() * Math.PI * 2; s.next = 0;
    s.enraged = false;
    aim(w, g, S);
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, R = S.rage;
    const mad = rage(w, g, S);
    s.t -= dt;
    g.anchored = true;
    if (s.state === 'under') {
      s.up = 0; g.tell = 0;
      if (Math.hypot(s.tx - h.x, s.tz - h.z) > S.surface[1] + 2) aim(w, g, S);
      const far = Math.hypot(s.tx - g.x, s.tz - g.z);
      if (far > 0.3) steerTo(g, s.tx, s.tz, api.speed(g));
      if (s.t <= 0 && (far <= 0.8 || s.t <= -2)) { s.state = 'rise'; s.t = S.rise; }
    } else if (s.state === 'rise') {
      const k = 1 - Math.max(0, s.t) / S.rise;
      g.tell = k; s.up = 0.15 * k;
      if (s.t <= 0) {
        s.state = 'up'; s.t = S.up; s.next = S.spiral.from; g.sqV += 0.9; g.tell = 0;
        api.fire.ring(w, g.x, g.z, S.erupt.count, api.fire.aimAngle(w, g.x, g.z), { color: S.bulletColor, src: g.kind, speedMult: S.erupt.speed });
        w.events.push({ type: 'wormUp', x: g.x, z: g.z, id: g.id, big: true });
        w.events.push({ type: 'shake', amount: 0.25, id: g.id, kind: g.kind, x: g.x, z: g.z });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
      }
    } else if (s.state === 'up') {
      const into = S.up - s.t, P = S.spiral;
      s.up = Math.min(1, 0.15 + into / 0.25);
      const d = Math.hypot(h.x - g.x, h.z - g.z) || 1; g.faceX = (h.x - g.x) / d; g.faceZ = (h.z - g.z) / d;
      while (into >= s.next && s.next < S.up) {
        s.next += P.every;
        s.spin += P.turn;
        for (let k = 0; k < P.arms; k++) api.fire.emit(w, g.x, g.z, s.spin + (k * Math.PI * 2) / P.arms, { color: S.bulletColor, src: g.kind, speedMult: P.speed });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, spiral: true });
      }
      if (s.t <= 0) { s.state = 'sink'; s.t = S.sink; }
    } else {
      s.up = Math.max(0, s.t / S.sink);
      if (s.t <= 0) {
        if (mad) api.fire.hazard(w, g.x, g.z, { r: R.sludge.r, life: R.sludge.life, src: g.kind, color: R.sludge.color });
        s.state = 'under'; s.t = range(w, mad ? R.under : S.under); s.up = 0; aim(w, g, S);
        w.events.push({ type: 'wormDown', x: g.x, z: g.z, id: g.id });
      }
    }
  },

  hitTest(w, g, x, z, r) { return g.s.up > 0.3 && Math.hypot(g.x - x, g.z - z) < r + g.r; },
  touches(w, g) { const h = w.hero; return g.s.up > 0.3 && Math.hypot(g.x - h.x, g.z - h.z) < g.r + 0.5; },
};
