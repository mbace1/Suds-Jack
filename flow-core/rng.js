// Seeded randomness for the whole simulation.
//
// One rule makes the brief's "identical seed creates identical neutral
// movement in both products" test survive contact with development: a
// subsystem never draws from the shared stream. It forks its own, named.
// Otherwise adding one call to demand spawning shifts every event that comes
// after it, and a seed stops meaning anything the moment anyone edits.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a, so a fork name maps to a stable offset without a table
function hashName(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class Rng {
  constructor(seed, name = 'root') {
    this.seed = seed >>> 0;
    this.name = name;
    this.next = mulberry32(this.seed ^ hashName(name));
  }
  // A named child stream. Same parent seed + same name = same sequence,
  // regardless of how much anybody else drew.
  fork(name) { return new Rng(this.seed, `${this.name}/${name}`); }

  float(lo = 0, hi = 1) { return lo + this.next() * (hi - lo); }
  int(lo, hi) { return Math.floor(this.float(lo, hi + 1)); }   // inclusive
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
}
