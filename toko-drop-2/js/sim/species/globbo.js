// globbo.js — GLOBBO, 1.x's pouncer (v58): the basic melee body and the
// commonest one. A small teal dome that stalks you with a lunging pulse,
// crouches to telegraph, and leaps along the line it crouched on.
//
// 1.x js/enemy.js at v268: the pounce state 709-711, the movement branch
// 1712-1746, the clocks 668/671/2724-2725. Spec: docs/port-1x/species-a.md
// §3. Every number is tuning/species/globbo.js.
//
// Per step (1.x's update, after the swarm forces have moved it):
//   the distance to you is taken from where the forces left it; the pounce
//   timer ticks down first, then
//   STALK   while farther than 1.2 it walks at you at spd × the lunge, a
//           surge of one half-period of sin(3.0·clock + phase), squared,
//           × 2.6, on a 0.4 floor (3.0× at the top, mean 1.05×). Once the
//           timer is out AND you are within 12 → CROUCH: 0.32 s, a −0.85
//           squash, and the direction to you NOW is locked in (taken before
//           this step's walk, as 1.x's was)
//   CROUCH  no movement of its own (the swarm forces still carry it); when
//           the timer runs out → LEAP: 0.30 s and a +0.7 stretch. The
//           change-over step does not move
//   LEAP    along the locked line at spd × 3.2 — it moves on the step the
//           timer runs out too — then → STALK for 1.6 + U·1.4 s
//   then its own velocity is smoothed for the look, and its clock advances
//   by dt (1.x reads it before the tick).
// It cannot reach you by stalking: stalking stops at 1.2 and contact needs
// < r + 0.5 = 1.05. Its hits are the leap and the swarm forces carrying it in.
// No gun, no special hits (1 HP: any bullet kills it), no death of its own
// (the core's kill, puddle and goo); not a HARDCADE biter.
export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.pounce = 'stalk';
    s.pounceT = w.rng.range(S.firstPounce[0], S.firstPounce[1]);   // 1.x `1.0 + rand·1.4`
    s.dirX = S.pounceDir[0]; s.dirZ = S.pounceDir[1];
    s.clock = w.rng.range(S.clockStart[0], S.clockStart[1]);       // 1.x `_wobbleT`
    s.phase = w.rng.range(S.phaseStart[0], S.phaseStart[1]);       // 1.x `_phase`
    s.velX = 0; s.velZ = 0;                                         // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || S.distFloor;
    const spd = api.speed(g);
    s.pounceT -= dt;
    if (s.pounce === 'stalk') {
      if (dist > S.stalkStop) {
        const k = spd * lunge(S, s.clock, s.phase);
        g.vx = (dx / dist) * k; g.vz = (dz / dist) * k;
        g.faceX = dx / dist; g.faceZ = dz / dist;
      }
      if (s.pounceT <= 0 && dist < S.pounceRange) {
        s.pounce = 'crouch';
        s.pounceT = S.crouchTime;
        g.sqV += S.crouchSquash;
        s.dirX = dx / dist; s.dirZ = dz / dist;
        g.faceX = s.dirX; g.faceZ = s.dirZ;
      }
    } else if (s.pounce === 'crouch') {
      if (s.pounceT <= 0) {
        s.pounce = 'leap';
        s.pounceT = S.leapTime;
        g.sqV += S.leapSquash;
      }
    } else {
      g.vx = s.dirX * spd * S.leapSpeed; g.vz = s.dirZ * spd * S.leapSpeed;
      if (s.pounceT <= 0) {
        s.pounce = 'stalk';
        s.pounceT = w.rng.range(S.restPounce[0], S.restPounce[1]);
      }
    }
    // what its look smears and turns by: its own movement only, as 1.x
    // measured it (the swarm forces before and the crowd after are not in it)
    s.velX += (g.vx - s.velX) * S.velSmooth; s.velZ += (g.vz - s.velZ) * S.velSmooth;
    s.clock += dt;
  },
};

// the stalk's speed pulse, as a share of its walking speed (1.x enemy.js:1720-1721)
export function lunge(S, clock, phase = 0) {
  return Math.max(0, Math.sin(clock * S.lungeHz + phase)) ** 2 * S.lungeGain + S.lungeFloor;
}
