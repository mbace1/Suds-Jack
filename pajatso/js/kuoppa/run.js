// KUOPPA — the roguelike, on the Pajatso face. Pure: no DOM, no three.js, no
// clock; seeded, with its own rng streams so a vendor never depends on a
// bounce and a reel never depends on a vendor.
//
// v5 is Balatro's shape on a pachinko machine. A ROUND is a hand: every coin
// that lands somewhere scores CHIPS or MULT (by the window's LEVEL, bent by
// the JOKERS), and when the round's last coin is down the round scores
// CHIPS × MULT toward the ANTE — 100, then ×10 every lock. Reach it within
// three rounds and the lock opens, the next pachinko part is bolted on, and
// the rounds you did not need are paid for; miss it and the floor opens.
// MONEY (markka) is separate and small: it buys jokers, charms and level
// plates from the vendor between rounds.
//
// It IS the base machine (a subclass of `Pajatso`): `coins` is the money,
// and a pull is paid with the ROUND's coins (`drops`), not with it.
//
// Phases: idle → flight → idle | spent → (the round scores) → shop | fell |
// won; shop → idle.

import { Pajatso } from '../classic/game.js?v=8';
import { buildPajatso, POTTI_COLS, MIDDLE, YAKU } from '../classic/layout.js?v=8';
import { makeRng } from '../rng.js?v=8';
import { drawOutcome, buildGrid, linesShown, reachLines, STOP_ORDER, TIMING } from '../reels.js?v=8';
import * as D from './data.js?v=8';

const JOKER = Object.fromEntries(D.JOKERS.map(j => [j.id, j]));
const CHARM = Object.fromEntries(D.CHARMS.map(c => [c.id, c]));

export function computeRules(ids) {
  const r = {};
  for (const k in D.RULES) r[k] = 0;
  for (const id of ids) {
    const c = CHARM[id] ?? JOKER[id];
    for (const [k, v] of Object.entries(c?.rules ?? {})) r[k] = D.RULES[k] === 'max' ? Math.max(r[k], v) : r[k] + v;
  }
  return r;
}

// which kind of hit a pocket is
function kindOf(p) {
  if (p.denchu) return 'denchu';
  if (p.pay === 'start') return 'heso';
  if (p.pay === 'attacker') return 'attacker';
  if (p.tulip) return 'tulip';
  return p.pay;                       // R, one, half, potti, x3
}
const WINDOW_KINDS = new Set(['R', 'one', 'half', 'potti', 'tulip', 'x3']);

export class Kuoppa extends Pajatso {
  constructor({ seed = 1 } = {}) {
    super({ seed, coins: D.START_MONEY, mods: {} });
    this.reelRng = makeRng((this.seed ^ 0x9e3779b9) >>> 0);
    this.shopRng = makeRng((Math.imul(this.seed, 2654435761) ^ 0x51ed270b) >>> 0);
    this.deadline = 1;             // which lock (ante) is next
    this.round = 1;                // round within the ante
    this.anteTotal = 0;            // what this ante's rounds have scored
    this.parts = [];
    this.jokers = [];              // [{ id, n }] — n is a growing joker's own counter
    this.charms = [];              // [id]
    this.levels = Object.fromEntries(D.LEVELS.map(k => [k, 1]));
    this.rules = computeRules([]);
    this.drops = this.handful;     // coins left to shoot this round
    this.spins = []; this.spin = null; this.spinGap = 0;
    this.fever = 0;                // pulls left with the attacker open
    this.chance = 0;               // spins left in RUSH (確変)
    this.pottiChips = 0;           // the progressive POTTI (the chain)
    this.offers = []; this.rerollCost = D.REROLL;
    this.bossRng = makeRng((this.seed * 7 + 0x2545f491) >>> 0);
    this.pickBoss();
    this.newTally();
    this.run = { pottis: 0, spins: 0, sevens: 0, fevers: 0, best: 0, scored: 0, bought: 0, plates: 0 };
    this.phase = 'idle';
  }

  has(part) { return this.parts.includes(part); }
  // the deadline round's twist, drawn when the ante begins
  pickBoss() {
    const pool = D.BOSSES.filter(b => !b.needs || this.has(b.needs));
    this.boss = pool[this.bossRng.int(pool.length)].id;
  }
  get deadlineRound() { return this.round === D.ROUNDS; }
  twist(id) { return this.deadlineRound && this.boss === id; }
  get tiltAtOnce() { return this.twist('tilt_sensor'); }
  get extraNudges() { return this.rules?.extraNudges ?? 0; }
  get ante() { return D.anteFor(this.deadline); }
  get handful() { return Math.max(5, D.DROPS + D.DROPS_PER_LOCK * (this.deadline - 1) + (this.rules?.extraDrops ?? 0) - (this.twist?.('short_hand') ? 10 : 0)); }
  get busy() { return this.inFlight || !!this.spin || this.spins.length > 0; }
  get canSpend() { return this.drops >= 1; }
  spend() { this.drops -= 1; }

  newTally() {
    this.tally = { chips: 0, mult: 1, round: { pottis: 0, streak: 0, windows: 0 }, run: this };
  }

  settle() {
    if (this.fever > 0 && --this.fever === 0) { this.gate(false); this.events.push({ t: 'feverEnd' }); }
    if (this.canSpend) { this.phase = 'idle'; this.events.push({ t: 'ready', coins: this.coins }); }
    else this.phase = 'spent';
  }

  // tell the growing jokers what happened
  hear(ev) {
    for (const j of this.jokers) JOKER[j.id].on?.(ev, j);
  }

  // ── scoring one hit: base + level, then every joker in order ────────────
  scoreHit(kind, where = {}) {
    const h = D.HITS[kind];
    if (!h || (kind === 'R' && this.twist('dry_r'))) return;
    const L = this.twist('flat') ? 1 : this.levels[kind === 'denchu' ? 'heso' : kind] ?? 1;
    const t = this.tally;
    if (WINDOW_KINDS.has(kind)) { t.round.streak++; t.round.windows++; }
    const times = this.jokers.some(j => JOKER[j.id].retrigger?.(t)) && WINDOW_KINDS.has(kind) ? 2 : 1;
    for (let n = 0; n < times; n++) {
      let chips = h.chips + (h.lv.chips ?? 0) * (L - 1) + (kind === 'potti' ? this.pottiChips : 0);
      if (this.twist('watered')) chips = Math.floor(chips / 2);
      const mult = h.mult + (h.lv.mult ?? 0) * (L - 1);
      t.chips += chips; t.mult += mult;
      if (h.xmult) t.mult *= h.xmult;
      const labels = [];
      for (const j of this.jokers) { const say = JOKER[j.id].hit?.(t, kind, j); if (say) labels.push({ id: j.id, say }); }
      this.events.push({ t: 'score', kind, chips, mult, xmult: h.xmult ?? 1, labels, x: where.x ?? 0, y: where.y ?? 40, again: n > 0 });
    }
  }

  // ── the pockets ────────────────────────────────────────────────────────
  window(p) {
    const kind = kindOf(p);
    this.stats.hits[p.id] = (this.stats.hits[p.id] ?? 0) + 1;
    if (kind === 'heso' || kind === 'denchu') {
      this.hear({ t: 'heso' });
      if (this.spins.length < D.HOLD) { this.spins.push({ from: p.id }); this.events.push({ t: 'held', n: this.spins.length, x: p.x, y: p.y, cup: p.id }); }
      this.scoreHit(kind, p);
      return;
    }
    if (kind === 'attacker') { this.scoreHit('attacker', p); this.events.push({ t: 'attacker', x: p.x, y: p.y }); return; }
    if (kind === 'x3') {
      const n = D.TIMES3 + ((this.levels.x3 ?? 1) - 1);
      this.drops += n;
      this.scoreHit('x3', p);
      this.events.push({ t: 'win', pay: 0, bonus: n, column: 0, cup: p.id, kind: 'x3', x: p.x, y: p.y });
      return;
    }
    let money = 0, column = 0;
    if (kind === 'R') money = 1 + this.rules.rMoney;
    if (kind === 'potti') {
      for (const k of this.pottiCols) { column += this.pot[k]; this.pot[k] = 0; }
      money = column;                     // the pot is money, the Pajatso way
      this.tally.round.pottis++;
      this.run.pottis++;
    }
    this.scoreHit(kind, p);
    if (kind === 'potti') {
      this.pottiChips = 0;
      this.openFever();
      if (this.has('chain')) this.openRush();
    }
    if (money) this.credit(money, kind, p.id);
    this.events.push({ t: 'win', pay: money, column, cup: p.id, kind, x: p.x, y: p.y, tulip: !!p.tulip });
  }

  nudge(dx, dy) {
    const ok = super.nudge(dx, dy);
    if (ok && this.board.coins.length) this.scoreHit('nudge', this.board.coins[0]);
    return ok;
  }

  // the windmills and the stage score too, once a coin
  onBoard(ev) {
    if (ev.t === 'tick' && ev.what === 'windmill') {
      const c = this.board.coins[0];
      if (c && !c.milled) { c.milled = true; this.scoreHit('mill', c); }
    }
    super.onBoard(ev);
  }

  intoPot(k, x) {
    this.tally.round.streak = 0;
    super.intoPot(k, x);
    this.hear({ t: 'lost' });
  }

  // a jackpot — a line of sevens or the POTTI — opens the attacker (大当たり)
  openFever() {
    if (!this.has('fever')) return;
    this.fever = D.FEVER.pulls + this.rules.feverLong + 1;   // +1: the coin that won it settles first
    this.gate(true);
    this.run.fevers++;
    this.events.push({ t: 'fever', pulls: this.fever - 1 });
  }
  // …and with the chain on, RUSH (確変): sevens ×3, the electric tulip open
  openRush() {
    this.chance = D.CHAIN.spins;
    this.denchu(true);
    this.events.push({ t: 'chance', spins: this.chance });
  }
  // the taped POTTI: shut for the deadline round only
  taped() { const w = this.L.byId.w4; if (w) w.open = !this.twist('taped_potti'); }
  gate(open) { const a = this.L.byId.attacker; if (a) a.open = open; }
  denchu(open) { const d = this.L.byId.denchu; if (d) d.open = open; }

  // ── time: the physics at the machine's pace, the reels at the clock's ──
  update(dt) {
    super.update(dt);
    // a coin through the warp onto the stage: inside the yakumono's frame
    const c = this.board.coins[0];
    if (c && !c.staged && this.has('chucker') && c.x > YAKU.x0 && c.x < YAKU.x1 && c.y > YAKU.y0 && c.y < YAKU.side) {
      c.staged = true;
      this.scoreHit('stage', c);
      this.events.push({ t: 'stage', x: c.x, y: c.y });
    }
    const h = Math.min(dt, 0.1);
    if (this.spin) {
      this.spin.t += h;
      if (this.spin.t >= this.spin.len) { const s = this.spin; this.spin = null; this.resolveSpin(s); this.spinGap = 0.25; }
    } else if (this.spinGap > 0) this.spinGap -= h;
    else if (this.spins.length) this.beginSpin(this.spins.shift());
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
    w.mask = D.MASK_PER_LOCK * (this.deadline - 1) * (this.twist('toko_night') ? 3 : 1) + (this.twist('toko_night') ? 3 : 0);
    return w;
  }

  beginSpin(src) {
    let outcome = drawOutcome(this.reelRng, this.weights());
    if (outcome === 'miss' && this.rules.horseshoe) outcome = drawOutcome(this.reelRng, this.weights());
    if (this.chance > 0 && --this.chance === 0) { this.denchu(false); this.events.push({ t: 'rushEnd' }); }
    const { grid, line, reach } = buildGrid(this.reelRng, outcome);
    const hasReach = reachLines(grid).length > 0;
    const stops = [];
    stops[STOP_ORDER[0]] = TIMING.spin;
    stops[STOP_ORDER[1]] = TIMING.spin + TIMING.gap;
    stops[STOP_ORDER[2]] = TIMING.spin + TIMING.gap * 2 + (hasReach ? TIMING.reach : 0);
    const len = stops[STOP_ORDER[2]] + TIMING.show;
    this.spin = { outcome, grid, line, reach: hasReach ? reach : null, t: 0, stops, len, from: src.from };
    this.run.spins++;
    if (hasReach) this.hear({ t: 'reach' });
    this.events.push({ t: 'spin', outcome, reach: hasReach, len });
  }

  // the machine pays what the PICTURE shows, never the draw
  resolveSpin(s) {
    const shown = linesShown(s.grid);
    if (!shown.length) { this.events.push({ t: 'reel', outcome: 'miss' }); return; }
    const L = this.levels.reel;
    for (const { symbol } of shown) {
      const r = D.REEL[symbol] ?? {}, t = this.tally, ev = { t: 'reel', outcome: symbol };
      if (r.chips) { ev.chips = r.chips * L; t.chips += ev.chips; }
      if (r.money) { ev.money = r.money * L; this.credit(ev.money, 'reel', `reel:${symbol}`); }
      if (r.drops) { ev.drops = r.drops + (L - 1); this.drops += ev.drops; }
      if (r.xmult) { ev.xmult = r.xmult + 0.5 * (L - 1); t.mult *= ev.xmult; }
      if (r.halveChips) { ev.halved = Math.floor(t.chips / 2); t.chips -= ev.halved; }
      this.events.push(ev);
      this.hear(ev);
      if (symbol === 'seven') {
        this.run.sevens++;
        this.openFever();
        if (this.has('chain')) this.openRush();
      }
    }
  }

  // ── the round scores ─────────────────────────────────────────────────
  endRound() {
    const t = this.tally, labels = [];
    for (const j of this.jokers) { const say = JOKER[j.id].end?.(t, j); if (say) labels.push({ id: j.id, say }); }
    const score = Math.floor(t.chips * t.mult);
    this.anteTotal += score;
    this.run.scored += score;
    this.run.best = Math.max(this.run.best, score);
    // money: the barman's cut and interest on what you kept
    const interest = Math.min(D.INTEREST.cap + this.rules.interestCap, Math.floor(this.coins / D.INTEREST.per));
    const pay = D.ROUND_PAY + interest;
    this.coins += pay;
    if (this.has('chain')) this.pottiChips += D.CHAIN.pottiPerRound;     // the progressive POTTI
    this.events.push({ t: 'scored', chips: t.chips, mult: t.mult, score, labels, total: this.anteTotal, ante: this.ante, pay, interest, round: this.round });
    this.hear({ t: 'scored' });
    this.newTally();
    this.round++;
    if (this.anteTotal >= this.ante) this.clearAnte();
    else if (this.round > D.ROUNDS) { this.phase = 'fell'; this.events.push({ t: 'fell', total: this.anteTotal, ante: this.ante }); }
    else this.openShop();
  }

  clearAnte() {
    const spare = D.ROUNDS - (this.round - 1);
    const bonus = D.CLEAR_PAY + D.EARLY_PAY * spare;
    this.coins += bonus;
    const lock = this.deadline;
    this.deadline++;
    this.round = 1; this.anteTotal = 0;
    if (this.deadline > D.LOCKS) { this.phase = 'won'; this.events.push({ t: 'won' }); return; }
    this.pickBoss();
    const part = D.PARTS[lock - 1] ?? null;
    if (part) { this.parts.push(part); this.rebuild(); }
    this.events.push({ t: 'cleared', lock, part, bonus, spare, next: this.ante });
    this.openShop();
  }

  // ── the vendor ─────────────────────────────────────────────────────────
  owned(id) { return this.jokers.some(j => j.id === id) || this.charms.includes(id); }
  eligible(type) {
    const list = type === 'joker' ? D.JOKERS : D.CHARMS;
    return list.filter(c => !this.owned(c.id) && (!c.needs || this.has(c.needs)));
  }
  levelKinds() { return D.LEVELS.filter(k => !D.LEVEL_NEEDS[k] || this.has(D.LEVEL_NEEDS[k])); }

  openShop() {
    this.phase = 'shop';
    this.rerollCost = D.REROLL;
    this.stockShop();
    this.events.push({ t: 'shop', offers: this.offers.map(o => o?.id ?? null) });
  }

  stockShop() {
    this.offers = [];
    const pools = { joker: [...this.eligible('joker')], charm: [...this.eligible('charm')] };
    for (let i = 0; i < 2; i++) {
      const type = this.shopRng.next() < 0.65 && pools.joker.length ? 'joker' : pools.charm.length ? 'charm' : 'joker';
      const pool = pools[type];
      if (!pool.length) continue;
      const c = pool.splice(this.shopRng.int(pool.length), 1)[0];
      this.offers.push({ type, id: c.id, price: c.price });
    }
    const kinds = this.levelKinds();
    const k = kinds[this.shopRng.int(kinds.length)];
    this.offers.push({ type: 'plate', id: k, price: D.PLATE_PRICE });
  }

  canBuy(o) {
    if (!o || this.phase !== 'shop' || this.coins < o.price) return false;
    if (o.type === 'joker') return this.jokers.length < D.JOKER_SLOTS;
    if (o.type === 'charm') return this.charms.length < D.CHARM_SLOTS;
    return true;
  }

  buy(i) {
    const o = this.offers[i];
    if (!this.canBuy(o)) return false;
    this.coins -= o.price;
    this.offers[i] = null;
    if (o.type === 'plate') { this.levels[o.id]++; this.run.plates++; }
    else {
      if (o.type === 'joker') this.jokers.push({ id: o.id, n: 0 });
      else this.charms.push(o.id);
      this.run.bought++;
      this.recompute();
    }
    this.events.push({ t: 'bought', type: o.type, id: o.id, price: o.price, level: o.type === 'plate' ? this.levels[o.id] : undefined });
    this.hear({ t: 'bought', type: o.type });
    return true;
  }

  sell(type, id) {
    if (this.phase !== 'shop') return false;
    const def = type === 'joker' ? JOKER[id] : CHARM[id];
    if (!def || !this.owned(id)) return false;
    if (type === 'joker') this.jokers = this.jokers.filter(j => j.id !== id);
    else this.charms = this.charms.filter(c => c !== id);
    const back = Math.max(1, Math.floor(def.price * D.SELL));
    this.coins += back;
    this.recompute();
    this.events.push({ t: 'sold', type, id, back });
    return true;
  }

  reroll() {
    if (this.phase !== 'shop' || this.coins < this.rerollCost) return false;
    this.coins -= this.rerollCost;
    this.rerollCost++;
    this.stockShop();
    this.events.push({ t: 'shop', offers: this.offers.map(o => o?.id ?? null), reroll: true });
    return true;
  }

  nextRound() {
    if (this.phase !== 'shop') return false;
    this.drops = this.handful;
    this.phase = 'idle';
    this.taped();
    this.events.push({ t: 'round', boss: this.deadlineRound ? this.boss : null, round: this.round, deadline: this.deadline, drops: this.drops });
    return true;
  }

  recompute() {
    this.rules = computeRules([...this.charms, ...this.jokers.map(j => j.id)]);
    this.rebuild();
  }

  // the face as the parts and charms have made it
  get mods() {
    return { parts: [...this.parts], openPotti: this.rules.openPotti, winWiden: this.rules.winWiden,
      rubberPins: this.rules.rubberPins, wideTulips: this.rules.wideTulips, lifeNails: this.rules.lifeNails };
  }

  rebuild() {
    const old = this.L;
    const L = buildPajatso(this.mods);
    this.board.setLayout(L);
    // a window that has only now become a tulip starts shut (setLayout carried
    // the plain window's open flag across)
    for (const p of L.pockets) if (p.kind === 'tulip' && !p.denchu && old.byId[p.id]?.kind !== 'tulip') p.open = !!p.alwaysOpen;
    this.L = L;
    this.gate(this.fever > 0);
    this.denchu(this.chance > 0);
    this.taped();
    this.board.magnet = this.rules.magnet;
    const n = this.rules.pottiCols || POTTI_COLS.length, h = (n - 1) / 2;
    this.pottiCols = Array.from({ length: n }, (_, i) => MIDDLE - h + i);
    this.events.push({ t: 'layout' });
  }
}

export { D as DATA, JOKER, CHARM };
