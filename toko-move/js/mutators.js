// Toko Move — THE LEVERS A RUN TURNS (v2.70 as the mutators; v2.73 the runs).
//
// v2.70 shipped four mutators as chips on the title card; v2.73 folded them
// into the ladder (runs.js — owner: "Easy, medium, hard and night runs"), so
// Night is a run and the rush and the held line are Medium's and Hard's. What
// stays here is the part both shapes share: each helper reads one field of a
// run (`headway`, `rush`, `startHour`, `halt`, `moods`) and turns a lever the
// game already had — the timetable (live-network.js), the rush (rush.js), the
// clock, a held family (events.js) and the card deck. A run with no such field
// leaves that lever exactly where it was, which is what keeps a classic shift
// (a pinned ?shift=, the daily, the week) playing the game it always played.
//
// Pure: no DOM, no clock — test/runs.mjs holds it in bare node.

// Headways a run provisions every line to (minutes, per mode).
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
