#!/usr/bin/env node
// boss-tiers.mjs — the arcade's boss fights graded the way the campaign's
// rooms are (v42, sim/bossfight.js): the bot (scripts/bot.mjs, the same one
// room-tiers.mjs plays) fights each world's boss wave, with its own boss (v45),
// at three skills over many seeds — the seconds from the wave's start to its
// last boss down. S is the sharp bot's median, A the average bot's, B the
// rough bot's (or the average bot's slowest fifth when the rough one never
// gets the kill inside two minutes), sorted best first, with a floor between the
// steps: a person is slower than any bot, and a second late must not be a C.
// The bot cannot dodge a boss as well as it shoots one (the sharp bot loses
// three lives to OMEGA in eight seconds), so it fights with lives to spare
// and the hits it took are reported beside the times: the lines measure how
// fast a boss goes down, not whether this bot survives it.
//
//   node scripts/boss-tiers.mjs              a report
//   node scripts/boss-tiers.mjs --seeds 12   more seeds
//   node scripts/boss-tiers.mjs --world 3    one world
//   node scripts/boss-tiers.mjs --write      write js/tuning/bossfights.js
import { writeFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=156';
import { TUNING as T } from '../js/tuning.js?v=156';
import { headliner } from '../js/sim/director/arcade.js?v=156';
import { SKILLS, LINE_SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SEEDS = +opt('--seeds', 10), ONLY = +opt('--world', 0), WRITE = args.includes('--write');
const dt = T.sim.dt, EVERY = T.waves.rhythm.bossEvery, WORLDS = T.worlds.list.length, CAP = 120;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// a run brought to the start of world `world`'s boss wave, the floor empty
function fight(world, seed, K) {
  const w = createWorld({ seed, mode: 'arcade', world });
  step(w, IDLE);
  w.gels = []; w.dir.queue = []; w.dir.wave = world * EVERY - 1; w.dir.gapT = 1e-9;
  w.hero.lives = 99;
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  let held = null;
  for (let i = 0; i < CAP / dt; i++) {
    w.hero.lives = 99;                       // every step: a health pod caps them at the hero's own (v45)
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    const e = w.events.find((x) => x.type === 'bossDown');
    if (e) return { ok: true, time: e.time, kind: e.kind, hits: w.hits || 0 };
    if (w.over) return { ok: false, why: 'died' };
  }
  return { ok: false, why: 'slow' };
}

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const round = (v) => Math.round(v * 10) / 10;
const out = {};
console.log('world  boss    pass sharp/avg/rough   sharp    avg  rough    tiers S / A / B    hits taken sharp/avg/rough');
for (let world = 1; world <= WORLDS; world++) {
  if (ONLY && world !== ONLY) continue;
  const wave = world * EVERY;
  // each world's own boss (v45, arcade.js headliner()); any seed meets it
  for (const kind of [headliner(wave, 0, world).kind]) {
    const seeds = []; for (let s = 11; seeds.length < SEEDS; s++) seeds.push(s);
    const by = {};
    for (const [name, K] of LINE_SKILLS.map((k) => [k, SKILLS[k]])) {
      const runs = seeds.map((s) => fight(world, s, K));
      const ok = runs.filter((r) => r.ok);
      by[name] = { pass: ok.length / runs.length, ts: ok.map((r) => r.time), hits: ok.length ? ok.reduce((a, r) => a + r.hits, 0) / ok.length : 0, why: runs.filter((r) => !r.ok).map((r) => r.why) };
    }
    const med = (k) => (by[k].ts.length ? pct(by[k].ts, 0.5) : null);
    // with lives to spare a rough fight that ends is a real time, so B is the rough bot's median whenever it has one
    const S0 = med('sharp'), A0 = med('average'), B0 = by.rough.ts.length ? med('rough') : by.average.ts.length ? pct(by.average.ts, 0.8) : null;
    let tiers = null;
    if (S0 != null && A0 != null && B0 != null) {
      const [s, a, b] = [S0, A0, B0].sort((x, y) => x - y), gap = Math.max(2, s * 0.1);
      tiers = { S: round(s) }; tiers.A = round(Math.max(a, tiers.S + gap)); tiers.B = round(Math.max(b, tiers.A + gap));
      (out[world] ??= {})[kind] = tiers;
    }
    const f = (v) => (v == null ? '   - ' : String(round(v)).padStart(6));
    const passes = ['sharp', 'average', 'rough'].map((k) => String(Math.round(by[k].pass * 100)).padStart(3)).join('/');
    const hits = ['sharp', 'average', 'rough'].map((k) => by[k].hits.toFixed(1)).join('/');
    console.log(`${String(world).padStart(5)}  ${kind.padEnd(6)} ${passes}%     ${f(S0)} ${f(A0)} ${f(med('rough'))}    ${tiers ? `${tiers.S} / ${tiers.A} / ${tiers.B}` : 'NOT TIERED'}    hits ${hits}`);
  }
}
if (WRITE) {
  const path = new URL('../js/tuning/bossfights.js', import.meta.url);
  const head = `// bossfights.js — the lines an arcade boss fight is graded on (v42,
// sim/bossfight.js), WRITTEN by \`node scripts/boss-tiers.mjs --write\`: per
// world and its own boss (v45), the seconds from the boss wave's start to its last
// boss down. S is the sharp bot's median, A the average bot's, B the rough
// bot's, as the campaign's rooms are (scripts/room-tiers.mjs), with the same
// floor between the steps. Do not edit by hand: run the pass.
// ${SEEDS} seeds a cell, ${new Date().toISOString().slice(0, 10)}.
`;
  writeFileSync(path, `${head}export const BOSS_TIERS = ${JSON.stringify(out, null, 1).replace(/\n\s*/g, ' ')};\n`);
  console.log(`\nwrote ${Object.keys(out).length} world(s) to js/tuning/bossfights.js`);
}
