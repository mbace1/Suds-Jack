// TOKO DROP 2.0 · the Toko Midori Games re-cut (8 Nov). Built 4 Nov as the GL film (GAMEPLAY LABORATORY, v115);
// re-cut for the Toko Midori Games accounts on the owner's word (8 Nov: "end slate with those socials, no links of any
// kind just logo and Toko details. Saying coming in 2027. Make the video a bit shorter edit out glitched shooting part.
// Use current world 1 visuals"):
//   1. the game's OWN intro, recorded frame by frame from the deployed build (v123), trimmed to three runs (the Toko
//      Midori Games lockup lands → "drop" → the drop lets go and lands, the grid rings → it opens its eyes, the HUD).
//      Nothing is drawn over it.
//   2. a fast compilation of real v123 play, cut on the beats of a 172 BPM score (score.py). The game's frames are
//      shown as they were rendered, full bleed, with a punch-in and a flash on each cut and one light tag along the
//      bottom: a small Toko face (the traced master, toko/js/master.js) and the world's name. No GL mark anywhere.
//   3. the end slate (`card=toko`, the default): the Toko Midori Games lockup — the traced master face and the drawn
//      logotype (toko/js/wordmark.js) — TOKO DROP 2.0, COMING IN 2027, and the two handles as plain words, magenta
//      #F0027F on black and nothing else (BRAND.md §2c). No address, no link, no QR. `card=title` and `card=gl` are
//      the 4 Nov cards, kept for the record; neither is for the Toko accounts.
//
// Frames come from a capture folder (tools/README in plan/films/36), mounted at `clips` (default /_clips/):
//   <clips><src>/f0000.jpg …  30 fps, index = source seconds × 30;  <clips>clips.json { src: [indices present] }
// The toko kit is mounted at /toko/ (render.mjs --mount toko=<repo>/toko). The cut list is ./plan.json. Pure function
// of t: render.mjs awaits frame(i)/still(t) (both return promises here, because a 1080×1920 game frame is loaded on
// demand rather than all held in memory).
import * as THREE from 'three';
import { OUT_W, OUT_H, FPS, makeScreen, clamp } from '../common/film.js';
import { drawText, textWidth, pixels } from '../common/font.js';

const Q = new URLSearchParams(location.search);
const CLIPS = Q.get('clips') || '/_clips/', CARD = Q.get('card') || 'toko';   // owner, 8 Nov: the Toko accounts' slate
const PLAN = await (await fetch(Q.get('plan') || './plan.json')).json();
const HAVE = await fetch(CLIPS + 'clips.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const BEAT = 60 / PLAN.bpm, END = PLAN.end;
const MAG = '#F0027F', INK = '#000000';   // the brand's two colours (toko/js/palette.js TOKO)
const { fillMaster, masterBounds } = await import('/toko/js/master.js');
const { drawWord, widthOf, M: WM } = await import('/toko/js/wordmark.js');
{ const f = new FontFace('Anton', `url(${Q.get('fonts') || '/_fonts/'}Anton-400.woff)`); document.fonts.add(await f.load()); }
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
// a small Toko face in magenta (the traced master) where the 4 Nov film had the GL mark, then the world's name
function tag(g, s, t) {
  const k = clamp((t - s.t0) / 0.12), y = OUT_H - 150;
  g.fillStyle = 'rgba(4,6,12,0.93)'; g.fillRect(0, y, OUT_W, 150);   // over the game's own version line
  g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, y, OUT_W, 5);
  const P = 5, x0 = 40, ty = y + 40, fw = 58, b = masterBounds();
  fillMaster(g, x0, ty + 17 - (fw * b.h / b.w) / 2, fw, { color: MAG });
  const xl = x0 + fw + 34, slide = Math.round((1 - k) * 60);
  if (s.label) drawText(g, s.label, xl + slide, ty, { px: P, fill: '#f4f8ff', outline: '#05070c' });
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
  if (tc >= BEAT * 3) { drawText(g, 'GL', 40, y + 245, { px: 5, fill: (x, yy) => ROWS[yy], outline: '#14081c' }); drawText(g, 'GAMEPLAY LABORATORY', 40 + textWidth('GL', 5) + 40, y + 245, { px: 5, fill: '#a8b4c8', outline: '#05070c' }); }
}

// ------------------------------------------------------------------ end card C: the Toko Midori Games slate (8 Nov)
// Magenta on black, the two colours and nothing else. The lockup is the canon's: the TRACED face (master.js, never
// face.js's GEO) beside the drawn three-line logotype, standing the face's height (lockup.js's proportions).
// Then TOKO DROP 2.0, COMING IN 2027 reversed out of a magenta band, and the handles as words — no links of any kind.
const ease = { out: (x) => 1 - Math.pow(1 - clamp(x), 3), back: (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); } };
function fit(g, str, px, maxW) { g.font = `${px}px Anton`; const w = g.measureText(str).width; if (w > maxW) { px = Math.floor(px * maxW / w); g.font = `${px}px Anton`; } return px; }
function drawTokoCard(g, tc) {
  g.fillStyle = INK; g.fillRect(0, 0, OUT_W, OUT_H);
  const at = (b) => tc - BEAT * b;
  // the lockup: face h = 250, logotype lines = h / 3.2, gap h * 0.14, centred as a block at y 330
  const b = masterBounds(), H = 280, FW = H * b.w / b.h, gap = H * 0.14, size = H / 3.2, lh = size * 1.06;
  const lines = ['Toko', 'Midori', 'Games'], lw = lines.map((l) => widthOf(l) * size / WM.cap), block = Math.max(...lw);
  const LW = FW + gap + block + size * 0.42, X0 = Math.round((OUT_W - LW) / 2), Y0 = 260;
  const blink = (() => { const d = at(9); return d > 0 && d < 0.14 ? 0.12 : 1; })();
  const kf = ease.back(at(0) / 0.38);
  if (kf > 0) { g.save(); g.translate(X0 + FW / 2, Y0 + H / 2); g.scale(kf, kf); fillMaster(g, -FW / 2, -H / 2, FW, { color: MAG, squash: blink }); g.restore(); }
  lines.forEach((ln, i) => { const a = ease.out(at(1 + i * 0.5) / 0.25); if (a <= 0) return;
    g.save(); g.globalAlpha = a; drawWord(g, ln, X0 + FW + gap + (1 - a) * 40, Y0 + size + i * lh + (H - (size + 2 * lh)) / 2, size, MAG);
    if (i === 2) drawWord(g, 'TM', X0 + FW + gap + lw[2] + size * 0.07 + (1 - a) * 40, Y0 + size + i * lh + (H - (size + 2 * lh)) / 2 - size * 0.62, size * 0.3, MAG);
    g.restore(); });
  // the game's name, slammed in on beat 3
  const k3 = at(3); if (k3 > 0) { const s = 1 + 0.18 * Math.pow(1 - clamp(k3 / 0.2), 2);
    g.save(); g.translate(OUT_W / 2, 770); g.scale(s, s); const px = fit(g, 'TOKO DROP 2.0', 210, 920); g.fillStyle = MAG; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('TOKO DROP 2.0', 0, px * 0.36); g.restore(); }
  // COMING IN 2027, reversed out of a magenta band that wipes in on beat 4.5
  const k4 = ease.out(at(4.5) / 0.3); if (k4 > 0) {
    const bw = OUT_W * k4; g.fillStyle = MAG; g.fillRect((OUT_W - bw) / 2, 900, bw, 180);
    if (at(4.8) > 0) { g.save(); g.beginPath(); g.rect((OUT_W - bw) / 2, 900, bw, 180); g.clip(); const px = fit(g, 'COMING IN 2027', 132, 900);
      g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('COMING IN 2027', OUT_W / 2, 992); g.restore(); } }
  // the handles, as words: the platform's name over the account, nothing to click (kept clear of the bottom fifth,
  // where Reels and X lay their own captions over a video)
  const rows = [['INSTAGRAM', 'tokomidorigames'], ['X', '@tokomidori']];
  rows.forEach(([plat, handle], i) => { const a = ease.out(at(6 + i * 0.5) / 0.3); if (a <= 0) return;
    const y = 1215 + i * 225, dy = (1 - a) * 24; g.save(); g.globalAlpha = a; g.fillStyle = MAG; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = '50px Anton'; if ('letterSpacing' in g) g.letterSpacing = '8px'; g.fillText(plat, OUT_W / 2, y + dy);
    if ('letterSpacing' in g) g.letterSpacing = '0px'; g.font = '108px Anton'; g.fillText(handle, OUT_W / 2, y + 112 + dy); g.restore(); });
}

// ------------------------------------------------------------------ one frame
const out = makeScreen(OUT_W, OUT_H); document.body.appendChild(out.c); out.c.style.width = '270px';
async function frameAt(t) {
  const g = out.g, s = segAt(t); g.imageSmoothingEnabled = true; g.fillStyle = '#000'; g.fillRect(0, 0, OUT_W, OUT_H);
  if (s.kind === 'card') {
    if (CARD === 'toko') drawTokoCard(g, t - s.t0); else if (CARD === 'title') await drawTitleCard(g, t - s.t0, PLAN.title); else drawGlCard(g, t - s.t0);
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
window.__film = { fps: FPS, frames: Math.round(END * FPS), events, report: { look: document.title, card: CARD, slate: CARD === 'toko' ? ['Toko Midori Games (lockup)', 'TOKO DROP 2.0', 'COMING IN 2027', 'Instagram tokomidorigames', 'X @tokomidori'] : null },
  async frame(i) { return (await frameAt(i / FPS)).toDataURL('image/jpeg', 0.92); },
  async still(t) { return (await frameAt(t)).toDataURL('image/png'); } };
window.__ready = true;
