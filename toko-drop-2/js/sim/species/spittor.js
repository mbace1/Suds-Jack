// spittor.js — SPITTOR, 1.x's aimed-ring shooter (v58): a squat red dome that
// holds a long range from you, inflates, kicks back and spits a ring of 8
// with one bullet aimed straight at you.
//
// 1.x js/enemy.js at v268: movement 2247-2257, the inflate-and-spit cycle in
// _tick 2878-2902, the ring 2961-2966. Spec: docs/port-1x/species-b.md §3,
// bullets-graze.md §5.2. Every number is tuning/species/spittor.js.
//
// Per step, in 1.x's frame order (enemy.js:1672-2786: walk, the velocity the
// look reads, the swell the look reads, then the fire clock):
//   WALK       the hold band: in past hold + 1, back off inside hold − 1, else
//              stand. 1.x writes the position, so do we: the ring leaves from
//              where it has walked to this step. 2.0's curbs hold it in (1.x
//              had none), so the ring never leaves from outside them.
//   VELOCITY   1.x's _velX/_velZ: this step's own walk, eased 0.3 a step. It
//              is sampled BEFORE the fire clock, so the spit's kick back
//              never shows in it (the next step's walk starts from where the
//              kick left it): the snout does not swing and the smear does not
//              flick when it spits.
//   READY      the clock counts; at clock ≥ 2.2 × intervalMult it is reset to
//              0 (not wound back, so the period rounds up to a whole step, as
//              1.x's did) and the TELL starts
//   TELL       0.45 s; the body swells linearly to +22% and glows (g.tell is
//              the swell's progress, 0..1, read before this step's tick as
//              1.x's scale block read it); the clock keeps counting, so tell
//              start to tell start is the interval, not interval + 0.45
//   FIRE       the step the tell runs out: a squash kick, the aim taken NOW
//              from where it stands after this step's walk, a 0.18 kick back
//              along −aim, and the ring from the spot it kicked off
// Nothing gates the fire: no range or line-of-sight check, in 1.x either.
// A hit does not interrupt the tell; it takes no special hits and has no
// death of its own (the core's kill, puddle and shockwave — it is big at 0.9 —
// and HARDCADE's AIMED bite).
export default {
  init(w, g, api) {
    const S = api.S(g);
    g.s.t = w.rng.range(S.fireStart[0], S.fireStart[1]);   // 1.x `_t = U(0, 0.5)`
    g.s.tele = false;                                       // 1.x _isTelegraphing
    g.s.teleT = 0;                                          // 1.x _telegraphT
    g.s.teleMax = 0;                                        // 1.x _telegraphMax
    g.s.velX = 0; g.s.velZ = 0;                             // 1.x _velX, _velZ
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    const x0 = g.x, z0 = g.z;

    // the hold band (1.x enemy.js:2247-2257)
    const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 0.001;
    const spd = api.speed(g);
    if (d > S.hold + S.holdBand) { g.x += (dx / d) * spd * dt; g.z += (dz / d) * spd * dt; }
    else if (d < S.hold - S.holdBand) { g.x -= (dx / d) * spd * dt; g.z -= (dz / d) * spd * dt; }
    api.clamp(w, g);

    // its own velocity, for the snout and the smear (1.x enemy.js:2693-2698)
    g.s.velX += ((g.x - x0) / dt - g.s.velX) * S.velSmooth;
    g.s.velZ += ((g.z - z0) / dt - g.s.velZ) * S.velSmooth;

    // the swell the look draws, as 1.x's scale block read it: before this
    // step's tick (no swell on the step the tell starts, nearly full on the
    // step it spits)
    g.tell = g.s.tele ? 1 - Math.max(0, g.s.teleT / g.s.teleMax) : 0;

    // the fire clock (1.x enemy.js:2784-2785, 2878-2902)
    g.s.t += dt;
    if (!g.s.tele && g.s.t >= S.fireInterval * g.intervalMult) {
      g.s.t = 0;
      g.s.teleT = g.s.teleMax = S.tellTime;
      g.s.tele = true;
    }
    if (g.s.tele) {
      g.s.teleT -= dt;
      if (g.s.teleT <= 0) {
        g.s.tele = false;
        g.sqV += S.fireSquash;
        const ex = g.x, ez = g.z, a = api.fire.aimAngle(w, ex, ez);
        g.x -= Math.cos(a) * S.recoil;
        g.z -= Math.sin(a) * S.recoil;
        api.fire.ring(w, ex, ez, S.ring, a, { color: S.bulletColor, src: g.kind, speedMult: S.bulletSpeedMult });
        w.events.push({ type: 'gelShot', x: ex, z: ez, kind: g.kind, id: g.id, angle: a, n: S.ring });
      }
    }
  },
};
