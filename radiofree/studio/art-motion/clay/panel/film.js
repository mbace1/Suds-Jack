// THE PANEL — RFH (Brink/Coxon), clay, in the manner of *Digger* (Iñárritu / Lubezki on VistaVision, 2026): a pale,
// washed-out grade, very wide lenses with everything in focus, heavy grain and a camera that floats, with the absurd
// calm of a Strangelove war room. The feel only: no frame, character or logo of that film. plan/films/30-the-panel.md
//   1 the table: a slow push over the felt of an enormous round table, towards three tall chairs and the big board
//   2 the chairs: three spotlights come on, one per chair; the chairs are empty, as they stay all film
//   3 the towers: folders rain down onto two of the three seats and stack into towers of CONTRACTS; the third stays bare
//   4 wide: the camera floats up and back; the ring light, the table, two towers and an empty chair
// No figure appears, so no face can. Every number and claim is the copy's (copy.json, each caption's source).
// 1080×1920, 30 fps; nothing acts on twos here but the clay's boil. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../welcome/lib/post.js';
import { surface, setBoil } from '../welcome/lib/clay.js';
import { lumpy, sausage, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex } from '../welcome/lib/city.js';
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
const camera = new THREE.PerspectiveCamera(80, W / H, 2, 4000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), in: (k) => Math.pow(clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; } };

// ------------------------------------------------------------------ clays: the house plasticine, scaled up for a room
const C = (color, o = {}) => surface({ color, wrap: 0.35, wrapTint: '#ffe0c8', rough: 0.7, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 4.5, ridge: 0.1, tool: 0.8, grain: 0.004, grainF: 6, mottle: 0.08, specks: 0.3, roughVar: 0.1, ...o });
const M = {
  floor: C('#5a5650', { thumbCell: 9, tool: 1.4, mottle: 0.12, rough: 0.6 }), wall: C('#4a4844', { thumbCell: 12, tool: 1.6, mottle: 0.14 }),
  felt: C('#6b7a62', { surf: 'felt', rough: 0.95, thumb: 0.015, thumbCell: 8, mottle: 0.06 }), rim: C('#3a2e26', { rough: 0.45, thumbCell: 5, tool: 1.2 }),
  wood: C('#4a3a2e', { rough: 0.5, thumbCell: 4, tool: 1.2 }),
  leather: C('#6a2a24', { rough: 0.42, thumbCell: 3.2, thumb: 0.035, mottle: 0.1 }), leatherDim: C('#4e3c34', { rough: 0.5, thumbCell: 3.2 }),
  metal: C('#8a8780', { rough: 0.35, metal: 0.4, thumb: 0.015 }), folder: C('#c9ae78', { rough: 0.8, thumbCell: 2.2, thumb: 0.02, mottle: 0.1, specks: 0.2 }),
  folderEdge: C('#a88a56', { rough: 0.85, thumbCell: 2 }),
};

// ------------------------------------------------------------------ the room
const TY = 30, RT = 140;                                         // the table top's height and radius
mesh0(new THREE.PlaneGeometry(3000, 3000, 1, 1).rotateX(-Math.PI / 2), M.floor, { parent: scene, cast: false });
// the back wall and its flanks: a raw concrete bunker, the big board set into it
for (const [w, h, pos, ry] of [[1400, 420, [0, 210, -380], 0], [1400, 420, [-460, 210, 0], Math.PI / 2], [1400, 420, [460, 210, 0], -Math.PI / 2]])
  mesh0(lumpy(new THREE.PlaneGeometry(w, h, 60, 18), 1.2, 0.05, 41 + pos[0]), M.wall, { pos, rot: [0, ry, 0], parent: scene, cast: false });
// a sloped concrete ceiling, the way the war room's is
mesh0(new THREE.PlaneGeometry(1400, 1400).rotateX(Math.PI / 2), M.wall, { pos: [0, 400, 0], parent: scene, cast: false });

// the big board: a slate screen, a grid of dull dots and a few that blink, and the study's name across the top
const BW = 1024, BH = 480, boardCan = canvas(BW, BH), boardTex = tex(boardCan);
const BOARD = mesh0(new THREE.PlaneGeometry(330, 155), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false }), { pos: [0, 140, -376], parent: scene, cast: false });
mesh0(lumpy(new RoundedBoxGeometry(346, 170, 6, 3, 2), 0.3, 0.2, 51), M.rim, { pos: [0, 140, -380], parent: scene });
const P_UI = {};
function drawBoard(t) {
  const g = boardCan.getContext('2d'), r = rng(9);
  g.fillStyle = '#1c2226'; g.fillRect(0, 0, BW, BH);
  g.strokeStyle = 'rgba(200,220,230,.08)'; g.lineWidth = 2;
  for (let x = 0; x <= BW; x += 64) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, BH); g.stroke(); }
  for (let y = 110; y <= BH; y += 46) { g.beginPath(); g.moveTo(0, y); g.lineTo(BW, y); g.stroke(); }
  // landmasses as fields of dots: drawn for the film, no real map
  for (let i = 0; i < 520; i++) {
    const cx = [230, 520, 800][i % 3], cy = [300, 260, 330][i % 3], a = r() * TAU, d = Math.sqrt(r()) * [150, 120, 130][i % 3];
    const x = cx + Math.cos(a) * d * 1.3, y = cy + Math.sin(a) * d * 0.7;
    g.fillStyle = 'rgba(190,210,200,.16)'; g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
  }
  for (let i = 0; i < 9; i++) { const x = 140 + r() * 760, y = 180 + r() * 250, on = (Math.sin(t * 2.2 + i * 1.7) > 0.2) ? 1 : 0.15;
    g.fillStyle = `rgba(255,214,150,${on})`; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); }
  g.fillStyle = 'rgba(240,236,224,.92)'; g.textAlign = 'center';
  g.font = `${LANG === 'ja' ? '800 64px NotoSansJP-800' : '64px Anton-400'}`; g.fillText(P_UI.board1 || '', BW / 2, 74);
  g.font = `${LANG === 'ja' ? '800 30px NotoSansJP-800' : '700 30px Inter'}`; g.fillStyle = 'rgba(240,236,224,.6)'; g.fillText(P_UI.board2 || '', BW / 2, 104);
  boardTex.needsUpdate = true;
}

// the table: an enormous round of green felt with a dark rim, on one fat pedestal
mesh0(lumpy(new THREE.CylinderGeometry(RT, RT, 3, 160, 1), 0.25, 0.05, 61), M.felt, { pos: [0, TY - 1.5, 0], parent: scene });
mesh0(lumpy(new THREE.TorusGeometry(RT + 1.5, 3.4, 18, 200).rotateX(Math.PI / 2), 0.18, 0.15, 62), M.rim, { pos: [0, TY - 2.2, 0], parent: scene });
mesh0(lumpy(new THREE.CylinderGeometry(RT - 4, RT - 10, 6, 120, 1), 0.3, 0.05, 63), M.wood, { pos: [0, TY - 6, 0], parent: scene });
mesh0(lumpy(new THREE.CylinderGeometry(30, 42, TY - 8, 48, 2), 0.4, 0.08, 64), M.wood, { pos: [0, (TY - 8) / 2, 0], parent: scene });
// a service bell at the head of the table, in front of the three: the room's one joke prop
const BELL = new THREE.Group(); scene.add(BELL); BELL.position.set(0, TY, -112);
mesh0(lumpy(new THREE.CylinderGeometry(4.6, 5.2, 1.4, 32), 0.05, 0.5, 71), M.wood, { pos: [0, 0.7, 0], parent: BELL });
mesh0(lumpy(new THREE.SphereGeometry(4.2, 32, 16, 0, TAU, 0, Math.PI / 2), 0.04, 0.5, 72), M.metal, { pos: [0, 1.4, 0], parent: BELL });
mesh0(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12), M.metal, { pos: [0, 5.8, 0], parent: BELL });
mesh0(new THREE.SphereGeometry(0.9, 12, 8), M.metal, { pos: [0, 6.6, 0], parent: BELL });

// the ring light over the table: a plain HDR hoop, the thing everyone remembers about such rooms
const RING = mesh0(new THREE.TorusGeometry(126, 2.2, 16, 220).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.25) }), { pos: [0, 128, 0], parent: scene, cast: false });
for (let k = 0; k < 6; k++) { const a = k / 6 * TAU;   // its hangers
  mesh0(new THREE.CylinderGeometry(0.35, 0.35, 280, 6), M.metal, { pos: [Math.cos(a) * 126, 128 + 140, Math.sin(a) * 126], parent: scene, cast: false }); }

// ------------------------------------------------------------------ the chairs
function chair(pos, tall, mat, seed) {
  const g = new THREE.Group(); scene.add(g);
  const sy = 19, bh = tall ? 66 : 30, bw = tall ? 30 : 24;
  mesh0(lumpy(new RoundedBoxGeometry(bw, 6, 24, 3, 2.2), 0.12, 0.3, seed), mat, { pos: [0, sy, 0], parent: g });
  mesh0(lumpy(new RoundedBoxGeometry(bw + 2, bh, 7, 3, 2.6), 0.14, 0.25, seed + 1), mat, { pos: [0, sy + 3 + bh / 2, -11], parent: g });
  if (tall) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++)   // buttoned, like a club chair
    mesh0(new THREE.SphereGeometry(0.7, 8, 6), M.metal, { pos: [-9 + j * 9, sy + 14 + i * 9, -7.3], parent: g, cast: false });
  for (const s of [-1, 1]) mesh0(lumpy(sausage([[s * (bw / 2 + 1.2), sy + 3, -10], [s * (bw / 2 + 1.6), sy + 9, -4], [s * (bw / 2 + 1.6), sy + 9, 9]], [2.2, 2.4, 2.2], { steps: 24 }), 0.06, 0.6, seed + 2 + s), mat, { parent: g });
  mesh0(lumpy(new THREE.CylinderGeometry(2.2, 3.2, sy - 3, 16), 0.06, 0.5, seed + 4), M.metal, { pos: [0, (sy - 3) / 2, 0], parent: g });
  mesh0(lumpy(new THREE.CylinderGeometry(11, 12, 1.6, 24), 0.06, 0.5, seed + 5), M.metal, { pos: [0, 0.8, 0], parent: g });
  g.position.set(...pos); g.rotation.y = Math.atan2(-pos[0], -pos[2]);     // facing the table's centre
  return g;
}
const RC = 172;
// the three: tall, buttoned, at the head of the table (the far side, −z)
const PANEL = [-0.3, 0, 0.3].map((d, i) => { const a = -Math.PI / 2 + d; const pos = [Math.cos(a) * RC, 0, Math.sin(a) * RC]; return { g: chair(pos, true, M.leather, 100 + i * 10), pos }; });
// everyone else's: low, dim, round the rest of the table, with a gap where the camera comes in
for (let k = 0; k < 20; k++) { const a = -Math.PI / 2 + 0.62 + k * 0.255; if (a > Math.PI / 2 - 0.55 && a < Math.PI / 2 + 0.55) continue; if (a > 3 * Math.PI / 2 - 0.62) continue;
  chair([Math.cos(a) * (RC - 6), 0, Math.sin(a) * (RC - 6)], false, M.leatherDim, 200 + k * 7); }

// the towers: manila folders, dropped one by one onto two of the three seats
const FOLD = 34, FH = 1.25, FCAN = canvas(256, 128), FTEX = tex(FCAN);
function drawFolderLabel() { const g = FCAN.getContext('2d'); g.fillStyle = '#c9ae78'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#a8322a'; g.lineWidth = 7; g.strokeRect(22, 30, 212, 68); g.fillStyle = '#a8322a'; g.textAlign = 'center';
  g.font = LANG === 'ja' ? '800 50px NotoSansJP-800' : '50px Anton-400'; g.fillText(P_UI.folder || '', 128, 84); FTEX.needsUpdate = true; }
const TOWERS = [0, 2].map((ci, ti) => {
  const c = PANEL[ci], grp = new THREE.Group(); c.g.add(grp); grp.position.set(0, 22.2, 1);
  const r = rng(300 + ti), folders = [];
  for (let k = 0; k < FOLD; k++) {
    const f = new THREE.Group(); grp.add(f);
    mesh0(lumpy(new RoundedBoxGeometry(21, FH, 15.5, 2, 0.5), 0.03, 0.8, 310 + ti * 50 + k), k % 5 === 4 ? M.folderEdge : M.folder, { parent: f });
    folders.push({ f, rot: (r() - 0.5) * 0.22, dx: (r() - 0.5) * 1.6, dz: (r() - 0.5) * 1.4 });
  }
  // the top one carries the stamp, facing the table (the chair's +z)
  const lab = mesh0(new THREE.PlaneGeometry(13, 6.5), new THREE.MeshBasicMaterial({ map: FTEX, toneMapped: false }), { pos: [0, FH / 2 + 0.05, 1], rot: [-Math.PI / 2, 0, 0], parent: folders[FOLD - 1].f, cast: false });
  return { ci, grp, folders, lab };
});

// ------------------------------------------------------------------ light: a pool from the ring, a spot per chair, a dim room
const hemi = new THREE.HemisphereLight('#c4ccd4', '#4a4038', 0.22); scene.add(hemi);
const pool = new THREE.SpotLight('#fff1dc', 2600, 0, 0.55, 0.6, 1.25); pool.position.set(0, 300, 30); pool.target.position.set(0, TY, -10);
pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.bias = -0.0004; scene.add(pool, pool.target);
const boardGlow = new THREE.PointLight('#bcd0d8', 900, 0, 1.4); boardGlow.position.set(0, 140, -330); scene.add(boardGlow);
const fill = new THREE.DirectionalLight('#a8b8d0', 0.45); fill.position.set(200, 160, 400); scene.add(fill);
const CHAIRSPOT = PANEL.map((c) => { const s = new THREE.SpotLight('#fff6e6', 0, 0, 0.2, 0.45, 1.2); s.position.set(c.pos[0] * 0.92, 330, c.pos[2] * 0.92); s.target.position.set(c.pos[0], 40, c.pos[2]); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); scene.add(s, s.target); return s; });

// ------------------------------------------------------------------ the timeline: 100 BPM; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 100, FPS = 30;
const BEATS = [['s1', 0], ['s2', 9 * B], ['s3', 17 * B], ['s4', 27 * B], ['end', 40 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
Object.assign(P_UI, P.ui);
drawFolderLabel();
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { lit: (k) => T.s2 + 0.45 + k * 0.62, drop0: T.s3 + 0.25, dropN: popOf('sell') - 0.1, ding: popOf('advice') };
const EVENTS = { ...T, lang: LANG, holds: P.holds, lit0: EV.lit(0), lit1: EV.lit(1), lit2: EV.lit(2), drop0: EV.drop0, dropN: EV.dropN, ding: EV.ding, ...CAP.events(P), quiet: [] };

/** the towers at time t: folder k of tower i lands at its own time; the two towers fill a beat apart */
function towers(t) {
  for (const [ti, tw] of TOWERS.entries()) {
    const span = EV.dropN - EV.drop0;
    tw.folders.forEach((fd, k) => {
      const tl = EV.drop0 + ti * 0.18 + (k / FOLD) * (span - 0.18), kf = clamp((t - tl + 0.32) / 0.32);
      fd.f.visible = kf > 0;
      const y = k * FH + (1 - ease.in(kf)) * 90, wob = (1 - kf) * 0.6;
      fd.f.position.set(fd.dx, y, fd.dz); fd.f.rotation.set(wob * 0.4, fd.rot + wob, wob * 0.3);
    });
  }
}

// ------------------------------------------------------------------ the shots: a wide lens throughout, the camera floating
const drift = (t, a = 1) => V([Math.sin(t * 0.37) * 2.2 * a, Math.sin(t * 0.53 + 1) * 1.4 * a, Math.cos(t * 0.29) * 1.8 * a]);
const SHOT = [
  { // 1 · over the felt, low, towards the three and the board
    t0: () => T.s1, t1: () => T.s2,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([0, 42, 112], [0, 42, 36], k)).add(drift(t)), at: V([0, 66, -200]), fov: 80 }; } },
  { // 2 · the three chairs, square on; their spots come on in turn
    t0: () => T.s2, t1: () => T.s3,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([0, 62, 30], [0, 60, 8], k)).add(drift(t, 0.7)), at: V([0, 74, -172]), fov: 74 }; } },
  { // 3 · the towers: from a little left and lower, so both stacks clear the table's edge
    t0: () => T.s3, t1: () => T.s4,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-26, 50, 18], [-20, 52, 0], k)).add(drift(t, 0.7)), at: V([0, 72, -172]), fov: 74 }; } },
  { // 4 · up and back, wide: the ring, the round table, two towers and one bare chair
    t0: () => T.s4, t1: () => T.end,
    cam(t, lt, d) { const k = ease.io(lt / (d - 0.8)); return { pos: V(lerp3([0, 66, 120], [0, 118, 262], k)).add(drift(t)), at: V(lerp3([0, 50, -160], [0, 40, -130], k)), fov: lerp(78, 84, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };

/** a tag, bottom left, in the pale palette: dark ink on bone, clear of the right-hand rail */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = LANG === 'ja' ? '800 30px NotoSansJP-800' : '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = (LANG === 'ja' ? '800 ' : '800 ') + Math.floor(30 * maxW / w) + (LANG === 'ja' ? 'px NotoSansJP-800' : 'px Inter'); w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

// ------------------------------------------------------------------ the Digger grade: pale, lifted, split warm/cold, grainy
const DIGGER = { sat: 0.42, contrast: 1.08, lift: [0.065, 0.07, 0.085], gain: [1.03, 1.0, 0.93], tint: [0.98, 1.0, 1.04], toe: 0.0,
  exposure: 0.95, vignette: 0.22, grain: 0.075, threshold: 1.25, knee: 0.5, bloomA: 0.28, bloomB: 0.2, aberration: 0.0016 };

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  const i = shotAt(t), Sh = SHOT[i], t0 = Sh.t0(), d = Sh.t1() - t0, lt = t - t0;
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  setBoil(Math.floor(t * 12));
  drawBoard(t); towers(t);
  CHAIRSPOT.forEach((s, k) => { s.intensity = 9000 * (0.16 + 0.84 * ease.out((t - EV.lit(k)) / 0.25)); });   // a glimmer from frame 0, so the hook shows the three; full on in turn
  // the bell rings on the punch word: a small hop
  const db = clamp((t - EV.ding) / 0.25); BELL.position.y = TY + Math.sin(db * Math.PI) * 1.2;
  scene.updateMatrixWorld(true);
  const L = Sh.cam(t, lt, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  // deep focus (the wide-lens look): no depth-of-field blur at all
  post.render(scene, camera, { focus: 200, aperture: 0, maxBlur: 1, seed: Math.floor(t * 24), ...DIGGER });
  g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  // the tags: when the study is named; when the towers stand; on the punchline
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, P.ui.tag1, tg(T.s1 + 0.8, T.s2 - 0.1));
  tag(g2d, P.ui.tag2, tg(EV.dropN + 0.2, T.s4 - 0.1));
  tag(g2d, P.ui.tag3, tg(EV.ding + 0.3, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const keep = () => [];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
