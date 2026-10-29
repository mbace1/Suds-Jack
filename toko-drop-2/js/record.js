// record.js — the play record (v61): every campaign room a person plays and
// every arcade run, kept on this phone, so a person's runs can be read
// against what the bots say (scripts/record.mjs: the rooms' grade lines,
// docs/LINES.md; the arcade's curve, docs/CURVE.md). What the scorecard still
// waits on is a person (docs/COMPLETION.md), and a person's runs only count
// once they are written down. Nothing leaves the phone unless its player
// shares it: OPTIONS → PLAY RECORD.
//
// One entry a finished attempt, in short keys so the last `cap` stay small
// enough to paste into a chat:
//   a room   { k: 'r', id, h: hard 0|1, g: grade, s: score, o: outcome, y: why,
//              t: seconds, x: hits, kl: kills }
//   a run    { k: 'a' | 'h' (ARCADE, HARDCADE), w: world, n: wave, s: score,
//              t: seconds, won: 0|1, kl: kills, d: [[wave, what], …] the lives lost }
// and on both: v the version, at the local time, i the input (t touch, p pad,
// k keys and mouse), or the screen (l landscape, p portrait). A room or a run
// left from the pause menu is kept too: a room as o: 'quit' with no grade, a
// run with q: 1 — where a person stops is not where they lose.
// Pure: the store is handed in (main.js's), no DOM, no clock but the date given.

const KEY = 'toko2.record', HEAD = 'TOKO DROP 2.0 · PLAY RECORD';
// the version is this module's own cache token, which moves with every release
export const VERSION = Number(new URL(import.meta.url).searchParams.get('v')) || 0;

export function read(store) {
  try { const a = JSON.parse(store.str(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}

// keep the newest `cap`; returns how many are kept
export function add(store, entry, cap) {
  const a = read(store);
  a.push(entry);
  if (a.length > cap) a.splice(0, a.length - cap);
  store.set(KEY, JSON.stringify(a));
  return a.length;
}

export function clear(store) { store.set(KEY, '[]'); }

const two = (n) => String(n).padStart(2, '0');
export const stamp = (d) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;

// the entry for a finished attempt (or, `quit`, one left from the pause
// menu): `w` the sim's world, `mode` the run's, `lost` the lives it lost as
// [wave, what], `how` { input, screen, date }
export function entryFor(w, mode, lost, how, quit = false) {
  const base = { v: VERSION, at: stamp(how.date), i: how.input?.[0] ?? '?', or: how.screen === 'portrait' ? 'p' : 'l' };
  const R = w.roomResult, h = w.room?.hard ? 1 : 0;
  if (R) return { k: 'r', id: R.id, h, g: R.grade, s: R.score, o: R.outcome, y: R.why ?? null, t: R.time, x: R.hits, kl: R.kills, ...base };
  if (w.room) return { k: 'r', id: w.room.id, h, g: null, s: w.score, o: 'quit', y: null, t: Math.round((w.dir?.t ?? w.time) * 10) / 10, x: w.hits || 0, kl: w.kills, ...base };
  return { k: mode === 'hardcade' ? 'h' : 'a', w: w.world || 1, n: w.wave, s: w.score, t: Math.round(w.time), won: w.won ? 1 : 0, kl: w.kills, d: lost.map((x) => [...x]), ...(quit ? { q: 1 } : {}), ...base };
}

// what PLAY RECORD hands over: two lines a person can read, then the runs
export function pack(list, date) {
  const rooms = list.filter((e) => e.k === 'r').length, runs = list.length - rooms;
  return `${HEAD}\n${rooms} rooms · ${runs} arcade runs · v${VERSION} · ${stamp(date)}\n${JSON.stringify({ v: VERSION, runs: list })}`;
}

// …and reading it back (scripts/record.mjs): the JSON after the two lines,
// whatever a chat did to the lines around it
export function unpack(text) {
  const i = text.indexOf('{'), j = text.lastIndexOf('}');
  if (i < 0 || j < i) return null;
  try { const o = JSON.parse(text.slice(i, j + 1)); return Array.isArray(o.runs) ? o : null; } catch { return null; }
}
