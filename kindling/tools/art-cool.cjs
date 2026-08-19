#!/usr/bin/env node
/**
 * Kindling — take the fire's job back off a layer that did it in paint.
 *
 *   node tools/art-cool.cjs <in.png> <out.png> [--target 14] [--report]
 *
 * WHY THIS EXISTS. `js/palette.js` states the scheme in one line: *the
 * environment is COLD and the fire is the only warm thing in it* — everything
 * is drawn from a cold ramp and warmed by distance from the flame, and that
 * subtraction is what makes forty pixels of firelight feel like shelter. It is
 * not decoration: `lightAt()` is a MEASURE, and how far the ember ramp reaches
 * IS the day's tally. Warmth the art bakes in is warmth the day cannot add.
 *
 * The first camp delivery measured 84.8% of `camp-ground.png` already warm
 * before any fire existed (red leading blue by more than 40, which is exactly
 * the test the smoke gate counts with). The consequence is not that it looks
 * wrong — it looked good — but that the reward loop goes flat. Walking the six
 * light bands measured
 *
 *     2008 → 11772 → 12155 → 13369 → 15445 → 17713
 *
 * a 5.9x cliff from band 0 to band 1 and then almost nothing: of the five small
 * things you can do in a day, the first did nearly all the visible work and the
 * other four barely registered. Drawn in code the same ladder ran
 * 1243 → 2322 → 3261 → 4137 → 5089 → 5997 — every step worth about the same.
 *
 * WHAT IT DOES. Only the warm axis moves. A pixel's LUMINANCE is preserved, so
 * the art keeps its values, its texture and its silhouette — a cooled ground is
 * the same picture in moonlight rather than a darker or bluer one. Hue that is
 * not warm is left alone, which is why grass stays green: the test is red
 * leading blue, and green leads neither.
 *
 * It runs on a finished 320x180 asset, AFTER `art-quantise.cjs`, and snaps back
 * onto `js/palette.js` at the end because a cooled pixel is a new colour and
 * this game's assets are quantised on purpose.
 *
 * `--target` is the r-b gap to leave behind (default 14). It is deliberately
 * under the gate's threshold of 40 rather than at zero: a stone that is
 * literally neutral reads as dead, and the fire still has to have something to
 * push against.
 *
 * Needs `playwright` resolvable, same as test/smoke.cjs.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const has = (n) => args.includes('--' + n);
const pos = args.filter(a => !a.startsWith('--') && !/^\d+$/.test(a));
const [src, out] = pos;
if (!src || (!out && !has('report'))) {
  console.error('usage: art-cool.cjs <in.png> <out.png> [--target 14] [--report]');
  process.exit(2);
}
const TARGET = +flag('target', 14);

const palSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'palette.js'), 'utf8');
const PAL = [...new Set(palSrc.match(/#[0-9a-fA-F]{6}/g) || [])].map(h => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('data:text/html,<body>');
  const b64 = fs.readFileSync(src).toString('base64');

  const res = await page.evaluate(async ({ b64, PAL, TARGET, REPORT }) => {
    const im = new Image(); im.src = `data:image/png;base64,${b64}`; await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), p = d.data;

    // the gate's own ruler, so this tool and the test agree on the word "warm"
    const isWarm = (r, gg, b) => r - b > 40 && r > 60;
    const lum = (r, gg, b) => 0.30 * r + 0.59 * gg + 0.11 * b;

    let opaque = 0, warmBefore = 0, warmAfter = 0;
    for (let i = 0; i < p.length; i += 4) {
      if (p[i + 3] < 128) continue;
      opaque++;
      const r0 = p[i], g0 = p[i + 1], b0 = p[i + 2];
      if (isWarm(r0, g0, b0)) warmBefore++;
      if (REPORT) continue;

      let r = r0, gg = g0, b = b0;
      const gap = r - b;
      if (gap > TARGET) {
        // close the warm axis around its own midpoint, then put the luminance
        // back. Splitting the correction between red and blue is what keeps the
        // value: pulling red down alone darkens every warm surface in the frame.
        const k = (gap - TARGET) / 2;
        r -= k; b += k;
        const L0 = lum(r0, g0, b0), L1 = lum(r, gg, b);
        if (L1 > 0.5) { const s = L0 / L1; r *= s; gg *= s; b *= s; }
      }
      // snap back onto the game's palette — a cooled pixel is a new colour, and
      // these assets are quantised on purpose
      let best = 0, bd = 1e9;
      for (let k = 0; k < PAL.length; k++) {
        const q = PAL[k];
        const dd = (r - q[0]) ** 2 * 0.3 + (gg - q[1]) ** 2 * 0.59 + (b - q[2]) ** 2 * 0.11;
        if (dd < bd) { bd = dd; best = k; }
      }
      p[i] = PAL[best][0]; p[i + 1] = PAL[best][1]; p[i + 2] = PAL[best][2];
      if (isWarm(p[i], p[i + 1], p[i + 2])) warmAfter++;
    }
    if (!REPORT) g.putImageData(d, 0, 0);
    return { url: REPORT ? null : c.toDataURL('image/png'),
             w: c.width, h: c.height, opaque, warmBefore, warmAfter };
  }, { b64, PAL, TARGET, REPORT: has('report') });

  const pct = n => (100 * n / Math.max(1, res.opaque)).toFixed(1) + '%';
  if (has('report')) {
    console.log(`${path.basename(src)}  ${res.w}x${res.h}  opaque ${res.opaque}  warm ${res.warmBefore} (${pct(res.warmBefore)})`);
  } else {
    fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
    console.log(`→ ${path.basename(out)}  ${res.w}x${res.h}  warm ${res.warmBefore} (${pct(res.warmBefore)}) → ${res.warmAfter} (${pct(res.warmAfter)})`);
  }
  await browser.close();
})();
