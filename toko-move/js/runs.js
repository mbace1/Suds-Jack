// Toko Move — THE RUNS (v2.73, played as cards since v3.0; owner, 2026-11-01: "a much more structured
// experience. Easy, medium, hard and night runs. Each unlocked after the easier
// is completed").
//
// The game is a ladder of four runs. Each attempt is a FRESH shift (owner: a
// new shift each attempt, not the same one), so a run is a set of rules, never
// a fixed puzzle. A run is COMPLETED by delivering every job before the shift
// ends — late is allowed and costs score — and completing one opens the next.
// Stars ride on top and never gate anything: ★ done, ★★ every job on time,
// ★★★ on time AND at par. The daily shift and the week open once NIGHT is
// cleared (owner: "ladder first, rest after"); the mutator chips are gone —
// Night is a run now, and the rush and the halted line are Medium's and Hard's.
//
// Every entry is a setting on a lever the game already has, read by the same
// code that read a mutator (mutators.js keeps those helpers): the skin, the
// clock's start, the headway, the rush, the weather, a held family, the card
// deck's size and moods — plus four of the shift's own: how many jobs, how
// long a deadline, which parcels, and whether the rival and the sealed parcel
// are in it.
//
// MEASURED, not guessed. Since v3.0 the runs are played as the card journey
// (journey.js), and `node test/journey.mjs` holds these bands: sixty fresh
// shifts of each run, a bot that reads the board (the hop that leaves the
// least to go) and one that taps the left button every time — completed,
// reader / left-tapper (on time in brackets), since v3.16:
//   EASY   3 jobs, short board, ×1.5          60/60 (60) · 60/60 (58)
//   MEDIUM 4 jobs, reach 16, a march, 3 strikes 53/60 (39) · 46/60 (24)
//   HARD   5 jobs, rush, a line halted, ×0.9   52/60 (21) · 44/60  (5)
//   NIGHT  5 jobs from 23:00, ×2 waits, 2 strikes 43/60 (20) · 27/60 (12)
// v3.16 (owner: "yes to all runs, modifiers, perks. Let's test all, plan to fit
// the design") put the missions' levers on every run: a perk drafted between
// jobs (`perks`), a job that comes in two at once (`forks`, the job index it
// falls on) and strikes (`strikes`: late drops that end the shift). Perks alone
// made every rung easier (HARD's reader 47 → 58 of 60 on another block, NIGHT's
// tapper above HARD's), so HARD's clock is 0.9 and NIGHT strikes out on two:
// the ladder keeps its shape, and a tapper is stopped higher up each rung.
// so a player who reads the board clears the ladder, and one who taps the
// first thing on it is stopped higher up each rung. `reach` is how far a job
// may send you (minutes of the best route); EASY's short board is the nearest
// third of the city. Par is the reader's 70th percentile of completed scores,
// so three stars ask for a good shift. (v2.73 measured the same ladder in the
// real-time game with test/shifts.cjs; ?classic still plays it, on these pars.)

// Pure apart from the save: test/runs.mjs holds it in bare node.

export const RUNS = [
  { id: 'easy', name: 'EASY', title: 'First shift', glyph: '①',
    blurb: 'Three plain parcels, a generous clock, a quiet city.',
    target: 3, deadline: 1.5, cargo: ['documents', 'parts'], board: 'short', encounters: 1, places: ['stop', 'aboard'],
    moods: { opportunity: 3, info: 2, warning: 0, notice: 0 }, disruptions: 0,
    rush: 'off', weather: 'clear', cityDay: false, rival: false, sealed: false, par: 65,
    tones: { fun: 1 }, skies: ['clear'], cards: 3, perks: true, forks: [1] },
  { id: 'medium', name: 'MEDIUM', title: 'A morning', glyph: '②',
    blurb: 'Four jobs, every kind of parcel, the morning rush, and the city happening to you.',
    target: 4, deadline: 1, cargo: null, encounters: 3, moods: null,
    rush: null, weather: null, cityDay: true, rival: true, sealed: true, reach: 16, par: 120, race: { pace: 1.2 },
    march: { every: 2, atMin: 12, minutes: [20, 32], recoverJobs: 2 }, perks: true, forks: [3], strikes: 3,
    tones: { fun: 3, risky: 1 }, skies: ['clear', 'rain', 'snow'], cards: 4 },
  { id: 'hard', name: 'HARD', title: 'Rush hour, one line down', glyph: '③',
    blurb: 'Five jobs at the height of the rush, with one tram line halted.',
    target: 5, deadline: 0.9, cargo: null, encounters: 3, moods: { warning: 2, notice: 2 },
    headway: 0.6, rush: 'max', weather: null, cityDay: false,
    halt: { atMin: 10, recoverJobs: 2, minutes: [28, 44] }, rival: true, sealed: true, reach: 14, par: 140, race: { pace: 1.1 },
    tones: { risky: 3, fun: 1 }, skies: ['snow', 'rain'], cards: 5, perks: true, forks: [3], strikes: 3 },
  { id: 'night', name: 'NIGHT', title: 'Last service', glyph: '☾',
    blurb: 'Five jobs from 23:00, half the trams, the lines lit like neon.',
    target: 5, deadline: 0.9, cargo: null, encounters: 3, moods: { info: 2, notice: 2, opportunity: 0.5 },
    skin: 'night', startHour: 23, headway: 2, rush: 'off', weather: 'clear', cityDay: false,
    rival: true, sealed: true, reach: 16, par: 155,
    tones: { scary: 3, risky: 1 }, skies: ['fog', 'rain', 'snow'], cards: 5, perks: true, forks: [3], strikes: 2 },
];
export const BY_ID = Object.fromEntries(RUNS.map(r => [r.id, r]));
export const ORDER = RUNS.map(r => r.id);

// ── the save ───────────────────────────────────────────────────────────────
// { easy: { done, stars, best, plays }, ... } — kept on this device. A save in
// the wrong shape reads as a new player, never as a crash or a free unlock.
const KEY = 'tokoMoveRuns';
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
const clean = r => (r && typeof r === 'object') ? { done: r.done === true, stars: Math.max(0, Math.min(3, r.stars | 0)), best: Math.max(0, Number(r.best) || 0), plays: Math.max(0, r.plays | 0) } : { done: false, stars: 0, best: 0, plays: 0 };
export function loadRuns(s = store()) {
  let raw = {}; try { raw = JSON.parse(s?.getItem(KEY) || '{}'); } catch { raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  return Object.fromEntries(ORDER.map(id => [id, clean(raw[id])]));
}
function saveRuns(all, s = store()) { try { s?.setItem(KEY, JSON.stringify(all)); } catch {} }

// ── the memory (v3.4, ACT1.md §10): what the city remembers across runs —
// Dispatch's arc, the 1987 ticket. Its own key and an allow-list of counters,
// so a save in the wrong shape is a city that has forgotten you, never a crash.
const MKEY = 'tokoMoveMemory', MEM = ['dispatch', 'ticket', 'sentOther'];
export function loadMemory(s = store()) {
  let raw = {}; try { raw = JSON.parse(s?.getItem(MKEY) || '{}'); } catch { raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  return Object.fromEntries(MEM.map(k => [k, Math.max(0, Math.min(9, Number(raw[k]) | 0))]));
}
// what a run kept, merged in; a counter only ever moves forward
export function remember(keep, s = store()) {
  const m = loadMemory(s); for (const k of MEM) if (keep?.[k] != null) m[k] = Math.max(m[k], Number(keep[k]) | 0);
  try { s?.setItem(MKEY, JSON.stringify(m)); } catch {}
  return m;
}
// the memory a run starts with: what is kept, and how many runs came before
export function memoryFor(s = store()) { const all = loadRuns(s); return { ...loadMemory(s), runs: ORDER.reduce((n, id) => n + all[id].plays, 0) }; }

// Which runs are open: Easy always, each other once the one before is done.
export function unlocked(id, all = loadRuns()) {
  const i = ORDER.indexOf(id); if (i < 0) return false; if (i === 0) return true;
  return all[ORDER[i - 1]]?.done === true;
}
// The daily and the week: once NIGHT is cleared.
export function extrasOpen(all = loadRuns()) { return all.night?.done === true; }
// The run the title card offers first: the lowest open run not yet done, or
// the last one once every run is.
export function nextRun(all = loadRuns()) { return ORDER.find(id => unlocked(id, all) && !all[id].done) || ORDER[ORDER.length - 1]; }

// Stars for a finished attempt. Never a gate.
export function starsFor(run, { delivered, target, late, score, failed = false }) {
  if (!(delivered >= target) || failed) return 0;   // struck out (v3.16) is not done
  if (late > 0) return 1;
  return score >= (run?.par ?? Infinity) ? 3 : 2;
}

// Record a finished attempt; returns what changed, for the end card.
export function record(id, result, s = store()) {
  const run = BY_ID[id]; if (!run) return null;
  const all = loadRuns(s), was = all[id], stars = starsFor(run, result), done = stars > 0;
  const openedBefore = ORDER.filter(x => unlocked(x, all)), extrasBefore = extrasOpen(all);
  all[id] = { done: was.done || done, stars: Math.max(was.stars, stars), best: Math.max(was.best, done ? result.score : 0), plays: was.plays + 1 };
  saveRuns(all, s);
  const opened = ORDER.filter(x => unlocked(x, all) && !openedBefore.includes(x));
  return { stars, done, first: done && !was.done, newBest: done && result.score > was.best, opened, extrasOpened: !extrasBefore && extrasOpen(all), all };
}

// Which run this visit is. `?run=` names one, if it is open; with no run and
// no other mode named, the address IS the ladder and plays the next run. A run
// that is not open yet falls back to the next one rather than being played
// past the lock by a typed link.
export function resolveRun(params, { live = false, week = false, other = false } = {}, all = loadRuns()) {
  if (live || week) return null;
  const want = params?.get?.('run');
  if (want && BY_ID[want]) return unlocked(want, all) ? BY_ID[want] : BY_ID[nextRun(all)];
  if (other) return null;   // a pinned ?shift=, ?daily, ?shift=random: the classic rules
  return BY_ID[nextRun(all)];
}

// A link to a run: keeps a pinned shift (testers, the bot) and nothing else.
export function runHref(id, search = '') {
  const q = new URLSearchParams(search), out = new URLSearchParams();
  if (q.get('shift')) out.set('shift', q.get('shift'));
  for (const k of ['lang', 'q']) if (q.get(k)) out.set(k, q.get(k));
  if (q.has('classic')) out.set('classic', '');   // v3.0: the real-time ladder stays the real-time ladder
  out.set('run', id);
  return `./?${out}`;
}
