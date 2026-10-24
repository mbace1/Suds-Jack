// ONE MORE LOOP — the Toko set, film 1 of 4 (v1, 23 Oct; plan/films/27-toko-ai-dev-set.md). Owner: "Clay polished and
// planned well", and the world is his: "Toko could be prototyping on a phone in an evening park, as some covert drones fly
// over him." Toko Midori himself (the traced master on a magenta clay disc) on a park bench, building a game on his phone
// with an AI. The prototype takes an hour; the AI always offers one more change; the night goes by as SKY.
//   1 dusk, the park wide and low: the lamp post comes on, two drones cross high; on "hour" the prototype runs
//   2 night, over his shoulder onto the phone: One more change? Yes. 23:40, 01:55, 03:10; the thermos tips over
//   3 close on the mask, lit by the phone; red drone lights blink across the dark behind him; he slumps
//   4 dawn, frame 0's composition: asleep on the bench, the phone in his lap still asking. One drone crosses.
//   card · Toko's card over the dawn park: the badge, THE MACHINE NEVER SAYS ENOUGH. / YOU DO., his name. Held ≥ 4 s.
// Toko's rules: no slate, no station bug, his card at the end. The drones are atmosphere: they do nothing and are no one's.
// 1080×1920, 30 fps, the puppet on twos; camera, light and drones every frame. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../welcome/lib/post.js';
import { surface, setBoil } from '../welcome/lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh as mesh0, rng } from '../welcome/lib/sculpt.js';
import { canvas, tex, skyPlane } from '../welcome/lib/city.js';
import { drawMasterBadge } from '../welcome/lib/master.js';
import { Toko } from '../welcome/lib/toko.js';
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
const camera = new THREE.PerspectiveCamera(40, W / H, 0.6, 4000);   // v3: near 2 → 0.6, so a shoulder close to the lens is not cut open
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const V = (a) => new THREE.Vector3(...a);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), in: (k) => Math.pow(clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const MAG = '#f0027f';

// ------------------------------------------------------------------ clays (the house plasticine: Welcome Home v4 / Deer v6's recipe)
const C = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffd8b8', rough: 0.68, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 2.2, ridge: 0.12, tool: 0.7, grain: 0.004, grainF: 8, mottle: 0.08, specks: 0.35, roughVar: 0.1, ...o });
const GLAZE = (color, o = {}) => C(color, { rough: 0.22, thumb: 0.012, thumbCell: 1.4, specks: 0.08, clearcoat: 1, clearcoatRough: 0.12, mottle: 0.08, ...o });
const HDR = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const M = {
  grass: C('#4b5a34', { thumbCell: 3.2, thumb: 0.04, mottle: 0.18, specks: 0.5, speckColor: '#2d3520', noBoil: true }),
  grassL: C('#5f6c3c', { thumbCell: 2.6, mottle: 0.2, noBoil: true }),
  gravel: C('#b7ab96', { thumbCell: 0.6, thumb: 0.06, mottle: 0.25, specks: 0.9, speckColor: '#6e6455', noBoil: true }),
  kerb: C('#8f8a80', { thumbCell: 2, tool: 0.8 }),
  slat: C('#7a5636', { tool: 1.1, thumbCell: 2.0, mottle: 0.12 }), slatB: C('#6b4a2e', { tool: 1.1, thumbCell: 2.0, mottle: 0.12 }),
  iron: C('#23262a', { rough: 0.45, thumb: 0.015, specks: 0.1, clearcoat: 0.3, clearcoatRough: 0.4 }),
  post: C('#1e2a26', { rough: 0.5, thumb: 0.015, specks: 0.1, clearcoat: 0.25 }),
  birch: C('#e9e4d8', { thumbCell: 1.2, thumb: 0.035, specks: 0.9, speckColor: '#2c2622', mottle: 0.1 }),
  bark: C('#4a3a2c', { tool: 1.2, thumbCell: 1.4 }),
  leafY: C('#d9a93a', { thumbCell: 1.1, thumb: 0.05, mottle: 0.25, specks: 0.3, speckColor: '#8a5a1a' }),
  leafO: C('#c9772e', { thumbCell: 1.1, thumb: 0.05, mottle: 0.2 }),
  spruce: C('#24382c', { thumbCell: 1.0, thumb: 0.05, tool: 1.2, mottle: 0.12 }), spruceL: C('#2f4636', { thumbCell: 1.0, tool: 1.2 }),
  bin: C('#2f4a3a', { rough: 0.5, tool: 0.6 }), binLid: C('#22352a', { rough: 0.5 }),
  thermos: GLAZE('#c94a2a'), thermosCap: C('#2a2a2c', { rough: 0.4 }),
  phone: C(MAG, { rough: 0.42, thumb: 0.014, thumbCell: 1.2, specks: 0.15, clearcoat: 0.5, clearcoatRough: 0.25 }),
  // v3: the bezel is plain, not clay: the clay shader displaces vertices with a noise that boils every other frame, and
  // it pushed the bezel's face through the screen in a clean diagonal (the grey slab the owner saw as the game glitching)
  phoneEdge: new THREE.MeshStandardMaterial({ color: '#1a1a1d', roughness: 0.3 }),
  droneBody: C('#2c2f34', { rough: 0.55, thumb: 0.02, thumbCell: 1.2, specks: 0.15, mottle: 0.06 }),
  droneArm: C('#1f2125', { rough: 0.5, thumb: 0.015 }),
  rotor: new THREE.MeshStandardMaterial({ color: '#3a3d42', roughness: 0.6, transparent: true, opacity: 0.35, depthWrite: false }),
  bird: C('#3a3532', { thumbCell: 0.8, thumb: 0.04 }), birdB: C('#c8b9a2', { thumbCell: 0.8 }), beak: C('#e0a030', { thumb: 0.01 }),
};
// Toko's own clothes: a deep teal hoodie, dark jeans, pale trainers; the canon magenta disc and magenta hands
const TM = {
  hoodie: C('#26404a', { thumbCell: 1.6, thumb: 0.035, tool: 1.0, mottle: 0.06 }), jeans: C('#2f3646', { thumbCell: 1.8, tool: 0.7 }),
  shoes: C('#e8e1d2', { rough: 0.45 }), sole: C('#cfc6b4', { thumb: 0.02 }), glove: C(MAG, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }),
  hair: C('#2a211c', { tool: 1.3, thumbCell: 0.9, thumb: 0.045 }),
  maskDisc: C(MAG, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
  strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
};
TM.hoodie2 = TM.hoodie; TM.arms = TM.hoodie; TM.cuff = C('#21363f', { thumbCell: 1.2 });

// ------------------------------------------------------------------ the park (cm, puppet scale: Toko stands 46; ground y = 0; the bench faces +z)
const SEAT = 11, BX = 0, BZ = 0;
mesh(lumpy(new THREE.PlaneGeometry(2400, 2400, 120, 120).rotateX(-Math.PI / 2), 0.6, 0.02, 3), M.grass, { pos: [0, -0.2, -400], cast: false });
{ const r = rng(11); for (let i = 0; i < 60; i++) mesh(lumpy(ball(14 + r() * 22, 1, 0.12, 1, 14), 0.3, 0.1, 20 + i), M.grassL, { pos: [-300 + r() * 600, -0.6, -40 - r() * 380], cast: false }); }
// the gravel path in front of the bench, its kerbs
mesh(lumpy(new RoundedBoxGeometry(600, 1.2, 34, 2, 0.5), 0.15, 0.4, 31), M.gravel, { pos: [0, 0.2, 22], cast: false });
for (const z of [4.6, 39.4]) mesh(lumpy(new RoundedBoxGeometry(600, 1.6, 1.8, 2, 0.6), 0.05, 0.4, 32 + z), M.kerb, { pos: [0, 0.7, z], cast: false });
{ const r = rng(13), g = lumpy(ball(0.45, 1, 0.7, 1, 8), 0.1, 1, 33), n = 900; const inst = new THREE.InstancedMesh(g, M.gravel, n); inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) { e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); const s = 0.6 + r() * 1.2; m4.compose(V([-120 + r() * 240, 0.9, 6 + r() * 32]), q, V([s, s, s])); inst.setMatrixAt(i, m4); }
  scene.add(inst); }
// fallen leaves: birch yellow and a few rowan-orange, on the grass and the path
{ const r = rng(17), g = lumpy(ball(1.1, 1, 0.12, 0.7, 10), 0.08, 1, 34), n = 520; const inst = new THREE.InstancedMesh(g, M.leafY, n); inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
  for (let i = 0; i < n; i++) { const x = -160 + r() * 320, z = -120 + r() * 170; e.set((r() - 0.5) * 0.4, r() * TAU, (r() - 0.5) * 0.4); q.setFromEuler(e);
    m4.compose(V([x, z > 4 && z < 40 ? 1.1 : 0.3, z]), q, V([1, 1, 1]).multiplyScalar(0.8 + r() * 0.8)); inst.setMatrixAt(i, m4);
    col.setHSL(0.09 + r() * 0.05, 0.6 + r() * 0.2, 0.42 + r() * 0.16); inst.setColorAt(i, col); }
  scene.add(inst); }

// the bench: three seat slats and two back slats on cast-iron ends, the paint worn on the front edge
const BENCH = new THREE.Group(); scene.add(BENCH); BENCH.position.set(BX, 0, BZ);
const bm = (g, m, o = {}) => mesh0(g, m, { parent: BENCH, ...o });
for (let i = 0; i < 3; i++) bm(lumpy(new RoundedBoxGeometry(72, 1.2, 3.2, 2, 0.5), 0.05, 0.35, 40 + i), i % 2 ? M.slat : M.slatB, { pos: [0, SEAT - 0.4, -2.6 + i * 3.6] });
for (let i = 0; i < 2; i++) bm(lumpy(new RoundedBoxGeometry(72, 3.2, 1.2, 2, 0.5), 0.05, 0.35, 44 + i), i ? M.slat : M.slatB, { pos: [0, SEAT + 7 + i * 4.6, -5.6 - i * 0.9], rot: [-0.2, 0, 0] });
for (const x of [-31, 31]) {
  bm(lumpy(sausage([[x, 0.4, 5.6], [x, SEAT - 1, 3.8], [x, SEAT - 1.2, -4], [x, 0.4, -6.2]], [0.7, 0.75, 0.75, 0.7], { steps: 40 }), 0.03, 1, 50 + x), M.iron);
  bm(lumpy(sausage([[x, SEAT - 1, -4.2], [x, SEAT + 6, -5.6], [x, SEAT + 15, -7.4]], [0.7, 0.65, 0.6], { steps: 30 }), 0.03, 1, 52 + x), M.iron);
  bm(lumpy(sausage([[x, SEAT - 0.6, 4], [x, SEAT + 5.2, 3.2], [x, SEAT + 5.6, -2.6], [x, SEAT + 6.8, -5.4]], [0.6, 0.6, 0.6, 0.55], { steps: 30 }), 0.03, 1, 54 + x), M.iron);
}
// a park bin, the lamp post
mesh(lumpy(lathe([[0, 0], [5.2, 0], [5.6, 14], [5.9, 15], [0, 15]], 28), 0.05, 0.6, 60), M.bin, { pos: [44, 0, -3] });
mesh(lumpy(lathe([[0, 0], [6.2, 0], [6.0, 1.4], [0, 2.0]], 28), 0.03, 1, 61), M.binLid, { pos: [44, 15, -3] });
const LAMP = { x: -22, z: -16, h: 112 };
mesh(lumpy(lathe([[0, 0], [4.2, 0], [4.0, 2], [2.4, 4], [1.6, 8], [1.3, LAMP.h - 8], [2.2, LAMP.h - 6], [0, LAMP.h - 6]], 24), 0.02, 1, 62), M.post, { pos: [LAMP.x, 0, LAMP.z] });
mesh(lumpy(lathe([[0, 0], [4.6, 0.6], [5.6, 2.2], [0, 2.4]], 24), 0.02, 1, 63), M.post, { pos: [LAMP.x, LAMP.h - 6, LAMP.z] });
const LANTERN = mesh(lathe([[0, 0], [3.0, 0.5], [4.2, 6], [3.6, 10], [0, 10.5]], 24), HDR(0.3, 0.28, 0.24), { pos: [LAMP.x, LAMP.h - 4, LAMP.z], cast: false });
mesh(lumpy(lathe([[0, 0], [5.2, 0], [6.4, 1.0], [3.4, 4.4], [0.8, 6.4], [0, 7.4]], 24), 0.02, 1, 64), M.post, { pos: [LAMP.x, LAMP.h + 6, LAMP.z] });
const lampLight = new THREE.PointLight('#ffc27a', 0, 260, 1.6); lampLight.position.set(LAMP.x, LAMP.h + 1, LAMP.z); lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.002; lampLight.shadow.radius = 4; scene.add(lampLight);
// the dawn bird, on the lantern's cap
const BIRD = new THREE.Group(); scene.add(BIRD); BIRD.position.set(LAMP.x + 0.6, LAMP.h + 13.4, LAMP.z); BIRD.rotation.y = 0.9;
mesh0(lumpy(ball(1.6, 1.25, 1, 1, 18), 0.06, 1, 70), M.bird, { parent: BIRD });
mesh0(lumpy(ball(0.95, 1, 1, 1, 16), 0.04, 1, 71), M.bird, { pos: [1.5, 1.1, 0], parent: BIRD });
mesh0(lumpy(ball(1.0, 1.1, 0.8, 0.9, 14), 0.05, 1, 72), M.birdB, { pos: [0.5, -0.4, 0], parent: BIRD });
mesh0(new THREE.ConeGeometry(0.28, 0.9, 8).rotateZ(-Math.PI / 2), M.beak, { pos: [2.6, 1.1, 0], parent: BIRD });
mesh0(lumpy(sausage([[-1.6, 0.2, 0], [-3.6, 0.9, 0]], [0.7, 0.25], { flat: 0.3 }), 0.03, 1, 73), M.bird, { parent: BIRD });

// trees: birches in their yellow and dark spruces, set back behind the bench and out to the sides
const TREES = new THREE.Group(); scene.add(TREES);
function birch(x, z, h, seed) {
  const r = rng(seed), lean = (r() - 0.5) * 0.12, top = [x + lean * h, h, z];
  mesh0(lumpy(sausage([[x, -1, z], [x + lean * h * 0.5, h * 0.5, z], top], [2.6 + h * 0.012, 2.0, 1.1], { steps: 40 }), 0.08, 0.5, seed), M.birch, { parent: TREES });
  for (let i = 0; i < 6; i++) { const a = r() * TAU, y = h * (0.45 + r() * 0.45), L = 10 + r() * 16;   // branches
    mesh0(lumpy(sausage([[x + lean * y, y, z], [x + lean * y + Math.cos(a) * L, y + L * 0.7, z + Math.sin(a) * L]], [0.8, 0.3], { steps: 12 }), 0.05, 1, seed + i), M.bark, { parent: TREES }); }
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = 6 + r() * 16, y = h * (0.62 + r() * 0.45);   // the crown: yellow lumps
    mesh0(lumpy(ball(8 + r() * 9, 1, 0.8, 1, 18), 0.25, 0.25, seed + 20 + i), r() < 0.2 ? M.leafO : M.leafY, { pos: [x + lean * y + Math.cos(a) * d, y, z + Math.sin(a) * d], parent: TREES }); }
}
function spruce(x, z, h, seed) {
  const r = rng(seed);
  mesh0(lumpy(new THREE.CylinderGeometry(1.2, 2.6, h * 0.3, 10), 0.06, 0.6, seed), M.bark, { pos: [x, h * 0.15, z], parent: TREES });
  for (let i = 0; i < 6; i++) { const k = i / 6, rad = (1 - k) * h * 0.28 + 3, y = h * (0.18 + k * 0.72);
    mesh0(lumpy(new THREE.ConeGeometry(rad, h * 0.24, 14, 2), 0.12 * rad * 0.1, 0.3, seed + i), i % 2 ? M.spruce : M.spruceL, { pos: [x, y, z], rot: [0, r() * TAU, 0], parent: TREES }); }
}
{ const r = rng(29);
  const spots = [[-92, -70, 'b'], [-58, -118, 's'], [-16, -150, 'b'], [30, -96, 'b'], [70, -140, 's'], [110, -80, 'b'], [-130, -150, 's'], [150, -170, 'b'],
    [-190, -60, 'b'], [200, -60, 's'], [-40, -230, 's'], [60, -260, 'b'], [-110, -260, 'b'], [130, -250, 's'], [0, -300, 's'], [-230, -200, 'b'], [240, -220, 'b'],
    [-160, 40, 's'], [175, 30, 'b']];
  spots.forEach(([x, z, k], i) => (k === 'b' ? birch(x + (r() - 0.5) * 10, z, 120 + r() * 70, 100 + i * 37) : spruce(x, z, 130 + r() * 70, 400 + i * 41))); }
// the far treeline, a cut-card silhouette in front of the sky (its colour set by the hour)
const lineCan = canvas(2048, 256); { const g = lineCan.getContext('2d'), r = rng(41); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, 256);
  for (let x = 0; x <= 2048; x += 6) { const sp = r() < 0.35, h = sp ? 120 + r() * 110 : 70 + r() * 50 + Math.sin(x * 0.01) * 18; g.lineTo(x, 256 - h); if (sp) g.lineTo(x + 3, 256 - h - 40 - r() * 30); }
  g.lineTo(2048, 256); g.fill(); }
const lineMat = new THREE.MeshBasicMaterial({ alphaMap: tex(lineCan, false), transparent: true, color: '#1b2030', fog: false, depthWrite: false });
const LINE = mesh(new THREE.PlaneGeometry(3200, 400), lineMat, { pos: [0, 150, -700], cast: false });

// the sky: three hours, three cut gradients (dusk, night with stars, dawn)
const SKY = {
  // the plane spans y −600…2000, so the horizon (y 0) is at k 0.77 and the frame sees roughly k 0.54…0.86
  dusk: skyPlane(4200, 2600, [[0, '#0e1433'], [0.5, '#1e2858'], [0.6, '#3b3f7a'], [0.67, '#8a6a92'], [0.72, '#e08a5e'], [0.76, '#f6b86e'], [1, '#f6c27a']], { pos: [0, 700, -1000] }),
  night: skyPlane(4200, 2600, [[0, '#020309'], [0.55, '#060a1a'], [0.7, '#0f1734'], [0.77, '#1a2448'], [1, '#1a2448']], { pos: [0, 700, -1000] }),
  dawn: skyPlane(4200, 2600, [[0, '#5d7bb8'], [0.55, '#8f9fd0'], [0.66, '#d4b2cc'], [0.72, '#f4c0a6'], [0.77, '#fde0ba'], [1, '#fde0ba']], { pos: [0, 700, -1000] }),
};
for (const s of Object.values(SKY)) scene.add(s);
{ const r = rng(43), g = SKY.night.material.map.image.getContext('2d');                  // stars on the night card
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,248,230,${0.3 + r() * 0.7})`; g.fillRect(r() * 64, r() * 300, 1, 1); } SKY.night.material.map.needsUpdate = true; }

// ------------------------------------------------------------------ the drones: small, dark, four arms, a blinking red light; ambient, nobody's
function drone(seed) {
  const g = new THREE.Group(), r = rng(seed); scene.add(g);
  mesh0(lumpy(new RoundedBoxGeometry(5.6, 1.6, 7.2, 3, 0.7), 0.08, 0.6, seed), M.droneBody, { parent: g });
  mesh0(lumpy(ball(1.6, 1, 0.7, 1.2, 14), 0.04, 1, seed + 1), M.droneBody, { pos: [0, -1.1, 2.4], parent: g });   // the camera blister
  const rotors = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const tip = [sx * 6.4, 0.6, sz * 6.4];
    mesh0(lumpy(sausage([[sx * 1.6, 0, sz * 2], tip], [0.55, 0.4], { steps: 10 }), 0.02, 1, seed + 2 + sx + sz * 3), M.droneArm, { parent: g });
    mesh0(new THREE.CylinderGeometry(0.8, 0.9, 1.4, 12), M.droneArm, { pos: [tip[0], 1.0, tip[2]], parent: g });
    const d = mesh0(new THREE.CylinderGeometry(3.6, 3.6, 0.12, 24), M.rotor, { pos: [tip[0], 1.9, tip[2]], parent: g, cast: false }); rotors.push(d);
  }
  const led = mesh0(ball(0.55, 1, 1, 1, 10), HDR(6, 0.25, 0.2), { pos: [0, -0.8, -3.4], parent: g, cast: false });
  const led2 = mesh0(ball(0.4, 1, 1, 1, 10), HDR(3, 3, 3), { pos: [0, -0.8, 3.4], parent: g, cast: false });
  g.scale.setScalar(2.2); g.userData = { rotors, led, led2, ph: r() * 3 };
  return g;
}
const DRONES = [drone(501), drone(502), drone(503)];
/** where each drone is at time t in the shot's plan: [[x0,y0,z0],[x1,y1,z1], t0, t1] or null (gone) */
function placeDrones(t, paths) {
  DRONES.forEach((d, i) => {
    const p = paths[i]; if (!p) { d.visible = false; return; }
    const k = (t - p[2]) / (p[3] - p[2]); if (k < 0 || k > 1) { d.visible = false; return; }
    d.visible = true; const pos = lerp3(p[0], p[1], k); d.position.set(pos[0], pos[1] + Math.sin(t * 1.3 + i) * 1.5, pos[2]);
    const dir = [p[1][0] - p[0][0], p[1][2] - p[0][2]]; d.rotation.set(0.08, Math.atan2(dir[0], dir[1]), Math.sin(t * 0.9 + i) * 0.04);
    for (const r of d.userData.rotors) r.rotation.y = t * 40 + i;
    const blink = ((t + d.userData.ph) % 1.1) < 0.14; d.userData.led.visible = blink; d.userData.led2.visible = ((t + d.userData.ph + 0.55) % 1.1) < 0.08;
  });
}

// ------------------------------------------------------------------ Toko, on the bench
const TOKO = new Toko(TM), WRAP = new THREE.Group(); WRAP.add(TOKO.group); scene.add(WRAP);
TOKO.parts.armL.material = TOKO.parts.armR.material = TM.arms; TOKO.hood.visible = true; TOKO.pocket.visible = true;
TOKO.head.children[4].visible = false;   // no bun
WRAP.position.set(BX - 4, 0, BZ + 0.6);
const HIP = [0, SEAT + 1.2, 0], at = (v) => [HIP[0] + v[0], HIP[1] + v[1], HIP[2] + v[2]];
const SIT = { knee: [0, -0.8, 11], foot: [0, -(SEAT + 1.2) + 0.75, 12.6], shoePitch: 0 };
/** a seated pose: the phone held out in front (k: 0 low in the lap … 1 lifted to look), lean, head */
function sitPose(o = {}) {
  const lift = o.lift ?? 0.4, lean = o.lean ?? 0.34;
  const ph = lerp3([0, 6.4, 12.8], [0, 11.6, 17.4], lift);
  const hands = [add3(ph, [-2.9, -2.2, -0.9]), add3(ph, [2.9, -2.2, -0.9])];
  return { hip: HIP, yaw: 0, lean, side: o.side ?? 0, ...SIT, hp: o.hp ?? 0.42, hr: o.hr ?? 0, hy: o.hy ?? 0, breathe: o.breathe ?? 0,
    elR: at([-6.4, lerp(4.6, 6.2, lift), lerp(6.4, 9.6, lift)]), hdR: at(o.hdR ?? hands[0]), elL: at([6.4, lerp(4.6, 6.2, lift), lerp(6.4, 9.6, lift)]), hdL: at(o.hdL ?? hands[1]),
    palm: [[0.4, 1, 0.1], [-0.4, 1, 0.1]], _phone: ph };
}
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }

// the phone: a magenta case, a black edge, the screen a canvas the AI's chat is drawn on
const PHONE = new THREE.Group(); scene.add(PHONE);
mesh0(lumpy(new RoundedBoxGeometry(4.8, 9.2, 0.7, 3, 0.4), 0.02, 1, 80), M.phone, { parent: PHONE });
// v3: screen and bezel sit proud of the case (whose clay surface boils)
mesh0(new RoundedBoxGeometry(4.5, 8.9, 0.12, 2, 0.3), M.phoneEdge, { pos: [0, 0, 0.62], parent: PHONE, cast: false });
const UW = 400, UH = 800, uiCan = canvas(UW, UH), ui = uiCan.getContext('2d'), uiTex = tex(uiCan);
const SCREEN = mesh0(new THREE.PlaneGeometry(4.2, 8.4), new THREE.MeshBasicMaterial({ map: uiTex, color: new THREE.Color(1.15, 1.15, 1.15), toneMapped: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), { pos: [0, 0, 0.7], parent: PHONE, cast: false });
const phoneLight = new THREE.PointLight('#cfe0ff', 0, 60, 2); scene.add(phoneLight);
// the thermos on the bench beside him (it tips over on the third jump)
const THERMOS = new THREE.Group(); scene.add(THERMOS); THERMOS.position.set(BX + 14, SEAT + 0.2, BZ + 0.6);
mesh0(lumpy(lathe([[0, 0], [2.1, 0], [2.3, 0.6], [2.3, 10.6], [1.9, 11.4], [0, 11.4]], 28), 0.02, 1, 90), M.thermos, { parent: THERMOS });
mesh0(lumpy(lathe([[0, 0], [2.2, 0], [2.3, 2.6], [0, 2.8]], 28), 0.02, 1, 91), M.thermosCap, { pos: [0, 11.3, 0], parent: THERMOS });

// ------------------------------------------------------------------ the phone's screen: the prototype, the chat, the ask
const P_UI = {};   // filled from the plan below (translated strings)
function drawGame(g, x, y, w, h, t, v = 0) {
  // the prototype: a magenta drop dodging falling dots. v3 (owner, twice: "game visuals glitch"): v1 wrapped dots in
  // view and swung the drop through them; v2's lane schedule rebuilt itself whenever the round (v) changed, because v
  // seeded the lanes and the speed, so every cut between rounds rearranged the screen. Now the layout never depends on v
  // or on the shot: six dots in fixed lanes fall at one constant speed, each wrapping only when fully off screen (faded
  // at both edges); the drop slides between lanes on a fixed clock with easing; the score climbs one every 0.3 s.
  // v only adds decoration (a trail, a glow, a colour). A pure function of the film's time, the same in every shot.
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 18); g.clip();
  const bg = ['#141a2e', '#1a1430', '#10241f', '#231a10'][v % 4]; g.fillStyle = bg; g.fillRect(x, y, w, h);
  const NL = 6, lane = (L) => x + w * (L + 0.5) / NL, rad = 8, speed = 70, M = 30, span = h + 2 * M;
  const OFF = [0.05, 0.55, 0.25, 0.8, 0.4, 0.95];
  // the drop: every 1.4 s it eases to the next lane in a fixed sequence
  const SEQ = [2, 4, 1, 3, 5, 0, 3, 1, 4, 2], STEP = 1.4, si = Math.floor(t / STEP), k = ease.io(clamp((t - si * STEP) / 0.55));
  const L0 = SEQ[((si - 1) % SEQ.length + SEQ.length) % SEQ.length], L1 = SEQ[si % SEQ.length];
  const px = lerp(lane(L0), lane(L1), k), py = y + h - 46;
  if (v >= 2) for (let q = 1; q <= 4; q++) { g.globalAlpha = 0.18 / q; g.fillStyle = MAG; g.beginPath(); g.arc(px, py + 10 + q * 7, 14 - q * 2, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  const col = ['#ffffff', '#ffd84a', '#5ad7ff', '#ff8a3a'][v % 4];
  for (let L = 0; L < NL; L++) {
    const yy = ((t * speed + OFF[L] * span) % span) - M, dy = y + yy;
    const a = clamp((yy + M) / 40) * clamp((h + M - yy) / 40);
    g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(lane(L), dy, rad, 0, TAU); g.fill();
    if (v >= 3) { g.globalAlpha = a * 0.35; g.beginPath(); g.arc(lane(L), dy, rad * 1.8, 0, TAU); g.fill(); }
  }
  g.globalAlpha = 1;
  const sq = 1 + 0.1 * Math.sin(k * Math.PI);
  g.save(); g.translate(px, py); g.scale(1 / sq, sq); g.translate(-px, -py);
  g.fillStyle = MAG; g.beginPath(); g.moveTo(px, py - 26); g.bezierCurveTo(px + 18, py - 4, px + 18, py + 18, px, py + 18); g.bezierCurveTo(px - 18, py + 18, px - 18, py - 4, px, py - 26); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 6, py + 2, 3, 0, TAU); g.arc(px + 6, py + 2, 3, 0, TAU); g.fill(); g.restore();
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '700 22px Inter'; g.textAlign = 'right'; g.fillText(String(100 + Math.floor(t / 0.3)), x + w - 14, y + 32);
  g.restore();
}
function bubble(g, x, y, w, text, mine, fs = 26) {
  g.font = `600 ${fs}px Inter, IPAPGothic`; const words = text.split(/(?<=\s)/), lines = []; let cur = '';
  for (const wd of (LANG === 'ja' ? [...text] : words)) { if (g.measureText(cur + wd).width > w - 40 && cur) { lines.push(cur); cur = wd; } else cur += wd; } lines.push(cur);
  const bw = Math.min(w, Math.max(...lines.map((l) => g.measureText(l).width)) + 40), bh = lines.length * (fs + 8) + 24, bx = mine ? x + w - bw : x;
  g.fillStyle = mine ? MAG : '#e9e6ef'; g.beginPath(); g.roundRect(bx, y, bw, bh, 22); g.fill();
  g.fillStyle = mine ? '#fff' : '#1d1b22'; g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l.trim(), bx + 20, y + 12 + fs + i * (fs + 8)));
  return bh;
}
function askChip(g, x, y, w, k, sel = -1) {
  // One more change?  [Yes] [No] — the AI's offer, the bit the loop is made of
  const s = ease.back(k / 0.4); if (s <= 0) return 0;
  g.save(); g.translate(x + w / 2, y + 60); g.scale(s, s); g.translate(-(x + w / 2), -(y + 60));
  g.fillStyle = '#2b2838'; g.beginPath(); g.roundRect(x, y, w, 120, 24); g.fill();
  g.fillStyle = '#fff'; g.font = '700 27px Inter, IPAPGothic'; g.textAlign = 'center'; g.fillText(P_UI.more, x + w / 2, y + 42);
  const bw = (w - 60) / 2;
  [P_UI.yes, P_UI.no].forEach((lab, i) => { const bx = x + 20 + i * (bw + 20);
    g.fillStyle = i === 0 ? (sel === 0 ? '#ffffff' : MAG) : 'rgba(255,255,255,.14)'; g.beginPath(); g.roundRect(bx, y + 62, bw, 44, 22); g.fill();
    g.fillStyle = i === 0 ? (sel === 0 ? MAG : '#fff') : 'rgba(255,255,255,.7)'; g.font = '700 24px Inter, IPAPGothic'; g.fillText(lab, bx + bw / 2, y + 92); });
  g.restore(); return 120;
}
/** mode 'game' (the prototype running, full screen), 'chat' (n = how many rounds, k = the newest one's progress), 'ask' (dawn) */
function drawUI(mode, t, o = {}) {
  const g = ui, w = UW, h = UH; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0f0e14'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.font = '800 40px Inter'; g.textAlign = 'left'; g.fillText(o.time || P_UI.t0, 24, 46);
  g.textAlign = 'right'; g.fillText('●●● ▮', w - 24, 38);
  if (mode === 'game') {
    drawGame(g, 20, 64, w - 40, h - 150, t, 0);
    bubble(g, 20, h - 78, w - 40, P_UI.done, false, 24);
  } else if (mode === 'chat') {
    // newest at the bottom: his line, the AI's reply with the next prototype, and the offer
    // bottom up: the offer, the new prototype, his request; the round before, ghosted, above
    const n = o.n ?? 1, k = o.k ?? 1, LINES = [P_UI.c1, P_UI.c2, P_UI.c3];
    const yAsk = h - 176, yGame = yAsk - 14 - 290, yMe = yGame - 14 - 78, yPrev = yMe - 14 - 78;
    askChip(g, 20, yAsk, w - 40, (k - 0.35) * 1.4, o.sel ?? -1);
    // v3: the game never leaves the screen between rounds (it is one continuous run; only its colours change round to
    // round), so a cut to the next round does not blank it and bring it back
    drawGame(g, 20, yGame, w - 40, 290, t, n);
    bubble(g, 20, yMe, w - 40, LINES[n - 1], true);
    g.globalAlpha = 0.4; bubble(g, 20, yPrev, w - 40, n > 1 ? LINES[n - 2] : P_UI.ask, true); g.globalAlpha = 1;
    const fade = g.createLinearGradient(0, 50, 0, 200); fade.addColorStop(0, '#0f0e14'); fade.addColorStop(1, 'rgba(15,14,20,0)'); g.fillStyle = fade; g.fillRect(0, 50, w, 150);
    g.fillStyle = '#fff'; g.font = '800 40px Inter'; g.textAlign = 'left'; g.fillText(o.time, 24, 46);
  } else if (mode === 'ask') {
    g.globalAlpha = 0.5; drawGame(g, 20, 70, w - 40, 420, t, 3); g.globalAlpha = 1;
    const pulse = 0.85 + 0.15 * Math.sin(t * 4); g.globalAlpha = pulse; askChip(g, 20, 520, w - 40, 1); g.globalAlpha = 1;
  }
  g.restore(); uiTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the hours: sky, fog, light
scene.fog = new THREE.FogExp2('#3a3f60', 0.0012);
const hemi = new THREE.HemisphereLight('#9fb0d8', '#4a3a2a', 0.6); scene.add(hemi);
const key = new THREE.DirectionalLight('#ffb070', 2.4); key.castShadow = true; key.shadow.mapSize.set(4096, 4096);
Object.assign(key.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 20, far: 1400 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.04; key.shadow.radius = 2;
scene.add(key, key.target); key.target.position.set(0, 10, 0);
const rim = new THREE.DirectionalLight('#9ec0ff', 0.6); rim.position.set(-120, 90, -160); scene.add(rim);
const HOURS = {
  dusk: { sky: 'dusk', fog: ['#5a5470', 0.0016], hemi: ['#a9b2d6', '#4a3a2a', 0.62], key: ['#ffad6a', 2.6, [160, 70, -420]], rim: ['#b0c4ff', 0.5], line: '#2a2840', grade: { exposure: 1.15, lift: [0.012, 0.01, 0.02], gain: [1.04, 0.99, 0.96], sat: 1.06 } },
  night: { sky: 'night', fog: ['#141a30', 0.0018], hemi: ['#34477e', '#1a1410', 0.5], key: ['#8fa6e8', 0.95, [-200, 260, -260]], rim: ['#6f8fd8', 0.35], line: '#0a0d18', grade: { exposure: 1.3, lift: [0.006, 0.008, 0.018], gain: [0.98, 1.0, 1.06], sat: 1.0 } },
  dawn: { sky: 'dawn', fog: ['#d8c2c8', 0.0022], hemi: ['#f0d8e6', '#6a5848', 0.78], key: ['#ffc7a0', 2.7, [-260, 60, -420]], rim: ['#ffe2c8', 0.4], line: '#7a6a86', grade: { exposure: 1.12, lift: [0.016, 0.012, 0.016], gain: [1.03, 1.0, 0.99], sat: 1.04 } },
};
function setHour(name, lampOn) {
  const Hh = HOURS[name]; for (const [k, s] of Object.entries(SKY)) s.visible = k === Hh.sky;
  scene.fog.color.set(Hh.fog[0]); scene.fog.density = Hh.fog[1];
  hemi.color.set(Hh.hemi[0]); hemi.groundColor.set(Hh.hemi[1]); hemi.intensity = Hh.hemi[2];
  key.color.set(Hh.key[0]); key.intensity = Hh.key[1]; key.position.set(...Hh.key[2]);
  rim.color.set(Hh.rim[0]); rim.intensity = Hh.rim[1]; lineMat.color.set(Hh.line);
  lampLight.intensity = 2600 * lampOn; LANTERN.material.color.setRGB(lerp(0.3, 4.2, lampOn), lerp(0.28, 3.0, lampOn), lerp(0.24, 1.6, lampOn));
  return Hh.grade;
}

// ------------------------------------------------------------------ the timeline: 112 BPM, cuts on the beat; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 112, FPS = 30;
const BEATS = [['s1', 0], ['s2', 12 * B], ['s3', 22 * B], ['s4', 30 * B], ['s5', 40 * B], ['end', 48 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
Object.assign(P_UI, P.ui);
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { lamp: 1.1, hour: popOf('hour'), more: popOf('more'), offers: popOf('offers'), night: popOf('night'), card: T.s5 };
EV.lift = EV.hour - 0.25;
EV.j1 = T.s2 + 0.55; EV.j2 = EV.j1 + (T.s3 - T.s2 - 0.7) / 3; EV.j3 = EV.j2 + (T.s3 - T.s2 - 0.7) / 3;   // the three rounds: 23:40, 01:55, 03:10
EV.tap1 = EV.j1 + 0.95; EV.tap2 = EV.j2 + 0.95; EV.tip = EV.j3 + 0.35;
EV.slump = T.s3 + 0.6; EV.ping = T.s4 + 1.0; EV.d4 = T.s4 + 0.4;
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...EV, ...CAP.events(P), quiet: [] };
const twos = (t) => Math.floor(t * 12) / 12;

// the drones' paths, per shot (world positions; high and far, crossing the frame slowly)
const PATHS = {
  1: [[[-200, 165, -430], [120, 180, -470], -2.5, T.s2 + 2], [[160, 140, -560], [-160, 150, -520], 0.5, T.s2 + 3], null],
  3: [[[-150, 165, -420], [20, 175, -420], T.s3 - 1.5, T.s4 + 0.5], [[0, 210, -520], [-150, 200, -500], T.s3 - 1.2, T.s4 + 1.5], [[-50, 68, -80], [24, 72, -90], T.s3 - 0.3, T.s4 + 0.6]],
  4: [[[80, 160, -520], [-220, 150, -480], T.s4 - 1, T.end + 4], null, null],
};

// ------------------------------------------------------------------ the shots
const LOOK0 = { pos: V([14, 31, 120]), at: V([-6, 41, -40]), fov: 38 };     // frame 0's composition, which the dawn returns to
let HEAD_S = null;   // v3: the head where the camera and the phone aim, from the pose on ONES (Toko himself is drawn on twos)
const headW = () => (HEAD_S ? HEAD_S.clone() : TOKO.mask.getWorldPosition(new THREE.Vector3()));
const SHOT = [
  { // 1 · dusk wide: the lamp comes on, the drones cross; on "hour" the phone comes up and the prototype runs
    t0: () => T.s1, t1: () => T.s2, hour: 'dusk',
    lamp: (t) => clamp((t - EV.lamp) / 0.5) * (t > EV.lamp + 0.12 && t < EV.lamp + 0.22 ? 0.3 : 1),
    pose(t) { const l = ease.out((t - EV.lift) / 0.45); return sitPose({ lift: 0.35 + 0.35 * l, lean: 0.36 - 0.06 * l, hp: 0.5 - 0.12 * l, breathe: Math.sin(t * 1.4) }); },
    ui(t) { drawUI('game', t, { time: P_UI.t0 }); }, thermos: 0,
    cam(t, lt, d) { const k = ease.io(lt / d); return { pos: LOOK0.pos.clone().add(V([-4 * k, -1 * k, -10 * k])), at: LOOK0.at.clone().add(V([0, -2 * k, 0])), fov: LOOK0.fov - 2 * k, focus: 104 - 10 * k, ap: 3.2 }; } },
  { // 2 · night, over his right shoulder onto the phone: One more change? Yes. Three rounds, three times; the thermos tips
    t0: () => T.s2, t1: () => T.s3, hour: 'night', lamp: () => 1,
    pose(t) { return sitPose({ lift: 0.72, lean: 0.38, hp: 0.62, breathe: 0.4 * Math.sin(t * 1.4) }); },
    // v3 (owner: "thumbs are weird"): no hand comes onto the screen; Yes simply flashes pressed on the tap moment
    ui(t) { const n = t < EV.j2 ? 1 : t < EV.j3 ? 2 : 3, t0 = [EV.j1, EV.j2, EV.j3][n - 1], k = clamp((t - t0) / 0.9), sel = (n === 1 && t > EV.tap1) || (n === 2 && t > EV.tap2) ? 0 : -1;
      drawUI('chat', t, { n, k, sel, time: [P_UI.t1, P_UI.t2, P_UI.t3][n - 1] }); },
    thermos: (t) => ease.out((t - EV.tip) / 0.35),
    cam(t, lt, d) { // his point of view, from just beside the mask: the screen big, his gloves at its sides
      // over his right shoulder, wide enough of the mask to clear it: the screen big, a glove at its edge
      const k = ease.io(lt / d), ph = WRAP.localToWorld(V(at(this.pose(t)._phone))), n = headW().sub(ph).normalize(), side = V([-1, 0, 0]);
      // v3: further from his shoulder; at 15.5→14.5 the near plane cut through the hoodie and a grey slab crossed the screen
      const pos = ph.clone().addScaledVector(n, lerp(17.5, 16.5, k)).addScaledVector(side, 12.5).add(V([0, 2.6, 0]));
      return { pos, at: ph.clone().add(V([-0.3, 2.4, 0])), fov: 38, focus: pos.distanceTo(ph), ap: 6 }; } },
  { // 3 · close on the mask, lit by the phone; the drones' red lights cross the dark behind him; he slumps a little each pose
    t0: () => T.s3, t1: () => T.s4, hour: 'night', lamp: () => 1,
    pose(t) { const s = ease.io((t - EV.slump) / (T.s4 - EV.slump)); return sitPose({ lift: 0.62 - 0.15 * s, lean: 0.4 + 0.12 * s, hp: 0.4 + 0.12 * s, hr: 0.08 * s, breathe: Math.sin(t * 1.1) }); },
    ui(t) { drawUI('chat', t, { n: 3, k: 1, time: P_UI.t3 }); }, thermos: () => 1,
    cam(t, lt, d) { const k = ease.io(lt / d), h = headW();
      const pos = h.clone().add(V([lerp(7, 5, k), lerp(-9, -8, k), lerp(52, 44, k)]));
      return { pos, at: h.clone().add(V([0, 2.5, 0])), fov: 30, focus: pos.distanceTo(h), ap: 9 }; } },
  { // 4 · dawn, back to frame 0's composition: asleep on the bench, the phone in his lap still asking
    t0: () => T.s4, t1: () => T.end, hour: 'dawn', lamp: (t) => 1 - clamp((t - T.s4 - 1.6) / 0.6), bird: true,
    pose(t) { return sitPose({ lift: 0.0, lean: 0.52, side: 0.1, hp: 0.78, hr: 0.22, breathe: Math.sin(t * 0.9) * 1.6 }); },
    ui(t) { drawUI('ask', t, { time: P_UI.t4 }); }, thermos: () => 1,
    cam(t, lt, d) { const k = ease.io((t - T.s4) / (T.s5 - T.s4 + 1.5)); return { pos: LOOK0.pos.clone().add(V([-8 * (1 - k), 3 * (1 - k), -24 * (1 - k)])), at: LOOK0.at.clone(), fov: LOOK0.fov, focus: lerp(84, 104, k), ap: 3.2 }; } },
];
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };
const pathsFor = (i) => PATHS[i + 1] || [null, null, null];

/** Toko's card: the dawn behind it soft and dim; the badge; two lines in his all-caps voice; his name. Set the same way every time. */
const CARD_FONT = LANG === 'ja' ? 'NotoSansJP-800' : 'Anton-400';
function fitLine(g, text, size, maxW, fam) { let fs = size; g.font = `${fs}px "${fam}"`; while (g.measureText(text).width > maxW && fs > 24) { fs -= 2; g.font = `${fs}px "${fam}"`; } return { fs, w: g.measureText(text).width }; }
function card(g, t) {
  const k = clamp((t - EV.card) / 0.6); if (k <= 0) return;
  g.save(); g.globalAlpha = k * 0.62; g.fillStyle = '#0d0b14'; g.fillRect(0, 0, W, H); g.restore();
  const b = ease.back((t - EV.card - 0.1) / 0.5); if (b > 0) { g.save(); g.translate(W / 2, 640); g.scale(b, b);
    // a blink, Toko's resting animation, once the card has settled
    const bl = (t - EV.card) > 1.6 && (t - EV.card) < 1.78 ? 0.15 : 1;
    drawMasterBadge(g, 0, 0, 120, { ground: MAG, ink: '#fff8f0', squash: bl }); g.restore(); }
  const a1 = ease.out((t - EV.card - 0.45) / 0.4), a2 = ease.out((t - EV.card - 0.9) / 0.4), a3 = ease.out((t - EV.card - 1.3) / 0.4);
  g.save(); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff8f0';
  let L = fitLine(g, P.ui.card1, LANG === 'ja' ? 64 : 92, 760, CARD_FONT); g.globalAlpha = a1; g.fillText(P.ui.card1, W / 2, 900 + (1 - a1) * 18);
  L = fitLine(g, P.ui.card2, LANG === 'ja' ? 80 : 128, 760, CARD_FONT); g.globalAlpha = a2; g.fillStyle = MAG; g.fillText(P.ui.card2, W / 2, 1040 + (1 - a2) * 18);
  g.globalAlpha = a3; g.fillStyle = 'rgba(255,248,240,.8)'; g.font = LANG === 'ja' ? '800 30px NotoSansJP-800' : '700 30px Inter'; g.fillText(P.ui.name, W / 2, 1130);
  g.restore();
}
const cardReport = (() => { const out = {}; for (const [k, s, f] of [['card1', LANG === 'ja' ? 64 : 92, CARD_FONT], ['card2', LANG === 'ja' ? 80 : 128, CARD_FONT]]) { g2d.save(); const L = fitLine(g2d, P.ui[k], s, 760, f); g2d.restore(); const x1 = Math.round(W / 2 + L.w / 2); out[k] = { text: P.ui[k], x0: Math.round(W / 2 - L.w / 2), x1, ok: x1 <= 940 && L.fs >= 0.6 * s }; } return out; })();

// ------------------------------------------------------------------ one frame
const LOOK = Q.get('look');
function frame(t, captions = true) {
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = S.t1() - t0, lt = t - t0, tq = twos(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  setBoil(Math.floor(t * 12));
  const grade0 = setHour(S.hour, S.lamp(t)), grade = i === 2 ? { ...grade0, exposure: grade0.exposure * 1.45, lift: [0.014, 0.014, 0.026] } : grade0;
  if (i === 2) hemi.intensity *= 1.8;
  // Toko, on twos
  // v3: the phone and the camera follow the pose evaluated on ONES, so they move smoothly with the screen's content;
  // v2 took both from the pose on twos, so the phone (and the over-the-shoulder camera) stepped every other frame
  const pzS = S.pose(t); TOKO.pose(pzS); WRAP.updateMatrixWorld(true);
  HEAD_S = null; const ph = WRAP.localToWorld(V(at(pzS._phone))), head = headW(); HEAD_S = head.clone();
  const pz = S.pose(tq); TOKO.pose(pz); WRAP.updateMatrixWorld(true);
  PHONE.position.copy(ph); PHONE.lookAt(head); PHONE.rotateY(0); PHONE.updateMatrixWorld(true);
  // v2 (owner: "his hands aren't on the phone"): the hands are placed ON the phone. Each mitt wraps a long edge from
  // behind, clear of the screen; the phone's +x is his right.
  { const gr = S.grip ? S.grip(tq) : {}, tap = gr.tap || 0, loose = S.bird ? 1 : 0;
    const toL = (v) => TOKO.group.worldToLocal(PHONE.localToWorld(V(v)));
    // v3: the mitts hold the sides and the back, clear of the screen
    const gR = [3.35, -1.8 - loose * 0.6, -1.0], gL = [-3.35, -1.8 - loose * 0.6, -1.0];
    const c = toL([0, -1.4, -0.5]), hR = toL(gR), hL = toL(gL), inR = c.clone().sub(hR).normalize(), inL = (tap > 0.5 ? toL([0, 0, -2]) : c).clone().sub(hL).normalize();
    pz.hdR = hR.toArray(); pz.hdL = hL.toArray(); pz.palm = [inR.toArray(), inL.toArray()];
    TOKO.pose(pz); WRAP.updateMatrixWorld(true); }
  S.ui(t);
  const glow = S.hour === 'night' ? (i === 2 ? 150 : 90) : S.hour === 'dusk' ? 40 : 18;
  phoneLight.position.copy(ph).add(head.clone().sub(ph).normalize().multiplyScalar(3.5)); phoneLight.intensity = glow * (1 + Math.sin(t * 7) * 0.04);
  const th = typeof S.thermos === 'function' ? S.thermos(tq) : S.thermos; THERMOS.rotation.set(0, 0.3, -th * 1.45); THERMOS.position.y = SEAT + 0.2 + th * 2.2;
  TOKO.hood.visible = i !== 1;                                                   // the hood's strings would hang across the screen over his shoulder
  BIRD.visible = !!S.bird; if (S.bird) BIRD.rotation.y = 0.9 + (Math.sin(tq * 2.3) > 0.7 ? 0.5 : 0);
  placeDrones(t, pathsFor(i));
  scene.updateMatrixWorld(true);
  const L = S.cam(t, lt, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: L.focus, aperture: Q.get('nodof') ? 0 : L.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.1, knee: 0.5, bloomA: 0.3, bloomB: 0.22, vignette: 0.3, grain: 0.025, seed: Math.floor(t * 12), contrast: 1.06, toe: 0.04, ...grade });
  if (t >= EV.card) { const k = clamp((t - EV.card) / 0.6); g2d.filter = `blur(${(k * 10).toFixed(1)}px)`; }
  g2d.drawImage(renderer.domElement, 0, 0); g2d.filter = 'none';
  card(g2d, t);
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const keep = () => [];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }), ui: cardReport },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL("image/png"); },
  dbg(t) { frame(t, false); return { cam: camera.position.toArray(), ph: PHONE.position.toArray(), head: headW().toArray(), shot: shotAt(t) }; } };
window.__ready = true;
