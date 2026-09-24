// Toko Move — KIT (roadmap NEXT LEVEL, L2): the choice between shifts.
//
// Monday night, and every night of the week after it, you are offered three
// things and take one. What you take you keep until Friday. FTL's blue option,
// Slay the Spire's relic — and the rule from the ascension ladder: a kit item
// may not add a verb. Each one bends a number the player already reads (the bag
// on the HUD, the walking minutes on a row, the fresh window, the deadline, the
// tip, the fragile bonus), so a kit is never a new thing to learn, only a
// reason to play the same thing differently.
//
// Pure: no DOM, no clock, seeded — test/kit.mjs holds it in bare node.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

// `fx` is the whole contract: a multiplier or a switch per lever, read by the
// one place that lever lives (deliveries.js, mobility-v212.js, parcels.js).
export const KIT=[
 {id:'bag',glyph:'🎒',name:'A BIGGER BAG',line:'Seven units of room instead of five.',fx:{capacity:7}},
 {id:'bike',glyph:'🚲',name:'A BIKE',line:'Every walk takes 40% less time.',fx:{walk:0.6}},
 {id:'thermos',glyph:'🫖',name:'A THERMOS',line:'Hot and fresh food stay fresh 40% longer.',fx:{fresh:1.4}},
 {id:'dispatch',glyph:'📟',name:'AN EASY DISPATCHER',line:'Every deadline is 15% longer.',fx:{limit:1.15}},
 {id:'cards',glyph:'📇',name:'BUSINESS CARDS',line:'Tips from regulars are half as big again.',fx:{tips:1.5}},
 {id:'wrap',glyph:'🫧',name:'BUBBLE WRAP',line:'A fragile parcel is safe with a change, too.',fx:{padding:true}},
];
export const BY_ID=Object.fromEntries(KIT.map(k=>[k.id,k]));
export const OFFERED=3;

// Three things you do not already have, from the week's seed and the night, so
// a reload shows the same three (the week saves them anyway) and a bot can be
// pointed at a particular night.
export function offers(seed,night,owned=[]){const pool=KIT.map(k=>k.id).filter(id=>!owned.includes(id));
 let h=hash(`kit:${seed}:${night}`);const out=[];
 while(out.length<OFFERED&&pool.length){h=Math.imul(h^(h>>>15),2246822507)>>>0;out.push(pool.splice(h%pool.length,1)[0]);}
 return out;}

// What a set of kit does, merged. Unknown ids are ignored rather than trusted:
// `?kit=` is a URL and a URL is typed by people.
export function effects(ids=[]){const fx={capacity:null,walk:1,fresh:1,limit:1,tips:1,padding:false};
 for(const id of ids){const k=BY_ID[id];if(!k)continue;const f=k.fx;
  if(f.capacity)fx.capacity=Math.max(fx.capacity||0,f.capacity);
  if(f.walk)fx.walk*=f.walk;if(f.fresh)fx.fresh*=f.fresh;if(f.limit)fx.limit*=f.limit;if(f.tips)fx.tips*=f.tips;if(f.padding)fx.padding=true;}
 return fx;}
export function parse(raw){return String(raw||'').split(',').map(s=>s.trim()).filter(id=>BY_ID[id]);}
