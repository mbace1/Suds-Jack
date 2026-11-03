// GAMEPLAY LABORATORY · TOKO DROP 2.0 (v115). A game trailer, not a lab report (owner, 3 Nov: "Actual game intro with
// toko Midori games logo and then compilation", "to some fast music"):
//   1. the game's OWN v16 intro, recorded frame by frame from the deployed build, trimmed to three runs that keep
//      every beat (the Toko Midori Games lockup lands → "drop" → the drop lets go, lands, the grid rings out → it
//      opens its eyes → the HUD comes in). Nothing is drawn over it.
//   2. a fast compilation of real v115 play, cut on the beats of a 172 BPM score (score.py). The game's frames are
//      shown as they were rendered — full bleed, never re-sampled into the early-3D look — with a punch-in and a
//      flash on each cut, and ONE light GL tag along the bottom (what the cut shows, and the version that added it).
//   3. an end card: `card=gl` the early-3D GL card (the GL look: vertex snapping, affine UVs, 15-bit dither, a
//      low-poly drop on a pedestal), or `card=title` the game's own title screen with the arcade's address.
//
// Frames come from a capture folder (tools/README in plan/films/36), mounted at `clips` (default /_clips/):
//   <clips><src>/f0000.jpg …  30 fps, index = source seconds × 30;  <clips>clips.json { src: [indices present] }
// The cut list is ./plan.json. Pure function of t: render.mjs awaits frame(i)/still(t) (both return promises here,
// because a 1080×1920 game frame is loaded on demand rather than all held in memory).
import * as THREE from 'three';
import { OUT_W, OUT_H, FPS, makeScreen, clamp } from '../common/film.js';
import { drawText, textWidth, pixels } from '../common/font.js';

const Q = new URLSearchParams(location.search);
const CLIPS = Q.get('clips') || '/_clips/', CARD = Q.get('card') || 'gl';
const PLAN = await (await fetch(Q.get('plan') || './plan.json')).json();
const HAVE = await fetch(CLIPS + 'clips.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const BEAT = 60 / PLAN.bpm, END = PLAN.end;
const ROWS = ['#fff070', '#ffd040', '#ffa030', '#ff6a40', '#f03c70', '#c02090', '#8a1aa0'];   // the GL logo's ramp

// ------------------------------------------------------------------ the game's frames, loaded on demand
const cache = new Map();
function nearest(src, i) {
  const h = HAVE[src]; if (!h || !h.length) return i;
  let best = h[0]; for (const v of h) if (Math.abs(v - i) < Math.abs(best - i)) best = v; return best;
}
function load(src, i) {
  const k = `${src}/${i}`; if (cache.has(k)) return cache.get(k);
  const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('missing frame ' + k)); im.src = `${CLIPS}${src}/f${String(i).padStart(4, '0')}.jpg`; });
  cache.set(k, p); if (cache.size > 48) cache.delete(cache.keys().next().value);
  return p;
}
const segAt = (t) => PLAN.segs.find((s) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6) || PLAN.segs[PLAN.segs.length - 1];

// ------------------------------------------------------------------ the bottom tag (compilation only)
function tag(g, s, t) {
  const k = clamp((t - s.t0) / 0.12), y = OUT_H - 150;
  g.fillStyle = 'rgba(4,6,12,0.82)'; g.fillRect(0, y, OUT_W, 150);
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y, OUT_W, 5);
  const P = 5, x0 = 40, ty = y + 40;
  // the GL mark: the voxel logo's own ramp, one row per colour
  drawText(g, 'GL', x0, ty, { px: P, bold: true, fill: (x, yy) => ROWS[yy], outline: '#14081c' });
  const xl = x0 + textWidth('GL', P, true) + 40, slide = Math.round((1 - k) * 60);
  if (s.label) drawText(g, s.label, xl + slide, ty, { px: P, fill: '#f4f8ff', outline: '#05070c' });
  if (s.ver) { const xv = OUT_W - 40 - textWidth(s.ver, 4); drawText(g, s.ver, xv, ty + 8, { px: 4, fill: '#40ff90', outline: '#041a10' }); }
}

// ------------------------------------------------------------------ end card A: the early-3D GL card
const W = 216, H = 384;
let gl3 = null;
function glCard() {
  if (gl3) return gl3;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const scene = new THREE.Scene(), FOG = new THREE.Color('#06141c'); scene.background = FOG;
  const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 60);
  // the GL look's one shader (looks/gl/3d): snapped vertices, affine UVs, Gouraud light, fog, 5 bits a channel + Bayer
  const VS = `uniform vec2 res; uniform vec3 lightDir; uniform float ambient; uniform float fogNear; uniform float fogFar;
    varying vec2 vUvW; varying float vW; varying float vFog; varying float vLight;
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vec4 cp = projectionMatrix * mv; vec2 grid = res * 0.5;
      cp.xy = floor(cp.xy / cp.w * grid + 0.5) / grid * cp.w; gl_Position = cp; vUvW = uv * cp.w; vW = cp.w;
      vec3 n = normalize(mat3(modelMatrix) * normal); vLight = ambient + (1.0 - ambient) * max(dot(n, normalize(lightDir)), 0.0);
      vFog = clamp((-mv.z - fogNear) / (fogFar - fogNear), 0.0, 1.0); }`;
  const FS = `uniform sampler2D map; uniform vec3 tint; uniform vec3 fogColor; uniform float emissive;
    varying vec2 vUvW; varying float vW; varying float vFog; varying float vLight;
    float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
    void main() { vec4 tex = texture2D(map, vUvW / vW); if (tex.a < 0.5) discard;
      vec3 c = tex.rgb * tint * mix(vLight, 1.0, emissive); c = mix(c, fogColor, vFog * (1.0 - emissive * 0.5));
      c = floor(c * 31.0 + bayer4(gl_FragCoord.xy)) / 31.0; gl_FragColor = vec4(c, 1.0); }`;
  const ctex = (size, paint) => { const c = document.createElement('canvas'); c.width = c.height = size; paint(c.getContext('2d'), size);
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t; };
  const LIGHT = new THREE.Vector3(0.4, 1, 0.6);
  const mat = (tex, { tint = '#ffffff', emissive = 0, near = 4, far = 30, side = THREE.FrontSide } = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side,
    uniforms: { map: { value: tex }, res: { value: new THREE.Vector2(W, H) }, lightDir: { value: LIGHT }, ambient: { value: 0.45 }, fogNear: { value: near }, fogFar: { value: far },
      tint: { value: new THREE.Color(tint) }, fogColor: { value: FOG }, emissive: { value: emissive } } });
  const TX = {
    grid: ctex(32, (g) => { g.fillStyle = '#0c1a2a'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#2ad0e0'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32); g.fillStyle = '#13324a'; g.fillRect(16, 0, 1, 32); g.fillRect(0, 16, 32, 1); }),
    wall: ctex(32, (g) => { g.fillStyle = '#2c3a4c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#3c4e66'; g.fillRect(2, 2, 28, 12); g.fillRect(2, 18, 28, 12); g.fillStyle = '#1a2230'; g.fillRect(0, 15, 32, 2);
      g.fillStyle = '#5ae0ff'; g.fillRect(4, 6, 6, 2); g.fillStyle = '#ff5ab0'; g.fillRect(22, 24, 4, 2); }),
    gel: ctex(16, (g) => { g.fillStyle = '#e8eef4'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#ffffff'; g.fillRect(3, 3, 4, 3); g.fillStyle = '#c4ccd8'; g.fillRect(9, 11, 6, 4); }),
    ink: ctex(8, (g) => { g.fillStyle = '#0a0a10'; g.fillRect(0, 0, 8, 8); g.fillStyle = '#ffffff'; g.fillRect(2, 1, 2, 2); }),
    white: ctex(8, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 8); }),
    metal: ctex(32, (g) => { g.fillStyle = '#6a7486'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#9aa6ba'; g.fillRect(0, 0, 32, 4); g.fillStyle = '#3e4656'; g.fillRect(0, 28, 32, 4); }),
  };
  const add = (geo, m, pos = [0, 0, 0], rot = [0, 0, 0], parent = scene) => { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.rotation.set(...rot); parent.add(o); return o; };
  const uv = (geo, sx, sy) => { const a = geo.attributes.uv.array; for (let i = 0; i < a.length; i += 2) { a[i] *= sx; a[i + 1] *= sy; } return geo; };
  add(uv(new THREE.BoxGeometry(24, 16, 24, 3, 2, 3), 6, 4), mat(TX.wall, { side: THREE.BackSide, near: 6, far: 30 }), [0, 7, -6]);
  add(uv(new THREE.PlaneGeometry(24, 24, 4, 4), 8, 8), mat(TX.grid, { emissive: 0.35 }), [0, 0, -6], [-Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(1.6, 1.9, 0.9, 8, 1), mat(TX.metal), [0, 0.45, -6]);
  // the drop: a low-poly gel with two ink eyes (the game's hero, rebuilt in the GL look — the footage itself never is)
  const DROP = new THREE.Group(); scene.add(DROP); DROP.position.set(0, 2.3, -6);
  const body = add(new THREE.IcosahedronGeometry(1.25, 1), mat(TX.gel, { near: 5, far: 30, emissive: 0.35 }), [0, 0, 0], [0, 0, 0], DROP); body.scale.set(1, 0.92, 1);
  for (const x of [-0.42, 0.42]) add(new THREE.BoxGeometry(0.3, 0.5, 0.3), mat(TX.ink, { emissive: 1 }), [x, 0.14, 1.12], [0, x * 0.4, 0], DROP);
  // the voxel GL above it, in the logo's ramp
  const LOGO = new THREE.Group(); scene.add(LOGO); LOGO.position.set(0, 7.4, -7);
  // the plain (not bold) glyphs: bold closes the G's inner gap and at this size it reads as a 6
  const rowMat = ROWS.map((c) => mat(TX.white, { tint: c, near: 8, far: 40, emissive: 0.4 })), cube = new THREE.BoxGeometry(0.44, 0.44, 0.6);
  for (const [x, y] of pixels('GL')) { const m = new THREE.Mesh(cube, rowMat[y]); m.position.set(x * 0.44 - 11 * 0.44 / 2 + 0.22, (6 - y) * 0.44 - 1.3, 0); LOGO.add(m); }
  camera.position.set(0, 2.6, 4.2); camera.lookAt(0, 3.0, -6);
  gl3 = { renderer, scene, camera, DROP, LOGO, scr: makeScreen(W, H) };
  return gl3;
}
function drawGlCard(g, tc) {
  const C = glCard(), { renderer, scene, camera, DROP, LOGO, scr } = C;
  tc = Math.floor(tc * 30) / 30;
  // the drop falls onto its pedestal on the card's first beat, squashes, settles and turns; the logo spins in and stops
  const fall = clamp(tc / (BEAT * 1.0)), land = tc - BEAT;
  DROP.position.y = 2.3 + (1 - fall * fall) * 9;
  const sq = land > 0 ? Math.exp(-land * 7) * Math.sin(land * 26) * 0.22 : 0;
  DROP.scale.set(1 + sq, 1 - sq, 1 + sq); DROP.rotation.y = Math.sin(tc * 1.4) * 0.5;
  const sk = clamp(tc / (BEAT * 3)); LOGO.rotation.y = (1 - (1 - Math.pow(1 - sk, 3))) * Math.PI * 4; LOGO.position.y = 7.4 + Math.sin(tc * 2.2) * 0.12;
  camera.position.set(Math.sin(tc * 0.5) * 0.4, 3.0, 5.0); camera.lookAt(0, 2.5, -6);
  renderer.render(scene, camera);
  const s = scr.g; s.imageSmoothingEnabled = false; s.drawImage(renderer.domElement, 0, 0);
  const at = (b) => tc >= BEAT * b;
  const mid = (str, y, o) => drawText(s, str, Math.round((W - textWidth(str, o.px || 1, o.bold)) / 2), y, o);
  s.fillStyle = 'rgba(6,10,16,0.78)'; s.fillRect(0, 262, W, 122); s.fillStyle = '#2ad0e0'; s.fillRect(0, 262, W, 1);
  if (at(1)) mid('TOKO DROP 2.0', 274, { px: 2, bold: true, fill: (x, y) => ROWS[y], outline: '#14081c' });
  if (at(2)) mid('PLAY FREE', 300, { px: 2, fill: '#e8f4ff', outline: '#14081c' });
  if (at(2.5)) mid('IN THE ARCADE', 320, { px: 1, bold: true, fill: '#e8f4ff', outline: '#14081c' });
  if (at(3.5)) mid('MBACE1.GITHUB.IO/SUDS-JACK', 340, { px: 1, fill: '#40ff90', outline: '#041a10' });
  if (at(4.5) && Math.floor((tc - BEAT * 4.5) / (BEAT)) % 2 === 0) mid('PRESS START', 362, { px: 1, fill: '#ffffff', outline: '#14081c' });
  g.imageSmoothingEnabled = false; g.drawImage(scr.c, 0, 0, OUT_W, OUT_H);
}

// ------------------------------------------------------------------ end card B: the game's own title screen
async function drawTitleCard(g, tc, s) {
  const im = await load(s.src, nearest(s.src, Math.round(((s.from || 0) + tc) * FPS)));
  // the title's own logo, framed (its menu buttons are for a player, not for a card)
  const [cx, cy, z] = s.crop || [0.5, 0.5, 1], k = 1 + 0.04 * clamp(tc / (BEAT * 8)), iw = im.naturalWidth, ih = im.naturalHeight, sw = iw / (z * k), sh = ih / (z * k);
  g.drawImage(im, clamp(cx * iw - sw / 2, 0, iw - sw), clamp(cy * ih - sh / 2, 0, ih - sh), sw, sh, 0, 0, OUT_W, OUT_H);
  const y = OUT_H - 330; g.fillStyle = 'rgba(4,6,12,0.86)'; g.fillRect(0, y, OUT_W, 330); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y, OUT_W, 5);
  const mid = (str, yy, o) => drawText(g, str, Math.round((OUT_W - textWidth(str, o.px, o.bold)) / 2), yy, o);
  if (tc >= BEAT * 1) mid('PLAY FREE IN THE ARCADE', y + 60, { px: 6, fill: '#f4f8ff', outline: '#05070c' });
  if (tc >= BEAT * 2) mid('MBACE1.GITHUB.IO/SUDS-JACK', y + 150, { px: 6, fill: '#40ff90', outline: '#041a10' });
  if (tc >= BEAT * 3) { drawText(g, 'GL', 40, y + 245, { px: 5, bold: true, fill: (x, yy) => ROWS[yy], outline: '#14081c' }); drawText(g, 'GAMEPLAY LABORATORY', 40 + textWidth('GL', 5, true) + 40, y + 245, { px: 5, fill: '#a8b4c8', outline: '#05070c' }); }
}

// ------------------------------------------------------------------ one frame
const out = makeScreen(OUT_W, OUT_H); document.body.appendChild(out.c); out.c.style.width = '270px';
async function frameAt(t) {
  const g = out.g, s = segAt(t); g.imageSmoothingEnabled = true; g.fillStyle = '#000'; g.fillRect(0, 0, OUT_W, OUT_H);
  if (s.kind === 'card') {
    if (CARD === 'title') await drawTitleCard(g, t - s.t0, PLAN.title); else drawGlCard(g, t - s.t0);
    return out.c;
  }
  const i = nearest(s.src, Math.round((s.from + (t - s.t0) * (s.rate || 1)) * FPS)), im = await load(s.src, i);
  if (s.kind === 'play') {
    // a punch-in on the cut (a bar's first beat harder than an off-beat), then the frame at its own scale
    // `crop` [cx, cy, zoom]: a told moment is small on a whole-arena camera, so the cut frames the part that matters
    // — out of a frame captured at zoom × the resolution, so the crop is still one game pixel to one film pixel
    const k = clamp((t - s.t0) / 0.22), sc = 1 + (s.punch ?? 0.03) * (1 - k) * (1 - k);
    const [cx, cy, z] = s.crop || [0.5, 0.5, 1], iw = im.naturalWidth, ih = im.naturalHeight, sw = iw / (z * sc), sh = ih / (z * sc);
    const sx = clamp(cx * iw - sw / 2, 0, iw - sw), sy = clamp(cy * ih - sh / 2, 0, ih - sh);
    g.drawImage(im, sx, sy, sw, sh, 0, 0, OUT_W, OUT_H);
    const f = clamp(1 - (t - s.t0) / 0.1); if (f > 0) { g.fillStyle = `rgba(255,255,255,${0.32 * f})`; g.fillRect(0, 0, OUT_W, OUT_H); }
    tag(g, s, t);
  } else g.drawImage(im, 0, 0, OUT_W, OUT_H);   // the intro: the game's own frames, untouched
  return out.c;
}

const events = { end: END, bpm: PLAN.bpm, cuts: PLAN.segs.filter((s) => s.kind === 'play').map((s) => +s.t0.toFixed(3)),
  introSegs: PLAN.segs.filter((s) => s.kind === 'intro').map((s) => ({ t0: s.t0, t1: s.t1, from: s.from })), card: PLAN.segs.find((s) => s.kind === 'card')?.t0 };
window.__film = { fps: FPS, frames: Math.round(END * FPS), events, report: { look: document.title, card: CARD },
  async frame(i) { return (await frameAt(i / FPS)).toDataURL('image/jpeg', 0.92); },
  async still(t) { return (await frameAt(t)).toDataURL('image/png'); } };
window.__ready = true;
