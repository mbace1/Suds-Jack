// SUDS JACK — the tube.
//
// Tempest's web, and the one piece of geometry the whole game is measured
// against: every position in this game is (lane, depth). A lane is a segment
// of the rim, depth is 0 at the mouth where you stand and 1 at the far end
// where things come from. Nothing anywhere else in this project touches world
// coordinates — it asks `at(lane, depth)` and gets a point back.
//
// That is not tidiness for its own sake. It is what lets the web change shape
// between levels (circle → square → clover → star) without one line of the
// game logic knowing: the shapes differ in where `at()` puts you, not in what
// a lane means. Bubbles rise the same way up a star as up a circle.
//
// The far end does NOT converge to a point. A tube that closes to a dot has
// nowhere to spawn anything and the last stretch of every riser is a crawl
// across two pixels; this one keeps 8.5% of its radius at the back, which is
// enough to read a lane at the moment it matters — when it is still far away.
// The first cut kept 16% and the whole thing read as a flat dartboard: too
// little convergence and there is no tube, just a disc with spokes on it.

import * as THREE from 'three';
import { PAL } from './palette.js';

const FAR_SCALE = 0.085;

// Each shape maps a fraction around the rim (0..1) to a unit-radius point.
// They are closed loops of the same length, so a lane index means the same
// thing in all of them and a level change is a shape swap, not a rebuild.
const SHAPES = {
  circle: (u) => {
    const a = u * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)];
  },
  square: (u) => {
    // walk the perimeter of a square, corner to corner
    const s = u * 4, side = Math.floor(s) % 4, f = s - Math.floor(s);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const [ax, ay] = pts[side], [bx, by] = pts[(side + 1) % 4];
    return [ax + (bx - ax) * f, ay + (by - ay) * f];
  },
  clover: (u) => {
    const a = u * Math.PI * 2;
    const r = 0.72 + 0.34 * Math.abs(Math.cos(a * 2));
    return [Math.cos(a) * r, Math.sin(a) * r];
  },
  star: (u) => {
    const a = u * Math.PI * 2;
    const r = 0.62 + 0.42 * Math.cos(a * 5) ** 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  },
  // A drain: the rim is a circle but the far end is pulled off-axis, so the
  // lanes are not the same length and the tube leans. Nothing in the game
  // notices; it just feels wrong in the right way.
  drain: (u) => {
    const a = u * Math.PI * 2;
    return [Math.cos(a), Math.sin(a) * 0.78];
  },
};

export const SHAPE_NAMES = ['circle', 'square', 'clover', 'drain', 'star'];

export class Tube {
  constructor(scene, { lanes = 14, radius = 8.2, depth = 74 } = {}) {
    this.lanes = lanes;
    this.radius = radius;
    this.depth = depth;
    this.shape = 'circle';
    this.lean = new THREE.Vector2(0, 0);   // where the far end sits, in radii

    this.group = new THREE.Group();
    scene.add(this.group);

    // the rails: one line per lane boundary, running the length of the tube
    this.railGeo = new THREE.BufferGeometry();
    this.railPos = new Float32Array(lanes * 2 * 3);
    this.railGeo.setAttribute('position', new THREE.BufferAttribute(this.railPos, 3));
    this.rails = new THREE.LineSegments(
      this.railGeo,
      new THREE.LineBasicMaterial({ color: PAL.RAIL_DIM, transparent: true, opacity: 0.85 }),
    );
    this.group.add(this.rails);

    // rings at a few depths — the only thing telling you how far away a riser
    // is, since there is no lighting and no shadow to do it
    this.ringDepths = [0, 0.13, 0.3, 0.52, 0.76, 1];
    this.ringGeo = new THREE.BufferGeometry();
    this.ringPos = new Float32Array(this.ringDepths.length * lanes * 2 * 3);
    this.ringGeo.setAttribute('position', new THREE.BufferAttribute(this.ringPos, 3));
    this.rings = new THREE.LineSegments(
      this.ringGeo,
      new THREE.LineBasicMaterial({ color: PAL.RING, transparent: true, opacity: 0.7 }),
    );
    this.group.add(this.rings);

    // the mouth: the rim you ride, drawn hot so the play surface is obvious
    this.rimGeo = new THREE.BufferGeometry();
    this.rimPos = new Float32Array(lanes * 2 * 3);
    this.rimGeo.setAttribute('position', new THREE.BufferAttribute(this.rimPos, 3));
    this.rim = new THREE.LineSegments(
      this.rimGeo,
      new THREE.LineBasicMaterial({ color: PAL.RIM, transparent: true, opacity: 0.95 }),
    );
    this.group.add(this.rim);

    this.rebuild();
  }

  // A lane's centre as a fraction around the rim. Lanes are BETWEEN rails, so
  // the centre is offset half a lane — you ride the segment, not the seam.
  _u(lane) { return ((lane % this.lanes) + this.lanes) % this.lanes / this.lanes; }

  /**
   * The one function. `lane` may be fractional (the player slides between
   * lanes), `depth` is 0 at the mouth and 1 at the far end.
   */
  at(lane, depth, out = new THREE.Vector3()) {
    const u = (this._u(lane) + 0.5 / this.lanes) % 1;
    const [sx, sy] = SHAPES[this.shape](u);
    const k = 1 + (FAR_SCALE - 1) * depth;          // radius falls off with depth
    const cx = this.lean.x * this.radius * depth;   // and the far end can lean
    const cy = this.lean.y * this.radius * depth;
    return out.set(
      cx + sx * this.radius * k,
      cy + sy * this.radius * k,
      -this.depth * depth,
    );
  }

  // The rim point ON a seam rather than in a lane centre — for drawing the web
  // itself, which is made of seams.
  _seam(i, depth, out = new THREE.Vector3()) {
    const u = ((i % this.lanes) + this.lanes) % this.lanes / this.lanes;
    const [sx, sy] = SHAPES[this.shape](u);
    const k = 1 + (FAR_SCALE - 1) * depth;
    return out.set(
      this.lean.x * this.radius * depth + sx * this.radius * k,
      this.lean.y * this.radius * depth + sy * this.radius * k,
      -this.depth * depth,
    );
  }

  setShape(name, lean = [0, 0]) {
    this.shape = SHAPES[name] ? name : 'circle';
    this.lean.set(lean[0], lean[1]);
    this.rebuild();
  }

  rebuild() {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    let p = 0;
    for (let i = 0; i < this.lanes; i++) {
      this._seam(i, 0, a); this._seam(i, 1, b);
      this.railPos.set([a.x, a.y, a.z, b.x, b.y, b.z], p); p += 6;
    }
    this.railGeo.attributes.position.needsUpdate = true;

    p = 0;
    for (const d of this.ringDepths) {
      for (let i = 0; i < this.lanes; i++) {
        this._seam(i, d, a); this._seam(i + 1, d, b);
        this.ringPos.set([a.x, a.y, a.z, b.x, b.y, b.z], p); p += 6;
      }
    }
    this.ringGeo.attributes.position.needsUpdate = true;

    p = 0;
    for (let i = 0; i < this.lanes; i++) {
      this._seam(i, 0, a); this._seam(i + 1, 0, b);
      this.rimPos.set([a.x, a.y, a.z, b.x, b.y, b.z], p); p += 6;
    }
    this.rimGeo.attributes.position.needsUpdate = true;
  }

  // A slow roll, so a still web never looks like a screenshot. It is rotation
  // of the GROUP, not of the lane numbering — where a bubble is on the rim
  // does not change because the picture turned.
  update(dt, spin = 0.06) {
    this.group.rotation.z += dt * spin;
  }

  tint(hue) {
    const rail = new THREE.Color().setHSL(hue, 0.9, 0.42);
    const ring = new THREE.Color().setHSL((hue + 0.08) % 1, 0.7, 0.22);
    const rim = new THREE.Color().setHSL((hue + 0.5) % 1, 0.75, 0.66);
    this.rails.material.color.copy(rail);
    this.rings.material.color.copy(ring);
    this.rim.material.color.copy(rim);
  }
}
