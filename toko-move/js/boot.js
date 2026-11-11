// Toko Move — which game this address is (v3.0).
//
// The bare address, and a run (`?run=medium`), is the v3 journey: card hops
// through the illustrated scenes (play.js). Every address that names one of
// the real-time game's own modes — a pinned or random shift, the daily, a city
// day, the weather, the rush, a kit, the week, LIVE, a skin or mutator — or
// says `?classic`, is the real-time game it always was (main-v212.js), so a
// tester's link and a shared daily keep working.
const p = new URLSearchParams(location.search);
// v3.6: the daily and the week are journeys too (ACT1.md §12); `&classic`
// keeps the real-time ones, and inside the real-time game its own links to
// them carry it, so a classic week stays a classic week.
const CLASSIC = ['classic', 'shift', 'day', 'weather', 'rush', 'kit', 'live', 'skin', 'mutator'].some(k => p.has(k));
if (CLASSIC) for (const id of ['dailyLink', 'weekLink']) { const a = document.getElementById(id); if (a) a.setAttribute('href', `${a.getAttribute('href')}&classic`); }
if (CLASSIC) import('./main-v212.js?v=102');
else import('./play.js?v=26');
