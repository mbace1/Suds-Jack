// Toko Move — THE TEST CARD (v2.61; v2.62's list is the Crown Bridges). Owner: "try to hook me into testing with
// enticing updates."
//
// Every new build now arrives with a short list of things to TRY, each one a
// thing the build just changed, each with a one-tap way into it — and each
// ticks itself off when you actually do it in the game, not when you tap a
// checkbox. The title card shows the list; the feed says ✓ the moment one
// lands; the last one is telling Toko what felt wrong, which opens the
// arcade's own note panel for this cabinet (hub/feedback.js — nothing new is
// sent anywhere). A build's list is its own: a new list means new things to
// try, and ticks from an old build do not carry over.
//
// Pure where it can be: the list, the save and `tick` are testable in bare
// node (test/testcard.mjs); `mountTestCard` is the DOM half.
export const KEY = 'tokoMoveTests';

// The current build's missions. `href` is the way in — a query on this page,
// or the arcade's note panel for the last one.
export const MISSIONS = {
  build: '2.62',
  items: [
    { id: 'bridge', glyph: '⌒', title: 'Cross the Crown Bridge', text: 'Ride tram 11 or 12 — the new lines over the water, on the board since this morning’s HSL feed.', href: '?shift=3&day=none' },
    { id: 'kruunuvuori', glyph: '⌂', title: 'Deliver to Kruunuvuori', text: 'A new stop across the bridge. No walk reaches it — only the tram.', href: '?shift=3&day=none' },
    { id: 'mapboard', glyph: '◎', title: 'Tap the tram', text: 'Board the ringed tram by tapping it on the MAP.', href: '?shift=3&day=none' },
    { id: 'live', glyph: '●', title: 'LIVE', text: 'The real trams, right now — the Crown Bridge ones included.', href: '?live' },
    { id: 'tell', glyph: '✎', title: 'Tell Toko', text: 'One thing that felt wrong, or right. That is the whole test.', href: '../#tokomove/feedback' },
  ],
};
// A Crown Bridge line: 11, 11H or 12 (and any variant HSL hangs off them).
export const BRIDGE_LINE = /^1[12](?!\d)/;

const store = () => { try { return globalThis.localStorage; } catch { return null; } };
export function load(s = store(), m = MISSIONS) {
  try { const v = JSON.parse(s?.getItem(KEY) || 'null'); return v && v.build === m.build ? v : { build: m.build, done: {}, seen: false }; }
  catch { return { build: m.build, done: {}, seen: false }; }
}
export function save(state, s = store()) { try { s?.setItem(KEY, JSON.stringify(state)); } catch {} return state; }
// Returns true only the FIRST time a mission is done.
export function tick(state, id, m = MISSIONS) {
  if (!m.items.some(x => x.id === id) || state.done[id]) return false;
  state.done[id] = Date.now(); return true;
}
export const count = (state, m = MISSIONS) => m.items.filter(x => state.done[x.id]).length;
export const complete = (state, m = MISSIONS) => count(state, m) === m.items.length;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function cardHtml(state, m = MISSIONS) {
  const n = count(state, m), all = m.items.length;
  const rows = m.items.map(x => { const done = !!state.done[x.id];
    return `<a class="tcRow${done ? ' done' : ''}" href="${esc(x.href)}" data-mission="${x.id}"><span class="tcGlyph">${done ? '✓' : x.glyph}</span><span class="tcText"><b>${esc(x.title)}</b><small>${esc(x.text)}</small></span><span class="tcGo">${done ? 'DONE' : 'TRY'}</span></a>`; }).join('');
  const head = n === all ? `TESTED · ALL ${all} · THANK YOU` : `TEST v${esc(m.build)} · ${n}/${all} TRIED`;
  return `<div class="tcHead"><b>${head}</b><small>${n === all ? 'Toko reads every note.' : 'Each one ticks itself off when you actually do it.'}</small></div>${rows}`;
}

// The DOM half: the card on the title, and the ticks during play.
export function mountTestCard(tm, { el = null, poll = 500 } = {}) {
  if (tm.testcard) return tm.testcard;
  const state = load();
  const paint = () => { const box = el || document.getElementById('testCard'); if (box) { box.innerHTML = cardHtml(state); box.hidden = false; } };
  const done = id => { if (!tick(state, id)) return false; save(state); paint();
    const x = MISSIONS.items.find(i => i.id === id);
    tm.challenge?.say?.(`✓ TESTED · ${x.title.toUpperCase()} · ${count(state)}/${MISSIONS.items.length}${complete(state) ? ' · THANK YOU' : ''}`);
    return true; };
  // the note panel lives on the arcade; following the link IS the mission
  document.addEventListener('click', e => { const a = e.target?.closest?.('[data-mission="tell"]'); if (a) done('tell'); }, true);
  const timer = setInterval(() => {
    const st = tm.mobility?.status?.();
    if (st?.kind === 'riding' && st.ride?.vehicleId != null) {
      const name = tm.liveNetwork?.vehicle?.(st.ride.vehicleId)?.layer?.name;
      if (BRIDGE_LINE.test(String(name || ''))) done('bridge');
    }
    if (tm.challenge?.location === 'kruunuvuori') done('kruunuvuori');
    if (tm.live && tm.liveFeed?.state === 'live' && !tm.flow?.clock?.paused) done('live');
  }, poll);
  paint();
  tm.testcard = { state, done, paint, stop: () => clearInterval(timer) };
  return tm.testcard;
}
