// Kindling — breathing, with the fire as the pace.
//
// Four rounds of 4 in / 4 hold / 6 out, and the reason it is drawn on the FIRE
// rather than on a ring of its own is that this app already has one meter and
// adding a second would teach you to watch the wrong thing. The flame rises
// while you fill, holds, and falls while you empty; the label says which.
//
// It cannot be failed and it cannot be rushed: there is no input during it at
// all except leaving, and leaving early keeps whatever rounds you finished
// (state.countBreath is called per completed round, not at the end).

const PHASES = [
  { id: 'in',   secs: 4, label: 'breathe in' },
  { id: 'hold', secs: 4, label: 'hold' },
  { id: 'out',  secs: 6, label: 'breathe out' },
  { id: 'rest', secs: 2, label: 'rest' },
];

export const ROUNDS = 4;

export function makeBreath({ onRound = () => {}, onDone = () => {} } = {}) {
  let i = 0, left = PHASES[0].secs, round = 1, done = false;

  return {
    get round() { return round; },
    get phase() { return PHASES[i].id; },
    get label() { return PHASES[i].label; },
    get left() { return Math.ceil(left); },
    get done() { return done; },

    // 0..1 — how full the lungs are, which is also how high the flame stands
    get fullness() {
      const p = PHASES[i], k = 1 - left / p.secs;
      if (p.id === 'in') return ease(k);
      if (p.id === 'hold') return 1;
      if (p.id === 'out') return 1 - ease(k);
      return 0;
    },

    update(dt) {
      if (done) return;
      left -= dt;
      while (left <= 0 && !done) {
        i += 1;
        if (i >= PHASES.length) {
          i = 0;
          onRound(round);                    // banked per round, not per session
          if (round >= ROUNDS) { done = true; onDone(); return; }
          round += 1;
        }
        left += PHASES[i].secs;
      }
    },
  };
}

// a breath is not linear — it slows at the top and the bottom
function ease(k) {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
}
