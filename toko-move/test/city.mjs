// THE CITY YOU KNOW, AND THE COURIER WHO SHARES IT — bare node.
import assert from 'node:assert';
import {WALK_STREETS} from '../js/hubs-walking.js';
import {SEEDED,loadVisited,saveVisited,visit,knowsWay,knownWalks,teach,progress,streetsAt} from '../js/knowledge.js';
import {walkLinks} from '../js/hubs-walking.js';
import {Rival,GRACE,CLAIM_WINDOW} from '../js/rival.js';
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const eq=(a,b,m)=>{assert.strictEqual(a,b,`${m} (got ${a}, wanted ${b})`);n++;};
const ALL=walkLinks();

// ── local knowledge: you know a way when you have been to BOTH ends ──────
ok(SEEDED.every(id=>ALL.some(l=>l.from===id||l.to===id)),'every seeded stop is on the walking network');
{const v=new Set(SEEDED),p=progress(v);
 ok(p.known>0,'you start able to walk somewhere');
 ok(p.known<p.total,`and not everywhere (${p.known} of ${p.total} links)`);}
// THE RULE THAT DID NOT WORK, kept as a check so it cannot come back: a rule
// that learns the stop you are AT is inert, because walking is only offered
// from where you are and arriving is what teaches you. Standing somewhere new
// must not open the walks that LEAVE it.
{const v=new Set(SEEDED);visit(v,'arabia');
 const fromHere=knownWalks(v,ALL.filter(l=>l.from==='arabia'||l.to==='arabia'));
 ok(fromHere.length===0,'arriving somewhere whose neighbours you have never seen opens NO walk out of it — the far end has to be known too');
 visit(v,'sornainen');
 ok(knownWalks(v,ALL).some(l=>(l.from==='arabia'&&l.to==='sornainen')||(l.to==='arabia'&&l.from==='sornainen')),'and once you have been to both, the way between them is yours');
 // The other half of the same rule: arriving next door to somewhere you know
 // DOES open that one link, and only that one.
 const w=new Set(SEEDED),opened=progress(w).known;visit(w,'hietalahti');
 const now=knownWalks(w,ALL.filter(l=>l.from==='hietalahti'||l.to==='hietalahti'));
 eq(now.length,1,'arriving next door to somewhere you know opens exactly the one way between them');
 ok(now[0].from==='kamppi'||now[0].to==='kamppi','and it is that one');
 eq(progress(w).known,opened+1,'one new stop, one new walk');}
{const v=new Set(SEEDED);
 ok(knowsWay(v,'rautatientori','lasipalatsi'),'two stops you know join a way you know');
 ok(!knowsWay(v,'lasipalatsi','ooppera'),'one you know and one you do not is not a way you know');
 ok(!knowsWay(v,'arabia','sornainen'),'and two you do not is certainly not');}
{const v=new Set(SEEDED);
 eq(visit(v,'arabia'),true,'going somewhere new is news');
 eq(visit(v,'arabia'),false,'going there again is not');
 eq(visit(v,null),false,'and nowhere is not a place');}
{const v=loadVisited(undefined);eq(v.size,SEEDED.length,'no storage means you have been to the seeds only');
 const bad={getItem(){throw new Error('x')},setItem(){throw new Error('x')}};
 eq(loadVisited(bad).size,SEEDED.length,'a storage that throws is the same as none');saveVisited(new Set(['x']),bad);n++;}
{let held=null;const store={getItem:()=>held,setItem:(k,val)=>{held=val;}};
 const v=loadVisited(store);visit(v,'arabia');saveVisited(v,store);
 ok(JSON.parse(held).every(x=>!SEEDED.includes(x)),'the seeds are not written out — they are always known');
 ok(loadVisited(store).has('arabia'),'and where you went comes back next shift');}
{const v=new Set(SEEDED),before=progress(v).known,t=teach(v,3);
 ok(t&&!SEEDED.includes(t),'the tourist shows you somewhere you have not been');
 ok(v.has(t),'you have been shown it');
 ok(progress(v).known>before,'and it opens at least one way you could not walk before');
 {let bad=0;for(let seed=0;seed<40;seed++){const w=new Set(SEEDED),id=teach(w,seed);
   if(id&&!ALL.some(l=>(l.from===id&&SEEDED.includes(l.to))||(l.to===id&&SEEDED.includes(l.from))))bad++;}
  eq(bad,0,'they never show you somewhere that joins nothing you know — over forty seeds');}
 const a=new Set(SEEDED),b=new Set(SEEDED);eq(teach(a,7),teach(b,7),'the same seed shows the same place');
 const full=new Set([...ALL.map(l=>l.from),...ALL.map(l=>l.to)]);
 eq(teach(full,3),null,'once you have been everywhere there is nothing left to be shown');}
{const p=progress(new Set(SEEDED));eq(p.total,ALL.length,'progress counts every walk, not every street');
 ok(streetsAt('hietalahti').length>=2,'a stop still knows which streets meet on it');
 eq(streetsAt('nowhere').length,0,'and somewhere that is not a stop is on none');}

// ── the rival ────────────────────────────────────────────────────────────
const HUBS=['rautatientori','lasipalatsi','kamppi','hakaniemi','sornainen','ooppera'];
const makeTm=()=>{const clock={tick:0,ticksPerDay:3000};
 const resolved={};HUBS.forEach((h,i)=>resolved[h]={lat:60+i*0.01,lon:24+i*0.01});
 return {flow:{clock},transferHubs:HUBS,city:{resolved},
  challenge:{offers:[],active:null,index:0,target:3,name:x=>x,say(){},step:null}};};

{const tm=makeTm(),r=new Rival(tm,7);
 ok(HUBS.includes(r.at)&&HUBS.includes(r.to)&&r.at!==r.to,'the rival starts somewhere real and is going somewhere else');
 const p0=r.position();ok(p0&&p0.t===0,'at the start of a leg they are at the first stop');
 tm.flow.clock.tick=r.legTicks/2;const ph=r.position();
 ok(ph.t>0.4&&ph.t<0.6,'halfway through they are halfway along it');
 ok(ph.lat!==p0.lat||ph.lon!==p0.lon,'and have actually moved');
 tm.flow.clock.tick=r.legTicks;r.step();
 eq(r.delivered,1,'finishing a leg is a delivery');
 ok(r.at!==HUBS.indexOf(r.to),'and they set off again');
 const a=new Rival(makeTm(),7),b=new Rival(makeTm(),7),c=new Rival(makeTm(),8);
 eq(a.at,b.at,'the same seed is the same rival');ok(a.at!==c.at||a.to!==c.to,'a different seed is a different one');}

// The claim: what it may and may not take.
{const tm=makeTm(),r=new Rival(tm,7);const ch=tm.challenge;
 const offer=(id,to,extra={})=>({id,stops:['kamppi',to],value:100,...extra});
 ch.offers=[offer('a','pasila'),offer('b','arabia'),offer('c','eira')];
 r.step();ok(r.claim,'with a board to read, the rival picks one');
 ok(ch.offers.some(o=>o.id===r.claim.id),'and it is one that is really on it');
 eq(r.pressure(r.claim.id),GRACE+CLAIM_WINDOW,'the pressure is the time left');
 eq(r.pressure('nope'),null,'and only on the one they want');
 tm.flow.clock.tick=GRACE+CLAIM_WINDOW-1;r.step();eq(ch.offers.length,3,'a moment before, the job is still yours to take');
 tm.flow.clock.tick=GRACE+CLAIM_WINDOW;r.step();
 eq(ch.offers.length,2,'and then they take it');
 eq(r.taken.length,1,'it is remembered for the end screen');
 ok(!ch.offers.some(o=>o.id==='a'||o.id==='b'||o.id==='c'?false:true),'nothing else is disturbed');}
{const tm=makeTm(),r=new Rival(tm,7),ch=tm.challenge;
 ch.offers=[{id:'h',stops:['kamppi','pasila'],value:100,handoff:true}];
 r.step();tm.flow.clock.tick=9999;r.step();
 eq(ch.offers.length,1,'a hand-off is never taken — it was put in your hand');}
{const tm=makeTm(),r=new Rival(tm,7),ch=tm.challenge;
 ch.index=ch.target-1;ch.offers=[{id:'a',stops:['kamppi','pasila'],value:100}];
 r.step();tm.flow.clock.tick=9999;r.step();
 eq(ch.offers.length,1,'and the last job of the shift is never taken');}
{const tm=makeTm(),r=new Rival(tm,7),ch=tm.challenge;
 ch.active={};ch.offers=[{id:'a',stops:['kamppi','pasila'],value:100}];
 r.step();eq(r.claim,null,'while you are carrying one, nothing is contested');}
{const tm=makeTm(),r=new Rival(tm,7),ch=tm.challenge;
 ch.offers=[{id:'a',stops:['kamppi','pasila'],value:100}];r.step();
 const first=r.claim.id;ch.offers=[{id:'z',stops:['kamppi','eira'],value:100}];r.step();
 ok(r.claim&&r.claim.id!==first,'a claim on an offer that is gone is dropped and remade');}
// The rival keeps working through a whole shift without wandering off the map.
{const tm=makeTm(),r=new Rival(tm,7);
 for(let t=0;t<3000;t++){tm.flow.clock.tick=t;r.step();
  const p=r.position();if(!p){assert.fail(`lost the rival at tick ${t}`);}}
 ok(r.delivered>=8,`over a shift they do a day's work (${r.delivered} legs)`);n++;
 ok(HUBS.includes(r.at),'and are still somewhere real at the end of it');}

console.log(`city: ${n} checks passed`);
