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
// KNOWN CONFOUND, and it is the object rather than the art. An asset that is
// intrinsically dark or made mostly of thin lines reads as "over-inked" no
// matter how well it is drawn: black rubber tyres came in at 66.9%, a wire
// shopping trolley at 62.4% and a chain-link fence panel at 59.0%, all against
// a 46.8% reference, and all three are correct pictures. The number is only
// meaningful for an asset with real solid surfaces — a bin, a cabinet, a
// barrier. Read a flag on an open-mesh or black object as "expected", and
// spend the re-roll on something like the dumpster instead, which was 28.9%
// and genuinely pale.

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
  let bad = 0;
  for (const f of files) {
    const m = await measure(f, true);
    const off = [];
    if (Math.abs(m.ink - ref.ink) > TOL.ink) off.push(m.ink < ref.ink ? 'under-inked' : 'over-inked');
    if (Math.abs(m.lum - ref.lum) > TOL.lum) off.push(m.lum > ref.lum ? 'too pale' : 'too dark');
    if (Math.abs(m.sat - ref.sat) > TOL.sat) off.push(m.sat < ref.sat ? 'washed out' : 'too saturated');
    if (off.length) bad++;
    console.log(path.basename(f).replace(/\.png$/, '').padEnd(24),
      (m.ink.toFixed(1) + '%').padStart(7), m.lum.toFixed(0).padStart(6), (m.sat.toFixed(0) + '%').padStart(6),
      '  ' + (off.length ? off.join(', ') : 'matches'));
  }
  console.log(`\n${files.length} assets, ${bad} off-style`);
  console.log('This measures the LOOK, not whether the object is any good. A well-lit\nbin with the right numbers can still be the wrong bin.');
})();
