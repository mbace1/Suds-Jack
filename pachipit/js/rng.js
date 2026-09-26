// A seeded random stream whose whole state is ONE integer.
//
// mulberry32: small, fast, and — the reason it is this one — its internal state
// is a single uint32 that can be read out and written back. A run saved at a
// shift boundary resumes bit-identical, and a test can fork a stream and prove
// two runs agree. Never Math.random() anywhere in the pure modules.

export function makeRng(seed = 1) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + (b - a) * next(),
    int: (n) => Math.floor(next() * n),          // 0..n-1
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    // a small symmetric wobble, the shape a hand on a handle has
    wobble: (amp) => (next() + next() - 1) * amp,
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    get state() { return s; },
    set state(v) { s = v >>> 0; },
  };
}

// A seed from a word, so a run can be named ("pit-1") and shared.
export function seedOf(text) {
  let h = 2166136261 >>> 0;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
