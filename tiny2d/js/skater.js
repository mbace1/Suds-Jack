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
import { COL } from './palette.js?v=4';
import { clamp, lerp } from './rng.js?v=4';

const G          = 34;    // base gravity
const PRESS_G    = 2.7;   // gravity multiplier while pressing
const MAX_SPEED  = 64;
const MIN_SPEED  = 7;     // you never fully stall
const GROUND_DRAG= 0.16;  // per second, proportional
const AIR_DRAG   = 0.03;
const POP_MAX    = 10;    // full-charge ollie, world units/s
const CHARGE_FULL= 0.4;   // seconds of hold for a full pop
// A trick has to fit inside a real air. Measured average air off a crest is
// ~0.36 s, so anything near half a second makes tricks a coin flip rather than
// a decision — at 0.28 s an ordinary pop holds one and a big lip holds two.
const TRICK_DUR  = 0.28;
const BAIL_TIME  = 0.85;

// Landing bands, measured as |perpendicular speed| / |speed| at contact —
// so they are the sine of the angle between your arc and the face. 0.17 was a
// 10° window, and the bench (tiny2d/test/bench.cjs) says the best line a bot
// can ride lands at 0.15 on its very best air and 0.5 typically: the perfect
// band was unreachable in play, which is why deep runs felt like nothing but
// slams. 0.26 is 15° and 0.60 is 37° — still a real window you can miss, and
// the genre this comes from rewards "roughly with the slope", not frame-exact.
const PERFECT_ALIGN = 0.26;
const OK_ALIGN      = 0.60;

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

// A fat bird on a skateboard. It is forty pixels tall on a phone, so it has to
// read as a bird in silhouette alone: one big round mass, no neck, a beak out
// front and a tail out back. Those two are what make it a bird rather than a
// blob — the mass is symmetrical, and everything that says which way it is
// going lives in the things sticking out of it. The cream belly sits proud of
// the body at the front for the same reason.
function buildSkater() {
  const g = new THREE.Group();

  // the board, unchanged: it is what the bird is standing on
  part(g, 2.5, 0.18, 0.78, COL.board,  0,     0.22, 0);
  part(g, 0.34, 0.34, 0.9,  COL.wheels, 0.78, 0.06, 0);
  part(g, 0.34, 0.34, 0.9,  COL.wheels,-0.78, 0.06, 0);

  // stubby feet — a fat bird has no legs worth speaking of
  part(g, 0.42, 0.3, 0.34, COL.beak,   0.34, 0.5, 0.22);
  part(g, 0.42, 0.3, 0.34, COL.beak,  -0.3,  0.5, -0.2);

  // the mass, and the cream front that gives it a facing
  part(g, 1.75, 1.55, 1.1, COL.bird,   0,    1.45, 0);
  part(g, 0.95, 1.0,  1.16, COL.belly, 0.42, 1.28, 0);
  // one wing, tucked, on the near side only — a second would just be a dark
  // bar in the middle of the shape at this size. It hangs below the body line
  // rather than sitting inside it, or it reads as a shadow instead of a wing.
  part(g, 0.85, 0.8, 0.3, COL.wing,   -0.3,  1.15, 0.6);
  // tail, out past the back of the body and tilted up
  part(g, 0.9, 0.42, 0.62, COL.wing,  -1.25, 1.78, 0);

  // the head sits straight on the body, and the beak carries the silhouette
  part(g, 1.0, 0.9, 0.92, COL.bird,    0.4,  2.5, 0);
  part(g, 0.6, 0.34, 0.36, COL.beak,   1.18, 2.4, 0);
  part(g, 0.22, 0.22, 0.3, COL.eye,    0.72, 2.66, 0.32);
  // a two-block tuft: at this size it is the difference between a bird and a
  // red box with a beak
  part(g, 0.26, 0.3, 0.3, COL.wing,    0.2,  3.05, 0);
  part(g, 0.26, 0.22, 0.3, COL.wing,  -0.05, 3.22, 0);
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
