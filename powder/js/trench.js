// Trenches — the groove a pod cuts in soft sand, left behind as you go.
//
// v11. The carve's third cue after the lean and the spray. The first cut was
// Flowsnow's ribbon — five vertices across, laid a few centimetres over
// height() — and it never once showed: the ground is drawn on a 6.25 m grid,
// so between its vertices the RENDERED sand sits up to decimetres off the
// height function, and the ribbon spent half its length buried under the mesh
// and the other half floating over it. A groove has to be IN the ground.
//
// So this is a TRAIL MAP, the way snow games deform snow: a top-down render
// target round the player (128 m a side, 12.5 cm a texel on high) that every
// pod stamps its groove into as it moves — R the groove's depth, G the berm
// of sand it pushed up either side — max-blended, so crossing grooves keep
// the deeper of the two. terrain.js's ground shader samples it and does the
// rest in the same terms as its ripples: the floor darker, the walls
// embossed toward the low sun (the wall facing it bright, the other in
// shade), the berm a touch lighter, and the ripples WIPED where a pod went
// through, because a groove is the one place the wind pattern is not.
//
// Two draw calls at most a frame, both tiny: the new stamps, and — when the
// player has moved RECENTRE from the middle — one full-screen copy that
// scrolls the map by a whole number of texels (ping-pong between two targets).
// Nothing here touches the CPU per texel.
import * as THREE from 'three';

const SPAN = 128;          // m a side
const RECENTRE = 20;       // m off-centre before the map scrolls
const MAXQ = 160;          // stamps a frame
const OUTER = 1.7;         // a stamp's half-width, in groove half-widths (room for the berm)

const STAMP_VERT = `
attribute float aDepth;
uniform vec2 uCentre;
uniform float uHalf;
varying float vA;
varying float vD;
void main() {
  vA = position.y; vD = aDepth;
  gl_Position = vec4((position.x - uCentre.x) / uHalf, (position.z - uCentre.y) / uHalf, 0.0, 1.0);
}`;

const STAMP_FRAG = `
varying float vA;
varying float vD;
void main() {
  float a = abs(vA) * ${OUTER.toFixed(2)};     // in groove half-widths
  // a round-bottomed groove: flat-ish floor, walls up to the rim at 1
  float dep = vD * (1.0 - smoothstep(0.30, 1.0, a));
  // the sand it moved, heaped just outside the rim
  float berm = min(vD, 0.8) * exp(-pow((a - 1.2) / 0.28, 2.0));
  gl_FragColor = vec4(dep, berm, 0.0, 1.0);
}`;

const COPY_VERT = `
varying vec2 vUv;
void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const COPY_FRAG = `
uniform sampler2D uSrc;
uniform vec2 uShift;
varying vec2 vUv;
void main() {
  vec2 uv = vUv + uShift;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  gl_FragColor = texture2D(uSrc, uv) * inside;
}`;

export class TrenchField {
  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {object} terrain  its `trail` uniforms are pointed at the map
   * @param {number} size     texels a side (1024 on high, 512 on low)
   */
  constructor(renderer, terrain, size = 1024) {
    this.r = renderer;
    this.N = size;
    this.texel = SPAN / size;
    const opt = {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
    };
    this.rt = [new THREE.WebGLRenderTarget(size, size, opt), new THREE.WebGLRenderTarget(size, size, opt)];
    this.cur = 0;
    this.cx = 0; this.cz = 0;
    this.u = terrain.trail;                          // { tex: {value}, box: {value: Vector3} }

    // the stamps: a quad per segment, rewritten every frame
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAXQ * 4 * 3);
    this.dep = new Float32Array(MAXQ * 4);
    const idx = new Uint16Array(MAXQ * 6);
    for (let q = 0; q < MAXQ; q++) idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 2, q * 4 + 1, q * 4 + 3], q * 6);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aDepth', new THREE.BufferAttribute(this.dep, 1).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo = g;
    this.stampMat = new THREE.ShaderMaterial({
      uniforms: { uCentre: { value: new THREE.Vector2() }, uHalf: { value: SPAN / 2 } },
      vertexShader: STAMP_VERT, fragmentShader: STAMP_FRAG,
      depthTest: false, depthWrite: false, toneMapped: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation, blendEquationAlpha: THREE.MaxEquation,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    });
    const stamps = new THREE.Mesh(g, this.stampMat);
    stamps.frustumCulled = false;
    this.stampScene = new THREE.Scene();
    this.stampScene.add(stamps);

    // the scroll: one triangle over the whole target
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.copyMat = new THREE.ShaderMaterial({
      uniforms: { uSrc: { value: null }, uShift: { value: new THREE.Vector2() } },
      vertexShader: COPY_VERT, fragmentShader: COPY_FRAG,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    const copy = new THREE.Mesh(tri, this.copyMat);
    copy.frustumCulled = false;
    this.copyScene = new THREE.Scene();
    this.copyScene.add(copy);
    this.cam = new THREE.Camera();                  // the shaders ignore it

    this.q = 0;                                     // stamps queued this frame
    this.last = new Map();                          // owner -> [last point per pod]
    this._clearNext = true;
    this._point();
  }

  /** Point the ground shader at the live target and its box. */
  _point() {
    this.u.tex.value = this.rt[this.cur].texture;
    this.u.box.value.set(this.cx, this.cz, 1 / SPAN);
  }

  /** The pod lifted, left soft ground, or teleported: the next stamp starts a new groove. */
  lift(owner, key) {
    const L = this.last.get(owner);
    if (L) L[key] = null;
  }

  /** Forget every groove (a new race). */
  clear() {
    this.last.clear();
    this.q = 0;
    this._clearNext = true;
  }

  /**
   * Cut the groove forward to (x, z): `w` its half-width in m, `depth` 0..1
   * how deep it reads (the pod's sink, and how soft the ground is).
   */
  lay(owner, key, x, z, w, depth) {
    let L = this.last.get(owner);
    if (!L) this.last.set(owner, L = []);
    const P = L[key];
    if (!P) { L[key] = { x, z, w, depth }; return; }
    const dx = x - P.x, dz = z - P.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return;
    if (d > 8) { L[key] = { x, z, w, depth }; return; }   // a jump, not a groove
    if (this.q < MAXQ) {
      const ux = dx / d, uz = dz / d, nx = -uz, nz = ux;
      // run each stamp past both of its ends, so the outside of a bend has
      // no wedge missing between two segments (max blending eats the overlap)
      const e0 = P.w * 0.7, e1 = w * 0.7;
      const x0 = P.x - ux * e0, z0 = P.z - uz * e0, x1 = x + ux * e1, z1 = z + uz * e1;
      const W0 = P.w * OUTER, W1 = w * OUTER;
      const p = this.pos, v = this.q * 12;
      p[v] = x0 + nx * W0; p[v + 1] = 1; p[v + 2] = z0 + nz * W0;
      p[v + 3] = x0 - nx * W0; p[v + 4] = -1; p[v + 5] = z0 - nz * W0;
      p[v + 6] = x1 + nx * W1; p[v + 7] = 1; p[v + 8] = z1 + nz * W1;
      p[v + 9] = x1 - nx * W1; p[v + 10] = -1; p[v + 11] = z1 - nz * W1;
      const k = this.q * 4;
      this.dep[k] = this.dep[k + 1] = P.depth;
      this.dep[k + 2] = this.dep[k + 3] = depth;
      this.q++;
    }
    L[key] = { x, z, w, depth };
  }

  /** Follow the player (scrolling the map if it has drifted), then draw this frame's stamps. */
  update(cx, cz) {
    const r = this.r;
    const ac = r.autoClear, rt0 = r.getRenderTarget();
    r.autoClear = false;
    if (this._clearNext) {
      // centre on the player and start blank
      this.cx = Math.round(cx / this.texel) * this.texel;
      this.cz = Math.round(cz / this.texel) * this.texel;
      const cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
      r.setClearColor(0x000000, 0);
      for (const t of this.rt) { r.setRenderTarget(t); r.clear(true, false, false); }
      r.setClearColor(cc, ca);
      this._clearNext = false;
      this._point();
    } else if (Math.abs(cx - this.cx) > RECENTRE || Math.abs(cz - this.cz) > RECENTRE) {
      // scroll by a whole number of texels, so the copy is exact
      const nx = Math.round(cx / this.texel) * this.texel, nz = Math.round(cz / this.texel) * this.texel;
      this.copyMat.uniforms.uSrc.value = this.rt[this.cur].texture;
      this.copyMat.uniforms.uShift.value.set((nx - this.cx) / SPAN, (nz - this.cz) / SPAN);
      this.cur ^= 1;
      r.setRenderTarget(this.rt[this.cur]);
      r.render(this.copyScene, this.cam);
      this.cx = nx; this.cz = nz;
      this._point();
    }
    if (this.q) {
      this.stampMat.uniforms.uCentre.value.set(this.cx, this.cz);
      const a = this.geo.attributes;
      a.position.clearUpdateRanges(); a.position.addUpdateRange(0, this.q * 12);
      a.aDepth.clearUpdateRanges(); a.aDepth.addUpdateRange(0, this.q * 4);
      a.position.needsUpdate = a.aDepth.needsUpdate = true;
      this.geo.setDrawRange(0, this.q * 6);
      r.setRenderTarget(this.rt[this.cur]);
      r.render(this.stampScene, this.cam);
      this.q = 0;
    }
    r.setRenderTarget(rt0);
    r.autoClear = ac;
  }
}
