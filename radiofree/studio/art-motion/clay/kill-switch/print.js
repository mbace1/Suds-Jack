// KILL SWITCH v2 — the leaflet as PRINT. The artwork is drawn once per ink plate through a context that knows
// which ink every colour belongs to, then the plates are laid onto paper the way a press would: each spot colour
// (safety yellow, red, blue) a hair off register, black overprinting, greys as a 45° halftone screen of black,
// the ink a little uneven, the edges a little fat, and the other side of the sheet showing through faintly.
//
// Artwork space is 900 × 1360 (the v1 leaflet); it prints at SC× for the texture.

export const AW = 900, AH = 1360;
const TAU = Math.PI * 2;

// the inks the artwork may use. A colour string is an ink by identity, so the separation is exact.
export const INK = {
  K: '#000001', Y: '#ffff01', R: '#ff0001', B: '#0000ff',
  T10: '#e0e0e1', T22: '#c0c0c1', T40: '#909091',   // tints of black: printed as a halftone screen
  W: '#ffffff',                                     // paper: knocks out whatever is under it
};
const PLATE_OF = Object.fromEntries(Object.entries(INK).map(([k, v]) => [v, k]));
// what each plate prints in, and how far off register it lands (texture px)
const PRESS = {
  Y: { ink: '#f4c400', off: [2.6, -1.6] }, R: { ink: '#d5262c', off: [-1.8, 2.0] }, B: { ink: '#1e5aa8', off: [1.4, 2.6] },
  K: { ink: '#1c1b1d', off: [0, 0] },
};
const TINT = { T10: 0.10, T22: 0.22, T40: 0.40 };

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** a 2D context that draws only one plate: its own ink solid, paper and other spot colours knocked out, black skipped (it overprints) */
function plateContext(real, plate) {
  let fill = INK.K, stroke = INK.K;
  const paint = (style, fn) => {
    const p = PLATE_OF[style]; if (!p) return;                       // gradients, unknown colours: not ink
    if (p === plate) { real.globalCompositeOperation = 'source-over'; return fn('#000'); }
    if (p === 'K' && plate !== 'K') return;                           // black overprints everything
    if (plate === 'K' && p !== 'W') return;                           // colour under black text/lines: black stays
    real.globalCompositeOperation = 'destination-out'; fn('#000'); real.globalCompositeOperation = 'source-over';
  };
  const wrap = {
    fill: (...a) => paint(fill, (c) => { real.fillStyle = c; real.fill(...a); }),
    stroke: (...a) => paint(stroke, (c) => { real.strokeStyle = c; real.stroke(...a); }),
    fillRect: (...a) => paint(fill, (c) => { real.fillStyle = c; real.fillRect(...a); }),
    strokeRect: (...a) => paint(stroke, (c) => { real.strokeStyle = c; real.strokeRect(...a); }),
    fillText: (...a) => paint(fill, (c) => { real.fillStyle = c; real.fillText(...a); }),
    strokeText: (...a) => paint(stroke, (c) => { real.strokeStyle = c; real.strokeText(...a); }),
  };
  return new Proxy(real, {
    get(t, k) { if (k in wrap) return wrap[k]; if (k === 'fillStyle') return fill; if (k === 'strokeStyle') return stroke; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
    set(t, k, v) { if (k === 'fillStyle') fill = v; else if (k === 'strokeStyle') stroke = v; else t[k] = v; return true; },
  });
}

/** the paper itself: warm off-white, fibre, a faint mottle, the two creases of a Z-fold */
function paperSheet(w, h, seed) {
  const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, rr = 40 + r() * 160, gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, r() < 0.5 ? 'rgba(120,100,70,.035)' : 'rgba(255,255,250,.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < w * h / 260; i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = 2 + r() * 9; g.strokeStyle = r() < 0.6 ? 'rgba(110,95,70,.07)' : 'rgba(255,255,255,.25)'; g.lineWidth = 0.6 + r() * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  return c;
}

/** a mottle mask: ink lies a little thicker in some places than others */
function mottle(w, h, seed) {
  const c = mk(w, h), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, rr = 10 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(0,0,0,${0.25 + r() * 0.3})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < w * h / 40; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 1, 1); }
  // the mask's alpha is the ink density (0.7–1)
  const out = mk(w, h), o = out.getContext('2d'); o.fillStyle = 'rgba(0,0,0,.72)'; o.fillRect(0, 0, w, h); o.drawImage(c, 0, 0); return out;
}

/** a 45° halftone screen of round dots at coverage t */
function screen(w, h, t, pitch) {
  const c = mk(w, h), g = c.getContext('2d'), r = pitch * Math.sqrt(t / Math.PI) * 1.02;
  g.fillStyle = '#000'; g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
  const R = Math.hypot(w, h) / 2 + pitch;
  for (let y = -R; y < R; y += pitch) for (let x = -R; x < R; x += pitch) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  return c;
}

/**
 * print(draw, opts) → a canvas. draw(g) paints the artwork in artwork space with INK colours.
 * opts: sc (texture scale), seed, through (an artwork function for the OTHER side, shown mirrored and faint)
 */
export function print(draw, { sc = 2.2, seed = 7, through = null } = {}) {
  const w = Math.round(AW * sc), h = Math.round(AH * sc);
  const out = paperSheet(w, h, seed), o = out.getContext('2d');
  const plate = (p) => { const c = mk(w, h), g = c.getContext('2d'); g.scale(sc, sc); draw(plateContext(g, p)); return c; };
  // the other side, through the paper: everything that is ink at all, mirrored, very faint
  if (through) {
    const all = mk(w, h), a = all.getContext('2d');
    for (const p of ['K', 'T40', 'T22', 'Y', 'R', 'B']) { const c = mk(w, h), g = c.getContext('2d'); g.scale(sc, sc); through(plateContext(g, p)); a.drawImage(c, 0, 0); }
    o.save(); o.globalAlpha = 0.055; o.translate(w, 0); o.scale(-1, 1); o.filter = 'blur(2.2px)'; o.globalCompositeOperation = 'multiply';
    const tint = mk(w, h), tg = tint.getContext('2d'); tg.drawImage(all, 0, 0); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#5a5248'; tg.fillRect(0, 0, w, h);
    o.drawImage(tint, 0, 0); o.restore();
  }
  const mot = mottle(w, h, seed + 3);
  const lay = (mask, ink, off, density = 1, gain = 0.55) => {
    const c = mk(w, h), g = c.getContext('2d');
    g.filter = `blur(${gain}px)`; g.drawImage(mask, off[0], off[1]); g.filter = 'none';  // dot gain: the ink spreads a little
    g.globalCompositeOperation = 'source-in'; g.fillStyle = ink; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(mot, 0, 0);                 // uneven ink
    o.save(); o.globalCompositeOperation = 'multiply'; o.globalAlpha = density; o.drawImage(c, 0, 0); o.restore();
  };
  // tints first, as halftone screens of black
  const pitch = 2.9 * sc;
  for (const [p, t] of Object.entries(TINT)) {
    const m = plate(p), s = screen(w, h, t, pitch), sg = s.getContext('2d');
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'destination-in'; sg.drawImage(m, 0, 0);
    lay(s, PRESS.K.ink, [0, 0], 0.92, 0.35);
  }
  for (const p of ['Y', 'R', 'B']) lay(plate(p), PRESS[p].ink, PRESS[p].off, 0.96);
  lay(plate('K'), PRESS.K.ink, PRESS.K.off, 0.97, 0.45);
  return out;
}
