// Routes and the carriers that run them.
//
// A route is an ordered list of nodes plus a mode; carriers shuttle back and
// forth along it, picking up whatever is waiting. The player draws and edits
// these and nothing else — "few actions, hard decisions".
//
// The load-bearing rule here is the brief's own contract test: DELETING OR
// REDRAWING A ROUTE NEVER LOSES AN AGENT. Every path that removes track has to
// set its passengers down somewhere real and hand them back to the queue, and
// the only safe "somewhere real" is a node the carrier has actually reached —
// never the node it was heading for, which may be the one just deleted.

let nextRouteId = 1;
let nextCarrierId = 1;

export function resetRouteIds() { nextRouteId = 1; nextCarrierId = 1; }

export class Carrier {
  constructor({ routeId, capacity, at }) {
    this.id = `c${nextCarrierId++}`;
    this.routeId = routeId;
    this.capacity = capacity;
    this.load = [];              // trip ids aboard
    this.idx = at;               // index in route.nodes it last DEPARTED
    this.dir = 1;                // +1 toward the end, -1 back
    this.progress = 0;           // ticks into the current leg
    this.legTime = 0;            // ticks the current leg takes (0 = docked)
    this.docked = true;
  }
  get full() { return this.load.length >= this.capacity; }
}

export class Route {
  constructor({ mode, nodes, carriers = 2, carrierCapacity = 6 }) {
    this.id = `r${nextRouteId++}`;
    this.mode = mode;
    this.nodes = [...nodes];
    this.carrierCapacity = carrierCapacity;
    this.carriers = [];
    this.uses = 0;               // how many boardings — feeds `repetition`
    for (let i = 0; i < carriers; i++) {
      // spread them along the line so they do not all leave together
      const at = this.nodes.length > 1
        ? Math.floor(i * (this.nodes.length - 1) / Math.max(1, carriers))
        : 0;
      this.carriers.push(new Carrier({ routeId: this.id, capacity: carrierCapacity, at }));
    }
  }

  serves(nodeId) { return this.nodes.includes(nodeId); }
  indexOf(nodeId) { return this.nodes.indexOf(nodeId); }
  get length() { return this.nodes.length; }
}

export class RouteSet {
  constructor(graph, { maxRoutes = 4 } = {}) {
    this.graph = graph;
    this.list = [];
    this.maxRoutes = maxRoutes;
  }

  get(id) { return this.list.find(r => r.id === id); }

  // Every consecutive pair must be joined by an open edge of the route's mode.
  // Returns a reason string when invalid, so the UI can say why rather than
  // silently refusing a drag.
  validate(mode, nodes) {
    if (nodes.length < 2) return 'a route needs two stops';
    if (new Set(nodes).size !== nodes.length) return 'a route cannot visit a stop twice';
    for (let i = 0; i < nodes.length - 1; i++) {
      const e = this.graph.edgeBetween(nodes[i], nodes[i + 1], mode);
      if (!e) return `no ${mode} link between those stops`;
      if (e.closed) return 'that link is closed';
    }
    return null;
  }

  add(mode, nodes) {
    if (this.list.length >= this.maxRoutes) return { error: 'no spare lines' };
    const bad = this.validate(mode, nodes);
    if (bad) return { error: bad };
    const r = new Route({ mode, nodes });
    this.list.push(r);
    return { route: r };
  }

  // Editing is remove-and-re-add of the node list; anyone aboard is set down
  // at the last node their carrier actually reached.
  reshape(routeId, nodes, trips) {
    const r = this.get(routeId);
    if (!r) return { error: 'no such line' };
    const bad = this.validate(r.mode, nodes);
    if (bad) return { error: bad };
    this.disembarkAll(r, trips);
    r.nodes = [...nodes];
    for (const c of r.carriers) {
      c.idx = Math.min(c.idx, r.nodes.length - 1);
      c.dir = 1; c.progress = 0; c.legTime = 0; c.docked = true;
    }
    return { route: r };
  }

  remove(routeId, trips) {
    const i = this.list.findIndex(r => r.id === routeId);
    if (i < 0) return { error: 'no such line' };
    this.disembarkAll(this.list[i], trips);
    this.list.splice(i, 1);
    return {};
  }

  // Put every passenger back on the platform of a node that exists. This is
  // the "never loses an agent" guarantee, and it is why carriers track the
  // index they DEPARTED rather than the one they are heading for.
  disembarkAll(route, trips) {
    for (const c of route.carriers) {
      const landing = route.nodes[Math.min(c.idx, route.nodes.length - 1)];
      for (const tripId of c.load) {
        const t = trips.byId(tripId);
        if (!t) continue;
        t.at = landing;
        t.state = 'waiting';
        t.legs = null;              // force a replan against the new network
        t.boardedAt = null;
        this.graph.node(landing).waiting.push(tripId);
      }
      c.load.length = 0;
    }
  }

  // Which routes call at this node — the index pathing walks.
  routesAt(nodeId) { return this.list.filter(r => r.serves(nodeId)); }
}
