#!/usr/bin/env node
// room-eval.mjs — one campaign room, measured (v46): the bot (scripts/bot.mjs)
// plays it at its three skills over many seeds, and the numbers a room is
// judged by come back with a checklist against the campaign's targets:
//
//   PACING   how much of the clock has nothing on the floor to deal with
//            (no body, no gel bullet, no orb, ring or heart asking anything)
//   SKILL    how far the sharp bot's grade sits above the rough bot's, the
//            grades read against lines set the way scripts/room-tiers.mjs
//            will set them (S the sharp median, A the average, B the rough)
//   FIT      the share of runs each skill gets through, against the band its
//            difficulty `plan.d` asks for (room-tiers.mjs BANDS)
//   FAIR     the sharp bot gets through; nobody dies in the room's first
//            quarter; and a better player never does worse
//
//   node scripts/room-eval.mjs <room-id | path/to/level.json> [--seeds 16] [--json out.json] [--why] [--hard]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=157';
import { TUNING as T } from '../js/tuning.js?v=157';
import { roomBodies } from '../js/sim/director/campaign.js?v=157';
import { SKILLS, LINE_SKILLS, prng, think } from './bot.mjs';
import { scoreLines, gradeOf as lineGrade, BANDS } from './lines.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const target = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--seeds' && args[args.indexOf(a) - 1] !== '--json');
if (!target) { console.log('usage: node scripts/room-eval.mjs <room-id | level.json> [--seeds 16] [--json out.json] [--why]'); process.exit(2); }
const path = existsSync(target) ? target : new URL(`../levels/${target}.json`, import.meta.url);
const L = JSON.parse(readFileSync(path, 'utf8'));
const SEEDS = +opt('--seeds', 16), dt = T.sim.dt, HARD = args.includes('--hard');   // --hard: the HARD campaign's room (v49)
export { BANDS };   // v56: drawn once, in scripts/lines.mjs
const TARGET = { idle: 0.12, spread: 2.0, sharp: 0.95 };

function play(seed, K) {
  const w = createWorld({ seed, mode: 'campaign', room: { id: L.id, world: L.plan.world, level: L, hard: HARD } });
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(seed * 31 + 7) };
  if (L.goal?.kind) mem.quarry = T.campaign.kinds[L.goal.kind] ?? L.goal.kind;
  let end = null, held = null, idle = 0, steps = 0, bul = 0, bod = 0, bodMax = 0;
  for (let i = 0; i < (L.duration + 3) / dt && !end; i++) {
    if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false };
    step(w, held);
    steps++;
    const bodies = w.gels.filter((g) => g.alive && g.state === 'active').length;
    const gb = w.bullets.filter((b) => !b.hero && !b.dead).length;
    const ch = w.ch, asks = !!(ch?.zone || ch?.heart || ch?.orbs?.some((o) => o.out && !o.taken && !o.lost) || (w.pk?.gates?.some((g) => g.alive) && ch?.goal?.type === 'gates'));
    if (!bodies && !gb && !asks) idle++;
    bul += gb; bod += bodies; bodMax = Math.max(bodMax, bodies);
    end = w.events.find((e) => e.type === 'roomEnd') ?? null;
  }
  end ??= { outcome: 'stuck', grade: 'F' };
  const value = end.score ?? 0;   // v51: a room is graded on its score
  return { outcome: end.outcome, why: end.why, by: w.killedBy, time: w.time, hits: w.hits || 0, value, idle: idle * dt, bul: bul / Math.max(1, steps), bod: bod / Math.max(1, steps), bodMax };
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const by = {};
for (const [name, K] of LINE_SKILLS.map((k) => [k, SKILLS[k]])) by[name] = Array.from({ length: SEEDS }, (_, i) => play(101 + i * 7, K));

// provisional lines, as room-tiers.mjs sets them (scripts/lines.mjs)
const ok = (k) => by[k].filter((r) => r.outcome === 'clear');
const tiers = scoreLines({ sharp: ok('sharp').map((r) => r.value), average: ok('average').map((r) => r.value), rough: ok('rough').map((r) => r.value) }, { seeds: SEEDS });
const G = { F: 0, C: 1, B: 2, A: 3, S: 4 };
const gradeOf = (r) => (r.outcome !== 'clear' ? 0 : !tiers ? 1 : G[lineGrade(tiers, r.value)]);
const stat = {};
for (const [k, runs] of Object.entries(by)) {
  const avg = (f) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  stat[k] = { pass: ok(k).length / runs.length, gv: avg(gradeOf), idle: avg((r) => r.idle), bul: avg((r) => r.bul), bod: avg((r) => r.bod), bodMax: Math.max(...runs.map((r) => r.bodMax)), hits: avg((r) => r.hits),
    early: runs.filter((r) => r.outcome !== 'clear' && r.time < L.duration * 0.25).length, fails: runs.filter((r) => r.outcome !== 'clear').map((r) => `${r.outcome}:${r.why ?? ''}${r.by ? ':' + r.by : ''}@${r.time.toFixed(0)}`) };
}
const S = stat.sharp, A = stat.average, R = stat.rough;
const idleShare = A.idle / L.duration, spread = S.gv - R.gv;
const band = BANDS.find((b) => L.plan.d >= b.d[0] && L.plan.d <= b.d[1]);
let outPts = 0; const bandOff = [];
for (const [k, p] of [['average', A.pass], ['rough', R.pass]]) { const [lo, hi] = band[k]; const o = p < lo ? lo - p : p > hi ? p - hi : 0; outPts += o; if (o) bandOff.push(`${k} ${Math.round(p * 100)}% outside ${lo * 100}-${hi * 100}%`); }
const clamp = (v, a = 0, b = 10) => Math.max(a, Math.min(b, v));
const score = {
  pacing: clamp(10 - 12 * idleShare, 2), skill: spread < 0 ? 1 : clamp(2 + 2 * spread), fit: clamp(10 - 15 * outPts),
  fair: clamp(10 - 25 * (1 - S.pass) - 10 * (A.early / SEEDS) - 4 * (R.early / SEEDS) - (spread < 0 ? 4 : 0)),
};
score.measured = Math.round(((0.2 * score.pacing + 0.15 * score.skill + 0.1 * score.fit + 0.1 * score.fair) / 0.55) * 10) / 10;
const checks = [
  [`pacing: the floor empty ≤ ${TARGET.idle * 100}% of the clock`, idleShare <= TARGET.idle, `${Math.round(idleShare * 100)}%`],
  [`skill: sharp grade − rough grade ≥ ${TARGET.spread}`, spread >= TARGET.spread, spread.toFixed(2)],
  [`fair: the sharp bot gets through ≥ ${TARGET.sharp * 100}%`, S.pass >= TARGET.sharp, `${Math.round(S.pass * 100)}%`],
  [`fit: average and rough inside the d${L.plan.d} band`, !bandOff.length, bandOff.join('; ') || 'in band'],
  ['fair: no early deaths for the sharp or average bot', S.early + A.early === 0, `${S.early}/${A.early}`],
];
const f = (v, n = 1) => (v == null ? '-' : (+v).toFixed(n));
console.log(`${L.id} (${L.name}) d${L.plan.d} world ${L.plan.world} · ${L.duration} s · goal ${L.goal.type} · graded on score · ${roomBodies(L)} bodies · ${SEEDS} seeds a skill`);
for (const k of ['sharp', 'average', 'rough']) { const s = stat[k]; console.log(`  ${k.padEnd(8)} through ${String(Math.round(s.pass * 100)).padStart(3)}%  grade ${f(s.gv, 2)}  idle ${f(s.idle)} s  bodies avg ${f(s.bod)} max ${s.bodMax}  gel bullets avg ${f(s.bul)}  hits ${f(s.hits)}  early deaths ${s.early}`); }
console.log(`  lines (provisional) ${tiers ? `S ${tiers.S} / A ${tiers.A} / B ${tiers.B} / C ${tiers.C}` : 'none: the sharp bot does not get through'}`);
console.log(`  measured: pacing ${f(score.pacing)} skill ${f(score.skill)} fit ${f(score.fit)} fair ${f(score.fair)} → ${f(score.measured)} / 10`);
for (const [c, pass, d] of checks) console.log(`  ${pass ? '✔' : '✗'} ${c} (${d})`);
if (args.includes('--why')) for (const k of ['sharp', 'average', 'rough']) if (stat[k].fails.length) console.log(`  ${k} fails: ${stat[k].fails.join(' ')}`);
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify({ id: L.id, d: L.plan.d, stat, tiers, idleShare, spread, score, checks: checks.map(([c, p, d]) => ({ c, pass: p, d })) }, null, 1));
process.exitCode = checks.every(([, p]) => p) ? 0 : 1;
