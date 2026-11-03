// posts.js — how what stands on a later world's floor looks (v108; sim/posts.js is what it does). Each world's
// kind is a small sculpture built from a few primitives in its set's own materials, lit by the scene's light
// (no glow: v104) and standing in its own shadow (render/light.js). A post that orbits is drawn where it is.
//
//   bollard  the driveway's: a concrete post, a yellow band, a rounded top
//   pipe     the sewer's: a stub of iron pipe out of the floor, a dark mouth, a rusted flange
//   pillar   the cistern's: one of its own columns, broken off, on a stepped plinth
//   drum     the boiler's: a copper drum with riveted bands and a valve on top
//   boulder  the river's: a wet rock, flattened, its top lighter
//   block    the ice's: a faceted block of deep blue ice and two shards
//   coral    the deep's: a coral head on its rock, fingers leaning out to its edge
//   crystal  the core's: a tall violet crystal, slowly turning
// Reads the world, never writes it. Every number is TUNING.posts (sim) and the look's own below.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, smoothstep, positionWorld } from 'three/tsl';
import { TUNING } from '../tuning.js?v=109';
import { noise } from './kit.js?v=109';

const T = TUNING;
const std = (color, rough = 0.6, metal = 0, extra = {}) => new THREE.MeshStandardNodeMaterial({ color, roughness: rough, metalness: metal, ...extra });
const phys = (color, extra = {}) => new THREE.MeshPhysicalNodeMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, ...extra });

// a kind's model at radius 1 (scaled by the post's radius), standing on y = 0
function build(kind) {
  const g = new THREE.Group(), add = (geo, mat, y = 0, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.scale.set(sx, sy, sz); g.add(m); return m; };
  if (kind === 'bollard') {
    const conc = std(0xb9b4aa, 0.85), band = std(0xf2c230, 0.4);
    add(new THREE.CylinderGeometry(0.82, 0.9, 1.7, 24).translate(0, 0.85, 0), conc);
    add(new THREE.CylinderGeometry(0.85, 0.85, 0.28, 24).translate(0, 1.18, 0), band);
    add(new THREE.SphereGeometry(0.82, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.7, 0), conc);
  } else if (kind === 'pipe') {
    const iron = std(0x5b4a3f, 0.55, 0.55), rust = std(0x8a4b2a, 0.75, 0.3), dark = std(0x0d0b0a, 1);
    add(new THREE.CylinderGeometry(0.86, 0.86, 1.1, 28, 1, true).translate(0, 0.55, 0), iron).material.side = THREE.DoubleSide;
    add(new THREE.TorusGeometry(0.88, 0.1, 10, 32).rotateX(Math.PI / 2).translate(0, 1.1, 0), rust);   // the flange: a ring, so the mouth shows
    add(new THREE.CircleGeometry(0.82, 28).rotateX(-Math.PI / 2).translate(0, 0.86, 0), dark);
    add(new THREE.CylinderGeometry(1, 1.04, 0.16, 28).translate(0, 0.08, 0), rust);
  } else if (kind === 'pillar') {
    // one of the cistern's own columns (render/scenery.js), broken: the set's stone, dark and wet at the waterline,
    // on a stepped octagonal plinth (its edge is the circle that blocks), the fluted shaft snapped off with a jagged
    // break that is paler where it is fresh. (v108's first cut wore a capital and read from above as a stool.)
    const ST = T.scenery.cistern.stone, wet = (k) => {
      const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.9, metalness: 0 });
      m.colorNode = Fn(() => {
        const p = positionWorld, grit = noise(vec2(p.x.add(p.z), p.y).mul(6)).mul(0.18).add(0.85), damp = float(1).sub(smoothstep(0.1, 0.9, p.y));
        return vec3(...ST).mul(k).mul(grit).mul(float(1).sub(damp.mul(0.5))).add(vec3(0, 0.02, 0.025).mul(damp));
      })();
      return m;
    };
    const stone = wet(1.7), step = wet(1.4), fresh = wet(2.7);
    const H = 1.5, shaft = new THREE.CylinderGeometry(0.6, 0.66, H, 24, 3, false), pos = shaft.attributes.position;
    // the break: the top ring raised and dropped by the angle round it (cap and side agree, so no crack opens), the
    // middle of the break sunk; then the flutes (every other edge set in)
    const jag = (a) => 0.2 * Math.sin(3 * a + 0.7) + 0.11 * Math.sin(7 * a + 2.1) + 0.05 * Math.sin(13 * a + 0.4);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), rim = Math.hypot(x, z) > 0.01;
      if (y > H / 2 - 1e-6) pos.setY(i, rim ? y + jag(a) : y - 0.12);
      const k = rim ? 1 - 0.07 * (Math.cos(a * 12) * 0.5 + 0.5) : 1;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    shaft.computeVertexNormals(); shaft.translate(0, 0.46 + H / 2, 0);
    add(new THREE.CylinderGeometry(1, 1.04, 0.3, 8).translate(0, 0.15, 0), step).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(0.84, 0.88, 0.16, 8).translate(0, 0.38, 0), step).rotation.y = Math.PI / 8;
    add(shaft, [stone, fresh, stone]);   // CylinderGeometry's groups: the side, the top (the break), the bottom
  } else if (kind === 'drum') {
    const copper = std(0xd07a42, 0.34, 0.35), band = std(0x3f342c, 0.5, 0.5), brass = std(0xe2bb52, 0.28, 0.45);
    add(new THREE.CylinderGeometry(1, 1, 1.5, 32).translate(0, 0.75, 0), copper);
    for (const y of [0.25, 1.25]) add(new THREE.CylinderGeometry(1.03, 1.03, 0.12, 32).translate(0, y, 0), band);
    add(new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.5, 0), copper, 0, 1, 0.35, 1);
    add(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12).translate(0, 1.95, 0), brass);
    add(new THREE.TorusGeometry(0.22, 0.05, 8, 20).rotateX(Math.PI / 2).translate(0, 2.18, 0), brass);
  } else if (kind === 'boulder') {
    const rock = std(0x6d7468, 0.55), top = std(0x8e9585, 0.7);
    add(new THREE.DodecahedronGeometry(1, 1), rock, 0.35, 1.05, 0.62, 0.95);
    add(new THREE.DodecahedronGeometry(0.62, 1), top, 0.62, 1, 0.5, 1).rotation.y = 0.7;
  } else if (kind === 'block') {
    // a hand-cut chunk of old blue ice, faceted (flat-shaded, so every cut face catches the light on its own), its
    // heart a deeper blue showing through, two shards broken off beside it. A deep enough blue to stand out on the
    // pale sheet: v108's first cut was the sheet's own colour, a little see-through, and all but vanished on it
    const ice = phys(0x3f93dc, { roughness: 0.05, transparent: true, opacity: 0.9, flatShading: true }), deep = phys(0x1a56a0, { roughness: 0.06, flatShading: true });
    const cut = (w, h, d, seed) => {
      const g2 = new THREE.BoxGeometry(w, h, d, 2, 2, 2).toNonIndexed(), cp = g2.attributes.position;
      const key = (x, y, z) => `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`, off = new Map();
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i), k = key(x, y, z);
        if (!off.has(k)) { const n = Math.sin(x * 12.9 + y * 78.2 + z * 37.7 + seed) * 43758.5; off.set(k, (n - Math.floor(n) - 0.5) * 0.22); }
        const j = off.get(k); cp.setXYZ(i, x + j, y + j * 0.5, z - j * 0.8);
      }
      g2.computeVertexNormals(); return g2;
    };
    add(cut(1.6, 1.3, 1.6, 1).translate(0, 0.65, 0), ice).rotation.y = 0.4;
    add(cut(0.95, 0.75, 0.95, 2).translate(0, 0.38, 0), deep).rotation.y = 0.4;
    const s1 = add(cut(0.42, 0.3, 0.38, 3).translate(0, 0.15, 0), ice); s1.position.set(0.82, 0, 0.5); s1.rotation.y = 1.1;
    const s2 = add(cut(0.34, 0.24, 0.3, 4).translate(0, 0.12, 0), ice); s2.position.set(-0.62, 0, -0.78); s2.rotation.y = 2.2;
  } else if (kind === 'coral') {
    // a coral head that fills the circle it blocks (v108's first cut was half of it): a dark rock it grows from, a
    // brain-coral dome, and branching fingers leaning out to the circle's edge, the whole of it faintly lit from inside
    // and its tips the most (the deep's own light is living things: its fish and its snow glow the same way; without it
    // the pink drowns to a dark purple in the deep's light and only the tips read)
    const rock = std(0x27302f, 0.9), a = std(0xff6f91, 0.5, 0, { emissive: 0xff4f7a, emissiveIntensity: 0.16 }), b = std(0xff8fa6, 0.5, 0, { emissive: 0xff6f91, emissiveIntensity: 0.22 }), tipM = std(0xffc2cf, 0.45, 0, { emissive: 0xff7a9a, emissiveIntensity: 0.6 });
    add(new THREE.DodecahedronGeometry(0.98, 1), rock, 0.02, 1, 0.26, 1);
    add(new THREE.SphereGeometry(0.58, 20, 14), a, 0.3, 1, 0.72, 1);
    const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
    for (let k = 0; k < 7; k++) {
      const phi = (k / 7) * Math.PI * 2 + 0.35 * Math.sin(k * 2.3), lean = 0.5 + 0.18 * Math.sin(k * 1.7), h = 0.72 + 0.22 * Math.sin(k * 3.1 + 1), r0 = 0.32;
      dir.set(Math.sin(lean) * Math.cos(phi), Math.cos(lean), Math.sin(lean) * Math.sin(phi));
      const f = add(new THREE.CylinderGeometry(0.1, 0.17, h, 12).translate(0, h / 2, 0), b);
      f.position.set(r0 * Math.cos(phi), 0.12, r0 * Math.sin(phi)); f.quaternion.setFromUnitVectors(up, dir);
      const tip = add(new THREE.SphereGeometry(0.15, 12, 10), tipM); tip.position.copy(f.position).addScaledVector(dir, h);
    }
  } else if (kind === 'crystal') {
    // lit from inside, as the core's own lamps are: a surface that is its own light, not a halo round it (v104)
    const glass = phys(0xd2a6ff, { roughness: 0.06, sheen: 0.6, sheenColor: new THREE.Color(0xff8cf0), emissive: 0x7a3bd6, emissiveIntensity: 0.55 }), base = std(0x2a2240, 0.6, 0.4);
    add(new THREE.CylinderGeometry(0.9, 1, 0.25, 6).translate(0, 0.12, 0), base);
    add(new THREE.OctahedronGeometry(0.75, 0).translate(0, 0.75, 0), glass, 0, 1, 2.2, 1);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}

export class PostView {
  constructor(scene) { this.scene = scene; this.views = []; this.key = ''; this.cache = new Map(); }
  _model(kind) {
    // one model a kind, cloned: the geometry and materials are shared
    if (!this.cache.has(kind)) this.cache.set(kind, build(kind));
    return this.cache.get(kind).clone();
  }
  reset() { for (const v of this.views) this.scene.remove(v); this.views = []; this.key = ''; }
  sync(w, alpha, time) {
    const P = w?.posts ?? [], key = P.map((p) => `${p.kind}:${p.r.toFixed(2)}`).join('|');
    if (key !== this.key) {
      this.reset();
      this.key = key;
      for (const p of P) { const v = this._model(p.kind); v.scale.setScalar(p.r); v.rotation.y = (p.x * 1.7 + p.z * 0.9) % (Math.PI * 2); this.scene.add(v); this.views.push(v); }
    }
    P.forEach((p, i) => {
      const v = this.views[i];
      if (!v) return;
      v.position.set(p.px + (p.x - p.px) * alpha, 0, p.pz + (p.z - p.pz) * alpha);
      if (p.kind === 'crystal') v.rotation.y = time * 0.4 + i * 1.3;
    });
  }
}
