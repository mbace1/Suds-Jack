import * as THREE from 'three';

/**
 * v61 (HD-022) THE FLOOR IS A FLUID. A small simulation over the disc that
 * the floor's own shader reads — so the arena floor stops being a texture
 * and becomes the thing a fight happens ON.
 *
 * One field (a ping-pong render target, `size`² texels over the 2R square),
 * one shader, two liquids:
 *
 *   WATER (INCA)   r = height, g = its speed, b = foam. The wave equation: a
 *                  splash is a dent that rings outward, rings cross and die
 *                  at the rim. The sea's breaking wave drags a trough along
 *                  with it and leaves foam behind.
 *   MAGMA (EMBER)  r = how much is lying there, g = how hot it is. Only what
 *                  stands ABOVE a film thickness flows, so a spill runs fast,
 *                  slows, and stops as a pool with an edge — viscous without
 *                  a viscosity. It cools from the thin rim inward, crusts,
 *                  and long after sinks away so a run cannot fill the floor.
 *
 * COST. One pass over 256² texels a step (five taps), at a fixed 60 steps a
 * second, and five taps in the floor shader. Nothing is read back to the CPU:
 * no rule in the game can depend on this, and none does.
 */

const MAX_SPLATS = 12;

const SIM_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D tPrev;
  uniform vec2 uTexel;
  uniform float uMode;                 // 1 water, 2 magma
  uniform vec4 uSplat[${MAX_SPLATS}];  // uv.xy, radius (uv), strength
  uniform vec4 uWave;                  // dir.xy, head / R, width / R
  uniform float uWaveAmt;
  uniform vec4 uK;                     // water: (c2, damp, foamDecay, -)  magma: (film, cool, sink, flow)
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(tPrev, vUv);
    vec4 l = texture2D(tPrev, vUv - vec2(uTexel.x, 0.0));
    vec4 r = texture2D(tPrev, vUv + vec2(uTexel.x, 0.0));
    vec4 d = texture2D(tPrev, vUv - vec2(0.0, uTexel.y));
    vec4 u = texture2D(tPrev, vUv + vec2(0.0, uTexel.y));
    vec2 p = vUv * 2.0 - 1.0;
    float rim = 1.0 - smoothstep(0.93, 1.0, length(p));
    if (uMode < 1.5) {
      float h = c.r, v = c.g, f = c.b;
      float lap = (l.r + r.r + d.r + u.r) * 0.25 - h;
      v = (v + lap * uK.x) * uK.y;
      h = (h + v) * 0.998;
      f = max(f * uK.z - 0.0015, 0.0) + abs(lap) * 0.55;
      for (int i = 0; i < ${MAX_SPLATS}; i++) {
        vec4 s = uSplat[i];
        if (s.w == 0.0) continue;
        float k = max(0.0, 1.0 - length(vUv - s.xy) / s.z);
        h += s.w * k * k;
        f += abs(s.w) * k * 0.35;
      }
      if (uWaveAmt > 0.0) {
        // the crest's foot presses the surface down as it passes, and foams
        float sd = dot(p, uWave.xy) - uWave.z;
        float g = exp(-(sd * sd) / (uWave.w * uWave.w));
        h -= uWaveAmt * g * 0.05;
        f += uWaveAmt * g * 0.022 * step(0.0, sd);
      }
      gl_FragColor = vec4(h * rim, v * rim, min(f, 1.6) * rim, 1.0);
    } else {
      float a = c.r, heat = c.g;
      float film = uK.x;
      float e = max(a - film, 0.0);
      float en = (max(l.r - film, 0.0) + max(r.r - film, 0.0) + max(d.r - film, 0.0) + max(u.r - film, 0.0)) * 0.25;
      float flow = (en - e) * uK.w;
      a += flow;
      // what flows in brings its heat with it
      if (flow > 0.0004) heat = max(heat, max(max(l.g, r.g), max(d.g, u.g)) * 0.992);
      // thin cools first: the rim crusts while the middle still glows
      float thick = clamp(a / (film * 2.2), 0.0, 1.0);
      // …and white heat does not last: the hotter, the faster it goes
      heat = max(heat - uK.y * (1.5 - thick) * (0.5 + 3.0 * heat * heat), 0.0);
      // a cold crust sinks away, slowly
      a = max(a - uK.z * step(heat, 0.03), 0.0);
      for (int i = 0; i < ${MAX_SPLATS}; i++) {
        vec4 s = uSplat[i];
        if (s.w == 0.0) continue;
        float k = max(0.0, 1.0 - length(vUv - s.xy) / s.z);
        a += s.w * k * k;
        heat = max(heat, step(0.02, k));
      }
      gl_FragColor = vec4(a * rim, heat, 0.0, 1.0);
    }
  }`;

export class FloorFluid {
  /** @param {number} R  the disc's radius: the field covers [-R, R]² */
  constructor(R, size = 256) {
    this.R = R;
    this.size = size;
    this.mode = 0;                 // 0 off, 1 water, 2 magma
    this.enabled = true;
    const opt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
    this.a = new THREE.WebGLRenderTarget(size, size, opt);
    this.b = new THREE.WebGLRenderTarget(size, size, opt);
    this.splats = [];
    for (let i = 0; i < MAX_SPLATS; i++) this.splats.push(new THREE.Vector4());
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tPrev: { value: null },
        uTexel: { value: new THREE.Vector2(1 / size, 1 / size) },
        uMode: { value: 1 },
        uSplat: { value: this.splats },
        uWave: { value: new THREE.Vector4(0, 1, -99, 0.1) },
        uWaveAmt: { value: 0 },
        uK: { value: new THREE.Vector4(1, 0.985, 0.975, 0) },
      },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: SIM_FRAG,
      depthTest: false, depthWrite: false,
    });
    this.scene = new THREE.Scene();
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.queue = [];               // {x, z, r, w, t}: splats waiting for their moment
    this.acc = 0;
    this.time = 0;
    this.steps = 0;
    this.splatted = 0;
    this._clear = true;
    // what the floor's shader reads: (mode, strength, texel, 1 / 2R)
    this.floorK = new THREE.Vector4(0, 1, 1 / size, 1 / (2 * R));
  }

  get texture() { return this.a.texture; }

  /** 'water' | 'magma' | null — with the liquid's own constants. */
  setMode(kind, k = {}) {
    this.mode = kind === 'water' ? 1 : kind === 'magma' ? 2 : 0;
    const u = this.mat.uniforms;
    u.uMode.value = this.mode || 1;
    if (this.mode === 1) u.uK.value.set(k.c2 ?? 1.0, k.damp ?? 0.986, k.foam ?? 0.975, 0);
    else u.uK.value.set(k.film ?? 0.22, k.cool ?? 0.0016, k.sink ?? 0.00035, k.flow ?? 0.9);
    this.floorK.x = this.enabled ? this.mode : 0;
    this.reset();
  }

  setEnabled(on) { this.enabled = !!on; this.floorK.x = this.enabled ? this.mode : 0; if (!on) this.reset(); }

  /** A dry floor: everything spilled is gone (a new run). */
  reset() { this.queue.length = 0; this._clear = true; this.mat.uniforms.uWaveAmt.value = 0; }

  /**
   * Something reached the floor at world (x, z). `r` is its reach in world
   * units, `w` how much (magma) or how hard (water: negative is a dent).
   * `delay` holds it until whatever is falling has fallen.
   */
  splat(x, z, r, w, delay = 0) {
    if (!this.mode || !this.enabled) return;
    if (x * x + z * z > this.R * this.R) return;
    if (this.queue.length > 96) this.queue.shift();
    this.queue.push({ x, z, r, w, t: this.time + delay });
  }

  /** INCA's crest: where it is and how hard it presses (0 = no wave). */
  setWave(dirX, dirZ, head, width, amt) {
    const u = this.mat.uniforms;
    u.uWave.value.set(dirX, dirZ, head / this.R, Math.max(0.02, width * 0.35 / this.R));
    u.uWaveAmt.value = amt;
  }

  /** Advance on a fixed clock: at most three steps a frame, so a slow frame
   *  slows the liquid rather than exploding it. */
  step(renderer, dt) {
    if (!this.mode || !this.enabled) return;
    this.time += dt;
    this.acc = Math.min(this.acc + dt, 3 / 60);
    const prevTarget = renderer.getRenderTarget();
    const prevAuto = renderer.autoClear;
    if (this._clear) {
      this._clear = false;
      for (const t of [this.a, this.b]) { renderer.setRenderTarget(t); renderer.setClearColor(0x000000, 1); renderer.clear(true, false, false); }
    }
    renderer.autoClear = false;
    while (this.acc >= 1 / 60) {
      this.acc -= 1 / 60;
      // this step's splats: whatever in the queue is due, up to the shader's twelve
      let n = 0;
      for (let i = 0; i < this.queue.length && n < MAX_SPLATS;) {
        const q = this.queue[i];
        if (q.t <= this.time) {
          this.splats[n++].set(q.x / (2 * this.R) + 0.5, q.z / (2 * this.R) + 0.5, Math.max(q.r / (2 * this.R), 1.5 / this.size), q.w);
          this.queue.splice(i, 1); this.splatted++;
        } else i++;
      }
      for (let i = n; i < MAX_SPLATS; i++) this.splats[i].set(0, 0, 1, 0);
      this.mat.uniforms.tPrev.value = this.a.texture;
      renderer.setRenderTarget(this.b);
      renderer.render(this.scene, this.cam);
      const t = this.a; this.a = this.b; this.b = t;
      this.steps++;
    }
    renderer.setRenderTarget(prevTarget);
    renderer.autoClear = prevAuto;
  }

  getState() { return { mode: this.mode, enabled: this.enabled, size: this.size, steps: this.steps, splatted: this.splatted, queued: this.queue.length }; }

  dispose() { this.a.dispose(); this.b.dispose(); this.mat.dispose(); this.quad.geometry.dispose(); }
}

/**
 * What the floor's fragment shader needs to draw the field. Kept beside the
 * simulation so the two halves of one liquid are read together.
 *   uFluid   the field        uFluidK  (mode, strength, texel, 1 / 2R)
 *   uFluidA / uFluidB          the liquid's two colours (water: crest light
 *                              and foam; magma: the hot end and the crust)
 * `fluidN` is the surface normal the sun's path reflects off.
 */
export const FLUID_GLSL_PARS = /* glsl */`
  uniform sampler2D uFluid;
  uniform vec4 uFluidK;
  uniform vec3 uFluidA;
  uniform vec3 uFluidB;
  float flHash(vec2 p) { p = fract(p * vec2(123.34, 345.45)); p += dot(p, p + 34.345); return fract(p.x * p.y); }
`;

/** Runs after the floor's own colour is known and before the sun's path. */
export const FLUID_GLSL_MAIN = /* glsl */`
  vec3 fluidN = vec3(0.0, 1.0, 0.0);
  vec2 fluidG = vec2(0.0);
  if (uFluidK.x > 0.5) {
    vec2 fuv = vWorld * uFluidK.w + 0.5;
    float tx = uFluidK.z;
    vec4 fc = texture2D(uFluid, fuv);
    float fl = texture2D(uFluid, fuv - vec2(tx, 0.0)).r, fr = texture2D(uFluid, fuv + vec2(tx, 0.0)).r;
    float fd = texture2D(uFluid, fuv - vec2(0.0, tx)).r, fu = texture2D(uFluid, fuv + vec2(0.0, tx)).r;
    fluidG = vec2(fr - fl, fu - fd);
    if (uFluidK.x < 1.5) {
      // WATER: the surface tilts, the crest of a ring catches light, its
      // trough is darker, and foam is chunks rather than a wash
      fluidN = normalize(vec3(-fluidG.x * 7.0, 1.0, -fluidG.y * 7.0));
      float h = fc.r * uFluidK.y;
      col *= 1.0 + clamp(h * 2.2, -0.45, 1.6);
      col += uFluidA * smoothstep(0.02, 0.22, h) * 0.5;
      float cell = flHash(floor(vWorld * 8.0));
      float foam = smoothstep(0.42, 0.6, fc.b * (0.4 + 1.0 * cell));
      col = mix(col, uFluidB, foam * 0.8 * uFluidK.y);
    } else {
      // MAGMA: a pool with an edge. Hot in the thick middle, crusting from
      // the thin rim inward; the crust is plates with light in the cracks.
      float a = fc.r;
      vec2 pw = vWorld * 3.2 + 0.42 * sin(vWorld.yx * 2.3 + vec2(0.0, 1.7)) + 0.2 * sin(vWorld * 5.1);
      float plate = flHash(floor(pw));
      float pool = smoothstep(0.035, 0.085, a + (plate - 0.5) * 0.03);
      if (pool > 0.0) {
        float thick = clamp(a / 0.5, 0.0, 1.0);
        float heat = fc.g * (0.3 + 0.7 * thick) + (plate - 0.5) * 0.12 * step(0.02, fc.g);
        vec3 hot = uFluidA;
        vec3 lava = mix(vec3(0.16, 0.006, 0.004), hot * vec3(0.5, 0.12, 0.05), smoothstep(0.08, 0.3, heat));
        lava = mix(lava, hot * vec3(0.95, 0.4, 0.1), smoothstep(0.3, 0.55, heat));
        lava = mix(lava, hot * vec3(1.1, 0.78, 0.4), smoothstep(0.72, 0.95, heat));
        // the crust: dark plates, and the seams between them still alight
        vec2 pc = fract(pw) - 0.5;
        float seam = smoothstep(0.34 + 0.12 * plate, 0.5, max(abs(pc.x), abs(pc.y)));
        float alight = step(0.45, flHash(floor(pw) + 7.3));   // half the cracks have gone dark
        vec3 crust = uFluidB + hot * vec3(0.42, 0.05, 0.02) * seam * alight * smoothstep(0.0, 0.12, fc.g);
        vec3 body = mix(crust, lava, smoothstep(0.06, 0.2, heat));
        // a lit edge where the pool stands proud of the floor
        float lip = clamp(length(fluidG) * 9.0, 0.0, 1.0) * (0.25 + 0.75 * smoothstep(0.05, 0.4, fc.g));
        body += hot * vec3(0.5, 0.12, 0.04) * lip;
        col = mix(col, body, pool);
      }
    }
  }
`;
