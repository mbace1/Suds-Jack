// botfly.js — BOTFLY, 1.x's flying bot (v88): a pink satin sphere that
// hovers on translucent wings, holds a mid range from you while it drifts
// round you, and every 3.8 s launches the game's only homing shot — slow, and
// steered by a lag that a moving hero can outrun.
//
// 1.x js/enemy.js at v268: the constructor 674, 1230-1247; the movement
// 2280-2294; the charge flicker 2682-2685; the squash spring 2728-2731; the
// clock and the shot 2784-2785, 2873-2875, 2934-2946; js/bullet.js: the
// homing 121-131, 196-203; js/main.js: the launch zip 10473-10479. Spec:
// docs/port-1x/bullets-graze.md §2.4, §3.2, §5.1, §5.5. Every number is
// tuning/species/botfly.js.
//
// Per step, in 1.x's frame order (enemy.js:1672-2786, then bullet.js):
//   THE ORBIT   from where the swarm forces left it: u = unit(hero − pos),
//               perp = (−u.z, u.x); pos += (u·radial + perp·sign·0.8)·speed·dt,
//               radial +1 past 9.5, −1 inside 6.5, else 0 (not normalised).
//               The sign is ±1, drawn once at spawn. 1.x writes the position,
//               so do we (an outside knock still lands: the core adds it after);
//               1.x had no wall, 2.0's core has, so against one it slides.
//   THE CHARGE  1.x's emissive block reads the clock BEFORE this frame's tick:
//               g.tell (and s.charge, the look's flicker) is 1 while
//               clock ≥ 3.8 × iM − 0.5.
//   THE SPRING  1.x's non-blob squash spring (0.18 / 0.90), after the move;
//               the core ran the blob one before this step, so it is taken
//               back first (OMEGA's port does the same).
//   THE SHOT    clock += dt; at ≥ 3.8 × iM it is reset to 0 (the remainder
//               dropped: whole steps) and ONE bullet leaves from where the move
//               put it (_tick re-reads the position, enemy.js:2875), aimed at
//               the hero now, at 0.62 × 7 = 4.34 u/s in 0xff66ee; a −0.5 kick
//               to the squash spring after this step's spring; a gelShot event
//               (1.x's launch zip). The first shot comes 3.3–3.8 s in (the clock
//               starts at U(0, 0.5)).
//   THE HOMING  every BOTFLY shot on the floor, once a step, before the core
//               integrates it: t = unit(hero − b)·speed; v += (t − v)·min(1,
//               1.8·dt) — 1.x's velocity LERP (bullet.js:196-203), not the
//               core's constant-speed turn cap. It closes 3% of the gap a step,
//               so it lags a hero who keeps moving and slows while it turns.
//               See steer() below for who steers it.
// Hits are ordinary (2 hp, the 0.5 circle on the floor: the hover is only
// drawn); touching it does not hurt; it has no death of its own (the core's
// kill, its blob pop and goo, HARDCADE's AIMED bite — a plain burst, never
// homing).
//
// Not ported: 1.x's generic boss enrage (enemy.js:1683-1700), which no
// classic BOTFLY reaches — classic bosses are OMEGA and the PRISMS.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.t = w.rng.range(S.fireStart[0], S.fireStart[1]);           // 1.x `_t = Math.random() * 0.5` (enemy.js:674)
    s.orbit = w.rng.next() < S.orbitNegative ? -1 : 1;           // 1.x `_botOrbit` (enemy.js:1235)
    s.charge = false;                                            // the flicker this step wears (the look reads it)
    s.shots = 0;                                                 // shots launched, for the tests
    s.sq = g.sq; s.sqV = g.sqV; s.sqTick = -1;                   // the squash spring as this step last left it
    g.tell = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const sqV = takeBackCoreSpring(w, g, S, api);

    // the orbit (enemy.js:2280-2287), from where this step began (1.x ex/ez, enemy.js:1680-1682)
    const ddx = h.x - g.x, ddz = h.z - g.z, dist = Math.hypot(ddx, ddz) || 0.001;
    const perpX = -ddz / dist, perpZ = ddx / dist;
    const radial = dist > S.hold + S.holdBand ? S.radial : dist < S.hold - S.holdBand ? -S.radial : 0;
    const spd = api.speed(g);
    g.x += ((ddx / dist) * radial + perpX * s.orbit * S.orbit) * spd * dt;
    g.z += ((ddz / dist) * radial + perpZ * s.orbit * S.orbit) * spd * dt;
    api.clamp(w, g);
    g.faceX = ddx / dist; g.faceZ = ddz / dist;

    // the charge-up, read before the tick as 1.x's emissive block read it (enemy.js:2682-2683)
    const interval = S.fireInterval * g.intervalMult;
    s.charge = s.t >= interval - S.chargeWindow;
    g.tell = s.charge ? 1 : 0;

    // 1.x's non-blob squash spring, after the move (enemy.js:2728-2731)
    const Q = S.squashSpring;
    let v = (sqV - (s.sq - 1) * Q.spring) * Q.damp;
    const sq = clamp(s.sq + v, Q.min, Q.max);

    // the clock and the shot (enemy.js:2784-2785, 2875, 2934-2946)
    s.t += dt;
    if (s.t >= interval) {
      s.t = 0;
      const ex = g.x, ez = g.z, ax = h.x - ex, az = h.z - ez, angle = Math.atan2(az, ax);
      const b = api.fire.emit(w, ex, ez, angle, { color: S.bulletColor, src: g.kind, speedMult: S.shot.speedMult });
      if (b) {
        // standing exactly on it, 1.x's aim is (0, 0) / (0 || 1): the shot sits still until the homing moves it
        if (ax === 0 && az === 0) b.vx = b.vz = 0;
        b.lerpTurn = S.shot.turnRate; b.lerpTick = -1;
      }
      v += S.shot.squash;
      s.shots++;
      w.events.push({ type: 'gelShot', x: ex, z: ez, kind: g.kind, id: g.id, homing: true, angle });
    }
    g.sqV = s.sqV = v;
    g.sq = s.sq = sq;
    s.sqTick = w.tick;

    steer(w, dt);
  },

  // The last BOTFLY standing hands its shots on: nothing steers them with
  // 1.x's lerp once no BOTFLY steps, so they fly on under the core's homing
  // (the same 1.8, as a turn-rate cap at constant speed) — 1.x kept steering
  // them for the rest of their 4 s. A BOTFLY still swelling into being does
  // not count: it does not step yet.
  onKill(w, g) {
    if (w.gels.some((o) => o !== g && o.alive && o.state === 'active' && o.kind === g.kind)) return;
    for (const b of w.bullets) if (b.lerpTurn && !b.dead) { b.homing = b.lerpTurn; b.lerpTurn = 0; }
  },
};

// 1.x's homing (bullet.js:124-129, 196-203), for every BOTFLY shot on the
// floor that has not been steered this step. Each BOTFLY's step runs it, so
// the first one to step steers every shot (its own and any whose BOTFLY has
// died), and a later one only the shot it has just launched: once a step
// each, before the core integrates it — the place 1.x's bullets.update steers
// it, after every body has moved and fired.
function steer(w, dt) {
  const h = w.hero;
  for (const b of w.bullets) {
    if (b.dead || !b.lerpTurn || b.lerpTick === w.tick) continue;
    b.lerpTick = w.tick;
    const dx = h.x - b.x, dz = h.z - b.z, len = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, b.lerpTurn * dt);
    b.vx += ((dx / len) * b.speed - b.vx) * k;
    b.vz += ((dz / len) * b.speed - b.vz) * k;
  }
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
