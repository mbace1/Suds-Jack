// The rider. Pure — no DOM, no three.js, no clock — so test/core.mjs can step
// it in bare node and assert numbers.
//
// The model is a carving board, not a car: the board has a HEADING (yaw) and
// the rider has a VELOCITY, and the two are allowed to disagree. Leaning sets
// the edge; the edge turns the board along its sidecut; the velocity is then
// pulled round after the board at a rate the edge's grip allows. When the
// board asks for more than the edge can hold, the velocity lags behind — a
// slip angle — and that lag is what scrubs speed, throws spray and drains
// flow. Leaving the ground is not a button: the ground falls away faster
// than gravity can follow, and you are in the air.
//
// THE SNOWPACK is the second half of the model. The board does not ride ON
// the mountain, it rides IN it: `sink` is how far below the surface the base
// sits, and everything follows from that one number. At rest the board settles
// to the floor of the powder; speed PLANES it up out of the snowpack, and
// weight shifts the trim — back lifts the nose, forward buries it. Plowing
// costs speed in proportion to how buried you are AND how fast you are going,
// which is what makes powder a loop rather than a wall: bog down and the
// resistance falls away with you, so gravity always gets you moving again.
// Ride it fast and you skim, throw a wall of snow and score for it. Ride it
// slow, or nose-heavy, and you go over the front.

import { grabFor, offAxis, nameTrick, scoreTrick } from './tricks.js?v=1';

export const G = 9.81;
export const RUN_LENGTH = 2400;        // metres of descent in one run
export const MAX_EDGE = 0.86;          // radians of board tilt at full lean (~49°)
export const SIDECUT = 10;             // metres; the carve radius at full edge is ~SIDECUT/sin(edge)
export const GRIP_BASE = 5;            // m/s² of lateral hold on a flat board
export const GRIP_EDGE = 21;           // ...plus this much at full edge
export const DRAG = 0.0046;            // v² air drag; terminal ≈ 25 m/s on the mean grade
export const DRAG_TUCK = 0.0028;
export const MU = 0.028;               // snow friction
export const SCRUB = 3.2;              // speed lost per second, fully sideways
export const POP = 4.6;                // m/s of jump along the surface normal
// Rad/s of yaw in the air at full lean. 5.2 predates anything being landable:
// a pop gives about 0.87 s, so a 360 wanted 1.21 s and could not be completed,
// and the landing test — which has always failed you for coming down sideways —
// failed every spin anybody tried.
//
// AND THE RATES ARE CALIBRATED AGAINST A NUMBER NOBODY HAD MEASURED. What the
// mountain actually gives, logged over a whole descent with the pop on every
// three-quarters of a second: 312 airs, MEDIAN 0.72 s, p90 0.82, best 1.37.
// Every rate below is a division into that. At 7.6 the ladder is a 180 in
// 0.41 s (free, on any air), a 360 in 0.83 (the top tenth) and a 540 in 1.24
// (once a run, if ever) - which is the shape a ladder should have. Guessing a
// rate without that distribution is how the first cut put every trick in the
// game past the longest air on the hill.
export const SPIN_RATE = 7.6;
// ...AND THE STICK HAS TO MEAN SOMETHING DIFFERENT IN THE AIR, which is the
// third time this file has paid for one control meaning two things (see `tuck`
// picking a grab AND pitching the board, a few lines down). Lean steers on the
// ground and spins in the air, and at 5.2 that was invisible because a small
// corrective lean produced a few degrees nobody noticed. At 7.6 the SAME held
// stick is a quarter turn: the bare-node pilot, which steers with a +/-0.45
// lean and has no idea it is airborne, started landing sideways off the
// glacier's crevasses and the chapter read 1.8 m/s. So a spin is a COMMITTED
// stick - nothing under the deadband rotates at all, and the range above it is
// rescaled so full lean is still the full rate.
export const SPIN_DEAD = 0.45;
// Pitch in the air, from the same trim keys that mean weight-forward and
// weight-back on the ground — nose down and nose up, which is exactly what they
// already mean, and letting it run is a flip.
//
// THE COMMITMENT WINDOW IS THE MECHANIC, and it only exists because the board
// levels to the NEAREST whole rotation rather than to zero - past halfway, the
// levelling stops being a rescue and becomes the rest of the flip. Swept on an
// ordinary 0.75 s pop, by how long the pitch is held:
//
//   up to 0.35 s   you bail, it comes back, you land (peak 164 degrees)
//   0.40 - 0.55 s  THE BAND: past bailing, short of round. Every one a fall.
//   0.60 s and up  the level carries you the rest of the way. Flip.
//
// So half a second of pitch is the decision, and it is a real one in both
// directions - which is what the first cut did not have. At 7.0 the band never
// closed on an ordinary air at all: 2PI took 0.90 s where p90 of every air on
// the mountain is 0.82, so the whole of the pitch key was a crash button and a
// flip was a thing you could read about. 8.2 closes it at 0.60 on a median air
// and around 0.5 off a kicker.
export const CORK_RATE = 8.2;
// How fast the board comes back to level when you stop asking — and it comes
// back to the NEAREST WHOLE ROTATION, so going all the way round is a way of
// getting level and stopping half way is the thing that hurts.
export const LEVEL_RATE = 3.2;
// ...and not at all while a hand is on the board. That is the grab's cost: you
// are holding the board instead of correcting it.
export const LEVEL_GRABBED = 0.25;
// Radians of attitude error a landing will take before it is a fall. A quarter
// turn off is on your side.
export const LAND_TILT = 0.78;
export const TUMBLE_TIME = 1.5;
// --- powder ---
export const PLANE_MIN = 3;            // m/s below which the board simply wades
export const PLANE_FULL = 15;          // m/s at which speed alone lifts it clear
export const PLANE_LIFT = 0.85;        // how much of the pack a full plane clears
export const SINK_RATE = 7;            // 1/s — snow takes a moment to give and to let go
export const POWDER_DRAG = 0.31;       // per metre submerged, per m/s: plowing
export const TRIM_BACK = 0.5;          // float bought by weighting the tail
export const TRIM_FWD = 0.35;          // float lost by weighting the nose
export const BURIED = 0.6;             // metres of sink that counts as properly in it
export const SOFT_DEPTH = 0.8;         // metres of pack past which no edge can bite
export const DIVE_TIME = 0.9;          // seconds nose-heavy and buried before you go over

export function createRider(t, x = 0, z = 0) {
  // A NEW RIDER IS A NEW RUN, so it rides an unridden mountain. The pack is one
  // object the whole game shares, and leaving this to the caller meant every
  // bare-node test inherited whatever the previous one had churned up at the
  // origin — two unrelated checks failed on a mountain neither of them made.
  if (t.pack) { t.pack.clear(); t.pack.recentre(x, z); }
  const y = t.height(x, z);
  return {
    x, y, z, vx: 0, vy: 0, vz: -1,
    yaw: 0,              // 0 = facing -z (downhill); positive turns right (+x)
    edge: 0,             // smoothed lean, -1..1
    slip: 0,             // signed angle between velocity heading and yaw
    grounded: true, air: 0, spin: 0, spinTotal: 0,
    grab: 0,             // 0 or 1 — is a hand on the board right now
    grabKind: null,      // WHICH grab, chosen once when the hand goes down
    grabHeld: 0,         // seconds it has been held this air
    cork: 0,             // radians of pitch off level; a whole turn is a flip
    trick: '', tricks: 0, bestTrick: 0, bestName: '',
    tumble: 0, tumbles: 0,
    flow: 0,             // 0..1
    score: 0, dist: 0, speed: 0, speedMax: 0, airBest: 0, spinBest: 0,
    spray: 0,            // emission drive for the snow, 0..1+
    depth: 0,            // snowpack under the board
    sink: 0,             // how far below the surface the board is riding
    plane: 0,            // 0 wallowing, 1 skimming the top
    diveT: 0, dives: 0,  // nose-heavy-and-buried timer, and how often it caught
    deepBest: 0,         // the deepest snow ridden at speed
    n: [0, 1, 0],        // the surface normal under the board
    up: [0, 1, 0],       // the board's own up, blended in the air
    done: false, time: 0,
  };
}

const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;

// forward (sin yaw, 0, -cos yaw) projected into the plane with normal n
function forwardOn(yaw, n, out) {
  const fx = Math.sin(yaw), fz = -Math.cos(yaw);
  const d = fx * n[0] + fz * n[2];
  let x = fx - d * n[0], y = -d * n[1], z = fz - d * n[2];
  const l = Math.hypot(x, y, z) || 1;
  out[0] = x / l; out[1] = y / l; out[2] = z / l;
  return out;
}

const F = [0, 0, -1], R = [1, 0, 0];

// input: { lean: -1..1, tuck: 0..1, brake: 0..1, jump: bool (an edge), grab: bool }
// events: { land(impact, air, spin), tumble(), pop(), kicker() } — all optional
export function stepRider(s, input, dt, t, ev = {}) {
  // the pack's window follows the rider from HERE rather than from the frame
  // loop, so the carve works the same in bare node as it does on screen — left
  // to main.js it did nothing at all more than 38 m from the origin
  if (t.pack) t.pack.recentre(s.x, s.z);
  if (s.done) return s;
  dt = Math.min(dt, 1 / 30);
  s.time += dt;

  const lean = clamp(input.lean ?? 0, -1, 1);
  const tuck = clamp(input.tuck ?? 0, 0, 1);
  const brake = clamp(input.brake ?? 0, 0, 1);
  // A HAND ON THE BOARD, and which one. The grab is chosen ONCE, from what the
  // rider is already holding at the instant it goes down — change it by moving
  // the stick afterwards and it is a menu rather than a grab.
  const wantGrab = !s.grounded && !!input.grab;
  if (wantGrab && !s.grab) s.grabKind = grabFor(input.lean, input.tuck, input.brake);
  s.grab = wantGrab ? 1 : 0;
  if (!s.grab && s.grounded) s.grabKind = null;

  if (s.tumble > 0) {
    s.tumble = Math.max(0, s.tumble - dt);
  }
  const control = s.tumble > 0 ? 0 : 1;

  // the edge follows the lean with a little weight in it
  s.edge = lerp(s.edge, lean * control, Math.min(1, dt * 6.5));
  const edgeAng = s.edge * MAX_EDGE;

  if (s.grounded) {
    const n = t.normal(s.x, s.z, s.n);
    const f = forwardOn(s.yaw, n, F);
    // right = f × n
    R[0] = f[1] * n[2] - f[2] * n[1];
    R[1] = f[2] * n[0] - f[0] * n[2];
    R[2] = f[0] * n[1] - f[1] * n[0];

    // gravity in the plane
    const gn = -G * n[1];                    // g·n
    let ax = -gn * n[0], ay = -G - gn * n[1], az = -gn * n[2];
    s.vx += ax * dt; s.vy += ay * dt; s.vz += az * dt;
    // keep the velocity in the plane
    let vn = s.vx * n[0] + s.vy * n[1] + s.vz * n[2];
    s.vx -= vn * n[0]; s.vy -= vn * n[1]; s.vz -= vn * n[2];

    let speed = Math.hypot(s.vx, s.vy, s.vz);

    // ---- the float ----
    // Speed lifts the board out of the pack; trim decides where the nose is
    // pointing while it does. Both are needed: at walking pace no amount of
    // leaning back will keep you up, and at speed a nose-heavy board still digs.
    const depth = s.depth = t.depth ? t.depth(s.x, s.z) : 0;
    // The lift curve is a SQUARE ROOT, and that is the whole difference between
    // powder that rides and powder that is a wall. Plowing costs sink×speed, so
    // a linear lift leaves a hump in the middle of the speed range that gravity
    // cannot climb: the rider stalls at walking pace and never planes. A root
    // rises fast just above wading speed, which flattens the plow across the
    // range and lets a drop-in accelerate all the way through onto the plane.
    const planing = Math.sqrt(clamp((speed - PLANE_MIN) / (PLANE_FULL - PLANE_MIN), 0, 1));
    const trim = (brake * TRIM_BACK - tuck * TRIM_FWD) * control;
    const lift = clamp(planing + trim, 0, 1);
    s.plane = lift;
    const wantSink = depth * (1 - PLANE_LIFT * lift);
    s.sink += (wantSink - s.sink) * Math.min(1, dt * SINK_RATE);
    // how buried the board actually is, 0 skimming .. 1 properly in it
    const sub = clamp(s.sink / BURIED, 0, 1);
    // A tail pushed into deep snow cannot BITE — it floats. So every place the
    // brake acts as an edge (the pivot, the scrub, the grip it gives up) fades
    // in soft snow, and what is left of the input is pure trim. That is what
    // makes one key honest in both mediums instead of two keys pretending.
    //
    // It fades on the DEPTH of the pack, not on the current sink: planing lifts
    // you out, so keying it to sink gave the tail its edge back the moment the
    // float worked, and the two fought each other to a standstill. Whether an
    // edge can bite is a property of the snow you are in, not of your trim.
    const soft = clamp(depth / SOFT_DEPTH, 0, 1);
    const bite = brake * (1 - 0.85 * soft);
    if (speed > 8) s.deepBest = Math.max(s.deepBest, depth);

    if (speed > 1e-4) {
      // ---- the carve ----
      // heading of the velocity in the plane, measured against the board
      const vf = (s.vx * f[0] + s.vy * f[1] + s.vz * f[2]);
      const vr = (s.vx * R[0] + s.vy * R[1] + s.vz * R[2]);
      const slip = Math.atan2(vr, vf);                 // + means sliding right of the nose
      s.slip = slip;

      // the board turns along its sidecut; a little pivot is allowed at walking pace
      const sinE = Math.sin(edgeAng);
      const carveRate = (Math.abs(vf) / (SIDECUT / Math.max(0.02, Math.abs(sinE)))) * Math.sign(sinE || 0);
      const pivot = lean * control * 2.2 * (1 - clamp(speed / 7, 0, 1));
      // braking pivots the board across the fall line
      const brakeRate = bite * control * 2.2 * (slip >= 0 ? -1 : 1) * clamp(Math.abs(slip) < 1.3 ? 1 : 0, 0, 1);
      // past what the edge can hold the board still comes round, but as a
      // drift, not a pirouette: capped a little above the grip's own rate
      const gripNow = GRIP_BASE + GRIP_EDGE * Math.abs(sinE);
      const rateCap = Math.min(3.4, (gripNow / Math.max(speed, 2)) * 1.5 + 0.6);
      const boardRate = clamp(carveRate, -rateCap, rateCap) + pivot + brakeRate;
      s.yaw = wrap(s.yaw + boardRate * dt);

      // grip pulls the velocity round after the board — as far as the edge allows
      const grip = GRIP_BASE + GRIP_EDGE * Math.abs(sinE) * (1 - 0.7 * bite);
      const maxTurn = (grip / Math.max(speed, 2)) * dt;   // radians this step
      const k = (2.8 + 9 * Math.abs(s.edge)) * (1 - 0.75 * bite);
      // recompute slip against the board's new heading
      const f2 = forwardOn(s.yaw, n, F);
      R[0] = f2[1] * n[2] - f2[2] * n[1]; R[1] = f2[2] * n[0] - f2[0] * n[2]; R[2] = f2[0] * n[1] - f2[1] * n[0];
      const vf2 = s.vx * f2[0] + s.vy * f2[1] + s.vz * f2[2];
      const vr2 = s.vx * R[0] + s.vy * R[1] + s.vz * R[2];
      const slip2 = Math.atan2(vr2, vf2);
      // the edge resists LATERAL motion only: riding switch is a board pointing
      // the other way, not a board to be dragged round. So the velocity is
      // pulled toward whichever end of the board is nearer.
      const target = Math.abs(slip2) > Math.PI / 2 ? Math.sign(slip2) * Math.PI : 0;
      const want = (target - slip2) * Math.min(1, dt * k);
      const turn = clamp(want, -maxTurn, maxTurn);
      const held = Math.abs(want) > 1e-6 ? Math.abs(turn) / Math.abs(want) : 1;
      // rotate the velocity about the normal by `turn`
      const ang = Math.atan2(vr2, vf2) + turn;
      const sp = Math.hypot(vf2, vr2);
      const nf = Math.cos(ang) * sp, nr = Math.sin(ang) * sp;
      s.vx = f2[0] * nf + R[0] * nr; s.vy = f2[1] * nf + R[1] * nr; s.vz = f2[2] * nf + R[2] * nr;
      s.slip = wrap(slip2 + turn);

      // sliding sideways scrubs speed; so does a dragged brake — but a tail
      // pushed into deep snow FLOATS rather than skids, so the same key means
      // "scrub" on the packed line and "get the nose up" in the powder
      const side = Math.abs(Math.sin(s.slip));
      // a flat board sliding slowly barely scrubs, or a side-hill would be a trap
      const scrub = (SCRUB * side * clamp(speed / 6, 0.12, 1) + bite * 3.5) * dt;
      speed = Math.hypot(s.vx, s.vy, s.vz);
      // plowing: proportional to how buried you are AND how fast — so it falls
      // away as you slow, and a bog is somewhere you crawl out of, never a trap
      const plow = POWDER_DRAG * s.sink * speed;
      const drag = (tuck ? lerp(DRAG, DRAG_TUCK, tuck) : DRAG) * speed * speed
        + MU * G * n[1] + plow;
      const loss = Math.min(speed, scrub + drag * dt);
      if (speed > 0) { const kk = (speed - loss) / speed; s.vx *= kk; s.vy *= kk; s.vz *= kk; }
      speed -= loss;

      // what the snow sees: an edge throws a fan, a buried board throws a wall
      const skid = side * (1 - held * 0.5) + (1 - held);
      s.spray = clamp(speed / 20, 0, 1.4)
        * (Math.abs(sinE) * 1.25 + skid * 1.8 + bite * 1.3)
        + sub * clamp(speed / 12, 0, 1.6) * 0.85;

      // THE BOARD DISPLACES THE SNOW IT RIDES THROUGH. It goes through the
      // terrain's own snowpack rather than through an import, so physics.js
      // keeps no state of its own and a test can hand it a mountain with no
      // pack at all. `cut` clamps to what is actually lying there, so a second
      // pass over your own trench finds nothing left to move and the groove
      // stops deepening on its own — no rate limiter, no decay, no cap.
      // A BOARD DISPLACES THE SNOW IT SWEEPS THROUGH, so a board that is not
      // sweeping displaces nothing. Without this a standing start excavates a
      // pit to its full sink depth and lays the berm in a complete ring around
      // itself — the run never left the bowl, because the rider had walled
      // itself in before it reached walking pace. The ramp is over the speed at
      // which the board actually clears its own trough radius in a fraction of
      // a second rather than re-cutting one spot fifty times.
      const sweep = clamp((speed - 2) / 4, 0, 1);
      if (t.pack && s.sink > 0.02 && sweep > 0) {
        // a board on edge cuts a narrower, deeper trough than one running flat
        const rTrough = 0.62 - 0.18 * Math.abs(s.edge);
        // and throws its berm to the OUTSIDE of the turn, which is away from
        // the direction it is leaning
        const rx = Math.cos(s.yaw), rz = Math.sin(s.yaw);
        const sgn = -Math.sign(s.edge || 0);
        // the trough is as deep as the board is buried — a target, not a rate
        t.pack.cut(s.x, s.z, rTrough, s.sink * sweep,
          t.natural, sgn * rx, sgn * rz, Math.sin(s.yaw), -Math.cos(s.yaw));
      }

      // flow: a clean carve at speed earns it, a scrub spends it — and a fast
      // line through deep snow earns the most, because that is the whole point
      const carving = Math.abs(s.edge) > 0.3 && side < 0.35 && speed > 7 && control;
      // Surfing is DEEP SNOW RIDDEN WELL, so it is keyed to the snow you are in
      // and how well you are staying on top of it — not to how buried you are.
      // Keyed to sink it paid you for sinking, which is the opposite of the skill.
      const surfing = depth > 0.7 && speed > 9 && control;
      if (carving) s.flow += dt * 0.22 * clamp(speed / 16, 0.4, 1.4);
      else if (side > 0.5 || bite > 0.3) s.flow -= dt * 0.3;
      else s.flow -= dt * 0.03;
      if (surfing) s.flow += dt * 0.18 * clamp(depth / 1.2, 0.4, 1.4) * (0.4 + 0.6 * lift);
      s.flow = clamp(s.flow, 0, 1);
      if (carving) s.score += dt * speed * (0.6 + s.flow * 2.4) * (1 + Math.abs(s.edge));
      if (surfing) s.score += dt * speed * depth * 1.6 * (1 + s.flow) * (0.4 + 0.6 * lift);

      // ---- over the front ----
      // Buried, nose-heavy and quick is the powder way to fall: the nose digs,
      // the tail comes up, and the mountain arrives. It takes a moment, so it
      // can be felt coming and ridden out of by getting the weight back.
      const noseHeavy = sub > 0.7 && trim < 0 && speed > 8 && control;
      s.diveT = noseHeavy ? s.diveT + dt : Math.max(0, s.diveT - dt * 2);
      if (s.diveT >= DIVE_TIME) {
        s.diveT = 0; s.dives++; s.tumble = TUMBLE_TIME; s.tumbles++;
        s.flow = Math.max(0, s.flow - 0.5);
        s.vx *= 0.25; s.vy *= 0.25; s.vz *= 0.25;
        ev.dive?.(s.sink);
      }
    } else {
      s.spray = 0;
      s.slip = 0;
    }

    // ---- the pop ----
    // Leaving the ground means the board comes OUT of its trench: the sink goes
    // and the rider starts from the surface. Without that the jump began below
    // the snow, the landing test fired on the same frame, and a pop in powder
    // was a stutter rather than a jump. A soft base also gives less back — you
    // cannot spring off powder the way you can off a packed lip.
    if (input.jump && control) {
      const boost = POP * (0.85 + 0.15 * clamp(speed / 20, 0, 1)) * (1 - 0.45 * soft);
      s.vx += n[0] * boost; s.vy += n[1] * boost; s.vz += n[2] * boost;
      s.y = t.height(s.x, s.z); s.sink = 0;
      s.grounded = false; s.air = 0; s.spin = 0;
      ev.pop?.();
    }

    // ---- move, and find out whether the ground stayed under you ----
    const x1 = s.x + s.vx * dt, z1 = s.z + s.vz * dt;
    const yStraight = s.y + s.vy * dt;
    const h1 = t.height(x1, z1);
    // the board rides sunk INTO the pack, so the line it follows is the surface
    // less the sink — which is also why deep snow makes it harder to get air
    const ride1 = h1 - s.sink;
    s.x = x1; s.z = z1;
    // the ground has to drop away by more than a free body would fall in the
    // same step; the small constant is there for float noise, not for feel
    if (s.grounded && ride1 < yStraight - 0.5 * G * dt * dt - 0.003 && speed > 3) {
      // the terrain dropped away faster than gravity: airborne, and again the
      // board leaves its trench rather than dragging it into the air
      s.grounded = false; s.air = 0; s.spin = 0;
      s.y = Math.max(yStraight, h1); s.sink = 0;
      if (speed > 8) ev.kicker?.();        // thrown by the hill, not by a button
    } else if (s.grounded) {
      s.y = ride1;
    } else {
      s.y = yStraight;
    }
    s.up[0] = n[0]; s.up[1] = n[1]; s.up[2] = n[2];
  } else {
    // ---- the air ----
    s.vy -= G * dt;
    const drag = DRAG * 0.6 * Math.hypot(s.vx, s.vy, s.vz);
    s.vx -= s.vx * drag * dt; s.vz -= s.vz * drag * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.air += dt;
    s.sink += (0 - s.sink) * Math.min(1, dt * 8);   // the snow lets go behind you
    s.plane = 1; s.diveT = 0;
    const mag = Math.abs(lean);
    const spinIn = mag <= SPIN_DEAD ? 0 : Math.sign(lean) * (mag - SPIN_DEAD) / (1 - SPIN_DEAD);
    const rot = spinIn * control * SPIN_RATE * dt;
    s.yaw = wrap(s.yaw + rot); s.spin += rot;
    s.spray = 0;
    if (s.grab) s.grabHeld += dt;

    // PITCH, from the trim keys that already mean weight forward and weight
    // back — which is exactly what they mean here: nose down and nose up. Let
    // it run and it is a flip.
    // ...and NOT while a hand is on the board. The trim keys pick which grab the
    // hand finds, so without this a Nose grab pitches you into a flip you never
    // asked for — the same key meaning two things in the same instant. It also
    // gives the grab its second cost: holding one, you cannot change your
    // attitude at all, only wait.
    const pitch = s.grab ? 0 : (tuck - brake) * control;
    s.cork += pitch * CORK_RATE * dt;
    // and it comes back to the NEAREST WHOLE ROTATION rather than to zero, so
    // going all the way round is a way of getting level and stopping half way
    // is the thing that hurts. Not at all while a hand is on the board: that is
    // the grab's cost, and the reason letting go is a decision rather than a
    // formality.
    if (Math.abs(pitch) < 0.01) {
      const home = Math.round(s.cork / (Math.PI * 2)) * Math.PI * 2;
      const rate = LEVEL_RATE * (s.grab ? LEVEL_GRABBED : 1);
      s.cork += (home - s.cork) * Math.min(1, dt * rate);
    }
    // the board's own up, pitched off level by the cork about its lateral axis.
    // BLENDED rather than assigned: `up` leaves the ground holding the surface
    // normal, so writing the target straight in snaps it level on the first air
    // frame and the figure pops. Fast enough to follow a flip, slow enough that
    // the take-off is a take-off.
    const cs = Math.cos(s.cork), sn = Math.sin(s.cork);
    const fx = Math.sin(s.yaw), fz = -Math.cos(s.yaw);
    const uk = Math.min(1, dt * 8);
    s.up[0] = lerp(s.up[0], -fx * sn, uk);
    s.up[1] = lerp(s.up[1], cs, uk);
    s.up[2] = lerp(s.up[2], -fz * sn, uk);
    if (s.air > 0.12) s.flow = clamp(s.flow + dt * 0.08, 0, 1);

    const h = t.height(s.x, s.z);
    if (s.y <= h) {
      // ---- the landing ----
      s.y = h;
      const n = t.normal(s.x, s.z, s.n);
      const vn = s.vx * n[0] + s.vy * n[1] + s.vz * n[2];
      const impact = Math.max(0, -vn);
      if (vn < 0) { s.vx -= vn * n[0]; s.vy -= vn * n[1]; s.vz -= vn * n[2]; }
      const f = forwardOn(s.yaw, n, F);
      const sp = Math.hypot(s.vx, s.vy, s.vz);
      const along = sp > 0.01 ? (s.vx * f[0] + s.vy * f[1] + s.vz * f[2]) / sp : 1;
      const sideways = Math.sqrt(Math.max(0, 1 - along * along));
      // landing backwards is a fakie, landing across the line at speed is a fall
      // deep snow is a pillow: it forgives an impact and a crossed-up landing
      // that would put you down on the packed line
      const cush = t.depth ? t.depth(s.x, s.z) : 0;
      // AND THE BOARD HAS TO BE LEVEL. Until v9 the attitude was decorative —
      // `up` lerped to the horizon on its own and nothing read it — so a spin
      // was free and the only way to blow a landing was to come down sideways.
      // Now a cork you did not bring back is a cork you land on, which is what
      // makes going all the way round the skill rather than the flourish.
      const tilt = offAxis(s.cork);
      const bad = (sideways > 0.8 + cush * 0.12 && sp > 6 + cush * 5)
        || impact > 15 + cush * 9
        || (tilt > LAND_TILT + cush * 0.25 && sp > 5);
      const spins = Math.round(Math.abs(s.spin) / Math.PI) * 180;
      s.grounded = true;
      s.airBest = Math.max(s.airBest, s.air);
      // punch in: a landing buries the board and the float has to lift it out
      s.sink = Math.min(cush, cush * 0.45 + impact * 0.05);
      s.y = h - s.sink;
      if (bad) {
        s.tumble = TUMBLE_TIME; s.tumbles++; s.trick = '';
        s.flow = Math.max(0, s.flow - 0.5);
        s.vx *= 0.35; s.vy *= 0.35; s.vz *= 0.35;
        ev.tumble?.(impact);
      } else {
        // pointing backwards is allowed: the board simply rides switch
        if (along < 0) s.yaw = wrap(s.yaw + Math.PI);
        // what the hands were worth, rather than how long you were up there
        const trick = { air: s.air, spin: s.spin, cork: s.cork, grab: s.grabKind, held: s.grabHeld };
        const bonus = scoreTrick(trick) * (1 + s.flow);
        if (s.air > 0.25) {
          s.score += bonus;
          s.flow = clamp(s.flow + 0.08 + s.air * 0.1, 0, 1);
          s.trick = nameTrick(trick);
          if (s.trick) s.tricks++;
          // the NAME of the best one, not just its number — a recap saying
          // `1,204` tells you nothing about what you did to earn it
          if (bonus > s.bestTrick) { s.bestTrick = bonus; s.bestName = s.trick; }
        }
        s.spinBest = Math.max(s.spinBest, spins);
        ev.land?.(impact, s.air, spins, s.grabKind, s.trick, bonus);
      }
      s.spin = 0; s.grab = 0; s.grabKind = null; s.grabHeld = 0; s.cork = 0;
      s.up[0] = n[0]; s.up[1] = n[1]; s.up[2] = n[2];
    }
  }

  // a wall is a wall: a monolith stops the board
  const tile = t.TILE;
  const ix = Math.floor(s.x / tile), iz = Math.floor(s.z / tile);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    for (const m of t.monolithsIn(ix + dx, iz + dz)) {
      const rad = m.arch ? 0 : Math.max(m.w, m.d) * 0.5 + 0.6;
      if (!rad) continue;
      const ddx = s.x - m.x, ddz = s.z - m.z;
      const d = Math.hypot(ddx, ddz);
      if (d < rad && s.y < m.y + m.h) {
        const px = ddx / (d || 1), pz = ddz / (d || 1);
        s.x = m.x + px * rad; s.z = m.z + pz * rad;
        const into = s.vx * px + s.vz * pz;
        if (into < 0) { s.vx -= into * px; s.vz -= into * pz; }
        if (s.tumble <= 0 && -into > 4) {
          s.tumble = TUMBLE_TIME; s.tumbles++; s.flow = Math.max(0, s.flow - 0.5);
          s.vx *= 0.3; s.vz *= 0.3; ev.tumble?.(8);
        }
      }
    }
  }

  s.speed = Math.hypot(s.vx, s.vy, s.vz);
  s.speedMax = Math.max(s.speedMax, s.speed);
  s.dist = Math.max(s.dist, -s.z);
  if (s.dist >= RUN_LENGTH) { s.done = true; s.spray = 0; ev.done?.(); }
  return s;
}
