// GENIUS — Toko Midori Games, clay, 21.2 s, 1080×1920, 24 fps (509 frames).
//
// The Unexpectedly-a-Deer kit, unchanged where it is a character (Toko, the
// hound), in a sunny morning kitchen: butter-yellow walls over teal tiles, a
// red gingham cloth, a fruit bowl with a phone propped against it, a pink
// piggy bank. Five beats, hard cuts:
//   1 0–4.4    Toko holds up a clay poo on a lollipop stick to his phone (flies on
//              wires, stink lines); the old dog asleep under the table
//   2 4.4–9.2  the phone bursts: confetti, a tiny gold trophy on a spring, a bubble
//   3 9.2–12.8 Toko smashes his piggy bank; coins everywhere
//   4 12.8–16.4 the old dog pads over and sniffs the stick once (nose wrinkles) while
//              the confetti and trophy run BACKWARDS into the phone (rolled back)
//   5 16.4–21.2 the dog turns and walks out of the room; Toko watches, stick raised
// Puppets are posed ON TWOS (12 poses/s, each re-lumping the clay); the camera
// and the light move every frame. No captions, no slate, no bug: those are burned
// later, in the top ~600 px, so faces and action stay below y≈700.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { skyPlane, canvas, tex } from './lib/city.js';
import { Beast, DOG, trot, trotAdvance, stance, orient } from './lib/beasts.js';
import { Toko } from './lib/toko.js';
import { pooStick, fly, piggy, coinGeo, hammer, trophy, bubbleCard, ChatPhone } from './lib/gprops.js';

const RES = Number(new URLSearchParams(location.search).get('res') || 1);
const W = Math.round(1080 * RES), H = Math.round(1920 * RES), FPS = 24, POSE_FPS = 12;
const CUTS = [0, 4.4, 9.2, 12.8, 16.4, 21.2];
const FRAMES = 509;

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eout = (a, b, x) => 1 - (1 - clamp((x - a) / (b - a))) ** 3;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (A, Bv, k) => (Array.isArray(A) ? A.map((v, i) => lerp(v, Bv[i], k)) : lerp(A, Bv, k));
function blend(A, Bv, k) {
  if (A === undefined) return Bv; if (Bv === undefined) return A;
  if (typeof A === 'number' && typeof Bv === 'number') return lerp(A, Bv, k);
  if (Array.isArray(A) && Array.isArray(Bv)) return A.map((v, i) => lerp(v, Bv[i], k));
  if (typeof A === 'object' && typeof Bv === 'object' && A && Bv) { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(Bv)])) o[key] = blend(A[key], Bv[key], k); return o; }
  return k < 0.5 ? A : Bv;
}
const pop = (a, d, x) => { const t = clamp((x - a) / d); if (t <= 0) return 0; return 1 - Math.exp(-6 * t) * Math.cos(t * 9.5) * (1 - t * 0.2); };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const V = (a) => new THREE.Vector3(...a);
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// ------------------------------------------------------------------ boot
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 3, 1600);
const post = new Post(renderer, W, H);

// ------------------------------------------------------------------ clays
const clay = (color, o = {}) => surface({ color, wrap: 0.45, wrapTint: '#ffc6a0', rough: 0.6, bump: 1, lump: 0.05, lumpF: 0.5, thumb: 0.035, thumbCell: 2.0, ridge: 0.12, tool: 0.8, grain: 0.004, grainF: 8, mottle: 0.10, specks: 0.6, roughVar: 0.12, ...o });
const HDR = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const TM = {   // Toko — exactly the Deer film's
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
const DM = {   // the hound — exactly the Deer film's
  coat: clay('#c08048', { thumbCell: 1.3, thumb: 0.045, tool: 1.3, mottle: 0.12 }),
  coatLeg: clay('#bd7d46', { thumbCell: 1.0, thumb: 0.04, tool: 1.1 }),
  ear: clay('#a8693a', { thumbCell: 1.1, thumb: 0.045, tool: 1.4 }),
  saddle: clay('#2b211b', { thumbCell: 1.2, thumb: 0.05, tool: 1.6, specks: 0.3, speckColor: '#6a4a30' }),
  white: clay('#f0e6d4', { thumb: 0.03, thumbCell: 1.0, specks: 0.3 }),
  nose: clay('#151113', { rough: 0.28, thumb: 0.01, mottle: 0.03, specks: 0 }),
  eye: clay('#1c120c', { rough: 0.2, thumb: 0.003, mottle: 0.02, specks: 0 }),
  glint: HDR(2.2, 2.1, 2.0),
  collar: clay('#2a7f7a', { thumb: 0.015, rough: 0.5 }), ring: clay('#c5a35e', { rough: 0.3, metal: 0.4, thumb: 0.005 }),
};
const PM = {   // the new props
  poo: clay('#6b4024', { thumbCell: 0.9, thumb: 0.05, tool: 1.6, ridge: 0.09, rough: 0.5, specks: 0.3, speckColor: '#3a2210', mottle: 0.14 }),
  stick: clay('#f3efe4', { thumb: 0.01, rough: 0.5, specks: 0.1 }),
  ribbon: clay('#d6332d', { thumb: 0.02, rough: 0.45 }),
  fly: clay('#17181c', { thumb: 0.01, rough: 0.35, specks: 0 }), flyEye: clay('#8a1d1d', { rough: 0.2, thumb: 0.002, specks: 0 }),
  wing: new THREE.MeshStandardMaterial({ color: '#e8f2f6', roughness: 0.25, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  wire: clay('#5d6066', { thumb: 0.002, rough: 0.35, metal: 0.4, specks: 0 }),
  stink: clay('#b6c48a', { thumb: 0.02, rough: 0.6, specks: 0.1, emissive: '#3a4420', emissiveIntensity: 0.25 }),
  pig: clay('#f39ab0', { thumbCell: 1.4, thumb: 0.035, tool: 0.9, rough: 0.42, side: THREE.DoubleSide, specks: 0.2, speckColor: '#b0566e' }),
  pigDark: clay('#3a1b22', { thumb: 0.01, rough: 0.4, specks: 0 }),
  eye: clay('#16110f', { rough: 0.2, thumb: 0.002, specks: 0 }), glint: HDR(2.4, 2.4, 2.3),
  gold: clay('#e3a826', { rough: 0.28, metal: 0.55, thumb: 0.01, thumbCell: 1.2, specks: 0.1, speckColor: '#8a5a10', mottle: 0.06 }),
  plinth: clay('#1e1d22', { rough: 0.35, thumb: 0.006, specks: 0 }),
  handle: clay('#b9874e', { tool: 1.4, thumbCell: 1.2, ridge: 0.14 }),
  steel: clay('#7c8189', { rough: 0.32, metal: 0.45, thumb: 0.012 }),
  phone: clay('#1d2a2c', { rough: 0.32, thumb: 0.004, mottle: 0.03, specks: 0, noBoil: true }),
  lens: clay('#06080b', { rough: 0.1, thumb: 0.001, specks: 0, noBoil: true }),
  spring: clay('#b8bcc2', { rough: 0.3, metal: 0.55, thumb: 0.004, specks: 0 }),
  rod: new THREE.MeshStandardMaterial({ color: '#dfe9ee', roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false }),
};
const S = {   // the set
  wall: surface({ color: '#ffffff', rough: 0.85, lump: 0.02, thumb: 0.006, thumbCell: 3, grain: 0.004, mottle: 0.08, noBoil: true }),
  side: surface({ color: '#ffffff', rough: 0.85, lump: 0.02, thumb: 0.006, thumbCell: 3, grain: 0.004, mottle: 0.08, noBoil: true }),
  floor: surface({ color: '#ffffff', rough: 0.5, lump: 0.02, thumb: 0.01, thumbCell: 3, grain: 0.005, grainF: 6, mottle: 0.08, specks: 0, noBoil: true }),
  trim: clay('#f5efe2', { lump: 0.03, thumb: 0.02, thumbCell: 2.4, mottle: 0.05, rough: 0.5, specks: 0.4, noBoil: true }),
  cloth: surface({ surf: 'felt', color: '#ffffff', rough: 0.92, fibre: 0.035, fibreF: 9, lump: 0.03, lumpF: 0.4, mottle: 0.05, side: THREE.DoubleSide }),
  wood: clay('#8a5a32', { thumbCell: 2.2, tool: 1.3, ridge: 0.16, rough: 0.6, noBoil: true }),
  chair: clay('#4fb3a9', { thumbCell: 2.0, tool: 1.0, rough: 0.5, noBoil: true }),
  bowl: clay('#f7f4ee', { rough: 0.25, thumb: 0.012, thumbCell: 1.6, mottle: 0.04, specks: 0.3, noBoil: true }),
  bowlBand: clay('#4fb3a9', { rough: 0.3, thumb: 0.01, noBoil: true }),
  apple: clay('#d23a2c', { rough: 0.32, thumb: 0.02, thumbCell: 1.2, specks: 0.2, speckColor: '#f2c94c' }),
  appleG: clay('#8fbf3a', { rough: 0.35, thumb: 0.02, thumbCell: 1.2, specks: 0.2 }),
  orange: clay('#f08a1c', { rough: 0.55, thumb: 0.02, grain: 0.03, grainF: 5 }),
  banana: clay('#f4d23c', { rough: 0.5, thumb: 0.03, tool: 1.0 }), bananaEnd: clay('#4a3a22', { rough: 0.6 }),
  grape: clay('#6a3b78', { rough: 0.3, thumb: 0.01 }),
  stem: clay('#5a3a1e', { thumb: 0.01 }), leaf: clay('#4f8f3a', { tool: 1.0, thumbCell: 1.0 }),
  crock: clay('#fbf8f2', { rough: 0.22, thumb: 0.01, thumbCell: 1.6, mottle: 0.03, specks: 0.2, noBoil: true }),
  crockRim: clay('#4fb3a9', { rough: 0.25, thumb: 0.01, noBoil: true }),
  fridge: clay('#bfe3d6', { rough: 0.3, thumb: 0.015, thumbCell: 3, mottle: 0.05, noBoil: true }),
  chrome: clay('#c9cfd4', { rough: 0.2, metal: 0.6, thumb: 0.004, specks: 0, noBoil: true }),
  counter: clay('#f3ead2', { rough: 0.45, thumb: 0.02, thumbCell: 2.5, noBoil: true }),
  cupboard: clay('#4fb3a9', { rough: 0.5, thumb: 0.025, thumbCell: 2.2, tool: 0.9, noBoil: true }),
  pot: clay('#c8603c', { rough: 0.7 }), plant: clay('#4f8f3a', { tool: 1.0, thumbCell: 1.2 }),
  dogbed: surface({ surf: 'felt', color: '#a8432e', rough: 0.95, fibre: 0.05, fibreF: 7, lump: 0.06, lumpF: 0.4 }),
  hedge: clay('#5f9c45', { thumbCell: 2.6, thumb: 0.05, tool: 1.4, rough: 0.8 }),
  hedge2: clay('#4d8a3c', { thumbCell: 2.6, thumb: 0.05, tool: 1.4, rough: 0.8 }),
  trunk: clay('#7a5634', { tool: 1.6 }), cloud: clay('#ffffff', { rough: 0.9, thumb: 0.02, emissive: '#ffffff', emissiveIntensity: 0.55 }),
  fence: clay('#fbf6ea', { rough: 0.6, noBoil: true }),
  hallWall: surface({ color: '#b9a57a', rough: 0.9, lump: 0.02, thumb: 0.006, thumbCell: 3, mottle: 0.1, noBoil: true }),
};

/** a canvas texture painted once */
function paintTex(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), w, h); const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
// the walls: teal tiles to 26 cm, a cream rail, butter yellow above. The texture covers 64 cm × 128 cm.
const WALL_PERIOD = [64, 128];
const wallTex = paintTex(512, 1024, (g, w, h) => {
  const cm = h / 128, tileTop = h - 26 * cm;
  g.fillStyle = '#f2c94c'; g.fillRect(0, 0, w, tileTop);
  const r = rng(5);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,240,190,0.10)' : 'rgba(170,120,20,0.06)'; g.fillRect(r() * w, r() * tileTop, 2 + r() * 6, 2 + r() * 6); }
  // tiles, 4 cm, with pale grout
  g.fillStyle = '#e7efe9'; g.fillRect(0, tileTop, w, h - tileTop);
  const ts = 4 * cm;
  for (let y = tileTop; y < h; y += ts) for (let x = 0; x < w; x += ts) {
    const v = r();
    g.fillStyle = v < 0.33 ? '#4fb3a9' : v < 0.66 ? '#48a99f' : '#56bcb1';
    g.fillRect(x + 1.6, y + 1.6, ts - 3.2, ts - 3.2);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + 3, y + 3, ts * 0.35, 2.2);
  }
});
wallTex.repeat.set(1 / WALL_PERIOD[0], 1 / WALL_PERIOD[1]);
S.wall.map = wallTex;
const sideTex = wallTex.clone(); sideTex.needsUpdate = true; S.side.map = sideTex;   // the side walls: uv set per plane below
// the floor: cream and teal lino checks, 9 cm
const floorTex = paintTex(512, 512, (g, w, h) => {
  const n = 4, s = w / n, r = rng(8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#8cc3b6' : '#f3ead4'; g.fillRect(x * s, y * s, s, s); }
  for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(80,60,30,0.05)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
});
floorTex.repeat.set(500 / 36, 400 / 36);
S.floor.map = floorTex;
// the gingham: red and white, woven — two half-tones and the full red where the bands cross
const GING = 2.4;   // cm per check
const gingTex = paintTex(256, 256, (g, w, h) => {
  g.fillStyle = '#fbf6ee'; g.fillRect(0, 0, w, h);
  const s = w / 4;
  g.fillStyle = 'rgba(214,51,45,0.55)';
  for (let i = 0; i < 4; i += 2) { g.fillRect(i * s, 0, s, h); g.fillRect(0, i * s, w, s); }
  g.fillStyle = 'rgba(200,40,38,0.45)';
  for (let i = 0; i < 4; i += 2) for (let j = 0; j < 4; j += 2) g.fillRect(i * s, j * s, s, s);
  const r = rng(3); for (let i = 0; i < 4000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(90,10,10,0.06)'; g.fillRect(r() * w, r() * h, 1 + r() * 4, 0.8); }
});
S.cloth.map = gingTex;
for (const m of [S.wall, S.side, S.floor, S.cloth]) m.needsUpdate = true;

// ------------------------------------------------------------------ the kitchen
const WALLZ = -42, WT = 6;
const WX0 = -36, WX1 = -6, WY0 = 28, WY1 = 60;       // the window
const RWX = 56, DX0 = 37, DX1 = 53, DY1 = 48;        // right wall; the doorway is in the back wall, right
const LWX = -78;
const TOP = 17.5, TB = { x0: -26, x1: 22, z0: -22, z1: 6 };
const backWall = (() => {
  const sh = new THREE.Shape([[LWX - 10, -2], [RWX + 10, -2], [RWX + 10, 130], [LWX - 10, 130]].map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path([[WX0, WY0], [WX0, WY1], [WX1, WY1], [WX1, WY0]].map(([x, y]) => new THREE.Vector2(x, y))));
  sh.holes.push(new THREE.Path([[DX0, -1], [DX0, DY1], [DX1, DY1], [DX1, -1]].map(([x, y]) => new THREE.Vector2(x, y))));
  return mesh(new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false, curveSegments: 1 }), S.wall, { pos: [0, 0, WALLZ - WT], parent: scene });
})();
// side walls as extrusions in their own plane (so the tile band lines up), the right one with a doorway
{
  const sh = new THREE.Shape([[WALLZ - 4, -2], [44, -2], [44, 130], [WALLZ - 4, 130]].map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false, curveSegments: 1 });
  g.rotateY(-Math.PI / 2);   // shape x → world −z … flip so shape x runs along +z
  mesh(g, S.side, { pos: [RWX + 5, 0, 0], parent: scene });   // shape x → world +z; a cap faces the room at x = RWX
  const sl = new THREE.Shape([[WALLZ - 4, -2], [44, -2], [44, 130], [WALLZ - 4, 130]].map(([x, y]) => new THREE.Vector2(x, y)));
  const gl = new THREE.ExtrudeGeometry(sl, { depth: 5, bevelEnabled: false, curveSegments: 1 });
  gl.rotateY(-Math.PI / 2);
  mesh(gl, S.side, { pos: [LWX, 0, 0], parent: scene });
}
mesh(new THREE.PlaneGeometry(500, 400).rotateX(-Math.PI / 2), S.floor, { pos: [0, 0, 80], parent: scene });
// rails and skirting
const rail = (x0, x1, y, z, h = 1.6, seed = 300) => mesh(lumpy(new RoundedBoxGeometry(x1 - x0, h, 1.4, 2, 0.4), 0.04, 0.4, seed), S.trim, { pos: [(x0 + x1) / 2, y, z], parent: scene });
rail(LWX, WX0, 26.6, WALLZ + 0.7, 1.6, 301); rail(WX1, DX0 - 1.2, 26.6, WALLZ + 0.7, 1.6, 302); rail(DX1 + 1.2, RWX, 26.6, WALLZ + 0.7, 1.6, 306);
rail(LWX, DX0 - 1.2, 1.6, WALLZ + 0.7, 3.2, 303); rail(DX1 + 1.2, RWX, 1.6, WALLZ + 0.7, 3.2, 307);
for (const [z0, z1, s] of [[WALLZ, 44, 304]]) { mesh(lumpy(new RoundedBoxGeometry(1.4, 1.6, z1 - z0, 2, 0.4), 0.04, 0.4, s), S.trim, { pos: [RWX - 0.7, 26.6, (z0 + z1) / 2], parent: scene }); mesh(lumpy(new RoundedBoxGeometry(1.4, 3.2, z1 - z0, 2, 0.4), 0.04, 0.4, s + 2), S.trim, { pos: [RWX - 0.7, 1.6, (z0 + z1) / 2], parent: scene }); }
// the door frame
for (const x of [DX0 - 0.6, DX1 + 0.6]) mesh(lumpy(new RoundedBoxGeometry(2.4, DY1 + 1.8, 1.8, 2, 0.4), 0.04, 0.5, 310 + x), S.trim, { pos: [x, (DY1 + 1.8) / 2, WALLZ + 0.6], parent: scene });
mesh(lumpy(new RoundedBoxGeometry(DX1 - DX0 + 3.6, 1.8, 1.8, 2, 0.4), 0.04, 0.5, 312), S.trim, { pos: [(DX0 + DX1) / 2, DY1 + 0.9, WALLZ + 0.6], parent: scene });
// the hallway beyond: dim, cooler
{
  // a short dark hall behind the doorway that turns away to the right
  mesh(new THREE.PlaneGeometry(40, 100).rotateY(Math.PI / 2), S.hallWall, { pos: [DX0 - 1, 50, WALLZ - 26], parent: scene });
  mesh(new THREE.PlaneGeometry(90, 100), S.hallWall, { pos: [DX0 + 30, 50, WALLZ - 42], parent: scene });
  mesh(new THREE.PlaneGeometry(40, 100).rotateY(-Math.PI / 2), S.hallWall, { pos: [DX1 + 40, 50, WALLZ - 26], parent: scene });
  mesh(new THREE.PlaneGeometry(90, 40).rotateX(Math.PI / 2), S.hallWall, { pos: [DX0 + 30, 66, WALLZ - 26], parent: scene });
}
// the window: white frame, sill, a pot plant
const winBar = (x, y, w, h, d = 1.6, seed = 320) => mesh(lumpy(new RoundedBoxGeometry(w, h, d, 2, 0.4), 0.05, 0.5, seed), S.trim, { pos: [x, y, WALLZ - 3.2], parent: scene });
winBar((WX0 + WX1) / 2, WY1 - 1, WX1 - WX0, 2, 1.8, 321); winBar((WX0 + WX1) / 2, WY0 + 1, WX1 - WX0, 2, 1.8, 322);
winBar(WX0 + 1, (WY0 + WY1) / 2, 2, WY1 - WY0, 1.8, 323); winBar(WX1 - 1, (WY0 + WY1) / 2, 2, WY1 - WY0, 1.8, 324);
winBar((WX0 + WX1) / 2, (WY0 + WY1) / 2, 1.4, WY1 - WY0, 1.6, 325); winBar((WX0 + WX1) / 2, 50, WX1 - WX0, 1.3, 1.5, 326);
mesh(lumpy(new RoundedBoxGeometry(WX1 - WX0 + 6, 1.4, WT + 3.5, 2, 0.5), 0.05, 0.4, 327), S.trim, { pos: [(WX0 + WX1) / 2, WY0 - 0.6, WALLZ - WT / 2 + 1.6], parent: scene });
{
  const g = new THREE.Group(); g.position.set(WX1 - 6, WY0, WALLZ - 1.5); scene.add(g);
  mesh(lumpy(lathe([[0.01, 0], [1.6, 0], [2.1, 3.0], [2.3, 3.3], [0.01, 3.3]], 32), 0.05, 0.8, 330), S.pot, { parent: g });
  const r = rng(31);
  for (let i = 0; i < 8; i++) { const a = r() * 6.28, h = 4 + r() * 3; mesh(lumpy(ball(1.2 + r() * 0.4, 1.2, 0.45, 1.0), 0.08, 0.8, 331 + i), S.plant, { pos: [Math.cos(a) * 1.5, h, Math.sin(a) * 1.0], rot: [r() - 0.5, a, 0.4], parent: g }); }
}
// outside: a June morning — sky, a cloud, a white fence, a hedge, a tree
{
  const out = new THREE.Group(); scene.add(out);
  out.add(skyPlane(600, 260, [[0, '#4f9fdc'], [0.45, '#86c2ee'], [0.8, '#cfeafb'], [1, '#e9f6fb']], { pos: [-20, 70, -300], intensity: 1.15 }));
  const sun = mesh(new THREE.CircleGeometry(9, 40), HDR(6, 5.4, 4.0), { pos: [-70, 120, -295], parent: out, cast: false, recv: false });
  const r = rng(77);
  for (let c = 0; c < 2; c++) for (let i = 0; i < 6; i++) mesh(lumpy(ball(5 + r() * 4, 1.3, 0.75, 0.8), 0.4, 0.2, 340 + c * 10 + i), S.cloud, { pos: [(c ? 10 : -60) + i * 6 - 15, (c ? 96 : 84) + r() * 4, -260], parent: out, cast: false, recv: false });
  for (let i = 0; i < 14; i++) mesh(lumpy(ball(9 + r() * 4, 1, 0.9, 0.8), 0.5, 0.2, 360 + i), i % 2 ? S.hedge : S.hedge2, { pos: [-90 + i * 9, 12 + r() * 5, -85 - r() * 6], parent: out, cast: false });
  for (let i = 0; i < 16; i++) mesh(new RoundedBoxGeometry(1.8, 16, 0.8, 2, 0.4), S.fence, { pos: [-80 + i * 6, 14, -70], parent: out, cast: false });
  mesh(new RoundedBoxGeometry(110, 1.4, 0.7, 2, 0.3), S.fence, { pos: [-30, 18, -70.6], parent: out, cast: false });
  mesh(lumpy(sausage([[0, 0, 0], [1, 30, 0], [-2, 55, 0]], [3.5, 2.6, 2.0]), 0.3, 0.2, 380), S.trunk, { pos: [8, 10, -150], parent: out, cast: false });
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; mesh(lumpy(ball(14 + r() * 5, 1, 0.85, 0.8), 0.6, 0.15, 381 + i), i % 2 ? S.hedge : S.hedge2, { pos: [8 + Math.cos(a) * 16, 72 + Math.sin(a) * 10 + r() * 6, -150 - r() * 8], parent: out, cast: false }); }
  mesh(new THREE.PlaneGeometry(160, 300).rotateX(-Math.PI / 2), clay('#7fb85a', { rough: 0.9, noBoil: true }), { pos: [-50, 4, -200], parent: out, cast: false });
}
// the shelf of white crockery, between the window and the doorway
{
  const y = 44, x0 = 0, x1 = 30, z = WALLZ + 4;
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 1.3, 8, 2, 0.4), 0.05, 0.4, 400), S.wood, { pos: [(x0 + x1) / 2, y, z], parent: scene });
  for (const x of [x0 + 3, x1 - 3]) mesh(lumpy(sausage([[x, y - 0.6, WALLZ + 0.3], [x, y - 3.5, WALLZ + 0.6], [x, y - 0.8, z + 3]], [0.45, 0.45, 0.45], { seg: 10, steps: 16 }), 0.03, 1, 401 + x), S.wood, { parent: scene });
  // plates on edge, leaning back
  for (let i = 0; i < 4; i++) { const p = new THREE.Group(); p.position.set(x0 + 4 + i * 2.2, y + 4.4, WALLZ + 2.4); p.rotation.set(-0.18, 0, 0); scene.add(p); mesh(lumpy(new THREE.CylinderGeometry(4.0, 4.0, 0.45, 32).rotateX(Math.PI / 2), 0.03, 0.8, 410 + i), S.crock, { parent: p }); mesh(new THREE.TorusGeometry(3.7, 0.18, 8, 40), S.crockRim, { pos: [0, 0, 0.26], parent: p, cast: false }); }
  // cups, a jug
  for (let i = 0; i < 3; i++) { const c = new THREE.Group(); c.position.set(x0 + 15 + i * 4.2, y + 0.65, z); scene.add(c); mesh(lumpy(lathe([[0.01, 0], [1.2, 0], [1.45, 2.4], [1.35, 2.5], [1.1, 0.35], [0.01, 0.35]], 28), 0.03, 0.9, 420 + i), S.crock, { parent: c }); mesh(lumpy(new THREE.TorusGeometry(0.6, 0.18, 8, 16), 0.02, 1, 425 + i), S.crock, { pos: [1.5, 1.3, 0], rot: [0, 0, 0], parent: c }); }
  { const j = new THREE.Group(); j.position.set(x1 - 3, y + 0.65, z); scene.add(j); mesh(lumpy(lathe([[0.01, 0], [1.9, 0], [2.3, 2], [1.8, 4.5], [1.6, 5.4], [1.9, 5.8], [1.75, 5.9], [0.01, 5.0]], 32), 0.04, 0.8, 430), S.crock, { parent: j }); mesh(new THREE.TorusGeometry(1.95, 0.2, 8, 32).rotateX(Math.PI / 2), S.crockRim, { pos: [0, 2.6, 0], parent: j, cast: false }); }
}
// a counter with teal cupboards along the back wall's right end, a kettle on it
{
  const x0 = 20, x1 = DX0 - 2.5, top = 22;
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, top - 1.5, 14, 2, 0.6), 0.05, 0.4, 440), S.cupboard, { pos: [(x0 + x1) / 2, (top - 1.5) / 2, WALLZ + 7], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0 + 1, 1.6, 15.5, 2, 0.5), 0.04, 0.4, 441), S.counter, { pos: [(x0 + x1) / 2, top - 0.8, WALLZ + 7.6], parent: scene });
  for (let i = 0; i < 1; i++) { const cx = (x0 + x1) / 2; mesh(lumpy(new RoundedBoxGeometry(13.5, 16, 0.8, 2, 0.4), 0.04, 0.5, 442 + i), S.cupboard, { pos: [cx, 10, WALLZ + 14.3], parent: scene }); mesh(lumpy(sausage([[cx + (i ? -5 : 5), 13, WALLZ + 15], [cx + (i ? -5 : 5), 9, WALLZ + 15]], [0.35, 0.35], { seg: 8, steps: 6 }), 0.02, 1, 445 + i), S.chrome, { parent: scene }); }
  const k = new THREE.Group(); k.position.set(x0 + 7, top, WALLZ + 6); scene.add(k);
  mesh(lumpy(lathe([[0.01, 0], [3.0, 0], [3.4, 1.5], [3.1, 4.5], [2.0, 6.2], [0.8, 6.6], [0.01, 6.6]], 36), 0.05, 0.6, 446), clay('#d6332d', { rough: 0.3, noBoil: true }), { parent: k });
  mesh(lumpy(sausage([[-2.4, 5.4, 0], [0, 8.6, 0], [2.4, 5.4, 0]], [0.45, 0.45, 0.45], { seg: 10, steps: 18 }), 0.03, 1, 447), S.trim, { parent: k });
  mesh(lumpy(sausage([[2.8, 2, 0], [4.6, 3.6, 0], [5.4, 5.2, 0]], [0.9, 0.6, 0.45], { seg: 12, steps: 14 }), 0.03, 1, 448), clay('#d6332d', { rough: 0.3, noBoil: true }), { parent: k });
}
// a retro mint fridge on the left
{
  const x0 = LWX + 2, x1 = LWX + 26, z0 = WALLZ + 1, z1 = WALLZ + 22;
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 72, z1 - z0, 4, 3.5), 0.06, 0.3, 450), S.fridge, { pos: [(x0 + x1) / 2, 36, (z0 + z1) / 2], parent: scene });
  mesh(lumpy(sausage([[x1 - 3, 50, z1 + 0.8], [x1 - 3, 42, z1 + 1.0]], [0.55, 0.55], { seg: 10, steps: 6 }), 0.02, 1, 451), S.chrome, { parent: scene });
  mesh(new RoundedBoxGeometry(x1 - x0 - 1, 0.5, 0.5, 2, 0.2), S.chrome, { pos: [(x0 + x1) / 2, 30, z1 + 0.1], parent: scene });
}
// a wall clock over the shelf
{
  const c = new THREE.Group(); c.position.set(15, 62, WALLZ + 0.6); scene.add(c);
  mesh(lumpy(new THREE.CylinderGeometry(4.6, 4.6, 1.2, 40).rotateX(Math.PI / 2), 0.04, 0.6, 460), clay('#d6332d', { rough: 0.35, noBoil: true }), { parent: c });
  mesh(new THREE.CylinderGeometry(3.9, 3.9, 0.2, 40).rotateX(Math.PI / 2), S.crock, { pos: [0, 0, 0.62], parent: c, cast: false });
  mesh(new RoundedBoxGeometry(0.4, 2.6, 0.15, 1, 0.1), PM.plinth, { pos: [0, 1.1, 0.8], parent: c, cast: false });
  mesh(new RoundedBoxGeometry(0.45, 1.9, 0.15, 1, 0.1), PM.plinth, { pos: [0.75, -0.45, 0.85], rot: [0, 0, 2.1], parent: c, cast: false });
}

// everything stuck to the back wall: hidden from the camera in shot 2 (which stands behind it), still casting
const backSet = [backWall];
{
  const box = new THREE.Box3();
  for (const o of scene.children) { if (!o.isMesh && !o.isGroup) continue; if (o === backWall) continue; box.setFromObject(o); if (box.max.z < WALLZ + 16 && box.min.y > -1 && box.max.x < RWX - 1 && box.min.x > LWX + 1) backSet.push(o); }
}
// the table: four legs, and the gingham cloth draped over it
{
  for (const [x, z] of [[TB.x0 + 2.5, TB.z0 + 2.5], [TB.x1 - 2.5, TB.z0 + 2.5], [TB.x0 + 2.5, TB.z1 - 2.5], [TB.x1 - 2.5, TB.z1 - 2.5]])
    mesh(lumpy(lathe([[0.01, 0], [1.0, 0], [0.85, 4], [1.1, 7], [0.8, 10], [1.05, TOP - 1.2], [0.01, TOP - 1.2]], 20), 0.04, 0.6, 470 + x + z), S.wood, { pos: [x, 0, z], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(TB.x1 - TB.x0, 1.2, TB.z1 - TB.z0, 2, 0.4), 0.03, 0.4, 475), S.wood, { pos: [(TB.x0 + TB.x1) / 2, TOP - 0.7, (TB.z0 + TB.z1) / 2], parent: scene });
  // the cloth: a fine sheet over the top whose overhang folds down, with soft waves at the hem
  const cx = (TB.x0 + TB.x1) / 2, cz = (TB.z0 + TB.z1) / 2, hw = (TB.x1 - TB.x0) / 2 + 0.3, hd = (TB.z1 - TB.z0) / 2 + 0.3, DROP = 5.5;
  const geo = new THREE.PlaneGeometry(2 * hw + 2 * DROP, 2 * hd + 2 * DROP, 140, 100).rotateX(-Math.PI / 2);
  const P = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    uv.setXY(i, x / GING / 4, z / GING / 4);   // 4 checks per texture tile
    const dx = Math.max(0, Math.abs(x) - hw), dz = Math.max(0, Math.abs(z) - hd), d = Math.hypot(dx, dz);
    if (d <= 0) { P.setXYZ(i, x, 0.12, z); continue; }
    const ex = Math.sign(x) * Math.min(Math.abs(x), hw), ez = Math.sign(z) * Math.min(Math.abs(z), hd);
    const nx = dx / d, nz = dz / d;
    const along = Math.abs(nx) > Math.abs(nz) ? z : x;
    const bend = Math.min(d, 0.9);
    const hang = Math.max(0, d - bend);
    const wave = 0.45 * Math.sin(along * 0.55 + (nx > 0 ? 1.3 : 0)) * smooth(0, 4, hang);
    const out = bend * 0.55 + 0.25 * hang / DROP + wave;
    P.setXYZ(i, ex + nx * out, 0.12 - bend * 0.6 - hang, ez + nz * out);
  }
  geo.computeVertexNormals();
  mesh(geo, S.cloth, { pos: [cx, TOP, cz], parent: scene });
}
// Toko's chair, behind the table
const TOKO_HIP = [8, 11.6, -31];
const chair = new THREE.Group(); scene.add(chair);
{
  const [x, , z] = TOKO_HIP;
  mesh(lumpy(new RoundedBoxGeometry(12, 1.4, 11, 2, 0.5), 0.05, 0.4, 480), S.chair, { pos: [0, 9.9, 0], parent: chair });
  for (const [a, b] of [[-5, -4.5], [5, -4.5], [-5, 4.5], [5, 4.5]]) mesh(lumpy(new THREE.CylinderGeometry(0.6, 0.5, 9.4, 12), 0.03, 0.8, 481 + a + b), S.chair, { pos: [a, 4.7, b], parent: chair });
  for (const a of [-5, 5]) mesh(lumpy(new THREE.CylinderGeometry(0.6, 0.6, 17, 12), 0.03, 0.8, 486 + a), S.chair, { pos: [a, 18, -4.8], parent: chair });
  for (const y of [21, 25.5]) mesh(lumpy(new RoundedBoxGeometry(11, 2.2, 0.9, 2, 0.4), 0.03, 0.8, 488 + y), S.chair, { pos: [0, y, -4.9], parent: chair });
  chair.position.set(x, 0, z + 0.5);
}
// the fruit bowl, the phone propped against it
const BOWL = [16.6, TOP, -6.2];
{
  const g = new THREE.Group(); g.position.set(...BOWL); scene.add(g);
  mesh(lumpy(lathe([[0.01, 0], [2.6, 0], [2.7, 0.5], [4.6, 1.6], [5.8, 3.3], [5.6, 3.45], [4.4, 1.9], [2.6, 0.9], [0.01, 0.9]], 48), 0.05, 0.6, 500), S.bowl, { parent: g });
  mesh(new THREE.TorusGeometry(5.0, 0.22, 8, 48).rotateX(Math.PI / 2), S.bowlBand, { pos: [0, 2.35, 0], parent: g, cast: false });
  const fruit = (geo, mat, pos, rot = [0, 0, 0]) => mesh(geo, mat, { pos, rot, parent: g });
  const apple = (x, y, z, m, s) => { fruit(lumpy(ball(1.7, 1.05, 0.92, 1.05), 0.06, 0.8, s), m, [x, y, z]); fruit(lumpy(sausage([[0, 0, 0], [0.15, 0.7, 0], [0.4, 1.0, 0]], [0.12, 0.1, 0.08], { seg: 6, steps: 8, capSteps: 2 }), 0.01, 1, s + 1), S.stem, [x, y + 1.3, z]); };
  apple(-1.8, 2.6, 1.2, S.apple, 510); apple(1.9, 2.7, 1.6, S.apple, 512); apple(0.4, 2.8, -1.9, S.appleG, 514);
  fruit(lumpy(ball(1.95, 1, 0.95, 1), 0.05, 0.8, 516), S.orange, [-2.2, 2.9, -1.6]);
  fruit(lumpy(ball(0.32, 1, 1, 1), 0.01, 1, 517), S.stem, [-2.2, 4.7, -1.6]);
  for (let i = 0; i < 3; i++) { const z = -0.6 + i * 0.75; fruit(lumpy(sausage([[-3.6, 4.0, z], [-1.2, 5.3 + i * 0.15, z * 1.1], [1.6, 5.6 + i * 0.2, z * 1.2], [3.8, 4.7 + i * 0.2, z]], [0.55, 0.85, 0.85, 0.5], { seg: 14, steps: 30, up: [0, 0, 1] }), 0.04, 1, 520 + i), S.banana, [0, -0.6, 0]); }
  fruit(lumpy(sausage([[-3.8, 4.3, 0], [-4.3, 4.7, 0]], [0.28, 0.25], { seg: 8, steps: 6 }), 0.01, 1, 524), S.bananaEnd, [0, -0.6, 0]);
  const r = rng(52); for (let i = 0; i < 9; i++) fruit(lumpy(ball(0.62, 1, 1, 1, 16), 0.02, 1, 530 + i), S.grape, [2.2 + (r() - 0.5) * 1.8, 3.3 + (i % 3) * 0.55, -1.2 + (r() - 0.5) * 1.8]);
}
const phone = new ChatPhone(PM); scene.add(phone.group);
const PHONE_AT = [9.6, TOP + 3.2, -12.6], PHONE_YAW = 0.12, PHONE_LEAN = 0.3;   // screen faces Toko, leaning back on the bowl
phone.group.position.set(...PHONE_AT); phone.group.rotation.set(-PHONE_LEAN, Math.PI + PHONE_YAW, 0, 'YXZ');
phone.group.updateMatrixWorld(true);
const phoneLocal = (v) => phone.group.localToWorld(V(v));
// a dog bed in the corner, empty all film: the dog sleeps under the table
mesh(lumpy(lathe([[0.01, 0], [9, 0], [10.5, 1.5], [10.6, 3.6], [9.2, 4.2], [8.2, 2.4], [0.01, 2.0]], 40), 0.25, 0.3, 540), S.dogbed, { pos: [RWX - 14, 0, 20], scale: [1, 1, 0.8], parent: scene });

// ------------------------------------------------------------------ puppets and props
const toko = new Toko(TM); scene.add(toko.group);
const dog = new Beast(DM, DOG, { seed: 0 }); scene.add(dog.group);
// the sniff: a wrinkle across the top of the muzzle, pressed in only while it sniffs
const wrinkles = [0, 1, 2].map(i => { const y = 1.62 - i * 0.37, z = 2.6 + i * 0.55; return mesh(lumpy(sausage([[-1.05, y - 0.45, z - 0.1], [-0.5, y - 0.05, z], [0, y + 0.08, z + 0.05], [0.5, y - 0.05, z], [1.05, y - 0.45, z - 0.1]], [0.12, 0.18, 0.2, 0.18, 0.12], { seg: 8, steps: 16, capSteps: 2 }), 0.02, 1, 560 + i), DM.ear, { parent: dog.head, cast: false }); });
const stick = pooStick(PM); scene.add(stick);
const flies = [0, 1].map(() => { const f = fly(PM); scene.add(f); return f; });
const flyWires = [0, 1].map(() => mesh(new THREE.BufferGeometry(), PM.wire, { parent: scene, cast: false }));
const stinks = [0, 1, 2].map(() => mesh(new THREE.BufferGeometry(), PM.stink, { parent: scene, cast: false }));
const pig = piggy(PM); scene.add(pig);
const PIG_AT = [-5, TOP, -8];
pig.rotation.y = -Math.PI / 2 - 0.45;
const ham = hammer(PM); scene.add(ham);
const troph = trophy(PM); scene.add(troph);
const spring = mesh(new THREE.BufferGeometry(), PM.spring, { parent: scene, cast: false });
const bubble = bubbleCard(PM); scene.add(bubble);
const bubbleRod = mesh(new THREE.BufferGeometry(), PM.rod, { parent: scene, cast: false });
const COIN_N = 34;
const coins = new THREE.InstancedMesh(coinGeo(), PM.gold, COIN_N); coins.castShadow = true; coins.receiveShadow = true; coins.frustumCulled = false; scene.add(coins);
const CONF_N = 240;
const confMat = new THREE.MeshStandardMaterial({ roughness: 0.55, side: THREE.DoubleSide });
const confetti = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.05, 0.36), confMat, CONF_N); confetti.castShadow = true; confetti.frustumCulled = false; scene.add(confetti);
{ const cols = ['#e2068e', '#f2c94c', '#4fb3a9', '#ff6b4a', '#ffffff', '#7a6cf0', '#5ccf6a', '#ffd23f']; const r = rng(91); for (let i = 0; i < CONF_N; i++) confetti.setColorAt(i, new THREE.Color(cols[(r() * cols.length) | 0])); confetti.instanceColor.needsUpdate = true; }

// ------------------------------------------------------------------ the events, and the physics worked out once
const T_BURST = 4.95, T_SMASH = 9.72, T_RW0 = 14.55, T_RW1 = 15.95;
// confetti: a cannon out of the phone's face, flutter down, land on the cloth or the floor
const CONF = (() => {
  const r = rng(404), DT = 1 / 120, L = 4.0, steps = Math.round(L / DT), every = 10;   // store at 12/s
  const n = phone.group.localToWorld(V([0, 0, 1])).sub(phone.group.position).normalize();
  const o = phoneLocal([0, 0.6, 0.3]);
  const tracks = [];
  for (let i = 0; i < CONF_N; i++) {
    const up = V([0, 1, 0]);
    const dir = n.clone().multiplyScalar(0.55).add(up.clone().multiplyScalar(0.9)).add(V([(r() - 0.5) * 1.3, (r() - 0.2) * 0.4, (r() - 0.5) * 1.3])).normalize();
    const sp = 70 + r() * 90;
    const p = o.clone().add(V([(r() - 0.5) * 1.5, (r() - 0.5) * 2.5, (r() - 0.5) * 0.5])), v = dir.multiplyScalar(sp);
    const rot = new THREE.Euler(r() * 6, r() * 6, r() * 6), w = V([(r() - 0.5) * 22, (r() - 0.5) * 22, (r() - 0.5) * 22]);
    const ph = r() * 6.28, fl = 6 + r() * 10, delay = r() * 0.12;
    let landed = false; const out = [];
    for (let s = 0; s <= steps; s++) {
      const t = s * DT;
      if (t >= delay && !landed) {
        const k = 4.5;
        v.y -= 160 * DT; v.multiplyScalar(Math.exp(-k * DT));
        v.x += Math.sin(t * fl + ph) * 40 * DT; v.z += Math.cos(t * fl * 0.8 + ph) * 40 * DT;
        p.addScaledVector(v, DT);
        rot.x += w.x * DT; rot.y += w.y * DT; rot.z += w.z * DT;
        const onTable = p.x > TB.x0 - 0.5 && p.x < TB.x1 + 0.5 && p.z > TB.z0 - 0.5 && p.z < TB.z1 + 0.5;
        const floorY = onTable ? TOP + 0.2 : 0.05;
        if (p.y <= floorY && v.y < 0) { p.y = floorY; landed = true; rot.x = 0; rot.z = 0; }
      }
      if (s % every === 0) out.push([p.x, p.y, p.z, rot.x, rot.y, rot.z, t >= delay ? 1 : 0]);
    }
    tracks.push(out);
  }
  let land = 0; for (const tr of tracks) { for (let i = 1; i < tr.length; i++) if (tr[i][1] !== tr[i - 1][1] || tr[i][0] !== tr[i - 1][0]) land = Math.max(land, i / 12); }
  return { tracks, L, rate: 12, land: land + 0.1 };
})();
function confettiState(tg) {
  // forward from the burst; after the rewind starts, run back to zero by T_RW1
  if (tg < T_BURST || tg >= T_RW1) return null;
  let tau = tg - T_BURST;
  if (tg >= T_RW0) { const tauEnd = Math.min(CONF.land, T_RW0 - T_BURST); const k = (tg - T_RW0) / (T_RW1 - T_RW0); tau = tauEnd * (1 - k * k * (3 - 2 * k)); }
  return Math.min(CONF.L, tau);
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function placeConfetti(tg) {
  const tau = confettiState(tg);
  confetti.visible = tau !== null;
  if (tau === null) return;
  const f = tau * CONF.rate, i0 = Math.floor(f), k = f - i0;
  for (let i = 0; i < CONF_N; i++) {
    const tr = CONF.tracks[i], a = tr[Math.min(i0, tr.length - 1)], b = tr[Math.min(i0 + 1, tr.length - 1)];
    const x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k), z = lerp(a[2], b[2], k);
    const sc = a[6] ? (tau < 0.05 ? tau / 0.05 : 1) : 0.001;
    _q.setFromEuler(new THREE.Euler(lerp(a[3], b[3], k), lerp(a[4], b[4], k), lerp(a[5], b[5], k)));
    _s.set(sc, sc, sc); _p.set(x, y, z); _m.compose(_p, _q, _s); confetti.setMatrixAt(i, _m);
  }
  confetti.instanceMatrix.needsUpdate = true;
}
// coins and pig shards: a burst from the pig at the smash, bouncing on the cloth
const COINS = (() => {
  const r = rng(707), DT = 1 / 240, L = 3.5, steps = Math.round(L / DT), every = 20;
  const c0 = V([PIG_AT[0], PIG_AT[1] + 4.6, PIG_AT[2]]);
  const tracks = [];
  for (let i = 0; i < COIN_N; i++) {
    const a = r() * 6.28, up = 0.6 + r() * 0.9, sp = 40 + r() * 55;
    const v = V([Math.cos(a) * sp, up * sp * 1.2, Math.sin(a) * sp * 0.8 + 12]);
    if (v.x > 0) v.x *= 0.5;   // keep most of them on the table, away from the dog's corner
    const p = c0.clone().add(V([(r() - 0.5) * 3, (r() - 0.5) * 2, (r() - 0.5) * 3]));
    const rot = V([r() * 6, r() * 6, r() * 6]), w = V([(r() - 0.5) * 30, (r() - 0.5) * 10, (r() - 0.5) * 30]);
    const out = []; let rest = false;
    const spin = i === 0;   // one coin rolls on its edge and wobbles down
    for (let s = 0; s <= steps; s++) {
      if (!rest) {
        v.y -= 520 * DT; p.addScaledVector(v, DT);
        rot.addScaledVector(w, DT);
        const onTable = p.x > TB.x0 && p.x < TB.x1 && p.z > TB.z0 && p.z < TB.z1;
        const fy = (onTable ? TOP + 0.25 : 0.12);
        if (p.y < fy && v.y < 0) {
          p.y = fy; v.y *= -0.33; v.x *= 0.62; v.z *= 0.62; w.multiplyScalar(0.5);
          if (Math.abs(v.y) < 9) { v.y = 0; rest = true; }
        }
      } else {
        // sliding to a stop; rotations settle flat
        v.multiplyScalar(Math.exp(-7 * DT)); p.addScaledVector(V([v.x, 0, v.z]), DT);
        rot.x = lerp(rot.x, Math.round(rot.x / Math.PI) * Math.PI, 0.05); rot.z = lerp(rot.z, Math.round(rot.z / Math.PI) * Math.PI, 0.05); rot.y += w.y * DT * 0.2;
      }
      if (s % every === 0) out.push([p.x, p.y, p.z, rot.x, rot.y, rot.z]);
    }
    tracks.push(out);
  }
  return { tracks, L, rate: 12 };
})();
function placeCoins(tg) {
  coins.visible = tg >= T_SMASH;
  if (!coins.visible) return;
  const f = Math.min(COINS.L, tg - T_SMASH) * COINS.rate, i0 = Math.floor(f);
  for (let i = 0; i < COIN_N; i++) {
    const a = COINS.tracks[i][Math.min(i0, COINS.tracks[i].length - 1)];
    let rx = a[3], rz = a[5], y = a[1];
    if (i === 0) {   // the roller: on its edge from 0.6 s, rolling, then wobbling down by 2.4 s
      const u = tg - T_SMASH;
      if (u > 0.6) { const k = smooth(0.6, 2.5, u); rx = Math.PI / 2 * (1 - k) + Math.sin(u * (8 + 22 * k)) * 0.25 * k * (1 - k) * 4; rz = 0; y = TOP + 0.25 + 0.6 * (1 - k); }
    }
    _q.setFromEuler(new THREE.Euler(rx, a[4], rz)); _s.set(1, 1, 1); _p.set(a[0], y, a[2]); _m.compose(_p, _q, _s); coins.setMatrixAt(i, _m);
  }
  coins.instanceMatrix.needsUpdate = true;
}
const SHARDS = (() => {
  const r = rng(808), DT = 1 / 240, L = 3.0, steps = Math.round(L / DT), every = 20;
  return pig.userData.pieces.map((pc, i) => {
    const home = pc.userData.home.clone().applyAxisAngle(V([0, 1, 0]), pig.rotation.y);
    const d = home.clone().normalize();
    const v = V([d.x * (35 + r() * 30), 30 + r() * 45 + d.y * 25, d.z * (35 + r() * 30)]);
    const p = home.clone().add(V([PIG_AT[0], PIG_AT[1] + pig.userData.base, PIG_AT[2]]));
    const rot = V([0, 0, 0]), w = V([(r() - 0.5) * 18, (r() - 0.5) * 18, (r() - 0.5) * 18]);
    const out = []; let rest = false;
    for (let s = 0; s <= steps; s++) {
      if (!rest) {
        v.y -= 520 * DT; p.addScaledVector(v, DT); rot.addScaledVector(w, DT);
        const onTable = p.x > TB.x0 && p.x < TB.x1 && p.z > TB.z0 && p.z < TB.z1;
        const fy = (onTable ? TOP : 0) + 1.2;
        if (p.y < fy && v.y < 0) { p.y = fy; v.y *= -0.25; v.x *= 0.5; v.z *= 0.5; w.multiplyScalar(0.35); if (Math.abs(v.y) < 8) rest = true; }
      } else { v.multiplyScalar(Math.exp(-9 * DT)); p.addScaledVector(V([v.x, 0, v.z]), DT); }
      if (s % every === 0) out.push([p.x, p.y, p.z, rot.x, rot.y, rot.z]);
    }
    return out;
  });
})();
function placePig(tg) {
  pig.position.set(PIG_AT[0], PIG_AT[1] + pig.userData.base, PIG_AT[2]);
  const pcs = pig.userData.pieces;
  if (tg < T_SMASH) {
    // squash under the hammer's approach? no: it sits, pleased with itself, until the blow
    pcs.forEach(pc => { pc.position.copy(pc.userData.home); pc.rotation.set(0, 0, 0); });
    return;
  }
  const f = Math.min(3.0, tg - T_SMASH) * 12, i0 = Math.floor(f);
  const inv = new THREE.Matrix4().makeRotationY(-pig.rotation.y);
  pcs.forEach((pc, i) => {
    const a = SHARDS[i][Math.min(i0, SHARDS[i].length - 1)];
    const w = V([a[0], a[1], a[2]]).sub(pig.position).applyMatrix4(inv);
    pc.position.copy(w); pc.rotation.set(a[3], a[4], a[5]);
  });
}
// the trophy on its spring: up at the burst, down at the end of the rewind
function trophyK(tg) { if (tg < T_BURST + 0.05) return 0; if (tg < T_RW0) return pop(T_BURST + 0.05, 0.6, tg); return 1 - smooth(T_RW1 - 0.55, T_RW1 - 0.05, tg); }
function bubbleK(tg) { if (tg < 5.3) return 0; if (tg < T_RW0) return pop(5.3, 0.6, tg); return 1 - smooth(T_RW0 + 0.1, T_RW1 - 0.25, tg); }
function screenState(tg) {
  const st = { typing: -1, reply: 0, flash: 0 };
  if (tg < 4.4) return st;
  if (tg < T_BURST) { st.typing = Math.round((tg - 4.4) * 12) / 12; return st; }
  if (tg < T_RW1 - 0.2) { st.reply = Math.round(Math.min(1, (tg - T_BURST) * 3) * 12) / 12; st.flash = Math.round(Math.max(0, 1 - (tg - T_BURST) / 0.6) * 12) / 12; return st; }
  st.typing = -1; return st;
}

// ------------------------------------------------------------------ light
const hemi = new THREE.HemisphereLight('#d5ecff', '#f2d27a', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0cf', 5.0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -90, near: 1, far: 600 });
sun.position.set(-110, 230, -330); sun.target.position.set(-6, 0, -4); scene.add(sun, sun.target); sun.shadow.camera.layers.enable(1);
const key = new THREE.SpotLight('#fff4e6', 60000, 0, 0.75, 0.9, 2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 20; key.shadow.camera.far = 500;
key.position.set(70, 120, 150); key.target.position.set(4, 16, -14); scene.add(key, key.target); key.shadow.camera.layers.enable(1);
const fill = new THREE.PointLight('#ffe9c8', 5000, 0, 2); fill.position.set(-50, 70, 110); scene.add(fill);
const bounce = new THREE.PointLight('#ffd98a', 1200, 0, 2); bounce.position.set(0, 4, 40); scene.add(bounce);
const screenLight = new THREE.PointLight('#e8fff8', 0, 0, 2); scene.add(screenLight);
const hallLight = new THREE.PointLight('#9fb4d8', 300, 0, 2); hallLight.position.set((DX0 + DX1) / 2 + 10, 40, WALLZ - 30); scene.add(hallLight);

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
const D_HEADUP = { ...D_LIE, na: 0.55, hp: -0.05, shut: 0.35, ear: 0.1, fy: 5.4 };
/** an old dog's walk: a slow four-beat, the head carried low */
function dogWalk(ph, o = {}) {
  const st = stance(DOG), g = trot(ph, { stride: o.stride ?? 5.2, lift: o.lift ?? 1.8, duty: 0.68, off: { lf: 0, rh: 0.25, rf: 0.5, lh: 0.75 } });
  const L = {}; for (const k of ['lf', 'rf', 'lh', 'rh']) L[k] = { f: add3(st[k], [0, g[k].dy, g[k].dz]) };
  return { ...D_STAND, legs: L, bob: Math.cos(ph * Math.PI * 4) * 0.25, na: o.na ?? 0.62, hp: o.hp ?? 0.3, tu: 0.15, wag: Math.sin(ph * Math.PI * 2) * 0.12, ear: 0, earFlop: 0.06 * Math.sin(ph * Math.PI * 4), shut: o.shut ?? 0.3 };
}
const WALK_STRIDE = 5.2, WALK_PER = 0.62;              // cm per stride, s per cycle
const WALK_V = trotAdvance(WALK_STRIDE, 0.68) / WALK_PER;
const breath = (tp, per = 3.0) => 0.5 + 0.5 * Math.sin(tp * Math.PI * 2 / per);
// the dog asleep under the table, its head out past the cloth at the right
const SLEEP = { x: 7, z: -9, h: Math.PI / 2 };

/** Toko seated; figure-frame points for arms go through at() */
function seat(o = {}) {
  const hip = o.hip || TOKO_HIP, yaw = o.yaw || 0;
  const R = (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
  const at = (v) => add3(hip, R(v));
  return { hip, yaw, at, lean: 0.16, side: 0, knee: [0, 1.4, 11.5], foot: [0, -10.6, 13.5], hp: 0.2, hr: 0, hy: 0,
    elR: at([-6.4, 6.6, 3.6]), hdR: at([-3.2, 6.9, 10.5]), elL: at([6.4, 6.6, 3.6]), hdL: at([3.2, 6.9, 10.5]), palm: [[0.2, 1, 0.3], [-0.2, 1, 0.3]] };
}

// ------------------------------------------------------------------ cameras
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
// sp is shot time quantised to twos; tg the global time on twos
const SHOTS = [
  // 1 — the presentation. Toko behind the table holds the poo up to his phone; the flies circle on their
  //     wires; the old dog sleeps under the table, its head out past the cloth. Slow push in.
  {
    cam: (s) => { const k = smooth(0, 4.4, s); return { ...frameCam({ T: [8, 20, -12], at: [540, 1190], az: lerp(-5, -2, k), el: lerp(10, 9, k), D: lerp(140, 126, k), fov: 30 }), focus: [2, 28, -20], ap: 6 }; },
    pose: (sp) => shot1(sp),
  },
  // 2 — over Toko's right shoulder onto the phone: typing… then the burst — confetti, the trophy on its
  //     spring, the bubble rising on its rod. Locked off, a breath of push.
  {
    cam: (s) => { const k = smooth(0, 4.8, s); const T = phoneLocal([0, 0, 0]).toArray(); return { ...frameCam({ T, at: [560, lerp(1470, 1460, k)], az: 191, el: 50, D: lerp(44, 42, k), fov: 30 }), focus: T, ap: 8, hideBack: true, hideHead: true }; },
    pose: (sp) => shot2(sp),
  },
  // 3 — the smash: Toko winds up and brings the hammer down on the pig; coins everywhere; arms up.
  {
    cam: (s) => ({ ...frameCam({ T: [1, 22, -14], at: [540, 1190], az: -6, el: 11, D: 124, fov: 30 }), focus: [0, 24, -16], ap: 6 }),
    pose: (sp) => shot3(sp),
  },
  // 4 — the dog wakes, comes out from under the table and pads to Toko; he lowers the stick to it; it sniffs
  //     once, nose wrinkling — while on the table the confetti and the trophy run backwards into the phone.
  {
    cam: (s) => ({ ...frameCam({ T: [26, 19, -20], at: [540, 1230], az: 4, el: 8, D: 160, fov: 30 }), focus: [24, 21, -24], ap: 6 }),
    pose: (sp) => shot4(sp),
  },
  // 5 — the dog turns away and walks out through the doorway; Toko watches it go, stick still raised.
  {
    cam: (s) => { const k = smooth(3.0, 4.8, s); return { ...frameCam({ T: mix([28, 22, -26], [25, 24, -30], k), at: [540, 1190], az: lerp(4, 6, k), el: lerp(8, 7, k), D: lerp(168, 148, k), fov: 30 }), focus: mix([30, 22, -30], [12, 28, -30], k), ap: 5 }; },
    pose: (sp) => shot5(sp),
  },
];

// shot 1: lift the stick into the presentation, twirl it, the free hand says "ta-da"
function shot1(sp) {
  const P = seat();
  const at = P.at;
  const up = eout(0.25, 1.0, sp), twirl = smooth(1.3, 3.6, sp), tada = smooth(1.9, 2.4, sp) * (1 - smooth(3.7, 4.2, sp));
  const bob = Math.sin(clamp((sp - 1.0) / 0.5) * Math.PI) * 0.6;
  P.elL = mix(at([6.6, 6.6, 3.6]), at([8.6, 9.0, 6.0]), up);
  P.hdL = mix(at([3.2, 6.9, 10.5]), at([7.6, 12.4 + bob, 12.0]), up);
  P.elR = mix(at([-6.4, 6.6, 3.6]), at([-8.4, 8.0, 5.0]), tada);
  P.hdR = mix(at([-3.2, 6.9, 10.5]), at([-7.4, 11.4, 9.8]), tada);
  P.palm = [tada > 0.5 ? [0.3, 0.4, 1] : [0.2, 1, 0.3], [-0.5, 0.2, 0.3]];
  P.lean = lerp(0.16, 0.24, up); P.hp = lerp(0.24, 0.1, up); P.hy = lerp(0, 0.34, up); P.hr = lerp(0, -0.1, up) - 0.06 * Math.sin(sp * 2.4) * up;
  P.breathe = breath(sp);
  const dir = mix([0.1, 1, 0.12], [0.2, 1, 0.26], up);
  return { toko: P, stickHand: 1, stickDir: dir, stickSpin: twirl * Math.PI * 2, dog: sleeping(sp) };
}
function sleeping(sp, earT = 2.6) { return { at: SLEEP, P: { ...D_LIE, breathe: breath(sp, 2.8), earFlop: sp > earT && sp < earT + 0.35 ? 0.5 : 0, hp: 0.12 } }; }
// shot 2: the stick held proudly in the right hand; a little bounce at the burst, another at the bubble
function shot2(sp) {
  const P = seat(); const at = P.at;
  const tg = sp + CUTS[1];
  const b1 = Math.sin(clamp((tg - T_BURST) / 0.3) * Math.PI) * 0.8, b2 = Math.sin(clamp((tg - 5.5) / 0.3) * Math.PI) * 0.5;
  P.elL = at([8.6, 8.0, 6.0]); P.hdL = at([5.0, 7.6 + b1 + b2, 12.6]);
  P.elR = at([-6.4, 6.6, 3.6]); P.hdR = at([-3.2, 6.9, 10.5]);
  P.palm = [[0.2, 1, 0.3], [-0.5, 0.2, 0.3]];
  P.lean = 0.26 + b1 * 0.04; P.hp = 0.12; P.hy = 0.34; P.hr = -0.08; P.breathe = breath(sp);
  return { toko: P, noStink: true, stickHand: 1, stickDir: [0.03, 1, -0.17], stickSpin: Math.PI * 2, dog: sleeping(sp + 4.4, 99) };
}
// shot 3: hammer in the left, stick in the right; wind up, SMASH, both arms up
function shot3(sp) {
  const P = seat(); const at = P.at;
  const tg = sp + CUTS[2], u = tg - T_SMASH;
  const wind = smooth(0, 0.45, sp), strike = clamp((u + 0.08) / 0.08), cheer = smooth(0.9, 1.4, u);
  const STRIKE = [-0.05, -0.36, 1], sl = Math.hypot(...STRIKE), sd = STRIKE.map(v => v / sl);
  const HIT = [PIG_AT[0] - sd[0] * 7.6, PIG_AT[1] + 9.1 - sd[1] * 7.6, PIG_AT[2] - 0.5 - sd[2] * 7.6];
  let hdR, elR;
  const raised = at([-5.6, 17.5, 4.5]), high = at([-5.0, 20, 2.6]);
  if (u < -0.08) { hdR = mix(raised, high, wind); elR = at([-8.4, 12, 1.5]); }
  else if (u < 0.9) { hdR = mix(high, HIT, strike); elR = mix(at([-8.4, 12, 1.5]), at([-8.6, 8.6, 5.2]), strike); if (u > 0.25) { hdR = mix(HIT, add3(HIT, [0, 1.6, -0.8]), smooth(0.25, 0.6, u)); } }
  else { const hit = add3(HIT, [0, 1.6, -0.8]); hdR = mix(hit, at([-6.2, 18.5, 5.0]), cheer); elR = mix(at([-8.6, 8.6, 5.2]), at([-8.8, 13.0, 3.6]), cheer); }
  P.hdR = hdR; P.elR = elR;
  P.elL = mix(at([6.6, 7.4, 4.0]), at([8.8, 13, 3.6]), cheer); P.hdL = mix(at([5.0, 9.4, 9.4]), at([6.6, 18.5, 5.4]), cheer);
  P.palm = [[0.6, 0.1, 0.3], [-0.6, 0.1, 0.3]];
  P.lean = u < 0 ? lerp(0.16, 0.06, wind) : lerp(0.34, 0.2, smooth(0, 0.6, u)) - cheer * 0.12;
  P.hp = u < 0 ? -0.05 : lerp(0.35, 0.1, smooth(0.1, 0.8, u)) - cheer * 0.25; P.hy = -0.3 * (1 - cheer); P.hr = cheer * 0.12 * Math.sin(u * 9);
  P.breathe = breath(sp);
  const hamDir = u < -0.08 ? [-0.25, 0.3, -1] : u < 0.9 ? mix([-0.25, 0.3, -1], STRIKE, strike) : mix(STRIKE, [-0.15, 1, -0.2], cheer);
  return { toko: P, stickHand: 1, stickDir: mix([0.25, 1, 0.3], [0.2, 1, -0.1], cheer), stickSpin: Math.PI * 2, hammer: { dir: hamDir, hand: 0 }, dog: sleeping(sp + 9.2, 1.4) };
}
// shot 4: the dog wakes, comes out, curves round to Toko, sniffs once
const D4 = { x0: SLEEP.x, z0: SLEEP.z, stop: [45, -22], hStop: -Math.PI / 2 + 0.3 };
function dog4(sp) {
  // 0–0.45 head up, 0.45–0.95 stands, 0.95–2.0 walks out and curves round, then stands; sniff at 2.05
  const tWake = 0.45, tStand = 0.95, tStop = 2.0;
  if (sp < tWake) return { at: SLEEP, P: blend(D_LIE, D_HEADUP, smooth(0.0, tWake, sp)) };
  if (sp < tStand) return { at: SLEEP, P: blend(D_HEADUP, { ...D_STAND, na: 0.6, hp: 0.3, shut: 0.3, tu: 0.1 }, smooth(tWake, tStand, sp)) };
  // the path: a quadratic from the sleeping spot, out along +x, round to the stop
  const u = smooth(tStand, tStop, sp) * 0.5 + clamp((sp - tStand) / (tStop - tStand)) * 0.5;
  const A = [SLEEP.x, SLEEP.z], Bc = [54, -4], C = D4.stop;
  const q = (t) => [(1 - t) ** 2 * A[0] + 2 * (1 - t) * t * Bc[0] + t * t * C[0], (1 - t) ** 2 * A[1] + 2 * (1 - t) * t * Bc[1] + t * t * C[1]];
  const p = q(u), p2 = q(Math.min(1, u + 0.02));
  let h = u < 0.98 ? Math.atan2(p2[0] - p[0], p2[1] - p[1]) : D4.hStop;
  if (u > 0.8) h = Math.atan2(p2[0] - p[0], p2[1] - p[1]) + wrapA(D4.hStop - Math.atan2(p2[0] - p[0], p2[1] - p[1])) * smooth(0.8, 1, u);
  if (sp < tStop) return { at: { x: p[0], z: p[1], h }, P: dogWalk((sp - tStand) / WALK_PER) };
  // standing at Toko's knee: neck out to the stick, the sniff, the wrinkle, a flat look
  const s1 = 2.1, s2 = 2.55;
  const reach = smooth(tStop, s1, sp), back = smooth(s2, s2 + 0.25, sp);
  const sn = sp > s1 && sp < s2 ? Math.abs(Math.sin((sp - s1) / (s2 - s1) * Math.PI * 3)) : 0;
  const settle = blend(dogWalk((tStop - tStand) / WALK_PER), D_STAND, smooth(tStop, tStop + 0.3, sp));
  return {
    at: { x: C[0], z: C[1], h: D4.hStop },
    P: { ...settle, na: lerp(0.62, 0.98, reach) + back * 0.12, hp: lerp(0.3, 0.02, reach) - back * 0.2, hy: 0, ny: 0, tu: 0.1, wag: 0, shut: lerp(0.3, 0.15, reach) + back * 0.35 + sn * 0.25, brow: back * -0.4, ear: back * 0.1, earFlop: 0, breathe: breath(sp) },
    wrinkle: sp > s1 - 0.05 && sp < s2 + 0.35 ? (sp < s2 ? 1 : 1 - (sp - s2) / 0.35) : 0, nose: sn,
  };
}
// where the poo must be for the sniff: at the dog's nose at full reach (worked out once, from the rig)
const STICK4 = (() => { const d = [0.9, 0.36, 0.22], l = Math.hypot(...d); return d.map(v => v / l); })();
let POO4 = null;
function poo4() {
  if (POO4) return POO4;
  const d = dog4(2.3);
  dog.group.position.set(d.at.x, 0, d.at.z); dog.group.rotation.y = d.at.h; dog.pose(d.P);
  const n = dog.headPoint([0, -0.4, 6.6]), f = V([Math.sin(d.at.h), 0, Math.cos(d.at.h)]);
  POO4 = n.addScaledVector(f, 1.6).add(V([0, 0.6, 0])).toArray();
  return POO4;
}
function shot4(sp) {
  const yaw = 0.62;
  const P = seat({ yaw }); const at = P.at;
  const offer = smooth(0.9, 1.9, sp);
  // the stick is held out level toward the dog, its poo where the nose will be
  const hand = add3(poo4(), STICK4.map(v => -v * 10.6));
  P.elL = mix(at([6.6, 7.2, 3.8]), add3(hand, [-2.5, -2.8, -5.5]), offer);
  P.hdL = mix(at([4.6, 8.4, 9.0]), hand, offer);
  P.elR = at([-6.4, 6.6, 3.6]); P.hdR = at([-2.4, 6.9, 10.5]);
  P.palm = [[0.2, 1, 0.3], [-0.5, 0.2, 0.3]];
  P.lean = lerp(0.18, 0.36, offer); P.hp = lerp(0.2, 0.26, offer); P.hy = lerp(0.0, 0.5, offer); P.hr = smooth(2.7, 3.1, sp) * -0.18;
  P.breathe = breath(sp);
  const d = dog4(sp);
  return { toko: P, stickHand: 1, stickDir: mix([0.15, 1, 0.1], STICK4, offer), stickSpin: Math.PI * 2, dog: d };
}
// shot 5: the dog turns away and walks out of the doorway; Toko's head follows; the stick stays up
const PATH5 = [[45, -22], [45.5, -44], [50, -54], [96, -60]];
const PATH5L = (() => { const L = [0]; for (let i = 1; i < PATH5.length; i++) L.push(L[i - 1] + Math.hypot(PATH5[i][0] - PATH5[i - 1][0], PATH5[i][1] - PATH5[i - 1][1])); return L; })();
function along5(d) {
  // a smoothed polyline: position and heading at distance d
  const at = (dd) => { dd = clamp(dd, 0, PATH5L[PATH5L.length - 1]); let i = 1; while (i < PATH5L.length - 1 && PATH5L[i] < dd) i++; const k = (dd - PATH5L[i - 1]) / (PATH5L[i] - PATH5L[i - 1]); return [lerp(PATH5[i - 1][0], PATH5[i][0], k), lerp(PATH5[i - 1][1], PATH5[i][1], k)]; };
  const a = at(d - 4), b = at(d), c = at(d + 4);
  return { x: (a[0] + 2 * b[0] + c[0]) / 4, z: (a[1] + 2 * b[1] + c[1]) / 4, h: Math.atan2(c[0] - a[0], c[1] - a[1]) };
}
function dog5(sp) {
  const C = D4.stop, h0 = D4.hStop;
  const tTurn = 0.8;
  const first = along5(0.5);
  if (sp < tTurn) {
    const k = smooth(0.05, tTurn, sp);
    const h = h0 + wrapA(first.h - h0) * k;
    return { at: { x: C[0], z: C[1], h }, P: { ...dogWalk(sp / WALK_PER * 0.8, { stride: 2.0 }), shut: 0.45, hp: 0.35 } };
  }
  const PER5 = 0.42, V5 = trotAdvance(WALK_STRIDE, 0.68) / PER5;
  const p = along5(V5 * (sp - tTurn));
  return { at: p, P: { ...dogWalk((sp - tTurn) / PER5 + 0.6), shut: 0.4, na: 0.55, hp: 0.36, tu: 0.05 } };
}
function shot5(sp) {
  const yaw = 0.62;
  const P = seat({ yaw }); const at = P.at;
  const d = dog5(sp);
  // Toko keeps the stick up where the dog left it; his head follows the dog to the door
  const lift = smooth(0.6, 1.6, sp);
  P.elL = mix(at([7.6, 6.0, 6.0]), at([8.8, 9.6, 6.2]), lift); P.hdL = mix(at([6.6, 6.2, 13.2]), at([7.8, 13.4, 12.6]), lift);
  P.elR = at([-6.4, 6.6, 3.6]); P.hdR = at([-2.4, 6.9, 10.5]);
  P.palm = [[0.2, 1, 0.3], [-0.5, 0.2, 0.3]];
  const dogAng = Math.atan2(d.at.x - TOKO_HIP[0], d.at.z - TOKO_HIP[2]);
  const look = clamp(wrapA(dogAng - yaw), -0.2, 0.95);
  P.lean = 0.36 - smooth(3.8, 4.6, sp) * 0.08; P.hp = 0.24 + smooth(3.8, 4.6, sp) * 0.12; P.hy = lerp(0.25, look * 0.85, smooth(0.3, 1.4, sp)); P.hr = -0.12 + smooth(3.9, 4.5, sp) * 0.05;
  P.breathe = breath(sp);
  return { toko: P, stickHand: 1, stickDir: mix([0.55, 0.62, 0.35], [0.3, 1, 0.25], lift), stickSpin: Math.PI * 2, dog: d };
}

const CAM2 = SHOTS[1].cam(2.4);
// ------------------------------------------------------------------ rigging a state into the scene
let lastKey = '';
function setShot(k, s, t) {
  const sh = SHOTS[k];
  const e = Math.floor(t * POSE_FPS + 1e-6), tg = e / POSE_FPS, sp = tg - CUTS[k];
  const poseKey = `${k}:${e}`;
  if (poseKey !== lastKey) {
    lastKey = poseKey;
    setBoil(e);
    const P = sh.pose(Math.max(0, sp));
    toko.group.visible = !!P.toko;
    if (P.toko) toko.pose(P.toko);
    chair.position.set(TOKO_HIP[0], 0, TOKO_HIP[2] + 0.5); chair.rotation.y = P.toko ? P.toko.yaw : 0;
    // the dog
    dog.group.visible = !!P.dog;
    if (P.dog) { dog.group.position.set(P.dog.at.x, 0, P.dog.at.z); dog.group.rotation.y = P.dog.at.h; dog.pose(P.dog.P); }
    const wr = (P.dog && P.dog.wrinkle) || 0;
    wrinkles.forEach((m, i) => { m.visible = wr > 0.02; m.scale.setScalar(Math.max(0.01, wr)); });
    if (dog.nose) { const n = (P.dog && P.dog.nose) || 0; dog.nose.scale.set(1 + n * 0.12, 1 - n * 0.22, 1 - n * 0.1); }
    // the stick, in a hand
    const hand = toko.hands[P.stickHand || 0]; hand.updateMatrixWorld(true);
    const base = hand.getWorldPosition(new THREE.Vector3());
    const dir = V(P.stickDir).normalize();
    stick.position.copy(base).addScaledVector(dir, -3.2);
    stick.quaternion.setFromUnitVectors(V([0, 1, 0]), dir);
    stick.rotateY(P.stickSpin || 0);
    stick.updateMatrixWorld(true);
    // flies on their wires round the poo, and the stink lines rising off it
    const mid = stick.localToWorld(V([0, stick.userData.mid, 0])), topP = stick.localToWorld(V([0, stick.userData.top, 0]));
    flies.forEach((f, i) => {
      const a = tg * (i ? -4.1 : 3.4) + i * 2.6, rad = 4.6 + 0.6 * Math.sin(tg * 2.3 + i);
      const p = mid.clone().add(V([Math.cos(a) * rad, 2.2 + Math.sin(tg * 3.1 + i * 1.7) * 1.3 + i * 1.2, Math.sin(a) * rad]));
      f.position.copy(p);
      const tang = V([-Math.sin(a), 0, Math.cos(a)]).multiplyScalar(i ? -1 : 1);
      f.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(V([0, 0, 0]), tang, V([0, 1, 0])));
      f.rotateY(Math.PI);
      f.userData.wings.forEach((w, j) => { w.rotation.z = (j ? 1 : -1) * (0.3 + 0.6 * ((e + i) % 2)); });
      const w0 = mid.clone().add(V([0, -0.8, 0])), wm = mid.clone().lerp(p, 0.55).add(V([0, -1.1, 0]));
      flyWires[i].geometry.dispose(); flyWires[i].geometry = sausage([w0.toArray(), wm.toArray(), p.toArray()], [0.045, 0.045, 0.045], { seg: 5, steps: 14, capSteps: 1 });
    });
    stinks.forEach(m => (m.visible = !P.noStink));
    stinks.forEach((m, i) => {
      const pts = [], r = [];
      const ox = (i - 1) * 1.5, ph = tg * 4 + i * 2.1;
      for (let j = 0; j <= 6; j++) { const yy = 1.0 + j * 0.85; pts.push(topP.clone().add(V([ox + Math.sin(ph + j * 1.3) * 0.55, yy, (i - 1) * 0.6])).toArray()); r.push(0.2 - j * 0.02); }
      m.geometry.dispose(); m.geometry = sausage(pts, r, { seg: 8, steps: 30, capSteps: 2 });
    });
    // the hammer
    ham.visible = !!P.hammer;
    if (P.hammer) {
      const hh = toko.hands[P.hammer.hand]; hh.updateMatrixWorld(true);
      ham.position.copy(hh.getWorldPosition(new THREE.Vector3()));
      ham.quaternion.setFromUnitVectors(V([0, 1, 0]), V(P.hammer.dir).normalize());
      ham.position.addScaledVector(V(P.hammer.dir).normalize(), -1.6);
    }
    // the pig, the coins, the confetti
    placePig(tg); placeCoins(tg); placeConfetti(tg);
    // the trophy on its spring, out of the top of the phone
    const tk = trophyK(tg);
    troph.visible = spring.visible = tk > 0.01;
    if (troph.visible) {
      const baseP = phoneLocal([1.0, phone.h / 2 - 0.2, -0.1]);
      const ext = 0.2 + 3.4 * tk;
      const wob = tg < T_RW0 ? Math.exp(-(tg - T_BURST) * 1.6) * Math.sin((tg - T_BURST) * 13) * 0.3 : 0;
      const top = baseP.clone().add(V([wob * 2, ext, 0]));
      troph.position.copy(top); troph.rotation.set(0, PHONE_YAW + Math.PI + 0.5, wob); troph.scale.setScalar(0.78 * Math.max(0.02, Math.min(1, tk * 1.2)));
      const pts = []; const turns = 6, N = 60;
      for (let i = 0; i <= N; i++) { const u = i / N, a = u * turns * Math.PI * 2; pts.push([baseP.x + Math.cos(a) * 0.5 + wob * 2 * u, baseP.y + u * ext, baseP.z + Math.sin(a) * 0.5]); }
      spring.geometry.dispose(); spring.geometry = sausage(pts, [0.09, 0.09], { seg: 6, steps: 240, capSteps: 1 });
    }
    // the bubble on its rod
    const bk = bubbleK(tg);
    bubble.visible = bubbleRod.visible = bk > 0.01;
    if (bubble.visible) {
      const baseP = phoneLocal([-0.6, phone.h / 2 - 0.4, -0.1]);
      const rise = 0.4 + 1.5 * bk;
      const tip = baseP.clone().add(V([2.2, rise, 0.4]));
      bubble.position.copy(tip); bubble.scale.setScalar(Math.max(0.02, Math.min(1.08, bk)));
      bubble.userData.tip = tip;
      bubbleRod.geometry.dispose(); bubbleRod.geometry = sausage([baseP.toArray(), tip.toArray()], [0.12, 0.12], { seg: 8, steps: 4, capSteps: 1 });
    }
    // the phone's screen
    phone.paint(screenState(tg), 1.25);
  }
  // camera, every frame
  const c = window.__camOverride || sh.cam(s);
  for (const o of backSet) o.traverse(m => m.layers.set(c.hideBack ? 1 : 0));
  for (const o of [toko.head, toko.hood]) o.traverse(m => m.layers.set(c.hideHead ? 1 : 0));
  camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); camera.lookAt(...c.look); camera.updateProjectionMatrix();
  // the bubble faces the camera of the shot it was made for, and keeps that face after
  if (bubble.visible) bubble.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(V(CAM2.pos), bubble.position, V([0, 1, 0])));
  // light: the phone glows on whoever is looking at it
  const st = screenState(tg);
  screenLight.position.copy(phoneLocal([0, 0, 3])); screenLight.intensity = 60 + 260 * st.flash;
  scene.updateMatrixWorld(true);
  return { focus: camera.position.distanceTo(V(c.focus)), ap: c.ap };
}

function draw(k, s, t) {
  const f = setShot(k, s, t);
  post.render(scene, camera, {
    focus: f.focus, aperture: f.ap, maxBlur: TUNE.maxBlur, radScale: TUNE.radScale, noTile: TUNE.noTile,
    threshold: 1.6, knee: 0.5, bloomA: 0.22, bloomB: 0.1,
    exposure: TUNE.exp, vignette: 0.32, grain: 0.025, seed: t * 37 % 97,
    sat: 1.08, contrast: 1.05, lift: [0.012, 0.01, 0.008], gain: [1.02, 1.0, 0.97], toe: 0.04,
  });
}
function shotAt(t) { for (let k = 0; k < 5; k++) if (t < CUTS[k + 1] || k === 4) return k; }

function probe(k, s) {
  lastKey = ''; draw(k, s, CUTS[k] + s);
  const P = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * 1080), Math.round((1 - p.y) / 2 * 1920)]; };
  const o = {};
  if (toko.group.visible) { o.tokoMask = P(toko.mask.getWorldPosition(new THREE.Vector3())); o.handR = P(toko.hands[0].getWorldPosition(new THREE.Vector3())); o.handL = P(toko.hands[1].getWorldPosition(new THREE.Vector3())); }
  o.poo = P(stick.localToWorld(V([0, stick.userData.mid, 0])));
  if (dog.group.visible) { o.dogHead = P(dog.head.getWorldPosition(new THREE.Vector3())); o.dogNose = P(dog.headPoint([0, -0.4, 6.5])); o.dogTail = P(dog.group.localToWorld(V([0, 10, -14]))); o.dogFeet = P(dog.group.localToWorld(V([0, 0, 0]))); }
  o.phone = P(phone.group.position.clone()); o.pig = P(V(PIG_AT));
  if (bubble.visible) { o.bubbleTip = P(bubble.position); o.bubbleTop = P(bubble.localToWorld(V([0, bubble.userData.h, 0]))); o.bubbleL = P(bubble.localToWorld(V([-4.7, 4, 0]))); o.bubbleR = P(bubble.localToWorld(V([4.7, 4, 0]))); }
  if (troph.visible) o.trophy = P(troph.position);
  o.door = [P(V([DX0, DY1, WALLZ])), P(V([DX1, 0, WALLZ]))];
  if (dog.group.visible) { o.dogNoseW = dog.headPoint([0, -0.4, 6.6]).toArray().map(v => +v.toFixed(1)); o.dogBodyW = dog.group.position.toArray().map(v => +v.toFixed(1)); o.dogTailW = dog.group.localToWorld(V([0, 10, -14])).toArray().map(v => +v.toFixed(1)); }
  o.confLand = CONF.land;
  return o;
}
const TUNE = { radScale: 1.5, maxBlur: 22, noTile: false, exp: 0.95 };
window.__film = {
  probe, W, H, FPS, CUTS, frames: FRAMES,
  frame(i, q = 0.94) {
    const t = i / FPS, k = shotAt(t);
    draw(k, t - CUTS[k], t);
    return renderer.domElement.toDataURL('image/jpeg', q);
  },
  still(k, s, cam) { lastKey = ''; window.__camOverride = cam || null; draw(k, s, CUTS[k] + s); window.__camOverride = null; return renderer.domElement.toDataURL('image/png'); },
  tune(o) { Object.assign(TUNE, o); },
};
window.__ready = true;
