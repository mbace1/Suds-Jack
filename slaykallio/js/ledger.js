// Slay Kallio — THE RUN, READ BACK.
//
// Forty-four versions in, this game could tell ME where a run died, what the
// deck looked like at each act's door and what every span cost — `bots.mjs`
// prints all of it — and it could tell the PLAYER one sentence. That asymmetry
// is the thing this module exists to close: a losing run is only worth having
// had if you can see what it was.
//
// It reads `state.log` and NOTHING else, which is the same discipline turf's
// `anim.js` follows: the log is the engine's own output, so a chronicle built
// from it cannot disagree with what actually happened. A second tally kept
// alongside the rules would drift the first time somebody added a way to lose
// HP and updated one of the two.
//
// PURE — no DOM, no three.js, no clock, no theme. It returns IDS and numbers;
// naming them is the view's job, because a name depends on which skin is on
// and this file should not have an opinion about that. That is what lets
// `core.mjs` assert exact numbers on it in bare node.

import { CARDS, ACTS } from './data.js?v=44';

// v16's lesson, and it is the one thing here that is easy to get wrong: HP
// lost over a span is the SUM OF THE DROPS, never end-minus-start. The
// post-fight breather lands inside the span that earned it, so subtracting
// would price a fight at 5.4 HP against a 6 HP heal and have somebody cut the
// heal. `amount` is what was swung; `blocked` is what the wall ate; the
// difference is what the hero actually paid.
const hpPaid = e => Math.max(0, (e.amount ?? 0) - (e.blocked ?? 0));

const KINDS = new Set(['fight', 'elite', 'boss']);

// One row per span walked, in the order they were walked, plus what the deck
// and the run added up to. Safe to call at any point in a run — a run still in
// progress simply has no `ended`.
export function chronicle(state) {
  const log = state.log ?? [];
  const spans = [];
  let cur = null;
  const gained = [], removed = [], upgraded = [];
  const closeSpan = () => { if (cur) spans.push(cur); cur = null; };

  for (const e of log) {
    switch (e.t) {
      // A fight opens a span of its own. An event or a rest is a span too, and
      // it is worth a row even though it costs nothing most of the time: a
      // route that spent four steps on rests is a different story from one
      // that spent them on elites, and the row is what makes that visible.
      case 'encounter':
        closeSpan();
        cur = { kind: e.kind, id: e.id, act: state.act, hour: e.hour ?? 0, mutated: e.mutated ?? 0, hpLost: 0, hpAfter: null, fatal: false };
        break;
      case 'event':
        closeSpan();
        cur = { kind: 'event', id: e.id, act: state.act, hpLost: 0, hpAfter: null, fatal: false };
        break;
      case 'rested':
        closeSpan();
        cur = { kind: 'rest', id: e.kind, act: state.act, hpLost: 0, hpAfter: null, fatal: false, healed: 0 };
        break;
      case 'damage':
        if (e.target === 'hero' && cur) { cur.hpLost += hpPaid(e); cur.hpAfter = e.hp; }
        break;
      case 'heal':
        if (cur) { cur.hpAfter = e.hp; if (cur.kind === 'rest') cur.healed = (cur.healed ?? 0) + (e.n ?? 0); }
        break;
      // The act a span belongs to is read off `actWon`, not off `state.act`:
      // the state is only ever the act the run ENDED in, so every row would
      // otherwise be stamped with the last one.
      case 'actWon':
        if (cur) cur.act = e.act;
        for (const s of spans) if (s.act === undefined || s.act > e.act) s.act = e.act;
        break;
      case 'gainCard': gained.push({ id: e.card, curse: !!e.curse }); break;
      case 'removeCard': removed.push(e.card); break;
      case 'upgrade': if (e.card) upgraded.push(e.card); break;
      case 'lost': if (cur) cur.fatal = true; break;
      default: break;
    }
  }
  closeSpan();

  // Stamp the act on every row. `actWon` marks the boundaries; anything after
  // the last one belongs to the act the run ended in.
  let act = 0;
  const bounds = log.filter(e => e.t === 'actWon').map(e => e.act);
  let seen = 0;
  for (const s of spans) {
    s.act = act;
    if (KINDS.has(s.kind) && ACTS[act] && s.id === ACTS[act].boss && seen < bounds.length) { act++; seen++; }
  }

  const end = (state.hero?.deck ?? []).map(c => c.id);
  const rarity = ids => ids.reduce((a, id) => { const r = CARDS[id]?.rarity ?? '?'; a[r] = (a[r] || 0) + 1; return a; }, {});
  // What the deck was before any of it happened: what is left, plus what was
  // taken out, minus what came in. Reconstructed rather than stored, so it
  // cannot be a second copy that drifts.
  const startIds = (() => {
    const bag = [...end, ...removed];
    for (const g of gained) { const i = bag.indexOf(g.id); if (i >= 0) bag.splice(i, 1); }
    return bag;
  })();

  const basics = ids => ids.filter(id => CARDS[id]?.rarity === 'basic').length;
  const fights = spans.filter(s => KINDS.has(s.kind));
  const fatal = spans.find(s => s.fatal);

  return {
    character: state.character,
    asc: state.asc ?? 0,
    acts: ACTS.length,
    won: state.phase === 'won',
    over: state.phase === 'won' || state.phase === 'lost',
    spans,
    ended: fatal ? { act: fatal.act, kind: fatal.kind, id: fatal.id } : null,
    deck: {
      start: startIds.length, end: end.length,
      gained: gained.length, removed: removed.length, upgraded: upgraded.length,
      curses: gained.filter(g => g.curse).length,
      basicsStart: basics(startIds), basicsEnd: basics(end),
      rarity: rarity(end),
    },
    jokers: (state.jokers ?? []).map(j => j.id),
    artifacts: (state.artifacts ?? []).map(a => a.id ?? a),
    totals: {
      spans: spans.length,
      fights: fights.filter(s => s.kind === 'fight').length,
      elites: fights.filter(s => s.kind === 'elite').length,
      bosses: fights.filter(s => s.kind === 'boss').length,
      events: spans.filter(s => s.kind === 'event').length,
      rests: spans.filter(s => s.kind === 'rest').length,
      hpLost: spans.reduce((a, s) => a + s.hpLost, 0),
      worst: fights.reduce((a, s) => Math.max(a, s.hpLost), 0),
      cardsPlayed: state.stats?.cardsPlayed ?? 0,
      damageDealt: state.stats?.damageDealt ?? 0,
      biggestHit: state.stats?.biggestHit ?? 0,
    },
  };
}

// The one line a run deserves before the detail: where it ended and how far it
// got. Ids, not names — the view skins it.
export function headline(c) {
  if (!c.over) return { reached: c.spans.length, act: c.spans.at(-1)?.act ?? 0 };
  return { won: c.won, act: c.ended?.act ?? c.acts - 1, at: c.ended?.id ?? null, spans: c.spans.length };
}
