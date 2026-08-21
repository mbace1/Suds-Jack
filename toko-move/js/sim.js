// The run: a clock the mission sets, trains servicing stops, and whatever the
// mission decided winning and losing mean.
//
// This file used to hold the tuning. It now holds none: every number arrives
// from missions.js. That is the whole point of the refactor — a second layer,
// a festival, a ten-minute delivery contract and the endless city are the same
// code reading different data.

import { World } from './world.js?v=3';
import { Network, TRAIN_SPEED, MAX_LINES } from './lines.js?v=3';
import { byId, validate, GOALS } from './missions.js?v=3';

export class Game {
  constructor(seed = 1, missionId = 'endless') { this.reset(seed, missionId); }

  reset(seed = 1, missionId = 'endless') {
    const m = validate(byId(missionId));
    this.mission = m;
    this.seed = seed;
    this.world = new World(seed, m);
    this.net = new Network(this.world, m.resources);
    this.score = 0;
    this.speed = 1;
    this.paused = true;
    this.state = 'title';          // title | play | upgrade | won | over
    this.offer = null;
    this.events = [];
    this.holdBroken = false;
    this.endReason = null;
    this.nextUpgradeAt = m.clock.upgradeEvery;
    this.net.rebuild();
  }

  // ── the clock, as the mission states it ───────────────────────────────
  get time() { return this.world.time; }
  get clock() { return this.mission.clock; }
  get unitLabel() {
    const u = this.clock.units;
    return u?.length ? u[Math.floor(this.time / this.clock.unit) % u.length] : '';
  }
  get cycleNo() { return Math.floor(this.time / (this.clock.unit * this.clock.cycle)) + 1; }
  get remaining() { return this.mission.length == null ? null : Math.max(0, this.mission.length - this.time); }
  get endless() { return this.mission.length == null && !this.mission.goals.length; }

  start() { this.state = 'play'; this.paused = false; }

  step(dtReal) {
    if (this.state !== 'play' || this.paused) return;
    const dt = Math.min(0.1, dtReal) * this.speed;

    this.world.step(dt);
    if (this.world.events.length) {
      for (const e of this.world.events) this.events.push(e.kind === 'burst' ? { say: e.text } : e);
      this.world.events.length = 0;
    }

    for (const line of this.net.lines) {
      for (const train of line.trains) {
        const arrived = train.move(dt, TRAIN_SPEED);
        if (arrived >= 0) this.service(train, arrived);
      }
    }

    this.watchHold();

    if (this.mission.clock.upgradeEvery != null && this.time >= this.nextUpgradeAt) {
      this.nextUpgradeAt += this.mission.clock.upgradeEvery;
      this.offer = this.makeOffer();
      if (this.offer) { this.state = 'upgrade'; this.paused = true; this.events.push('week'); }
    }

    // Losing is the mission's rule. `overcrowd: null` means a stop can sit
    // jammed all night and it costs you the people, not the run.
    if (this.mission.fail?.overcrowd != null && this.world.doomed()) return this.finish('overcrowd');

    if (this.goalsMet()) return this.finish('won');
    if (this.remaining === 0) return this.finish(this.goalsMet() ? 'won' : 'timeup');
  }

  // Once crossed, a held line stays crossed — otherwise "hold the line" would
  // only mean "be tidy at the final whistle", which is a much easier game.
  watchHold() {
    if (this.holdBroken) return;
    for (const goal of this.mission.goals) {
      if (goal.type !== 'hold') continue;
      const limit = goal.limit ?? 1;
      if (this.world.stations.some(s => s.over >= limit)) this.holdBroken = true;
    }
  }

  goalsMet() {
    const gs = this.mission.goals;
    return gs.length > 0 && gs.every(goal => GOALS[goal.type].done(this, goal));
  }

  goalReadout() {
    return this.mission.goals.map(goal => ({ goal, ...GOALS[goal.type].read(this, goal) }));
  }

  finish(reason) {
    this.endReason = reason;
    this.state = reason === 'won' ? 'won' : 'over';
    this.paused = true;
    this.events.push(reason === 'won' ? 'won' : 'over');
  }

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
    const unit = this.clock.unit * this.clock.cycle;
    return {
      mission: this.mission.id,
      title: this.mission.title,
      won: this.state === 'won',
      reason: this.endReason,
      score: this.score,
      cycles: Math.floor(this.time / unit),
      units: Math.floor(this.time / this.clock.unit),
      cycleWord: this.clock.cycleWord,
      time: this.time,
      stations: this.world.stations.length,
      lines: this.net.lines.length,
      goals: this.goalReadout(),
      seed: this.seed,
    };
  }
}
