// skata.js — SKATA, THE ICE SHEET's gel (world 7). A puck: it starts sliding
// at you at `speed`, never slows, reflects off the walls (faster by `gain`
// each time, to `max`), and on every `reaim`th bounce it lines up on you
// again. A shot knocks it along the shot's line. Seeded: w.rng only.
export default {
  init(w, g, api) {
    const S = api.S(g), h = w.hero, s = g.s;
    const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 1;
    s.vx = (dx / d) * S.speed; s.vz = (dz / d) * S.speed; s.bounces = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, m = g.r;
    let bounced = false;
    if ((g.x <= -w.hx + m + 1e-3 && s.vx < 0) || (g.x >= w.hx - m - 1e-3 && s.vx > 0)) { s.vx = -s.vx; bounced = true; }
    if ((g.z <= -w.hz + m + 1e-3 && s.vz < 0) || (g.z >= w.hz - m - 1e-3 && s.vz > 0)) { s.vz = -s.vz; bounced = true; }
    if (bounced) {
      s.bounces++;
      let sp = Math.min(S.max, Math.hypot(s.vx, s.vz) * S.gain);
      if (s.bounces % S.reaim === 0) {
        const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 1;
        s.vx = (dx / d) * sp; s.vz = (dz / d) * sp;
      } else { const k = sp / (Math.hypot(s.vx, s.vz) || 1); s.vx *= k; s.vz *= k; }
      g.sqV -= 0.5;
      w.events.push({ type: 'skid', id: g.id, x: g.x, z: g.z });
    }
    g.vx = s.vx; g.vz = s.vz;
    const d = Math.hypot(s.vx, s.vz) || 1; g.faceX = s.vx / d; g.faceZ = s.vz / d;
  },

  // a shot knocks it along the shot's line (and the shot still lands)
  onHit(w, g, b, api) {
    const S = api.S(g), s = g.s, bl = Math.hypot(b.vx, b.vz) || 1;
    s.vx += (b.vx / bl) * S.knock; s.vz += (b.vz / bl) * S.knock;
    const sp = Math.hypot(s.vx, s.vz); if (sp > S.max) { s.vx *= S.max / sp; s.vz *= S.max / sp; }
    return undefined;
  },
};
