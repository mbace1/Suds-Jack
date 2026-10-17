// KILL SWITCH v2 — the leaflet as a photographed object. A Z-folded sheet (print.js + artwork.js) lying on honed
// granite under one warm pendant, crumbs, the chrome corner of the toaster soft at the frame's edge. Macro lens.
// Looks: 0 the toaster side · 1 the frontier-model side with the sticky-note kill switch · 2 a macro on the print.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from '../clay-roadster/lib/post.js';
import { print, AW, AH } from './print.js';
import { front, back } from './artwork.js';

const W = 1080, H = 1920, SAFE_B = 1630, TAU = Math.PI * 2;
const FONT_DIR = '../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file, desc] of [['RobotoCondensed', 'RobotoCondensed-var.woff', { weight: '100 900' }], ['Kalam', 'Kalam-700.woff', {}], ['Poppins-800', 'Poppins-800.woff', {}]]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, desc); document.fonts.add(await f.load());
}
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const texOf = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#050505');
const camera = new THREE.PerspectiveCamera(36, W / H, 1, 1000);
const post = new Post(renderer, W, H);
const out2d = mk(W, H), g2d = out2d.getContext('2d');
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = (() => {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), new THREE.MeshBasicMaterial({ color: '#0a0a0b', side: THREE.BackSide })));
  const panel = (w, h, col, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  panel(40, 40, new THREE.Color(5, 3.6, 2.2), [0, 98, 0], [Math.PI / 2, 0, 0]);          // the pendant
  panel(60, 50, new THREE.Color(0.35, 0.45, 0.7), [98, 20, -20], [0, -Math.PI / 2, 0]);  // the window, night blue
  panel(200, 6, new THREE.Color(0.6, 0.5, 0.4), [0, -40, -98], [0, 0, 0]);               // a strip of lit worktop far off
  return pmrem.fromScene(s, 0.02).texture;
})();

// ------------------------------------------------------------------ the print: both sides, each showing the other through the paper
const texFront = texOf(print(front, { seed: 7, through: back }));
const texBack = texOf(print(back, { seed: 9, through: front }));

// ------------------------------------------------------------------ the worktop: dark honed granite
function granite() {
  const S = 2048, c = mk(S, S), g = c.getContext('2d'), r = rng(31);
  g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1800; i++) { const x = r() * S, y = r() * S, rr = 20 + r() * 120, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, r() < 0.5 ? 'rgba(60,60,64,.18)' : 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 70000; i++) { const v = r(); g.fillStyle = v < 0.6 ? `rgba(78,78,82,${0.15 + r() * 0.25})` : v < 0.93 ? 'rgba(8,8,10,.6)' : v < 0.995 ? `rgba(128,124,118,${0.18 + r() * 0.25})` : 'rgba(190,184,176,.45)'; g.beginPath(); g.arc(r() * S, r() * S, 0.6 + r() * (v < 0.93 ? 2.4 : 1.4), 0, TAU); g.fill(); }
  return c;
}
const granC = granite();
const granTex = texOf(granC); granTex.wrapS = granTex.wrapT = THREE.RepeatWrapping; granTex.repeat.set(3, 3);
const granBump = texOf(granC, false); granBump.wrapS = granBump.wrapT = THREE.RepeatWrapping; granBump.repeat.set(3, 3);
const top = new THREE.Mesh(new THREE.PlaneGeometry(260, 260).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: granTex, roughness: 0.42, metalness: 0, bumpMap: granBump, bumpScale: 0.05 }));
top.receiveShadow = true; scene.add(top);

// ------------------------------------------------------------------ the sheet: Z-folded, resting open, not quite flat
const PW = 15, PH = PW * AH / AW;          // cm; a long A5-ish leaflet
const SX = 0.16, SZ = 0.18;                 // where it lies; it is turned a few degrees
const ROT = -0.06;
function lift(u, s) {                       // u 0..1 across, s 0..1 from the far edge to the near edge
  const ks = [0, 1 / 3, 2 / 3, 1], hs = [0.1, 0.46, 0.03, 0.2];
  let i = s < ks[1] ? 0 : s < ks[2] ? 1 : 2; const f = (s - ks[i]) / (ks[i + 1] - ks[i]);
  let h = hs[i] + (hs[i + 1] - hs[i]) * f + Math.sin(f * Math.PI) * 0.05;
  h += 0.42 * Math.pow(Math.max(0, (u - 0.72) / 0.28), 2) * Math.pow(Math.max(0, (s - 0.84) / 0.16), 2);   // the near corner curls up
  h += 0.06 * Math.sin(u * Math.PI) * (1 - Math.abs(2 * s - 1));                                         // the paper bows a touch
  return h;
}
const sheetGeo = new THREE.PlaneGeometry(PW, PH, 90, 160).rotateX(-Math.PI / 2);
{ const p = sheetGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, lift(x / PW + 0.5, z / PH + 0.5)); } sheetGeo.computeVertexNormals(); }
function fibre() { const S = 1024, c = mk(S, S), g = c.getContext('2d'), r = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, S, S); for (let i = 0; i < 26000; i++) { const x = r() * S, y = r() * S, a = r() * TAU, l = 2 + r() * 10; g.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } return c; }
const fib = texOf(fibre(), false); fib.wrapS = fib.wrapT = THREE.RepeatWrapping; fib.repeat.set(3, 4);
const paperMat = new THREE.MeshStandardMaterial({ map: texFront, roughness: 0.74, metalness: 0, bumpMap: fib, bumpScale: 0.015, side: THREE.DoubleSide });
const sheet = new THREE.Mesh(sheetGeo, paperMat); sheet.castShadow = true; sheet.receiveShadow = true;
const SHEET = new THREE.Group(); SHEET.add(sheet); SHEET.position.set(SX, 0.02, SZ); SHEET.rotation.y = ROT; scene.add(SHEET);
const onSheet = (u, s, up = 0.02) => SHEET.localToWorld(new THREE.Vector3((u - 0.5) * PW, lift(u, s) + up, (s - 0.5) * PH));

// ------------------------------------------------------------------ crumbs
const crumbMats = ['#8f6233', '#6e4520', '#a87b48', '#54341a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
{ const r = rng(77);
  const crumbGeo = (s) => { const g = new THREE.DodecahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.7 + r() * 0.6; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k); } g.computeVertexNormals(); g.scale(s, s, s); return g; };
  const put = (pos, s) => { const m = new THREE.Mesh(crumbGeo(s), crumbMats[(r() * 4) | 0]); m.position.copy(pos); m.rotation.set(r() * 3, r() * 3, r() * 3); m.castShadow = true; scene.add(m); };
  for (let i = 0; i < 38; i++) put(new THREE.Vector3(6 + r() * 16, 0.06, -18 + r() * 12), 0.06 + r() * 0.12);   // under where the toaster stands
  for (let i = 0; i < 5; i++) put(new THREE.Vector3(-14 + r() * 8, 0.05, 2 + r() * 14), 0.05 + r() * 0.08);
  for (let i = 0; i < 4; i++) put(onSheet(0.55 + r() * 0.35, 0.1 + r() * 0.2, 0.05), 0.05 + r() * 0.07);       // a few on the leaflet itself
}

// ------------------------------------------------------------------ the toaster, just its near corner, soft at the top right
const chrome = new THREE.MeshStandardMaterial({ color: '#d9dadc', metalness: 1, roughness: 0.16, envMap: ENV, envMapIntensity: 0.9 });
const bakelite = new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.45 });
const TOAST = new THREE.Group(); TOAST.position.set(17, 0, -24); TOAST.rotation.y = -0.38; scene.add(TOAST);
{ const body = new THREE.Mesh(new RoundedBoxGeometry(28, 18, 17, 6, 3.2), chrome); body.position.y = 10.4; body.castShadow = true; TOAST.add(body);
  const base = new THREE.Mesh(new RoundedBoxGeometry(29, 1.8, 18, 4, 0.8), bakelite); base.position.y = 0.9; base.castShadow = true; TOAST.add(base);
  const lever = new THREE.Mesh(new RoundedBoxGeometry(3.6, 1.8, 2.4, 3, 0.6), bakelite); lever.position.set(-6, 12, 9.4); TOAST.add(lever); }
{ const pts = [[11, 0.5, -17], [7, 0.5, -16.5], [-3, 0.5, -19], [-16, 0.5, -25], [-40, 0.5, -30]].map((p) => new THREE.Vector3(...p));
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.32, 12), bakelite); cable.castShadow = true; scene.add(cable); }

// ------------------------------------------------------------------ the kill switch: a sticky note
function noteArt() {
  const S = 768, c = mk(S, S), g = c.getContext('2d'), r = rng(12);
  const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#f7dc4a'); bg.addColorStop(0.18, '#fbe55c'); bg.addColorStop(1, '#f9e868'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 6000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,120,0,.05)' : 'rgba(255,255,220,.12)'; g.fillRect(r() * S, r() * S, 2, 2); }
  // the button, drawn in red marker: overlapping strokes, an outline gone round twice, a shadow line underneath
  const cx = 384, cy = 380, R = 150;
  g.save(); g.beginPath(); g.ellipse(cx, cy, R, R * 0.62, 0, 0, TAU); g.clip();
  g.lineCap = 'round'; for (let k = -R * 2; k < R * 2; k += 13) { g.strokeStyle = `rgba(214,30,40,${0.55 + r() * 0.2})`; g.lineWidth = 15 + r() * 4; g.beginPath(); g.moveTo(cx + k - 90, cy - R); g.lineTo(cx + k + 90 + r() * 10, cy + R); g.stroke(); }
  g.restore();
  g.strokeStyle = 'rgba(30,24,30,.92)'; g.lineWidth = 7; g.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) { g.beginPath(); for (let a = 0; a <= TAU + 0.3; a += 0.05) { const w = 1 + (r() - 0.5) * 0.03; g.lineTo(cx + Math.cos(a) * R * w + pass * 3, cy + Math.sin(a) * R * 0.62 * w); } g.stroke(); }
  g.beginPath(); g.moveTo(cx - R, cy + 6); g.bezierCurveTo(cx - R + 4, cy + 120, cx + R - 4, cy + 120, cx + R, cy + 4); g.stroke();
  g.beginPath(); g.moveTo(cx - R + 4, cy + 70); g.lineTo(cx - R + 4, cy + 112); g.moveTo(cx + R - 4, cy + 70); g.lineTo(cx + R - 4, cy + 110); g.stroke();
  g.fillStyle = 'rgba(30,24,30,.92)'; g.textAlign = 'center';
  g.font = '700 92px Kalam'; g.save(); g.translate(384, 150); g.rotate(-0.03); g.fillText('KILL SWITCH', 0, 0); g.restore();
  g.font = '700 70px Kalam'; g.save(); g.translate(384, 640); g.rotate(0.02); g.fillText('study — due 16 Nov', 0, 0); g.restore();
  return c;
}
const NOTE = 7.6, NOTE_U = 0.6, NOTE_S = 0.6, NOTE_A = 0.11;
const noteGeo = new THREE.PlaneGeometry(NOTE, NOTE, 40, 40).rotateX(-Math.PI / 2);
{ const p = noteGeo.attributes.position, ca = Math.cos(NOTE_A), sa = Math.sin(NOTE_A);
  for (let i = 0; i < p.count; i++) {
    const nx = p.getX(i), nz = p.getZ(i), ns = nz / NOTE + 0.5;
    const x = (NOTE_U - 0.5) * PW + nx * ca + nz * sa, z = (NOTE_S - 0.5) * PH - nx * sa + nz * ca;
    const curl = 0.5 * Math.pow(Math.max(0, (ns - 0.6) / 0.4), 2.2);
    p.setXYZ(i, x, lift(x / PW + 0.5, z / PH + 0.5) + 0.035 + curl, z);
  }
  noteGeo.computeVertexNormals(); }
const note = new THREE.Mesh(noteGeo, new THREE.MeshStandardMaterial({ map: texOf(noteArt()), roughness: 0.66, side: THREE.DoubleSide }));
note.castShadow = true; note.receiveShadow = true; note.visible = false; SHEET.add(note);
function placeNote() {}

// ------------------------------------------------------------------ light: one warm pendant, a cool night fill, a rim for the chrome
const key = new THREE.SpotLight('#ffd7a3', 11000, 0, 0.52, 0.9, 2);
key.position.set(-6, 58, 8); key.target.position.set(1, 0, -1); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5; key.shadow.camera.near = 10; key.shadow.camera.far = 200;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight('#7f92b2', '#1c1510', 0.22));
{ const rim = new THREE.DirectionalLight('#9fb6de', 0.5); rim.position.set(60, 40, -70); scene.add(rim); }

// ------------------------------------------------------------------ overlays (MOCK captions, bug and tag: the films burn these with rfcaps.py)
function caption(c, lines, y) {
  c.save(); c.font = '82px "Poppins-800"'; c.lineJoin = 'round'; c.textBaseline = 'alphabetic';
  lines.forEach((s, i) => {
    const parts = s.split(/(\[[^\]]+\])/).filter(Boolean), clean = parts.map((p) => p.replace(/[[\]]/g, ''));
    let x = 540 - c.measureText(clean.join('')).width / 2; const yy = y + i * 98;
    parts.forEach((p, j) => { const t = clean[j]; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3; c.lineWidth = 14; c.strokeStyle = '#000'; c.strokeText(t, x, yy); c.shadowColor = 'transparent'; c.fillStyle = p.startsWith('[') ? '#f2b83a' : '#fff'; c.fillText(t, x, yy); x += c.measureText(t).width; });
  });
  c.font = '30px "Poppins-800"'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText('● RADIO FREE HELSINKI', 92, 118);
  c.fillStyle = '#f0027f'; c.fillText('●', 92, 118); c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(' RADIO FREE HELSINKI', 92 + c.measureText('●').width, 118);
  c.restore();
}
function tag(c, text, x = 110, yb = 1700) {
  yb = Math.min(yb, SAFE_B); c.save(); c.font = '700 34px "RobotoCondensed"';
  const w = c.measureText(text).width + 80, h = 62, y = yb - h;
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; c.shadowOffsetY = 6; c.fillStyle = '#141414'; c.fillRect(x, y, w, h); c.shadowColor = 'transparent';
  c.save(); c.beginPath(); c.rect(x, y, 30, h); c.clip(); c.fillStyle = '#f2c200'; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 18, y + h); c.lineTo(x + k * 18 + 9, y + h); c.lineTo(x + k * 18 + 9 + h, y); c.lineTo(x + k * 18 + h, y); c.fill(); } c.restore();
  c.fillStyle = '#f2c200'; c.textBaseline = 'middle'; c.fillText(text, x + 50, y + h / 2 + 2); c.restore();
}

// ------------------------------------------------------------------ the looks
const LOOKS = [
  { name: 'ks2-1-toaster', side: 'front', pos: [0.6, 44, 29], at: [0.4, 0, -0.2], fov: 40, focusAt: [0.3, 0.3, 0.5], ap: 5,
    caption: ['Its safety standard', 'asks for a [second]', 'off switch.'], tag: 'UL 1026 · TOASTERS' },
  { name: 'ks2-2-model', side: 'back', note: true, pos: [0.6, 44, 29], at: [0.4, 0, -0.2], fov: 40, focusAt: [0.6, 0.6, 2.2], ap: 5,
    caption: ['Its kill switch:', 'a [study],', 'due 16 November.'], tag: 'SACRAMENTO · ORDER N-9-26' },
  { name: 'ks2-3-macro', side: 'front', pos: [-1.6, 9.5, 9.6], at: [-2.6, 0.2, 2.6], fov: 34, focusAt: [-3.0, 0.3, 2.9], ap: 10 },
];
function draw(i) {
  const L = LOOKS[i];
  paperMat.map = L.side === 'front' ? texFront : texBack; paperMat.needsUpdate = true;
  note.visible = !!L.note; if (L.note) placeNote();
  camera.fov = L.fov; camera.position.set(...L.pos); camera.lookAt(...L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  const fd = camera.position.distanceTo(new THREE.Vector3(...L.focusAt));
  post.render(scene, camera, { focus: fd, aperture: L.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.3, knee: 0.5, bloomA: 0.16, bloomB: 0.1, exposure: 1.08, vignette: 0.42, grain: 0.03, seed: i * 17 + 3,
    sat: 1.02, contrast: 1.06, lift: [0.004, 0.003, 0.002], gain: [1.03, 1.0, 0.96], toe: 0.04 });
  g2d.drawImage(renderer.domElement, 0, 0);
  if (L.caption) caption(g2d, L.caption, 236);
  if (L.tag) tag(g2d, L.tag);
  return out2d.toDataURL('image/png');
}
window.__film = { looks: LOOKS.map((l) => ({ name: l.name })), look: draw };
window.__ready = true;
