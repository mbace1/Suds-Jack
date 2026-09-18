// THE THREE THINGS THAT SHARE ONE CURRENCY — streak, hand-off, regulars — in
// bare node, against a fake flow. The engine's rules are arithmetic and a
// browser is not needed to check arithmetic; what a browser is needed for is
// whether you can SEE them, and that is phone.cjs's job.
import assert from 'node:assert';
import {DeliveryChallenge,HANDOFF_WINDOW,HANDOFF_BONUS} from '../js/deliveries.js';
import {CARGO} from '../js/deliveries.js';
const CARGO_KEYS=Object.keys(CARGO);
import {REGULARS,MAX_STANDING,regularAt,standingOf,bumpStanding,tipFor,loadStanding,saveStanding,standingPips} from '../js/regulars.js';
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const eq=(a,b,m)=>{assert.strictEqual(a,b,`${m} (got ${a}, wanted ${b})`);n++;};

// ── the people ───────────────────────────────────────────────────────────
ok(REGULARS.length===6,'six regulars');
ok(new Set(REGULARS.map(r=>r.at)).size===6,'each stands at a different stop');
ok(REGULARS.every(r=>r.name&&r.what&&r.line),'each has a name, a trade and a line');
ok(REGULARS.every(r=>regularAt(r.at)===r),'and is found by their stop');
ok(regularAt('kamppi')===null,'a stop with nobody on it has nobody on it');
// Standing storage must survive having no storage at all.
ok(typeof loadStanding(undefined)==='object','no localStorage is an empty memory, not a crash');
{const bad={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}};ok(typeof loadStanding(bad)==='object','a storage that throws is an empty memory');saveStanding({a:1},bad);n++;}
{const s={};eq(bumpStanding(s,'flor',false),1,'an on-time delivery raises standing');
 for(let i=0;i<9;i++)bumpStanding(s,'flor',false);eq(standingOf(s,'flor'),MAX_STANDING,'standing caps');
 eq(bumpStanding(s,'flor',true),MAX_STANDING-1,'a late one costs a step');
 const t={};eq(bumpStanding(t,'lab',true),0,'and it never goes below a stranger');}
eq(tipFor(200,0),0,'a stranger tips nothing');
eq(tipFor(200,MAX_STANDING),120,'the cap is 60% of the job');
eq(tipFor(200,0,6),tipFor(200,3),'goodwill counts as standing with everybody (2 goodwill = 1 step)');
eq(tipFor(200,4,20),tipFor(200,MAX_STANDING),'goodwill cannot outrun the cap');
// v2.43: a standing is PIPS, not a phrase — the owner's "recipients names
// aren't needed" applies to the sentence about them as much as to the name.
ok([0,1,2,3,4,5].every(n=>standingPips(n).filled===n),'every standing draws its own number of pips');
ok(standingPips(0).total===MAX_STANDING,'against the full row');

// ── a challenge on a fake network ────────────────────────────────────────
const NODES=['lasipalatsi','ooppera','hakaniemi','meilahti','arabia','kauppatori','lansiterminaali','rautatientori','kamppi','pasila'];
const makeCh=()=>{const clock={tick:0,ticksPerDay:3000};
 const flow={clock,graph:{node:id=>NODES.includes(id)?{id,name:id,x:NODES.indexOf(id)*10,y:0}:null},routes:{list:[]}};
 const ch=new DeliveryChallenge(flow,()=>{});ch.estimate=()=>200;ch.standing={};return ch;};

// ── the streak ───────────────────────────────────────────────────────────
{const ch=makeCh();const job=v=>({stops:['kamppi','pasila'],cargo:'parts',limit:1000,value:v});
 eq(ch.streakMult(),1,'no streak is no multiplier');
 const a=ch.earn(job(100),10);eq(a.earned,100,'the delivery that STARTS a chain pays flat');
 eq(ch.streak,1,'and the chain is one long');
 eq(ch.earn(job(100),10).earned,125,'the second is ×1.25');
 eq(ch.earn(job(100),10).earned,150,'the third ×1.5');
 eq(ch.earn(job(100),10).earned,175,'the fourth ×1.75');
 eq(ch.earn(job(100),10).earned,200,'the fifth ×2');
 eq(ch.earn(job(100),10).earned,200,'and it caps there');
 eq(ch.bestStreak,6,'the best is remembered');
 const late=ch.earn(job(100),5000);ok(late.late&&ch.streak===0,'ONE late parcel takes all of it');
 eq(ch.earn(job(100),10).earned,100,'and you start again at flat');
 eq(ch.bestStreak,6,'the best survives the break');}

// A drop counts: it is a delivery.
{const ch=makeCh();ch.active={stops:['kamppi','pasila'],cargo:'parts',limit:1000,value:100,label:'x'};ch.startedAt=0;
 ch.along=[{stops:['kamppi','ooppera'],name:'Ooppera',cargo:'parts',limit:1000,value:100,acceptedAt:0}];
 ch.deliverAlong('ooppera');eq(ch.streak,1,'a drop on the way is a delivery and starts the chain');
 eq(ch.drops,1,'and is counted as a drop');}

// ── the regular at the far end ───────────────────────────────────────────
{const ch=makeCh();const to=REGULARS[0].at,job={stops:['kamppi',to],cargo:'parts',limit:1000,value:200};
 const first=ch.earn(job,10);
 eq(first.tip,0,'the first delivery to a stranger tips nothing');
 ok(first.regular&&first.regular.id===REGULARS[0].id,'but names who took it');
 eq(standingOf(ch.standing,REGULARS[0].id),1,'and moves your standing for next time');
 ch.streak=0;const second=ch.earn(job,10);
 eq(second.tip,tipFor(200,1),'the NEXT one is paid on the standing you arrived with');
 ch.streak=0;ch.goodwill=4;const third=ch.earn(job,10);
 eq(third.tip,tipFor(200,2,4),'and goodwill from the event deck is spent here');
 const before=standingOf(ch.standing,REGULARS[0].id);
 ch.streak=0;const bad=ch.earn(job,5000);
 eq(bad.tip,0,'a late parcel earns no tip');
 eq(standingOf(ch.standing,REGULARS[0].id),before-1,'and costs you a step with them');}

// ── the hand-off ─────────────────────────────────────────────────────────
{const ch=makeCh();ch.flow.clock.tick=100;
 ch.buildHandoff('ooppera',regularAt('ooppera'));
 const h=ch.pendingHandoff;
 ok(h&&h.handoff,'delivering ON TIME to a regular builds a hand-off');
 eq(h.stops[0],'ooppera','it leaves from where you are standing');
 ok(h.stops[1]!=='ooppera','and goes somewhere else');
 ok(!/Riikka/.test(h.from)&&/regular/.test(h.from),'a hand-off names no one — the door is who hands it to you');
 eq(h.bonusUntil,100+HANDOFF_WINDOW,'the door price has a window');
 ok(ch.handoffLive(),'which is open now');
 ch.flow.clock.tick=100+HANDOFF_WINDOW+1;ok(!ch.handoffLive(),'and shut later');
 // listed first
 ch.flow.clock.tick=100;ch.location='ooppera';ch.index=0;ch.refreshOffers();
 eq(ch.offers[0].id,h.id,'a live hand-off is the first thing on the board');
 ok(ch.offers.length<=3,'and does not make the board longer');
 // taking it in the window bakes the bonus in
 const base=h.value,r=ch.acceptOffer(h.id);
 ok(!r.error,'it can be taken');
 eq(ch.active.value,Math.round(base*(1+HANDOFF_BONUS)),'taken at the door it pays the bonus');
 eq(ch.pendingHandoff,null,'and is spent');
 // let it lapse: ordinary price
 const ch2=makeCh();ch2.flow.clock.tick=0;ch2.buildHandoff('ooppera',regularAt('ooppera'));
 const h2=ch2.pendingHandoff,base2=h2.value;ch2.flow.clock.tick=HANDOFF_WINDOW+50;
 ch2.location='ooppera';ch2.refreshOffers();ch2.acceptOffer(h2.id);
 eq(ch2.active.value,base2,'let it lapse and it is an ordinary job at an ordinary price');
 {const c=makeCh();let found=null;for(let i=0;i<20&&!found;i++){c.index=i%3;c.buildHandoff(NODES[i%NODES.length],null,false);if(c.pendingHandoff&&!regularAt(c.pendingHandoff.stops[0]))found=c.pendingHandoff;}ok(found&&found.from==='the door','a stop with no regular can still hand you one');}
 // a hand-off from somewhere you no longer stand is not offered
 const ch3=makeCh();ch3.buildHandoff('ooppera',regularAt('ooppera'));ch3.location='kamppi';ch3.refreshOffers();
 ok(!ch3.offers.some(o=>o.handoff),'and only where it was handed over');
 // never past the end of the shift
 const ch4=makeCh();ch4.index=ch4.target;ch4.buildHandoff('ooppera',regularAt('ooppera'));
 eq(ch4.pendingHandoff,null,'the last delivery of the shift hands you nothing');
 // and never off a LATE one — it is earned
 const ch5=makeCh();ch5.buildHandoff('ooppera',regularAt('ooppera'),true);
 eq(ch5.pendingHandoff,null,'a late parcel earns no hand-off');
 // a regular ALWAYS has one; an ordinary door only sometimes
 ok(REGULARS.every(rg=>{const c=makeCh();c.buildHandoff(rg.at,rg,false);return !!c.pendingHandoff;}),'a regular always has one for you — that is what standing buys');
 {let some=0,none=0;for(let i=0;i<20;i++){const c=makeCh();c.index=i%3;c.buildHandoff(NODES[i%NODES.length],null,false);c.pendingHandoff?some++:none++;}
  ok(some>0&&none>0,`an ordinary door is a maybe (${some} handed one over, ${none} did not, of 20)`);}}

// ── THE SIGNED-SHIFT TRAP, which cost a hand-off that was never built ────
// The hash is `>>> 0`, so half of all seeds have the top bit set and a SIGNED
// `>>` off one is negative — `array[-1234]` is undefined, silently. Two of the
// three shift sites were picking cargo that way and had been falling back to
// `documents` for half of all drops since v2.36; the third returned no
// hand-off at all. Nothing but variety can see it, so variety is the check.
{const cargos=new Set(),tos=new Set();
 for(let i=0;i<40;i++){const ch=makeCh();ch.index=i%3;ch.flow.clock.tick=i*40;
  ch.buildHandoff(NODES[i%NODES.length],REGULARS[i%REGULARS.length],false);
  if(ch.pendingHandoff){cargos.add(ch.pendingHandoff.cargo);tos.add(ch.pendingHandoff.stops[1]);}}
 ok(cargos.size>=4,`a hand-off's cargo varies with the seed (${cargos.size} kinds over 40 doors)`);
 ok([...cargos].every(c=>CARGO_KEYS.includes(c)),`and every hand-off carries something real (${[...cargos].filter(c=>!CARGO_KEYS.includes(c)).join(',')||'all named'})`);
 ok(tos.size>=5,`and so does where it goes (${tos.size} destinations)`);}
{const ch=makeCh();ch.active={stops:['kamppi','pasila'],cargo:'parts',limit:1000,value:100,label:'x'};ch.waitingForCatch=true;
 const cargos=new Set();
 for(let i=0;i<40;i++){ch.index=i%3;ch.along=[];
  const offers=ch.alongOffers([{line:{label:`L${i}`},from:'kamppi',to:'pasila',
    between:[{id:`s${i}a`,name:'A',lat:60,lon:24},{id:`s${i}b`,name:'B',lat:60.1,lon:24.1},{id:`s${i}c`,name:'C',lat:60.2,lon:24.2}]}]);
  for(const o of offers)cargos.add(o.cargo);}
 ok(cargos.size>=4,`a drop's cargo varies with the seed (${cargos.size} kinds over 40 legs)`);}
{const ch=makeCh();ch.active={stops:['kamppi','pasila'],cargo:'parts',limit:1000,value:100,label:'x'};ch.waitingForCatch=true;
 const tally={};let total=0;
 for(let i=0;i<120;i++){ch.index=i%3;ch.along=[];
  for(const o of ch.alongOffers([{line:{label:`L${i}`},from:'kamppi',to:'pasila',
    between:[{id:`s${i}a`,name:'A',lat:60,lon:24},{id:`s${i}b`,name:'B',lat:60.1,lon:24.1},{id:`s${i}c`,name:'C',lat:60.2,lon:24.2}]}])){tally[o.cargo]=(tally[o.cargo]||0)+1;total++;}}
 const worst=Math.max(...Object.values(tally)),share=worst/total;
 ok(share<0.4,`no single cargo takes over the deck — worst share ${(share*100).toFixed(0)}% of ${total} drops`);
 const bad=Object.keys(tally).filter(k=>!CARGO_KEYS.includes(k));
 ok(bad.length===0,`every drop carries something real — ${bad.length?`${tally[bad[0]]} of ${total} carried "${bad[0]}"`:'all '+total+' named a cargo'} (a signed shift indexes off the front of the table and yields undefined)`);}

console.log(`regulars: ${n} checks passed`);
