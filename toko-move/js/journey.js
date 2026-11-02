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
//   · A STORY   the deck's cards, at a stop or aboard, priced in seconds
//   · A HALT    on HARD, a family stops; route round it or wait it out
// The clock moves only by the prices you pick, so nothing happens while you
// think. The network is REAL — 23 named places, the 33 line variants HSL runs
// between them, the walks between neighbours — and the times are PLAUSIBLE
// (distance on the line at a tram's or a metro's pace, a wait drawn from the
// line's headway), never a timetable: "occasionally you should feel like the
// trams have some realism".
//
// Pure: no DOM, no clock, deterministic from a seed (one integer of rng state),
// which is what lets test/journey.mjs play hundreds of runs in bare node.
import { ENCOUNTERS } from './events.js?v=10';
import { pickWeighted, haltFamily, haltMinutes } from './mutators.js?v=2';
import { lineFamily } from './board.js?v=8';
import { CARGO } from './deliveries.js?v=28';

export const SHIFT_SECONDS = 75 * 60;            // 07:00–08:15, or 23:00–00:15
export const SPEED_KMH = { tram: 14, metro: 34, walk: 4.8 };
export const HEADWAY_MIN = { tram: 7.5, metro: 4 };
export const ROUTE_FACTOR = 1.25;                // track is longer than the crow flies
export const DWELL_S = 20;                       // a stop, door to door
export const WALK_KM = 1.3;                      // the furthest walk a card offers
export const GRACE = 1.35;                       // a deadline is the best route × this × the run's own
export const REROLL_S = 60;                      // "Ask for another"
export const STUCK_S = 300;                      // "Wait for the next one"

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
// The classic deck's costs are TICKS; one tick of the real-time game was 1.5
// seconds of shift, so that is what a card costs here — "+150 s" to walk the
// lady across, which is what it always cost, now said honestly.
export const cardSeconds = o => round10((o?.cost || 0) * 1.5);

export function newRun(net, run = {}, seed = 1, { start = 'lasipalatsi' } = {}) {
  const s = { v: 3, seed, rng: seed >>> 0, run, clock: 0, at: net.nodes.has(start) ? start : [...net.nodes.keys()][0],
    target: run.target || 3, done: 0, late: 0, score: 0, streak: 0, bestStreak: 0, job: null, offer: null,
    phase: 'dispatch', deck: [], used: new Set(), halt: null, haltSeen: false, log: [], hop: null, pending: null, results: [] };
  Object.defineProperty(s, 'best', { value: bestTable(net, run), enumerable: false });
  // the story deck: the run's own count, moods and places (runs.js), one card a job
  const places = run.places || null, deck = places ? ENCOUNTERS.filter(c => places.includes(c.where)) : ENCOUNTERS;
  for (let i = 0; i < (run.encounters ?? 3) && deck.length; i++) {
    let c = pickWeighted(deck, Math.floor(rand(s) * 65536), run.moods || null), guard = 0;
    while (s.deck.some(d => d.card.id === c.id) && guard++ < deck.length) c = deck[(deck.indexOf(c) + 1) % deck.length];
    s.deck.push({ card: c, job: i });
  }
  // HARD's halted family (runs.js halt): seeded, a tram, from its minute
  if (run.halt) { const fams = [...new Set(net.lines.filter(l => l.mode === 'tram').map(l => l.family))];
    const fam = haltFamily(seed, fams); if (fam) s.halt = { family: fam, from: run.halt.atMin * 60, until: run.halt.atMin * 60 + haltMinutes(seed, run) * 60, recoverJobs: run.halt.recoverJobs, startDone: null, lifted: false }; }
  dispatch(net, s);
  return s;
}

export const halted = (s, fam) => !!s.halt && !s.halt.lifted && s.halt.family === fam && s.clock >= s.halt.from && s.clock < s.halt.until;

// A job offer from where the courier stands: a destination a run can carry
// (EASY: one of the nearer ones), and a parcel from the run's pool.
function dispatch(net, s, notTo = null) {
  const from = s.at, best = s.best[from], cands = [...net.nodes.keys()].filter(id => id !== from && id !== notTo && Number.isFinite(best[id]));
  cands.sort((a, b) => best[a] - best[b]);
  const pool = s.run.board === 'short' ? cands.slice(0, Math.max(3, Math.ceil(cands.length / 3))) : cands.filter(id => best[id] <= (s.run.reach || 20) * 60);
  const pick = (pool.length ? pool : cands)[Math.floor(rand(s) * (pool.length || cands.length))];
  const keys = s.run.cargo?.length ? s.run.cargo : Object.keys(CARGO);
  const cargo = keys[Math.floor(rand(s) * keys.length)];
  s.offer = { to: pick, cargo, best: best[pick] };
  s.phase = 'dispatch';
}

// ── what the card says ─────────────────────────────────────────────────────
// Route options from where the courier stands: every line through here, each
// way, to the stop along it that leaves the shortest way on; and the walks.
// Two are offered — the best, and the best that differs in kind or in where it
// leaves you — and the cheaper HOP is the left button, so tapping left is not
// always the right answer.
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
  // fills the first one now and then), a walk is its length
  for (const c of cands) {
    if (c.kind === 'ride') { const h = headwayS(c.line, s.run); let wait = 60 + rand(s) * Math.max(60, h - 60);
      if (s.run.rush === 'max' && rand(s) < 0.25) { wait += h; c.full = true; }
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
  return (second ? [first, second] : [first]).sort((a, b) => a.price - b.price);
}

export function optionLabel(net, o) {
  if (o.kind === 'walk') return `Walk to ${net.name(o.to)}`;
  // the family ("4"), not the variant HSL runs under it ("4H", "4T")
  return `${o.line.mode === 'metro' ? 'Metro' : (o.line.family || o.line.label)} to ${net.name(o.to)}`;
}

const MOODS_FOR = { dispatch: 'info', halt: 'warning', route: 'info' };
// The card the run is showing now. Every card is the same shape: a mood, one
// line, and up to two buttons, each with its price in seconds.
export function card(net, s) {
  if (s.phase === 'end') return null;
  if (s.phase === 'dispatch') { const o = s.offer;
    return { kind: 'dispatch', mood: MOODS_FOR.dispatch, text: `${cargoWord(o.cargo)} for ${net.name(o.to)}.`, options: [{ label: 'Take it', price: 0 }, { label: 'Ask for another', price: REROLL_S }] }; }
  if (s.pending) { const p = s.pending, c = p.card;
    const opts = c.options.filter(o => !o.needs || o.needs === s.job?.cargo).slice(0, 2);
    return { kind: 'story', mood: c.mood || 'info', text: c.text, glyph: c.glyph, where: c.where, options: opts.map(o => ({ label: o.label, price: cardSeconds(o) })) }; }
  if (s.phase === 'halt') { const h = s.halt;
    return { kind: 'halt', mood: MOODS_FOR.halt, text: `The ${h.family} is halted.`, options: [{ label: 'Find another way', price: 0 }, { label: 'Wait it out', price: round10(Math.max(0, h.until - s.clock)) }] }; }
  const opts = s.options || [];
  // nowhere this parcel may go from here (a dead end for its rules): the next
  // one is always a way on, so the card never strands the courier
  const options = opts.length ? opts.map(o => ({ label: optionLabel(net, o), price: o.price, hop: o })) : [{ label: 'Wait for the next one', price: STUCK_S }];
  return { kind: 'route', mood: MOODS_FOR.route, at: net.name(s.at), text: `${cargoWord(s.job.cargo)} for ${net.name(s.job.to)}.`, options };
}
export const cargoWord = c => ({ documents: 'Documents', 'hot food': 'Hot food', parts: 'Parts', fragile: 'Something fragile', equipment: 'Equipment', express: 'An express parcel', 'fresh food': 'Fresh food', 'market goods': 'Market goods' })[c] || 'A parcel';

// ── what a choice does ─────────────────────────────────────────────────────
// Returns what happened, for the screen to act out: a hop to ride or walk, a
// delivery, the end. The state is advanced in place.
export function choose(net, s, i) {
  const c = card(net, s); if (!c) return { error: 'the run is over' };
  const opt = c.options[i]; if (!opt) return { error: 'no such option' };
  const out = { kind: c.kind, price: opt.price, label: opt.label };
  s.log.push({ at: s.clock, kind: c.kind, label: opt.label, price: opt.price });
  if (c.kind === 'dispatch') {
    if (i === 1) { advance(s, REROLL_S); if (s.phase !== 'end') dispatch(net, s, s.offer.to); return out; }
    s.job = { ...s.offer, startedAt: s.clock, limit: Math.round(s.offer.best * GRACE * (s.run.deadline || 1)) }; s.offer = null;
    return nextMoment(net, s, out, 'stop');
  }
  if (c.kind === 'story') { const p = s.pending, o = p.card.options.filter(x => !x.needs || x.needs === s.job?.cargo)[i];
    if (o?.score) s.score += o.score; s.pending = null; advance(s, opt.price);
    if (p.thenArrive) return arrive(net, s, out);
    return nextMoment(net, s, out, 'stop', true); }
  if (c.kind === 'halt') { s.haltSeen = true; if (i === 1) { advance(s, opt.price); s.halt.lifted = true; }
    return nextMoment(net, s, out, 'stop', true); }
  // a hop (or, with nowhere to go, the wait for one)
  const hop = opt.hop;
  if (!hop) { advance(s, opt.price); return nextMoment(net, s, out, 'stop', true); }
  s.hop = { kind: hop.kind, from: s.at, to: hop.to, line: hop.line ? { id: hop.line.id, label: hop.line.label, mode: hop.line.mode, family: hop.line.family, sourceId: hop.line.sourceId, nodes: hop.line.nodes, i: hop.i, k: hop.k } : null, price: hop.price, full: !!hop.full };
  out.hop = s.hop; advance(s, hop.price); if (s.phase === 'end') return out;
  s.at = hop.to;
  // a card that happens aboard (or on foot) plays out before the doors open
  const due = dueCard(s, hop.kind === 'walk' ? 'walking' : 'aboard');
  if (due) { s.pending = { card: due.card, thenArrive: true }; s.used.add(due.card.id); out.story = true; return out; }
  return arrive(net, s, out);
}

function arrive(net, s, out) {
  if (s.phase === 'end') return out;
  if (s.at === s.job.to) {
    const took = s.clock - s.job.startedAt, late = took > s.job.limit, base = 100 + Math.round(s.job.best / 6);
    if (late) { s.late++; s.streak = 0; s.score += Math.round(base * 0.5); }
    else { s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); s.score += Math.round(base * (1 + 0.25 * Math.min(4, s.streak - 1))); }
    s.done++; s.results.push(late ? 'late' : 'ok'); out.delivered = { to: s.job.to, late, took };
    if (s.halt && s.halt.startDone != null && s.done >= s.halt.startDone + s.halt.recoverJobs) s.halt.lifted = true;
    s.job = null;
    if (s.done >= s.target) { s.phase = 'end'; out.end = true; return out; }
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
  if (!s.options.length) { s.options = []; }
  return out;
}

// The n-th story card belongs to the n-th job and happens at the first moment
// of that job whose place is its own (a stop, aboard, on foot).
function dueCard(s, place) {
  return s.deck.find(d => !s.used.has(d.card.id) && d.job <= s.done && (d.card.where === place || d.card.where === 'any')) || null;
}

function advance(s, sec) { s.clock += sec; if (s.clock >= SHIFT_SECONDS) { s.clock = SHIFT_SECONDS; s.phase = 'end'; s.job = s.job; } }

// ── reading the run ────────────────────────────────────────────────────────
export const complete = s => s.done >= s.target;
export const timeLeft = s => s.job ? s.job.limit - (s.clock - s.job.startedAt) : null;
export function clockLabel(s) { const m = (s.run.startHour ?? 7) * 60 + Math.floor(s.clock / 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
// Where a line goes from a stop, for the sign over the door: its last stop that way.
export function terminus(net, hop) { const l = hop.line; if (!l) return null; return net.name(l.nodes[hop.line.k > hop.line.i ? l.nodes.length - 1 : 0]); }
