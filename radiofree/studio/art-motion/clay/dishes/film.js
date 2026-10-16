// SOMEBODY DOES THE DISHES — Toko Midori Games, clay, 24.4 s, 1080×1920, 24 fps (586 frames). Owner: the end was too fast — the last shot now runs 3 s longer: the operator waves for about two seconds, lowers his hand and goes back to work while Toko keeps waving on his monitor.
//
// Two worlds built side by side as one set, a wall between them: a sterile
// white-and-mint "smart home" kitchen in the morning sun, and — through the wall's
// cut end — a dim grey-green cubicle at NIGHT, a window full of office towers
// behind it, so the cubicle reads as somewhere else, not next door.
//   1 0–4.4    a sleek white home robot ($20,000 on a paper tag) lifts one plate
//              toward the open dishwasher, very, very slowly
//   2 4.4–8.4  Toko sips tea, nods off; the wall clock jumps five minutes; he wakes:
//              the robot is still holding the same plate
//   3 8.4–12.8 pull back from the robot, through the wall's cut end, into the cubicle:
//              a yawning man in a VR headset mimes the same plate
//   4 12.8–16.4 split: robot and man nudge the dishwasher door shut together; both wobble
//   5 16.4–21.4 the man yawns; in the kitchen Toko waves at the robot's camera eye;
//              in the cubicle the man waves back
// Puppets on twos (12 poses/s); camera and light every frame. No captions/slate/bug;
// faces and action below y≈700.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { skyPlane, canvas, tex } from './lib/city.js';
import { orient } from './lib/beasts.js';
import { Toko } from './lib/toko.js';
import { robotHead, vrHeadset, controller, plate as makePlate, dishwasher, priceTag, wallClock, paintMonitor, nightCity } from './lib/dprops.js';

const RES = Number(new URLSearchParams(location.search).get('res') || 1);
const W = Math.round(1080 * RES), H = Math.round(1920 * RES), FPS = 24, POSE_FPS = 12;
const CUTS = [0, 4.4, 8.4, 12.8, 16.4, 17.9, 19.6, 24.4];
const FRAMES = 586;
const SPLIT_GAP = 12;   // px between the two halves of the split, at 1080

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const eout = (a, b, x) => 1 - (1 - clamp((x - a) / (b - a))) ** 3;
const ein = (a, b, x) => clamp((x - a) / (b - a)) ** 2;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (A, Bv, k) => (Array.isArray(A) ? A.map((v, i) => lerp(v, Bv[i], k)) : lerp(A, Bv, k));
const pop = (a, d, x) => { const t = clamp((x - a) / d); if (t <= 0) return 0; return 1 - Math.exp(-6 * t) * Math.cos(t * 9.5) * (1 - t * 0.2); };
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
const camera = new THREE.PerspectiveCamera(30, W / H, 3, 1600);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');

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
const RM = {   // the robot: sleek white satin clay, grey joints, a mint seam
  shell: clay('#f3f5f4', { rough: 0.3, thumb: 0.012, thumbCell: 2.4, tool: 0.4, mottle: 0.03, specks: 0.1, speckColor: '#9aa5a3' }),
  leg: clay('#e9edec', { rough: 0.34, thumb: 0.014, thumbCell: 2.2, tool: 0.4, mottle: 0.03, specks: 0.1 }),
  joint: clay('#9aa5a3', { rough: 0.35, thumb: 0.01, specks: 0 }),
  mint: clay('#8fd3c1', { rough: 0.35, thumb: 0.01, specks: 0 }),
  visor: clay('#0c1012', { rough: 0.12, metal: 0.25, thumb: 0.002, mottle: 0.01, specks: 0, noBoil: true }),
  lens: clay('#05070a', { rough: 0.06, thumb: 0.001, specks: 0, noBoil: true }),
  chrome: clay('#c9cfd4', { rough: 0.18, metal: 0.65, thumb: 0.003, specks: 0, noBoil: true }),
  iris: HDR(0.6, 2.4, 2.0), glint: HDR(2.6, 2.6, 2.6),
  ring: clay('#c5a35e', { rough: 0.3, metal: 0.4, thumb: 0.005 }), string: clay('#e9e2d2', { thumb: 0.01 }),
};
const RTM = { hoodie: RM.shell, hoodie2: RM.shell, cuff: RM.joint, jeans: RM.leg, shoes: RM.shell, sole: RM.joint, glove: RM.shell, hair: RM.shell, maskDisc: RM.shell, maskInk: RM.shell, strap: RM.joint, string: RM.joint, aglet: RM.joint };
const MM = {   // the operator: a tired khaki cardigan, office trousers, VR kit
  hoodie: clay('#7c6f5a', { thumbCell: 1.6, thumb: 0.05, tool: 1.4 }), hoodie2: clay('#6f634f', { thumbCell: 1.5, thumb: 0.05 }),
  cuff: surface({ surf: 'knit', color: '#6a5f4e', rough: 0.85, fibre: 0.05, fibreF: 8, knitW: 0.42, knitH: 0.3, knitAxis: [0, 0, 1], lump: 0.02, wrap: 0.4 }),
  jeans: clay('#2f343c', { thumb: 0.04, tool: 1.0 }), shoes: clay('#26262a', { rough: 0.45 }), sole: clay('#d9d2c4', { thumb: 0.02 }),
  glove: clay('#d29a76', { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }), hair: clay('#3e2b20', { tool: 1.8, thumbCell: 0.9, thumb: 0.05 }),
  maskDisc: clay('#d29a76'), maskInk: clay('#d29a76'), strap: clay('#26262a'), string: clay('#e9e2d2'), aglet: clay('#cfc6b4'),
  vr: clay('#e6e9e8', { rough: 0.35, thumb: 0.012, thumbCell: 2.0, specks: 0.1 }), vrFace: clay('#14191b', { rough: 0.15, thumb: 0.002, specks: 0 }),
  vrStrap: clay('#2b2f33', { rough: 0.6, thumb: 0.02 }), vrLed: HDR(0.5, 2.2, 1.8),
};
const PM = {
  crock: clay('#fbfcfb', { rough: 0.2, thumb: 0.01, thumbCell: 1.6, mottle: 0.03, specks: 0.15, noBoil: true }),
  mint: clay('#8fd3c1', { rough: 0.3, thumb: 0.01, specks: 0 }), mint2: clay('#5fb8a2', { rough: 0.3, thumb: 0.01, specks: 0 }),
  shellW: clay('#f7f9f8', { rough: 0.3, thumb: 0.01, specks: 0.05 }), ink: clay('#2a3330', { rough: 0.4, thumb: 0.005, specks: 0 }),
  tub: clay('#5d6567', { rough: 0.4, thumb: 0.01, specks: 0, noBoil: true }), tubBack: clay('#4b5254', { rough: 0.45, specks: 0, noBoil: true }),
  panel: clay('#f4f7f6', { rough: 0.28, thumb: 0.01, thumbCell: 2.4, specks: 0.05, noBoil: true }),
  chrome: clay('#c9cfd4', { rough: 0.18, metal: 0.65, thumb: 0.003, specks: 0, noBoil: true }),
  wire: clay('#b8c0c3', { rough: 0.25, metal: 0.5, thumb: 0.002, specks: 0, noBoil: true }),
  led: HDR(0.5, 2.4, 2.0), ring: clay('#c5a35e', { rough: 0.3, metal: 0.4, thumb: 0.005 }),
  mug: clay('#f2c94c', { rough: 0.3, thumb: 0.015, specks: 0.1 }), tea: clay('#8a4a1c', { rough: 0.1, thumb: 0.002, specks: 0 }),
  string: clay('#e9e2d2', { thumb: 0.01 }), teaTag: clay('#f3efe4', { thumb: 0.01 }),
};
const S = {
  kWall: surface({ color: '#ffffff', rough: 0.4, lump: 0.01, thumb: 0.006, thumbCell: 3, grain: 0.003, mottle: 0.04, noBoil: true }),
  kFloor: surface({ color: '#ffffff', rough: 0.3, lump: 0.01, thumb: 0.008, thumbCell: 3, grain: 0.004, mottle: 0.05, specks: 0, noBoil: true }),
  cWall: surface({ color: '#ffffff', rough: 0.85, lump: 0.02, thumb: 0.008, thumbCell: 3, grain: 0.004, mottle: 0.12, noBoil: true }),
  carpet: surface({ surf: 'felt', color: '#ffffff', rough: 0.95, fibre: 0.05, fibreF: 7, lump: 0.02, lumpF: 0.4, mottle: 0.08, noBoil: true }),
  counter: clay('#f7f9f8', { rough: 0.22, thumb: 0.01, thumbCell: 2.6, mottle: 0.02, specks: 0.15, speckColor: '#b9c4c0', noBoil: true }),
  cab: clay('#8fd3c1', { rough: 0.32, thumb: 0.015, thumbCell: 2.4, tool: 0.5, mottle: 0.03, noBoil: true }),
  cabW: clay('#f2f6f5', { rough: 0.3, thumb: 0.012, thumbCell: 2.4, noBoil: true }),
  chrome: PM.chrome, glassDark: clay('#121a1c', { rough: 0.1, metal: 0.2, thumb: 0.002, specks: 0, noBoil: true }),
  trimW: clay('#ffffff', { rough: 0.35, thumb: 0.012, specks: 0.1, noBoil: true }),
  hedge: clay('#6aa84f', { thumbCell: 2.6, thumb: 0.05, tool: 1.4, rough: 0.8 }), trunk: clay('#7a5634', { tool: 1.6 }),
  // the cubicle
  panel: surface({ surf: 'felt', color: '#56635d', rough: 0.95, fibre: 0.05, fibreF: 7, lump: 0.03, lumpF: 0.4, mottle: 0.1 }),
  rail: clay('#7d8784', { rough: 0.35, metal: 0.3, thumb: 0.005, specks: 0, noBoil: true }),
  desk: clay('#a3a69a', { rough: 0.45, thumb: 0.015, thumbCell: 2.4, mottle: 0.05, noBoil: true }),
  metal: clay('#3f4547', { rough: 0.4, metal: 0.3, thumb: 0.006, specks: 0, noBoil: true }),
  frame: clay('#2b3134', { rough: 0.35, metal: 0.3, thumb: 0.006, specks: 0, noBoil: true }),
  plastic: clay('#24282a', { rough: 0.35, thumb: 0.006, specks: 0, noBoil: true }),
  sticky: clay('#f5d84a', { rough: 0.7, thumb: 0.01 }), sticky2: clay('#ff9fb3', { rough: 0.7, thumb: 0.01 }),
  cactusPot: clay('#b5603c', { rough: 0.7 }), cactus: clay('#5f8a4a', { tool: 1.4, thumbCell: 1.0 }),
  coffee: clay('#e8e4da', { rough: 0.3, thumb: 0.01 }), stapler: clay('#c23b33', { rough: 0.3, thumb: 0.01 }),
  // the wall between them, cut
  plaster: clay('#efe9dc', { rough: 0.8, thumb: 0.02, thumbCell: 1.6, specks: 0.5, noBoil: true }),
  stud: clay('#c49a5e', { tool: 1.6, thumbCell: 1.4, ridge: 0.18, rough: 0.7, noBoil: true }),
  fluff: clay('#f2a3b0', { thumbCell: 0.7, thumb: 0.07, tool: 2.0, ridge: 0.08, rough: 0.95, specks: 0.6, speckColor: '#d97a8c' }),
};
function paintTex(w, h, fn) { const c = canvas(w, h); fn(c.getContext('2d'), w, h); const t = tex(c); t.wrapS = t.wrapT = RepeatWrapping(); return t; }
function RepeatWrapping() { return THREE.RepeatWrapping; }
// kitchen walls: big white panels, a mint glass splashback from 22 to 36 cm. 64 × 128 cm per tile.
const kWallTex = paintTex(512, 1024, (g, w, h) => {
  const cm = h / 128;
  g.fillStyle = '#eef4f1'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(160,190,180,0.35)'; for (let x = 0; x < w; x += 32 * cm) g.fillRect(x, 0, 1.4, h); for (let y = 0; y < h; y += 32 * cm) g.fillRect(0, y, w, 1.4);
  const yB = h - 36 * cm, yT = h - 22 * cm;
  g.fillStyle = '#9fdccb'; g.fillRect(0, yB, w, yT - yB);
  g.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 0; x < w; x += 8 * cm) g.fillRect(x, yB, 1.6, yT - yB); for (let y = yB; y < yT; y += 4 * cm) g.fillRect(0, y, w, 1.4);
  const r = rng(5); for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(120,150,140,0.05)'; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 5); }
});
kWallTex.repeat.set(1 / 64, 1 / 128); S.kWall.map = kWallTex;
const kFloorTex = paintTex(512, 512, (g, w, h) => {
  const n = 2, s = w / n, r = rng(8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? '#dfe7e4' : '#e9efec'; g.fillRect(x * s, y * s, s, s); }
  g.fillStyle = 'rgba(150,170,165,0.6)'; for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, h); g.fillRect(0, i * s - 1, w, 2); }
  for (let i = 0; i < 2000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(80,100,95,0.04)'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
});
kFloorTex.repeat.set(300 / 40, 400 / 40); S.kFloor.map = kFloorTex;
const cWallTex = paintTex(256, 256, (g, w, h) => { g.fillStyle = '#2f3a36'; g.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 1600; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)'; g.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4); } });
cWallTex.repeat.set(1 / 40, 1 / 40); S.cWall.map = cWallTex;
const carpetTex = paintTex(256, 256, (g, w, h) => { const r = rng(10); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = (x + y) % 2 ? '#3d4844' : '#43504b'; g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2); } for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } });
carpetTex.repeat.set(300 / 24, 400 / 24); S.carpet.map = carpetTex;
for (const m of [S.kWall, S.kFloor, S.cWall, S.carpet]) m.needsUpdate = true;

// ------------------------------------------------------------------ the set: two rooms and the wall between
const WALLZ = -42, WT = 6, DIV = 4;                 // back walls' front face; the dividing wall is x ∈ [−4, 4]
const KWIN = [-112, -84, 28, 62];                    // the kitchen window (x0, x1, y0, y1)
const CWIN = [14, 58, 32, 66];                       // the cubicle's night window
function backWall(x0, x1, win, mat) {
  const sh = new THREE.Shape([[x0, -2], [x1, -2], [x1, 120], [x0, 120]].map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path([[win[0], win[2]], [win[0], win[3]], [win[1], win[3]], [win[1], win[2]]].map(([x, y]) => new THREE.Vector2(x, y))));
  return mesh(new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false, curveSegments: 1 }), mat, { pos: [0, 0, WALLZ - WT], parent: scene });
}
backWall(-170, -DIV, KWIN, S.kWall);
backWall(DIV, 150, CWIN, S.cWall);
mesh(new THREE.PlaneGeometry(300, 400).rotateX(-Math.PI / 2), S.kFloor, { pos: [-150 - DIV + 150 - 150 + 150 - 150, 0, 150], parent: scene }).position.set(-DIV - 150, 0, 150);
mesh(new THREE.PlaneGeometry(300, 400).rotateX(-Math.PI / 2), S.carpet, { pos: [DIV + 150, 0, 150], parent: scene });
// the dividing wall, built in layers so its cut end shows what a wall is made of
const DIV_Z0 = WALLZ - WT, DIV_Z1 = 16, DIV_H = 96;
{
  const L = DIV_Z1 - DIV_Z0, cz = (DIV_Z0 + DIV_Z1) / 2;
  const slab = (x0, x1, mat, seed, lumpA = 0.02) => mesh(lumpy(new THREE.BoxGeometry(x1 - x0, DIV_H, L, Math.max(1, Math.round((x1 - x0) * 2)), 48, 60), lumpA, 0.5, seed), mat, { pos: [(x0 + x1) / 2, DIV_H / 2, cz], parent: scene });
  slab(-4, -3.3, S.counter, 701, 0.01);     // kitchen: white tile skin
  slab(-3.3, -2.6, S.plaster, 702, 0.02);
  slab(2.6, 3.3, S.plaster, 703, 0.02);
  slab(3.3, 4, S.panel, 704, 0.01);         // cubicle: grey-green fabric
  // studs every 16 cm, insulation between: the cut end lands on fluff with a stud just behind
  for (let z = DIV_Z1 - 6; z > DIV_Z0; z -= 16) mesh(lumpy(new THREE.BoxGeometry(5.2, DIV_H, 2.2, 6, 30, 3), 0.03, 0.6, 710 + z), S.stud, { pos: [0, DIV_H / 2, z], parent: scene });
  mesh(lumpy(new THREE.BoxGeometry(5.2, DIV_H - 0.4, L - 0.3, 14, 96, 80), 0.35, 0.55, 720), S.fluff, { pos: [0, DIV_H / 2, cz - 0.15], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(8.6, 1.4, L + 0.4, 2, 0.4), 0.03, 0.5, 721), S.stud, { pos: [0, DIV_H + 0.5, cz], parent: scene });
}

// ---- the kitchen
const TOP = 22;                                         // counter height
const DW_X = -22.3;                                     // dishwasher centre
{
  // a daylight window with a tree outside
  const wb = (x, y, w, h, s) => mesh(lumpy(new RoundedBoxGeometry(w, h, 1.6, 2, 0.4), 0.03, 0.5, s), S.trimW, { pos: [x, y, WALLZ - 3.2], parent: scene });
  wb((KWIN[0] + KWIN[1]) / 2, KWIN[3] - 1, KWIN[1] - KWIN[0], 2, 730); wb((KWIN[0] + KWIN[1]) / 2, KWIN[2] + 1, KWIN[1] - KWIN[0], 2, 731);
  wb(KWIN[0] + 1, (KWIN[2] + KWIN[3]) / 2, 2, KWIN[3] - KWIN[2], 732); wb(KWIN[1] - 1, (KWIN[2] + KWIN[3]) / 2, 2, KWIN[3] - KWIN[2], 733); wb((KWIN[0] + KWIN[1]) / 2, (KWIN[2] + KWIN[3]) / 2, 1.4, KWIN[3] - KWIN[2], 734);
  const out = new THREE.Group(); scene.add(out);
  out.add(skyPlane(300, 200, [[0, '#5aa8e0'], [0.5, '#9fd0f2'], [1, '#e8f6fb']], { pos: [-100, 60, -220], intensity: 1.2 }));
  const r = rng(12);
  for (let i = 0; i < 8; i++) mesh(lumpy(ball(12 + r() * 4, 1, 0.85, 0.8), 0.5, 0.2, 740 + i), S.hedge, { pos: [-98 + Math.cos(i) * 14, 62 + Math.sin(i * 1.7) * 9, -130 - r() * 6], parent: out, cast: false });
  mesh(lumpy(sausage([[0, 0, 0], [1, 40, 0]], [3, 2.2]), 0.3, 0.2, 750), S.trunk, { pos: [-98, 10, -128], parent: out, cast: false });
  mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), clay('#86bf63', { rough: 0.9, noBoil: true }), { pos: [-100, 6, -160], parent: out, cast: false });
  // the counter run: mint doors, a white quartz top, chrome bar handles; a sink; the dishwasher's slot
  const x0 = -78, x1 = -DIV, z0 = WALLZ, z1 = WALLZ + 15;
  const dw0 = DW_X - 7.3, dw1 = DW_X + 7.3;
  const cab = (a, b, s) => { mesh(lumpy(new RoundedBoxGeometry(b - a - 0.3, TOP - 3.2, z1 - z0 - 1.2, 2, 0.4), 0.02, 0.4, s), S.cab, { pos: [(a + b) / 2, (TOP - 3.2) / 2 + 1.4, (z0 + z1) / 2 - 0.4], parent: scene }); mesh(lumpy(sausage([[(a + b) / 2 - (b - a) * 0.3, TOP - 4.5, z1 + 0.2], [(a + b) / 2 + (b - a) * 0.3, TOP - 4.5, z1 + 0.2]], [0.3, 0.3], { seg: 8, steps: 4 }), 0.01, 1, s + 1), S.chrome, { parent: scene }); };
  for (let a = x0; a < dw0 - 1; a += 14.5) cab(a, Math.min(a + 14.5, dw0), 760 + a);
  cab(dw1, x1, 790);
  mesh(new THREE.BoxGeometry(x1 - x0, 1.4, z1 - z0 - 1.5), S.tubBack || PM.tubBack, { pos: [(x0 + x1) / 2, 0.7, (z0 + z1) / 2 - 1], parent: scene });   // kickboard shadow
  mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 1.6, z1 - z0 + 1.2, 2, 0.5), 0.015, 0.4, 791), S.counter, { pos: [(x0 + x1) / 2, TOP - 0.8, (z0 + z1) / 2 + 0.6], parent: scene });
  // the sink: a basin cut into the top, and a tall arched tap
  mesh(new RoundedBoxGeometry(12, 0.3, 9, 2, 0.4), PM.tub, { pos: [-52, TOP + 0.05, WALLZ + 7.5], parent: scene, cast: false });
  mesh(lumpy(sausage([[-52, TOP, WALLZ + 2.5], [-52, TOP + 9, WALLZ + 2.8], [-52, TOP + 11.5, WALLZ + 5.5], [-52, TOP + 8.5, WALLZ + 7.4]], [0.5, 0.45, 0.42, 0.38], { seg: 12, steps: 40 }), 0.01, 1, 792), S.chrome, { parent: scene });
  // a smart speaker puck with a mint ring, a bowl, a plant
  mesh(lumpy(new THREE.CylinderGeometry(2.2, 2.4, 2.6, 32), 0.02, 1, 793), S.cabW, { pos: [-66, TOP + 1.3, WALLZ + 6], parent: scene });
  mesh(new THREE.TorusGeometry(2.15, 0.16, 8, 32).rotateX(Math.PI / 2), PM.led, { pos: [-66, TOP + 2.65, WALLZ + 6], parent: scene, cast: false });
  // a smart display on the wall: dark glass, a mint glow, no words
  { const c = canvas(256, 160), g = c.getContext('2d'); g.fillStyle = '#0e1517'; g.fillRect(0, 0, 256, 160); g.fillStyle = '#8fd3c1'; g.beginPath(); g.arc(70, 80, 34, -Math.PI / 2, Math.PI * 1.1); g.lineWidth = 10; g.strokeStyle = '#8fd3c1'; g.stroke(); for (let i = 0; i < 3; i++) { g.fillStyle = i ? '#3c5c56' : '#8fd3c1'; g.fillRect(130, 50 + i * 26, 90 - i * 20, 10); } const t = tex(c); mesh(new RoundedBoxGeometry(16, 10, 0.8, 2, 0.6), S.cabW, { pos: [-14, 46, WALLZ + 0.4], parent: scene }); mesh(new THREE.PlaneGeometry(14.4, 8.6), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.3, 1.3, 1.3) }), { pos: [-14, 46, WALLZ + 0.85], parent: scene, cast: false }); }
  // a floating white shelf with three glass jars
  mesh(lumpy(new RoundedBoxGeometry(22, 1.2, 7, 2, 0.4), 0.02, 0.4, 794), S.cabW, { pos: [-84, 56, WALLZ + 3.5], parent: scene });
  for (let i = 0; i < 3; i++) mesh(lumpy(new THREE.CylinderGeometry(1.8, 1.8, 4 + i, 24), 0.02, 1, 795 + i), new THREE.MeshStandardMaterial({ color: '#d8efe8', roughness: 0.1, transparent: true, opacity: 0.55 }), { pos: [-90 + i * 6, 56.6 + (4 + i) / 2, WALLZ + 3.5], parent: scene, cast: false });
  // two white pendant lamps
  for (const x of [-60, -30]) { mesh(lathe([[0.01, 0], [4.6, 0], [4.4, 1.2], [2.0, 4.2], [0.5, 4.8], [0.01, 4.8]], 36), S.cabW, { pos: [x, 76, -10], parent: scene, cast: false }); mesh(new THREE.CylinderGeometry(0.12, 0.12, 60, 6), PM.ink, { pos: [x, 110, -10], parent: scene, cast: false }); mesh(new THREE.CircleGeometry(4.3, 32).rotateX(Math.PI / 2), HDR(3.5, 3.4, 3.1), { pos: [x, 75.95, -10], parent: scene, cast: false }); }
}
const dw = dishwasher(PM); dw.position.set(DW_X, 0, WALLZ + 14.5); scene.add(dw);
const kClock = wallClock(PM); kClock.group.position.set(-58, 48, WALLZ + 0.6); scene.add(kClock.group);
// the breakfast nook: a little round white table and a mint chair
const NOOK = [-74, 0, 0];
{
  mesh(lumpy(lathe([[0.01, 0], [4.4, 0], [4.2, 0.8], [0.9, 1.6], [0.7, 15.6], [8.8, 16.2], [9.0, 17.5], [0.01, 17.5]], 40), 0.03, 0.5, 800), S.cabW, { pos: NOOK, parent: scene });
}
const chair = new THREE.Group(); scene.add(chair);
{
  mesh(lumpy(new RoundedBoxGeometry(12, 1.4, 11, 2, 0.5), 0.03, 0.4, 801), S.cab, { pos: [0, 9.9, 0], parent: chair });
  for (const [a, b] of [[-5, -4.5], [5, -4.5], [-5, 4.5], [5, 4.5]]) mesh(new THREE.CylinderGeometry(0.5, 0.45, 9.4, 12), S.chrome, { pos: [a, 4.7, b], parent: chair });
  mesh(lumpy(new RoundedBoxGeometry(12, 9, 1.2, 2, 0.6), 0.03, 0.5, 802), S.cab, { pos: [0, 20, -5], rot: [-0.1, 0, 0], parent: chair });
}
const mug = new THREE.Group(); scene.add(mug);
{
  mesh(lumpy(lathe([[0.01, 0], [1.25, 0], [1.4, 0.2], [1.45, 2.9], [1.3, 3.0], [1.2, 0.35], [0.01, 0.35]], 28), 0.02, 0.9, 810), PM.mug, { parent: mug });
  mesh(lumpy(new THREE.TorusGeometry(0.65, 0.2, 8, 18), 0.02, 1, 811), PM.mug, { pos: [1.55, 1.6, 0], parent: mug });
  mesh(new THREE.CircleGeometry(1.25, 24).rotateX(-Math.PI / 2), PM.tea, { pos: [0, 2.5, 0], parent: mug, cast: false });
  mesh(sausage([[-0.6, 2.6, 0.9], [-1.1, 3.1, 1.25], [-1.5, 1.2, 1.4]], [0.04, 0.04, 0.04], { seg: 5, steps: 10, capSteps: 1 }), PM.string, { parent: mug, cast: false });
  mesh(new RoundedBoxGeometry(0.9, 1.1, 0.08, 1, 0.05), PM.teaTag, { pos: [-1.5, 0.75, 1.45], parent: mug, cast: false });
}

// ---- the cubicle
const DESK = { x0: 10, x1: 74, z0: WALLZ + 6, z1: WALLZ + 22, top: 20 };
const MON = [44, DESK.top, WALLZ + 12];
let monitor;
{
  // the night outside: towers, a thin moon; it also shadows the morning sun from this window
  const city = mesh(new THREE.PlaneGeometry(130, 80), new THREE.MeshBasicMaterial({ map: tex(nightCity()), color: new THREE.Color(1.15, 1.15, 1.25) }), { pos: [36, 48, -96], parent: scene, cast: true, recv: false });
  const fb = (x, y, w, h, s) => mesh(lumpy(new RoundedBoxGeometry(w, h, 1.6, 2, 0.3), 0.01, 0.5, s), S.frame, { pos: [x, y, WALLZ - 3.2], parent: scene });
  fb((CWIN[0] + CWIN[1]) / 2, CWIN[3] - 0.8, CWIN[1] - CWIN[0], 1.6, 830); fb((CWIN[0] + CWIN[1]) / 2, CWIN[2] + 0.8, CWIN[1] - CWIN[0], 1.6, 831);
  fb(CWIN[0] + 0.8, (CWIN[2] + CWIN[3]) / 2, 1.6, CWIN[3] - CWIN[2], 832); fb(CWIN[1] - 0.8, (CWIN[2] + CWIN[3]) / 2, 1.6, CWIN[3] - CWIN[2], 833);
  fb((CWIN[0] + CWIN[1]) / 2, (CWIN[2] + CWIN[3]) / 2, 1.2, CWIN[3] - CWIN[2], 834);
  mesh(new THREE.PlaneGeometry(CWIN[1] - CWIN[0], CWIN[3] - CWIN[2]), new THREE.MeshBasicMaterial({ color: '#9fb6d8', transparent: true, opacity: 0.06, depthWrite: false }), { pos: [(CWIN[0] + CWIN[1]) / 2, (CWIN[2] + CWIN[3]) / 2, WALLZ - 3], parent: scene, cast: false, recv: false });
  // partitions: one behind the desk under the window, one down the right side
  const part = (x, z, w, d, s) => { mesh(lumpy(new RoundedBoxGeometry(w, 30, d, 2, 0.5), 0.04, 0.4, s), S.panel, { pos: [x, 15, z], parent: scene }); mesh(new RoundedBoxGeometry(w + 0.4, 0.9, d + 0.4, 2, 0.3), S.rail, { pos: [x, 30.3, z], parent: scene }); };
  part(42, WALLZ + 3.5, 70, 2.4, 840);
  part(78, WALLZ + 22, 2.4, 40, 841);
  // the desk
  mesh(lumpy(new RoundedBoxGeometry(DESK.x1 - DESK.x0, 1.4, DESK.z1 - DESK.z0, 2, 0.4), 0.015, 0.4, 842), S.desk, { pos: [(DESK.x0 + DESK.x1) / 2, DESK.top - 0.7, (DESK.z0 + DESK.z1) / 2], parent: scene });
  for (const x of [DESK.x0 + 2, DESK.x1 - 2]) mesh(new RoundedBoxGeometry(1.4, DESK.top - 1.4, DESK.z1 - DESK.z0 - 2, 2, 0.4), S.metal, { pos: [x, (DESK.top - 1.4) / 2, (DESK.z0 + DESK.z1) / 2], parent: scene });
  // the monitor: what the robot's eye sees
  const g = new THREE.Group(); g.position.set(...MON); scene.add(g);
  mesh(new RoundedBoxGeometry(6, 0.6, 4.5, 2, 0.3), S.plastic, { pos: [0, 0.3, 0], parent: g });
  mesh(new RoundedBoxGeometry(1.4, 5, 0.9, 2, 0.3), S.plastic, { pos: [0, 2.8, -0.6], parent: g });
  mesh(new RoundedBoxGeometry(20, 12.4, 1.0, 3, 0.4), S.plastic, { pos: [0, 10.4, 0], parent: g });
  const mc = canvas(640, 384), mt = tex(mc);
  const screen = mesh(new THREE.PlaneGeometry(18.8, 11.2), new THREE.MeshBasicMaterial({ map: mt, color: new THREE.Color(1.25, 1.3, 1.28) }), { pos: [0, 10.4, 0.52], parent: g, cast: false, recv: false });
  mesh(new RoundedBoxGeometry(2.6, 2.6, 0.1, 1, 0.1), S.sticky, { pos: [9.6, 15.8, 0.6], rot: [0, 0, 0.12], parent: g, cast: false });
  mesh(new RoundedBoxGeometry(2.6, 2.6, 0.1, 1, 0.1), S.sticky2, { pos: [-9.8, 4.6, 0.6], rot: [0, 0, -0.1], parent: g, cast: false });
  monitor = { group: g, canvas: mc, g: mc.getContext('2d'), tex: mt, key: '' };
  // keyboard, cold coffee, the stapler, a sad cactus
  mesh(lumpy(new RoundedBoxGeometry(13, 0.8, 4.4, 2, 0.3), 0.01, 0.5, 843), S.plastic, { pos: [MON[0] - 2, DESK.top + 0.4, MON[2] + 8], rot: [0, 0.05, 0], parent: scene });
  const cup = new THREE.Group(); cup.position.set(MON[0] + 15, DESK.top, MON[2] + 6); scene.add(cup);
  mesh(lumpy(lathe([[0.01, 0], [1.2, 0], [1.35, 3.0], [1.25, 3.1], [1.15, 0.3], [0.01, 0.3]], 24), 0.02, 0.9, 844), S.coffee, { parent: cup });
  mesh(new THREE.CircleGeometry(1.15, 20).rotateX(-Math.PI / 2), PM.tea, { pos: [0, 2.4, 0], parent: cup, cast: false });
  const st = new THREE.Group(); st.position.set(MON[0] - 16, DESK.top, MON[2] + 7); st.rotation.y = 0.4; scene.add(st);
  mesh(lumpy(new RoundedBoxGeometry(1.8, 1.0, 6.2, 2, 0.4), 0.02, 0.6, 845), S.metal, { pos: [0, 0.5, 0], parent: st });
  mesh(lumpy(new RoundedBoxGeometry(1.7, 1.2, 6.0, 2, 0.5), 0.02, 0.6, 846), S.stapler, { pos: [0, 1.6, 0.1], rot: [0.05, 0, 0], parent: st });
  const cp = new THREE.Group(); cp.position.set(DESK.x0 + 6, DESK.top, MON[2] + 2); scene.add(cp);
  mesh(lumpy(lathe([[0.01, 0], [1.3, 0], [1.6, 2.4], [0.01, 2.4]], 24), 0.03, 0.8, 847), S.cactusPot, { parent: cp });
  mesh(lumpy(sausage([[0, 2, 0], [0.3, 4.2, 0], [0.9, 5.0, 0.2]], [0.75, 0.65, 0.5], { seg: 14, steps: 20 }), 0.04, 1, 848), S.cactus, { parent: cp });
}

// ------------------------------------------------------------------ puppets
const toko = new Toko(TM); scene.add(toko.group);
const robot = new Toko(RTM); scene.add(robot.group);
const man = new Toko(MM); scene.add(man.group);
// the robot: no hood, no pocket, no strings; its head is an egg with a visor and one eye
for (const o of [robot.hood, robot.pocket]) o.visible = false;
robot.head.children.slice().forEach(c => { c.visible = false; });
const rHead = robotHead(RM); rHead.position.set(0, -0.2, 0); robot.head.add(rHead);
// a mint seam at the waist and grey ball joints at the shoulders, elbows and knees
const rBelt = mesh(lumpy(new THREE.TorusGeometry(5.5, 0.42, 10, 40).rotateX(Math.PI / 2), 0.02, 1, 870), RM.mint, { parent: robot.group, cast: false });
const rJoints = Array.from({ length: 6 }, (_, i) => mesh(ball(i < 2 ? 1.95 : 1.55, 1, 1, 1, 20), RM.joint, { parent: robot.group }));
// the price tag on a string round its neck
const rTag = priceTag(RM, '$20,000'); scene.add(rTag);
const rTagString = mesh(new THREE.BufferGeometry(), RM.string, { parent: scene, cast: false });
// the operator: no hood or pocket; a headset over where a face would be
for (const o of [man.hood, man.pocket, man.mask]) o.visible = false;
man.head.children.forEach(c => { if (c.material === MM.strap) c.visible = false; });
const headset = vrHeadset(MM); man.head.add(headset);
const ctrls = [0, 1].map(() => { const c = controller(MM); scene.add(c); return c; });
// the plate
const thePlate = makePlate(PM); scene.add(thePlate);
const rackPlate = makePlate(PM); rackPlate.position.set(2.0, 4.3, -6.2); rackPlate.rotation.set(0, Math.PI / 2, 0.08); dw.userData.rack.add(rackPlate);

// ------------------------------------------------------------------ light
const hemi = new THREE.HemisphereLight('#dfeef0', '#c9d6d2', 0.42); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3dc', 3.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 140, bottom: -110, near: 1, far: 700 });
sun.position.set(-260, 260, -300); sun.target.position.set(-60, 0, -10); scene.add(sun, sun.target);
const key = new THREE.SpotLight('#f6fbff', 90000, 0, 0.42, 0.9, 2);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 20; key.shadow.camera.far = 600;
key.position.set(-150, 140, 170); key.target.position.set(-52, 18, -14); scene.add(key, key.target);
const kFill = new THREE.PointLight('#f2fffb', 8000, 125, 2); kFill.position.set(-70, 70, 50); scene.add(kFill);
const kFill2 = new THREE.PointLight('#fffaf0', 2500, 90, 2); kFill2.position.set(-30, 40, 30); scene.add(kFill2);
const monL = new THREE.PointLight('#7fd6bd', 900, 70, 2); monL.position.set(MON[0], MON[1] + 10, MON[2] + 12); scene.add(monL);
const moon = new THREE.SpotLight('#7f97d8', 9000, 0, 0.5, 0.8, 2); moon.position.set(38, 70, -100); moon.target.position.set(36, 20, -6); scene.add(moon, moon.target);
const cFill = new THREE.PointLight('#9fb3c8', 4200, 125, 2); cFill.position.set(55, 46, 70); scene.add(cFill);
const eyeL = new THREE.PointLight('#8fe8d0', 0, 20, 2); scene.add(eyeL);

// ------------------------------------------------------------------ poses
// The robot and the operator share ONE pose, in the figure's own frame (hip-relative, yaw-free):
// that is the whole point, so it is written once.
const RB = { hip: [-36, 21.5, -11], yaw: 0.5 };      // the robot, beside the open dishwasher
const MB = { hip: [36, 21.5, -11], yaw: 0.5 };       // the operator, in front of his desk
const STAND = { knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6] };
const R_ = (yaw) => (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
// the plate's path in the figure's frame: from beside its right hip toward the rack on its left, in jerks
const PLATE_A = [-3.0, 11.4, 9.0], PLATE_B = [4.0, 8.6, 11.6];
function plateU(tg) {
  // teleop: a little move every 0.7 s, a hold, and a tremor
  const n = tg / 0.7, i = Math.floor(n), f = n - i;
  const steps = (i + smooth(0.0, 0.35, f)) / (12.8 / 0.7);
  return clamp(steps, 0, 1);
}
function shared(tg) {
  // returns a hip-relative pose; arms as local points
  const o = { lean: 0.06, side: 0, hp: 0.28, hr: 0, hy: 0.15, knee: STAND.knee, foot: STAND.foot, legs: null };
  const trem = [Math.sin(tg * 23) * 0.08 + Math.sin(tg * 37) * 0.05, Math.sin(tg * 29) * 0.06, Math.sin(tg * 31) * 0.05];
  if (tg < 12.8) {
    const u = plateU(tg), pl = add3(mix(PLATE_A, PLATE_B, u), trem);
    o.plate = pl;
    o.hdR = add3(pl, [-4.3, -0.6, -0.4]); o.hdL = add3(pl, [4.3, -0.6, -0.4]);
    o.elR = [-6.6, 7.2, 3.4]; o.elL = [6.6, 7.0, 3.6];
    o.palm = [[1, 0.2, 0], [-1, 0.2, 0]];
    o.hy = 0.15 + u * 0.25; o.hp = 0.32;
    // the operator yawns at 11.2: head back, shoulders up (the robot is off screen then)
    o.yawn = smooth(11.2, 11.7, tg) * (1 - smooth(12.2, 12.7, tg));
    return o;
  }
  // beat 4: the plate is in; lift the left knee, nudge the door, wobble, put the foot down
  const lift = smooth(13.25, 13.75, tg) * (1 - smooth(15.15, 15.4, tg));
  const push = smooth(13.75, 13.9, tg) * (1 - smooth(15.15, 15.4, tg));
  const wob = tg > 13.95 ? Math.exp(-(tg - 13.95) * 1.5) * Math.sin((tg - 13.95) * Math.PI * 2 * 1.45) * smooth(13.95, 14.1, tg) : 0;
  const settle = tg > 15.4 ? Math.exp(-(tg - 15.4) * 5) * Math.sin((tg - 15.4) * 18) * 0.3 : 0;
  o.legs = [null, { knee: mix(STAND.knee, [0.4, -5.6, 7.0], lift), foot: mix(STAND.foot, [0.6, -13.5 + push * 2.2, 7.8 + push * 1.6], lift), shoePitch: lift * -0.35 }];
  const arms = smooth(13.6, 14.0, tg) * (1 - smooth(15.3, 15.8, tg));
  o.elR = mix([-6.6, 5.0, 1.5], [-10.5, 9.5, 1.0], arms); o.hdR = mix([-5.6, -0.5, 3.5], [-15.0, 11.0 - wob * 3, 2.0], arms);
  o.elL = mix([6.6, 5.0, 1.5], [10.5, 9.5, 1.0], arms); o.hdL = mix([5.6, -0.5, 3.5], [15.0, 11.0 + wob * 3, 2.0], arms);
  o.palm = [[0, -1, 0.2], [0, -1, 0.2]];
  o.side = wob * 0.2 + settle * 0.1; o.lean = 0.05 - lift * 0.08 + Math.abs(wob) * 0.05; o.hr = -wob * 0.25; o.hp = 0.18 + lift * 0.1; o.hy = 0.2;
  o.hip = [wob * 1.2, 0, 0];
  return o;
}
/** turn a shared (local) pose into a figure's world pose */
function place(base, o) {
  const R = R_(base.yaw), hip = add3(base.hip, R(o.hip || [0, 0, 0]));
  const at = (v) => add3(hip, R(v));
  const P = { hip, yaw: base.yaw, lean: o.lean, side: o.side, knee: o.knee, foot: o.foot, legs: o.legs, hp: o.hp, hr: o.hr, hy: o.hy,
    elR: at(o.elR), hdR: at(o.hdR), elL: at(o.elL), hdL: at(o.hdL), palm: o.palm.map(p => R(p)), shoePitch: o.shoePitch || 0 };
  return P;
}
/** the operator's own extras on top of the shared pose: the yawns and the wave back */
function manExtras(o, tg) {
  const y = o.yawn || 0;
  if (y > 0) { o = { ...o, hp: o.hp - y * 0.7, lean: o.lean - y * 0.12 }; }
  return o;
}
// standing Toko
const T_STAND = (hip, yaw, o = {}) => {
  const R = R_(yaw), at = (v) => add3(hip, R(v));
  return { hip, yaw, at, lean: 0.06, side: 0, knee: STAND.knee, foot: STAND.foot, hp: 0.15, hr: 0, hy: 0,
    elR: at([-6.6, 6.0, 1.2]), hdR: at([-6.4, -0.8, 3.0]), elL: at([6.6, 6.0, 1.2]), hdL: at([6.4, -0.8, 3.0]), palm: [[0, -1, 0.2], [0, -1, 0.2]], ...o };
};
// seated Toko at the nook, facing the room and the robot
const TOKO_SEAT = { hip: [-80, 11.6, -7.5], yaw: 0.85 };
function seat(o = {}) {
  const { hip, yaw } = TOKO_SEAT, R = R_(yaw), at = (v) => add3(hip, R(v));
  return { hip, yaw, at, lean: 0.14, side: 0, knee: [0, 1.4, 11.5], foot: [0, -10.6, 13.5], hp: 0.2, hr: 0, hy: 0,
    elR: at([-6.4, 6.6, 3.6]), hdR: at([-3.2, 6.9, 10.5]), elL: at([6.4, 6.6, 3.6]), hdL: at([3.2, 6.9, 10.5]), palm: [[0.2, 1, 0.3], [-0.2, 1, 0.3]], ...o };
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
const ROBOT_CHEST = add3(RB.hip, [0, 12, 0]), MAN_CHEST = add3(MB.hip, [0, 12, 0]);

// ------------------------------------------------------------------ the shots
const SHOTS = [
  // 1 — the gleaming kitchen, the robot at the open dishwasher with its plate and its tag; a slow push in
  { cam: (s) => { const k = smooth(0, 4.4, s); return { ...frameCam({ T: mix([-34, 26, -14], [-31, 30, -12], k), at: [540, 1180], az: lerp(-6, -2, k), el: lerp(9, 7, k), D: lerp(150, 112, k), fov: 30 }), focus: ROBOT_CHEST, ap: 5 }; } },
  // 2 — Toko at the nook with his tea, the robot beyond; he nods off, the clock jumps, he wakes
  { cam: (s) => ({ ...frameCam({ T: [-55, 26, -12], at: [540, 1190], az: -10, el: 8, D: 186, fov: 30 }), focus: [-70, 30, -10], ap: 4 }) },
  // 3 — close on the robot; pull back and truck right past the wall's cut end into the cubicle at night
  { cam: (s) => camPull(s) },
  // 4 — the split (rendered twice and composited): see SPLIT
  { split: true },
  // 5a — the operator yawns
  { cam: (s) => ({ ...frameCam({ T: add3(MAN_CHEST, [2, -2, 0]), at: [540, 1180], az: -4, el: 7, D: 118, fov: 30 }), focus: MAN_CHEST, ap: 5 }) },
  // 5b — over Toko's shoulder: he waves at the robot's camera eye
  { cam: (s) => camWave(s) },
  // 5c — the operator waves back; his monitor shows Toko
  { cam: (s) => { const k = smooth(0, 1.8, s), k2 = smooth(1.8, 4.8, s); return { ...frameCam({ T: add3(MAN_CHEST, [1, 2, -7]), at: [540, 1220], az: lerp(16, 13, k), el: 6, D: lerp(lerp(128, 120, k), 113, k2), fov: 30 }), focus: MAN_CHEST, ap: 4 }; } },
];
const SPLIT = [
  () => ({ ...frameCam({ T: add3(ROBOT_CHEST, [3.0, -6, -2]), at: [540, 1250], az: -20, el: 6, D: 214, fov: 30 }), focus: add3(ROBOT_CHEST, [3, -6, 0]), ap: 4 }),
  () => ({ ...frameCam({ T: add3(MAN_CHEST, [3.0, -6, -2]), at: [540, 1250], az: -20, el: 6, D: 214, fov: 30 }), focus: add3(MAN_CHEST, [3, -6, 0]), ap: 4 }),
];
function camPull(s) {
  const k = smooth(0.55, 2.45, s), k2 = smooth(0.45, 3.4, s);
  const T = mix(add3(ROBOT_CHEST, [1, 0, 0]), add3(MAN_CHEST, [3, -1, 0]), k);
  const D = lerp(62, 118, k2) + Math.sin(Math.PI * k) * 14;
  return { ...frameCam({ T, at: [540, lerp(1300, 1200, k)], az: lerp(-4, -8, k), el: lerp(6, 7, k), D, fov: 30 }), focus: T, ap: lerp(6, 5, k) };
}
const TOKO_W = { hip: [-47, 21.5, 7], yaw: 2.62 };   // standing at the robot's front-right, facing its eye
// v3 (owner, 16.10.2026: tags must clear Instagram's bottom bar): the eye framed at 1040, not 1150, and the camera 15% further back, so the $20,000 tag hangs above y = 1630 and the clock stays under the caption
function camWave(s) {
  const eye = add3(RB.hip, [0, 20.6, 0]);
  const k = smooth(0, 1.7, s);
  return { ...frameCam({ T: add3(eye, [-5, -2, 3]), at: [lerp(560, 550, k), 1040], az: lerp(30, 26, k), el: 5, D: lerp(110, 104, k), fov: 30 }), focus: add3(eye, [-4, 0, 6]), ap: 5 };
}

// ------------------------------------------------------------------ the state of everything at global time tg (on twos)
function clockMin(tg) {
  // 10:10, then while Toko dozes it jumps five minutes in ticks
  const base = 10 * 60 + 10;
  return base + Math.round(clamp((tg - 6.35) / 0.7) * 5 * 4) / 4 + Math.min(1, Math.max(0, (tg - 7.2) / 10));
}
function doorPhi(tg) {
  if (tg < 13.88) return Math.PI / 2;
  const u = clamp((tg - 13.88) / 0.3);
  const shut = Math.PI / 2 * (1 - u * u);
  const bounce = tg > 14.18 ? Math.exp(-(tg - 14.18) * 12) * Math.sin((tg - 14.18) * 40) * 0.05 : 0;
  return Math.max(0, shut) + Math.abs(bounce);
}
function rackIn(tg) { return smooth(13.6, 13.88, tg); }
function monitorState(tg) { return tg < 17.9 ? { mode: 'plate', dx: Math.round((plateU(tg) - 0.5) * 12) / 100 } : { mode: 'toko', wave: Math.round(tg * 12) / 12 * 11 }; }

function tokoPose(tg) {
  // beats 1–2: at the nook; beat 5b: standing in front of the robot, waving
  if (tg >= 17.9 && tg < 19.6) {
    const s = tg - 17.9, up = smooth(0.05, 0.4, s), wave = Math.sin((s - 0.3) * Math.PI * 2 * 2.2) * smooth(0.3, 0.5, s);
    const P = T_STAND(TOKO_W.hip, TOKO_W.yaw);
    const at = P.at;
    P.elR = mix(at([-6.6, 6.0, 1.2]), at([-8.6, 11.6, 3.4]), up); P.hdR = mix(at([-6.4, -0.8, 3.0]), at([-4.0 + wave * 2.6, 18.0, 10.5]), up);
    P.palm = [[0, 0.2, 1].map((v, i) => R_(TOKO_W.yaw)([0.2 * wave, 0.25, 1])[i]), [0, -1, 0.2]];
    P.lean = 0.12 + up * 0.08; P.hp = -0.05; P.hr = 0.12 * Math.sin(s * 3);
    return P;
  }
  const P = seat(); const at = P.at;
  // the sip, the nod, the jolt, the look
  const sip = smooth(4.55, 5.05, tg) * (1 - smooth(5.45, 5.85, tg));
  const nod = smooth(5.95, 6.6, tg) * (1 - smooth(7.12, 7.22, tg));
  const jolt = tg > 7.12 ? Math.exp(-(tg - 7.12) * 6) * Math.sin((tg - 7.12) * 22) : 0;
  const look = smooth(7.45, 7.85, tg);
  const mugRest = at([-4.0, 6.7, 11.5]), mugUp = at([-1.6, 15.4, 6.8]);
  P.hdR = mix(mugRest, mugUp, sip); P.elR = mix(at([-6.8, 6.4, 4.0]), at([-7.2, 10.8, 3.2]), sip);
  P.hdL = at([3.6, 6.9, 10.5]); P.elL = at([6.4, 6.6, 3.6]);
  P.palm = [[0.6, 0.3, 0.2], [-0.2, 1, 0.3]];
  P.lean = 0.14 + nod * 0.14 - jolt * 0.05; P.hp = 0.15 + sip * -0.25 + nod * 0.62 - jolt * 0.2; P.hr = nod * 0.18; P.hy = look * 0.75 + nod * -0.1;
  P.side = nod * 0.06;
  P.mugTilt = sip;
  return P;
}

let lastKey = '';
function poseAll(tg, k) {
  // everyone is posed from the global time: the cut decides only what the camera sees
  const e = Math.round(tg * POSE_FPS);
  setBoil(e);
  // Toko
  const TP = tokoPose(tg);
  toko.pose(TP);
  toko.group.visible = true;
  chair.position.set(TOKO_SEAT.hip[0], 0, TOKO_SEAT.hip[2]); chair.rotation.y = TOKO_SEAT.yaw; chair.visible = !(tg >= 17.9 && tg < 19.6) || true;
  // the mug in Toko's right hand (or on the table when he stands)
  if (tg >= 17.9 && tg < 19.6) { mug.position.set(NOOK[0] + 2, 17.6, NOOK[2] + 1); mug.rotation.set(0, 0, 0); }
  else {
    const h = toko.hands[0]; h.updateMatrixWorld(true);
    const p = h.localToWorld(V([0.2, 0.6, 1.4]));
    mug.position.set(p.x, p.y - 1.6, p.z); mug.rotation.set(0, TOKO_SEAT.yaw + 0.6, (TP.mugTilt || 0) * 0.9);
  }
  // the robot and the operator
  const o = shared(tg);
  const RP = place(RB, o);
  if (tg >= 17.9) {
    // after the dishes: the robot stands; while Toko waves its eye wakes, its head tilts, and at the end its hand starts up
    const s = tg - 17.9, up = smooth(1.25, 1.7, s);
    const R = R_(RB.yaw), at = (v) => add3(RB.hip, R(v));
    Object.assign(RP, { hip: RB.hip, lean: 0.06, side: 0, legs: null, knee: STAND.knee, foot: STAND.foot, hp: 0.0, hr: smooth(0.6, 0.9, s) * 0.14, hy: -0.75,
      elL: at([6.6, 5.0, 1.5]), hdL: at([5.6, -0.5, 3.5]), elR: mix(at([-6.6, 5.0, 1.5]), at([-8.5, 10.5, 2.8]), up), hdR: mix(at([-5.6, -0.5, 3.5]), at([-7.0, 17.5, 5.5]), up), palm: [R([0, -1, 0.2]), R([0, -1, 0.2])] });
  }
  robot.pose(RP);
  let mo = manExtras(o, tg);
  let MP = place(MB, mo);
  if (tg >= 16.4) {
    // 5a: a big stretching yawn; 5c: the wave back
    const R = R_(MB.yaw), at = (v) => add3(MB.hip, R(v));
    const y = smooth(16.5, 16.95, tg) * (1 - smooth(17.4, 17.85, tg));
    const wv = smooth(19.75, 20.1, tg) * (1 - smooth(21.9, 22.5, tg)), wave = Math.sin((tg - 20.0) * Math.PI * 2 * 1.3) * smooth(20.0, 20.2, tg);
    MP = { hip: MB.hip, yaw: MB.yaw, lean: 0.06 - y * 0.16, side: 0, knee: STAND.knee, foot: STAND.foot, legs: null,
      hp: 0.2 - y * 0.75 + wv * 0.05, hr: wv * -0.14, hy: 0.1,
      elR: mix(mix(at([-6.6, 5.0, 1.5]), at([-7.5, 15, -0.5]), y), at([-10.2, 11.5, 3.4]), wv), hdR: mix(mix(at([-5.6, -0.5, 3.5]), at([-5.5, 24.5, 0.5]), y), at([-11.0 + wave * 3.6, 21.0, 8.0]), wv),
      elL: mix(at([6.6, 5.0, 1.5]), at([7.5, 15, -0.5]), y), hdL: mix(at([5.6, -0.5, 3.5]), at([5.5, 24.5, 0.5]), y),
      palm: [R([0, -1, 0.2]), R([0, -1, 0.2])] };
  }
  man.pose(MP);
  // the robot's extras: belt, joints, tag
  {
    const A = robot.anchor, R = R_(RB.yaw);
    rBelt.position.set(...add3(A.H0, [0, 1.4, 0])); rBelt.rotation.set(RP.lean * 0.4, RP.yaw, -RP.side * 0.4, 'YXZ');
    const pts = [A.S[0], A.S[1], RP.elR, RP.elL];
    pts.forEach((p, i) => rJoints[i].position.set(...p));
    // knees
    [-1, 1].forEach((s, i) => { const LG = (RP.legs && RP.legs[i]) || {}; const kn = add3(RP.hip, R(add3([s * 3.0, 0, 0], LG.knee || RP.knee))); rJoints[4 + i].position.set(...kn); });
    const neck = add3(A.H3, [0, 0.6, 0]);
    const fwd = R([0, 0, 1]);
    const tagAt = add3(add3(A.H0, [0, 4.4, 0]), fwd.map(v => v * 5.6));
    rTag.position.set(...tagAt); rTag.rotation.set(-0.12, RP.yaw, Math.sin(tg * 2.1) * 0.04 + (RP.side || 0) * -0.5, 'YXZ');
    rTagString.geometry.dispose();
    const top = add3(tagAt, [0, -0.3, 0]);
    rTagString.geometry = sausage([add3(neck, R([-2.3, 0, 0.8])), add3(top, R([-1.0, 1.4, 0.1])), top, add3(top, R([1.0, 1.4, 0.1])), add3(neck, R([2.3, 0, 0.8]))], [0.07, 0.07, 0.07, 0.07, 0.07], { seg: 6, steps: 30, capSteps: 1 });
  }
  // the plate: in the robot's hands, then standing in the rack
  if (o.plate) {
    const R = R_(RB.yaw);
    thePlate.position.set(...add3(RB.hip, R(o.plate)));
    thePlate.rotation.set(-0.15, RB.yaw, 0.05, 'YXZ');
    thePlate.visible = true;
  } else thePlate.visible = false;
  // the operator's controllers, in his hands
  [0, 1].forEach(i => { const h = man.hands[i]; h.updateMatrixWorld(true); ctrls[i].position.copy(h.localToWorld(V([0, 0.2, 0.6]))); ctrls[i].quaternion.copy(h.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))); });
  // the dishwasher's door and rack; the plate in the rack once loaded
  const phi = doorPhi(tg), rin = rackIn(tg);
  dw.userData.door.rotation.x = phi; rackPlate.visible = tg >= 12.8;
  dw.userData.rack.position.set(0, lerp(2.6, 2.2, rin), lerp(dw.userData.rd + 2.5, 0.2, rin) - 0.3);
  // the clock
  kClock.set(clockMin(tg));
  // the robot's eye: it wakes when Toko waves
  const lit = tg >= 17.9 ? 0.5 + 1.6 * smooth(18.2, 18.35, tg) : 0.5;
  RM.iris.color.setRGB(0.25 * lit, 1.2 * lit, 1.0 * lit);
  // the monitor
  const ms = monitorState(tg), mk = JSON.stringify(ms);
  if (mk !== monitor.key) { monitor.key = mk; paintMonitor(monitor.g, monitor.canvas.width, monitor.canvas.height, ms); monitor.tex.needsUpdate = true; }
  scene.updateMatrixWorld(true);
  const ew = rHead.userData.eye.getWorldPosition(new THREE.Vector3());
  eyeL.position.copy(ew).add(V(R_(RB.yaw)([0, 0, 2]))); eyeL.intensity = 30 * lit;
}

function setCam(c) {
  camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); camera.lookAt(...c.look); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  return { focus: camera.position.distanceTo(V(c.focus)), ap: c.ap };
}
function grade(f, t) {
  return {
    focus: f.focus, aperture: f.ap, maxBlur: TUNE.maxBlur, radScale: TUNE.radScale, noTile: TUNE.noTile,
    threshold: 1.5, knee: 0.5, bloomA: 0.24, bloomB: 0.12,
    exposure: TUNE.exp, vignette: 0.34, grain: 0.025, seed: t * 37 % 97,
    sat: 1.04, contrast: 1.05, lift: [0.008, 0.012, 0.012], gain: [0.99, 1.0, 1.0], toe: 0.04,
  };
}
function shotAt(t) { for (let k = 0; k < SHOTS.length; k++) if (t < CUTS[k + 1] || k === SHOTS.length - 1) return k; }
/** draw global time t into out2d */
function drawFrame(t, camOverride = null) {
  const k = shotAt(t), s = t - CUTS[k];
  const e = Math.floor(t * POSE_FPS + 1e-6), tg = e / POSE_FPS;
  if (lastKey !== e) { lastKey = e; poseAll(tg, k); }
  g2d.globalAlpha = 1;
  if (SHOTS[k].split && !camOverride) {
    // the two halves, side by side, a pale gap between
    g2d.fillStyle = '#eef4f1'; g2d.fillRect(0, 0, W, H);
    const half = (W - SPLIT_GAP * RES) / 2;
    SPLIT.forEach((cf, i) => {
      const f = setCam(cf(s));
      post.render(scene, camera, grade(f, t));
      g2d.drawImage(renderer.domElement, (W - half) / 2, 0, half, H, i ? W - half : 0, 0, half, H);
    });
    return;
  }
  const f = setCam(camOverride || SHOTS[k].cam(s));
  post.render(scene, camera, grade(f, t));
  g2d.drawImage(renderer.domElement, 0, 0);
}

function probe(k, s) {
  lastKey = -1; const t = CUTS[k] + s; drawFrame(t, SHOTS[k].split ? SPLIT[0](s) : null);
  const P = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * 1080), Math.round((1 - p.y) / 2 * 1920)]; };
  const o = {};
  o.tokoMask = P(toko.mask.getWorldPosition(new THREE.Vector3())); o.tokoHandR = P(toko.hands[0].getWorldPosition(new THREE.Vector3()));
  o.robotEye = P(rHead.userData.eye.getWorldPosition(new THREE.Vector3())); o.robotFeet = P(V([RB.hip[0], 0, RB.hip[2]])); o.tag = P(rTag.position);
  o.manHead = P(man.head.getWorldPosition(new THREE.Vector3())); o.manFeet = P(V([MB.hip[0], 0, MB.hip[2]]));
  o.plate = P(thePlate.position); o.dw = P(dw.position); o.clock = P(kClock.group.position); o.monitor = P(V(add3(MON, [0, 10, 0])));
  o.divEnd = P(V([0, 40, DIV_Z1]));
  return o;
}
const TUNE = { radScale: 1.5, maxBlur: 22, noTile: false, exp: 0.95 };
window.__film = {
  probe, W, H, FPS, CUTS, frames: FRAMES,
  frame(i, q = 0.94) { drawFrame(i / FPS); return out2d.toDataURL('image/jpeg', q); },
  still(k, s, cam) { lastKey = -1; drawFrame(CUTS[k] + s, cam || null); return out2d.toDataURL('image/png'); },
  tune(o) { Object.assign(TUNE, o); },
};
window.__ready = true;
