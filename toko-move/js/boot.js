// Toko Move — which game this address is (v3.0).
//
// The bare address, and a run (`?run=medium`), is the v3 journey: card hops
// through the illustrated scenes (play.js). Every address that names one of
// the real-time game's own modes — a pinned or random shift, the daily, a city
// day, the weather, the rush, a kit, the week, LIVE, a skin or mutator — or
// says `?classic`, is the real-time game it always was (main-v212.js), so a
// tester's link and a shared daily keep working.
const p = new URLSearchParams(location.search);
const CLASSIC = ['classic', 'shift', 'daily', 'day', 'weather', 'rush', 'kit', 'week', 'live', 'skin', 'mutator'].some(k => p.has(k));
if (CLASSIC) import('./main-v212.js?v=81');
else import('./play.js?v=5');
