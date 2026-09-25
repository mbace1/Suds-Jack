#!/usr/bin/env node
// Trace the owner's master artwork into the face's outlines.
//
//   NODE_PATH=$(npm root -g) node toko/tools/trace-master.cjs
//
// Reads toko/master/face-white-on-yellow.jpg (the owner's original, 700×700),
// takes the BLUE channel as a scalar field — white ink is ~255 there and the
// yellow ground ~0, so the antialiased edge is a clean ramp — and runs marching
// squares at the midpoint with linear interpolation, which puts the outline
// at sub-pixel accuracy rather than on the pixel grid. Each closed loop is
// simplified (Ramer–Douglas–Peucker, 0.3 px), named by where it sits, and
// written to toko/js/master.js.
//
// Then it CHECKS ITSELF against both master files: the outlines are filled
// back onto a canvas and compared pixel for pixel with the original ink (IoU),
// including the second file, where the same shape is yellow on white — the
// trace is right only if it matches a drawing it was not traced from.

const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MASTER = path.join(ROOT, 'toko', 'master');
const OUT = path.join(ROOT, 'toko', 'js', 'master.js');
const TOL = 0.3;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const load = async (file, inkIsWhite) => p.evaluate(async ({ data, inkIsWhite }) => {
    const img = new Image(); img.src = data; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const f = [];
    for (let i = 0; i < d.length; i += 4) f.push(inkIsWhite ? d[i + 2] : 255 - d[i + 2]);
    const k = (5 * c.width + 5) * 4;
    return { w: c.width, h: c.height, f, ground: '#' + [d[k], d[k + 1], d[k + 2]].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase() };
  }, { data: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(MASTER, file)).toString('base64'), inkIsWhite });

  const A = await load('face-white-on-yellow.jpg', true);
  // a pixel's sample sits at its CENTRE, (x + 0.5, y + 0.5) in canvas space
  const loops = marching(A.f, A.w, A.h, 127.5).map(l => rdp(l, TOL).map(([x, y]) => [x + 0.5, y + 0.5])).filter(l => Math.abs(area(l)) > 400);
  if (loops.length !== 4) throw new Error(`expected 4 ink shapes (two eyes, two mouth arcs), found ${loops.length}`);
  // name them by where they sit
  const cen = (l) => l.reduce((a, [x, y]) => [a[0] + x / l.length, a[1] + y / l.length], [0, 0]);
  const named = {};
  const byY = [...loops].sort((a, b) => cen(a)[1] - cen(b)[1]);
  const eyes = byY.slice(0, 2).sort((a, b) => cen(a)[0] - cen(b)[0]);
  const mouth = byY.slice(2).sort((a, b) => area(b) - area(a));
  named.eyeL = eyes[0]; named.eyeR = eyes[1]; named.mouthOuter = mouth[0]; named.mouthInner = mouth[1];
  // every loop wound the same way (counter-clockwise in y-down = positive area)
  for (const k of Object.keys(named)) if (area(named[k]) < 0) named[k].reverse();

  // ── check: fill the outlines and compare with BOTH originals ──
  const B = await load('face-yellow-on-white.jpg', false);
  const check = await p.evaluate(({ shapes, fa, fb, w, h }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    for (const pts of Object.values(shapes)) {
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
    }
    const d = g.getImageData(0, 0, w, h).data;
    // the second file carries the same drawing placed a few pixels lower, so
    // it is compared after aligning the two ink boxes — a SHAPE check, not a
    // placement one
    const box = (on) => { let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return { x0, y0, x1, y1 }; };
    // COVERAGE is alpha: getImageData un-premultiplies, so an edge pixel the
    // fill barely touches still reads 255 in red, and a red test fattens the fill
    const mine = box((x, y) => d[(y * w + x) * 4 + 3] > 127);
    const iou = (f) => { const o = box((x, y) => f[y * w + x] > 127);
      const dx = o.x0 - mine.x0, dy = o.y0 - mine.y0;
      let i = 0, u = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3] > 127, X = x + dx, Y = y + dy;
        const bb = X >= 0 && Y >= 0 && X < w && Y < h && f[Y * w + X] > 127;
        if (a && bb) i++; if (a || bb) u++; }
      return { iou: i / u, dx, dy, scale: (o.x1 - o.x0) / (mine.x1 - mine.x0) }; };
    const A = iou(fa), B = iou(fb);
    return { a: A.iou, b: B.iou, bShift: [B.dx, B.dy], bScale: B.scale };
  }, { shapes: named, fa: A.f, fb: B.f, w: A.w, h: A.h });
  await b.close();

  const r = (v) => Math.round(v * 100) / 100;
  const body = Object.entries(named).map(([k, l]) =>
    `  ${k}: [${l.map(([x, y]) => `${r(x)},${r(y)}`).join(',')}],`).join('\n');
  fs.writeFileSync(OUT, `// TOKO MIDORI GAMES — the face, TRACED from the owner's master artwork.
//
// GENERATED by toko/tools/trace-master.cjs from toko/master/face-white-on-yellow.jpg
// — do not edit by hand; re-run the tracer. The owner supplied the original on
// 2026-09-24 ("this is the exact original face shape"); until then the face was
// GEO in face.js, measured off it by eye, and that measurement differs from the
// original in ways a trace makes plain: the eyes are tall thick arches with a
// narrow slot (not a semicircle on thin parallel legs), every stroke ends in a
// slanted cut rather than a round cap, and both mouth strokes are deep U curves
// rather than arcs of a circle.
//
// Outlines are closed loops of [x, y] in the master's own ${A.w}×${A.h} frame, y down,
// one per ink shape. Checked against both master files when traced:
//   IoU ${check.a.toFixed(4)} against the white-on-yellow original (the one traced)
//   IoU ${check.b.toFixed(4)} against the yellow-on-white original (not traced; the same
//   drawing placed ${check.bShift} px off, compared with the ink boxes aligned)

export const MASTER = {
  size: ${A.w},
  ground: '${A.ground}',        // the master's own ground, sampled from its corner
  ink: '#FFFFFF',
${body}
};

// the four shapes, in drawing order
export const SHAPES = ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner'];

// the ink's bounding box, in master units
export function masterBounds() {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of SHAPES) for (let i = 0; i < MASTER[k].length; i += 2) {
    const x = MASTER[k][i], y = MASTER[k][i + 1];
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Where each shape bends when the face acts. The master has no pupils and no
// open eye — it is the face at rest, smiling with its eyes shut — so it acts
// only as the mark always has: the eyes SQUASH (a blink) about the foot of the
// arch, and the smile BREATHES about the top of the mouth. Nothing is drawn
// that the master does not have.
export function pivots() {
  const box = (k) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const p = MASTER[k]; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    return { x0, y0, x1, y1 }; };
  const L = box('eyeL'), R = box('eyeR'), M = box('mouthOuter');
  return {
    eyeL: [(L.x0 + L.x1) / 2, L.y1], eyeR: [(R.x0 + R.x1) / 2, R.y1],
    mouthOuter: [(M.x0 + M.x1) / 2, M.y0], mouthInner: [(M.x0 + M.x1) / 2, M.y0],
  };
}

// a point of shape \`k\` posed: eyes squashed about their foot, the mouth scaled
// about its top — in master units
export function posed(k, x, y, squash = 1, grin = 1, pv = pivots()) {
  const [px, py] = pv[k];
  if (k === 'eyeL' || k === 'eyeR') return [x, py + (y - py) * squash];
  return [px + (x - px) * grin, py + (y - py) * grin];
}

// Fill the traced face into a canvas: the ink box of width \`w\`, top-left at
// (x, y). opts: { color, squash, grin }.
export function fillMaster(ctx, x, y, w, opts = {}) {
  const b = masterBounds(), s = w / b.w, pv = pivots();
  const sq = opts.squash ?? 1, gr = opts.grin ?? 1;
  ctx.save();
  ctx.fillStyle = opts.color || MASTER.ink;
  for (const k of SHAPES) {
    const p = MASTER[k];
    ctx.beginPath();
    for (let i = 0; i < p.length; i += 2) {
      const [mx, my] = posed(k, p[i], p[i + 1], sq, gr, pv);
      const px = x + (mx - b.x) * s, py = y + (my - b.y) * s;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// The face on a disc — the badge — centred at (cx, cy), radius r. The ink is
// as wide across the disc as the brand badge's has always been.
export const BADGE_INK = 1.33;
export function drawMasterBadge(ctx, cx, cy, r, opts = {}) {
  if (opts.ground !== null) {
    ctx.save(); ctx.fillStyle = opts.ground || MASTER.ground;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // placed by the master's FRAME, not its ink: the original sits a little low
  // in its own square, and that is part of the drawing
  const b = masterBounds(), s = (r * BADGE_INK) / b.w, c = MASTER.size / 2;
  fillMaster(ctx, cx + (b.x - c) * s, cy + (b.y - c) * s, r * BADGE_INK,
    { color: opts.ink || MASTER.ink, squash: opts.squash, grin: opts.grin });
}
`.replace(/  (eyeL|eyeR|mouthOuter|mouthInner): \[/g, '  $1: ['));
  // flatten pairs so the file stays compact: [x,y,x,y,...]
  let src = fs.readFileSync(OUT, 'utf8');
  fs.writeFileSync(OUT, src);
  console.log(`4 shapes, ${Object.values(named).reduce((a, l) => a + l.length, 0)} points`);
  console.log(`IoU vs traced original ${check.a.toFixed(4)}, vs the other original ${check.b.toFixed(4)} (it sits ${check.bShift} px off, scale ${check.bScale.toFixed(4)})`);
  console.log('wrote', path.relative(ROOT, OUT));
  if (check.a < 0.99 || check.b < 0.98) { console.error('the trace does not match the master closely enough'); process.exit(1); }
})().catch(e => { console.error(e); process.exit(1); });

// ── marching squares, linear interpolation, loops ────────────────────────
function marching(f, w, h, iso) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : f[y * w + x];
  const segs = new Map();
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const lerp = (x0, y0, v0, x1, y1, v1) => { const t = (iso - v0) / (v1 - v0); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
  const edges = [];
  for (let y = -1; y < h; y++) for (let x = -1; x < w; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
    const idx = (a > iso ? 8 : 0) | (b > iso ? 4 : 0) | (c > iso ? 2 : 0) | (d > iso ? 1 : 0);
    if (idx === 0 || idx === 15) continue;
    const T = () => lerp(x, y, a, x + 1, y, b), R = () => lerp(x + 1, y, b, x + 1, y + 1, c);
    const B = () => lerp(x, y + 1, d, x + 1, y + 1, c), L = () => lerp(x, y, a, x, y + 1, d);
    const S = {
      1: [[L, B]], 2: [[B, R]], 3: [[L, R]], 4: [[T, R]], 5: [[L, T], [B, R]], 6: [[T, B]], 7: [[L, T]],
      8: [[L, T]], 9: [[T, B]], 10: [[T, R], [L, B]], 11: [[T, R]], 12: [[L, R]], 13: [[B, R]], 14: [[L, B]],
    }[idx];
    for (const [p, q] of S) edges.push([p(), q()]);
  }
  // link segments into loops by shared endpoints
  const adj = new Map();
  const add = (k, v) => { if (!adj.has(k)) adj.set(k, []); adj.get(k).push(v); };
  edges.forEach((e, i) => { add(key(e[0]), i); add(key(e[1]), i); });
  const used = new Uint8Array(edges.length), loops = [];
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [edges[i][0], edges[i][1]];
    let cur = edges[i][1];
    for (;;) {
      const next = (adj.get(key(cur)) || []).find(j => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const e = edges[next];
      cur = key(e[0]) === key(cur) ? e[1] : e[0];
      loop.push(cur);
    }
    loops.push(loop);
  }
  return loops;
}
function area(l) { let s = 0; for (let i = 0; i < l.length; i++) { const [x0, y0] = l[i], [x1, y1] = l[(i + 1) % l.length]; s += x0 * y1 - x1 * y0; } return s / 2; }
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  // a closed loop: split at the two most distant points and simplify each half
  let far = 0, fd = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > fd) { fd = d; far = i; } }
  const half = (a) => { if (a.length < 3) return a;
    const [x0, y0] = a[0], [x1, y1] = a[a.length - 1], L = Math.hypot(x1 - x0, y1 - y0) || 1;
    let mi = 0, md = 0;
    for (let i = 1; i < a.length - 1; i++) { const d = Math.abs((y1 - y0) * a[i][0] - (x1 - x0) * a[i][1] + x1 * y0 - y1 * x0) / L; if (d > md) { md = d; mi = i; } }
    if (md <= eps) return [a[0], a[a.length - 1]];
    const l = half(a.slice(0, mi + 1)), r = half(a.slice(mi));
    return l.slice(0, -1).concat(r); };
  const A = half(pts.slice(0, far + 1)), B = half(pts.slice(far).concat([pts[0]]));
  return A.slice(0, -1).concat(B.slice(0, -1));
}
