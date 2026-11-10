// NIGHT FLIGHT (RFH, channel promo 1), stills v1, 10 Nov. Owner, Tue 10 Nov: "Let's aim to make the most impressive RFH
// looking at just promoting the channel. Drone is flying through dark forests at night, looking over suspicious activity
// and flagging items, then it flies over Finnish country side and arrives in beautiful illuminated Helsinki. Landing in
// a prominent high location to show the skyline. Text: Radio Free Helsinki.. and then the slogan we have on the channels".
// DEVICE: the drone IS the station. It flags what it finds in the dark (three things RFH has made films about: felling
// at night, unmarked boxes, a gate with no name), flies them home over the lakes, lands on the station's own rooftop
// beside the pirate mast, and the ON AIR sign strikes. The last frame is the end slate's layout, built in 3D.
// Four parts, one flight:
//   1 · FOREST   a fly-by of the drone and its searchlight, then its own view (FPV) weaving between the trunks; three
//                lock-ons: FLAG 01 FELLING AT NIGHT, FLAG 02 UNMARKED BOXES, FLAG 03 NO NAME ON THE GATE; up through the canopy
//   2 · LAND     out over a lake under the aurora (both mirrored in the water), a red cottage and its sauna, a road
//                with one car, and a glow growing on the horizon; the OSD counts down HOME
//   3 · CITY     in from the sea: ferries, the SkyWheel, Uspenski, the Cathedral above the harbor, all mirrored
//   4 · HOME     the drone comes down on the rooftop by the mast and Toko at the mic; ON AIR; RADIO FREE HELSINKI and
//                the channel's slogan: "Pirate Radio from the front lines. Local insights, global outlook, concerned
//                skepticism on all."
// A stylized Helsinki: the landmarks are in their real order from the sea, the distances are compressed. The flagged
// things are generic (no names, no logos): this is the station's persona, not a claim about anyone. No people but Toko.
// 1080×1920, 30 fps. Rendered by pipeline/render.mjs with --mount toko=<repo>/toko. Scenes are built on first use.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../welcome/lib/post.js';
const { drawMasterBadge } = await import('/toko/js/master.js');

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30, DEG = Math.PI / 180;
const Q = new URLSearchParams(location.search), FONT_DIR = Q.get('fonts') || '/_fonts/';
for (const [fam, file, o] of [['Poppins-800', 'Poppins-800.woff'], ['Anton-400', 'Anton-400.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff', { weight: '100 900' }]]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, o || {}); document.fonts.add(await f.load()); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3),
  back: (k) => { k = clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h), V = (a) => new THREE.Vector3(...a);
const hash2 = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash2(xi, yi), hash2(xi + 1, yi), ux), lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), ux), uy); };
const fbm = (x, y, o = 4) => { let a = 0.5, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise(x, y); n += a; x = x * 2.03 + 3.1; y = y * 2.03 + 7.7; a *= 0.5; } return s / n; };
// a smooth curve through (t, value) keys; hermite3 does the same for points
function hermite(K) { const n = K.length, m = K.map((k, i) => i === 0 ? (K[1][1] - k[1]) / (K[1][0] - k[0]) : i === n - 1 ? (k[1] - K[i - 1][1]) / (k[0] - K[i - 1][0]) : (K[i + 1][1] - K[i - 1][1]) / (K[i + 1][0] - K[i - 1][0]));
  return (t) => { if (t <= K[0][0]) return K[0][1]; if (t >= K[n - 1][0]) return K[n - 1][1]; let i = 0; while (t > K[i + 1][0]) i++; const h = K[i + 1][0] - K[i][0], x = (t - K[i][0]) / h, x2 = x * x, x3 = x2 * x;
    return (2 * x3 - 3 * x2 + 1) * K[i][1] + (x3 - 2 * x2 + x) * h * m[i] + (-2 * x3 + 3 * x2) * K[i + 1][1] + (x3 - x2) * h * m[i + 1]; }; }
function hermite3(K) { const f = [0, 1, 2].map((a) => hermite(K.map(([t, p]) => [t, p[a]]))); return (t, o = new THREE.Vector3()) => o.set(f[0](t), f[1](t), f[2](t)); }

// ------------------------------------------------------------------ the clock
// the landing's clock is the end slate's (ON AIR, three notes, the chord), moved to where the drone touches down
const T = { fly: 0, fpv: 1.3, land: 8.4, city: 13.6, home: 18.4, down: 20.2, on: 20.45, end: 27.6 };
T.rings = [T.on + 0.1, T.on + 0.37, T.on + 0.64]; T.chord = T.on + 0.65; T.l1 = T.on + 0.05; T.l2 = T.on + 0.18; T.slogan = T.chord + 0.1;
const LOCK = [1.35, 3.25, 5.15].map((x) => T.fpv + x);   // the three lock-ons
const FLAGS = ['FELLING AT NIGHT', 'UNMARKED BOXES', 'NO NAME ON THE GATE'];
const SLOGAN = ['PIRATE RADIO FROM THE FRONT LINES.', 'Local insights, global outlook,', 'concerned skepticism on all.'];

// ------------------------------------------------------------------ renderer, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

const canvasTex = (w, h, draw, data = false) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
const lum = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...o });   // a light source: values over 1 bloom
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent, scale } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale); parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
function tinted(g, c0, c1 = c0) {   // vertex colours, bottom to top
  g = ni(g); g.computeBoundingBox(); const p = g.attributes.position, a = new Float32Array(p.count * 3), y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, A = C3(c0), B = C3(c1);
  for (let i = 0; i < p.count; i++) { const k = (p.getY(i) - y0) / Math.max(1e-6, y1 - y0); a[i * 3] = lerp(A.r, B.r, k); a[i * 3 + 1] = lerp(A.g, B.g, k); a[i * 3 + 2] = lerp(A.b, B.b, k); }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const glow = (parent, pos, size, r, g, b) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(r, g, b), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.position.set(...pos); s.scale.setScalar(size); parent.add(s); return s; };

const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm2(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(3.1,7.7); a*=.5; } return s; }`;

// ------------------------------------------------------------------ the sky: gradient, a city's light dome, the moon, the aurora, stars
function makeSky(scene, o) {
  const U = { uTime: { value: 0 }, uTop: { value: C3(o.top) }, uHor: { value: C3(o.hor) }, uGlowDir: { value: V(o.glowDir || [0, 0, -1]).normalize() }, uGlowCol: { value: C3(o.glowCol || '#000000') }, uGlow: { value: o.glow ?? 0 },
    uGlowP: { value: o.glowP ?? 9 }, uGlowE: { value: o.glowE ?? 13 }, uMoon: { value: V(o.moon).normalize() }, uAur: { value: o.aurora ?? 0 }, uAurAz: { value: o.auroraAz ?? 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uGlow, uGlowP, uGlowE, uAur, uAurAz; uniform vec3 uTop, uHor, uGlowDir, uGlowCol, uMoon; varying vec3 vD;
${GLSL_NOISE}
void main(){
  vec3 d = normalize(vD); float el = d.y;
  vec3 col = mix(uHor, uTop, pow(clamp(el, 0., 1.), 0.42));
  col = mix(col, uHor * 0.55, smoothstep(0., -0.3, el));
  float g = max(dot(normalize(vec3(d.x, 0.0001, d.z)), uGlowDir), 0.);
  col += uGlowCol * uGlow * pow(g, uGlowP) * exp(-max(el, 0.) * uGlowE);
  float m = dot(d, uMoon);
  col += vec3(1.0, 0.97, 0.9) * (smoothstep(0.99962, 0.9998, m) * 5. + pow(max(m, 0.), 700.) * 0.5 + pow(max(m, 0.), 30.) * 0.06);
  if (uAur > 0.) {
    float az = atan(d.x, -d.z) - uAurAz;
    float c = 0.30 + 0.09 * sin(az * 2.1 + uTime * 0.15) + 0.045 * sin(az * 5.3 - uTime * 0.22);
    float lower = smoothstep(c - 0.10, c, el), upper = exp(-max(el - c, 0.) * 5.5);
    float rays = 0.45 + 0.55 * fbm2(vec2(az * 36. + uTime * 0.5, el * 2.5 + 3.));
    float patches = smoothstep(0.22, 0.62, fbm2(vec2(az * 2.2 - uTime * 0.06, 7.)));
    float a = lower * upper * rays * patches * max(cos(clamp(az * 0.8, -1.57, 1.57)), 0.) * uAur;
    col += mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.25, 1.0), smoothstep(0.0, 0.35, el - c)) * a * 1.3;
  }
  gl_FragColor = vec4(col, 1.);
}` }));
  dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  const n = o.stars ?? 1600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), R = rng(11);
  for (let i = 0; i < n; i++) { const u = 0.03 + R() * 0.97, a = R() * TAU, s = Math.sqrt(1 - u * u); pos.set([3400 * s * Math.cos(a), 3400 * u, 3400 * s * Math.sin(a)], i * 3); const b = Math.pow(R(), 5) * 1.8 + 0.1; col.set([b * (0.85 + R() * 0.15), b * 0.92, b], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false, transparent: true })); stars.renderOrder = -9; stars.frustumCulled = false; scene.add(stars);
  return { U, follow(cam, t) { dome.position.copy(cam.position); stars.position.copy(cam.position); U.uTime.value = t; } };
}

// ------------------------------------------------------------------ water: a true planar reflection, rippled
// The scene is rendered once more from the camera's mirror image (everything under the surface clipped away) and the
// water looks that picture up through its own ripples. Streaks of light on the water come for free.
function makeWater(scene, { y = 0, w, d, x = 0, z = 0, deep = '#02060c', fog, amp = 0.014 }) {
  const rt = new THREE.WebGLRenderTarget(720, 1280, { type: THREE.HalfFloatType });
  const mcam = new THREE.PerspectiveCamera(), texM = new THREE.Matrix4();
  const U = { tR: { value: rt.texture }, texM: { value: texM }, uTime: { value: 0 }, uDeep: { value: C3(deep) }, uAmp: { value: amp }, uFogC: { value: fog ? fog.color.clone() : C3('#000000') }, uFogD: { value: fog ? fog.density : 0 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `uniform mat4 texM; varying vec4 vR; varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vR = texM * wp; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform sampler2D tR; uniform float uTime, uAmp, uFogD; uniform vec3 uDeep, uFogC; varying vec4 vR; varying vec3 vW;
${GLSL_NOISE}
void main(){
  vec3 toC = cameraPosition - vW; float dist = length(toC); vec3 Vv = toC / dist; vec2 p = vW.xz;
  float a = fbm2(p * 0.11 + vec2(uTime * 0.35, uTime * 0.12)) - 0.5, b = fbm2(p * 0.11 + vec2(-uTime * 0.2, 5.2 + uTime * 0.3)) - 0.5, fine = fbm2(p * 0.8 + uTime * 0.7) - 0.5;
  float k = uAmp * (0.3 + 0.7 * exp(-dist / 600.));
  vec4 r = vR; r.xy += vec2(a * 0.6 + fine * 0.25, b * 2.4 + fine * 0.6) * k * r.w;
  vec3 refl = texture2DProj(tR, r).rgb;
  float fres = 0.32 + 0.68 * pow(1. - clamp(Vv.y, 0., 1.), 4.);
  vec3 col = mix(uDeep, refl, fres);
  float f = 1. - exp(-uFogD * uFogD * dist * dist);
  gl_FragColor = vec4(mix(col, uFogC, f), 1.);
}` }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y - 0.03), e = new THREE.Vector3(), f = new THREE.Vector3(), u = new THREE.Vector3();
  return { mesh: m, U, update(camera, t) {
    U.uTime.value = t; camera.updateMatrixWorld(true); const q = camera.matrixWorld.elements; e.setFromMatrixPosition(camera.matrixWorld); u.set(q[4], q[5], q[6]); f.set(-q[8], -q[9], -q[10]);
    mcam.fov = camera.fov; mcam.aspect = camera.aspect; mcam.near = camera.near; mcam.far = camera.far; mcam.updateProjectionMatrix();
    mcam.position.set(e.x, 2 * y - e.y, e.z); mcam.up.set(u.x, -u.y, u.z); mcam.lookAt(e.x + f.x, 2 * y - (e.y + f.y), e.z + f.z); mcam.updateMatrixWorld(true);
    texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(mcam.projectionMatrix).multiply(mcam.matrixWorldInverse);
    m.visible = false; const old = renderer.clippingPlanes; renderer.clippingPlanes = [plane];
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, mcam); renderer.setRenderTarget(null);
    renderer.clippingPlanes = old; m.visible = true; } };
}

// ------------------------------------------------------------------ the drone (nose toward -z)
function makeDrone() {
  const G = new THREE.Group(), dark = std('#1a1c22', { roughness: 0.45, metalness: 0.3 }), grey = std('#3b3f4a', { roughness: 0.5, metalness: 0.4 }); G.userData.blades = [];
  mesh(rbox(0.36, 0.1, 0.46, 0.04), dark, { parent: G }); mesh(rbox(0.2, 0.07, 0.24, 0.03), grey, { pos: [0, 0.075, -0.02], parent: G });
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const A = new THREE.Group(); G.add(A); A.rotation.y = Math.atan2(sx, sz);
    mesh(new THREE.BoxGeometry(0.05, 0.035, 0.36), dark, { pos: [0, 0, 0.26], parent: A }); mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 12), grey, { pos: [0, 0.03, 0.42], parent: A });
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.006, 24), new THREE.MeshBasicMaterial({ color: '#cfd6e6', transparent: true, opacity: 0.12, depthWrite: false }), { pos: [0, 0.075, 0.42], parent: A });
    G.userData.blades.push(mesh(new THREE.BoxGeometry(0.4, 0.004, 0.03), new THREE.MeshBasicMaterial({ color: '#0c0d10', transparent: true, opacity: 0.5 }), { pos: [0, 0.078, 0.42], parent: A }));
    mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), dark, { pos: [0, -0.1, 0.3], parent: A }); mesh(new THREE.SphereGeometry(0.022, 8, 6), dark, { pos: [0, -0.18, 0.3], parent: A }); }
  mesh(new THREE.SphereGeometry(0.06, 16, 12), dark, { pos: [0, -0.07, -0.2], parent: G });
  mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 16), std('#05060a', { roughness: 0.1 }), { pos: [0, -0.07, -0.255], rot: [Math.PI / 2, 0, 0], parent: G });
  for (const sx of [-1, 1]) { mesh(new THREE.SphereGeometry(0.018, 8, 6), lum(6, 6, 6), { pos: [sx * 0.12, 0, -0.235], parent: G }); glow(G, [sx * 0.12, 0, -0.24], 0.5, 0.7, 0.75, 0.9); }
  // the station's dot: one magenta light on its tail, and the badge on its back
  G.userData.dot = mesh(new THREE.SphereGeometry(0.03, 10, 8), lum(7, 0.1, 3.6), { pos: [0, 0.05, 0.235], parent: G }); G.userData.dotGlow = glow(G, [0, 0.05, 0.24], 0.9, 1.0, 0.02, 0.5);
  const badge = canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); drawMasterBadge(g, 128, 128, 120, { ground: '#F0027F', ink: '#ffffff' }); });
  mesh(new THREE.CircleGeometry(0.085, 32), new THREE.MeshBasicMaterial({ map: badge, transparent: true, color: new THREE.Color(1.2, 1.2, 1.2) }), { pos: [0, 0.112, -0.02], rot: [-Math.PI / 2, 0, 0], parent: G });
  // its searchlight: a real spot and a cone you can see in the mist
  const AIM = [0, -1.9, -12], spot = new THREE.SpotLight('#fff1d6', 520, 0, 0.5, 0.8, 2); spot.position.set(0, -0.08, -0.26); spot.target.position.set(...AIM); G.add(spot, spot.target); G.userData.spot = spot;
  const L = 26, cone = new THREE.ConeGeometry(Math.tan(0.5) * L, L, 40, 1, true); cone.translate(0, -L / 2, 0); cone.rotateX(Math.atan2(-AIM[2], -AIM[1]));
  const beam = new THREE.Mesh(cone, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 1 } },
    vertexShader: `varying float vK; varying vec3 vN; varying vec3 vV; void main(){ vK = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; varying float vK; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); gl_FragColor = vec4(vec3(1.0, 0.93, 0.8) * uA * e * pow(vK, 1.6) * 0.6, 1.); }` }));
  beam.position.copy(spot.position); G.add(beam); G.userData.beam = beam; G.userData.lamp = glow(G, [0, -0.08, -0.27], 1.6, 2.2, 2.0, 1.6);
  return G;
}
function spin(D, t) { D.userData.blades.forEach((b, i) => { b.rotation.y = t * 61 * (i % 2 ? 1 : -1) + i; }); }

// ================================================================== 1 · THE FOREST
function buildForest() {
  const S = new THREE.Scene(), FOGC = C3('#11264a'); S.fog = new THREE.FogExp2(FOGC, 0.021); S.background = FOGC;
  const sky = makeSky(S, { top: '#030611', hor: '#11264a', moon: [-0.42, 0.66, -0.62], aurora: 0.32, stars: 1500 });
  S.add(new THREE.HemisphereLight('#3a5688', '#070a0e', 1.0));
  const moon = new THREE.DirectionalLight('#9dbcff', 1.9); moon.position.set(-42, 66, -62); S.add(moon);
  // the ground: moss and the first snow
  const gy = (x, z) => (fbm(x / 22, z / 22) - 0.5) * 1.6;
  { const gg = new THREE.PlaneGeometry(260, 460, 86, 150); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -150); const p = gg.attributes.position, c = new Float32Array(p.count * 3), A = C3('#131c17'), B = C3('#7d91ae'), X = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, gy(x, z)); X.copy(A).lerp(B, smooth((fbm(x / 9 + 4, z / 9 + 1, 3) - 0.5) / 0.2) * 0.8); c.set([X.r, X.g, X.b], i * 3); }
    gg.setAttribute('color', new THREE.BufferAttribute(c, 3)); gg.computeVertexNormals(); S.add(new THREE.Mesh(gg, std('#ffffff', { vertexColors: true, roughness: 1 }))); }
  // the flight: a weave between the trunks, then straight up through the canopy
  const PATH = new THREE.CatmullRomCurve3([[0, 4.2, 0], [4, 3.8, -30], [-4, 4.2, -62], [3, 3.8, -95], [-4, 4.2, -128], [5, 4.0, -160], [1, 5, -192], [0, 12, -216], [0, 34, -240], [0, 80, -268]].map(V), false, 'centripetal'), LEN = PATH.getLength();
  const OPEN = new THREE.CatmullRomCurve3([[-5, 5.6, 50], [-2.4, 4.6, 24], [0.4, 3.1, 0], [1.9, 2.5, -12], [2.6, 3.0, -22]].map(V));
  const IT = [{ p: V([-12, 0, -51]), r: 10.5, focus: V([-11, 2.6, -51]) }, { p: V([11.5, 0, -111]), r: 9, focus: V([11, 1.5, -111]) }, { p: V([-14, 0, -177]), r: 13, focus: V([-14, 2.6, -175]) }];
  const PS = PATH.getSpacedPoints(170).filter((p) => p.y < 14).concat(OPEN.getSpacedPoints(40));
  const SIGHT = []; [[24, 44], [82, 102], [144, 164]].forEach(([s0, s1], i) => { for (let q = 0; q <= 4; q++) { const a = PATH.getPointAt(lerp(s0, s1, q / 4) / LEN); for (let k = 1; k < 10; k++) SIGHT.push([lerp(a.x, IT[i].focus.x, k / 10), lerp(a.z, IT[i].focus.z, k / 10)]); } });
  const free = (x, z) => { for (const p of PS) { const dx = p.x - x, dz = p.z - z; if (dx * dx + dz * dz < 20) return false; }
    for (const it of IT) if (it.r && (it.p.x - x) ** 2 + (it.p.z - z) ** 2 < it.r * it.r) return false;
    for (const [sx, sz] of SIGHT) if ((sx - x) ** 2 + (sz - z) ** 2 < 12) return false;
    return !(x < -10 && x > -96 && z < -144 && z > -222); };
  // spruces and pines, frosted at the tips
  const spruce = (() => { const parts = [tinted(new THREE.CylinderGeometry(0.16, 0.3, 3.4, 6).translate(0, 1.7, 0), '#33241b')];
    for (let i = 0; i < 5; i++) { const k = i / 4, r = lerp(1.9, 0.55, k), h = lerp(3.4, 2.4, k); parts.push(tinted(new THREE.ConeGeometry(r, h, 8, 1, true).translate(0, 2.7 + i * 1.75 + h / 2, 0), '#0a1b15', '#3f625c')); } return mergeGeometries(parts); })();
  const pine = mergeGeometries([tinted(new THREE.CylinderGeometry(0.2, 0.32, 13, 6).translate(0, 6.5, 0), '#5d3b29', '#8a583a'), tinted(new THREE.IcosahedronGeometry(2.7, 1).scale(1, 0.7, 1).translate(0, 14, 0), '#0d2219', '#3c5f58')]);
  const R = rng(101), sp = [], pn = [];
  for (let i = 0; i < 4000 && sp.length + pn.length < 1250; i++) { const x = (R() - 0.5) * 156, z = 46 - R() * 330; if (!free(x, z)) continue; (R() < 0.8 ? sp : pn).push([x, z, 0.75 + R() * 0.85, R() * TAU]); }
  const treeMat = std('#ffffff', { vertexColors: true, roughness: 1, side: THREE.DoubleSide }), D = new THREE.Object3D();
  for (const [geo, list] of [[spruce, sp], [pine, pn]]) { const im = new THREE.InstancedMesh(geo, treeMat, list.length); list.forEach(([x, z, s, a], i) => { D.position.set(x, gy(x, z) - 0.2, z); D.rotation.set(0, a, 0); D.scale.set(s, s * (0.9 + 0.25 * hash2(x, z)), s); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }); S.add(im); }
  // ---- FLAG 01: felling at night. A harvester under its work lights, a pile of logs, fresh stumps
  { const G = new THREE.Group(); S.add(G); G.position.copy(IT[0].p); G.position.y = gy(-12, -51); G.rotation.y = 0.65; G.scale.setScalar(1.15);
    const yel = std('#d99a1e', { roughness: 0.5 }), blk = std('#15161a', { roughness: 0.7 }), cut = std('#d9b98a'), bark = std('#4a3526', { roughness: 1 });
    mesh(rbox(5.4, 1.2, 2.5, 0.2), yel, { pos: [0, 1.6, 0], parent: G }); mesh(rbox(2.0, 2.0, 2.1, 0.25), yel, { pos: [-1.2, 3.1, 0], parent: G }); mesh(new THREE.BoxGeometry(1.9, 1.1, 1.9), std('#0d1118', { roughness: 0.1, emissive: C3('#3a2a10'), emissiveIntensity: 1 }), { pos: [-1.15, 3.3, 0], parent: G });
    for (const x of [-1.9, 0, 1.9]) for (const z of [-1.35, 1.35]) mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.6, 16), blk, { pos: [x, 0.9, z], rot: [Math.PI / 2, 0, 0], parent: G });
    mesh(new THREE.BoxGeometry(5.2, 0.35, 0.35), yel, { pos: [1.9, 5.0, 0], rot: [0, 0, 0.42], parent: G }); mesh(new THREE.BoxGeometry(3.4, 0.3, 0.3), yel, { pos: [5.1, 4.9, 0], rot: [0, 0, -0.95], parent: G }); mesh(rbox(0.9, 1.3, 1.0, 0.1), blk, { pos: [6.1, 3.0, 0], parent: G });
    mesh(new THREE.CylinderGeometry(0.26, 0.3, 7, 8), [bark, cut, cut], { pos: [6.1, 2.7, 0.4], rot: [Math.PI / 2, 0, 0.1], parent: G });
    for (const [x, z] of [[-0.4, 0.8], [-2.0, 0.8], [-0.4, -0.8], [-2.0, -0.8]]) { mesh(new THREE.SphereGeometry(0.12, 8, 6), lum(5, 4, 2.6), { pos: [x, 4.25, z], parent: G }); glow(G, [x, 4.25, z], 1.8, 0.8, 0.62, 0.38); }
    const wl = new THREE.PointLight('#ffdca8', 420, 60, 2); wl.position.set(1.5, 5.2, 0); G.add(wl);
    let k = 0; for (const [n, y] of [[4, 0.35], [3, 0.95], [2, 1.55]]) for (let i = 0; i < n; i++) mesh(new THREE.CylinderGeometry(0.3, 0.34, 6.4, 8), [bark, cut, cut], { pos: [-1.5 + (k++ % 2) * 0.1, y, 4.6 + (i - (n - 1) / 2) * 0.66], rot: [0, 0, Math.PI / 2], parent: G });
    const Rr = rng(7); for (let i = 0; i < 14; i++) { const a = Rr() * TAU, d = 3.5 + Rr() * 7; mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.4, 8), [bark, cut, cut], { pos: [Math.cos(a) * d, 0.2, Math.sin(a) * d], parent: G }); } }
  // ---- FLAG 02: unmarked boxes. Pallets of plain cartons, a plain van with its doors open, one floodlight
  { const G = new THREE.Group(); S.add(G); G.position.copy(IT[1].p); G.position.y = gy(11.5, -111); G.rotation.y = -0.5; G.scale.setScalar(1.2);
    const kraft = std('#b8925e', { roughness: 0.9 }), wood = std('#8a6a44'), white = std('#dfe3e6', { roughness: 0.45 }), blk = std('#15161a');
    for (const [px, pz] of [[0, 0], [1.9, 0.5], [-0.4, 1.9]]) { mesh(new THREE.BoxGeometry(1.3, 0.16, 1.1), wood, { pos: [px, 0.08, pz], parent: G });
      for (let l = 0; l < (px ? 2 : 3); l++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), kraft, { pos: [px - 0.31 + i * 0.62, 0.42 + l * 0.52, pz - 0.26 + j * 0.52], rot: [0, (hash2(px + i, l + j) - 0.5) * 0.12, 0], parent: G }); }
    const VAN = new THREE.Group(); G.add(VAN); VAN.position.set(-4.4, 0, -1.2); VAN.rotation.y = 0.35;
    mesh(rbox(2.1, 2.0, 5.0, 0.3), white, { pos: [0, 1.5, 0], parent: VAN }); mesh(new THREE.BoxGeometry(1.9, 0.8, 0.1), std('#0b0e14', { roughness: 0.1 }), { pos: [0, 2.0, -2.5], parent: VAN });
    for (const x of [-1, 1]) for (const z of [-1.6, 1.6]) mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), blk, { pos: [x, 0.42, z], rot: [0, 0, Math.PI / 2], parent: VAN });
    for (const sx of [-1, 1]) { mesh(new THREE.BoxGeometry(0.06, 1.7, 1.0), white, { pos: [sx * 1.5, 1.5, 2.9], rot: [0, sx * 0.5, 0], parent: VAN }); mesh(new THREE.BoxGeometry(0.12, 0.3, 0.05), lum(4, 0.2, 0.1), { pos: [sx * 0.95, 1.0, 2.52], parent: VAN }); }
    mesh(new THREE.BoxGeometry(1.8, 1.6, 0.05), std('#0a0b0e'), { pos: [0, 1.5, 2.48], parent: VAN });
    for (const a of [0, 2.1, 4.2]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), blk, { pos: [3.6 + Math.cos(a) * 0.35, 1.25, 2.6 + Math.sin(a) * 0.35], rot: [Math.sin(a) * 0.27, 0, -Math.cos(a) * 0.27], parent: G });
    mesh(new THREE.BoxGeometry(0.5, 0.34, 0.12), lum(5, 5.6, 7), { pos: [3.6, 2.6, 2.6], rot: [0.3, -2.2, 0], parent: G }); glow(G, [3.6, 2.6, 2.6], 2.0, 0.5, 0.62, 0.85);
    const fl = new THREE.PointLight('#dfeaff', 260, 50, 2); fl.position.set(3.2, 2.7, 2.2); G.add(fl); }
  // ---- FLAG 03: no name on the gate. A hall behind a fence, lit, humming; the sign at the gate is blank
  { const G = new THREE.Group(); S.add(G); G.position.set(-14, gy(-14, -177), -177);
    const ribTex = canvasTex(64, 8, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#d6d6d6', '#f2f2f2', '#ffffff', '#f2f2f2', '#d6d6d6', '#9a9a9a', '#6e6e6e', '#9a9a9a'][i]; g.fillRect(i * 8, 0, 8, 8); } }); ribTex.wrapS = ribTex.wrapT = THREE.RepeatWrapping; ribTex.repeat.set(26, 1);
    mesh(new THREE.BoxGeometry(60, 10, 30), std('#77818c', { roughness: 0.75, map: ribTex }), { pos: [-42, 5, -6], parent: G }); mesh(new THREE.BoxGeometry(0.2, 5.6, 7), std('#2a3038', { roughness: 0.6 }), { pos: [-11.95, 2.8, 3], parent: G }); mesh(new THREE.BoxGeometry(60.4, 0.5, 30.4), std('#8d959c'), { pos: [-42, 10.2, -6], parent: G });
    for (let i = 0; i < 6; i++) { mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.2, 16), std('#7d858c', { metalness: 0.4, roughness: 0.4 }), { pos: [-64 + i * 8.5, 11, -6], parent: G });
      for (let k = 0; k < 3; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.56, 0.66), transparent: true, opacity: 0.16, depthWrite: false })); s.position.set(-64 + i * 8.5 + k * 0.8, 13.5 + k * 3.2, -6 - k * 0.6); s.scale.setScalar(5 + k * 3.5); G.add(s); } }
    for (let i = 0; i < 7; i++) { mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), lum(4, 5, 7), { pos: [-12.2, 7.6, -19 + i * 4.4], parent: G }); glow(G, [-11.8, 7.6, -19 + i * 4.4], 2.4, 0.3, 0.45, 0.75); }
    for (const z of [-14, -2, 10]) { const pl = new THREE.PointLight('#cfe2ff', 58, 55, 2); pl.position.set(-9, 6.5, z); G.add(pl); }
    const fenceTex = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(190,200,215,1)'; g.lineWidth = 3; for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } });
    fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.repeat.set(46, 2.2);
    mesh(new THREE.PlaneGeometry(74, 3.2), new THREE.MeshStandardMaterial({ map: fenceTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.5 }), { pos: [0, 1.6, -4], rot: [0, Math.PI / 2, 0], parent: G });
    const steel = std('#8f98a3', { metalness: 0.6, roughness: 0.4 }); for (let i = 0; i <= 24; i++) mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), steel, { pos: [0, 1.7, -41 + i * 3.08], parent: G });
    for (const z of [-2.6, 2.6]) mesh(new THREE.BoxGeometry(0.22, 3.8, 0.22), steel, { pos: [0.1, 1.9, z], parent: G });
    // the sign by the gate: a lit white board with nothing on it
    mesh(new THREE.BoxGeometry(0.08, 1.2, 2.0), std('#f4f5f7', { emissive: C3('#aab4c4'), emissiveIntensity: 1.6 }), { pos: [0.25, 2.3, 4.2], parent: G }); mesh(new THREE.BoxGeometry(0.3, 0.1, 2.0), lum(8, 9, 11), { pos: [0.5, 3.15, 4.2], parent: G }); glow(G, [0.5, 3.1, 4.2], 3.0, 0.6, 0.7, 1.0); }
  // dust and frost in the air: it shows the speed, and the light
  const NP = 900, base = Float32Array.from({ length: NP * 3 }, rng(5)), pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex, size: 0.14, color: new THREE.Color(0.9, 0.95, 1.1), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })); dust.frustumCulled = false; S.add(dust);
  const BOX = [26, 13, 44], wrap = (v, s) => ((v % s) + s) % s - s / 2;
  function dustAt(c, t) { const a = pg.attributes.position; for (let i = 0; i < NP; i++) a.setXYZ(i, c.x + wrap(base[i * 3] * BOX[0] - c.x + Math.sin(t * 0.7 + i) * 0.3, BOX[0]), c.y + wrap(base[i * 3 + 1] * BOX[1] - c.y - t * 0.25, BOX[1]), c.z + wrap(base[i * 3 + 2] * BOX[2] - c.z, BOX[2])); a.needsUpdate = true; }
  const drone = makeDrone(); S.add(drone);
  const cam = new THREE.PerspectiveCamera(74, W / H, 0.2, 9000);
  const sAt = hermite([[0, 0], [0.8, 26], [1.9, 40], [2.7, 84], [3.8, 98], [4.6, 146], [5.7, 160], [6.2, 200], [7.1, LEN]]);
  const bump = (t, t0) => smooth((t - (t0 - 0.8)) / 0.5) * (1 - smooth((t - (t0 + 0.35)) / 0.45));
  const a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
  return { scene: S, cam, items: IT, update(t) {
    const fpv = t >= T.fpv; drone.userData.beam.visible = drone.userData.lamp.visible = !fpv; spin(drone, t);
    if (!fpv) {   // the fly-by: the camera waits low among the trunks, the drone comes out of the dark and over it
      const k = clamp(Math.pow(t / T.fpv, 1.15)) * 0.97 + 0.01; OPEN.getPointAt(k, drone.position); OPEN.getPointAt(Math.min(1, k + 0.02), a3); drone.lookAt(a3); drone.rotateX(-0.16); drone.rotateZ(Math.sin(t * 3) * 0.08); drone.visible = true;
      cam.fov = 58; cam.position.set(1.5, 1.25 + Math.sin(t * 2.1) * 0.03, -15); cam.up.set(0, 1, 0); cam.lookAt(b3.copy(drone.position).lerp(a3.set(-2, 5, 26), 0.45)); cam.rotateZ(-0.04);
    } else {      // its own view: along the path, the gimbal turning to each thing it flags, banking into the turns
      const tau = t - T.fpv, s = sAt(tau), p = PATH.getPointAt(clamp(s / LEN)), look = PATH.getPointAt(clamp((s + 9) / LEN));
      let zoom = 0; IT.forEach((it, i) => { const b = bump(t, LOCK[i]); look.lerp(it.focus, b * 0.86); zoom = Math.max(zoom, b); });
      look.lerp(a3.set(p.x, p.y + 8, p.z - 60), smooth((p.y - 8) / 30) * 0.75);
      cam.fov = 74 - 24 * zoom; cam.position.copy(p); cam.position.y += Math.sin(tau * 5.1) * 0.05; cam.up.set(0, 1, 0); cam.lookAt(look);
      const t0 = PATH.getTangentAt(clamp((s - 3) / LEN)), t1 = PATH.getTangentAt(clamp((s + 6) / LEN)), turn = Math.atan2(t0.x * t1.z - t0.z * t1.x, t0.x * t1.x + t0.z * t1.z);
      cam.rotateZ(clamp(turn * 1.5, -0.45, 0.45) * (p.y < 14 ? 1 : 0.2));
      drone.visible = false; drone.position.copy(cam.position); drone.quaternion.copy(cam.quaternion); drone.visible = true; drone.traverse((o) => { if (o.isMesh || o.isSprite) o.visible = false; });   // only its light is left
    }
    if (!fpv) drone.traverse((o) => { if (o.isMesh || o.isSprite) o.visible = true; });
    cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); dustAt(cam.position, t); sky.follow(cam, t);
    return { speed: fpv ? clamp((sAt(t - T.fpv + 0.05) - sAt(t - T.fpv - 0.05)) / 0.1 / 40) : 0, alt: cam.position.y, kmh: fpv ? Math.min(142, (sAt(t - T.fpv + 0.05) - sAt(t - T.fpv - 0.05)) / 0.1 * 2.2) : 0 };
  } };
}

// ================================================================== 2 · THE LAKE COUNTRY
function buildLand() {
  const S = new THREE.Scene(), FOGC = C3('#0c1c38'); S.fog = new THREE.FogExp2(FOGC, 0.0011); S.background = FOGC;
  const sky = makeSky(S, { top: '#02050f', hor: '#0e2244', glowDir: [0.08, 0, -1], glowCol: '#f08a62', glowP: 20, glowE: 30, glow: 0.02, moon: [0.2, 0.26, -0.945], aurora: 1.0, auroraAz: -0.3, stars: 2200 });
  S.add(new THREE.HemisphereLight('#40609a', '#06080c', 0.8));
  const moon = new THREE.DirectionalLight('#b4c8f4', 1.9); moon.position.set(20, 26, -94.5); S.add(moon);
  const POSK = [[0, [0, 26, 190]], [0.9, [-4, 5.6, 70]], [2.0, [4, 4.3, -130]], [2.8, [-2, 7.5, -262]], [3.6, [-10, 30, -380]], [4.5, [0, 44, -520]], [5.2, [6, 50, -640]]], posAt = hermite3(POSK);
  const FLY = []; for (let q = 2.6; q <= 5.3; q += 0.06) { const v = posAt(q); FLY.push([v.x, v.z]); }
  // the land: a long lake under the flight, a shore, forest and snowy fields, hills behind
  const shoreZ = (x) => -300 + (fbm(x / 140 + 2, 1.5, 3) - 0.5) * 110;
  const CX = -36, CZ = shoreZ(-36) - 30, ROAD = { a: [470, -452], b: [-470, -512], y: 9 };
  const roadD = (x, z) => { const [ax, az] = ROAD.a, [bx, bz] = ROAD.b, dx = bx - ax, dz = bz - az, k = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)); return Math.hypot(x - (ax + dx * k), z - (az + dz * k)); };
  const hL = (x, z) => {
    const land = smooth((shoreZ(x) - z) / 46), side = smooth((Math.abs(x + (fbm(z / 160, 9, 2) - 0.5) * 120) - 300) / 90), back = smooth((z - 235) / 60), dry = Math.max(land, side, back);
    let h = 2.5 + fbm(x / 240 + 5, z / 240 + 3, 5) * 30 + smooth((-z - 700) / 900) * fbm(x / 500, z / 500, 3) * 90;
    let field = smooth((fbm(x / 230 + 11, z / 230 + 5, 3) - 0.5) / 0.1) * smooth((-z - 335) / 60);
    h = lerp(h, 7 + fbm(x / 60, z / 60, 2) * 1.5, field * 0.85);
    const yard = smooth(1 - Math.hypot(x - CX, z - CZ) / 40); h = lerp(h, 3.2, yard); field = Math.max(field, yard);
    const rd = smooth(1 - roadD(x, z) / 18); h = lerp(h, ROAD.y, rd);
    return { h: lerp(-7, h, dry), field, dry };
  };
  { const tg = new THREE.PlaneGeometry(2400, 2600, 200, 216); tg.rotateX(-Math.PI / 2); tg.translate(0, 0, -850); const p = tg.attributes.position, c = new Float32Array(p.count * 3), A = C3('#0c1512'), B = C3('#62769a'), X = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), q = hL(x, z); p.setY(i, q.h); X.copy(A).lerp(B, Math.max(q.field, smooth((2.2 - q.h) / 2) * 0.6)); c.set([X.r, X.g, X.b], i * 3); }
    tg.setAttribute('color', new THREE.BufferAttribute(c, 3)); tg.computeVertexNormals(); S.add(new THREE.Mesh(tg, std('#ffffff', { vertexColors: true, roughness: 1 }))); }
  // the forest, from above: two cones a tree, frosted
  { const geo = mergeGeometries([tinted(new THREE.ConeGeometry(2.3, 5.5, 6, 1, true).translate(0, 3.2, 0), '#081711', '#27463e'), tinted(new THREE.ConeGeometry(1.5, 4.6, 6, 1, true).translate(0, 6.6, 0), '#0c1f17', '#6c8f8c')]);
    const R = rng(31), list = [];
    for (let i = 0; i < 60000 && list.length < 13500; i++) { const x = (R() - 0.5) * 1360, z = 330 - R() * 1700, q = hL(x, z); if (q.dry < 0.8 || q.h < 1.3 || q.field > 0.25 || roadD(x, z) < 10) continue; if (fbm(x / 70 + 1, z / 70 + 8, 2) < 0.36) continue; if (FLY.some(([fx, fz]) => (fx - x) ** 2 + (fz - z) ** 2 < 330)) continue; list.push([x, q.h, z, 0.9 + R() * 0.9, R() * TAU]); }
    const im = new THREE.InstancedMesh(geo, std('#ffffff', { vertexColors: true, roughness: 1, side: THREE.DoubleSide }), list.length), D = new THREE.Object3D();
    list.forEach(([x, y, z, s, a], i) => { D.position.set(x, y - 0.3, z); D.rotation.set(0, a, 0); D.scale.set(s, s * 1.15, s); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }); S.add(im); }
  // a red cottage by the shore, its sauna, a pier with a lantern
  { const G = new THREE.Group(); S.add(G); G.position.set(CX, 3.2, CZ); G.rotation.y = 0.3;
    const red = std('#8a241b', { roughness: 0.9 }), white = std('#e9e6dd'), roofM = std('#b9c6dc', { roughness: 1 }), warm = lum(3.2, 2.1, 0.9);
    const house = (w, h, d, x, z, ry) => { const Hh = new THREE.Group(); G.add(Hh); Hh.position.set(x, 0, z); Hh.rotation.y = ry;
      mesh(new THREE.BoxGeometry(w, h, d), red, { pos: [0, h / 2, 0], parent: Hh });
      const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.5, 0); sh.lineTo(0, w * 0.34); sh.lineTo(w / 2 + 0.5, 0); sh.closePath();
      mesh(new THREE.ExtrudeGeometry(sh, { depth: d + 0.8, bevelEnabled: false }).translate(0, h, -d / 2 - 0.4), roofM, { parent: Hh });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(0.22, h, 0.22), white, { pos: [sx * w / 2, h / 2, sz * d / 2], parent: Hh });
      return Hh; };
    const H1 = house(9, 3.3, 6.4, 0, 0, 0);
    for (const x of [-2.4, 2.4]) { mesh(new THREE.BoxGeometry(1.5, 1.4, 0.1), white, { pos: [x, 1.9, 3.22], parent: H1 }); mesh(new THREE.PlaneGeometry(1.25, 1.15), warm, { pos: [x, 1.9, 3.29], parent: H1 }); glow(H1, [x, 1.9, 3.5], 5, 1.0, 0.6, 0.25); }
    mesh(new THREE.BoxGeometry(1.0, 2.1, 0.1), white, { pos: [0, 1.05, 3.22], parent: H1 }); mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), std('#5a4a44'), { pos: [2.2, 5.2, -0.6], parent: H1 });
    const porch = new THREE.PointLight('#ffb468', 420, 60, 2); porch.position.set(0, 2.8, 5.5); H1.add(porch); mesh(new THREE.SphereGeometry(0.14, 8, 6), lum(8, 5, 2), { pos: [0, 2.7, 3.5], parent: H1 }); glow(H1, [0, 2.7, 3.6], 3.4, 1.0, 0.6, 0.25);
    const H2 = house(4.6, 2.5, 3.6, 17, 22, -0.5); mesh(new THREE.PlaneGeometry(0.8, 0.7), warm, { pos: [0, 1.5, 1.83], parent: H2 }); glow(H2, [0, 1.5, 2.0], 3.2, 1.0, 0.55, 0.2); mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), std('#3a3432'), { pos: [1.2, 3.7, 0], parent: H2 });
    for (const [bx, by, bz, n] of [[2.2, 6.4, -0.6, 4], [18.2, 5.0, 22, 6]]) for (let k = 0; k < n; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(0.55, 0.62, 0.75), transparent: true, opacity: 0.2 - k * 0.022, depthWrite: false })); s.position.set(bx + k * 1.1, by + k * 2.3, bz - k * 0.5); s.scale.setScalar(2.2 + k * 1.7); G.add(s); }
    // the pier runs out into the lake (the group is turned, so it is laid in the group's own axes)
    mesh(new THREE.BoxGeometry(1.8, 0.2, 26), std('#7a6a55'), { pos: [14, -2.55, 38], parent: G }); for (let k = 0; k < 6; k++) for (const sx of [-0.8, 0.8]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), std('#4a4038'), { pos: [14 + sx, -3.4, 27 + k * 4.6], parent: G });
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), std('#2a2a2a'), { pos: [14.7, -1.7, 50.4], parent: G }); mesh(new THREE.SphereGeometry(0.2, 10, 8), lum(9, 5.5, 2.2), { pos: [14.7, -0.9, 50.4], parent: G }); glow(G, [14.7, -0.9, 50.4], 5, 1.0, 0.6, 0.25);
    const lan = new THREE.PointLight('#ffb060', 160, 40, 2); lan.position.set(14.7, -0.6, 50.4); G.add(lan); }
  // the road and one car
  const [ax, az] = ROAD.a, [bx, bz] = ROAD.b, rdir = Math.atan2(bx - ax, bz - az);
  mesh(new THREE.PlaneGeometry(7, Math.hypot(bx - ax, bz - az)), std('#1a2030', { roughness: 0.9 }), { pos: [(ax + bx) / 2, ROAD.y + 0.25, (az + bz) / 2], rot: [-Math.PI / 2, 0, rdir], parent: S });
  const car = new THREE.Group(); S.add(car); car.rotation.y = rdir;
  mesh(rbox(1.8, 1.1, 4.2, 0.4), std('#27344e', { roughness: 0.4 }), { pos: [0, 0.8, 0], parent: car }); mesh(rbox(1.6, 0.7, 2.2, 0.3), std('#0c1018', { roughness: 0.2 }), { pos: [0, 1.5, -0.2], parent: car });
  for (const sx of [-0.6, 0.6]) { mesh(new THREE.SphereGeometry(0.14, 8, 6), lum(10, 9, 7), { pos: [sx, 0.8, 2.1], parent: car }); glow(car, [sx, 0.8, 2.2], 4.5, 1.0, 0.9, 0.7); mesh(new THREE.SphereGeometry(0.1, 8, 6), lum(5, 0.2, 0.1), { pos: [sx, 0.85, -2.1], parent: car }); glow(car, [sx, 0.85, -2.2], 1.6, 1.0, 0.05, 0.02); }
  const head = new THREE.SpotLight('#fff0cc', 5200, 220, 0.42, 0.7, 2); head.position.set(0, 1.0, 2.2); head.target.position.set(0, -1.2, 40); car.add(head, head.target);
  // a village far off
  { const n = 150, pos = new Float32Array(n * 3), R = rng(8); for (let i = 0; i < 90; i++) { const x = 230 + (R() - 0.5) * 320, z = -940 + (R() - 0.5) * 240; pos.set([x, hL(x, z).h + 3, z], i * 3); }
    for (let i = 90, tries = 0; i < n && tries < 4000; tries++) { const x = (R() - 0.5) * 900, z = -560 - R() * 700; if (hL(x, z).field < 0.6) continue; for (let k = 0; k < 3 && i < n; k++, i++) pos.set([x + (R() - 0.5) * 26, hL(x, z).h + 3, z + (R() - 0.5) * 26], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 6, color: new THREE.Color(2.4, 1.6, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  const water = makeWater(S, { y: 0, w: 5200, d: 5200, z: -900, deep: '#020714', fog: S.fog, amp: 0.011 });
  const cam = new THREE.PerspectiveCamera(72, W / H, 0.5, 9000);
  const lookAt = hermite3([[0, [0, 70, 80]], [0.8, [0, 14, -200]], [2.0, [-8, 9, -380]], [2.8, [-30, 5, -338]], [3.6, [-12, 12, -600]], [4.5, [10, 30, -900]], [5.2, [10, 55, -1200]]]);
  const a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
  return { scene: S, cam, water, update(t) {
    const tau = t - T.land; posAt(tau, cam.position); cam.up.set(0, 1, 0); cam.lookAt(lookAt(tau, a3));
    cam.rotateZ((posAt(tau + 0.25, b3).x - posAt(tau - 0.25, a3).x) * -0.012); cam.updateMatrixWorld(true);
    const k = ((tau * 0.11 + 0.18) % 1); car.position.set(lerp(ax, bx, k), ROAD.y + 0.3, lerp(az, bz, k));
    sky.U.uGlow.value = lerp(0.02, 0.8, smooth((tau - 2.6) / 2.6)); sky.follow(cam, t);
    return { speed: lerp(0.95, 0.6, smooth(tau / 5.2)), osd: { alt: cam.position.y, kmh: 138, home: `HOME ${Math.round(lerp(187, 9, ease.io(tau / 5.2)))} km`, mode: 'RETURN TO HOME', modeCol: '#ff2a93', flags: [[0, 1], [1, 1], [2, 1]] } };
  } };
}

// ================================================================== 3–4 · HELSINKI, AND HOME
function buildCity() {
  const S = new THREE.Scene(), FOGC = C3('#0d1432'); S.fog = new THREE.FogExp2(FOGC, 0.00085); S.background = FOGC;
  const sky = makeSky(S, { top: '#02040f', hor: '#171b46', glowDir: [0, 0, -1], glowCol: '#a8487a', glow: 0.34, moon: [-0.62, 0.48, -0.62], aurora: 0.5, auroraAz: 0.12, stars: 1300 });
  S.add(new THREE.HemisphereLight('#36447e', '#0a0a10', 0.85));
  const moon = new THREE.DirectionalLight('#a9bcff', 1.4); moon.position.set(-62, 48, -62); S.add(moon);
  const Y0 = 1.2, R = rng(2026), RY = Y0 + 22.8;
  for (const [x0, x1, z0, z1] of [[-900, 900, -1500, 0], [86, 560, 0, 150], [-900, -240, 0, 520]]) mesh(new THREE.BoxGeometry(x1 - x0, 6, z1 - z0), std('#0b0d15', { roughness: 0.95 }), { pos: [(x0 + x1) / 2, Y0 - 3, (z0 + z1) / 2], parent: S });
  // floodlit stone: lit from below, fading up
  const floodTex = canvasTex(8, 256, (g) => { const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#c8c8c8'); gr.addColorStop(1, '#858585'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256); });
  const flood = (col, em, k = 0.8, o = {}) => std(col, { roughness: 0.8, emissive: C3(em), emissiveMap: floodTex, emissiveIntensity: k, ...o });
  const gold = std('#f0c050', { roughness: 0.3, metalness: 0.6, emissive: C3('#a87a18'), emissiveIntensity: 1.0 }), copper = std('#2f9d83', { roughness: 0.45, emissive: C3('#0d4a3c'), emissiveIntensity: 1.0 });
  // ---- the town: blocks of lit windows under snowy roofs
  const winTex = (seed, p) => { const mk = (lit) => { const R2 = rng(seed), t = canvasTex(256, 256, (g) => { g.fillStyle = lit ? '#000000' : '#d8d8d8'; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const on = R2() < p, warm = R2() < 0.75, v = R2(), x = c * 32 + 9, y = r * 32 + 7;
        if (!lit) { g.fillStyle = '#1b1e26'; g.fillRect(x, y, 14, 18); } else if (on) { g.fillStyle = warm ? `rgb(255,${190 + Math.floor(v * 40)},${110 + Math.floor(v * 50)})` : 'rgb(190,220,255)'; g.fillRect(x, y, 14, 18); } } });
      t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }; return { map: mk(false), emis: mk(true) }; };
  const WT = [winTex(11, 0.3), winTex(12, 0.18), winTex(13, 0.42)], BM = [];
  WT.forEach((w) => ['#b9b3a6', '#c8b48f', '#9aa5b5', '#b89a8c'].forEach((c) => BM.push(std(c, { map: w.map, emissive: C3('#ffffff'), emissiveMap: w.emis, emissiveIntensity: 2.0, roughness: 0.9 }))));
  const bucket = BM.map(() => []), snow = [];
  const bld = (x0, x1, z0, z1, h, mi = Math.floor(R() * BM.length)) => { const w = x1 - x0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, off = Math.floor(R() * 8) / 8;
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; if (f === 2 || f === 3) { uv.setXY(k, 0.002, 0.002); continue; } const ext = f < 2 ? d : w; uv.setXY(k, Math.max(1, Math.round(ext / 3.3)) / 8 * uv.getX(k) + off, Math.max(1, Math.round(h / 3.3)) / 8 * uv.getY(k)); }
    g.translate((x0 + x1) / 2, Y0 + h / 2, (z0 + z1) / 2); bucket[mi].push(g); snow.push(new THREE.BoxGeometry(w - 0.8, 0.5, d - 0.8).translate((x0 + x1) / 2, Y0 + h + 0.25, (z0 + z1) / 2)); };
  const P = 84;
  for (let i = -10; i <= 10; i++) for (let j = 0; j < 16; j++) { if (Math.abs(i) <= 1 && j <= 1) continue; const cx = i * P, cz = -118 - P * j, tall = (i >= -5 && i <= -2 && j >= 2 && j <= 5) ? 9 : 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { if (R() < 0.12) continue; bld(cx + sx * 17 - 15, cx + sx * 17 + 15, cz + sz * 17 - 15, cz + sz * 17 + 15, 14 + R() * 10 + tall + (R() < 0.06 ? 10 : 0)); } }
  bld(-112, -66, -152, -96, 17, 1); bld(54, 100, -152, -96, 17, 1); bld(-112, -62, -232, -162, 18); bld(52, 104, -232, -162, 18);   // around Senate Square
  for (const [x0, x1, h, mi] of [[-236, -190, 20, 2], [-186, -140, 18, 1], [-136, -88, 21, 0], [-84, -36, 17, 2], [36, 82, 18, 1], [90, 126, 16, 0]]) bld(x0, x1, -78, -40, h, mi);   // the waterfront row
  bld(-30, 30, -60, -38, 22.8, 0); bld(-30, 30, -84, -64, 13, 1);                                             // the station's house, and the low one behind it
  [[430, -700, 86], [470, -742, 104], [512, -700, 126], [552, -748, 134], [596, -706, 96], [520, -790, 80]].forEach(([x, z, h]) => bld(x - 12, x + 12, z - 12, z + 12, h, 2 + 4 * (h > 100 ? 1 : 0)));
  bucket.forEach((list, i) => { if (list.length) S.add(new THREE.Mesh(mergeGeometries(list), BM[i])); });
  S.add(new THREE.Mesh(mergeGeometries(snow), std('#8f9ab8', { roughness: 1 })));
  // street lamps, by the thousand
  { const pts = [], inP = (x, z) => Math.abs(x + 6) < 100 && z > -236 && z < -88;
    for (let i = -11; i <= 10; i++) { const x = (i + 0.5) * P; for (let z = -80; z > -1440; z -= 24) if (!inP(x, z)) pts.push(x, Y0 + 7, z); }
    for (let j = 0; j < 17; j++) { const z = -76 - P * j; for (let x = -880; x < 880; x += 24) if (!inP(x, z)) pts.push(x, Y0 + 7, z); }
    for (let x = -236; x <= 84; x += 13) pts.push(x, Y0 + 6, -8, x + 6, Y0 + 6, -34);
    for (const [x, z] of [[-56, -100], [44, -100], [-56, -134], [44, -134], [-6, -116]]) pts.push(x, Y0 + 7, z);
    for (let z = 10; z < 140; z += 14) pts.push(90, Y0 + 6, z); for (let x = 100; x < 520; x += 16) pts.push(x, Y0 + 6, 146); for (let z = 10; z < 500; z += 18) pts.push(-244, Y0 + 6, z);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    S.add(new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, size: 2.8, color: new THREE.Color(3.4, 2.2, 1.1), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); }
  // ---- the Cathedral: white, floodlit, green domes, on its terrace over the square
  { const G = new THREE.Group(); S.add(G); G.position.set(-6, Y0, -185);
    const wh = flood('#f4f1ea', '#fff0dc', 0.36), step = flood('#cfcbc2', '#ffe6c8', 0.2);
    mesh(new THREE.BoxGeometry(84, 10, 60), step, { pos: [0, 5, -6], parent: G });
    for (let i = 0; i < 9; i++) mesh(new THREE.BoxGeometry(78, 10 - i * 1.1, 2.7), step, { pos: [0, (10 - i * 1.1) / 2, 25.35 + i * 2.7], parent: G });
    mesh(new THREE.BoxGeometry(48, 24, 30), wh, { pos: [0, 22, -6], parent: G }); mesh(new THREE.BoxGeometry(30, 24, 48), wh, { pos: [0, 22, -6], parent: G });
    const ps = new THREE.Shape(); ps.moveTo(-16.5, 0); ps.lineTo(0, 6.5); ps.lineTo(16.5, 0); ps.closePath(); const pedG = new THREE.ExtrudeGeometry(ps, { depth: 7, bevelEnabled: false });
    for (let q = 0; q < 4; q++) { const A = new THREE.Group(); G.add(A); A.position.set(0, 10, -6); A.rotation.y = q * Math.PI / 2;
      for (let k = 0; k < 6; k++) mesh(new THREE.CylinderGeometry(1.15, 1.3, 18, 12), flood('#f4f1ea', '#fff0dc', 0.5), { pos: [-13.5 + k * 5.4, 9, 27.5], parent: A });
      mesh(new THREE.BoxGeometry(33, 3, 7.5), wh, { pos: [0, 19.5, 26.5], parent: A }); mesh(pedG, wh, { pos: [0, 21, 23], parent: A }); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * 19.5, z = -6 + sz * 19.5; mesh(new THREE.BoxGeometry(9, 24, 9), wh, { pos: [x, 22, z], parent: G }); mesh(new THREE.BoxGeometry(8, 9, 8), wh, { pos: [x, 38.5, z], parent: G });
      mesh(new THREE.SphereGeometry(4.4, 16, 10, 0, TAU, 0, Math.PI / 2), copper, { pos: [x, 43, z], scale: [1, 1.15, 1], parent: G }); mesh(new THREE.SphereGeometry(0.8, 8, 6), gold, { pos: [x, 48.8, z], parent: G }); }
    mesh(new THREE.CylinderGeometry(12, 12, 15, 28), wh, { pos: [0, 41.5, -6], parent: G }); mesh(new THREE.CylinderGeometry(13.2, 13.2, 1.4, 28), wh, { pos: [0, 49.6, -6], parent: G });
    for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 8), std('#8f8ca6', { emissive: C3('#2c2a3a') }), { pos: [Math.sin(a) * 12.3, 42, -6 + Math.cos(a) * 12.3], parent: G }); }
    mesh(new THREE.SphereGeometry(12.2, 32, 16, 0, TAU, 0, Math.PI / 2), copper, { pos: [0, 50.2, -6], scale: [1, 1.12, 1], parent: G });
    mesh(new THREE.CylinderGeometry(2.2, 2.6, 5, 12), wh, { pos: [0, 65.5, -6], parent: G }); mesh(new THREE.SphereGeometry(1.7, 12, 8), gold, { pos: [0, 69.4, -6], parent: G });
    mesh(new THREE.BoxGeometry(0.5, 5, 0.5), gold, { pos: [0, 73, -6], parent: G }); mesh(new THREE.BoxGeometry(2.6, 0.5, 0.5), gold, { pos: [0, 73.6, -6], parent: G });
    const dl = new THREE.PointLight('#bfe8dc', 1400, 120, 2); dl.position.set(0, 54, 30); G.add(dl); }
  // ---- Uspenski on its rock: red brick, green roofs, gold onions
  { const G = new THREE.Group(); S.add(G); G.position.set(165, Y0, -55); const brick = flood('#8a3b2a', '#ff8a4a', 0.34), cu = std('#3f8f7a', { roughness: 0.5, emissive: C3('#0c3a30') });
    const onion = (x, y, z, r) => { mesh(new THREE.SphereGeometry(r, 12, 10), gold, { pos: [x, y, z], scale: [1, 1.25, 1], parent: G }); mesh(new THREE.ConeGeometry(r * 0.5, r * 1.6, 8), gold, { pos: [x, y + r * 1.7, z], parent: G }); mesh(new THREE.BoxGeometry(0.25, r * 1.4, 0.25), gold, { pos: [x, y + r * 3, z], parent: G }); };
    mesh(new THREE.IcosahedronGeometry(1, 1), std('#2a2c33', { roughness: 1, flatShading: true }), { pos: [0, 4, 0], scale: [44, 11, 34], parent: G });
    mesh(new THREE.BoxGeometry(26, 20, 32), brick, { pos: [0, 22, 0], parent: G }); mesh(new THREE.BoxGeometry(13, 12, 13), brick, { pos: [0, 38, 0], parent: G });
    mesh(new THREE.ConeGeometry(10, 15, 4), cu, { pos: [0, 51.5, 0], rot: [0, Math.PI / 4, 0], parent: G }); onion(0, 61, 0, 2.4);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { mesh(new THREE.CylinderGeometry(2.4, 2.4, 8, 10), brick, { pos: [sx * 9.5, 36, sz * 12.5], parent: G }); mesh(new THREE.ConeGeometry(3, 6, 10), cu, { pos: [sx * 9.5, 43, sz * 12.5], parent: G }); onion(sx * 9.5, 47.5, sz * 12.5, 1.2); }
    mesh(new THREE.BoxGeometry(9, 30, 9), brick, { pos: [0, 27, 22], parent: G }); mesh(new THREE.ConeGeometry(6.5, 10, 4), cu, { pos: [0, 47, 22], rot: [0, Math.PI / 4, 0], parent: G }); onion(0, 54, 22, 1.6); }
  // ---- the SkyWheel on the quay
  const wheel = new THREE.Group(), rim = new THREE.Group(); S.add(wheel); wheel.add(rim); wheel.position.set(128, Y0 + 24, 62); wheel.rotation.y = 0.55;
  mesh(new THREE.TorusGeometry(19, 0.32, 8, 64), lum(1.6, 2.2, 3.2), { parent: rim }); mesh(new THREE.TorusGeometry(17.4, 0.18, 6, 64), lum(0.8, 1.1, 1.6), { parent: rim });
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; mesh(new THREE.BoxGeometry(0.14, 19, 0.14), lum(0.5, 0.7, 1.0), { pos: [Math.sin(a) * 9.5, Math.cos(a) * 9.5, 0], rot: [0, 0, -a], parent: rim }); }
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; mesh(new THREE.BoxGeometry(1.5, 1.6, 1.4), lum(2.6, 2.8, 3.2), { pos: [Math.sin(a) * 19, Math.cos(a) * 19, 0], parent: rim }); }
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.8, 28, 0.8), std('#3a3f52', { emissive: C3('#161a28') }), { pos: [sx * 3.6, -12.5, 0], rot: [0, 0, sx * 0.26], parent: wheel });
  // ---- far marks: the station's clock tower, the Stadium tower, a church on its hill
  { const G = new THREE.Group(); S.add(G); G.position.set(-250, Y0, -330); mesh(new THREE.BoxGeometry(11, 44, 11), flood('#9a958e', '#ffd9a8', 0.4), { pos: [0, 22, 0], parent: G });
    for (let q = 0; q < 4; q++) mesh(new THREE.CircleGeometry(3.2, 24), lum(3.2, 2.8, 2.0), { pos: [Math.sin(q * Math.PI / 2) * 5.6, 36, Math.cos(q * Math.PI / 2) * 5.6], rot: [0, q * Math.PI / 2, 0], parent: G });
    mesh(new THREE.CylinderGeometry(5.2, 5.6, 4, 16), copper, { pos: [0, 46, 0], parent: G }); mesh(new THREE.SphereGeometry(5.2, 16, 8, 0, TAU, 0, Math.PI / 2), copper, { pos: [0, 48, 0], parent: G }); }
  mesh(new THREE.BoxGeometry(8, 72, 6), flood('#f2f2ee', '#ffffff', 0.5), { pos: [-330, Y0 + 36, -1000], parent: S }); glow(S, [-330, Y0 + 74, -1000], 30, 1.0, 0.95, 0.85);
  { const G = new THREE.Group(); S.add(G); G.position.set(150, Y0, -880); mesh(new THREE.SphereGeometry(1, 24, 12), std('#0b0d15', { roughness: 1 }), { pos: [0, -2, 0], scale: [230, 24, 190], parent: G });
    const gr = flood('#9d9488', '#ffcf9a', 0.4); mesh(new THREE.BoxGeometry(22, 30, 40), gr, { pos: [0, 36, 0], parent: G }); mesh(new THREE.BoxGeometry(16, 62, 16), gr, { pos: [0, 52, 26], parent: G }); mesh(new THREE.ConeGeometry(11, 13, 4), std('#243a36', { emissive: C3('#0a1a16') }), { pos: [0, 89.5, 26], rot: [0, Math.PI / 4, 0], parent: G }); }
  const beacons = [[430, 86], [470, 104], [512, 126], [552, 134], [596, 96]].map(([x, h], i) => glow(S, [x, Y0 + h + 3, [-700, -742, -700, -748, -706][i]], 26, 1.0, 0.06, 0.04));
  // ---- the harbor: ferries at their quays and one under way, islets, a lighthouse
  const ferryTex = canvasTex(512, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 512, 64); for (let r = 0; r < 3; r++) for (let c = 0; c < 56; c++) { if (hash2(c, r) < 0.12) continue; g.fillStyle = 'rgb(255,214,150)'; g.fillRect(6 + c * 9, 8 + r * 19, 5, 9); } });
  const ferry = (x, z, ry, funnel) => { const G = new THREE.Group(); S.add(G); G.position.set(x, 0, z); G.rotation.y = ry; const plain = std('#f4f6f9', { roughness: 0.6, emissive: C3('#3c4350') }), lit = std('#f4f6f9', { roughness: 0.6, emissive: C3('#ffffff'), emissiveMap: ferryTex, emissiveIntensity: 2.4 }), six = [lit, lit, plain, plain, lit, lit];
    mesh(new THREE.BoxGeometry(150, 13, 25), plain, { pos: [0, 6.5, 0], parent: G }); mesh(new THREE.BoxGeometry(150.2, 3, 25.2), std('#1e3a8a', { emissive: C3('#0a1433') }), { pos: [0, 1.5, 0], parent: G });
    mesh(new THREE.BoxGeometry(124, 11, 23), six, { pos: [-6, 18.5, 0], parent: G }); mesh(new THREE.BoxGeometry(60, 5, 20), six, { pos: [-14, 26.5, 0], parent: G });
    mesh(new THREE.BoxGeometry(11, 12, 9), std(funnel, { emissive: C3(funnel), emissiveIntensity: 0.7 }), { pos: [-40, 33, 0], parent: G });
    for (let k = 0; k < 9; k++) for (const sz of [-1, 1]) glow(G, [-62 + k * 15, 25.5, sz * 12], 9, 1.0, 0.85, 0.6); return G; };
  ferry(-224, 215, Math.PI / 2, '#c8102e'); ferry(300, 167, 0, '#0b3a8f'); const under = ferry(-70, 330, 0, '#c8102e');
  for (const [x, z, sx, sz] of [[190, 560, 90, 50], [-250, 700, 120, 60], [70, 900, 70, 40]]) mesh(new THREE.IcosahedronGeometry(1, 1), std('#0a0d12', { roughness: 1, flatShading: true }), { pos: [x, 0, z], scale: [sx, 5, sz], parent: S });
  mesh(new THREE.CylinderGeometry(2.2, 2.8, 14, 12), flood('#eeeeee', '#ffffff', 0.5), { pos: [190, 11, 560], parent: S }); const lighthouse = glow(S, [190, 19.5, 560], 40, 1.0, 0.95, 0.8);
  // ---- the quay under the station's house: pools of lamp light on the snow, the market's orange tents, a tram going by
  const pool = canvasTex(1024, 128, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 128); for (let i = 0; i < 25; i++) for (const [x, y] of [[30.1 + i * 39.15, 102], [48.2 + i * 39.15, 19]]) { const gr = g.createRadialGradient(x, y, 0, x, y, 30); gr.addColorStop(0, 'rgba(255,196,128,.95)'); gr.addColorStop(1, 'rgba(255,196,128,0)'); g.fillStyle = gr; g.fillRect(x - 30, y - 30, 60, 60); } });
  mesh(new THREE.PlaneGeometry(340, 40), std('#4c5670', { roughness: 0.95, emissive: C3('#ffffff'), emissiveMap: pool, emissiveIntensity: 0.42 }), { pos: [-76, Y0 + 0.3, -20], rot: [-Math.PI / 2, 0, 0], parent: S });
  { const roofs = [], bodies = [], fronts = []; for (let i = 0; i < 15; i++) for (const z of [-13, -21]) { if (hash2(i, z) < 0.3) continue; const x = -84 + i * 11.5 + (z < -15 ? 4 : 0);
      roofs.push(new THREE.ConeGeometry(3.3, 1.7, 4).rotateY(Math.PI / 4).translate(x, Y0 + 3.45, z)); bodies.push(new THREE.BoxGeometry(4.2, 2.3, 4.2).translate(x, Y0 + 1.45, z)); fronts.push(new THREE.PlaneGeometry(3.2, 1.1).translate(x, Y0 + 1.75, z + 2.12)); }
    S.add(new THREE.Mesh(mergeGeometries(roofs), lum(0.62, 0.17, 0.02)), new THREE.Mesh(mergeGeometries(bodies), std('#2a2622', { roughness: 0.9 })), new THREE.Mesh(mergeGeometries(fronts), lum(1.2, 0.8, 0.34))); }
  const tram = new THREE.Group(); S.add(tram); tram.position.set(0, Y0 + 0.3, -30);
  mesh(rbox(27, 2.6, 2.4, 0.3), std('#0f6b3a', { roughness: 0.5, emissive: C3('#062a17') }), { pos: [0, 1.7, 0], parent: tram }); mesh(new THREE.BoxGeometry(25.5, 0.95, 2.46), lum(2.5, 2.1, 1.3), { pos: [0, 2.2, 0], parent: tram });
  for (let k = -5; k <= 5; k++) mesh(new THREE.BoxGeometry(0.22, 1.0, 2.5), std('#0f6b3a'), { pos: [k * 2.4, 2.2, 0], parent: tram });
  mesh(new THREE.BoxGeometry(26.4, 0.25, 2.2), std('#d9c98a', { emissive: C3('#3a3420') }), { pos: [0, 3.1, 0], parent: tram }); glow(tram, [13.6, 1.3, 0], 4, 1.0, 0.92, 0.7); mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), std('#22242c'), { pos: [2, 4.0, 0], rot: [0, 0, 0.5], parent: tram });
  // the fairway in: red to port, green to starboard, blinking
  const buoys = []; for (let k = 0; k < 7; k++) { const z = 90 + k * 95, cx = lerp(14, 78, k / 6); for (const [sx, r, gg, b] of [[-1, 1.0, 0.08, 0.05], [1, 0.1, 1.0, 0.35]]) { mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 8), std('#1a1c22'), { pos: [cx + sx * 26, 1.2, z], parent: S }); buoys.push(glow(S, [cx + sx * 26, 3.2, z], 7, r, gg, b)); } }
  // ---- HOME: the station's roof. A hut with the ON AIR sign, the pirate mast, Toko at the mic, a perch for the drone
  const HOME = new THREE.Group(); S.add(HOME); HOME.position.set(0, RY + 0.5, 0);   // on the snow
  for (const [w, d, x, z] of [[60, 0.5, 0, -38.25], [60, 0.5, 0, -59.75], [0.5, 22, -29.75, -49], [0.5, 22, 29.75, -49]]) mesh(new THREE.BoxGeometry(w, 0.7, d), std('#23222e'), { pos: [x, 0.35, z], parent: HOME });
  mesh(new THREE.BoxGeometry(3.4, 2.7, 2.6), std('#262433', { roughness: 0.8 }), { pos: [-3.5, 1.35, -56.5], parent: HOME }); mesh(new THREE.BoxGeometry(3.7, 0.3, 2.9), std('#aebad2'), { pos: [-3.5, 2.85, -56.5], parent: HOME });
  const signTex = canvasTex(512, 200, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 512, 200); g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.roundRect(14, 14, 484, 172, 26); g.stroke(); g.fillStyle = '#fff'; g.font = '128px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ON AIR', 256, 108); });
  const SY = 3.75; for (const sx of [-1.2, 1.2]) mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), std('#3c3f5a'), { pos: [-3.5 + sx, 3.45, -55.4], parent: HOME });
  mesh(new THREE.BoxGeometry(3.1, 1.3, 0.14), std('#0d0c14'), { pos: [-3.5, SY, -55.32], parent: HOME });
  const sign = mesh(new THREE.PlaneGeometry(2.9, 1.13), new THREE.MeshBasicMaterial({ map: signTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), { pos: [-3.5, SY, -55.23], parent: HOME });
  const signGlow = glow(HOME, [-3.5, SY, -55.0], 7, 1.0, 0.15, 0.1), signLight = new THREE.PointLight('#ff4638', 0, 30, 2); signLight.position.set(-3.5, SY, -54.2); HOME.add(signLight);
  const doorLamp = new THREE.PointLight('#ffb46a', 90, 26, 2); doorLamp.position.set(-1.2, 2.3, -54.6); HOME.add(doorLamp); mesh(new THREE.SphereGeometry(0.09, 8, 6), lum(8, 5, 2.2), { pos: [-1.55, 2.35, -55.15], parent: HOME });
  for (const [x, z, h] of [[-12, -52, 2.2], [14, -55, 1.8], [22, -44, 2.4]]) { mesh(new THREE.BoxGeometry(1.4, h, 1.1), std('#2a2630'), { pos: [x, h / 2, z], parent: HOME }); mesh(new THREE.BoxGeometry(1.6, 0.2, 1.3), std('#aebad2'), { pos: [x, h + 0.1, z], parent: HOME }); }
  const strut = (a, b, r = 0.04) => { const d = new THREE.Vector3().subVectors(b, a), g = new THREE.CylinderGeometry(r, r, d.length(), 5); g.translate(0, d.length() / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); g.translate(a.x, a.y, a.z); return g; };
  const MAST = [3.5, 0, -57.5], MH = 9, mg = [], corner = (k, i) => { const w = lerp(0.62, 0.14, k / 6), y = k * MH / 6; return new THREE.Vector3([-w, w, w, -w][i], y, [-w, -w, w, w][i]); };
  for (let k = 0; k < 6; k++) for (let i = 0; i < 4; i++) { mg.push(strut(corner(k, i), corner(k + 1, i), 0.05), strut(corner(k + 1, i), corner(k + 1, (i + 1) % 4), 0.03), strut(corner(k, i), corner(k + 1, (i + 1) % 4), 0.03), strut(corner(k, (i + 1) % 4), corner(k + 1, i), 0.03)); }
  mg.push(strut(new THREE.Vector3(0, MH, 0), new THREE.Vector3(0, MH + 1.3, 0), 0.03));
  mesh(mergeGeometries(mg), std('#aab0cc', { roughness: 0.5, metalness: 0.5, emissive: C3('#3c4466') }), { pos: MAST, parent: HOME });
  const mastTop = new THREE.Vector3(MAST[0], RY + 0.5 + MH + 1.3, MAST[2]); mesh(new THREE.SphereGeometry(0.09, 8, 6), lum(9, 0.8, 0.5), { pos: [MAST[0], MH + 1.3, MAST[2]], parent: HOME }); const mastGlow = glow(HOME, [MAST[0], MH + 1.3, MAST[2]], 2.4, 1.0, 0.1, 0.06);
  // Toko, in his coat and scarf, at the mic (the mask is rigid; the acting is in the lean)
  const toko = new THREE.Group(); HOME.add(toko); toko.position.set(-0.62, 0, -40.6); toko.scale.setScalar(0.85);
  mesh(new THREE.CapsuleGeometry(0.34, 0.8, 6, 18), std('#2b3566', { roughness: 0.9 }), { pos: [0, 0.8, 0], scale: [1.18, 1, 0.82], parent: toko });
  for (const sx of [-1, 1]) mesh(new THREE.CapsuleGeometry(0.11, 0.6, 4, 10), std('#2b3566', { roughness: 0.9 }), { pos: [sx * 0.44, 0.92, 0.02], rot: [0, 0, sx * 0.12], parent: toko });
  mesh(new THREE.TorusGeometry(0.22, 0.085, 10, 28), std('#f2b83a', { roughness: 0.8, emissive: C3('#5a4210') }), { pos: [0, 1.36, 0], rot: [Math.PI / 2, 0, 0], parent: toko }); mesh(rbox(0.15, 0.5, 0.06, 0.03), std('#f2b83a', { roughness: 0.8, emissive: C3('#5a4210') }), { pos: [-0.14, 1.12, 0.27], rot: [0.1, 0, 0.12], parent: toko });
  const head = new THREE.Group(); toko.add(head); head.position.set(0, 1.74, 0.02);
  const faceTex = canvasTex(512, 512, (g) => { g.clearRect(0, 0, 512, 512); drawMasterBadge(g, 256, 256, 252, { ground: '#F0027F', ink: '#ffffff' }); });
  mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 48), std('#c70269', { roughness: 0.5, emissive: C3('#5a0030') }), { rot: [Math.PI / 2, 0, 0], parent: head });
  mesh(new THREE.CircleGeometry(0.335, 48), new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, color: new THREE.Color(1.1, 1.1, 1.1) }), { pos: [0, 0, 0.037], parent: head });
  mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.3, 6), std('#3c3f5a', { metalness: 0.6, roughness: 0.4 }), { pos: [-0.28, 0.65, -40.2], parent: HOME }); mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10), std('#555a78', { metalness: 0.7, roughness: 0.3 }), { pos: [-0.32, 1.33, -40.22], rot: [0.5, 0, 0.5], parent: HOME });
  const PAD = [0.55, 1.78, -40.9]; mesh(new THREE.CylinderGeometry(0.035, 0.045, PAD[1], 8), std('#3c3f5a', { metalness: 0.6, roughness: 0.4 }), { pos: [PAD[0], PAD[1] / 2, PAD[2]], parent: HOME });
  mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.035, 32), std('#14131c', { roughness: 0.6 }), { pos: [PAD[0], PAD[1] - 0.018, PAD[2]], parent: HOME }); mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 40), lum(3.2, 0.1, 1.6), { pos: [PAD[0], PAD[1] + 0.004, PAD[2]], rot: [Math.PI / 2, 0, 0], parent: HOME });
  const fill = new THREE.PointLight('#8fa8ff', 30, 14, 2); fill.position.set(-1.6, RY + 2.6, -37.5); S.add(fill);
  const drone = makeDrone(); S.add(drone); drone.userData.spot.intensity = 0; drone.userData.beam.visible = drone.userData.lamp.visible = false;
  const water = makeWater(S, { y: 0, w: 6000, d: 6000, z: 0, deep: '#030816', fog: S.fog, amp: 0.016 });
  const cam = new THREE.PerspectiveCamera(72, W / H, 0.3, 9000), a3 = new THREE.Vector3(), b3 = new THREE.Vector3();
  const fpvPos = hermite3([[0, [80, 30, 760]], [1.5, [40, 14, 420]], [2.9, [22, 22, 170]], [3.9, [8, 40, 40]], [4.8, [3.2, 42, -8]]]);
  const fpvLook = hermite3([[0, [0, 40, -185]], [2.9, [-2, 46, -185]], [3.9, [2, 30, -70]], [4.8, [4.6, 31, -58]]]);
  const EYE = RY + 0.5 + 1.55, C0 = [3.2, 43, -6], C1 = [0, EYE, -36], L0 = [0, 22, -70], L1 = [-4, EYE + Math.tan(12 * DEG) * 149, -185], TD = RY + 0.5 + PAD[1] + 0.2;
  const dronePos = hermite3([[T.home, [5.5, 44, -14]], [T.home + 0.9, [2.6, 33, -33]], [T.down - 0.4, [PAD[0] + 0.1, TD + 0.95, PAD[2] + 0.5]], [T.down, [PAD[0], TD, PAD[2]]]]);
  return { scene: S, cam, water, update(t) {
    rim.rotation.z = t * 0.1; under.position.x = -74 + (t - T.city) * 4; tram.position.x = -42 + (t - T.city) * 10; buoys.forEach((b, i) => { b.material.opacity = ((t * 0.8 + i * 0.37) % 1) < 0.55 ? 1 : 0.12; }); lighthouse.material.opacity = (t % 2.4) < 0.5 ? 1 : 0.05; beacons.forEach((b, i) => { b.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.6 + i)); });
    mastGlow.material.opacity = 0.4 + 0.6 * Math.max(0, Math.sin(t * 4.2)); spin(drone, t);
    const on = t >= T.on, fl = on ? (t < T.on + 0.18 ? (Math.sin(t * 90) > 0 ? 1 : 0.25) : 0.9 + 0.1 * Math.sin(t * 11)) : 0;
    sign.material.color.setRGB(0.16 + 3.0 * fl, 0.04 + 0.5 * fl, 0.04 + 0.42 * fl); signGlow.material.opacity = fl * 0.9; signLight.intensity = 70 * fl;
    let info;
    if (t < T.home) {   // in from the sea, its own view
      const tau = t - T.city; fpvPos(tau, cam.position); cam.up.set(0, 1, 0); cam.fov = 72; cam.lookAt(fpvLook(tau, a3)); cam.rotateZ((fpvPos(tau + 0.25, b3).x - fpvPos(tau - 0.25, a3).x) * -0.01); drone.visible = false;
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); const d = cam.position.distanceTo(mastTop) * 3.2, hm = tau > 2.2 ? toScreen(cam, mastTop) : null;
      info = { speed: lerp(0.9, 0.15, smooth(tau / 4.8)), osd: { alt: cam.position.y, kmh: lerp(138, 46, smooth(tau / 4.8)), home: d >= 1000 ? `HOME ${(d / 1000).toFixed(1)} km` : `HOME ${Math.round(d)} m`, mode: tau < 3.7 ? 'RETURN TO HOME' : 'ARRIVING', modeCol: '#ff2a93', flags: [[0, 1], [1, 1], [2, 1]], homeMark: hm && hm[1] > 300 && hm[1] < 1500 ? hm : null } };
    } else {            // the landing, from behind: the camera cranes down to the slate's framing as the drone settles on its perch
      const k = ease.io((t - T.home) / (T.down + 0.4 - T.home)); cam.fov = lerp(56, 50, k); cam.position.set(lerp(C0[0], C1[0], k), lerp(C0[1], C1[1], k), lerp(C0[2], C1[2], k)); cam.up.set(0, 1, 0); cam.lookAt(lerp(L0[0], L1[0], k), lerp(L0[1], L1[1], k), lerp(L0[2], L1[2], k));
      cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); drone.visible = true; const dt = t - T.down;
      if (dt < 0) { dronePos(t, drone.position); drone.rotation.set(-0.14 * clamp(-dt / 1.2) + Math.sin(t * 5) * 0.02, 0, Math.sin(t * 3.3) * 0.05 * clamp(-dt)); }
      else { drone.position.set(PAD[0], TD + Math.abs(Math.sin(dt * 20)) * Math.exp(-dt * 9) * 0.04, PAD[2]); drone.rotation.set(0, 0, 0); }
      const pulse = dt > 0 ? 0.6 + 0.4 * Math.sin(t * 6) : 1; drone.userData.dotGlow.scale.setScalar(0.9 * (0.7 + 0.5 * pulse)); head.rotation.z = Math.sin(t * 1.3) * 0.04; toko.rotation.y = 0.12 + Math.sin(t * 0.8) * 0.03;
      info = { speed: 0, overlay: (g) => { const s = toScreen(cam, mastTop);
        if (s && t >= T.rings[0] && t < T.rings[2] + 1.5) { const rg = ringC.getContext('2d'); rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, W, H);
          for (const [i, t0] of T.rings.entries()) { const q = clamp((t - t0) / 1.5); if (q <= 0 || q >= 1) continue; const r = lerp(24, 620, ease.out(q));
            rg.save(); rg.globalAlpha = (1 - q) * (i === 2 ? 1 : 0.85); rg.strokeStyle = '#F0027F'; rg.lineWidth = lerp(18, 4, q); rg.shadowColor = '#F0027F'; rg.shadowBlur = 30; rg.beginPath(); rg.arc(s[0], s[1], r, 0, TAU); rg.stroke();
            rg.shadowBlur = 0; rg.strokeStyle = 'rgba(255,230,245,.9)'; rg.lineWidth = lerp(4, 1, q); rg.beginPath(); rg.arc(s[0], s[1], r, 0, TAU); rg.stroke(); rg.restore(); }
          const m = rg.createLinearGradient(0, 470, 0, 720); m.addColorStop(0, 'rgba(0,0,0,.2)'); m.addColorStop(1, 'rgba(0,0,0,1)'); rg.globalCompositeOperation = 'destination-in'; rg.fillStyle = m; rg.fillRect(0, 0, W, H); g.drawImage(ringC, 0, 0); }
        lettering(g, t); } };
    }
    sky.follow(cam, t); return info;
  } };
}


// ================================================================== the drone's on-screen display, and the lettering
const _p = new THREE.Vector3(), ringC = document.createElement('canvas'); ringC.width = W; ringC.height = H;
const toScreen = (cam, v) => { _p.copy(v).project(cam); return _p.z < 1 ? [(_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H] : null; };
function osd(g, t, o) {
  g.save(); g.textBaseline = 'middle'; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 6; const ink = 'rgba(236,242,255,.92)', MAG = '#ff2a93';
  g.strokeStyle = 'rgba(236,242,255,.7)'; g.lineWidth = 3;
  for (const [x, y, sx, sy] of [[70, 170, 1, 1], [W - 70, 170, -1, 1], [70, 1610, 1, -1], [W - 70, 1610, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * 46); g.lineTo(x, y); g.lineTo(x + sx * 46, y); g.stroke(); }
  g.beginPath(); g.moveTo(W / 2 - 16, H / 2); g.lineTo(W / 2 - 5, H / 2); g.moveTo(W / 2 + 5, H / 2); g.lineTo(W / 2 + 16, H / 2); g.moveTo(W / 2, H / 2 - 16); g.lineTo(W / 2, H / 2 - 5); g.moveTo(W / 2, H / 2 + 5); g.lineTo(W / 2, H / 2 + 16); g.stroke();
  g.strokeStyle = 'rgba(2,4,10,.62)'; g.lineWidth = 6; g.lineJoin = 'round'; const tx = (s, x, y) => { g.strokeText(s, x, y); g.fillText(s, x, y); };
  g.font = '600 34px RobotoCondensed'; g.fillStyle = ink; g.textAlign = 'left';
  if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ff3b30'; g.beginPath(); g.arc(104, 212, 10, 0, TAU); g.fill(); g.fillStyle = ink; }
  const sec = 7 + t, tc = `02:14:${String(Math.floor(sec) % 60).padStart(2, '0')}`;
  tx('REC  RFH-1', 126, 214); tx(tc, 100, 258);
  g.textAlign = 'right'; tx('NIGHT · IR', W - 100, 214); tx(`BAT ${Math.round(71 - t * 0.9)}%`, W - 100, 258);
  g.textAlign = 'left'; tx(`ALT ${String(Math.round(o.alt)).padStart(3, '0')} m`, 100, 1528); tx(`SPD ${String(Math.round(o.kmh)).padStart(3, '0')} km/h`, 100, 1572);
  g.textAlign = 'right'; tx(o.home, W - 100, 1528); g.fillStyle = o.modeCol || ink; tx(o.mode, W - 100, 1572); g.fillStyle = ink;
  // the flags it has taken, listed down the left
  g.textAlign = 'left'; g.font = '700 30px RobotoCondensed';
  (o.flags || []).forEach(([i, k]) => { const y = 330 + i * 50, x = 100 - (1 - ease.out(k)) * 40; g.globalAlpha = clamp(k * 3); g.fillStyle = MAG; g.fillRect(x, y - 12, 24, 24); g.fillStyle = ink; tx(`FLAG 0${i + 1} · ${FLAGS[i]}`, x + 38, y + 1); });
  g.globalAlpha = 1;
  // a lock-on: the brackets close on the thing, flash, and it is named
  if (o.lock) { const { x, y, k, i, after } = o.lock, s = lerp(330, 150, ease.out(k)), on = after >= 0, c = on ? MAG : ink, pulse = on ? 1 + 0.25 * Math.exp(-after * 9) : 1, h = s * pulse / 2;
    g.strokeStyle = c; g.lineWidth = on ? 7 : 4; g.shadowBlur = on ? 18 : 6; g.shadowColor = on ? MAG : 'rgba(0,0,0,.6)';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(x + sx * h, y + sy * (h - 44)); g.lineTo(x + sx * h, y + sy * h); g.lineTo(x + sx * (h - 44), y + sy * h); g.stroke(); }
    if (on) { g.font = '700 44px RobotoCondensed'; const label = `FLAG 0${i + 1}`, sub = FLAGS[i].slice(0, Math.floor(after * 46)), w = Math.max(g.measureText(label).width, g.measureText(sub).width) + 44, bx = clamp(x - w / 2, 80, W - 80 - w), by = Math.min(y + h + 26, 1380);
      g.shadowBlur = 0; g.fillStyle = 'rgba(8,6,14,.82)'; g.beginPath(); g.roundRect(bx, by, w, 118, 8); g.fill(); g.fillStyle = MAG; g.fillRect(bx, by, 8, 118);
      g.fillStyle = MAG; g.fillText(label, bx + 26, by + 36); g.fillStyle = '#ffffff'; g.font = '700 38px RobotoCondensed'; g.fillText(sub, bx + 26, by + 84); } }
  // the way home: a marker on the mast
  if (o.homeMark) { const [x, y] = o.homeMark; g.strokeStyle = MAG; g.lineWidth = 5; g.shadowColor = MAG; g.shadowBlur = 14; g.beginPath(); g.moveTo(x, y - 46); g.lineTo(x + 40, y); g.lineTo(x, y + 46); g.lineTo(x - 40, y); g.closePath(); g.stroke();
    g.shadowBlur = 0; g.font = '700 34px RobotoCondensed'; g.fillStyle = MAG; g.textAlign = 'center'; g.fillText('HOME', x, y - 74); }
  g.restore();
}
function lettering(g, t) {   // the end slate's lettering (clay/signoff), with the channel's slogan under it
  g.save(); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '108px "Poppins-800"'; if ('letterSpacing' in g) g.letterSpacing = '-1px';
  const MAG = '#F0027F', AMBER = '#f2b83a', l1 = 'RADIO FREE', l2 = 'HELSINKI', dotR = 26, gap = 22, w1 = g.measureText(l1).width, w2 = g.measureText(l2).width;
  const x1 = (W - (w1 + dotR * 2 + gap)) / 2 + dotR * 2 + gap, x2 = (W - w2) / 2, y1 = 290, y2 = 408;
  const line = (txt, x, y, t0, col = '#ffffff', up = 120, band = 132) => { const k = ease.out((t - t0) / 0.42); if (k <= 0) return; g.save(); g.beginPath(); g.rect(0, y - band + 22, W, band); g.clip(); g.shadowColor = 'rgba(0,0,10,.7)'; g.shadowBlur = 26; g.fillStyle = col; g.fillText(txt, x, y + (1 - k) * up); g.restore(); };
  line(l1, x1, y1, T.l1); line(l2, x2, y2, T.l2);
  const kd = ease.back((t - T.l1) / 0.35); if (kd > 0) { const cx = x1 - gap - dotR, cy = y1 - 38, p = Math.max(0, ...T.rings.map((r) => (t >= r ? Math.exp(-(t - r) * 5) : 0)));
    g.save(); g.shadowColor = MAG; g.shadowBlur = 24 + 30 * p; g.fillStyle = MAG; g.beginPath(); g.arc(cx, cy, dotR * kd * (1 + 0.12 * p), 0, TAU); g.fill(); g.shadowBlur = 0;
    const rk = (t % 0.9) / 0.9; g.strokeStyle = `rgba(240,2,127,${0.6 * (1 - rk)})`; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, dotR + rk * 26, 0, TAU); g.stroke(); g.restore(); }
  // the slogan: the first line tracked and amber, the rest set under it
  g.textAlign = 'center';
  if ('letterSpacing' in g) g.letterSpacing = '4px'; g.font = '40px "Poppins-800"'; line(SLOGAN[0], W / 2, 500, T.slogan, AMBER, 60, 70);
  if ('letterSpacing' in g) g.letterSpacing = '0px'; g.font = '42px "Poppins-800"'; line(SLOGAN[1], W / 2, 566, T.slogan + 0.22, '#ffffff', 60, 74); line(SLOGAN[2], W / 2, 624, T.slogan + 0.4, '#ffffff', 60, 74);
  g.restore();
}

// ================================================================== the frame
const SC = {}; const scene = (k) => SC[k] || (SC[k] = { forest: buildForest, land: typeof buildLand === 'function' ? buildLand : null, city: typeof buildCity === 'function' ? buildCity : null }[k]());
const GRADE = { focus: 1e5, aperture: 0, maxBlur: 0, tilt: 0, threshold: 0.8, knee: 0.5, bloomA: 0.62, bloomB: 0.5, exposure: 1.2, vignette: 0.5, grain: 0.04, sat: 1.06, contrast: 1.1, toe: 0.01, lift: [0.0, 0.004, 0.012], gain: [1.0, 1.0, 1.02], aberration: 0.0016 };
function streak(g, amt) { if (amt <= 0.02) return; g.save(); for (const s of [1.018, 1.04, 1.066]) { g.globalAlpha = 0.24 * amt; g.drawImage(out, W / 2 - W * s / 2, H / 2 - H * s / 2, W * s, H * s); } g.restore(); }
function frame(t) {
  const part = t < T.land ? 'forest' : t < T.city ? 'land' : 'city', X = scene(part), info = X.update(t);
  if (X.water) X.water.update(X.cam, t);
  post.render(X.scene, X.cam, { ...GRADE, ...(X.grade || {}), ...(info.grade || {}), seed: Math.floor(t * 24) });
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.globalAlpha = 1; g2d.drawImage(renderer.domElement, 0, 0);
  streak(g2d, info.speed || 0);
  if (part === 'forest' && t >= T.fpv) {
    const flags = LOCK.map((t0, i) => [i, t - t0 - 1.0]).filter(([, k]) => k > 0).map(([i, k]) => [i, k / 0.4]);
    let lock = null; LOCK.forEach((t0, i) => { const k = (t - (t0 - 0.5)) / 0.5, after = t - t0; if (k > 0 && after < 1.0) { const s = toScreen(X.cam, X.items[i].focus); if (s) lock = { x: clamp(s[0], 150, W - 150), y: clamp(s[1], 420, 1300), k, i, after }; } });
    osd(g2d, t, { alt: info.alt, kmh: info.kmh, home: 'HOME 187 km', mode: t > LOCK[2] + 1.1 ? '3 FLAGS · RETURN TO HOME' : 'SCANNING', modeCol: t > LOCK[2] + 1.1 ? '#ff2a93' : null, flags, lock });
  } else if (info.osd) osd(g2d, t, info.osd);
  if (info.overlay) info.overlay(g2d);
  // each part hands over to the next through a breath of dark
  for (const c of [T.fpv, T.land, T.city, T.home]) { const d = Math.abs(t - c), w = c === T.fpv ? 0.06 : 0.16; if (d < w) { g2d.fillStyle = `rgba(3,5,12,${(1 - d / w) * (c === T.fpv ? 0.9 : 0.85)})`; g2d.fillRect(0, 0, W, H); } }
  const fin = clamp(t / 0.3); if (fin < 1) { g2d.fillStyle = `rgba(0,0,0,${1 - fin})`; g2d.fillRect(0, 0, W, H); }
  return out;
}
window.__film = { fps: FPS, frames: Math.round(T.end * FPS), events: { ...T, lock0: LOCK[0], lock1: LOCK[1], lock2: LOCK[2] }, report: { look: 'night flight', slogan: SLOGAN, flags: FLAGS },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); }, still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
