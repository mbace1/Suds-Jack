// THE RUN — the CloverPit half: the debt, the shifts, the ATM, the vendor, the
// phone, the trapdoor. And the glue that turns what the board and the pusher do
// into money. Pure: no DOM, no three.js, no clock. The view calls update(dt)
// with real time; a test calls advance(seconds) and gets the same run.
//
// A coin's life, as the engine sees it:
//   fire() → board: nails, pockets (a spin, a stamp, a tulip) → a chute →
//   the shelf → the bed → the lip → the tray → the wallet → the ATM.
// Nothing reaches the wallet except over an edge (and the side pockets, which
// pay the tray directly — the board's one honest handout).

import { Board, buildLayout, BOARD } from './board.js?v=3';
import { Pusher, PUSHER } from './pusher.js?v=3';
import { drawOutcome, buildGrid, linesShown, reachLines, LINES, STOP_ORDER, TIMING } from './reels.js?v=3';
import { makeRng } from './rng.js?v=3';
import * as D from './data.js?v=3';

export const VERSION = 3;       // the whole machine's release: the log's top entry, both modes
const TICK = BOARD.DT;                 // 240 Hz: the board's step
const PUSH_EVERY = 4;                  // the pusher runs at 60 Hz
const CHUTE_X = { L: -14, C: 0, R: 14 };
const CHUTE_DELAY = 0.42;              // bottom of the board to the shelf
const HOPPER_RATE = 12;                // payout coins a second onto the shelf
const HOLD = 4;                        // spins a machine will hold (保留)
const WIND_DOWN = 2;                   // strokes after the last coin lands
const LAYOUT_KEYS = ['lifeNails', 'chuckerWiden', 'rubberPins', 'thirdWindmill', 'rightWay', 'wideTulips'];

export function computeRules(charms, deals) {
  const r = {};
  for (const [k, spec] of Object.entries(D.RULES)) r[k] = spec.base;
  const fold = (rules) => {
    for (const [k, v] of Object.entries(rules ?? {})) {
      const spec = D.RULES[k];
      if (!spec) throw new Error(`unknown rule ${k}`);
      if (spec.mode === 'sum') r[k] += v;
      else if (spec.mode === 'mul') r[k] *= v;
      else r[k] = Math.max(r[k], v);
      if (spec.cap !== undefined) r[k] = Math.min(spec.cap, r[k]);
    }
  };
  for (const c of charms) fold(D.CHARMS.find(x => x.id === c.id)?.rules);
  for (const d of deals) fold(D.DEALS.find(x => x.id === d)?.rules);
  return r;
}

export class Engine {
  constructor({ seed = 1 } = {}) { this.newRun(seed); }

  newRun(seed = 1) {
    this.seed = (seed >>> 0) || 1;
    // Three streams, so a shop never depends on how a coin bounced: the reels
    // draw from their own, the vendor and the phone from theirs, and the
    // physics' little wobbles from a third.
    this.rngPhys = makeRng(this.seed * 3 + 1);
    this.rngReel = makeRng(this.seed * 7 + 2);
    this.rngShop = makeRng(this.seed * 11 + 3);
    this.events = [];
    this.t = 0; this.acc = 0; this.ticks = 0;
    this.phase = 'idle';
    this.deadline = 1; this.shift = 1;
    this.debt = D.debtFor(1);
    this.wallet = D.START.wallet; this.atm = 0;
    this.charms = []; this.deals = [];
    this.rules = computeRules([], []);
    this.drops = 0;
    this.power = 0.22;
    this.firing = false; this.cool = 0;
    this.fever = { left: 0, active: false, entries: 0 };
    this.spins = []; this.spin = null; this.spinGap = 0;
    this.chutes = []; this.hopper = []; this.hopperT = 0;
    this.trayFrac = 0;
    this.tray = { coins: 0, value: 0 };
    this.traps = 0;
    this.windDown = null;
    this.machineOn = false;
    this.phone = null;
    this.debtCut = 0; this.feverTip = false;
    this.stats = {
      fired: 0, fouls: 0, starts: 0, spins: 0, wins: {}, fevers: 0, bandits: 0, stolen: 0, trapped: 0,
      collected: 0, value: 0, gutter: 0, pockets: 0, tulips: 0, attacker: 0, shifts: 0, bestShift: 0,
      charmsBought: 0, spent: 0, deposited: 0, interest: 0,
    };
    this.board = new Board(buildLayout(this.layoutMods()), this.rngPhys);
    this.pusher = new Pusher(this.rngPhys);
    this.applyRules();
    // the house float: the bed as the machine was delivered, a little silver in it
    this.pusher.fill({ value: () => (this.rngPhys.next() < 0.04 ? { kind: 'silver', value: 5 } : {}) });
    this.pusher.drain();
    this.shop = { items: [], rerolls: 0 };
    this.restock();
    this.emit('run', { seed: this.seed });
  }

  emit(t, o = {}) { this.events.push({ t, ...o }); }
  drain() { const e = this.events; this.events = []; return e; }

  // ── rules ────────────────────────────────────────────────────────────
  layoutMods() {
    const m = {};
    for (const k of LAYOUT_KEYS) if (this.rules?.[k]) m[k] = this.rules[k];
    return m;
  }

  applyRules() {
    const before = JSON.stringify(this.layoutMods());
    this.rules = computeRules(this.charms, this.deals);
    const after = JSON.stringify(this.layoutMods());
    // the nails only move while the machine is off and the board is empty
    if (before !== after && !this.board.busy) this.board.setLayout(buildLayout(this.layoutMods()));
    this.board.magnet = this.rules.magnet;
    this.pusher.stroke = this.rules.stroke;
    this.pusher.period = PUSHER.PERIOD / this.rules.pace;
    this.pusher.guards = Math.min(1, this.rules.guards);
    this.pusher.tilt = this.rules.tilt;
  }

  get slots() { return this.rules.slots; }
  get busy() {
    return this.board.busy || this.chutes.length > 0 || this.hopper.length > 0 || !!this.spin || this.spins.length > 0
      || this.fever.left > 0;
  }

  // ── the shift ────────────────────────────────────────────────────────
  startShift() {
    if (this.phase !== 'idle') return false;
    this.applyRules();
    this.board.setLayout(buildLayout(this.layoutMods()));
    this.phase = 'shift';
    this.machineOn = true;
    this.drops = Math.round(this.rules.drops);
    this.tray = { coins: 0, value: 0 };
    this.windDown = null;
    this.emit('shiftStart', { deadline: this.deadline, shift: this.shift, drops: this.drops });
    if (this.rules.bedTop) this.tip(Math.round(this.rules.bedTop), 'copper');
    if (this.feverTip) { this.feverTip = false; this.startFever('tip'); }
    return true;
  }

  setPower(p) { this.power = Math.max(0, Math.min(1, p)); }
  hold(on) { this.firing = !!on; }

  // one coin up the rail, if there is one to shoot and the handle is ready
  fire() {
    if (this.phase !== 'shift' || this.cool > 0) return false;
    // one coin in the bottom of the lane at a time: the next waits for it
    if (this.board.coins.some(c => c.y < 22 && c.x < -this.board.L.Rin)) return false;
    const fever = this.fever.left > 0;
    if (!fever && this.drops <= 0) return false;
    if (fever) this.fever.left--; else this.drops--;
    this.cool = 1 / D.START.fireRate;
    this.launched = (this.launched ?? 0) + 1;
    // silver lining: every tenth coin (fifth, with two) leaves the handle silver
    const every = this.rules.silverEvery ? Math.max(1, Math.round(10 / this.rules.silverEvery)) : 0;
    const silver = every && this.launched % every === 0;
    this.board.launch(this.power, silver ? { kind: 'silver', value: 5, fever } : { kind: 'copper', value: 1, fever });
    this.stats.fired++;
    return true;
  }

  // ── time ─────────────────────────────────────────────────────────────
  update(dt) {
    this.acc += Math.min(0.25, Math.max(0, dt));
    while (this.acc >= TICK) { this.acc -= TICK; this.tick(); }
  }

  advance(seconds) { const n = Math.round(seconds / TICK); for (let i = 0; i < n; i++) this.tick(); }

  tick() {
    const h = TICK;
    this.t += h; this.ticks++;
    if (this.cool > 0) this.cool -= h;
    if (this.phase === 'shift' && this.firing) this.fire();
    if (!this.machineOn) return;

    this.board.step(h);
    for (const e of this.board.drain()) this.onBoard(e);
    // coins on their way down a chute to the shelf
    for (let i = this.chutes.length - 1; i >= 0; i--) {
      const c = this.chutes[i];
      if ((c.at -= h) > 0) continue;
      this.chutes.splice(i, 1);
      this.landOnShelf(c);
    }
    // the payout hopper drips its coins onto the back of the shelf
    if (this.hopper.length) {
      this.hopperT -= h;
      if (this.hopperT <= 0) {
        this.hopperT = 1 / HOPPER_RATE;
        const p = this.hopper.shift();
        const coin = this.pusher.drop(this.rngPhys.range(-PUSHER.HW + 2, PUSHER.HW - 2), this.rngPhys.range(1.2, 3.8),
          { ...p, fall: 0.45, vx: this.rngPhys.wobble(3), vz: this.rngPhys.range(0, 2) });
        this.emit('hopper', { coin: coin.id, kind: coin.kind });
      }
    }
    if (this.ticks % PUSH_EVERY === 0) {
      this.pusher.step(PUSHER.DT);
      for (const e of this.pusher.drain()) this.onPusher(e);
    }
    this.tickReels(h);
    if (this.fever.active && this.fever.left <= 0 && !this.board.coins.some(c => c.fever)) this.endFever();
    this.checkShiftEnd();
  }

  landOnShelf(c) {
    const heavy = this.rules.heavy ? 1.4 : 1;
    const coin = this.pusher.drop(CHUTE_X[c.chute] + this.rngPhys.wobble(2.2), this.rngPhys.range(1.4, 4.2),
      { kind: c.kind, value: c.value, scale: (D.COINS[c.kind]?.scale ?? 1) * heavy, fall: 0.3, vz: this.rngPhys.range(0, 1.5) });
    this.emit('land', { coin: coin.id, chute: c.chute, kind: c.kind });
  }

  // ── what the board says ──────────────────────────────────────────────
  onBoard(e) {
    switch (e.t) {
      case 'pocket': {
        const c = e.coin;
        this.stats.pockets++;
        if (e.kind === 'start') {
          this.stats.starts++;
          if (this.rules.stampStart) this.stamp(c, this.rules.stampStart);
          if (this.spins.length < HOLD) { this.spins.push({ source: 'start' }); this.emit('held', { n: this.spins.length }); }
          else this.emit('overflow', {});
        } else if (e.kind === 'tulip') {
          this.stats.tulips++;
          if (this.rules.stampTulip) this.stamp(c, this.rules.stampTulip);
          this.pay(this.rules.tulipPay, 'copper', 'tulip');
        } else if (e.kind === 'pocket') {
          if (this.rules.stampPocket) { c.kind = 'clover'; c.value = D.COINS.clover.value; }
          this.credit(D.POCKETS.pocket.tray, 'pocket');
        } else if (e.kind === 'attacker') {
          this.stats.attacker++; this.fever.entries++;
          this.pay(D.FEVER.perEntry, D.FEVER.kind, 'attacker');
        }
        this.emit('pocket', { pocket: e.pocket, kind: e.kind, coin: c.id, stamped: c.kind });
        break;
      }
      case 'exit':
        this.chutes.push({ at: CHUTE_DELAY, chute: e.coin ? e.chute : 'C', kind: e.coin.kind, value: e.coin.value, id: e.coin.id });
        this.emit('chute', { chute: e.chute, coin: e.coin.id, via: e.via });
        break;
      case 'foul':
        // a shot that falls back down the lane comes back to the handle
        if (e.coin.fever) this.fever.left++; else this.drops++;
        this.stats.fouls++;
        this.emit('foul', {});
        break;
      default:
        this.emit(e.t, e);
    }
  }

  stamp(coin, grades) {
    grades += this.rules.stampExtra;
    for (let i = 0; i < grades; i++) {
      const next = D.COINS[coin.kind]?.next ?? coin.kind;
      if (next === coin.kind) break;
      coin.kind = next; coin.value = D.COINS[next].value;
    }
    this.emit('stamp', { coin: coin.id, kind: coin.kind });
  }

  // coins onto the back of the shelf, through the hopper
  pay(n, kind, why) {
    // the mint strikes the hopper's coins up before they fall
    const grades = this.rules.mint ? this.rules.mint + this.rules.stampExtra : 0;
    for (let k = 0; k < grades && D.COINS[kind].next !== kind; k++) kind = D.COINS[kind].next;
    for (let i = 0; i < n; i++) this.hopper.push({ kind, value: this.valueOf(kind), scale: D.COINS[kind].scale });
    if (n > 0) this.emit('payout', { n, kind, why });
  }

  valueOf(kind) { return kind === 'gold' ? this.rules.goldValue : D.COINS[kind].value; }

  // the house tipping coins onto the shelf: not a payout, so no mint
  tip(n, kind) {
    for (let i = 0; i < n; i++) this.hopper.push({ kind, value: this.valueOf(kind), scale: D.COINS[kind].scale });
    this.emit('tip', { n, kind });
  }

  // straight into the wallet — only the side pockets and interest do this
  credit(n, why) {
    this.wallet += n;
    this.tray.value += n;
    this.emit('credit', { n, why });
  }

  // ── what the pusher says ─────────────────────────────────────────────
  onPusher(e) {
    const c = e.coin;
    switch (e.t) {
      case 'collect': {
        let v;
        if (c.kind === 'trash') v = this.rules.trashValue;
        else if (c.kind === 'prize') v = 0;
        else v = c.kind === 'gold' ? this.rules.goldValue : c.value;
        this.trayFrac += v * this.rules.trayMul;
        const whole = Math.floor(this.trayFrac + 1e-9);
        this.trayFrac -= whole;
        this.wallet += whole;
        this.tray.coins++; this.tray.value += whole;
        this.stats.collected++; this.stats.value += whole;
        this.emit('collect', { coin: c.id, kind: c.kind, value: whole, x: c.x });
        if (c.kind === 'clover') { this.spins.push({ source: 'clover' }); this.emit('held', { n: this.spins.length }); }
        if (c.kind === 'prize') this.openPrize();
        break;
      }
      case 'gutter':
        this.stats.gutter++;
        this.emit('gutter', { coin: c.id, kind: c.kind, side: e.side });
        break;
      case 'stroke':
        if (this.windDown !== null) this.windDown--;
        this.emit('stroke', {});
        break;
      default:
        this.emit(e.t, { coin: c?.id, kind: c?.kind });
    }
  }

  openPrize() {
    const owned = new Set(this.charms.map(c => c.id));
    const pool = D.CHARMS.filter(c => !owned.has(c.id));
    if (this.charms.length < this.slots && pool.length) {
      const ch = pool[this.rngShop.int(pool.length)];
      this.charms.push({ id: ch.id, paid: 0 });
      this.applyRules();
      this.emit('prize', { charm: ch.id });
    } else {
      const n = 10 + 5 * this.deadline;
      this.wallet += n;
      this.emit('prize', { coins: n });
    }
  }

  // ── the reels ────────────────────────────────────────────────────────
  weights() {
    const w = { ...D.OUTCOMES }, r = this.rules;
    w.seven *= r.wSeven; w.cherry *= r.wCherry; w.bell *= r.wBell; w.coin *= r.wCoin; w.clover *= r.wClover;
    w.mask = (w.mask + D.MASK_PER_DEADLINE * (this.deadline - 1) + r.maskAdd) * r.wMask;
    return w;
  }

  tickReels(h) {
    if (this.spin) {
      const s = this.spin;
      s.t += h;
      for (let k = 0; k < 3; k++) {
        if (!s.stopped[k] && s.t >= s.stops[k]) {
          s.stopped[k] = true;
          this.emit('reelStop', { reel: k });
          // the second reel to stop is the right one: that is the REACH moment
          if (k === STOP_ORDER[1] && s.reach) this.emit('reach', { line: s.reachLine, symbol: s.grid[0][LINES[s.reachLine][0][1]] });
        }
      }
      if (s.t >= s.len) { this.spin = null; this.resolveSpin(s); this.spinGap = 0.25; }
      return;
    }
    if (this.spinGap > 0) { this.spinGap -= h; return; }
    if (this.spins.length) this.beginSpin(this.spins.shift());
  }

  beginSpin(src) {
    const w = this.weights();
    let outcome = drawOutcome(this.rngReel, w);
    // the horseshoe: a losing draw is drawn again
    for (let i = 0; i < this.rules.luck && outcome === 'miss'; i++) outcome = drawOutcome(this.rngReel, w);
    const { grid, line } = buildGrid(this.rngReel, outcome);
    const reaches = reachLines(grid);
    const reach = reaches.length > 0;
    const reachLine = line && reaches.includes(line) ? line : reaches[0] ?? null;
    const stops = [0, 0, 0];
    stops[STOP_ORDER[0]] = TIMING.spin;
    stops[STOP_ORDER[1]] = TIMING.spin + TIMING.gap;
    stops[STOP_ORDER[2]] = TIMING.spin + TIMING.gap * 2 + (reach ? TIMING.reach : 0);
    this.spin = { outcome, grid, line, reach, reachLine, t: 0, stops, stopped: [false, false, false],
      len: stops[STOP_ORDER[2]] + TIMING.show, source: src.source };
    this.stats.spins++;
    this.emit('spin', { outcome, grid, reach, line, source: src.source, len: this.spin.len, stops });
  }

  resolveSpin(s) {
    // pay what the picture SHOWS; the draw and the picture agree by
    // construction, and test/core.mjs holds the builder to that
    const shown = linesShown(s.grid);
    if (!shown.length) { this.emit('spinEnd', { outcome: 'miss' }); return; }
    for (const { symbol } of shown) {
      this.stats.wins[symbol] = (this.stats.wins[symbol] ?? 0) + 1;
      if (symbol === 'seven') this.startFever('reels');
      else if (symbol === 'mask') this.bandit();
      else {
        const pay = D.PAYS[symbol];
        const n = Math.round((symbol === 'bell' ? this.rules.bellPay : pay.n) * this.rules.payMul);
        this.pay(n, pay.kind, symbol);
        if (pay.spin) { this.spins.push({ source: 'clover' }); this.emit('held', { n: this.spins.length }); }
      }
    }
    this.emit('spinEnd', { outcome: shown[0].symbol, lines: shown.map(x => x.line) });
  }

  startFever(why) {
    this.fever.left += Math.round(this.rules.feverDrops);
    this.fever.active = true;
    this.board.setAttacker(true);
    this.stats.fevers++;
    this.emit('fever', { why, drops: this.fever.left });
  }

  endFever() {
    this.fever.active = false;
    this.board.setAttacker(false);
    this.emit('feverEnd', { entries: this.fever.entries });
    this.fever.entries = 0;
  }

  // the paw comes down out of the ceiling for a quarter of what you carry
  bandit() {
    this.stats.bandits++;
    if (this.traps > 0) { this.traps--; this.stats.trapped++; this.emit('bandit', { trapped: true, took: 0 }); return; }
    const took = this.wallet > 0 ? Math.max(1, Math.floor(this.wallet * D.START.bandit)) : 0;
    this.wallet -= took;
    this.stats.stolen += took;
    // and it leaves its junk on the shelf on the way out
    for (let i = 0; i < 2; i++) this.hopper.push({ kind: 'trash', value: 0, scale: D.COINS.trash.scale });
    this.emit('bandit', { trapped: false, took });
  }

  // ── the end of a shift ───────────────────────────────────────────────
  checkShiftEnd() {
    if (this.phase !== 'shift') return;
    if (this.drops > 0 || this.busy) { this.windDown = null; return; }
    if (this.windDown === null) { this.windDown = WIND_DOWN; this.emit('windDown', {}); }
    if (this.windDown <= 0) this.endShift();
  }

  endShift() {
    this.machineOn = false;
    this.firing = false;
    const interest = Math.floor(this.atm * this.rules.interest);
    this.atm += interest;
    this.stats.interest += interest;
    this.stats.shifts++;
    this.stats.bestShift = Math.max(this.stats.bestShift, this.tray.value);
    this.emit('shiftEnd', { tray: { ...this.tray }, interest, deadline: this.deadline, shift: this.shift });
    if (this.shift >= D.SHIFTS_PER_DEADLINE) { this.phase = 'due'; this.emit('due', { debt: this.debt, atm: this.atm }); }
    else { this.shift++; this.phase = 'idle'; }
    this.restock();
  }

  // ── the ATM ──────────────────────────────────────────────────────────
  deposit(n = Infinity) {
    if (this.phase === 'shift' || this.phase === 'fell' || this.phase === 'won') return 0;
    const amt = Math.max(0, Math.min(this.wallet, Math.floor(n)));
    if (!amt) return 0;
    this.wallet -= amt; this.atm += amt;
    this.stats.deposited += amt;
    this.emit('deposit', { n: amt, atm: this.atm });
    return amt;
  }

  // The deadline. What is short comes out of your pockets first — nobody falls
  // through the floor holding the money — and then the floor decides.
  settle() {
    if (this.phase !== 'due') return null;
    const short = this.debt - this.atm;
    if (short > 0) this.deposit(short);
    if (this.atm < this.debt) {
      this.phase = 'fell';
      this.emit('fell', { deadline: this.deadline, short: this.debt - this.atm });
      return 'fell';
    }
    this.atm -= this.debt;
    this.emit('paid', { deadline: this.deadline, debt: this.debt, left: this.atm });
    if (this.deadline >= D.LOCKS && !this.endless) {
      this.phase = 'won';
      this.emit('won', { deadline: this.deadline });
      return 'won';
    }
    this.ring();
    return 'paid';
  }

  // go back down: the door is open, and the shaft goes on
  continueEndless() {
    if (this.phase !== 'won') return;
    this.endless = true;
    this.ring();
  }

  ring() {
    const pool = [...D.DEALS];
    this.rngShop.shuffle(pool);
    const offer = pool.slice(0, 3).map(d => d.id);
    this.phase = 'phone';
    this.phone = { deals: offer, line: D.CALLS[Math.min(D.CALLS.length - 1, this.deadline - 1)] };
    this.emit('ring', { deals: offer });
  }

  pickDeal(i) {
    if (this.phase !== 'phone') return false;
    const id = this.phone.deals[i];
    const deal = D.DEALS.find(d => d.id === id);
    if (!deal) return false;
    if (deal.rules) this.deals.push(id);
    const nextDebt = D.debtFor(this.deadline + 1);
    const now = deal.now ?? {};
    let cut = 0;
    if (now.debtCut) cut = now.debtCut;
    if (now.drop) for (let k = 0; k < now.drop.n; k++) this.hopper.push({ kind: now.drop.kind, value: D.COINS[now.drop.kind].value, scale: D.COINS[now.drop.kind].scale });
    if (now.upgrade) {
      const copper = this.pusher.coins.filter(c => c.kind === 'copper');
      this.rngShop.shuffle(copper);
      for (const c of copper.slice(0, now.upgrade)) { c.kind = 'silver'; c.value = 5; }
    }
    if (now.cash) this.wallet += Math.round(nextDebt * now.cash);
    if (now.pawn && this.charms.length) {
      let dear = 0;
      this.charms.forEach((c, k) => { if (this.priceOf(c.id, true) > this.priceOf(this.charms[dear].id, true)) dear = k; });
      this.emit('pawned', { charm: this.charms[dear].id });
      this.charms.splice(dear, 1);
    }
    if (now.fever) this.feverTip = true;
    this.emit('deal', { id });
    this.phone = null;
    this.deadline++;
    this.shift = 1;
    this.debt = Math.round(nextDebt * (1 - cut));
    this.traps = 0;
    this.applyRules();
    this.traps = Math.round(this.rules.mousetrap);
    this.phase = 'idle';
    // the hopper's gifts land when the machine next runs
    this.restock();
    this.emit('deadline', { deadline: this.deadline, debt: this.debt });
    return true;
  }

  // ── the vendor ───────────────────────────────────────────────────────
  priceScale() { return 1 + 0.5 * (this.deadline - 1); }
  priceOf(id, base = false) {
    const ch = D.CHARMS.find(c => c.id === id);
    if (!ch) return 0;
    return base ? ch.price : Math.max(1, Math.ceil(ch.price * this.priceScale() * this.rules.discount));
  }
  rerollCost() { return Math.ceil((2 + 2 * this.shop.rerolls) * (1 + 0.3 * (this.deadline - 1))); }

  restock() {
    const owned = new Set(this.charms.map(c => c.id));
    const pool = D.CHARMS.filter(c => !owned.has(c.id));
    const weight = c => c.rarity === 1 ? 6 : c.rarity === 2 ? 3 : 1;
    const items = [];
    for (let k = 0; k < 3 && pool.length; k++) {
      let x = this.rngShop.next() * pool.reduce((s, c) => s + weight(c), 0);
      let pick = pool[0];
      for (const c of pool) { x -= weight(c); if (x < 0) { pick = c; break; } }
      items.push({ id: pick.id, sold: false });
      pool.splice(pool.indexOf(pick), 1);
    }
    this.shop = { items, rerolls: 0 };
    this.emit('restock', { items: items.map(i => i.id) });
  }

  canShop() { return this.phase === 'idle' || this.phase === 'due'; }

  buy(i) {
    if (!this.canShop()) return false;
    const it = this.shop.items[i];
    if (!it || it.sold) return false;
    const price = this.priceOf(it.id);
    if (this.wallet < price || this.charms.length >= this.slots) return false;
    this.wallet -= price;
    it.sold = true;
    this.charms.push({ id: it.id, paid: price });
    this.stats.charmsBought++; this.stats.spent += price;
    if (it.id === 'mousetrap') this.traps += 1;
    const ch = D.CHARMS.find(c => c.id === it.id);
    if (ch?.onBuy?.drop) this.tip(ch.onBuy.drop, 'copper');
    this.applyRules();
    this.emit('buy', { id: it.id, price });
    return true;
  }

  sell(i) {
    if (!this.canShop()) return false;
    const c = this.charms[i];
    if (!c) return false;
    const back = Math.floor(c.paid / 2);
    this.wallet += back;
    this.charms.splice(i, 1);
    this.applyRules();
    this.emit('sell', { id: c.id, back });
    return true;
  }

  reroll() {
    if (!this.canShop()) return false;
    const cost = this.rerollCost();
    if (this.wallet < cost) return false;
    this.wallet -= cost;
    const n = this.shop.rerolls + 1;
    this.restock();
    this.shop.rerolls = n;
    this.stats.spent += cost;
    this.emit('reroll', { cost });
    return true;
  }
}
