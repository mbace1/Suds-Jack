// pyra.js — PYRA, 1.x's spinner turret: a flat orange gel ring floating at
// waist height with gold holes round it, spinning, and every few seconds
// every hole fires a three-shot fan along the line it is pointing — a
// rotating star of fans. Its holes are its hit points: each shot takes one,
// that line goes quiet, and the ring spins faster.
//
// 1.x js/enemy.js at v268: construction 935-971, hpFrac 1474, hit() 1641-1662,
// the spin 2533-2535, no squash spring 2727, the fire tick 2792-2808; the
// elite and boss hp exemption main.js:9385, 9403, 9408. Spec:
// docs/port-1x/bullets-graze.md §5.2 (the PYRA row) and trap 7. Every number
// is tuning/species/pyra.js.
//
//   HOLES   n = 4, 6 or 8 by the wave's intervalMult (tier ⌊(1 − im)/0.09⌋
//           < 3, < 5, else), hole i at 2π i / n; hp = maxHp = n whatever the
//           spawn asked for (an elite, a boss), and the HUD's fraction is
//           hp / n (1.x hpFrac)
//   SPIN    θ += spinSpeed · dt every step, from 0; spinSpeed starts at 1.8
//           rad/s and gains 0.6 for every hole lost
//   FIRE    the clock starts FULL at 2.5 × im (not the shared random start),
//           counts down, and at ≤ 0 is set back to 2.5 × im (the overshoot is
//           dropped, so the period rounds up to whole steps, as 1.x's did).
//           Then every live hole fires fanStep(θ + its angle, 3, π/12) from
//           the ring's centre, in 1.x's frame order: the spin first, then the
//           tick, both in the movement-then-fire update
//   HIT     a shot (unless a WARDEN's aura blocks it: 1.x's aura test comes
//           before hit()) takes a hole, chosen at random among the live ones
//           (1.x: "approximate: random alive hole") from the run's stream
//
// The holes stay tied to the hp, which is 1.x's invariant (every hp it lost
// went through hit() and took a hole): live holes = ⌈hp · n / maxHp⌉. A shot
// takes its hole in onHit; anything else that takes hp without a shot (this
// game's CUT dash; the PUSH dash skips a FIXED body, so never) gives up its
// holes in its own step, which comes after the hero's dash, or at the kill.
// With the "bullet sponge" test switch (w.hpMult) the same rule spreads the
// holes over the longer life. A kill that takes no hp (a dash-level kill)
// still takes one hole: every 1.x death went through hit(), and its kills
// from outside the gun were `e.hp = 1; e.hit()` (main.js:4783, 9534, 9880,
// 11261 — 1.x never calls destroy() any other way), so the killing blow
// always closes a hole and pops it.
//
// The angles are 1.x's fire angles, atan2(z, x): a hole at angle a fires at
// θ + a. (1.x DREW that hole at a − θ, three's +y yaw turning the other way —
// bullets-graze.md trap 7 — so its drawn holes counter-rotated against their
// fans; the look draws them where the fans leave.)
//
// It never moves on its own: speed 0, role FIXED (no swarm forces, and the
// PUSH dash leaves it standing). Only the crowd solver may part it from a
// body it overlaps, as in 1.x. It takes no squash spring (1.x skips it), so
// the core's kicks — a hit, a big death beside it — are cancelled each step.
// Its death is the core's (the pop, the puddle, the shockwave: it is big at
// 1.0) and HARDCADE's FAN bite.
export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    const n = holeCount(S, g.intervalMult);
    s.holes = [];                              // 1.x _holes: { angle, alive }
    for (let i = 0; i < n; i++) s.holes.push({ angle: (i / n) * Math.PI * 2, alive: true });
    // 1.x enemy.js:967: hp is the hole count, whatever the spawn asked for.
    // The core's test switch (every non-boss body's hp × w.hpMult) applies on top.
    let hp = n;
    if (!g.isBoss && w.hpMult !== 1) hp = Math.max(1, Math.round(hp * w.hpMult));
    g.hp = g.maxHp = hp;
    s.spin = 0;                                // 1.x group.rotation.y
    s.spinSpeed = S.spin;                      // 1.x _spinSpeed
    s.fireT = S.fireInterval * g.intervalMult; // 1.x _pyraFireTimer
    s.lost = 0;                                // holes lost so far
    s.volleys = 0;                             // volleys fired so far
    g.sq = 1; g.sqV = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s;
    // 1.x skips the squash spring for PYRA (enemy.js:2727): it never squashes
    g.sq = 1; g.sqV = 0;
    // holes lost to anything but a shot (the hp is the holes)
    loseTo(w, g, S, g.hp);

    // the movement switch: the spin (1.x enemy.js:2533-2535)
    s.spin += s.spinSpeed * dt;

    // the fire tick (1.x enemy.js:2792-2808)
    s.fireT -= dt;
    if (s.fireT <= 0) {
      s.fireT = S.fireInterval * g.intervalMult;
      let n = 0;
      for (const hole of s.holes) {
        if (!hole.alive) continue;
        const ha = s.spin + hole.angle;
        // 1.x took the fan's centre back through atan2(sin, cos): the spin is unbounded
        api.fire.fanStep(w, g.x, g.z, Math.atan2(Math.sin(ha), Math.cos(ha)), S.fan.shots, S.fan.step, { color: S.bulletColor, src: g.kind });
        n++;
      }
      s.volleys++;
      if (n) w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, id: g.id, holes: n });
    }
  },

  // A shot takes a hole (1.x enemy.js:1641-1661); the core then takes the hp.
  // A WARDEN's aura blocks before 1.x's hit() runs, so a shielded ring loses
  // nothing.
  onHit(w, g, b, api) {
    if (g.shield) return;
    loseTo(w, g, api.S(g), g.hp - api.T.bullets.heroDamage);
  },

  // whatever took its last hp without a shot (a CUT) took its holes too; a
  // kill that took none is 1.x's `e.hp = 1; e.hit()`: the blow takes one
  onKill(w, g, api) {
    const S = api.S(g);
    if (g.hp <= 0) loseTo(w, g, S, 0);
    else close(w, g, S, 1);
  },
};

// 1.x enemy.js:953-954
export function holeCount(S, intervalMult) {
  const H = S.holes;
  const tier = Math.floor(intervalMult > 0 ? (1 - intervalMult) / H.tierStep : 0);
  return tier < H.tiers[0] ? H.counts[0] : tier < H.tiers[1] ? H.counts[1] : H.counts[2];
}

// how many holes are still open at `hp`: 1.x's one hole per hp, spread over a
// longer life when the test switch has grown it
export function liveFor(g, hp) {
  const n = g.s.holes.length;
  return Math.min(n, Math.max(0, Math.ceil((Math.max(0, hp) * n) / g.maxHp)));
}

// Close holes until no more are open than `hp` allows
function loseTo(w, g, S, hp) {
  const open = g.s.holes.reduce((k, h) => k + (h.alive ? 1 : 0), 0);
  close(w, g, S, open - liveFor(g, hp));
}

// Close `k` holes: each one a random live hole (1.x: "approximate: random
// alive hole", from the run's stream here), each one +0.6 rad/s of spin
// (1.x enemy.js:1643-1648)
function close(w, g, S, k) {
  const s = g.s, live = s.holes.filter((h) => h.alive);
  for (; k > 0 && live.length; k--) {
    const i = Math.floor(w.rng.next() * live.length);
    const hole = live[i];
    hole.alive = false;
    s.spinSpeed += S.spinPerHole;
    s.lost++;
    w.events.push({ type: 'holePop', id: g.id, kind: g.kind, x: g.x, z: g.z, angle: s.spin + hole.angle, left: live.length - 1 });
    live.splice(i, 1);
  }
}
