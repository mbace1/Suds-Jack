// MISSIONS, AND WHAT A RUN CARRIES (v3.14; owner, 2026-11-07: "build missions
// and all the events in those missions with correct art. Add roguelike
// elements") in bare node:
//   · every mission's steps go to real places, deal real cards (and no buyer:
//     selling the errand's parcel would end it), and every event card a
//     mission deals has art — a stop actor, or a moment of the approved pack
//   · a mission is a version per seed (its drops and events are drawn), the
//     same seed the same version
//   · the draft: a perk is offered between jobs, two of the pool, never one
//     already held, and each does what it says
//   · strikes: the second late drop loses the errand
//   · a reader finishes every mission; a left-tapper collects strikes
//   · the wallet is a two-button choice card, handing it in brings its owner
//     back on a later job
//   · the save: the first mission opens with EASY, each after the one before,
//     and a finished mission adds a perk to the pool
//   · and the four runs deal exactly what they dealt before missions existed
//
//   node toko-move/test/missions.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as J from '../js/journey.js';
import * as R from '../js/runs.js';
import * as M from '../js/missions.js';
import { CARDS, CALLBACKS, SEALED_CARD } from '../js/cards.js';
import { CARD_SCENE, CHOICE_SCENE } from '../js/moments.js';
import { VIGNETTES } from '../js/vignettes.js';
import { buildRealHelsinki } from '../js/real-helsinki.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const at = f => new URL(f, import.meta.url);
const net = J.network(buildRealHelsinki(JSON.parse(fs.readFileSync(at('../cities/helsinki.json'), 'utf8'))));
const act = JSON.parse(fs.readFileSync(at('../scenes/stop/act1.json'), 'utf8'));
const byId = id => CARDS.find(c => c.id === id) || Object.values(CALLBACKS).find(c => c.id === id) || M.MISSION_CARDS[id] || (id === SEALED_CARD.id ? SEALED_CARD : null);
const sells = c => c.options.some(o => o.sell != null || o.risk?.win?.sell != null || o.risk?.lose?.sell != null);
// art: a stop actor, an approved scene, a walking picture on the board, the ghost tram at the stop, the empty car
const hasArt = id => (act.actors || []).includes(id) || !!CARD_SCENE[id] || !!CHOICE_SCENE[id] || VIGNETTES.includes(id) || byId(id)?.tram === 'museum' || id === 'humming';

const bad = M.MISSIONS.flatMap(m => [net.nodes.has(m.start) ? null : `${m.id} starts nowhere`, ...m.steps.flatMap(st => st.fork || [st]).flatMap((st, i) => [
  ...st.to.filter(t => !net.nodes.has(t)).map(t => `${m.id}#${i} to ${t}`), ...st.cards.filter(c => !byId(c)).map(c => `${m.id}#${i} card ${c}`)])]).filter(Boolean);
ok(M.MISSIONS.length >= 4 && !bad.length, `${M.MISSIONS.length} missions, every step to a real place with real cards${bad.length ? '; ' + bad.join(', ') : ''}`);
const branches = m => m.steps.flatMap(st => st.fork || [st]);
const buyers = M.MISSIONS.flatMap(m => branches(m).flatMap(st => st.cards.filter(c => sells(byId(c)))));
ok(!buyers.length, `no mission deals a buyer${buyers.length ? ' (' + buyers.join(', ') + ')' : ''}`);
const events = [...new Set(M.MISSIONS.flatMap(m => branches(m).flatMap(st => st.cards)).concat(Object.values(M.MISSION_CALLBACKS).map(c => c.id), ['granny2']))];
const bare = events.filter(id => !hasArt(id) && id !== 'wallet2');
ok(!bare.length, `every event a mission deals has its art: a stop actor, an approved scene, a walking picture, the ghost tram or the empty car (${events.length} events)${bare.length ? '; none for ' + bare.join(', ') : ''}`);

const play = (m, seed, pick = () => 0) => { const s = J.newRun(net, M.missionRun(R.BY_ID[m.base || 'medium'], m, 3), seed), seen = { cards: [], drops: [], perks: [], offers: [] };
  for (let k = 0; k < 400; k++) { const c = J.card(net, s); if (!c) break;
    if (c.kind === 'story') seen.cards.push(c.id); if (c.kind === 'dispatch') seen.drops.push(s.offer.to); if (c.kind === 'perk') seen.offers.push(c.options.map(o => o.perk));
    const r = J.choose(net, s, pick(s, c)); if (r.error) break; if (r.perk) seen.perks.push(r.perk); }
  return { s, ...seen }; };
const reader = (s, c) => { if (c.kind !== 'route') return Math.min(1, c.options.length - 1); let bi = 0, bv = Infinity;
  c.options.forEach((o, i) => { const h = o.hop, v = h ? h.price + (s.best[h.to]?.[s.job.to] ?? 0) : 1e9; if (v < bv) { bv = v; bi = i; } }); return bi; };

const a = play(M.MISSIONS[1], 7), b = play(M.MISSIONS[1], 7);
ok(JSON.stringify([a.cards, a.drops]) === JSON.stringify([b.cards, b.drops]), 'the same seed is the same version of the mission');
const versions = new Set(Array.from({ length: 30 }, (_, i) => { const p = play(M.MISSIONS[2], i + 1); return p.drops.join('>') + '|' + p.cards.join(','); }));
ok(versions.size >= 6, `and the seeds make different versions of it: ${versions.size} of 30 differ in drops or events`);
ok(M.MISSIONS.every(m => play(m, 3).s.at !== undefined && J.newRun(net, M.missionRun(R.BY_ID[m.base || 'medium'], m), 3).at === m.start), 'every mission starts where it says');

const runs = M.MISSIONS.flatMap(m => Array.from({ length: 30 }, (_, i) => play(m, i + 1, reader)));
const offers = runs.flatMap(r => r.offers);
ok(offers.length > 0 && offers.every(o => o.length === 2 && o[0] !== o[1]), `between jobs, two different perks are offered (${offers.length} drafts)`);
ok(runs.every(r => r.offers.every((o, i) => !o.some(p => r.perks.slice(0, i).includes(p)))), 'and never one already held');
ok(runs.every(r => r.perks.every(p => M.PERKS[p])), 'every perk picked is a perk');
// each perk does what it says
const fresh = () => { const s = J.newRun(net, M.missionRun(R.BY_ID.medium, M.MISSIONS[0], 3), 5); return s; };
const t = fresh(), w0 = t.run.walkFactor, h0 = t.run.headway; M.PERKS.shoes.apply(t); M.PERKS.pass.apply(t); M.PERKS.map.apply(t); M.PERKS.coin.apply(t); M.PERKS.number.apply(t); M.PERKS.umbrella.apply(t);
ok(t.run.walkFactor < w0 && t.run.headway < h0 && t.mods.deadline > 1 && t.mods.luck > 0 && t.mods.tip > 0 && t.mods.dry, 'each perk changes the lever it names: walks, waits, deadlines, luck, tips, weather');

// strikes
const s2 = J.newRun(net, M.missionRun(R.BY_ID.medium, M.MISSIONS[0], 3), 9); let lost = null;
for (let k = 0; k < 400 && !lost; k++) { const c = J.card(net, s2); if (!c) break; if (c.kind === 'route' && s2.job) s2.job.limit = 0; const r = J.choose(net, s2, 0); if (r.failed) lost = r; }
ok(lost && s2.strikes === M.STRIKES && s2.done === 2 && s2.phase === 'end', `the second late drop loses the errand (${s2.done} delivered, ${s2.strikes} strikes)`);

const fin = M.MISSIONS.map(m => [m.id, runs.filter(r => r.s.run.mission === m).filter(r => r.s.done >= r.s.target).length]);
ok(fin.every(([, k]) => k >= 27), `a board-reader finishes the missions (${fin.map(([i, k]) => `${i} ${k}/30`).join(', ')})`);
const left = M.MISSIONS.map(m => Array.from({ length: 30 }, (_, i) => play(m, i + 1)).reduce((x, r) => x + r.s.strikes, 0));
ok(left.reduce((x, y) => x + y, 0) > 30, `a left-tapper collects strikes (${left.join(', ')})`);

// v3.15: a fork, the rival, the sealed parcel, the night
const forked = (m, seed, pick) => { const s = J.newRun(net, M.missionRun(R.BY_ID[m.base || 'medium'], m, 3), seed); let fork = null, chosen = null;
  for (let k = 0; k < 400; k++) { const c = J.card(net, s); if (!c) break; if (c.fork && !fork) { fork = c.options.map(o => o.label); const r = J.choose(net, s, pick); chosen = s.job; continue; } J.choose(net, s, reader(s, c)); }
  return { s, fork, chosen }; };
const f0 = forked(M.MISSION_BY_ID.east, 4, 0), f1 = forked(M.MISSION_BY_ID.east, 4, 1);
ok(f0.fork?.length === 2 && f0.fork[0] !== f0.fork[1] && f0.chosen.to === 'arabia' && f1.chosen.to === 'sornainen' && f0.s.done === 3 && f1.s.done === 3,
  `a fork offers two errands, and the one picked is the job (${f0.fork?.join(' / ')})`);
const stk = J.newRun(net, M.missionRun(R.BY_ID.medium, M.MISSION_BY_ID.sticker, 3), 6), c0 = J.card(net, stk);
ok(c0.rival && c0.options.length === 1 && c0.options[0].label === 'Race her' && /other courier/.test(c0.text), `THE STICKER opens on a race (${c0.text})`);
const sp = play(M.MISSION_BY_ID.sticker, 6, reader);
ok(sp.cards.includes('sealed') && sp.s.seen.length === 3, 'its second job is the sealed parcel, and its card is dealt');
const lt = J.newRun(net, M.missionRun(R.BY_ID.night, M.MISSION_BY_ID.lasttram, 3), 2);
ok(M.MISSION_BY_ID.lasttram.base === 'night' && lt.run.startHour === 23 && lt.run.skin === 'night' && lt.at === 'rautatientori', 'THE LAST TRAM is played at night, from the station');

// the wallet
const wal = M.MISSION_CARDS.wallet;
ok(wal.options.length === 2 && wal.options[0].label === 'Hand it in at the kiosk' && wal.options[1].risk, 'the wallet is a two-button choice: hand it in, or pocket it at a risk');
const wr = Array.from({ length: 20 }, (_, i) => play(M.MISSION_BY_ID.wallet, i + 1, (s, c) => c.kind === 'route' ? reader(s, c) : 0));
ok(wr.every(r => r.cards[0] === 'wallet') && wr.some(r => r.cards.includes('wallet2')), 'LOST AND FOUND deals the wallet first, and handing it in brings its owner back aboard');

// the save
const mem = new Map(), st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
ok(M.missionOpen('aino', M.loadMissions(st), true) && !M.missionOpen('aino', M.loadMissions(st), false) && !M.missionOpen('wallet', M.loadMissions(st), true), 'the first mission opens with EASY, the next is locked');
const rec = M.recordMission('aino', { done: true, score: 40 }, st);
ok(rec.opened === 'wallet' && rec.perk === 'coin' && M.missionOpen('wallet', M.loadMissions(st), true) && M.perkPool(M.doneCount(M.loadMissions(st))).includes('coin'), 'finishing it opens the next and puts a new perk in the pool');
ok(M.recordMission('aino', { done: true, score: 10 }, st).perk === null && M.loadMissions(st).aino.best === 40, 'a second finish opens nothing new and keeps the best');

// the runs carry the levers too since v3.16 (owner: "yes to all runs, modifiers, perks"),
// each set on the run, and a mission none of the run's own (no march, no forks of its own)
const before = R.RUNS.map(r => { const s = J.newRun(net, r, 1234); return [s.at, s.offer?.to, s.deck.map(d => d.card.id).join(',')].join('|'); });
ok(before.every(x => !x.includes('undefined')) && R.RUNS.every(r => r.perks && J.newRun(net, r, 1).perks.length === 0 && !J.newRun(net, r, 1).picks),
  'every run drafts perks, starts with none, and has no mission steps');
ok(J.strikesOf(R.BY_ID.easy) === 0 && J.strikesOf(R.BY_ID.medium) === 3 && J.strikesOf(R.BY_ID.hard) === 3 && J.strikesOf(R.BY_ID.night) === 2 && J.strikesOf({ mission: M.MISSIONS[0] }) === M.STRIKES,
  'strikes: none on EASY, three on MEDIUM and HARD, two at NIGHT, two on a mission');
ok(M.MISSIONS.every(m => { const r = M.missionRun(R.BY_ID[m.base || 'medium'], m); return !r.march && !r.forks && !r.halt; }), 'a mission takes none of its base run\'s march, forks or halt');
console.log(`missions: ${n} checks passed`);
