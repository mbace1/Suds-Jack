// WHO WROTE THE BILL? (RFH · Davis / Tucker County, W. Va.), 3D v1, 19 Nov. Owner, 19 Nov: "Top3", then "Go ahead with
// stills for A". Device: the town's rulebook. A town clerk's typewriter at night types the headings of a blank ordinance
// (TOWN OF ____: generic on purpose, Davis passed a resolution, not an ordinance) and each heading is stamped PREEMPTED
// with the statute's number. The corkboard behind carries the recorded line and the two denials. The last sheet in the
// typewriter is the bill itself, ending DRAFTED BY: and a blinking cursor.
//   s1  the wide: the desk, the lamp, a blank ordinance being typed
//   s2  close on the paper: NOISE · LIGHTING · VIEWSHED · ZONING · LAND USE, each stamped PREEMPTED
//   s3  up to the corkboard: the recorded line, pinned
//   s4  along the board: the company's and the governor's office's denials, stapled beside it
//   s5  back to the wide: the new sheet is the bill; DRAFTED BY: _
// The clerk's office kit (new): oak desk, enamel and chrome, paper and cork under a green banker's lamp.
import { THREE, W, H, Q, FPS, clamp, lerp, smooth, ease, rng, C3, hash2, fbm, hermite3, canvasTex, std, lum, mesh, rbox, glow,
  shadowed, castAll, normalTex, canvasOf, shoot, out, g2d, renderer } from '../kit/night.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CAP from '../../pipeline/text/captions.js';

const LANG = Q.get('lang') || 'en', FONT_DIR = Q.get('fonts') || '/_fonts/', TYPE = '"Courier 10 Pitch", "Courier New", monospace', RED = '#b4232c';
for (const [fam, file] of [['Caveat-600', 'Caveat-600.woff']]) { const f = new FontFace(fam, `url(${FONT_DIR}${file})`); document.fonts.add(await f.load()); }
await document.fonts.load(`bold 34px ${TYPE}`);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 9.2], ['s4', 13.4], ['s5', 17.4], ['end', 22.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };

// ------------------------------------------------------------------ what gets typed, and when
// sheet 1: a blank ordinance; each heading is typed, then stamped. sheet 2: the bill (swapped in off camera before s5).
const L1 = [[UI.ordNo, 0.5, 1.3], [UI.town, 1.5, 2.7], ['', 2.8, 2.8], [UI.ordOn, 3.0, 3.8], ['', 3.9, 3.9]];
const HEAD = ['h1', 'h2', 'h3', 'h4', 'h5'].map((k, i) => { const a = T.s2 + 0.45 + i * 0.85; return [UI[k], a, a + 0.38]; });
const STAMPS = HEAD.map((h, i) => ({ line: L1.length + i, at: h[2] + 0.2 }));
const SWAP = T.s5 - 0.4;
const L2 = [[UI.b1, T.s5 + 0.1, T.s5 + 0.4], [UI.b2, T.s5 + 0.5, T.s5 + 1.0], [UI.b3, T.s5 + 1.05, T.s5 + 1.35], ['', T.s5 + 1.4, T.s5 + 1.4], [UI.b4, T.s5 + 1.45, T.s5 + 1.85], [UI.b5, T.s5 + 1.9, T.s5 + 2.25], ['', T.s5 + 2.3, T.s5 + 2.3], [UI.b6, T.s5 + 2.4, T.s5 + 2.75]];
const EV = { type: 0.5, h1: HEAD[0][1], stamp1: STAMPS[0].at, stamp2: STAMPS[1].at, stamp3: STAMPS[2].at, stamp4: STAMPS[3].at, stamp5: STAMPS[4].at,
  preempted: popT('preempted'), pin: T.s3 + 0.35, wrote: popT('wrote'), staple1: T.s4 + 0.35, staple2: T.s4 + 0.95, denied: popT('denied'),
  ret: SWAP, bill: T.s5 + 0.1, drafted: T.s5 + 2.4, who: popT('who') };

// ------------------------------------------------------------------ the room: a clerk's office at night
const S = new THREE.Scene(), FOGC = C3('#0a0d0c'); S.fog = new THREE.Fog(FOGC, 0.03, 3.0002);   // the kit's fog: near = density, far = falloff height + haze S.background = FOGC;
S.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.16;
S.add(new THREE.HemisphereLight('#4a5a66', '#120c08', 0.35));
const key = new THREE.SpotLight('#ffd7a0', 13, 12, 0.6, 0.7, 1.5); key.position.set(-1.5, 2.5, 0.9); key.target.position.set(0.05, 0.6, -0.2); S.add(key, key.target);   // the banker's lamp
shadowed(key, 2048, 0.3, 8, { bias: -0.0004, normalBias: 0.02 });
const moon = new THREE.SpotLight('#86a6d8', 70, 16, 0.5, 0.8, 1.4); moon.position.set(3.2, 3.4, -1.0); moon.target.position.set(0, 1.4, -2.6); S.add(moon, moon.target);   // window light across the board
shadowed(moon, 1024, 0.5, 12, { bias: -0.0005, normalBias: 0.03 });
const fill = new THREE.PointLight('#ffb27a', 1.6, 6, 2); fill.position.set(0.4, 1.3, 2.2); S.add(fill);

{ // the desk: oak, grain in its normals
  const grain = canvasOf(512, 512, (g) => { const im = g.createImageData(512, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const v = 128 + 55 * Math.sin(x * 0.07 + fbm(x / 24, y / 110, 3) * 8) + (hash2(x, y) - 0.5) * 26; im.data.set([v, v, v, 255], (y * 512 + x) * 4); } g.putImageData(im, 0, 0); });
  const col = canvasTex(512, 512, (g) => { const im = g.createImageData(512, 512), d = grain.getContext('2d').getImageData(0, 0, 512, 512).data; for (let i = 0; i < 512 * 512; i++) { const k = d[i * 4] / 255; im.data.set([lerp(58, 122, k), lerp(36, 78, k), lerp(20, 44, k), 255], i * 4); } g.putImageData(im, 0, 0); });
  col.wrapS = col.wrapT = THREE.RepeatWrapping; col.repeat.set(3, 2);
  const top = mesh(new THREE.BoxGeometry(4.2, 0.08, 2.4), std('#ffffff', { map: col, normalMap: normalTex(grain, 2, [3, 2]), normalScale: new THREE.Vector2(0.4, 0.4), roughness: 0.42 }), { pos: [0, -0.04, -0.35], parent: S });
  top.receiveShadow = true;
  // the wall: green-grey plaster, a chair rail, the floor dark below
  const plaster = canvasTex(256, 256, (g) => { const im = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = fbm(x / 30, y / 30, 4) * 0.5 + 0.5 + (hash2(x, y) - 0.5) * 0.08; im.data.set([lerp(30, 52, v), lerp(40, 62, v), lerp(36, 56, v), 255], (y * 256 + x) * 4); } g.putImageData(im, 0, 0); });
  plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping; plaster.repeat.set(3, 2);
  mesh(new THREE.PlaneGeometry(9, 6), std('#ffffff', { map: plaster, roughness: 0.9 }), { pos: [0, 1.5, -2.75], parent: S });
  mesh(new THREE.BoxGeometry(9, 0.06, 0.05), std('#2c1d12', { roughness: 0.5 }), { pos: [0, 0.75, -2.72], parent: S }); }

// ------------------------------------------------------------------ the typewriter
const TW = new THREE.Group(); S.add(TW);
const enamel = std('#18221d', { roughness: 0.28, metalness: 0.25, envMapIntensity: 0.9 }), chrome = std('#d8dde0', { metalness: 1, roughness: 0.16, envMapIntensity: 1.2 }),
  rubber = std('#0b0b0b', { roughness: 0.55 }), keyTop = std('#ece3cf', { roughness: 0.4 }), keyRing = std('#202020', { metalness: 0.6, roughness: 0.3 });
mesh(rbox(1.32, 0.3, 0.86, 0.08), enamel, { pos: [0, 0.17, 0.05], parent: TW });                         // the body
mesh(rbox(1.2, 0.12, 0.5, 0.05), enamel, { pos: [0, 0.38, -0.12], parent: TW });                         // the shoulders under the carriage
{ const deck = new THREE.Group(); deck.position.set(0, 0.29, 0.34); deck.rotation.x = 0.32; TW.add(deck);   // four rows of round keys on a sloped deck
  const R = rng(3); for (let r = 0; r < 4; r++) for (let c = 0; c < 11 - (r === 3 ? 3 : 0); c++) { const x = (c - 5 + r * 0.25 + (r === 3 ? 1.5 : 0)) * 0.098, z = (r - 1.5) * 0.1, y = 0.035 + r * 0.004;
    const k = new THREE.Group(); k.position.set(x, y, -z); deck.add(k); mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 6), chrome, { pos: [0, -0.035, 0], parent: k });
    mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.016, 24), keyRing, { parent: k }); mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.018, 24), keyTop, { pos: [0, 0.002, 0], parent: k }); k.userData.ph = R(); }
  mesh(new THREE.BoxGeometry(0.5, 0.025, 0.07), keyTop, { pos: [0, 0.03, 0.27], parent: deck }); }   // the space bar
const PLATEN = new THREE.Vector3(0, 0.56, -0.2);
mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.3, 40), rubber, { pos: PLATEN.toArray(), rot: [0, 0, Math.PI / 2], parent: TW });
for (const s of [-1, 1]) { mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 32), chrome, { pos: [s * 0.7, PLATEN.y, PLATEN.z], rot: [0, 0, Math.PI / 2], parent: TW });
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 24), chrome, { pos: [s * 0.77, PLATEN.y, PLATEN.z], rot: [0, 0, Math.PI / 2], parent: TW }); }
mesh(new THREE.BoxGeometry(1.36, 0.04, 0.16), chrome, { pos: [0, 0.47, -0.08], parent: TW });                // the paper bail
{ const lever = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.66, 0.6, -0.2), new THREE.Vector3(-0.78, 0.66, -0.05), new THREE.Vector3(-0.86, 0.68, 0.12)]);
  mesh(new THREE.TubeGeometry(lever, 16, 0.014, 8), chrome, { parent: TW }); }                              // the carriage-return lever
mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), chrome, { pos: [0, 0.44, 0.02], parent: TW });              // the type guide, where the letter strikes

// the paper: a canvas, redrawn whenever the typing changes
const PW = 720, PH = 900, PA = 0.32, paperC = canvasOf(PW, PH, () => {}), paperTex = new THREE.CanvasTexture(paperC); paperTex.colorSpace = THREE.SRGBColorSpace; paperTex.anisotropy = 8;
const paperBase = canvasOf(PW, PH, (g) => { g.fillStyle = '#efe7d3'; g.fillRect(0, 0, PW, PH); const im = g.getImageData(0, 0, PW, PH); for (let i = 0; i < PW * PH; i++) { const n = (hash2(i % PW, (i / PW) | 0) - 0.5) * 10; im.data[i * 4] += n; im.data[i * 4 + 1] += n; im.data[i * 4 + 2] += n; } g.putImageData(im, 0, 0); });
const paper = mesh(new THREE.PlaneGeometry(0.72, 0.9, 1, 8), std('#ffffff', { map: paperTex, roughness: 0.92, side: THREE.DoubleSide }), { parent: TW });
{ const p = paper.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = (0.45 - y) / 0.9; p.setZ(i, 0.02 * Math.sin(k * Math.PI)); } p.needsUpdate = true; paper.geometry.computeVertexNormals(); }
paper.rotation.x = -PA; paper.position.set(0, PLATEN.y + 0.06 + 0.45 * Math.cos(PA), PLATEN.z - 0.05 - 0.45 * Math.sin(PA));
const LINE_Y = 830, LH = 60, MX = 70;
const stampC = STAMPS.map((s, i) => { const R = rng(17 + i * 7); return { rot: (R() - 0.5) * 0.22, dx: (i % 2 ? -60 : 30) + (R() - 0.5) * 30, c: canvasOf(330, 120, (g) => {
  g.strokeStyle = RED; g.fillStyle = RED; g.lineWidth = 7; g.strokeRect(6, 6, 318, 108); g.lineWidth = 2; g.strokeRect(15, 15, 300, 90);
  g.textAlign = 'center'; g.textBaseline = 'middle'; { let fs = 62; do { g.font = `${fs}px "Anton-400"`; fs -= 2; } while (g.measureText(UI.stamp).width > 290 && fs > 30); } g.fillText(UI.stamp, 165, 52); g.font = '700 17px RobotoCondensed'; g.fillText(UI.stampSub, 165, 92);
  g.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 900; k++) { const x = R() * 330, y = R() * 120, r = R() * 2.4 + 0.3; g.globalAlpha = 0.5 + R() * 0.5; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }) }; });
const typed = (line, t) => { const [s, a, b] = line; if (t <= a) return ''; if (t >= b) return s; return s.slice(0, Math.floor(s.length * (t - a) / Math.max(0.01, b - a))); };
let paperKey = '';
function drawPaper(t) {
  const lines = t < SWAP ? [...L1, ...HEAD] : L2, cur = Math.max(0, lines.filter((l) => t >= l[1]).length - 1);
  const shown = lines.map((l) => typed(l, t)), roll = (() => { let k = 0; for (let i = 1; i < lines.length; i++) k += smooth((t - lines[i][1] + 0.18) / 0.18); return k; })();
  const stamps = t < SWAP ? STAMPS.map((s) => clamp((t - s.at) / 0.06)) : [], blink = t > EV.drafted + 0.5 && Math.floor(t * 2.4) % 2 === 0;
  const k = shown.join('|') + stamps.map((v) => v.toFixed(2)).join() + Math.round(roll * 40) + blink;
  if (k === paperKey) return; paperKey = k;
  const g = paperC.getContext('2d'); g.drawImage(paperBase, 0, 0); g.textBaseline = 'alphabetic';
  shown.forEach((s, i) => { if (!s) return; const y = LINE_Y - (roll - i) * LH; if (y < -20 || y > PH + 20) return; const R = rng(101 + i * 13);
    g.font = `bold 34px ${TYPE}`; let x = MX; for (const ch of s) { g.globalAlpha = 0.78 + R() * 0.22; g.fillStyle = '#1b1916'; g.fillText(ch, x, y + (R() - 0.5) * 1.6); x += g.measureText(ch).width; } g.globalAlpha = 1; });
  stamps.forEach((v, i) => { if (v <= 0) return; const s = stampC[i], y = LINE_Y - (roll - STAMPS[i].line) * LH - 12; g.save(); g.translate(PW - 210 + s.dx, y); g.rotate(s.rot); g.globalAlpha = 0.86 * v; g.globalCompositeOperation = 'multiply'; g.scale(0.82, 0.82); g.drawImage(s.c, -165, -60); g.restore(); });
  if (blink) { const y = LINE_Y - (roll - (lines.length - 1)) * LH; g.font = `bold 34px ${TYPE}`; g.fillStyle = '#1b1916'; g.fillText('_', MX + g.measureText(UI.b6).width, y); }
  paperTex.needsUpdate = true; }

// the rubber stamp: comes in along the paper's normal, hits, leaves
const STAMP = new THREE.Group(); S.add(STAMP);
mesh(new THREE.BoxGeometry(0.2, 0.08, 0.035), std('#3a2414', { roughness: 0.5 }), { parent: STAMP });
mesh(new THREE.BoxGeometry(0.19, 0.072, 0.012), std('#7a1a1e', { roughness: 0.7 }), { pos: [0, 0, -0.022], parent: STAMP });
mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 16), std('#3a2414', { roughness: 0.5 }), { pos: [0, 0, 0.065], rot: [Math.PI / 2, 0, 0], parent: STAMP });
mesh(new THREE.SphereGeometry(0.03, 24, 16), std('#2a1a10', { roughness: 0.35 }), { pos: [0, 0, 0.12], parent: STAMP });
const _n = new THREE.Vector3(), _p = new THREE.Vector3();
function stampAt(t) {
  let best = null; for (const s of STAMPS) { const k = (t - s.at + 0.22) / 0.5; if (k > 0 && k < 1) best = { s, k }; }
  STAMP.visible = !!best && t < SWAP; if (!STAMP.visible) return;
  const { s, k } = best, d = k < 0.44 ? 1 - ease.io(k / 0.44) : k < 0.56 ? 0 : ease.io((k - 0.56) / 0.44);
  const lines = [...L1, ...HEAD]; let roll = 0; for (let i = 1; i < lines.length; i++) roll += smooth((t - lines[i][1] + 0.18) / 0.18);
  const v = (LINE_Y - (roll - s.line) * LH - 12) / PH, u = (PW - 210) / PW;
  _p.set((u - 0.5) * 0.72, (0.5 - v) * 0.9, 0.035); paper.localToWorld(_p); _n.set(0, 0, 1).transformDirection(paper.matrixWorld);
  STAMP.position.copy(_p).addScaledVector(_n, 0.02 + d * 0.32); STAMP.quaternion.copy(paper.getWorldQuaternion(new THREE.Quaternion())); STAMP.rotateZ(stampC[STAMPS.indexOf(s)].rot * -1); }

// ------------------------------------------------------------------ the desk dressing: the lamp, a nameplate, an ink pad
{ const L = new THREE.Group(); L.position.set(-0.98, 0, -0.75); S.add(L); const brass = std('#a8823a', { metalness: 0.9, roughness: 0.3 });
  mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 40), brass, { pos: [0, 0.025, 0], parent: L }); mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.62, 16), brass, { pos: [0, 0.33, 0], parent: L });
  const shade = new THREE.CylinderGeometry(0.1, 0.2, 0.5, 40, 1, true, 0, Math.PI); shade.rotateZ(Math.PI / 2); shade.rotateX(Math.PI);
  mesh(shade, std('#145a3a', { roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.94, side: THREE.DoubleSide, emissive: C3('#0a3a22'), emissiveIntensity: 0.6 }), { pos: [0.12, 0.66, 0.05], rot: [0, 0.5, 0], parent: L });
  mesh(new THREE.SphereGeometry(0.05, 16, 12), lum(3, 2.4, 1.6), { pos: [0.12, 0.6, 0.05], parent: L }); glow(L, [0.12, 0.58, 0.05], 0.5, 1.2, 0.8, 0.4); }
{ const n = canvasTex(512, 96, (g) => { g.fillStyle = '#1a1208'; g.fillRect(0, 0, 512, 96); g.strokeStyle = '#b08a3c'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84); g.fillStyle = '#d9b75a'; g.font = '54px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(UI.plate, 256, 50); });
  const np = new THREE.Group(); np.position.set(1.15, 0, 0.35); np.rotation.y = -0.35; S.add(np);
  mesh(new THREE.BoxGeometry(0.6, 0.12, 0.02), [std('#3a2414'), std('#3a2414'), std('#3a2414'), std('#3a2414'), std('#ffffff', { map: n, metalness: 0.4, roughness: 0.35 }), std('#3a2414')], { pos: [0, 0.07, 0], rot: [-0.25, 0, 0], parent: np }); }
mesh(rbox(0.32, 0.04, 0.2, 0.015), std('#262626', { metalness: 0.5, roughness: 0.4 }), { pos: [0.95, 0.02, -0.35], parent: S });   // the ink pad
mesh(new THREE.BoxGeometry(0.29, 0.005, 0.17), std(RED, { roughness: 0.8 }), { pos: [0.95, 0.042, -0.35], parent: S });
{ const R = rng(9); for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(0.62, 0.004, 0.8), std('#e9e1cc', { roughness: 0.95 }), { pos: [-1.0 + R() * 0.02, 0.003 + i * 0.005, 0.45 + R() * 0.02], rot: [0, 0.2 + (R() - 0.5) * 0.08, 0], parent: S }); }   // a stack of blank paper

// ------------------------------------------------------------------ the corkboard and its cards
const BOARD = new THREE.Group(); BOARD.position.set(0, 1.62, -2.68); S.add(BOARD);
{ const cork = canvasTex(512, 384, (g) => { const im = g.createImageData(512, 384); for (let y = 0; y < 384; y++) for (let x = 0; x < 512; x++) { const v = 0.55 + (hash2(x, y) - 0.5) * 0.5 + fbm(x / 14, y / 14, 2) * 0.25; im.data.set([lerp(80, 170, v), lerp(52, 118, v), lerp(30, 70, v), 255], (y * 512 + x) * 4); } g.putImageData(im, 0, 0); });
  mesh(new THREE.BoxGeometry(2.3, 1.55, 0.03), std('#ffffff', { map: cork, roughness: 0.95 }), { parent: BOARD });
  const frame = std('#3a2414', { roughness: 0.5 }); for (const [w, h, x, y] of [[2.42, 0.06, 0, 0.8], [2.42, 0.06, 0, -0.8], [0.06, 1.66, 1.18, 0], [0.06, 1.66, -1.18, 0]]) mesh(new THREE.BoxGeometry(w, h, 0.06), frame, { pos: [x, y, 0.01], parent: BOARD }); }
const wrapText = (g, s, x, y, w, lh) => { const words = s.split(' '); let line = ''; for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (g.measureText(tst).width > w && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = tst; } g.fillText(line, x, y); return y; };
function card(w, h, bg, draw, pos, rot, pin = 'pin') {
  const c = canvasTex(Math.round(w * 900), Math.round(h * 900), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); const im = g.getImageData(0, 0, cw, ch); for (let i = 0; i < cw * ch; i++) { const n = (hash2(i % cw, (i / cw) | 0) - 0.5) * 8; im.data[i * 4] += n; im.data[i * 4 + 1] += n; im.data[i * 4 + 2] += n; } g.putImageData(im, 0, 0); draw(g, cw, ch); });
  c.anisotropy = 8; const grp = new THREE.Group(); grp.position.set(pos[0], pos[1], 0.03); grp.rotation.z = rot; BOARD.add(grp);
  mesh(new THREE.PlaneGeometry(w, h), std('#ffffff', { map: c, roughness: 0.9 }), { parent: grp });
  if (pin === 'pin') { mesh(new THREE.SphereGeometry(0.022, 16, 12), std('#c0262e', { roughness: 0.3 }), { pos: [-w / 2 + 0.045, h / 2 - 0.04, 0.03], parent: grp }); }
  else for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 0.006, 0.006), std('#c9ccd0', { metalness: 1, roughness: 0.25 }), { pos: [s * (w / 2 - 0.08), h / 2 - 0.035, 0.004], rot: [0, 0, s * 0.3], parent: grp });
  return grp; }
const ink = '#1b1916';
const RES = card(0.62, 0.44, '#f1ead6', (g, w, h) => { g.fillStyle = ink; g.textAlign = 'center'; g.font = '46px "Anton-400"'; g.fillText(UI.resTown, w / 2, 90); g.font = `bold 26px ${TYPE}`; wrapText(g, UI.res, w / 2, 150, w - 80, 34);
  g.font = '64px "Anton-400"'; g.fillStyle = '#0d3a26'; g.fillText(UI.resVote, w / 2, h - 60); }, [-0.68, -0.38], -0.04);
const QUOTE = card(0.98, 0.62, '#f4efe2', (g, w, h) => { g.fillStyle = '#b4232c'; g.fillRect(0, 92, w, 3); g.fillStyle = ink; g.textAlign = 'left'; g.font = `bold 24px ${TYPE}`; g.fillText(UI.qHead, 90, 72);
  g.font = '52px "Caveat-600"'; g.fillStyle = '#16233f'; const y = wrapText(g, UI.quote, 40, 150, w - 80, 62); g.font = `bold 22px ${TYPE}`; g.fillStyle = ink; wrapText(g, UI.qWho, 40, Math.min(h - 40, y + 70), w - 80, 28); }, [-0.42, 0.3], 0.03);
const DEN1 = card(0.74, 0.4, '#ffffff', (g, w, h) => { g.fillStyle = ink; g.textAlign = 'left'; g.font = '700 30px RobotoCondensed'; g.fillText(UI.d1Who, 36, 64); g.font = 'italic 600 40px RobotoCondensed'; g.fillStyle = '#16233f'; wrapText(g, UI.d1, 36, 128, w - 70, 50); }, [0.66, 0.42], -0.05, 'staple');
const DEN2 = card(0.7, 0.32, '#ffffff', (g, w, h) => { g.fillStyle = ink; g.textAlign = 'left'; g.font = '700 30px RobotoCondensed'; g.fillText(UI.d2Who, 36, 64); g.font = 'italic 600 40px RobotoCondensed'; g.fillStyle = '#16233f'; wrapText(g, UI.d2, 36, 128, w - 70, 50); }, [0.62, -0.08], 0.05, 'staple');
for (const [x, y, r] of [[0.66, -0.55, 0.08], [-0.05, -0.56, -0.06]]) card(0.36, 0.26, '#efe7cf', (g, w, h) => { g.fillStyle = 'rgba(27,25,22,.5)'; for (let i = 0; i < 6; i++) g.fillRect(28, 40 + i * 30, (w - 56) * (0.5 + 0.5 * hash2(i, x * 9)), 6); }, [x, y], r);   // old notices, unreadable
castAll(S); paper.castShadow = false;

// ------------------------------------------------------------------ the camera: one move, the last frame is the first
const CAMP = hermite3([[0, [-0.68, 1.36, -0.75]], [T.s2 - 1.0, [-0.68, 1.36, -0.72]], [T.s2 - 0.2, [0.14, 1.12, 1.95]], [T.s2 + 0.8, [-0.02, 1.04, 1.36]], [T.s3 - 0.4, [0.04, 1.0, 1.26]],
  [T.s3 + 1.0, [-0.36, 1.92, 0.25]], [T.s4 - 0.5, [-0.3, 1.92, 0.05]], [T.s4 + 1.0, [0.5, 1.82, 0.25]], [T.s5 - 0.4, [0.42, 1.78, 0.45]], [T.s5 + 1.4, [0.04, 1.08, 1.5]], [T.s5 + 2.9, [0.04, 1.06, 1.4]], [DUR, [-0.68, 1.36, -0.75]]]);
const CAMT = hermite3([[0, [-0.68, 1.3, -2.65]], [T.s2 - 1.0, [-0.68, 1.3, -2.65]], [T.s2 - 0.2, [0, 0.98, -0.35]], [T.s2 + 0.8, [0.03, 0.97, -0.34]], [T.s3 - 0.4, [0.05, 0.95, -0.34]],
  [T.s3 + 1.0, [-0.42, 1.92, -2.65]], [T.s4 - 0.5, [-0.38, 1.9, -2.65]], [T.s4 + 1.0, [0.6, 1.8, -2.65]], [T.s5 - 0.4, [0.55, 1.76, -2.65]], [T.s5 + 1.4, [0.03, 0.97, -0.34]], [T.s5 + 2.9, [0.03, 0.97, -0.34]], [DUR, [-0.68, 1.3, -2.65]]]);
const cam = new THREE.PerspectiveCamera(46, W / H, 0.05, 60), _t = new THREE.Vector3();
function poseCam(t) { CAMP(t, cam.position); CAMT(t, _t); cam.position.y += 0.006 * Math.sin(t * 0.9); cam.lookAt(_t); cam.updateMatrixWorld(true); }

// ------------------------------------------------------------------ the state at t
const pop = (t, at) => { const k = t - at; return k <= 0 ? 0.001 : ease.back(k / 0.3); };
function stateAt(t) {
  poseCam(t); TW.updateMatrixWorld(true); drawPaper(t); stampAt(t);
  QUOTE.scale.setScalar(pop(t, EV.pin)); DEN1.scale.setScalar(pop(t, EV.staple1)); DEN2.scale.setScalar(pop(t, EV.staple2));
  TW.position.y = 0; for (const s of STAMPS) { const k = t - s.at; if (k > -0.02 && k < 0.12) TW.position.y = -0.004 * Math.sin(clamp(k / 0.12) * Math.PI); }   // the desk takes the stamp
}

// ------------------------------------------------------------------ the frame
const tag = (g, text, x, y, { size = 26, col = 'rgba(236,242,255,.92)', bg = 'rgba(8,10,12,.74)', a = 1 } = {}) => { if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.font = `700 ${size}px RobotoCondensed`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = size; while (g.measureText(text).width > W - 140 && s > 18) { s -= 1; g.font = `700 ${s}px RobotoCondensed`; }
  const w = g.measureText(text).width + 36; g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - s * 0.85, w, s * 1.7, 8); g.fill(); g.fillStyle = col; g.fillText(text, x, y); g.restore(); };
const TAGS = [['tag1', T.s1 + 1.2, T.s2 - 0.1], ['tag2', T.s2 + 1.0, T.s3 - 0.1], ['tag3', T.s3 + 1.2, T.s4 - 0.1], ['tag4', T.s4 + 1.4, T.s5 - 0.1], ['tag5', T.s5 + 1.4, DUR - 0.2]];
let BUSY = null;
function frame(t, captions = true, kForce = 0) {
  const K = kForce || Number(Q.get('subs') || 0) || 3, SH = 0.5 / FPS;
  stateAt(t);
  shoot(S, cam, { K, t, seed: Math.floor(t * 24), grade: { exposure: 1.05, bloomA: 0.28, bloomB: 0.22, threshold: 1.0, vignette: 0.6, streak: 0.04, streakThreshold: 6, lift: [0.008, 0.009, 0.01], gain: [1.04, 1.0, 0.95], sat: 1.02, contrast: 1.1 },
    update(j) { const ts = t + ((j + 0.5) / K - 0.5) * SH; poseCam(ts); stampAt(ts); } });
  const g = g2d; g.setTransform(1, 0, 0, 1, 0, 0);
  CAP.bug(g);
  for (const [k, a0, a1] of TAGS) tag(g, UI[k], W / 2, 1760, { a: clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3) });
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
frame(1.0, false, 1);
if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false, 1), 3);
const cueNames = ['type', 'h1', 'stamp1', 'stamp2', 'stamp3', 'stamp4', 'stamp5', 'pin', 'staple1', 'staple2', 'ret', 'bill', 'drafted'];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, lines1: [...L1, ...HEAD].map((l) => [l[1], l[2], l[0].length]), lines2: L2.map((l) => [l[1], l[2], l[0].length]), ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }), look: "clerk's office kit (3D typewriter and corkboard)" },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
