// THE DECK'S RULES, in bare node. Every encounter has a free way past; the
// schedule is a function of the seed alone; the worst case a schedule can cost
// stays under the budget; and a hold shifts the next arrival by exactly the
// hold, never more, never through it.
import assert from 'node:assert';
import fs from 'node:fs';
import {ENCOUNTERS,DISRUPTIONS,BUDGET,drawSchedule,EventDirector} from '../js/events.js';
import {LiveNetwork,HEADWAY_MIN} from '../js/live-network.js';
import {TransitLayers} from '../js/transit-layers.js';
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
for(const c of ENCOUNTERS){ok(c.options.some(o=>!o.cost),`${c.id} has a free option`);ok(c.options.length>=2,`${c.id} is a choice`);ok(['stop','aboard','walking'].includes(c.where),`${c.id} says where`);ok(c.glyph&&c.text,`${c.id} has a face and a line`);}
for(const d of DISRUPTIONS)ok(d.minutes>0&&d.minutes<=8,`${d.id} holds for minutes, not the shift`);
const a=drawSchedule(7,3000,['1','6']),b=drawSchedule(7,3000,['1','6']),c=drawSchedule(8,3000,['1','6']);
ok(JSON.stringify(a)===JSON.stringify(b),'the schedule is a function of the seed');
ok(JSON.stringify(a)!==JSON.stringify(c),'a different seed draws a different shift');
ok(a.filter(e=>e.kind==='encounter').length<=BUDGET.encounters&&a.filter(e=>e.kind==='disruption').length<=BUDGET.disruptions,'the draw respects the budget');
ok(new Set(a.filter(e=>e.kind==='encounter').map(e=>e.card.id)).size===a.filter(e=>e.kind==='encounter').length,'no encounter is drawn twice in a shift');
// worst case: every encounter's dearest option
for(const seed of [1,2,3,4,5,6,7,8,9,10]){const s=drawSchedule(seed,3000,['1']);const worst=s.filter(e=>e.kind==='encounter').reduce((t,e)=>t+Math.max(...e.card.options.map(o=>o.cost||0)),0);ok(worst<=BUDGET.maxCostTicks,`seed ${seed}: worst-case encounter cost ${worst} ≤ ${BUDGET.maxCostTicks}`);}
ok(a.every((e,i)=>i===0||e.at>=a[i-1].at),'the schedule is in tick order');
// holds shift arrivals by exactly the hold
const pack=JSON.parse(fs.readFileSync(new URL('../cities/helsinki.json',import.meta.url),'utf8'));
const t=new TransitLayers(pack),net=new LiveNetwork(t,{headwayMinutes:HEADWAY_MIN});
const layer=t.layers.find(l=>l.name==='6')||t.layers[0],idx=Math.floor((layer.path.length-1)/2);
const before=net.nextArrival(layer,idx,1000,1);
net.hold(layer,1000,1240);
const during=net.nextArrival(layer,idx,1000,1);
ok(during===240+before,`a hold of 240 ticks moves the next arrival by exactly 240 (${before} → ${during})`);
const p0=net.position(net.vehicles.find(v=>v.layer.id===layer.id),1000),p1=net.position(net.vehicles.find(v=>v.layer.id===layer.id),1200);
ok(Math.abs(p0.pathIndex-p1.pathIndex)<1e-9,'a held vehicle does not move');
const p2=net.position(net.vehicles.find(v=>v.layer.id===layer.id),1300);
ok(Math.abs(p2.pathIndex-p0.pathIndex)>0,'and moves again when the hold lifts');
// director: fires only where the card says
const fakeTm={flow:{clock:{tick:0,ticksPerDay:3000}},transit:t,liveNetwork:net,shift:{hours:1.25},challenge:{active:{cargo:'documents'},score:0,say(){}},mobility:{status:()=>({kind:'waiting'})}};
const dir=new EventDirector(fakeTm,7);const first=dir.queue.find(e=>e.kind==='encounter');fakeTm.flow.clock.tick=first.at+1;
fakeTm.mobility.status=()=>({kind:'riding'});dir.step();ok(first.card.where==='aboard'?!!dir.pending:!dir.pending,'an encounter waits for the courier to be where it happens');
fakeTm.mobility.status=()=>({kind:first.card.where==='aboard'?'riding':first.card.where==='walking'?'walking':'waiting'});dir.step();ok(!!dir.pending,'and fires there');
const opts=dir.options();ok(opts.every(o=>!o.needs||o.needs==='documents'),'options you cannot meet are not offered');
const r=dir.choose(0);ok(r.ok&&!dir.pending,'choosing clears the card');
console.log(`events: ${n} checks passed`);
