import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRealHelsinki} from '../js/real-helsinki.js';
await import('../js/route-choice.js');
const {routeChoices,servicesAt}=globalThis.__tmRouteChoiceCore;
import {DeliveryChallenge,DEADLINE_GRACE} from '../js/deliveries.js';
import {createFlow} from '../../flow-core/sim.js';
import {LiveNetwork} from '../js/live-network.js';
import {TransitLayers} from '../js/transit-layers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8')),city=buildRealHelsinki(pack);
const centre=routeChoices(city,'rautatientori','hakaniemi',3);assert.ok(centre.length>=1,'centre leg exposes a fixed HSL choice');assert.ok(centre.some(x=>x.kind==='direct'),'Rautatientori → Hakaniemi has a direct service choice');
const harbour=routeChoices(city,'lansiterminaali','toolontori',3);assert.ok(harbour.length>=1,'harbour leg exposes route guidance');
for(const c of [...centre,...harbour]){assert.ok(c.legs.length>=1&&c.legs.length<=2,'choice is direct or one transfer');for(const l of c.legs)assert.ok(['tram','metro'].includes(l.line.mode),'choice uses real fixed transit');}
assert.ok(servicesAt(city,'rautatientori').length>=3,'central station exposes multiple services');
const flow=createFlow({city,seed:7,days:1,demand:null}),challenge=new DeliveryChallenge(flow,()=>{});challenge.start();
// v2.12 opens on the dispatch board rather than handing you a job: nothing is
// active until you take one of the offers. The gate used to assert v2.11's
// auto-assigned job and so stopped exercising the shipped loop entirely.
assert.equal(challenge.active,null,'the shift opens on the dispatch board, with no job forced on the player');
assert.ok(challenge.offers?.length>=2,'the board offers a real choice, not a single next job');
for(const offer of challenge.offers)assert.ok(flow.graph.node(offer.stops?.[0]??offer.from),'every offer starts somewhere real');
challenge.acceptOffer(challenge.offers[0].id);
assert.ok(challenge.active,'taking an offer makes it the active job');
assert.equal(challenge.waitingForCatch,true,'job does not launch until player catches an HSL service');assert.equal(challenge.activeTrip,null,'no delivery trip moves before catch');const first=routeChoices(city,challenge.currentFrom(),challenge.currentTo(),3)[0];assert.ok(first,'first job has a catchable existing service');const res=challenge.catchChoice(first);assert.ok(!res.error&&challenge.activeTrip,'catch creates the delivery trip');assert.equal(flow.routes.drawn.length,0,'catching a service creates no player route');assert.deepEqual(challenge.activeTrip.legs.map(l=>flow.routes.get(l.routeId).label),first.legs.map(l=>l.line.label),'delivery is pinned to the selected fixed service chain');
console.log(`route choices: centre ${centre.length}, harbour ${harbour.length}; catch-only gameplay verified`);

// ---- when the next one comes, solved rather than searched -----------------
//
// v2.22 replaced two forward SCANS (120 ticks in the panel, 900 for a transfer)
// with a closed form, because a vehicle here is a triangle wave and the answer
// has one. The horizons were not a detail: a line whose next vehicle was 200
// ticks out reported "WAITING" and no number, and once plans started being
// compared on total time a plan with no number lost to a plan with a bad one.
//
// This holds the replacement against what it replaced, on every real layer.
{
  const layers = new TransitLayers(pack); layers.showAll();
  const net = new LiveNetwork(layers, { vehiclesPerLine: 3 });
  let checked = 0, worst = 0, nulls = 0;
  const WINDOW = 22;                     // the catch window, in ticks
  for (const layer of layers.layers) {
    const n = layer.path.length;
    for (const idx of [0, Math.floor(n / 3), Math.floor(n / 2), n - 1]) {
      for (const dir of [1, -1]) {
        for (const tick of [0, 137, 940, 2600]) {
          let scan = null;
          for (let dt = 0; dt <= 3000; dt++) if (net.nearestTo(layer, idx, tick + dt, 2.2, dir)) { scan = dt; break; }
          const solved = net.nextArrival(layer, idx, tick, dir);
          if (scan == null) { if (solved != null) nulls++; continue; }
          assert.ok(solved != null, 'the closed form found nothing where the scan found a vehicle');
          checked++;
          worst = Math.max(worst, Math.abs(scan - solved));
        }
      }
    }
  }
  assert.ok(checked > 500, `expected a real sample, compared only ${checked}`);
  // The scan reports the moment the vehicle ENTERS the catch window; the closed
  // form reports the moment it is exactly at the stop. So they may differ by the
  // width of the window and by nothing else.
  assert.ok(worst <= WINDOW, `closed form and scan disagree by ${worst} ticks; the window is only ${WINDOW}`);
  assert.equal(nulls, 0, 'the closed form claimed an arrival the scan could not find in 3000 ticks');
  console.log(`next arrival: closed form matches a 3000-tick scan on ${checked} cases across ${layers.layers.length} layers (worst gap ${worst}t = the window)`);
}

// ---- a deadline is the trip's real cost, not a distance formula -----------
//
// `late` was 0 in every run this game had ever been measured on, and the
// report card's `margin` column — the one number that would have said why —
// had never once been recorded correctly. Once it was: 75%, 58%, 42% and 14%
// of the deadline left spare. A deadline with half of itself to spare is not
// a deadline.
{
  const flow = createFlow({ city, seed: 7, days: 1, demand: null, ticksPerDay: 3000 });
  const ch = new DeliveryChallenge(flow, () => {});
  const args = { from: 'lasipalatsi', to: 'kalasatama', cargo: 'documents', dist: 12 };

  // bare node installs no estimator, so the old formula still answers — which
  // is what keeps every gate written before this one measuring what it meant to
  const fallback = ch.deadlineFor(args);
  assert.ok(fallback > 0, 'without an estimator a deadline still comes out');

  // with one, it is the trip plus a grace and nothing else
  ch.estimate = () => 400;
  const derived = ch.deadlineFor(args);
  assert.ok(derived > 400, 'a deadline is longer than the trip it is for');
  assert.ok(derived < 400 * 2, `and not twice it — got ${derived} for a 400t trip`);
  assert.equal(derived, Math.round(400 * DEADLINE_GRACE + 30 * (3000 / 600)), 'grace applied exactly once');

  // a longer trip gets a longer deadline, proportionally
  ch.estimate = () => 800;
  assert.ok(ch.deadlineFor(args) > derived, 'a longer trip gets longer');
  assert.ok(Math.abs(ch.deadlineFor(args) - derived * 2) < 200, 'roughly in proportion, not by a step');

  // a nonsense estimate falls back rather than shipping a zero-length deadline
  for (const bad of [null, 0, NaN, -5, undefined]) {
    ch.estimate = () => bad;
    assert.equal(ch.deadlineFor(args), fallback, `an estimate of ${bad} falls back to the formula`);
  }
  console.log(`deadlines: ${DEADLINE_GRACE}x the real trip plus a grace; a bad estimate falls back`);
}
