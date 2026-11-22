// BE PREPARED (RFH, Coxon 18 · the US prepper boom), 3D v1 stills, 22 Nov. Owner, 22 Nov: "How about prepping in the US?", then
// "Maybe show bunker footage. A bit like fallout vibe". See plan/films/52-be-prepared.md.
// LOOK: the mid-century civil-defence era — a corrugated steel shelter tube under a backyard, caged amber bulbs against teal steel,
// canned rations, a round-cornered TV, the yellow-and-black shelter sign. ORIGINAL: nothing from the Fallout games.
// DEVICE: one set that fills up beat by beat; the TV carries the news; the last shot climbs the ladder and the hatch shuts.
//   1 · TV     the shelter dark; the bulbs buzz on; the TV: GROUND STOP, a departures board of CANCELLED            "grounded"
//   2 · DOWN   the TV: SERVICE UNAVAILABLE; cans drop onto the shelves, row by row                                "Down"
//   3 · TUBE   a long dolly down the tube: bunks, water, more shelves; the TV: 1 A YEAR → 1 A DAY                   "one a day"
//   4 · GEN    the generator coughs and runs; the bulbs steady; the TV: GENERATORS · SOLD OUT                       "selling out"
//   5 · HATCH  the TV prints the Vice President's line; the camera climbs the ladder; daylight, then the hatch SHUTS  "prepared"
// No faces, no people, no logos. 1080×1920, 30 fps.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from '../welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff'], ['Caveat-600', 'Caveat-600.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, (fam === 'Anton-400' || fam === 'Caveat-600') ? {} : { weight: '100 900' }); document.fonts.add(await f.load()); }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const ENV = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.0], ['s3', 8.0], ['s4', 12.6], ['s5', 16.4], ['end', 22.6]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { lights: T.s1 + 0.35, cx: popT('ground'), down: popT('outage'), cans: T.s2 + 0.5, aday: popT('bunker'), gen: popT('gen') - 0.35, sold: popT('gen'),
  quote: T.s5 + 0.3, climb: popT('vp') - 0.6, shut: T.end - 1.0 };
const cueNames = ['lights', 'cx', 'down', 'cans', 'aday', 'gen', 'sold', 'quote', 'shut'];
const TAGS = [['tag1', T.s1 + 1.6, T.s2 - 0.1], ['tag2', EV.down + 0.5, T.s3 - 0.1], ['tag3', EV.aday + 0.4, T.s4 - 0.1], ['tag4', EV.sold + 0.4, T.s5 - 0.1], ['tag5', T.s5 + 1.0, EV.shut]];

const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));

// ------------------------------------------------------------------ the shelter: a corrugated steel tube, 2.4 m across, 10 m long
const S = new THREE.Scene(); S.background = C3('#020304'); S.environment = ENV; S.environmentIntensity = 0.08;
const RAD = 1.2, LEN = 10;
const corrN = canvasTex(64, 512, (g, w, h) => { for (let y = 0; y < h; y++) { const v = 128 + 110 * Math.sin(y / h * TAU * 24); g.fillStyle = `rgb(128,${v | 0},255)`; g.fillRect(0, y, w, 1); } });
corrN.colorSpace = THREE.NoColorSpace; corrN.wrapS = corrN.wrapT = THREE.RepeatWrapping; corrN.repeat.set(6, 1);
const rust = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#5f7672'; g.fillRect(0, 0, w, h); const R = rng(3); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,80,50' : '30,40,40'},${R() * 0.18})`; g.beginPath(); g.arc(R() * w, R() * h, 2 + R() * 18, 0, TAU); g.fill(); } });
rust.wrapS = rust.wrapT = THREE.RepeatWrapping; rust.repeat.set(4, 2);
const tube = mesh(new THREE.CylinderGeometry(RAD, RAD, LEN, 64, 1, true), std('#ffffff', { map: rust, normalMap: corrN, normalScale: new THREE.Vector2(0.9, 0.9), metalness: 0.55, roughness: 0.5, side: THREE.BackSide }),
  { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -LEN / 2 + 1], parent: S, cast: false });
const floorT = canvasTex(256, 1024, (g, w, h) => { g.fillStyle = '#9c7a4e'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 256) { g.fillStyle = `rgba(0,0,0,.5)`; g.fillRect(0, y, w, 3); } g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(w / 2, 0, 3, h); const R = rng(9); for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '90,64,40' : '30,20,12'},${R() * 0.25})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 6 + R() * 30); } });
mesh(new THREE.PlaneGeometry(1.9, LEN), std('#ffffff', { map: floorT, roughness: 0.8 }), { rot: [-Math.PI / 2, 0, 0], pos: [0, -0.72, -LEN / 2 + 1], parent: S });
// the far end wall, the near end wall with the ladder and the hatch above it
const wallM = std('#56706a', { roughness: 0.6, metalness: 0.5, normalMap: corrN });
mesh(new THREE.CircleGeometry(RAD, 48), wallM, { pos: [0, 0, -LEN + 1.01], parent: S, cast: false });
// the shelter sign (civil-defence: three yellow triangles in a black circle, a yellow plate)
const tarpT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#2d5fa8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < w; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } });
const tarp = mesh(new THREE.PlaneGeometry(2.0, 1.9, 20, 20), std('#ffffff', { map: tarpT, roughness: 0.6 }), { pos: [0, -0.1, -LEN + 1.08], parent: S, cast: false });
{ const p_ = tarp.geometry.attributes.position; for (let i = 0; i < p_.count; i++) p_.setZ(i, 0.04 * Math.sin(p_.getX(i) * 7) * Math.sin(p_.getY(i) * 3 + 1)); p_.needsUpdate = true; tarp.geometry.computeVertexNormals(); }
const signT = canvasTex(512, 300, (g, w, h) => { g.fillStyle = '#b48a56'; g.fillRect(0, 0, w, h); const R = rng(4); for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(80,50,20,${R() * 0.15})`; g.fillRect(R() * w, R() * h, 30, 2); }
  g.fillStyle = '#111'; g.textAlign = 'center'; g.font = '700 120px Caveat-600'; g.fillText(UI.sign, w / 2, 150); g.font = '700 54px Caveat-600'; g.fillText('(keep out)', w / 2, 230);
  g.fillStyle = 'rgba(170,170,170,.85)'; g.save(); g.translate(40, 20); g.rotate(-0.5); g.fillRect(-40, -12, 110, 26); g.restore(); g.save(); g.translate(w - 40, 20); g.rotate(0.5); g.fillRect(-70, -12, 110, 26); g.restore(); });
mesh(new THREE.PlaneGeometry(0.62, 0.36), std('#ffffff', { map: signT, roughness: 0.9 }), { pos: [0, 0.42, -LEN + 1.13], rot: [0, 0, 0.04], parent: S, cast: false });
// a ladder up into a short neck, the hatch at the top (it shuts at the end)
const LAD = new THREE.Group(); S.add(LAD); LAD.position.set(0, 0, 0.6);
{ const steel = std('#3c4a48', { metalness: 0.8, roughness: 0.35 });
  for (const x of [-0.22, 0.22]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.6, 8), steel, { pos: [x, 1.0, 0], parent: LAD });
  for (let i = 0; i < 11; i++) mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.44, 8), steel, { pos: [0, -0.6 + i * 0.32, 0], rot: [0, 0, Math.PI / 2], parent: LAD });
  mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.0, 32, 1, true), std('#56706a', { metalness: 0.5, roughness: 0.55, side: THREE.BackSide, normalMap: corrN }), { pos: [0, 2.0, 0], parent: LAD, cast: false }); }
const SKY = mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.3, 2.0) }), { pos: [0, 2.98, 0.6], rot: [Math.PI / 2, 0, 0], parent: S, cast: false, recv: false });
const HATCH = new THREE.Group(); S.add(HATCH); HATCH.position.set(-0.45, 3.0, 0.6);
mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.06, 32), std('#2f3b39', { metalness: 0.8, roughness: 0.4 }), { pos: [0.45, 0, 0], parent: HATCH });
const shaft = new THREE.SpotLight('#fff3dc', 0, 8, 0.32, 0.6, 1.4); shaft.position.set(0, 2.9, 0.6); shaft.target.position.set(0, -0.7, 0.4); S.add(shaft, shaft.target);
// the bunks (left), the shelves (right), water jugs, the generator, the table and the TV
const wood = std('#6b4a2c', { roughness: 0.7 }), green = std('#3f5a3c', { roughness: 0.8 }), tan = std('#a8936a', { roughness: 0.9 });
for (const [z, col] of [[-2.2, '#d4692c'], [-4.4, '#3f5a3c']]) { const B = new THREE.Group(); S.add(B); B.position.set(-0.6, -0.5, z);   // camping cots, a sleeping bag on each
  mesh(new THREE.BoxGeometry(0.62, 0.02, 1.85), std('#3d5a3a', { roughness: 0.9 }), { pos: [0, 0, 0], parent: B });
  for (const dz of [-0.85, 0, 0.85]) for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), std('#888', { metalness: 0.9 }), { pos: [sx * 0.25, -0.1, dz], rot: [0, 0, sx * 0.5], parent: B });
  mesh(rbox(0.52, 0.1, 1.5, 0.05), std(col, { roughness: 0.7 }), { pos: [0, 0.06, 0.1], parent: B }); }
const SHELF = new THREE.Group(); S.add(SHELF); SHELF.position.set(0.66, 0, -2.6); SHELF.rotation.y = -0.03;
const LEVELS = [-0.5, -0.15, 0.2, 0.52];
const ply = std('#c9a674', { roughness: 0.85 }), block = std('#8d8d88', { roughness: 0.95 });
for (const y of LEVELS) mesh(new THREE.BoxGeometry(0.4, 0.02, 3.2), ply, { pos: [0, y, 0], parent: SHELF });
for (let li = 0; li < LEVELS.length - 1; li++) for (const z of [-1.4, 0, 1.4]) mesh(new THREE.BoxGeometry(0.36, LEVELS[li + 1] - LEVELS[li] - 0.02, 0.18), block, { pos: [0, (LEVELS[li] + LEVELS[li + 1]) / 2, z], parent: SHELF });
mesh(new THREE.BoxGeometry(0.36, 0.2, 0.18), block, { pos: [0, -0.62, -1.4], parent: SHELF }); mesh(new THREE.BoxGeometry(0.36, 0.2, 0.18), block, { pos: [0, -0.62, 1.4], parent: SHELF });
// cans: instanced, each with a label colour; they drop in row by row in beat 2
const canLab = canvasTex(512, 128, (g, w, h) => { const cols = ['#c8382a', '#e8d6a4', '#2f6f8a', '#d9a62a']; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * 128, 0, 128, h); g.fillStyle = 'rgba(0,0,0,.75)'; g.font = '800 26px RobotoCondensed'; g.textAlign = 'center'; g.fillText(i % 2 ? UI.brand : UI.beans, i * 128 + 64, 74); }); });
const CANS = []; { const geo = new THREE.CylinderGeometry(0.045, 0.045, 0.12, 20), R = rng(21);
  LEVELS.slice(0, 3).forEach((y, li) => { for (let i = 0; i < 26; i++) { const m = new THREE.MeshStandardMaterial({ map: canLab, roughness: 0.35, metalness: 0.4 }); m.map = canLab.clone(); m.map.offset.x = Math.floor(R() * 4) / 4; m.map.repeat.x = 0.25; m.map.needsUpdate = true;
    const c = mesh(geo, m, { parent: SHELF, pos: [-0.06 + (i % 2) * 0.1, y + 0.075, -1.45 + Math.floor(i / 2) * 0.23] }); c.userData = { y: y + 0.075, at: li * 0.32 + (i / 26) * 0.6 }; CANS.push(c); } }); }
const JUG = new THREE.MeshPhysicalMaterial({ color: '#f2f0e6', roughness: 0.35, transmission: 0.35, thickness: 0.1, transparent: true, opacity: 0.9 });
for (let i = 0; i < 8; i++) mesh(rbox(0.15, 0.25, 0.15, 0.03), JUG, { pos: [0.58 + (i % 2) * 0.16, -0.6, -4.6 - Math.floor(i / 2) * 0.18], parent: S });
const bucketT = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '700 54px Caveat-600'; g.textAlign = 'center'; g.fillText(['BEANS', 'RICE', 'H2O'][Math.floor(Math.random() * 0) ] || 'BEANS', w / 2, 80); });
for (const [x, z, w_] of [[0.55, -5.6, 'BEANS'], [0.55, -5.95, 'RICE'], [-0.55, -5.8, 'H2O']]) { const bt = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '700 58px Caveat-600'; g.textAlign = 'center'; g.fillText(w_, w / 2, 82); });
  mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.36, 24), std('#ffffff', { map: bt, roughness: 0.6 }), { pos: [x, -0.54, z], rot: [0, 1.4, 0], parent: S }); }
const GEN = new THREE.Group(); S.add(GEN); GEN.position.set(0.42, -0.5, -1.0); GEN.rotation.y = -0.5;
{ const red = std('#c8382a', { roughness: 0.4, metalness: 0.3 }), blk = std('#1c1c1c', { metalness: 0.7, roughness: 0.4 }), tube_ = std('#2a2a2a', { metalness: 0.9, roughness: 0.3 });
  mesh(rbox(0.46, 0.2, 0.3, 0.05), red, { pos: [0, 0.18, 0], parent: GEN });                         // the fuel tank on top
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), blk, { pos: [0.1, 0.3, 0], parent: GEN });   // the fuel cap
  mesh(new THREE.BoxGeometry(0.34, 0.16, 0.24), std('#3a3a3a', { metalness: 0.6, roughness: 0.5 }), { pos: [0, -0.02, 0], parent: GEN });   // the engine
  const pt = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = '800 34px RobotoCondensed'; g.fillText('GENERATOR', 18, 44);
    for (const x of [50, 130]) { g.beginPath(); g.arc(x, 90, 18, 0, TAU); g.fill(); g.fillStyle = '#d8d2c2'; g.fillRect(x - 8, 82, 4, 12); g.fillRect(x + 4, 82, 4, 12); g.fillStyle = '#111'; }
    g.fillStyle = '#c8382a'; g.beginPath(); g.arc(210, 90, 14, 0, TAU); g.fill(); });
  mesh(new THREE.PlaneGeometry(0.26, 0.13), std('#ffffff', { map: pt, roughness: 0.5 }), { pos: [0, 0.0, 0.122], parent: GEN, cast: false });   // the control panel
  for (const x of [-0.25, 0.25]) for (const z of [-0.17, 0.17]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), tube_, { pos: [x, 0.07, z], parent: GEN });
  for (const z of [-0.17, 0.17]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), tube_, { pos: [0, 0.28, z], rot: [0, 0, Math.PI / 2], parent: GEN });
  for (const x of [-0.25, 0.25]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8), tube_, { pos: [x, -0.14, 0], rot: [Math.PI / 2, 0, 0], parent: GEN });
  for (const z of [-0.18, 0.18]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), blk, { pos: [0.25, -0.18, z], rot: [Math.PI / 2, 0, 0], parent: GEN }); }
const TABLE = new THREE.Group(); S.add(TABLE); TABLE.position.set(-0.45, -0.72, -0.6);
const crateT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = '#1e5fb0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.65)'; for (let x = 10; x < w - 10; x += 22) for (let y = 14; y < h - 10; y += 26) g.fillRect(x, y, 14, 18); });
for (const y of [0.14, 0.42]) mesh(new THREE.BoxGeometry(0.44, 0.27, 0.34), std('#ffffff', { map: crateT, roughness: 0.6 }), { pos: [0, y, 0], parent: TABLE });
mesh(new THREE.BoxGeometry(0.6, 0.02, 0.45), ply, { pos: [0, 0.57, 0], parent: TABLE });
// the TV: a round-cornered cabinet on legs, the screen a canvas the news is drawn into
const TV = new THREE.Group(); TABLE.add(TV); TV.position.set(0, 0.8, 0); TV.rotation.y = 0.55;
mesh(rbox(0.52, 0.42, 0.4, 0.03), std('#4a4a48', { roughness: 0.5 }), { parent: TV });
const tapeM = std('#a9a9a4', { roughness: 0.4, metalness: 0.3 }); mesh(new THREE.BoxGeometry(0.06, 0.2, 0.005), tapeM, { pos: [0.205, 0.12, 0.204], rot: [0, 0, 0.3], parent: TV }); mesh(new THREE.BoxGeometry(0.5, 0.05, 0.005), tapeM, { pos: [0, 0.22, 0.12], rot: [Math.PI / 2, 0, 0.05], parent: TV });
for (const sx of [-1, 1]) { const ant = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 6), std('#ccc', { metalness: 1, roughness: 0.2 }), { pos: [sx * 0.08, 0.42, -0.05], rot: [0, 0, -sx * 0.5], parent: TV });
  if (sx > 0) mesh(new THREE.IcosahedronGeometry(0.03, 1), std('#d8d8d8', { metalness: 1, roughness: 0.35 }), { pos: [0.2, 0.64, -0.05], parent: TV }); }
const tvC = document.createElement('canvas'); tvC.width = 640; tvC.height = 480; const tvTex = new THREE.CanvasTexture(tvC); tvTex.colorSpace = THREE.SRGBColorSpace;
const SCREEN = mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: tvTex, color: new THREE.Color(1.6, 1.6, 1.6) }), { pos: [-0.02, 0.02, 0.202], parent: TV, cast: false });
for (const x of [0.17, 0.2]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 12), std('#d8c8a0', { metalness: 0.6 }), { pos: [0.21, x - 0.25, 0.205], rot: [Math.PI / 2, 0, 0], parent: TV });
const tvGlow = new THREE.PointLight('#bfe8ff', 0, 3, 2); tvGlow.position.set(-0.3, 0.3, -0.2); S.add(tvGlow);
// the bulbs: caged, warm, along the crown of the tube
{ const pts = []; for (let i = 0; i <= 40; i++) { const z = 0.4 - i * 0.24, sag = 0.12 * Math.sin(((z - 0.4) / 2.2) * Math.PI) ** 2; pts.push(new THREE.Vector3(0.18, 1.1 - sag, z)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.008, 6), std('#e8a020', { roughness: 0.5 }), { parent: S, cast: false }); }   // an orange extension cord along the crown
const BULBS = []; for (let i = 0; i < 4; i++) { const z = -0.8 - i * 2.2, b = mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshBasicMaterial({ color: '#000' }), { pos: [0.18, 0.88 - (i % 2) * 0.05, z], parent: S, cast: false });
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), std('#222'), { pos: [0.18, 0.99 - (i % 2) * 0.03, z], parent: S, cast: false });
  const L = new THREE.PointLight(i % 2 ? '#ffd9a0' : '#ffb35c', 0, 4.5, 1.6); L.position.set(0.18, 0.84, z); L.castShadow = i < 2; if (L.castShadow) { L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; } S.add(L); BULBS.push({ b, L }); }
S.add(new THREE.HemisphereLight('#2a4a48', '#100a06', 0.12));

// ------------------------------------------------------------------ the TV picture, per beat
let tvKey = '';
function drawTV(t) {
  const beat = t < T.s2 ? 1 : t < T.s3 ? 2 : t < T.s4 ? 3 : t < T.s5 ? 4 : 5, f = Math.floor(t * 12);
  const key = beat + ':' + f; if (key === tvKey) return; tvKey = key; const g = tvC.getContext('2d'), w = 640, h = 480, R = rng(f + 1);
  g.fillStyle = '#0a1418'; g.fillRect(0, 0, w, h); g.textAlign = 'center';
  if (t < EV.lights) { for (let i = 0; i < 3000; i++) { const v = R() * 200; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(R() * w, R() * h, 3, 3); } }
  else if (beat === 1) { g.fillStyle = '#e8f4ff'; g.font = '800 64px Anton-400'; g.fillText(UI.tv1, w / 2, 90); g.font = '700 30px RobotoCondensed'; g.fillText(UI.tv1s, w / 2, 130);
    for (let i = 0; i < 7; i++) { const y = 180 + i * 42, on = t > EV.cx - 0.6 + i * 0.09; g.fillStyle = '#9cc'; g.textAlign = 'left'; g.font = '600 28px RobotoCondensed'; g.fillText(['ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'JFK', 'SEA'][i] + '  ' + (1000 + i * 137), 60, y);
      g.textAlign = 'right'; g.fillStyle = on ? '#ff5a4e' : '#9cc'; g.fillText(on ? UI.cx : 'ON TIME', w - 60, y); } }
  else if (beat === 2) { g.fillStyle = '#e8f4ff'; g.font = '800 56px Anton-400'; g.fillText(UI.tv2, w / 2, 210); g.font = '700 30px RobotoCondensed'; g.fillStyle = '#ff5a4e'; g.fillText(UI.tv2s, w / 2, 260);
    g.strokeStyle = '#ff5a4e'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, 360, 44, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(w / 2 - 28, 332); g.lineTo(w / 2 + 28, 388); g.stroke(); }
  else if (beat === 3) { g.fillStyle = '#e8f4ff'; g.font = '800 56px Anton-400'; g.fillText(UI.tv3, w / 2, 110); g.font = '800 44px RobotoCondensed'; g.fillStyle = '#9cc'; g.fillText(UI.tv3a, w / 2, 230);
    g.fillStyle = t > EV.aday ? '#f2c21a' : '#355'; g.fillText(UI.tv3b, w / 2, 320); }
  else if (beat === 4) { g.fillStyle = '#e8f4ff'; g.font = '800 60px Anton-400'; g.fillText(UI.tv4, w / 2, 170); if (t > EV.sold) { g.save(); g.translate(w / 2, 300); g.rotate(-0.12); g.strokeStyle = '#ff5a4e'; g.lineWidth = 10; g.strokeRect(-200, -55, 400, 110); g.fillStyle = '#ff5a4e'; g.font = '800 72px Anton-400'; g.fillText(UI.tv4s, 0, 26); g.restore(); } }
  else { g.fillStyle = '#e8f4ff'; g.font = '800 32px Anton-400'; const s1 = UI.tv5, s2 = UI.tv5s, n = Math.floor(clamp((t - EV.quote) / 2.2) * (s1.length + s2.length));
    const wrapL = (s, y) => { const words = s.split(' '); let line = '', yy = y; for (const wd of words) { const tt = line ? line + ' ' + wd : wd; if (g.measureText(tt).width > 480 && line) { g.fillText(line, w / 2, yy); yy += 50; line = wd; } else line = tt; } g.fillText(line, w / 2, yy); return yy; };
    const y2 = wrapL('“' + s1.slice(0, n), 140); if (n > s1.length) { g.fillStyle = '#f2c21a'; wrapL(s2.slice(0, n - s1.length) + (n >= s1.length + s2.length ? '”' : ''), y2 + 70); } }
  for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, w, 2); }
  tvTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the state at t
const cam = new THREE.PerspectiveCamera(50, W / H, 0.02, 60);
function stateAt(t) {
  drawTV(t);
  // bulbs: dark, a buzz and a stutter on at EV.lights; a dip when the generator starts, then steady
  let L = t < EV.lights ? 0 : t < EV.lights + 0.5 ? (Math.floor((t - EV.lights) * 14) % 3 ? 1 : 0.2) : 1;
  if (t > EV.gen && t < EV.gen + 0.6) L *= 0.55 + 0.45 * Math.sin((t - EV.gen) * 20) ** 2;
  BULBS.forEach(({ b, L: pl }) => { pl.intensity = 2.2 * L; b.material.color.setRGB(3.0 * L, 1.9 * L, 0.9 * L); });
  tvGlow.intensity = t < EV.lights ? 0.6 : 1.2;
  // cans fall onto the shelves in beat 2 (stop-motion: they arrive on 12 fps)
  const tc = Math.floor((t - EV.cans) * 12) / 12; CANS.forEach((c) => { const k = clamp((tc - c.userData.at) / 0.12); c.visible = t > EV.cans + c.userData.at - 0.05; c.position.y = c.userData.y + (1 - k) * 0.25; });
  // the generator shakes once it runs
  const gr = t > EV.gen ? 1 : 0; GEN.position.x = 0.42 + gr * Math.sin(t * 90) * 0.003; GEN.rotation.z = gr * Math.sin(t * 70) * 0.004;
  // the hatch: open (daylight) until EV.shut, then it swings down
  const hs = ease.io((t - EV.shut) / 0.35); HATCH.rotation.z = lerp(-1.7, 0, hs); shaft.intensity = t > T.s5 ? 1.6 * (1 - hs) : 0; SKY.material.color.setRGB(0.55 * (1 - hs) + 0.02, 0.62 * (1 - hs) + 0.02, 0.75 * (1 - hs) + 0.02);
  // the camera, per beat
  const lt = (s) => t - T[s];
  if (t < T.s2) { const k = ease.io(lt('s1') / 4); cam.position.set(lerp(0.15, 0.05, k), lerp(0.05, 0.0, k), lerp(0.52, 0.42, k)); cam.lookAt(-0.47, 0.06, -0.6); cam.fov = lerp(48, 42, k); }   // stays on the TV's side of the ladder (z 0.6): starting behind it put a rung across the lens
  else if (t < T.s3) { const k = ease.io(lt('s2') / 4); cam.position.set(lerp(-0.1, -0.05, k), lerp(0.15, 0.1, k), lerp(-0.6, -0.9, k)); cam.lookAt(0.66, -0.05, -2.6); cam.fov = 52; }
  else if (t < T.s4) { const k = ease.io(lt('s3') / 4.6); cam.position.set(0, 0.2, lerp(0.3, -2.4, k)); cam.lookAt(0, 0.0, -9); cam.fov = 58; }
  else if (t < T.s5) { const k = ease.io(lt('s4') / 3.8); cam.position.set(lerp(-0.25, -0.2, k), lerp(0.05, -0.02, k), lerp(0.1, -0.02, k)); cam.lookAt(0.38, -0.42, -1.0); cam.fov = 50; }
  else { const k1 = ease.io((t - T.s5) / 1.6), k2 = ease.io((t - EV.climb) / 2.6);
    cam.position.set(lerp(0.05, 0.0, k1), lerp(0.0, 1.5, k2), lerp(0.25, 0.22, k1)); const look = new THREE.Vector3(lerp(-0.47, 0, k2), lerp(0.06, 3.2, k2), lerp(-0.6, 0.62, k2)); cam.lookAt(look); cam.fov = 48; }
  cam.updateProjectionMatrix();
}

function tag(g, text, a, y = 1520) {
  if (a <= 0 || !text) return; g.save(); g.globalAlpha = a; g.font = '800 28px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(28 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110; g.fillStyle = 'rgba(12,10,6,.88)'; g.beginPath(); g.roundRect(x, y, w + 44, 60, 6); g.fill(); g.strokeStyle = 'rgba(242,194,26,.6)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#f4ead0'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 31); g.restore();
}
function frame(t, captions = true) {
  stateAt(t);
  post.render(S, cam, { focus: 1e5, aperture: 0, maxBlur: 0, tilt: 0, threshold: 0.75, knee: 0.5, bloomA: 0.5, bloomB: 0.4,
    exposure: 1.25, vignette: 0.6, grain: 0.07, seed: Math.floor(t * 24), sat: 0.95, contrast: 1.12, toe: 0.02, lift: [0.006, 0.01, 0.01], gain: [1.06, 1.0, 0.92], aberration: 0.0018 });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3); for (const [k, a0, a1] of TAGS) tag(g2d, UI[k], tg(a0, a1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(T.s2 + 1, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const LOOKS = [{ name: '1-tv', t: EV.cx + 0.5 }, { name: '2-cans', t: T.s3 - 0.5 }, { name: '3-tube', t: EV.aday + 0.5 }, { name: '4-gen', t: EV.sold + 0.5 }, { name: '5-hatch', t: EV.shut - 0.5 }];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  looks: LOOKS.map((l) => ({ name: l.name })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
