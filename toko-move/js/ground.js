// Toko Move v2.20 — THE GROUND: real water, real streets, real place names.
//
// Why this file exists. Until now the board's ground was one authored skeleton
// of twelve corridors plus a water extract that covered the middle third of the
// board — so Eira, Länsisatama and Käpylä sat on blank paper, and the nine
// district names on the map were typed into a list in the runtime by hand.
// The owner asked for "a more readable map with streets and water", and the
// answer to that is not more drawing. It is the real data, which this repo has
// already fetched and licensed.
//
// PROVENANCE, because a map that will not say where its shapes came from is a
// drawing (each pack carries its own `source` block and this module never
// strips it — `credit()` reads it back out for the screen):
//
//   water     OpenStreetMap via Overpass, ODbL 1.0.
//   streets   OpenStreetMap via Overpass, ODbL 1.0. CENTRE ONLY: the extract's
//             own bounding box is 60.17–60.20 / 24.93–24.98, which is about the
//             middle third of the board. That is a real limit of the file and
//             is handled honestly below rather than hidden — see `hasStreets`.
//   districts City of Helsinki osa-aluejako 2015, via the dhh16 mirror. These
//             are LABEL POINTS derived from administrative areas, and the pack
//             says loudly that they are not a coastline: the polygons include
//             the sea, so only their name and centre are used here.
//
// All three were fetched on a networked machine, committed, and are read from
// disk. Nothing here reaches the network, which is the same rule the transit
// pack follows and the reason the game works offline.

// Which streets a scale is allowed to show. A street map is not one layer; it
// is a hierarchy, and drawing all 5652 ways at city scale is the same mistake
// as drawing all 102 trams — every road at once is no road at all.
// The board, as boardBox() derives it from the twenty-two delivery anchors.
// Repeated here rather than imported because ground.js must be answerable in
// bare node with no city pack loaded — and held against the real thing by
// test/ground.mjs, which does have one.
export const BOARD_BOX = { s: 60.1443, w: 24.8975, n: 60.2199, e: 24.9860 };
export const STREET_TIERS = { city: ['major'], route: ['major', 'mid'], stop: ['major', 'mid', 'minor'] };

export async function loadGround(base = './cities/ground/') {
  const get = async name => { try { const r = await fetch(base + name, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; } };
  // ONE street file, and the file says what it covers. The first cut of this
  // looked for a full-board pack and fell back to the centre extract, which
  // meant probing for a file that is not there — a 404 on every single load,
  // the same noise the superseded water fetch was removed for one version
  // earlier. The extent is a property of the pack, not of its name: the day
  // `scripts/streets-import.mjs` writes a full-board pack over this one, the
  // bounding box inside it changes and `streetsCoverBoard()` and the credit
  // line follow. Replacing the file IS the change.
  const [water, streets, corridors, districts, landmarks] = await Promise.all([
    get('helsinki-water.json'), get('helsinki-streets.json'), get('helsinki-corridors.json'),
    get('helsinki-districts.json'), get('helsinki-landmarks.json')]);
  return new Ground({ water, streets, corridors, districts, landmarks });
}

export class Ground {
  constructor({ water, streets, corridors, districts, landmarks }) {
    this.water = water || null;
    this.streets = streets || null;
    this.districts = districts || null;
    this.landmarks = landmarks || null;
    this.corridors = corridors || null;
    // Streets pre-bucketed by tier once, at load. The draw loop asks sixty times
    // a second and a filter per frame over 5652 ways is a filter per frame too
    // many.
    this.byTier = { major: [], mid: [], minor: [] };
    for (const road of this.streets?.roads || []) {
      // `service` and `track` are dropped, and they are a third of the pack.
      // In OSM they are parking aisles, courtyard access and yard tracks — real
      // ways, and not streets in the sense a courier reads a map. Drawn, they
      // ring every block with a spidery box and the actual street grid is lost
      // inside them; the stop-scale view was a hairball until they came out.
      if (road.class === 'service' || road.class === 'track') continue;
      // 260 of the pedestrian ways are CLOSED rings — squares and plazas mapped
      // as areas, not routes you walk along. Stroked as lines they draw a box
      // around every block in the centre, which is what the stop-scale view was
      // full of: not a street grid, an outline of the ground floor of Helsinki.
      const sh = road.shape || [];
      if (road.class === 'pedestrian' && sh.length > 2 &&
          sh[0][0] === sh[sh.length - 1][0] && sh[0][1] === sh[sh.length - 1][1]) continue;
      (this.byTier[road.tier] || this.byTier.minor).push(road);
    }
    this.streetBox = this.streets?.boundingBox || null;
    // AFTER streetBox: the clip is defined by the street pack's extent, and
    // computing it a line earlier silently kept every corridor whole — 653 runs
    // and 5079 points, exactly the unclipped input, which looks like success.
    this.corridorRuns = this._clipCorridors();
  }

  // THE OUTER BOARD, and how it stopped being invented.
  //
  // 78% of the board has no OSM streets, and until now that 78% was drawn with
  // twelve hand-authored corridors — the one kind of geometry this project's own
  // rules say must never sit on the board as though it were real. The HSL GTFS
  // corridor pack covers 60.149-60.218 / 24.895-24.995, which is essentially the
  // whole board, and it is REAL: the streets along which HSL actually runs
  // service, traced from the feed.
  //
  // It is emphatically NOT a street map, and its own source block says so at
  // length: it has every street a bus or tram uses and no street without a route
  // on it. That is the right shape for the coarse layer anyway — arterials are
  // exactly what carries service — and the credit line says which is which.
  //
  // Rail, metro and ferry corridors are dropped. A ferry corridor is a line
  // across open water; drawing it as a road would put a street through the
  // harbour.
  //
  // Each corridor is CLIPPED to the ground the street pack does not cover, so
  // the two layers never draw the same street twice with slightly different
  // geometry — the doubling that made this a choice between them rather than a
  // combination of them.
  _clipCorridors() {
    const b = this.streetBox, runs = [];
    const outside = ([lat, lon]) => !b || lat < b.s || lat > b.n || lon < b.w || lon > b.e;
    for (const c of this.corridors?.corridors || []) {
      if (c.mode !== 'bus' && c.mode !== 'tram') continue;
      let run = [];
      for (const p of c.shape || []) {
        if (outside(p)) run.push(p);
        else { if (run.length >= 2) runs.push({ mode: c.mode, trips: c.trips, shape: run }); run = []; }
      }
      if (run.length >= 2) runs.push({ mode: c.mode, trips: c.trips, shape: run });
    }
    // Weight from the feed, not from a guess: how many trips a week run along
    // it. The quartiles of the real distribution are 458 / 992 / 2394, so the
    // thresholds are the data's own shape rather than round numbers.
    for (const r of runs) r.tier = r.trips >= 2394 ? 'major' : r.trips >= 992 ? 'mid' : 'minor';

    // ONE LINE PER STREET. A GTFS shape exists per direction and per route, so
    // a street a bus runs both ways along arrives as two traces a few metres
    // apart — and half a dozen routes down Mäkelänkatu arrive as half a dozen.
    // Drawn, that is a dual carriageway where there is one road, which is the
    // same lie as an authored line.
    //
    // So the busiest run in a place wins and the rest are dropped: points are
    // hashed into ~20 m cells, and a run whose ground is already covered is not
    // a second street. Busiest first, because the trunk should be the one that
    // survives and it is the one whose geometry the most services agree on.
    const CELL = 20 / 111320;                     // ~20 m, in degrees of latitude
    const key = ([lat, lon]) => `${Math.round(lat / CELL)}:${Math.round(lon / (CELL * 2))}`;
    const taken = new Set(), kept = [];
    for (const r of runs.slice().sort((a, b) => b.trips - a.trips)) {
      const keys = r.shape.map(key);
      const seen = keys.filter(k => taken.has(k)).length;
      if (seen / keys.length > 0.8) continue;     // this ground already has a street on it
      for (const k of keys) taken.add(k);
      kept.push(r);
    }
    return kept;
  }
  corridorsFor(scale) {
    const tiers = STREET_TIERS[scale] || STREET_TIERS.city;
    return this.corridorRuns.filter(r => tiers.includes(r.tier));
  }

  // Does the street extract actually cover this point? The honest half of the
  // centre-only limit: inside the box the real streets are the ground, outside
  // it there are none and the board keeps the schematic corridors it has always
  // had. The alternative — drawing both everywhere — puts an authored line
  // beside a real one along the same street, which is the one thing the map is
  // not allowed to do.
  hasStreets(lat, lon) {
    const b = this.streetBox;
    return !!b && lat >= b.s && lat <= b.n && lon >= b.w && lon <= b.e;
  }
  // Does the street pack reach the whole playable board? The board box is
  // derived from the delivery anchors, so this is asked of the anchors rather
  // than of a constant that could drift away from them.
  streetsCoverBoard(box = BOARD_BOX) {
    const b = this.streetBox;
    return !!b && b.s <= box.s && b.n >= box.n && b.w <= box.w && b.e >= box.e;
  }
  streetsFor(scale) {
    const tiers = STREET_TIERS[scale] || STREET_TIERS.city;
    return tiers.flatMap(t => this.byTier[t] || []);
  }

  // Place names, coarsest first. `areaRank` is the district's share of the
  // extent, which is the only ordering in the pack that means anything on a
  // map: the big quarters are the ones you navigate by from far away.
  districtsFor(scale) {
    const all = [...(this.districts?.districts || [])].sort((a, b) => b.areaRank - a.areaRank);
    return scale === 'city' ? all.slice(0, 14) : all;
  }

  // The licence conditions, as one line for the corner of the board. Read from
  // the packs rather than typed, so a pack swapped for a differently licensed
  // one cannot keep the old credit.
  credit() {
    const out = [];
    for (const p of [this.water, this.streets]) if (p?.source?.attribution) out.push(`${p.source.attribution} (${p.source.licence})`);
    if (this.districts?.source?.dataset) out.push('districts: City of Helsinki');
    // The extent is part of the truth, not a footnote: the street pack covers
    // the centre only, so a reader looking at a street-less Eira is told why
    // rather than left to conclude the city has none there.
    // "centre extract" is a claim about the extent, so it is derived from the
    // extent rather than baked in: a full-board pack must not describe itself
    // as a centre extract, and a centre extract must not stop saying so.
    const b = this.streetBox;
    if (b) out.push(this.streetsCoverBoard()
      ? 'streets: whole board'
      : `streets: centre extract ${b.s}–${b.n}N ${b.w}–${b.e}E`);
    // The landmarks are the one layer on the board that is NOT source data, so
    // the credit says so in its own words rather than letting the OpenStreetMap
    // line at the front of the string be read as covering them.
    if (this.landmarks?.landmarks?.length) out.push('landmarks: map symbols, placed by hand');
    // The corridors are a different source under a different licence, and they
    // are not streets — both facts belong on screen, because a reader looking at
    // Käpylä is looking at bus routes drawn as roads.
    if (this.corridorRuns.length && this.corridors?.source?.attribution)
      out.push(`beyond the extract: ${this.corridors.source.attribution} corridors (${this.corridors.source.licence}), not a street map`);
    return [...new Set(out)].join(' · ');
  }
}
