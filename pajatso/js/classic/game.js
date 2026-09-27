// THE GAME at a Pajatso, which is almost nothing, and that is the point: a
// handful of markka, one coin in the machine at a time, and a lever. Pure — no
// DOM, no three.js, no clock — stepped by whoever owns the frame.
//
// The rules a real one has and this one keeps:
//   - one coin at a time: you cannot pull while a coin is still on the face
//   - a coin that does not make it round the top rolls back to you (a foul
//     costs nothing — the coin was never in play)
//   - a window pays what is printed under it; R gives the coin back
//   - a coin that misses every window falls into the POT, the columns of coins
//     you can see behind the glass — and the 7:00 POTTI opens the middle one
//   - a coin the machine will not let go of is fished out and handed back,
//     the way the bar keeper would
//
// Money is in markka. 1:50 pays one and a half, so a purse can hold 50 p;
// a pull takes a whole markka.

import { Board, BOARD } from '../board.js?v=3';
import { makeRng } from '../rng.js?v=3';
import { buildPajatso, FACE, PAYS, JACKPOT, POT_START, POTTI_COLS } from './layout.js?v=3';

export const START_COINS = 30;
// The face is stepped faster than the pachinko board: BOARD.G is slowed so a
// rain of small coins can be watched, and one big coin at that pace took six
// seconds a shot, which is a long time to hold a lever for nothing.
export const SPEED = 1.7;

const freshStats = coins => ({ shots: 0, won: 0, biggest: 0, peak: coins, pottis: 0, backs: 0, fouls: 0, lost: 0, hits: {} });

export class Pajatso {
  constructor({ seed = 1, coins = START_COINS, mods = {}, pot = POT_START } = {}) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.L = buildPajatso(mods);
    this.board = new Board(this.L, this.rng);
    this.coins = coins;
    this.pot = [...pot];
    this.phase = coins >= 1 ? 'idle' : 'broke';
    this.acc = 0;
    this.events = [];
    this.lastPower = 0.5;
    this.stats = freshStats(coins);
  }

  get inFlight() { return this.board.coins.length > 0; }
  get canPull() { return this.phase === 'idle' && !this.inFlight && this.coins >= 1; }
  // what the POTTI would pay right now: its 7:00 and the three middle columns
  get pottiNow() { return PAYS[JACKPOT] + POTTI_COLS.reduce((a, k) => a + this.pot[k], 0); }

  // The lever, let go at `power` 0..1. Returns whether a coin went in.
  pull(power) {
    if (!this.canPull) return false;
    const p = Math.max(0, Math.min(1, power));
    this.coins -= 1;
    this.stats.shots++;
    this.lastPower = p;
    this.board.launch(p, { scale: FACE.SCALE, vMin: FACE.V_MIN, vMax: FACE.V_MAX, lane: FACE.LANE, y: 7.2 });
    this.phase = 'flight';
    this.events.push({ t: 'insert', coins: this.coins });
    return true;
  }

  update(dt) {
    this.acc += Math.min(dt, 0.1) * SPEED;
    while (this.acc >= BOARD.DT) {
      this.acc -= BOARD.DT;
      this.board.step(BOARD.DT);
      for (const ev of this.board.drain()) this.onBoard(ev);
    }
    if (this.phase === 'flight' && !this.inFlight) this.settle();
  }

  // run the machine until the coin is done — for tests and bots
  finish(limit = 60) {
    let t = 0;
    while (this.phase === 'flight' && t < limit) { this.update(1 / 30); t += 1 / 30; }
    return this.phase;
  }

  onBoard(ev) {
    switch (ev.t) {
      case 'pocket': {
        const p = this.L.byId[ev.pocket];
        if (p.pot != null) { this.intoPot(p.pot, ev.coin?.x ?? p.x); break; }
        let pay = PAYS[p.pay] ?? 0, column = 0;
        if (p.pay === JACKPOT) for (const k of POTTI_COLS) { column += this.pot[k]; this.pot[k] = 0; }
        pay += column;
        this.credit(pay, p.pay, p.id);
        this.events.push({ t: 'win', pay, column, cup: p.id, kind: p.pay, x: p.x, y: p.y });
        break;
      }
      case 'exit': {
        if (ev.via === 'bottom') this.intoPot(null, ev.coin.x);
        else if (ev.via === 'rescued') {
          // fished out and handed back: never the player's loss
          this.coins += 1;
          this.events.push({ t: 'returned', x: ev.coin.x, y: ev.coin.y });
        }
        break;
      }
      case 'foul':
        this.coins += 1;
        this.stats.fouls++;
        this.events.push({ t: 'foul' });
        break;
      case 'launch': this.events.push({ t: 'launch', power: ev.power }); break;
      case 'tick': this.events.push(ev); break;
      case 'rattle': this.events.push({ t: 'rattle', x: ev.x, y: ev.y }); break;
    }
  }

  // a coin that missed every window joins the pile behind the glass. A full
  // column spills into the cash box, which nobody sees again.
  intoPot(k, x) {
    if (k == null) k = this.L.columns.find(c => x >= c.x0 && x < c.x1)?.k ?? (x < 0 ? 0 : this.pot.length - 1);
    const kept = this.pot[k] < FACE.COL_MAX;
    if (kept) this.pot[k]++;
    this.stats.lost++;
    this.events.push({ t: 'lost', x, column: k, kept, height: this.pot[k] });
  }

  credit(pay, kind, id) {
    this.coins += pay;
    if (kind === 'R') this.stats.backs++;
    else { this.stats.won += pay; this.stats.biggest = Math.max(this.stats.biggest, pay); }
    if (kind === JACKPOT) this.stats.pottis++;
    this.stats.hits[id] = (this.stats.hits[id] ?? 0) + 1;
    this.stats.peak = Math.max(this.stats.peak, this.coins);
  }

  settle() {
    this.phase = this.coins >= 1 ? 'idle' : 'broke';
    this.events.push({ t: this.phase === 'broke' ? 'broke' : 'ready', coins: this.coins });
  }

  // another handful from the bar counter; the pot stays what it is
  refill(n = START_COINS) {
    if (this.inFlight) return false;
    this.coins += n;
    this.phase = 'idle';
    this.stats = freshStats(this.coins);
    this.events.push({ t: 'refill', coins: this.coins });
    return true;
  }

  drain() { const e = this.events; this.events = []; return e; }
}
