// Bots for KUOPPA: a policy is a pull power and a way of shopping. A measuring
// instrument (test/run.mjs) and a gate's driver (core.mjs), never an opponent.
import { Kuoppa, DATA as D } from '../js/kuoppa/run.js?v=4';

// keep enough back that the purse still covers the debt at the rate it is
// being earned; buy the cheapest thing that leaves that much
function prudent(g) {
  const reserve = g.debt * (g.round <= 1 ? 0.35 : g.round === 2 ? 0.7 : 1);
  for (;;) {
    const i = g.offers.map((o, k) => [o, k]).filter(([o]) => o && g.coins - o.price >= reserve)
      .sort((a, b) => a[0].price - b[0].price)[0]?.[1];
    if (i == null || !g.buy(i)) return;
  }
}

export const POLICIES = {
  // one pull, never a charm: what the machine alone is worth
  steady: { power: () => 0.35, shop: () => {} },
  // buys what it can afford without going under the debt
  prudent: { power: () => 0.35, shop: prudent },
  // the same, and shoots right while FEVER is on
  fever: { power: g => (g.fever > 0 ? 0.9 : 0.35), shop: prudent },
  // buys everything it can reach
  greedy: { power: () => 0.35, shop: g => { for (let i = 0; i < 3; i++) g.buy(i); } },
};

export function playRun(seed, policy, { limit = 4000 } = {}) {
  const g = new Kuoppa({ seed });
  for (let step = 0; step < limit; step++) {
    if (g.phase === 'idle') { g.pull(policy.power(g)); g.finish(); }
    else if (g.phase === 'shop') { policy.shop(g); g.nextRound(); }
    else if (g.phase === 'due') g.payDebt();
    else if (g.phase === 'fell' || g.phase === 'won') break;
    else g.finish();
    g.drain();
  }
  return g;
}
