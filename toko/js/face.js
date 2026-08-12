// TOKO MIDORI GAMES — the face.
//
// The mouth is two round-capped arcs opening up, nested.
//
// THE EYE HAS TWO STATES, and the logo is the closed one.
//
//   CLOSED (open: 0) — an upside-down U. A semicircle crown, two straight
//     parallel legs, and NOTHING between them. This is the anime happy eye,
//     smiling with the eyes shut, and it is the logo. It is the default and
//     it is what every resting mark wears.
//   OPEN (open: 1) — the same U with a pupil line down the middle of it.
//
// Getting here took four wrong answers, all of them the same mistake — leaving
// something in the middle of a face that is meant to be smiling with its eyes
// closed: a small arc nested inside (a dot floating in the arch), a stem that
// made the eye read as an "m", one arc swept 240° for crown and legs together
// (it curls under and closes into a ring — an eyeball stuck on the face), and
// that arc stopped at 200° (no ring, but the legs never come down).
//
// The crown and the legs are separate strokes because a single arc can be a
// ring or a dome but never an arch.
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
    // From the centre line. Set so the eye's OUTER edge lands flush with the
    // mouth's outer edge: dx + r + stroke/2 == mouthR + stroke/2. They were
    // 3.7 units wider than the mouth on each side, which reads as a wobble
    // rather than a decision.
    dx: 26.32,
    cy: 20.20,
    // A CROWN plus two STRAIGHT LEGS, and nothing between them.
    //
    // A single arc cannot make this shape: swept past 180° it curls inward and
    // closes into a ring, stopped short of 180° the legs never come down. The
    // sides are parallel because everything else in this face is flat-sided.
    outer: { r: 15.98, a0: 180, a1: 360 },
    legs: { y: 28.10 },        // centre-line y the legs drop to
    // the pupil, drawn ONLY when the eyes are open. Measured off the artwork,
    // which is why it hangs from inside the crown rather than floating.
    pupil: { y0: 5.20, y1: 25.40 },
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
export function arcs({ open = 0 } = {}) {
  const e = GEO.eye, m = GEO.mouth;
  const out = [];
  for (const side of [-1, 1]) {
    const cx = 50 + side * e.dx;
    out.push({ cx, cy: e.cy, r: e.outer.r, a0: e.outer.a0, a1: e.outer.a1 });
    for (const s2 of [-1, 1])
      out.push({ line: true, x: cx + s2 * e.outer.r, y0: e.cy, y1: e.legs.y });
    if (open > 0) out.push({ line: true, x: cx, y0: e.pupil.y0,
      y1: e.pupil.y0 + (e.pupil.y1 - e.pupil.y0) * Math.min(1, open) });
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
  // `open` 0..1 lifts the lids: 0 is the logo (eyes shut, smiling), 1 draws
  // the pupil. `squash` is separate — that is a lid actually closing.
  const { color = '#000', squash = 1, grin = 1, open = 0, stroke = GEO.stroke } = opts;
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
    for (const s2 of [-1, 1]) {                 // the legs, straight and parallel
      ctx.beginPath();
      ctx.moveTo(s2 * e.outer.r, 0);
      ctx.lineTo(s2 * e.outer.r, e.legs.y - e.cy);
      ctx.stroke();
    }
    if (open > 0.001) {                         // the pupil, when he looks up
      ctx.beginPath();
      ctx.moveTo(0, e.pupil.y0 - e.cy);
      ctx.lineTo(0, (e.pupil.y0 + (e.pupil.y1 - e.pupil.y0) * Math.min(1, open)) - e.cy);
      ctx.stroke();
    }
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
  if (a.line) return `M${a.x} ${a.y0}L${a.x} ${a.y1}`;
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

export function facePaths(opts) { return arcs(opts).map(arcPath); }

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

// ── the head ─────────────────────────────────────────────────────────────
// "TOKO MIDORI is the one, the person." The face reversed out of a bust — a
// rounded head on a short neck. This is the character, as opposed to the mark:
// it is what goes on a sign, a sticker, a pin, a stage.
//
// A 100 × 132 silhouette. The face sits high in the head, on the crown's
// centre, not on the silhouette's centre — the neck is not part of the face.
export const HEAD = { w: 100, h: 132, faceW: 0.70, faceCy: 46 };

function headPath(ctx, x, y, w) {
  const s = w / HEAD.w;
  const P = (px, py) => [x + px * s, y + py * s];
  const to = (a, b, c, d, e, f) => ctx.bezierCurveTo(...P(a, b), ...P(c, d), ...P(e, f));
  ctx.beginPath();
  ctx.moveTo(...P(0, 48));
  to(0, 21, 22, 0, 50, 0);          // over the crown
  to(78, 0, 100, 21, 100, 48);
  // The neck is a SHORT, WIDE stand that flares out at the foot, not a stem.
  // Drawn narrow it reads as a lightbulb; drawn like this it reads as
  // shoulders, and the silhouette stays a person.
  to(100, 72, 94, 88, 84, 94);      // right side, curving in to the shoulder
  to(78, 97, 72, 100, 72, 106);     // into the neck
  ctx.lineTo(...P(74, 120));
  ctx.quadraticCurveTo(...P(75, 130), ...P(64, 130));
  ctx.lineTo(...P(36, 130));
  ctx.quadraticCurveTo(...P(25, 130), ...P(26, 120));
  ctx.lineTo(...P(28, 106));
  to(28, 100, 22, 97, 16, 94);
  to(6, 88, 0, 72, 0, 48);
  ctx.closePath();
}

export function drawHead(ctx, x, y, w, opts = {}) {
  const { ground = '#f0027f', ink = '#fff', face = true, fill = true } = opts;
  if (fill) {
    ctx.save();
    ctx.fillStyle = ground;
    headPath(ctx, x, y, w);
    ctx.fill();
    ctx.restore();
  }
  if (face) {
    const b = bounds();
    const fw = w * HEAD.faceW;
    const boxW = fw * (GEO.box / b.w);
    drawFace(ctx,
      x + (w - fw) / 2 - (b.x / GEO.box) * boxW,
      y + (HEAD.faceCy / HEAD.w) * w - ((b.y + b.h / 2) / GEO.box) * boxW,
      boxW, { color: ink, ...opts.faceOpts });
  }
  return { w, h: w * (HEAD.h / HEAD.w) };
}

// "But also TOKO MIDORI is clusters." The same head, packed with small heads —
// Toko, the members, the ex-members, the members who have not arrived yet, and
// the players. One person and a crowd, drawn with the same stamp.
//
// The big face still reads on top: the crowd is what the person is MADE of, so
// it must never win the silhouette.
export function drawCluster(ctx, x, y, w, opts = {}) {
  // finer than it looks like it should be: the crowd has to stay a TEXTURE.
  // At a coarser cell the little faces start competing with the big one and
  // the silhouette stops reading as a person at all.
  const { ground = '#f0027f', ink = '#fff', cell = 0.062 } = opts;
  const cw = w * cell;
  const ch = cw * (HEAD.h / HEAD.w);

  ctx.save();
  headPath(ctx, x, y, w);
  ctx.clip();
  ctx.fillStyle = ink;
  ctx.fillRect(x, y, w, w * (HEAD.h / HEAD.w));
  for (let row = 0, gy = y; gy < y + w * (HEAD.h / HEAD.w) + ch; row++, gy += ch * 0.86) {
    const off = (row % 2) * cw * 0.5;
    for (let gx = x - cw; gx < x + w + cw; gx += cw * 1.02) {
      drawHead(ctx, gx + off, gy, cw, { ground, ink, faceOpts: { stroke: GEO.stroke * 1.5 } });
    }
  }
  ctx.restore();

  // the person, over the crowd — heavier than the standard weight, because it
  // is competing with texture rather than sitting on a flat
  drawHead(ctx, x, y, w, {
    fill: false, ink,
    ...opts.big,
    faceOpts: { stroke: GEO.stroke * 1.25, ...(opts.big && opts.big.faceOpts) },
  });
  return { w, h: w * (HEAD.h / HEAD.w) };
}

export function svgHead({ ground = '#f0027f', ink = '#fff', px = 4 } = {}) {
  const b = bounds();
  const fw = HEAD.w * HEAD.faceW;
  const s = (fw * (GEO.box / b.w)) / GEO.box;
  const ox = (HEAD.w - fw) / 2 - b.x * s;
  const oy = HEAD.faceCy - (b.y + b.h / 2) * s;
  const d = 'M0 48C0 21 22 0 50 0C78 0 100 21 100 48C100 72 94 88 84 94'
    + 'C78 97 72 100 72 106L74 120Q75 130 64 130L36 130Q25 130 26 120L28 106'
    + 'C28 100 22 97 16 94C6 88 0 72 0 48Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${HEAD.w} ${HEAD.h}" `
    + `width="${HEAD.w * px / 4}" height="${HEAD.h * px / 4}" role="img" `
    + `aria-label="Toko Midori"><title>Toko Midori</title>`
    + `<path d="${d}" fill="${ground}"/>`
    + `<g transform="translate(${ox.toFixed(3)} ${oy.toFixed(3)}) scale(${s.toFixed(5)})" `
    + `fill="none" stroke="${ink}" stroke-width="${GEO.stroke}" `
    + `stroke-linecap="round" stroke-linejoin="round">`
    + facePaths().map(p => `<path d="${p}"/>`).join('') + `</g></svg>`;
}
