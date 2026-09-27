// Plasticine, and the other things a stop-motion set is made of.
//
// CLAY is never a perfect primitive: every clay mesh is re-sculpted by a
// position-keyed noise field (so shared vertices move together and nothing
// cracks), carries a thumbprint-and-tool-drag normal map on box-projected UVs,
// is mottled in vertex colour the way kneaded plasticine is, and has a warm
// glow at grazing angles where light scatters through it. And it BOILS: each
// exposure re-sculpts it a fraction of a millimetre, because an animator's
// hands were on it between frames.
//
// FELT, CARD and WOOD are the set: high-roughness fabrics and boards with
// their own procedural textures, so the puppets are clay and the world is
// the workshop around them.

import * as THREE from 'three';
import { mergeVertices } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { TTFLoader } from '../vendor/jsm/loaders/TTFLoader.js';
import { Font } from '../vendor/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../vendor/jsm/geometries/TextGeometry.js';

// ── noise ────────────────────────────────────────────────────────────────
function h3(x, y, z, s) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647) ^ Math.imul(s | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1103515245);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function n3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => h3(xi + dx, yi + dy, zi + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
           L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
export function rng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── textures ─────────────────────────────────────────────────────────────
// Height fields turned into normal maps. Tileable: every feature is laid
// with wrap-around distance so the seam never shows.
function heightToNormal(hf, N, strength) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d'), im = g.createImageData(N, N);
  const at = (x, y) => hf[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength, dy = (at(x, y - 1) - at(x, y + 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
    im.data[i] = (dx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4; return t;
}
let printsTex = null;
export function clayPrints() {
  if (printsTex) return printsTex;
  const N = 1024, hf = new Float32Array(N * N), r = rng(41);
  // tooth: the grain of the clay itself
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    hf[y * N + x] = n3(u * 64, v * 64, 0, 3) * 0.12 + n3(u * 160, v * 160, 1, 4) * 0.05
      + n3(u * 12, v * 12, 2, 5) * 0.25;   // the lumpiness between prints
  }
  const wrapD = (a, b) => { let d = a - b; if (d > N / 2) d -= N; if (d < -N / 2) d += N; return d; };
  // thumbprints: whorls of fine ridges, strongest in the middle of the pad
  for (let k = 0; k < 14; k++) {
    const cx = r() * N, cy = r() * N, rx = 60 + r() * 70, ry = rx * (0.65 + r() * 0.3), rot = r() * Math.PI, depth = 0.25 + r() * 0.35;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let y = Math.floor(cy - rx); y < cy + rx; y++) for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
      const dx = wrapD(x, cx), dy = wrapD(y, cy), px = (dx * cr + dy * sr) / rx, py = (-dx * sr + dy * cr) / ry, d = Math.hypot(px, py);
      if (d >= 1) continue;
      const fall = (1 - d * d) ** 2, ridge = Math.sin(d * rx * 1.05 + Math.atan2(py, px) * 0.6);
      const i = ((y + N) % N) * N + ((x + N) % N);
      hf[i] += ridge * 0.35 * fall * depth - fall * depth * 0.6;          // ridges in a shallow dent
    }
  }
  // tool drags: long parallel scratches from a modelling tool
  for (let k = 0; k < 9; k++) {
    const x0 = r() * N, y0 = r() * N, a = r() * Math.PI, len = 120 + r() * 260, w = 6 + r() * 10;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (let s = 0; s < len; s += 0.7) for (let o = -w; o <= w; o += 1) {
      const x = Math.round(x0 + ca * s - sa * o), y = Math.round(y0 + sa * s + ca * o);
      const i = ((y % N + N) % N) * N + ((x % N + N) % N), edge = 1 - Math.abs(o) / w;
      hf[i] += Math.sin(o * 1.7) * 0.08 * edge * Math.sin(Math.PI * s / len);
    }
  }
  printsTex = heightToNormal(hf, N, 2.2);
  return printsTex;
}
let feltTex = null;
export function feltNormal() {
  if (feltTex) return feltTex;
  const N = 512, hf = new Float32Array(N * N), r = rng(8);
  for (let i = 0; i < N * N; i++) hf[i] = r() * 0.5;
  for (let k = 0; k < 9000; k++) { // fibres
    let x = r() * N, y = r() * N; const a = r() * Math.PI * 2;
    for (let s = 0; s < 14; s++) { x += Math.cos(a + s * 0.1); y += Math.sin(a + s * 0.1); hf[((y | 0) % N + N) % N * N + ((x | 0) % N + N) % N] += 0.35; }
  }
  feltTex = heightToNormal(hf, N, 1.4); return feltTex;
}
let woodTex = null;
export function woodMap() {
  if (woodTex) return woodTex;
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d'), im = g.createImageData(512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const v = y / 512, u = x / 512, grain = Math.sin((v * 40 + n3(u * 3, v * 6, 0, 2) * 3.5) * Math.PI) * 0.5 + 0.5;
    const k = 0.78 + grain * 0.16 + n3(u * 90, v * 8, 1, 3) * 0.05, i = (y * 512 + x) * 4;
    im.data[i] = 190 * k; im.data[i + 1] = 128 * k; im.data[i + 2] = 80 * k; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  woodTex = new THREE.CanvasTexture(c); woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.colorSpace = THREE.SRGBColorSpace;
  return woodTex;
}

// ── materials ────────────────────────────────────────────────────────────
// Fake subsurface: plasticine glows a little at grazing angles, warmer than
// its own colour, because light goes in and comes back out. Added as
// emissive after the normal is known, so it follows the thumbprints too.
function withSSS(mat, amount, tint) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSSS = { value: amount };
    sh.uniforms.uSSSTint = { value: new THREE.Color(tint) };
    sh.fragmentShader = 'uniform float uSSS; uniform vec3 uSSSTint;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);
        totalEmissiveRadiance += diffuseColor.rgb * uSSSTint * fres * uSSS; }`);
  };
  mat.customProgramCacheKey = () => 'sss' + amount;
  return mat;
}
const matCache = new Map();
/** plasticine. Colour comes from vertex colours (see `paint`), so one material serves every clay */
export function clayMat({ rough = 0.58, prints = 0.55, sheen = 0.35, sss = 0.35, repeat = 1 } = {}) {
  const k = [rough, prints, sheen, sss, repeat].join();
  if (matCache.has(k)) return matCache.get(k);
  const t = clayPrints();
  const m = withSSS(new THREE.MeshPhysicalMaterial({
    color: '#ffffff', vertexColors: true, roughness: rough, metalness: 0,
    sheen, sheenRoughness: 0.7, sheenColor: new THREE.Color('#fff4ea'),
    normalMap: t, normalScale: new THREE.Vector2(prints, prints),
  }), sss, '#ffb08a');
  matCache.set(k, m); return m;
}
export function feltMat(color, { rough = 0.95 } = {}) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: rough, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.5), normalMap: feltNormal(), normalScale: new THREE.Vector2(0.8, 0.8) });
}
export function cardMat(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, normalMap: feltNormal(), normalScale: new THREE.Vector2(0.18, 0.18) });
}
export function woodMat() {
  return new THREE.MeshStandardMaterial({ map: woodMap(), roughness: 0.7 });
}
export function glassMat() {
  return new THREE.MeshPhysicalMaterial({ color: '#eaf6ff', roughness: 0.06, transmission: 1, thickness: 0.6, ior: 1.45, specularIntensity: 1, clearcoat: 0.4 });
}
export function metalMat(color = '#b9c0cc', rough = 0.32) {
  return new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough });
}
/** a flat printed thing — a label, a sign — from a 2D canvas drawing */
export function printMat(w, h, draw, { rough = 0.8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: rough });
  m.userData.redraw = (fn) => { fn(c.getContext('2d'), w, h); t.needsUpdate = true; };
  return m;
}

// ── clay geometry ────────────────────────────────────────────────────────
const LIVE = new Set();
/**
 * Turn a geometry into clay: welded, re-sculpted by noise along its normals,
 * given box-projected UVs for the prints, and registered to boil.
 *   lump   cm of low-frequency unevenness (the hand-rolled shape)
 *   freq   of that unevenness, per cm
 *   boil   cm the surface shifts between exposures
 */
export function clay(geo, { lump = 0.12, freq = 0.35, boil = 0.025, seed = 1, uvScale = 0.09, ridges = 0, fissure = false } = {}) {
  geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
  geo = mergeVertices(geo, 1e-4);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  const base = new Float32Array(p.array), bn = new Float32Array(n.array);
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    const ax = Math.abs(bn[i * 3]), ay = Math.abs(bn[i * 3 + 1]), az = Math.abs(bn[i * 3 + 2]);
    const [u, v] = ax > ay && ax > az ? [z, y] : ay > az ? [x, z] : [x, y];
    uv[i * 2] = u * uvScale + seed * 0.37; uv[i * 2 + 1] = v * uvScale + seed * 0.61;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.userData.clay = { base, bn, lump, freq, boil, seed, ridges, fissure };
  sculpt(geo, 0);
  return geo;
}
function sculpt(geo, frame) {
  const { base, bn, lump, freq, boil, seed, ridges, fissure } = geo.userData.clay, p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
    let d = n3(x * freq, y * freq, z * freq, seed) * lump;
    // gyri: ridged noise, sharp valleys and rounded crowns
    if (ridges) { const r = 1 - Math.abs(n3(x * ridges, y * ridges * 1.3, z * ridges, seed + 9)); d += (r * r) * lump * 2.4 - lump * 1.1; }
    // the fissure between the hemispheres, down the middle from front to back
    if (fissure && y > -0.5) d -= Math.exp(-(x * x) / 0.08) * lump * 2.2;
    if (boil) d += n3(x * 0.9 + frame * 7.3, y * 0.9, z * 0.9, seed + 31) * boil;
    p.array[i * 3] = x + bn[i * 3] * d; p.array[i * 3 + 1] = y + bn[i * 3 + 1] * d; p.array[i * 3 + 2] = z + bn[i * 3 + 2] * d;
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}
/** kneaded colour: the base hue, mottled, with a streak of a second clay if given */
export function paint(geo, color, { mottle = 0.05, marble = null, seed = 2 } = {}) {
  const p = geo.attributes.position, c = new Float32Array(p.count * 3);
  const a = new THREE.Color(color), b = marble ? new THREE.Color(marble) : null, t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.array[i * 3], y = p.array[i * 3 + 1], z = p.array[i * 3 + 2];
    const m = 1 + n3(x * 0.8, y * 0.8, z * 0.8, seed) * mottle + n3(x * 3, y * 3, z * 3, seed + 1) * mottle * 0.4;
    t.copy(a).multiplyScalar(m);
    if (b) { const s = Math.max(0, n3(x * 0.25 + y * 0.6, z * 0.4, 0, seed + 5) * 2 - 0.9); t.lerp(b, Math.min(1, s * 1.2)); }
    c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
/** a clay mesh in one call */
export function lump(geo, color, opts = {}) {
  const g = paint(clay(geo, opts), color, opts);
  const m = new THREE.Mesh(g, clayMat(opts.mat));
  m.castShadow = m.receiveShadow = true;
  LIVE.add(g);
  return m;
}
/** re-sculpt every clay surface that is on screen, for exposure `frame` */
export function boilAll(root, frame) {
  root.traverse((o) => {
    const g = o.geometry;
    if (o.visible !== false && g && g.userData.clay && g.userData.clay.boil) {
      if (g.userData.lastFrame === frame) return;
      g.userData.lastFrame = frame; sculpt(g, frame);
    }
  });
}

// ── clay letters ─────────────────────────────────────────────────────────
const fonts = {};
export async function loadFont(name, url) {
  const json = await new Promise((res, rej) => new TTFLoader().load(url, res, undefined, rej));
  fonts[name] = new Font(json);
}
/** rolled-clay letters, one mesh per letter so each can drop and squash */
export function clayText(str, { font = 'Anton', size = 6, depth = 1.6, color = '#ff5a8a', seed = 3, spacing = 0.06 } = {}) {
  const group = new THREE.Group(); const f = fonts[font];
  let x = 0; const letters = [];
  for (const ch of str) {
    if (ch === ' ') { x += size * 0.35; continue; }
    const g = new TextGeometry(ch, { font: f, size, depth, curveSegments: 6, bevelEnabled: true, bevelThickness: size * 0.09, bevelSize: size * 0.06, bevelSegments: 4 });
    g.computeBoundingBox(); const bb = g.boundingBox, w = bb.max.x - bb.min.x;
    g.translate(-bb.min.x - w / 2, 0, -depth / 2);
    const m = lump(g, color, { lump: size * 0.018, freq: 0.5, boil: size * 0.004, seed: seed + letters.length, uvScale: 0.12, mottle: 0.04 });
    m.position.x = x + w / 2; m.userData.w = w;
    group.add(m); letters.push(m); x += w + size * spacing;
  }
  group.userData.width = x - size * spacing;
  for (const l of letters) l.position.x -= group.userData.width / 2;
  group.userData.letters = letters;
  return group;
}
