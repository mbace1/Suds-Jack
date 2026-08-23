// A CITY: a real network, drawn in this game's language.
//
// The owner's direction (CITIES.md) is that "cities" are an adjacent mode, not
// a change to the base game — real public transport on a minimalistic map, in
// the same layers the abstract boards already have. This file is the seam
// between the two, and it is deliberately the ONLY place that knows a stop ever
// had a latitude. Everything downstream still sees board units, because
// otherwise every module in the game learns about geography and none of them
// should.
//
// Two jobs, in order:
//
//   project()     lat/lon -> board units, aspect preserved
//   octolinear()  ...and then bend it until it is a transit diagram
//
// The second one is the interesting half, and it is worth being honest about
// what it is: proper octolinear map generation is an optimisation problem with
// a literature behind it (Nöllenburg & Wolff solve it as an ILP, and it is slow
// enough that Transport for London still draws theirs by hand). This is NOT
// that. It is a relaxation — every leg pushes its two stops toward the nearest
// 45° direction while every stop is pulled back toward where it really is — and
// it is offered as a logical option to be measured rather than a solution. So
// it REPORTS on itself: what fraction of legs came out on the grid, how far the
// stops had to move, and whether any of them landed on top of each other. If
// those numbers are bad on a real city, this approach is wrong and the answer
// is a better one, not a hand-tuned constant.

const TAU = Math.PI * 2;
const OCTO = Math.PI / 4;

// ── the pack ────────────────────────────────────────────────────────────
// What a city pack holds. `scripts/city-pack.mjs` writes one; nothing in the
// game writes one, because a pack is data about the real world and the game
// must not be able to invent it.
//
//   { id, name, source, licence, fetched, modes,
//     stops: [{ id, name, lat, lon, modes }],
//     lines: [{ id, name, mode, colour, stops: [stopId, …] }] }
//
// `source` and `licence` are not decoration. HSL's data is CC BY 4.0 and the
// attribution has to travel with it, so it is a required field and `validate`
// refuses a pack without one.

export function validate(pack) {
  const bad = [];
  if (!pack?.id) bad.push('a pack needs an id');
  if (!pack?.source || !pack?.licence) bad.push('a pack must carry its source and licence — the data is somebody else’s');
  const stops = pack?.stops ?? [];
  if (!stops.length) bad.push('a pack with no stops is not a city');
  const seen = new Set();
  for (const s of stops) {
    if (seen.has(s.id)) bad.push(`two stops share the id "${s.id}"`);
    seen.add(s.id);
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lon)) bad.push(`stop "${s.id}" has no position`);
    if (Math.abs(s.lat) > 90 || Math.abs(s.lon) > 180) bad.push(`stop "${s.id}" is not on Earth`);
  }
  for (const l of pack?.lines ?? []) {
    if ((l.stops?.length ?? 0) < 2) bad.push(`line "${l.id}" does not go anywhere`);
    for (const id of l.stops ?? []) if (!seen.has(id)) bad.push(`line "${l.id}" calls at "${id}", which is not in the pack`);
  }
  if (bad.length) throw new Error(`city "${pack?.id ?? '?'}": ${bad.join('; ')}`);
  return pack;
}

// ── projection ──────────────────────────────────────────────────────────
// Equirectangular with the latitude correction, which is the right amount of
// maths for the job: over a city-sized box it differs from a proper Mercator by
// far less than the width of the line we are about to draw, and it does not
// bend straight streets. Anything grander would be precision this game cannot
// use.

export function project(pack, board) {
  const stops = pack.stops;
  const lat0 = stops.reduce((a, s) => a + s.lat, 0) / stops.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const raw = stops.map(s => ({ id: s.id, x: s.lon * k, y: -s.lat }));

  const xs = raw.map(p => p.x), ys = raw.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);

  const m = board.margin ?? 40;
  const w = Math.max(1e-9, x1 - x0), h = Math.max(1e-9, y1 - y0);
  // ONE scale for both axes. Fitting each axis to its own range would stretch
  // the city to fill the board, which is the difference between a map of
  // somewhere and a picture of a network — and a stretched city cannot be
  // recognised by somebody who lives in it.
  const scale = Math.min((board.w - 2 * m) / w, (board.h - 2 * m) / h);
  const ox = (board.w - w * scale) / 2, oy = (board.h - h * scale) / 2;

  const out = new Map();
  for (const p of raw) out.set(p.id, { x: ox + (p.x - x0) * scale, y: oy + (p.y - y0) * scale });
  return out;
}

// ── octolinear relaxation ───────────────────────────────────────────────
// `at` is the map project() returned; it is not modified. `minLeg` stops two
// consecutive calls collapsing onto each other, `pull` is how hard a stop is
// held to where it really is, and `bend` is how hard a leg insists on the grid.
// Turn `pull` to 0 and you get a tidy diagram of nowhere; turn `bend` to 0 and
// you get a map. The whole design of this mode lives in that ratio.

export function octolinear(at, lines, opts = {}) {
  // Measured, on a synthetic city with a real one's shape — six radial trunks
  // and a ring, 86 stops, stops every ~400m, wiggled off straight the way a
  // tram that follows streets is. Sweeping the two weights:
  //
  //   bend  pull    legs on the grid   mean drift   worst
  //   0.50  0.12          24%             2.8        8.1
  //   0.85  0.04          63%             4.5       11.5
  //   0.95  0.010         91%             5.8       18.2
  //   0.98  0.004        100%             6.2       21.1   ← converged by 400
  //
  // So the whole network reaches the grid while the average stop moves 6 units
  // on an 860-wide board — under one per cent of the width, which is the
  // number that decides whether somebody who lives there still recognises it.
  // Turn `pull` to 0 and you get a tidy diagram of nowhere; turn `bend` to 0
  // and you get a map. This mode lives in that ratio.
  const rounds = opts.rounds ?? 400;
  const bend = opts.bend ?? 0.98;
  const pull = opts.pull ?? 0.004;
  const minLeg = opts.minLeg ?? 18;

  const truth = new Map([...at].map(([id, p]) => [id, { ...p }]));
  const pos = new Map([...at].map(([id, p]) => [id, { ...p }]));

  // every leg, once, however many lines share it — a shared leg pulled twice as
  // hard would bend the trunk of the network and leave the branches behind
  const legs = [];
  const seenLeg = new Set();
  for (const line of lines) {
    for (let i = 1; i < line.stops.length; i++) {
      const a = line.stops[i - 1], b = line.stops[i];
      if (a === b) continue;
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seenLeg.has(k)) continue;
      seenLeg.add(k);
      legs.push([a, b]);
    }
  }

  const push = new Map();
  for (const id of pos.keys()) push.set(id, { x: 0, y: 0 });

  for (let r = 0; r < rounds; r++) {
    for (const f of push.values()) { f.x = 0; f.y = 0; }

    for (const [ida, idb] of legs) {
      const a = pos.get(ida), b = pos.get(idb);
      if (!a || !b) continue;
      const want = snap(a, b, minLeg);
      // half the correction to each end: moving only the far one would walk the
      // whole line away from its first stop, one leg at a time
      const ex = (want.x - (b.x - a.x)) / 2, ey = (want.y - (b.y - a.y)) / 2;
      const fa = push.get(ida), fb = push.get(idb);
      fa.x -= ex * bend; fa.y -= ey * bend;
      fb.x += ex * bend; fb.y += ey * bend;
    }

    for (const [id, p] of pos) {
      const t = truth.get(id), f = push.get(id);
      p.x += f.x + (t.x - p.x) * pull;
      p.y += f.y + (t.y - p.y) * pull;
    }
  }

  return { at: pos, report: report(pos, truth, legs, opts) };
}

// the nearest octolinear vector to a→b, keeping the length it already has
// ALONG that direction rather than the length it had — projecting is what stops
// a leg growing every time it is snapped
function snap(a, b, minLeg) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const ang = Math.round(Math.atan2(dy, dx) / OCTO) * OCTO;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const len = Math.max(minLeg, dx * ux + dy * uy);
  return { x: ux * len, y: uy * len };
}

// ── the honest part ─────────────────────────────────────────────────────
// Everything this returns is a number somebody can argue with.
export function report(pos, truth, legs, opts = {}) {
  const tol = ((opts.tolDeg ?? 2) * Math.PI) / 180;
  let onGrid = 0, worstAngle = 0;
  for (const [ida, idb] of legs) {
    const a = pos.get(ida), b = pos.get(idb);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    let off = Math.abs(ang - Math.round(ang / OCTO) * OCTO);
    off = Math.min(off, Math.abs(TAU - off));
    if (off <= tol) onGrid++;
    worstAngle = Math.max(worstAngle, off);
  }

  let drift = 0, worstDrift = 0;
  for (const [id, p] of pos) {
    const t = truth.get(id);
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    drift += d;
    worstDrift = Math.max(worstDrift, d);
  }

  // Stops on top of each other is the failure a picture shows and a percentage
  // hides, so it is counted rather than eyeballed. Note what the measurement
  // said, though: the synthetic city has two collisions BEFORE anything is
  // bent, and bending adds one. Most of this number is the city — real stops
  // that are genuinely a few metres apart — which means a real pack wants an
  // interchange-merging pass, the thing every printed transit map already does.
  const near = opts.tooClose ?? 12;
  const ids = [...pos.keys()];
  let collisions = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = pos.get(ids[i]), b = pos.get(ids[j]);
      if (Math.hypot(a.x - b.x, a.y - b.y) < near) collisions++;
    }
  }

  return {
    legs: legs.length,
    onGrid: legs.length ? onGrid / legs.length : 1,
    worstAngleDeg: (worstAngle * 180) / Math.PI,
    drift: pos.size ? drift / pos.size : 0,
    worstDrift,
    collisions,
  };
}

// ── the whole job ───────────────────────────────────────────────────────
// A pack in, something the renderer already understands out. Nothing below this
// line knows the city was real.
export function layout(pack, board, opts = {}) {
  validate(pack);
  const projected = project(pack, board);
  const { at, report: rep } = octolinear(projected, pack.lines, opts);
  return {
    stops: pack.stops.map(s => ({ ...s, ...at.get(s.id), truth: projected.get(s.id) })),
    lines: pack.lines,
    report: rep,
  };
}
