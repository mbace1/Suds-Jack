// ── Skater ─────────────────────────────────────────────────────────────────
// The tiny2d physics, lifted into 3D: integrate ballistically, then ask the
// heightfield whether we ended up underground, and if so project velocity onto
// the surface tangent plane. The only change is that the tangent comes from a
// gradient rather than a scalar slope — so rolling into a quarterpipe, pumping
// a transition and launching off a lip all fall out of the same three lines.
//
// On top of that, the things that make it a skateboard rather than a ball:
//   • grip — lateral velocity decays fast, so the board carves instead of sliding
//   • heading — the board points where you steer, and the LANDING is judged on
//     whether the board agrees with where you are actually travelling
//   • fakie — landing at ~180° is legal and worth more, not a bail

import * as THREE from 'three';
import { COL } from './palette.js?v=1';
import { PARK_EXTENT } from './park.js?v=1';

const G          = 26;
const PUSH       = 16;    // acceleration while the stick is deflected
const TURN       = 2.6;   // rad/s of steering at full stick, low speed
const GRIP       = 8;     // how fast lateral velocity dies (per second)
const ROLL_FRIC  = 0.32;
const AIR_DRAG   = 0.05;
const POP        = 10.5;  // ollie impulse along the surface normal, at power 1
const SPIN_RATE  = 6.4;   // rad/s of yaw in the air
const FLIP_RATE  = 5.4;
const TRICK_DUR  = 0.34;
const BAIL_TIME  = 1.0;
const MAX_SPEED  = 34;
const LAND_TOL   = 0.72;  // radians (~41°) of heading error still counted clean

const _g = new THREE.Vector3(0, -G, 0);
const _n = new THREE.Vector3();
const _hv = new THREE.Vector3();
const _lat = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _right = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _m = new THREE.Matrix4();

function part(group, w, h, d, color, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  group.add(mesh);
  const T = 0.1;
  const out = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: COL.ink, side: THREE.BackSide,
  }));
  out.scale.set(1 + T / w, 1 + T / h, 1 + T / d);
  mesh.add(out);
  return mesh;
}

// Built facing +Z, so world heading is (sin yaw, 0, cos yaw) and Object3D's own
// Y rotation convention applies without a correction anywhere.
function buildSkater() {
  const g = new THREE.Group();
  part(g, 0.72, 0.14, 2.4, COL.board, 0, 0.2, 0);
  part(g, 0.84, 0.3, 0.3, COL.wheels, 0, 0.08, 0.75);
  part(g, 0.84, 0.3, 0.3, COL.wheels, 0, 0.08, -0.75);
  part(g, 0.38, 0.8, 0.42, COL.pants, 0, 0.68, 0.42);
  part(g, 0.38, 0.8, 0.42, COL.pants, 0, 0.68, -0.42);
  part(g, 0.62, 0.9, 0.86, COL.shirt, 0, 1.52, 0);
  part(g, 0.26, 0.66, 0.26, COL.skin, 0.42, 1.6, 0.3);
  part(g, 0.26, 0.66, 0.26, COL.skin, -0.42, 1.66, -0.24);
  part(g, 0.52, 0.5, 0.5, COL.skin, 0, 2.25, 0.02);
  part(g, 0.62, 0.3, 0.6, COL.helmet, 0, 2.56, 0);
  return g;
}

export class Skater {
  constructor(scene, park) {
    this.park = park;
    this.root = new THREE.Group();      // position + orientation
    this.body = buildSkater();          // trick rotations live here
    this.root.add(this.body);
    scene.add(this.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.reset();
  }

  reset() {
    this.pos.set(0, 0, 24);
    this.pos.y = this.park.height(this.pos.x, this.pos.z);
    this.vel.set(0, 0, -6);
    this.yaw = Math.PI;          // facing -z, into the park
    this.grounded = true;
    this.up.set(0, 1, 0);
    this.trick = null;
    this.trickPhase = 0;
    this.flipPhase = 0;
    this.spinAccum = 0;
    this.airTime = 0;
    this.airTricks = [];
    this.bailT = 0;
    this.fakie = false;
  }

  get speed() { return this.vel.length(); }
  get bailing() { return this.bailT > 0; }

  update(dt, input, camYaw) {
    const ev = [];
    const park = this.park;
    if (this.bailT > 0) this.bailT = Math.max(0, this.bailT - dt);

    const mv = input.move;
    const mag = Math.hypot(mv.x, mv.y);
    const locked = this.bailing;

    // Camera-relative desired heading. Camera forward is (sin, 0, cos) and its
    // right is (cos, 0, -sin) — three.js' own Y-rotation basis, so nothing here
    // needs a sign correction.
    const cs = Math.sin(camYaw), cc = Math.cos(camYaw);
    const wantX = cs * mv.y + cc * mv.x;
    const wantZ = cc * mv.y - cs * mv.x;

    // ── Actions ─────────────────────────────────────────────────────────
    for (const a of input.consumeActions()) {
      if (locked) continue;
      if (this.grounded) {
        if (a.dir === 'up') {
          park.normal(this.pos.x, this.pos.z, _n);
          this.vel.addScaledVector(_n, POP * a.power);
          this.grounded = false;
          this.airTime = 0;
          this.spinAccum = 0;
          this.airTricks = [];
          ev.push({ type: 'ollie', power: a.power });
        }
      } else if (!this.trick) {
        this.trick = { t: 0, dir: a.dir };
        this.airTricks.push(a.dir);
        ev.push({ type: 'trick', dir: a.dir });
      }
    }

    // ── Trick rotation ──────────────────────────────────────────────────
    if (this.trick) {
      this.trick.t += dt;
      this.trickPhase = Math.min(this.trick.t / TRICK_DUR, 1);
      if (this.trick.t >= TRICK_DUR) { this.trick = null; this.trickPhase = 0; }
    }

    if (this.grounded) {
      // ── Rolling ───────────────────────────────────────────────────────
      park.normal(this.pos.x, this.pos.z, _n);

      if (mag > 0.12 && !locked) {
        const want = Math.atan2(wantX, wantZ);
        // Steering authority falls off with speed — you commit to a line.
        const rate = TURN * (1 - Math.min(this.speed / MAX_SPEED, 1) * 0.6) * mag;
        this.yaw = turnToward(this.yaw, want, rate * dt);
      }

      // Heading projected onto the tangent plane.
      _hv.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
      _hv.addScaledVector(_n, -_hv.dot(_n)).normalize();

      // Gravity along the surface — this is what pumps a transition.
      _tmp.copy(_g).addScaledVector(_n, -_g.dot(_n));
      this.vel.addScaledVector(_tmp, dt);

      // Grip: split into along-heading and lateral, and kill the lateral part.
      let along = this.vel.dot(_hv);
      _lat.copy(this.vel).addScaledVector(_hv, -along);
      _lat.multiplyScalar(Math.exp(-GRIP * dt));
      if (mag > 0.15 && !locked) along += PUSH * dt * mag;
      along *= Math.exp(-ROLL_FRIC * dt);
      this.vel.copy(_lat).addScaledVector(_hv, along);

      this.up.lerp(_n, 1 - Math.pow(0.0001, dt));
    } else {
      // ── Airborne ──────────────────────────────────────────────────────
      this.airTime += dt;
      this.vel.y -= G * dt;
      this.vel.multiplyScalar(Math.exp(-AIR_DRAG * dt));
      if (!locked) {
        const spin = mv.x * SPIN_RATE * dt;
        this.yaw += spin;
        this.spinAccum += Math.abs(spin);
        this.flipPhase += mv.y * FLIP_RATE * dt;
      }
      this.up.lerp(_UP, 1 - Math.pow(0.02, dt));
    }

    if (this.speed > MAX_SPEED) this.vel.multiplyScalar(MAX_SPEED / this.speed);
    this.pos.addScaledVector(this.vel, dt);

    // ── Surface contact ─────────────────────────────────────────────────
    const h = park.height(this.pos.x, this.pos.z);
    if (this.pos.y <= h + 0.001) {
      park.normal(this.pos.x, this.pos.z, _n);
      if (!this.grounded) ev.push(this.land(_n));
      this.pos.y = h;
      this.grounded = true;
      // Kill anything pushing into the surface.
      const into = this.vel.dot(_n);
      if (into < 0) this.vel.addScaledVector(_n, -into);
    } else if (this.pos.y > h + 0.06) {
      this.grounded = false;
    }

    // The rim should send you back in; this is only the backstop for clearing it.
    const lim = PARK_EXTENT - 0.5;
    for (const ax of ['x', 'z']) {
      if (this.pos[ax] > lim) { this.pos[ax] = lim; if (this.vel[ax] > 0) this.vel[ax] *= -0.3; }
      if (this.pos[ax] < -lim) { this.pos[ax] = -lim; if (this.vel[ax] < 0) this.vel[ax] *= -0.3; }
    }

    this.present(dt);
    return ev;
  }

  // Landing is judged twice: whether the board agrees with where you are going
  // (heading), and how much of your speed was aimed into the ground (normal).
  land(n) {
    const speedH = Math.hypot(this.vel.x, this.vel.z);
    let err = 0;
    if (speedH > 1.2) {
      const dot = (this.vel.x / speedH) * Math.sin(this.yaw)
                + (this.vel.z / speedH) * Math.cos(this.yaw);
      err = Math.acos(Math.max(-1, Math.min(1, dot)));
    }
    const isFakie = err > Math.PI - LAND_TOL;
    const clean = err < LAND_TOL || isFakie;

    const spd = this.speed;
    const align = spd > 0.01 ? Math.max(0, -this.vel.dot(n)) / spd : 0;

    const info = {
      type: 'land',
      airTime: this.airTime,
      tricks: this.airTricks.slice(),
      spin: this.spinAccum,
      fakie: isFakie,
      align,
    };

    if (this.trick || !clean) {
      info.quality = 'bail';
      this.trick = null;
      this.trickPhase = 0;
      this.bailT = BAIL_TIME;
      this.vel.multiplyScalar(0.3);
    } else {
      info.quality = align < 0.2 ? 'clean' : align < 0.5 ? 'sketchy' : 'hard';
      const keep = align < 0.2 ? 1 : align < 0.5 ? 1 - (align - 0.2) : 0.55;
      this.vel.multiplyScalar(keep);
      // Riding away backwards: turn the board to match, and remember it.
      if (isFakie) this.yaw += Math.PI;
      this.fakie = isFakie;
    }

    this.airTime = 0;
    this.airTricks = [];
    this.spinAccum = 0;
    this.flipPhase = 0;
    return info;
  }

  // ── Present ───────────────────────────────────────────────────────────────
  present(dt) {
    this.root.position.copy(this.pos);
    _hv.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    _right.crossVectors(this.up, _hv).normalize();
    _fwd.crossVectors(_right, this.up).normalize();
    _m.makeBasis(_right, this.up, _fwd);
    this.root.quaternion.setFromRotationMatrix(_m);

    // Trick rotations sit on the inner group so they never fight the heading.
    const p = this.trickPhase * Math.PI * 2;
    const d = this.trick ? this.trick.dir : null;
    this.body.rotation.set(
      this.flipPhase,
      d === 'down' ? p : 0,
      d === 'left' ? -p : d === 'right' ? p : 0
    );
    const crouch = this.bailing ? 0.6 : d === 'up' ? 0.82 : 1;
    this.body.scale.y += (crouch - this.body.scale.y) * (1 - Math.pow(0.002, dt));
  }
}

const _UP = new THREE.Vector3(0, 1, 0);

function turnToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}
