// Seeded events. Data in, effects out, meaning nowhere.
//
// An event may change demand, alter travel time or capacity, open or close a
// node or edge, add a temporary modifier, or ask the product to make a choice.
// It carries NO text: the narrative line, the market shock and the
// family-friendly framing are all written in the product adapter, keyed by the
// event's `kind`. That is the seam that lets one closure be a police check in
// one game and track maintenance in the other.

export const KIND = {
  CLOSE_EDGE: 'close_edge',
  SLOW_EDGE: 'slow_edge',
  SURGE: 'surge',            // demand multiplier at a node
  CHOICE: 'choice',          // hand control to the product
};

export class EventQueue {
  constructor(rng, { ticksPerDay }) {
    this.rng = rng;
    this.ticksPerDay = ticksPerDay;
    this.scheduled = [];
    this.fired = [];
    this.modifiers = [];     // {kind, target, until, ...}
  }

  // The slice asks for one price shock, one closure and one relationship event.
  // Scheduling is done ONCE up front from the seed, not rolled per tick, so a
  // replay lands them on the same ticks even if the player pauses differently.
  schedule(graph, days) {
    const r = this.rng;
    const edgeIds = [...graph.edges.keys()].filter(id => id.startsWith('t')).sort();
    const nodeIds = [...graph.nodes.keys()].sort();

    const day = d => d * this.ticksPerDay + r.int(60, this.ticksPerDay - 60);

    this.scheduled.push({
      tick: day(Math.max(1, Math.floor(days * 0.3))),
      kind: KIND.CLOSE_EDGE, target: r.pick(edgeIds), duration: this.ticksPerDay,
    });
    this.scheduled.push({
      tick: day(Math.max(1, Math.floor(days * 0.5))),
      kind: KIND.SURGE, target: r.pick(nodeIds), amount: 2.4, duration: this.ticksPerDay,
    });
    this.scheduled.push({
      tick: day(Math.max(2, Math.floor(days * 0.7))),
      kind: KIND.SLOW_EDGE, target: r.pick(edgeIds), amount: 14, duration: this.ticksPerDay,
    });
    this.scheduled.push({
      tick: day(Math.max(1, Math.floor(days * 0.6))),
      kind: KIND.CHOICE, target: r.pick(nodeIds),
    });
    this.scheduled.sort((a, b) => a.tick - b.tick);
  }

  step(tick, graph, hooks) {
    while (this.scheduled.length && this.scheduled[0].tick <= tick) {
      const ev = this.scheduled.shift();
      this.apply(ev, tick, graph);
      this.fired.push(ev);
      hooks?.onEvent?.(ev);
    }
    for (let i = this.modifiers.length - 1; i >= 0; i--) {
      const m = this.modifiers[i];
      if (m.until > tick) continue;
      this.lift(m, graph);
      this.modifiers.splice(i, 1);
      hooks?.onEventEnd?.(m);
    }
  }

  apply(ev, tick, graph) {
    const until = tick + (ev.duration || 0);
    if (ev.kind === KIND.CLOSE_EDGE) {
      const e = graph.edge(ev.target);
      if (e) { e.closed = true; this.modifiers.push({ ...ev, until }); }
    } else if (ev.kind === KIND.SLOW_EDGE) {
      const e = graph.edge(ev.target);
      if (e) { e.delay += ev.amount; this.modifiers.push({ ...ev, until }); }
    } else if (ev.kind === KIND.SURGE) {
      this.modifiers.push({ ...ev, until });
    }
  }

  lift(m, graph) {
    if (m.kind === KIND.CLOSE_EDGE) { const e = graph.edge(m.target); if (e) e.closed = false; }
    if (m.kind === KIND.SLOW_EDGE) { const e = graph.edge(m.target); if (e) e.delay = Math.max(0, e.delay - m.amount); }
  }

  surgeAt(nodeId) {
    return this.modifiers
      .filter(m => m.kind === KIND.SURGE && m.target === nodeId)
      .reduce((k, m) => k * m.amount, 1);
  }
}
