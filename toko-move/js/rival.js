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

export class Rival{
 constructor(tm,seed=7){this.tm=tm;this.seed=seed;this.name='Vesa';this.delivered=0;this.taken=[];this.claim=null;
  const hubs=(tm.transferHubs||[]).filter(h=>tm.city?.resolved?.[h]);
  this.hubs=hubs.length?hubs:Object.keys(tm.city?.resolved||{}).slice(0,6);
  this.at=this.hubs[hash(`rival:${seed}`)%this.hubs.length];this.to=this.nextHub(0);this.leftAt=0;this.legTicks=260;}
 nextHub(n){const h=hash(`rival:${this.seed}:${n}:${this.at}`);const pool=this.hubs.filter(x=>x!==this.at);return pool[h%pool.length];}
 // Where the rival is right now, as a fraction of its current leg.
 position(){const c=this.tm.city?.resolved,a=c?.[this.at],b=c?.[this.to];if(!a||!b)return null;
  const t=Math.max(0,Math.min(1,(this.tm.flow.clock.tick-this.leftAt)/this.legTicks)),e=t*t*(3-2*t);
  return{lat:a.lat+(b.lat-a.lat)*e,lon:a.lon+(b.lon-a.lon)*e,at:this.at,to:this.to,t};}
 step(){const tick=this.tm.flow.clock.tick,ch=this.tm.challenge;
  if(tick-this.leftAt>=this.legTicks){this.delivered++;this.at=this.to;this.to=this.nextHub(this.delivered);this.leftAt=tick;}
  // Put a claim on one ordinary offer, once there is a board to claim from.
  if(ch?.active||!ch?.offers?.length){this.claim=null;return false;}
  const ordinary=ch.offers.filter(o=>!o.handoff);
  if(!ordinary.length||ch.index>=ch.target-1){this.claim=null;return false;}
  if(!this.claim||!ch.offers.some(o=>o.id===this.claim.id)){
   const pick=ordinary[hash(`claim:${this.seed}:${ch.index}`)%ordinary.length];
   this.claim={id:pick.id,to:pick.stops[1],from:tick+GRACE,at:tick+GRACE+CLAIM_WINDOW};return false;}
  if(tick>=this.claim.at){const gone=ch.offers.find(o=>o.id===this.claim.id);
   if(gone){ch.offers=ch.offers.filter(o=>o.id!==this.claim.id);this.taken.push(ch.name(this.claim.to));
    ch.say?.(`${this.name} took the ${ch.name(this.claim.to)} job.`);}
   this.claim=null;return true;}
  return false;}
 // How long the claimed offer has left, in ticks, or null.
 pressure(id){const c=this.claim;if(!c||c.id!==id)return null;const left=c.at-this.tm.flow.clock.tick;return left>0?left:0;}
}

export function mountRival(tm,seed=7){const r=new Rival(tm,seed);tm.rival=r;
 const ch=tm.challenge,prev=ch.step;ch.step=()=>{const a=prev?prev():false;const b=r.step();return a||b;};
 return r;}
