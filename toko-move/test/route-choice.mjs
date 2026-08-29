import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildRealHelsinki} from '../js/real-helsinki.js';
import {routeChoices,servicesAt} from '../js/route-choice.js';
const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8')),city=buildRealHelsinki(pack);
const centre=routeChoices(city,'rautatientori','hakaniemi',3);assert.ok(centre.length>=1,'centre leg exposes a fixed HSL choice');assert.ok(centre.some(x=>x.kind==='direct'),'Rautatientori → Hakaniemi has a direct service choice');
const harbour=routeChoices(city,'lansiterminaali','toolontori',3);assert.ok(harbour.length>=1,'harbour leg exposes route guidance');
for(const c of [...centre,...harbour]){assert.ok(c.legs.length>=1&&c.legs.length<=2,'choice is direct or one transfer');for(const l of c.legs)assert.ok(['tram','metro'].includes(l.line.mode),'choice uses real fixed transit');}
assert.ok(servicesAt(city,'rautatientori').length>=3,'central station exposes multiple services');
console.log(`route choices: centre ${centre.length}, harbour ${harbour.length}`);