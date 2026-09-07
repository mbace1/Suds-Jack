// Absolute per-frame checks: is THIS frame correct on its own terms?
//   node verify.cjs [--json] <dir-or-file>...
//
// Everything else in this toolchain is RELATIVE. phase.cjs compares frames to
// each other, reach.cjs compares weapon positions, drift.cjs measures spread
// across a clip. That whole family shares one blind spot: two frames broken the
// same way agree perfectly. 63 of 102 shipped frames were clipped by the cell
// edge and every relative gate passed them.
//
// So this file asks only questions a single frame can answer wrongly by itself.
const fs = require('fs'); const path = require('path');
const { load, pixels, components, edgeInk } = require(path.join(__dirname, 'img.cjs'));

const collect = (args) => {
  const out = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) {
      // `ref/` holds identity references — magenta-background source art, not
      // sprites. Scanning them reported a frame that was 100% ink with 275k
      // magenta pixels, which is a correct reading of the wrong file. That they
      // live inside the sprite tree at all is its own problem.
      if (path.basename(a) === 'ref' || path.basename(a).startsWith('_')) return out;
      for (const f of fs.readdirSync(a).sort()) {
        const p = path.join(a, f);
        if (fs.statSync(p).isDirectory()) out.push(...collect([p]));
        else if (f.endsWith('.png') && !f.startsWith('_')) out.push(p);
      }
    } else out.push(a);
  }
  return out;
};

(async () => {
  const json = process.argv.includes('--json');
  const files = collect(process.argv.slice(2).filter(a => a !== '--json'));
  const rows = [];
  for (const f of files) {
    const o = await load(f);
    const d = pixels(o), W = o.W, H = o.H;

    const e = edgeInk(d, W, H);
    let inkPx = 0, soft = 0, magenta = 0;
    const cols = new Set();
    for (let p = 0; p < W * H; p++) {
      const a = d[p * 4 + 3];
      if (a > 127) {
        inkPx++;
        const r = d[p * 4], gq = d[p * 4 + 1], b = d[p * 4 + 2];
        cols.add((r >> 2 << 12) | (gq >> 2 << 6) | (b >> 2));   // RGB666 buckets
        if (r > 200 && gq < 90 && b > 200) magenta++;            // key survivors
      }
      if (a > 8 && a < 248) soft++;                              // partial alpha = a soft edge
    }
    const areas = components(d, W, H).map(c => c.size).sort((x, y) => y - x);
    const specks = areas.slice(1).filter(a => a < 40).length;

    rows.push({ f, W, H, edge: e.total, ink: inkPx, coverage: inkPx / (W * H),
                soft, softFrac: soft / Math.max(1, inkPx), magenta, colours: cols.size,
                specks, detached: areas.length - 1, biggest: areas[0] || 0 });
  }

  if (json) { console.log(JSON.stringify(rows, null, 1)); return; }

  // THRESHOLDS ARE TAKEN FROM THE MEASURED DISTRIBUTION over 105 known-good
  // frames, not from intuition. (I set a 0.75 pass line on register.cjs's
  // overlay score by intuition once and it was wrong in both directions.)
  //
  //   edge      0 on every good frame          -> any ink on the border fails
  //   magenta   0 on every good frame          -> any key survivor fails
  //   softFrac  0.0000 on every good frame     -> partial alpha means the
  //                                               pipeline resampled smoothly
  //                                               somewhere, which this art
  //                                               style never wants
  //   coverage  0.125 - 0.565, median 0.327    -> fail outside 0.08 - 0.70,
  //                                               warn under 0.20 (a clip
  //                                               shrunk by one outsized frame)
  //   colours   1538 - 4046                    -> informational only; it tracks
  //                                               how painterly the generator
  //                                               was, not whether the frame is
  //                                               correct
  const FAIL = [], WARN = [];
  for (const r of rows) {
    const n = path.relative(process.cwd(), r.f);
    if (r.edge > 0) FAIL.push(`${n}  clipped by the cell edge (${r.edge}px of ink on the border)`);
    if (r.magenta > 0) FAIL.push(`${n}  ${r.magenta} magenta pixels survived the key`);
    if (r.softFrac > 0.02) FAIL.push(`${n}  ${(r.softFrac * 100).toFixed(1)}% partial-alpha pixels — something resampled smoothly`);
    if (r.coverage < 0.08) FAIL.push(`${n}  fills only ${(r.coverage * 100).toFixed(1)}% of the cell`);
    if (r.coverage > 0.70) FAIL.push(`${n}  fills ${(r.coverage * 100).toFixed(1)}% of the cell — cramped`);
    else if (r.coverage < 0.20) WARN.push(`${n}  fills ${(r.coverage * 100).toFixed(1)}% of the cell`);
    if (r.specks > 0) WARN.push(`${n}  ${r.specks} speck(s) under 40px detached from the figure`);
  }

  const pct = a => a.length ? a : [0];
  const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  const col = k => pct(rows.map(r => r[k]));
  console.log(`${rows.length} frames\n`);
  console.log('metric'.padEnd(22), 'min'.padStart(8), 'p50'.padStart(8), 'p90'.padStart(8), 'max'.padStart(8));
  for (const k of ['edge', 'coverage', 'softFrac', 'magenta', 'colours', 'specks', 'detached']) {
    const a = col(k), f = k === 'coverage' || k === 'softFrac' ? (v => v.toFixed(4)) : (v => String(v));
    console.log(k.padEnd(22), f(Math.min(...a)).padStart(8), f(q(a, 0.5)).padStart(8), f(q(a, 0.9)).padStart(8), f(Math.max(...a)).padStart(8));
  }
  if (WARN.length) { console.log(`\n${WARN.length} warning(s):`); WARN.forEach(w => console.log('  ' + w)); }
  if (FAIL.length) { console.log(`\n${FAIL.length} FAILURE(S):`); FAIL.forEach(w => console.log('  ' + w)); }
  console.log(`\n${rows.length} frames — ${FAIL.length} failing, ${WARN.length} warning`);
  process.exit(FAIL.length ? 1 : 0);
})();
