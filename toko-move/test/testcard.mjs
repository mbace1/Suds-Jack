// The test card's rules, in bare node (v2.61): a mission ticks once, a build's
// list is its own, and the card says how far you are.
import assert from 'node:assert';
import * as T from '../js/testcard.js';
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const s = mem(), st = T.load(s);
ok(st.build === T.MISSIONS.build && T.count(st) === 0, 'a fresh card has nothing tried');
ok(T.tick(st, 'quiet') === true && T.tick(st, 'quiet') === false, 'a mission ticks once, and only the first time says so');
ok(T.tick(st, 'nonsense') === false, 'a mission the build does not list cannot tick');
T.save(st, s); ok(T.count(T.load(s)) === 1, 'ticks survive a reload');
const next = { ...T.MISSIONS, build: '9.99' };
ok(T.count(T.load(s, next), next) === 0, 'a new build is a new list — old ticks do not carry over');
for (const x of T.MISSIONS.items) T.tick(st, x.id);
ok(T.complete(st) && /ALL 5 · THANK YOU/.test(T.cardHtml(st)), 'all five done reads as a thank-you');
ok(T.MISSIONS.items.every(x => x.href) && T.MISSIONS.items.at(-1).href === '../#tokomove/feedback', 'every mission has a way in; the last opens the arcade note for this cabinet');
console.log(`testcard: ${checks} checks passed`);
