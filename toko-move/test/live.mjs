// LIVE, in bare node (v2.56). The broker is unreachable from the build sandbox,
// so every message here is SYNTHETIC — shaped exactly as HSL documents HFP v2 —
// and placed on the real HSL paths from the committed pack. What this proves:
// the MQTT framing round-trips, a real report lands where it was reported, the
// direction is read correctly both ways, the fleet's own closed form then runs
// it on, and the four honest limits hold. What it cannot prove is that the real
// broker says what the documentation says; that is the phone test.
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as M from '../js/mqtt-ws.js';
import * as H from '../js/hfp.js';
import { LiveNetwork, SHIFT } from '../js/live-network.js';
import { TransitLayers } from '../js/transit-layers.js';

const here = dirname(fileURLToPath(import.meta.url));
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

// ── the framing ──────────────────────────────────────────────────────────
{ const c = M.encodeConnect('abc');
  ok(c[0] === 0x10 && String.fromCharCode(...c.slice(4, 8)) === 'MQTT' && c[8] === 4, 'CONNECT names MQTT 3.1.1');
  const s = M.encodeSubscribe(1, ['/hfp/v2/#']);
  ok(s[0] === 0x82 && s[s.length - 1] === 0, 'SUBSCRIBE asks for QoS 0');
  const r = new M.Reader(), big = 'x'.repeat(300), pub = M.encodePublish('/a/b', big);
  ok(pub[1] & 128, 'a long PUBLISH carries a two-byte remaining length');
  // one frame carrying two packets, then a packet split across two frames
  const two = new Uint8Array([...M.CONNACK, ...M.encodeSuback(1)]);
  r.push(two); const got = [...r.packets()].map(p => p.type);
  ok(got.join() === 'connack,suback', `two packets in one frame both come out (${got})`);
  r.push(pub.slice(0, 7)); ok([...r.packets()].length === 0, 'half a packet waits for the rest');
  r.push(pub.slice(7)); const p = [...r.packets()];
  ok(p.length === 1 && p[0].topic === '/a/b' && p[0].payload === big, 'and comes out whole when it arrives'); }

// ── a report ─────────────────────────────────────────────────────────────
const topic = (mode, route, dir, veh = 101) => `/hfp/v2/journey/ongoing/vp/${mode}/0040/${veh}/${route}/${dir}/Hs/07:10/1234/5/60;24/19/49/41/1`;
const vp = (o) => JSON.stringify({ VP: { desi: o.desi, dir: String(o.dir), oper: 40, veh: o.veh ?? 101, tst: '2026-09-25T07:12:00.000Z', spd: 6, hdg: o.hdg ?? null, lat: o.lat, long: o.lon, route: o.route } });
{ const v = H.parseVP(topic('tram', '1001', 1), vp({ desi: '1', dir: 1, lat: 60.17, lon: 24.94, route: '1001' }));
  ok(v && v.key === 'tram/40/101' && v.route === '1001' && v.lat === 60.17 && v.lon === 24.94, 'a VP payload parses to a keyed position');
  ok(H.parseVP('/hfp/v2/journey/ongoing/dep/tram/x', '{}') === null && H.parseVP(topic('tram', '1', 1), 'not json') === null, 'anything else is ignored, not thrown'); }

// ── on the real paths ────────────────────────────────────────────────────
const pack = JSON.parse(readFileSync(join(here, '../cities/helsinki.json'), 'utf8'));
const transit = new TransitLayers(pack);
const net = new LiveNetwork(transit, { ticksPerDay: SHIFT.ticksPerDay });
const tt = net.vehicles.length;
const fleet = new H.LiveFleet(net);
const layer = transit.layers.find(l => l.mode === 'TRAM' && l.path.length > 100);
const at = f => { const i = Math.floor(f * (layer.path.length - 1)); return layer.path[i]; };
const m = (a, b) => Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180));

{ const p = at(0.3), tick = 500;
  const v = fleet.ingest(H.parseVP(topic('tram', layer.id, 1), vp({ desi: layer.name, dir: 1, lat: p[0], lon: p[1], route: layer.id })), tick);
  ok(v && v.live, `a report on line ${layer.name} becomes a vehicle on it`);
  ok(net.vehicles.length === 1 && fleet.timetable.length === tt, `and the timetable steps aside (${tt} kept for a fallback)`);
  const pos = net.position(v, tick);
  ok(m(pos, { lat: p[0], lon: p[1] }) < 5, `the closed form puts it where it was reported (${m(pos, { lat: p[0], lon: p[1] }).toFixed(2)} m)`);
  // the next report, further along the path: the direction is read off the motion
  const p2 = at(0.32);
  fleet.ingest(H.parseVP(topic('tram', layer.id, 1), vp({ desi: layer.name, dir: 1, lat: p2[0], lon: p2[1], route: layer.id })), tick + 20);
  ok(v.dirSign === 1 && net.position(v, tick + 20).direction === 1, 'moving up the path reads as the forward direction');
  const later = net.position(v, tick + 60);
  ok(later.pathIndex > net.position(v, tick + 20).pathIndex, 'and between reports it runs on the same way');
  // and back again
  const p3 = at(0.29);
  fleet.ingest(H.parseVP(topic('tram', layer.id, 1), vp({ desi: layer.name, dir: 1, lat: p3[0], lon: p3[1], route: layer.id })), tick + 40);
  ok(v.dirSign === -1 && net.position(v, tick + 40).direction === -1, 'moving down it reads as the return');
  ok(m(net.position(v, tick + 40), { lat: p3[0], lon: p3[1] }) < 5, 'still exactly where reported'); }

// heading, before there is any motion to read
{ const i = Math.floor(0.6 * (layer.path.length - 1)), a = layer.path[i], b = layer.path[i + 1];
  const brg = (Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI + 360) % 360;
  const fwd = fleet.ingest(H.parseVP(topic('tram', layer.id, 1, 201), vp({ veh: 201, desi: layer.name, dir: 1, lat: a[0], lon: a[1], route: layer.id, hdg: brg })), 900);
  const back = fleet.ingest(H.parseVP(topic('tram', layer.id, 1, 202), vp({ veh: 202, desi: layer.name, dir: 1, lat: a[0], lon: a[1], route: layer.id, hdg: (brg + 180) % 360 })), 900);
  ok(fwd.dirSign === 1 && back.dirSign === -1, 'a first report is pointed by its heading against the path'); }

// the metro, by its route id
{ const metro = transit.layers.find(l => l.mode === 'SUBWAY'), p = metro.path[Math.floor(metro.path.length / 2)];
  const v = fleet.ingest(H.parseVP(topic('metro', metro.id, 1, 301), vp({ veh: 301, desi: metro.name, dir: 1, lat: p[0], lon: p[1], route: metro.id })), 900);
  ok(v && v.layer === metro, `the metro is matched by route (${metro.id})`); }

// ── the honest limits ────────────────────────────────────────────────────
{ const n = net.vehicles.length, p = at(0.5);
  ok(fleet.ingest(H.parseVP(topic('tram', layer.id, 1, 401), vp({ veh: 401, desi: layer.name, dir: 1, lat: p[0] + 0.004, lon: p[1], route: layer.id })), 900) === null
    && net.vehicles.length === n, `a report ${H.OFF_ROUTE}+ m off its line is ignored, not snapped onto it`);
  ok(fleet.ingest(H.parseVP(topic('tram', '9999', 1, 402), vp({ veh: 402, desi: 'X9', dir: 1, lat: p[0], lon: p[1], route: '9999' })), 900) === null, 'a route the board does not carry is ignored');
  const ride = [...fleet.live.keys()][0];
  fleet.prune(900 + H.STALE + 1, ride);
  ok(fleet.count === 1 && fleet.live.has(ride), 'a vehicle not heard from leaves the board — except the one you are riding');
  ok(fleet.fallback(ride) && net.vehicles.length === tt + 1, 'when the feed goes quiet the timetable comes back, and your ride stays'); }

console.log(`live: ${checks} checks passed`);
