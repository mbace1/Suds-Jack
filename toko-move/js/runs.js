// Toko Move — THE RUNS (v2.73; owner, 2026-11-01: "a much more structured
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
// MEASURED, not guessed (`node test/shifts.cjs --runs=12`: twelve fresh shifts
// of each run, a sensible bot and a naive one — completed, sensible / naive):
//   EASY   3 jobs, deadlines ×1.5    12/12 · 12/12
//   MEDIUM 4 jobs                    12/12 · 10/12
//   HARD   5 jobs, rush, line down   12/12 ·  6/12   (on time: 4/12 sensible)
//   NIGHT  5 jobs, 23:00, ×2 waits   12/12 ·  5/12
// so a player who reads the board can clear the ladder, and one who taps the
// first thing on it is stopped higher up each rung. Medium was 3 jobs at first
// and measured flat against Easy (12/12 both); Hard's first deadline of ×0.9
// left 3/12 on time, which made two stars a rumour; Night at 4 jobs was easier
// than Hard for the naive player. Par is about the sensible bot's 70th
// percentile of completed scores, so three stars ask for a good shift.
//
// Pure apart from the save: test/runs.mjs holds it in bare node.

export const RUNS = [
  { id: 'easy', name: 'EASY', title: 'First shift', glyph: '①',
    blurb: 'Three plain parcels, a generous clock, a quiet city.',
    target: 3, deadline: 1.5, cargo: ['documents', 'parts'], board: 'short', encounters: 1, places: ['stop', 'aboard'],
    moods: { opportunity: 3, info: 2, warning: 0, notice: 0 }, disruptions: 0,
    rush: 'off', weather: 'clear', cityDay: false, rival: false, sealed: false, par: 1000 },
  { id: 'medium', name: 'MEDIUM', title: 'A morning', glyph: '②',
    blurb: 'Four jobs, every kind of parcel, the morning rush, and the city happening to you.',
    target: 4, deadline: 1, cargo: null, encounters: 3, moods: null,
    rush: null, weather: null, cityDay: true, rival: true, sealed: true, par: 1600 },
  { id: 'hard', name: 'HARD', title: 'Rush hour, one line down', glyph: '③',
    blurb: 'Five jobs at the height of the rush, with one tram line halted.',
    target: 5, deadline: 1, cargo: null, encounters: 3, moods: { warning: 2, notice: 2 },
    headway: 0.6, rush: 'max', weather: null, cityDay: false,
    halt: { atMin: 10, recoverJobs: 2, minutes: [28, 44] }, rival: true, sealed: true, par: 2000 },
  { id: 'night', name: 'NIGHT', title: 'Last service', glyph: '☾',
    blurb: 'Five jobs from 23:00, half the trams, the lines lit like neon.',
    target: 5, deadline: 0.9, cargo: null, encounters: 3, moods: { info: 2, notice: 2, opportunity: 0.5 },
    skin: 'night', startHour: 23, headway: 2, rush: 'off', weather: 'clear', cityDay: false,
    rival: true, sealed: true, par: 1850 },
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
export function starsFor(run, { delivered, target, late, score }) {
  if (!(delivered >= target)) return 0;
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
  out.set('run', id);
  return `./?${out}`;
}
