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

// ── the tempo ────────────────────────────────────────────────────────────
// Toko is never in a hurry. The house note is Comfortably Numb: heavy-lidded,
// floating, a long way from eager — and with a solo in it, so the calm is not
// the same thing as flat.
//
// This is a brand rule with numbers rather than a vibe, and it lives here so
// every mark in the kit keeps the same time. `pulse` above is the GLITCH
// cadence and stays square and harsh; these two are the resting body of the
// mark and they are smooth.

const smooth = (p) => p * p * (3 - 2 * p);

// The blink. It closes, DWELLS shut, and opens slower than it closed — that
// asymmetry is the whole thing: a symmetrical blink reads awake and a fast one
// reads nervous. Every fourth is a long one, where the eyes stay shut a beat
// past comfortable.
export function blink(t, opts = {}) {
  const { every = 7.5, close = 0.17, hold = 0.12, open = 0.36, offset = 0, longEvery = 4 } = opts;
  const u = (((t + offset) % every) + every) % every;
  const n = Math.floor(((t + offset) / every));
  const h = hold * (longEvery && ((n % longEvery) + longEvery) % longEvery === longEvery - 1 ? 3.4 : 1);
  if (u >= close + h + open) return 0;
  if (u < close) return smooth(u / close);
  if (u < close + h) return 1;
  return 1 - smooth((u - close - h) / open);
}

// The float. A very slow breath under everything — nothing in a Toko mark is
// ever perfectly still, and nothing in one is ever quick either.
export function drift(t, { period = 9, phase = 0 } = {}) {
  return Math.sin((t / period + phase) * Math.PI * 2);
}
