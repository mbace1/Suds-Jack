// bulwark.js — BULWARK, 1.x's shield-plate walker (v140). A steel-blue gel
// that walks straight at you behind a hovering plate; shots that land on
// its front arc (±60° of where it faces) are shrugged off, so you flank it.
// The plate turns at a limited rate, so a quick side-step opens its back.
// It never fires; touching it hurts.
//
// 1.x: enemy.js:1793-1817 (walk and facing), main.js:10683-10700 (the
// block). Numbers: js/tuning/species/bulwark.js. Contract:
// docs/SIM_CONTRACT.md.
//
// The facing lives in g.faceX / g.faceZ (1.x _faceX/_faceZ; the core spawns
// it at (0, 1), 1.x's start). The look reads it to place the plate, and the
// block reads the same facing, so what you see is the arc that blocks.
// g.s.blocks / blockX / blockZ record the shots it shrugged off, for the
// look's steel sparks.

export default {
  init(w, g) {
    g.s.blocks = 0; g.s.blockX = g.x; g.s.blockZ = g.z;
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    const ddx = h.x - g.x, ddz = h.z - g.z;
    const dist = Math.hypot(ddx, ddz) || 0.001;
    // plate-first advance: straight at the hero until it is close, then hold
    if (dist > S.holdAt) {
      const spd = api.speed(g);
      g.vx = (ddx / dist) * spd; g.vz = (ddz / dist) * spd;
    }
    // the facing chases the hero's direction, rate-limited, renormalised
    const tx = ddx / dist, tz = ddz / dist;
    const turn = Math.min(1, S.turnRate * dt);
    let fx = g.faceX + (tx - g.faceX) * turn, fz = g.faceZ + (tz - g.faceZ) * turn;
    const fl = Math.hypot(fx, fz) || 1;
    g.faceX = fx / fl; g.faceZ = fz / fl;
  },

  // a shot landing on the front arc is spent with no damage (even a piercing one)
  onHit(w, g, b, api) {
    const hx = b.x - g.x, hz = b.z - g.z, hl = Math.hypot(hx, hz) || 1;
    if ((hx / hl) * g.faceX + (hz / hl) * g.faceZ > api.S(g).blockDot) {
      g.s.blocks++; g.s.blockX = b.x; g.s.blockZ = b.z;
      // 1.x plays its own clank here (audio.plateTink, lower and duller than a
      // WARDEN's tink): a hook for the sound beside the core's 'block' event
      w.events.push({ type: 'plate', id: g.id, x: b.x, z: b.z });
      return 'block';
    }
    return undefined;
  },
};
