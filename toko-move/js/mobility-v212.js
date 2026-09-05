// Toko Move v2.12.2 — selected visible HSL vehicle is the sole ride simulation.
export class MobilityController{
 constructor(tm){this.tm=tm;this.ch=tm.challenge;this.location=null;this.walking=null;this.pendingGetOff=null;this.ride=null;this.lastLegKey=this.legKey();this.baseCurrentFrom=this.ch.currentFrom.bind(this.ch);this.baseCatch=this.ch.catchChoice.bind(this.ch);this.ch.currentFrom=()=>this.location||this.baseCurrentFrom();this.ch.catchChoice=(choice,vehicle)=>this.catchChoice(choice,vehicle);this.ch.step=()=>this.step();}
 legKey(){return `${this.ch.index}:${this.ch.leg}:${this.ch.active?.label||''}`;}
 syncLeg(){const k=this.legKey();if(k!==this.lastLegKey){this.lastLegKey=k;this.location=null;this.walking=null;this.pendingGetOff=null;this.ride=null;this.tm.liveNetwork?.clearSelection?.();}}
 canWalk(){const c=this.ch.cargoRule?.();return Boolean(this.ch.active&&!c?.modes);}
 walks(){if(!this.ch.active||!this.ch.waitingForCatch||this.walking||this.pendingGetOff)return[];return (this.tm.walksFrom?.(this.ch.currentFrom())||[]).map(link=>({...link,cost:this.walkCost(link)}));}
 walkCost(link){const a=this.tm.city?.resolved?.[link.from],b=this.tm.city?.resolved?.[link.to];if(!a||!b)return 18;const lat=(a.lat+b.lat)*.5*Math.PI/180,dy=(a.lat-b.lat)*111320,dx=(a.lon-b.lon)*111320*Math.cos(lat),metres=Math.hypot(dx,dy);const k=(this.tm.flow?.clock?.ticksPerDay||600)/600;return Math.max(7,Math.round(metres/85*k));}
 beginWalk(link){if(!this.canWalk())return{error:`${this.ch.active?.cargo||'cargo'} must stay on transit`};if(!this.ch.waitingForCatch||this.walking||this.pendingGetOff)return{error:'cannot walk now'};const valid=this.walks().find(x=>x.to===link?.to&&x.street===link?.street);if(!valid)return{error:'that walking link is not available'};this.ride=null;this.tm.liveNetwork?.clearSelection?.();this.walking={...valid,startTick:this.tm.flow.clock.tick,arriveTick:this.tm.flow.clock.tick+valid.cost};this.ch.waitingForCatch=false;this.ch.say?.(`WALK · ${this.ch.name(valid.from)} → ${this.ch.name(valid.to)} · ${valid.street} · ${valid.cost}t`);return{walking:this.walking};}
 catchChoice(choice,vehicle){const first=choice?.legs?.[0];if(!first)return{error:'no service selected'};const physicalChoice={kind:'direct',legs:[first],transfers:0,cost:first.stops};const res=this.baseCatch(physicalChoice);if(res?.error)return res;this.ride={vehicleId:vehicle?.id||null,line:first.line?.label||'',mode:first.line?.mode||'',from:first.from,to:first.to,stops:first.line?.nodes||[],plannedTransfer:choice.legs.length>1,reachedTarget:false,boardedTick:this.tm.flow.clock.tick,trip:res.trip};if(vehicle?.id)this.tm.liveNetwork?.select?.(vehicle.id);return{...res,vehicleId:this.ride.vehicleId,physicalTo:first.to};}
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
  const here=(this.ride.stops||[]).find(id=>{const i=this.pathIndexFor(v.layer,id);
   return i!=null&&Math.abs(p.pathIndex-i)*net.ticksPerIndex(v)<=22;});
  if(!here||here===this.ride.to||here===this.ch.currentTo())return[];
  const cost=this.tm.planCostFrom?.(here,this.ch.currentTo());
  if(!Number.isFinite(cost))return[];
  const stay=this.stayCost(v,p);
  return[{at:here,exit:cost,stay,better:Number.isFinite(stay)?stay-cost:null}];}
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
  this.location=at;this.ride=null;this.tm.liveNetwork?.clearSelection?.();
  this.ch.activeTrip=null;this.ch.selectedPlan=null;this.ch.waitingForCatch=true;
  this.ch.say?.(`OFF EARLY · ${this.ch.name(at)} · choose again from here.`);
  return{ok:true,at};}
 getOff(){if(!this.pendingGetOff)return{error:'not waiting to get off'};const pending=this.pendingGetOff,at=pending.at,wasTransfer=pending.transfer,trip=pending.trip;this.pendingGetOff=null;this.location=at;this.ride=null;this.tm.liveNetwork?.clearSelection?.();if(wasTransfer){this.ch.activeTrip=null;this.ch.selectedPlan=null;this.ch.waitingForCatch=true;this.ch.say?.(`GET OFF · ${this.ch.name(at)} · transfer hub. Wait for the next service.`);return{ok:true,transfer:true};}const changed=this.ch.completePhysical?.({legs:trip?.legs||[]});this.ch.say?.(`GET OFF · ${this.ch.name(at)}`);this.syncLeg();return{ok:true,changed};}
 step(){this.syncLeg();if(this.walking){if(this.tm.flow.clock.tick>=this.walking.arriveTick){const w=this.walking;this.location=w.to;this.walking=null;this.ch.waitingForCatch=true;this.ch.say?.(`ARRIVED ON FOOT · ${this.ch.name(this.location)} · choose transit or keep walking.`);return true;}return false;}if(this.pendingGetOff)return false;if(this.ride){if(this.rideAtTarget()){this.ride.reachedTarget=true;const at=this.ride.to;this.pendingGetOff={trip:this.ride.trip,at,transfer:Boolean(this.ride.plannedTransfer)};this.location=at;this.ch.waitingForCatch=false;this.ch.say?.(`ARRIVED · ${this.ch.name(at)} · GET OFF.`);return true;}return false;}return false;}
 status(){if(this.pendingGetOff)return{kind:'getoff',at:this.pendingGetOff.at,transfer:this.pendingGetOff.transfer,ride:this.rideProgress()};if(this.walking)return{kind:'walking',...this.walking,remaining:Math.max(0,this.walking.arriveTick-this.tm.flow.clock.tick)};if(this.ch.waitingForCatch)return{kind:'waiting',at:this.ch.currentFrom()};return{kind:'riding',ride:this.rideProgress()};}
}
