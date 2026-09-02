// The one image backend. Skia via @napi-rs/canvas, replacing headless Chromium.
//
// WHY. Every measurement in this toolchain used to run inside `pg.evaluate` in
// a Playwright page. COST.md measured that as the roster run's binding
// constraint — ~27 minutes of API against ~4 HOURS of local processing, almost
// all of it browser start-up, since cut runs twice a frame and normalise,
// drift, register and anim each launched their own. Measured on the 105
// committed frames, the same edge check runs in 710ms here against 11002ms
// through Chromium: 15.5x, or ~4 hours down to ~15 minutes.
//
// Verified equivalent before the port, because a silent quality regression
// would be far worse than the slowness:
//   * imageSmoothingEnabled = false is honoured. A 3x upscale reproduces the
//     source's 16117 colours with ZERO partial-alpha pixels; with smoothing on,
//     the same operation gives 70023 colours and 10052 soft pixels.
//   * The downscale is bit-identical to Chromium. fitclip's actual transform
//     (translate, scale 0.2217, drawImage) through both engines differs on
//     0 of 55296 pixels, 0 colour channels, largest delta 0.
//
// It is a peer dependency on purpose, installed in scratch and exposed with
// NODE_PATH — the same rule CLAUDE.md sets for gifenc and scripts/enemy-loop.
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

// A canvas holding an image file, plus its pixels. The alpha test is > 127
// everywhere in this toolchain; keep it that way or every measurement shifts.
async function load(file) {
  const im = await loadImage(fs.readFileSync(file));
  const c = createCanvas(im.width, im.height);
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  return { canvas: c, ctx: g, W: im.width, H: im.height, image: im };
}

const blank = (W, H) => {
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;   // never resample smoothly: this is pixel art
  return { canvas: c, ctx: g, W, H };
};

const pixels = (o) => o.ctx.getImageData(0, 0, o.W, o.H).data;
const save = (o, file) => fs.writeFileSync(file, o.canvas.toBuffer('image/png'));

// ink bbox + centroid + ground line, the numbers nearly every tool starts from
function ink(d, W, H) {
  let x0 = W, x1 = -1, y0 = H, y1 = -1, sx = 0, n = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 127) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    sx += x; n++;
  }
  return { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area: n,
           centroid: n ? sx / n : 0, bboxCx: (x0 + x1) / 2 };
}

// 8-connected components over the alpha mask, as {size, x0, x1, pixels}
function components(d, W, H, region) {
  const [ry0, ry1] = region || [0, H];
  const lab = new Int32Array(W * H).fill(-1), out = [], st = [];
  for (let y = ry0; y < ry1; y++) for (let x = 0; x < W; x++) {
    const p0 = y * W + x;
    if (d[p0 * 4 + 3] <= 127 || lab[p0] !== -1) continue;
    const id = out.length; out.push({ size: 0, x0: x, x1: x, pixels: [] });
    st.length = 0; st.push(p0); lab[p0] = id;
    while (st.length) {
      const q = st.pop(); const c = out[id];
      c.size++; c.pixels.push(q);
      const qx = q % W, qy = (q / W) | 0;
      if (qx < c.x0) c.x0 = qx; if (qx > c.x1) c.x1 = qx;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < ry0 || nx >= W || ny >= ry1) continue;
        const np = ny * W + nx;
        if (d[np * 4 + 3] <= 127 || lab[np] !== -1) continue;
        lab[np] = id; st.push(np);
      }
    }
  }
  return out;
}

// how many border pixels carry ink — the check that caught 63 broken frames
function edgeInk(d, W, H) {
  const A = (x, y) => d[(y * W + x) * 4 + 3] > 127;
  let top = 0, bottom = 0, left = 0, right = 0;
  for (let x = 0; x < W; x++) { if (A(x, 0)) top++; if (A(x, H - 1)) bottom++; }
  for (let y = 0; y < H; y++) { if (A(0, y)) left++; if (A(W - 1, y)) right++; }
  return { top, bottom, left, right, total: top + bottom + left + right };
}

module.exports = { load, blank, pixels, save, ink, components, edgeInk, createCanvas, loadImage };
