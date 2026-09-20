// Scale + origin normalisation in post.
//
// SUPERSEDED IN THE PIPELINE by fitclip.cjs, which fits a whole clip at one
// scale and cannot clip by construction. This file is kept for ad-hoc rescue
// work on frames whose keyed originals are gone. Note the fault it shipped: it
// centred on the middle of the BOTTOM ROW, which in a wide stride is a single
// boot — that parked the boot mid-cell and threw the body off the canvas, and
// it is why 63 of 133 frames were cropped. It uses the ink centroid now.
// Bbox HEIGHT is the wrong scale anchor: body-height rhythm (Bible 7.4) is a
// required feature, so normalising it would delete the animation. Head width
// is near pose-invariant instead — the head neither compresses nor extends
// through a run cycle. The measurement itself is shared with drift.cjs via
// measure.cjs, so the checker and the fixer can never disagree about it.
const fs = require('fs'); const path = require('path');
const { load, blank, pixels, save, ink } = require(path.join(__dirname, 'img.cjs'));
const { measure } = require(path.join(__dirname, 'measure.cjs'));

const HEAD_SLICE = 0.22, FOOT_MARGIN = 10;
// --origin-only parks the ground-contact point without rescaling. It exists
// for clips where head width is not a valid scale anchor (a reaction: the head
// tilts, so its projected width changes by design). Scaling on a broken anchor
// is worse than not scaling at all.
(async () => {
  const originOnly = process.argv.includes('--origin-only');
  const [dir, outDir, ...files] = process.argv.slice(2).filter(a => a !== '--origin-only');
  if (!files.length) { console.log('usage: node normalise.cjs <dir> <outDir> <frame...> [--origin-only]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });

  const srcs = [];
  for (const f of files) {
    const o = await load(path.join(dir, f));
    const d = pixels(o);
    srcs.push({ o, m: measure(d, o.W, o.H, HEAD_SLICE), b: ink(d, o.W, o.H) });
  }
  const spread = a => Math.max(...a) - Math.min(...a);
  const pct = a => 100 * spread(a) / (a.reduce((s, v) => s + v, 0) / a.length);
  const hw = srcs.map(s => s.m.headW);
  const target = Math.round(hw.reduce((a, b) => a + b, 0) / hw.length);
  console.log(`head widths before: ${hw.join(', ')}  spread ${spread(hw)}px (${pct(hw).toFixed(1)}%)`);

  const draw = (s, dx, dy, sc) => {
    const o = blank(s.o.W, s.o.H);
    o.ctx.translate(s.o.W / 2 + dx, s.o.H - FOOT_MARGIN + dy);
    o.ctx.scale(sc, sc);
    o.ctx.drawImage(s.o.canvas, -s.b.centroid, -s.m.y1);
    return o;
  };

  const after = [];
  srcs.forEach((s, i) => {
    let sc = originOnly ? 1 : target / s.m.headW, dx = 0, dy = 0, shrunk = false;
    // NOTHING MAY LEAVE THE CELL. Translate to pull overflow back in; if it
    // still does not fit, scale down and say so. A cropped sprite passes every
    // other gate in this toolchain, so it has to be made impossible here.
    for (let guard = 0; guard < 12; guard++) {
      const b = ink(pixels(draw(s, dx, dy, sc)), s.o.W, s.o.H);
      const oL = Math.max(0, -b.x0), oR = Math.max(0, b.x1 - (s.o.W - 1));
      const oT = Math.max(0, -b.y0), oB = Math.max(0, b.y1 - (s.o.H - 1));
      if (!oL && !oR && !oT && !oB) break;
      if ((oL && oR) || (oT && oB)) { sc *= 0.97; shrunk = true; continue; }
      dx += oL - oR; dy += oT - oB;
    }
    const o = draw(s, dx, dy, sc);
    save(o, path.join(outDir, files[i]));
    after.push(measure(pixels(o), s.o.W, s.o.H, HEAD_SLICE).headW);
    if (shrunk) console.log(`  note: ${files[i]} did not fit the cell and was scaled down to fit.`);
  });

  if (!originOnly) {
    console.log(`head widths after:  ${after.join(', ')}  spread ${spread(after)}px (${pct(after).toFixed(1)}%)`);
    if (pct(after) > pct(hw)) {
      for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(outDir, f));
      console.log(`REVERTED: rescaling made the spread worse (${pct(hw).toFixed(1)}% -> ${pct(after).toFixed(1)}%), originals copied through.`);
      console.log(`  The head-width anchor is not stable on this character — expect loose hair or a limb reaching into the head band.`);
    } else if (pct(after) > 4) {
      console.log(`WARNING: spread is still ${pct(after).toFixed(1)}% after rescaling (tolerance is 4%).`);
      console.log(`  Something other than the head is being measured as head — usually a weapon or a raised arm swinging into the top of the sprite. Prefer --origin-only for this clip.`);
    }
  }
})();
