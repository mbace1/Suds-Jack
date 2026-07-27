// TOKO MIDORI GAMES — the face.
//
// Four fat round-capped arcs and two stems. The mouth is two arcs opening up,
// nested. Each eye is one arc opening down with a stem dropped from the inside
// of its crown, which is what cuts the two slots that make the eye an eye.
// One stroke weight throughout, no fills, no corners.
//
// (The stems were arcs at first, on the theory that the whole mark was one
// move repeated. It is not: a small arc cannot both merge with the crown and
// hang as far as the artwork hangs it, and forcing it left a detached dot
// floating inside the arch. The artwork is right and the theory was wrong.)
//
// It is drawn from ONE geometry table below. `drawFace` strokes it onto a
// canvas and `svgFace` emits the same arcs as SVG path data, so the file you
// hand a printer and the thing on screen are the same object.
//
// Geometry lives in a 100-unit design box. Ink extends from about (0, 0) to
// (100, 90) — the mark is wider than it is tall.

const D = Math.PI / 180;

// ── the table ────────────────────────────────────────────────────────────
// Every number here was measured off the owner's master artwork. Change one
// and you are drawing a different logo; there is no "roughly".
export const GEO = {
  box: 100,

  // The single most sensitive number in the brand. At 11.6 the eye's two slots
  // close up and the arch renders as a blob with hairline cracks in it; the
  // master artwork carries a leg, a slot and a tab at roughly equal widths,
  // which puts the stroke at about a fifth of the mouth's radius.
  stroke: 8.46,

  eye: {
    dx: 30.05,         // from the centre line — the eyes sit a shade wider than the mouth
    cy: 20.20,
    outer: { r: 15.98, a0: 150, a1: 390 },   // opens downward, legs ~30° past horizontal
    // the stem, as centre-line y: starts just inside the crown so the cap
    // merges instead of bumping, and hangs to just above the leg ends
    stem: { y0: 5.20, y1: 27.20 },
  },

  mouth: {
    cx: 50,
    cy: 43.10,
    // both stop SHORT of a semicircle — the tips stand up straight rather than
    // hooking outward, and that is what keeps a clear band of air between the
    // mouth and the eye legs above it
    outer: { r: 42.30, a0: 4, a1: 176 },
    inner: { r: 16.40, a0: 10, a1: 170 },
  },
};

// the ink bounding box, in design units — what you actually align to
export function bounds() {
  const h = GEO.stroke / 2;
  const e = GEO.eye, m = GEO.mouth;
  return {
    x: (50 - e.dx) - e.outer.r - h,
    y: e.cy - e.outer.r - h,
    w: (e.dx + e.outer.r + h) * 2,
    h: (m.cy + m.outer.r + h) - (e.cy - e.outer.r - h),
  };
}

// ── the arcs ─────────────────────────────────────────────────────────────
// One list, used by the canvas painter and the SVG emitter alike.
export function arcs() {
  const e = GEO.eye, m = GEO.mouth;
  const out = [];
  for (const side of [-1, 1]) {
    const cx = 50 + side * e.dx;
    out.push({ cx, cy: e.cy, r: e.outer.r, a0: e.outer.a0, a1: e.outer.a1 });
    out.push({ stem: true, x: cx, y0: e.stem.y0, y1: e.stem.y1 });
  }
  out.push({ cx: m.cx, cy: m.cy, r: m.outer.r, a0: m.outer.a0, a1: m.outer.a1 });
  out.push({ cx: m.cx, cy: m.cy, r: m.inner.r, a0: m.inner.a0, a1: m.inner.a1 });
  return out;
}

// ── canvas ───────────────────────────────────────────────────────────────
// Draw the face into a `size`-wide box whose top-left is (x, y).
//
// `squash` scales the eyes vertically about their own centres — 0 is a blink.
// `grin` scales the mouth radius. Both are how the mark comes alive without
// ever leaving its own geometry.
export function drawFace(ctx, x, y, size, opts = {}) {
  const { color = '#000', squash = 1, grin = 1, stroke = GEO.stroke } = opts;
  const s = size / GEO.box;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const e = GEO.eye, m = GEO.mouth;

  for (const side of [-1, 1]) {
    const cx = 50 + side * e.dx;
    ctx.save();
    ctx.translate(cx, e.cy);
    ctx.scale(1, squash);
    ctx.beginPath();
    ctx.arc(0, 0, e.outer.r, e.outer.a0 * D, e.outer.a1 * D);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, e.stem.y0 - e.cy);
    ctx.lineTo(0, e.stem.y1 - e.cy);
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.outer.r * grin, m.outer.a0 * D, m.outer.a1 * D);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.inner.r * grin, m.inner.a0 * D, m.inner.a1 * D);
  ctx.stroke();

  ctx.restore();
}

// ── the two carriers ─────────────────────────────────────────────────────

// the app icon: the face on a rounded square, full bleed
export function drawIcon(ctx, x, y, size, opts = {}) {
  const { ground = '#000', ink = '#fff', radius = 0.18, pad = 0.10 } = opts;
  const r = size * radius;
  ctx.save();
  ctx.fillStyle = ground;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, size, size, r) : ctx.rect(x, y, size, size);
  ctx.fill();
  ctx.restore();
  const fw = size * (1 - pad * 2);
  const b = bounds();
  // centre the INK, not the design box — the mark hangs low in its own box
  drawFace(ctx, x + size * pad, y + (size - fw * (b.h / GEO.box)) / 2 - (b.y / GEO.box) * fw, fw, { color: ink });
}

// the badge: the face on a disc. This is the sticker, the pin, and the
// signature a game wears in its corner.
export function drawBadge(ctx, cx, cy, r, opts = {}) {
  const { ground = '#f0027f', ink = '#fff', fill = true } = opts;
  if (fill) {
    ctx.save();
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const fw = r * 1.42;                    // the face across the disc
  const b = bounds();
  drawFace(ctx, cx - fw / 2, cy - (b.y + b.h / 2) / GEO.box * fw, fw, { color: ink, ...opts.face });
}

// ── SVG ──────────────────────────────────────────────────────────────────
function arcPath(a) {
  if (a.stem) return `M${a.x} ${a.y0}L${a.x} ${a.y1}`;
  const p = (deg) => [
    (a.cx + Math.cos(deg * D) * a.r).toFixed(3),
    (a.cy + Math.sin(deg * D) * a.r).toFixed(3),
  ];
  const [x0, y0] = p(a.a0);
  const sweepDeg = a.a1 - a.a0;
  const large = Math.abs(sweepDeg) > 180 ? 1 : 0;
  const sweep = sweepDeg > 0 ? 1 : 0;
  // an arc of 360° or more cannot be expressed as one A command; the table
  // never uses one, but split defensively rather than emit a silent no-op
  if (Math.abs(sweepDeg) >= 360) {
    const [xm, ym] = p(a.a0 + sweepDeg / 2);
    return `M${x0} ${y0}A${a.r} ${a.r} 0 1 ${sweep} ${xm} ${ym}`
      + `A${a.r} ${a.r} 0 1 ${sweep} ${x0} ${y0}`;
  }
  const [x1, y1] = p(a.a1);
  return `M${x0} ${y0}A${a.r} ${a.r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

export function facePaths() { return arcs().map(arcPath); }

export function svgFace({ color = '#000', px = 4, ground = null, pad = 4 } = {}) {
  const b = bounds();
  const vw = b.w + pad * 2, vh = b.h + pad * 2;
  const body = facePaths()
    .map(d => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" `
    + `viewBox="${(b.x - pad).toFixed(2)} ${(b.y - pad).toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}" `
    + `width="${(vw * px).toFixed(0)}" height="${(vh * px).toFixed(0)}" role="img" `
    + `aria-label="Toko Midori Games">`
    + `<title>Toko Midori Games</title>`
    + (ground ? `<rect x="${b.x - pad}" y="${b.y - pad}" width="${vw}" height="${vh}" fill="${ground}"/>` : '')
    + `<g fill="none" stroke="${color}" stroke-width="${GEO.stroke}" `
    + `stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

export function svgBadge({ ground = '#f0027f', ink = '#fff', px = 4 } = {}) {
  const b = bounds();
  const R = 50;                                   // disc radius in its own units
  const fw = R * 1.42;
  const s = fw / GEO.box;
  const ox = R - fw / 2, oy = R - (b.y + b.h / 2) * s;
  const body = facePaths().map(d => `<path d="${d}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" `
    + `width="${100 * px / 4}" height="${100 * px / 4}" role="img" aria-label="Toko Midori Games">`
    + `<title>Toko Midori Games</title>`
    + `<circle cx="50" cy="50" r="50" fill="${ground}"/>`
    + `<g transform="translate(${ox.toFixed(3)} ${oy.toFixed(3)}) scale(${s.toFixed(5)})" `
    + `fill="none" stroke="${ink}" stroke-width="${GEO.stroke}" `
    + `stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
}

// the favicon: the badge, as a data URI, no file on disk
export function faviconHref(ground = '#f0027f', ink = '#fff') {
  return 'data:image/svg+xml,' + encodeURIComponent(svgBadge({ ground, ink }));
}
