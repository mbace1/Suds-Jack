// Toko Move — CITY EVENTS: the disruption with a face on it (roadmap item 7).
//
// Owner, 2026-09-17: "match day at the stadium (line 10 full and slow),
// Hakaniemi market (a cluster of drops), Helsinki Day. One per shift,
// announced on the title card so the shift has a name."
//
// THE RULE THIS FILE KEEPS is Slay Kallio's ascension-ladder rule: every day
// rides a lever that ALREADY EXISTS. A modifier that needs a new system is a
// second game wearing a hat. So there are four days and no new mechanics:
//
//   MATCH DAY     rides liveNetwork.hold()      — the disruption's own lever,
//                                                 repeated instead of once, so
//                                                 the crowded families fall
//                                                 progressively behind.
//   MARKET DAY    rides alongOffers()           — the drop a route passes, but
//                                                 pulled to one named stop and
//                                                 paid more for going there.
//   HELSINKI DAY  rides drawSchedule()'s budget — more encounters, and helping
//                                                 is worth double goodwill.
//   QUIET SUNDAY  rides HEADWAY_MIN + walkCost  — fewer trams, empty pavements.
//
// QUIET SUNDAY is the one that earns its place twice: it is the only card that
// makes the game EASIER to walk than to ride, which is the first real payoff
// Local Knowledge (v2.40) has ever had — a shift where the stops you have been
// to are the shift, rather than a filter on a list nobody reads.
//
// A DAY MAY NEVER HIDE WHAT IT DOES. Every one says its piece on the title
// card before START SHIFT is pressed, and names the lines it slows. A
// roguelike modifier you discover by losing is a different genre, and this
// game already decided (v2.26) that a number it will not show is a number it
// may not use.
//
// The lines named by MATCH DAY are a GAME event about real line numbers, the
// same fiction the disruption deck has told since v2.38 ("a car is parked on
// the rails — 4 is held"). Nothing here is claimed as an HSL service alteration
// and nothing reads the pack for one.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export const CITY_EVENTS=[
 {id:'match',name:'MATCH DAY',glyph:'⚽',
  blurb:'The stadium fills from nine and the Töölö trams crawl all morning.',
  // Families, not line names: '10' is 10, 10B and 10H, and family() already
  // knows that. Holding one branch and not its siblings would be a timetable
  // nobody could read.
  //
  // WHICH families is MEASURED, not chosen from a map. The first cut crowded
  // 4 and 10 because those are the stadium's lines in the real city — and the
  // bot harness then showed line 10 carrying 0.0% of all catches in a shift,
  // so half of match day was aimed at a service this game never uses. 2 and 4
  // carry 30% of every catch between them and both really do run past the
  // stadium, so the fiction survives contact with the measurement.
  crowds:{families:['2','4'],everyTicks:300,holdTicks:80}},
 {id:'market',name:'MARKET MORNING',glyph:'🧺',
  blurb:'Hakaniemi market is setting up. Everybody has something that needs carrying.',
  // A QUARTER, not a platform. Keyed on the name and then widened to 600 m,
  // because a market that is one stop id is a market that almost never falls
  // between where you are and where you are going: measured at six offers
  // across sixty shifts, which is not a cluster, it is a rumour.
  market:{name:'Hakaniemi',anchor:'hakaniemi',bonus:0.6,radiusM:600,offers:3}},
 {id:'helsinki',name:'HELSINKI DAY',glyph:'🎈',
  blurb:'The whole city is out on the street. You will be stopped more than once.',
  crowd:{encounters:5,goodwill:2}},
 {id:'quiet',name:'QUIET SUNDAY',glyph:'☕',
  blurb:'Sunday timetable. Half the trams, empty pavements — your legs are the fast option today.',
  quiet:{headway:1.5,walk:0.72}},
];

export const DAYS=Object.fromEntries(CITY_EVENTS.map(d=>[d.id,d]));

// One day per shift, from the shift seed alone, so a shift can be replayed by
// number and a bot can be pointed at a particular one. `pin` is the ?day=
// override: a real id picks that day, 'none' is an ORDINARY day and exists so
// the harness has a control column — a modifier measured against itself is not
// measured at all.
export function drawCityEvent(seed,pin=null){
 if(pin==='none')return null;
 if(pin&&DAYS[pin])return DAYS[pin];
 return CITY_EVENTS[hash(`day:${seed}`)%CITY_EVENTS.length];}

// What a day does to the fleet it is handed, before the fleet is built.
export function headwayFor(day,base){if(!day?.quiet?.headway)return base;const out={};for(const k of Object.keys(base))out[k]=base[k]*day.quiet.headway;return out;}
export function walkFactor(day){return day?.quiet?.walk||1;}
export function encounterCount(day,fallback){return day?.crowd?.encounters||fallback;}
export function goodwillFactor(day){return day?.crowd?.goodwill||1;}
export function marketOf(day){return day?.market||null;}

// THE CROWDING. A hold is the disruption's lever and `effectiveTick` subtracts
// every past hold, so repeating a short one is not a stutter — the line loses
// that time for good and drifts further behind all morning, which is what
// "full and slow" actually feels like from a stop.
export class CityDay{
 constructor(tm,day){this.tm=tm;this.day=day;this.holds=[];this.nextAt=day?.crowds?.everyTicks||0;}
 layers(){const f=this.day?.crowds?.families;if(!f)return[];return (this.tm.transit?.layers||[]).filter(l=>l.visible&&f.includes(family(l.name)));}
 step(){const day=this.day;if(!day?.crowds)return false;const tick=this.tm.flow.clock.tick;if(tick<this.nextAt)return false;
  this.nextAt=tick+day.crowds.everyTicks;const until=tick+day.crowds.holdTicks;let any=false;
  for(const layer of this.layers()){this.tm.liveNetwork?.hold?.(layer,tick,until);any=true;}
  if(any)this.holds.push({from:tick,until,families:day.crowds.families});
  return any;}
 crowdedNow(){const t=this.tm.flow.clock.tick;return this.holds.some(h=>t>=h.from&&t<h.until);}
}
// "10B" -> "10". A local copy rather than an import from board.js, which is the
// map's module and pulls the whole night palette in behind it.
export function family(name){const s=String(name??'').trim().toUpperCase(),m=s.match(/^(M?\d+)/);return m?m[1]:s.replace(/[^A-Z]/g,'');}

const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));

// The day's own slot on the sheet — never the event card's. Two writers to one
// slot is the bug this project keeps paying for, so the day gets `cityDay` and
// the deck keeps `eventCard`.
export function mountCity(tm){const day=tm.cityDay||null,dir=new CityDay(tm,day);tm.cityDirector=dir;
 const ch=tm.challenge,prev=ch.step;ch.step=()=>{const a=prev?prev():false,b=dir.step();return a||b;};
 let last='';const render=()=>{const slot=tm.sheetSlot?.('cityDay');if(!slot)return;
  if(!day){if(slot.innerHTML)slot.innerHTML='';return;}
  const crowded=dir.crowdedNow(),key=`${day.id}:${crowded}`;if(key===last)return;last=key;
  const chips=(day.crowds?.families||[]).map(f=>{const l=(tm.transit?.layers||[]).find(x=>family(x.name)===f);
   return `<span class="lb" style="background:${esc(l?.colour||'#52676d')}">${esc(f)}</span>`;}).join(' ');
  slot.innerHTML=`<div class="dayStrip${crowded?' lit':''}"><span class="dayGlyph">${day.glyph}</span><b>${esc(day.name)}</b>${chips?`<span class="dayChips">${chips}${crowded?' <i>crowded</i>':''}</span>`:''}</div>`;};
 setInterval(render,250);render();return dir;}
