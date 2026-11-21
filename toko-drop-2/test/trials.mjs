#!/usr/bin/env node
// trials.mjs — the arcade's CHALLENGE WAVES (v36, sim/challenge.js), in bare
// node: which waves carry one, that it does not move the waves' own schedule,
// and that met pays and missed does not.
import { createWorld, step, api } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import { trialFor, TRIALS } from '../js/sim/challenge.js?v=159';
import { schedule } from '../js/sim/director/arcade.js?v=159';
// the trials are held on 1.x's own pressure: a gentler wave (v54's ramp) clears
// before a protect clock runs out when every body is killed the step it lands
T.waves.gentle = null;

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const dt = T.sim.dt, Q = T.waves.trial, IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// which waves
{
  const on = Array.from({ length: 24 }, (_, i) => i + 1).filter((v) => trialFor(v, 7));
  check('from wave 5, every fourth wave', on.join() === '5,9,13,17,21', on.join());
  check('never a boss wave', on.every((v) => v % T.waves.rhythm.bossEvery !== 0));
  const kinds = new Set(on.map((v) => trialFor(v, 7)));
  check('the five kinds come round in turn', kinds.size === 5 && [...kinds].every((k) => TRIALS.includes(k)), [...kinds].join());
}

// a world brought to the start of wave `n`
function at(n, seed = 11) {
  const w = createWorld({ seed, mode: 'arcade' });
  w.hero.invinc = 1e9;
  step(w, IDLE);                          // wave 1 starts
  w.dir.wave = n - 1; w.dir.gapT = 1e-9;  // the next breather ends at once: wave n
  step(w, IDLE); step(w, IDLE);
  return w;
}
const ends = (w) => w.events.find((e) => e.type === 'trialEnd');
const run = (w, s, each) => { for (let i = 0; i < s / dt; i++) { each?.(w, i); step(w, IDLE); const e = ends(w); if (e) return e; } return null; };

// the schedule replays as it did without challenges
{
  const plans = (on) => { Q.on = on; const out = []; for (const n of [5, 9, 13]) { const w = at(n, 23); out.push(JSON.stringify(w.dir.plan)); } Q.on = true; return out; };
  const a = plans(true), b = plans(false);
  check('a challenge wave keeps the wave its seed would have drawn', a.every((p, i) => p === b[i]));
}

// a wave that carries one puts it up, with its banner
{
  const w = at(5);
  check('wave 5 carries a challenge', !!w.ch?.arcade && w.ch.wave === 5, JSON.stringify(w.ch && { kind: w.ch.kind, wave: w.ch.wave }));
  const w2 = at(6);
  check('wave 6 does not', !w2.ch);
}

// each kind: met pays and drops a pod, missed pays nothing; both clear it away
for (const kind of TRIALS) {
  let seed = 1;
  while (trialFor(5, seed) !== kind) seed++;
  const w = at(5, seed);
  if (!w.ch || w.ch.kind !== kind) { check(`${kind}: starts`, false); continue; }
  const s0 = w.score, items0 = w.pk.items.length;
  let e;
  if (kind === 'hold') e = run(w, Q.hold.limit + 1, (w) => { if (w.ch?.zone) { w.hero.x = w.ch.zone.x; w.hero.z = w.ch.zone.z; } });
  else if (kind === 'collect') e = run(w, Q.collect.limit + 1, (w) => { const o = w.ch?.orbs?.find((o) => o.out && !o.taken); if (o) { w.hero.x = o.x; w.hero.z = o.z; } });
  else if (kind === 'combo') e = run(w, Q.combo.limit + 1, (w, i) => { if (i % 10 === 0) { const g = w.gels.find((g) => g.alive && g.state === 'active'); if (g) api.kill(w, g); } });
  else if (kind === 'protect') e = run(w, Q.protect.limit + 1, (w) => { for (const g of w.gels) if (g.alive) api.kill(w, g); });
  else if (kind === 'gates') e = run(w, Q.gates.limit + 1, (w) => { for (const g of w.pk.gates) if (g.alive) { g.alive = false; w.ch?.onGate?.(w); break; } });
  check(`${kind}: met, it pays ${Q.bonus} × the wave and drops a pod`, e?.met && e.bonus === Q.bonus * 5 && w.score >= s0 + e.bonus && w.pk.items.length > items0, JSON.stringify(e));
  check(`${kind}: and then it is gone`, !w.ch);
}
{
  let seed = 1;
  while (trialFor(5, seed) !== 'hold') seed++;
  const w = at(5, seed);
  w.hero.x = -w.ch.zone.x; w.hero.z = -w.ch.zone.z;
  const s0 = w.score;
  const e = run(w, Q.hold.limit + 1, (w) => { if (w.ch?.zone) { w.hero.x = w.ch.zone.x + 8; } });
  check('missed: nothing paid, and it is gone', e && !e.met && e.bonus === 0 && !w.ch, JSON.stringify(e));
  void s0;
}

// a world's signature, and its walls closing in for it (v37)
{
  check('a world of its own asks its signature', trialFor(9, 3, 2) === 'gates' && trialFor(25, 3, 4) === 'collect' && trialFor(49, 3, 7) === 'combo', `${trialFor(9, 3, 2)} ${trialFor(25, 3, 4)} ${trialFor(49, 3, 7)}`);
  const W4 = T.worlds.list[3], w = createWorld({ seed: 5, mode: 'arcade', world: 4 });
  w.hero.invinc = 1e9;
  const home = { hx: w.hx, hz: w.hz };
  let warned = false, moved = null;
  for (let i = 0; i < 4 / dt; i++) { step(w, IDLE); if (w.events.some((e) => e.type === 'reshapeWarn')) warned = true; if (w.events.some((e) => e.type === 'reshaped')) moved = { hx: w.hx, hz: w.hz }; }
  check('THE CISTERN: its challenge wave warns, then the walls come in', w.ch?.kind === 'collect' && warned && moved && Math.abs(moved.hx - home.hx * W4.squeeze) < 1e-6, JSON.stringify({ kind: w.ch?.kind, warned, moved, home }));
  check('…and what it puts down is inside them', (w.ch?.orbs ?? []).every((o) => Math.abs(o.x) <= w.hx && Math.abs(o.z) <= w.hz));
  check('…and the hero is inside them', Math.abs(w.hero.x) <= w.hx && Math.abs(w.hero.z) <= w.hz);
  let back = null;
  for (let i = 0; i < (Q.collect.limit + 4) / dt && !back; i++) { step(w, IDLE); if (!w.ch && !w.squeeze) back = { hx: w.hx, hz: w.hz }; }
  check('when it ends the walls go back where they were', back && Math.abs(back.hx - home.hx) < 1e-6 && Math.abs(back.hz - home.hz) < 1e-6, JSON.stringify(back));
}

console.log(failed ? `\n✗ trials: ${failed} failed, ${passed} passed` : `✔ trials: ${passed} checks`);
process.exit(failed ? 1 : 0);
