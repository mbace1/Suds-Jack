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
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

// The range has to be WIDE, because `cut.mjs fit` scales every frame to fill
// the cell independently: a frame with a big stride comes out smaller than one
// with a narrow one, and on leopard the gap was past 1.16. Searching that range
// at full resolution is 60x30 candidate renders a frame, so it runs
// coarse-to-fine — a step of 0.04 and 3px, then a refinement around the winner.
const RANGE = [0.60, 1.90], DX_RANGE = 46;
const BAND = [0.15, 0.65];
const FOOT_MARGIN = 10;

(async () => {
  const [dir, outDir, ...files] = process.argv.slice(2);
  if (!files.length) { console.log('usage: node register.cjs <dir> <outDir> <frame...>'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');

  const b64 = f => fs.readFileSync(path.join(dir, f)).toString('base64');
  const urls = files.map(f => `data:image/png;base64,${b64(f)}`);

  const out = await pg.evaluate(async ({ urls, RANGE, DX_RANGE, BAND, margin }) => {
    const load = async u => { const i = new Image(); i.src = u; await i.decode(); return i; };
    const mask = (img, s, dx) => {
      const W = img.width, H = img.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
      // find this frame's own ground line and horizontal foot centre
      const t = document.createElement('canvas'); t.width = W; t.height = H;
      const tg = t.getContext('2d', { willReadFrequently: true }); tg.drawImage(img, 0, 0);
      const d0 = tg.getImageData(0, 0, W, H).data;
      // The ground line is the bottom of the ink and is genuinely known. The
      // horizontal anchor is the CENTROID of the ink, not the centre of the
      // bottom row: in a wide stride the bottom row is a single boot off to one
      // side, and pinning to it throws the whole figure sideways by more than
      // the search can pull back. (normalise.cjs has the same fault; it matters
      // less there because it is not also searching.)
      let y1 = -1, sx = 0, n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d0[(y * W + x) * 4 + 3] > 127) {
        if (y > y1) y1 = y; sx += x; n++;
      }
      g.translate(W / 2 + dx, H - margin); g.scale(s, s); g.drawImage(t, -(sx / n), -y1);
      const d = g.getImageData(0, 0, W, H).data;
      const a = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      return { a, W, H, canvas: c };
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

    const imgs = await Promise.all(urls.map(load));
    // anchor: the frame whose ink height is the median, so the search never has
    // to travel far and no single odd frame sets the size of the whole clip
    const heights = imgs.map(im => { const m = mask(im, 1, 0); const [r0, r1] = bandRows(m.a, m.W, m.H); return r1 - r0; });
    const anchorIdx = heights.map((h, i) => [h, i]).sort((a, b) => a[0] - b[0])[Math.floor(heights.length / 2)][1];
    const anchor = mask(imgs[anchorIdx], 1, 0);
    const [r0, r1] = bandRows(anchor.a, anchor.W, anchor.H);

    return imgs.map((im, i) => {
      if (i === anchorIdx) return { url: anchor.canvas.toDataURL('image/png'), s: 1, dx: 0, score: 1, anchor: true };
      const search = (s0, s1, ds, d0, d1, dd, keepUrl) => {
        let best = null;
        for (let s = s0; s <= s1 + 1e-9; s += ds) for (let dx = d0; dx <= d1; dx += dd) {
          const m = mask(im, Number(s.toFixed(4)), dx);
          const v = iou(anchor.a, m.a, m.W, r0, r1);
          if (!best || v > best.score) best = { score: v, s: Number(s.toFixed(4)), dx, url: keepUrl ? m.canvas.toDataURL('image/png') : null };
        }
        return best;
      };
      const coarse = search(RANGE[0], RANGE[1], 0.04, -DX_RANGE, DX_RANGE, 3, false);
      const fine = search(Math.max(RANGE[0], coarse.s - 0.04), Math.min(RANGE[1], coarse.s + 0.04), 0.005,
                          coarse.dx - 3, coarse.dx + 3, 1, true);
      return { ...fine, anchor: false, saturated: fine.s <= RANGE[0] + 1e-6 || fine.s >= RANGE[1] - 1e-6 };
    });
  }, { urls, RANGE, DX_RANGE, BAND, margin: FOOT_MARGIN });

  out.forEach((r, i) => fs.writeFileSync(path.join(outDir, files[i]), Buffer.from(r.url.split(',')[1], 'base64')));
  await br.close();
  console.log('frame'.padEnd(30), 'scale'.padStart(6), 'dx'.padStart(4), 'torsoIoU'.padStart(9));
  out.forEach((r, i) => console.log(
    (files[i].replace(/\.png$/, '') + (r.anchor ? '  (anchor)' : '')).padEnd(30),
    r.s.toFixed(3).padStart(6), String(r.dx).padStart(4), r.score.toFixed(3).padStart(9),
    r.saturated ? '  SATURATED — widen RANGE' : ''));
  const worst = Math.min(...out.map(r => r.score));
  const sat = out.filter(r => r.saturated).length;
  // The overlay score is INFORMATION, not a gate. It was briefly written up
  // with a 0.75 pass line and the data does not support one: measured across
  // five characters the worst overlay ran 0.716 to 0.887, and the two lowest
  // were hoodie and longcoat — the two whose scale was already perfect. Loose
  // clothing moves inside the torso band, so a swinging coat costs overlay
  // without costing accuracy.
  //
  // What IS a failure is SATURATION: the search wanting to go past the end of
  // the range means it never found a fit at all.
  console.log(`\nworst torso overlay ${worst.toFixed(3)} (typical 0.72-0.89; a loose coat costs overlay without costing accuracy, so read this as information, not a pass mark).`);
  if (sat) { console.log(`${sat} frame(s) SATURATED the scale range — that IS a failure. Widen RANGE, or the frame does not fit at any scale.`); process.exit(1); }
})();
