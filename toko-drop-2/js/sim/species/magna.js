// magna.js — MAGNA, 1.x's puller (v144): an amber support dome that never
// shoots. It lumbers to mid range and holds there — the pull does the
// chasing: every MAGNA within reach drags YOU toward itself on a faint amber
// tether while everything else closes in, and a dash breaks the hold.
//
// 1.x js/enemy.js at v268: the tether's state 1171-1184, the movement branch
// 1888-1906, the clocks 668/671/2724-2725, the velocity 2694-2697; main.js:
// the pull 10189-10213 (MAGNA_REACH, MAGNA_PULL, magnaImmuneT 2542-2544).
// Spec: docs/port-1x/species-a.md §7. Every number is tuning/species/magna.js.
//
// Per step:
//   IMMUNITY  1.x keeps one clock for the whole floor: every step the hero is
//             dashing it is set to 1.2, otherwise it runs down by dt; while it
//             is above 0 no MAGNA holds. The contract has no per-step world
//             hook, so every MAGNA carries a copy and ticks it on its own step
//             (all copies agree: same input, same arithmetic). One arriving
//             takes the copy of a MAGNA already watching; with none on the
//             floor it reads the clock back off the hero's dash cooldown,
//             which starts at the same step the clock first runs down.
//   THE HOLD  then, as 1.x's main.js did before the body's own update: it
//             holds you while the clock is out and you are strictly between
//             1.2 and 11 of it — immunity aside, not gated on mercy — and its
//             share is 1.1 u/s along the line to it. The floor's sum is capped
//             at 2.0 u/s in its own direction: each MAGNA adds what its share
//             moves the CAPPED running sum of the MAGNAs before it this step,
//             so the hero's pull this step is exactly cap(Σ shares) · dt
//             (w.hero.pullX/pullZ; the core applies it after the bodies move
//             and holds you inside the arena, as 1.x clamped it).
//   THE WALK  farther than keep + 1 = 9 it walks at you at api.speed(g) (the
//             wave's speedMult, SWIFT, a SIREN's surge); otherwise it stands.
//             It never backs away.
//   THE TELL  the tether's opacity (g.s.tether, which the look draws) closes
//             a quarter of the gap a step toward 0.3 + 0.15·|sin(6·clock)|
//             while it holds, else toward 0; then its own velocity is smoothed
//             for the look and its clock advances, in 1.x's order.
// No gun, no special hits (4 HP), harmless to touch in classic, no death of
// its own (the core's kill, puddle and goo; a big death at r 0.8 — the
// tether goes with it, in the look); not a HARDCADE biter.
import { TUNING } from '../../tuning.js?v=6';

const COOLDOWN = TUNING.hero.dashCooldown;           // the hero's own dash cooldown (1.x DASH_CD, player.js:8): read back, not tuned here

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.tick = -1;                                                     // the last step it ticked the immunity on
    s.immune = 0;                                                    // its copy of 1.x's `magnaImmuneT`
    s.held = false;                                                  // 1.x `_pullActive`
    s.pullX = 0; s.pullZ = 0;                                        // its share of the pull this step, u/s
    s.tether = 0;                                                    // the tether's opacity, 1.x `_tether.material.opacity` (starts 0)
    s.clock = w.rngFx.range(S.clockStart[0], S.clockStart[1]);       // 1.x `_wobbleT` (cosmetic: the look's own stream)
    s.phase = w.rngFx.range(S.phaseStart[0], S.phaseStart[1]);       // 1.x `_phase`
    s.velX = 0; s.velZ = 0;                                          // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;

    // the floor's immunity clock (1.x main.js:10194-10195)
    s.immune = s.tick === w.tick - 1 ? tickImmunity(s.immune, h, S, dt) : adoptImmunity(w, g, h, S, dt);
    s.tick = w.tick;

    // the hold and its share of the pull (1.x main.js:10196-10204)
    const mx = g.x - h.x, mz = g.z - h.z, md = Math.hypot(mx, mz);
    s.held = h.alive && s.immune <= 0 && md < S.reach && md > S.release;
    s.pullX = s.held ? (mx / md) * S.pull : 0;
    s.pullZ = s.held ? (mz / md) * S.pull : 0;
    if (s.held) {
      // the MAGNAs that have already pulled this step (1.x main.js:10206-10207)
      let ax = 0, az = 0;
      for (const o of w.gels) {
        if (o === g || o.kind !== g.kind || !o.alive || o.s.tick !== w.tick) continue;
        ax += o.s.pullX; az += o.s.pullZ;
      }
      const [x0, z0] = capped(ax, az, S.cap), [x1, z1] = capped(ax + s.pullX, az + s.pullZ, S.cap);
      h.pullX += (x1 - x0) * dt; h.pullZ += (z1 - z0) * dt;
    }

    // the walk (1.x enemy.js:1888-1894), from where the swarm forces left it
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || 0.001;
    if (dist > S.keep + S.keepBand) {
      const spd = api.speed(g);
      g.vx = (dx / dist) * spd; g.vz = (dz / dist) * spd;
    }
    g.faceX = dx / dist; g.faceZ = dz / dist;

    // the tether's glow (1.x enemy.js:1902-1903), on the clock before it advances
    const Tt = S.tether;
    const want = s.held ? Tt.base + Tt.amp * Math.abs(Math.sin(s.clock * Tt.hz)) : 0;
    s.tether += (want - s.tether) * Tt.ease;

    // what its look smears and turns by: its own movement only, as 1.x
    // measured it (the swarm forces before and the crowd after are not in it)
    s.velX += (g.vx - s.velX) * S.velSmooth; s.velZ += (g.vz - s.velZ) * S.velSmooth;
    s.clock += dt;
  },
};

// 1.x main.js:10194-10195, one step of it: a dash sets it, otherwise it runs down
function tickImmunity(t, h, S, dt) {
  if (h.dash > 0) return S.immune;
  return t > 0 ? t - dt : t;
}

// A MAGNA's first step: the floor's clock as a MAGNA already on it carries it
// (this step's tick done, or about to be), else read back off the hero. A
// dash that ended `c = dashCooldown − dashCd` ago left 1.x's clock at
// immune − dt − c (it first ran down on the step the dash ended, the step the
// cooldown was set); a cooldown already out means the dash ended at least
// `dashCooldown` (0.75 s) ago, and the 0.45 s of immunity 1.x could still
// have had then is not recoverable from the hero: it is taken as out.
function adoptImmunity(w, g, h, S, dt) {
  for (const o of w.gels) {
    if (o === g || o.kind !== g.kind || !o.alive) continue;
    if (o.s.tick === w.tick) return o.s.immune;
    if (o.s.tick === w.tick - 1) return tickImmunity(o.s.immune, h, S, dt);
  }
  if (h.dash > 0) return S.immune;
  if (h.dashCd > 0) return Math.max(0, S.immune - dt - COOLDOWN + h.dashCd);
  return 0;
}

const capped = (x, z, cap) => {
  const l = Math.hypot(x, z);
  return l > cap ? [(x * cap) / l, (z * cap) / l] : [x, z];
};
