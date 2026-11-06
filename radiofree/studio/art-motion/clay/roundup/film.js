// ON THE LABEL (RFH · Roundup / glyphosate), v1 STILLS for the owner's approval, 7 Nov 2026. The device: THE LABEL.
// One generic weedkiller jug (no brand, no logo, no trade dress; Roundup is named only in captions and tags) stands on a
// toy shed workbench, and each beat of the 2026 record happens TO ITS LABEL:
//   1 the jug, a pile of CLAIM folders, a red desk phone, a window onto a field;
//   2 a STATE CANCER WARNING sticker flies at the label's empty warning box, is stamped PREEMPTED and falls off (Durnell);
//   3 a rubber stamp brands the label NATIONAL DEFENSE PRIORITY (the 18 Feb executive order, Defense Production Act);
//   4 a NONNEGOTIABLE sticky note slaps onto the jug; the phone beside it never rings (Means alleges; attributed);
//   5 a slow push to the label: the warning box is still empty.
// The 3D toy-world look from looks/cars and clay/cutfirst (soft anime grade, tilt-shift, grain); a new subject: a bench.
// 1080×1920, 30 fps. film.html?lang=en

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from '../welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['Caveat-600', 'Caveat-600.woff'], ['ArchivoBlack-400', 'ArchivoBlack-400.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3),
  back: (k) => { k = clamp(k); const s = 1.6; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h), V = (a) => new THREE.Vector3(...a);
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ------------------------------------------------------------------ renderer, scene, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5;
scene.background = C3('#3b3340');
const camera = new THREE.PerspectiveCamera(32, W / H, 0.5, 400);
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.14, ...o });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.canvas = c; return t; };
const fit = (g, text, size, maxW, min = 20, face = 'Anton-400', wt = '') => { let fs = size; g.font = `${wt}${fs}px ${face}`; while (g.measureText(text).width > maxW && fs > min) { fs -= 2; g.font = `${wt}${fs}px ${face}`; } return fs; };

await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 8.8], ['s4', 13.2], ['s5', 17.6], ['end', 22.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;

// ------------------------------------------------------------------ the shed: bench, pegboard wall, a window on a field
const WOOD = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#c8955f'; g.fillRect(0, 0, w, h); const r = rng(3);
  for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#c08a55' : '#cf9e69'; g.fillRect(0, i * h / 9, w, h / 9 - 3); g.fillStyle = 'rgba(80,45,20,.35)'; g.fillRect(0, (i + 1) * h / 9 - 3, w, 3); }
  for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(110,64,30,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 12, w * 0.6, y + (r() - 0.5) * 12, w, y + (r() - 0.5) * 8); g.stroke(); } });
WOOD.wrapS = WOOD.wrapT = THREE.RepeatWrapping; WOOD.repeat.set(2, 1);
const PEG = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#d9c39c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(70,50,30,.55)';
  for (let y = 16; y < h; y += 32) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.fill(); } });
PEG.wrapS = PEG.wrapT = THREE.RepeatWrapping; PEG.repeat.set(4, 2.4);
const FIELD = canvasTex(512, 512, (g, w, h) => {
  const sky = g.createLinearGradient(0, 0, 0, h * 0.55); sky.addColorStop(0, '#5b8fe0'); sky.addColorStop(1, '#bcd3f2'); g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.55);
  g.fillStyle = '#86a35a'; g.fillRect(0, h * 0.55, w, h * 0.45);
  for (let i = 0; i < 14; i++) { const y = h * 0.55 + Math.pow(i / 14, 1.6) * h * 0.45; g.fillStyle = i % 2 ? '#d8bd5e' : '#c9ad4f'; g.fillRect(0, y, w, 4 + i * 2.2); }
  g.fillStyle = '#4f7a52'; for (let i = 0; i < 12; i++) { const x = i * 46 + 10, s = 18 + (i % 3) * 6; g.beginPath(); g.moveTo(x, h * 0.55); g.lineTo(x + s / 2, h * 0.55 - s * 1.6); g.lineTo(x + s, h * 0.55); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.9)'; for (const [x, y, r] of [[120, 90, 30], [150, 80, 36], [185, 95, 26], [360, 60, 24], [388, 52, 30]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } });

const BENCH_Y = 0;
mesh(rbox(46, 1.6, 18, 0.35), matte('#c8955f', { map: WOOD }), { pos: [0, BENCH_Y - 0.8, 0] });
mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), matte('#5b4a3f'), { pos: [0, -14, 0], cast: false });
for (const x of [-21, 21]) mesh(rbox(1.6, 14, 1.6, 0.2), matte('#a9774a'), { pos: [x, -7.6, 6.5] });
mesh(new THREE.PlaneGeometry(70, 34), matte('#d9c39c', { map: PEG }), { pos: [0, 15, -9.2], cast: false });
// the window, upper left: a frame, four panes of field and sky, its light falling across the bench
{ const WX = -13, WY = 14.5;
  mesh(new THREE.PlaneGeometry(13, 10.5), new THREE.MeshBasicMaterial({ map: FIELD, fog: false }), { pos: [WX, WY, -9.15], cast: false, recv: false });
  const fr = matte('#f1ece2');
  for (const [w, h, x, y] of [[14, 0.8, 0, 5.6], [14, 0.8, 0, -5.6], [0.8, 12, -6.6, 0], [0.8, 12, 6.6, 0], [13, 0.4, 0, 0], [0.4, 11, 0, 0]]) mesh(rbox(w, h, 0.6, 0.12), fr, { pos: [WX + x, WY + y, -8.9] });
  mesh(rbox(15, 0.7, 2.2, 0.15), fr, { pos: [WX, WY - 6.2, -8.2] }); }
// a pegboard's tools: a hand trowel and a coil of hose, so the wall is a shed's
mesh(rbox(0.5, 4.5, 0.4, 0.2), matte('#7a4f2a'), { pos: [9, 16, -8.9] }); mesh(rbox(1.6, 2.6, 0.2, 0.3), paint('#9aa3ad', { metalness: 0.5 }), { pos: [9, 13, -8.9] });
mesh(new THREE.TorusGeometry(2.6, 0.38, 10, 32), paint('#3d8c4a'), { pos: [15.5, 15, -8.7] });

// ------------------------------------------------------------------ the jug: generic, cream, a teal band; the label is the stage
const JUG = new THREE.Group(); scene.add(JUG); JUG.position.set(2, BENCH_Y, 0.4); JUG.rotation.y = -0.18;
const JW = 5.6, JH = 7.6, JD = 3.4;
mesh(rbox(JW, JH, JD, 0.9, 4), paint('#efe8d8', { roughness: 0.42, clearcoat: 0.6 }), { pos: [0, JH / 2, 0], parent: JUG });
mesh(new THREE.CylinderGeometry(0.95, 1.05, 1.2, 20), paint('#efe8d8', { roughness: 0.42 }), { pos: [1.2, JH + 0.5, -0.2], parent: JUG });
mesh(new THREE.CylinderGeometry(1.1, 1.1, 1.0, 24), paint('#2c6e66'), { pos: [1.2, JH + 1.4, -0.2], parent: JUG });
mesh(new THREE.TorusGeometry(1.4, 0.42, 12, 28, Math.PI), paint('#efe8d8', { roughness: 0.42 }), { pos: [-1.2, JH - 0.2, -0.2], parent: JUG });
mesh(new THREE.PlaneGeometry(JW * 2, JD * 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false }),
  { pos: [0, 0.02, 0.4], parent: JUG, cast: false, recv: false });

// the label: drawn on a canvas and redrawn when its state changes (the stamp lands)
const LW = 4.7, LH = 5.4, LBL = { stamp: -1 };
const labelTex = canvasTex(560, 640, () => {}); const LC = labelTex.userData.canvas;
const BOX = { x: 40, y: 430, w: 480, h: 170 };   // the warning box, in label pixels
function drawLabel(stampK) {
  const g = LC.getContext('2d'), w = LC.width, h = LC.height;
  g.fillStyle = '#f7f1e2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2c6e66'; g.fillRect(0, 0, w, 150);
  g.fillStyle = '#f7f1e2'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  fit(g, UI.jugHead, 104, w - 60); g.fillText(UI.jugHead, w / 2, 112);
  g.fillStyle = '#2c6e66'; fit(g, UI.jugSub, 40, w - 70, 16, 'ArchivoBlack-400'); g.fillText(UI.jugSub, w / 2, 204);
  g.fillStyle = 'rgba(40,40,40,.22)'; for (let i = 0; i < 7; i++) g.fillRect(60, 240 + i * 24, (i % 3 === 2 ? 300 : 440), 10);
  // the warning box: a heading, and nothing under it
  g.strokeStyle = '#1d1b19'; g.lineWidth = 5; g.setLineDash([16, 10]); g.strokeRect(BOX.x, BOX.y, BOX.w, BOX.h); g.setLineDash([]);
  g.fillStyle = '#1d1b19'; g.textAlign = 'left'; g.font = '34px ArchivoBlack-400'; g.fillText(UI.warnBox, BOX.x + 18, BOX.y + 46);
  if (stampK > 0) {   // NATIONAL DEFENSE / PRIORITY, in rubber-stamp red, at an angle, over the middle of the label
    g.save(); g.translate(w / 2, 300); g.rotate(-0.16); g.globalAlpha = clamp(stampK);
    g.strokeStyle = '#c4232b'; g.lineWidth = 12; g.strokeRect(-232, -88, 464, 176);
    g.fillStyle = '#c4232b'; g.textAlign = 'center'; fit(g, UI.stamp1, 82, 420); g.fillText(UI.stamp1, 0, -6); fit(g, UI.stamp2, 82, 420); g.fillText(UI.stamp2, 0, 72);
    // ink texture: knock a few specks out, as a rubber stamp leaves it
    g.globalCompositeOperation = 'destination-out'; const r = rng(11); for (let i = 0; i < 260; i++) { g.globalAlpha = 0.5 * clamp(stampK); g.fillRect(-240 + r() * 480, -96 + r() * 192, 2 + r() * 5, 2 + r() * 3); }
    g.restore();
  }
  labelTex.needsUpdate = true;
}
drawLabel(0);
const LABEL_Z = JD / 2 + 0.03;
mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.6 }), { pos: [0, JH * 0.47, LABEL_Z], parent: JUG, cast: false });
// a point on the label, in world space (label u, v in 0..1 from top-left)
const labelPt = (u, v, dz = 0) => JUG.localToWorld(new THREE.Vector3((u - 0.5) * LW, JH * 0.47 + (0.5 - v) * LH, LABEL_Z + dz));

// ------------------------------------------------------------------ the sticker: STATE CANCER WARNING, then PREEMPTED
const stickerTex = canvasTex(640, 300, () => {}); const SC = stickerTex.userData.canvas;
function drawSticker(stampK) { const g = SC.getContext('2d'), w = SC.width, h = SC.height;
  g.fillStyle = '#f6c62e'; g.fillRect(0, 0, w, h); g.fillStyle = '#1d1b19';
  for (let i = -2; i < 18; i++) { g.beginPath(); g.moveTo(i * 40, 0); g.lineTo(i * 40 + 20, 0); g.lineTo(i * 40 - 10, 26); g.lineTo(i * 40 - 30, 26); g.fill(); g.beginPath(); g.moveTo(i * 40, h - 26); g.lineTo(i * 40 + 20, h - 26); g.lineTo(i * 40 - 10, h); g.lineTo(i * 40 - 30, h); g.fill(); }
  g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, UI.sticker, 84, w - 60); g.fillText(UI.sticker, w / 2, 104);
  if (stampK > 0) { g.save(); g.translate(w / 2 + 40, 206); g.rotate(-0.08); g.globalAlpha = clamp(stampK); g.fillStyle = 'rgba(246,198,46,.85)'; g.fillRect(-200, -46, 400, 92);
    g.strokeStyle = '#c4232b'; g.lineWidth = 9; g.strokeRect(-196, -44, 392, 88);
    g.fillStyle = '#c4232b'; fit(g, UI.preempted, 76, 360); g.fillText(UI.preempted, 0, 5); g.restore(); }
  stickerTex.needsUpdate = true; }
drawSticker(0);
const STICK = new THREE.Group(); scene.add(STICK);
mesh(new THREE.PlaneGeometry(4.2, 1.97), new THREE.MeshStandardMaterial({ map: stickerTex, roughness: 0.5, side: THREE.DoubleSide }), { parent: STICK, cast: true });
const EV = { stickHit: T.s2 + 1.25, stickStamp: T.s2 + 1.85, stickFall: T.s2 + 2.5, stampDown: T.s3 + 1.2, noteSlap: T.s4 + 0.9 };
function stickerAt(t) {
  const target = labelPt(0.5, (BOX.y + BOX.h / 2) / 640, 0.06), start = V([target.x + 7, target.y + 7, target.z + 6]);
  if (t < EV.stickHit) { const k = ease.out((t - (EV.stickHit - 0.85)) / 0.85); STICK.position.copy(start.clone().lerp(target, k)); STICK.rotation.set(0, JUG.rotation.y, lerp(0.9, 0, k) * (1 - k * 0)); STICK.visible = t > EV.stickHit - 0.85; return; }
  STICK.visible = true;
  if (t < EV.stickFall) { STICK.position.copy(target); STICK.rotation.set(0, JUG.rotation.y, Math.sin((t - EV.stickHit) * 30) * 0.03 * Math.exp(-(t - EV.stickHit) * 6)); return; }
  // it does not hold: the top corner lifts, it peels, it drops to the bench and lies there
  const k = clamp((t - EV.stickFall) / 0.9), fall = ease.io(k);
  STICK.position.set(target.x + fall * 2.2, lerp(target.y, BENCH_Y + 0.05, fall * fall), target.z + fall * 2.8);
  STICK.rotation.set(lerp(0, -Math.PI / 2, fall), JUG.rotation.y + fall * 0.5, lerp(0, 0.35, fall));
}

// ------------------------------------------------------------------ the rubber stamp
const STAMP = new THREE.Group(); scene.add(STAMP);
mesh(new THREE.SphereGeometry(1.0, 20, 14), paint('#7a3b22'), { pos: [0, 0, 3.6], parent: STAMP });
mesh(new THREE.CylinderGeometry(0.42, 0.5, 2.6, 14).rotateX(Math.PI / 2), paint('#8a4a2a'), { pos: [0, 0, 2.2], parent: STAMP });
mesh(rbox(4.8, 2.0, 0.9, 0.12), paint('#3a2b24'), { pos: [0, 0, 0.6], parent: STAMP });
mesh(rbox(4.6, 1.85, 0.3, 0.06), matte('#c4232b'), { pos: [0, 0, 0.0], parent: STAMP });
function stampAt(t) {
  const face = labelPt(0.5, 300 / 640, 0.05), away = face.clone().add(V([1.5, 1.2, 7]));
  const tIn = EV.stampDown - 0.45, tUp = EV.stampDown + 0.3, tGone = EV.stampDown + 0.95;
  STAMP.visible = t > tIn - 0.6 && t < tGone;
  let k; if (t < EV.stampDown) k = ease.io((t - (tIn - 0.6)) / (EV.stampDown - tIn + 0.6)); else if (t < tUp) k = 1; else k = 1 - ease.io((t - tUp) / (tGone - tUp));
  STAMP.position.copy(away.clone().lerp(face, k)); STAMP.rotation.set(0, JUG.rotation.y, -0.16);
  const sk = t >= EV.stampDown ? 1 : 0; if (sk !== LBL.stamp) { LBL.stamp = sk; drawLabel(sk); }
}

// ------------------------------------------------------------------ the phone (it never rings) and the sticky note
const PHONE = new THREE.Group(); scene.add(PHONE); PHONE.position.set(8.2, BENCH_Y, 0.9); PHONE.rotation.y = -0.45;
mesh(rbox(4.6, 1.6, 3.6, 0.5), paint('#c42b2b'), { pos: [0, 0.8, 0], parent: PHONE });
mesh(rbox(3.6, 0.9, 2.4, 0.4), paint('#c42b2b'), { pos: [0, 1.9, -0.2], rot: [-0.25, 0, 0], parent: PHONE });
mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.14, 28), paint('#f2efe8'), { pos: [0, 2.32, 0.6], rot: [-0.25, 0, 0], parent: PHONE });
{ const hs = new THREE.Group(); PHONE.add(hs); hs.position.set(0, 2.75, -0.1);
  mesh(rbox(5.0, 0.7, 0.9, 0.34), paint('#b32424'), { parent: hs }); for (const s of [-1, 1]) mesh(rbox(1.3, 0.9, 1.3, 0.4), paint('#b32424'), { pos: [s * 2.1, -0.25, 0], parent: hs }); }
mesh(new THREE.TorusGeometry(1.2, 0.12, 8, 30), matte('#1d1b19'), { pos: [-3.2, 0.12, 1.3], rot: [Math.PI / 2, 0, 0.4], parent: PHONE });   // the cord, coiled on the bench
const noteTex = canvasTex(360, 360, (g, w, h) => { g.fillStyle = '#ffe35c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(0, 0, w, 26);
  g.fillStyle = '#121a52'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.translate(w / 2, h / 2 + 4); g.rotate(-0.08);
  const parts = UI.note.length > 9 ? [UI.note.slice(0, 3) + '-', UI.note.slice(3)] : [UI.note];
  parts.forEach((p, i) => { fit(g, p, 110, w - 36, 30, 'Caveat-600'); g.fillText(p, 0, (i - (parts.length - 1) / 2) * 96); }); g.restore();
  g.strokeStyle = '#121a52'; g.lineWidth = 7; g.beginPath(); g.moveTo(50, 300); g.lineTo(310, 288); g.stroke(); });
const NOTE = new THREE.Group(); scene.add(NOTE);
mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.8, side: THREE.DoubleSide }), { parent: NOTE });
function noteAt(t) { const p = labelPt(0.8, 0.12, 0.08); NOTE.visible = t > EV.noteSlap - 0.3;
  const k = ease.back((t - (EV.noteSlap - 0.3)) / 0.3); NOTE.position.copy(p.clone().add(V([0, 0, (1 - clamp(k)) * 3]))); NOTE.rotation.set(0, JUG.rotation.y, 0.14);
  const s = lerp(1.4, 1, clamp(k)); NOTE.scale.setScalar(s); }

// ------------------------------------------------------------------ the claims: a heap of manila CLAIM folders, left
const folderTex = canvasTex(256, 192, (g, w, h) => { g.fillStyle = '#e7c278'; g.fillRect(0, 0, w, h); g.fillStyle = '#f7f1e2'; g.fillRect(40, 70, 176, 56);
  g.fillStyle = '#1d1b19'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, UI.folder, 44, 160); g.fillText(UI.folder, w / 2, 100); });
const folderGeo = new THREE.BoxGeometry(3.2, 0.16, 2.4), folderMat = [matte('#d9b46a'), matte('#d9b46a'), matte('#e7c278', { map: folderTex }), matte('#c9a45c'), matte('#d9b46a'), matte('#d9b46a')];
{ const r = rng(19); let y = 0.08;
  for (let i = 0; i < 26; i++) { mesh(folderGeo, folderMat, { pos: [-5.2 + (r() - 0.5) * 1.6, y, -5.2 + (r() - 0.5) * 1.6], rot: [0, (r() - 0.5) * 0.9, 0] }); y += 0.17; }
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = 3 + r() * 3.5; mesh(folderGeo, folderMat, { pos: [-5.2 + Math.cos(a) * d, 0.09 + r() * 0.05, -3.8 + Math.sin(a) * d * 0.5], rot: [0, r() * TAU, 0] }); } }
// a second pile behind, higher, slumped against the wall
{ const r = rng(23); let y = 0.08; for (let i = 0; i < 34; i++) { mesh(folderGeo, folderMat, { pos: [-9.5 + (r() - 0.5) * 1.2, y, -7.2 + (r() - 0.5) * 1.2], rot: [0, (r() - 0.5) * 0.6, 0] }); y += 0.17; } }

// ------------------------------------------------------------------ light: daylight through the window, a warm practical
const hemi = new THREE.HemisphereLight('#d6e2f6', '#8a6a58', 1.0); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe2b8', 2.4); sun.position.set(-26, 22, 10); sun.target.position.set(0, 0, 0);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 }); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#b6a6ea', 0.45); fill.position.set(20, 14, 30); scene.add(fill);
const lamp = new THREE.PointLight('#ffcf8a', 30, 40, 1.8); lamp.position.set(8, 16, 8); scene.add(lamp);

// ------------------------------------------------------------------ shots
const JC = () => labelPt(0.5, 0.45);
const SHOT = [
  { t0: () => T.s1, focus: () => JC(), cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([7, 17, 30], [6, 15.5, 27], k)), at: V([-0.5, 3.4, -0.5]), fov: 36 }; } },
  { t0: () => T.s2, focus: () => labelPt(0.5, 0.75), cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([7, 6.2, 21], [6, 5.6, 19], k)), at: V([2.2, 3.1, 1.2]), fov: 30 }; } },
  { t0: () => T.s3, focus: () => labelPt(0.5, 0.45), cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-3.5, 7.0, 20], [-2.5, 6.5, 18.5], k)), at: V([1.8, 3.6, 1.0]), fov: 31 }; } },
  { t0: () => T.s4, focus: () => labelPt(0.85, 0.15), cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([10, 9, 23], [9, 8.4, 21], k)), at: V([3.4, 3.2, 2.0]), fov: 34 }; } },
  { t0: () => T.s5, focus: () => labelPt(0.5, 0.75), cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([3.5, 6.2, 22], [3.0, 4.6, 15.5], k)), at: V(lerp3([2.0, 3.6, 0.5], [2.2, 2.9, 1.4], k)), fov: lerp(32, 30, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

function tag(g, text, a) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  // the sticker's PREEMPTED stamp lands once; redraw its canvas only on change
  const ss = t >= EV.stickStamp ? 1 : 0; if (ss !== (frame.ss ?? -1)) { frame.ss = ss; drawSticker(ss); }
  stickerAt(t); stampAt(t); noteAt(t);
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = SHOT_END(i) - t0;
  const L = S.cam(t - t0, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  tmp.copy(S.focus(t)).project(camera); const cy = clamp((tmp.y + 1) / 2, 0.15, 0.85);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 22, tilt: 10, tiltCenter: cy, tiltBand: 0.55,
    threshold: 0.95, knee: 0.45, bloomA: 0.35, bloomB: 0.3, exposure: 1.04, vignette: 0.32, grain: 0.022, seed: Math.floor(t * 24),
    sat: 1.14, contrast: 1.06, toe: 0.0, lift: [0.014, 0.008, 0.03], gain: [1.03, 1.0, 0.97] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.0, T.s1 + 2.6)); tag(g2d, UI.tag1b, tg(T.s1 + 2.7, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 1.6, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 1.4, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 1.0, T.s4 + 2.8)); tag(g2d, UI.tag4b, tg(T.s4 + 2.9, T.s5 - 0.1));
  tag(g2d, UI.tag5, tg(T.s5 + 1.6, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false); frame(T.s3 + 1.5, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
