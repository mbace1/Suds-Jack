// UNMARKED BOXES (RFH, Global 4 · AI-server export controls), v2 full build, 6 Nov (v1 stills, 6 Nov). The ART test the owner asked for after Cut
// First did well (6 Nov: "maybe it's the art, maybe the topic, maybe both"): the SAME approved 3D cars look (looks/cars,
// clay/cutfirst) on a non-Finnish story. A tilt-shift toy world, soft anime grade, extruded toys whose wheels really roll.
// Five shots, one thing happening in each:
//   1 · the export gate at a US port: a truck of AI SERVERS crates brakes at the booms; STOP · LICENSE NEEDED FOR CHINA
//   2 · high over a toy sea, four shores: the ship takes the long way round, US → TAIWAN → SOUTHEAST ASIA, dashed  "went anyway"
//   3 · the repack line in a shed: labelled crates go under an arch and come out plain cardboard               "unmarked"
//   4 · the workbench: a hair dryer blows a serial sticker off a real server onto a dummy                        "hair dryer"
//   5 · a row of dummies, an EXPORT CHECK van, green ticks pop; the camera rises: the ship is off to CHINA       "were shown dummies"
// Rules: charged, not convicted, so every claim is "prosecutors say"; no person and no company named on screen; no
// people at all (the hair dryer stands on a clamp). 1080×1920, 30 fps. film.html?lang=en

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['NotoSansJP-800', 'NotoSansJP-800.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3),
  back: (k) => { k = clamp(k); const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);
const V = (a) => new THREE.Vector3(...a), lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ------------------------------------------------------------------ renderer, scene, post (as Cut First)
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const FOG = C3('#aec4e8'); scene.fog = new THREE.Fog(FOG, 130, 520); scene.background = FOG.clone();
const camera = new THREE.PerspectiveCamera(32, W / H, 1, 1400);
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ materials
const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const M = {
  ground: matte('#8bb35c', { roughness: 1 }), shoulder: matte('#dccba4'), road: matte('#676d80', { roughness: 0.9 }),
  line: matte('#f6f1e2', { roughness: 0.7 }), quay: matte('#cfcbc1', { roughness: 0.95 }), quayEdge: matte('#9fa2a8'), sand: matte('#ead6a0', { roughness: 1 }),
  rubber: matte('#1c1c1f', { roughness: 0.7 }), hub: paint('#cfd2d6', { metalness: 0.4, roughness: 0.3 }),
  chassis: matte('#26272b', { roughness: 0.6 }), glass: paint('#1a2230', { roughness: 0.08, clearcoat: 1 }),
  tree: matte('#3f7a55'), tree2: matte('#5b9a62'), trunk: matte('#8a5d3c'),
  steel: paint('#9aa3ad', { metalness: 0.5, roughness: 0.35 }), fence: matte('#c9ccd0', { roughness: 0.5 }),
  white: paint('#f2efe8'), post: paint('#e8e4da'), floor: matte('#b9b4aa', { roughness: 0.9 }), wall: matte('#e9e2d2'), roof: matte('#cf6a4a'),
  belt: matte('#2d2f35', { roughness: 0.7 }), roller: paint('#b8bec6', { metalness: 0.5 }), bench: matte('#c99a68'), pallet: matte('#d9b07a'),
  server: paint('#3a3e47', { roughness: 0.35, metalness: 0.3 }), dummy: matte('#a7abb2', { roughness: 0.75 }),
  dryer: paint('#f2707a'), dryerDark: matte('#3b3134'),
};
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ------------------------------------------------------------------ copy (the props carry words, so it loads first)
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 8.8], ['s4', 13.2], ['s5', 17.6], ['end', 22.4]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;
const FAM = 'Anton-400';
const fit = (g, text, fs, maxW, min = 36) => { g.font = `${fs}px ${FAM}`; while (g.measureText(text).width > maxW && fs > min) { fs -= 4; g.font = `${fs}px ${FAM}`; } return fs; };

// ------------------------------------------------------------------ the sky (as the look demo)
const skyTex = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#2f64c0'); gr.addColorStop(0.3, '#447fd6'); gr.addColorStop(0.44, '#5e97e2'); gr.addColorStop(0.478, '#8fb8ee'); gr.addColorStop(0.495, '#c4d6f0'); gr.addColorStop(0.5, '#aec4e8'); gr.addColorStop(1, '#aec4e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const SKY = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); SKY.renderOrder = -1;
scene.add(SKY);
const cloudTex = canvasTex(512, 256, (g, w, h) => { const r = rng(5);
  const B = []; for (let i = 0; i < 22; i++) { const x = 90 + r() * 330, rad = 22 + r() * 40; B.push([x, 168 - rad * 0.55 - Math.sin((x - 90) / 330 * Math.PI) * 55 - r() * 20, rad]); }
  g.save(); g.beginPath(); g.rect(0, 0, w, 176); g.clip();
  for (const [x, y, rad] of B) { g.fillStyle = 'rgba(178,184,226,0.96)'; g.beginPath(); g.arc(x, y + rad * 0.18, rad, 0, TAU); g.fill(); }
  for (const [x, y, rad] of B) { const gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, rad * 0.1, x, y - rad * 0.1, rad * 0.92);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(250,248,255,0.98)'); gr.addColorStop(1, 'rgba(232,230,250,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - rad * 0.1, rad * 0.92, 0, TAU); g.fill(); }
  g.restore(); });
const CLOUDS = [[-90, 60, -420, 160], [60, 76, -460, 190], [170, 56, -400, 130], [-10, 46, -380, 110], [-190, 70, -430, 150]].map(([x, y, z, w]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); m.position.set(x, y, z); m.lookAt(0, y, 60); scene.add(m); return m; });

// ------------------------------------------------------------------ the toy sea and its four shores
const SEA_Y = -0.8, QUAY_Z = -16, BARRIER_Z = 4, ROAD_W = 7.5, BX = ROAD_W / 2 + 1.0;
const seaTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); const R = rng(9);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(214,236,255,${0.5 + R() * 0.5})`; g.fillRect(R() * w, R() * h, 20 + R() * 46, 2); } });
seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(40, 40);
const SEA = mesh(new THREE.PlaneGeometry(2400, 2400).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#3d8fd8', map: seaTex, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.06 }),
  { pos: [0, SEA_Y, -200], cast: false });
// the US side: a slab of land ending in a concrete quay
mesh(new THREE.BoxGeometry(900, 4, 600), M.ground, { pos: [0, -2, QUAY_Z + 300], cast: false });
mesh(new THREE.BoxGeometry(900, 4.02, 14), M.quay, { pos: [0, -2, QUAY_Z + 7], cast: false });
mesh(new THREE.BoxGeometry(900, 0.6, 0.6), M.quayEdge, { pos: [0, 0.05, QUAY_Z + 0.3], cast: false });
for (let x = -60; x <= 60; x += 9) mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.8, 10), M.chassis, { pos: [x, 0.4, QUAY_Z + 1.2] });
mesh(new THREE.PlaneGeometry(ROAD_W + 3, 300).rotateX(-Math.PI / 2), M.shoulder, { pos: [0, 0.01, QUAY_Z + 14 + 150], cast: false });
mesh(new THREE.PlaneGeometry(ROAD_W, 300).rotateX(-Math.PI / 2), M.road, { pos: [0, 0.02, QUAY_Z + 14 + 150], cast: false });
for (let z = BARRIER_Z + 4; z < 200; z += 6) mesh(new THREE.PlaneGeometry(0.22, 2.8).rotateX(-Math.PI / 2), M.line, { pos: [0, 0.03, z + 1.4], cast: false });
for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(0.16, 300).rotateX(-Math.PI / 2), M.line, { pos: [s * (ROAD_W / 2 - 0.35), 0.03, QUAY_Z + 14 + 150], cast: false });

/** an island: a sand rim, a green top, a pier towards the route, a few round toy trees */
function island(x, z, r, seed, pier) {
  mesh(new THREE.CylinderGeometry(r + 3.2, r + 4.2, 3, 40), M.sand, { pos: [x, -2.05, z], cast: false });
  mesh(new THREE.CylinderGeometry(r, r + 0.8, 3, 40), M.ground, { pos: [x, -1.5, z], cast: false });
  if (pier) { const [px, pz, len, ang] = pier; mesh(new THREE.BoxGeometry(len, 0.7, 4), M.quay, { pos: [px, -0.45, pz], rot: [0, ang, 0] }); }
  const R = rng(seed), crown = new THREE.IcosahedronGeometry(1.6, 0), trunk = new THREE.CylinderGeometry(0.2, 0.28, 2.2, 6);
  for (let i = 0; i < Math.round(r * 0.9); i++) { const a = R() * TAU, d = r * (0.55 + R() * 0.38), tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
    if (tz > z + r * 0.35 && Math.abs(tx - x) < r * 0.5) continue;                 // keep the front clear
    const s = 0.8 + R() * 0.7; mesh(trunk, M.trunk, { pos: [tx, 1.1 * s, tz] }).scale.setScalar(s);
    mesh(crown, R() < 0.5 ? M.tree : M.tree2, { pos: [tx, 2.9 * s, tz], rot: [R(), R(), 0] }).scale.setScalar(s); }
}
// v2: the map is 0.85 as deep as the stills' (MZ), so US and China both clear the caption block and the tag in shot 2
const MZ = (z) => QUAY_Z + (z - QUAY_Z) * 0.85;
const TW = { x: -30, z: MZ(-62), r: 15 }, SEAS = { x: 30, z: MZ(-112), r: 24 }, CN_Z = MZ(-172);
island(TW.x, TW.z, TW.r, 11, [TW.x + TW.r + 3.5, TW.z, 8, 0]);
island(SEAS.x, SEAS.z, SEAS.r, 13, [SEAS.x - SEAS.r - 3.5, SEAS.z + 14, 9, 0]);
// China: a coastline across the top of the map, with its own quay
mesh(new THREE.BoxGeometry(900, 4, 500), M.ground, { pos: [0, -2, CN_Z - 250], cast: false });
mesh(new THREE.BoxGeometry(900, 3, 6), M.sand, { pos: [0, -2.3, CN_Z + 1], cast: false });
mesh(new THREE.BoxGeometry(16, 0.7, 10), M.quay, { pos: [-8, -0.45, CN_Z + 3] });
{ const R = rng(17), crown = new THREE.IcosahedronGeometry(1.8, 0);
  for (let i = 0; i < 90; i++) { const tx = (R() - 0.5) * 300, tz = CN_Z - 8 - R() * 120; if (Math.abs(tx + 8) < 14 && tz > CN_Z - 20) continue;
    mesh(crown, R() < 0.5 ? M.tree : M.tree2, { pos: [tx, 2.2, tz], rot: [R(), R(), 0], cast: false }); } }

/** a signboard on two posts, its face turned (yaw only) towards a point: the map's labels, readable from the high shots */
function board(text, x, z, w, face, color = '#1d1b19') {
  const tex = canvasTex(1024, 256, (g, cw, ch) => { g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, cw, ch); g.strokeStyle = color; g.lineWidth = 14; g.strokeRect(7, 7, cw - 14, ch - 14);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; fit(g, text, 190, cw - 90, 60); g.fillText(text, cw / 2, 198); });
  const grp = new THREE.Group(); scene.add(grp); grp.position.set(x, 0, z); grp.rotation.y = Math.atan2(face[0] - x, face[2] - z);
  const h = w / 4, fy = 3.2 + h / 2, lean = Math.atan2(face[1] - fy, Math.hypot(face[0] - x, face[2] - z));
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.4, 0.4, fy + 0.6, 8), M.steel, { pos: [s * w * 0.3, (fy + 0.6) / 2 - 0.6, -0.4], parent: grp });
  const faceG = new THREE.Group(); grp.add(faceG); faceG.position.set(0, fy, 0); faceG.rotation.x = -lean * 0.85;
  mesh(rbox(w + 0.8, h + 0.8, 0.5, 0.2), M.white, { pos: [0, 0, -0.3], parent: faceG });
  mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), { pos: [0, 0, 0], parent: faceG, cast: false });
  return grp;
}
const MAPCAM = [4, 250, 125];                                                   // v2: the labels 1.3x the stills', CHINA on its own sand
board(UI.us, -28, QUAY_Z + 8, 36, MAPCAM, '#1f3b57');
board(UI.taiwan, TW.x - 6, TW.z - 2, 54, MAPCAM);
board(UI.sea, SEAS.x + 2, SEAS.z - 18, 72, MAPCAM);
board(UI.china, -36, CN_Z + 2, 64, MAPCAM, '#b3261e');

// ------------------------------------------------------------------ the crates: labelled, and the same crates plain
const crateTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#2f6fd6'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.12)'; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 6);
  g.fillStyle = '#f6f3ea'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; fit(g, UI.crate, 150, w - 50, 60); g.fillText(UI.crate, w / 2, 250);
  g.fillStyle = '#f2c230'; g.fillRect(0, 300, w, 92); g.fillStyle = '#1d1b19'; fit(g, UI.crate2, 64, w - 40, 30); g.fillText(UI.crate2, w / 2, 368); });
const boxTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h); const R = rng(3);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(120,80,40,${0.06 + R() * 0.08})`; g.fillRect(0, R() * h, w, 1 + R() * 2); }
  g.fillStyle = '#b38652'; g.fillRect(w * 0.44, 0, w * 0.12, h); });
const CRATE_M = paint('#ffffff', { map: crateTex, roughness: 0.45, clearcoat: 0.6 }), BOX_M = matte('#ffffff', { map: boxTex, roughness: 0.95 });
const CRATE_G = rbox(2.4, 1.9, 2.6, 0.14);

// ------------------------------------------------------------------ the gate: two half-booms, lamps, the STOP sign, the port banner
const stripes = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d22d24'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
const boomMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
const BOOMS = [-1, 1].map((s) => {
  mesh(rbox(0.6, 1.4, 0.6, 0.14), M.post, { pos: [s * BX, 0.7, BARRIER_Z] });
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), M.post, { pos: [s * (BX + 0.75), 1.7, BARRIER_Z] });
  const head = new THREE.Group(); scene.add(head); head.position.set(s * (BX + 0.75), 3.3, BARRIER_Z + 0.06);
  mesh(rbox(2.2, 1.0, 0.18, 0.1), matte('#202226'), { parent: head });
  const lamps = [-1, 1].map((k) => { const m = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2a18', emissiveIntensity: 0.1 });
    mesh(new THREE.CircleGeometry(0.34, 20), m, { pos: [k * 0.6, 0, 0.1], parent: head, cast: false }); return m; });
  const pivot = new THREE.Group(); scene.add(pivot); pivot.position.set(s * BX, 1.25, BARRIER_Z);
  const len = BX - 0.15;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 12).rotateZ(Math.PI / 2), boomMat, { pos: [-s * len / 2, 0, 0], parent: pivot });
  return { s, pivot, lamps };
});
const bellL = new THREE.PointLight('#ff3a20', 0, 16, 1.8); bellL.position.set(0, 3.0, BARRIER_Z + 1.5); scene.add(bellL);
const signTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c92a22'; g.lineWidth = 34; g.strokeRect(17, 17, w - 34, h - 34);
  g.fillStyle = '#c92a22'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `330px ${FAM}`; g.fillText(UI.stop || 'STOP', w / 2, 380);
  fit(g, UI.halt, 112, w - 110); g.fillStyle = '#1d1b19'; g.fillText(UI.halt, w / 2, 545); });
const SIGN = new THREE.Group(); scene.add(SIGN); SIGN.position.set(BX + 2.9, 0, BARRIER_Z + 1.4); SIGN.rotation.y = -0.2;
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), M.steel, { pos: [s * 2.6, 1.7, -0.12], parent: SIGN });
mesh(rbox(6.6, 4.2, 0.22, 0.08), M.white, { pos: [0, 4.6, -0.1], parent: SIGN });
mesh(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 }), { pos: [0, 4.6, 0.02], parent: SIGN, cast: false });
const siteTex = canvasTex(1220, 200, (g, w, h) => { g.fillStyle = '#1f3b57'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, UI.site, 120, w - 80); g.fillText(UI.site, w / 2, h / 2 + 6); });
{ const GX = ROAD_W / 2 + 2.3, GY = 6.2, GZ = BARRIER_Z - 3.2;
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.16, 0.18, GY + 0.9, 8), M.steel, { pos: [s * GX, (GY + 0.9) / 2, GZ] });
  mesh(new THREE.BoxGeometry(GX * 2 + 0.6, 0.3, 0.3), M.steel, { pos: [0, GY + 0.9, GZ] });
  mesh(rbox(11.3, 2.0, 0.16, 0.06), paint('#1f3b57'), { pos: [0, GY, GZ + 0.05] });
  mesh(new THREE.PlaneGeometry(11, 1.8), new THREE.MeshStandardMaterial({ map: siteTex, roughness: 0.6 }), { pos: [0, GY, GZ + 0.2], cast: false }); }
// fence along the quay road, and stacks of crates waiting on the quay
const fencePanel = new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: 0.6, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
for (const s of [-1, 1]) { const x0 = s * (ROAD_W / 2 + 2.5), x1 = s * 50, n = 14;
  for (let i = 0; i <= n; i++) mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), M.fence, { pos: [lerp(x0, x1, i / n), 1.3, BARRIER_Z - 3] });
  mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), 2.4), fencePanel, { pos: [(x0 + x1) / 2, 1.3, BARRIER_Z - 3], cast: false }); }
for (const [x, z, n] of [[-16, -8, 3], [-22, -4, 2], [16, -9, 2]]) for (let k = 0; k < n; k++) mesh(CRATE_G, CRATE_M, { pos: [x + (k % 2) * 2.6, 0.95 + Math.floor(k / 2) * 1.9, z] });

// ------------------------------------------------------------------ the toys: a flatbed of crates, a van, the ship
const blobTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false });
function wheel(r, w, parent, x, z) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, r, z);
  mesh(new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2), M.rubber, { parent: g });
  mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 14).rotateZ(Math.PI / 2), M.hub, { parent: g, cast: false });
  for (let k = 0; k < 4; k++) mesh(new THREE.BoxGeometry(w + 0.08, r * 0.16, r * 0.62), M.chassis, { rot: [k * Math.PI / 4, 0, 0], parent: g, cast: false });
  return g;
}
function lights(body, w, y, zRear, zFront) {
  const brake = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2414', emissiveIntensity: 0.25 });
  for (const s of [-1, 1]) mesh(rbox(0.42, 0.22, 0.1, 0.04), brake, { pos: [s * (w / 2 - 0.3), y, zRear + 0.03], parent: body, cast: false });
  const head = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff4d0', emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) mesh(rbox(0.4, 0.22, 0.1, 0.04), head, { pos: [s * (w / 2 - 0.3), y, zFront - 0.03], parent: body, cast: false });
  return { brake, head };
}
function profile(pts, width, bevel = 0.14) {
  const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.closePath();
  const d = Math.max(0.05, width - 2 * bevel);
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 }).translate(0, 0, -d / 2).rotateY(Math.PI / 2);
}
function sill(x0, x1, y, wheels, ar) {
  const o = [[x0, y]];
  for (const [wx, wy] of [...wheels].sort((a, b) => a[0] - b[0])) { o.push([wx - ar, y]); for (let i = 0; i <= 10; i++) { const a = Math.PI - i / 10 * Math.PI; o.push([wx + Math.cos(a) * ar, wy + Math.sin(a) * ar]); } o.push([wx + ar, y]); }
  o.push([x1, y]); return o;
}
function glowAt(root, z) { const l = new THREE.PointLight('#ff2a14', 0, 7, 2); l.position.set(0, 0.9, z); root.add(l); return l; }
/** a flatbed lorry carrying four AI SERVERS crates (the Cut First timber truck, logs swapped for crates) */
function crateTruck(cabColor) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.62, L = 10.4;
  mesh(new THREE.PlaneGeometry(4.2, L + 1.6).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(2.3, 0.45, L, 0.18), M.chassis, { pos: [0, 0.95, 0], parent: body });
  mesh(profile([[-1.25, 0.95], [1.15, 0.95], [1.3, 1.25], [1.3, 2.15], [0.95, 3.2], [-1.25, 3.25]], 2.5, 0.2), paint(cabColor), { pos: [0, 0, -L / 2 + 1.3], parent: body });
  mesh(profile([[1.0, 2.25], [0.78, 3.0], [0.05, 3.0], [0.05, 2.25]], 2.56, 0.05), M.glass, { pos: [0, 0, -L / 2 + 1.3], parent: body, cast: false });
  mesh(rbox(2.6, 0.5, 0.5, 0.2), M.chassis, { pos: [0, 1.15, -L / 2 + 0.05], parent: body });
  mesh(rbox(2.6, 0.3, 7.4, 0.08), M.pallet, { pos: [0, 1.32, 1.4], parent: body });
  for (const [z, y] of [[-0.6, 0], [2.0, 0], [4.3, 0], [0.7, 1]]) mesh(CRATE_G, CRATE_M, { pos: [0, 2.42 + y * 1.92, z], parent: body });
  const { brake } = lights(body, 2.4, 1.15, L / 2, -L / 2);
  const wheels = [-L / 2 + 1.3, 1.6, 3.2].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.5, root, s * 1.12, z)));
  return { root, body, wheels, r, L, brake, dip: 0.045, glow: glowAt(root, L / 2 + 0.8) };
}
function van(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.46, L = 5.2;
  mesh(new THREE.PlaneGeometry(3, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  const sl = sill(-2.45, 2.75, 0.36, [[-1.55, 0.46], [1.85, 0.46]], 0.6).reverse();
  mesh(profile([...sl, [-2.5, 0.5], [-2.5, 2.35], [1.7, 2.4], [2.45, 1.55], [2.8, 1.25], [2.8, 0.5]].reverse(), 2.0, 0.2), paint(color), { parent: body });
  mesh(profile([[2.38, 1.55], [1.66, 2.22], [1.05, 2.22], [1.05, 1.55]], 2.06, 0.04), M.glass, { parent: body, cast: false });
  const { brake } = lights(body, 2.0, 1.05, 2.45 + 0.12, -2.75 - 0.12);
  const wheels = [-1.85, 1.55].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.34, root, s * 0.95, z)));
  return { root, body, wheels, r, L, brake, dip: 0.06, glow: glowAt(root, L / 2 + 0.8) };
}
/** the inspectors' van: white, a band and EXPORT CHECK on both flanks; nobody visible */
function checkVan() {
  const v = van('#f4f4f1');
  for (const s of [-1, 1]) mesh(rbox(0.06, 0.3, 4.4, 0.03), paint('#1f3b57'), { pos: [s * 1.06, 0.95, 0.15], parent: v.body, cast: false });
  const word = canvasTex(768, 128, (g, w, h) => { g.fillStyle = '#1f3b57'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, UI.check, 104, w - 30); g.fillText(UI.check, w / 2, h / 2 + 4); });
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(3.6, 0.6), new THREE.MeshStandardMaterial({ map: word, transparent: true, roughness: 0.5, depthWrite: false }), { pos: [s * 1.07, 1.55, 0.2], rot: [0, s * Math.PI / 2, 0], parent: v.body, cast: false });
  return v;
}
/** a toy cargo ship, bow to −z: hull, deck, bridge and funnel aft, two cargoes (the labelled crates, then plain boxes) */
function ship() {
  const root = new THREE.Group(); scene.add(root); const body = new THREE.Group(); root.add(body);
  mesh(profile([[-11, -1.4], [9, -1.4], [12.4, 2.4], [-11.4, 2.4]], 6.2, 0.4), paint('#24477e'), { parent: body });
  mesh(profile([[-11.1, -1.4], [9.2, -1.4], [9.6, -0.6], [-11.1, -0.6]], 6.3, 0.3), paint('#c8372d'), { parent: body, cast: false });
  mesh(rbox(5.6, 0.3, 20.6, 0.1), M.floor, { pos: [0, 2.45, -0.4], parent: body });
  mesh(rbox(5.4, 3.8, 3.8, 0.3), M.white, { pos: [0, 4.4, 8.3], parent: body });
  mesh(rbox(5.5, 0.7, 3.9, 0.1), M.glass, { pos: [0, 5.4, 8.3], parent: body, cast: false });
  mesh(new THREE.CylinderGeometry(0.8, 0.9, 2.4, 14), paint('#e0b23a'), { pos: [0, 7.3, 9.4], parent: body });
  mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.5, 14), M.chassis, { pos: [0, 8.6, 9.4], parent: body, cast: false });
  const A = new THREE.Group(), B = new THREE.Group(); body.add(A, B);
  for (const [cx, cz, cy] of [[-1.3, -7, 0], [1.3, -7, 0], [-1.3, -4.2, 0], [1.3, -4.2, 0], [-1.3, -1.4, 0], [1.3, -1.4, 0], [-1.3, 1.4, 0], [1.3, 1.4, 0], [0, -5.6, 1], [0, -2.8, 1], [0, 0, 1]]) {
    mesh(CRATE_G, CRATE_M, { pos: [cx, 3.55 + cy * 1.92, cz], parent: A }); mesh(CRATE_G, BOX_M, { pos: [cx, 3.55 + cy * 1.92, cz], parent: B }); }
  const wake = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const WAKE = mesh(new THREE.PlaneGeometry(7, 26).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: wake, transparent: true, depthWrite: false, opacity: 0 }), { pos: [0, 0.06, 23], parent: root, cast: false, recv: false });
  return { root, body, A, B, WAKE };
}

// the export run: the lorry rolls up the quay road and brakes at the booms
const V0 = 8.5, DEC = 5.6;
const TRUCK = crateTruck('#d63b2c'); TRUCK.zStop = BARRIER_Z + 2.4 + TRUCK.L / 2; TRUCK.ts = 2.2; TRUCK.tb = TRUCK.ts - V0 / DEC; TRUCK.dB = V0 * V0 / (2 * DEC);
const zAt = (v, u) => u >= v.ts ? v.zStop : u >= v.tb ? v.zStop + 0.5 * DEC * (v.ts - u) ** 2 : v.zStop + v.dB + V0 * (v.tb - u);
function drive(v, z, z0, u) {
  v.root.position.z = z;
  const roll = Math.abs(z0 - z) / v.r; v.wheels.forEach((w) => { w.rotation.x = -roll; });
  let pitch = 0;
  if (u >= v.tb && u < v.ts) pitch = -v.dip * smooth((u - v.tb) / 0.22);
  else if (u >= v.ts) { const k = u - v.ts; pitch = -v.dip * Math.exp(-5.5 * k) * Math.cos(13 * k); }
  v.body.rotation.x = pitch; v.body.position.y = pitch * 0.6;
  const braking = u >= v.tb ? clamp((u - v.tb) / 0.08) : 0;
  v.brake.emissiveIntensity = lerp(0.3, lerp(6.5, 5.2, clamp((u - v.ts) / 0.6)), braking); v.glow.intensity = braking * 10;
}
const LANE = 1.85;

// the route: from the US quay, round by Taiwan, to the Southeast Asia pier, then on to China
const STOPS = { tw: [-2, MZ(-60)], sea: [-6, MZ(-98)] };
const ROUTE = new THREE.CatmullRomCurve3([[8, -26], [3, -42], [-2, -60], [3, -80], [-6, -98], [-13, -120], [-14, -142], [-10, -158], [-8, -167]].map(([x, z]) => new THREE.Vector3(x, SEA_Y, z < -26 ? MZ(z) : z)), false, 'catmullrom', 0.4);
/** where along the route (0..1, by arc length) a stop sits */
const uNear = ([x, z]) => { let best = 0, bd = 1e9; for (let i = 0; i <= 600; i++) { const p = ROUTE.getPointAt(i / 600), dd = (p.x - x) ** 2 + (p.z - z) ** 2; if (dd < bd) { bd = dd; best = i / 600; } } return best; };
const U_TW = uNear(STOPS.tw), U_SEA = uNear(STOPS.sea);
const DASHES = []; { const n = 120, dashG = new THREE.PlaneGeometry(0.7, 2.4).rotateX(-Math.PI / 2), dashM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 });
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, p = ROUTE.getPointAt(u), d = ROUTE.getTangentAt(u);
    const m = mesh(dashG, dashM, { pos: [p.x, SEA_Y + 0.08, p.z], rot: [0, Math.atan2(d.x, d.z), 0], cast: false, recv: false }); m.userData.u = u; DASHES.push(m); } }
const SHIP = ship();
/** the ship's place on the route (0..1) at time t: docked at the US quay, out to Taiwan and on to the SE Asia pier in shot 2, on to China in shot 5 */
const shipU = (t) => {
  if (t < T.s2 + 0.3) return 0;
  if (t < T.s3) return lerp(0, U_SEA, ease.io((t - T.s2 - 0.3) / (T.s3 - T.s2 - 0.7)));
  if (t < T.s5 + 0.6) return U_SEA;
  return lerp(U_SEA, 0.97, ease.io((t - T.s5 - 0.6) / (T.end - T.s5 - 0.9)));
};

// ------------------------------------------------------------------ the shed on the Southeast Asia island: repack line, workbench, the dummies
const SH = { x: SEAS.x + 2, z: SEAS.z + 2, w: 24, d: 12, h: 7 };                  // front edge at SH.z + SH.d/2, open to +z
{ const { x, z, w, d, h } = SH;
  mesh(new THREE.BoxGeometry(w + 8, 0.3, d + 22), M.floor, { pos: [x, 0.15, z + 8], cast: false });                 // the slab and its apron
  mesh(new THREE.BoxGeometry(w, h, 0.4), M.wall, { pos: [x, h / 2, z - d / 2] });
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.4, h, d), M.wall, { pos: [x + s * w / 2, h / 2, z] });
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(w / 2 + 0.6, 0.35, d + 1.2), M.roof, { pos: [x + s * w / 4, h + 1.1, z - 0.2], rot: [0, 0, -s * 0.18] });
  mesh(new THREE.BoxGeometry(w + 0.4, 0.5, 0.5), M.roof, { pos: [x, h, z + d / 2] }); }
// the repack line: a belt across the shed, an arch with REPACK over its middle
const BELT_Y = 1.25, BELT_Z = SH.z - 1.5, BX0 = SH.x - 10.5, BX1 = SH.x + 10.5;
mesh(rbox(BX1 - BX0, 0.3, 2.9, 0.1), M.belt, { pos: [SH.x, BELT_Y - 0.15, BELT_Z] });
for (let x = BX0 + 0.5; x < BX1; x += 1.6) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, BELT_Y - 0.3, 0.2), M.steel, { pos: [x, (BELT_Y - 0.3) / 2, BELT_Z + s * 1.3] });
const repackTex = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#f2c230'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b19'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, UI.repack, 100, w - 30); g.fillText(UI.repack, w / 2, h / 2 + 4); });
// v2: a HOOD over the belt, open at both ends: labelled crates go in at the left, plain boxes come out at the right, and
// the change happens out of sight inside it (the stills' open arch put its front post across a passing crate)
const HOOD_W = 3.8, HOOD_Y = 3.45, HOOD = paint('#f2c230');
mesh(rbox(HOOD_W, HOOD_Y - BELT_Y + 0.2, 0.3, 0.08), HOOD, { pos: [SH.x, (HOOD_Y + BELT_Y) / 2 - 0.05, BELT_Z + 1.85] });       // front
mesh(rbox(HOOD_W, HOOD_Y - BELT_Y + 0.2, 0.3, 0.08), HOOD, { pos: [SH.x, (HOOD_Y + BELT_Y) / 2 - 0.05, BELT_Z - 1.85] });       // back
mesh(rbox(HOOD_W + 0.3, 0.35, 4.1, 0.12), HOOD, { pos: [SH.x, HOOD_Y + 0.12, BELT_Z] });                                        // roof
mesh(rbox(3.4, 1.0, 0.14, 0.05), paint('#1d1b19'), { pos: [SH.x, 2.45, BELT_Z + 2.05] });
mesh(new THREE.PlaneGeometry(3.1, 0.78), new THREE.MeshStandardMaterial({ map: repackTex, roughness: 0.6 }), { pos: [SH.x, 2.45, BELT_Z + 2.13], cast: false });
const CURTAIN = []; for (const s of [-1, 1]) for (let k = 0; k < 7; k++) { const m = mesh(new THREE.BoxGeometry(0.06, 2.3, 0.38), matte('#2b2d33'), { pos: [SH.x + s * (HOOD_W / 2 + 0.05), 2.35, BELT_Z - 1.2 + k * 0.4], cast: false }); m.userData.x = SH.x + s * (HOOD_W / 2 + 0.05); CURTAIN.push(m); }
// v2: the floor in front of the line, so shot 3's lower half is not empty: a pallet of labelled crates waiting (left), a
// pallet of plain boxes ready to ship (right), both low enough to leave the belt in view (shot 3 only)
const YARD = [];
for (const [dx, plain] of [[-2.4, false], [2.4, true]]) { YARD.push(mesh(rbox(2.9, 0.22, 2.9, 0.05), M.pallet, { pos: [SH.x + dx, 0.41, SH.z + 3.6] }));
  YARD.push(mesh(CRATE_G, plain ? BOX_M : CRATE_M, { pos: [SH.x + dx, 0.52 + 0.95, SH.z + 3.6] })); }
const LINE_N = 8, LINE_GAP = (BX1 - BX0 + 3) / LINE_N, LINE_V = 2.6;
const ITEMS = Array.from({ length: LINE_N }, () => ({ crate: mesh(CRATE_G, CRATE_M, {}), box: mesh(CRATE_G, BOX_M, {}) }));
// the workbench, front-left in the shed: a real server, a dummy, and a hair dryer on a clamp stand between them
const BENCH = { x: SH.x - 7.0, z: SH.z + 3.2, y: 2.0 };
mesh(rbox(7.6, 0.3, 3.0, 0.08), M.bench, { pos: [BENCH.x, BENCH.y, BENCH.z] });
for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.BoxGeometry(0.25, BENCH.y, 0.25), M.bench, { pos: [BENCH.x + sx * 3.5, BENCH.y / 2, BENCH.z + sz * 1.2] });
const ventTex = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#3a3e47'; g.fillRect(0, 0, w, h); g.fillStyle = '#23262c'; for (let x = 18; x < w * 0.62; x += 12) g.fillRect(x, 18, 6, h - 36); });
const serverGeo = rbox(2.8, 0.95, 2.2, 0.1);
function server(x, real) {
  const grp = new THREE.Group(); scene.add(grp); grp.position.set(x, BENCH.y + 0.15 + 0.475, BENCH.z + 0.1);
  mesh(serverGeo, real ? M.server : M.dummy, { parent: grp });
  if (real) { mesh(new THREE.PlaneGeometry(2.6, 0.8), new THREE.MeshStandardMaterial({ map: ventTex, roughness: 0.5 }), { pos: [0, 0, 1.11], parent: grp, cast: false });
    const led = new THREE.MeshStandardMaterial({ color: '#0c3a18', emissive: '#3dff7a', emissiveIntensity: 3 });
    for (let k = 0; k < 4; k++) mesh(new THREE.CircleGeometry(0.06, 10), led, { pos: [0.55 + k * 0.17, 0.18, 1.115], parent: grp, cast: false }); }
  return grp;
}
const REAL = server(BENCH.x - 1.6, true), DUMMY = server(BENCH.x + 1.6, false);
// v2: a lower shelf under the bench, two more dummies waiting on it (the stills' shot 4 had empty floor in its lower third)
mesh(rbox(7.2, 0.16, 2.5, 0.05), M.bench, { pos: [BENCH.x, 0.62, BENCH.z] });
for (const dx of [-1.8, 1.8]) mesh(serverGeo, M.dummy, { pos: [BENCH.x + dx, 0.7 + 0.475, BENCH.z + 0.05] });
const stickerTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h); const R = rng(21);
  g.fillStyle = '#1d1b19'; for (let x = 16; x < w - 16;) { const bw = 2 + Math.floor(R() * 5); g.fillRect(x, 14, bw, 66); x += bw + 2 + Math.floor(R() * 4); }
  g.font = '700 30px Inter'; g.textAlign = 'center'; g.fillText('SN 7C41-0921', w / 2, 114); });
const STICKER = mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map: stickerTex, roughness: 0.6, side: THREE.DoubleSide }), { cast: false });
const STK_A = new THREE.Vector3(BENCH.x - 1.6 + 0.2, BENCH.y + 0.15 + 0.955, BENCH.z + 0.35), STK_B = new THREE.Vector3(BENCH.x + 1.6 - 0.1, STK_A.y, STK_A.z);
const DRYER = new THREE.Group(); scene.add(DRYER);
{ mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.12, 18), M.chassis, { pos: [0, BENCH.y + 0.21, 0], parent: DRYER });
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), M.steel, { pos: [0, BENCH.y + 1.2, 0], parent: DRYER });
  const head = new THREE.Group(); DRYER.add(head); head.position.set(0, BENCH.y + 2.25, 0); DRYER.userData.head = head;
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.5, 20).rotateX(Math.PI / 2), M.dryer, { pos: [0, 0, -0.1], parent: head });
  mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.6, 18).rotateX(Math.PI / 2), M.dryer, { pos: [0, 0, 0.9], parent: head });
  mesh(new THREE.CircleGeometry(0.38, 20), M.dryerDark, { pos: [0, 0, -0.86], rot: [0, Math.PI, 0], parent: head, cast: false });
  mesh(rbox(0.36, 1.1, 0.42, 0.12), M.dryer, { pos: [0, -0.6, -0.25], rot: [-0.25, 0, 0], parent: head });
  mesh(rbox(0.18, 0.3, 0.12, 0.04), paint('#ffffff'), { pos: [0, -0.35, 0.0], parent: head, cast: false }); }
DRYER.position.set(BENCH.x - 2.6, 0, BENCH.z - 1.0);
const airTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const AIR = Array.from({ length: 14 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: airTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s); return s; });
// the row of dummies on the apron, and the inspectors' van
const DUMMIES = [], PALLETS = []; for (let row = 0; row < 5; row++) for (let i = 0; i < 2; i++) {
  const x = SH.x - 3.2 + i * 3.6, z = SH.z + SH.d / 2 + 14 - row * 2.8;
  PALLETS.push(mesh(rbox(2.9, 0.22, 2.3, 0.05), M.pallet, { pos: [x, 0.41, z] }));
  DUMMIES.push(mesh(serverGeo, M.dummy, { pos: [x, 0.52 + 0.475, z] })); }
const tickTex = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#2fae5a'; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
  g.strokeStyle = '#ffffff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(34, 66); g.lineTo(56, 88); g.lineTo(96, 42); g.stroke(); });
const TICKS = DUMMIES.map((d) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tickTex, transparent: true, depthWrite: false, fog: false })); s.position.set(d.position.x, 2.6, d.position.z); scene.add(s); return s; });
const VAN = checkVan(); VAN.root.position.set(SH.x + 5.4, 0.3, SH.z + SH.d / 2 + 15.5); VAN.root.rotation.y = Math.PI / 2;

// ------------------------------------------------------------------ light
const hemi = new THREE.HemisphereLight('#c3d6f6', '#8270a8', 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdcae', 2.3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#a493e0', 0.4); fill.position.set(30, 20, 40); scene.add(fill);
const shedL = new THREE.PointLight('#fff1d8', 0, 30, 1.4); shedL.position.set(SH.x - 2, 6, SH.z + 2); scene.add(shedL);
/** the shadow frustum follows the shot: centre and half-size */
function shadowsAt(cx, cz, e) {
  const c = sun.shadow.camera; if (c.right === e && sun.target.position.x === cx && sun.target.position.z === cz) return;
  Object.assign(c, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 260 }); c.updateProjectionMatrix();
  sun.target.position.set(cx, 0, cz); sun.position.set(cx - 40, 34, cz - 18);
}
const DUSK = (t) => t < T.s5 ? lerp(0, 0.25, t / T.s5) : lerp(0.25, 0.8, smooth((t - T.s5 - 0.8) / (T.end - T.s5 - 1.2)));
const fogA = C3('#aec4e8'), fogB = C3('#c39cc4');

const EV = { gate: T.s1 + 0.2, boomsDown: T.s1 + 1.3, brake: +(T.s1 + TRUCK.tb).toFixed(3), stop: +(T.s1 + TRUCK.ts).toFixed(3), depart: T.s2 + 0.3, dock: T.s3 - 0.4, sweep: T.s3 + 0.4,
  blow: T.s4 + 0.3, blowEnd: T.s5 + 0.2, peel: T.s4 + 1.2, stick: T.s4 + 2.6, tick0: T.s5 + 0.8, tickN: T.s5 + 2.4, sail: T.s5 + 0.6, rise: T.s5 + 2.1, arrive: T.end - 0.3 };
const tmpP = new THREE.Vector3(), tmpD = new THREE.Vector3();
function setWorld(t) {
  const d = DUSK(t);
  sun.intensity = lerp(2.3, 0.9, d); sun.color.copy(C3('#ffdcae')).lerp(C3('#ff8a6a'), d);
  hemi.intensity = lerp(1.05, 0.65, d); hemi.color.copy(C3('#c3d6f6')).lerp(C3('#9a8ccc'), d);
  SKY.material.color.copy(C3('#ffffff')).lerp(C3('#f0a8c0'), d * 0.8); CLOUDS.forEach((c) => c.material.color.copy(C3('#ffffff')).lerp(C3('#f4b0b8'), d));
  scene.environmentIntensity = lerp(0.55, 0.35, d); scene.fog.color.copy(fogA).lerp(fogB, d);
  seaTex.offset.set(t * 0.004, -t * 0.012);
  // 1 · the gate: lamps alternate, booms come down; the lorry brakes at them
  const on = t >= EV.gate, ph = Math.floor((t - EV.gate) * 3.2) % 2;
  BOOMS.forEach((b) => { b.lamps.forEach((m, k) => { m.emissiveIntensity = on ? (k === ph ? 7 : 0.15) : 0.1; }); b.pivot.rotation.z = -b.s * (Math.PI / 2) * (1 - ease.io((t - T.s1 - 0.3) / 1.0)); });
  bellL.intensity = on && t < T.s2 ? 20 : 0; bellL.position.x = ph ? 3 : -3;
  { const u = Math.max(0, t - T.s1); TRUCK.root.position.x = LANE; drive(TRUCK, zAt(TRUCK, u), zAt(TRUCK, 0), u); }
  // 2 + 5 · the ship along the route; the dashes drawn as far as it has been (all of them once it heads for China)
  const su = shipU(t); ROUTE.getPointAt(su, tmpP); ROUTE.getTangentAt(Math.min(0.999, Math.max(0.001, su)), tmpD);
  SHIP.root.position.set(tmpP.x, SEA_Y, tmpP.z); SHIP.root.rotation.y = Math.atan2(-tmpD.x, -tmpD.z);
  const moving = (t > T.s2 + 0.3 && t < T.s3 - 0.4) || (t > T.s5 + 0.6 && t < T.end - 0.3);
  SHIP.WAKE.material.opacity = moving ? 0.7 : 0; SHIP.body.rotation.z = Math.sin(t * 1.7) * 0.012; SHIP.body.position.y = Math.sin(t * 1.3) * 0.08;
  SHIP.A.visible = t < T.s3; SHIP.B.visible = t >= T.s3;
  const shown = t < T.s2 ? -1 : t < T.s5 ? su + 0.01 : 1.01; DASHES.forEach((m) => { m.visible = m.userData.u <= shown; });
  // 3 · the repack line: crates in from the left, plain boxes out to the right; the curtain strips swing as each passes
  ITEMS.forEach((it, i) => { const x = BX0 - 1.5 + ((i * LINE_GAP + (t - T.s3 + 30) * LINE_V) % (LINE_GAP * LINE_N));
    const y = BELT_Y + 0.95, z = BELT_Z, plain = x > SH.x;
    it.crate.position.set(x, y, z); it.box.position.set(x, y, z); it.crate.visible = !plain && x < BX1 + 1; it.box.visible = plain && x < BX1 + 1; });
  CURTAIN.forEach((c, k) => { const near = ITEMS.reduce((m, it) => Math.min(m, Math.abs(it.crate.position.x - c.userData.x)), 9); c.rotation.z = near < 1.4 ? -0.5 * (1 - near / 1.4) * (1 + 0.2 * Math.sin(k * 1.7 + t * 9)) : 0; });
  YARD.forEach((m) => { m.visible = t >= T.s3 && t < T.s4; });
  // 4 · the hair dryer: it blows from shot 4's start, the sticker peels off the real server, flutters, lands on the dummy
  { const head = DRYER.userData.head, aim = new THREE.Vector3().lerpVectors(STK_A, STK_B, 0.15);
    head.position.x = 0; DRYER.updateMatrixWorld(true); head.lookAt(aim); head.updateMatrixWorld(true); const blowing = t > T.s4 + 0.3 && t < T.s5 + 0.2;
    
    const nozzle = head.localToWorld(new THREE.Vector3(0, 0, 1.25));
    AIR.forEach((s, i) => { const k = ((t * 1.8 + i / AIR.length) % 1); s.material.opacity = blowing ? 0.55 * Math.sin(Math.PI * k) : 0;
      s.position.lerpVectors(nozzle, aim, k); s.position.y += Math.sin(i * 2.3 + t * 3) * 0.12 * k; s.scale.setScalar(0.25 + k * 0.6); });
    const kp = clamp((t - EV.peel) / (EV.stick - EV.peel));
    const FLAT = -Math.PI / 2;
    if (t < EV.peel) { STICKER.position.copy(STK_A); STICKER.position.y += 0.005; STICKER.rotation.set(FLAT, 0, 0.08); }
    else if (kp < 1) { const k = ease.io(kp); STICKER.position.lerpVectors(STK_A, STK_B, k); STICKER.position.y += 0.005 + Math.sin(Math.PI * k) * 1.4;
      STICKER.rotation.set(FLAT + Math.sin(kp * 13) * 0.7 * (1 - kp), Math.sin(kp * 9) * 0.5 * (1 - kp), 0.08 + Math.sin(kp * 11) * 0.8 * (1 - kp)); }
    else { STICKER.position.copy(STK_B); STICKER.position.y += 0.005; STICKER.rotation.set(FLAT, 0, -0.06); } }
  shedL.intensity = t >= T.s3 && t < T.s5 + 2 ? 26 : 0;
  // 5 · the inspection: a tick pops over each dummy in turn
  const staged = t >= T.s5; DUMMIES.forEach((m) => { m.visible = staged; }); PALLETS.forEach((m) => { m.visible = staged; });
  TICKS.forEach((s, i) => { const k = (t - EV.tick0 - i * (EV.tickN - EV.tick0) / TICKS.length) / 0.35; s.visible = k > 0; s.scale.setScalar(1.5 * ease.back(k)); });
}

// ------------------------------------------------------------------ the five shots
const FRONT = SH.z + SH.d / 2;
const SHOT = [
  { // 1 · 3/4 from behind-right: the lorry brakes at the export gate; the quay, the ship and the toy sea beyond
    t0: () => T.s1, sh: [0, -4, 40], fog: [140, 560], focus: (t) => V([LANE, 1, Math.max(zAt(TRUCK, t - T.s1), BARRIER_Z + 10)]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([11, 17.5, 78], [9, 15, 69], k)), at: V(lerp3([1.6, 6.2, -2], [1.6, 6.2, -4], k)), fov: 32 }; } },
  { // 2 · high over the map: the ship takes the long way round
    t0: () => T.s2, sh: [0, -82, 120], fog: [420, 1300], focus: () => V([0, 0, -82]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3(MAPCAM, [4, 244, 118], k)), at: V(lerp3([0, 0, -84], [0, 0, -86], k)), fov: 42 }; } },
  { // 3 · in the shed, front-on and a little above: the repack line
    t0: () => T.s3, sh: [SH.x, SH.z, 26], fog: [200, 900], focus: () => V([SH.x, BELT_Y + 1, BELT_Z]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([SH.x + 1.6, 9.8, FRONT + 15], [SH.x + 0.8, 9.0, FRONT + 13.5], k)), at: V(lerp3([SH.x, 1.3, BELT_Z + 1.6], [SH.x, 1.4, BELT_Z + 1.6], k)), fov: 40 }; } },
  { // 4 · the workbench, close: the dryer, the real server, the dummy, the sticker's flight
    t0: () => T.s4, sh: [BENCH.x, BENCH.z, 14], fog: [200, 900], focus: () => V([BENCH.x, BENCH.y + 0.8, BENCH.z + 1]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([BENCH.x + 0.1, BENCH.y + 6.4, BENCH.z + 12.8], [BENCH.x - 0.2, BENCH.y + 5.8, BENCH.z + 11.6], k)), at: V(lerp3([BENCH.x - 0.9, BENCH.y + 1.3, BENCH.z], [BENCH.x - 0.9, BENCH.y + 1.3, BENCH.z], k)), fov: 40 }; } },
  { // 5 · the dummies on the apron and the EXPORT CHECK van; then up and back: the ship heads for China
    t0: () => T.s5, sh: [SH.x - 10, SH.z - 25, 80], fog: [300, 1200], focus: (t) => V(lerp3([SH.x + 1, 1.0, FRONT + 10], [-10, 0, CN_Z + 16], smooth((t - T.s5 - 2.2) / 2.0))),
    cam(lt, d) { const k = ease.io((lt - 2.1) / (d - 2.3)); return { pos: V(lerp3([SH.x + 2.6, 17, FRONT + 46], [44, 180, -16], k)), at: V(lerp3([SH.x + 1.5, 0.8, FRONT + 10], [-8, 0, CN_Z + 10], k)), fov: 40 }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as The Panel and Cut First) */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = `800 30px Inter`;
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  setWorld(t);
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = SHOT_END(i) - t0;
  shadowsAt(...S.sh); scene.fog.near = S.fog[0]; scene.fog.far = S.fog[1];
  const L = S.cam(t - t0, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  tmp.copy(S.focus(t)).project(camera); const cy = clamp((tmp.y + 1) / 2, 0.15, 0.85);
  const dk = DUSK(t);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 26, tilt: 10, tiltCenter: cy, tiltBand: i === 1 ? 0.92 : i === 2 ? 0.8 : i === 4 ? lerp(0.62, 0.9, smooth((t - T.s5 - 2) / 1.5)) : 0.6,
    threshold: 0.95, knee: 0.45, bloomA: 0.4, bloomB: 0.35, exposure: lerp(1.04, 1.0, dk), vignette: 0.3, grain: 0.022, seed: Math.floor(t * 24),
    sat: 1.16, contrast: 1.06, toe: 0.0, lift: [0.012, 0.008, 0.034], gain: [1.03, 1.0, 0.97] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.2, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 1.2, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 0.45, T.s4 - 0.1));                                   // v2: the attribution lands with the caption
  tag(g2d, UI.tag4, tg(T.s4 + 0.45, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 1.4, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false); frame(T.s3 + 1, false);   // warm-up before the busy measure
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
