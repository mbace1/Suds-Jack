// The run: a clock the mission sets, trains servicing stops, and whatever the
// mission decided winning and losing mean.
//
// This file used to hold the tuning. It now holds none: every number arrives
// from missions.js. That is the whole point of the refactor — a second layer,
// a festival, a ten-minute delivery contract and the endless city are the same
// code reading different data.

import { World } from './world.js?v=13';
import { Network, TRAIN_SPEED, MAX_LINES } from './lines.js?v=13';
import { RoadNet } from './roads.js?v=13';
import { BusNet } from './bus.js?v=13';
import { asBoard } from './city.js?v=13';
import { byId, validate, GOALS } from './missions.js?v=13';

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

    // A REAL CITY, when the mission names one and the pack was handed in. The
    // pack is a file — the game never fetches the world it is set in, because
    // the arcade's offline promise would be a lie if it did — so whoever
    // launches the mission loads it and passes it here.
    //
    // A mission may name a city it cannot get: the file is missing, or a
    // chapter is not built yet. That is not a crash. `city` stays null, the
    // board is rolled the ordinary way, and `cityMissing` says so out loud so
    // the screen can admit it rather than quietly playing somewhere else.
    this.cityMissing = null;
    let city = null;
    if (m.city) {
      if (opts.pack) {
        try { city = asBoard(opts.pack, board, m.cityFit ?? {}); }
        catch (e) { this.cityMissing = e.message; }
      } else {
        this.cityMissing = `no pack for "${m.city}"`;
      }
    }
    this.city = city;
    this.world = new World(seed, { ...m, board, city });

    // Which transports this mission runs. A mission may name ONE (`layer`) or
    // SEVERAL (`layers`), and when it names several they all run at once —
    // trains calling while cars drive, both feeding the same platforms. That is
    // the owner's call: a parcel changing layers is only interesting if the
    // city you are neglecting is still running while you deal with it.
    //
    // `layer` is now the FOCUS — the one your finger is drawing on — and not
    // the one that exists. Everything that used to read it for "which
    // transport" reads `transports` instead.
    this.layers = m.layers ?? [m.layer ?? 'metro'];
    this.layer = this.layers[0];
    this.net = new Network(this.world, m.resources);
    // The bus layer RUNS ON the road grid, so naming it brings the grid with
    // it. Whether CARS also run on that grid is a separate question — a bus
    // mission that did not name `roads` would have streets nobody drives on,
    // which is a diagram, not a city.
    const wantsGrid = this.layers.includes('roads') || this.layers.includes('bus');
    this.roads = wantsGrid ? new RoadNet(this.world, m.resources) : null;
    this.bus = this.layers.includes('bus') ? new BusNet(this.world, this.roads, m.resources) : null;
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
    this.parcel = null;       // the one load being followed, once it turns up
    this.delivered = new Set();
    this.nextUpgradeAt = m.clock.upgradeEvery;
    this.net.rebuild();
  }

  // ── the clock, as the mission states it ───────────────────────────────
  // Every transport this mission is running, by name.
  get transports() {
    const out = {};
    if (this.layers.includes('metro')) out.metro = this.net;
    if (this.layers.includes('roads') && this.roads) out.roads = this.roads;
    if (this.bus) out.bus = this.bus;
    return out;
  }

  // The one your finger is on. Kept as `transport` because a single-layer
  // mission has exactly one and half this file was written before there were
  // two.
  get transport() { return this.transports[this.layer] ?? this.net; }

  focus(layer) {
    if (!this.layers.includes(layer)) return false;
    this.layer = layer;
    return true;
  }

  // Which transport may carry this passenger, and whether ANY of them reaches
  // where they are going. A parcel names its layer per leg; everybody else is
  // happy on whatever turns up, so "unreachable" has to mean unreachable on all
  // of them or a two-layer board would mark half the city as stranded.
  reaches(stationId, p) {
    const want = p.layer;
    for (const [name, t] of Object.entries(this.transports)) {
      if (want && want !== name) continue;
      if (t.hopsFrom(stationId, p.goal) !== Infinity) return true;
    }
    return false;
  }

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

    // Both, when the mission runs both. A layer you are not looking at keeps
    // working — that is the whole point of running them together.
    // The grid may exist for the buses alone, in which case nobody drives on
    // it: `transports` is what says which layers are RUNNING, and the car
    // layer only ticks when it is one of them.
    if (this.transports.roads) this.roads.step(dt, car => this.arrived(car.p, car.to));
    if (this.bus) this.bus.step(dt, (bus, i) => this.service(bus, i));
    if (this.layers.includes('metro')) {
      for (const line of this.net.lines) {
        for (const train of line.trains) {
          const arrived = train.move(dt, TRAIN_SPEED);
          if (arrived >= 0) this.service(train, arrived);
        }
      }
    }

    this.watchHold();
    this.sweepStranded(dt);
    this.sweepParcel();

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

  // ── the load ──────────────────────────────────────────────────────────
  // One parcel, put on the board once there is a board to put it on, with a leg
  // per layer. It is deliberately NOT a special object: it is a Passenger with
  // legs, standing in the ordinary queue at an ordinary stop, competing for the
  // same trains as everybody else. That is the owner's call — the city carries
  // on around it — and it is also what makes the mission hard, because the
  // fastest way to move one load is a network that serves everybody.
  sweepParcel() {
    const spec = this.mission.parcel;
    if (!spec || this.parcel || this.time < (spec.at ?? 0)) return;

    // Three shapes is the floor, whatever the leg count. The first cut asked
    // for a distinct shape PER LEG, so a three-leg load needed four shapes and
    // simply never appeared on most boards — a mission whose premise silently
    // never starts, which is worse than one that is too hard. Consecutive goals
    // have to differ; leg three may go back to where leg one began.
    const want = spec.legs ?? 2;
    const shapes = this.world.shapesPresent();
    if (shapes.length < 3 || !this.roads) return;

    const pick = this.world.rng.pick(this.world.stations.filter(s => s.kind === shapes[0]));
    if (!pick) return;

    // Alternating, starting on the metro: metro → road → metro. The layers are
    // named per leg rather than inferred, because "which of these can carry it"
    // is the decision the mission is about — and alternating means the load
    // changes hands `want - 1` times rather than once, which is the part worth
    // more than one board's practice.
    const order = ['metro', 'roads'];
    const legs = [];
    let prev = shapes[0];
    for (let i = 0; i < want; i++) {
      // walk the shapes in a ring, skipping whatever we are standing on
      const next = shapes[(shapes.indexOf(prev) + 1) % shapes.length];
      legs.push({ layer: order[i % 2], goal: next });
      prev = next;
    }

    this.parcel = pick.join(shapes[0], this.time, {
      parcel: true,
      label: spec.label ?? 'the load',
      legs,
    });
    const how = legs.map(l => `${l.layer === 'roads' ? 'a van' : 'the metro'} to the ${l.goal}`).join(', then ');
    this.events.push({ say: `${this.parcel.label} is at the ${pick.kind}: ${how}.` });
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
        p.stranded = !this.reaches(st.id, p);
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

  // Somebody has arrived at `stationId`. ONE path for both layers, because a
  // parcel changing hands must behave the same whether the train or the car
  // brought it — and because the score should be counted in one place.
  //
  // A parcel with another leg to run does NOT score. It gets off, advances, and
  // waits on the platform for whatever carries the next leg. That pause is the
  // handoff, and it is the whole reason this mission type exists.
  arrived(p, stationId) {
    if (p.advance?.()) {
      const st = this.world.station(stationId);
      if (st) {
        st.rejoin(p);
        this.events.push('handoff');
        return 'handoff';
      }
    }
    this.score++;
    if (p.parcel) { this.delivered ??= new Set(); this.delivered.add(p.label ?? true); }
    this.events.push('drop');
    return 'drop';
  }

  // ONE service routine for trains and buses. A bus is a `Train` on a `Line`
  // whose legs follow streets, so the only thing that has to be looked up
  // rather than assumed is WHICH network's hop counts to compare against — and
  // which layer's booking a parcel is checked for.
  service(train, stationIndex) {
    const line = train.line;
    const net = line.net ?? this.net;
    const stId = line.stations[stationIndex];
    const st = this.world.station(stId);
    if (!st) return;

    const nextId = train.nextStopId();
    const closer = (from, goal) => net.hopsFrom(from, goal);
    const onward = goal => (nextId == null ? Infinity : closer(nextId, goal));
    let exchanged = 0;

    for (let i = train.load.length - 1; i >= 0; i--) {
      const rider = train.load[i];
      const goal = rider.goal;
      if (st.kind === goal) {
        train.load.splice(i, 1);
        exchanged++;
        this.arrived(rider, stId);
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
      // a parcel booked onto the roads does not get on a train, however
      // conveniently the train is going that way
      if (p.layer && p.layer !== net.layer) { i++; continue; }
      if (onward(p.goal) < closer(stId, p.goal)) {
        st.waiting.splice(i, 1);
        train.load.push(p);
        exchanged++;
      } else i++;
    }

    train.hold(exchanged);
  }

  makeOffer() {
    // The BUS layer buys routes and buses — and when the mission also runs
    // cars, the two pools are joined rather than one of them winning. The
    // first cut let the car branch answer first, and a bus mission then went
    // seven hours offering nothing but road: the layer the mission is named
    // for was never on a card.
    if (this.bus) {
      const pool = ['road', 'cars'];
      if (this.bus.lines.length < this.bus.maxLines) pool.push('route');
      if (this.bus.lines.length) pool.push('bus');
      if (this.roads?.bridgesLeft() <= 0 && this.world.rings.length) pool.push('bridge');
      const a = this.world.rng.pick(pool);
      const rest = pool.filter(k => k !== a);
      if (!rest.length) return null;
      return [a, this.world.rng.pick(rest)];
    }
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

  // Which network a card is about. `bus` picks a ROUTE and every other
  // line-taking card picks a metro line, so looking the id up in `this.net`
  // for all of them handed an extra bus to nothing at all.
  netFor(kind) { return kind === 'bus' || kind === 'route' ? this.bus : this.net; }

  applyUpgrade(kind, lineId = null) {
    const line = lineId == null ? null : this.netFor(kind)?.lineAt(lineId);
    switch (kind) {
      case 'line': this.net.maxLines++; break;
      case 'tunnel': this.net.ownedTunnels++; break;
      case 'train': if (line) { this.net.spareTrains++; this.net.addTrain(line); } break;
      case 'carriage': if (line) this.net.addCarriage(line); break;
      case 'road': if (this.roads) this.roads.budget += 12; break;
      case 'cars': if (this.roads) this.roads.spareCars += 2; break;
      case 'bridge': if (this.roads) this.roads.bridges++; break;
      case 'route': if (this.bus) this.bus.maxLines++; break;
      // onto a route you pick, the same as a train — `needsLine` says so and
      // the card asks
      case 'bus': if (this.bus && line) this.bus.addTrain(line); break;
      default: return false;
    }
    this.offer = null;
    this.state = 'play';
    this.paused = false;
    return true;
  }

  needsLine(kind) { return kind === 'train' || kind === 'carriage' || kind === 'bus'; }

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
      parcelLeg: this.parcel ? this.parcel.leg : null,
      parcelDone: this.delivered.size > 0,
      layer: this.layer,
      city: this.mission.city ?? null,
      roadUsed: this.roads ? this.roads.used() : null,
      jammed: this.roads ? this.roads.jammed : null,
      routes: this.bus ? this.bus.lines.length : null,
      crawling: this.bus ? this.bus.crawling : null,
      goals: this.goalReadout(),
      seed: this.seed,
    };
  }
}
