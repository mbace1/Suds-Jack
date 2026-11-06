// RIGHT OF WAY (RFH, Google · Hamina), v1 stills, 6 Nov. The sequel to Doodle 6 Trade Secret, in the approved 3D cars
// look that Cut First used (owner, 6 Nov: "The 3d Muhos video is doing well ... Maybe it's the art, maybe the topic, maybe
// both" — this is the "both" test). A tilt-shift toy world, soft anime grade, toy machines that roll and brake for real.
// Five shots, one thing happening in each:
//   1 · close on the one strip of forest left across the site: a flying squirrel glides tree to tree over the gap   "Hamina"
//   2 · high and wide: brown earthworks on both sides of the green strip, Google's halls behind, machines rolling in   "route"
//   3 · the look demo's beat: the machines brake at a barrier that has just arrived, STOP · PAUSE, PLEASE · LVV        "pause"
//   4 · from inside the strip, through the aspens: the machines stand still, the digger lowers its arm, WORK PAUSED    "paused"
//   5 · low beside the stopped digger: the squirrel glides back across, over the booms; then up over the whole site   "squirrel"
// Accuracy: LVV ASKED for the pause (a request); Google says it paused; LVV is examining the nature act; no ruling.
// Google named in plain type, no logo; no people. The squirrel is a toy's exaggeration in size (span ~2 m to read).
// 1080×1920, 30 fps. film.html?lang=en

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
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);
const V = (a) => new THREE.Vector3(...a), lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ------------------------------------------------------------------ renderer, scene, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const FOG = C3('#aec4e8'); scene.fog = new THREE.Fog(FOG, 130, 420); scene.background = FOG.clone();
const camera = new THREE.PerspectiveCamera(32, W / H, 0.5, 900);
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ materials
const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const M = {
  ground: matte('#8bb35c', { roughness: 1 }), shoulder: matte('#dccba4'), road: matte('#676d80', { roughness: 0.9 }),
  line: matte('#f6f1e2', { roughness: 0.7 }), mud: matte('#b48b66', { roughness: 1 }), track: matte('#c9a982', { roughness: 1 }), stump: matte('#e2c08e'),
  rubber: matte('#1c1c1f', { roughness: 0.7 }), hub: paint('#cfd2d6', { metalness: 0.4, roughness: 0.3 }),
  chassis: matte('#26272b', { roughness: 0.6 }), glass: paint('#1a2230', { roughness: 0.08, clearcoat: 1 }),
  bark: matte('#8a5d3c'), spruce: matte('#3f7a55'), spruce2: matte('#4f8c60'),
  aspenTrunk: null, birchLeaf: matte('#f2c44c'), birchLeaf2: matte('#eaa13f'), aspenLeaf: matte('#f0b33a'),
  steel: paint('#9aa3ad', { metalness: 0.5, roughness: 0.35 }), white: paint('#f2efe8'), post: paint('#e8e4da'),
  spoil: matte('#7a5a44', { roughness: 1 }), spoil2: matte('#5d4636', { roughness: 1 }), wet: matte('#9c7756', { roughness: 0.8 }),
  concrete: matte('#c9c6bf', { roughness: 0.95 }), rock: matte('#8e8f92', { roughness: 0.9 }),
  hall: matte('#e3e6e8', { roughness: 0.7 }), hallRoof: matte('#b4bac0', { roughness: 0.8 }), fan: paint('#8f979e', { roughness: 0.4, metalness: 0.3 }),
};
M.aspenTrunk = matte('#ffffff', { map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 512; const g = c.getContext('2d'); const R = rng(77);
  g.fillStyle = '#c9cdb6'; g.fillRect(0, 0, 128, 512); for (let i = 0; i < 46; i++) { const x = R() * 128, y = R() * 512, w = 6 + R() * 16; g.fillStyle = R() < 0.7 ? '#4a4a44' : '#8d917f'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - 2.5); g.lineTo(x + w, y); g.lineTo(x, y + 2.5); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })() });
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ------------------------------------------------------------------ the sky (as the look demo)
const skyTex = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#2f64c0'); gr.addColorStop(0.3, '#447fd6'); gr.addColorStop(0.44, '#5e97e2'); gr.addColorStop(0.478, '#8fb8ee'); gr.addColorStop(0.495, '#c4d6f0'); gr.addColorStop(0.5, '#aec4e8'); gr.addColorStop(1, '#aec4e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const SKY = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); SKY.renderOrder = -1;
scene.add(SKY);
const cloudTex = canvasTex(512, 256, (g, w, h) => { const r = rng(5);
  const B = []; for (let i = 0; i < 22; i++) { const x = 90 + r() * 330, rad = 22 + r() * 40; B.push([x, 168 - rad * 0.55 - Math.sin((x - 90) / 330 * Math.PI) * 55 - r() * 20, rad]); }
  g.save(); g.beginPath(); g.rect(0, 0, w, 176); g.clip();
  for (const [x, y, rad] of B) { g.fillStyle = 'rgba(178,184,226,0.96)'; g.beginPath(); g.arc(x, y + rad * 0.18, rad, 0, TAU); g.fill(); }
  for (const [x, y, rad] of B) { const gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, rad * 0.1, x, y - rad * 0.1, rad * 0.92);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(250,248,255,0.98)'); gr.addColorStop(1, 'rgba(232,230,250,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - rad * 0.1, rad * 0.92, 0, TAU); g.fill(); }
  g.restore(); });
const CLOUDS = [[-70, 50, -262, 120], [40, 66, -280, 150], [125, 46, -252, 100], [-10, 38, -244, 80], [-140, 62, -270, 110], [-200, 56, -150, 120], [200, 60, -160, 120], [-30, 58, 160, 140]].map(([x, y, z, w]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); m.position.set(x, y, z); m.lookAt(0, y, z > 0 ? -40 : 40); scene.add(m); return m; });

// ------------------------------------------------------------------ the world
// The expansion site is bare earth on BOTH sides of one strip of forest that still runs across it (the squirrels' route,
// x across the frame). The haul track runs along z and cuts a gap through the strip. Google's existing halls stand behind.
const ROAD_W = 7.5, BX = ROAD_W / 2 + 1.0, BARRIER_Z = -18;
const CZ = BARRIER_Z - 7.5, CHALF = 4.6, GAP = 4.7;                                  // the strip: z ∈ CZ ± CHALF, open where |x| < GAP
const SITE = { x0: -96, x1: 96, z0: 44, z1: -96 };                                    // the bare expansion area
const HALLS = { x0: -70, x1: 70, z0: -100, z1: -160 };                                // Google's existing campus
const HERO = [[-5.1, CZ + 2.4], [5.1, CZ + 2.4]];                                     // the two aspens either side of the gap
mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), M.ground, { cast: false });
[[-150, -225, 70, 9, '#4f8460'], [40, -255, 95, 11, '#5d8f6e'], [190, -230, 80, 10, '#4f8460'], [-60, -300, 120, 16, '#6f9a86'], [150, -310, 110, 14, '#6f9a86']].forEach(([x, z, r, h, c]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: c })); m.scale.set(r, h, r * 0.35); m.position.set(x, -1, z); scene.add(m); });
// the sea beyond the campus (Hamina is on the coast), a pale band at the horizon
mesh(new THREE.PlaneGeometry(900, 160).rotateX(-Math.PI / 2), matte('#9fb7cf', { roughness: 0.3 }), { pos: [0, 0.01, -300], cast: false });
// bare earth: the site, with the strip left standing (its floor stays green)
mesh(new THREE.PlaneGeometry(SITE.x1 - SITE.x0, SITE.z0 - SITE.z1).rotateX(-Math.PI / 2), M.mud, { pos: [(SITE.x0 + SITE.x1) / 2, 0.012, (SITE.z0 + SITE.z1) / 2], cast: false });
mesh(new THREE.PlaneGeometry(SITE.x1 - SITE.x0, CHALF * 2 + 1.2).rotateX(-Math.PI / 2), matte('#6f9a4e', { roughness: 1 }), { pos: [0, 0.016, CZ], cast: false });
mesh(new THREE.PlaneGeometry(HALLS.x1 - HALLS.x0, HALLS.z0 - HALLS.z1).rotateX(-Math.PI / 2), M.concrete, { pos: [0, 0.014, (HALLS.z0 + HALLS.z1) / 2], cast: false });
// the haul track: gravel, from the forest road through the site, through the gap in the strip, to the campus
mesh(new THREE.PlaneGeometry(ROAD_W + 1.6, 300).rotateX(-Math.PI / 2), M.track, { pos: [0, 0.022, 30], cast: false });
for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(0.5, 300).rotateX(-Math.PI / 2), matte('#b9976f', { roughness: 1 }), { pos: [s * 1.9, 0.026, 30], cast: false });
// churned ground: ruts and wet patches on both sides of the strip
{ const R = rng(19);
  for (let i = 0; i < 34; i++) { const x = (R() - 0.5) * 176, z = SITE.z1 + 6 + R() * (SITE.z0 - SITE.z1 - 12), a = R() * TAU, l = 10 + R() * 24;
    if (Math.abs(x) < 7 || Math.abs(z - CZ) < CHALF + 3) continue;
    for (const o of [-0.9, 0.9]) mesh(new THREE.PlaneGeometry(0.5, l).rotateX(-Math.PI / 2).rotateY(a), M.track, { pos: [x + Math.cos(a) * o, 0.02, z - Math.sin(a) * o], cast: false }); }
  for (let i = 0; i < 22; i++) { const x = (R() - 0.5) * 176, z = SITE.z1 + 4 + R() * (SITE.z0 - SITE.z1 - 8); if (Math.abs(x) < 7 || Math.abs(z - CZ) < CHALF + 2) continue;
    const p = mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), M.wet, { pos: [x, 0.018, z], cast: false }); p.scale.set(2 + R() * 4, 1, 1 + R() * 2.5); }
  // spoil heaps and rock piles: earthworks
  for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 170, z = SITE.z1 + 6 + R() * (SITE.z0 - SITE.z1 - 12);
    if (Math.abs(x) < 9 || Math.abs(z - CZ) < CHALF + 4 || (Math.abs(x) < 26 && z > BARRIER_Z - 2 && z < BARRIER_Z + 36)) continue;
    const m = mesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2), R() < 0.5 ? M.spoil : M.spoil2, { pos: [x, 0, z] }); m.scale.set(3 + R() * 4, 1.0 + R() * 1.4, 2 + R() * 3); }
  for (let i = 0; i < 10; i++) { const x = (R() - 0.5) * 160, z = SITE.z1 + 8 + R() * 60; if (Math.abs(x) < 9) continue;
    for (let k = 0; k < 5; k++) mesh(new THREE.IcosahedronGeometry(0.7 + R() * 0.6, 0), M.rock, { pos: [x + (R() - 0.5) * 3, 0.4, z + (R() - 0.5) * 3], rot: [R() * 3, R() * 3, 0] }); } }
// stumps where trees have already come out (fewer than Muhos: this is earthworks and tree removal, not a clear-cut)
{ const R = rng(7), S = [];
  for (let i = 0; i < 1500 && S.length < 230; i++) {
    const x = (R() - 0.5) * 186, z = SITE.z1 + 3 + R() * (SITE.z0 - SITE.z1 - 6);
    if (Math.abs(x) < 7 || Math.abs(z - CZ) < CHALF + 1.2) continue;
    if (Math.abs(x) < 14 && z > BARRIER_Z - 2 && z < BARRIER_Z + 8) continue;
    S.push([x, z, 0.65 + R() * 0.75, R() * TAU]); }
  const stumpGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9).translate(0, 0.27, 0), capGeo = new THREE.CircleGeometry(0.4, 9).rotateX(-Math.PI / 2).translate(0, 0.552, 0);
  const o = new THREE.Object3D(), a = new THREE.InstancedMesh(stumpGeo, M.bark, S.length), b = new THREE.InstancedMesh(capGeo, M.stump, S.length);
  S.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.setScalar(s); o.updateMatrix(); a.setMatrixAt(i, o.matrix); b.setMatrixAt(i, o.matrix); });
  a.castShadow = true; a.receiveShadow = true; b.receiveShadow = true; scene.add(a, b); }

// ------------------------------------------------------------------ Google's existing halls: long, pale, rows of fans on the roof
const winMat = new THREE.MeshStandardMaterial({ color: '#3a4250', emissive: '#ffe7b0', emissiveIntensity: 0.2 });
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 8.8], ['s4', 13.2], ['s5', 17.6], ['end', 22.4]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;
const FAM = LANG === 'ja' ? 'NotoSansJP-800' : 'Anton-400', WT = LANG === 'ja' ? '800 ' : '';
const fit = (g, text, fs, maxW, min = 36) => { g.font = `${WT}${fs}px ${FAM}`; while (g.measureText(text).width > maxW && fs > min) { fs -= 4; g.font = `${WT}${fs}px ${FAM}`; } return fs; };
for (const [x, w] of [[-44, 34], [0, 38], [44, 34]]) {
  const d = 46, h = 11, z = HALLS.z0 - 6 - d / 2;
  mesh(rbox(w, h, d, 0.6), M.hall, { pos: [x, h / 2, z] });
  mesh(new THREE.BoxGeometry(w - 1, 0.5, d - 1), M.hallRoof, { pos: [x, h + 0.2, z] });
  for (let i = 0; i < Math.floor(w / 4.2); i++) for (let j = 0; j < 7; j++) {
    const fx = x - w / 2 + 2.4 + i * 4.2, fz = z - d / 2 + 4 + j * 6.2;
    mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.9, 14), M.fan, { pos: [fx, h + 0.9, fz] });
    mesh(new THREE.CircleGeometry(1.0, 14).rotateX(-Math.PI / 2), M.chassis, { pos: [fx, h + 1.37, fz], cast: false }); }
  mesh(new THREE.PlaneGeometry(w - 4, 0.9), winMat, { pos: [x, 3.2, z + d / 2 + 0.02], cast: false });
}
const hallSignTex = canvasTex(1600, 200, (g, w, h) => { g.fillStyle = '#1f3b57'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, UI.site, 140, w - 90); g.fillText(UI.site, w / 2, h / 2 + 6); });
mesh(new THREE.PlaneGeometry(30, 3.75), new THREE.MeshStandardMaterial({ map: hallSignTex, roughness: 0.6 }), { pos: [0, 7.6, HALLS.z0 - 5.95], cast: false });

// ------------------------------------------------------------------ trees: spruce, and aspen (the squirrels' tree: they nest in old aspens)
const spruceGeo = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(2.1 - i * 0.55, 3.0, 7).translate(0, 1.8 + i * 1.7, 0)).concat([new THREE.CylinderGeometry(0.22, 0.28, 1.4, 6).translate(0, 0.7, 0)]).map((g) => g.toNonIndexed()));
const aspenTrunk = new THREE.CylinderGeometry(0.2, 0.3, 8.2, 7).translate(0, 4.1, 0);
const aspenCrown = mergeGeometries([[0, 8.6, 0, 1.7], [0.9, 7.7, 0.4, 1.2], [-0.9, 7.9, -0.3, 1.25], [0.2, 9.6, -0.2, 1.1]].map(([x, y, z, r]) => new THREE.IcosahedronGeometry(r, 0).translate(x, y, z).toNonIndexed()));
const inst = (geo, mat, list, k = 1) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
  list.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.set(s, s * k, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
{ const R = rng(31), spr = [], asp = [];
  // the forest around the site
  for (let i = 0; i < 2800; i++) {
    const x = (R() - 0.5) * 440, z = -240 + R() * 420;
    if (Math.abs(x) < ROAD_W / 2 + 3 && z > SITE.z1) continue;
    const e = 2 + R() * 3;
    if (x > SITE.x0 - e && x < SITE.x1 + e && z < SITE.z0 + e && z > SITE.z1 - e) continue;
    if (x > HALLS.x0 - 4 && x < HALLS.x1 + 4 && z < HALLS.z0 + 2 && z > HALLS.z1 - 6) continue;
    if (z < -235) continue;
    (R() < 0.75 ? spr : asp).push([x, z, 0.7 + R() * 0.75, R() * TAU]);
  }
  // the strip across the site: denser, three ragged rows, and the gap where the track goes through
  for (let x = SITE.x0 - 2; x < SITE.x1 + 2; x += 1.9 + R() * 1.2) for (let row = 0; row < 3; row++) {
    const xx = x + (R() - 0.5) * 1.2, z = CZ + (row - 1) * 3.0 + (R() - 0.5) * 1.4;
    if (Math.abs(xx) < GAP + 0.6) continue;
    if (HERO.some(([hx, hz]) => Math.hypot(xx - hx, z - hz) < 2.6)) continue;
    if (Math.abs(xx) < 12 && z > CZ + 1.2) continue;                                   // keep the two hero aspens clear in front
    (R() < 0.6 ? spr : asp).push([xx, z, 0.75 + R() * 0.6, R() * TAU]);
  }
  inst(spruceGeo, M.spruce, spr.filter((_, i) => i % 2)); inst(spruceGeo, M.spruce2, spr.filter((_, i) => !(i % 2)), 1.1);
  inst(aspenTrunk, M.aspenTrunk, asp); inst(aspenCrown, M.birchLeaf, asp.filter((_, i) => i % 2)); inst(aspenCrown, M.birchLeaf2, asp.filter((_, i) => !(i % 2))); }
// the two hero aspens either side of the gap: the squirrel's launch and landing trunks (tall clear trunks so it reads)
const HERO_S = 1.18;
HERO.forEach(([x, z], k) => { mesh(aspenTrunk, M.aspenTrunk, { pos: [x, 0, z] }).scale.setScalar(HERO_S); mesh(aspenCrown, k ? M.aspenLeaf : M.birchLeaf, { pos: [x, 0, z] }).scale.setScalar(HERO_S);
});
const trunkR = (y) => (0.3 - 0.1 * (y / (8.2 * HERO_S))) * HERO_S;

// ------------------------------------------------------------------ the barrier that arrives with the regulator's request (from shot 3)
const stripes = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d22d24'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
const boomMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
const BARRIER = new THREE.Group(); scene.add(BARRIER);
const BOOMS = [-1, 1].map((s) => {
  mesh(rbox(0.6, 1.4, 0.6, 0.14), M.post, { pos: [s * BX, 0.7, BARRIER_Z], parent: BARRIER });
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), M.post, { pos: [s * (BX + 0.75), 1.7, BARRIER_Z], parent: BARRIER });
  const head = new THREE.Group(); BARRIER.add(head); head.position.set(s * (BX + 0.75), 3.3, BARRIER_Z + 0.06);
  mesh(rbox(2.2, 1.0, 0.18, 0.1), matte('#202226'), { parent: head });
  const lamps = [-1, 1].map((k) => { const m = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2a18', emissiveIntensity: 0.1 });
    mesh(new THREE.CircleGeometry(0.34, 20), m, { pos: [k * 0.6, 0, 0.1], parent: head, cast: false });
    mesh(new THREE.CircleGeometry(0.34, 20), m, { pos: [k * 0.6, 0, -0.1], rot: [0, Math.PI, 0], parent: head, cast: false }); return m; });
  const pivot = new THREE.Group(); BARRIER.add(pivot); pivot.position.set(s * BX, 1.25, BARRIER_Z);
  const len = BX - 0.15;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 12).rotateZ(Math.PI / 2), boomMat, { pos: [-s * len / 2, 0, 0], parent: pivot });
  return { s, pivot, lamps, len };
});
const bellL = new THREE.PointLight('#ff3a20', 0, 16, 1.8); bellL.position.set(0, 3.0, BARRIER_Z + 1.5); scene.add(bellL);
// WORK PAUSED: a placard hung from the left boom once it is down (Google's own word: "keskeyttäneet", paused)
const pausedTex = canvasTex(640, 220, (g, w, h) => { g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1d1b19'; g.lineWidth = 14; g.strokeRect(7, 7, w - 14, h - 14);
  g.fillStyle = '#1d1b19'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, UI.paused, 150, w - 70); g.fillText(UI.paused, w / 2, h / 2 + 6); });
const PLACARD = new THREE.Group(); BOOMS[0].pivot.add(PLACARD); PLACARD.position.set(BOOMS[0].len / 2, -0.75, 0.0);
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 4), M.chassis, { pos: [s * 0.9, 0.42, 0], parent: PLACARD, cast: false });
for (const r of [0, Math.PI]) mesh(new THREE.PlaneGeometry(2.6, 0.9), new THREE.MeshStandardMaterial({ map: pausedTex, roughness: 0.7 }), { pos: [0, 0, r ? -0.01 : 0.01], rot: [0, r, 0], parent: PLACARD, cast: false });
// the STOP sign, right of the track at the barrier: STOP, then the request and who made it
const signTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c92a22'; g.lineWidth = 34; g.strokeRect(17, 17, w - 34, h - 34);
  g.fillStyle = '#c92a22'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `330px Anton-400`; g.fillText(UI.stop || 'STOP', w / 2, 380);
  fit(g, UI.halt, 112, w - 110); g.fillStyle = '#1d1b19'; g.fillText(UI.halt, w / 2, 545);
});
const SIGN = new THREE.Group(); BARRIER.add(SIGN); SIGN.position.set(BX + 2.9, 0, BARRIER_Z + 1.4); SIGN.rotation.y = -0.2;
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), M.steel, { pos: [s * 2.6, 1.7, -0.12], parent: SIGN });
mesh(rbox(6.6, 4.2, 0.22, 0.08), M.white, { pos: [0, 4.6, -0.1], parent: SIGN });
mesh(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 }), { pos: [0, 4.6, 0.02], parent: SIGN, cast: false });

// ------------------------------------------------------------------ the flying squirrel: Master System register, a flat fill in a hard dark line
// One outline: ears, the big head, the skin stretched square between wrists and ankles, the flat broad tail.
const SQ_PTS = [[0, 1.36], [0.1, 1.38], [0.17, 1.53], [0.28, 1.38], [0.35, 1.12], [0.25, 0.86], [0.99, 0.76], [0.82, 0.14], [0.92, -0.52], [0.27, -0.40],
  [0.17, -0.58], [0.28, -1.0], [0.25, -1.36], [0.12, -1.56], [0, -1.61]];
const sqShape = (k = 1) => { const pts = [...SQ_PTS, ...SQ_PTS.slice(0, -1).reverse().map(([x, y]) => [-x, y]).slice(0, -1)].map(([x, y]) => [x * k, y * k - (k - 1) * 0.0]);
  const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.closePath(); return sh; };
// a warning sign with the same silhouette, by the barrier (a toy's joke, like a deer-crossing sign)
const crossTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#c92a22'; g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w - 22, h - 60); g.lineTo(22, h - 60); g.closePath(); g.fill();
  g.fillStyle = '#f6f3ea'; g.beginPath(); g.moveTo(w / 2, 82); g.lineTo(w - 74, h - 92); g.lineTo(74, h - 92); g.closePath(); g.fill();
  g.save(); g.translate(w / 2, h * 0.56); g.rotate(-0.5); g.scale(78, -78); g.fillStyle = '#1d1b19'; g.beginPath();
  const pts = [...SQ_PTS, ...SQ_PTS.slice(0, -1).reverse().map(([x, y]) => [-x, y]).slice(0, -1)]; g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); g.restore(); });
const CROSS = new THREE.Group(); BARRIER.add(CROSS); CROSS.position.set(-(BX + 3.0), 0, BARRIER_Z + 1.3); CROSS.rotation.y = 0.25;
mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 8), M.steel, { pos: [0, 1.8, -0.1], parent: CROSS });
mesh(new THREE.PlaneGeometry(3.0, 3.0), new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.55, transparent: true, alphaTest: 0.5 }), { pos: [0, 4.4, 0.02], parent: CROSS, cast: false });
const crossBack = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#7d848c'; g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w - 22, h - 60); g.lineTo(22, h - 60); g.closePath(); g.fill(); });
mesh(new THREE.PlaneGeometry(3.0, 3.0), new THREE.MeshStandardMaterial({ map: crossBack, roughness: 0.6, transparent: true, alphaTest: 0.5 }), { pos: [0, 4.4, -0.02], rot: [0, Math.PI, 0], parent: CROSS, cast: false });

const SQ = new THREE.Group(); scene.add(SQ); SQ.rotation.order = 'YXZ';
{ const fur = new THREE.MeshStandardMaterial({ color: '#c9c3b4', roughness: 0.75, emissive: '#2a2824', emissiveIntensity: 1 });
  const ink = new THREE.MeshStandardMaterial({ color: '#232229', roughness: 0.6 });
  const bodyG = new THREE.ExtrudeGeometry(sqShape(1), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 }).translate(0, 0, -0.06).rotateX(-Math.PI / 2);
  const lineG = new THREE.ExtrudeGeometry(sqShape(1.1), { depth: 0.07, bevelEnabled: false }).translate(0, 0.03, -0.035).rotateX(-Math.PI / 2);
  mesh(bodyG, fur, { parent: SQ, cast: true }); mesh(lineG, ink, { parent: SQ, cast: false });
  // the darker back stripe along the spine, and the big black eyes (the species' signature), on the top face
  mesh(new THREE.PlaneGeometry(0.34, 1.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b2afa5', roughness: 0.8, emissive: '#2a2925', emissiveIntensity: 1 }), { pos: [0, 0.112, -0.1], parent: SQ, cast: false });
  for (const s of [-1, 1]) {
    mesh(new THREE.CircleGeometry(0.13, 18).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.2 }), { pos: [s * 0.15, 0.115, -1.06], parent: SQ, cast: false });
    mesh(new THREE.CircleGeometry(0.035, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff' }), { pos: [s * 0.15 - 0.04, 0.118, -1.1], parent: SQ, cast: false });
    mesh(new THREE.CircleGeometry(0.12, 18).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0d0d10', roughness: 0.2 }), { pos: [s * 0.15, -0.115, -1.06], parent: SQ, cast: false }); } }
const SQ_SCALE = 1.5; SQ.scale.setScalar(SQ_SCALE);
/** the glide: from one trunk to the other, a shallow sagging arc, a flare at the end and a landing head-up on the bark */
function glide(from, to, t0, dur) { return { from, to, t0, dur }; }
const GL1 = glide(0, 1, 0.9, 1.75);           // shot 1: left aspen → right aspen (shot-local seconds)
const GL2 = glide(0, 1, 0.35, 1.7);           // shot 5: left → right again, over the booms (the camera is in the left lane)
const clingAt = (k, y) => { const [x, z] = HERO[k], r = trunkR(y) + 0.2; return [x - Math.sign(x) * 0.1, y, z + r]; };   // on the trunk's camera face
const LAUNCH_Y = [8.0, 7.8], LAND_Y = [3.4, 3.2];
function squirrelAt(t) {
  const u1 = t - T.s1, u5 = t - T.s5;
  let G = null, u = 0;
  if (t < T.s5) { G = GL1; u = u1; } else { G = GL2; u = u5; }
  const a = clingAt(G.from, LAUNCH_Y[G.from]), b = clingAt(G.to, LAND_Y[G.to]);
  const k = clamp((u - G.t0) / G.dur), dir = Math.sign(b[0] - a[0]);
  if (u < G.t0) {                                                                    // clinging, head up, a little breathing
    SQ.position.set(...a); SQ.rotation.set(Math.PI / 2, 0, Math.sin(u * 3) * 0.04); return; }
  if (k >= 1) { SQ.position.set(...b); SQ.rotation.set(Math.PI / 2, 0, 0); return; }
  const e = k;                                                                       // nearly constant speed in a glide
  const x = lerp(a[0], b[0], e), y = lerp(a[1], b[1], e) - Math.sin(Math.PI * e) * 0.7 + (e > 0.82 ? smooth((e - 0.82) / 0.18) * 0.4 : 0);
  const z = lerp(a[2], b[2], e) + Math.sin(Math.PI * e) * 1.6;
  SQ.position.set(x, y, z);
  const launch = smooth(k / 0.12), flare = smooth((k - 0.8) / 0.2);
  const yaw = lerp(0, -dir * Math.PI / 2, launch) * (1 - flare);
  const pitch = lerp(Math.PI / 2, -0.22, launch) * (1 - flare) + Math.PI / 2 * flare;
  // bank toward the camera so the silhouette reads: its back to a camera above (shot 1), its belly to one below (shot 5)
  const bank = (G === GL1 ? -0.62 : 0.72) * dir * smooth(k / 0.2) * (1 - flare);
  SQ.rotation.set(pitch, yaw, bank);
}

// ------------------------------------------------------------------ the toys: a digger, a tipper truck, a van
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
/** a tracked digger: two rubber tracks, a yellow house that could slew, a cab, and a two-part arm with a bucket */
function digger(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const L = 7.2;
  mesh(new THREE.PlaneGeometry(4.4, 6.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0.4], parent: root, cast: false, recv: false });
  for (const s of [-1, 1]) {
    mesh(rbox(0.9, 0.95, 4.8, 0.42), M.rubber, { pos: [s * 1.2, 0.48, 0.4], parent: body });
    for (const z of [-1.4, -0.3, 0.8, 1.9]) mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 12).rotateZ(Math.PI / 2), M.hub, { pos: [s * 1.67, 0.46, z + 0.15], parent: body, cast: false }); }
  mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.3, 16), M.chassis, { pos: [0, 1.08, 0.4], parent: body });
  const house = new THREE.Group(); body.add(house); house.position.set(0, 1.2, 0.4);
  const yellow = paint(color), dark = paint('#3b3a36');
  mesh(rbox(2.6, 1.15, 3.0, 0.22), yellow, { pos: [0.1, 0.62, 0.35], parent: house });
  mesh(rbox(2.6, 0.95, 0.9, 0.2), dark, { pos: [0.1, 0.58, 2.05], parent: house });
  mesh(rbox(1.2, 1.6, 1.35, 0.14), yellow, { pos: [-0.62, 1.95, -0.6], parent: house });
  mesh(rbox(1.0, 1.0, 0.06, 0.03), M.glass, { pos: [-0.62, 2.1, -1.29], parent: house, cast: false });
  for (const s of [-1, 1]) mesh(rbox(0.06, 0.95, 1.05, 0.03), M.glass, { pos: [-0.62 + s * 0.61, 2.1, -0.6], parent: house, cast: false });
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8), M.chassis, { pos: [0.85, 1.6, 1.3], parent: house });
  const boom = new THREE.Group(); house.add(boom); boom.position.set(0.55, 1.05, -0.95);
  mesh(rbox(0.44, 0.55, 3.8, 0.12), yellow, { pos: [0, 0, -1.9], parent: boom });
  const elbow = new THREE.Group(); boom.add(elbow); elbow.position.set(0, 0, -3.75);
  mesh(rbox(0.36, 0.44, 2.7, 0.1), yellow, { pos: [0, 0, -1.3], parent: elbow });
  const wrist = new THREE.Group(); elbow.add(wrist); wrist.position.set(0, 0, -2.6);
  mesh(rbox(1.15, 0.85, 0.7, 0.12), dark, { pos: [0, -0.2, -0.3], parent: wrist });
  for (let i = 0; i < 4; i++) mesh(new THREE.ConeGeometry(0.07, 0.3, 5).rotateX(-Math.PI / 2), M.steel, { pos: [-0.42 + i * 0.28, -0.55, -0.68], parent: wrist, cast: false });
  const { brake, head } = lights(body, 2.4, 1.15, 2.85, -2.05);
  return { root, body, wheels: [], r: 0.45, L, brake, head, dip: 0.025, glow: glowAt(root, 3.3), boom, elbow, wrist, front: 3.9, back: 3.3 };
}
function tipper(cabColor) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.62, L = 9.4;
  mesh(new THREE.PlaneGeometry(4.2, L + 1.6).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(2.3, 0.45, L, 0.18), M.chassis, { pos: [0, 0.95, 0], parent: body });
  mesh(profile([[-1.25, 0.95], [1.15, 0.95], [1.3, 1.25], [1.3, 2.15], [0.95, 3.2], [-1.25, 3.25]], 2.5, 0.2), paint(cabColor), { pos: [0, 0, -L / 2 + 1.3], parent: body });
  mesh(profile([[1.0, 2.25], [0.78, 3.0], [0.05, 3.0], [0.05, 2.25]], 2.56, 0.05), M.glass, { pos: [0, 0, -L / 2 + 1.3], parent: body, cast: false });
  mesh(rbox(2.6, 0.5, 0.5, 0.2), M.chassis, { pos: [0, 1.15, -L / 2 + 0.05], parent: body });
  mesh(profile([[-2.9, 1.25], [3.1, 1.25], [3.3, 3.05], [-3.15, 3.05]], 2.6, 0.16), paint('#8d949c', { metalness: 0.3 }), { pos: [0, 0, 1.4], parent: body });
  mesh(rbox(2.2, 0.1, 5.6, 0.04), matte('#4b4e54'), { pos: [0, 3.04, 1.4], parent: body, cast: false });
  const { brake } = lights(body, 2.4, 1.15, L / 2, -L / 2);
  const wheels = [-L / 2 + 1.3, 1.4, 3.0].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.5, root, s * 1.12, z)));
  return { root, body, wheels, r, L, brake, dip: 0.045, glow: glowAt(root, L / 2 + 0.8), front: L / 2, back: L / 2 };
}
function van(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.46, L = 5.2;
  mesh(new THREE.PlaneGeometry(3, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  const sl = sill(-2.45, 2.75, 0.36, [[-1.55, 0.46], [1.85, 0.46]], 0.6).reverse();
  mesh(profile([...sl, [-2.5, 0.5], [-2.5, 2.35], [1.7, 2.4], [2.45, 1.55], [2.8, 1.25], [2.8, 0.5]].reverse(), 2.0, 0.2), paint(color), { parent: body });
  mesh(profile([[2.38, 1.55], [1.66, 2.22], [1.05, 2.22], [1.05, 1.55]], 2.06, 0.04), M.glass, { parent: body, cast: false });
  mesh(rbox(1.6, 0.18, 0.06, 0.04), paint('#e2512d'), { pos: [0, 1.25, 2.45 + 0.13], parent: body, cast: false });
  const { brake } = lights(body, 2.0, 1.05, 2.45 + 0.12, -2.75 - 0.12);
  const wheels = [-1.85, 1.55].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.34, root, s * 0.95, z)));
  return { root, body, wheels, r, L, brake, dip: 0.06, glow: glowAt(root, L / 2 + 0.8), front: 2.8, back: 2.5 };
}

// the convoy rolls in from the forest road and brakes at the barrier (stop times are shot-3-local; shot 2 sees it coming)
const LANE = 1.85, V0 = 7.5, DEC = 5.0;
const DIG = digger('#f2b42b');
const CONVOY = [DIG, tipper('#d63b2c'), van('#f1eee6')];
{ let z = BARRIER_Z + 2.2; const stops = [1.9, 2.5, 3.1];
  CONVOY.forEach((v, i) => { z += v.front; v.zStop = z; z += v.back + 1.6; v.ts = stops[i]; v.tb = v.ts - V0 / DEC; v.dB = V0 * V0 / (2 * DEC); }); }
function zAt(v, u) {
  if (u >= v.ts) return v.zStop;
  if (u >= v.tb) { const k = v.ts - u; return v.zStop + 0.5 * DEC * k * k; }
  return v.zStop + v.dB + V0 * (v.tb - u);
}
function drive(v, z, z0, u, d) {
  v.root.position.z = z;
  const roll = Math.abs(z0 - z) / v.r; v.wheels.forEach((w) => { w.rotation.x = -roll; });
  let pitch = 0;
  if (u >= v.tb && u < v.ts) pitch = -v.dip * smooth((u - v.tb) / 0.22);
  else if (u >= v.ts) { const k = u - v.ts; pitch = -v.dip * Math.exp(-5.5 * k) * Math.cos(13 * k); }
  v.body.rotation.x = pitch; v.body.position.y = pitch * 0.6;
  const braking = u >= v.tb ? clamp((u - v.tb) / 0.08) : 0;
  v.brake.emissiveIntensity = lerp(0.3 + 0.6 * d, lerp(6.5, 5.2, clamp((u - v.ts) / 0.6)), braking);
  v.glow.intensity = braking * lerp(8, 26, d);
}
/** the digger's arm: carried high while it drives, lowered to rest on the ground once the work has paused */
function armPose(k) { DIG.boom.rotation.x = lerp(0.62, 0.15, k); DIG.elbow.rotation.x = lerp(-1.95, -1.85, k); DIG.wrist.rotation.x = lerp(-0.9, -0.6, k); }

// ------------------------------------------------------------------ light: afternoon through gold to dusk across the film
const hemi = new THREE.HemisphereLight('#c3d6f6', '#8270a8', 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdcae', 2.3); sun.position.set(-40, 26, -28); sun.target.position.set(0, 0, -6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#a493e0', 0.4); fill.position.set(30, 20, 40); scene.add(fill);
function shadowsFor(wide) {
  const c = sun.shadow.camera, e = wide ? 130 : 40, cz = wide ? -40 : BARRIER_Z - 2;
  if (c.right === e && sun.target.position.z === cz) return;
  Object.assign(c, { left: -e, right: e, top: e, bottom: -e }); c.updateProjectionMatrix();
  sun.target.position.set(wide ? -6 : -2, 0, cz); sun.position.set(sun.target.position.x - 40, 26, cz - 22);
}
const DUSK = (t) => t < T.s3 ? 0 : t < T.s5 ? lerp(0, 0.4, (t - T.s3) / (T.s5 - T.s3)) : lerp(0.4, 1, smooth((t - T.s5 - 0.8) / (T.end - T.s5 - 1.4)));
const fogA = C3('#aec4e8'), fogB = C3('#c39cc4');
const EV = {
  launch1: T.s1 + GL1.t0, land1: T.s1 + GL1.t0 + GL1.dur, barrier: T.s3, gate: T.s3 + 0.2,
  ...Object.fromEntries(CONVOY.flatMap((v, i) => [['brake' + i, +(T.s3 + v.tb).toFixed(3)], ['stop' + i, +(T.s3 + v.ts).toFixed(3)]])),
  rest: T.s4 + 0.7, launch2: T.s5 + GL2.t0, land2: T.s5 + GL2.t0 + GL2.dur, rise: T.s5 + 2.4,
};
function setWorld(t) {
  const d = DUSK(t);
  sun.intensity = lerp(2.3, 0.75, d); sun.color.copy(C3('#ffdcae')).lerp(C3('#ff8a6a'), d);
  hemi.intensity = lerp(1.05, 0.6, d); hemi.color.copy(C3('#c3d6f6')).lerp(C3('#9a8ccc'), d);
  SKY.material.color.copy(C3('#ffffff')).lerp(C3('#f0a8c0'), d * 0.8); CLOUDS.forEach((c) => c.material.color.copy(C3('#ffffff')).lerp(C3('#f4b0b8'), d));
  scene.environmentIntensity = lerp(0.55, 0.3, d); scene.fog.color.copy(fogA).lerp(fogB, d);
  winMat.emissiveIntensity = lerp(0.3, 2.4, d);
  squirrelAt(t);
  // the barrier arrives with the request (shot 3): lamps alternate, booms come down, WORK PAUSED hangs from shot 4
  BARRIER.visible = t >= T.s3;
  const ug = t - T.s3, on = t >= EV.gate, ph = Math.floor((t - EV.gate) * 3.2) % 2, quiet = t >= T.s4 + 1.2;
  BOOMS.forEach((b) => { b.lamps.forEach((m, k) => { m.emissiveIntensity = on && !quiet ? (k === ph ? 7 : 0.15) : on ? 0.6 : 0.1; });
    b.pivot.rotation.z = -b.s * (Math.PI / 2) * (1 - ease.io((ug - 0.4) / 1.0)); });
  bellL.intensity = on && !quiet ? 22 * (0.6 + 0.4 * d) : 0; bellL.position.x = ph ? 3 : -3;
  PLACARD.visible = t >= T.s4; PLACARD.rotation.x = t >= T.s4 ? Math.sin((t - T.s4) * 4) * 0.12 * Math.exp(-(t - T.s4) * 1.5) : 0;
  // the convoy: seen coming in shot 2, braking at the barrier in shot 3, standing still after
  for (const v of CONVOY) { v.root.visible = t >= T.s2; v.root.position.x = LANE; const u = t - T.s3; drive(v, zAt(v, u), zAt(v, -6), u, d); }
  armPose(smooth((t - EV.rest) / 1.6));
}

// ------------------------------------------------------------------ the five shots
const sqPos = new THREE.Vector3();
const SHOT = [
  { // 1 · from above and to the right: both aspens, the squirrel's back as it glides down across the gap, the halls behind
    t0: () => T.s1, wide: false, focus: () => SQ.position.clone(),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([3.6, 14.0, CZ + 31], [3.0, 13.2, CZ + 28], k)), at: V(lerp3([-0.6, 4.4, CZ + 2.4], [-0.4, 4.2, CZ + 2.4], k)), fov: 40 }; } },
  { // 2 · high and wide: the strip with its gap, bare ground both sides, the halls above, the machines rolling in below
    t0: () => T.s2, wide: true, focus: () => V([0, 0, CZ]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([8, 66, 60], [6, 60, 52], k)), at: V(lerp3([0, 0, -29], [0, 0, -31], k)), fov: 40 }; } },
  { // 3 · the look demo's view: 3/4 from behind-right, the convoy stopping at the barrier, the strip behind it
    t0: () => T.s3, wide: false, focus: (t) => V([LANE, 1, Math.max(zAt(CONVOY[0], t - T.s3), BARRIER_Z + 6)]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([12, 16.5, 50], [10, 14.5, 42], k)), at: V(lerp3([1.0, 4.2, -22], [1.0, 4.4, -24], k)), fov: 32 }; } },
  { // 4 · from inside the strip, between the aspens: the machines stand still, the digger lowers its arm, WORK PAUSED
    t0: () => T.s4, wide: false, focus: () => V([LANE, 1.5, BARRIER_Z + 5]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-5.2, 4.6, CZ - 4.5], [-4.6, 4.2, CZ - 3.0], k)), at: V(lerp3([-0.4, 1.1, BARRIER_Z + 6], [-0.2, 1.0, BARRIER_Z + 6.5], k)), fov: 40 }; } },
  { // 5 · low in the empty lane, the stopped digger cropped at the right edge: the squirrel glides back across, then up and back
    t0: () => T.s5, wide: true, focus: (t) => t < EV.rise ? SQ.position.clone() : V(lerp3([0, 4, CZ], [-4, 0, -30], smooth((t - EV.rise) / 1.5))),
    cam(lt, d) { const k = ease.io((lt - 2.4) / (d - 2.5)); return { pos: V(lerp3([-9.5, 2.6, BARRIER_Z + 20], [16, 44, 54], k)), at: V(lerp3([1.0, 5.4, CZ + 2.4], [-4, 0, -40], k)), fov: lerp(40, 40, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as The Panel and Cut First) */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  const face = LANG === 'ja' ? 'NotoSansJP-800' : 'Inter';
  g.save(); g.globalAlpha = a; g.font = `800 30px ${face}`;
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px ${face}`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  setWorld(t);
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = SHOT_END(i) - t0;
  shadowsFor(S.wide);
  const L = S.cam(t - t0, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  tmp.copy(S.focus(t)).project(camera); const cy = clamp((tmp.y + 1) / 2, 0.15, 0.85);
  const dk = DUSK(t);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 26, tilt: 10, tiltCenter: cy, tiltBand: S.wide ? 0.5 : 0.62,
    threshold: 0.95, knee: 0.45, bloomA: 0.4, bloomB: 0.35, exposure: lerp(1.04, 1.0, dk), vignette: 0.3, grain: 0.022, seed: Math.floor(t * 24),
    sat: 1.16, contrast: 1.06, toe: 0.0, lift: [0.012, 0.008, 0.034], gain: [1.03, 1.0, 0.97] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 2.6, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 1.6, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 2.2, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 1.2, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 2.4, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false); frame(T.s3 + 1, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
