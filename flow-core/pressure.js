// Pressure — raw signals, never a score.
//
// SHARED_ENGINE is explicit that the calculation inputs are shared and the
// meaning is not, so this exposes five COMPONENTS per node and per edge and
// refuses to collapse them. A single scalar would have to be weighted, and any
// weighting is secretly authored for one product: Piritori reads these as
// attention, Toko Move reads the same numbers as congestion and service
// pressure, and neither reading belongs in here.
//
// `visibility` is the one that looks like it breaks neutrality and does not.
// The core knows only that a trip carries an OPAQUE tag or does not; visibility
// is the ratio of tagged movement to all movement over an edge. Piritori reads
// that as "how much you stand out against ordinary traffic" — which is what
// makes a crowded tram genuinely safer — and Toko Move reads the same ratio as
// freight share. Same arithmetic, two meanings, no leak.

const DECAY = 0.985;             // per tick — everything cools if left alone

const blank = () => ({ load: 0, repetition: 0, delay: 0, failure: 0, tagged: 0, total: 0 });

export class Pressure {
  constructor(graph) {
    this.graph = graph;
    this.nodes = new Map();
    this.edges = new Map();
    for (const id of graph.nodes.keys()) this.nodes.set(id, blank());
    for (const id of graph.edges.keys()) this.edges.set(id, blank());
    this.routeUse = new Map();   // routeId -> rolling boardings
    this.totals = { completed: 0, abandoned: 0, boarded: 0 };
  }

  node(id) { return this.nodes.get(id); }
  edge(id) { return this.edges.get(id); }

  boarded(route, trip) {
    this.totals.boarded += 1;
    const n = this.nodes.get(trip.at ?? trip.origin);
    if (n) n.load += 1;
    this.routeUse.set(route.id, (this.routeUse.get(route.id) || 0) + 1);
  }

  traversed(edge, carrier) {
    const e = this.edges.get(edge.id);
    if (!e) return;
    e.total += 1;
    e.load += carrier.load.length / Math.max(1, carrier.capacity);
    e.repetition += 1;
    // the carrier's own composition decides the tagged share
    e.tagged += carrier.load.length ? this._taggedShare(carrier) : 0;
  }

  _taggedShare(carrier) {
    // set by sim.js, which owns the trip lookup — kept as a hook so pressure
    // never imports the trip store and can be unit-tested on its own
    return this.taggedShareOf ? this.taggedShareOf(carrier) : 0;
  }

  completed(trip) {
    this.totals.completed += 1;
    const n = this.nodes.get(trip.dest);
    if (n) n.delay += trip.waited / 100;
  }

  abandoned(trip) {
    this.totals.abandoned += 1;
    const n = this.nodes.get(trip.at);
    if (n) { n.failure += 1; n.delay += 2; }
  }

  // Queue length is a live reading, not an accumulation.
  sample(trips) {
    for (const [id, node] of this.graph.nodes) {
      const p = this.nodes.get(id);
      const q = node.waiting.length;
      p.load = p.load * 0.9 + (q / Math.max(1, node.capacity)) * 0.1;
    }
  }

  decay() {
    for (const p of this.nodes.values()) {
      p.load *= DECAY; p.repetition *= DECAY; p.delay *= DECAY; p.failure *= DECAY;
    }
    for (const p of this.edges.values()) {
      p.load *= DECAY; p.repetition *= DECAY; p.delay *= DECAY; p.failure *= DECAY;
      p.tagged *= DECAY; p.total *= DECAY;
    }
  }

  // The exposed ratio: tagged movement over all movement. 0 when nothing has
  // moved, which is correct — an unused edge hides nothing because nothing is
  // on it.
  visibility(edgeId) {
    const e = this.edges.get(edgeId);
    if (!e || e.total < 0.5) return 0;
    return Math.min(1, e.tagged / e.total);
  }

  // Per-edge snapshot the products interpret however they like.
  read(edgeId) {
    const e = this.edges.get(edgeId) || blank();
    return {
      load: e.load, repetition: e.repetition, delay: e.delay,
      failure: e.failure, visibility: this.visibility(edgeId),
    };
  }

  readNode(id) {
    const n = this.nodes.get(id) || blank();
    return { load: n.load, repetition: n.repetition, delay: n.delay, failure: n.failure, visibility: 0 };
  }
}
