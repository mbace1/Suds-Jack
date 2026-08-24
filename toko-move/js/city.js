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
//
// ── AND THEY WERE BAD. Measured 2026-08-24 on real HSL geometry for Kallio
// (65 stations, 82 legs): 46% of legs on the grid against 100% on the synthetic
// city, and a mean drift of 8% of the board against 0.7%. Eight sweeps of every
// weight changed nothing — more rounds oscillate (46 → 54 → 50) rather than
// converge.
//
// The reason is countable: 34 of the 65 stations have MORE THAN FOUR legs
// meeting at them. An octolinear node has eight directions to hand out, a real
// interchange wants more of them than are free, and every leg is constrained at
// its far end too. A LOCAL relaxation cannot see that — it satisfies one node by
// breaking its neighbour. This is why the literature solves octolinear layout as
// an integer program: it is a global combinatorial problem in local clothing.
//
// So this needs REPLACING rather than tuning, and it is kept meanwhile because
// the street view (which does not bend anything) is what a real city can use
// today. CITIES.md has the table. Do not spend a day on the constants.

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
  for (const w of pack?.streets ?? []) {
    if ((w.pts?.length ?? 0) < 2) bad.push('a street with fewer than two points is not a street');
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

// Returns the stop positions AND the transform that made them, because a
// street view has to put the line's own path and the roads under it through the
// very same one. Two projections that disagree by a pixel are a tram running
// beside its street.
export function projector(pack, board) {
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

  const toBoard = (lat, lon) => ({
    x: ox + (lon * k - x0) * scale,
    y: oy + (-lat - y0) * scale,
  });

  const out = new Map();
  for (const p of raw) out.set(p.id, { x: ox + (p.x - x0) * scale, y: oy + (p.y - y0) * scale });
  // metres per board unit, which is what a street view needs to draw a road at
  // a believable width instead of a guessed one
  return { at: out, toBoard, scale, metresPerUnit: 111320 / scale };
}

export function project(pack, board) { return projector(pack, board).at; }

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
  // …and the third weight, which the first render demanded. Snapping alone
  // keeps each leg's own length, so a stretch where the real stops are 200m
  // apart comes out as a staircase of tiny steps beside a neighbour with one
  // long one — legible as geometry, illegible as a diagram. Every printed
  // transit map evens the spacing out; this pulls each leg toward the MEDIAN
  // leg (not the mean, which one long suburban run drags), and `even` is how
  // far. At 1 every leg is the same length and the map is gone.
  //
  //   even  legs on grid  spread  mean drift  worst
  //   0         100%       0.308      6.7      26.3
  //   0.15      100%       0.060     13.9      34.0   ← the knee
  //   0.45      100%       0.024     15.5      39.2
  //   1.00      100%       0.011     15.5      41.2
  //
  // 0.15 buys five sixths of the evenness for half the drift the rest costs;
  // past it the spacing barely improves and the city keeps walking. Measured on
  // a synthetic network whose stops are deliberately NOT evenly spaced — close
  // together in the middle, far apart at the ends, which is how a city is.
  const even = opts.even ?? 0.15;

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

  const lens = legs.map(([a, b]) => {
    const p = pos.get(a), q = pos.get(b);
    return p && q ? Math.hypot(q.x - p.x, q.y - p.y) : 0;
  }).filter(n => n > 0).sort((x, y) => x - y);
  // The MEDIAN leg. The reason first written here was that a handful of long
  // suburban runs drag a mean upward and stretch every downtown leg to match —
  // and that turned out to be FALSE when it was measured. On a network with one
  // line running well out of town, across three seeds, targeting the mean gives
  // spread 0.082-0.084 against the median's 0.083-0.085 and identical drift.
  // They are the same. The projection scales the whole city to the board, so
  // one long leg among ninety moves a mean almost not at all.
  //
  // The median stays because it is the more robust of two equal choices, NOT
  // because anybody measured a benefit — which is recorded so the next person
  // does not go looking for one. Overridable, and the gate pins the tie.
  const target = opts.target ?? (lens.length ? lens[lens.length >> 1] : minLeg);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : minLeg;

  const push = new Map();
  for (const id of pos.keys()) push.set(id, { x: 0, y: 0 });

  for (let r = 0; r < rounds; r++) {
    for (const f of push.values()) { f.x = 0; f.y = 0; }

    for (const [ida, idb] of legs) {
      const a = pos.get(ida), b = pos.get(idb);
      if (!a || !b) continue;
      const want = snap(a, b, minLeg, target, even);
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

  return { at: pos, report: { ...report(pos, truth, legs, opts), target, meanOfLegs: mean } };
}

// the nearest octolinear vector to a→b, keeping the length it already has
// ALONG that direction rather than the length it had — projecting is what stops
// a leg growing every time it is snapped — and then eased toward the median leg
function snap(a, b, minLeg, target = 0, even = 0) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const ang = Math.round(Math.atan2(dy, dx) / OCTO) * OCTO;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  let len = dx * ux + dy * uy;
  if (target > 0 && even > 0) len += (target - len) * even;
  len = Math.max(minLeg, len);
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

  // How uneven the stop spacing is, as a coefficient of variation. This is the
  // number the first render needed and did not have: 100% on the grid says
  // nothing about whether the legs are all the same size, and a staircase of
  // three-pixel steps passes every other check here.
  let sum = 0, sum2 = 0;
  for (const [ida, idb] of legs) {
    const a = pos.get(ida), b = pos.get(idb);
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    sum += d; sum2 += d * d;
  }
  const mean = legs.length ? sum / legs.length : 0;
  const spread = mean > 0 ? Math.sqrt(Math.max(0, sum2 / legs.length - mean * mean)) / mean : 0;

  return {
    legs: legs.length,
    meanLeg: mean,
    spread,
    onGrid: legs.length ? onGrid / legs.length : 1,
    worstAngleDeg: (worstAngle * 180) / Math.PI,
    drift: pos.size ? drift / pos.size : 0,
    worstDrift,
    collisions,
  };
}

// ── interchanges ────────────────────────────────────────────────────────
// For feeds that do NOT say which platforms belong together. GTFS has
// `parent_station` and scripts/gtfs.mjs uses it, but plenty of sources have no
// such field — OpenStreetMap route relations, a hand-made pack — and there the
// only evidence is that two stops are twelve metres apart and called the same
// thing. Both are required by default: proximity alone merges a tram stop into
// the unrelated one across the junction, and name alone merges every "Market
// Square" in the country.
export function merge(pack, opts = {}) {
  const metres = opts.metres ?? 120;
  const byName = opts.byName ?? true;
  const norm = n => (n ?? '').toLowerCase().replace(/[\s,·.\-—()]+/g, ' ')
    .replace(/\b(platform|laituri|stop|station|asema|pysäkki|駅)\b.*$/u, '').trim();
  // One name may be a PREFIX of the other, because an operator marks the metro
  // face of an interchange as "Kamppi M" while the tram face is just "Kamppi".
  // Equality alone left those as two dots twenty metres apart with a line
  // stitched through both. The radius is what keeps this honest: "Market" and
  // "Market Square" merge only if they are already within `metres` of each
  // other, which is the case where they are in fact the same place.
  const sameName = (a, b) => {
    const x = norm(a), y = norm(b);
    if (!x || !y) return false;
    return x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ');
  };

  const deg = metres / 111320;
  const into = new Map();                 // stop id -> the id it became
  const keep = [];

  for (const s of pack.stops) {
    let host = null;
    for (const k of keep) {
      const dLat = (s.lat - k.lat), dLon = (s.lon - k.lon) * Math.cos((s.lat * Math.PI) / 180);
      if (Math.hypot(dLat, dLon) > deg) continue;
      if (byName && !sameName(s.name, k.name)) continue;
      host = k; break;
    }
    if (host) {
      into.set(s.id, host.id);
      for (const m of s.modes ?? []) if (!host.modes.includes(m)) host.modes.push(m);
    } else {
      const copy = { ...s, modes: [...(s.modes ?? [])] };
      into.set(s.id, copy.id);
      keep.push(copy);
    }
  }

  const lines = pack.lines.map(l => {
    const ids = [];
    for (const id of l.stops) {
      const to = into.get(id) ?? id;
      if (ids[ids.length - 1] !== to) ids.push(to);   // a line through one station calls once
      }
    return { ...l, stops: ids };
  }).filter(l => l.stops.length >= 2);

  return { ...pack, stops: keep, lines, merged: pack.stops.length - keep.length };
}

// ── the whole job, in two views ─────────────────────────────────────────
// One pack, two ways of looking at it, and they are the two ends of the ratio
// this file is built around.
//
//   'diagram'  bent onto the 45° grid. This is the game board: legible,
//              even-spaced, and NOT where anything actually is.
//   'street'   left exactly where it is, with the road under it. This is the
//              one you hold on a platform, because a diagram cannot tell you
//              which way to walk.
//
// They are not a preference. A diagram is unusable for finding a stop and a
// street map is unusable as a board, so the mode needs both and the pack is
// the same either way. Nothing below this line knows the city was real.
export function layout(packIn, board, opts = {}) {
  validate(packIn);
  const pack = opts.merge === false ? packIn : merge(packIn, opts);
  const proj = projector(pack, board);
  const projected = proj.at;

  const street = opts.view === 'street';
  const { at, report: rep } = street
    ? { at: projected, report: null }
    : octolinear(projected, pack.lines, opts);

  const trace = pts => pts?.map(([lat, lon]) => proj.toBoard(lat, lon)) ?? null;

  return {
    view: street ? 'street' : 'diagram',
    stops: pack.stops.map(s => ({ ...s, ...at.get(s.id), truth: projected.get(s.id) })),
    // In the street view a line follows the path the vehicle really traces —
    // which for a tram IS the street it runs down, so the route can be drawn on
    // the road with no road data at all. Straight hops between stops in the
    // diagram, where a curve would be a lie about a shape that has none.
    lines: pack.lines.map(l => ({ ...l, path: street ? trace(l.path) : null })),
    streets: street ? (pack.streets ?? []).map(w => ({ ...w, pts: trace(w.pts) })) : [],
    metresPerUnit: proj.metresPerUnit,
    report: rep,
  };
}
