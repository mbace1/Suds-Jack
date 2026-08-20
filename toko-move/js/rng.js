// One seeded stream for the whole run. A layout you cannot reproduce is a
// layout you cannot report a bug about — the seed is printed on the end card.

export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    pick: arr => arr[Math.floor(next() * arr.length)],
    // weight() takes [[item, w], …] so the callers can read as a table
    weight(pairs) {
      let total = 0;
      for (const [, w] of pairs) total += w;
      let r = next() * total;
      for (const [item, w] of pairs) { r -= w; if (r <= 0) return item; }
      return pairs[pairs.length - 1][0];
    },
  };
}
