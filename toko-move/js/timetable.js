// Toko Move v2.22 — THE TIMETABLE. One place that answers "how long will this
// take", for every panel that asks.
//
// It exists because there were two answers. The catch panel now reads the fleet
// forward and reports a real door-to-door figure; the dispatch board reported
// `hit.dt + stops*3 + transfers*5` — a formula with two magic numbers in it and
// no relation to how fast anything on this board actually moves. Both were
// printed as `est`, on the same trip, in the same session, a few pixels apart.
// A game whose whole verb set is READ THE NETWORK AND TIME IT cannot have two
// clocks.
//
// Nothing here is a guess. The fleet is deterministic — it IS the timetable —
// so these are exact figures for the vehicles on screen. The only uncertainty
// is whether you make the one standing in front of you, which is why the panels
// print them with a `~`.

export function layerFor(tm, line) { return tm.transit?.layers?.find(x => x.id === line.sourceId); }

// The point on a route's traced path that is nearest a stop. Longitude is
// scaled because a degree of it is about half a degree of latitude up here.
export function nearestPathIndex(tm, layer, nodeId) {
  const n = tm.city?.resolved?.[nodeId];
  if (!n || !layer?.path?.length) return 0;
  let bi = 0, bd = Infinity;
  for (let i = 0; i < layer.path.length; i++) {
    const [lat, lon] = layer.path[i], d = (lat - n.lat) ** 2 + ((lon - n.lon) * .5) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
}
export function pathDirection(tm, layer, from, to) {
  const a = nearestPathIndex(tm, layer, from), b = nearestPathIndex(tm, layer, to);
  return b === a ? null : (b > a ? 1 : -1);
}

function anyVehicleOn(tm, layer) { return tm.liveNetwork?.vehicles?.find(v => v.layer.id === layer.id) || null; }

// How long the ride itself takes: the distance along the route in path indices,
// converted through the vehicle's own speed. Any vehicle on the line will do —
// they all run at the line's speed, which is what makes this cheap.
export function legRideTicks(tm, leg) {
  const layer = layerFor(tm, leg.line), v = layer && anyVehicleOn(tm, layer);
  if (!layer || !v) return null;
  const a = nearestPathIndex(tm, layer, leg.from), b = nearestPathIndex(tm, layer, leg.to);
  return Math.round(Math.abs(b - a) * tm.liveNetwork.ticksPerIndex(v));
}

// The next departure on a line at a stop, at or after a given tick — the same
// question the panel asks about now, pointed at a moment in the future. Solved
// rather than searched: see LiveNetwork.nextArrival.
export function nextDeparture(tm, leg, fromTick) {
  const layer = layerFor(tm, leg.line);
  if (!layer || !tm.liveNetwork) return null;
  const idx = nearestPathIndex(tm, layer, leg.from), dir = pathDirection(tm, layer, leg.from, leg.to);
  return tm.liveNetwork.nextArrival(layer, idx, fromTick, dir);
}

// Door to door, in the same ticks every deadline in the game is counted in.
// `wait1` may be supplied by a caller that has already computed it (the catch
// panel knows whether a vehicle is standing there); otherwise it is looked up.
export function planEstimate(tm, choice, wait1 = null) {
  const now = tm.flow?.clock?.tick || 0, legs = choice?.legs || [];
  if (!legs.length) return null;
  const w1 = wait1 == null ? nextDeparture(tm, legs[0], now) : wait1;
  const ride1 = legRideTicks(tm, legs[0]);
  const out = { wait1: w1, ride1, wait2: null, ride2: null, total: null };
  if (legs[1] && w1 != null && ride1 != null) {
    out.wait2 = nextDeparture(tm, legs[1], now + w1 + ride1);
    out.ride2 = legRideTicks(tm, legs[1]);
  }
  const parts = legs[1] ? [out.wait1, out.ride1, out.wait2, out.ride2] : [out.wait1, out.ride1];
  out.total = parts.every(n => n != null) ? parts.reduce((a, b) => a + b, 0) : null;
  return out;
}
