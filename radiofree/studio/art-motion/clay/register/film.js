// NOT YET LISTED (RFH · Finland's data center register, HE 282/2026), 3D v1, 19 Nov. Owner, 19 Nov: "Top3", then "Go
// ahead with stills for A, later B". Device: the archive table. Our own pins go into a paper map of Finland, one for each
// data-center project the press has reported. The state's register arrives as a steel card drawer; the pins fly into it
// as cards; the lid shuts under NOT PUBLIC; one sheet slides out of its slot: the summary. Back on the map, pin holes.
//   s1  the map: five pins land, each with its flag (place · company, as reported)
//   s2  the register's drawer slides in beside it; the pins lift out of the map and drop into it as cards
//   s3  the lid shuts; NOT PUBLIC
//   s4  a single sheet slides out of the slot: SUMMARY, FIRST ONE BY 30 SEP 2027, bars with no numbers
//   s5  back to the map: five holes where the pins were
// The archive kit (new): a steel table under one cold strip light, paper, brass and grey steel.
// Map: Natural Earth 10m (public domain), see ../iceye/GEO-NOTICE.md.
import { THREE, W, H, Q, FPS, clamp, lerp, smooth, ease, rng, C3, hash2, fbm, hermite3, canvasTex, std, mesh, rbox, glow,
  shadowed, castAll, canvasOf, shoot, out, g2d, renderer } from '../kit/night.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CAP from '../../pipeline/text/captions.js';

const LANG = Q.get('lang') || 'en', TYPE = '"Courier 10 Pitch", "Courier New", monospace', RED = '#b4232c';
await document.fonts.load(`bold 34px ${TYPE}`);
const COPY = await CAP.loadCopy('copy.json');
const GEO = await (await fetch('../iceye/geo.json')).json();
const BEATS = [['s1', 0], ['s2', 4.6], ['s3', 9.4], ['s4', 13.4], ['s5', 17.2], ['end', 21.8]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };

// the pins: [label, lon, lat], south to north so they land up the map
const PINS = [['p1', 27.20, 60.57], ['p2', 25.06, 60.55], ['p3', 27.39, 63.37], ['p4', 27.73, 64.23], ['p5', 25.99, 64.81]];
const LAND = PINS.map((p, i) => T.s1 + 0.55 + i * 0.6), LIFT = PINS.map((p, i) => T.s2 + 1.1 + i * 0.55);
const EV = { pin1: LAND[0], pin2: LAND[1], pin3: LAND[2], pin4: LAND[3], pin5: LAND[4], drawer: T.s2 + 0.15, card1: LIFT[0] + 0.5, card2: LIFT[1] + 0.5,
  card3: LIFT[2] + 0.5, card4: LIFT[3] + 0.5, card5: LIFT[4] + 0.5, lid: T.s3 + 0.35, seal: T.s3 + 0.85, sheet: T.s4 + 0.3, holes: T.s5 + 0.2, who: popT('you') };

// ------------------------------------------------------------------ the room: a steel table under a cold strip light
const S = new THREE.Scene(), FOGC = C3('#07090c'); S.fog = new THREE.Fog(FOGC, 0.04, 3.0002); S.background = FOGC;   // the kit's fog: near = density
S.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.22;
S.add(new THREE.HemisphereLight('#5a6878', '#0c0d10', 0.4));
const key = new THREE.SpotLight('#e4eeff', 28, 14, 0.6, 0.65, 1.4); key.position.set(-0.6, 4.6, 0.8); key.target.position.set(0.3, 0, 0); S.add(key, key.target);
shadowed(key, 2048, 1, 10, { bias: -0.0004, normalBias: 0.02 });
const warm = new THREE.SpotLight('#ffbf80', 9, 10, 0.5, 0.8, 1.5); warm.position.set(2.6, 2.2, 2.6); warm.target.position.set(0.6, 0.2, 0); S.add(warm, warm.target);
{ const brushed = canvasTex(512, 512, (g) => { const im = g.createImageData(512, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const v = 0.5 + (hash2(x, y >> 3) - 0.5) * 0.18 + fbm(x / 80, y / 80, 3) * 0.12; im.data.set([lerp(70, 120, v), lerp(76, 126, v), lerp(84, 134, v), 255], (y * 512 + x) * 4); } g.putImageData(im, 0, 0); });
  brushed.wrapS = brushed.wrapT = THREE.RepeatWrapping; brushed.repeat.set(2, 2);
  mesh(new THREE.BoxGeometry(6, 0.06, 5), std('#ffffff', { map: brushed, metalness: 0.55, roughness: 0.42 }), { pos: [0, -0.03, 0], parent: S }).receiveShadow = true; }

// ------------------------------------------------------------------ the map: Finland on paper
const LON0 = 25.6, LAT0 = 65.0, KX = Math.cos(64.8 * Math.PI / 180), SC = 0.27;            // degrees → metres on the table
const toMap = (lon, lat) => [(lon - LON0) * KX * SC, -(lat - LAT0) * SC];                  // x right, z toward the camera
const MWm = 1.75, MHm = 3.15, MC = canvasOf(1200, 2160, (g, w, h) => {
  const px = ([lon, lat]) => { const [x, z] = toMap(lon, lat); return [(x / MWm + 0.5) * w, (z / MHm + 0.5) * h]; };
  const rings = (list, how) => { for (const r of list) { g.beginPath(); r.forEach((p, i) => { const [x, y] = px(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (how === 'fill') { g.closePath(); g.fill(); } else g.stroke(); } };
  g.fillStyle = '#c9d3d6'; g.fillRect(0, 0, w, h);                                       // the sea, a cold grey-blue
  g.fillStyle = '#ece4cf'; rings(GEO.land, 'fill');
  g.fillStyle = '#bccbd0'; rings(GEO.lakes, 'fill');
  g.strokeStyle = '#7e8c90'; g.lineWidth = 1.6; rings(GEO.land, 'stroke');
  g.setLineDash([10, 7]); g.strokeStyle = '#8a5a52'; g.lineWidth = 2.2; rings(GEO.borders, 'stroke'); g.setLineDash([]);
  g.strokeStyle = 'rgba(60,70,74,.18)'; g.lineWidth = 1; for (let lon = 18; lon <= 34; lon += 2) { g.beginPath(); for (let lat = 58; lat <= 71; lat += 0.5) { const [x, y] = px([lon, lat]); lat === 58 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  for (let lat = 59; lat <= 71; lat += 1) { g.beginPath(); const [a, y] = px([16, lat]), [b] = px([34, lat]); g.moveTo(a, y); g.lineTo(b, y); g.stroke(); }
  g.fillStyle = 'rgba(40,46,50,.55)'; g.font = '86px "Anton-400"'; g.textAlign = 'center'; { const [x, y] = px([27.6, 62.2]); g.save(); g.translate(x, y); g.rotate(-0.1); g.fillText(UI.map, 0, 0); g.restore(); }
  const im = g.getImageData(0, 0, w, h); for (let i = 0; i < w * h; i += 1) { const n = (hash2(i % w, (i / w) | 0) - 0.5) * 9; im.data[i * 4] += n; im.data[i * 4 + 1] += n; im.data[i * 4 + 2] += n; } g.putImageData(im, 0, 0);
  g.strokeStyle = 'rgba(40,46,50,.7)'; g.lineWidth = 6; g.strokeRect(24, 24, w - 48, h - 48); });
const mapTex = new THREE.CanvasTexture(MC); mapTex.colorSpace = THREE.SRGBColorSpace; mapTex.anisotropy = 8;
const holesC = canvasOf(1200, 2160, (g) => g.drawImage(MC, 0, 0)), holesTex = new THREE.CanvasTexture(holesC); holesTex.colorSpace = THREE.SRGBColorSpace; holesTex.anisotropy = 8;
const MAP = mesh(new THREE.PlaneGeometry(MWm, MHm, 24, 40), std('#ffffff', { map: mapTex, roughness: 0.88 }), { pos: [-0.35, 0.004, 0], rot: [-Math.PI / 2, 0, 0], parent: S });
{ const p = MAP.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (MWm / 2), y = p.getY(i) / (MHm / 2); p.setZ(i, 0.012 * (Math.max(0, Math.abs(x) - 0.75) * 4) ** 2 * (Math.abs(y) > 0.85 ? 1.6 : 1) + 0.004 * Math.sin(y * 9 + x * 3)); } p.needsUpdate = true; MAP.geometry.computeVertexNormals(); }
MAP.receiveShadow = true;
const pinXZ = PINS.map(([, lon, lat]) => { const [x, z] = toMap(lon, lat); return [x - 0.35, z]; });
// the holes left behind (drawn into a second copy of the map, swapped in when the pins have gone)
{ const g = holesC.getContext('2d'); PINS.forEach(([, lon, lat]) => { const [x, z] = toMap(lon, lat), u = (x / MWm + 0.5) * 1200, v = (z / MHm + 0.5) * 2160;
  g.fillStyle = 'rgba(20,18,16,.85)'; g.beginPath(); g.arc(u, v, 5, 0, 7); g.fill(); g.strokeStyle = 'rgba(60,50,40,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(u, v, 11, 0, 7); g.stroke(); }); }

// the pins: a brass needle, a red head, a paper flag with the place
const PIN = PINS.map(([k], i) => {
  const grp = new THREE.Group(); S.add(grp);
  mesh(new THREE.CylinderGeometry(0.004, 0.0015, 0.16, 8), std('#c9a24a', { metalness: 0.9, roughness: 0.3 }), { pos: [0, 0.08, 0], parent: grp });
  mesh(new THREE.SphereGeometry(0.03, 20, 14), std('#c22a30', { roughness: 0.28 }), { pos: [0, 0.17, 0], parent: grp });
  const lab = canvasTex(520, 120, (g) => { g.fillStyle = '#f5f0e2'; g.fillRect(0, 0, 520, 120); g.strokeStyle = '#2a2a2a'; g.lineWidth = 4; g.strokeRect(2, 2, 516, 116); g.fillStyle = '#1b1916'; g.font = '60px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(UI[k], 260, 64); });
  const flag = mesh(new THREE.PlaneGeometry(0.42, 0.097), std('#ffffff', { map: lab, roughness: 0.85, side: THREE.DoubleSide }), { pos: [0.23, 0.14, 0], rot: [-0.55, 0, 0], parent: grp });
  flag.castShadow = true; grp.userData.flag = flag; return grp; });

// ------------------------------------------------------------------ the register: a steel card drawer, its lid, its slot
const DR = new THREE.Group(); S.add(DR);
const steel = std('#5c6670', { metalness: 0.7, roughness: 0.38 }), dark = std('#1d2126', { metalness: 0.5, roughness: 0.5 });
mesh(rbox(0.86, 0.42, 1.1, 0.02), steel, { pos: [0, 0.21, 0], parent: DR });
mesh(new THREE.BoxGeometry(0.78, 0.02, 1.02), dark, { pos: [0, 0.411, 0], parent: DR });   // the open top, dark inside
const LID = new THREE.Group(); LID.position.set(0, 0.42, -0.55); DR.add(LID);
mesh(rbox(0.88, 0.03, 1.12, 0.012), steel, { pos: [0, 0.015, 0.56], parent: LID });
const sealC = canvasOf(700, 260, () => {}), sealTex = new THREE.CanvasTexture(sealC); sealTex.colorSpace = THREE.SRGBColorSpace;
function drawSeal(k) { const g = sealC.getContext('2d'); g.clearRect(0, 0, 700, 260); if (k <= 0) return; g.save(); g.globalAlpha = Math.min(1, k * 1.5); g.translate(350, 130); g.rotate(-0.06); g.scale(1 + 0.3 * (1 - k), 1 + 0.3 * (1 - k));
  g.strokeStyle = RED; g.lineWidth = 12; g.strokeRect(-320, -105, 640, 210); g.fillStyle = RED; g.font = '150px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(UI.seal, 0, 8);
  g.globalCompositeOperation = 'destination-out'; const R = rng(5); for (let i = 0; i < 1400; i++) { g.beginPath(); g.arc(R() * 700 - 350, R() * 260 - 130, R() * 3 + 0.4, 0, 7); g.fill(); } g.restore(); sealTex.needsUpdate = true; }
mesh(new THREE.PlaneGeometry(0.78, 0.29), new THREE.MeshStandardMaterial({ map: sealTex, transparent: true, roughness: 0.6, depthWrite: false }), { pos: [0, 0.032, 0.56], rot: [-Math.PI / 2, 0, 0], parent: LID });
{ const lab = canvasTex(700, 220, (g) => { g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, 700, 220); g.fillStyle = '#1b1916'; g.textAlign = 'center'; g.font = '84px "Anton-400"'; g.fillText(UI.drawer, 350, 104); g.font = `bold 40px ${TYPE}`; g.fillText(UI.drawerSub, 350, 176); });
  mesh(new THREE.BoxGeometry(0.62, 0.2, 0.012), [steel, steel, steel, steel, std('#ffffff', { map: lab, roughness: 0.6 }), steel], { pos: [0, 0.22, 0.556], parent: DR });   // the label holder on its front
  mesh(new THREE.BoxGeometry(0.5, 0.012, 0.03), dark, { pos: [0, 0.07, 0.565], parent: DR }); }                      // the slot the summary comes out of
const CARDS = PINS.map((p, i) => { const c = mesh(new THREE.BoxGeometry(0.66, 0.36, 0.006), std('#efe9d8', { roughness: 0.9 }), { pos: [0, 0.25, 0.3 - i * 0.12], parent: DR }); c.visible = false; return c; });
// the summary: one sheet, bars with no numbers on them
const SUM = canvasTex(800, 1100, (g, w, h) => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1916'; g.textAlign = 'left'; g.font = '110px "Anton-400"'; g.fillText(UI.sumHead, 60, 150);
  g.font = `bold 36px ${TYPE}`; g.fillText(UI.sumSub, 60, 220); g.fillRect(60, 250, w - 120, 4); g.font = `bold 32px ${TYPE}`; g.fillText(UI.sumBy, 60, 320);
  const R = rng(11); for (let i = 0; i < 9; i++) { const y = 370 + i * 74; g.fillStyle = 'rgba(27,25,22,.25)'; g.fillRect(60, y, 180, 22); g.fillStyle = '#3a4f5c'; g.fillRect(270, y - 6, 120 + R() * 360, 34); }
  g.fillStyle = 'rgba(27,25,22,.4)'; for (let i = 0; i < 4; i++) g.fillRect(60, 1050 - i * 0 - 20, 0, 0); });
const SHEET = mesh(new THREE.PlaneGeometry(0.46, 0.63), std('#ffffff', { map: SUM, roughness: 0.85, side: THREE.DoubleSide }), { parent: DR });
SHEET.castShadow = true; DR.position.set(1.18, 0, 0.35); DR.rotation.y = -0.18;
castAll(S);

// ------------------------------------------------------------------ the camera
const CAMP = hermite3([[0, [-0.25, 3.7, 2.15]], [T.s2 - 0.3, [-0.2, 3.35, 1.9]], [T.s2 + 1.0, [0.45, 3.25, 2.35]], [T.s3 - 0.3, [0.6, 3.1, 2.35]],
  [T.s3 + 0.8, [1.15, 1.55, 1.75]], [T.s4 - 0.3, [1.2, 1.45, 1.65]], [T.s4 + 0.9, [1.32, 0.62, 1.55]], [T.s5 - 0.3, [1.3, 0.6, 1.45]], [T.s5 + 1.3, [-0.2, 3.35, 1.95]], [DUR, [-0.25, 3.7, 2.15]]]);
const CAMT = hermite3([[0, [-0.32, 0, -0.1]], [T.s2 - 0.3, [-0.3, 0, -0.05]], [T.s2 + 1.0, [0.35, 0, 0.1]], [T.s3 - 0.3, [0.45, 0, 0.15]],
  [T.s3 + 0.8, [1.15, 0.3, 0.25]], [T.s4 - 0.3, [1.15, 0.3, 0.3]], [T.s4 + 0.9, [1.25, 0.25, 0.7]], [T.s5 - 0.3, [1.25, 0.25, 0.7]], [T.s5 + 1.3, [-0.3, 0, -0.05]], [DUR, [-0.32, 0, -0.1]]]);
const cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 60), _t = new THREE.Vector3();
function poseCam(t) { CAMP(t, cam.position); CAMT(t, _t); cam.position.y += 0.006 * Math.sin(t * 0.9); cam.lookAt(_t); cam.updateMatrixWorld(true); }

// ------------------------------------------------------------------ the state at t
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
function stateAt(t) {
  poseCam(t);
  const din = ease.out((t - EV.drawer) / 0.7); DR.position.x = lerp(2.6, 1.18, din); DR.visible = t > EV.drawer - 0.05;
  DR.updateMatrixWorld(true);
  PIN.forEach((p, i) => {
    const [x, z] = pinXZ[i], kIn = clamp((t - LAND[i] + 0.35) / 0.35), kOut = clamp((t - LIFT[i]) / 0.55);
    if (kOut <= 0) { p.position.set(x, 0.004 + (1 - ease.io(kIn)) * 0.7, z); p.visible = t > LAND[i] - 0.35; p.rotation.set(0, 0, 0); p.scale.setScalar(1); }
    else { _a.set(x, 0.004, z); CARDS[i].getWorldPosition(_b); _b.y += 0.3; const k = ease.io(kOut); p.position.lerpVectors(_a, _b, k); p.position.y += Math.sin(k * Math.PI) * 0.55; p.rotation.z = k * 1.2; p.scale.setScalar(1 - 0.7 * k); p.visible = kOut < 1; }
    p.userData.flag.scale.setScalar(clamp((t - LAND[i]) / 0.25) * 0.999 + 0.001);
    CARDS[i].visible = t > LIFT[i] + 0.5; CARDS[i].position.y = 0.25 + 0.12 * Math.exp(-Math.max(0, t - LIFT[i] - 0.5) * 9);
  });
  const shut = ease.io((t - EV.lid) / 0.45); LID.rotation.x = lerp(-1.7, 0, shut);
  drawSeal(clamp((t - EV.seal) / 0.12));
  const k = ease.out((t - EV.sheet) / 0.9); SHEET.visible = t > EV.sheet; SHEET.position.set(0, 0.07 + 0.002, 0.57 + k * 0.42); SHEET.rotation.set(-Math.PI / 2 + 0.06, 0, 0.04);
  MAP.material.map = t > LIFT[0] ? holesTex : mapTex;
}

// ------------------------------------------------------------------ the frame
const tag = (g, text, x, y, { size = 26, a = 1 } = {}) => { if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.font = `700 ${size}px RobotoCondensed`; g.textAlign = 'center'; g.textBaseline = 'middle';
  let s = size; while (g.measureText(text).width > W - 140 && s > 18) { s -= 1; g.font = `700 ${s}px RobotoCondensed`; }
  const w = g.measureText(text).width + 36; g.fillStyle = 'rgba(8,10,12,.74)'; g.beginPath(); g.roundRect(x - w / 2, y - s * 0.85, w, s * 1.7, 8); g.fill(); g.fillStyle = 'rgba(236,242,255,.92)'; g.fillText(text, x, y); g.restore(); };
const TAGS = [['tag1', T.s1 + 1.2, T.s2 - 0.1], ['tag2', T.s2 + 1.0, T.s3 - 0.1], ['tag3', T.s3 + 1.2, T.s4 - 0.1], ['tag4', T.s4 + 1.4, T.s5 - 0.1], ['tag5', T.s5 + 1.4, DUR - 0.2]];
let BUSY = null;
function frame(t, captions = true, kForce = 0) {
  const K = kForce || Number(Q.get('subs') || 0) || 3, SH = 0.5 / FPS;
  stateAt(t);
  shoot(S, cam, { K, t, seed: Math.floor(t * 24), grade: { exposure: 1.0, bloomA: 0.24, bloomB: 0.2, threshold: 1.05, vignette: 0.62, streak: 0.03, streakThreshold: 6, lift: [0.006, 0.008, 0.012], gain: [0.98, 1.0, 1.04], sat: 0.96, contrast: 1.1 },
    update(j) { const ts = t + ((j + 0.5) / K - 0.5) * SH; poseCam(ts); } });
  const g = g2d; g.setTransform(1, 0, 0, 1, 0, 0);
  CAP.bug(g);
  for (const [k, a0, a1] of TAGS) tag(g, UI[k], W / 2, 1760, { a: clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3) });
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
frame(1.0, false, 1);
if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false, 1), 3);
const cueNames = ['pin1', 'pin2', 'pin3', 'pin4', 'pin5', 'drawer', 'card1', 'card2', 'card3', 'card4', 'card5', 'lid', 'seal', 'sheet'];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }), look: 'archive kit (3D map table and card drawer)' },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
