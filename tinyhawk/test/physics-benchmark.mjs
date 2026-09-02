import assert from 'node:assert/strict';
import { PhysicsBenchmark, comparePhysics } from '../js/physics-benchmark.js';

const stable = new PhysicsBenchmark('stable');
const noisy = new PhysicsBenchmark('noisy');
for (let i=0;i<120;i++) {
  stable.sample({dt:1/60,grounded:true,speed:10,y:1,event:i===30?'pop':i===60?'land':null});
  noisy.sample({dt:1/60,grounded:(i%2)===0,speed:10+(i%3),y:1,event:i===30?'pop':i===60?'land':null});
}
const a=stable.summary(), b=noisy.summary();
assert.equal(a.frames,120,'stable solver records every sample');
assert.ok(a.contactChatterHz < b.contactChatterHz,'contact chatter separates stable and noisy solvers');
assert.equal(a.samples.pops,1,'pop samples are counted');
assert.equal(a.samples.landings,1,'landing samples are counted');
assert.equal(comparePhysics(a,b).winner,'stable','comparison prefers the lower-noise solver');
console.log('Tiny Hawk physics benchmark: 5 checks passed');
