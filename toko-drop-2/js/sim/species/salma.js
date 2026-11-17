// salma.js — SALMA, THE RIVER's gel (world 6). It swims in darts: a burst at
// `dart.speed` for `dart.time`, then a glide that slows to a stop, then a
// new heading — part the way it was going, part toward you (`turn`), and in a
// world with a current part against it (`upstream`) — and the next dart.
// Its own line ignores the swarm forces (role FIXED); walls turn it back.
// Seeded: w.rng only.
const range = (w, [a, b]) => a + w.rng.next() * (b - a);

function heading(w, g, S) {
  const h = w.hero, s = g.s;
  let dx = h.x - g.x, dz = h.z - g.z; const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
  let hx = s.hx * (1 - S.turn) + dx * S.turn, hz = s.hz * (1 - S.turn) + dz * S.turn;
  const R = w.rule;
  if (R && R.kind === 'current') { hx -= Math.cos(R.angle) * S.upstream; hz -= Math.sin(R.angle) * S.upstream; }
  hx += (w.rng.next() - 0.5) * 0.6; hz += (w.rng.next() - 0.5) * 0.6;
  const n = Math.hypot(hx, hz) || 1; s.hx = hx / n; s.hz = hz / n;
}

export default {
  init(w, g, api) {
    const s = g.s, a = w.rng.next() * Math.PI * 2;
    s.hx = Math.cos(a); s.hz = Math.sin(a); s.phase = 'glide'; s.t = range(w, api.S(g).glide) * 0.5; s.v = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s;
    s.t -= dt;
    if (s.phase === 'dart') {
      s.v = S.dart.speed * (api.speed(g) / S.speed);
      if (s.t <= 0) { s.phase = 'glide'; s.t = range(w, S.glide); }
    } else {
      s.v *= Math.exp(-4 * dt);
      if (s.t <= 0) { heading(w, g, S); s.phase = 'dart'; s.t = S.dart.time; g.sqV += 0.25; }
    }
    // a wall turns it back
    const m = g.r + 0.2;
    if ((g.x < -w.hx + m && s.hx < 0) || (g.x > w.hx - m && s.hx > 0)) s.hx = -s.hx;
    if ((g.z < -w.hz + m && s.hz < 0) || (g.z > w.hz - m && s.hz > 0)) s.hz = -s.hz;
    g.vx = s.hx * s.v; g.vz = s.hz * s.v; g.faceX = s.hx; g.faceZ = s.hz;
  },
};
