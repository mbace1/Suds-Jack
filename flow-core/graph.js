// The map: nodes, edges and the one conversion to screen space.
//
// Neutral by contract. A node has TAGS, never a meaning — `home`, `work`,
// `school`, `shop`, `transfer`, `service`. Which of those is a customer and
// which is a school run is the product adapter's business, and the core must
// never be able to tell.

// walk and tram are drawable by the player; metro and car exist as FIXED
// services (see city `lines`) — real corridors that run whether or not the
// player does anything, which is what makes the map an active city rather
// than an empty board waiting for input.
export const MODES = ['walk', 'tram', 'metro', 'car'];

export class Node {
  constructor({ id, name, x, y, tags = [], capacity = 24 }) {
    this.id = id; this.name = name; this.x = x; this.y = y;
    this.tags = tags;
    this.capacity = capacity;            // how many can wait before it overflows
    this.waiting = [];                   // trip ids, in arrival order
    this.closed = false;
  }
  has(tag) { return this.tags.includes(tag); }
}

export class Edge {
  constructor({ id, a, b, mode, time, capacity = 6, cost = 1 }) {
    this.id = id; this.a = a; this.b = b;
    this.mode = mode;
    this.time = time;                    // TICKS to traverse — integers only
    this.capacity = capacity;            // concurrent carriers
    this.cost = cost;
    this.closed = false;
    this.delay = 0;                      // extra ticks from a modifier
  }
  get travel() { return this.time + this.delay; }
  other(nodeId) { return nodeId === this.a ? this.b : this.a; }
  joins(x, y) { return (this.a === x && this.b === y) || (this.a === y && this.b === x); }
}

export class Graph {
  constructor(city) {
    this.nodes = new Map();
    this.edges = new Map();
    this.adj = new Map();                // nodeId -> edge ids
    for (const n of city.nodes) this.addNode(new Node(n));
    for (const e of city.edges) this.addEdge(new Edge(e));
    // Bounds come from where the stops ACTUALLY are, not from a declared
    // design box. The authored box was half empty, so `fit` was scaling to
    // fit a rectangle mostly full of nothing and the diagram came out at
    // about a third of the size it could be.
    const xs = city.nodes.map(n => n.x), ys = city.nodes.map(n => n.y);
    const pad = 8;
    this.origin = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad };
    this.bounds = {
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }

  addNode(n) { this.nodes.set(n.id, n); this.adj.set(n.id, []); }
  addEdge(e) {
    this.edges.set(e.id, e);
    this.adj.get(e.a).push(e.id);
    this.adj.get(e.b).push(e.id);
  }

  node(id) { return this.nodes.get(id); }
  edge(id) { return this.edges.get(id); }

  // Every edge of `mode` leaving a node, skipping anything closed. Used by
  // route validation, not by pathing — trips ride ROUTES, not raw edges.
  edgesFrom(nodeId, mode = null) {
    return this.adj.get(nodeId)
      .map(id => this.edges.get(id))
      .filter(e => !e.closed && (mode === null || e.mode === mode));
  }

  edgeBetween(a, b, mode = null) {
    for (const id of this.adj.get(a)) {
      const e = this.edges.get(id);
      if (e.joins(a, b) && (mode === null || e.mode === mode)) return e;
    }
    return null;
  }

  // Design coordinates -> device pixels, letterboxed to fit. One place, so a
  // hit test and a draw can never disagree about where a node is.
  fit(pxW, pxH, margin = 26) {
    const s = Math.min((pxW - margin * 2) / this.bounds.w, (pxH - margin * 2) / this.bounds.h);
    const ox = (pxW - this.bounds.w * s) / 2 - this.origin.x * s;
    const oy = (pxH - this.bounds.h * s) / 2 - this.origin.y * s;
    return { scale: s, ox, oy, x: gx => ox + gx * s, y: gy => oy + gy * s };
  }
}
