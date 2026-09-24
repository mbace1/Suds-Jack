// THE KIT's rules in bare node (js/kit.js, and the nights in js/week.js):
// three offers of what you do not have, seeded, saved once, taken once, and
// each item bending exactly the one lever it names.
//
//   node toko-move/test/kit.mjs
import * as K from '../js/kit.js';
import * as W from '../js/week.js';

let pass = 0, fail = 0;
const ok = (c, m, x = '') => { if (c) pass++; else { fail++; console.log(`  FAIL ${m}${x ? ' — ' + x : ''}`); } };

// ── the catalogue ───────────────────────────────────────────────────────
ok(K.KIT.length >= 6 && new Set(K.KIT.map(k => k.id)).size === K.KIT.length, `${K.KIT.length} items, ids unique`);
ok(K.KIT.every(k => k.glyph && k.name && k.line && Object.keys(k.fx).length === 1), 'every item has a face, a line, and bends ONE lever');
const levers = new Set(K.KIT.map(k => Object.keys(k.fx)[0])); ok(levers.size === K.KIT.length, 'and no two items bend the same lever');

// ── offers ──────────────────────────────────────────────────────────────
ok(JSON.stringify(K.offers(5, 1)) === JSON.stringify(K.offers(5, 1)), 'the same night of the same week offers the same three');
ok(K.offers(5, 1).length === 3 && new Set(K.offers(5, 1)).size === 3, 'three different things');
ok(K.offers(5, 2, ['bag', 'app']).every(id => !['bag', 'app'].includes(id)), 'never something already owned');
ok(K.offers(5, 4, ['bag', 'thermos', 'dispatch', 'cards']).length === 2, 'and fewer than three only when fewer are left');
const firsts = {}; for (let s = 1; s <= 600; s++) for (const id of K.offers(s, 1)) firsts[id] = (firsts[id] || 0) + 1;
ok(Object.keys(firsts).length === K.KIT.length && Math.min(...Object.values(firsts)) > 200, `every item turns up (${JSON.stringify(firsts)})`);

// ── effects ─────────────────────────────────────────────────────────────
const none = K.effects([]);
ok(none.capacity === null && none.walk === 1 && none.fresh === 1 && none.limit === 1 && none.known === 0 && none.streak === null && none.drops === 1, 'no kit bends nothing');
for (const k of K.KIT) { const fx = K.effects([k.id]), lever = Object.keys(k.fx)[0];
  const moved = Object.keys(none).filter(key => JSON.stringify(fx[key]) !== JSON.stringify(none[key]));
  ok(moved.length === 1 && moved[0] === lever, `${k.id} moves ${lever} and nothing else`, moved.join()); }
ok(K.effects(['bag', 'nonsense']).capacity === 6, 'an unknown id is ignored, not trusted');
ok(JSON.stringify(K.parse('app, bag,x')) === '["app","bag"]', '?kit= parses to known ids only');

// ── nights in the week ──────────────────────────────────────────────────
{ const w = W.newWeek(() => 0.5);
  ok(W.night(w) === null, 'no offer before Monday is played');
  W.close(w, { score: 900 }); const n = W.night(w);
  ok(n && n.offers.length === 3 && !n.pick && W.pending(w), 'Monday night offers three, not yet taken');
  ok(JSON.stringify(W.night(w).offers) === JSON.stringify(n.offers), 'asking again shows the same three — the offer is saved');
  ok(!W.choose(w, K.KIT.map(k => k.id).find(id => !n.offers.includes(id))), 'an item that was not offered cannot be taken');
  ok(W.choose(w, n.offers[1]) && W.owned(w)[0] === n.offers[1] && !W.pending(w), 'one of the three is taken and kept');
  ok(!W.choose(w, n.offers[0]), 'and only one a night');
  W.close(w, { score: 900 }); const n2 = W.night(w);
  ok(!n2.offers.includes(W.owned(w)[0]), "Tuesday night does not offer Monday's pick again");
  const old = { seed: 3, day: 1, days: W.weekDays(3), shifts: [{}], standing: {} };
  ok(W.night(old)?.offers.length === 3 && Array.isArray(old.kit), 'a week saved before kit existed gets its nights when asked'); }

// ── each lever, in the engine's own arithmetic ─────────────────────────
// The same job, with and without the item, on a fake network — deliveries.js
// is where every lever lives, and arithmetic does not need a browser.
{ const { DeliveryChallenge } = await import('../js/deliveries.js');
  const { REGULARS } = await import('../js/regulars.js');
  const NODES = ['lasipalatsi', 'ooppera', 'hakaniemi', 'meilahti', 'arabia', 'kauppatori', 'rautatientori', 'kamppi', 'pasila', REGULARS[0].at];
  const mk = ids => { const flow = { clock: { tick: 0, ticksPerDay: 3000 }, graph: { node: id => NODES.includes(id) ? { id, name: id, x: NODES.indexOf(id) * 10, y: 0 } : null }, routes: { list: [] } };
    const ch = new DeliveryChallenge(flow, () => {}); ch.estimate = () => 200; ch.standing = {}; ch.kit = K.effects(ids); return ch; };
  const job = (cargo, extra = {}) => ({ stops: ['kamppi', 'pasila'], cargo, limit: 200, value: 200, ...extra });
  ok(mk([]).capacity() === 5 && mk(['bag']).capacity() === 6, 'the bag: room for 5 becomes room for 6');
  const d0 = mk([]).deadlineFor({ from: 'kamppi', to: 'pasila', cargo: 'parts', dist: 3 }), d1 = mk(['dispatch']).deadlineFor({ from: 'kamppi', to: 'pasila', cargo: 'parts', dist: 3 });
  ok(Math.abs(d1 / d0 - 1.15) < 0.01, `the dispatcher: a deadline of ${d0} becomes ${d1}`);
  // hot food at 90% of its limit: past the fresh window (60%) without a thermos, inside it with one
  const h0 = mk([]).earn(job('hot food'), 180), h1 = mk(['thermos']).earn(job('hot food'), 180);
  ok(/COOLED/.test(h0.note) && /FRESH/.test(h1.note) && h1.earned > h0.earned, `the thermos: hot food at 90% of its time is ${h0.note} (${h0.earned}) without, ${h1.note} (${h1.earned}) with`);
  const h2 = mk(['thermos']).earn(job('hot food'), 201); ok(/LATE/.test(h2.note), 'and late is still late');
  const reg = REGULARS[0].at, tipJob = job('parts', { stops: ['kamppi', reg] });
  const a = mk([]).earn(tipJob, 50).tip, b = mk(['cards']).earn(tipJob, 50).tip;
  ok(a === 0 && b > 0, `business cards: a regular you have never met tips ${a} without, ${b} with`);
  { const t = mk(['cards']); t.standing[REGULARS[0].id] = 4; ok(t.standingFor(REGULARS[0].id) === 4, 'and cards never LOWER a standing you earned'); }
  const n0 = mk([]), n1 = mk(['name']); n0.streak = n1.streak = 3;
  ok(n0.streakMult() === 1.5 && Math.abs(n1.streakMult() - 1.8) < 1e-9, `a good name: the third on-time job is ×${n0.streakMult()} without, ×${n1.streakMult()} with`);
  ok(mk([]).dropPay(100) === 100 && mk(['app']).dropPay(100) === 150, 'a courier app: a drop worth 100 pays 150');
  ok(mk(['bag']).earn(job('parts'), 50).earned === mk([]).earn(job('parts'), 50).earned, "the bag touches no fee — it is room, and room is the drops you can say yes to"); }

console.log(`kit: ${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
