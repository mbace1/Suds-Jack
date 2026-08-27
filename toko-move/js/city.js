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
  // Water arrives as two different things and they are not interchangeable.
  // `areas` are CLOSED rings and can be filled. `coast` is an OPEN directed
  // line with land on one side and the sea only implied — closing one into a
  // polygon puts a lid across the harbour mouth and paints the sea as land.
  // Two projects in this repository hit that trap from two different datasets,
  // so the schema keeps them apart and `validate` will not accept a three-point
  // ring pretending to be a body of water.
  for (const a of pack?.water?.areas ?? []) {
    if ((a.ring?.length ?? 0) < 4) bad.push('a water body needs a closed ring');
  }
  for (const c of pack?.water?.coast ?? []) {
    if ((c.pts?.length ?? 0) < 2) bad.push('a coastline run needs at least two points');
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
      host.aka.push(s.name);
      for (const m of s.modes ?? []) if (!host.modes.includes(m)) host.modes.push(m);
    } else {
      const copy = { ...s, modes: [...(s.modes ?? [])], aka: [s.name] };
      into.set(s.id, copy.id);
      keep.push(copy);
    }
  }

  for (const k of keep) k.name = pickName(k.aka) ?? k.name;

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

// WHICH NAME a folded station wears, and it needed more than "the first one".
// Helsinki's central interchange came out as **Elielinaukio** — the bus square
// beside it — purely because that platform is first in the feed. One real fold
// there holds five names:
//
//   Elielinaukio · Postitalo · Päärautatieasema · Rautatientori ·
//   Rautatientorin metroasema
//
// A modal count does not settle it (each appears once) and "shortest" picks
// *Postitalo*, the post office. What settles it is that a big interchange is
// named more than once in VARIANTS of one name, and that one of those variants
// says it is a station. So: group the names by a crude STEM, score a group by
// how many names it holds plus a bonus if any of them names a station, and
// then show the plainest member of the winning group — the one without an
// "asema" or a "(M)" hung off it.
//
// The stem is the first six characters of the normalised name, which is crude
// on purpose. Finnish compounds and the genitive defeat anything tidier —
// "metroasema" is not "asema" to a word-boundary rule, and Hakaniemi's
// genitive is *Hakaniemen*, so no suffix table gets you from one to the other.
// Six characters gets Rautatientori, Hakaniemi, Sörnäinen, Kalasatama, Pasila
// and Helsingin yliopisto all correct, and two names that share six characters
// AND stand within the merge radius are the same place anyway.
export function pickName(names) {
  const real = (names ?? []).filter(Boolean);
  if (!real.length) return null;
  const norm = n => n.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\p{N}]+/gu, '');
  const groups = new Map();
  for (const n of real) {
    const stem = norm(n).slice(0, 6);
    if (!groups.has(stem)) groups.set(stem, []);
    groups.get(stem).push(n);
  }
  let best = null, bestScore = -1;
  for (const g of groups.values()) {
    const score = g.length + (g.some(n => /asema/i.test(n)) ? 2 : 0);
    if (score > bestScore || (score === bestScore && g.length > best.length)) { bestScore = score; best = g; }
  }
  const plain = best.filter(n => !/asema|\(M\)/i.test(n));
  const pool = plain.length ? plain : best;
  return pool.reduce((a, b) => (b.length < a.length ? b : a));
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
    // the very same transform the stops went through, so anything projected
    // later — the box the data was clipped to, above all — lands on it exactly
    toBoard: proj.toBoard,
    stops: pack.stops.map(s => ({ ...s, ...at.get(s.id), truth: projected.get(s.id) })),
    // In the street view a line follows the path the vehicle really traces —
    // which for a tram IS the street it runs down, so the route can be drawn on
    // the road with no road data at all. Straight hops between stops in the
    // diagram, where a curve would be a lie about a shape that has none.
    lines: pack.lines.map(l => ({ ...l, path: street ? trace(l.path) : null })),
    streets: street ? (pack.streets ?? []).map(w => ({ ...w, pts: trace(w.pts) })) : [],
    // The water goes through the SAME transform as the stops, or the harbour
    // moves out from under the bridge. It is carried in both views: a diagram
    // does not draw a coastline, but the board still has to know which ground
    // is wet, because that is where a tunnel and a bridge get their price.
    water: {
      areas: (pack.water?.areas ?? []).map(a => ({ ...a, ring: a.ring.map(([la, lo]) => proj.toBoard(la, lo)) })),
      coast: (pack.water?.coast ?? []).map(c => ({ ...c, pts: c.pts.map(([la, lo]) => proj.toBoard(la, lo)) })),
    },
    metresPerUnit: proj.metresPerUnit,
    report: rep,
  };
}

// ── a pack, as a BOARD ──────────────────────────────────────────────────
// The last step of the seam: a laid-out city turned into the handful of things
// `world.js` needs, so that file never learns what a latitude is.
//
// TWO DECISIONS LIVE HERE, and both are answerable from the data rather than
// invented.
//
// **What order the stops open in.** The game's rhythm is that the board grows,
// and on a real city that rhythm is worth keeping rather than dropping every
// stop on at once. So the sites are RANKED — by how many services call, then
// by whether the metro is one of them, then by name so the order is stable —
// and the board opens at the busiest interchange and grows outward. It reads
// like a network being built, which is what it is.
//
// **What shape a stop is.** The game's alphabet is shapes, and a real stop has
// no shape, so this is the one place where something is assigned rather than
// read. The rule is the honest one: a stop where the metro meets the trams, or
// where four or more services call, is an INTERCHANGE and gets a special
// shape; everything else takes a common one, chosen by a stable hash of its id
// so the same stop is the same shape on every run. The result is that the
// specials are Rautatientori, Hakaniemi and Sörnäinen — which is true, and
// which no rule invented for prettiness would have got right.
export function asBoard(packIn, board, opts = {}) {
  const laid = layout(packIn, board, { view: 'street', ...opts });
  const calls = new Map();
  const modes = new Map();
  for (const l of laid.lines) {
    for (const id of l.stops) {
      calls.set(id, (calls.get(id) ?? 0) + 1);
      if (!modes.has(id)) modes.set(id, new Set());
      modes.get(id).add(l.mode);
    }
  }

  const ranked = laid.stops.slice().sort((a, b) => {
    const ca = calls.get(a.id) ?? 0, cb = calls.get(b.id) ?? 0;
    if (ca !== cb) return cb - ca;
    const ma = modes.get(a.id)?.has('SUBWAY') ? 1 : 0;
    const mb = modes.get(b.id)?.has('SUBWAY') ? 1 : 0;
    if (ma !== mb) return mb - ma;
    return String(a.name ?? a.id).localeCompare(String(b.name ?? b.id));
  });

  // ── thinning ──────────────────────────────────────────────────────
  // A real network is far denser than a board. Central Helsinki puts two tram
  // stops 100 m apart, which at this zoom is 15 board units — closer than the
  // radius a station is DRAWN at, so they overlap into one blob you cannot aim
  // at. (Merging by name alone left a pair 1 metre apart: Päärautatieasema and
  // Rautatientori are the same place under two names, and Finnish compounds
  // defeat a word-boundary rule — "metroasema" is not "asema".)
  //
  // So the rank is used twice. First to decide who matters, then to THIN: walk
  // it from the top and drop anything standing on somebody already taken. The
  // busiest interchange always survives, and what is lost is the third stop on
  // the same square rather than a district.
  const gap = opts.minGap ?? 0;
  const thinned = [];
  for (const s of ranked) {
    if (gap > 0 && thinned.some(t => Math.hypot(t.x - s.x, t.y - s.y) < gap)) continue;
    thinned.push(s);
  }

  const COMMON = opts.common ?? ['circle', 'triangle', 'square'];
  const SPECIAL = opts.special ?? ['cross', 'diamond', 'star', 'pentagon', 'gem'];
  let specialsGiven = 0;
  const sites = thinned.map(s => {
    const n = calls.get(s.id) ?? 0;
    const m = modes.get(s.id) ?? new Set();
    const interchange = (m.has('SUBWAY') && m.has('TRAM')) || n >= 4;
    const kind = interchange
      ? SPECIAL[specialsGiven++ % SPECIAL.length]
      : COMMON[hash(String(s.id)) % COMMON.length];
    return { id: s.id, name: s.name ?? null, x: s.x, y: s.y, kind, calls: n, interchange };
  });

  // The wet ground, in two parts. The closed bodies arrive as rings already;
  // the sea has to be MADE, by closing the shoreline against the box it was
  // clipped to and asking which side the stops are on (`seaRings`). Without
  // that half the board has no water on it at all — in central Helsinki every
  // ring in the data is a pond.
  const ponds = (laid.water?.areas ?? []).filter(a => a.ring.length >= 4).map(a => a.ring);
  const coastRuns = (laid.water?.coast ?? []).map(c => c.pts);
  // THE SEA IS NOT RECONSTRUCTED, and that is a decision rather than an
  // omission. `seaRings` below can close a shoreline into polygons and it is
  // kept, tested and documented — but on this extract it recovers the outer sea
  // and the Kalasatama basin and MISSES Töölönlahti, which is the one piece of
  // water a Helsinki board most needs. Three closure rules were tried (nearest
  // edge, the run's own bearing, and a flood fill seeded from the stops) and
  // each got a different subset. Half a coastline drawn as fact is worse than
  // none: it says there is no bay where there is a bay.
  //
  // So the board ships the water that IS a polygon in the data — the ponds —
  // and draws the shoreline as a line, which is true. CITIES.md holds the
  // problem, and `--sea` turns the reconstruction on for anyone working on it.
  const sea = opts.sea ? seaRings(coastRuns, seaBox(coastRuns, board), laid.stops, opts.sea) : [];

  // ── the order they OPEN in ────────────────────────────────────────
  // Rank alone put every interchange first, and every interchange is a
  // special shape — so a Helsinki board opened with five specials, nobody
  // could reach anybody, and thirty-one people were marked "nowhere to go"
  // inside the first minute. Interleaving one special to every two ordinary
  // stops keeps the busiest stop first (it should be Rautatientori) while
  // giving the board something ordinary to travel between.
  const specials = sites.filter(s => s.interchange);
  const commons = sites.filter(s => !s.interchange);
  const order = [];
  while (specials.length || commons.length) {
    if (specials.length) order.push(specials.shift());
    for (let i = 0; i < 2 && commons.length; i++) order.push(commons.shift());
  }

  return {
    sites: order,
    rings: [...ponds, ...sea],
    coast: coastRuns,
    // THE REAL NETWORK, to draw under the board. This is the half of "all the
    // tram lines" that a list of stops cannot give: each service's own traced
    // path, in board units, so Helsinki is recognisable before a single line
    // has been drawn on it.
    lines: laid.lines,
    credit: [packIn.source, packIn.waterSource].filter(Boolean).join(' · '),
    licence: [packIn.licence, packIn.waterLicence].filter(Boolean).join(' · '),
    note: packIn.note ?? null,
  };
}

// ── the sea ─────────────────────────────────────────────────────────────
// THE PROBLEM. Water arrives as two kinds and only one of them is a polygon.
// `areas` are closed rings, and in central Helsinki they are PONDS — the
// biggest is Alppipuiston lammet at 0.002 km². Every piece of water that
// matters — Töölönlahti, Eläintarhanlahti, the harbours, the sea itself — is
// `coast`: twenty-seven OPEN runs, because OSM maps a shoreline as a directed
// line with land on one side and the sea merely implied. Drawn as lines they
// read as blue scribble, and worse, the board has no wet ground at all: a
// mission about bridging the bay had nothing to bridge.
//
// THE FIX, and why it is safe. Each run is closed against the edges of the box
// the data was clipped to, which can be done in two directions round the
// perimeter — one encloses the sea, the other encloses the city. Choosing
// between them by OSM's left-hand rule means trusting that the direction
// survived export. It does not have to: **the stops are on land.** So both
// candidates are built and the one containing FEWER STOPS wins. That is a test
// against the other half of the same pack rather than against a convention,
// and it is why this does not repeat the trap `flow-core` hit twice — an
// administrative polygon painted the harbour as ground, and this asks the
// question that would have caught it.
export function seaRings(coast, box, stops, opts = {}) {
  const eps = opts.eps ?? Math.max(box.x1 - box.x0, box.y1 - box.y0) * 0.02;
  const minArea = opts.minArea ?? 40;              // board units², below which it is noise
  // how far inside a ring a stop must be before it counts as drowned
  const shore = opts.shore ?? 10;
  const corners = [
    { x: box.x0, y: box.y0 }, { x: box.x1, y: box.y0 },
    { x: box.x1, y: box.y1 }, { x: box.x0, y: box.y1 },
  ];
  // The nearest point ON the box to `p`, and where that sits on the perimeter
  // as a number in [0,4).
  //
  // A shoreline chain does not always reach the edge. Of the five chains this
  // data stitches into, the LONGEST — the one carrying Töölönlahti and the
  // eastern harbour — has one end on the box and one dangling in mid-water,
  // because the extract cut the way without snapping it. Closing only the
  // chains that reach both edges left the biggest body of water on the board
  // at 1% of it. So a dangling end is carried straight out to the nearest edge,
  // which is the smallest repair that can be made to a line that was cut. It is
  // an assumption, and the stop test is what keeps it honest: if the guess
  // encloses a platform the ring is thrown away rather than drawn.
  const toPerimeter = p => {
    const w = box.x1 - box.x0, h = box.y1 - box.y0;
    const cands = [
      { q: { x: Math.min(box.x1, Math.max(box.x0, p.x)), y: box.y0 }, t: null },
      { q: { x: box.x1, y: Math.min(box.y1, Math.max(box.y0, p.y)) }, t: null },
      { q: { x: Math.min(box.x1, Math.max(box.x0, p.x)), y: box.y1 }, t: null },
      { q: { x: box.x0, y: Math.min(box.y1, Math.max(box.y0, p.y)) }, t: null },
    ];
    cands[0].t = 0 + (w ? (cands[0].q.x - box.x0) / w : 0);
    cands[1].t = 1 + (h ? (cands[1].q.y - box.y0) / h : 0);
    cands[2].t = 2 + (w ? (box.x1 - cands[2].q.x) / w : 0);
    cands[3].t = 3 + (h ? (box.y1 - cands[3].q.y) / h : 0);
    let best = cands[0], bd = Infinity;
    for (const c of cands) {
      const d = Math.hypot(c.q.x - p.x, c.q.y - p.y);
      if (d < bd) { bd = d; best = c; }
    }
    return { ...best, gap: bd };
  };
  // the corners strictly between two perimeter parameters, walking forward
  // Corner c sits at perimeter parameter c. Walking FORWARD from `from` to
  // `to`, these are the ones passed on the way — four iterations and no more,
  // because a fifth revisits corner one and pushes it twice, which folds the
  // ring back on itself and makes both its area and its inside meaningless.
  const cornersBetween = (from, to) => {
    const span = ((to - from) + 4) % 4;
    const out = [];
    for (let k = 0; k < 4; k++) {
      const c = (Math.floor(from) + 1 + k) % 4;
      const ahead = ((c - from) + 4) % 4;
      if (ahead > 0 && ahead < span) out.push(corners[c]);
    }
    return out;
  };

  // Every chain is closed the same way first, so the wall the flood runs
  // against has no gaps at the cut ends — a leak there would drain the sea into
  // the city and the board would come back dry.
  const chains = stitch(coast, eps * 0.15);
  const walls = chains.map(ch => {
    const a = ch[0], b = ch[ch.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < eps * 0.15) return ch;
    const ea = plug(a, ch[1], box, eps), eb = plug(b, ch[ch.length - 2], box, eps);
    return [...(ea ? [ea] : []), ...ch, ...(eb ? [eb] : [])];
  });
  const mask = landMask(walls, stops, box, opts.cell ?? 4);
  const sample = opts.sample ?? 6;

  const out = [];
  for (const run of chains) {
    if (run.length < 2) continue;
    const a = run[0], b = run[run.length - 1];
    // a chain that came back to where it started is a body of water already —
    // unless its inside is dry, in which case it is an island
    if (Math.hypot(a.x - b.x, a.y - b.y) < eps * 0.15 && run.length > 3) {
      if (Math.abs(ringArea(run)) >= minArea && landShare(run, mask, sample) < 0.25) out.push(run);
      continue;
    }
    // A cut end is carried on in the direction the shoreline was ALREADY
    // GOING, not out to the nearest edge: turning ninety degrees to the closest
    // wall walks the coastline back across the city.
    const ea = plug(a, run[1], box, eps), eb = plug(b, run[run.length - 2], box, eps);
    const chain = [...(ea ? [ea] : []), ...run, ...(eb ? [eb] : [])];
    const pa = toPerimeter(chain[0]), pb = toPerimeter(chain[chain.length - 1]);
    // Two ways round the box between the chain's ends. One of them is the sea,
    // and the flood says which.
    const cands = [
      [...chain, ...cornersBetween(pb.t, pa.t)],
      [...chain, ...cornersBetween(pa.t, pb.t).reverse()],
    ];
    let best = null, bestDry = Infinity;
    for (const ring of cands) {
      if (Math.abs(ringArea(ring)) < minArea) continue;
      const dry = landShare(ring, mask, sample);
      if (dry < bestDry) { bestDry = dry; best = ring; }
    }
    if (best && bestDry < 0.25) out.push(best);
  }
  return out;
}

// OSM splits a shoreline into ways, so the pack holds twenty-seven runs where
// there are only a handful of real coastlines — and only THREE of them happen
// to end on the edge of the clip box. Closing them one at a time therefore
// produced slivers and nothing else: the biggest body of water on the board
// came out at 1% of it. Joining runs end to end first is what makes the
// closure work at all.
function stitch(runs, eps) {
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;
  const pool = runs.filter(r => r.length >= 2).map(r => r.slice());
  const done = [];
  while (pool.length) {
    let chain = pool.pop();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const r = pool[i];
        const head = chain[0], tail = chain[chain.length - 1];
        if (near(tail, r[0])) { chain = chain.concat(r.slice(1)); }
        else if (near(tail, r[r.length - 1])) { chain = chain.concat(r.slice().reverse().slice(1)); }
        else if (near(head, r[r.length - 1])) { chain = r.slice(0, -1).concat(chain); }
        else if (near(head, r[0])) { chain = r.slice().reverse().slice(0, -1).concat(chain); }
        else continue;
        pool.splice(i, 1);
        grew = true;
        break;
      }
    }
    done.push(chain);
  }
  return done;
}

// A cut end, carried on to the edge along the bearing it was travelling.
function plug(end, prev, box, eps) {
  const d = [Math.abs(end.y - box.y0), Math.abs(end.x - box.x1), Math.abs(end.y - box.y1), Math.abs(end.x - box.x0)];
  if (Math.min(...d) <= eps || !prev) return null;
  return rayToBox(end, { x: end.x - prev.x, y: end.y - prev.y }, box);
}

// where a ray leaves the box, or null if it never does
function rayToBox(p, d, box) {
  const len = Math.hypot(d.x, d.y);
  if (!len) return null;
  const u = { x: d.x / len, y: d.y / len };
  let best = null, bt = Infinity;
  const tryT = t => {
    if (!(t > 0) || t >= bt) return;
    const q = { x: p.x + u.x * t, y: p.y + u.y * t };
    const pad = 1e-6;
    if (q.x < box.x0 - pad || q.x > box.x1 + pad || q.y < box.y0 - pad || q.y > box.y1 + pad) return;
    bt = t; best = { x: Math.min(box.x1, Math.max(box.x0, q.x)), y: Math.min(box.y1, Math.max(box.y0, q.y)) };
  };
  if (u.x) { tryT((box.x0 - p.x) / u.x); tryT((box.x1 - p.x) / u.x); }
  if (u.y) { tryT((box.y0 - p.y) / u.y); tryT((box.y1 - p.y) / u.y); }
  return best;
}

// ── which side is the sea ───────────────────────────────────────────────
// Counting stops was not enough, and the failure is instructive: a bay has no
// stops IN it, so "fewer stops inside" cannot tell Töölönlahti from the block
// of city beside it — sixty-five sample points spread over a whole board simply
// do not reach into the water.
//
// So the question is asked of the SHAPE instead. Rasterise the shoreline as a
// wall, flood LAND outward from every stop, and the cells the flood never
// reaches are water. Then a candidate ring is judged by what its inside is made
// of. The flood needs no convention about which way a coastline was drawn, and
// a gap in the wall costs water rather than inventing it.
function landMask(chains, stops, rect, cell) {
  const w = Math.max(1, Math.ceil((rect.x1 - rect.x0) / cell));
  const h = Math.max(1, Math.ceil((rect.y1 - rect.y0) / cell));
  const wall = new Uint8Array(w * h);
  const land = new Uint8Array(w * h);
  const cx = x => Math.min(w - 1, Math.max(0, Math.floor((x - rect.x0) / cell)));
  const cy = y => Math.min(h - 1, Math.max(0, Math.floor((y - rect.y0) / cell)));

  for (const ch of chains) {
    for (let i = 1; i < ch.length; i++) {
      const a = ch[i - 1], b = ch[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cell * 0.5)));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        wall[cy(a.y + (b.y - a.y) * t) * w + cx(a.x + (b.x - a.x) * t)] = 1;
      }
    }
  }

  const queue = [];
  for (const s of stops) {
    const i = cy(s.y) * w + cx(s.x);
    if (!wall[i] && !land[i]) { land[i] = 1; queue.push(i); }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q], x = i % w, y = (i / w) | 0;
    const push = j => { if (j >= 0 && j < w * h && !wall[j] && !land[j]) { land[j] = 1; queue.push(j); } };
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  return { isLand: (x, y) => !!land[cy(y) * w + cx(x)] };
}

// what fraction of a ring's inside is dry
function landShare(ring, mask, step) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ring) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  let n = 0, dry = 0;
  for (let y = y0 + step / 2; y < y1; y += step) {
    for (let x = x0 + step / 2; x < x1; x += step) {
      if (!inRing(x, y, ring)) continue;
      n++;
      if (mask.isLand(x, y)) dry++;
    }
  }
  return n ? dry / n : 1;
}

// the rectangle a shoreline is closed against: the board, plus wherever the
// coast reaches beyond it
export function seaBox(runs, board, pad = 8) {
  let x0 = 0, y0 = 0, x1 = board.w, y1 = board.h;
  for (const run of runs) for (const p of run) {
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  return { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}

function ringArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
  return a / 2;
}

// How far a point sits inside a ring — negative outside, and 0 on the shore.
// A plain inside/outside test threw Töölönlahti away: a tram stop stands ON
// its western shore, so it read as "a platform in the water" and the biggest
// body of water on the board was discarded to protect it. A stop on the shore
// is on the shore.
function insideBy(x, y, ring) {
  if (!inRing(x, y, ring)) return -1;
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    best = Math.min(best, segDist(x, y, ring[j], ring[i]));
  }
  return best;
}

function segDist(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L)) : 0;
  return Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
}

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const p = ring[i], q = ring[j];
    if ((p.y > y) !== (q.y > y) && x < ((q.x - p.x) * (y - p.y)) / (q.y - p.y) + p.x) inside = !inside;
  }
  return inside;
}

// stable, tiny, and not trying to be a hash function — it only has to give the
// same stop the same common shape every time
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
