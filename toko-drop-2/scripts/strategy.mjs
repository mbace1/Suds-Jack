// strategy.mjs — is a room's strategy how it scores best? (v159; owner, 20 Nov: "by default a strategy followed is
// optimizing in a way that may otherwise not happen"). Each room names its strategies (`plan.strategy`: aim, priority,
// position, movement, risk). The sharp bot plays every room as it always does, and again with that room's strategies
// switched OFF (scripts/bot.mjs `K.off`, and K's own numbers):
//   priority  reads nothing (no shield, plate or boss window), hunts no quarry: the nearest body
//   risk      never closes in for a hot kill (greed 0)
//   aim       no lead on its shots
//   movement  never dashes
//   position  goes nowhere the room asks (no ring, orb, heart or gate) and holds the middle (`still`)
// A room is FLAGGED when the bot without its strategies still reaches the room's S line (median of its clears) — the
// strategy is then not what the room pays for — or gets through about as often and scores as much: the room to look at.
// Not a gate: a report for a person, as room-tiers.mjs is.
//
//   node scripts/strategy.mjs                    every room, 12 seeds, sideways
//   node scripts/strategy.mjs --room in-order    one room
//   node scripts/strategy.mjs --seeds 24 --portrait
import { readFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import { rooms } from '../js/sim/director/campaign.js?v=159';
import { SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SEEDS = +opt('--seeds', 12), ONLY = opt('--room', null), TURN = args.includes('--portrait'), dt = T.sim.dt;
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));

function play(L, seed, K) {
  const w = createWorld({ seed, mode: 'campaign', room: { id: L.id, world: L.plan.world, level: L, turn: TURN } });
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  if (L.goal?.kind) mem.quarry = T.campaign.kinds[L.goal.kind] ?? L.goal.kind;
  let end = null, held = null;
  for (let i = 0; i < (L.duration + 3) / dt && !end; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    end = w.events.find((e) => e.type === 'roomEnd') ?? null;
  }
  return end ?? { outcome: 'stuck', score: 0 };
}
// the sharp player without these strategies
function without(strats) {
  const K = { ...SKILLS.sharp, off: new Set(strats) };
  if (K.off.has('priority')) K.reads = 0;
  if (K.off.has('risk')) K.greed = 0;
  if (K.off.has('position')) K.style = 'still';
  return K;
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const k = (v) => (v == null ? '    -' : `${(v / 1000).toFixed(1)}k`.padStart(6));

console.log(`room          strategies                       with: through  median   without: through  median   S line   verdict`);
const flagged = [];
for (const r of rooms()) {
  if (ONLY && r.id !== ONLY) continue;
  const L = level(r.id), S = L.plan?.strategy ?? [];
  const run = (K) => { const rs = Array.from({ length: SEEDS }, (_, i) => play(L, 101 + i * 7, K)); const ok = rs.filter((e) => e.outcome === 'clear'); return { pass: ok.length / rs.length, med: med(ok.map((e) => e.score)) }; };
  const a = run(SKILLS.sharp), b = run(without(S)), line = L.tiers?.S;
  // the strategy pays when, without it, the bot gets through clearly less often, or scores clearly less (under the S line)
  const reachesS = b.med != null && line != null && b.med >= line && b.pass >= a.pass - 0.1;
  const same = b.pass >= a.pass - 0.05 && b.med != null && a.med != null && b.med >= a.med * 0.95;
  const verdict = reachesS ? 'FLAG: S without it' : same ? 'FLAG: no difference' : 'pays';
  if (verdict !== 'pays') flagged.push(r.id);
  console.log(`${r.id.padEnd(13)} ${S.join(',').padEnd(32)} ${String(Math.round(a.pass * 100)).padStart(4)}%  ${k(a.med)}         ${String(Math.round(b.pass * 100)).padStart(4)}%  ${k(b.med)}   ${k(line)}   ${verdict}`);
}
console.log(flagged.length ? `\n${flagged.length} room(s) where the strategy does not clearly pay: ${flagged.join(', ')}` : '\nevery room: its strategy pays');
