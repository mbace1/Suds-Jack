// Bots for KUOPPA: a policy is a pull power and a way of shopping. A measuring
// instrument (test/run.mjs) and a gate's driver (core.mjs), never an opponent.
import { Kuoppa, DATA as D, JOKER } from '../js/kuoppa/run.js?v=7';

// how much a bot likes a joker: ×mult first, then +mult, then chips
const taste = id => {
  const src = String(JOKER[id]?.end ?? '') + String(JOKER[id]?.hit ?? '');
  return /\*=/.test(src) ? 3 : /mult \+=/.test(src) ? 2 : 1;
};

// when the jokers are full and a better one is offered, sell the weakest
function upgrade(g) {
  if (g.jokers.length < D.JOKER_SLOTS) return;
  const offer = g.offers.findIndex(o => o?.type === 'joker' && taste(o.id) === 3);
  if (offer < 0) return;
  const weakest = [...g.jokers].sort((a, b) => taste(a.id) - taste(b.id))[0];
  if (taste(weakest.id) < 3 && g.coins + Math.floor(JOKER[weakest.id].price * D.SELL) >= g.offers[offer].price) {
    g.sell('joker', weakest.id); g.buy(offer);
  }
}

function balatro(g) {
  upgrade(g);
  for (let pass = 0; pass < 4; pass++) {
    const ranked = g.offers.map((o, i) => [o, i]).filter(([o]) => o && g.canBuy(o))
      .sort((a, b) => (b[0].type === 'joker' ? 10 + taste(b[0].id) : b[0].type === 'plate' ? 5 : 3) - (a[0].type === 'joker' ? 10 + taste(a[0].id) : a[0].type === 'plate' ? 5 : 3));
    if (!ranked.length) return;
    g.buy(ranked[0][1]);
  }
}

export const POLICIES = {
  // one pull, never a thing bought: what the machine alone is worth
  plain: { power: () => 0.35, shop: () => {} },
  // only raises levels
  plates: { power: () => 0.35, shop: g => { for (let i = 0; i < 3; i++) if (g.offers[i]?.type === 'plate') g.buy(i); } },
  // jokers first (×mult best), then plates, then charms
  balatro: { power: () => 0.35, shop: balatro },
  // the same, and shoots right while the attacker or the electric tulip is open
  right: { power: g => (g.fever > 0 || g.chance > 0 ? 0.9 : 0.35), shop: balatro },
};

export function playRun(seed, policy, { limit = 6000 } = {}) {
  const g = new Kuoppa({ seed });
  for (let step = 0; step < limit; step++) {
    if (g.phase === 'idle') { g.pull(policy.power(g)); g.finish(); }
    else if (g.phase === 'shop') { policy.shop(g); g.nextRound(); }
    else if (g.phase === 'fell' || g.phase === 'won') break;
    else g.finish();
    g.drain();
  }
  return g;
}
