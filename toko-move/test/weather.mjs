// WEATHER's rules in bare node (js/weather.js, and the speed it hands the live
// network): a drawn mix, pins, the harness control, fog's reach, and a slower
// service that keeps its timetable.
//
//   node toko-move/test/weather.mjs
import * as X from '../js/weather.js';
import { LiveNetwork, HEADWAY_MIN } from '../js/live-network.js';

let pass = 0, fail = 0;
const ok = (c, m, x = '') => { if (c) pass++; else { fail++; console.log(`  FAIL ${m}${x ? ' — ' + x : ''}`); } };

ok(X.WEATHER.every(w => w.id && w.name && w.glyph && w.weight > 0), 'every weather has a face and a weight');
ok(X.WEATHER.filter(w => w.id !== 'clear' && w.id !== 'frost').every(w => w.blurb), 'every weather with a lever says what it does');
ok(X.drawWeather(12).id === X.drawWeather(12).id, 'the same shift draws the same weather');
const n = {}; for (let s = 1; s <= 4000; s++) { const w = X.drawWeather(s).id; n[w] = (n[w] || 0) + 1; }
const total = X.WEATHER.reduce((a, w) => a + w.weight, 0);
ok(X.WEATHER.every(w => Math.abs(n[w.id] / 4000 - w.weight / total) < 0.03), `the mix follows the weights (${JSON.stringify(n)})`);
ok(X.drawWeather(12, 'snow').id === 'snow' && X.drawWeather(12, 'nonsense', null).id === X.drawWeather(12).id, '?weather= pins a real one and ignores anything else');
ok(X.drawWeather(12, null, 'none').id === 'clear', "the harness's ?day=none is clear weather too — a control draws nothing");
ok(X.drawWeather(12, 'fog', 'none').id === 'fog', 'but an explicit ?weather= still wins over it');

// ── fog's reach ─────────────────────────────────────────────────────────
const at = { lat: 60.1699, lon: 24.9384 }, near = { lat: at.lat + 300 / 111320, lon: at.lon }, far = { lat: at.lat + 500 / 111320, lon: at.lon };
ok(Math.abs(X.metres(at, near) - 300) < 1, `metres is metres (${X.metres(at, near).toFixed(1)})`);
ok(!X.hidden(X.BY_ID.fog, at, near) && X.hidden(X.BY_ID.fog, at, far), 'fog hides 500 m and shows 300 m');
ok(!X.hidden(X.BY_ID.rain, at, far) && !X.hidden(X.BY_ID.fog, null, far), 'nothing else hides anything, and no courier means nothing hidden');

// ── slower, on the same timetable ───────────────────────────────────────
const path = Array.from({ length: 40 }, (_, i) => [60.16 + i * 0.001, 24.93]);
const transit = { layers: [{ id: 'T1', name: '1', mode: 'TRAM', path, visible: true }] };
const clear = new LiveNetwork(transit, { headwayMinutes: HEADWAY_MIN }), snow = new LiveNetwork(transit, { headwayMinutes: HEADWAY_MIN, speedFactor: X.BY_ID.snow.speed });
const L = transit.layers[0];
ok(Math.abs(snow.vehicles[0].speed / clear.vehicles[0].speed - 0.8) < 1e-9, 'snow runs every vehicle at 0.8 of its speed');
ok(snow.vehicles.length > clear.vehicles.length, `and the longer cycle carries more vehicles (${clear.vehicles.length} → ${snow.vehicles.length})`);
const h0 = clear.headwayTicks(L), h1 = snow.headwayTicks(L);
ok(Math.abs(h1 / h0 - 1) < 0.2, `so the headway holds (${h0.toFixed(0)} → ${h1.toFixed(0)} ticks): weather costs ride time, not waiting`);

console.log(`weather: ${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
