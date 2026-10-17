// TOKO IN JAPAN — persona look tests (plan/toko-personas.md), clay, on the Welcome Home stage kit.
//   look 1  KYOTO TOKO: a farmhouse in the hills north of Kyoto, an October morning. He kneels at the irori with
//           tea; the iron kettle hangs on its hook; a black rotary phone with its rule — 電話は午前中のみ; the
//           calendar says 令和8年 10月; persimmons dry under the eaves. Carrier GREEN.
//   look 2  TOKYO TOKO: a 1K flat at 1:07 a.m. Phone up, onigiri in the other hand, the laptop and a second screen
//           (未読 99+), a Post-it 締切 明日 on the bezel, laundry drying indoors, the city's neon behind. Carrier PURPLE.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../clay-roadster/lib/post.js';
import { surface, setBoil } from '../clay-roadster/lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh as mesh0, rng } from '../clay-roadster/lib/sculpt.js';
import { canvas, tex } from '../clay-roadster/lib/city.js';
import { Toko } from '../clay-roadster/lib/toko.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const FONT_DIR = '../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
{ const f = new FontFace('Inter', `url(${FONT_DIR}Inter-var.woff)`, { weight: '100 900' }); document.fonts.add(await f.load()); }
{ const f = new FontFace('IPAPGothic', 'url(../fonts/ipagp.ttf)'); document.fonts.add(await f.load()); }
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 2, 5000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const C = (color, o = {}) => surface({ color, wrap: 0.35, wrapTint: '#ffe0c8', rough: 0.74, bump: 1, lump: 0.03, lumpF: 0.3, thumb: 0.02, thumbCell: 2.6, ridge: 0.1, tool: 0.4, grain: 0.002, grainF: 8, mottle: 0.06, specks: 0.12, roughVar: 0.06, ...o });
const GLOW = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
/** a flat card with canvas art: a label, a sign, a screen */
function card(w, h, px, draw, { emissive = false, rough = 0.8 } = {}) {
  const c = canvas(Math.round(w * px), Math.round(h * px)), g = c.getContext('2d'); draw(g, c.width, c.height);
  const t = tex(c); return emissive ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false }) : new THREE.MeshStandardMaterial({ map: t, roughness: rough });
}
const JP = (wt, px) => `${wt} ${px}px "Inter", "IPAPGothic"`;

// ------------------------------------------------------------------ Toko, dressed per persona
function dress(mask, top, bottom, hair, feet = '#f4f1ea') {
  return {
    hoodie: C(top, { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1, mottle: 0.05 }), hoodie2: C(top, { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1 }),
    cuff: C(top), jeans: C(bottom, { thumbCell: 1.8, tool: 0.7 }), shoes: C(feet), sole: C('#d6d0c4'),
    glove: C(mask, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }), hair: C(hair, { tool: 1.2, thumbCell: 0.9, thumb: 0.04 }),
    maskDisc: C(mask, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
    strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
  };
}
function cast(mats, parent) { const t = new Toko(mats), w = new THREE.Group(); w.add(t.group); parent.add(w); return { toko: t, wrap: w }; }
function pose(c, x, z, yaw, P) {
  c.wrap.position.set(x, 0, z); c.wrap.rotation.set(0, yaw, 0);
  const hip = P.hip || [0, 21.5, 0], at = (v) => add3(hip, v);
  c.toko.pose({ hip, yaw: 0, lean: 0.08, side: 0, knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6], hp: 0.05, hr: 0, hy: 0, palm: [[0, -1, -0.3], [0, -1, -0.3]], ...P.f(at) });
  c.wrap.updateMatrixWorld(true);
}

// ================================================================== KYOTO: the farmhouse
const K = new THREE.Group(); scene.add(K);
const km = (g, m, o = {}) => mesh0(g, m, { parent: K, ...o });
const KM = {
  floor: C('#5a3e2a', { rough: 0.38, tool: 1.1, thumbCell: 2.4, clearcoat: 0.45, clearcoatRough: 0.3 }), floorB: C('#4d3424', { rough: 0.38, tool: 1.1, clearcoat: 0.45, clearcoatRough: 0.3 }),
  beam: C('#3a281c', { tool: 1.2, thumbCell: 2 }), post: C('#4a3424', { tool: 1.2 }),
  ash: C('#8e8a84', { rough: 1, thumbCell: 0.8, thumb: 0.05, mottle: 0.15 }), frame: C('#2e2119', { tool: 1, rough: 0.5, clearcoat: 0.3 }),
  iron: C('#26241f', { rough: 0.55, metal: 0.4, thumb: 0.03, thumbCell: 0.7, specks: 0.3, speckColor: '#5a4a3a' }),
  paper: new THREE.MeshStandardMaterial({ color: '#f1e8d6', roughness: 0.95, emissive: new THREE.Color('#fff0d8'), emissiveIntensity: 0.55, side: THREE.DoubleSide }),
  plaster: C('#cdb998', { thumbCell: 5, mottle: 0.1, specks: 0.2, speckColor: '#8a7656' }),
  cushion: C('#3c3a5e', { surf: 'felt', rough: 1, fibre: 0.07, fibreF: 2.4 }),
  cup: C('#7a6a52', { rough: 0.5, clearcoat: 0.6, clearcoatRough: 0.3, thumbCell: 0.9, mottle: 0.25 }),
  bakelite: C('#121112', { rough: 0.25, thumb: 0.006, specks: 0, clearcoat: 1, clearcoatRough: 0.1 }),
  radio: C('#c9b48e', { rough: 0.6 }), moss: C('#5d7a3c', { thumbCell: 0.9, thumb: 0.05, mottle: 0.2 }), mossL: C('#7c9a4c', { thumbCell: 0.9 }),
  stone: C('#8b8780', { thumbCell: 1.2, thumb: 0.05 }), kaki: C('#d4621c', { thumbCell: 0.5, thumb: 0.07, tool: 1.4, mottle: 0.2 }), cord: C('#cbb98c'),
  engawa: C('#7a5a3c', { tool: 1, rough: 0.5, clearcoat: 0.3 }),
};
// the itanoma: a dark polished plank floor
for (let i = -8; i <= 8; i++) km(lumpy(new RoundedBoxGeometry(9.6, 1.2, 160, 2, 0.35), 0.02, 0.3, 900 + i), i % 2 ? KM.floor : KM.floorB, { pos: [i * 9.8, -0.6, -20], cast: false });
// the irori: a sunken square hearth, its frame, ash, embers, and the iron kettle on the jizai-kagi
const IR = [13, 0, -7];
for (const [x, z, w, d] of [[0, -12.5, 27, 2.6], [0, 12.5, 27, 2.6], [-12.5, 0, 2.6, 22.4], [12.5, 0, 2.6, 22.4]]) km(lumpy(new RoundedBoxGeometry(w, 1.6, d, 2, 0.5), 0.02, 0.5, 950 + x + z), KM.frame, { pos: [IR[0] + x, 0.2, IR[2] + z] });
km(lumpy(new RoundedBoxGeometry(22.4, 0.6, 22.4, 2, 0.3), 0.08, 0.4, 960), KM.ash, { pos: [IR[0], -0.1, IR[2]], cast: false });
{ const r = rng(61), ember = GLOW(2.6, 0.9, 0.25), coal = C('#1a1614', { rough: 1, thumbCell: 0.6 });
  for (let i = 0; i < 9; i++) km(lumpy(ball(1.1 + r() * 0.7, 1, 0.7, 1, 12), 0.15, 1.2, 970 + i), i % 3 ? coal : ember, { pos: [IR[0] - 3 + r() * 6, 0.4, IR[2] - 3 + r() * 6], cast: false });
  for (let i = 0; i < 6; i++) km(ball(0.5 + r() * 0.4, 1, 0.6, 1, 10), ember, { pos: [IR[0] - 2.5 + r() * 5, 0.9, IR[2] - 2.5 + r() * 5], cast: false }); }
const emberLight = new THREE.PointLight('#ff8a3a', 900, 60, 2); emberLight.position.set(IR[0], 4, IR[2]); K.add(emberLight);
km(new THREE.CylinderGeometry(0.35, 0.35, 70, 8), KM.beam, { pos: [IR[0], 54, IR[2]], cast: false });                      // the jizai-kagi's bamboo
km(lumpy(new RoundedBoxGeometry(5, 2.4, 1.2, 2, 0.4), 0.03, 1, 980), KM.beam, { pos: [IR[0] + 1.5, 21, IR[2]] });             // its fish-shaped stop, simplified
km(sausage([[0, 21.8, 0], [0, 19.4, 0], [0.4, 18.0, 0]].map((p) => add3(p, IR)), [0.22, 0.22, 0.2], { seg: 8, steps: 10 }), KM.iron, { parent: K });
km(lumpy(lathe([[0, 0], [4.2, 0.4], [5.6, 2.6], [5.4, 4.6], [3.6, 6.2], [1.6, 6.6], [1.6, 7.2], [0, 7.2]], 32), 0.03, 1.2, 981), KM.iron, { pos: [IR[0], 10.4, IR[2]], scale: 0.68 });
km(sausage([[-3.2, 15.0, 0], [-3.3, 16.8, 0], [0, 18.0, 0], [3.3, 16.8, 0], [3.2, 15.0, 0]].map((p) => add3(p, IR)), [0.26, 0.26, 0.26, 0.26, 0.26], { seg: 8, steps: 30 }), KM.iron, { parent: K });
km(sausage([[3.4, 12.6, 0], [5.4, 13.4, 0], [6.2, 14.6, 0]].map((p) => add3(p, IR)), [0.62, 0.45, 0.32], { seg: 10, steps: 14 }), KM.iron, { parent: K });    // the spout
// the room: a plaster back wall with posts and a beam; shoji, two slid open on the engawa and the garden
const BW = -62;
km(new THREE.PlaneGeometry(220, 120), KM.plaster, { pos: [0, 60, BW - 8], cast: false });
km(lumpy(new RoundedBoxGeometry(220, 7, 7, 2, 1), 0.04, 0.4, 990), KM.beam, { pos: [0, 66, BW + 2] });
for (const x of [-50, -16, 50]) km(lumpy(new RoundedBoxGeometry(5, 66, 5, 2, 0.8), 0.04, 0.4, 991 + x), KM.post, { pos: [x, 33, BW + 2] });
function shoji(x0, w, z) {
  const g = new THREE.Group(); g.position.set(x0 + w / 2, 0, z); K.add(g);
  mesh0(new THREE.PlaneGeometry(w - 1, 61), KM.paper, { pos: [0, 31.5, 0], parent: g, cast: false });
  for (let i = 0; i <= 4; i++) mesh0(new RoundedBoxGeometry(i % 4 ? 0.5 : 1.6, 62, 1.1, 1, 0.2), KM.frame, { pos: [-w / 2 + i * w / 4, 31.5, 0.4], parent: g });
  for (let j = 0; j <= 7; j++) mesh0(new RoundedBoxGeometry(w, j % 7 ? 0.5 : 1.6, 1.1, 1, 0.2), KM.frame, { pos: [0, 0.8 + j * 61 / 7, 0.4], parent: g });
}
shoji(-48, 31, BW + 0.5); shoji(-14, 31, BW + 1.6);                // the two closed panels, left
shoji(-12, 31, BW - 1.5);                                           // the third, slid behind its neighbour: the opening is x 18..48
// beyond the opening (x 18..48): the engawa, moss, a stone lantern, layered misty hills, and the persimmons
km(lumpy(new RoundedBoxGeometry(80, 1.6, 18, 2, 0.4), 0.02, 0.4, 1000), KM.engawa, { pos: [30, 0.3, BW - 12] });
{ const r = rng(3); for (let i = 0; i < 16; i++) km(lumpy(ball(4 + r() * 6, 1, 0.45, 1, 18), 0.25, 0.25, 1010 + i), r() < 0.5 ? KM.moss : KM.mossL, { pos: [10 + r() * 60, -1.5, BW - 30 - r() * 30], cast: false }); }
for (const [y, h, w] of [[0, 3, 7], [3, 4, 3], [7, 4.5, 8], [11, 2.5, 4]]) km(lumpy(new RoundedBoxGeometry(w, h, w, 2, 0.6), 0.1, 0.6, 1030 + y), KM.stone, { pos: [44, y + h / 2, BW - 40] });
const hillMat = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.15), fog: false });
for (const [z, y, col, sx] of [[-260, 30, '#9fb1b8', 1.0], [-200, 18, '#7f9590', 0.9], [-150, 8, '#5f7a62', 0.8]]) {
  const s = new THREE.Shape(); s.moveTo(-200, -20); for (let x = -200; x <= 200; x += 20) s.lineTo(x, y + Math.sin(x * 0.02 * sx + z) * 14 + Math.sin(x * 0.051) * 6); s.lineTo(200, -20);
  km(new THREE.ShapeGeometry(s), hillMat(col), { pos: [30, 0, z], cast: false });
}
km(new THREE.PlaneGeometry(600, 300), hillMat('#dfe4df'), { pos: [30, 90, -320], cast: false });
{ const r = rng(9);   // hoshigaki: strings of persimmons drying under the eaves, in the opening
  for (let s = 0; s < 5; s++) { const x = 21 + s * 6.4, top = 64;
    km(new THREE.CylinderGeometry(0.12, 0.12, 30, 5), KM.cord, { pos: [x, top - 15, BW - 6], cast: false });
    for (let k = 0; k < 7; k++) km(lumpy(ball(1.5, 1, 0.82, 0.9, 14), 0.12, 1.4, 1100 + s * 10 + k), KM.kaki, { pos: [x + (r() - 0.5) * 0.6, top - 4 - k * 3.6, BW - 6], rot: [0, r() * 3, 0.2 * (r() - 0.5)] }); } }
// the low table with the rotary phone and its rule; the radio; the calendar on the post; the cushion; tea
km(lumpy(new THREE.CylinderGeometry(9, 9, 1.2, 40), 0.02, 0.5, 1200), KM.frame, { pos: [-17, 6.4, -6] });
for (const a of [0.6, 2.2, 3.8, 5.4]) km(new RoundedBoxGeometry(1, 6, 1, 1, 0.3), KM.frame, { pos: [-17 + Math.cos(a) * 6, 3, -6 + Math.sin(a) * 6] });
const PH = new THREE.Group(); PH.position.set(-17, 7, -6); PH.rotation.y = 0.5; K.add(PH);
mesh0(lumpy(new RoundedBoxGeometry(6.6, 3.4, 7.4, 3, 1.4), 0.02, 1, 1210), KM.bakelite, { pos: [0, 1.7, 0], parent: PH });
mesh0(new THREE.CylinderGeometry(2.4, 2.4, 0.5, 30).rotateX(-0.5), C('#e9e2d2', { rough: 0.4 }), { pos: [0, 2.9, 1.6], parent: PH });
mesh0(new THREE.TorusGeometry(1.6, 0.3, 8, 24).rotateX(Math.PI / 2 - 0.5), KM.bakelite, { pos: [0, 3.1, 1.75], parent: PH });
mesh0(lumpy(sausage([[-3.2, 3.9, -1.4], [-2.2, 4.4, -1.4], [2.2, 4.4, -1.4], [3.2, 3.9, -1.4]], [1.0, 0.6, 0.6, 1.0], { seg: 12, steps: 20 }), 0.02, 1, 1211), KM.bakelite, { parent: PH });
mesh0(new THREE.PlaneGeometry(4.6, 6.2), card(4.6, 6.2, 60, (g, w, h) => { g.fillStyle = '#f6efe0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2523'; g.textAlign = 'center';
  g.font = JP(400, 58); g.fillText('電話は', w / 2, 108); g.fillText('午前中', w / 2, 196); g.fillText('のみ', w / 2, 284); }), { pos: [3.6, 3.4, 2.4], rot: [-0.25, -0.4, 0], parent: PH, cast: false });
km(lumpy(new RoundedBoxGeometry(9, 5.6, 3.6, 3, 1.2), 0.02, 1, 1220), KM.radio, { pos: [-40, 2.8, BW + 12], rot: [0, 0.4, 0] });
km(new THREE.CircleGeometry(1.5, 24), C('#3a3226'), { pos: [-38.2, 3.2, BW + 14.2], rot: [0, 0.4, 0], cast: false });
km(new THREE.PlaneGeometry(9, 13), card(9, 13, 40, (g, w, h) => { g.fillStyle = '#f7f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2523'; g.textAlign = 'center';
  g.font = JP(400, 36); g.fillText('令和8年', w / 2, 52); g.font = '700 150px Inter'; g.fillStyle = '#b8241c'; g.fillText('10', w / 2 - 22, 196); g.font = JP(400, 60); g.fillStyle = '#2a2523'; g.fillText('月', w / 2 + 92, 196);
  g.font = '500 22px Inter'; for (let d = 1; d <= 31; d++) { const c = (d + 3) % 7, r = Math.floor((d + 3) / 7); g.fillStyle = c === 0 ? '#b8241c' : '#2a2523'; g.fillText(String(d), 40 + c * 47, 262 + r * 44); } }), { pos: [-16, 40, BW + 4.6], cast: false });
km(lumpy(new RoundedBoxGeometry(18, 2.2, 18, 3, 1), 0.06, 0.5, 1230), KM.cushion, { pos: [-4, 1.1, -22] });
const kyoto = cast(dress('#12783a', '#2f3d5c', '#2f3d5c', '#a8a29a', '#f2efe8'), K);
kyoto.toko.hood.visible = false; kyoto.toko.pocket.visible = false;
// a tenugui round his neck: indigo with white dots
km(lumpy(new THREE.TorusGeometry(3.2, 0.9, 12, 32).rotateX(Math.PI / 2 + 0.2), 0.05, 1, 1240), C('#e8e6f0', { surf: 'felt', rough: 1, fibre: 0.05 }), { pos: [0, 0, 0], cast: true });
const tenugui = K.children[K.children.length - 1];
const yunomi = km(lumpy(lathe([[0, 0], [1.6, 0], [1.8, 1.2], [1.9, 3.6], [0, 3.6]], 24), 0.02, 1, 1250), KM.cup);
const KLIGHTS = [];
{ const sun = new THREE.DirectionalLight('#fff1dc', 2.2); sun.position.set(80, 90, BW - 160); sun.target.position.set(0, 0, -10); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 20, far: 600 }); sun.shadow.radius = 3; sun.shadow.bias = -0.0004; K.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#e8edf2', '#5a4632', 0.75); K.add(hemi);
  const f = new THREE.DirectionalLight('#dfe6f0', 0.45); f.position.set(-40, 60, 120); K.add(f); }

// ================================================================== TOKYO: the 1K flat at 1:07 a.m.
const T = new THREE.Group(); T.position.set(3000, 0, 0); scene.add(T);
const tm = (g, m, o = {}) => mesh0(g, m, { parent: T, ...o });
const TM = {
  floor: C('#b79a78', { tool: 0.8, thumbCell: 2.4 }), floorB: C('#ab8e6c', { tool: 0.8 }), wall: C('#d9d6ce', { thumbCell: 6, mottle: 0.04 }),
  desk: C('#e6e2da', { rough: 0.5 }), steel: C('#2b2c30', { rough: 0.4, metal: 0.5 }), laptop: C('#9ea2a8', { rough: 0.35, metal: 0.6, thumb: 0.008 }),
  can: C('#1c6fd1', { rough: 0.3, metal: 0.6, thumb: 0.008, specks: 0 }), canB: C('#e8e8e8', { rough: 0.3, metal: 0.6, thumb: 0.008, specks: 0 }),
  nori: C('#1d2420', { rough: 0.7 }), rice: C('#f4f1ea', { thumbCell: 0.4, thumb: 0.06, mottle: 0.1 }), box: C('#b88e5a', { tool: 0.6 }), shirt: C('#f1f1f4', { surf: 'felt', rough: 1, fibre: 0.05 }), shirtB: C('#9fb6d4', { surf: 'felt', rough: 1, fibre: 0.05 }),
  bag: C('#f6f6f2', { rough: 0.6, opacity: 1 }), frame: C('#3b3d42', { rough: 0.4 }),
};
for (let i = -7; i <= 7; i++) tm(lumpy(new RoundedBoxGeometry(9.6, 1, 140, 2, 0.3), 0.02, 0.3, 1300 + i), i % 2 ? TM.floor : TM.floorB, { pos: [i * 9.8, -0.5, -20], cast: false });
const TW = -52;
{ const s = new THREE.Shape([[-120, 0], [120, 0], [120, 140], [-120, 140]].map(([x, y]) => new THREE.Vector2(x, y)));
  s.holes.push(new THREE.Path([[-34, 10], [34, 10], [34, 66], [-34, 66]].map(([x, y]) => new THREE.Vector2(x, y))));
  tm(lumpy(new THREE.ExtrudeGeometry(s, { depth: 4, bevelEnabled: false }), 0.03, 0.25, 1310), TM.wall, { pos: [0, 0, TW - 4] }); }
for (const [x, y, w, h] of [[-34, 38, 2, 58], [34, 38, 2, 58], [0, 66, 70, 2], [0, 10, 70, 2], [0, 38, 1.4, 56]]) tm(new RoundedBoxGeometry(w, h, 3, 1, 0.4), TM.frame, { pos: [x, y, TW - 2] });
// the city: blocks of lit windows, vertical neon in Japanese, a red-and-white lattice tower, a violet sky
tm(new THREE.PlaneGeometry(1400, 700), GLOW(0.05, 0.03, 0.12), { pos: [0, 200, -900], cast: false });
function windows(w, h, seed, warm) { return card(w, h, 4, (g, cw, ch) => { const r = rng(seed); g.fillStyle = '#0b0d16'; g.fillRect(0, 0, cw, ch);
  for (let y = 6; y < ch - 6; y += 14) for (let x = 5; x < cw - 5; x += 11) if (r() < 0.32) { g.fillStyle = r() < warm ? '#ffd9a0' : r() < 0.5 ? '#cfe6ff' : '#9fb8e8'; g.globalAlpha = 0.5 + r() * 0.5; g.fillRect(x, y, 7, 8); g.globalAlpha = 1; } }, { emissive: true }); }
{ const r = rng(44);
  for (let i = 0; i < 22; i++) { const z = -160 - r() * 520, w = 30 + r() * 60, h = 60 + r() * 220, x = -260 + r() * 520;
    tm(new THREE.PlaneGeometry(w, h), windows(w, h, 50 + i, 0.6), { pos: [x, h / 2 - 10, z], cast: false }); }
  // the tower, far off: a tapering red-and-white lattice with its lights
  const tw = new THREE.Group(); tw.position.set(-120, 0, -760); T.add(tw);
  for (let k = 0; k < 12; k++) mesh0(new THREE.CylinderGeometry(4 + (12 - k - 1) * 2.4, 4 + (12 - k) * 2.4, 22, 4, 1, true), new THREE.MeshBasicMaterial({ color: k % 2 ? new THREE.Color(1.4, 0.35, 0.2) : new THREE.Color(1.4, 1.3, 1.2), wireframe: true }), { pos: [0, 11 + k * 22, 0], parent: tw, cast: false });
  mesh0(new THREE.CylinderGeometry(0.6, 3, 70, 6), GLOW(1.6, 1.4, 1.3), { pos: [0, 299, 0], parent: tw, cast: false });
  // neon, vertical, close by
  const neon = (txt, col, x, z, h) => tm(new THREE.PlaneGeometry(9, h), card(9, h, 30, (g, w, ch) => { g.fillStyle = '#120a18'; g.fillRect(0, 0, w, ch); g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, ch - 16);
    g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 30; g.textAlign = 'center'; g.font = JP(400, 170); [...txt].forEach((ch2, i) => g.fillText(ch2, w / 2, 210 + i * 200)); }, { emissive: true }), { pos: [x, 40, z], cast: false });
  neon('カラオケ', '#ff4fd8', -26, -120, 46); neon('ラーメン', '#ffd23a', 18, -150, 46); neon('24時間', '#4ff0ff', 40, -200, 46);
}
// the desk, the laptop (its screen faces him: we see its lid), a second screen angled toward us, the props of a too-busy night
const DY = 19;
tm(lumpy(new RoundedBoxGeometry(56, 1.6, 22, 2, 0.5), 0.02, 0.4, 1400), TM.desk, { pos: [0, DY - 0.8, -18] });
for (const x of [-26, 26]) for (const z of [-27, -9]) tm(new THREE.CylinderGeometry(0.6, 0.6, DY - 1.6, 8), TM.steel, { pos: [x, (DY - 1.6) / 2, z] });
const LT = new THREE.Group(); LT.position.set(-15, DY, -17); LT.rotation.y = 0.55; T.add(LT);
mesh0(new RoundedBoxGeometry(17, 0.8, 11.5, 2, 0.3), TM.laptop, { pos: [0, 0.4, 0], parent: LT });
mesh0(new RoundedBoxGeometry(17, 11.5, 0.6, 2, 0.25), TM.laptop, { pos: [0, 6.0, 5.4], rot: [0.32, 0, 0], parent: LT });   // the lid, toward the camera
const MON = new THREE.Group(); MON.position.set(14, DY, -24); MON.rotation.y = -0.55; T.add(MON);
mesh0(new RoundedBoxGeometry(24, 15, 1.2, 2, 0.4), TM.frame, { pos: [0, 13, 0], parent: MON });
mesh0(new THREE.CylinderGeometry(0.8, 0.8, 6, 8), TM.frame, { pos: [0, 3, -0.6], parent: MON });
mesh0(new RoundedBoxGeometry(9, 0.6, 6, 2, 0.2), TM.frame, { pos: [0, 0.3, 0], parent: MON });
mesh0(new THREE.PlaneGeometry(22.6, 13.6), card(22.6, 13.6, 40, (g, w, h) => {
  g.fillStyle = '#f2f3f6'; g.fillRect(0, 0, w, h); g.fillStyle = '#2e3a8c'; g.fillRect(0, 0, 150, h);
  g.fillStyle = '#ffffff'; g.font = JP(700, 26); g.fillText('# 案件', 18, 50); g.fillText('# 至急', 18, 92); g.fillText('# 会議', 18, 134);
  g.fillStyle = '#ff3b30'; g.beginPath(); g.roundRect(96, 72, 46, 28, 14); g.fill(); g.fillStyle = '#fff'; g.font = '700 18px Inter'; g.fillText('99+', 102, 92);
  for (let i = 0; i < 7; i++) { const y = 40 + i * 70; g.fillStyle = '#c9cede'; g.beginPath(); g.arc(190, y + 14, 18, 0, TAU); g.fill(); g.fillStyle = '#9aa2b8'; g.fillRect(220, y, 260 + (i * 97 % 260), 12); g.fillRect(220, y + 22, 180 + (i * 61 % 300), 10); }
  g.fillStyle = '#ff3b30'; g.beginPath(); g.roundRect(w - 260, h - 80, 240, 56, 28); g.fill(); g.fillStyle = '#fff'; g.font = JP(700, 32); g.fillText('未読 99+', w - 222, h - 42);
}, { emissive: true }), { pos: [0, 13, 0.65], parent: MON, cast: false });
mesh0(new THREE.PlaneGeometry(5.2, 5.2), card(5.2, 5.2, 50, (g, w, h) => { g.fillStyle = '#ffe15a'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a2523'; g.textAlign = 'center'; g.font = JP(400, 76); g.fillText('締切', w / 2, 112); g.fillText('明日', w / 2, 210); }), { pos: [-9.2, 19.6, 0.75], rot: [0, 0, 0.08], parent: MON, cast: false });
for (const [x, z, m] of [[22, -10, TM.can], [25.5, -12, TM.canB], [-24, -10, TM.can]]) tm(new THREE.CylinderGeometry(1.1, 1.1, 4.2, 20), m, { pos: [x, DY + 2.1, z] });
tm(lumpy(new RoundedBoxGeometry(8, 7, 5, 2, 1.4), 0.12, 0.8, 1410), TM.bag, { pos: [-20, DY + 3.5, -22], rot: [0, 0.3, 0] });
for (let i = 0; i < 3; i++) tm(lumpy(new RoundedBoxGeometry(16 - i * 2, 9 - i, 12 - i, 2, 0.6), 0.04, 0.6, 1420 + i), TM.box, { pos: [44, 4.5 + i * 8.6, -30], rot: [0, 0.2 * i - 0.2, 0] });
// laundry drying indoors on a hanging rack
tm(new THREE.CylinderGeometry(0.4, 0.4, 44, 8).rotateZ(Math.PI / 2), TM.steel, { pos: [-36, 70, -34], cast: false });
for (const [x, m] of [[-50, TM.shirt], [-40, TM.shirtB], [-29, TM.shirt]]) tm(lumpy(new RoundedBoxGeometry(9, 15, 0.8, 2, 0.4), 0.15, 0.4, 1430 + x), m, { pos: [x, 60, -34], rot: [0, 0, (x % 3) * 0.02] });
const tokyo = cast(dress('#7c1d96', '#3a3d44', '#22252b', '#1d1a18', '#f4f4f4'), T);
// the phone in his hand; the onigiri in the other; the lanyard
const phone = tm(new RoundedBoxGeometry(3.2, 6.2, 0.5, 2, 0.35), C('#141416', { rough: 0.2, clearcoat: 1, clearcoatRough: 0.05, specks: 0 }));
const onigiri = new THREE.Group(); T.add(onigiri);
mesh0(lumpy(new THREE.CylinderGeometry(0.3, 2.4, 3.4, 3).rotateX(Math.PI / 2), 0.08, 0.8, 1440), TM.rice, { parent: onigiri });
mesh0(new RoundedBoxGeometry(2.2, 1.6, 1.4, 1, 0.3), TM.nori, { pos: [0, -1.0, 0], parent: onigiri });
const lanyard = tm(new THREE.BufferGeometry(), C('#2e6fd8', { rough: 0.6 })), badge = tm(new RoundedBoxGeometry(2.8, 3.8, 0.25, 1, 0.2), C('#bfc3c9', { rough: 0.9 }));
const TLIGHTS = [];
{ const hemi = new THREE.HemisphereLight('#3a3f6a', '#1a1418', 0.35); T.add(hemi);
  const screen = new THREE.PointLight('#cfe0ff', 300, 70, 2); screen.position.set(-11, DY + 11, -21); T.add(screen);          // the laptop, on his mask
  const mon = new THREE.PointLight('#dfe6ff', 240, 60, 2); mon.position.set(14, DY + 12, -16); T.add(mon);
  for (const [c, x, z, i] of [['#ff4fd8', -24, -70, 1400], ['#4ff0ff', 26, -70, 1100]]) { const l = new THREE.PointLight(c, i, 140, 2); l.position.set(x, 40, z); T.add(l); }
  const lamp = new THREE.SpotLight('#ffcf94', 2600, 0, 0.7, 0.8, 2); lamp.position.set(-30, 60, 10); lamp.target.position.set(-4, DY, -16); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); T.add(lamp, lamp.target); }

// ------------------------------------------------------------------ the looks
function poseKyoto() {
  pose(kyoto, -4, -22, 0.22, { hip: [0, 7.4, 0], f: (at) => ({
    lean: 0.14, hp: 0.1, hy: 0.15, hr: 0.04,
    legs: [{ knee: [0, -5.2, 9.6], foot: [0, -5.9, -1.4], shoePitch: 1.3 }, { knee: [0, -5.2, 9.6], foot: [0, -5.9, -1.4], shoePitch: 1.3 }],
    elR: at([-6.6, 7, 4.4]), hdR: at([-2.2, 10.4, 8.2]), elL: at([6.6, 7, 4.4]), hdL: at([2.4, 10, 8.2]), palm: [[0.6, 0, 0.3], [-0.6, 0, 0.3]] }) });
  const W2 = kyoto.wrap; W2.updateMatrixWorld(true);
  yunomi.position.copy(W2.localToWorld(new THREE.Vector3(0.1, 7.4 + 8.6, 8.8))); yunomi.rotation.set(0, 0, 0);
  const a = kyoto.toko.anchor; tenugui.position.copy(W2.localToWorld(new THREE.Vector3(...a.H3)).add(new THREE.Vector3(0, -0.6, 0.3))); tenugui.rotation.y = 0.12;
}
function poseTokyo() {
  pose(tokyo, -2, -32, 0.08, { f: (at) => ({ lean: 0.16, hp: 0.28, hy: 0.22, hr: -0.05,
    elL: at([7.4, 8.4, 4.2]), hdL: at([4.0, 16.4, 8.6]), elR: at([-7.4, 6.4, 3.4]), hdR: at([-7.6, 1.8, 9.4]), palm: [[0, -1, 0.4], [-0.5, 0.2, 0.8]] }) });
  const W2 = tokyo.wrap, hip = [0, 21.5, 0]; W2.updateMatrixWorld(true);
  const wp = (v) => W2.localToWorld(new THREE.Vector3(...add3(hip, v)));
  phone.position.copy(wp([3.6, 17.4, 9.4])).sub(T.position); phone.rotation.set(-0.5, -0.5, 0.1);
  onigiri.position.copy(wp([-7.4, 3.4, 10.4])).sub(T.position); onigiri.rotation.set(0.3, 0.4, 0);
  const a = tokyo.toko.anchor, n = (p) => W2.localToWorld(new THREE.Vector3(...p)).sub(T.position);
  const c0 = n(add3(a.H3, [-2.2, 0, 0.8])), c1 = n(add3(a.H1, [0, 3, 4.4])), c2 = n(add3(a.H3, [2.2, 0, 0.8]));
  lanyard.geometry.dispose(); lanyard.geometry = sausage([c0.toArray(), add3(c1.toArray(), [-0.6, 0, 0]), add3(c1.toArray(), [0.6, 0, 0]), c2.toArray()], [0.18, 0.18, 0.18, 0.18], { seg: 6, steps: 40 });
  badge.position.copy(c1).add(new THREE.Vector3(0, -2.2, 0.35)); badge.rotation.set(-0.1, 0.08, 0);
}
const LOOKS = [
  { name: 'toko-kyoto', group: K, setup: poseKyoto, pos: [12, 44, 70], at: [4, 17, -28], fov: 50, focusOn: () => kyoto.toko.mask, ap: 7, bg: '#dfe4df',
    grade: { exposure: 1.06, sat: 0.94, contrast: 1.05, lift: [0.012, 0.01, 0.006], gain: [1.03, 1.0, 0.95], vignette: 0.3, bloomA: 0.3, bloomB: 0.22, threshold: 1.1 } },
  { name: 'toko-tokyo', group: T, setup: poseTokyo, pos: [3010, 47, 40], at: [3003, 30, -36], fov: 48, focusOn: () => tokyo.toko.mask, ap: 7, bg: '#08060f',
    grade: { exposure: 1.1, sat: 1.12, contrast: 1.08, lift: [0.006, 0.004, 0.016], gain: [0.98, 0.98, 1.05], vignette: 0.42, bloomA: 0.45, bloomB: 0.35, threshold: 0.95 } },
];
function draw(i) {
  const L = LOOKS[i];
  K.visible = L.group === K; T.visible = L.group === T; scene.background = new THREE.Color(L.bg);
  setBoil(i + 1); L.setup(); scene.updateMatrixWorld(true);
  camera.fov = L.fov; camera.position.set(...L.pos); camera.lookAt(...L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  const fp = L.focusOn().getWorldPosition(new THREE.Vector3());
  post.render(scene, camera, { focus: camera.position.distanceTo(fp), aperture: L.ap, maxBlur: 28, radScale: 0.9, knee: 0.5, grain: 0.022, seed: i * 7, toe: 0.03, ...L.grade });
  g2d.drawImage(renderer.domElement, 0, 0);
  return out2d.toDataURL('image/png');
}
window.__film = { looks: LOOKS.map((l) => ({ name: l.name })), look: draw };
window.__ready = true;
