// Toko Move — LIVE: the real morning's trams on the board (roadmap L5, v2.56).
//
// HSL publishes where every tram and metro train is, about once a second, as
// "high-frequency positioning" (HFP) on an open MQTT broker. LIVE does NOT
// build a second fleet from it. The timetable fleet (live-network.js) already
// answers every question the game asks — where is it, which way, when does it
// reach my stop, can I catch it, where does my ride go — from one closed form:
// a vehicle is a PHASE on its line's out-and-back cycle and a SPEED. So a real
// vehicle becomes one of those: its reported position is projected onto its
// line's exact HSL path, the phase is re-solved so that the closed form puts it
// exactly there NOW, and between reports it runs on at the line's speed. Every
// reader downstream — the catch panel, the ride, the arrival minutes, the
// badges — is unchanged and cannot tell.
//
// Honest limits, all handled rather than hidden:
//   · a report too far from its line (a depot run, a diversion, GPS noise past
//     OFF_ROUTE m) is ignored, never snapped onto a line it is not on;
//   · a line with no real vehicle has no vehicle: that is the real city;
//   · a vehicle not heard from for STALE ticks leaves the board — unless it is
//     the one you are riding, which runs on at its line's speed until you get
//     off, rather than vanishing from under you;
//   · if the feed goes quiet the timetable comes back (`fallback()`), and the
//     game says so.
//
// Pure: no DOM, no socket, no clock of its own — test/live.mjs drives it with
// synthetic HFP messages placed on the real HSL paths.
import { speedForLayer } from './live-network.js?v=15';

export const BROKER = 'wss://mqtt.hsl.fi:443/';
export const TOPICS = ['/hfp/v2/journey/ongoing/vp/tram/#', '/hfp/v2/journey/ongoing/vp/metro/#'];
export const OFF_ROUTE = 120, STALE = 40 * 3; // metres; ticks (3 minutes of the real clock)

// /hfp/v2/journey/ongoing/vp/<mode>/<oper>/<veh>/<route>/<dir>/<headsign>/<start>/<next_stop>/<geohash_level>/<geohash>/<sid>/...
export function parseTopic(topic) {
  const p = String(topic || '').split('/');
  if (p[1] !== 'hfp' || p[2] !== 'v2' || p[5] !== 'vp') return null;
  return { mode: p[6], oper: p[7], veh: p[8], route: p[9], dir: p[10] };
}

export function parseVP(topic, payload) {
  const t = parseTopic(topic); if (!t) return null;
  let vp; try { vp = JSON.parse(payload)?.VP; } catch { return null; }
  if (!vp || !Number.isFinite(vp.lat) || !Number.isFinite(vp.long)) return null;
  const oper = vp.oper ?? t.oper, veh = vp.veh ?? t.veh;
  return {
    key: `${t.mode}/${oper}/${veh}`, mode: t.mode, route: String(vp.route ?? t.route ?? ''), desi: String(vp.desi ?? ''),
    dir: String(vp.dir ?? t.dir ?? ''), lat: vp.lat, lon: vp.long, hdg: Number.isFinite(vp.hdg) ? vp.hdg : null,
  };
}

const R = 111320;
function local(p, lat0) { return [p[1] * R * Math.cos(lat0 * Math.PI / 180), p[0] * R]; }
// The nearest point of a path to (lat, lon): fractional index and metres off.
export function projectOnPath(path, lat, lon) {
  if (!path || path.length < 2) return null;
  const [px, py] = local([lat, lon], lat);
  let best = null;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = local(path[i], lat), [bx, by] = local(path[i + 1], lat);
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, f = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
    const d = Math.hypot(ax + dx * f - px, ay + dy * f - py);
    if (!best || d < best.metres) best = { index: i + f, metres: d, i };
  }
  return best;
}
// The compass bearing of a path at segment i, forward along the path.
function bearing(path, i) {
  const a = path[i], b = path[Math.min(path.length - 1, i + 1)], k = Math.cos(a[0] * Math.PI / 180);
  return (Math.atan2((b[1] - a[1]) * k, b[0] - a[0]) * 180 / Math.PI + 360) % 360;
}

export class LiveFleet {
  constructor(network, { layers = network?.transit?.layers || [] } = {}) {
    this.net = network; this.byRoute = new Map(); this.byName = new Map();
    for (const l of layers) { if (l.mode !== 'TRAM' && l.mode !== 'SUBWAY') continue; this.byRoute.set(String(l.id), l); this.byName.set(`${l.mode}:${l.name}`, l); }
    this.timetable = null; this.live = new Map(); this.heard = 0; this.lastHeard = null; this.ignored = { offRoute: 0, unknown: 0 };
  }
  layerFor(v) {
    return this.byRoute.get(v.route) || this.byName.get(`${v.mode === 'metro' ? 'SUBWAY' : 'TRAM'}:${v.desi}`) || null;
  }
  // One report, at the game's tick. Returns the fleet vehicle, or null.
  ingest(v, tick) {
    if (!v) return null;
    const layer = this.layerFor(v); if (!layer) { this.ignored.unknown++; return null; }
    const path = layer.path || [], hit = projectOnPath(path, v.lat, v.lon);
    if (!hit || hit.metres > OFF_ROUTE) { this.ignored.offRoute++; return null; }
    // First real vehicle: the timetable steps aside (kept, for `fallback`).
    if (!this.timetable) { this.timetable = this.net.vehicles.filter(x => !x.live); this.net.vehicles = this.net.vehicles.filter(x => x.live); }
    const id = `live:${v.key}`, speed = speedForLayer(layer, this.net.ticksPerDay, this.net.shiftHours) * (this.net.speedFactor || 1);
    let veh = this.live.get(id);
    // WHICH WAY. Two reports that moved along the path say it outright; before
    // that, the reported heading against the path's own bearing does.
    let dir = veh?.layer === layer ? veh.dirSign : 0;
    if (veh?.layer === layer && Math.abs(hit.index - veh.lastIndex) > 0.05) dir = hit.index > veh.lastIndex ? 1 : -1;
    else if (!dir && v.hdg != null) { const d = Math.abs(((v.hdg - bearing(path, hit.i)) + 540) % 360 - 180); dir = d <= 90 ? 1 : -1; }
    if (!dir) dir = v.dir === '2' ? -1 : 1;
    const q = hit.index / (path.length - 1), cycle = dir > 0 ? q : 2 - q;
    const phase = (((cycle - tick * speed) % 2) + 2) % 2;
    if (!veh) { veh = { id, layer, live: true, key: v.key }; this.live.set(id, veh); this.net.vehicles.push(veh); }
    Object.assign(veh, { layer, speed, phase, dirSign: dir, lastIndex: hit.index, seenAt: tick, offMetres: hit.metres });
    this.heard++; this.lastHeard = tick;
    return veh;
  }
  // Drop what has not been heard from, except the vehicle you are on.
  prune(tick, keep = null) {
    for (const [id, veh] of this.live) {
      if (tick - veh.seenAt <= STALE || id === keep) continue;
      this.live.delete(id); this.net.vehicles = this.net.vehicles.filter(x => x !== veh);
    }
  }
  // The feed went quiet: the timetable comes back, the real vehicles go.
  fallback(keep = null) {
    if (!this.timetable) return false;
    const kept = [...this.live.values()].filter(v => v.id === keep);
    this.net.vehicles = [...this.timetable, ...kept]; this.timetable = null;
    this.live = new Map(kept.map(v => [v.id, v])); return true;
  }
  get count() { return this.live.size; }
}
