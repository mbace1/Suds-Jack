// Colour, and the hour. The run is one afternoon: dawn-gold at the top of the
// mountain, full light through the middle, dusk at the bottom. Everything that
// draws asks `hour(p)` for its colours at progress p (0..1) rather than
// keeping any, so the whole world turns together.
//
// The register is Journey and Sword of the Sea: snow lit in warm rose-cream,
// shadowed in cool lavender-blue, a sky that is peach at the horizon and deep
// at the zenith, and one small figure in deep red against all of it.

const hex = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const KEYS = [
  { p: 0.00, zenith: 0x3b4f80, horizon: 0xf3b58c, sun: 0xffe2c4, lit: 0xf7e5d8, shade: 0x8e9bd2, elev: 0.36, az: 0.95 },
  { p: 0.40, zenith: 0x5378b4, horizon: 0xf6d2a8, sun: 0xfff3dd, lit: 0xfcf2ea, shade: 0x9aaee0, elev: 0.55, az: 0.75 },
  { p: 0.75, zenith: 0x3d4a8a, horizon: 0xf4a284, sun: 0xffd2b0, lit: 0xf6dcd3, shade: 0x7a7fbe, elev: 0.28, az: 0.90 },
  { p: 1.00, zenith: 0x22254c, horizon: 0xd9718d, sun: 0xffb39e, lit: 0xe6c7d2, shade: 0x585a98, elev: 0.09, az: 1.10 },
];
const FIELDS = ['zenith', 'horizon', 'sun', 'lit', 'shade'];

export const RIDER = { robe: 0x8a2c2a, robeDark: 0x5c1c1e, hood: 0x6c2022, scarf: 0xf2e0c2, scarfDark: 0xb9532f, board: 0x2b2531, boardTop: 0x3a3340 };
export const STONE = 0x2d2b3d;

export function hour(p) {
  p = Math.max(0, Math.min(1, p));
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = (p - a.p) / (b.p - a.p);
  const k = t * t * (3 - 2 * t);
  const out = {};
  for (const f of FIELDS) {
    const A = hex(a[f]), B = hex(b[f]);
    out[f] = [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
  }
  const elev = a.elev + (b.elev - a.elev) * k, az = a.az + (b.az - a.az) * k;
  // the sun sits ahead and to the right, low enough to model every dune
  const ce = Math.cos(elev);
  out.sunDir = [Math.sin(az) * ce, Math.sin(elev), -Math.cos(az) * ce];
  out.fog = out.horizon;
  out.fogDensity = 0.0062;
  return out;
}
