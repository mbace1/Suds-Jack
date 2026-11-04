// CUT FIRST (RFH, Google · Muhos), v1 stills, 3 Nov. Built on the approved 3D cars look (looks/cars, owner 3 Nov: "All
// the 3d tests look great and those can be used in the future"): a tilt-shift toy world, soft anime grade, extruded
// toy vehicles whose wheels really roll, ease-in braking with a nose-dip and a rock back on the stop.
// Five shots, one thing happening in each:
//   1 · high and wide over a vast stump field: the last spruce falls, two log trucks drive out          "cleared first"
//   2 · the demo's beat: the convoy rolls back in and brakes at the level crossing, STOP · HALT ORDER    "said stop"
//   3 · from behind the booms: a police car rolls up and stops, blue lights washing the barrier          "investigating"
//   4 · low over the ditch: black walls, and the water in it turning rust                                "black shale"
//   5 · the flip calendar turns to 5 NOV, then the camera rises over the whole clearing at dusk          "cut first, plan last"
// Accuracy: no hall, no crane, no floodlights (the site saw clearing and ditching only); Google named in plain type, no
// logo; no people. 1080×1920, 30 fps. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../welcome/lib/post.js';
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
const V = (a) => new THREE.Vector3(...a), lerp3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

// ------------------------------------------------------------------ renderer, scene, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
const FOG = C3('#aec4e8'); scene.fog = new THREE.Fog(FOG, 130, 420); scene.background = FOG.clone();
const camera = new THREE.PerspectiveCamera(32, W / H, 1, 900);
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ materials
const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const matte = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });
const M = {
  ground: matte('#8bb35c', { roughness: 1 }), shoulder: matte('#dccba4'), road: matte('#676d80', { roughness: 0.9 }),
  line: matte('#f6f1e2', { roughness: 0.7 }), mud: matte('#b48b66', { roughness: 1 }), track: matte('#c9a982', { roughness: 1 }), stump: matte('#e2c08e'),
  rubber: matte('#1c1c1f', { roughness: 0.7 }), hub: paint('#cfd2d6', { metalness: 0.4, roughness: 0.3 }),
  chassis: matte('#26272b', { roughness: 0.6 }), glass: paint('#1a2230', { roughness: 0.08, clearcoat: 1 }),
  bark: matte('#8a5d3c'), logEnd: matte('#f0d29c'), spruce: matte('#3f7a55'), spruce2: matte('#4f8c60'),
  birchTrunk: matte('#f4f0e6'), birchLeaf: matte('#f2c44c'), birchLeaf2: matte('#eaa13f'),
  steel: paint('#9aa3ad', { metalness: 0.5, roughness: 0.35 }), fence: matte('#c9ccd0', { roughness: 0.5 }),
  white: paint('#f2efe8'), post: paint('#e8e4da'), spoil: matte('#7a5a44', { roughness: 1 }), spoil2: matte('#4d3d36', { roughness: 1 }), wet: matte('#9c7756', { roughness: 0.8 }),
  ditchFloor: matte('#2b2522', { roughness: 0.6 }),
};
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent = scene, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ------------------------------------------------------------------ the sky (as the look demo)
const skyTex = canvasTex(8, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#2f64c0'); gr.addColorStop(0.3, '#447fd6'); gr.addColorStop(0.44, '#5e97e2'); gr.addColorStop(0.478, '#8fb8ee'); gr.addColorStop(0.495, '#c4d6f0'); gr.addColorStop(0.5, '#aec4e8'); gr.addColorStop(1, '#aec4e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const SKY = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })); SKY.renderOrder = -1;
scene.add(SKY);
const cloudTex = canvasTex(512, 256, (g, w, h) => { const r = rng(5);
  const B = []; for (let i = 0; i < 22; i++) { const x = 90 + r() * 330, rad = 22 + r() * 40; B.push([x, 168 - rad * 0.55 - Math.sin((x - 90) / 330 * Math.PI) * 55 - r() * 20, rad]); }
  g.save(); g.beginPath(); g.rect(0, 0, w, 176); g.clip();
  for (const [x, y, rad] of B) { g.fillStyle = 'rgba(178,184,226,0.96)'; g.beginPath(); g.arc(x, y + rad * 0.18, rad, 0, TAU); g.fill(); }
  for (const [x, y, rad] of B) { const gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.35, rad * 0.1, x, y - rad * 0.1, rad * 0.92);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.75, 'rgba(250,248,255,0.98)'); gr.addColorStop(1, 'rgba(232,230,250,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y - rad * 0.1, rad * 0.92, 0, TAU); g.fill(); }
  g.restore(); });
const CLOUDS = [[-70, 50, -262, 120], [40, 66, -280, 150], [125, 46, -252, 100], [-10, 38, -244, 80], [-140, 62, -270, 110], [-200, 56, -150, 120], [200, 60, -160, 120]].map(([x, y, z, w]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 2), new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false })); m.position.set(x, y, z); m.lookAt(0, y, 40); scene.add(m); return m; });

// ------------------------------------------------------------------ the world: the road, the crossing, and the cleared site
const BARRIER_Z = -18, ROAD_W = 7.5, BX = ROAD_W / 2 + 1.0;
const SITE = { x0: -88, x1: 88, z0: BARRIER_Z - 2, z1: BARRIER_Z - 128 };              // the clearing: ~176 × 126 toy units
const DITCH = { x0: -48, x1: -10, z: BARRIER_Z - 17, w: 5.0, d: 4.2 };                  // the dug ditch, across the left of the site (a toy's exaggeration: wider and deeper than a real one)
/** a flat ground piece with a rectangular hole (the ditch), x/z in world units */
function holed(x0, x1, z0, z1, y, mat, hole) {
  const sh = new THREE.Shape(); sh.moveTo(x0, -z0); sh.lineTo(x1, -z0); sh.lineTo(x1, -z1); sh.lineTo(x0, -z1); sh.closePath();
  if (hole) { const p = new THREE.Path(); p.moveTo(hole.x0, -(hole.z - hole.w / 2)); p.lineTo(hole.x0, -(hole.z + hole.w / 2)); p.lineTo(hole.x1, -(hole.z + hole.w / 2)); p.lineTo(hole.x1, -(hole.z - hole.w / 2)); p.closePath(); sh.holes.push(p); }
  return mesh(new THREE.ShapeGeometry(sh).rotateX(-Math.PI / 2), mat, { pos: [0, y, 0], cast: false });
}
holed(-400, 400, 400, -400, 0, M.ground, DITCH);
[[-150, -205, 70, 9, '#4f8460'], [40, -235, 95, 11, '#5d8f6e'], [190, -210, 80, 10, '#4f8460'], [-60, -285, 120, 16, '#6f9a86'], [150, -295, 110, 14, '#6f9a86']].forEach(([x, z, r, h, c]) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: c })); m.scale.set(r, h, r * 0.35); m.position.set(x, -1, z); scene.add(m); });
// the public road stops at the crossing; inside the site a gravel haul track carries on into the clearing
mesh(new THREE.PlaneGeometry(ROAD_W + 3, 170).rotateX(-Math.PI / 2), M.shoulder, { pos: [0, 0.01, BARRIER_Z - 4 + 85], cast: false });
mesh(new THREE.PlaneGeometry(ROAD_W, 170).rotateX(-Math.PI / 2), M.road, { pos: [0, 0.02, BARRIER_Z - 4 + 85], cast: false });
for (let z = BARRIER_Z + 4; z < 160; z += 6) mesh(new THREE.PlaneGeometry(0.22, 2.8).rotateX(-Math.PI / 2), M.line, { pos: [0, 0.03, z + 1.4], cast: false });
for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(0.16, 170).rotateX(-Math.PI / 2), M.line, { pos: [s * (ROAD_W / 2 - 0.35), 0.03, BARRIER_Z - 4 + 85], cast: false });
holed(SITE.x0, SITE.x1, SITE.z0, SITE.z1, 0.015, M.mud, DITCH);
mesh(new THREE.PlaneGeometry(ROAD_W + 1, 104).rotateX(-Math.PI / 2), M.track, { pos: [0, 0.025, BARRIER_Z - 4 - 52], cast: false });
// the clearing's floor is not flat colour: lighter wheel ruts and darker wet patches, so the field reads as churned ground
{ const R = rng(19), ruts = [];
  for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 160, z = SITE.z0 - 8 - R() * 112, a = R() * TAU, l = 10 + R() * 26; if (Math.abs(x) < 7 || (Math.abs(z - DITCH.z) < 5 && x < -5)) continue; ruts.push([x, z, a, l]); }
  for (const [x, z, a, l] of ruts) for (const o of [-0.9, 0.9]) mesh(new THREE.PlaneGeometry(0.5, l).rotateX(-Math.PI / 2).rotateY(a), M.track, { pos: [x + Math.cos(a) * o, 0.02, z - Math.sin(a) * o], cast: false });
  for (let i = 0; i < 18; i++) { const x = (R() - 0.5) * 160, z = SITE.z0 - 6 - R() * 116; if (Math.abs(x) < 7) continue;
    const p = mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), M.wet, { pos: [x, 0.018, z], cast: false }); p.scale.set(2 + R() * 4, 1, 1 + R() * 2.5); } }

// stumps: hundreds of them, instanced, cut ends pale, so the field reads as a field of them
const STUMPS = [];
{ const R = rng(7);
  for (let i = 0; i < 2600 && STUMPS.length < 640; i++) {
    const x = (R() - 0.5) * (SITE.x1 - SITE.x0 - 4), z = SITE.z0 - 3 - R() * (SITE.z0 - SITE.z1 - 6);
    if (Math.abs(x) < 7) continue;                                                               // the haul track
    if (x > DITCH.x0 - 3 && x < DITCH.x1 + 3 && Math.abs(z - DITCH.z) < DITCH.w / 2 + 3) continue;  // the ditch and its spoil
    if (x > 8 && x < 30 && z < BARRIER_Z - 8 && z > BARRIER_Z - 26) continue;                     // the log piles
    if (Math.abs(x + 20) < 6 && Math.abs(z - (BARRIER_Z - 34)) < 5) continue;                     // the last tree
    if (Math.abs(x - (-(BX + 4.2))) < 4 && z > BARRIER_Z - 6) continue;                            // the calendar
    STUMPS.push([x, z, 0.65 + R() * 0.75, R() * TAU]);
  } }
{ const stumpGeo = new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9).translate(0, 0.27, 0), capGeo = new THREE.CircleGeometry(0.4, 9).rotateX(-Math.PI / 2).translate(0, 0.552, 0);
  const o = new THREE.Object3D(), a = new THREE.InstancedMesh(stumpGeo, M.bark, STUMPS.length), b = new THREE.InstancedMesh(capGeo, M.stump, STUMPS.length);
  STUMPS.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.setScalar(s); o.updateMatrix(); a.setMatrixAt(i, o.matrix); b.setMatrixAt(i, o.matrix); });
  a.castShadow = true; a.receiveShadow = true; b.receiveShadow = true; scene.add(a, b); }
// the log piles along the haul track: what the clearing became
const logGeo = new THREE.CylinderGeometry(0.42, 0.42, 7, 10).rotateZ(Math.PI / 2), endGeo = new THREE.CircleGeometry(0.39, 10).rotateY(Math.PI / 2);
for (const [px, pz, rows] of [[13, BARRIER_Z - 12, 5], [22, BARRIER_Z - 14, 4], [16, BARRIER_Z - 22, 4]]) {
  const R = rng(px * 7 + 3);
  for (let row = 0; row < rows; row++) for (let i = 0; i < rows - row; i++) {
    const z = pz + (i - (rows - row - 1) / 2) * 0.86, y = 0.42 + row * 0.74, x = px + (R() - 0.5) * 0.5;
    mesh(logGeo, M.bark, { pos: [x, y, z] });
    mesh(endGeo, M.logEnd, { pos: [x + 3.51, y, z], cast: false }); mesh(endGeo, M.logEnd, { pos: [x - 3.51, y, z], rot: [0, Math.PI, 0], cast: false });
  } }

// the ditch: a pit with black-shale walls, spoil heaped along both lips, and water at the bottom that turns rust
const strata = (rep) => { const t = canvasTex(512, 256, (g, w, h) => { const R = rng(41);
  g.fillStyle = '#26252c'; g.fillRect(0, 0, w, h);                                   // the shale
  for (let y = 70; y < h; y += 7 + R() * 9) { g.fillStyle = R() < 0.5 ? '#3a3944' : '#141318'; g.fillRect(0, y, w, 2 + R() * 3); }   // laminae: shale splits in sheets
  for (let i = 0; i < 40; i++) { const x = R() * w, y = 80 + R() * 160; g.fillStyle = '#121116'; g.fillRect(x, y, 30 + R() * 60, 3); }   // cracks along the sheets
  for (let i = 0; i < 36; i++) { g.fillStyle = '#d9bb55'; g.fillRect(R() * w, 80 + R() * 160, 2, 2); }      // a few pyrite glints
  const rs = g.createLinearGradient(0, h * 0.72, 0, h); rs.addColorStop(0, 'rgba(190,90,36,0)'); rs.addColorStop(1, 'rgba(190,90,36,0.85)'); g.fillStyle = rs; g.fillRect(0, h * 0.72, w, h * 0.28);   // rust where the water stands
  g.fillStyle = '#a99c84'; g.fillRect(0, 34, w, 34);                                   // the sandy till
  g.fillStyle = '#5a3d2b'; g.fillRect(0, 0, w, 36);                                    // the topsoil
  for (let x = 0; x < w; x += 6) { g.fillStyle = '#4a7a3e'; g.fillRect(x, 0, 4, 4 + R() * 6); } });
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); return t; };
{ const { x0, x1, z, w, d } = DITCH, L = x1 - x0;
  const wallL = matte('#ffffff', { map: strata(L / 4), side: THREE.BackSide, roughness: 0.9 }), wallS = matte('#ffffff', { map: strata(1), side: THREE.BackSide, roughness: 0.9 });
  const hide = new THREE.MeshBasicMaterial({ visible: false }), floor = matte('#2b2522', { side: THREE.BackSide });
  mesh(new THREE.BoxGeometry(L, d, w), [wallS, wallS, hide, floor, wallL, wallL], { pos: [(x0 + x1) / 2, -d / 2 + 0.012, z], cast: false });
  const R = rng(23);
  for (const s of [-1, 1]) for (let i = 0; i < 13; i++) {
    const m = mesh(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI / 2), R() < 0.5 ? M.spoil : M.spoil2, { pos: [x0 + 1.5 + i * (L - 3) / 12 + (R() - 0.5), 0, z + s * (w / 2 + 1.5 + R() * 0.6)] });
    m.scale.set(2.0 + R() * 0.9, 0.38 + R() * 0.3, 1.1 + R() * 0.4); } }
const waterTex = canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); const R = rng(9);
  g.fillStyle = '#e9e4dc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.5 + R() * 0.5})`; g.fillRect(R() * w, R() * h, 24 + R() * 50, 1.5); } });
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(6, 1);
const WATER = mesh(new THREE.PlaneGeometry(DITCH.x1 - DITCH.x0 - 0.1, DITCH.w - 0.1).rotateX(-Math.PI / 2),
  new THREE.MeshPhysicalMaterial({ color: '#4d4232', map: waterTex, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }), { pos: [(DITCH.x0 + DITCH.x1) / 2, -DITCH.d + 0.55, DITCH.z], cast: false });
const WATER_A = C3('#4b4333'), WATER_B = C3('#c4561c');

// fence posts and mesh panels across the site front, with a gap for the road
const fencePanel = new THREE.MeshStandardMaterial({ color: '#d4d8dc', roughness: 0.6, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false });
for (const s of [-1, 1]) {
  const x0 = s * (ROAD_W / 2 + 2.5), x1 = s * 60, n = 18;
  for (let i = 0; i <= n; i++) mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 6), M.fence, { pos: [lerp(x0, x1, i / n), 1.3, BARRIER_Z - 3] });
  mesh(new THREE.PlaneGeometry(Math.abs(x1 - x0), 2.4), fencePanel, { pos: [(x0 + x1) / 2, 1.3, BARRIER_Z - 3], cast: false });
}

// the crossing: two half-booms on pivots and a pair of alternating red lamps on each post (the look demo)
const stripes = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#d22d24'; g.fillRect(i * w / 8, 0, w / 8 + 1, h); } });
const boomMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
const BOOMS = [-1, 1].map((s) => {
  mesh(rbox(0.6, 1.4, 0.6, 0.14), M.post, { pos: [s * BX, 0.7, BARRIER_Z] });
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8), M.post, { pos: [s * (BX + 0.75), 1.7, BARRIER_Z] });
  const head = new THREE.Group(); scene.add(head); head.position.set(s * (BX + 0.75), 3.3, BARRIER_Z + 0.06);
  mesh(rbox(2.2, 1.0, 0.18, 0.1), matte('#202226'), { parent: head });
  const lamps = [-1, 1].map((k) => { const m = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2a18', emissiveIntensity: 0.1 });
    mesh(new THREE.CircleGeometry(0.34, 20), m, { pos: [k * 0.6, 0, 0.1], parent: head, cast: false });
    mesh(new THREE.CircleGeometry(0.34, 20), m, { pos: [k * 0.6, 0, -0.1], rot: [0, Math.PI, 0], parent: head, cast: false }); return m; });   // a lamp each side: shot 3 looks from the site
  const pivot = new THREE.Group(); scene.add(pivot); pivot.position.set(s * BX, 1.25, BARRIER_Z);
  const len = BX - 0.15;
  mesh(new THREE.CylinderGeometry(0.15, 0.15, len, 12).rotateZ(Math.PI / 2), boomMat, { pos: [-s * len / 2, 0, 0], parent: pivot });
  return { s, pivot, lamps };
});
const bellL = new THREE.PointLight('#ff3a20', 0, 16, 1.8); bellL.position.set(0, 3.0, BARRIER_Z + 1.5); scene.add(bellL);

// ------------------------------------------------------------------ copy and beats
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.4], ['s3', 8.8], ['s4', 13.2], ['s5', 17.6], ['end', 22.4]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.5 }), T = P.T, DUR = T.end, UI = P.ui;
const FAM = LANG === 'ja' ? 'NotoSansJP-800' : 'Anton-400', WT = LANG === 'ja' ? '800 ' : '';
const fit = (g, text, fs, maxW, min = 36) => { g.font = `${WT}${fs}px ${FAM}`; while (g.measureText(text).width > maxW && fs > min) { fs -= 4; g.font = `${WT}${fs}px ${FAM}`; } return fs; };

// the STOP sign, right of the road at the barrier, from shot 2 on: STOP, then the order and its date
const signTex = canvasTex(1024, 640, (g, w, h) => {
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c92a22'; g.lineWidth = 34; g.strokeRect(17, 17, w - 34, h - 34);
  g.fillStyle = '#c92a22'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `330px Anton-400`; g.fillText(UI.stop || 'STOP', w / 2, 380);
  fit(g, UI.halt, LANG === 'ja' ? 96 : 118, w - 110); g.fillStyle = '#1d1b19'; g.fillText(UI.halt, w / 2, 545);
});
const SIGN = new THREE.Group(); scene.add(SIGN); SIGN.position.set(BX + 2.9, 0, BARRIER_Z + 1.4); SIGN.rotation.y = -0.2;
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 8), M.steel, { pos: [s * 2.6, 1.7, -0.12], parent: SIGN });
mesh(rbox(6.6, 4.2, 0.22, 0.08), M.white, { pos: [0, 4.6, -0.1], parent: SIGN });
const SIGN_FACE = mesh(new THREE.PlaneGeometry(6.4, 4.0), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.55, transparent: true }), { pos: [0, 4.6, 0.02], parent: SIGN, cast: false });
// the fence banner over the road (owner, 2 Nov: name Google, plain type, no logo)
const siteTex = canvasTex(1220, 200, (g, w, h) => { g.fillStyle = '#1f3b57'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, UI.site, LANG === 'ja' ? 96 : 120, w - 80); g.fillText(UI.site, w / 2, h / 2 + 6); });
{ const GX = ROAD_W / 2 + 2.3, GY = 6.2, GZ = BARRIER_Z - 3.2;
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.16, 0.18, GY + 0.9, 8), M.steel, { pos: [s * GX, (GY + 0.9) / 2, GZ] });
  mesh(new THREE.BoxGeometry(GX * 2 + 0.6, 0.3, 0.3), M.steel, { pos: [0, GY + 0.9, GZ] });
  mesh(rbox(11.3, 2.0, 0.16, 0.06), paint('#1f3b57'), { pos: [0, GY, GZ + 0.05] });
  mesh(new THREE.PlaneGeometry(11, 1.8), new THREE.MeshStandardMaterial({ map: siteTex, roughness: 0.6 }), { pos: [0, GY, GZ + 0.2], cast: false }); }

// the flip calendar, left of the road at the crossing, facing the convoy: WATER PLAN DUE, and a page that turns 4 → 5
const pageTex = (day) => canvasTex(640, 560, (g, w, h) => { g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1d1b19'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  fit(g, day, LANG === 'ja' ? 210 : 270, w - 70, 80); g.fillText(day, w / 2, LANG === 'ja' ? 360 : 400);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 0, w, 10); });
const headTex = canvasTex(640, 150, (g, w, h) => { g.fillStyle = '#c92a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#fbf8f0'; g.textAlign = 'center'; g.textBaseline = 'middle';
  fit(g, UI.calHead, LANG === 'ja' ? 84 : 104, w - 50, 40); g.fillText(UI.calHead, w / 2, h / 2 + 4);
  for (const x of [w * 0.28, w * 0.72]) { g.fillStyle = '#3a3a3e'; g.beginPath(); g.arc(x, h - 6, 12, 0, TAU); g.fill(); } });
const CAL = new THREE.Group(); scene.add(CAL); CAL.position.set(-(BX + 4.2), 0, BARRIER_Z + 1.6); CAL.rotation.y = 0.32;
const CW = 4.8, CH = 4.2, CY = 4.2;
for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.13, 0.13, CY + CH / 2, 8), M.steel, { pos: [s * (CW / 2 - 0.3), (CY + CH / 2) / 2, -0.2], parent: CAL });
mesh(rbox(CW + 0.3, CH + 1.3, 0.24, 0.08), matte('#2c2d31'), { pos: [0, CY + 0.55, -0.16], parent: CAL });
mesh(new THREE.PlaneGeometry(CW, 1.1), new THREE.MeshStandardMaterial({ map: headTex, color: '#d8d4cc', roughness: 0.9 }), { pos: [0, CY + CH / 2 + 0.6, 0], parent: CAL, cast: false });
mesh(new THREE.PlaneGeometry(CW - 0.1, CH - 0.15), new THREE.MeshStandardMaterial({ map: pageTex(UI.calB), color: '#cfcac0', roughness: 0.95 }), { pos: [0, CY - 0.05, 0.0], parent: CAL, cast: false });
const HINGE = CY + CH / 2 - 0.05, FLIP = new THREE.Group(); CAL.add(FLIP); FLIP.position.set(0, HINGE, 0.03);   // a tear-off page, pinned at its top edge
mesh(new THREE.PlaneGeometry(CW - 0.1, CH - 0.15).translate(0, -(CH - 0.15) / 2, 0), new THREE.MeshStandardMaterial({ map: pageTex(UI.calA), color: '#cfcac0', roughness: 0.95 }), { parent: FLIP, cast: false });
mesh(new THREE.PlaneGeometry(CW - 0.1, CH - 0.15).translate(0, -(CH - 0.15) / 2, 0).rotateY(Math.PI), matte('#ece6d6'), { parent: FLIP, cast: false });

// ------------------------------------------------------------------ the forest, with the clearing cut out of it
const spruceGeo = mergeGeometries([0, 1, 2].map((i) => new THREE.ConeGeometry(2.1 - i * 0.55, 3.0, 7).translate(0, 1.8 + i * 1.7, 0)).concat([new THREE.CylinderGeometry(0.22, 0.28, 1.4, 6).translate(0, 0.7, 0)]).map((g) => g.toNonIndexed()));
const birchTrunk = new THREE.CylinderGeometry(0.14, 0.2, 4.2, 6).translate(0, 2.1, 0), birchCrown = new THREE.IcosahedronGeometry(1.5, 0).translate(0, 4.6, 0);
{ const R = rng(31), spr = [], bir = [];
  for (let i = 0; i < 2600; i++) {
    const x = (R() - 0.5) * 420, z = -230 + R() * 360;
    if (Math.abs(x) < ROAD_W / 2 + 3.2 && z > SITE.z1) continue;                         // the road and the haul track
    const edge = 2 + R() * 3;                                                           // a ragged felling line
    if (z < SITE.z0 + 1 && z > SITE.z1 - edge && x > SITE.x0 - edge && x < SITE.x1 + edge) continue;
    if (Math.abs(x - (BX + 2.9)) < 5 && Math.abs(z - BARRIER_Z) < 5) continue;
    if (Math.abs(x) < 15 && Math.abs(z - BARRIER_Z) < 7) continue;
    if (x > 3 && x < 17 && z > BARRIER_Z - 2 && z < BARRIER_Z + 30) continue;     // the STOP sign seen from the convoy
    if (x < -3 && x > -22 && z > BARRIER_Z - 2 && z < BARRIER_Z + 26) continue;   // shot 3's lens, low on the left
    const isSpr = R() < 0.72; if (!isSpr && z > 12) continue;
    (isSpr ? spr : bir).push([x, z, 0.7 + R() * 0.75, R() * TAU]);
  }
  const inst = (geo, mat, list, k = 1) => { const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
    list.forEach(([x, z, s, r], i) => { o.position.set(x, 0, z); o.rotation.set(0, r, 0); o.scale.set(s, s * k, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  inst(spruceGeo, M.spruce, spr.filter((_, i) => i % 2)); inst(spruceGeo, M.spruce2, spr.filter((_, i) => !(i % 2)), 1.1);
  inst(birchTrunk, M.birchTrunk, bir); inst(birchCrown, M.birchLeaf, bir.filter((_, i) => i % 2)); inst(birchCrown, M.birchLeaf2, bir.filter((_, i) => !(i % 2))); }
// the last spruce standing in the clearing, hinged at its stump: it falls in shot 1
const TREE = new THREE.Group(); scene.add(TREE); TREE.position.set(-20, 0.5, BARRIER_Z - 34);
mesh(spruceGeo, M.spruce2, { pos: [0, -0.5, 0], parent: TREE }).scale.setScalar(1.35);
mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.55, 9), M.bark, { pos: [-20, 0.27, BARRIER_Z - 34] });
const puffTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(236,222,196,0.9)'); gr.addColorStop(1, 'rgba(236,222,196,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const PUFFS = Array.from({ length: 9 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); scene.add(s);
  const R = rng(100 + i); s.userData = { x: -20 - 2 - i * 0.95, z: BARRIER_Z - 34 + (R() - 0.5) * 2.5, dx: (R() - 0.5) * 1.5, dz: (R() - 0.5) * 2 }; return s; });

// ------------------------------------------------------------------ the toys: log trucks, a car, a van, a police car
const blobTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false });
function wheel(r, w, parent, x, z) {
  const g = new THREE.Group(); parent.add(g); g.position.set(x, r, z);
  mesh(new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2), M.rubber, { parent: g });
  mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.04, 14).rotateZ(Math.PI / 2), M.hub, { parent: g, cast: false });
  for (let k = 0; k < 4; k++) mesh(new THREE.BoxGeometry(w + 0.08, r * 0.16, r * 0.62), M.chassis, { rot: [k * Math.PI / 4, 0, 0], parent: g, cast: false });
  return g;
}
function lights(body, w, y, zRear, zFront) {
  const brake = new THREE.MeshStandardMaterial({ color: '#5a0d0a', emissive: '#ff2414', emissiveIntensity: 0.25 });
  for (const s of [-1, 1]) mesh(rbox(0.42, 0.22, 0.1, 0.04), brake, { pos: [s * (w / 2 - 0.3), y, zRear + 0.03], parent: body, cast: false });
  const head = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff4d0', emissiveIntensity: 0.6 });
  for (const s of [-1, 1]) mesh(rbox(0.4, 0.22, 0.1, 0.04), head, { pos: [s * (w / 2 - 0.3), y, zFront - 0.03], parent: body, cast: false });
  return { brake, head };
}
function profile(pts, width, bevel = 0.14) {
  const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const p of pts.slice(1)) sh.lineTo(...p); sh.closePath();
  const d = Math.max(0.05, width - 2 * bevel);
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 }).translate(0, 0, -d / 2).rotateY(Math.PI / 2);
}
function sill(x0, x1, y, wheels, ar) {
  const o = [[x0, y]];
  for (const [wx, wy] of [...wheels].sort((a, b) => a[0] - b[0])) { o.push([wx - ar, y]); for (let i = 0; i <= 10; i++) { const a = Math.PI - i / 10 * Math.PI; o.push([wx + Math.cos(a) * ar, wy + Math.sin(a) * ar]); } o.push([wx + ar, y]); }
  o.push([x1, y]); return o;
}
function glowAt(root, z) { const l = new THREE.PointLight('#ff2a14', 0, 7, 2); l.position.set(0, 0.9, z); root.add(l); return l; }
function timberTruck(cabColor, loaded) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.62, L = 10.4;
  mesh(new THREE.PlaneGeometry(4.2, L + 1.6).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  mesh(rbox(2.3, 0.45, L, 0.18), M.chassis, { pos: [0, 0.95, 0], parent: body });
  mesh(profile([[-1.25, 0.95], [1.15, 0.95], [1.3, 1.25], [1.3, 2.15], [0.95, 3.2], [-1.25, 3.25]], 2.5, 0.2), paint(cabColor), { pos: [0, 0, -L / 2 + 1.3], parent: body });
  mesh(profile([[1.0, 2.25], [0.78, 3.0], [0.05, 3.0], [0.05, 2.25]], 2.56, 0.05), M.glass, { pos: [0, 0, -L / 2 + 1.3], parent: body, cast: false });
  mesh(rbox(2.2, 0.75, 0.08, 0.05), M.glass, { pos: [0, 2.65, -L / 2 + 0.02], rot: [0.3, 0, 0], parent: body, cast: false });
  mesh(rbox(2.6, 0.5, 0.5, 0.2), M.chassis, { pos: [0, 1.15, -L / 2 + 0.05], parent: body });
  for (const z of [-1.4, 1.2, 3.6]) for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), M.chassis, { pos: [s * 1.1, 2.2, z], parent: body });
  if (loaded) { const lg = new THREE.CylinderGeometry(0.36, 0.36, 6.8, 10).rotateX(Math.PI / 2), eg = new THREE.CircleGeometry(0.33, 10), rr = rng(cabColor.length * 13 + 5);
    for (const [row, n] of [[0, 3], [1, 2], [2, 1]]) for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.74, y = 1.55 + row * 0.64, z = 1.15 + (rr() - 0.5) * 0.3;
      mesh(lg, M.bark, { pos: [x, y, z], parent: body });
      mesh(eg, M.logEnd, { pos: [x, y, z + 3.41], parent: body, cast: false }); mesh(eg, M.logEnd, { pos: [x, y, z - 3.41], rot: [0, Math.PI, 0], parent: body, cast: false }); } }
  const { brake } = lights(body, 2.4, 1.15, L / 2, -L / 2);
  const wheels = [-L / 2 + 1.3, 1.6, 3.2].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.5, root, s * 1.12, z)));
  return { root, body, wheels, r, L, brake, dip: 0.045, glow: glowAt(root, L / 2 + 0.8) };
}
function car(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.42, L = 4.3;
  mesh(new THREE.PlaneGeometry(2.8, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  const sl = sill(-2.15, 2.15, 0.32, [[-1.35, 0.42], [1.35, 0.42]], 0.55).reverse();
  mesh(profile([...sl, [-2.22, 0.55], [-2.22, 1.05], [-1.95, 1.42], [-1.1, 1.82], [0.5, 1.8], [1.3, 1.16], [2.2, 1.0], [2.25, 0.55]].reverse(), 1.9, 0.18), paint(color), { parent: body });
  mesh(profile([[1.18, 1.17], [0.48, 1.68], [-1.05, 1.72], [-1.8, 1.38], [-1.85, 1.16]], 1.96, 0.04), M.glass, { parent: body, cast: false });
  const { brake, head } = lights(body, 1.9, 0.92, 2.22 + 0.04, -2.25 - 0.04);
  const wheels = [-1.35, 1.35].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.32, root, s * 0.9, z)));
  return { root, body, wheels, r, L, brake, head, dip: 0.07, glow: glowAt(root, L / 2 + 0.7) };
}
function van(color) {
  const root = new THREE.Group(), body = new THREE.Group(); scene.add(root); root.add(body); const r = 0.46, L = 5.2;
  mesh(new THREE.PlaneGeometry(3, L + 1.2).rotateX(-Math.PI / 2), blobMat, { pos: [0, 0.03, 0], parent: root, cast: false, recv: false });
  const sl = sill(-2.45, 2.75, 0.36, [[-1.55, 0.46], [1.85, 0.46]], 0.6).reverse();
  mesh(profile([...sl, [-2.5, 0.5], [-2.5, 2.35], [1.7, 2.4], [2.45, 1.55], [2.8, 1.25], [2.8, 0.5]].reverse(), 2.0, 0.2), paint(color), { parent: body });
  mesh(profile([[2.38, 1.55], [1.66, 2.22], [1.05, 2.22], [1.05, 1.55]], 2.06, 0.04), M.glass, { parent: body, cast: false });
  mesh(rbox(1.6, 0.18, 0.06, 0.04), paint('#e2512d'), { pos: [0, 1.25, 2.45 + 0.13], parent: body, cast: false });
  const { brake } = lights(body, 2.0, 1.05, 2.45 + 0.12, -2.75 - 0.12);
  const wheels = [-1.85, 1.55].flatMap((z) => [-1, 1].map((s) => wheel(r, 0.34, root, s * 0.95, z)));
  return { root, body, wheels, r, L, brake, dip: 0.06, glow: glowAt(root, L / 2 + 0.8) };
}
/** the police car: the hatchback in white, a blue band, POLIISI on both flanks (as written on the cars), a light bar */
function police() {
  const v = car('#f4f4f1');
  for (const s of [-1, 1]) mesh(rbox(0.06, 0.26, 3.9, 0.03), paint('#1d4fb3'), { pos: [s * 1.13, 0.78, 0], parent: v.body, cast: false });
  const word = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#1d4fb3'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '88px Anton-400'; g.fillText(UI.police || 'POLIISI', w / 2, h / 2 + 4); });
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshStandardMaterial({ map: word, transparent: true, roughness: 0.5, depthWrite: false }), { pos: [s * 1.14, 1.12, 0.15], rot: [0, s * Math.PI / 2, 0], parent: v.body, cast: false });
  mesh(rbox(1.3, 0.14, 0.4, 0.05), M.chassis, { pos: [0, 1.88, 0.2], parent: v.body });
  v.bar = [-1, 1].map((s) => { const m = new THREE.MeshStandardMaterial({ color: '#0c1f5a', emissive: '#2a62ff', emissiveIntensity: 0.2 });
    mesh(rbox(0.56, 0.22, 0.36, 0.06), m, { pos: [s * 0.33, 2.02, 0.2], parent: v.body, cast: false }); return m; });
  v.blue = new THREE.PointLight('#3b6cff', 0, 22, 1.6); v.blue.position.set(0, 2.6, 0); v.root.add(v.blue);
  return v;
}

// out-bound in shot 1: two loaded log trucks leave the clearing down the haul track (they face +z, the outbound lane −x)
const LANE = 1.85;
const OUTBOUND = [timberTruck('#d63b2c', true), timberTruck('#3c8f6a', true)];
OUTBOUND.forEach((v, i) => { v.root.rotation.y = Math.PI; v.z0 = BARRIER_Z - 34 - i * 16; });
const OUT_V = 6.5;
// in-bound in shot 2: the convoy comes back, empty, and brakes at the crossing (the look demo's beat, compressed)
const V0 = 8.5, DEC = 5.6;
const CONVOY = [timberTruck('#d63b2c', false), car('#2f6fd6'), timberTruck('#f2b42b', false), van('#f1eee6')];
{ let z = BARRIER_Z + 2.4; const stops = [1.95, 2.55, 3.15, 3.65];
  CONVOY.forEach((v, i) => { z += v.L / 2; v.zStop = z; z += v.L / 2 + 1.5; v.ts = stops[i]; v.tb = v.ts - V0 / DEC; v.dB = V0 * V0 / (2 * DEC); }); }
const COP = police(); COP.zStop = BARRIER_Z + 2.4 + COP.L / 2 + 0.6; COP.ts = 2.1; COP.tb = COP.ts - 7 / 4.6; COP.v0 = 7; COP.dec = 4.6; COP.dB = 7 * 7 / (2 * 4.6);
/** z along the road at shot-local time u: constant speed in, a constant-deceleration stop at zStop at ts */
function zAt(v, u, v0 = V0, dec = DEC) {
  if (u >= v.ts) return v.zStop;
  if (u >= v.tb) { const k = v.ts - u; return v.zStop + 0.5 * dec * k * k; }
  return v.zStop + v.v0dB + v0 * (v.tb - u);
}
CONVOY.forEach((v) => { v.v0dB = v.dB; }); COP.v0dB = COP.dB;
/** a vehicle's pose: position, rolling wheels, the nose-dip on braking and the rock back on the stop, the brake lights */
function drive(v, z, z0, u, d) {
  v.root.position.z = z;
  const roll = Math.abs(z0 - z) / v.r; v.wheels.forEach((w) => { w.rotation.x = -roll; });
  let pitch = 0;
  if (u >= v.tb && u < v.ts) pitch = -v.dip * smooth((u - v.tb) / 0.22);
  else if (u >= v.ts) { const k = u - v.ts; pitch = -v.dip * Math.exp(-5.5 * k) * Math.cos(13 * k); }
  v.body.rotation.x = pitch; v.body.position.y = pitch * 0.6;
  const braking = u >= v.tb ? clamp((u - v.tb) / 0.08) : 0;
  v.brake.emissiveIntensity = lerp(0.3 + 0.6 * d, lerp(6.5, 5.2, clamp((u - v.ts) / 0.6)), braking);
  v.glow.intensity = braking * lerp(8, 26, d);
}

// ------------------------------------------------------------------ light: afternoon through gold to dusk across the film
const hemi = new THREE.HemisphereLight('#c3d6f6', '#8270a8', 1.05); scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffdcae', 2.3); sun.position.set(-40, 26, -28); sun.target.position.set(0, 0, -6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 220 }); scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#a493e0', 0.4); fill.position.set(30, 20, 40); scene.add(fill);
/** the shadow frustum follows the shot: a wide one for the two big views, a tight one (sharper) for the close ones */
function shadowsFor(wide) {
  const c = sun.shadow.camera, e = wide ? 120 : 40, cz = wide ? -60 : BARRIER_Z;
  if (c.right === e && sun.target.position.z === cz) return;
  Object.assign(c, { left: -e, right: e, top: e, bottom: -e }); c.updateProjectionMatrix();
  sun.target.position.set(wide ? -10 : -4, 0, cz); sun.position.set(sun.target.position.x - 40, 26, cz - 22);
}

const DUSK = (t) => t < T.s3 ? 0 : t < T.s5 ? lerp(0, 0.38, (t - T.s3) / (T.s5 - T.s3)) : lerp(0.38, 1, smooth((t - T.s5 - 0.8) / (T.end - T.s5 - 1.4)));
const fogA = C3('#aec4e8'), fogB = C3('#c39cc4');
const EV = {
  fall: T.s1 + 0.9, land: T.s1 + 1.9,
  ...Object.fromEntries(CONVOY.flatMap((v, i) => [['brake' + i, +(T.s2 + v.tb).toFixed(3)], ['stop' + i, +(T.s2 + v.ts).toFixed(3)]])),
  gate: T.s2 + 0.2, copBrake: T.s3 + COP.tb, copStop: T.s3 + COP.ts, flip: T.s5 + 0.55,
};
// for the score (v2, 4 Nov): the page tears off at the end of its lift, lands after its fall; the camera starts to rise
EV.tear = +(EV.flip + 0.28).toFixed(3); EV.pageLand = +(EV.tear + Math.sqrt(2 * (HINGE - 0.06) / 7)).toFixed(3); EV.rise = T.s5 + 1.5;
function setWorld(t) {
  const d = DUSK(t);
  sun.intensity = lerp(2.3, 0.75, d); sun.color.copy(C3('#ffdcae')).lerp(C3('#ff8a6a'), d);
  hemi.intensity = lerp(1.05, 0.6, d); hemi.color.copy(C3('#c3d6f6')).lerp(C3('#9a8ccc'), d);
  SKY.material.color.copy(C3('#ffffff')).lerp(C3('#f0a8c0'), d * 0.8); CLOUDS.forEach((c) => c.material.color.copy(C3('#ffffff')).lerp(C3('#f4b0b8'), d));
  scene.environmentIntensity = lerp(0.55, 0.3, d);
  scene.fog.color.copy(fogA).lerp(fogB, d);
  // 1 · the last tree: a slow start, then gravity; a little rebound and a dust puff where the crown lands
  const kf = clamp((t - EV.fall) / (EV.land - EV.fall)), bounce = t > EV.land ? Math.exp(-6 * (t - EV.land)) * Math.sin((t - EV.land) * 18) * 0.05 : 0;
  TREE.rotation.z = (Math.PI / 2 - 0.06) * kf * kf * kf + bounce;
  PUFFS.forEach((s, i) => { const k = (t - EV.land - i * 0.03) / 1.6, u = s.userData;
    s.material.opacity = k > 0 && k < 1 ? 0.75 * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (1 - k) : 0;
    s.position.set(u.x + u.dx * k * 3, 0.6 + k * 1.8, u.z + u.dz * k * 3); s.scale.setScalar(1.6 + k * 3.5); });
  // 1 · the outbound log trucks, only in shot 1
  OUTBOUND.forEach((v) => { v.root.visible = t < T.s2; const u = t - T.s1, z = v.z0 + OUT_V * u;
    v.root.position.set(-LANE, 0, z); v.wheels.forEach((w) => { w.rotation.x = -(OUT_V * u) / v.r; });
    v.body.rotation.x = Math.sin(u * 7 + v.z0) * 0.004; v.brake.emissiveIntensity = 0.3; v.glow.intensity = 0; });
  // 2 · the crossing: lamps alternate once the warning starts; the booms come down; the STOP sign stands from shot 2
  const ug = t - T.s2, on = t >= EV.gate, ph = Math.floor((t - EV.gate) * 3.2) % 2;
  BOOMS.forEach((b) => { b.lamps.forEach((m, k) => { m.emissiveIntensity = on ? (k === ph ? 7 : 0.15) : 0.1; });
    b.pivot.rotation.z = -b.s * (Math.PI / 2) * (1 - ease.io((ug - 0.4) / 1.0)); });
  bellL.intensity = on ? 22 * (0.6 + 0.4 * d) : 0; bellL.position.x = ph ? 3 : -3;
  SIGN.visible = t >= T.s2; SIGN_FACE.material.opacity = 1;
  // 2 · the convoy (hidden in shot 1, parked once it has stopped)
  for (const v of CONVOY) { v.root.visible = t >= T.s2; v.root.position.x = LANE; const u = Math.max(0, t - T.s2); drive(v, zAt(v, u), zAt(v, 0), u, d); }
  // 3 · the police car rolls up the outbound lane and stops at the booms; the bar alternates blue
  { const u = Math.max(0, t - T.s3); COP.root.visible = t >= T.s3; COP.root.position.x = -LANE; drive(COP, zAt(COP, u, COP.v0, COP.dec), zAt(COP, 0, COP.v0, COP.dec), u, d);
    const b = Math.floor(t * 5.5) % 2, strobe = 0.55 + 0.45 * Math.abs(Math.sin(t * 17));
    COP.bar.forEach((m, k) => { m.emissiveIntensity = k === b ? 9 * strobe : 0.3; });
    COP.blue.intensity = t >= T.s3 ? lerp(30, 70, d) * strobe : 0; COP.blue.position.x = b ? 0.5 : -0.5; COP.head.emissiveIntensity = 1.2; }
  // 4 · the ditch water: murky brown turning rust over shot 4 (and staying rust), with a slow flow
  const kw = smooth((t - T.s4 - 0.3) / 2.6); WATER.material.color.copy(WATER_A).lerp(WATER_B, kw); waterTex.offset.x = -t * 0.06;
  // 5 · the calendar page: 4 → 5, flipped up and over its top edge
  // 5 · the calendar: the 4 NOV page lifts, tears off and flutters down onto the stumps; 5 NOV is under it
  CAL.visible = t >= T.s5 - 0.001;
  { const k = t - EV.flip, G = 7, lift = 0.28, fallT = Math.sqrt(2 * (HINGE - 0.06) / G);
    if (k <= 0) { FLIP.position.set(0, HINGE, 0.03); FLIP.rotation.set(0, 0, 0); }
    else if (k < lift) { FLIP.position.set(0, HINGE, 0.03); FLIP.rotation.set(-0.55 * ease.out(k / lift), 0, 0); }
    else { const u = Math.min(k - lift, fallT), f = u / fallT;
      FLIP.position.set(Math.sin(u * 5) * 0.4 + u * 3.2, HINGE + 0.6 * u - 0.5 * G * u * u, 0.03 + u * 2.6);
      FLIP.rotation.set(lerp(-0.55, -Math.PI / 2, smooth(f)), Math.sin(u * 4) * 0.4 * (1 - f), Math.sin(u * 6) * 0.35 * (1 - f)); } }
}

// ------------------------------------------------------------------ the five shots: camera, and where the miniature's focus band sits
const SHOT = [
  { // 1 · high and wide over the clearing: the felled tree, the log piles, the trucks leaving
    t0: () => T.s1, wide: true, focus: () => V([-14, 0, BARRIER_Z - 30]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([6, 40, 40], [2, 33, 30], k)), at: V(lerp3([-14, 0, -64], [-16, 0, -66], k)), fov: 40 }; } },
  { // 2 · the look demo's view: 3/4 from behind-right, the convoy stopping at the crossing
    t0: () => T.s2, wide: false, focus: (t) => V([LANE, 1, Math.max(zAt(CONVOY[0], t - T.s2), BARRIER_Z + 10)]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([11, 17.5, 56], [9, 15, 47], k)), at: V(lerp3([1.6, 6.2, -24], [1.6, 6.2, -26], k)), fov: 32 }; } },
  { // 3 · from the site side, low, behind the booms: the police car rolls up to them
    t0: () => T.s3, wide: false, focus: () => V([-LANE, 1.2, BARRIER_Z + 5]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-15, 3.4, BARRIER_Z + 15], [-13.5, 3.0, BARRIER_Z + 13], k)), at: V(lerp3([0, 2.2, BARRIER_Z + 3], [-0.5, 2.0, BARRIER_Z + 3.5], k)), fov: 34 }; } },
  { // 4 · the ditch as a cut in the cleared site (v2, 4 Nov: pulled back from the wall, which read as abstract stripes):
    //     from above its east end, looking down its length — stumps on the ground, the layers in the far wall, the water
    t0: () => T.s4, wide: false, focus: () => V([-24, -2, DITCH.z - 1.5]),
    cam(lt, d) { const k = ease.io(lt / d); return { pos: V(lerp3([-4, 7.6, DITCH.z + 10.5], [-6.5, 6.4, DITCH.z + 9.0], k)), at: V(lerp3([-27, -3.0, DITCH.z - 1.6], [-27, -3.1, DITCH.z - 1.8], k)), fov: 40 }; } },
  { // 5 · the calendar turns, then up and back over the whole clearing at dusk
    t0: () => T.s5, wide: true, focus: (t) => V(lerp3([-(BX + 4.2), 3.5, BARRIER_Z + 1.6], [-8, 0, BARRIER_Z - 30], smooth((t - T.s5 - 1.2) / 2.5))),
    cam(lt, d) { const k = ease.io((lt - 1.5) / (d - 1.7)); return { pos: V(lerp3([-2.2, 4.8, BARRIER_Z + 21], [10, 46, 52], k)), at: V(lerp3([-(BX + 4.2), 4.9, BARRIER_Z + 1.6], [-10, 0, BARRIER_Z - 46], k)), fov: lerp(34, 40, k) }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOT.length ? SHOT[i + 1].t0() : T.end;

/** a tag, bottom left: dark ink on bone, clear of the right-hand rail (as The Panel) */
function tag(g, text, a) {
  if (a <= 0 || !text) return;
  const face = LANG === 'ja' ? 'NotoSansJP-800' : 'Inter';
  g.save(); g.globalAlpha = a; g.font = `800 30px ${face}`;
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px ${face}`; w = g.measureText(text).width; }
  const x = 110, y = 1520; g.fillStyle = 'rgba(236,230,214,.94)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.fillStyle = '#1e1c1a'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}

const tmp = new THREE.Vector3();
function frame(t, captions = true) {
  setWorld(t);
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = SHOT_END(i) - t0;
  shadowsFor(S.wide);
  const L = S.cam(t - t0, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  tmp.copy(S.focus(t)).project(camera); const cy = clamp((tmp.y + 1) / 2, 0.15, 0.85);
  const dk = DUSK(t);
  post.render(scene, camera, { focus: 60, aperture: 0, maxBlur: 26, tilt: 10, tiltCenter: cy, tiltBand: i === 4 ? lerp(0.75, 0.5, smooth((t - T.s5 - 1.5) / 1.5)) : S.wide ? 0.5 : 0.6,
    threshold: 0.95, knee: 0.45, bloomA: 0.4, bloomB: 0.35, exposure: lerp(1.04, 1.0, dk), vignette: 0.3, grain: 0.022, seed: Math.floor(t * 24),
    sat: 1.16, contrast: 1.06, toe: 0.0, lift: [0.012, 0.008, 0.034], gain: [1.03, 1.0, 0.97] });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.2, T.s2 - 0.1));
  tag(g2d, UI.tag2, tg(T.s2 + 2.2, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(T.s3 + 1.2, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(T.s4 + 1.4, T.s5 - 0.1));
  tag(g2d, UI.tag5w, tg(T.s5 + 1.0, T.s5 + 2.75));   // v2: the date line, neutral (true whether or not the plan was filed)
  tag(g2d, UI.tag5, tg(T.s5 + 2.9, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(0, false); frame(T.s3 + 1, false);   // warm-up (shaders, both shadow frusta) before the busy measure
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
