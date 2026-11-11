import * as THREE from 'three';

/**
 * v61 (HD-022) THE PARTICLES. One system for every spark, ember, puff of
 * smoke, droplet, flash and ring in the game.
 *
 * A PARTICLE IS ITS BIRTH RECORD. Nothing here is simulated on the CPU: an
 * emit writes sixteen floats (where, when, how fast, how long, what colour,
 * what kind) and the vertex shader flies it from those alone — gravity, drag,
 * one bounce off the floor, a curl of drift. So the cost of ten particles and
 * of four thousand is the same two draw calls, and a frame with no emits
 * uploads nothing.
 *
 * HARD PIXELS. The image is a coarse software raster (main.js SOFTWARE_PR),
 * so a soft alpha puff is the wrong language. Smoke and droplets are OPAQUE
 * and fade through an ordered dither; sparks and flashes are additive and
 * hard-edged. Two meshes: `add` and `solid`.
 *
 * AMBIENT COSTS NOTHING. A looping kind (MOTE) wraps in a box around the
 * camera in the shader, so a field of embers or pollen is emitted once per
 * season and follows the player for free. On the road the same wrap turns
 * standing dust into speed streaks: the camera's own velocity stretches it.
 */

export const KIND = { SPARK: 0, EMBER: 1, SMOKE: 2, DROP: 3, FLASH: 4, RING: 5, STREAK: 6, MOTE: 7 };
const SOLID_KINDS = new Set([KIND.SMOKE, KIND.DROP]);
// the small hard kinds share one dial (`grain`): how chunky a pixel of light is
const GRAINY = [true, true, false, true, false, false, false, true];
const STRIDE = 16;
// a seed per particle from the system's OWN dice: a visual must never draw
// from Math.random, which gates seed to replay a run
let _seed = 0x2545f491;
function seedRnd() { _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; return (_seed >>> 0) / 4294967296; }

const VERT = /* glsl */`
  attribute vec4 aA;   // spawn xyz, birth time
  attribute vec4 aB;   // velocity xyz, life
  attribute vec4 aC;   // rgb, size (world units)
  attribute vec4 aD;   // kind, seed, p1, p2
  uniform float uTime;
  uniform vec2 uView;      // the render buffer, in pixels
  uniform float uFloor;    // the y a spark bounces on
  uniform vec3 uBox;       // the ambient wrap box
  uniform vec3 uCamVel;    // the camera's world velocity (stretches ambient)
  uniform vec3 uWind;      // pushes smoke and motes
  uniform float uMinPx;
  uniform float uMaxPx;
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vFade;
  varying float vKind;
  varying float vSeed;
  varying float vAge;
  varying float vFog;

  void main() {
    float kind = aD.x, seed = aD.y, p1 = aD.z, p2 = aD.w;
    float life = max(aB.w, 0.001);
    float t = uTime - aA.w;
    bool loop = kind > 6.5;
    if (loop) t = mod(uTime + seed * life, life);
    float age = t / life;
    if (!loop && (t < 0.0 || age >= 1.0)) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }

    vec3 p0 = aA.xyz, v = aB.xyz;
    vec3 pos = p0, vel = v;
    float size = aC.w;
    float fade = 1.0;
    vec3 col = aC.rgb;
    float stretch = 0.0;      // seconds of velocity drawn as length
    float flat_ = 0.0;        // 1 = lies on the floor plane (rings)

    if (kind < 0.5 || (kind > 2.5 && kind < 3.5)) {
      // SPARK / DROP: ballistic. p1 = gravity, p2 = bounce (0 dies at the floor)
      float g = p1, a = 0.5 * g;
      pos = p0 + v * t; pos.y -= a * t * t;
      vel = v; vel.y -= g * t;
      float h0 = p0.y - uFloor;
      if (g > 0.0 && h0 > 0.0) {
        float t1 = (v.y + sqrt(v.y * v.y + 4.0 * a * h0)) / (2.0 * a);
        if (t > t1) {
          if (p2 <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
          vec3 pI = p0 + v * t1; pI.y = uFloor;
          vec3 v2 = vec3(v.x * 0.55, -(v.y - g * t1) * p2, v.z * 0.55);
          float t2 = t - t1;
          pos = pI + v2 * t2; pos.y -= a * t2 * t2;
          vel = v2; vel.y -= g * t2;
          if (pos.y < uFloor + 0.02) { pos.y = uFloor + 0.02; vel = vec3(0.0); }
        }
      }
      if (kind < 0.5) {
        // white-hot, then the colour, then a dying red
        col = mix(col + vec3(0.9), col, smoothstep(0.0, 0.2, age));
        col = mix(col, col * vec3(0.55, 0.14, 0.08), smoothstep(0.45, 1.0, age));
        fade = 1.0 - smoothstep(0.7, 1.0, age);
        stretch = 0.045;
        size *= 1.0 - 0.5 * age;
      } else {
        fade = 1.0 - smoothstep(0.75, 1.0, age);
        stretch = 0.03;
      }
    } else if (kind < 2.5) {
      // EMBER / SMOKE: drag to a stop, then rise. p1 = rise, p2 = growth
      float k = 1.8;
      pos = p0 + v * ((1.0 - exp(-k * t)) / k);
      pos.y += p1 * t;
      pos += uWind * t * (kind < 1.5 ? 0.6 : 1.0);
      float w = 6.2831 * seed;
      pos.x += sin(t * (1.1 + seed) + w) * 0.22 * min(t, 1.5);
      pos.z += cos(t * (0.9 + seed * 1.3) + w * 1.7) * 0.22 * min(t, 1.5);
      vel = v * exp(-k * t) + vec3(0.0, p1, 0.0);
      if (kind < 1.5) {
        float tw = 0.65 + 0.35 * sin(t * (9.0 + seed * 14.0) + w);
        col *= tw;
        col = mix(col, col * vec3(0.6, 0.12, 0.06), smoothstep(0.5, 1.0, age));
        fade = smoothstep(0.0, 0.08, age) * (1.0 - smoothstep(0.6, 1.0, age));
      } else {
        size *= 1.0 + p2 * t;
        fade = smoothstep(0.0, 0.06, age) * (1.0 - age);
      }
    } else if (kind < 4.5) {
      // FLASH: a burst of light that opens fast and is gone
      pos = p0 + v * t;
      size *= 0.35 + 0.65 * sqrt(age);
      fade = (1.0 - age) * (1.0 - age);
    } else if (kind < 5.5) {
      // RING: opens across the floor
      pos = p0;
      size *= 0.12 + 0.88 * (1.0 - (1.0 - age) * (1.0 - age));
      fade = 1.0 - age;
      flat_ = 1.0;
    } else if (kind < 6.5) {
      // STREAK: a straight line of light. p1 = seconds of length
      pos = p0 + v * t;
      stretch = p1;
      fade = smoothstep(0.0, 0.1, age) * (1.0 - smoothstep(0.55, 1.0, age));
    } else {
      // MOTE: ambient, forever. Wrapped in a box around the camera.
      vec3 drift = v * uTime + uWind * uTime;
      float w = 6.2831 * seed;
      drift.x += sin(uTime * (0.21 + seed * 0.3) + w) * 0.9;
      drift.z += cos(uTime * (0.17 + seed * 0.26) + w * 1.3) * 0.9;
      vec3 q = p0 + drift - cameraPosition;
      q = mod(q + uBox * 0.5, uBox) - uBox * 0.5;
      pos = cameraPosition + q;
      if (pos.y < uFloor + 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
      vel = v + uWind - uCamVel;
      stretch = p1;
      float tw = 0.55 + 0.45 * sin(uTime * (1.4 + seed * 3.0) + w * 3.0);
      col *= mix(1.0, tw, p2);
      // fade at the box's edge so the wrap is never seen
      vec3 e = abs(q) / (uBox * 0.5);
      fade = 1.0 - smoothstep(0.7, 1.0, max(e.x, max(e.y, e.z)));
    }

    vec4 mv = viewMatrix * vec4(pos, 1.0);
    float depth = max(-mv.z, 0.05);
    float pxPerUnit = projectionMatrix[1][1] * uView.y * 0.5 / depth;
    float sz = max(size, uMinPx / pxPerUnit);
    // a spark passing the eye is not a wall of light: the small kinds have a
    // ceiling in pixels, and anything within arm's reach thins out
    if (kind < 1.5 || (kind > 2.5 && kind < 3.5) || kind > 5.5) {
      sz = min(sz, uMaxPx / pxPerUnit);
      fade *= smoothstep(0.35, 1.3, depth);
    }
    vec2 q = position.xy;

    if (flat_ > 0.5) {
      vec3 wp = pos + vec3(q.x, 0.0, q.y) * sz;
      mv = viewMatrix * vec4(wp, 1.0);
    } else if (stretch > 0.0) {
      vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
      float sp = length(vv.xy);
      vec2 dir = sp > 0.001 ? vv.xy / sp : vec2(0.0, 1.0);
      float len = clamp(length(vv) * stretch, sz, sz * 14.0);
      mv.xy += dir * q.y * len + vec2(-dir.y, dir.x) * q.x * sz;
    } else {
      mv.xy += q * sz;
    }
    gl_Position = projectionMatrix * mv;
    vUv = q; vCol = col; vFade = fade; vKind = kind; vSeed = seed; vAge = age;
    vFog = depth;
  }`;

const FRAG = /* glsl */`
  varying vec2 vUv;
  varying vec3 vCol;
  varying float vFade;
  varying float vKind;
  varying float vSeed;
  varying float vAge;
  varying float vFog;
  uniform vec3 uFogCol;
  uniform vec2 uFogRange;
  uniform vec3 uGlow;     // what lights smoke from below
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
  float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
  void main() {
    vec2 uv = vUv;
    float r = length(uv);
    vec3 col = vCol;
    float a = vFade;
    float fog = clamp((vFog - uFogRange.x) / max(uFogRange.y - uFogRange.x, 0.001), 0.0, 1.0);
  #ifdef SOLID
    if (vKind < 2.5) {
      // smoke: a ragged blob, lit from below by the season's fire
      float n = sin(uv.x * 3.1 + vSeed * 21.0) * sin(uv.y * 3.4 + vSeed * 33.0);
      float edge = 1.0 - r + n * 0.22;
      a *= clamp(edge * 1.7, 0.0, 1.0);
      float below = smoothstep(0.5, -0.9, uv.y);
      col = col * (0.75 + 0.5 * (uv.y * 0.5 + 0.5)) + uGlow * below * (1.0 - vAge) * (1.0 - vAge);
    } else {
      // droplet: a hard bead with one bright pixel of sky in it
      if (max(abs(uv.x), abs(uv.y)) > 0.9) discard;
      col *= 0.8 + 0.9 * step(0.35, uv.y) * step(abs(uv.x), 0.5);
    }
    if (a <= bayer4(gl_FragCoord.xy) + 0.02) discard;
    col = mix(col, uFogCol, fog * 0.85);
    gl_FragColor = vec4(col, 1.0);
  #else
    if (vKind < 0.5) {
      col *= 0.7 + 1.5 * (1.0 - smoothstep(0.0, 0.8, abs(uv.x)));
    } else if (vKind < 1.5 || vKind > 6.5) {
      // embers and motes are single hard pixels of light
      if (max(abs(uv.x), abs(uv.y)) > 0.92) discard;
    } else if (vKind < 4.5) {
      // flash: stepped bands of light, a hot core
      float b = floor(clamp(1.0 - r, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
      a *= b * b;
      col *= 0.6 + 1.6 * step(r, 0.3);
    } else if (vKind < 5.5) {
      // ring: a thin broken band on the floor
      float band = 1.0 - smoothstep(0.045, 0.085, abs(r - 0.88));
      float ang = atan(uv.y, uv.x);
      a *= band * (0.55 + 0.45 * step(0.0, sin(ang * 9.0 + vSeed * 40.0)));
    } else {
      // streak: bright along the spine, sharp at the nose
      a *= (1.0 - smoothstep(0.3, 1.0, abs(uv.x))) * smoothstep(-1.0, 0.2, uv.y);
    }
    a *= 1.0 - fog * 0.8;
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  #endif
  }`;

class Buffer {
  constructor(cap, solid, uniforms) {
    this.cap = cap; this.limit = cap; this.reserved = 0; this.head = 0;
    this.data = new Float32Array(cap * STRIDE);
    for (let i = 0; i < cap; i++) this.data[i * STRIDE + 3] = -1e9, this.data[i * STRIDE + 7] = 1;
    this.ib = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.ib.setUsage(THREE.DynamicDrawUsage);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('aA', new THREE.InterleavedBufferAttribute(this.ib, 4, 0));
    geo.setAttribute('aB', new THREE.InterleavedBufferAttribute(this.ib, 4, 4));
    geo.setAttribute('aC', new THREE.InterleavedBufferAttribute(this.ib, 4, 8));
    geo.setAttribute('aD', new THREE.InterleavedBufferAttribute(this.ib, 4, 12));
    geo.instanceCount = cap;
    this.mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      defines: solid ? { SOLID: 1 } : {},
      transparent: !solid, depthWrite: solid, depthTest: true,
      blending: solid ? THREE.NormalBlending : THREE.AdditiveBlending,
      side: THREE.DoubleSide, fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = solid ? 0 : 6;
    this.lo = Infinity; this.hi = -1; this.emitted = 0;
  }
  /** the next slot to write: a ring over [reserved, limit) */
  slot() {
    const i = this.head;
    this.head = this.head + 1 >= this.limit ? this.reserved : this.head + 1;
    if (i < this.lo) this.lo = i;
    if (i > this.hi) this.hi = i;
    this.emitted++;
    return i * STRIDE;
  }
  flush() {
    if (this.hi < 0) return;
    this.ib.clearUpdateRanges();
    this.ib.addUpdateRange(this.lo * STRIDE, (this.hi - this.lo + 1) * STRIDE);
    this.ib.needsUpdate = true;
    this.lo = Infinity; this.hi = -1;
  }
  clear(from = 0) {
    // the kind goes too: a looping mote ignores its birth time, so a slot that
    // kept its kind would still be drawn
    for (let i = from; i < this.cap; i++) { this.data[i * STRIDE + 3] = -1e9; this.data[i * STRIDE + 12] = 0; }
    this.head = Math.max(this.reserved, from);
    this.lo = from; this.hi = this.cap - 1;
  }
}

export class Particles {
  /** @param {THREE.Scene} scene  @param {{add?:number, solid?:number}} caps */
  constructor(scene, { add = 4096, solid = 2048 } = {}) {
    this.uniforms = {
      uTime: { value: 0 },
      uView: { value: new THREE.Vector2(1280, 720) },
      uFloor: { value: 0 },
      uBox: { value: new THREE.Vector3(44, 14, 44) },
      uCamVel: { value: new THREE.Vector3() },
      uWind: { value: new THREE.Vector3() },
      uMinPx: { value: 1.6 },
      uMaxPx: { value: 7 },
      uFogCol: { value: new THREE.Color(0, 0, 0) },
      uFogRange: { value: new THREE.Vector2(40, 140) },
      uGlow: { value: new THREE.Color(0, 0, 0) },
    };
    this.add = new Buffer(add, false, this.uniforms);
    this.solid = new Buffer(solid, true, this.uniforms);
    scene.add(this.add.mesh, this.solid.mesh);
    this.time = 0;
    this.budget = 1;      // 0..1: the perf tier's share of every burst
    this.grain = 1.8;     // sparks, embers, beads and motes: authored small, drawn chunky
    this.enabled = true;
  }

  /** One particle. Positional on purpose: a kill emits sixty of these.
   *  `delay` holds it back that many seconds (the second ring of a splash). */
  emit(kind, x, y, z, vx, vy, vz, life, size, r, g, b, p1 = 0, p2 = 0, seed = seedRnd(), delay = 0) {
    if (!this.enabled || (this.noFlash && kind === KIND.FLASH)) return;
    const buf = SOLID_KINDS.has(kind) ? this.solid : this.add;
    const d = buf.data, o = buf.slot();
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = this.time + delay;
    d[o + 4] = vx; d[o + 5] = vy; d[o + 6] = vz; d[o + 7] = life;
    d[o + 8] = r; d[o + 9] = g; d[o + 10] = b;
    d[o + 11] = GRAINY[kind] ? size * this.grain : size;
    d[o + 12] = kind; d[o + 13] = seed; d[o + 14] = p1; d[o + 15] = p2;
  }

  /** How many of `n` a burst may emit under the current budget. */
  count(n) { const k = n * this.budget; const f = Math.floor(k); return f + (seedRnd() < k - f ? 1 : 0); }

  /**
   * The ambient field: `n` looping motes emitted ONCE into reserved slots,
   * wrapped around the camera by the shader. Replaces any earlier field.
   */
  ambient(n, make) {
    const buf = this.add;
    buf.clear(0);
    buf.reserved = 0; buf.head = 0;
    const m = Math.min(Math.floor(n * this.budget), Math.floor(buf.limit * 0.4));
    for (let i = 0; i < m; i++) make(i, m);
    buf.reserved = m; buf.head = m;
    return m;
  }

  /** Shrink what the ring may use (perf tiers). Ambient is re-seeded by the caller. */
  setLimits(add, solid) {
    this.add.limit = Math.max(64, Math.min(this.add.cap, add));
    this.solid.limit = Math.max(32, Math.min(this.solid.cap, solid));
    this.add.mesh.geometry.instanceCount = this.add.limit;
    this.solid.mesh.geometry.instanceCount = this.solid.limit;
    if (this.add.head >= this.add.limit) this.add.head = this.add.reserved;
    if (this.solid.head >= this.solid.limit) this.solid.head = this.solid.reserved;
  }

  /** Everything in flight is gone (a new run). The ambient field stays. */
  clear() { this.add.clear(this.add.reserved); this.solid.clear(0); }

  setVisible(on) { this.add.mesh.visible = on; this.solid.mesh.visible = on; this.enabled = on; }

  /** Advance the clock and upload this frame's births. */
  update(dt) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    this.add.flush(); this.solid.flush();
  }

  /** how many looping motes are really in the buffer the shader draws */
  motes() { let n = 0; const d = this.add.data; for (let i = 0; i < this.add.limit; i++) if (d[i * STRIDE + 12] === KIND.MOTE) n++; return n; }

  stats() { return { motes: this.motes(), time: +this.time.toFixed(2), emittedAdd: this.add.emitted, emittedSolid: this.solid.emitted, ambient: this.add.reserved, limitAdd: this.add.limit, limitSolid: this.solid.limit, budget: this.budget }; }
}
