// The mountain, as a function. Every height in the game comes from
// height(x, z), and every slope from normal(x, z) — the renderer tiles it,
// the rider rides it, the snow lands on it, and none of them keep a copy.
//
// Downhill is -z. The field is a long meandering gully (a natural half-pipe
// that keeps a run funnelled without a wall), with dune swells laid over it,
// rollers across the fall line, and a kicker every so often near the line.
// All of it is seeded and pure, so a bare-node test can ask it questions.

export const GRADE = 0.30;        // mean pitch of the fall line (~17°)
export const GULLY_HALF = 42;     // half width of the gully floor before the walls climb

// --- seeded value noise ------------------------------------------------------
export const SEED = 7;

function hash2(ix, iz, seed = SEED) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

export function noise(x, z, seed = SEED) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const u = fade(fx), v = fade(fz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}

export function fbm(x, z, oct = 3, seed = SEED) {
  let s = 0, amp = 1, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    s += noise(x * f, z * f, seed + i * 31) * amp;
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return s / norm;
}

// --- the line ----------------------------------------------------------------
// Where the gully floor sits in x at a given z. It wanders slowly so a run has
// to be steered rather than pointed.
export function lineX(z) {
  return Math.sin(z * 0.0041) * 70 + Math.sin(z * 0.0113 + 1.7) * 26;
}

// Kickers: one candidate every KICK_STEP metres of descent, most of them real.
export const KICK_STEP = 85;
export function kickerAt(k) {
  const r = hash2(k, 11), r2 = hash2(k, 23), r3 = hash2(k, 37);
  if (r < 0.28 || k < 2) return null;                  // a gap, and a clean start
  const z = -k * KICK_STEP - r2 * 30;
  return { z, x: lineX(z) + (r3 - 0.5) * 50, amp: 2.2 + r * 1.8, r: 7 + r2 * 4 };
}

function kickers(x, z) {
  // the two candidates whose bumps could reach this point
  const k0 = Math.floor(-z / KICK_STEP);
  let h = 0;
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const K = kickerAt(k);
    if (!K) continue;
    const dx = x - K.x, dz = z - K.z;
    const d2 = dx * dx + dz * dz * 1.6;               // a little longer across than along
    if (d2 > K.r * K.r * 9) continue;
    h += K.amp * Math.exp(-d2 / (K.r * K.r));
  }
  return h;
}

export function height(x, z) {
  const lx = lineX(z);
  const off = x - lx;
  // the gully: flat-ish floor, walls that climb as a soft quadratic
  const w = Math.max(0, Math.abs(off) - GULLY_HALF);
  // saturating smoothly: a hard cap gave the wall a flat top with a crisp
  // edge, and a crisp edge shows every mesh triangle as a sawtooth on the sky
  const wall = 42 * Math.tanh(0.011 * w * w / 42);
  // long dune swells, and a finer skin of wind ripple
  const swell = fbm(x * 0.0055 + 3.1, z * 0.0055, 3) * 9;
  const skin = fbm(x * 0.03, z * 0.03, 2) * 0.5;
  // rollers across the fall line, their amplitude breathing along the run
  const breathe = 0.5 + 0.5 * Math.sin(z * 0.0021 + 2.0);
  const roll = Math.sin(z * 0.062 + Math.sin(x * 0.01) * 1.5) * 1.6 * breathe;
  return z * GRADE + wall + swell + skin + roll + kickers(x, z);
}

const EPS = 0.35;
export function normal(x, z, out = [0, 1, 0]) {
  const hl = height(x - EPS, z), hr = height(x + EPS, z);
  const hd = height(x, z - EPS), hu = height(x, z + EPS);
  let nx = hl - hr, ny = 2 * EPS, nz = hd - hu;
  const l = Math.hypot(nx, ny, nz);
  out[0] = nx / l; out[1] = ny / l; out[2] = nz / l;
  return out;
}

// --- standing things ---------------------------------------------------------
// Monoliths per tile: a dark slab or an arch stood on the snow, deterministic
// from the tile index so both the renderer and the collision read one truth.
export const TILE = 48;
export function monolithsIn(ix, iz) {
  const out = [];
  const r = hash2(ix, iz, 101);
  if (r > 0.22) return out;
  const x = (ix + hash2(ix, iz, 103)) * TILE;
  const z = (iz + hash2(ix, iz, 107)) * TILE;
  if (Math.abs(x - lineX(z)) < 30 || z > -250) return out;  // never on the line, never at the start
  const arch = hash2(ix, iz, 109) < 0.3;
  const hgt = 6 + hash2(ix, iz, 113) * 14;
  const wid = arch ? 7 + hash2(ix, iz, 127) * 6 : 1.6 + hash2(ix, iz, 127) * 2.4;
  out.push({ x, z, y: height(x, z), h: hgt, w: wid, d: 1.4 + hash2(ix, iz, 131) * 1.2,
    yaw: hash2(ix, iz, 137) * Math.PI, arch });
  return out;
}

export const terrain = { height, normal, lineX, kickerAt, monolithsIn, TILE, GRADE };
export default terrain;
