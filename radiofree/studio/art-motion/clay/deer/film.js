// UNEXPECTEDLY, A DEER — Toko thinker #1, v6: the claymation remake. 37.5 s, 1080×1920.
//
// House clay (the Happy Little Bot kit): a Kallio living room at dusk — sofa,
// a rag rug, a bookshelf with a small white home camera wearing a $20/MO price
// tag, a big window with rain and a green-and-yellow tram going by — and a
// hallway with a mirror. Six shots on a 112 BPM grid (12/12/12/12/12/10 beats),
// half-second dissolves. Puppets are posed ON TWOS (12 poses a second, each
// re-lumping the clay); camera, rain, the tram and the light move every frame.
//
// window.__film.frame(i) renders global frame i of 900; still(k, s) one shot at
// shot-time s; probe(k, s) reports where things land on screen.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { skyPlane, facadeFlat, canvas, tex, dropMaterial } from './lib/city.js';
import { Beast, DOG, CAT, trot, trotAdvance, stance, orient } from './lib/beasts.js';
import { Toko } from './lib/toko.js';
import { HomeCam, priceTag, Phone, smallPhone, Brackets, flag, dogTag } from './lib/props.js';

const RES = Number(new URLSearchParams(location.search).get('res') || 1);
const W = Math.round(1080 * RES), H = Math.round(1920 * RES), FPS = 24, POSE_FPS = 12;
const B = 60 / 112;
const BEATS = [12, 12, 12, 12, 12, 10];
const CUTS = [0]; for (const b of BEATS) CUTS.push(CUTS[CUTS.length - 1] + b * B);   // … 37.5
const XF = 0.5;

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eout = (a, b, x) => 1 - (1 - clamp((x - a) / (b - a))) ** 3;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (A, Bv, k) => (Array.isArray(A) ? A.map((v, i) => lerp(v, Bv[i], k)) : lerp(A, Bv, k));
/** blend two pose objects, recursing into nested ones (legs) */
function blend(A, Bv, k) {
  if (A === undefined) return Bv; if (Bv === undefined) return A;
  if (typeof A === 'number' && typeof Bv === 'number') return lerp(A, Bv, k);
  if (Array.isArray(A) && Array.isArray(Bv)) return A.map((v, i) => lerp(v, Bv[i], k));
  if (typeof A === 'object' && typeof Bv === 'object' && A && Bv) { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(Bv)])) o[key] = blend(A[key], Bv[key], k); return o; }
  return k < 0.5 ? A : Bv;
}
/** a springy settle: 0 → 1 with one overshoot */
const pop = (a, d, x) => { const t = clamp((x - a) / d); if (t <= 0) return 0; return 1 - Math.exp(-6 * t) * Math.cos(t * 9.5) * (1 - t * 0.2); };
const beat = (n) => n * B;
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const V = (a) => new THREE.Vector3(...a);

// ------------------------------------------------------------------ boot
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 4, 1600);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');

// ------------------------------------------------------------------ clays
const clay = (color, o = {}) => surface({ color, wrap: 0.45, wrapTint: '#ffc6a0', rough: 0.6, bump: 1, lump: 0.05, lumpF: 0.5, thumb: 0.035, thumbCell: 2.0, ridge: 0.12, tool: 0.8, grain: 0.004, grainF: 8, mottle: 0.10, specks: 0.6, roughVar: 0.12, ...o });
const HDR = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const TM = {   // Toko
  hoodie: clay('#44546e', { thumbCell: 1.7, thumb: 0.05, tool: 1.4 }),
  hoodie2: clay('#3d4b63', { thumbCell: 1.5, thumb: 0.05, tool: 1.2 }),
  cuff: surface({ surf: 'knit', color: '#4f5867', rough: 0.85, fibre: 0.05, fibreF: 8, knitW: 0.42, knitH: 0.3, knitAxis: [0, 0, 1], lump: 0.02, wrap: 0.4, wrapTint: '#ffc6a0' }),
  jeans: clay('#2f3d58', { thumb: 0.04, tool: 1.1 }),
  shoes: clay('#2c2a2e', { rough: 0.45 }), sole: clay('#e8e1d2', { thumb: 0.02 }),
  glove: clay('#cc1574', { thumbCell: 1.2, thumb: 0.04, tool: 1.0, specks: 0.3, speckColor: '#5a0730' }),
  hair: clay('#8a8278', { tool: 1.8, thumbCell: 0.9, thumb: 0.05 }),
  maskDisc: clay('#e2068e', { rough: 0.62, thumb: 0.03, thumbCell: 1.5, mottle: 0.06, specks: 0.3, speckColor: '#5a0730' }),
  maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.015, thumbCell: 0.9, mottle: 0.04, specks: 0.25 }),
  strap: clay('#2a2523', { thumb: 0.01, rough: 0.5 }),
  string: clay('#e9e2d2', { thumb: 0.01 }), aglet: clay('#cfc6b4', { rough: 0.35, thumb: 0.005 }),
};
const DM = {   // the hound
  coat: clay('#c08048', { thumbCell: 1.3, thumb: 0.045, tool: 1.3, mottle: 0.12 }),
  coatLeg: clay('#bd7d46', { thumbCell: 1.0, thumb: 0.04, tool: 1.1 }),
  ear: clay('#a8693a', { thumbCell: 1.1, thumb: 0.045, tool: 1.4 }),
  saddle: clay('#2b211b', { thumbCell: 1.2, thumb: 0.05, tool: 1.6, specks: 0.3, speckColor: '#6a4a30' }),
  white: clay('#f0e6d4', { thumb: 0.03, thumbCell: 1.0, specks: 0.3 }),
  nose: clay('#151113', { rough: 0.28, thumb: 0.01, mottle: 0.03, specks: 0 }),
  eye: clay('#1c120c', { rough: 0.2, thumb: 0.003, mottle: 0.02, specks: 0 }),
  glint: HDR(2.2, 2.1, 2.0),
  collar: clay('#2a7f7a', { thumb: 0.015, rough: 0.5 }), ring: clay('#c5a35e', { rough: 0.3, metal: 0.4, thumb: 0.005 }),
  antler: clay('#d8c49c', { thumbCell: 0.9, thumb: 0.04, tool: 1.6, ridge: 0.08, specks: 0.5, speckColor: '#7a6040' }),
};
const CM = {   // the tabby
  coat: clay('#9b8a72', { stripe: 0.85, stripeF: 0.62, stripeAxis: [0, 0, 1], stripeColor: '#3a2f26', thumbCell: 1.0, thumb: 0.035, tool: 1.2 }),
  coatLeg: clay('#9b8a72', { stripe: 0.8, stripeF: 0.75, stripeAxis: [0, 1, 0.3], stripeColor: '#3a2f26', thumbCell: 0.9, thumb: 0.035 }),
  white: clay('#ece2cf', { thumb: 0.02 }),
  nose: clay('#d4847f', { rough: 0.35, thumb: 0.005 }), eye: clay('#d0a136', { rough: 0.22, thumb: 0.002, mottle: 0.02, specks: 0 }),
  pupil: clay('#0d0b0a', { rough: 0.15, thumb: 0.001, specks: 0 }), glint: HDR(2.2, 2.1, 2.0),
  inner: clay('#d69c94', { thumb: 0.01 }), whisker: clay('#f1ece0', { thumb: 0.002 }),
};
CM.coat.userData.U.uStripe.value = 0.85;
const PM = {   // props
  white: clay('#ece8df', { rough: 0.38, thumb: 0.012, thumbCell: 1.2, mottle: 0.04, specks: 0.2, noBoil: true }),   // plastic does not boil
  black: clay('#0f1114', { rough: 0.2, thumb: 0.004, mottle: 0.02, specks: 0, noBoil: true }),
  lens: clay('#070910', { rough: 0.08, thumb: 0.001, mottle: 0.0, specks: 0, metal: 0.2, noBoil: true }),
  lensRing: clay('#3a3f47', { rough: 0.3, metal: 0.5, thumb: 0.002 }),
  glint: HDR(2.6, 2.6, 2.8),
  led: HDR(9, 0.4, 0.25),
  ring: clay('#c5a35e', { rough: 0.3, metal: 0.4, thumb: 0.005 }),
  phone: clay('#17191d', { rough: 0.3, thumb: 0.004, mottle: 0.03, specks: 0, noBoil: true }),
  smallScreen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.75, 0.85) }),
  pin: clay('#55575c', { rough: 0.3, metal: 0.6, thumb: 0.002 }), pinHead: clay('#f2ede2', { rough: 0.3, thumb: 0.004 }),
  card: surface({ color: '#ff4a2a', emissive: '#ff4a2a', emissiveIntensity: 0.35, rough: 0.8, lump: 0.01, thumb: 0.004, grain: 0.012, grainF: 14, mottle: 0.08, specks: 0.3, speckColor: '#8a2010' }),
};
const S = {   // the set
  wall: surface({ color: '#ffffff', rough: 0.9, lump: 0.02, thumb: 0.006, thumbCell: 3, grain: 0.004, mottle: 0.12, noBoil: true }),
  hallWall: surface({ color: '#ffffff', rough: 0.9, lump: 0.02, thumb: 0.006, thumbCell: 3, grain: 0.004, mottle: 0.12, noBoil: true }),
  trim: clay('#e4dccb', { lump: 0.03, thumb: 0.025, thumbCell: 2.4, mottle: 0.06, rough: 0.55, specks: 0.6, noBoil: true }),
  floor: surface({ color: '#ffffff', rough: 0.55, lump: 0.02, thumb: 0.01, thumbCell: 3, grain: 0.006, grainF: 6, mottle: 0.1, specks: 0, noBoil: true }),
  sofa: clay('#b9892f', { thumbCell: 2.4, thumb: 0.04, tool: 1.1, noBoil: true }),
  sofa2: clay('#c39437', { thumbCell: 2.0, thumb: 0.045, tool: 1.2 }),
  pillowA: clay('#2f6f6a', { thumbCell: 1.6, thumb: 0.045, tool: 1.2 }), pillowB: clay('#a2482c', { thumbCell: 1.6, thumb: 0.045, tool: 1.2 }),
  wood: clay('#5a3a22', { thumbCell: 2.6, tool: 1.3, ridge: 0.16, rough: 0.6, noBoil: true }),
  woodL: clay('#7b5432', { thumbCell: 2.2, tool: 1.4, ridge: 0.16, rough: 0.6, noBoil: true }),
  rug: surface({ surf: 'felt', color: '#ffffff', rough: 0.95, fibre: 0.05, fibreF: 7, lump: 0.05, lumpF: 0.4, mottle: 0.08, noBoil: true }),
  fringe: clay('#e8e0cc', { thumb: 0.01 }),
  pouf: surface({ surf: 'knit', color: '#8f8270', rough: 0.9, fibre: 0.07, fibreF: 6, knitW: 0.9, knitH: 0.7, knitAxis: [0, 1, 0], lump: 0.05, wrap: 0.4, wrapTint: '#ffc6a0' }),
  lampBase: clay('#2f3a34', { rough: 0.45, noBoil: true }),
  shade: surface({ color: '#f2d29a', rough: 0.9, lump: 0.01, thumb: 0.004, grain: 0.01, grainF: 20, side: THREE.DoubleSide }),
  pot: clay('#b5603c', { rough: 0.7 }), leaf: clay('#3f6b3a', { tool: 1.0, thumbCell: 1.2 }), bloom: clay('#d23c3c', { thumb: 0.02 }),
  books: ['#7a3a2a', '#2e4a5e', '#b89a52', '#3c5a3e', '#d8cdb4', '#5c4a6a', '#a8623a', '#2a2e3a', '#8a8a6a', '#c4a06a'].map((c, i) => clay(c, { thumb: 0.02, thumbCell: 1.5, tool: 0.8, seed: i * 3.1, noBoil: true })),
  frameDark: clay('#3c2a1e', { thumbCell: 1.8, tool: 1.4, rough: 0.5, noBoil: true }),
  coat: clay('#7a3a2a', { thumbCell: 2.0, thumb: 0.05, tool: 1.4 }),
  scarf: surface({ surf: 'knit', color: '#2f6f6a', rough: 0.9, fibre: 0.05, fibreF: 7, knitW: 0.5, knitH: 0.4, knitAxis: [0, 1, 0], wrap: 0.4 }),
  hook: clay('#b8a070', { rough: 0.3, metal: 0.5, thumb: 0.005 }),
  tramGreen: clay('#2f7d43', { rough: 0.5, thumb: 0.02, noBoil: true }), tramYellow: clay('#e8bf3a', { rough: 0.5, thumb: 0.02, noBoil: true }),
  tramRoof: clay('#5b6a5e', { rough: 0.6, noBoil: true }),
};
S.shade.userData.U.uGlow.value.set(0.95, 0.52, 0.2); S.shade.userData.U.uGlowPow.value = 0.6;

/** a canvas texture painted once, tiled at `period` cm in a set's own (x, y) or uv units */
function paintTex(w, h, fn, rx = 1, ry = 1) { const c = canvas(w, h); fn(c.getContext('2d'), w, h); const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; }
// wallpaper: Kallio green, a quiet stripe with a small leaf sprig between the stripes
const wallTex = paintTex(512, 512, (g, w, h) => {
  g.fillStyle = '#56685a'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.fillStyle = '#4e5f52'; g.fillRect(x, 0, 52, h); g.fillStyle = 'rgba(230,220,190,0.10)'; g.fillRect(x + 52, 0, 4, h); }
  g.fillStyle = 'rgba(225,210,170,0.16)';
  for (let y = 32; y < h; y += 128) for (let x = 90; x < w; x += 128) { g.beginPath(); g.ellipse(x, y, 7, 15, 0.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + 10, y + 26, 6, 13, -0.5, 0, Math.PI * 2); g.fill(); }
});
wallTex.repeat.set(1 / 40, 1 / 40);
S.wall.map = wallTex;
const hallTex = paintTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b48d5a'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < w; x += 64) { g.fillStyle = 'rgba(90,60,30,0.14)'; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
});
hallTex.repeat.set(1 / 30, 1 / 30);
S.hallWall.map = hallTex;
// herringbone parquet
const floorTex = paintTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#5e3c22'; g.fillRect(0, 0, w, h);
  const r = rng(12), L = 128, Wd = 32;
  const tones = ['#9a683c', '#8d5f37', '#a57444', '#91653b', '#82572f'];
  for (let row = -4; row < 40; row++) for (let col = -4; col < 40; col++) {
    const x0 = col * Wd * 2 + row * Wd, y0 = row * Wd * 2 - col * 0 ;
    for (const d of [0, 1]) {
      g.save(); g.translate(x0 + d * Wd, y0 + d * Wd); g.rotate(d ? -Math.PI / 4 : Math.PI / 4);
      g.fillStyle = tones[(r() * tones.length) | 0]; g.fillRect(0, 0, L * 0.98, Wd * 0.94);
      g.fillStyle = 'rgba(40,20,10,0.10)'; for (let i = 0; i < 6; i++) g.fillRect(r() * L, r() * Wd, L * 0.3 * r(), 1.2);
      g.restore();
    }
  }
});
floorTex.repeat.set(10, 8);
S.floor.map = floorTex;
S.floorHall = surface({ color: '#ffffff', rough: 0.55, lump: 0.02, thumb: 0.01, thumbCell: 3, grain: 0.006, grainF: 6, mottle: 0.1, specks: 0, noBoil: true });
const floorTexH = floorTex.clone(); floorTexH.repeat.set(6.5, 5); floorTexH.needsUpdate = true; S.floorHall.map = floorTexH;
// the rag rug: a Finnish räsymatto, woven bands across its length
const RUG_W = 60, RUG_D = 32;
const rugTex = paintTex(1024, 512, (g, w, h) => {
  const bands = [['#d9d0bc', 70], ['#2f4a7a', 22], ['#d9d0bc', 18], ['#b5462e', 14], ['#d9d0bc', 18], ['#2f4a7a', 22], ['#8a9aa8', 40], ['#d9d0bc', 26], ['#b5462e', 30], ['#d9d0bc', 26], ['#8a9aa8', 40], ['#2f4a7a', 22], ['#d9d0bc', 18], ['#b5462e', 14], ['#d9d0bc', 18], ['#2f4a7a', 22], ['#d9d0bc', 70]];
  const tot = bands.reduce((a, b) => a + b[1], 0); let x = 0; const r = rng(4);
  for (const [c, bw] of bands) { const ww = bw / tot * w; g.fillStyle = c; g.fillRect(x, 0, ww + 1, h); x += ww; }
  // rag weft: short streaks of lighter and darker cloth
  for (let i = 0; i < 9000; i++) { const xx = r() * w, yy = r() * h; g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)'; g.fillRect(xx, yy, 2 + r() * 5, 1.5 + r() * 2); }
  for (let y = 0; y < h; y += 7) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, w, 1.5); }
});
rugTex.wrapS = rugTex.wrapT = THREE.ClampToEdgeWrapping; rugTex.repeat.set(1, 1);
S.rug.map = rugTex;
for (const m of [S.wall, S.hallWall, S.floor, S.floorHall, S.rug]) m.needsUpdate = true;

// ------------------------------------------------------------------ the living room
const WALLZ = -30, WT = 9;                         // back wall's front face, its thickness
const WX0 = -31, WX1 = 7, WY0 = 25, WY1 = 71;     // the window
const GZ = WALLZ - 5;                              // the glass sits in the reveal
{
  const sh = new THREE.Shape([[-140, -2], [140, -2], [140, 120], [-140, 120]].map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path([[WX0, WY0], [WX0, WY1], [WX1, WY1], [WX1, WY0]].map(([x, y]) => new THREE.Vector2(x, y))));
  mesh(new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false, curveSegments: 1 }), S.wall, { pos: [0, 0, WALLZ - WT], parent: scene });
  // the side wall at the left, for when a camera swings
  mesh(new THREE.PlaneGeometry(200, 120).rotateY(Math.PI / 2), S.wall, { pos: [-82, 58, 60], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(280, 4.5, 1.6, 2, 0.5), 0.05, 0.4, 301), S.trim, { pos: [0, 2.25, WALLZ + 0.8], parent: scene });   // skirting
  mesh(lumpy(new RoundedBoxGeometry(280, 2.2, 1.6, 2, 0.5), 0.05, 0.4, 302), S.trim, { pos: [0, 92, WALLZ + 0.8], parent: scene });   // picture rail
}
mesh(new THREE.PlaneGeometry(500, 400).rotateX(-Math.PI / 2), S.floor, { pos: [0, 0, 60], parent: scene });
// window: white-painted casements set in the reveal, a transom, a deep sill
const winBar = (x, y, w, h, d = 1.6, seed = 310) => mesh(lumpy(new RoundedBoxGeometry(w, h, d, 2, 0.4), 0.05, 0.5, seed), S.trim, { pos: [x, y, GZ + 0.5], parent: scene });
winBar((WX0 + WX1) / 2, WY1 - 1.0, WX1 - WX0, 2.0, 1.8, 311); winBar((WX0 + WX1) / 2, WY0 + 1.0, WX1 - WX0, 2.0, 1.8, 312);
winBar(WX0 + 1.0, (WY0 + WY1) / 2, 2.0, WY1 - WY0, 1.8, 313); winBar(WX1 - 1.0, (WY0 + WY1) / 2, 2.0, WY1 - WY0, 1.8, 314);
winBar((WX0 + WX1) / 2, (WY0 + WY1) / 2, 1.6, WY1 - WY0, 1.6, 315); winBar((WX0 + WX1) / 2, 59, WX1 - WX0, 1.5, 1.6, 316);
for (const x of [WX0 + 9.5, WX1 - 9.5]) winBar(x, (WY0 + 59) / 2, 0.9, 59 - WY0, 1.2, 317 + x);   // the casements' own bars
mesh(lumpy(new RoundedBoxGeometry(WX1 - WX0 + 6, 1.4, WT + 3.5, 2, 0.5), 0.05, 0.4, 320), S.trim, { pos: [(WX0 + WX1) / 2, WY0 - 0.6, WALLZ - WT / 2 + 1.6], parent: scene });
// a pelargonium on the sill
{
  const g = new THREE.Group(); g.position.set(WX0 + 6, WY0, WALLZ - 2.5); scene.add(g);
  mesh(lumpy(lathe([[0.01, 0], [1.9, 0], [2.5, 3.6], [2.7, 3.9], [0.01, 3.9]], 32), 0.05, 0.8, 330), S.pot, { parent: g });
  const r = rng(31);
  for (let i = 0; i < 9; i++) { const a = r() * 6.28, h = 4.5 + r() * 3; mesh(lumpy(ball(1.3 + r() * 0.5, 1.2, 0.5, 1.0), 0.08, 0.8, 331 + i), S.leaf, { pos: [Math.cos(a) * 1.8, h, Math.sin(a) * 1.2], rot: [r() - 0.5, a, 0.4], parent: g }); }
  for (let i = 0; i < 3; i++) mesh(lumpy(ball(0.9, 1, 0.8, 1), 0.1, 1, 340 + i), S.bloom, { pos: [-1 + i * 1.1, 9 + r() * 1.5, 0.5 * (r() - 0.5)], parent: g });
}
// the sofa, mustard, under the window
const SOFA = { x0: -35, x1: 7, seat: 10.5, z0: WALLZ + 1, z1: WALLZ + 20 };
{
  const { x0, x1, seat, z0, z1 } = SOFA, cx = (x0 + x1) / 2;
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 6, z1 - z0, 3, 1.2), 0.12, 0.35, 350), S.sofa, { pos: [cx, 4.4, (z0 + z1) / 2], parent: scene });
  for (const k of [0, 1]) mesh(lumpy(new RoundedBoxGeometry((x1 - x0 - 9) / 2 - 0.3, 3.6, z1 - z0 - 5, 4, 1.4), 0.14, 0.4, 351 + k), S.sofa2, { pos: [x0 + 4.5 + (k + 0.5) * (x1 - x0 - 9) / 2, seat - 1.6, z0 + 4.8 + (z1 - z0 - 5) / 2 - 0.3], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 12, 5, 3, 1.6), 0.12, 0.35, 353), S.sofa, { pos: [cx, 14.5, z0 + 2.4], parent: scene });
  for (const k of [0, 1]) mesh(lumpy(new RoundedBoxGeometry((x1 - x0 - 9) / 2 - 0.4, 9, 4.2, 4, 1.6), 0.15, 0.4, 354 + k), S.sofa2, { pos: [x0 + 4.5 + (k + 0.5) * (x1 - x0 - 9) / 2, 15.2, z0 + 6.6], rot: [-0.12, 0, 0], parent: scene });
  for (const s of [-1, 1]) mesh(lumpy(new RoundedBoxGeometry(4.6, 14, z1 - z0, 3, 1.8), 0.12, 0.35, 356 + s), S.sofa, { pos: [s < 0 ? x0 + 2.3 : x1 - 2.3, 8.5, (z0 + z1) / 2], parent: scene });
  for (const [x, z] of [[x0 + 2, z0 + 2], [x1 - 2, z0 + 2], [x0 + 2, z1 - 2], [x1 - 2, z1 - 2]]) mesh(new THREE.CylinderGeometry(0.7, 0.45, 1.5, 10), S.wood, { pos: [x, 0.75, z], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(8.5, 7.5, 2.6, 4, 1.2), 0.16, 0.5, 358), S.pillowA, { pos: [x0 + 8, seat + 3.6, z0 + 9.5], rot: [-0.2, 0.25, 0.12], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(7.5, 7, 2.6, 4, 1.2), 0.16, 0.5, 359), S.pillowB, { pos: [x0 + 15, seat + 3.2, z0 + 9.0], rot: [-0.25, -0.1, -0.08], parent: scene });
}
// the floor lamp, left of the sofa
const LAMP = [15, 0, WALLZ + 6.5];
const lamp = new THREE.Group();
{
  mesh(lumpy(lathe([[0.01, 0], [4.2, 0], [4.3, 0.6], [3.2, 1.4], [0.6, 1.8], [0.5, 38], [0.01, 38]], 40), 0.06, 0.4, 360), S.lampBase, { parent: lamp });
  mesh(lumpy(lathe([[4.4, 0], [7.4, 0.2], [7.6, 0.6], [4.8, 8.8], [4.2, 9.0]], 48), 0.12, 0.35, 361), S.shade, { pos: [0, 33, 0], parent: lamp, cast: false });
  lamp.bulb = mesh(new THREE.SphereGeometry(1.5, 16, 12), HDR(9, 5.5, 2.6), { pos: [0, 37.2, 0], parent: lamp, cast: false });
  lamp.position.set(...LAMP); scene.add(lamp);
}
// the bookshelf, and the camera on its middle shelf
const SHELF = { x0: 23, x1: 44, z0: WALLZ, z1: WALLZ + 8, boards: [1.5, 14, 27, 40, 53] };
const CAM_AT = [29.0, 27.6, WALLZ + 5.4];
{
  const { x0, x1, z0, z1, boards } = SHELF, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (const x of [x0 + 0.6, x1 - 0.6]) mesh(lumpy(new RoundedBoxGeometry(1.3, 54.5, z1 - z0, 2, 0.4), 0.06, 0.4, 370 + x), S.wood, { pos: [x, 27.2, cz], parent: scene });
  boards.forEach((y, i) => mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 1.2, z1 - z0 + 0.4, 2, 0.4), 0.05, 0.4, 375 + i), S.wood, { pos: [cx, y, cz + 0.2], parent: scene }));
  mesh(new THREE.PlaneGeometry(x1 - x0, 54), S.wood, { pos: [cx, 27, z0 + 0.2], parent: scene });
  const r = rng(41);
  boards.slice(0, 4).forEach((y, i) => {
    let x = x0 + 1.5;
    while (x < x1 - 2.5) {
      if (i === 2 && x > CAM_AT[0] - 4.2 && x < CAM_AT[0] + 3.6) { x = CAM_AT[0] + 3.8; continue; }   // room for the camera
      const bw = 1.1 + r() * 1.3, bh = 7.5 + r() * 3.2, lean = r() < 0.12 ? 0.25 : 0;
      if (r() < 0.07 && i !== 2) { // a short stack lying flat
        for (let k = 0; k < 3; k++) mesh(lumpy(new RoundedBoxGeometry(5.2, 1.2, 5.6, 2, 0.3), 0.04, 0.6, 380 + i * 50 + x + k), S.books[(r() * 10) | 0], { pos: [x + 2.6, y + 1.2 + k * 1.2, cz + 0.6], rot: [0, (r() - 0.5) * 0.2, 0], parent: scene });
        x += 5.6; continue;
      }
      mesh(lumpy(new RoundedBoxGeometry(bw, bh, 5.4 + r(), 2, 0.25), 0.04, 0.6, 400 + i * 50 + x), S.books[(r() * 10) | 0], { pos: [x + bw / 2, y + 0.6 + bh / 2, cz + 0.5], rot: [0, 0, lean], parent: scene });
      x += bw + 0.08;
    }
  });
  // a little plant and a jug on top
  mesh(lumpy(lathe([[0.01, 0], [1.6, 0], [2.0, 2.8], [0.01, 2.8]], 24), 0.04, 0.8, 470), S.pot, { pos: [x1 - 5, 53.6, cz + 0.5], parent: scene });
  for (let i = 0; i < 6; i++) mesh(lumpy(sausage([[0, 2.6, 0], [Math.cos(i) * 1.5, 5, Math.sin(i) * 1.2], [Math.cos(i) * 3, 4.4 + (i % 2), Math.sin(i) * 2.4]], [0.35, 0.3, 0.2], { seg: 10, steps: 16 }), 0.04, 1, 471 + i), S.leaf, { pos: [x1 - 5, 53.6, cz + 0.5], parent: scene });
}
const CAM_S = 1.3;
const homeCam = new HomeCam(PM); homeCam.group.position.set(...CAM_AT); homeCam.group.scale.setScalar(CAM_S); scene.add(homeCam.group);
const tagPivot = new THREE.Group(); tagPivot.position.set(CAM_AT[0] + 0.25, SHELF.boards[2] + 0.55, SHELF.z1 + 0.7); scene.add(tagPivot);
const tag = priceTag(PM); tag.position.set(0, -0.15, 0); tag.scale.setScalar(1.15); tagPivot.add(tag);
const tagString = mesh(new THREE.BufferGeometry(), TM.string, { parent: scene, cast: false });
tagString.geometry = sausage([add3(CAM_AT, [0.45, 1.3, 0.4]), add3(CAM_AT, [0.5, 0.5, 2.1]), [tagPivot.position.x, tagPivot.position.y + 0.35, tagPivot.position.z - 0.35], [tagPivot.position.x, tagPivot.position.y, tagPivot.position.z]], [0.08, 0.08, 0.08, 0.08], { seg: 6, steps: 20, capSteps: 2 });
const tagDrop = mesh(new THREE.BufferGeometry(), TM.string, { parent: tagPivot, cast: false });
tagDrop.geometry = sausage([[0, 0, 0], [0, -0.45, 0.02], [0, -0.85, 0.04]], [0.07, 0.07, 0.07], { seg: 6, steps: 8, capSteps: 2 });
// the rug, and its fringe
const RUG = [0, 0, 4];
{
  const g = new THREE.Group(); g.position.set(...RUG); scene.add(g);
  const geo = new RoundedBoxGeometry(RUG_W, 0.7, RUG_D, 2, 0.3);
  // RoundedBox UVs are per-face; remap the top so the bands run across the rug's length
  const P = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) uv.setXY(i, P.getX(i) / RUG_W + 0.5, P.getZ(i) / RUG_D + 0.5);
  mesh(geo, S.rug, { pos: [0, 0.35, 0], parent: g, cast: false });
  for (const s of [-1, 1]) for (let i = 0; i < 18; i++) mesh(lumpy(sausage([[s * RUG_W / 2, 0.3, -RUG_D / 2 + 1 + i * (RUG_D - 2) / 17], [s * (RUG_W / 2 + 1.2), 0.25, -RUG_D / 2 + 1 + i * (RUG_D - 2) / 17 + 0.2], [s * (RUG_W / 2 + 2.2), 0.22, -RUG_D / 2 + 1 + i * (RUG_D - 2) / 17 + (hash(i + s) - 0.5) * 0.6]], [0.28, 0.24, 0.2], { seg: 6, steps: 8, capSteps: 2 }), 0.03, 1, 480 + i + s * 20), S.fringe, { parent: g, cast: false });
}
// the knitted pouf where Toko sits to check the dog
const POUF = [13, 0, -2];
const pouf = mesh(lumpy(lathe([[0.01, 0], [6.6, 0.2], [7.4, 2.6], [7.5, 5.5], [7.0, 8.4], [5.4, 9.3], [0.01, 9.5]], 40), 0.18, 0.4, 490), S.pouf, { pos: POUF, parent: scene });

// ------------------------------------------------------------------ outside: Kallio at dusk, a tram in the rain
const out = new THREE.Group(); scene.add(out);
const skyDusk = skyPlane(700, 260, [[0, '#0d1a36'], [0.35, '#253b66'], [0.6, '#5a5f80'], [0.78, '#a67a6e'], [0.9, '#d38e58'], [1, '#6a4430']], { pos: [0, 90, -420] });
const skyNight = skyPlane(700, 260, [[0, '#050913'], [0.4, '#0b1426'], [0.75, '#16203a'], [0.9, '#2a2a3a'], [1, '#1c1a20']], { pos: [0, 90, -419] });
out.add(skyDusk, skyNight);
let facFar, facNear;
{
  facFar = facadeFlat({ w: 420, h: 110, px: 6, seed: 11, wall: ['#2a3350', '#2e3753', '#283049'], frame: '#1a2030', lit: ['#ffcf7a'], litP: 0.14, dark: '#1e2437', winW: 2.2, winH: 3.2, winGapX: 3.0, winGapY: 3.4, blockW: 34, topMin: 0.32, topVar: 0.18, glow: 1.6,
    extra: (g, ge, Wd, Hd) => {   // Kallio church: the granite tower and its steep cap, on the skyline
      const cx = Wd * 0.43, base = Hd * 0.45, s = 6;
      g.fillStyle = '#3a4258';
      g.beginPath(); g.moveTo(cx - 9 * s, base); g.lineTo(cx - 9 * s, base - 46 * s); g.lineTo(cx - 6 * s, base - 50 * s); g.lineTo(cx, base - 66 * s); g.lineTo(cx + 6 * s, base - 50 * s); g.lineTo(cx + 9 * s, base - 46 * s); g.lineTo(cx + 9 * s, base); g.closePath(); g.fill();
      g.fillStyle = '#ffd38a'; ge.fillStyle = '#ffd38a'; for (const y of [30, 38]) { g.fillRect(cx - 1.5 * s, base - y * s, 3 * s, 4 * s); ge.fillRect(cx - 1.5 * s, base - y * s, 3 * s, 4 * s); }
    } });
  facFar.position.set(0, 50, -330); out.add(facFar);
  facNear = facadeFlat({ w: 360, h: 80, px: 7, seed: 23, wall: ['#5a4a3c', '#4f4440', '#66503e', '#5c5a52'], frame: '#2a2322', lit: ['#ffc366', '#ffdb94', '#ff9f5a'], litP: 0.4, dark: '#2c2a30', winW: 5.5, winH: 8.5, winGapX: 5.5, winGapY: 6.0, blockW: 48, topMin: 0.08, topVar: 0.16, glow: 2.4, roofs: true });
  facNear.position.set(0, 44, -190); out.add(facNear);
  // the street and its wet shine
  mesh(new THREE.PlaneGeometry(500, 90).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#141518' }), { pos: [0, 24, -140], parent: out, cast: false, recv: false });
  const shine = paintTex(256, 64, (g, w, h) => { for (let i = 0; i < 60; i++) { const x = Math.random() * w; g.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},120,${0.15 + Math.random() * 0.25})`; g.fillRect(x, 0, 1 + Math.random() * 3, h); } });
  mesh(new THREE.PlaneGeometry(500, 60).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shine, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), { pos: [0, 24.1, -150], parent: out, cast: false, recv: false });
  const wire = new THREE.MeshBasicMaterial({ color: '#07090d' });
  for (const y of [57, 55.5]) out.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-260, y, -112), new THREE.Vector3(260, y - 1, -112)), 2, 0.12, 4), wire));
  for (const x of [-70, 60]) out.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 50, 6), wire).translateX(x).translateY(48).translateZ(-150));
}
// the tram: green below, yellow above, a lit window band
const tram = new THREE.Group(); out.add(tram);
const TRAM_Z = -112, TRAM_Y = 24.5;
{
  const L = 118, Hb = 19;
  mesh(new RoundedBoxGeometry(L, Hb * 0.48, 11, 3, 1.5), S.tramGreen, { pos: [0, Hb * 0.24 + 1.2, 0], parent: tram, recv: false });
  mesh(new RoundedBoxGeometry(L, Hb * 0.42, 10.6, 3, 1.5), S.tramYellow, { pos: [0, Hb * 0.68 + 1.2, 0], parent: tram, recv: false });
  mesh(new RoundedBoxGeometry(L - 4, 2.2, 9.6, 3, 1.0), S.tramRoof, { pos: [0, Hb + 2.0, 0], parent: tram, recv: false });
  const wc = canvas(1024, 64), g = wc.getContext('2d');
  g.fillStyle = '#1a1712'; g.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 16; i++) { const x = 14 + i * 63; g.fillStyle = '#ffd99a'; g.fillRect(x, 6, 52, 52); g.fillStyle = 'rgba(60,40,30,0.75)'; if (hash(i) > 0.45) { g.beginPath(); g.arc(x + 26, 46, 13, Math.PI, 0); g.fill(); g.beginPath(); g.arc(x + 26, 27, 7, 0, 7); g.fill(); } }
  const wt = tex(wc);
  mesh(new THREE.PlaneGeometry(L - 6, Hb * 0.3), new THREE.MeshBasicMaterial({ map: wt, color: new THREE.Color(2.2, 2.0, 1.7) }), { pos: [0, Hb * 0.66 + 1.2, 5.45], parent: tram, cast: false, recv: false });
  mesh(new THREE.PlaneGeometry(4, 4), HDR(6, 5.2, 3.2), { pos: [L / 2 + 0.05, Hb * 0.35, 3.0], rot: [0, Math.PI / 2, 0], parent: tram, cast: false, recv: false });   // headlamp
  mesh(sausage([[-10, Hb + 3, 0], [-4, Hb + 9, 0], [4, Hb + 11, 0]], [0.25, 0.25, 0.25], { seg: 6, steps: 12 }), new THREE.MeshBasicMaterial({ color: '#0a0b0e' }), { parent: tram, cast: false, recv: false });   // pantograph
  for (const x of [-L * 0.3, L * 0.3]) mesh(new THREE.CylinderGeometry(2.6, 2.6, 11.6, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#0d0e10' }), { pos: [x, 1.3, 0], parent: tram, cast: false, recv: false });
  tram.position.set(-400, TRAM_Y, TRAM_Z);
}
// rain in the street, falling every frame
const RAIN_N = 1100, rainBox = [-90, 90, 20, 120, -170, -40], RAIN_SPEED = 60, rainSeeds = [];
const rain = (() => {
  const geo = new THREE.CylinderGeometry(0.06, 0.06, 5.5, 4, 1);
  const mat = new THREE.MeshBasicMaterial({ color: '#9fb8d8', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const im = new THREE.InstancedMesh(geo, mat, RAIN_N); const r = rng(3);
  for (let i = 0; i < RAIN_N; i++) rainSeeds.push([rainBox[0] + r() * (rainBox[1] - rainBox[0]), r(), rainBox[4] + r() * (rainBox[5] - rainBox[4]), 0.6 + r() * 0.8, 0.85 + r() * 0.3]);
  im.frustumCulled = false; out.add(im); return im;
})();
function rainAt(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.1)), sc = new THREE.Vector3();
  const span = rainBox[3] - rainBox[2];
  rainSeeds.forEach(([x, y0, z, l, sp], i) => {
    const y = rainBox[3] - (((y0 * span + t * RAIN_SPEED * sp) % span) + span) % span;
    sc.set(1, l, 1); m.compose(new THREE.Vector3(x - (rainBox[3] - y) * 0.1, y, z), q, sc); rain.setMatrixAt(i, m);
  });
  rain.instanceMatrix.needsUpdate = true;
}
// drops on the glass, a few of them running
const dropMat = dropMaterial({ sky: '#6e83ad', dark: '#110f15', glint: '#ffd7a0', lightDir: [-0.8, 0.4, 0.9], glintAmt: 3, opacity: 0.8 });
const DROP_N = 70, runners = [];
const drops = (() => {
  const r = rng(17), geo = new THREE.SphereGeometry(1, 20, 12); geo.scale(1, 1.08, 0.5);
  const im = new THREE.InstancedMesh(geo, dropMat, DROP_N + 10), m = new THREE.Matrix4();
  for (let i = 0; i < DROP_N; i++) { const x = WX0 + 2.5 + r() * (WX1 - WX0 - 5), y = WY0 + 2.5 + r() * (WY1 - WY0 - 5), s = 0.2 + r() * r() * r() * 0.8; m.compose(new THREE.Vector3(x, y, GZ - 0.2), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m); }
  for (let i = 0; i < 10; i++) runners.push({ x: WX0 + 3 + r() * (WX1 - WX0 - 6), y0: WY1 - 4 - r() * 10, v: 2.5 + r() * 4, s: 0.42 + r() * 0.3, ph: r() * 20 });
  im.frustumCulled = false; scene.add(im); return im;
})();
const runMat = new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', roughness: 0.08, transparent: true, opacity: 0.14 });
const trails = runners.map(() => { const m = new THREE.Mesh(new THREE.BufferGeometry(), runMat); m.frustumCulled = false; scene.add(m); return m; });
function dropsAt(t) {
  const m = new THREE.Matrix4();
  runners.forEach((d, i) => {
    const span = WY1 - WY0 - 6, travel = ((d.ph + t * d.v) % (span + 12));
    const y = d.y0 - travel + 4, s = d.s;
    m.compose(new THREE.Vector3(d.x + Math.sin(y * 0.4) * 0.3, y, GZ - 0.25), new THREE.Quaternion(), new THREE.Vector3(s, s * 1.35, s));
    drops.setMatrixAt(DROP_N + i, m);
    const L = Math.min(travel, 9), pts = [];
    for (let k = 0; k <= 5; k++) pts.push([d.x + Math.sin((y + L * k / 5) * 0.4) * 0.3, y + 0.6 + L * k / 5, GZ - 0.2]);
    trails[i].geometry.dispose();
    trails[i].geometry = L > 0.8 ? sausage(pts, [0.3, 0.18, 0.14, 0.1], { seg: 8, steps: 16, flat: 0.45, up: [0, 0, 1], capSteps: 3 }) : new THREE.BufferGeometry();
  });
  drops.instanceMatrix.needsUpdate = true;
}
{
  const c = canvas(256, 512), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 512, 0, 300); gr.addColorStop(0, 'rgba(200,215,235,0.22)'); gr.addColorStop(1, 'rgba(200,215,235,0)');
  g.fillStyle = gr; g.fillRect(0, 300, 256, 212);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WX1 - WX0, WY1 - WY0), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glass.position.set((WX0 + WX1) / 2, (WY0 + WY1) / 2, GZ - 0.05); scene.add(glass);
}

// ------------------------------------------------------------------ the hallway (shot 5), and the room in its mirror
const HX = 320, HZ = WALLZ;                          // hallway wall front face
const MX0 = HX - 12, MX1 = HX + 12, MY0 = 7, MY1 = 66;
const mirrorWorld = new THREE.Group(); mirrorWorld.scale.set(1, 1, -1); mirrorWorld.position.set(0, 0, 2 * HZ); scene.add(mirrorWorld);
{
  const sh = new THREE.Shape([[HX - 120, -2], [HX + 120, -2], [HX + 120, 120], [HX - 120, 120]].map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path([[MX0, MY0], [MX0, MY1], [MX1, MY1], [MX1, MY0]].map(([x, y]) => new THREE.Vector2(x, y))));
  mesh(new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false, curveSegments: 1 }), S.hallWall, { pos: [0, 0, HZ - 6], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(240, 4.5, 1.6, 2, 0.5), 0.05, 0.4, 501), S.trim, { pos: [HX, 2.25, HZ + 0.8], parent: scene });
  // the mirror's frame: dark wood, chunky
  const fb = (x, y, w, h, s) => mesh(lumpy(new RoundedBoxGeometry(w, h, 2.6, 3, 0.8), 0.07, 0.5, s), S.frameDark, { pos: [x, y, HZ + 1.0], parent: scene });
  fb(HX, MY1 + 1.3, MX1 - MX0 + 5.2, 2.6, 502); fb(HX, MY0 - 1.3, MX1 - MX0 + 5.2, 2.6, 503);
  fb(MX0 - 1.3, (MY0 + MY1) / 2, 2.6, MY1 - MY0 + 5.2, 504); fb(MX1 + 1.3, (MY0 + MY1) / 2, 2.6, MY1 - MY0 + 5.2, 505);
  // the glass: a faint cool sheen with two soft streaks, so it reads as a mirror and not a hole
  const c = canvas(128, 512), g = c.getContext('2d');
  g.fillStyle = 'rgba(160,190,210,0.10)'; g.fillRect(0, 0, 128, 512);
  for (const [x, w] of [[22, 16], [48, 6]]) { const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.save(); g.translate(0, 0); g.transform(1, 0, -0.35, 1, 0, 0); g.fillStyle = gr; g.fillRect(x, 0, w, 512); g.restore(); }
  mesh(new THREE.PlaneGeometry(MX1 - MX0, MY1 - MY0), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { pos: [HX, (MY0 + MY1) / 2, HZ - 0.3], parent: scene, cast: false, recv: false });
  mesh(new THREE.PlaneGeometry(MX1 - MX0, MY1 - MY0), new THREE.MeshBasicMaterial({ color: '#0a0d14', transparent: true, opacity: 0.16, depthWrite: false }), { pos: [HX, (MY0 + MY1) / 2, HZ - 0.35], parent: scene, cast: false, recv: false });
  // the floor in front, a runner along the wall
  mesh(new THREE.PlaneGeometry(260, 200).rotateX(-Math.PI / 2), S.floorHall, { pos: [HX, 0.02, HZ + 90], parent: scene });
  const runner = (parent) => { const geo = new RoundedBoxGeometry(150, 0.6, 20, 2, 0.25); const P = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < P.count; i++) uv.setXY(i, P.getZ(i) / 20 + 0.5, P.getX(i) / 150 + 0.5); return mesh(geo, S.rug, { pos: [HX, 0.32, HZ + 15], parent, cast: false }); };
  runner(scene);
  // hooks to the right with a coat and a scarf; a pair of trainers by the wall
  for (const x of [HX + 24, HX + 31, HX + 38]) mesh(lumpy(sausage([[x, 58, HZ + 0.2], [x, 58, HZ + 2.2], [x, 59.5, HZ + 3.0]], [0.3, 0.3, 0.3], { seg: 8, steps: 10 }), 0.02, 1, 510 + x), S.hook, { parent: scene });
  mesh(lumpy(sausage([[HX + 31, 59, HZ + 2.5], [HX + 30, 50, HZ + 3.6], [HX + 29.5, 36, HZ + 4.2], [HX + 30, 26, HZ + 4.0]], [[2.6, 1.6], [4.6, 2.2], [5.6, 2.4], [5.8, 2.2]], { up: [0, 0, 1], steps: 60 }), 0.22, 0.3, 520), S.coat, { parent: scene });
  mesh(lumpy(sausage([[HX + 38, 59, HZ + 2.6], [HX + 38.6, 48, HZ + 3.6], [HX + 38.2, 38, HZ + 3.2]], [1.4, 1.5, 1.5], { up: [0, 0, 1] }), 0.1, 0.5, 521), S.scarf, { parent: scene });
  for (const s of [0, 1]) { mesh(lumpy(ball(1.85, 1.0, 0.72, 1.55), 0.07, 0.6, 530 + s), TM.shoes, { pos: [HX - 38 + s * 4.5, 1.6, HZ + 6 + s], rot: [0, 0.3, 0], parent: scene }); mesh(lumpy(ball(2.0, 1.0, 0.3, 1.62), 0.04, 0.7, 532 + s), TM.sole, { pos: [HX - 38 + s * 4.5, 0.75, HZ + 6.1 + s], rot: [0, 0.3, 0], parent: scene }); }
  // THE MIRROR'S ROOM: what the glass shows — the floor and runner again, the far wall with
  // the warm doorway to the living room, built in a mirrored group behind the wall
  mesh(new THREE.PlaneGeometry(260, 200).rotateX(-Math.PI / 2), S.floorHall, { pos: [HX, 0.02, HZ + 90], parent: mirrorWorld });
  runner(mirrorWorld);
  const farZ = HZ + 150;
  mesh(new THREE.PlaneGeometry(260, 120).rotateY(Math.PI), S.hallWall, { pos: [HX, 60, farZ], parent: mirrorWorld });
  mesh(new THREE.PlaneGeometry(26, 62).rotateY(Math.PI), HDR(1.6, 1.0, 0.5), { pos: [HX + 6, 31, farZ - 0.2], parent: mirrorWorld, cast: false });   // the lit doorway
  mesh(new THREE.PlaneGeometry(260, 200).rotateX(Math.PI / 2), S.hallWall, { pos: [HX, 100, HZ + 90], parent: mirrorWorld });
}

// ------------------------------------------------------------------ puppets
const toko = new Toko(TM); scene.add(toko.group);
const dog = new Beast(DM, DOG, { seed: 0 }); scene.add(dog.group);
const mirrorDog = new Beast(DM, DOG, { antlers: true, seed: 0 }); mirrorWorld.add(mirrorDog.group);
const cat = new Beast(CM, CAT, { seed: 7, lump: 0.1, lumpF: 0.6 }); scene.add(cat.group);
const mirrorCat = new Beast(CM, CAT, { seed: 7, lump: 0.1, lumpF: 0.6 }); mirrorWorld.add(mirrorCat.group);
const heroPhone = new Phone(PM); scene.add(heroPhone.group);
const puppetPhone = smallPhone(PM); scene.add(puppetPhone);
// the hero glove that holds the hero phone: palm behind, thumb over the left edge, fingertips round the right
const heroHand = new THREE.Group(); heroPhone.group.add(heroHand);
{
  const L = (g, s) => lumpy(g, 0.12, 0.35, s);
  mesh(L(ball(5.0, 1.0, 1.05, 0.55), 600), TM.glove, { pos: [0.6, -5.6, -2.7], parent: heroHand });
  mesh(L(sausage([[-4.3, -10.6, -1.5], [-4.85, -7.8, -0.3], [-4.35, -5.8, 0.75], [-3.55, -4.9, 1.0]], [1.2, 1.1, 1.0, 0.85], { up: [0, 0, 1] }), 601), TM.glove, { parent: heroHand });
  for (let i = 0; i < 4; i++) { const y = -3.0 - i * 1.9; mesh(L(sausage([[2.4, y + 0.3, -2.0], [4.1, y, -1.2], [4.25, y - 0.15, 0.15], [3.55, y - 0.2, 0.62]], [0.9, 0.86, 0.8, 0.72], { up: [0, 0, 1] }), 602 + i), TM.glove, { parent: heroHand }); }
  mesh(L(sausage([[0.5, -9.5, -3.2], [1.5, -14, -4.5], [3.5, -22, -6]], [4.4, 4.6, 5.0], { up: [0, 0, 1] }), 610), TM.hoodie, { parent: heroHand });
  mesh(lumpy(new THREE.TorusGeometry(4.0, 1.3, 14, 36).rotateX(Math.PI / 2 - 0.25), 0.05, 0.6, 611), TM.cuff, { pos: [0.7, -10.2, -3.3], parent: heroHand });
}
// the DOG tag, the camera's brackets and flags
const tagDOG = dogTag(PM); tagDOG.scale.setScalar(1.2); scene.add(tagDOG);
const tagDOGstring = mesh(new THREE.BufferGeometry(), TM.string, { parent: scene, cast: false });
const brackets = new Brackets(PM.card); scene.add(brackets.group);
const FL = { pin: PM.pin, pinHead: PM.pinHead };
const flagDeer = flag('DEER', FL); scene.add(flagDeer);
const mirrorFlags = [0, 1, 2].map(() => { const f = flag('DEER', FL, { side: -1 }); scene.add(f); return f; });
const flagRacc = flag('RACCOON', FL, { h: 2.4, pole: 7.0 }); scene.add(flagRacc);
for (const f of [flagDeer, flagRacc, ...mirrorFlags]) f.traverse(o => { o.castShadow = false; });

// ------------------------------------------------------------------ light
const hemi = new THREE.HemisphereLight('#5d6f9a', '#4a2f1c', 0.4); scene.add(hemi);
const key = new THREE.SpotLight('#ffb878', 20000, 0, 0.95, 0.8, 2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 4; key.shadow.camera.far = 220;
scene.add(key, key.target);
const win = new THREE.DirectionalLight('#8eb0ff', 2.4);
win.castShadow = true; win.shadow.mapSize.set(2048, 2048); win.shadow.radius = 4; win.shadow.bias = -0.0004; win.shadow.normalBias = 0.03;
Object.assign(win.shadow.camera, { left: -70, right: 70, top: 70, bottom: -50, near: 1, far: 400 });
scene.add(win, win.target);
const fill = new THREE.PointLight('#ffd8b0', 700, 0, 2); scene.add(fill);
const cool = new THREE.PointLight('#7f9fe0', 500, 0, 2); scene.add(cool);
const camLed = new THREE.PointLight('#ff3020', 0, 0, 2); scene.add(camLed);
const tramLight = new THREE.PointLight('#ffe2b0', 0, 0, 2); scene.add(tramLight);
const lampGlow = new THREE.PointLight('#ffb070', 0, 0, 2); scene.add(lampGlow);
const screenLight = new THREE.PointLight('#bfe0ff', 0, 0, 2); scene.add(screenLight);
const mirrorLight = new THREE.PointLight('#ffcf98', 0, 0, 2); scene.add(mirrorLight);
const KEY0 = new THREE.Color('#ffb878'), KEYW = new THREE.Color('#ff9440');

// ------------------------------------------------------------------ poses
const legs = (st) => ({ lf: { f: st.lf }, rf: { f: st.rf }, lh: { f: st.lh }, rh: { f: st.rh } });
const D_STAND = { fy: 13.6, ry: 13.2, arch: 0.4, na: 0.9, ny: 0, hp: 0.2, hy: 0, hr: 0, tu: 0.45, wag: 0, curl: 0.18, ear: 0, earFlop: 0, shut: 0, brow: 0, legs: legs(stance(DOG)) };
const D_LIE = {
  fy: 4.3, ry: 4.6, arch: 0.7, na: -0.38, ny: 0.05, hp: 0.12, hy: 0, hr: 0.05, tu: -0.5, wag: 0.9, curl: 0.3, ear: -0.15, earFlop: 0, shut: 1, brow: 0,
  legs: {
    lf: { f: [1.5, 0, 14.6], K: [2.4, 1.1, 4.2], A: [1.7, 0.9, 11.6] },
    rf: { f: [-1.3, 0, 14.0], K: [-2.4, 1.1, 4.0], A: [-1.5, 0.9, 11.0] },
    lh: { f: [3.6, 0, -4.4], K: [4.0, 3.2, -1.4], A: [3.4, 1.0, -9.8] },
    rh: { f: [-3.7, 0, -4.2], K: [-4.2, 3.2, -1.6], A: [-3.5, 1.0, -9.8] },
  },
};
const D_HEADUP = { ...D_LIE, na: 0.55, hp: -0.05, shut: 0, ear: 0.1, fy: 5.4 };
const D_BOW = {
  fy: 7.6, ry: 14.0, arch: 0.0, na: 0.15, ny: 0, hp: 0.0, tu: 1.05, wag: 0.4, curl: 0.15, ear: 0.2, shut: 0.6, brow: 0.4,
  legs: {
    lf: { f: [1.6, 0, 15.2], K: [2.2, 1.6, 6.8], A: [1.7, 0.9, 12.0] },
    rf: { f: [-1.6, 0, 15.2], K: [-2.2, 1.6, 6.8], A: [-1.7, 0.9, 12.0] },
    lh: { f: [DOG.hip[0] * 0.95, 0, DOG.hip[2] - 1.6] }, rh: { f: [-DOG.hip[0] * 0.95, 0, DOG.hip[2] - 1.6] },
  },
};
/** the hound trotting: phase in cycles, plus a head that keeps its eye on things */
function dogTrot(ph, o = {}) {
  const st = stance(DOG), g = trot(ph, { stride: o.stride ?? 6.2, lift: o.lift ?? 2.4 });
  const L = {}; for (const k of ['lf', 'rf', 'lh', 'rh']) L[k] = { f: add3(st[k], [0, g[k].dy, g[k].dz]) };
  const b = Math.cos(ph * Math.PI * 4) * 0.35;
  return { ...D_STAND, legs: L, bob: b, na: o.na ?? 0.8, hp: o.hp ?? 0.18, tu: 0.6, wag: Math.sin(ph * Math.PI * 2) * 0.35, ear: 0.05 + 0.08 * Math.sin(ph * Math.PI * 4), earFlop: 0.12 * Math.sin(ph * Math.PI * 4) };
}
const C_STAND = { fy: 6.4, ry: 6.8, arch: 0.6, na: 0.95, ny: 0, hp: 0.1, tu: 1.45, curl: 0.06, wag: 0, legs: legs(stance(CAT)) };
function catWalk(ph) {
  const st = stance(CAT), g = trot(ph, { stride: 6.5, lift: 1.4, duty: 0.6 });
  const L = {}; for (const k of ['lf', 'rf', 'lh', 'rh']) L[k] = { f: add3(st[k], [0, g[k].dy, g[k].dz]) };
  return { ...C_STAND, legs: L, bob: Math.cos(ph * Math.PI * 4) * 0.12, wag: Math.sin(ph * Math.PI * 2) * 0.12, curl: 0.08 + 0.04 * Math.sin(ph * 3) };
}
const breath = (tp, per = 3.0) => 0.5 + 0.5 * Math.sin(tp * Math.PI * 2 / per);
// the dog's sleeping spot on the rug: lying in profile, facing +x
const SLEEP = { x: -3, z: 9, h: Math.PI / 2 - 0.1 };

// Toko: seated on the sofa with the phone; on the pouf, leaning to the dog; kneeling behind it
const T_SOFA = (P = {}) => {
  const hip = [-4, 11.4, WALLZ + 13];
  return { hip, yaw: 0.0, lean: 0.12, side: 0, knee: [0, 1.4, 11.5], foot: [0, -10.6, 13.5], hp: 0.42, hr: 0, hy: 0,
    elR: add3(hip, [-6.0, 7.4, 4.2]), hdR: add3(hip, [-1.4, 7.6, 11.0]), elL: add3(hip, [6.2, 7.4, 4.2]), hdL: add3(hip, [1.8, 7.4, 11.0]), palm: [[0.2, 1, 0.3], [-0.2, 1, 0.3]], ...P };
};

// ------------------------------------------------------------------ cameras
/** place target T at screen pixel `at`, from azimuth/elevation (degrees) and distance D */
function frameCam({ T, at = [540, 960], az = 0, el = 0, D = 80, fov = 30, roll = 0 }) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  const dir = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
  const pos = new THREE.Vector3(...T).addScaledVector(dir, D);
  const f = dir.clone().negate(), r = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize(), u = new THREE.Vector3().crossVectors(r, f);
  const h = D * Math.tan(fov * Math.PI / 360), w = h * 1080 / 1920;
  const nx = 2 * at[0] / 1080 - 1, ny = 1 - 2 * at[1] / 1920;
  const look = new THREE.Vector3(...T).addScaledVector(u, -ny * h).addScaledVector(r, -nx * w);
  return { pos: pos.toArray(), look: look.toArray(), fov, roll };
}

// ------------------------------------------------------------------ the shots
// every shot returns its state at shot-time s; poses read sp (the time quantised to twos)
const TRAM_T0 = 0.2, TRAM_T1 = 5.8;
const SHOTS = [
  // 1 — wide, dusk: rain on the big window, a lit tram slides by; Toko on the sofa with his phone; the hound
  //     asleep on the rug; on the shelf a small white camera with a price tag. At beat 4 its LED wakes and
  //     blinks, it swivels toward the room and the $20/MO tag swings. Slow push in.
  {
    room: 'dusk',
    cam: (s) => { const k = smooth(0, 6.4, s); return { ...frameCam({ T: mix([12, 24, -10], [CAM_AT[0] - 2, CAM_AT[1] - 1, CAM_AT[2]], k), at: mix([600, 1080], [640, 960], k), az: -6, el: lerp(7, 4, k), D: lerp(230, 135, k), fov: 30 }), focus: CAM_AT, ap: lerp(9, 13, k) }; },
    pose: (sp) => {
      const look = smooth(beat(5), beat(5) + 0.45, sp);
      return {
        toko: T_SOFA({ hp: lerp(0.42, 0.12, look), hy: lerp(0, 0.6, look), hr: lerp(0, -0.05, look), breathe: breath(sp) }), phone: 'lap',
        dog: { at: SLEEP, P: { ...D_LIE, breathe: breath(sp, 2.6), earFlop: sp > beat(6) && sp < beat(6) + 0.35 ? 0.5 : 0 } },
        camLook: sp < beat(4) ? [0.05, 0.12] : [lerp(0.05, -0.32, eout(beat(4), beat(4) + 0.3, sp)), lerp(0.12, 0.22, eout(beat(4), beat(4) + 0.3, sp))],
        tagSwing: sp < beat(4) + 0.12 ? 0 : 0.42 * Math.exp(-(sp - beat(4) - 0.12) * 0.55) * Math.sin((sp - beat(4) - 0.12) * 4.6),
      };
    },
    led: (s) => (s < beat(4) ? 0 : s < beat(4) + 0.5 ? (Math.floor((s - beat(4)) * 12) % 2 ? 0.15 : 1.0) : s < beat(5) ? 0.95 : (Math.floor((s - beat(5)) / B) % 2 ? 0.55 : 1.0)),
    tram: (s) => lerp(-200, 230, smooth(TRAM_T0, TRAM_T1, s) * 0.25 + clamp((s - TRAM_T0) / (TRAM_T1 - TRAM_T0)) * 0.75),
  },
  // 2 — low, at rug level: the hound wakes, stretches (a play bow), trots across the rug; the camera on the
  //     shelf swivels to follow; card brackets close round the dog (beat 6) and a flag pops on: DEER (beat 7).
  {
    room: 'dusk',
    cam: (s) => { const x = dogX2(s); return { ...frameCam({ T: [lerp(x + 1, 20, 0.3), 13, 9], at: [540, 1330], az: -5, el: -1.5, D: 165, fov: 32 }), focus: [x + 2, 12, SLEEP.z], ap: 11 }; },
    key: { pos: [-22, 50, 72], target: [24, 10, 9], I: 24000 },
    pose: (sp) => {
      let P;
      if (sp < beat(1)) P = D_LIE;
      else if (sp < beat(2)) P = blend(D_LIE, D_HEADUP, smooth(beat(1), beat(2), sp));
      else if (sp < beat(3)) P = blend(D_HEADUP, D_BOW, smooth(beat(2), beat(3), sp));
      else if (sp < beat(4)) P = blend(D_BOW, D_STAND, smooth(beat(3) + 0.1, beat(4), sp));
      else if (sp < T2_STOP) P = dogTrot((sp - beat(4)) / B, { stride: 5.0, lift: 2.2 });
      else P = blend(dogTrot((T2_STOP - beat(4)) / B, { stride: 5.0, lift: 2.2 }), { ...D_STAND, ny: -0.3, hy: -0.25, na: 1.15, hp: -0.25, tu: 0.7, wag: 0.3 * Math.sin(sp * 10), ear: 0.25, brow: 0.7 }, smooth(T2_STOP, T2_STOP + 0.4, sp));
      const x = dogX2(sp);
      const dx = x - CAM_AT[0], dz = SLEEP.z - CAM_AT[2];
      return {
        dog: { at: { x, z: SLEEP.z, h: SLEEP.h }, P: { ...P, breathe: breath(sp) * (sp < beat(2) ? 1 : 0.3) } },
        camLook: sp < beat(4) - 0.3 ? [-0.32, 0.22] : [Math.atan2(dx, dz), 0.2],
        brackets: { on: sp >= beat(6) - 0.15, k: pop(beat(6) - 0.15, 0.55, sp), target: 'dog' },
        flag: { on: sp >= beat(7), k: pop(beat(7), 0.5, sp) },
      };
    },
    led: (s) => (s < beat(4) ? 0.95 : 0.7 + 0.3 * (Math.floor(s / (B / 2)) % 2)),
  },
  // 3 — close on the phone in Toko's gloved hand. A buzz (beat 1), then the evening brief slides up (beat 2):
  //     "Unexpectedly, a deer briefly entered the family room." Locked off.
  {
    room: 'dusk',
    cam: (s) => ({ ...frameCam({ T: PHONE_AT, at: [540, 1200], az: 0, el: 0, D: 46, fov: 30 }), focus: PHONE_AT, ap: 26 }),
    pose: (sp) => ({ dog: { at: SLEEP, P: { ...D_LIE, breathe: breath(sp, 2.6) } }, hero: true, camLook: [-0.2, 0.2] }),
    screen: (s) => ({ k: eout(beat(2), beat(2) + 0.42, s), buzz: s > beat(1) && s < beat(1) + 0.35 ? 1 - (s - beat(1)) / 0.35 : 0 }),
    led: (s) => 0.8 + 0.2 * Math.sin(s * 3),
  },
  // 4 — Toko and the hound face to face: Toko lowers the phone, leans in and pats the top of the dog's head
  //     for antlers — left (beat 3), right (beat 4); nothing (beat 5–6); the dog tilts its head (beat 6),
  //     Toko tilts his (beat 7). Locked off.
  {
    room: 'dusk',
    cam: (s) => ({ ...frameCam({ T: [24, 22, 0], at: [540, 1180], az: 6, el: 6, D: 158, fov: 30 }), focus: [23, 24, 2], ap: 11 }),
    key: { pos: [52, 52, 46], target: [20, 18, 0], I: 30000 },
    pose: (sp) => shot4(sp),
    led: (s) => 0.75 + 0.25 * Math.sin(s * 2),
  },
  // 5 — the hallway mirror: the hound trots past; its reflection has antlers; DEER flags pile up on the frame
  //     (beats 3, 4, 5); a tabby strolls in after it and a RACCOON flag drops onto it (beat 7). Truck right.
  {
    room: 'hall',
    cam: (s) => ({ ...frameCam({ T: [HX + lerp(-14, -4, smooth(0, 5.5, s)), 22, HZ + 10], at: [540, 1240], az: 16, el: 9, D: 150, fov: 30 }), focus: [HX - 4, 18, HZ + 14], ap: 9 }),
    pose: (sp) => shot5(sp),
  },
  // 6 — night, the room: the hound asleep on the rug; Toko kneels and ties a handwritten tag on its collar:
  //     DOG (beat 6). The camera's LED blinks (beat 7), its brackets close and its DEER flag lands beside
  //     Toko's tag (beat 8); on the last hit (beat 9) the lamp clicks warmer. Pull back.
  {
    room: 'night',
    cam: (s) => { const k = smooth(0.1, 5.3, s); return { ...frameCam({ T: mix([5, 12, 6], [13, 19, 0], k), at: [mix(540, 530, k), mix(1260, 1200, k)], az: 3, el: lerp(13, 9, k), D: lerp(118, 190, k), fov: 30 }), focus: [6, 7, 12], ap: lerp(12, 8, k) }; },
    key: { pos: [40, 50, 50], target: [4, 10, 4], I: 26000 },
    pose: (sp) => shot6(sp),
    led: (s) => (s < beat(7) ? 0.6 : s < beat(7) + 0.45 ? (Math.floor((s - beat(7)) * 10) % 2 ? 0.1 : 1.3) : 1.0),
    lamp: (s) => smooth(beat(9) - 0.02, beat(9) + 0.06, s),
  },
];
// shot 2's walk: lying until beat 4, then trotting right until it stops
const T2_START = beat(4), T2_STOP = 4.1;
function dogX2(t) {
  const v = trotAdvance(5.0) / B;   // cm per second
  return SLEEP.x + v * clamp(t - T2_START, 0, T2_STOP - T2_START) + (t > T2_STOP ? 0 : 0);
}
const PHONE_AT = [-6, 20, 30];

function shot4(sp) {
  const hip = [POUF[0], POUF[1] + 10.2, POUF[2]];
  const yaw = 1.0;
  const R = (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
  const at = (v) => add3(hip, R(v));
  const lower = smooth(0.0, 0.8, sp), lean = smooth(0.7, 1.5, sp);
  // the dog stands facing Toko, head raised to his mask
  const dPos = { x: 37, z: 6, h: -1.12 };
  const tilt = smooth(beat(6), beat(6) + 0.25, sp);
  const pats = [beat(3), beat(4)];
  let dip = 0; for (const t of pats) { const u = (sp - t) / 0.28; if (u > 0 && u < 1) dip = Math.max(dip, Math.sin(Math.PI * u)); }
  const D = { ...D_STAND, na: 1.12, hp: -0.32 + dip * 0.22, hr: tilt * 0.62, hy: 0, ear: 0.1 + tilt * 0.15, earFlop: tilt * 0.6 - dip * 0.3, brow: 0.4 + tilt * 0.6, browTilt: tilt, tu: 0.5, wag: Math.sin(sp * 9) * 0.25 * (1 - tilt * 0.6), breathe: breath(sp) };
  // where the dog's head is, for the patting hand
  dog.group.position.set(dPos.x, 0, dPos.z); dog.group.rotation.y = dPos.h; dog.pose(D);
  const top = dog.headPoint([0, 3.4, 0.4]).toArray();
  const side = [-1.4, 1.4];
  let hdL, elL;
  const handIdle = at([5.2, 6.0, 8.5]), elIdle = at([7.0, 8.0, 3.0]);
  if (sp < 1.0) { hdL = handIdle; elL = elIdle; }
  else {
    // reach, pat left, pat right, then hover with the palm up: nothing there
    const n = sp < beat(3) - 0.1 ? 0 : sp < beat(4) - 0.1 ? 0 : 1;
    const toward = smooth(1.0, 1.5, sp);
    const ptA = dog.headPoint([side[0], 3.0 + 2.5 * (1 - dipOf(sp, beat(3))), 0.2]).toArray(), ptB = dog.headPoint([side[1], 3.0 + 2.5 * (1 - dipOf(sp, beat(4))), 0.2]).toArray();
    const hover = dog.headPoint([0, 6.5, 1.0]).toArray();
    let tgt = sp < beat(4) - 0.15 ? ptA : sp < beat(5) - 0.1 ? ptB : mix(ptB, hover, smooth(beat(5) - 0.1, beat(5) + 0.3, sp));
    hdL = mix(handIdle, tgt, toward);
    elL = mix(elIdle, add3(mix(at([6.0, 8.0, 3.0]), hdL, 0.45), [0, -2.5, 0]), toward);
  }
  const P = {
    hip, yaw, lean: lerp(0.15, 0.55, lean) - smooth(beat(6), beat(7), sp) * 0.06, side: 0, knee: [0, 1.2, 10.5], foot: [0, -9.2, 12.0],
    hp: lerp(0.35, 0.18, lean), hy: 0, hr: smooth(beat(7), beat(7) + 0.3, sp) * 0.3,
    elR: at([-6.4, 7.0, 3.6]), hdR: mix(at([-2.2, 8.6, 10.5]), at([-3.2, 3.6, 8.6]), lower),
    elL, hdL, palm: [[0.2, 1, 0.3], sp > beat(5) ? [0, -1, 0.3] : [0, 1, 0]],
    breathe: breath(sp),
  };
  return { toko: P, phone: 'hand', dog: { at: dPos, P: D }, camLook: [-0.1, 0.25] };
}
function dipOf(sp, t) { const u = (sp - t) / 0.28; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }

const HALL_Z = HZ + 16;
function shot5(sp) {
  // the hound trots left → right along the runner, past the mirror
  const v = trotAdvance(6.2) / B, x0 = HX - 62;
  const dx = x0 + v * clamp(sp, 0, 4.4);
  const P = sp < 4.4 ? dogTrot(sp / B, { na: 0.85 }) : blend(dogTrot(4.4 / B, { na: 0.85 }), D_STAND, smooth(4.4, 4.8, sp));
  // the cat strolls in after it, stops, gets labelled, looks up
  const CPER = B * 0.92, cx0 = HX - 50, cStop = beat(7) - 0.05, cv = trotAdvance(6.5, 0.6) / CPER;
  const cx = cx0 + cv * clamp(sp - 1.6, 0, cStop - 1.6);
  const look = smooth(beat(8), beat(8) + 0.3, sp);
  const CP = sp < cStop ? catWalk((sp - 1.6) / CPER) : blend(catWalk((cStop - 1.6) / CPER), { ...C_STAND, na: 1.25, hp: lerp(0.1, -0.55, look), ny: 0, hy: lerp(0, 0.25, look), earBack: look * 0.8, tu: 1.45 }, smooth(cStop, cStop + 0.3, sp));
  return {
    dog: { at: { x: dx, z: HALL_Z, h: Math.PI / 2 }, P: { ...P, breathe: 0 } },
    cat: { at: { x: cx, z: HALL_Z + 3, h: Math.PI / 2 }, P: CP },
    mirrorFlags: [beat(3), beat(4), beat(5)].map(t => pop(t, 0.5, sp)),
    racc: { t: beat(7), sp },
  };
}

const KNEEL = [2, 0, -3.5];
const SLEEP6 = { x: 7, z: 10, h: Math.PI / 2 - 0.1 };
function shot6(sp) {
  const hip = [KNEEL[0], 10.6, KNEEL[2]];
  const yaw = 0.08;
  const R = (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
  const at = (v) => add3(hip, R(v));
  dog.group.position.set(SLEEP6.x, 0, SLEEP6.z); dog.group.rotation.y = SLEEP6.h;
  const D = { ...D_LIE, breathe: breath(sp, 2.6), earFlop: sp > beat(8) && sp < beat(8) + 0.3 ? 0.5 : 0 };
  dog.pose(D); dog.group.updateMatrixWorld(true);
  const knot = dog.collar.localToWorld(new THREE.Vector3(-2.6, 0.2, 0.2)).toArray();   // the collar's camera side
  const done = smooth(beat(6) - 0.15, beat(6) + 0.15, sp), sitBack = smooth(beat(6), beat(6) + 0.5, sp);
  const fid = (sp < beat(6) - 0.15) ? Math.sin(sp * 11) * 0.5 : 0;
  const hdR = mix(add3(knot, [-1.6 + fid, 1.6, -0.2]), at([-4.5, 5.0, 7.0]), sitBack);
  const hdL = mix(add3(knot, [1.6 - fid, 2.0, 0.2]), at([4.6, 5.0, 7.0]), sitBack);
  const look = smooth(beat(7), beat(7) + 0.35, sp), slump = smooth(beat(8) + 0.1, beat(9), sp);
  const P = {
    hip: add3(hip, [0, -sitBack * 1.2, -sitBack * 0.6]), yaw, lean: lerp(0.75, 0.25, sitBack) + slump * 0.12, side: 0,
    knee: [0, -8.6, 2.5], foot: [0, -9.6, -7.5], shoePitch: -1.25,
    hp: lerp(0.55, 0.15, sitBack) + slump * 0.18, hy: look * 0.65 - slump * 0.3, hr: 0,
    elR: mix(at([-7.0, 6.0, 5.0]), at([-6.5, 6.0, 3.0]), sitBack), hdR, elL: mix(at([7.0, 6.0, 5.0]), at([6.5, 6.0, 3.0]), sitBack), hdL,
    palm: [[0, -1, 0.3], [0, -1, 0.3]], breathe: breath(sp),
  };
  return {
    toko: P, dog: { at: SLEEP6, P: D },
    dogTag: { knot, k: done },
    camLook: [lerp(-0.62, -0.62, 0), 0.25],
    brackets: { on: sp >= beat(7) + 0.1, k: pop(beat(7) + 0.1, 0.5, sp), target: 'dogLying' },
    flagDrop: { t: beat(8), sp },
  };
}

// ------------------------------------------------------------------ rigging a state into the scene
const ROOM_LIGHTS = {
  dusk: { hemi: 0.42, key: 14000, glow: 2200, win: 1.3, fill: 3200, cool: 520, sky: 'dusk', winC: '#8eb0ff' },
  night: { hemi: 0.22, key: 14000, glow: 2000, win: 0.5, fill: 1900, cool: 260, sky: 'night', winC: '#6d8ad8' },
};
function lightRoom(kind, lw = 0, ko = null) {
  const L = ROOM_LIGHTS[kind];
  hemi.intensity = L.hemi;
  key.position.set(LAMP[0] - 1.5, LAMP[1] + 35, LAMP[2] + 2.5); key.target.position.set(-2, 4, 10); key.angle = 1.1; key.penumbra = 0.85;
  lampGlow.position.set(LAMP[0], LAMP[1] + 39, LAMP[2] - 1); lampGlow.intensity = L.glow * (1 + 0.3 * lw);
  if (ko) { key.position.set(...ko.pos); key.target.position.set(...ko.target); key.intensity = ko.I * (1 + 0.35 * lw); key.angle = 0.7; }
  key.color.copy(KEY0).lerp(KEYW, lw); key.intensity = L.key * (1 + 0.35 * lw);
  win.color.set(L.winC); win.intensity = L.win; win.position.set(-30, 190, -170); win.target.position.set(-8, 0, 0);
  fill.position.set(22, 46, 75); fill.intensity = L.fill;
  cool.position.set(-12, 50, -24); cool.intensity = L.cool;
  mirrorLight.intensity = 0;
  skyDusk.visible = L.sky === 'dusk'; skyNight.visible = L.sky === 'night';
  lamp.bulb.material.color.setRGB(7 + 4 * lw, 4.3 + 1.5 * lw, 2.0);
  S.shade.userData.U.uGlow.value.setRGB(0.95 + 0.6 * lw, 0.52 + 0.22 * lw, 0.2);
}
function lightHall() {
  hemi.intensity = 0.36;
  key.position.set(HX - 4, 96, HZ + 34); key.target.position.set(HX - 6, 6, HZ + 12); key.angle = 0.95; key.penumbra = 0.9;
  key.color.copy(KEY0); key.intensity = 26000;
  win.color.set('#8eb0ff'); win.intensity = 1.0; win.position.set(HX - 160, 90, HZ + 120); win.target.position.set(HX, 10, HZ);
  fill.position.set(HX + 30, 40, HZ + 150); fill.intensity = 600;
  cool.position.set(HX - 60, 40, HZ + 40); cool.intensity = 380;
  mirrorLight.position.set(HX - 4, 70, HZ - 60); mirrorLight.intensity = 2600; lampGlow.intensity = 0;
  skyDusk.visible = false; skyNight.visible = false;
}

let lastKey = '';
function placeBeast(b, mb, st) {
  b.group.visible = true;
  b.group.position.set(st.at.x, 0, st.at.z); b.group.rotation.y = st.at.h;
  b.pose(st.P);
  if (mb) { mb.group.visible = true; mb.group.position.copy(b.group.position); mb.group.rotation.copy(b.group.rotation); mb.pose(st.P); }
}
function setShot(k, s, t) {
  const sh = SHOTS[k];
  const e = Math.floor(t * POSE_FPS + 1e-6), tp = e / POSE_FPS, sp = tp - CUTS[k];
  const poseKey = `${k}:${e}`;
  if (poseKey !== lastKey) {
    lastKey = poseKey;
    setBoil(e);
    pouf.visible = k === 3;
    const P = sh.pose(Math.max(-0.5, sp));
    // Toko
    toko.group.visible = !!P.toko;
    if (P.toko) toko.pose(P.toko);
    puppetPhone.visible = !!P.toko && !!P.phone;
    if (puppetPhone.visible) {
      const h = toko.hands[0]; h.updateMatrixWorld(true);
      puppetPhone.position.copy(h.localToWorld(new THREE.Vector3(0.2, 0.9, 1.6)));
      puppetPhone.quaternion.copy(h.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.3, 0, 0)));
    }
    // the animals
    dog.group.visible = mirrorDog.group.visible = cat.group.visible = mirrorCat.group.visible = false;
    if (P.dog) placeBeast(dog, sh.room === 'hall' ? mirrorDog : null, P.dog);
    if (P.cat) placeBeast(cat, sh.room === 'hall' ? mirrorCat : null, P.cat);
    // the home camera and its tag
    const cl = P.camLook || [-0.2, 0.2];
    homeCam.look(cl[0], cl[1]);
    tagPivot.rotation.set(0.04, (P.tagSwing || 0) * 0.6, P.tagSwing || 0);
    // hero phone
    heroPhone.group.visible = !!P.hero;
    if (P.hero) {
      heroPhone.group.position.set(...PHONE_AT);
      heroPhone.group.position.y += Math.sin(sp * 1.7) * 0.15;
      heroPhone.group.rotation.set(-0.08 + Math.sin(sp * 1.3) * 0.01, 0.06, 0.035, 'YXZ');
      const sc = sh.screen(Math.max(0, sp));
      heroPhone.paint(sc.k, sc.buzz, 1.7);
      if (sc.buzz > 0) heroPhone.group.position.x += Math.sin(sp * 140) * 0.25 * sc.buzz;
    }
    // Toko's tag
    tagDOG.visible = tagDOGstring.visible = !!P.dogTag;
    if (P.dogTag) {
      const kn = P.dogTag.knot, d = P.dogTag.k;
      const hang = add3(kn, [0.2, -0.8, 1.2]);
      tagDOG.position.set(...hang);
      const land = pop(beat(6) - 0.1, 0.45, sp);
      tagDOG.userData.roll = lerp(0.3 * Math.sin(sp * 9), -0.08, d); tagDOG.userData.tilt = lerp(-0.2, -0.38, d);
      tagDOG.userData.turn = lerp(1.45, 0, clamp(land));   // edge-on in Toko's hands until he lets go
      tagDOGstring.geometry.dispose();
      tagDOGstring.geometry = sausage([add3(kn, [0, 0.3, -0.4]), add3(kn, [0.1, -0.2, 0.6]), hang], [0.09, 0.09, 0.09], { seg: 6, steps: 12, capSteps: 2 });
    }
    // brackets and flags
    brackets.group.visible = flagDeer.visible = flagRacc.visible = false;
    mirrorFlags.forEach(f => (f.visible = false));
    if (P.brackets && P.brackets.on) {
      brackets.group.visible = true;
      const kk = P.brackets.k, sc = lerp(1.9, 1.0, kk);
      let c, w, h;
      if (P.brackets.target === 'dog') { c = dog.group.localToWorld(new THREE.Vector3(0, 12.5, 3.5)); w = 31; h = 27; }
      else { c = dog.group.localToWorld(new THREE.Vector3(0, 5.5, 3.5)); w = 34; h = 15; }
      brackets.group.userData.c = c; brackets.group.userData.wh = [w * sc, h * sc];
      brackets.setBox(w * sc, h * sc);
      brackets.group.position.copy(c);
      brackets.group.userData.roll = (1 - kk) * 0.25;
    }
    if (P.flag && P.flag.on) {
      flagDeer.visible = true;
      flagDeer.userData.k = P.flag.k;
    }
    if (P.mirrorFlags) P.mirrorFlags.forEach((k, i) => {
      const f = mirrorFlags[i]; if (k <= 0) return;
      f.visible = true;
      f.position.set(MX0 - 1.4, 40 - i * 6.0, HZ + 2.5);
      f.rotation.set(0, 0, 0.3 + 0.08 * i);   // pinned into the frame, leaning out over the wall
      f.scale.set(1, Math.max(0.01, k), 1);
    });
    if (P.racc) {
      const u = P.racc.sp - P.racc.t + 0.45;   // falls for 0.45 s, then sticks with a wobble
      if (u > 0) {
        flagRacc.visible = true;
        cat.group.updateMatrixWorld(true);
        const back = cat.group.localToWorld(new THREE.Vector3(0.3, 8.2, -3.6));
        const fall = u < 0.45 ? (1 - (u / 0.45) ** 2) * 40 : 0;
        const wob = u >= 0.45 ? Math.exp(-(u - 0.45) * 5) * Math.sin((u - 0.45) * 22) * 0.3 : 0;
        flagRacc.position.set(back.x, back.y + fall, back.z);
        flagRacc.userData.roll = -0.12 + wob;
        flagRacc.scale.setScalar(1);
      }
    }
    if (P.flagDrop) {
      const u = P.flagDrop.sp - P.flagDrop.t + 0.4;
      if (u > 0) {
        flagDeer.visible = true;
        const spot = dog.group.localToWorld(new THREE.Vector3(-1.2, 7.4, 3.6));
        const fall = u < 0.4 ? (1 - (u / 0.4) ** 2) * 30 : 0;
        const wob = u >= 0.4 ? Math.exp(-(u - 0.4) * 5) * Math.sin((u - 0.4) * 22) * 0.3 : 0;
        flagDeer.position.set(spot.x, spot.y + fall, spot.z);
        flagDeer.userData.roll = 0.18 + wob;
        flagDeer.scale.setScalar(1);
        flagDeer.userData.k = -1;
      }
    }
  }
  // light, every frame
  if (sh.room === 'hall') lightHall(); else lightRoom(sh.room, sh.lamp ? sh.lamp(s) : 0, sh.key);
  const L = sh.led ? clamp(sh.led(s), 0, 2) : 0;
  PM.led.color.setRGB(0.08 + 9 * Math.min(L, 1) * Math.max(1, L), 0.02 + 0.4 * Math.min(L, 1), 0.02 + 0.25 * Math.min(L, 1));
  camLed.position.copy(homeCam.ledWorld()).add(new THREE.Vector3(0, 0, 1.2)); camLed.intensity = sh.room === 'hall' ? 0 : 26 * L;
  const tx = sh.tram ? sh.tram(s) : -400;
  tram.position.x = tx; tram.visible = !!sh.tram;
  tramLight.position.set(tx, TRAM_Y + 14, TRAM_Z + 30); tramLight.intensity = sh.tram ? 9000 * clamp(1 - Math.abs(tx - 0) / 160) : 0;
  screenLight.intensity = 0;
  if (puppetPhone.visible) { screenLight.position.copy(puppetPhone.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 2.5, 2)); screenLight.intensity = 30; }
  if (heroPhone.group.visible) { screenLight.position.set(PHONE_AT[0], PHONE_AT[1], PHONE_AT[2] + 6); screenLight.intensity = 140; }
  rainAt(t); dropsAt(t);
  // camera, every frame
  const c = window.__camOverride || sh.cam(s);
  camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); camera.lookAt(...c.look); camera.updateProjectionMatrix();
  // things that face the camera: the brackets, the flag that pops off their corner
  if (brackets.group.visible) {
    brackets.group.quaternion.copy(camera.quaternion);
    brackets.group.rotateZ(brackets.group.userData.roll || 0);
  }
  if (flagDeer.visible && flagDeer.userData.k >= 0 && brackets.group.visible) {
    const [w, h] = brackets.group.userData.wh;
    flagDeer.quaternion.copy(camera.quaternion);
    flagDeer.position.copy(brackets.group.userData.c).add(new THREE.Vector3(-w / 2 + 0.3, h / 2 - 0.3, 0).applyQuaternion(camera.quaternion));
    flagDeer.scale.set(1, Math.max(0.01, flagDeer.userData.k), 1);
  } else if (flagDeer.visible) {
    flagDeer.quaternion.copy(camera.quaternion); flagDeer.rotateZ(flagDeer.userData.roll || 0);
  }
  if (flagRacc.visible) { flagRacc.quaternion.copy(camera.quaternion); flagRacc.rotateZ(flagRacc.userData.roll || 0); }
  if (tagDOG.visible) { tagDOG.quaternion.copy(camera.quaternion); tagDOG.rotateY(tagDOG.userData.turn || 0); tagDOG.rotateX(tagDOG.userData.tilt || 0); tagDOG.rotateZ(tagDOG.userData.roll || 0); }
  scene.updateMatrixWorld(true);
  return { focus: camera.position.distanceTo(V(c.focus)), ap: c.ap, lamp: sh.lamp ? sh.lamp(s) : 0 };
}

function draw(k, s, t) {
  const f = setShot(k, s, t);
  post.render(scene, camera, {
    focus: f.focus, aperture: f.ap, maxBlur: TUNE.maxBlur, radScale: TUNE.radScale, noTile: TUNE.noTile,
    threshold: 1.3, knee: 0.5, bloomA: 0.3, bloomB: 0.14,
    exposure: 0.62 * (1 + 0.1 * f.lamp) * (TUNE.exp || 1), vignette: 0.5, grain: 0.03, seed: t * 37 % 97,
    sat: 1.06, contrast: 1.06, lift: [0.008, 0.006, 0.012], gain: [1.02, 1.0, 0.96], toe: 0.07,
  });
}

function layers(t) {
  for (let k = 0; k < 6; k++) {
    const c1 = CUTS[k + 1];
    if (k < 5 && Math.abs(t - c1) < XF / 2) { const w = (t - (c1 - XF / 2)) / XF; return [[k, 1 - w], [k + 1, w]]; }
    if (t < c1 || k === 5) return [[k, 1]];
  }
}

function probe(k, s) {
  lastKey = ''; draw(k, s, CUTS[k] + s);
  const P = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * 1080), Math.round((1 - p.y) / 2 * 1920)]; };
  const o = {};
  if (toko.group.visible) { o.tokoMask = P(toko.mask.getWorldPosition(new THREE.Vector3())); o.tokoHandL = P(toko.hands[1].getWorldPosition(new THREE.Vector3())); }
  if (dog.group.visible) { o.dogHead = P(dog.head.getWorldPosition(new THREE.Vector3())); o.dogBody = P(dog.group.localToWorld(new THREE.Vector3(0, 10, 0))); o.dogTail = P(dog.group.localToWorld(new THREE.Vector3(0, 10, -14))); o.dogNose = P(dog.headPoint([0, -0.6, 6.5])); o.dogFeet = P(dog.group.localToWorld(new THREE.Vector3(0, 0, 0))); }
  if (mirrorDog.group.visible) { o.mirrorHead = P(mirrorDog.head.getWorldPosition(new THREE.Vector3())); o.mirrorAntler = P(mirrorDog.headPoint([4, 11, 0])); }
  if (cat.group.visible) o.cat = P(cat.head.getWorldPosition(new THREE.Vector3()));
  o.homeCam = P(homeCam.lensWorld()); o.tag = P(tag.userData.card.getWorldPosition(new THREE.Vector3()));
  if (tram.visible) o.tram = P(tram.position.clone().add(new THREE.Vector3(0, 12, 6)));
  if (heroPhone.group.visible) { o.phoneTop = P(heroPhone.group.localToWorld(new THREE.Vector3(0, 7.6, 0.5))); o.phoneMid = P(heroPhone.group.localToWorld(new THREE.Vector3(0, 0, 0.5))); o.phoneL = P(heroPhone.group.localToWorld(new THREE.Vector3(-3.7, 0, 0.5))); o.phoneR = P(heroPhone.group.localToWorld(new THREE.Vector3(3.7, 0, 0.5))); }
  if (tagDOG.visible) o.dogTag = P(tagDOG.userData.card.getWorldPosition(new THREE.Vector3()));
  if (flagDeer.visible) o.flagDeer = P(flagDeer.userData.card.getWorldPosition(new THREE.Vector3()));
  if (flagRacc.visible) o.flagRacc = P(flagRacc.userData.card.getWorldPosition(new THREE.Vector3()));
  if (brackets.group.visible) o.brackets = brackets.corners.map(c => P(c.getWorldPosition(new THREE.Vector3())));
  o.mirror = [P(V([MX0, MY1, HZ])), P(V([MX1, MY0, HZ]))];
  o.window = [P(V([WX0, WY1, WALLZ])), P(V([WX1, WY0, WALLZ]))];
  return o;
}
const TUNE = { radScale: 1.5, maxBlur: 26, noTile: false, exp: 1 };
window.__film = {
  probe,
  W, H, FPS, CUTS, frames: Math.round(CUTS[6] * FPS),
  frame(i, q = 0.94) {
    const t = i / FPS, L = layers(t);
    g2d.globalAlpha = 1; g2d.fillStyle = '#000'; g2d.fillRect(0, 0, W, H);
    for (const [k, w] of L) {
      if (L.length > 1) lastKey = '';
      draw(k, t - CUTS[k], t);
      g2d.globalAlpha = L.length === 1 ? 1 : (k === L[0][0] ? 1 : w);
      g2d.drawImage(renderer.domElement, 0, 0);
    }
    return out2d.toDataURL('image/jpeg', q);
  },
  still(k, s, cam) { lastKey = ''; window.__camOverride = cam || null; draw(k, s, CUTS[k] + s); window.__camOverride = null; return renderer.domElement.toDataURL('image/png'); },
  tune(o) { Object.assign(TUNE, o); },
};
window.__ready = true;
