// Toko Move — THE OTHER COURIER (owner: "Rival is great").
//
// Crazy Taxi's whole tension in one figure: somebody else is working this
// board, and a job you stand and think about is a job they take. It is NOT a
// second simulation — a rival with its own route planner would be a second
// game running beside yours, and none of it would be visible. It is one
// figure walking a real line between two stops, a claim on ONE of the three
// offers, and a count at the end.
//
// The claim is the mechanic and it is deliberately gentle: never the
// hand-off (that one was put in your hand), never the last job of the shift,
// and never before you have had a chance to read the board.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
// Ticks you get before anything can be taken, and how long the offer then
// stands. 240 together is twenty-four seconds at ×1: long enough to read
// three rows and price them, short enough that standing there costs you.
export const GRACE=60;
export const CLAIM_WINDOW=180;

// v2.53: HE RACES YOU (leap 4). A claim used to be a countdown on a row while
// he walked somewhere else entirely. Now a claim is a JOURNEY: the moment he
// wants your job he turns and heads for the stop you are standing at, a dashed
// line runs from him to it, and he arrives exactly when the claim runs out —
// so the countdown is a figure you can watch getting closer. If he gets there
// he takes it and walks off carrying it to its destination. If you take it
// first you BEAT HIM, and it pays a fifth more.
//
// He moves on SEGMENTS — from where he is, to somewhere, between two ticks —
// and every change of plan starts the next segment where he stands, so a claim
// won, lost or abandoned never makes him jump.
export const BEAT_BONUS=0.2;
export class Rival{
 constructor(tm,seed=7){this.tm=tm;this.seed=seed;this.name='Vesa';this.delivered=0;this.taken=[];this.beaten=0;this.claim=null;
  const hubs=(tm.transferHubs||[]).filter(h=>tm.city?.resolved?.[h]);
  this.hubs=hubs.length?hubs:Object.keys(tm.city?.resolved||{}).slice(0,6);
  this.at=this.hubs[hash(`rival:${seed}`)%this.hubs.length];this.to=this.nextHub(0);this.leftAt=0;this.legTicks=260;
  this.seg={a:this.node(this.at),b:this.node(this.to),t0:0,t1:this.legTicks,kind:'leg'};}
 node(id){const n=this.tm.city?.resolved?.[id];return n?{lat:n.lat,lon:n.lon,id}:null;}
 nextHub(n){const h=hash(`rival:${this.seed}:${n}:${this.at}`);const pool=this.hubs.filter(x=>x!==this.at);return pool[h%pool.length];}
 here(tick=this.tm.flow.clock.tick){const g=this.seg;if(!g?.a||!g?.b)return null;const t=Math.max(0,Math.min(1,(tick-g.t0)/Math.max(1,g.t1-g.t0))),e=t*t*(3-2*t);
  return{lat:g.a.lat+(g.b.lat-g.a.lat)*e,lon:g.a.lon+(g.b.lon-g.a.lon)*e,t};}
 go(b,t1,kind,extra={}){const tick=this.tm.flow.clock.tick,a=this.here(tick);if(!a||!b)return;this.seg={a,b,t0:tick,t1,kind,...extra};}
 // Where he is, which way he is going, and what he is doing.
 position(){const p=this.here();if(!p)return null;const g=this.seg;return{...p,at:this.at,to:this.to,kind:g.kind,target:g.b,carrying:!!g.carrying};}
 step(){const tick=this.tm.flow.clock.tick,ch=this.tm.challenge,g=this.seg;
  if(tick>=g.t1&&g.kind!=='race'){if(g.kind==='leg'||g.carrying)this.delivered++;this.at=g.b?.id||this.to;this.to=this.nextHub(this.delivered);this.leftAt=tick;this.go(this.node(this.to),tick+this.legTicks,'leg');}
  // Put a claim on one ordinary offer, once there is a board to claim from.
  const drop=()=>{if(this.claim){this.claim=null;if(this.seg.kind==='race')this.go(this.node(this.to),tick+this.legTicks,'leg');}};
  if(ch?.active||!ch?.offers?.length){drop();return false;}
  const ordinary=ch.offers.filter(o=>!o.handoff);
  if(!ordinary.length||ch.index>=ch.target-1){drop();return false;}
  // A courier with a parcel on his back finishes that delivery before he
  // wants yours; racing again the instant he had won read as him dropping it.
  if(!this.claim&&this.seg.carrying&&tick<this.seg.t1)return false;
  if(!this.claim||!ch.offers.some(o=>o.id===this.claim.id)){
   if(this.claim)drop();
   const pick=ordinary[hash(`claim:${this.seed}:${ch.index}`)%ordinary.length];
   this.claim={id:pick.id,to:pick.stops[1],pickup:pick.stops[0],from:tick+GRACE,at:tick+GRACE+CLAIM_WINDOW};
   // he turns for your stop, and will be standing on it when the claim runs out
   this.go(this.node(pick.stops[0]),this.claim.at,'race');return false;}
  if(tick>=this.claim.at){const gone=ch.offers.find(o=>o.id===this.claim.id);
   if(gone){ch.offers=ch.offers.filter(o=>o.id!==this.claim.id);this.taken.push(ch.name(this.claim.to));
    ch.say?.(`${this.name} took the ${ch.name(this.claim.to)} job.`);
    // v2.52: the LAST ordinary job going must not strand you. Losing one to
    // him is the cost of reading the board slowly; an empty board until 08:15
    // was a shift with nothing left in it (found by the rush gate, idling to
    // the peak). Dispatch deals a fresh board instead.
    if(!ch.offers.some(o=>!o.handoff))ch.refreshOffers?.();
    // and off he goes with it
    this.at=this.claim.pickup;this.to=this.claim.to;this.leftAt=tick;this.go(this.node(this.claim.to),tick+this.legTicks,'leg',{carrying:true});}
   else if(this.seg.kind==='race')this.go(this.node(this.to),tick+this.legTicks,'leg');
   this.claim=null;return true;}
  return false;}
 // How long the claimed offer has left, in ticks, or null.
 pressure(id){const c=this.claim;if(!c||c.id!==id)return null;const left=c.at-this.tm.flow.clock.tick;return left>0?left:0;}
}

export function mountRival(tm,seed=7){const r=new Rival(tm,seed);tm.rival=r;
 const ch=tm.challenge,prev=ch.step;ch.step=()=>{const a=prev?prev():false;const b=r.step();return a||b;};
 // Taking a job he is racing you for beats him to it: a fifth more, said out
 // loud. The bonus is on the job itself, so the fee the delivery pays and the
 // one the log records are the same number.
 const baseAccept=ch.acceptOffer.bind(ch);ch.acceptOffer=(id,...rest)=>{const raced=r.claim?.id===id&&r.pressure(id)>0;const res=baseAccept(id,...rest);
  if(raced&&!res?.error&&ch.active){ch.active.value=Math.round(ch.active.value*(1+BEAT_BONUS));ch.active.beat=true;r.beaten++;ch.say?.(`BEAT ${r.name.toUpperCase()} · +${Math.round(BEAT_BONUS*100)}%`);
   window.dispatchEvent?.(new CustomEvent('toko-move-beat',{detail:{id,value:ch.active.value}}));}
  return res;};
 return r;}
