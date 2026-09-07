// Tiny seeded-PRNG kit for daily runs. Full-run determinism is impossible
// (player input diverges the sim immediately) — the dailies' promise is that
// same-day players share the director's unlock schedule and per-pulse pick
// sequences, so only director-level draws use these.

/** Standard mulberry32: returns () => float in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit FNV-1a string hash (>>> 0). */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** UTC date string like '2026-07-11' — everyone shares one board per day. */
export function utcDateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/** Decorrelate per-pulse seeds: raw `seed ^ n` shares low bits between
 *  consecutive pulses; the golden-ratio Math.imul mix scatters them.
 *  n + 1 so pulse 0 isn't the raw seed. */
export function mixSeed(seed, n) {
  return (seed ^ Math.imul(n + 1, 0x9E3779B9)) >>> 0;
}
