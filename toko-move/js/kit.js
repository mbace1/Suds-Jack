// Toko Move — KIT (roadmap NEXT LEVEL, L2): the choice between shifts.
//
// Monday night, and every night of the week after it, you are offered three
// things and take one. What you take you keep until Friday. FTL's blue option,
// Slay the Spire's relic — and the rule from the ascension ladder: a kit item
// may not add a verb. Each one bends a number the player already reads (the bag
// on the HUD, the fresh window, the deadline, a regular's pips, the chain's
// multiplier, a drop's fee), so a kit is never a new thing to learn, only a
// reason to play the same thing differently.
//
// Two items were built, measured and CUT (v2.48): a bike (walking ×0.6) and
// bubble wrap (a fragile parcel safe with a change). The bot walked 2-3 times in
// twenty shifts and a fragile parcel with a change is rarer still, so both
// measured €0 a week: an item whose lever is almost never pulled is a trap in
// an offer of three. The bike's lever stays in `effects` (walk) for a later
// kit that makes walking common enough to be worth speeding up.
//
// Pure: no DOM, no clock, seeded — test/kit.mjs holds it in bare node.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

// `fx` is the whole contract: a multiplier or a switch per lever, read by the
// one place that lever lives (deliveries.js, and mobility-v212.js for walk).
export const KIT=[
 {id:'bag',glyph:'🎒',name:'A BIGGER BAG',line:'Six units of room instead of five.',fx:{capacity:6}},
 {id:'thermos',glyph:'🫖',name:'A THERMOS',line:'Hot and fresh food stay fresh right to the deadline.',fx:{fresh:1.67}},
 {id:'dispatch',glyph:'📟',name:'AN EASY DISPATCHER',line:'Every deadline is 15% longer.',fx:{limit:1.15}},
 {id:'cards',glyph:'📇',name:'BUSINESS CARDS',line:'Every regular knows you from the start: two pips.',fx:{known:2}},
 {id:'name',glyph:'⭐',name:'A GOOD NAME',line:'An on-time chain climbs ×0.4 a step, not ×0.25.',fx:{streak:0.4}},
 {id:'app',glyph:'📱',name:'A COURIER APP',line:'Drops on the way pay half again.',fx:{drops:1.5}},
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
export function effects(ids=[]){const fx={capacity:null,walk:1,fresh:1,limit:1,known:0,streak:null,drops:1};
 for(const id of ids){const k=BY_ID[id];if(!k)continue;const f=k.fx;
  if(f.capacity)fx.capacity=Math.max(fx.capacity||0,f.capacity);
  if(f.walk)fx.walk*=f.walk;if(f.fresh)fx.fresh*=f.fresh;if(f.limit)fx.limit*=f.limit;if(f.known)fx.known=Math.max(fx.known,f.known);if(f.streak)fx.streak=Math.max(fx.streak||0,f.streak);if(f.drops)fx.drops*=f.drops;}
 return fx;}
export function parse(raw){return String(raw||'').split(',').map(s=>s.trim()).filter(id=>BY_ID[id]);}
