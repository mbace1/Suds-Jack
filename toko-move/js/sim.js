// The run: a clock the mission sets, trains servicing stops, and whatever the
// mission decided winning and losing mean.
//
// This file used to hold the tuning. It now holds none: every number arrives
// from missions.js. That is the whole point of the refactor — a second layer,
// a festival, a ten-minute delivery contract and the endless city are the same
// code reading different data.

import { World } from './world.js?v=8';
import { Network, TRAIN_SPEED, MAX_LINES } from './lines.js?v=8';
import { RoadNet } from './roads.js?v=8';
import { byId, validate, GOALS } from './missions.js?v=8';

export class Game {
  constructor(seed = 1, missionId = 'endless', opts = {}) { this.reset(seed, missionId, opts); }

  reset(seed = 1, missionId = 'endless', opts = {}) {
    const m = validate(byId(missionId));
    this.mission = m;
    this.seed = seed;

    // The mission states a rectangle; which way up it goes is the SCREEN's
    // business. Letterboxing a landscape board into a portrait phone used 36%
    // of the display and drew stops at 7px — the same board turned on its side
    // uses about three quarters of it. Decided once, at the start of a run: a
    // board that reshaped itself when the phone rotated would move every stop
    // out from under the lines already drawn on them.
    this.portrait = !!opts.portrait;
    const board = this.portrait ? { ...m.board, w: m.board.h, h: m.board.w } : m.board;
    this.world = new World(seed, { ...m, board });

    // Which transport this mission runs on. The people are the same either way
    // — a building is a Station, a trip is a Passenger with a destination shape
    // — and only the thing that moves them differs. That is what "layers are
    // near-clones differing by variables" has to mean if it is to be true.
    this.layer = m.layer ?? 'metro';
    this.net = new Network(this.world, m.resources);
    this.roads = this.layer === 'roads' ? new RoadNet(this.world, m.resources) : null;
    this.score = 0;
    this.speed = 1;
    this.paused = true;
    this.state = 'title';          // title | play | upgrade | won | over
    this.offer = null;
    this.events = [];
    this.holdBroken = false;
    this.endReason = null;
    this.stranded = 0;        // waiting for a shape no line reaches
    this.gaveUp = 0;          // …and waited long enough to walk away
    this._sweep = 0;
    this.taught = new Set();  // one-liners already said this run
    this.nextUpgradeAt = m.clock.upgradeEvery;
    this.net.rebuild();
  }

  // ── the clock, as the mission states it ───────────────────────────────
  // whichever network this mission is played on
  get transport() { return this.roads || this.net; }

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

    if (this.roads) {
      this.roads.step(dt, () => { this.score++; this.events.push('drop'); });
    } else {
      for (const line of this.net.lines) {
        for (const train of line.trains) {
          const arrived = train.move(dt, TRAIN_SPEED);
          if (arrived >= 0) this.service(train, arrived);
        }
      }
    }

    this.watchHold();
    this.sweepStranded(dt);

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

  // Mini Metro has no answer to copy here: its passengers never give up and
  // nothing marks the ones nobody can reach — they simply pile up until the
  // backlog ends the run. PLAYTEST.md measured up to 61% of a queue in that
  // state, invisible, pushing the crowding gauge. So this is a logical option
  // rather than an inherited one, and it is meant to be revised:
  //
  //   somebody whose shape no line reaches is MARKED, and if nothing reaches
  //   them for `giveUp` seconds they walk away.
  //
  // That turns an invisible death into a visible loss. It also eases the
  // platform, which makes the game gentler — the balance measurement lives in
  // PLAYTEST.md, and if it turns out to be too gentle the answer is a shorter
  // fuse, not a return to silence.
  sweepStranded(dt) {
    this._sweep -= dt;
    if (this._sweep > 0) return;
    this._sweep = 0.25;

    const fuse = this.mission.giveUp;
    let n = 0;
    for (const st of this.world.stations) {
      for (let i = st.waiting.length - 1; i >= 0; i--) {
        const p = st.waiting[i];
        p.stranded = this.transport.hopsFrom(st.id, p.goal) === Infinity;
        if (!p.stranded) continue;
        if (fuse != null && p.waited(this.world.time) > fuse) {
          st.waiting.splice(i, 1);
          this.gaveUp++;
          this.events.push('gaveup');
        } else n++;
      }
    }
    this.stranded = n;
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
      const rider = train.load[i];
      const goal = rider.goal;
      if (st.kind === goal) {
        train.load.splice(i, 1);
        this.score++;
        exchanged++;
        this.events.push('drop');
        continue;
      }
      if (!(onward(goal) < closer(stId, goal))) {
        train.load.splice(i, 1);
        // the SAME passenger goes back on the platform: somebody who has been
        // travelling an hour has not just arrived
        st.waiting.push(rider);
        exchanged++;
      }
    }

    for (let i = 0; i < st.waiting.length && train.load.length < train.capacity;) {
      const p = st.waiting[i];
      if (onward(p.goal) < closer(stId, p.goal)) {
        st.waiting.splice(i, 1);
        train.load.push(p);
        exchanged++;
      } else i++;
    }

    train.hold(exchanged);
  }

  makeOffer() {
    // the car layer buys ROOM and cars; there are no lines to add and no
    // carriages to hang on anything
    if (this.roads) {
      // Bridges belong in here and their absence was a mission you could not
      // finish: the sweep found a board whose river wanted a fourth crossing,
      // and with three granted at the start and no way to earn a fourth, the
      // far half of the town was unservable for the whole seven hours. The
      // metro layer has bought tunnels by the week since v2; this is the same
      // rule said in the local dialect.
      const pool = ['road', 'road', 'cars'];
      // …and only when it is worth anything. Offering a bridge to a town with a
      // dry board, or to one still holding two, is a dead card in a hand of
      // two — measured as three fewer wins in sixteen, because the other card
      // was then the only card.
      if (this.roads.bridgesLeft() <= 0 && this.world.rings.length) pool.push('bridge');
      const a = this.world.rng.pick(pool);
      const b = this.world.rng.pick(pool.filter(k => k !== a));
      return [a, b];
    }
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
      case 'road': if (this.roads) this.roads.budget += 12; break;
      case 'cars': if (this.roads) this.roads.spareCars += 2; break;
      case 'bridge': if (this.roads) this.roads.bridges++; break;
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
      gaveUp: this.gaveUp,
      stranded: this.stranded,
      layer: this.layer,
      roadUsed: this.roads ? this.roads.used() : null,
      jammed: this.roads ? this.roads.jammed : null,
      goals: this.goalReadout(),
      seed: this.seed,
    };
  }
}
