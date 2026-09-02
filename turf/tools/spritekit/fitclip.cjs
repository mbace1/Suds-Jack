// Fit a WHOLE CLIP into 192x288 cells at ONE COMMON SCALE.
//   node fitclip.cjs <inDir> <outDir> <frame...>
//
// Replaces `cut.mjs fit` for a clip. That tool fits each image INDEPENDENTLY to
// fill its cell, which is right for a single illustration and wrong for an
// animation: a frame with a wide silhouette gets shrunk relative to a narrow
// one. On longcoat that was a 32% size difference between two frames of the
// same walk, and it is why register.cjs needed a scale range up to 1.47 — it
// was undoing damage the fit had just done, by upscaling a frame that had
// already been downscaled. Two resamples, and the second one on the frames that
// could least afford it.
//
// Here the clip is measured as a whole, one scale is chosen so the LARGEST
// frame fits, and every frame is placed with that scale. Relative size
// differences between frames survive — which matters, because the body-height
// rhythm through a run cycle is a required feature, not drift.
//
// And nothing can be clipped: the scale is derived from the widest and tallest
// frame in the clip, then verified per frame and reduced if anything still
// touches an edge. A cropped sprite passes every relative gate in this
// toolchain, so the fix belongs where the crop would happen.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

const CELL_W = 192, CELL_H = 288;
const FOOT_MARGIN = 8;      // px of floor left under the feet
const SIDE_MARGIN = 4;      // px kept clear at left/right
const TOP_MARGIN = 4;

(async () => {
  // --adjust <json> applies register.cjs's per-frame factors inside THIS
  // transform, so a registered clip is resampled once rather than twice.
  const ai = process.argv.indexOf('--adjust');
  const adjust = ai > -1 ? JSON.parse(fs.readFileSync(process.argv[ai + 1], 'utf8')) : null;
  const argv = process.argv.slice(2).filter((a, i, arr) => a !== '--adjust' && arr[i - 1] !== '--adjust');
  const [inDir, outDir, ...files] = argv;
  if (!files.length) { console.log('usage: node fitclip.cjs <inDir> <outDir> <frame...>'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const urls = files.map(f => `data:image/png;base64,${fs.readFileSync(path.join(inDir, f)).toString('base64')}`);

  // Only the SCALE is taken from register.cjs. Its dx was measured against its
  // own centroid-based placement at its own common scale, so folding it into a
  // bbox-centred transform at a different scale mixes two coordinate systems —
  // that is what made the shrink guard fire and left two frames still clipped.
  // Horizontal placement here is deterministic and needs no correction.
  const adj = files.map(f => ({ s: (adjust && adjust[f]) ? adjust[f].s : 1, dx: 0 }));
  const out = await pg.evaluate(async ({ urls, adj, CELL_W, CELL_H, FOOT_MARGIN, SIDE_MARGIN, TOP_MARGIN }) => {
    // Specks: connected components under SPECK px, deleted before anything is
    // measured. They are despeckle leftovers from the key, and they matter more
    // than their size suggests — a stray pixel in a corner enlarges the ink
    // bbox, which sets the common scale for the WHOLE clip. A dropped weapon is
    // a legitimate detached component and is an order of magnitude bigger, so
    // it survives.
    // The threshold is RELATIVE to the biggest component, because source and
    // output are at very different scales: a 40px speck in a 192x288 cell is
    // ~700px in the 832x1248 source, so an absolute source threshold of 40
    // removed nothing at all. A dropped weapon runs several percent of the
    // body's area and survives comfortably.
    const SPECK_FRAC = 0.003;
    const despeck = (g, W, H) => {
      const img = g.getImageData(0, 0, W, H), d = img.data;
      const lab = new Int32Array(W * H).fill(-1); const comp = [];
      const st = [];
      for (let p0 = 0; p0 < W * H; p0++) {
        if (d[p0 * 4 + 3] <= 127 || lab[p0] !== -1) continue;
        const id = comp.length; comp.push([]); st.length = 0; st.push(p0); lab[p0] = id;
        while (st.length) {
          const q = st.pop(); comp[id].push(q);
          const qx = q % W, qy = (q / W) | 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const np = ny * W + nx;
            if (d[np * 4 + 3] <= 127 || lab[np] !== -1) continue;
            lab[np] = id; st.push(np);
          }
        }
      }
      const biggest = comp.reduce((m, c) => Math.max(m, c.length), 0);
      const limit = Math.max(8, biggest * SPECK_FRAC);
      let removed = 0;
      for (const c of comp) if (c.length < limit) { for (const q of c) d[q * 4 + 3] = 0; removed++; }
      if (removed) g.putImageData(img, 0, 0);
      return removed;
    };

    const stat = async (u) => {
      const im = new Image(); im.src = u; await im.decode();
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
      const removed = despeck(g, im.width, im.height);
      const d = g.getImageData(0, 0, im.width, im.height).data;
      let x0 = im.width, x1 = -1, y0 = im.height, y1 = -1, sx = 0, n = 0;
      for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++)
        if (d[(y * im.width + x) * 4 + 3] > 127) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          sx += x; n++;
        }
      // PLACEMENT USES THE BBOX CENTRE, NOT THE INK CENTROID. The centroid is
      // the right anchor when you are searching (register.cjs) because it
      // tracks the body's mass. Here it is wrong: with an asymmetric silhouette
      // — a coat swept to one side — centring the mass leaves the far edge
      // overhanging, the shrink guard fires again and again, and 25 iterations
      // later the whole clip is 0.47x too small. longcoat came out at 4.7%
      // cell coverage against a normal 30%. With the bbox centre and a scale
      // derived from the widest frame, nothing can overhang and the guard never
      // fires at all.
      return { canvas: c, x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1,
               cx: (x0 + x1) / 2, centroid: sx / n, removed };
    };
    const S = [];
    for (const u of urls) S.push(await stat(u));

    // one scale for the clip: the largest frame in each axis has to fit
    // the per-frame register factor changes how big each frame ends up, so it
    // has to be part of choosing the common scale, not applied after it
    const maxW = Math.max(...S.map((s, i) => s.w * adj[i].s)), maxH = Math.max(...S.map((s, i) => s.h * adj[i].s));
    let scale = Math.min((CELL_W - 2 * SIDE_MARGIN) / maxW, (CELL_H - FOOT_MARGIN - TOP_MARGIN) / maxH);

    const render = (s, sc, a) => {
      const o = document.createElement('canvas'); o.width = CELL_W; o.height = CELL_H;
      const og = o.getContext('2d', { willReadFrequently: true }); og.imageSmoothingEnabled = false;
      og.translate(CELL_W / 2 + (a.dx || 0), CELL_H - FOOT_MARGIN);
      og.scale(sc * a.s, sc * a.s);
      og.drawImage(s.canvas, -s.cx, -s.y1);
      og.setTransform(1, 0, 0, 1, 0, 0);
      despeck(og, CELL_W, CELL_H);   // resampling can strand a pixel or two
      return o;
    };
    const touchesEdge = (o) => {
      const g = o.getContext('2d', { willReadFrequently: true });
      const d = g.getImageData(0, 0, CELL_W, CELL_H).data;
      const A = (x, y) => d[(y * CELL_W + x) * 4 + 3] > 127;
      for (let x = 0; x < CELL_W; x++) if (A(x, 0) || A(x, CELL_H - 1)) return true;
      for (let y = 0; y < CELL_H; y++) if (A(0, y) || A(CELL_W - 1, y)) return true;
      return false;
    };
    // verify, and back the scale off if anything still reaches an edge
    // Safety net only: with a bbox-centre anchor and a scale taken from the
    // widest and tallest frame, nothing should overhang. If this ever fires,
    // something upstream is wrong — so it is capped low and reported.
    let guards = 0;
    for (; guards < 6; guards++) {
      if (!S.some((s, i) => touchesEdge(render(s, scale, adj[i])))) break;
      scale *= 0.97;
    }
    return { scale, guards, specks: S.reduce((a, s) => a + s.removed, 0), frames: S.map((s, i) => render(s, scale, adj[i]).toDataURL('image/png')),
             sizes: S.map(s => ({ w: s.w, h: s.h })),
             coverage: S.map((s, i) => (s.w * s.h * (scale * adj[i].s) ** 2) / (CELL_W * CELL_H)) };
  }, { urls, adj, CELL_W, CELL_H, FOOT_MARGIN, SIDE_MARGIN, TOP_MARGIN });

  out.frames.forEach((u, i) => fs.writeFileSync(path.join(outDir, files[i]), Buffer.from(u.split(',')[1], 'base64')));
  await br.close();
  const hs = out.sizes.map(s => s.h), spread = (Math.max(...hs) - Math.min(...hs)) / (hs.reduce((a, b) => a + b, 0) / hs.length);
  const cov = out.coverage, minCov = Math.min(...cov);
  console.log(`${files.length} frames at one scale ${out.scale.toFixed(4)} — heights spread ${(spread * 100).toFixed(1)}% (preserved), bbox fill ${(minCov * 100).toFixed(0)}-${(Math.max(...cov) * 100).toFixed(0)}% of cell`);
  if (out.specks) console.log(`  removed ${out.specks} speck(s) under 40px before measuring`);
  if (out.guards) console.log(`  WARNING: the shrink guard fired ${out.guards}x — placement should make that impossible, so something upstream is wrong.`);
  if (minCov < 0.35) console.log(`  WARNING: smallest frame fills only ${(minCov * 100).toFixed(0)}% of the cell. One outsized frame is shrinking the clip; check it for a stray mark or an over-wide pose.`);
})();
