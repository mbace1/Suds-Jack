// rng.js — the one source of chance in the simulation.
//
// mulberry32: tiny, fast, and its whole state is one 32-bit integer, so a run
// can be snapshotted and resumed bit-identically (the daily seed and any
// replay depend on that). Never call Math.random() in js/sim/: a run that is
// not reproducible from its seed is a bug that cannot be shown to anyone.

export function makeRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,                                         // [0, 1)
    range: (a, b) => a + (b - a) * next(),        // [a, b)
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),  // [a, b] inclusive
    pick: (list) => list[Math.floor(next() * list.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    get state() { return s; },
    set state(v) { s = v >>> 0; },
  };
}

// A day's seed: the same number for everyone, all day, in UTC — the daily
// night runs identically on every device. The caller passes the date; the
// simulation itself never reads a clock.
export function dailySeed(date) {
  const key = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  let h = 2166136261 >>> 0;                       // FNV-1a over the yyyymmdd digits
  for (const ch of String(key)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
