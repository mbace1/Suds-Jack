// worma.js — WORMA, the sewer's pipe-worm (2.0's own, world 3). It swims
// under the floor where nothing can reach it — only a bulge in the floor
// shows where — heads for a point a few metres from you, comes up (the tell:
// the bulge swells and glows), spits a fan at you twice, and goes back down.
// You get it while it is up; it cannot get you while it is down.
//
//   UNDER  swims at `speed` for its point (re-aimed at you as you move);
//          untouchable, harmless
//   RISE   `rise` s still, g.tell rising: the floor bulges
//   UP     `up` s: a fan of `fanCount` at you at each of `fans`; hittable,
//          hurts to touch
//   SINK   `sink` s going down, still hittable, then UNDER
// g.s.up is how far out of the floor it stands (0..1), for the look.
// Numbers: js/tuning/species/worma.js. Seeded: w.rng only.
import { steerTo } from './base.js?v=65';

const range = (w, [a, b]) => a + w.rng.next() * (b - a);

function aim(w, g, S) {
  // a point `surface` u from you, on its own side of you, inside the floor
  const h = w.hero, a = Math.atan2(g.z - h.z, g.x - h.x) + (w.rng.next() - 0.5) * 1.6, d = range(w, S.surface);
  g.s.tx = Math.max(-w.hx + 1, Math.min(w.hx - 1, h.x + Math.cos(a) * d));
  g.s.tz = Math.max(-w.hz + 1, Math.min(w.hz - 1, h.z + Math.sin(a) * d));
}

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'under'; s.t = range(w, S.firstUnder); s.up = 0; s.fired = 0;
    s.anch = !!g.anchored;   // its own ANCHORED affix, if it has one
    aim(w, g, S);
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.t -= dt;
    // under the floor the crowd does not shove it, nor it them
    g.anchored = s.anch || s.state === 'under';
    if (s.state === 'under') {
      s.up = 0; g.tell = 0;
      // you moved off: a fresh point by where you are now
      if (Math.hypot(s.tx - h.x, s.tz - h.z) > S.surface[1] + 2) aim(w, g, S);
      const far = Math.hypot(s.tx - g.x, s.tz - g.z);
      if (far > 0.3) steerTo(g, s.tx, s.tz, api.speed(g));
      // it comes up once its time is out AND it is there (or has swum `under` s too long)
      if (s.t <= 0 && (far <= 0.6 || s.t <= -S.under[1])) { s.state = 'rise'; s.t = S.rise; g.faceX = h.x - g.x; g.faceZ = h.z - g.z; }
    } else if (s.state === 'rise') {
      const k = 1 - Math.max(0, s.t) / S.rise;
      g.tell = k; s.up = 0.15 * k;
      if (s.t <= 0) { s.state = 'up'; s.t = S.up; s.fired = 0; g.sqV += 0.8; g.tell = 0; w.events.push({ type: 'wormUp', x: g.x, z: g.z, id: g.id }); }
    } else if (s.state === 'up') {
      const into = S.up - s.t;
      s.up = Math.min(1, 0.15 + into / 0.18);
      const d = Math.hypot(h.x - g.x, h.z - g.z) || 1; g.faceX = (h.x - g.x) / d; g.faceZ = (h.z - g.z) / d;
      if (s.fired < S.fans.length && into >= S.fans[s.fired]) {
        s.fired++;
        const a = api.fire.aimAngle(w, g.x, g.z), n = S.fanCount;
        for (let i = 0; i < n; i++) api.fire.emit(w, g.x, g.z, a + (i - (n - 1) / 2) * S.fanSpread, { color: S.bulletColor, src: g.kind, speedMult: S.fanSpeed });
        g.sqV -= 0.4;
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
      }
      if (s.t <= 0) { s.state = 'sink'; s.t = S.sink; }
    } else {
      s.up = Math.max(0, s.t / S.sink);
      if (s.t <= 0) { s.state = 'under'; s.t = range(w, S.under); s.up = 0; aim(w, g, S); w.events.push({ type: 'wormDown', x: g.x, z: g.z, id: g.id }); }
    }
  },

  // down, it is under the floor: nothing reaches it and it reaches nothing
  hitTest(w, g, x, z, r) { return g.s.up > 0.3 && Math.hypot(g.x - x, g.z - z) < r + g.r; },
  touches(w, g) { const h = w.hero; return g.s.up > 0.3 && Math.hypot(g.x - h.x, g.z - h.z) < g.r + 0.5; },
};
