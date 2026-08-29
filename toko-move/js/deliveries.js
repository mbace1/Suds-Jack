// Toko Move v2.2 — authored Central Helsinki delivery jobs with deadlines,
// cargo character and a small number of multi-stop runs. One active job at a
// time keeps the map readable; later jobs add pressure rather than more UI.
export const DELIVERY_TARGET = 10;

export const JOBS = [
  { stops:['hakaniemi','rautatientori'], label:'Documents to the station', cargo:'documents', limit:170, value:100 },
  { stops:['rautatientori','kamppi'], label:'Hot lunch to Kamppi', cargo:'hot food', limit:130, value:120 },
  { stops:['kamppi','ruoholahti'], label:'Workshop parts to Ruoholahti', cargo:'parts', limit:180, value:110 },
  { stops:['ruoholahti','toolontori'], label:'Flowers to Töölö', cargo:'fragile', limit:210, value:140 },
  { stops:['toolontori','rautatientori','pasila'], label:'Equipment via Central to Pasila', cargo:'equipment', limit:270, value:180 },
  { stops:['pasila','hakaniemi','sornainen'], label:'Rush courier via Hakaniemi', cargo:'express', limit:230, value:220, rush:true },
  { stops:['sornainen','kalasatama'], label:'Groceries to Kalasatama', cargo:'fresh food', limit:140, value:150, rush:true },
  { stops:['kalasatama','senaatintori','katajanokka'], label:'Harbour manifest via Senate Square', cargo:'documents', limit:260, value:200, rush:true },
  { stops:['katajanokka','kauppatori','senaatintori'], label:'Market pickup and return', cargo:'market goods', limit:220, value:190 },
  { stops:['senaatintori','rautatientori','kallionkirkko'], label:'Final cross-town run to Kallio', cargo:'express', limit:250, value:250 },
];

export class DeliveryChallenge {
  constructor(flow, say) {
    this.flow=flow; this.say=say; this.index=0; this.leg=0; this.active=null;
    this.activeTrip=null; this.seen=new Set(); this.startedAt=0; this.score=0;
    this.late=0; this.rushTriggered=false;
  }
  start(){ this.launchJob(); }
  launchJob(){
    if(this.index>=JOBS.length)return false;
    this.active=JOBS[this.index]; this.leg=0; this.startedAt=this.flow.clock.tick;
    if(this.active.rush&&!this.rushTriggered){this.rushTriggered=true;this.makeRushHour();}
    this.launchLeg();
    this.say(`${this.index+1}/${DELIVERY_TARGET} · ${this.routeLabel()} · ${this.active.cargo} · ${this.active.limit} ticks`);
    return true;
  }
  launchLeg(){
    const from=this.active.stops[this.leg],to=this.active.stops[this.leg+1];
    this.flow.inject(from,to,{kind:'delivery',job:this.index,leg:this.leg,label:this.active.label,cargo:this.active.cargo,n:1});
    this.activeTrip=null;
  }
  makeRushHour(){
    const pairs=[['pasila','rautatientori'],['kalasatama','hakaniemi'],['sornainen','rautatientori'],['toolontori','kamppi']];
    for(let wave=0;wave<4;wave++)for(const [a,b] of pairs)this.flow.inject(a,b,{kind:'rush',n:2});
    this.say('08:00 rush hour. Central services are filling up.');
  }
  step(){
    for(const trip of this.flow.trips.completed){
      if(!trip.payload||trip.payload.kind!=='delivery'||this.seen.has(trip.id))continue;
      this.seen.add(trip.id);
      if(trip.payload.job!==this.index||trip.payload.leg!==this.leg)continue;
      if(this.leg<this.active.stops.length-2){
        this.leg+=1; this.launchLeg();
        this.say(`Stop ${this.leg+1}/${this.active.stops.length}: continue to ${this.name(this.active.stops[this.leg+1])}.`);
        return true;
      }
      const elapsed=this.elapsed(); const late=elapsed>this.active.limit;
      const earned=late?Math.round(this.active.value*0.5):this.active.value;
      this.score+=earned; if(late)this.late+=1;
      this.say(`${late?'LATE':'ON TIME'} · +${earned} · ${this.active.label}`);
      this.index+=1; this.leg=0; this.active=null;
      if(this.index<JOBS.length)this.launchJob();
      return true;
    }
    return false;
  }
  elapsed(){ return this.active?this.flow.clock.tick-this.startedAt:0; }
  remaining(){ return this.active?Math.max(0,this.active.limit-this.elapsed()):0; }
  routeLabel(){ return this.active?this.active.stops.map(id=>this.name(id)).join(' → '):''; }
  currentFrom(){ return this.active?.stops[this.leg]; }
  currentTo(){ return this.active?.stops[this.leg+1]; }
  get complete(){ return this.index>=DELIVERY_TARGET; }
  name(id){ return this.flow.graph.node(id)?.name||id; }
}
