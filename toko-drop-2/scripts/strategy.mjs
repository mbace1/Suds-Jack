// strategy.mjs — is a room's strategy how it scores best? (v159; owner, 20 Nov: "by default a strategy followed is
// optimizing in a way that may otherwise not happen"). Each room names its strategies (`plan.strategy`: aim, priority,
// position, movement, risk). The sharp bot plays every room as it always does, and again with that room's strategies
// switched OFF (scripts/bot.mjs `K.off`, and K's own numbers):
//   priority  reads nothing (no shield, plate or boss window), hunts no quarry: the nearest body
//   risk      never closes in for a hot kill (greed 0)
//   aim       no lead on its shots, and a first-timer's unsteady aim (v160: the rough bot's noise; leading alone
//             changed almost nothing, a body here moves at a sixth of a shot's speed or less)
//   movement  never dashes
//   position  goes nowhere the room asks (no ring, orb, heart or gate, nor the middle a room names, `plan.place`),
//             and moves as it always does (v161: it used to hold the middle, which IS room 22's positioning)
// A room is FLAGGED when the bot without its strategies still reaches the room's S line (median of its clears) — the
// strategy is then not what the room pays for — or gets through about as often and scores as much: the room to look at.
// v160: the AVERAGE player is asked the same, and a room is flagged only when the strategy pays neither of them: a
// room can be easy for the sharp player's hands and still be won by its strategy for an ordinary one (room 20: the
// average bot without its positioning gets through 8 in 12, the rough one none)
// Not a gate: a report for a person, as room-tiers.mjs is.
//
//   node scripts/strategy.mjs                    every room, 12 seeds, sideways
//   node scripts/strategy.mjs --room in-order    one room
//   node scripts/strategy.mjs --seeds 24 --portrait
import { readFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=162';
import { TUNING as T } from '../js/tuning.js?v=162';
import { rooms } from '../js/sim/director/campaign.js?v=162';
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
function without(strats, skill = 'sharp') {
  const K = { ...SKILLS[skill], off: new Set(strats) };
  if (K.off.has('priority')) K.reads = 0;
  if (K.off.has('risk')) K.greed = 0;
  if (K.off.has('aim')) K.noise = Math.max(K.noise, SKILLS.rough.noise);
  return K;
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
const k = (v) => (v == null ? '    -' : `${(v / 1000).toFixed(1)}k`.padStart(6));

console.log(`  # room          strategies                     sharp with / without          S line   average with / without       verdict`);
const flagged = [];
for (const [n, r] of rooms().entries()) {
  if (ONLY && r.id !== ONLY && String(n + 1) !== ONLY) continue;
  const L = level(r.id), S = L.plan?.strategy ?? [];
  const run = (K) => { const rs = Array.from({ length: SEEDS }, (_, i) => play(L, 101 + i * 7, K)); const ok = rs.filter((e) => e.outcome === 'clear'); return { pass: ok.length / rs.length, med: med(ok.map((e) => e.score)) }; };
  const a = run(SKILLS.sharp), b = run(without(S)), line = L.tiers?.S;
  const c = run(SKILLS.average), e = run(without(S, 'average'));
  // owner, 19 Nov: "Sometimes proper strategy should earn you A or S a bit more easily" — the A line is the average
  // player's median and the S line the sharp one's, so the strategy pays a player when, without it, they get through
  // clearly less often, or reach the line with it and fall under it without
  const A = L.tiers?.A;
  const avgPays = e.pass < c.pass - 0.1 || (A != null && (c.med ?? 0) >= A * 0.97 && (e.med ?? 0) < A * 0.97);
  // (labels only: whether the sharp player without it still reaches the S line)
  const reachesS = b.med != null && line != null && b.med >= line && b.pass >= a.pass - 0.1;
  const sharpPays = b.pass < a.pass - 0.1 || (line != null && (a.med ?? 0) >= line * 0.97 && (b.med ?? 0) < line * 0.97);
  const verdict = !S.length ? 'no strategy' : sharpPays && avgPays ? 'pays both' : sharpPays ? 'pays sharp' : avgPays ? 'pays average' : reachesS ? 'FLAG: S without it' : 'FLAG: no difference';
  if (verdict.startsWith('FLAG')) flagged.push(n + 1);
  const pc = (x) => `${String(Math.round(x.pass * 100)).padStart(3)}% ${k(x.med)}`;
  console.log(`${String(n + 1).padStart(3)} ${r.id.padEnd(13)} ${S.join(',').padEnd(30)} ${pc(a)} / ${pc(b)}   ${k(line)}   ${pc(c)} / ${pc(e)}   ${verdict}`);
}
console.log(flagged.length ? `\n${flagged.length} room(s) where the strategy pays neither player: ${flagged.join(', ')}` : '\nevery room: its strategy pays');
