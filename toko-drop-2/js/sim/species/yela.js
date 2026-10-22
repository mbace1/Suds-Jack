// yela.js — YELA CUBE, 1.x's tumbling rusher (v84): a yellow rounded cube
// that comes straight at you by tipping over its own leading bottom edge, one
// face at a time, and leaves a fizzing slime trail. Melee only, 2 HP.
//
// 1.x js/enemy.js at v268: the flop state 1209-1216, `_flopMove` 1486-1566,
// the movement branch 2296-2336; the crowd's tumble nudge crowd.js:107-116;
// the slime main.js:10466-10471. Spec: docs/port-1x/species-a.md §2.3, §4.
// Every number is tuning/species/yela.js.
//
// The flop, from L = 0.9·r (the cube's half-extent, r × the elite's 1.2) and
// D = L√2 (centre to the pivot edge):
//   cycle = 2L / spd;  flop = min(0.30, 0.65·cycle);  rest = max(0.02, cycle − flop)
// so its AVERAGE ground speed is exactly spd — one face (2L, 1.26 u) a cycle.
// Per step (1.x's update, after the swarm forces have moved it):
//   REST   the rest counts down; the swarm forces that moved it stick. When it
//          runs out, the same step, it picks a heading: the cardinal of the
//          larger axis toward you 70%, its last heading 20%, any cardinal 10%;
//          one that would carry the centre past the wall (at the CFG radius,
//          1.x enemy.js:1495 — not an elite's grown one) is turned back along
//          that axis. The flop starts where it stands.
//   FLOP   p = t / flop, linear ("a tipping body doesn't ease"); the pivot
//          angle sweeps 135° → 45°, the centre sits L + D·cos(ang) along the
//          heading from where the flop began (0 → 2L) and D·sin(ang) above the
//          floor. The position is WRITTEN from that origin, so the swarm forces
//          of a flop step are lost (1.x, §2.3); what moved it from outside since
//          its last step — the crowd solver, a knock, the arena wall — moves the
//          origin with it (1.x crowd.js:110). At p = 1 it lands: snapped to
//          origin + 2L, a −0.32 kick to the squash spring, and the rest of the cycle.
//   SLIME  every 0.3 s on its own timer, moving or not, a splat where it stands
//          (cosmetic: the look draws it; g.s.slime keeps the last few).
// It is not otherwise special: no gun, no special hits, the core's death
// (angular chunks, puddle), the core's contact (r + 0.5); not a HARDCADE biter.

// the four headings, in 1.x's order (enemy.js:1211, 1502): an index drawn as
// floor(U·4) picks the same one 1.x's `dirs[floor(U·4)]` did
const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DEG = Math.PI / 180;

export default {
  init(w, g, api) {
    const F = api.S(g).flop, s = g.s;
    s.flopping = false;                                         // 1.x `_flopActive`
    s.tumble = false;                                           // flopping at any point this step: the look draws the tumble
    s.rest = w.rng.range(F.firstRest[0], F.firstRest[1]);       // 1.x `_flopRest = rand·0.25`
    [s.dirX, s.dirZ] = CARDINALS[w.rng.int(0, 3)];              // 1.x `_flopDir`
    s.x0 = g.x; s.z0 = g.z;                                     // 1.x `_flopX0/_flopZ0`: where the flop began
    s.t = 0; s.dur = 0; s.p = 0; s.lift = 0;
    s.slimeT = api.S(g).slime.interval;                         // 1.x `_trailTimer`
    s.slime = []; s.slimeN = 0;
    s.lastX = g.x; s.lastZ = g.z;                               // where its own step last put it
  },

  step(w, g, dt, api) {
    const S = api.S(g), F = S.flop, s = g.s, h = w.hero;
    // what moved it from outside since its own step last placed it (the crowd
    // solver, a knock, the arena wall): g.px is from before this step's swarm
    // forces, which a flop overwrites (1.x writes the flop from its origin)
    if (s.flopping) { s.x0 += g.px - s.lastX; s.z0 += g.pz - s.lastZ; }
    s.tumble = s.flopping;

    const L = F.halfExtent * g.r, D = L * Math.SQRT2, stride = 2 * L;
    const cycle = stride / Math.max(api.speed(g), F.minSpeed);
    let moving = true;
    if (!s.flopping) {
      s.rest -= dt;
      if (s.rest > 0) moving = false;
      else {
        // the heading (1.x enemy.js:1508-1531): toward you from where the forces left it
        const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || 0.001;
        const wantX = ddx / dist, wantZ = ddz / dist;
        let dx, dz;
        if (wantX !== 0 || wantZ !== 0) {
          const [tx, tz] = Math.abs(wantX) > Math.abs(wantZ) ? [Math.sign(wantX), 0] : [0, Math.sign(wantZ)];
          const r = w.rng.next();
          if (r < F.toward) { dx = tx; dz = tz; }
          else if (r < F.keep) { dx = s.dirX; dz = s.dirZ; }
          else [dx, dz] = CARDINALS[w.rng.int(0, 3)];
        } else if (w.rng.next() < F.idleKeep) { dx = s.dirX; dz = s.dirZ; }
        else [dx, dz] = CARDINALS[w.rng.int(0, 3)];
        // turn back from a wall the next stride would cross (1.x enemy.js:1527-1531).
        // 1.x measures the wall from the CFG radius (enemy.js:1495 `radius =
        // CFG[type].radius`), NOT the elite's `radius × rm` that its crowd clamp
        // uses — so an elite may aim its landing 0.14 u closer to the wall than
        // the core's wall (at g.r) lets it stand; the clamp then moves the flop's
        // origin back with it (above), and the landing is a whole face from there.
        const bx = w.hx - S.radius, bz = w.hz - S.radius;
        if (Math.abs(g.x + dx * stride) > bx) { dx = -(Math.sign(g.x) || 1); dz = 0; }
        else if (Math.abs(g.z + dz * stride) > bz) { dx = 0; dz = -(Math.sign(g.z) || 1); }
        s.dirX = dx; s.dirZ = dz;
        g.faceX = dx; g.faceZ = dz;
        s.x0 = g.x; s.z0 = g.z;
        s.t = 0;
        s.dur = Math.min(F.timeMax, cycle * F.shareOfCycle);
        s.flopping = s.tumble = true;
      }
    }
    if (moving) {
      // the tip (1.x enemy.js:1542-1553): a rigid pivot about the planted edge
      s.t += dt;
      s.p = Math.min(1, s.t / s.dur);
      const ang = (F.arcStartDeg + (F.arcEndDeg - F.arcStartDeg) * s.p) * DEG;
      const disp = L + D * Math.cos(ang);
      g.x = s.x0 + s.dirX * disp; g.z = s.z0 + s.dirZ * disp;
      s.lift = D * Math.sin(ang);
      if (s.p >= 1) {
        // the landing (1.x enemy.js:1555-1565): flat on the next face
        g.x = s.x0 + s.dirX * stride; g.z = s.z0 + s.dirZ * stride;
        s.lift = L;
        g.sqV += F.landSquish;
        s.flopping = false;
        s.rest = Math.max(F.restMin, cycle - s.dur);
      }
    }

    // the slime (1.x enemy.js:2333-2336; laid by main.js:10466-10471)
    s.slimeT -= dt;
    if (s.slimeT <= 0) {
      s.slimeT = S.slime.interval;
      s.slime.push({ n: s.slimeN++, x: g.x, z: g.z, t: w.time });
      if (s.slime.length > S.slime.keep) s.slime.shift();
      w.events.push({ type: 'slime', id: g.id, x: g.x, z: g.z, r: S.slime.radius });
    }
    s.lastX = g.x; s.lastZ = g.z;
  },
};
