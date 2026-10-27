// bubbla.js — BUBBLA, THE CISTERN's gel (world 4). A gel floating in a
// bubble: the bubble blocks the shots, thinning with each one, and pops on
// the last (`shell`); only then does a shot hurt the gel. Popped, it bolts
// away from you for a beat, then drifts back; left unhit for `regrow` s the
// bubble is whole again. So it rewards keeping your fire on one target.
//
// g.s.shell is the bubble's hits left (the look reads it); g.s.bolt the
// seconds of running left. Seeded: w.rng only.
import { steerTo } from './base.js?v=51';

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.shell = S.shell; s.since = 0; s.bolt = 0; s.clock = w.rng.next() * Math.PI * 2;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.clock += dt; s.since += dt;
    if (s.shell < S.shell && s.shell > 0 && s.since >= S.regrow) s.shell = S.shell;   // left alone, it mends
    if (s.shell === 0 && s.since >= S.regrow) { s.shell = S.shell; w.events.push({ type: 'bubble', id: g.id, x: g.x, z: g.z, whole: true }); }
    if (s.bolt > 0) {
      s.bolt -= dt;
      const dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz) || 1;
      g.vx = (dx / d) * S.bolt.speed; g.vz = (dz / d) * S.bolt.speed;
      return;
    }
    steerTo(g, h.x, h.z, api.speed(g));
    // the float: a slow sway across its line
    const sway = Math.sin(s.clock * Math.PI * 2 * S.bob[0]) * S.bob[1] * 2 * Math.PI * S.bob[0];
    g.vx += -g.faceZ * sway; g.vz += g.faceX * sway;
  },

  // the bubble takes the shot; the last one pops it
  onHit(w, g, b, api) {
    const s = g.s;
    s.since = 0;
    if (s.shell <= 0) return undefined;           // popped: the gel takes it
    s.shell--;
    g.sqV += 0.35;
    if (s.shell === 0) { s.bolt = api.S(g).bolt.time; w.events.push({ type: 'bubble', id: g.id, x: g.x, z: g.z, popped: true }); }
    return 'block';
  },
};
