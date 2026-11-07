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
//   ball     the driveway's (v111): a beach ball in six panels and two white caps, rolling the way it goes
// Reads the world, never writes it. Every number is TUNING.posts (sim) and the look's own below.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, smoothstep, mix, positionWorld, positionLocal, normalWorld } from 'three/tsl';
import { TUNING } from '../tuning.js?v=122';
import { noise } from './kit.js?v=122';

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
      if (y > H / 2 - 1e-6) pos.setY(i, rim ? y + jag(a) : y - 0.04);
      const k = rim ? 1 - 0.07 * (Math.cos(a * 12) * 0.5 + 0.5) : 1;
      pos.setX(i, x * k); pos.setZ(i, z * k);
    }
    shaft.computeVertexNormals(); shaft.translate(0, 0.46 + H / 2, 0);
    add(new THREE.CylinderGeometry(1, 1.04, 0.3, 8).translate(0, 0.15, 0), step).rotation.y = Math.PI / 8;
    add(new THREE.CylinderGeometry(0.84, 0.88, 0.16, 8).translate(0, 0.38, 0), step).rotation.y = Math.PI / 8;
    add(shaft, [stone, fresh, stone]);   // CylinderGeometry's groups: the side, the top (the break), the bottom
    // v113: rubble lying in the break, so its middle reads as broken stone rather than as a pinwheel of cut faces
    [[0.16, 0.1, 0.17], [-0.2, -0.06, 0.14], [0.03, -0.24, 0.11], [-0.05, 0.27, 0.09]].forEach(([x, z, r], k) => {
      const m = add(new THREE.DodecahedronGeometry(r, 0), fresh, 0.46 + H - 0.02 + r * 0.5, 1, 0.8, 1); m.position.x = x; m.position.z = z; m.rotation.set(k * 0.9, k * 1.3, k * 0.4);
    });
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
    // v113: and read as ICE, not blue plastic — every face that looks up is frosted pale where the sun catches it,
    // the sides deepen toward the floor, and a little snow has drifted round its foot (its sides stay a deep blue,
    // so it still stands out on the pale sheet from above)
    const ice = phys(0x3f93dc, { roughness: 0.05, transparent: true, opacity: 0.9, flatShading: true }), deep = phys(0x1a56a0, { roughness: 0.06, flatShading: true });
    ice.colorNode = Fn(() => {
      const side = mix(vec3(0.03, 0.2, 0.52), vec3(0.16, 0.45, 0.78), smoothstep(0.0, 1.2, positionLocal.y));
      return mix(side, vec3(0.62, 0.84, 0.97), smoothstep(0.5, 0.9, normalWorld.y).mul(0.85));
    })();
    const snow = std(0xf4f8ff, 0.85, 0, { flatShading: true });
    [[0.9, 0.05, 0.2, 0.34], [0.55, 0.06, -0.85, 0.3], [-0.95, 0.05, 0.1, 0.32], [-0.35, 0.05, 0.9, 0.26], [0.15, 0.04, -0.98, 0.2]].forEach(([x, y, z, r], k) => {
      const m = add(new THREE.DodecahedronGeometry(r, 0), snow, y, 1.3, 0.32, 1); m.position.x = x; m.position.z = z; m.rotation.y = k * 1.7;
    });
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
  } else if (kind === 'ram') {
    // v110: the sewer's ram — a squat iron head with a rusted face and a ring of rivets, on a thick rod that runs back
    // into its wall (local +z is into the floor; the rod goes out of the back, -z). Low, so the near wall's never hides
    // the floor behind it from the camera
    const iron = std(0x3c3a38, 0.5, 0.7), face = std(0x7a4426, 0.7, 0.35), rivet = std(0x9a8f80, 0.35, 0.8), rod = std(0x8c8a86, 0.25, 0.9);
    add(new THREE.CylinderGeometry(1, 1, 0.8, 28).translate(0, 0.42, 0), iron);
    add(new THREE.CylinderGeometry(0.9, 0.96, 0.1, 28).translate(0, 0.86, 0), face);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, m = add(new THREE.SphereGeometry(0.07, 8, 6), rivet); m.position.set(Math.cos(a) * 0.78, 0.92, Math.sin(a) * 0.78); }
    add(new THREE.CylinderGeometry(0.32, 0.32, 6, 16).rotateX(Math.PI / 2).translate(0, 0.45, -3.9), rod);
  } else if (kind === 'ball') {
    // v111: a beach ball — six panels, red, white, blue, white, yellow, white, between two white caps, glossy vinyl
    // in the summer light. Centred on its own middle (the view stands it on the floor and rolls it)
    const vinyl = (c) => new THREE.MeshPhysicalNodeMaterial({ color: c, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    const M = [vinyl(0xe63b2e), vinyl(0xf4f1ea), vinyl(0x2f6fd8), vinyl(0xf4f1ea), vinyl(0xf5c518), vinyl(0xf4f1ea)], cap = 0.3;
    M.forEach((m, k) => add(new THREE.SphereGeometry(1, 10, 18, (k * Math.PI) / 3, Math.PI / 3, cap, Math.PI - 2 * cap), m));
    add(new THREE.SphereGeometry(1, 36, 4, 0, Math.PI * 2, 0, cap), M[1]);
    add(new THREE.SphereGeometry(1, 36, 4, 0, Math.PI * 2, Math.PI - cap, cap), M[1]);
  } else if (kind === 'crystal') {
    // lit from inside, as the core's own lamps are: a surface that is its own light, not a halo round it (v104)
    const glass = phys(0xd2a6ff, { roughness: 0.06, sheen: 0.6, sheenColor: new THREE.Color(0xff8cf0), emissive: 0x7a3bd6, emissiveIntensity: 0.55 }), base = std(0x2a2240, 0.6, 0.4);
    add(new THREE.CylinderGeometry(0.9, 1, 0.25, 6).translate(0, 0.12, 0), base);
    add(new THREE.OctahedronGeometry(0.75, 0).translate(0, 0.75, 0), glass, 0, 1, 2.2, 1);
  }
  return byMaterial(g);
}

// v110: a model folded to one mesh per material — its parts baked where they stand (a coral was sixteen draws, a
// ram fifteen; on a phone a draw is the cost, not a triangle)
function byMaterial(g) {
  g.updateMatrixWorld(true);
  const sets = new Map(), out = new THREE.Group();
  // an unindexed geometry is cloned, never converted (toNonIndexed() hands back the geometry itself, and baking a
  // part into it would move the shared original)
  const baked = (m) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
  const put = (mat, geo) => { if (!sets.has(mat)) sets.set(mat, []); sets.get(mat).push(geo); };
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (!Array.isArray(o.material)) { put(o.material, baked(o)); return; }
    // v113: a part drawn with several materials (the pillar's shaft: its side, its break, its foot) is cut along
    // its groups and each piece goes in with its material, so it costs no draw of its own
    const b = baked(o);
    for (const gr of b.groups) {
      const piece = new THREE.BufferGeometry();
      for (const name of ['position', 'normal', 'uv']) {
        const A = b.attributes[name];
        if (A) piece.setAttribute(name, new THREE.BufferAttribute(A.array.slice(gr.start * A.itemSize, (gr.start + gr.count) * A.itemSize), A.itemSize));
      }
      put(o.material[gr.materialIndex], piece);
    }
    b.dispose();
  });
  for (const [mat, parts] of sets) {
    const geo = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      if (!parts.every((q) => q.attributes[name])) continue;
      const n = parts.reduce((a, q) => a + q.attributes[name].array.length, 0), arr = new Float32Array(n);
      let at = 0;
      for (const q of parts) { arr.set(q.attributes[name].array, at); at += q.attributes[name].array.length; }
      geo.setAttribute(name, new THREE.BufferAttribute(arr, parts[0].attributes[name].itemSize));
    }
    parts.forEach((q) => q.dispose());
    out.add(new THREE.Mesh(geo, mat));
  }
  out.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return out;
}

// v110: yellow and black stripes, for a ram's lane on the floor and its housing's lip (a sign, not a light)
let _stripes = null;
function stripes() {
  if (_stripes || typeof document === 'undefined') return _stripes;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = '#16130f'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#f2c230';
  for (let k = -64; k < 128; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 16, 0); g.lineTo(k + 16 - 64, 64); g.lineTo(k - 64, 64); g.closePath(); g.fill(); }
  _stripes = new THREE.CanvasTexture(c); _stripes.wrapS = _stripes.wrapT = THREE.RepeatWrapping; _stripes.colorSpace = THREE.SRGBColorSpace;
  return _stripes;
}

const _ax = new THREE.Vector3(), _q = new THREE.Quaternion();

// which way is into the floor for a ram (its model's +z), as a turn about y
const ramYaw = (m) => (m.zWalls ? (m.side < 0 ? 0 : Math.PI) : (m.side < 0 ? Math.PI / 2 : -Math.PI / 2));

export class PostView {
  constructor(scene) { this.scene = scene; this.views = []; this.extras = []; this.lanes = []; this.key = ''; this.cache = new Map(); }
  _model(kind) {
    // one model a kind, cloned: the geometry and materials are shared
    if (!this.cache.has(kind)) this.cache.set(kind, build(kind));
    return this.cache.get(kind).clone();
  }
  reset() {
    for (const v of this.views) this.scene.remove(v);
    // a ram's housing and lane are made for it (the models are clones sharing a kind's), so they are let go
    for (const v of this.extras) { this.scene.remove(v); v.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map && o.material.map !== _stripes) o.material.map.dispose(); o.material.dispose(); } }); }
    this.views = []; this.extras = []; this.lanes = []; this.key = '';
  }
  // a ram's housing in its wall (a low iron box, a dark mouth on its floor side, a striped lip) and its lane on the floor
  _ramFixtures(w, p) {
    const m = p.ram, R = T.posts.worlds[w.world]?.rams, tex = stripes();
    if (!R) return;
    const yaw = ramYaw(m), wallX = m.zWalls ? m.along : m.side * m.half, wallZ = m.zWalls ? m.side * m.half : m.along;
    const iron = std(0x2b2a29, 0.55, 0.6), dark = new THREE.MeshBasicNodeMaterial({ color: 0x050505 });
    const house = new THREE.Group(); house.rotation.y = yaw; house.position.set(wallX, 0, wallZ);
    const W = p.r * 2.7, D = 3.4, H = 1.05;
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), iron); box.position.set(0, H / 2, -D / 2 - 0.05); house.add(box);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(p.r * 2.2, H * 0.8), dark); mouth.position.set(0, H * 0.45, -0.04); house.add(mouth);
    if (tex) {
      const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.12, 0.3), new THREE.MeshStandardNodeMaterial({ map: tex, roughness: 0.6 }));
      lip.position.set(0, H + 0.02, -0.2); house.add(lip);
      // the lane: from the wall to the ram's reach, as wide as the ram
      const lm = new THREE.MeshBasicNodeMaterial({ map: tex.clone(), transparent: true, opacity: 0.22, depthWrite: false });
      lm.map.repeat.set(2 * p.r / 1.2, R.reach / 1.2); lm.map.needsUpdate = true;
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(2 * p.r, R.reach).rotateX(-Math.PI / 2), lm);
      lane.position.set(0, 0.012, R.reach / 2); lane.renderOrder = 2; house.add(lane);
      this.lanes.push({ p, mat: lm });
    }
    this.scene.add(house); this.extras.push(house);
  }
  sync(w, alpha, time) {
    const P = w?.posts ?? [], key = `${w?.world}|` + P.map((p) => `${p.kind}:${p.r.toFixed(2)}`).join('|');
    if (key !== this.key) {
      this.reset();
      this.key = key;
      for (const p of P) {
        const v = this._model(p.kind); v.scale.setScalar(p.r);
        v.rotation.y = p.ram ? ramYaw(p.ram) : (p.x * 1.7 + p.z * 0.9) % (Math.PI * 2);
        v.userData.yaw = v.rotation.y;
        this.scene.add(v); this.views.push(v);
        if (p.ram) this._ramFixtures(w, p);
      }
    }
    P.forEach((p, i) => {
      const v = this.views[i];
      if (!v) return;
      v.position.set(p.px + (p.x - p.px) * alpha, 0, p.pz + (p.z - p.pz) * alpha);
      if (p.kind === 'crystal') v.rotation.y = time * 0.4 + i * 1.3;
      else if (p.drift) v.rotation.y = v.userData.yaw + v.position.x * 0.12 - v.position.z * 0.09;   // a drifting block turns as it goes
      else if (p.ball) {
        // v111: on its bottom, rolling: turned about the level axis across its way by the way it went over its radius
        v.position.y = p.r;
        const U = v.userData, dx = v.position.x - (U.lx ?? v.position.x), dz = v.position.z - (U.lz ?? v.position.z), d = Math.hypot(dx, dz);
        if (U.lx === undefined) v.quaternion.setFromAxisAngle(_ax.set(1, 0, 0.3).normalize(), 1.1);
        else if (d > 1e-6 && d < 3) v.quaternion.premultiply(_q.setFromAxisAngle(_ax.set(dz / d, 0, -dx / d), d / p.r));
        U.lx = v.position.x; U.lz = v.position.z;
      }
    });
    // a ram's lane on the floor: faint, brighter and beating while it warns, held while it is out
    for (const L of this.lanes) {
      const st = L.p.ram.stage;
      L.mat.opacity = st === 'warn' ? 0.5 + 0.3 * Math.sin(time * 18) : st === 'punch' || st === 'hold' ? 0.45 : 0.18;
    }
  }
}
