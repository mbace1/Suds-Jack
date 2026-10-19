// WELCOME HOME — the film, v4 (18 Oct). The owner, on v3: "combining the 2 styles doesn't work, so all should use the
// claymation look at its finest. Closer to the previous claymation", with four frames from the real launch film, in order.
// So every picture is the plasticine set now (film-wh2.js, the stage the owner liked): no hoop, no title card, no inset
// window, no flat feed, no floating reactions. The display boots to "Pear AI. For the future." and then shows its pitch, in
// the room; the door camera is a SECOND clay set — a porch, a brick path, a Tudor house over the road — filmed live onto
// the display's glass, so the feed is clay too. Staged after the ad's own frames:
//   1 the display boots; pull back into the kitchen as the daughter crosses the foreground and dad looks round (frame 1)
//   2 over her brother's shoulder: her messages, and on "unlocks", locked to her face
//   3 the family round the display, lit by it (frames 4 and 3); cut to the display itself: Front Door, Live, the couple on
//     the path, and on "camera" she looks back into the lens (frame 2)
//   4 over the family's heads, the feed: on "family viewing", 4 WATCHING
// Slot 4, Tue 27 Oct 00:50. 1080×1920, 30 fps, the puppets on twos. film.html?lang=en|fi|ja

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh as mesh0, rng } from './lib/sculpt.js';
import { canvas, tex } from './lib/city.js';
import { Toko } from './lib/toko.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
{ const f = new FontFace('Inter', `url(${FONT_DIR}Inter-var.woff)`, { weight: '100 900' }); document.fonts.add(await f.load()); }
{ const f = new FontFace('IPAPGothic', `url(${FONT_DIR}IPAPGothic.ttf)`); document.fonts.add(await f.load()); }   // Japanese, a gothic
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9e2d6');
const camera = new THREE.PerspectiveCamera(46, W / H, 4, 3000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');
const mesh = (g, m, o = {}) => mesh0(g, m, { parent: scene, ...o });
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const nrm3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const V = (a) => new THREE.Vector3(...a);

// ------------------------------------------------------------------ clays (the series' plasticine: Genius and Deer's recipe)
const C = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffd8b8', rough: 0.68, bump: 1, lump: 0.04, lumpF: 0.45, thumb: 0.03, thumbCell: 2.2, ridge: 0.12, tool: 0.7, grain: 0.004, grainF: 8, mottle: 0.08, specks: 0.35, roughVar: 0.1, ...o });
const GLAZE = (color, o = {}) => C(color, { rough: 0.22, thumb: 0.012, thumbCell: 1.4, specks: 0.08, clearcoat: 1, clearcoatRough: 0.12, mottle: 0.08, ...o });
const HDR = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
/** a woven check painted on in object space (cm), so it rides with the puppet: broad bands of a, hairlines of b */
function check(mat, a, b, cell = 2.4, w = 0.2) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  const U = { uChkA: { value: new THREE.Color(a) }, uChkB: { value: new THREE.Color(b) }, uChkC: { value: cell }, uChkW: { value: w } };
  mat.customProgramCacheKey = () => key + '-check';
  mat.onBeforeCompile = (sh, r) => { prev(sh, r); Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uChkA, uChkB; uniform float uChkC, uChkW;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      { vec2 q = vec2(vOPos.x + vOPos.z * 0.8, vOPos.y) / uChkC + gnoise(vOPos * 0.6) * 0.06;
        vec2 d = abs(fract(q) - 0.5), e = abs(fract(q + 0.5) - 0.5);
        float band = smoothstep(uChkW + 0.05, uChkW, d.x) * 0.55 + smoothstep(uChkW + 0.05, uChkW, d.y) * 0.55;
        float line = max(smoothstep(0.045, 0.025, e.x), smoothstep(0.045, 0.025, e.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, uChkA, clamp(band, 0.0, 0.85));
        diffuseColor.rgb = mix(diffuseColor.rgb, uChkB, line * 0.75); }`);
  };
  return mat;
}
/** an open cardigan: the shirt underneath painted down the front (object space; +z is the puppet's front), with an
 *  optional block of colour across the chest (the sister's jersey number) */
function front(mat, col, accent = null, w = 1.9) {
  const prev = mat.onBeforeCompile, key = mat.customProgramCacheKey();
  const U = { uFrC: { value: new THREE.Color(col) }, uFrA: { value: new THREE.Color(accent || col) }, uFrW: { value: w }, uFrOn: { value: accent ? 1 : 0 } };
  mat.customProgramCacheKey = () => key + '-front';
  mat.onBeforeCompile = (sh, r) => { prev(sh, r); Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFrC, uFrA; uniform float uFrW, uFrOn;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      { vec3 nw = (vec4(normalize(vNormal), 0.0) * viewMatrix).xyz;
        vec3 no = normalize(vec3(dot(nw, normalize(vM0)), dot(nw, normalize(vM1)), dot(nw, normalize(vM2))));
        float wob = gnoise(vOPos * vec3(0.2, 0.9, 0.2)) * 0.45;
        float f = smoothstep(uFrW + 0.35, uFrW - 0.1, abs(vOPos.x + wob)) * smoothstep(0.1, 0.45, no.z);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFrC, f);
        float num = uFrOn * f * step(abs(vOPos.x), uFrW * 0.75) * smoothstep(28.2, 28.5, vOPos.y) * smoothstep(31.4, 31.1, vOPos.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, uFrA, num * 0.9); }`);
  };
  return mat;
}
const M = {
  wall: C('#efe7db', { thumb: 0.012, thumbCell: 7, mottle: 0.04, specks: 0.05, noBoil: true }), grout: C('#d8d0c4', { thumb: 0.01, thumbCell: 3 }),
  oak: C('#cfa676', { tool: 0.9, thumbCell: 2.2, mottle: 0.08 }), oakD: C('#b88d5d', { tool: 0.9, thumbCell: 2.2 }), oakL: C('#ddb98c', { tool: 0.9 }),
  plank: C('#c9a173', { tool: 1.0, thumbCell: 2.4, mottle: 0.1 }), plankB: C('#bd9365', { tool: 1.0, thumbCell: 2.4, mottle: 0.1 }),
  quartz: C('#f6f2ea', { rough: 0.32, thumb: 0.014, thumbCell: 3.5, specks: 0.3, speckColor: '#c4bcb0', clearcoat: 0.4, clearcoatRough: 0.25 }),
  sage: C('#9fb39a', { thumbCell: 3 }), sageD: C('#879c82', { thumbCell: 3 }),
  brass: C('#c9a35a', { rough: 0.3, metal: 0.75, thumb: 0.01, specks: 0, clearcoat: 0.3 }),
  cooktop: C('#141416', { rough: 0.15, thumb: 0.004, specks: 0, clearcoat: 1, clearcoatRough: 0.05 }),
  pan: C('#2a2a2d', { rough: 0.45, metal: 0.3, thumb: 0.015 }), toast: C('#d99a45', { thumbCell: 0.8, thumb: 0.05, tool: 0.6, mottle: 0.25 }), toastD: C('#b8742c', { thumbCell: 0.8, thumb: 0.05 }),
  enamel: GLAZE('#f4f1ea'), cup: GLAZE('#e9e4d8'), terracotta: C('#c97a52', { thumbCell: 1.6 }), jar: GLAZE('#dfe7e2'),
  lemon: C('#f0cf3c', { thumbCell: 0.7, thumb: 0.04, mottle: 0.1 }), leaf: C('#6f8f6a', { thumbCell: 1 }), leafB: C('#90a98a', { thumbCell: 1 }),
  board: C('#b07a48', { tool: 0.9 }), dark: C('#151517', { rough: 0.18, thumb: 0.006, specks: 0, clearcoat: 1, clearcoatRough: 0.06 }),
  cord: C('#f2efe9', { rough: 0.5, thumb: 0.01 }), hole: new THREE.MeshBasicMaterial({ color: '#0d0b0a' }),
  hall: C('#e9dcc8', { thumbCell: 6 }), garden: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.55, 1.62, 1.45) }),
  // the display, after the ad's frame 2: a cream squircle with a black glass face on a grey mesh puck
  devCream: C('#f4ede1', { rough: 0.4, thumb: 0.014, thumbCell: 2.2, specks: 0.08, clearcoat: 0.55, clearcoatRough: 0.24, mottle: 0.05 }),
  devGlass: C('#0b0b0d', { rough: 0.1, thumb: 0.004, specks: 0, clearcoat: 1, clearcoatRough: 0.04, mottle: 0 }),
  speaker: C('#a7a49e', { surf: 'felt', rough: 1, fibre: 0.09, fibreF: 3.4, mottle: 0.05 }), speakerCap: C('#cfcac1', { rough: 0.35, metal: 0.4, thumb: 0.01, specks: 0.1 }),
  // breakfast: the ad's French toast with berries, a can of cream, the mixing bowl and the eggs
  plate: GLAZE('#efe9de'), berry: C('#2a3366', { thumbCell: 0.5, thumb: 0.04, rough: 0.3, clearcoat: 0.7, clearcoatRough: 0.2, specks: 0.6, speckColor: '#c9d0ea' }),
  rasp: C('#c8323e', { thumbCell: 0.35, thumb: 0.08, rough: 0.45 }), sugar: C('#fbf8f2', { rough: 0.9, thumbCell: 0.4, thumb: 0.05 }),
  can: GLAZE('#f2f0ea'), canRed: GLAZE('#c8302c'), canBlue: GLAZE('#2b4a9a'),
  bowl: GLAZE('#e8dfcc'), batter: C('#e6c98a', { rough: 0.3, thumb: 0.02, clearcoat: 0.6, clearcoatRough: 0.2 }),
  egg: C('#c98a5a', { thumbCell: 0.9, thumb: 0.02, mottle: 0.15, specks: 0.5 }), carton: C('#cfc2a6', { surf: 'felt', rough: 1, fibre: 0.05 }),
  fork: C('#cfcdc6', { rough: 0.25, metal: 0.8, thumb: 0.006, specks: 0 }),
  // the front of the room, for the reverse shots: wall, door, hooks, a painting
  frontWall: C('#ece4d6', { thumb: 0.012, thumbCell: 7, mottle: 0.04, specks: 0.05, noBoil: true }), door: C('#d6cbb8', { tool: 0.6, thumbCell: 3 }),
  coat: C('#8b9478', { surf: 'felt', rough: 1, fibre: 0.07, fibreF: 2 }), tote: C('#d8c9a8', { surf: 'felt', rough: 1, fibre: 0.06 }), scarf: C('#c4553f', { surf: 'knit', knitW: 0.4, knitH: 0.3, rough: 1 }),
  dogBed: C('#3f4b4a', { surf: 'felt', rough: 1, fibre: 0.08 }), runner: C('#b85a3c', { surf: 'felt', rough: 1, fibre: 0.08, fibreF: 2 }),
};

// ------------------------------------------------------------------ the room (cm, puppet scale: Toko stands 46; floor y = 0; camera looks down −z)
const BACK = -120, CTOP = 22.5, FRONT = 36;
const V2 = ([x, y]) => new THREE.Vector2(x, y);
for (let i = -16; i <= 16; i++) mesh(lumpy(new RoundedBoxGeometry(9.6, 1, 340, 2, 0.35), 0.03, 0.3, 300 + i), i % 2 ? M.plank : M.plankB, { pos: [i * 9.8, -0.5, -40], cast: false });
{ const s = new THREE.Shape([[-200, -2], [200, -2], [200, 170], [-200, 170]].map(V2));
  s.holes.push(new THREE.Path([[-12, 30], [32, 30], [32, 68], [-12, 68]].map(V2)));     // the window
  s.holes.push(new THREE.Path([[-104, 0], [-80, 0], [-80, 53], [-104, 53]].map(V2)));    // the hall door
  const wall = mesh(lumpy(new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false, curveSegments: 2 }), 0.04, 0.25, 7), M.wall, { pos: [0, 0, BACK - 5] }); M.wall.shadowSide = THREE.DoubleSide; wall.castShadow = true; }
for (const [x, y, w, h] of [[-12.6, 49, 1.6, 40], [32.6, 49, 1.6, 40], [10, 68.8, 46, 1.6], [10, 29.4, 46, 1.6]]) mesh(new RoundedBoxGeometry(w, h, 6, 2, 0.5), M.wall, { pos: [x, y, BACK - 2.5] });
for (const [x, y, w, h] of [[10, 49, 1.4, 38], [10, 56, 44, 1.2]]) mesh(new RoundedBoxGeometry(w, h, 1.6, 2, 0.4), M.oakL, { pos: [x, y, BACK - 3.4] });
mesh(new RoundedBoxGeometry(48, 1.4, 7, 2, 0.5), M.quartz, { pos: [10, 29.6, BACK + 1.4] });
mesh(new THREE.PlaneGeometry(130, 90), M.garden, { pos: [10, 50, BACK - 60], cast: false });
{ const r = rng(5); for (let i = 0; i < 26; i++) mesh(lumpy(ball(5 + r() * 9, 1, 0.85, 0.5, 18), 0.25, 0.2, 40 + i), HDR(...new THREE.Color().setHSL(0.25 + r() * 0.07, 0.3 + r() * 0.15, 0.48 + r() * 0.16).multiplyScalar(1.25).toArray()), { pos: [-20 + r() * 64, 26 + r() * 30, BACK - 40 - r() * 10], cast: false }); }
mesh(new THREE.PlaneGeometry(60, 70), M.hall, { pos: [-92, 35, BACK - 40] });
mesh(new THREE.PlaneGeometry(40, 70).rotateY(Math.PI / 2), M.hall, { pos: [-108, 35, BACK - 20] });
mesh(new RoundedBoxGeometry(14, 0.4, 40, 2, 0.15), M.runner, { pos: [-92, 0.3, BACK - 20], cast: false });
for (const x of [-105.2, -78.8]) mesh(new RoundedBoxGeometry(2.4, 55, 6.4, 2, 0.6), M.oakL, { pos: [x, 27.5, BACK - 2.4] });
mesh(new RoundedBoxGeometry(28.8, 2.4, 6.4, 2, 0.6), M.oakL, { pos: [-92, 54.2, BACK - 2.4] });
// the back counter: oak lowers with brass pulls, a quartz top, the cooktop, zellige behind
const RUN = { x0: -68, x1: 70, d: 15 };
for (let x = RUN.x0; x < RUN.x1 - 1; x += 17.25) {
  mesh(lumpy(new RoundedBoxGeometry(16.6, CTOP - 3.4, 1.4, 2, 0.4), 0.03, 0.4, 400 + x), M.oak, { pos: [x + 8.6, (CTOP - 2.2) / 2 + 1.6, BACK + RUN.d - 0.6] });
  mesh(new RoundedBoxGeometry(7, 0.7, 0.9, 2, 0.3), M.brass, { pos: [x + 8.6, CTOP - 4.6, BACK + RUN.d + 0.6] });
}
mesh(new RoundedBoxGeometry(RUN.x1 - RUN.x0, 1.6, RUN.d - 1, 2, 0.5), M.oakD, { pos: [(RUN.x0 + RUN.x1) / 2, 0.8, BACK + RUN.d / 2 - 1] });
mesh(lumpy(new RoundedBoxGeometry(RUN.x1 - RUN.x0 + 2, 1.4, RUN.d + 1.4, 3, 0.5), 0.02, 0.3, 410), M.quartz, { pos: [(RUN.x0 + RUN.x1) / 2, CTOP - 0.7, BACK + RUN.d / 2 + 0.4] });
mesh(new RoundedBoxGeometry(24, 0.3, 11, 2, 0.12), M.cooktop, { pos: [48, CTOP + 0.15, BACK + 8] });
{ const TS = 2.6, rows = 11, cols = Math.round((RUN.x1 - RUN.x0) / TS), r = rng(17);
  mesh(new THREE.PlaneGeometry(RUN.x1 - RUN.x0, rows * TS), M.grout, { pos: [(RUN.x0 + RUN.x1) / 2, CTOP + rows * TS / 2, BACK + 0.05], cast: false });
  const geo = lumpy(new RoundedBoxGeometry(TS - 0.32, TS - 0.32, 0.55, 2, 0.22), 0.02, 2.5, 501);
  const inst = new THREE.InstancedMesh(geo, GLAZE('#ffffff'), rows * cols); inst.receiveShadow = true; inst.castShadow = false;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let n = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = RUN.x0 + TS / 2 + i * TS, y = CTOP + TS / 2 + j * TS;
    if (x > -13.5 && x < 33.5 && y > 28.5) continue;
    e.set((r() - 0.5) * 0.08, (r() - 0.5) * 0.08, (r() - 0.5) * 0.03); q.setFromEuler(e);
    m4.compose(new THREE.Vector3(x, y, BACK + 0.35 + r() * 0.15), q, new THREE.Vector3(1, 1, 1)); inst.setMatrixAt(n, m4);
    col.setHSL(0.11 + (r() - 0.5) * 0.06, 0.18 + r() * 0.22, 0.86 + r() * 0.09); inst.setColorAt(n, col); n++;
  }
  inst.count = n; scene.add(inst); }
for (const [x0, x1] of [[-62, -20], [40, 68]]) mesh(lumpy(new RoundedBoxGeometry(x1 - x0, 1.4, 7, 2, 0.4), 0.02, 0.5, 600 + x0), M.oak, { pos: [(x0 + x1) / 2, 60, BACK + 3.6] });
{ const r = rng(23);
  for (const x of [-58, -51, -44]) { const h = 6 + r() * 3; mesh(lumpy(new THREE.CylinderGeometry(2.4, 2.4, h, 20), 0.02, 1, 610 + x), M.jar, { pos: [x, 61.4 + h / 2, BACK + 3.6] }); }
  for (const x of [-34, -27]) mesh(lumpy(lathe([[0, 0], [2.1, 0], [2.4, 2.8], [2.5, 3.4], [0, 3.4]], 24), 0.02, 1, 620 + x), M.cup, { pos: [x, 60.7, BACK + 3.6] });
  for (const x of [46, 54]) mesh(lumpy(ball(3, 1, 0.5, 1, 20), 0.02, 1, 630 + x), M.cup, { pos: [x, 62, BACK + 3.6] });
}
function plant(x, y, z, s = 1, seed = 11, parent = scene) {
  mesh0(lumpy(new THREE.CylinderGeometry(3.6 * s, 2.8 * s, 6.5 * s, 24), 0.03, 1, 51 + seed), M.terracotta, { pos: [x, y + 3.25 * s, z], parent });
  const r = rng(seed);
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + r(), up = 8 + r() * 9, out = 3 + r() * 6;
    mesh0(lumpy(sausage([[x, y + 6 * s, z], [x + Math.cos(a) * out * 0.5 * s, y + (6 + up * 0.7) * s, z + Math.sin(a) * out * 0.5 * s], [x + Math.cos(a) * out * s, y + (6 + up) * s, z + Math.sin(a) * out * s]], [[1.2 * s, 0.32 * s], [2.0 * s, 0.38 * s], [0.4 * s, 0.2 * s]], { seg: 10, steps: 14, up: [Math.cos(a), 0, Math.sin(a)] }), 0.05, 1, 60 + i + seed), i % 2 ? M.leaf : M.leafB, { parent }); }
}
plant(62, 60.7, BACK + 3.6, 0.6, 13);
plant(-6, 29.9, BACK + 2, 0.45, 17);
mesh(lumpy(lathe([[0, 0], [7, 0], [7.8, 1.6], [7.9, 2.0], [0, 2.0]], 36), 0.01, 1, 700), M.pan, { pos: [44, CTOP + 0.4, BACK + 8] });
mesh(sausage([[51.5, CTOP + 1.9, BACK + 8], [61, CTOP + 2.6, BACK + 9.5]], [0.7, 0.6], { seg: 10, steps: 6 }), M.pan);
for (const [dx, dz, ry] of [[-2.6, -1.4, 0.3], [2.4, 1.6, -0.4]]) mesh(lumpy(new RoundedBoxGeometry(5.4, 0.9, 5.0, 2, 0.4), 0.06, 0.8, 710 + dx), M.toast, { pos: [44 + dx, CTOP + 1.3, BACK + 8 + dz], rot: [0, ry, 0] });
mesh(lumpy(lathe([[0, 0], [3.6, 0], [4, 3], [3.4, 6.6], [1.2, 7.6], [0, 7.6]], 32), 0.02, 1, 720), M.enamel, { pos: [-40, CTOP, BACK + 7] });
mesh(sausage([[-37.4, CTOP + 6.2, BACK + 7], [-35, CTOP + 7.2, BACK + 7], [-33.6, CTOP + 3.8, BACK + 7]], [0.45, 0.45, 0.45], { seg: 8, steps: 12 }), M.dark);

// the island: sage panels, a quartz top, a hole drilled through it for the display's cord
const ISL = { x: 0, z: -48, w: 76, d: 26 };
mesh(lumpy(new RoundedBoxGeometry(ISL.w - 3, CTOP - 1.4, ISL.d - 3, 3, 0.8), 0.03, 0.3, 81), M.sage, { pos: [ISL.x, (CTOP - 1.4) / 2, ISL.z] });
for (const zs of [1, -1]) for (let i = -4; i <= 4; i++) mesh(new RoundedBoxGeometry(0.45, CTOP - 5, 0.5, 1, 0.15), M.sageD, { pos: [i * 8.2, (CTOP - 1.4) / 2, ISL.z + zs * (ISL.d / 2 - 1.4)] });
mesh(lumpy(new RoundedBoxGeometry(ISL.w, 1.6, ISL.d, 4, 0.7), 0.02, 0.3, 82), M.quartz, { pos: [ISL.x, CTOP - 0.8, ISL.z] });
const HOLE = [19.5, CTOP + 0.02, -47.5];
mesh(new THREE.CircleGeometry(0.9, 24).rotateX(-Math.PI / 2), M.hole, { pos: HOLE, cast: false });
// on the island: the lemons, two cups, the mixing bowl and the eggs, and breakfast — French toast, berries, the cream can
{ const r = rng(3);
  mesh(lumpy(lathe([[0, 0], [3.2, 0], [5.6, 2.2], [6, 3.0], [0, 3.0]], 36), 0.02, 1, 90), M.cup, { pos: [-30, CTOP, -42] });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(lumpy(ball(1.7, 1, 0.86, 1.16, 22), 0.06, 0.9, 91 + i), M.lemon, { pos: [-30 + Math.cos(a) * 2.6, CTOP + 3.4 + r() * 0.6, -42 + Math.sin(a) * 2.6], rot: [r(), r(), r()] }); }
  for (const [x, z] of [[2, -40], [-6, -38.5]]) mesh(lumpy(lathe([[0, 0], [1.6, 0], [1.9, 2.4], [2.0, 3.0], [0, 3.0]], 24), 0.02, 1, 100 + x), M.cup, { pos: [x, CTOP, z] });
  // the mixing bowl, batter in it, a whisk; the egg box, half the eggs gone
  mesh(lumpy(lathe([[0, 0], [2.8, 0], [5.2, 1.6], [6.3, 4.2], [6.5, 4.8], [6.0, 4.8], [5.0, 2.2], [0, 1.0]], 40), 0.02, 1, 120), M.bowl, { pos: [3, CTOP, -55] });
  mesh(new THREE.CircleGeometry(5.0, 32).rotateX(-Math.PI / 2), M.batter, { pos: [3, CTOP + 3.6, -55], cast: false });
  mesh(sausage([[4, CTOP + 3.4, -55], [8, CTOP + 8.6, -56.5]], [0.3, 0.3], { seg: 8, steps: 6 }), M.fork);
  mesh(lumpy(new RoundedBoxGeometry(9, 1.6, 4.4, 2, 0.4), 0.05, 0.6, 121), M.carton, { pos: [-16, CTOP + 0.8, -57], rot: [0, 0.2, 0] });
  for (let i = 0; i < 3; i++) mesh(lumpy(ball(1.0, 1, 1.3, 1, 16), 0.03, 1, 122 + i), M.egg, { pos: [-18.6 + i * 2.6 * Math.cos(0.2), CTOP + 2.1, -56.2 - i * 2.6 * Math.sin(0.2)] });
  // breakfast on the family's side: a plate of French toast with blueberries, raspberries and sugar; the cream can on its side
  const PX = 25, PZ = -40;
  mesh(lumpy(lathe([[0, 0], [4.6, 0], [6.6, 0.7], [7.0, 1.0], [0, 0.55]], 40), 0.02, 1, 130), M.plate, { pos: [PX, CTOP, PZ] });
  for (const [dx, dz, ry, h] of [[-1.6, -0.6, 0.4, 0], [1.4, 0.8, -0.3, 0.9], [-0.2, 1.8, 1.1, 1.8]]) mesh(lumpy(new RoundedBoxGeometry(4.6, 0.9, 4.2, 2, 0.4), 0.08, 0.8, 131 + dx), M.toast, { pos: [PX + dx, CTOP + 1.2 + h, PZ + dz], rot: [0.06, ry, -0.05] });
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = 1 + r() * 4.5; mesh(lumpy(ball(0.55, 1, 0.92, 1, 14), 0.03, 1, 140 + i), i % 3 ? M.berry : M.rasp, { pos: [PX + Math.cos(a) * d, CTOP + 3.4 + r() * 0.6, PZ + Math.sin(a) * d] }); }
  for (let i = 0; i < 26; i++) mesh(ball(0.12, 1, 1, 1, 6), M.sugar, { pos: [PX - 4 + r() * 9, CTOP + 3.9 + r() * 0.4, PZ - 3 + r() * 6], cast: false });
  const can = new THREE.Group(); can.position.set(17, CTOP + 1.55, -55); can.rotation.set(0, 0.9, Math.PI / 2); scene.add(can);
  mesh0(lumpy(new THREE.CylinderGeometry(1.5, 1.5, 9, 28), 0.01, 1, 150), M.can, { parent: can });
  for (const [y, m] of [[-2.8, M.canRed], [-1.4, M.canBlue], [1.2, M.canRed]]) mesh0(new THREE.CylinderGeometry(1.53, 1.53, 0.8, 28), m, { pos: [0, y, 0], parent: can });
  mesh0(lumpy(lathe([[1.5, 0], [1.2, 1.0], [0.55, 1.6], [0.5, 2.6], [0.8, 3.4], [0, 3.6]], 24), 0.01, 1, 151), M.can, { pos: [0, 4.5, 0], parent: can });
}
// the fork the other sister eats from in shot 3, and dad's bite of toast — carried on their hands
const FORK = new THREE.Group(); scene.add(FORK);
mesh0(sausage([[0, -2.6, 0], [0, 2.4, 0.2]], [0.28, 0.22], { seg: 8, steps: 6 }), M.fork, { parent: FORK });
for (const x of [-0.35, 0, 0.35]) mesh0(sausage([[x, 2.4, 0.2], [x, 3.8, 0.35]], [0.09, 0.07], { seg: 6, steps: 4 }), M.fork, { parent: FORK, cast: false });
mesh0(lumpy(new RoundedBoxGeometry(1.8, 1.4, 1.2, 2, 0.35), 0.08, 1, 160), M.toast, { pos: [0, 4.0, 0.3], parent: FORK });
const BITE = mesh(lumpy(new RoundedBoxGeometry(2.0, 0.8, 1.8, 2, 0.35), 0.08, 1, 161), M.toast);
// two pendants over the island
const BULBS = [], SHADE = C('#c9a35a', { rough: 0.3, metal: 0.75, thumb: 0.01, specks: 0, clearcoat: 0.3, side: THREE.DoubleSide });
for (const x of [-17, 17]) {
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 90, 6), M.dark, { pos: [x, 123, ISL.z], cast: false });
  mesh(lumpy(lathe([[7.5, 0], [7.2, 1.6], [5.5, 4.6], [2.2, 6.8], [0.8, 7.4], [0, 7.4]], 40), 0.01, 1, 800 + x), SHADE, { pos: [x, 70.5, ISL.z] });
  mesh(ball(1.7, 1, 1, 1, 16), HDR(2.6, 2.0, 1.3), { pos: [x, 70.2, ISL.z], cast: false });
  const l = new THREE.PointLight('#ffd6a0', 260, 80, 2); l.position.set(x, 68.5, ISL.z); scene.add(l); BULBS.push(l);
}
// the front of the room (for the reverse shots): the front door, coat hooks, a painting, the dog's bed
{ const s = new THREE.Shape([[-200, -2], [200, -2], [200, 170], [-200, 170]].map(V2));
  s.holes.push(new THREE.Path([[-16, 0], [12, 0], [12, 58], [-16, 58]].map(V2)));
  mesh(lumpy(new THREE.ExtrudeGeometry(s, { depth: 5, bevelEnabled: false, curveSegments: 2 }), 0.04, 0.25, 8), M.frontWall, { pos: [0, 0, FRONT] });
  mesh(lumpy(new RoundedBoxGeometry(28, 58, 2.4, 2, 0.5), 0.03, 0.4, 170), M.door, { pos: [-2, 29, FRONT + 2.4] });
  for (const [x, y, w, h] of [[-8.5, 41, 10, 22], [4.5, 41, 10, 22], [-8.5, 14, 10, 20], [4.5, 14, 10, 20]]) mesh(new RoundedBoxGeometry(w, h, 0.8, 2, 0.3), M.door, { pos: [x, y, FRONT + 0.9] });
  mesh(ball(1.0, 1, 1, 0.8, 14), M.brass, { pos: [9, 28, FRONT + 0.6] });
  for (const x of [-17.4, 13.4]) mesh(new RoundedBoxGeometry(2.6, 60, 1.6, 2, 0.5), M.oakL, { pos: [x, 30, FRONT - 0.4] });
  mesh(new RoundedBoxGeometry(33.4, 2.6, 1.6, 2, 0.5), M.oakL, { pos: [-2, 59.6, FRONT - 0.4] });
  // hooks: an olive coat, a tote, a scarf
  mesh(new RoundedBoxGeometry(26, 1.6, 1.2, 2, 0.4), M.oak, { pos: [32, 47, FRONT - 0.6] });
  mesh(lumpy(sausage([[26, 46, FRONT - 2], [25, 38, FRONT - 3.6], [26, 22, FRONT - 3.4]], [[2.2, 1.2], [5.2, 2.4], [5.6, 2.2]], { up: [0, 0, 1], steps: 30 }), 0.2, 0.5, 171), M.coat);
  mesh(lumpy(sausage([[36, 46, FRONT - 1.6], [36.5, 36, FRONT - 2.6]], [[3.2, 1.0], [4.0, 1.4]], { up: [0, 0, 1] }), 0.15, 0.6, 172), M.tote);
  mesh(lumpy(sausage([[42, 46, FRONT - 1.4], [41.5, 37, FRONT - 2], [42.4, 30, FRONT - 1.8]], [0.9, 1.0, 0.9], { steps: 20 }), 0.1, 0.8, 173), M.scarf);
  // the painting: leaf shapes on pink and gold, after the one by the door in frame 1
  const pc = canvas(256, 320), g = pc.getContext('2d'); g.fillStyle = '#e8b7a0'; g.fillRect(0, 0, 256, 320);
  for (const [x, y, r, c] of [[80, 90, 70, '#7c8f4e'], [180, 110, 64, '#c98a2e'], [90, 220, 66, '#c98a2e'], [176, 230, 70, '#7c8f4e']]) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * 0.42, (x > 128 ? -1 : 1) * 0.7, 0, TAU); g.fill(); }
  g.strokeStyle = '#3e3424'; g.lineWidth = 6; g.beginPath(); g.moveTo(128, 30); g.lineTo(128, 290); g.stroke();
  mesh(new RoundedBoxGeometry(17, 21, 1.4, 2, 0.4), M.oakD, { pos: [-36, 46, FRONT - 0.8] });
  mesh(new THREE.PlaneGeometry(14, 18).rotateY(Math.PI), new THREE.MeshStandardMaterial({ map: tex(pc), roughness: 0.9 }), { pos: [-36, 46, FRONT - 1.6], cast: false });
  mesh(lumpy(new RoundedBoxGeometry(24, 4, 16, 3, 1.8), 0.2, 0.4, 174), M.dogBed, { pos: [-40, 2, FRONT - 12] });
}

// ------------------------------------------------------------------ the display: a cream squircle on a grey mesh puck, its cord down the hole
function squircle(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.bezierCurveTo(x + w - r * 0.3, y, x + w, y + r * 0.3, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.bezierCurveTo(x + w, y + h - r * 0.3, x + w - r * 0.3, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.bezierCurveTo(x + r * 0.3, y + h, x, y + h - r * 0.3, x, y + h - r);
  s.lineTo(x, y + r); s.bezierCurveTo(x, y + r * 0.3, x + r * 0.3, y, x + r, y); return s; }
function glass(w, h, r) { const g = new THREE.ShapeGeometry(squircle(w, h, r), 16), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h + 0.5); return g; }
const DEV = new THREE.Group(); scene.add(DEV); DEV.position.set(14, CTOP, -45); DEV.scale.setScalar(0.4);
mesh0(lumpy(lathe([[0, 0], [6.0, 0], [6.4, 0.5], [6.5, 4], [6.4, 7.5], [6.1, 8.0], [0, 8.0]], 48), 0.03, 0.5, 101), M.speaker, { pos: [0, 0, -1.2], parent: DEV });
mesh0(lumpy(new THREE.TorusGeometry(6.15, 0.32, 10, 48).rotateX(Math.PI / 2), 0.01, 1, 102), M.speakerCap, { pos: [0, 7.95, -1.2], parent: DEV });
mesh0(new THREE.CircleGeometry(6.0, 40).rotateX(-Math.PI / 2), M.speakerCap, { pos: [0, 8.0, -1.2], parent: DEV, cast: false });
mesh0(lumpy(new THREE.CylinderGeometry(2.4, 2.8, 6, 24), 0.02, 1, 103), M.devCream, { pos: [0, 10.5, -1.8], parent: DEV });
const SCR = new THREE.Group(); SCR.position.set(0, 19.4, 0.6); SCR.rotation.x = -0.09; DEV.add(SCR);
{ const b = new THREE.ExtrudeGeometry(squircle(24, 21, 6.4), { depth: 2.0, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelSegments: 5, curveSegments: 16 }); b.translate(0, 0, -1.0);
  mesh0(lumpy(b, 0.05, 0.35, 104), M.devCream, { parent: SCR }); }
mesh0(glass(22.6, 19.6, 5.9), M.devGlass, { pos: [0, 0, 1.73], parent: SCR, cast: false });
const UW = 880, UH = 758;
const uiCan = canvas(UW, UH), ui = uiCan.getContext('2d'), uiTex = tex(uiCan);
// the door camera's picture arrives as a render target and meets the UI on the glass: barrel-bent like the real lens,
// UI over it, a soft reflection across the glass
const feedRT = new THREE.WebGLRenderTarget(UW, UH, { type: THREE.HalfFloatType, samples: 4 });
const DISP = new THREE.ShaderMaterial({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
  uniforms: { tUI: { value: uiTex }, tFeed: { value: feedRT.texture }, uFeed: { value: 0 }, uK: { value: 0.42 }, uBright: { value: 1.0 }, uAsp: { value: UW / UH } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tUI, tFeed; uniform float uFeed, uK, uBright, uAsp; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5; float r2 = c.x * c.x * uAsp * uAsp + c.y * c.y, rm = 0.25 * uAsp * uAsp + 0.25;
      vec3 col = texture2D(tFeed, 0.5 + c * (1.0 + uK * r2) / (1.0 + uK * rm)).rgb * uFeed;
      vec4 u = texture2D(tUI, vUv);
      col = mix(col, u.rgb, u.a) * uBright;
      float band = smoothstep(0.16, 0.0, abs(vUv.x * 0.55 - vUv.y * 0.9 + 0.62));
      col += vec3(0.03, 0.031, 0.034) * band;
      float e = min(min(vUv.x, 1.0 - vUv.x) * uAsp, min(vUv.y, 1.0 - vUv.y));
      col *= 0.8 + 0.2 * smoothstep(0.0, 0.07, e);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
mesh0(glass(21.6, 18.6, 5.3), DISP, { pos: [0, 0, 1.98], parent: SCR, cast: false });
mesh0(ball(0.28, 1, 1, 0.4, 12), M.dark, { pos: [0, 9.25, 1.9], parent: SCR, cast: false });
const screenLight = new THREE.PointLight('#ffc6d6', 40, 50, 2); scene.add(screenLight);
DEV.rotation.y = -0.18; scene.updateMatrixWorld(true);
{ const a = DEV.localToWorld(new THREE.Vector3(0, 0.6, -7.4)).toArray();
  const pts = [a, add3(a, [0.6, -0.2, -0.8]), add3(HOLE, [-0.4, 0.15, 0.4]), add3(HOLE, [0, -0.6, 0]), add3(HOLE, [0, -3, 0])].map(V);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.22, 10), M.cord); }
const SC = () => SCR.localToWorld(new THREE.Vector3(0, 0, 2.0));                            // the screen's centre, world
const SN = () => SCR.localToWorld(new THREE.Vector3(0, 0, 2.8)).sub(SC()).normalize();      // and the way it faces

/** Pear's mark: a plain pear silhouette with a leaf (the station's name for the company; never the real logo) */
function pearMark(g, x, y, r, col, leaf = col) {
  g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.45, -r, r * 0.5, -r * 0.35, r * 0.75, 0); g.bezierCurveTo(r * 1.1, r * 0.6, r * 0.7, r * 1.05, 0, r * 1.05);
  g.bezierCurveTo(-r * 0.7, r * 1.05, -r * 1.1, r * 0.6, -r * 0.75, 0); g.bezierCurveTo(-r * 0.5, -r * 0.35, -r * 0.45, -r, 0, -r); g.fill();
  g.fillStyle = leaf; g.beginPath(); g.ellipse(r * 0.35, -r * 1.2, r * 0.32, r * 0.14, -0.6, 0, Math.PI * 2); g.fill(); g.restore();
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const ease = { out: (k) => 1 - Math.pow(1 - clamp(k), 3), io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  back: (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
const blobs = (g, list) => { for (const [x, y, r, c] of list) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},.95)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(0, 0, UW, UH); } };
/** the screen. 'boot' (k = how far it has woken): Pear AI, For the future. 'flow': the pitch, Private by design.
 *  'msgs' (k = 0 her messages → 1 locked): the brother's try. 'door' (k = the WATCHING pill): the camera's chrome only —
 *  the clay feed shows through where the canvas is clear */
function drawUI(mode, k = 1, dim = 0, lk = 0) {
  const g = ui, w = UW, h = UH; g.save(); g.clearRect(0, 0, w, h); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  if (mode === 'boot') {
    g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, w, h); blobs(g, [[440, 300, 460, '176,214,120'], [120, 720, 420, '246,196,150'], [800, 60, 360, '214,232,170'], [780, 700, 300, '240,170,160']]);
    const a = ease.out(k / 0.5), s = ease.back(k / 0.6);
    g.globalAlpha = a; g.save(); g.translate(w / 2, 250); g.scale(0.7 + 0.3 * s, 0.7 + 0.3 * s); pearMark(g, 0, 0, 74, '#5f8f3a', '#3f6e2a'); g.restore();
    const b = ease.out((k - 0.2) / 0.4); g.globalAlpha = b; g.textAlign = 'center'; g.fillStyle = '#1f2419'; g.font = '700 118px Inter'; g.fillText('Pear AI', w / 2, 488 + (1 - b) * 20);
    const c = ease.out((k - 0.4) / 0.4); g.globalAlpha = c; g.fillStyle = '#5a6150'; g.font = '500 56px Inter'; g.fillText('For the future.', w / 2, 572 + (1 - c) * 16);
  } else if (mode === 'flow' || mode === 'msgs') {
    g.fillStyle = '#e99a9a'; g.fillRect(0, 0, w, h); blobs(g, [[180, 180, 380, '250,140,120'], [660, 250, 400, '236,110,170'], [460, 690, 440, '130,120,236'], [800, 680, 320, '250,190,140']]);
    if (mode === 'flow') {
      g.shadowColor = 'rgba(80,20,40,.35)'; g.shadowBlur = 18; g.fillStyle = 'rgba(255,255,255,.98)'; g.font = '300 110px Inter'; g.fillText('7:42', 58, 150);
      g.font = '700 92px Inter'; g.fillText('Private', 60, 388); g.fillText('by design.', 60, 492);
      pearMark(g, 790, 80, 36, 'rgba(255,255,255,.96)'); g.font = '600 34px Inter'; g.textAlign = 'right'; g.fillText('HomeView', 834, 168);
    } else {
      // her messages: the card with her mask's colour on it; on "unlocks", the lock
      g.fillStyle = 'rgba(255,255,255,.93)'; g.beginPath(); g.roundRect(56, 56, 768, 640, 40); g.fill();
      g.fillStyle = '#f0027f'; g.beginPath(); g.arc(136, 140, 44, 0, TAU); g.fill();
      g.strokeStyle = '#fff8f0'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.arc(136, 152, 18, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = '#1d1b1f'; g.font = '700 56px Inter'; g.fillText('Messages', 204, 160);
      g.filter = 'blur(10px)'; g.fillStyle = '#7a7480'; for (let j = 0; j < 4; j++) { g.beginPath(); g.roundRect(100 + (j % 2) * 240, 236 + j * 106, 440 - (j % 2) * 120, 66, 33); g.fill(); } g.filter = 'none';
      if (k > 0) { const s = ease.back(k / 0.6);
        g.save(); g.translate(440, 440); g.scale(s, s);
        g.fillStyle = 'rgba(30,26,34,.94)'; g.beginPath(); g.roundRect(-370, -150, 740, 300, 48); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.arc(-250, -26, 40, Math.PI, 0); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-306, -24, 112, 96, 16); g.fill();
        const tx = P.ui.locked || 'Locked · not your face'; let fs = 50; g.font = `600 ${fs}px Inter`; while (g.measureText(tx).width > 470 && fs > 30) { fs -= 2; g.font = `600 ${fs}px Inter`; }
        g.textBaseline = 'middle'; g.fillText(tx, -160, 10); g.restore(); }
    }
  } else if (mode === 'door') {
    // the camera's chrome, after the ad's frame 2: the name and Live up top, end call, mic and the grid along the bottom
    const top = g.createLinearGradient(0, 0, 0, 220); top.addColorStop(0, 'rgba(0,0,0,.42)'); top.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = top; g.fillRect(0, 0, w, 220);
    g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 14; g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '600 50px Inter'; g.fillText(P.ui.door || 'Front Door', w / 2, 92);
    g.fillStyle = '#fff'; g.font = '600 38px Inter'; g.fillText('Live', w / 2, 142); g.restore();
    const by = h - 112;
    g.fillStyle = '#e5392f'; g.beginPath(); g.arc(150, by, 64, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(126, by - 24); g.lineTo(174, by + 24); g.moveTo(174, by - 24); g.lineTo(126, by + 24); g.stroke();
    g.fillStyle = '#f5d117'; g.beginPath(); g.arc(w / 2, by, 64, 0, TAU); g.fill(); g.fillStyle = '#1d1b1f'; g.beginPath(); g.roundRect(w / 2 - 13, by - 34, 26, 44, 13); g.fill();
    g.strokeStyle = '#1d1b1f'; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, by - 2, 22, 0.15, Math.PI - 0.15); g.moveTo(w / 2, by + 20); g.lineTo(w / 2, by + 32); g.moveTo(w / 2 - 14, by + 32); g.lineTo(w / 2 + 14, by + 32); g.stroke();
    g.fillStyle = 'rgba(120,120,126,.75)'; g.beginPath(); g.arc(w - 150, by, 64, 0, TAU); g.fill(); g.fillStyle = '#fff';
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.roundRect(w - 150 + dx * 15 - 12, by + dy * 15 - 12, 24, 24, 6); g.fill(); }
    if (k > 0) { // the station's pill: who is watching her go — four masks, the family's colours
      const s = ease.back(k / 0.45), tx = P.ui.watching || '4 WATCHING';
      g.save(); g.translate(w / 2, 222); g.scale(s, s); g.font = '800 46px Inter'; const tw = g.measureText(tx).width, pw = tw + 230;
      g.fillStyle = 'rgba(20,18,22,.86)'; g.beginPath(); g.roundRect(-pw / 2, -44, pw, 88, 44); g.fill();
      ['#2fa84f', '#3d6fd8', '#ff7414', '#ffc800'].forEach((c, i) => { const a = ease.back((k - 0.25 - i * 0.12) / 0.3); if (a <= 0) return;
        g.save(); g.translate(-pw / 2 + 52 + i * 34, 0); g.scale(a, a); g.fillStyle = c; g.strokeStyle = 'rgba(20,18,22,1)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 25, 0, TAU); g.fill(); g.stroke(); g.restore(); });
      g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(tx, -pw / 2 + 200, 3); g.restore();
    }
    if (lk > 0) { // her messages, still locked, in the corner of the same screen: the punchline's other half
      const s = ease.back(lk / 0.5), mx = P.ui.msgs || 'Messages', lx = P.ui.lockedShort || 'Locked';
      g.save(); g.translate(40, 290); g.scale(s, s); g.font = '700 40px Inter'; const cw = Math.max(g.measureText(mx).width, (g.font = '600 34px Inter', g.measureText(lx).width)) + 210;
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.roundRect(0, 0, cw, 132, 30); g.fill();
      g.fillStyle = '#f0027f'; g.beginPath(); g.arc(62, 66, 34, 0, TAU); g.fill(); g.strokeStyle = '#fff8f0'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(62, 75, 14, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = '#1d1b1f'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '700 40px Inter'; g.fillText(mx, 116, 58);
      g.strokeStyle = '#1d1b1f'; g.lineWidth = 6; g.beginPath(); g.arc(132, 86, 11, Math.PI, 0); g.stroke(); g.fillRect(117, 86, 30, 24);
      g.fillStyle = '#5a5560'; g.font = '600 34px Inter'; g.fillText(lx, 158, 108); g.restore();
    }
  }
  if (dim > 0) { g.globalAlpha = 1; g.fillStyle = `rgba(0,0,0,${dim})`; g.fillRect(0, 0, w, h); }
  g.restore(); uiTex.needsUpdate = true;
}

// ------------------------------------------------------------------ the family and the boyfriend: masked Tokos, one carrier colour each, dressed after the ad
function dress(o) {
  const knit = (c) => C(c, { surf: 'knit', knitW: 0.5, knitH: 0.4, rough: 1, mottle: 0.06 });
  const cloth = (c) => C(c, { thumbCell: 1.6, thumb: 0.035, tool: 1.0, mottle: 0.06 });
  const top = o.knit ? knit(o.top) : cloth(o.top);
  if (o.check) check(top, ...o.check);
  const arms = o.front ? (o.knit ? knit(o.top) : cloth(o.top)) : top;
  if (o.front) front(top, ...o.front);
  return { hoodie: top, hoodie2: top, arms, cuff: arms, jeans: C(o.legs, { thumbCell: 1.8, tool: 0.7 }), shoes: C(o.shoe, { rough: 0.45 }), sole: C(o.sole ?? '#e8e1d2', { thumb: 0.02 }),
    glove: C(o.mask, { thumbCell: 1.2, thumb: 0.03, specks: 0.2 }), hair: C(o.hair, { tool: 1.3, thumbCell: 0.9, thumb: 0.045 }),
    maskDisc: C(o.mask, { rough: 0.5, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2 }), maskInk: C('#fff8f0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9 }),
    strap: C('#2a2523', { thumb: 0.01, rough: 0.5 }), string: C('#f4efe4'), aglet: C('#cfc6b4'),
    pack: o.pack ? C(o.pack, { surf: 'felt', rough: 1, fibre: 0.06, fibreF: 2.4, mottle: 0.06 }) : null, packStrap: C('#3a3532', { thumb: 0.01 }),
    skirt: o.skirt ? check(C(o.skirt[0], { surf: 'felt', rough: 1, fibre: 0.05, mottle: 0.05 }), o.skirt[1], o.skirt[2], 1.5, 0.16) : null };
}
const WARD = {
  dad: { m: dress({ mask: '#2fa84f', top: '#c66a33', check: ['#2f5a46', '#ead7a8'], legs: '#3b4f78', hair: '#2b221c', shoe: '#5a4030' }), s: 1.0, curls: true },
  mum: { m: dress({ mask: '#3d6fd8', top: '#c6dbec', legs: '#e3d8c4', hair: '#d9b46a', shoe: '#f4f1ea' }), s: 0.96, bun: true },
  son: { m: dress({ mask: '#ff7414', top: '#6f6b3c', knit: true, legs: '#3a3f4a', hair: '#c2a173', shoe: '#f4f1ea' }), s: 0.86, hood: true, tufts: true },
  sis: { m: dress({ mask: '#ffc800', top: '#6e4a2c', knit: true, front: ['#f1ede4', '#2f56b8'], legs: '#3d3a36', hair: '#3a2a20', shoe: '#2c2a2e' }), s: 0.9, bangs: true, long: 0.55 },
  girl: { m: dress({ mask: '#f0027f', top: '#ecbcc7', knit: true, front: ['#f6f1e8'], legs: '#2a2628', hair: '#2a1f18', shoe: '#1c1a1c', pack: '#ece5d4', skirt: ['#6c6a70', '#1f1e22', '#eeeae4'] }), s: 0.88, long: 1.0, pack: true, skirt: true },
  boy: { m: dress({ mask: '#9a9a9a', top: '#c8a678', legs: '#9da38c', hair: '#3b2a20', shoe: '#f4f1ea', pack: '#6c6d5e' }), s: 0.95, curls: true, pack: true },
};
function build(k, parent, seed = 0) {
  const d = WARD[k], m = d.m, tk = new Toko(m), wrap = new THREE.Group(); wrap.add(tk.group); parent.add(wrap); wrap.scale.setScalar(d.s);
  tk.parts.armL.material = tk.parts.armR.material = m.arms;
  tk.hood.visible = !!d.hood; tk.pocket.visible = !!d.hood;
  const hd = tk.head, hm = m.hair, r = rng(31 + seed);
  hd.children[4].visible = !!d.bun;                                                  // the bun: mum's alone
  if (d.bangs) for (let i = 0; i < 7; i++) { const x = -3.0 + i;                    // a fringe down to the top of the mask
    mesh0(lumpy(sausage([[x * 0.8, 4.5, 0.4], [x * 0.95, 4.35, 3.0], [x * 1.02, 3.65, 4.25]], [0.8, 0.66, 0.42], { up: [0, 0, 1], steps: 18 }), 0.05, 1, 300 + i), hm, { parent: hd }); }
  if (d.long) { const L = d.long * 9;                                                 // hair to the shoulders, or past them
    for (const s of [-1, 1]) for (const z of [-0.6, -2.2]) mesh0(lumpy(sausage([[s * 3.9, 1.6, z], [s * 4.6, -3, z - 0.9], [s * 4.4, -L, z - 1.4]], [1.2, 1.35, 0.85], { steps: 22 }), 0.08, 0.9, 310 + s * 3 + z), hm, { parent: hd });
    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) mesh0(lumpy(sausage([[x, 1.8, -3.4], [x * 1.12, -3.2, -4.6], [x * 1.05, -L - 0.6, -4.3]], [1.3, 1.45, 0.95], { steps: 22 }), 0.08, 0.9, 320 + x), hm, { parent: hd }); }
  if (d.curls) for (let i = 0; i < 34; i++) { const a = r() * TAU, e = -0.05 + r() * 1.45;     // a mop of curls
    const p = [Math.cos(a) * Math.cos(e) * 4.5, Math.sin(e) * 4.7 + 0.7, Math.sin(a) * Math.cos(e) * 4.0 - 0.5]; if (p[2] > 1.2 && p[1] < 3.8) continue;
    mesh0(lumpy(ball(1.2 + r() * 0.55, 1, 1, 1, 14), 0.14, 1, 400 + i + seed), hm, { pos: p, parent: hd }); }
  if (d.tufts) for (let i = 0; i < 11; i++) { const a = -1.3 + i * 0.26 + (r() - 0.5) * 0.2, e = 0.75 + r() * 0.5;   // blond and pushed forward
    const b = [Math.sin(a) * Math.cos(e) * 4.2, Math.sin(e) * 4.6 + 0.4, Math.cos(a) * Math.cos(e) * 3.2 - 0.4], o = nrm3([b[0], b[1] + 2, b[2] + 2.6]);
    mesh0(lumpy(sausage([b, add3(b, [o[0] * 1.4, o[1] * 1.4, o[2] * 1.4]), add3(b, [o[0] * 2.6, o[1] * 2.2 - 0.4, o[2] * 2.6])], [1.0, 0.7, 0.18], { steps: 12 }), 0.04, 1, 420 + i), hm, { parent: hd }); }
  let pack = null;
  if (d.pack) { pack = new THREE.Group(); tk.group.add(pack);
    mesh0(lumpy(new RoundedBoxGeometry(8.4, 9.8, 4.0, 3, 1.6), 0.16, 0.5, 600 + seed), m.pack, { parent: pack });
    mesh0(lumpy(new RoundedBoxGeometry(8.2, 3.8, 4.4, 3, 1.3), 0.1, 0.5, 601 + seed), m.pack, { pos: [0, 3.6, -0.2], parent: pack });
    mesh0(lumpy(new RoundedBoxGeometry(5.8, 3.8, 1.6, 2, 0.7), 0.08, 0.5, 602 + seed), m.pack, { pos: [0, -2.0, -2.4], parent: pack });
    for (const s of [-1, 1]) mesh0(lumpy(sausage([[s * 2.6, 3.6, 1.6], [s * 3.0, 5.6, 5.2], [s * 3.3, 3.0, 9.4], [s * 3.0, -2.5, 9.6]], [0.55, 0.55, 0.5, 0.45], { flat: 0.4, steps: 24 }), 0.03, 1, 605 + s), m.packStrap, { parent: pack });
    if (k === 'girl') mesh0(lumpy(ball(0.9, 1, 1.2, 0.8, 14), 0.05, 1, 610), M.canRed, { pos: [3.4, -3.6, -2.4], parent: pack });   // the red keyring in frame 2
  }
  const skirt = d.skirt ? mesh0(lumpy(lathe([[0.1, 3.0], [5.6, 3.0], [6.1, 1.0], [6.9, -3.0], [7.3, -4.6], [7.0, -5.0], [0.1, -5.0]], 44), 0.12, 0.5, 620).scale(1, 1, 0.84), m.skirt, { parent: tk.group }) : null;
  return { k, tk, wrap, pack, skirt };
}
const CAST = { dad: build('dad', scene), mum: build('mum', scene), son: build('son', scene), sis: build('sis', scene), girl: build('girl', scene) };
/** pose a figure: feet at (x, y, z), facing yaw; P(at) returns overrides in its own frame (hip at [0, 21.5, 0]) */
function pose(c, x, y, z, yaw, P = () => ({})) {
  c.wrap.visible = true; c.wrap.position.set(x, y, z); c.wrap.rotation.set(0, yaw, 0);
  const hip = [0, 21.5, 0], at = (v) => add3(hip, v), o = P(at);
  c.tk.pose({ hip: o.hip || hip, yaw: 0, lean: 0.08, side: 0, knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6], hp: 0.05, hr: 0, hy: 0,
    elR: at([-6.6, 8.6, 1.2]), hdR: at([-7.2, 2.4, 2.6]), elL: at([6.6, 8.6, 1.2]), hdL: at([7.2, 2.4, 2.6]), palm: [[0, -1, -0.3], [0, -1, -0.3]], ...o });
  const A = c.tk.anchor;
  if (c.pack) { const d = nrm3(sub3(A.H2, A.H1)), mid = lerp3(A.H1, A.H2, 0.5); c.pack.position.set(...add3(mid, [0, d[2] * 6.4, -d[1] * 6.4])); c.pack.rotation.set(Math.atan2(d[2], d[1]), 0, 0); }
  if (c.skirt) { c.skirt.position.copy(c.tk.parts.hips.position).y -= 0.4; }
  c.wrap.updateMatrixWorld(true);
}
const place = (k, x, z, yaw, P) => pose(CAST[k], x, 0, z, yaw, P);
const hideAll = () => { for (const k in CAST) CAST[k].wrap.visible = false; FORK.visible = false; BITE.visible = false; };
/** a stroll, on twos: ph runs 2π a stride; legs swing back to front off the ground, arms opposite */
function stroll(at, ph, o = {}) {
  const st = o.stride ?? 3.6, lift = o.lift ?? 2.0, sw = o.swing ?? 2.6;
  const leg = (p) => { const c = Math.cos(p), up = Math.max(0, -Math.sin(p));
    return { foot: [0, -20.75 + up * lift, 0.6 + c * st], knee: [0, -10.4 + up * lift * 0.5, 1.4 + c * st * 0.5 + up * 2.0], shoePitch: up * 0.3 - c * 0.12 }; };
  const c = Math.cos(ph);
  return { hip: [0, 21.5 + 0.35 * Math.cos(2 * ph), 0], legs: [leg(ph), leg(ph + Math.PI)], lean: o.lean ?? 0.1,
    elR: at([-6.4, 8.6, 1.2 - c * 1.2]), hdR: at([-6.9, 2.6, 2.6 - c * sw]), elL: at([6.4, 8.6, 1.2 + c * 1.2]), hdL: at([6.9, 2.6, 2.6 + c * sw]) };
}

// ------------------------------------------------------------------ the door camera's world: a second clay set, filmed live onto the display's glass
// The porch it hangs under (stained planks overhead, the red beam with string lights under it), a brick path out
// through the garden, the road, and a half-timbered house across it — all clay, lit by its own sun.
const FS = new THREE.Scene(); FS.background = new THREE.Color(0.72, 0.82, 0.92);
const fm = (g, m, o = {}) => mesh0(g, m, { parent: FS, ...o });
const FM = {
  board: C('#8d9399', { tool: 0.8, thumbCell: 2.4, noBoil: true }), ceil: C('#4a3426', { tool: 1.0, thumbCell: 2.2 }), ceilB: C('#3d2b1f', { tool: 1.0, thumbCell: 2.2 }),
  beam: C('#9c3b2a', { tool: 0.9, thumbCell: 2.6, mottle: 0.1 }), post: C('#ece4d4', { thumbCell: 3 }), brick: C('#ffffff', { thumbCell: 1.1, tool: 0.5, mottle: 0.12, thumb: 0.035 }),
  pillar: C('#45403d', { thumbCell: 1.5, mottle: 0.12 }), lawn: C('#6f8346', { surf: 'felt', rough: 1, fibre: 0.12, fibreF: 1.4, mottle: 0.14 }), soil: C('#5e4a38', { thumbCell: 1.2, mottle: 0.15 }),
  shrubs: ['#4f6b3a', '#6f8a4a', '#3f5a33', '#7f9a5a', '#5b7a3e'].map((c) => C(c, { thumbCell: 1.1, thumb: 0.05, tool: 0.4, mottle: 0.12 })),
  stucco: C('#ece3cf', { thumbCell: 4, mottle: 0.06 }), timber: C('#4a3424', { tool: 1 }), roof: C('#5d514b', { tool: 1, thumbCell: 2 }), stone: C('#8f887c', { thumbCell: 1.4, thumb: 0.05, mottle: 0.16 }),
  win: C('#2d3339', { rough: 0.2, clearcoat: 1, clearcoatRough: 0.1, thumb: 0.004 }), road: C('#7a766f', { thumbCell: 3, specks: 0.7, speckColor: '#55514c' }), kerb: C('#b9b3a8'),
  trunk: C('#6b5444', { tool: 1.1 }), flowers: ['#f2f0ea', '#e8a0b8', '#f0cf3c'].map((c) => C(c, { thumbCell: 0.5 })),
  pot: C('#cdbfa6', { thumbCell: 2 }), cable: C('#1e1c1c', { thumb: 0.005 }), bulb: HDR(3.2, 2.5, 1.6), socket: C('#2a2624'),
};
const GY = -9;                                                                        // the garden is a step below the porch
// the porch: painted boards underfoot, stained planks overhead running out to the beam, the beam itself, two posts on brick
for (let i = -9; i <= 9; i++) fm(lumpy(new RoundedBoxGeometry(9.4, 1.2, 72, 2, 0.4), 0.03, 0.3, 900 + i), FM.board, { pos: [i * 9.6, -0.6, -35] });
for (let i = -11; i <= 11; i++) fm(lumpy(new RoundedBoxGeometry(7.4, 1.4, 76, 2, 0.4), 0.04, 0.3, 930 + i), i % 2 ? FM.ceil : FM.ceilB, { pos: [i * 7.7, 75, -34] });
fm(lumpy(new RoundedBoxGeometry(200, 7.5, 7, 3, 1.2), 0.06, 0.2, 960), FM.beam, { pos: [0, 70, -71] });
for (const x of [-78, 78]) { fm(lumpy(new RoundedBoxGeometry(14, 30, 14, 2, 1), 0.1, 0.3, 961 + x), FM.pillar, { pos: [x, 15, -70] }); fm(lumpy(new RoundedBoxGeometry(7, 38, 7, 2, 0.8), 0.05, 0.3, 963 + x), FM.post, { pos: [x, 49, -70] }); }
for (const x of [-60, 60]) fm(lumpy(new RoundedBoxGeometry(34, 9, 9, 2, 0.8), 0.08, 0.3, 965 + x), FM.pillar, { pos: [x + Math.sign(x) * 6, 4.5, -72] });   // the low porch walls either side of the steps
// string lights: a cable sagging under the beam, a warm bulb at each drop
{ const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, x = -96 + u * 192; pts.push(V([x, 66.4 - Math.sin(u * Math.PI) * 5.5 + Math.sin(u * TAU * 3) * 0.6, -69])); }
  fm(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.28, 6), FM.cable, { cast: false });
  for (let i = 1; i < 8; i++) { const u = i / 8, x = -96 + u * 192, y = 66.4 - Math.sin(u * Math.PI) * 5.5;
    fm(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 10), FM.socket, { pos: [x, y - 1.4, -69], cast: false }); fm(ball(0.95, 1, 1.2, 1, 14), FM.bulb, { pos: [x, y - 3.2, -69], cast: false }); } }
// pots on the porch, a hanging fern on the right
for (const [x, s] of [[-52, 1.2], [56, 1.0]]) { plant(x, 0, -60, s, 70 + x, FS); }
{ fm(new THREE.CylinderGeometry(0.15, 0.15, 14, 6), FM.cable, { pos: [62, 66, -60], cast: false });
  fm(lumpy(lathe([[0, 0], [4, 0.4], [5, 3], [0, 3]], 24), 0.05, 1, 970), FM.pot, { pos: [62, 56, -60] });
  const r = rng(71); for (let i = 0; i < 14; i++) { const a = r() * TAU, l = 6 + r() * 7; fm(lumpy(sausage([[62, 58.6, -60], [62 + Math.cos(a) * l * 0.5, 59 - l * 0.2, -60 + Math.sin(a) * l * 0.5], [62 + Math.cos(a) * l, 59 - l * 0.9, -60 + Math.sin(a) * l]], [0.7, 0.9, 0.25], { steps: 14 }), 0.06, 1, 971 + i), i % 2 ? M.leaf : M.leafB); } }
// the ground beyond: steps down, the lawn and beds, the brick path out to the road
fm(lumpy(new RoundedBoxGeometry(40, 4.5, 8, 2, 0.6), 0.06, 0.3, 980), FM.post, { pos: [0, -2.3, -74] });
fm(new THREE.PlaneGeometry(900, 300).rotateX(-Math.PI / 2), FM.lawn, { pos: [0, GY, -225], cast: false });
for (const s of [-1, 1]) fm(lumpy(new RoundedBoxGeometry(110, 3, 200, 3, 1.2), 0.6, 0.15, 981 + s), FM.soil, { pos: [s * 72, GY + 0.4, -170], cast: false });
{ const bw = 5.8, bd = 2.8, rows = Math.ceil(220 / bd), r = rng(41);
  const geo = lumpy(new RoundedBoxGeometry(bw - 0.4, 1.4, bd - 0.4, 2, 0.35), 0.04, 1.4, 990);
  const inst = new THREE.InstancedMesh(geo, FM.brick, rows * 6); inst.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color(); let n = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < 5; i++) {
    const x = -11.6 + (j % 2 ? 0 : bw / 2) + i * bw, z = -78 - j * bd; if (x > 13) continue;
    e.set((r() - 0.5) * 0.06, (r() - 0.5) * 0.1, (r() - 0.5) * 0.06); q.setFromEuler(e); m4.compose(V([x, GY + 0.5 + r() * 0.2, z]), q, V([1, 1, 1])); inst.setMatrixAt(n, m4);
    col.setHSL(0.03 + r() * 0.04, 0.35 + r() * 0.2, 0.36 + r() * 0.14); if (r() < 0.15) col.setHSL(0.08, 0.06, 0.5 + r() * 0.1); inst.setColorAt(n, col); n++; }
  inst.count = n; FS.add(inst); }
// the garden: shrubs banked either side of the path, taller toward the road, flowers in the front beds
{ const r = rng(43);
  for (let i = 0; i < 70; i++) { const s = i % 2 ? 1 : -1, x = s * (17 + r() * 85), z = -82 - r() * 190, R = 4 + r() * 7 + (z < -180 ? 4 : 0);
    fm(lumpy(ball(R, 1, 0.8 + r() * 0.3, 1, 20), R * 0.12, 0.35, 1000 + i), FM.shrubs[(r() * 5) | 0], { pos: [x, GY + R * 0.55, z] }); }
  for (let i = 0; i < 60; i++) { const s = i % 2 ? 1 : -1; fm(ball(0.8 + r() * 0.5, 1, 1, 1, 10), FM.flowers[(r() * 3) | 0], { pos: [s * (15 + r() * 30), GY + 2 + r() * 5, -82 - r() * 70], cast: false }); }
  for (const [x, z, s] of [[-110, -230, 1.3], [96, -210, 1.5], [150, -300, 1.2], [-30, -420, 1.6]]) {        // trees
    fm(lumpy(sausage([[x, GY, z], [x + 2, GY + 30 * s, z], [x - 1, GY + 52 * s, z]], [3.6 * s, 2.8 * s, 2 * s], { steps: 20 }), 0.3, 0.3, 1100 + x), FM.trunk);
    for (let k = 0; k < 9; k++) { const R = (12 + r() * 10) * s; fm(lumpy(ball(R, 1, 0.85, 1, 22), R * 0.14, 0.2, 1110 + k + x), FM.shrubs[(r() * 5) | 0], { pos: [x + (r() - 0.5) * 36 * s, GY + (48 + r() * 30) * s, z + (r() - 0.5) * 30 * s] }); } }
}
// the road, the kerbs, and over it a half-timbered house with two gables
fm(new THREE.PlaneGeometry(1200, 44).rotateX(-Math.PI / 2), FM.road, { pos: [0, GY + 0.1, -318], cast: false });
for (const z of [-295, -341]) fm(new RoundedBoxGeometry(1200, 2, 5, 1, 0.5), FM.kerb, { pos: [0, GY + 1, z], cast: false });
{ const HX = -40, HZ = -400, F = HZ + 30, HB = GY;
  fm(lumpy(new RoundedBoxGeometry(150, 60, 60, 3, 1.5), 0.3, 0.12, 1200), FM.stucco, { pos: [HX, HB + 30, HZ] });
  fm(lumpy(new RoundedBoxGeometry(152, 18, 61, 3, 1.2), 0.4, 0.2, 1201), FM.stone, { pos: [HX, HB + 9, HZ] });
  const gable = (cx, w, h, z) => { const s = new THREE.Shape([V2([-w / 2, 0]), V2([w / 2, 0]), V2([0, h])]);
    fm(lumpy(new THREE.ExtrudeGeometry(s, { depth: 8, bevelEnabled: false }), 0.15, 0.2, 1202 + cx), FM.stucco, { pos: [cx, HB + 60, z - 8] });
    for (const sd of [-1, 1]) fm(lumpy(new RoundedBoxGeometry(Math.hypot(w / 2, h) + 6, 2.4, 14, 2, 0.6), 0.15, 0.2, 1204 + cx + sd), FM.roof, { pos: [cx + sd * w / 4, HB + 60 + h / 2 + 1, z - 3], rot: [0, 0, -sd * Math.atan2(h, w / 2)] });
    for (let i = -2; i <= 2; i++) fm(new RoundedBoxGeometry(1.4, h * (1 - Math.abs(i) / 3), 1.2, 1, 0.3), FM.timber, { pos: [cx + i * w / 6.5, HB + 60 + h * (1 - Math.abs(i) / 3) / 2, z + 0.4] });
    fm(new RoundedBoxGeometry(w * 0.6, 1.6, 1.2, 1, 0.3), FM.timber, { pos: [cx, HB + 66, z + 0.4] }); };
  gable(HX - 40, 52, 34, F + 6); gable(HX + 30, 46, 30, F + 6);
  { const s = new THREE.Shape([V2([-32, 0]), V2([32, 0]), V2([0, 26])]); const g = new THREE.ExtrudeGeometry(s, { depth: 150, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-75, 0, 0);
    fm(lumpy(g, 0.3, 0.1, 1210), FM.roof, { pos: [HX, HB + 60, HZ] }); }
  for (let i = 0; i < 12; i++) fm(new RoundedBoxGeometry(1.4, 40, 1.2, 1, 0.3), FM.timber, { pos: [HX - 70 + i * 12.6, HB + 39, F + 0.6] });
  for (const y of [HB + 19, HB + 59]) fm(new RoundedBoxGeometry(150, 1.8, 1.2, 1, 0.3), FM.timber, { pos: [HX, y, F + 0.7] });
  for (let i = 0; i < 6; i++) fm(new RoundedBoxGeometry(1.2, 22, 1.0, 1, 0.3), FM.timber, { pos: [HX - 64 + i * 25, HB + 40, F + 0.9], rot: [0, 0, (i % 2 ? 1 : -1) * 0.55] });
  for (const [x, y, w, h] of [[-60, 40, 14, 12], [-20, 40, 14, 12], [20, 40, 16, 12], [-60, 12, 12, 9], [22, 12, 14, 9], [HX - 40 + 40, 76, 10, 8], [HX + 30 + 40, 74, 9, 7]]) {
    fm(new RoundedBoxGeometry(w + 2.4, h + 2.4, 1.4, 2, 0.4), FM.stucco, { pos: [HX + x + 40 - 40, HB + y, F + 1.2] }); fm(new RoundedBoxGeometry(w, h, 1.6, 2, 0.3), FM.win, { pos: [HX + x + 40 - 40, HB + y, F + 1.4] });
    fm(new RoundedBoxGeometry(0.8, h, 1.8, 1, 0.2), FM.timber, { pos: [HX + x, HB + y, F + 1.5] }); }
  fm(lumpy(new RoundedBoxGeometry(12, 20, 2, 2, 0.6), 0.1, 0.3, 1220), FM.timber, { pos: [HX + 2, HB + 10, F + 1.2] });
  fm(lumpy(new RoundedBoxGeometry(9, 40, 9, 2, 0.8), 0.2, 0.2, 1221), FM.stone, { pos: [HX + 52, HB + 82, HZ] });
}
// the sky, pale toward the horizon
{ const c = canvas(64, 256), g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7fa6cf'); gr.addColorStop(0.6, '#c6d8e6'); gr.addColorStop(1, '#eef0ea'); g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  fm(new THREE.PlaneGeometry(3000, 900), new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(1.15, 1.15, 1.15) }), { pos: [0, 300, -900], cast: false }); }
// its own light: a high warm sun from over the camera's shoulder, a sky fill
const fsun = new THREE.DirectionalLight('#fff0d6', 4.2);
{ const tgt = V([0, 0, -180]); fsun.position.copy(tgt).add(V([260, 380, 300])); fsun.target.position.copy(tgt);
  fsun.castShadow = true; fsun.shadow.mapSize.set(2048, 2048); Object.assign(fsun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 50, far: 1400 });
  fsun.shadow.bias = -0.0004; fsun.shadow.normalBias = 0.05; fsun.shadow.radius = 2; FS.add(fsun, fsun.target); }
FS.add(new THREE.HemisphereLight('#d8e6f6', '#7a8458', 1.1));
const porchFill = new THREE.PointLight('#ffd9a8', 900, 160, 2); porchFill.position.set(0, 60, -40); FS.add(porchFill);
const feedCam = new THREE.PerspectiveCamera(70, UW / UH, 1, 3000); feedCam.position.set(0, 46, -2); feedCam.lookAt(0, 34, -110);
const FC = { girl: build('girl', FS, 1), boy: build('boy', FS, 2) };

// ------------------------------------------------------------------ light: low morning sun through the window, a cool room fill, the pendants
const SUN_DIR = new THREE.Vector3(0.05, -0.33, 0.94).normalize();
const sun = new THREE.DirectionalLight('#ffdfae', 6.0);
{ const target = new THREE.Vector3(10, 20, -50);
  sun.position.copy(target).addScaledVector(SUN_DIR, -420); sun.target.position.copy(target);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 50, far: 900 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04; sun.shadow.radius = 1.5; scene.add(sun, sun.target); }
const hemi = new THREE.HemisphereLight('#dde6f4', '#c9ad8c', 0.55); scene.add(hemi);
const fill = new THREE.DirectionalLight('#eef2ff', 0.36); { const f = fill; f.position.set(-60, 90, 160); f.castShadow = true; f.shadow.mapSize.set(2048, 2048);
  Object.assign(f.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 20, far: 600 }); f.shadow.radius = 10; f.shadow.bias = -0.0004; scene.add(f); }
{ const dir = SUN_DIR.clone(), L = 120;                                               // the sunbeam made visible, dust in it
  const g = new THREE.BufferGeometry(), c0 = [[-11, 31], [31, 31], [31, 67], [-11, 67]].map(([x, y]) => new THREE.Vector3(x, y, BACK)), c1 = c0.map((p) => p.clone().addScaledVector(dir, L));
  const pos = [], al = [];
  for (let i = 0; i < 4; i++) { const a = c0[i], b = c0[(i + 1) % 4], a1 = c1[i], b1 = c1[(i + 1) % 4]; for (const [p, k] of [[a, 1], [b, 1], [b1, 0], [a, 1], [b1, 0], [a1, 0]]) { pos.push(p.x, p.y, p.z); al.push(k); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('al', new THREE.Float32BufferAttribute(al, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: 'attribute float al; varying float vA; void main(){ vA = al; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(vec3(1.0,0.86,0.62) * 0.05 * pow(vA, 1.4), 1.0); }' });
  const beam = new THREE.Mesh(g, m); beam.renderOrder = 5; scene.add(beam);
  const r = rng(99), dust = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.3, 1.0), transparent: true, opacity: 0.7 }), dg = new THREE.SphereGeometry(0.05, 6, 4);
  const ex = c0[1].clone().sub(c0[0]), ey = c0[3].clone().sub(c0[0]);
  for (let i = 0; i < 70; i++) { const p = c0[0].clone().addScaledVector(ex, 0.08 + r() * 0.84).addScaledVector(ey, 0.08 + r() * 0.84).addScaledVector(dir, (0.15 + r() * 0.6) * L); const d = new THREE.Mesh(dg, dust); d.position.copy(p); scene.add(d); }
}

// ------------------------------------------------------------------ the timeline: 112 BPM, cuts on the beat; captions planned by the pipeline
await CAP.loadFonts(FONT_DIR);
{ const f = new FontFace('Kalam', `url(${FONT_DIR}Kalam-700.woff)`); document.fonts.add(await f.load()); }
const COPY = await CAP.loadCopy('copy.json');
const B = 60 / 112, FPS = 30, SAFE_B = 1630;
const BEATS = [['s1', 0], ['s2', 14 * B], ['s3', 26 * B], ['s4', 38 * B], ['end', 50 * B]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: B }), T = P.T, DUR = T.end;
const capOf = (id) => P.captions.find((c) => c.id === id);
const popOf = (id) => { const c = capOf(id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const lineStart = (id, n) => capOf(id).words.find((w) => w.line === n).t;
const nLines = (id) => Math.max(...capOf(id).words.map((w) => w.line)) + 1;
const EV = { boot: 0.15, flow: lineStart('question', 1) - 0.15, lock: popOf('lock'), cut3b: lineStart('ad', nLines('ad') - 1) - 0.1, glance: popOf('ad') - 0.2, watching: popOf('last') };
EV.pull0 = EV.flow + 0.3; EV.pull1 = EV.flow + 2.9; EV.cross = EV.pull1 - 0.8; EV.dadLook = EV.cross + 0.5; EV.reach = EV.lock - 0.9; EV.feed0 = EV.cut3b - 1.0; EV.glance2 = EV.watching + 0.45; EV.cut4b = EV.watching + 1.6;
EV.tap = EV.reach + 0.45;
EV.priv = capOf('last').words.filter((w) => w.line === 0).slice(-1)[0].t;            // "…private.": her texts' chip comes up on the same screen
const EVENTS = { ...T, lang: LANG, holds: P.holds, ...EV, ...CAP.events(P), quiet: [] };
const LOOK = Q.get('look');
const twos = (t) => Math.floor(t * 12) / 12;                                          // the puppets act on twos; camera and light move every frame
const hold = (t, t0, a = 0.35, len = 1.4, b = 0.5) => ease.io((t - t0) / a) * (1 - ease.io((t - t0 - len) / b));

// ------------------------------------------------------------------ the door camera's action: the couple off the porch and away up the path; she looks back
function feedAction(tq) {
  const ft = Math.max(0, tq - EV.feed0), ph = ft * TAU * 0.92;
  const step = (z) => lerp(0, GY, clamp((-72 - z) / 7)), zb = -62 - 5.5 * ft, zg = -55 - 5.5 * ft;   // an unhurried walk, so the couple stays big enough to read on the screen
  pose(FC.boy, -10, step(zb), zb, Math.PI, (at) => stroll(at, ph + 0.8));
  const g = Math.max(hold(tq, EV.glance, 0.3, 1.5, 0.5), ease.io((tq - EV.glance2) / 0.4));
  pose(FC.girl, 10, step(zg), zg, Math.PI + 0.85 * g, (at) => ({ ...stroll(at, ph, { lean: 0.08 }), hy: 1.9 * g, hp: 0.05 - 0.3 * g }));
  FS.updateMatrixWorld(true);
  renderer.setRenderTarget(feedRT); renderer.clear(); renderer.render(FS, feedCam); renderer.setRenderTarget(null);
}

// ------------------------------------------------------------------ the shots
const dadMask = () => CAST.dad.tk.mask.getWorldPosition(new THREE.Vector3());
const SHOT = [
  { // 1 · the display boots; pull back into the morning; the daughter crosses the foreground and dad looks round (frame 1)
    t0: () => T.s1, t1: () => T.s2, devYaw: -0.18, light: [0xd9f0c0, 30],
    ui(t) { if (t < EV.flow) drawUI('boot', (t - EV.boot) / 0.9); else drawUI('flow'); DISP.uniforms.uFeed.value = 0; if (t >= EV.flow && t < EV.flow + 0.3) drawUI('flow', 1, 0.6 * (1 - (t - EV.flow) / 0.3)); },
    cast(t) {
      const look = ease.io((t - EV.dadLook) / 0.55);
      place('dad', 24, BACK + 30, lerp(-2.79, -1.95, look), (at) => ({ lean: 0.14 - look * 0.06, hy: lerp(0.3, 1.65, look), hp: 0.14 - look * 0.16, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6 + Math.sin(t * 6) * 0.8 * (1 - look), 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      place('son', 2, BACK + 27, Math.PI - 0.15, (at) => ({ lean: 0.2, hp: 0.3, hy: 0.1, elR: at([-6.4, 7.6, 4]), hdR: at([-3.6, 3.6, 9.2]), elL: at([6.4, 7.6, 4]), hdL: at([3.4, 3.4, 9.2]) }));
      place('sis', 2, ISL.z - 23, 0.05, (at) => ({ lean: 0.26, hp: 0.32, hy: 0.05, elR: at([-6.4, 7.2, 4.2]), hdR: at([-1.8, 3.4 + Math.sin(t * 9) * 0.5, 10.6 + Math.cos(t * 9) * 0.7]), elL: at([6.6, 7.4, 4]), hdL: at([3.6, 2.2, 10.4]) }));
      const k = (t - EV.cross) / 3.0;                                               // the daughter: in from the right, past the lens, out to the left
      if (k > -0.05 && k < 1.05) place('girl', lerp(44, -16, k), lerp(-29, -24, k), Math.atan2(-60, 5), (at) => ({ ...stroll(at, t * TAU * 1.2, { stride: 3.8 }), hy: -0.25 }));
    },
    cam(t) { const k = ease.io((t - EV.pull0) / (EV.pull1 - EV.pull0)), sc = SC(), sn = SN(), d = lerp(31, 29, clamp(t / EV.pull0));
      const p0 = sc.clone().addScaledVector(sn, d).add(V([0, 6, 0])), p1 = V([2, 38, 12]), a1 = V([16, 33, -90]);
      const pos = p0.lerp(p1, k), at = sc.clone().lerp(a1, k), rack = ease.io((t - EV.cross) / 0.9);
      return { pos, at, fov: lerp(30, 42, k), focus: lerp(pos.distanceTo(sc), pos.distanceTo(dadMask()), rack), ap: lerp(9, 10, k) }; } },
  { // 2 · over her brother's shoulder: he reaches for her messages; on "unlocks" the screen locks him out
    t0: () => T.s2, t1: () => T.s3, devYaw: -0.42, light: [0xffc6d6, 40],
    ui(t) { drawUI('msgs', clamp((t - EV.lock) / 0.35 + 0.001) * (t >= EV.lock ? 1 : 0)); DISP.uniforms.uFeed.value = 0; },
    cast(t) {
      const r = ease.out((t - EV.reach) / 0.5) * (1 - ease.out((t - EV.lock - 0.25) / 0.45)), back = ease.out((t - EV.lock - 0.1) / 0.4), sn = SN();
      const yaw = Math.atan2(-sn.x, -sn.z), sc = SC(), x = sc.x + sn.x * 21, z = sc.z + sn.z * 21;
      place('son', x + sn.x * back * 3, z + sn.z * back * 3, yaw, (at) => ({ lean: 0.24 + r * 0.14 - back * 0.16, hp: 0.12, hy: -0.05 + back * 0.3, hr: back * 0.12, elR: at([-7, 7.6, 3 + r * 6]), hdR: at([-5.4, 4.6 + r * 6, 6 + r * 11]), elL: at([7, 7.6, 3]), hdL: at([6.4, 2.4, 6]) }));
      place('dad', 44, BACK + 31, Math.PI + 0.35, (at) => ({ lean: 0.14, hy: -1.1, hp: 0.05, elR: at([-6.2, 8.4, 4]), hdR: at([-4.4, 4.6 + Math.sin(t * 6) * 0.8, 9.4]), elL: at([6.4, 8.6, 3]), hdL: at([3.6, 5.6, 9.6]) }));
      place('mum', -24, BACK + 32, Math.PI - 0.3, (at) => ({ lean: 0.16, hp: 0.2, hy: 0.4, elR: at([-6.4, 7.6, 4]), hdR: at([-3.6, 3.6, 9.2]), elL: at([6.4, 7.6, 4]), hdL: at([3.4, 3.4, 9.2]) }));
    },
    cam(t, lt, d) { const sc = SC(), sn = SN(), side = V([sn.z, 0, -sn.x]), k = ease.io(lt / d);
      const pos = sc.clone().addScaledVector(sn, lerp(56, 51, k)).addScaledVector(side, -20).add(V([0, 9, 0]));
      return { pos, at: sc.clone().add(V([0, -0.6, 0])), fov: lerp(25, 23, k), focus: pos.distanceTo(sc), ap: 7 }; } },
  { // 3a · the ad's ending: the family round the display, lit by it (frames 4 and 3)
    t0: () => T.s3, t1: () => EV.cut3b, devYaw: Math.PI + 0.2, light: [0xd6e6ff, 105], feedUI: true,
    ui(t) { drawUI('door', 0); DISP.uniforms.uFeed.value = 1; },
    cast(t) { family(t, 0); },
    cam(t, lt, d) { const k = ease.io(lt / d), pos = V([lerp(48, 45, k), lerp(42, 41.5, k), lerp(-4, -9, k)]);
      return { pos, at: V([10, 37, -72]), fov: lerp(42, 39, k), focus: pos.distanceTo(CAST.son.tk.mask.getWorldPosition(new THREE.Vector3())), ap: 8 }; } },
  { // 3b · the display itself: Front Door, Live, the couple off up the path; on "camera" she looks back into the lens (frame 2)
    t0: () => EV.cut3b, t1: () => T.s4, devYaw: Math.PI + 0.2, light: [0xd6e6ff, 170], feed: true,
    ui(t) { drawUI('door', 0); DISP.uniforms.uFeed.value = 1; },
    cast(t) { family(t, 1); },
    cam(t, lt, d) { const sc = SC(), sn = SN(), k = ease.io(lt / d), pos = sc.clone().addScaledVector(sn, lerp(47, 42, k)).add(V([0.6, lerp(2.6, 2.0, k), 0]));
      return { pos, at: sc.clone().add(V([0, -0.4, 0])), fov: 24, focus: pos.distanceTo(sc), ap: 7 }; } },
  { // 3c · in on the glass for the punchline, to the end: on "private." her texts come up locked in the corner; on "date"
    // 4 WATCHING; she looks back again. One screen, both halves of the joke.
    t0: () => T.s4, t1: () => T.end, devYaw: Math.PI + 0.2, light: [0xd6e6ff, 170], feed: true,
    ui(t) { drawUI('door', clamp((t - EV.watching) / 0.9), 0, clamp((t - EV.priv) / 0.45)); DISP.uniforms.uFeed.value = 1; },
    cast(t) { family(t, 1); },
    cam(t, lt, d) { const sc = SC(), sn = SN(), k = ease.io(lt / d), pos = sc.clone().addScaledVector(sn, lerp(34, 31, k)).add(V([-0.3, 1.0, 0]));
      return { pos, at: sc.clone().add(V([0, 0.5, 0])), fov: 24, focus: pos.distanceTo(sc), ap: 6 }; } },
];
/** the family round the display, in two tiers so nobody passes through anybody: the two kids in front, leaning over the
 *  island's far edge (their hands on its top), the parents standing behind with their heads between the kids'. The same
 *  places for the kids in the faces (v 0) and behind the screen (v 1); the parents step aside for v 1.
 *  Spacing checked with __film.clip(t): no two figures within a cell of each other, nothing inside the island. */
function family(t, v) {
  const lean = v === 0 ? 0.04 * ease.out((t - T.s3 - 0.6) / 0.6) : 0.03;
  const chew = Math.max(0, Math.sin(t * 5)), face = (x, z) => Math.atan2(DEV.position.x - x, DEV.position.z - z);
  const s = [16, -70], i = [-6, -70], m = v === 0 ? [-4, -84] : [-18, -80], d = v === 0 ? [15, -84] : [32, -80];   // behind the screen, the parents step aside: the camera is where they stood
  place('son', ...s, face(...s), (at) => ({ lean: 0.24 + lean, hp: 0.22, hy: -0.04, elR: at([-6.6, 6.6, 4.6]), hdR: at([-4.6, 5.2, 10.0]), elL: at([6.6, 6.6, 4.6]), hdL: at([4.8, 5.2, 10.0]) }));
  place('sis', ...i, face(...i) + 0.1, (at) => ({ lean: 0.22 + lean, hp: 0.1, hy: 0.08, elR: at([-6.4, 6.8, 4.6]), hdR: at([-4.4, 8.6 + Math.sin(t * 2.2) * 0.6, 8.8]), elL: at([6.6, 6.6, 4.6]), hdL: at([5.0, 3.4, 10.2]) }));
  place('mum', ...m, face(...m), (at) => ({ lean: 0.06 + lean, hp: 0.08, hy: 0.04, elR: at([-6.8, 6.8, 2.4]), hdR: at([2.6, 7.4, 6.0]), elL: at([6.8, 6.8, 2.4]), hdL: at([-2.6, 7.0, 6.2]) }));
  place('dad', ...d, face(...d), (at) => ({ lean: 0.05 + lean, hp: 0.1, hy: -0.06, elR: at([-6.4, 7.4, 3.6]), hdR: at([-2.6, lerp(8, 12.5, chew), 6.4]), elL: at([6.8, 6.2, 1.6]), hdL: at([6.2, 1.2, 3.0]) }));
  const fh = CAST.sis.tk.hands[0].getWorldPosition(new THREE.Vector3()); FORK.visible = true; FORK.position.copy(fh).add(V([0, 0.6, 0])); FORK.rotation.set(0.25, 0.55, 0.15);
  const bh = CAST.dad.tk.hands[0].getWorldPosition(new THREE.Vector3()); BITE.visible = chew < 0.85; BITE.position.copy(bh).add(V([0.6, 1.2, 0.8])); BITE.rotation.set(0.3, 0.4, 0.2);
}
const shotAt = (t) => { for (let i = SHOT.length - 1; i >= 0; i--) if (t >= SHOT[i].t0()) return i; return 0; };

/** the tag that says what this is: a real ad, remade */
function tag(g, text, k) {
  if (k <= 0) return; g.save(); g.globalAlpha = k; g.font = '700 32px Inter'; const w = g.measureText(text).width + 60, x = 110, y = SAFE_B - 66 - 10;
  g.fillStyle = 'rgba(251,250,247,.94)'; g.beginPath(); g.roundRect(x, y, w, 66, 33); g.fill(); g.fillStyle = '#1d1b1f'; g.textBaseline = 'middle'; g.fillText(text, x + 30, y + 35); g.restore();
}

// ------------------------------------------------------------------ one frame
function frame(t, captions = true) {
  const i = shotAt(t), S = SHOT[i], t0 = S.t0(), d = S.t1() - t0, lt = t - t0, tq = twos(t);
  g2d.setTransform(1, 0, 0, 1, 0, 0);
  setBoil(Math.floor(t * 12)); hideAll();
  DEV.rotation.y = S.devYaw; scene.updateMatrixWorld(true);
  S.cast(tq); S.ui(t);
  if (S.feed || LOOK === 'screen') feedAction(tq);
  scene.updateMatrixWorld(true);
  screenLight.position.copy(SC().addScaledVector(SN(), 7)); screenLight.color.set(S.light[0]); screenLight.intensity = S.light[1] * (S.feed || S.feedUI ? 1 + Math.sin(t * 9) * 0.05 : 1);
  const L = LOOK === 'screen' ? (() => { const p = SC().addScaledVector(SN(), 30); return { pos: p, at: SC(), fov: 30, focus: 30, ap: 0 }; })() : S.cam(t, lt, d); camera.fov = L.fov; camera.position.copy(L.pos); camera.lookAt(L.at); camera.updateProjectionMatrix(); scene.updateMatrixWorld(true);
  post.render(scene, camera, { focus: L.focus, aperture: Q.get('nodof') ? 0 : L.ap, maxBlur: 30, radScale: 0.9,
    threshold: 1.25, knee: 0.5, bloomA: 0.26, bloomB: 0.18, exposure: 1.1, vignette: 0.22, grain: 0.02, seed: Math.floor(t * 12),
    sat: 1.08, contrast: 1.05, lift: [0.01, 0.008, 0.012], gain: [1.03, 1.0, 0.97], toe: 0.03 });
  g2d.drawImage(renderer.domElement, 0, 0);
  if (i === 0) tag(g2d, P.ui.tag, clamp((t - 3.4) / 0.3) * clamp((T.s2 - 0.3 - t) / 0.3));
  CAP.bug(g2d, 'RADIO FREE HELSINKI', 'house');
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out2d;
}
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));   // ?busy=0: stills only, skip the scrim measurement
const keep = () => [];
const tagW = (() => { g2d.save(); g2d.font = '700 32px Inter'; const w = Math.round(g2d.measureText(P.ui.tag).width + 60); g2d.restore(); return w; })();
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: EVENTS, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep, busy: BUSY || {} }), ui: { tag: { text: P.ui.tag, x0: 110, x1: 110 + tagW, ok: 110 + tagW <= 940 } } },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  probe(t) { frame(t, false); const out = []; for (const [k, c] of [...Object.entries(CAST), ...Object.entries(FC)]) c.wrap.traverse((o) => { if (!o.isMesh || !c.wrap.visible) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox, sz = b.getSize(new THREE.Vector3()); let nan = 0; for (const v of o.geometry.attributes.position.array) if (!Number.isFinite(v)) nan++; if (sz.length() > 30 || nan) out.push([k, o.material.color && o.material.color.getHexString(), sz.toArray().map((v) => +v.toFixed(1)), nan]); }); return out; },
  still(t) { return frame(t).toDataURL('image/png'); },
  /** the clipping probe: pose frame t, sample every visible figure's (and prop's) vertices in world space, and report
   *  each pair whose surfaces come within one 0.6-unit cell of each other, plus any body below the island's top inside
   *  its footprint. A figure's own prop (dad's bite, sis's fork) is not a collision. */
  clip(t) {
    frame(t, false); const G = {}, v = new THREE.Vector3(), seen = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    for (const [k, c] of Object.entries(CAST)) if (c.wrap.visible) G[k] = c.wrap;
    if (BITE.visible) G.bite = BITE; if (FORK.visible) G.fork = FORK; G.device = DEV;
    const P2 = {}; for (const [k, o] of Object.entries(G)) { const a = []; o.traverse((m) => { if (!m.isMesh || !seen(m)) return; const A = m.geometry.attributes.position, st = Math.max(1, Math.floor(A.count / 3000));
      for (let i = 0; i < A.count; i += st) { v.fromBufferAttribute(A, i).applyMatrix4(m.matrixWorld); a.push(v.x, v.y, v.z); } }); P2[k] = a; }
    const R = 0.6, key = (x, y, z) => Math.floor(x / R) + ',' + Math.floor(y / R) + ',' + Math.floor(z / R), H = {};
    for (const [k, a] of Object.entries(P2)) { const h = new Set(); for (let i = 0; i < a.length; i += 3) h.add(key(a[i], a[i + 1], a[i + 2])); H[k] = h; }
    const own = { bite: 'dad', fork: 'sis' }, out = [], ks = Object.keys(P2);
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = ks[i], b = ks[j]; if (own[a] === b || own[b] === a) continue;
      let n = 0; const A = P2[a]; for (let q = 0; q < A.length; q += 3) if (H[b].has(key(A[q], A[q + 1], A[q + 2]))) n++; if (n) out.push([a, b, n]); }
    for (const k of Object.keys(CAST)) { const a = P2[k]; if (!a) continue; let n = 0;
      for (let q = 0; q < a.length; q += 3) { const x = a[q], y = a[q + 1], z = a[q + 2]; if (Math.abs(x - ISL.x) < ISL.w / 2 - 1.5 && Math.abs(z - ISL.z) < ISL.d / 2 - 1.5 && y < CTOP - 0.3 && y > 1) n++; }
      if (n) out.push([k, 'island', n]); }
    return out;
  } };
window.__ready = true;
