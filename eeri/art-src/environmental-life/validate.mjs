import {LIFE_ACTORS,ROOM_BUDGET,validateLifeSpec} from './life-spec.js';
let pass=0,fail=0;const ok=(n,c)=>{c?pass++:(fail++,console.error('FAIL',n))};
ok('ten ambient actors',Object.keys(LIFE_ACTORS).length===10);
ok('spec valid',validateLifeSpec().length===0);
ok('camera budget stays small',ROOM_BUDGET.maxActors<=4&&ROOM_BUDGET.maxMediumEnergy===1);
ok('nothing is gameplay anchored',Object.values(LIFE_ACTORS).every(a=>!['player','pickup','hazard','checkpoint'].includes(a.anchor)));
ok('reduced motion defined',Object.values(LIFE_ACTORS).every(a=>a.reduce));
console.log(`${pass} passed, ${fail} failed`);process.exit(fail?1:0);
