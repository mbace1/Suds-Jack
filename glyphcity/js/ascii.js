// The ASCII pass — the whole look lives here.
//
// The city is rendered as an ordinary three.js scene into a render target
// (colour + depth), and this pass redraws the screen as a grid of characters:
//
//   * each cell averages the colour under it; its BRIGHTNESS picks a glyph off
//     a density ramp, its HUE colours the glyph — so a neon sign stays pink and
//     a lit window stays amber, rather than everything going one terminal green
//   * the DEPTH buffer is read one cell apart: a Laplacian finds the silhouettes
//     (zero on any plane, so floors and walls are not outlined) and a Sobel
//     gives their direction; there the ramp is overridden by a line glyph
//     (| - / \) chosen by that direction — that is what makes a box read as a box
//     instead of as a smear of '#'
//   * the very brightest cells (signs, the hologram, a held shard) shimmer
//     through a set of data glyphs, so light looks like it is MADE of text
//   * an overlay grid (cols x rows, one texel per cell) carries the HUD and the
//     title as real characters in the same grid, so a canvas capture of the
//     game includes them and the type never fights the picture
//
// The glyphs are drawn once into an atlas (printable ASCII, 32..126) with the
// page's monospace font. Nothing here knows about the city.

import * as THREE from '../vendor/three.module.min.js';

export const RAMP = ' .:-=+*#%@';
const EDGE = '|-/\\';
const DATA = '01$&<>{}[]=';
const ATLAS_COLS = 16, ATLAS_ROWS = 6, GW = 24, GH = 40;

// palettes: 0 keeps the scene's own colour, the rest remap brightness to one
// hue (mono phosphor) or two (duotone). `ink` is the glyph, `paper` the cell.
export const PALETTES = [
  { id: 'neon',    name: 'NEON',     mode: 0, ink: [1, 1, 1],          paper: [0.02, 0.02, 0.035] },
  { id: 'phosphor',name: 'PHOSPHOR', mode: 1, ink: [0.35, 1.0, 0.45],  paper: [0.0, 0.03, 0.01] },
  { id: 'amber',   name: 'AMBER',    mode: 1, ink: [1.0, 0.68, 0.18],  paper: [0.035, 0.02, 0.0] },
  { id: 'ice',     name: 'ICE',      mode: 1, ink: [0.62, 0.92, 1.0],  paper: [0.0, 0.02, 0.04] },
  { id: 'toko',    name: 'MAGENTA',  mode: 2, ink: [0.94, 0.01, 0.5],  paper: [0.0, 0.0, 0.0], ink2: [1, 1, 1] },
  { id: 'vapor',   name: 'VAPOR',    mode: 2, ink: [0.2, 0.95, 1.0],   paper: [0.03, 0.0, 0.05], ink2: [1.0, 0.3, 0.85] },
];

function buildAtlas() {
  const c = document.createElement('canvas');
  c.width = ATLAS_COLS * GW; c.height = ATLAS_ROWS * GH;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `bold ${Math.round(GH * 0.78)}px "DejaVu Sans Mono", "Menlo", "Consolas", "Courier New", monospace`;
  for (let i = 0; i < 95; i++) {
    const ch = String.fromCharCode(32 + i);
    const x = (i % ATLAS_COLS) * GW, y = Math.floor(i / ATLAS_COLS) * GH;
    g.fillText(ch, x + GW / 2, y + GH / 2 + 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

const codes = (s) => [...s].map((ch) => ch.charCodeAt(0));
const glsl = (arr) => `int[${arr.length}](${arr.join(',')})`;

const FRAG = `
precision highp float;
uniform sampler2D tScene, tDepth, tAtlas, tOverlay;
uniform vec2 resolution, grid;          // drawing-buffer px, cols/rows
uniform float time, edgeK, mode, raw;
uniform vec3 ink, ink2, paper;
varying vec2 vUv;

const int RAMP_N = ${RAMP.length};
const int RAMP[RAMP_N] = ${glsl(codes(RAMP))};
const int EDGEC[4] = ${glsl(codes(EDGE))};
const int DATA_N = ${DATA.length};
const int DATAC[DATA_N] = ${glsl(codes(DATA))};

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float glyph(int code, vec2 cuv) {
  float idx = float(code - 32);
  float ax = mod(idx, ${ATLAS_COLS}.0), ay = floor(idx / ${ATLAS_COLS}.0);
  vec2 uv = vec2((ax + cuv.x) / ${ATLAS_COLS}.0, (ay + 1.0 - cuv.y) / ${ATLAS_ROWS}.0);
  return texture2D(tAtlas, uv).r;
}

float depthAt(vec2 uv) { return texture2D(tDepth, uv).r; }

void main() {
  vec2 cellPx = resolution / grid;
  vec2 cell = floor(gl_FragCoord.xy / cellPx);
  vec2 cuv = fract(gl_FragCoord.xy / cellPx);
  vec2 c = (cell + 0.5) / grid;           // centre of this cell, uv
  vec2 step = 1.0 / grid;

  if (raw > 0.5) { gl_FragColor = vec4(texture2D(tScene, vUv).rgb, 1.0); return; }

  // colour under the cell: 3x3 taps across it
  // the MEAN picks the ramp glyph; the BRIGHTEST tap is kept apart, because
  // a lit window averaged into its wall is just a noisier wall — kept apart it
  // is a point of light, which is what a window at night is
  vec3 col = vec3(0.0), hot = vec3(0.0);
  float hotL = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    // the target is LINEAR light; glyph choice is a perceptual question, so
    // it is asked in display gamma or every dark tone lands on one glyph
    vec3 s = pow(max(texture2D(tScene, c + vec2(float(i), float(j)) * step * 0.33).rgb, 0.0), vec3(0.4545));
    col += s;
    float sl = dot(s, vec3(0.299, 0.587, 0.114));
    if (sl > hotL) { hotL = sl; hot = s; }
  }
  col /= 9.0;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  bool spark = hotL > 0.62 && hotL > lum * 1.45;

  // silhouettes: Sobel over depth, one cell apart
  float tl = depthAt(c + step * vec2(-1, 1)), t = depthAt(c + step * vec2(0, 1)), tr = depthAt(c + step * vec2(1, 1));
  float l = depthAt(c + step * vec2(-1, 0)),                                     r = depthAt(c + step * vec2(1, 0));
  float bl = depthAt(c + step * vec2(-1, -1)), b = depthAt(c + step * vec2(0, -1)), br = depthAt(c + step * vec2(1, -1));
  float gx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
  float gy = (tl + 2.0 * t + tr) - (bl + 2.0 * b + br);
  // a plane has a constant depth gradient, so the gradient alone would outline
  // every floor; the Laplacian is zero on a plane and large at a step. Only
  // the NEARER side of a step is marked, so outlines are one cell thick.
  float d0 = depthAt(c);
  float edge = ((l + r + t + b) - 4.0 * d0) * edgeK;

  int code;
  float bright;
  if (edge > 1.0) {
    // the edge runs perpendicular to the gradient
    float a = atan(gy, gx);
    float q = mod(floor((a + 3.14159265 / 8.0) / (3.14159265 / 4.0)), 4.0);
    // q: 0 gradient horizontal -> vertical line, 1 diag, 2 vertical -> horizontal line, 3 other diag
    code = q < 0.5 ? EDGEC[0] : q < 1.5 ? EDGEC[3] : q < 2.5 ? EDGEC[1] : EDGEC[2];
    bright = max(lum * 1.3, 0.5);
  } else {
    // a black point: the empty street is blank, not a field of dots — the
    // blank cells are what give the forms an outside
    float k = clamp((lum - 0.14) * 1.45, 0.0, 0.999);
    code = RAMP[int(k * float(RAMP_N))];
    bright = 0.3 + lum * 1.1;
    if (spark) {
      // a point of light on a dark face: one dense glyph in the light's colour
      code = hotL > 0.75 ? 35 : 111;           // '#' or 'o'
      col = hot; lum = hotL * 0.75;
      bright = 0.4 + hotL * 0.8;
    }
    // light is made of text: the hottest cells cycle through data glyphs
    if (lum > 0.86) {
      float h = hash(cell + floor(time * 9.0 + hash(cell) * 9.0));
      code = DATAC[int(h * float(DATA_N))];
    }
  }

  // HUD / title overlay — real characters in the same grid
  vec4 ov = texture2D(tOverlay, c);
  int ocode = int(ov.r * 255.0 + 0.5);

  vec3 hue = col / max(max(col.r, max(col.g, col.b)), 1e-3);
  vec3 g3;
  vec3 bg;
  if (mode < 0.5) {
    // edges keep a cool neutral so outlines read on any colour of wall
    vec3 h3 = edge > 1.0 ? mix(hue, vec3(0.7, 0.8, 1.0), 0.5) : hue;
    g3 = mix(h3, vec3(1.0), smoothstep(0.8, 1.3, lum)) * bright;
    bg = paper + col * col * 0.12;
  } else if (mode < 1.5) {
    g3 = ink * bright;
    bg = paper + ink * lum * 0.12;
  } else {
    // duotone: dark half in ink, hot half toward ink2
    g3 = mix(ink, ink2, smoothstep(0.35, 0.9, lum)) * bright;
    bg = paper + ink * lum * 0.1;
  }

  float m = glyph(code, cuv);
  vec3 outc = bg + g3 * m;

  if (ocode >= 128) {
    // a SOFT glyph (rain): only shows where the scene is dark, and keeps the
    // cell's own background — weather falls in front of the street, not the signs
    if (lum < 0.3 && !spark && edge <= 1.0) outc = bg + ov.gba * glyph(ocode - 128, cuv);
  } else if (ocode == 1) {
    outc = paper * 0.6;                       // an opaque panel cell
  } else if (ocode > 1) {
    vec3 oc = ov.gba;
    if (mode > 0.5) oc = mix(ink, mode > 1.5 ? ink2 : vec3(1.0), dot(oc, vec3(0.333)) * 0.6);
    outc = paper * 0.6 + oc * glyph(ocode, cuv);
  }

  // a faint phosphor row seam, so the grid reads as a screen
  outc *= 0.9 + 0.1 * smoothstep(0.0, 0.18, cuv.y);
  gl_FragColor = vec4(outc, 1.0);
}`;

export class AsciiPass {
  constructor(renderer) {
    this.renderer = renderer;
    this.cellCss = { w: 10, h: 18 };
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.rt.depthTexture.type = THREE.UnsignedIntType;
    this.cols = 1; this.rows = 1;
    this.overlayData = new Uint8Array(4);
    this.overlay = new THREE.DataTexture(this.overlayData, 1, 1, THREE.RGBAFormat);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        tAtlas: { value: buildAtlas() }, tOverlay: { value: this.overlay },
        resolution: { value: new THREE.Vector2() }, grid: { value: new THREE.Vector2() },
        time: { value: 0 }, edgeK: { value: 260 }, mode: { value: 0 }, raw: { value: 0 },
        ink: { value: new THREE.Vector3(1, 1, 1) }, ink2: { value: new THREE.Vector3(1, 1, 1) },
        paper: { value: new THREE.Vector3() },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: FRAG,
      depthTest: false, depthWrite: false,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.qscene = new THREE.Scene(); this.qscene.add(this.quad);
    this.qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.setPalette(0);
  }

  setPalette(i) {
    const p = PALETTES[(i + PALETTES.length) % PALETTES.length];
    const u = this.mat.uniforms;
    u.mode.value = p.mode;
    u.ink.value.set(...p.ink); u.ink2.value.set(...(p.ink2 || p.ink)); u.paper.value.set(...p.paper);
    this.palette = p;
    return p;
  }

  // the grid is sized in CSS px so a phone and a 4K screen get the same
  // character size; the shader works in drawing-buffer px
  resize(wPx, hPx, dpr) {
    const cols = Math.max(20, Math.round(wPx / (this.cellCss.w * dpr)));
    const rows = Math.max(12, Math.round(hPx / (this.cellCss.h * dpr)));
    this.rt.setSize(wPx, hPx);
    this.mat.uniforms.resolution.value.set(wPx, hPx);
    this.mat.uniforms.grid.value.set(cols, rows);
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols; this.rows = rows;
      this.overlay.dispose();
      this.overlayData = new Uint8Array(cols * rows * 4);
      this.overlay = new THREE.DataTexture(this.overlayData, cols, rows, THREE.RGBAFormat);
      this.overlay.magFilter = this.overlay.minFilter = THREE.NearestFilter;
      this.overlay.needsUpdate = true;
      this.mat.uniforms.tOverlay.value = this.overlay;
    }
  }

  // ---- overlay writer: rows counted from the TOP, like text ----
  clear() { this.overlayData.fill(0); }
  // soft: drawn only over dark cells, under everything else (see the shader)
  soft(col, row, code, rgb) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    const i = ((this.rows - 1 - row) * this.cols + col) * 4;
    if (this.overlayData[i] !== 0) return;
    this.put(col, row, code + 128, rgb);
  }
  put(col, row, code, rgb) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return;
    const i = ((this.rows - 1 - row) * this.cols + col) * 4;
    const d = this.overlayData;
    d[i] = code; d[i + 1] = rgb[0]; d[i + 2] = rgb[1]; d[i + 3] = rgb[2];
  }
  text(col, row, s, rgb = [230, 240, 255]) {
    for (let k = 0; k < s.length; k++) {
      const c = s.charCodeAt(k);
      this.put(col + k, row, c === 32 ? 1 : (c >= 33 && c <= 126 ? c : 63), rgb);
    }
  }
  panel(col, row, w, h) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.put(col + x, row + y, 1, [0, 0, 0]);
  }
  flush() { this.overlay.needsUpdate = true; }

  render(scene, camera, time) {
    const r = this.renderer;
    this.mat.uniforms.time.value = time;
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.qscene, this.qcam);
  }
}

// draw a string big into a canvas and read it back as characters — the title
// is set in the same grid as everything else
export function bigText(str, rows, fontPx = 64) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  const font = `900 ${fontPx}px "DejaVu Sans Mono", monospace`;
  g.font = font;
  const w = Math.ceil(g.measureText(str).width) + 4;
  c.width = w; c.height = fontPx + 8;
  g.font = font; g.fillStyle = '#fff'; g.textBaseline = 'middle';
  g.fillText(str, 2, c.height / 2);
  const img = g.getImageData(0, 0, c.width, c.height).data;
  // characters are ~1.75x taller than wide, so sample columns twice as densely
  const cellH = c.height / rows, cellW = cellH / 1.75;
  const cols = Math.floor(c.width / cellW);
  const out = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      let s = 0, n = 0;
      for (let yy = 0; yy < 3; yy++) for (let xx = 0; xx < 3; xx++) {
        const px = Math.floor((x + (xx + 0.5) / 3) * cellW), py = Math.floor((y + (yy + 0.5) / 3) * cellH);
        s += img[(py * c.width + px) * 4]; n++;
      }
      const v = s / n / 255;
      line += v > 0.7 ? '@' : v > 0.45 ? '%' : v > 0.2 ? '*' : v > 0.06 ? '.' : ' ';
    }
    out.push(line);
  }
  return out;
}
