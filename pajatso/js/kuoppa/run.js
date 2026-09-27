// KUOPPA — the roguelike, on the Pajatso face. Pure: no DOM, no three.js, no
// clock; seeded, with its own rng streams so a shop never depends on a bounce
// and a reel never depends on a shop.
//
// It IS the base machine (a subclass of `Pajatso`), with three differences:
//   - a pull is paid with the ROUND's coins, not the purse: the house hands
//     you DROPS each round and whatever the machine pays goes in your purse
//   - every ROUNDS rounds a debt is due out of the purse; pay it and the
//     next pachinko part is bolted onto the face, fail it and you fall
//   - between rounds a vendor sells charms that bend the machine you have
//
// Phases: idle → flight → (idle | spent) … spent → shop | due → shop → idle;
// due → fell | won.

import { Pajatso, SPEED } from '../classic/game.js?v=4';
import { buildPajatso, PAYS, JACKPOT, POTTI_COLS, MIDDLE } from '../classic/layout.js?v=4';
import { makeRng } from '../rng.js?v=4';
import { drawOutcome, buildGrid, linesShown, reachLines, STOP_ORDER, TIMING } from '../reels.js?v=4';
import * as D from './data.js?v=4';

export function computeRules(charms) {
  const r = {};
  for (const k in D.RULES) r[k] = 0;
  for (const id of charms) {
    const c = D.CHARMS.find(x => x.id === id);
    for (const [k, v] of Object.entries(c?.rules ?? {})) r[k] = D.RULES[k] === 'max' ? Math.max(r[k], v) : r[k] + v;
  }
  return r;
}

const half = n => Math.round(n * 2) / 2;

export class Kuoppa extends Pajatso {
  constructor({ seed = 1 } = {}) {
    super({ seed, coins: D.START_PURSE });
    this.reelRng = makeRng((this.seed ^ 0x9e3779b9) >>> 0);
    this.shopRng = makeRng((Math.imul(this.seed, 2654435761) ^ 0x51ed270b) >>> 0);
    this.deadline = 1;             // which padlock is next
    this.round = 1;                // round within the deadline
    this.drops = D.DROPS;          // coins left to shoot this round
    this.parts = [];
    this.charms = [];
    this.rules = computeRules([]);
    this.spins = [];               // held: spins waiting their turn
    this.spin = null;              // the one on the reels now
    this.spinGap = 0;
    this.fever = 0;                // coins left in FEVER
    this.chance = 0;               // spins left on the chain's better odds
    this.offers = [];
    this.run = { pottis: 0, spins: 0, sevens: 0, fevers: 0, earned: 0, paid: 0, charmsBought: 0 };
    this.phase = 'idle';
  }

  has(part) { return this.parts.includes(part); }
  get debt() { return D.DEBTS[this.deadline - 1] ?? 0; }
  get handful() { return D.DROPS + D.DROPS_PER_LOCK * (this.deadline - 1) + this.rules.extraDrops; }
  get busy() { return this.inFlight || !!this.spin || this.spins.length > 0; }

  // ── a pull is paid with the round's coins ───────────────────────────
  get canSpend() { return this.drops >= 1; }
  spend() { this.drops -= 1; }

  settle() {
    if (this.fever > 0 && --this.fever === 0) { this.gate(false); this.events.push({ t: 'feverEnd' }); }
    if (this.canSpend) { this.phase = 'idle'; this.events.push({ t: 'ready', coins: this.coins }); }
    else this.phase = 'spent';
  }

  credit(pay, kind, id) {
    super.credit(pay, kind, id);
    this.run.earned += pay;
  }

  // ── the windows, with the parts and charms on them ────────────────────
  window(p) {
    if (p.pay === 'start') {
      this.stats.hits.start = (this.stats.hits.start ?? 0) + 1;
      if (this.spins.length < D.HOLD) { this.spins.push({ from: 'start' }); this.events.push({ t: 'held', n: this.spins.length, x: p.x, y: p.y, cup: p.id }); }
      else this.events.push({ t: 'overflow', x: p.x, y: p.y, cup: p.id });
      return;
    }
    if (p.pay === 'attacker') {
      this.credit(D.FEVER.pays, 'fever', p.id);
      this.events.push({ t: 'attacker', pay: D.FEVER.pays, x: p.x, y: p.y });
      return;
    }
    if (p.pay === 'x3') {
      this.drops += D.TIMES3;
      this.stats.hits[p.id] = (this.stats.hits[p.id] ?? 0) + 1;
      this.events.push({ t: 'win', pay: 0, bonus: D.TIMES3, column: 0, cup: p.id, kind: 'x3', x: p.x, y: p.y });
      return;
    }
    let pay = PAYS[p.pay] ?? 0, column = 0;
    if (p.pay === 'half') pay += this.rules.halfPay;
    if (p.pay === 'R') pay += this.rules.rPay;
    if (p.pay === JACKPOT) {
      pay = this.pottiBase;
      for (const k of this.pottiCols) { column += this.pot[k]; this.pot[k] = 0; }
      this.run.pottis++;
      this.pottiBase = PAYS[JACKPOT];
      if (this.has('chain')) { this.chance = D.CHAIN.spins; this.events.push({ t: 'chance', spins: this.chance }); }
      this.openFever();
    }
    pay += column;
    this.credit(pay, p.pay, p.id);
    this.events.push({ t: 'win', pay, column, cup: p.id, kind: p.pay, x: p.x, y: p.y, tulip: !!p.tulip });
  }

  // ── time: the physics at the machine's pace, the reels at the clock's ──
  update(dt) {
    super.update(dt);
    const h = Math.min(dt, 0.1);
    if (this.spin) {
      this.spin.t += h;
      if (this.spin.t >= this.spin.len) { const s = this.spin; this.spin = null; this.resolveSpin(s); this.spinGap = 0.25; }
    } else if (this.spinGap > 0) this.spinGap -= h;
    else if (this.spins.length) this.beginSpin(this.spins.shift());
    // a round is over when its last coin is down and the reels are still
    if (this.phase === 'spent') {
      if (this.canSpend) { this.phase = 'idle'; this.events.push({ t: 'ready', coins: this.coins }); }
      else if (!this.busy) this.endRound();
    }
  }

  // run the machine until nothing is moving — for tests and bots
  finish(limit = 90) {
    let t = 0;
    while ((this.phase === 'flight' || this.spin || this.spins.length || this.phase === 'spent') && t < limit) { this.update(1 / 30); t += 1 / 30; }
    return this.phase;
  }

  weights() {
    const w = { ...D.OUTCOMES };
    w.seven = (w.seven + this.rules.wSeven) * (this.chance > 0 ? D.CHAIN.sevenX : 1);
    w.mask = D.MASK_PER_DEADLINE * (this.deadline - 1);
    return w;
  }

  beginSpin(src) {
    const outcome = drawOutcome(this.reelRng, this.weights());
    if (this.chance > 0) this.chance--;
    const { grid, line, reach } = buildGrid(this.reelRng, outcome);
    const hasReach = reachLines(grid).length > 0;
    const stops = [];
    stops[STOP_ORDER[0]] = TIMING.spin;
    stops[STOP_ORDER[1]] = TIMING.spin + TIMING.gap;
    stops[STOP_ORDER[2]] = TIMING.spin + TIMING.gap * 2 + (hasReach ? TIMING.reach : 0);
    const len = stops[STOP_ORDER[2]] + TIMING.show;
    this.spin = { outcome, grid, line, reach: hasReach ? reach : null, t: 0, stops, len, from: src.from };
    this.run.spins++;
    this.events.push({ t: 'spin', outcome, reach: hasReach, len });
  }

  // the machine pays what the PICTURE shows, never the draw
  resolveSpin(s) {
    const shown = linesShown(s.grid);
    if (!shown.length) { this.events.push({ t: 'reel', outcome: 'miss', pay: 0 }); return; }
    for (const { symbol } of shown) {
      let pay = 0;
      if (symbol === 'clover') {
        this.drops += D.CLOVER_DROPS;
        this.events.push({ t: 'reel', outcome: symbol, pay: 0, drops: D.CLOVER_DROPS });
        continue;
      }
      if (symbol === 'mask') {
        const took = half(this.coins * D.MASK_TAKES);
        this.coins -= took;
        this.events.push({ t: 'reel', outcome: symbol, pay: -took });
        continue;
      }
      pay = D.REEL_PAY[symbol] ?? 0;
      if (pay) this.credit(pay, 'reel', `reel:${symbol}`);
      if (symbol === 'seven') {
        this.run.sevens++;
        this.openFever();
        if (this.has('chain')) { this.chance = D.CHAIN.spins; this.events.push({ t: 'chance', spins: this.chance }); }
      }
      this.events.push({ t: 'reel', outcome: symbol, pay });
    }
  }

  // a jackpot — a line of sevens or the POTTI — opens the gate on the right
  openFever() {
    if (!this.has('fever')) return;
    this.fever = D.FEVER.pulls + this.rules.feverLong + 1;   // +1: the coin that won it settles first
    this.gate(true);
    this.run.fevers++;
    this.events.push({ t: 'fever', pulls: this.fever - 1 });
  }

  gate(open) { const a = this.L.byId.attacker; if (a) a.open = open; }

  // ── the run ────────────────────────────────────────────────────────────
  endRound() {
    if (this.rules.interest > 0) {
      const add = half(this.coins * this.rules.interest);
      if (add > 0) { this.coins += add; this.events.push({ t: 'interest', pay: add }); }
    }
    if (this.has('chain')) this.pottiBase += D.CHAIN.pottiPerRound;     // the progressive POTTI
    this.events.push({ t: 'roundEnd', round: this.round, deadline: this.deadline });
    this.round++;
    if (this.round > D.ROUNDS) { this.phase = 'due'; this.events.push({ t: 'due', debt: this.debt, coins: this.coins }); }
    else this.openShop();
  }

  payDebt() {
    if (this.phase !== 'due') return false;
    const debt = this.debt;
    if (this.coins < debt) { this.phase = 'fell'; this.events.push({ t: 'fell', debt, coins: this.coins }); return false; }
    this.coins -= debt;
    this.run.paid += debt;
    this.deadline++;
    this.round = 1;
    if (this.deadline > D.LOCKS) { this.phase = 'won'; this.events.push({ t: 'won' }); return true; }
    const part = D.PARTS[this.deadline - 2] ?? null;
    if (part) { this.parts.push(part); this.rebuild(); }
    this.events.push({ t: 'paid', debt, part, deadline: this.deadline });
    this.openShop();
    return true;
  }

  eligible() {
    return D.CHARMS.filter(c => !this.charms.includes(c.id) && (!c.needs || this.has(c.needs)));
  }

  openShop() {
    this.phase = 'shop';
    this.stockShop();
    this.events.push({ t: 'shop', offers: this.offers.map(o => o?.id ?? null) });
  }

  stockShop() {
    const pool = [...this.eligible()];
    this.offers = [];
    for (let i = 0; i < D.OFFERS && pool.length; i++) this.offers.push(pool.splice(this.shopRng.int(pool.length), 1)[0]);
  }

  buy(i) {
    const c = this.offers[i];
    if (this.phase !== 'shop' || !c || this.coins < c.price || this.charms.length >= D.SLOTS) return false;
    this.coins -= c.price;
    this.charms.push(c.id);
    this.offers[i] = null;
    this.run.charmsBought++;
    this.rules = computeRules(this.charms);
    this.rebuild();
    this.events.push({ t: 'bought', id: c.id, price: c.price });
    return true;
  }

  reroll() {
    if (this.phase !== 'shop' || this.coins < D.REROLL) return false;
    this.coins -= D.REROLL;
    this.stockShop();
    this.events.push({ t: 'shop', offers: this.offers.map(o => o?.id ?? null), reroll: true });
    return true;
  }

  nextRound() {
    if (this.phase !== 'shop') return false;
    this.drops = this.handful;
    this.phase = 'idle';
    this.events.push({ t: 'round', round: this.round, deadline: this.deadline, drops: this.drops });
    return true;
  }

  // the face as the parts and charms have made it
  get mods() {
    return { parts: [...this.parts], openPotti: this.rules.openPotti, winWiden: this.rules.winWiden,
      rubberPins: this.rules.rubberPins, wideTulips: this.rules.wideTulips };
  }

  rebuild() {
    const old = this.L;
    const L = buildPajatso(this.mods);
    this.board.setLayout(L);
    // a window that has only now become a tulip starts shut (setLayout carried
    // the plain window's open flag across)
    for (const p of L.pockets) if (p.kind === 'tulip' && old.byId[p.id]?.kind !== 'tulip') p.open = !!p.alwaysOpen;
    this.L = L;
    this.gate(this.fever > 0);
    this.board.magnet = this.rules.magnet;
    const n = this.rules.pottiCols || POTTI_COLS.length, h = (n - 1) / 2;
    this.pottiCols = Array.from({ length: n }, (_, i) => MIDDLE - h + i);
    this.events.push({ t: 'layout' });
  }
}

export { D as DATA, SPEED };
