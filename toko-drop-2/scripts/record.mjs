#!/usr/bin/env node
// record.mjs — a person's play record (js/record.js, v61) read against what
// the bots say. A player copies OPTIONS → PLAY RECORD into a message; saved to
// a file, this puts their runs beside the bots':
//
//   the rooms   each room played: tries, the grade of the first try and the
//               best, the score against the room's lines today (levels/*.json,
//               drawn by the bots, docs/LINES.md), and two flags — an S on a
//               first try (the lines may sit low for this player) and three or
//               more tries never past F (the room may ask too much); a room
//               left from the pause menu counts apart, as where a person stopped
//   the arcade  how often a run that walked into each world got through it,
//               beside the six skilled bots' (docs/CURVE.md), where the lives
//               went (the world's wave, 8 is its boss, and what took them), and
//               where runs were left from the pause menu (neither through nor lost)
//   the phone   (v63 on) each phone the record was played on: how its frames
//               ran (the median and 95th percentile interval, the share of
//               frames late, the refresh, whether the game slowed), and on
//               touch how the aim stick's let-gos read: flicks that dashed,
//               NEAR flicks (fast, but slowed before the lift or too short:
//               no dash) — a thumb whose flicks often read near may want the
//               flick's floors lower (TUNING.input.flick)
//
//   node scripts/record.mjs record.txt
//   node scripts/record.mjs record.txt --since 61     only entries from v61 on
import { readFileSync } from 'node:fs';
import { unpack } from '../js/record.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';
import { rooms } from '../js/sim/director/campaign.js?v=158';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const file = args.find((a) => !a.startsWith('--') && a !== opt('--since', null));
if (!file) { console.log('usage: node scripts/record.mjs record.txt [--since N]'); process.exit(1); }
const rec = unpack(readFileSync(file, 'utf8'));
if (!rec) { console.log(`${file}: no play record in it (it starts "TOKO DROP 2.0 · PLAY RECORD")`); process.exit(1); }
const since = +opt('--since', 0), all = rec.runs.filter((e) => (e.v ?? 0) >= since);

// the six skilled bots' mean, each world walked in (docs/CURVE.md, v59): the share of runs into a world that get through it
const BOTS = [99, 92, 87, 79, 71, 63, 59, 55, 34];
const PER = T.waves.rhythm.bossEvery, ORDER = ['S', 'A', 'B', 'C', 'D', 'F'];   // v157: D, a clear under C
const count = (xs, f) => { const o = {}; for (const x of xs) { const k = f(x); o[k] = (o[k] || 0) + 1; } return o; };
const list = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ');
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : null; };
const k = (n) => (n >= 1e4 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const vs = [...new Set(all.map((e) => e.v))].sort((a, b) => a - b), at = all.map((e) => e.at).filter(Boolean).sort();
console.log(`PLAY RECORD — ${all.length} entries${since ? ` from v${since}` : ''} · versions ${vs.join(', ') || '?'} · ${at[0] ?? '?'} → ${at[at.length - 1] ?? '?'}`);
console.log(`input: ${list(count(all, (e) => ({ t: 'touch', p: 'pad', k: 'keys' })[e.i] ?? '?'))} · screen: ${list(count(all, (e) => (e.or === 'p' ? 'portrait' : 'landscape')))}`);

// ── the rooms ──────────────────────────────────────────────────────────
const tried = all.filter((e) => e.k === 'r');
if (tried.length) {
  console.log(`\nTHE ROOMS — ${tried.length} tries in ${new Set(tried.map((e) => `${e.id}:${e.h}`)).size} rooms (lines as they are today)`);
  const levelOf = (id) => JSON.parse(readFileSync(new URL(`../levels/${id}.json`, import.meta.url), 'utf8'));
  const order = new Map(rooms().map((r, i) => [r.id, i]));
  const groups = [...new Set(tried.map((e) => `${e.id}:${e.h}`))].sort((a, b) => (order.get(a.split(':')[0]) ?? 99) - (order.get(b.split(':')[0]) ?? 99) || a.localeCompare(b));
  const flags = { lowS: [], stuck: [] };
  const left = {};
  for (const g of groups) {
    const [id, h] = g.split(':'), L = levelOf(id), lines = (+h ? L.tiersHard : L.tiers) ?? {}, name = L.name + (+h ? ' (HARD)' : '');
    const es = tried.filter((e) => `${e.id}:${e.h}` === g), done = es.filter((e) => e.o !== 'quit'), quit = es.length - done.length;
    if (quit) left[name] = quit;
    if (!done.length) { console.log(`  ${name.padEnd(22)} left from the pause menu ${quit}×, never played to its end`); continue; }
    const best = done.reduce((b, e) => (ORDER.indexOf(e.g) < ORDER.indexOf(b) ? e.g : b), 'F'), first = done[0];
    const clears = done.filter((e) => e.o === 'clear'), scores = clears.map((e) => e.s);
    const where = (s) => ORDER.find((x) => x !== 'F' && lines[x] != null && s >= lines[x]) ?? 'D';   // a clear: D at least (v157)
    console.log(`  ${name.padEnd(22)} ${String(done.length).padStart(2)} tries  first ${first.g}  best ${best}  through ${clears.length}/${done.length}${quit ? `  (+${quit} left)` : ''}` +
      `  score median ${scores.length ? `${k(median(scores))} (${where(median(scores))})` : '–'} best ${scores.length ? k(Math.max(...scores)) : '–'}` +
      `   lines ${['S', 'A', 'B', 'C'].map((x) => k(lines[x] ?? 0)).join(' / ')}`);
    if (first.g === 'S') flags.lowS.push(name);
    if (done.length >= 3 && best === 'F') flags.stuck.push(name);
  }
  const firsts = count(groups.map((g) => tried.find((e) => `${e.id}:${e.h}` === g && e.o !== 'quit')).filter(Boolean), (e) => e.g);
  console.log(`  first tries: ${ORDER.map((x) => `${x} ${firsts[x] || 0}`).join(' · ')}`);
  console.log(`  S on a first try (the lines may sit low): ${flags.lowS.join(', ') || 'none'}`);
  console.log(`  3+ tries, never past F (may ask too much): ${flags.stuck.join(', ') || 'none'}`);
  const why = count(tried.filter((e) => e.g === 'F'), (e) => e.y ?? e.o);
  if (Object.keys(why).length) console.log(`  what the Fs were: ${list(why)}`);
  console.log(`  left from the pause menu: ${list(left) || 'none'}`);
}

// ── the arcade ─────────────────────────────────────────────────────────
for (const [kind, name] of [['a', 'ARCADE'], ['h', 'HARDCADE']]) {
  const runs = all.filter((e) => e.k === kind);
  if (!runs.length) continue;
  console.log(`\n${name} — ${runs.length} runs · best ${k(Math.max(...runs.map((r) => r.s)))} · won ${runs.filter((r) => r.won).length} · median end: world ${median(runs.map((r) => r.w))}, wave ${median(runs.map((r) => r.n))}`);
  // a run walked into world n if it reached it; it got through if it reached the next (or won from
  // the last); a run left from the pause menu in world n is neither
  const N = T.worlds.list.length, rows = [];
  for (let n = 1; n <= N; n++) {
    const into = runs.filter((r) => r.w >= n && !(r.q && r.w === n)), through = into.filter((r) => r.w > n || r.won);
    if (!into.length) break;
    rows.push(`  world ${n}: ${String(through.length).padStart(2)}/${String(into.length).padEnd(2)} through (${String(Math.round((100 * through.length) / into.length)).padStart(3)}%)` +
      (kind === 'a' ? `   the bots: ${BOTS[n - 1]}%` : ''));
  }
  console.log(rows.join('\n'));
  const quits = runs.filter((r) => r.q);
  if (quits.length) console.log(`  left from the pause menu: ${list(count(quits, (r) => `world ${r.w}`))}`);
  const lost = runs.flatMap((r) => r.d ?? []), byWorld = {};
  for (const [wave, what] of lost) {
    const wn = Math.ceil(wave / PER), wi = wave - (wn - 1) * PER;
    (byWorld[wn] ??= { waves: Array(PER).fill(0), what: {} }).waves[Math.min(PER, wi) - 1]++;
    byWorld[wn].what[what] = (byWorld[wn].what[what] || 0) + 1;
  }
  console.log(`  lives lost by the world's wave (1-${PER}, ${PER} is its boss), and what took them:`);
  for (const wn of Object.keys(byWorld).map(Number).sort((a, b) => a - b)) console.log(`    world ${wn}: ${byWorld[wn].waves.join(' ')}   ${list(byWorld[wn].what).split(', ').slice(0, 4).join(', ')}`);
}

// ── the phone (v63) ────────────────────────────────────────────────────
const timed = all.filter((e) => e.f);
if (timed.length) {
  console.log(`\nTHE PHONE — ${timed.length} of ${all.length} entries say how the phone ran them (from v63)`);
  const pct = (x) => `${Math.round(x * 10) / 10}%`;
  for (const [dv, n] of Object.entries(count(timed, (e) => e.dv ?? '?')).sort((a, b) => b[1] - a[1])) {
    const es = timed.filter((e) => (e.dv ?? '?') === dv), F = (i) => es.map((e) => e.f[i]);
    const hz = count(es, (e) => e.f[3]), late = F(2), slow = es.filter((e) => e.f[4] < 0.98);
    console.log(`  ${dv} — ${n} entries (${list(count(es, (e) => ({ t: 'touch', p: 'pad', k: 'keys' })[e.i] ?? '?'))})`);
    console.log(`    refresh ${list(hz).replace(/(\d+) (\d+)/g, '$1 Hz ×$2')} · frame median ${median(F(0))} ms, 95th median ${median(F(1))} (worst ${Math.max(...F(1))})` +
      ` · late frames median ${pct(median(late))} (worst ${pct(Math.max(...late))}) · game speed lowest ${Math.min(...F(4)).toFixed(2)}×`);
    const lateRuns = es.filter((e) => e.f[2] > 5).length, low = es.filter((e) => e.f[3] <= 31 && e.f[3] >= 20).length;   // under 20 is no refresh, a phone that cannot draw
    if (lateRuns) console.log(`    ! more than 1 frame in 20 late in ${lateRuns} of ${n} entries: a stutter a person sees`);
    if (slow.length) console.log(`    ! the game slowed (under 0.98×) in ${slow.length} of ${n} entries: the phone could not keep up`);
    if (low) console.log(`    ! held to 30 Hz in ${low} of ${n} entries (Low Power Mode, or the browser holding it down)`);
  }
}
const flicked = all.filter((e) => e.fl);
if (flicked.length) {
  const [fl, near, rel, tap] = [0, 1, 2, 3].map((i) => flicked.reduce((a, e) => a + e.fl[i], 0)), fast = fl + near;
  console.log(`\n  the aim stick on touch, ${flicked.length} entries: ${fl + near + rel + tap} let-gos — ${fl} flicks (dashed), ${near} near flicks (fast, no dash), ${rel} let-gos, ${tap} taps`);
  if (fast) console.log(`    near flicks are ${Math.round((100 * near) / fast)}% of the fast strokes${near / fast >= 0.2 ? ' — ! the flick floors may sit high for this thumb (TUNING.input.flick: releaseFloor, lengthFloor)' : ''}`);
}
