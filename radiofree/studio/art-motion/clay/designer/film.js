// NEEDS A DESIGNER — the Toko set, film 2 of 4 (plan/films/27-toko-ai-dev-set.md). The shared studio (../studio/set.js):
// Toko at his desk, the laptop's lid to us with his badge sticker on it, the window onto the same park at dusk, where
// the same drones pass. With an AI, prototypes come cheap: ten little clay game boxes pop out of the laptop. Each one
// works; none is fun. He takes the last one in both hands and reshapes it, and it lights up.
//   1 the desk: he types; ten boxes pop out over the lid and stack up beside the laptop; a drone crosses the window
//   2 the stack: each box plays for a beat, gets a WORKS tick, its FUN meter stays empty, and slides into the crate
//   3 close: the last box in both paddles; he squeezes it into a new shape, and its FUN meter fills
//   4 the desk again: the crate of nine, the one glowing on the desk under his hands; a drone crosses
//   card · Toko's card: WE BUILD FAST. / WE STILL DECIDE WHAT. Held ≥ 4 s.
// Carried from film 1 (owner): hands are rounded paddles with NO thumbs and always touch what they hold; every screen
// is a pure function of time; captions at the big size; the AI is generic; no numbers but the film's own.
// 1080×1920, 30 fps, the puppet on twos; camera, light, boxes and drones every frame. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../welcome/lib/post.js';
import { surface, setBoil } from '../welcome/lib/clay.js';
import { lumpy, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex } from '../welcome/lib/city.js';
import { drawMasterBadge } from '../welcome/lib/master.js';
import { Toko } from '../welcome/lib/toko.js';
import { buildStudio, SEAT, DESK } from '../studio/set.js';
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
const camera = new THREE.PerspectiveCamera(36, W / H, 0.6, 2000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), in: (k) => Math.pow(clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const MAG = '#f0027f';

// ------------------------------------------------------------------ clays (the house plasticine, as film 1)
const C = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffd8b8', rough: 0.68, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 2.2, ridge: 0.12, tool: 0.7, grain: 0.004, grainF: 8, mottle: 0.08, specks: 0.35, roughVar: 0.1, ...o });
const TM = {
  hoodie: C('#26404a', { thumbCell: 1.6, thumb: 0.035, tool: 1.0, mottle: 0.06 }), jeans: C('#2f3646', { thumbCell: 1.8, tool: 0.7 }),
  shoes: C('#e8e1d2', { rough: 0.45 }), sole: C('#cfc6b4', { thumb: 0.02 }), glove: C(MAG, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }),
  hair: C('#2a211c', { tool: 1.3, thumbCell: 0.9, thumb: 0.045 }),
  maskDisc: C(MAG, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
  strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
};
TM.hoodie2 = TM.hoodie; TM.arms = TM.hoodie; TM.cuff = C('#21363f', { thumbCell: 1.2 });

// ------------------------------------------------------------------ the studio
const S = buildStudio(scene, C);
scene.fog = new THREE.FogExp2('#4a4458', 0.0009);

// ------------------------------------------------------------------ Toko, on his chair, facing the desk (+z)
const TOKO = new Toko(TM), WRAP = new THREE.Group(); WRAP.add(TOKO.group); scene.add(WRAP);
TOKO.parts.armL.material = TOKO.parts.armR.material = TM.arms; TOKO.hood.visible = true; TOKO.pocket.visible = true;
TOKO.head.children[4].visible = false;                                 // no bun
TOKO.hands.forEach((h) => { h.children[1].visible = false; });        // owner (film 1): paddles, no thumbs, in every shot
WRAP.position.set(0, 0, 0);
const HIP = [0, SEAT + 1.2, 0], at = (v) => [HIP[0] + v[0], HIP[1] + v[1], HIP[2] + v[2]];
const SIT = { knee: [0, -0.8, 11], foot: [0, -(SEAT + 1.2) + 0.75, 12.6], shoePitch: 0 };
function basePose(o = {}) {
  return { hip: HIP, yaw: 0, lean: o.lean ?? 0.3, side: o.side ?? 0, ...SIT, hp: o.hp ?? 0.35, hr: o.hr ?? 0, hy: o.hy ?? 0, breathe: o.breathe ?? 0,
    elR: at([-6.2, 5.0, 7.5]), elL: at([6.2, 5.0, 7.5]), hdR: at([-3, 8, 12]), hdL: at([3, 8, 12]), palm: [[0.4, 1, 0.1], [-0.4, 1, 0.1]] };
}
/** set the hands to WORLD targets (each touching something), the palms facing the given world directions */
function handsTo(pz, wR, wL, nR = [1, 0, 0], nL = [-1, 0, 0], elbows = null) {
  WRAP.updateMatrixWorld(true);
  const toL = (w) => TOKO.group.worldToLocal(V(w)).toArray();
  pz.hdR = toL(wR); pz.hdL = toL(wL);
  pz.palm = [nR, nL];
  if (elbows) { pz.elR = toL(elbows[0]); pz.elL = toL(elbows[1]); }
  return pz;
}

// ------------------------------------------------------------------ the ten boxes: little clay game carts, a screen on the front
const BOX = 3.2, COLS = ['#2fb0a0', '#e8b23a', '#e2674a', '#8a7ad8', '#5aa0e0', '#7bbf4a', '#d85a9a', '#c9894a', '#4a9a8a', '#f0d040'];
const BW = 128, BOXES = COLS.map((col, i) => {
  const g = new THREE.Group(); scene.add(g);
  const body = mesh0(lumpy(new RoundedBoxGeometry(BOX, BOX, BOX, 4, 0.7), 0.04, 0.9, 700 + i), C(col, { thumbCell: 0.9, thumb: 0.03, specks: 0.2 }), { parent: g });
  const can = canvas(BW, BW), t = tex(can);
  const face = mesh0(new THREE.PlaneGeometry(BOX * 0.78, BOX * 0.78), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), { pos: [0, 0, BOX / 2 + 0.06], parent: g, cast: false });
  return { g, body, can, t, face, i };
});
/** a box's face: off (dark), playing (its tiny game), and its two labels: WORKS ✓ and the FUN meter */
function drawBox(b, o) {
  const g = b.can.getContext('2d'), w = BW;
  g.fillStyle = '#121019'; g.fillRect(0, 0, w, w);
  if (o.play > 0) {   // the tiny game: a dot runs a lane while blocks fall; a pure function of t
    const t = o.t, a = o.play; g.globalAlpha = a;
    g.fillStyle = COLS[b.i]; for (let k = 0; k < 4; k++) { const y = ((t * 60 + k * 37 + b.i * 13) % 110) - 10; g.fillRect(14 + k * 26, y, 14, 14); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64 + Math.sin(t * 5 + b.i) * 34, 92, 8, 0, TAU); g.fill(); g.globalAlpha = 1;
  }
  if (o.works > 0) { g.globalAlpha = o.works; g.fillStyle = 'rgba(18,16,25,.75)'; g.fillRect(0, 0, w, 40); g.fillStyle = '#6ad28a'; g.font = '800 26px Inter'; g.textAlign = 'center'; g.fillText('✓ ' + P_UI.works, w / 2, 29); g.globalAlpha = 1; }
  if (o.meter !== undefined) {   // FUN: an empty bar, or filling, glowing
    const m = clamp(o.meter); g.fillStyle = 'rgba(18,16,25,.8)'; g.fillRect(0, w - 38, w, 38);
    g.fillStyle = '#fff'; g.font = '800 18px Inter'; g.textAlign = 'left'; g.fillText(P_UI.funL, 8, w - 13);
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.strokeRect(58, w - 28, 62, 16);
    if (m > 0) { g.fillStyle = m >= 1 ? '#ffd23a' : MAG; g.fillRect(60, w - 26, 58 * m, 12); }
  }
  if (o.glow > 0) { g.globalAlpha = o.glow * 0.6; const gr = g.createRadialGradient(64, 60, 4, 64, 60, 70); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(1, 'rgba(255,200,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    g.fillStyle = '#ffd23a'; for (let k = 0; k < 6; k++) { const an = o.t * 1.5 + k; g.beginPath(); g.arc(64 + Math.cos(an) * 40, 60 + Math.sin(an) * 30, 4, 0, TAU); g.fill(); } g.globalAlpha = 1; }
  b.t.needsUpdate = true;
}

// the crate at the desk's right end, a little lip of slats
const CRATE = { x: 25, z: 25 }, crateM = C('#9a6a3e', { tool: 1.2, thumbCell: 1.8, mottle: 0.14 });
for (const [w, d, x, z] of [[13, 1, 0, -5], [13, 1, 0, 5], [1, 11, -6, 0], [1, 11, 6, 0]]) mesh0(lumpy(new RoundedBoxGeometry(w, 5.5, d, 2, 0.3), 0.04, 0.6, 980 + x + z), crateM, { pos: [CRATE.x + x, DESK.y + 2.75, CRATE.z + z], parent: scene });
mesh0(lumpy(new RoundedBoxGeometry(12, 0.6, 10, 2, 0.2), 0.04, 0.6, 985), crateM, { pos: [CRATE.x, DESK.y + 0.3, CRATE.z], parent: scene });
const inCrate = (k) => { const r = rng(990 + k); return [CRATE.x - 3.4 + (k % 3) * 3.4 + (r() - 0.5) * 0.6, DESK.y + 0.6 + BOX / 2 + Math.floor(k / 3) * 1.6, CRATE.z - 2.6 + (Math.floor(k / 3) % 2) * 2.4 + (r() - 0.5) * 0.6]; };
// the stack: a pyramid 4-3-2-1 beside the laptop; box 9 (the top) is the one he keeps
const STACK = (() => { const out = [], x0 = 13.4, z0 = 20; let i = 0;
  for (let row = 0; row < 4; row++) for (let c = 0; c < 4 - row; c++) { out[i++] = [x0 + (c - (3 - row) / 2) * (BOX + 0.15), DESK.y + BOX / 2 + row * BOX, z0]; } return out; })();
// where the boxes come out: just over the lid's top edge
const MOUTH = [0, DESK.y + 11.2, 16.4];

// ------------------------------------------------------------------ the laptop's screen: the AI generic, prototype after prototype
const P_UI = {};
function drawScreen(t, n) {
  const g = S.scrCan.getContext('2d'), w = S.scrCan.width, h = S.scrCan.height;
  g.fillStyle = '#0f0e14'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.12)'; for (let k = 0; k < 9; k++) g.fillRect(24, 40 + k * 28, 120 + ((k * 53) % 260), 10);
  g.fillStyle = MAG; g.font = '800 34px Inter'; g.textAlign = 'right'; g.fillText(`${P_UI.proto} ${String(n).padStart(2, '0')}`, w - 24, h - 30);
  S.scrTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the timeline: 112 BPM; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 112, FPS = 30;
const BEATS = [['s1', 0], ['s2', 11 * B], ['s3', 21 * B], ['s4', 31 * B], ['s5', 41 * B], ['end', 51 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
Object.assign(P_UI, P.ui);
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { card: T.s5, fun: popOf('fun') };
// shot 1: the ten pop out one after another; shot 2: nine play, tick and go to the crate; shot 3: the squeeze
EV.out = (i) => T.s1 + 0.55 + i * ((T.s2 - T.s1 - 1.3) / 9);
EV.test = (k) => T.s2 + 0.35 + k * ((T.s3 - T.s2 - 0.8) / 9);   // k: 0..8, the nine that go in the crate (box k)
EV.pick = T.s3 + 0.15; EV.squeeze = EV.fun - 0.75;
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...Object.fromEntries(Object.entries(EV).filter(([, v]) => typeof v === 'number')), ...CAP.events(P), quiet: [] };
const twos = (t) => Math.floor(t * 12) / 12;

/** where box i is, its turn and squash, and its face, at time t */
function boxState(i, t) {
  const tOut = EV.out(i);
  // box 9 (the top) is set aside on the desk as shot 2 starts, so the stack can come down from the top without it floating
  let seat = STACK[i];
  if (i === 9) { const ka = ease.io((t - T.s2 - 0.05) / 0.4); if (ka > 0) { seat = lerp3(STACK[9], ASIDE, ka); seat[1] += Math.sin(ka * Math.PI) * 3; } }
  let pos, rot = [0, 0, 0], sq = [1, 1, 1], face = { t, play: 0, works: 0 }, vis = t >= tOut - 0.02;
  // out of the laptop, up and over, onto the stack
  const k = clamp((t - tOut) / 0.55), arc = Math.sin(k * Math.PI) * 9;
  pos = lerp3(MOUTH, seat, ease.io(k)); pos[1] += arc; rot = [0, 0, (1 - ease.out(k)) * 2.4];
  if (k > 0.9 && k < 1) sq = [1.1, 0.86, 1.1];
  if (i < 9) {   // tested, ticked, into the crate
    const tt = EV.test(8 - i), pl = clamp((t - tt) / 0.18) * (1 - clamp((t - tt - 0.32) / 0.1));
    face = { t, play: pl, works: clamp((t - tt - 0.28) / 0.12), meter: t > tt + 0.3 ? 0 : undefined };
    const m = clamp((t - tt - 0.42) / 0.35);
    if (m > 0) { const dst = inCrate(i); pos = lerp3(seat, dst, ease.io(m)); pos[1] += Math.sin(m * Math.PI) * 5; rot = [0, 0, -m * 0.6 * (i % 2 ? 1 : -1)]; }
  } else {       // the one he keeps: into his hands, squeezed, alive
    const tp = EV.pick, kp = ease.io((t - tp) / 0.6);
    const held = lerp3(seat, HOLD, kp); if (kp > 0) pos = held;
    const s = clamp((t - EV.squeeze) / 0.5), s2 = clamp((t - EV.squeeze - 0.5) / 0.35);
    if (s > 0) sq = [1 + 0.35 * Math.sin(s * Math.PI) * (1 - s2) + 0.18 * s2, 1 - 0.3 * Math.sin(s * Math.PI) * (1 - s2) - 0.16 * s2, 1 + 0.12 * s2];   // squeezed, and set into its new shape
    const lit = clamp((t - EV.fun + 0.15) / 0.4);
    face = { t, play: t > tOut + 0.6 && t < T.s3 ? 0.4 : lit, works: t > T.s3 ? 1 : 0, meter: t > T.s3 - 0.4 ? lit : undefined, glow: lit };
    // shot 4: set down on the desk in front of the laptop, his hands still round it
    const kd = ease.io((t - T.s4 - 0.1) / 0.6); if (kd > 0) pos = lerp3(HOLD, REST, kd);
  }
  return { pos, rot, sq, face, vis };
}
const HOLD = [-6, DESK.y + 6.5, 10.5], REST = [-12, DESK.y + BOX / 2 + 0.05, 12.5], ASIDE = [6.5, DESK.y + BOX / 2, 25];   // HOLD and REST sit left of the laptop, where the lid cannot hide them

// the drones outside the window (world; far beyond the glass, crossing slowly)
const PATHS = { 0: [[[-120, 70, -120], [60, 78, -130], T.s1 - 1, T.s2 + 1], null], 3: [[[70, 66, -120], [-130, 74, -110], T.s4 - 0.5, T.end + 3], [[-110, 88, -150], [40, 84, -150], T.s4 + 1.0, T.end + 6]] };

// ------------------------------------------------------------------ the shots
const LOOK0 = { pos: V([18, 46, 92]), at: V([4, 30, 4]), fov: 36 };
const SHOT = [
  { // 1 · the desk: he types; the boxes pop out over the lid and stack up
    t0: () => T.s1, t1: () => T.s2,
    pose(t) { const pz = basePose({ lean: 0.34, hp: 0.38, breathe: Math.sin(t * 1.4) }); const tap = (k) => Math.max(0, Math.sin(t * 9 + k)) * 0.5;
      return handsTo(pz, [-3.2, DESK.y + 1.9 + tap(0), 13.2], [3.2, DESK.y + 1.9 + tap(2), 13.2], [0.2, -1, 0.2], [-0.2, -1, 0.2]); },
    screen(t) { drawScreen(t, Math.min(10, Math.max(1, 1 + [...Array(10).keys()].filter((i) => t >= EV.out(i)).length))); },
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: LOOK0.pos.clone().add(V([-3 * k, -1 * k, -8 * k])), at: LOOK0.at.clone(), fov: LOOK0.fov, focus: 86 - 8 * k, ap: 2.6 }; } },
  { // 2 · the stack: each box plays, gets a WORKS tick, FUN stays empty, into the crate
    t0: () => T.s2, t1: () => T.s3,
    pose(t) { const pz = basePose({ lean: 0.3, hp: 0.5, hy: -0.3, breathe: Math.sin(t * 1.4) });
      return handsTo(pz, [-3.2, DESK.y + 1.9, 13.2], [3.2, DESK.y + 1.9, 13.2], [0.2, -1, 0.2], [-0.2, -1, 0.2]); },
    screen(t) { drawScreen(t, 10); },
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V([lerp(30, 28, k), 36, lerp(64, 58, k)]), at: V([19, DESK.y + 5, 22]), fov: 34, focus: lerp(48, 42, k), ap: 6 }; } },
  { // 3 · close: the last box in both paddles; the squeeze; it lights
    t0: () => T.s3, t1: () => T.s4,
    pose(t) { const pz = basePose({ lean: 0.38, hp: 0.62, breathe: Math.sin(t * 1.4) }), b = boxState(9, t), sq = b.sq;
      const kp = ease.io((t - EV.pick) / 0.6);
      // before he has it: his hands go to it on the stack; after: both paddles press its sides
      const side = (s) => [b.pos[0] + s * (BOX / 2 * sq[0] + 1.05), b.pos[1] - 0.2, b.pos[2] - 0.2];
      const wR = kp < 1 ? lerp3([-3.2, DESK.y + 1.9, 13.2], side(-1), kp) : side(-1), wL = kp < 1 ? lerp3([3.2, DESK.y + 1.9, 13.2], side(1), kp) : side(1);
      return handsTo(pz, wR, wL, [1, 0, 0], [-1, 0, 0]); },
    screen(t) { drawScreen(t, 10); },
    // from his left-front, clear of the lid: the box in his paddles, the mask above it
    cam(t, lt, d) { const k = ease.io(lt / d), tgt = V([-5, DESK.y + 8, 8]), pos = V([lerp(-18, -16.5, k), lerp(43, 42, k), lerp(48, 44, k)]); return { pos, at: tgt, fov: 32, focus: pos.distanceTo(tgt), ap: 7 }; } },
  { // 4 · the desk again: the crate of nine, the one glowing under his hands
    t0: () => T.s4, t1: () => T.end,
    pose(t) { const pz = basePose({ lean: 0.36, hp: 0.5, breathe: Math.sin(t * 1.2) }), b = boxState(9, t), sq = b.sq;
      const side = (s) => [b.pos[0] + s * (BOX / 2 * sq[0] + 1.05), b.pos[1] - 0.2, b.pos[2] - 0.2];
      return handsTo(pz, side(-1), side(1), [1, 0, 0], [-1, 0, 0]); },
    screen(t) { drawScreen(t, 10); },
    // a touch left and higher than frame 0's, so the box beside the laptop and the mask over the lid both read
    cam(t, lt, d) { const k = ease.io((t - T.s4) / (T.s5 - T.s4 + 1)); return { pos: V([lerp(14, 11, k), lerp(54, 52, k), lerp(96, 90, k)]), at: V([7, 28, 8]), fov: 50, focus: 86, ap: 2.6 }; } },   // wide enough for the crate of nine and the one
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };

/** Toko's card, as film 1's: the room behind it dim and soft; the badge; two lines in his voice; his name */
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
  fitLine(g, P.ui.card1, LANG === 'ja' ? 64 : 92, 760, CARD_FONT); g.globalAlpha = a1; g.fillText(P.ui.card1, W / 2, 900 + (1 - a1) * 18);
  fitLine(g, P.ui.card2, LANG === 'ja' ? 64 : 92, 760, CARD_FONT); g.globalAlpha = a2; g.fillStyle = MAG; g.fillText(P.ui.card2, W / 2, 1020 + (1 - a2) * 18);
  g.globalAlpha = a3; g.fillStyle = 'rgba(255,248,240,.8)'; g.font = LANG === 'ja' ? '800 30px NotoSansJP-800' : '700 30px Inter'; g.fillText(P.ui.name, W / 2, 1110);
  g.restore();
}
const cardReport = (() => { const out = {}; for (const k of ['card1', 'card2']) { const s = LANG === 'ja' ? 64 : 92; g2d.save(); const L = fitLine(g2d, P.ui[k], s, 760, CARD_FONT); g2d.restore(); const x1 = Math.round(W / 2 + L.w / 2); out[k] = { text: P.ui[k], x0: Math.round(W / 2 - L.w / 2), x1, ok: x1 <= 940 && L.fs >= 0.6 * s }; } return out; })();

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  const i = shotAt(t), Sh = SHOT[i], t0 = Sh.t0(), d = Sh.t1() - t0, lt = t - t0, tq = twos(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  setBoil(Math.floor(t * 12));
  const grade = S.setHour('dusk');
  // Toko on twos; the boxes on ones, and his hands follow the box he holds from the same (twos) time so they never part
  TOKO.pose(Sh.pose(tq)); WRAP.updateMatrixWorld(true);
  for (const b of BOXES) {
    const st = boxState(b.i, b.i === 9 && i >= 2 ? tq : t);
    b.g.visible = st.vis; b.g.position.set(...st.pos); b.g.rotation.set(...st.rot); b.g.scale.set(...st.sq);
    drawBox(b, st.face);
  }
  Sh.screen(t);
  S.THERMOS.visible = S.LAMP.visible = i !== 2;                       // shot 3's camera stands where they are
  S.drones(t, PATHS[i] || []);
  S.screenLight.intensity = 50 + Math.sin(t * 7) * 2;
  // the glow of the one that's fun lights his mask and hands
  const lit = clamp((t - EV.fun + 0.15) / 0.4); boxLight.position.set(...boxState(9, t).pos).add(V([0, 1, 2])); boxLight.intensity = 45 * lit;
  scene.updateMatrixWorld(true);
  const L = Sh.cam(t, lt, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: L.focus, aperture: Q.get('nodof') ? 0 : L.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.1, knee: 0.5, bloomA: 0.3, bloomB: 0.22, vignette: 0.3, grain: 0.025, seed: Math.floor(t * 12), contrast: 1.06, toe: 0.04, ...grade });
  if (t >= EV.card) { const k = clamp((t - EV.card) / 0.6); g2d.filter = `blur(${(k * 10).toFixed(1)}px)`; }
  g2d.drawImage(renderer.domElement, 0, 0); g2d.filter = 'none';
  card(g2d, t);
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
const boxLight = new THREE.PointLight('#ffd27a', 0, 40, 2); scene.add(boxLight);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const keep = () => [];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }), ui: cardReport },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); },
  dbg(t) { frame(t, false); return { shot: shotAt(t), hands: TOKO.hands.map((h) => h.getWorldPosition(new THREE.Vector3()).toArray()), box9: BOXES[9].g.position.toArray() }; } };
window.__ready = true;
