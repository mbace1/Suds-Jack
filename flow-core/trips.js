// Trips, queues and boarding — the part the player watches rather than steers.
//
// A trip is neutral: an origin, a destination, a size, and an OPAQUE payload
// tag the core never inspects. Groceries, maintenance parts, contraband and
// cash are all the same object here, which is the whole promise of the shared
// engine: the hidden layer cannot get its own physics, because there is only
// one set of physics and it does not know what it is carrying.

import { plan } from './path.js?v=1';

let nextTripId = 1;
export function resetTripIds() { nextTripId = 1; }

export const PATIENCE = 420;     // ticks a trip will wait before giving up

export class Trip {
  constructor({ origin, dest, size = 1, allowedModes = null, payload = null, urgency = 1, bornTick = 0 }) {
    this.id = `p${nextTripId++}`;
    this.origin = origin; this.dest = dest;
    this.at = origin;
    this.size = size;
    this.allowedModes = allowedModes;
    this.payload = payload;        // opaque. The core never reads inside it.
    this.urgency = urgency;
    this.bornTick = bornTick;
    this.state = 'waiting';        // waiting | riding | done | abandoned
    this.legs = null;
    this.legIdx = 0;
    this.waited = 0;
    this.rode = 0;
    this.boardedAt = null;
    this.doneTick = null;
  }
  get leg() { return this.legs ? this.legs[this.legIdx] : null; }
}

export class TripSet {
  constructor(graph, routes) {
    this.graph = graph;
    this.routes = routes;
    this.map = new Map();
    this.active = [];
    this.completed = [];
    this.abandoned = [];
  }

  byId(id) { return this.map.get(id); }

  spawn(spec) {
    const t = new Trip(spec);
    this.map.set(t.id, t);
    this.active.push(t);
    this.graph.node(t.origin).waiting.push(t.id);
    return t;
  }

  // Replan anything that has no plan, or whose plan no longer exists. Called
  // after any route edit and after any closure — this is what turns "a closed
  // edge reroutes or visibly queues every affected trip" into behaviour rather
  // than a hope.
  replan() {
    for (const t of this.active) {
      if (t.state !== 'waiting') continue;
      if (t.legs && t.legs.every(l => this.routes.get(l.routeId))) continue;
      t.legs = plan(this.graph, this.routes, t.at, t.dest, { allowedModes: t.allowedModes });
      t.legIdx = 0;
    }
  }

  step(tick, pressure) {
    // 1. waiting trips age. No plan is not a failure — it is a queue, visible
    //    at the node, which is exactly the signal the player is meant to read.
    for (const t of this.active) {
      if (t.state !== 'waiting') continue;
      t.waited += 1;
      if (!t.legs) {
        t.legs = plan(this.graph, this.routes, t.at, t.dest, { allowedModes: t.allowedModes });
        t.legIdx = 0;
      }
      if (t.waited > PATIENCE) this.giveUp(t, pressure);
    }

    // 2. carriers
    for (const r of this.routes.list) {
      for (const c of r.carriers) {
        if (c.docked) this.dock(r, c, tick, pressure);
        else {
          c.progress += 1;
          for (const id of c.load) { const t = this.byId(id); if (t) t.rode += 1; }
          if (c.progress >= c.legTime) {
            c.idx += c.dir;
            c.docked = true; c.progress = 0; c.legTime = 0;
            if (c.idx >= r.nodes.length - 1) c.dir = -1;
            else if (c.idx <= 0) c.dir = 1;
          }
        }
      }
    }

    // 3. retire finished trips
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      if (t.state === 'done' || t.state === 'abandoned') this.active.splice(i, 1);
    }
  }

  dock(route, carrier, tick, pressure) {
    const nodeId = route.nodes[carrier.idx];
    const node = this.graph.node(nodeId);

    // alight — anyone whose current leg ends here
    for (let i = carrier.load.length - 1; i >= 0; i--) {
      const t = this.byId(carrier.load[i]);
      if (!t) { carrier.load.splice(i, 1); continue; }
      const leg = t.leg;
      if (!leg || leg.to !== nodeId) continue;
      carrier.load.splice(i, 1);
      t.at = nodeId;
      t.legIdx += 1;
      if (t.legIdx >= t.legs.length) {
        t.state = 'done'; t.doneTick = tick;
        this.completed.push(t);
        pressure?.completed(t);
      } else {
        t.state = 'waiting';
        t.waited = 0;
        node.waiting.push(t.id);
      }
    }

    // board — anyone whose next leg rides this route in this direction
    for (let i = 0; i < node.waiting.length && !carrier.full;) {
      const t = this.byId(node.waiting[i]);
      if (!t || t.state !== 'waiting') { node.waiting.splice(i, 1); continue; }
      const leg = t.leg;
      const wants = leg && leg.routeId === route.id
        && route.indexOf(leg.to) >= 0
        && Math.sign(route.indexOf(leg.to) - carrier.idx) === carrier.dir;
      if (!wants) { i++; continue; }
      node.waiting.splice(i, 1);
      carrier.load.push(t.id);
      t.state = 'riding';
      t.boardedAt = nodeId;
      route.uses += 1;
      pressure?.boarded(route, t);
    }

    // depart
    const nextIdx = carrier.idx + carrier.dir;
    if (nextIdx < 0 || nextIdx >= route.nodes.length) { carrier.dir *= -1; return; }
    const e = this.graph.edgeBetween(nodeId, route.nodes[nextIdx], route.mode);
    if (!e || e.closed) { carrier.dir *= -1; return; }   // wait out the closure
    carrier.legTime = e.travel;
    carrier.docked = false;
    carrier.progress = 0;
    pressure?.traversed(e, carrier);
  }

  giveUp(t, pressure) {
    t.state = 'abandoned';
    const q = this.graph.node(t.at).waiting;
    const i = q.indexOf(t.id);
    if (i >= 0) q.splice(i, 1);
    this.abandoned.push(t);
    pressure?.abandoned(t);
  }

  // How many are standing at each node right now — the queue the player reads.
  queueAt(nodeId) { return this.graph.node(nodeId).waiting.length; }
}
