// The camera back: scene → (AO) → depth of field → bloom → grade, by hand.
//
// Every pass is a full-screen quad over a half-float target, so the scene is
// lit in linear light and only the grade tone-maps and encodes it. Nothing
// here keeps time: a still is a pure function of the scene and the options.

import * as THREE from 'three';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function quadPass(frag, uniforms) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: frag, uniforms,
    depthTest: false, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(mesh);
  return { mat, scene, u: uniforms };
}

const rt = (w, h, opts = {}) => new THREE.WebGLRenderTarget(w, h, {
  type: THREE.HalfFloatType, format: THREE.RGBAFormat,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  depthBuffer: !!opts.depth, ...opts.extra,
});

// Gustafsson's single-pass scatter-as-gather bokeh, CoC from linear depth
// (thin lens) plus an optional screen-space tilt-shift band.
const DOF = /* glsl */`
uniform sampler2D tColor, tDepth;
uniform vec2 px;               // 1 / resolution
uniform float near, far, focus, aperture, maxBlur, radScale;
uniform float tilt, tiltCenter, tiltBand;
varying vec2 vUv;
float linZ(float d) { return (near * far) / (far - d * (far - near)); }
float coc(vec2 uv, float z) {
  float c = aperture * abs(z - focus) / z;
  if (tilt > 0.0) c = max(c, tilt * smoothstep(tiltBand, 1.0, abs(uv.y - tiltCenter) * 2.0));
  return clamp(c, 0.0, maxBlur);
}
void main() {
  float cz = linZ(texture2D(tDepth, vUv).x);
  float cs = coc(vUv, cz);
  vec3 col = texture2D(tColor, vUv).rgb;
  float tot = 1.0;
  float r = radScale;
  float ang = 0.0;
  for (int i = 0; i < 2000; i++) {
    if (r >= maxBlur) break;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * px * r;
    vec3 sc = texture2D(tColor, tc).rgb;
    float sz = linZ(texture2D(tDepth, tc).x);
    float ss = coc(tc, sz);
    if (sz > cz) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(r - 0.5, r + 0.5, ss);
    col += mix(col / tot, sc, m);
    tot += 1.0;
    r += radScale / r;
    ang += 2.39996323;
  }
  gl_FragColor = vec4(col / tot, 1.0);
}`;

const BRIGHT = /* glsl */`
uniform sampler2D tColor; uniform float threshold, knee; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  float l = max(c.r, max(c.g, c.b));
  float k = smoothstep(threshold - knee, threshold + knee, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLUR = /* glsl */`
uniform sampler2D tColor; uniform vec2 dir; varying vec2 vUv;
void main() {
  vec3 c = vec3(0.0); float t = 0.0;
  for (int i = -16; i <= 16; i++) {
    float w = exp(-float(i * i) / 72.0);
    c += texture2D(tColor, vUv + dir * float(i)).rgb * w; t += w;
  }
  gl_FragColor = vec4(c / t, 1.0);
}`;

const GRADE = /* glsl */`
uniform sampler2D tColor, tBloomA, tBloomB, tAO;
uniform float useAO, aoStrength, bloomA, bloomB, exposure, vignette, grain, seed;
uniform float sat, contrast; uniform vec3 lift, gain, tint; uniform float toe;
uniform vec2 res; uniform float aberration;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
vec3 aces(vec3 x) {
  // Narkowicz fit — a filmic shoulder, which is what lets a lamp burn
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 d = (vUv - 0.5);
  vec3 c;
  if (aberration > 0.0) {
    vec2 o = d * aberration;
    c = vec3(texture2D(tColor, vUv - o).r, texture2D(tColor, vUv).g, texture2D(tColor, vUv + o).b);
  } else c = texture2D(tColor, vUv).rgb;
  c += texture2D(tBloomA, vUv).rgb * bloomA + texture2D(tBloomB, vUv).rgb * bloomB;
  c *= exposure * tint;
  c = aces(c);
  // grade in display-ish space
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, sat);
  c = (c - 0.5) * contrast + 0.5;
  c = c * gain + lift * (1.0 - c);
  c = max(c, 0.0);
  c = pow(c, vec3(1.0 + toe)) ;
  float v = 1.0 - vignette * smoothstep(0.25, 0.95, length(d * vec2(1.0, res.y / res.x * 0.62)));
  c *= v;
  vec3 s = toSRGB(clamp(c, 0.0, 1.0));
  float g = hash(vUv * res + seed) + hash(vUv * res * 1.37 + seed * 3.1) - 1.0;
  s += g * grain * (0.6 + 0.4 * (1.0 - l));
  gl_FragColor = vec4(s, 1.0);
}`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const depthTex = new THREE.DepthTexture(W, H);
    depthTex.type = THREE.UnsignedIntType;
    this.rtScene = rt(W, H, { depth: true, extra: { depthTexture: depthTex } });
    this.rtDof = rt(W, H);
    const q = 4, e = 16;
    this.rtB1 = rt(W / q | 0, H / q | 0); this.rtB2 = rt(W / q | 0, H / q | 0);
    this.rtC1 = rt(W / e | 0, H / e | 0); this.rtC2 = rt(W / e | 0, H / e | 0);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.dof = quadPass(DOF, {
      tColor: { value: null }, tDepth: { value: depthTex }, px: { value: new THREE.Vector2(1 / W, 1 / H) },
      near: { value: 1 }, far: { value: 100 }, focus: { value: 10 }, aperture: { value: 10 },
      maxBlur: { value: 20 }, radScale: { value: 0.9 },
      tilt: { value: 0 }, tiltCenter: { value: 0.5 }, tiltBand: { value: 0.3 },
    });
    this.bright = quadPass(BRIGHT, { tColor: { value: null }, threshold: { value: 1.0 }, knee: { value: 0.4 } });
    this.blur = quadPass(BLUR, { tColor: { value: null }, dir: { value: new THREE.Vector2() } });
    this.grade = quadPass(GRADE, {
      tColor: { value: null }, tBloomA: { value: null }, tBloomB: { value: null }, tAO: { value: null },
      useAO: { value: 0 }, aoStrength: { value: 1 }, bloomA: { value: 0.3 }, bloomB: { value: 0.2 },
      exposure: { value: 1 }, vignette: { value: 0.35 }, grain: { value: 0.025 }, seed: { value: 1 },
      sat: { value: 1 }, contrast: { value: 1 }, lift: { value: new THREE.Vector3() },
      gain: { value: new THREE.Vector3(1, 1, 1) }, tint: { value: new THREE.Vector3(1, 1, 1) }, toe: { value: 0 },
      res: { value: new THREE.Vector2(W, H) }, aberration: { value: 0 },
    });
  }

  pass(p, target) { this.r.setRenderTarget(target); this.r.render(p.scene, this.cam); }

  blurInto(src, a, b, step) {
    this.blur.u.tColor.value = src.texture;
    this.blur.u.dir.value.set(step / a.width, 0); this.pass(this.blur, b);
    this.blur.u.tColor.value = b.texture;
    this.blur.u.dir.value.set(0, step / a.height); this.pass(this.blur, a);
  }

  render(scene, camera, o = {}) {
    const r = this.r;
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    // depth of field
    const d = this.dof.u;
    d.tColor.value = this.rtScene.texture;
    d.near.value = camera.near; d.far.value = camera.far;
    d.focus.value = o.focus ?? 10; d.aperture.value = (o.aperture ?? 0) * this.H / 1920;
    d.maxBlur.value = (o.maxBlur ?? 24) * this.H / 1920; d.radScale.value = o.radScale ?? 0.9;
    d.tilt.value = (o.tilt ?? 0) * this.H / 1920; d.tiltCenter.value = o.tiltCenter ?? 0.5; d.tiltBand.value = o.tiltBand ?? 0.3;
    this.pass(this.dof, this.rtDof);
    // bloom, two widths
    this.bright.u.tColor.value = this.rtDof.texture;
    this.bright.u.threshold.value = o.threshold ?? 1.0; this.bright.u.knee.value = o.knee ?? 0.5;
    this.pass(this.bright, this.rtB1);
    this.blurInto(this.rtB1, this.rtB1, this.rtB2, 1.0);
    this.blurInto(this.rtB1, this.rtB1, this.rtB2, 2.0);
    this.bright.u.tColor.value = this.rtB1.texture; this.bright.u.threshold.value = 0.0; this.bright.u.knee.value = 0.0001;
    this.pass(this.bright, this.rtC1);
    this.blurInto(this.rtC1, this.rtC1, this.rtC2, 1.0);
    this.blurInto(this.rtC1, this.rtC1, this.rtC2, 2.0);
    const g = this.grade.u;
    g.tColor.value = this.rtDof.texture; g.tBloomA.value = this.rtB1.texture; g.tBloomB.value = this.rtC1.texture;
    for (const k of ['bloomA', 'bloomB', 'exposure', 'vignette', 'grain', 'seed', 'sat', 'contrast', 'toe', 'aberration'])
      if (o[k] !== undefined) g[k].value = o[k];
    if (o.lift) g.lift.value.set(...o.lift);
    if (o.gain) g.gain.value.set(...o.gain);
    if (o.tint) g.tint.value.set(...o.tint);
    this.pass(this.grade, null);
  }
}

// Kept for scenes that want it: the AO term as a multiply over the beauty.
export function makeAO(scene, camera, W, H, params = {}) {
  const p = new GTAOPass(scene, camera, W, H);
  p.output = GTAOPass.OUTPUT.Off;
  p.updateGtaoMaterial({ radius: 2, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, ...params });
  return p;
}
