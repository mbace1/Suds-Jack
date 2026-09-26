// THE GAME at a Pajatso, which is almost nothing, and that is the point: a
// handful of coins, one coin in the machine at a time, and a lever. Pure — no
// DOM, no three.js, no clock — stepped by whoever owns the frame.
//
// The rules a real one has and this one keeps:
//   - one coin at a time: you cannot pull while a coin is still on the face
//   - a coin that does not make it round the top rolls back to you (a foul
//     costs nothing — the coin was never in play)
//   - a cup pays what is painted over it, the bottom keeps the coin, and the
//     middle slot at the bottom gives it back
//   - a coin the machine will not let go of is fished out and handed back,
//     the way the kiosk keeper would

import { Board, BOARD } from '../board.js?v=2';
import { makeRng } from '../rng.js?v=2';
import { buildPajatso, FACE, PAYS, JACKPOT, slotAt } from './layout.js?v=2';

export const START_COINS = 20;
// The face is stepped faster than the pachinko board: BOARD.G is slowed so a
// rain of small coins can be watched, and one big coin at that pace took six
// seconds a shot, which is a long time to hold a lever for nothing.
export const SPEED = 1.7;

export class Pajatso {
  constructor({ seed = 1, coins = START_COINS, mods = {} } = {}) {
    this.seed = seed >>> 0;
    this.rng = makeRng(this.seed);
    this.L = buildPajatso(mods);
    this.board = new Board(this.L, this.rng);
    this.coins = coins;
    this.phase = coins > 0 ? 'idle' : 'broke';
    this.acc = 0;
    this.events = [];
    this.lastPower = 0.5;
    this.stats = { shots: 0, won: 0, biggest: 0, peak: coins, pottis: 0, backs: 0, fouls: 0, lost: 0, hits: {} };
  }

  get inFlight() { return this.board.coins.length > 0; }
  get canPull() { return this.phase === 'idle' && !this.inFlight && this.coins > 0; }

  // The lever, let go at `power` 0..1. Returns whether a coin went in.
  pull(power) {
    if (!this.canPull) return false;
    const p = Math.max(0, Math.min(1, power));
    this.coins--;
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
        const pay = PAYS[p.pay] ?? 0;
        this.credit(pay, p.pay, p.id);
        this.events.push({ t: 'win', pay, cup: p.id, kind: p.pay, x: p.x, y: p.y });
        break;
      }
      case 'exit': {
        if (ev.via === 'bottom') {
          const s = slotAt(this.L, ev.coin.x);
          if (s.pay === 'back') { this.credit(PAYS.back, 'back', 'back'); this.events.push({ t: 'back', x: ev.coin.x }); }
          else { this.stats.lost++; this.events.push({ t: 'lost', x: ev.coin.x }); }
        } else if (ev.via === 'rescued') {
          // fished out and handed back: never the player's loss
          this.coins++;
          this.events.push({ t: 'returned', x: ev.coin.x, y: ev.coin.y });
        }
        break;
      }
      case 'foul':
        this.coins++;
        this.stats.fouls++;
        this.events.push({ t: 'foul' });
        break;
      case 'launch': this.events.push({ t: 'launch', power: ev.power }); break;
      case 'tick': this.events.push(ev); break;
      case 'rattle': this.events.push({ t: 'rattle', x: ev.x, y: ev.y }); break;
    }
  }

  credit(pay, kind, id) {
    this.coins += pay;
    if (kind !== 'back') { this.stats.won += pay; this.stats.biggest = Math.max(this.stats.biggest, pay); }
    else this.stats.backs++;
    if (kind === JACKPOT) this.stats.pottis++;
    this.stats.hits[id] = (this.stats.hits[id] ?? 0) + 1;
    this.stats.peak = Math.max(this.stats.peak, this.coins);
  }

  settle() {
    this.phase = this.coins > 0 ? 'idle' : 'broke';
    this.events.push({ t: this.phase === 'broke' ? 'broke' : 'ready', coins: this.coins });
  }

  // another handful from the kiosk counter
  refill(n = START_COINS) {
    if (this.inFlight) return false;
    this.coins += n;
    this.phase = 'idle';
    this.stats = { shots: 0, won: 0, biggest: 0, peak: this.coins, pottis: 0, backs: 0, fouls: 0, lost: 0, hits: {} };
    this.events.push({ t: 'refill', coins: this.coins });
    return true;
  }

  drain() { const e = this.events; this.events = []; return e; }
}
