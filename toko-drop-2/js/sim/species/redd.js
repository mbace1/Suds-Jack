// redd.js — REDD CUBE, 1.x's flanker (v40): a red rounded cube that comes
// at you from ITS side, tumbling over its own leading bottom edge one face at
// a time (v84), straightening as it closes — and when it dies, it breaks into
// a brood of REDD MINIs, 4 to 8 by the wave, that rush you. Melee only, 3 HP.
//
// 1.x js/enemy.js at v268: the flank side 701, the cube state 1209-1214,
// `_flopMove` 1486-1566 (called with exact = false), the heading 2297-2309
// and 2331, destroy's brood 3062-3066, the death pop 2967-3000; main.js's
// child spawn 10586-10620; the crowd's tumble nudge crowd.js:107-116. No
// dedicated spec: 1.x's source is the spec. Every number is tuning/species/redd.js.
//
// The flop, from L = 0.9·r (the cube's half-extent, r × the elite's 1.2) and
// D = L√2 (centre to the pivot edge):
//   cycle = 2L / spd;  flop = min(0.30, 0.65·cycle);  rest = max(0.02, cycle − flop)
// so its AVERAGE ground speed is exactly spd — one face (2L, 1.35 u) a cycle:
// at 1.9 u/s a 0.30 s tip and a 0.41 s rest.
// Per step, in 1.x's order (enemy.js:2297-2331), from where the swarm forces
// left it:
//   HEADING the unit bearing to you, turned flankSign·0.9 rad while farther
//           than 5 from you and flankSign·0.3 inside it (the side, ±1, drawn
//           once at spawn). Read every step; only a rest running out uses it.
//   REST    the rest counts down; the swarm forces that moved it stick. When
//           it runs out, the same step, it picks a CARDINAL: the one of the
//           heading's larger axis 70%, its last one 20%, any of the four 10%
//           (on top of you, with no heading: its last 70%, else any). One
//           that would carry the centre past the wall (at the CFG radius, 1.x
//           enemy.js:1495 — not an elite's grown one) is turned back along
//           that axis. The flop starts where it stands.
//   FLOP    p = t / flop, linear ("a tipping body doesn't ease"); the pivot
//           angle sweeps 135° → 45°, the centre sits L + D·cos(ang) along the
//           heading from where the flop began (0 → 2L) and D·sin(ang) above
//           the floor. WRITTEN from that origin, so a flop step's swarm forces
//           are lost (1.x); what moved it from outside at the end of its last
//           step — the crowd solver, a PUSH dash's knock — moves the origin
//           with it, by the unclamped nudge (g.nudgedX/Z: 1.x crowd.js:110
//           adds `ax` to `_flopX0` before it clamps). At p = 1 it lands: one
//           face on, a −0.32 kick to the squash spring, the rest of the cycle.
// The flanking shows as a dog-leg: far off, the heading's larger axis is
// often the one ACROSS your line, so it comes round you a face at a time and
// turns in once it is close.
//
// On its death (the core's kill, then this), whatever killed it — a bullet,
// a dash, the environment (1.x destroy() sets the brood for every death):
//   BROOD   n = min(8, 4 + 2·round((1 / max(iM, 0.1) − 1) / 0.09)) REDD MINIs
//           from its frozen intervalMult — 4 at wave 1, 6 at waves 2-3, 8 from
//           wave 4 — mini j at (j/n)·2π + U·0.3 rad, 1.2 + U·1.5 u out, on
//           the parent's speedMult (× swift, which 1.x baked into _speedMult)
//           and intervalMult; ordinary bodies (no variant, no affix, no ping),
//           up to the director's child valve (the live cap × 2). They come out
//           when the 0.28 s death pop ends, as 1.x's did: spawned now, they are
//           handed back to the core's `appear` with that long left, so until
//           then they can neither hurt, be hit, nor move.
// It is not otherwise special: no gun, no special hits (3 hp, every bullet
// lands), the core's contact (r + 0.5), the core's death (big at 0.75: a
// shockwave; angular chunks; a puddle); not a HARDCADE biter.
//
// Where the contract cannot say it (docs/SIM_CONTRACT.md has no delayed
// spawn): 1.x built the brood, and counted the valve, at the END of the pop;
// here both happen at the kill, so the waiting brood counts as alive for
// those 0.28 s (SPLITTA's port does the same). Its parent's big-death
// shockwave, which the core runs after onKill, is cancelled on the brood in
// advance (1.x's never felt it, main.js:4518-4529); another big death during
// the pop would still rattle it, where 1.x had nothing there to rattle.
//
// The flop is shared with REDD MINI (sim/species/reddmini.js), which is the
// same cube on the same path with its heading straight at you.

// the four headings, in 1.x's order (enemy.js:1211, 1502): an index drawn as
// floor(U·4) picks the same one 1.x's `dirs[floor(U·4)]` did
const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// the shared cube state (1.x enemy.js:1209-1214), in 1.x's draw order
export function cubeInit(w, g, api) {
  const F = api.S(g).flop, s = g.s;
  s.flopping = false;                                         // 1.x `_flopActive`
  s.tumble = false;                                           // flopping at any point this step: the look draws the tumble
  s.rest = w.rng.range(F.firstRest[0], F.firstRest[1]);       // 1.x `_flopRest = rand·0.25`
  [s.dirX, s.dirZ] = CARDINALS[w.rng.int(0, 3)];              // 1.x `_flopDir`
  s.x0 = g.x; s.z0 = g.z;                                     // 1.x `_flopX0/_flopZ0`: where the flop began
  s.t = 0; s.dur = 0; s.p = 0;
  s.lift = F.halfExtent * g.r;                                // the centre's height: L at rest
}

// what moved it from outside at the end of its last step (the crowd solver's
// nudge, a PUSH dash's knock — g.nudgedX/Z, unclamped, as 1.x's crowd wrote
// it, crowd.js:107-116) carries a tumble's origin with it; nothing else does:
// a flop step's own swarm forces are overwritten by the flop
export function cubeCarry(g) {
  const s = g.s;
  if (s.flopping) { s.x0 += g.nudgedX; s.z0 += g.nudgedZ; }
  s.tumble = s.flopping;
}

// 1.x _flopMove with exact = false (enemy.js:1494-1566): (wantX, wantZ) is
// the heading it wants, any length; it is snapped to a cardinal when a rest
// runs out
export function cubeFlop(w, g, dt, api, wantX, wantZ) {
  const S = api.S(g), F = S.flop, s = g.s;
  const L = F.halfExtent * g.r, D = L * Math.SQRT2, stride = 2 * L;
  const cycle = stride / Math.max(api.speed(g), F.minSpeed);
  if (!s.flopping) {
    s.rest -= dt;
    if (s.rest > 0) return;
    // the heading (1.x enemy.js:1508-1522)
    let dx, dz;
    if (wantX !== 0 || wantZ !== 0) {
      const [tx, tz] = Math.abs(wantX) > Math.abs(wantZ) ? [Math.sign(wantX), 0] : [0, Math.sign(wantZ)];
      const r = w.rng.next();
      if (r < F.toward) { dx = tx; dz = tz; }
      else if (r < F.keep) { dx = s.dirX; dz = s.dirZ; }
      else [dx, dz] = CARDINALS[w.rng.int(0, 3)];
    } else if (w.rng.next() < F.idleKeep) { dx = s.dirX; dz = s.dirZ; }
    else [dx, dz] = CARDINALS[w.rng.int(0, 3)];
    // turn back from a wall the next stride would cross (1.x enemy.js:1523-1531;
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

// how many minis a REDD of this intervalMult breaks into (1.x enemy.js:3064-3065)
export function broodSize(C, intervalMult) {
  const tier = Math.round((1 / Math.max(intervalMult, C.tierFloor) - 1) / C.tierStep);
  return Math.min(C.max, C.base + tier * C.perTier);
}

export default {
  init(w, g, api) {
    const S = api.S(g);
    g.s.flankSign = w.rng.next() < S.flank.side ? 1 : -1;     // 1.x `_flankSign` (enemy.js:701)
    cubeInit(w, g, api);
  },

  step(w, g, dt, api) {
    const S = api.S(g), K = S.flank, h = w.hero;
    cubeCarry(g);
    // the flanker's heading (1.x enemy.js:2303-2309), from where the forces left it
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || S.distFloor;
    const ux = ddx / dist, uz = ddz / dist;
    const ang = g.s.flankSign * (dist > K.far ? K.wide : K.close), c = Math.cos(ang), sn = Math.sin(ang);
    cubeFlop(w, g, dt, api, ux * c - uz * sn, ux * sn + uz * c);
  },

  onKill(w, g, api) {
    const C = api.S(g).children;
    // every place is drawn first, as 1.x's toSpawn list was, then they come
    // out until the child valve closes (1.x main.js:10587-10620)
    const n = broodSize(C, g.intervalMult), pts = [];
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU + w.rng.next() * C.jitter;
      const d = C.dist[0] + w.rng.next() * (C.dist[1] - C.dist[0]);
      pts.push([g.x + Math.cos(a) * d, g.z + Math.sin(a) * d]);
    }
    const out = Math.min(n, api.childrenAllowed(w));
    const speedMult = g.speedMult * (g.affix === 'swift' ? api.T.variants.swiftSpeed : 1);
    const wait = api.T.blob.death, appear = api.T.gel.appear, X = api.T.death;
    for (let j = 0; j < out; j++) {
      const c = api.spawn(w, C.kind, pts[j][0], pts[j][1], { child: true, speedMult, intervalMult: g.intervalMult });
      // 2.0's walls hold every body; 1.x's child could stand up to 2.7 outside one
      api.clamp(w, c);
      // not yet: the core's `appear`, with the death pop's 0.28 s left of it
      c.state = 'appear'; c.t = appear - wait;
      // 1.x's big-death shockwave squashed only the bodies alive at the kill,
      // and the brood was built 0.28 s later ("newborn minnows must not be
      // vaporized by the shockwave that birthed them", main.js:4518-4529). The
      // core's shock runs after this hook and would kick these too, on exactly
      // this test, so the kick is cancelled here in advance (exactly, to 0).
      if (g.r >= X.big && Math.hypot(c.x - g.x, c.z - g.z) <= X.shockRadius) c.sqV += X.shockSquash;
    }
  },
};
