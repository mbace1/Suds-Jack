// ── Skater ─────────────────────────────────────────────────────────────────
// One-button physics, Tiny Wings' verb translated onto a skateboard.
//
// The whole simulation is ballistic — every frame integrates (x, y) under
// gravity and *then* asks the terrain whether we ended up underground. If we
// did, we snap to the surface and project velocity onto the slope tangent,
// throwing away the perpendicular component. Two good things fall out of that
// for free:
//   • cresting a hill launches you automatically, with no "am I on a jump?"
//     check anywhere — the ground simply drops away faster than you fall;
//   • landing quality is just how much of your velocity was perpendicular,
//     which is exactly the feel Tiny Wings rewards.
//
// The one button does three jobs, all the same gesture:
//   hold on the ground  → press into the face, gravity ×PRESS_G, you accelerate
//   release on the lip  → an ollie sized by how long you held (the pop)
//   hold in the air     → dive, to get down onto the next downslope sooner

import * as THREE from 'three';
import { COL } from './palette.js?v=2';
import { clamp, lerp } from './rng.js?v=2';

const G          = 34;    // base gravity
const PRESS_G    = 2.7;   // gravity multiplier while pressing
const MAX_SPEED  = 64;
const MIN_SPEED  = 7;     // you never fully stall
const GROUND_DRAG= 0.16;  // per second, proportional
const AIR_DRAG   = 0.03;
const POP_MAX    = 14;    // full-charge ollie, world units/s
const CHARGE_FULL= 0.4;   // seconds of hold for a full pop
// A trick has to fit inside a real air. Measured average air off a crest is
// ~0.36 s, so anything near half a second makes tricks a coin flip rather than
// a decision — at 0.28 s an ordinary pop holds one and a big lip holds two.
const TRICK_DUR  = 0.28;
const BAIL_TIME  = 0.85;

// Landing bands, measured as |perpendicular speed| / |speed| at contact.
const PERFECT_ALIGN = 0.17;
const OK_ALIGN      = 0.44;

function part(group, w, h, d, color, x, y, z) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  mesh.position.set(x, y, z);
  group.add(mesh);
  // Inverted-hull outline, sized so the ink band is a constant world width
  // rather than proportional to the part (design doc §4).
  const T = 0.13;
  const out = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color: COL.ink, side: THREE.BackSide,
  }));
  out.scale.set(1 + T / w, 1 + T / h, 1 + T / d);
  mesh.add(out);
  return mesh;
}

function buildSkater() {
  const g = new THREE.Group();
  part(g, 2.5, 0.18, 0.78, COL.board,  0,     0.22, 0);
  part(g, 0.34, 0.34, 0.9,  COL.wheels, 0.78, 0.06, 0);
  part(g, 0.34, 0.34, 0.9,  COL.wheels,-0.78, 0.06, 0);
  part(g, 0.5, 0.85, 0.42, COL.pants,  0.42, 0.72, 0);
  part(g, 0.5, 0.85, 0.42, COL.pants, -0.42, 0.72, 0);
  part(g, 1.05, 0.95, 0.62, COL.shirt,  0,    1.6,  0);
  part(g, 0.3, 0.72, 0.3,  COL.skin,   0.72, 1.72, 0);   // trailing arm
  part(g, 0.3, 0.72, 0.3,  COL.skin,  -0.66, 1.9,  0);   // leading arm
  part(g, 0.62, 0.6, 0.58, COL.skin,   0.05, 2.42, 0);
  part(g, 0.74, 0.34, 0.68, COL.helmet, 0.02, 2.78, 0);
  return g;
}

export class Skater {
  constructor(scene, terrain) {
    this.terrain = terrain;
    this.group = buildSkater();
    scene.add(this.group);
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = this.terrain.heightAt(0);
    this.vx = 14;
    this.vy = 0;
    this.air = false;
    this.rot = 0;
    this.charge = 0;
    this.wasPressing = false;
    this.trick = null;       // { t, dur }
    this.trickSpin = 0;
    this.bailT = 0;
    this.airTime = 0;
    this.tricksThisAir = 0;
    this.startY = this.y;
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  get bailing() { return this.bailT > 0; }

  // Returns a list of events for main.js to score and make noise about.
  update(dt, input) {
    const ev = [];
    const t = this.terrain;
    const pressing = input.pressing && !this.bailing;

    if (this.bailT > 0) this.bailT = Math.max(0, this.bailT - dt);

    // ── The pop ─────────────────────────────────────────────────────────
    // Charge only builds on the ground; releasing there spends it as an ollie.
    if (pressing && !this.air) {
      this.charge = Math.min(this.charge + dt, CHARGE_FULL);
    }
    if (this.wasPressing && !pressing && !this.air && this.charge > 0.08) {
      const k = clamp(this.charge / CHARGE_FULL, 0, 1);
      this.vy += POP_MAX * k;
      ev.push({ type: 'pop', power: k });
    }
    if (!pressing) this.charge = 0;
    this.wasPressing = pressing;

    // ── Trick input ─────────────────────────────────────────────────────
    if (input.consumeTrick() && this.air && !this.trick && !this.bailing) {
      this.trick = { t: 0, dur: TRICK_DUR };
      ev.push({ type: 'trickStart' });
    }
    if (this.trick) {
      this.trick.t += dt;
      this.trickSpin = (this.trick.t / this.trick.dur) * Math.PI * 2;
      if (this.trick.t >= this.trick.dur) {
        this.trick = null;
        this.trickSpin = 0;
        this.tricksThisAir++;
        // Rotation finished — but the points are only banked on a clean
        // touchdown, so this event is for sound and sparkle, not score.
        ev.push({ type: 'trickDone' });
      }
    }

    // ── Integrate ───────────────────────────────────────────────────────
    const g = G * (pressing ? PRESS_G : 1);
    this.vy -= g * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const drag = this.air ? AIR_DRAG : GROUND_DRAG;
    const damp = Math.max(0, 1 - drag * dt);
    this.vx *= damp;
    this.vy *= damp;

    // ── Terrain contact ─────────────────────────────────────────────────
    const s = t.sample(this.x);
    if (this.y <= s.y) {
      const inv = 1 / Math.hypot(1, s.m);
      const tx = inv, ty = s.m * inv;          // slope tangent, pointing forward
      const nx = -s.m * inv, ny = inv;         // slope normal, pointing up
      const vAlong = this.vx * tx + this.vy * ty;
      const vPerp  = this.vx * nx + this.vy * ny;
      const spd = this.speed;

      if (this.air) {
        const align = spd > 0.01 ? Math.max(0, -vPerp) / spd : 0;
        let keep, quality;
        if (this.trick) {
          // Came down mid-rotation — that is a bail, however pretty the arc was.
          keep = 0.33; quality = 'bail';
          this.trick = null;
          this.trickSpin = 0;
          this.bailT = BAIL_TIME;
        } else if (align < PERFECT_ALIGN) {
          keep = 1.06; quality = 'perfect';
        } else if (align < OK_ALIGN) {
          keep = 1 - (align - PERFECT_ALIGN) * 0.9; quality = 'ok';
        } else {
          keep = 0.45; quality = 'hard';
        }
        ev.push({
          type: 'land', quality, align,
          airTime: this.airTime, tricks: this.tricksThisAir, speed: spd,
        });
        this.vx = tx * Math.max(vAlong * keep, MIN_SPEED * 0.5);
        this.vy = ty * Math.max(vAlong * keep, MIN_SPEED * 0.5);
        this.airTime = 0;
        this.tricksThisAir = 0;
      } else {
        // Rolling: keep only the along-slope component, which is what turns
        // gravity into acceleration down a face and braking up one. The floor
        // means a blown line still rolls out of the trough instead of parking
        // there — losing 50 u/s down to 8 is punishment enough without a
        // softlock on the end of it.
        const roll = Math.max(vAlong, MIN_SPEED);
        this.vx = tx * roll;
        this.vy = ty * roll;
      }

      this.y = s.y;
      this.air = false;
      this.rot = Math.atan2(s.m, 1);
    } else {
      if (!this.air) ev.push({ type: 'launch', speed: this.speed });
      this.air = true;
      this.airTime += dt;
      // In the air the board follows the arc, easing so it does not snap.
      const target = Math.atan2(this.vy, Math.max(this.vx, 1));
      this.rot = lerp(this.rot, target, 1 - Math.pow(0.001, dt));
    }

    // ── Limits ──────────────────────────────────────────────────────────
    const spd = this.speed;
    if (spd > MAX_SPEED) {
      const k = MAX_SPEED / spd;
      this.vx *= k; this.vy *= k;
    }

    // ── Present ─────────────────────────────────────────────────────────
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.z = this.rot + this.trickSpin;
    const squash = pressing && !this.air ? 0.82 : 1;
    this.group.scale.y = lerp(this.group.scale.y, squash, 1 - Math.pow(0.002, dt));

    return ev;
  }
}
