// TESLUR LIVE — Toko Midori Games, clay, ~21 s, 1080×1920, 24 fps. Version B: the broadcast,
// copied in clay and Gumby-fied (smooth, rounded, matte plasticine, saturated where the
// source is saturated, its darkness kept). Built from the 32 livestream frames in ref/.
//
// The real thing (15 Oct 2026): a roadster climbs a tall concrete curl at night, sticks to
// its underside upside down (fan suction), rolls back down, goes up again, leaves the top,
// flies on cold-gas jets and lands in smoke. Here the car sounds like a vacuum cleaner, and
// down in front, cropped by the frame, a janitor in construction ear defenders vacuums.
//
//   0.0–3.2   run 1 waits at the foot; 0.4–3.0 the janitor walks in from the left, vacuuming
//   3.2–5.6   run 1: up the curl to pitch 170 and STOP upside down (SUCTION gauge high)
//   5.6–7.0   it hangs there
//   7.0–8.6   it rolls back down; 7.4–9.1 the janitor turns and walks off left
//   9.2–10.6  run 2 (the HUD swaps to G-FORCE): up again, 9.6–11.9 the janitor comes back in
//   10.6–12.6 off the top, a half roll upright, it flies on four cold-gas jets and turns
//   14.0–17.5 the jets stutter: it coughs grey clay smoke, hiccups and dips, a bit further left
//   14.0–15.2 the janitor stops, lifts one ear defender, palm up: "what?"
//   17.5–21.0 cut to black: TESLUR in clay letters, "What?" in white type under it
//
// Everything a matched frame would move lives in L (camera, ramp, car scale).
// Puppets are posed on twos (12 poses/s); camera, light and HUD every frame.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from './lib/post.js';
import { surface, setBoil } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { canvas, tex } from './lib/city.js';
import { orient } from './lib/beasts.js';
import { Toko } from './lib/toko.js';

const Q = new URLSearchParams(location.search);
const RES = Number(Q.get('res') || 1), VER = (Q.get('ver') || 'B').toUpperCase();
const W = Math.round(1080 * RES), H = Math.round(1920 * RES), FPS = 24, POSE_FPS = 12;
const CARD_T = 25.5, END_T = 29.5, FRAMES = Math.round(END_T * FPS);

// ------------------------------------------------------------------ helpers
const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (A, B, k) => (Array.isArray(A) ? A.map((v, i) => lerp(v, B[i], k)) : lerp(A, B, k));
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm3 = (a) => mul3(a, 1 / (Math.hypot(...a) || 1));
const V = (a) => new THREE.Vector3(...a);
const R_ = (yaw) => (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
const cr = (a, b, c, d, t) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
/** keyframes [[t, ...values]] → Catmull-Rom values at t (clamped) */
function keyed(K, t) {
  if (t <= K[0][0]) return K[0].slice(1);
  if (t >= K[K.length - 1][0]) return K[K.length - 1].slice(1);
  let i = 0; while (K[i + 1][0] < t) i++;
  const f = (t - K[i][0]) / (K[i + 1][0] - K[i][0]);
  const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(K.length - 1, i + 2)];
  return p1.slice(1).map((_, j) => cr(p0[j + 1], p1[j + 1], p2[j + 1], p3[j + 1], f));
}
/** a quaternion whose local x runs along T and local y along N */
function basisQ(T, N) {
  const x = V(nrm3(T)), z = V(nrm3(cross3(T, N))), y = new THREE.Vector3().crossVectors(z, x);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// ------------------------------------------------------------------ LAYOUT — everything a matched frame would move
// World: cm, ground y = 0, the camera looks down −z. Forced perspective, as a stop-motion
// set is built: the janitor at puppet scale (≈1:4) in front; the ramp and car behind at
// 1:15, so 1 ft of the broadcast's ALTITUDE gauge is 2 cm here.
const L = {
  // the livestream wide: high, long lens, looking a touch down; portrait recomposition of ref-06…-24
  cam: { pos: [0, 67, 0], pitch: 2.0, yaw: 0, fov: 22, drift: 0.6 },
  tokoZ: -425,
  // the far set stands on a stage this much higher than the janitor's floor: the camera then sees the
  // curl almost edge-on (as the broadcast's low camera does) while the janitor stays at the frame's foot.
  // The ground is black, so the step never shows.
  stage: 37, stageZ: -560,
  // the curl: run-in, lower arc R1 (0→90°), a vertical, upper arc R2 curling over to `end`, then `over` cm of straight overhang;
  // beta turns its plane off the camera axis so the overhang leans LEFT, as in the broadcast
  ramp: { foot: [22, 37.6, -760], beta: 26, R1: 44, Hs: 30, R2: 62, top: 170, end: 176, over: 40, width: 30, thick: 3.2, runIn: 170 },
  car: { scale: 1.05 },     // the car is built 44 units long; 1.05 → 46 cm, ~1.5× the real 14.8 ft at 1:15 so it reads on a phone
  ft: 2,
};

// ------------------------------------------------------------------ boot
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(L.cam.fov, W / H, 8, 9000);
const post = new Post(renderer, W, H);
const out2d = canvas(W, H), g2d = out2d.getContext('2d');

// ------------------------------------------------------------------ clays: Gumby — smooth, round, matte, saturated
const GB = (color, o = {}) => surface({ color, wrap: 0.35, wrapTint: '#ffd8c0', rough: 0.66, bump: 1, lump: 0.025, lumpF: 0.35, thumb: 0.022, thumbCell: 2.4, ridge: 0.12, tool: 0.35, grain: 0.002, grainF: 8, mottle: 0.05, specks: 0.15, roughVar: 0.06, ...o });
const HDR = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const TJ = {   // the janitor: the kit's Toko, in a navy coverall, the traced mask on a YELLOW carrier
  hoodie: GB('#2f4f7e', { thumbCell: 1.8, thumb: 0.035, tool: 0.7 }), hoodie2: GB('#27426a', { thumbCell: 1.6, thumb: 0.03 }),
  cuff: GB('#27426a', { thumbCell: 1.2 }), jeans: GB('#2f4f7e', { thumbCell: 1.8, thumb: 0.035, tool: 0.7 }),
  shoes: GB('#1c1c1e', { rough: 0.5 }), sole: GB('#4a4a4c'),
  glove: GB('#cc1574', { thumbCell: 1.2, thumb: 0.03, specks: 0.2, speckColor: '#5a0730' }),
  hair: GB('#8a8278', { tool: 1.2, thumbCell: 0.9, thumb: 0.04 }),
  maskDisc: GB('#ffc800', { rough: 0.55, thumb: 0.02, thumbCell: 1.5, mottle: 0.04, specks: 0.2, speckColor: '#8a6a00' }),
  maskInk: GB('#fffbf0', { rough: 0.5, thumb: 0.012, thumbCell: 0.9, mottle: 0.03, specks: 0.1 }),
  strap: GB('#2a2523', { thumb: 0.01, rough: 0.5 }), string: GB('#e9e2d2'), aglet: GB('#cfc6b4'),
  belt: GB('#2a211c', { rough: 0.5, thumb: 0.015 }), buckle: GB('#c9cdd2', { rough: 0.25, metal: 0.6, specks: 0 }),
  rag: GB('#d8262e', { rough: 0.9, thumb: 0.04, thumbCell: 0.9, tool: 1.2 }), patch: GB('#f3f0e8', { rough: 0.7 }),
};
const EM = {   // the ear defenders: orange, so they never melt into the yellow mask
  cup: GB('#ff7414', { rough: 0.4, thumb: 0.02, thumbCell: 1.2, tool: 0.4, specks: 0.15, speckColor: '#8a3000' }),
  yoke: GB('#1e1e22', { rough: 0.42, thumb: 0.01, specks: 0 }),
  cushion: GB('#151517', { rough: 0.8, thumb: 0.02, thumbCell: 0.8 }),
};
const VM = {   // the industrial canister vacuum
  drum: GB('#1f66d8', { rough: 0.42, thumb: 0.02, thumbCell: 1.6, tool: 0.4 }),
  lid: GB('#1b1c1f', { rough: 0.5, thumb: 0.015 }), bumper: GB('#8c9196', { rough: 0.6 }),
  hose: GB('#9aa1a8', { rough: 0.5, thumb: 0.01, specks: 0 }), wand: GB('#c3c8ce', { rough: 0.22, metal: 0.55, thumb: 0.004, specks: 0, noBoil: true }),
  grip: GB('#121214', { rough: 0.6 }), nozzle: GB('#2e3034', { rough: 0.55 }), stripe: GB('#e8262a', { rough: 0.5 }),
  lamp: HDR(2.4, 2.1, 1.6),
};
const CM = {   // the car: silver faceted clay, black glass
  body: GB('#d3d6da', { rough: 0.4, metal: 0.15, thumb: 0.035, thumbCell: 1.6, tool: 0.6, mottle: 0.05, specks: 0.15, wrap: 0.25 }),
  glass: GB('#2b323b', { rough: 0.16, metal: 0.25, thumb: 0.004, mottle: 0.02, specks: 0, noBoil: true, clearcoat: 1.0, clearcoatRough: 0.1, emissive: '#141a22', emissiveIntensity: 1.0 }),   // smoky, so it holds against the black sky
  black: GB('#141517', { rough: 0.5, thumb: 0.01, specks: 0 }),
  tyre: GB('#1d1d1f', { rough: 0.8, thumb: 0.015, thumbCell: 1.0 }),
  disc: GB('#2a2c30', { rough: 0.32, metal: 0.25, thumb: 0.008, specks: 0 }), discRing: GB('#5b5f66', { rough: 0.3, metal: 0.4, specks: 0 }),
  port: GB('#3a3d42', { rough: 0.3, metal: 0.4, specks: 0 }),
  bar: HDR(3.2, 0.16, 0.12),
  nozzle: GB('#6c7178', { rough: 0.3, metal: 0.5, specks: 0 }),
};
const SM = {   // the set
  ground: GB('#0b0c0d', { rough: 0.62, thumb: 0.02, thumbCell: 3.4, lump: 0.04, lumpF: 0.08, mottle: 0.12, specks: 0.3, speckColor: '#1d1f22', noBoil: true }),
  concrete: GB('#b2b3af', { rough: 0.84, thumb: 0.075, thumbCell: 2.0, tool: 1.4, ridge: 0.15, lump: 0.07, lumpF: 0.3, mottle: 0.16, specks: 0.7, speckColor: '#86877f', noBoil: true }),
  line: GB('#f6f4ee', { rough: 0.6, thumb: 0.005, specks: 0, noBoil: true, emissive: '#ffffff', emissiveIntensity: 0.08 }),
  ledRed: HDR(2.4, 0.1, 0.08), ledLow: HDR(2.4, 0.1, 0.08), ledWhite: [2.0, 2.0, 2.1],
  steel: GB('#8e969f', { rough: 0.5, metal: 0.25, thumb: 0.04, thumbCell: 1.2, tool: 0.8, mottle: 0.1, specks: 0.3, noBoil: true }),
  lampBody: GB('#141416', { rough: 0.45, specks: 0, noBoil: true }), lens: HDR(3.0, 3.0, 3.1),
  blueLens: HDR(1.6, 2.6, 3.4), white: HDR(3.6, 3.6, 3.7), red: HDR(3.2, 0.14, 0.1),
  vehicle: GB('#2b2e33', { rough: 0.45, metal: 0.2, specks: 0, noBoil: true }),
};
const PF = {   // cotton-wool clay: the jets (pale blue-white, a little lit from inside) and the coughs
  jet: surface({ surf: 'felt', color: '#e9f3ff', rough: 1, fibre: 0.08, fibreF: 2.4, lump: 0.08, lumpF: 0.35, mottle: 0.04, wrap: 0.8, wrapTint: '#cfe6ff', emissive: '#7fb8ff', emissiveIntensity: 0.55 }),
  cotton: surface({ surf: 'felt', color: '#f4f3f0', rough: 1, fibre: 0.08, fibreF: 2.4, lump: 0.08, lumpF: 0.35, mottle: 0.05, wrap: 0.75 }),
  grey: surface({ surf: 'felt', color: '#a9a8a6', rough: 1, fibre: 0.08, fibreF: 2.4, lump: 0.08, lumpF: 0.35, mottle: 0.1, wrap: 0.7 }),
  dark: surface({ surf: 'felt', color: '#5f5e5c', rough: 1, fibre: 0.08, fibreF: 2.4, lump: 0.08, lumpF: 0.35, mottle: 0.1, wrap: 0.6 }),
};

// ------------------------------------------------------------------ the ramp: a light-grey concrete curl, LED edges, white centre line
const RP = L.ramp, BETA = RP.beta * DEG;
const U = [Math.sin(BETA), 0, -Math.cos(BETA)], WD = [Math.cos(BETA), 0, Math.sin(BETA)], UP = [0, 1, 0];
const A1 = RP.R1 * Math.PI / 2, S_UP = A1 + RP.Hs, S_ARC = S_UP + RP.R2 * ((RP.end - 90) * DEG);
/** the curl's centreline in its own plane: u along the run, v up; ph is the car's pitch */
function path(s) {
  const { R1, Hs, R2 } = RP;
  if (s < 0) return { u: s, v: 0, ph: 0 };
  if (s < A1) { const ph = s / R1; return { u: R1 * Math.sin(ph), v: R1 * (1 - Math.cos(ph)), ph }; }
  if (s < S_UP) return { u: R1, v: R1 + (s - A1), ph: Math.PI / 2 };
  if (s < S_ARC) { const ph = Math.PI / 2 + (s - S_UP) / R2; return { u: R1 - R2 + R2 * Math.sin(ph), v: R1 + Hs - R2 * Math.cos(ph), ph }; }
  const ph = RP.end * DEG, d = s - S_ARC;   // the overhang: straight on, past the tower, sticking out on its own
  return { u: R1 - R2 + R2 * Math.sin(ph) + d * Math.cos(ph), v: R1 + Hs - R2 * Math.cos(ph) + d * Math.sin(ph), ph };
}
const toWorld = (u, v, w) => add3(add3(add3(RP.foot, mul3(U, u)), mul3(UP, v)), mul3(WD, w));
function rampAt(s) {
  const p = path(s);
  const T = add3(mul3(U, Math.cos(p.ph)), mul3(UP, Math.sin(p.ph))), N = add3(mul3(U, -Math.sin(p.ph)), mul3(UP, Math.cos(p.ph)));
  return { P: toWorld(p.u, p.v, 0), T, N, ph: p.ph, u: p.u, v: p.v };
}
const S_TOP = S_UP + RP.R2 * ((RP.top - 90) * DEG), S_LIP = S_ARC + RP.over, S_PARK = -27;
/** sweep a closed (w, n) cross-section along the path from s0 to s1 */
function sweep(s0, s1, section, { step = 1.5 } = {}) {
  const ss = []; for (let s = s0; s < s1; s += (s < -10 ? 12 : step)) ss.push(s); ss.push(s1);
  const pos = [], idx = [], M = section.length;
  for (const s of ss) { const r = rampAt(s); for (const [w, n] of section) pos.push(...add3(add3(r.P, mul3(WD, w)), mul3(r.N, n))); }
  for (let i = 0; i < ss.length - 1; i++) for (let j = 0; j < M; j++) {
    const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M;
    idx.push(a, c, b, b, c, d);
  }
  const cap = (i, flip) => { const r = rampAt(ss[i]); const c = pos.length / 3; const sc = section.reduce((a, [w, n]) => [a[0] + w / M, a[1] + n / M], [0, 0]); pos.push(...add3(add3(r.P, mul3(WD, sc[0])), mul3(r.N, sc[1]))); for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; if (flip) idx.push(c, b, a); else idx.push(c, a, b); } };
  cap(0, false); cap(ss.length - 1, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** a rounded rectangle in (w, n), running surface on top (n = 0), ordered so the sweep faces out */
function roundRect(w0, w1, n0, n1, r, k = 4) {
  const pts = [];
  const corner = (cw, cn, a0) => { for (let i = 0; i <= k; i++) { const a = a0 + i / k * Math.PI / 2; pts.push([cw + Math.cos(a) * r, cn + Math.sin(a) * r]); } };
  // top edge runs +w → −w, then down the −w side, along the bottom, up the +w side
  corner(w1 - r, n1 - r, 0); corner(w0 + r, n1 - r, Math.PI / 2); corner(w0 + r, n0 + r, Math.PI); corner(w1 - r, n0 + r, Math.PI * 1.5);
  // the corner() calls emit counter-clockwise from +w; reorder so the top edge goes +w → −w
  return pts;
}
{
  const half = RP.width / 2;
  const deck = sweep(-RP.runIn, S_LIP, roundRect(-half, half, -RP.thick, 0, 1.0));
  mesh(lumpy(deck, 0.38, 0.07, 911), SM.concrete, { parent: scene });
  // the white centre line
  const cl = []; for (let s = -RP.runIn + 2; s < S_LIP - 1; s += (s < 0 ? 10 : 2)) { const r = rampAt(s); cl.push(add3(r.P, mul3(r.N, 0.05))); }
  mesh(sausage(cl, cl.map(() => [0.07, 0.42]), { seg: 8, steps: 400, capSteps: 2, up: WD }), SM.line, { parent: scene, cast: false });
  // LED strips on both edges: the lower run and the upper run are separate, so run 2 can light the lower one white
  const led = (s0, s1, sd) => { const p = []; for (let s = s0; s <= s1; s += (s < 0 ? 8 : 3)) { const r = rampAt(s), j = hash(s * 1.7 + sd); p.push(add3(add3(r.P, mul3(WD, sd * (half + 0.2 + (j - 0.5) * 0.35))), mul3(r.N, -0.35 + (hash(s * 2.3 - sd) - 0.5) * 0.3))); } return lumpy(sausage(p, p.map((_, i) => 0.42 + (hash(i * 3.1 + sd) - 0.5) * 0.14), { seg: 8, steps: Math.max(20, p.length * 3), capSteps: 2 }), 0.08, 0.5, 920 + sd); };
  mesh(mergeGeometries([led(-40, A1, 1), led(-40, A1, -1)]), SM.ledLow, { parent: scene, cast: false, recv: false });
  mesh(mergeGeometries([led(A1, S_LIP - 0.6, 1), led(A1, S_LIP - 0.6, -1)]), SM.ledRed, { parent: scene, cast: false, recv: false });
}
// the steel: one lattice tower on the ramp's right (behind the wall), hand-rolled and lumpy; the overhang sticks out past it on its own
{
  const st = [];
  const bar = (a, b, r) => { const k = st.length; st.push(lumpy(sausage([a, mix(a, b, 0.5).map((v, i) => v + (hash(k * 3 + i) - 0.5) * 0.4), b], [r * (0.9 + hash(k) * 0.25), r, r * (0.9 + hash(k + 7) * 0.25)], { seg: 8, steps: 8, capSteps: 2 }), r * 0.18, 0.7, 1000 + k)); };
  const P = (u, v, w) => toWorld(u, v, w);
  const u0 = RP.R1 + 6, u1 = RP.R1 + 26, wT = 14, top = 126;
  for (const u of [u0, u1]) for (const w of [-wT, wT]) bar(P(u, 0, w), P(u, top, w), 1.05);
  for (let v = 0; v <= top + 0.1; v += 21) {
    bar(P(u0, v, -wT), P(u0, v, wT), 0.6); bar(P(u1, v, -wT), P(u1, v, wT), 0.6); bar(P(u0, v, -wT), P(u1, v, -wT), 0.6); bar(P(u0, v, wT), P(u1, v, wT), 0.6);
    if (v + 21 <= top + 0.1) { const v1 = v + 21; bar(P(u0, v, -wT), P(u0, v1, wT), 0.48); bar(P(u1, v, wT), P(u1, v1, -wT), 0.48); bar(P(u0, v, wT), P(u1, v1, wT), 0.48); bar(P(u1, v, -wT), P(u0, v1, -wT), 0.48); }
  }
  // struts from the back of the wall to the tower
  for (const v of [30, 62, 94, 118]) { const p = path(v < RP.R1 ? Math.acos(1 - v / RP.R1) * RP.R1 : v < RP.R1 + RP.Hs ? A1 + (v - RP.R1) : S_UP + Math.asin(clamp((v - RP.R1 - RP.Hs) / RP.R2)) * RP.R2); const ub2 = p.u + RP.thick * Math.sin(p.ph); for (const w of [-10, 10]) bar(P(ub2, v, w), P(u0, v, w * 1.35), 0.55); }
  mesh(mergeGeometries(st), SM.steel, { parent: scene });
  // a platform on the tower top with two moving heads aimed at the overhang
  mesh(lumpy(new RoundedBoxGeometry(26, 2.2, 32, 2, 0.8), 0.25, 0.3, 1200), SM.steel, { pos: P((u0 + u1) / 2, top + 1, 0), rot: [0, -BETA, 0], parent: scene });
  for (const w of [-8, 8]) {
    const g = new THREE.Group(); g.position.set(...P(u0 + 4, top + 4.4, w)); scene.add(g);
    mesh(lumpy(new RoundedBoxGeometry(3.8, 2.0, 3.8, 2, 0.6), 0.08, 0.8, 1210 + w), SM.lampBody, { pos: [0, -1.4, 0], parent: g, cast: false });
    mesh(lumpy(ball(2.1, 1, 1.1, 1, 16), 0.08, 0.8, 1220 + w), SM.lampBody, { pos: [0, 0.8, 0], parent: g, cast: false });
    const lens = mesh(new THREE.CircleGeometry(1.3, 20), SM.lens, { pos: [0, 0.9, 0], parent: g, cast: false });
    lens.lookAt(V(P(-30, 128, w))); lens.position.add(V(sub3(P(-30, 128, w), g.position.toArray())).setLength(2.0));
  }
}
// red drapes hanging either side of the foot — dressed into the chase angle only (the wide never shows them)
const drapes = [];
{
  const drape = (seed) => {
    const g = new THREE.PlaneGeometry(30, 84, 60, 10), P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 1.8 * Math.sin(x * 0.85 + seed) + 0.7 * Math.sin(x * 2.1 + y * 0.04 + seed * 2) + (y > 34 ? (y - 34) * 0.02 * Math.cos(x) : 0)); }
    g.translate(0, 42, 0);
    return lumpy(g, 0.25, 0.15, 960 + seed);
  };
  const m = new THREE.Matrix4().makeBasis(V(WD), V(UP), V(mul3(U, -1)));
  for (const sd of [-1, 1]) {
    const d = mesh(drape(sd + 2), GB('#7e0c13', { rough: 0.95, thumb: 0.02, tool: 0.6, mottle: 0.12, side: THREE.DoubleSide }), { parent: scene });
    d.quaternion.setFromRotationMatrix(m); d.position.set(...toWorld(-6, 0, sd * (RP.width / 2 + 17))); d.visible = false; drapes.push(d);
  }
}
// the set around it: black ground, a concrete pad at the foot, searchlights, drones, parked cars, LED rows, floods
const runTwo = [];   // things that only exist in run 2
{
  const zS = L.stageZ, yS = L.stage;
  mesh(new THREE.PlaneGeometry(3000, 700).rotateX(-Math.PI / 2), SM.ground, { pos: [0, 0, zS + 350], parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), SM.ground, { pos: [0, yS, zS - 4500], parent: scene, cast: false });
  mesh(new THREE.PlaneGeometry(3000, yS), new THREE.MeshBasicMaterial({ color: 0x000000 }), { pos: [0, yS / 2, zS], parent: scene, cast: false, recv: false });
  mesh(lumpy(new RoundedBoxGeometry(60, 0.6, 54, 2, 0.25), 0.05, 0.1, 930), SM.concrete, { pos: toWorld(-10, -0.3, 0), rot: [0, -BETA, 0], parent: scene, cast: false });
  // the fan of pale blue searchlight beams, at the ramp's lower left
  const grad = canvas(8, 256), gg = grad.getContext('2d'), gr = gg.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.18)'); gr.addColorStop(0.9, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  gg.fillStyle = gr; gg.fillRect(0, 0, 8, 256);
  const beamTex = tex(grad);
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: new THREE.Color(0.1, 0.24, 0.44), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const base = toWorld(-6, 0, -RP.width / 2 - 22);
  for (let i = 0; i < 7; i++) {
    const a = (-8 + i * 9) * DEG, d = (i % 2 ? 0.25 : -0.15);
    const dir = nrm3(add3(add3(mul3(UP, Math.cos(a)), mul3([-1, 0, 0], Math.sin(a))), mul3([0, 0, -1], d)));
    const o = add3(base, [i * 1.4 - 4, 0.8, (i % 3) * 2 - 2]);
    const len = 80 + (i % 3) * 18, geo = new THREE.CylinderGeometry(1.3, 0.3, len, 12, 1, true).translate(0, len / 2, 0);
    const m = mesh(geo, beamMat, { parent: scene, cast: false, recv: false }); m.position.set(...o);
    m.quaternion.setFromUnitVectors(V([0, 1, 0]), V(dir));
    const can = mesh(lumpy(new THREE.CylinderGeometry(1.3, 1.5, 2.2, 14), 0.02, 1, 940 + i), SM.lampBody, { parent: scene, cast: false }); can.position.set(...o); can.quaternion.copy(m.quaternion);
    mesh(new THREE.CircleGeometry(1.15, 14).rotateX(-Math.PI / 2), SM.blueLens, { pos: [0, 1.15, 0], parent: can, cast: false });
  }
  // tiny white drone lights in the sky to the right, one with four lights
  const drones = [[150, 250, -1700], [175, 205, -1650], [128, 170, -1800], [196, 280, -1900], [-150, 205, -1900]];
  for (const p of drones) mesh(ball(1.6, 1, 1, 1, 8), SM.white, { pos: p, parent: scene, cast: false, recv: false });
  for (let i = 0; i < 4; i++) mesh(ball(1.2, 1, 1, 1, 8), SM.white, { pos: [-118 + i * 4.2, 230 + (i % 2) * 1.2, -1500], parent: scene, cast: false, recv: false });
  // parked vehicles far right, headlights on
  for (const [x, z, yaw] of [[118, -1240, -0.35], [150, -1300, -0.2]]) {
    const g = new THREE.Group(); g.position.set(x, yS, z); g.rotation.y = yaw; scene.add(g);
    mesh(lumpy(new RoundedBoxGeometry(30, 9, 13, 3, 3), 0.08, 0.2, x), SM.vehicle, { pos: [0, 6, 0], parent: g });
    mesh(lumpy(new RoundedBoxGeometry(17, 6, 12, 3, 2.4), 0.08, 0.2, x + 1), SM.vehicle, { pos: [-2, 12.5, 0], parent: g });
    for (const s of [-1, 1]) mesh(ball(2.4, 0.6, 1, 1, 12), SM.white, { pos: [-15.4, 6.5, s * 4.5], parent: g, cast: false });
  }
  // run 2 dressing: a long low row of red LED bars on the ground at left, and white floods far left
  const bars = []; for (let x = -260; x < -20; x += 9) { const b = new RoundedBoxGeometry(6, 0.9, 1.2, 1, 0.3); b.translate(x, yS + 0.45, -880 + x * 0.06); bars.push(b); }
  runTwo.push(mesh(mergeGeometries(bars), SM.red, { parent: scene, cast: false, recv: false }));
  for (let i = 0; i < 5; i++) runTwo.push(mesh(new THREE.CircleGeometry(2.4, 16), SM.white, { pos: [-118 + i * 7, yS + 4, -1150], parent: scene, cast: false, recv: false }));
}

// ------------------------------------------------------------------ the car: a low silver cyber wedge, black glass teardrop, red light bar, four ports
/** corner-cut an open polyline (ends fixed): flat facets, rounded edges — Gumby facets */
function roundPoly(pts, k = 0.22, iters = 2) {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      if (i > 0) o.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]);
      if (i < p.length - 2) o.push([lerp(a[0], b[0], 1 - k), lerp(a[1], b[1], 1 - k)]);
    }
    o.push(p[p.length - 1]); p = o;
  }
  const out = [p[0]];   // subdivide so a facet's middle shades flat
  for (let i = 0; i < p.length - 1; i++) for (let j = 1; j <= 2; j++) out.push([lerp(p[i][0], p[i + 1][0], j / 2), lerp(p[i][1], p[i + 1][1], j / 2)]);
  return out;
}
/** loft a faceted body through keyed stations; section(x, params) returns the half-profile (z ≥ 0) bottom → top */
function facetLoft(keys, section, { step = 0.45 } = {}) {
  const xs = []; for (let x = keys[0][0]; x < keys[keys.length - 1][0]; x += step) xs.push(x); xs.push(keys[keys.length - 1][0]);
  const at = (x) => { let i = 0; while (i < keys.length - 2 && keys[i + 1][0] < x) i++; const a = keys[i], b = keys[i + 1], k = clamp((x - a[0]) / (b[0] - a[0])); return a.map((v, j) => lerp(v, b[j], k)); };
  const rings = xs.map(x => { const half = section(at(x)); const full = half.concat(half.slice(1, -1).reverse().map(([z, y]) => [-z, y])); return full.map(([z, y]) => [x, y, z]); });
  const M = rings[0].length, pos = [], idx = [];
  rings.forEach(r => r.forEach(p => pos.push(...p)));
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M, c = (i + 1) * M + j, d = (i + 1) * M + (j + 1) % M; idx.push(a, c, b, b, c, d); }
  const cap = (i, flip) => { const r = rings[i], c = pos.length / 3; pos.push(r.reduce((s, p) => s + p[0], 0) / M, r.reduce((s, p) => s + p[1], 0) / M, 0); for (let j = 0; j < M; j++) { const a = i * M + j, b = i * M + (j + 1) % M; if (flip) idx.push(c, b, a); else idx.push(c, a, b); } };
  cap(0, false); cap(rings.length - 1, true);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function buildCar() {
  // Built against ref-05 (rear), ref-13 (side) and ref-01/09 (top): a faceted wedge on short overhangs, a black glass
  // teardrop that is the biggest dark shape from above, angular rear haunches standing proud of it, big wheels.
  // Gumby-fied by softening the edges only (one light corner cut), never by rounding the planes away.
  const car = new THREE.Group(); car.userData.wheels = [];
  // [x, yb, ySill, wSill, yFlank, wFlank, yRidge, wRidge, yDeck, wDeck] — stations at the wheels are a narrow tub
  // under a fender lip, which is what cuts the arches
  const body = [
    [-22.5, 2.6, 3.6, 9.2, 5.8, 9.6, 7.6, 8.4, 6.9, 5.0],
    [-19.6, 2.0, 3.3, 9.8, 6.0, 10.4, 8.3, 9.0, 7.0, 5.3],
    [-18.0, 2.4, 6.6, 6.6, 7.6, 10.8, 8.7, 9.3, 7.1, 5.6],
    [-13.8, 2.4, 6.6, 6.4, 7.8, 10.9, 8.9, 9.3, 7.2, 5.9],
    [-9.6, 2.4, 6.6, 6.6, 7.6, 10.6, 8.7, 9.0, 7.2, 6.2],
    [-8.0, 1.8, 3.2, 9.4, 6.0, 9.9, 7.9, 8.4, 7.0, 6.4],
    [-1.0, 1.7, 3.2, 9.3, 5.4, 9.6, 7.0, 8.3, 6.6, 6.6],
    [7.4, 1.8, 3.2, 9.4, 5.2, 9.7, 6.7, 8.6, 6.3, 5.8],
    [8.8, 2.3, 6.4, 6.4, 7.4, 10.0, 8.0, 9.0, 6.1, 5.5],
    [13.2, 2.3, 6.4, 6.2, 7.5, 10.0, 8.0, 9.0, 5.8, 5.0],
    [17.6, 2.3, 6.0, 6.4, 7.0, 9.4, 7.3, 8.2, 5.3, 4.3],
    [19.0, 2.1, 3.0, 8.2, 5.2, 8.6, 6.0, 7.2, 5.0, 3.8],
    [21.6, 2.4, 3.0, 6.8, 4.0, 7.0, 4.8, 5.8, 4.5, 3.2],
  ];
  const section = ([, yb, yS, wS, yF, wF, yR, wR, yD, wD]) => roundPoly([[0, yb], [wS - 1.2, yb], [wS, yS], [wF, yF], [wR, yR], [wD, yD], [0, yD]], 0.14, 1);
  mesh(lumpy(facetLoft(body, section, { step: 0.4 }), 0.05, 0.4, 801), CM.body, { parent: car });
  // the black glass teardrop: widest at the windscreen, a point between the haunches
  const glass = [
    [-17.5, 6.6, 7.6, 0.8], [-13.5, 6.6, 8.6, 3.0], [-9.0, 6.6, 9.6, 5.0], [-4.5, 6.6, 10.4, 6.4],
    [-0.5, 6.6, 10.8, 7.1], [3.0, 6.6, 10.4, 7.2], [6.5, 6.6, 9.0, 6.8], [9.6, 6.6, 7.4, 5.8], [11.2, 6.6, 6.8, 4.6],
  ];
  const gsec = ([, yb, yT, w]) => roundPoly([[0, yb - 0.6], [w, yb - 0.3], [w * 0.88, yb + (yT - yb) * 0.6], [w * 0.45, yT - 0.08], [0, yT]], 0.15, 1);
  mesh(lumpy(facetLoft(glass, gsec, { step: 0.4 }), 0.03, 0.5, 802), CM.glass, { parent: car });
  // a dark floor pan, so from below it reads as a car's underside
  mesh(lumpy(new RoundedBoxGeometry(40, 1.0, 16.5, 2, 0.4), 0.04, 0.5, 803), CM.black, { pos: [-0.5, 1.45, 0], parent: car });
  // wheels: big black tyres, flat aero disc covers
  for (const x of [-13.8, 13.2]) for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, 3.65, s * 8.85); car.add(w);
    const spin = new THREE.Group(); w.add(spin);
    const tyre = lathe([[2.4, -1.85], [3.15, -1.9], [3.5, -1.6], [3.62, -0.9], [3.65, 0], [3.62, 0.9], [3.5, 1.6], [3.15, 1.9], [2.4, 1.85]], 36); tyre.rotateX(Math.PI / 2);
    mesh(lumpy(tyre, 0.05, 0.9, 810 + x + s), CM.tyre, { parent: spin });
    mesh(lumpy(new THREE.CylinderGeometry(2.95, 2.95, 0.5, 36).rotateX(Math.PI / 2), 0.03, 0.8, 815 + x + s), CM.disc, { pos: [0, 0, s * 1.7], parent: spin, cast: false });
    mesh(new THREE.TorusGeometry(2.72, 0.13, 6, 40), CM.discRing, { pos: [0, 0, s * 1.97], parent: spin, cast: false });
    mesh(ball(0.6, 1, 1, 0.45, 14), CM.discRing, { pos: [0, 0, s * 2.0], parent: spin, cast: false });
    car.userData.wheels.push(spin);
  }
  // the tail: a thin full-width red light bar along its top edge, the RDSTR plate, a black lower rear with four round ports
  mesh(lumpy(sausage([[-22.62, 6.85, -9.0], [-22.68, 6.88, 0], [-22.62, 6.85, 9.0]], [0.24, 0.26, 0.24], { seg: 8, steps: 24, capSteps: 2 }), 0.02, 1.5, 819), CM.bar, { parent: car, cast: false });
  mesh(lumpy(new RoundedBoxGeometry(1.5, 3.3, 17.2, 2, 0.5), 0.03, 1, 820), CM.black, { pos: [-22.35, 3.45, 0], parent: car });
  for (const z of [-5.4, -1.8, 1.8, 5.4]) { mesh(new THREE.TorusGeometry(0.7, 0.22, 8, 20).rotateY(Math.PI / 2), CM.port, { pos: [-23.15, 3.9, z], parent: car, cast: false }); mesh(new THREE.CircleGeometry(0.56, 16).rotateY(-Math.PI / 2), HDR(0.02, 0.02, 0.02), { pos: [-23.1, 3.9, z], parent: car, cast: false }); }
  {
    const c = canvas(256, 112), g = c.getContext('2d');
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, 256, 112); g.strokeStyle = '#2a2a2a'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 100);
    g.fillStyle = '#1b1b1d'; g.font = '700 64px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '4px'; g.fillText('RDSTR', 128, 60);
    mesh(new RoundedBoxGeometry(0.3, 1.35, 3.2, 1, 0.12), GB('#e9e9e4'), { pos: [-22.62, 5.85, 0], parent: car, cast: false });
    mesh(new THREE.PlaneGeometry(3.0, 1.22).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(c), color: new THREE.Color(1.5, 1.5, 1.5) }), { pos: [-22.79, 5.85, 0], parent: car, cast: false });
  }
  // concealed headlights: two thin dark slits across the chisel nose
  for (const s of [-1, 1]) mesh(sausage([[21.7, 4.25, s * 2.4], [21.7, 4.05, s * 5.8]], [0.16, 0.16], { seg: 6, steps: 6, capSteps: 1 }), CM.black, { parent: car, cast: false });
  // cold-gas nozzles under the sills, pointing down
  car.userData.nozzles = [];
  for (const x of [-10.5, 9.5]) for (const s of [-1, 1]) {
    mesh(new THREE.CylinderGeometry(0.55, 0.8, 1.0, 12), CM.nozzle, { pos: [x, 1.35, s * 5.4], parent: car, cast: false });
    car.userData.nozzles.push({ p: [x, 0.6, s * 5.4], d: [0, -1, 0] });
  }
  car.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return car;
}

// ------------------------------------------------------------------ the janitor: the kit's Toko, in coverall and ear defenders, with a canister vacuum
class Muffs {
  constructor(M, parent) {
    this.g = new THREE.Group(); parent.add(this.g);
    this.cups = [-1, 1].map((s, i) => {
      const c = new THREE.Group(); this.g.add(c);
      const shell = lathe([[0.01, 2.45], [1.25, 2.38], [1.95, 2.1], [2.38, 1.5], [2.5, 0.65], [2.45, 0.0]], 36); shell.rotateZ(-s * Math.PI / 2);
      mesh(lumpy(shell, 0.04, 0.8, 520 + i), M.cup, { parent: c });
      mesh(lumpy(new THREE.TorusGeometry(1.9, 0.62, 12, 32).rotateY(Math.PI / 2), 0.03, 0.9, 522 + i), M.cushion, { pos: [-s * 0.2, 0, 0], parent: c });
      const yk = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI; yk.push([s * 1.0, Math.sin(a) * 2.85, Math.cos(a) * 2.85]); }
      mesh(lumpy(sausage(yk, yk.map(() => 0.33), { seg: 10, steps: 30 }), 0.02, 1, 524 + i), M.yoke, { parent: c });
      mesh(ball(0.55, 1, 1, 1, 10), M.yoke, { pos: [s * 1.0, 2.85, 0], parent: c });
      return c;
    });
    this.band = mesh(new THREE.BufferGeometry(), M.cup, { parent: this.g });
    this.pad = mesh(new THREE.BufferGeometry(), M.yoke, { parent: this.g });
    this.set(0);
  }
  /** lift 0 → 1: the figure's own right cup (−x) swings out and up like a door hinged at the top of its yoke */
  set(lift = 0) {
    const cs = [-1, 1].map((s) => {
      const l = s < 0 ? lift : 0;
      const base = [s * 5.0, -0.25, -0.45], piv = [base[0] + s * 1.0, base[1] + 2.85, base[2]];
      const rz = s * 1.75 * l, vx = s * 1.0, vy = 2.85;
      const rx = vx * Math.cos(rz) - vy * Math.sin(rz), ry = vx * Math.sin(rz) + vy * Math.cos(rz);
      return { s, l, pos: [piv[0] - rx + s * 1.6 * l, piv[1] - ry + 0.6 * l, base[2] + 2.8 * l], rz, piv: [piv[0], piv[1], base[2] + 0.8 * l] };
    });
    cs.forEach((c, i) => { this.cups[i].position.set(...c.pos); this.cups[i].rotation.set(0, -c.s * 0.55 * c.l, c.rz, 'YXZ'); });
    const top = cs.map(c => c.piv), z = -0.45, l0 = cs[0].l;
    top[0] = [top[0][0] - 1.2 * l0, top[0][1] + 0.9 * l0, top[0][2] + 0.6 * l0];
    const pts = [top[0], [-4.7 - 0.8 * l0, 4.1 + 0.6 * l0, z], [-2.7, 5.25, z], [0, 5.6, z], [2.7, 5.25, z], [4.7, 4.1, z], top[1]];
    this.band.geometry.dispose(); this.band.geometry = lumpy(sausage(pts, pts.map(() => [0.5, 1.15]), { seg: 14, steps: 60, up: [0, 0, 1] }), 0.02, 0.9, 530);
    const pp = [[-2.2, 5.85, z], [0, 6.2, z], [2.2, 5.85, z]];
    this.pad.geometry.dispose(); this.pad.geometry = lumpy(sausage(pp, [[0.55, 1.0], [0.62, 1.05], [0.55, 1.0]], { seg: 12, steps: 20, up: [0, 0, 1] }), 0.02, 0.9, 531);
  }
}
/** the industrial canister vacuum: a floor nozzle with its wand (the frame Toko pushes), a drum that follows, a ribbed hose */
class Canister {
  constructor(M) {
    const Lp = (g, a = 0.04, f = 0.7, s = 1) => lumpy(g, a, f, s);
    this.group = new THREE.Group(); scene.add(this.group);
    mesh(Lp(new RoundedBoxGeometry(12.5, 1.9, 4.4, 3, 0.8), 0.04, 0.5, 601), M.nozzle, { pos: [0, 0.95, 0.6], parent: this.group });
    mesh(Lp(sausage([[-6.0, 0.8, 2.9], [0, 0.8, 3.05], [6.0, 0.8, 2.9]], [0.45, 0.45, 0.45], { seg: 10, steps: 16 }), 0.02, 1, 602), M.stripe, { parent: this.group });
    this.stick = new THREE.Group(); this.stick.position.set(0, 1.9, -0.6); this.group.add(this.stick);
    mesh(Lp(ball(1.25, 1, 1, 1, 16), 0.02, 1, 603), M.nozzle, { parent: this.stick });
    mesh(sausage([[0, 0.6, 0], [0, 27.5, 0]], [0.55, 0.52], { seg: 12, steps: 8 }), M.wand, { parent: this.stick });
    // the wand's top: a handle bend and a rubber grip, then the hose cuff
    mesh(Lp(sausage([[0, 25.0, 0], [0, 29.6, 0]], [0.82, 0.82], { seg: 14, steps: 8 }), 0.02, 1, 604), M.grip, { parent: this.stick });
    mesh(Lp(sausage([[0, 29.4, 0], [0, 30.8, -0.6], [0, 31.2, -1.8]], [0.95, 0.95, 0.9], { seg: 14, steps: 12 }), 0.02, 1, 605), M.lid, { parent: this.stick });
    // the drum
    this.drum = new THREE.Group(); scene.add(this.drum);
    mesh(Lp(lathe([[0.01, 1.4], [6.0, 1.4], [6.7, 2.2], [7.0, 7.5], [6.8, 12.6], [6.2, 13.4], [0.01, 13.4]], 40), 0.06, 0.4, 610), M.drum, { parent: this.drum });
    mesh(Lp(lathe([[0.01, 13.2], [6.5, 13.2], [6.4, 14.8], [5.0, 16.4], [2.2, 17.0], [0.01, 17.1]], 40), 0.04, 0.5, 611), M.lid, { parent: this.drum });
    mesh(Lp(new THREE.TorusGeometry(6.85, 0.55, 10, 40).rotateX(Math.PI / 2), 0.03, 0.8, 612), M.bumper, { pos: [0, 2.2, 0], parent: this.drum });
    mesh(Lp(sausage([[-2.6, 16.2, 0], [-1.6, 18.8, 0], [1.6, 18.8, 0], [2.6, 16.2, 0]], [0.5, 0.5, 0.5, 0.5], { seg: 10, steps: 24 }), 0.02, 1, 613), M.lid, { parent: this.drum });
    for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; mesh(ball(0.9, 1, 1, 0.8, 12), M.lid, { pos: [Math.cos(a) * 5.0, 0.9, Math.sin(a) * 5.0], parent: this.drum }); }
    mesh(Lp(sausage([[0, 10.5, 6.6], [0, 10.6, 8.2]], [1.0, 1.0], { seg: 12, steps: 4, capSteps: 2 }), 0.02, 1, 614), M.lid, { parent: this.drum });
    mesh(ball(0.55, 1.4, 0.7, 0.4, 12), M.lamp, { pos: [0, 15.4, 5.4], parent: this.drum, cast: false });
    this.hose = mesh(new THREE.BufferGeometry(), M.hose, { parent: scene });
  }
  set(x, z, yaw, alpha) { this.group.position.set(x, 0, z); this.group.rotation.set(0, yaw, 0); this.stick.rotation.set(-alpha, 0, 0); this.group.updateMatrixWorld(true); }
  setDrum(x, z, yaw) { this.drum.position.set(x, 0, z); this.drum.rotation.set(0, yaw, 0); this.drum.updateMatrixWorld(true); }
  /** side −1: the top hand on the grip; +1 the lower hand on the wand */
  grip(side) { return this.stick.localToWorld(V(side < 0 ? [0, 28.8, 0] : [0, 26.0, 0])).toArray(); }
  hoseUpdate() {
    const a = this.stick.localToWorld(V([0, 31.2, -1.9])).toArray(), b = this.drum.localToWorld(V([0, 10.6, 8.4])).toArray();
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const pts = [a, add3(a, [0, 2.5, 0]), add3(mix(a, b, 0.4), [0, 4 - d * 0.05, 0]), add3(mix(a, b, 0.75), [0, 2, 0]), add3(b, [0, 1.2, 0]), b];
    const n = 90, radii = Array.from({ length: n }, (_, i) => 0.78 + 0.13 * Math.cos(i * Math.PI));
    const curve = new THREE.CatmullRomCurve3(pts.map(V), false, 'centripetal'), sp = curve.getSpacedPoints(n - 1).map(v => v.toArray());
    this.hose.geometry.dispose(); this.hose.geometry = sausage(sp, radii, { seg: 12, steps: 360, capSteps: 2 });
  }
}

// ------------------------------------------------------------------ build the cast
const car = buildCar(); scene.add(car);
car.traverse(o => { if (o.isMesh) o.castShadow = false; });
// version C: the TESLUR ROBOT janitor — the kit's figure rebuilt as a white-and-black humanoid with slim limbs,
// a white helmet, and the traced Toko face on its glossy face plate (?mask=black: a black plate, grey face; grey: the reverse)
const IS_C = VER === 'C', MASKV = (Q.get('mask') || 'black').toLowerCase();
const RC = {
  hoodie: GB('#f2f2ef', { rough: 0.3, thumb: 0.022, thumbCell: 2.0, tool: 0.35, mottle: 0.03, specks: 0.06, clearcoat: 0.35, clearcoatRough: 0.3 }),
  black: GB('#141416', { rough: 0.3, thumb: 0.012, thumbCell: 1.6, clearcoat: 0.5, clearcoatRough: 0.25, specks: 0 }),
  plate: MASKV === 'grey' ? GB('#8d9299', { rough: 0.22, thumb: 0.01, specks: 0, clearcoat: 0.9, clearcoatRough: 0.12 })
                          : GB('#07080a', { rough: 0.08, metal: 0.3, thumb: 0.004, specks: 0, noBoil: true, clearcoat: 1.0, clearcoatRough: 0.06 }),
  face: MASKV === 'grey' ? GB('#0d0e10', { rough: 0.3, thumb: 0.01, specks: 0 })
                         : GB('#a7adb4', { rough: 0.3, thumb: 0.012, specks: 0, emissive: '#3a4048', emissiveIntensity: 0.7 }),
};
Object.assign(RC, { hoodie2: RC.hoodie, cuff: RC.black, jeans: RC.hoodie, shoes: RC.hoodie, sole: RC.black, glove: RC.black, hair: RC.hoodie, strap: RC.black, string: RC.black, aglet: RC.black, maskDisc: RC.plate, maskInk: RC.face });
const toko = IS_C ? new Toko(RC, { armR: 1.3, legR: 1.75, torsoW: 5.1, torsoD: 3.9 }) : new Toko(TJ); scene.add(toko.group);
toko.hood.visible = false; toko.pocket.visible = false;   // a coverall (or a robot): no hood strings, no kangaroo pocket
const joints = [];
if (IS_C) {
  toko.head.children.forEach(c => { if (c.material === RC.hair || c.material === RC.strap) c.visible = false; });
  toko.collar.material = RC.black; toko.parts.hips.material = RC.black;
  // the helmet: a white shell round the face plate, a black rim to the plate, a black neck
  mesh(lumpy(ball(4.5, 1.0, 1.05, 0.92), 0.04, 0.5, 1301), RC.hoodie, { pos: [0, 0.3, -0.6], parent: toko.head });
  mesh(lumpy(new THREE.TorusGeometry(3.98, 0.3, 10, 56), 0.02, 1, 1302), RC.black, { pos: [0, -0.2, toko.mask.position.z + 0.45], parent: toko.head });
  mesh(lumpy(sausage([[0, -3.0, -0.6], [0, -5.0, -0.4]], [1.5, 1.6], { seg: 16, steps: 6 }), 0.03, 1, 1303), RC.black, { parent: toko.head });
  // black servo joints at shoulders, elbows and knees
  for (let i = 0; i < 6; i++) joints.push(mesh(lumpy(ball(i < 2 ? 1.9 : 1.5, 1, 1, 1, 18), 0.03, 1, 1310 + i), RC.black, { parent: scene }));
}
const muffs = new Muffs(EM, toko.head);
const vac = new Canister(VM);
// the janitor's kit, riding the torso: belt with pouches and a red rag, a name patch and a chest pocket
const waist = new THREE.Group(), chest = new THREE.Group(); scene.add(waist, chest);
mesh(lumpy(new THREE.TorusGeometry(5.0, 0.62, 10, 44).rotateX(Math.PI / 2).scale(1.2, 1, 1.0), 0.03, 0.8, 650), TJ.belt, { parent: waist });
mesh(lumpy(new RoundedBoxGeometry(1.8, 1.4, 0.5, 1, 0.2), 0.02, 1, 651), TJ.buckle, { pos: [0, 0, 5.05], parent: waist });
for (const s of [-1, 1]) mesh(lumpy(new RoundedBoxGeometry(2.4, 2.6, 1.6, 2, 0.5), 0.04, 0.8, 652 + s), TJ.belt, { pos: [s * 5.6, -0.8, 1.6], rot: [0, s * 0.5, 0], parent: waist });
mesh(lumpy(sausage([[-5.4, -0.2, -2.6], [-5.9, -2.8, -2.9], [-5.6, -5.4, -2.5], [-6.1, -7.0, -2.9]], [[1.6, 0.45], [1.8, 0.4], [1.7, 0.42], [1.3, 0.35]], { seg: 12, steps: 24, up: [1, 0, 0.3] }), 0.12, 0.8, 655), TJ.rag, { parent: waist });
if (!IS_C) {
  mesh(lumpy(ball(1, 1.5, 0.95, 0.18, 18), 0.02, 1, 656), TJ.patch, { pos: [2.6, 0.5, 0], parent: chest });
  mesh(lumpy(new RoundedBoxGeometry(2.6, 2.6, 0.5, 2, 0.3), 0.03, 0.8, 657), TJ.hoodie2, { pos: [-2.5, -0.2, 0], parent: chest });
  mesh(sausage([[-2.1, 0.6, 0.35], [-2.0, 2.0, 0.3]], [0.14, 0.14], { seg: 6, steps: 3, capSteps: 2 }), GB('#d8262e'), { parent: chest, cast: false });
}

// cotton-wool puffs: a pool of clusters, placed from the emitters each pose
function cottonGeo(seed) {
  const r = rng(300 + seed), parts = [], n = 6 + (r() * 4 | 0);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, b = r() * 3.14, d = i ? 0.55 + r() * 0.4 : 0, rr = i ? 0.48 + r() * 0.38 : 0.82;
    const g = ball(rr, 1, 0.88, 1, 16); g.translate(Math.cos(a) * Math.sin(b) * d, Math.cos(b) * d * 0.7, Math.sin(a) * Math.sin(b) * d);
    parts.push(lumpy(g, 0.05, 1.6, 300 + seed * 13 + i));
  }
  return mergeGeometries(parts);
}
const PUFF_GEOS = Array.from({ length: 10 }, (_, i) => cottonGeo(i));
const puffs = Array.from({ length: 220 }, (_, i) => { const m = mesh(PUFF_GEOS[i % 10], PF.cotton, { parent: scene, cast: false }); m.visible = false; return m; });

// ------------------------------------------------------------------ light: black night, cold floods on the concrete, red LED spill, a work light on the janitor
scene.add(new THREE.HemisphereLight('#26304a', '#000000', 0.16));
function spot(color, I, pos, target, angle, pen, shadow = 0) {
  const l = new THREE.SpotLight(color, I, 0, angle, pen, 2); l.position.set(...pos); l.target.position.set(...target); scene.add(l, l.target);
  if (shadow) { l.castShadow = true; l.shadow.mapSize.set(shadow, shadow); l.shadow.bias = -0.0002; l.shadow.normalBias = 0.02; l.shadow.camera.near = 30; l.shadow.camera.far = 1600; }
  return l;
}
const RAMP_MID = toWorld(20, 66, 0);
spot('#d8e2ff', 190000, [330, 200, -520], toWorld(RP.R1 + 16, 66, 0), 0.24, 0.6);                   // a side light raking the truss
spot('#eef3ff', 420000, [-170, 300, -330], RAMP_MID, 0.3, 0.55, 2048);                  // the main flood on the face
spot('#e6eeff', 160000, [210, 70, -470], toWorld(-4, 10, 0), 0.24, 0.6);                 // a low flood on the foot and run-in
spot('#f4f6ff', 230000, [-80, 6, -520], toWorld(-26, 132, 0), 0.24, 0.6);                // up from the ground onto the overhang's underside
for (const s of [-1, 1]) for (const ss of [10, A1 + 6, S_UP + 50]) { const r = rampAt(ss); const p = add3(add3(r.P, mul3(WD, s * (RP.width / 2 + 7))), mul3(r.N, 4)); const l = new THREE.PointLight('#ff2414', 120, 26, 2); l.position.set(...p); scene.add(l); }
{ const b = toWorld(-6, 4, -RP.width / 2 - 22); const l = new THREE.PointLight('#5fb0ff', 900, 70, 2); l.position.set(...b); scene.add(l); }
// the janitor: a warm work light from front-left, and a cold searchlight rim from behind-right
const JK = spot('#ffd9ab', 110000, [-120, 90, L.tokoZ + 170], [-6, 30, L.tokoZ], 0.42, 0.7, 1024);
const JR = spot('#86c4ff', 70000, [130, 120, L.tokoZ - 150], [-6, 34, L.tokoZ], 0.3, 0.6);
const JR2 = spot('#ffd3a0', 12000, [-90, 40, L.tokoZ - 120], [-6, 26, L.tokoZ], 0.35, 0.7);

// ------------------------------------------------------------------ the timeline (global seconds). Everything moves on ONES; the clay boils at 12 Hz.
// The gag: the car and the janitor's vacuum are ONE thing. The car climbs while his vacuum runs (on just before he
// walks in), drops back down the instant he walks out of frame with it, climbs again when he comes back — and
// coughs the moment he stops and switches it off.
const TL = {
  car: { up1: 1.5, mid: 5.0, resume: 7.0, top: 10.0, down: 12.0, foot: 13.6, up2: 15.0, lip: 19.0 },
  jetsOn: 19.6, jetsOff: 21.8,
  vacOn1: 1.5, enter1: 2.5, exit1: 12.0, vacOn2: 15.0, enter2: 15.4, stop: 22.0, vacOff: 22.0, peek: 22.1, cam: 23.3,
};
// the cough — puff … puff-puff … long wheeze … big … small. Each stutter throws clay smoke and the car hiccups.
const COUGH = [
  { t: 22.0, size: 'small' },
  { t: 22.57, size: 'medium' },
  { t: 22.81, size: 'medium' },
  { t: 23.4, size: 'wheeze', dur: 0.85 },
  { t: 24.53, size: 'large' },
  { t: 25.07, size: 'small' },
];
const CSZ = {   // puffs, puff size range (× clay unit), the hiccup's drop in cm (2 cm = 1 ft; 3.3–6.6 cm = 0.5–1 m), the G spike
  small: { n: 3, s: [1.8, 2.6], drop: 3.4, g: 1.3 }, medium: { n: 5, s: [2.4, 3.4], drop: 4.8, g: 1.9 },
  large: { n: 8, s: [3.2, 4.6], drop: 6.6, g: 2.6 }, wheeze: { n: 18, s: [1.2, 2.0], drop: 5.2, g: 0.5 },
};
const S_MID = A1 + (68 - RP.R1);   // half way up: on the vertical, pitch 90, ≈ half the ramp's height
const inOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function carS(t) {
  const T = TL.car;
  if (t < T.up1) return S_PARK;
  if (t < T.mid) return lerp(S_PARK, S_MID, inOut(clamp((t - T.up1) / (T.mid - T.up1))));
  if (t < T.resume) return S_MID + Math.exp(-(t - T.mid) * 7) * Math.sin((t - T.mid) * 26) * 0.6;
  if (t < T.top) return lerp(S_MID, S_TOP, inOut(clamp((t - T.resume) / (T.top - T.resume))));
  if (t < T.down) return S_TOP + Math.exp(-(t - T.top) * 7) * Math.sin((t - T.top) * 26) * 0.8;
  if (t < T.foot) return lerp(S_TOP, S_PARK, smooth(T.down, T.foot, t));
  if (t < T.up2) return S_PARK;
  return lerp(S_PARK, S_LIP, Math.pow(clamp((t - T.up2) / (T.lip - T.up2)), 1.45));
}
// the flight, as the broadcast: off the top upside down and nose-up, a half roll upright, level on the jets,
// a slow turn that banks the canopy toward us. [t − lip, along −U, up, screen-left, yaw (250 = heading −U), pitch, roll]
const LIP = (() => { const r = rampAt(S_LIP); return add3(r.P, mul3(r.N, 0.7)); })();
const FLY = [
  [0.0, 0, 0, 0, 250, -6, 180],
  [0.45, 16, 1, 2, 250, 12, 150],
  [0.9, 26, -7, 5, 250, 6, 70],
  [1.35, 32, -16, 8, 246, 0, -8],
  [2.0, 34, -24, 10, 222, 0, -36],
  [2.7, 34, -28, 12, 190, 0, -32],
  [3.4, 34, -32, 12, 194, 0, -28],
  [4.4, 34, -40, 12, 204, 0, -30],
  [5.4, 34, -48, 13, 210, 0, -30],
  [6.9, 34, -58, 14, 212, 0, -30],
];
/** the hiccup of one cough at age a: [drop cm, pitch kick deg, bank kick deg] */
function hiccup(c, a) {
  const z = CSZ[c.size];
  if (c.size === 'wheeze') {
    const d = c.dur + 0.7; if (a < 0 || a > d + 0.6) return [0, 0, 0];
    const sag = Math.sin(Math.PI * clamp(a / d)) * z.drop, wob = Math.sin(a * 23) * Math.exp(-Math.max(0, a - c.dur) * 4) * 0.9;
    return [sag + wob, Math.sin(a * 17) * 3 * (a < c.dur ? 1 : 0), Math.sin(a * 11) * 4];
  }
  if (a < 0 || a > 1.6) return [0, 0, 0];
  const drop = z.drop * (a < 0.12 ? a / 0.12 : Math.exp(-(a - 0.12) * 3.4));
  const kick = Math.exp(-a * 5) * Math.sin(a * 16);
  return [drop, kick * (6 + z.drop * 1.6) * (hash(c.t * 7) < 0.5 ? -1 : 1), kick * 9 * (hash(c.t * 5) - 0.5)];
}
function carState(t) {
  let pos, q, pitchWob = 0, bank = 0, phi = 0;
  const T = TL.car;
  if (t < T.lip) {
    const s = carS(t), r = rampAt(s), sag = s < S_ARC ? 2.2 * clamp(s / 10) : lerp(2.2, 0.7, clamp((s - S_ARC) / 10));
    pos = add3(r.P, mul3(r.N, sag)); phi = r.ph / DEG;
    q = basisQ(r.T, r.N);
    const hold = t > T.mid && t < T.resume ? t - T.mid : t > T.top && t < T.down ? t - T.top : -1;
    if (hold >= 0) {   // held by its own suction: a settle, then a faint tremble
      const w = Math.exp(-hold * 5) * Math.sin(hold * 20) * 1.2 + Math.sin(hold * 31) * 0.18 + Math.sin(hold * 47) * 0.1;
      q.multiply(new THREE.Quaternion().setFromAxisAngle(V([0, 0, 1]), w * DEG));
    }
  } else {
    const k = keyed(FLY, t - T.lip);
    pos = add3(add3(add3(LIP, mul3(U, -k[0])), mul3(UP, k[1])), [-k[2], 0, 0]);
    if (t > T.lip + 1.4) { pos[1] += Math.sin(t * 5.3) * 0.8; bank += Math.sin(t * 3.7) * 2.5; }
    for (const c of COUGH) { const [d, pk, bk] = hiccup(c, t - c.t); pos[1] -= d; pitchWob += pk; bank += bk; }
    phi = 180 + k[4];
    q = new THREE.Quaternion().setFromAxisAngle(V([0, 1, 0]), k[3] * DEG)
      .multiply(new THREE.Quaternion().setFromAxisAngle(V([0, 0, 1]), (k[4] + pitchWob) * DEG))
      .multiply(new THREE.Quaternion().setFromAxisAngle(V([1, 0, 0]), (k[5] + bank) * DEG));
  }
  return { pos, q, phi, onRamp: t < T.lip };
}
function carTravel(t) { return t < TL.car.lip ? carS(t) : S_LIP + (t - TL.car.lip) * 30; }
/** the car's suction, 0–1 — the composer's vacuum-cleaner curve (it is his vacuum) */
function suction(t) {
  const T = TL.car;
  if (t < T.up1 || t >= CARD_T) return 0;
  if (t < T.mid) return clamp(0.05 + 0.62 * Math.pow(smooth(T.up1, T.mid, t), 0.8));
  if (t < T.resume) return 0.67 + 0.015 * Math.sin(t * 9);
  if (t < T.top) return 0.67 + 0.33 * smooth(T.resume, T.top, t);
  if (t < T.down) return 1;
  if (t < T.down + 0.12) return 1 - (t - T.down) / 0.12;   // he walked out of frame with it: gone
  if (t < T.up2) return 0;
  if (t < T.lip) return clamp(0.08 + 0.92 * smooth(T.up2, T.lip, t));
  if (t < TL.stop) return 0.9;
  let v = lerp(0.9, 0.3, smooth(TL.stop, CARD_T, t));
  for (const c of COUGH) { const a = t - c.t, d = c.size === 'wheeze' ? c.dur : 0.25; if (a > -0.02 && a < d + 0.3) v *= c.size === 'wheeze' ? 0.35 + 0.15 * Math.sin(a * 30) : 0.15 + 0.85 * smooth(0.05, d + 0.3, a); }
  return clamp(v);
}

// the janitor: two crossings at ONE even pace with a steady sweep, head down at his work — not paying attention.
// Pass 1 right → left (nozzle into frame at 2.5, the canister's last edge out at 12.0); off-screen he goes round;
// pass 2 left → right from 15.4 until he stops dead at 22.0, wherever he is.
const WALK_YAW = 1.3;
const PACE = 15.60, X1 = 73.63, X2 = -74.2, SWAP = 13.8;   // cm/s, and his body x when the nozzle touches the frame edge (calibrated)
function tokoState(t) {
  const walk = PACE * t / 23;
  if (t < SWAP) return { x: X1 - PACE * (t - TL.enter1), yaw: -WALK_YAW, mode: 0, walk, pass: 1, t };
  if (t < TL.stop) return { x: X2 + PACE * (t - TL.enter2), yaw: WALK_YAW, mode: 0, walk, pass: 2, t };
  return { x: X2 + PACE * (TL.stop - TL.enter2), yaw: lerp(WALK_YAW, 0.45, ease(TL.stop, TL.stop + 0.45, t)), mode: 2, walk: PACE * TL.stop / 23, pass: 2, t };
}
const STAND = { knee: [0, -10.4, 0.9], foot: [0, -20.75, 0.6] };
const SWEEP_T = 1.15;   // one left-right sweep of the floor nozzle, steady throughout
/** C's servo: a quick move that stops dead with a tiny overshoot; B keeps the soft clay ease */
function ease(a, b, x) {
  if (!IS_C) return smooth(a, b, x);
  const u = clamp((x - a) / (b - a)), v = 1 - Math.pow(1 - u, 2.4);
  return x > b ? 1 + 0.05 * Math.exp(-(x - b) * 14) * Math.sin((x - b) * 36) : v;
}
const sweepOf = (t) => { const v = Math.sin(t * Math.PI * 2 / SWEEP_T); return IS_C ? Math.sign(v) * Math.pow(Math.abs(v), 0.45) : v; };
function walkLegs(ph) {
  const kb = IS_C ? 0.55 : 1;   // the robot keeps its knees stiffer
  return [0, 1].map(i => { const q = (ph + i * 0.5) * Math.PI * 2, sw = Math.sin(q), up = Math.max(0, Math.cos(q)); return { knee: [0, -10.2 + up * 1.2 * kb, 0.9 + sw * 3.0 + up * 2.0 * kb], foot: [0, -20.6 + up * 1.8 * kb, 0.6 + sw * 5.6], shoePitch: sw * 0.25 * kb }; });
}
function tokoPose(t) {
  const st = tokoState(t), Y = st.yaw, Rf = R_(Y);
  const hip0 = [st.x, 21.5, L.tokoZ];
  const P = { hip: hip0, yaw: Y, lean: 0.1, side: 0, knee: STAND.knee, foot: STAND.foot, hp: 0.3, hr: 0, hy: clamp(-Y * 0.75, -0.95, 0.95), palm: [Rf([0, -1, -0.3]), Rf([0, -1, -0.3])] };
  let lift = 0, vacPose;
  if (st.mode !== 2) {
    const ph = st.walk, sweep = sweepOf(t);
    P.legs = walkLegs(ph);
    P.hip = add3(hip0, [0, -Math.abs(Math.cos(ph * Math.PI * 2)) * 0.6 + 0.3, 0]);
    P.lean = 0.22; P.side = sweep * 0.04; P.hy += sweep * 0.05;   // head down at the floor, never looking up
    vacPose = { d: 24, alpha: 23 * DEG, side: sweep * 5.5, yaw: sweep * 0.36 };
  } else {
    // 22.0 he stops dead and stands the wand up; 22.1–22.5 one cup peeks a little off the ear and he looks UP at the car;
    // 23.3–23.7 only his head turns, to look straight into the camera; he holds it, breathing (B) or idling (C)
    const S = TL.stop, k = ease(S, S + 0.45, t), kp = ease(TL.peek, TL.peek + 0.4, t), kc = ease(TL.cam, TL.cam + 0.4, t);
    lift = 0.3 * ease(TL.peek + 0.1, TL.peek + 0.4, t);
    const br = Math.sin((t - S) * 2.3) * smooth(S + 0.6, S + 1.1, t) * (IS_C ? 0.35 : 1);
    const legs0 = walkLegs(PACE * S / 23), sweep0 = sweepOf(S);
    P.legs = [0, 1].map(i => ({ knee: mix(legs0[i].knee, [0, -10.4, i ? 0.6 : 1.3], k), foot: mix(legs0[i].foot, [0, -20.75, i ? -0.4 : 1.6], k), shoePitch: lerp(legs0[i].shoePitch, 0, k) }));
    P.lean = lerp(0.22, 0.06, k) + br * 0.01; P.breathe = br * 0.8;
    const hyWalk = clamp(-Y * 0.75, -0.95, 0.95);
    // the car hangs upper-left of him on screen: the face turns well off to screen-left and tips up to it (the read is
    // screen direction), then swings back level and square to the lens — a 1-rad turn and a 0.6-rad lift, so it reads
    P.hy = lerp(lerp(hyWalk, -1.45, kp), -0.45, kc);                       // toward the car (screen-left), then the camera
    P.hp = lerp(lerp(lerp(0.3, 0.12, k), -0.62, kp), 0.0, kc) + br * 0.015; // head lifts to the car, then levels at us
    P.hr = lerp(lerp(0, 0.18, kp), 0.03, kc);
    P.hip = add3(hip0, [0, br * 0.1, 0]);
    vacPose = { d: lerp(24, 7, k), alpha: lerp(23, 0, k) * DEG, side: lerp(sweep0 * 5.5, -13, k), yaw: lerp(sweep0 * 0.36, 0, k) };
    P.kStop = k; P.kReach = ease(S, S + 0.3, t); P.kc = kc; P.br = br;
  }
  return { P, st, lift, vacPose };
}

/** the canister on a leash: towed when the hose goes taut, nudged behind him when he walks past it; set behind him
 *  again when he goes round off-screen. Integrated once at 96 Hz, so any frame is still a pure function of t. */
let DRUM_PATH = null;
function drumAt(t) {
  if (!DRUM_PATH) {
    DRUM_PATH = [];
    let p = null, yaw = 0, prev = null, pass = 0;
    for (let i = 0; i <= Math.ceil(END_T * 96); i++) {
      const st = tokoState(i / 96), c = [st.x, 0, L.tokoZ];
      if (st.pass !== pass) { pass = st.pass; p = add3(c, [st.yaw > 0 ? -20 : 20, 0, -3]); prev = p; yaw = st.yaw + 0.4; }
      const d = sub3(p, c), dist = Math.hypot(d[0], d[2]);
      if (dist > 21) p = add3(c, mul3(d, 21 / dist));
      else if (dist < 14) { const n = nrm3(add3(d, [0, 0, -7])); p = add3(c, mul3(n, 14)); }
      const mv = sub3(p, prev); if (Math.hypot(mv[0], mv[2]) > 1e-3) yaw = lerp(yaw, Math.atan2(mv[0], mv[2]), 0.08);
      DRUM_PATH.push([p[0], p[2], yaw, Math.hypot(mv[0], mv[2]) * 96]); prev = p;
    }
  }
  const f = clamp(t * 96, 0, DRUM_PATH.length - 1.001), i = Math.floor(f), k = f - i, a = DRUM_PATH[i], b = DRUM_PATH[i + 1];
  return a.map((v, j) => lerp(v, b[j], k));
}

// ------------------------------------------------------------------ pose everything at global time t
function poseCar(t) {
  const cs = carState(t);
  car.position.set(...cs.pos); car.quaternion.copy(cs.q); car.scale.setScalar(L.car.scale);
  const roll = carTravel(t) / (3.65 * L.car.scale);
  for (const w of car.userData.wheels) w.rotation.z = -roll;
  return cs;
}
function poseToko(t) {
  const { P, st, lift, vacPose } = tokoPose(t);
  const Y = P.yaw, Rf = R_(Y), at = (v) => add3(P.hip, Rf(v));
  muffs.set(lift);
  const vx = add3([st.x, 0, L.tokoZ], Rf([vacPose.side || 0, 0, vacPose.d]));
  vac.set(vx[0], vx[2], Y + (vacPose.yaw || 0), vacPose.alpha);
  // the canister rolls after him on its hose, rocking a little as it goes
  const dr = drumAt(t);
  vac.setDrum(dr[0], dr[1], dr[2]);
  vac.drum.rotation.z = Math.sin(t * 9.3) * 0.035 * clamp(dr[3] / 20); vac.drum.position.y = Math.abs(Math.sin(t * 9.3)) * 0.15 * clamp(dr[3] / 20);
  const eb = IS_C ? 0.4 : 1;   // the robot's arms stay nearly straight
  const gR = vac.grip(-1), gL = vac.grip(1);
  const elGripR = add3(mix(at([-4.7, 13.4, 0.6]), gR, 0.5), Rf([-2.6 * eb, -2.2 * eb, -1.0 * eb]));
  const elGripL = add3(mix(at([4.7, 13.4, 0.6]), gL, 0.5), Rf([2.6 * eb, -2.2 * eb, -1.0 * eb]));
  if (st.mode !== 2) {
    P.hdR = gR; P.hdL = gL; P.elR = elGripR; P.elL = elGripL;
    P.palm = [Rf([0.3, -1, -0.2]), Rf([-0.3, -1, -0.2])];
  } else {
    // the right hand goes from the wand to the right cup and holds it a little off the ear; the left drops to his side
    const kr = P.kReach, kc = P.kc, br = P.br || 0;
    toko.pose({ ...P, hdR: gR, elR: elGripR, hdL: gL, elL: elGripL });
    toko.group.updateMatrixWorld(true);
    const cup = muffs.cups[0].localToWorld(V([-1.6, -2.6, -0.4])).toArray();
    P.hdR = mix(gR, cup, kr); P.elR = mix(elGripR, at([-10.0, 8.4 + br * 0.2, 1.2]), kr);
    P.hdL = mix(gL, at([6.5, -0.6 + br * 0.15, 2.6]), kr); P.elL = mix(elGripL, at([6.9, 6.0, 1.0]), kr);
    P.palm = [Rf(mix([0.3, -1, -0.2], [0.6, 0.8, 0.0], kr)), Rf(mix(mix([-0.3, -1, -0.2], [0, -1, 0.2], kr), [0.35, -0.5, 0.8], kc * 0.5))];
  }
  toko.pose(P);
  vac.hoseUpdate();
  if (IS_C) {
    const A = toko.anchor;
    [A.S[0], A.S[1], P.elR, P.elL].forEach((p, i) => joints[i].position.set(...p));
    [-1, 1].forEach((sg, i) => { const LG = (P.legs && P.legs[i]) || {}; joints[4 + i].position.set(...add3(P.hip, Rf(add3([sg * 3.0, 0, 0], LG.knee || P.knee)))); });
  }
  // the coverall's kit rides the torso
  const A = toko.anchor, a = P.lean ?? 0.1, sd = P.side || 0;
  waist.position.set(...add3(A.H0, [0, 1.2, 0])); waist.rotation.set(a * 0.4, Y, -sd * 0.4, 'YXZ');
  const fwd = Rf([0, -Math.sin(a * 0.8), Math.cos(a * 0.8)]), ch = mix(A.H1, A.H2, 0.55);
  chest.position.set(...add3(ch, mul3(fwd, 4.05))); chest.rotation.set(a * 0.8, Y, -sd * 0.6, 'YXZ');
  const vis = st.x > -110 && st.x < 120; toko.group.visible = vis; waist.visible = vis; chest.visible = vis; joints.forEach(j => { j.visible = vis; });
}
function pickPuffs(t) {
  const list = [], step = 1 / 24;
  const nozzleWorld = (te, i) => { const cs = carState(te), n = car.userData.nozzles[i]; return { p: V(n.p).multiplyScalar(L.car.scale).applyQuaternion(cs.q).add(V(cs.pos)), d: V(n.d).normalize().applyQuaternion(cs.q) }; };
  const born = (te, kind, o, vel, size, life, seed, rise = 4, grow = 0, wind = 0) => {
    const age = t - te; if (age < 0 || age > life) return;
    const k = age / life, damp = (1 - Math.exp(-age * 3.2)) / 3.2;
    const p = o.clone().addScaledVector(vel, damp).add(V([-wind * age, rise * age, wind * 0.3 * age]));
    const s = size * (0.3 + 0.7 * smooth(0, grow ? 0.22 : 0.3, k * (grow ? life : 1) / (grow ? 1 : 1))) * (1 + grow * age) * (1 - 0.9 * smooth(0.78, 1, k));
    list.push({ p, s, kind, seed, stretch: kind === 'jet' ? 2.4 : 1 });
  };
  // the four cold-gas jets: straight down, pale blue-white columns
  for (let te = Math.floor((t - 0.6) / step) * step; te <= t + 1e-6; te += step) {
    const n = Math.round(te * 24);
    if (te > TL.jetsOn && te < TL.jetsOff) for (let i = 0; i < 4; i++) { const z = nozzleWorld(te, i); for (const sub of [0, 0.5]) born(te + sub * step, 'jet', z.p, V([0, -1, 0]).multiplyScalar(170 + hash(n + i + sub) * 30).add(V([(hash(n * 3 + i) - 0.5) * 5, 0, (hash(n * 5 + i) - 0.5) * 5])), 0.95 + hash(n * 7 + i) * 0.4, 0.42, n * 4 + i, 0); }
  }
  // the cough: each stutter is a choked jet flash, then a burst of grey-white clay smoke that drifts and slowly grows
  COUGH.forEach((c, ci) => {
    if (t < c.t - 0.1) return;
    const z = CSZ[c.size], span = c.size === 'wheeze' ? c.dur : 0.06 * z.n;
    for (let i = 0; i < 4; i++) for (let f = 0; f < 3; f++) { const te = c.t - 0.09 + f * 0.03; const nz = nozzleWorld(te, i); born(te, 'jet', nz.p, V([0, -1, 0]).multiplyScalar(120), 0.9, 0.22, 7000 + ci * 40 + i * 3 + f, 0); }
    for (let j = 0; j < z.n; j++) {
      const te = c.t + (j / Math.max(1, z.n - 1)) * span + (hash(ci * 31 + j) - 0.5) * 0.03, i = Math.floor(hash(ci * 9 + j) * 4);
      const nz = nozzleWorld(te, i), h = (k) => hash(ci * 97 + j * 13 + k);
      const kind = h(1) < 0.25 ? 'dark' : h(2) < 0.6 ? 'grey' : 'cotton';
      const sp = c.size === 'wheeze' ? 22 : 38 + z.n * 4;
      born(te, kind, nz.p, V([(h(3) - 0.5) * sp, -18 - h(4) * sp * 0.6, (h(5) - 0.5) * sp * 0.7]), lerp(z.s[0], z.s[1], h(6)), 5.0, 8000 + ci * 50 + j, 2.2, 0.16, 3.5);
    }
  });
  return list;
}
function posePuffs(t) {
  const list = pickPuffs(t);
  puffs.forEach((m, i) => {
    const p = list[i];
    if (!p) { m.visible = false; return; }
    m.visible = true; m.position.copy(p.p); m.scale.set(p.s, p.s * (p.stretch || 1), p.s);
    if (p.stretch > 1) m.rotation.set(0, hash(p.seed) * 6, 0); else m.rotation.set(hash(p.seed) * 6, hash(p.seed + 1) * 6, hash(p.seed + 2) * 6 + (t - 14) * 0.15);
    m.geometry = PUFF_GEOS[Math.abs(p.seed) % 10];
    m.material = PF[p.kind];
  });
}
let lastKey = null, CAM_OVERRIDE = null;
function poseAll(t) {
  setBoil(Math.floor(t * 12 + 1e-6));   // the clay re-lumps at 12 Hz; everything else moves on ones
  poseCar(t);
  poseToko(t);
  posePuffs(t);
  const run2 = t >= TL.car.up2;
  const breathe = t < TL.car.up1 + 0.3 ? 0.78 + 0.22 * (0.5 + 0.5 * Math.cos(t * 2.4)) * (1 - smooth(TL.car.up1 - 0.2, TL.car.up1 + 0.3, t)) + 0.22 * smooth(TL.car.up1 - 0.2, TL.car.up1 + 0.3, t) : 1;
  const red = [2.4 * breathe, 0.1 * breathe, 0.08 * breathe];
  SM.ledRed.color.setRGB(...red);
  SM.ledLow.color.setRGB(...(run2 ? SM.ledWhite : red));
  runTwo.forEach(o => { o.visible = run2; });
  scene.updateMatrixWorld(true);
}

// ------------------------------------------------------------------ the camera: the livestream wide, locked off, a breath of drift
const TUNE = { radScale: 1.5, maxBlur: 16, noTile: false, exp: 1.0, focus: 'set', ap: 1.6, hud: true, gauges: true, bugY: 74 };   // v3 (owner, 17 Oct: "no need for gauges"): render with {gauges:false, bugY:200} — the bug clears Instagram's header
function camAt(t) {
  const c = L.cam, d = c.drift;
  const pos = add3(c.pos, [Math.sin(t * 0.21) * 0.4 * d, Math.sin(t * 0.17 + 1) * 0.2 * d, 0]);
  const p = (c.pitch + Math.sin(t * 0.13) * 0.03 * d) * DEG, y = (c.yaw + Math.sin(t * 0.11 + 2) * 0.04 * d) * DEG;
  const look = add3(pos, [Math.sin(y) * Math.cos(p) * 1000, Math.sin(p) * 1000, -Math.cos(y) * Math.cos(p) * 1000]);
  const f = TUNE.focus === 'toko' ? Math.abs(L.tokoZ) - 4 : Math.abs(RP.foot[2]);
  return { pos, look, fov: c.fov, focusD: f, ap: TUNE.ap };
}
function grade(c, t) {
  return {
    focus: c.focusD, aperture: c.ap, maxBlur: TUNE.maxBlur, radScale: TUNE.radScale, noTile: TUNE.noTile,
    threshold: 1.5, knee: 0.5, bloomA: 0.2, bloomB: 0.12,
    exposure: TUNE.exp, vignette: 0.22, grain: 0.02, seed: t * 37 % 97,
    sat: 1.1, contrast: 1.08, lift: [0, 0, 0.004], gain: [1, 1, 1.02], toe: 0.05,
  };
}

// ------------------------------------------------------------------ the HUD and the stream bug, drawn as the broadcast draws them (renamed)
const SUCK_UP = [[0, 200], [2.4, 218], [32.6, 514], [74.7, 1573], [89.5, 3152], [129, 4520], [170, 4697], [190, 4700]];
const SUCK_DN = [[0, 978], [51.3, 3880], [97.8, 4708], [148, 4698], [190, 4697]];
const table = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0]) return lerp(T[i][1], T[i + 1][1], (x - T[i][0]) / (T[i + 1][0] - T[i][0])); return T[T.length - 1][1]; };
function hudState(t) {
  const cs = carState(t), alt = Math.max(0, cs.pos[1] - RP.foot[1]) / L.ft;
  const run2 = t >= TL.car.up2, pitch = cs.onRamp ? cs.phi : 0;
  const descending = t >= TL.car.down && t < TL.car.up2;
  let suction = descending ? lerp(table(SUCK_DN, pitch), 200, smooth(TL.car.down, TL.car.down + 0.6, t)) : table(SUCK_UP, pitch);
  if (t > TL.car.top && t < TL.car.down) suction = 4697 + Math.round(Math.sin(t * 9) * 2);
  if (t > TL.car.mid && t < TL.car.resume) suction += Math.round(Math.sin(t * 11) * 3);
  let g = 1.0;
  if (cs.onRamp && t > TL.car.up2) { const s = carS(t); g = s < 0 ? 1.0 + clamp((t - TL.car.up2) / 0.6) * 0.2 : s < A1 ? 1.5 : s < S_UP + 30 ? 0.9 : 1.1; }
  if (!cs.onRamp) { g = 0.3; for (const c of COUGH) { const a = t - c.t, d = c.size === 'wheeze' ? c.dur : 0.4; if (a >= 0 && a < d) g += CSZ[c.size].g * (c.size === 'wheeze' ? 0.5 + 0.5 * Math.sin(a * 19) : 1 - a / d); } }
  return { run2, pitch, alt: Math.max(0.1, alt), suction, g, attitude: cs.onRamp ? cs.phi : (t < TL.car.lip + 1.4 ? 180 : 0) };
}
function gauge(g, cx, cy, r, label, value, unit, frac) {
  g.save();
  g.lineCap = 'round';
  const a0 = Math.PI * 0.62, a1 = Math.PI * 2.38;
  g.strokeStyle = 'rgba(210,214,220,0.32)'; g.lineWidth = 3 * RES; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
  g.strokeStyle = '#ffffff'; g.lineWidth = 4.5 * RES; g.beginPath(); g.arc(cx, cy, r, a0, a0 + (a1 - a0) * clamp(frac)); g.stroke();
  g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `500 ${Math.round(15 * RES)}px Inter`; g.letterSpacing = `${(1.2 * RES).toFixed(1)}px`; g.fillStyle = 'rgba(235,238,242,0.85)'; g.fillText(label, cx, cy - r * 0.42);
  g.font = `300 ${Math.round(48 * RES)}px Inter`; g.letterSpacing = '0px'; g.fillStyle = '#ffffff'; g.fillText(value, cx, cy + r * 0.2);
  g.font = `500 ${Math.round(13 * RES)}px Inter`; g.letterSpacing = `${(1 * RES).toFixed(1)}px`; g.fillStyle = 'rgba(235,238,242,0.8)'; g.fillText(unit, cx, cy + r * 0.48);
  g.restore();
}
function carIcon(g, cx, cy, r, angle) {
  g.save();
  const gr = g.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, 'rgba(70,72,76,0.55)'); gr.addColorStop(1, 'rgba(20,20,22,0.55)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(200,204,210,0.25)'; g.lineWidth = 1.5 * RES; g.stroke();
  g.strokeStyle = 'rgba(200,204,210,0.22)'; g.beginPath(); g.ellipse(cx, cy + r * 0.25, r * 0.85, r * 0.22, 0, 0, Math.PI * 2); g.stroke();
  g.translate(cx, cy); g.rotate(-angle * DEG); const k = r / 60 * RES / RES;
  g.scale(k, k);
  g.fillStyle = '#e9ebee';
  g.beginPath(); [[-48, 6], [-49, -6], [-44, -11], [-14, -17], [6, -18], [22, -12], [50, -3], [51, 3], [36, 7], [-48, 7]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  g.fillStyle = '#1a1b1e'; g.beginPath(); [[-40, -10], [-12, -15.5], [6, -16], [18, -11.5], [-8, -9]].forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
  g.fillStyle = '#121214'; for (const x of [-30, 31]) { g.beginPath(); g.arc(x, 6, 8.5, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#5b5f66'; for (const x of [-30, 31]) { g.beginPath(); g.arc(x, 6, 4.5, 0, Math.PI * 2); g.fill(); }
  g.restore();
}
function topIcon(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.strokeStyle = 'rgba(235,238,242,0.8)'; g.lineWidth = 1.6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(0, -46); g.bezierCurveTo(14, -44, 19, -30, 19, -14); g.lineTo(20, 30); g.bezierCurveTo(20, 42, 12, 46, 0, 46); g.bezierCurveTo(-12, 46, -20, 42, -20, 30); g.lineTo(-19, -14); g.bezierCurveTo(-19, -30, -14, -44, 0, -46); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(0, -18); g.bezierCurveTo(10, -18, 12, -8, 11, 4); g.lineTo(0, 30); g.lineTo(-11, 4); g.bezierCurveTo(-12, -8, -10, -18, 0, -18); g.closePath(); g.stroke();
  g.fillStyle = 'rgba(235,238,242,0.85)'; for (const [x, y] of [[-22, -26], [22, -26], [-22, 27], [22, 27]]) { g.beginPath(); g.roundRect(x - 2.5, y - 7, 5, 14, 2); g.fill(); }
  g.restore();
}
function bug(g) {
  // the stream bug, two boxes as the broadcast draws it: a black box with an outline, then LIVE on grey
  const s = RES, x1 = 1040 * s, y = TUNE.bugY * s, h = 34 * s, w2 = 78 * s, w1 = 160 * s, x0 = x1 - w2 - w1;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(x0, y, w1, h);
  g.strokeStyle = 'rgba(235,238,242,0.9)'; g.lineWidth = 1.5 * s; g.strokeRect(x0 + 0.75 * s, y + 0.75 * s, w1 + w2 - 1.5 * s, h - 1.5 * s);
  g.fillStyle = '#c9ccd0'; g.fillRect(x1 - w2, y + 0.75 * s, w2 - 0.75 * s, h - 1.5 * s);
  g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = `500 ${Math.round(15 * s)}px Inter`; g.letterSpacing = `${(6 * s).toFixed(1)}px`; g.fillStyle = '#f2f3f5'; g.fillText('TESLUR', x0 + w1 / 2 + 3 * s, y + h / 2 + 1 * s);
  g.font = `600 ${Math.round(14 * s)}px Inter`; g.letterSpacing = `${(5 * s).toFixed(1)}px`; g.fillStyle = '#17181a'; g.fillText('LIVE', x1 - w2 / 2 + 2.5 * s, y + h / 2 + 1 * s);
  g.restore();
}
// portrait layout: the gauges in a row at the top (the bottom belongs to the janitor and the caption bar)
const HUD = { y: 250, r: 74, x: [150, 336, 744, 930] };
function drawHUD(t) {
  if (TUNE.gauges === false) { bug(g2d); return; }
  const g = g2d, s = RES, h = hudState(t);
  g.save();
  const X = HUD.x.map(v => v * s), Y = HUD.y * s, R = HUD.r * s;
  if (!h.run2) {
    gauge(g, X[0], Y, R, 'SUCTION', String(Math.round(h.suction)), 'KG', h.suction / 5000);
    carIcon(g, X[1], Y, R * 0.82, h.attitude);
    gauge(g, X[2], Y, R, 'PITCH', h.pitch < 100 ? h.pitch.toFixed(1) : String(Math.round(h.pitch)), 'DEG', h.pitch / 180);
  } else {
    gauge(g, X[0], Y, R, 'G-FORCE', h.g.toFixed(1), 'G', h.g / 3);
    carIcon(g, X[1], Y, R * 0.82, h.attitude);
    topIcon(g, X[2], Y + 4 * s, 0.95 * s);
  }
  gauge(g, X[3], Y, R, 'ALTITUDE', h.alt.toFixed(1), 'FT', h.alt / 70);
  g.restore();
  bug(g);
}

// ------------------------------------------------------------------ the end card: black, TESLUR in clay letters, "What?" in white type
const card = new THREE.Scene();
const cardCam = new THREE.PerspectiveCamera(30, W / H, 10, 3000);
const CARDM = {
  board: GB('#0b0b0c', { rough: 0.92, thumb: 0.015, thumbCell: 3, lump: 0.02, specks: 0.3, speckColor: '#1a1a1c', noBoil: true }),
  letters: surface({ color: '#efe9de', wrap: 0.35, wrapTint: '#ffe2c8', rough: 0.38, bump: 1.3, lump: 0.06, lumpF: 0.6, thumb: 0.06, thumbCell: 0.9, ridge: 0.09, tool: 1.2, grain: 0.004, grainF: 10, mottle: 0.1, specks: 0.5, speckColor: '#8a8478', roughVar: 0.12 }),
};
// v3 (owner, 17 Oct: "logo needs to be clay version of this" — the Tesla wordmark): squared bars with chamfered
// corners and the wordmark's tells — the T's bar floats over its stem, the E is three bars with no spine — and U, R
// drawn in the same hand, since the original has neither. Rolled clay, not the original's outlines.
const GLYPH = {
  T: { w: 7.4, s: [[[0, 9.35], [0.7, 10], [6.7, 10], [7.4, 9.35]], [[3.7, 8.35], [3.7, 0]]] },
  E: { w: 6.4, s: [[[0, 9.4], [0.65, 10], [6.4, 10]], [[0, 5], [6.4, 5]], [[0, 0.6], [0.65, 0], [6.4, 0]]] },
  S: { w: 6.6, s: [[[6.6, 10], [0.9, 10], [0, 9.1], [0, 5.95], [0.85, 5.1], [5.75, 5.1], [6.6, 4.25], [6.6, 0.9], [5.7, 0], [0, 0]]] },
  L: { w: 6.0, s: [[[0, 10], [0, 0.9], [0.9, 0], [6.0, 0]]] },
  U: { w: 6.6, s: [[[0, 10], [0, 0.9], [0.9, 0], [5.7, 0], [6.6, 0.9], [6.6, 10]]] },
  R: { w: 6.6, s: [[[0, 0], [0, 9.1], [0.9, 10], [5.7, 10], [6.6, 9.1], [6.6, 6.0], [5.7, 5.1], [1.2, 5.1]], [[3.6, 4.1], [6.6, 0]]] },
};
/** roll a word of clay snakes: glyphs are strokes in a 10-high box */
function word(text, { size = 1, r = 0.5, gap = 2.6, flat = 0.62, seed = 1 } = {}) {
  const geos = []; let x = 0;
  const total = [...text].reduce((a, ch) => a + GLYPH[ch].w, 0) + gap * (text.length - 1);
  [...text].forEach((ch, ci) => {
    const G = GLYPH[ch], ox = (x - total / 2) * size;
    const tf = ([px, py]) => [ox + px * size, py * size, r * flat * 0.9];
    G.s.forEach((st, si) => {
      const pts = st.map(tf);
      geos.push(lumpy(sausage(pts, pts.map((_, k) => r * (0.88 + 0.22 * hash(ci * 31 + si * 7 + k + seed))), { seg: 18, steps: Math.max(12, pts.length * 12), up: [0, 0, 1], flat, capSteps: 8 }), r * 0.12, 0.9 / r, seed * 100 + ci * 10 + si));
    });
    x += G.w + gap;
  });
  return mergeGeometries(geos);
}
const CARD_LAY = { D: 330, wordY: 0 };
let cardWord;
{
  mesh(new THREE.PlaneGeometry(900, 1300), CARDM.board, { parent: card, cast: false });
  cardWord = mesh(word('TESLUR', { size: 0.9, r: 0.95, gap: 4.6, seed: 3, flat: 0.6 }), CARDM.letters, { pos: [0, CARD_LAY.wordY - 4.5, 0], parent: card });
  cardWord.castShadow = true;
  card.add(new THREE.HemisphereLight('#e7ecf5', '#1a1a1c', 0.22));
  // a low raking key from the upper left, so every rolled snake gets a highlight, a shadow side and a cast shadow
  const k = new THREE.SpotLight('#fff4e6', 95000, 0, 0.5, 0.7, 2);
  k.castShadow = true; k.shadow.mapSize.set(2048, 2048); k.shadow.bias = -0.0002; k.shadow.normalBias = 0.02; k.shadow.radius = 2;
  k.position.set(-170, 110, 150); k.target.position.set(0, -4, 0); card.add(k, k.target);
  const f = new THREE.PointLight('#c9d6f0', 2600, 0, 2); f.position.set(120, -50, 170); card.add(f);
  const rr = new THREE.PointLight('#ffffff', 1800, 0, 2); rr.position.set(40, 80, 40); card.add(rr);
}
function cardAlpha(t) { return { word: 1, what: smooth(CARD_T + 0.8, CARD_T + 1.1, t) }; }
function drawCard(t) {
  const a = cardAlpha(t);
  cardWord.visible = true; cardWord.scale.set(1, 1, 1);
  setBoil(Math.floor(t * 12 + 1e-6));
  cardCam.position.set(0, -38, CARD_LAY.D - 6); cardCam.lookAt(0, -1, 0); cardCam.updateProjectionMatrix();   // a touch below, so the letters show their thickness
  post.render(card, cardCam, { focus: CARD_LAY.D, aperture: 0.5, maxBlur: 8, radScale: 1.5, threshold: 1.6, knee: 0.5, bloomA: 0.12, bloomB: 0.06, exposure: 1.0, vignette: 0.35, grain: 0.03, seed: t * 37 % 97, sat: 1.0, contrast: 1.05, lift: [0, 0, 0], gain: [1, 1, 1], toe: 0.02 });
  g2d.drawImage(renderer.domElement, 0, 0);
  // "What?" — flat white type, smaller than the wordmark
  if (a.what > 0) {
    g2d.save(); g2d.globalAlpha = a.what; g2d.fillStyle = '#ffffff'; g2d.textAlign = 'center'; g2d.textBaseline = 'alphabetic';
    const pop = 1 + 0.22 * (1 - smooth(CARD_T + 0.8, CARD_T + 1.1, t));   // it pops in, a touch large, and settles
    g2d.translate(W / 2, (960 + 132) * RES); g2d.scale(pop, pop);
    g2d.font = `500 ${Math.round(58 * RES)}px Inter`; g2d.letterSpacing = `${(0.5 * RES).toFixed(1)}px`;
    g2d.fillText('Whut?', 0, 18 * RES);   // owner, 17 Oct: "Whut?"
    g2d.restore();
  }
  if (TUNE.hud) bug(g2d);
}

// ------------------------------------------------------------------ draw
function drawFrame(t) {
  if (t >= CARD_T) { drawCard(t); return; }
  if (lastKey !== t) { lastKey = t; poseAll(t); }
  const c = CAM_OVERRIDE ? { focusD: Math.hypot(...sub3(CAM_OVERRIDE.pos, CAM_OVERRIDE.look)), ap: 0.6, ...CAM_OVERRIDE } : camAt(t);
  camera.fov = c.fov; camera.position.set(...c.pos); camera.up.set(0, 1, 0); camera.lookAt(...c.look); camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  post.render(scene, camera, grade(c, t));
  g2d.drawImage(renderer.domElement, 0, 0);
  if (TUNE.hud && !CAM_OVERRIDE) drawHUD(t);
  if (CAM_OVERRIDE) bug(g2d);
}
function probe(t) {
  lastKey = null; drawFrame(t);
  const P = (v) => { const p = (v.isVector3 ? v.clone() : V(v)).project(camera); return [Math.round((p.x + 1) / 2 * 1080), Math.round((1 - p.y) / 2 * 1920)]; };
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  return {
    mask: P(wp(toko.mask)), handR: P(wp(toko.hands[0])), handL: P(wp(toko.hands[1])), cupR: P(wp(muffs.cups[0])), cupL: P(wp(muffs.cups[1])),
    feet: P([tokoState(t).x, 0, L.tokoZ]), drum: P(wp(vac.drum)), car: P(wp(car)), foot: P(RP.foot), top: P(toWorld(RP.R1 - RP.R2, RP.R1 + RP.Hs + RP.R2, 0)), lip: P(LIP), wall: P(toWorld(RP.R1, RP.R1, 0)),
  };
}
const LOOKS = [
  { name: 'look-B-1-foot', t: 3.0 },
  { name: 'look-B-2-upside', t: 10.4 },
  { name: 'look-B-3-jets', t: 20.6 },
  { name: 'look-B-4-cough', t: 24.0 },
  { name: 'look-B-5-card', t: 27.5 },
];
window.__film = {
  probe, W, H, FPS, frames: FRAMES, L, VER, TL,
  looks: LOOKS.map(l => ({ ...l, name: l.name.replace('look-B-', `look-${VER}-`) + (VER === 'C' ? '-' + MASKV : '') })),
  look(i) { lastKey = null; drawFrame(LOOKS[i].t); return out2d.toDataURL('image/png'); },
  still(t) { lastKey = null; drawFrame(t); return out2d.toDataURL('image/png'); },
  stillCam(t, c) { lastKey = null; CAM_OVERRIDE = c; drapes.forEach(d => { d.visible = !!c.drapes; }); drawFrame(t); CAM_OVERRIDE = null; drapes.forEach(d => { d.visible = false; }); return out2d.toDataURL('image/png'); },
  carAt(t) { return carState(t).pos; },
  /** the car and its HUD as numbers, no rendering: [t, s along the ramp, pitch (deg), altitude ft, suction kg, g] */
  carLog(a, b, dt) { const o = []; for (let t = a; t <= b + 1e-9; t += dt) { const h = hudState(t); o.push([+t.toFixed(3), +carTravel(t).toFixed(2), +h.pitch.toFixed(1), +h.alt.toFixed(1), Math.round(h.suction), +h.g.toFixed(2)]); } return o; },
  /** screen-space x extents (at 1080 wide) of the nozzle, the janitor and the canister — for timing the entrances and exits */
  edges(t) {
    lastKey = null; drawFrame(t);
    // exact: every visible vertex projected (an AABB's corners overstate a long, tilted wand)
    const ext = (o) => { let lo = 1e9, hi = -1e9; const v = new THREE.Vector3(); o.updateMatrixWorld(true);
      o.traverseVisible((m) => { if (!m.isMesh || !m.geometry?.attributes?.position) return; const P = m.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld).project(camera); const sx = (v.x + 1) / 2 * 1080; if (sx < lo) lo = sx; if (sx > hi) hi = sx; } });
      return [Math.round(lo), Math.round(hi)]; };
    return { t, nozzle: ext(vac.group), body: ext(toko.group), drum: ext(vac.drum) };
  },
  events() {
    // footsteps from the walk cycle: a foot lands when its phase crosses a quarter cycle
    const steps = []; let prev = null;
    for (let t = 0; t < CARD_T; t += 1 / 480) {
      const st = tokoState(t); if (st.mode !== 0) { prev = null; continue; }
      const k = Math.floor((st.walk - 0.25) * 2);
      if (prev !== null && k !== prev) steps.push({ t: +t.toFixed(3), foot: k % 2 ? 'L' : 'R', pass: st.pass, onScreen: Math.abs(st.x) < 50 });
      prev = k;
    }
    const sweeps = []; for (let n = 0; ; n++) { const t = (n * 0.5 + 0.25) * SWEEP_T; if (t > TL.stop) break; if ((t > TL.vacOn1 && t < TL.exit1) || (t > TL.vacOn2)) sweeps.push(+t.toFixed(3)); }
    const suc = []; for (let t = 0; t <= END_T + 1e-6; t += 0.25) suc.push([+t.toFixed(2), +suction(t).toFixed(3)]);
    return { TL, COUGH, CSZ, steps, sweeps, suc, card: CARD_T, what: CARD_T + 0.8, whatIn: CARD_T + 1.1, end: END_T, pace: PACE, sweepT: SWEEP_T };
  },
  frame(i, q = 0.94) { drawFrame(i / FPS); return out2d.toDataURL('image/jpeg', q); },
  tune(o) { Object.assign(TUNE, o); lastKey = null; },
};
if (IS_C) {   // a small clay TESLUR on the robot's chest (no logos)
  const wm = mesh(word('TESLUR', { size: 0.1, r: 0.11, gap: 2.4, seed: 21, flat: 0.7 }), RC.black, { pos: [0, 0.2, 0.05], parent: chest, cast: false });
  wm.scale.setScalar(1);
}
window.__ready = true;
