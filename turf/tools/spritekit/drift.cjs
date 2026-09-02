// Per-cycle geometry checks: scale drift, sliding origin, body-height rhythm.
//   node drift.cjs <dir> <frame...>
//
// --no-scale is now the DEFAULT in make.mjs, because register.cjs owns scale
// and does not touch head width. Before that, this check was self-fulfilling:
// normalise.cjs set the head width and drift.cjs measured it, so it passed by
// construction and told nobody anything. A registered clip reads ~20% here and
// is correctly scaled; the registration report is the scale check.
//
// Two checks are locomotion-only and switch off for clips they do not fit.
// --no-rhythm: body-height rhythm is a LOCOMOTION requirement (Sprite Bible
// 7.4) and a hit reaction has no stride to bob through. --no-scale: head width
// is only pose-invariant while the head stays level, which whiplash breaks by
// design — see measure.cjs for the numbers. A reaction clip run with both is
// still checked on its ground line, which does hold.
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
const fs = require('fs'); const path = require('path');
const { load, pixels } = require(path.join(__dirname, 'img.cjs'));
const { measure } = require(path.join(__dirname, 'measure.cjs'));

const HEAD_SLICE = 0.22;      // top fraction of the ink treated as head
const SCALE_TOL = 4;          // % head-width spread allowed
const ORIGIN_TOL = 6;         // px foot-line spread allowed
const RHYTHM_MIN = 3;         // % bbox-height spread required (below = flat)

(async () => {
  const argv = process.argv.slice(2).filter(a => a !== '--no-rhythm' && a !== '--no-scale');
  const wantRhythm = !process.argv.includes('--no-rhythm');
  const wantScale = !process.argv.includes('--no-scale');
  const [dir, ...files] = argv;
  if (!files.length) { console.log('usage: node drift.cjs <dir> <frame...>'); process.exit(1); }

  const rows = [];
  console.log('frame'.padEnd(30), 'headW'.padStart(6), 'inkH'.padStart(5), 'footY'.padStart(6));
  for (const f of files) {
    const o = await load(path.join(dir, f));
    const m = measure(pixels(o), o.W, o.H, HEAD_SLICE);
    rows.push(m);
    console.log(f.replace(/\.png$/, '').padEnd(30), String(m.headW).padStart(6), String(m.ih).padStart(5), String(m.footY).padStart(6));
  }

  const spread = (a) => Math.max(...a) - Math.min(...a);
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  const hw = rows.map(r => r.headW), ih = rows.map(r => r.ih), fy = rows.map(r => r.footY);
  const scalePct = 100 * spread(hw) / mean(hw);
  const rhythmPct = 100 * spread(ih) / mean(ih);

  let bad = 0;
  const line = (label, ok, detail) => { if (!ok) bad++; console.log(`${ok ? '  ok  ' : ' FAIL '} ${label.padEnd(34)} ${detail}`); };
  console.log('');
  if (wantScale) line('scale held (head width)', scalePct <= SCALE_TOL, `${spread(hw)}px spread, ${scalePct.toFixed(1)}% (tol ${SCALE_TOL}%)  [C2]`);
  else console.log(`  --   ${'scale (head width)'.padEnd(34)} not checked (--no-scale), ${scalePct.toFixed(1)}% observed — expected to be high on a registered clip`);
  line('origin held (ground line)', spread(fy) <= ORIGIN_TOL, `${spread(fy)}px spread (tol ${ORIGIN_TOL}px)  [M4]`);
  if (wantRhythm) line('body-height rhythm present', rhythmPct >= RHYTHM_MIN, `${rhythmPct.toFixed(1)}% height variation (min ${RHYTHM_MIN}%)  [M3]`);
  else console.log(`  --   ${'body-height rhythm'.padEnd(34)} not checked (--no-rhythm: locomotion-only rule), ${rhythmPct.toFixed(1)}% observed`);
  console.log(`\n${rows.length} frames, ${bad} failure(s)`);
  process.exit(bad ? 1 : 0);
})();
