#!/usr/bin/env node
// soak.mjs — bots play a lot and every step is checked against the game's own
// rules (v61). The balance scripts ask how hard; this asks whether anything
// BREAKS: a position that goes NaN, a body or the hero off the floor, the
// bodies or the bullets piling up past any wave's need, a wave that stops
// moving, a score that goes down, the heat outside nought to its ceiling, a
// room that never ends. A finding names the run (mode, world or room, seed,
// bot) and the step, so it replays exactly. Off the floor counts from the
// `HOLD`th step running: a body split just outside a wall that is closing in
// is put back on the next step (found by the first soak), and a step is
// 1/60 s no one can see.
//
//   node scripts/soak.mjs                          every arcade world and every room, three bots, 6 seeds
//   node scripts/soak.mjs --seeds 12 --skills sharp,still --part 1/4
import { readFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import { rooms } from '../js/sim/director/campaign.js?v=157';
import { ceiling } from '../js/sim/heat.js?v=157';
import { SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SEEDS = +opt('--seeds', 6), SKILL_LIST = opt('--skills', 'sharp,still,dasher').split(','), [PART, PARTS] = opt('--part', '1/1').split('/').map(Number);
const dt = T.sim.dt, EDGE = 0.6, HOLD = 3;   // how far past a wall a body may stand (its radius, a shove mid-step), and for how many steps
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
const finite = (...v) => v.every(Number.isFinite);

function soak(w, K, seed, cap, name) {
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed) }, bad = [];
  const L = w.room?.level;
  if (L?.goal?.kind) mem.quarry = T.campaign.kinds[L.goal.kind] ?? L.goal.kind;
  let held = null, score = 0, wave = w.wave, waveAt = 0, peakGels = 0, peakBullets = 0, heroOut = 0;
  const out = new WeakMap();   // a body's steps off the floor, running
  const flag = (i, what) => { if (bad.length < 5) bad.push(`${name} seed ${seed} ${K.name ?? ''} t=${(i * dt).toFixed(2)}s: ${what}`); };
  for (let i = 0; i < cap / dt && !w.over; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    const h = w.hero, hx = w.hx, hz = w.hz;
    if (!finite(h.x, h.z)) flag(i, `hero at ${h.x},${h.z}`);
    else if (!w.trans && (Math.abs(h.x) > hx + EDGE || Math.abs(h.z) > hz + EDGE)) { if (++heroOut === HOLD) flag(i, `hero off the floor at ${h.x.toFixed(2)},${h.z.toFixed(2)} (walls ${hx.toFixed(1)} × ${hz.toFixed(1)})`); }
    else heroOut = 0;
    let live = 0;
    for (const g of w.gels) {
      if (!g.alive) continue;
      live++;
      if (!finite(g.x, g.z)) { flag(i, `${g.kind} at ${g.x},${g.z}`); continue; }
      const off = g.state === 'active' && !w.trans && (Math.abs(g.x) > hx + g.r + EDGE || Math.abs(g.z) > hz + g.r + EDGE), n = off ? (out.get(g) ?? 0) + 1 : 0;
      out.set(g, n);
      if (n === HOLD) flag(i, `${g.kind} off the floor at ${g.x.toFixed(2)},${g.z.toFixed(2)} for ${HOLD} steps`);
    }
    for (const b of w.bullets) if (!b.dead && !finite(b.x, b.z)) { flag(i, `a bullet at ${b.x},${b.z}`); break; }
    peakGels = Math.max(peakGels, live); peakBullets = Math.max(peakBullets, w.bullets.length);
    if (live > 400) flag(i, `${live} bodies alive`);
    if (w.bullets.length > 3000) flag(i, `${w.bullets.length} bullets`);
    if (w.score < score) flag(i, `the score went down, ${score} → ${w.score}`);
    score = w.score;
    if (!(w.heat >= 0 && w.heat < ceiling(w))) flag(i, `heat ${w.heat} outside 0 … ×${ceiling(w)}`);
    if (w.wave !== wave) { wave = w.wave; waveAt = i; }
    else if (!w.room && (i - waveAt) * dt > 240) { flag(i, `wave ${wave} has not moved in 240 s`); waveAt = i; }
  }
  if (w.room && !w.over) flag(Math.round(cap / dt), `the room never ended (${cap} s)`);
  return { bad, peakGels, peakBullets, over: !!w.over, won: !!w.won, t: w.time };
}

const jobs = [];
for (const s of SKILL_LIST) {
  for (const mode of ['arcade', 'hardcade']) for (let wn = 1; wn <= T.worlds.list.length; wn++) for (let k = 0; k < SEEDS; k++) jobs.push({ s, mode, wn, seed: 9001 + k * 101 + wn * 13 });
  for (const hard of [false, true]) for (const r of rooms()) for (let k = 0; k < Math.max(1, SEEDS >> 1); k++) jobs.push({ s, room: r, hard, seed: 7001 + k * 97 });
}
const found = [];
let n = 0, peakG = 0, peakB = 0;
jobs.forEach((j, i) => {
  if (i % PARTS !== PART - 1) return;
  const K = { ...SKILLS[j.s], name: j.s };
  const w = j.room ? createWorld({ seed: j.seed, mode: 'campaign', room: { ...j.room, level: level(j.room.id), hard: j.hard } }) : createWorld({ seed: j.seed, mode: j.mode, world: j.wn });
  const name = j.room ? `${j.hard ? 'HARD ' : ''}${j.room.id}` : `${j.mode} world ${j.wn}`;
  const r = soak(w, K, j.seed, j.room ? level(j.room.id).duration + 10 : 420, name);
  n++; peakG = Math.max(peakG, r.peakGels); peakB = Math.max(peakB, r.peakBullets);
  found.push(...r.bad);
});
console.log(`soak: ${n} runs, ${SKILL_LIST.join('/')} — the most bodies alive at once ${peakG}, bullets ${peakB}`);
console.log(found.length ? `${found.length} finding(s):\n  ${found.join('\n  ')}` : 'nothing broke');
process.exitCode = found.length ? 1 : 0;
