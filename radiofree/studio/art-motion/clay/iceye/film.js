// SLEEP TIGHT (RFH, Helsinki 2 · ICEYE), v2 FULL BUILD, 9 Nov (v1 stills the same day; owner: "Go ahead"). Owner, Mon 9 Nov: "ICEYE is great. Let's go for impressive
// visuals. Modern cold war feel. Nanny state surveillance of the border. High-tech defence spending starting from Aalto
// University start-up hub. Supo approved clearance for all employees etc".
// DEVICE: SCALE SHIFT in one unbroken pull-back, from a student's desk in Otaniemi (2012) up through the snow and the
// cloud to a radar constellation that sees Finland in the dark; it ends as a BORROWED FORMAT: the nanny state's baby monitor.
// A new 3D look, "cold war": deep navy and black, phosphor green for everything the radar sees, warm sodium for cities
// and lamps, grain, a little aberration, scanlines on screens.
// Six beats (stills render 1, 2 and 6):
//   1 · DESK    a student's desk at night, a lamp, a radar-satellite model on a stand, snow on the window   "Otaniemi, 2012"
//   2 · ORBIT   a line of radar satellites over Finland at night; their beams cut green strips through the cloud
//   3 · WORTH   the camera keeps pulling back: the whole constellation in its orbits, a valuation counter rolls to €10B
//   4 · BUYS    a war-room plotting table: the grant envelope drops on "grants", the desk's own model lands on the map
//               on "buys it", tagged GOVERNMENT-OWNED (the same model as beat 1: the scale shift comes home)
//   5 · CLASSIFIED a spec sheet slides in, every value redacted; the stamp SLAMS on "classified"; Supo rides as a tag
//   6 · MONITOR a baby monitor on a bedside table, its screen the radar map of Finland: "Sleep tight, Finland."
// Map: Natural Earth 10m (public domain), see GEO-NOTICE.md. No logos, no people. 1080×1920, 30 fps. film.html?lang=en

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from '../welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30, DEG = Math.PI / 180;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['Caveat-600', 'Caveat-600.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' || fam === 'RobotoCondensed' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);
const V = (a) => new THREE.Vector3(...a);

// ------------------------------------------------------------------ renderer, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ copy and timing
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 3.4], ['s3', 6.8], ['s4', 9.6], ['s5', 13.0], ['s6', 17.4], ['end', 21.2]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const GEO = await (await fetch('geo.json')).json();
// every impact lands on its caption's word, to the frame
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const wordT = (id, w0) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.w.toLowerCase().startsWith(w0)) || c.words[0]).t; };
const EV = { rise: T.s2 - 0.55, worth: T.s3 + 1.15,   // beat 3 has no caption: the counter IS the line, locking at 1.15 s
  grant: wordT('buys', 'grants') + 0.06, buys: popT('buys'), sheet: T.s5 + 0.2, stamp: popT('classified'), beep: T.s6 + 0.45, sleep: popT('sleep') };
EV.count0 = T.s3 + 0.35; EV.drop = EV.buys - 0.42; EV.stampDown = EV.stamp - 0.16;
for (let i = 0, t = T.s2 + 0.45; t < T.s4 - 0.4; i++, t += 0.95) EV['ping' + i] = +t.toFixed(3);
const KICKS = [[EV.grant, 0.45], [EV.buys, 1.1], [EV.stamp, 1.5]];
function kickAt(t) { let k = 0; for (const [t0, a] of KICKS) { const dt = t - t0; if (dt >= 0 && dt < 0.3) k += a * Math.exp(-dt * 24) * Math.cos(dt * 52); } return k; }

// ------------------------------------------------------------------ shared helpers
const canvasTex = (w, h, draw, data = false) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const phys = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.15, ...o });
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
function rings(g, list, proj, how) { for (const r of list) { g.beginPath(); r.forEach((p, i) => { const [x, y] = proj(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (how === 'fill') { g.closePath(); g.fill(); } else g.stroke(); } }

// cities: name, lon, lat, glow (rough size); for the night lights and the labels
const CITIES = [['HELSINKI', 24.94, 60.17, 1.0], ['ESPOO', 24.66, 60.21, 0.55], ['VANTAA', 25.04, 60.29, 0.5], ['TAMPERE', 23.76, 61.50, 0.6], ['TURKU', 22.27, 60.45, 0.5],
  ['OULU', 25.47, 65.01, 0.5], ['JYVÄSKYLÄ', 25.73, 62.24, 0.4], ['KUOPIO', 27.68, 62.89, 0.4], ['LAHTI', 25.66, 60.98, 0.4], ['PORI', 21.80, 61.48, 0.35],
  ['JOENSUU', 29.76, 62.60, 0.3], ['ROVANIEMI', 25.73, 66.50, 0.3], ['VAASA', 21.62, 63.10, 0.3], ['LAPPEENRANTA', 28.19, 61.06, 0.3], ['KOTKA', 26.95, 60.47, 0.3],
  ['SEINÄJOKI', 22.84, 62.79, 0.3], ['KAJAANI', 27.73, 64.23, 0.22], ['MIKKELI', 27.27, 61.69, 0.25], ['HÄMEENLINNA', 24.46, 61.0, 0.3], ['KOKKOLA', 23.13, 63.84, 0.22],
  ['TALLINN', 24.75, 59.44, 0.7], ['ST PETERSBURG', 30.32, 59.94, 1.6], ['STOCKHOLM', 18.07, 59.33, 1.1], ['UPPSALA', 17.64, 59.86, 0.4], ['RIGA', 24.11, 56.95, 0.8],
  ['VYBORG', 28.75, 60.71, 0.3], ['PETROZAVODSK', 34.35, 61.79, 0.45], ['UMEÅ', 20.26, 63.83, 0.3], ['LULEÅ', 22.15, 65.58, 0.3], ['TARTU', 26.72, 58.38, 0.35],
  ['NARVA', 28.19, 59.38, 0.25], ['NOVGOROD', 31.27, 58.52, 0.4], ['MURMANSK', 33.08, 68.97, 0.5], ['OSLO', 10.75, 59.91, 0.9], ['GÄVLE', 17.14, 60.67, 0.3],
  ['PSKOV', 28.33, 57.82, 0.35], ['SUNDSVALL', 17.31, 62.39, 0.25], ['ARKHANGELSK', 40.52, 64.54, 0.5], ['VOLOGDA', 39.89, 59.22, 0.4], ['TVER', 35.9, 56.86, 0.5],
  ['MOSCOW', 37.62, 55.75, 2.6], ['YAROSLAVL', 39.87, 57.63, 0.5], ['KOSTOMUKSHA', 30.58, 64.57, 0.15], ['KANDALAKSHA', 32.41, 67.15, 0.15], ['TROMSØ', 18.96, 69.65, 0.2]];

// ------------------------------------------------------------------ the map textures (the radar's world)
const BOXP = { lon0: 4, lon1: 48, lat0: 52, lat1: 74 }, MW = 4096, MH = 2048;
const projP = ([lon, lat]) => [(lon - BOXP.lon0) / (BOXP.lon1 - BOXP.lon0) * MW, (BOXP.lat1 - lat) / (BOXP.lat1 - BOXP.lat0) * MH];
const projG = ([lon, lat]) => [(lon + 180) / 360 * 4096, (90 - lat) / 180 * 2048];
const maskA = canvasTex(MW, MH, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgb(255,0,0)'; rings(g, GEO.land, projP, 'fill');
  g.fillStyle = 'rgb(0,255,0)'; rings(g, GEO.lakes, projP, 'fill');
  g.strokeStyle = 'rgb(0,0,255)'; g.lineWidth = 2.6; g.lineJoin = 'round'; rings(g, GEO.land, projP, 'stroke'); g.lineWidth = 1.6; rings(g, GEO.lakes, projP, 'stroke'); }, true);
const maskB = canvasTex(MW, MH, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, MW, MH); g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgb(255,0,0)'; g.lineWidth = 2.2; rings(g, GEO.borders, projP, 'stroke');
  g.strokeStyle = 'rgb(0,255,0)'; g.lineWidth = 3.4; rings(g, GEO.finRus, projP, 'stroke');
  for (const [, lon, lat, s] of CITIES) { const [x, y] = projP([lon, lat]), r = 10 + s * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(0,0,255,${Math.min(1, 0.55 + s * 0.3)})`); gr.addColorStop(0.25, `rgba(0,0,255,${0.35 * Math.min(1, s + 0.3)})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    const R = rng(Math.floor(lon * 1000)); for (let i = 0; i < 6 + s * 30; i++) { const a = R() * TAU, d = Math.pow(R(), 1.6) * r * 1.4, sz = 0.8 + R() * 1.8;   // sprawl: a few streets of light
      g.fillStyle = `rgba(0,0,255,${0.25 + R() * 0.5})`; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, sz, sz); } } }, true);
const baseTex = canvasTex(4096, 2048, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 4096, 2048); g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgb(255,0,0)'; rings(g, GEO.globe, projG, 'fill'); }, true);
for (const t of [maskA, maskB, baseTex]) { t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; }

const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm2(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(3.1,7.7); a*=.5; } return s; }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); vec3 u=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),u.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),u.x),u.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),u.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),u.x),u.y),u.z); }
float fbm3(vec3 p){ float a=.5,s=0.; for(int i=0;i<6;i++){ s+=a*vnoise3(p); p=p*2.02+vec3(1.7,9.2,3.1); a*=.5; } return s; }
`;
// the radar strips: (centre lon, half width, front lat, start lat); a strip is revealed from its start to its front
const NSTRIP = 4;
const GLSL_REVEAL = `
uniform vec4 uStrip[${NSTRIP}];
float reveal(float lon, float lat, out float front){
  float r = 0.; front = 0.;
  for (int i = 0; i < ${NSTRIP}; i++){ vec4 s = uStrip[i];
    float inLon = smoothstep(s.y + 0.05, s.y - 0.05, abs(lon - s.x));
    float inLat = smoothstep(s.w - 0.15, s.w + 0.15, lat) * smoothstep(s.z + 0.015, s.z - 0.05, lat);
    r = max(r, inLon * inLat);
    front = max(front, inLon * exp(-abs(lat - s.z) * 26.) * step(s.w, s.z));
  }
  return r;
}`;

// ================================================================== SCENE 2 · ORBIT
const R_E = 6371;
const llv = (lon, lat, alt = 0, o = new THREE.Vector3()) => { const r = R_E + alt, la = lat * DEG, lo = lon * DEG; return o.set(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo)); };
const ORBIT = new THREE.Scene(); ORBIT.background = C3('#000002');
const stripU = { value: Array.from({ length: NSTRIP }, () => new THREE.Vector4(0, 0, 0, 0)) };
const earthU = { tA: { value: maskA }, tB: { value: maskB }, tBase: { value: baseTex }, uStrip: stripU, uSun: { value: new THREE.Vector3() }, uTime: { value: 0 },
  box: { value: new THREE.Vector4(BOXP.lon0, BOXP.lon1, BOXP.lat0, BOXP.lat1) } };
const VERT_W = `varying vec3 vP; varying vec3 vW; varying vec3 vN;
void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH = new THREE.Mesh(new THREE.SphereGeometry(R_E, 512, 256), new THREE.ShaderMaterial({ uniforms: earthU, vertexShader: VERT_W, fragmentShader: `
uniform sampler2D tA, tB, tBase; uniform vec4 box; uniform vec3 uSun; uniform float uTime;
varying vec3 vP; varying vec3 vW; varying vec3 vN;
${GLSL_NOISE}
${GLSL_REVEAL}
void main(){
  vec3 p = normalize(vP); float lat = degrees(asin(p.y)), lon = degrees(atan(p.x, p.z));
  vec4 a; vec4 b = vec4(0.);
  bool inBox = lon > box.x && lon < box.y && lat > box.z && lat < box.w;
  if (inBox) { vec2 uv = vec2((lon - box.x) / (box.y - box.x), (lat - box.z) / (box.w - box.z)); a = texture2D(tA, uv); b = texture2D(tB, uv); }
  else { a = texture2D(tBase, vec2((lon + 180.) / 360., (lat + 90.) / 180.)); a.b = 0.; }
  float land = a.r * (1. - a.g), coast = a.b;
  float fr; float rv = reveal(lon, lat, fr);
  // night: dark land, black sea, sodium cities
  float n = fbm2(vec2(lon, lat * 1.8) * 2.4);
  vec3 night = mix(vec3(0.004, 0.007, 0.012), vec3(0.016, 0.024, 0.034) * (0.7 + 0.6 * n), land);
  night += vec3(1.0, 0.56, 0.24) * b.b * b.b * 2.4;
  // the radar's picture: speckle on land, black water, bright shore, the border as a hairline
  float sp = hash12(floor(vec2(lon * 150., lat * 300.)));
  float tex = fbm2(vec2(lon * 9., lat * 18.)) * 0.8 + fbm2(vec2(lon * 40., lat * 80.)) * 0.45;
  vec3 green = vec3(0.30, 1.0, 0.56);
  vec3 sar = land * green * (0.025 + 0.30 * tex * tex * (0.35 + 0.9 * sp));
  sar += (1. - land) * green * 0.006 * sp;
  sar += green * coast * 0.55;
  sar += vec3(1.0, 0.62, 0.22) * b.r * 0.35 + vec3(1.0, 0.55, 0.18) * b.g * 1.2;
  sar += vec3(1.0, 0.7, 0.35) * b.b * b.b * 0.4;
  // graticule, one degree, only inside what the radar has seen
  float gl = max(1. - smoothstep(0., 0.025, abs(fract(lon) - 0.5) - 0.475), 1. - smoothstep(0., 0.013, abs(fract(lat) - 0.5) - 0.4865));
  sar += green * gl * 0.05;
  vec3 col = mix(night, sar, rv);
  col += green * fr * 1.6 + vec3(0.8, 1.0, 0.9) * fr * fr * 0.9;
  // the air between us and the ground: a teal haze towards the limb
  vec3 V = normalize(cameraPosition - vW); float mu = max(dot(normalize(vN), V), 0.);
  col = mix(col, vec3(0.012, 0.05, 0.075), pow(1. - mu, 3.2) * 0.9);
  gl_FragColor = vec4(col, 1.);
}` }));
ORBIT.add(EARTH);
const CLOUDS = new THREE.Mesh(new THREE.SphereGeometry(R_E + 7, 512, 256), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uStrip: stripU, uTime: earthU.uTime },
  vertexShader: VERT_W, fragmentShader: `
uniform float uTime; varying vec3 vP; varying vec3 vW; varying vec3 vN;
${GLSL_NOISE}
${GLSL_REVEAL}
void main(){
  vec3 p = normalize(vP); float lat = degrees(asin(p.y)), lon = degrees(atan(p.x, p.z));
  vec3 q = p * 26. + vec3(uTime * 0.02, 0., 0.);
  float d = fbm3(q + fbm3(p * 7.) * 1.7);
  float cov = smoothstep(0.43, 0.68, d) * (0.75 + 0.25 * smoothstep(58., 64., lat));
  float fr; float rv = reveal(lon, lat, fr);
  float edge = rv * (1. - rv) * 4.;
  vec3 col = mix(vec3(0.030, 0.040, 0.056), vec3(0.11, 0.135, 0.17), smoothstep(0.5, 0.9, d));
  col += vec3(0.3, 1.0, 0.56) * (edge * 0.5 + fr * 0.8) * cov;
  vec3 V = normalize(cameraPosition - vW); float mu = max(dot(normalize(vN), V), 0.);
  float a = cov * 0.9 * (1. - rv * 0.97);
  a *= smoothstep(0.02, 0.2, mu);
  gl_FragColor = vec4(col, a);
}` }));
CLOUDS.renderOrder = 2; ORBIT.add(CLOUDS);
const ATMO = new THREE.Mesh(new THREE.SphereGeometry(R_E + 95, 256, 128), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
  uniforms: { uSun: earthU.uSun }, vertexShader: `varying vec3 vNv; varying vec3 vNw; void main(){ vNv = normalize(normalMatrix * normal); vNw = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `uniform vec3 uSun; varying vec3 vNv; varying vec3 vNw;
void main(){ float k = pow(clamp(0.78 + dot(vNv, vec3(0,0,1)) * 0.0 - abs(dot(vNv, vec3(0,0,1))), 0., 1.), 2.6);
  float s = clamp(dot(vNw, normalize(uSun)) * 0.5 + 0.5, 0., 1.);
  vec3 c = mix(vec3(0.05, 0.32, 0.55), vec3(1.0, 0.48, 0.16), pow(s, 6.));
  gl_FragColor = vec4(c * k * (0.9 + 2.2 * pow(s, 8.)), 1.); }` }));
ATMO.renderOrder = 1; ORBIT.add(ATMO);
{ // stars
  const n = 5200, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), R = rng(11);
  for (let i = 0; i < n; i++) { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u), r = 40000; pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
    const b = Math.pow(R(), 5) * 1.6 + 0.08; col.set([b * (0.8 + R() * 0.2), b * 0.9, b], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  ORBIT.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false })));
}

// the satellite: a long flat radar panel under a small foil bus, one solar wing. Generic, not ICEYE's hardware.
const foilTex = canvasTex(256, 256, (g, w, h) => { const R = rng(3); g.fillStyle = '#b8862e'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = R() * w, y = R() * h; g.fillStyle = `rgba(${R() < 0.5 ? '255,226,150' : '90,60,20'},${0.15 + R() * 0.3})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 60, y + (R() - 0.5) * 30); g.lineTo(x + (R() - 0.5) * 40, y + (R() - 0.5) * 50); g.fill(); } });
const tileTex = canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#14181d'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { g.fillStyle = (x + y) % 5 ? '#d7dbe0' : '#c4c9cf'; g.fillRect(x * 16 + 1.5, y * 16 + 1.5, 13, 13);
    g.fillStyle = '#8f969e'; g.fillRect(x * 16 + 6, y * 16 + 6, 4, 4); } });
const cellTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#0b1530'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(170,190,220,.55)'; g.lineWidth = 1.2;
  for (let x = 0; x <= w; x += 21.3) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 21.3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
const SATMAT = { foil: std('#ffffff', { map: foilTex, metalness: 0.95, roughness: 0.32, envMapIntensity: 1.4 }), tiles: std('#ffffff', { map: tileTex, metalness: 0.2, roughness: 0.45 }),
  back: std('#2a2f36', { metalness: 0.6, roughness: 0.4 }), cells: std('#ffffff', { map: cellTex, metalness: 0.5, roughness: 0.25, envMapIntensity: 1.2 }),
  frame: std('#9aa1aa', { metalness: 0.8, roughness: 0.3 }), glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.6, 1.2) }), lens: phys('#0b0d12', { roughness: 0.05 }) };
function makeSat(parent) {   // local frame: +z along track (forward), +y away from the Earth, the panel faces -y and rolls toward +x
  const S = new THREE.Group(); parent.add(S);
  const tiles = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 4.4), [SATMAT.back, SATMAT.back, SATMAT.back, SATMAT.tiles, SATMAT.back, SATMAT.back]);
  const PANEL = new THREE.Group(); S.add(PANEL); PANEL.rotation.z = -0.5; PANEL.position.y = -0.48; PANEL.add(tiles); tiles.castShadow = true;
  tileTex.wrapS = THREE.RepeatWrapping; tileTex.rotation = Math.PI / 2; tileTex.center.set(0.5, 0.5);
  mesh(new THREE.BoxGeometry(0.02, 0.012, 4.2), SATMAT.glow, { pos: [0.25, -0.045, 0], parent: PANEL, cast: false });
  mesh(new THREE.BoxGeometry(0.02, 0.012, 4.2), SATMAT.glow, { pos: [-0.25, -0.045, 0], parent: PANEL, cast: false });
  mesh(rbox(0.86, 0.74, 0.92, 0.06), SATMAT.foil, { pos: [0, 0, 0.1], parent: S });
  mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), SATMAT.frame, { pos: [0, -0.3, 0.1], parent: S });
  const WING = new THREE.Group(); S.add(WING); WING.position.set(-0.43, 0.2, 0.1); WING.rotation.z = 0.35;
  mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), SATMAT.frame, { pos: [-0.12, 0, 0], parent: WING });
  mesh(new THREE.BoxGeometry(1.7, 0.03, 0.95), [SATMAT.frame, SATMAT.frame, SATMAT.cells, SATMAT.back, SATMAT.frame, SATMAT.frame], { pos: [-1.0, 0, 0], parent: WING });
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), SATMAT.frame, { pos: [0.22, 0.44, -0.18], parent: S });
  mesh(new THREE.CircleGeometry(0.075, 16), SATMAT.lens, { pos: [0.22, 0.525, -0.18], rot: [-Math.PI / 2, 0, 0], parent: S });
  mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.6, 6), SATMAT.frame, { pos: [0.3, 0.6, 0.4], rot: [0.4, 0, 0], parent: S });
  return S;
}
// a satellite in orbit: position by lon/lat/alt, oriented with the local north as forward
const _up = new THREE.Vector3(), _n = new THREE.Vector3(), _e = new THREE.Vector3(), _m = new THREE.Matrix4();
function placeLocal(obj, lon, lat, alt, heading = 0) {   // heading: 0 = north, radians clockwise
  llv(lon, lat, alt, obj.position); _up.copy(obj.position).normalize();
  _n.set(0, 1, 0).addScaledVector(_up, -_up.y).normalize(); _e.crossVectors(_n, _up).normalize();
  const f = _n.clone().multiplyScalar(Math.cos(heading)).addScaledVector(_e, Math.sin(heading)), x = new THREE.Vector3().crossVectors(_up, f);
  _m.makeBasis(x, _up, f); obj.quaternion.setFromRotationMatrix(_m);
}
const SATS = [];
const STRIPS = [   // the constellation over Finland tonight: four swaths with night between them, each from the coast up to its satellite
  { c: 22.4, h: 1.05, start: 60.0, front: 62.3 }, { c: 25.6, h: 1.05, start: 60.1, front: 64.9 },
  { c: 28.8, h: 1.05, start: 60.6, front: 66.4 }, { c: 32.0, h: 1.05, start: 61.4, front: 63.6 }];
const glintTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(190,255,215,.8)'); gr.addColorStop(0.4, 'rgba(60,255,140,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(200,255,220,.5)'; g.fillRect(0, 63, 128, 2); g.fillRect(63, 0, 2, 128); });
const glint = (s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: new THREE.Color(1.6, 1.8, 1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, sizeAttenuation: false }));
  sp.scale.setScalar(s); sp.renderOrder = 4; ORBIT.add(sp); return sp; };
for (let i = 0; i < NSTRIP; i++) { const G = new THREE.Group(); ORBIT.add(G); const S = makeSat(G); SATS.push({ G, S, beam: null, glow: glint(0.032) }); }
const HERO = (() => { const G = new THREE.Group(); ORBIT.add(G); const S = makeSat(G); return { G, S, beam: null, glow: glint(0.03) }; })();
// beat 3: the camera keeps pulling back and the rest of the constellation comes into view, plane by plane (sun-synchronous, ~97.6°)
const PLANES = [];
for (let p = 0; p < 9; p++) {
  const node = -40 + p * 20, lo = node * DEG, inc = 97.6 * DEG, R0 = R_E + 560;
  const e1 = new THREE.Vector3(Math.sin(lo), 0, Math.cos(lo)), east = new THREE.Vector3(Math.cos(lo), 0, -Math.sin(lo));
  const e2 = new THREE.Vector3(0, Math.sin(inc), 0).addScaledVector(east, Math.cos(inc));
  const pts = []; for (let k = 0; k <= 256; k++) { const a = k / 256 * TAU; pts.push(e1.clone().multiplyScalar(Math.cos(a) * R0).addScaledVector(e2, Math.sin(a) * R0)); }
  const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.35, 1.3, 0.75), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat); line.renderOrder = 3; ORBIT.add(line);
  const th = Array.from({ length: 5 }, (_, k) => 1.05 + p * 0.31 + k * TAU / 5), sats = th.map(() => glint(0.018));
  PLANES.push({ e1, e2, R0, line, mat, th, sats });
}
function constellationAt(t, a) {
  PLANES.forEach((L, p) => { const ap = clamp(a * PLANES.length * 0.8 - p * 0.8); L.mat.opacity = 0.3 * ap; L.line.visible = ap > 0;
    L.sats.forEach((sp, k) => { const th = L.th[k] + t * 0.03; sp.position.copy(L.e1).multiplyScalar(Math.cos(th) * L.R0).addScaledVector(L.e2, Math.sin(th) * L.R0);
      sp.visible = ap > 0; sp.material.opacity = ap; }); });
}
// the beams: a fan of light from each panel to the line where its strip is being drawn
const beamMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `attribute float k; attribute float u; varying float vk; varying float vu; void main(){ vk = k; vu = u; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  // a thin fan of light: almost nothing in the middle, bright at its two edges and where it meets the ground
  fragmentShader: `uniform float uA; varying float vk; varying float vu;
void main(){ float s = abs(vu - 0.5 * vk) / max(vk, 1e-3); float edge = smoothstep(0.465, 0.5, s); float foot = pow(vk, 22.);
  vec3 c = vec3(0.32, 1.25, 0.7); gl_FragColor = vec4(c * uA * (0.004 + 0.30 * edge + 0.7 * foot) * (0.25 + 0.75 * vk), 1.); }`,
  uniforms: { uA: { value: 1 } } });
function beamGeo(apex, c, h, lat, n = 24) {
  const pos = [], k = [], u = [], idx = [];
  pos.push(apex.x, apex.y, apex.z); k.push(0); u.push(0);
  for (let i = 0; i <= n; i++) { const p = llv(c - h + 2 * h * i / n, lat, 0.5); pos.push(p.x, p.y, p.z); k.push(1); u.push(i / n); }
  for (let i = 0; i < n; i++) idx.push(0, i + 1, i + 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('k', new THREE.Float32BufferAttribute(k, 1)); g.setAttribute('u', new THREE.Float32BufferAttribute(u, 1)); g.setIndex(idx); return g;
}
const keyO = new THREE.DirectionalLight('#9fb6d8', 1.1), rimO = new THREE.DirectionalLight('#2fd0c8', 2.2), warmO = new THREE.DirectionalLight('#ff9a52', 1.6);
ORBIT.add(keyO, keyO.target, rimO, rimO.target, warmO, warmO.target, new THREE.AmbientLight('#20304a', 0.35));
ORBIT.environment = ENV; ORBIT.environmentIntensity = 0.35;
const camO = new THREE.PerspectiveCamera(40, W / H, 1, 60000);
const SUN = llv(-10, 40, 0).normalize().multiplyScalar(-1).add(llv(25, 75, 0).normalize()).normalize();   // just below the far horizon: a warm rim on the limb

function orbitAt(t, lt) {
  earthU.uTime.value = t; earthU.uSun.value.copy(SUN);
  // the strips grow as their satellites fly north
  const grow = (lt ?? 0) * 0.35;
  STRIPS.forEach((s, i) => { const f = Math.min(69.6, s.front + grow); stripU.value[i].set(s.c, s.h, f, s.start);
    const X = SATS[i]; const lonS = s.c - 2.6, alt = 560;
    placeLocal(X.G, lonS, f, alt, 0); const dist = X.G.position.distanceTo(camO.position); X.G.scale.setScalar(Math.max(1, dist * 0.0034));
    X.G.updateMatrixWorld(true);
    const apex = new THREE.Vector3(0, -0.5, 0).applyMatrix4(X.G.matrixWorld);
    if (X.beam) { X.beam.geometry.dispose(); ORBIT.remove(X.beam); }
    X.beam = new THREE.Mesh(beamGeo(apex, s.c, s.h, f), beamMat); X.beam.renderOrder = 3; ORBIT.add(X.beam); X.glow.position.copy(apex); });
}

// ================================================================== SCENE 1 · DESK (Otaniemi, 2012)
const DESK = new THREE.Scene(); DESK.background = C3('#04070c'); DESK.environment = ENV; DESK.environmentIntensity = 0.12;
const woodTex = canvasTex(1024, 512, (g, w, h) => { const R = rng(41); g.fillStyle = '#9c7a52'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { const y = R() * h, a = 0.05 + R() * 0.12; g.strokeStyle = R() < 0.5 ? `rgba(30,16,8,${a})` : `rgba(140,96,58,${a})`; g.lineWidth = 0.6 + R() * 2.4;
    g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + (R() - 0.5) * 1.5); g.stroke(); } });
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
const wallTex = canvasTex(512, 512, (g, w, h) => { const R = rng(9); g.fillStyle = '#20262e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '80,90,100'},${R() * 0.06})`; g.fillRect(R() * w, R() * h, 2, 2); } });
// the view out of the window: Otaniemi in the snow at night, brick blocks with a few lit windows
const viewTex = canvasTex(1024, 768, (g, w, h) => { const R = rng(17);
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#060b18'); sky.addColorStop(0.55, '#16243c'); sky.addColorStop(1, '#2a3550'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(220,230,255,${R() * 0.5})`; g.fillRect(R() * w, R() * h * 0.45, 1.5, 1.5); }
  const blocks = [[0, 430, 300, 338], [260, 470, 280, 298], [520, 400, 220, 368], [720, 455, 330, 313]];
  for (const [x, y, bw, bh] of blocks) { g.fillStyle = '#1a1414'; g.fillRect(x, y, bw, bh); g.fillStyle = '#d8dde6'; g.fillRect(x, y - 7, bw, 9);
    for (let wx = x + 14; wx < x + bw - 20; wx += 34) for (let wy = y + 22; wy < y + bh - 30; wy += 44) { const lit = R() < 0.18; g.fillStyle = lit ? '#ffc477' : '#0b0d14'; g.fillRect(wx, wy, 18, 24); } }
  g.fillStyle = '#c9d2e0'; g.fillRect(0, 700, w, 68);
  for (const [x] of [[180], [640]]) { g.fillStyle = '#0c0f16'; g.fillRect(x, 520, 6, 190); const gr = g.createRadialGradient(x + 3, 520, 0, x + 3, 520, 70); gr.addColorStop(0, 'rgba(255,200,130,.9)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x + 3, 520, 70, 0, TAU); g.fill(); }
  for (let i = 0; i < 700; i++) { const r = R() * 2.4 + 0.5; g.fillStyle = `rgba(235,240,255,${0.35 + R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h, r, 0, TAU); g.fill(); } });
// the notebook: a student's sketch (an invented prop)
const noteTex = canvasTex(1024, 720, (g, w, h) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h); g.fillStyle = '#d9d2bf'; g.fillRect(w / 2 - 3, 0, 6, h);
  g.strokeStyle = 'rgba(120,150,190,.35)'; g.lineWidth = 1.2; for (let y = 60; y < h; y += 34) { g.beginPath(); g.moveTo(20, y); g.lineTo(w - 20, y); g.stroke(); }
  g.strokeStyle = '#3b3a3c'; g.fillStyle = '#3b3a3c'; g.lineWidth = 3; g.lineCap = 'round';
  // left page: the satellite, the beam, the clouds, the ground
  g.strokeRect(150, 120, 90, 60); g.beginPath(); g.moveTo(110, 200); g.lineTo(290, 200); g.stroke(); g.strokeRect(105, 196, 190, 12);
  g.beginPath(); g.moveTo(200, 210); g.lineTo(90, 560); g.moveTo(200, 210); g.lineTo(330, 560); g.stroke();
  g.setLineDash([10, 8]); g.beginPath(); g.moveTo(140, 400); g.bezierCurveTo(170, 370, 200, 430, 240, 395); g.bezierCurveTo(260, 380, 280, 420, 300, 400); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.moveTo(40, 580); g.bezierCurveTo(160, 560, 260, 600, 420, 575); g.stroke();
  g.font = '600 40px Caveat-600'; g.fillText('clouds?', 330, 400); g.fillText('night?', 340, 470); g.fillText('SAR', 290, 160);
  g.font = '600 46px Caveat-600'; g.fillText('< 100 kg ??', 40, 670);
  // right page: sums
  g.font = '600 38px Caveat-600'; const L = ['range res. = c / 2B', 'B = 300 MHz → 0.5 m', 'antenna 3.2 m', 'power ← solar', 'downlink: ?', 'launch: rideshare?'];
  L.forEach((s, i) => g.fillText(s, 560, 130 + i * 68)); g.beginPath(); g.ellipse(700, 540, 120, 36, -0.06, 0, TAU); g.stroke(); });
const termTex = canvasTex(640, 400, (g, w, h) => { g.fillStyle = '#020604'; g.fillRect(0, 0, w, h); g.font = '600 22px RobotoCondensed'; g.fillStyle = '#58ff9c';
  const L = ['>> sar_sim.m', 'range-doppler ... ok', 'azimuth compression ... ok', 'mass budget: 96.4 kg', 'image: 512 x 512', '>> _'];
  L.forEach((s, i) => g.fillText(s, 24, 46 + i * 34)); for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y, w, 1); } });
const D = {};
{
  const wood = std('#ffffff', { map: woodTex, roughness: 0.55, color: new THREE.Color(1.55, 1.4, 1.2) });
  mesh(new THREE.BoxGeometry(180, 4, 90), wood, { pos: [0, -2, 0], parent: DESK });
  const wall = std('#ffffff', { map: wallTex, roughness: 0.95 });
  // back wall with a window hole: four panels around a 96×74 opening
  const WY = 62, WX = -12, WW = 96, WH = 74, WZ = -48;
  mesh(new THREE.BoxGeometry(260, 200, 4), wall, { pos: [0, WY + WH / 2 + 100, WZ], parent: DESK });
  mesh(new THREE.BoxGeometry(260, 100, 4), wall, { pos: [0, WY - WH / 2 - 50, WZ], parent: DESK });
  mesh(new THREE.BoxGeometry(120, WH, 4), wall, { pos: [WX - WW / 2 - 60, WY, WZ], parent: DESK });
  mesh(new THREE.BoxGeometry(120, WH, 4), wall, { pos: [WX + WW / 2 + 60, WY, WZ], parent: DESK });
  const frameM = std('#e9e6df', { roughness: 0.5 });
  for (const [x, y, w, h] of [[WX, WY + WH / 2, WW + 6, 5], [WX, WY - WH / 2, WW + 6, 7], [WX - WW / 2, WY, 5, WH], [WX + WW / 2, WY, 5, WH], [WX, WY, 3, WH], [WX, WY + 8, WW, 3]])
    mesh(new THREE.BoxGeometry(w, h, 6), frameM, { pos: [x, y, WZ + 1], parent: DESK });
  mesh(new THREE.BoxGeometry(WW + 14, 3, 14), frameM, { pos: [WX, WY - WH / 2 - 3, WZ + 6], parent: DESK });
  mesh(new THREE.PlaneGeometry(300, 225), new THREE.MeshBasicMaterial({ map: viewTex, color: new THREE.Color(0.9, 0.95, 1.1) }), { pos: [WX, WY + 10, WZ - 70], parent: DESK, cast: false, recv: false });
  // the lamp: base, two arms, a dark green shade, a warm bulb
  const lampM = std('#1f3a2c', { metalness: 0.6, roughness: 0.35 }), chrome = std('#c8ccd2', { metalness: 1, roughness: 0.2 });
  const LB = new THREE.Group(); DESK.add(LB); LB.position.set(-40, 0, -22); LB.rotation.y = Math.PI;
  mesh(new THREE.CylinderGeometry(9, 10, 2.4, 32), lampM, { pos: [0, 1.2, 0], parent: LB });
  mesh(new THREE.CylinderGeometry(0.8, 0.8, 36, 12), chrome, { pos: [-4, 18, 0], rot: [0, 0, 0.3], parent: LB });
  mesh(new THREE.CylinderGeometry(0.8, 0.8, 34, 12), chrome, { pos: [-16, 39, 4], rot: [0.2, 0, -1.05], parent: LB });
  const shade = mesh(new THREE.ConeGeometry(9, 14, 32, 1, true), std('#1f3a2c', { metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide }), { pos: [-30, 44, 6], rot: [0.25, 0, -0.55], parent: LB });
  mesh(new THREE.SphereGeometry(3.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.1, 2.0) }), { pos: [-28, 40, 7], parent: LB, cast: false });
  D.shade = shade;
  // the model satellite on a little stand
  const STAND = new THREE.Group(); DESK.add(STAND); STAND.position.set(-6, 0, 4);
  mesh(new THREE.CylinderGeometry(5, 6, 1.4, 32), std('#151515', { roughness: 0.4 }), { pos: [0, 0.7, 0], parent: STAND });
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 16, 8), chrome, { pos: [0, 8, 0], parent: STAND });
  const MOD = new THREE.Group(); STAND.add(MOD); MOD.position.set(0, 20, 0); MOD.rotation.set(-0.55, 0.5, 0.22); MOD.scale.setScalar(7.2); makeSat(MOD); D.model = MOD;
  // the notebook, the laptop, a mug, pencils, a circuit board
  const nb = mesh(new THREE.BoxGeometry(48, 1.2, 34), [std('#efe9da'), std('#efe9da'), std('#ffffff', { map: noteTex, roughness: 0.9 }), std('#efe9da'), std('#efe9da'), std('#efe9da')], { pos: [-30, 0.6, 26], rot: [0, 0.22, 0], parent: DESK });
  const LT = new THREE.Group(); DESK.add(LT); LT.position.set(46, 0, -16); LT.rotation.y = -0.55;
  mesh(rbox(40, 1.6, 28, 0.6), std('#2b2d31', { metalness: 0.4, roughness: 0.4 }), { pos: [0, 0.8, 0], parent: LT });
  const scr = new THREE.Group(); LT.add(scr); scr.position.set(0, 1.6, -14); scr.rotation.x = -0.32;
  mesh(rbox(40, 27, 1.2, 0.6), std('#2b2d31', { metalness: 0.4, roughness: 0.4 }), { pos: [0, 13.5, 0], parent: scr });
  mesh(new THREE.PlaneGeometry(36, 23), new THREE.MeshBasicMaterial({ map: termTex, color: new THREE.Color(1.3, 1.3, 1.3) }), { pos: [0, 13.6, 0.65], parent: scr, cast: false });
  const mug = new THREE.Group(); DESK.add(mug); mug.position.set(30, 0, 22);
  mesh(new THREE.CylinderGeometry(4.2, 3.9, 10, 32, 1, true), phys('#d9d6cf', { side: THREE.DoubleSide }), { pos: [0, 5, 0], parent: mug });
  mesh(new THREE.CircleGeometry(4.0, 32), std('#1c120b', { roughness: 0.1 }), { pos: [0, 8.2, 0], rot: [-Math.PI / 2, 0, 0], parent: mug });
  mesh(new THREE.TorusGeometry(2.6, 0.7, 10, 24), phys('#d9d6cf'), { pos: [4.6, 5, 0], rot: [0, 0, 0], parent: mug });
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(0.45, 0.45, 17, 6), std(['#e2b33c', '#2f5d8a', '#b8382d'][i], { roughness: 0.5 }), { pos: [4 + i * 2.2, 0.5, 38], rot: [Math.PI / 2, 0, 1.2 + i * 0.12], parent: DESK });
  const pcb = canvasTex(256, 192, (g, w, h) => { const R = rng(5); g.fillStyle = '#0f4a2a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d6b45a'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (R() < 0.5) x += (R() - 0.5) * 90; else y += (R() - 0.5) * 70; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 6; i++) { g.fillStyle = '#111'; g.fillRect(20 + R() * 190, 20 + R() * 130, 30 + R() * 20, 18); } });
  mesh(new THREE.BoxGeometry(22, 0.6, 16), [std('#0f4a2a'), std('#0f4a2a'), std('#ffffff', { map: pcb }), std('#0f4a2a'), std('#0f4a2a'), std('#0f4a2a')], { pos: [22, 0.3, -6], rot: [0, -0.4, 0], parent: DESK });
  // light: the lamp is the key; the window throws cold blue; a faint green from the terminal
  const lamp = new THREE.SpotLight('#ffc884', 5200, 260, 0.75, 0.55, 2); lamp.position.set(-12, 40, -14); lamp.target.position.set(-6, 10, 6);
  lamp.castShadow = true; lamp.shadow.mapSize.set(2048, 2048); lamp.shadow.bias = -0.0004; lamp.shadow.radius = 6; DESK.add(lamp, lamp.target);
  const moon = new THREE.DirectionalLight('#6f8fd0', 0.7); moon.position.set(-30, 90, -200); moon.target.position.set(0, 0, 10); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 10, far: 500 }); DESK.add(moon, moon.target);
  const term = new THREE.PointLight('#5cff9e', 120, 90, 2); term.position.set(40, 16, -4); DESK.add(term);
  DESK.add(new THREE.HemisphereLight('#2a3a58', '#120c08', 0.25));
}
const snowTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const SNOW = (() => { const n = 700, R = rng(77), base = []; for (let i = 0; i < n; i++) base.push([R() * 150 - 88, R(), R() * 62 - 114, 0.5 + R() * 0.8, R() * TAU]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ map: snowTex, size: 1.7, transparent: true, depthWrite: false, color: new THREE.Color(0.7, 0.78, 0.95) })); DESK.add(p); return { p, base }; })();
function snowAt(t) { const a = SNOW.p.geometry.attributes.position;
  SNOW.base.forEach(([x, y0, z, sp, ph], i) => a.setXYZ(i, x + Math.sin(t * 1.3 + ph) * 2.2, 140 - ((y0 * 125 + t * 10 * sp) % 125), z)); a.needsUpdate = true; }
const camD = new THREE.PerspectiveCamera(30, W / H, 1, 2000);

// ================================================================== SCENE 6 · THE BABY MONITOR
const ROOM = new THREE.Scene(); ROOM.background = C3('#03060b'); ROOM.environment = ENV; ROOM.environmentIntensity = 0.1;
// a radar map of Finland in 2D, for the monitor's screen and the war-room table: speckled land, black water, the border dashed
function mapBase(w, h, Vw, { zoom = 1, oy = 0.5, seed = 23, scan = true } = {}) {
  const latC = (Vw.lat0 + Vw.lat1) / 2, cl = Math.cos(latC * DEG), lc = (Vw.lon0 + Vw.lon1) / 2;
  const s = Math.min(w / ((Vw.lon1 - Vw.lon0) * cl), h / (Vw.lat1 - Vw.lat0)) * zoom, cx = w / 2, cy = h * oy;
  const pr = ([lon, lat]) => [cx + (lon - lc) * cl * s, cy - (lat - latC) * s];
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, w, h); mg.fillStyle = '#f00'; rings(mg, GEO.land, pr, 'fill'); mg.fillStyle = '#000'; rings(mg, GEO.lakes, pr, 'fill');
  const md = mg.getImageData(0, 0, w, h).data, img = g.createImageData(w, h), R = rng(seed);
  // a value-noise field for the ground's texture (forest, field, bog), then speckle on top
  const NG = 64, grid = Float32Array.from({ length: (NG + 1) * (NG + 1) }, R), vn = (x, y) => { const xi = Math.floor(x) % NG, yi = Math.floor(y) % NG, fx = x - Math.floor(x), fy = y - Math.floor(y);
    const a = grid[yi * (NG + 1) + xi], b = grid[yi * (NG + 1) + xi + 1], c = grid[(yi + 1) * (NG + 1) + xi], d = grid[(yi + 1) * (NG + 1) + xi + 1], ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(a, b, ux), lerp(c, d, ux), uy); };
  const f = w / 960, fb = (x, y) => vn(x / (60 * f), y / (60 * f)) * 0.5 + vn(x / (24 * f) + 7, y / (24 * f) + 3) * 0.3 + vn(x / (9 * f) + 13, y / (9 * f) + 5) * 0.2;
  for (let i = 0; i < w * h; i++) { const land = md[i * 4] > 128, sp = R(), x = i % w, y = (i / w) | 0;
    const tx = fb(x, y), v = land ? Math.min(1, 0.16 + 1.25 * tx * tx * (0.45 + 0.9 * sp)) : 0.03 * sp; const sl = scan && (y % 3 === 0) ? 0.7 : 1;
    img.data[i * 4] = 40 * v * sl; img.data[i * 4 + 1] = 255 * v * sl; img.data[i * 4 + 2] = 130 * v * sl; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(150,255,190,.9)'; g.lineWidth = 1.6 * f; rings(g, GEO.land, pr, 'stroke'); g.lineWidth = 1 * f; g.strokeStyle = 'rgba(150,255,190,.5)'; rings(g, GEO.lakes, pr, 'stroke');
  g.strokeStyle = 'rgba(255,170,70,.95)'; g.lineWidth = 2.2 * f; g.setLineDash([7 * f, 5 * f]); rings(g, GEO.finRus, pr, 'stroke'); g.setLineDash([]);
  return { canvas: c, pr };
}
// the monitor's screen: the radar map of Finland, as a baby monitor would show its nursery
const SCRBASE = mapBase(960, 720, { lon0: 18.6, lon1: 33.6, lat0: 59.2, lat1: 70.4 }, { zoom: 0.92, oy: 0.56 });
function drawScreen(g, w, h, motion = 1) {
  g.drawImage(SCRBASE.canvas, 0, 0); const pr = SCRBASE.pr;
  // HUD: a baby monitor's, word for word
  g.font = '700 34px RobotoCondensed'; g.fillStyle = '#d8ffe6'; g.textBaseline = 'top'; g.fillText(UI.monCam, 28, 24);
  g.textAlign = 'right'; g.fillText('22:47', w - 120, 24); g.textAlign = 'left';
  g.strokeStyle = '#d8ffe6'; g.lineWidth = 3; g.strokeRect(w - 96, 28, 62, 28); g.fillStyle = '#d8ffe6'; g.fillRect(w - 33, 36, 6, 12); g.fillRect(w - 92, 32, 40, 20);
  for (let i = 0; i < 4; i++) g.fillRect(w - 230 + i * 14, 56 - i * 8 - 8, 9, 8 + i * 8);
  g.font = '700 34px RobotoCondensed'; g.textBaseline = 'alphabetic'; g.fillText(UI.monTemp, 28, h - 28);
  g.font = '700 46px Inter'; g.textAlign = 'right'; g.fillText('♪', w - 30, h - 24); g.textAlign = 'left';
  // the moon icon
  g.beginPath(); g.arc(w - 112, h - 46, 18, 0, TAU); g.fill(); g.fillStyle = '#020604'; g.beginPath(); g.arc(w - 104, h - 52, 16, 0, TAU); g.fill();
  if (motion > 0) { const tx = 'MOTION DETECTED'; g.font = '800 40px RobotoCondensed'; const tw = g.measureText(UI.monMotion || tx).width;
    g.globalAlpha = motion; g.fillStyle = 'rgba(255,92,60,.95)'; g.beginPath(); g.roundRect(w / 2 - tw / 2 - 52, 84, tw + 84, 62, 31); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2 - tw / 2 - 22, 115, 11, 0, TAU); g.fill(); g.fillText(UI.monMotion, w / 2 - tw / 2 + 2, 130); g.globalAlpha = 1;
    // a motion box, as the monitor draws one: in the east, at the border
    const [bx, by] = pr([30.4, 63.4]); g.strokeStyle = 'rgba(255,92,60,.95)'; g.lineWidth = 5; g.strokeRect(bx - 58, by - 52, 116, 104); }
  for (let y = 0; y < h; y += 4) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 1.5); }
}
const scrOn = canvasTex(960, 720, (g, w, h) => drawScreen(g, w, h, 1)), scrOff = canvasTex(960, 720, (g, w, h) => drawScreen(g, w, h, 0)), scrTex = scrOn;
// the night outside: Helsinki roofs under snow, stars, and one moving star
const nightTex = canvasTex(1400, 900, (g, w, h) => { const R = rng(31);
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#02050d'); sky.addColorStop(0.6, '#0b1630'); sky.addColorStop(1, '#1c2644'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const b = Math.pow(R(), 3); g.fillStyle = `rgba(230,236,255,${0.2 + b * 0.8})`; g.fillRect(R() * w, R() * h * 0.6, 1 + b * 2, 1 + b * 2); }
  // roofs: a row of 1900s blocks, chimneys, snow on every ledge, a few lit windows; a dome on the skyline
  g.fillStyle = '#0a0d16'; g.beginPath(); g.ellipse(1080, 560, 70, 64, 0, Math.PI, 0); g.fill(); g.fillRect(1010, 556, 140, 200); g.fillRect(1074, 470, 12, 34);
  g.fillStyle = '#c7d0e2'; g.beginPath(); g.ellipse(1080, 560, 70, 64, 0, Math.PI, Math.PI * 1.5); g.lineTo(1080, 500); g.fill();
  let x = -20; while (x < w) { const bw = 120 + R() * 160, top = 600 + R() * 120; g.fillStyle = '#0d1019'; g.fillRect(x, top, bw, h - top);
    g.fillStyle = '#d4dbea'; g.fillRect(x - 4, top - 6, bw + 8, 9);
    for (let c = 0; c < 2; c++) { const cxp = x + 20 + R() * (bw - 50); g.fillStyle = '#0d1019'; g.fillRect(cxp, top - 34, 18, 34); g.fillStyle = '#d4dbea'; g.fillRect(cxp - 3, top - 38, 24, 6); }
    for (let wx = x + 12; wx < x + bw - 22; wx += 30) for (let wy = top + 22; wy < h; wy += 46) { g.fillStyle = R() < 0.12 ? '#ffbd6a' : '#06080e'; g.fillRect(wx, wy, 16, 24); }
    x += bw + 4; }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(235,240,255,${0.2 + R() * 0.5})`; g.beginPath(); g.arc(R() * w, R() * h, R() * 1.8 + 0.4, 0, TAU); g.fill(); } });
const RM = {};
{
  const wood = std('#ffffff', { map: woodTex, roughness: 0.5, color: new THREE.Color(0.8, 0.7, 0.62) });
  mesh(new THREE.BoxGeometry(70, 3, 46), wood, { pos: [0, -1.5, 0], parent: ROOM });
  mesh(new THREE.BoxGeometry(66, 30, 42), std('#2a2421', { roughness: 0.7 }), { pos: [0, -18, 0], parent: ROOM });
  const wall = std('#ffffff', { map: wallTex, roughness: 0.95, color: new THREE.Color(0.75, 0.8, 0.95) });
  const WZ = -80, WY = 60, WW = 110, WH = 120;
  mesh(new THREE.BoxGeometry(400, 200, 4), wall, { pos: [0, WY + WH / 2 + 100, WZ], parent: ROOM });
  mesh(new THREE.BoxGeometry(400, 100, 4), wall, { pos: [0, WY - WH / 2 - 50, WZ], parent: ROOM });
  mesh(new THREE.BoxGeometry(150, WH, 4), wall, { pos: [-WW / 2 - 75, WY, WZ], parent: ROOM });
  mesh(new THREE.BoxGeometry(150, WH, 4), wall, { pos: [WW / 2 + 75, WY, WZ], parent: ROOM });
  const frameM = std('#dfe3ea', { roughness: 0.5 });
  for (const [x, y, w, h] of [[0, WY + WH / 2, WW + 6, 5], [0, WY - WH / 2, WW + 6, 6], [-WW / 2, WY, 5, WH], [WW / 2, WY, 5, WH], [0, WY, 4, WH], [0, WY + 20, WW, 3.5]])
    mesh(new THREE.BoxGeometry(w, h, 6), frameM, { pos: [x, y, WZ + 1], parent: ROOM });
  mesh(new THREE.PlaneGeometry(420, 270), new THREE.MeshBasicMaterial({ map: nightTex, color: new THREE.Color(1.0, 1.0, 1.1) }), { pos: [0, WY + 62, WZ - 90], parent: ROOM, cast: false, recv: false });
  // curtains
  const cur = std('#1b2440', { roughness: 0.95, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) { const g = new THREE.PlaneGeometry(40, 150, 24, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 0.45) * 3); g.computeVertexNormals();
    mesh(g, cur, { pos: [sx * (WW / 2 + 12), WY - 2, WZ + 10], parent: ROOM }); }
  // a cot's rails at the right edge, out of focus
  const rail = std('#efece6', { roughness: 0.5 });
  for (let i = 0; i < 9; i++) mesh(new THREE.CylinderGeometry(0.9, 0.9, 70, 10), rail, { pos: [58 + i * 7, 10, -26 - i * 0.6], parent: ROOM });
  mesh(new THREE.BoxGeometry(70, 3.4, 3.4), rail, { pos: [86, 44, -29], parent: ROOM });
  // the monitor: a white handset with a screen and a stub antenna, leaning back on its foot
  const MON = new THREE.Group(); ROOM.add(MON); MON.position.set(-2, 0, 4); MON.rotation.set(-0.2, 0.18, 0);
  const shell = phys('#f1efe9', { roughness: 0.32 });
  mesh(rbox(15.5, 12.5, 2.6, 1.2, 4), shell, { pos: [0, 10.5, 0], parent: MON });
  mesh(rbox(15.5, 6.4, 3.0, 1.2, 4), shell, { pos: [0, 3.3, 0.2], parent: MON });
  RM.screen = mesh(new THREE.PlaneGeometry(12.0, 9.0), new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(2.1, 2.1, 2.1) }), { pos: [0, 11.6, 1.32], parent: MON, cast: false });
  mesh(rbox(12.8, 9.8, 0.2, 0.4), std('#0b0d10', { roughness: 0.2 }), { pos: [0, 11.6, 1.12], parent: MON, cast: false });
  for (let i = 0; i < 3; i++) mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.6, 20), std(i === 1 ? '#7fd0a4' : '#c9c6bf', { roughness: 0.4 }), { pos: [-4 + i * 4, 3.3, 1.75], rot: [Math.PI / 2, 0, 0], parent: MON });
  mesh(new THREE.CylinderGeometry(0.55, 0.7, 6, 12), shell, { pos: [5.6, 19.0, -0.3], parent: MON });
  mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.1, 0.6) }), { pos: [-6.4, 5.6, 1.72], parent: MON, cast: false });
  RM.mon = MON;
  // the moving star in the window: a satellite crossing the sky
  RM.sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: glintTex, color: new THREE.Color(1.1, 1.5, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  RM.sat.scale.setScalar(7); RM.sat.position.set(-60, 100, -168); ROOM.add(RM.sat);
  // a glass of water and a moon night-light
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe6ff', roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.28, clearcoat: 1 });
  mesh(new THREE.CylinderGeometry(3.2, 2.8, 10, 32, 1, true), glass, { pos: [-20, 5, -6], parent: ROOM, cast: false });
  const NL = mesh(new THREE.SphereGeometry(4.2, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.68, 0.42) }), { pos: [36, 4.2, -16], parent: ROOM, cast: false });
  // light: the screen's green, the window's blue, the night-light's amber
  const glow = new THREE.PointLight('#57ffa0', 70, 60, 2); glow.position.set(-1, 13, 16); ROOM.add(glow);
  const moon = new THREE.DirectionalLight('#7b96d6', 0.9); moon.position.set(30, 120, -260); moon.target.position.set(0, 0, 0); moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 10, far: 500 }); ROOM.add(moon, moon.target);
  const nl = new THREE.PointLight('#ffb36a', 90, 60, 2); nl.position.set(22, 6, -6); ROOM.add(nl);
  ROOM.add(new THREE.HemisphereLight('#22304c', '#0c0806', 0.3));
}
const camR = new THREE.PerspectiveCamera(30, W / H, 1, 2000);

// ================================================================== SCENES 4–5 · THE WAR ROOM
// A plotting table lit from inside by the radar map, a hanging lamp, three clocks, a red phone. The grant arrives as an
// envelope, the state's satellite as the student's own model on its stand, and the requirements as a redacted sheet.
const WAR = new THREE.Scene(); WAR.background = C3('#020406'); WAR.environment = ENV; WAR.environmentIntensity = 0.16;
const WMAPV = { lon0: 14.5, lon1: 38.5, lat0: 58.6, lat1: 70.6 }, TW = 156, TD = 117;
const WMAP = mapBase(2048, 1536, WMAPV, { seed: 41, scan: false });
const warMapTex = canvasTex(2048, 1536, (g, w, h) => { g.drawImage(WMAP.canvas, 0, 0); const pr = WMAP.pr;
  g.strokeStyle = 'rgba(120,255,180,.16)'; g.lineWidth = 1.5;
  for (let lon = 8; lon <= 44; lon++) { g.beginPath(); for (let lat = 56; lat <= 72; lat += 0.5) { const [x, y] = pr([lon, lat]); lat === 56 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  for (let lat = 56; lat <= 72; lat++) { g.beginPath(); const [x0, y0] = pr([8, lat]), [x1, y1] = pr([44, lat]); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.font = '700 30px RobotoCondensed'; g.textBaseline = 'middle';
  for (const [name, lon, lat, sz] of CITIES) { if (lon < WMAPV.lon0 + 1 || lon > WMAPV.lon1 - 1 || lat < WMAPV.lat0 + 0.3 || lat > WMAPV.lat1 - 0.3 || sz < 0.3) continue; const [x, y] = pr([lon, lat]);
    g.fillStyle = 'rgba(255,190,110,.95)'; g.beginPath(); g.arc(x, y, 6 + sz * 4, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,255,220,.8)'; g.fillText(name, x + 16, y); }
  const [hx, hy] = pr([24.94, 60.17]); g.strokeStyle = 'rgba(120,255,180,.32)'; g.lineWidth = 2; g.setLineDash([12, 10]); for (let r = 1; r <= 4; r++) { g.beginPath(); g.arc(hx, hy, r * 130, 0, TAU); g.stroke(); } g.setLineDash([]); });
const onTable = (lon, lat) => { const [x, y] = WMAP.pr([lon, lat]); return [(x / 2048 - 0.5) * TW, (y / 1536 - 0.5) * TD]; };
const clockTex = (name, hh, mm) => canvasTex(256, 320, (g, w) => { g.fillStyle = '#0c0f12'; g.fillRect(0, 0, 256, 320);
  g.fillStyle = '#e9e4d6'; g.beginPath(); g.arc(128, 128, 112, 0, TAU); g.fill(); g.strokeStyle = '#222'; g.lineWidth = 6; g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.lineWidth = i % 3 ? 3 : 7; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); g.stroke(); }
  const ah = ((hh % 12) + mm / 60) / 12 * TAU, am = mm / 60 * TAU; g.lineCap = 'round';
  g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(ah) * 56, 128 - Math.cos(ah) * 56); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(am) * 86, 128 - Math.cos(am) * 86); g.stroke();
  g.fillStyle = '#b8382d'; g.beginPath(); g.arc(128, 128, 7, 0, TAU); g.fill();
  g.fillStyle = '#d9d4c4'; g.font = '700 40px RobotoCondensed'; g.textAlign = 'center'; g.fillText(name, 128, 296); });
const envTex = canvasTex(680, 480, (g, w, h) => { g.fillStyle = '#d8b878'; g.fillRect(0, 0, w, h); const R = rng(9);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '120,90,40' : '250,230,180'},${R() * 0.08})`; g.fillRect(R() * w, R() * h, 3, 3); }
  g.fillStyle = '#f3ecd8'; g.fillRect(150, 150, 380, 180); g.fillStyle = '#1d1b19'; g.textAlign = 'center';
  g.font = '700 34px RobotoCondensed'; g.fillText(UI.envFrom, w / 2, 200); g.font = '800 64px RobotoCondensed'; g.fillText(UI.envAmt, w / 2, 268); g.font = '600 28px RobotoCondensed'; g.fillText(UI.envSub, w / 2, 310); });
const tagTex = canvasTex(400, 200, (g, w, h) => { g.fillStyle = '#efe6cf'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7a6a4a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = '#1d1b19'; g.font = '800 46px RobotoCondensed'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(UI.govTag, w / 2, h / 2 + 4);
  g.fillStyle = '#5b4d36'; g.beginPath(); g.arc(36, h / 2, 12, 0, TAU); g.fill(); });
const sheetTex = canvasTex(600, 800, (g, w, h) => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, w, h); const R = rng(13);
  g.fillStyle = '#1d1b19'; g.font = '800 40px RobotoCondensed'; g.fillText(UI.specHead, 40, 80); g.font = '600 26px RobotoCondensed'; g.fillText(UI.specSub, 40, 120);
  g.fillRect(40, 140, w - 80, 3);
  UI.specRows.split('|').forEach((row, i) => { const y = 200 + i * 96; g.font = '700 26px RobotoCondensed'; g.fillStyle = '#1d1b19'; g.fillText(`${i + 1}. ${row}`, 40, y);
    for (let k = 0; k < 2; k++) { g.fillStyle = '#0b0b0c'; g.fillRect(64, y + 16 + k * 30, 120 + R() * 360, 20); } });
  g.font = '600 22px RobotoCondensed'; g.fillStyle = '#5a5650'; g.fillText(UI.specFoot, 40, h - 40); });
const inkTex = canvasTex(640, 220, (g, w, h) => { const R = rng(21); g.strokeStyle = '#c4231c'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#c4231c'; g.font = '800 128px Anton-400'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(UI.stamp, w / 2, h / 2 + 6);
  g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + R() * 0.7})`; g.fillRect(R() * w, R() * h, 1 + R() * 4, 1 + R() * 3); } });
const WR = {};
{
  const steel = std('#1a1e22', { metalness: 0.7, roughness: 0.4 });
  mesh(new THREE.BoxGeometry(TW + 12, 8, TD + 12), steel, { pos: [0, -4.1, 0], parent: WAR });
  mesh(new THREE.PlaneGeometry(TW, TD), new THREE.MeshBasicMaterial({ map: warMapTex, color: new THREE.Color(0.52, 0.52, 0.52) }), { pos: [0, 0.03, 0], rot: [-Math.PI / 2, 0, 0], parent: WAR, cast: false, recv: false });
  const sh = mesh(new THREE.PlaneGeometry(TW, TD), new THREE.ShadowMaterial({ opacity: 0.55 }), { pos: [0, 0.08, 0], rot: [-Math.PI / 2, 0, 0], parent: WAR, cast: false }); sh.receiveShadow = true;
  mesh(new THREE.BoxGeometry(400, 4, 400), std('#0b0d10', { roughness: 0.9 }), { pos: [0, -60, 0], parent: WAR });
  const wall = std('#ffffff', { map: wallTex, roughness: 0.95, color: new THREE.Color(0.55, 0.62, 0.6) });
  mesh(new THREE.BoxGeometry(420, 260, 4), wall, { pos: [0, 70, -110], parent: WAR });
  [['HELSINKI', 22, 47], ['MOSCOW', 23, 47], ['WASHINGTON', 15, 47]].forEach(([n, hh, mm], i) => {
    const C = new THREE.Group(); WAR.add(C); C.position.set(-62 + i * 62, 78, -107);
    mesh(new THREE.PlaneGeometry(26, 32.5), new THREE.MeshStandardMaterial({ map: clockTex(n, hh, mm), roughness: 0.6 }), { pos: [0, 0, 0.5], parent: C, cast: false });
    mesh(new THREE.TorusGeometry(11.4, 1.0, 10, 40), std('#2a2e33', { metalness: 0.7, roughness: 0.3 }), { pos: [0, 3.6, 1.0], parent: C }); });
  // the lamp over the table
  const shade = std('#20362a', { metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
  mesh(new THREE.ConeGeometry(16, 12, 40, 1, true), shade, { pos: [4, 92, 4], parent: WAR });
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 80, 6), std('#111'), { pos: [4, 138, 4], parent: WAR });
  mesh(new THREE.SphereGeometry(4.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 3.4, 3.0) }), { pos: [4, 87, 4], parent: WAR, cast: false });
  const key = new THREE.SpotLight('#e4fff0', 26000, 400, 0.62, 0.6, 2); key.position.set(4, 86, 4); key.target.position.set(4, 0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.radius = 5; WAR.add(key, key.target);
  for (const x of [-40, 40]) { const gl = new THREE.PointLight('#48ff96', 110, 140, 2); gl.position.set(x, 4, 10); WAR.add(gl); }
  WAR.add(new THREE.HemisphereLight('#1c2c3a', '#0a120c', 0.35));
  // the red phone, back right
  const ph = new THREE.Group(); WAR.add(ph); ph.position.set(48, 0, -40); ph.rotation.y = -0.4;
  const red = phys('#b3221b', { roughness: 0.28 });
  mesh(rbox(20, 7, 15, 2.2), red, { pos: [0, 3.5, 0], parent: ph });
  mesh(new THREE.CapsuleGeometry(2.4, 13, 6, 12), red, { pos: [0, 9.2, -1], rot: [0, 0, Math.PI / 2], parent: ph });
  mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.6, 32), std('#e6e0d0', { roughness: 0.4 }), { pos: [0, 7.1, 4.5], rot: [0.55, 0, 0], parent: ph });
  // folders, back left
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(30, 1.6, 22), std(i % 2 ? '#c9a868' : '#bf9c5a', { roughness: 0.85 }), { pos: [-52 + i * 0.6, 0.8 + i * 1.6, -38 + i * 0.4], rot: [0, 0.2 - i * 0.05, 0], parent: WAR });
  // the grant
  WR.env = new THREE.Group(); WAR.add(WR.env);
  mesh(new THREE.BoxGeometry(34, 0.8, 24), [std('#cfae6e'), std('#cfae6e'), std('#ffffff', { map: envTex, roughness: 0.85 }), std('#cfae6e'), std('#cfae6e'), std('#cfae6e')], { pos: [0, 0.4, 0], parent: WR.env });
  // the state's satellite: the student's model, on its stand, with a tag
  WR.sat = new THREE.Group(); WAR.add(WR.sat);
  mesh(new THREE.CylinderGeometry(5, 6, 1.4, 32), std('#151515', { roughness: 0.4 }), { pos: [0, 0.7, 0], parent: WR.sat });
  mesh(new THREE.CylinderGeometry(0.4, 0.4, 16, 8), std('#c8ccd2', { metalness: 1, roughness: 0.2 }), { pos: [0, 8, 0], parent: WR.sat });
  const SM = new THREE.Group(); WR.sat.add(SM); SM.position.set(0, 20, 0); SM.rotation.set(-0.55, 0.5, 0.22); SM.scale.setScalar(9); makeSat(SM);
  mesh(new THREE.PlaneGeometry(17, 8.5), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.8, side: THREE.DoubleSide, emissive: new THREE.Color(0.25, 0.25, 0.22), emissiveMap: tagTex }), { pos: [9.5, 6.5, 6.0], rot: [-0.9, 0.0, -0.12], parent: WR.sat });
  // the requirements, the stamp and its ink
  WR.sheet = new THREE.Group(); WAR.add(WR.sheet);
  mesh(new THREE.BoxGeometry(30, 0.25, 40), [std('#f2efe6'), std('#f2efe6'), std('#ffffff', { map: sheetTex, roughness: 0.9 }), std('#f2efe6'), std('#f2efe6'), std('#f2efe6')], { pos: [0, 0.2, 0], parent: WR.sheet });
  WR.ink = mesh(new THREE.PlaneGeometry(26, 9), new THREE.MeshStandardMaterial({ map: inkTex, transparent: true, roughness: 0.7, depthWrite: false }), { pos: [0, 0.4, -4], rot: [-Math.PI / 2, 0, 0.22], parent: WR.sheet, cast: false });
  WR.stamp = new THREE.Group(); WAR.add(WR.stamp);
  mesh(new THREE.BoxGeometry(28, 3, 10), std('#2a2421', { roughness: 0.6 }), { pos: [0, 1.5, 0], parent: WR.stamp });
  mesh(new THREE.BoxGeometry(27, 0.8, 9.2), std('#8b1d17', { roughness: 0.8 }), { pos: [0, 0.4, 0], parent: WR.stamp });
  mesh(new THREE.CylinderGeometry(2.6, 3.4, 12, 20), std('#4a2f1d', { roughness: 0.5 }), { pos: [0, 9, 0], parent: WR.stamp });
  mesh(new THREE.SphereGeometry(4.2, 20, 14), std('#4a2f1d', { roughness: 0.5 }), { pos: [0, 16, 0], parent: WR.stamp });
}
const SATAT = onTable(26.2, 63.6), ENVAT = onTable(21.6, 62.2), SHEETAT = [24, 26];
function warAt(t) {
  // the envelope falls from above the frame onto the gulf on "grants"; a squash and a settle
  { const k = clamp((t - (EV.grant - 0.38)) / 0.38), dt = t - EV.grant; WR.env.visible = t > EV.grant - 0.38;
    WR.env.position.set(ENVAT[0] + (dt > 0 ? Math.min(dt, 0.25) * 6 : 0), dt < 0 ? 70 * (1 - k * k) : 0, ENVAT[1]); WR.env.rotation.set(dt < 0 ? (1 - k) * 0.5 : 0, 0.32 + (dt < 0 ? (1 - k) * 0.6 : 0), 0);
    const sq = dt > 0 ? Math.max(0, Math.sin(dt * 30)) * Math.exp(-dt * 14) * 0.25 : 0; WR.env.scale.set(1 + sq * 0.2, 1 - sq, 1 + sq * 0.2); }
  // the satellite drops onto the map on "buys it": a heavy landing, a bounce, a wobble
  { const k = clamp((t - EV.drop) / (EV.buys - EV.drop)), dt = t - EV.buys; WR.sat.visible = t > EV.drop;
    const y = dt < 0 ? 90 * (1 - k * k) : Math.abs(Math.sin(dt * 14)) * Math.exp(-dt * 9) * 3.5;
    WR.sat.position.set(SATAT[0], y, SATAT[1]); WR.sat.rotation.set(dt > 0 ? Math.sin(dt * 18) * Math.exp(-dt * 6) * 0.06 : 0, -0.3 + (dt < 0 ? (1 - k) * 0.8 : 0), 0); }
  // the requirements slide in from the right; the stamp hangs, SLAMS on "classified", lifts away
  { const k = ease.out((t - EV.sheet) / 0.35); WR.sheet.visible = t > EV.sheet; WR.sheet.position.set(lerp(140, SHEETAT[0], k), 0, SHEETAT[1]); WR.sheet.rotation.y = lerp(0.6, -0.14, k);
    WR.ink.visible = t >= EV.stamp; const ik = clamp((t - EV.stamp) / 0.08); WR.ink.scale.setScalar(lerp(1.15, 1, ik));
    const S0 = EV.stampDown, up = 34; let y;
    if (t < S0) y = up + Math.sin(t * 3) * 0.6; else if (t < EV.stamp) y = lerp(up, 0.5, ((t - S0) / (EV.stamp - S0)) ** 2); else if (t < EV.stamp + 0.14) y = 0.5; else y = lerp(0.5, up + 6, ease.out((t - EV.stamp - 0.14) / 0.4));
    WR.stamp.visible = t > EV.sheet + 0.25; WR.stamp.position.set(SHEETAT[0] + 1.2, y + 0.35, SHEETAT[1] - 4.4); WR.stamp.rotation.y = -0.14 + 0.22; }
}
const camW = new THREE.PerspectiveCamera(34, W / H, 1, 3000);

// ================================================================== overlays and the frame
function tag(g, text, a, y = 1520) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110; g.fillStyle = 'rgba(6,14,12,.86)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.strokeStyle = 'rgba(92,255,160,.55)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#c9ffe0'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}
const _p = new THREE.Vector3();
function hudOrbit(g, cam, a) {   // cold-war plotting marks: corner brackets, a reticle on Helsinki, a few names
  g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(120,255,180,.75)'; g.lineWidth = 3;
  for (const [x, y, sx, sy] of [[60, 120, 1, 1], [W - 60, 120, -1, 1], [60, H - 120, 1, -1], [W - 60, H - 120, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * 60); g.lineTo(x, y); g.lineTo(x + sx * 60, y); g.stroke(); }
  g.font = '600 26px RobotoCondensed'; g.fillStyle = 'rgba(170,255,200,.9)'; g.textBaseline = 'middle';
  for (const [name, lon, lat] of CITIES.filter((c) => ['HELSINKI', 'TAMPERE', 'OULU', 'TURKU', 'KUOPIO', 'TALLINN'].includes(c[0]))) {
    llv(lon, lat, 0, _p).project(cam); if (_p.z > 1) continue; const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H; if (x < 40 || x > W - 40 || y < 140 || y > H - 140) continue;
    if (name === 'HELSINKI') { g.beginPath(); g.arc(x, y, 18, 0, TAU); g.stroke(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { g.beginPath(); g.moveTo(x + dx * 24, y + dy * 24); g.lineTo(x + dx * 40, y + dy * 40); g.stroke(); }
      g.fillText('HELSINKI  60°10′N 24°56′E', x + 48, y); }
    else { g.fillRect(x - 3, y - 3, 6, 6); g.fillText(name, x + 12, y); } }
  g.restore();
}
function scanlines(g, a) { g.save(); g.globalAlpha = a; g.fillStyle = '#000'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.4); g.restore(); }

const SHOTS = [
  { t0: () => T.s1, kind: 'desk' }, { t0: () => T.s2, kind: 'orbit' }, { t0: () => T.s3, kind: 'far' },
  { t0: () => T.s4, kind: 'buys' }, { t0: () => T.s5, kind: 'classified' }, { t0: () => T.s6, kind: 'room' }];
const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].t0()) return i; return 0; };
const SHOT_END = (i) => i + 1 < SHOTS.length ? SHOTS[i + 1].t0() : T.end;
const ORBIT_AT = [27.2, 66.4], ORBIT_ALT = 1150;
function poseOrbit(alt, lon, lat, atLon = ORBIT_AT[0], atLat = ORBIT_AT[1]) {
  camO.position.copy(llv(lon, lat, alt)); _up.copy(camO.position).normalize(); camO.up.copy(_up); camO.lookAt(llv(atLon, atLat, 0));
  camO.fov = 38; camO.updateProjectionMatrix(); camO.updateMatrixWorld(true);
}
function placeHero(t) {   // relative to the camera's steady orbit pose, so the pull-back leaves it behind
  poseOrbit(ORBIT_ALT, 24.0, 56.4);
  const drift = (t - T.s2) * 0.004;
  const dir = new THREE.Vector3(-0.40 + drift, -0.50 + drift * 0.6, 0.5).unproject(camO).sub(camO.position).normalize(); const pos = camO.position.clone().addScaledVector(dir, 30);
  const ll = [Math.atan2(pos.x, pos.z) / DEG, Math.asin(pos.y / pos.length()) / DEG, pos.length() - R_E];
  placeLocal(HERO.G, ll[0], ll[1], ll[2], 0.35); HERO.G.scale.setScalar(2.1); HERO.S.rotation.set(0.22, 0.25, 0.1); HERO.G.updateMatrixWorld(true);
  const apex = new THREE.Vector3(0, -0.5, 0).applyMatrix4(HERO.G.matrixWorld);
  if (HERO.beam) { HERO.beam.geometry.dispose(); ORBIT.remove(HERO.beam); }
  HERO.beam = new THREE.Mesh(beamGeo(apex, ll[0] + 1.2, 0.9, ll[1] + 0.2), beamMat); HERO.beam.renderOrder = 3; ORBIT.add(HERO.beam); HERO.glow.position.copy(apex);
  keyO.position.copy(camO.position).add(V([4000, 6000, 3000])); keyO.target.position.copy(HERO.G.position);
  rimO.position.copy(HERO.G.position).addScaledVector(_up, -4000).add(llv(26, 64, 0).sub(HERO.G.position).normalize().multiplyScalar(3000)); rimO.target.position.copy(HERO.G.position);
  warmO.position.copy(HERO.G.position).add(SUN.clone().multiplyScalar(5000)); warmO.target.position.copy(HERO.G.position);
}
const fmt = (v) => '€' + Math.floor(v).toLocaleString('en-US');
function counter(g, t) {   // beat 3: the valuation rolls up to the pop word, then holds and blinks once
  if (t < EV.count0) return; const k = ease.out((t - EV.count0) / (EV.worth - EV.count0)), v = 10e9 * k, a = clamp((t - EV.count0) / 0.2) * clamp((T.s4 - t) / 0.2);
  g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.font = '600 30px RobotoCondensed'; g.fillStyle = 'rgba(170,255,200,.9)'; g.fillText(UI.valLabel, W / 2, 250);
  g.font = '700 104px RobotoCondensed'; g.shadowColor = 'rgba(80,255,150,.8)'; g.shadowBlur = 24; g.fillStyle = (t > EV.worth && t < EV.worth + 0.2) ? '#ffffff' : '#9dffc4';
  g.fillText(fmt(v) + (t >= EV.worth ? '+' : ''), W / 2, 368); g.restore();
}

function frame(t, captions = true) {
  const i = shotAt(t), S = SHOTS[i], lt = t - S.t0(), d = SHOT_END(i) - S.t0(), k = smooth(lt / d), kk = kickAt(t);
  if (S.kind === 'desk') {
    snowAt(t); D.model.rotation.y = 0.5 + t * 0.1;
    const u = clamp((t - EV.rise) / (T.s2 - EV.rise)) ** 2;   // the last half second: the camera whips up to the window and the sky
    camD.position.set(lerp(14, 10, k), lerp(36, 34, k) + u * 24, lerp(96, 88, k) - u * 40); camD.lookAt(-8 - u * 4, 22 + u * 130, -6 - u * 40); camD.fov = 34; camD.updateProjectionMatrix();
    _p.set(-6, 20, 4).project(camD); const fc = clamp((_p.y + 1) / 2, 0.2, 0.8);
    post.render(DESK, camD, { focus: 60, aperture: 0, maxBlur: 26, tilt: 14 + u * 30, tiltCenter: fc, tiltBand: 0.32, threshold: 0.9, knee: 0.5, bloomA: 0.45, bloomB: 0.35,
      exposure: 1.15, vignette: 0.55, grain: 0.05, seed: Math.floor(t * 24), sat: 1.0, contrast: 1.12, toe: 0.02, lift: [0.004, 0.01, 0.022], gain: [1.04, 1.0, 0.95], aberration: 0.0018 });
  } else if (S.kind === 'orbit' || S.kind === 'far') {
    placeHero(t);
    if (S.kind === 'orbit') { poseOrbit(lerp(380, ORBIT_ALT, ease.out(lt / 1.5)), 24.0, 56.4); constellationAt(t, 0); }
    else { const q = ease.io(lt / (d + 0.6)); poseOrbit(lerp(ORBIT_ALT, 6800, q), lerp(24.0, 23.0, q), lerp(56.4, 50.0, q), lerp(ORBIT_AT[0], 25.5, q), lerp(ORBIT_AT[1], 63.5, q)); constellationAt(t, clamp(lt / (d * 0.75))); }
    orbitAt(t, t - T.s2);
    post.render(ORBIT, camO, { focus: 1e5, aperture: 0, maxBlur: 0, tilt: 0, threshold: 0.75, knee: 0.5, bloomA: 0.7, bloomB: 0.55,
      exposure: 1.1, vignette: 0.5, grain: 0.045, seed: Math.floor(t * 24), sat: 1.05, contrast: 1.1, toe: 0.01, lift: [0.0, 0.006, 0.012], gain: [0.98, 1.02, 1.0], aberration: 0.0028 });
  } else if (S.kind === 'buys' || S.kind === 'classified') {
    warAt(t);
    if (S.kind === 'buys') { camW.position.set(lerp(6, 4, k), lerp(128, 112, k), lerp(96, 84, k)); camW.lookAt(lerp(0, 1, k), 0, lerp(2, 0, k)); camW.fov = 36; }
    else { camW.position.set(lerp(36, 33, k), lerp(84, 76, k), lerp(78, 70, k)); camW.lookAt(SHEETAT[0] - 1, 0, SHEETAT[1] - 6); camW.fov = 30; }
    camW.position.y -= kk * 1.6; camW.fov -= kk * 1.2; camW.updateProjectionMatrix();
    _p.set(S.kind === 'buys' ? SATAT[0] : SHEETAT[0], 4, S.kind === 'buys' ? SATAT[1] : SHEETAT[1]).project(camW); const fc = clamp((_p.y + 1) / 2, 0.2, 0.8);
    post.render(WAR, camW, { focus: 60, aperture: 0, maxBlur: 24, tilt: S.kind === 'buys' ? 9 : 8, tiltCenter: fc, tiltBand: 0.5, threshold: 0.85, knee: 0.5, bloomA: 0.4, bloomB: 0.32,
      exposure: 1.1, vignette: 0.6, grain: 0.05, seed: Math.floor(t * 24), sat: 1.0, contrast: 1.12, toe: 0.02, lift: [0.0, 0.008, 0.016], gain: [1.02, 1.02, 0.98], aberration: 0.0018 });
  } else {
    const on = t < EV.beep ? 0 : (t - EV.beep < 1.4 ? (Math.floor((t - EV.beep) * 3.2) % 2 === 0 ? 1 : 0) : 1);
    RM.screen.material.map = on ? scrOn : scrOff;
    RM.sat.position.set(lerp(-62, 30, lt / d), lerp(92, 118, lt / d), -168);
    camR.position.set(lerp(-7, -5.5, k), lerp(19, 18.5, k), lerp(80, 74, k)); camR.lookAt(0, 15.5, -4); camR.fov = 32; camR.updateProjectionMatrix();
    _p.set(-2, 10.7, 4).project(camR); const fc = clamp((_p.y + 1) / 2, 0.2, 0.8);
    post.render(ROOM, camR, { focus: 50, aperture: 0, maxBlur: 30, tilt: 20, tiltCenter: fc, tiltBand: 0.22, threshold: 0.85, knee: 0.5, bloomA: 0.55, bloomB: 0.45,
      exposure: 1.2, vignette: 0.55, grain: 0.05, seed: Math.floor(t * 24), sat: 1.0, contrast: 1.12, toe: 0.02, lift: [0.0, 0.008, 0.02], gain: [1.0, 1.02, 0.98], aberration: 0.0018 });
  }
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  if (S.kind === 'orbit' || S.kind === 'far') { hudOrbit(g2d, camO, 1); scanlines(g2d, 0.18); }
  if (S.kind === 'far') counter(g2d, t);
  // the cut from the window into orbit goes through a flash of cloud-light
  const fl = t < T.s2 ? clamp((t - (T.s2 - 0.12)) / 0.12) : clamp(1 - (t - T.s2) / 0.32);
  if (fl > 0) { g2d.save(); g2d.globalAlpha = fl * 0.9; g2d.fillStyle = '#dff7ff'; g2d.fillRect(0, 0, W, H); g2d.restore(); }
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  tag(g2d, UI.tag1, tg(T.s1 + 1.4, EV.rise));
  tag(g2d, UI.tag2, tg(T.s2 + 0.7, T.s2 + 2.1)); tag(g2d, UI.tag2b, tg(T.s2 + 2.2, T.s3 - 0.1));
  tag(g2d, UI.tag3, tg(EV.worth + 0.35, T.s4 - 0.1));
  tag(g2d, UI.tag4, tg(EV.grant - 0.25, EV.buys - 0.1)); tag(g2d, UI.tag4b, tg(EV.buys + 0.2, T.s5 - 0.1));
  tag(g2d, UI.tag5b, tg(EV.sheet + 0.45, EV.stamp - 0.12)); tag(g2d, UI.tag5, tg(EV.stamp + 0.3, T.s6 - 0.1));   // the Supo line while the stamp hangs; the ministry's after it lands
  tag(g2d, UI.tag6, tg(EV.sleep + 0.3, T.end + 1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(T.s2 + 2, false); frame(T.s4 + 2, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const LOOKS = [{ name: '1-desk', t: T.s1 + 2.6 }, { name: '2-orbit', t: T.s2 + 2.9 }, { name: '3-worth', t: EV.worth + 0.5 }, { name: '4-buys', t: EV.buys + 0.5 },
  { name: '5-classified', t: EV.stamp + 0.5 }, { name: '6-monitor', t: T.s6 + 2.4 }];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  looks: LOOKS.map((l) => ({ name: l.name })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
