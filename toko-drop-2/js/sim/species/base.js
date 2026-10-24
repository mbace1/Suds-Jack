// base.js — what every species can lean on, and the stand-in behaviour a
// species has until its 1.x port lands: walk at the hero, and if it has a
// fire interval, an aimed shot on it. The contract is docs/SIM_CONTRACT.md.

// Set the body's own velocity toward (tx, tz) at `speed` u/s.
export function steerTo(g, tx, tz, speed) {
  const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz) || 1e-6;
  g.vx = (dx / d) * speed; g.vz = (dz / d) * speed;
  g.faceX = dx / d; g.faceZ = dz / d;
  return d;
}

export const stub = {
  init(w, g) { g.s.t = w.rng.range(0, 0.5); },          // 1.x desyncs a wave's first volleys
  step(w, g, dt, api) {
    const S = api.S(g);
    steerTo(g, w.hero.x, w.hero.z, api.speed(g));
    if (!S.fireInterval) return;
    if ((g.s.t += dt) >= S.fireInterval * g.intervalMult) {
      g.s.t = 0;
      api.fire.emit(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), { color: S.bulletColor ?? undefined, src: g.kind });
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
    }
  },
};
