// Toko Move's reading of the same neutral signals.
//
// Where the other product reads `visibility` as exposure, this reads it as the
// service share of what is moving. Where that one reads `failure` as a lost
// customer, this reads it as a missed journey. Identical arithmetic upstream,
// different meaning, and no shared vocabulary between the two files.

export const TARGET = { completion: 0.82, access: 0.75, emissions: 260 };

export class DayGoals {
  constructor(flow) {
    this.flow = flow;
    this.emissions = 0;
    this.served = new Set();
    this.deliveries = 0;
    this.upgrades = 0;
  }

  step(tick) {
    // walking is clean, the tram costs a little per carrier on the move
    if (tick % 10) return;
    for (const r of this.flow.routes.list) {
      for (const c of r.carriers) {
        if (c.docked) continue;
        this.emissions += r.mode === 'walk' ? 0 : 0.16;
      }
    }
    for (const n of this.flow.graph.nodes.values()) {
      if (this.flow.routes.routesAt(n.id).length) this.served.add(n.id);
    }
  }

  // Share of everyone who set out who actually arrived.
  completion() {
    const { completed, abandoned } = this.flow.pressure.totals;
    const all = completed + abandoned;
    return all ? completed / all : 1;
  }

  // How much of the city a line actually calls at.
  access() { return this.served.size / this.flow.graph.nodes.size; }

  // The quiet empty areas the brief asks for — named, so they can be shown.
  unreached() {
    return [...this.flow.graph.nodes.values()]
      .filter(n => !this.flow.routes.routesAt(n.id).length)
      .map(n => n.name);
  }

  // Crowding, read off the same load signal the other product reads as strain.
  worstCrowd() {
    let id = null, v = 0;
    for (const n of this.flow.graph.nodes.values()) {
      const k = n.waiting.length / Math.max(1, n.capacity);
      if (k > v) { v = k; id = n.id; }
    }
    return { id, load: v };
  }

  report() {
    const c = this.completion(), a = this.access();
    return {
      completion: c, access: a, emissions: this.emissions, deliveries: this.deliveries,
      passed: c >= TARGET.completion && a >= TARGET.access && this.emissions <= TARGET.emissions,
      grade: [c >= TARGET.completion, a >= TARGET.access, this.emissions <= TARGET.emissions]
        .filter(Boolean).length,
    };
  }
}
