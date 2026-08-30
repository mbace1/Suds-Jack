import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRealHelsinki} from '../js/real-helsinki.js';
await import('../js/route-choice.js');
const {routeChoices,servicesAt}=globalThis.__tmRouteChoiceCore;
import {DeliveryChallenge} from '../js/deliveries.js';
import {createFlow} from '../../flow-core/sim.js';
const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8')),city=buildRealHelsinki(pack);
const centre=routeChoices(city,'rautatientori','hakaniemi',3);assert.ok(centre.length>=1,'centre leg exposes a fixed HSL choice');assert.ok(centre.some(x=>x.kind==='direct'),'Rautatientori → Hakaniemi has a direct service choice');
const harbour=routeChoices(city,'lansiterminaali','toolontori',3);assert.ok(harbour.length>=1,'harbour leg exposes route guidance');
for(const c of [...centre,...harbour]){assert.ok(c.legs.length>=1&&c.legs.length<=2,'choice is direct or one transfer');for(const l of c.legs)assert.ok(['tram','metro'].includes(l.line.mode),'choice uses real fixed transit');}
assert.ok(servicesAt(city,'rautatientori').length>=3,'central station exposes multiple services');
const flow=createFlow({city,seed:7,days:1,demand:null}),challenge=new DeliveryChallenge(flow,()=>{});challenge.start();assert.equal(challenge.waitingForCatch,true,'job does not launch until player catches an HSL service');assert.equal(challenge.activeTrip,null,'no delivery trip moves before catch');const first=routeChoices(city,challenge.currentFrom(),challenge.currentTo(),3)[0];assert.ok(first,'first job has a catchable existing service');const res=challenge.catchChoice(first);assert.ok(!res.error&&challenge.activeTrip,'catch creates the delivery trip');assert.equal(flow.routes.drawn.length,0,'catching a service creates no player route');assert.deepEqual(challenge.activeTrip.legs.map(l=>flow.routes.get(l.routeId).label),first.legs.map(l=>l.line.label),'delivery is pinned to the selected fixed service chain');
console.log(`route choices: centre ${centre.length}, harbour ${harbour.length}; catch-only gameplay verified`);
