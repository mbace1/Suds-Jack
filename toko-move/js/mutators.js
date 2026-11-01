// Toko Move — MUTATORS (v2.70; toko-move/art/itch-bible/MUTATORS.md).
//
// A mutator is a whole-run rule or skin over the real HSL board, and a run
// wears ONE. The bible's own limits are kept here as the shape of the table:
// a mutator never changes the verbs (wait, catch, ride, transfer, walk), never
// adds a currency and never draws a route line — so every entry below is a
// setting on a lever the game already has: the skin (skin.js), the start of the
// clock, the headway every line is provisioned to (live-network.js), the rush
// (rush.js), the weather (weather.js), a held line (events.js), and which mood
// of card the director deals.
//
// Itch v1 ships the four core mutators, available from the first run. The six
// unlocks stay in the bible until there is a meta to unlock them with.
//
// Pure: no DOM, no clock — test/mutators.mjs holds it in bare node.

// moods: a weight per card mood (events.js MOODS); 1 is the ordinary draw, a
// mood missing from the table is 1. The bible's "up" is 2, its "down" is 0.5.
export const MUTATORS = [
  { id: 'night', name: 'NIGHT', glyph: '☾', blurb: 'The same city at 23:00, with fewer trams and the lines lit like neon.',
    skin: 'night', startHour: 23, headway: 2, rush: 'off',
    moods: { info: 2, notice: 2, opportunity: 0.5 } },
  { id: 'disruption', name: 'DISRUPTION', glyph: '⊘', blurb: 'One line is halted, and the network routes around the hole.',
    halt: { atMin: 10, recoverJobs: 2, minutes: [28, 44] },
    moods: { warning: 2, notice: 2 } },
  { id: 'rush', name: 'RUSH HOUR', glyph: '⇶', blurb: 'Everything runs often, everything is full, and everyone is in your way.',
    headway: 0.6, rush: 'max',
    moods: { warning: 2, notice: 2 } },
  { id: 'snow', name: 'SNOW DAY', glyph: '❄', blurb: 'First snow: slower feet, slower trams, kinder people.',
    skin: 'snow', weather: 'snow',
    moods: { opportunity: 2, info: 2 } },
];
export const BY_ID = Object.fromEntries(MUTATORS.map(m => [m.id, m]));

// Which mutator this visit wears. `?mutator=` names one; nothing else turns one
// on. LIVE is the real city and brings its own (and a mutator that moved the
// clock would contradict the clock on the wall); a WEEK is its own run with its
// own five mornings. Unknown ids are no mutator, never an error.
export function resolveMutator(params, { live = false, week = false } = {}) {
  if (live || week) return null;
  return BY_ID[params?.get?.('mutator')] || null;
}

// The run's shift: a mutator on today's address is today's CITY (the daily's
// seed) but not the daily — the daily is the one result everybody compares, so
// a run under a mutator is never recorded as it. A pinned or random shift
// keeps its kind; the mutator rides along on it.
export function mutateShift(info, mut) {
  if (!mut || info?.kind !== 'daily') return info;
  return { ...info, kind: 'mutator', mutator: mut.id };
}

// Headways a mutator provisions every line to (minutes, per mode).
export function headwayWith(mut, base) {
  if (!mut?.headway || mut.headway === 1) return base;
  const out = {}; for (const k of Object.keys(base)) out[k] = base[k] * mut.headway; return out;
}

// The rush under a mutator: 'off' forces it off, 'max' pins the load at its
// peak for the whole shift, anything else leaves the ordinary curve alone.
export function rushWith(mut, on, load) {
  if (mut?.rush === 'off') return { on: false, load: () => 0 };
  if (mut?.rush === 'max') return { on: true, load: () => 1 };
  return { on, load };
}

// The clock's first minute of the day.
export function startMinute(mut, startHour) { return (mut?.startHour ?? startHour) * 60; }

// The halted family for a Disruption run: seeded, one of the tram families
// actually on the board, never the metro (the bible's "safe spine"). Returns
// null on a board with no trams.
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function haltFamily(seed, families) {
  const list = [...new Set(families)].filter(f => f && !/^M/i.test(f)).sort((a, b) => (parseInt(a) || 99) - (parseInt(b) || 99) || String(a).localeCompare(b));
  return list.length ? list[hash(`halt:${seed}`) % list.length] : null;
}
// How long the halt lasts if two jobs do not lift it first, in game minutes.
export function haltMinutes(seed, mut) {
  const [lo, hi] = mut?.halt?.minutes || [30, 30]; return lo + (hash(`haltlen:${seed}`) % (hi - lo + 1));
}

// A mood-weighted pick over a list of cards, deterministic in `k` — the same
// k always picks the same card, so a seed still deals one schedule. With no
// weights it is exactly `cards[k % cards.length]`, the director's old draw.
export function pickWeighted(cards, k, moods = null) {
  if (!moods) return cards[k % cards.length];
  const w = cards.map(c => Math.max(0, moods[c.mood] ?? 1)), total = w.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return cards[k % cards.length];
  let r = (k % 10007) / 10007 * total;
  for (let i = 0; i < cards.length; i++) { r -= w[i]; if (r < 0) return cards[i]; }
  return cards[cards.length - 1];
}
