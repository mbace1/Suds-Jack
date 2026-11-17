// sludge.js — SLUDGE CUBE, 1.x's zoner (v40): a slow lime cube that tips
// itself across the floor, comes to 7 from you and wanders there, pouring a
// trail of poison behind it. It never shoots; touching it hurts (the core's
// contact, `contact: true`), and so does standing where it has just been.
//
// 1.x js/enemy.js at v268: the flop 1494-1566, the zoner's want 2326-2330,
// the trail points 2337-2350, the poison clock 2351-2356, the constructor's
// flop state 1210-1221; main.js: the zones 1591-1600, 10459-10464,
// 11302-11313, the ribbon's expiry 1643-1648; crowd.js:110-116. Spec:
// docs/port-1x/species-b.md §2.13, §7. Every number is tuning/species/sludge.js.
//
// Per step, in 1.x's order:
//   WANT    unit(hero − body), or none within 7 of the hero (the distance as
//           the body stands after this step's swarm forces)
//   FLOP    REST counts down; when it runs out a direction is picked (snapped
//           to a cardinal, with 1.x's 70/20/10 roll), turned back from a wall
//           the coming stride would cross, and the cube tips over its leading
//           bottom edge: its position is WRITTEN each step as origin + dir ×
//           (L + D·cos ang), so this step's swarm forces are lost (1.x trap
//           15) — but the crowd solver moves the tumble's origin by its
//           UNCLAMPED nudge (1.x crowd.js:110 adds `ax` to `_flopX0` before it
//           clamps the position), and so does a PUSH dash's knock: both reach
//           the step as g.nudgedX/Z. The arena clamp does not move the origin
//           (1.x had none for a cube). It lands one stride on, squashes, rests.
//   TRAIL   a point every 0.35 u it has moved (the look's poured droplets);
//           points older than 3 s are dropped (180 steps, as 1.x's frames)
//   POISON  every 0.5 s a zone where it stands: api.fire.hazard, lethal for
//           its 2.5 s, which outlives the cube that poured it. 1.x dropped it
//           after the crowd had run (main.js:10426 then 10459); a species
//           step has no later hook, so it drops where this step left the cube:
//           one step of crowd nudge (≤ ~0.1 u) or PUSH knock (≤ ~0.25 u) short
// It takes no special hits (1.x hit() is the generic one) and has no death
// of its own: the core's kill, angular chunks and puddle; not a biter.
//
// The look reads g.s: `flop` (tumbling?), `dx`/`dz` (the direction), `x0`/`z0`
// (the tumble's origin), `trail` ([{x, z, t}], t on g.t's clock).
const DEG = Math.PI / 180;

export default {
  init(w, g, api) {
    const S = api.S(g), C = S.cardinals;
    // 1.x's constructor order (enemy.js:1211-1214): the first rest, then a
    // random starting direction
    g.s.rest = w.rng.range(0, S.flop.firstRest);
    const c = C[Math.floor(w.rng.next() * C.length)];
    g.s.dx = c[0]; g.s.dz = c[1];
    g.faceX = c[0]; g.faceZ = c[1];
    g.s.flop = false;
    g.s.ft = 0; g.s.dur = 0;
    g.s.x0 = g.x; g.s.z0 = g.z;
    g.s.poisonT = S.poison.every;               // the clock starts full (enemy.js:1218)
    g.s.trail = [];
  },

  step(w, g, dt, api) {
    const S = api.S(g), F = S.flop, s = g.s, h = w.hero;

    // The crowd solver (and a knock) moved it after last step's write; 1.x
    // moved a live tumble's origin with every nudge, unclamped (crowd.js:110),
    // so a nudge or a shove into the wall still carries the whole tumble and
    // the core's walls hold the body in. This step's swarm forces are left
    // out: the write below overwrites them, as 1.x's did.
    if (s.flop) { s.x0 += g.nudgedX; s.z0 += g.nudgedZ; }

    // WANT (enemy.js:2316-2330)
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || S.distFloor;
    let wantX = ddx / dist, wantZ = ddz / dist;
    if (dist <= S.hold) { wantX = 0; wantZ = 0; }

    // FLOP (enemy.js:1494-1566)
    const L = F.halfEdge * g.r, D = L * Math.SQRT2, stride = 2 * L;
    const cycle = stride / Math.max(api.speed(g), F.minSpeed);
    let moving = s.flop;
    if (!s.flop) {
      s.rest -= dt;
      if (s.rest <= 0) {
        const C = S.cardinals, rnd = () => C[Math.floor(w.rng.next() * C.length)];
        let dx, dz;
        if (wantX !== 0 || wantZ !== 0) {
          const tx = Math.abs(wantX) > Math.abs(wantZ) ? Math.sign(wantX) : 0;
          const tz = tx ? 0 : Math.sign(wantZ);
          const r = w.rng.next();
          if (r < S.pick.toward) { dx = tx; dz = tz; }
          else if (r < S.pick.keep) { dx = s.dx; dz = s.dz; }
          else [dx, dz] = rnd();
        } else if (w.rng.next() < S.idleKeep) { dx = s.dx; dz = s.dz; }
        else [dx, dz] = rnd();
        // turn back from a wall the stride would cross: the arena less the
        // CFG radius, per axis, x first (enemy.js:1527-1531)
        const bx = w.hx - S.radius, bz = w.hz - S.radius;
        if (Math.abs(g.x + dx * stride) > bx) { dx = -(Math.sign(g.x) || 1); dz = 0; }
        else if (Math.abs(g.z + dz * stride) > bz) { dx = 0; dz = -(Math.sign(g.z) || 1); }
        s.dx = dx; s.dz = dz;
        g.faceX = dx; g.faceZ = dz;
        s.x0 = g.x; s.z0 = g.z;
        s.ft = 0;
        s.dur = Math.min(F.timeMax, cycle * F.shareOfCycle);
        s.flop = moving = true;
      }
    }
    if (moving) {
      s.ft += dt;
      const p = Math.min(1, s.ft / s.dur);
      const ang = (F.arcStartDeg + (F.arcEndDeg - F.arcStartDeg) * p) * DEG;   // linear: a tipping body does not ease
      const disp = L + D * Math.cos(ang);
      g.x = s.x0 + s.dx * disp;
      g.z = s.z0 + s.dz * disp;
      if (p >= 1) {
        // land flat, snapped one stride on, and rest out the cycle
        g.x = s.x0 + s.dx * stride;
        g.z = s.z0 + s.dz * stride;
        g.sqV -= F.landSquish;
        s.flop = false;
        s.rest = Math.max(F.minRest, cycle - s.dur);
      }
    }

    // TRAIL (enemy.js:2343-2350; the expiry is the ribbon's, main.js:1645-1648).
    // A point is stamped with the clock as it stood before this step (1.x's
    // _wobbleT advances after the push, enemy.js:2725) and aged against the
    // clock after it, so it lives 1.x's 180 frames.
    const tr = s.trail, lp = tr[tr.length - 1], TR = S.trail;
    if (!lp || Math.hypot(g.x - lp.x, g.z - lp.z) >= TR.spacing) {
      tr.push({ x: g.x, z: g.z, t: g.t - dt });
      if (tr.length > TR.max) tr.shift();
    }
    while (tr.length && g.t - tr[0].t > TR.expire) tr.shift();

    // POISON (enemy.js:2351-2356, main.js:10459-10464): the zone is lethal for
    // its whole 2.0 life, so it lives 1.x's lethal window, and reaches the
    // hero's centre at 1.x's radius + PLAYER_RADIUS
    if ((s.poisonT -= dt) <= 0) {
      s.poisonT = S.poison.every;
      const P = S.poison;
      api.fire.hazard(w, g.x, g.z, {
        r: P.radius * g.r + api.T.hero.radius, life: P.life - P.harmlessBelow,
        src: g.kind, color: P.color, kind: P.kind,
      });
    }
  },
};
