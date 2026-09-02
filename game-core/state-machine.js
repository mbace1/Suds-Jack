// Suds Game Core — tiny deterministic finite-state machine.
// No dependencies, no build step. Intended for browser games in this repo.

export class StateMachine {
  constructor({ initial, transitions, onTransition = null, strict = true }) {
    if (!initial) throw new Error('StateMachine requires an initial state');
    this.state = initial;
    this.transitions = transitions || {};
    this.onTransition = onTransition;
    this.strict = strict;
    this.frame = 0;
    this.history = [];
  }

  tick(n = 1) { this.frame += n; }

  can(next) {
    if (next === this.state) return true;
    const allowed = this.transitions[this.state];
    return allowed === '*' || (Array.isArray(allowed) && allowed.includes(next));
  }

  go(next, meta = {}) {
    const from = this.state;
    if (!this.can(next)) {
      const detail = { type: 'illegal-transition', from, to: next, frame: this.frame, meta };
      this.history.push(detail);
      if (this.strict) throw new Error(`Illegal state transition ${from} -> ${next}`);
      return false;
    }
    if (next === from) return true;
    this.state = next;
    const event = { type: 'transition', from, to: next, frame: this.frame, meta };
    this.history.push(event);
    if (this.history.length > 256) this.history.shift();
    this.onTransition?.(event);
    return true;
  }

  snapshot() {
    return { state: this.state, frame: this.frame, history: this.history.slice(-32) };
  }
}

export function assertTransitionTable(transitions, requiredStates = []) {
  const states = new Set(Object.keys(transitions));
  for (const v of Object.values(transitions)) if (Array.isArray(v)) for (const s of v) states.add(s);
  const missing = requiredStates.filter(s => !states.has(s));
  if (missing.length) throw new Error(`Transition table missing states: ${missing.join(', ')}`);
  return true;
}
