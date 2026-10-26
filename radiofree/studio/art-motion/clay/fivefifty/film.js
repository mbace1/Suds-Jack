// FIVE IS THE NEW FIFTY — the Toko set, film 3 of 4 (plan/films/27-toko-ai-dev-set.md, "Film 3", 26 Oct). The shared
// studio (../studio/set.js), its desk widened for five: Toko in the middle, magenta as ever, and four teammates with the
// same canon face in four carrier colours (BRAND §2c: the original can be any carrier; here the colours say "the team").
//   1 frame 0: five at one long desk, typing in sync, seen down the desk's length
//   2 the back wall flies out like a theatre flat: behind it, a ghost hall of empty desks fading into fog. Each
//     teammate's laptop puts out a cardboard part, which lands on the desk in front of it
//   3 Toko's laptop offers film 1's "One more change?"; he shakes his head, shuts the lid and pushes it away. A cardboard
//     box unfolds where it stood, the four parts fly in, and his paddles press them home. The ghost monitors go dark,
//     row by row, back to front
//   4 the little arcade cabinet lights up; all five turn to it. The wall flies back in
//   card · Toko's card: SMALL TEAMS. / BIG DECISIONS. Held ≥ 4 s.
// House rules (owner, films 1–2): hands are rounded paddles with NO thumbs and always touch what they hold; every screen
// is a pure function of time; captions at the big size; the AI is generic; no numbers on screen (the post copy carries
// the one sourced figure). 1080×1920, 30 fps, the puppets on twos; camera, light, parts and drones every frame.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../welcome/lib/post.js';
import { surface, setBoil } from '../welcome/lib/clay.js';
import { lumpy, ball, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex } from '../welcome/lib/city.js';
import { drawMasterBadge } from '../welcome/lib/master.js';
import { Toko } from '../welcome/lib/toko.js';
import { buildStudio, laptopAt, chairAt, SEAT, DESK as DESK0 } from '../studio/set.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['IPAPGothic', 'IPAPGothic.ttf'], ['NotoSansJP-800', 'NotoSansJP-800.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.6, 3000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), in: (k) => Math.pow(clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const MAG = '#f0027f';

// ------------------------------------------------------------------ clays (the house plasticine, as films 1–2)
const C = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffd8b8', rough: 0.68, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 2.2, ridge: 0.12, tool: 0.7, grain: 0.004, grainF: 8, mottle: 0.08, specks: 0.35, roughVar: 0.1, ...o });
const BASE = {
  hoodie: C('#26404a', { thumbCell: 1.6, thumb: 0.035, tool: 1.0, mottle: 0.06 }), jeans: C('#2f3646', { thumbCell: 1.8, tool: 0.7 }),
  shoes: C('#e8e1d2', { rough: 0.45 }), sole: C('#cfc6b4', { thumb: 0.02 }),
  hair: C('#2a211c', { tool: 1.3, thumbCell: 0.9, thumb: 0.045 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
  strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'), cuff: C('#21363f', { thumbCell: 1.2 }),
};
BASE.hoodie2 = BASE.hoodie; BASE.arms = BASE.hoodie;

// ------------------------------------------------------------------ the five: Toko in the middle, magenta; four carriers (STICKER)
// x along the desk; the carriers chosen to read apart from magenta and from each other at a glance
const TEAM = [
  { x: -40, col: '#4cb7e2', name: 'sky' }, { x: -20, col: '#f07d12', name: 'orange' }, { x: 0, col: MAG, name: 'toko' },
  { x: 20, col: '#8dc21f', name: 'lime' }, { x: 40, col: '#7c1d96', name: 'purple' },
];
const DESK = { ...DESK0, x0: -54, x1: 54 };

// ------------------------------------------------------------------ the studio, widened; one chair each; one laptop each
const S = buildStudio(scene, C, { desk: { x0: DESK.x0, x1: DESK.x1 }, chair: false });
TEAM.forEach((m, i) => chairAt(scene, S.M, m.x, 1950 + i * 10));
// the studio's own laptop (x 0) is Toko's; four more for the team
const LAPS = TEAM.map((m, i) => (m.x === 0 ? { LAPTOP: S.LAPTOP, LID: S.LID, SCREEN: S.SCREEN, scrCan: S.scrCan, scrTex: S.scrTex } : laptopAt(scene, S.M, [m.x, DESK.y, 15], 1960 + i * 2)));
// his lamp and thermos move to the far end, out of the line of five; the phone stays in his pocket
S.THERMOS.position.set(-46, DESK.y, 25); S.PHONE.visible = false; S.LAMP.position.set(-52, DESK.y, 31);
S.lampLight.position.set(-42, DESK.y + 18, 26); S.lampLight.target.position.set(-6, DESK.y, 14);
// the back wall is already faintly see-through: the hall shows behind it from frame 0 (its own material, film 2's is untouched)
const WALL_SEE = S.M.wall.clone(); WALL_SEE.transparent = true; WALL_SEE.opacity = 0.72;
S.WALL.traverse((o) => { if (o.isMesh && o.material === S.M.wall) o.material = WALL_SEE; });
const FOG = new THREE.Color('#4a4458'); scene.fog = new THREE.FogExp2(FOG, 0.0016); scene.background = FOG.clone();

const PUPS = TEAM.map((m, i) => {
  const TM = { ...BASE, glove: C(m.col, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }), maskDisc: C(m.col, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }) };
  const T = new Toko(TM), WR = new THREE.Group(); WR.add(T.group); scene.add(WR); WR.position.set(m.x, 0, 0);
  T.parts.armL.material = T.parts.armR.material = TM.arms; T.hood.visible = true; T.pocket.visible = true;
  T.head.children[4].visible = false;                                   // no bun
  T.hands.forEach((h) => { h.children[1].visible = false; });          // owner (film 1): paddles, no thumbs, every shot
  return { ...m, i, T, WR };
});
const HIP = [0, SEAT + 1.2, 0], at = (v) => [HIP[0] + v[0], HIP[1] + v[1], HIP[2] + v[2]];
const SIT = { knee: [0, -0.8, 11], foot: [0, -(SEAT + 1.2) + 0.75, 12.6], shoePitch: 0 };
function basePose(o = {}) {
  return { hip: HIP, yaw: 0, lean: o.lean ?? 0.3, side: o.side ?? 0, ...SIT, hp: o.hp ?? 0.35, hr: o.hr ?? 0, hy: o.hy ?? 0, breathe: o.breathe ?? 0,
    elR: at([-6.2, 5.0, 7.5]), elL: at([6.2, 5.0, 7.5]), hdR: at([-3, 8, 12]), hdL: at([3, 8, 12]), palm: [[0.4, 1, 0.1], [-0.4, 1, 0.1]] };
}
/** both hands to WORLD targets (each touching something), palms along the given world directions */
function handsTo(P, pz, wR, wL, nR = [1, 0, 0], nL = [-1, 0, 0]) {
  P.WR.updateMatrixWorld(true); const toL = (w) => P.T.group.worldToLocal(V(w)).toArray();
  pz.hdR = toL(wR); pz.hdL = toL(wL); pz.palm = [nR, nL]; return pz;
}
/** on the keys of its own laptop; the tap is in sync across the five (they type to the beat) */
const B = 60 / 112, FPS = 30;
function typing(P, pz, t, sync = 1) {
  const ph = sync ? 0 : P.i * 0.9, tap = (k) => Math.max(0, Math.sin((t / B) * Math.PI + k + ph)) * 0.55;
  return handsTo(P, pz, [P.x - 3.2, DESK.y + 1.9 + tap(0), 13.2], [P.x + 3.2, DESK.y + 1.9 + tap(Math.PI), 13.2], [0.2, -1, 0.2], [-0.2, -1, 0.2]);
}
const yawTo = (P, x, z) => clamp(Math.atan2(x - P.x, z - 0) * 0.85, -0.8, 0.8);   // + turns the face toward +x (probed: dbg(t).faces)

// ------------------------------------------------------------------ the ghost hall: ~50 empty desks, cold and translucent, into fog
const GHOST = new THREE.Group(); scene.add(GHOST);
const ROWS = 10, COLS = [-130, -66, -2, 62, 126], GZ0 = -64, GDZ = -42;
const ghostMat = (o) => new THREE.MeshStandardMaterial({ color: '#c6d4e8', roughness: 0.9, emissive: '#2a3448', emissiveIntensity: 0.6, transparent: true, opacity: o, depthWrite: false });
const screenOn = new THREE.Color(0.55, 0.85, 1.35), screenOff = new THREE.Color('#141a26');
const GROWS = [];
for (let r = 0; r < ROWS; r++) {
  const op = lerp(0.6, 0.18, r / (ROWS - 1)), m = ghostMat(op), sm = new THREE.MeshBasicMaterial({ color: screenOn.clone(), transparent: true, opacity: lerp(0.95, 0.35, r / (ROWS - 1)), depthWrite: false });
  const z = GZ0 + r * GDZ;
  for (const [ci, x0] of COLS.entries()) { const x = x0 + (r % 2 ? 12 : 0) + (ci - 2) * r * 3;
    mesh0(new THREE.BoxGeometry(30, 1.6, 14), m, { pos: [x, DESK.y - 0.8, z], parent: GHOST, cast: false, recv: false });
    for (const sx of [-13.5, 13.5]) mesh0(new THREE.BoxGeometry(1.4, DESK.y - 1.6, 1.4), m, { pos: [x + sx, (DESK.y - 1.6) / 2, z], parent: GHOST, cast: false, recv: false });
    mesh0(new THREE.BoxGeometry(12, 8, 1), m, { pos: [x, DESK.y + 5.4, z - 3.5], parent: GHOST, cast: false, recv: false });
    mesh0(new THREE.PlaneGeometry(10.6, 6.6), sm, { pos: [x, DESK.y + 5.4, z - 2.95], parent: GHOST, cast: false, recv: false });
    mesh0(new THREE.BoxGeometry(12, 1.4, 11), m, { pos: [x, SEAT - 1, z - 14], parent: GHOST, cast: false, recv: false });
    mesh0(new THREE.BoxGeometry(11, 9, 1.2), m, { pos: [x, SEAT + 6.5, z - 20], parent: GHOST, cast: false, recv: false });
  }
  GROWS.push({ m, sm, op });
}
// the hall's floor, carrying on past the studio's planks into the fog
mesh0(new THREE.PlaneGeometry(520, 520).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5c566a', roughness: 1 }), { pos: [0, -0.02, -330], parent: GHOST, cast: false });

// ------------------------------------------------------------------ the cardboard arcade: a box that unfolds, four parts that fly in
const CARD = C('#c49a62', { tool: 1.1, thumbCell: 1.6, thumb: 0.03, mottle: 0.14, specks: 0.5, speckColor: '#8a6a3e' });
const CARD_D = C('#a8814e', { tool: 1.1, thumbCell: 1.6, mottle: 0.14 });
const CAB = [0, DESK.y, 14];                                    // where his laptop stood
const K = 0.74;                                                 // a desk-sized model: below his face, so the camera finds him over it
const CORE = new THREE.Group(); scene.add(CORE); CORE.position.set(...CAB);
mesh0(lumpy(new RoundedBoxGeometry(8, 13, 7, 3, 0.4), 0.03, 0.8, 1801), CARD, { pos: [0, 6.5, 0], parent: CORE });
// the screen in the core's front: dark until the cabinet is whole, then the game (a pure function of t)
const GS = 256, gCan = canvas(GS, GS * 0.8), gTex = tex(gCan);
mesh0(new THREE.PlaneGeometry(6.2, 4.96), new THREE.MeshBasicMaterial({ map: gTex, toneMapped: false }), { pos: [0, 9.6, 3.52], parent: CORE, cast: false });
mesh0(lumpy(new RoundedBoxGeometry(7.0, 5.9, 0.4, 2, 0.15), 0.02, 1, 1802), CARD_D, { pos: [0, 9.6, 3.32], parent: CORE });
// the four parts, each from a teammate's laptop: two sides, the control deck, the marquee. `slot` is its place on the core
const mCan = canvas(256, 80), mTex = tex(mCan);
const PARTS = [
  { who: 0, name: 'sideL', size: [0.7, 15, 9], slot: [-4.4, 7.5, 0.6], rot: [0, 0, 0], flat: [0, 0, -Math.PI / 2] },
  { who: 4, name: 'sideR', size: [0.7, 15, 9], slot: [4.4, 7.5, 0.6], rot: [0, 0, 0], flat: [0, 0, Math.PI / 2] },
  { who: 1, name: 'deck', size: [8.6, 0.8, 4.2], slot: [0, 6.0, 5.0], rot: [0.32, 0, 0] },
  { who: 3, name: 'marquee', size: [8.6, 2.8, 2.4], slot: [0, 14.2, 2.4], rot: [0, 0, 0] },
].map((p, k) => {
  const g = new THREE.Group(); scene.add(g); g.scale.setScalar(K);
  const m = TEAM[p.who], ink = C(m.col, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.05, specks: 0.2 });   // each part carries its maker's colour
  mesh0(lumpy(new RoundedBoxGeometry(...p.size, 2, 0.2), 0.03, 0.8, 1810 + k), p.name === 'marquee' ? ink : CARD, { parent: g });
  if (p.name === 'deck') {   // the joystick and two buttons
    mesh0(new THREE.CylinderGeometry(0.22, 0.22, 1.8, 10), C('#1e1e22'), { pos: [-2.2, 1.2, 0], parent: g });
    mesh0(ball(0.7, 1, 1, 1, 14), C('#e0141b', { rough: 0.35, clearcoat: 0.6 }), { pos: [-2.2, 2.2, 0], parent: g });
    mesh0(lumpy(new RoundedBoxGeometry(8.0, 0.3, 3.6, 2, 0.12), 0.02, 1, 1830), ink, { pos: [0, 0.4, 0], parent: g });   // the play surface
    for (const [bx, col] of [[1.4, '#f5c400'], [3.0, '#4cb7e2']]) mesh0(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16), C(col, { rough: 0.35, clearcoat: 0.6 }), { pos: [bx, 0.6, 0.2], parent: g });
  }
  if (p.name === 'marquee') mesh0(new THREE.PlaneGeometry(8.0, 2.3), new THREE.MeshBasicMaterial({ map: mTex, toneMapped: false }), { pos: [0, 0, p.size[2] / 2 + 0.03], parent: g, cast: false });
  if (p.name === 'sideL' || p.name === 'sideR') {   // a cut-out curve on the side, drawn as a darker card strip
    const o = p.name === 'sideL' ? -1 : 1;
    mesh0(new THREE.BoxGeometry(0.2, 9, 0.6), CARD_D, { pos: [o * 0.42, 6, 4.2], parent: g });
    mesh0(lumpy(new RoundedBoxGeometry(0.24, 6.5, 8.2, 2, 0.1), 0.02, 1, 1840 + k), ink, { pos: [o * 0.4, -3.6, 0], parent: g });   // side art: a field of colour on the outer face
    mesh0(lumpy(new RoundedBoxGeometry(0.24, 0.9, 8.2, 2, 0.1), 0.02, 1, 1850 + k), ink, { pos: [o * 0.4, 0.9, 0], parent: g });
    mesh0(lumpy(new RoundedBoxGeometry(1.0, 15.2, 0.5, 2, 0.2), 0.02, 1, 1860 + k), ink, { pos: [0, 0, 4.45], parent: g });   // T-molding: the front edge reads from the front
  }
  return { ...p, g, mouth: [m.x, DESK.y + 11.2, 16.4], rest: [m.x * 0.92, DESK.y + (Math.min(...p.size) / 2 + 0.3) * K, 29] };
});

// ------------------------------------------------------------------ the timeline: 112 BPM; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 8 * B], ['s3', 16 * B], ['s4', 24 * B], ['s5', 30 * B], ['end', 38 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
const UI = P.ui;
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { card: T.s5 };
EV.flyOut = T.s2 + 0.15;                                         // the wall flies out over 1.2 s
EV.pop = (k) => T.s2 + 1.5 + k * ((T.s3 - T.s2 - 2.1) / 3);      // the four parts pop out of the teammates' laptops
EV.chip = T.s3 + 0.15; EV.shake = T.s3 + 0.6;                    // One more change? … no
EV.ots = T.s3 + 1.6;                                             // the over-shoulder cut ends here
EV.close = T.s3 + 1.7; EV.push = EV.close + 0.45;                // he shuts the lid and pushes it away
EV.core = EV.push + 0.45;                                        // the box unfolds where it stood
EV.fly = (k) => EV.core + 0.45 + k * 0.32;                       // the four parts fly in
const SIDES_HOME = EV.fly(1) + 0.45;                              // both sides are home
EV.dark = (r) => T.s3 + 0.4 + (ROWS - 1 - r) * ((T.s4 - T.s3 - 0.6) / ROWS);   // ghost monitors off, back row first
EV.lit = popOf('deciding') - 0.25;                               // the cabinet comes alive on "deciding"
EV.flyIn = T.s5 - 1.6;                                           // the wall flies back in before the card
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...Object.fromEntries(Object.entries(EV).filter(([, v]) => typeof v === 'number')), ...CAP.events(P), quiet: [] };
const twos = (t) => Math.floor(t * 12) / 12;

/** the wall: 0 in place, 1 flown out (up and away, like a theatre flat on its lines) */
const wallK = (t) => ease.io((t - EV.flyOut) / 1.2) * (1 - ease.io((t - EV.flyIn) / 1.2));

/** where a part is, its turn, and whether it shows */
function partState(p, k, t) {
  const tPop = EV.pop(k), tFly = EV.fly(k);
  const vis = t >= tPop - 0.02, kOut = clamp((t - tPop) / 0.6);
  let pos = lerp3(p.mouth, p.rest, ease.io(kOut)); pos[1] += Math.sin(kOut * Math.PI) * 10;
  // lying flat in front of its laptop: the tall sides lie down on their faces
  const flat = p.flat || [0, 0, 0];   // colour side up
  let rot = [flat[0] + (1 - ease.out(kOut)) * 2.0, flat[1], flat[2]];
  const kIn = clamp((t - tFly) / 0.55);
  if (kIn > 0) { const slot = [CAB[0] + p.slot[0] * K, CAB[1] + p.slot[1] * K, CAB[2] + p.slot[2] * K];
    pos = lerp3(p.rest, slot, ease.io(kIn)); pos[1] += Math.sin(kIn * Math.PI) * 9;
    rot = lerp3(flat, p.rot, ease.io(kIn)); }
  return { pos, rot, vis };
}
/** Toko's laptop: lid open → shut, then pushed forward out of the way */
function tokoLaptop(t) {
  const kc = ease.io((t - EV.close) / 0.4), kp = ease.io((t - EV.push) / 0.45);
  return { lid: lerp(0.18, -1.52, kc), pos: [0, DESK.y, lerp(15, 25.5, kp)] };
}
/** where a paddle presses a side panel home: just outside the panel's outer face */
const SIDE = (s) => [CAB[0] + s * (4.75 * K + 1.1), CAB[1] + 7.0 * K, CAB[2] + 0.4 * K];
/** the core box: flat-packed, it pops up and unfolds */
const coreK = (t) => ease.back((t - EV.core) / 0.45);

// ------------------------------------------------------------------ screens
function drawCode(P, t) {   // a teammate's laptop: lines of code scrolling — the generic AI working; pure function of t
  const L = LAPS[P.i], g = L.scrCan.getContext('2d'), w = L.scrCan.width, h = L.scrCan.height;
  g.fillStyle = '#0f0e14'; g.fillRect(0, 0, w, h);
  const off = (t * 40 + P.i * 31) % 28;
  for (let k = 0; k < 12; k++) { const y = 30 + k * 28 - off; g.fillStyle = k % 3 ? 'rgba(255,255,255,.14)' : P.col; g.globalAlpha = k % 3 ? 1 : 0.6; g.fillRect(24 + (k % 4) * 16, y, 110 + ((k * 53 + P.i * 17) % 280), 10); }
  g.globalAlpha = 1; L.scrTex.needsUpdate = true;
}
function drawTokoScreen(t) {   // his: the same, until the AI asks film 1's question
  const L = LAPS[2], g = L.scrCan.getContext('2d'), w = L.scrCan.width, h = L.scrCan.height;
  drawCode(PUPS[2], t);
  const k = clamp((t - EV.chip) / 0.25); if (k <= 0) return;
  g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(15,14,20,.88)'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = '800 46px Inter'; g.textAlign = 'center'; g.fillText(UI.more, w / 2, 130);
  const no = clamp((t - EV.shake - 0.45) / 0.15);   // he picks No: it lights as he shakes his head
  g.fillStyle = MAG; g.globalAlpha = k * (1 - no * 0.6); g.beginPath(); g.roundRect(70, 180, 160, 70, 18); g.fill();
  g.globalAlpha = k; g.fillStyle = no > 0 ? '#fff' : 'rgba(255,255,255,.25)'; g.beginPath(); g.roundRect(w - 230, 180, 160, 70, 18); g.fill();
  g.font = '800 36px Inter'; g.fillStyle = '#fff'; g.fillText(UI.yes, 150, 228); g.fillStyle = no > 0 ? '#0f0e14' : '#fff'; g.fillText(UI.no, w - 150, 228);
  g.restore(); L.scrTex.needsUpdate = true;
}
function drawGame(t, on) {      // the cabinet's game: a drop dodging falling blocks (the house game), and a score that only climbs
  const g = gCan.getContext('2d'), w = gCan.width, h = gCan.height;
  g.fillStyle = '#0d0b14'; g.fillRect(0, 0, w, h);
  if (on > 0) { g.globalAlpha = on;
    for (let k = 0; k < 6; k++) { const y = ((t * 70 + k * 41) % (h + 30)) - 20; g.fillStyle = ['#4cb7e2', '#f07d12', '#8dc21f', '#7c1d96', '#f5c400', '#4cb7e2'][k]; g.fillRect(18 + k * 38, y, 20, 20); }
    g.fillStyle = MAG; g.beginPath(); g.arc(w / 2 + Math.sin(t * 2.2) * 70, h - 34, 13, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.font = '800 22px Inter'; g.textAlign = 'right'; g.fillText(String(Math.floor(Math.max(0, t - EV.lit) * 37)).padStart(4, '0'), w - 12, 26); g.globalAlpha = 1; }
  gTex.needsUpdate = true;
  const m = mCan.getContext('2d'); m.fillStyle = on > 0 ? MAG : '#26261e'; m.fillRect(0, 0, 256, 80);
  m.fillStyle = on > 0 ? '#fff8f0' : 'rgba(255,248,240,.3)'; m.font = '800 50px Anton-400'; m.textAlign = 'center'; m.fillText(UI.play, 128, 60); mTex.needsUpdate = true;
}

// the drones outside the window, before the wall goes, and after it comes back
const PATHS = { 0: [[[-120, 70, -120], [60, 78, -130], T.s1 - 1, T.s2 + 1], null], 3: [[[70, 66, -120], [-130, 74, -110], T.s4 + 1.5, T.end + 3], null] };

// ------------------------------------------------------------------ poses per shot
function pose(Pp, t, sh) {
  const tq = t, br = Math.sin(t * 1.4 + Pp.i);
  if (sh === 0) return typing(Pp, basePose({ lean: 0.34, hp: 0.38, breathe: br }), tq);
  if (sh === 1) {   // the wall goes: heads come up to watch it, hands stay on the keys
    const up = ease.io((t - EV.flyOut) / 0.6) * (1 - 0.6 * ease.io((t - EV.pop(0)) / 0.6));
    return typing(Pp, basePose({ lean: 0.3 - up * 0.1, hp: 0.38 - up * 0.55, breathe: br }), tq, 0); }
  if (sh === 2) {
    if (Pp.i !== 2) {   // the team: still typing, heads turned to watch Toko's cabinet come together
      const look = ease.io((t - EV.core) / 0.5);
      return typing(Pp, basePose({ lean: 0.3, hp: 0.38, hy: look * yawTo(Pp, CAB[0], CAB[2]), breathe: br }), tq, 0); }
    // Toko: reads the chip; shakes his head; both paddles on the lid's top edge, shut; push; then on the core's sides
    const shake = clamp((t - EV.shake) / 0.7), hy = Math.sin(shake * Math.PI * 3) * 0.32 * Math.sin(shake * Math.PI);
    const pz = basePose({ lean: 0.38, hp: 0.4, hy, breathe: br }), L = tokoLaptop(t);
    if (t < EV.close - 0.25) return typing(Pp, pz, tq, 0);
    if (t < EV.core + 0.1) {   // on the lid while it shuts and while it slides: the paddles ride its top edge
      LAPS[2].LAPTOP.position.set(...L.pos); LAPS[2].LID.rotation.x = L.lid; LAPS[2].LAPTOP.updateMatrixWorld(true);
      const e = (sx) => LAPS[2].LID.localToWorld(V([sx, 9.4, -0.9])).toArray();
      const kr = clamp((t - EV.close + 0.25) / 0.25), wR = lerp3([-3.2, DESK.y + 1.9, 13.2], e(-4.2), kr), wL = lerp3([3.2, DESK.y + 1.9, 13.2], e(4.2), kr);
      return handsTo(Pp, pz, wR, wL, [0, -0.4, 1], [0, -0.4, 1]); }
    // paddles on the box's top while the two sides fly in past them; then onto the sides, pressing them home
    const ck = Math.max(0.02, coreK(t)), top = (s) => [CAB[0] + s * 2.0 * K, CAB[1] + 13 * K * ck + 1.0, CAB[2] - 0.5 * K];
    const kh = ease.io((t - EV.core - 0.05) / 0.3), last = (s) => LAPS[2].LID.localToWorld(V([s * 4.2, 9.4, -0.9])).toArray();
    const ks = ease.io((t - SIDES_HOME) / 0.22);
    const tgt = (s) => ks > 0 ? lerp3(top(s), SIDE(s), ks) : lerp3(last(s), top(s), kh);
    const nrm = (s) => ks > 0.5 ? [-s, 0, 0] : [0, -1, 0];
    return handsTo(Pp, pz, tgt(-1), tgt(1), nrm(-1), nrm(1));
  }
  // shot 4: everyone turns to the cabinet. Toko's paddles on its sides; the team's on their own laptops' edges, still
  if (Pp.i === 2) { const pz = basePose({ lean: 0.32, hp: 0.22, breathe: br });   // head up over the marquee, so the camera finds his face
    return handsTo(Pp, pz, SIDE(-1), SIDE(1), [1, 0, 0], [-1, 0, 0]); }
  const look = ease.io((t - T.s4 - 0.2) / 0.5), nod = Math.max(0, Math.sin((t - EV.lit) * 6)) * clamp((t - EV.lit) / 0.2) * (1 - clamp((t - EV.lit - 1.1) / 0.3)) * 0.12;
  const pz = basePose({ lean: 0.3, hp: 0.4 - look * 0.22 + nod, hy: look * yawTo(Pp, CAB[0], CAB[2]), breathe: br });
  return handsTo(Pp, pz, [Pp.x - 6.0, DESK.y + 1.3, 15], [Pp.x + 6.0, DESK.y + 1.3, 15], [0.6, -1, 0], [-0.6, -1, 0]);   // paddles on the laptop base's two ends
}

// ------------------------------------------------------------------ the shots
const LOOK0 = { pos: [150, 110, 120], at: [2, 30, 4], fov: 36 };   // down the desk's length on a long lens, so all five fit a vertical frame
const SHOT = [
  { t0: () => T.s1, t1: () => T.s2,   // 1 · frame 0: down the desk's length, five typing in sync
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3(LOOK0.pos, [142, 104, 113], k)), at: V(LOOK0.at), fov: LOOK0.fov, focus: 200, ap: 1.4 }; } },
  { t0: () => T.s2, t1: () => T.s3,   // 2 · up and back as the wall flies: the hall, the five small against it
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([150, 116, 126], [132, 112, 150], k)), at: V(lerp3([2, 32, 0], [-4, 30, -20], k)), fov: lerp(37, 40, k), focus: lerp(200, 190, k), ap: 1.2 }; } },
  { t0: () => T.s3, t1: () => T.s4,   // 3 · over his shoulder on the chip; then close on the desk's middle: the shut, the push, the box
    cam(t, lt, d) {
      if (t < EV.ots) { const k = ease.io(lt / (EV.ots - T.s3)); const pos = V([lerp(20, 19, k), lerp(58, 57, k), lerp(-14, -12, k)]), tgt = V([3, DESK.y + 5.4, 16]); return { pos, at: tgt, fov: 34, focus: pos.distanceTo(tgt), ap: 6 }; }
      const k = ease.io((t - EV.ots) / (T.s4 - EV.ots)); const pos = V([lerp(30, 26, k), lerp(46, 44, k), lerp(62, 56, k)]), tgt = V([-2, DESK.y + 7, 12]); return { pos, at: tgt, fov: 40, focus: pos.distanceTo(tgt), ap: 4 }; } },
  { t0: () => T.s4, t1: () => T.end,  // 4 · wide again: the cabinet lit, five turned to it; the wall flies back in; frame 0's framing for the card
    cam(t, lt, d) { const k = ease.io((t - T.s4 - 0.9) / 1.6); return { pos: V(lerp3([30, 64, 82], LOOK0.pos, k)), at: V(lerp3([-1, 31, 10], LOOK0.at, k)), fov: lerp(40, LOOK0.fov, k), focus: lerp(90, 200, k), ap: lerp(2.2, 1.4, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };

/** Toko's card, as films 1–2 */
const CARD_FONT = LANG === 'ja' ? 'NotoSansJP-800' : 'Anton-400';
function fitLine(g, text, size, maxW, fam) { let fs = size; g.font = `${fs}px "${fam}"`; while (g.measureText(text).width > maxW && fs > 24) { fs -= 2; g.font = `${fs}px "${fam}"`; } return { fs, w: g.measureText(text).width }; }
function card(g, t) {
  const k = clamp((t - EV.card) / 0.6); if (k <= 0) return;
  g.save(); g.globalAlpha = k * 0.62; g.fillStyle = '#0d0b14'; g.fillRect(0, 0, W, H); g.restore();
  const b = ease.back((t - EV.card - 0.1) / 0.5); if (b > 0) { g.save(); g.translate(W / 2, 640); g.scale(b, b);
    const bl = (t - EV.card) > 1.6 && (t - EV.card) < 1.78 ? 0.15 : 1;
    drawMasterBadge(g, 0, 0, 120, { ground: MAG, ink: '#fff8f0', squash: bl }); g.restore(); }
  const a1 = ease.out((t - EV.card - 0.45) / 0.4), a2 = ease.out((t - EV.card - 0.9) / 0.4), a3 = ease.out((t - EV.card - 1.3) / 0.4);
  g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff8f0';
  fitLine(g, UI.card1, LANG === 'ja' ? 64 : 92, 760, CARD_FONT); g.globalAlpha = a1; g.fillText(UI.card1, W / 2, 900 + (1 - a1) * 18);
  fitLine(g, UI.card2, LANG === 'ja' ? 64 : 92, 760, CARD_FONT); g.globalAlpha = a2; g.fillStyle = MAG; g.fillText(UI.card2, W / 2, 1020 + (1 - a2) * 18);
  g.globalAlpha = a3; g.fillStyle = 'rgba(255,248,240,.8)'; g.font = LANG === 'ja' ? '800 30px NotoSansJP-800' : '700 30px Inter'; g.fillText(UI.name, W / 2, 1110);
  g.restore();
}
const cardReport = (() => { const out = {}; for (const k of ['card1', 'card2']) { const s = LANG === 'ja' ? 64 : 92; g2d.save(); const L = fitLine(g2d, UI[k], s, 760, CARD_FONT); g2d.restore(); const x1 = Math.round(W / 2 + L.w / 2); out[k] = { text: UI[k], x0: Math.round(W / 2 - L.w / 2), x1, ok: x1 <= 940 && L.fs >= 0.6 * s }; } return out; })();

// ------------------------------------------------------------------ one frame
const cabLight = new THREE.PointLight('#ff4aa8', 0, 46, 2); scene.add(cabLight);
function setWorld(t) {
  const i = shotAt(t), tq = twos(t);
  setBoil(Math.floor(t * 12));
  const grade = S.setHour('dusk');
  // the wall and the hall
  const wk = wallK(t); S.WALL.position.set(0, wk * 210, -wk * 30); S.WALL.rotation.x = -wk * 0.35; S.WALL.visible = wk < 0.999;
  const gk = Math.max(wk, 0.7);   // the hall: faint through the wall, full once it has gone
  GROWS.forEach((r, k) => { const off = clamp((t - EV.dark(k)) / 0.12) * (1 - clamp((t - EV.flyIn) / 0.6));
    r.m.opacity = r.op * gk; r.sm.opacity = (1 - off * 0.85) * gk * lerp(0.95, 0.35, k / (ROWS - 1)); r.sm.color.copy(screenOn).lerp(screenOff, off); });
  // Toko's laptop (shut and pushed in shot 3; stays pushed after)
  const L = tokoLaptop(tq); LAPS[2].LAPTOP.position.set(...L.pos); LAPS[2].LID.rotation.x = L.lid;   // on twos: only his paddles move it
  // the five, on twos; each pose reads the props it touches at the same (twos) time
  for (const Pp of PUPS) { Pp.T.pose(pose(Pp, tq, i)); Pp.WR.updateMatrixWorld(true); }
  // the core and the parts (on ones), the core unfolding
  const ck = coreK(t); CORE.visible = ck > 0.001; CORE.scale.set(K * lerp(0.7, 1, clamp(ck)), K * Math.max(0.02, ck), K * lerp(0.7, 1, clamp(ck)));
  PARTS.forEach((p, k) => { const st = partState(p, k, t); p.g.visible = st.vis; p.g.position.set(...st.pos); p.g.rotation.set(...st.rot); });
  const on = clamp((t - EV.lit) / 0.35); drawGame(t, on);
  cabLight.position.set(CAB[0], CAB[1] + 12 * K, CAB[2] + 6); cabLight.intensity = 70 * on;
  PUPS.forEach((Pp) => { if (Pp.i !== 2) drawCode(Pp, t); }); drawTokoScreen(t);
  S.drones(t, PATHS[i] || []);
  S.screenLight.intensity = 50 + Math.sin(t * 7) * 2;
  scene.updateMatrixWorld(true);
  return { i, grade };
}
function frame(t, captions = true) {
  const { i, grade } = setWorld(t), Sh = SHOT[i], t0 = Sh.t0(), d = Sh.t1() - t0, lt = t - t0;
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  const Lc = CAMO ? { pos: V(CAMO.slice(0, 3)), at: V(CAMO.slice(3, 6)), fov: CAMO[6], focus: V(CAMO.slice(0, 3)).distanceTo(V(CAMO.slice(3, 6))), ap: 2 } : Sh.cam(t, lt, d); camera.fov = Lc.fov; camera.position.copy(Lc.pos); camera.lookAt(Lc.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: Lc.focus, aperture: Q.get('nodof') ? 0 : Lc.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.1, knee: 0.5, bloomA: 0.3, bloomB: 0.22, vignette: 0.3, grain: 0.025, seed: Math.floor(t * 12), contrast: 1.06, toe: 0.04, ...grade });
  if (t >= EV.card) { const k = clamp((t - EV.card) / 0.6); g2d.filter = `blur(${(k * 10).toFixed(1)}px)`; }
  g2d.drawImage(renderer.domElement, 0, 0); g2d.filter = 'none';
  card(g2d, t);
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
let CAMO = null;   // look-dev only: a camera override for stills
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const keep = () => [];
/** each hand's place on screen (px), for the hands crop sheet: [{who, side, x, y}] */
function handsOnScreen(t) {
  frame(t, false); const out = [];
  for (const Pp of PUPS) Pp.T.hands.forEach((h, s) => { const v = h.getWorldPosition(new THREE.Vector3()).project(camera); out.push({ who: Pp.name, side: s ? 'L' : 'R', x: Math.round((v.x + 1) / 2 * W), y: Math.round((1 - v.y) / 2 * H) }); });
  return out;
}
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }), ui: cardReport },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); },
  camStill(t, c) { CAMO = c; const u = frame(t, false).toDataURL('image/jpeg', 0.85); CAMO = null; return u; },
  hands: handsOnScreen,
  dbg(t) { setWorld(t); scene.updateMatrixWorld(true); const v = (o, l) => o.localToWorld(V(l)).toArray().map((x) => +x.toFixed(1));
    return { shot: shotAt(t), hands: PUPS.map((Pp) => Pp.T.hands.map((h) => v(h, [0, 0, 0]))), faces: PUPS.map((Pp) => { const o = v(Pp.T.head, [0, 0, 0]), f = v(Pp.T.head, [0, 0, 10]); return [Pp.name, o, f.map((x, k) => +(x - o[k]).toFixed(1))]; }) }; },
  /** the clipping probe (Welcome Home's): pose frame t, sample every visible mesh's vertices in world space, and report each
   *  pair of things whose surfaces come within one 0.6-unit cell. A figure's hands are their own thing, so a paddle resting
   *  on its own laptop or (Toko's) on the cabinet is contact, not a clip; everything else is a clip. */
  clip(t, split = false) {
    setWorld(t); scene.updateMatrixWorld(true); const v = new THREE.Vector3(), seen = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const pts = (root, skip = new Set()) => { const a = []; root.traverse((m) => { if (!m.isMesh || !seen(m)) return; for (let p = m; p; p = p.parent) if (skip.has(p)) return;
      const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 3000)); for (let i = 0; i < A.count; i += st) { v.fromBufferAttribute(A, i).applyMatrix4(m.matrixWorld); a.push(v.x, v.y, v.z); } }); return a; };
    const G = {}; PUPS.forEach((Pp, i) => { const own = Object.values(Pp.T.parts), hs = [...Pp.T.hands, ...Pp.T.cuffs];   // a cuff is the wrist: it goes with the hand
      if (split) { G[Pp.name] = pts(Pp.WR, new Set([...hs, ...own])); for (const [k, m] of Object.entries(Pp.T.parts)) G[Pp.name + ':' + k] = pts(m); }
      else G[Pp.name] = pts(Pp.WR, new Set(hs));
      G[Pp.name + '.hands'] = hs.flatMap((h) => pts(h)); G['lap.' + Pp.name] = pts(LAPS[i].LAPTOP); });
    G.cabinet = [...pts(CORE), ...PARTS.flatMap((p) => pts(p.g))];
    const R = 0.6, key = (x, y, z) => Math.floor(x / R) + ',' + Math.floor(y / R) + ',' + Math.floor(z / R), H = {};
    for (const [k, a] of Object.entries(G)) { const h = new Set(); for (let i = 0; i < a.length; i += 3) h.add(key(a[i], a[i + 1], a[i + 2])); H[k] = h; }
    const who = (k) => k.replace(/^lap\./, '').replace(/\.hands$/, '').replace(/:.*$/, ''), ok = (a, b) => who(a) === who(b) || (a === 'toko.hands' && b === 'cabinet') || (b === 'toko.hands' && a === 'cabinet');
    const out = [], ks = Object.keys(G);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = ks[i], b = ks[j]; if (ok(a, b)) continue;
      let n = 0; const A = G[a]; for (let q = 0; q < A.length; q += 3) if (H[b].has(key(A[q], A[q + 1], A[q + 2]))) n++; if (n) out.push([a, b, n]); }
    return out;
  } };
window.__ready = true;
