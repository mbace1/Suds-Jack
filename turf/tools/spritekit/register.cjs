// Scale normalisation WITHOUT a measured anchor feature.
//   node register.cjs <dir> <outDir> <frame...>
//
// Every anchor tried so far is a proxy: head width stands in for "the figure is
// the same size". Proxies break in character-specific ways — loose hair joins
// the head blob, a raised arm crosses the head band, a bald man has no hair to
// measure at all — and when the proxy breaks, normalising on it makes things
// WORSE (leopard went 6.3% in, 9.8% out).
//
// So this file measures nothing. It SEARCHES: for each frame it tries a range
// of scales and horizontal offsets and keeps whichever overlays best on an
// anchor frame. That optimises the actual objective — frames that sit on top of
// one another — instead of a stand-in for it, so there is no feature left to
// break.
//
// Two choices make it work:
//   * the ground line is PINNED, not searched. It is the one thing that is
//     genuinely known, and searching it would let a frame float.
//   * the score is taken over the TORSO BAND only, 15%-65% of ink height. The
//     head is excluded because that is where the hair moves, and the legs
//     because in a run cycle they are SUPPOSED to differ — scoring them would
//     shrink a frame to make its stride match the anchor's.
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, save, ink } = require(path.join(__dirname, 'img.cjs'));

// The range has to be WIDE, because a frame with a big stride comes out smaller
// than one with a narrow one. Searching that at full resolution is 60x30
// candidate renders a frame, so it runs coarse-to-fine — a step of 0.04 and
// 3px, then a refinement around the winner.
const RANGE = [0.60, 1.90], DX_RANGE = 46;
const BAND = [0.15, 0.65];
const FOOT_MARGIN = 10;

(async () => {
  // --report emits the per-frame factors as JSON instead of writing PNGs, so
  // fitclip.cjs can fold them into its own transform. That is the difference
  // between ONE resample and two.
  const ri = process.argv.indexOf('--report');
  const reportTo = ri > -1 ? process.argv[ri + 1] : null;
  const argv = process.argv.slice(2).filter((a, i, arr) => a !== '--report' && arr[i - 1] !== '--report');
  const [dir, outDir, ...files] = argv;
  if (!files.length) { console.log('usage: node register.cjs <dir> <outDir> <frame...> [--report f.json]'); process.exit(1); }

  const srcs = [];
  for (const f of files) {
    const o = await load(path.join(dir, f));
    // Measured ONCE per source. The first port computed this inside mask(),
    // which the coarse-to-fine search calls ~1800 times a frame — a full-image
    // pass per candidate made the ported tool 2.8x SLOWER than the browser it
    // replaced (24.8s against 8.8s) while returning identical factors.
    const d = pixels(o);
    o.ink = ink(d, o.W, o.H);
    o.mask = new Uint8Array(o.W * o.H);
    for (let i = 0; i < o.mask.length; i++) o.mask[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    srcs.push(o);
  }

  // NO CANVAS IN THE SEARCH LOOP. The coarse-to-fine search evaluates ~1800
  // candidates per frame, and rasterising each one — allocate canvas,
  // drawImage, getImageData — is what actually costs the time. It is not a
  // browser-vs-Skia question: the ported version was still 1.75x SLOWER than
  // the browser it replaced until this went away.
  //
  // A candidate mask is just an affine transform of a binary bitmap, so it is
  // computed by inverse-sampling into a Uint8Array, and only over the rows the
  // score actually reads. Nearest-neighbour by flooring, which is what
  // imageSmoothingEnabled = false does.
  //
  //   dest_x = (src_x - centroid) * s + W/2 + dx
  //   dest_y = (src_y - y1)       * s + H   - FOOT_MARGIN
  const maskBand = (src, s, dx, r0, r1) => {
    const { W, H } = src, b = src.ink;
    const a = new Uint8Array(W * H);
    const ox = W / 2 + dx, oy = H - FOOT_MARGIN;
    for (let y = Math.max(0, r0); y < Math.min(H, r1); y++) {
      const sy = Math.floor((y - oy) / s + b.y1);
      if (sy < 0 || sy >= H) continue;
      const row = y * W;
      for (let x = 0; x < W; x++) {
        const sx = Math.floor((x - ox) / s + b.centroid);
        if (sx < 0 || sx >= W) continue;
        if (src.mask[sy * W + sx]) a[row + x] = 1;
      }
    }
    return { a, W, H };
  };
  const mask = (src, s, dx) => maskBand(src, s, dx, 0, src.H);

  // The transformed bbox is the transform OF the bbox — exact, and free, so the
  // clamp loop needs no rasterisation either.
  const box = (src, s, dx) => {
    const b = src.ink, ox = src.W / 2 + dx, oy = src.H - FOOT_MARGIN;
    return { x0: (b.x0 - b.centroid) * s + ox, x1: (b.x1 - b.centroid) * s + ox,
             y0: (b.y0 - b.y1) * s + oy, y1: oy };
  };

  // one canvas render, only for the frame that is actually written out
  const render = (src, s, dx) => {
    const b = src.ink, o = blank(src.W, src.H);
    o.ctx.translate(src.W / 2 + dx, src.H - FOOT_MARGIN);
    o.ctx.scale(s, s);
    o.ctx.drawImage(src.canvas, -b.centroid, -b.y1);
    return o;
  };
  const bandRows = (a, W, H) => {
    let y0 = H, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const ih = y1 - y0 + 1;
    return [Math.round(y0 + ih * BAND[0]), Math.round(y0 + ih * BAND[1])];
  };
  const iou = (a, b, W, r0, r1) => {
    let inter = 0, uni = 0;
    for (let y = r0; y < r1; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (a[i] && b[i]) inter++; if (a[i] || b[i]) uni++;
    }
    return uni ? inter / uni : 0;
  };

  // anchor: the frame whose band height is the median, so the search never has
  // to travel far and no single odd frame sets the size of the whole clip
  const heights = srcs.map(s => { const m = mask(s, 1, 0); const [r0, r1] = bandRows(m.a, m.W, m.H); return r1 - r0; });
  const anchorIdx = heights.map((h, i) => [h, i]).sort((a, b) => a[0] - b[0])[Math.floor(heights.length / 2)][1];
  const anchor = mask(srcs[anchorIdx], 1, 0);
  const [r0, r1] = bandRows(anchor.a, anchor.W, anchor.H);

  const out = srcs.map((src, i) => {
    if (i === anchorIdx) return { src, s: 1, dx: 0, score: 1, anchor: true };
    const search = (s0, s1, ds, d0, d1, dd) => {
      let best = null;
      for (let s = s0; s <= s1 + 1e-9; s += ds) for (let dx = d0; dx <= d1; dx += dd) {
        const m = maskBand(src, Number(s.toFixed(4)), dx, r0, r1);
        const v = iou(anchor.a, m.a, m.W, r0, r1);
        if (!best || v > best.score) best = { score: v, s: Number(s.toFixed(4)), dx };
      }
      return best;
    };
    const coarse = search(RANGE[0], RANGE[1], 0.04, -DX_RANGE, DX_RANGE, 3);
    const fine = search(Math.max(RANGE[0], coarse.s - 0.04), Math.min(RANGE[1], coarse.s + 0.04), 0.005,
                        coarse.dx - 3, coarse.dx + 3, 1);
    // The best-overlay transform is allowed to push ink off the canvas, and a
    // scale of 1.4 usually does. Pixels lost here are lost for good, so the fit
    // is pulled back inside the cell even though that costs a little overlay.
    let s2 = fine.s, dx2 = fine.dx, clamped = false;
    for (let guard = 0; guard < 12; guard++) {
      const bb = box(src, s2, dx2);
      const oL = Math.max(0, -bb.x0), oR = Math.max(0, bb.x1 - (src.W - 1)), oT = Math.max(0, -bb.y0);
      if (!oL && !oR && !oT) break;
      clamped = true;
      if ((oL && oR) || oT) { s2 *= 0.97; continue; }
      dx2 += Math.ceil(oL) - Math.ceil(oR);
    }
    return { src, s: s2, dx: dx2, score: fine.score, clamped, anchor: false,
             saturated: fine.s <= RANGE[0] + 1e-6 || fine.s >= RANGE[1] - 1e-6 };
  });

  if (reportTo) {
    const factors = {};
    out.forEach((r, i) => { factors[files[i]] = { s: r.s, dx: r.dx }; });
    fs.writeFileSync(reportTo, JSON.stringify(factors, null, 1));
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    out.forEach((r, i) => save(render(r.src, r.s, r.dx), path.join(outDir, files[i])));
  }

  console.log('frame'.padEnd(30), 'scale'.padStart(6), 'dx'.padStart(4), 'torsoIoU'.padStart(9));
  out.forEach((r, i) => console.log(
    (files[i].replace(/\.png$/, '') + (r.anchor ? '  (anchor)' : '')).padEnd(30),
    r.s.toFixed(3).padStart(6), String(r.dx).padStart(4), r.score.toFixed(3).padStart(9),
    (r.saturated ? '  SATURATED — widen RANGE' : '') + (r.clamped ? '  clamped to fit the cell' : '')));

  const worst = Math.min(...out.map(r => r.score));
  const sat = out.filter(r => r.saturated).length;
  // The overlay score is INFORMATION, not a gate. It was briefly written up
  // with a 0.75 pass line and the data does not support one: across five
  // characters the worst overlay ran 0.716 to 0.887, and the two lowest were
  // hoodie and longcoat — the two whose scale was already perfect. Loose
  // clothing moves inside the torso band. SATURATION is the real failure.
  console.log(`\nworst torso overlay ${worst.toFixed(3)} (typical 0.72-0.89; a loose coat costs overlay without costing accuracy, so read this as information, not a pass mark).`);
  if (sat) { console.log(`${sat} frame(s) SATURATED the scale range — that IS a failure. Widen RANGE, or the frame does not fit at any scale.`); process.exit(1); }
})();
