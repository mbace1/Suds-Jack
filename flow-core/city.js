// The shared city. ONE graph, two readings — this file is what makes the
// brief's "the legal and illegal city are the same city" true rather than
// asserted, so it lives in the core and neither product may fork it.
//
// Every name here is an ordinary Helsinki place name. The starting square is
// `vaasanaukio`, its real name; Piritori is a STREET NICKNAME and therefore a
// product label, applied by piritori/ at display time. That is not squeamishness
// — it is the seam working: the contract test scans the Toko Move bundle for
// product terms, and a node id is bundled into both.
//
// Compressed and fictionalised on purpose (brief: "recognisably Helsinki in
// coastline, rail and district rhythm"). Travel times are TICKS.

export const KALLIO = {
  bounds: { w: 160, h: 100 },

  nodes: [
    // id             name              x    y   tags
    { id: 'vaasanaukio', name: 'Vaasanaukio', x: 78, y: 50, tags: ['transfer', 'shop', 'home'], capacity: 30 },
    { id: 'kurvi', name: 'Kurvi', x: 106, y: 46, tags: ['transfer', 'work', 'home'], capacity: 26 },
    { id: 'vaasankatu', name: 'Vaasankatu', x: 92, y: 32, tags: ['shop', 'service'], capacity: 18 },
    { id: 'kuudeslinja', name: 'Kuudes linja', x: 48, y: 66, tags: ['shop', 'home'], capacity: 20 },
    { id: 'kirkko', name: 'Kallion kirkko', x: 38, y: 38, tags: ['service', 'school'], capacity: 16 },
    { id: 'karhupuisto', name: 'Karhupuisto', x: 62, y: 32, tags: ['home', 'school'], capacity: 18 },
    { id: 'hakaniemi', name: 'Hakaniemi', x: 24, y: 80, tags: ['transfer', 'shop', 'work'], capacity: 30 },
    { id: 'sornainen', name: 'Sörnäinen', x: 120, y: 72, tags: ['transfer', 'work'], capacity: 28 },
  ],

  // Walking is dense, local and slow; the tram is sparse, fast and shared.
  // The asymmetry is the whole point of having two modes: a walk edge exists
  // almost everywhere, so it is never the network that limits you — it is the
  // capacity riding it.
  edges: [
    // tram — the spine
    { id: 't1', a: 'hakaniemi', b: 'kuudeslinja', mode: 'tram', time: 22, capacity: 4 },
    { id: 't2', a: 'kuudeslinja', b: 'vaasanaukio', mode: 'tram', time: 26, capacity: 4 },
    { id: 't3', a: 'vaasanaukio', b: 'kurvi', mode: 'tram', time: 20, capacity: 4 },
    { id: 't4', a: 'kurvi', b: 'sornainen', mode: 'tram', time: 24, capacity: 4 },
    { id: 't5', a: 'kirkko', b: 'karhupuisto', mode: 'tram', time: 20, capacity: 3 },
    { id: 't6', a: 'karhupuisto', b: 'vaasankatu', mode: 'tram', time: 22, capacity: 3 },
    { id: 't7', a: 'vaasankatu', b: 'kurvi', mode: 'tram', time: 18, capacity: 3 },
    { id: 't8', a: 'kirkko', b: 'kuudeslinja', mode: 'tram', time: 22, capacity: 3 },

    // walk — the mesh under it
    { id: 'w1', a: 'vaasanaukio', b: 'vaasankatu', mode: 'walk', time: 30, capacity: 2 },
    { id: 'w2', a: 'vaasanaukio', b: 'karhupuisto', mode: 'walk', time: 34, capacity: 2 },
    { id: 'w3', a: 'vaasanaukio', b: 'kuudeslinja', mode: 'walk', time: 40, capacity: 2 },
    { id: 'w4', a: 'vaasankatu', b: 'karhupuisto', mode: 'walk', time: 28, capacity: 2 },
    { id: 'w5', a: 'karhupuisto', b: 'kirkko', mode: 'walk', time: 32, capacity: 2 },
    { id: 'w6', a: 'kirkko', b: 'kuudeslinja', mode: 'walk', time: 34, capacity: 2 },
    { id: 'w7', a: 'kuudeslinja', b: 'hakaniemi', mode: 'walk', time: 36, capacity: 2 },
    { id: 'w8', a: 'vaasanaukio', b: 'kurvi', mode: 'walk', time: 32, capacity: 2 },
    { id: 'w9', a: 'kurvi', b: 'vaasankatu', mode: 'walk', time: 28, capacity: 2 },
    { id: 'w10', a: 'kurvi', b: 'sornainen', mode: 'walk', time: 38, capacity: 2 },
  ],
};
