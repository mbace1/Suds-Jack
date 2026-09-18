// Toko Move v2.12.2 — selected visible HSL vehicle is the sole ride simulation.
export class MobilityController{
 constructor(tm){this.tm=tm;this.ch=tm.challenge;this.location=null;this.walking=null;this.pendingGetOff=null;this.ride=null;this.lastLegKey=this.legKey();this.baseCurrentFrom=this.ch.currentFrom.bind(this.ch);this.baseCatch=this.ch.catchChoice.bind(this.ch);this.ch.currentFrom=()=>this.location||this.baseCurrentFrom();this.ch.catchChoice=(choice,vehicle)=>this.catchChoice(choice,vehicle);this.ch.step=()=>this.step();}
 // The key is the JOB, not the count. It used to carry ch.index — and a drop
 // made on the way bumps index without changing the job, so the first drop
 // read as a new leg and syncLeg wiped the ride under the courier: stranded
 // aboard nothing, status "riding", for the rest of the shift. Measured: the
 // random bots fell 60% → 37% the moment drops existed, and every loss was
 // "ended riding, 1 delivered".
 legKey(){const a=this.ch.active;return `${a?.id||a?.label||''}:${this.ch.leg}`;}
 syncLeg(){const k=this.legKey();if(k!==this.lastLegKey){this.lastLegKey=k;this.location=null;this.walking=null;this.pendingGetOff=null;this.ride=null;this.tm.liveNetwork?.clearSelection?.();}}
 canWalk(){const c=this.ch.cargoRule?.();return Boolean(this.ch.active&&!c?.modes);}
 walks(){if(!this.ch.active||!this.ch.waitingForCatch||this.walking||this.pendingGetOff)return[];const v=this.tm.visited;return (this.tm.walksFrom?.(this.ch.currentFrom())||[]).filter(l=>!v||(v.has(l.from)&&v.has(l.to))).map(link=>({...link,cost:this.walkCost(link)}));}
 walkCost(link){const a=this.tm.city?.resolved?.[link.from],b=this.tm.city?.resolved?.[link.to];if(!a||!b)return 18;const lat=(a.lat+b.lat)*.5*Math.PI/180,dy=(a.lat-b.lat)*111320,dx=(a.lon-b.lon)*111320*Math.cos(lat),metres=Math.hypot(dx,dy);const k=(this.tm.flow?.clock?.ticksPerDay||600)/600;return Math.max(7,Math.round(metres/85*k));}
 beginWalk(link){if(!this.canWalk())return{error:`${this.ch.active?.cargo||'cargo'} must stay on transit`};if(!this.ch.waitingForCatch||this.walking||this.pendingGetOff)return{error:'cannot walk now'};const valid=this.walks().find(x=>x.to===link?.to&&x.street===link?.street);if(!valid)return{error:'that walking link is not available'};this.ride=null;this.tm.liveNetwork?.clearSelection?.();this.walking={...valid,startTick:this.tm.flow.clock.tick,arriveTick:this.tm.flow.clock.tick+valid.cost};this.ch.waitingForCatch=false;this.ch.say?.(`WALK · ${this.ch.name(valid.from)} → ${this.ch.name(valid.to)} · ${valid.street} · ${valid.cost}t`);return{walking:this.walking};}
 catchChoice(choice,vehicle){const first=choice?.legs?.[0];if(!first)return{error:'no service selected'};if(this.tm.events?.busy?.())return{error:'you are helping someone'};if(this.tm.events?.pending){const ev=this.tm.events,free=ev.options().findIndex(o=>!o.cost);ev.choose(Math.max(0,free));}const physicalChoice={kind:'direct',legs:[first],transfers:0,cost:first.stops};const res=this.baseCatch(physicalChoice);if(res?.error)return res;this.ride={plan:choice,vehicleId:vehicle?.id||null,line:first.line?.label||'',mode:first.line?.mode||'',from:first.from,to:first.to,stops:first.line?.nodes||[],plannedTransfer:choice.legs.length>1,reachedTarget:false,boardedTick:this.tm.flow.clock.tick,trip:res.trip};if(vehicle?.id)this.tm.liveNetwork?.select?.(vehicle.id);return{...res,vehicleId:this.ride.vehicleId,physicalTo:first.to};}
 pathIndexFor(layer,id){const n=this.tm.city?.resolved?.[id];if(!n||!layer?.path?.length)return null;let bi=0,bd=Infinity;for(let i=0;i<layer.path.length;i++){const q=layer.path[i],d=(q[0]-n.lat)**2+(q[1]-n.lon)**2;if(d<bd){bd=d;bi=i;}}return bi;}
 rideAtTarget(){if(!this.ride?.vehicleId)return false;const v=this.tm.liveNetwork?.vehicle?.(this.ride.vehicleId),p=v&&this.tm.liveNetwork.position(v,this.tm.flow.clock.tick);if(!v||!p)return false;const idx=this.pathIndexFor(v.layer,this.ride.to);if(idx==null)return false;return Math.abs(p.pathIndex-idx)<=2.2;}
 rideProgress(){if(!this.ride)return null;const v=this.tm.liveNetwork?.vehicle?.(this.ride.vehicleId),p=v&&this.tm.liveNetwork.position(v,this.tm.flow.clock.tick);if(!v||!p)return this.ride;const layer=v.layer,ordered=this.ride.stops.filter(id=>this.tm.city?.resolved?.[id]);let current=this.ride.from,next=this.ride.to,best=Infinity;for(let i=0;i<ordered.length;i++){const pi=this.pathIndexFor(layer,ordered[i]);if(pi==null)continue;const d=Math.abs(pi-p.pathIndex);if(d<best){best=d;current=ordered[i];next=ordered[Math.min(ordered.length-1,i+(p.direction>=0?1:-1))]||this.ride.to;}}return{...this.ride,current,next,position:p};}
 // GETTING OFF EARLY, which is the only decision the ride ever had in it.
 //
 // 71% of a five-minute shift is spent aboard a vehicle with nothing to press.
 // The verb list already says ride and get off; what was missing is that you
 // could only get off where the plan said. A tram passing an interchange where
 // a faster continuation is standing right now is the most ordinary decision in
 // real transit and the game could not express it.
 //
 // It is offered ONLY while the vehicle is actually at a stop — the same 2.2
 // second window a catch uses — because stepping off between stops is not a
 // thing you can do, and an option you cannot really take is worse than none.
 rideExits(){
  if(!this.ride?.vehicleId||this.pendingGetOff||this.walking)return[];
  const net=this.tm.liveNetwork,v=net?.vehicle?.(this.ride.vehicleId),p=v&&net.position(v,this.tm.flow.clock.tick);
  if(!v||!p)return[];
  const here=this.stopHere(v,p);
  if(!here||here===this.ride.to||here===this.ch.currentTo())return[];
  const cost=this.tm.planCostFrom?.(here,this.ch.currentTo());
  if(!Number.isFinite(cost))return[];
  const stay=this.stayCost(v,p);
  return[{at:here,exit:cost,stay,better:Number.isFinite(stay)?stay-cost:null}];}
 // The stop the vehicle is standing at right now, or null between stops —
 // the same 22-tick window a catch and an early exit use.
 stopHere(v,p){const net=this.tm.liveNetwork;if(!v||!p||!this.ride)return null;return (this.ride.stops||[]).find(id=>{const i=this.pathIndexFor(v.layer,id);return i!=null&&Math.abs(p.pathIndex-i)*net.ticksPerIndex(v)<=22;})||null;}
 // Path index of a point on a layer — the drops carry lat/lon, not graph ids.
 pathIndexAt(layer,lat,lon){if(!layer?.path?.length)return null;let bi=0,bd=Infinity;for(let i=0;i<layer.path.length;i++){const q=layer.path[i],d=(q[0]-lat)**2+(q[1]-lon)**2;if(d<bd){bd=d;bi=i;}}return bi;}
 // Which drop in the bag the vehicle is standing at, if any. Same window as
 // stopHere. A drop's index on this layer is cached on the job.
 dropHere(v,p){const net=this.tm.liveNetwork,bag=this.ch.along||[];if(!v||!p||!bag.length)return null;for(const j of bag){if(j.lat==null)continue;j._pi||={};const key=v.layer.id;if(j._pi[key]==null)j._pi[key]=this.pathIndexAt(v.layer,j.lat,j.lon);const i=j._pi[key];if(i==null)continue;const q=v.layer.path[i],far=(q[0]-j.lat)**2+(q[1]-j.lon)**2;if(far>2.5e-7)continue;if(Math.abs(p.pathIndex-i)*net.ticksPerIndex(v)<=22)return j.stops[1];}return null;}
 // Where the drops in the bag fall along the current ride, 0..1 from the
 // boarding stop to the get-off stop — for the strip.
 dropProgress(){const r=this.ride,net=this.tm.liveNetwork,v=r&&net?.vehicle?.(r.vehicleId);if(!v)return[];const a=this.pathIndexFor(v.layer,r.from),b=this.pathIndexFor(v.layer,r.to);if(a==null||b==null||a===b)return[];const out=[];for(const j of this.ch.along||[]){if(j.lat==null)continue;const i=this.pathIndexAt(v.layer,j.lat,j.lon);const q=v.layer.path[i];if((q[0]-j.lat)**2+(q[1]-j.lon)**2>2.5e-7)continue;const f=(i-a)/(b-a);if(f>0&&f<1)out.push({name:j.name,fraction:f,id:j.stops[1]});}return out;}
 // What staying aboard is worth: the rest of this ride, plus whatever the plan
 // still has to do after it.
 stayCost(v,p){const net=this.tm.liveNetwork,idx=this.pathIndexFor(v.layer,this.ride.to);
  if(idx==null)return null;
  const rest=Math.abs(idx-p.pathIndex)*net.ticksPerIndex(v);
  if(this.ride.to===this.ch.currentTo())return Math.round(rest);
  const after=this.tm.planCostFrom?.(this.ride.to,this.ch.currentTo());
  return Number.isFinite(after)?Math.round(rest+after):null;}
 getOffEarly(at){
  const exits=this.rideExits();
  if(!exits.some(x=>x.at===at))return{error:'not at that stop'};
  this.tm.visitHere?.(at);this.location=at;this.ride=null;this.tm.liveNetwork?.clearSelection?.();
  this.ch.activeTrip=null;this.ch.selectedPlan=null;this.ch.waitingForCatch=true;
  this.ch.say?.(`OFF EARLY · ${this.ch.name(at)} · choose again from here.`);
  return{ok:true,at};}
 getOff(){if(!this.pendingGetOff)return{error:'not waiting to get off'};this.tm.visitHere?.(this.pendingGetOff.at);const pending=this.pendingGetOff,at=pending.at,wasTransfer=pending.transfer,trip=pending.trip;this.pendingGetOff=null;this.location=at;this.ride=null;this.tm.liveNetwork?.clearSelection?.();if(wasTransfer){this.ch.deliverAlong?.(at);this.ch.activeTrip=null;this.ch.selectedPlan=null;this.ch.waitingForCatch=true;this.ch.say?.(`GET OFF · ${this.ch.name(at)} · transfer hub. Wait for the next service.`);return{ok:true,transfer:true};}const changed=this.ch.completePhysical?.({legs:trip?.legs||[]});this.ch.say?.(`GET OFF · ${this.ch.name(at)}`);this.syncLeg();return{ok:true,changed};}
 step(){this.syncLeg();if(this.walking){if(this.tm.flow.clock.tick>=this.walking.arriveTick){const w=this.walking;this.location=w.to;this.walking=null;this.ch.waitingForCatch=true;this.ch.deliverAlong?.(w.to);this.tm.visitHere?.(w.to);this.ch.say?.(`ARRIVED ON FOOT · ${this.ch.name(this.location)} · choose transit or keep walking.`);return true;}return false;}if(this.pendingGetOff)return false;if(this.ride){{const v=this.tm.liveNetwork?.vehicle?.(this.ride.vehicleId),p=v&&this.tm.liveNetwork.position(v,this.tm.flow.clock.tick),here=this.dropHere(v,p);if(here&&this.ch.deliverAlong?.(here))return true;}if(this.rideAtTarget()){this.ride.reachedTarget=true;const at=this.ride.to;this.pendingGetOff={trip:this.ride.trip,at,transfer:Boolean(this.ride.plannedTransfer)};this.location=at;this.ch.waitingForCatch=false;this.ch.say?.(`ARRIVED · ${this.ch.name(at)} · GET OFF.`);return true;}return false;}return false;}
 status(){if(this.pendingGetOff)return{kind:'getoff',at:this.pendingGetOff.at,transfer:this.pendingGetOff.transfer,ride:this.rideProgress()};if(this.walking)return{kind:'walking',...this.walking,remaining:Math.max(0,this.walking.arriveTick-this.tm.flow.clock.tick)};if(this.ch.waitingForCatch)return{kind:'waiting',at:this.ch.currentFrom()};return{kind:'riding',ride:this.rideProgress()};}
}
