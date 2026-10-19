// BACKUP MODE — Toko Slomo's first film, Kallio Noir (v1, 19 Oct; plan/films/13-backup-mode.md). A year after the
// cloud outage that left some "AI" smart beds stuck tilted or heating, Toko Slomo narrates his night in hard-boiled
// caps. Black and white in clay: grey plasticine everywhere, a cold key striped through the venetian blinds, and ONE
// colour, magenta — the HOTELLI sign across the street and his mask. Toko's rules: no slate, no station bug, and his
// card at the end held for at least 4 s.
//   1 the window, the rain and the neon; down to the bed, where he sleeps in his chef's jacket; on "down" the bed's
//     strip stops saying the time and starts saying CONNECTING…
//   2 wide: the base folds him up like a taco; arms crossed, he turns to the lens on "flat"
//   3 outside: the building across the street; steam out of three windows on "heating"
//   4 the phone on the nightstand lights: BACKUP MODE
//   5 he sleeps on the floor with the cat on his chest, the apron for a pillow; behind him the bed, folded, still
//     connecting. Toko's card.
// 1080×1920, 30 fps, the puppets on twos. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../welcome/lib/post.js';
import { surface, setBoil } from '../welcome/lib/clay.js';
import { lumpy, sausage, ball, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex, rainStreaks } from '../welcome/lib/city.js';
import { Toko } from '../welcome/lib/toko.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['NotoSerifJP-600', 'NotoSerifJP-600.woff'], ['IPAPGothic', 'IPAPGothic.ttf']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#050506');
const camera = new THREE.PerspectiveCamera(38, W / H, 2, 3000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const MAG = '#f0027f';

// ------------------------------------------------------------------ clays: every one of them grey, but the mask, the gloves and the neon
const C = (color, o = {}) => surface({ color, wrap: 0.25, wrapTint: '#e6e8ec', rough: 0.7, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 2.2, ridge: 0.12, tool: 0.7, grain: 0.004, grainF: 8, mottle: 0.08, specks: 0.3, speckColor: '#1c1c1c', roughVar: 0.1, ...o });
const GLAZE = (color, o = {}) => C(color, { rough: 0.2, thumb: 0.01, thumbCell: 1.4, specks: 0.05, clearcoat: 1, clearcoatRough: 0.1, ...o });
const FELT = (color, o = {}) => C(color, { surf: 'felt', rough: 1, fibre: 0.07, fibreF: 2.4, mottle: 0.06, ...o });
const HDR = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...o });
const M = {
  floorA: C('#3d3b38', { tool: 1.1, thumbCell: 2.4, mottle: 0.12 }), floorB: C('#34322f', { tool: 1.1, thumbCell: 2.4, mottle: 0.12 }),
  wall: C('#6e6c68', { thumb: 0.014, thumbCell: 6, mottle: 0.07, specks: 0.08, noBoil: true }), trim: C('#a8a59f', { tool: 0.8 }),
  slat: C('#c6c3bc', { thumb: 0.01, rough: 0.5 }), radiator: C('#5c5b58', { rough: 0.45, metal: 0.4, thumb: 0.015 }),
  bedBase: GLAZE('#1d1d1f'), mattress: FELT('#cfccc5'), quilt: FELT('#bdbab3', { fibre: 0.05 }), pillow: FELT('#e1ded7'), duvet: FELT('#56544f'),
  headboard: FELT('#3a3936', { fibre: 0.09 }), foot: C('#2a2a2b', { rough: 0.4 }),
  jacket: C('#38383e', { thumbCell: 1.6, thumb: 0.035, tool: 1.0, mottle: 0.06 }), trousers: C('#2a2a2e', { thumbCell: 1.8, tool: 0.7 }),
  shoes: GLAZE('#141415'), sole: C('#2c2c2c'), glove: C(MAG, { thumbCell: 1.2, thumb: 0.03, specks: 0.2, speckColor: '#5a0030' }),
  hair: C('#a6a5a1', { tool: 1.3, thumbCell: 0.9, thumb: 0.045 }), maskDisc: C(MAG, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2, speckColor: '#5a0030' }),
  maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }), strap: C('#101012', { thumb: 0.01, rough: 0.5 }),
  button: C('#cfcbc0', { rough: 0.3, metal: 0.6, thumb: 0.01, specks: 0 }),
  stand: C('#4a4844', { tool: 0.9 }), phone: GLAZE('#0c0c0e', { lump: 0, bump: 0.2, noBoil: true }), lampShade: FELT('#8a8780'), lampBase: GLAZE('#2e2e30'), glass: GLAZE('#9a9a9c', { transparent: true, opacity: 0.55 }),
  apron: FELT('#e8e6e0', { fibre: 0.05 }), cat: FELT('#dad7d0', { fibre: 0.12, fibreF: 3.0 }), catDark: C('#2a2a2a', { rough: 0.4 }),
  facade: C('#56544f', { thumb: 0.016, thumbCell: 8, mottle: 0.08, noBoil: true }), facadeTrim: C('#77756f', { tool: 0.8 }), sill: C('#8a8780'),
  darkGlass: GLAZE('#08080a'), signBox: GLAZE('#151517'), bracket: C('#2a2a2a', { metal: 0.5, rough: 0.4 }),
  hole: new THREE.MeshBasicMaterial({ color: '#050506' }), sil: new THREE.MeshBasicMaterial({ color: '#0a0a0b' }),
};

// ------------------------------------------------------------------ the room (cm, puppet scale: Toko stands 46; floor y = 0; the back wall faces +z)
const BACK = -62, WIN = { x0: -16, x1: 28, y0: 36, y1: 98 };
for (let i = -12; i <= 12; i++) mesh(lumpy(new RoundedBoxGeometry(260, 1, 8.6, 2, 0.35), 0.03, 0.3, 300 + i), i % 2 ? M.floorA : M.floorB, { pos: [0, -0.5, BACK + 4.4 + (i + 12) * 9.0], cast: false });
for (let i = 13; i <= 22; i++) mesh(new RoundedBoxGeometry(260, 1, 8.6, 2, 0.35), i % 2 ? M.floorA : M.floorB, { pos: [0, -0.5, BACK + 4.4 + (i + 12) * 9.0], cast: false });
{ const V2 = ([x, y]) => new THREE.Vector2(x, y), s = new THREE.Shape([[-220, -2], [220, -2], [220, 190], [-220, 190]].map(V2));
  s.holes.push(new THREE.Path([[WIN.x0, WIN.y0], [WIN.x1, WIN.y0], [WIN.x1, WIN.y1], [WIN.x0, WIN.y1]].map(V2)));
  M.wall.shadowSide = THREE.DoubleSide;
  mesh(lumpy(new THREE.ExtrudeGeometry(s, { depth: 6, bevelEnabled: false, curveSegments: 2 }), 0.05, 0.25, 7), M.wall, { pos: [0, 0, BACK - 6] }); }
// the window: a deep painted frame, a sash bar, a sill, and the blinds tilted half open
const WX = (WIN.x0 + WIN.x1) / 2, WW = WIN.x1 - WIN.x0, WH = WIN.y1 - WIN.y0;
for (const [x, y, w, h] of [[WIN.x0 - 1, (WIN.y0 + WIN.y1) / 2, 2.4, WH + 4], [WIN.x1 + 1, (WIN.y0 + WIN.y1) / 2, 2.4, WH + 4], [WX, WIN.y1 + 1, WW + 4, 2.4]]) mesh(new RoundedBoxGeometry(w, h, 7, 2, 0.6), M.trim, { pos: [x, y, BACK - 2.5] });
mesh(lumpy(new RoundedBoxGeometry(WW + 10, 2.2, 10, 2, 0.6), 0.02, 0.4, 11), M.trim, { pos: [WX, WIN.y0 - 1, BACK + 1] });
mesh(new RoundedBoxGeometry(1.6, WH, 2, 2, 0.4), M.trim, { pos: [WX, (WIN.y0 + WIN.y1) / 2, BACK - 9] });
mesh(new RoundedBoxGeometry(WW, 1.6, 2, 2, 0.4), M.trim, { pos: [WX, WIN.y0 + WH * 0.62, BACK - 9] });
const SLATS = []; for (let y = WIN.y1 - 2; y > WIN.y0 + 1; y -= 2.7) SLATS.push(mesh(new RoundedBoxGeometry(WW - 1, 0.24, 2.3, 1, 0.1), M.slat, { pos: [WX, y, BACK + 0.6], rot: [0.62, 0, 0] }));
for (const x of [WIN.x0 + 6, WIN.x1 - 6]) mesh(new THREE.CylinderGeometry(0.08, 0.08, WH, 5), M.slat, { pos: [x, (WIN.y0 + WIN.y1) / 2, BACK + 1.4], cast: false });
mesh(new RoundedBoxGeometry(WW + 1, 3, 3.2, 2, 0.8), M.slat, { pos: [WX, WIN.y1 - 0.5, BACK + 0.8] });
// the radiator under it: cast-iron fins on two feet
for (let i = 0; i < 13; i++) mesh(lumpy(new RoundedBoxGeometry(1.8, 22, 6, 2, 0.8), 0.03, 0.6, 30 + i), M.radiator, { pos: [WIN.x0 + 4 + i * 2.6, 15, BACK + 4] });
mesh(new THREE.CylinderGeometry(0.5, 0.5, 34, 8).rotateZ(Math.PI / 2), M.radiator, { pos: [WIN.x0 + 19.6, 24.4, BACK + 4] });
// skirting, and the apron on its hook (it is his pillow by the end)
mesh(new RoundedBoxGeometry(440, 6, 1.4, 2, 0.4), M.trim, { pos: [0, 3, BACK + 0.7] });
const HOOK = new THREE.Group(); scene.add(HOOK); HOOK.position.set(-52, 66, BACK + 1.2);
mesh0(new THREE.SphereGeometry(0.7, 12, 8), M.bracket, { parent: HOOK });
const APRON_HUNG = mesh0(lumpy(new RoundedBoxGeometry(11, 26, 1.0, 3, 0.45).translate(0, -13, 0.6), 0.25, 0.25, 41), M.apron, { pos: [0, 0.4, 0.4], rot: [0.05, 0, 0.03], parent: HOOK });
const APRON_TIE = mesh0(lumpy(sausage([[-3, -0.5, 0.9], [-5.5, -5, 1.2], [-4.5, -11, 1.4]], [0.5, 0.45, 0.4], { steps: 16 }), 0.04, 1, 42), M.apron, { parent: HOOK });

// ------------------------------------------------------------------ the smart bed: a dark plinth with a strip of light on its front, and a base in three
// sections — the head and the foot hinge up, which is the whole joke
const BED = { z: -40, d: 30, top: 8, mt: 6 };
mesh(lumpy(new RoundedBoxGeometry(58, 6, BED.d, 3, 1.2), 0.02, 0.4, 700), M.bedBase, { pos: [0, 5, BED.z] });
for (const [x, z] of [[-26, -12], [26, -12], [-26, 12], [26, 12]]) mesh(new THREE.CylinderGeometry(1.1, 0.9, 2, 12), M.foot, { pos: [x, 1, BED.z + z] });
mesh(lumpy(new RoundedBoxGeometry(3.4, 28, BED.d + 1, 3, 1.4), 0.12, 0.35, 701), M.headboard, { pos: [-30.6, 18, BED.z] });
for (let i = -2; i <= 2; i++) mesh(new THREE.SphereGeometry(0.45, 10, 8), M.headboard, { pos: [-28.8, 24, BED.z + i * 5.6], cast: false });
const stripC = canvas(640, 100), stripG = stripC.getContext('2d'), stripT = tex(stripC);
mesh(new THREE.PlaneGeometry(24, 3.75), new THREE.MeshBasicMaterial({ map: stripT, toneMapped: false }), { pos: [14.5, 5, BED.z + BED.d / 2 + 0.06], cast: false });
const HEADSEC = new THREE.Group(), FOOTSEC = new THREE.Group(); scene.add(HEADSEC, FOOTSEC);
HEADSEC.position.set(-6, BED.top, BED.z); FOOTSEC.position.set(8, BED.top, BED.z);
mesh0(lumpy(new RoundedBoxGeometry(22, BED.mt, BED.d - 2, 3, 2.0), 0.08, 0.4, 710), M.mattress, { pos: [-11, BED.mt / 2, 0], parent: HEADSEC });
mesh0(lumpy(new RoundedBoxGeometry(14.2, BED.mt, BED.d - 2, 3, 2.0), 0.08, 0.4, 711), M.mattress, { pos: [1, BED.top + BED.mt / 2, BED.z], parent: scene });
mesh0(lumpy(new RoundedBoxGeometry(20, BED.mt, BED.d - 2, 3, 2.0), 0.08, 0.4, 712), M.mattress, { pos: [10, BED.mt / 2, 0], parent: FOOTSEC });
for (const [g, x0, x1, s] of [[HEADSEC, -22, 0, 713], [FOOTSEC, 0, 20, 714]]) mesh0(lumpy(new RoundedBoxGeometry(x1 - x0 - 0.6, 0.7, BED.d - 2.6, 2, 0.3), 0.06, 0.5, s), M.quilt, { pos: [(x0 + x1) / 2, BED.mt + 0.15, 0], parent: g, cast: false });
mesh0(lumpy(new RoundedBoxGeometry(14.8, 0.7, BED.d - 2.6, 2, 0.3), 0.06, 0.5, 715), M.quilt, { pos: [1, BED.top + BED.mt + 0.15, BED.z], parent: scene, cast: false });
mesh0(lumpy(ball(5.6, 1.0, 0.36, 1.9, 32), 0.22, 0.4, 716), M.pillow, { pos: [-17.6, BED.mt + 1.3, 0], parent: HEADSEC });
mesh0(lumpy(new RoundedBoxGeometry(8.5, 3.0, BED.d - 1, 3, 1.3), 0.3, 0.3, 717), M.duvet, { pos: [15.2, BED.mt + 1.5, 0], parent: FOOTSEC });
/** the base: head and foot raised by h and f (radians) */
function fold(h, f) { HEADSEC.rotation.z = -h; FOOTSEC.rotation.z = f; }

/** the strip: the time and a steady dot while the bed is on the internet; a spinner and CONNECTING… once it is not */
function drawStrip(t, down) {
  const g = stripG, w = 640, h = 100; g.clearRect(0, 0, w, h); g.fillStyle = '#060607'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, 0, w, 3);
  const cx = 60, cy = h / 2;
  if (!down) {
    g.fillStyle = '#d8dce4'; g.beginPath(); g.arc(cx, cy, 13, 0, TAU); g.fill();
    g.font = '600 46px Inter'; g.textBaseline = 'middle'; g.fillStyle = '#c9ced8'; g.fillText((P.ui.time || '3:07') + '  ·  21°', 104, cy + 2);
  } else {
    g.strokeStyle = 'rgba(216,220,228,.18)'; g.lineWidth = 8; g.beginPath(); g.arc(cx, cy, 26, 0, TAU); g.stroke();
    const a = t * 7; g.strokeStyle = '#eef1f6'; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy, 26, a, a + 1.9); g.stroke();
    g.font = '700 46px Inter'; g.textBaseline = 'middle'; g.fillStyle = '#eef1f6'; let tx = P.ui.connecting || 'CONNECTING…';
    const dots = Math.floor(t * 2.5) % 4; if (tx.endsWith('…')) tx = tx.slice(0, -1) + '.'.repeat(dots);
    g.fillText(tx, 108, cy + 2);
  }
  stripT.needsUpdate = true;
}

// ------------------------------------------------------------------ the nightstand: a lamp (off), a glass, and the phone
const STAND = [-42, 0, -42];
mesh(lumpy(new RoundedBoxGeometry(14, 18, 14, 3, 1.0), 0.04, 0.4, 800), M.stand, { pos: [STAND[0], 9, STAND[2]] });
mesh(new RoundedBoxGeometry(12, 4, 0.6, 2, 0.25), M.trim, { pos: [STAND[0], 12, STAND[2] + 7.1] });
mesh(new THREE.SphereGeometry(0.5, 10, 8), M.radiator, { pos: [STAND[0], 12, STAND[2] + 7.6] });
mesh(lumpy(new THREE.CylinderGeometry(1.6, 2.4, 6, 20), 0.03, 0.6, 801), M.lampBase, { pos: [STAND[0] - 3.4, 21, STAND[2] - 3.4] });
mesh(lumpy(new THREE.CylinderGeometry(3.2, 4.8, 5.4, 28, 1, true), 0.05, 0.5, 802), M.lampShade, { pos: [STAND[0] - 3.4, 26.4, STAND[2] - 3.4] });
mesh(lumpy(new THREE.CylinderGeometry(1.0, 0.85, 3.2, 18, 1, true), 0.01, 1, 803), M.glass, { pos: [STAND[0] + 4, 19.6, STAND[2] - 3.6], cast: false });
const PHONE = new THREE.Group(); scene.add(PHONE); PHONE.position.set(STAND[0] + 0.6, 18.25, STAND[2] + 2.4); PHONE.rotation.y = 0.28;
mesh0(lumpy(new RoundedBoxGeometry(2.6, 0.5, 5.2, 3, 0.4), 0.01, 1, 810), M.phone, { parent: PHONE });
const phoneC = canvas(400, 800), phoneG = phoneC.getContext('2d'), phoneT = tex(phoneC);
const phoneScr = new THREE.MeshBasicMaterial({ map: phoneT, toneMapped: false, color: new THREE.Color(1, 1, 1) });
mesh0(new THREE.PlaneGeometry(2.3, 4.6).rotateX(-Math.PI / 2), phoneScr, { pos: [0, 0.36, 0], parent: PHONE, cast: false });
const phoneLight = new THREE.PointLight('#dfe7ff', 0, 14, 2); scene.add(phoneLight);
/** the lock screen (k = how far it has woken), the notification (n = how far it has landed) */
function drawPhone(k, n) {
  const g = phoneG, w = 400, h = 800; g.save(); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  if (k > 0) {
    g.globalAlpha = k; const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b2d33'); gr.addColorStop(1, '#0d0e11'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eef1f6'; g.textAlign = 'center'; g.font = '200 120px Inter'; g.fillText(P.ui.time || '3:07', w / 2, 190);
    if (n > 0) { const s = ease.back(n / 0.5); g.save(); g.translate(w / 2, 400); g.scale(s, s); g.globalAlpha = k * clamp(n / 0.15);
      g.fillStyle = 'rgba(238,241,246,.95)'; g.beginPath(); g.roundRect(-180, -84, 360, 168, 30); g.fill();
      g.fillStyle = '#16171a'; g.beginPath(); g.roundRect(-160, -64, 64, 64, 16); g.fill();                     // the app: a moon, no name
      g.fillStyle = '#eef1f6'; g.beginPath(); g.arc(-128, -32, 20, 0, TAU); g.fill(); g.fillStyle = '#16171a'; g.beginPath(); g.arc(-120, -38, 17, 0, TAU); g.fill();
      g.textAlign = 'left'; g.fillStyle = '#121316'; let fs = 40; const tx = P.ui.backup || 'BACKUP MODE'; g.font = `800 ${fs}px Inter`; while (g.measureText(tx).width > 250 && fs > 22) { fs -= 2; g.font = `800 ${fs}px Inter`; }
      g.fillText(tx, -82, -20); g.fillStyle = '#2c2f36'; fs = 34; const sx = P.ui.backupSub || 'Bluetooth · no internet'; g.font = `600 ${fs}px Inter`; while (g.measureText(sx).width > 336 && fs > 18) { fs -= 1; g.font = `600 ${fs}px Inter`; }
      g.fillText(sx, -160, 50); g.restore(); }
  }
  g.restore(); phoneT.needsUpdate = true;
}

// ------------------------------------------------------------------ across the street: a facade of windows in the rain, the HOTELLI sign, steam
const FZ = -230;
mesh(lumpy(new RoundedBoxGeometry(320, 420, 10, 2, 1.0), 0.1, 0.12, 900), M.facade, { pos: [0, 100, FZ - 5], cast: false });
const FWIN = [];
for (const y of [-20, 24, 68, 112, 156, 200]) {
  mesh(new RoundedBoxGeometry(320, 2.4, 3, 1, 0.6), M.facadeTrim, { pos: [0, y - 22, FZ + 1.5], cast: false });
  for (const x of [-110, -66, -22, 22, 66, 110]) {
    const key = `${x},${y}`; FWIN.push({ x, y, key });
    mesh(new RoundedBoxGeometry(26, 34, 2.2, 2, 0.6), M.facadeTrim, { pos: [x, y, FZ + 1.1], cast: false });
    mesh(new RoundedBoxGeometry(29, 2.4, 5, 2, 0.6), M.sill, { pos: [x, y - 18, FZ + 2.4], cast: false });
  }
}
// the lit ones (pale, unlit material over 1 so they bloom a little), the dark ones; three are open and steaming
const STEAM_AT = [[22, 112], [-22, 68], [66, 156]], LIT = new Set(['22,112', '-22,68', '66,156', '-66,24', '110,68', '-22,200', '22,-20', '-110,156']);
for (const w of FWIN) {
  const lit = LIT.has(w.key), open = STEAM_AT.some(([x, y]) => `${x},${y}` === w.key);
  mesh(new THREE.PlaneGeometry(22, 30), lit ? HDR(open ? 1.25 : 0.95, open ? 1.24 : 0.95, open ? 1.22 : 0.96) : M.darkGlass, { pos: [w.x, w.y, FZ + 1.6], cast: false });
  if (!open) { mesh(new THREE.BoxGeometry(1.2, 30, 0.6), M.facadeTrim, { pos: [w.x, w.y, FZ + 2.4], cast: false }); mesh(new THREE.BoxGeometry(22, 1.2, 0.6), M.facadeTrim, { pos: [w.x, w.y + 4, FZ + 2.4], cast: false }); }
  else mesh(new RoundedBoxGeometry(11, 30, 1.2, 2, 0.3), M.facadeTrim, { pos: [w.x - 13, w.y, FZ + 8], rot: [0, 1.1, 0], cast: false });   // a casement swung open
}
// silhouettes in two of the open windows: a head with the disc of a mask, fanning itself with a paper
const SIL = STEAM_AT.slice(0, 2).map(([x, y], i) => {
  const g = new THREE.Group(); g.position.set(x + (i ? 4 : -3), y - 6, FZ + 3.2); scene.add(g);
  mesh0(ball(5.2, 1, 1.06, 0.8, 24), M.sil, { pos: [0, 0, 0], parent: g, cast: false });
  mesh0(ball(7.4, 1.3, 0.7, 0.6, 24), M.sil, { pos: [0, -8.6, 0], parent: g, cast: false });
  const fan = new THREE.Group(); fan.position.set(i ? -5 : 5, -3, 1); g.add(fan);
  mesh0(new THREE.BoxGeometry(7, 9, 0.3).translate(0, 5, 0), M.sil, { parent: fan, cast: false });
  return { g, fan, ph: i * 1.7 };
});
// steam: soft puffs on cards, rising and spreading out of the open windows
const puffC = canvas(256, 256); { const g = puffC.getContext('2d'), r = rng(3);
  for (let i = 0; i < 26; i++) { const x = 60 + r() * 136, y = 60 + r() * 136, rad = 30 + r() * 46, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } }
const puffT = tex(puffC);
const PUFFS = []; { const r = rng(9);
  for (const [x, y] of STEAM_AT) for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffT, transparent: true, depthWrite: false, color: new THREE.Color(1.3, 1.3, 1.32), opacity: 0 }));
    m.position.set(x, y, FZ + 10); scene.add(m); PUFFS.push({ m, x: x + (r() - 0.5) * 12, y, ph: r(), sp: 0.3 + r() * 0.16, dx: (r() - 0.5) * 22, rot: (r() - 0.5) * 2, w: 0.6 + r() * 0.5 });
  } }
/** the steam: k = how hard it is coming out (it swells on "heating") */
function steam(t, k) {
  for (const p of PUFFS) { const u = (t * p.sp + p.ph) % 1, s = 6 + u * 26;                    // wisps: narrow, tall, thinning as they rise and drift
    p.m.position.set(p.x + p.dx * u + Math.sin(t * 1.3 + p.ph * 9) * 2, p.y + 6 + u * 58, FZ + 10 + u * 6); p.m.scale.set(s * 0.5 * p.w, s * 1.1, 1); p.m.rotation.z = p.rot * u * 0.5;
    p.m.material.opacity = k * Math.sin(Math.PI * Math.min(1, u * 1.3)) * 0.75; p.m.visible = k > 0.01; }
}
// the HOTELLI sign: a vertical box on a bracket, its letters magenta neon tubes
const SIGN = { x: 0, y: 112, z: FZ + 16 };
mesh(lumpy(new RoundedBoxGeometry(17, 118, 7, 2, 1.2), 0.02, 0.4, 950), M.signBox, { pos: [SIGN.x, SIGN.y, SIGN.z], cast: false });
for (const y of [SIGN.y + 40, SIGN.y - 40]) mesh(new THREE.BoxGeometry(2, 2, 16), M.bracket, { pos: [SIGN.x, y, FZ + 6], cast: false });
const signC = canvas(160, 1120); { const g = signC.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 160, 1120);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  [...'HOTELLI'].forEach((ch, i) => { const y = 90 + i * 156; g.font = '140px Anton-400';
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 22; g.strokeText(ch, 80, y); g.strokeStyle = '#fff'; g.lineWidth = 9; g.strokeText(ch, 80, y); }); }
const signMat = new THREE.MeshBasicMaterial({ map: tex(signC), toneMapped: false, color: new THREE.Color(2.6, 0.02, 1.25), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
mesh(new THREE.PlaneGeometry(15, 105), signMat, { pos: [SIGN.x, SIGN.y, SIGN.z + 3.6], cast: false });
const signLight = new THREE.PointLight(MAG, 3200, 0, 2); signLight.position.set(SIGN.x, SIGN.y, SIGN.z + 18); scene.add(signLight);
// the rain: two stacked sheets of streaks so the fall never runs out
const RAIN_BOX = [-170, 170, -40, 280, -215, -66], RAIN_H = RAIN_BOX[3] - RAIN_BOX[2];
const RAIN = [0, 1].map((i) => { const r = rainStreaks(900, RAIN_BOX, { len: 7, w: 0.09, color: '#c9d2e0', opacity: 0.32, seed: 5 + i, slant: 0.1 }); scene.add(r); return r; });
const rainAt = (t) => { const off = (t * 210) % RAIN_H; RAIN[0].position.y = -off; RAIN[1].position.y = RAIN_H - off; };

// ------------------------------------------------------------------ the light: a cold street light striped through the blinds; the neon's spill; very little else
scene.add(new THREE.HemisphereLight('#9aa0aa', '#1a1a1c', 0.55));
const key = new THREE.SpotLight('#e9eef8', 120000, 0, 0.36, 0.3, 2); key.position.set(12, 168, -166); key.target.position.set(-2, 12, -36);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.00015; key.shadow.normalBias = 0.02; key.shadow.camera.near = 60; key.shadow.camera.far = 420;
scene.add(key, key.target);
const neonSpill = new THREE.SpotLight('#ff2a9a', 2600, 0, 0.45, 0.9, 2); neonSpill.position.set(-46, 96, -150); neonSpill.target.position.set(-6, 22, -34); scene.add(neonSpill, neonSpill.target);
const facadeMoon = new THREE.SpotLight('#b8c2d4', 90000, 0, 0.6, 0.8, 2); facadeMoon.position.set(40, 300, -110); facadeMoon.target.position.set(0, 80, FZ); scene.add(facadeMoon, facadeMoon.target);
const fill = new THREE.PointLight('#cfd5df', 7000, 0, 2); fill.position.set(70, 90, 90); scene.add(fill);
const floorKey = new THREE.SpotLight('#dfe5ef', 0, 0, 0.26, 0.9, 2); floorKey.position.set(-8, 118, 46); floorKey.target.position.set(-6, 4, -9); scene.add(floorKey, floorKey.target);   // the last shot: a pool on him and the cat
const rim = new THREE.SpotLight('#dfe4ee', 9000, 0, 0.42, 0.6, 2); rim.position.set(-12, 72, -58); rim.target.position.set(-6, 18, -36); scene.add(rim, rim.target);   // a cold edge on him, from behind

// ------------------------------------------------------------------ Toko Slomo: the grown-up Toko in a black chef's jacket, grey hair swept back, the mask
const SLOMO = (() => {
  const m = { hoodie: M.jacket, hoodie2: M.jacket, arms: M.jacket, cuff: M.jacket, jeans: M.trousers, shoes: M.shoes, sole: M.sole, glove: M.glove, hair: M.hair,
    maskDisc: M.maskDisc, maskInk: M.maskInk, strap: M.strap, string: M.jacket, aglet: M.jacket };
  const tk = new Toko(m), wrap = new THREE.Group(); wrap.add(tk.group); scene.add(wrap);
  tk.hood.visible = false; tk.pocket.visible = false; tk.head.children[4].visible = false;
  for (let i = 0; i < 7; i++) { const x = -3 + i;                                       // swept straight back off the forehead
    mesh0(lumpy(sausage([[x * 0.82, 3.2, 2.6], [x * 1.0, 4.75, 0.6], [x * 0.96, 4.2, -2.4], [x * 0.74, 2.5, -4.3]], [0.95, 1.08, 0.92, 0.45], { up: [0, 0, 1], steps: 24 }), 0.05, 1, 500 + i), M.hair, { parent: tk.head }); }
  const btn = []; for (let i = 0; i < 6; i++) btn.push(mesh0(lumpy(ball(0.46, 1, 1, 0.55, 16), 0.02, 1, 520 + i), M.button, { parent: tk.group }));
  return { tk, wrap, btn };
})();
const BASIS = {
  bed: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V([0, 0, -1]), V([-1, 0, 0]), V([0, 1, 0]))),   // on his back along x, head to −x
};
/** Toko Slomo on his back, hip at hipW: a = how far his back is raised (rad), f = how far his shins are, hy/hp = his head */
function lie(hipW, { a = 0, f = 0, hy = 0, hp = 0.35, q = BASIS.bed, breathe = 0 } = {}) {
  const c = SLOMO; c.wrap.visible = true; c.wrap.position.set(...hipW); c.wrap.quaternion.copy(q);
  const ar = 0.75 * a, rot = (v) => { const y = v[1] - 3, z = v[2]; return [v[0], 3 + y * Math.cos(ar) - z * Math.sin(ar), y * Math.sin(ar) + z * Math.cos(ar)]; };
  c.tk.pose({ hip: [0, 0, 0], yaw: 0, lean: a, side: 0, hp, hr: 0, hy, breathe,
    knee: [0, -10.4, -1.6], foot: [0, -10.4 - 10.35 * Math.cos(f), -1.8 + 10.35 * Math.sin(f)], shoePitch: 0,
    elR: rot([-6.2, 8.4, 3.8]), hdR: rot([2.6, 10.6, 6.2]), elL: rot([6.2, 9.0, 3.8]), hdL: rot([-2.6, 11.8, 5.8]), palm: [[0, 0, 1], [0, 0, 1]] });
  const A = c.tk.anchor;                                                              // the jacket's two rows of buttons, riding the torso's lean
  c.btn.forEach((b, i) => { const row = Math.floor(i / 2), side = i % 2 ? 1 : -1, k = 0.18 + row * 0.27, ang = a * (0.4 + row * 0.2);
    const p = lerp3(A.H0, A.H2, k), D = 4.5 * (1.0 - row * 0.05) * 0.94;
    b.position.set(p[0] + side * 1.7, p[1] - Math.sin(ang) * D, p[2] + Math.cos(ang) * D); b.rotation.set(-ang, 0, 0); });
  c.wrap.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ the cat: white, curled into a loaf, asleep, breathing
const CAT = (() => {
  const g = new THREE.Group(); scene.add(g);
  mesh0(lumpy(ball(4.2, 1.3, 0.62, 1.0, 40), 0.2, 0.5, 600), M.cat, { parent: g });
  const head = new THREE.Group(); head.position.set(3.9, 1.4, 1.6); g.add(head);
  mesh0(lumpy(ball(2.1, 1.08, 0.9, 1.0, 32), 0.1, 0.6, 601), M.cat, { parent: head });
  g.userData.ears = [-1, 1].map((s) => mesh0(lumpy(new THREE.ConeGeometry(0.85, 1.7, 10).translate(0, 0.85, 0), 0.03, 1, 602 + s), M.cat, { pos: [s * 1.1, 1.3, -0.2], rot: [-0.15, 0, -s * 0.35], parent: head }));
  for (const s of [-1, 1]) mesh0(new THREE.TorusGeometry(0.42, 0.1, 6, 12, Math.PI).rotateZ(Math.PI), M.catDark, { pos: [s * 0.78, 0.35, 1.95], parent: head, cast: false });
  mesh0(ball(0.28, 1.2, 0.8, 0.8, 10), M.catDark, { pos: [0, -0.25, 2.1], parent: head, cast: false });
  mesh0(lumpy(sausage([[-4.6, 0.2, -1.2], [-3.4, 0.4, 3.0], [0.4, 0.5, 4.1], [3.2, 0.3, 3.6]], [1.05, 0.9, 0.7, 0.5], { steps: 40 }), 0.05, 1, 605), M.cat, { parent: g });
  return g;
})();

// ------------------------------------------------------------------ the timeline: 72 BPM (a slow noir), cuts on the beat; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 72, FPS = 30;
const BEATS = [['s1', 0], ['s2', 6 * B], ['s3', 13 * B], ['s4', 17 * B], ['s5', 22 * B], ['end', 29 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { down: popOf('night'), flat: popOf('flat'), heat: popOf('heat'), notif: popOf('backup') - 0.05, card: capOf('last').t0 };
EV.fold0 = T.s2 + 0.45; EV.fold1 = EV.fold0 + 3.0; EV.look = EV.flat - 0.25; EV.wake = T.s4 + 0.3; EV.thump = EV.fold1;
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...EV, ...CAP.events(P), quiet: [] };
const twos = (t) => Math.floor(t * 12) / 12;
const FOLD = { h: 0.86, f: 0.72 };
const foldAt = (t) => { const k = ease.io((t - EV.fold0) / (EV.fold1 - EV.fold0)); return [FOLD.h * k, FOLD.f * k]; };
const ON_BED = [-3, BED.top + BED.mt + 5.05, BED.z];
const ON_FLOOR = [-1, 5.1, -9];

// ------------------------------------------------------------------ the shots
const SHOT = [
  { // 1 · the window, the rain and the neon; down to the bed; on "down" the strip starts CONNECTING…
    t0: () => T.s1, t1: () => T.s2,
    set(t) { fold(0, 0); lie(ON_BED, { breathe: Math.sin(t * 1.6) }); drawStrip(t, t >= EV.down); },
    cam(t) { const k = ease.io((t - 0.4) / (EV.down - 0.2 - 0.4)), d = ease.io((t - EV.down) / (T.s2 - EV.down));
      const pos = V(lerp3([8, 80, 4], [44, 56, 62], k)).add(V([-3 * d, -1.5 * d, -5 * d])), at = V(lerp3([6, 68, -62], [-6, 12, -36], k));
      return { pos, at, fov: lerp(44, 36, k), focus: lerp(pos.distanceTo(at), pos.distanceTo(V([14, 6, -25])), ease.io((t - EV.down + 0.4) / 0.5)), ap: lerp(3, 7, k) }; } },
  { // 2 · wide: the base folds him up like a taco; arms crossed; on "flat" he turns to the lens
    t0: () => T.s2, t1: () => T.s3,
    set(t) { const [h, f] = foldAt(t), look = ease.io((t - EV.look) / 0.5); fold(h, f);
      lie(rotOnBed(h, t), { a: h * LEAN, f, hy: -1.05 * look, hp: 0.35 - 0.3 * clamp(h / FOLD.h) - 0.05 * look }); drawStrip(t, true); },
    cam(t, lt, d) { const k = ease.io(lt / d), pos = V([lerp(26, 22, k), lerp(46, 44, k), lerp(150, 138, k)]), at = V([-1, 24, -40]);
      return { pos, at, fov: 38, focus: pos.distanceTo(V([-3, 20, -34])), ap: 5 }; } },
  { // 3 · across the street: steam out of three windows; on "heating" it swells
    t0: () => T.s3, t1: () => T.s4,
    set(t) { const [h, f] = foldAt(t); fold(h, f); lie(rotOnBed(h), { a: h * LEAN, f, hy: -1.05, hp: 0.0 }); drawStrip(t, true); },
    cam(t, lt, d) { const k = ease.io(lt / d), pos = V([lerp(10, 6, k), lerp(74, 78, k), -96]), at = V([lerp(4, 2, k), lerp(98, 104, k), FZ]);
      return { pos, at, fov: 52, focus: pos.distanceTo(V([0, 100, FZ])), ap: 3 }; } },
  { // 4 · the phone on the nightstand lights: BACKUP MODE
    t0: () => T.s4, t1: () => T.s5,
    set(t) { const [h, f] = foldAt(t); fold(h, f); lie(rotOnBed(h), { a: h * LEAN, f, hy: -1.05, hp: 0.0 }); drawStrip(t, true); },
    cam(t, lt, d) { const k = ease.io(lt / d), ph = PHONE.position, pos = V([ph.x + lerp(10, 8.5, k), ph.y + lerp(12, 10.5, k), ph.z + lerp(11, 9.5, k)]);
      return { pos, at: V([ph.x - 0.2, ph.y + 0.3, ph.z - 0.6]), fov: 30, focus: pos.distanceTo(ph), ap: 11 }; } },
  { // 5 · on the floor with the cat on his chest, the apron for a pillow; the bed behind, folded, still connecting. Toko's card.
    t0: () => T.s5, t1: () => T.end, floor: true,
    set(t) { fold(FOLD.h, FOLD.f); lie(ON_FLOOR, { hp: 0.42, breathe: Math.sin(t * 1.3) }); drawStrip(t, true); },
    cam(t, lt, d) { const k = ease.io(lt / d), pos = V([lerp(6, 4, k), lerp(84, 78, k), lerp(118, 108, k)]), at = V([-2, lerp(0, 2, k), -8]);
      return { pos, at, fov: 38, focus: pos.distanceTo(V(ON_FLOOR)), ap: 4.5 }; } },
];
/** his hip rides back as the head of the bed comes up (it hinges just behind him) */
/** as the head of the bed comes up his back rides it: the torso leans further than the section (its lean is spread over
 *  three segments, so the chest only reaches ~3/4 of it), and the pelvis slides into the crease and lifts a little */
const LEAN = +(Q.get('lean') || 1.42), HIPX = +(Q.get('hipx') || -2.0), HIPY = +(Q.get('hipy') || 1.8);
function rotOnBed(h, t = -1) { const st = t >= EV.fold1 ? -0.7 * Math.exp(-(t - EV.fold1) * 5) * Math.cos((t - EV.fold1) * 16) : 0;   // he settles when the motor stops
  return [ON_BED[0] + Math.sin(h) * HIPX, ON_BED[1] + Math.sin(h) * HIPY + st, ON_BED[2]]; }
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };

// the floor: the apron folded under his head, the cat on his chest
const PILLOW = mesh(lumpy(new RoundedBoxGeometry(11, 2.6, 8, 3, 1.1), 0.3, 0.3, 960), M.apron, { pos: [ON_FLOOR[0] - 23.5, 1.3, ON_FLOOR[2]] });

// his glove, reaching over from the bed for the phone: the magenta mitt, a thumb, the black jacket's sleeve and cuff
const REACH = new THREE.Group(); scene.add(REACH); REACH.visible = false;
mesh0(lumpy(ball(1.5, 1.28, 0.74, 1.08, 24), 0.06, 0.8, 640), M.glove, { parent: REACH });
mesh0(lumpy(sausage([[0.3, 0.15, 0.95], [-0.45, 0.4, 1.45], [-1.15, 0.55, 1.35]], [0.55, 0.48, 0.42], { up: [0, 1, 0] }), 0.03, 1, 641), M.glove, { parent: REACH });
mesh0(lumpy(sausage([[1.4, 0.3, 0], [6, 2.6, -0.4], [14, 6.5, -1]], [1.7, 1.9, 2.0], { up: [0, 1, 0] }), 0.08, 0.5, 642), M.jacket, { parent: REACH });
mesh0(new THREE.TorusGeometry(1.45, 0.6, 10, 24).rotateY(Math.PI / 2), M.jacket, { pos: [1.5, 0.35, 0], parent: REACH });

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = S.t1() - t0, lt = t - t0, tq = twos(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0);
  setBoil(Math.floor(t * 12));
  S.set(tq);
  floorKey.intensity = S.floor ? 72000 : 0;
  HOOK.visible = true; APRON_HUNG.visible = APRON_TIE.visible = !S.floor; PILLOW.visible = !!S.floor;
  CAT.visible = !!S.floor;
  if (S.floor) { const A = SLOMO.tk.anchor, ch = lerp3(A.H1, A.H2, 0.5), w = SLOMO.wrap.localToWorld(V([ch[0], ch[1], ch[2] + 4.2]));
    CAT.position.copy(w).add(V([0, 2.2, 0])); CAT.rotation.set(0, 0.25, 0); CAT.scale.set(1, 1 + 0.035 * Math.sin(tq * 2.6), 1);
    const tw = Math.max(0, Math.sin((tq - T.s5 - 1.4) * 9)) * (tq > T.s5 + 1.4 && tq < T.s5 + 1.75 ? 1 : 0); CAT.userData.ears[1].rotation.set(-0.15 - tw * 0.5, 0, -0.35 - tw * 0.3); }   // an ear flicks once
  // the phone wakes in shot 4 and stays lit on the stand after
  const wake = i >= 3 ? clamp((t - EV.wake) / 0.25) : 0, note = i >= 3 ? clamp(t - EV.notif) : 0;
  drawPhone(wake, note); phoneLight.position.copy(PHONE.position).add(V([0.6, 2.2, 1.2])); phoneLight.intensity = 26 * wake;
  { const bz = [0, 0.55].some((d) => t >= EV.notif + d && t < EV.notif + d + 0.42) ? 1 : 0;                          // the two buzzes the score plays
    PHONE.position.set(STAND[0] + 0.6 + bz * 0.06 * Math.sin(t * 190), 18.25, STAND[2] + 2.4 + bz * 0.05 * Math.cos(t * 170)); PHONE.rotation.y = 0.28 + bz * 0.02 * Math.sin(t * 150);
    const r = i === 3 ? ease.io((tq - EV.notif - 1.9) / 0.55) : 0; REACH.visible = r > 0.01;                          // once it has been read, his glove comes over from the bed, behind the phone, to its far edge
    if (REACH.visible) { REACH.position.copy(V(lerp3([STAND[0] + 11, 21.5, STAND[2] - 6], [STAND[0] + 2.6, 19.0, STAND[2] - 0.6], r))); REACH.rotation.set(0, 0.55, -0.15 + r * 0.15); REACH.scale.setScalar(0.72); } }
  // across the street: the steam, the fans, the sign's flicker, the rain
  steam(t, clamp(0.35 + (t >= EV.heat ? 0.65 * ease.out((t - EV.heat) / 0.6) : 0)));
  for (const s of SIL) s.fan.rotation.z = Math.sin(tq * 9 + s.ph) * 0.6;
  const fl = (Math.sin(t * 37) > 0.93 && Math.sin(t * 3.1) > 0.4) ? 0.45 : 1;
  signMat.color.setRGB(2.6 * fl, 0.02, 1.25 * fl); signLight.intensity = 3200 * fl; neonSpill.intensity = 2600 * fl;
  rainAt(t);
  scene.updateMatrixWorld(true);
  const L = S.cam(t, lt, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: L.focus, aperture: Q.get('nodof') ? 0 : L.ap, maxBlur: 28, radScale: 0.9,
    threshold: 1.0, knee: 0.45, bloomA: 0.32, bloomB: 0.24, exposure: 1.3, vignette: 0.42, grain: 0.04, seed: Math.floor(t * 24),
    sat: 1.0, contrast: 1.14, lift: [0.006, 0.006, 0.008], gain: [1.0, 1.0, 1.02], toe: 0.05 });
  g2d.drawImage(renderer.domElement, 0, 0);
  if (captions) CAP.draw(g2d, P, t, {});
  return out2d;
}
const keep = () => [];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep }), ui: {} },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
