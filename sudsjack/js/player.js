// SUDS JACK — the jack.
//
// He is a SCOOP, not a gun. There is no fire button in this game: everything
// he does is get somewhere in time, and the only two things he can do are go
// round the rim and go down the tube.
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

const RIM_SPEED = 6.2;          // lanes per second at full tilt
const RIM_ACCEL = 34;           // how fast you reach it — snappy, not instant
const DIVE_OUT = 0.26;          // seconds going down
const DIVE_HOLD = 0.1;          // at the bottom
const DIVE_BACK = 0.26;         // and back
const DIVE_DEPTH = 0.55;        // how far down the tube a dive reaches

export class Player {
  constructor(scene, tube) {
    this.tube = tube;
    this.lane = 0;              // fractional: he slides, he does not tick
    this.vel = 0;
    this.depth = 0;
    this.diveT = -1;            // < 0 = not diving
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

  dive() {
    if (this.diving || !this.alive) return false;
    this.diveT = 0;
    return true;
  }

  // `dir` is -1..1 from whatever is driving him: keys, a stick, a thumb.
  move(dir, dt) {
    // Locked to the lane while committed. This is the cost of the dive and it
    // is not softened anywhere: half a dive is not a thing you can do.
    const want = this.diving ? 0 : dir * RIM_SPEED;
    const d = want - this.vel;
    const step = RIM_ACCEL * dt;
    this.vel += Math.abs(d) <= step ? d : Math.sign(d) * step;
    this.lane += this.vel * dt;
    const n = this.tube.lanes;
    this.lane = ((this.lane % n) + n) % n;
  }

  update(dt) {
    if (this.mercy > 0) this.mercy -= dt;

    if (this.diving) {
      this.diveT += dt;
      const total = DIVE_OUT + DIVE_HOLD + DIVE_BACK;
      if (this.diveT >= total) { this.diveT = -1; this.depth = 0; }
      else if (this.diveT < DIVE_OUT) {
        this.depth = DIVE_DEPTH * ease(this.diveT / DIVE_OUT);
      } else if (this.diveT < DIVE_OUT + DIVE_HOLD) {
        this.depth = DIVE_DEPTH;
      } else {
        this.depth = DIVE_DEPTH * (1 - ease((this.diveT - DIVE_OUT - DIVE_HOLD) / DIVE_BACK));
      }
    }

    const p = this.tube.at(this.lane, this.depth);
    // pulled a little inside the rim: centred exactly on it, half the claw
    // hangs out into the void and the tube stops looking like a solid edge
    p.x *= 0.93; p.y *= 0.93;
    this.mesh.position.copy(p);
    // He LIES ON the rim, opening toward the middle of the tube — which is
    // where everything comes from. The first cut used lookAt() to point him
    // up the tube and he foreshortened into two white streaks from the
    // camera's angle: a claw seen end-on is not a claw. Rolling him around
    // the axis instead keeps the whole shape facing the player at every point
    // on the rim, which is how Tempest's own claw works.
    this.mesh.rotation.set(0, 0, Math.atan2(p.y, p.x) + Math.PI / 2);
    const scale = 1.05 * (1 - 0.62 * this.depth);
    this.mesh.scale.setScalar(scale);

    const c = this.diving ? PAL.JACK_DIVE : PAL.JACK;
    this.mat.color.setRGB(c[0], c[1], c[2]);
    // the flicker after a hit — visible, and never so fast it is a strobe
    this.mesh.visible = this.mercy <= 0 || Math.floor(this.mercy * 12) % 2 === 0;
  }

  hit() {
    if (this.mercy > 0) return false;
    this.mercy = 1.6;
    this.diveT = -1;
    this.depth = 0;
    this.vel = 0;
    return true;
  }

  reset() {
    this.lane = 0; this.vel = 0; this.depth = 0;
    this.diveT = -1; this.mercy = 0; this.alive = true;
    this.mesh.visible = true;
  }
}

const ease = t => t * t * (3 - 2 * t);
