// The shared city. ONE graph, two readings — this file is what makes the
// brief's "the legal and illegal city are the same city" true rather than
// asserted, so it lives in the core and neither product may fork it.
//
// BUILT FROM THE OWNER'S REFERENCE MAPS (2026-08-17): a printed Helsinki city
// map of Harju/Kallio, a road map of the whole district, and two Google Maps
// captures — one of which searches "piritori" and pins it AT SÖRNÄINEN METRO.
// That corrected a real error here: Vaasanaukio is not a square in the middle
// of Kallio, it is the plaza at the metro's west door, and Vaasanaukio, Kurvi
// and the Sörnäinen station form one tight cluster at the Hämeentie bend.
// The maps also put two places on the board this graph was missing: the
// Kallion urheilukenttä / Brahen kenttä fields at Harju (circled on the
// printed map) and the Torkkelinmäki hill (labelled on both captures).
//
// AUTHENTIC SCALE. One design unit is TEN METRES. Every node is projected
// from its WGS84 position:
//
//   x = (lon − 24.9490) × 5534        (111.32 km/° × cos 60.185° ÷ 10 m)
//   y = (60.1885 − lat) × 11132       (111.32 km/° ÷ 10 m, north up)
//
// so the whole board is ~550 m wide and ~980 m tall — Kallio really is that
// small and that steep a rectangle, one metro stop from Hakaniemi to
// Sörnäinen. Distances between stops are therefore real distances, and edge
// times are cut from them: walk ≈ 0.9 ticks per unit, tram ≈ 0.45, so a
// minute of game time is roughly a real walk up Fleminginkatu.
//
// Every name is an ordinary Helsinki place name. The starting square is
// `vaasanaukio`, its real name; Piritori is a STREET NICKNAME and therefore a
// product label, applied by the night product at display time. That is not
// squeamishness — it is the seam working, and the contract test scans the
// other product's bundle for exactly this.

// The projection itself, exported rather than only described above — the
// ground importer needs the SAME arithmetic the stops were placed with, and a
// second copy of two constants is a second copy that can drift. The contract
// test re-derives every node from `source` through this and compares.
export const ORIGIN = { lon: 24.9490, lat: 60.1885, kx: 5534, ky: 11132 };
export const project = (lon, lat) => ({
  x: (lon - ORIGIN.lon) * ORIGIN.kx,
  y: (ORIGIN.lat - lat) * ORIGIN.ky,
});

export const KALLIO = {
  // the WGS84 positions each node was projected from, kept so anyone can
  // re-derive the board or add a stop without guessing
  source: {
    hakaniemi: [60.1794, 24.9511], kuudeslinja: [60.1832, 24.9527],
    kirkko: [60.1844, 24.9500], karhupuisto: [60.1845, 24.9534],
    torkkelinmaki: [60.1848, 24.9560], harju: [60.1864, 24.9507],
    vaasankatu: [60.1881, 24.9560], vaasanaukio: [60.1871, 24.9572],
    kurvi: [60.1875, 24.9590], sornainen: [60.1880, 24.9601],
  },

  nodes: [
    // the south: the market hall, the water, the metro's other end
    { id: 'hakaniemi', name: 'Hakaniemi', x: 12, y: 101, tags: ['transfer', 'shop', 'work'], capacity: 30 },
    // the linjat climbing north
    { id: 'kuudeslinja', name: 'Kuudes linja', x: 20, y: 59, tags: ['shop', 'home'], capacity: 20 },
    // the church on its rock, west of everything
    { id: 'kirkko', name: 'Kallion kirkko', x: 6, y: 46, tags: ['service', 'school'], capacity: 16 },
    { id: 'karhupuisto', name: 'Karhupuisto', x: 24, y: 45, tags: ['home', 'school'], capacity: 18 },
    // the residential hill between Pengerkatu and Hämeentie
    { id: 'torkkelinmaki', name: 'Torkkelinmäki', x: 39, y: 41, tags: ['home'], capacity: 16 },
    // Brahen kenttä / Kallion urheilukenttä — circled on the owner's map
    { id: 'harju', name: 'Harju', x: 9, y: 23, tags: ['home', 'service'], capacity: 18 },
    // the restaurant street, running up into Harju
    { id: 'vaasankatu', name: 'Vaasankatu', x: 39, y: 4, tags: ['shop', 'service'], capacity: 18 },
    // the plaza at the metro's west door — one block, three names
    { id: 'vaasanaukio', name: 'Vaasanaukio', x: 45, y: 16, tags: ['transfer', 'shop', 'home'], capacity: 30 },
    // where Hämeentie bends at Helsinginkatu
    { id: 'kurvi', name: 'Kurvi', x: 55, y: 11, tags: ['transfer', 'work', 'shop'], capacity: 26 },
    { id: 'sornainen', name: 'Sörnäinen', x: 61, y: 6, tags: ['transfer', 'work'], capacity: 28 },
  ],

  // Edges follow real corridors. Hämeentie is the arterial (Hakaniemi straight
  // to Kurvi, tram 6's run); Siltasaarenkatu climbs to the linjat; the church
  // loop takes Karhupuisto; Helsinginkatu runs the east-west line past the
  // Harju fields. Walking is the street mesh under all of it — a walk link
  // exists almost everywhere, so it is never the network that limits you, it
  // is the capacity riding it.
  edges: [
    // tram corridors
    { id: 't_silta', a: 'hakaniemi', b: 'kuudeslinja', mode: 'tram', time: 19, capacity: 4 },
    { id: 't_kuu_kir', a: 'kuudeslinja', b: 'kirkko', mode: 'tram', time: 9, capacity: 3 },
    { id: 't_kir_kar', a: 'kirkko', b: 'karhupuisto', mode: 'tram', time: 8, capacity: 3 },
    { id: 't_kar_vaa', a: 'karhupuisto', b: 'vaasanaukio', mode: 'tram', time: 18, capacity: 4 },
    { id: 't_helsinginkatu', a: 'harju', b: 'vaasanaukio', mode: 'tram', time: 17, capacity: 3 },
    { id: 't_vaa_kur', a: 'vaasanaukio', b: 'kurvi', mode: 'tram', time: 5, capacity: 5 },
    { id: 't_kur_sor', a: 'kurvi', b: 'sornainen', mode: 'tram', time: 4, capacity: 5 },
    { id: 't_hameentie', a: 'hakaniemi', b: 'kurvi', mode: 'tram', time: 45, capacity: 5 },

    // the street mesh
    { id: 'w_vaa_vsk', a: 'vaasanaukio', b: 'vaasankatu', mode: 'walk', time: 12, capacity: 2 },
    { id: 'w_vsk_kur', a: 'vaasankatu', b: 'kurvi', mode: 'walk', time: 16, capacity: 2 },
    { id: 'w_vaa_kur', a: 'vaasanaukio', b: 'kurvi', mode: 'walk', time: 10, capacity: 2 },
    { id: 'w_kur_sor', a: 'kurvi', b: 'sornainen', mode: 'walk', time: 7, capacity: 2 },
    { id: 'w_penger', a: 'vaasanaukio', b: 'torkkelinmaki', mode: 'walk', time: 23, capacity: 2 },
    { id: 'w_tor_kar', a: 'torkkelinmaki', b: 'karhupuisto', mode: 'walk', time: 14, capacity: 2 },
    { id: 'w_tor_kur', a: 'torkkelinmaki', b: 'kurvi', mode: 'walk', time: 30, capacity: 2 },
    { id: 'w_kar_kir', a: 'karhupuisto', b: 'kirkko', mode: 'walk', time: 16, capacity: 2 },
    { id: 'w_kar_vaa', a: 'karhupuisto', b: 'vaasanaukio', mode: 'walk', time: 32, capacity: 2 },
    { id: 'w_kir_kuu', a: 'kirkko', b: 'kuudeslinja', mode: 'walk', time: 17, capacity: 2 },
    { id: 'w_kuu_hak', a: 'kuudeslinja', b: 'hakaniemi', mode: 'walk', time: 39, capacity: 2 },
    { id: 'w_harju_vsk', a: 'harju', b: 'vaasankatu', mode: 'walk', time: 32, capacity: 2 },
    { id: 'w_harju_kir', a: 'harju', b: 'kirkko', mode: 'walk', time: 21, capacity: 2 },
    { id: 'w_harju_kar', a: 'harju', b: 'karhupuisto', mode: 'walk', time: 24, capacity: 2 },

    // the metro tunnel — Hakaniemi to Sörnäinen is 900 m of tube (opened
    // 1984, Sörnäinen station at Helsinginkatu 1), far quicker than the
    // street and far bigger than anything on it
    { id: 'm_tunnel', a: 'hakaniemi', b: 'sornainen', mode: 'metro', time: 26, capacity: 6 },

    // car corridors: Hämeentie and Helsinginkatu carry private traffic
    { id: 'c_hameentie', a: 'hakaniemi', b: 'kurvi', mode: 'car', time: 30, capacity: 8 },
    { id: 'c_kur_sor', a: 'kurvi', b: 'sornainen', mode: 'car', time: 5, capacity: 8 },
    { id: 'c_helsinginkatu', a: 'harju', b: 'vaasanaukio', mode: 'car', time: 11, capacity: 6 },
    { id: 'c_vaa_kur', a: 'vaasanaukio', b: 'kurvi', mode: 'car', time: 4, capacity: 6 },
  ],

  // FIXED SERVICES — running from the first tick, not drawable, not editable.
  // These are the early-2000s services that really worked these streets: the
  // metro between the two stations; tram 6 up Hämeentie toward Arabia; the
  // 3B/3T figure-eight's Kallio loop past the church and Karhupuisto (its
  // letters lasted until 2013); tram 1 along Helsinginkatu past the fields;
  // and ordinary car traffic on the two big streets. The player's own lines
  // are drawn on top of — and compete for room with — all of this.
  lines: [
    { id: 'M', name: 'Metro', mode: 'metro', nodes: ['hakaniemi', 'sornainen'], carriers: 2, carrierCapacity: 40 },
    { id: '6', name: '6', mode: 'tram', nodes: ['hakaniemi', 'kurvi', 'sornainen'], carriers: 2, carrierCapacity: 12 },
    { id: '3B', name: '3B', mode: 'tram', nodes: ['hakaniemi', 'kuudeslinja', 'kirkko', 'karhupuisto', 'vaasanaukio', 'kurvi'], carriers: 2, carrierCapacity: 12 },
    { id: '1', name: '1', mode: 'tram', nodes: ['harju', 'vaasanaukio', 'kurvi'], carriers: 1, carrierCapacity: 10 },
    { id: 'cars1', name: 'Hämeentie', mode: 'car', nodes: ['hakaniemi', 'kurvi', 'sornainen'], carriers: 3, carrierCapacity: 2 },
    { id: 'cars2', name: 'Helsinginkatu', mode: 'car', nodes: ['harju', 'vaasanaukio', 'kurvi'], carriers: 2, carrierCapacity: 2 },
  ],
};
