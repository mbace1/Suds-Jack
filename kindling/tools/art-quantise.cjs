#!/usr/bin/env node
/**
 * Kindling — turn a generated illustration into an asset this game can use.
 *
 *   node tools/art-quantise.cjs <in> <out.png> --w 320 --h 180 [--key ff00ff]
 *                               [--dither] [--opaque] [--report]
 *
 * THIS IS THE STEP THAT WAS MISSING, and it is why every delivery so far has
 * been unusable. `art-check.cjs` measured the current sheets at 3,110–20,073
 * distinct colours while 74–100% of their pixels already sat within 24 of a
 * colour in js/palette.js. In other words the art was on-palette in SPIRIT and
 * nowhere near it in fact: every edge anti-aliased into in-between values.
 *
 * Size, format and transparency are *transfer* problems — a re-export fixes
 * them. The colour count is an *authoring* problem and a re-export does not
 * touch it. So a delivery at 320x180 in PNG with alpha would STILL have been
 * soft. Something has to quantise, and this is it.
 *
 * The order matters and is not obvious:
 *
 *   1. KEY FIRST, at full resolution. Chroma removal is a per-pixel hue test,
 *      and it is far more accurate on the original than on a downscale that
 *      has already blended key colour into every edge.
 *   2. DOWNSCALE SMOOTH, not nearest. This is the one place the "nearest
 *      neighbour only" rule does not apply: that rule is about REVIEW copies
 *      being scaled UP, where smoothing destroys the pixel grid. Coming down
 *      from a large render, nearest-neighbour point-samples one pixel in
 *      thirty and the result is aliased confetti. Area-averaging is what
 *      turns a big soft image into a small clean one.
 *   3. QUANTISE LAST, after the image is already at final size, so every
 *      surviving pixel is forced onto a real palette colour and the count
 *      lands in the dozens where it belongs.
 *
 * `--dither` adds a 4x4 Bayer threshold before the palette match, which is
 * what the game's own pixel.js does for its ramps — worth it on a big sky
 * gradient, wrong on a small prop where it reads as noise.
 *
 * Needs `playwright` resolvable, same as test/smoke.cjs.
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; };
const has = (n) => args.includes('--' + n);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['dither', 'opaque', 'report'].includes(args[i - 1].slice(2))));
const [src, out] = pos;
if (!src || !out) { console.error('usage: art-quantise.cjs <in> <out.png> --w 320 --h 180 [--key ff00ff] [--dither] [--opaque]'); process.exit(2); }
const W = +flag('w', 320), H = +flag('h', 180), KEY = flag('key', 'ff00ff');

const palSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'palette.js'), 'utf8');
const PAL = [...new Set(palSrc.match(/#[0-9a-fA-F]{6}/g) || [])].map(h => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('data:text/html,<body>');
  const b64 = fs.readFileSync(src).toString('base64');
  const ext = path.extname(src).slice(1).replace('jpg', 'jpeg');

  const res = await page.evaluate(async ({ b64, ext, W, H, KEY, PAL, DITHER, OPAQUE }) => {
    const im = new Image(); im.src = `data:image/${ext};base64,${b64}`; await im.decode();

    // 1 — key at FULL resolution
    const big = document.createElement('canvas');
    big.width = im.width; big.height = im.height;
    const bg = big.getContext('2d', { willReadFrequently: true });
    bg.drawImage(im, 0, 0);
    if (!OPAQUE) {
      const kr = parseInt(KEY.slice(0, 2), 16), kg = parseInt(KEY.slice(2, 4), 16), kb = parseInt(KEY.slice(4, 6), 16);
      const d = bg.getImageData(0, 0, big.width, big.height);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], g = p[i + 1], b = p[i + 2];
        // the same hue-ratio shape keylib.js uses: magenta is the only colour
        // where green sits below BOTH red and blue, which a plain distance
        // test cannot say
        const mn = Math.min(r, b);
        if (kg < kr && kg < kb) {
          if (g < mn * 0.80 && mn > 45 && mn - g > 25) { p[i + 3] = 0; continue; }
          if (g < mn) { const k = (mn - g) * 0.9; p[i] = r - k; p[i + 2] = b - k; }
        } else if (Math.abs(r - kr) + Math.abs(g - kg) + Math.abs(b - kb) < 90) p[i + 3] = 0;
      }
      bg.putImageData(d, 0, 0);
    }

    // 2 — downscale SMOOTH to final size
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g2 = c.getContext('2d', { willReadFrequently: true });
    g2.imageSmoothingEnabled = true; g2.imageSmoothingQuality = 'high';
    g2.drawImage(big, 0, 0, W, H);

    // 3 — quantise onto the palette
    const BAYER = [[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]];
    const d2 = g2.getImageData(0, 0, W, H); const q = d2.data;
    const before = new Set(), after = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (q[i + 3] < 110) { q[i + 3] = 0; continue; }   // hard alpha, no soft edge
      q[i + 3] = 255;
      before.add((q[i] << 16) | (q[i + 1] << 8) | q[i + 2]);
      let r = q[i], g = q[i + 1], b = q[i + 2];
      if (DITHER) { const t = (BAYER[y & 3][x & 3] / 16 - 0.5) * 22; r += t; g += t; b += t; }
      let best = 0, bd = 1e9;
      for (let k = 0; k < PAL.length; k++) {
        const p = PAL[k];
        const dd = (r - p[0]) ** 2 * 0.3 + (g - p[1]) ** 2 * 0.59 + (b - p[2]) ** 2 * 0.11;
        if (dd < bd) { bd = dd; best = k; }
      }
      q[i] = PAL[best][0]; q[i + 1] = PAL[best][1]; q[i + 2] = PAL[best][2];
      after.add((q[i] << 16) | (q[i + 1] << 8) | q[i + 2]);
    }
    g2.putImageData(d2, 0, 0);
    let clear = 0;
    for (let i = 3; i < q.length; i += 4) if (!q[i]) clear++;
    return { url: c.toDataURL('image/png'), before: before.size, after: after.size,
             clearPct: clear / (W * H) * 100 };
  }, { b64, ext, W, H, KEY, PAL, DITHER: has('dither'), OPAQUE: has('opaque') });

  fs.writeFileSync(out, Buffer.from(res.url.split(',')[1], 'base64'));
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`→ ${path.basename(out)}  ${W}x${H}  ${kb} KB  colours ${res.before} → ${res.after}  alpha ${res.clearPct.toFixed(0)}%`);
  await browser.close();
})();
