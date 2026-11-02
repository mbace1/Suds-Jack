// LOOK TEST · the robot in the woods (owner, 2 Nov: "a robot waking up in the woods and then jumping … can work with RFH
// if done right"). A demo of a look, not a film: a small, generic robot (no insignia, no logo, nobody's) lies in the
// moss of a misty Nordic forest; its screen-eyes flicker on, it pushes itself up, shakes off the birch leaves, looks
// around, crouches and jumps onto a mossy rock. Stylised 3D rather than clay: painted metal and dark glass, a low warm
// sun raking through birch and spruce, fog, god-rays, floating dust, depth of field and a cool/warm split grade.
// One caption in the house style near the end, for the Brink strand (The Panel's subject).
// Animation: squash and stretch on the body, anticipation before every move, arms and legs that telescope so a paddle
// hand stays planted on the ground while the body rises (house rule: hands touch what they hold). Every frame is a pure
// function of t. 1080×1920, 30 fps, 8 s. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from '../../clay/welcome/lib/post.js';
import { lumpy, ball, mesh as mesh0, rng } from '../../clay/welcome/lib/sculpt.js';
import { canvas, tex } from '../../clay/welcome/lib/city.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const FOGC = new THREE.Color('#8fa39c'); scene.fog = new THREE.FogExp2(FOGC, 0.075); scene.background = FOGC.clone();
const camera = new THREE.PerspectiveCamera(46, W / H, 0.1, 120);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const ease = {
  io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  out: (k) => 1 - Math.pow(1 - clamp(k), 3), in: (k) => Math.pow(clamp(k), 3),
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
};
const win = (t, a, b) => clamp((t - a) / (b - a));                     // 0 → 1 across [a, b]
const spring = (k, f = 13, d = 6) => (k <= 0 ? 0 : 1 - Math.exp(-d * k) * Math.cos(f * k));

// ------------------------------------------------------------------ materials
const STD = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });
// the robot's paint: a warm off-white with a little wear (a canvas noise map), safety-orange accents (The Panel's colour)
function wearTex(seed) { const c = canvas(256, 256), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + r() * 40},${80 + r() * 30},${60 + r() * 30},${0.04 + r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(70,60,50,${0.08 + r() * 0.12})`; g.lineWidth = 0.6; g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const M = {
  paint: STD('#e6dfcf', { roughness: 0.48, metalness: 0.12, map: wearTex(3) }),
  orange: STD('#e8641e', { roughness: 0.45, metalness: 0.1 }),
  joint: STD('#2c2f33', { roughness: 0.4, metalness: 0.6 }),
  piston: STD('#9aa1a6', { roughness: 0.25, metalness: 0.9 }),
  glass: STD('#090d10', { roughness: 0.12, metalness: 0.4 }),
  moss: STD('#ffffff', { roughness: 0.95, vertexColors: true }),
  mossDark: STD('#34491f', { roughness: 0.95 }),
  rock: STD('#6f7470', { roughness: 0.9 }),
  bark: STD('#d9d6cf', { roughness: 0.85 }),
  spruce: STD('#1e3326', { roughness: 0.9 }),
  trunkDark: STD('#2a2420', { roughness: 0.9 }),
};

// ------------------------------------------------------------------ the forest floor: moss, flat where the robot lies
const GROUND = (() => {
  const geo = new THREE.PlaneGeometry(60, 60, 160, 160).rotateX(-Math.PI / 2), p = geo.attributes.position, cols = [];
  const c1 = new THREE.Color('#5d7a33'), c2 = new THREE.Color('#3d5424'), c3 = new THREE.Color('#7a7a3a'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x - 0.6, z + 0.3), keep = clamp((d - 2.2) / 3);   // flat around the action
    const n = Math.sin(x * 0.9) * Math.cos(z * 0.7) * 0.25 + Math.sin(x * 2.3 + z * 1.7) * 0.06;
    p.setY(i, n * keep + Math.sin(x * 6.1 + z * 5.3) * 0.012);
    const m = 0.5 + 0.5 * Math.sin(x * 3.1 + z * 2.2) * Math.cos(z * 1.3 - x * 0.7);
    tmp.copy(c1).lerp(c2, m); if (Math.sin(x * 1.3 + z * 4.1) > 0.75) tmp.lerp(c3, 0.5); cols.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
  return mesh0(geo, M.moss, { parent: scene, cast: false });
})();
// moss tufts and stones: instanced lumps scattered round the clearing
(() => {
  const r = rng(11), g = lumpy(new THREE.IcosahedronGeometry(1, 2), 0.25, 1.4, 12), n = 140;
  const im = new THREE.InstancedMesh(g, M.mossDark, n), o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = 1.4 + r() * 7; const s = 0.06 + r() * 0.16;
    o.position.set(0.6 + Math.cos(a) * d, s * 0.25, -0.3 + Math.sin(a) * d); o.scale.set(s * (1 + r()), s * 0.6, s * (1 + r())); o.rotation.y = r() * TAU; o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
  im.receiveShadow = true; im.castShadow = true; scene.add(im);
})();

// the rock it lands on: lumpy grey stone with a moss cap
const ROCK = { pos: [1.55, 0, -0.75], top: 0.66 };
mesh0(lumpy(ball(0.78, 1, 0.62, 0.9, 40), 0.18, 1.3, 21), M.rock, { pos: [ROCK.pos[0], 0.12, ROCK.pos[2]], parent: scene });
mesh0(lumpy(ball(0.66, 1, 0.22, 0.78, 36), 0.12, 2.2, 22), M.mossDark, { pos: [ROCK.pos[0], 0.55, ROCK.pos[2]], parent: scene });

// birches and spruces, receding into the fog; two close trunks frame the shot and fall out of focus
function birchTex() { const c = canvas(64, 512), g = c.getContext('2d'), r = rng(31);
  g.fillStyle = '#e9e6de'; g.fillRect(0, 0, 64, 512);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(20,18,16,${0.5 + r() * 0.4})`; const y = r() * 512, w = 6 + r() * 30, x = r() * 64; g.fillRect(x - w / 2, y, w, 1.5 + r() * 4); }
  for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(120,110,95,.18)'; g.fillRect(r() * 64, r() * 512, 1, 2); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t; }
const BIRCH = STD('#ffffff', { roughness: 0.8, map: birchTex() });
const TREES = [];
(() => {
  const r = rng(41);
  const birch = (x, z, rad) => { const h = 16; const m = mesh0(new THREE.CylinderGeometry(rad * 0.8, rad, h, 18), BIRCH, { pos: [x, h / 2 - 0.2, z], rot: [0, r() * TAU, (r() - 0.5) * 0.06], parent: scene }); TREES.push(m); };
  const spruce = (x, z, s) => { const g = new THREE.Group(); scene.add(g); g.position.set(x, 0, z);
    mesh0(new THREE.CylinderGeometry(0.08 * s, 0.14 * s, 3 * s, 8), M.trunkDark, { pos: [0, 1.5 * s, 0], parent: g });
    for (let k = 0; k < 6; k++) { const rr = (1.5 - k * 0.22) * s, hh = 1.5 * s; mesh0(new THREE.ConeGeometry(rr, hh, 9), M.spruce, { pos: [0, (1.1 + k * 0.85) * s, 0], rot: [0, r(), 0], parent: g }); }
    TREES.push(g); };
  // background
  for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 22, z = -4 - r() * 18; if (Math.abs(x - 0.6) < 1.2 && z > -6) continue; (r() < 0.55 ? birch(x, z, 0.12 + r() * 0.1) : spruce(x, z, 0.8 + r() * 0.7)); }
  // mid: two birches either side of the clearing, a spruce behind the rock
  birch(-1.9, -2.6, 0.16); birch(3.2, -3.4, 0.14); spruce(2.6, -5.2, 1.1);
  // foreground framing trunks (out of focus)
  birch(-1.55, 2.2, 0.17); birch(2.45, 1.6, 0.13);
})();

// fallen birch leaves: a scatter on the ground, and the ones lying on the robot (they fly off when it shakes)
function leafTex() { const c = canvas(64, 64), g = c.getContext('2d');
  g.translate(32, 32); g.rotate(0.4); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, 0, 14, 24, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(120,80,20,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -24); g.lineTo(0, 24); g.stroke(); return tex(c); }
const LEAFT = leafTex();
const leafMat = new THREE.MeshStandardMaterial({ map: LEAFT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, vertexColors: false });
const LEAFG = new THREE.PlaneGeometry(0.11, 0.11);
const LEAFCOLS = ['#e0a92a', '#d98a1f', '#c9b23a', '#b8701c', '#e7c450'];
(() => { const r = rng(51), n = 260, im = new THREE.InstancedMesh(LEAFG, leafMat, n), o = new THREE.Object3D(), c = new THREE.Color();
  for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 5.5;
    o.position.set(0.5 + Math.cos(a) * d, 0.012 + r() * 0.01, -0.2 + Math.sin(a) * d); o.rotation.set(-Math.PI / 2 + (r() - 0.5) * 0.4, 0, r() * TAU); o.scale.setScalar(0.7 + r() * 0.7); o.updateMatrix();
    im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.set(LEAFCOLS[i % 5])); }
  im.receiveShadow = true; scene.add(im); })();

// ------------------------------------------------------------------ the robot
// hierarchy: R (on the ground) → P (pelvis: height, tilt) → S (squash: torso) ; arms, head and legs hang off P and follow
// S's scaled anchor points, so a squash never shears a limb
const R = new THREE.Group(); scene.add(R);
const P = new THREE.Group(); R.add(P);
const S = new THREE.Group(); P.add(S);
const TOR = { w: 0.8, h: 0.7, d: 0.6, y0: 0.06 };
mesh0(new RoundedBoxGeometry(TOR.w, TOR.h, TOR.d, 4, 0.16), M.paint, { pos: [0, TOR.y0 + TOR.h / 2, 0], parent: S });
mesh0(new RoundedBoxGeometry(TOR.w + 0.04, 0.12, TOR.d + 0.04, 3, 0.05), M.orange, { pos: [0, TOR.y0 + TOR.h * 0.86, 0], parent: S });   // a collar band
mesh0(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24).rotateX(Math.PI / 2), M.joint, { pos: [0, TOR.y0 + 0.36, TOR.d / 2 + 0.005], parent: S });  // a chest vent
for (let k = 0; k < 3; k++) mesh0(new THREE.BoxGeometry(0.14, 0.012, 0.01), M.piston, { pos: [0, TOR.y0 + 0.33 + k * 0.03, TOR.d / 2 + 0.03], parent: S, cast: false });
mesh0(new RoundedBoxGeometry(0.42, 0.14, TOR.d * 0.8, 3, 0.05), M.joint, { pos: [0, TOR.y0 - 0.02, 0], parent: P });   // the hip block
// the head: a rounded box, a dark glass visor, screen-eyes on a canvas; an antenna with a lamp
const HEAD = new THREE.Group(); P.add(HEAD);
const NECK = [0, TOR.y0 + TOR.h + 0.02, 0];
mesh0(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 16), M.joint, { pos: [0, 0.03, 0], parent: HEAD });
const HW = 0.86, HH = 0.62, HD = 0.62;
mesh0(new RoundedBoxGeometry(HW, HH, HD, 4, 0.2), M.paint, { pos: [0, 0.06 + HH / 2, 0], parent: HEAD });
mesh0(new RoundedBoxGeometry(HW * 0.84, HH * 0.66, 0.06, 4, 0.025), M.glass, { pos: [0, 0.06 + HH / 2 - 0.01, HD / 2 - 0.012], parent: HEAD });
for (const s of [-1, 1]) mesh0(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 20).rotateZ(Math.PI / 2), M.orange, { pos: [s * (HW / 2 + 0.03), 0.06 + HH / 2, 0], parent: HEAD });   // ear caps
mesh0(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8), M.joint, { pos: [0.18, 0.06 + HH + 0.12, -0.08], parent: HEAD });
const LAMPMAT = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 0.06, 0.02) });
mesh0(new THREE.SphereGeometry(0.035, 16, 12), LAMPMAT, { pos: [0.18, 0.06 + HH + 0.26, -0.08], parent: HEAD, cast: false });
const EYC = canvas(256, 128), EYT = tex(EYC);
const EYEMAT = new THREE.MeshBasicMaterial({ map: EYT, transparent: true, toneMapped: false, depthWrite: false });
mesh0(new THREE.PlaneGeometry(HW * 0.8, HH * 0.6), EYEMAT, { pos: [0, 0.06 + HH / 2 - 0.01, HD / 2 + 0.022], parent: HEAD, cast: false, recv: false });
const EYELIGHT = new THREE.PointLight('#7fe9ff', 0, 2.2, 2); EYELIGHT.position.set(0, 0.06 + HH / 2, HD / 2 + 0.25); HEAD.add(EYELIGHT);
/** the screen-eyes: off, a flicker, open, a blink, a glance (dx), a squint (determined), a happy arc */
function drawEyes(o) {
  const g = EYC.getContext('2d'); g.clearRect(0, 0, 256, 128);
  if (o.on <= 0) { EYT.needsUpdate = true; return; }
  g.save(); g.globalAlpha = o.on; g.fillStyle = '#9ff4ff'; g.shadowColor = '#5fe0ff'; g.shadowBlur = 18;
  for (const s of [-1, 1]) {
    const cx = 128 + s * 52 + o.dx * 26, cy = 64 + o.dy * 14;
    if (o.happy > 0.5) { g.lineWidth = 12; g.strokeStyle = '#9ff4ff'; g.lineCap = 'round'; g.beginPath(); g.arc(cx, cy + 10, 20, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
    const hgt = Math.max(4, 54 * (1 - o.blink) * (1 - 0.55 * o.squint)), wid = 30;
    g.beginPath(); g.roundRect(cx - wid / 2, cy - hgt / 2 + (o.squint * 8), wid, hgt, 12); g.fill();
    if (o.squint > 0) { g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(cx - 24, cy - 30); g.lineTo(cx + 24, cy - 30); g.lineTo(cx + s * -24, cy - 30 + 26 * o.squint); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over'; }
  }
  g.restore();
  g.globalAlpha = 0.18 * o.on; g.fillStyle = '#000'; for (let y = 0; y < 128; y += 4) g.fillRect(0, y, 256, 1.5); g.globalAlpha = 1;   // scanlines
  EYT.needsUpdate = true;
}
// limbs: a sleeve, a telescoping piston and a paddle (no thumbs) or a foot. Built along −Y of a pivot that is aimed
// at a target each frame; the piston stretches so the end lands exactly on the target
function limb(sleeveLen, rSleeve, rPiston, endGeo, endMat) {
  const pivot = new THREE.Group(); P.add(pivot);
  mesh0(new THREE.SphereGeometry(rSleeve * 1.25, 16, 12), M.joint, { parent: pivot });
  mesh0(new THREE.CylinderGeometry(rSleeve, rSleeve * 0.92, sleeveLen, 16), M.paint, { pos: [0, -sleeveLen / 2, 0], parent: pivot });
  const piston = mesh0(new THREE.CylinderGeometry(rPiston, rPiston, 1, 12), M.piston, { parent: pivot });
  const end = endGeo ? mesh0(endGeo, endMat, { parent: pivot }) : null;
  return { pivot, piston, end, sleeveLen };
}
const HANDR = 0.1;
const ARMS = [-1, 1].map((s) => ({ s, base: [s * (TOR.w / 2 + 0.06), TOR.y0 + TOR.h * 0.72, 0], ...limb(0.2, 0.065, 0.04, ball(HANDR, 1.05, 0.8, 1.2, 20), M.orange) }));
const LEGS = [-1, 1].map((s) => ({ s, base: [s * 0.2, -0.02, 0], ...limb(0.14, 0.075, 0.05, null) }));
const FEET = [-1, 1].map((s) => { const f = new THREE.Group(); R.add(f); mesh0(new RoundedBoxGeometry(0.24, 0.11, 0.34, 3, 0.05), M.joint, { pos: [0, 0.055, 0.03], parent: f }); return f; });
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), DOWN = V(0, -1, 0);
/** aim a limb's pivot (in P space at `anchor`) at a WORLD point, stretch its piston so its end lands there */
function reach(L, anchor, world, endOffset) {
  L.pivot.position.set(...anchor); L.pivot.updateMatrixWorld(true);
  _a.copy(world); P.worldToLocal(_a); _a.sub(L.pivot.position);
  const len = Math.max(0.05, _a.length() - endOffset); _a.normalize();
  L.pivot.quaternion.setFromUnitVectors(DOWN, _a);
  const pl = Math.max(0.02, len - L.sleeveLen * 0.5);
  L.piston.scale.set(1, pl, 1); L.piston.position.set(0, -(L.sleeveLen * 0.5 + pl / 2), 0);
  if (L.end) L.end.position.set(0, -len, 0);
}

// ------------------------------------------------------------------ light, haze, dust
scene.add(new THREE.HemisphereLight('#b9cbd6', '#3b4a2a', 1.1));
const SUN = new THREE.DirectionalLight('#ffd49a', 3.4); SUN.position.set(5.5, 7, -7); SUN.target.position.set(0.6, 0, -0.3);
SUN.castShadow = true; SUN.shadow.mapSize.set(2048, 2048); SUN.shadow.bias = -0.0004; SUN.shadow.normalBias = 0.02;
Object.assign(SUN.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 }); scene.add(SUN, SUN.target);
const FILL = new THREE.DirectionalLight('#9db7cc', 0.7); FILL.position.set(-3, 2.5, 6); scene.add(FILL);
// god-rays: long additive slabs raking from the sun through the trees, in the fog
function rayTex() { const c = canvas(64, 512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.2, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  const h = g.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = h; g.fillRect(0, 0, 64, 512); return tex(c); }
const RAYT = rayTex(), RAYS = [];
for (const [x, z, w, o] of [[0.2, -2.2, 0.9, 0.11], [1.6, -3.5, 1.3, 0.09], [-0.9, -1.4, 0.6, 0.07], [2.8, -1.6, 0.8, 0.06], [-2.2, -5, 1.6, 0.07]]) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 14), new THREE.MeshBasicMaterial({ map: RAYT, color: '#ffcf8a', transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.position.set(x, 4.5, z); m.rotation.set(0, -0.5, 0.62); scene.add(m); RAYS.push({ m, o });
}
const DUST = (() => { const r = rng(61), n = 420, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) { seed.push([(r() - 0.5) * 7 + 0.6, r() * 3.2, -r() * 6 + 1.2, r() * TAU]); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffe2b0', size: 0.018, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(p); return { p, seed, pos }; })();
// the sky behind the fog: a pale gradient with the sun's glow, unlit
(() => { const c = canvas(64, 512), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#c9d6cf'); gr.addColorStop(0.55, '#a9bbb3'); gr.addColorStop(1, '#8fa39c'); g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
  mesh0(new THREE.PlaneGeometry(140, 70), new THREE.MeshBasicMaterial({ map: tex(c), fog: false }), { pos: [0, 20, -60], parent: scene, cast: false, recv: false });
  const glow = canvas(256, 256), gg = glow.getContext('2d'), rg = gg.createRadialGradient(128, 128, 4, 128, 128, 128);
  rg.addColorStop(0, 'rgba(255,236,200,1)'); rg.addColorStop(0.3, 'rgba(255,214,150,.45)'); rg.addColorStop(1, 'rgba(255,200,140,0)'); gg.fillStyle = rg; gg.fillRect(0, 0, 256, 256);
  mesh0(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: tex(glow), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, color: new THREE.Color(1.6, 1.4, 1.1) }), { pos: [16, 16, -55], parent: scene, cast: false, recv: false }); })();

// the leaves lying on the robot: placed in P space, they fly off on the shake
const RLEAVES = (() => { const r = rng(71), out = [], c = new THREE.Color();
  for (let i = 0; i < 9; i++) { const m = new THREE.Mesh(LEAFG, leafMat.clone()); m.material.color.set(LEAFCOLS[i % 5]); m.castShadow = true; scene.add(m);
    const local = [(r() - 0.5) * 0.6, TOR.y0 + 0.1 + r() * 0.58, TOR.d / 2 + 0.015];   // on its chest, which faces the sky
    out.push({ m, local, v: [(r() - 0.5) * 2.2, 1.2 + r() * 1.6, (r() - 0.3) * 1.6], spin: [(r() - 0.5) * 9, (r() - 0.5) * 9, (r() - 0.5) * 9], rest: [0, 0, 0] }); }
  return out; })();

// ------------------------------------------------------------------ the performance: a timeline of poses
const FPS = 30, DUR = 8.0;
const EV = { eyes: 1.15, plant: 1.9, sit: 2.3, stand: 3.05, shake: 3.65, look: 4.1, turn: 4.95, crouch: 5.15, jump: 5.7, land: 6.32, settle: 6.6 };
const START = [0, 0, 0], LANDAT = [ROCK.pos[0] - 0.05, ROCK.top, ROCK.pos[2] + 0.05];
/** everything about the robot at t: where R stands, the pelvis, the squash, the head, the hands and feet (WORLD) */
function pose(t) {
  const o = { r: [...START], yaw: 0, py: 0.32, tiltZ: 0, tiltX: -1.5, sq: 1, headYaw: 0, headPitch: 0.25, eyes: { on: 0, dx: 0, dy: 0, blink: 0, squint: 0, happy: 0 }, lamp: 0 };
  // 0 · lying on its side in the moss; at 1.15 the eyes flicker on (a stutter, then held), the head lifts a touch
  const fl = t - EV.eyes; if (fl > 0) o.eyes.on = fl < 0.55 ? ((Math.sin(fl * 61) > 0.2 || fl > 0.42) ? clamp(fl * 3) : 0.15) : 1;
  o.lamp = fl > 0.3 ? 1 : 0; o.eyes.dy = 0.3 * (1 - win(t, 1.7, 2.1));

  // 1 · it sits up: rolls off its side to upright, the top hand planted, then the other; pelvis low
  const up = ease.io(win(t, EV.sit, EV.stand));
  o.tiltX = lerp(-1.5, 0, up); o.py = lerp(0.32, 0.3, up);
  o.headPitch = 0.38 * ease.io(win(t, 1.45, 1.95)) * (1 - up) + 0.05 * up;   // it lifts its head to look, then sits up
  // 2 · it stands: pelvis rises, a little overshoot
  const st = win(t, EV.stand, EV.shake - 0.05); o.py = lerp(o.py, 0.5, ease.back(st)); o.tiltX += Math.sin(st * Math.PI) * 0.28;
  // squash on the push and the stand
  o.sq = 1 - 0.08 * Math.sin(win(t, EV.sit - 0.15, EV.sit + 0.2) * Math.PI) - 0.07 * Math.sin(win(t, EV.stand - 0.1, EV.stand + 0.25) * Math.PI) + 0.06 * Math.sin(win(t, EV.stand + 0.25, EV.shake) * Math.PI);
  // 3 · the shake: a fast decaying wobble about the vertical and a side-to-side roll
  const sh = t - EV.shake; if (sh > 0 && sh < 0.6) { const k = Math.exp(-sh * 5); o.tiltZ += Math.sin(sh * 42) * 0.16 * k; o.headYaw += Math.sin(sh * 42 + 1) * 0.3 * k; o.sq *= 1 + Math.sin(sh * 42) * 0.04 * k; }
  // 4 · it looks around: left, a blink, right, then fixes on the rock (eyes squint: determined)
  const lk = (a, b, v) => ease.io(win(t, a, b)) * v;
  const lookYaw = lk(EV.look, EV.look + 0.25, 0.7) + lk(EV.look + 0.55, EV.look + 0.85, -1.35) + lk(EV.turn - 0.1, EV.turn + 0.15, 1.1);
  o.headYaw += lookYaw; o.eyes.dx = clamp(lookYaw * 1.2, -1, 1) * (t < EV.crouch ? 1 : 0.4);
  const bl = (c) => Math.max(0, 1 - Math.abs(t - c) / 0.07); o.eyes.blink = Math.max(bl(2.05), bl(EV.look + 0.4), bl(EV.turn - 0.18));
  o.eyes.squint = ease.io(win(t, EV.turn, EV.crouch + 0.1)) * (1 - win(t, EV.land + 0.15, EV.settle + 0.1));
  o.yaw = lerp(0, 0.95, ease.io(win(t, EV.turn, EV.crouch + 0.2)));      // the body turns toward the rock
  o.headYaw -= o.yaw * win(t, EV.turn, EV.crouch + 0.2);                   // the head led; it now sits square on the body
  // 5 · anticipation: crouch, squash, lean in
  const cr = ease.io(win(t, EV.crouch, EV.jump)); o.py = lerp(o.py, 0.3, cr); o.sq *= lerp(1, 0.84, cr); o.tiltX += 0.25 * cr; o.headPitch += 0.15 * cr;
  // 6 · the jump: a ballistic arc to the rock, stretched on the way up, tucked over the top
  const jk = win(t, EV.jump, EV.land);
  if (t >= EV.jump) {
    const k = jk, arc = Math.sin(k * Math.PI) * 0.62;
    o.r = lerp3(START, LANDAT, ease.io(k * 0.85 + 0.15 * k * k)); o.r[1] = lerp(START[1], LANDAT[1], k) + arc;
    o.py = lerp(0.3, 0.5, ease.out(k * 3)); o.sq = k < 0.45 ? lerp(0.84, 1.2, ease.out(k / 0.2)) : lerp(1.2, 0.96, win(k, 0.45, 1));
    o.tiltX = lerp(0.25, -0.15, k);
  }
  // 7 · the landing: a hard squash, a springy recovery; it turns to the light, eyes go happy
  if (t >= EV.land) { o.r = [...LANDAT]; const lt = t - EV.land; o.sq = 1 - 0.2 * Math.exp(-lt * 7) * Math.cos(lt * 16); o.py = 0.5 - 0.12 * Math.exp(-lt * 6); o.tiltX = -0.15 * Math.exp(-lt * 5);
    o.yaw = lerp(0.95, -0.22, ease.io(win(t, EV.settle, EV.settle + 0.7))); o.headYaw = lerp(0, 0.12, ease.io(win(t, EV.settle + 0.2, EV.settle + 0.8)));   // it turns to us o.headPitch = lerp(0.1, -0.12, ease.io(win(t, EV.settle + 0.3, 7.6)));
    o.eyes.happy = t > EV.settle + 0.5 && t < 7.4 ? 1 : 0; o.eyes.dx = 0; o.eyes.blink = Math.max(o.eyes.blink, bl(7.5)); }
  return o;
}
/** hands and feet for the pose, in WORLD space; the robot's own frame is set already */
function ends(t, o) {
  const toW = (v) => R.localToWorld(V(...v)), pToW = (v) => P.localToWorld(V(...v));
  const hands = [], feet = [];
  // feet: lying curled to its right; sitting, out in front; standing, under the hips; crouch wider; mid-air tucked
  const up = ease.io(win(t, EV.sit, EV.stand)), st = ease.io(win(t, EV.stand, EV.shake - 0.1));
  for (const s of [-1, 1]) {
    let f = [s * 0.2, 0, 0.6];
    f = lerp3(f, [s * 0.24, 0, 0.42], up); f = lerp3(f, [s * 0.2, 0, 0.0], st);
    const cr = ease.io(win(t, EV.crouch, EV.jump)); f = lerp3(f, [s * 0.27, 0, 0.04], cr);
    if (t >= EV.jump && t < EV.land) { const k = win(t, EV.jump, EV.land); f = [s * 0.18, Math.sin(k * Math.PI) * 0.0, 0.0]; feet.push(pToW([s * 0.2, -0.28 - 0.1 * (1 - Math.abs(k - 0.5) * 2), 0.06])); continue; }
    feet.push(toW(f));
  }
  // hands: lying, the top hand rests on the body and the lower one is tucked; then each is PLANTED on the moss while
  // the body rises (the telescoping arm keeps the paddle on the ground); standing, they hang at the sides
  for (const A of ARMS) {
    const side = A.s;
    const rest = pToW([side * 0.52, TOR.y0 + 0.12, 0.08]);
    const lie = toW([side * 0.62, HANDR * 0.8, -0.38]), plant = toW([side * 0.6, HANDR * 0.8, 0.08]);   // beside the chest; beside the hips
    const k1 = ease.io(win(t, EV.plant + (side > 0 ? 0 : 0.08), EV.sit + 0.05)), k2 = ease.io(win(t, EV.stand + (side > 0 ? 0.15 : 0.1), EV.shake));
    let h = lie.lerp(plant, k1).add(V(0, Math.sin(k1 * Math.PI) * 0.12, 0));
    if (k2 > 0) h = plant.clone().lerp(rest, k2).add(V(0, Math.sin(k2 * Math.PI) * 0.14, 0));
    // shake: arms flap; look: hang; crouch: swing back; jump: swing up and forward; land: out for balance
    const sh = t - EV.shake; if (sh > 0 && sh < 0.6) h.add(V(side * 0.12 * Math.exp(-sh * 5) * Math.abs(Math.sin(sh * 42)), 0.05 * Math.exp(-sh * 5), 0));
    const cr = ease.io(win(t, EV.crouch, EV.jump)); if (cr > 0) h.lerp(pToW([side * 0.5, TOR.y0 + 0.25, -0.42]), cr);
    if (t >= EV.jump - 0.02) { const k = ease.out(win(t, EV.jump - 0.02, EV.jump + 0.2)); h.lerp(pToW([side * 0.45, TOR.y0 + 1.05, 0.32]), k);
      const k2 = ease.io(win(t, EV.land - 0.1, EV.land + 0.25)); if (k2 > 0) h.lerp(pToW([side * 0.66, TOR.y0 + 0.42, 0.18]), k2);
      const k3 = ease.io(win(t, EV.settle, EV.settle + 0.6)); if (k3 > 0) h.lerp(pToW([side * 0.52, TOR.y0 + 0.12, 0.08]), k3); }
    hands.push(h);
  }
  return { hands, feet };
}
function placeRobot(t) {
  const o = pose(t);
  R.position.set(...o.r); R.rotation.set(0, o.yaw, 0);
  P.position.set(0, o.py, 0); P.rotation.set(o.tiltX, 0, o.tiltZ, 'YXZ');
  S.scale.set(1 / Math.sqrt(o.sq), o.sq, 1 / Math.sqrt(o.sq));
  const sc = (v) => [v[0] * S.scale.x, v[1] * S.scale.y, v[2] * S.scale.z];
  HEAD.position.set(...sc(NECK)); HEAD.rotation.set(o.headPitch, o.headYaw, 0, 'YXZ');
  R.updateMatrixWorld(true);
  const E = ends(t, o);
  ARMS.forEach((A, i) => reach(A, sc(A.base), E.hands[i], 0));
  LEGS.forEach((L, i) => { FEET[i].position.copy(R.worldToLocal(E.feet[i].clone())); FEET[i].rotation.set(0, 0, 0); FEET[i].updateMatrixWorld(true);
    reach(L, L.base, FEET[i].localToWorld(V(0, 0.09, 0.0)), 0); });
  drawEyes(o.eyes); EYELIGHT.intensity = 1.4 * o.eyes.on;
  LAMPMAT.color.setRGB(lerp(0.15, 3.2, o.lamp), lerp(0.06, 1.2, o.lamp), lerp(0.02, 0.2, o.lamp));
  // the leaves on it: riding along until the shake, then thrown, then lying where they fell
  for (const L of RLEAVES) {
    const dt = t - EV.shake;
    if (dt <= 0) { L.m.position.copy(P.localToWorld(V(...L.local))); L.m.quaternion.copy(P.getWorldQuaternion(_q)); L.m.rotateZ(L.spin[0] * 0.3); L.rest = L.m.position.toArray(); }
    else { const p0 = L.rest; let y = p0[1] + L.v[1] * dt - 4.9 * dt * dt * 0.6; const tl = Math.min(dt, 1.4);
      const x = p0[0] + L.v[0] * tl * 0.7, z = p0[2] + L.v[2] * tl * 0.7; y = Math.max(0.015, y + Math.sin(dt * 7 + L.v[0]) * 0.03 * Math.min(1, dt));
      L.m.position.set(x, y, z); if (y > 0.016) L.m.rotation.set(L.spin[0] * dt, L.spin[1] * dt, L.spin[2] * dt); else L.m.rotation.set(-Math.PI / 2, 0, L.spin[2]); }
  }
  return o;
}

// ------------------------------------------------------------------ the camera: low and close on the waking; a step back
// for the shake and the look; it cranes and follows the jump, and settles wide on the rock with the light behind
const CAMK = [
  { t: 0, pos: [0.35, 2.7, 1.6], at: [0.0, 0.26, -0.5], fov: 41 },        // high, from its feet: lying in the moss, face to the sky
  { t: 2.2, pos: [0.25, 2.0, 1.85], at: [0.0, 0.42, -0.3], fov: 43 },
  { t: 3.3, pos: [-0.6, 1.05, 2.95], at: [0.05, 0.8, 0.0], fov: 46 },      // square on as it stands
  { t: 5.5, pos: [-0.45, 1.15, 3.25], at: [0.3, 0.84, -0.2], fov: 46 },
  { t: 6.0, pos: [-0.2, 1.5, 3.7], at: [0.75, 1.55, -0.4], fov: 47 },      // up with it over the top
  { t: 6.45, pos: [-0.05, 1.55, 3.9], at: [1.0, 1.35, -0.5], fov: 47 },     // down with it onto the rock
  { t: 9.0, pos: [0.45, 1.55, 3.15], at: [1.35, 1.52, -0.65], fov: 45 },    // in on the rock, it below the caption
];
function cam(t) {
  let i = 0; while (i < CAMK.length - 2 && t > CAMK[i + 1].t) i++;
  const a = CAMK[i], b = CAMK[i + 1], k = ease.io(win(t, a.t, b.t));
  const drift = [Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.9 + 1) * 0.02, 0];
  const pos = lerp3(a.pos, b.pos, k).map((v, j) => v + drift[j]), at = lerp3(a.at, b.at, k);
  return { pos: V(...pos), at: V(...at), fov: lerp(a.fov, b.fov, k) };
}

// ------------------------------------------------------------------ captions (house style), the station bug
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['cap', EV.land + 0.15], ['end', DUR]];
const PL = CAP.plan(COPY, LANG, BEATS), T = PL.T, END = PL.end;   // the caption's hold lengthens the film
const EVENTS = { ...T, lang: LANG, ...EV, ...CAP.events(PL), quiet: [] };

const GRADE = { exposure: 1.0, contrast: 1.08, sat: 1.0, lift: [0.018, 0.03, 0.042], gain: [1.06, 1.0, 0.9], tint: [1, 1, 1], toe: 0.02,
  vignette: 0.42, grain: 0.04, threshold: 1.0, knee: 0.5, bloomA: 0.36, bloomB: 0.26, aberration: 0.0009 };
function frame(t, captions = true) {
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.filter = 'none';
  placeRobot(t);
  // dust drifts in the light (a pure function of t)
  DUST.seed.forEach(([x, y, z, ph], i) => { DUST.pos[i * 3] = x + Math.sin(t * 0.3 + ph) * 0.15; DUST.pos[i * 3 + 1] = y + Math.sin(t * 0.5 + ph * 2) * 0.1 + ((t * 0.04 + ph) % 0.4); DUST.pos[i * 3 + 2] = z + Math.cos(t * 0.25 + ph) * 0.12; });
  DUST.p.geometry.attributes.position.needsUpdate = true;
  RAYS.forEach((r, i) => { r.m.material.opacity = r.o * (0.85 + 0.15 * Math.sin(t * 0.8 + i * 1.7)); });
  const C = cam(t); camera.fov = C.fov; camera.position.copy(C.pos); camera.lookAt(C.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  // focus on the robot's head, wherever it is
  const focus = HEAD.getWorldPosition(_b).distanceTo(camera.position);
  post.render(scene, camera, { focus, aperture: 22, maxBlur: 26, radScale: 0.9, seed: Math.floor(t * 30), ...GRADE });
  g2d.drawImage(renderer.domElement, 0, 0);
  CAP.bug(g2d);
  if (captions) CAP.draw(g2d, PL, t, { busy: {} });
  return out2d;
}
window.__film = { fps: FPS, frames: Math.round(END * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, PL, { busy: {} }) },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
