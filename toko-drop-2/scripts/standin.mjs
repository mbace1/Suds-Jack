#!/usr/bin/env node
// standin.mjs — the owner's play sessions, played by bots that play like people, written out as a PLAY RECORD
// (owner, 2026-11-07: "Use bots instead of me"). The sessions are the ones a person was asked for: an evening of
// ARCADE (runs from world 1 until the lives are gone) and one HARDCADE run, then the campaign's first worlds a room
// at a time, each room tried again until it is through (C or better) or three tries are spent, with the three
// mutators met on the way (WHITE HEAT on THE POUR, BANK on THE BRAID, COLD GUN on SPIKE). Two players: `average`
// (react 0.4 s, sees 85%) and `rough` (react 0.65 s, sees 45%), scripts/bot.mjs's limits. What comes out is the
// game's own record (js/record.js entryFor + pack), so `node scripts/record.mjs <file>` reads it as it reads one a
// person pastes: the rooms against their lines, the arcade against the curve, where the lives went.
//
//   node scripts/standin.mjs [out=dist/standin-record.txt] [--quick]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld, step } from '../js/sim/world.js?v=161';
import { TUNING as T } from '../js/tuning.js?v=161';
import { rooms } from '../js/sim/director/campaign.js?v=161';
import { entryFor, pack } from '../js/record.js?v=161';
import { SKILLS, prng, think } from './bot.mjs';

const args = process.argv.slice(2), OUT = args.find((a) => !a.startsWith('--')) ?? 'dist/standin-record.txt', QUICK = args.includes('--quick');
const dt = T.sim.dt;
const level = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
const how = (skill) => ({ input: skill === 'rough' ? 'touch-bot-rough' : 'touch-bot-average', screen: 'portrait', date: new Date() });

// one attempt: a run (mode arcade | hardcade) or a room; the record's entry for it
function attempt({ mode, room = null, hard = false, seed, skill }) {
  const K = SKILLS[skill];
  const w = room ? createWorld({ seed, mode: 'campaign', room }) : createWorld({ seed, mode });
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  if (room?.level.goal?.kind) mem.quarry = T.campaign.kinds[room.level.goal.kind] ?? room.level.goal.kind;
  const lost = [], cap = room ? (room.level.duration + 3) / dt : 3600 / dt;   // an hour of play is past any run
  let held = null;
  for (let i = 0; i < cap && !w.over; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    for (const e of w.events) if (e.type === 'hurt') lost.push([w.wave, e.by ?? '?']);   // as main.js keeps them
    if (room && w.events.some((e) => e.type === 'roomEnd')) break;
  }
  return entryFor(w, room ? 'campaign' : mode, lost, how(skill));
}

const list = [], by = { average: [], rough: [] }, log = (s) => console.log(s);
const keep = (e, skill) => { list.push(e); by[skill].push(e); };
const say = (e) => (e.k === 'r' ? `  ${e.id.padEnd(12)} ${e.h ? 'HARD ' : ''}${String(e.g ?? '-').padEnd(2)} ${String(e.s).padStart(7)} ${e.o}${e.y ? ` (${e.y})` : ''}`
  : `  ${e.k === 'h' ? 'HARDCADE' : 'ARCADE  '} world ${e.w} wave ${e.n} · ${e.s.toLocaleString('en-US')} · ${Math.floor(e.t / 60)}:${String(e.t % 60).padStart(2, '0')}${e.won ? ' · WON' : ''}`);

// the evening's arcade: three runs from world 1 for the average player, two for the beginner, one HARDCADE each
const RUNS = QUICK ? { average: 1, rough: 1 } : { average: 3, rough: 2 };
for (const skill of ['average', 'rough']) {
  log(`${skill}: the arcade`);
  for (let r = 0; r < RUNS[skill]; r++) { const e = attempt({ mode: 'arcade', seed: 7100 + r * 13 + (skill === 'rough' ? 500 : 0), skill }); keep(e, skill); log(say(e)); }
  const e = attempt({ mode: 'hardcade', seed: 7300 + (skill === 'rough' ? 500 : 0), skill }); keep(e, skill); log(say(e));
}

// the campaign: in order, a room tried until it is through (C or better) or three tries are spent; a room is only
// played once the one before it is through, as the grid opens them. The average player plays worlds 1–2 and, those
// cleared, world 3's first four rooms (SPIKE is the fourth: COLD GUN); the beginner plays world 1
const ALL = rooms(), through = (g) => g && g !== 'F';
for (const [skill, upto] of [['average', QUICK ? 6 : 16], ['rough', QUICK ? 3 : 6]]) {
  log(`${skill}: the campaign`);
  for (const r of ALL.slice(0, upto)) {
    const L = level(r.id), room = { id: r.id, world: L.plan.world, level: L, hard: false };
    let best = null;
    for (let tri = 0; tri < 3 && !through(best); tri++) {
      const e = attempt({ room, seed: 9000 + r.index * 37 + tri * 7 + (skill === 'rough' ? 4000 : 0), skill });
      keep(e, skill); log(say(e)); best = e.g;
    }
    if (!through(best)) { log(`  (${r.id} not through in three tries: the session stops here, as the grid would)`); break; }
  }
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, pack(list, new Date()) + '\n');
// and one record a player, as a person's own record is one person's
for (const [skill, l] of Object.entries(by)) writeFileSync(OUT.replace(/(\.txt)?$/, `-${skill}.txt`), pack(l, new Date()) + '\n');
log(`\n${list.length} entries → ${OUT} (and one a player: -average, -rough)\nread it: node scripts/record.mjs ${OUT}`);
