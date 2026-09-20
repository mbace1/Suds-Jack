// The mountain, as a function. Every height in the game comes from
// height(x, z), and every slope from normal(x, z) — the renderer tiles it,
// the rider rides it, the snow lands on it, and none of them keep a copy.
//
// Downhill is -z. The field is a long meandering gully (a natural half-pipe
// that keeps a run funnelled without a wall), with dune swells laid over it,
// rollers across the fall line, and a kicker every so often near the line.
// All of it is seeded and pure, so a bare-node test can ask it questions.

import { pack } from './snowpack.js?v=1';

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
  // A take-off has to sit IN the channel. The spread was a flat 50 m, which was
  // right while the channel was always 42 m wide and put kickers 25 m up the
  // wall the moment the couloir narrowed it to 17 — measured, three of them had
  // NEGATIVE prominence: not bumps, just less wall. The spread is the chapter's.
  const spread = Math.min(50, chapter(z).gully * 1.15);
  return { z, x: lineX(z) + (r3 - 0.5) * spread, amp: 2.2 + r * 1.8, r: 7 + r2 * 4 };
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

// --- the chapters ------------------------------------------------------------
// One run used to be one formula from top to bottom: a gully, dunes, rollers,
// kickers, and nothing changing in 2,400 m except the light. A chapter is not a
// new system — it is the SAME formula with its own numbers, blended along z, so
// the renderer, the rider, the snow, the collision and the sun occlusion all
// read one surface and none of them has to know a chapter exists.
//
// Each one has to change the SHAPE and the SNOW, not just the colour, or it is
// a paint job: an open bowl to drop into, the gully the game was, a couloir that
// closes to a corridor, a scoured glacier bench cut by crevasses, and a wide
// dusk field with the deepest snow of the run.
export const CHAPTERS = [
  { at:    0, name: 'bowl',    gully: 62, wall: 0.0065, deep: 0.55, swell: 1.35, roll: 0.7, crev: 0 },
  { at:  500, name: 'gully',   gully: 42, wall: 0.0110, deep: 1.00, swell: 1.00, roll: 1.0, crev: 0 },
  { at: 1000, name: 'couloir', gully: 17, wall: 0.0520, deep: 0.38, swell: 0.35, roll: 1.4, crev: 0 },
  { at: 1500, name: 'glacier', gully: 88, wall: 0.0090, deep: 0.22, swell: 0.55, roll: 0.5, crev: 1 },
  // 1.15 and not more, and the ceiling is measured: past about 1.2 the rider
  // stops PLANING in it. Swept at the deepest drift — 1.40 settles at 7.8 m/s
  // and plane 0.63, 1.25 at 9.7, 1.15 at 11.0 and plane 0.82 — so the run-out
  // is as deep as the float model can still lift a board out of, which is the
  // whole point of it being the payoff rather than a slog.
  { at: 2000, name: 'runout',  gully: 70, wall: 0.0095, deep: 1.15, swell: 1.55, roll: 0.9, crev: 0 },
];
const CH_KEYS = ['gully', 'wall', 'deep', 'swell', 'roll', 'crev'];

// Smoothstep between the two chapters this depth falls between. A hard switch
// would put a step in the ground, and a step in the ground is a wall you cannot
// see — every boundary has to be rideable without knowing it is there.
export function chapter(z) {
  const d = -z;
  let i = 0;
  while (i < CHAPTERS.length - 2 && d > CHAPTERS[i + 1].at) i++;
  const a = CHAPTERS[i], b = CHAPTERS[i + 1];
  const t = Math.max(0, Math.min(1, (d - a.at) / (b.at - a.at)));
  const k = t * t * (3 - 2 * t);
  const out = { name: k < 0.5 ? a.name : b.name, from: a.name, to: b.name, blend: k };
  for (const f of CH_KEYS) out[f] = a[f] + (b[f] - a[f]) * k;
  return out;
}

// --- crevasses ---------------------------------------------------------------
// The glacier's teeth, and the run's first real hazard. A crevasse is a slot cut
// ACROSS the fall line — and it needs no new physics at all, which is the point:
// the rider is already thrown into the air whenever the ground drops away faster
// than gravity, and already tumbles on a landing whose impact is large enough.
// So SPEED is the answer to a crevasse — carry it and you sail the gap, crawl at
// it and you drop in and meet the far wall. That inverts the powder chapters,
// where speed is the thing you give up, and it falls straight out of the model.
//
// Each one spans a limited stretch of x, so going round the end is always a
// route; the walls are saturated rather than cut, both because a vertical face
// cannot be drawn by a 2.4 m mesh and because a cliff in the height function is
// a discontinuity every reader of it has to cope with.
export const CREV_STEP = 52;
export function crevasseAt(k) {
  const r = hash2(k, 211), r2 = hash2(k, 223), r3 = hash2(k, 227), r4 = hash2(k, 229);
  if (r < 0.42) return null;
  const z = -k * CREV_STEP - r2 * 26;
  return {
    z, half: 2.4 + r3 * 1.6,            // half the gap across, 2.4-4.0 m
    drop: Math.min(2.6 + r * 2.6, CREV_MAX_DROP),   // capped so it always drains
    x: lineX(z) + (r4 - 0.5) * 150,     // where along the slope it sits
    span: 45 + r3 * 80,                 // and how far it reaches before it ends
  };
}

function crevasses(x, z, w) {
  if (w <= 0.001) return 0;
  const k0 = Math.round(-z / CREV_STEP);
  let cut = 0;
  for (let k = k0 - 1; k <= k0 + 1; k++) {
    const C = crevasseAt(k);
    if (!C) continue;
    // The two walls are NOT the same, and that asymmetry is what stops a
    // crevasse being a trap. You arrive from uphill, so the lip you drop over
    // (z above C.z) is steep — that is the hazard. The far wall is the one you
    // have to get out over, and a slot with two steep walls is a hole the run
    // ENDS in: measured, the rider sat at the bottom at 1,380 m with the clock
    // still running, which is worse than dying. The far side ramps out at less
    // than the mountain's own grade, so falling in costs you everything you had
    // — the tumble, the speed, the flow — and costs you the run nothing.
    const dz = z - C.z;
    const up = dz > 0;
    const wall = up ? WALL_UP : WALL_DOWN;
    const a = Math.abs(dz);
    if (a > C.half + wall) continue;
    const u = a <= C.half ? 0 : (a - C.half) / wall;
    const down = 1 - u * u * (3 - 2 * u);
    // along the slope: it ends, and the ends taper so there is no cliff in x
    const dx = Math.abs(x - C.x);
    if (dx > C.span) continue;
    const e = Math.max(0, Math.min(1, (C.span - dx) / END));
    const along = e * e * (3 - 2 * e);
    cut += C.drop * down * along;
  }
  return cut * w;
}
const WALL_UP = 2.4;     // the lip you drop over: steep, so it reads as a drop
const WALL_DOWN = 24;    // the far side: the ramp you get out on
const END = 9;           // metres of x the ends taper over
// NO LIP, and the three measurements that killed the idea. A crevasse is very
// hard to SEE from a chase camera on a 17-degree slope — rendered and looked at,
// a 4.6 m slot 26 m ahead is simply not there — so a windward ridge was built to
// announce it, which is what real crevasses have. It does not work, twice over:
// at a height that reads (2.57 m proud) the run sticks behind it at 1,370 m, and
// at a height that does not read it STILL traps, because a ridge across the fall
// line has a crest, and a crest is a line of zero gradient you can balance on —
// the playthrough's pilot stopped dead on one at 1,416 m with every metre ahead
// of it lower. Crevasses stay under-telegraphed, and that is recorded in
// VERSIONS.md as an open question rather than papered over with a ridge.
// THE RULE THAT STOPS A CREVASSE BEING A PIT, and it is arithmetic rather than
// taste. Over the ramp the mountain itself descends `GRADE * WALL_DOWN`; if the
// slot is deeper than that, its far lip stands ABOVE the floor you are on and
// no amount of ramp gets you out — measured, a 5-8 m drop over a 17 m ramp left
// the far wall 5.6 m up over 15 m against 4.5 m of grade, and the rider sat at
// the bottom of it with the clock running. The cap is derived so the geometry
// cannot be made a trap by picking a bigger number.
export const CREV_MAX_DROP = GRADE * WALL_DOWN * 0.7;

// THE GROUND — the firm floor under the snowpack. Nothing rides on this; it is
// what the snow lies on and what you bottom out against.
export function base(x, z) {
  const C = chapter(z);
  const lx = lineX(z);
  const off = x - lx;
  // the gully: flat-ish floor, walls that climb as a soft quadratic. Its width
  // and steepness are the chapter's — a couloir is this same wall brought in.
  const w = Math.max(0, Math.abs(off) - C.gully);
  // saturating smoothly: a hard cap gave the wall a flat top with a crisp
  // edge, and a crisp edge shows every mesh triangle as a sawtooth on the sky
  const wall = 42 * Math.tanh(C.wall * w * w / 42);
  // long dune swells, and a finer skin of wind ripple
  const swell = fbm(x * 0.0055 + 3.1, z * 0.0055, 3) * 9 * C.swell;
  const skin = fbm(x * 0.03, z * 0.03, 2) * 0.5;
  // rollers across the fall line, their amplitude breathing along the run
  const breathe = 0.5 + 0.5 * Math.sin(z * 0.0021 + 2.0);
  const roll = Math.sin(z * 0.062 + Math.sin(x * 0.01) * 1.5) * 1.6 * breathe * C.roll;
  return z * GRADE + wall + swell + skin + roll + kickers(x, z) - crevasses(x, z, C.crev);
}

// THE SNOWPACK — how deep the loose snow lies over that floor, and the whole
// reason the game has a second dimension to it. Wind loads the gully and
// scours the walls, a packed line is beaten down the middle where everyone
// rides, and slow drifts make the depth worth reading rather than memorising.
// A kicker is a stamped, firm lip: you cannot build a take-off out of powder.
export const DEEP = 2.7;              // metres in the deepest loaded pockets
export const PACKED_HALF = 9;         // half width of the beaten line

// The snow the mountain laid down, before anyone rode it. `depth` is this plus
// whatever the board has since pushed around; keep them separate because the
// snowpack may only displace snow that is ACTUALLY there, so it has to be able
// to ask what was there without asking itself.
export function natural(x, z) {
  const C = chapter(z);
  const off = Math.abs(x - lineX(z));
  const bowl = Math.exp(-(off * off) / (2 * 58 * 58));      // the gully collects
  const packed = Math.exp(-(off * off) / (2 * PACKED_HALF * PACKED_HALF));
  const drift = 0.55 + 0.45 * fbm(x * 0.0075 + 11.3, z * 0.0075 - 4.1, 2);
  // the chapter's own loading: a couloir is scoured, a glacier is bare ice with
  // a dusting, the run-out is where everything the wind carried ends up
  let d = DEEP * C.deep * bowl * drift * (1 - 0.82 * packed);
  const lip = kickers(x, z);
  if (lip > 0.05) d *= Math.max(0.12, 1 - lip * 0.8);       // take-offs are firm
  // nothing lies over a crevasse: the edge is bare, which is what lets you SEE
  // one coming rather than discovering it under the snow
  if (C.crev > 0.001) {
    const cut = crevasses(x, z, 1);
    if (cut > 0.05) d *= Math.max(0, 1 - cut * 0.5);
  }
  return d < 0 ? 0 : d;
}

// THE LOOSE SNOW AS IT IS NOW. The rider's displacement is a term in HERE rather
// than in `height`, and that is the whole reason the rest of the game needed no
// telling: `depth` is already what the board sinks into, what decides whether an
// edge can bite, what cushions a landing and what the score is keyed to. So your
// own trench is shallower snow — faster, and it grips — and the berm you threw
// is deeper. Clamped at zero, so a carve can never cut into the firm floor.
export function depth(x, z) {
  const d = natural(x, z) + pack.at(x, z);
  return d < 0 ? 0 : d;
}

// THE SURFACE — what you see, what the snow settles on, and what the rider
// sinks INTO. Everything that draws or collides wants this one.
export function height(x, z) {
  return base(x, z) + depth(x, z);
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

// --- the sun on the ground ---------------------------------------------------
// How much of the sun a point sees: a horizon march along the sun's azimuth over
// the height function. 1 is full sun, 0 is the lee of a wall. Baked per vertex
// when a tile is built, so the far field carries the shadow of every swell and
// gully wall without a shadow map — the sun moves slowly enough down the run
// that a tile keeps its bake for the metres it is on screen.
const OCC_STEPS = [1.2, 2.4, 4.2, 7, 11, 17, 26, 40];
export function occlusion(x, z, sun, y = height(x, z)) {
  const hz = Math.hypot(sun[0], sun[2]) || 1e-6;
  const ux = sun[0] / hz, uz = sun[2] / hz;
  const tanE = sun[1] / hz;
  const y0 = y + 0.12;                        // a hair above the surface: no acne on the flat
  let maxTan = -10;
  for (let i = 0; i < OCC_STEPS.length; i++) {
    const d = OCC_STEPS[i];
    const h = height(x + ux * d, z + uz * d);
    const t = (h - y0) / d;
    if (t > maxTan) maxTan = t;
  }
  // a soft edge: the sun is a disc, and a hard line on a 2 m grid is a sawtooth
  const k = (maxTan - tanE + 0.05) / 0.16;
  const shade = k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  return 1 - shade;
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

export const terrain = { height, base, depth, natural, pack, normal, occlusion, lineX, kickerAt, crevasseAt, chapter, monolithsIn, TILE, GRADE, DEEP };
export default terrain;
