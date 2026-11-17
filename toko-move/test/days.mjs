// THE DAY, DRAWN (v3.23, js/days.js) in bare node:
//   · every day is drawn as often as its weight says, and only where it fits
//     (a heatwave in the sun, the first snow in snow, a full moon at night)
//   · an ordinary day is the shift exactly as it was before days existed
//   · each lever lands: the fee, the clock, the tip, the luck, the walk, the wait
//   · the boost brings its cards out (a festival brings out the accordion)
//   · the shift's first card carries the day, and only the first; in Finnish too
//   · a mission is its own day; the same seed is the same day
//
//   node toko-move/test/days.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../js/days.js';
import * as J from '../js/journey.js';
import { RUNS, BY_ID } from '../js/runs.js';
import { MISSIONS, missionRun } from '../js/missions.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';
import { FI } from '../js/lang.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json', import.meta.url), 'utf8'))));

// the draw
const LEVERS = new Set(['name', 'fx', 'weight', 'fee', 'deadline', 'tip', 'luck', 'walk', 'wait', 'boost', 'skies', 'night']);
ok(Object.values(D.DAYS).every(d => Object.keys(d).every(k => LEVERS.has(k))), 'a day is the levers the run already has, and nothing else');
ok(Object.entries(D.DAYS).every(([id, d]) => id === 'ordinary' ? !d.name && !d.fx.length : d.name && d.fx.length === 2), 'every day but the ordinary one has a name and says two things about itself');
const tally = {}; for (let i = 0; i < 6000; i++) { const id = D.dayFor(i, {}); tally[id] = (tally[id] || 0) + 1; }
const fitting = Object.keys(D.DAYS).filter(id => D.fits(id, {})), w = fitting.reduce((a, id) => a + D.DAYS[id].weight, 0);
ok(fitting.every(id => Math.abs(tally[id] / 6000 - D.DAYS[id].weight / w) < 0.025), `drawn as often as their weights say (ordinary ${Math.round(100 * tally.ordinary / 6000)}%)`);
const rainy = new Set(Array.from({ length: 800 }, (_, i) => D.dayFor(i, { weather: 'rain' })));
ok(tally.heatwave && !tally.firstsnow && !tally.fullmoon && !rainy.has('heatwave'), 'a day that asks for a weather or the night is not drawn without it');
const snowy = new Set(Array.from({ length: 800 }, (_, i) => D.dayFor(i, { weather: 'snow' }))), night = new Set(Array.from({ length: 800 }, (_, i) => D.dayFor(i, { night: true })));
ok(snowy.has('firstsnow') && !snowy.has('heatwave') && night.has('fullmoon'), 'the first snow in snow, a full moon at night');
ok(D.dayFor(77, {}) === D.dayFor(77, {}) && D.dayLine('ordinary') === null && D.dayLine('payday') === 'Payday · fees ×1.15 · everyone wants it now', `the same seed is the same day; the line reads "${D.dayLine('payday')}"`);
ok(Object.values(D.DAYS).filter(d => d.name).every(d => FI.has(d.name) && d.fx.every(f => FI.has(f))), 'every day, and everything it says, in Finnish');

// an ordinary day is the shift as it was
const play = (run, seed) => { const s = J.newRun(net, run, seed); let st = 0; while (s.phase !== 'end' && st++ < 400) { J.card(net, s); J.choose(net, s, st % 3); } return s; };
const seedOf = (run, day, area) => { for (let k = 1; k < 4000; k++) { const s = J.newRun(net, run, k); if (s.day === day && (area === undefined || s.area === area)) return k; } };
// a shift that draws nothing — an ordinary day, leaning nowhere, and no perks
// to draft — plays exactly as one with nothing drawn at all
for (const r of RUNS) { const q = { ...r, perks: false }, k = seedOf(q, 'ordinary', null), a = play(q, k), b = play({ ...q, days: false }, k);
  assert.equal(JSON.stringify([a.score, a.done, a.late, a.clock, a.log.length]), JSON.stringify([b.score, b.done, b.late, b.clock, b.log.length])); }
ok(true, 'an ordinary day, leaning nowhere, plays exactly as a shift with nothing drawn, on every run');

// each lever lands
const pair = (day, run = BY_ID.medium) => { const k = seedOf(run, day); return [J.newRun(net, run, k), J.newRun(net, { ...run, days: false }, k)]; };
{ const [a, b] = pair('payday'); ok(a.offer.fee === Math.round(b.offer.fee * 1.15) || Math.abs(a.offer.fee - b.offer.fee * 1.15) <= 1, `payday: the fee ×1.15 (€${b.offer.fee} → €${a.offer.fee})`);
  ok(Math.abs(a.mods.deadline - 0.92) < 1e-9, 'and every clock is shorter'); }
{ const [a, b] = pair('festival'); ok(a.mods.tip === 2 && Math.abs(a.run.headway - b.run.headway * 1.15) < 1e-9, 'the festival: €2 on every drop, trams a sixth fuller'); }
{ const [a, b] = pair('sunday'); ok(a.offer.fee <= b.offer.fee && Math.abs(a.mods.deadline - 1.1) < 1e-9, 'a quiet Sunday: less paid, more time'); }
{ const run = BY_ID.medium, k = seedOf(run, 'heatwave'); if (k) { const a = J.newRun(net, run, k), b = J.newRun(net, { ...run, days: false }, k);
  ok(a.weather === 'clear' && a.run.walkFactor > b.run.walkFactor && a.mods.tip === 1, 'a heatwave: only in the sun, walking slower, a euro more a drop'); } }
{ const run = BY_ID.night, k = seedOf(run, 'fullmoon'), a = J.newRun(net, run, k); ok(Math.abs(a.mods.luck + 0.05) < 1e-9, 'a full moon: the odds a little worse'); }

// the boost
const wants = (day, want) => { let m = 0, all = 0; for (let k = 1; k < 3000; k++) { const s = J.newRun(net, BY_ID.medium, k); if (s.day !== day) continue;
  for (const d of s.deck) if (d.card.module) { all++; if (d.card.module.want === want) m++; } } return all ? m / all : 0; };
const fest = wants('festival', 'music'), plain = wants('ordinary', 'music');
ok(fest > plain * 2, `a festival brings out the accordion (${Math.round(100 * fest)}% of made cards against ${Math.round(100 * plain)}%)`);

// the first card, and only the first
{ const run = BY_ID.medium, k = seedOf(run, 'derby'), s = J.newRun(net, run, k), c = J.card(net, s);
  ok(c.at === D.dayLine('derby') && c.day === 'derby', `the first card carries the day: "${c.at}"`);
  let later = 0, st = 0; while (s.phase !== 'end' && st++ < 400) { const x = J.card(net, s); if (st > 1 && x.day) later++; J.choose(net, s, 0); }
  ok(later === 0, 'and no card after it'); }
ok(!J.card(net, J.newRun(net, BY_ID.medium, seedOf(BY_ID.medium, 'ordinary', null))).at, 'an ordinary day, leaning nowhere, says nothing');

// a mission is its own day
ok(MISSIONS.every(m => J.newRun(net, missionRun(BY_ID.easy, m), 5).day === 'ordinary'), 'a mission is its own day');

// ── v3.24: the area and the perks ────────────────────────────────────────
import { PERKS, PERK_ORDER } from '../js/missions.js';
const areas = {}; for (let i = 0; i < 4000; i++) { const a = D.areaFor(i); areas[a] = (areas[a] || 0) + 1; }
ok(Math.abs(areas.null / 4000 - (1 - D.AREA_SHARE)) < 0.03 && Object.keys(D.AREAS).every(a => areas[a] > 300), `two in five shifts lean nowhere (${Math.round(100 * areas.null / 4000)}%), the rest to one of ${Object.keys(D.AREAS).length} parts of the city`);
ok(Object.values(D.AREAS).every(a => a.stops.every(id => net.nodes.has(id)) && FI.has(a.line)), 'every area is real stops, and says so in Finnish');
{ const run = BY_ID.hard, k = seedOf(run, 'ordinary', 'harbour'), tally = { harbour: [0, 0], none: [0, 0] };
  for (let j = 1; j <= 1500; j++) { const s = J.newRun(net, run, j), key = s.area === 'harbour' ? 'harbour' : s.area === null ? 'none' : null; if (!key) continue;
    let st = 0; while (s.phase !== 'end' && st++ < 400) { const c = J.card(net, s); if (c.state === 'dispatch' && s.offer) { tally[key][1]++; if (D.AREAS.harbour.stops.includes(s.offer.to)) tally[key][0]++; } J.choose(net, s, 0); } }
  const [inA, allA] = tally.harbour, [inN, allN] = tally.none;
  ok(inA / allA > 1.6 * inN / allN, `a shift leaning to the harbour sends you there more (${Math.round(100 * inA / allA)}% of jobs against ${Math.round(100 * inN / allN)}%)`);
  const c = J.card(net, J.newRun(net, run, k)); ok(c.at === 'drops around the harbour' && c.area === 'harbour', `and the first card says so: "${c.at}"`); }
{ const run = BY_ID.medium, k = seedOf(run, 'payday'), s = J.newRun(net, run, k), c = J.card(net, s);
  ok(c.at.startsWith('Payday · fees ×1.15 · everyone wants it now') && (!s.area || c.at.endsWith(D.AREAS[s.area].line)), `a day and an area share the line: "${c.at}"`); }
const TRADE = Object.keys(PERKS).filter(p => PERKS[p].drawn);
ok(TRADE.length === 6 && TRADE.every(p => FI.has(PERKS[p].name) && FI.has(PERKS[p].line)) && !TRADE.some(p => PERK_ORDER.includes(p)), 'six trade-offs, never unlocked by a mission, only drawn; in Finnish too');
{ const pairs = new Set(), drawnAll = new Set(); for (let k = 1; k <= 300; k++) { const s = J.newRun(net, BY_ID.easy, k); pairs.add(s.perksToday.join()); s.perksToday.forEach(p => drawnAll.add(p));
    assert.ok(s.perksToday.length === 2 && s.perksToday.every(p => !PERK_ORDER.slice(0, 3).includes(p))); }
  ok(pairs.size > 15 && TRADE.every(p => drawnAll.has(p)), `every shift draws two perks it has not unlocked (${pairs.size} different pairs in 300 shifts; every trade-off comes up)`); }
{ let thirds = 0, offers = 0, cash = 0;
  for (let k = 1; k <= 60; k++) { const s = J.newRun(net, BY_ID.hard, k); let st = 0;
    while (s.phase !== 'end' && st++ < 400) { const c = J.card(net, s);
      if (c.kind === 'perk') { offers++; const t = c.options[2]; assert.equal(c.options.length, 3); assert.ok(!c.options.slice(0, 2).some(o => s.perksToday.includes(o.perk)), 'the two regular buttons are the unlocked pool');
        if (t.perk) { assert.ok(s.perksToday.includes(t.perk) && t.tier === 'special' && !s.perks.includes(t.perk)); thirds++; } else cash++; }
      J.choose(net, s, c.kind === 'perk' ? 2 : st % 3); } }
  ok(thirds > 0 && cash > 0, `the draft's third button is the shift's drawn perk, as a special, while one is left (${thirds} of ${offers}; then the cash, ${cash})`); }
{ const s = J.newRun(net, BY_ID.medium, 9), f = s.dayFee, d = s.mods.deadline; PERKS.hustle.apply(s);
  ok(Math.abs(s.dayFee - f * 1.25) < 1e-9 && Math.abs(s.mods.deadline - d * 0.85) < 1e-9, 'Hustle gives the fee and takes the clock'); }
ok(MISSIONS.every(m => { const s = J.newRun(net, missionRun(BY_ID.easy, m), 5); return !s.area && !s.perksToday.length; }), 'a mission draws nothing: its drops and its perks are written');
console.log(`days: ${n} checks passed`);
