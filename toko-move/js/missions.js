// Toko Move v3.14 — MISSIONS, AND WHAT A RUN CARRIES (owner, 2026-11-07: "Add
// wallet menu and UI based on base simple UX look that's already used for
// choices. Also start adding the art and locations, build missions and all the
// events in those missions with correct art. Add roguelike elements").
//
// A MISSION is a short authored errand across real places: three jobs, each
// with its own brief, its own drop and its own event card — chosen from the
// cards that have art (a stop's actor, or a moment of the approved pack), so a
// mission is told in pictures. It is played with the journey's own rules and
// cards; nothing here is a second game.
//
// The ROGUELIKE parts, each a lever the journey already has:
//   · every seed is a different version of the mission: a step lists a few
//     drops and a few events, and the run draws one of each
//   · two late drops and the mission is lost (STRIKES) — late was allowed in
//     the runs; an errand someone is waiting on is not so patient
//   · between jobs you DRAFT one of two perks for the rest of the mission, and
//     the run is the build you made of them
//   · finishing a mission opens the next, and puts a new perk in the pool
//
// THE WALLET is the first card made for a mission: the classic deck's
// encounter, as a journey card with the bible's two buttons (handing it in is
// the approved kiosk scene), and its callback — the man whose wallet it was.
//
// Pure apart from the save: test/missions.mjs holds it in bare node.

export const MISSION_CARDS = {
  wallet: { id: 'wallet', tone: ['fun', 'risky'], where: 'stop', mood: 'opportunity', text: 'A wallet on the bench by the shelter. A bus card, a library card, €40.',
    options: [{ label: 'Hand it in at the kiosk', time: 60, pay: 1.1, set: 'wallet', say: 'The kiosk keeps a drawer for this. The drawer is full of gloves.' },
      { label: 'Pocket it', time: 0, risk: { odds: 'maybe', win: { cash: 40, say: 'Nobody saw. You feel it in your pocket all the way.' }, lose: { cash: -20, say: 'The owner saw. You give it back, and €20 for the fright.' } } },
      { label: 'Find him from the library card', time: 150, pay: 1.3, set: 'wallet', tier: 'very', say: 'The library knows him. He is reading in the corner, and nearly cries.' }] },
  wallet2: { id: 'wallet2', tone: ['fun'], where: 'aboard', mood: 'opportunity', text: 'The man whose wallet you handed in is on this tram. He knows your bag.',
    options: [{ label: 'Say hello', time: 30, pay: 1.2, say: 'He runs the café at your next drop. "Your coffee is on the house. For a year."' },
      { label: 'Look out of the window', time: 0, say: 'He nods at your reflection. That counts.' },
      { label: 'Buy him a coffee', time: 30, cash: -3, pay: 1.25, tier: 'special', say: 'He insists on paying. You insist harder. You win, and he tips you anyway.' }] },
};
export const MISSION_CALLBACKS = { wallet: MISSION_CARDS.wallet2 };

// a step: where the job may send you, what it is, how dispatch says it, and the
// (v3.15) a step may be a FORK — two such errands, and the card asks which —
// or carry the run's own modifiers: `rival` (race her) and `sealed` (only a sticker).
// A mission plays on MEDIUM's city unless it says `base: 'night'`.
//
// event cards it may deal (ids from cards.js or MISSION_CARDS; the run draws one).
// No buyer cards: selling the errand's parcel would end the errand, a trap
// rather than a choice (a first cut dealt four, and lost most runs to them).
export const MISSIONS = [
  { id: 'aino', name: 'AINO\'S MORNING', glyph: '✿', start: 'lasipalatsi', title: 'Three errands for one lady',
    blurb: 'Flowers to the Opera, a reply across town, and a cake for the station. She will remember who helped.',
    steps: [
      { to: ['ooppera'], cargo: 'fragile', brief: 'Flowers from Lasipalatsi, for a friend at the Opera.', cards: ['granny'] },
      { to: ['kamppi', 'eira'], cargo: 'documents', brief: 'Her friend writes back. A letter for {stop}.', cards: ['map', 'busker'] },
      { to: ['rautatientori'], cargo: 'fresh food', brief: 'The last errand: a cake for the station café.', cards: ['gull', 'swedish', 'puffy'] },
    ] },
  { id: 'wallet', name: 'LOST AND FOUND', glyph: '◈', start: 'kauppatori', title: 'The harbour, the island, the station',
    blurb: 'Programmes to Katajanokka, post for the ferries, and something on a bench that is not yours.',
    steps: [
      { to: ['katajanokka'], cargo: 'documents', brief: 'A box of programmes from the market quay to Katajanokka.', cards: ['wallet'] },
      { to: ['olympiaterminaali', 'lansiterminaali'], cargo: 'parts', brief: 'A spare part for the ferry at {stop}.', cards: ['gull', 'swedish'] },
      { to: ['rautatientori'], cargo: 'documents', brief: 'The harbour master\'s post, up to the station.', cards: ['map', 'busker'] },
    ] },
  { id: 'east', name: 'EAST OF THE BRIDGE', glyph: '◭', start: 'hakaniemi', deadline: 1.25, title: 'Kalasatama, Arabia, and back',
    blurb: 'Tools for the towers, a parcel for the gallery, and the market before it shuts.',
    steps: [
      { to: ['kalasatama'], cargo: 'equipment', brief: 'Tools for the site at Kalasatama. Transit only: it is heavy.', cards: ['busker', 'swedish', 'puffy'] },
      { fork: [{ to: ['arabia'], cargo: 'fragile', brief: 'A vase for the gallery at Arabia. Mind the corners.', cards: ['sauna', 'map'] },
               { to: ['sornainen'], cargo: 'parts', brief: 'A spare part for the market hall\'s lift at Sörnäinen.', cards: ['busker', 'swedish'] }] },
      { to: ['hakaniemi', 'kallionkirkko'], cargo: 'market goods', brief: 'Back to {stop} before the market shuts.', cards: ['gull', 'busker'] },
    ] },
  { id: 'harbour', name: 'THE HARBOUR ROUND', glyph: '⚓', start: 'olympiaterminaali', title: 'Quay to quay, and the canal',
    blurb: 'The ferries\' post, a crate along the shore, and a delivery to the canal.',
    steps: [
      { to: ['kauppatori'], cargo: 'fresh food', brief: 'Fish for the market hall, from the ferry.', cards: ['gull', 'swedish'] },
      { to: ['lansiterminaali', 'hietalahti'], cargo: 'parts', brief: 'A crate along the shore to {stop}.', cards: ['map', 'sauna', 'puffy'] },
      { to: ['ruoholahti'], cargo: 'documents', brief: 'Drawings for the office by the canal at Ruoholahti.', cards: ['spruce2', 'busker', 'wallet'] },
    ] },
  // v3.15: the run's own modifiers as a mission, and the night
  { id: 'sticker', name: 'THE STICKER', glyph: '◉', start: 'kamppi', title: 'A race, a sealed parcel, a choice',
    blurb: 'The other courier wants the first one. The second has no address, only a sticker. The third is yours to pick.',
    steps: [
      { to: ['kauppatori', 'katajanokka'], cargo: 'documents', rival: true, brief: 'A plain envelope for {stop}. Somebody is waiting.', cards: ['map', 'busker'] },
      { to: ['eira', 'kallionkirkko', 'ooppera', 'arabia'], cargo: 'documents', sealed: true, brief: 'A sealed parcel. No address, only a sticker.', cards: ['sealed'] },
      { fork: [{ to: ['rautatientori'], cargo: 'express', brief: 'An express parcel for the station: a big fee, a tight clock.', cards: ['gull', 'swedish'] },
               { to: ['hakaniemi', 'sornainen'], cargo: 'parts', brief: 'A box of parts for the market at {stop}. No hurry.', cards: ['busker', 'sauna'] }] },
    ] },
  { id: 'lasttram', name: 'THE LAST TRAM', glyph: '☾', start: 'rautatientori', base: 'night', deadline: 1.1, skies: ['clear', 'fog'], title: 'Three errands after eleven',
    blurb: 'Kebabs for Kallio, a contract before midnight, and something that hums. Half the trams, and one with no number.',
    steps: [
      { to: ['kallionkirkko', 'sornainen'], cargo: 'hot food', brief: 'Late kebabs for a flat in {stop}. They are getting cold.', cards: ['ghost', 'karaoke'] },
      { to: ['kamppi', 'ooppera'], cargo: 'documents', brief: 'A contract that must be signed before midnight, at {stop}.', cards: ['humming', 'reindeer'] },
      { fork: [{ to: ['eira'], cargo: 'fragile', brief: 'Something that hums, for a villa in Eira. Do not open it.', cards: ['ghost', 'karaoke'] },
               { to: ['katajanokka'], cargo: 'documents', brief: 'An envelope for the night ferry at Katajanokka.', cards: ['humming', 'reindeer'] }] },
    ] },
];
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map(m => [m.id, m]));
export const STRIKES = 2;

// the perks: one of two drafted between jobs, for the rest of the mission
export const PERKS = {
  shoes:    { name: 'Good shoes', line: 'walks a fifth quicker', apply: s => { s.run.walkFactor *= 0.8; } },
  pass:     { name: 'A season pass', line: 'trams come sooner', apply: s => { s.run.headway *= 0.7; } },
  map:      { name: 'A paper map', line: 'every deadline a fifth longer', apply: s => { s.mods.deadline *= 1.2; } },
  coin:     { name: 'A lucky coin', line: 'a risk lands more often', apply: s => { s.mods.luck += 0.15; } },
  number:   { name: 'A regular\'s number', line: '+€4 every drop', apply: s => { s.mods.tip += 4; } },
  umbrella: { name: 'An umbrella', line: 'the weather leaves the parcel alone', apply: s => { s.mods.dry = true; } },
  // (v3.24) the trade-offs, drawn into a shift's pool (days.js perksFor): each
  // gives one lever and takes another, so the draft is a choice, not a sum
  hustle:   { name: 'Hustle', line: 'fees ×1.25, every clock shorter', drawn: true, apply: s => { s.dayFee = (s.dayFee || 1) * 1.25; s.mods.deadline *= 0.85; } },
  easy:     { name: 'Take it easy', line: 'every clock a third longer, fees ×0.85', drawn: true, apply: s => { s.mods.deadline *= 1.35; s.dayFee = (s.dayFee || 1) * 0.85; } },
  bike:     { name: 'A borrowed bike', line: 'walks a third quicker, trams later', drawn: true, apply: s => { s.run.walkFactor *= 0.67; s.run.headway *= 1.15; } },
  nerve:    { name: 'Nerve', line: 'a risk lands much more often, every clock shorter', drawn: true, apply: s => { s.mods.luck += 0.25; s.mods.deadline *= 0.9; } },
  charm:    { name: 'Charm', line: '+€3 every drop, a risk lands less often', drawn: true, apply: s => { s.mods.tip += 3; s.mods.luck -= 0.05; } },
  thermos:  { name: 'A thermos', line: '+€2 every drop, every deadline a tenth longer', drawn: true, apply: s => { s.mods.tip += 2; s.mods.deadline *= 1.1; } },
};
// the pool grows with what you have finished: the first three from the start,
// one more for each mission done
export const PERK_ORDER = ['shoes', 'pass', 'map', 'coin', 'number', 'umbrella'];
// (v3.30) the long shift's stars open the trade-offs for good, two a star, the
// gentle ones first: from then on they are in the pool of every shift's draft
// (a mission's draft stays its own)
export const LONG_PERKS = [['thermos', 'charm'], ['bike', 'easy'], ['hustle', 'nerve']];
export const perkPool = (doneCount = 0, longStars = 0) => [...PERK_ORDER.slice(0, Math.min(PERK_ORDER.length, 3 + doneCount)), ...LONG_PERKS.slice(0, Math.max(0, Math.min(LONG_PERKS.length, longStars | 0))).flat()];

// the run a mission is played as: MEDIUM's city, on the mission's clock (and
// none of the run's own levers: no march, no forks of its own — v3.16)
export function missionRun(base, m, doneCount = 0) {
  return { ...base, id: `mission-${m.id}`, name: m.name, title: m.title, glyph: m.glyph, blurb: m.blurb, mission: m, target: m.steps.length,
    cards: 0, rival: false, sealed: false, race: base.race || { pace: 1.2 }, halt: null, march: null, forks: null, deadline: m.deadline || 1, skies: m.skies || ['clear', 'clear', 'snow'], perkPool: perkPool(doneCount) };
}

// ── the save ───────────────────────────────────────────────────────────────
const KEY = 'tokoMoveMissions';
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
const clean = r => (r && typeof r === 'object') ? { done: r.done === true, best: Math.max(0, Number(r.best) || 0), plays: Math.max(0, r.plays | 0) } : { done: false, best: 0, plays: 0 };
export function loadMissions(s = store()) {
  let raw = {}; try { raw = JSON.parse(s?.getItem(KEY) || '{}'); } catch { raw = {}; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  return Object.fromEntries(MISSIONS.map(m => [m.id, clean(raw[m.id])]));
}
export const doneCount = all => MISSIONS.filter(m => all[m.id]?.done).length;
// the first opens with EASY; each after it with the one before
export const missionOpen = (id, all, easyDone) => { const i = MISSIONS.findIndex(m => m.id === id); return i === 0 ? !!easyDone : i > 0 && !!all[MISSIONS[i - 1].id]?.done; };
export function recordMission(id, { done, score }, s = store()) {
  const all = loadMissions(s), before = doneCount(all), r = all[id] || clean();
  const first = done && !r.done;
  all[id] = { done: r.done || done, best: done ? Math.max(r.best, score) : r.best, plays: r.plays + 1 };
  try { s?.setItem(KEY, JSON.stringify(all)); } catch {}
  const i = MISSIONS.findIndex(m => m.id === id), next = MISSIONS[i + 1];
  return { all, first, opened: first && next ? next.id : null, perk: first && doneCount(all) > before ? PERK_ORDER[2 + doneCount(all)] || null : null };
}
