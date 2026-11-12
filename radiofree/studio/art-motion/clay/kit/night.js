// THE NIGHT KIT (11 Nov). The 3D night look that Night Flight was built in, lifted out so the next films start from it:
// height fog for every material, a sky dome (moon, aurora, stars, a city's glow), a true planar water mirror, snow with
// ripples and glints, normal maps from any height canvas, shadows drawn once, light shafts and a lens streak in the post,
// and shoot(): one frame from K jittered exposures (antialiasing, and real motion blur when the scene moves between them).
// One page, one renderer. Night Flight keeps its own copy of these (clay/nightflight/film.js); change both or neither.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Post } from '../welcome/lib/post.js';

// HEIGHT FOG. A scene's THREE.Fog is read as: near = density a metre at the ground, far = the height it thins out over
// (whole metres) plus a plain distance haze in its fraction (22.0011 = 22 m, haze 0.0011). Ground mist in the forest,
// valley fog on the lakes, street haze in the city, and the tops of things standing clear of it.
THREE.ShaderChunk.fog_pars_vertex += '\n#ifdef USE_FOG\n varying vec3 vFogWorld;\n#endif\n';
THREE.ShaderChunk.fog_vertex += '\n#ifdef USE_FOG\n vFogWorld = cameraPosition + transpose(mat3(viewMatrix)) * mvPosition.xyz;\n#endif\n';
THREE.ShaderChunk.fog_pars_fragment += '\n#ifdef USE_FOG\n varying vec3 vFogWorld;\n#endif\n';
THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fFall = floor(fogFar), fHaze = fract(fogFar), fDist = length(vFogWorld - cameraPosition);
    float hA = max(cameraPosition.y, 0.0), hB = max(vFogWorld.y, 0.0), fk = 1.0 / fFall, dh = hB - hA;
    float integ = abs(dh) > 0.05 ? (exp(-fk * hA) - exp(-fk * hB)) / (fk * dh) : exp(-fk * hA);
    float fogFactor = 1.0 - exp(-fogNear * fDist * integ - fHaze * fHaze * fDist * fDist);
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`;
const FOG_GLSL = `float hfog(vec3 w, vec3 c, float dens, float fall, float haze){ float d = length(w - c), hA = max(c.y, 0.), hB = max(w.y, 0.), k = 1. / fall, dh = hB - hA;
  float integ = abs(dh) > 0.05 ? (exp(-k * hA) - exp(-k * hB)) / (k * dh) : exp(-k * hA); return 1. - exp(-dens * d * integ - haze * haze * d * d); }`;

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

// ------------------------------------------------------------------ renderer, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
// two posts: MSAA for a single exposure; none when several jittered exposures are averaged (they antialias each other)
const post = new Post(renderer, W, H, { samples: Number(Q.get('msaa') ?? 4) }), postMB = new Post(renderer, W, H, { samples: 0 });
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

const canvasTex = (w, h, draw, data = false) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0, ...o });
const lum = (r, g, b, o = {}) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), ...o });   // a light source: values over 1 bloom
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent, scale } = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); if (scale) m.scale.set(...scale); parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
const ni = (g) => (g.index ? g.toNonIndexed() : g);
function tinted(g, c0, c1 = c0, pw = 1) {   // vertex colours, bottom to top
  g = ni(g); g.computeBoundingBox(); const p = g.attributes.position, a = new Float32Array(p.count * 3), y0 = g.boundingBox.min.y, y1 = g.boundingBox.max.y, A = C3(c0), B = C3(c1);
  for (let i = 0; i < p.count; i++) { const k = Math.pow((p.getY(i) - y0) / Math.max(1e-6, y1 - y0), pw); a[i * 3] = lerp(A.r, B.r, k); a[i * 3 + 1] = lerp(A.g, B.g, k); a[i * 3 + 2] = lerp(A.b, B.b, k); }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const glowTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const glow = (parent, pos, size, r, g, b) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(r, g, b), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.position.set(...pos); s.scale.setScalar(size); parent.add(s); return s; };

// every welded corner of a shape gets the same nudge, so a cone becomes a ragged bough and stays closed
function jag(g, amt, seed, droop = 0) { const p = g.attributes.position, R = rng(seed), m = new Map();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`; if (!m.has(key)) m.set(key, [1 + (R() - 0.5) * amt, -R() * droop]);
    const [sc, dy] = m.get(key), rr = Math.hypot(x, z) > 1e-4 ? 1 : 0; p.setXYZ(i, x * sc, y + dy * rr, z * sc); } g.computeVertexNormals(); return g; }
const shadowed = (light, size, near, far, o = {}) => { light.castShadow = true; light.shadow.mapSize.set(size, size); light.shadow.camera.near = near; light.shadow.camera.far = far; light.shadow.bias = o.bias ?? -0.002; light.shadow.normalBias = o.normalBias ?? 0.06; light.shadow.camera.updateProjectionMatrix(); if (o.once) { light.shadow.autoUpdate = false; light.shadow.needsUpdate = true; } return light; };
const castAll = (root) => root.traverse((o) => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.userData.noShadow) { o.castShadow = !o.userData.noCast; o.receiveShadow = true; } });
const uvOf = (s) => (s ? [s[0] / W, 1 - s[1] / H] : null);
// detail: a tangent-space normal map from the red channel of a height canvas
function normalTex(src, k = 2, rep = [1, 1]) { const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), o = g.createImageData(w, h), Hh = (x, y) => d[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = (Hh(x + 1, y) - Hh(x - 1, y)) * k, dy = (Hh(x, y + 1) - Hh(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    o.data[i] = (-dx / l * 0.5 + 0.5) * 255; o.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; o.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; o.data[i + 3] = 255; }
  g.putImageData(o, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; }
const canvasOf = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };
// snow: drifts and wind ripples (the normal map), and one grain in a few hundred that is smooth enough to catch the moon (the glints)
let _snow = null;
function snowMaps(rep) { if (!_snow) { const N = 512;
    const hc = canvasOf(N, N, (g) => { const im = g.createImageData(N, N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N * TAU, v = y / N * TAU, a = (Math.sin(u) + 1) * 3, b = (Math.cos(v) + 1) * 3;
        const drift = vnoise(a + Math.cos(u) * 2, b + Math.sin(v) * 2) * 0.55, rip = Math.sin(y * 0.21 + vnoise(x / 40, y / 40) * 9 + x * 0.03) * 0.12, grain = (hash2(x, y) - 0.5) * 0.16, v8 = Math.round((0.35 + drift + rip + grain) * 200);
        const i = (y * N + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(v8, 0, 255); im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
    const rc = canvasOf(N, N, (g) => { g.fillStyle = 'rgb(235,235,235)'; g.fillRect(0, 0, N, N); g.fillStyle = 'rgb(18,18,18)'; for (let i = 0; i < 1400; i++) g.fillRect(Math.floor(hash2(i, 3) * N), Math.floor(hash2(i, 7) * N), 1, 1); });
    _snow = { hc, rc }; }
  const n = normalTex(_snow.hc, 3.2, rep), r = new THREE.CanvasTexture(_snow.rc); r.colorSpace = THREE.NoColorSpace; r.wrapS = r.wrapT = THREE.RepeatWrapping; r.repeat.set(...rep); return { normalMap: n, roughnessMap: r, normalScale: new THREE.Vector2(0.7, 0.7) }; }

const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm2(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+vec2(3.1,7.7); a*=.5; } return s; }`;

// ------------------------------------------------------------------ the sky: gradient, a city's light dome, the moon, the aurora, stars
function makeSky(scene, o) {
  const U = { uTime: { value: 0 }, uTop: { value: C3(o.top) }, uHor: { value: C3(o.hor) }, uGlowDir: { value: V(o.glowDir || [0, 0, -1]).normalize() }, uGlowCol: { value: C3(o.glowCol || '#000000') }, uGlow: { value: o.glow ?? 0 },
    uGlowP: { value: o.glowP ?? 9 }, uGlowE: { value: o.glowE ?? 13 }, uMoon: { value: V(o.moon).normalize() }, uMoonC: { value: new THREE.Vector2(...(o.moonCos || [0.99962, 0.9998])) }, uAur: { value: o.aurora ?? 0 }, uAurAz: { value: o.auroraAz ?? 0 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 48, 24), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uGlow, uGlowP, uGlowE, uAur, uAurAz; uniform vec3 uTop, uHor, uGlowDir, uGlowCol, uMoon; uniform vec2 uMoonC; varying vec3 vD;
${GLSL_NOISE}
void main(){
  vec3 d = normalize(vD); float el = d.y;
  vec3 col = mix(uHor, uTop, pow(clamp(el, 0., 1.), 0.42));
  col = mix(col, uHor * 0.55, smoothstep(0., -0.3, el));
  float g = max(dot(normalize(vec3(d.x, 0.0001, d.z)), uGlowDir), 0.);
  col += uGlowCol * uGlow * pow(g, uGlowP) * exp(-max(el, 0.) * uGlowE);
  float m = dot(d, uMoon);
  col += vec3(1.0, 0.97, 0.9) * (smoothstep(uMoonC.x, uMoonC.y, m) * 5. + pow(max(m, 0.), 700.) * 0.5 + pow(max(m, 0.), 30.) * 0.06);
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
  const U = { tR: { value: rt.texture }, texM: { value: texM }, uTime: { value: 0 }, uDeep: { value: C3(deep) }, uAmp: { value: amp }, uFogC: { value: fog ? fog.color.clone() : C3('#000000') }, uFogN: { value: fog ? fog.near : 0 }, uFogF: { value: fog ? fog.far : 1 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `uniform mat4 texM; varying vec4 vR; varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.); vW = wp.xyz; vR = texM * wp; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform sampler2D tR; uniform float uTime, uAmp, uFogN, uFogF; uniform vec3 uDeep, uFogC; varying vec4 vR; varying vec3 vW;
${FOG_GLSL}
${GLSL_NOISE}
void main(){
  vec3 toC = cameraPosition - vW; float dist = length(toC); vec3 Vv = toC / dist; vec2 p = vW.xz;
  float a = fbm2(p * 0.11 + vec2(uTime * 0.35, uTime * 0.12)) - 0.5, b = fbm2(p * 0.11 + vec2(-uTime * 0.2, 5.2 + uTime * 0.3)) - 0.5, fine = fbm2(p * 0.8 + uTime * 0.7) - 0.5;
  float k = uAmp * (0.3 + 0.7 * exp(-dist / 600.));
  vec4 r = vR; r.xy += vec2(a * 0.6 + fine * 0.25, b * 2.4 + fine * 0.6) * k * r.w;
  vec3 refl = texture2DProj(tR, r).rgb;
  float fres = 0.32 + 0.68 * pow(1. - clamp(Vv.y, 0., 1.), 4.);
  vec3 col = mix(uDeep, refl, fres);
  float f = hfog(vW, cameraPosition, uFogN, floor(uFogF), fract(uFogF));
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

// ------------------------------------------------------------------ screen, grade, the frame
const _p = new THREE.Vector3();
const toScreen = (cam, v) => { _p.copy(v).project(cam); return _p.z < 1 ? [(_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H] : null; };
const GRADE = { focus: 1e5, aperture: 0, maxBlur: 0, tilt: 0, threshold: 0.8, knee: 0.5, bloomA: 0.62, bloomB: 0.5, exposure: 1.2, vignette: 0.5, grain: 0.04, sat: 1.06, contrast: 1.1, toe: 0.01, lift: [0.0, 0.004, 0.012], gain: [1.0, 1.0, 1.02], aberration: 0.0016, streak: 0.22 };
// one frame: K exposures averaged (each a sub-pixel apart, so they antialias; `update(j)` may move the scene between them)
function shoot(scene, cam, { K = 1, grade = {}, rays = null, water = null, t = 0, seed = 0, update = null } = {}) {
  g2d.setTransform(1, 0, 0, 1, 0, 0); const PP = K > 1 ? postMB : post;
  for (let j = 0; j < K; j++) { if (update) update(j); if (water) water.update(cam, t);
    if (K > 1 && j < K - 1) { const hx = (((j + 1) * 0.5698) % 1) - 0.5, hy = (((j + 1) * 0.7548) % 1) - 0.5; cam.setViewOffset(W, H, hx, hy, W, H); }
    PP.render(scene, cam, { ...GRADE, ...grade, rays: rays ? rays.k : 0, raysCenter: rays ? rays.c : [0.5, 0.5], raysCut: rays ? (rays.cut ?? 3) : 3, raysRadius: rays ? (rays.r ?? 0.5) : 4, seed });
    if (cam.view) cam.clearViewOffset(); g2d.globalAlpha = 1 / (j + 1); g2d.drawImage(renderer.domElement, 0, 0); }
  g2d.globalAlpha = 1; return g2d; }
// a spruce with snow lying on every bough; instances of anything, planted on a ground function
const spruceGeo = (seed = 5, tiers = 7) => { const R = rng(seed), parts = [tinted(new THREE.CylinderGeometry(0.1, 0.3, 4.2, 6).translate(0, 2.1, 0), '#2a1d16')];
  for (let i = 0; i < tiers; i++) { const k = i / (tiers - 1), r = lerp(2.3, 0.42, Math.pow(k, 0.85)) * (0.88 + R() * 0.24), h = lerp(3.1, 2.0, k);
    parts.push(tinted(jag(new THREE.ConeGeometry(r, h, 11, 1, true), 0.36, seed * 31 + i, 0.5).translate(0, 2.3 + i * (10.5 / tiers) + h / 2, 0), '#06130d', '#9db2c4', 2.4)); } return mergeGeometries(parts); };
const treeMat = () => std('#ffffff', { vertexColors: true, roughness: 1, side: THREE.DoubleSide });
function plant(scene, geo, mat, list, gy = () => 0) { const im = new THREE.InstancedMesh(geo, mat, list.length), D = new THREE.Object3D();
  list.forEach(([x, z, sc, a = 0, lean = 0], i) => { D.position.set(x, gy(x, z) - 0.2, z); D.rotation.set(lean, a, lean * 0.6); D.scale.set(sc, sc * (0.9 + 0.25 * hash2(x, z)), sc); D.updateMatrix(); im.setMatrixAt(i, D.matrix); }); scene.add(im); return im; }
// captions for stills and simple films: lines of text, a [word] in brackets pops in the accent colour
function caption(g, lines, y, { size = 86, color = '#ffffff', pop = '#F0027F', lead = 1.14, font = 'Poppins-800', align = 'center', x = W / 2 } = {}) {
  g.save(); g.font = `${size}px "${font}"`; g.textBaseline = 'alphabetic'; g.shadowColor = 'rgba(0,0,8,.75)'; g.shadowBlur = 22;
  lines.forEach((ln, i) => { const parts = ln.split(/(\[[^\]]+\])/).filter(Boolean).map((s) => (s[0] === '[' ? [s.slice(1, -1), pop] : [s, color])), w = parts.reduce((a, [s]) => a + g.measureText(s).width, 0);
    let cx = align === 'center' ? x - w / 2 : x; g.textAlign = 'left'; for (const [s, c] of parts) { g.fillStyle = c; g.fillText(s, cx, y + i * size * lead); cx += g.measureText(s).width; } }); g.restore(); }

export { THREE, RoundedBoxGeometry, mergeGeometries, Post, W, H, TAU, FPS, DEG, Q, clamp, lerp, smooth, ease, rng, C3, V, hash2, vnoise, fbm, hermite, hermite3,
  renderer, post, postMB, out, g2d, canvasTex, std, lum, mesh, rbox, ni, tinted, glowTex, glow, jag, shadowed, castAll, uvOf, normalTex, canvasOf, snowMaps,
  GLSL_NOISE, FOG_GLSL, makeSky, makeWater, toScreen, GRADE, shoot, spruceGeo, treeMat, plant, caption };
