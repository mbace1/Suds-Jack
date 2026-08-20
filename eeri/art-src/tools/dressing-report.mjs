#!/usr/bin/env node
// EERI — what is a level's dressing actually MADE of?
//
//   node eeri/art-src/tools/dressing-report.mjs
//
// This could not be written before v15.33. While worlds 3 and 4 were built by
// code there was nothing to count: a prop existed only as a line that ran
// once, so "how many distinct depths does site 9 use" was a question you
// answered by reading four hundred lines of JavaScript and keeping a tally in
// your head. Now the sheets are data and it is arithmetic.
//
// It exists because "the levels look rugged" is true and unactionable, and
// the first thing a composition needs is a measurement rather than a squint.
// Three numbers carry most of the diagnosis:
//
//   MIX — which primitive dominates. A site that is 80% `disc` is a site
//     built out of one flat shape repeated, however much art is in the
//     folder; the four cutouts are doing all the describing and the other
//     seventy-two are wallpaper.
//   DEPTHS — how many distinct z values are in use. This is the single
//     strongest predictor of whether a 2.5D screen reads as a place or as a
//     collage, and it is why World 4 looks better than World 3 despite being
//     made of plainer parts.
//   GAPS — 8-tile stretches of the playable span with nothing dressed on
//     them at all. A level that opens on an undressed stretch reads as
//     unfinished in the first two seconds, which is the worst place for it.
//
// It prescribes nothing. Composition is the owner's and the design lane's
// call; this only makes the current state legible enough to argue about.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EERI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(EERI, 'assets', 'dressing');
const SPAN = 96;     // the playable width every room is laid out across
const BUCKET = 8;

const files = readdirSync(DIR).filter((f) => /^site-\d+\.json$/.test(f))
  .sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);

const pad = (s, n) => String(s).padEnd(n);
console.log('\n  EERI dressing — what each site is made of\n');
console.log(`  ${pad('site', 7)}${pad('rows', 6)}${pad('mix', 30)}${pad('depths', 8)}gaps`);
console.log('  ' + '-'.repeat(76));

for (const f of files) {
  const d = JSON.parse(readFileSync(path.join(DIR, f), 'utf8'));
  const rows = d.rows || [];
  const kinds = {};
  for (const r of rows) kinds[r.k] = (kinds[r.k] || 0) + 1;
  const depths = new Set(rows.map((r) => r.z.toFixed(2))).size;

  const buckets = new Array(Math.ceil(SPAN / BUCKET)).fill(0);
  for (const r of rows) {
    if (r.x < 0 || r.x > SPAN) continue;
    buckets[Math.min(buckets.length - 1, Math.floor(r.x / BUCKET))]++;
  }
  const gaps = buckets.map((n, i) => (n === 0 ? `${i * BUCKET}-${(i + 1) * BUCKET}` : null))
    .filter(Boolean);

  // the dominant primitive, as a share — the number that says "wallpaper"
  const top = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const share = Math.round((top[1] / Math.max(1, rows.length)) * 100);
  const mix = Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join('  ');

  console.log(`  ${pad(d.site, 7)}${pad(rows.length, 6)}${pad(mix, 30)}${pad(depths, 8)}` +
    (gaps.length ? gaps.join(', ') : '—'));
  if (share >= 70) {
    console.log(`  ${' '.repeat(13)}↳ ${share}% of this site is one primitive (${top[0]})`);
  }
}
console.log('');
