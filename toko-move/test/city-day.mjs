// THE CITY-DAY GATE (v2.42). Bare node, no browser.
//
// The question this gate exists to ask is v2.40's, and it is the only question
// worth asking of a modifier: IS IT INERT? Local knowledge shipped a rule that
// read beautifully and changed nothing, because the thing it filtered was never
// offered in the first place. Three of the four days here name something real —
// a stop called Hakaniemi, families called 4 and 10, a headway in minutes — and
// every one of those names is checked against the SHIPPED PACK rather than
// against a constant in the same file, because a market at a stop that does not
// exist is exactly the same bug wearing a nicer hat.
import assert from 'node:assert';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CITY_EVENTS,DAYS,drawCityEvent,headwayFor,walkFactor,encounterCount,goodwillFactor,marketOf,family,CityDay} from '../js/city-events.js';
import {drawSchedule,BUDGET,ENCOUNTERS} from '../js/events.js';
import {TransitLayers} from '../js/transit-layers.js';
import {LiveNetwork,HEADWAY_MIN,SHIFT} from '../js/live-network.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const pack=JSON.parse(fs.readFileSync(path.join(here,'../cities/helsinki.json'),'utf8'));
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const eq=(a,b,m)=>{assert.strictEqual(a,b,m);n++;};

// ── the deck itself ───────────────────────────────────────────────────────
eq(CITY_EVENTS.length,4,'four days');
for(const d of CITY_EVENTS){
  ok(d.id&&d.name&&d.glyph&&d.blurb,`${d.id} has a name, a face and a sentence`);
  ok(d.blurb.length>30&&/[.!]$/.test(d.blurb),`${d.id} says what it does in a whole sentence`);
  const levers=['crowds','market','crowd','quiet'].filter(k=>d[k]);
  eq(levers.length,1,`${d.id} rides exactly one lever (${levers.join(',')||'none'})`);
}
eq(new Set(CITY_EVENTS.map(d=>d.id)).size,4,'no two days share an id');
eq(new Set(CITY_EVENTS.map(d=>d.glyph)).size,4,'no two days share a face');

// ── drawn, never rolled ───────────────────────────────────────────────────
eq(drawCityEvent(4821).id,drawCityEvent(4821).id,'the same shift number draws the same day');
{const seen=new Set();for(let s=1;s<=400;s++)seen.add(drawCityEvent(s).id);
 eq(seen.size,4,'every day is reachable across 400 shifts');}
{const counts={};for(let s=1;s<=4000;s++){const id=drawCityEvent(s).id;counts[id]=(counts[id]||0)+1;}
 for(const d of CITY_EVENTS)ok(counts[d.id]>700&&counts[d.id]<1300,`${d.id} comes up about a quarter of the time (${counts[d.id]}/4000)`);}
eq(drawCityEvent(1,'none'),null,'?day=none is an ordinary day — the control column the harness needs');
eq(drawCityEvent(1,'quiet').id,'quiet','?day=<id> pins a day');
eq(drawCityEvent(1,'nonsense').id,drawCityEvent(1).id,'an unknown pin falls back to the drawn day rather than to nothing');

// ── an ordinary day changes NOTHING, which is what makes it a control ─────
eq(headwayFor(null,HEADWAY_MIN),HEADWAY_MIN,'an ordinary day leaves the timetable alone');
eq(walkFactor(null),1,'an ordinary day leaves walking alone');
eq(goodwillFactor(null),1,'an ordinary day leaves goodwill alone');
eq(marketOf(null),null,'an ordinary day has no market');
eq(encounterCount(null,3),3,'an ordinary day keeps the deck budget');
for(const d of CITY_EVENTS){
  if(!d.quiet){eq(headwayFor(d,HEADWAY_MIN),HEADWAY_MIN,`${d.id} does not touch the timetable`);eq(walkFactor(d),1,`${d.id} does not touch walking`);}
  if(!d.crowd){eq(encounterCount(d,3),3,`${d.id} does not touch the deck`);eq(goodwillFactor(d),1,`${d.id} does not touch goodwill`);}
  if(!d.market)eq(marketOf(d),null,`${d.id} has no market`);
}

// ── MARKET MORNING names a stop the pack actually has ────────────────────
{const mk=marketOf(DAYS.market);ok(mk&&mk.name,'the market has a named stop');
 const stops=(pack.stops||[]).filter(s=>s.name===mk.name);
 ok(stops.length>0,`the pack has a stop called ${mk.name} (${stops.length} platforms) — a market nobody passes is inert`);
 const lines=(pack.lines||[]).filter(l=>(l.stops||[]).some(id=>stops.some(s=>s.id===id)));
 ok(lines.length>=3,`at least three services call there (${lines.length}) — a cluster of drops needs routes through it`);
 ok(mk.bonus>0.2&&mk.bonus<1.5,`the premium is worth going for and is not a jackpot (+${Math.round(mk.bonus*100)}%)`);}

// ── MATCH DAY names families the pack actually runs ──────────────────────
{const day=DAYS.match,layers=new TransitLayers(pack).layers;
 for(const f of day.crowds.families){
   const hit=layers.filter(l=>family(l.name)===f);
   ok(hit.length>0,`family ${f} is really on the board (${hit.map(l=>l.name).join(' ')})`);}
 ok(day.crowds.families.length<layers.length/4,'a crowd is some of the network, never most of it');
 eq(family('10B'),'10','a branch belongs to its family');
 eq(family('10H'),'10','and so does a night branch');
 eq(family('M1B'),'M1','a metro branch keeps its M');
 eq(family('H'),'H','a lettered service is its own family');
 // The cost it can impose, as a fraction of the shift. The bound is MEASURED
 // rather than judged by eye: a three-point ladder through the shift bot at 80
 // bots a cell, against an ordinary-day control of 83.8%, reads 45 ticks →
 // 82.5% (inert, the crowded families lose 1.6 points of share), 80 → 73.8%
 // (−2.9 share), 110 → 66.3% (−7.0 share). 80 ships: felt, routed around, and
 // a long way above the 40% floor the shift gate holds. A third of the morning
 // is the ceiling this check defends — past it the ladder runs into that floor.
 const holds=Math.floor(SHIFT.ticksPerDay/day.crowds.everyTicks),lost=holds*day.crowds.holdTicks;
 ok(lost/SHIFT.ticksPerDay<0.30,`a crowded family loses under a third of the morning (${lost}/${SHIFT.ticksPerDay} ticks over ${holds} holds)`);
 ok(lost/SHIFT.ticksPerDay>0.15,`and enough of it to be felt — at 45 ticks a hold this day measured as doing nothing at all`);
 ok(holds>=6,`and it happens often enough to be a shape rather than an incident (${holds} times)`);}

// ── QUIET SUNDAY really takes trams off the board ────────────────────────
{const transit=new TransitLayers(pack),day=DAYS.quiet;
 const normal=new LiveNetwork(transit,{headwayMinutes:HEADWAY_MIN,ticksPerDay:SHIFT.ticksPerDay});
 const quiet=new LiveNetwork(transit,{headwayMinutes:headwayFor(day,HEADWAY_MIN),ticksPerDay:SHIFT.ticksPerDay});
 ok(quiet.vehicles.length<normal.vehicles.length,`a Sunday runs fewer trams (${quiet.vehicles.length} against ${normal.vehicles.length})`);
 ok(quiet.vehicles.length>normal.vehicles.length*0.5,'but it is a timetable, not a strike');
 for(const layer of transit.layers.slice(0,6))ok(quiet.countFor(layer)>=1,`${layer.name} still runs on a Sunday`);
 ok(walkFactor(day)<1,`and walking is quicker (×${walkFactor(day)})`);
 ok(walkFactor(day)>0.5,'walking is quicker, not teleportation');}

// ── HELSINKI DAY really deals more cards ─────────────────────────────────
{const day=DAYS.helsinki,lines=['4','10'];
 const ordinary=drawSchedule(7,SHIFT.ticksPerDay,lines).filter(e=>e.kind==='encounter');
 const busy=drawSchedule(7,SHIFT.ticksPerDay,lines,encounterCount(day,BUDGET.encounters)).filter(e=>e.kind==='encounter');
 eq(ordinary.length,BUDGET.encounters,'an ordinary day deals the budget');
 eq(busy.length,day.crowd.encounters,`Helsinki Day deals ${day.crowd.encounters}`);
 eq(new Set(busy.map(e=>e.card.id)).size,busy.length,'and never the same card twice');
 ok(busy.length<=ENCOUNTERS.length,'it cannot deal more cards than the deck holds');
 eq(JSON.stringify(ordinary.map(e=>e.card.id)),JSON.stringify(busy.slice(0,ordinary.length).map(e=>e.card.id)),
   'the extra cards are added to the ordinary draw, not a different draw — so the same seed is still the same shift');
 ok(goodwillFactor(day)>1,`helping is worth more (×${goodwillFactor(day)})`);}

// ── the crowding, driven ─────────────────────────────────────────────────
{const transit=new TransitLayers(pack);
 const mk=(day)=>{const tm={transit,flow:{clock:{tick:0,ticksPerDay:SHIFT.ticksPerDay}},liveNetwork:{holds:[],hold(l,f,u){this.holds.push({layerId:l.id,from:f,until:u});}}};
   return {tm,dir:new CityDay(tm,day)};};
 {const {tm,dir}=mk(null);for(let t=0;t<SHIFT.ticksPerDay;t++){tm.flow.clock.tick=t;dir.step();}
  eq(tm.liveNetwork.holds.length,0,'an ordinary day never holds a tram');
  eq(dir.crowdedNow(),false,'and never says it is crowded');}
 {const day=DAYS.match,{tm,dir}=mk(day);const fired=[];
  for(let t=0;t<SHIFT.ticksPerDay;t++){tm.flow.clock.tick=t;if(dir.step())fired.push(t);}
  ok(fired.length>=6,`match day crowds the board through the morning (${fired.length} times)`);
  const gaps=fired.slice(1).map((t,i)=>t-fired[i]);
  ok(gaps.every(g=>g===day.crowds.everyTicks),'on its own cadence, not whenever it is asked');
  const perTick=tm.liveNetwork.holds.length/fired.length;
  eq(perTick,dir.layers().length,'every layer in the family is held, not just the first');
  ok(dir.layers().length>=2,`and a family is more than one service (${dir.layers().map(l=>l.name).join(' ')})`);
  tm.flow.clock.tick=fired[0]+1;eq(dir.crowdedNow(),true,'the strip says crowded while a hold is on');
  tm.flow.clock.tick=fired[0]+day.crowds.holdTicks+1;eq(dir.crowdedNow(),false,'and stops saying it when the hold lifts');}
 {const {tm,dir}=mk(DAYS.market);for(let t=0;t<600;t++){tm.flow.clock.tick=t;dir.step();}
  eq(tm.liveNetwork.holds.length,0,'a market morning holds nothing — it is a day about jobs');}}

console.log(`city day: ${n} checks passed`);
