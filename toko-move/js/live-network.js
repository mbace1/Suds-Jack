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
export const SHIFT = { ticksPerDay: 3000, startHour: 7, hours: 3 };
export const END_TO_END_MINUTES = { TRAM: 50, SUBWAY: 45 };
export function speedFor(mode, ticksPerDay = SHIFT.ticksPerDay, shiftHours = SHIFT.hours) {
  const minutesPerTick = (shiftHours * 60) / ticksPerDay;
  const ticks = (END_TO_END_MINUTES[mode] ?? 50) / minutesPerTick;
  return 1 / ticks;                           // one full pass per `ticks` ticks
}
export class LiveNetwork{
 constructor(transit,{vehiclesPerLine=2,dwellTicks=3,ticksPerDay=SHIFT.ticksPerDay}={}){this.transit=transit;this.vehiclesPerLine=vehiclesPerLine;this.dwellTicks=dwellTicks;this.vehicles=[];this.selectedVehicleId=null;for(const layer of transit?.layers||[]){if(layer.mode!=='TRAM'&&layer.mode!=='SUBWAY')continue;const count=layer.mode==='SUBWAY'?Math.max(2,vehiclesPerLine):vehiclesPerLine;// Phases are spaced EVENLY around the out-and-back cycle, offset per line by
  // its hash so lines do not move in lockstep. They used to be hash-scattered,
  // and scattered phases bunch: measured at Lasipalatsi from tick 0, the gap to
  // the next same-direction vehicle reached 1453 ticks on a line whose even
  // headway is 556. Evenly spaced, the worst wait on a line is one headway and
  // the average is half of one — which is what a timetable is.
  const base=(hash(layer.id)%10000)/10000;for(let i=0;i<count;i++)this.vehicles.push({id:`${layer.id}:${i}`,layer,phase:(base+i*(2/count))%2,speed:speedFor(layer.mode,ticksPerDay)});}}
 position(v,tick){const path=v.layer.path||[];if(path.length<2)return null;const cycle=(v.phase+tick*v.speed)%2,q=cycle<=1?cycle:2-cycle,at=q*(path.length-1),i=Math.min(path.length-2,Math.floor(at)),f=at-i,a=path[i],b=path[i+1];return{lat:a[0]+(b[0]-a[0])*f,lon:a[1]+(b[1]-a[1])*f,pathIndex:at,direction:cycle<=1?1:-1};}
 vehicle(id){return this.vehicles.find(v=>v.id===id)||null;}
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
 draw(ctx,tick,project,dpr=1){const boxes=[];ctx.save();ctx.font=`bold ${Math.round(8*dpr)}px ui-monospace,monospace`;ctx.textAlign='center';ctx.textBaseline='middle';for(const v of this.vehicles){if(!v.layer.visible)continue;const p=this.position(v,tick);if(!p)continue;const q=project(p.lat,p.lon),selected=v.id===this.selectedVehicleId,w=(selected?29:24)*dpr,h=(selected?18:14)*dpr;ctx.fillStyle=v.layer.colour;ctx.strokeStyle=selected?'#17242b':'#fffdf7';ctx.lineWidth=(selected?4:2)*dpr;ctx.beginPath();ctx.roundRect(q.x-w/2,q.y-h/2,w,h,3*dpr);ctx.fill();ctx.stroke();if(selected){ctx.strokeStyle='#fffdf7';ctx.lineWidth=1*dpr;ctx.stroke();}ctx.fillStyle='#fff';ctx.fillText(v.layer.name,q.x,q.y+.5*dpr);boxes.push({x:q.x-w/2,y:q.y-h/2,w,h});}ctx.restore();return boxes;}
}
