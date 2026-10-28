// magna.js — MAGNA, 1.x's puller (v144): an amber support dome that never
// shoots. It lumbers to mid range and holds there — the pull does the
// chasing: every MAGNA within reach drags YOU toward itself on a faint amber
// tether while everything else closes in, and a dash breaks the hold.
//
// 1.x js/enemy.js at v268: the tether's state 1171-1184, the movement branch
// 1888-1906, the clocks 668/671/2724-2725, the velocity 2694-2697; main.js:
// the pull 10189-10213 (MAGNA_REACH, MAGNA_PULL, magnaImmuneT 2542-2544),
// the swarm forces after it 10231-10360, the bodies' own updates 10369.
// Spec: docs/port-1x/species-a.md §7. Every number is tuning/species/magna.js.
//
// 1.x's frame, which this keeps: the hero moves; THEN the whole floor's pull
// is worked out, from where every MAGNA stood at the end of the last frame,
// and moves the hero; THEN the swarm forces move the bodies; THEN each MAGNA
// walks, toward where the pull has left the hero. 2.0's step runs the swarm
// forces before any body's step and applies the pull after them all, so the
// first MAGNA to step each step works out the floor for every MAGNA:
//
//   IMMUNITY  1.x keeps one clock for the whole floor: every step the hero is
//             dashing it is set to 1.2, otherwise it runs down by dt; while it
//             is above 0 no MAGNA holds. The contract has no per-step world
//             hook, so every MAGNA carries a copy, written each step by the
//             one that works out the floor from the copy of a MAGNA that held
//             it the step before. With none on the floor last step it is read
//             back off the hero's dash cooldown, which starts on the same step
//             the clock first runs down (a gap: see adoptClock).
//   THE HOLD  each MAGNA holds you while the clock is out and you are
//             strictly between 1.2 and 11 of where it STOOD at the start of
//             the step (g.px/g.pz: 1.x's pull reads the bodies before the
//             swarm forces move them) — immunity aside, not gated on mercy.
//             Its share is 1.1 u/s along the line to it; the floor's sum is
//             capped at 2.0 u/s in its own direction and added to
//             w.hero.pullX/pullZ once, as 1.x moved the hero once (the core
//             applies it after the bodies move and holds you in the arena).
//   THE WALK  from where the swarm forces left it, toward where the pull
//             leaves you (1.x's e.update reads player.position after the
//             pull): farther than keep + 1 = 9 it walks at api.speed(g) (the
//             wave's speedMult, SWIFT, a SIREN's surge); otherwise it stands.
//             It never backs away.
//   THE TELL  the tether's opacity (g.s.tether, which the look draws) closes
//             a quarter of the gap a step toward 0.3 + 0.15·|sin(6·clock)|
//             while it holds, else toward 0; then its own velocity is smoothed
//             for the look and its clock advances, in 1.x's order.
// No gun, no special hits (4 HP), harmless to touch in classic, no death of
// its own (the core's kill, puddle and goo; a big death at r 0.8 — the
// tether goes with it, in the look); not a HARDCADE biter. A PUSH dash's
// knock is the core's (g.kx/g.kz on top of the walk's g.vx/g.vz); a CUT
// dash's damage is the core's too. Neither changes the hold: any dash is a
// dash to 1.x's clock.
import { TUNING } from '../../tuning.js?v=57';

// read back, not tuned here: the hero's own numbers (1.x player.js:8, 17)
const COOLDOWN = TUNING.hero.dashCooldown;           // DASH_CD 0.75, from the dash's end
const HERO_R = TUNING.hero.radius;                   // PLAYER_RADIUS 0.5: the pull's clamp (1.x main.js:10209-10212)

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.tick = -1;                                                     // the last step the floor was worked out for it
    s.immune = 0;                                                    // its copy of 1.x's `magnaImmuneT`
    s.held = false;                                                  // 1.x `_pullActive`
    s.heroX = w.hero.x; s.heroZ = w.hero.z;                          // where this step's pull leaves the hero
    s.tether = 0;                                                    // the tether's opacity, 1.x `_tether.material.opacity` (starts 0)
    s.clock = w.rngFx.range(S.clockStart[0], S.clockStart[1]);       // 1.x `_wobbleT` (cosmetic: the look's own stream)
    s.phase = w.rngFx.range(S.phaseStart[0], S.phaseStart[1]);       // 1.x `_phase`
    s.velX = 0; s.velZ = 0;                                          // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s;

    // the floor's pull (1.x main.js:10189-10213), once a step, by the first MAGNA to step
    if (s.tick !== w.tick) holdFloor(w, g, S, dt);

    // the walk (1.x enemy.js:1888-1894), from where the swarm forces left it
    const dx = s.heroX - g.x, dz = s.heroZ - g.z, dist = Math.hypot(dx, dz) || 0.001;
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

// The floor this step, worked out by `g`, the first MAGNA to step. Its
// members are `g` and every live MAGNA after it in the step order that is
// active — each of those steps this step, a new one included: a body is live
// from its first step, as 1.x's pump landed it before the pull (main.js:
// 9350-9436, then 10189-10213). 1.x sums the shares in the bodies' order and
// caps the sum (main.js:10196-10207).
function holdFloor(w, g, S, dt) {
  const h = w.hero, immune = floorClock(w, g, h, S, dt);
  const gels = w.gels, members = [];
  for (let i = gels.indexOf(g); i < gels.length; i++) {
    const o = gels[i];
    if (o.kind === g.kind && o.alive && (o === g || o.state === 'active')) members.push(o);
  }
  let px = 0, pz = 0;
  for (const o of members) {
    const s = o.s, mx = o.px - h.x, mz = o.pz - h.z, md = Math.hypot(mx, mz);
    s.tick = w.tick; s.immune = immune;
    s.held = h.alive && immune <= 0 && md < S.reach && md > S.release;
    if (s.held) { px += (mx / md) * S.pull; pz += (mz / md) * S.pull; }
  }
  const l = Math.hypot(px, pz);
  if (l > S.cap) { px *= S.cap / l; pz *= S.cap / l; }
  h.pullX += px * dt; h.pullZ += pz * dt;
  // where it leaves you once the core has applied it (hero.js applyPull: the
  // move, then the arena clamp, as 1.x clamped it, main.js:10209-10212)
  const hx = Math.max(-w.hx + HERO_R, Math.min(w.hx - HERO_R, h.x + px * dt));
  const hz = Math.max(-w.hz + HERO_R, Math.min(w.hz - HERO_R, h.z + pz * dt));
  for (const o of members) { o.s.heroX = hx; o.s.heroZ = hz; }
}

// 1.x main.js:10194-10195 for this step: from a MAGNA that held the floor the
// step before (alive or killed since: its copy was the floor's), else read
// back off the hero.
function floorClock(w, g, h, S, dt) {
  for (const o of w.gels) if (o.kind === g.kind && o.s.tick === w.tick - 1) return tickImmunity(o.s.immune, h, S, dt);
  return adoptClock(h, S, dt);
}

// one step of 1.x's clock: a dash sets it, otherwise it runs down
function tickImmunity(t, h, S, dt) {
  if (h.dash > 0) return S.immune;
  return t > 0 ? t - dt : t;
}

// With no MAGNA on the floor last step, 1.x's clock read back off the hero. A
// dash that ended `c = dashCooldown − dashCd` ago left it at immune − dt − c
// (it first ran down on the step the dash ended, the step the cooldown was
// set). A cooldown already out means the dash ended at least `dashCooldown`
// (0.75 s) ago, and the 0.45 s of immunity 1.x could still have had then is
// not recoverable from the hero: it is taken as out (a contract gap — the
// core would have to keep 1.x's floor clock, or the time since the last dash).
function adoptClock(h, S, dt) {
  if (h.dash > 0) return S.immune;
  if (h.dashCd > 0) return Math.max(0, S.immune - dt - COOLDOWN + h.dashCd);
  return 0;
}
