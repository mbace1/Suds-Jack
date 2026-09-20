// Does this art match the reference set's LOOK?
//   node styleref.cjs <reference.png> <dir-or-file>...
//
// verify.cjs asks whether a frame is correct — inside the cell, keyed, no
// specks. It cannot ask whether it looks like the rest of the set, and on the
// street props that was the whole problem: the first eight passed every gate
// and were plainly wrong beside the owner's sheet — half as inked and much
// paler. "Looks different" turns out to be measurable on three numbers.
//
// INK is the fraction of the object darker than luminance 40 — outline plus
// solid shadow. LUMINANCE is the mean over the object. SATURATION is the mean
// of (max-min)/max per pixel.
//
// The reading that mattered: the reference measures 46.8% ink, luminance 52,
// saturation 43%. I had described it in the prompt as "muted and desaturated",
// which is wrong and was actively steering away from it — it is DARK and
// fairly saturated, and the muted impression comes from the low luminance, not
// from the colour. Fixing that one word took the props from 23.7% ink to 47%.
const fs = require('fs'); const path = require('path');
const { load, pixels } = require(path.join(__dirname, 'img.cjs'));

const TOL = { ink: 12, lum: 14, sat: 14 };   // absolute points, judged by eye
                                             // against sets that do and do not match
//
// THIS IS A SET-LEVEL METRIC. Read the MEAN at the bottom, not the per-asset
// verdicts, because per asset it measures MATERIAL rather than craft and is
// wrong in both directions:
//
//   too dark / over-inked   black rubber tyres 66.9%, a wire shopping trolley
//                           62.4%, chain-link fence 59.0%, a gas-bottle cage
//                           62.9% — all correct pictures, all just dark or
//                           made of thin lines
//   too pale / washed out   raw concrete pipes 39.5%, hessian sandbags 33.3%,
//                           a white plastic IBC tank 32.1% — again the
//                           material, not the drawing
//
// What it catches reliably is a SYSTEMATIC miss across a whole batch, which is
// the failure it was written for: the first street set averaged 23.7% ink
// against a 46.8% reference and every asset in it was wrong the same way. The
// corrected set averages 43.5%. Judge a batch on that number; judge an
// individual asset with your eyes.

async function measure(file, keyed) {
  const o = await load(file); const d = pixels(o);
  const isBg = (r, g, b) => { const m = (r + b) / 2; return m > 60 && g < m * 0.55; };
  let ink = 0, black = 0, lum = 0, sat = 0;
  for (let p = 0; p < o.W * o.H; p++) {
    const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2], a = d[p * 4 + 3];
    if (keyed ? a <= 127 : isBg(r, g, b)) continue;
    ink++;
    const L = (r + g + b) / 3; lum += L; if (L < 40) black++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); sat += mx ? (mx - mn) / mx : 0;
  }
  return { ink: 100 * black / ink, lum: lum / ink, sat: 100 * sat / ink };
}

(async () => {
  const [refFile, ...args] = process.argv.slice(2);
  if (!args.length) { console.log('usage: node styleref.cjs <reference.png> <dir-or-file>...'); process.exit(1); }
  const files = [];
  for (const a of args) {
    if (fs.statSync(a).isDirectory()) for (const f of fs.readdirSync(a).sort())
      { if (f.endsWith('.png') && !f.startsWith('_')) files.push(path.join(a, f)); }
    else files.push(a);
  }
  const ref = await measure(refFile, false);
  console.log(`reference  ${path.basename(refFile)}`);
  console.log(`  ink ${ref.ink.toFixed(1)}%   luminance ${ref.lum.toFixed(0)}   saturation ${ref.sat.toFixed(0)}%\n`);
  console.log('asset'.padEnd(24), 'ink'.padStart(7), 'lum'.padStart(6), 'sat'.padStart(6), '  verdict');
  let bad = 0; const stats = [];
  for (const f of files) {
    const m = await measure(f, true); stats.push(m);
    const off = [];
    if (Math.abs(m.ink - ref.ink) > TOL.ink) off.push(m.ink < ref.ink ? 'under-inked' : 'over-inked');
    if (Math.abs(m.lum - ref.lum) > TOL.lum) off.push(m.lum > ref.lum ? 'too pale' : 'too dark');
    if (Math.abs(m.sat - ref.sat) > TOL.sat) off.push(m.sat < ref.sat ? 'washed out' : 'too saturated');
    if (off.length) bad++;
    console.log(path.basename(f).replace(/\.png$/, '').padEnd(24),
      (m.ink.toFixed(1) + '%').padStart(7), m.lum.toFixed(0).padStart(6), (m.sat.toFixed(0) + '%').padStart(6),
      '  ' + (off.length ? off.join(', ') : 'matches'));
  }
  const mean = k => stats.reduce((a, m) => a + m[k], 0) / stats.length;
  const dInk = mean('ink') - ref.ink, dLum = mean('lum') - ref.lum, dSat = mean('sat') - ref.sat;
  console.log(`\nSET MEAN   ink ${mean('ink').toFixed(1)}%   luminance ${mean('lum').toFixed(0)}   saturation ${mean('sat').toFixed(0)}%`);
  console.log(`vs REFERENCE   ${dInk >= 0 ? '+' : ''}${dInk.toFixed(1)}   ${dLum >= 0 ? '+' : ''}${dLum.toFixed(0)}   ${dSat >= 0 ? '+' : ''}${dSat.toFixed(0)}`);
  const off = Math.abs(dInk) > TOL.ink || Math.abs(dLum) > TOL.lum || Math.abs(dSat) > TOL.sat;
  console.log(off ? '\nTHE SET IS OFF-STYLE as a whole — that is the reading to act on.'
                  : '\nThe set matches as a whole. The per-asset flags above are material, not craft.');
  console.log(`(${bad} of ${files.length} assets flagged individually — see the note in this file\n before re-rolling any of them.)`);
  console.log('And this measures the LOOK, never whether the object is any good: a\nwell-lit bin with the right numbers can still be the wrong bin.');
})();
