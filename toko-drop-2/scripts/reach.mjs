#!/usr/bin/env node
// reach.mjs — how far the arcade goes (v55; owner, 2026-10-27: "Or maybe
// better bots"). A bot plays ARCADE (or HARDCADE) from wave 1 until it is
// down, wins, or the time cap, one run per seed, and says where each run
// ended, its score and what took its lives. The expert (scripts/bot.mjs, a
// player who looks ahead) is the one that answers "can the 72 waves be lived
// through"; the three line-setting skills say how far a weaker hand gets.
//
//   node scripts/reach.mjs                                    expert, sharp, average × 8 seeds, ARCADE
//   node scripts/reach.mjs --skills expert --seeds 12 --mode hardcade
//   node scripts/reach.mjs --cap 1800                         seconds of play before a run is stopped
import { createWorld, step } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import { SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SKILL_LIST = opt('--skills', 'expert,sharp,average').split(','), SEEDS = +opt('--seeds', 8), MODE = opt('--mode', 'arcade'), CAP = +opt('--cap', 1500);
const EVERY = T.waves.rhythm.bossEvery, LAST = T.worlds.list.length * EVERY;

export function run(seed, K, mode = MODE, cap = CAP) {
  const w = createWorld({ seed, mode }), mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed) };
  const hits = [];
  let held = null;
  for (let i = 0; i < cap / T.sim.dt && !w.over; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    for (const e of w.events) if (e.type === 'hurt') hits.push(`w${w.wave}:${e.by}`);
  }
  return { seed, wave: w.wave, world: w.world, won: !!w.won, over: !!w.over, score: w.score, time: Math.round(w.time), hits };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`${MODE.toUpperCase()}, ${SEEDS} seeds, ${LAST} waves in ${T.worlds.list.length} worlds`);
  for (const name of SKILL_LIST) {
    const K = SKILLS[name];
    if (!K) { console.log(`no skill ${name}`); continue; }
    const rows = [];
    for (let s = 0; s < SEEDS; s++) rows.push(run(11 + s * 13, K));
    const waves = rows.map((r) => r.wave).sort((a, b) => a - b), med = waves[Math.floor(waves.length / 2)];
    const worlds = rows.map((r) => r.world).sort((a, b) => a - b), wmed = worlds[Math.floor(worlds.length / 2)];
    console.log(`${name.padEnd(8)} median wave ${med} (world ${wmed}) | won ${rows.filter((r) => r.won).length}/${rows.length} | waves ${rows.map((r) => r.wave).join(' ')}`);
    for (const r of rows) console.log(`   seed ${r.seed}: ${r.won ? 'WON' : r.over ? 'down' : 'time'} at wave ${r.wave} (world ${r.world}) ${r.time}s ${r.score.toLocaleString('en-US')} pts  lives lost: ${r.hits.join(' ')}`);
  }
}
