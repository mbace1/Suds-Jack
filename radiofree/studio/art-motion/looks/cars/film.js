// LOOK TEST · 3D MINIATURE CARS (2 Nov, for the owner's approval; not for posting). The owner: "a 3d video with cars
// driving and stopping I saw … can work with RFH if done right". The interpretation: a tilt-shift toy world.
//   Soft low-poly vehicles with rounded bevels and glossy toy paint; wheels that really roll (angle = distance / r);
//   ease-in braking with a nose-dip and a rebound rock on the stop; brake lights that bloom; a 3/4 overhead camera on a
//   long lens that slowly dollies; a screen-space tilt-shift band centred on the barrier; warm key, cool fill, grain.
// The beat (an RFH concept, Muhos): a convoy of timber trucks and cars rolls down a forest road towards a fenced site
// and brakes one by one at a barrier: STOP · HALT ORDER · 6 OCT. Dusk falls; the brake lights glow. The fence names
// Google in plain type (owner, 2 Nov), no logo.
// 1080×1920, 30 fps, 8 s. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../../clay/welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['NotoSansJP-800', 'NotoSansJP-800.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ renderer, scene, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // the toy paint's glossy highlights
scene.environmentIntensity = 0.55;
const FOG = C3('#c99a86'); scene.fog = new THREE.Fog(FOG, 70, 150); scene.background = FOG.clone();
const camera = new THREE.PerspectiveCamera(26, W / H, 1, 400);
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ materials: toy paint, rubber, ground
const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const M = {
  ground: matte('#4f5a2e', { roughness: 1 }), shoulder: matte('#8a7a60'), road: matte('#3a3a3e', { roughness: 0.9 }),
  line: matte('#efe7d2', { roughness: 0.7 }), mud: matte('#6b4a32', { roughness: 1 }), stump: matte('#c8a275'),
  rubber: matte('#1c1c1f', { roughness: 0.7 }), hub: paint('#cfd2d6', { metalness: 0.4, roughness: 0.3 }),
  chassis: matte('#26272b', { roughness: 0.6 }), glass: paint('#1a2230', { roughness: 0.08, clearcoat: 1 }),
  bark: matte('#7a5236'), logEnd: matte('#e3c08a'), spruce: matte('#264a33'), spruce2: matte('#2f5a3a'),
  birchTrunk: matte('#efeae0'), birchLeaf: matte('#e3a833'), birchLeaf2: matte('#d68a2a'),
  concrete: matte('#b9b4aa'), steel: paint('#9aa3ad', { metalness: 0.5, roughness: 0.35 }), fence: matte('#c9ccd0', { roughness: 0.5 }),
  white: paint('#f2efe8'), red: paint('#d7372b'), post: paint('#e8e4da'),
};
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ------------------------------------------------------------------ the world: forest road, barrier, fenced site
const BARRIER_Z = -18, ROAD_W = 7.5;
mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), M.ground, { cast: false });
mesh(new THREE.PlaneGeometry(ROAD_W + 3, 220).rotateX(-Math.PI / 2), M.shoulder, { pos: [0, 0.01, 40], cast: false });
mesh(new THREE.PlaneGeometry(ROAD_W, 220).rotateX(-Math.PI / 2), M.road, { pos: [0, 0.02, 40], cast: false });
for (let z = BARRIER_Z + 4; z < 150; z += 6) mesh(new THREE.PlaneGeometry(0.22, 2.8).rotateX(-Math.PI / 2), M.line, { pos: [0, 0.03, z + 1.4], cast: false });
for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(0.16, 220).rotateX(-Math.PI / 2), M.line, { pos: [s * (ROAD_W / 2 - 0.35), 0.03, 40], cast: false });

// the site beyond the barrier: cleared mud, stumps, a fence, a half-built hall, floodlights
mesh(new THREE.PlaneGeometry(120, 70).rotateX(-Math.PI / 2), M.mud, { pos: [0, 0.015, BARRIER_Z - 38], cast: false });
const R0 = rng(7);
const stumpGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9);
for (let i = 0; i < 70; i++) { const x = (R0() - 0.5) * 100, z = BARRIER_Z - 6 - R0() * 60; if (Math.abs(x) < 6 && z > BARRIER_Z - 30) continue;
  const s = mesh(stumpGeo, M.bark, { pos: [x, 0.27, z] }); s.scale.setScalar(0.7 + R0() * 0.7);
  mesh(new THREE.CircleGeometry(0.4, 9).rotateX(-Math.PI / 2), M.stump, { pos: [0, 0.28, 0], parent: s, cast: false }); }
// fence: posts and a translucent mesh panel, across the site's front, with a gap for the road
const fencePanel = new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: 0.6, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
for (const s of [-1, 1]) {
  const x0 = s * (ROAD_W / 2 + 2.5), x1 = s * 48, n = 14;
  for (let i = 0; i <= n; i++) mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), M.fence, { pos: [lerp(x0, x1, i / n), 1.3, BARRIER_Z - 3] });
  mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), 2.4), fencePanel, { pos: [(x0 + x1) / 2, 1.3, BARRIER_Z - 3], cast: false });
}
// the hall: a long grey box, a steel frame where it is still open, a tower crane
mesh(rbox(34, 7, 16, 0.3), M.concrete, { pos: [-14, 3.5, BARRIER_Z - 32] });
for (let i = 0; i < 6; i++) { const x = 6 + i * 3.4;
  mesh(new THREE.BoxGeometry(0.35, 7, 0.35), M.steel, { pos: [x, 3.5, BARRIER_Z - 24.5] }); mesh(new THREE.BoxGeometry(0.35, 7, 0.35), M.steel, { pos: [x, 3.5, BARRIER_Z - 39.5] }); }
mesh(new THREE.BoxGeometry(18, 0.35, 0.35), M.steel, { pos: [14.5, 7, BARRIER_Z - 24.5] }); mesh(new THREE.BoxGeometry(18, 0.35, 0.35), M.steel, { pos: [14.5, 7, BARRIER_Z - 39.5] });
const crane = new THREE.Group(); scene.add(crane); crane.position.set(22, 0, BARRIER_Z - 46);
mesh(new THREE.BoxGeometry(1.2, 26, 1.2), paint('#f0b429'), { pos: [0, 13, 0], parent: crane });
mesh(new THREE.BoxGeometry(26, 0.9, 0.9), paint('#f0b429'), { pos: [-6, 26, 0], parent: crane });
mesh(rbox(2.6, 1.6, 1.6, 0.2), paint('#f2efe8'), { pos: [0, 25, 1.4], parent: crane });
// floodlights on poles at the site (come on at dusk)
const FLOODS = [[-22, BARRIER_Z - 8], [8, BARRIER_Z - 10], [30, BARRIER_Z - 16]].map(([x, z]) => {
  mesh(new THREE.CylinderGeometry(0.14, 0.18, 9, 6), M.steel, { pos: [x, 4.5, z] });
  const lampM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dfe9ff', emissiveIntensity: 0 });
  mesh(rbox(1.6, 0.7, 0.5, 0.12), lampM, { pos: [x, 9.1, z + 0.3], cast: false });
  const pl = new THREE.PointLight('#dce8ff', 0, 40, 1.6); pl.position.set(x, 8.5, z + 2); scene.add(pl); return { lampM, pl };
});

// the barrier: two striped posts and a red-and-white boom across the road, an amber lamp, and the sign
const stripes = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d22d24'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
const boomMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
const BX = ROAD_W / 2 + 1.0;
for (const s of [-1, 1]) mesh(rbox(0.55, 1.5, 0.55, 0.12), M.post, { pos: [s * BX, 0.75, BARRIER_Z] });
mesh(new THREE.CylinderGeometry(0.16, 0.16, BX * 2 + 0.6, 12).rotateZ(Math.PI / 2), boomMat, { pos: [0, 1.25, BARRIER_Z] });
const amberM = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a1f', emissiveIntensity: 0 });
mesh(new THREE.SphereGeometry(0.28, 14, 10), amberM, { pos: [BX, 1.75, BARRIER_Z], cast: false });
const amberL = new THREE.PointLight('#ffa030', 0, 14, 1.8); amberL.position.set(BX, 2.0, BARRIER_Z + 0.6); scene.add(amberL);

await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['end', 8.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;
const FAM = LANG === 'ja' ? 'NotoSansJP-800' : 'Anton-400', WT = LANG === 'ja' ? '800 ' : '';
// the big sign, right of the road at the barrier, angled to the lens: STOP, then the order and its date
const signTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c92a22'; g.lineWidth = 34; g.strokeRect(17, 17, w - 34, h - 34);
  g.fillStyle = '#c92a22'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `330px Anton-400`; g.fillText(UI.stop || 'STOP', w / 2, 380);
  let fs = LANG === 'ja' ? 96 : 118; g.font = `${WT}${fs}px ${FAM}`; while (g.measureText(UI.halt).width > w - 110 && fs > 40) { fs -= 4; g.font = `${WT}${fs}px ${FAM}`; }
  g.fillStyle = '#1d1b19'; g.fillText(UI.halt, w / 2, 545);
});
const SIGN = new THREE.Group(); scene.add(SIGN); SIGN.position.set(BX + 2.9, 0, BARRIER_Z + 1.4); SIGN.rotation.y = -0.2;
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), M.steel, { pos: [s * 2.6, 1.7, -0.12], parent: SIGN });
mesh(rbox(6.6, 4.2, 0.22, 0.08), M.white, { pos: [0, 4.6, -0.1], parent: SIGN });
mesh(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55 }), { pos: [0, 4.6, 0.02], parent: SIGN, cast: false });
// the fence banner (owner, 2 Nov: name Google, plain type, no logo): GOOGLE DATA CENTRE SITE · MUHOS
const siteTex = canvasTex(1536, 200, (g, w, h) => { g.fillStyle = '#1f3b57'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = LANG === 'ja' ? 96 : 120; g.font = `${WT}${fs}px ${FAM}`; while (g.measureText(UI.site).width > w - 80 && fs > 40) { fs -= 4; g.font = `${WT}${fs}px ${FAM}`; } g.fillText(UI.site, w / 2, h / 2 + 6); });
{ const GX = ROAD_W / 2 + 1.4, GY = 6.2, GZ = BARRIER_Z - 3.2;   // a gantry over the road at the fence line: the banner faces the convoy
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.16, 0.18, GY + 0.9, 8), M.steel, { pos: [s * GX, (GY + 0.9) / 2, GZ] });
  mesh(new THREE.BoxGeometry(GX * 2 + 0.6, 0.3, 0.3), M.steel, { pos: [0, GY + 0.9, GZ] });
  mesh(rbox(11.2, 1.95, 0.16, 0.06), paint('#1f3b57'), { pos: [0, GY, GZ - 0.1] });
  mesh(new THREE.PlaneGeometry(11, 1.8), new THREE.MeshStandardMaterial({ map: siteTex, roughness: 0.6 }), { pos: [0, GY, GZ + 0.0] , cast: false }); }

// the forest: spruces (stacked cones) and autumn birches, instanced, kept off the road and the clearing
const spruceGeo = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(2.1 - i * 0.55, 3.0, 7).translate(0, 1.8 + i * 1.7, 0)).concat([new THREE.CylinderGeometry(0.22, 0.28, 1.4, 6).translate(0, 0.7, 0)]).map((g) => g.toNonIndexed()));
const birchTrunk = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 6).translate(0, 2.1, 0), birchCrown = new THREE.IcosahedronGeometry(1.5, 0).translate(0, 4.6, 0);
const R = rng(31), spr = [], bir = [];
for (let i = 0; i < 520; i++) {
  const x = (R() - 0.5) * 190, z = -110 + R() * 230;
  if (Math.abs(x) < ROAD_W / 2 + 3.2) continue;                                   // the road and its shoulders
  if (z < BARRIER_Z - 1 && z > BARRIER_Z - 75 && Math.abs(x) < 58) continue;       // the cleared site
  if (Math.abs(x - (BX + 2.9)) < 5 && Math.abs(z - BARRIER_Z) < 5) continue;       // the sign
  (R() < 0.72 ? spr : bir).push([x, z, 0.7 + R() * 0.75, R() * TAU]);
}
const inst = (geo, mat, list, k = 1) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
  list.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.set(s, s * k, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
inst(spruceGeo, M.spruce, spr.filter((_, i) => i % 2)); inst(spruceGeo, M.spruce2, spr.filter((_, i) => !(i % 2)), 1.1);
inst(birchTrunk, M.birchTrunk, bir); inst(birchCrown, M.birchLeaf, bir.filter((_, i) => i % 2)); inst(birchCrown, M.birchLeaf2, bir.filter((_, i) => !(i % 2)));

// ------------------------------------------------------------------ the toys: two timber trucks, a car, a van
const blobTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false });
function wheel(r, w, parent, x, z) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, r, z);
  mesh(new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2), M.rubber, { parent: g });
  mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 14).rotateZ(Math.PI / 2), M.hub, { parent: g, cast: false });
  for (let k = 0; k < 4; k++) mesh(new THREE.BoxGeometry(w + 0.08, r * 0.16, r * 0.62), M.chassis, { rot: [k * Math.PI / 4, 0, 0], parent: g, cast: false });   // spokes: the roll reads
  return g;
}
function lights(body, w, y, zRear, zFront) {
  const brake = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2414', emissiveIntensity: 0.25 });
  for (const s of [-1, 1]) mesh(rbox(0.42, 0.22, 0.1, 0.04), brake, { pos: [s * (w / 2 - 0.3), y, zRear + 0.03], parent: body, cast: false });
  const head = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff4d0', emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) mesh(rbox(0.4, 0.22, 0.1, 0.04), head, { pos: [s * (w / 2 - 0.3), y, zFront - 0.03], parent: body, cast: false });
  return brake;
}
/** a red point light behind a vehicle: the brake lights wash the road at dusk */
function glowAt(root, z) { const l = new THREE.PointLight('#ff2a14', 0, 7, 2); l.position.set(0, 0.9, z); root.add(l); return l; }
/** a vehicle faces −z (towards the barrier); its root sits on the road, its body pitches about the axle line */
function timberTruck(cabColor) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.62, L = 10.4;
  mesh(new THREE.PlaneGeometry(4.2, L + 1.6).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(2.3, 0.45, L, 0.18), M.chassis, { pos: [0, 0.95, 0], parent: body });
  mesh(rbox(2.5, 2.1, 2.3, 0.45), paint(cabColor), { pos: [0, 2.15, -L / 2 + 1.25], parent: body });
  mesh(rbox(2.36, 0.85, 0.1, 0.06), M.glass, { pos: [0, 2.6, -L / 2 + 0.1], parent: body, cast: false });
  mesh(rbox(2.6, 0.5, 0.5, 0.2), M.chassis, { pos: [0, 1.15, -L / 2 + 0.05], parent: body });                  // bumper
  // the bunks and the logs: a pyramid of cylinders with pale cut ends
  for (const z of [-1.4, 1.2, 3.6]) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), M.chassis, { pos: [s * 1.1, 2.2, z], parent: body });
  const logGeo = new THREE.CylinderGeometry(0.36, 0.36, 6.8, 10).rotateX(Math.PI / 2), endGeo = new THREE.CircleGeometry(0.33, 10);
  const rr = rng(cabColor.length * 13);
  for (const [row, n] of [[0, 3], [1, 2], [2, 1]]) for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.74, y = 1.55 + row * 0.64, z = 1.15 + (rr() - 0.5) * 0.3;
    mesh(logGeo, M.bark, { pos: [x, y, z], parent: body });
    mesh(endGeo, M.logEnd, { pos: [x, y, z + 3.41], parent: body, cast: false }); mesh(endGeo, M.logEnd, { pos: [x, y, z - 3.41], rot: [0, Math.PI, 0], parent: body, cast: false });
  }
  const brake = lights(body, 2.4, 1.15, L / 2, -L / 2);
  const wheels = [-L / 2 + 1.3, 1.6, 3.2].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.5, root, s * 1.12, z)));
  return { root, body, wheels, r, L, brake, dip: 0.045, glow: glowAt(root, L / 2 + 0.8) };
}
function car(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.42, L = 4.3;
  mesh(new THREE.PlaneGeometry(2.8, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(1.9, 0.75, L, 0.32), paint(color), { pos: [0, 0.8, 0], parent: body });
  mesh(rbox(1.66, 0.7, 2.2, 0.32), paint(color), { pos: [0, 1.42, 0.25], parent: body });
  mesh(rbox(1.7, 0.5, 2.0, 0.22), M.glass, { pos: [0, 1.47, 0.25], parent: body, cast: false });
  const brake = lights(body, 1.9, 0.95, L / 2, -L / 2);
  const wheels = [-1.35, 1.35].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.32, root, s * 0.9, z)));
  return { root, body, wheels, r, L, brake, dip: 0.07, glow: glowAt(root, L / 2 + 0.7) };
}
function van(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.46, L = 5.2;
  mesh(new THREE.PlaneGeometry(3, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(2.0, 1.9, L, 0.4), paint(color), { pos: [0, 1.4, 0.15], parent: body });
  mesh(rbox(2.04, 0.62, 1.2, 0.2), M.glass, { pos: [0, 1.75, -L / 2 + 0.95], parent: body, cast: false });
  mesh(rbox(1.6, 0.18, 0.06, 0.04), paint('#e2512d'), { pos: [0, 1.15, L / 2 + 0.17], parent: body, cast: false });   // a stripe on the back
  const brake = lights(body, 2.0, 1.0, L / 2 + 0.15, -L / 2 + 0.15);
  const wheels = [-1.7, 1.7].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.34, root, s * 0.95, z)));
  return { root, body, wheels, r, L, brake, dip: 0.06, glow: glowAt(root, L / 2 + 0.8) };
}
// the convoy, front to back, with where each one stops and when; the right-hand lane is +x
const LANE = 1.85, V0 = 8.5, DEC = 5.2;
const CONVOY = [timberTruck('#d63b2c'), car('#2f6fd6'), timberTruck('#f2b42b'), van('#f1eee6')];
{ let z = BARRIER_Z + 2.4; const stops = [2.9, 3.75, 4.6, 5.35];
  CONVOY.forEach((v, i) => { z += v.L / 2; v.zStop = z; z += v.L / 2 + 1.5; v.ts = stops[i]; v.tb = v.ts - V0 / DEC; v.dB = V0 * V0 / (2 * DEC); }); }
/** z along the road at t: constant speed in, a constant-deceleration stop at zStop at ts */
function zAt(v, t) {
  if (t >= v.ts) return v.zStop;
  if (t >= v.tb) { const u = v.ts - t; return v.zStop + 0.5 * DEC * u * u; }
  return v.zStop + v.dB + V0 * (v.tb - t);
}
const EVENTS_BRAKE = Object.fromEntries(CONVOY.flatMap((v, i) => [['brake' + i, +v.tb.toFixed(3)], ['stop' + i, +v.ts.toFixed(3)]]));

// ------------------------------------------------------------------ light: a low golden key that sinks into dusk
const hemi = new THREE.HemisphereLight('#a9c4ef', '#3d3a2c', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffb57a', 2.6); sun.position.set(-40, 26, -28); sun.target.position.set(0, 0, -6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 }); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#7d9bd6', 0.35); fill.position.set(30, 20, 40); scene.add(fill);

// ------------------------------------------------------------------ one frame
const DUSK = (t) => smooth((t - 4.4) / 3.2);   // golden hour sinks to blue dusk over the second half
const fogA = C3('#d2a48d'), fogB = C3('#36405f');
function setWorld(t) {
  const d = DUSK(t);
  sun.intensity = lerp(2.6, 0.22, d); sun.color.copy(C3('#ffb57a')).lerp(C3('#ff6a4a'), d);
  hemi.intensity = lerp(0.9, 0.3, d); hemi.color.copy(C3('#a9c4ef')).lerp(C3('#4a5c9a'), d);
  scene.environmentIntensity = lerp(0.55, 0.3, d);
  scene.fog.color.copy(fogA).lerp(fogB, d); scene.background.copy(scene.fog.color);
  // floodlights stutter on as it darkens; the barrier lamp blinks all film
  FLOODS.forEach((f, i) => { const on = clamp((t - 5.6 - i * 0.22) / 0.08) * (t > 5.7 + i * 0.22 && t < 5.78 + i * 0.22 ? 0.3 : 1);
    f.lampM.emissiveIntensity = on * 3.2; f.pl.intensity = on * 260; });
  const blink = Math.sin(t * TAU * 1.1) > 0.15 ? 1 : 0.08; amberM.emissiveIntensity = 3.2 * blink; amberL.intensity = 30 * blink * (0.4 + 0.6 * d);
  // the convoy: position, rolling wheels, the nose-dip on braking and the rock back on the stop, brake lights
  for (const v of CONVOY) {
    const z = zAt(v, t), z0 = zAt(v, 0);
    v.root.position.set(LANE, 0, z);
    const roll = (z0 - z) / v.r; v.wheels.forEach((w) => { w.rotation.x = -roll; });
    let pitch = 0;
    if (t >= v.tb && t < v.ts) pitch = -v.dip * smooth((t - v.tb) / 0.22);
    else if (t >= v.ts) { const k = t - v.ts; pitch = -v.dip * Math.exp(-5.5 * k) * Math.cos(13 * k); }
    v.body.rotation.x = pitch; v.body.position.y = pitch * 0.6;
    const braking = t >= v.tb ? clamp((t - v.tb) / 0.08) : 0;
    v.brake.emissiveIntensity = lerp(0.3 + 0.6 * d, lerp(6.5, 5.2, clamp((t - v.ts) / 0.6)), braking);
    v.glow.intensity = braking * lerp(8, 26, d);
  }
}
/** the camera: 3/4 overhead from behind-right on a long lens, dollying slowly in and down */
function cam(t) {
  const k = ease.io(t / DUR);
  const pos = new THREE.Vector3(lerp(13, 10, k), lerp(56, 49, k), lerp(64, 52, k));
  const at = new THREE.Vector3(1.8, 0, lerp(-13, -16, k));
  return { pos, at };
}
const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  setWorld(t);
  const L = cam(t); camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  // the tilt-shift band sits on the barrier: project it, every frame, so the dolly never drifts it out of focus
  tmp.set(LANE, 1, BARRIER_Z + 12).project(camera); const cy = (tmp.y + 1) / 2;
  const d = DUSK(t);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 26, tilt: 22, tiltCenter: cy, tiltBand: 0.42,
    threshold: 0.95, knee: 0.45, bloomA: 0.55, bloomB: 0.35, exposure: lerp(1.04, 1.0, d), vignette: 0.38, grain: 0.032, seed: Math.floor(t * 24),
    sat: 1.12, contrast: 1.06, toe: 0.03, lift: [0.012, 0.016, 0.03], gain: [1.03, 1.0, 0.96] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EVENTS_BRAKE, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
