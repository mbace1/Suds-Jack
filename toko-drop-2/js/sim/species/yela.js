// yela.js — YELA CUBE, 1.x's tumbling rusher (v84): a yellow rounded cube
// that comes straight at you by tipping over its own leading bottom edge, one
// face at a time, and leaves a fizzing slime trail. Melee only, 2 HP. Since
// v67 it tumbles on the diagonals too, which 1.x's never did (owner,
// 2026-10-31, from the YELA sketch in art-ref/: "diagonal movement").
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
//          runs out, the same step, it picks a heading of the EIGHT (v67; 1.x
//          had the four cardinals and took the one of the larger axis): the
//          one nearest the line to you 70%, its last heading 20%, any of the
//          eight 10%. One that would carry the centre past the wall (at the CFG
//          radius, 1.x enemy.js:1495 — not an elite's grown one) is turned
//          back: a cardinal along that axis (1.x), a diagonal on the axis it
//          would cross, as a ball off a cushion. The flop starts where it stands.
//   FLOP   p = t / flop, linear ("a tipping body doesn't ease"); the pivot
//          angle sweeps 135° → 45°, the centre sits L + D·cos(ang) along the
//          heading from where the flop began (0 → 2L) and D·sin(ang) above the
//          floor. The position is WRITTEN from that origin, so the swarm forces
//          of a flop step are lost (1.x, §2.3); what moved it from outside since
//          its last step — the crowd solver, a knock, the arena wall — moves the
//          origin with it (1.x crowd.js:110). At p = 1 it lands: snapped to
//          origin + 2L, a −0.32 kick to the squash spring, and the rest of the cycle.
//   DIAG   a diagonal flop (v67) is a half roll over its corner about the
//          ground axis across its line, corner, edge, corner: a cube turned
//          180° about a face's diagonal is itself again, so it lands on a face.
//          The centre goes 2L along each axis, linear in time, at the height
//          that keeps its lowest corner on the floor, L·(|cos φ| + √2·|sin φ|),
//          φ = π·p. Its cycle is its longer run at the same speed, 2L√2 / spd,
//          and its flop's cap `diagTime` × 0.30 s, a half turn where a cardinal
//          makes a quarter.
//   SLIME  every 0.3 s on its own timer, moving or not, a splat where it stands
//          (cosmetic: the look draws it; g.s.slime keeps the last few).
// It is not otherwise special: no gun, no special hits, the core's death
// (angular chunks, puddle), the core's contact (r + 0.5); not a HARDCADE biter.

// the eight headings: 1.x's four in its order (enemy.js:1211, 1502), then the diagonals (v67)
const HEADINGS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
const DEG = Math.PI / 180;
// the heading of the eight nearest a direction (+ 0: never a −0)
const nearest = (x, z) => { const a = Math.round(Math.atan2(z, x) / (Math.PI / 4)) * (Math.PI / 4); return [Math.round(Math.cos(a)) + 0, Math.round(Math.sin(a)) + 0]; };
const diagonal = (dx, dz) => dx !== 0 && dz !== 0;

export default {
  init(w, g, api) {
    const F = api.S(g).flop, s = g.s;
    s.flopping = false;                                         // 1.x `_flopActive`
    s.tumble = false;                                           // flopping at any point this step: the look draws the tumble
    s.rest = w.rng.range(F.firstRest[0], F.firstRest[1]);       // 1.x `_flopRest = rand·0.25`
    [s.dirX, s.dirZ] = HEADINGS[w.rng.int(0, 7)];               // 1.x `_flopDir` (one of four in 1.x)
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
    // a cycle covers a face on a cardinal, a face's diagonal on a diagonal, at the same speed
    const cycleOf = (dx, dz) => (diagonal(dx, dz) ? stride * Math.SQRT2 : stride) / Math.max(api.speed(g), F.minSpeed);
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
          const [tx, tz] = nearest(wantX, wantZ);
          const r = w.rng.next();
          if (r < F.toward) { dx = tx; dz = tz; }
          else if (r < F.keep) { dx = s.dirX; dz = s.dirZ; }
          else [dx, dz] = HEADINGS[w.rng.int(0, 7)];
        } else if (w.rng.next() < F.idleKeep) { dx = s.dirX; dz = s.dirZ; }
        else [dx, dz] = HEADINGS[w.rng.int(0, 7)];
        // turn back from a wall the next stride would cross (1.x enemy.js:1527-1531).
        // 1.x measures the wall from the CFG radius (enemy.js:1495 `radius =
        // CFG[type].radius`), NOT the elite's `radius × rm` that its crowd clamp
        // uses — so an elite may aim its landing 0.14 u closer to the wall than
        // the core's wall (at g.r) lets it stand; the clamp then moves the flop's
        // origin back with it (above), and the landing is a whole face from there.
        const bx = w.hx - S.radius, bz = w.hz - S.radius;
        if (diagonal(dx, dz)) {
          // a diagonal turns back on the axis it would cross, either or both (v67)
          if (Math.abs(g.x + dx * stride) > bx) dx = -(Math.sign(g.x) || 1);
          if (Math.abs(g.z + dz * stride) > bz) dz = -(Math.sign(g.z) || 1);
        } else if (Math.abs(g.x + dx * stride) > bx) { dx = -(Math.sign(g.x) || 1); dz = 0; }
        else if (Math.abs(g.z + dz * stride) > bz) { dx = 0; dz = -(Math.sign(g.z) || 1); }
        s.dirX = dx; s.dirZ = dz;
        g.faceX = dx; g.faceZ = dz;
        s.x0 = g.x; s.z0 = g.z;
        s.t = 0;
        s.dur = Math.min(F.timeMax * (diagonal(dx, dz) ? F.diagTime : 1), cycleOf(dx, dz) * F.shareOfCycle);
        s.flopping = s.tumble = true;
      }
    }
    if (moving) {
      // the tip (1.x enemy.js:1542-1553): a rigid pivot about the planted edge
      s.t += dt;
      s.p = Math.min(1, s.t / s.dur);
      if (diagonal(s.dirX, s.dirZ)) {
        // the half roll over its corner (v67): along each axis linear in time, its lowest corner on the floor
        const along = stride * s.p, phi = Math.PI * s.p;
        g.x = s.x0 + s.dirX * along; g.z = s.z0 + s.dirZ * along;
        s.lift = L * (Math.abs(Math.cos(phi)) + Math.SQRT2 * Math.abs(Math.sin(phi)));
      } else {
        const ang = (F.arcStartDeg + (F.arcEndDeg - F.arcStartDeg) * s.p) * DEG;
        const disp = L + D * Math.cos(ang);
        g.x = s.x0 + s.dirX * disp; g.z = s.z0 + s.dirZ * disp;
        s.lift = D * Math.sin(ang);
      }
      if (s.p >= 1) {
        // the landing (1.x enemy.js:1555-1565): flat on the next face
        g.x = s.x0 + s.dirX * stride; g.z = s.z0 + s.dirZ * stride;
        s.lift = L;
        g.sqV += F.landSquish;
        s.flopping = false;
        s.rest = Math.max(F.restMin, cycleOf(s.dirX, s.dirZ) - s.dur);
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
