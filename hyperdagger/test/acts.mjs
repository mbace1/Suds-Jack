// Hyper Dagger — HD-023: the seasons' act tables, in bare node.
//   node hyperdagger/test/acts.mjs
// An act steers the tuned director (main.js, currentWave). This holds the
// tables to the shape that steering assumes, so a typo is a failure here and
// not a quiet season.
import { SEASONS } from '../js/seasons.js';
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };
const built = SEASONS.filter(s => s.built && !s.hidden);
ok('three seasons are built and listed', built.length === 3, built.map(s => s.id).join());
for (const s of built) {
  const w = s.waves ?? [];
  ok(`${s.id}: has acts, the first at 0`, w.length >= 4 && w[0].t === 0, JSON.stringify(w[0]));
  ok(`${s.id}: acts are in order`, w.every((a, i) => i === 0 || a.t > w[i - 1].t));
  ok(`${s.id}: every act but the finale is named, and no name repeats`,
    w.every(a => a.kind === 'finale' || (typeof a.name === 'string' && a.name === a.name.toUpperCase() && a.name.length <= 14))
    && new Set(w.filter(a => a.name).map(a => a.name)).size === w.filter(a => a.name).length, JSON.stringify(w.map(a => a.name)));
  ok(`${s.id}: the last act is the finale, and opens with it`, w.at(-1).kind === 'finale' && w.at(-1).t === s.finale?.at, `${w.at(-1).t} vs ${s.finale?.at}`);
  ok(`${s.id}: density is a lean on the tuned curve, not a replacement (0.4–1.5)`, w.every(a => a.density >= 0.4 && a.density <= 1.5), JSON.stringify(w.map(a => a.density)));
  ok(`${s.id}: a valley is a breath, not a hole (gap ≤ 5 s)`, w.every(a => (a.gap ?? 0) <= 5));
  ok(`${s.id}: the run ends at 300 s, after the finale`, s.end === 300 && s.finale.at < s.end);
}
const inca = built.find(s => s.id === 'inca');
// the clock drains 1 s/s and a skull pays 1: the cadence has to be able to carry it
const rate = t => { const a = [...inca.waves].reverse().find(a => t >= a.t); return a.density / Math.max(inca.spawns.floor, inca.spawns.base - t * inca.spawns.slope); };
let life = 30, min = 30;
for (let t = 0; t < 300; t += 0.5) { life = Math.min(60, life + (rate(t) - 1) * 0.5); min = Math.min(min, life); }
ok('inca: skulls alone can carry the clock to the end (perfect play, no crests)', min > 10, `lowest ${min.toFixed(1)} s`);
ok('inca: a cleared crest pays', inca.crestPays >= 1 && inca.crestPays <= 4);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
