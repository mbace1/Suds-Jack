#!/usr/bin/env node
/**
 * Kindling — IS THIS SHEET CUTTABLE?
 *
 *   node tools/art-check.cjs [dir]        (default: art-src/approved)
 *
 * `art-src/ART_REQUESTS.md` §1 lists the delivery rules that make a sheet
 * sliceable rather than merely lovely. Rules nobody can check are rules that
 * get broken silently, and this project has already paid for that twice: five
 * scene concepts arrived at 160x90 — thumbnails of the art, not the art — and
 * a re-delivery arrived truncated. Neither is visible in a file listing.
 *
 * So this measures the rules instead of restating them:
 *
 *   FORMAT      PNG with a real alpha channel. WebP and JPEG fail (rule 1).
 *   SIZE        at least as wide as the 320x180 native grid, or it is a
 *               thumbnail whatever it is called (rules 2 and 5).
 *   ALPHA       any transparency at all. A sheet with none is a picture of
 *               elements, not a set of elements.
 *   BOARD TELL  the four corners. A presentation board is opaque near-black at
 *               every corner with captions and drop shadows baked in — it can
 *               be read and cannot be cut, because its background is not
 *               separable from its art (rules 1 and 3). This is the single
 *               most useful check here: it is exactly what landed.
 *   COLOURS     distinct colour count, and how much of the art sits on the
 *               game's own palette (rule 6). A faux-pixel illustration gives
 *               itself away with thousands of colours where a real limited
 *               palette gives dozens.
 *
 * Advisory by default so it can be run against art nobody promised yet; pass
 * --strict to exit non-zero, which is what a gate should do.
 *
 * Needs `playwright` resolvable, same as test/smoke.cjs
 * (NODE_PATH=$(npm root -g) node tools/art-check.cjs).
 */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const DIR = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]) || 'art-src/approved';
const STRICT = process.argv.includes('--strict');
const GRID_W = 320, GRID_H = 180;

// the game's own colours, flattened out of js/palette.js without importing it
// (this is a .cjs tool and palette.js is an ES module — reading it is simpler
// and cannot drift, because it takes every hex literal in the file)
const palSrc = fs.readFileSync(path.join(__dirname, '..', 'js', 'palette.js'), 'utf8');
const PAL = [...new Set(palSrc.match(/#[0-9a-fA-F]{6}/g) || [])].map(h => [
  parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

const walk = (d, out = []) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(png|webp|jpe?g|gif|bmp)$/i.test(e.name)) out.push(p);
  }
  return out;
};

(async () => {
  const files = walk(DIR).sort();
  if (!files.length) { console.log(`no images under ${DIR}`); process.exit(0); }

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('data:text/html,<body>');

  let fails = 0;
  console.log(`\n  ${'file'.padEnd(46)} ${'format'.padEnd(6)} ${'size'.padEnd(11)} alpha corners  colours  on-pal`);
  console.log('  ' + '-'.repeat(104));

  for (const f of files) {
    const buf = fs.readFileSync(f);
    // format by magic bytes, never by extension — an extension is a claim
    const fmt = buf.slice(0, 8).toString('hex').startsWith('89504e47') ? 'png'
      : buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP' ? 'webp'
      : buf.slice(0, 3).toString('hex') === 'ffd8ff' ? 'jpeg' : '?';

    const dataUrl = `data:image/${fmt === '?' ? 'png' : fmt};base64,${buf.toString('base64')}`;
    const r = await page.evaluate(async (u) => {
      const im = new Image(); im.src = u; await im.decode();
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let clear = 0; const cols = new Set(); const px = [];
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) { clear++; continue; }
        cols.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
        if ((i / 4) % 97 === 0) px.push([d[i], d[i + 1], d[i + 2]]);
      }
      const at = (x, y) => { const i = (y * c.width + x) * 4; return [d[i], d[i + 1], d[i + 2], d[i + 3]]; };
      const corners = [at(0, 0), at(c.width - 1, 0), at(0, c.height - 1), at(c.width - 1, c.height - 1)];
      return { w: im.width, h: im.height, total: c.width * c.height, clear, colours: cols.size, corners, px };
    }, dataUrl);

    const alphaPct = r.total ? (r.clear / r.total) * 100 : 0;
    // a board tell: every corner opaque AND dark
    const opaqueDarkCorners = r.corners.filter(c => c[3] > 250 && (c[0] + c[1] + c[2]) / 3 < 60).length;
    const onPal = r.px.length ? r.px.filter(p =>
      PAL.some(q => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) <= 24)
    ).length / r.px.length * 100 : 0;

    const bad = [];
    if (fmt !== 'png') bad.push('not PNG');
    if (r.w < GRID_W || r.h < GRID_H) bad.push(`under ${GRID_W}x${GRID_H}`);
    if (alphaPct < 0.5) bad.push('no alpha');
    if (opaqueDarkCorners === 4) bad.push('board');
    if (bad.length) fails++;

    console.log(`  ${(bad.length ? '! ' : '  ') + path.relative(DIR, f).padEnd(44)} ${fmt.padEnd(6)} ` +
      `${(r.w + 'x' + r.h).padEnd(11)} ${alphaPct.toFixed(0).padStart(4)}% ${String(opaqueDarkCorners).padStart(5)}/4 ` +
      `${String(r.colours).padStart(8)} ${onPal.toFixed(0).padStart(6)}%` + (bad.length ? `   ${bad.join(', ')}` : ''));
  }

  console.log('\n  colours: distinct RGB among opaque pixels. Thousands = an illustration, not pixel art (rule 4).');
  console.log('  on-pal : sampled pixels within 24 of a js/palette.js colour (rule 6).');
  console.log('  corners: opaque AND dark corners. 4/4 is a presentation board — readable, not cuttable.');
  console.log(fails ? `\n✗ ${fails} of ${files.length} file(s) are not deliverable as cut sources`
    : `\n✓ all ${files.length} file(s) meet the delivery rules`);

  await browser.close();
  process.exit(fails && STRICT ? 1 : 0);
})();
