// toro.js — TORO, 1.x's charging wheel (v85, v255): a blue sawblade wheel
// that creeps at you, revs on the spot, lays an exact arrow on the floor, and
// dashes along it wall to wall.
//
// 1.x js/enemy.js at v268: construction 827-863, the cycle 2562-2647, the rev
// glow 2659-2662, the squash 2726-2738, death 3033-3034, 3074-3077; the
// contact shake main.js:10897. Spec: docs/port-1x/species-a.md §5. Every
// number is tuning/species/toro.js.
//
// Per step, in 1.x's frame order (the movement switch, then the squash
// spring, enemy.js:2562-2738):
//   IDLE        1.5 + U(0, 2) s the first time, 1.0 + U(0, 1.5) after a dash.
//               Farther than 2 from you it creeps straight at you at 0.8 u/s,
//               yawed to its creep, never rolling. When the clock runs out
//               (on the step it has crept) the dash line is fixed: the way to
//               you rounded to the nearest 45°, so a moving hero is often
//               missed by design.
//   REVVING     1.6 s on the spot, turned to the line, the spin winding up
//               3 → 15.8 rad/s; the body glows black → 0x003319 (g.tell is
//               the rev's progress, 0..1)
//   TELEGRAPH   0.5 s: the arrow, from where it stands to EXACTLY where the
//               dash will stop — measured to the wall it will hit, one CFG
//               radius in (an elite: its own, see inset()) — flashing; no
//               movement, no spin
//   DASHING     22 u/s decelerating 8 u/s² to a 14 floor, rolling for real
//               (speed / 0.68 rad/s). It never stops for you, a body or the
//               clock: only for the wall, where it is clamped back inside and
//               squashed (−0.5)
//   RECOVERING  0.8 s standing at the wall, then IDLE again
// The CFG speed (5.0) is read by nothing: the wave's speedMult, the SWIFT
// affix and a SIREN's surge never reach it. Its role (COMMIT) gives it the
// wave's current at 0.15 and nothing else, which drifts it through its rev
// and telegraph as in 1.x (the arrow stays where it was laid); the crowd
// solver can still nudge it, and a PUSH dash's knock (g.kx/g.kz) moves it on
// top of its own step: every state moves on from wherever the last step
// left it (nothing is written from a stored origin), so a shove is carried,
// never thrown away. Hits are ordinary (6 hp, the 1.0 circle,
// whatever its yaw); touching it hurts (1.0 + 0.5), and a touch while it
// dashes shakes the camera harder.
//
// Its squash spring is 1.x's non-blob one (0.18 / 0.90 per frame, kicked by
// the wall the same frame it hits, enemy.js:2632, 2728-2730). The core runs
// its spring by family before this step (a `custom` body gets the blob
// spring), so the step takes that back — exactly: the core's spring is
// linear in the kicks it was handed — and runs 1.x's in its place, after the
// movement, as 1.x did. The look reads the result.
//
// Not ported: the CLOSE COMBAT boss's enrage (≤ 33% hp: creep 1.5, rev
// ×0.625, idle ×0.45, 1.x enemy.js:1688-1696, 2571, 2580, 2642) — in classic
// a TORO is never a boss (1.x main.js:239-262).
import { TUNING } from '../../tuning.js?v=70';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'idle';                                            // 1.x _state
    s.idleT = S.firstIdle[0] + S.firstIdle[1] * w.rng.next();    // 1.x _idleTimer = 1.5 + rand·2 (enemy.js:862)
    s.stateT = 0;                                                // 1.x _stateT
    s.dirX = 1; s.dirZ = 0;                                      // 1.x _dashDir = { x: 1, z: 0 } (enemy.js:858)
    s.speed = 0;                                                 // 1.x _dashSpeed
    s.spin = 0;                                                  // 1.x _spinAngle
    s.yaw = 0;                                                   // 1.x group.rotation.y: local +x faces travel
    s.tx = g.x; s.tz = g.z; s.len = 0;                           // the arrow: where it was laid, and how long
    s.dashes = 0;                                                // dashes begun, for the look and the tests
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;                   // the squash spring as this step last left it
    g.tell = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const sqV = takeBackCoreSpring(w, g, S, api);

    // the movement switch (1.x enemy.js:2562-2647), from where this step began
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || 0.001;
    const ri = inset(g, S);
    const bx = w.hx - ri, bz = w.hz - ri;                        // 1.x toroBX/toroBZ (enemy.js:2566)
    let kick = 0;
    switch (s.state) {
      case 'idle': {
        if (dist > S.creepStop) {
          g.x += (dx / dist) * S.creep * dt;
          g.z += (dz / dist) * S.creep * dt;
          s.yaw = Math.atan2(-dz, dx);
          g.faceX = dx / dist; g.faceZ = dz / dist;
        }
        s.idleT -= dt;
        if (s.idleT <= 0) {
          s.state = 'revving';
          s.stateT = S.revTime;
          // the way to the hero as this step began, snapped to the nearest 45°
          const dl = Math.hypot(dx, dz) || 1, snap = (S.dirSnapDeg * Math.PI) / 180;
          const ang = Math.round(Math.atan2(dz / dl, dx / dl) / snap) * snap;
          s.dirX = Math.cos(ang); s.dirZ = Math.sin(ang);
          s.yaw = Math.atan2(-s.dirZ, s.dirX);
          g.faceX = s.dirX; g.faceZ = s.dirZ;
        }
        break;
      }
      case 'revving':
        s.stateT -= dt;
        s.spin += (S.spin.revBase + (S.revTime - Math.max(s.stateT, 0)) * S.spin.revGain) * dt;
        if (s.stateT <= 0) {
          s.state = 'telegraphing';
          s.stateT = S.telegraphTime;
          // the exact distance the centre will travel before the wall stops it (1.x arena.rayEdge)
          s.tx = g.x; s.tz = g.z;
          s.len = Math.max(S.minArrow, rayEdge(w, g.x, g.z, s.dirX, s.dirZ, ri));
          w.events.push({ type: 'tell', id: g.id, kind: g.kind, x: g.x, z: g.z, dx: s.dirX, dz: s.dirZ, len: s.len });
        }
        break;
      case 'telegraphing':
        s.stateT -= dt;
        if (s.stateT <= 0) {
          s.state = 'dashing';
          s.speed = S.dashSpeed;
          s.dashes++;
        }
        break;
      case 'dashing':
        s.speed = Math.max(s.speed - S.dashDecel * dt, S.dashMin);
        g.x += s.dirX * s.speed * dt;
        g.z += s.dirZ * s.speed * dt;
        s.spin += (s.speed / (S.radius * S.rim)) * dt;            // it rolls for real
        if (Math.abs(g.x) > bx || Math.abs(g.z) > bz) {
          g.x = clamp(g.x, -bx, bx); g.z = clamp(g.z, -bz, bz);   // 1.x arena.clamp(x, z, cfg.radius)
          s.state = 'recovering';
          s.stateT = S.recoverTime;
          kick += S.wallSquash;
        }
        break;
      case 'recovering':
        s.stateT -= dt;
        if (s.stateT <= 0) {
          s.state = 'idle';
          s.idleT = S.nextIdle[0] + S.nextIdle[1] * w.rng.next();  // 1.x enemy.js:2642
        }
        break;
    }

    // the rev glow's ramp, read after the switch as 1.x's emissive block was (enemy.js:2659-2662)
    g.tell = s.state === 'revving' ? Math.max(0, S.revTime - Math.max(s.stateT, 0)) / S.revTime : 0;

    // 1.x's squash spring, after the movement (enemy.js:2728-2730)
    const Q = S.squash;
    const v = (sqV + kick - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = s.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
  },

  // Touching it hurts (the core's test: the body's radius + 0.5). A touch
  // that does not kill you, while it dashes, also shakes the camera
  // (1.x main.js:10897); the core asks this only when the touch lands.
  touches(w, g) {
    const h = w.hero, S = TUNING.species[g.kind];
    const hit = Math.hypot(g.x - h.x, g.z - h.z) < g.r + TUNING.gel.contactRadius;
    if (hit && g.s.state === 'dashing' && h.lives > 1) {
      w.events.push({ type: 'shake', amount: S.dashContactShake, x: g.x, z: g.z, id: g.id, kind: g.kind });
    }
    return hit;
  },
};

// The velocity the squash spring was handed this step, before the core's own
// spring ran on it: the core did sqV' = (sqV − (sq − 1)·k)·c on what this
// step wrote last time plus any kicks since (a hit's −0.75, a shockwave), so
// sqV = sqV'/c + (sq − 1)·k, exactly. On a body's first step there is nothing
// to take back: both springs hold a body at rest still.
function takeBackCoreSpring(w, g, S, api) {
  const s = g.s;
  if (s.sqTick !== w.tick - 1) { s.sq = g.sq; return g.sqV; }
  const [k, c] = api.T.gel.sq[S.family === 'cube' ? 'cube' : 'blob'];   // the core's choice (world.js gelStep)
  return g.sqV / c + (s.sq - 1) * k;
}

// How far in from the walls the dash stops, and the arrow is measured to.
// 1.x: one CFG radius (enemy.js:2566 `halfX − cfg.radius`, the same for an
// elite), which is where 1.x also left the wheel — it had no other clamp on
// an enemy (1.x crowd.js clamps only what it nudges). 2.0's core holds every
// body one of ITS OWN radii in after its step (world.js gelStep), so an
// elite (1.2) can never reach 1.x's line: the dash would end 0.2 short of
// the arrow's tip and could stand a step pinned at the wall first. So the
// line is the farther-in of the two — 1.x's for an ordinary TORO (r = CFG
// 1.0, identical), the core's for an elite — and 1.x's rule, "the arrowhead
// tip exactly at impact" (enemy.js:2597-2603), still holds.
function inset(g, S) { return Math.max(S.radius, g.r); }

// 1.x arena.rayEdge on the rectangle (arena.js:62-67): how far from (x, z)
// along (dx, dz) a body of radius r can go before it meets a wall
function rayEdge(w, x, z, dx, dz, r) {
  const bx = w.hx - r, bz = w.hz - r;
  const tx = dx > 0 ? (bx - x) / dx : dx < 0 ? (-bx - x) / dx : Infinity;
  const tz = dz > 0 ? (bz - z) / dz : dz < 0 ? (-bz - z) / dz : Infinity;
  return Math.min(tx, tz);
}
