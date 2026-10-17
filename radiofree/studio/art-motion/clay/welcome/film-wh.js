// WELCOME HOME — Radio Free Helsinki tech satire #2, clay. LOOK TEST (17 Oct 2026), stills only.
// The launch film of a home display that knows your face (HomeView, 13 Oct 2026), remade in clay: a high-key,
// airy kitchen, a rose-pink display on a domed speaker on the island, and a masked Toko at the door. The device
// is unbranded. Look 1: the hero shot of the device, Toko soft behind it. Look 2: the device's own camera
// has found his face; the room is in focus, the device soft in the foreground.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../clay-roadster/lib/post.js';
import { surface, setBoil } from '../clay-roadster/lib/clay.js';
import { lumpy, sausage, ball, mesh as mesh0, rng } from '../clay-roadster/lib/sculpt.js';
import { canvas, tex } from '../clay-roadster/lib/city.js';
import { Toko } from '../clay-roadster/lib/toko.js';

const W = 1080, H = 1920;
// every prop goes into the scene unless it names its own parent (sculpt.mesh adds nothing by default)
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#f3ece2');
const camera = new THREE.PerspectiveCamera(36, W / H, 4, 4000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');

// ------------------------------------------------------------------ clays: an advert's kitchen — pale, soft, matte
const C = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffe6d2', rough: 0.7, bump: 1, lump: 0.03, lumpF: 0.3, thumb: 0.02, thumbCell: 2.6, ridge: 0.1, tool: 0.3, grain: 0.002, grainF: 8, mottle: 0.05, specks: 0.12, roughVar: 0.06, ...o });
const M = {
  wall: C('#efe6da', { thumb: 0.012, thumbCell: 6, mottle: 0.04, specks: 0.05 }),
  wallD: C('#e2d6c6', { thumb: 0.012, thumbCell: 6 }),
  floor: C('#d8c3a5', { thumbCell: 4, tool: 0.6 }), floorL: C('#e3d1b6', { thumbCell: 4, tool: 0.6 }),
  top: C('#f7f3ec', { rough: 0.45, thumb: 0.014, thumbCell: 3.5, specks: 0.25, speckColor: '#b9b0a2', clearcoat: 0.25, clearcoatRough: 0.35 }),
  island: C('#a9bba4', { thumbCell: 3 }), islandD: C('#92a68d', { thumbCell: 3 }),
  wood: C('#c99a68', { tool: 0.8, thumbCell: 2 }), woodD: C('#a87a4e'),
  door: C('#f4efe6', { thumbCell: 4 }), frame: C('#e7dccb'),
  pink: C('#efb7b6', { rough: 0.42, thumb: 0.012, thumbCell: 1.6, specks: 0.05, clearcoat: 0.5, clearcoatRough: 0.25 }),
  mesh: C('#e6a5a4', { surf: 'felt', rough: 1, fibre: 0.06, fibreF: 3, mottle: 0.05 }),
  bezel: C('#18181a', { rough: 0.2, thumb: 0.006, specks: 0, clearcoat: 1.0, clearcoatRough: 0.08 }),
  orange: C('#f08a2a', { thumbCell: 0.8, thumb: 0.03 }), lemon: C('#f2d24a', { thumbCell: 0.8, thumb: 0.03 }), leafG: C('#4f8a4a', { thumbCell: 1 }),
  bowl: C('#ffffff', { rough: 0.35, clearcoat: 0.5, clearcoatRough: 0.2 }), pot: C('#d77a55'), soil: C('#5a3b28'),
  sky: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.85, 1.7) }),
  glassT: new THREE.MeshBasicMaterial({ color: new THREE.Color('#dfeaf3') }),
};
const TK = {   // Toko at home: the original magenta mask, an oat hoodie, indigo jeans
  hoodie: C('#e6d8c2', { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1, mottle: 0.05 }), hoodie2: C('#d9c9b0', { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1 }),
  cuff: C('#d9c9b0'), jeans: C('#3b4f78', { thumbCell: 1.8, tool: 0.7 }), shoes: C('#f4f1ea'), sole: C('#cfc8bb'),
  glove: C('#f0027f', { thumbCell: 1.2, thumb: 0.03, specks: 0.2, speckColor: '#5a0730' }), hair: C('#3a2e28', { tool: 1.2, thumbCell: 0.9, thumb: 0.04 }),
  maskDisc: C('#f0027f', { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2, speckColor: '#6a0030' }),
  maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
  strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
};

// ------------------------------------------------------------------ the room, at PUPPET scale (cm; Toko stands 46 tall; floor y = 0)
const BACK = -150;
mesh(new THREE.PlaneGeometry(500, 500).rotateX(-Math.PI / 2), M.floor, { pos: [0, 0, -40] });
for (let i = -16; i <= 16; i++) mesh(new THREE.BoxGeometry(7.7, 0.25, 500), i % 2 ? M.floorL : M.floor, { pos: [i * 8, 0.12, -40] });
// the back wall, cut for a door (left) and a tall window (right)
const V2 = ([x, y]) => new THREE.Vector2(x, y);
const wallShape = new THREE.Shape([[-160, 0], [160, 0], [160, 200], [-160, 200]].map(V2));
wallShape.holes.push(new THREE.Path([[-46, 0], [-20, 0], [-20, 53], [-46, 53]].map(V2)));
wallShape.holes.push(new THREE.Path([[4, 16], [44, 16], [44, 64], [4, 64]].map(V2)));
mesh(lumpy(new THREE.ExtrudeGeometry(wallShape, { depth: 4, bevelEnabled: false, curveSegments: 4 }), 0.04, 0.25, 7), M.wall, { pos: [0, 0, BACK - 4] });
mesh(new RoundedBoxGeometry(320, 2.6, 1, 2, 0.4), M.wallD, { pos: [0, 1.3, BACK + 0.5] });
for (const x of [-47.3, -18.7]) mesh(new RoundedBoxGeometry(2.4, 55, 2, 2, 0.6), M.frame, { pos: [x, 27.5, BACK + 0.3] });
mesh(new RoundedBoxGeometry(31, 2.4, 2, 2, 0.6), M.frame, { pos: [-33, 54, BACK + 0.3] });
mesh(lumpy(new RoundedBoxGeometry(25, 52, 1.6, 2, 0.5), 0.03, 0.3, 9), M.door, { pos: [-55, 26, BACK - 11], rot: [0, 1.05, 0] });
mesh(new THREE.PlaneGeometry(120, 100), M.wallD, { pos: [-33, 50, BACK - 45] });
// the window: frame, mullion, a bright garden beyond (an emissive card), a sill with a plant
for (const x of [3, 45]) mesh(new RoundedBoxGeometry(2.2, 51, 3, 2, 0.6), M.frame, { pos: [x, 40, BACK + 0.8] });
for (const y of [15, 65]) mesh(new RoundedBoxGeometry(44, 2.2, 3, 2, 0.6), M.frame, { pos: [24, y, BACK + 0.8] });
mesh(new RoundedBoxGeometry(1.5, 48, 2.2, 2, 0.5), M.frame, { pos: [24, 40, BACK + 0.8] });
mesh(new RoundedBoxGeometry(50, 1.8, 7, 2, 0.6), M.frame, { pos: [24, 14.2, BACK + 3] });
mesh(new THREE.PlaneGeometry(70, 70), M.sky, { pos: [24, 40, BACK - 22], cast: false });
{ const r = rng(5); for (let i = 0; i < 16; i++) mesh(lumpy(ball(4 + r() * 5, 1, 0.8, 0.6, 20), 0.15, 0.25, 40 + i), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.28 + r() * 0.06, 0.35, 0.62 + r() * 0.12) }), { pos: [5 + r() * 38, 17 + r() * 22, BACK - 18], cast: false }); }
function plant(x, y, z, s = 1) {
  mesh(lumpy(new THREE.CylinderGeometry(4 * s, 3 * s, 7 * s, 24), 0.03, 1, 51), M.pot, { pos: [x, y + 3.5 * s, z] });
  mesh(ball(3.8 * s, 1, 0.25, 1, 20), M.soil, { pos: [x, y + 7 * s, z] });
  const r = rng(11);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + r(), up = 8 + r() * 8, out = 4 + r() * 5;
    mesh(lumpy(sausage([[x, y + 7 * s, z], [x + Math.cos(a) * out * 0.5 * s, y + (7 + up * 0.7) * s, z + Math.sin(a) * out * 0.5 * s], [x + Math.cos(a) * out * s, y + (7 + up) * s, z + Math.sin(a) * out * s]], [[1.3 * s, 0.35 * s], [2.2 * s, 0.4 * s], [0.4 * s, 0.2 * s]], { seg: 10, steps: 14, up: [Math.cos(a), 0, Math.sin(a)] }), 0.05, 1, 60 + i), M.leafG); }
}
plant(12, 15.1, BACK + 3, 0.55);
// an open shelf right of the window: a bowl and a jar
mesh(new RoundedBoxGeometry(24, 1.6, 7, 2, 0.5), M.wood, { pos: [62, 46, BACK + 3.5] });
mesh(lumpy(ball(3.4, 1, 0.55, 1, 24), 0.03, 1, 71), M.bowl, { pos: [56, 48.3, BACK + 3.5] });
mesh(lumpy(new THREE.CylinderGeometry(2, 2, 6, 20), 0.03, 1, 72), M.pot, { pos: [67, 49.8, BACK + 3.5] });

// the island in the foreground: a sage body, a pale stone top with a rounded edge (a real one is waist height: 24 here)
const TOP_Y = 24, ISL = { x: 0, z: -10, w: 76, d: 30 };
mesh(lumpy(new RoundedBoxGeometry(ISL.w - 4, TOP_Y - 2, ISL.d - 4, 3, 0.8), 0.03, 0.3, 81), M.island, { pos: [ISL.x, (TOP_Y - 2) / 2, ISL.z] });
for (let i = -4; i <= 4; i++) mesh(new RoundedBoxGeometry(0.4, TOP_Y - 6, 0.5, 1, 0.15), M.islandD, { pos: [i * 8.4, (TOP_Y - 2) / 2, ISL.z + ISL.d / 2 - 1.9] });
mesh(lumpy(new RoundedBoxGeometry(ISL.w, 2.2, ISL.d, 4, 1.0), 0.02, 0.3, 82), M.top, { pos: [ISL.x, TOP_Y - 1.1, ISL.z] });
// a fruit bowl and a cutting board on the island
const FR = new THREE.Group(); scene.add(FR); FR.position.set(-20, TOP_Y, -14); FR.scale.setScalar(0.55);
mesh(lumpy(ball(9, 1, 0.42, 1, 32), 0.02, 1, 90), M.bowl, { pos: [0, 2, 0], parent: FR });
{ const r = rng(3); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; mesh(lumpy(ball(i % 3 ? 3.0 : 2.6, 1, i % 3 ? 1 : 0.8, i % 3 ? 1 : 0.8, 24), 0.08, 0.8, 91 + i), i % 3 ? M.orange : M.lemon, { pos: [Math.cos(a) * 4.2, 4.6 + r() * 1.2, Math.sin(a) * 4.2], parent: FR }); } }
mesh(lumpy(new RoundedBoxGeometry(13, 0.9, 8.5, 2, 0.4), 0.02, 0.5, 98), M.wood, { pos: [-6, TOP_Y + 0.45, -18], rot: [0, 0.2, 0] });

// ------------------------------------------------------------------ the device: a 7-inch screen on a domed speaker
// Hero prop, built bigger than life as a launch film's product shot is: 3× (the screen 12 cm across on a 46 cm Toko).
const DEV = new THREE.Group(); scene.add(DEV); DEV.position.set(4, TOP_Y, 2); DEV.rotation.y = -0.3; DEV.scale.setScalar(0.5);
mesh(lumpy(ball(9.5, 1, 0.62, 1, 48), 0.02, 1, 101), M.mesh, { pos: [0, 0, 0], parent: DEV });
mesh(lumpy(new THREE.TorusGeometry(9.2, 0.7, 12, 48).rotateX(Math.PI / 2), 0.02, 1, 102), M.pink, { pos: [0, 0.6, 0], parent: DEV });
mesh(lumpy(new THREE.CylinderGeometry(1.6, 2.2, 5, 20), 0.02, 1, 103), M.pink, { pos: [0, 7.5, -1], parent: DEV });
const SCR = new THREE.Group(); SCR.position.set(0, 16.5, -0.4); SCR.rotation.x = -0.14; DEV.add(SCR);
mesh(lumpy(new RoundedBoxGeometry(23.5, 16, 1.6, 4, 0.7), 0.01, 1, 104), M.pink, { parent: SCR });
mesh(new RoundedBoxGeometry(22.2, 14.7, 0.3, 3, 0.15), M.bezel, { pos: [0, 0, 0.75], parent: SCR, cast: false });
const uiCan = canvas(880, 580), ui = uiCan.getContext('2d'), uiTex = tex(uiCan);
const uiMat = new THREE.MeshBasicMaterial({ map: uiTex, toneMapped: false });
mesh(new THREE.PlaneGeometry(20.6, 13.6), uiMat, { pos: [0, 0, 0.92], parent: SCR, cast: false });
mesh(ball(0.32, 1, 1, 0.4, 12), M.bezel, { pos: [0, 7.6, 0.85], parent: SCR, cast: false });   // the camera dot

/** the screen: 'home' = the clock and a greeting; 'face' = its camera view with a box locked on a face */
function drawUI(mode) {
  const g = ui, w = 880, h = 580;
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#f6c9b8'); bg.addColorStop(0.5, '#e7a7c0'); bg.addColorStop(1, '#a9b7e8'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.18)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(120 + i * 150, 120 + (i % 2) * 300, 140, 0, 6.28); g.fill(); }
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  if (mode === 'home') {
    g.font = '300 168px Inter, sans-serif'; g.fillText('7:42', 54, 214);
    g.font = '600 50px Inter, sans-serif'; g.fillText('Welcome home.', 60, 300);
    g.font = '400 34px Inter, sans-serif'; g.globalAlpha = 0.85; g.fillText('Lights on · 21°', 62, 352); g.globalAlpha = 1;
    [[60, 'Kitchen'], [310, 'Music'], [560, 'Front door']].forEach(([x, s]) => { g.fillStyle = 'rgba(255,255,255,.32)'; g.beginPath(); g.roundRect(x, 410, 230, 120, 26); g.fill(); g.fillStyle = '#fff'; g.font = '600 32px Inter, sans-serif'; g.fillText(s, x + 24, 488); });
  } else {
    g.fillStyle = '#d6c6b4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b9a690'; g.fillRect(260, 120, 300, 460);  // the doorway, as its camera sees it
    g.fillStyle = '#e6d8c2'; g.beginPath(); g.ellipse(410, 560, 170, 150, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#f0027f'; g.beginPath(); g.arc(410, 300, 98, 0, 6.28); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round';
    const bx = 290, by = 180, bw = 240, bh = 240, k = 46;
    for (const [x, y, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) { g.beginPath(); g.moveTo(x + dx * k, y); g.lineTo(x, y); g.lineTo(x, y + dy * k); g.stroke(); }
    g.fillStyle = 'rgba(20,20,24,.55)'; g.beginPath(); g.roundRect(160, 470, 560, 84, 42); g.fill();
    g.fillStyle = '#fff'; g.font = '600 40px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('Hi! Who are you?', 440, 526); g.textAlign = 'left';
  }
  uiTex.needsUpdate = true;
}

// ------------------------------------------------------------------ Toko, in the doorway
const toko = new Toko(TK); scene.add(toko.group);
let TOKO = [-33, 0, BACK + 6];
function poseToko(look) {
  const hip = add3(TOKO, [0, 21.5, 0]);
  const at = (v) => add3(hip, v);
  toko.pose({ hip, yaw: 0.12, lean: 0.06, side: 0, knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6], hp: look ? -0.05 : 0.05, hr: look ? 0.06 : 0, hy: look ? -0.08 : 0.1,
    elR: at([-6.6, 8.6, 1.2]), hdR: at([-7.4, 2.2, 2.4]), elL: at([6.4, 8.8, 2.4]), hdL: at([5.0, 3.6, 6.4]), palm: [[0, -1, -0.3], [0.2, -0.7, 0.7]] });
  // a tote bag on his left wrist: he has just come home
  if (!poseToko.bag) { poseToko.bag = mesh(lumpy(new RoundedBoxGeometry(6.5, 8, 2.2, 2, 0.8), 0.06, 0.6, 120), C('#f0e7d2', { surf: 'felt', rough: 1, fibre: 0.07, fibreF: 2.4 }), { parent: scene }); }
  poseToko.bag.position.set(...at([6.2, -2.0, 6.8])); poseToko.bag.rotation.set(0.1, 0.2, 0.05);
  toko.group.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ light: a launch film's — soft, bright, warm window key
scene.add(new THREE.HemisphereLight('#fff4e6', '#c9b49a', 1.15));
{ const k = new THREE.DirectionalLight('#fff1dc', 2.1); k.position.set(140, 210, BACK + 30); k.target.position.set(-10, 20, -40); k.castShadow = true;
  k.shadow.mapSize.set(2048, 2048); Object.assign(k.shadow.camera, { left: -180, right: 180, top: 180, bottom: -180, near: 10, far: 900 }); k.shadow.bias = -0.0003; k.shadow.normalBias = 0.03; k.shadow.radius = 6;
  scene.add(k, k.target); }
{ const f = new THREE.DirectionalLight('#ffe9e6', 0.6); f.position.set(-80, 120, 160); scene.add(f); }
{ const r = new THREE.PointLight('#ffd7c8', 900, 120, 2); r.position.set(30, 90, 40); scene.add(r); }

// ------------------------------------------------------------------ the two looks
// 1: the product shot — the display lower right, sharp; Toko soft in the doorway behind, just home.
// 2: what the display's own camera sees: Toko at the island, square to it, and the face box locking on.
const LOOKS = [
  { name: 'wh-look-1-hero', ui: 'home', look: 0, toko: [-33, 0, BACK + 6], pos: [-6, 34, 58], at: [-1, 33, -44], fov: 56, focus: 'dev', ap: 10 },
  { name: 'wh-look-2-face', ui: 'face', look: 1, toko: [-1, 0, -36], pos: [4, 33, 4], at: [-1, 41.5, -36], fov: 30, focus: 'toko', ap: 6, hideDev: true },
];
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
function faceBox(c) {
  const m = toko.mask.getWorldPosition(new THREE.Vector3()), [x, y] = project(m), e = project(m.clone().add(new THREE.Vector3(5.2, 0, 0)))[0] - x;
  const r = e * 1.05, k = r * 0.42;
  c.save(); c.strokeStyle = '#fff'; c.lineWidth = 9; c.lineCap = 'round'; c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 12;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(x + sx * r, y + sy * (r - k)); c.arcTo(x + sx * r, y + sy * r, x + sx * (r - k), y + sy * r, k * 0.5); c.lineTo(x + sx * (r - k), y + sy * r); c.stroke(); }
  const py = y + r + 120; c.shadowColor = 'transparent'; c.fillStyle = 'rgba(28,28,32,.62)'; c.beginPath(); c.roundRect(x - 330, py - 62, 660, 112, 56); c.fill();
  c.fillStyle = '#fff'; c.font = '600 54px Inter, "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.fillText('Welcome home, …?', x, py + 14); c.restore();
}
function draw(i) {
  const L = LOOKS[i];
  setBoil(i + 1); drawUI(L.ui); TOKO = L.toko; poseToko(L.look); DEV.visible = !L.hideDev;
  camera.fov = L.fov; camera.position.set(...L.pos); camera.lookAt(...L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  const target = L.focus === 'dev' ? DEV.localToWorld(new THREE.Vector3(0, 16.5, 0)) : toko.mask.getWorldPosition(new THREE.Vector3());
  post.render(scene, camera, { focus: camera.position.distanceTo(target), aperture: L.ap, maxBlur: 26, radScale: 0.9,
    threshold: 1.4, knee: 0.5, bloomA: 0.22, bloomB: 0.16, exposure: 1.06, vignette: 0.12, grain: 0.018, seed: i * 13,
    sat: 1.04, contrast: 0.98, lift: [0.012, 0.008, 0.006], gain: [1.02, 1.0, 0.98], toe: 0.02 });
  g2d.drawImage(renderer.domElement, 0, 0);
  if (L.ui === 'face') faceBox(g2d);
  return out2d.toDataURL('image/png');
}
window.__film = { looks: LOOKS.map((l) => ({ name: l.name })), look: draw };
window.__ready = true;
