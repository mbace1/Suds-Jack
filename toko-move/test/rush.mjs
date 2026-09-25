// THE RUSH's rules in bare node (js/rush.js): the curve, the two levers, and
// fullness that holds still while a tram is at your stop.
//
//   node toko-move/test/rush.mjs
import * as R from '../js/rush.js';

let pass = 0, fail = 0;
const ok = (c, m, x = '') => { if (c) pass++; else { fail++; console.log(`  FAIL ${m}${x ? ' — ' + x : ''}`); } };

ok(Math.abs(R.load(0) - 0.25) < 0.01 && Math.abs(R.load(1) - 0.26) < 0.02, `quiet at both ends (${R.load(0).toFixed(2)}, ${R.load(1).toFixed(2)})`);
ok(Math.abs(R.load(R.PEAK) - 1) < 1e-9, 'full load at the peak');
const pk = [...Array(101)].map((_, i) => i / 100).reduce((b, p) => R.load(p) > R.load(b) ? p : b, 0);
ok(Math.abs(pk - R.PEAK) < 0.011, `the peak is where it says (${pk}) — about 07:40 on a 07:00–08:15 shift`);
ok(R.fullChance(R.load(0)) === 0 && Math.abs(R.fullChance(1) - R.FULL_MAX) < 1e-9, 'nobody is turned away at seven; half the trams are full at the peak');
ok(R.surge(R.load(0)) === 1 && Math.abs(R.surge(1) - 1.3) < 1e-9, 'rush pay is ×1 when quiet and ×1.3 at the peak');
ok(R.label(1) === 'RUSH' && R.label(0.6) === 'BUSY' && R.label(0.3) === '', 'the HUD names the hour');

// fullness is a fact about a tram for as long as it is at your stop
const v = { id: 'T1:0', phase: 0.3, speed: 0.001 };
const seg = R.segmentOf(v, 100), same = [...Array(40)].map((_, i) => R.isFull(v, 100 + i, 1));
ok(same.every(x => x === same[0]) && [...Array(40)].every((_, i) => R.segmentOf(v, 100 + i) === seg), 'a tram stays full (or not) for the whole of its time at a stop');
let full = 0; const N = 4000; for (let i = 0; i < N; i++) if (R.isFull({ id: `L${i % 97}:${i}`, phase: (i * 0.37) % 2, speed: 0.001 }, 500, 1)) full++;
ok(Math.abs(full / N - R.FULL_MAX) < 0.03, `about half the fleet is full at the peak (${(100 * full / N).toFixed(1)}%)`);
full = 0; for (let i = 0; i < N; i++) if (R.isFull({ id: `L${i % 97}:${i}`, phase: (i * 0.37) % 2, speed: 0.001 }, 500, R.load(0))) full++;
ok(full === 0, 'and none at seven');

console.log(`rush: ${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
