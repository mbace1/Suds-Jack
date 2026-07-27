// TOKO MIDORI GAMES — the two helpers everything else needs.

// Deterministic RNG. A glitch you cannot reproduce is a bug wearing a costume,
// so every effect in this kit takes a seed and none of them call Math.random.
export function rng(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// still, then a short stutter, then still again — the resting behaviour of
// every mark in the wild. Returns 0..1.
export function pulse(t, { every = 7, len = 0.3, offset = 0 } = {}) {
  const u = (((t + offset) % every) + every) % every / every;
  const win = len / every;
  if (u > win) return 0;
  const p = u / win;
  return (1 - p * p) * (Math.floor(p * 7) % 2 === 0 ? 1 : 0.35);
}
