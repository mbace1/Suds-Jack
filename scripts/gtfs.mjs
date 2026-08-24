// A GTFS reader with no dependencies, because a city pack must not cost this
// repo its no-build rule.
//
// GTFS is a zip of CSVs and that is the whole format, so both halves are here:
// a minimal ZIP central-directory reader (stored and deflate, which is all any
// transit agency ships) and a CSV parser that handles quotes, because stop
// names contain commas — "Kamppi, laituri 3" is one field and a reader that
// splits on commas silently moves every column after it.
//
// The alternative was a dependency. `toko-move` has none, the arcade has none,
// and adding one for sixty lines of zip offsets would be the wrong trade.

import { inflateRawSync } from 'node:zlib';

// ── zip ─────────────────────────────────────────────────────────────────
// Read the END OF CENTRAL DIRECTORY record and walk the directory, rather than
// scanning local headers forward. Local headers can carry a data descriptor
// whose sizes are zero until after the data, so walking them forward means
// guessing where a file ends; the central directory always knows.
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip: no end-of-central-directory record');

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = new Map();

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip central directory is corrupt');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localAt = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // the local header's own name/extra lengths, not the directory's — they
    // differ often enough that using the directory's puts you mid-file
    const lNameLen = buf.readUInt16LE(localAt + 26);
    const lExtraLen = buf.readUInt16LE(localAt + 28);
    const start = localAt + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);

    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`${name}: compression method ${method} is not supported`);

    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ── csv ─────────────────────────────────────────────────────────────────
// Quotes, doubled quotes inside quotes, CRLF, and a UTF-8 BOM — which GTFS
// files really do carry, and which turns the first column's name into
// "﻿route_id" so every lookup of `route_id` silently misses.
export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; continue; }
    if (c === '\r') continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const head = rows.shift() ?? [];
  const idx = new Map(head.map((h, i) => [h.trim(), i]));
  return {
    head,
    at: (r, name) => { const i = idx.get(name); return i === undefined ? undefined : r[i]; },
    has: name => idx.has(name),
    rows: rows.filter(r => r.length > 1),
  };
}

// GTFS route_type, only the ones a diagram of a city needs. 0/1/2 are the rail
// family, 3 is bus, 4 is ferry; the extended 700/900/etc. codes map back onto
// the same handful.
export const ROUTE_TYPE = {
  0: 'TRAM', 1: 'SUBWAY', 2: 'RAIL', 3: 'BUS', 4: 'FERRY', 5: 'TRAM', 6: 'GONDOLA', 7: 'FUNICULAR', 11: 'BUS', 12: 'RAIL',
  100: 'RAIL', 109: 'RAIL', 200: 'BUS', 400: 'SUBWAY', 401: 'SUBWAY', 402: 'SUBWAY', 700: 'BUS', 900: 'TRAM', 1000: 'FERRY',
};
export const modeOf = t => ROUTE_TYPE[Number(t)] ?? 'OTHER';

// ── paths ───────────────────────────────────────────────────────────────
// Douglas-Peucker. Written out rather than pulled in for the same reason the
// zip reader is: twenty lines against a dependency in a repo that has none.
export function simplify(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = -1, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      // perpendicular distance to the segment, degenerate segment included
      let d;
      if (len2 === 0) d = Math.hypot(px - ax, py - ay);
      else {
        let t = ((px - ax) * dx + (py - ay) * dy) / len2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      }
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol && at > 0) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// ── the pack ────────────────────────────────────────────────────────────
// One representative pattern per route: the trip that calls at the MOST stops.
// A route has dozens of trips and most are short workings — the 06:14 that
// turns back early is not the line as anybody thinks of it, and picking the
// first trip in the file picks one of those about as often as not.
//
// stop_times.txt is the big one (tens of MB for a real agency), so it is walked
// twice rather than held: once counting calls per trip, once collecting the
// stops of the trips that won. Memory is one integer per trip.
export function packFromGtfs(files, opts = {}) {
  const want = new Set((opts.modes ?? ['TRAM', 'SUBWAY']).map(m => m.toUpperCase()));
  const get = name => {
    const f = files.get(name) ?? files.get(name.replace(/^/, 'gtfs/'));
    if (!f) throw new Error(`the feed has no ${name}`);
    return parseCsv(f.toString('utf8'));
  };

  const routesCsv = get('routes.txt');
  const routes = new Map();
  for (const r of routesCsv.rows) {
    const mode = modeOf(routesCsv.at(r, 'route_type'));
    if (!want.has(mode)) continue;
    const id = routesCsv.at(r, 'route_id');
    routes.set(id, {
      id,
      name: (routesCsv.at(r, 'route_short_name') || routesCsv.at(r, 'route_long_name') || id).trim(),
      longName: (routesCsv.at(r, 'route_long_name') || '').trim(),
      mode,
      hex: routesCsv.at(r, 'route_color') ? '#' + routesCsv.at(r, 'route_color') : null,
    });
  }
  if (!routes.size) throw new Error(`no routes of ${[...want].join('/')} in this feed`);

  const tripsCsv = get('trips.txt');
  const tripRoute = new Map();
  const tripShape = new Map();
  for (const t of tripsCsv.rows) {
    const rid = tripsCsv.at(t, 'route_id');
    if (!routes.has(rid)) continue;
    const tid = tripsCsv.at(t, 'trip_id');
    tripRoute.set(tid, rid);
    const sh = tripsCsv.at(t, 'shape_id');
    if (sh) tripShape.set(tid, sh);
  }

  const stCsv = get('stop_times.txt');
  const calls = new Map();
  for (const s of stCsv.rows) {
    const tid = stCsv.at(s, 'trip_id');
    if (!tripRoute.has(tid)) continue;
    calls.set(tid, (calls.get(tid) ?? 0) + 1);
  }
  const best = new Map();                       // route id -> trip id
  for (const [tid, n] of calls) {
    const rid = tripRoute.get(tid);
    const cur = best.get(rid);
    if (!cur || n > calls.get(cur)) best.set(rid, tid);
  }
  const chosen = new Map([...best].map(([rid, tid]) => [tid, rid]));

  const seq = new Map();                        // trip id -> [[seqNo, stopId], …]
  for (const s of stCsv.rows) {
    const tid = stCsv.at(s, 'trip_id');
    if (!chosen.has(tid)) continue;
    if (!seq.has(tid)) seq.set(tid, []);
    seq.get(tid).push([Number(stCsv.at(s, 'stop_sequence')), stCsv.at(s, 'stop_id')]);
  }

  // A GTFS stop is a PLATFORM, not a station, and that is the single biggest
  // thing between a feed and a diagram: a tram stop appears twice (one per
  // direction) and a metro station three or four times, so an unmerged pack
  // draws every station as a little cluster of near-identical dots and every
  // line as a stitch through them. GTFS says so itself — `location_type` 1 is a
  // station and `parent_station` points a platform at the one it belongs to —
  // so the feed's own answer is used where it has one.
  const stopsCsv = get('stops.txt');
  const allStops = new Map();
  const parentOf = new Map();
  for (const s of stopsCsv.rows) {
    const id = stopsCsv.at(s, 'stop_id');
    const parent = (stopsCsv.at(s, 'parent_station') || '').trim();
    if (parent) parentOf.set(id, parent);
    allStops.set(id, {
      id,
      name: (stopsCsv.at(s, 'stop_name') || '').trim(),
      lat: Number(stopsCsv.at(s, 'stop_lat')),
      lon: Number(stopsCsv.at(s, 'stop_lon')),
      station: Number(stopsCsv.at(s, 'location_type') || 0) === 1,
    });
  }
  // …and follow the chain, because an entrance may point at a platform which
  // points at a station. Guarded, because a feed with a cycle in it exists.
  const station = id => {
    let cur = id;
    for (let hops = 0; hops < 8; hops++) {
      const up = parentOf.get(cur);
      if (!up || !allStops.has(up)) break;
      cur = up;
    }
    return cur;
  };

  // ── the PATH a line takes on the ground ───────────────────────────────
  // Straight hops between stops are what a diagram wants; a map wants the road.
  // `shapes.txt` is the vehicle's actual traced path, which for a tram IS the
  // street it runs down — so a street view can draw the line where it really
  // goes without any road data at all. Optional: the file is not required by
  // GTFS and plenty of feeds omit it.
  const shapePts = new Map();
  if (files.has('shapes.txt') || files.has('gtfs/shapes.txt')) {
    const wanted = new Set([...chosen.keys()].map(tid => tripShape.get(tid)).filter(Boolean));
    if (wanted.size) {
      const shCsv = get('shapes.txt');
      for (const r of shCsv.rows) {
        const id = shCsv.at(r, 'shape_id');
        if (!wanted.has(id)) continue;
        if (!shapePts.has(id)) shapePts.set(id, []);
        shapePts.get(id).push([
          Number(shCsv.at(r, 'shape_pt_sequence')),
          Number(shCsv.at(r, 'shape_pt_lat')),
          Number(shCsv.at(r, 'shape_pt_lon')),
        ]);
      }
    }
  }

  const used = new Map();
  const lines = [];
  let slot = 0;
  for (const [tid, rid] of chosen) {
    const r = routes.get(rid);
    const ordered = (seq.get(tid) ?? []).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const ids = [];
    for (const raw of ordered) {
      const sid = station(raw);
      const st = allStops.get(sid);
      if (!st || !Number.isFinite(st.lat) || !Number.isFinite(st.lon)) continue;
      if (!used.has(sid)) used.set(sid, { id: sid, name: st.name, lat: st.lat, lon: st.lon, modes: [r.mode] });
      else if (!used.get(sid).modes.includes(r.mode)) used.get(sid).modes.push(r.mode);
      // a line that calls at two platforms of the same station calls once
      if (ids[ids.length - 1] !== sid) ids.push(sid);
    }
    if (ids.length < 2) continue;

    // …thinned. A tram route's shape is a few thousand points at metre
    // resolution, which is a megabyte of JSON per line to draw something a few
    // hundred pixels wide. Douglas-Peucker at ~8m keeps every bend a map can
    // show and throws the rest away.
    const raw = (shapePts.get(tripShape.get(tid)) ?? [])
      .sort((a, b) => a[0] - b[0])
      .map(([, lat, lon]) => [lat, lon])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon));
    const path = raw.length > 1 ? simplify(raw, (opts.shapeTol ?? 8) / 111320) : null;

    lines.push({ id: r.id, name: r.name, longName: r.longName, mode: r.mode, hex: r.hex, colour: slot++, stops: ids, path });
  }

  return { stops: [...used.values()], lines };
}
