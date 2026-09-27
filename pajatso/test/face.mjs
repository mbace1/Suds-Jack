// THE INSTRUMENT for the Pajatso face — never a gate. Sweeps the lever across
// its range and prints, per power, where the coins end up and what the machine
// pays back per markka put in: `node pajatso/test/face.mjs [shotsPerPower]`.
// The pot is held at its starting hump for every power, so the POTTI column is
// what a machine fresh on the wall would pay; `--live` lets it run.
import { Pajatso } from '../js/classic/game.js?v=4';
import { PAYS, POT_START, POTTI_COLS } from '../js/classic/layout.js?v=4';

const N = Number(process.argv[2] ?? 150);
const live = process.argv.includes('--live');
const STEPS = 21;
const all = { in: 0, out: 0, potti: 0, pay: 0 };
const kinds = Object.keys(PAYS);
console.log('power  rtp   foul  lost  ' + kinds.map(k => k.padEnd(6)).join('') + ' res  s/coin');
for (let i = 0; i < STEPS; i++) {
  const p = i / (STEPS - 1);
  const g = new Pajatso({ seed: 1000 + i, coins: 1e9 });
  const tally = {}; let fouls = 0, lost = 0, rescued = 0, paid = 0, time = 0;
  for (let n = 0; n < N; n++) {
    if (!live) g.pot = [...POT_START];
    g.pull(p);
    let t = 0;
    while (g.phase === 'flight' && t < 60) { g.update(1 / 30); t += 1 / 30; }
    time += t;
    for (const ev of g.drain()) {
      if (ev.t === 'win') { tally[ev.kind] = (tally[ev.kind] ?? 0) + 1; paid += ev.pay; if (ev.kind === 'potti') { all.potti++; all.pay += ev.pay; } }
      if (ev.t === 'foul') fouls++;
      if (ev.t === 'lost') lost++;
      if (ev.t === 'returned') rescued++;
    }
  }
  const inPlay = N - fouls - rescued;
  const rtp = inPlay ? paid / inPlay : 0;
  all.in += inPlay; all.out += paid;
  const pct = k => (100 * (tally[k] ?? 0) / N).toFixed(0).padStart(3) + '%  ';
  console.log(`${p.toFixed(2)}  ${rtp.toFixed(2)}  ${(100 * fouls / N).toFixed(0).padStart(3)}%  ${(100 * lost / N).toFixed(0).padStart(3)}%  ` +
    kinds.map(pct).join('') + ` ${rescued.toString().padStart(3)}  ${(time / N).toFixed(1)}`);
}
console.log(`\nwhole range: ${(all.out / all.in).toFixed(3)} back per markka in play; POTTI 1 in ${Math.round(all.in / Math.max(1, all.potti))}, paying ${(all.pay / Math.max(1, all.potti)).toFixed(1)} on average (the middle three start at ${POTTI_COLS.reduce((a, k) => a + POT_START[k], 0)})`);
