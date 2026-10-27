// THE PANEL v2 (owner, 27 Oct: "maybe needs some orange or other strong color. Push the look further"). v1 is film.js,
// untouched. v2: one saturated colour, ORANGE, on what matters (the folders, the sellers' tags, the bell, the board's key
// word) in an otherwise pale, near-grey room; wingback chairs on a dais, low and big from frame 0; haze in the light;
// darkness beyond the table; tumbling folders; taller towers; a clean board.
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
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#141414', 260, 720);
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
  floor: C('#34322f', { thumbCell: 9, tool: 1.4, mottle: 0.12, rough: 0.6 }), wall: C('#2c2b29', { thumbCell: 12, tool: 1.6, mottle: 0.14 }),
  felt: C('#7b8076', { surf: 'felt', rough: 0.95, thumb: 0.015, thumbCell: 8, mottle: 0.06 }), rim: C('#2e2a27', { rough: 0.45, thumbCell: 5, tool: 1.2 }),
  wood: C('#3a3532', { rough: 0.5, thumbCell: 4, tool: 1.2 }), dais: C('#2a2725', { rough: 0.55, thumbCell: 6, tool: 1.3 }),
  leather: C('#8c857a', { rough: 0.4, thumbCell: 3.2, thumb: 0.035, mottle: 0.08 }), leatherDim: C('#3a3836', { rough: 0.5, thumbCell: 3.2 }),
  metal: C('#8a8780', { rough: 0.35, metal: 0.4, thumb: 0.015 }), folder: C('#e2661a', { rough: 0.75, thumbCell: 2.2, thumb: 0.02, mottle: 0.07, specks: 0.15 }),
  folderEdge: C('#b44e16', { rough: 0.85, thumbCell: 2 }), orange: C('#ee6c18', { rough: 0.32, thumbCell: 2.4, thumb: 0.02, mottle: 0.05 }),
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
const BOARD = mesh0(new THREE.PlaneGeometry(420, 197), new THREE.MeshBasicMaterial({ map: boardTex, toneMapped: false, fog: false }), { pos: [0, 205, -376], parent: scene, cast: false });
mesh0(lumpy(new RoundedBoxGeometry(436, 212, 6, 3, 2), 0.3, 0.2, 51), M.rim, { pos: [0, 205, -380], parent: scene });
const P_UI = {};
const KEY = { en: 'WAR', fi: 'SODAN', ja: '戦争' };
function drawBoard(t) {
  const g = boardCan.getContext('2d');
  g.fillStyle = '#16191b'; g.fillRect(0, 0, BW, BH);
  g.strokeStyle = 'rgba(200,215,220,.07)'; g.lineWidth = 2;
  for (let x = 0; x <= BW; x += 64) { g.beginPath(); g.moveTo(x, 140); g.lineTo(x, BH); g.stroke(); }
  for (let y = 140; y <= BH; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(BW, y); g.stroke(); }
  // one calm sweep line, no sparkle
  const sx = ((t * 0.08) % 1) * BW; g.fillStyle = 'rgba(200,215,220,.06)'; g.fillRect(sx - 40, 140, 80, BH - 140);
  // the title: pale, with the key word in orange
  const txt = P_UI.board1 || '', key = KEY[LANG] || '', ki = key ? txt.indexOf(key) : -1;
  g.font = `${LANG === 'ja' ? '800 76px NotoSansJP-800' : '82px Anton-400'}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const tw = g.measureText(txt).width, x0 = BW / 2 - tw / 2;
  g.fillStyle = 'rgba(236,232,220,.94)'; g.fillText(txt, x0, 92);
  if (ki >= 0) { g.fillStyle = '#ff7a1e'; g.fillText(key, x0 + g.measureText(txt.slice(0, ki)).width, 92); }
  g.fillStyle = '#ff7a1e'; g.fillRect(BW / 2 - 140, 112, 280, 5);
  g.font = `${LANG === 'ja' ? '800 30px NotoSansJP-800' : '700 30px Inter'}`; g.textAlign = 'center'; g.fillStyle = 'rgba(236,232,220,.55)'; g.fillText(P_UI.board2 || '', BW / 2, 158);
  boardTex.needsUpdate = true;
}

// the table: an enormous round of green felt with a dark rim, on one fat pedestal
mesh0(lumpy(new THREE.CylinderGeometry(RT, RT, 3, 160, 1), 0.25, 0.05, 61), M.felt, { pos: [0, TY - 1.5, 0], parent: scene });
mesh0(lumpy(new THREE.TorusGeometry(RT + 1.5, 3.4, 18, 200).rotateX(Math.PI / 2), 0.18, 0.15, 62), M.rim, { pos: [0, TY - 2.2, 0], parent: scene });
mesh0(lumpy(new THREE.CylinderGeometry(RT - 4, RT - 10, 6, 120, 1), 0.3, 0.05, 63), M.wood, { pos: [0, TY - 6, 0], parent: scene });
mesh0(lumpy(new THREE.CylinderGeometry(30, 42, TY - 8, 48, 2), 0.4, 0.08, 64), M.wood, { pos: [0, (TY - 8) / 2, 0], parent: scene });
// a service bell at the head of the table, in front of the three: the room's one joke prop
const BELL = new THREE.Group(); scene.add(BELL); BELL.position.set(0, TY, -112); BELL.scale.setScalar(1.3);
mesh0(lumpy(new THREE.CylinderGeometry(4.6, 5.2, 1.4, 32), 0.05, 0.5, 71), M.wood, { pos: [0, 0.7, 0], parent: BELL });
mesh0(lumpy(new THREE.SphereGeometry(4.2, 32, 16, 0, TAU, 0, Math.PI / 2), 0.04, 0.5, 72), M.orange, { pos: [0, 1.4, 0], parent: BELL });
mesh0(new THREE.CylinderGeometry(0.5, 0.5, 1.6, 12), M.metal, { pos: [0, 5.8, 0], parent: BELL });
mesh0(new THREE.SphereGeometry(0.9, 12, 8), M.metal, { pos: [0, 6.6, 0], parent: BELL });

// the ring light over the table: a plain HDR hoop, the thing everyone remembers about such rooms
const RY = 138;   // high enough that its far edge clears the board's title in every shot
const RING = mesh0(new THREE.TorusGeometry(126, 2.2, 16, 220).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.5, 2.25) }), { pos: [0, RY, 0], parent: scene, cast: false });
for (let k = 0; k < 6; k++) { const a = k / 6 * TAU;   // its hangers
  mesh0(new THREE.CylinderGeometry(0.35, 0.35, 280, 6), M.metal, { pos: [Math.cos(a) * 126, RY + 140, Math.sin(a) * 126], parent: scene, cast: false }); }

// ------------------------------------------------------------------ the chairs
function chair(pos, tall, mat, seed, base = 0) {
  const g = new THREE.Group(); scene.add(g);
  if (!tall) {   // everyone else's: low, plain, dim
    const sy = 19, bh = 30, bw = 24;
    mesh0(lumpy(new RoundedBoxGeometry(bw, 6, 24, 3, 2.2), 0.12, 0.3, seed), mat, { pos: [0, sy, 0], parent: g });
    mesh0(lumpy(new RoundedBoxGeometry(bw + 2, bh, 7, 3, 2.6), 0.14, 0.25, seed + 1), mat, { pos: [0, sy + 3 + bh / 2, -11], parent: g });
    mesh0(lumpy(new THREE.CylinderGeometry(2.2, 3.2, sy - 3, 16), 0.06, 0.5, seed + 4), M.metal, { pos: [0, (sy - 3) / 2, 0], parent: g });
  } else {       // the three: wingbacks, tall and buttoned, with wings and rolled arms: a silhouette you read at a glance
    const sy = 20, bh = 96, bw = 38;
    mesh0(lumpy(new RoundedBoxGeometry(bw, 9, 28, 3, 3), 0.14, 0.3, seed), mat, { pos: [0, sy, 0], parent: g });                         // seat cushion
    mesh0(lumpy(new RoundedBoxGeometry(bw + 4, sy - 4, 26, 3, 3), 0.12, 0.3, seed + 7), mat, { pos: [0, (sy - 4) / 2 + 3, -1], parent: g });  // skirt
    const back = new THREE.Group(); g.add(back); back.position.set(0, sy + 4, -13); back.rotation.x = -0.1;
    mesh0(lumpy(new RoundedBoxGeometry(bw + 4, bh, 9, 4, 4.2), 0.16, 0.25, seed + 1), mat, { pos: [0, bh / 2, 0], parent: back });
    // a crest: the back's top rolls a little higher in the middle
    mesh0(lumpy(sausage([[-(bw / 2 + 1), bh - 2, 0], [0, bh + 5, 0], [bw / 2 + 1, bh - 2, 0]], [4.8, 5.6, 4.8], { steps: 32 }), 0.08, 0.5, seed + 8), mat, { parent: back });
    // tufting: a diamond grid of buttons with a dimple each
    for (let i = 0; i < 8; i++) for (let j = 0; j < 4 - (i % 2); j++) {
      const x = -13.5 + j * 9 + (i % 2) * 4.5, y = 18 + i * 9.5;
      mesh0(new THREE.SphereGeometry(0.85, 8, 6), M.leatherDim, { pos: [x, y, 4.7], parent: back, cast: false }); }
    // the wings: two flat, flared panels at the top of the back, swept forward
    for (const s of [-1, 1]) {
      const w = new THREE.Group(); back.add(w); w.position.set(s * (bw / 2 + 2), bh * 0.58, 0); w.rotation.y = s * 0.42;
      mesh0(lumpy(new RoundedBoxGeometry(5, bh * 0.62, 20, 3, 2.2), 0.12, 0.3, seed + 3 + s), mat, { pos: [0, 0, 9], parent: w });
      // rolled arms down from the wings
      mesh0(lumpy(new RoundedBoxGeometry(6, 13, 26, 3, 2.4), 0.1, 0.4, seed + 5 + s), mat, { pos: [s * (bw / 2 + 2.5), sy + 8, 0], parent: g });
    }
    for (const [x, z] of [[-15, -10], [15, -10], [-15, 10], [15, 10]])   // four short dark legs
      mesh0(lumpy(new THREE.CylinderGeometry(1.4, 1, 4, 10), 0.04, 0.5, seed + 9), M.wood, { pos: [x, 2, z], parent: g });
  }
  g.position.set(pos[0], base, pos[2]); g.rotation.y = Math.atan2(-pos[0], -pos[2]);     // facing the table's centre
  return g;
}
const RC = 172;
// the three: tall, buttoned, at the head of the table (the far side, −z)
const DAIS = 10;   // the three sit on a low dais behind the head of the table, so their seats clear its edge
mesh0(lumpy(new THREE.CylinderGeometry(RC + 34, RC + 38, DAIS, 160, 1, false, Math.PI + 0.5, Math.PI - 1.0), 0.3, 0.05, 81), M.dais, { pos: [0, DAIS / 2, 0], parent: scene });
const PANEL = [-0.34, 0, 0.34].map((d, i) => { const a = -Math.PI / 2 + d; const pos = [Math.cos(a) * RC, 0, Math.sin(a) * RC]; return { g: chair(pos, true, M.leather, 100 + i * 10, DAIS), pos }; });
// everyone else's: low, dim, round the rest of the table, with a gap where the camera comes in
for (let k = 0; k < 20; k++) { const a = -Math.PI / 2 + 0.62 + k * 0.255; if (a > Math.PI / 2 - 0.55 && a < Math.PI / 2 + 0.55) continue; if (a > 3 * Math.PI / 2 - 0.62) continue;
  chair([Math.cos(a) * (RC - 6), 0, Math.sin(a) * (RC - 6)], false, M.leatherDim, 200 + k * 7); }

// the towers: manila folders, dropped one by one onto two of the three seats
const FOLD = 58, FH = 1.3, FCAN = canvas(256, 128), FTEX = tex(FCAN);
function drawFolderLabel() { const g = FCAN.getContext('2d'); g.fillStyle = '#e2661a'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#1e1a18'; g.lineWidth = 7; g.strokeRect(22, 30, 212, 68); g.fillStyle = '#1e1a18'; g.textAlign = 'center';
  g.font = LANG === 'ja' ? '800 50px NotoSansJP-800' : '50px Anton-400'; g.fillText(P_UI.folder || '', 128, 84); FTEX.needsUpdate = true; }
const TOWERS = [0, 2].map((ci, ti) => {
  const c = PANEL[ci], grp = new THREE.Group(); c.g.add(grp); grp.position.set(0, 25, 1);
  const r = rng(300 + ti), folders = [];
  for (let k = 0; k < FOLD; k++) {
    const f = new THREE.Group(); grp.add(f);
    mesh0(lumpy(new RoundedBoxGeometry(21, FH, 15.5, 2, 0.5), 0.03, 0.8, 310 + ti * 50 + k), k % 5 === 4 ? M.folderEdge : M.folder, { parent: f });
    folders.push({ f, rot: (r() - 0.5) * 0.22, dx: (r() - 0.5) * 1.6, dz: (r() - 0.5) * 1.4, sx: (r() - 0.5) * 2, sz: (r() - 0.5) * 2, ox: (r() - 0.5) * 36, oz: (r() - 0.5) * 20, h: 120 + r() * 80 });
  }
  // the top one carries the stamp, facing the table (the chair's +z)
  const lab = mesh0(new THREE.PlaneGeometry(13, 6.5), new THREE.MeshBasicMaterial({ map: FTEX, toneMapped: false }), { pos: [0, FH / 2 + 0.05, 1], rot: [-Math.PI / 2, 0, 0], parent: folders[FOLD - 1].f, cast: false });
  return { ci, grp, folders, lab };
});

const TAGS = TOWERS.map(({ ci }, ti) => {
  const c = PANEL[ci], pivot = new THREE.Group(); c.g.add(pivot); pivot.position.set((ti ? -1 : 1) * 24, DAIS + 10 + 94, -6);
  mesh0(new THREE.CylinderGeometry(0.18, 0.18, 14, 6), M.leatherDim, { pos: [0, -7, 0], parent: pivot, cast: false });   // the string
  const tagG = new THREE.Group(); pivot.add(tagG); tagG.position.set(0, -14, 0);
  const shape = new THREE.Shape(); shape.moveTo(-5, 0); shape.lineTo(5, 0); shape.lineTo(5, -14); shape.lineTo(-5, -14); shape.lineTo(-5, 0);
  mesh0(lumpy(new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.4, bevelSegments: 2 }), 0.05, 0.6, 400 + ti), M.orange, { pos: [0, 0, 0], parent: tagG });
  mesh0(new THREE.TorusGeometry(1.1, 0.35, 8, 16), M.leatherDim, { pos: [0, -2.4, 1.2], parent: tagG, cast: false });  // the eyelet
  return pivot;
});

// ------------------------------------------------------------------ haze: the ring light's beam, the chair spots' cones, dust
function hazeTex() { const c = canvas(4, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.15, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.15)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); return tex(c); }
const HZT = hazeTex();
const hazeMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, map: HZT, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
const BEAM = mesh0(new THREE.CylinderGeometry(120, 150, 270, 96, 1, true), hazeMat('#fff1dc', 0.055), { pos: [0, 30 + 135, -10], parent: scene, cast: false, recv: false });
const CONES = PANEL.map((c) => { const m = mesh0(new THREE.CylinderGeometry(4, 40, 300, 48, 1, true), hazeMat('#fff6e6', 0), { pos: [c.pos[0] * 0.96, 30 + 150, c.pos[2] * 0.96], parent: scene, cast: false, recv: false }); return m; });
const DUST = (() => { const r = rng(77), n = 320, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 150; pos.set([Math.cos(a) * d, 32 + r() * 200, -10 + Math.sin(a) * d], i * 3); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fff3e0', size: 0.45, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  scene.add(p); return p; })();

// ------------------------------------------------------------------ light: a pool from the ring, a spot per chair, a dim room
const hemi = new THREE.HemisphereLight('#c4ccd4', '#4a4038', 0.1); scene.add(hemi);
const pool = new THREE.SpotLight('#fff1dc', 2600, 0, 0.55, 0.6, 1.25); pool.position.set(0, 300, 30); pool.target.position.set(0, TY, -10);
pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.bias = -0.0004; scene.add(pool, pool.target);
const boardGlow = new THREE.PointLight('#bcd0d8', 900, 0, 1.4); boardGlow.position.set(0, 205, -330); scene.add(boardGlow);
const fill = new THREE.DirectionalLight('#a8b8d0', 0.22); fill.position.set(200, 160, 400); scene.add(fill);
const CHAIRSPOT = PANEL.map((c) => { const s = new THREE.SpotLight('#fff6e6', 0, 0, 0.2, 0.45, 1.2); s.position.set(c.pos[0] * 0.96, 330, c.pos[2] * 0.96); s.target.position.set(c.pos[0], 50, c.pos[2]); s.castShadow = true; s.shadow.mapSize.set(1024, 1024); scene.add(s, s.target); return s; });

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
      const tl = EV.drop0 + ti * 0.18 + (k / FOLD) * (span - 0.18), kf = clamp((t - tl + 0.5) / 0.5);
      fd.f.visible = kf > 0;
      // a folder tumbles in from above and off to one side, spinning end over end, and slaps flat onto the pile
      const u = 1 - ease.in(kf), y = k * FH + u * fd.h;
      fd.f.position.set(fd.dx + u * fd.ox, y, fd.dz + u * fd.oz);
      fd.f.rotation.set(u * fd.sx * 3.2, fd.rot + u * 1.4, u * fd.sz * 2.4);
    });
  }
}

// ------------------------------------------------------------------ the shots: a wide lens throughout, the camera floating
const drift = (t, a = 1) => V([Math.sin(t * 0.37) * 2.2 * a, Math.sin(t * 0.53 + 1) * 1.4 * a, Math.cos(t * 0.29) * 1.8 * a]);
const SHOT = [
  { // 1 · low over the felt, close: the three wingbacks big against the ring light and the board
    t0: () => T.s1, t1: () => T.s2,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([0, 33, 18], [0, 34, -8], k)).add(drift(t, 0.4)), at: V([0, 96, -190]), fov: 72 }; } },
  { // 2 · the three, square on; their spots come on in turn
    t0: () => T.s2, t1: () => T.s3,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([0, 40, 10], [0, 42, -14], k)).add(drift(t, 0.4)), at: V([0, 97, -190]), fov: 70 }; } },
  { // 3 · the towers: a little left and low, so both stacks and the tumbling folders read against the dark
    t0: () => T.s3, t1: () => T.s4,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-36, 38, 16], [-30, 40, -6], k)).add(drift(t, 0.4)), at: V([0, 101, -188]), fov: 72 }; } },
  { // 4 · up and back: the ring, the round table, two orange towers and one bare chair, the room falling away into dark
    t0: () => T.s4, t1: () => T.end,
    cam(t, lt, d) { const k = ease.io(lt / (d - 0.8)); return { pos: V(lerp3([0, 52, 20], [0, 100, 180], k)).add(drift(t)), at: V(lerp3([0, 104, -180], [0, 120, -140], k)), fov: lerp(74, 80, k) }; } },
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
const DIGGER = { sat: 0.82, contrast: 1.14, lift: [0.055, 0.06, 0.072], gain: [1.03, 1.0, 0.94], tint: [0.98, 1.0, 1.03], toe: 0.0,
  exposure: 0.98, vignette: 0.42, grain: 0.08, threshold: 1.25, knee: 0.5, bloomA: 0.28, bloomB: 0.2, aberration: 0.0016 };

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  const i = shotAt(t), Sh = SHOT[i], t0 = Sh.t0(), d = Sh.t1() - t0, lt = t - t0;
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  setBoil(Math.floor(t * 12));
  drawBoard(t); towers(t);
  CHAIRSPOT.forEach((s, k) => { const on = 0.2 + 0.8 * ease.out((t - EV.lit(k)) / 0.25); s.intensity = 11000 * on; CONES[k].material.opacity = 0.05 * on; });   // a glimmer from frame 0, so the hook shows the three; full on in turn
  TAGS.forEach((p, ti) => { const k = clamp((t - EV.drop0 - 0.1 - ti * 0.25) / 0.6); p.scale.setScalar(k > 0 ? 1 : 0.001); p.rotation.z = (1 - ease.out(k)) * (ti ? -1.2 : 1.2) + Math.sin(t * 2.1 + ti) * 0.05 * k; });
  DUST.rotation.y = t * 0.03; DUST.position.y = Math.sin(t * 0.4) * 3;
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
