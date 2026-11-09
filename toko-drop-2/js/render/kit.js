// kit.js — what every world's scenery draws with (v72: out of scenery.js when
// worlds 5-9 got sets of their own, render/sets/): a hash and value noise on
// the plane, the crack network, a seeded stream of numbers, the stations
// round a floor props stand on, and the few shapes more than one set makes
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec3, fract, sin, cos, dot, floor as tfloor, mix, length, min, max, abs, atan, fwidth, smoothstep, step, uniform, instanceIndex, normalView, positionLocal, positionGeometry } from 'three/tsl';
import { GEL_TIME } from './gel.js?v=125';

// a hash and value noise on the world plane, cheap enough for a picture
export const hash = (p) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
export const noise = Fn(([p]) => {
  const i = tfloor(p), f = fract(p), u = f.mul(f).mul(float(3).sub(f.mul(2)));
  const a = hash(i), b = hash(i.add(vec2(1, 0))), c = hash(i.add(vec2(0, 1))), d = hash(i.add(vec2(1, 1)));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
});

// how far p is from the nearest edge between the cells of a jittered grid,
// as F2 − F1 (0 on an edge): a network of straight runs meeting in threes,
// which is how concrete cracks (v65, the floor's cracks)
export const cells = Fn(([p]) => {
  const i = tfloor(p), f = fract(p), d1 = float(8).toVar(), d2 = float(8).toVar();
  for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    const o = vec2(x, y), c = i.add(o), d = length(o.add(vec2(hash(c), hash(c.add(vec2(57.1, 13.7))))).sub(f));
    d2.assign(min(max(d1, d), d2)); d1.assign(min(d1, d));
  }
  return d2.sub(d1);
});

// how far the current rule has carried what floats (v72, the river's lily
// pads): main.js adds up its push, so a pad goes the way the gels are pushed
export const DRIFT = uniform(new THREE.Vector2());

// lily pads afloat (v72, world 6): in every `cell` m a pad, or none (`keep`
// of the cells have one), round with a notch cut to its middle, its rim a
// little lighter, and a flower on a few. Returns (pad, rim, flower)
export const lilyPads = Fn(([w, cell, keep]) => {
  const u = w.div(cell), i = tfloor(u), f = fract(u).sub(0.5);
  const h1 = hash(i), h2 = hash(i.add(vec2(31.7, 11.3))), h3 = hash(i.add(vec2(7.1, 59.9))), h4 = hash(i.add(vec2(19.3, 3.7)));
  const q = f.sub(vec2(h1, h2).sub(0.5).mul(0.36)), r = h3.mul(0.1).add(0.17), d = length(q), aa = max(fwidth(d), 1e-4);
  const da = abs(fract(atan(q.y, q.x).div(6.2832).sub(h4).add(0.5)).sub(0.5)).mul(6.2832);
  const pad = smoothstep(r.add(aa), r.sub(aa), d).mul(smoothstep(0.16, 0.26, da)).mul(smoothstep(keep.add(0.02), keep.sub(0.02), h4));
  const rim = smoothstep(r.sub(0.05), r, d).mul(pad);
  const flower = smoothstep(r.mul(0.3).add(aa), r.mul(0.3).sub(aa), d).mul(step(0.82, h3)).mul(step(0.5, pad));
  return vec3(pad, rim, flower);
});

// a seeded stream of numbers in [0, 1), so a world stands the same every time
export const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// an instance's own number in [0, 1), the same for every vertex of it: what
// sets a sway, a puff or a bubble off on a beat of its own
export const phase = () => fract(instanceIndex.toFloat().mul(0.6180339));

// stations every `every` m round a floor of half sizes hx × hz: along the far
// side (past both corners) and the two sides (to the near edge), `out` m past
// the edge, a number or [min, max] drawn for each. Each is [x, z, nx, nz]: its
// place and the way back to the floor. Never along the near side
export function stations(hx, hz, rnd, { every, out, jitter = 0.6, sides = ['far', 'left', 'right'] }) {
  const o = () => (Array.isArray(out) ? out[0] + rnd() * (out[1] - out[0]) : out), reach = Array.isArray(out) ? out[1] : out, res = [];
  for (const side of sides) {
    const far = side === 'far', len = far ? 2 * (hx + reach) : 2 * hz, n = Math.max(1, Math.floor(len / every));
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5 + (rnd() - 0.5) * jitter) / n, off = o();
      if (far) res.push([-(hx + reach) + s * len, -(hz + off), 0, 1]);
      else { const sd = side === 'left' ? -1 : 1; res.push([sd * (hx + off), -hz + s * len, -sd, 0]); }
    }
  }
  return res;
}

// a matrix for an instance: at (x, y, z), scaled (sx, sy, sz), turned (rx, ry, rz)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _t = new THREE.Vector3();
export function put(inst, i, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
  _e.set(rx, ry, rz); _q.setFromEuler(_e);
  inst.setMatrixAt(i, _m.compose(_t.set(x, y, z), _q, _s.set(sx, sy, sz)));
}

// a rounded stone: a sphere pushed in and out by a few lumps, so no two faces
// of it agree and it reads as worn rather than as a ball (river stones, the
// deep's boulders, the ice's rocks)
export function stoneGeometry(seed, detail = 2, rough = 0.22) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.getAttribute('position'), rnd = seeded(seed);
  const lumps = Array.from({ length: 7 }, () => { const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); return [v, (rnd() - 0.4) * rough]; });
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let k = 1;
    for (const [d, a] of lumps) k += a * Math.max(0, v.dot(d)) ** 3;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

// a clump of tapering blades bent out from its middle, a metre tall (scaled
// to each clump's height): the river's reeds; the driveway's tufts are the
// same idea, bent harder
export function bladeClump(rnd, { blades, r, w, bend, rows = 3 }) {
  const pos = [], uvs = [], idx = [], per = (rows + 1) * 2;
  for (let b = 0; b < blades; b++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r, h = 0.6 + rnd() * 0.4, lean = bend * (0.3 + rnd() * 0.9);
    const ox = Math.cos(a), oz = Math.sin(a), tw = (rnd() - 0.5) * 0.8, wx = -oz * Math.cos(tw) - ox * Math.sin(tw), wz = ox * Math.cos(tw) - oz * Math.sin(tw);
    for (let k = 0; k <= rows; k++) {
      const t = k / rows, hw = (w / 2) * (1 - 0.92 * t), bnd = lean * t * t * h;
      for (const sd of [-1, 1]) { pos.push(ox * d + wx * sd * hw + ox * bnd, t * h, oz * d + wz * sd * hw + oz * bnd); uvs.push((sd + 1) / 2, t); }
    }
    for (let k = 0; k < rows; k++) { const p = b * per + k * 2; idx.push(p, p + 1, p + 3, p, p + 3, p + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// a picture of the ground past the floor (unlit, as the floor is), drawn
// after the floor so the depth test throws away what lies under it (v68)
export function groundPlane(sc, hx, hz, out, colorNode, y = -0.03) {
  const mat = new THREE.MeshBasicNodeMaterial();
  mat.colorNode = colorNode;
  const m = sc._add(new THREE.Mesh(new THREE.PlaneGeometry(2 * (hx + out), 2 * (hz + out)).rotateX(-Math.PI / 2), mat));
  m.position.y = y; m.renderOrder = 1;
  return m;
}

// the four sides of a frame round the floor as one mesh (v72: one draw, not
// four): pieces `w` m wide `gap` m out from the edge, `h` m tall (0: flat)
export function frameGeometry(hx, hz, gap, w, h) {
  const o = gap + w / 2, parts = [];
  for (const [sx, sz, x, z] of [[2 * (hx + gap + w), w, 0, -(hz + o)], [2 * (hx + gap + w), w, 0, hz + o], [w, 2 * (hz + gap), -(hx + o), 0], [w, 2 * (hz + gap), hx + o, 0]]) {
    parts.push(h ? new THREE.BoxGeometry(sx, h, sz).translate(x, h / 2, z) : new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2).translate(x, 0, z));
  }
  return merge(parts);
}

// v100/v101: a LEDGE round the floor (the ice's banks, the boiler's low wall, the deep's rims): blocks along
// the far side and both long sides — never the near side — each `len` m along, `deep` m back and `h` m tall
// (a number, or [min, max] drawn per block), `gap` m off the edge, turned up to `tilt` rad; now and then
// (`step.chance`) a lower step `step.deep` m deep in front at `step.h` of the height. One [x, z, length,
// depth, height, turn] per block, from a seeded draw (the far run spans the corners, the sides start behind it)
export function ledgeBlocks(hx, hz, Lg, seed) {
  const lr = seeded(seed), rr = (a) => (Array.isArray(a) ? a[0] + lr() * (a[1] - a[0]) : a), blocks = [];
  const run = (ox, oz, ax, az, nx, nz, s0, s1) => {
    for (let s = s0; s < s1 - 0.25;) {
      const l = Math.min(rr(Lg.len), s1 - s), d = rr(Lg.deep), h = rr(Lg.h), mid = s + l / 2, ry = -Math.atan2(az, ax) + (lr() - 0.5) * (Lg.tilt ?? 0);
      const at = (back, dd) => [ox + ax * mid + nx * (Lg.gap + back + dd / 2), oz + az * mid + nz * (Lg.gap + back + dd / 2)];
      if (Lg.step && lr() < Lg.step.chance) {
        const sd = Lg.step.deep;
        blocks.push([...at(0, sd), l, sd, h * Lg.step.h, ry]);
        blocks.push([...at(sd, d - sd), l, d - sd, h, ry]);
      } else blocks.push([...at(0, d), l, d, h, ry]);
      s += l;
    }
  };
  const D = (Array.isArray(Lg.deep) ? Lg.deep[1] : Lg.deep) + Lg.gap;
  run(-hx - D, -hz, 1, 0, 0, -1, 0, 2 * (hx + D));
  run(-hx, -hz, 0, 1, -1, 0, 0, 2 * hz);
  run(hx, -hz, 0, 1, 1, 0, 0, 2 * hz);
  return blocks;
}
// the blocks as one instanced draw: a unit box standing on its foot (positionGeometry.y runs 0 → 1 up it)
export function ledgeMesh(sc, blocks, mat) {
  const bm = sc._add(new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), mat, blocks.length));
  blocks.forEach(([x, z, l, d, h, ry], i) => put(bm, i, x, -0.02, z, l, h + 0.02, d, 0, ry, 0));
  return bm;
}

// the thin glowing line where the floor stops, all four sides
export function edgeLine(sc, hx, hz, E) {
  const mat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(E.color).multiplyScalar(E.glow ?? 1) });
  return sc._add(new THREE.Mesh(frameGeometry(hx, hz, 0, E.width, E.height), mat));
}

// things that rise from a spot and fade as they go, each on a beat of its
// own: the boiler's steam, the deep's bubbles. `per` to a spot, each rising
// `rise` m over `period` s and growing from r[0] to r[1] m, swaying `sway` m;
// a puff is lit in its middle, a bubble (`rim`) round its edge; `duty`
// (−1 → 1) lets a spot breathe out only now and then, all its puffs together
export function risers(sc, spots, P) {
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: P.add ? THREE.AdditiveBlending : THREE.NormalBlending });
  const k = fract(GEL_TIME.div(P.period).add(phase())), face = normalView.z.max(0);
  const spot = fract(tfloor(instanceIndex.toFloat().div(P.per)).mul(0.7548777));
  let a = float(P.gain).mul(smoothstep(0, 0.12, k)).mul(float(1).sub(k).pow(P.fade ?? 1.5));
  a = a.mul(P.rim ? float(1).sub(face).pow(2).mul(0.85).add(0.15) : face.pow(1.5));
  if (P.duty != null) a = a.mul(smoothstep(P.duty, P.duty + 0.2, sin(GEL_TIME.mul(P.dutyRate ?? 0.5).add(spot.mul(6.283)))));
  mat.colorNode = vec3(...P.color);
  mat.opacityNode = a;
  mat.positionNode = Fn(() => {
    const c = positionLocal.sub(positionGeometry), ph = phase().mul(6.283), w = P.wobble ?? 2.5;
    return c.add(vec3(sin(k.mul(w).add(ph)).mul(P.sway), k.mul(P.rise), cos(k.mul(w * 0.8).add(ph)).mul(P.sway * 0.6))).add(positionGeometry.mul(mix(float(P.r[0]), float(P.r[1]), k)));
  })();
  const inst = sc._add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), mat, spots.length * P.per));
  inst.frustumCulled = false;   // they rise out of the bounds their spots give
  spots.forEach(([x, y, z], j) => { for (let i = 0; i < P.per; i++) put(inst, j * P.per + i, x, y, z); });
  return inst;
}

// several geometries as one (each with position, normal and uv): the deep's
// anemones are a dozen cones round a root
export function merge(geos) {
  const pos = [], nor = [], uvs = [], idx = [];
  let base = 0;
  for (const g of geos) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), u = g.getAttribute('uv');
    pos.push(...p.array); nor.push(...n.array); uvs.push(...u.array);
    const ix = g.getIndex();
    if (ix) for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + base);
    else for (let i = 0; i < p.count; i++) idx.push(i + base);
    base += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(idx);
  return out;
}

// motes afloat in a volume (v77, the world particles: embers, snow, dust in a
// sun shaft, lamp motes, fireflies, marine snow). `n` specks in each of
// `boxes` ([x, z, w, d, y0]: a box's middle, its size along x and z, its
// floor), each on a loop of its own `h` m up (or down: `vy` < 0) the box at
// `vy` m/s, swaying `sway` m at `wobble` rad/s, `r` m across, lit `gain` in
// `color`, fading in at the foot of its loop and out at the top; `blink`
// [rate, depth] makes them flicker (fireflies). One instanced draw
export function motes(sc, boxes, P) {
  const mat = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: P.add === false ? THREE.NormalBlending : THREE.AdditiveBlending });
  const ph = phase(), ph2 = fract(ph.mul(7.31)), up = P.vy >= 0;
  const u = fract(GEL_TIME.mul(Math.abs(P.vy) / P.h).add(ph)), lift = (up ? u : float(1).sub(u)).mul(P.h);
  let a = sin(u.mul(3.1416)).mul(P.gain).mul(normalView.z.max(0).pow(1.5));
  if (P.blink) a = a.mul(sin(GEL_TIME.mul(P.blink[0]).add(ph2.mul(6.283))).mul(0.5).add(0.5).mul(P.blink[1]).add(1 - P.blink[1]));
  mat.colorNode = vec3(...P.color);
  mat.opacityNode = a;
  mat.positionNode = positionLocal.add(vec3(sin(GEL_TIME.mul(P.wobble).add(ph2.mul(6.283))).mul(P.sway), lift, cos(GEL_TIME.mul(P.wobble * 0.8).add(ph.mul(6.283))).mul(P.sway * 0.7)));
  const rnd = seeded(P.seed ?? 77), inst = sc._add(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), mat, boxes.length * P.n));
  inst.frustumCulled = false;
  let i = 0;
  for (const [x, z, w, d, y0] of boxes) for (let k = 0; k < P.n; k++) { const r = P.r * (0.7 + rnd() * 0.6); put(inst, i++, x + (rnd() - 0.5) * w, y0, z + (rnd() - 0.5) * d, r, r, r); }
  return inst;
}
