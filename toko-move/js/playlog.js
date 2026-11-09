// Toko Move v3.21 — WHAT A PERSON DID (owner, 2026-11-09: "Yes" to reading the
// cabinet's own play: where you hesitate, which third options you take, where
// you strike out, where you stop).
//
// Every balance number so far came from bots. A bot has no clock and never
// closes the tab, so this reads a real session instead, off the run's own
// machine (journey.js STATES):
//   · a card shown: its state and the moment it became answerable
//   · a pick: which button (1, 2, 3), its tier, and how long it took
//   · the end: done, late, strikes, struck out, the euros; or QUIT, with the
//     state the shift was left in
// Kept on this device only (its own key, the last 60 sessions). One summary
// line also goes to the arcade's shared log (hub/playlog.js, when the cabinet has loaded it), which nothing
// uploads either. `report()` is the readout the title's YOUR PLAY LOG card
// shows, and that its COPY button copies, so the owner can paste it back.
//
// Pure apart from the store: test/playlog.mjs holds it in bare node.

export const KEY = 'tokoMovePlays', MAX = 60;
const store = () => { try { return globalThis.localStorage; } catch { return null; } };
export function load(s = store()) { try { const v = JSON.parse(s?.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => x && typeof x === 'object' && Array.isArray(x.picks)) : []; } catch { return []; } }
export function save(sessions, s = store()) { try { s?.setItem(KEY, JSON.stringify(sessions.slice(-MAX))); } catch {} }

// A session: what was played, and nothing yet done.
export const start = ({ version, mode, run, seed, at = Date.now() }) => ({ v: version, mode, run, seed, at, picks: [], shown: null, end: null });
// A card became answerable (the screen's `card` state). Shown twice (a re-render) is one card.
export function shown(sess, { state, at = Date.now() }) { if (sess.end || (sess.shown && sess.shown.state === state && !sess.shown.done)) return; sess.shown = { state, at, done: false }; }
// A button pressed on that card: which, its tier, how long it took.
export function picked(sess, { state, i, tier = null, n = 3, at = Date.now() }) {
  if (sess.end) return;
  const s = sess.shown && !sess.shown.done ? sess.shown : null, ms = s ? Math.max(0, at - s.at) : null;
  sess.picks.push({ state: state || s?.state || '?', i, tier: tier || null, n, ms });
  if (s) s.done = true;
}
// The shift is over, or was left.
export function close(sess, { done = 0, target = 0, late = 0, strikes = 0, failed = false, score = 0, quit = false, state = null, at = Date.now() } = {}) {
  if (sess.end) return sess;
  sess.end = { done, target, late, strikes, failed, score, quit, state: quit ? state : null, secs: Math.round((at - sess.at) / 1000) };
  delete sess.shown; return sess;
}

const median = a => { const b = a.filter(x => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : null; };
// What the sessions say: the readout.
export function summarise(sessions) {
  const ended = sessions.filter(x => x.end), picks = sessions.flatMap(x => x.picks);
  const byState = {}; for (const p of picks) (byState[p.state] ||= []).push(p);
  const states = Object.fromEntries(Object.entries(byState).map(([k, ps]) => [k, { cards: ps.length, medianMs: median(ps.map(p => p.ms)), slowMs: Math.max(0, ...ps.map(p => p.ms || 0)) }]));
  const third = { offered: 0, taken: 0 }, tiers = { special: { offered: 0, taken: 0 }, very: { offered: 0, taken: 0 } };
  for (const p of picks) if (p.n >= 3) { third.offered++; if (p.i === 2) third.taken++;
    if (tiers[p.tier]) { tiers[p.tier].offered++; if (p.i === 2) tiers[p.tier].taken++; } }
  const quits = ended.filter(x => x.end.quit), where = {}; for (const q of quits) where[q.end.state || '?'] = (where[q.end.state || '?'] || 0) + 1;
  const runs = {}; for (const x of ended) { const r = (runs[x.run] ||= { played: 0, done: 0, struck: 0, quit: 0 }); r.played++; if (x.end.quit) r.quit++; else if (x.end.failed) r.struck++; else if (x.end.done >= x.end.target) r.done++; }
  const slowest = Object.entries(states).filter(([, v]) => v.medianMs != null).sort((a, b) => b[1].medianMs - a[1].medianMs)[0]?.[0] || null;
  return { sessions: sessions.length, ended: ended.length, picks: picks.length, states, slowest, third, tiers, quits: quits.length, quitAt: where, runs };
}
const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : '—';
const sec = ms => ms == null ? '—' : `${(ms / 1000).toFixed(1)} s`;
// The readout, as text to read and to paste.
export function report(sessions, version = '') {
  const s = summarise(sessions);
  if (!s.picks) return 'Toko Move play log: nothing played on this device yet.';
  const lines = [`Toko Move play log${version ? ' · v' + version : ''} · ${s.ended} shifts (${s.quits} left early) · ${s.picks} choices`];
  lines.push('Runs: ' + Object.entries(s.runs).map(([id, r]) => `${id} ${r.done}/${r.played} done${r.struck ? `, ${r.struck} struck out` : ''}${r.quit ? `, ${r.quit} left` : ''}`).join(' · '));
  lines.push('Time to choose (median · slowest): ' + Object.entries(s.states).map(([k, v]) => `${k} ${sec(v.medianMs)} · ${sec(v.slowMs)}`).join(' | '));
  if (s.slowest) lines.push(`Slowest to decide: ${s.slowest} cards.`);
  lines.push(`Third option taken: ${s.third.taken} of ${s.third.offered} (${pct(s.third.taken, s.third.offered)}) · special ${s.tiers.special.taken}/${s.tiers.special.offered} · very special ${s.tiers.very.taken}/${s.tiers.very.offered}`);
  if (s.quits) lines.push('Left early at: ' + Object.entries(s.quitAt).map(([k, n]) => `${k} ×${n}`).join(', '));
  return lines.join('\n');
}
// The one line the arcade's shared log gets.
export const line = sess => ({ run: sess.run, mode: sess.mode, v: sess.v, ...(sess.end || {}), picks: sess.picks.length, third: sess.picks.filter(p => p.i === 2).length });
