// The shared city. ONE graph, two readings — this file is what makes the
// brief's "the legal and illegal city are the same city" true rather than
// asserted, so it lives in the core and neither product may fork it.
//
// POSITIONS ARE REAL. Owner direction: work from a real map of Kallio, not an
// invented layout. Each stop below is projected from its actual WGS84 position
// — longitude scaled by cos(60.18°) so the district is not stretched sideways,
// latitude flipped so north is up — with Hakaniemi near the origin. So the
// diagram keeps the things a local would check: Hakaniemi low and west by the
// water, the district climbing north-east, the church west of Karhupuisto, the
// bend at Kurvi, Sörnäinen furthest out along Hämeentie.
//
//   x = (lon − 24.9480) × 55.34 km/deg × 110      (55.34 = 111.32 × cos 60.18°)
//   y = 100 − (lat − 60.1790) × 111.32 km/deg × 90
//
// Travel times are TICKS and stay roughly proportional to real distance, so a
// long run on the map costs a long run in play. Hämeentie is the exception and
// deliberately so: it is the arterial, so it is quicker per unit of distance
// than the streets that parallel it.
//
// Every name is an ordinary Helsinki place name. The starting square is
// `vaasanaukio`, its real name; Piritori is a STREET NICKNAME and therefore a
// product label, applied by the night product at display time. That is not
// squeamishness — it is the seam working, and the contract test scans the other
// product's bundle for exactly this.

export const KALLIO = {
  // real position of each stop, kept for anyone re-deriving the projection
  source: {
    hakaniemi: [60.1793, 24.9486], kuudeslinja: [60.1818, 24.9520],
    kirkko: [60.1846, 24.9489], karhupuisto: [60.1852, 24.9524],
    vaasanaukio: [60.1863, 24.9530], vaasankatu: [60.1860, 24.9545],
    kurvi: [60.1875, 24.9575], sornainen: [60.1884, 24.9628],
  },

  nodes: [
    // Hakaniemi — the market hall and the water, the low south-west corner
    { id: 'hakaniemi', name: 'Hakaniemi', x: 14, y: 97, tags: ['transfer', 'shop', 'work'], capacity: 30 },
    // the linjat, climbing north off Siltasaarenkatu
    { id: 'kuudeslinja', name: 'Kuudes linja', x: 34, y: 72, tags: ['shop', 'home'], capacity: 20 },
    // the church on its hill, west of everything
    { id: 'kirkko', name: 'Kallion kirkko', x: 16, y: 44, tags: ['service', 'school'], capacity: 16 },
    { id: 'karhupuisto', name: 'Karhupuisto', x: 37, y: 38, tags: ['home', 'school'], capacity: 18 },
    { id: 'vaasanaukio', name: 'Vaasanaukio', x: 40, y: 27, tags: ['transfer', 'shop', 'home'], capacity: 30 },
    { id: 'vaasankatu', name: 'Vaasankatu', x: 50, y: 30, tags: ['shop', 'service'], capacity: 18 },
    // Kurvi — where Hämeentie bends at Helsinginkatu
    { id: 'kurvi', name: 'Kurvi', x: 68, y: 15, tags: ['transfer', 'work', 'home'], capacity: 26 },
    { id: 'sornainen', name: 'Sörnäinen', x: 100, y: 6, tags: ['transfer', 'work'], capacity: 28 },
  ],

  // Tram follows the real corridors; walking is the mesh of streets under it.
  // The asymmetry is the point of having two modes: a walk link exists almost
  // everywhere, so it is never the network that limits you — it is the capacity
  // riding it.
  edges: [
    // Hämeentie, the arterial: quicker per unit than anything beside it
    { id: 't_hameentie', a: 'hakaniemi', b: 'kurvi', mode: 'tram', time: 44, capacity: 5 },
    { id: 't_kurvi_sor', a: 'kurvi', b: 'sornainen', mode: 'tram', time: 20, capacity: 4 },
    // Siltasaarenkatu up into the linjat
    { id: 't_hak_kuu', a: 'hakaniemi', b: 'kuudeslinja', mode: 'tram', time: 19, capacity: 4 },
    { id: 't_kuu_kir', a: 'kuudeslinja', b: 'kirkko', mode: 'tram', time: 20, capacity: 3 },
    { id: 't_kuu_kar', a: 'kuudeslinja', b: 'karhupuisto', mode: 'tram', time: 20, capacity: 3 },
    { id: 't_kir_kar', a: 'kirkko', b: 'karhupuisto', mode: 'tram', time: 13, capacity: 3 },
    { id: 't_kar_vaa', a: 'karhupuisto', b: 'vaasanaukio', mode: 'tram', time: 7, capacity: 4 },
    { id: 't_vaa_vsk', a: 'vaasanaukio', b: 'vaasankatu', mode: 'tram', time: 6, capacity: 4 },
    { id: 't_vsk_kur', a: 'vaasankatu', b: 'kurvi', mode: 'tram', time: 14, capacity: 4 },

    { id: 'w_vaa_vsk', a: 'vaasanaukio', b: 'vaasankatu', mode: 'walk', time: 11, capacity: 2 },
    { id: 'w_kar_vaa', a: 'karhupuisto', b: 'vaasanaukio', mode: 'walk', time: 13, capacity: 2 },
    { id: 'w_kar_vsk', a: 'karhupuisto', b: 'vaasankatu', mode: 'walk', time: 17, capacity: 2 },
    { id: 'w_kir_kar', a: 'kirkko', b: 'karhupuisto', mode: 'walk', time: 24, capacity: 2 },
    { id: 'w_kuu_kir', a: 'kuudeslinja', b: 'kirkko', mode: 'walk', time: 37, capacity: 2 },
    { id: 'w_hak_kuu', a: 'hakaniemi', b: 'kuudeslinja', mode: 'walk', time: 35, capacity: 2 },
    { id: 'w_kuu_kar', a: 'kuudeslinja', b: 'karhupuisto', mode: 'walk', time: 37, capacity: 2 },
    { id: 'w_vaa_kur', a: 'vaasanaukio', b: 'kurvi', mode: 'walk', time: 34, capacity: 2 },
    { id: 'w_vsk_kur', a: 'vaasankatu', b: 'kurvi', mode: 'walk', time: 26, capacity: 2 },
    { id: 'w_kur_sor', a: 'kurvi', b: 'sornainen', mode: 'walk', time: 37, capacity: 2 },
  ],
};
