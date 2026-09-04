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
import { PAL } from './palette.js?v=4';
import { SURF, SALT } from './terrain.js?v=4';

const G = 9.81;
const HZ = 120, DTF = 1 / HZ;

export const SPEC = {
  mass: 1400,
  hw: 1.6, hl: 3.0,          // pad half-track, half-wheelbase
  rest: 2.6,                 // hover cushion height
  padK: 30000, padC: 4200,   // per pad
  Ixx: 2600, Iyy: 9000, Izz: 8700,
  thrust: 17000,             // N at N1 = 1
  odThrust: 8500,            // overdrive adds this
  drag: 2.18,                // N per (m/s)^2, x the surface multiplier
  slipK: 6000,               // lateral N per m/s of slip, before the mu limit
  steerLock: 0.30,           // rad the front is steered at full lock
  steer: 9000,               // extra yaw N.m at full lock (rudder), on top of the pull
  yawDamp: 12000,
  // How much of the front's grip the thrust eats. Measured: at 0.55 the
  // front had NO lateral force under full power (thrust is ~1.2 g here, the
  // axle carries ~6 kN) and the sled could only push. A hot rod pushes; it
  // does not lose its nose. 0.18 takes ~15% off the front at full throttle.
  circle: 0.18,
  spoolUp: 1.3, spoolDown: 0.8,
  brakeDrag: 5.2,
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
    this._FLf = 0; this._FLr = 0;       // relaxed axle forces (the sand's lag)
    this._lastThrust = 0;
    this.aiT = 0; this.aiOff = 0;

    this.mesh = buildCraft(this.accent, this.number);
    terrain.scene.add(this.mesh);
    this._n = new THREE.Vector3();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pads = [
      { x: -SPEC.hw, z: -SPEC.hl }, { x: SPEC.hw, z: -SPEC.hl },
      { x: -SPEC.hw, z: SPEC.hl }, { x: SPEC.hw, z: SPEC.hl },
    ].map(p => ({ ...p, gap: SPEC.rest, f: 0, wx: 0, wz: 0, wy: 0, sink: 0 }));
    this._n = new THREE.Vector3();
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get kph() { return this.speed * 3.6; }
  get overdrive() { return this._od; }

  update(dt, ctl) {
    this._acc = Math.min(this._acc + dt, 0.25);   // never spiral after a stall
    while (this._acc >= DTF) { this.stepFixed(DTF, ctl); this._acc -= DTF; }
    this.pose();
  }

  // --------------------------------------------------------------- dynamics
  stepFixed(dt, ctl) {
    const T = this.terrain;
    const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
    // forward is -z at yaw 0; right is +x. Same convention as the camera rig.
    const fx = sinY, fz = -cosY;
    const rx = cosY, rz = sinY;

    // ---- turbine ---------------------------------------------------------
    let throttle = clamp(ctl.throttle, 0, 1);
    this._od = !!ctl.overdrive && !this.tripped && this.heat < 1;
    if (this.tripped) throttle = Math.min(throttle, 0.55);
    const tau = throttle > this.n1 ? SPEC.spoolUp : SPEC.spoolDown;
    this.n1 += (throttle - this.n1) * (dt / tau);
    this.heat += ((this._od ? 0.30 : -0.20) - (this.tripped ? 0.06 : 0)) * dt;
    this.heat = clamp(this.heat, 0, 1);
    if (this.heat >= 1) this.tripped = true;
    if (this.tripped && this.heat < 0.35) this.tripped = false;

    // ---- suspension: four pads, and the moments they make ----------------
    let Fy = 0, Mpitch = 0, Mroll = 0;
    let contacts = 0, onDeck = false;
    const cosP = Math.cos(this.pitch), cosR = Math.cos(this.roll);
    for (const pad of this.pads) {
      // pad position in world, using the body's yaw and its current attitude
      const lx = pad.x * cosR, lz = pad.z * cosP;
      pad.wx = this.pos.x + rx * lx + fx * lz;
      pad.wz = this.pos.z + rz * lx + fz * lz;
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
      if (gap < SPEC.rest) {
        contacts++;
        const comp = SPEC.rest - gap;
        const padVy = this.vel.y - this.pitchRate * pad.z - this.rollRate * pad.x;
        let f = SPEC.padK * comp - SPEC.padC * padVy;
        if (f < 0) f = 0;                    // a cushion pushes, it never pulls
        pad.f = f;
        Fy += f;
        // settle: a loaded runner sinks toward the surface's limit and eases
        // back out when unloaded. Time constants are what make it feel like
        // the ground giving rather than a step.
        const sS = SURF[g.deck ? 4 : g.surf];
        const want = sS.sink * Math.min(2.2, f / (SPEC.mass * G / 4));
        pad.sink += (want - pad.sink) * Math.min(1, dt / (want > pad.sink ? 0.30 : 0.55));
        // Torque of a vertical force about the centre of mass: tau_x = -z*F,
        // tau_z = +x*F. Getting the pitch sign wrong here does not look like a
        // wrong sign, it looks like the craft being fired into orbit — more
        // load at the back pitches the nose DOWN, and the inverted version is
        // a positive feedback loop that saturates the attitude in half a
        // second. Both terms are written so that a displaced craft restores.
        Mpitch -= f * pad.z;
        Mroll -= f * pad.x;
      } else { pad.f = 0; pad.sink += (0 - pad.sink) * Math.min(1, dt / 0.55); }
    }
    this.grounded = contacts > 0;
    this.onDeck = onDeck;
    this.load = Fy;
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
    if (airborne) thrust *= 0.25;                 // nothing to push against
    if (this.hitT > 0) thrust *= 0.3;

    // The rockets are on the FRONT and they point where the front is
    // steered. So thrust has a lateral component at the nose, and a yaw
    // moment with it: the pull through the corner that makes a front-drive
    // car drive the way it does.
    const steerIn = clamp(ctl.steer, -1, 1);
    const delta = steerIn * SPEC.steerLock;
    const cd = Math.cos(delta), sd = Math.sin(delta);
    const tx = fx * cd + rx * sd, tz = fz * cd + rz * sd;
    let Fx = tx * thrust + FxN, Fz = tz * thrust + FzN;
    // torque about the CoM from a lateral force at the front (z = -hl):
    // tau_y = -hl * F_lat, and our yaw is right-positive (= -rotation about
    // +y), so it enters as +hl. Positive steer under power turns right.
    let Mz = SPEC.hl * thrust * sd;
    // torque steer: a sharp rise in thrust tugs the nose on rough ground
    const dT = thrust - this._lastThrust;
    this._lastThrust = thrust;
    if (this.grounded && dT > 0) Mz += dT * 0.9 * (S.drag - 0.8) * Math.sin(this.pos.x * 0.7 + this.pos.z * 0.3);

    // body drag, plus the surface ploughing you
    const plough = this.grounded ? 1 + this.sink * 2.2 : 1;
    const kd = SPEC.drag * (airborne ? 0.7 : S.drag * plough) + (ctl.brake ? SPEC.brakeDrag : 0);
    Fx -= kd * speed * v.x;
    Fz -= kd * speed * v.z;

    // ---- grip, per axle, from the loads the pads are actually carrying ----
    // Front cap loses what the thrust is using (traction circle): power-on
    // push. Rear cap is just mu x rear load: lift off, weight goes forward,
    // the rear unloads, and the tail comes round. The rear force sits behind
    // the centre of mass and straightens the sled out of a slide; the front
    // force sits ahead of it and does the opposite. Which wins is the load.
    if (this.grounded) {
      const Ff = this.pads[0].f + this.pads[1].f, Fr = this.pads[2].f + this.pads[3].f;
      const used = thrust * SPEC.circle;
      const capF0 = S.mu * Ff;
      const capF = Math.sqrt(Math.max(0, capF0 * capF0 - used * used));
      const capR = S.mu * Fr;
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
    } else { this._FLf *= 0.9; this._FLr *= 0.9; }

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
    const steerGain = this.grounded ? 1 : 0.30;
    const auth = clamp(Math.abs(vF) / 26, 0, 1);
    Mz += steerIn * SPEC.steer * auth * steerGain;
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
  pose() {
    this.mesh.position.copy(this.pos);
    this._e.set(this.pitch, this.yaw, -this.roll, 'YXZ');
    this.mesh.quaternion.setFromEuler(this._e);
    const th = this.n1 * (this._od ? 2.4 : 1);
    for (const f of this.mesh.userData.flares) {
      f.scale.set(1, 1, 0.25 + th * 1.5);
      f.material.opacity = 0.18 + th * 0.5;
    }
    this.mesh.userData.hull.material.color.setHex(this.hitT > 0.35 ? 0xffffff : PAL.hull);
  }

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
    ctl.overdrive = this.heat < 0.6 && Math.abs(err) < 0.3;
    return ctl;
  }

  dispose() { this.terrain.scene.remove(this.mesh); }
}

// ------------------------------------------------------------- the model
// Same racer the reference plates describe — long cream fuselage, one
// weathered accent band, chrome cans slung aft, black intakes, needle probe —
// but smooth-shaded and denser now that this build is not pretending to be a
// PlayStation.
const _geo = {};
const geo = (k, make) => _geo[k] || (_geo[k] = make());

function numberTexture(num, accent) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#' + new THREE.Color(PAL.hull).getHexString();
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#' + new THREE.Color(accent).getHexString();
  g.lineWidth = 6;
  g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#1d1726';
  g.font = 'bold 88px monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(num), 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function buildCraft(accent, number) {
  const g = new THREE.Group();
  // Lambert, not PBR: a PlayStation 2 lit its cars per vertex and the specular
  // was a painted highlight. Chrome is a pale grey with a hot emissive lift.
  const hullMat = new THREE.MeshLambertMaterial({ color: PAL.hull });
  const accMat = new THREE.MeshLambertMaterial({ color: accent });
  const chrome = new THREE.MeshLambertMaterial({ color: PAL.chrome, emissive: PAL.chromeHi, emissiveIntensity: 0.22 });
  const glass = new THREE.MeshLambertMaterial({ color: PAL.glass, emissive: 0x6a7aa0, emissiveIntensity: 0.25 });

  const body = new THREE.Mesh(geo('body', () => {
    const b = new THREE.CylinderGeometry(0.92, 0.72, 6.2, 10);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  body.position.z = 0.5; body.scale.set(1.15, 0.8, 1);
  g.add(body);

  const nose = new THREE.Mesh(geo('nose', () => {
    const b = new THREE.ConeGeometry(0.92, 4.2, 10);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  nose.position.z = -4.6; nose.scale.set(1.15, 0.8, 1);
  g.add(nose);

  const band = new THREE.Mesh(geo('band', () => {
    const b = new THREE.CylinderGeometry(0.9, 0.86, 1.7, 10);
    b.rotateX(-Math.PI / 2); return b;
  }), accMat);
  band.position.z = -0.5; band.scale.set(1.15, 0.8, 1);
  g.add(band);

  const plate = new THREE.Mesh(geo('plate', () => {
    const b = new THREE.CylinderGeometry(1.7, 0.9, 3.6, 3);
    b.rotateX(-Math.PI / 2); return b;
  }), hullMat);
  plate.scale.set(1, 0.11, 1.8); plate.position.set(0, -0.5, -0.9);
  plate.rotation.z = Math.PI;
  g.add(plate);

  const canopy = new THREE.Mesh(geo('canopy', () => new THREE.SphereGeometry(0.52, 10, 6)), glass);
  canopy.scale.set(0.95, 0.68, 1.9); canopy.position.set(0, 0.46, -2.5);
  g.add(canopy);

  const probe = new THREE.Mesh(geo('probe', () => {
    const b = new THREE.CylinderGeometry(0.06, 0.03, 2.4, 6);
    b.rotateX(-Math.PI / 2); return b;
  }), chrome);
  probe.position.z = -7.8;
  g.add(probe);

  const fin = new THREE.Mesh(geo('fin', () => new THREE.BoxGeometry(0.12, 0.9, 1.2)), hullMat);
  fin.position.set(0, 0.76, 3.0); fin.rotation.x = -0.34; g.add(fin);
  const finCap = new THREE.Mesh(geo('finCap', () => new THREE.BoxGeometry(0.14, 0.24, 1.2)), accMat);
  finCap.position.set(0, 1.15, 2.88); finCap.rotation.x = -0.34; g.add(finCap);

  const flares = [];
  for (const side of [-1, 1]) {
    const nac = new THREE.Mesh(geo('nac', () => {
      const b = new THREE.CylinderGeometry(0.42, 0.38, 3.2, 10);
      b.rotateX(-Math.PI / 2); return b;
    }), chrome);
    nac.position.set(side * 1.3, -0.24, 2.2);
    g.add(nac);

    const collar = new THREE.Mesh(geo('collar', () => {
      const b = new THREE.CylinderGeometry(0.5, 0.45, 0.34, 10);
      b.rotateX(-Math.PI / 2); return b;
    }), chrome);
    collar.position.set(side * 1.3, -0.24, 0.72);
    g.add(collar);

    const mouth = new THREE.Mesh(geo('mouth', () => {
      const b = new THREE.CircleGeometry(0.36, 10);
      b.rotateY(Math.PI); return b;
    }), new THREE.MeshBasicMaterial({ color: PAL.intake }));
    mouth.position.set(side * 1.3, -0.24, 0.55);
    g.add(mouth);

    const strut = new THREE.Mesh(geo('strut', () => new THREE.BoxGeometry(1.1, 0.16, 0.7)), chrome);
    strut.position.set(side * 0.74, -0.2, 2.0);
    g.add(strut);

    const flare = new THREE.Mesh(geo('flare', () => {
      const b = new THREE.ConeGeometry(0.3, 2.4, 10);
      b.rotateX(Math.PI / 2); return b;
    }), new THREE.MeshBasicMaterial({
      color: PAL.flame, transparent: true, opacity: 0.4, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    flare.position.set(side * 1.3, -0.24, 5.0);
    g.add(flare);
    flares.push(flare);
  }

  const tex = numberTexture(number, accent);
  for (const side of [-1, 1]) {
    const decal = new THREE.Mesh(geo('decal', () => new THREE.PlaneGeometry(1.1, 1.1)),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    decal.position.set(side * 0.98, 0.06, -0.5);
    decal.rotation.y = side * Math.PI / 2;
    g.add(decal);
  }

  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  g.scale.setScalar(0.74);   // ~11 m long overall
  g.userData.flares = flares;
  g.userData.hull = body;
  return g;
}
