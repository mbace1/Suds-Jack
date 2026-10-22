// fanner.js — FANNER, 1.x's fan shooter (v58): a wide, flat magenta pancake
// that holds a mid range from you, strafes across your line the whole time,
// glows, and fans an aimed volley of 6 — every third one 9 and wider.
//
// 1.x js/enemy.js at v268: the starting state 674, 680-681, 712; movement
// 2259-2271; the velocity the look reads 2693-2698; the glow-and-fan cycle in
// _tick 2904-2932. Spec: docs/port-1x/species-b.md §4, bullets-graze.md
// §5.2-5.3. Every number is tuning/species/fanner.js.
//
// Per step, in 1.x's frame order (enemy.js:1672-2786: walk, the velocity the
// look reads, the glow the look reads, then the fire clock):
//   WALK       u = unit(hero − pos), perp = (−u.z, u.x). The strafe timer
//              counts down first; at ≤ 0 the strafe flips and the timer is
//              re-armed to 2.5 + U(0, 1) s (the first flip after 1.5 + U(0, 1)).
//              Then pos += (u·radial + perp·strafeDir)·speed·dt, radial being
//              +1 past 9.5, −1 inside 6.5, else 0 — not normalised, so outside
//              the band it moves at √2 × speed. 1.x writes the position, so do
//              we: the fan leaves from where it has walked to this step. 2.0's
//              curbs hold it in (1.x had none), so against one it slides along.
//   VELOCITY   1.x's _velX/_velZ: this step's own walk, eased 0.3 a step (the
//              swarm's current before it and the crowd after it excluded).
//   READY      the clock counts; at clock ≥ 1.5 × intervalMult it is reset to
//              0 (not wound back, so the period rounds up to a whole step, as
//              1.x's did) and the TELL starts
//   TELL       0.4 s of dark magenta glow (g.tell is its progress, 0..1, read
//              before this step's tick as 1.x's emissive block read the flag);
//              the clock keeps counting, so tell start to tell start is the
//              interval, not interval + 0.4
//   FIRE       the step the tell runs out: a −0.8 squash kick; then, unless
//              you are standing exactly on it, the aim taken NOW and a fan
//              about it — 6 over 108° (no centre bullet: the inner two straddle
//              the aim at ±10.8°), or on every third volley 9 over 171° (the
//              5th straight at you). Only a volley that is fired counts.
// Nothing gates the fire: no range or line-of-sight check, in 1.x either.
// A hit does not interrupt the tell; it takes no special hits and has no
// death of its own (the core's kill, puddle and shockwave — it is big at 0.75
// — and HARDCADE's FAN bite).
export default {
  init(w, g, api) {
    const S = api.S(g);
    g.s.t = w.rng.range(S.fireStart[0], S.fireStart[1]);               // 1.x `_t = U(0, 0.5)`
    g.s.strafeDir = S.strafeDir0;                                       // 1.x `_strafeDir = 1`
    g.s.strafeT = w.rng.range(S.strafeStart[0], S.strafeStart[1]);     // 1.x `_strafeTimer = 1.5 + U(0, 1)`
    g.s.tele = false;                                                   // 1.x _isTelegraphing
    g.s.teleT = 0;                                                      // 1.x _telegraphT
    g.s.teleMax = 0;                                                    // 1.x _telegraphMax
    g.s.shot = 0;                                                       // 1.x _fannerShot
    g.s.velX = 0; g.s.velZ = 0;                                         // 1.x _velX, _velZ
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;
    const x0 = g.x, z0 = g.z;

    // the hold band and the strafe (1.x enemy.js:2259-2271)
    const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 0.001;
    const ux = dx / d, uz = dz / d, px = -uz, pz = ux;
    g.s.strafeT -= dt;
    if (g.s.strafeT <= 0) {
      g.s.strafeDir = -g.s.strafeDir;
      g.s.strafeT = w.rng.range(S.strafeFlip[0], S.strafeFlip[1]);
    }
    const radial = d > S.hold + S.holdBand ? 1 : d < S.hold - S.holdBand ? -1 : 0;
    const spd = api.speed(g), side = g.s.strafeDir * S.strafe;
    g.x += (ux * radial + px * side) * spd * dt;
    g.z += (uz * radial + pz * side) * spd * dt;
    api.clamp(w, g);

    // its own velocity, for the heading and the smear (1.x enemy.js:2693-2698)
    g.s.velX += ((g.x - x0) / dt - g.s.velX) * S.velSmooth;
    g.s.velZ += ((g.z - z0) / dt - g.s.velZ) * S.velSmooth;

    // the glow the look draws, as 1.x's emissive block read it: before this
    // step's tick (none on the step the tell starts, still on the step it fires)
    g.tell = g.s.tele ? 1 - Math.max(0, g.s.teleT / g.s.teleMax) : 0;

    // the fire clock (1.x enemy.js:2784-2785, 2904-2932)
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
        const ex = g.x, ez = g.z, adx = h.x - ex, adz = h.z - ez;
        if (Math.hypot(adx, adz) > 0) {
          g.s.shot = (g.s.shot + 1) % S.wideEvery;
          const wide = g.s.shot === 0, P = wide ? S.wide : S.fan, a = Math.atan2(adz, adx);
          api.fire.fanSpan(w, ex, ez, a, P.n, P.span, { color: S.bulletColor, src: g.kind, speedMult: S.bulletSpeedMult });
          w.events.push({ type: 'gelShot', x: ex, z: ez, kind: g.kind, id: g.id, angle: a, n: P.n, wide });
        }
      }
    }
  },
};
