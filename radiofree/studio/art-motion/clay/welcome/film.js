// WELCOME HOME — the film, v1 (18 Oct). Slot 4, Tue 27 Oct 00:50. Premise 2, "Once You Leave", greenlit 17 Oct, written
// to the one-question rule (PLANNING.md): "A home screen that knows your face. What does it keep when you leave?"
// The stage is the premium-3D polish test (film-wh3.js, the look STYLES.md assigns this film: smooth vinyl and lacquer,
// studio reflections), on its own copy of the clay kit (lib/). Built from the research description; the owner's frames
// from the real launch film are still wanted. 1080×1920, 30 fps, the puppets on twos. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { sausage, ball, lathe, mesh as mesh0, rng } from './lib/sculpt.js';
const lumpy = (g) => g;   // POLISH: no lumps, no thumbprints — clean surfaces
import { canvas, tex } from './lib/city.js';
import { Toko } from './lib/toko.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
import * as CAP from '../../pipeline/text/captions.js';
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
{ const f = new FontFace('Inter', `url(${FONT_DIR}Inter-var.woff)`, { weight: '100 900' }); document.fonts.add(await f.load()); }
{ const f = new FontFace('IPAPGothic', `url(${FONT_DIR}IPAPGothic.ttf)`); document.fonts.add(await f.load()); }   // Japanese, a gothic
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e2d6');
const camera = new THREE.PerspectiveCamera(46, W / H, 2, 3000);
const post = new Post(renderer, W, H);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; }
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ clays
const C = (color, o = {}) => {
  const fabric = o.surf === 'felt' || o.surf === 'knit';
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: fabric ? 0.85 : Math.min(0.62, o.rough ?? 0.5), metalness: o.metal ?? 0,
    clearcoat: fabric ? 0 : (o.clearcoat ?? 0.35), clearcoatRoughness: o.clearcoatRough ?? 0.28, sheen: fabric ? 0.7 : 0, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'),
    emissive: new THREE.Color(o.emissive ?? '#000000'), side: o.side ?? THREE.FrontSide, envMapIntensity: 1 });
};
const GLAZE = (color, o = {}) => C(color, { rough: 0.12, clearcoat: 1, clearcoatRough: 0.05, ...o });
const M = {
  wall: C('#e8dccb', { thumb: 0.01, thumbCell: 7, mottle: 0.035, specks: 0.04 }), wallShade: C('#e4d9ca', { thumbCell: 7 }),
  grout: C('#d8d0c4', { thumb: 0.01, thumbCell: 3 }),
  oak: C('#cfa676', { tool: 0.9, thumbCell: 2.2, mottle: 0.08 }), oakD: C('#b88d5d', { tool: 0.9, thumbCell: 2.2 }), oakL: C('#ddb98c', { tool: 0.9 }),
  plank: C('#c9a173', { tool: 1.0, thumbCell: 2.4, mottle: 0.1 }), plankB: C('#bd9365', { tool: 1.0, thumbCell: 2.4, mottle: 0.1 }),
  quartz: C('#f6f2ea', { rough: 0.32, thumb: 0.012, thumbCell: 3.5, specks: 0.3, speckColor: '#c4bcb0', clearcoat: 0.4, clearcoatRough: 0.25 }),
  sage: C('#9fb39a', { thumbCell: 3 }), sageD: C('#879c82', { thumbCell: 3 }),
  brass: C('#c9a35a', { rough: 0.3, metal: 0.75, thumb: 0.01, specks: 0, clearcoat: 0.3 }),
  linen: C('#efe6d4', { surf: 'felt', rough: 1, fibre: 0.07, fibreF: 2.6, mottle: 0.05 }),
  cooktop: C('#141416', { rough: 0.15, thumb: 0.004, specks: 0, clearcoat: 1, clearcoatRough: 0.05 }),
  pan: C('#2a2a2d', { rough: 0.45, metal: 0.3, thumb: 0.015 }), toast: C('#d99a45', { thumbCell: 0.8, thumb: 0.05, tool: 0.6, mottle: 0.25 }), toastD: C('#b8742c', { thumbCell: 0.8, thumb: 0.05 }),
  enamel: GLAZE('#f4f1ea'), cup: GLAZE('#e9e4d8'), terracotta: C('#c97a52', { thumbCell: 1.6 }), jar: GLAZE('#dfe7e2', { opacity: 1 }),
  lemon: C('#f0cf3c', { thumbCell: 0.7, thumb: 0.04, mottle: 0.1 }), leaf: C('#6f8f6a', { thumbCell: 1 }), leafB: C('#90a98a', { thumbCell: 1 }),
  bread: C('#c88a45', { thumbCell: 0.9, thumb: 0.05, tool: 0.8 }), board: C('#b07a48', { tool: 0.9 }),
  pink: C('#efb3b2', { rough: 0.4, thumb: 0.012, thumbCell: 1.6, specks: 0.05, clearcoat: 0.5, clearcoatRough: 0.25 }),
  meshPink: C('#e3a2a1', { surf: 'felt', rough: 1, fibre: 0.06, fibreF: 3, mottle: 0.05 }),
  bezel: C('#151517', { rough: 0.18, thumb: 0.006, specks: 0, clearcoat: 1, clearcoatRough: 0.06 }),
  cord: C('#f2efe9', { rough: 0.5, thumb: 0.01 }), hole: new THREE.MeshBasicMaterial({ color: '#0d0b0a' }),
  hall: C('#e9dcc8', { thumbCell: 6 }), garden: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 1.62, 1.45) }),
};

// ------------------------------------------------------------------ the room (cm, puppet scale: Toko stands 46; floor y = 0; camera looks down −z)
const BACK = -120, CTOP = 22.5;
// oak floor, plank by plank
for (let i = -14; i <= 14; i++) mesh(lumpy(new RoundedBoxGeometry(9.6, 1, 340, 2, 0.35), 0.03, 0.3, 300 + i), i % 2 ? M.plank : M.plankB, { pos: [i * 9.8, -0.5, -40], cast: false });
// the back wall, cut for the window over the counter and the hall door on the left
const V2 = ([x, y]) => new THREE.Vector2(x, y);
const wallShape = new THREE.Shape([[-200, -2], [200, -2], [200, 170], [-200, 170]].map(V2));
wallShape.holes.push(new THREE.Path([[-12, 30], [32, 30], [32, 68], [-12, 68]].map(V2)));     // the window
wallShape.holes.push(new THREE.Path([[-104, 0], [-80, 0], [-80, 53], [-104, 53]].map(V2)));    // the hall door
const wall = mesh(lumpy(new THREE.ExtrudeGeometry(wallShape, { depth: 5, bevelEnabled: false, curveSegments: 2 }), 0.04, 0.25, 7), M.wall, { pos: [0, 0, BACK - 5] });
wall.castShadow = true; M.wall.shadowSide = THREE.DoubleSide;
// the window: deep reveal, frame, a mullion and a transom, the garden beyond
for (const [x, y, w, h] of [[-12.6, 49, 1.6, 40], [32.6, 49, 1.6, 40], [10, 68.8, 46, 1.6], [10, 29.4, 46, 1.6]]) mesh(new RoundedBoxGeometry(w, h, 6, 2, 0.5), M.wall, { pos: [x, y, BACK - 2.5] });
for (const [x, y, w, h] of [[10, 49, 1.4, 38], [10, 56, 44, 1.2]]) mesh(new RoundedBoxGeometry(w, h, 1.6, 2, 0.4), M.oakL, { pos: [x, y, BACK - 3.4] });
mesh(new RoundedBoxGeometry(48, 1.4, 7, 2, 0.5), M.quartz, { pos: [10, 29.6, BACK + 1.4] });
mesh(new THREE.PlaneGeometry(130, 90), M.garden, { pos: [10, 50, BACK - 60], cast: false });
{ const r = rng(5); for (let i = 0; i < 26; i++) mesh(lumpy(ball(5 + r() * 9, 1, 0.85, 0.5, 18), 0.25, 0.2, 40 + i), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.25 + r() * 0.07, 0.3 + r() * 0.15, 0.48 + r() * 0.16).multiplyScalar(1.25) }), { pos: [-20 + r() * 64, 26 + r() * 30, BACK - 40 - r() * 10], cast: false }); }
// the hall: a short passage, lighter, a runner
mesh(new THREE.PlaneGeometry(60, 70), M.hall, { pos: [-92, 35, BACK - 40] });
mesh(new THREE.PlaneGeometry(40, 70).rotateY(Math.PI / 2), M.hall, { pos: [-108, 35, BACK - 20] });
mesh(new RoundedBoxGeometry(14, 0.4, 40, 2, 0.15), C('#b85a3c', { surf: 'felt', rough: 1, fibre: 0.08, fibreF: 2 }), { pos: [-92, 0.3, BACK - 20], cast: false });
for (const x of [-105.2, -78.8]) mesh(new RoundedBoxGeometry(2.4, 55, 6.4, 2, 0.6), M.oakL, { pos: [x, 27.5, BACK - 2.4] });
mesh(new RoundedBoxGeometry(28.8, 2.4, 6.4, 2, 0.6), M.oakL, { pos: [-92, 54.2, BACK - 2.4] });

// the back counter: oak lowers with brass pulls, a quartz top, the cooktop
const RUN = { x0: -68, x1: 70, d: 15 };
for (let x = RUN.x0; x < RUN.x1 - 1; x += 17.25) {
  mesh(lumpy(new RoundedBoxGeometry(16.6, CTOP - 3.4, 1.4, 2, 0.4), 0.03, 0.4, 400 + x), M.oak, { pos: [x + 8.6, (CTOP - 2.2) / 2 + 1.6, BACK + RUN.d - 0.6] });
  mesh(new RoundedBoxGeometry(7, 0.7, 0.9, 2, 0.3), M.brass, { pos: [x + 8.6, CTOP - 4.6, BACK + RUN.d + 0.6] });
}
mesh(new RoundedBoxGeometry(RUN.x1 - RUN.x0, 1.6, RUN.d - 1, 2, 0.5), M.oakD, { pos: [(RUN.x0 + RUN.x1) / 2, 0.8, BACK + RUN.d / 2 - 1] });
mesh(lumpy(new RoundedBoxGeometry(RUN.x1 - RUN.x0 + 2, 1.4, RUN.d + 1.4, 3, 0.5), 0.02, 0.3, 410), M.quartz, { pos: [(RUN.x0 + RUN.x1) / 2, CTOP - 0.7, BACK + RUN.d / 2 + 0.4] });
mesh(new RoundedBoxGeometry(24, 0.3, 11, 2, 0.12), M.cooktop, { pos: [48, CTOP + 0.15, BACK + 8] });
// zellige: every tile a little different in tone and set a little crooked; grout behind
{ const TS = 2.6, rows = 11, cols = Math.round((RUN.x1 - RUN.x0) / TS), r = rng(17);
  mesh(new THREE.PlaneGeometry(RUN.x1 - RUN.x0, rows * TS), M.grout, { pos: [(RUN.x0 + RUN.x1) / 2, CTOP + rows * TS / 2, BACK + 0.05], cast: false });
  const geo = lumpy(new RoundedBoxGeometry(TS - 0.32, TS - 0.32, 0.55, 2, 0.22), 0.02, 2.5, 501);
  const mat = GLAZE('#ffffff'); const inst = new THREE.InstancedMesh(geo, mat, rows * cols); inst.receiveShadow = true; inst.castShadow = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let n = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = RUN.x0 + TS / 2 + i * TS, y = CTOP + TS / 2 + j * TS;
    if (x > -13.5 && x < 33.5 && y > 28.5) continue;               // the window
    e.set((r() - 0.5) * 0.08, (r() - 0.5) * 0.08, (r() - 0.5) * 0.03); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y, BACK + 0.35 + r() * 0.15), q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(n, m4);
    col.setHSL(0.11 + (r() - 0.5) * 0.06, 0.18 + r() * 0.22, 0.86 + r() * 0.09); inst.setColorAt(n, col); n++;
  }
  inst.count = n; scene.add(inst); }
// open shelves either side of the window with jars, cups, a plant
for (const [x0, x1] of [[-62, -20], [40, 68]]) mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 1.4, 7, 2, 0.4), 0.02, 0.5, 600 + x0), M.oak, { pos: [(x0 + x1) / 2, 60, BACK + 3.6] });
{ const r = rng(23);
  const label = (fi, ja) => { const c = canvas(256, 200), g = c.getContext('2d'); g.fillStyle = '#f7f2e6'; g.fillRect(0, 0, 256, 200); g.strokeStyle = '#2a2523'; g.lineWidth = 6; g.strokeRect(10, 10, 236, 180);
    g.fillStyle = '#2a2523'; g.textAlign = 'center'; g.font = '700 54px Inter'; g.fillText(fi, 128, 88); g.font = '64px IPAPGothic'; g.fillText(ja, 128, 166); const t = tex(c); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }); };
  for (const [x, fi, ja] of [[-58, 'SUOLA', '塩'], [-51, 'SOKERI', '砂糖'], [-44, 'KAHVI', '珈琲']]) {
    const h = 6 + r() * 3; mesh(lumpy(new THREE.CylinderGeometry(2.4, 2.4, h, 20), 0.02, 1, 610 + x), M.jar, { pos: [x, 61.4 + h / 2, BACK + 3.6] });
    mesh(new THREE.CylinderGeometry(2.46, 2.46, 2.9, 24, 1, true, -0.8, 1.6), label(fi, ja), { pos: [x, 61.4 + h * 0.45, BACK + 3.6], cast: false });
  }
  for (const x of [-34, -27]) mesh(lumpy(lathe([[0, 0], [2.1, 0], [2.4, 2.8], [2.5, 3.4], [0, 3.4]], 24), 0.02, 1, 620 + x), M.cup, { pos: [x, 60.7, BACK + 3.6] });
  for (const x of [46, 54]) mesh(lumpy(ball(3, 1, 0.5, 1, 20), 0.02, 1, 630 + x), M.cup, { pos: [x, 62, BACK + 3.6] });
}
function plant(x, y, z, s = 1, seed = 11) {
  mesh(lumpy(new THREE.CylinderGeometry(3.6 * s, 2.8 * s, 6.5 * s, 24), 0.03, 1, 51 + seed), M.terracotta, { pos: [x, y + 3.25 * s, z] });
  const r = rng(seed);
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + r(), up = 8 + r() * 9, out = 3 + r() * 6;
    mesh(lumpy(sausage([[x, y + 6 * s, z], [x + Math.cos(a) * out * 0.5 * s, y + (6 + up * 0.7) * s, z + Math.sin(a) * out * 0.5 * s], [x + Math.cos(a) * out * s, y + (6 + up) * s, z + Math.sin(a) * out * s]], [[1.2 * s, 0.32 * s], [2.0 * s, 0.38 * s], [0.4 * s, 0.2 * s]], { seg: 10, steps: 14, up: [Math.cos(a), 0, Math.sin(a)] }), 0.05, 1, 60 + i + seed), i % 2 ? M.leaf : M.leafB); }
}
plant(62, 60.7, BACK + 3.6, 0.6, 13);
plant(-6, 29.9, BACK + 2, 0.45, 17);   // on the sill

// the pan of French toast on the cooktop, and a kettle
mesh(lumpy(lathe([[0, 0], [7, 0], [7.8, 1.6], [7.9, 2.0], [0, 2.0]], 36), 0.01, 1, 700), M.pan, { pos: [44, CTOP + 0.4, BACK + 8] });
mesh(sausage([[51.5, CTOP + 1.9, BACK + 8], [61, CTOP + 2.6, BACK + 9.5]], [0.7, 0.6], { seg: 10, steps: 6 }), M.pan, { parent: scene });
for (const [dx, dz, ry] of [[-2.6, -1.4, 0.3], [2.4, 1.6, -0.4]]) { mesh(lumpy(new RoundedBoxGeometry(5.4, 0.9, 5.0, 2, 0.4), 0.06, 0.8, 710 + dx), M.toast, { pos: [44 + dx, CTOP + 1.3, BACK + 8 + dz], rot: [0, ry, 0] }); }
mesh(lumpy(lathe([[0, 0], [3.6, 0], [4, 3], [3.4, 6.6], [1.2, 7.6], [0, 7.6]], 32), 0.02, 1, 720), M.enamel, { pos: [-40, CTOP, BACK + 7] });
mesh(sausage([[-37.4, CTOP + 6.2, BACK + 7], [-35, CTOP + 7.2, BACK + 7], [-33.6, CTOP + 3.8, BACK + 7]], [0.45, 0.45, 0.45], { seg: 8, steps: 12 }), M.bezel, { parent: scene });

// the island: sage panels, a quartz top, and a hole drilled through it for the display's cord
const ISL = { x: 0, z: -48, w: 76, d: 26 };
mesh(lumpy(new RoundedBoxGeometry(ISL.w - 3, CTOP - 1.4, ISL.d - 3, 3, 0.8), 0.03, 0.3, 81), M.sage, { pos: [ISL.x, (CTOP - 1.4) / 2, ISL.z] });
for (let i = -4; i <= 4; i++) mesh(new RoundedBoxGeometry(0.45, CTOP - 5, 0.5, 1, 0.15), M.sageD, { pos: [i * 8.2, (CTOP - 1.4) / 2, ISL.z + ISL.d / 2 - 1.4] });
mesh(lumpy(new RoundedBoxGeometry(ISL.w, 1.6, ISL.d, 4, 0.7), 0.02, 0.3, 82), M.quartz, { pos: [ISL.x, CTOP - 0.8, ISL.z] });
const HOLE = [19.5, CTOP + 0.02, -46.5];
mesh(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), M.hole, { pos: HOLE, cast: false });
// on the island: lemons in a bowl, bread on a board, two cups
{ const r = rng(3);
  mesh(lumpy(lathe([[0, 0], [3.2, 0], [5.6, 2.2], [6, 3.0], [0, 3.0]], 36), 0.02, 1, 90), M.cup, { pos: [-24, CTOP, -46] });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(lumpy(ball(1.7, 1, 0.86, 1.16, 22), 0.06, 0.9, 91 + i), M.lemon, { pos: [-24 + Math.cos(a) * 2.6, CTOP + 3.4 + r() * 0.6, -46 + Math.sin(a) * 2.6], rot: [r(), r(), r()] }); }
  mesh(lumpy(new RoundedBoxGeometry(14, 0.9, 9, 2, 0.35), 0.02, 0.5, 98), M.board, { pos: [-6, CTOP + 0.45, -52], rot: [0, 0.18, 0] });
  mesh(lumpy(ball(5.4, 1, 0.6, 0.55, 28), 0.06, 0.8, 99), M.bread, { pos: [-7, CTOP + 2.2, -52], rot: [0, 0.18, 0] });
  for (const [x, z] of [[4, -42], [-14, -40.5]]) mesh(lumpy(lathe([[0, 0], [1.6, 0], [1.9, 2.4], [2.0, 3.0], [0, 3.0]], 24), 0.02, 1, 100 + x), M.cup, { pos: [x, CTOP, z] });
}
// two pendants over the island: brass domes on long cords, a warm bulb under each
const BULBS = [], SHADE = C('#c9a35a', { rough: 0.3, metal: 0.75, thumb: 0.01, specks: 0, clearcoat: 0.3, side: THREE.DoubleSide });
for (const x of [-17, 17]) {
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 90, 6), M.bezel, { pos: [x, 123, ISL.z], cast: false });
  mesh(lumpy(lathe([[7.5, 0], [7.2, 1.6], [5.5, 4.6], [2.2, 6.8], [0.8, 7.4], [0, 7.4]], 40), 0.01, 1, 800 + x), SHADE, { pos: [x, 70.5, ISL.z] });
  const b = mesh(ball(1.7, 1, 1, 1, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3) }), { pos: [x, 70.2, ISL.z], cast: false });
  const l = new THREE.PointLight('#ffd6a0', 260, 80, 2); l.position.set(x, 68.5, ISL.z); scene.add(l); BULBS.push(l, b);
}

// ------------------------------------------------------------------ the device: a 7-inch screen on a domed speaker, its cord down the hole
const DEV = new THREE.Group(); scene.add(DEV); DEV.position.set(14, CTOP, -45); DEV.rotation.y = -0.18; DEV.scale.setScalar(0.34);
mesh0(lumpy(ball(9.5, 1, 0.62, 1, 48), 0.02, 1, 101), M.meshPink, { parent: DEV });
mesh0(lumpy(new THREE.TorusGeometry(9.2, 0.7, 12, 48).rotateX(Math.PI / 2), 0.02, 1, 102), M.pink, { pos: [0, 0.6, 0], parent: DEV });
mesh0(lumpy(new THREE.CylinderGeometry(1.6, 2.2, 5, 20), 0.02, 1, 103), M.pink, { pos: [0, 7.5, -1], parent: DEV });
const SCR = new THREE.Group(); SCR.position.set(0, 16.5, -0.4); SCR.rotation.x = -0.14; DEV.add(SCR);
mesh0(lumpy(new RoundedBoxGeometry(23.5, 16, 1.6, 4, 0.7), 0.01, 1, 104), M.pink, { parent: SCR });
mesh0(new RoundedBoxGeometry(22.2, 14.7, 0.3, 3, 0.15), M.bezel, { pos: [0, 0, 0.75], parent: SCR, cast: false });
const uiCan = canvas(880, 580), ui = uiCan.getContext('2d'), uiTex = tex(uiCan);
mesh0(new THREE.PlaneGeometry(20.6, 13.6), new THREE.MeshBasicMaterial({ map: uiTex, toneMapped: false }), { pos: [0, 0, 1.06], parent: SCR, cast: false });
mesh0(ball(0.32, 1, 1, 0.4, 12), M.bezel, { pos: [0, 7.6, 0.85], parent: SCR, cast: false });
const screenLight = new THREE.PointLight('#ffc6d6', 40, 40, 2); scene.add(screenLight);
scene.updateMatrixWorld(true);
{ const a = DEV.localToWorld(new THREE.Vector3(0, 0.4, -9.2)).toArray();
  const pts = [a, add3(a, [0.6, -0.15, -0.6]), add3(HOLE, [-0.4, 0.15, 0.4]), add3(HOLE, [0, -0.6, 0]), add3(HOLE, [0, -3, 0])].map((p) => new THREE.Vector3(...p));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.22, 10), M.cord); }

/** the screen: 'flow' = a soft colour field leaning toward whoever is near; 'door' = the door camera's feed */
function drawUI(mode) {
  const g = ui, w = 880, h = 580; g.save();
  if (mode === 'flow') {
    g.fillStyle = '#f4c7c4'; g.fillRect(0, 0, w, h);
    for (const [x, y, r, c] of [[180, 160, 360, '255,170,150'], [640, 220, 380, '250,150,200'], [460, 520, 420, '170,160,250'], [780, 520, 300, '255,215,170']]) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},.95)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '300 120px Inter'; g.fillText('7:42', 52, 150);
    g.font = '500 40px Inter'; g.fillText('Good morning.', 58, 214);
  } else {
    // the door camera: a wide, slightly bent view of the front path, two figures walking away, a LIVE pill
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#cfe0ea'); sky.addColorStop(0.45, '#e9eee6'); sky.addColorStop(0.46, '#7f9a6a'); sky.addColorStop(1, '#6b8758'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c9c0b0'; g.beginPath(); g.moveTo(330, h); g.lineTo(410, 262); g.lineTo(470, 262); g.lineTo(600, h); g.fill();
    g.fillStyle = '#4f6b43'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(30 + i * 64, 250 + (i % 3) * 8, 46, 0, TAU); g.fill(); }
    const fig = (x, y, s, mask, coat) => { g.fillStyle = coat; g.beginPath(); g.roundRect(x - 20 * s, y, 40 * s, 70 * s, 14 * s); g.fill(); g.fillStyle = '#3a3836'; g.fillRect(x - 14 * s, y + 66 * s, 10 * s, 34 * s); g.fillRect(x + 4 * s, y + 66 * s, 10 * s, 34 * s);
      g.fillStyle = '#3a2e28'; g.beginPath(); g.arc(x, y - 18 * s, 20 * s, 0, TAU); g.fill(); g.fillStyle = mask; g.beginPath(); g.arc(x + 8 * s, y - 18 * s, 17 * s, -1.1, 1.1); g.fill(); };
    fig(420, 300, 1.0, '#f0027f', '#f2d36b');   // the daughter: the girl who left in shot 1 fig(478, 296, 1.08, '#9a9a9a', '#3f4a5c');
    const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(20,20,22,.6)'; g.beginPath(); g.roundRect(30, 28, 300, 64, 32); g.fill();
    g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(68, 60, 11, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.font = '600 34px Inter'; g.fillText('Front Door', 92, 72);
  }
  g.restore(); uiTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the family: masked Tokos, one carrier colour each
function family(mask, hoodie, jeans, hair) {
  return {
    hoodie: C(hoodie, { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1, mottle: 0.05 }), hoodie2: C(hoodie, { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1 }),
    cuff: C(hoodie), jeans: C(jeans, { thumbCell: 1.8, tool: 0.7 }), shoes: C('#f4f1ea'), sole: C('#cfc8bb'),
    glove: C(mask, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }), hair: C(hair, { tool: 1.2, thumbCell: 0.9, thumb: 0.04 }),
    maskDisc: C(mask, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
    strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
  };
}
const CAST = {
  dad: { mats: family('#2fa84f', '#8c97a3', '#3b4f78', '#3a2e28'), s: 1.0 },
  mum: { mats: family('#3d6fd8', '#e6d8c2', '#5a4a3e', '#5a3a2a'), s: 0.96 },
  son: { mats: family('#ff7414', '#c6534a', '#2f3b55', '#2a211c'), s: 0.84 },
  kid: { mats: family('#f0027f', '#f2d36b', '#3d6b8a', '#6a4a30'), s: 0.68 },
};
for (const k in CAST) { const c = CAST[k]; c.toko = new Toko(c.mats, { lump: 0, lumpF: 0.26 }); c.toko.hood.visible = true; c.wrap = new THREE.Group(); c.wrap.add(c.toko.group); scene.add(c.wrap); c.wrap.scale.setScalar(c.s); }
/** pose a cast member: feet at (x, z), facing yaw; P = pose overrides in his own frame (hip at [0, 21.5, 0]) */
function place(k, x, z, yaw, P = {}) {
  const c = CAST[k]; c.wrap.visible = true; c.wrap.position.set(x, 0, z); c.wrap.rotation.set(0, yaw, 0);
  const hip = [0, 21.5, 0], at = (v) => add3(hip, v);
  c.toko.pose({ hip, yaw: 0, lean: 0.08, side: 0, knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6], hp: 0.05, hr: 0, hy: 0,
    elR: at([-6.6, 8.6, 1.2]), hdR: at([-7.2, 2.4, 2.6]), elL: at([6.6, 8.6, 1.2]), hdL: at([7.2, 2.4, 2.6]), palm: [[0, -1, -0.3], [0, -1, -0.3]], ...P(at) });
  c.wrap.updateMatrixWorld(true);
}
const hideAll = () => { for (const k in CAST) CAST[k].wrap.visible = false; };

// ------------------------------------------------------------------ light: low morning sun through the window, a cool room fill, the pendants
const SUN_DIR = new THREE.Vector3(0.05, -0.33, 0.94).normalize();
const sun = new THREE.DirectionalLight('#ffd9a6', 8.0);
{ const target = new THREE.Vector3(10, 20, -50), dir = SUN_DIR.clone();
  sun.position.copy(target).addScaledVector(dir, -420); sun.target.position.copy(target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 50, far: 900 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 1.5; scene.add(sun, sun.target); }
const hemi = new THREE.HemisphereLight('#dde6f4', '#c9ad8c', 0.12); scene.add(hemi);
const fill = new THREE.DirectionalLight('#e6ecff', 0.24); { const f = fill; f.position.set(-60, 90, 160); f.castShadow = true; f.shadow.mapSize.set(2048, 2048);
  Object.assign(f.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 20, far: 600 }); f.shadow.radius = 10; f.shadow.bias = -0.0004; scene.add(f); }
// the sunbeam made visible: a swept window of faint light with dust in it
{ const dir = SUN_DIR.clone(), L = 120;
  const g = new THREE.BufferGeometry(), c0 = [[-11, 31], [31, 31], [31, 67], [-11, 67]].map(([x, y]) => new THREE.Vector3(x, y, BACK));
  const c1 = c0.map((p) => p.clone().addScaledVector(dir, L));
  const pos = [], al = [];
  for (let i = 0; i < 4; i++) { const a = c0[i], b = c0[(i + 1) % 4], a1 = c1[i], b1 = c1[(i + 1) % 4]; for (const [p, k] of [[a, 1], [b, 1], [b1, 0], [a, 1], [b1, 0], [a1, 0]]) { pos.push(p.x, p.y, p.z); al.push(k); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('al', new THREE.Float32BufferAttribute(al, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float al; varying float vA; void main(){ vA = al; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0,0.86,0.62) * 0.05 * pow(vA, 1.4), 1.0); }' });
  const beam = new THREE.Mesh(g, m); beam.renderOrder = 5; scene.add(beam);
  const r = rng(99), dust = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 1.0), transparent: true, opacity: 0.7 }), dg = new THREE.SphereGeometry(0.05, 6, 4);
  const ex = c0[1].clone().sub(c0[0]), ey = c0[3].clone().sub(c0[0]);
  for (let i = 0; i < 70; i++) { const p = c0[0].clone().addScaledVector(ex, 0.08 + r() * 0.84).addScaledVector(ey, 0.08 + r() * 0.84).addScaledVector(dir, (0.15 + r() * 0.6) * L); const d = new THREE.Mesh(dg, dust); d.position.copy(p); scene.add(d); }
}

// ------------------------------------------------------------------ post for the device's own camera: a wide feed, barrelled, and its UI
function barrel(c, k = 0.09) {
  const src = c.getImageData(0, 0, W, H), dst = c.createImageData(W, H), s = src.data, d = dst.data, cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x - cx) / R, ny = (y - cy) / R, r2 = nx * nx + ny * ny, f = (1 + k * r2) / (1 + k);
    const sx = cx + nx * f * R, sy = cy + ny * f * R, o = (y * W + x) * 4;
    if (sx < 0 || sy < 0 || sx >= W - 1 || sy >= H - 1) { d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255; continue; }
    const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0, i0 = (y0 * W + x0) * 4, i1 = i0 + 4, i2 = i0 + W * 4, i3 = i2 + 4;
    for (let ch = 0; ch < 3; ch++) d[o + ch] = (s[i0 + ch] * (1 - fx) + s[i1 + ch] * fx) * (1 - fy) + (s[i2 + ch] * (1 - fx) + s[i3 + ch] * fx) * fy;
    d[o + 3] = 255;
  }
  c.putImageData(dst, 0, 0);
}
function faceUI(c, at, rad, line1, line2) {
  const [x, y] = at, r = rad, k = r * 0.42;
  c.save(); c.strokeStyle = '#fff'; c.lineWidth = 10; c.lineCap = 'round'; c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 14;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(x + sx * r, y + sy * (r - k)); c.arcTo(x + sx * r, y + sy * r, x + sx * (r - k), y + sy * r, k * 0.5); c.lineTo(x + sx * (r - k), y + sy * r); c.stroke(); }
  c.restore();
  // the frosted pill: the frame behind it blurred and brightened, a hairline of light on its rim
  const pw = 640, ph = 150, px = W / 2 - pw / 2, py = Math.min(H - 420, y + r + 90);
  const snap = canvas(W, H); snap.getContext('2d').drawImage(c.canvas, 0, 0);
  c.save(); c.beginPath(); c.roundRect(px, py, pw, ph, ph / 2); c.clip();
  c.filter = 'blur(22px) saturate(1.3)'; c.drawImage(snap, 0, 0); c.filter = 'none';
  c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(px, py, pw, ph); c.restore();
  c.save(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.beginPath(); c.roundRect(px + 1, py + 1, pw - 2, ph - 2, ph / 2); c.stroke();
  c.fillStyle = 'rgba(30,26,30,.92)'; c.textAlign = 'center'; c.font = '650 52px Inter'; c.fillText(line1, W / 2, py + 68);
  c.font = '500 34px Inter'; c.fillStyle = 'rgba(30,26,30,.7)'; c.fillText(line2, W / 2, py + 116); c.restore();
}


// ================================================================== THE FILM (v1, 18 Oct): one question, five shots
// "What does it keep when you leave?" Every word on screen comes from copy.json through pipeline/text/captions.js; the
// shot lengths come from the copy (holds land on the 112 BPM grid), so fi and ja are longer where their lines need it.
//   1 the hoop, then the morning kitchen; the daughter heads out on "leave"
//   2 over Mum's shoulder: her messages and calendar fill the screen; she leaves, and they fold away on "not stored"
//   3 the screen's own view: her face box; a vault door swings over it, and a card: KEPT FOR —
//   4 the ad's ending: the family round the screen, watching the door camera; they lean in on "leave"
//   5 the door camera itself: the boyfriend turns to the lens, and on "guests" the box snaps on: GUEST 7: ?
await CAP.loadFonts(FONT_DIR);
{ const f = new FontFace('Kalam', `url(${FONT_DIR}Kalam-700.woff)`); document.fonts.add(await f.load()); }
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 112, FPS = 30, SAFE_B = 1630;
const BEATS = [['s1', 0], ['s2', 12 * B], ['s3', 24 * B], ['s4', 36 * B], ['s5', 48 * B], ['end', 60 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const lineEnd = (id, n) => { const ws = capOf(id).words.filter((w) => w.line === n - 1); return ws[ws.length - 1].t; };
const SHOTS = [T.s1, T.s2, T.s3, T.s4, T.s5, T.end];
const EV = { hoopOut: 1.0, leave: popOf('question'), tilesIn: T.s2 + 0.35, fold: popOf('data'), boxOn: T.s3 + 0.45, vault: lineEnd('face', 1), kept: popOf('face'),
  lean: popOf('ad'), turnBack: T.s5 + 0.9, guest: popOf('last') };
EV.turn = Math.max(EV.tilesIn + 1.3, EV.fold - 0.9);
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...EV, ...CAP.events(P), quiet: [] };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const twos = (t) => Math.floor(t * 12) / 12;                                    // the puppets act on twos; camera and light move every frame

// ------------------------------------------------------------------ the screen's own pages: hers, then folding away
function drawMine(k) {                                                            // k: 0 all there → 1 folded away
  drawUI('flow'); const g = ui, w = 880, h = 580; if (k >= 1) { uiTex.needsUpdate = true; return; }
  g.save(); g.fillStyle = `rgba(250,244,240,${0.55 * (1 - k)})`; g.fillRect(0, 0, w, h);
  const tiles = [[40, 40, 470, 230, 'Messages', ['Dinner at 7?', 'Bring the charger x']], [530, 40, 310, 230, 'Today', ['8:30  Dentist', '17:00  Pickup']], [40, 290, 800, 250, 'Photos', null]];
  tiles.forEach(([x, y, tw, th, title, lines], i) => {
    const kk = clamp(k * 3 - i * 0.6), s = 1 - ease.io(kk); if (s <= 0.01) return;
    g.save(); g.translate(x + tw / 2, y + th / 2); g.scale(1, s); g.globalAlpha = s;
    g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.roundRect(-tw / 2, -th / 2, tw, th, 28); g.fill();
    g.fillStyle = '#1d1b1f'; g.font = '700 38px Inter'; g.fillText(title, -tw / 2 + 30, -th / 2 + 58);
    if (lines) { g.font = '500 32px Inter'; g.fillStyle = '#4a454c'; lines.forEach((l, j) => g.fillText(l, -tw / 2 + 30, -th / 2 + 118 + j * 52)); }
    else for (let j = 0; j < 5; j++) { g.fillStyle = ['#f2b8a8', '#a8c8e8', '#f4d58a', '#b8d8b0', '#d8b8e8'][j]; g.beginPath(); g.roundRect(-tw / 2 + 30 + j * 152, -th / 2 + 80, 136, 140, 16); g.fill(); }
    g.restore();
  });
  g.restore(); uiTex.needsUpdate = true;
}

// ------------------------------------------------------------------ 2D pieces: the hoop, the vault, the card, the door camera
function hoop(g, k) {                                                             // k: 0 the hoop fills the frame → 1 zoomed through it
  if (k >= 1) return; const s = 1 + 6 * k * k, a = 1 - ease.io(k);
  g.save(); g.globalAlpha = a;
  g.fillStyle = '#efe6d4'; g.fillRect(0, 0, W, H);
  g.translate(540, 940); g.scale(s, s);
  g.strokeStyle = 'rgba(160,140,110,.12)'; g.lineWidth = 1; for (let i = -1000; i < 1000; i += 7) { g.beginPath(); g.moveTo(i, -1000); g.lineTo(i, 1000); g.stroke(); g.beginPath(); g.moveTo(-1000, i); g.lineTo(1000, i); g.stroke(); }
  g.lineWidth = 46; g.strokeStyle = '#c9a476'; g.beginPath(); g.arc(0, 0, 430, 0, TAU); g.stroke();             // the hoop
  g.lineWidth = 8; g.strokeStyle = '#a8845a'; g.beginPath(); g.arc(0, 0, 452, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 408, 0, TAU); g.stroke();
  g.fillStyle = '#b8945f'; g.fillRect(-26, -500, 52, 50); g.fillStyle = '#d8c08a'; g.fillRect(-12, -520, 24, 30);
  // a rainbow PEAR in satin stitch (never the real logo): six bands, each stitched in short slanted threads
  const pear = new Path2D(); pear.moveTo(0, -200); pear.bezierCurveTo(60, -200, 70, -90, 110, -20); pear.bezierCurveTo(170, 80, 120, 150, 0, 150); pear.bezierCurveTo(-120, 150, -170, 80, -110, -20); pear.bezierCurveTo(-70, -90, -60, -200, 0, -200);
  const BANDS = ['#61bb46', '#fdb827', '#f5821f', '#e03a3e', '#963d97', '#009ddc'];
  g.save(); g.translate(0, -60); g.clip(pear);
  BANDS.forEach((col, i) => { const y0 = -200 + i * 59; g.strokeStyle = col; g.lineWidth = 3.2; for (let x = -180; x < 180; x += 4.5) { g.beginPath(); g.moveTo(x, y0 + 2); g.lineTo(x + 10, y0 + 57); g.stroke(); } });
  g.restore();
  g.save(); g.translate(0, -60); g.strokeStyle = '#3a2e28'; g.lineWidth = 3; g.setLineDash([9, 5]); g.stroke(pear); g.setLineDash([]);
  g.strokeStyle = '#5a7a3a'; g.lineWidth = 7; g.beginPath(); g.moveTo(6, -200); g.quadraticCurveTo(14, -240, 40, -250); g.stroke(); g.restore();
  g.font = '700 96px Kalam'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#3a2e28'; g.setLineDash([12, 6]); g.strokeText(P.props?.hoop || 'Welcome home.', 0, 250); g.setLineDash([]);
  g.restore();
}
function vault(g, x, y, r, k) {                                                   // a round steel door swinging shut over the face box
  if (k <= 0) return; const R = r * 1.3, sx = Math.max(0.03, ease.back(k));
  g.save(); g.translate(x - R, y); g.scale(sx, 1); g.translate(R, 0);
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R); gr.addColorStop(0, '#e9edf0'); gr.addColorStop(0.7, '#a9b2b9'); gr.addColorStop(1, '#7d878f');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = '#6a737a'; g.lineWidth = R * 0.06; g.beginPath(); g.arc(0, 0, R * 0.86, 0, TAU); g.stroke();
  g.fillStyle = '#5d666d'; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.beginPath(); g.arc(Math.cos(a) * R * 0.93, Math.sin(a) * R * 0.93, R * 0.035, 0, TAU); g.fill(); }
  g.strokeStyle = '#4b535a'; g.lineWidth = R * 0.05; g.lineCap = 'round'; const spin = (1 - k) * 2;
  for (let i = 0; i < 3; i++) { const a = spin + (i / 3) * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.42, Math.sin(a) * R * 0.42); g.stroke(); }
  g.beginPath(); g.arc(0, 0, R * 0.42, 0, TAU); g.stroke(); g.fillStyle = '#4b535a'; g.beginPath(); g.arc(0, 0, R * 0.09, 0, TAU); g.fill();
  g.restore();
}
function keptCard(g, x, y, k) {
  if (k <= 0) return; const s = ease.back(k / 0.35);
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.03);
  g.shadowColor = 'rgba(0,0,0,.3)'; g.shadowBlur = 24; g.shadowOffsetY = 10; g.fillStyle = '#fbfaf7'; g.beginPath(); g.roundRect(-250, -70, 500, 140, 22); g.fill(); g.shadowColor = 'transparent';
  g.fillStyle = '#1d1b1f'; g.font = '700 58px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(P.props?.kept || 'KEPT FOR: —', 0, 4);
  g.restore();
}
/** the door camera, full frame: the front path, the daughter far off, the boyfriend nearer; he turns to the lens */
function doorFeed(g, lt, turn, box) {
  const sky = g.createLinearGradient(0, 0, 0, 760); sky.addColorStop(0, '#bcd3e0'); sky.addColorStop(1, '#e8eee4'); g.fillStyle = sky; g.fillRect(0, 0, W, 760);
  g.fillStyle = '#6f8c5e'; g.fillRect(0, 760, W, H - 760);
  g.fillStyle = '#4f6b43'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(-40 + i * 105, 730 + (i % 3) * 14, 90, 0, TAU); g.fill(); }
  g.fillStyle = '#d2c9b8'; g.beginPath(); g.moveTo(250, H); g.lineTo(505, 770); g.lineTo(575, 770); g.lineTo(830, H); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 3; for (let i = 0; i < 9; i++) { const y = 800 + i * i * 14; const hw = lerp(35, 290, (y - 770) / (H - 770)); g.beginPath(); g.moveTo(540 - hw, y); g.lineTo(540 + hw, y); g.stroke(); }
  const fig = (x, y, s, mask, coat, front) => {
    g.fillStyle = coat; g.beginPath(); g.roundRect(x - 40 * s, y, 80 * s, 140 * s, 28 * s); g.fill();
    g.fillStyle = '#3a3836'; g.fillRect(x - 28 * s, y + 132 * s, 20 * s, 68 * s); g.fillRect(x + 8 * s, y + 132 * s, 20 * s, 68 * s);
    g.fillStyle = '#3a2e28'; g.beginPath(); g.arc(x, y - 36 * s, 40 * s, 0, TAU); g.fill();
    if (front > 0) {                                                             // the mask turned to the lens: a full disc with the face cut in it
      g.save(); g.globalAlpha = front; g.fillStyle = mask; g.beginPath(); g.arc(x, y - 36 * s, 34 * s, 0, TAU); g.fill();
      g.strokeStyle = '#fbf8f2'; g.lineWidth = 5 * s; g.lineCap = 'round';
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(x + sd * 12 * s, y - 40 * s, 7 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      g.beginPath(); g.arc(x, y - 30 * s, 13 * s, 0.2, Math.PI - 0.2); g.stroke(); g.restore();
    }
    if (front < 1) { g.save(); g.globalAlpha = 1 - front; g.fillStyle = mask; g.beginPath(); g.arc(x + 16 * s, y - 36 * s, 30 * s, -1.1, 1.1); g.fill(); g.restore(); }
  };
  const walk = Math.sin(lt * 7) * 4;
  fig(560 + Math.sin(lt * 0.5) * 6, 840 - lt * 6 + walk * 0.3, 0.55, '#f0027f', '#f2d36b', 0);   // the daughter, walking away
  fig(500, 1120 + walk * (1 - turn), 2.6, '#9a9a9a', '#3f4a5c', turn);                        // the boyfriend, near the lens, turning back
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
  barrel(g, 0.12);
  g.fillStyle = 'rgba(20,20,22,.6)'; g.beginPath(); g.roundRect(70, 1440, 420, 84, 42); g.fill();
  g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(118, 1482, 14, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = '600 44px Inter'; g.textBaseline = 'alphabetic'; g.fillText('Front Door', 150, 1498);
  if (box > 0) { const blink = lt > 0 && Math.floor(lt * 2.4) % 2 ? 0.55 : 1; g.save(); g.globalAlpha = Math.min(1, box * 3); faceUI(g, [500, 1120 - 36 * 2.6], 125 * Math.min(1, 0.6 + box), P.props?.guest || 'GUEST 7: ?', 'Not recognised'); g.restore(); }
}

// ------------------------------------------------------------------ the shots
const DEVF = () => DEV.localToWorld(new THREE.Vector3(0, 16.5, 0));
const kidWalkOut = (t) => { const k = clamp((t - EV.leave + 1.3) / 1.7); return { x: lerp(40, -46, k), k }; };   // behind Mum, right to left, gone on "leave"
const SHOT = [
  { // 1 · the morning, the screen, the daughter heading out
    ui: () => drawUI('flow'), cam: (lt, d) => ({ pos: [lerp(31, 27, ease.io(lt / d)), 29.5, lerp(-17, -21, ease.io(lt / d))], at: [-2, 31, -78], fov: lerp(48, 44, ease.io(lt / d)), focus: DEVF, ap: 10 }),
    cast(t) {
      place('dad', 44, BACK + 31, Math.PI + 0.35, (at) => ({ lean: 0.14, hy: -1.1, hp: 0.05, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6 + Math.sin(t * 6) * 0.8, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      place('mum', -3, ISL.z - 19, 0.3, (at) => ({ lean: 0.2, hp: -0.02, hy: 0.3, elR: at([-7.4, 7.4, 4.2]), hdR: at([-6.6, 1.6, 11.4]), elL: at([7.4, 7.4, 4.2]), hdL: at([6.6, 1.6, 11.4]) }));
      const w = kidWalkOut(t), step = Math.sin(t * 14);
      if (w.k > 0 && w.k < 1) place('kid', w.x, BACK + 36, -Math.PI / 2, (at) => ({ lean: 0.16, hp: -0.05, hy: 0.25, elR: at([-6.6, 8.6, 1.2 + step * 3]), hdR: at([-7.2, 2.4, 2.6 + step * 6]), elL: at([6.6, 8.6, 1.2 - step * 3]), hdL: at([7.2, 2.4, 2.6 - step * 6]) }));
      CAST.son.wrap.visible = false;
    } },
  { // 2 · over her shoulder: her things on the screen; she leaves, they fold away
    ui: (t) => drawMine(t < EV.tilesIn ? 1 : clamp((t - (EV.fold - 0.55)) / 0.55)), devYaw: -0.42,
    cam: (lt, d) => ({ pos: [-14, 44, lerp(18, 14, ease.io(lt / d))], at: [13, 28.5, -45], fov: lerp(26, 23, ease.io(lt / d)), focus: DEVF, ap: 8 }),
    cast(t) {
      const k = clamp((t - EV.turn) / 0.7), x = lerp(-2, -30, ease.io(k)), yaw = lerp(Math.PI - 0.35, Math.PI + 1.3, ease.out(k * 2)), step = k > 0 && k < 1 ? Math.sin(t * 14) : 0;
      place('mum', x, -30 + k * 6, yaw, (at) => ({ lean: 0.16, hp: 0.06, hy: -0.15 * (1 - k), elR: at([-7, 7.6, 3 + step * 3]), hdR: at([-6.4, 2.4, 6 + step * 5]), elL: at([7, 7.6, 3 - step * 3]), hdL: at([6.4, 2.4, 6 - step * 5]) }));
      place('dad', 44, BACK + 31, Math.PI + 0.35, (at) => ({ lean: 0.14, hy: -1.1, hp: 0.05, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      CAST.son.wrap.visible = false; CAST.kid.wrap.visible = false;
    } },
  { // 3 · the screen's own view: her face, the box, the vault, the card
    ui: () => drawUI('flow'), hideDev: true, feed: true,
    cam: (lt, d) => ({ pos: [14, 30, -44], at: [lerp(10, 9.4, ease.io(lt / d)), 37, -80], fov: lerp(74, 70, ease.io(lt / d)), focus: () => CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()), ap: 3 }),
    cast(t) {
      place('mum', 9, ISL.z - 21, -0.06, (at) => ({ lean: 0.24, hp: 0.0, hy: 0.06 + Math.sin(t * 1.3) * 0.05, elR: at([-7.2, 7.2, 4.4]), hdR: at([-6.4, 2.0, 11.6]), elL: at([7.2, 7.2, 4.4]), hdL: at([6.4, 2.0, 11.6]) }));
      place('dad', 46, BACK + 30, Math.PI + 0.25, (at) => ({ lean: 0.14, hy: -0.4, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      CAST.son.wrap.visible = false; CAST.kid.wrap.visible = false;
    } },
  { // 4 · the ad's ending: the family round the screen, lit by it, watching the door camera
    ui: () => drawUI('door'), devYaw: Math.PI + 0.2, screenGlow: (t) => 150 + Math.sin(t * 9) * 12,
    cam: (lt, d) => ({ pos: [lerp(36, 32, ease.io(lt / d)), 35, lerp(-12, -18, ease.io(lt / d))], at: [9, 36, -70], fov: lerp(46, 40, ease.io(lt / d)), focus: () => CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()), ap: 7 }),
    cast(t) {
      const L = 0.42 + 0.14 * ease.out((t - EV.lean) / 0.35), chew = Math.max(0, Math.sin(t * 5));
      const lean = (hy, P = {}) => (at) => ({ lean: L, hp: 0.16, hy, elR: at([-7, 6.4, 5.4]), hdR: at([-6, 0.6, 12.8]), elL: at([7, 6.4, 5.4]), hdL: at([6.2, 0.6, 12.8]), ...P });
      place('mum', 4, ISL.z - 20, 0.0, lean(0.42));
      place('dad', 25, ISL.z - 20, 0.0, (at) => ({ lean: L, hp: 0.16, hy: -0.42, elR: at([-6.6, 6.0, 6]), hdR: at([-2.6, lerp(6, 11.4, chew), 9.6]), elL: at([7, 6.4, 5.4]), hdL: at([6.2, 0.6, 12.8]) }));   // French toast, like popcorn
      place('son', 15, ISL.z - 28, 0.0, (at) => ({ lean: L - 0.12, hp: 0.3, hy: -0.05, elR: at([-6.6, 8.6, 1.2]), hdR: at([-7.2, 2.4, 2.6]), elL: at([6.6, 8.6, 1.2]), hdL: at([7.2, 2.4, 2.6]) }));
      CAST.kid.wrap.visible = false;                                             // she is the one on the screen
    } },
  { feed2d: true },                                                               // 5 · the door camera, full frame (2D)
];
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };

/** the tag that says what this is: a real launch film, remade */
function tag(g, text, k) {
  if (k <= 0) return; g.save(); g.globalAlpha = k; g.font = '700 32px Inter'; const w = g.measureText(text).width + 60, x = 110, y = SAFE_B - 66 - 10;
  g.fillStyle = 'rgba(251,250,247,.94)'; g.beginPath(); g.roundRect(x, y, w, 66, 33); g.fill(); g.fillStyle = '#1d1b1f'; g.textBaseline = 'middle'; g.fillText(text, x + 30, y + 35); g.restore();
}

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  let i = 0; while (i < 4 && t >= SHOTS[i + 1]) i++;
  const S = SHOT[i], lt = t - SHOTS[i], d = SHOTS[i + 1] - SHOTS[i], tq = twos(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0);
  if (S.feed2d) doorFeed(g2d, lt, ease.io((t - EV.turnBack) / 0.5), clamp((t - EV.guest) / 0.25));
  else {
    setBoil(Math.floor(t * 12)); S.ui(tq); hideAll(); S.cast(tq); DEV.visible = !S.hideDev; DEV.rotation.y = S.devYaw ?? -0.18;
    scene.updateMatrixWorld(true);
    screenLight.position.copy(DEV.localToWorld(new THREE.Vector3(0, 16.5, 8))); screenLight.intensity = S.screenGlow ? S.screenGlow(t) : 40;
    screenLight.color.set(S.devYaw > 3 ? '#cfe2ff' : '#ffc6d6');
    const L = S.cam(lt, d); camera.fov = L.fov; camera.position.set(...L.pos); camera.lookAt(...L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
    post.render(scene, camera, { focus: camera.position.distanceTo(L.focus()), aperture: L.ap, maxBlur: 30, radScale: 0.9,
      threshold: 1.25, knee: 0.5, bloomA: 0.22, bloomB: 0.16, exposure: 1.02, vignette: 0.18, grain: 0.006, seed: Math.floor(t * 12),
      sat: 1.2, contrast: 1.16, lift: [0.0, 0.0, 0.004], gain: [1.02, 1.0, 0.99], toe: 0.02 });
    g2d.drawImage(renderer.domElement, 0, 0);
    if (S.feed) {
      barrel(g2d, 0.11);
      const m = CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()); let [x, y] = project(m);
      const R = Math.hypot(W / 2, H / 2), nx = (x - W / 2) / R, ny = (y - H / 2) / R, r2 = nx * nx + ny * ny, f = (1 + 0.11 * r2) / (1 + 0.11);
      x = W / 2 + (x - W / 2) / f; y = H / 2 + (y - H / 2) / f;
      const r = Math.abs(project(m.clone().add(new THREE.Vector3(4.6, 0, 0)))[0] - project(m)[0]) * 1.15;
      if (t > EV.boxOn) faceUI(g2d, [x, y], r * lerp(1.3, 1, ease.out((t - EV.boxOn) / 0.2)), 'Good morning.', 'Recognised · 1 of 6');
      vault(g2d, x, y, r, clamp((t - EV.vault + 0.1) / 0.45));
      keptCard(g2d, W / 2, Math.min(SAFE_B - 120, y + r + 330), clamp(t - EV.kept));
    }
    if (i === 0) { hoop(g2d, clamp((t - EV.hoopOut) / 0.7)); tag(g2d, P.ui.tag, clamp((t - 2.2) / 0.3) * clamp((SHOTS[1] - 0.3 - t) / 0.3)); }
  }
  CAP.bug(g2d, 'RADIO FREE HELSINKI', 'house');
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));   // ?busy=0: stills only, skip the scrim measurement
const keep = () => [];
const tagW = (() => { g2d.save(); g2d.font = '700 32px Inter'; const w = Math.round(g2d.measureText(P.ui.tag).width + 60); g2d.restore(); return w; })();
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }), ui: { tag: { text: P.ui.tag, x0: 110, x1: 110 + tagW, ok: 110 + tagW <= 940 } } },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
