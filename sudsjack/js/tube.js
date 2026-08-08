// SUDS JACK — the trough.
//
// Not a closed tube: a HALF tunnel, open along the top, and you ride the floor
// of it. Every position is still (lane, depth) — a lane is a strip of the
// channel running away from you, depth is 0 at the mouth where you are and 1
// at the far end where things come from. Nothing outside this file touches
// world coordinates: it asks `at(lane, depth)` and gets a point back.
//
// THE OPENING IS NOT DECORATION. A closed ring has no ends, so you can always
// keep running and a hazard can always be outrun; a channel has two lips, and
// the lane at each lip is somewhere you can be cornered. That is the whole
// difference in the game, and it comes entirely out of this file — `at()` maps
// lanes across an arc instead of around a circle, and `lanes` no longer wrap.
//
// THE CROSS-SECTION DOES NOT CHANGE WITH DEPTH, and that is the correction
// that made this a tunnel. It was built first the way Tempest draws a web —
// the far end scaled down toward a point — which is right for a 2D vector
// game with no camera and wrong here, because a perspective camera is ALREADY
// converging it. Doing both meant the floor climbed steeply away from you and
// the whole thing read as a flat paper fan seen from above rather than a
// channel you are lying in. A real tunnel is the same size all the way along;
// the far end looks small because it is far away.
//
// `lean` survives from that first cut and now does something better: it
// offsets the far cross-section, which BENDS the channel instead of shrinking
// it.

import * as THREE from 'three';
import { PAL } from './palette.js';


// Each shape maps a fraction ACROSS the channel (0 = left lip, 1 = right lip)
// to a unit cross-section point. THE DIRECTION IS PART OF THE CONTRACT: three
// of these ran right-to-left when they were first written, so on those levels
// pressing right moved you left and the claw was drawn upside down — the
// player and the shapes disagreed about which way round the channel went, and
// only the shapes were wrong. `faceAngle()` on a flat floor is 0 when a shape
// has this the right way round, which is what the smoke gate now checks. y = 0 is the height of the lips and negative
// is down into the trough, so every shape hangs below the opening and the
// floor is somewhere around u = 0.5. They all run left to right, so a lane
// index means the same thing in all of them and a level change is a shape
// swap, not a rebuild.
const SHAPES = {
  // the plain half-pipe: the bottom half of a circle
  pipe: (u) => {
    const a = Math.PI + u * Math.PI;
    return [Math.cos(a), Math.sin(a)];
  },
  // a square channel: down the left wall, across the floor, up the right
  trough: (u) => {
    if (u < 0.25) return [-1, -(u / 0.25)];
    if (u < 0.75) return [-1 + ((u - 0.25) / 0.5) * 2, -1];
    return [1, -(1 - (u - 0.75) / 0.25)];
  },
  // a V: no floor at all, so the middle is a single lane and the walls are
  // long — the shape that most rewards sitting still and most punishes it
  vee: (u) => [(u - 0.5) * 2, -(1 - Math.abs(u - 0.5) * 2)],
  // a rippled floor: three shallow dips, so "the bottom" is three places
  wave: (u) => {
    const a = Math.PI + u * Math.PI;
    const r = 0.78 + 0.22 * Math.cos(u * Math.PI * 6);
    return [Math.cos(a), Math.sin(a) * r];
  },
  // a drain: deep and steep on the left, shallow on the right. The lips are
  // at different heights, so neither end of the channel is the same trap.
  drain: (u) => {
    const a = Math.PI + u * Math.PI;
    return [Math.cos(a) * 1.05, Math.sin(a) * (1.15 - u * 0.5)];
  },
  // FIVE HALF-PIPES IN A ROW, with a peak between each (owner's direction).
  // The peaks are the point: they are the only thing in this game that stops
  // you RIDING somewhere, so the level comes with its own verb — you jump
  // them. Each bay is its own little channel with its own problem in it, and
  // getting to the next one is a decision instead of a walk.
  //
  // The peaks stop at 0.22 rather than reaching the lips: a peak level with
  // the walls would read as five separate tunnels, and the whole appeal is
  // seeing the bay you are about to jump into.
  gutters: (u) => {
    // FIVE IDENTICAL BAYS between six identical ridge tops. Both of those
    // words are load-bearing:
    //  · identical, because the first cut ramped the two outer ends up to
    //    lip height to give the channel walls, and that ramp ate half of the
    //    first and last bays — they read as big flat wings and there were
    //    really only three U's in the middle.
    //  · a ridge is half a bay deep. Taken nearly to the top it is a row of
    //    spikes, and you cannot see the bay you are about to jump into.
    const t = (u * BAYS) % 1;                       // where you are in a bay
    const dip = -0.5 * (1 - Math.cos(t * Math.PI * 2));   // 0 at a ridge, -1 at a floor
    return [-1 + u * 2, dip * 0.5 - 0.5];
  },
};

// How many bays `gutters` has, and — with LANES_PER_BAY — where its peaks
// fall. They sit on lane SEAMS rather than on lanes, so a peak is a line you
// cannot cross rather than a square you cannot stand on: standing on top of
// one would need a rule about what happens when you are on it, and there is
// no good answer to that.
export const BAYS = 5;
// Four, not three. At three lanes a bay the cosine is sampled so coarsely
// that each bay draws as a V instead of a U — and a bay you can only stand in
// three places in is not somewhere you move around, it is a slot.
export const LANES_PER_BAY = 4;

// Which shapes have peaks, and where. Declared rather than detected: finding
// local maxima in a cross-section also finds `wave`'s ripples, which are meant
// to be texture underfoot and not walls.
const PEAKS = {
  gutters: Array.from({ length: BAYS - 1 }, (_, i) => (i + 1) * LANES_PER_BAY),
};

export const SHAPE_NAMES = ['pipe', 'trough', 'gutters', 'wave', 'drain', 'vee'];

export class Tube {
  constructor(scene, { lanes = BAYS * LANES_PER_BAY, radius = 11.4, depth = 78 } = {}) {
    this.lanes = lanes;
    this.radius = radius;
    this.depth = depth;
    this.shape = 'pipe';
    this.lean = new THREE.Vector2(0, 0);   // where the far end sits, in radii

    this.group = new THREE.Group();
    scene.add(this.group);

    // An open channel has one more seam than it has lanes. Every count in
    // here is lanes+1 for that reason, and the ring loops stop at the lips
    // instead of closing — a segment joining the two lips would draw a lid on
    // a thing whose whole point is that it has no lid.
    const seams = lanes + 1;

    this.railGeo = new THREE.BufferGeometry();
    this.railPos = new Float32Array(seams * 2 * 3);
    this.railGeo.setAttribute('position', new THREE.BufferAttribute(this.railPos, 3));
    this.rails = new THREE.LineSegments(
      this.railGeo,
      new THREE.LineBasicMaterial({ color: PAL.RAIL_DIM, transparent: true, opacity: 0.85 }),
    );
    this.group.add(this.rails);

    // ribs at a few depths — the only thing telling you how far away a riser
    // is, since there is no lighting and no shadow to do it
    this.ringDepths = [0, 0.09, 0.2, 0.33, 0.48, 0.65, 0.83, 1];
    this.ringGeo = new THREE.BufferGeometry();
    this.ringPos = new Float32Array(this.ringDepths.length * lanes * 2 * 3);
    this.ringGeo.setAttribute('position', new THREE.BufferAttribute(this.ringPos, 3));
    this.rings = new THREE.LineSegments(
      this.ringGeo,
      new THREE.LineBasicMaterial({ color: PAL.RING, transparent: true, opacity: 0.7 }),
    );
    this.group.add(this.rings);

    // the mouth: the near edge you ride, drawn hot so the play surface is
    // obvious
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

  // Lanes DO NOT WRAP. Running off the end of a channel is not a thing, and
  // the clamp is where "cornered at the lip" comes from.
  clampLane(lane) { return Math.max(0, Math.min(this.lanes - 0.001, lane)); }

  /** The middle lane — the floor of the channel, and where a run starts. */
  get floorLane() { return (this.lanes - 1) / 2; }

  /** Lane seams you cannot ride across on this shape. Empty on most of them. */
  get peaks() { return PEAKS[this.shape] || []; }

  /**
   * How far you can ride from where you are without jumping: the bay you are
   * in, bounded by peaks or by the lips. On a shape with no peaks that is the
   * whole channel, which is why nothing else needs a special case for this.
   */
  bayRange(lane) {
    let lo = 0, hi = this.lanes;
    for (const p of this.peaks) {
      if (p <= lane && p > lo) lo = p;
      if (p > lane && p < hi) hi = p;
    }
    return [lo, hi - 0.001];
  }

  /**
   * Where a jump in `dir` lands: the middle of the next bay, or — on a shape
   * with no peaks — a two-lane hop, which keeps the verb useful everywhere
   * rather than making it dead weight on four levels out of six.
   */
  jumpTarget(lane, dir) {
    const [lo, hi] = this.bayRange(lane);
    if (!this.peaks.length) return this.clampLane(lane + dir * 2);
    const edge = dir > 0 ? hi + 0.001 : lo - 0.001;
    if (edge < 0 || edge >= this.lanes) return null;      // no bay that way
    const [nlo, nhi] = this.bayRange(edge);
    return (nlo + nhi) / 2;
  }

  /**
   * The one function. `lane` may be fractional (the player slides between
   * lanes), `depth` is 0 at the mouth and 1 at the far end.
   */
  at(lane, depth, out = new THREE.Vector3()) {
    const u = (this.clampLane(lane) + 0.5) / this.lanes;
    return this._point(u, depth, out);
  }

  _point(u, depth, out = new THREE.Vector3()) {
    const [sx, sy] = SHAPES[this.shape](Math.max(0, Math.min(1, u)));
    // no k: same channel at every depth. The camera does the converging.
    return out.set(
      this.lean.x * this.radius * depth + sx * this.radius,
      this.lean.y * this.radius * depth + sy * this.radius,
      -this.depth * depth,
    );
  }

  // The seam BETWEEN lanes rather than a lane centre — for drawing the
  // channel itself, which is made of seams.
  _seam(i, depth, out = new THREE.Vector3()) {
    return this._point(i / this.lanes, depth, out);
  }

  /**
   * Which way the floor faces at a lane, as an angle. Sampled either side
   * rather than assumed radial: on a round pipe the surface normal happens to
   * point at the axis, but on the square trough and the vee it does not, and
   * the player has to lie ON the floor in all of them.
   */
  faceAngle(lane) {
    const e = 0.35;
    const a = this.at(lane - e, 0, new THREE.Vector3());
    const b = this.at(lane + e, 0, new THREE.Vector3());
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  setShape(name, lean = [0, 0]) {
    this.shape = SHAPES[name] ? name : 'pipe';
    this.lean.set(lean[0], lean[1]);
    this.rebuild();
  }

  rebuild() {
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    let p = 0;
    for (let i = 0; i <= this.lanes; i++) {
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

  // A slow sway rather than a roll. A channel cannot spin — it has a floor,
  // and a floor that rotates is not a floor — so the whole thing leans a few
  // degrees each way instead, which keeps a still picture alive without ever
  // making you wonder which way is down.
  update(dt, amount = 1) {
    this._sway = (this._sway || 0) + dt * 0.35;
    this.group.rotation.z = Math.sin(this._sway) * 0.035 * amount;
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
