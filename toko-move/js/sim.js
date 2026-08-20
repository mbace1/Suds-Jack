// The run: a clock, trains servicing stops, and one way to lose.
//
// Everything here is deliberately dumb. The interesting behaviour — where the
// crowds build, which line saves the board — is not written down anywhere; it
// falls out of a spawn rate that climbs and a network that only the player
// changes. That is the whole genre and it only works if the sim resists having
// rules added to it.

import { World } from './world.js?v=2';
import { Network, TRAIN_SPEED } from './lines.js?v=2';

export const DAY = 8;                 // seconds of real time
export const WEEK = DAY * 7;
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const MAX_LINES = 7;

export class Game {
  constructor(seed = 1) { this.reset(seed); }

  reset(seed = 1) {
    this.seed = seed;
    this.world = new World(seed);
    this.net = new Network(this.world);
    this.score = 0;
    this.week = 0;
    this.speed = 1;
    this.paused = true;
    this.state = 'title';            // title | play | upgrade | over
    this.offer = null;
    this.events = [];                // things worth a sound or a line of feed
    this.net.rebuild();
  }

  get time() { return this.world.time; }
  get day() { return Math.floor(this.time / DAY) % 7; }
  get weekNo() { return Math.floor(this.time / WEEK) + 1; }

  start() { this.state = 'play'; this.paused = false; }

  step(dtReal) {
    if (this.state !== 'play' || this.paused) return;
    // a long frame is clamped rather than integrated — a backgrounded tab must
    // not return and teleport every train through three stops at once
    const dt = Math.min(0.1, dtReal) * this.speed;

    this.world.step(dt);

    for (const line of this.net.lines) {
      for (const train of line.trains) {
        const arrived = train.move(dt, TRAIN_SPEED);
        if (arrived >= 0) this.service(train, arrived);
      }
    }

    const wk = Math.floor(this.time / WEEK);
    if (wk > this.week) {
      this.week = wk;
      this.offer = this.makeOffer();
      if (this.offer) { this.state = 'upgrade'; this.paused = true; this.events.push('week'); }
    }

    if (this.world.doomed()) {
      this.state = 'over';
      this.paused = true;
      this.events.push('over');
    }
  }

  // Everyone who should get off, then everyone who should get on. The order
  // matters: a seat freed by someone reaching their shape has to be available
  // to the person standing on the platform in the same stop.
  service(train, stationIndex) {
    const line = train.line;
    const stId = line.stations[stationIndex];
    const st = this.world.station(stId);
    if (!st) return;

    const nextId = train.nextStopId();
    const closer = (from, goal) => this.net.hopsFrom(from, goal);
    const onward = goal => (nextId == null ? Infinity : closer(nextId, goal));
    let exchanged = 0;

    for (let i = train.load.length - 1; i >= 0; i--) {
      const goal = train.load[i];
      if (st.kind === goal) {
        train.load.splice(i, 1);
        this.score++;
        exchanged++;
        this.events.push('drop');
        continue;
      }
      // staying on has to make progress, or this is the transfer
      if (!(onward(goal) < closer(stId, goal))) {
        train.load.splice(i, 1);
        st.waiting.push(goal);
        exchanged++;
      }
    }

    for (let i = 0; i < st.waiting.length && train.load.length < train.capacity;) {
      const goal = st.waiting[i];
      if (onward(goal) < closer(stId, goal)) {
        st.waiting.splice(i, 1);
        train.load.push(goal);
        exchanged++;
      } else i++;
    }

    train.hold(exchanged);
  }

  // ── the weekly beat ───────────────────────────────────────────────────
  // Two cards, never more. A choice between four things is a menu; a choice
  // between two is a decision you remember making.
  makeOffer() {
    const pool = [];
    if (this.net.maxLines < MAX_LINES) pool.push('line');
    pool.push('tunnel');
    if (this.net.lines.length) { pool.push('train'); pool.push('carriage'); }
    if (pool.length < 2) return null;
    const a = this.world.rng.pick(pool);
    const rest = pool.filter(k => k !== a);
    const b = this.world.rng.pick(rest);
    return [a, b];
  }

  // `lineId` is only read by the rewards that land on a particular line.
  applyUpgrade(kind, lineId = null) {
    const line = lineId == null ? null : this.net.lineAt(lineId);
    switch (kind) {
      case 'line': this.net.maxLines++; break;
      case 'tunnel': this.net.ownedTunnels++; break;
      case 'train': if (line) { this.net.spareTrains++; this.net.addTrain(line); } break;
      case 'carriage': if (line) this.net.addCarriage(line); break;
      default: return false;
    }
    this.offer = null;
    this.state = 'play';
    this.paused = false;
    return true;
  }

  needsLine(kind) { return kind === 'train' || kind === 'carriage'; }

  report() {
    return {
      score: this.score,
      weeks: Math.floor(this.time / WEEK),
      days: Math.floor(this.time / DAY),
      stations: this.world.stations.length,
      lines: this.net.lines.length,
      seed: this.seed,
    };
  }
}
