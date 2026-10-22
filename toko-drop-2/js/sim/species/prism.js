// prism.js — PRISM, 1.x's TWIN PRISMS (v174): a boss-only PAIR of magenta
// shards that orbit you in opposite directions, trading aimed volleys in
// turns; when one shatters the survivor rages at once, whatever its hp.
//
// 1.x js/enemy.js at v268: the orbit, the clocks and the rage 2447-2488, the
// tells 2666-2681, the squash 2726-2731; main.js: the boss multipliers
// 9384-9389, the pairing 9392-9400, the rage popup 10398-10407. Specs:
// docs/port-1x/arcade-mode.md §5.2, §5.4; bullets-graze.md §5.5. Every
// number is tuning/species/prism.js.
//
// Per step, in 1.x's frame order (enemy.js:2452-2487, then the emissive
// block and the squash spring):
//   THE PAIR    the director spawns two bosses, 0.4 s apart. The second to
//               arrive finds the other living PRISM (init): twinIdx 0 and 1,
//               the opposite orbit sign, and each holds the other, so the
//               survivor knows the step after its twin dies. Only a boss
//               pairs (1.x linked them in its boss branch, main.js:9381).
//   THE RAGE    a twin's death puts the survivor straight into phase 3:
//               speed × 1.45, the orbit closes 7.2 → 6.0, the spin doubles,
//               a 0.5 s gold strobe, "THE SURVIVOR RAGES!" (a `phase` event
//               for the popup) and a 0.3 shake. The calm clock already
//               running is not reset: its volley is the first ring. No hp
//               phases: a boss PRISM at 1 hp with a living twin is calm
//               (enemy.js:1688 skips PRISM).
//   THE ORBIT   OMEGA's: inside want ± 1.5 pure tangent at the orbit sign;
//               outside it, half the speed radially (in when far, out when
//               near). The arena's edge clamps it (the core's clamp, at the
//               boss's own radius — 1.x clamped at the CFG 0.85).
//   THE VOLLEY  calm: an aimed 4-fan over 0.26π every 2.8 × intervalMult;
//               raged: a 10-ring from angle 0 every 0.75 × intervalMult. The
//               body glows 0.3 s before each. 1.x's clock, literally: t −= dt,
//               out at ≤ 0, reset to the period — so on the fixed step 2.8 s
//               is 169 steps (the float residue of 168 × 1/60 is a hair over
//               zero), exactly what 1.x did at 60 Hz. Twin 0's first at 1.2 s
//               after its first active step; twin 1's half a calm period
//               after twin 0's next, counted in whole steps (strictTurns, the
//               spec's fix for 1.x's fixed 1.4 s, which lands the pair
//               together at wave 8), or 1.x's own 1.2 + 1.4 after its own
//               first step with strictTurns off.
// Its squash spring is 1.x's non-blob one (0.18 / 0.90 per frame). The core
// runs the blob spring before this step (a `custom` body), so the step takes
// that back — exactly: the core's spring is linear in the kicks it was
// handed — and runs 1.x's in its place, after the movement, as 1.x did.
// Hits are ordinary (the 1.275 circle as a boss; no blocks); it never
// touches (bosses have no contact damage in classic); a WARDEN's umbrella
// shields it like any body (the core's).
//
// Not ported: the world-bound boss rules of v266 (arcade-mode.md §5.7, depth
// worlds), the CLOSE COMBAT boss (TORO), and 1.x's lone-body pairing by
// `find` order under a pump that could place more than two.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s, F = S.fire;
    s.phase = 1;                                                 // 1.x _bossPhase (enemy.js:729)
    s.raged = false;                                             // 1.x _enraged (enemy.js:728)
    s.twinRaged = false;                                         // 1.x _twinRaged (enemy.js:2453)
    s.phaseFlashT = 0;                                           // 1.x _phaseFlashT (enemy.js:730)
    s.flashSeen = g.flash;                                       // the hit flash as the last step saw it (step)
    s.spin = 0;                                                  // 1.x mesh.rotation.y (enemy.js:2470)
    s.orbitSign = w.rng.next() < S.orbit.flip ? 1 : -1;          // 1.x _orbitSign (enemy.js:702)
    s.twin = null; s.twinIdx = 0;                                // 1.x _twin, _twinIdx (main.js:9395-9398)
    s.volleys = 0; s.rings = 0;                                  // for the look and the tests
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;                   // the squash spring as this step last left it
    g.tell = 0;
    // the pair finds each other on arrival, a boss's only (main.js:9381,
    // 9392-9400): the other living PRISM — one not yet paired, where 1.x took
    // the first in the array (the same body whenever there are two)
    const sib = g.isBoss ? w.gels.find((x) => x !== g && x.alive && x.kind === g.kind && x.s && !x.s.twin) : null;
    if (sib) {
      s.twin = sib; sib.s.twin = g;
      s.twinIdx = 1; sib.s.twinIdx = 0;
      s.orbitSign = -(sib.s.orbitSign ?? 1);
    }
    // the first volley's clock, counted down from its first active step
    // (1.x enemy.js:2471: lazily, on its first update frame)
    s.fireT = F.first + (s.twinIdx ? F.twinStagger : 0);
    if (sib && F.strictTurns) s.fireT = halfBehind(w, g, sib, F, api);
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero, O = S.orbit, F = S.fire;
    const sqV = takeBackCoreSpring(w, g, S, api);

    // the survivor rages (enemy.js:2453-2459): the step after its twin dies
    if (s.twin && !s.twin.alive && !s.twinRaged) {
      s.twinRaged = true;
      s.phase = 3;
      s.phaseFlashT = S.phaseFlash;
      // 1.x's popup, phaseShift and the booth's call ride on `phase`
      // (main.js:10398-10407); its addShake(0.3) is the core's own event
      w.events.push({ type: 'phase', id: g.id, kind: g.kind, phase: 3, x: g.x, z: g.z,
        label: S.rage.label, dur: S.rage.banner, shake: S.rage.shake });
      w.events.push({ type: 'shake', amount: S.rage.shake, id: g.id, kind: g.kind, x: g.x, z: g.z });
    }
    s.raged = s.phase === 3;
    const raged = s.raged;

    // the orbit (enemy.js:2461-2470), from where this step began
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || 0.001;
    const want = raged ? O.wantRaged : O.want;
    const pspd = S.speed * g.speedMult * (raged ? S.rageSpeed : 1);
    const perpX = -dz / dist, perpZ = dx / dist;
    const radial = dist > want + O.band ? 1 : dist < want - O.band ? -1 : 0;
    g.vx = ((dx / dist) * radial * O.radial + perpX * s.orbitSign * O.tangent) * pspd;
    g.vz = ((dz / dist) * radial * O.radial + perpZ * s.orbitSign * O.tangent) * pspd;
    g.faceX = dx / dist; g.faceZ = dz / dist;
    s.spin += (raged ? S.spin.raged : S.spin.calm) * dt;        // enemy.js:2470

    // the clock (enemy.js:2471-2487); the volley leaves from where it stood
    // as the step began, aimed from there
    s.fireT -= dt;
    if (s.fireT <= 0) {
      const opts = { color: S.bulletColor, src: g.kind };
      if (raged) {
        s.fireT = F.raged.every * g.intervalMult;
        api.fire.ring(w, g.x, g.z, F.raged.count, F.raged.base, opts);
        s.rings++;
      } else {
        s.fireT = F.calm.every * g.intervalMult;
        api.fire.fanSpan(w, g.x, g.z, api.fire.aimAngle(w, g.x, g.z), F.calm.count, F.calm.span, opts);
        s.volleys++;
      }
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, id: g.id, n: raged ? F.raged.count : F.calm.count });
    }

    // the emissive block (enemy.js:2650-2681): the hit flash holds the rage
    // strobe's clock; the tell is the last 0.3 s before a volley. 1.x tested
    // its flash BEFORE counting it down (`_flashT > 0`, then −= dt), where the
    // core counts it down before this step: so the flash was on as 1.x saw it
    // if it is still on, or if the core has just counted it down past zero (it
    // moved since this step last looked) — 8 held frames for a 0.12 s flash,
    // as in 1.x, not 7
    const flashOn = g.flash > 0 || g.flash !== s.flashSeen;
    s.flashSeen = g.flash;
    if (s.phaseFlashT > 0 && !flashOn) s.phaseFlashT -= dt;
    g.tell = s.fireT < S.tell ? 1 : 0;

    // 1.x's squash spring, after the movement (enemy.js:2728-2731)
    const Q = S.squash;
    const v = (sqV - (s.sq - 1) * Q.spring) * Q.damp;
    g.sqV = s.sqV = v;
    g.sq = s.sq = clamp(s.sq + v, Q.min, Q.max);
    s.sqTick = w.tick;
  },
};

// Strict turns (arcade-mode.md §5.4's fix): twin 1's first volley lands
// half a calm period after the sibling's next one. Counted in whole steps,
// the way both clocks will really run, so float residue cannot slip it a
// step: the sibling's next volley is the step its clock runs out (after its
// swell, if it is still swelling), mine lands half a period (rounded to a
// step) after it, and my clock is set to run out on exactly that step of my
// own — half a step of slack either side.
function halfBehind(w, g, sib, F, api) {
  const dt = api.T.sim.dt, appear = api.T.gel.appear;
  const P = F.calm.every * g.intervalMult;
  const sibNext = swellSteps(sib, appear, dt) + clockSteps(sib.s.fireT, dt);
  let k = sibNext + Math.round(P / 2 / dt) - swellSteps(g, appear, dt);
  const period = clockSteps(F.calm.every * sib.intervalMult, dt);
  while (k <= 0) k += period;
  return (k - 0.5) * dt;
}

// the steps a 1.x countdown of t lasts on the fixed step: t −= dt, out at ≤ 0
// (enemy.js:2471-2472)
function clockSteps(t, dt) { let n = 0; while (t > 0) { t -= dt; n++; } return n; }

// the steps a body has left to swell into being before its first active step
// (the core's appear: t += dt, active at ≥ appear, with no step that tick)
function swellSteps(g, appear, dt) {
  if (g.state !== 'appear') return 0;
  let t = g.t, n = 0;
  while (t < appear) { t += dt; n++; }
  return n;
}

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
