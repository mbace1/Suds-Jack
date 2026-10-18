// The camera back: the city is rendered, then every cell of a character grid becomes ONE glyph.
//
//   scene ─▶ colour + depth (half resolution: a cell is all the detail there is)
//   scene ─▶ normals (the same view, MeshNormalMaterial)
//   cells ─▶ a glyph each: by brightness off the ramp " .:-=+*#%@"; where depth or normal break, the edge's own
//            angle in 45° buckets (_ / | \); rain falls down columns; and the LABEL grid — the city's writing, set
//            straight into cells — overrides all of it, so a sign says what it says, in the same type as the walls
//   glyphs ─▶ neon: a bright pass and a blur, added back; tone-mapped and encoded by hand
//
// One instance owns its targets; render() is a pure function of the scene, the camera and the options.

import * as THREE from 'three';
import { RAMP, EDGES, glyph, atlas } from './glyphs.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const ASCII = /* glsl */`
uniform sampler2D tScene, tNorm, tDepth, tAtlas, tLabel;
uniform vec2 uRes, uCell, uGrid, uAtlas;
uniform float uTime, uRain, uExp, uEdge, uDepthK, uBg, uNR, uEdge0, uRainHead, uRainMid, uRainTail;
uniform vec3 uTint, uRainCol;
varying vec2 vUv;
float h1(float n) { return fract(sin(n * 127.1 + 0.37) * 43758.5453); }
float sn(vec2 uv) { return dot(texture2D(tNorm, uv).rgb, vec3(0.9, 1.3, 0.7)); }
float sd(vec2 uv) { return texture2D(tDepth, uv).r; }
float cover(float gi, vec2 f) {
  float c = mod(gi, uAtlas.x), r = floor(gi / uAtlas.x);
  return texture2D(tAtlas, vec2((c + f.x) / uAtlas.x, (r + 1.0 - f.y) / uAtlas.y)).r;
}
void main() {
  vec2 px = gl_FragCoord.xy, cell = floor(px / uCell), f = fract(px / uCell);
  vec2 du = uCell / uRes, uv = (cell + 0.5) * du;
  vec3 col = (texture2D(tScene, uv + du * vec2(-0.25, -0.25)).rgb + texture2D(tScene, uv + du * vec2(0.25, -0.25)).rgb
            + texture2D(tScene, uv + du * vec2(-0.25, 0.25)).rgb + texture2D(tScene, uv + du * vec2(0.25, 0.25)).rgb) * 0.25;
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722)) * uExp;
  float gi = floor(clamp(pow(lum, 0.55), 0.0, 0.999) * uNR);              // the ramp sits first in the atlas
  float m = max(max(col.r, col.g), max(col.b, 1e-4));
  vec3 fg = col / m * (0.22 + 1.15 * pow(m * uExp, 0.7));
  // edges. Normals by a Sobel (a flat face has one normal, so it is zero there); depth by its SECOND difference, because
  // under this camera every plane is a depth ramp and a first difference calls the whole floor an edge
  float s00 = sn(uv + du * vec2(-1.0, -1.0)), s10 = sn(uv + du * vec2(0.0, -1.0)), s20 = sn(uv + du * vec2(1.0, -1.0));
  float s01 = sn(uv + du * vec2(-1.0, 0.0)), s21 = sn(uv + du * vec2(1.0, 0.0));
  float s02 = sn(uv + du * vec2(-1.0, 1.0)), s12 = sn(uv + du * vec2(0.0, 1.0)), s22 = sn(uv + du * vec2(1.0, 1.0));
  float gx = (s20 + 2.0 * s21 + s22) - (s00 + 2.0 * s01 + s02), gy = (s02 + 2.0 * s12 + s22) - (s00 + 2.0 * s10 + s20);
  float d0 = sd(uv), dl = sd(uv - vec2(du.x, 0.0)), dr = sd(uv + vec2(du.x, 0.0)), db = sd(uv - vec2(0.0, du.y)), dt = sd(uv + vec2(0.0, du.y));
  float lx = abs(dl + dr - 2.0 * d0), ly = abs(db + dt - 2.0 * d0);
  if (length(vec2(gx, gy)) < uEdge && (lx + ly) * uDepthK > 1.0) { gx = (dr - dl) * (lx + 1e-6); gy = (dt - db) * (ly + 1e-6); }   // a silhouette with no normal break
  if ((length(vec2(gx, gy)) > uEdge || (lx + ly) * uDepthK > 1.0) && lum < 1.4) {
    float a = mod(atan(gy / uCell.y, gx / uCell.x) + 1.5708 + 0.3927, 3.14159);    // the line's own angle, in screen pixels
    gi = uEdge0 + floor(a / 0.7854);                                              // _ / | \\ sit next in the atlas
    fg = fg * 0.8 + vec3(0.05, 0.065, 0.1);
  }
  // rain: some columns at a time, a head and a trail, falling past everything that is not itself lit
  float rowT = uGrid.y - 1.0 - cell.y, r = h1(cell.x * 1.37);
  float on = step(h1(cell.x * 0.71 + floor(uTime * 0.35 + r * 7.0) * 3.3), uRain);
  float v = 18.0 + 16.0 * h1(cell.x + 9.2), head = mod(uTime * v + r * 400.0, uGrid.y + 24.0) - 6.0, dist = head - rowT;
  if (on > 0.5 && dist >= 0.0 && dist < 7.0 && lum < 0.9) {
    gi = dist < 1.0 ? uRainHead : dist < 3.0 ? uRainMid : uRainTail;
    fg = uRainCol * (1.2 - dist / 7.0);
  }
  // the city's writing: set into the grid, over everything
  vec4 L = texture2D(tLabel, (cell + 0.5) / uGrid);
  vec3 bg = col * uBg + uTint;
  if (L.a > 0.0) { gi = floor(L.a * 255.0 + 0.5) - 1.0; fg = L.rgb * L.rgb * 3.0; bg *= 0.3; }
  gl_FragColor = vec4(mix(bg, fg, cover(gi, f)), 1.0);
}`;
const BRIGHT = /* glsl */`
uniform sampler2D tSrc; uniform float uTh; varying vec2 vUv;
void main() { vec3 c = texture2D(tSrc, vUv).rgb; gl_FragColor = vec4(max(c - uTh, 0.0), 1.0); }`;
const BLUR = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;
  c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;
  c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;
const COMP = /* glsl */`
uniform sampler2D tSrc, tBloom; uniform float uBloom, uVig, uScan, uFade; uniform vec2 uRes; varying vec2 vUv;
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb + texture2D(tBloom, vUv).rgb * uBloom;
  vec2 q = vUv - 0.5; c *= 1.0 - uVig * dot(q, q) * 2.2;
  c *= 1.0 - uScan * step(1.5, mod(gl_FragCoord.y, 3.0));
  c = aces(c * uFade);
  gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);
}`;

export class Ascii {
  constructor(renderer, W, H, { cw = 10, ch = 18, scale = 0.5 } = {}) {
    this.r = renderer; this.W = W; this.H = H; this.cw = cw; this.ch = ch;
    this.cols = Math.ceil(W / cw); this.rows = Math.ceil(H / ch);
    const sw = Math.round(W * scale), sh = Math.round(H * scale), HF = THREE.HalfFloatType, LIN = THREE.LinearFilter;
    const dt = new THREE.DepthTexture(sw, sh); dt.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(sw, sh, { type: HF, depthTexture: dt, minFilter: LIN, magFilter: LIN });
    this.rtNorm = new THREE.WebGLRenderTarget(sw, sh, { type: HF, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.rtAscii = new THREE.WebGLRenderTarget(W, H, { type: HF });
    this.rtB1 = new THREE.WebGLRenderTarget(W >> 2, H >> 2, { type: HF, minFilter: LIN, magFilter: LIN });
    this.rtB2 = this.rtB1.clone();
    this.atlas = atlas(cw, ch);
    this.label = new Uint8Array(this.cols * this.rows * 4);
    this.labelTex = new THREE.DataTexture(this.label, this.cols, this.rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.labelTex.magFilter = this.labelTex.minFilter = THREE.NearestFilter;
    this.normMat = new THREE.MeshNormalMaterial();
    const U = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));
    this.ascii = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ASCII, depthTest: false, depthWrite: false, uniforms: U({
      tScene: this.rtScene.texture, tNorm: this.rtNorm.texture, tDepth: dt, tAtlas: this.atlas.tex, tLabel: this.labelTex,
      uRes: new THREE.Vector2(W, H), uCell: new THREE.Vector2(cw, ch), uGrid: new THREE.Vector2(this.cols, this.rows), uAtlas: new THREE.Vector2(this.atlas.cols, this.atlas.rows),
      uTime: 0, uRain: 0.18, uExp: 2.6, uEdge: 0.7, uDepthK: 900, uBg: 0.05, uNR: RAMP.length, uEdge0: glyph(EDGES[0]),
      uRainHead: glyph('|'), uRainMid: glyph(':'), uRainTail: glyph('.'), uTint: new THREE.Vector3(0.004, 0.004, 0.01), uRainCol: new THREE.Vector3(0.36, 0.52, 0.8) }) });
    this.bright = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BRIGHT, uniforms: U({ tSrc: null, uTh: 0.55 }), depthTest: false, depthWrite: false });
    this.blur = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: U({ tSrc: null, uDir: new THREE.Vector2() }), depthTest: false, depthWrite: false });
    this.comp = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: COMP, depthTest: false, depthWrite: false,
      uniforms: U({ tSrc: this.rtAscii.texture, tBloom: this.rtB1.texture, uBloom: 0.9, uVig: 0.5, uScan: 0.07, uFade: 1, uRes: new THREE.Vector2(W, H) }) });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ascii); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  // ---- the label grid: rows counted from the TOP, as text is
  clear() { this.label.fill(0); }
  put(col, row, str, color = [1, 1, 1]) {
    const c = typeof color === 'string' ? new THREE.Color(color).toArray() : color;
    [...str].forEach((s, i) => {
      const x = col + i, y = this.rows - 1 - row; if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
      const o = (y * this.cols + x) * 4; this.label[o] = c[0] * 255; this.label[o + 1] = c[1] * 255; this.label[o + 2] = c[2] * 255; this.label[o + 3] = glyph(s) + 1;
    });
  }
  fill(col, row, w, h, ch = ' ', color = [0, 0, 0]) { for (let y = 0; y < h; y++) this.put(col, row + y, ch.repeat(Math.max(0, w)), color); }
  putV(col, row, str, color) { [...str].forEach((s, i) => this.put(col, row + i, s, color)); }
  /** a world point to [col, row] of the grid (row from the top) */
  cell(v, camera) { const p = v.clone().project(camera); return [Math.floor((p.x + 1) / 2 * this.W / this.cw), Math.floor((1 - p.y) / 2 * this.H / this.ch)]; }
  /** rasterise a drawing into glyphs: draw(ctx, w, h) paints white on a w×h canvas of CELLS; coverage picks the shade */
  stamp(col, row, w, h, draw, color, ramp = ' .:+#@', sub = 4) {
    const c = document.createElement('canvas'); c.width = w * sub; c.height = h * sub * this.ch / this.cw;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; draw(g, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data, ph = c.height / h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, n = 0; for (let yy = Math.floor(y * ph); yy < Math.floor((y + 1) * ph); yy++) for (let xx = x * sub; xx < (x + 1) * sub; xx++) { s += d[(yy * c.width + xx) * 4]; n++; }
      const k = s / n / 255; if (k > 0.08) this.put(col + x, row + y, ramp[Math.min(ramp.length - 1, Math.round(k * (ramp.length - 1)))] || ' ', color);
    }
  }

  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
  render(scene, camera, o = {}) {
    const r = this.r, A = this.ascii.uniforms;
    r.setRenderTarget(this.rtScene); r.clear(); r.render(scene, camera);
    const bg = scene.background, fog = scene.fog; scene.overrideMaterial = this.normMat; scene.background = null; scene.fog = null;
    r.setRenderTarget(this.rtNorm); r.setClearColor(0x000000, 1); r.clear(); r.render(scene, camera);
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
    this.labelTex.needsUpdate = true;
    A.uTime.value = o.time ?? 0; for (const k of ['rain', 'exp', 'edge', 'bg']) if (o[k] !== undefined) A['u' + k[0].toUpperCase() + k.slice(1)].value = o[k];
    this.pass(this.ascii, this.rtAscii);
    this.bright.uniforms.tSrc.value = this.rtAscii.texture; this.bright.uniforms.uTh.value = o.threshold ?? 0.55; this.pass(this.bright, this.rtB1);
    for (const s of [1, 2]) {
      this.blur.uniforms.tSrc.value = this.rtB1.texture; this.blur.uniforms.uDir.value.set(s / this.rtB1.width, 0); this.pass(this.blur, this.rtB2);
      this.blur.uniforms.tSrc.value = this.rtB2.texture; this.blur.uniforms.uDir.value.set(0, s / this.rtB1.height); this.pass(this.blur, this.rtB1);
    }
    const C = this.comp.uniforms; C.tSrc.value = o.raw ? this.rtScene.texture : this.rtAscii.texture;   // ?raw: the city before it is written
    C.uBloom.value = o.raw ? 0 : o.bloom ?? 0.9; C.uFade.value = o.fade ?? 1; C.uScan.value = o.scan ?? 0.07;
    this.pass(this.comp, null);
  }
}
