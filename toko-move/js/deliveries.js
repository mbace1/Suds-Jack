// Toko Move v2.12.2 — courier dispatch + two-job carry + physical-vehicle scoring.
// A SHIFT is six jobs, not ten. Measured with test/report.cjs: a job's journey
// runs 50-230 ticks and a shift is 600, so ten of them needed roughly 2.5x the
// day available and the back half could not be reached however often the trams
// ran. Tightening headway took completions from 0 to 3 and could go no further,
// because this is not a headway problem — it is a shift that was longer on
// paper than in hours. Six is what fits with room to make a wrong catch and
// still recover. The authored campaign is still ten jobs (a chain, each
// starting where the last ended); a shift plays the first six of it.
// How much of a trip you may waste before it is late. 1.35 leaves room for one
// bad catch on a typical job and none for two.
export const DEADLINE_GRACE=1.35;
// Measured, not chosen: the median door-to-door plan costs 856 ticks at the
// v2.29 clock and the shift is 3000, so three jobs fit with room to make a
// mistake in. It was 6 against a shift that only ever held 5.
export const DELIVERY_TARGET=3;
// How long the door price lasts, and what it is worth. 150 ticks is fifteen
// seconds at ×1 — long enough to read the row, short enough to be a decision.
export const HANDOFF_WINDOW=150;
export const HANDOFF_BONUS=0.25;
export const CARGO={documents:{icon:'DOC',rule:'Flexible routing',modes:null},'hot food':{icon:'HOT',rule:'Freshness falls fast',modes:null,freshness:.60},parts:{icon:'PRT',rule:'No special restriction',modes:null},fragile:{icon:'FRG',rule:'Tram only — avoid transfers',modes:['tram'],fragile:true},equipment:{icon:'HVY',rule:'Transit only; no walking shortcut',modes:['tram','metro'],heavy:true},express:{icon:'EXP',rule:'Priority courier — metro or tram',modes:['metro','tram'],express:true},'fresh food':{icon:'FRESH',rule:'Freshness bonus for speed',modes:null,freshness:.70},'market goods':{icon:'MRKT',rule:'Tram network only',modes:['tram'],heavy:true}};
export const JOBS=[
 {stops:['lasipalatsi','rautatientori'],label:'Press proofs to Central',cargo:'documents',limit:125,value:100},
 {stops:['rautatientori','hietalahti'],label:'Hot lunch to Hietalahti',cargo:'hot food',limit:155,value:140},
 {stops:['hietalahti','lansiterminaali'],label:'Dock parts to West Harbour',cargo:'parts',limit:155,value:130},
 {stops:['lansiterminaali','toolontori'],label:'Fragile parcel to Töölö',cargo:'fragile',limit:250,value:190},
 {stops:['toolontori','meilahti'],label:'Medical equipment to Meilahti',cargo:'equipment',limit:220,value:210},
 {stops:['meilahti','messukeskus'],label:'Expo courier to Messukeskus',cargo:'express',limit:225,value:230},
 {stops:['messukeskus','arabia'],label:'Fresh food to Arabia',cargo:'fresh food',limit:260,value:220},
 {stops:['arabia','kalasatama'],label:'Express run to Kalasatama',cargo:'express',limit:205,value:200},
 {stops:['kalasatama','olympiaterminaali'],label:'Harbour manifest south',cargo:'documents',limit:320,value:270},
 {stops:['olympiaterminaali','rautatientori'],label:'Final market run to Central',cargo:'market goods',limit:360,value:320}
];
import {regularAt,standingOf,bumpStanding,loadStanding,saveStanding,tipFor} from './regulars.js?v=2';
const sameNodes=(a,b)=>a.length===b.length&&a.every((n,i)=>n===b[i]);
const CARGO_KEYS=Object.keys(CARGO);
const DESTINATIONS=['rautatientori','hakaniemi','sornainen','kalasatama','pasila','toolontori','kamppi','kauppatori','katajanokka','lansiterminaali','hietalahti','meilahti','arabia','olympiaterminaali','eira','kapyla','messukeskus','lasipalatsi','ooppera','senaatintori'];
// The hash is UNSIGNED (`>>> 0`), so every shift off it must be `>>>` too:
// `>>` is signed, half of all seeds have the top bit set, and `array[-1234]`
// is undefined — which is silent. It cost a hand-off that was never built and,
// found with it, every drop whose cargo rolled over 2^31 had been quietly
// falling back to `documents` since v2.36.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export class DeliveryChallenge{
 constructor(flow,say){this.flow=flow;this.say=say;this.index=0;this.leg=0;this.active=null;this.queued=null;this.activeTrip=null;this.selectedPlan=null;this.waitingForCatch=false;this.seen=new Set;this.startedAt=0;this.score=0;this.late=0;this.bonuses=0;this.location='lasipalatsi';this.offers=[];this.along=[];this.drops=0;this.streak=0;this.bestStreak=0;this.goodwill=0;this.tips=0;this.standing=loadStanding();this.pendingHandoff=null;this.offerCycle=0;this.physicalSeq=0;}
 // The shift's ask. this.target is the default; a shift may carry its own
 // (a campaign city, or the survey bot asking how many a day really holds).
 get target(){return this.targetOverride??DELIVERY_TARGET;}
 cargoRule(){return CARGO[this.active?.cargo]||CARGO.documents;}
 start(){this.refreshOffers();}
 // WHAT A DEADLINE IS.
 //
 // It used to be a distance formula — 110 + dist*16, plus 25 unless the cargo
 // was hot. The report card could not see what that bought because `margin`
 // had never once been recorded correctly; once it was, the answer was 75%,
 // 58%, 42% and 14% of the deadline left over. A deadline with half of itself
 // spare is not a deadline, and `late` has been 0 in every run this game has
 // ever been measured on.
 //
 // So it is the trip's REAL cost plus a grace, when the live network is there
 // to be asked: `estimate` is injected by main-v212 the same way `reachable`
 // is, and returns door-to-door ticks from the same timetable the panels quote
 // at you. GRACE is what you may waste — one wrong catch, one missed
 // connection — before the parcel is late.
 //
 // Bare node installs no estimator and falls through to the old formula, which
 // is why the gates that predate this still see the behaviour they were
 // written against.
 deadlineFor({from,to,cargo,dist}){
  const scale=this.flow.clock.ticksPerDay/600;
  const est=this.estimate?.({stops:[from,to],cargo});
  if(Number.isFinite(est)&&est>0)return Math.round(est*DEADLINE_GRACE+30*scale);
  return Math.round((110+dist*16+(cargo==='hot food'||cargo==='express'?0:25))*scale);}
 refreshOffers(){if(this.index>=this.target){this.offers=[];return;}const from=this.location||'lasipalatsi',seed=hash(`${from}:${this.index}:${this.offerCycle++}`),pool=DESTINATIONS.filter(x=>x!==from&&this.flow.graph.node(x));const cands=[];for(let i=0;i<6&&pool.length;i++){const pick=(seed+i*7)%pool.length,to=pool.splice(pick,1)[0],cargo=CARGO_KEYS[(seed+i*3+this.index)%CARGO_KEYS.length],dist=Math.max(1,Math.round(Math.hypot((this.flow.graph.node(to)?.x||0)-(this.flow.graph.node(from)?.x||0),(this.flow.graph.node(to)?.y||0)-(this.flow.graph.node(from)?.y||0))/5)),limit=this.deadlineFor({from,to,cargo,dist}),value=90+dist*9+(cargo==='fragile'||cargo==='equipment'?35:0);cands.push({id:`offer:${this.index}:${i}:${to}`,stops:[from,to],label:`${this.name(from)} → ${this.name(to)}`,cargo,limit,value});}
  // Loop 47: a procedural job is constrained by a network relationship, never
  // rolled blind. Measured before this: the first offer taken had no compatible
  // vehicle for 1204 ticks — two minutes of wall time on the tutorial job —
  // while five lines were arriving at that very hub. So when a judge is
  // installed (main-v212 wires the live fleet in), at least one kept offer has
  // a catch inside the horizon, and on the first job that one is listed first
  // (Loop 43: the first delivery is almost impossible to fail).
  // SIZED TO THE SHIFT. Measured with test/shifts.cjs before this: the first
  // offer listed — the one Loop 47 promotes for having a tram within reach —
  // was Lasipalatsi → Arabia at ~1500 ticks, half the day for one delivery,
  // and a bot that took whatever was listed first finished 1/3 where a bot
  // that took the cheapest finished 3/3 at tick 2201. Reachable-soon is the
  // wrong question once the fleet runs to a timetable; the question is
  // whether the job FITS in the shift that is left. So each candidate is
  // priced door to door by the same estimator the deadline uses, anything
  // that cannot land before the day ends is dropped, and the three kept are a
  // SPREAD — cheapest, middle, dearest that fits — so the choice is short-and-
  // cheap against long-and-paid rather than three coin flips. The first job
  // keeps Loop 47's guarantee: the one listed first has a catch inside the
  // horizon, and is the cheapest such.
  const judge=this.reachable,est=o=>{const e=this.estimate?.(o);return Number.isFinite(e)&&e>0?e:null;};
  const remaining=this.flow.clock.ticksPerDay-this.flow.clock.tick;
  for(const o of cands)o.est=est(o);
  const priced=cands.filter(o=>o.est!=null).sort((a,b)=>a.est-b.est),unpriced=cands.filter(o=>o.est==null);
  let fits=priced.filter(o=>o.est<=remaining*0.9);
  if(!fits.length)fits=priced.slice(0,3);
  let kept=fits.length>=3?[fits[0],fits[fits.length>>1],fits[fits.length-1]]:fits.slice();
  for(const o of [...priced,...unpriced]){if(kept.length>=3)break;if(!kept.includes(o))kept.push(o);}
  kept=kept.filter((o,i)=>kept.indexOf(o)===i);
  if(typeof judge==='function'&&this.index===0){const soon=kept.filter(o=>judge(o));if(soon.length)kept=[soon[0],...kept.filter(o=>o!==soon[0])];}
  if(this.pendingHandoff&&this.pendingHandoff.stops[0]===from)kept=[this.pendingHandoff,...kept.filter(o=>!o.handoff)].slice(0,3);
  this.offers=kept;this.say(`DISPATCH · ${this.offers.length} jobs available at ${this.name(from)}.`);}
 canTakeSecond(){return Boolean(this.active&&!this.queued&&this.waitingForCatch&&!this.activeTrip&&this.leg===0&&this.currentFrom()===this.location);}
 canReorder(){return Boolean(this.active&&this.queued&&this.waitingForCatch&&!this.activeTrip&&this.leg===0&&this.currentFrom()===this.location);}
 acceptOffer(id){let job=this.offers.find(x=>x.id===id);if(!job)return{error:'job offer expired'};if(this.index>=this.target)return{error:'shift complete'};if(this.active){if(!this.canTakeSecond())return{error:'second job can only be collected before leaving this pickup hub'};this.queued={...job,originalStops:[...job.stops],acceptedAt:this.flow.clock.tick};this.offers=this.offers.filter(x=>x.id!==id);this.say(`CARRY 2 · ${CARGO[job.cargo]?.icon||'JOB'} · ${this.name(job.stops[1])} queued. Choose which destination to tackle first.`);return{job:this.queued,queued:true};}if(job.handoff){const live=this.flow.clock.tick<=job.bonusUntil;if(live){job={...job,value:Math.round(job.value*(1+job.bonus))};this.say(`STRAIGHT ON · +${Math.round(job.bonus*100)}% for taking it at the door.`);}this.pendingHandoff=null;}this.active={...job,originalStops:[...job.stops],acceptedAt:this.flow.clock.tick};this.offers=this.offers.filter(x=>x.id!==id);this.leg=0;this.startedAt=this.active.acceptedAt;this.launchLeg();const c=this.cargoRule();this.say(`${this.index+1}/${this.target} · ${c.icon} · ${this.routeLabel()} · ${c.rule}`);return{job:this.active};}
 swapJobs(){if(!this.canReorder())return{error:'job order can only change before departure'};const a=this.active,q=this.queued;this.active={...q,stops:[this.location,q.originalStops?.[1]||q.stops[1]]};this.queued={...a,stops:[this.location,a.originalStops?.[1]||a.stops[1]]};this.startedAt=this.active.acceptedAt;this.leg=0;this.launchLeg();this.say(`ORDER CHANGED · deliver ${this.name(this.active.stops[1])} first, then ${this.name(this.queued.stops[1])}.`);return{ok:true};}
 launchLeg(){this.activeTrip=null;this.selectedPlan=null;this.waitingForCatch=true;this.say(`WAITING · ${this.name(this.currentFrom())} → ${this.name(this.currentTo())} · choose a tram or metro to catch.`);}
 runtimeRoute(line){return this.flow.routes.list.find(r=>r.fixed&&r.mode===line.mode&&r.label===line.label&&sameNodes(r.nodes,line.nodes));}
 catchChoice(choice){if(!this.active||!this.waitingForCatch||this.activeTrip||!choice?.legs?.length)return{error:'not waiting for a service'};const c=this.cargoRule();if(c.modes&&choice.legs.some(l=>!c.modes.includes(l.line.mode)))return{error:`${this.active.cargo} cannot use that service`};const legs=[];for(const leg of choice.legs){const route=this.runtimeRoute(leg.line);if(!route)return{error:`${leg.line.label} is not running on the gameplay network`};const fromIdx=route.nodes.indexOf(leg.from),toIdx=route.nodes.indexOf(leg.to);if(fromIdx<0||toIdx<0||fromIdx===toIdx)return{error:'that service does not cover the selected leg'};legs.push({routeId:route.id,from:leg.from,to:leg.to,fromIdx,toIdx});}const from=this.currentFrom(),to=choice.legs[choice.legs.length-1].to,trip={id:`physical:${++this.physicalSeq}`,physical:true,legs,payload:{kind:'delivery',job:this.index,leg:this.leg,label:this.active.label,cargo:this.active.cargo},origin:from,dest:to};this.activeTrip=trip;this.selectedPlan=choice;this.waitingForCatch=false;this.say(`CATCH · ${choice.legs.map(l=>l.line.label).join(' → ')} · ${this.name(from)} → ${this.name(to)}`);return{trip};}
 // What a delivery pays, for any job — the main one or one dropped on the way.
 // THE STREAK, and it is the LAST multiplier — Balatro's shape, which this
 // engine already uses for nothing else: every bonus adds, then the chain
 // multiplies the lot. Consecutive on-time deliveries (a drop counts; it is a
 // delivery) pay ×1 ×1.25 ×1.5 ×1.75 ×2, capped, and ONE late parcel takes it
 // all. That asymmetry is the point: a streak is a thing you protect, and the
 // decision it creates is whether to take the fast job or the paying one when
 // the chain is at four.
 streakMult(){return 1+0.25*Math.max(0,Math.min(4,this.streak-1));}
 earn(job,elapsed,legs=1){const c=CARGO[job.cargo]||CARGO.documents,late=elapsed>job.limit;let earned=late?Math.round(job.value*.5):job.value,note=late?'LATE':'ON TIME';if(c.freshness){const freshLimit=Math.round(job.limit*c.freshness);if(elapsed<=freshLimit){const bonus=Math.round(job.value*.25);earned+=bonus;this.bonuses+=bonus;note='FRESH BONUS';}else if(!late){earned=Math.round(earned*.8);note='COOLED';}}if(c.fragile&&legs===1&&!late){earned+=35;this.bonuses+=35;note='FRAGILE SAFE';}if(c.express&&elapsed<=Math.round(job.limit*.7)){earned+=40;this.bonuses+=40;note='EXPRESS BONUS';}
  if(late)this.streak=0;else{this.streak++;this.bestStreak=Math.max(this.bestStreak,this.streak);}
  {const m=this.streakMult();if(m>1){const before=earned;earned=Math.round(earned*m);this.bonuses+=earned-before;note=`${note} ×${m}`;}}
  // The person at the far end. The tip is paid on the standing you ARRIVED
  // with — today's delivery is what moves it for next time — and goodwill
  // from the event deck counts as standing with everyone.
  let regular=null,tip=0;
  {const reg=regularAt(job.stops[1]);if(reg){const st=standingOf(this.standing,reg.id);tip=late?0:tipFor(job.value,st,this.goodwill);if(tip){earned+=tip;this.tips+=tip;}bumpStanding(this.standing,reg.id,late);saveStanding(this.standing);regular=reg;}}
  this.score+=earned;if(late)this.late++;return{earned,note,late,tip,regular};}
 // ON YOUR WAY — Paperboy's loop on a tram. The main job says where you are
 // going; these say what you could drop at the REAL stops you will pass
 // getting there (the HSL stop table, not the twenty-node game graph — between
 // two graph nodes a tram calls at three to eight stops nobody could deliver
 // to before). A drop is made from aboard while the vehicle stands at the
 // stop, so it costs no headway and no get-off: one ride serves two or three
 // jobs, and choosing a line is choosing what it passes. The caller (job-board,
 // which can see the layers) hands in candidates per boarding option —
 // [{line, from, to, between:[{id,name,lat,lon,pathIndex}]}] — and this picks
 // one per line by hash, from the middle of the leg, never rolled.
 alongOffers(cands){if(!this.active||!this.waitingForCatch||!Array.isArray(cands))return[];const out=[],seen=new Set;
  for(const c of cands){const between=(c.between||[]).filter(st=>st?.id&&!seen.has(st.id)&&!this.along.some(j=>j.stops[1]===st.id));if(!between.length)continue;
   const seed=hash(`${c.line?.label}:${c.from}:${c.to}:${this.index}`),lo=Math.floor(between.length*.2),hi=Math.max(lo+1,Math.ceil(between.length*.8)),pick=between[lo+seed%(hi-lo)];seen.add(pick.id);
   const cargo=CARGO_KEYS[(seed>>>3)%CARGO_KEYS.length],passed=Math.max(1,between.indexOf(pick)+1);
   out.push({id:`along:${this.index}:${c.line?.label}:${pick.id}`,stops:[c.from,pick.id],name:pick.name,lat:pick.lat,lon:pick.lon,label:`${this.name(c.from)} → ${pick.name}`,cargo,limit:this.active.limit,value:45+passed*12,line:c.line?.label,along:true});}
  return out.slice(0,2);}
 acceptAlong(offer){if(!offer?.along||!this.active||!this.waitingForCatch)return{error:'drops are taken before boarding'};if(this.along.length>=2)return{error:'two drops is a full bag'};if(this.along.some(j=>j.stops[1]===offer.stops[1]))return{error:'already carrying one for that stop'};const c=CARGO[offer.cargo]||CARGO.documents;if(c.modes&&!c.modes.includes(this.cargoRule().modes?.[0]||'TRAM')){/* cargo rule is per main job; drops ride whatever you ride */}
  this.along.push({...offer,acceptedAt:this.flow.clock.tick});this.say(`DROP ON THE WAY · ${CARGO[offer.cargo]?.icon||'JOB'} · ${offer.name||this.name(offer.stops[1])} · from aboard ${offer.line}`);return{job:offer};}
 // The vehicle is standing at `stopId`: anything in the bag for that stop is
 // handed over. Drops pay SCORE and count in their own tally; the shift's ask
 // stays the authored A→B jobs (owner's brief) — measured with the survey bot,
 // counting drops toward the target made a day hold ~12 deliveries of which
 // ten were drops, and the jobs became a chauffeur for a drop route.
 deliverAlong(stopId){if(!stopId||!this.along.length)return false;const drops=this.along.filter(j=>j.stops[1]===stopId);if(!drops.length)return false;this.along=this.along.filter(j=>j.stops[1]!==stopId);let any=false;
  for(const job of drops){const r=this.earn(job,this.flow.clock.tick-job.acceptedAt,1);this.drops++;any=true;this.say(`DROPPED · ${r.note} · +${r.earned} · ${job.name||this.name(stopId)}`);}
  return any;}
 completePhysical(meta={}){if(!this.active)return false;const elapsed=this.elapsed(),r=this.earn(this.active,elapsed,meta.legs?.length||1),earned=r.earned,note=r.note;this.location=this.currentTo();this.deliverAlong(this.location);this.say(`${note} · +${earned}${r.tip?` (+${r.tip} tip)`:''} · ${this.active.label}`);this.index++;this.buildHandoff(this.location,r.regular,r.late);this.leg=0;this.activeTrip=null;this.selectedPlan=null;this.waitingForCatch=false;if(this.queued&&this.index<this.target){const next=this.queued;this.queued=null;this.active={...next,stops:[this.location,next.originalStops?.[1]||next.stops[1]],label:`${this.name(this.location)} → ${this.name(next.originalStops?.[1]||next.stops[1])}`};this.startedAt=this.active.acceptedAt;this.launchLeg();this.say(`SECOND JOB · still carrying ${this.active.cargo}. Deliver to ${this.name(this.currentTo())}.`);return true;}this.active=null;if(this.index<this.target)this.refreshOffers();return true;}
 // THE HAND-OFF. The person you just delivered to has another one going out,
 // and it is in your hand before the dispatcher has heard about it. It is not
 // a new kind of job — it is an ordinary offer from where you already stand,
 // listed FIRST, with a bonus that expires: the whole idea is that the chain
 // beats going back to the board, which is the same reason Crazy Taxi's fares
 // chain. The window is real time, not a soft nudge; let it lapse and the job
 // is still there at its ordinary price.
 // A HAND-OFF IS EARNED, NOT AUTOMATIC. Offered at every door it took the
 // random bots from 62% to 87% — it removes the walk back to a hub and hands
 // you a job from where you stand, so dispatch stopped being a decision. So:
 // only after an ON-TIME delivery, and then at about half the doors — except
 // a REGULAR, who always has one for you, because that is what standing buys.
 buildHandoff(at,regular,late){if(this.index>=this.target||late){this.pendingHandoff=null;return;}
  if(!regular&&(hash(`door:${at}:${this.index}`)&1)===0){this.pendingHandoff=null;return;}
  const pool=DESTINATIONS.filter(x=>x!==at&&this.flow.graph.node(x)),seed=hash(`handoff:${at}:${this.index}`);
  const cands=[];for(let i=0;i<4&&pool.length;i++){const to=pool.splice((seed+i*11)%pool.length,1)[0];const est=this.estimate?.({stops:[at,to]});if(Number.isFinite(est)&&est>0)cands.push({to,est});}
  const remaining=this.flow.clock.ticksPerDay-this.flow.clock.tick,fits=cands.filter(c=>c.est<=remaining*0.9);
  // NOT the cheapest — whatever that person actually needs sent. Picking the
  // cheapest that fits made the hand-off strictly the best job on the board
  // every time, and the bots went 62% → 80% because the dispatch choice had
  // stopped being one. It is a job from HERE with a bonus for taking it now;
  // that convenience is the offer, and it should still sometimes be the wrong
  // job to take.
  const pick=fits.length?fits[(seed>>>7)%fits.length]:cands.sort((a,b)=>a.est-b.est)[0];if(!pick){this.pendingHandoff=null;return;}
  const cargo=CARGO_KEYS[(seed>>>5)%CARGO_KEYS.length],dist=Math.max(1,Math.round(pick.est/40));
  this.pendingHandoff={id:`handoff:${this.index}:${pick.to}`,stops:[at,pick.to],label:`${this.name(at)} → ${this.name(pick.to)}`,cargo,
   limit:this.deadlineFor({from:at,to:pick.to,cargo,dist}),value:90+dist*9,handoff:true,
   from:regular?`${regular.name}, ${regular.what}`:'the person at the door',
   bonus:HANDOFF_BONUS,bonusUntil:this.flow.clock.tick+HANDOFF_WINDOW};}
 handoffLive(){const h=this.pendingHandoff;return h&&this.flow.clock.tick<=h.bonusUntil?h:null;}
 step(){return false;}
 elapsed(){return this.active?this.flow.clock.tick-this.startedAt:0;}
 remaining(){return this.active?Math.max(0,this.active.limit-this.elapsed()):0;}
 routeLabel(){return this.active?this.active.stops.map(id=>this.name(id)).join(' → '):'';}
 currentFrom(){return this.active?.stops[this.leg];}
 currentTo(){return this.active?.stops[this.leg+1];}
 get complete(){return this.index>=this.target;}
 name(id){return this.flow.graph.node(id)?.name||id;}
}
