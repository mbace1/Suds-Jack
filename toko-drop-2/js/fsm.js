// fsm.js — a DECLARED state machine (v125). The game had its modes spread over
// strings, booleans and timers set by hand in many places (docs/STATE.md, the
// audit of 2026-11-09); a machine made here says, in one table, which states
// there are and which moves between them are meant, runs what leaving and
// entering a state must do, and keeps a short record of the moves it made.
//
//   const m = machine('flow', { initial: 'menu', moves: { menu: ['intro', 'play'], ... },
//                               exit: { play: (to, why) => … }, enter: { menu: (from, why) => … } });
//   m.go('play', 'ARCADE', clock)   // true when the move is declared
//
// A move the table does not declare still HAPPENS — the game must not stop on
// a missing line in a table — but it is recorded in `violations`, which the
// smoke fails on, so a missing line is found by a gate and never by a player.
// A move to the state already held is no move at all: nothing runs, nothing
// is recorded. Pure: no DOM, no clock (the caller passes its own `at`).
export function machine(name, { initial, moves, enter = {}, exit = {}, keep = 40 }) {
  const listeners = [];
  const m = {
    name, state: initial, since: 0, history: [], violations: [], moves,
    // is the machine in one of these states
    is: (...s) => s.includes(m.state),
    // would a move there be a declared one
    can: (to) => !!moves[m.state]?.includes(to),
    go(to, why = '', at = 0) {
      const from = m.state;
      if (to === from) return true;
      if (!(to in moves)) throw new Error(`${name}: no state "${to}"`);   // a typo is a bug in the code, not a move
      const ok = !!moves[from]?.includes(to), rec = { from, to, why, at };
      if (!ok) m.violations.push(rec);
      exit[from]?.(to, why);
      m.state = to; m.since = at;
      m.history.push(rec);
      if (m.history.length > keep) m.history.shift();
      enter[to]?.(from, why);
      for (const f of listeners) f(rec, ok);
      return ok;
    },
    // a listener on every move (the record, the smoke): (rec, declared) => …
    on(f) { listeners.push(f); return () => listeners.splice(listeners.indexOf(f), 1); },
    // what an agent or a test reads: the state, since when, the last moves, the undeclared ones
    snapshot: () => ({ name, state: m.state, since: m.since, history: m.history.slice(-10), violations: m.violations.slice() }),
  };
  return m;
}
