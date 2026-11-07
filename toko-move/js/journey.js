// Toko Move v3 — THE JOURNEY (owner, 2026-11-02: "more of the new design,
// less of the old map with visible trams on a realistic schedule … less actual
// schedule, more curated narrative roguelike with fun choices and minimalistic
// visuals"). Signed off as: turn-based card hops, the illustrated scenes as the
// main view with the board between moments, and a slim job strip.
//
// A run is a shift of jobs and a clock. Every step is ONE card (the art bible's
// grammar: a Toko face, one line, two buttons priced in seconds):
//   · DISPATCH  "Documents for Kamppi." — take it, or ask for another
//   · THE STOP  where to go from here: "4 to Lasipalatsi · +360 s" or
//               "Walk to Kamppi · +540 s". The price is THIS hop's, so the
//               choice is where it leaves you, read off the board — the
//               cheaper hop is not always the better one
//   · A STORY   Act 1's deck (cards.js): Helsinki, funny, and since v3.1
//               RISKY — a button can carry stakes, the odds as a word
//   · A HALT    on HARD, a family stops; route round it or wait it out
// The clock moves only by the prices you pick, so nothing happens while you
// think. The network is REAL — 23 named places, the 33 line variants HSL runs
// between them, the walks between neighbours — and the times are PLAUSIBLE
// (distance on the line at a tram's or a metro's pace, a wait drawn from the
// line's headway), never a timetable: "occasionally you should feel like the
// trams have some realism".
//
// Since v3.1 (ACT1.md, signed off 2026-11-03) a job pays a FEE in euros, and
// what happens to it multiplies it; the shift has a WEATHER (snow is slow
// walking and full trams, rain is wet paper); a buyer can take the parcel off
// your hands for big money and the job with it; every parcel has CONTENTS,
// named by a buyer, by the rain, or by the drop.
//
// Pure: no DOM, no clock, deterministic from a seed (one integer of rng state),
// which is what lets test/journey.mjs play hundreds of runs in bare node.
import { CARDS, CONTENTS, TRAMS, ODDS, SLIPS, SOAKS, CALLBACKS, ARCS, SEALED_CARD } from './cards.js?v=3';
import { regularAt, standingOf, tipFor, MAX_STANDING } from './regulars.js?v=4';
import { haltFamily, haltMinutes } from './mutators.js?v=2';
import { payFor } from './parcels.js?v=1';
import { lineFamily } from './board.js?v=8';
import { CARGO } from './deliveries.js?v=28';
import { MISSION_CARDS, MISSION_CALLBACKS, PERKS, STRIKES } from './missions.js?v=1';

export const SHIFT_SECONDS = 75 * 60;            // 07:00–08:15, or 23:00–00:15
export const SPEED_KMH = { tram: 14, metro: 34, walk: 4.8 };
export const HEADWAY_MIN = { tram: 7.5, metro: 4 };
export const ROUTE_FACTOR = 1.25;                // track is longer than the crow flies
export const DWELL_S = 20;                       // a stop, door to door
export const WALK_KM = 1.3;                      // the furthest walk a card offers
export const GRACE = 1.35;                       // a deadline is the best route × this × the run's own
export const REROLL_S = 60;                      // "Ask for another"
export const STUCK_S = 300;                      // "Wait for the next one"
// The weather a shift is dealt (runs.js `skies`): walks and the wait for a tram.
export const WEATHER = { clear: { walk: 1, wait: 1 }, rain: { walk: 1.1, wait: 1 }, snow: { walk: 1.4, wait: 1.3 }, fog: { walk: 1.2, wait: 1 } };
// The fee (ACT1.md §2): €8 plus about €1.10 a minute of the best route, times
// the parcel's size pay; a streak adds a quarter a job up to ×2; late halves it.
export function feeOf(job) { return Math.round((8 + (job.best / 60) * 1.1) * payFor(job.cargo)); }
const PAPER = new Set(['documents', 'express']);
export const SALE_TRUST = 0.85;

// ── the network ───────────────────────────────────────────────────────────
const RAD = Math.PI / 180;
export function km(a, b) { const dLat = (b.lat - a.lat) * RAD, dLon = (b.lon - a.lon) * RAD, la = a.lat * RAD, lb = b.lat * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLon / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); }

export function network(city) {
  const nodes = new Map(city.nodes.map(n => [n.id, { id: n.id, name: n.name, lat: n.lat, lon: n.lon, tags: n.tags || [] }]));
  const lines = city.lines.filter(l => l.nodes?.length >= 2 && l.nodes.every(id => nodes.has(id)))
    .map(l => ({ id: l.id, label: l.label, mode: l.mode === 'metro' ? 'metro' : 'tram', family: lineFamily(l.label), nodes: l.nodes, sourceId: l.sourceId }));
  const at = new Map([...nodes.keys()].map(id => [id, []]));
  for (const l of lines) for (const id of new Set(l.nodes)) at.get(id).push(l);
  const walks = [];
  const ids = [...nodes.keys()];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const d = km(nodes.get(ids[i]), nodes.get(ids[j])); if (d <= WALK_KM) walks.push({ a: ids[i], b: ids[j], km: d });
  }
  return { nodes, lines, at, walks, name: id => nodes.get(id)?.name || id };
}

export function rideSeconds(net, line, i, j) {
  const step = i < j ? 1 : -1; let s = 0;
  for (let k = i; k !== j; k += step) s += km(net.nodes.get(line.nodes[k]), net.nodes.get(line.nodes[k + step])) * ROUTE_FACTOR / SPEED_KMH[line.mode] * 3600 + DWELL_S;
  return s;
}
export const walkSeconds = (d, run) => d / (SPEED_KMH.walk / (run?.walkFactor || 1)) * 3600;
const headwayS = (line, run) => HEADWAY_MIN[line.mode] * (run?.headway || 1) * 60;

// The best door-to-door time between every pair, at the run's AVERAGE wait
// (NIGHT's half-the-trams included — a deadline set from daytime waits put two
// of forty night jobs on time) — the heuristic a card is ranked by and a
// deadline is set from. Dijkstra over ride segments and walks; small enough
// (23 places) to do once per run.
export function bestTable(net, run = {}) {
  const ids = [...net.nodes.keys()], out = {};
  const edges = new Map(ids.map(id => [id, []]));
  for (const l of net.lines) for (let i = 0; i < l.nodes.length; i++) for (let j = 0; j < l.nodes.length; j++) if (i !== j && l.nodes[i] !== l.nodes[j])
    edges.get(l.nodes[i]).push({ to: l.nodes[j], s: headwayS(l, run) / 2 + rideSeconds(net, l, i, j) });
  for (const w of net.walks) { const s = walkSeconds(w.km, run); edges.get(w.a).push({ to: w.b, s }); edges.get(w.b).push({ to: w.a, s }); }
  for (const src of ids) {
    const dist = Object.fromEntries(ids.map(id => [id, Infinity])); dist[src] = 0; const done = new Set();
    while (done.size < ids.length) {
      let u = null; for (const id of ids) if (!done.has(id) && (u == null || dist[id] < dist[u])) u = id;
      if (u == null || dist[u] === Infinity) break; done.add(u);
      for (const e of edges.get(u)) if (dist[u] + e.s < dist[e.to]) dist[e.to] = dist[u] + e.s;
    }
    out[src] = dist;
  }
  return out;
}

// ── the run ───────────────────────────────────────────────────────────────
// mulberry32 with its state in the run, so a run is one serialisable value
const rand = s => { s.rng = (s.rng + 0x6D2B79F5) >>> 0; let t = s.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const round10 = s => Math.max(0, Math.round(s / 10) * 10);
const pickOf = (s, list) => list[Math.floor(rand(s) * list.length)];

// The deck a run deals (ACT1.md §5): one card a job, from the run's own tones,
// places and weather — a card that needs a weather the shift has not got is
// not in it, and one that has it is twice as likely; one buyer a shift.
export function dealDeck(s, run, weather) {
  const tones = run.tones || { fun: 1 }, places = run.places || null;
  const weight = c => (c.weather && !c.weather.includes(weather)) || (places && !places.includes(c.where) && c.where !== 'any') ? 0
    : Math.max(...c.tone.map(t => tones[t] || 0)) * (c.weather ? 2 : 1);
  const out = [];
  for (let i = 0; i < (run.cards ?? 3); i++) {
    const pool = CARDS.filter(c => !out.some(d => d.card.id === c.id) && !(c.sale && out.some(d => d.card.sale)) && weight(c) > 0);
    if (!pool.length) break;
    const total = pool.reduce((a, c) => a + weight(c), 0); let r = rand(s) * total, pick = pool[pool.length - 1];
    for (const c of pool) { r -= weight(c); if (r < 0) { pick = c; break; } }
    out.push({ card: pick, job: i });
  }
  return out;
}

// A mission's cards (missions.js) are the journey's own, by id: the deck's,
// a callback, or one made for a mission (the wallet)
const CARD_BY_ID = id => CARDS.find(c => c.id === id) || Object.values(CALLBACKS).find(c => c.id === id) || MISSION_CARDS[id] || null;
const callbackOf = flag => CALLBACKS[flag] || MISSION_CALLBACKS[flag] || null;

// The arc step a run deals (ACT1.md §10): none on a first run, at most one,
// and only the one the memory says is next. No rng: a run without a memory
// deals exactly the deck it always did.
export function arcStep(memory = {}, run = {}) {
  if (!((memory.runs | 0) >= 1)) return null;
  return ['ticket', 'dispatch'].map(arc => ARCS.find(a => a.arc === arc && (memory[arc] | 0) === a.at && (!a.runs || a.runs.includes(run.id)))).find(Boolean) || null;
}
const hashOf = x => { let h = 2166136261; for (const c of String(x)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// A card takes a job's card slot: the one already dealt for it, or a new one.
function slot(s, card, job) {
  const d = s.deck.find(x => x.job === job && !s.used.has(x.card.id));
  if (d) d.card = card; else s.deck.push({ card, job });
}

export function newRun(net, run = {}, seed = 1, { start = 'lasipalatsi', memory = null, standing = null } = {}) {
  const s = { v: 5, seed, rng: seed >>> 0, run, clock: 0, at: net.nodes.has(start) ? start : [...net.nodes.keys()][0],
    target: run.target || 3, done: 0, late: 0, sold: 0, trust: 1, score: 0, streak: 0, bestStreak: 0, job: null, offer: null, weather: 'clear',
    phase: 'dispatch', deck: [], used: new Set(), halt: null, haltSeen: false, log: [], hop: null, pending: null, results: [], seen: [],
    memory: { ...(memory || {}) }, flags: new Set(), keep: {}, standing: { ...(standing || {}) }, sealedJob: -1, rivalJob: -1 };
  // a mission (missions.js): where it starts, its perks and strikes
  if (run.mission) { s.at = net.nodes.has(run.mission.start) ? run.mission.start : s.at; s.perks = []; s.strikes = 0; s.mods = { deadline: 1, luck: 0, tip: 0, dry: false }; s.perkOffer = null; s.picks = []; }
  // the shift's weather, and the run as the weather makes it: slower walks,
  // fuller trams — the deadlines are set from THIS, so snow is slow, not unfair
  s.weather = run.skies?.length ? pickOf(s, run.skies) : 'clear';
  const W = WEATHER[s.weather] || WEATHER.clear;
  s.run = { ...run, walkFactor: (run.walkFactor || 1) * W.walk, headway: (run.headway || 1) * W.wait };
  Object.defineProperty(s, 'best', { value: bestTable(net, s.run), enumerable: false });
  s.deck = dealDeck(s, run, s.weather);
  // a mission deals its own: one event a step, drawn from the step's few — and
  // the drop each step sends you to, drawn now, so a seed IS a version of it
  if (run.mission) run.mission.steps.forEach((st, i) => { const ok = (st.cards || []).map(CARD_BY_ID).filter(c => c && (!c.weather || c.weather.includes(s.weather)));
    if (ok.length) slot(s, pickOf(s, ok), i); s.picks.push(pickOf(s, st.to)); });
  const step = run.mission ? null : arcStep(s.memory, run); if (step) slot(s, step, step.job);
  // the run-modifiers (ACT1.md §11), placed by a hash of the seed — no rng, so
  // the deck is the one it always was: the sealed parcel from a fourth run (the
  // second job, or the third when an arc step holds the second's card slot;
  // never on EASY), the race (`race`, MEDIUM and HARD) on another middle job
  if (run.sealed !== false && (s.memory.runs | 0) >= 3) { s.sealedJob = s.deck.some(d => d.job === 1 && d.card.arc) ? 2 : 1; slot(s, SEALED_CARD, s.sealedJob); }
  if (run.race) { const js = [1, 2].filter(j => j !== s.sealedJob); s.rivalJob = js[hashOf(`rival:${seed}`) % js.length]; }
  // HARD's halted family (runs.js halt): seeded, a tram, from its minute
  if (run.halt) { const fams = [...new Set(net.lines.filter(l => l.mode === 'tram').map(l => l.family))];
    const fam = haltFamily(seed, fams); if (fam) s.halt = { family: fam, from: run.halt.atMin * 60, until: run.halt.atMin * 60 + haltMinutes(seed, run) * 60, recoverJobs: run.halt.recoverJobs, startDone: null, lifted: false }; }
  dispatch(net, s);
  return s;
}

export const halted = (s, fam) => !!s.halt && !s.halt.lifted && s.halt.family === fam && s.clock >= s.halt.from && s.clock < s.halt.until;

// A job offer from where the courier stands: a destination a run can carry
// (EASY: one of the nearer ones), a parcel from the run's pool, and what is
// inside it, which nobody tells you.
function dispatch(net, s, notTo = null) {
  if (s.run.mission) return missionDispatch(net, s);
  const from = s.at, best = s.best[from], cands = [...net.nodes.keys()].filter(id => id !== from && id !== notTo && Number.isFinite(best[id]));
  cands.sort((a, b) => best[a] - best[b]);
  const pool = s.run.board === 'short' ? cands.slice(0, Math.max(3, Math.ceil(cands.length / 3))) : cands.filter(id => best[id] <= (s.run.reach || 20) * 60);
  const pick = (pool.length ? pool : cands)[Math.floor(rand(s) * (pool.length || cands.length))];
  const keys = s.run.cargo?.length ? s.run.cargo : Object.keys(CARGO);
  const cargo = keys[Math.floor(rand(s) * keys.length)];
  s.offer = { to: pick, cargo, best: best[pick], contents: pickOf(s, CONTENTS[cargo] || ['something']) };
  s.offer.fee = Math.round(feeOf(s.offer) * s.trust);   // a sold parcel costs every fee after it (dispatch hears)
  const idx = s.done + s.sold, reg = regularAt(pick);
  if (reg) s.offer.regular = { id: reg.id, name: reg.name };
  if (idx === s.rivalJob) s.offer.rival = { eta: round10(s.offer.best * (s.run.race?.pace || 1.2)) };
  if (idx === s.sealedJob) { const fams = [...new Set((net.at.get(pick) || []).filter(l => l.mode === 'tram').map(l => l.family))].sort();
    if (fams.length) { s.offer.sealed = { family: fams[hashOf(`sealed:${s.seed}`) % fams.length], revealed: false }; s.offer.fee = Math.round(s.offer.fee * 1.5); } }
  s.phase = 'dispatch';
}

// A mission's job: the step's own drop (drawn at the start), parcel and brief.
// There is no "ask for another": an errand is the errand.
function missionDispatch(net, s) {
  const st = s.run.mission.steps[s.done + s.sold], from = s.at;
  if (!st) { s.phase = 'end'; s.offer = null; return; }            // a parcel sold to a buyer used its step: the errand is over
  let to = s.picks[s.done + s.sold]; if (to === from) to = st.to.find(t => t !== from) || [...net.nodes.keys()].find(t => t !== from);
  const best = s.best[from][to];
  s.offer = { to, cargo: st.cargo, best, contents: pickOf(s, CONTENTS[st.cargo] || ['something']), brief: st.brief.replace('{stop}', net.name(to)) };
  s.offer.fee = Math.round(feeOf(s.offer) * s.trust);
  const reg = regularAt(to); if (reg) s.offer.regular = { id: reg.id, name: reg.name };
  s.phase = 'dispatch';
}

// ── what the card says ─────────────────────────────────────────────────────
// Route options from where the courier stands: every line through here, each
// way, to the stop along it that leaves the shortest way on; and the walks.
// Two are offered — the best, and the best that differs in kind or in where it
// leaves you — and the cheaper HOP is the left button, so tapping left is not
// always the right answer. The weather puts stakes on a walk: snow can slip
// you, rain can soak a paper parcel (ACT1.md §4).
export function routeOptions(net, s) {
  const to = s.job.to, best = s.best, here = s.at, cands = [];
  const rule = CARGO[s.job.cargo] || {}, allowMetro = !rule.modes || rule.modes.includes('metro'), allowWalk = !rule.heavy;
  for (const line of net.at.get(here) || []) {
    if (line.mode === 'metro' && !allowMetro) continue;
    if (halted(s, line.family)) continue;
    const idx = line.nodes.map((id, i) => id === here ? i : -1).filter(i => i >= 0);
    for (const i of idx) for (const dir of [1, -1]) {
      let pick = null;
      for (let k = i + dir; k >= 0 && k < line.nodes.length; k += dir) {
        const node = line.nodes[k], ride = rideSeconds(net, line, i, k), rest = best[node][to];
        if (!pick || ride + rest < pick.ride + pick.rest) pick = { node, ride, rest, k };
        if (node === to) break;
      }
      if (!pick) continue;
      cands.push({ kind: 'ride', line, i, k: pick.k, to: pick.node, ride: pick.ride, rest: pick.rest, progress: pick.rest < best[here][to] });
    }
  }
  if (allowWalk) for (const w of net.walks) { const other = w.a === here ? w.b : w.b === here ? w.a : null; if (!other) continue;
    const walk = walkSeconds(w.km, s.run), rest = best[other][to];
    cands.push({ kind: 'walk', to: other, walk, rest, km: w.km, progress: rest < best[here][to] || other === to }); }
  // only ways that leave less to go — unless nothing does (a dead end), when
  // every way out is offered rather than none
  if (cands.some(c => c.progress)) for (let i = cands.length - 1; i >= 0; i--) if (!cands[i].progress) cands.splice(i, 1);
  // price each: a ride waits for its line (drawn from the headway; HARD's rush
  // and the snow fill the first one now and then), a walk is its length
  const fullChance = (s.run.rush === 'max' ? 0.25 : 0) + (s.weather === 'snow' ? 0.15 : 0);
  for (const c of cands) {
    if (c.kind === 'ride') { const h = headwayS(c.line, s.run); let wait = 60 + rand(s) * Math.max(60, h - 60);
      if (fullChance && rand(s) < fullChance) { wait += h; c.full = true; }
      c.wait = wait; c.price = round10(wait + c.ride); }
    else c.price = round10(c.walk);
    c.total = c.price + c.rest;
  }
  // dedupe: one option per (where it leaves you, kind, family)
  const seen = new Set(), uniq = [];
  for (const c of cands.sort((a, b) => a.total - b.total)) { const key = `${c.to}|${c.kind}|${c.line?.family || ''}`; if (seen.has(key)) continue; seen.add(key); uniq.push(c); }
  if (!uniq.length) return [];
  // the second is the best that leaves you somewhere else or another way; else
  // another line to the same stop (two lines, two waits, is still a choice)
  const first = uniq[0], second = uniq.find(c => c !== first && (c.kind !== first.kind || c.to !== first.to)) || uniq.find(c => c !== first) || null;
  const out = (second ? [first, second] : [first]).sort((a, b) => a.price - b.price);
  for (const c of out) if (c.kind === 'walk') {
    if (s.weather === 'snow') c.risk = { odds: 'usually', win: { say: 'Not a single slip. You are basically a local.' }, lose: { time: 90, say: '@slip' } };
    else if (s.weather === 'rain' && PAPER.has(s.job.cargo)) c.risk = { odds: 'maybe', win: { say: 'The bag holds. The paper stays paper.' }, lose: { pay: 0.7, say: '@soak' } };
  }
  return out;
}

export function optionLabel(net, o) {
  if (o.kind === 'walk') return `Walk to ${net.name(o.to)}`;
  // the family ("4"), not the variant HSL runs under it ("4H", "4T")
  return `${o.line.mode === 'metro' ? 'Metro' : (o.line.family || o.line.label)} to ${net.name(o.to)}`;
}

// ── the stakes, as the button shows them (ACT1.md §3) ─────────────────────
const clockOf = sec => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
export function chips(e = {}) {
  const out = [];
  if (e.sell != null) out.push(e.sell > 0 ? `+€${e.sell}` : '€0', 'job gone', `fees ×${SALE_TRUST}`);
  if (e.pay != null && e.pay !== 1) out.push(`×${+e.pay.toFixed(2)}`);
  if (e.cash) out.push(e.cash > 0 ? `+€${e.cash}` : `−€${-e.cash}`);
  if (e.time) out.push(`+${clockOf(e.time)}`);
  return out;
}
// Arrays of chips, one word-group each, so the screen can set (and translate) them one by one.
export function stakesOf(o) {
  if (o.risk) { const w = chips(o.risk.win), l = chips(o.risk.lose); return { odds: o.risk.odds, win: w.length ? w : ['fine'], lose: l.length ? l : ['nothing'] }; }
  const sure = chips({ ...o, time: 0 }); return sure.length ? { sure } : null;   // a sure option's time IS its price
}

const MOODS_FOR = { dispatch: 'info', halt: 'warning', route: 'info' };
const eligible = (c, s) => c.options.filter(o => !o.needs || o.needs === s.job?.cargo).slice(0, 2);
// The card the run is showing now. Every card is the same shape: a mood, one
// line, and up to two buttons, each with its price in time and its stakes.
export function card(net, s) {
  if (s.phase === 'end') return null;
  if (s.phase === 'perk') return { kind: 'perk', mood: 'opportunity', text: `Job ${s.done} of ${s.target} done. Pick one for the rest of the errand.`,
    options: s.perkOffer.map(id => ({ label: PERKS[id].name, price: 0, perk: id, stakes: { sure: [PERKS[id].line] } })) };
  if (s.phase === 'dispatch' && s.offer?.brief) { const o = s.offer;
    return { kind: 'dispatch', mood: MOODS_FOR.dispatch, text: o.brief, fee: o.fee, mission: true, options: [{ label: 'Take it', price: 0, stakes: { sure: [`€${o.fee}`] } }] }; }
  if (s.phase === 'dispatch') { const o = s.offer;
    const base = o.sealed ? 'A sealed parcel. No address, only a sticker.' : o.regular ? `${cargoWord(o.cargo)} for ${o.regular.name} at ${net.name(o.to)}.` : `${cargoWord(o.cargo)} for ${net.name(o.to)}.`;
    if (o.rival) return { kind: 'dispatch', mood: 'warning', text: `${base} The other courier wants it too.`, fee: o.fee, rival: true,
      options: [{ label: 'Race her', price: 0, stakes: { odds: `beat ${clockAt(s, s.clock + o.rival.eta)}`, win: [`€${o.fee} ×1.3`], lose: ['×0.6'] } }, { label: 'Let her have it', price: REROLL_S, stakes: null }] };
    return { kind: 'dispatch', mood: MOODS_FOR.dispatch, text: base, fee: o.fee, sealed: !!o.sealed,
      options: [{ label: 'Take it', price: 0, stakes: { sure: [`€${o.fee}`] } }, { label: 'Ask for another', price: REROLL_S, stakes: null }] }; }
  if (s.pending) { const c = s.pending.card;
    return { kind: 'story', id: c.id, mood: c.mood || 'info', text: fill(s, c.text), where: c.where, tram: c.tram || null, sale: !!c.sale,
      options: eligible(c, s).map(o => ({ label: fill(s, o.label), price: o.time || 0, stakes: stakesOf(o) })) }; }
  if (s.phase === 'halt') { const h = s.halt;
    return { kind: 'halt', mood: MOODS_FOR.halt, text: `The ${h.family} is halted.`, options: [{ label: 'Find another way', price: 0, stakes: null }, { label: 'Wait it out', price: round10(Math.max(0, h.until - s.clock)), stakes: null }] }; }
  const opts = s.options || [];
  // nowhere this parcel may go from here (a dead end for its rules): the next
  // one is always a way on, so the card never strands the courier
  const options = opts.length ? opts.map(o => ({ label: optionLabel(net, o), price: o.price, hop: o, stakes: o.risk ? stakesOf(o) : null })) : [{ label: 'Wait for the next one', price: STUCK_S, stakes: null }];
  const text = s.job.sealed && !s.job.sealed.revealed ? `A sealed parcel. Ride the ${s.job.sealed.family}.` : `${cargoWord(s.job.cargo)} for ${net.name(s.job.to)}.`;
  return { kind: 'route', mood: MOODS_FOR.route, at: net.name(s.at), text, options };
}
export const cargoWord = c => ({ documents: 'Documents', 'hot food': 'Hot food', parts: 'Parts', fragile: 'Something fragile', equipment: 'Equipment', express: 'An express parcel', 'fresh food': 'Fresh food', 'market goods': 'Market goods' })[c] || 'A parcel';

// ── what a choice does ─────────────────────────────────────────────────────
// Returns what happened, for the screen to act out: a hop to ride or walk, a
// reveal (the line and its chips), a sale, a delivery, the end. The state is
// advanced in place.
// a card's words, filled in: what is inside, where it goes, which line
const fill = (s, t) => String(t || '').replace('{contents}', s.job?.contents || 'something').replace('{stop}', s.job?.toName || '').replace('{fam}', s.job?.sealed?.family || '');
function say(s, line) {
  return fill(s, line === '@slip' ? pickOf(s, SLIPS) : line === '@soak' ? pickOf(s, SOAKS) : line || '');
}
export const isSealed = s => !!(s?.job?.sealed && !s.job.sealed.revealed);
// Apply an outcome; returns the reveal for the screen.
function apply(net, s, e, how, odds = null) {
  const r = { say: say(s, e.say), chips: chips(e), how, odds };
  if (e.reveal && s.job) s.job.known = true;
  if (e.unseal && s.job?.sealed) s.job.sealed.revealed = true;
  if (e.pay != null && s.job) s.job.mult = Math.round(s.job.mult * e.pay * 1000) / 1000;
  if (e.cash) s.score = Math.max(0, s.score + e.cash);
  if (e.time) { s.log.push({ at: s.clock, kind: 'outcome', label: r.say, price: e.time }); advance(s, e.time); }   // the log stays the whole clock
  if (e.sell != null && s.job) {
    // the job is gone, and DISPATCH HEARS: every fee after this one is ×0.85 —
    // without it a sale was free money on any clock with room in it
    s.score += e.sell; s.sold++; s.streak = 0; s.trust = Math.round(s.trust * SALE_TRUST * 1000) / 1000;
    s.seen.push({ contents: s.job.contents, how: 'sold' }); r.sold = { contents: s.job.contents, cash: e.sell, trust: s.trust };
    s.job = null; s.options = null; if (s.phase !== 'end') dispatch(net, s);
  }
  return r;
}
const roll = (s, o) => { const win = rand(s) < Math.min(0.95, (ODDS[o.risk.odds] ?? 0.5) + (s.mods?.luck || 0)); return { e: win ? o.risk.win : o.risk.lose, how: win ? 'win' : 'lose' }; };

export function choose(net, s, i) {
  const c = card(net, s); if (!c) return { error: 'the run is over' };
  const opt = c.options[i]; if (!opt) return { error: 'no such option' };
  const out = { kind: c.kind, price: opt.price, label: opt.label };
  s.log.push({ at: s.clock, kind: c.kind, label: opt.label, price: opt.price });
  if (c.kind === 'dispatch') {
    if (i === 1) { advance(s, REROLL_S); if (s.phase !== 'end') dispatch(net, s, s.offer.to); return out; }
    s.job = { ...s.offer, startedAt: s.clock, limit: Math.round(s.offer.best * GRACE * (s.run.deadline || 1) * (s.mods?.deadline || 1)), mult: 1, known: false, toName: net.name(s.offer.to) }; s.offer = null;
    if (s.job.rival) s.job.rival.until = s.clock + s.job.rival.eta;
    return nextMoment(net, s, out, 'stop');
  }
  if (c.kind === 'story') { const p = s.pending, o = eligible(p.card, s)[i];
    s.pending = null; advance(s, opt.price);
    const { e, how } = o.risk ? roll(s, o) : { e: { ...o, time: 0 }, how: 'sure' };
    out.reveal = apply(net, s, e, how, o.risk?.odds || null);
    // what the city remembers: across runs (`keep`), and for the rest of this
    // one (`set`: its callback takes the next job's card slot)
    Object.assign(s.keep, p.card.keep || {}, o.keep || {});
    if (o.set && callbackOf(o.set) && !s.flags.has(o.set)) { s.flags.add(o.set); const j = s.done + s.sold + 1;
      if (j < s.target && !s.deck.some(d => d.job === j && d.card.arc && !s.used.has(d.card.id))) slot(s, callbackOf(o.set), j); }   // an arc step keeps its slot
    if (s.phase === 'end') return out;
    if (out.reveal.sold) return out;                       // the job went with the buyer: the next dispatch is up
    if (p.thenArrive) return arrive(net, s, out);
    return nextMoment(net, s, out, 'stop', true); }
  if (c.kind === 'perk') { const id = opt.perk; s.perks.push(id); PERKS[id].apply(s); s.perkOffer = null; out.perk = id;
    dispatch(net, s); return out; }
  if (c.kind === 'halt') { s.haltSeen = true; if (i === 1) { advance(s, opt.price); s.halt.lifted = true; }
    return nextMoment(net, s, out, 'stop', true); }
  // a hop (or, with nowhere to go, the wait for one)
  const hop = opt.hop;
  if (!hop) { advance(s, opt.price); return nextMoment(net, s, out, 'stop', true); }
  // a tram ride is drawn a model — LOOK ONLY (signed off): it rides the same
  const model = hop.kind === 'ride' && hop.line.mode === 'tram' ? (() => { let r = rand(s) * 100; for (const t of TRAMS) { r -= t.w; if (r < 0) return t.id; } return TRAMS[0].id; })() : hop.kind === 'ride' ? 'metro' : null;
  s.hop = { kind: hop.kind, from: s.at, to: hop.to, model, line: hop.line ? { id: hop.line.id, label: hop.line.label, mode: hop.line.mode, family: hop.line.family, sourceId: hop.line.sourceId, nodes: hop.line.nodes, i: hop.i, k: hop.k } : null, price: hop.price, full: !!hop.full };
  out.hop = s.hop;
  // the sealed label makes sense aboard the right line (ACT1.md §11)
  if (isSealed(s) && hop.line?.family === s.job.sealed.family) { s.job.sealed.revealed = true; out.unsealed = { family: hop.line.family, stop: s.job.toName }; }
  advance(s, hop.price); if (s.phase === 'end') return out;
  s.at = hop.to;
  // the weather's stakes on a walk land on the way
  if (hop.risk && !s.mods?.dry) { const { e, how } = roll(s, hop); out.reveal = apply(net, s, e, how, hop.risk.odds); if (s.phase === 'end') return out; }
  // a card that happens aboard (or on foot) plays out before the doors open
  const due = dueCard(s, hop.kind === 'walk' ? 'walking' : 'aboard');
  if (due) { s.pending = { card: due.card, thenArrive: true }; s.used.add(due.card.id); out.story = true; return out; }
  return arrive(net, s, out);
}

function arrive(net, s, out) {
  if (s.phase === 'end') return out;
  if (s.at === s.job.to) {
    const took = s.clock - s.job.startedAt, late = took > s.job.limit;
    let pay = s.job.fee;
    if (late) { s.late++; s.streak = 0; pay *= 0.5; }
    else { s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); pay *= 1 + 0.25 * Math.min(4, s.streak - 1); }
    pay = pay * s.job.mult;
    // the race (the rival), the regular's tip and standing, the sealed note
    let race = null, tip = 0;
    if (s.job.rival) { race = s.clock <= s.job.rival.until ? 'won' : 'lost'; pay *= race === 'won' ? 1.3 : 0.6; }
    if (s.job.regular) { const id = s.job.regular.id, st = standingOf(s.standing, id); tip = late ? 0 : tipFor(s.job.fee, st);
      s.standing[id] = Math.max(0, Math.min(MAX_STANDING, st + (late ? -1 : 1))); s.keep.regulars = { ...(s.keep.regulars || {}), [id]: s.standing[id] }; }
    if (s.job.sealed) s.keep.notes = (s.keep.notes || 0) + 1;
    if (s.mods?.tip) tip += s.mods.tip;
    pay = Math.max(0, Math.round(pay)) + tip;
    s.score += pay; s.done++; s.results.push(late ? 'late' : 'ok'); s.seen.push({ contents: s.job.contents, how: 'delivered' });
    out.delivered = { to: s.job.to, late, took, pay, contents: s.job.contents, mult: s.job.mult, race, eta: s.job.rival?.eta ?? null, tip, regular: s.job.regular?.name || null, sealed: !!s.job.sealed };
    if (s.halt && s.halt.startDone != null && s.done >= s.halt.startDone + s.halt.recoverJobs) s.halt.lifted = true;
    s.job = null;
    // a mission's strikes: an errand someone waits on is lost on the second late drop
    if (s.run.mission && late && ++s.strikes >= STRIKES) { s.phase = 'end'; out.end = true; out.failed = true; out.delivered.strike = s.strikes; return out; }
    if (s.run.mission && late) out.delivered.strike = s.strikes;
    if (s.done >= s.target) { s.phase = 'end'; out.end = true; return out; }
    // between a mission's jobs, the draft: two of the pool you do not have yet
    if (s.run.mission) { const pool = (s.run.perkPool || []).filter(p => !s.perks.includes(p));
      if (pool.length >= 2) { const a = pickOf(s, pool), b = pickOf(s, pool.filter(p => p !== a)); s.perkOffer = [a, b]; s.phase = 'perk'; return out; } }
    dispatch(net, s); return out;
  }
  return nextMoment(net, s, out, 'stop');
}

// What the courier meets next at a stop: a halt, a story card, or the choice.
function nextMoment(net, s, out, phase, skipStory = false) {
  if (s.phase === 'end') return out;
  s.phase = phase;
  if (s.halt && !s.halt.lifted && s.halt.startDone == null && s.clock >= s.halt.from) s.halt.startDone = s.done;
  if (s.halt && !s.haltSeen && halted(s, s.halt.family) && (net.at.get(s.at) || []).some(l => l.family === s.halt.family)) { s.phase = 'halt'; return out; }
  if (!skipStory) { const due = dueCard(s, 'stop'); if (due) { s.pending = { card: due.card }; s.used.add(due.card.id); return out; } }
  s.options = routeOptions(net, s);
  return out;
}

// The n-th story card belongs to the n-th job and happens at the first moment
// of that job whose place is its own (a stop, aboard, on foot) and whose
// parcel it wants; a card that needs a job waits until there is one.
function dueCard(s, place) {
  return s.deck.find(d => !s.used.has(d.card.id) && d.job <= s.done + s.sold && s.job && (d.card.where === place || d.card.where === 'any') && (!d.card.sealed || isSealed(s))
    && (!d.card.cargo || d.card.cargo.includes(s.job.cargo))) || null;
}

function advance(s, sec) { s.clock += sec; if (s.clock >= SHIFT_SECONDS) { s.clock = SHIFT_SECONDS; s.phase = 'end'; } }

// ── reading the run ────────────────────────────────────────────────────────
export const complete = s => s.done >= s.target;
export const timeLeft = s => s.job ? s.job.limit - (s.clock - s.job.startedAt) : null;
export function clockAt(s, sec) { const m = (s.run.startHour ?? 7) * 60 + Math.floor(sec / 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
export function clockLabel(s) { const m = (s.run.startHour ?? 7) * 60 + Math.floor(s.clock / 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
// Where a line goes from a stop, for the sign over the door: its last stop that way.
export function terminus(net, hop) { const l = hop.line; if (!l) return null; return net.name(l.nodes[hop.line.k > hop.line.i ? l.nodes.length - 1 : 0]); }
