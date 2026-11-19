#!/usr/bin/env node
// room-styles.mjs — the campaign's rooms played by all eight bots (v61): the
// three that draw the lines (scripts/room-tiers.mjs), the expert, and v59's
// four who PLAY differently with the good player's hands (scripts/bot.mjs:
// close, kite, still, dasher). The lines were drawn by one way of playing;
// this asks whether they hold for the others:
//
//   S comes easy    a style that reaches S in most of its runs where the good
//                   bot, whose median IS the S line, reaches it about half the
//                   time: the line sits low for that way of playing
//   shut out        a style that gets through far less often than the good bot:
//                   the room asks for one way of playing (fine if it means to)
//   the lines hold  the three line bots on room-tiers' own seeds must draw the
//                   lines the rooms carry today, exactly — a check that nothing
//                   since they were drawn has moved them
//
//   node scripts/room-styles.mjs                          every room, eight bots, 24 seeds
//   node scripts/room-styles.mjs --hard                   HARD PAIN (tiersHard)
//   node scripts/room-styles.mjs --part 1/4 --json a.json a quarter of the rooms, as JSON
//   node scripts/room-styles.mjs --merge a.json,b.json,…  the parts, as one report
import { readFileSync, writeFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import { rooms } from '../js/sim/director/campaign.js?v=157';
import { SKILLS, prng, think } from './bot.mjs';
import { scoreLines } from './lines.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SEEDS = +opt('--seeds', 24), HARD = args.includes('--hard'), KEY = HARD ? 'tiersHard' : 'tiers';
const SKILL_LIST = opt('--skills', 'expert,sharp,average,rough,close,kite,still,dasher').split(',');
const STYLES = ['close', 'kite', 'still', 'dasher'], dt = T.sim.dt;
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));

// room-tiers.mjs's play(), seed for seed, so the line bots reproduce its lines
function play(L, seed, K) {
  const w = createWorld({ seed, mode: 'campaign', room: { id: L.id, world: L.plan.world, level: L, hard: HARD } });
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  if (L.goal?.kind) mem.quarry = T.campaign.kinds[L.goal.kind] ?? L.goal.kind;
  let end = null, held = null;
  for (let i = 0; i < (L.duration + 3) / dt && !end; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    end = w.events.find((e) => e.type === 'roomEnd') ?? null;
  }
  return end ? { o: end.outcome, g: end.grade, s: end.score } : { o: 'stuck', g: 'F', s: 0 };
}

function measure(part, parts) {
  const out = [];
  for (const [ri, r] of rooms().entries()) {
    if (ri % parts !== part - 1) continue;
    const L = level(r.id), by = {};
    for (const name of SKILL_LIST) by[name] = Array.from({ length: SEEDS }, (_, i) => play(L, 101 + i * 7, SKILLS[name]));
    out.push({ id: r.id, name: L.name, d: L.plan.d, world: L.plan.world, lines: L[KEY] ?? null, mutators: L.score?.mutators ?? [], by });
  }
  return out;
}

const pc = (n, d) => Math.round((100 * n) / (d || 1));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
function report(rows) {
  console.log(`${HARD ? 'HARD PAIN' : 'CAMPAIGN'} — every room, ${SKILL_LIST.length} bots, ${SEEDS} seeds a bot (room-tiers' seeds)\n`);
  console.log(`room            d   ${SKILL_LIST.map((s) => s.padEnd(7)).join(' ')}   (through % / S %)`);
  const easy = [], shut = [], drift = [];
  for (const R of rows.sort((a, b) => a.world - b.world || a.d - b.d)) {
    const cell = (s) => { const x = R.by[s] ?? []; return `${String(pc(x.filter((e) => e.o === 'clear').length, x.length)).padStart(3)}/${String(pc(x.filter((e) => e.g === 'S').length, x.length)).padStart(3)}`; };
    console.log(`${R.name.slice(0, 14).padEnd(14)} ${String(R.d).padStart(2)}   ${SKILL_LIST.map((s) => cell(s).padEnd(7)).join(' ')}${R.mutators.length ? `   ${R.mutators.join(',')}` : ''}`);
    const sharp = R.by.sharp ?? [], sharpS = pc(sharp.filter((e) => e.g === 'S').length, sharp.length), sharpT = pc(sharp.filter((e) => e.o === 'clear').length, sharp.length);
    for (const s of STYLES.filter((x) => R.by[x])) {
      const x = R.by[s], S = pc(x.filter((e) => e.g === 'S').length, x.length), thru = pc(x.filter((e) => e.o === 'clear').length, x.length);
      if (S >= 80 && S - sharpS >= 25) easy.push(`${R.name} — ${s} S ${S}% (the good bot ${sharpS}%)`);
      if (sharpT - thru >= 40) shut.push(`${R.name} — ${s} through ${thru}% (the good bot ${sharpT}%)`);
    }
    // the lines, drawn again from the three line bots: do they match what the room carries?
    if (R.lines && R.by.sharp && R.by.average && R.by.rough) {
      const vs = (k) => R.by[k].filter((e) => e.o === 'clear').map((e) => e.s);
      const now = scoreLines({ sharp: vs('sharp'), average: vs('average'), rough: vs('rough') }, { seeds: SEEDS });
      const off = ['S', 'A', 'B', 'C'].filter((k) => now?.[k] !== R.lines[k]);
      if (off.length) drift.push(`${R.name} — ${off.map((k) => `${k} ${R.lines[k]} → ${now?.[k]}`).join(', ')}`);
    }
  }
  const all = (s) => rows.flatMap((R) => R.by[s] ?? []);
  console.log(`\nover every room:  ${SKILL_LIST.map((s) => `${s} through ${pc(all(s).filter((e) => e.o === 'clear').length, all(s).length)}%, S ${pc(all(s).filter((e) => e.g === 'S').length, all(s).length)}%`).join(' · ')}`);
  console.log(`\nS comes easy for a style (S in 80%+ of its runs, 25+ points over the good bot's):\n  ${easy.join('\n  ') || 'none'}`);
  console.log(`\na style shut out (40+ points under the good bot's through-rate):\n  ${shut.join('\n  ') || 'none'}`);
  console.log(`\nthe lines drawn again from the three line bots, against what the rooms carry:\n  ${drift.length ? drift.join('\n  ') : `all ${rows.filter((R) => R.lines).length} rooms reproduce their lines exactly`}`);
}

if (opt('--merge', null)) report(opt('--merge').split(',').flatMap((f) => JSON.parse(readFileSync(f, 'utf8'))));
else {
  const [p, n] = opt('--part', '1/1').split('/').map(Number), rows = measure(p, n);
  if (opt('--json', null)) writeFileSync(opt('--json'), JSON.stringify(rows));
  else report(rows);
}
