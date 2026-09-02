// Per-cycle geometry checks: scale drift, sliding origin, body-height rhythm.
//   node drift.cjs <dir> <frame...>
//
// SCALE IS MEASURED ON HEAD WIDTH, NOT THE BOUNDING BOX. An earlier version of
// this file used bbox height and was wrong in a way worth recording: a run
// cycle is SUPPOSED to change height between frames (Sprite Bible 7.4's
// body-height rhythm, whose absence 9.4 makes a rejection condition). Anchoring
// scale on bbox height would therefore "fix" the drift by deleting the
// animation. Measured on a normalised cycle, bbox-height spread of ~10% is the
// rhythm doing its job, while head width — which neither compresses nor
// extends through the cycle — held to 0%. So height variation is reported here
// as a FEATURE to confirm is present, and only head width counts as drift.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');

const HEAD_SLICE = 0.22;      // top fraction of the ink treated as head
const SCALE_TOL = 4;          // % head-width spread allowed
const ORIGIN_TOL = 6;         // px foot-line spread allowed
const RHYTHM_MIN = 3;         // % bbox-height spread required (below = flat)

(async () => {
  const [dir, ...files] = process.argv.slice(2);
  if (!files.length) { console.log('usage: node drift.cjs <dir> <frame...>'); process.exit(1); }
  const br = await chromium.launch(); const pg = await br.newPage();
  await pg.goto('data:text/html,<html><body></body></html>');

  const rows = [];
  console.log('frame'.padEnd(30), 'headW'.padStart(6), 'inkH'.padStart(5), 'footY'.padStart(6));
  for (const f of files) {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    const m = await pg.evaluate(async ({ url, slice }) => {
      const i = new Image(); i.src = url; await i.decode();
      const W = i.width, H = i.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(i, 0, 0);
      const d = g.getImageData(0, 0, W, H).data;
      let y0 = H, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (d[(y * W + x) * 4 + 3] > 127) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const ih = y1 - y0 + 1;
      let headW = 0;
      for (let y = y0; y < y0 + Math.round(ih * slice); y++) {
        let run = 0, best = 0;
        for (let x = 0; x < W; x++) { if (d[(y * W + x) * 4 + 3] > 127) { run++; if (run > best) best = run; } else run = 0; }
        if (best > headW) headW = best;
      }
      return { headW, ih, footY: y1 };
    }, { url: `data:image/png;base64,${b64}`, slice: HEAD_SLICE });
    rows.push(m);
    console.log(f.replace(/\.png$/, '').padEnd(30), String(m.headW).padStart(6), String(m.ih).padStart(5), String(m.footY).padStart(6));
  }
  await br.close();

  const spread = (a) => Math.max(...a) - Math.min(...a);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const hw = rows.map(r => r.headW), ih = rows.map(r => r.ih), fy = rows.map(r => r.footY);
  const scalePct = 100 * spread(hw) / mean(hw);
  const rhythmPct = 100 * spread(ih) / mean(ih);

  let bad = 0;
  const line = (label, ok, detail) => { if (!ok) bad++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(34)} ${detail}`); };
  console.log('');
  line('scale held (head width)', scalePct <= SCALE_TOL, `${spread(hw)}px spread, ${scalePct.toFixed(1)}% (tol ${SCALE_TOL}%)  [C2]`);
  line('origin held (ground line)', spread(fy) <= ORIGIN_TOL, `${spread(fy)}px spread (tol ${ORIGIN_TOL}px)  [M4]`);
  line('body-height rhythm present', rhythmPct >= RHYTHM_MIN, `${rhythmPct.toFixed(1)}% height variation (min ${RHYTHM_MIN}%)  [M3]`);
  console.log(`\n${rows.length} frames, ${bad} failure(s)`);
  process.exit(bad ? 1 : 0);
})();
