// Toko Move v2.12.2 — deterministic gameplay fleet on every exact HSL route layer.
// These are schedule-like gameplay vehicles, not HSL realtime positions.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

// HOW FAST A VEHICLE IS, and why it is derived rather than typed in.
//
// The shipped constants (tram .00048, metro .00072) made one end-to-end pass
// take 2083 and 1389 ticks. A shift is 600 ticks and covers 06:00-22:00, so a
// tick is 1.6 minutes and those passes were 55.6 and 37 HOURS of game time —
// about 67x too slow for the clock they run against. A stop saw roughly 0.3
// tram arrivals per shift while ten jobs each need a catch, so a shift could
// not be finished. Every gate passed anyway, because each waits for exactly one
// catch and none asks whether ten fit in a day.
//
// So speed is now stated as what it actually means — how long a service takes
// end to end — and converted through the clock. Change the minutes, not a
// decimal with no units on it.
// A shift is no longer a whole day. The owner's session is FIVE MINUTES for a
// delivery challenge, and flow-core's day is sixty seconds, so Toko Move asks
// createFlow for its own day: 3000 ticks at the shared 10 ticks a second, which
// is 07:00-10:00 of game time. A tram's 50-minute pass is then ~83 seconds of
// wall time — visible motion, not a blur.
// HOW FAST A VEHICLE IS, and why every line used to move at a different pace.
//
// Speed was one DURATION for every line: 50 minutes end to end for a tram,
// whatever that tram's line actually was. Helsinki's tram lines run from about
// 3 km to about 17 km, so the long ones covered five times the ground in the
// same time as the short ones. Measured across all 102 vehicles, the apparent
// speed on screen ran from a crawl to a median of 299 km/h with a 90th
// percentile of 494 — trams visibly rocketing past other trams on the same
// map. That variance is what "tram speeds are too fast" was looking at, and no
// single number could have fixed it, because half the fleet was already slow.
//
// So a vehicle now has a SPEED and its end-to-end time follows from how long
// its own line is, which is the way round reality works. The values are real
// average service speeds with stops included.
export const MODE_KMH = { TRAM: 16, SUBWAY: 30 };

// WHAT THE PLAYER SEES is then only the compression: how much game time the
// five-minute shift covers. Three hours was 36x. 1.25 hours is 15x, which puts
// every tram at 240 km/h on screen and the metro at 450 — at or below the
// SLOWEST-looking half of what shipped, with the 494 km/h tail gone entirely.
// A tram now takes about a minute to cross the 4 km ROUTE viewport: long
// enough to see it coming, decide, and board.
//
// It is paid for in deliveries, because a slower fleet makes every ride longer
// in ticks by the same factor. Measured over 56 random door-to-door plans, the
// median job costs 856 ticks against a 3000-tick shift, so DELIVERY_TARGET is
// three. The same measurement caught the shipped setting being wrong on its
// own terms: 5 median jobs fitted and the target asked for SIX, so nobody
// could finish a shift at ordinary difficulty.
//
// If it should be slower still, the honest next lever is a LONGER SHIFT rather
// than a smaller number here — ticksPerDay 4500 buys the same slowdown again
// and keeps the deliveries, at the cost of the owner's five-minute session.
export const SHIFT = { ticksPerDay: 3000, startHour: 7, hours: 1.25 };
// The 07:00 timetable, in minutes between vehicles: HSL's morning peak runs
// the trunk trams every 7.5 and the metro every 4. The fleet is provisioned
// to this, not to a count. Measured with test/shifts.cjs, 200 random-but-sane
// bots each: three per line 19% of shifts won, 10/5 35%, 7.5/4 52% — and the
// shift is 07:00-08:15, which IS the peak.
export const HEADWAY_MIN = { TRAM: 7.5, SUBWAY: 4 };

const RAD = Math.PI / 180;
export function pathKm(path) {
  let m = 0;
  for (let i = 1; i < (path?.length || 0); i++) {
    const [a1, o1] = path[i - 1], [a2, o2] = path[i];
    m += Math.hypot((a2 - a1) * 111320, (o2 - o1) * 111320 * Math.cos((a1 + a2) * 0.5 * RAD));
  }
  return m / 1000;
}
export function speedForLayer(layer, ticksPerDay = SHIFT.ticksPerDay, shiftHours = SHIFT.hours) {
  const km = pathKm(layer?.path), kmh = MODE_KMH[layer?.mode] ?? MODE_KMH.TRAM;
  const minutesPerTick = (shiftHours * 60) / ticksPerDay;
  const ticks = Math.max(1, (km / kmh) * 60 / minutesPerTick);
  return 1 / ticks;                           // one full pass per `ticks` ticks
}
export class LiveNetwork{
 // HOW MANY VEHICLES A LINE GETS. With a fixed count per line the headway is
 // the line's length divided by that count, and nothing else — measured at
 // three per line: tram 15 every 61 game-minutes, the metro every 49, trams
 // 1/7/9 every 25-29, against a real morning of 10 for a tram and 4-5 for the
 // metro. A 500-tick stand at Arabia for the next 6 was not bad luck, it was
 // the timetable. `headwayMinutes` provisions each line to a TARGET headway
 // instead — vehicles = cycle ÷ headway, never fewer than two — so the count
 // is a consequence of the line and the number a player feels is the one that
 // was chosen. `vehiclesPerLine` stays as the fixed-count path for tests and
 // for the measurement that decided this.
 constructor(transit,{vehiclesPerLine=2,headwayMinutes=null,dwellTicks=3,ticksPerDay=SHIFT.ticksPerDay,shiftHours=SHIFT.hours,speedFactor=1}={}){this.transit=transit;this.speedFactor=speedFactor;this.vehiclesPerLine=vehiclesPerLine;this.headwayMinutes=headwayMinutes;this.ticksPerDay=ticksPerDay;this.shiftHours=shiftHours;this.dwellTicks=dwellTicks;this.vehicles=[];this.selectedVehicleId=null;for(const layer of transit?.layers||[]){if(layer.mode!=='TRAM'&&layer.mode!=='SUBWAY')continue;const count=this.countFor(layer);// Phases are spaced EVENLY around the out-and-back cycle, offset per line by
  // its hash so lines do not move in lockstep. They used to be hash-scattered,
  // and scattered phases bunch: measured at Lasipalatsi from tick 0, the gap to
  // the next same-direction vehicle reached 1453 ticks on a line whose even
  // headway is 556. Evenly spaced, the worst wait on a line is one headway and
  // the average is half of one — which is what a timetable is.
  const base=(hash(layer.id)%10000)/10000;for(let i=0;i<count;i++)this.vehicles.push({id:`${layer.id}:${i}`,layer,phase:(base+i*(2/count))%2,speed:speedForLayer(layer,ticksPerDay)*this.speedFactor});}}
 // A HOLD is a disruption: every vehicle on a layer stands where it is from
 // `from` to `until`. Positions are a closed form in the tick, so a hold is
 // just ticks the layer does not experience — `effectiveTick` subtracts the
 // held time so far, and both the position and the next-arrival read it. An
 // estimate does not look through a FUTURE hold: you learn of a disruption
 // when it happens, which is what makes it one.
 hold(layer,from,until){(this.holds||=[]).push({layerId:layer.id,from,until});}
 heldNow(layer,tick){return (this.holds||[]).find(h=>h.layerId===layer.id&&tick>=h.from&&tick<h.until)||null;}
 effectiveTick(layer,tick){let t=tick;for(const h of this.holds||[]){if(h.layerId!==layer.id)continue;const a=Math.min(tick,h.until),b=h.from;if(a>b)t-=(a-b);}return t;}
 position(v,tick){const path=v.layer.path||[];if(path.length<2)return null;tick=this.effectiveTick(v.layer,tick);const cycle=(v.phase+tick*v.speed)%2,q=cycle<=1?cycle:2-cycle,at=q*(path.length-1),i=Math.min(path.length-2,Math.floor(at)),f=at-i,a=path[i],b=path[i+1];return{lat:a[0]+(b[0]-a[0])*f,lon:a[1]+(b[1]-a[1])*f,pathIndex:at,direction:cycle<=1?1:-1};}
 vehicle(id){return this.vehicles.find(v=>v.id===id)||null;}
 // Unit screen-space direction of travel at a vehicle, from the path tangent
 // around its index and the sign of the leg it is on; null on a degenerate path.
 heading(v,p,project){const path=v.layer.path||[];if(!p||path.length<2)return null;const i=Math.max(0,Math.min(path.length-2,Math.floor(p.pathIndex)));const a=project(path[i][0],path[i][1]),b=project(path[i+1][0],path[i+1][1]);let dx=(b.x-a.x)*(p.direction>=0?1:-1),dy=(b.y-a.y)*(p.direction>=0?1:-1);const L=Math.hypot(dx,dy);if(L<1e-6)return null;return{x:dx/L,y:dy/L};}
 countFor(layer){const perMin=this.ticksPerDay/(this.shiftHours*60),want=this.headwayMinutes?.[layer.mode];
  if(!want)return layer.mode==='SUBWAY'?Math.max(2,this.vehiclesPerLine):this.vehiclesPerLine;
  // weather.js: a slower service keeps its timetable, so the longer cycle
  // carries more vehicles and weather costs ride time, not waiting time.
  const cycle=2/(speedForLayer(layer,this.ticksPerDay,this.shiftHours)*this.speedFactor);
  return Math.max(2,Math.round(cycle/(want*perMin)));}
 // The timetable's own headway on a line, in ticks — what "every N minutes"
 // means here, for anything that wants to say it out loud.
 headwayTicks(layer){const vs=this.vehicles.filter(v=>v.layer.id===layer.id);if(!vs.length)return null;return (2/vs[0].speed)/vs.length;}
 select(id){this.selectedVehicleId=this.vehicle(id)?.id||null;return this.vehicle(this.selectedVehicleId);}
 clearSelection(){this.selectedVehicleId=null;}
  // How near counts as AT THE STOP. The window was a raw path-index distance,
 // and a path index is not a unit of anything: 2.2 indices on a 241-point tram
 // path is a different real distance from 2.2 on a 682-point metro path, and
 // the TIME a vehicle spends inside that window scales with its speed. So the
 // moment the vehicles were given a speed that matches the clock, the window
 // became too brief to hit and not one catch enabled in a whole shift.
 // It is ticks now — the same units as every deadline in the game — converted
 // through each vehicle's own speed and path length, so it survives any
 // retuning of either. Callers still pass 2.2; it now means 2.2 ticks.
 ticksPerIndex(v){const n=Math.max(1,(v.layer.path?.length||2)-1);return (1/v.speed)/n;}
 // The window is SECONDS of wall time: callers still pass 2.2, and 2.2 seconds
 // is inside Loop 18's 2-8 second catch window. Ten ticks a second is flow-core's
 // TICK_MS, and it is the one rate that does not change with the day length.
 nearestTo(layer,nodePathIndex,tick,maxSeconds=2.2,direction=null){const maxTicks=maxSeconds*10;let best=null;for(const v of this.vehicles){if(v.layer.id!==layer.id)continue;const p=this.position(v,tick);if(!p||(direction&&p.direction!==direction))continue;const d=Math.abs(p.pathIndex-nodePathIndex)*this.ticksPerIndex(v);if(d<=maxTicks&&(!best||d<best.distance))best={vehicle:v,position:p,distance:d};}return best;}
 // WHAT GETS A BADGE. `filter` is the camera's near-rule (camera.js's fleetRule,
 // applied in core's fleetFilter) and it decides visibility, not existence: the
 // route each hidden vehicle runs on is still drawn under it at full length, so
 // the map never claims a line is not there. `lastShown`/`lastTotal` are kept so
 // the HUD can say how much of the fleet you are being shown — a filter you
 // cannot see the size of is indistinguishable from a bug.
 // WHEN THE NEXT ONE COMES, solved rather than searched.
 //
 // Both callers used to answer this by stepping the clock forward one tick at a
 // time and asking nearestTo at each step — 120 steps in the panel, 900 for a
 // transfer — which is a search for something that has a closed form. A vehicle
 // here is a triangle wave: cycle = (phase + tick*speed) mod 2, out on [0,1] and
 // back on (1,2]. A stop at path index i sits at q = i/(n-1) going out and at
 // 2-q coming back, so the wait is just how far the wave has to travel to reach
 // that value — one subtraction per vehicle, exact, and with NO HORIZON.
 //
 // The horizon was not a detail. The panel scanned 120 ticks, so a line whose
 // next vehicle was 200 ticks away reported "WAITING" and no number at all —
 // and once the choices started being compared on total time, a plan with no
 // number lost to a plan with a bad one.
 nextArrival(layer,nodePathIndex,tick,direction=null){
  // One that is standing here NOW is a wait of zero. The closed form measures
  // to the next exact crossing, so on its own it answers a vehicle already in
  // the catch window with a whole cycle — the single case where it and the old
  // scan disagreed, and it disagreed by 548 ticks.
  if(this.nearestTo(layer,nodePathIndex,tick,2.2,direction))return 0;
  // Held: nothing arrives until the hold lifts, then the timetable resumes
  // from where it stood.
  const held=this.heldNow(layer,tick);if(held)return (held.until-tick)+(this.nextArrival(layer,nodePathIndex,held.until,direction)??0);
  tick=this.effectiveTick(layer,tick);
  const n=Math.max(1,(layer.path?.length||2)-1),q=Math.max(0,Math.min(1,nodePathIndex/n));
  const targets=direction===1?[q]:direction===-1?[2-q]:[q,2-q];
  let best=null;
  for(const v of this.vehicles){if(v.layer.id!==layer.id)continue;
   const cur=(v.phase+tick*v.speed)%2;
   for(const t of targets){let d=(t-cur)%2;if(d<0)d+=2;const dt=d/v.speed;if(best===null||dt<best)best=dt;}}
  return best===null?null:Math.round(best);}
 // Badges never MOVE — a badge is the vehicle, and a nudged one lies about where the tram is.
 // So a crowd is resolved by DEGRADING: the highest-ranked vehicle in a heap keeps its
 // labelled badge and everything under it falls back to a dot at its true position.
 // Rank is stable (rank desc, then id) rather than positional, so two trams crossing
 // cannot swap which of them is readable frame to frame.
 // BUDGET: at most this many labelled badges, rank order — the rest are dots
 // even where there is room. A phone at CITY scale had fifty labels and no
 // crowd rule could make that a map; the lines your job can use fill the
 // budget first, so what is labelled is what you can catch. No budget by
 // default: the declutter gate drives draw() directly and asserts the pure rule.
 draw(ctx,tick,project,dpr=1,opts={}){const{filter=null,priority=null,budget=Infinity}=opts;const boxes=[],dots=[];let shown=0,total=0;const items=[];
  for(const v of this.vehicles){if(!v.layer.visible)continue;const p=this.position(v,tick);if(!p)continue;total++;if(filter&&!filter(p.lat,p.lon,v.layer,v))continue;shown++;const selected=v.id===this.selectedVehicleId;items.push({v,p,q:project(p.lat,p.lon),selected,rank:selected?3:(priority?priority(v.layer,v)||0:0)});}
  items.sort((a,b)=>b.rank-a.rank||(a.v.id<b.v.id?-1:a.v.id>b.v.id?1:0));
  const gap=1*dpr,hits=(b)=>boxes.some(o=>b.x<o.x+o.w+gap&&o.x<b.x+b.w+gap&&b.y<o.y+o.h+gap&&o.y<b.y+b.h+gap);
  ctx.save();ctx.font=`bold ${Math.round(8*dpr)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
  // Decide first, paint second, DOTS UNDER BADGES: a dot is a vehicle whose
  // true position is inside a crowd, and the crowd's winner is a badge at
  // nearly the same spot — painted in rank order the dot landed on top of the
  // label it had just yielded to (a 2 at Töölö with a hole in it, live on
  // v2.34). Two passes keep every dot visible at its edge and every label whole.
  // VEHICLES, NOT LABELS (v2.50). A badge was a label with a nose; the board
  // read as text before it read as trams. Each is now a body along its own
  // heading — two cars for a tram, three for the metro — with the line number
  // upright on it, and the box the declutter pass keeps apart is the TURNED
  // body's bounds, so a tram going north takes the room a tram going north
  // takes. `lit` rings the ones you could board this second (route-choice.js
  // says which), because a tap on one of them is how you catch it now.
  const lit=opts?.lit||null,now=opts?.now??0;
  const badges=[];
  for(const it of items){const{v,q,selected}=it,metro=String(v.layer.mode||'').toUpperCase()==='SUBWAY',nose=this.heading(v,it.p,project)||{x:1,y:0};
   const L=(metro?30:24)*(selected?1.3:1)*dpr,W=(selected?14:11)*dpr,ang=Math.atan2(nose.y,nose.x),c=Math.abs(Math.cos(ang)),sn=Math.abs(Math.sin(ang));
   const w=c*L+sn*W,h=sn*L+c*W,box={x:q.x-w/2,y:q.y-h/2,w,h};
   if(boxes.length>=budget||hits(box)){const r=4*dpr;dots.push({x:q.x-r,y:q.y-r,w:r*2,h:r*2,line:v.layer.name,id:v.id,rank:it.rank,colour:v.layer.colour,cx:q.x,cy:q.y,r,wanted:box});continue;}
   box.line=v.layer.name;box.id=v.id;box.rank=it.rank;box.cx=q.x;box.cy=q.y;boxes.push(box);badges.push({it,box,metro,L,W,ang});}
  for(const d of dots){ctx.fillStyle=d.colour;ctx.strokeStyle='#fffdf7';ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.arc(d.cx,d.cy,d.r,0,Math.PI*2);ctx.fill();ctx.stroke();}
  for(const {it,box,metro,L,W,ang} of badges){const{v,q,selected}=it,on=lit?.has(v.id);
   if(on){const pulse=0.5+0.5*Math.sin(now/180);ctx.strokeStyle=`rgba(226,104,60,${(0.55+0.45*pulse).toFixed(2)})`;ctx.lineWidth=(2+2*pulse)*dpr;ctx.beginPath();ctx.arc(q.x,q.y,(L/2+6*dpr)+pulse*3*dpr,0,Math.PI*2);ctx.stroke();}
   ctx.save();ctx.translate(q.x,q.y);ctx.rotate(ang);
   const cars=metro?3:2,gap=1.4*dpr,cl=(L-gap*(cars-1))/cars;ctx.fillStyle=v.layer.colour;ctx.strokeStyle=selected?'#17242b':'#fffdf7';ctx.lineWidth=(selected?3:1.6)*dpr;
   for(let k=0;k<cars;k++){const x0=-L/2+k*(cl+gap),front=k===cars-1;ctx.beginPath();
    // the leading car has the round nose; the rest are boxes on the same rail
    if(front)ctx.roundRect(x0,-W/2,cl,W,[2*dpr,W/2,W/2,2*dpr]);else ctx.roundRect(x0,-W/2,cl,W,2*dpr);ctx.fill();ctx.stroke();}
   if(selected){ctx.fillStyle='#ffe28a';for(let k=0;k<cars;k++){const x0=-L/2+k*(cl+gap);ctx.fillRect(x0+cl*0.2,-W*0.18,cl*0.6,W*0.36);}}
   ctx.restore();
   ctx.lineJoin='round';ctx.lineWidth=3*dpr;ctx.strokeStyle='rgba(15,20,24,0.85)';ctx.strokeText(v.layer.name,q.x,q.y+0.5*dpr);ctx.fillStyle='#fffdf7';ctx.fillText(v.layer.name,q.x,q.y+0.5*dpr);}
  ctx.restore();this.lastShown=shown;this.lastTotal=total;this.lastBadges=boxes.slice();this.lastDots=dots.slice();return boxes.concat(dots);}
}
