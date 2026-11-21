#!/usr/bin/env node
// room-tiers.mjs — the campaign's bot pass (CAMPAIGN_PLAN.md): a bot plays
// every room over many seeds through the real input path, and the S/A/B
// tiers are set from what it does. It is a decent player, not a perfect one:
// it shoots the nearest body it may hurt, keeps its distance, steps out of
// bullets, goes for what the room asks (the ring, the orbs, the gates, the
// heart's side), and dashes through gates and, in a CUT room, through bodies.
//
//   node scripts/room-tiers.mjs                 every room, a report
//   node scripts/room-tiers.mjs --seeds 40      more seeds
//   node scripts/room-tiers.mjs --room orbit    one room
//   node scripts/room-tiers.mjs --write         write the tiers into levels/*.json
//   node scripts/room-tiers.mjs --hard          the HARD campaign: every corpse fires back (`tiersHard`)
//   node scripts/room-tiers.mjs --part 2/4      the second quarter of the rooms (one process a core)
//   node scripts/room-tiers.mjs --portrait      every room turned, as a phone held upright plays it (report only)
//   node scripts/room-tiers.mjs --both --write  both orientations, each line the lower of the two (v157)
//
// It plays at three SKILLS — sharp, average, rough: players who look ahead and
// differ in the human part (v56, scripts/bot.mjs: how fast they take a new
// threat in, how often they miss one, how far ahead they think, how clean
// their thumb is) — because one perfect bot is a ruler with one mark on it. The tiers
// are what each skill does: S is the sharp bot's median, A the average bot's,
// B the rough bot's (or the average bot's worst fifth, when the rough one
// does not get through). A room the average bot gets through less than half
// the time is reported, not tiered — that is a room to fix, not to grade.
import { readFileSync, writeFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import { rooms, roomBodies } from '../js/sim/director/campaign.js?v=159';
import { SKILLS, LINE_SKILLS, prng, think } from './bot.mjs';
import { scoreLines, BANDS, bandOf } from './lines.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const SEEDS = +opt('--seeds', 24), ONLY = opt('--room', null), WRITE = args.includes('--write');
const [PART, PARTS] = (opt('--part', '1/1')).split('/').map(Number);
// --hard: the HARD campaign (v49) — every corpse fires back — and its lines go in `tiersHard`
const HARD = args.includes('--hard'), KEY = HARD ? 'tiersHard' : 'tiers';
// --portrait (v157, owner: "we are making 2 games, landscape and portrait. Both need to be tested equally"): every
// room played TURNED, as a phone held upright plays it — a report beside the sideways one, never written
const TURN = args.includes('--portrait');
if (TURN && WRITE) { console.log('--portrait reports only: write with --both'); process.exit(2); }
// --both (v157: "S should be possible in all campaign levels", in both games): every seed played sideways AND turned;
// each line is the LOWER of the two orientations' lines, so a grade reachable one way is reachable the other way
const BOTH = args.includes('--both');
// the difficulty bands a room is held to: scripts/lines.mjs
const dt = T.sim.dt, H = T.hero;
const levelPath = (id) => new URL(`../levels/${id}.json`, import.meta.url);
const level = (id) => JSON.parse(readFileSync(levelPath(id), 'utf8'));

function play(L, seed, K, turn = TURN) {
  const R = { id: L.id, world: L.plan.world, level: L, hard: HARD, turn };
  const w = createWorld({ seed, mode: 'campaign', room: R });
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  if (L.goal?.kind) mem.quarry = T.campaign.kinds[L.goal.kind] ?? L.goal.kind;
  let end = null, held = null;
  for (let i = 0; i < (L.duration + 3) / dt && !end; i++) {
    // it looks up every `every` steps; between, it holds what it decided (a dash is one press)
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    end = w.events.find((e) => e.type === 'roomEnd') ?? null;
  }
  return { ...(end ?? { outcome: 'stuck', grade: 'F' }), by: w.killedBy, t: Math.round(w.time) };
}

const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const round = (v, n = 1) => Math.round(v * 10 ** n) / 10 ** n;

console.log(`room          goal          d  clock   pass sharp/avg/rough   median score sharp / avg / rough      lines S / A / B / C`);
const report = [];
const med = (a) => (a.length ? pct(a, 0.5) : null);
for (const [ri, r] of rooms().entries()) {
  if (ONLY && r.id !== ONLY) continue;
  if (ri % PARTS !== PART - 1) continue;
  const L = level(r.id);
  const measure = (turn) => {
    const by = {};
    for (const [name, K] of LINE_SKILLS.map((k) => [k, SKILLS[k]])) {
      const runs = Array.from({ length: SEEDS }, (_, i) => play(L, 101 + i * 7, K, turn));
      const ok = runs.filter((e) => e.outcome === 'clear');
      by[name] = { pass: ok.length / runs.length, vs: ok.map((e) => e.score), outs: runs.reduce((o, e) => ((o[e.outcome] = (o[e.outcome] || 0) + 1), o), {}), why: runs.filter((e) => e.outcome !== 'clear').map((e) => `${e.outcome}${e.by ? ':' + e.by : ''}@${e.t}`) };
    }
    // v51: a room is graded on its SCORE; the lines come from scripts/lines.mjs.
    // HARD (v49) is the mode you choose to be hard in: a room the average bot
    // rarely gets through is the point, not a fault, so it is tiered anyway
    const tiers = (by.average.pass >= 0.5 || HARD) ? scoreLines({ sharp: by.sharp.vs, average: by.average.vs, rough: by.rough.vs }, { seeds: SEEDS }) : null;
    return { by, tiers };
  };
  let { by, tiers } = measure(TURN);
  if (BOTH) {
    const up = measure(true);
    // the pass rates read the worse orientation (a room is in its band only if both are); each line the lower one
    for (const k of Object.keys(by)) if (up.by[k].pass < by[k].pass) by[k] = up.by[k];
    if (tiers && up.tiers) {
      const lo = { S: Math.min(tiers.S, up.tiers.S), A: Math.min(tiers.A, up.tiers.A), B: Math.min(tiers.B, up.tiers.B), C: Math.min(tiers.C, up.tiers.C) };
      for (const [hi, l] of [['S', 'A'], ['A', 'B'], ['B', 'C']]) if (lo[l] >= lo[hi]) lo[l] = Math.round(lo[hi] * 0.9);
      tiers = lo;
    } else tiers = tiers ?? up.tiers;
  }
  const k = (v) => (v == null ? '    -' : (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)).padStart(6));
  const passes = ['sharp', 'average', 'rough'].map((k) => String(Math.round(by[k].pass * 100)).padStart(3)).join('/');
  console.log(`${r.id.padEnd(13)} ${(L.goal.type + (L.goal.metric ? '/' + L.goal.metric : '')).padEnd(13)} ${String(L.plan.d).padStart(2)}  ${String(L.duration).padStart(3)}s   ${passes}%          ${k(med(by.sharp.vs))} ${k(med(by.average.vs))} ${k(med(by.rough.vs))}        ${tiers ? `${tiers.S} / ${tiers.A} / ${tiers.B} / ${tiers.C}` : `NOT TIERED avg ${JSON.stringify(by.average.outs)}`}`);
  const band = bandOf(L.plan.d), off = [];
  for (const k of ['average', 'rough']) { const [lo, hi] = band[k], p = by[k].pass; if (p < lo - 1e-9) off.push(`${k} ${Math.round(p * 100)}% < ${lo * 100}% (too hard)`); else if (p > hi + 1e-9) off.push(`${k} ${Math.round(p * 100)}% > ${hi * 100}% (too easy)`); }
  // a room whose level explains why it sits outside (plan.bandNote) is reported, not failed
  if (off.length) console.log(`    ${L.plan.bandNote ? 'OUTSIDE ITS BAND, AS NOTED' : 'OUT OF BAND'} d${L.plan.d}: ${off.join(', ')}${L.plan.bandNote ? ` — ${L.plan.bandNote}` : ''}`);
  if (L.plan.bandNote) off.length = 0;
  if (args.includes('--why')) for (const k of ['sharp', 'average', 'rough']) if (by[k].why.length) console.log(`    ${k}: ${by[k].why.join(' ')}`);
  report.push({ id: r.id, d: L.plan.d, by, tiers, off });
  if (WRITE && tiers) {
    const src = JSON.parse(readFileSync(levelPath(r.id), 'utf8'));
    src[KEY] = { ...tiers, source: `${HARD ? 'HARD ' : ''}bot pass (v56 look-ahead bots${BOTH ? '; v157: sideways and upright, each line the lower' : ''}), ${SEEDS} seeds a skill${BOTH ? ' an orientation' : ''}: got through sharp ${Math.round(by.sharp.pass * 100)}%, average ${Math.round(by.average.pass * 100)}%, rough ${Math.round(by.rough.pass * 100)}%. score lines: S the sharp median, A the average median, B the average's weaker quarter, C the rough median or the average's weakest tenth (scripts/lines.mjs)` };
    writeFileSync(levelPath(r.id), JSON.stringify(src, null, 1) + '\n');
  }
}
const outBand = report.filter((r) => r.off.length);
console.log(outBand.length ? `\n${outBand.length} room(s) out of their difficulty band: ${outBand.map((r) => r.id).join(', ')}` : '\nevery room sits in its difficulty band');
if (args.includes('--strict') && outBand.length) process.exitCode = 1;
const weak = report.filter((r) => r.by.average.pass < 0.5);
console.log(weak.length ? `\n${weak.length} room(s) the average bot gets through less than half the time: ${weak.map((r) => r.id).join(', ')}` : '\nevery room: the average bot gets through at least half the time');
if (args.includes('--json')) writeFileSync(opt('--json', 'tiers.json'), JSON.stringify(report.map((r) => ({ id: r.id, d: r.d, tiers: r.tiers, pass: Object.fromEntries(Object.entries(r.by).map(([k, v]) => [k, v.pass])) })), null, 1));
