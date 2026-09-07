// Heat haze — light BENDING, not a texture. The rocket exhaust and the hot
// ground do not draw anything of their own: they displace what is already
// behind them. After the HD layer is down, the finished frame is copied into
// a texture and this pass draws refracting sprites at the nozzles and a
// mirage band along the horizon, each fragment sampling that copy at an
// offset from its own screen position. The offset comes from a smooth noise
// texture scrolled upward, so the distortion rises the way hot air does.
//
// Two rules paid for while getting here. The copy has to happen AFTER the
// HD pass, or the ships refract the world but the exhaust does not refract
// the ships. And the sprites must depth-test against the frame's own depth
// buffer (the prepass + HD layer leave one) so haze behind a hull stays
// behind it — but must not WRITE depth, or the sprites occlude each other.
import * as THREE from 'three';

/** Smooth, tileable noise in R and G: a few sines at integer frequencies. */
function noiseTexture() {
  const N = 128, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N), d = img.data;
  const waves = ch => Array.from({ length: 6 }, (_, k) => ({
    fx: (1 + Math.floor(Math.random() * 4)) * (k % 2 ? 1 : -1), fy: 2 + Math.floor(Math.random() * 5),
    ph: Math.random() * Math.PI * 2, a: 1 / (1 + k * 0.4),
  }));
  const W = [waves(0), waves(1)];
  const TAU = Math.PI * 2 / N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4;
    for (let ch = 0; ch < 2; ch++) {
      let v = 0, norm = 0;
      for (const w of W[ch]) { v += w.a * Math.sin((w.fx * x + w.fy * y) * TAU + w.ph); norm += w.a; }
      d[o + ch] = 128 + 110 * (v / norm);
    }
    d[o + 2] = 128; d[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter;
  return t;
}

const SPRITE_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute float aSeed;
uniform float uScale;
uniform float uCap;
varying float vAlpha;
varying float vSeed;
void main() {
  vAlpha = aAlpha; vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = min(aSize * (uScale / max(-mv.z, 1.0)), uCap);
  gl_Position = projectionMatrix * mv;
}`;

const SPRITE_FRAG = `
uniform sampler2D uFrame;
uniform sampler2D uNoise;
uniform vec2 uRes;
uniform float uTime;
uniform float uStrength;
varying float vAlpha;
varying float vSeed;
void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float r = length(pc) * 2.0;
  float mask = smoothstep(1.0, 0.25, r) * vAlpha;
  if (mask < 0.01) discard;
  vec2 n = texture2D(uNoise, gl_PointCoord * 0.9 + vec2(vSeed, vSeed * 0.7 - uTime * 0.55)).rg - 0.5;
  vec2 uv = gl_FragCoord.xy / uRes + n * mask * uStrength;
  gl_FragColor = vec4(texture2D(uFrame, uv).rgb, mask);
}`;

// The mirage: a band along the horizon where the hot ground meets the sky.
// Drawn as a screen quad, no depth test — it is the air over everything.
const BAND_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BAND_FRAG = `
uniform sampler2D uFrame;
uniform sampler2D uNoise;
uniform float uTime;
uniform float uHorizon;    // screen y (0..1) of the horizon
uniform float uWidth;
uniform float uMirage;
varying vec2 vUv;
void main() {
  float d = (vUv.y - uHorizon) / uWidth;
  // biased below the line: the shimmer is in the ground, not the sky
  float band = exp(-d * d * 2.0) * (vUv.y < uHorizon ? 1.0 : 0.45);
  if (band < 0.02) discard;
  vec2 n = texture2D(uNoise, vec2(vUv.x * 5.0 + uTime * 0.05, vUv.y * 9.0 - uTime * 0.3)).rg - 0.5;
  vec2 uv = vUv + vec2(n.x * 0.35, n.y) * band * uMirage;
  gl_FragColor = vec4(texture2D(uFrame, uv).rgb, band);
}`;

export class HeatHaze {
  constructor(opts = {}) {
    const o = this.o = Object.assign({
      max: 700, scale: 260, cap: 300, strength: 0.036, mirage: 0.010, width: 0.045,
      drag: 1.4, rise: 1.6, grow: 1.8, life: 0.7, lifeRand: 0.5,
    }, opts);
    this.n = o.max;
    this.pos = new Float32Array(this.n * 3);
    this.vel = new Float32Array(this.n * 3);
    this.size = new Float32Array(this.n);
    this.alpha = new Float32Array(this.n);
    this.seed = new Float32Array(this.n);
    this.life = new Float32Array(this.n);
    this.max = new Float32Array(this.n);
    this.base = new Float32Array(this.n);
    this.head = 0;
    this.scene = new THREE.Scene();
    this.frame = null;
    this.noise = noiseTexture();

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(this.seed, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uFrame: { value: null }, uNoise: { value: this.noise },
        uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
        uScale: { value: o.scale }, uCap: { value: o.cap }, uStrength: { value: o.strength },
      },
      vertexShader: SPRITE_VERT, fragmentShader: SPRITE_FRAG,
      transparent: true, depthWrite: false, depthTest: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    // the camera is still masked to the HD layer when this pass runs — on
    // layer 0 the whole haze scene was silently culled and moved no pixels
    this.points.layers.set(1);
    this.scene.add(this.points);

    this.bandMat = new THREE.ShaderMaterial({
      uniforms: {
        uFrame: { value: null }, uNoise: { value: this.noise }, uTime: { value: 0 },
        uHorizon: { value: 0.5 }, uWidth: { value: o.width }, uMirage: { value: o.mirage },
      },
      vertexShader: BAND_VERT, fragmentShader: BAND_FRAG,
      transparent: true, depthWrite: false, depthTest: false,
    });
    const band = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bandMat);
    band.frustumCulled = false;
    band.renderOrder = 0;
    band.layers.set(1);
    this.scene.add(band);
    this._dir = new THREE.Vector3();
    this._h = new THREE.Vector3();
  }

  resize(w, h) {
    if (this.frame) this.frame.dispose();
    this.frame = new THREE.FramebufferTexture(w, h);
    this.frame.minFilter = this.frame.magFilter = THREE.LinearFilter;
    this.mat.uniforms.uFrame.value = this.frame;
    this.bandMat.uniforms.uFrame.value = this.frame;
    this.mat.uniforms.uRes.value.set(w, h);
  }

  /** @param p world position, v world velocity, size world metres, alpha 0..1 */
  emit(p, v, size, alpha) {
    const i = this.head = (this.head + 1) % this.n;
    const i3 = i * 3;
    this.pos[i3] = p.x; this.pos[i3 + 1] = p.y; this.pos[i3 + 2] = p.z;
    this.vel[i3] = v.x; this.vel[i3 + 1] = v.y; this.vel[i3 + 2] = v.z;
    this.size[i] = size; this.base[i] = alpha;
    this.alpha[i] = alpha; this.seed[i] = Math.random();
    this.life[i] = 0; this.max[i] = this.o.life + Math.random() * this.o.lifeRand;
  }

  update(dt) {
    const { pos, vel, life, max, size, alpha, base } = this;
    const o = this.o;
    const drag = Math.exp(-o.drag * dt);
    for (let i = 0; i < this.n; i++) {
      if (alpha[i] <= 0) continue;
      const t = (life[i] += dt);
      if (t >= max[i]) { alpha[i] = 0; size[i] = 0; continue; }
      const i3 = i * 3;
      vel[i3] *= drag; vel[i3 + 2] *= drag;
      vel[i3 + 1] = vel[i3 + 1] * drag + o.rise * dt;      // hot air rises
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      size[i] += o.grow * dt;
      const u = t / max[i];
      alpha[i] = base[i] * (1 - u) * Math.min(1, u * 6);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.aSeed.needsUpdate = true;
    this.mat.uniforms.uTime.value += dt;
    this.bandMat.uniforms.uTime.value += dt;
  }

  /**
   * Copy the finished frame and draw the haze over it. Call after the HD
   * pass with autoClear off; the caller's depth buffer is what occludes.
   */
  render(renderer, camera, mirage = 1) {
    if (!this.frame) return;
    renderer.copyFramebufferToTexture(this.frame);
    // where the horizon sits on screen: a point far ahead at eye height
    camera.getWorldDirection(this._dir);
    this._h.copy(camera.position).addScaledVector(this._dir.setY(0).normalize(), 2000);
    this._h.y = camera.position.y - 6;
    this._h.project(camera);
    this.bandMat.uniforms.uHorizon.value = this._h.y * 0.5 + 0.5;
    this.bandMat.uniforms.uMirage.value = this.o.mirage * mirage;
    renderer.render(this.scene, camera);
  }
}
