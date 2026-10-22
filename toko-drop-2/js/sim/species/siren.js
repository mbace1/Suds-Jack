// siren.js — SIREN, 1.x's screamer (v141): a lilac support dome that never
// attacks. It hovers at mid distance, backs away when pressed, and every few
// seconds inhales and SCREAMS: every other body near it surges to 1.6× its
// walking speed for 3 s. "Kill the support first."
//
// 1.x js/enemy.js at v268: the cycle's state 1165-1169, the surge's clock
// 1698-1700, the movement branch 1819-1842, the clocks 668/671/2724-2725;
// main.js: the scream 10387-10397 (SIREN_RADIUS 2541). Spec:
// docs/port-1x/species-a.md §8. Every number is tuning/species/siren.js.
//
// Per step (1.x's update, after the swarm forces have moved it):
//   the distance to you is taken from where the forces left it, then
//   HOLD     farther than keep + 1 = 10 it closes at spd; nearer than
//            keep − 1 = 8 it backs straight away at 1.3 × spd; in between it
//            stands. spd is api.speed(g): a SIREN is never surged by another,
//            but the wave's speedMult and SWIFT reach it
//   CRUISE   the scream timer runs down (first 2.5 + U·1.5 s, then
//            3.5 + U·1.5 s); when it is out the 0.8 s INHALE begins (that
//            step does not count it down)
//   INHALE   counts down, still moving; g.tell = k = 1 − inhaleT / 0.8 (the
//            tell v141 meant and 1.x never drew: tuning `inhaleTell`). When
//            it is out it SCREAMS on that step and the cruise timer redraws
//   then its own velocity is smoothed for the look, and its clock advances.
// The scream (1.x applied it right after the SIREN's own update): every other
// living body that is not a boss and not a SIREN, with its centre strictly
// within 7 of where this step's own move leaves the SIREN, gets surgeT = 3
// and surgeMult = 1.6 — set, not added, so a second scream refreshes and
// never stacks. The core counts surgeT down at the top of each body's step
// and api.speed multiplies by surgeMult while it runs, so the surge reaches
// whatever reads a body's walking speed, and not the swarm forces or the
// crowd (1.x: what read `spd`). A body later in the step order than the
// SIREN surges this very step, one earlier from the next — 1.x's frame order.
// The scream's ring and sound are the view's: an event, and a counter its
// look reads. The first scream comes 3.3–4.8 s after it arrives, then every
// 4.3–5.8 s.
// No gun, no special hits (3 HP), harmless to touch in classic, no death of
// its own (the core's kill, puddle and goo; a big death at r 0.75); not a
// HARDCADE biter.
export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.screamT = w.rng.range(S.screamFirst[0], S.screamFirst[1]);   // 1.x `_screamT = 2.5 + rand·1.5`
    s.inhaleT = 0;                                                   // 1.x `_inhaleT`
    s.screams = 0;                                                   // how many times it has screamed (the look's ring reads it)
    s.screamX = g.x; s.screamZ = g.z;                                // where it last screamed
    s.clock = w.rng.range(S.clockStart[0], S.clockStart[1]);         // 1.x `_wobbleT`
    s.phase = w.rng.range(S.phaseStart[0], S.phaseStart[1]);         // 1.x `_phase`
    s.velX = 0; s.velZ = 0;                                          // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || 0.001;
    const spd = api.speed(g);
    if (dist > S.keep + S.keepBand) { g.vx = (dx / dist) * spd; g.vz = (dz / dist) * spd; }
    else if (dist < S.keep - S.keepBand) { g.vx = -(dx / dist) * spd * S.retreat; g.vz = -(dz / dist) * spd * S.retreat; }
    g.faceX = dx / dist; g.faceZ = dz / dist;

    if (s.inhaleT > 0) {
      s.inhaleT -= dt;
      g.tell = S.inhaleTell ? 1 - s.inhaleT / S.inhale : 0;
      if (s.inhaleT <= 0) {
        g.tell = 0;                                                  // 1.x resets the swell the step it screams
        s.screamT = w.rng.range(S.screamEvery[0], S.screamEvery[1]);
        scream(w, g, dt, S);
      }
    } else {
      g.tell = 0;
      s.screamT -= dt;
      if (s.screamT <= 0) s.inhaleT = S.inhale;
    }

    // what its look smears and turns by: its own movement only, as 1.x
    // measured it (the swarm forces before and the crowd after are not in it)
    s.velX += (g.vx - s.velX) * S.velSmooth; s.velZ += (g.vz - s.velZ) * S.velSmooth;
    s.clock += dt;
  },
};

// 1.x main.js:10387-10397. 1.x screamed from where the SIREN's own move this
// frame had left it; the core moves it after this step returns, so that is
// its position plus this step's own velocity, held inside the arena as the
// core will hold it.
function scream(w, g, dt, S) {
  const s = g.s;
  const x = clamp(g.x + g.vx * dt, -w.hx + g.r, w.hx - g.r), z = clamp(g.z + g.vz * dt, -w.hz + g.r, w.hz - g.r);
  for (const o of w.gels) {
    if (!o.alive || o === g || o.isBoss || o.kind === g.kind) continue;
    if (Math.hypot(o.x - x, o.z - z) < S.reach) { o.surgeT = S.surgeTime; o.surgeMult = S.surgeMult; }
  }
  s.screams++; s.screamX = x; s.screamZ = z;
  w.events.push({ type: 'scream', id: g.id, kind: g.kind, x, z, reach: S.reach });
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
