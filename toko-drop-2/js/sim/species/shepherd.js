// shepherd.js — SHEPHERD, 1.x's conductor (v203): "the first enemy DESIGNED
// for the swarm game. One mechanic: it HERDS." A slim teal spire that never
// attacks and never closes: it holds a pocket nine units off you and circles
// there, while every other body inside its 7.5 ring is dragged toward you, so
// the school knots up round you until you kill it. Kill it and the knot
// loosens. Fragile (3 hp, r 0.6) and slow, so it is killable the moment the
// ring is read.
//
// 1.x js/enemy.js at v268: the type 557-560, SHEPHERD_RADIUS 569-571, the CFG
// row 622-624, the movement branch 1769-1791, the squash 2726-2737, 2779, the
// death 3009; main.js: the herd 10233-10260. Specs: docs/port-1x/species-a.md
// §2.3 (the herd is force 1 of the swarm forces). Every number is
// tuning/species/shepherd.js.
//
// What is the SHEPHERD's own (this file):
//   THE POCKET  per step, from where the swarm forces left it (its HERDER
//               share: dodge 0.6, current 0.3, weave 0.2 — the core's), with
//               d its distance to you: d > 10 closes in at its speed; d < 8
//               backs straight off at × 1.15; between, it circles you at
//               × 0.8, always along (−dz, dx)/d — the same way round. Speed
//               is api.speed (CFG 1.6 × the wave's speedMult × SWIFT × a
//               SIREN's surge). The core integrates the velocity with any
//               knock (a PUSH dash's shove) on top, and holds it inside the
//               walls.
//   THE SPIN    2.2 rad/s about y, for the look only (s.spin).
//   THE SPRING  1.x's non-blob squash spring (0.18 / 0.90 per frame, after
//               the movement). The core runs the blob spring on a `custom`
//               body before this step, so the step takes it back — exactly:
//               the core's spring is linear in the kicks it was handed — and
//               runs 1.x's in its place, as OMEGA's and TORO's ports do.
// What is NOT here, and why:
//   THE HERD    is applied to the OTHER bodies by the core's swarm forces
//               (sim/crowd.js, by kind, reading `herd` from the tuning), as
//               1.x's main.js applied it — never to the SHEPHERD itself.
//   THE RING    is the look's (render/looks/shepherd.js); its outer edge is
//               the same `herd.radius`, and it goes out with the body.
// Hits are ordinary (the 0.6 circle, 0.72 elite), touching it does not hurt,
// it is not a HARDCADE biter, and its death is the core's (smooth goo, the
// cube's death voice). It is never a boss in classic, so 1.x's boss enrage
// (× 1.45, enemy.js:1688-1700) is not ported.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g) {
    const s = g.s;
    s.mode = 'close';                      // which arm of the pocket the last step took: 'close' | 'back' | 'circle'
    s.spin = 0;                            // 1.x mesh.rotation.y: the cone starts unturned (enemy.js:783-787, 1000)
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;   // the squash spring as this step last left it
  },

  step(w, g, dt, api) {
    const S = api.S(g), H = S.hold, s = g.s, h = w.hero;
    const sqV = takeBackCoreSpring(w, g, S, api);

    // the pocket (enemy.js:1774-1784), from where this step began (ex/ez, enemy.js:1680-1682)
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || S.distFloor;
    const ux = ddx / dist, uz = ddz / dist, spd = api.speed(g);
    if (dist > H.distance + H.band) {              // too far to herd — close in
      s.mode = 'close';
      g.vx = ux * spd; g.vz = uz * spd;
    } else if (dist < H.distance - H.band) {       // too close — back off, it's not a body
      s.mode = 'back';
      g.vx = -ux * spd * H.backOff; g.vz = -uz * spd * H.backOff;
    } else {                                       // in the pocket: circle, conducting
      s.mode = 'circle';
      g.vx = -uz * spd * H.circle; g.vz = ux * spd * H.circle;
    }
    g.faceX = ux; g.faceZ = uz;

    // the baton (enemy.js:1785)
    s.spin += S.spin * dt;

    // 1.x's squash spring, after the movement (enemy.js:2728-2731)
    const Q = S.squash;
    const v = (sqV - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = s.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
  },
};

// The velocity the squash spring was handed this step, before the core's own
// spring ran on it: the core did sqV' = (sqV − (sq − 1)·k)·c on what this
// step wrote last time plus any kicks since (a hit's −0.75, a shockwave, a
// shove), so sqV = sqV'/c + (sq − 1)·k, exactly. On a body's first step there
// is nothing to take back: both springs hold a body at rest still.
function takeBackCoreSpring(w, g, S, api) {
  const s = g.s;
  if (s.sqTick !== w.tick - 1) { s.sq = g.sq; return g.sqV; }
  const [k, c] = api.T.gel.sq[S.family === 'cube' ? 'cube' : 'blob'];   // the core's choice (world.js gelStep)
  return g.sqV / c + (s.sq - 1) * k;
}
