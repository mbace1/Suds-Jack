// THE INSTRUMENT for the Pajatso face — never a gate. Sweeps the lever across
// its range and prints, per power, where the coins end up and what the machine
// pays back per coin put in: `node pajatso/test/face.mjs [shotsPerPower]`.
import { Pajatso } from '../js/classic/game.js?v=2';
import { PAYS } from '../js/classic/layout.js?v=2';

const N = Number(process.argv[2] ?? 150);
const STEPS = 21;
let all = { in: 0, out: 0 };
console.log('power  rtp   foul  lost  back  ' + Object.keys(PAYS).filter(k => k !== 'back').map(k => k.padEnd(6)).join('') + ' res  s/coin');
for (let i = 0; i < STEPS; i++) {
  const p = i / (STEPS - 1);
  const g = new Pajatso({ seed: 1000 + i, coins: 1e9 });
  const tally = {}; let fouls = 0, lost = 0, backs = 0, rescued = 0, spent = 0, paid = 0, time = 0;
  for (let n = 0; n < N; n++) {
    const before = g.coins;
    g.pull(p);
    let t = 0;
    while (g.phase === 'flight' && t < 60) { g.update(1 / 30); t += 1 / 30; }
    time += t;
    for (const ev of g.drain()) {
      if (ev.t === 'win') tally[ev.kind] = (tally[ev.kind] ?? 0) + 1;
      if (ev.t === 'foul') fouls++;
      if (ev.t === 'lost') lost++;
      if (ev.t === 'back') backs++;
      if (ev.t === 'returned') rescued++;
    }
    const net = g.coins - before;
    spent += 1; paid += net + 1;
  }
  const inPlay = N - fouls - rescued;
  const rtp = inPlay ? (paid - fouls - rescued) / inPlay : 0;
  all.in += inPlay; all.out += paid - fouls - rescued;
  const pct = k => (100 * (tally[k] ?? 0) / N).toFixed(0).padStart(3) + '%  ';
  console.log(`${p.toFixed(2)}  ${rtp.toFixed(2)}  ${(100 * fouls / N).toFixed(0).padStart(3)}%  ${(100 * lost / N).toFixed(0).padStart(3)}%  ${(100 * backs / N).toFixed(0).padStart(3)}%  ` +
    Object.keys(PAYS).filter(k => k !== 'back').map(pct).join('') + ` ${rescued.toString().padStart(3)}  ${(time / N).toFixed(1)}`);
}
console.log(`\nwhole range: ${(all.out / all.in).toFixed(3)} back per coin in play`);
