// EERI — the report card, so a level can be CULLED instead of argued about.
//
// The owner's call (2026-08-21): "we can always make more levels and skip
// some if they are not usable." That only works if "not usable" is a
// reading rather than an opinion — twelve levels all pass `rooms.mjs` and
// all finish in `playthrough.cjs`, and none of that says which of them a
// six-year-old would put down.
//
// So this is not a gate. It never fails a build; it prints one line per
// level and one verdict, off the measures the code already keeps:
//
//   asks/10   how much a stretch of level asks for, per ten tiles. The
//             front half measures 1.3–1.9, worlds 3–4 measured 0.8–1.0.
//   dead      the worst run with nothing in it (DEAD_AIR = 15 is the floor
//             taken from the levels that already play).
//   learned   estimate() — the run of someone who knows the route. DESIGN
//             §4 wants 60–90s first time, ~40 learned.
//   foot      the share of that which is NOT the ride. DESIGN §1: on foot
//             is 80% of playtime and has to be good on its own.
//   words     how many DISTINCT things the level asks for. A level that
//             says one word ten times is the definition of the thin one.
//   new       how many of those words the game has not used before, in
//             level order. This is the cull signal: a level that is thin
//             AND says nothing new is the one to drop.
//
// Run: node eeri/test/report.mjs [--csv]

// ONE TOKEN PER MODULE, and this file learned why the hard way: with
// `rooms.js?v=3` beside `levelid.js?v=15`, the register that appends worlds
// 3 and 4 ran against a DIFFERENT instance of rooms.js than the one read
// here, and the two halves of the game arrived from two module graphs. It
// happened to total twelve, which is the worst kind of wrong.
import { ROOMS } from '../js/rooms.js?v=48';
import { compile, estimate, deadAir, DEAD_AIR, LEVEL, W } from '../js/parts.js?v=48';
import { labelOf } from '../js/levelid.js?v=48';

// ---- the vocabulary ------------------------------------------------------
// What a level SAYS, as a set of words. Deliberately coarser than the parts
// list: two ledges are one word, a skitter and a hopper are two, because the
// question is "what does this level ask of you" and not "how many objects".
function words(r) {
  const w = new Set();
  for (const o of r.obstacles || []) w.add(o.clears ? `job:${o.clears}` : `step:${o.kind || 'obstacle'}`);
  for (const q of r.robots || []) w.add(`bot:${q.kind}`);
  for (const h of r.hazards || []) w.add(`hazard:${h.type}`);
  if (r.ball) w.add('hazard:ball');
  if (r.belts?.length) w.add('gizmo:belt');
  if (r.tarps?.length) w.add('gizmo:tarp');
  if (r.hoists?.length) w.add('gizmo:hoist');
  if (r.pipes?.length) w.add('gizmo:pipe');
  if (r.ladders?.length) w.add('gizmo:ladder');
  if (r.water?.length) w.add('gizmo:water');
  for (const m of r.machines || []) w.add(`ride:${m.type}`);
  return w;
}

const rows = [];
const seen = new Set();

for (let i = 0; i < ROOMS.length; i++) {
  const room = ROOMS[i];
  const r = compile(room);
  const d = deadAir(room);
  const e = estimate(room);
  const len = Math.max(1, (r.finish?.x ?? W) - r.spawn.kid.x);
  const w = words(r);
  const fresh = [...w].filter((k) => !seen.has(k));
  for (const k of w) seen.add(k);

  // A TEACHING LEVEL IS QUIET ON PURPOSE. Level 1 says eight things the
  // game has never said, and a level doing that has to leave room between
  // them — measuring it as "thin" is the ruler failing to see the job.
  const teaching = fresh.length >= 3;
  const flags = [];
  if (d.worst > DEAD_AIR) flags.push(`${d.worst}t of nothing at x${d.where}`);
  if (d.asks / len * 10 < 1.2 && !teaching) flags.push('thin');
  if (w.size < 4) flags.push('few words');
  if (e.total > 55) flags.push('long');
  if (e.total < 25) flags.push('short');
  if (e.onFoot < 0.6) flags.push('mostly ride');
  if (r.bolts.length !== LEVEL.bolts) flags.push(`${r.bolts.length} bolts`);
  if (!r.checkpoint) flags.push('no checkpoint');

  // The verdict, and it only ever says one of three things. CUT is reserved
  // for thin AND nothing new — a level can be quiet if it is teaching, and a
  // level can repeat itself if it is dense.
  const thin = (d.asks / len * 10 < 1.2 && !teaching) || d.worst > DEAD_AIR;
  const verdict = (thin && fresh.length === 0) ? 'CUT'
    : flags.length ? 'THIN' : 'SHIP';

  rows.push({
    i, label: labelOf(i, ROOMS.length), name: room.name,
    len: +len.toFixed(0), asks: d.asks, per10: +(d.asks / len * 10).toFixed(2),
    dead: d.worst, where: d.where, learned: +e.total.toFixed(0),
    foot: Math.round(e.onFoot * 100), words: w.size, fresh: fresh.length,
    freshList: fresh, verdict, flags,
  });
}

if (process.argv.includes('--csv')) {
  console.log('level,name,len,asks,per10,dead,learned,foot,words,new,verdict');
  for (const r of rows) console.log([r.label, JSON.stringify(r.name), r.len, r.asks,
    r.per10, r.dead, r.learned, r.foot, r.words, r.fresh, r.verdict].join(','));
  process.exit(0);
}

console.log('EERI — level report card\n');
console.log('  a level is CUT only when it is thin AND says nothing new.');
console.log(`  floors: dead air <= ${DEAD_AIR}t · asks >= 1.2 per 10 tiles · learned 25-55s · on foot >= 60%\n`);
const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
console.log('  ' + pad('lvl', 5) + pad('name', 22) + num('len', 4) + num('asks', 5)
  + num('/10', 6) + num('dead', 5) + num('sec', 5) + num('foot', 5) + num('word', 5)
  + num('new', 4) + '  verdict');
console.log('  ' + '-'.repeat(81));
for (const r of rows) {
  console.log('  ' + pad(r.label, 5) + pad(r.name.slice(0, 21), 22) + num(r.len, 4)
    + num(r.asks, 5) + num(r.per10.toFixed(2), 6) + num(r.dead, 5) + num(r.learned, 5)
    + num(r.foot + '%', 5) + num(r.words, 5) + num(r.fresh, 4) + '  ' + r.verdict);
}

console.log('\n  what each level is flagged for:');
for (const r of rows) {
  if (r.verdict === 'SHIP') continue;
  console.log(`    ${r.label}  ${r.verdict}: ${r.flags.join(' · ') || 'nothing new'}`
    + (r.fresh ? `\n           new here: ${r.freshList.join(', ')}` : ''));
}

const by = (v) => rows.filter((r) => r.verdict === v).length;
console.log(`\n  ${by('SHIP')} ship · ${by('THIN')} thin · ${by('CUT')} cut`);
console.log(`  the game says ${seen.size} different things across ${rows.length} levels.\n`);
