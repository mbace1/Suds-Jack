// A player that never gets bored — the instrument behind the balance numbers
// and the core gate's whole-run check. It plays through the engine's public
// verbs only (setPower, hold, startShift, deposit, buy, settle, pickDeal),
// the same ones the HUD calls, so a run it can finish is a run a person can.
//
// Policies:
//   greedy  buy the cheapest charm it can afford, deposit the rest
//   saver   buy nothing, deposit everything (the control: the naked machine)
//   planner keep enough to cover what the debt still needs, spend the surplus
//           on the charm the machine would most like

import { Engine } from '../js/engine.js?v=10';
import { CHARMS } from '../js/data.js?v=10';

const FAVOURITE = ['silver_die', 'mint', 'rubber_stamp', 'life_nails', 'loaded_bed', 'lucky_seven', 'hot_hopper',
  'silver_lining', 'overtime', 'gutter_guards', 'collection_plate', 'horseshoe', 'rubber_pins', 'gold_standard',
  'bell_boy', 'gold_leaf', 'piggy_bank', 'mousetrap'];

export function playShift(e, { power = 0.22, feverPower = 0.86, maxSeconds = 240 } = {}) {
  if (e.phase !== 'idle') return false;
  e.startShift();
  let t = 0;
  while (e.phase === 'shift' && t < maxSeconds) {
    e.setPower(e.fever.left > 0 ? feverPower : power);
    e.hold(true);
    e.advance(0.25); t += 0.25;
  }
  e.hold(false);
  return e.phase !== 'shift';
}

export function shop(e, policy) {
  if (policy === 'saver') return;
  const need = Math.max(0, e.debt - e.atm - projectedInterest(e));
  const shiftsLeft = e.phase === 'due' ? 0 : 3 - e.shift + 1;
  for (let guard = 0; guard < 6; guard++) {
    if (e.charms.length >= e.slots) break;
    const offers = e.shop.items.map((it, i) => ({ ...it, i, price: e.priceOf(it.id) })).filter(o => !o.sold);
    if (!offers.length) break;
    let pick;
    if (policy === 'planner') {
      // keep what the debt needs, less what the coming shifts will likely
      // earn at the rate this run has actually been earning
      const rate = e._botRate ?? 12;
      const reserve = Math.max(0, need - shiftsLeft * rate * 0.8);
      const spendable = e.wallet - reserve;
      const ranked = offers.filter(o => o.price <= spendable)
        .sort((a, b) => rank(a.id) - rank(b.id));
      pick = ranked[0];
    } else {
      pick = offers.filter(o => o.price <= e.wallet).sort((a, b) => a.price - b.price)[0];
    }
    if (!pick) {
      // nothing it wants on the shelf and money to burn: turn the spiral
      if (policy === 'planner' && e.wallet - e.rerollCost() > Math.max(0, need) + 25 && offers.every(o => rank(o.id) > 8)) {
        if (e.reroll()) continue;
      }
      break;
    }
    if (!e.buy(pick.i)) break;
  }
}

function rank(id) { const k = FAVOURITE.indexOf(id); return k < 0 ? 99 : k; }
function projectedInterest(e) { return Math.floor(e.atm * e.rules.interest); }

export function playRun(seed, { policy = 'greedy', maxDeadlines = 8, log = null } = {}) {
  const e = new Engine({ seed });
  let guard = 0;
  while (guard++ < 200) {
    if (e.phase === 'idle') {
      shop(e, policy);
      if (policy !== 'planner' || e.shift === 3) e.deposit();
      else e.deposit(Math.max(0, e.wallet - 8));
      playShift(e);
      e._botRate = 0.6 * (e._botRate ?? 12) + 0.4 * e.tray.value;
      if (log) log(e);
    } else if (e.phase === 'due') {
      shop(e, policy);
      e.deposit();
      const r = e.settle();
      if (r === 'fell' || r === 'won') break;
    } else if (e.phase === 'phone') {
      e.pickDeal(0);
      if (e.deadline > maxDeadlines) break;
    } else break;
  }
  return e;
}

export { CHARMS };
