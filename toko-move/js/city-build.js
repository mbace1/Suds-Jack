// Toko Move — build a playable city from a transit pack plus a city DEFINITION.
//
// Why this exists. The campaign is four cities (CAMPAIGN.md: Helsinki, Nagoya,
// New York, Tokyo) and chapter 1 was written as code: the anchor list, their
// names, tags and capacities, the walking pairs and the mode speeds all lived
// inside real-helsinki.js. A second city built that way is a second copy of the
// same function, and the two drift the moment either is touched. Here the city
// is DATA — `cities/<id>.city.json` — and this file is the only thing that
// knows how to turn a definition plus a GTFS-derived pack into a graph.
//
// What a definition owns: which real stops its anchors resolve to (by alias),
// what each anchor is called and what it is for, which anchors are walkable to
// each other, and the per-mode speeds, capacities and vehicle counts.
//
// What it must NEVER own: geometry. Paths and stop sequences come from the
// committed source pack and are used exactly as the agency published them —
// the rule in TRANSIT_LAYERS.md, and the reason a new city is a data fetch
// rather than a drawing exercise.

const norm = s => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const rad = d => d * Math.PI / 180;

export function metresBetween(a, b) {
  const R = 6371000, dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const la1 = rad(a.lat), la2 = rad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// An anchor names real stops by alias. Exact name first, then a containment
// pass — agencies rename platforms and suffix them ("(M)", "Länsiterminaali 2")
// far more often than they move them.
export function resolveAnchors(pack, anchors) {
  const stops = pack?.stops ?? [];
  const byName = new Map();
  for (const stop of stops) {
    const key = norm(stop.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(stop);
  }
  const out = {};
  for (const [id, def] of Object.entries(anchors)) {
    const aliases = def.aliases ?? [];
    let match = null;
    for (const alias of aliases) {
      const exact = byName.get(norm(alias));
      if (exact?.length) { match = exact[0]; break; }
    }
    if (!match) for (const alias of aliases) {
      const q = norm(alias);
      match = stops.find(s => norm(s.name).includes(q) || q.includes(norm(s.name)));
      if (match) break;
    }
    out[id] = match ?? null;
  }
  return out;
}

export function buildCity(pack, def) {
  const anchors = def.anchors ?? {};
  const resolved = resolveAnchors(pack, anchors);
  const missing = Object.entries(resolved).filter(([, s]) => !s).map(([id]) => id);
  if (missing.length) throw new Error(`${def.name ?? def.id} pack misses delivery anchors: ${missing.join(', ')}`);

  const lats = Object.values(resolved).map(s => s.lat), lons = Object.values(resolved).map(s => s.lon);
  const north = Math.max(...lats), west = Math.min(...lons);
  const kx = Math.cos(rad((Math.min(...lats) + north) / 2));
  // Metres from the anchor box's north-west corner, in units of 100m. The
  // projection is the city's own, so a board in Nagoya is laid out by the same
  // arithmetic as one in Helsinki.
  const projectLatLon = (lat, lon) => ({ x: (lon - west) * 111320 * kx / 100, y: (north - lat) * 111320 / 100 });

  const nodes = Object.entries(anchors).map(([id, meta]) => {
    const stop = resolved[id], p = projectLatLon(stop.lat, stop.lon);
    return {
      id, name: meta.name ?? stop.name, x: p.x, y: p.y,
      tags: meta.tags ?? [], capacity: meta.capacity ?? 20,
      lat: stop.lat, lon: stop.lon, hslStopId: stop.id, hslStopName: stop.name,
    };
  });
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  const edges = [];
  for (const [a, b] of def.walk ?? []) {
    if (!nodeById.has(a) || !nodeById.has(b)) throw new Error(`${def.id}: walk link names unknown anchor ${nodeById.has(a) ? b : a}`);
    edges.push({
      id: `walk:${a}:${b}`, a, b, mode: 'walk',
      time: Math.max(6, Math.round(metresBetween(nodeById.get(a), nodeById.get(b)) / 55)),
      capacity: 2,
    });
  }

  // Which anchor, if any, a real stop belongs to. Long aliases may match by
  // containment; short ones must be exact, or "Eira" swallows half a network.
  const aliasesFor = id => anchors[id]?.aliases ?? [];
  const semanticForName = name => {
    const n = norm(name);
    for (const id of Object.keys(anchors)) for (const alias of aliasesFor(id)) {
      const a = norm(alias);
      if (n === a || (a.length > 5 && (n.includes(a) || a.includes(n)))) return id;
    }
    return null;
  };

  const modeOf = def.modes ?? { SUBWAY: 'metro', TRAM: 'tram' };
  const speed = def.speedKmh ?? { metro: 34, tram: 18 };
  const cap = def.edgeCapacity ?? { metro: 8, tram: 5 };
  const carriers = def.carriers ?? { metro: { count: 3, seats: 30 }, tram: { count: 1, seats: 12 } };
  const ticksFor = (a, b, mode) => {
    const km = metresBetween(a, b) / 1000, kmh = speed[mode] ?? 18;
    return Math.max(3, Math.round((km / kmh) * 120));
  };

  const stopById = new Map((pack.stops || []).map(s => [s.id, s]));
  const edgeKeys = new Set(), lines = [];
  for (const source of pack.lines || []) {
    const mode = modeOf[source.mode];
    if (!mode) continue;
    const touched = [];
    for (const sid of source.stops || []) {
      const s = stopById.get(sid);
      if (!s) continue;
      const id = semanticForName(s.name);
      if (!id || touched.some(x => x.id === id)) continue;
      touched.push({ id, stop: s });
    }
    if (touched.length < 2) continue;
    for (let i = 0; i < touched.length - 1; i++) {
      const a = touched[i], b = touched[i + 1];
      const key = [mode, ...[a.id, b.id].sort()].join(':');
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ id: `hsl:${key}`, a: a.id, b: b.id, mode, time: ticksFor(a.stop, b.stop, mode), capacity: cap[mode] ?? 5 });
    }
    const c = carriers[mode] ?? { count: 1, seats: 12 };
    lines.push({
      id: `hsl:${source.id}`, label: source.name, sourceId: source.id, name: source.name,
      mode, nodes: touched.map(x => x.id), carriers: c.count, carrierCapacity: c.seats,
    });
  }

  // A city with no service through its own board is a data failure, not a
  // gameplay one, and it must say so at build time rather than at play time.
  for (const mode of new Set(Object.values(modeOf))) {
    if (!lines.some(l => l.mode === mode)) throw new Error(`No ${mode} service reaches the ${def.name ?? def.id} delivery anchors`);
  }

  return {
    nodes, edges, lines, projectLatLon, resolved,
    city: { id: def.id, name: def.name, chapter: def.chapter },
    source: { name: pack.source, licence: pack.licence, fetched: pack.fetched, exactGeometry: pack.exactGeometry },
  };
}
