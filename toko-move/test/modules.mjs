// CARDS MADE FROM MODULES (v3.22, js/modules.js) in bare node:
//   · how many there are: somebody × what they want × the day, thousands
//   · every part has its Finnish, and a made card's line translates part by part
//   · a made card plays like a written one: three buttons, the deck's own
//     effects vocabulary, risks with odds the journey knows
//   · the same key makes the same card; the parts fit the run (place, weather,
//     the hour, its tones), and the third is special or very special as often
//     as TIERS says
//   · a run deals them: about half the slots, the rest of the deck untouched,
//     and a whole shift plays through them in English and in Finnish
//
//   node toko-move/test/modules.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../js/modules.js';
import * as J from '../js/journey.js';
import { ODDS } from '../js/cards.js';
import { RUNS, BY_ID } from '../js/runs.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { moduleLine, FI } from '../js/lang.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// how many
ok(M.variety() > 30000, `the modules make ${M.variety()} cards before the third is drawn`);
ok(Object.keys(M.WHO).length >= 40 && Object.keys(M.WANT).length >= 32 && Object.keys(M.TWIST).length >= 25, 'forty people, thirty-two wants, twenty-five days at least (v3.25)');
const places = w => Object.values(M.WANT).filter(x => x.where === w).length;
ok(places('stop') >= 12 && places('aboard') >= 8 && places('walking') >= 8, `every place has its share: ${places('stop')} at the stop, ${places('aboard')} aboard, ${places('walking')} on foot`);

// every part in both languages
const fiOf = x => typeof x === 'string' && x.trim().length > 0;
ok(Object.values(M.WHO).every(w => fiOf(w.en) && fiOf(w.fi)) && Object.values(M.TWIST).every(w => fiOf(w.en) && fiOf(w.fi)), 'every person and every day has its Finnish');
const allOpts = Object.values(M.WANT).flatMap(w => [...w.opts, ...w.thirds]);
ok(Object.values(M.WANT).every(w => fiOf(w.en) && fiOf(w.fi) && w.opts.length === 2 && w.thirds.length === 3), 'every want: its line in both languages, two options and three thirds');
ok(allOpts.every(o => fiOf(o.label) && fiOf(o.fi) && (o.risk ? fiOf(o.risk.winFi) && fiOf(o.risk.loseFi) && fiOf(o.risk.win.say) && fiOf(o.risk.lose.say) : fiOf(o.say) && fiOf(o.sayFi))), 'every button and what it says, both ways, in Finnish');
ok(Object.values(M.WANT).every(w => !w.thirds[0].tier && w.thirds[1].tier === 'special' && w.thirds[2].tier === 'very'), 'each want has an ordinary third, a special and a very special');

// the deck's own vocabulary
const KEYS = new Set(['label', 'fi', 'say', 'sayFi', 'time', 'pay', 'cash', 'risk', 'tier']);
ok(allOpts.every(o => Object.keys(o).every(k => KEYS.has(k))), 'an option is time, pay, cash, risk and what it says — nothing the journey does not know');
ok(allOpts.every(o => !o.risk || ODDS[o.risk.odds] != null), 'every risk is at odds the journey knows');
ok(allOpts.every(o => (o.time ?? 0) >= 0 && (o.time ?? 0) <= 150 && (!o.pay || (o.pay >= 0.9 && o.pay <= 1.6)) && (!o.cash || Math.abs(o.cash) <= 20)), 'sized like the written cards: at most 150 s, ×0.9–1.6, €20 either way');

// the same key, the same card; a card translates
const a = M.makeCard('42:1', {}), b = M.makeCard('42:1', {});
ok(JSON.stringify(a) === JSON.stringify(b) && a.options.length === 3, `the same key makes the same card (${a.id})`);
ok(moduleLine(a.text) === a.fi[a.text] && a.options.every(o => FI.get(o.label) === a.fi[o.label]), 'its line and its buttons are in the Finnish table');
const lines = new Set(); for (let i = 0; i < 400; i++) lines.add(M.makeCard(`v:${i}`, {}).text);
ok(lines.size > 340, `four hundred draws, ${lines.size} different lines`);
ok([...lines].every(t => moduleLine(t) != null), 'every one of them translates');

// the parts fit the run
const night = Array.from({ length: 300 }, (_, i) => M.makeCard(`n:${i}`, { night: true, tones: { scary: 3, risky: 1 } }));
ok(night.every(c => c && ['scary', 'risky'].includes(c.tone[0]) && !M.WHO[c.module.who].tags.includes('day') && !M.TWIST[c.module.twist].tags.includes('day')), 'a night run: no child in a snowsuit, no market day, only its own tones');
ok(night.some(c => c.module.want === 'night'), 'and the stranger facing the wrong way is only at night');
const snow = Array.from({ length: 300 }, (_, i) => M.makeCard(`s:${i}`, { weather: 'snow' }));
ok(snow.every(c => !M.TWIST[c.module.twist].tags.includes('clear') && c.module.want !== 'sun') && snow.some(c => c.module.want === 'cold'), 'snow: nobody sunbathing, somebody shivering');
const stops = Array.from({ length: 200 }, (_, i) => M.makeCard(`p:${i}`, { places: ['stop'] }));
ok(stops.every(c => c.where === 'stop'), 'a run of stops deals cards at the stop');
ok(M.makeCard('x', { places: ['nowhere'] }) === null, 'and when nothing fits, no card rather than a wrong one');
ok(M.makeCard('y', {}, Object.keys(M.WANT)) === null, 'a want already dealt is not dealt again');
const tiers = { 0: 0, 1: 0, 2: 0 }; for (let i = 0; i < 4000; i++) tiers[M.makeCard(`t:${i}`, {}).module.third]++;
ok(Math.abs(tiers[1] / 40 - M.TIERS.special) < 4 && Math.abs(tiers[2] / 40 - M.TIERS.very) < 3, `the third: special ${(tiers[1] / 40).toFixed(0)}%, very special ${(tiers[2] / 40).toFixed(0)}%`);
const CTX = [{}, { tones: { risky: 1 } }, { night: true, tones: { scary: 1, fun: 1 } }, { weather: 'snow' }], reached = new Set();
for (const ctx of CTX) for (let i = 0; i < 400; i++) reached.add(M.makeCard(`r:${i}`, ctx)?.module.want);
ok(Object.keys(M.WANT).every(w => reached.has(w)), 'every want is reachable, on some run');

// a run deals them
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'))));
let made = 0, dealt = 0, shown = 0, dup = 0;
for (const r of RUNS) for (let seed = 1; seed <= 60; seed++) {
  const s = J.newRun(net, r, seed); dealt += s.deck.length; made += s.deck.filter(d => d.card.module).length;
  const w = s.deck.filter(d => d.card.module).map(d => d.card.module.want); if (new Set(w).size !== w.length) dup++;
  let st = 0; while (s.phase !== 'end' && st++ < 400) { const c = J.card(net, s); if (c.kind === 'story' && String(c.id).startsWith('m:')) { shown++; assert.equal(c.options.length, 3); } J.choose(net, s, st % 3); }
  assert.equal(s.phase, 'end', `${r.id} seed ${seed} ends`);
}
ok(made / dealt > 0.35 && made / dealt < 0.65, `about half the deck is made: ${made} of ${dealt}`);
ok(dup === 0 && shown > 100, `no want twice in a deck, and ${shown} made cards played through to the end of the shift`);
const off = J.newRun(net, { ...BY_ID.medium, modules: 0 }, 7), on = J.newRun(net, BY_ID.medium, 7);
ok(off.deck.every(d => !d.card.module) && off.rng === on.rng && off.deck.every((d, i) => on.deck[i].card.module || on.deck[i].card.id === d.card.id), 'the written deck underneath is untouched: same rng, same cards where nothing was made');
console.log(`modules: ${n} checks passed`);
