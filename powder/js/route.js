// Route — the race line, and the reason to go down into the rift.
//
// Gates are laid alternately ON the canyon floor and OUT on the flats. That is
// the whole design: the salt pan is the fastest surface in the game and the
// canyon is where the salt is, so a run is a sequence of decisions about when
// to drop in and when to climb out. You cannot climb a 60-degree wall, so the
// exits are the breaches the terrain already generates — finding the next one
// in time IS the game.
//
// A gate is a plane you cross, not a hoop you thread: catching it needs you
// within `RADIUS` of the post line. Threading would be a different, meaner
// game, and this one is already asking you to read a canyon at 300 km/h.
import * as THREE from 'three';
import { PAL } from './palette.js?v=5';

// Half the terrain's breach cycle, so gates land alternately on the deepest
// part of the rift and on a breach — which guarantees a way in and a way out
// exists between every pair of them. Decoupling these two numbers means a
// gate can sit on a canyon floor with no reachable entrance for 400 m.
export const SPACING = 470;
const FIRST = 940;
export const RADIUS = 46;

export class Route {
  constructor(terrain, scene) {
    this.terrain = terrain;
    this.scene = scene;
    this.index = 0;
    this.marks = new THREE.Group();
    scene.add(this.marks);
    this._built = -1;

    const post = new THREE.CylinderGeometry(0.7, 0.9, 26, 8);
    this.geo = { post, ring: new THREE.TorusGeometry(RADIUS * 0.42, 0.5, 6, 28) };
    this.mat = {
      post: new THREE.MeshStandardMaterial({
        color: PAL.hull, emissive: PAL.glow, emissiveIntensity: 0.35, roughness: 0.5 }),
      live: new THREE.MeshBasicMaterial({ color: PAL.glow }),
      next: new THREE.MeshBasicMaterial({ color: PAL.hot }),
    };
  }

  /** Where gate `i` stands. Even gates in the rift, odd gates out on the flats. */
  at(i, out = {}) {
    const z = -FIRST - i * SPACING;
    const cx = this.terrain.canyonX(z);
    if (i % 2 === 0) {
      // even gates land on the deepest part of the rift: to take one you have
      // to actually be down there
      out.x = cx; out.z = z; out.rift = true;
    } else {
      // odd gates land beside a breach, out on the open ground — the climb
      // out, and the leg of the run that is flatland rather than canyon
      const side = (i % 4 === 1) ? 1 : -1;
      out.x = cx + side * 150; out.z = z; out.rift = false;
    }
    out.y = this.terrain.height(out.x, out.z);
    out.i = i;
    return out;
  }

  get current() { return this.at(this.index, this._cur || (this._cur = {})); }

  /** Did this position take the gate? Advances if so. */
  check(x, z) {
    const g = this.current;
    if (Math.hypot(x - g.x, z - g.z) < RADIUS) { this.index++; return true; }
    // never let a missed gate strand the run — once you are well past it, it
    // counts as blown and the route moves on rather than sending you back
    if (z < g.z - 140) { this.index++; return false; }
    return false;
  }

  /** Rebuild the posts when the target changes. */
  update() {
    if (this._built === this.index) return;
    this._built = this.index;
    this.marks.clear();
    for (let k = 0; k < 3; k++) {
      const g = this.at(this.index + k, {});
      const mat = k === 0 ? this.mat.live : this.mat.next;
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(this.geo.post, this.mat.post);
        p.position.set(g.x + side * RADIUS * 0.8, g.y + 12, g.z);
        p.castShadow = true;
        this.marks.add(p);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), mat);
        cap.position.set(g.x + side * RADIUS * 0.8, g.y + 26, g.z);
        this.marks.add(cap);
      }
      if (k === 0) {
        const r = new THREE.Mesh(this.geo.ring, this.mat.live);
        r.position.set(g.x, g.y + 14, g.z);
        r.rotation.x = Math.PI / 2;
        r.scale.setScalar(1.6);
        this.marks.add(r);
      }
    }
  }
}
