// SUDS JACK — the jack.
//
// He is a SCOOP, not a gun. There is no fire button in this game: everything
// he does is get somewhere in time, and the only two things he can do are go
// round the rim and go down the tube.
//
// The JUMP is the other half of him, and it only exists because one channel
// shape has peaks in it: five bays with a ridge between each, and a ridge is
// the only thing in this game you cannot simply ride across. So the level
// comes with a verb. A jump commits your LANE the way a dive commits your
// DEPTH — you pick a bay and you are going there — and while you are off the
// floor grime passes underneath you, which makes it a dodge as well as a way
// across, and which is the reason to ever jump on a level with no peaks in it.
//
// The dive is the whole game. Bubbles rise, and you can wait at the mouth and
// take what arrives — that is safe and it is slow, because a bubble taken deep
// is worth more and because the lit one is usually not the one in front of
// you. Going down to meet it is how you keep a chain alive, and while you are
// down there you CANNOT CHANGE LANE. Commitment is the rule Flash Prince is
// built on and it is the rule here: the dive is 0.62s of you having already
// decided, and grime arriving in your lane during it will find you standing
// in it.

import * as THREE from 'three';
import { PAL } from './palette.js';

// Lanes are RELATIVE units — twenty of them span the same channel thirteen
// used to — so these carry the ×20/13 rescale that kept lip-to-lip time and
// time-to-full-tilt exactly what they were tuned to at thirteen.
const RIM_SPEED = 11.7;         // lanes per second at full tilt
const RIM_ACCEL = 52;           // how fast you reach it — snappy, not instant
const DIVE_OUT = 0.26;          // seconds going down
const DIVE_HOLD = 0.1;          // at the bottom
const DIVE_BACK = 0.26;         // and back
const DIVE_DEPTH = 0.55;        // how far down the tube a dive reaches
const JUMP_MS = 0.44;           // a hop over a peak, start to landing
const JUMP_HIGH = 3.1;          // how far off the floor, in world units
const FLOAT_MS = 0.55;          // a chained hop: longer than the first
const FLOATS_MAX = 3;           // presses past the first. "A bit", not flight.
const FLOAT_AT = 0.45;          // how far through a hop the next press counts

export class Player {
  constructor(scene, tube) {
    this.tube = tube;
    this.lane = 0;              // fractional: he slides, he does not tick
    this.vel = 0;
    this.depth = 0;
    this.diveT = -1;            // < 0 = not diving
    this.jumpT = -1;            // < 0 = on the floor
    this.jumpFrom = 0; this.jumpTo = 0;
    this.hopMs = JUMP_MS;       // this hop's length — floats are longer
    this.hopH = JUMP_HIGH;      // and lower
    this.airFrom = 0;           // air at the moment this hop began
    this.floats = 0;            // chained presses spent this flight
    this.air = 0;               // world units off the floor
    this.alive = true;
    this.mercy = 0;             // i-frames after a hit, in seconds

    // The scoop: two prongs and a dish, drawn as lines so it belongs to the
    // same drawing as the web. Solid geometry here would look like it came
    // from a different game.
    const g = new THREE.BufferGeometry();
    const shape = [
      [-1, 0.55], [-0.62, -0.2],
      [-0.62, -0.2], [0.62, -0.2],
      [0.62, -0.2], [1, 0.55],
      [-0.34, -0.2], [-0.2, -0.72],
      [0.34, -0.2], [0.2, -0.72],
    ];
    const pos = new Float32Array(shape.length * 3);
    shape.forEach(([x, y], i) => { pos[i * 3] = x; pos[i * 3 + 1] = y; });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.LineBasicMaterial({ color: new THREE.Color(...PAL.JACK) });
    this.mesh = new THREE.LineSegments(g, this.mat);
    this.mesh.scale.setScalar(1.05);
    tube.group.add(this.mesh);
  }

  get diving() { return this.diveT >= 0; }
  get jumping() { return this.jumpT >= 0; }
  /** Off the floor enough for grime to pass under. */
  get airborne() { return this.air > JUMP_HIGH * 0.35; }

  dive() {
    if (this.diving || this.jumping || !this.alive) return false;
    this.diveT = 0;
    return true;
  }

  /**
   * Hop to the next bay. `dir` is which way you are leaning; with no lean he
   * jumps the way he was last moving, because a jump with no direction on a
   * level made of ridges would be a wasted press every time.
   *
   * Pressed AGAIN in the falling half of a hop, it chains: one more bay,
   * committed the same way, on a hop that is longer and half as high — so a
   * string of presses reads as a FLOAT carrying you across the ridges, tiny
   * ski-jumper style, never as flight. Three chains and he has to land: the
   * cost of floating is that each hop is lower, until grime stops fitting
   * underneath you.
   */
  jump(dir = 0) {
    if (this.diving || !this.alive) return false;

    if (this.jumping) {
      if (this.floats >= FLOATS_MAX) return false;
      const k = this.jumpT / this.hopMs;
      if (k < FLOAT_AT) return false;       // too early: still going up
      // onward by default — a float continues the flight, it does not turn it
      const d = dir || Math.sign(this.jumpTo - this.jumpFrom) || this.lastDir || 1;
      const to = this.tube.jumpTarget(this.jumpTo, d);
      if (to === null) return false;        // the lip: nowhere to float to
      this.jumpFrom = this.lane;            // from wherever the arc has him
      this.jumpTo = to;
      this.airFrom = this.air;              // the glide starts where the arc was
      this.hopH = 0;                        // no rise: a float NEVER out-jumps the jump
      this.hopMs = FLOAT_MS;
      this.jumpT = 0;
      this.floats++;
      return true;
    }

    const d = dir || (this.vel !== 0 ? Math.sign(this.vel) : (this.lastDir || 1));
    const to = this.tube.jumpTarget(this.lane, d);
    if (to === null) return false;          // no bay that way: the lip
    this.jumpFrom = this.lane;
    this.jumpTo = to;
    this.hopMs = JUMP_MS;
    this.hopH = JUMP_HIGH;
    this.airFrom = 0;
    this.floats = 0;
    this.jumpT = 0;
    this.vel = 0;
    return true;
  }

  // `dir` is -1..1 from whatever is driving him: keys, a stick, a thumb.
  // `grip` is the floor's answer: 1 on clean rim, STICKY standing in scum.
  // A jump never takes the factor — the whole point of being airborne is
  // that the floor has no say in it.
  move(dir, dt, grip = 1) {
    if (dir) this.lastDir = Math.sign(dir);
    // A jump owns the lane for its whole length — see jump().
    if (this.jumping) return;
    // The bay you are in is read BEFORE the step, not after. Reading it after
    // is a wall you can walk through: one frame of movement carries you past
    // the ridge, and the clamp then asks the bay you have already arrived in
    // whether you are allowed to be there — which it says yes to.
    const [lo, hi] = this.tube.bayRange(this.lane);
    // Locked to the lane while committed. This is the cost of the dive and it
    // is not softened anywhere: half a dive is not a thing you can do.
    const want = this.diving ? 0 : dir * RIM_SPEED * grip;
    const d = want - this.vel;
    const step = RIM_ACCEL * dt;
    this.vel += Math.abs(d) <= step ? d : Math.sign(d) * step;
    this.lane += this.vel * dt;
    // The channel has ENDS, and on the ridged one every BAY has ends too.
    // Running out of floor is the thing a closed tube could never do to you,
    // and it is where being cornered comes from — so the clamp also kills the
    // velocity, or you slide back off the wall the instant you let go and it
    // reads as a bounce.
    const clamped = Math.max(lo, Math.min(hi, this.tube.clampLane(this.lane)));
    if (clamped !== this.lane) { this.lane = clamped; this.vel = 0; }
  }

  update(dt) {
    if (this.mercy > 0) this.mercy -= dt;

    if (this.jumping) {
      this.jumpT += dt;
      const k = Math.min(this.jumpT / this.hopMs, 1);
      this.lane = this.jumpFrom + (this.jumpTo - this.jumpFrom) * ease(k);
      // The first hop starts on the floor (airFrom 0, hopH full) and this is
      // the same sine arc it always was. A float has hopH 0: it GLIDES from
      // wherever the last arc had him — 1−k² hangs early and drops late, which
      // is what makes it read as floating rather than as a second jump — and
      // each successive press starts from lower down, so the ladder decays on
      // its own until grime stops fitting underneath you.
      this.air = this.airFrom * (1 - k * k) + Math.sin(k * Math.PI) * this.hopH;
      if (k >= 1) { this.jumpT = -1; this.air = 0; this.lane = this.jumpTo; }
    }

    if (this.diving) {
      this.diveT += dt;
      const total = DIVE_OUT + DIVE_HOLD + DIVE_BACK;
      // A COMPLETED dive is a fact the game cares about now — the return leg
      // is what scrubs scum — so it is announced, once, and only for a dive
      // that came all the way back. hit() cancels a dive without setting it:
      // a scrub you were knocked out of did not happen.
      if (this.diveT >= total) { this.diveT = -1; this.depth = 0; this.diveDone = true; }
      else if (this.diveT < DIVE_OUT) {
        this.depth = DIVE_DEPTH * ease(this.diveT / DIVE_OUT);
      } else if (this.diveT < DIVE_OUT + DIVE_HOLD) {
        this.depth = DIVE_DEPTH;
      } else {
        this.depth = DIVE_DEPTH * (1 - ease((this.diveT - DIVE_OUT - DIVE_HOLD) / DIVE_BACK));
      }
    }

    const p = this.tube.at(this.lane, this.depth);
    // sat a little INSIDE the channel rather than on its skin, so the floor
    // still reads as a surface he is lying on rather than a line through him
    const inset = this.tube.at(this.lane, this.depth + 0.012, new THREE.Vector3());
    p.lerp(inset, 0.55);
    // and lifted off it while jumping. UP, in world terms, not along the
    // floor's normal: the normal swings through ninety degrees as you cross a
    // ridge, so a jump lifted along it threw him sideways out of the channel
    // halfway over. The channel opens upward — off the floor means up.
    if (this.air > 0) p.y += this.air;
    this.mesh.position.copy(p);
    // He LIES ON the floor of the channel, and tips with it: flat at the
    // bottom, up on its side against a wall. The angle is sampled off the
    // shape either side of him rather than assumed radial, because on the
    // square trough and the vee the floor does not face the axis.
    // (The first cut used lookAt() to point him up the channel and he
    // foreshortened into two white streaks — a claw seen end-on is not a
    // claw.)
    this.mesh.rotation.set(0, 0, this.tube.faceAngle(this.lane));

    const c = this.diving ? PAL.JACK_DIVE : PAL.JACK;
    this.mat.color.setRGB(c[0], c[1], c[2]);
    // the flicker after a hit — visible, and never so fast it is a strobe
    this.mesh.visible = this.mercy <= 0 || Math.floor(this.mercy * 12) % 2 === 0;
  }

  hit() {
    if (this.mercy > 0) return false;
    this.mercy = 1.6;
    this.diveT = -1;
    this.jumpT = -1;
    this.air = 0;
    this.depth = 0;
    this.vel = 0;
    return true;
  }

  /** Consumed by the frame: true exactly once per dive that came home. */
  scrubReady() { const d = !!this.diveDone; this.diveDone = false; return d; }

  reset() {
    // a run starts on the floor, in the middle of the channel
    this.lane = this.tube.floorLane; this.vel = 0; this.depth = 0;
    this.diveT = -1; this.jumpT = -1; this.air = 0;
    this.mercy = 0; this.alive = true; this.diveDone = false;
    this.mesh.visible = true;
  }
}

const ease = t => t * t * (3 - 2 * t);
