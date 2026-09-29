// Render the concept plates, and MEASURE them against the request.
//
// `ART_REQUEST.md` §10.4 lists six subjects and a set of frame requirements
// it describes as "checkable before delivery". They never were: the three
// plates in the tree were all judged by eye after the fact, and one of them
// (`dockyard.jpg`) failed the camera requirement badly enough that three
// encounters had to be moved off it. This renders each subject and then
// checks the rules that are actually measurable from pixels — so a plate
// arrives with its verdict attached rather than earning one later.
//
// It also prints each plate's FLOOR QUAD, which is the number `js/plates.js`
// needs and the number v33 is a whole version about getting wrong by eye.
// These are drawn, so the quad is arithmetic.
//
// Usage:
//   NODE_PATH=$(npm root -g) node turf/tools/plate-concept.cjs [--out DIR]
//
// CommonJS, like every other browser harness here (playable/field-guide/
// pad-menu/impact): ESM does not honour NODE_PATH, and playwright is only
// installed globally in this sandbox.
//
// It draws on a real browser canvas because that is the renderer the game
// itself uses, and this sandbox has no node-side canvas. Same reasoning as
// toko-drop's enemy-loop.mjs: capture from the real thing.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DRAW = path.join(ROOT, 'art-src/backgrounds/concept/plate-draw.js');

const argOut = process.argv.indexOf('--out');
const OUT = argOut > 0 && process.argv[argOut + 1]
  ? path.resolve(process.argv[argOut + 1])
  : path.join(ROOT, 'art-src/backgrounds/concept');

// §10.4: "Landscape, at least 1600px wide." Rendered wider so a delivered
// photograph has room and the plate survives a phone's CSS `cover`.
const W = 1792, H = 1008;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.addScriptTag({ content: fs.readFileSync(DRAW, 'utf8').replace(/\bexport /g, '') });

  const ids = await page.evaluate(() => Object.keys(SUBJECTS));
  const report = [];

  for (const id of ids) {
    const { quad, stats } = await page.evaluate(([id, W, H]) => {
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      const quad = drawPlate(ctx, id, W, H);
      document.body.innerHTML = '';
      cv.id = 'plate';
      cv.style.cssText = 'position:fixed;left:0;top:0;';
      document.body.appendChild(cv);

      // ── the measurable half of §10.4 ────────────────────────────────
      const px = ctx.getImageData(0, 0, W, H).data;
      const lum = (i) => (px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722) / 255;

      // Mean luminance overall, and of the MIDDLE THIRD alone. The middle is
      // where twelve sprites and their badges sit, so it has to be the quietest
      // part of the picture — measured as contrast (stdev), not brightness: a
      // uniformly mid-grey middle is fine, a busy one is not.
      let all = 0, allSq = 0, n = 0;
      let midSum = 0, midSq = 0, midN = 0;
      const mx0 = (W / 3) | 0, mx1 = ((2 * W) / 3) | 0;
      const my0 = (H / 3) | 0, my1 = ((2 * H) / 3) | 0;
      let edgeSum = 0, edgeSq = 0, edgeN = 0;
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const L = lum((y * W + x) * 4);
          all += L; allSq += L * L; n++;
          if (x >= mx0 && x < mx1 && y >= my0 && y < my1) { midSum += L; midSq += L * L; midN++; }
          else { edgeSum += L; edgeSq += L * L; edgeN++; }
        }
      }
      const meanAll = all / n;
    const sdAll = Math.sqrt(Math.max(0, allSq / n - meanAll * meanAll));
      const midMean = midSum / midN, midSd = Math.sqrt(Math.max(0, midSq / midN - midMean * midMean));
      const edgeMean = edgeSum / edgeN, edgeSd = Math.sqrt(Math.max(0, edgeSq / edgeN - edgeMean * edgeMean));

      // "Light from one direction, consistent with the sprite plates — the cast
      // is lit from the upper left." Compare the upper-left quadrant's mean with
      // the lower-right's; upper left must be the brighter of the two.
      const quadMean = (x0, y0, x1, y1) => {
        let s = 0, c = 0;
        for (let y = y0; y < y1; y += 3) for (let x = x0; x < x1; x += 3) { s += lum((y * W + x) * 4); c++; }
        return s / c;
      };
      const ul = quadMean(0, 0, (W / 2) | 0, (H / 2) | 0);
      const lr = quadMean((W / 2) | 0, (H / 2) | 0, W, H);

      return { quad, stats: { meanAll, sdAll, midMean, midSd, edgeMean, edgeSd, ul, lr } };
    }, [id, W, H]);

    // JPEG at the shipping plates' own quality, not PNG. These are
  // photographic-register images of mostly smooth gradients, which is the
  // worst case for PNG: the first cut wrote 7.3MB of lossless flat sky for
  // six pictures whose delivered counterparts (courtyard.jpg) are under
  // 100KB each. Matching the delivered format also means the concept is
  // measured through the same compression the real plate will carry.
  await page.locator('#plate').screenshot({
    path: path.join(OUT, `${id}.jpg`), type: 'jpeg', quality: 82,
  });

    // The verdicts. Each is a rule from §10.4 stated as a number, so a plate
    // that breaks one says which one rather than "looks busy".
    const checks = [
      ['landscape >= 1600 wide', W >= 1600 && W > H, `${W}x${H}`],
      // CALIBRATED AGAINST THE TWO PLATES THAT WORK, not guessed — the same
    // discipline spritecheck.py's thresholds use. Measured: courtyard 0.143
    // mean / 0.102 contrast, schoolyard 0.103 / 0.099. And the plate that was
    // REJECTED for its camera, dockyard, reads 0.059 / 0.045.
    //
    // The first cut of this check only asked for "dark" (mean < 0.30) and the
    // concepts sailed through at 0.09 while reading as a flat wash under the
    // HUD gradient. Seating one under a real board is what exposed it, and the
    // measurement named the cause: the gap is not brightness, it is TONAL
    // RANGE. A plate with no range has nothing for the .55-.85 gradient to
    // leave behind. That is also what dockyard and the concepts have in
    // common, which is the tell.
    ['brightness in the shipping band', stats.meanAll >= 0.08 && stats.meanAll <= 0.18, `mean luminance ${stats.meanAll.toFixed(3)} (courtyard 0.143, schoolyard 0.103)`],
    ['tonal range like a plate that works', stats.sdAll >= 0.075, `contrast ${stats.sdAll.toFixed(3)} (shipping plates 0.099-0.102, rejected dockyard 0.045)`],
      ['middle third is the QUIET part', stats.midSd <= stats.edgeSd, `middle contrast ${stats.midSd.toFixed(3)} vs edges ${stats.edgeSd.toFixed(3)}`],
      ['light from the upper left', stats.ul > stats.lr, `UL ${stats.ul.toFixed(3)} vs LR ${stats.lr.toFixed(3)}`],
      ['floor seats an 11x9 board with margin', quad.halfH >= 0.18, `floor half-height ${quad.halfH}`],
    ];
    report.push({ id, quad, checks });
  }

  await browser.close();

  // ── the report ──────────────────────────────────────────────────────
  let failed = 0;
  console.log(`concept plates → ${path.relative(process.cwd(), OUT)}\n`);
  for (const r of report) {
    console.log(`${r.id}`);
    console.log(`  floor quad: { w: ${r.quad.w}, h: ${r.quad.h}, cx: ${r.quad.cx}, cy: ${r.quad.cy}, halfW: ${r.quad.halfW}, halfH: ${r.quad.halfH} }`);
    for (const [name, ok, detail] of r.checks) {
      if (!ok) failed++;
      console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${name} — ${detail}`);
    }
    console.log('');
  }
  console.log(failed
    ? `${failed} check(s) FAILED — see above`
    : `all ${report.length * 6} checks passed`);
  console.log('\nThe camera is NOT checked here because it cannot fail: plate-draw.js');
  console.log('projects every ground line through render.js\'s own toScreen, so a');
  console.log('ground line is at a tile-edge angle by construction. That is the whole');
  console.log('point of drawing the concept rather than commissioning it blind.');
  process.exit(failed ? 1 : 0);

})().catch(e => { console.error(e); process.exit(1); });
