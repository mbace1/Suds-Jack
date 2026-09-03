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
  const [water, streets, districts, landmarks] = await Promise.all([
    get('helsinki-water.json'), get('helsinki-streets.json'),
    get('helsinki-districts.json'), get('helsinki-landmarks.json')]);
  return new Ground({ water, streets, districts, landmarks });
}

export class Ground {
  constructor({ water, streets, districts, landmarks }) {
    this.water = water || null;
    this.streets = streets || null;
    this.districts = districts || null;
    this.landmarks = landmarks || null;
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
    return [...new Set(out)].join(' · ');
  }
}
