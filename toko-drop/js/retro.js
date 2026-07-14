// Retro render pass (v151) — the shared cabinet renderer for the Arcade
// Tribute Wing. One low-resolution WebGLRenderTarget + a fullscreen-triangle
// post shader that applies, per cabinet profile: palette quantization (NES),
// posterize + paint pre-blur (16-bit), bright-pass glow (neon), subtle
// scanlines, contrast/saturation. Classic + SMASH never touch this: when no
// profile is active the game renders exactly as before.
//
// Art direction (user, 2026-07-13):
//   TOKOTRON — vector-monitor: neon lines, high contrast, near-full res
//   GAUNDROP — classic 8-bit NES palette + NES-sized pixels (240p class)
//   BINDING  — "paint meets 16-bit": soft pre-blur + 32-level posterize
import * as THREE from 'three';

// Real NES palette entries, torch-warm lean — Gaundrop's whole world snaps
// to these 16 colors in the post pass, and nesSnap() pre-snaps materials.
export const NES_PALETTE = [
  0x000000, 0x787878, 0xfcfcfc, 0x503000, 0xac7c00, 0xf8b800, 0xfca044,
  0x7c0800, 0xd82800, 0xfc7460, 0x00a800, 0xb8f818, 0x0058f8, 0x3cbcfc,
  0x6844fc, 0xf878f8,
];

// Tokotron neon set — used by the material dispatch for shells/lines.
export const NEON = {
  player: 0x00ffff, blob: 0x00ffee, cube: 0xff33cc, heavy: 0xffbb00,
  ranged: 0x33ff66, danger: 0xff2244, face: 0x070a12,
};

export function nesSnap(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  let best = NES_PALETTE[0], bd = Infinity;
  for (const p of NES_PALETTE) {
    const pr = (p >> 16) & 255, pg = (p >> 8) & 255, pb = p & 255;
    const d = (pr - r) * (pr - r) * 2 + (pg - g) * (pg - g) * 3 + (pb - b) * (pb - b);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

// shortSide: internal pixels on the short screen axis (0 → resFrac of buffer)
export const CABINET_PROFILES = {
  tokotron: { shortSide: 0,   resFrac: 0.7, filter: 'linear',  palette: null,
              scanline: 0.20, glow: 0.85, glowThresh: 0.5, contrast: 1.22, saturate: 1.15, posterize: 0,  blur: 0 },
  gaundrop: { shortSide: 240, resFrac: 0,   filter: 'nearest', palette: 'nes',
              scanline: 0.12, glow: 0.15, glowThresh: 0.75, contrast: 1.05, saturate: 1.0, posterize: 0,  blur: 0 },
  binding:  { shortSide: 400, resFrac: 0,   filter: 'nearest', palette: null,
              scanline: 0.10, glow: 0.25, glowThresh: 0.65, contrast: 1.0,  saturate: 0.88, posterize: 32, blur: 0.75 },
  preview:  { shortSide: 200, resFrac: 0,   filter: 'nearest', palette: null,
              scanline: 0.12, glow: 0.2,  glowThresh: 0.7, contrast: 1.0,  saturate: 1.0,  posterize: 0,  blur: 0 },
};

const POST_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const POST_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform sampler2D uPalette;
  uniform vec2  uRes;        // internal RT resolution
  uniform float uPaletteN;   // 0 = off, else palette entry count
  uniform float uPosterize;  // 0 = off, else levels per channel
  uniform float uScanline;
  uniform float uGlow;
  uniform float uGlowThresh;
  uniform float uContrast;
  uniform float uSaturate;
  uniform float uBlur;       // paint pre-blur radius in texels (0 = off)

  vec3 toSRGB(vec3 c) { return pow(max(c, 0.0), vec3(0.4545)); }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec2 px = 1.0 / uRes;
    vec3 c = texture2D(tDiffuse, vUv).rgb;

    // paint pre-blur (Binding): 4-tap tent — soft brushy blends
    if (uBlur > 0.0) {
      vec2 o = px * uBlur;
      c = (c * 2.0
        + texture2D(tDiffuse, vUv + vec2( o.x,  o.y)).rgb
        + texture2D(tDiffuse, vUv + vec2(-o.x,  o.y)).rgb
        + texture2D(tDiffuse, vUv + vec2( o.x, -o.y)).rgb
        + texture2D(tDiffuse, vUv + vec2(-o.x, -o.y)).rgb) / 6.0;
    }

    // bright-pass glow: 8-tap smear — the neon comes from here
    if (uGlow > 0.0) {
      vec3 g = vec3(0.0);
      vec2 o1 = px * 1.5, o2 = px * 3.5;
      g += texture2D(tDiffuse, vUv + vec2( o1.x, 0.0)).rgb;
      g += texture2D(tDiffuse, vUv + vec2(-o1.x, 0.0)).rgb;
      g += texture2D(tDiffuse, vUv + vec2(0.0,  o1.y)).rgb;
      g += texture2D(tDiffuse, vUv + vec2(0.0, -o1.y)).rgb;
      g += texture2D(tDiffuse, vUv + vec2( o2.x,  o2.y)).rgb;
      g += texture2D(tDiffuse, vUv + vec2(-o2.x,  o2.y)).rgb;
      g += texture2D(tDiffuse, vUv + vec2( o2.x, -o2.y)).rgb;
      g += texture2D(tDiffuse, vUv + vec2(-o2.x, -o2.y)).rgb;
      g *= 0.125;
      g *= step(uGlowThresh, luma(g));
      c += g * uGlow;
    }

    c = toSRGB(c);

    // grade
    c = mix(vec3(luma(c)), c, uSaturate);
    c = (c - 0.5) * uContrast + 0.5;

    if (uPaletteN > 0.0) {
      // nearest palette color (NES): 16-iteration search
      vec3 best = vec3(0.0);
      float bd = 1e9;
      for (int i = 0; i < 16; i++) {
        if (float(i) >= uPaletteN) break;
        vec3 p = texture2D(uPalette, vec2((float(i) + 0.5) / uPaletteN, 0.5)).rgb;
        vec3 d = c - p;
        float dist = dot(d * vec3(2.0, 3.0, 1.0), d);
        if (dist < bd) { bd = dist; best = p; }
      }
      c = best;
    } else if (uPosterize > 0.0) {
      // 2×2 ordered dither + posterize (SNES color-depth feel)
      vec2 ip = floor(vUv * uRes);
      float dith = (mod(ip.x + ip.y * 2.0, 4.0) / 4.0 - 0.375) / uPosterize;
      c = floor((c + dith) * uPosterize) / uPosterize;
    }

    // scanlines aligned to internal rows
    c *= 1.0 - uScanline * (0.5 + 0.5 * cos(vUv.y * uRes.y * 6.28318));

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;

export class RetroPass {
  constructor() {
    this._profile = null;
    this._rt = null;
    this._quadScene = null;
    this._quadCam = null;
    this._mat = null;
    this._paletteTex = null;
  }

  get active() { return !!this._profile; }

  _ensureQuad() {
    if (this._quadScene) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    this._mat = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tDiffuse:   { value: null },
        uPalette:   { value: null },
        uRes:       { value: new THREE.Vector2(1, 1) },
        uPaletteN:  { value: 0 },
        uPosterize: { value: 0 },
        uScanline:  { value: 0 },
        uGlow:      { value: 0 },
        uGlowThresh:{ value: 0.7 },
        uContrast:  { value: 1 },
        uSaturate:  { value: 1 },
        uBlur:      { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, this._mat);
    mesh.frustumCulled = false;
    this._quadScene = new THREE.Scene();
    this._quadScene.add(mesh);
    this._quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // NES palette as raw sRGB bytes — NoColorSpace so nothing re-converts it
    const data = new Uint8Array(NES_PALETTE.length * 4);
    NES_PALETTE.forEach((p, i) => {
      data[i * 4] = (p >> 16) & 255; data[i * 4 + 1] = (p >> 8) & 255;
      data[i * 4 + 2] = p & 255;     data[i * 4 + 3] = 255;
    });
    this._paletteTex = new THREE.DataTexture(data, NES_PALETTE.length, 1);
    this._paletteTex.colorSpace = THREE.NoColorSpace;
    this._paletteTex.magFilter = this._paletteTex.minFilter = THREE.NearestFilter;
    this._paletteTex.needsUpdate = true;
  }

  setCabinet(name, renderer) {
    const prof = name ? CABINET_PROFILES[name] : null;
    this._profile = prof || null;
    if (!prof) return;
    this._ensureQuad();
    this.setSize(renderer);
    const u = this._mat.uniforms;
    u.uPalette.value    = this._paletteTex;
    u.uPaletteN.value   = prof.palette === 'nes' ? NES_PALETTE.length : 0;
    u.uPosterize.value  = prof.posterize;
    u.uScanline.value   = prof.scanline;
    u.uGlow.value       = prof.glow;
    u.uGlowThresh.value = prof.glowThresh;
    u.uContrast.value   = prof.contrast;
    u.uSaturate.value   = prof.saturate;
    u.uBlur.value       = prof.blur;
  }

  setSize(renderer) {
    if (!this._profile || !renderer) return;
    const prof = this._profile;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    let iw, ih;
    if (prof.shortSide > 0) {
      const short = Math.min(size.x, size.y);
      const k = prof.shortSide / short;
      iw = Math.max(64, Math.round(size.x * k));
      ih = Math.max(64, Math.round(size.y * k));
    } else {
      iw = Math.max(64, Math.round(size.x * prof.resFrac));
      ih = Math.max(64, Math.round(size.y * prof.resFrac));
    }
    const filt = prof.filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
    if (!this._rt || this._rt.width !== iw || this._rt.height !== ih ||
        this._rt.texture.magFilter !== filt) {
      this._rt?.dispose();
      this._rt = new THREE.WebGLRenderTarget(iw, ih, {
        depthBuffer: true, minFilter: filt, magFilter: filt,
      });
    }
    this._mat.uniforms.uRes.value.set(iw, ih);
  }

  render(renderer, scene, camera) {
    renderer.setRenderTarget(this._rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    this._mat.uniforms.tDiffuse.value = this._rt.texture;
    renderer.render(this._quadScene, this._quadCam);
  }
}
