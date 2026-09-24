// THE WEEK's rules in bare node (js/week.js): a seed makes the same week, a
// weekday deck, money, the clock-out on leaving, the rent, the save.
//
//   node toko-move/test/week.mjs
import * as W from '../js/week.js';

let pass = 0, fail = 0;
const ok = (c, m, x = '') => { if (c) pass++; else { fail++; console.log(`  FAIL ${m}${x ? ' — ' + x : ''}`); } };
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

// ── a week is a seed ────────────────────────────────────────────────────
ok(JSON.stringify(W.weekDays(42)) === JSON.stringify(W.weekDays(42)), 'the same seed draws the same five days');
const decks = new Set(); for (let s = 1; s <= 200; s++) decks.add(W.weekDays(s).join());
ok(decks.size > 20, `and different seeds draw different weeks (${decks.size} orders in 200)`);
for (let s = 1; s <= 200; s++) { const d = W.weekDays(s);
  if (d.length !== 5 || d.slice().sort().join() !== W.DECK.slice().sort().join()) { ok(false, 'every week is the whole deck, once', `${s}: ${d}`); break; } }
ok(W.weekDays(7).every(d => d !== 'quiet'), 'no weekday is a quiet Sunday');
const fridays = {}; for (let s = 1; s <= 500; s++) { const f = W.weekDays(s)[4]; fridays[f] = (fridays[f] || 0) + 1; }
ok(Object.keys(fridays).length === 4, `any day can fall on Friday (${JSON.stringify(fridays)})`);
const seeds = new Set(); for (let i = 0; i < 5; i++) seeds.add(W.shiftSeedFor(9, i));
ok(seeds.size === 5, 'five different shifts in a week');
ok([...seeds].every(n => n >= 1000000 && n < 10000000), 'and none can be a daily (six digits) or a pinned test shift');

// ── money ───────────────────────────────────────────────────────────────
ok(W.euros(1189) === 119 && W.euros(0) === 0 && W.euros(-40) === 0, 'a score is euros at one per ten points, never negative');

// ── a week played through ───────────────────────────────────────────────
{ const s = mem(); let w = W.resume(s, seq(0.5));
  ok(w.day === 0 && w.shifts.length === 0 && s.m.has(W.KEY), 'a fresh week starts on Monday and is saved');
  ok(W.today(w).name === 'MONDAY' && W.today(w).seed === W.shiftSeedFor(w.seed, 0), "today is Monday's shift");
  for (let i = 0; i < 5; i++) { W.begin(w); W.progress(w, { score: 1000, results: ['ok'] }); W.close(w, { score: 1000 + i * 10, results: ['ok', 'ok', 'late'] }); W.saveWeek(w, s); }
  ok(W.isOver(w) && w.shifts.length === 5, 'five closes end the week');
  ok(W.total(w) === 100 + 101 + 102 + 103 + 104, `the week keeps every shift's money (€${W.total(w)})`);
  const v = W.verdict(w); ok(v.paid === (W.total(w) >= W.RENT) && v.over === W.total(w) - W.RENT, 'and Friday pays the rent or does not');
  const before = JSON.stringify(w); W.close(w, { score: 99999 }); ok(JSON.stringify(w) === before, 'a sixth close changes nothing');
  const txt = W.shareText(w, 'u'); ok(/MON 🟩🟩🟨 €100/.test(txt) && /FRI/.test(txt) && txt.endsWith('u'), 'the share line has a row a day', txt.split('\n')[1]);
}

// ── leaving is clocking out ─────────────────────────────────────────────
{ const s = mem(); let w = W.resume(s, seq(0.1));
  W.begin(w); W.saveWeek(w, s); W.progress(w, { score: 640, results: ['ok'] }); W.saveWeek(w, s);
  w = W.resume(s);   // the page is reloaded mid-shift
  ok(w.day === 1 && w.shifts[0].euros === 64 && w.shifts[0].left === true, 'a shift left mid-way is closed with what it had banked', JSON.stringify(w.shifts[0]));
  ok(W.today(w).name === 'TUESDAY', 'and the week has moved on — the day cannot be replayed');
  w = W.resume(s); ok(w.day === 1 && w.shifts.length === 1, 'opening the page again without starting does not burn a day');
  W.progress(w, { score: 5000, results: ['ok'] }); ok(w.live === null, 'progress before START is not a shift');
}
{ const s = mem(); let w = W.resume(s, seq(0.2)); W.begin(w); W.saveWeek(w, s);
  w = W.resume(s); ok(w.shifts[0].euros === 0 && w.shifts[0].left, 'started and left with nothing is a €0 day, not a free retry'); }

// ── standing belongs to the week ────────────────────────────────────────
{ const s = mem(); const w = W.resume(s, seq(0.3)); const st = W.standingStore(w, s);
  ok(st.getItem('x') === '{}', 'a new week knows no regulars');
  st.setItem('x', JSON.stringify({ kiosk: 2 }));
  ok(W.loadWeek(s).standing.kiosk === 2, 'standing written through the store lands in the save');
  ok(!s.m.has('tokoMoveRegulars'), "and never in the browser's own standing");
  W.clearWeek(s); const w2 = W.resume(s, seq(0.9)); ok(JSON.stringify(w2.standing) === '{}', 'the next week starts from nothing'); }

// ── pace ────────────────────────────────────────────────────────────────
{ const w = W.newWeek(seq(0.4)); W.close(w, { score: 1000 }); const p = W.pace(w);
  ok(p.total === 100 && p.need === W.RENT - 100 && p.perDay === Math.ceil((W.RENT - 100) / 4), 'pace spreads what is left over the days left'); }

// ── the save survives nonsense ──────────────────────────────────────────
{ const s = mem(); s.setItem(W.KEY, '{broken'); ok(W.loadWeek(s) === null, 'a corrupt save reads as no week');
  const w = W.resume(s, seq(0.6)); ok(w.day === 0, 'and a fresh one begins'); }
ok(W.loadWeek(null) === null && W.saveWeek({ shifts: [] }, null), 'no storage at all is survivable');

console.log(`week: ${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
