// bulwark.js — BULWARK, 1.x's shield-plate walker (v140). A steel-blue gel
// that walks straight at you behind a hovering plate; shots that land on
// its front arc (±60° of where it faces) are shrugged off, so you flank it.
// The plate turns at a limited rate, so a quick side-step opens its back.
// It never fires; touching it hurts.
//
// 1.x: enemy.js:1682, 1697-1698, 1793-1817 (the walk and the facing),
// main.js:10683-10700 (the block, tested before a WARDEN's aura). Numbers:
// js/tuning/species/bulwark.js. Contract: docs/SIM_CONTRACT.md.
//
// The facing lives in g.faceX / g.faceZ (1.x _faceX/_faceZ; the core spawns
// it at (0, 1), 1.x's start). The look reads it to place the plate, and the
// block reads the same facing, so what you see is the arc that blocks.
//
// It moves only through its own velocity (g.vx / g.vz), so the core carries
// whatever else moves it — the swarm forces, the crowd, a PUSH dash's knock —
// on top, and the walk aims from wherever those left it.
//
// For the look's steel sparks the sim keeps the last few blocks per body
// (g.s.log, numbered by g.s.blocks, stamped with the run time) and reports
// each one as a `plate` event beside the core's `block` (by: 'plate', which
// plays 1.x's plateTink). The event carries where the body stood, so a body
// killed in the very step its plate blocked still throws its sparks; the
// WARDEN's look reads it to leave a plate's block alone.

export default {
  init(w, g, api) {
    const n = api.S(g).spark.log;
    g.s.blocks = 0;
    g.s.log = Array.from({ length: n }, () => ({ n: 0, t: 0, x: 0, z: 0, gx: 0, gz: 0 }));
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    const ddx = h.x - g.x, ddz = h.z - g.z;
    const dist = Math.hypot(ddx, ddz) || S.distFloor;
    // plate-first advance: straight at the hero until it is close, then hold
    if (dist > S.holdAt) {
      const spd = api.speed(g);
      g.vx = (ddx / dist) * spd; g.vz = (ddz / dist) * spd;
    }
    // the facing chases the hero's direction, rate-limited, renormalised —
    // walking or holding
    const tx = ddx / dist, tz = ddz / dist;
    const turn = Math.min(1, S.turnRate * dt);
    const fx = g.faceX + (tx - g.faceX) * turn, fz = g.faceZ + (tz - g.faceZ) * turn;
    const fl = Math.hypot(fx, fz) || 1;
    g.faceX = fx / fl; g.faceZ = fz / fl;
  },

  // a shot landing on the front arc is spent with no damage (even a piercing one)
  onHit(w, g, b, api) {
    const S = api.S(g);
    const hx = b.x - g.x, hz = b.z - g.z, hl = Math.hypot(hx, hz) || 1;
    if ((hx / hl) * g.faceX + (hz / hl) * g.faceZ <= S.blockDot) return undefined;
    const n = ++g.s.blocks, e = g.s.log[(n - 1) % g.s.log.length];
    e.n = n; e.t = w.time; e.x = b.x; e.z = b.z; e.gx = g.x; e.gz = g.z;
    w.events.push({ type: 'plate', id: g.id, x: b.x, z: b.z, n, t: w.time, gx: g.x, gz: g.z, r: g.r });
    return 'block';
  },
};
