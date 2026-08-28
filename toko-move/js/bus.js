// The bus layer: public transport that has to use the streets.
//
// WHY IT IS THE METRO NETWORK AND NOT A NEW ONE. A bus route is a line — an
// ordered list of stops, drawn stop to stop, with vehicles running it back and
// forth and passengers boarding by the same "is the next stop closer to my
// shape" rule. Writing a second copy of that would give the game two boarding
// rules to keep in step, and they would drift. So `BusNet extends Network` and
// the whole difference is TWO things:
//
//   1. a leg is a path along the ROAD GRID, not a straight run. `Line.router`
//      is the hook; every seg still ends up as `pts`/`cum`/`len`, so `Train`,
//      the dwell, the shared-leg offset and the renderer all work untouched.
//   2. the refusal is not a tunnel, it is "there is no street between these
//      two". You buy the way with road, on the car layer, which is what makes
//      the two road layers one place rather than two.
//
// AND WHY IT IS NOT THE CAR LAYER EITHER. Cars pick their own way and you give
// them room; a bus goes where you say and carries a crowd. Those are opposite
// verbs and they are the reason both exist: the streets you lay for one are
// the streets the other is stuck in.
//
// The coupling is real in both directions. A bus takes up room in the square
// it is standing in (`roads.busCells`), so a street full of buses is full for
// cars; and traffic in that square SLOWS the bus (`JAM_FACTOR`) rather than
// stopping it, because a bus that could be blocked outright would deadlock
// against the very cars it is blocking.

import { Network, Line, Train } from './lines.js?v=13';

export const BUS_SPEED = 58;         // board units per second — a third of a train
export const BUS_CAPACITY = 8;       // …but it takes more than a train's carriage
const JAM_FACTOR = 0.4;              // how much of its speed a bus keeps in traffic

export class Bus extends Train {
  get capacity() { return BUS_CAPACITY * (1 + this.cars); }
}

export class BusNet extends Network {
  layer = 'bus';

  constructor(world, roads, resources = {}) {
    super(world, resources);
    this.roads = roads;
    // Its own allowances, named for what they are. Falling back to the metro's
    // numbers would silently give a bus mission three routes because it also
    // named `lines` for something else.
    this.maxLines = resources.routes ?? 2;
    this.spareTrains = resources.buses ?? 2;
    this.ownedTunnels = 0;            // a bus never goes under anything
  }

  makeLine() {
    const line = new Line(this.seq++, this.freeColour(), this.world,
      (a, b) => this.roads?.pathPoints(a.id, b.id) ?? null);
    return line;
  }

  // The refusal, said before the finger arrives (PLAYTEST.md §3.4) — the same
  // contract `LineDrawer` already asks the metro network for.
  wouldCost(fromId, toId) {
    const ok = !!this.roads?.pathCells(fromId, toId);
    return { cross: 0, refused: ok ? null : 'no street goes there' };
  }

  // `open`/`extend`/closing a loop all roll back on this. For the metro it
  // counts tunnels; here it asks whether every leg found a street. The metro's
  // version had to be overridden and not merely re-tuned: a bus crossing a
  // BRIDGE has a leg that crosses water, which the tunnel arithmetic reads as
  // a tunnel it cannot afford, and every route over a river was refused.
  refuse(line) { return line.broken ? 'no street goes there' : null; }

  addTrain(line) {
    if (this.spareTrains <= 0) return false;
    this.spareTrains--;
    const b = new Bus(line);
    line.trains.push(b);
    line.spaceIn(b);            // …or every bus after the first rides in its shadow
    return true;
  }

  // Which stops are joined, for the boarding solve: a broken leg joins nothing,
  // so a passenger will not board a bus that cannot get there.
  adjacency() {
    const adj = new Map();
    const link = (a, b) => {
      if (!adj.has(a)) adj.set(a, new Set());
      adj.get(a).add(b);
    };
    for (const l of this.lines) {
      for (let i = 0; i < l.segCount(); i++) {
        if (l.segs[i]?.road === false) continue;
        const [a, b] = l.segStations(i);
        link(a, b); link(b, a);
      }
    }
    return adj;
  }

  // ── the tick ──────────────────────────────────────────────────────────
  // Reports arrivals the way the metro loop does — `onArrive(bus, index)` — so
  // the sim services a bus and a train through one path.
  step(dt, onArrive) {
    this.busCellsOut();
    for (const line of this.lines) {
      if (line.broken) continue;
      for (const bus of line.trains) {
        const at = this.paceOf(bus);
        const i = bus.move(dt, BUS_SPEED * at);
        if (i >= 0) onArrive?.(bus, i);
      }
    }
  }

  // How fast this bus is allowed to be, right now, where it is standing.
  paceOf(bus) {
    if (!this.roads) return 1;
    const p = bus.pos();
    const { cx, cy } = this.roads.cellOf(p);
    return this.roads.trafficAt(`${cx},${cy}`) > 0 ? JAM_FACTOR : 1;
  }

  // Tell the car layer where the buses are, once a tick.
  busCellsOut() {
    if (!this.roads) return;
    const m = this.roads.busCells;
    m.clear();
    for (const line of this.lines) {
      for (const bus of line.trains) {
        const p = bus.pos();
        const { cx, cy } = this.roads.cellOf(p);
        const k = `${cx},${cy}`;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
  }

  // How many buses are stuck in traffic — the layer's own honest bad number,
  // the way `jammed` is the car layer's.
  get crawling() {
    let n = 0;
    for (const line of this.lines) for (const bus of line.trains) if (this.paceOf(bus) < 1) n++;
    return n;
  }
}
