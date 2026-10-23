// purp.js — PURP CUBE, 1.x's circler (v40): a purple rounded cube that
// circles you at about 5, tumbling over its own leading bottom edge one face
// at a time (v84), and turns a slow 2-arm pinwheel of bullets as it goes
// (v61) — and when it dies, it breaks into a scatter of PURP MINIs, 5 and up
// by the wave, that rush you. Contact hurts; 3 HP.
//
// 1.x js/enemy.js at v268: the orbit side 702, the spiral state 678, 703-706,
// the cube state 1209-1214, `_flopMove` 1486-1566 (called with exact =
// false), the heading and the spiral 2297-2301, 2310-2326 and 2331, destroy's
// brood 3067-3071, the death pop 2967-3000; main.js's child spawn
// 10586-10620; the crowd's tumble nudge crowd.js:107-116. No dedicated spec:
// 1.x's source is the spec (bullets-graze.md §5.5 has its row). Every number
// is tuning/species/purp.js.
//
// Per step, in 1.x's order (enemy.js:2297-2331), from where the swarm forces
// left it (ex, ez — 1.x's position at the top of its update):
//   HEADING with u the unit bearing to you and o its orbit side (±1, drawn
//           once at spawn): want = (−u.z·o + u.x·k, u.x·o + u.z·k), k =
//           (dist − 5)·0.18 — square to your line, pulled in while it is
//           outside 5 and pushed out inside it. Read every step; only a rest
//           running out uses it.
//   SPIRAL  its own clock counts down every step, moving or not (the first
//           pulse 0.5 s in, then every 1.0 × intervalMult s, the clock
//           ASSIGNED on firing so the period is whole steps). At ≤ 0: two
//           bullets from (ex, ez), at θ and θ + π, then θ += its spin — θ
//           starts at 0 on every cube, the spin is 0.42 + U·0.34 rad a pulse
//           with a random sign, both drawn once at spawn. So each cube draws
//           its own 2-arm galaxy, turning one way or the other.
//   FLOP    1.x's edge-pivot flop on the CARDINAL path (sim/species/redd.js
//           `cubeFlop`, which REDD and both minis share): a rest counts down
//           (the swarm forces that moved it stick); when it runs out, the
//           same step, the cardinal of the heading's larger axis 70%, its
//           last one 20%, any 10% (on top of you, with no heading: its last
//           70%, else any), turned back along an axis if the stride would
//           cross the wall (at the CFG radius, 1.x). Then a rigid tip from
//           where it stood, WRITTEN from that origin, so a flop step's swarm
//           forces are lost (1.x); what moved it from outside at the end of
//           its last step — the crowd solver, a PUSH dash's knock — moves the
//           origin with it, by the unclamped nudge (g.nudgedX/Z, 1.x
//           crowd.js:110). At p = 1 it lands: a face on, −0.32 to the squash
//           spring, the rest of the cycle. At 1.6 u/s: a 0.30 s tip and a
//           0.54 s rest.
// The orbit shows as a square-cornered circling: on the ring the heading is
// purely tangential, and snapped to a cardinal it walks you round a face at a
// time, cutting in from far off and backing out when you close on it.
//
// On its death (the core's kill, then this), whatever killed it — a bullet,
// a dash, the environment (1.x destroy() sets the brood for every death):
//   BROOD   n = 5 + 2·⌊(1 / max(iM, 0.1) − 1) / 0.09⌋ PURP MINIs from its
//           frozen intervalMult — 5 at waves 1-2, 7 at 3, 11 at 5 (its first),
//           25 at 10, 45 from 25: no cap of its own, only the director's child
//           valve (the live cap × 2). FREEFORM: mini j at a uniform angle and
//           1.2 + U·1.5 u out, on the parent's speedMult (× swift, which 1.x
//           baked into _speedMult) and intervalMult; ordinary bodies (no
//           variant, no affix, no ping). They come out when the 0.28 s death
//           pop ends, as 1.x's did: spawned now, they are handed to the
//           core's wait (state 'appear', t = −0.28), so until then they can
//           neither hurt, be hit, nor move; out, they are live at once, as
//           1.x's were (1.x had no appear).
// It is not otherwise special: no special hits (3 hp, every bullet lands),
// no tell, the core's contact (r + 0.5), the core's death (big at 0.75: a
// shockwave; angular chunks; a puddle); HARDCADE's FAN bite (the core's).
//
// Where the contract cannot say it (docs/SIM_CONTRACT.md has no delayed
// spawn): 1.x built the brood, and counted the valve, at the END of the pop;
// here both happen at the kill, so the waiting brood counts as alive for
// those 0.28 s (REDD's and SPLITTA's ports do the same). No big death's
// shockwave rattles it while it waits, its own or another's: the core's shock
// skips a body in the wait, as 1.x had nothing there yet to rattle
// (main.js:4518-4529).
import { cubeInit, cubeCarry, cubeFlop } from './redd.js?v=31';

const TAU = Math.PI * 2;

// how many minis a PURP of this intervalMult breaks into (1.x enemy.js:3069-3070)
export function broodSize(C, intervalMult) {
  const tier = Math.floor((1 / Math.max(intervalMult, C.tierFloor) - 1) / C.tierStep);
  return C.base + tier * C.perTier;
}

// the circler's heading (1.x enemy.js:2310-2314), from (ex, ez)
export function orbitHeading(S, sign, ex, ez, hx, hz) {
  const O = S.orbit;
  const ddx = hx - ex, ddz = hz - ez, dist = Math.hypot(ddx, ddz) || S.distFloor;
  const ux = ddx / dist, uz = ddz / dist;
  const radial = (dist - O.radius) * O.pull;            // + pulls inward
  return [-uz * sign + ux * radial, ux * sign + uz * radial];
}

export default {
  init(w, g, api) {
    const S = api.S(g), P = S.spiral, s = g.s;
    // its own state, in 1.x's draw order (enemy.js:678, 702-706)
    s.orbitSign = w.rng.next() < S.orbit.side ? 1 : -1;                 // 1.x `_orbitSign`
    s.fireT = P.first;                                                  // 1.x `_purpFireT = 0.5`
    s.spiralA = P.angle0;                                               // 1.x `_spiralAngle = 0`
    const mag = P.spinMin + w.rng.next() * P.spinRand;
    s.spin = mag * (w.rng.next() < P.spinSide ? 1 : -1);                // 1.x `_purpSpin`
    s.pulses = 0;                                                       // volleys fired (for the view and the tests)
    cubeInit(w, g, api);                                                // the shared cube state (1.x enemy.js:1209-1214)
  },

  step(w, g, dt, api) {
    const S = api.S(g), P = S.spiral, s = g.s, h = w.hero;
    cubeCarry(g);
    const ex = g.x, ez = g.z;
    const [wantX, wantZ] = orbitHeading(S, s.orbitSign, ex, ez, h.x, h.z);

    // the spiral, on its own clock (1.x enemy.js:2318-2326)
    s.fireT -= dt;
    if (s.fireT <= 0) {
      s.fireT = P.period * g.intervalMult;
      const opts = { color: S.bulletColor, src: g.kind, speedMult: P.bulletSpeedMult };
      for (let k = 0; k < P.arms; k++) api.fire.emit(w, ex, ez, s.spiralA + (k * TAU) / P.arms, opts);
      w.events.push({ type: 'gelShot', x: ex, z: ez, kind: g.kind, id: g.id, angle: s.spiralA, n: P.arms });
      s.spiralA += s.spin;
      s.pulses++;
    }

    cubeFlop(w, g, dt, api, wantX, wantZ);
  },

  onKill(w, g, api) {
    const C = api.S(g).children;
    // every place is drawn first, as 1.x's toSpawn list was, then they come
    // out until the child valve closes (1.x main.js:10587-10620); FREEFORM,
    // so each angle is its own draw (1.x main.js:10594-10598)
    const n = broodSize(C, g.intervalMult), pts = [];
    for (let j = 0; j < n; j++) {
      const a = w.rng.next() * TAU;
      const d = C.dist[0] + w.rng.next() * (C.dist[1] - C.dist[0]);
      pts.push([g.x + Math.cos(a) * d, g.z + Math.sin(a) * d]);
    }
    const out = Math.min(n, api.childrenAllowed(w));
    const speedMult = g.speedMult * (g.affix === 'swift' ? api.T.variants.swiftSpeed : 1);
    const wait = api.T.blob.death;
    for (let j = 0; j < out; j++) {
      const c = api.spawn(w, C.kind, pts[j][0], pts[j][1], { child: true, speedMult, intervalMult: g.intervalMult });
      // 2.0's walls hold every body; 1.x's child could stand up to 2.7 outside one
      api.clamp(w, c);
      // not yet: the core's wait (state 'appear', t < 0) for the death pop's
      // 0.28 s — which also keeps it out of the big-death shockwave (a PURP is
      // big, 0.75) the core runs after this hook (1.x's brood was not built
      // yet, main.js:4518-4529)
      c.state = 'appear'; c.t = -wait;
    }
  },
};
