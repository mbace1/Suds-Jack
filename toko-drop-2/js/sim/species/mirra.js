// mirra.js — MIRRA, THE CORE's gel (world 9). It goes to where you would be
// in a mirror — through the middle of the floor, or across one of its axes
// (one drawn per body, s.axis) — and every `every` s fires a small volley at
// you across the floor. Seeded: w.rng only.
const range = (w, [a, b]) => a + w.rng.next() * (b - a);

export default {
  init(w, g, api) { const S = api.S(g); g.s.axis = S.axes[w.rng.int(0, S.axes.length - 1)]; g.s.t = range(w, S.every); },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const tx = s.axis === 'z' ? h.x : -h.x, tz = s.axis === 'x' ? h.z : -h.z;
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    const sp = Math.min(api.speed(g), d / dt);
    if (d > 1e-3) { g.vx = (dx / d) * sp; g.vz = (dz / d) * sp; }
    const fx = h.x - g.x, fz = h.z - g.z, fd = Math.hypot(fx, fz) || 1; g.faceX = fx / fd; g.faceZ = fz / fd;
    if ((s.t -= dt) <= 0) {
      s.t = range(w, S.every);
      const a = Math.atan2(fz, fx);
      for (let i = 0; i < S.volley; i++) api.fire.emit(w, g.x, g.z, a + (i - (S.volley - 1) / 2) * S.spread, { color: S.bulletColor, src: g.kind, speedMult: S.shotSpeed });
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
    }
  },
};
