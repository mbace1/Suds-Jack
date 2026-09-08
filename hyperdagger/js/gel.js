import * as THREE from 'three';

/**
 * GEL — season 2's material, and the two builds that wear it.
 *
 * Everything native in this game is unlit: a flat fill with a per-face tone.
 * Goo cannot be that — goo is the thing light goes INTO — so this is the one
 * material in the game that pretends to be lit, and it pretends in the cheap
 * way tech art does: no lights, no normals from anything but the box itself,
 * everything in world space, four terms added onto the flat colour:
 *
 *   FRESNEL   — the rim brightens where the surface turns away from you,
 *               which is what makes an edge read as SOFT (the brief's word)
 *               without any geometry being rounded;
 *   CAUSTIC   — three sine fields drifting through world space, thresholded,
 *               so light moves THROUGH the body rather than sitting on it;
 *   SPECULAR  — one fixed sun, a tight highlight, so a wet surface reads wet;
 *   WOBBLE    — in the vertex shader: every piece breathes along its normal
 *               and its top leans with time, seeded by its own position, so
 *               a field of cubes is a field of jelly and not a wall;
 *   SSS       — (v46, from Toko Drop's satin gel) light bleeding THROUGH the
 *               body from behind, plus a wrap term so the shadow side is
 *               never dead, and a tight white fresnel at the very edge.
 *
 * The rim and caustic terms are added in the LIP colour, which is HDR, so the
 * edges of goo trip the bloom the way an eye or a gem does. That is the whole
 * look: dark aquamarine bodies with light crawling in them and edges that glow.
 */
export function gelMaterial(o = {}) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: !!o.vertexColors });
  // `shared` — another gel material's uniform set, so the wave (instance
  // colours) and the mounds (vertex colours) are two materials on ONE clock
  const u = o.shared ?? {
    uTime: { value: 0 },
    uLip: { value: new THREE.Color().setRGB(...(o.lip ?? [0.5, 1.8, 1.5])) },
    uSun: { value: new THREE.Vector3(...(o.sun ?? [0.4, 0.8, -0.3])).normalize() },
    uWobble: { value: o.wobble ?? 0.05 },
    uCaustic: { value: o.caustic ?? 0.6 },
    uFresnel: { value: o.fresnel ?? 0.9 },
    uSpec: { value: o.spec ?? 0.7 },
    uSSS: { value: o.sss ?? 0.5 },
  };
  mat.userData.gel = u;
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform float uWobble;
varying vec3 vGelN; varying vec3 vGelW;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  vec3 gelSeed = vec3(instanceMatrix[3]);
#else
  vec3 gelSeed = position;
#endif
float gelPh = dot(gelSeed, vec3(0.73, 1.31, 0.89));
// jelly: breathe along the normal, and the top leans with time
float gelBr = sin(uTime * 3.7 + gelPh) * uWobble;
transformed += normal * gelBr;
float gelUp = max(transformed.y, 0.0);
transformed.x += sin(uTime * 2.3 + gelPh * 1.7) * uWobble * 0.8 * gelUp;
transformed.z += cos(uTime * 2.9 + gelPh * 1.3) * uWobble * 0.8 * gelUp;
vGelN = normalize(mat3(modelMatrix) * normal);
#ifdef USE_INSTANCING
  vGelW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
#else
  vGelW = (modelMatrix * vec4(transformed, 1.0)).xyz;
#endif`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec3 uLip; uniform vec3 uSun;
uniform float uCaustic; uniform float uFresnel; uniform float uSpec; uniform float uSSS;
varying vec3 vGelN; varying vec3 vGelW;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  vec3 N = normalize(vGelN);
  vec3 V = normalize(cameraPosition - vGelW);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.4);
  // light moving THROUGH the goo: three sine fields drifting in world space
  float c1 = sin(vGelW.x * 1.9 + uTime * 1.4) * sin(vGelW.z * 2.1 - uTime * 1.1);
  float c2 = sin((vGelW.x + vGelW.z) * 1.1 + uTime * 0.8) * sin(vGelW.y * 2.7 + uTime * 0.6);
  float ca = smoothstep(0.35, 1.0, c1 * 0.6 + c2 * 0.5);
  vec3 col = diffuseColor.rgb;
  // ENERGY BUDGET. The body colour already ramps to an HDR lip at the crest;
  // the rim and the inner light are added in uLip too, so the first cut was
  // lip + lip + lip and the whole wave bloomed to white. The rim is a thin
  // term (0.4) and the caustic a thinner one (0.3): the sum at a grazing
  // edge on the crest just clears 1.0, which is where bloom should start
  // and nowhere else.
  col += uLip * (fres * uFresnel * 0.4 + ca * uCaustic * 0.3);
  float sp = pow(max(dot(reflect(-V, N), uSun), 0.0), 28.0);
  col += vec3(1.0, 1.0, 0.94) * sp * uSpec * 0.6;
  // v46 — Toko Drop's satin term: back-light bleeding through the gel (the
  // sun behind the body lights it from within) and a wrap so the side away
  // from the sun still carries the colour; a tight white rim at the edge
  float ndv = max(dot(N, V), 0.0);
  vec3 Hs = normalize(uSun + N * 0.45);
  float sss = pow(clamp(dot(V, -Hs), 0.0, 1.0), 2.2) * uSSS;
  float wrap = clamp(dot(N, uSun) * 0.5 + 0.5, 0.0, 1.0);
  col += uLip * (sss * 0.35 + wrap * 0.10 * uSSS);
  col += vec3(1.0) * pow(1.0 - ndv, 6.0) * uFresnel * 0.25;
  diffuseColor.rgb = col;
}`);
  };
  return mat;
}

// ---------------------------------------------------------------- the spring

/**
 * GEL SPRING — Toko Drop's squash (enemy.js `_sq`/`_sqV`), ported: a
 * second-order spring on a body's vertical scale. Land on it and it squashes
 * (`landSquish` 0.32), leave it and it stretches, hit it and it flinches;
 * it always comes back to 1. Volume is kept — x and z go by 1/√y — so the
 * squash reads as a body giving way and not a body shrinking. Toko Drop's
 * numbers are per 60 Hz frame; this integrates in fixed 60 Hz substeps so
 * a slow renderer gets the same motion, only later.
 */
export class GelSpring {
  constructor(o = {}) {
    this.spring = o.spring ?? 0.24;
    this.damp = o.damp ?? 0.86;
    this.min = o.min ?? 0.55;
    this.max = o.max ?? 1.55;
    this.sq = 1;
    this.v = 0;
    this.acc = 0;
  }
  /** an impulse: negative squashes, positive stretches */
  kick(dv) { this.v += dv; }
  step(dt) {
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      this.v = (this.v - (this.sq - 1) * this.spring) * this.damp;
      this.sq = Math.max(this.min, Math.min(this.max, this.sq + this.v));
    }
    return this.sq;
  }
  get side() { return 1 / Math.sqrt(Math.max(this.sq, 0.1)); }
  reset() { this.sq = 1; this.v = 0; this.acc = 0; }
}

// ---------------------------------------------------------------- builders

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

/** One box into the accumulators — position, NORMAL and colour. shale.js
 *  drops normals because nothing there is lit; gel needs them. */
function pushBox(acc, w, h, d, x, y, z, rgb, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z);
  _m.compose(_p, _q, _s);
  g.applyMatrix4(_m);
  const pos = g.getAttribute('position'), nrm = g.getAttribute('normal'), idx = g.getIndex();
  const base = acc.count;
  for (let i = 0; i < pos.count; i++) {
    acc.pos.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    acc.nrm.push(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
    acc.col.push(rgb[0], rgb[1], rgb[2]);
  }
  for (let i = 0; i < idx.count; i++) acc.idx.push(base + idx.getX(i));
  acc.count += pos.count;
  g.dispose();
}

function finish(acc) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(acc.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(acc.nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(acc.col, 3));
  geo.setIndex(acc.idx);
  return geo;
}

/**
 * A MOUND of goo cubes: the brief's "soft edges on large voxel platforms".
 * Columns of cubes on a grid, the column height a rounded dome
 * (1 − r⁴)^0.6 of the declared height — flat on top, falling away at the
 * rim in steps — so the silhouette is soft while every piece is still a
 * cube. Colour runs deep→lip with height, and the gel shader's rim does the
 * rest. Origin at the base centre, like shale. DARK by default: the shader
 * adds light, so a body that starts pale ends white.
 */
export function gelMoundGeometry(o) {
  const draw = o.draw ?? Math.random;
  const cell = o.cell ?? 1.0;
  const deep = o.deep ?? [0.012, 0.09, 0.11], lip = o.lip ?? [0.07, 0.36, 0.38];
  const acc = { pos: [], nrm: [], col: [], idx: [], count: 0 };
  const nx = Math.max(2, Math.round(o.w / cell)), nz = Math.max(2, Math.round(o.d / cell));
  const cw = o.w / nx, cd = o.d / nz;
  for (let ix = 0; ix < nx; ix++) for (let iz = 0; iz < nz; iz++) {
    const x = -o.w / 2 + cw * (ix + 0.5), z = -o.d / 2 + cd * (iz + 0.5);
    const rx = x / (o.w / 2), rz = z / (o.d / 2);
    const r2 = rx * rx + rz * rz;
    const dome = Math.pow(Math.max(0, 1 - r2 * r2), 0.6);
    const jitter = 1 + (draw() - 0.5) * 0.12;
    let hh = o.h * dome * jitter;
    if (hh < cell * 0.4) continue;
    const rows = Math.max(1, Math.round(hh / cell));
    for (let iy = 0; iy < rows; iy++) {
      const k = (iy + 1) / rows;
      const v = 0.85 + draw() * 0.3;
      const c = [deep[0] + (lip[0] - deep[0]) * k, deep[1] + (lip[1] - deep[1]) * k, deep[2] + (lip[2] - deep[2]) * k].map(q => q * v);
      pushBox(acc, cw * 0.96, cell * 0.96, cd * 0.96, x, cell * (iy + 0.5), z, c);
    }
  }
  return finish(acc);
}

/**
 * A stepped TERRACE — the Inca skyline in one shape. `steps` shrinking beds
 * of equal height; a wider bottom and a narrow top read as a ziggurat from
 * anywhere. Pale stone, meant to be seen through fog at the horizon.
 */
export function terraceGeometry(o) {
  const draw = o.draw ?? Math.random;
  const steps = o.steps ?? 6, color = o.color ?? [0.20, 0.36, 0.37];
  const acc = { pos: [], nrm: [], col: [], idx: [], count: 0 };
  const sh = o.h / steps;
  for (let i = 0; i < steps; i++) {
    const k = 1 - i / steps;
    const w = o.w * (0.35 + 0.65 * k), d = o.d * (0.35 + 0.65 * k);
    const v = 0.9 + draw() * 0.2;
    const ry = (draw() - 0.5) * 0.06;
    pushBox(acc, w, sh, d, (draw() - 0.5) * 0.4, sh * (i + 0.5), (draw() - 0.5) * 0.4, color.map(q => q * v), ry);
  }
  return finish(acc);
}
