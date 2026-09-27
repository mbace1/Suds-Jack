// Vehicle — the simulation, and the reason this build exists.
//
// Nothing here is a lerp toward a target pose. The craft is a rigid body with
// four hover pads, and everything you see it do falls out of forces:
//
//   HEAVE / PITCH / ROLL  Each pad springs against the ground height under it
//                         and damps its own vertical velocity. The moments
//                         those four forces make about the centre of mass ARE
//                         the pitch and roll — so cresting a dune pitches the
//                         nose, a hard turn rolls it onto the outside pads,
//                         and weight transfer is not simulated separately
//                         because it is just where the load went.
//   THRUST                A turbine with spool lag. Throttle commands N1, N1
//                         chases it over about a second, and thrust goes as
//                         N1 squared. You cannot stab the throttle out of a
//                         mistake; you have to keep the turbine lit.
//   GRIP                  Lateral force is linear in slip speed up to a
//                         friction limit set by the surface and the load
//                         currently on the pads. Past the limit it saturates
//                         and the craft slides — a real breakaway, and it
//                         happens sooner on gravel and sooner when light.
//   WALLS                 Not special-cased. Any ground steeper than ~34
//                         degrees that you are closing on returns an impulse
//                         along its normal, so canyon walls, mesa sides and
//                         boulder flanks all behave without knowing about
//                         each other.
//
//   TWO CHASSIS           v5: rockets on the NOSE or rockets AFT, and they
//                         handle differently because the thrust is applied
//                         where the rockets are. Front: thrust along the
//                         steered nose pulls you through the corner and eats
//                         the front's grip (push); lift off and the tail
//                         comes round. Rear: thrust along the body eats the
//                         REAR's grip — power mid-corner and the tail steps
//                         out — while the front keeps its bite for a sharper
//                         turn-in; lift off and it settles. Same code path,
//                         one parameter: which axle the rockets are on.
//   WEIGHT                v5: the right stick is the snowboarder's lean. Back
//                         boosts and lifts the nose (a hot rod on the launch)
//                         — the front runners unload and float over the deep
//                         stuff. Forward presses the nose down like a front
//                         spoiler: more front load, more bite, no braking,
//                         and on deep sand the nose digs in and ploughs.
//   THE EDGE              carving in the direction the body has rolled earns
//                         extra grip — committing to the turn is rewarded,
//                         which is what makes a carve feel like a carve.
//   FRONT DRIVE           Second pass, on the owner's direction: the sleds are
//                         rocket-propelled at the FRONT, and they feel like a
//                         front-wheel-drive hot rod. Thrust acts along the
//                         steered front, so under power the nose is PULLED
//                         through the corner. Grip is per axle from the pad
//                         loads the suspension already computes: power eats
//                         the driven front's traction circle (push), and
//                         lifting off transfers load forward, unloads the
//                         rear, and the tail comes round (lift-off rotation).
//                         Neither is scripted; both fall out of the loads.
//   SINKING SAND          Each runner settles into soft ground under load and
//                         relaxes back out — the sled sits lower, ploughs
//                         harder, and the outside runners sink more in a
//                         carve because that is where the load went. The
//                         lateral bite arrives LATE on soft sand (the shear
//                         relaxation), which is the sand shifting under you.
//
// Integrated at a fixed 120 Hz on an accumulator, because a spring this stiff
// is not stable on a variable frame time.
import * as THREE from 'three';
import { PAL } from './palette.js?v=12';
import { SURF, SALT } from './terrain.js?v=12';
import { buildCraft, disposeCraft, POD } from './craft.js?v=12';

const G = 9.81;
const HZ = 120, DTF = 1 / HZ;

export const SPEC = {
  mass: 1400,
  hw: 1.6, hl: 3.0,          // pad half-track, half-wheelbase
  // v11: 2.6 m floated the old kit two metres off the sand. A formula car
  // sits low — its floor ~0.14 m up — and the pads' dynamics do not care
  // where the zero of the spring is (the natural frequency, the travel to
  // lift-off and every moment are unchanged), so the cushion came down.
  rest: 0.75,                // hover cushion height
  padK: 30000, padC: 4200,   // per pad
  Ixx: 2600, Iyy: 9000, Izz: 8700,
  thrust: 17000,             // N at N1 = 1
  odThrust: 8500,            // overdrive adds this
  drag: 2.18,                // N per (m/s)^2, x the surface multiplier
  slipK: 6000,               // lateral N per m/s of slip, before the mu limit
  steerLock: 0.30,           // rad the front is steered at full lock
  // Full lock at 140 km/h is a slide whatever the rudder does, because the
  // sustainable yaw rate falls as 1/v. So the lock the driver can ask for
  // shrinks with speed — the same thing every racer does, and a physical
  // truth about steering racks under load.
  // v12 (owner: "miniscule movements at high speed and more snowboarding
  // like at lower speeds"): it shrinks as 1/v rather than on a line, because
  // the yaw rate a given lateral g needs IS 1/v — so the stick asks for the
  // same g at every speed past lockRef, and at 180 km/h a quarter of it is a
  // correction, not a swerve. 1.0 to 20 m/s, 0.67 at 30, 0.5 at 40, 0.4 at 50.
  lockRef: 20, lockMin: 0.34,
  // Rudder and yaw damping are a PAIR, and they set two DIFFERENT things: the
  // steady yaw rate under full lock is steer/yawDamp, and the time to reach it
  // is Izz/yawDamp. The old 9000/12000 gave 0.75 rad/s after a 0.73 s time
  // constant — measured, the heading moved 1.8 degrees in the first quarter
  // second of full lock, which is a quarter second of the game ignoring you.
  //
  // But steer/yawDamp is NOT the whole story, and assuming it was cost a tuning
  // pass. The axle forces are themselves a yaw damper: yawing swings the axles
  // sideways through the ground, and the lateral forces that answer oppose the
  // yaw. Measured, that is ~54 kN.m per rad/s — MORE than yawDamp — so while
  // the runners have grip the sled is far lazier than steer/yawDamp predicts
  // (half lock at 90 km/h gave 0.11 rad/s when the arithmetic said 0.24), and
  // it only wakes up once it is already sliding and that damping has gone.
  // Lazy while planted and eager while sliding is exactly backwards.
  //
  // So the rudder is big AND it FADES WITH SLIP (`bite`): it is the runners
  // biting, not an air vane, and once they are sliding they cannot point the
  // sled any more. Big-while-gripping gives an answer to small inputs;
  // fading-while-sliding is what stops the driver steering into a spin.
  steer: 45000,              // extra yaw N.m at full lock (rudder), on top of the pull
  steerFade: 0.75,           // how much of it slip takes away
  steerFadeSlip: 7,          // m/s of slip over which it fades
  yawDamp: 35000,
  // THE WEATHERVANE — directional stability, and the single thing this model
  // was missing. A long body with a slip angle wants to line back up with
  // where it is actually going; that restoring moment is why a real vehicle
  // does not spin the instant the rear steps out. Without it the yaw moment
  // from the front axle just kept growing once the rear saturated: measured,
  // full lock from a cruise ran away to 1.41 rad/s with 18.6 m/s of slide and
  // never came back. It is tanh-saturated, so it arrives hard at small slip
  // (stability) but caps (you can still hold a slide on full lock).
  // Measured at 520 with no speed cap: at 40 m/s the restoring moment reached
  // 20.8 kN.m against a 22 kN.m rudder, so half lock produced 7 m/s of slide
  // and almost no yaw — the sled washed wide without ever changing heading,
  // which is the worst thing a car can do. Capping the speed term means it
  // stabilises without ever out-arguing the driver.
  weather: 320,              // N.m per m/s of forward speed, at saturated slip
  weatherSpeed: 25,          // m/s the speed term stops growing at
  weatherSlip: 6,            // m/s of slip at which it is ~76% saturated
  // How much of the front's grip the thrust eats. Measured: at 0.55 the
  // front had NO lateral force under full power (thrust is ~1.2 g here, the
  // axle carries ~6 kN) and the sled could only push. A hot rod pushes; it
  // does not lose its nose. 0.18 takes ~15% off the front at full throttle.
  circle: 0.18,              // how much of the driven axle's grip the thrust eats
  // m below the CoM the boost line acts: the wheelie moment. Measured: at
  // 1.35 the boost unloaded the front axle by 52% (6712 N to 3202 N) and the
  // sled simply would not turn while lit, so anything that boosted drove
  // straight into the first wall. A hot rod lifts its nose; it does not lose
  // the ability to steer. 0.75 halves the unload and keeps the drama.
  liftLever: 0.75,
  spoiler: 2.2,              // N per (m/s)^2 of nose-down force at full forward lean
  edge: 0.28,                // extra mu earned by carving into the roll
  // Per chassis. Measured: with the rear sled given the same rudder as the
  // front, it turned less than half as hard (yawRate 0.22 vs 0.51), because
  // only the front sled gets the thrust-vector pull. So the rear carries a
  // much bigger rudder to match turn-in, and a bigger traction circle so
  // that power mid-corner is what steps the tail out. Both numbers exist to
  // make the two sleds different in CHARACTER at similar pace.
  // rearSteer was 1.9 against a 9000 rudder. Against 45000 that made the aft
  // sled three times twitchier than the nose sled at quarter lock, which is
  // not "a different character", it is a different game. Re-measured at 1.15.
  // v12: rearCircle 0.28 → 0.14. At 0.28 full power ate so much of the rear
  // grip that the aft sled slid 8–10 m/s at a QUARTER lock from 30 m/s up —
  // every input a slide, the opposite of "miniscule movements at high speed".
  // At 0.14 a quarter lock at 180 km/h is 5 degrees and no slide, and it is
  // still the looser of the two at half lock (4 m/s against 1.4): power
  // still steps the tail out, it just has to be asked. (ladder.mjs)
  rearSteer: 1.15, rearCircle: 0.14,
  // Thrust goes as N1 squared, so a 1.3 s spool was 1.4 s from idle to HALF
  // thrust: press the throttle and the game does nothing for a second and a
  // half. 0.75 keeps the lag you can hear and cuts that to 0.8 s.
  spoolUp: 0.75, spoolDown: 0.6,
  brakeDrag: 7.0,               // measured at 5.2: 140 to 107 km/h in the first second, and a hover sled with no runners to dig in needs the brake to mean something

  // ---- v11: CARVING IN POWDER --------------------------------------------
  // The owner: "the feel is comparable to carving in powder". Flowsnow (the
  // snowboarding cabinet, PR #480) had already measured most of what that
  // takes; these are its ideas mapped onto four pads.
  //
  // PLANING. Speed brings you UP: the sink a loaded pad settles to falls as
  // speed builds, on a SQUARE-ROOT curve. Flowsnow found the linear version
  // made sink x speed peak mid-range and stalled riders at a walk; the root
  // is "the whole difference between powder that rides and powder that is a
  // wall". Slow is deep and draggy, fast is on top and light.
  planeMin: 4, planeFull: 34, planeLift: 0.8,
  // PLOUGH, per pad, proportional to how deep that pad is and how fast it is
  // going — applied AT the pad, so a buried nose pitches down and a dug-in
  // edge yaws the sled toward itself. (It replaces a v^2 drag multiplier at
  // the centre of mass, which could do neither.) And a Coulomb part: the
  // wallow from rest, gone once you are planing.
  plow: 120,                 // N per (m of sink x m/s), per pad
  wallow: 0.20,              // x pad load x (sink / surface depth), N
  // THE BANK. The cushion leans the car INTO the turn — the inside pads
  // shorten — the way a board goes up on its edge. Driven by the steering
  // (the pilot tips in first) and held by the lateral g.
  // v12: the bank depends on SPEED. Slow, it is a board — deep over on its
  // edge, the pilot throwing it in (bankSteerSlow) before any g has built;
  // fast, it is a rocket sled — a few degrees, set by the g and nothing else.
  // Blended from bankSlowTo to bankFastFrom m/s.
  bank: 0.20,                // rad per g of lateral acceleration
  bankSteer: 0.08,           // rad at full lock, before any g has built — fast
  bankMax: 0.20,             // rad, ~11 degrees — fast
  bankSteerSlow: 0.34,       // the same, slow
  bankMaxSlow: 0.48,         // rad, ~27 degrees — slow
  bankSlowTo: 12, bankFastFrom: 40,
  bankLag: 0.12,             // s
  // THE EDGE, redefined. v4-v10 paid a grip bonus for rolling onto the
  // OUTSIDE runners — and nothing in the model ever rolled the body in a
  // turn (the lateral forces never entered the roll moment), so on flat
  // ground it was dead code: 0.0 degrees of roll at 0.6 g, measured. Now the
  // edge is the bank into the turn you are steering: up on the edge, it
  // grips; flip the steering and for the moment the car rolls through level
  // it has no edge and slides. That moment is the rhythm of carving.
  edge: 0.38,                // extra mu at full edge
  edgeFull: 0.14,            // rad of bank into the steer for full edge
  edgeDig: 0.5,              // m of extra sink per m the bank lowers a pad
  plantFloat: 0.4,           // how much planing takes off the edge's dig (the edge still cuts at speed)
  rollArm: 0.55,             // m below the CoM the lateral forces act (roll out)
};

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Vehicle {
  constructor(terrain, opts = {}) {
    this.terrain = terrain;
    this.isPlayer = !!opts.isPlayer;
    this.accent = opts.accent ?? PAL.accents[0];
    this.number = opts.number ?? 1;
    this.power = opts.power ?? 1;
    this.basePower = this.power;
    this.drive = opts.drive === 'rear' ? 'rear' : 'front';
    this.lean = 0;                      // the weight axis as the sled feels it

    this.pos = new THREE.Vector3(opts.x ?? 0, 0, opts.z ?? 0);
    // spawn at the equilibrium ride height, not at rest length, or every
    // run starts with the whole field dropping and bouncing
    this.pos.y = terrain.height(this.pos.x, this.pos.z) + SPEC.rest
      - (SPEC.mass * G) / (4 * SPEC.padK);
    this.vel = new THREE.Vector3(0, 0, -20);
    this.yaw = 0;                       // forward is (sin y, 0, -cos y), so 0 faces -z
    this.pitch = 0; this.roll = 0;
    this.yawRate = 0; this.pitchRate = 0; this.rollRate = 0;

    this.n1 = 0.15;                     // turbine spool, 0..1
    this.heat = 0;                      // 0..1; overdrive builds it, 1 trips out
    this.tripped = false;
    this.damage = 0;
    this.grounded = false;
    this.load = 0;                      // total pad force, N
    this.slip = 0;                      // lateral slip speed, m/s
    this.gLat = 0; this.gLong = 0;
    this.surf = SALT;
    this.gap = SPEC.rest;
    this.airT = 0;
    this.hitT = 0;
    this.impact = 0;                    // set on a wall strike, read by main
    this.riftT = 0;                     // seconds run on the canyon floor
    this._acc = 0;
    this._rocks = [];
    this._g = { h: 0, surf: 0, deck: false };
    this.onDeck = false;
    this.sink = 0;                      // mean runner sink, m — read by the HUD
    this.bite = 1;                      // rudder authority left, 1 planted, 0 sliding
    this.plane = 0;                     // v11: 0 wallowing .. 1 on top, from speed
    this.bankT = 0;                     // v11: the bank the cushion is leaning toward, rad
    this._gLatF = 0;                    // lateral g, smoothed, drives the bank
    this.edge = 0;                      // v11: 0..1, up on the edge into the turn
    this.steerVis = 0;                  // the steer actually applied, for the pods
    this._FLf = 0; this._FLr = 0;       // relaxed axle forces (the sand's lag)
    this._lastThrust = 0;
    this.aiT = 0; this.aiOff = 0;

    this.throttle = 0;                  // commanded, for the flame's rich/lean read
    this.mesh = buildCraft(opts.env || null, this.accent, this.number, this.drive);
    terrain.scene.add(this.mesh);
    this._n = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pads = [
      { x: -SPEC.hw, z: -SPEC.hl }, { x: SPEC.hw, z: -SPEC.hl },
      { x: -SPEC.hw, z: SPEC.hl }, { x: SPEC.hw, z: SPEC.hl },
    ].map(p => ({ ...p, gap: SPEC.rest, f: 0, fS: 0, wx: 0, wz: 0, wy: 0, sink: 0, frac: 0, on: false, touch: false, gy: null }));
    this._n = new THREE.Vector3();
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get kph() { return this.speed * 3.6; }
  get overdrive() { return this._od; }

  update(dt, ctl) {
    this._acc = Math.min(this._acc + dt, 0.25);   // never spiral after a stall
    while (this._acc >= DTF) { this.stepFixed(DTF, ctl); this._acc -= DTF; }
    this.pose(dt);
  }

  // --------------------------------------------------------------- dynamics
  stepFixed(dt, ctl) {
    const T = this.terrain;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // forward is -z at yaw 0; right is +x. Same convention as the camera rig.
    const fx = sinY, fz = -cosY;
    const rx = cosY, rz = sinY;

    // ---- weight: the lean settles over ~0.2 s, like shifting your stance ---
    const wantLean = clamp(ctl.lean ?? (ctl.overdrive ? 1 : 0), -1, 1);
    this.lean += (wantLean - this.lean) * Math.min(1, dt / 0.2);

    // ---- turbine ---------------------------------------------------------
    let throttle = clamp(ctl.throttle, 0, 1);
    this.throttle = throttle;
    this._od = !!ctl.overdrive && !this.tripped && this.heat < 1;
    if (this.tripped) throttle = Math.min(throttle, 0.55);
    const tau = throttle > this.n1 ? SPEC.spoolUp : SPEC.spoolDown;
    this.n1 += (throttle - this.n1) * (dt / tau);
    this.heat += ((this._od ? 0.30 : -0.20) - (this.tripped ? 0.06 : 0)) * dt;
    this.heat = clamp(this.heat, 0, 1);
    if (this.heat >= 1) this.tripped = true;
    if (this.tripped && this.heat < 0.35) this.tripped = false;

    // ---- the steer, and the bank it asks for ------------------------------
    const speed0 = Math.hypot(this.vel.x, this.vel.z);
    const lockScale = Math.max(SPEC.lockMin, SPEC.lockRef / Math.max(speed0, SPEC.lockRef));
    const steerIn = clamp(ctl.steer, -1, 1) * lockScale;
    this.steerVis = steerIn;
    // planing: speed brings the pads up out of the sand, on a square root
    this.plane = Math.sqrt(clamp((speed0 - SPEC.planeMin) / (SPEC.planeFull - SPEC.planeMin), 0, 1));
    // the bank: the pilot tips in with the stick and the lateral g holds it.
    // roll > 0 is right-side-down, and a right turn (steer > 0, gLat > 0)
    // leans the car into it — the board up on its edge
    this._gLatF += (this.gLat - this._gLatF) * Math.min(1, dt / 0.1);
    const fast = clamp((speed0 - SPEC.bankSlowTo) / (SPEC.bankFastFrom - SPEC.bankSlowTo), 0, 1);
    const bankMax = SPEC.bankMaxSlow + (SPEC.bankMax - SPEC.bankMaxSlow) * fast;
    const bankSteer = SPEC.bankSteerSlow + (SPEC.bankSteer - SPEC.bankSteerSlow) * fast;
    // steerIn has the speed's lock already taken out of it; the lean the
    // pilot throws is on the STICK, so it reads ctl.steer
    const wantBank = this.grounded
      ? clamp(SPEC.bank * this._gLatF + bankSteer * clamp(ctl.steer, -1, 1), -bankMax, bankMax) : 0;
    this.bankT += (wantBank - this.bankT) * Math.min(1, dt / SPEC.bankLag);
    const sinBank = Math.sin(this.bankT), sinRoll = Math.sin(this.roll);

    // ---- suspension: four pads, and the moments they make ----------------
    let Fy = 0, Mpitch = 0, Mroll = 0;
    let contacts = 0, onDeck = false;
    const cosP = Math.cos(this.pitch), cosR = Math.cos(this.roll);
    for (const pad of this.pads) {
      // pad position in world, using the body's yaw and its current attitude.
      // The body frame has its nose at -z (the kit, and every moment below:
      // tau_x = -z*F), so a pad at local z sits `-z` along the FORWARD
      // vector. v11: this read `+ fx * lz` from the rebuild on, which put the
      // front pads' feet on the ground BEHIND the car and the rear pads' in
      // front — self-consistent, so nothing ever diverged, but every crest
      // unloaded the wrong end first and the car rode nose-up down the grade
      const lx = pad.x * cosR, lz = pad.z * cosP;
      pad.wx = this.pos.x + rx * lx - fx * lz;
      pad.wz = this.pos.z + rz * lx - fz * lz;
      // and its height on the body, from pitch and roll about the centre
      // nose-up (pitch > 0) lifts the FRONT pads (z is negative forward);
      // roll > 0 is right-side-down, so it lowers the pads with positive x
      pad.wy = this.pos.y - pad.z * Math.sin(this.pitch) - pad.x * Math.sin(this.roll);
      // two-layer ground: a bridge deck if we are on one, the floor otherwise
      const g = T.groundUnder(pad.wx, pad.wz, pad.wy, this._g);
      if (g.deck) onDeck = true;
      // the runner has settled into the sand by `sink`: the ground it sits on
      // is that much lower, so the sled rides lower and ploughs harder
      const gy = g.h - pad.sink;
      const gap = pad.wy - gy;
      pad.gap = gap;
      // how fast the ground under this pad is rising, from the last step —
      // the damper has to damp the pad RELATIVE to it (see below)
      const gRate = pad.gy === null ? 0 : clamp((gy - pad.gy) / dt, -6, 6);
      pad.gy = gy;
      // the bank is the cushion itself leaning: the inside pads shorten, so
      // the springs HOLD the car on its edge rather than fight it
      const restP = SPEC.rest - pad.x * sinBank;
      if (gap < restP) {
        contacts++;
        const comp = restP - gap;
        // v11: RELATIVE to the ground. v4 put the whole field on a 4.5%
        // grade and the damper still measured the pad's absolute vertical
        // speed — so at 40 m/s down the mountain, sinking ~1.8 m/s just by
        // following the ground, every damper read that as its pad being
        // crushed and pushed ~7.5 kN, the car floated at the cushion's edge
        // (v10's HUD sat at GAP = rest on the descent) and the pads chattered
        // in and out of contact every few steps. Uphill it did the opposite.
        const padVy = this.vel.y - this.pitchRate * pad.z - this.rollRate * pad.x - gRate;
        let f = SPEC.padK * comp - SPEC.padC * padVy;
        if (f < 0) f = 0;                    // a cushion pushes, it never pulls
        pad.f = f;
        Fy += f;
        // settle: a loaded runner sinks toward the surface's limit and eases
        // back out when unloaded. Time constants are what make it feel like
        // the ground giving rather than a step.
        const sS = SURF[g.deck ? 4 : g.surf];
        // lean back and the nose planes over the deep stuff; lean forward and
        // it digs in. Front runners only — that is where the weight moved.
        const front = pad.z < 0;
        const leanK = front ? 1 - this.lean * 0.55 : 1 + this.lean * 0.15;
        // v11: PLANING takes the sink off as speed builds, and the EDGE puts
        // some back under the pads the bank has pushed down — the inside
        // edge cuts, and keeps cutting at speed (planing takes less off it)
        // The dig is gated by the EDGE — steering into the bank — never by
        // the bank alone. Ungated, it was a spin: any stray lateral g banked
        // the car, the lowered pads dug in, their plough yawed it toward
        // them, which was more lateral g — measured, a straight run with the
        // stick centred went to 20 m/s of slide in a second. A board turns
        // when it is tipped, but only a rider tips it.
        const soft = sS.sink / 0.55;
        const lowered = Math.max(0, pad.x * sinRoll) * this.edge;
        // v11: the sink follows a SMOOTHED load. Following the instantaneous
        // one was a limit cycle, and it predates this version (v10's HUD sat
        // at GAP = rest on deep sand): a loaded pad dug the ground out from
        // under itself, lost contact, the sand came back, and it chattered on
        // and off every few steps — which every per-pad effect then saw as
        // flicker. Averaged over ~0.12 s the pad sits IN the sand.
        const want = sS.sink * Math.min(2.2, pad.fS / (SPEC.mass * G / 4)) * leanK * (1 - SPEC.planeLift * this.plane)
                   + lowered * SPEC.edgeDig * soft * (1 - SPEC.plantFloat * this.plane);
        // landing in soft sand punches the pad in: the plop, not a bounce
        // (closing speed relative to the ground, like the damper)
        if (!pad.on && -padVy > 2) pad.sink = Math.max(pad.sink, Math.min(sS.sink * 1.2, -padVy * 0.035 * soft));
        pad.sink += (want - pad.sink) * Math.min(1, dt / (want > pad.sink ? 0.30 : 0.55));
        pad.frac = pad.sink / Math.max(0.05, sS.sink);
        pad.on = true;
        // Torque of a vertical force about the centre of mass: tau_x = -z*F,
        // tau_z = +x*F. Getting the pitch sign wrong here does not look like a
        // wrong sign, it looks like the craft being fired into orbit — more
        // load at the back pitches the nose DOWN, and the inverted version is
        // a positive feedback loop that saturates the attitude in half a
        // second. Both terms are written so that a displaced craft restores.
        Mpitch -= f * pad.z;
        Mroll -= f * pad.x;
      } else { pad.f = 0; pad.on = false; pad.sink += (0 - pad.sink) * Math.min(1, dt / 0.55); }
      pad.fS += (pad.f - pad.fS) * Math.min(1, dt / 0.12);
      // TOUCHING, for the sand's effects (grooves, spray, the glow): within
      // a few cm of the cushion, not the spring's exact on/off
      pad.touch = gap < restP + 0.08;
    }
    this.grounded = contacts > 0;
    this.onDeck = onDeck;
    this.load = Fy;
    // the front spoiler: nose-down force that grows with the square of the
    // airspeed, applied at the front axle — more front load, a pitch-down
    // moment, and almost no drag. It is not a brake.
    const vSq = this.vel.x * this.vel.x + this.vel.z * this.vel.z;
    if (this.lean < 0) {
      const Fs = -this.lean * SPEC.spoiler * vSq;
      Fy -= Fs;                                   // presses the body down
      Mpitch -= Fs * SPEC.hl;                     // tau_x = -z*F at z=-hl, F down
      this.pads[0].f += Fs * 0.5; this.pads[1].f += Fs * 0.5;   // front carries it
    }
    this.gap = Math.min(...this.pads.map(p => p.gap));
    this.sink = (this.pads[0].sink + this.pads[1].sink + this.pads[2].sink + this.pads[3].sink) / 4;

    // The pads push along the SURFACE NORMAL, not straight up. On the flat it
    // makes no difference; on the mountain it is the whole difference — the
    // horizontal part of that push is what pulls you down the grade.
    T.normalAt(this.pos.x, this.pos.z, this._n);
    const nx = this._n.x, nz = this._n.z;
    let FxN = 0, FzN = 0;
    if (!onDeck) { FxN = Fy * nx * 0.85; FzN = Fy * nz * 0.85; }

    if (this.grounded) this.airT = 0; else this.airT += dt;

    // ---- surface ---------------------------------------------------------
    this.surf = onDeck ? 4 : T.surfaceAt(this.pos.x, this.pos.z);
    const S = SURF[this.surf];

    // ---- longitudinal ----------------------------------------------------
    const v = this.vel;
    const speed = Math.hypot(v.x, v.z);
    const vF = v.x * fx + v.z * fz;
    const vL = v.x * rx + v.z * rz;
    this.slip = vL;

    const airborne = !this.grounded;
    let thrust = SPEC.thrust * this.n1 * this.n1 * this.power;
    if (this._od) thrust += SPEC.odThrust * this.n1;
    // A rocket does not need the ground — but airborne ALSO gets a third off
    // the drag, and at 0.60 the two together made air time a speed exploit:
    // the autopilot fell into the rift and accelerated to 260 km/h against a
    // 140 cruise. 0.40 keeps a jump from killing the engine without paying you
    // to be off the ground.
    if (airborne) thrust *= 0.40;
    if (this.hitT > 0) thrust *= 0.3;

    // The rockets are on the FRONT and they point where the front is
    // steered. So thrust has a lateral component at the nose, and a yaw
    // moment with it: the pull through the corner that makes a front-drive
    // car drive the way it does.
    const frontDrive = this.drive === 'front';
    // front rockets point where the front is steered; rear rockets point
    // along the body and cannot pull the nose anywhere
    const delta = frontDrive ? steerIn * SPEC.steerLock : 0;
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const tx = fx * cd + rx * sd, tz = fz * cd + rz * sd;
    let Fx = tx * thrust + FxN, Fz = tz * thrust + FzN;
    // torque about the CoM from a lateral force at the front (z = -hl):
    // tau_y = -hl * F_lat, and our yaw is right-positive (= -rotation about
    // +y), so it enters as +hl. Positive steer under power turns right.
    let Mz = frontDrive ? SPEC.hl * thrust * sd : 0;
    // the boost line sits below the centre of mass: hit it and the nose
    // lifts, the front runners unload, and you are a hot rod off the line.
    // Rear rockets sit further back and lift it harder.
    if (this._od) {
      const lever = SPEC.liftLever * (frontDrive ? 0.7 : 1.15) * Math.max(0, this.lean);
      Mpitch += SPEC.odThrust * this.n1 * lever;
    }
    // torque steer: a sharp rise in thrust tugs the nose on rough ground
    const dT = thrust - this._lastThrust;
    this._lastThrust = thrust;
    if (frontDrive && this.grounded && dT > 0) Mz += dT * 0.9 * (S.drag - 0.8) * Math.sin(this.pos.x * 0.7 + this.pos.z * 0.3);

    // body drag
    const kd = SPEC.drag * (airborne ? 0.7 : S.drag) + (ctl.brake ? SPEC.brakeDrag : 0);
    Fx -= kd * speed * v.x;
    Fz -= kd * speed * v.z;
    // v11: the PLOUGH, at each pad — how deep it is times how fast it goes,
    // plus the wallow of a pad sat deep at walking pace. At the pad, so a
    // buried nose pitches the car down and a dug-in edge yaws it toward
    // itself. It used to multiply the v^2 drag at the centre of mass, which
    // could do neither.
    if (this.grounded && speed > 0.05) {
      const ux = v.x / speed, uz = v.z / speed;
      const aF = vF / speed, aL = vL / speed;          // share along the body / across it
      const walk = Math.tanh(speed / 1.5);
      for (const pad of this.pads) {
        if (!pad.on) continue;
        const F = SPEC.plow * pad.sink * speed + SPEC.wallow * pad.f * Math.min(1, pad.frac) * walk;
        Fx -= ux * F; Fz -= uz * F;
        const Fb = F * aF, Fl = -F * aL;               // back along the body, across it
        Mz += pad.x * Fb - pad.z * Fl;                 // right-positive yaw
        Mpitch -= Math.max(0.2, pad.gap) * Fb;         // drag below the CoM pitches the nose down
      }
    }

    // ---- grip, per axle, from the loads the pads are actually carrying ----
    // Front cap loses what the thrust is using (traction circle): power-on
    // push. Rear cap is just mu x rear load: lift off, weight goes forward,
    // the rear unloads, and the tail comes round. The rear force sits behind
    // the centre of mass and straightens the sled out of a slide; the front
    // force sits ahead of it and does the opposite. Which wins is the load.
    if (this.grounded) {
      const Ff = this.pads[0].f + this.pads[1].f, Fr = this.pads[2].f + this.pads[3].f;
      const used = thrust * (frontDrive ? SPEC.circle : SPEC.rearCircle);
      // THE EDGE (v11): up on the edge, banked INTO the turn you are
      // steering, the runners bite harder. Flip the steering and for the
      // moment the car rolls back through level there is no edge at all —
      // that moment is the rhythm of carving, and a flat sled just slides.
      const edge = clamp(this.roll * Math.sign(steerIn) / SPEC.edgeFull, 0, 1) * Math.min(1, Math.abs(steerIn) * 3);
      this.edge = edge;
      const mu = S.mu * (1 + SPEC.edge * edge);
      let capF = mu * Ff, capR = mu * Fr;
      // the driven axle loses what the thrust is using — traction circle
      if (frontDrive) capF = Math.sqrt(Math.max(0, capF * capF - used * used));
      else            capR = Math.sqrt(Math.max(0, capR * capR - used * used));
      // lateral speed at each axle: v + omega x r, with our right-positive yaw
      const vLf = vL + this.yawRate * SPEC.hl;
      const vLr = vL - this.yawRate * SPEC.hl;
      let FLf = clamp(-vLf * SPEC.slipK * 0.5, -capF, capF);
      let FLr = clamp(-vLr * SPEC.slipK * 0.5, -capR, capR);
      // the sand's lag: on soft ground the bite arrives late, and that delay
      // is the ground shifting under you mid-carve
      const kS = Math.min(1, dt / Math.max(0.005, S.shear));
      this._FLf += (FLf - this._FLf) * kS;
      this._FLr += (FLr - this._FLr) * kS;
      FLf = this._FLf; FLr = this._FLr;
      Fx += rx * (FLf + FLr); Fz += rz * (FLf + FLr);
      // front force at z=-hl enters as +hl, rear at z=+hl as -hl (see thrust)
      Mz += SPEC.hl * (FLf - FLr);
      // and the lateral forces act at the ground, below the centre of mass:
      // they roll the body OUT of the turn, as they do a car. v4-v10 never
      // had this term, so no turn ever rolled the sled at all. The bank leans
      // it in harder than this rolls it out, which is the point of a bank.
      Mroll -= (FLf + FLr) * SPEC.rollArm;
    } else { this._FLf *= 0.9; this._FLr *= 0.9; this.edge = 0; }

    // ---- walls: any steep ground you are closing on pushes back ----------
    const nh = Math.hypot(this._n.x, this._n.z);
    if (!onDeck && nh > 0.56 && this.gap < SPEC.rest * 1.4) {
      const nx = this._n.x / nh, nz = this._n.z / nh;
      const closing = v.x * nx + v.z * nz;
      if (closing < 0) {
        const j = -closing * 1.55;
        v.x += nx * j; v.z += nz * j;
        const sev = -closing;
        if (sev > 7 && this.hitT <= 0) {
          this.hitT = 0.55;
          // capped per strike: at 0.012/(m/s) a single wall hit at speed took
          // three quarters of the hull and one mistake ended the run
          this.damage = Math.min(1, this.damage + Math.min(0.22, sev * 0.005));
          this.impact = sev;
          this.yawRate += (Math.random() - 0.5) * 1.4;
        }
      }
    }

    // ---- boulders --------------------------------------------------------
    // Not on a deck: the piers are registered as boulders so the floor run
    // has to thread them, but the test is horizontal-only, and a sled up on
    // the bridge would otherwise strike pier tops forty metres beneath it.
    if (this.grounded && !onDeck && this.hitT <= 0) {
      const rocks = T.rocksNear(this.pos.x, this.pos.z, this._rocks);
      for (let i = 0; i < rocks.length; i++) {
        const r = rocks[i];
        const dx = this.pos.x - r.x, dz = this.pos.z - r.z;
        const d = Math.hypot(dx, dz);
        if (d < r.r + 2.2 && d > 0.001) {
          const nx = dx / d, nz = dz / d;
          const closing = v.x * nx + v.z * nz;
          if (closing < 0) {
            v.x -= nx * closing * 1.6; v.z -= nz * closing * 1.6;
            this.hitT = 0.5;
            this.impact = -closing;
            this.damage = Math.min(1, this.damage + Math.min(0.16, -closing * 0.004));
            this.yawRate += (Math.random() - 0.5) * 1.8;
          }
          break;
        }
      }
    }

    // ---- integrate translation ------------------------------------------
    v.x += Fx / SPEC.mass * dt;
    v.z += Fz / SPEC.mass * dt;
    v.y += (Fy / SPEC.mass - G) * dt;
    this.gLong = (fx * Fx + fz * Fz) / SPEC.mass / G;
    this.gLat = (rx * Fx + rz * Fz) / SPEC.mass / G;
    this.pos.x += v.x * dt;
    this.pos.y += v.y * dt;
    this.pos.z += v.z * dt;

    // never let a bad frame put the hull under the world
    const floor = T.groundUnder(this.pos.x, this.pos.z, this.pos.y, this._g).h + 0.4;
    if (this.pos.y < floor) { this.pos.y = floor; if (v.y < 0) v.y = -v.y * 0.2; }

    // ---- steering and attitude ------------------------------------------
    // These are ROCKET sleds: the nozzles work whether or not a runner is
    // touching, so losing a crest should not also lose the steering. On the
    // dune field the craft is airborne ~17% of the time at speed, and at the
    // old 0.30 that read as the controls cutting out at random.
    const steerGain = this.grounded ? 1 : 0.55;
    // full rudder by 10 m/s, and a quarter of it at a standstill so the sled
    // can be pointed while parked. The old ramp did not saturate until 26 m/s.
    const auth = clamp(Math.abs(vF) / 10, 0.25, 1);
    // the runners can only point the sled while they are still biting
    const bite = 1 - SPEC.steerFade * Math.tanh(Math.abs(this.slip) / SPEC.steerFadeSlip);
    this.bite = bite;
    Mz += steerIn * SPEC.steer * (frontDrive ? 1 : SPEC.rearSteer) * auth * steerGain * bite;
    // The weathervane. Sign: `slip` is the velocity component along the RIGHT
    // vector, and yaw is right-positive, so sliding right (slip > 0) needs a
    // POSITIVE moment to bring the nose round to meet the direction of travel.
    // Getting this backwards does not read as a sign error — it reads as the
    // sled crabbing sideways down the flats on its own, which is how the last
    // one was caught.
    Mz += Math.tanh(this.slip / SPEC.weatherSlip)
        * Math.min(Math.abs(vF), SPEC.weatherSpeed) * SPEC.weather
        * (this.grounded ? 1 : 0.35);
    Mz -= this.yawRate * SPEC.yawDamp * (this.grounded ? 1 : 0.5);
    this.yawRate += Mz / SPEC.Izz * dt;
    this.yaw += this.yawRate * dt;

    this.pitchRate += (Mpitch / SPEC.Iyy) * dt;
    this.rollRate += (Mroll / SPEC.Ixx) * dt;
    // aerodynamic + structural damping, and a weak level-seeking term in air
    this.pitchRate -= this.pitchRate * 2.6 * dt;
    this.rollRate -= this.rollRate * 3.0 * dt;
    if (airborne) {
      this.pitchRate -= this.pitch * 1.4 * dt;
      this.rollRate -= this.roll * 2.0 * dt;
    }
    this.pitch = clamp(this.pitch + this.pitchRate * dt, -0.7, 0.7);
    this.roll = clamp(this.roll + this.rollRate * dt, -0.9, 0.9);

    if (this.hitT > 0) this.hitT -= dt;
    if (this.grounded && !onDeck && this.surf === SALT && speed > 25) this.riftT += dt;
  }

  // ---------------------------------------------------------------- visuals
  pose(dt = 0.016) {
    this.mesh.position.copy(this.pos);
    // yaw is right-positive and a rotation about +y turns the nose LEFT, so
    // the mesh takes -yaw. v11: it took +yaw from the rebuild on — the
    // physics and the camera turned one way and the ship the other, so at a
    // heading of 20 degrees the car sat 40 degrees off the way it was going,
    // and through every turn it swung its nose out of the corner
    this._e.set(this.pitch, -this.yaw, -this.roll, 'YXZ');
    this.mesh.quaternion.setFromEuler(this._e);
    const th = this.n1 * (this._od ? 2.4 : 1);
    // RICH when the throttle is ahead of the spool — the turbine is being
    // fed more than it can burn, the flame goes orange and short — LEAN once
    // N1 has caught up: paler, longer, the diamonds streaming. Lifting off
    // starves it and the sheath collapses to the core.
    const rich = Math.max(0, Math.min(1, (this.throttle - this.n1) * 3.5));
    const flick = 0.85 + Math.random() * 0.3;
    const U = this.mesh.userData;
    // the nose cans vector with the steering — thrust pulls the front where
    // it is steered, so the exhaust leaves the other way (vehicle.stepFixed)
    const vec = this.drive === 'front' ? -this.steerVis * SPEC.steerLock : 0;
    for (const f of U.flares) {
      const u = f.userData, b = u.base || 1;
      f.rotation.y = vec;
      f.scale.set(b * (1 + rich * 0.25), b * (1 + rich * 0.25), b * (0.2 + th * 1.4) * (1 - rich * 0.3) * flick);
      u.core.material.opacity = 0.5 + th * 0.4;
      u.core.material.color.setRGB(2.2 - rich * 0.6, 2.1 - rich * 0.9, 1.9 - rich * 1.2 + (this._od ? 0.6 : 0));
      u.sheath.material.opacity = 0.2 + th * 0.35 + rich * 0.25;
      u.sheath.material.color.setRGB(1.6 + rich * 0.3, 0.9 - rich * 0.35, 0.45 - rich * 0.25);
      // v11: smaller — at the formula seat the old glow was a white blob
      // the size of the cockpit sitting in the middle of the car
      u.glow.material.opacity = 0.10 + th * 0.22;
      u.glow.scale.setScalar(0.9 + th * 0.9);
      // shock diamonds stream out of the bell at the turbine's rate
      u.diamonds.offset.y -= (0.4 + this.n1 * 3.2) * dt;
    }
    for (const fan of U.fans) fan.rotation.z += (2 + this.n1 * 38) * dt;
    // a strike flashes the hull. The livery is painted INTO the map now, so
    // the resting colour is white (unchanged), and the flash over-brightens
    U.hull.material.color.setScalar(this.hitT > 0.35 ? 2.2 : 1);
    if (U.corners) this.posePods(U);
    this.mesh.updateMatrixWorld();
  }

  /**
   * The hover cushion's glow, a pool on the sand under each pad. pad.gap is
   * the drop from the pad's anchor (at body height) to the ground it rides
   * on, so the pool sits on the sand under a banked or pitched hull; bigger
   * with load, gone in the air. v12: the pods that used to stand here are
   * gone with the formula kit — the cushion is invisible on every plate.
   */
  posePods(U) {
    const G_ = U.glow, M4 = this._m4 || (this._m4 = new THREE.Matrix4());
    const Q_ = this._q4 || (this._q4 = new THREE.Quaternion()), S_ = this._s4 || (this._s4 = new THREE.Vector3());
    const P_ = this._p4 || (this._p4 = new THREE.Vector3());
    for (let i = 0; i < U.corners.length; i++) {
      const pad = this.pads[U.corners[i].pad];
      const load = clamp(pad.fS / (SPEC.mass * G / 4), 0, 2);
      const k = pad.touch ? 0.55 + load * 0.35 : 0;
      P_.set(pad.x * POD.glowIn, -clamp(pad.gap, 0, 1.4) + POD.glowUp, pad.z);
      S_.set(1.3 * k, 1, 2.2 * k);
      M4.compose(P_, Q_, S_);
      G_.setMatrixAt(i, M4);
    }
    G_.instanceMatrix.needsUpdate = true;
  }

  /** World position of nozzle i, for the exhaust haze. */
  nozzle(i, out) { return out.copy(this.mesh.userData.nozzles[i]).applyMatrix4(this.mesh.matrixWorld); }

  /** Steer toward a world point. Shared by the AI and the autopilot harness. */
  seek(tx, tz, ctl) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    let want = Math.atan2(dx, -dz);
    let err = want - this.yaw;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    ctl.steer = clamp(err * 1.5 - this.yawRate * 0.55, -1, 1);
    return err;
  }

  aiControl(dt, target, ctl) {
    this.aiT -= dt;
    if (this.aiT <= 0) { this.aiOff = (Math.random() * 2 - 1) * 26; this.aiT = 2 + Math.random() * 3; }
    const err = this.seek(target.x + this.aiOff, target.z, ctl);
    // ease off through anything tight, and out of a big slide
    const tight = Math.min(1, Math.abs(err) * 1.4 + Math.abs(this.slip) * 0.06);
    ctl.throttle = clamp(1 - tight * 0.75, 0.25, 1);
    ctl.brake = false;
    const straight = Math.abs(err) < 0.3;
    ctl.overdrive = this.heat < 0.6 && straight;
    ctl.lean = ctl.overdrive ? 1 : (Math.abs(err) > 0.5 ? -0.6 : 0);
    ctl.pan = 0;
    return ctl;
  }

  dispose() { this.terrain.scene.remove(this.mesh); disposeCraft(this.mesh); }
}
