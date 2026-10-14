// HAPPY LITTLE BOT — Toko thinker #2, the claymation cut. 37.5 s, 1080×1920.
//
// Style 1 (Aardman plasticine), approved 2026-10-14. One set, three puppets,
// six shots on a 112 BPM grid. Puppets are posed ON TWOS — a pose is a pure
// function of the exposure (12 a second) and each exposure re-lumps the clay
// (BOIL) — while the camera, the rain and the light move every frame.
//
// window.__film.frame(i) renders global frame i of 900 (24 fps), cross-
// dissolving across each cut over 0.5 s; window.__film.still(shot, s) renders
// one shot at shot-time s.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { Kid, Toy, Adult, V3 } from './lib/rig.js';
import { skyPlane, facadeFlat, cathedral, canvas, tex, dropMaterial } from './lib/city.js';

const RES = Number(new URLSearchParams(location.search).get('res') || 1);   // 0.5 for layout drafts
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
const mixPose = (A, Bv, k) => { const o = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(Bv)])) { const a = A[key] ?? Bv[key], b = Bv[key] ?? A[key]; o[key] = typeof a === 'number' || Array.isArray(a) ? mix(a, b, k) : (k < 0.5 ? a : b); } return o; };
/** a hop: height 0..1 over phase 0..1, with squash at the contacts */
const hop = (ph) => { ph = ((ph % 1) + 1) % 1; const h = 4 * ph * (1 - ph); const sq = ph < 0.12 ? 0.14 * (1 - ph / 0.12) : ph > 0.9 ? 0.12 * (ph - 0.9) / 0.1 : -0.05 * Math.sin(Math.PI * ph); return { h, sq }; };
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** a talking envelope: syllables at ~5 a second with gaps between words */
const chatter = (t, seed = 0) => { const syl = Math.floor(t * 5.2 + seed); const f = t * 5.2 + seed - syl; const on = hash(syl) > 0.22 ? 1 : 0.15; return on * (0.55 + 0.45 * Math.sin(Math.PI * f)) * (0.75 + 0.25 * hash(syl * 3.1)); };

// ------------------------------------------------------------------ boot
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 5, 1400);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');

// ------------------------------------------------------------------ clays
const clay = (color, o = {}) => surface({ color, wrap: 0.45, wrapTint: '#ffc6a0', rough: 0.6, bump: 1, lump: 0.05, lumpF: 0.5, thumb: 0.035, thumbCell: 2.0, ridge: 0.12, tool: 0.8, grain: 0.004, grainF: 8, mottle: 0.10, specks: 0.6, roughVar: 0.12, ...o });
const M = {
  jumper: clay('#bf8d2f', { thumbCell: 1.5, thumb: 0.05, tool: 1.3 }),
  collar: clay('#a8772a'),
  trousers: clay('#3a5682', { thumb: 0.045, tool: 1.2 }),
  socks: clay('#2f6f6a'),
  skin: clay('#e3a07a', { specks: 0.3 }),
  head: clay('#5a3420', { tool: 2.0, thumbCell: 0.9, ridge: 0.1, thumb: 0.05 }),
  hair: clay('#5a3420', { tool: 1.6, thumbCell: 0.8 }),
  hat: clay('#b8432b', { tool: 1.2, thumbCell: 1.5 }),
  hatBrim: clay('#a63b26', { thumb: 0.04, ridge: 0.09, tool: 1.6, thumbCell: 1.0 }),
  pompom: clay('#efe2c4', { thumb: 0.06, ridge: 0.08, thumbCell: 0.7, lump: 0.08, lumpF: 1.6 }),
  maskDisc: clay('#e2068e', { rough: 0.62, thumb: 0.03, thumbCell: 1.5, mottle: 0.06, specks: 0.3, speckColor: '#5a0730' }),
  maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.015, thumbCell: 0.9, mottle: 0.04, specks: 0.25 }),
  strap: clay('#2a2523', { thumb: 0.01, rough: 0.5 }),
  redLed: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.5, 0.35) }),
};
const TM = {
  body: clay('#ece0c8', { thumbCell: 1.4, thumb: 0.045, tool: 1.2, mottle: 0.12, lump: 0.08, lumpF: 0.7 }),
  belly: clay('#f7f1e6', { thumb: 0.025 }), ear: clay('#e2d3bb'),
  antenna: clay('#3a3634', { thumb: 0.01 }), bobble: clay('#e86a4a', { thumb: 0.02 }),
  eye: clay('#16120f', { rough: 0.22, thumb: 0.004, mottle: 0.02, specks: 0 }),
  eyeGlint: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.0, 2.0, 2.0) }),
  smile: clay('#2a1d18', { rough: 0.4, thumb: 0.006 }), cheek: clay('#ee8f86', { thumb: 0.01 }),
  bezel: clay('#4c4a48', { rough: 0.35, thumb: 0.008 }),
  led: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 7.0, 8.0) }),
};
const LED_ON = new THREE.Color(1.4, 7.0, 8.0), LED_OFF = new THREE.Color(0.05, 0.09, 0.1);
const AM = {
  cardigan: clay('#5d7a86', { thumbCell: 1.7, thumb: 0.05, tool: 1.4 }),
  collar: clay('#e6dcc6', { thumb: 0.03 }),
  trousers: clay('#3f4a5a', { thumb: 0.04, tool: 1.1 }),
  shoes: clay('#2a1d16', { rough: 0.4 }),
  skin: clay('#d99872', { specks: 0.3 }),
  hair: clay('#8a8278', { tool: 1.8, thumbCell: 0.9, thumb: 0.05 }),
  maskDisc: clay('#ffd51e', { rough: 0.6, thumb: 0.03, thumbCell: 1.5, mottle: 0.06, specks: 0.3, speckColor: '#6a5000' }),   // STICKER.YELLOW — the master's own ground
  maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.015, thumbCell: 0.9, mottle: 0.04, specks: 0.25 }),
  strap: clay('#2a2523', { thumb: 0.01, rough: 0.5 }),
};
const S = {
  cushion: clay('#9a3a2c', { thumbCell: 2.6, tool: 1.0 }),
  wall: clay('#5e4c36', { lump: 0.08, lumpF: 0.3, thumb: 0.025, thumbCell: 3.2, mottle: 0.16, rough: 0.8, noBoil: true }),
  rail: clay('#5c3f25', { lump: 0.05, mottle: 0.1, rough: 0.7, noBoil: true }),
  frame: clay('#e9dfc8', { lump: 0.04, thumb: 0.03, thumbCell: 2.6, mottle: 0.07, rough: 0.55, specks: 0.9 }),
  card: surface({ color: '#a77d4f', rough: 0.95, lump: 0.01, thumb: 0.0, tool: 0, grain: 0.012, grainF: 14, mottle: 0.18, specks: 1.0, speckColor: '#5d4027', noBoil: true }),
  floor: clay('#3a2618', { tool: 1.2, thumbCell: 3, ridge: 0.18, noBoil: true }),
  curtain: clay('#2f5a40', { tool: 1.4, thumbCell: 2.4, ridge: 0.14, mottle: 0.12 }),
  lampBase: clay('#3e6b52', { rough: 0.45 }),
  shade: surface({ color: '#f2d29a', rough: 0.9, lump: 0.01, thumb: 0.004, grain: 0.01, grainF: 20, side: THREE.DoubleSide }),
  mug: clay('#c94f3c', { rough: 0.4 }), cocoa: clay('#4a2a1c', { rough: 0.25, thumb: 0.004 }),
};
S.shade.userData.U.uGlow.value.set(1.3, 0.72, 0.28); S.shade.userData.U.uGlowPow.value = 0.6;

// ------------------------------------------------------------------ the set
const WX = 12.5, WY0 = -1, WY1 = 50, WALLZ = 7, DEEP = 13, GZ = WALLZ - DEEP;   // a deep bay, as in the approved still
{
  const sh = new THREE.Shape([[-90, -40], [90, -40], [90, 100], [-90, 100]].map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path([[-WX, WY0], [-WX, WY1], [WX, WY1], [WX, WY0]].map(([x, y]) => new THREE.Vector2(x, y))));
  mesh(lumpy(new THREE.ExtrudeGeometry(sh, { depth: DEEP, bevelEnabled: false, curveSegments: 1 }), 0.14, 0.25, 71), S.wall, { pos: [0, 0, GZ], parent: scene });
  mesh(lumpy(sausage([[-90, 58, WALLZ + 0.5], [90, 58, WALLZ + 0.5]], [0.8, 0.8], { steps: 120 }), 0.07, 0.6, 72), S.rail, { parent: scene });
}
const bar = (x, y, w, h, d = 2.2, seed = 80) => mesh(lumpy(new RoundedBoxGeometry(w, h, d, 3, 0.5), 0.09, 0.45, seed), S.frame, { pos: [x, y, GZ + d / 2 - 0.4], parent: scene });
bar(0, WY1 - 1.2, WX * 2, 2.6, 2.4, 81); bar(0, WY0 + 1.0, WX * 2, 2.0, 2.4, 82);
bar(-WX + 1.2, (WY0 + WY1) / 2, 2.4, WY1 - WY0, 2.4, 83); bar(WX - 1.2, (WY0 + WY1) / 2, 2.4, WY1 - WY0, 2.4, 84);
bar(0, (WY0 + WY1) / 2, 1.8, WY1 - WY0, 2.0, 85); bar(0, 36, WX * 2, 1.6, 2.0, 86);
// the bench: a long cushion running into the window bay, card front with its flutes
const BX0 = -40, BX1 = 36, BZ1 = 24;
mesh(lumpy(new RoundedBoxGeometry(BX1 - BX0, 4.0, BZ1 - GZ, 6, 1.8), 0.24, 0.3, 90), S.cushion, { pos: [(BX0 + BX1) / 2, -1.9, (GZ + BZ1) / 2], parent: scene });
for (const [x, z] of [[-30, 14], [-20, 19], [16, 19], [27, 14], [-9, -3], [9, -3]]) mesh(lumpy(ball(0.55, 1, 0.5, 1, 16), 0.03, 1, 91 + x), S.cushion, { pos: [x, 0.05, z], parent: scene, cast: false });
mesh(lumpy(new RoundedBoxGeometry(BX1 - BX0 + 2, 30, 2, 2, 0.4), 0.08, 0.4, 92), S.card, { pos: [(BX0 + BX1) / 2, -19, BZ1 - 1.6], parent: scene });
for (let i = 0; i < 40; i++) mesh(new THREE.CylinderGeometry(0.26, 0.26, 26, 6), S.card, { pos: [BX0 + 1 + i * 1.88, -18, BZ1 - 0.5], parent: scene, cast: false });
mesh(new THREE.PlaneGeometry(300, 200).rotateX(-Math.PI / 2), S.floor, { pos: [0, -34, 60], parent: scene });
// the curtain, rolled by hand, hanging at the left of the bay
for (let i = 0; i < 6; i++) {
  const x = -WX - 9.5 + i * 1.9, ph = i * 1.7, pts = [];
  for (let k = 0; k <= 6; k++) { const y = 66 - k * 11; pts.push([x + Math.sin(ph + k * 0.6) * 0.5 + (k > 3 ? (k - 3) * 0.5 : 0), y, WALLZ + 1.4 + (i % 2) * 1.1]); }
  mesh(lumpy(sausage(pts, [1.25, 1.2, 1.3, 1.2, 1.25, 1.35, 1.4], { up: [0, 0, 1], steps: 80 }), 0.12, 0.35, 140 + i), S.curtain, { parent: scene });
}
mesh(lumpy(sausage([[-34, 67, WALLZ + 2.5], [30, 67, WALLZ + 2.5]], [0.6, 0.6], { steps: 40 }), 0.04, 0.5, 149), S.rail, { parent: scene });
// a mug of cocoa on the bench, gone cold
{
  const mug = new THREE.Group();
  mesh(lumpy(lathe([[0.01, 0], [2.0, 0], [2.15, 0.3], [2.1, 4.2], [1.8, 4.2], [1.75, 0.6], [0.01, 0.6]], 40), 0.06, 0.6, 120), S.mug, { parent: mug });
  mesh(lumpy(new THREE.TorusGeometry(1.15, 0.38, 10, 24, Math.PI * 1.2).rotateZ(-Math.PI * 0.6), 0.04, 0.8, 121), S.mug, { pos: [2.2, 2.2, 0], parent: mug });
  mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.1, 30), S.cocoa, { pos: [0, 3.5, 0], parent: mug });
  mug.position.set(18, 0.1, 11); mug.rotation.y = 0.9; scene.add(mug);
}
// the lamp, on a stool at the bench's right end
const lampPos = [17.5, 1.0, 23];
{
  const lamp = new THREE.Group();
  mesh(lumpy(lathe([[0.01, 0], [3.8, 0], [3.9, 0.6], [2.6, 2.0], [1.0, 4.0], [0.6, 4.4], [0.6, 15], [0.01, 15]], 40), 0.1, 0.4, 130), S.lampBase, { parent: lamp });
  mesh(lumpy(lathe([[4.2, 0], [7.2, 0.2], [7.4, 0.6], [4.6, 9.0], [4.0, 9.2]], 48), 0.12, 0.35, 131), S.shade, { pos: [0, 12, 0], parent: lamp, cast: false });
  lamp.bulb = mesh(new THREE.SphereGeometry(1.5, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 5.5, 2.6) }), { pos: [0, 15.5, 0], parent: lamp, cast: false });
  lamp.position.set(...lampPos);
  scene.add(lamp);
  mesh(lumpy(new THREE.CylinderGeometry(5, 5.5, 35, 24), 0.12, 0.4, 132), S.card, { pos: [lampPos[0], lampPos[1] - 17.5, lampPos[2]], parent: scene });
  scene.userData.lamp = lamp;
}

// ------------------------------------------------------------------ outside
const out = new THREE.Group(); scene.add(out);
out.add(skyPlane(400, 120, [[0, '#0b1633'], [0.3, '#1d335e'], [0.55, '#4a5578'], [0.7, '#9a7476'], [0.82, '#d08a5c'], [1, '#5a3a2a']], { pos: [0, 62, -180], intensity: 1.0 }));
{
  const far = facadeFlat({ w: 240, h: 60, px: 8, seed: 11, wall: ['#2a3350', '#2e3753', '#283049'], frame: '#1a2030', lit: ['#ffcf7a'], litP: 0.12, dark: '#1e2437', winW: 1.1, winH: 1.6, winGapX: 1.5, winGapY: 1.7, blockW: 18, topMin: 0.38, topVar: 0.14, glow: 1.6 });
  far.position.set(-10, 25, -112); out.add(far);
  const c = canvas(600, 420), g = c.getContext('2d');
  g.fillStyle = '#374868'; cathedral(g, 300, 420, 6.2);
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, 0, 420); gr.addColorStop(0, '#5d8a83'); gr.addColorStop(0.42, '#46706c'); gr.addColorStop(0.45, '#3e4f6c'); gr.addColorStop(1, '#2f3c58');
  g.fillStyle = gr; g.fillRect(0, 0, 600, 420);
  g.fillStyle = '#ffd38a'; for (const x of [-7, -2.5, 2.5, 7]) g.fillRect(300 + x * 6.2 - 6, 420 - 33 * 6.2, 9, 22);
  for (const x of [-20, -12, 12, 20]) for (const y of [8, 15]) g.fillRect(300 + x * 6.2 - 5, 420 - y * 6.2, 8, 14);
  const cat = new THREE.Mesh(new THREE.PlaneGeometry(30, 21), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  cat.position.set(3, 47.5, -104); out.add(cat);
  const mid = facadeFlat({ w: 150, h: 60, px: 10, seed: 23, wall: ['#4c4038', '#433b3a', '#57483c'], frame: '#2a2322', lit: ['#ffc366', '#ffdb94', '#ff9f5a'], litP: 0.36, dark: '#2c2a30', winW: 1.6, winH: 2.4, winGapX: 1.7, winGapY: 2.0, blockW: 18, topMin: 0.08, topVar: 0.14, glow: 2.6 });
  mid.position.set(0, 8, -62); out.add(mid);
  const wire = new THREE.MeshBasicMaterial({ color: '#07090d' });
  for (const [y0, y1] of [[47, 38], [45.2, 36.2]]) out.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-60, y0, -40), new THREE.Vector3(60, y1, -36)), 2, 0.08, 4), wire));
  out.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 70, 6), wire).translateX(-16).translateY(10).translateZ(-40));
}
// rain: one instanced field, falling every frame
const RAIN_N = 900, rainBox = [-45, 45, -12, 78, -58, -8], RAIN_SPEED = 52;
const rainSeeds = [];
const rain = (() => {
  const geo = new THREE.CylinderGeometry(0.04, 0.04, 4.5, 4, 1);
  const mat = new THREE.MeshBasicMaterial({ color: '#9fb8d8', transparent: true, opacity: 0.36, depthWrite: false, blending: THREE.AdditiveBlending });
  const im = new THREE.InstancedMesh(geo, mat, RAIN_N);
  const r = rng(3);
  for (let i = 0; i < RAIN_N; i++) rainSeeds.push([rainBox[0] + r() * (rainBox[1] - rainBox[0]), r(), rainBox[4] + r() * (rainBox[5] - rainBox[4]), 0.6 + r() * 0.8, 0.85 + r() * 0.3]);
  im.frustumCulled = false; out.add(im); return im;
})();
function rainAt(t) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12)), sc = new THREE.Vector3();
  const span = rainBox[3] - rainBox[2];
  rainSeeds.forEach(([x, y0, z, len, sp], i) => {
    const y = rainBox[3] - (((y0 * span + t * RAIN_SPEED * sp) % span) + span) % span;
    sc.set(1, len, 1); m.compose(new THREE.Vector3(x - (rainBox[3] - y) * 0.12, y, z), q, sc); rain.setMatrixAt(i, m);
  });
  rain.instanceMatrix.needsUpdate = true;
}
// drops on the glass; a few of them run
const dropMat = dropMaterial({ sky: '#6e83ad', dark: '#110f15', glint: '#ffd7a0', lightDir: [0.8, 0.3, 0.9], glintAmt: 3, opacity: 0.8 });
const DROP_N = 46, runners = [];
const drops = (() => {
  const r = rng(17), geo = new THREE.SphereGeometry(1, 20, 12); geo.scale(1, 1.08, 0.5);
  const im = new THREE.InstancedMesh(geo, dropMat, DROP_N + 8), m = new THREE.Matrix4();
  for (let i = 0; i < DROP_N; i++) { const x = -WX + 2.5 + r() * (WX * 2 - 5), y = WY0 + 3 + r() * (WY1 - WY0 - 5), s = 0.22 + r() * r() * r() * 0.9; m.compose(new THREE.Vector3(x, y, GZ - 0.2), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m); }
  for (let i = 0; i < 8; i++) runners.push({ x: -WX + 3 + r() * (WX * 2 - 6), y0: WY1 - 4 - r() * 10, v: 2.5 + r() * 4, s: 0.45 + r() * 0.3, ph: r() * 20 });
  im.frustumCulled = false; scene.add(im); return im;
})();
const runMat = new THREE.MeshPhysicalMaterial({ color: '#cfe0ff', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.14, specularIntensity: 1 });
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
  let gr = g.createRadialGradient(225, 300, 4, 225, 300, 120); gr.addColorStop(0, 'rgba(255,190,120,0.5)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  gr = g.createLinearGradient(0, 512, 0, 380); gr.addColorStop(0, 'rgba(200,215,235,0.30)'); gr.addColorStop(1, 'rgba(200,215,235,0)');
  g.fillStyle = gr; g.fillRect(0, 380, 256, 132);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WX * 2, WY1 - WY0), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glass.position.set(0, (WY0 + WY1) / 2, GZ - 0.05); scene.add(glass);
}

// ------------------------------------------------------------------ puppets
const kid = new Kid(M);
const KID_POS = new THREE.Vector3(-2.2, 0.2, 2.2), KID_YAW = 0.2;
kid.group.position.copy(KID_POS); kid.group.rotation.y = KID_YAW; scene.add(kid.group);
const toy = new Toy(TM, { r: 3.6 }); scene.add(toy.group);
const adult = new Adult(AM); scene.add(adult.group);
kid.group.updateMatrixWorld(true);
const toWorld = (p) => kid.group.localToWorld(new THREE.Vector3(...p));
const toKid = (p) => kid.group.worldToLocal(new THREE.Vector3(...p)).toArray();

// ------------------------------------------------------------------ light
scene.add(new THREE.HemisphereLight('#5d6f9a', '#4a2f1c', 0.42));
const key = new THREE.SpotLight('#ffbb80', 5200, 0, 0.75, 0.75, 2);
key.position.set(lampPos[0], lampPos[1] + 15, lampPos[2]); key.target.position.set(-2, 11, 10);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 4; key.shadow.camera.far = 140;
scene.add(key, key.target);
const fill = new THREE.PointLight('#ffd8b0', 600, 0, 2); fill.position.set(-8, 34, 62); scene.add(fill);
const sideFill = new THREE.PointLight('#ffc89a', 0, 0, 2); sideFill.position.set(-34, 26, 44); scene.add(sideFill);   // only when the grown-up is in
const cool = new THREE.PointLight('#7f9fe0', 420, 0, 2); cool.position.set(-26, 30, 40); scene.add(cool);
const win = new THREE.DirectionalLight('#8eb0ff', 2.6);
win.position.set(-14, 40, -80); win.target.position.set(0, 10, 8);
win.castShadow = true; win.shadow.mapSize.set(2048, 2048); win.shadow.radius = 4; win.shadow.bias = -0.0004; win.shadow.normalBias = 0.03;
Object.assign(win.shadow.camera, { left: -45, right: 45, top: 55, bottom: -35, near: 1, far: 220 });
scene.add(win, win.target);
const led = new THREE.PointLight('#5fe8ff', 60, 0, 2); scene.add(led);
led.castShadow = true; led.shadow.mapSize.set(512, 512); led.shadow.radius = 3; led.shadow.bias = -0.002; led.shadow.camera.near = 0.5; led.shadow.camera.far = 60;
const bounce = new THREE.PointLight('#c0603e', 160, 0, 2); bounce.position.set(2, -2, 40); scene.add(bounce);
const KEY0 = new THREE.Color('#ffbb80'), KEYW = new THREE.Color('#ff9446');

// ------------------------------------------------------------------ poses
// kid-space arm targets. L = the −x side (the child's own right).
const HUG = { lean: 0.15, slump: 0, side: 0, shrink: 0, hp: 0.34, hr: -0.27, hy: 0, elL: [-4.7, 6.6, 5.4], hdL: [-1.75, 5.0, 10.0], elR: [5.1, 6.6, 5.4], hdR: [2.1, 5.0, 10.0] };
const SLUMP = { lean: 0.14, slump: 1, side: -0.42, shrink: 0, hp: 0.42, hr: 0.12, hy: -0.2, hx: -1.2, elL: [-5.0, 5.0, 4.6], hdL: [-3.2, 3.0, 8.8], elR: [5.2, 5.0, 4.8], hdR: [4.6, 3.6, 8.2] };
const SHRUNK = { lean: -0.04, slump: 0.75, side: -0.36, shrink: 1, hp: 0.42, hr: 0.1, hy: -0.2, hx: -0.8, elL: [-4.6, 5.6, 4.0], hdL: [1.6, 6.0, 5.6], elR: [4.6, 5.8, 4.2], hdR: [-1.3, 6.5, 5.8] };
const TOY_HUG = [0.2, 3.4, 7.2], TOY_SLIP = [4.6, 2.4, 8.3];
const TOY_SEAT = [8.6, 0.0, 9.8];         // world: on the cushion at the child's left, at the bay's mouth

function kidCup(cupWorld) { return { lean: 0.12, slump: 0.5, side: -0.4, shrink: 0.1, hp: 0.38, hr: 0.12, hy: 0.1, hx: -1.6, cup: 1, cupAt: toKid(cupWorld), cupTilt: 0.55, cupYaw: 0.55, elL: [-1.6, 2.6, 7.0], elR: [4.6, 2.8, 6.0] }; }
const CUP_W = [5.0, 4.6, 12.8];
const OFFER = { lean: 0.14, slump: 0.25, side: 0.04, shrink: 0, hp: 0.3, hr: -0.04, hy: 0.42, hx: 0, elL: [-0.6, 6.0, 6.4], hdL: [2.4, 6.2, 10.4], elR: [5.4, 6.2, 4.8], hdR: [4.6, 6.1, 8.8] };
const SIT6 = { lean: 0.12, slump: 0.8, side: -0.08, shrink: 0.1, hp: 0.42, hr: 0.04, hy: -0.08, hx: 0, elL: [-5.0, 5.0, 4.6], hdL: [-2.4, 3.0, 8.6], elR: [5.2, 5.0, 4.8], hdR: [2.6, 3.0, 8.6] };
const HELD = { lean: 0.02, slump: 0.55, side: -0.02, shrink: 0.1, hp: 0.3, hr: -0.04, hy: -0.22, hx: 0, elL: [-4.6, 5.2, 4.8], hdL: [-1.4, 3.8, 8.4], elR: [4.8, 5.2, 4.8], hdR: [1.8, 3.8, 8.4] };
const breath = (tp) => 0.5 + 0.5 * Math.sin(tp * Math.PI * 2 / 3.4);

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

// reference points, measured off the puppets in their key poses
const A = (() => {
  const m = (P) => { kid.pose(P); kid.group.updateMatrixWorld(true); return kid.mask.getWorldPosition(new THREE.Vector3()).toArray(); };
  const o = { maskHug: m(HUG), maskSlump: m(SLUMP), maskShrunk: m(SHRUNK) };
  o.chest = toWorld([0, 7.5, 2.0]).toArray();
  o.toySlip = toWorld(TOY_SLIP).add(new THREE.Vector3(0, 3.6, 0)).toArray();
  o.toySeat = [TOY_SEAT[0], TOY_SEAT[1] + 3.6, TOY_SEAT[2]];
  console.log('anchors', JSON.stringify(o));
  return o;
})();

/** everything a shot shows at shot-time s (pose time sp, quantised to twos) */
const SHOTS = [
  // 1 — the room, rain, the LED wakes and the plush bounces in the child's arms. Slow push in.
  {
    cam: (s) => ({ ...frameCam({ T: A.maskHug, at: [540, 1070], az: 7, el: 8, D: lerp(112, 92, smooth(0, 6.6, s)), fov: 31 }), focus: 'mask', ap: 22 }),
    pose: (sp) => {
      const b = sp > 1.55 && sp < 2.45 ? hop((sp - 1.55) / 0.45) : { h: 0, sq: 0 };
      return { kid: { ...HUG, breathe: breath(sp) }, toy: { at: 'hug', base: [TOY_HUG[0], TOY_HUG[1], TOY_HUG[2] + b.h * 0.9], h: b.h * 0.85, sq: b.sq, lean: 0.36 + b.h * 0.12, pitch: -0.16 - b.h * 0.12 } };   // hop forward, out of the child's chin
    },
    led: (s) => (s < 0.85 ? 0 : s < 1.35 ? (hash(Math.floor(s * 24)) > 0.45 ? 0.9 : 0.1) : 0.85 + 0.15 * Math.sin(s * 3)),
  },
  // 2 — closer on the child, from below the drooping mask: the slump, the hug loosening. Locked off.
  {
    cam: (s) => ({ ...frameCam({ T: A.maskSlump, at: [500, 1060], az: 4, el: -4, D: 56, fov: 30 }), focus: 'mask', ap: 26 }),
    pose: (sp) => {
      const k = smooth(0.25, 2.7, sp), P = mixPose({ ...HUG }, SLUMP, k);
      P.breathe = breath(sp) * (1 - k * 0.5);
      return { kid: P, toy: { at: 'hug', base: mix(TOY_HUG, TOY_SLIP, smooth(0.6, 2.8, sp)), h: 0, sq: 0, lean: lerp(0.36, 0.05, k), yaw: lerp(-0.15, -0.55, k) } };
    },
    led: (s) => 0.82 + 0.1 * Math.sin(s * 2.4),
  },
  // 3 — the plush, close: crash zoom from the left; at 0.5 s the LED flares and it bounces up, beaming.
  {
    cam: (s) => { const z = eout(0, 0.32, s), sh = s < 0.45 ? Math.sin(s * 70) * 0.25 * (1 - s / 0.45) : 0; return { ...frameCam({ T: A.toySlip, at: [620 + sh * 20, 1300 + sh * 30], az: 8, el: 6, D: lerp(80, 44, z), fov: lerp(30, 24, z) }), focus: 'toy', ap: 30 }; },
    pose: (sp) => {
      let b = { h: 0, sq: 0 };
      if (sp >= 0.5 && sp < 1.2) { b = hop((sp - 0.5) / 0.7); b.h *= 3.2; }
      else if (sp >= 1.2) { b = hop((sp - 1.2) / 0.55); b.h *= 1.1; }
      else if (sp > 0.35) b = { h: 0, sq: 0.12 };       // the crouch before the jump
      return { kid: { ...SLUMP, breathe: breath(sp) * 0.5 }, toy: { at: 'hug', base: TOY_SLIP, h: b.h, sq: b.sq, lean: 0.12 + 0.1 * Math.sin(sp * 7), pitch: -0.3, yaw: -0.95, wave: sp > 0.5 ? 0.6 + 0.4 * Math.sin(sp * 9) : 0 } };
    },
    led: (s) => (s < 0.5 ? 0.85 : s < 0.62 ? 3.4 : lerp(2.6, 1.35, smooth(0.62, 1.8, s)) * (0.8 + 0.2 * chatter(s, 3))),
  },
  // 4 — two-shot: it bounces and chatters on the cushion; the child shrinks against the window.
  {
    cam: (s) => ({ ...frameCam({ T: mix(A.maskShrunk, A.toySeat, 0.45), at: [540, 1120], az: 3, el: 4, D: 88, fov: 30 }), focus: 'mask', ap: 18 }),
    pose: (sp) => {
      const k = smooth(0.3, 2.9, sp), P = mixPose({ ...SLUMP }, SHRUNK, k);
      P.breathe = breath(sp) * 0.4;
      const b = hop(sp / 0.5);
      return { kid: P, kidShift: [-0.4 * k, 0, -1.0 * k], kidScale: 1 - 0.06 * k, toy: { at: 'seat', base: TOY_SEAT, h: b.h * 1.3, sq: b.sq, lean: 0.25 * Math.sin(sp * 4.1), yaw: -0.75, pitch: -0.12, wave: 0.5 + 0.5 * Math.sin(sp * 8) } };
    },
    led: (s) => 0.6 + 0.9 * chatter(s, 7),
  },
  // 5 — the offer: arms out, both palms up and open toward the plush — an imaginary present.
  //     It turns its back and keeps talking. A slow truck right.
  {
    cam: (s) => { const k = smooth(0, 6.4, s); return { ...frameCam({ T: mix(A.chest, A.toySeat, lerp(0.46, 0.58, k)), at: [540, 1290], az: -8, el: 2, D: 82, fov: 30 }), focus: 'hands', ap: 18 }; },
    pose: (sp) => {
      const reach = eout(0.05, 0.9, sp), turn = smooth(0.7, 1.6, sp), b = hop(sp / 0.55);
      const P = mixPose({ ...SHRUNK, shrink: 0.4 }, OFFER, reach);
      P.open = reach; P.palm = [[0.15, 1, -0.2], [0.15, 1, -0.2]];
      P.breathe = breath(sp) * 0.4;
      return { kid: P, toy: { at: 'seat', base: [TOY_SEAT[0] + 1.6, TOY_SEAT[1], TOY_SEAT[2] + 0.4], h: b.h * 0.7, sq: b.sq * 0.7, lean: 0.12 * Math.sin(sp * 3.7), yaw: lerp(-1.2, 2.1, turn), pitch: -0.1, wave: 0.4 + 0.4 * Math.sin(sp * 7) } };
    },
    led: (s) => 0.55 + 0.9 * chatter(s, 11),
  },
  // 6 — wide: a grown-up sits down and puts an arm round the child's shoulders; the LED blinks
  //     at nobody, alone at the right; on the last hit (3.0 s) the lamp clicks warmer. Pull back.
  {
    cam: (s) => { const k = smooth(0, 5.4, s); return { ...frameCam({ T: mix([-3.5, 13, 8], [-4.2, 14, 8], k), at: [540, 1130], az: 4, el: 8, D: lerp(116, 150, k), fov: 30 }), focus: 'mask', ap: lerp(14, 9, k) }; },
    pose: (sp) => {
      const sit = eout(0.05, 1.5, sp), arm = smooth(1.15, 2.5, sp), lean = smooth(1.9, 3.0, sp);
      const P = mixPose(SIT6, HELD, lean);
      P.breathe = breath(sp) * 0.6;
      const b = hop(sp / 0.6);
      return { kid: P, adult: { sit, arm }, toy: { at: 'seat', base: TOY_SEAT, h: b.h * 0.5, sq: b.sq * 0.5, lean: 0.12, yaw: 0.2, pitch: -0.1, wave: 0.3 } };
    },
    led: (s) => { const bl = Math.floor(s * 2.2) % 2 === 0 ? 1.15 : 0.12; return s < 3.0 ? bl : bl * 0.9; },
    lamp: (s) => smooth(2.98, 3.06, s),
  },
];

// the grown-up: from standing at the left edge to sitting, arm round the child
function adultPose({ sit, arm }) {
  const seated = [-17.0, 0.2, 11.0], standing = [-29, 7.5, 20];
  const hip = mix(standing, seated, sit);
  const lean = lerp(0.55, 0.12, sit) + 0.18 * Math.sin(Math.PI * sit);
  const knee = mix([0.4, -6, 3.5], [0, 0.4, 11.5], sit), foot = mix([0.2, -10.5, 3.2], [0, -30, 13.5], sit);
  kid.group.updateMatrixWorld(true);
  const kS = kid.anchor.S.map(p => toWorld(p).toArray()), kH2 = toWorld(kid.anchor.H2).toArray();
  // the arm nearer the child is the +x one (the grown-up's left)
  const lapL = { el: add3(hip, [5.6, 8.0, 3.5]), via: add3(hip, [4.6, 5.0, 6.0]), hd: add3(hip, [3.2, 3.4, 7.5]) };
  const lift = { el: add3(kS[0], [-2.5, 5.0, -1.5]), via: add3(kS[0], [1.0, 5.5, -3.0]), hd: add3(kS[1], [0.0, 5.0, -2.5]) };
  const round = { el: add3(kS[0], [-0.8, 1.3, -5.0]), via: add3(kS[1], [1.4, 0.8, -3.6]), hd: add3(kS[1], [2.7, 1.2, 1.7]) };
  const L3 = (a, b, k) => ({ el: V3.lerp3(a.el, b.el, k), via: V3.lerp3(a.via, b.via, k), hd: V3.lerp3(a.hd, b.hd, k) });
  const A = arm < 0.5 ? L3(lapL, lift, arm * 2) : L3(lift, round, arm * 2 - 1);
  adult.pose({
    hip, yaw: 0.3, lean, side: 0.03 * arm,
    knee, foot, hp: 0.14 + 0.12 * arm, hr: -0.04 * arm, hy: 0.22 * arm,
    elR: add3(hip, [-6.2, 7.5, 3.0]), hdR: add3(hip, [-3.4, 3.6, 8.0]),
    elL: A.el, viaL: A.via, hdL: A.hd, palm: [[0, 1, 0], [0.4, 1, -0.6]],
  });
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ------------------------------------------------------------------ one frame
let lastKey = '';
function setShot(k, s, t) {
  const sh = SHOTS[k];
  const e = Math.floor(t * POSE_FPS + 1e-6), tp = e / POSE_FPS, sp = tp - CUTS[k];
  const poseKey = `${k}:${e}`;
  if (poseKey !== lastKey) {
    lastKey = poseKey;
    setBoil(e);
    kid.group.position.copy(KID_POS); kid.group.scale.setScalar(1); kid.group.updateMatrixWorld(true);
    const P = sh.pose(Math.max(-0.5, sp));
    kid.group.position.copy(KID_POS).add(new THREE.Vector3(...(P.kidShift || [0, 0, 0])));
    kid.group.scale.setScalar(P.kidScale || 1);
    kid.group.updateMatrixWorld(true);
    kid.pose(P.kid);
    const T = P.toy;
    if (T.at === 'hug') { const w = toWorld(T.base); toy.group.position.copy(w); toy.group.rotation.y = KID_YAW; }
    else { toy.group.position.set(...T.base); toy.group.rotation.y = 0; }
    toy.pose({ h: T.h, sq: T.sq, lean: T.lean ?? 0.3, pitch: T.pitch ?? -0.16, yaw: T.yaw ?? -0.15, wave: T.wave || 0 });
    adult.group.visible = !!P.adult;
    sideFill.intensity = P.adult ? 900 : 0;
    if (P.adult) adultPose(P.adult);
  }
  // light, every frame
  const L = clamp(sh.led(s), 0, 4);
  TM.led.color.copy(LED_OFF).lerp(LED_ON, Math.min(L, 1)).multiplyScalar(Math.max(1, L));
  led.intensity = 60 * L; led.position.copy(toy.ledWorld());
  const lw = sh.lamp ? sh.lamp(s) : 0;
  key.color.copy(KEY0).lerp(KEYW, lw); key.intensity = 5200 * (1 + 0.35 * lw);
  scene.userData.lamp.bulb.material.color.setRGB(9 + 4 * lw, 5.5 + 1.5 * lw, 2.6);
  S.shade.userData.U.uGlow.value.setRGB(1.3 + 0.7 * lw, 0.72 + 0.25 * lw, 0.28);
  rainAt(t); dropsAt(t);
  // camera, every frame
  const c = window.__camOverride || sh.cam(s);
  camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(Math.sin(c.roll || 0), Math.cos(c.roll || 0), 0); camera.lookAt(...c.look); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  let fp;
  if (c.focus === 'toy') fp = toy.ledWorld();
  else if (c.focus === 'hands') fp = kid.cup.visible ? kid.cup.getWorldPosition(new THREE.Vector3()) : kid.mitts[1].getWorldPosition(new THREE.Vector3());
  else fp = kid.mask.getWorldPosition(new THREE.Vector3());
  return { focus: camera.position.distanceTo(fp), ap: c.ap, lamp: lw };
}

function draw(k, s, t) {
  const f = setShot(k, s, t);
  post.render(scene, camera, {
    focus: f.focus, aperture: f.ap, maxBlur: TUNE.maxBlur, radScale: TUNE.radScale, noTile: TUNE.noTile,
    threshold: 1.3, knee: 0.5, bloomA: 0.3, bloomB: 0.14,
    exposure: 0.62 * (1 + 0.1 * f.lamp), vignette: 0.5, grain: 0.03, seed: t * 37 % 97,
    sat: 1.06, contrast: 1.06, lift: [0.008, 0.006, 0.012], gain: [1.02, 1.0, 0.96], toe: 0.07,
  });
}

/** which shots are on screen at global time t, with weights */
function layers(t) {
  for (let k = 0; k < 6; k++) {
    const c1 = CUTS[k + 1];
    if (k < 5 && Math.abs(t - c1) < XF / 2) { const w = (t - (c1 - XF / 2)) / XF; return [[k, 1 - w], [k + 1, w]]; }
    if (t < c1 || k === 5) return [[k, 1]];
  }
}

function probe(k, s) {
  draw(k, s, CUTS[k] + s);
  const P = (v) => { const p = v.clone().project(camera); return [Math.round((p.x + 1) / 2 * 1080), Math.round((1 - p.y) / 2 * 1920)]; };
  const o = { mask: P(kid.mask.getWorldPosition(new THREE.Vector3())), toy: P(toy.body.getWorldPosition(new THREE.Vector3())) };
  if (kid.cup.visible) o.cup = P(kid.cup.getWorldPosition(new THREE.Vector3()));
  if (adult.group.visible) {
    o.adultMask = P(adult.mask.getWorldPosition(new THREE.Vector3()));
    o.adultHandW = adult.hands.map(h => h.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(1)));
    o.kidShoulderW = kid.shoulders.map(m => m.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(1)));
    o.adultHandVis = adult.hands.map(h => h.visible);
  }
  const r = kid.p.maskR, d = camera.position.distanceTo(kid.mask.getWorldPosition(new THREE.Vector3()));
  o.maskRpx = Math.round(r / (2 * d * Math.tan(camera.fov * Math.PI / 360)) * 1920);
  return o;
}
const TUNE = { radScale: 1.5, maxBlur: 26, noTile: false };
window.__film = {
  probe,
  time(o, n = 3) {
    Object.assign(TUNE, o.tune || {});
    if (o.samples !== undefined) post.rtScene.samples = o.samples;
    if (o.shadows !== undefined) renderer.shadowMap.enabled = o.shadows;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) { lastKey = ''; draw(0, 2 + i * 0.1, 2 + i * 0.1); renderer.getContext().readPixels(0, 0, 1, 1, renderer.getContext().RGBA, renderer.getContext().UNSIGNED_BYTE, new Uint8Array(4)); }
    return (performance.now() - t0) / n;
  },
  W, H, FPS, CUTS, frames: Math.round(CUTS[6] * FPS),
  frame(i, q = 0.94) {
    const t = i / FPS, L = layers(t);
    g2d.globalAlpha = 1; g2d.fillStyle = '#000'; g2d.fillRect(0, 0, W, H);
    for (const [k, w] of L) {
      if (L.length > 1) lastKey = '';               // a dissolve renders two poses in one frame
      draw(k, t - CUTS[k], t);
      g2d.globalAlpha = L.length === 1 ? 1 : (k === L[0][0] ? 1 : w);
      g2d.drawImage(renderer.domElement, 0, 0);
    }
    return out2d.toDataURL('image/jpeg', q);
  },
  still(k, s, cam) { lastKey = ''; window.__camOverride = cam || null; draw(k, s, CUTS[k] + s); window.__camOverride = null; return renderer.domElement.toDataURL('image/png'); },
};
window.__ready = true;
