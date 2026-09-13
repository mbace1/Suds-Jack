// THE PACE OF THE BOARD, in bare node. Two owner playtest findings live here.
//
// 1. "tram speeds are too fast" — and the fault was not one number. Speed was a
//    fixed DURATION per mode (50 minutes end to end for any tram), so a 17 km
//    line covered five times the ground of a 3 km line in the same time.
//    Measured across the real fleet, apparent speed ran from a crawl to 494
//    km/h. Half the trams were already slow; no single dial could have fixed
//    it. A vehicle now has a speed and its pass time follows from its own
//    length, so every tram on screen moves at ONE pace.
//
// 2. A shift has to be finishable. The median door-to-door plan is measured
//    against the shift length, and DELIVERY_TARGET follows from that. The
//    shipped build asked for six deliveries in a shift that held five.
import assert from 'node:assert';
import { SHIFT, MODE_KMH, pathKm, speedForLayer } from '../js/live-network.js';
import { DELIVERY_TARGET } from '../js/deliveries.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const TICKS_PER_SECOND = 10;

// a straight line of `km`, laid due north so the cos(lat) term is not involved
const line = (mode, km) => ({ mode, path: [[60.17, 24.94], [60.17 + km * 1000 / 111320, 24.94]] });

ok(Math.abs(pathKm(line('TRAM', 7).path) - 7) < 0.01, 'pathKm measures a 7 km line as 7 km');
ok(pathKm({ path: [] }.path) === 0 && pathKm(undefined) === 0, 'and it survives an empty or missing path');

// ── one pace, whatever the line ──────────────────────────────────────────
const apparentKmh = layer => {
  const wallSeconds = (1 / speedForLayer(layer)) / TICKS_PER_SECOND;
  return pathKm(layer.path) / wallSeconds * 3600;
};
const trams = [2, 4, 7, 11, 17].map(km => apparentKmh(line('TRAM', km)));
const spread = Math.max(...trams) - Math.min(...trams);
ok(spread < 1, `every tram moves at one apparent speed, whatever its line is long (spread ${spread.toFixed(2)} km/h)`);

// The number that shipped and was reported as too fast. This is a CEILING, not
// a target: it is the median of what the owner was looking at.
ok(trams[0] <= 299, `and that speed is at or below the shipped median (${Math.round(trams[0])} km/h)`);
ok(Math.max(...[2, 9, 21].map(km => apparentKmh(line('SUBWAY', km)))) <= 494,
  'the metro is at or below the fastest thing that shipped');
ok(apparentKmh(line('SUBWAY', 7)) > apparentKmh(line('TRAM', 7)),
  'the metro is still the faster of the two, which is the only reason to have two');

// ── long enough to see one coming ────────────────────────────────────────
// The ROUTE scale shows 4 km of city. A vehicle that crosses it faster than
// this cannot be reacted to; one slower than this makes a five-minute shift
// into a wait.
const secondsAcrossRoute = 4 / (apparentKmh(line('TRAM', 7)) / 3600);
ok(secondsAcrossRoute >= 45 && secondsAcrossRoute <= 120,
  `a tram takes ${Math.round(secondsAcrossRoute)}s to cross the ROUTE viewport`);

// ── a shift you can actually finish ──────────────────────────────────────
// The median door-to-door plan measured in the browser at this clock. Kept as
// a constant because bare node has no network, no city pack and no timetable —
// scripts/…/pace.cjs is what produces it, and it is re-measured whenever the
// clock moves.
const MEASURED_MEDIAN_JOB_TICKS = 856;
const fits = Math.floor(SHIFT.ticksPerDay * 0.92 / MEASURED_MEDIAN_JOB_TICKS);
ok(DELIVERY_TARGET <= fits, `the shift holds ${fits} median jobs and asks for ${DELIVERY_TARGET}`);
ok(DELIVERY_TARGET >= 2, 'and it asks for more than one, or it is not a shift');

// ── the clock still describes a real morning ─────────────────────────────
ok(SHIFT.ticksPerDay / TICKS_PER_SECOND === 300, 'the shift is the owner’s five minutes');
ok(SHIFT.startHour === 7 && SHIFT.hours > 0 && SHIFT.hours <= 3,
  `and it covers ${SHIFT.hours}h of a morning that starts at 0${SHIFT.startHour}:00`);
ok(MODE_KMH.TRAM > 0 && MODE_KMH.SUBWAY > MODE_KMH.TRAM, 'the mode speeds are real speeds, in km/h');

console.log(`Toko Move pace: ${checks} checks — tram ${Math.round(trams[0])} km/h apparent, ` +
  `${Math.round(secondsAcrossRoute)}s across ROUTE, ${DELIVERY_TARGET} of ${fits} jobs asked for`);
