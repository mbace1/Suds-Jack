// Toko Move v3.23 — THE DAY, DRAWN (owner, 2026-11-09: "randomized from
// modules, so the game actually becomes like a roguelike, and no strict
// missions are needed").
//
// Every shift draws what kind of day it is, on top of its run and its weather.
// About two in five are ordinary; the rest change the levers the run already
// has, never adding a rule:
//   fee      every job's fee, ×
//   deadline every job's clock, ×      (above 1 is kinder)
//   tip      euros added to every drop
//   luck     added to every risk's odds
//   walk     walking, × (the routes and the deadlines are set from it)
//   wait     the wait for a tram, ×
//   boost    which cards made from modules come up more (modules.js WANT ids)
// A day may ask for a weather (`skies`) or the hour (`night`). It is drawn from
// a hash of the seed, never the run's rng, so a seed is still one shift, and an
// ordinary day deals exactly what the shift dealt before days existed.
//
// The card shows it on the shift's first job, as a line above the text:
// the day's name, then what it does (`fx`), in the words the card uses.
//
// (v3.24) The rest of the shift is drawn the same way:
//   AREA   most shifts lean their drops to one part of the city (a stop in it
//          comes up three times as often); the first card names it
//   PERKS  two perks drawn for the shift from those not unlocked, the
//          trade-offs among them (missions.js); the draft offers one as its
//          special third button, while one is left to take
//
// Pure: no DOM. test/days.mjs holds it in bare node.

export const DAYS = {
  ordinary: { name: null, fx: [], weight: 40 },
  festival: { name: 'Helsinki Festival', fx: ['tips +€2', 'fuller trams'], tip: 2, wait: 1.15, boost: { music: 4, hockey: 2 }, weight: 8 },
  payday: { name: 'Payday', fx: ['fees ×1.15', 'everyone wants it now'], fee: 1.15, deadline: 0.92, weight: 8 },
  sunday: { name: 'A quiet Sunday', fx: ['fees ×0.9', 'clocks ×1.1'], fee: 0.9, deadline: 1.1, boost: { sun: 3, seat: 2, crossword: 3, icecream: 2 }, weight: 8 },
  heatwave: { name: 'A heatwave', fx: ['walking slower', 'tips +€1'], walk: 1.12, tip: 1, skies: ['clear'], boost: { sun: 4, icecream: 4 }, weight: 7 },
  firstsnow: { name: 'The first snow', fx: ['luck +5%', 'tips +€1'], luck: 0.05, tip: 1, skies: ['snow'], boost: { cold: 4, sauna: 3 }, weight: 7 },
  cruise: { name: 'Two cruise ships in', fx: ['fees ×1.05', 'tourists everywhere'], fee: 1.05, boost: { directions: 4, ticket: 3, map: 4, sauna: 2 }, weight: 8 },
  derby: { name: 'Derby day', fx: ['fuller trams', 'luck +5%'], wait: 1.1, luck: 0.05, boost: { hockey: 5 }, weight: 7 },
  fullmoon: { name: 'A full moon', fx: ['fees ×1.1', 'luck −5%'], fee: 1.1, luck: -0.05, night: true, boost: { night: 2, year: 2, hum: 2, shadow: 2, whistle: 2, lasttram: 2 }, weight: 10 },
};

const hash = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };

// Which days a shift can have: its weather and its hour.
export const fits = (id, { weather = 'clear', night = false } = {}) => { const d = DAYS[id];
  return !!d && (!d.skies || d.skies.includes(weather)) && (d.night ? night : true); };

// The day a shift draws: a seed, its weather and its hour.
export function dayFor(seed, ctx = {}) {
  const ids = Object.keys(DAYS).filter(id => fits(id, ctx)), total = ids.reduce((a, id) => a + DAYS[id].weight, 0);
  let r = (hash(`day:${seed}`) / 4294967296) * total;
  for (const id of ids) { r -= DAYS[id].weight; if (r < 0) return id; }
  return 'ordinary';
}

// The line the first card carries: "PAYDAY · FEES ×1.15 · EVERYONE WANTS IT NOW"
export const dayLine = id => { const d = DAYS[id]; return d?.name ? [d.name, ...d.fx].join(' · ') : null; };

// ── the area (v3.24) ─────────────────────────────────────────────────────
export const AREAS = {
  harbour: { line: 'drops around the harbour', stops: ['kauppatori', 'katajanokka', 'olympiaterminaali', 'lansiterminaali', 'hietalahti', 'eira'] },
  centre: { line: 'drops around the centre', stops: ['rautatientori', 'senaatintori', 'kamppi', 'lasipalatsi', 'ooppera'] },
  kallio: { line: 'drops around Kallio', stops: ['kallionkirkko', 'sornainen', 'hakaniemi', 'pasila', 'kapyla', 'messukeskus', 'arabia'] },
  east: { line: 'drops east of the bridge', stops: ['kalasatama', 'kruunuvuori', 'laajasalo', 'arabia', 'sornainen'] },
  west: { line: 'drops on the west side', stops: ['ruoholahti', 'meilahti', 'lansiterminaali', 'hietalahti', 'kamppi'] },
};
export const AREA_PULL = 3, AREA_SHARE = 0.6;
// the area a shift leans to, or null (two in five lean nowhere)
export function areaFor(seed) {
  const h = hash(`area:${seed}`); if ((h % 1000) / 1000 >= AREA_SHARE) return null;
  const ids = Object.keys(AREAS); return ids[(h >>> 10) % ids.length];
}
// how much more often a stop comes up today
export const pullOf = (area, stop) => area && AREAS[area]?.stops.includes(stop) ? AREA_PULL : 1;

// ── the perks (v3.24) ────────────────────────────────────────────────────
// what is unlocked, plus `n` drawn for the shift from everything else
export function perksFor(seed, unlocked, all, n = 2) {
  const rest = all.filter(p => !unlocked.includes(p)).sort((a, b) => hash(`perk:${seed}:${a}`) - hash(`perk:${seed}:${b}`));
  return { pool: [...unlocked, ...rest.slice(0, n)], drawn: rest.slice(0, n) };
}
