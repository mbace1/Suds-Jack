// Planning a journey over the ROUTE network, not the raw edge network.
//
// This distinction is the game. A trip cannot walk down an edge just because
// the edge exists — it can only ride a line the player drew. That is what makes
// a route a resource and an unserved district a real problem, and it is why
// closing an edge has to reroute or visibly queue rather than quietly teleport.
//
// Deterministic by construction: a uniform-cost search with every frontier
// expansion in a fixed order (route id, then stop index). No ties broken by
// insertion accident, so two runs of the same seed plan identically.

function legTime(graph, route, fromIdx, toIdx) {
  let t = 0;
  const step = toIdx > fromIdx ? 1 : -1;
  for (let i = fromIdx; i !== toIdx; i += step) {
    const e = graph.edgeBetween(route.nodes[i], route.nodes[i + step], route.mode);
    if (!e || e.closed) return Infinity;
    t += e.travel;
  }
  return t;
}

const TRANSFER_PENALTY = 12;   // ticks — a change of line is never free

// Returns [{ routeId, from, to, fromIdx, toIdx }] or null when unreachable.
export function plan(graph, routes, originId, destId, { allowedModes = null } = {}) {
  if (originId === destId) return [];

  const usable = routes.list
    .filter(r => allowedModes === null || allowedModes.includes(r.mode))
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  // state key: node id. cost: ticks. came: {node, routeId, fromIdx, toIdx}
  const best = new Map([[originId, 0]]);
  const came = new Map();
  // simple binary-less frontier: small graph, so a sorted scan is cheaper than
  // a heap and far easier to keep deterministic
  const open = [{ node: originId, cost: 0 }];

  while (open.length) {
    open.sort((a, b) => a.cost - b.cost || (a.node < b.node ? -1 : 1));
    const cur = open.shift();
    if (cur.node === destId) break;
    if (cur.cost > (best.get(cur.node) ?? Infinity)) continue;

    for (const r of usable) {
      const i = r.indexOf(cur.node);
      if (i < 0) continue;
      const arrivedOn = came.get(cur.node)?.routeId;
      const transfer = arrivedOn && arrivedOn !== r.id ? TRANSFER_PENALTY : 0;

      for (let j = 0; j < r.nodes.length; j++) {
        if (j === i) continue;
        const to = r.nodes[j];
        if (graph.node(to).closed) continue;
        const t = legTime(graph, r, i, j);
        if (!isFinite(t)) continue;
        const cost = cur.cost + t + transfer;
        if (cost < (best.get(to) ?? Infinity)) {
          best.set(to, cost);
          came.set(to, { node: cur.node, routeId: r.id, fromIdx: i, toIdx: j });
          open.push({ node: to, cost });
        }
      }
    }
  }

  if (!came.has(destId) && originId !== destId) return null;

  const legs = [];
  let at = destId;
  let guard = 0;
  while (at !== originId && guard++ < 64) {
    const c = came.get(at);
    if (!c) return null;
    legs.unshift({ routeId: c.routeId, from: c.node, to: at, fromIdx: c.fromIdx, toIdx: c.toIdx });
    at = c.node;
  }
  return legs;
}

export function estimate(graph, routes, originId, destId, opts) {
  const legs = plan(graph, routes, originId, destId, opts);
  if (!legs) return Infinity;
  let t = 0;
  for (const l of legs) {
    const r = routes.get(l.routeId);
    if (!r) return Infinity;
    t += legTime(graph, r, l.fromIdx, l.toIdx) + TRANSFER_PENALTY;
  }
  return t;
}

export { legTime, TRANSFER_PENALTY };
