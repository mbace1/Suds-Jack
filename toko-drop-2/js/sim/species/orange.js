// orange.js — ORANGE CUBE, 1.x's position-and-shoot cube (v40): an orange
// rounded cube that tumbles FREELY (diagonals allowed, v43) to a point near
// you, and on its own clock lays a wall of 6 to 12 parallel bullets on the
// compass heading nearest you — a line too dense to thread, so you go round
// its ends.
//
// 1.x js/enemy.js at v268: the state 1209-1214 and 1222-1227, `_flopMove`
// 1486-1566 (called with exact = true), `_orangeTarget` 1568-1579, the
// movement-and-fire branch 2361-2397, the strobe 2657-2658; the crowd's
// tumble nudge crowd.js:107-116. Spec: docs/port-1x/species-b.md §2.13, §6;
// bullets-graze.md §5.2-§5.3. Every number is tuning/species/orange.js.
//
// Per step, in 1.x's order (enemy.js:2361-2397), from where the swarm forces
// left it (ex, ez — 1.x's position at the top of its update):
//   TARGET  picked on its first step (1.x needs the hero to pick it): a point
//           at a uniform angle, 6–9 from you, clamped to ±10 on both axes.
//           Its chase clock counts. RESTING within 2.6 of it, or after more
//           than 5 s of chasing, it picks a new one — and that step it does
//           not flop at all, so its rest does not count down either (1.x
//           skips `_flopMove` on that frame).
//   FLOP    otherwise 1.x's edge-pivot flop toward the target. A rest counts
//           down (the swarm forces that moved it stick); when it runs out, the
//           same step, the heading is the raw unit vector to the target (not
//           a cardinal), turned back along an axis if the next stride would
//           carry the centre past the wall (at the CFG radius, 1.x). Then a
//           rigid tip, p = t / flop linear, the centre at L + D·cos(ang) along
//           the heading from where the flop began and D·sin(ang) up, ang
//           135° → 45°; WRITTEN from that origin, so a flop step's swarm
//           forces are lost (1.x, species-b §10.4 trap 15); what moved it from
//           outside since its last step (the crowd solver, a knock, the wall)
//           moves the origin with it (1.x crowd.js:110). At p = 1 it lands: one
//           face on, a −0.32 kick to the squash spring, the rest of the cycle.
//           cycle = 2L / spd, flop = min(0.30, 0.65·cycle): its average ground
//           speed is exactly spd.
//   WALL    its own clock counts down every step, moving or not (first wall
//           1.5–2.5 s after it spawns, then 3.0–4.5 s apart, NOT scaled by the
//           wave). At ≤ 0: the bearing to you snapped to the nearest of 8
//           compass headings (diagonals 0.707, as 1.x wrote them), and N
//           bullets along it from a line through (ex, ez) square to it, 4 u
//           wide; N = min(12, 6 + 2·⌊(1 − intervalMult) / 0.09⌋), fixed at
//           spawn. Then a fresh clock and a fresh target.
//   TELL    g.tell > 0 while its clock is under 0.6 s (read after the wall, as
//           1.x's emissive block read it): the look strobes 0x442200.
// It is not otherwise special: no special hits, no death of its own (the
// core's kill: big at 0.75, so a shockwave; angular chunks; a puddle), no
// contact damage in classic, HARDCADE's AIMED bite.

// the four headings, in 1.x's order (enemy.js:1211, 1502)
const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// 1.x's eight compass headings, in its order (enemy.js:2377-2380): the first
// strictly best dot product wins, so a tie goes to the earlier one
const compass = (d) => [[1, 0], [-1, 0], [0, 1], [0, -1], [d, d], [-d, d], [d, -d], [-d, -d]];

// 1.x _orangeTarget (enemy.js:1572-1579): angle first, then radius
function pickTarget(w, g, S) {
  const R = S.target, h = w.hero, s = g.s;
  const ang = w.rng.range(0, Math.PI * 2);
  const rad = w.rng.range(R.ring[0], R.ring[1]);
  s.tx = clamp(h.x + Math.cos(ang) * rad, -R.box, R.box);
  s.tz = clamp(h.z + Math.sin(ang) * rad, -R.box, R.box);
  s.hasTarget = true;
  s.moveT = 0;
}

// 1.x _flopMove with exact = true (enemy.js:1494-1566)
function flop(w, g, dt, api, wantX, wantZ) {
  const S = api.S(g), F = S.flop, s = g.s;
  const L = F.halfExtent * g.r, D = L * Math.SQRT2, stride = 2 * L;
  const cycle = stride / Math.max(api.speed(g), F.minSpeed);
  if (!s.flopping) {
    s.rest -= dt;
    if (s.rest > 0) return;
    let dx, dz;
    if (wantX !== 0 || wantZ !== 0) {
      const l = Math.hypot(wantX, wantZ);
      dx = wantX / l; dz = wantZ / l;
    } else if (w.rng.next() < F.keep) { dx = s.dirX; dz = s.dirZ; }
    else [dx, dz] = CARDINALS[w.rng.int(0, 3)];
    // turn back from a wall the next stride would cross (1.x enemy.js:1527-1531;
    // its bounds are the CFG radius in from the walls, not the elite's)
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

// the wall (1.x enemy.js:2375-2391), from where it stood at the top of its step
function wall(w, g, api, ex, ez) {
  const S = api.S(g), W = S.wall, h = w.hero, dirs = compass(W.diag);
  const adx = h.x - ex, adz = h.z - ez, al = Math.hypot(adx, adz) || 1;
  let best = 0, bestDot = -Infinity;
  for (let k = 0; k < dirs.length; k++) {
    const dot = dirs[k][0] * adx / al + dirs[k][1] * adz / al;
    if (dot > bestDot) { bestDot = dot; best = k; }
  }
  const [fx, fz] = dirs[best], perpX = -fz, perpZ = fx, n = g.s.shots;
  // 1.x scales the raw heading by the bullet speed (bullet.js:107): a diagonal
  // flies at 7 × |(0.707, 0.707)|
  const angle = Math.atan2(fz, fx), opts = { color: S.bulletColor, src: g.kind, speedMult: Math.hypot(fx, fz) * W.bulletSpeedMult };
  for (let s = 0; s < n; s++) {
    const t = (s / (n - 1) - 0.5) * W.width;
    api.fire.emit(w, ex + perpX * t, ez + perpZ * t, angle, opts);
  }
  w.events.push({ type: 'gelShot', x: ex, z: ez, kind: g.kind, id: g.id, angle, n });
}

export default {
  init(w, g, api) {
    const S = api.S(g), F = S.flop, W = S.wall, s = g.s;
    // the shared cube state (1.x enemy.js:1209-1214), in 1.x's draw order
    s.flopping = false;                                         // 1.x `_flopActive`
    s.tumble = false;                                           // flopping at any point this step: the look draws the tumble
    s.rest = w.rng.range(F.firstRest[0], F.firstRest[1]);       // 1.x `_flopRest = rand·0.25`
    [s.dirX, s.dirZ] = CARDINALS[w.rng.int(0, 3)];              // 1.x `_flopDir`
    s.x0 = g.x; s.z0 = g.z;                                     // 1.x `_flopX0/_flopZ0`
    s.t = 0; s.dur = 0; s.p = 0;
    s.lift = F.halfExtent * g.r;                                // the centre's height: L at rest
    // its own (1.x enemy.js:1222-1227)
    s.hasTarget = false; s.tx = 0; s.tz = 0;                    // 1.x `_target = null`: picked on the first step
    s.moveT = 0;                                                // 1.x `_moveT`
    const iM = g.intervalMult;
    const tier = Math.floor(iM > 0 ? (1 - iM) / W.tierStep : 0);
    s.shots = Math.min(W.shotsMax, W.shots + tier * W.shotsPerTier);   // 1.x `_totalShots`
    s.fireT = w.rng.range(W.firstShot[0], W.firstShot[1]);     // 1.x `_fireT = 1.5 + rand`
    s.lastX = g.x; s.lastZ = g.z;                               // where its own step last put it
  },

  step(w, g, dt, api) {
    const S = api.S(g), R = S.target, W = S.wall, s = g.s;
    // what moved it from outside since its own step last placed it (the crowd
    // solver, a knock, the arena wall) carries a tumble's origin with it;
    // g.px is from before this step's swarm forces, which a flop overwrites
    if (s.flopping) { s.x0 += g.px - s.lastX; s.z0 += g.pz - s.lastZ; }
    s.tumble = s.flopping;
    const ex = g.x, ez = g.z;

    // where it goes (1.x enemy.js:2363-2372)
    if (!s.hasTarget) pickTarget(w, g, S);
    s.moveT += dt;
    const tdx = s.tx - ex, tdz = s.tz - ez, td = Math.hypot(tdx, tdz);
    if (!s.flopping && (td < R.arrive || s.moveT > R.giveUp)) pickTarget(w, g, S);
    else flop(w, g, dt, api, tdx / (td || 1), tdz / (td || 1));

    // the wall, on its own clock (1.x enemy.js:2373-2395)
    s.fireT -= dt;
    if (s.fireT <= 0) {
      wall(w, g, api, ex, ez);
      s.fireT = w.rng.range(W.cadence[0], W.cadence[1]);
      pickTarget(w, g, S);
    }

    // the strobe the look draws, as 1.x's emissive block read it: after the
    // wall (1.x enemy.js:2657); its progress through the last 0.6 s, 0..1
    g.tell = s.fireT < S.tellTime ? 1 - s.fireT / S.tellTime : 0;
    s.lastX = g.x; s.lastZ = g.z;
  },
};
