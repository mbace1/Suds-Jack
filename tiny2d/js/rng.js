// ── Seeded RNG ─────────────────────────────────────────────────────────────
// mulberry32 — small, fast, good enough for level generation. Everything
// procedural in Tiny Hawk draws from one of these so a seed fully determines a
// course (design doc §6: the Daily Line needs bit-identical terrain for
// everyone, and Endless needs a "replay that seed" affordance).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Today's UTC date as a stable integer seed — same course worldwide per day.
export function dailySeed(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return (y * 10000 + m * 100 + d) >>> 0;
}

// A fresh seed for an Endless run, shown to the player so a good one can be
// re-rolled deliberately.
export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
