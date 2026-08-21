// createFlow — the whole neutral simulation, assembled.
//
// Constructed, never imported into a product's guts: `createFlow({city, seed,
// demand, hooks})`. Nothing in flow-core imports piritori/ or toko-move/, and
// nothing here branches on a product name — which is what the brief's contract
// test checks, and the only way the two games can share this without one of
// them slowly becoming the host.

import { Rng } from './rng.js?v=1';
import { Clock, TICKS_PER_DAY } from './clock.js?v=1';
import { Graph } from './graph.js?v=1';
import { RouteSet, resetRouteIds } from './routes.js?v=1';
import { TripSet, resetTripIds } from './trips.js?v=1';
import { Pressure } from './pressure.js?v=1';
import { EventQueue } from './events.js?v=1';
import { plan } from './path.js?v=1';

export function createFlow({ city, seed = 1, days = 7, demand, hooks = {}, maxRoutes = 4 }) {
  resetRouteIds();
  resetTripIds();

  const rng = new Rng(seed, 'flow');
  const graph = new Graph(city);
  const clock = new Clock({ ticksPerDay: TICKS_PER_DAY });
  const routes = new RouteSet(graph, { maxRoutes });
  const trips = new TripSet(graph, routes);
  const pressure = new Pressure(graph);
  const events = new EventQueue(rng.fork('events'), { ticksPerDay: clock.ticksPerDay });
  events.schedule(graph, days);

  // the city's own services run from tick one, before the player draws a thing
  for (const line of city.lines || []) routes.addFixed(line);

  // pressure needs to know a carrier's tagged share without importing trips
  pressure.taggedShareOf = carrier => {
    if (!carrier.load.length) return 0;
    let tagged = 0;
    for (const id of carrier.load) if (trips.byId(id)?.payload) tagged += 1;
    return tagged / carrier.load.length;
  };

  const demandRng = rng.fork('demand');
  const nodesWith = tag => [...graph.nodes.values()].filter(n => n.has(tag) && !n.closed);

  // Ordinary movement. The product supplies which tag wants to reach which —
  // the core does not know why anybody travels.
  function spawnOrdinary(tick) {
    if (!demand) return;
    const perTick = demand.rate / clock.ticksPerDay;
    let n = Math.floor(perTick);
    if (demandRng.chance(perTick - n)) n += 1;
    for (let i = 0; i < n; i++) {
      const pair = weightedPick(demand.pairs, demandRng);
      if (!pair) continue;
      const from = nodesWith(pair.from), to = nodesWith(pair.to);
      if (!from.length || !to.length) continue;
      const o = demandRng.pick(from);
      let d = demandRng.pick(to);
      if (d.id === o.id) continue;
      if (demandRng.next() > Math.min(1, events.surgeAt(o.id) / 2.4 + 0.5) && events.surgeAt(o.id) > 1) continue;
      trips.spawn({ origin: o.id, dest: d.id, bornTick: tick, payload: null });
    }
  }

  function weightedPick(pairs, r) {
    const total = pairs.reduce((s, p) => s + (p.weight ?? 1), 0);
    let x = r.float(0, total);
    for (const p of pairs) { x -= (p.weight ?? 1); if (x <= 0) return p; }
    return pairs[pairs.length - 1];
  }

  function stepOnce() {
    const tick = clock.advance();
    events.step(tick, graph, hooks);
    // a closure invalidates plans — replan before anyone tries to board
    if (events.fired.length && tick % 10 === 0) trips.replan();
    spawnOrdinary(tick);
    trips.step(tick, pressure);
    pressure.sample(trips);
    pressure.decay();
    hooks.onTick?.(tick, api);
    if (tick % clock.ticksPerDay === 0) hooks.onDay?.(clock.day, api);
    return tick;
  }

  const api = {
    graph, clock, routes, trips, pressure, events, rng,
    days,

    // real milliseconds in, whole ticks run
    update(ms) {
      let n = clock.pending(ms), ran = 0;
      while (n-- > 0) { stepOnce(); ran++; }
      return ran;
    },
    // for tests and replay: run exactly n ticks regardless of wall clock
    runTicks(n) { for (let i = 0; i < n; i++) stepOnce(); },

    addRoute(mode, nodeIds) {
      const res = routes.add(mode, nodeIds);
      if (!res.error) trips.replan();
      return res;
    },
    reshapeRoute(id, nodeIds) {
      const res = routes.reshape(id, nodeIds, trips);
      if (!res.error) trips.replan();
      return res;
    },
    removeRoute(id) {
      const res = routes.remove(id, trips);
      if (!res.error) trips.replan();
      return res;
    },

    // The product's own hidden/service layer rides the same graph and the same
    // capacity as everyone else. There is no second network to put it on.
    inject(origin, dest, payload, opts = {}) {
      return trips.spawn({ origin, dest, payload, bornTick: clock.tick, ...opts });
    },

    // Can anything get from here to there on the lines as they stand? A
    // product needs to ask BEFORE it commits something to a trip: an ordinary
    // traveller who cannot be carried is a person waiting on a platform, which
    // is the game working, but a payload that cannot be carried is a payload
    // its owner has already paid for. Same planner the carriers use, so the
    // answer cannot disagree with what actually happens.
    reaches(origin, dest) {
      return origin === dest || !!plan(graph, routes, origin, dest);
    },

    // A compact, comparable fingerprint of movement. Two runs of one seed must
    // produce identical strings — that is the contract test.
    fingerprint() {
      const q = [...graph.nodes.keys()].sort().map(id => graph.node(id).waiting.length).join(',');
      const c = routes.list.map(r => r.carriers.map(k => `${k.idx}:${k.dir}:${k.progress}:${k.load.length}`).join('|')).join(';');
      return `t${clock.tick}|q${q}|c${c}|d${pressure.totals.completed}|a${pressure.totals.abandoned}`;
    },

    stats() {
      return {
        tick: clock.tick, day: clock.day,
        waiting: [...graph.nodes.values()].reduce((s, n) => s + n.waiting.length, 0),
        riding: trips.active.filter(t => t.state === 'riding').length,
        completed: pressure.totals.completed,
        abandoned: pressure.totals.abandoned,
      };
    },
  };

  return api;
}
