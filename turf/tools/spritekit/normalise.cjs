// Scale + origin normalisation in post.
// Bbox HEIGHT is the wrong scale anchor: body-height rhythm (Bible 7.4) is a
// required feature, so normalising it would delete the animation. Head width
// is near pose-invariant instead — the head neither compresses nor extends
// through a run cycle. The measurement itself is shared with drift.cjs via
// measure.cjs, so the checker and the fixer can never disagree about it.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { MEASURE_SRC } = require(path.join(__dirname, 'measure.cjs'));
const HEAD_SLICE = 0.22, FOOT_MARGIN = 10;
// --origin-only parks the ground-contact point without rescaling. It exists
// for clips where head width is not a valid scale anchor (a reaction: the head
// tilts, so its projected width changes by design — see measure.cjs). Scaling
// on a broken anchor is worse than not scaling at all.
(async () => {
  const originOnly = process.argv.includes('--origin-only');
  const [dir, outDir, ...files] = process.argv.slice(2).filter(a => a !== '--origin-only');
  fs.mkdirSync(outDir, { recursive: true });
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');
  const LIB = MEASURE_SRC;
  // A rescale can only help if the measurement it is built on is stable. On a
  // character with loose hair it is NOT, and rescaling then makes the spread
  // WORSE (leopard: 6.3% in, 9.8% out) because the head blob moves under
  // resampling. So the third pass re-measures what was written and, if the
  // spread did not improve, throws the rescale away and copies the originals
  // through. A fixer that can make things worse without saying so is worse
  // than no fixer.
  const stats = [];
  for (const pass of ['measure', 'apply']) {
    const target = stats.length ? Math.round(stats.reduce((s, m) => s + m.headW, 0) / stats.length) : 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
      const r = await pg.evaluate(async ({ url, lib, mode, target, margin, slice, originOnly }) => {
        const measure = new Function('return (' + lib + ')')();
        const im = new Image(); im.src = url; await im.decode();
        const W = im.width, H = im.height;
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        const data = g.getImageData(0, 0, W, H).data;
        const m = measure(data, W, H, slice);
        if (mode === 'measure') return { headW: m.headW, ih: m.ih };
        const s = originOnly ? 1 : target / m.headW;
        // HORIZONTAL ANCHOR IS THE INK CENTROID, NOT THE CENTRE OF THE BOTTOM
        // ROW. In a wide stride the bottom row is a single boot off to one
        // side; centring on it parks that boot mid-cell and throws the body off
        // the canvas. That one line clipped 63 of 102 shipped frames.
        let sx = 0, n = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
          if (data[(y * W + x) * 4 + 3] > 127) { sx += x; n++; }
        const cx = n ? sx / n : m.footCx;

        const draw = (dx, dy, sc) => {
          const o = document.createElement('canvas'); o.width = W; o.height = H;
          const og = o.getContext('2d'); og.imageSmoothingEnabled = false;
          // scale about the ground-contact point, then park that point at a fixed spot
          og.translate(W / 2 + dx, H - margin + dy);
          og.scale(sc, sc);
          og.drawImage(c, -cx, -m.y1);
          return o;
        };
        const inkBox = (canvas) => {
          const gg = canvas.getContext('2d', { willReadFrequently: true });
          const dd = gg.getImageData(0, 0, W, H).data;
          let x0 = W, x1 = -1, y0 = H, y1b = -1;
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dd[(y * W + x) * 4 + 3] > 127) {
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1b) y1b = y;
          }
          return { x0, x1, y0, y1: y1b };
        };

        // NOTHING MAY LEAVE THE CELL. Translate to pull any overflow back in;
        // if the figure is still too big to fit, scale it down about the ground
        // point until it does and say so — a cropped sprite passes every other
        // gate in this toolchain, so it has to be made impossible here.
        let sc = s, dx = 0, dy = 0, shrunk = false;
        for (let guard = 0; guard < 12; guard++) {
          const b = inkBox(draw(dx, dy, sc));
          const overL = Math.max(0, -b.x0), overR = Math.max(0, b.x1 - (W - 1));
          const overT = Math.max(0, -b.y0), overB = Math.max(0, b.y1 - (H - 1));
          if (!overL && !overR && !overT && !overB) break;
          if (overL && overR || overT && overB) { sc *= 0.97; shrunk = true; continue; }
          dx += overL - overR; dy += overT - overB;
        }
        const o = draw(dx, dy, sc);
        return { url: o.toDataURL('image/png'), headW: m.headW, ih: m.ih, shrunk, dx, dy };
      }, { url: `data:image/png;base64,${b64}`, lib: LIB, mode: pass, target, margin: FOOT_MARGIN, slice: HEAD_SLICE, originOnly });
      if (pass === 'measure') stats.push(r);
      else {
        fs.writeFileSync(path.join(outDir, f), Buffer.from(r.url.split(',')[1], 'base64'));
        if (r.shrunk) console.log(`  note: ${f} did not fit the cell and was scaled down to fit.`);
      }
    }
  }
  const spread = a => Math.max(...a) - Math.min(...a);
  const pct = a => 100 * spread(a) / (a.reduce((s, v) => s + v, 0) / a.length);
  const hw = stats.map(s => s.headW);
  console.log(`head widths before: ${hw.join(', ')}  spread ${spread(hw)}px (${pct(hw).toFixed(1)}%)`);

  if (!originOnly) {
    const after = [];
    for (const f of files) {
      const b64 = fs.readFileSync(path.join(outDir, f)).toString('base64');
      const m = await pg.evaluate(async ({ url, lib, slice }) => {
        const measure = new Function('return (' + lib + ')')();
        const im = new Image(); im.src = url; await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0);
        return measure(g.getImageData(0, 0, im.width, im.height).data, im.width, im.height, slice);
      }, { url: `data:image/png;base64,${b64}`, lib: LIB, slice: HEAD_SLICE });
      after.push(m.headW);
    }
    console.log(`head widths after:  ${after.join(', ')}  spread ${spread(after)}px (${pct(after).toFixed(1)}%)`);
    if (pct(after) > pct(hw)) {
      for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(outDir, f));
      console.log(`REVERTED: rescaling made the spread worse (${pct(hw).toFixed(1)}% -> ${pct(after).toFixed(1)}%), originals copied through.`);
      console.log(`  The head-width anchor is not stable on this character — expect loose hair or a limb reaching into the head band. Set the scale by hand, or gate this clip with drift.cjs --no-scale.`);
    } else if (pct(after) > 4) {
      // it improved, but not to anywhere trustworthy. An attack clip does this:
      // the weapon swings up into the top-of-ink band and gets measured as head
      // (ranged `fire` read 138px against a real ~74px). Scaling on that number
      // then mis-sizes every frame relative to the others.
      console.log(`WARNING: spread is still ${pct(after).toFixed(1)}% after rescaling (tolerance is 4%).`);
      console.log(`  Something other than the head is being measured as head — usually a weapon or a raised arm swinging into the top of the sprite. Prefer --origin-only for this clip.`);
    }
  }
  await br.close();
})();
