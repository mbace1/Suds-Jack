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
//   shrub    the driveway's islands' (v137): a clipped round shrub of a few balls of leaf
// v137 (owner, 2026-11-10: "Mix of A and B, so always rounded. But we need the pits somewhere as well"): a post may
// stand on a FOOT (a round base of its floor's own material, raised), an ISLAND is a slab of that material whose
// outline is the union of its circles smoothed into one curve, its props standing on it, and a PIT is a hole: a disc
// that follows each pixel's own view ray down into a cylinder and shows the wall or the bottom it meets
// Reads the world, never writes it. Every number is TUNING.posts (sim) and the look's own below.
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, smoothstep, mix, positionWorld, positionLocal, normalWorld, cameraPosition, normalize, dot, sqrt, max, select, fract, abs, atan, uniform, floor as tfloor, attribute, sin, cos, clamp, step } from 'three/tsl';
import { TUNING } from '../tuning.js?v=142';
import { noise, merge, hash } from './kit.js?v=142';
import { GEL_TIME } from './gel.js?v=142';

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
  } else if (kind === 'shrub') {
    // v137: clipped round, in two greens, darker where the balls of leaf meet (each its own lump)
    const leaf = std(0x2f6a22, 0.9), leaf2 = std(0x4f8f30, 0.85);
    leaf.colorNode = Fn(() => vec3(0.08, 0.24, 0.05).mul(noise(positionWorld.xz.add(positionWorld.y).mul(7)).mul(0.5).add(0.75)))();
    leaf2.colorNode = Fn(() => vec3(0.14, 0.36, 0.07).mul(noise(positionWorld.xz.sub(positionWorld.y).mul(7)).mul(0.5).add(0.75)))();
    [[0, 0.6, 0, 0.62, leaf], [0.4, 0.44, 0.18, 0.46, leaf2], [-0.38, 0.46, 0.12, 0.48, leaf2], [0.06, 0.42, -0.42, 0.44, leaf], [-0.08, 0.98, 0.06, 0.4, leaf2]].forEach(([x, y, z, r, m]) => {
      const b = add(new THREE.IcosahedronGeometry(r, 2), m, y, 1, 0.86, 1); b.position.x = x; b.position.z = z;
    });
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

// ── v137: feet, islands and pits ─────────────────────────────────────
// each world's floor, raised (linear rgb): the slab's top, its side, the lit lip of its bevel, its grit (per metre),
// how rough and how metal; `pit` the walls, the bottom and the rim of a hole cut in it (sim/posts.js: TUNING.posts)
const SLAB = {
  // the driveway: its curb's own concrete (scenery.driveway.curb) round a lawn of its own grass
  // (v138: the curb's own worn STONES — a seam every `stones` m along the island, moss in the seams and at their foot)
  2: () => { const D = T.scenery.driveway; return { top: D.curb.map((v) => v * 0.95), side: D.curb.map((v) => v * 0.76), lip: D.curb.map((v) => v * 1.08), grit: 9, rough: 0.9, metal: 0, lawn: { lo: D.grassLo, hi: D.grassHi },
    stones: 1.25, mossCol: D.stone?.moss ?? [0.05, 0.085, 0.03] }; },
  // the sewer: a collar of its walls' brick (scenery.sewer), a concrete cap
  // (v139: an iron hoop bolted round it, and the flagstones dark and wet where it stands)
  3: () => { const W = T.scenery.sewer; return { top: W.brickColor.map((v) => v * 0.62), side: W.brickColor.map((v) => v * 0.5), lip: W.brickColor.map((v) => v * 0.8), grit: 8, rough: 0.85, metal: 0, brick: { size: W.brick, mortar: W.mortar },
    hoop: { iron: 0x3c3a38, bolts: 8 }, band: { kind: 'damp', inn: 0.1, out: 0.8, color: [0.004, 0.006, 0.008], k: 0.6 } }; },
  // the cistern: its own stone, dressed on top and coursed down the side; a well's walls coursed, its water dark
  // (v139: the floor dark and wet round every plinth and well)
  4: () => ({ top: [0.105, 0.2, 0.225], side: [0.05, 0.09, 0.1], lip: [0.2, 0.32, 0.34], grit: 5, rough: 0.85, metal: 0, joints: 1.4, courses: 0.42,
              band: { kind: 'damp', inn: 0.1, out: 0.7, color: [0.004, 0.012, 0.014], k: 0.5 },
              pit: { wall: T.scenery.cistern.stone.map((v) => v * 1.6), deep: [0.004, 0.03, 0.036], rim: [0.16, 0.26, 0.28], ring: 0.38 } }),
  // the boiler: its deck plate, seams on top and a hazard band round the side
  // (v139: riveted round its edge, a pipe run between its two drums, soot on the floor round it)
  5: () => ({ top: [0.2, 0.19, 0.18], side: [0.085, 0.08, 0.075], lip: [0.5, 0.36, 0.2], grit: 1.6, rough: 0.42, metal: 0.65, stripes: true,
              rivets: { every: 0.5, r: 0.075, inset: 0.24, color: 0x9a8f80 }, pipe: { r: 0.15, at: 0.52, brass: 0xe2bb52, iron: 0x3f342c },
              band: { kind: 'damp', inn: 0.1, out: 0.7, color: [0.006, 0.005, 0.004], k: 0.55 } }),
  // the river: wet rock, paler where it is dry on top
  // (v139: a MOUND, not a slab — `rise` × the island's height at its top, flat by `shoulder` m in, `steep` at its foot,
  // `lump`y; moss on what faces up, wet and dark at the waterline, and the stream's foam breaking round it)
  6: () => ({ top: [0.36, 0.34, 0.28], side: [0.15, 0.155, 0.13], lip: [0.5, 0.48, 0.41], grit: 9, rough: 0.8, metal: 0,
              mound: { step: 0.24, shoulder: 1.1, steep: 2.4, lump: 0.16, rise: 1.5, moss: { color: [0.1, 0.19, 0.045], at: 0.5, scale: 0.9, from: 0.28, k: 0.8 }, wet: { to: 0.3, dark: 0.5, rough: 0.22 } },
              band: { kind: 'foam', inn: 0.12, out: 0.8, color: T.worlds.floor.river.foam, k: 0.9 } }),
  // the ice: old floe ice, snow on its top; a hole's walls are the sheet's own blue, going dark to the water
  // (v139: rime round each hole, and the cracks that run out from it)
  7: () => ({ top: [0.74, 0.84, 0.95], side: [0.2, 0.42, 0.68], lip: [0.86, 0.93, 1.0], grit: 3, rough: 0.35, metal: 0,
              // (v139, owner 2026-11-10: "The holes in ice could be less circular and more like cracked holes with sharp
              // edges") `shatter`: the hole is BROKEN through — `corners` of them, each at its own share `hole` of the
              // pit's radius (`bite`: the share of them bitten deep), straight between; round it a `collar` of broken floes out to the circle a body
              // stops at, `gap` m of dark water between them, each tipped up to `lift` m (`awash`: the share lying
              // low and wet), some `split` in two; the sheet is `thick` m, then water with `brash` afloat (bits/m, the
              // share of cells that hold one); `cracks` run on from the collar's corners (× the radius long, `w` m
              // wide where they start, forking `fork` of the time), rime `rime` × as wide either side of each
              pit: { wall: [0.2, 0.46, 0.74], deep: [0.008, 0.045, 0.085], rim: [0.86, 0.93, 1.0], ring: 0, ice: true,
                     shatter: { corners: [8, 11], hole: [0.56, 0.9], bite: 0.3, collar: [0.98, 1.1], gap: 0.05, lift: [0.03, 0.14], awash: 0.3, split: 0.35,
                                thick: 0.75, brash: [1.6, 0.42], floe: [0.78, 0.87, 0.97], wet: [0.42, 0.62, 0.86], under: [0.02, 0.07, 0.13],
                                cracks: { len: [0.35, 1.15], w: 0.055, fork: 0.5, rime: 2.8, dark: [0.1, 0.24, 0.42], white: [0.93, 0.97, 1.0] } },
                     band: { kind: 'frost', inn: 0, out: 1.0, color: [0.92, 0.97, 1.0], cracks: 0, crackW: 0.03, k: 0.5 } } }),
  // the deep: dark reef rock with silt settled on its top
  // (v139: a reef MOUND, a crust of coralline on what faces up, silt banked against it, anemones on it)
  8: () => ({ top: [0.4, 0.37, 0.3], side: [0.1, 0.11, 0.13], lip: [0.5, 0.47, 0.4], grit: 6, rough: 0.9, metal: 0,
              mound: { step: 0.24, shoulder: 1.0, steep: 2.2, lump: 0.2, rise: 1.7, moss: { color: [0.42, 0.14, 0.3], at: 0.52, scale: 1.4, from: 0.12, k: 0.6 } },
              band: { kind: 'silt', inn: 0.15, out: 1.3, color: [0.16, 0.16, 0.17], k: 0.6 },
              dots: { n: 9, r: [0.09, 0.17], colors: [0xff8fa6, 0x7fffc8], glow: 0.5, seed: 8 } }),
  // the core: a plinth of its dark alloy, a violet lip
  // (v139: a line of the core's own light round its top edge)
  9: () => ({ top: [0.05, 0.035, 0.08], side: [0.025, 0.02, 0.04], lip: [0.2, 0.09, 0.24], grit: 2, rough: 0.35, metal: 0.7, ring: T.worlds.floor.core.line }),
};
// (the ice's broken hole, for the tests: its numbers, and the dice a pit throws — from where it is)
export const ICE_SHATTER = () => SLAB[7]().pit.shatter, pitSeed = (p) => Math.round(p.x * 31 + p.z * 17) + 7;
// v138: on NEON's floors (the title's other look for worlds 2 and 3) a blocker is a slab of dark glass with its edge lit
// in the floor's own line colour — a lawn in a kerb of stone has no place on a grid of light
const NEON_SLAB = { 2: 0xff5fd0, 3: 0x5fffe8 };
const neonSlab = (world) => { const c = new THREE.Color(NEON_SLAB[world] ?? 0x5f8cff); return { top: [0.02, 0.008, 0.035], side: [0.008, 0.004, 0.018], lip: [c.r, c.g, c.b], grit: 2, rough: 0.3, metal: 0.5, neon: [c.r, c.g, c.b] }; };
// (`local`: a foot that moves — the ice's pans drift, the core's plinths go round — wears its grain with it)
function slabMat(M, local = false) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: M.rough, metalness: M.metal });
  m.colorNode = Fn(() => {
    const p = local ? positionLocal : positionWorld, up = normalWorld.y;
    const grit = noise(p.xz.mul(M.grit)).mul(0.22).add(0.86).mul(noise(p.xz.mul(M.grit * 0.23).add(3.1)).mul(0.16).add(0.92));
    let col = mix(vec3(...M.side), vec3(...M.top), smoothstep(0.86, 0.97, up)).mul(grit);
    col = mix(col, vec3(...M.lip), smoothstep(0.25, 0.55, up).mul(float(1).sub(smoothstep(0.8, 0.95, up))));   // the bevel catches the light
    if (M.joints) {
      // dressed slabs on top (a joint every `joints` m), coursed blocks down the side
      const jt = smoothstep(0.46, 0.5, abs(fract(p.x.div(M.joints)).sub(0.5))).max(smoothstep(0.46, 0.5, abs(fract(p.z.div(M.joints * 1.3)).sub(0.5))));
      col = col.mul(float(1).sub(jt.mul(0.55).mul(smoothstep(0.9, 0.97, up))));
      const cs = smoothstep(0.44, 0.5, abs(fract(p.y.div(M.courses)).sub(0.5)));
      col = col.mul(float(1).sub(cs.mul(0.5).mul(float(1).sub(smoothstep(0.2, 0.5, up)))));
    }
    if (M.brick) {
      // a collar of brick (a foot is drawn about its own middle): coursed down the side, every other course half a
      // brick along; laid on edge round the top, a joint every brick and one ring between the two rows
      const B = M.brick, a = atan(p.z, p.x), rr = p.xz.length(), row = p.y.div(B.size[1]);
      const along = a.mul(1.6).div(B.size[0]).add(select(fract(row.mul(0.5)).lessThan(0.5), float(0), float(0.5)));
      const side = smoothstep(0.42, 0.5, abs(fract(along).sub(0.5))).max(smoothstep(0.36, 0.5, abs(fract(row).sub(0.5))));
      const ring = fract(rr.div(0.4)), half = select(ring.lessThan(0.5), float(0), float(0.5));
      const top = smoothstep(0.4, 0.5, abs(fract(a.mul(rr).div(0.24).add(half)).sub(0.5))).max(smoothstep(0.42, 0.5, abs(ring.sub(0.5))));
      col = mix(col, vec3(...B.mortar), mix(side, top, smoothstep(0.5, 0.9, up)));
    }
    if (M.stones) {
      const along = M.axisZ ? p.z : p.x, seam = smoothstep(0.4, 0.5, abs(fract(along.div(M.stones)).sub(0.5)));
      const foot = float(1).sub(smoothstep(0.0, 0.2, p.y)).mul(smoothstep(0.38, 0.62, noise(p.xz.mul(1.3).add(p.y))));
      col = mix(col.mul(float(1).sub(seam.mul(0.45))).mul(noise(vec2(tfloor(along.div(M.stones)).mul(7.3), 1.1)).mul(0.24).add(0.88)), vec3(...M.mossCol), max(seam.mul(0.5), foot.mul(0.75)));
    }
    if (M.stripes) {
      // deck plates: seams every 1.2 m on the top; a hazard band round the side
      const seam = smoothstep(0.47, 0.5, abs(fract(p.x.div(1.2)).sub(0.5))).max(smoothstep(0.47, 0.5, abs(fract(p.z.div(1.2)).sub(0.5))));
      col = col.mul(float(1).sub(seam.mul(0.5).mul(smoothstep(0.9, 0.97, up))));
      const band = smoothstep(0.05, 0.1, p.y).mul(float(1).sub(smoothstep(0.3, 0.35, p.y))).mul(float(1).sub(smoothstep(0.3, 0.6, up)));
      const stripe = smoothstep(0.45, 0.55, fract(p.x.add(p.z).add(p.y).mul(1.4)));
      col = mix(col, mix(vec3(0.02, 0.018, 0.015), vec3(0.85, 0.6, 0.06), stripe), band);
    }
    // where it stands in the floor, darker (no light gets under the bevel)
    return col.mul(mix(float(0.55), float(1), smoothstep(0, 0.18, p.y)));
  })();
  // v138: NEON's slab — its bevel is a line of light (its own light, as the floor's lines are: no halo)
  if (M.neon) m.emissiveNode = Fn(() => vec3(...M.neon).mul(smoothstep(0.25, 0.55, normalWorld.y).mul(float(1).sub(smoothstep(0.8, 0.95, normalWorld.y))).mul(1.3)))();
  return m;
}
// a lawn on top of an island, in the set's own grass, mown in stripes
function lawnMat(L) {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  m.colorNode = Fn(() => {
    const p = positionWorld, blade = noise(p.xz.mul(14)).mul(0.5).add(noise(p.xz.mul(3.1)).mul(0.5));
    const stripe = smoothstep(0.35, 0.65, fract(p.x.add(p.z.mul(0.3)).div(1.6))).mul(0.18).add(0.91);
    return mix(vec3(...L.lo), vec3(...L.hi), blade).mul(stripe);
  })();
  return m;
}
// the outline of a union of circles: every circle's rim point that no other circle covers, in order round the
// middle (an island is compact enough to be star-shaped about its middle), thinned and drawn as one smooth closed
// curve, so no scallop shows where two circles meet. A Shape in (x, -z), to stand up once turned
function islandShape(cs, inset = 0) {
  const cx = cs.reduce((a, c) => a + c.x, 0) / cs.length, cz = cs.reduce((a, c) => a + c.z, 0) / cs.length, pts = [], n = 48;
  for (const c of cs) for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, r = c.r - inset, x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
    if (cs.some((o) => o !== c && Math.hypot(x - o.x, z - o.z) < o.r - inset - 1e-3)) continue;
    pts.push([x, z, Math.atan2(z - cz, x - cx)]);
  }
  pts.sort((a, b) => a[2] - b[2]);
  const step = Math.max(1, Math.floor(pts.length / 26));
  const curve = new THREE.CatmullRomCurve3(pts.filter((_, i) => i % step === 0).map(([x, z]) => new THREE.Vector3(x, -z, 0)), true, 'centripetal');
  return new THREE.Shape(curve.getPoints(140).map((v) => new THREE.Vector2(v.x, v.y)));
}
const circleShape = (x, z, r) => { const s = new THREE.Shape(); s.absarc(x, -z, r, 0, Math.PI * 2, false); return s; };
// a slab `h` high on a Shape, its edges rounded over (a bevel), standing on y = 0
const slabGeo = (shape, h, round = 0.14) => new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: true, bevelThickness: Math.min(round, h * 0.4), bevelSize: round, bevelSegments: 4, curveSegments: 36 }).rotateX(-Math.PI / 2);
// a hole in the floor: every pixel of a disc follows its own view ray down into a cylinder `depth` deep and shows
// what it meets — the far wall (lit at the top, darkening down, coursed for stone or clear blue for ice) or the bottom
// (where the hole is, how wide and how deep are uniforms: a world's pits share one program)
function pitMat(P, x0, z0, r0, depth0) {
  const m = new THREE.MeshBasicNodeMaterial(), at = uniform(new THREE.Vector4(x0, z0, r0, depth0));
  m.colorNode = Fn(() => {
    const W = positionWorld, V = normalize(W.sub(cameraPosition)), r = at.z, depth = at.w;
    const d = vec2(W.x.sub(at.x), W.z.sub(at.y)), v = vec2(V.x, V.z);
    const a = max(dot(v, v), 1e-6), b = dot(d, v), c = dot(d, d).sub(r.mul(r));
    const t = b.negate().add(sqrt(max(b.mul(b).sub(a.mul(c)), 0))).div(a);
    const deep = V.y.mul(t).negate(), hit = d.add(v.mul(t)), ang = atan(hit.y, hit.x);
    const lit = float(1).sub(smoothstep(0, depth, deep));
    let wall;
    if (P.ice) {
      // clear blue ice: light comes down through it, so the wall is brightest just under the rim and its old layers
      // show as faint bands
      const band = noise(vec2(deep.mul(5), ang.mul(2))).mul(0.25).add(0.85);
      wall = vec3(...P.wall).mul(lit.mul(lit).mul(1.3).add(0.05)).mul(band);
    } else {
      const course = smoothstep(0.42, 0.5, abs(fract(deep.mul(2.4)).sub(0.5))).max(smoothstep(0.46, 0.5, abs(fract(ang.mul(r.mul(1.3))).sub(0.5))).mul(0.6));
      wall = vec3(...P.wall).mul(lit.mul(lit).mul(1.1).add(0.08)).mul(float(1).sub(course.mul(0.45)));
    }
    // the bottom: dark water, a faint moving sheen where the sky would show in it
    const sheen = noise(W.xz.mul(2.2)).mul(0.5).add(0.6);
    return select(deep.lessThan(depth), wall, vec3(...P.deep).mul(sheen));
  })();
  return m;
}

// ── v139: the blockers, better looking (owner, 2026-11-10: "Can you make the visuals even better?") ──
// A rock is a ROCK: an island of the river's or the deep's is a mound heaped up inside its outline — steep at its
// foot, rounded over, lumpy on top — not a slab cut out with a cutter. And everything meets its floor: foam where the
// stream breaks on a rock, silt banked against a reef, the damp round a well, frost and cracks round a hole in the ice.
//
// the smooth union's signed distance at (x, z), under 0 inside: a smooth minimum of the circles' own (no crease where
// two meet; it bulges past the hard union by `k`/4 at most, in the notch a body cannot reach into anyway)
const isleSdf = (cs, k = 0.6) => (x, z) => {
  let d = null;
  for (const c of cs) {
    const di = Math.hypot(x - c.x, z - c.z) - c.r;
    if (d === null) { d = di; continue; }
    const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (di - d)) / k));
    d = di + (d - di) * h - k * h * (1 - h);
  }
  return d;
};
// its outline: `n` points round its middle, each [x, z, nx, nz] — where a ray from the middle leaves it, and the way
// out there (an island is compact enough to be star-shaped about its middle)
function isleOutline(cs, n = 120) {
  const sd = isleSdf(cs), cx = cs.reduce((a, c) => a + c.x, 0) / cs.length, cz = cs.reduce((a, c) => a + c.z, 0) / cs.length, out = [];
  const R = Math.max(...cs.map((c) => Math.hypot(c.x - cx, c.z - cz) + c.r)) + 1;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a);
    let lo = 0, hi = R;
    for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (sd(cx + ux * m, cz + uz * m) < 0) lo = m; else hi = m; }
    const x = cx + ux * lo, z = cz + uz * lo, e = 0.02, gx = sd(x + e, z) - sd(x - e, z), gz = sd(x, z + e) - sd(x, z - e), g = Math.hypot(gx, gz) || 1;
    out.push([x, z, gx / g, gz / g]);
  }
  return out;
}
const circleOutline = (x, z, r, n = 72) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [x + Math.cos(a) * r, z + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; });
// a flat band round an outline, from `inn` m inside it to `out` m outside, lying at `y`: its `band` attribute is
// (0 at its inner rim … 1 at its outer, the way round in m) — for what gathers where a thing meets its floor
function bandGeo(pts, inn, out, y = 0.014) {
  const pos = [], band = [], nor = [], idx = [], n = pts.length;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const [x, z, nx, nz] = pts[i % n], q = pts[(i + n - 1) % n];
    if (i) s += Math.hypot(x - q[0], z - q[1]);
    pos.push(x - nx * inn, y, z - nz * inn, x + nx * out, y, z + nz * out);
    band.push(0, s, 1, s); nor.push(0, 1, 0, 0, 1, 0);
  }
  for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('band', new THREE.Float32BufferAttribute(band, 2));
  g.setIndex(idx);
  return g;
}
// what lies in a band: 'foam' (the stream breaking on a rock: thick against it, torn to lace further out, lapping
// in and out), 'silt' (banked against a reef, thinning out), 'damp' (the floor dark and wet round a thing), 'frost'
// (rime round a hole in the ice, and the cracks that run out from it)
function bandMat(B) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const b = attribute('band', 'vec2'), e = b.x, s = b.y, fade = float(1).sub(e);
  if (B.kind === 'foam') {
    const lap = sin(GEL_TIME.mul(1.4).add(s.mul(0.9))).mul(0.1);
    const body = float(1).sub(smoothstep(0.1, float(0.5).add(lap), e));
    const lace = smoothstep(0.52, 0.8, noise(vec2(s.mul(2.6), e.mul(4).sub(GEL_TIME.mul(0.45))))).mul(fade);
    m.colorNode = vec3(...B.color); m.opacityNode = max(body.mul(0.8), lace.mul(0.7)).mul(B.k ?? 1);
  } else if (B.kind === 'frost') {
    // rime close in; and cracks: thin lines running out from the hole, each as far as its own luck
    // (`cracks` 0: the cracks are drawn as cracks — shatter(), below — and this is the rime alone)
    let crack = float(0);
    if (B.cracks) {
      const id = tfloor(s.mul(B.cracks)), at = abs(fract(s.mul(B.cracks)).sub(0.5)), reach = noise(vec2(id.mul(7.31), 2.1)).mul(0.8).add(0.15);
      crack = float(1).sub(smoothstep(0.0, B.crackW * B.cracks, at)).mul(float(1).sub(smoothstep(reach.sub(0.08), reach, e)));
    }
    m.colorNode = vec3(...B.color); m.opacityNode = max(fade.mul(fade).mul(fade).mul(0.55), crack.mul(0.75)).mul(B.k ?? 1);
  } else {
    // silt and damp: thick against the thing, thinning out, uneven the way round
    const uneven = noise(vec2(s.mul(B.kind === 'silt' ? 1.1 : 0.7), e.mul(2.2))).mul(0.5).add(0.6);
    m.colorNode = vec3(...B.color); m.opacityNode = fade.mul(fade).mul(uneven).mul(B.k ?? 0.5);
  }
  return m;
}
// a mound heaped inside an island's outline, `H` m at its top: a grid over it whose points past the outline are
// drawn in onto it (so its foot is the outline exactly), each point as high as it is far inside — steep at the
// foot (`steep`), flat by `shoulder` m in — times a lumpiness of its own. Returns the mesh's geometry and the
// height at a point (what stands on it stands at that height)
function moundGeo(cs, H, R) {
  const sd = isleSdf(cs), st = R.step, x0 = Math.min(...cs.map((c) => c.x - c.r)) - st, x1 = Math.max(...cs.map((c) => c.x + c.r)) + st;
  const z0 = Math.min(...cs.map((c) => c.z - c.r)) - st, z1 = Math.max(...cs.map((c) => c.z + c.r)) + st, nx = Math.ceil((x1 - x0) / st), nz = Math.ceil((z1 - z0) / st);
  const ph = cs[0].x * 1.7 + cs[0].z, lump = (x, z) => 1 + R.lump * (Math.sin(x * 1.3 + ph) * Math.cos(z * 1.1 - ph * 0.7) * 0.6 + Math.sin(x * 2.9 - z * 2.3 + ph * 2) * 0.4);
  const height = (x, z) => { const d = sd(x, z); if (d >= 0) return 0; const u = Math.min(1, -d / R.shoulder); return H * (1 - Math.pow(1 - u, R.steep)) * lump(x, z); };
  const N = (nx + 1) * (nz + 1), pos = new Float32Array(N * 3), inside = new Uint8Array(N), idx = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    let x = x0 + i * st, z = z0 + j * st, d = sd(x, z);
    const k = j * (nx + 1) + i;
    inside[k] = d < 0 ? 1 : 0;
    for (let it = 0; d > 0 && it < 3; it++) { const e = 0.01, gx = (sd(x + e, z) - sd(x - e, z)) / (2 * e), gz = (sd(x, z + e) - sd(x, z - e)) / (2 * e), g2 = gx * gx + gz * gz || 1; x -= (d * gx) / g2; z -= (d * gz) / g2; d = sd(x, z); }
    pos[k * 3] = x; pos[k * 3 + 1] = height(x, z); pos[k * 3 + 2] = z;
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    if (inside[a] || inside[b] || inside[c]) idx.push(a, c, b);
    if (inside[b] || inside[c] || inside[d]) idx.push(b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, height };
}
// a mound's rock: its top paler than its flanks, gritty, faint beds round its sides; `moss` (or the deep's crust of
// coralline) in patches on what faces up; `wet` and dark where it stands in the water
function moundMat(M) {
  const R = M.mound, m = new THREE.MeshStandardNodeMaterial({ roughness: M.rough, metalness: 0 });
  m.colorNode = Fn(() => {
    const p = positionWorld, up = normalWorld.y;
    const grit = noise(p.xz.mul(M.grit)).mul(0.26).add(0.84).mul(noise(p.xz.mul(M.grit * 0.21).add(3.1)).mul(0.2).add(0.9));
    let col = mix(vec3(...M.side), vec3(...M.top), smoothstep(0.45, 0.9, up)).mul(grit);
    col = col.mul(float(1).sub(smoothstep(0.34, 0.5, abs(fract(p.y.mul(5).add(noise(p.xz.mul(0.8)).mul(1.5))).sub(0.5))).mul(0.16).mul(float(1).sub(smoothstep(0.5, 0.85, up)))));
    if (R.moss) {
      const k = smoothstep(R.moss.at, R.moss.at + 0.18, noise(p.xz.mul(R.moss.scale).add(7.7))).mul(smoothstep(0.5, 0.85, up)).mul(smoothstep(R.moss.from, R.moss.from + 0.15, p.y));
      col = mix(col, vec3(...R.moss.color).mul(noise(p.xz.mul(11)).mul(0.5).add(0.75)), k.mul(R.moss.k));
    }
    if (R.wet) col = col.mul(mix(float(R.wet.dark), float(1), smoothstep(R.wet.to * 0.3, R.wet.to, p.y)));
    return col;
  })();
  if (R.wet) m.roughnessNode = mix(float(R.wet.rough), float(M.rough), smoothstep(R.wet.to * 0.3, R.wet.to, positionWorld.y));
  return m;
}
// ── v139: a hole in the ICE is BROKEN through, not bored (owner, 2026-11-10: "The holes in ice could be less circular
// and more like cracked holes with sharp edges") ──
// shatter(): the hole's own outline — corners at uneven angles, a point then a bite, straight between — inside the
// circle a body stops at; round it a collar of broken floes out to that circle; and cracks running on from the
// collar's corners, each a few straight runs that turn, thin out and sometimes fork. All from the pit's own dice.
export function shatter(p, K, rnd) {
  const n = K.corners[0] + Math.floor(rnd() * (K.corners[1] - K.corners[0] + 1));
  const steps = Array.from({ length: n }, () => 0.55 + rnd() * 0.9), sum = steps.reduce((a, b) => a + b, 0);
  let a = rnd() * Math.PI * 2;
  const hole = [], out = [];
  for (let i = 0; i < n; i++) {
    a += (steps[i] / sum) * Math.PI * 2;
    const rr = K.hole[0] + (K.hole[1] - K.hole[0]) * (rnd() < K.bite ? rnd() * 0.35 : 0.55 + rnd() * 0.45), ao = a + (rnd() - 0.5) * 0.22, ro = K.collar[0] + rnd() * (K.collar[1] - K.collar[0]);
    hole.push([p.x + Math.cos(a) * p.r * rr, p.z + Math.sin(a) * p.r * rr]);
    out.push([p.x + Math.cos(ao) * p.r * ro, p.z + Math.sin(ao) * p.r * ro, ao]);
  }
  // the floes: one to each side of the hole, some broken in two; each [corners [x, y, z]…, how wet]
  const floes = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, wet = rnd() < K.awash, hi = () => (wet ? 0.012 + rnd() * 0.015 : K.lift[0] + rnd() * (K.lift[1] - K.lift[0])), lo = () => 0.014 + rnd() * 0.03;
    const q = [[hole[i][0], hi(), hole[i][1]], [hole[j][0], hi(), hole[j][1]], [out[j][0], lo(), out[j][1]], [out[i][0], lo(), out[i][1]]];
    if (rnd() < K.split) {
      const d = rnd() < 0.5, dy = (rnd() - 0.5) * 0.04, w2 = rnd() < K.awash;
      floes.push({ pts: d ? [q[0], q[1], q[2]] : [q[0], q[1], q[3]], wet }, { pts: (d ? [q[0], q[2], q[3]] : [q[1], q[2], q[3]]).map(([x, y, z]) => [x, Math.max(0.012, y + dy), z]), wet: w2 });
    } else floes.push({ pts: q, wet });
  }
  // each drawn in from its neighbours by the gap of dark water between them
  for (const f of floes) {
    const cx = f.pts.reduce((s, v) => s + v[0], 0) / f.pts.length, cz = f.pts.reduce((s, v) => s + v[2], 0) / f.pts.length;
    f.pts = f.pts.map(([x, y, z]) => { const d = Math.hypot(x - cx, z - cz) || 1, k = Math.max(0.5, 1 - K.gap / d); return [cx + (x - cx) * k, y, cz + (z - cz) * k]; });
    f.tone = rnd();
  }
  // the cracks: [x0, z0, x1, z1, w0, w1] runs
  const C = K.cracks, runs = [];
  const crack = (x, z, dir, len, w0, depth) => {
    const m = 2 + (rnd() < 0.5 ? 1 : 0);
    let w = w0;
    for (let k = 0; k < m; k++) {
      const l = (len / m) * (0.7 + rnd() * 0.6), na = dir + (rnd() - 0.5) * 0.9, nx = x + Math.cos(na) * l, nz = z + Math.sin(na) * l, w1 = k === m - 1 ? 0 : w * 0.62;
      runs.push([x, z, nx, nz, w, w1]);
      if (!depth && k < m - 1 && rnd() < C.fork) crack(nx, nz, na + (rnd() < 0.5 ? 0.75 : -0.75), len * 0.45, w1, 1);
      x = nx; z = nz; dir = na; w = w1;
    }
  };
  for (const [x, z, ao] of out) if (rnd() < 0.8) crack(x, z, ao + (rnd() - 0.5) * 0.5, p.r * (C.len[0] + rnd() * (C.len[1] - C.len[0])), C.w * (0.6 + rnd() * 0.7), 0);
  return { hole, out, floes, runs };
}
// flat-faced triangles with a colour each: [[a, b, c, [r, g, b]]…], corners [x, y, z]; faces up (wound either way)
function facetGeo(tris) {
  const pos = [], nor = [], col = [];
  for (const [a, b, c, rgb, keep] of tris) {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const flip = !keep && ny < 0, l = Math.hypot(nx, ny, nz) || 1, s = flip ? -1 : 1;
    nx *= s / l; ny *= s / l; nz *= s / l;
    for (const v of flip ? [a, c, b] : [a, b, c]) { pos.push(v[0], v[1], v[2]); nor.push(nx, ny, nz); col.push(rgb[0], rgb[1], rgb[2]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}
// the broken floes: each a plate with a top (two facets where its corners do not lie flat) and sides down to the water
function floeGeo(floes, K, wall) {
  const tris = [], mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  for (const f of floes) {
    const top = mixc(f.wet ? K.wet : K.floe, f.wet ? K.floe : K.wet, f.tone * (f.wet ? 0.25 : 0.3)), P = f.pts, cx = P.reduce((s, v) => s + v[0], 0) / P.length, cz = P.reduce((s, v) => s + v[2], 0) / P.length;
    if (P.length === 3) tris.push([P[0], P[1], P[2], top]);
    else tris.push([P[0], P[1], P[2], top], [P[0], P[2], P[3], top.map((v) => v * 0.96)]);
    P.forEach((a, i) => {
      const b = P[(i + 1) % P.length], a0 = [a[0], 0.008, a[2]], b0 = [b[0], 0.008, b[2]];
      // (wound to face out from the plate's middle, whichever way the plate was listed)
      const ox = (a[0] + b[0]) / 2 - cx, oz = (a[2] + b[2]) / 2 - cz, nx = -(b[2] - a[2]), nz = b[0] - a[0], out = nx * ox + nz * oz > 0;
      const side = wall.map((v) => v * (0.7 + 0.5 * f.tone));
      if (out) tris.push([a, a0, b, side, 1], [b, a0, b0, side, 1]); else tris.push([a, b, a0, side, 1], [b, b0, a0, side, 1]);
    });
  }
  return facetGeo(tris);
}
// the cracks: each run a tapering strip of dark, lying in a wider strip of rime
function crackGeo(runs, C) {
  const tris = [];
  const strip = ([x0, z0, x1, z1, w0, w1], k, pad, y, rgb) => {
    const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, px = -dz / l, pz = dx / l, a = (w0 * k) / 2 + pad, b = (w1 * k) / 2 + (w1 ? pad : 0);
    const A = [x0 + px * a, y, z0 + pz * a], B = [x0 - px * a, y, z0 - pz * a], Cc = [x1 + px * b, y, z1 + pz * b], D = [x1 - px * b, y, z1 - pz * b];
    tris.push([A, B, Cc, rgb]); if (b > 0) tris.push([B, D, Cc, rgb]);
  };
  for (const r of runs) { strip(r, C.rime, 0.012, 0.015, C.white); strip(r, 1, 0, 0.018, C.dark); }
  return facetGeo(tris);
}
// the hole itself: every pixel of its jagged opening follows its own view ray down and shows what it meets — a wall
// of the sheet's ice (each straight side a facet of its own brightness, snow-white at its broken top edge, its old
// layers showing, going blue-dark to the waterline `thick` m down) or the water, with angular bits of brash afloat.
// The sides are baked into the program (a pit's outline is its own): the ray is tried against each in turn.
function pitShardMat(P, pts) {
  const m = new THREE.MeshBasicNodeMaterial(), K = P.shatter, n = pts.length;
  const cx = pts.reduce((s, v) => s + v[0], 0) / n, cz = pts.reduce((s, v) => s + v[1], 0) / n;
  m.colorNode = Fn(() => {
    const W = positionWorld, V = normalize(W.sub(cameraPosition)), o = vec2(W.x, W.z), v = vec2(V.x, V.z);
    const t = float(1e3).toVar(), face = float(1).toVar();
    pts.forEach(([ax, az], i) => {
      const [bx, bz] = pts[(i + 1) % n], ex = bx - ax, ez = bz - az, len = Math.hypot(ex, ez) || 1;
      let nx = -ez / len, nz = ex / len; if (nx * (cx - ax) + nz * (cz - az) < 0) { nx = -nx; nz = -nz; }   // the way the wall faces: into the hole
      const shade = 0.66 + 0.34 * (0.5 + 0.5 * (nx * -0.5 + nz * 0.86)) + ((i * 7) % 5) * 0.012;
      const den0 = v.x.mul(ez).sub(v.y.mul(ex)), den = select(abs(den0).lessThan(1e-6), float(1e-6), den0);
      const rx = float(ax).sub(o.x), rz = float(az).sub(o.y);
      const s = rx.mul(ez).sub(rz.mul(ex)).div(den), u = rx.mul(v.y).sub(rz.mul(v.x)).div(den);
      const ok = s.greaterThan(1e-3).and(u.greaterThan(-0.002)).and(u.lessThan(1.002)).and(s.lessThan(t)).toVar();
      face.assign(select(ok, float(shade), face)); t.assign(select(ok, s, t));
    });
    const deep = V.y.mul(t).negate(), down = max(V.y.negate(), 1e-3);
    // the wall
    const lit = float(1).sub(smoothstep(0, K.thick, deep)), layer = noise(vec2(deep.mul(11), face.mul(41.3))).mul(0.3).add(0.8);
    const edge = float(1).sub(smoothstep(0.03, 0.1, deep));
    const wall = mix(vec3(...P.wall).mul(lit.mul(lit).mul(1.25).add(0.12)).mul(layer).mul(face), vec3(...P.rim), edge.mul(0.85));
    // the water under it, where the ray comes to it
    const wp = o.add(v.mul(float(K.thick).div(down))), sheen = noise(wp.mul(2.2)).mul(0.5).add(0.6);
    const cell = wp.mul(K.brash[0]), id = tfloor(cell), h = hash(id), h2 = fract(h.mul(37.7)), ang = h.mul(6.283);
    const bob = vec2(sin(GEL_TIME.mul(0.7).add(h.mul(6))), cos(GEL_TIME.mul(0.55).add(h2.mul(6)))).mul(0.04);
    const q0 = fract(cell).sub(0.5).add(bob), q = vec2(q0.x.mul(cos(ang)).sub(q0.y.mul(sin(ang))), q0.x.mul(sin(ang)).add(q0.y.mul(cos(ang))));
    const bit = step(abs(q.x).add(abs(q.y).mul(1.9)), h2.mul(0.2).add(0.12)).mul(step(1 - K.brash[1], h));
    const water = mix(vec3(...P.deep).mul(sheen), vec3(...K.floe).mul(h2.mul(0.25).add(0.7)), bit);
    return select(deep.lessThan(K.thick), wall, water);
  })();
  return m;
}
export const seededDots = (seed) => { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
// small round things in one draw: [[x, y, z, r, squash]…] (rivets on a deck, anemones on a reef)
const dotsGeo = (pts, seg = 7) => merge(pts.map(([x, y, z, r, sq = 1]) => new THREE.SphereGeometry(r, seg, 5).scale(1, sq, 1).translate(x, y, z)));

export class PostView {
  constructor(scene) { this.scene = scene; this.views = []; this.extras = []; this.props = []; this.lanes = []; this.key = ''; this.cache = new Map(); this.look = 'street'; this.heights = new Map(); }
  _model(kind) {
    // one model a kind, cloned: the geometry and materials are shared
    if (!this.cache.has(kind)) this.cache.set(kind, build(kind));
    return this.cache.get(kind).clone();
  }
  reset() {
    for (const v of this.views) {
      this.scene.remove(v);
      // v137: a foot is made for its post (the model on it is a shared clone): its geometry is let go with it
      for (const c of v.children ?? []) if (c.userData?.own) c.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
    // a ram's housing and lane are made for it (the models are clones sharing a kind's), so they are let go
    for (const v of this.extras) { this.scene.remove(v); v.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map && o.material.map !== _stripes) o.material.map.dispose(); o.material.dispose(); } }); }
    for (const v of this.props) this.scene.remove(v);
    this.views = []; this.extras = []; this.props = []; this.lanes = []; this.key = '';
    this.mound = this.bandM = this.pitBandM = this.hoopM = this.ringM = this.underM = this.floeM = this.crackM = null; this.heights = new Map(); this._propsOf = null;
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
  // v137: a post's foot — the cistern's a stepped plinth, the ice's a pan of floe ice with its rim turned up, the
  // others one round slab, the edge rounded over (a model of its own, made for the post: let go in reset())
  _foot(w, p, M, mat) {
    const g = new THREE.Group(), h = p.foot, add = (geo) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };
    if (w.world === 4) {
      add(slabGeo(circleShape(0, 0, p.r - 0.1), h * 0.5, 0.08));
      add(slabGeo(circleShape(0, 0, p.r * 0.74), h * 0.45, 0.07)).position.y = h * 0.5;
    } else if (w.world === 7) {
      add(slabGeo(circleShape(0, 0, p.r - 0.12), h, 0.12));
      const lip = add(new THREE.TorusGeometry(p.r - 0.2, 0.13, 8, 48).rotateX(Math.PI / 2)); lip.position.y = h + 0.02; lip.scale.y = 0.6;
    } else add(slabGeo(circleShape(0, 0, p.r - 0.12), h, Math.min(0.12, h * 0.4)));
    // v139: what is fixed to it, and what lies round it on the floor
    if (M.hoop) {
      const parts = [new THREE.TorusGeometry(p.r - 0.02, 0.055, 6, 40).rotateX(Math.PI / 2).translate(0, h * 0.52, 0)];
      for (let k = 0; k < M.hoop.bolts; k++) { const a = (k / M.hoop.bolts) * Math.PI * 2; parts.push(new THREE.SphereGeometry(0.075, 6, 5).translate(Math.cos(a) * (p.r + 0.03), h * 0.52, Math.sin(a) * (p.r + 0.03))); }
      g.add(new THREE.Mesh(merge(parts), this.hoopM ??= std(M.hoop.iron, 0.5, 0.7)));
    }
    if (M.ring) g.add(new THREE.Mesh(new THREE.TorusGeometry(p.r - 0.2, 0.035, 6, 48).rotateX(Math.PI / 2).translate(0, h + 0.012, 0), this.ringM ??= new THREE.MeshBasicNodeMaterial({ color: new THREE.Color().setRGB(M.ring[0] * 1.3, M.ring[1] * 1.3, M.ring[2] * 1.3) })));
    if (M.band) { const b = new THREE.Mesh(bandGeo(circleOutline(0, 0, p.r - 0.05), M.band.inn, M.band.out), this.bandM ??= bandMat(M.band)); b.renderOrder = 2; g.add(b); }
    // its own copy: a foot moves with its post (the core's go round, the ice's drift), so it is not one of the extras
    g.userData.own = true;
    return g;
  }
  // v137: an island — one slab whose outline is the union of its circles, smoothed; the driveway's a curb round a lawn
  _island(cs, M, mat) {
    const h = cs[0].h, extra = (o) => { this.scene.add(o); this.extras.push(o); return o; };
    if (M.lawn) {
      const ring = islandShape(cs), hole = islandShape(cs, 0.42);
      ring.holes.push(new THREE.Path(hole.getPoints(140).reverse()));
      extra(new THREE.Mesh(slabGeo(ring, h, 0.12), mat));
      const lawn = extra(new THREE.Mesh(slabGeo(islandShape(cs, 0.36), h - 0.1, 0.04), lawnMat(M.lawn)));
      lawn.position.y = 0.02;
    } else if (M.mound) {
      // v139: a rock is a rock — a mound heaped inside the outline (its foot a hair under the floor: no seam)
      const R = M.mound, H = h * R.rise, { geo, height } = moundGeo(cs, H + 0.03, R), rock = extra(new THREE.Mesh(geo, this.mound ??= moundMat(M)));
      rock.position.y = -0.03;
      this.heights.set(cs[0].g, (x, z) => height(x, z) - 0.03);
      if (M.dots) {
        // anemones on it, where it is high enough to carry them (their own dice: the island's place)
        const D = M.dots, rnd = seededDots(D.seed + cs[0].g), byCol = D.colors.map(() => []);
        const x0 = Math.min(...cs.map((c) => c.x - c.r)), x1 = Math.max(...cs.map((c) => c.x + c.r)), z0 = Math.min(...cs.map((c) => c.z - c.r)), z1 = Math.max(...cs.map((c) => c.z + c.r));
        for (let k = 0, tries = 0; k < D.n && tries < 400; tries++) {
          const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0), y = height(x, z);
          if (y < H * 0.35 || (this._propsOf ?? []).some((q) => Math.hypot(q.x - x, q.z - z) < q.s * 0.9 + 0.2)) continue;
          const r = D.r[0] + rnd() * (D.r[1] - D.r[0]);
          byCol[k % D.colors.length].push([x, y - 0.03 + r * 0.45, z, r, 0.8]); k++;
        }
        byCol.forEach((pts, i) => { if (pts.length) extra(new THREE.Mesh(dotsGeo(pts), std(D.colors[i], 0.5, 0, { emissive: D.colors[i], emissiveIntensity: D.glow }))); });
      }
    } else {
      extra(new THREE.Mesh(slabGeo(islandShape(cs), h, 0.14), mat));
      if (M.rivets) {
        // v139: riveted round its edge, a rivet every `every` m
        const Rv = M.rivets, pts = islandShape(cs, Rv.inset).getPoints(160), out = [];
        let acc = 0;
        for (let i = 1; i < pts.length; i++) { acc += pts[i].distanceTo(pts[i - 1]); if (acc >= Rv.every) { acc = 0; out.push([pts[i].x, h + Rv.r * 0.2, -pts[i].y, Rv.r, 0.7]); } }
        if (out.length) extra(new THREE.Mesh(dotsGeo(out, 6), std(Rv.color, 0.35, 0.8)));
      }
      if (M.pipe) {
        // v139: a pipe run between the two drums that stand on it, a flange at each and a valve wheel in the middle
        const dr = (this._propsOf ?? []).filter((q) => q.g === cs[0].g);
        if (dr.length === 2) {
          const [A, B] = dr, Pp = M.pipe, dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz), span = d - (A.s + B.s) * 0.96, y = h + Pp.at * Math.min(A.s, B.s) * 1.5;
          if (span > 0.2) {
            const grp = new THREE.Group(), brass = std(Pp.brass, 0.3, 0.5), iron = std(Pp.iron, 0.5, 0.5);
            grp.add(new THREE.Mesh(new THREE.CylinderGeometry(Pp.r, Pp.r, span, 14).rotateZ(Math.PI / 2), brass));
            const fl = [-1, 1].map((sd) => new THREE.CylinderGeometry(Pp.r * 1.7, Pp.r * 1.7, 0.1, 14).rotateZ(Math.PI / 2).translate(sd * (span / 2 - 0.05), 0, 0));
            grp.add(new THREE.Mesh(merge([...fl, new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8).translate(0, 0.28, 0), new THREE.TorusGeometry(0.2, 0.04, 6, 16).rotateX(Math.PI / 2).translate(0, 0.46, 0)]), iron));
            grp.position.set((A.x + B.x) / 2 + (dx / d) * ((A.s - B.s) * 0.48), y, (A.z + B.z) / 2 + (dz / d) * ((A.s - B.s) * 0.48)); grp.rotation.y = -Math.atan2(dz, dx);
            extra(grp);
          }
        }
      }
    }
    // v139: what gathers round it where it meets the floor
    if (M.band) { const b = extra(new THREE.Mesh(bandGeo(M.mound ? isleOutline(cs) : islandShape(cs).getPoints(140).map((v, i, a) => { const q = a[(i + 1) % a.length], tx = q.x - v.x, tz = -(q.y - v.y), tl = Math.hypot(tx, tz) || 1; return [v.x, -v.y, tz / tl, -tx / tl]; }), M.band.inn, M.band.out), this.bandM ??= bandMat(M.band))); b.renderOrder = 2; }
  }
  // v137: a pit — the hole (a disc showing the inside of the cylinder under it) and its rim: a ring of the floor's
  // stone standing round a well, or a low lip of slush round a hole in the ice
  _pit(p, M) {
    const P = M.pit ?? { wall: M.side, deep: [0.004, 0.006, 0.008], rim: M.lip, ring: 0 }, extra = (o) => { this.scene.add(o); this.extras.push(o); return o; };
    const r = p.r - (P.ring || 0.12);
    if (P.shatter) {
      // v139: a hole broken through the ice (shatter(), above): the jagged opening, the dark water between its floes,
      // the floes, the cracks, and the rime round it all
      const K = P.shatter, S = shatter(p, K, seededDots(pitSeed(p)));
      const poly = (pts) => { const sh = new THREE.Shape(); pts.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z))); sh.closePath(); return sh; };
      const flat = (sh, y) => new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2).translate(0, y, 0);
      const hole = extra(new THREE.Mesh(flat(poly(S.hole), 0.008), pitShardMat(P, S.hole))); hole.renderOrder = 2;
      const ring = poly(S.out); ring.holes.push(new THREE.Path(S.hole.map(([x, z]) => new THREE.Vector2(x, -z))));
      const under = extra(new THREE.Mesh(flat(ring, 0.008), this.underM ??= new THREE.MeshBasicNodeMaterial({ color: new THREE.Color().setRGB(...K.under) }))); under.renderOrder = 2;
      extra(new THREE.Mesh(floeGeo(S.floes, K, P.wall), this.floeM ??= std(0xffffff, 0.3, 0, { vertexColors: true })));
      const cr = extra(new THREE.Mesh(crackGeo(S.runs, K.cracks), this.crackM ??= new THREE.MeshBasicNodeMaterial({ vertexColors: true }))); cr.renderOrder = 3;
      if (P.band) { const b = extra(new THREE.Mesh(bandGeo(circleOutline(p.x, p.z, p.r * K.collar[1]), P.band.inn, P.band.out), this.pitBandM ??= bandMat(P.band))); b.renderOrder = 2; }
      return;
    }
    const disc = extra(new THREE.Mesh(new THREE.CircleGeometry(r, 72).rotateX(-Math.PI / 2), pitMat(P, p.x, p.z, r, p.depth)));
    disc.position.set(p.x, 0.008, p.z); disc.renderOrder = 2;
    const rimMat = std(new THREE.Color().setRGB(...P.rim), P.ice ? 0.5 : 0.85, 0);
    if (P.ring) {
      // the well's head: a low wall of the floor's stone round the hole, rounded over
      const s = circleShape(p.x, p.z, p.r - 0.04); s.holes.push(new THREE.Path(circleShape(p.x, p.z, r).getPoints(96).reverse()));
      extra(new THREE.Mesh(slabGeo(s, 0.3, 0.07), slabMat({ ...M, top: P.rim, lip: P.rim.map((v) => v * 1.25) })));
    } else {
      const lip = extra(new THREE.Mesh(new THREE.TorusGeometry(r + 0.05, 0.14, 8, 72).rotateX(Math.PI / 2), rimMat));
      lip.position.set(p.x, 0.02, p.z); lip.scale.y = 0.45;
    }
    // v139: what lies round it: rime and cracks round a hole in the ice, the floor's damp round a well
    const Bd = P.band ?? M.band;
    if (Bd) { const b = extra(new THREE.Mesh(bandGeo(circleOutline(p.x, p.z, P.ring ? p.r : r + 0.19), Bd.inn, Bd.out), P.band ? (this.pitBandM ??= bandMat(Bd)) : (this.bandM ??= bandMat(Bd)))); b.renderOrder = 2; }
  }
  sync(w, alpha, time) {
    const neon = this.look === 'neon' && w?.world <= 3;
    const P = w?.posts ?? [], key = `${w?.world}|${neon ? 'neon|' : ''}` + P.map((p) => `${p.kind}:${p.r.toFixed(2)}`).join('|');
    if (key !== this.key) {
      this.reset();
      this.key = key;
      const M = neon ? neonSlab(w.world) : SLAB[w.world]?.(), isles = new Map();
      // (which way the islands run: their stones' seams lie across it)
      if (M) { const il = P.filter((p) => p.kind === 'island'); M.axisZ = il.length > 1 ? Math.abs(il[1].z - il[0].z) >= Math.abs(il[1].x - il[0].x) : true; }
      const mat = M && slabMat(M);
      let local = null;   // a foot is drawn about its own middle: its grain (and the sewer's brick) is its own
      for (const p of P) {
        // v137: an island's circles and a pit are built once for the layout (below); each keeps a place in views
        if (p.kind === 'island' || p.pit) {
          if (p.kind === 'island') { if (!isles.has(p.g)) isles.set(p.g, []); isles.get(p.g).push(p); }
          else if (M) this._pit(p, M);
          const v = new THREE.Group(); this.scene.add(v); this.views.push(v);
          continue;
        }
        const m = this._model(p.kind);
        let v = m;
        if (p.foot && mat) {
          // v137: on its foot — a round base of the floor's own material, the post its own size on top (a foot that
          // moves gets a material of its own, its grain going with it; the crystal turns on its plinth, not with it)
          v = new THREE.Group();
          v.add(this._foot(w, p, M, local ??= slabMat(M, true)));
          m.scale.setScalar(p.prop); m.position.y = p.foot; v.add(m);
          v.userData.spin = m;
        } else m.scale.setScalar(p.r);
        v.rotation.y = p.ram ? ramYaw(p.ram) : (p.x * 1.7 + p.z * 0.9) % (Math.PI * 2);
        v.userData.yaw = v.rotation.y;
        this.scene.add(v); this.views.push(v);
        if (p.ram) this._ramFixtures(w, p);
      }
      this._propsOf = w.props ?? [];
      for (const cs of isles.values()) this._island(cs, M, mat);
      for (const q of w.props ?? []) {
        if (neon && q.kind === 'shrub') continue;   // nothing grows on a grid of light
        // (a clone sharing its kind's model: removed in reset(), never let go) — v139: on a mound it stands where the
        // mound is that high, a little sunk in
        const y = this.heights.has(q.g) ? this.heights.get(q.g)(q.x, q.z) - 0.06 : q.y;
        const v = this._model(q.kind); v.scale.setScalar(q.s); v.position.set(q.x, y, q.z); v.rotation.y = (q.x * 1.7 + q.z * 0.9) % (Math.PI * 2);
        this.scene.add(v); this.props.push(v);
      }
    }
    // v125 (the state audit): the next world's posts are built at the swap, under the dark; they wait for the
    // landing, as its floor and its set do — they stood in the void through the whole fall
    const show = !(w?.trans && !w.trans.landed);
    for (const v of [...this.views, ...this.extras, ...this.props]) if (v.visible !== show) v.visible = show;
    P.forEach((p, i) => {
      const v = this.views[i];
      if (!v) return;
      v.position.set(p.px + (p.x - p.px) * alpha, 0, p.pz + (p.z - p.pz) * alpha);
      if (p.kind === 'crystal') (v.userData.spin ?? v).rotation.y = time * 0.4 + i * 1.3;
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
