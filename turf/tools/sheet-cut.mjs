// Cut the owner's own casting sheets into transparent 192x288 idle plates.
//
// The two sheets in `turf/references/` are the DESIGN — 26 characters, each
// drawn front and back on a flat magenta key. Two of them (`gunner`,
// `leopard`) were cropped by hand in 2026-08 and carried through a whole pose
// table; the other 24 have never been cut out of the sheet at all, so they
// exist in this repo as a picture of a roster rather than as a roster.
//
// NOTHING IS GENERATED HERE. `cast/README.md` records that Idle is the one
// pose that needs no model — "that same reference crop run straight through
// key -> fit 192x288 --no-quantise, with no generation step at all, and the
// highest-fidelity Idle this pipeline can produce". This is that, for all of
// them, in one pass.
//
// The cells are found by PROJECTION, not by a nominal grid. `cast/README.md`
// also records why: the sheet's rows and columns "bleed slightly past their
// nominal boundary", and a nominal crop put a sliver of the neighbouring
// character into `gunner-idle` twice. A projection cannot make that mistake —
// it asks where the ink actually stops.
//
//   node turf/tools/sheet-cut.mjs <sheet.png> <outDir> [--all]
//
// By default only the FRONT of each pair is written (the even figure in each
// row): this game mirrors its row in code and never draws a back. --all writes
// both, for a pipeline that wants the pair.
// playwright is a peer dep exposed with NODE_PATH, the same way every other
// tool in this repo takes it — nothing here is a runtime dependency of a game.
// It has to come through `createRequire`: NODE_PATH is a CommonJS resolver
// setting and the ESM loader ignores it, so a bare `import` finds nothing.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [src, outDir, ...flags] = process.argv.slice(2);
if (!src || !outDir) { console.error('usage: sheet-cut.mjs <sheet.png> <outDir> [--all]'); process.exit(1); }
const ALL = flags.includes('--all');
const W = 192, H = 288;

mkdirSync(outDir, { recursive: true });
const url = 'data:image/png;base64,' + readFileSync(src).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
const out = await page.evaluate(async ({ url, W, H, ALL }) => {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;

  // The key is whatever colour the corner is — the sheets are flat magenta but
  // reading it beats hard-coding it, since a second sheet may key differently.
  const key = [d[0], d[1], d[2]];
  const near = i => Math.abs(d[i] - key[0]) + Math.abs(d[i + 1] - key[1]) + Math.abs(d[i + 2] - key[2]) < 90;
  const ink = new Uint8Array(c.width * c.height);
  for (let p = 0, i = 0; p < ink.length; p++, i += 4) ink[p] = near(i) ? 0 : 1;

  // Bands of rows that contain ink, then runs of columns inside each band.
  // A gap has to be WIDE to count, or one figure's raised arm splits it in two.
  const runs = (n, has, minGap) => {
    const r = []; let s = -1, gap = 0;
    for (let i = 0; i <= n; i++) {
      if (i < n && has(i)) { if (s < 0) s = i; gap = 0; }
      else if (s >= 0 && (++gap > minGap || i === n)) { r.push([s, i - gap]); s = -1; gap = 0; }
    }
    return r.filter(([a, b]) => b - a > 8);
  };
  const rowHas = y => { for (let px = 0; px < c.width; px++) if (ink[y * c.width + px]) return true; return false; };
  const bands = runs(c.height, rowHas, 6);

  const cells = [];
  for (const [bi, [y0, y1]] of bands.entries()) {
    const colHas = px => { for (let y = y0; y <= y1; y++) if (ink[y * c.width + px]) return true; return false; };
    let cols = runs(c.width, colHas, 10);
    // A prop can BRIDGE the gap between a figure and its own back view — the
    // sledgehammer is held across the body and its handle reaches into the
    // next cell, merging two figures into one 300px run and shifting every
    // name after it in the row. So any run much wider than its neighbours is
    // split at its thinnest interior column, which is where the two bodies
    // very nearly stop touching. Measured against the row's own median rather
    // than a constant: the sheets are not all the same scale.
    const colInk = px => { let n = 0; for (let y = y0; y <= y1; y++) if (ink[y * c.width + px]) n++; return n; };
    const med = [...cols.map(([a, b]) => b - a)].sort((p, q) => p - q)[cols.length >> 1];
    for (let pass = 0; pass < 4; pass++) {
      const next = [];
      let split = false;
      for (const [a, b] of cols) {
        if (b - a > med * 1.5) {
          const lo = a + Math.round((b - a) * 0.3), hi = a + Math.round((b - a) * 0.7);
          let best = lo, bestN = Infinity;
          for (let px = lo; px <= hi; px++) { const n = colInk(px); if (n < bestN) { bestN = n; best = px; } }
          next.push([a, best - 1], [best + 1, b]); split = true;
        } else next.push([a, b]);
      }
      cols = next;
      if (!split) break;
    }
    cols.forEach(([a, b], i) => {
      if (!ALL && i % 2) return;                       // fronts are the even figure of each pair
      // Tighten the band to THIS figure: a row band is as tall as its tallest
      // member, so a short one would be cut standing in the air.
      let top = y1, bot = y0;
      for (let y = y0; y <= y1; y++) for (let px = a; px <= b; px++) if (ink[y * c.width + px]) { if (y < top) top = y; if (y > bot) bot = y; break; }
      cells.push({ x: a, y: top, w: b - a + 1, h: bot - top + 1, col: i, band: bi });
    });
  }

  // Key out, then fit. `imageSmoothingEnabled = false` on the way down: it is
  // pixel art and a smooth resample is what turns a 9x figure into a blur.
  const res = [];
  for (const cell of cells) {
    const s = document.createElement('canvas');
    s.width = cell.w; s.height = cell.h;
    const sx = s.getContext('2d', { willReadFrequently: true });
    sx.drawImage(c, cell.x, cell.y, cell.w, cell.h, 0, 0, cell.w, cell.h);
    const sd = sx.getImageData(0, 0, cell.w, cell.h);
    const D = sd.data;
    // Stage one: the flat key itself.
    for (let i = 0; i < D.length; i += 4) {
      D[i + 3] = Math.abs(D[i] - key[0]) + Math.abs(D[i + 1] - key[1]) + Math.abs(D[i + 2] - key[2]) < 90 ? 0 : 255;
    }
    // Stage two: THE FRINGE, and it is the whole difference between a cut-out
    // and a sticker. The sheet is antialiased against magenta, so the pixel
    // ring where a figure meets the background is the figure's colour BLENDED
    // with the key — nowhere near it, so stage one keeps it, and the result is
    // every character wearing a magenta rim. It is the same fault as this
    // repo's white-sticker-outline note in reverse.
    //
    // A blended pixel is recognisable rather than merely near the key: magenta
    // has no green in it, so contamination shows up as R and B both well above
    // G. Only pixels ON the edge are tested, or a genuinely purple jacket
    // would be eaten out of the middle of a figure.
    const magenta = i => D[i] > D[i + 1] + 38 && D[i + 2] > D[i + 1] + 38;
    for (let pass = 0; pass < 2; pass++) {
      const doomed = [];
      for (let y = 0; y < cell.h; y++) for (let px = 0; px < cell.w; px++) {
        const i = (y * cell.w + px) * 4;
        if (!D[i + 3] || !magenta(i)) continue;
        const open = (y > 0 && !D[i - cell.w * 4 + 3]) || (y < cell.h - 1 && !D[i + cell.w * 4 + 3])
          || (px > 0 && !D[i - 4 + 3]) || (px < cell.w - 1 && !D[i + 4 + 3]);
        if (open) doomed.push(i + 3);
      }
      if (!doomed.length) break;
      for (const a of doomed) D[a] = 0;
    }
    sx.putImageData(sd, 0, 0);
    const o = document.createElement('canvas');
    o.width = W; o.height = H;
    const ox = o.getContext('2d');
    ox.imageSmoothingEnabled = false;
    const k = Math.min(H / cell.h, W / cell.w);
    const dw = Math.round(cell.w * k), dh = Math.round(cell.h * k);
    ox.drawImage(s, Math.round((W - dw) / 2), H - dh, dw, dh);   // feet on the baseline
    res.push({ ...cell, png: o.toDataURL('image/png') });
  }
  return { key, bands: bands.length, cells: res.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, col: r.col, band: r.band, png: r.png })) };
}, { url, W, H, ALL });
await browser.close();

// Name by position on the sheet: the sheet is the record, so the file says
// where it came from and a human names it after looking at it.
// Named by where it stands on the sheet, because the sheet is the record: a
// person names it after looking at it, and the file says where to go back to.
out.cells.forEach((c, i) => {
  const name = `r${c.band + 1}c${Math.floor(c.col / (ALL ? 1 : 2)) + 1}${ALL ? (c.col % 2 ? 'b' : 'f') : ''}`;
  writeFileSync(join(outDir, name + '.png'), Buffer.from(c.png.split(',')[1], 'base64'));
  console.log(`  ${name.padEnd(6)} ${String(c.w).padStart(4)}x${String(c.h).padStart(4)} at ${c.x},${c.y}`);
});
console.log(`\n${out.cells.length} figures, key rgb(${out.key.join(',')}), ${out.bands} rows`);
