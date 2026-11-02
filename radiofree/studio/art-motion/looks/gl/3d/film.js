// GAMEPLAY LABORATORY · early 3D (the first polygon generation). Rendered at 216×384, upscaled ×5. Each of the
// generation's tells is built into one shader rather than faked in post:
//   · VERTEX SNAPPING: every vertex lands on the low-res pixel grid, so geometry jitters and seams crawl as the camera moves;
//   · AFFINE TEXTURES: UVs are interpolated in screen space (uv·w and w, divided per pixel), so big floor and wall
//     triangles warp and swim instead of holding perspective;
//   · nearest-filtered 32×32 textures with no mipmaps; per-VERTEX (Gouraud) lighting, never per-pixel;
//   · 15-bit colour with a 4×4 ordered dither; distance fog to hide the short draw distance; low-poly everything.
// Then the title screen the era always had: a spinning 3D logo, bitmap text over it, and PRESS START blinking.
// Original art throughout: a lab corridor, test tubes, a voxel "GL" built from this show's own pixel font.
import * as THREE from 'three';
import { register, clamp } from '../common/film.js';
import { drawText, textWidth, pixels } from '../common/font.js';

const W = 216, H = 384, SECONDS = 6.0;
const T = { fly0: 0.0, door: 2.55, arrive: 3.5, spin1: 4.4, title: 4.45, start: 4.9, music: 0.0 };

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const scene = new THREE.Scene(); const FOG = new THREE.Color('#06141c'); scene.background = FOG;
const camera = new THREE.PerspectiveCamera(70, W / H, 0.1, 80);

// ------------------------------------------------------------------ the shader: snapping, affine UVs, Gouraud, fog, 15-bit dither
const VS = `
uniform vec2 res; uniform vec3 lightDir; uniform float ambient; uniform float fogNear; uniform float fogFar;
varying vec2 vUvW; varying float vW; varying float vFog; varying float vLight;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 cp = projectionMatrix * mv;
  vec2 grid = res * 0.5;
  cp.xy = floor(cp.xy / cp.w * grid + 0.5) / grid * cp.w;          // snap to the screen's pixel grid
  gl_Position = cp;
  vUvW = uv * cp.w; vW = cp.w;                                      // affine: undo the perspective-correct interpolation
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vLight = ambient + (1.0 - ambient) * max(dot(n, normalize(lightDir)), 0.0);   // lit per vertex
  vFog = clamp((-mv.z - fogNear) / (fogFar - fogNear), 0.0, 1.0);
}`;
const FS = `
uniform sampler2D map; uniform vec3 tint; uniform vec3 fogColor; uniform float emissive;
varying vec2 vUvW; varying float vW; varying float vFog; varying float vLight;
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
void main() {
  vec4 tex = texture2D(map, vUvW / vW);
  if (tex.a < 0.5) discard;
  vec3 c = tex.rgb * tint * mix(vLight, 1.0, emissive);
  c = mix(c, fogColor, vFog * (1.0 - emissive * 0.5));
  c = floor(c * 31.0 + bayer4(gl_FragCoord.xy) - 0.5 + 0.5) / 31.0;   // 5 bits a channel, ordered dither
  gl_FragColor = vec4(c, 1.0);
}`;
const LIGHT = new THREE.Vector3(0.35, 1, 0.25);
function mat(tex, { tint = '#ffffff', emissive = 0, near = 3, far = 26, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, side,
    uniforms: { map: { value: tex }, res: { value: new THREE.Vector2(W, H) }, lightDir: { value: LIGHT }, ambient: { value: 0.42 },
      fogNear: { value: near }, fogFar: { value: far }, tint: { value: new THREE.Color(tint) }, fogColor: { value: FOG }, emissive: { value: emissive } } });
}

// ------------------------------------------------------------------ 32×32 textures, painted in code, nearest-filtered, no mipmaps
function ctex(size, paint) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); paint(g, size);
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
const TX = {
  floor: ctex(32, (g) => { g.fillStyle = '#4a5462'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#3a424e'; g.fillRect(0, 0, 16, 16); g.fillRect(16, 16, 16, 16);
    g.fillStyle = '#1e242c'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 0, 1, 32); g.fillRect(0, 16, 32, 1); g.fillRect(16, 0, 1, 32);
    g.fillStyle = '#8a96a8'; [[3, 3], [12, 3], [3, 12], [12, 12], [19, 19], [28, 19], [19, 28], [28, 28]].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
  }),
  wall: ctex(32, (g) => { g.fillStyle = '#2c3a4c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#3c4e66'; g.fillRect(2, 2, 28, 12); g.fillRect(2, 18, 28, 12);
    g.fillStyle = '#1a2230'; g.fillRect(0, 15, 32, 2); g.fillStyle = '#5ae0ff'; g.fillRect(4, 6, 6, 2); g.fillStyle = '#ff5ab0'; g.fillRect(22, 24, 4, 2);
    g.fillStyle = '#56708e'; g.fillRect(2, 2, 28, 1); g.fillRect(2, 18, 28, 1); }),
  ceil: ctex(32, (g) => { g.fillStyle = '#1a222c'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#e8f4ff'; g.fillRect(6, 10, 20, 12); g.fillStyle = '#9ac0e0'; g.fillRect(6, 10, 20, 1); }),
  tubeG: ctex(32, (g) => { g.fillStyle = '#20c070'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#80ffb8'; for (let i = 0; i < 8; i++) g.fillRect((i * 11) % 30, (i * 7) % 30, 2, 2); g.fillStyle = '#e0fff0'; g.fillRect(4, 0, 2, 32); }),
  tubeM: ctex(32, (g) => { g.fillStyle = '#c02090'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#ff80d8'; for (let i = 0; i < 8; i++) g.fillRect((i * 13) % 30, (i * 5) % 30, 2, 2); g.fillStyle = '#ffe0f4'; g.fillRect(4, 0, 2, 32); }),
  metal: ctex(32, (g) => { g.fillStyle = '#6a7486'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#9aa6ba'; g.fillRect(0, 0, 32, 4); g.fillStyle = '#3e4656'; g.fillRect(0, 28, 32, 4); }),
  screen: ctex(32, (g) => { g.fillStyle = '#041a10'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#40ff90'; for (let i = 0; i < 6; i++) g.fillRect(3, 4 + i * 4, 6 + (i * 9) % 20, 2); }),
  crate: ctex(32, (g) => { g.fillStyle = '#f0b020'; g.fillRect(0, 0, 32, 32); g.fillStyle = '#20180c'; for (let i = -32; i < 32; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 4, 0); g.lineTo(i + 36, 32); g.lineTo(i + 32, 32); g.fill(); }
    g.fillStyle = '#20180c'; g.fillRect(0, 0, 32, 2); g.fillRect(0, 30, 32, 2); g.fillRect(0, 0, 2, 32); g.fillRect(30, 0, 2, 32); }),
  white: ctex(8, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, 8); }),
};
const uvScale = (geo, sx, sy) => { const a = geo.attributes.uv.array; for (let i = 0; i < a.length; i += 2) { a[i] *= sx; a[i + 1] *= sy; } return geo; };
const add = (geo, m, pos = [0, 0, 0], rot = [0, 0, 0]) => { const o = new THREE.Mesh(geo, m); o.position.set(...pos); o.rotation.set(...rot); scene.add(o); return o; };

// ------------------------------------------------------------------ the corridor: a few big, low-segment surfaces (the warping lives in them)
const LEN = 64, CW = 8, CH = 6;
add(uvScale(new THREE.PlaneGeometry(CW, LEN, 2, 16), 2, 16), mat(TX.floor), [0, 0, -LEN / 2 + 4], [-Math.PI / 2, 0, 0]);   // big quads warp; the era subdivided only enough to stop the worst
add(uvScale(new THREE.PlaneGeometry(CW, LEN, 2, 8), 2, 16), mat(TX.ceil, { emissive: 0.6 }), [0, CH, -LEN / 2 + 4], [Math.PI / 2, 0, 0]);
add(uvScale(new THREE.PlaneGeometry(LEN, CH, 8, 1), 16, 1.5), mat(TX.wall), [-CW / 2, CH / 2, -LEN / 2 + 4], [0, Math.PI / 2, 0]);
add(uvScale(new THREE.PlaneGeometry(LEN, CH, 8, 1), 16, 1.5), mat(TX.wall), [CW / 2, CH / 2, -LEN / 2 + 4], [0, -Math.PI / 2, 0]);
// test tubes and consoles down both walls, pipes overhead
for (let i = 0; i < 7; i++) { const z = -4 - i * 8, s = i % 2 ? 1 : -1;
  add(new THREE.CylinderGeometry(0.55, 0.55, 3.6, 6, 1), mat(i % 3 ? TX.tubeG : TX.tubeM, { emissive: 0.85 }), [s * 3.1, 2.1, z]);
  add(new THREE.CylinderGeometry(0.75, 0.8, 0.4, 6, 1), mat(TX.metal), [s * 3.1, 0.2, z]); add(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 6, 1), mat(TX.metal), [s * 3.1, 4.05, z]);
  const con = add(new THREE.BoxGeometry(1.2, 1.4, 1.6), mat(TX.metal), [-s * 3.3, 0.7, z - 3]);
  add(new THREE.PlaneGeometry(1.0, 0.7), mat(TX.screen, { emissive: 1 }), [-s * 2.69, 1.15, z - 3], [0, -s * Math.PI / 2, 0]);
}
for (const x of [-2.4, 2.4]) add(uvScale(new THREE.CylinderGeometry(0.22, 0.22, LEN, 5, 1), 1, 20), mat(TX.metal), [x, 5.5, -LEN / 2 + 4], [Math.PI / 2, 0, 0]);
// the doorway at the end: a frame with hazard stripes
for (const [x, w] of [[-3.25, 1.5], [3.25, 1.5]]) add(new THREE.BoxGeometry(w, CH, 0.6), mat(TX.crate), [x, CH / 2, -LEN + 6]);
add(new THREE.BoxGeometry(CW, 1.2, 0.6), mat(TX.crate), [0, CH - 0.6, -LEN + 6]);

// ------------------------------------------------------------------ the logo chamber: a big dark room, a voxel GL, an orbit of crates
const RZ = -LEN - 16;   // the room runs from just past the door to well beyond the logo, so the camera ends INSIDE it
add(uvScale(new THREE.BoxGeometry(26, 14, 40, 3, 2, 4), 6, 3), mat(TX.wall, { side: THREE.BackSide, near: 6, far: 34 }), [0, 7, RZ + 4]);
add(uvScale(new THREE.CircleGeometry(5, 8), 3, 3), mat(TX.floor, { emissive: 0.2 }), [0, 0.02, RZ], [-Math.PI / 2, 0, 0]);
const LOGO = new THREE.Group(); scene.add(LOGO); LOGO.position.set(0, 4.2, RZ);
const ROWS = ['#fff070', '#ffd040', '#ffa030', '#ff6a40', '#f03c70', '#c02090', '#8a1aa0'];
const rowMat = ROWS.map((c) => mat(TX.white, { tint: c, near: 8, far: 40 }));
const px = pixels('GL', true), cube = new THREE.BoxGeometry(0.5, 0.5, 0.7), gw = 13 * 0.5;
for (const [x, y] of px) { const m = new THREE.Mesh(cube, rowMat[y]); m.position.set(x * 0.5 - gw / 2 + 0.25, (6 - y) * 0.5 - 1.5, 0); LOGO.add(m); }
const CRATES = []; for (let i = 0; i < 6; i++) CRATES.push(add(new THREE.BoxGeometry(0.8, 0.8, 0.8), mat(TX.crate, { near: 8, far: 40 })));

// ------------------------------------------------------------------ the camera: a flight down the corridor, through the door, settling on the logo
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);
function cam(t) {
  if (t < T.door) { const k = t / T.door, z = 4 - k * 52;
    camera.position.set(Math.sin(t * 1.6) * 0.6, 1.7 + Math.sin(t * 7) * 0.05, z); camera.lookAt(Math.sin(t * 1.6 + 0.6) * 0.8, 1.9, z - 6); camera.rotation.z += Math.sin(t * 1.3) * 0.06; return; }
  const k = ease((t - T.door) / (T.arrive - T.door)), z = -48 + (RZ + 12 - -48) * k;   // far enough back that the logo and its orbit fit a vertical frame
  camera.position.set(Math.sin(t * 0.7) * 0.8 * k, 1.7 + 2.3 * k, z); camera.lookAt(0, 3.6 + 1.0 * k, RZ);
}

// ------------------------------------------------------------------ one frame: the 3D pass, then the title screen's bitmap text
function draw(t, scr) {
  t = Math.floor(t * 30) / 30;
  cam(t);
  // the logo spins fast, slows, and stops face-on as the title arrives
  const sk = clamp((t - T.door) / (T.spin1 - T.door));
  LOGO.rotation.y = (1 - ease(sk)) * Math.PI * 6 + (t > T.spin1 ? Math.sin((t - T.spin1) * 2) * 0.25 : 0);
  LOGO.position.y = 5.0 + Math.sin(t * 2.4) * 0.15;
  CRATES.forEach((c, i) => { const a = t * 0.9 + i / 6 * Math.PI * 2; c.position.set(Math.cos(a) * 3.8, 5.0 + Math.sin(a * 2) * 0.6, RZ + Math.sin(a) * 3.8); c.rotation.set(t + i, t * 1.3, 0); });
  renderer.render(scene, camera);
  const g = scr.g; g.imageSmoothingEnabled = false; g.drawImage(renderer.domElement, 0, 0);
  // the bitmap title over the 3D, the way title screens layered 2D on polygons
  if (t >= T.title) { const k = clamp((t - T.title) / 0.3), y0 = Math.round(250 + (1 - k) * 40);
    const w1 = textWidth('GAMEPLAY', 2), w2 = textWidth('LABORATORY', 2);
    drawText(g, 'GAMEPLAY', Math.round((W - w1) / 2), y0, { px: 2, fill: (x, y) => ROWS[y], outline: '#14081c' });
    drawText(g, 'LABORATORY', Math.round((W - w2) / 2), y0 + 18, { px: 2, fill: '#e8f4ff', outline: '#14081c' });
    drawText(g, 'WEEK 45', Math.round((W - textWidth('WEEK 45', 1, true)) / 2), y0 + 38, { fill: '#40ff90', bold: true, outline: '#041a10' }); }
  if (t >= T.start && Math.floor((t - T.start) / 0.4) % 2 === 0) drawText(g, 'PRESS START', Math.round((W - textWidth('PRESS START')) / 2), 340, { fill: '#ffffff', outline: '#14081c' });
  return scr.c;
}

register({ w: W, h: H, seconds: SECONDS, events: { music: T.music, door: T.door, arrive: T.arrive, title: T.title, start: T.start }, draw });
