// The Game of Life — the screen the experiences are seen through.
//
// Everything is still drawn into a flat 192×128 2D canvas exactly as before.
// This module presents that canvas as a slightly curved terminal screen: a
// gentle barrel distortion, one scanline per source row, a soft phosphor bleed
// off the bright interactive elements, and a vignette that falls into the
// bezel. Restrained on purpose — no heavy bloom, no RGB separation. The goal is
// "you are looking into a monitor", not "a filter has been applied".
//
// The warp is real geometry, not decoration, so `PixelScreen.toPixel` runs the
// same function to turn a tap into a pixel — otherwise every hit test in every
// tappable experience would drift a few pixels toward the edges.
//
// If WebGL is not available the caller falls back to showing the flat canvas,
// and everything still works.

export const CURVE = 0.075;          // barrel strength; the whole look hangs off this

// The screen is the house look, but it is still a filter over art that is
// deliberately high-frequency — the ordered-dither scenes are 1px stipple, and
// some people will want to see it flat. main.js sets this from the stored
// preference before the first PixelScreen is built; makeCrt then behaves
// exactly as it does on a machine with no WebGL.
let enabled = true;
export function setEnabled(on) { enabled = !!on; }
export function isEnabled() { return enabled; }

// Overscan. Barrel distortion alone pushes the picture inward and leaves black
// bands down every side. Dividing by the bulge at the edge midpoints puts those
// back at the frame edge — so the picture fills the bezel, nothing is lost along
// the axes (the scenes draw right up to the edge on purpose: roots and sparks
// leave the frame there), and only the corners round off into the tube's shape.
const NORM = 1 / (1 + CURVE);

// screen → texture. The shader runs this exact formula, and so does toPixel.
export function warp(u, v) {
  const x = u * 2 - 1, y = v * 2 - 1;
  const k = (1 + CURVE * (x * x + y * y)) * NORM;
  return [(x * k) * 0.5 + 0.5, (y * k) * 0.5 + 0.5];
}

// texture → screen: where on the glass a given pixel of the picture appears.
// The warp is radial, so only the radius has to be inverted; four rounds of
// fixed-point iteration are exact to well under a pixel at this curvature.
// The test loop taps by picture coordinates and needs this to aim.
export function unwarp(u, v) {
  const x = u * 2 - 1, y = v * 2 - 1;
  const t = Math.hypot(x, y);
  if (t < 1e-6) return [u, v];
  let r = t;
  for (let i = 0; i < 4; i++) r = t / (NORM * (1 + CURVE * r * r));
  const s = r / t;
  return [(x * s) * 0.5 + 0.5, (y * s) * 0.5 + 0.5];
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  // top-left origin, so the uv space matches the 2D canvas and toPixel
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_src;        // source size in pixels
uniform vec3 u_accent;     // phosphor tint
uniform float u_glow;
uniform float u_scan;

vec2 warp(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c *= (1.0 + ${CURVE.toFixed(4)} * dot(c, c)) * ${NORM.toFixed(6)};
  return c * 0.5 + 0.5;
}

void main() {
  vec2 uv = warp(v_uv);
  // past the edge of the glass there is only the inside of the bezel
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec3 col = texture2D(u_tex, uv).rgb;

  // phosphor: bright things bleed a little light into their neighbours, tinted
  // toward the accent so the glow reads as one screen rather than per-colour
  vec3 bleed = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853981;
    vec2 o = vec2(cos(a), sin(a)) * 2.2 / u_src;
    bleed += texture2D(u_tex, clamp(uv + o, 0.0, 1.0)).rgb;
  }
  bleed /= 8.0;
  float lum = max(max(bleed.r, bleed.g), bleed.b);
  bleed *= smoothstep(0.42, 0.96, lum);
  col += bleed * mix(vec3(1.0), u_accent, 0.62) * u_glow;

  // one dark line per source row — the analog character, kept low
  float sl = 0.5 + 0.5 * cos(uv.y * u_src.y * 6.2831853);
  col *= 1.0 - u_scan * sl;

  // the corners of the tube fall away, and the very edge of the glass darkens
  vec2 c = v_uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  col *= 1.0 - 0.26 * r2 * r2;
  float edge = min(min(uv.x, 1.0 - uv.x) * u_src.x, min(uv.y, 1.0 - uv.y) * u_src.y);
  col *= smoothstep(0.0, 1.6, edge);

  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

// every live screen is presented from ONE rAF — the experiences already run
// their own loop, and a second timer per screen is a cost with no picture
const live = new Set();
let ticking = 0;

function tick() {
  ticking = requestAnimationFrame(tick);
  for (const c of live) c.present();
}

export function makeCrt(source, parent, accent = [0.21, 0.91, 0.85]) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-screen crt';
  canvas.setAttribute('aria-hidden', 'true');

  // preserveDrawingBuffer, because the canvas on the page is now this one and
  // it has to stay readable: main's "nothing opens frozen" gate samples
  // .pixel-screen with toDataURL, and a WebGL canvas without this returns an
  // empty buffer once the frame is composited — which reported every scene as
  // frozen. Cheap at this size, and it keeps screenshots working too.
  if (!enabled) return null;           // asked for the flat picture
  const opts = { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true };
  const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  if (!gl) return null;

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch {
    return null;                       // any driver trouble: fall back to flat
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // NEAREST, because the whole point is that the pixels stay pixels
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const u = {
    src: gl.getUniformLocation(prog, 'u_src'),
    accent: gl.getUniformLocation(prog, 'u_accent'),
    glow: gl.getUniformLocation(prog, 'u_glow'),
    scan: gl.getUniformLocation(prog, 'u_scan'),
  };
  gl.uniform2f(u.src, source.width, source.height);
  gl.uniform3f(u.accent, ...accent);
  gl.uniform1f(u.glow, 0.55);
  gl.uniform1f(u.scan, 0.095);

  let w = 0, h = 0, dead = false;

  function resize() {
    // the display buffer follows the element's real size, capped at 2× so a
    // desktop retina panel does not pay for four times the fragments
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (cw === w && ch === h) return;
    w = cw; h = ch;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  const api = {
    canvas,
    present() {
      if (dead) return;
      resize();
      if (!w || !h) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    setAccent(rgb) { gl.useProgram(prog); gl.uniform3f(u.accent, ...rgb); },
    destroy() {
      dead = true;
      live.delete(api);
      if (!live.size && ticking) { cancelAnimationFrame(ticking); ticking = 0; }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };

  parent.appendChild(canvas);
  live.add(api);
  if (!ticking) ticking = requestAnimationFrame(tick);
  return api;
}

// how many screens are being presented right now. A CRT that keeps drawing
// after its experience is gone is a leaked rAF against a dead context — the
// exact bug this project has had before, so the test loop watches for it.
export const liveCount = () => live.size;

// tell every screen on the page about a new accent colour
export function setAccentAll(rgb) { for (const c of live) c.setAccent(rgb); }
