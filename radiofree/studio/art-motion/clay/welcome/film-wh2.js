// WELCOME HOME v2 — the launch film of a home display that knows your face, on a stop-motion stage.
// Art direction (plan/looks/ART-DIRECTION.md): the airy, expensive MORNING of a launch film, but every surface made
// by hand. Low sun through the window lands in hard warm patches; a cool room fill; glazed clay zellige; oak; two
// pendants over the island; the device's cord dropping through a hole drilled in the island (the real film did);
// French toast in the pan. The family are masked Tokos, one carrier colour each — the device's whole job is
// telling faces apart, and these faces are masks. The device is unbranded.
//   look 1  the product shot: the display sharp in the foreground, the family's morning soft behind it
//   look 2  what the display's own camera sees: a wide, slightly barrelled feed, the face box, a frosted pill
//   look 3  the climax: the family crowded round the 7-inch screen, watching the door camera, lit by it

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../clay-roadster/lib/post.js';
import { surface, setBoil } from '../clay-roadster/lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh as mesh0, rng } from '../clay-roadster/lib/sculpt.js';
import { canvas, tex } from '../clay-roadster/lib/city.js';
import { Toko } from '../clay-roadster/lib/toko.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const FONT_DIR = '../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
{ const f = new FontFace('Inter', `url(${FONT_DIR}Inter-var.woff)`, { weight: '100 900' }); document.fonts.add(await f.load()); }
{ const f = new FontFace('IPAPGothic', 'url(../fonts/ipagp.ttf)'); document.fonts.add(await f.load()); }   // Japanese, a gothic
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e2d6');
const camera = new THREE.PerspectiveCamera(46, W / H, 2, 3000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ clays
const C = (color, o = {}) => surface({ color, wrap: 0.35, wrapTint: '#ffe0c8', rough: 0.72, bump: 1, lump: 0.03, lumpF: 0.3, thumb: 0.02, thumbCell: 2.6, ridge: 0.1, tool: 0.35, grain: 0.002, grainF: 8, mottle: 0.05, specks: 0.12, roughVar: 0.06, ...o });
const GLAZE = (color, o = {}) => C(color, { rough: 0.22, thumb: 0.012, thumbCell: 1.4, specks: 0.08, clearcoat: 1, clearcoatRough: 0.12, mottle: 0.08, ...o });
const M = {
  wall: C('#efe7db', { thumb: 0.01, thumbCell: 7, mottle: 0.035, specks: 0.04 }), wallShade: C('#e4d9ca', { thumbCell: 7 }),
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
    fig(420, 300, 1.0, '#ffc800', '#e8d9c0'); fig(478, 296, 1.08, '#9a9a9a', '#3f4a5c');
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
for (const k in CAST) { const c = CAST[k]; c.toko = new Toko(c.mats); c.toko.hood.visible = true; c.wrap = new THREE.Group(); c.wrap.add(c.toko.group); scene.add(c.wrap); c.wrap.scale.setScalar(c.s); }
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
const sun = new THREE.DirectionalLight('#ffdfae', 6.0);
{ const target = new THREE.Vector3(10, 20, -50), dir = SUN_DIR.clone();
  sun.position.copy(target).addScaledVector(dir, -420); sun.target.position.copy(target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 50, far: 900 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 1.5; scene.add(sun, sun.target); }
const hemi = new THREE.HemisphereLight('#dde6f4', '#c9ad8c', 0.55); scene.add(hemi);
const fill = new THREE.DirectionalLight('#eef2ff', 0.36); { const f = fill; f.position.set(-60, 90, 160); f.castShadow = true; f.shadow.mapSize.set(2048, 2048);
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

// ------------------------------------------------------------------ the looks
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; };
const LOOKS = [
  { name: 'wh2-1-hero', ui: 'flow', cast() {
      place('dad', 44, BACK + 31, Math.PI + 0.35, (at) => ({ lean: 0.14, hy: -1.1, hp: 0.05, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      place('mum', -3, ISL.z - 19, 0.3, (at) => ({ lean: 0.2, hp: -0.02, hy: 0.3, elR: at([-7.4, 7.4, 4.2]), hdR: at([-6.6, 1.6, 11.4]), elL: at([7.4, 7.4, 4.2]), hdL: at([6.6, 1.6, 11.4]) }));
      place('kid', -24, ISL.z - 16, 0.5, (at) => ({ lean: 0.1, hp: -0.1, hy: 0.35, elR: at([-6.4, 9, 3.6]), hdR: at([-2.6, 12.6, 6.4]), elL: at([6.6, 8.6, 1.2]), hdL: at([7.2, 2.4, 2.6]) }));
      CAST.son.wrap.visible = false; },
    pos: [31, 29.5, -17], at: [-2, 31, -78], fov: 48, focus: () => DEV.localToWorld(new THREE.Vector3(0, 16.5, 0)), ap: 10 },
  { name: 'wh2-2-face', ui: 'flow', hideDev: true, feed: true, cast() {
      place('mum', 9, ISL.z - 21, -0.06, (at) => ({ lean: 0.24, hp: 0.0, hy: 0.06, elR: at([-7.2, 7.2, 4.4]), hdR: at([-6.4, 2.0, 11.6]), elL: at([7.2, 7.2, 4.4]), hdL: at([6.4, 2.0, 11.6]) }));
      place('dad', 46, BACK + 30, Math.PI + 0.25, (at) => ({ lean: 0.14, hy: -0.4, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      CAST.son.wrap.visible = false; CAST.kid.wrap.visible = false; },
    pos: [14, 30, -44], at: [10, 37, -80], fov: 74, focus: () => CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()), ap: 3 },
  { name: 'wh2-3-door', ui: 'door', devYaw: Math.PI + 0.2, cast() {
      const lean = (hy, P = {}) => (at) => ({ lean: 0.42, hp: 0.16, hy, elR: at([-7, 6.4, 5.4]), hdR: at([-6, 0.6, 12.8]), elL: at([7, 6.4, 5.4]), hdL: at([6.2, 0.6, 12.8]), ...P });
      place('mum', 4, ISL.z - 20, 0.0, lean(0.42));
      place('dad', 25, ISL.z - 20, 0.0, (at) => ({ lean: 0.42, hp: 0.16, hy: -0.42, elR: at([-6.6, 6.0, 6]), hdR: at([-2.6, 11.4, 9.6]), elL: at([7, 6.4, 5.4]), hdL: at([6.2, 0.6, 12.8]) }));
      place('son', 15, ISL.z - 28, 0.0, (at) => ({ lean: 0.3, hp: 0.3, hy: -0.05, elR: at([-6.6, 8.6, 1.2]), hdR: at([-7.2, 2.4, 2.6]), elL: at([6.6, 8.6, 1.2]), hdL: at([7.2, 2.4, 2.6]) }));
      place('kid', -6, ISL.z - 17, 0.25, (at) => ({ lean: 0.3, hp: 0.05, hy: 0.4, elR: at([-6, 8, 3]), hdR: at([-4, 5, 9]), elL: at([6, 8, 3]), hdL: at([4, 5, 9]) })); },
    pos: [36, 35, -12], at: [9, 36, -70], fov: 46, focus: () => CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()), ap: 7, screenGlow: 160 },
];
function draw(i) {
  const L = LOOKS[i];
  setBoil(i + 1); drawUI(L.ui); hideAll(); L.cast(); DEV.visible = !L.hideDev; DEV.rotation.y = L.devYaw ?? -0.18;
  scene.updateMatrixWorld(true);
  screenLight.position.copy(DEV.localToWorld(new THREE.Vector3(0, 16.5, 8))); screenLight.intensity = L.screenGlow ?? 40;
  screenLight.color.set(L.ui === 'door' ? '#cfe2ff' : '#ffc6d6');
  camera.fov = L.fov; camera.position.set(...L.pos); camera.lookAt(...L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: camera.position.distanceTo(L.focus()), aperture: L.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.2, knee: 0.5, bloomA: 0.3, bloomB: 0.22, exposure: 1.12, vignette: 0.16, grain: 0.02, seed: i * 13,
    sat: 1.06, contrast: 1.04, lift: [0.01, 0.008, 0.012], gain: [1.03, 1.0, 0.97], toe: 0.03 });
  g2d.drawImage(renderer.domElement, 0, 0);
  if (L.feed) {
    barrel(g2d, 0.11);
    const m = CAST.mum.toko.mask.getWorldPosition(new THREE.Vector3()); let [x, y] = project(m);
    const R = Math.hypot(W / 2, H / 2), nx = (x - W / 2) / R, ny = (y - H / 2) / R, r2 = nx * nx + ny * ny, f = (1 + 0.11 * r2) / (1 + 0.11);
    x = W / 2 + (x - W / 2) / f; y = H / 2 + (y - H / 2) / f;
    const e = project(m.clone().add(new THREE.Vector3(4.6, 0, 0)))[0] - project(m)[0];
    faceUI(g2d, [x, y], Math.abs(e) * 1.15, 'Good morning.', 'Recognised · 1 of 6');
  }
  return out2d.toDataURL('image/png');
}
window.__film = { looks: LOOKS.map((l) => ({ name: l.name })), look: draw, tune(o) { if (o.hemi !== undefined) hemi.intensity = o.hemi; if (o.fill !== undefined) fill.intensity = o.fill; if (o.sun !== undefined) sun.intensity = o.sun; if (o.bulbs !== undefined) BULBS.forEach((b) => { if (b.isLight) b.intensity = o.bulbs; }); } };
window.__ready = true;
