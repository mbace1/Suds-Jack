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
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, save, ink, components, edgeInk } = require(path.join(__dirname, 'img.cjs'));

const CELL_W = 192, CELL_H = 288;
const FOOT_MARGIN = 8;      // px of floor left under the feet
const SIDE_MARGIN = 4;      // px kept clear at left/right
const TOP_MARGIN = 4;

// Specks: connected components under a fraction of the biggest one, deleted
// before anything is measured. They matter more than their size suggests — a
// stray pixel in a corner enlarges the ink bbox, which sets the common scale
// for the WHOLE clip. The threshold is RELATIVE because source and output are
// at very different scales: a 40px speck in a 192x288 cell is ~700px in the
// 832x1248 source, so an absolute source threshold of 40 removed nothing at
// all. A dropped weapon runs several percent of the body's area and survives.
const SPECK_FRAC = 0.003;
function despeck(o) {
  const d = pixels(o);
  const comps = components(d, o.W, o.H);
  const biggest = comps.reduce((m, c) => Math.max(m, c.size), 0);
  const limit = Math.max(8, biggest * SPECK_FRAC);
  const small = comps.filter(c => c.size < limit);
  if (!small.length) return 0;
  const img = o.ctx.getImageData(0, 0, o.W, o.H);
  for (const c of small) for (const q of c.pixels) img.data[q * 4 + 3] = 0;
  o.ctx.putImageData(img, 0, 0);
  return small.length;
}

(async () => {
  // --adjust <json> applies register.cjs's per-frame factors inside THIS
  // transform, so a registered clip is resampled once rather than twice.
  const ai = process.argv.indexOf('--adjust');
  const adjust = ai > -1 ? JSON.parse(fs.readFileSync(process.argv[ai + 1], 'utf8')) : null;
  const argv = process.argv.slice(2).filter((a, i, arr) => a !== '--adjust' && arr[i - 1] !== '--adjust');
  const [inDir, outDir, ...files] = argv;
  if (!files.length) { console.log('usage: node fitclip.cjs <inDir> <outDir> <frame...> [--adjust f.json]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  // Only the SCALE is taken from register.cjs. Its dx was measured against its
  // own centroid-based placement at its own common scale, so folding it into a
  // bbox-centred transform at a different scale mixes two coordinate systems —
  // that made the shrink guard fire and left frames clipped.
  const adj = files.map(f => ({ s: (adjust && adjust[f]) ? adjust[f].s : 1 }));

  const S = [];
  for (const f of files) {
    const o = await load(path.join(inDir, f));
    const removed = despeck(o);
    const b = ink(pixels(o), o.W, o.H);
    // PLACEMENT USES THE BBOX CENTRE, NOT THE INK CENTROID. The centroid is
    // right when you are searching (register.cjs) because it tracks the body's
    // mass. Here it is wrong: with an asymmetric silhouette — a coat swept to
    // one side — centring the mass leaves the far edge overhanging, the shrink
    // guard fires again and again, and 25 iterations later the whole clip is
    // 0.47x too small. longcoat came out at 4.7% cell coverage against 30%.
    S.push({ src: o, ...b, cx: b.bboxCx, removed });
  }

  const maxW = Math.max(...S.map((s, i) => s.w * adj[i].s));
  const maxH = Math.max(...S.map((s, i) => s.h * adj[i].s));
  let scale = Math.min((CELL_W - 2 * SIDE_MARGIN) / maxW, (CELL_H - FOOT_MARGIN - TOP_MARGIN) / maxH);

  const render = (s, sc, a) => {
    const o = blank(CELL_W, CELL_H);
    o.ctx.translate(CELL_W / 2, CELL_H - FOOT_MARGIN);
    o.ctx.scale(sc * a.s, sc * a.s);
    o.ctx.drawImage(s.src.canvas, -s.cx, -s.y1);
    o.ctx.setTransform(1, 0, 0, 1, 0, 0);
    despeck(o);   // resampling can strand a pixel or two
    return o;
  };

  // Safety net only: with a bbox-centre anchor and a scale taken from the
  // widest and tallest frame, nothing should overhang. If this fires,
  // something upstream is wrong — so it is capped low and reported.
  let guards = 0;
  for (; guards < 6; guards++) {
    if (!S.some((s, i) => edgeInk(pixels(render(s, scale, adj[i])), CELL_W, CELL_H).total)) break;
    scale *= 0.97;
  }

  const cov = [];
  S.forEach((s, i) => {
    const o = render(s, scale, adj[i]);
    save(o, path.join(outDir, files[i]));
    cov.push((s.w * s.h * (scale * adj[i].s) ** 2) / (CELL_W * CELL_H));
  });

  const hs = S.map(s => s.h);
  const spread = (Math.max(...hs) - Math.min(...hs)) / (hs.reduce((a, b) => a + b, 0) / hs.length);
  const specks = S.reduce((a, s) => a + s.removed, 0);
  console.log(`${files.length} frames at one scale ${scale.toFixed(4)} — heights spread ${(spread * 100).toFixed(1)}% (preserved), bbox fill ${(Math.min(...cov) * 100).toFixed(0)}-${(Math.max(...cov) * 100).toFixed(0)}% of cell`);
  if (specks) console.log(`  removed ${specks} speck(s) before measuring`);
  if (guards) console.log(`  WARNING: the shrink guard fired ${guards}x — placement should make that impossible, so something upstream is wrong.`);
  if (Math.min(...cov) < 0.35) console.log(`  WARNING: smallest frame fills only ${(Math.min(...cov) * 100).toFixed(0)}% of the cell. One outsized frame is shrinking the clip; check it for a stray mark or an over-wide pose.`);
})();
