// Toko Move v3.12 — THE MOMENTS (the owner's approved exterior art, PR #632:
// 21 scenes, art/approved-exteriors/APPROVED-ART.json is the inventory).
//
// Illustrations of the job itself, each standing full frame at the beat it
// draws, under the panel that beat already has:
//   · a job is TAKEN — a handover where you are: the station at Rautatientori,
//     the canal at Ruoholahti, the market quay at the harbour stops, the
//     lakeside park at the park stops; anywhere else a kiosk hatch, a bench,
//     or the tram stop
//   · a job is DELIVERED — the same places at the drop, else a doorway, a
//     cyclist at the steps, or the bench
//   · a tram is BOARDED (after it has pulled in) — a tram stop, five ways
//   · a metro is BOARDED — at Kalasatama, the open-air platform (four ways:
//     of the game's 23 places only Kalasatama has an outdoor metro); anywhere
//     else, the stairs down
// The art is sunny only (the owner: "Sunny ones work, rain doesn't"), so the
// moments stand on a clear day, by day; the night shift and the weather keep
// the game's own scenes. Five scenes were approved in landscape only and no
// portrait was made of them; a phone held upright picks from the others.
//
// A beat picks from its pool by the thing itself (the drop, the ride), so the
// same drop is always the same picture and the next one, likely, is not.
//
// `face` is where the push-in starts and `keep` what a cropped screen holds in
// view, as fractions of each format. The four open-perspectives scenes carry
// their pack's crop boxes and courier faces instead (sources/compose.py,
// crop-metadata.json — test/moments.mjs holds them to it).
// Pure: no DOM.
const BOTH = ['169', '916'], WIDE = ['169'];
export const MOMENTS = {
  // the open-perspectives pack (measured on its masters)
  kiosk:     { src: ['sunny-open-perspectives', 'kiosk'], fmts: BOTH, at: [377, 319], crop: { '169': [0, 200, 1024, 776], '916': [260, 0, 836, 1024] } },
  doorway:   { src: ['sunny-open-perspectives', 'doorway'], fmts: BOTH, at: [528, 180], keep: [528, 330], crop: { '169': [0, 64, 1024, 640], '916': [240, 0, 816, 1024] } },
  cyclist:   { src: ['sunny-open-perspectives', 'cyclist'], fmts: BOTH, at: [470, 560], keep: [760, 520], crop: { '169': [0, 152, 1024, 728], '916': [272, 0, 848, 1024] } },
  'metro-open': { src: ['sunny-open-perspectives', 'metro'], fmts: BOTH, at: [434, 597], keep: [633, 597], crop: { '169': [0, 248, 1024, 824], '916': [380, 0, 956, 1024] } },
  // the rest, framed by eye on a phone (fractions per format; the middle if not said)
  bench:     { src: ['sunny-open-backgrounds', 'bench'], fmts: BOTH },
  'tram-open': { src: ['sunny-open-backgrounds', 'tram'], fmts: BOTH },
  'tram-stop': { src: ['sunny-new-locations', 'tram'], fmts: BOTH, keep: { '916': [.45, .55] } },
  'tram-quiet': { src: ['sunny-minimal-comparisons', 'tram'], fmts: BOTH, keep: { '916': [.45, .55] } },
  'metro-east': { src: ['sunny-new-locations', 'metro'], fmts: BOTH, keep: { '916': [.62, .5] } },
  'metro-quiet': { src: ['sunny-minimal-comparisons', 'metro'], fmts: BOTH, keep: { '916': [.62, .5] } },
  park:      { src: ['sunny-new-locations', 'park'], fmts: BOTH },
  kalasatama: { src: ['sunny-city-arrivals', 'kalasatama'], fmts: BOTH, keep: { '916': [.42, .55] } },
  station:   { src: ['sunny-city-arrivals', 'station'], fmts: BOTH },
  canal:     { src: ['sunny-city-arrivals', 'canal'], fmts: BOTH },
  platform:  { src: ['sunny-dual-crop-v2', 'platform'], fmts: BOTH },
  ferry:     { src: ['sunny-dual-crop-v2', 'harbour'], fmts: BOTH },
  // approved in landscape only
  'stop-handoff': { src: ['outdoor-weather-tests', 'tram'], fmts: WIDE },
  'harbour-handoff': { src: ['outdoor-weather-tests', 'harbour'], fmts: WIDE },
  'metro-stairs': { src: ['outdoor-weather-tests', 'metro'], fmts: WIDE },
  stairs:    { src: ['sunny-camera-studies', '03-elevated-metro'], fmts: WIDE },
  quay:      { src: ['sunny-camera-studies', '04-close-quay'], fmts: WIDE },
};
const frac = (m, fmt, p) => { const [x0, y0, x1, y1] = m.crop[fmt]; return [+((p[0] - x0) / (x1 - x0)).toFixed(3), +((p[1] - y0) / (y1 - y0)).toFixed(3)]; };
export const faceIn = (id, fmt) => { const m = MOMENTS[id]; return m.crop ? frac(m, fmt, m.at) : (m.face?.[fmt] || m.keep?.[fmt] || [.5, .5]); };
// what a cropped screen keeps in view: the face, unless the scene says otherwise
// (the cyclist's portrait has the courier's back at one edge and her face at the
// other: a phone keeps her face and the parcel; sideways, the doorway keeps the
// courier's middle, so his parcel is not on the frame's edge; the metro's
// portrait keeps the courier at its edge and the cab's front)
export const keepIn = (id, fmt) => { const m = MOMENTS[id]; return m.crop ? frac(m, fmt, m.keep || m.at) : (m.keep?.[fmt] || faceIn(id, fmt)); };

// ── the pools ───────────────────────────────────────────────────────────────
const HARBOUR = ['kauppatori', 'olympiaterminaali', 'katajanokka', 'lansiterminaali'];
const PARKS = ['ooppera', 'meilahti', 'arabia', 'kapyla'];
// a handover that has a place of its own (the station's granite, the canal's
// bridge, the market quay and the ferry, the lakeside reeds of Töölönlahti and
// Vanhankaupunginlahti)
export const HANDOFF_AT = { rautatientori: ['station'], ruoholahti: ['canal'],
  ...Object.fromEntries(HARBOUR.map(p => [p, ['harbour-handoff', 'quay', 'ferry']])), ...Object.fromEntries(PARKS.map(p => [p, ['park']])) };
export const PICKUP = ['kiosk', 'bench', 'stop-handoff'];
export const DELIVERY = ['doorway', 'cyclist', 'bench'];
export const BOARD_TRAM = ['tram-stop', 'tram-quiet', 'tram-open', 'platform', 'stop-handoff'];
export const BOARD_METRO_KALASATAMA = ['metro-open', 'metro-east', 'metro-quiet', 'kalasatama'];
export const BOARD_METRO = ['metro-stairs', 'stairs'];
// the old trams are their own pictures (the museum tram, the Nr I and II): the art draws today's
const OLD = new Set(['museum', 'nr1', 'nr2']);

// FNV-1a, then a final mix: FNV's low bits barely move for keys that differ
// only at the end (rides from one stop picked two of four pictures)
const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
export function pick(pool, fmt, key) { const can = (pool || []).filter(id => MOMENTS[id]?.fmts.includes(fmt)); return can.length ? can[hash(key) % can.length] : null; }
const place = (at, generic, fmt, key) => pick(HANDOFF_AT[at], fmt, key) || pick(generic, fmt, key);
// `day`: by day and in clear weather — the art's sun
export const pickupMoment = (at, job, fmt, day) => (day && job ? place(at, PICKUP, fmt, `${at}|${job.to}|${job.cargo}`) : null);
export const deliveryMoment = (d, fmt, day) => (day && d ? place(d.to, DELIVERY, fmt, `${d.to}|${d.contents}`) : null);
export function boardMoment(hop, fmt, day) {
  if (!day || hop?.kind !== 'ride' || OLD.has(hop.model)) return null;
  const key = `${hop.from}|${hop.to}|${hop.line?.id || ''}`;
  if (hop.model === 'metro') return pick(hop.from === 'kalasatama' ? BOARD_METRO_KALASATAMA : BOARD_METRO, fmt, key);
  return pick(BOARD_TRAM, fmt, key);
}
