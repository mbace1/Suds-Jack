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

import { Board, BOARD } from '../board.js?v=7';
import { makeRng } from '../rng.js?v=7';
import { buildPajatso, FACE, PAYS, JACKPOT, POT_START, POTTI_COLS, MIDDLE } from './layout.js?v=7';

export const START_COINS = 30;
// The face is stepped faster than the pachinko board: BOARD.G is slowed so a
// rain of small coins can be watched, and one big coin at that pace took six
// seconds a shot, which is a long time to hold a lever for nothing.
export const SPEED = 1.7;
// THE BASE MACHINE (owner, 2026-09-28: "Pajatso itself should only have the
// slots with the pay out ... no need for the little nails"): no nail field, so
// a pull is the spring against the windows and nothing else. The spring's
// travel is fitted to the row (102 lands on the far left 1:00, 117 the far
// right; the soft end starts at 103 so a wobble under it seldom fouls; past that the rail carries a coin round to the kickers), and it is a
// hand on a spring, not a gun (wobble ±5 around where you let go), so a pull
// aims at a neighbourhood of windows. On a bare face the 7:00 in the middle
// catches 1 coin in ~36 whatever the guard does, so here the POTTI opens the
// MIDDLE column only — three made the soft half of the lever pay 1.7 a markka.
// Measured (face.mjs): 1.10 a markka on a fresh pot, 0.97 with the pot left to
// run, the best pull ~1.3, fouls ~2%. KUOPPA keeps its nails (`mods: {}`).
export const BASE_FACE = { nails: false, wobble: 5, vMin: 103, vMax: 118, pottiCols: [MIDDLE] };
// THE NUDGE (owner: "tapping the phone to give the coin some momentum"): a
// bump of the cabinet shoves the coin toward where you tapped. Two a coin are
// free; the third trips the TILT and the coin is the machine's.
export const NUDGE = { free: 2, dv: 10, lift: 3 };

const freshStats = coins => ({ shots: 0, won: 0, biggest: 0, peak: coins, pottis: 0, backs: 0, fouls: 0, lost: 0, hits: {} });

export class Pajatso {
  constructor({ seed = 1, coins = START_COINS, mods = BASE_FACE, pot = POT_START } = {}) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.L = buildPajatso(mods);
    this.board = new Board(this.L, this.rng);
    this.coins = coins;
    this.pot = [...pot];
    this.pottiBase = PAYS[JACKPOT];
    this.pottiCols = mods.pottiCols ?? POTTI_COLS;
    this.phase = coins >= 1 ? 'idle' : 'broke';
    this.acc = 0;
    this.events = [];
    this.lastPower = 0.5;
    this.stats = freshStats(coins);
  }

  get inFlight() { return this.board.coins.length > 0; }
  // What a pull is paid with. The base machine takes a markka out of your
  // purse; KUOPPA overrides these two to spend the round's coins instead.
  get canSpend() { return this.coins >= 1; }
  spend() { this.coins -= 1; }
  get canPull() { return this.phase === 'idle' && !this.inFlight && this.canSpend; }
  // what the POTTI would pay right now: its 7:00 and the three middle columns
  get pottiNow() { return this.pottiBase + this.pottiCols.reduce((a, k) => a + this.pot[k], 0); }

  // The lever, let go at `power` 0..1. Returns whether a coin went in.
  pull(power) {
    if (!this.canPull) return false;
    const p = Math.max(0, Math.min(1, power));
    this.spend();
    this.stats.shots++;
    this.lastPower = p;
    this.board.launch(p, { scale: FACE.SCALE, vMin: this.L.mods.vMin ?? FACE.V_MIN, vMax: this.L.mods.vMax ?? FACE.V_MAX, lane: FACE.LANE, y: 7.2, wobble: this.L.mods.wobble ?? 4.5 });
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

  // Bump the cabinet: (dx, dy) is the way to shove, any length. Only a coin
  // out on the face can be nudged — not one still climbing the lane.
  get nudgesFree() { return NUDGE.free + (this.extraNudges ?? 0); }
  nudge(dx, dy) {
    const c = this.board.coins[0];
    if (!c || this.phase !== 'flight' || this.board.inLane(c) || this.noNudge) return false;
    c.nudges = (c.nudges ?? 0) + 1;
    if (c.nudges > this.nudgesFree || this.tiltAtOnce) {
      this.board.coins.splice(0, 1);
      this.events.push({ t: 'tilt', x: c.x, y: c.y });
      this.intoPot(null, c.x);
      return true;
    }
    const d = Math.hypot(dx, dy) || 1;
    c.vx += dx / d * NUDGE.dv;
    c.vy += dy / d * NUDGE.dv * 0.6 + NUDGE.lift;
    c.still = 0;
    this.board.shake = 0.2;
    this.events.push({ t: 'nudge', x: c.x, y: c.y, n: c.nudges, left: this.nudgesFree - c.nudges });
    return true;
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
        if (p.pot != null) this.intoPot(p.pot, ev.coin?.x ?? p.x);
        else this.window(p, ev);
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
      case 'tulip': this.events.push({ t: 'tulip', cup: ev.pocket, open: ev.open }); break;
    }
  }

  // a coin in a window: its printed number, and the POTTI's columns
  window(p) {
    let pay = PAYS[p.pay] ?? 0, column = 0;
    if (p.pay === JACKPOT) {
      pay = this.pottiBase;
      for (const k of this.pottiCols) { column += this.pot[k]; this.pot[k] = 0; }
    }
    pay += column;
    this.credit(pay, p.pay, p.id);
    this.events.push({ t: 'win', pay, column, cup: p.id, kind: p.pay, x: p.x, y: p.y });
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
    this.phase = this.canSpend ? 'idle' : 'broke';
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
