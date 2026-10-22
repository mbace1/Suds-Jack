// weeva.js — WEEVA, 1.x's drifting spiral turret (v58): a tall dark-blue dome
// that meanders toward you while a single arm of bullets winds round it,
// turning faster and faster.
//
// 1.x js/enemy.js at v268: movement 2273-2278, the spiral in _tick 2948-2957,
// the starting state 668, 674, 678-679. Spec: docs/port-1x/species-b.md §5,
// bullets-graze.md §5.2-5.3. Every number is tuning/species/weeva.js.
//
// Per step, in 1.x's frame order:
//   WALK    pos += (0.5·(sin 0.7c, cos 0.5c) + 0.45·unit(hero − pos)) · speed · dt,
//           c being the body's own clock (1.x `_wobbleT`, seeded U(0, 2π)),
//           which advances only after the walk. No hold band, no minimum
//           distance: it closes until it sits on you (harmless in classic).
//           1.x writes the position, so do we: the arm fires from where it
//           has walked to this step. The walk alone (not the swarm forces
//           before it nor the crowd after it) is smoothed 0.3 a step into
//           g.s.velX/velZ, 1.x's _velX/_velZ, which the look turns and
//           smears by.
//   FIRE    the clock counts; at ≥ 0.16 × intervalMult it is reset to 0 (not
//           wound back, so the period rounds up to whole steps, as 1.x's did)
//           and ONE bullet leaves at the arm's angle (+x for every WEEVA at
//           spawn); the arm then turns by (0.38 + accel) / intervalMult and
//           accel grows by 0.002 to at most 0.4 — so a later wave fires faster
//           AND winds the arm further per shot. Positive angles turn clockwise
//           on screen (z points down).
// No telegraph, no range or line-of-sight gate, no special hits, no death of
// its own (the core's kill, puddle and shockwave — it is big at 0.8 — and
// HARDCADE's FAN bite).
export default {
  init(w, g, api) {
    const S = api.S(g);
    g.s.t = w.rng.range(S.fireStart[0], S.fireStart[1]);       // 1.x `_t = U(0, 0.5)`
    g.s.clock = w.rng.range(S.clockStart[0], S.clockStart[1]); // 1.x `_wobbleT = U(0, 2π)`
    g.s.angle = S.spiralStart;                                 // 1.x `_spiralAngle = 0`
    g.s.accel = 0;                                             // 1.x `_spiralAccel = 0`
    g.s.shots = 0;
    g.s.velX = 0; g.s.velZ = 0;                                // 1.x `_velX = _velZ = 0` (enemy.js:692)
  },

  step(w, g, dt, api) {
    const S = api.S(g), h = w.hero;

    // the walk: the meander on the body's own clock, plus a steady close
    const x0 = g.x, z0 = g.z;
    const dx = h.x - x0, dz = h.z - z0, d = Math.hypot(dx, dz) || 0.001;
    const spd = api.speed(g);
    g.x += (Math.sin(g.s.clock * S.meanderRateX) * S.meander + (dx / d) * S.close) * spd * dt;
    g.z += (Math.cos(g.s.clock * S.meanderRateZ) * S.meander + (dz / d) * S.close) * spd * dt;
    api.clamp(w, g);             // 2.0's curbs (1.x had none); the arm leaves from inside them
    g.s.velX += ((g.x - x0) / dt - g.s.velX) * S.walkSmooth;   // 1.x enemy.js:2696-2697
    g.s.velZ += ((g.z - z0) / dt - g.s.velZ) * S.walkSmooth;
    g.s.clock += dt;             // 1.x advances _wobbleT after the walk (enemy.js:2725)

    // the spiral: the turn is read before this shot's accel grows (1.x enemy.js:2949)
    const turn = (S.spiralStep + g.s.accel) / g.intervalMult;
    g.s.t += dt;
    if (g.s.t >= S.fireInterval * g.intervalMult) {
      g.s.t = 0;
      const a = g.s.angle;
      const b = api.fire.emit(w, g.x, g.z, a, { color: S.bulletColor, src: g.kind, speedMult: S.bulletSpeedMult });
      // a full pool refuses the bullet but the arm still turns (1.x's
      // spawnDir returns early, bullet.js:92-93, and enemy.js:2953-2954 run
      // on regardless); only a bullet that left is a shot the view and the
      // sound hear about
      g.s.angle += turn;
      g.s.accel = Math.min(g.s.accel + S.spiralAccel, S.spiralAccelMax);
      g.s.shots++;
      if (b) w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, id: g.id, angle: a, spiral: true });
    }
  },
};
