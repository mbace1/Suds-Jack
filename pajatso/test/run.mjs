// THE INSTRUMENT for KUOPPA — never a gate.
//   node pajatso/test/run.mjs face [shots]    the lever swept on every stage of the face
//   node pajatso/test/run.mjs runs [n]        bots play whole runs; where they fall
import { Kuoppa, DATA as D } from '../js/kuoppa/run.js?v=7';
import { playRun, POLICIES } from './runbot.mjs?v=7';

const mode = process.argv[2] ?? 'runs';
const n = Number(process.argv[3] ?? (mode === 'face' ? 80 : 120));

if (mode === 'face') {
  console.log('parts                                   in    mk/coin   pot%  start%  rescued  foul');
  for (let k = 0; k <= D.PARTS.length; k++) {
    const g = new Kuoppa({ seed: 500 + k });
    g.parts = D.PARTS.slice(0, k); g.rebuild();
    let spent = 0, paid = 0, pot = 0, starts = 0, rescued = 0, fouls = 0;
    for (let i = 0; i < 21; i++) {
      for (let s = 0; s < n / 21 * 5; s++) {
        g.drops = 2; g.phase = 'idle'; g.spins = []; g.spin = null; g.fever = 0; g.gate(false);   // a coin kept back: the round never ends mid-sweep
        g.pot = [3, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 3];
        const before = g.coins;
        g.pull(i / 20); { let t = 0; while (g.phase === 'flight' && t < 60) { g.update(1 / 30); t += 1 / 30; } }
        for (const ev of g.drain()) {
          if (ev.t === 'lost') pot++;
          if (ev.t === 'held' || ev.t === 'overflow') starts++;
          if (ev.t === 'returned') rescued++;
          if (ev.t === 'foul') fouls++;
        }
        spent++; paid += g.coins - before;
      }
    }
    console.log(`${(D.PARTS.slice(0, k).join(',') || '(base)').padEnd(38)} ${String(spent).padStart(5)}  ${(paid / spent).toFixed(3).padStart(8)}  ${(100 * pot / spent).toFixed(0).padStart(4)}  ${(100 * starts / spent).toFixed(1).padStart(6)}  ${String(rescued).padStart(7)}  ${String(fouls).padStart(4)}`);
  }
} else {
  console.log(`${n} runs a policy · antes ${D.ANTE_BASE} ×${D.ANTE_X} · ${D.DROPS} coins a round`);
  for (const name of Object.keys(POLICIES)) {
    const reached = new Array(D.LOCKS + 2).fill(0);
    let won = 0, charms = 0, pottis = 0, best = 0, t0 = Date.now();
    for (let s = 0; s < n; s++) {
      const g = playRun(1000 + s, POLICIES[name]);
      reached[Math.min(g.deadline, D.LOCKS + 1)]++;
      if (g.phase === 'won') won++;
      charms += g.run.bought; pottis += g.run.pottis; best = Math.max(best, g.run.best);
    }
    const surv = [];
    let alive = n;
    for (let d = 1; d <= D.LOCKS; d++) { surv.push(`${Math.round(100 * alive / n)}`.padStart(3)); alive -= reached[d]; }
    console.log(`${name.padEnd(10)} reach lock 1..8: ${surv.join(' ')}%  · won ${Math.round(100 * won / n)}% · charms ${(charms / n).toFixed(1)} · pottis ${(pottis / n).toFixed(1)} · best round ${best.toExponential(1)} · ${((Date.now() - t0) / n / 1000).toFixed(2)}s/run`);
  }
}
