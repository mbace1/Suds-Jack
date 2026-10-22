// omega.js — OMEGA, 1.x's three-act crystal (v71, v136): the boss that
// alternates with the TWIN PRISMS every eighth wave. It never walks at you:
// it orbits at a distance and fires by the act its hp has reached.
//
// 1.x js/enemy.js at v268: the orbit sign 702, the first clock 1229, setBoss
// 1467, the phases 1683-1700, the branch 2399-2445, the strobes 2650-2672,
// the ring 2961-2966, the squash 2726-2738; main.js: the boss spawn
// 9382-9391, the phase popup 10398-10407. Specs: docs/port-1x/arcade-mode.md
// §5.2-§5.3, bullets-graze.md §5.5. Every number is tuning/species/omega.js.
//
// Per step, in 1.x's frame order (enemy.js:1672-2760):
//   THE ACT     a boss reads its hp against its maxHp before it moves: phase 2
//               at ≤ 66%, phase 3 at ≤ 33% — only ever up. A change strobes
//               the crystal gold/orange for 0.5 s and is announced: a `phase`
//               event (1.x's "BOSS PHASE N!" popup for 1.1 s, phaseShift and
//               the announcer) and a 0.3 `shake`. Phase 3 is `enraged`: × 1.45
//               on the speed. A non-boss OMEGA (none spawns in classic) stays
//               in act one, as 1.x's did.
//   THE ORBIT   round the hero at 7.5 (phase 2: 6.2, and × 1.18), the radial
//               part ±0.5 outside a ±1.5 band, the tangential 1 in its orbit
//               sign; speed = 1.3 × speedMult × (enraged 1.45). The core
//               integrates the velocity and keeps it inside the walls.
//   THE SPIN    0.6 rad/s about y, 0.25 about x — for the look only.
//   THE CLOCK   assigned, never accumulated: the first volley 1.2 + U(0, 0.6)
//               s after arrival, then the act's period × the wave's
//               intervalMult. Its last 0.25 s is the tell (g.tell = 1).
//               Act one: an aimed 5-fan over 0.35π every 0.9. Act two: two
//               opposite bullets every 0.24, the arm turning 0.55 a volley
//               from a random start. Act three: a 12-ring from angle 0 every
//               0.7. All at 7 u/s, from the centre, where the step began.
//   THE STROBES 1.x's emissive chain (enemy.js:2650-2672) is one if/else: the
//               hit flash, then a VOLATILE fuse, then the phase pop, then the
//               fire tell. So the pop's 0.5 s clock only runs on a frame no
//               flash (or fuse) outranks it — read as 1.x read it, BEFORE the
//               flash's own countdown (the core counts the flash down before
//               this step, so "was it flashing" is told from the last step).
//               A frame that runs the pop's clock wears the pop (`s.popOn`,
//               what the look paints): 1.x tests it > 0 BEFORE the countdown.
//               A `phase` event carries 1.x's popup (`label`, `dur`) and shake.
// Hits are ordinary (the 1.425 circle as a boss, 15 hp); touching it does not
// hurt. Its squash spring is 1.x's non-blob one (0.18 / 0.90 per frame); the
// core runs the blob spring on a `custom` body before this step, so the step
// takes that back and runs 1.x's in its place, as TORO's port does.
//
// Not ported: the gauntlet mega-boss (× 5 hp, × 1.7 radius, main.js:9383)
// and the world-bound rules of waves 16+ (arcade-mode.md §5.7) — cabinet and
// depth-world paths. The SIREN surge never reaches a boss in 1.x
// (main.js:10390), and 2.0's SIREN leaves bosses alone the same way.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.phase = 1;                                                 // 1.x _bossPhase (enemy.js:729)
    s.enraged = false;                                           // 1.x _enraged (enemy.js:728)
    s.phaseFlashT = 0;                                           // 1.x _phaseFlashT (enemy.js:730)
    s.popOn = false;                                             // this step's frame wears the gold pop (the look reads it)
    s.orbitSign = w.rng.next() < 0.5 ? 1 : -1;                   // 1.x _orbitSign (enemy.js:702)
    s.fireT = S.firstFire[0] + w.rng.next() * S.firstFire[1];    // 1.x _omegaFireT = 1.2 + rand·0.6 (enemy.js:1229)
    s.spiralA = null;                                            // 1.x _spiralA, seeded at the first spiral volley
    s.rotY = 0; s.rotX = 0;                                      // 1.x mesh.rotation.y / .x
    s.volleys = 0; s.fanVolleys = 0; s.spiralVolleys = 0; s.ringVolleys = 0;   // for the look and the tests
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;                   // the squash spring as this step last left it
    s.flashEnd = g.flash;                                        // the hit flash as this step last left it
    g.tell = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const sqV = takeBackCoreSpring(w, g, S, api);
    // 1.x's `_flashT > 0` at the head of its chain, before its countdown: the
    // core has already counted this step down, so a flash that was on is one
    // still on, or one that just ran out (it only falls while it was positive)
    const flashing = g.flash > 0 || g.flash < s.flashEnd;

    // where this step began (1.x ex/ez, enemy.js:1680-1682)
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || 0.001;

    // the act (1.x enemy.js:1688-1697): by hp, only ever up
    if (g.isBoss) {
      const frac = g.hp / g.maxHp;
      const want = frac <= S.phases.p3 ? 3 : frac <= S.phases.p2 ? 2 : 1;
      if (want > s.phase) {
        s.phase = want;
        s.phaseFlashT = S.phaseFlash;
        // main.js:10398-10407: the popup `BOSS PHASE N!` for 1.1 s, the phase sound and the announcer,
        // and the shake (the event's shape is PRISM's rage: label, dur, shake)
        w.events.push({ type: 'phase', id: g.id, kind: g.kind, phase: want, x: g.x, z: g.z,
          label: `${S.phaseLabel} ${want}!`, dur: S.phasePopup, shake: S.phaseShake });
        w.events.push({ type: 'shake', amount: S.phaseShake, id: g.id, kind: g.kind });
      }
      s.enraged = s.phase === 3;
    }
    const spd = api.speed(g) * (s.enraged ? S.enrageSpeed : 1);   // enemy.js:1699-1700

    // the orbit (enemy.js:2404-2412): the core integrates vx/vz and clamps to the walls
    const O = S.orbit, phase = s.phase;
    const want = phase === 2 ? O.want.p2 : O.want.p1;
    const pspd = spd * (phase === 2 ? S.phase2Speed : 1);
    const perpX = -ddz / dist, perpZ = ddx / dist;
    const radial = dist > want + O.band ? 1 : dist < want - O.band ? -1 : 0;
    g.vx = ((ddx / dist) * radial * O.radial + perpX * s.orbitSign * O.tangent) * pspd;
    g.vz = ((ddz / dist) * radial * O.radial + perpZ * s.orbitSign * O.tangent) * pspd;
    g.faceX = ddx / dist; g.faceZ = ddz / dist;

    // the spin, for show (enemy.js:2419-2420)
    s.rotY += S.spin.y * dt;
    s.rotX += S.spin.x * dt;

    // the clock and the act's volley, from where the step began (enemy.js:2422-2443)
    s.fireT -= dt;
    if (s.fireT <= 0) {
      const opts = { color: S.bulletColor, src: g.kind };
      if (phase === 3) {
        s.fireT = S.ring.period * g.intervalMult;
        api.fire.ring(w, g.x, g.z, S.ring.count, S.ring.base, opts);
        s.ringVolleys++;
      } else if (phase === 2) {
        s.fireT = S.spiral.period * g.intervalMult;
        s.spiralA = (s.spiralA ?? w.rng.range(0, Math.PI * 2)) + S.spiral.step;
        for (let k = 0; k < S.spiral.arms; k++) api.fire.emit(w, g.x, g.z, s.spiralA + (k * Math.PI * 2) / S.spiral.arms, opts);
        s.spiralVolleys++;
      } else {
        s.fireT = S.fan.period * g.intervalMult;
        api.fire.fanSpan(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), S.fan.count, S.fan.span, opts);
        s.fanVolleys++;
      }
      s.volleys++;
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, phase, spiral: phase === 2 });
    }

    // the strobes' clocks (enemy.js:2650-2672): the phase pop runs down only
    // on a step the flash and a VOLATILE fuse do not outrank it, and that
    // step wears it — the test is `_phaseFlashT > 0` BEFORE the countdown, so
    // its last frame is the one that takes the clock to 0 (enemy.js:2666-2669);
    // the fire tell is the last 0.25 s of the clock
    s.popOn = !flashing && g.affix !== 'volatile' && s.phaseFlashT > 0;
    if (s.popOn) s.phaseFlashT -= dt;
    g.tell = s.fireT < S.tellWindow ? 1 : 0;

    // 1.x's squash spring, after the movement (enemy.js:2728-2730)
    const Q = S.squash;
    const v = (sqV - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = s.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
    s.flashEnd = g.flash;
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
