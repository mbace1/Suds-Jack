// Toko Move — THE WEEK (roadmap NEXT LEVEL, L1).
//
// Five shifts, Monday to Friday, one run. A shift pays what it scored, the
// week keeps the money, and RENT IS DUE ON FRIDAY: the run is won or lost at
// the end of the week, not the end of a shift. It is the leap because it makes
// what already exists COMPOUND instead of reset — a regular cultivated on
// Monday tips on Thursday, and a bad Wednesday is a Friday problem. Nothing
// here is a new mechanic; it is a save between shifts and a number to beat.
//
// Four rules, each the answer to a way a run goes wrong:
//
//   A WEEK IS A SEED. The five shift numbers and the five city days come from
//   it, so a week can be replayed by number and a bot can be pointed at one.
//
//   A WEEKDAY IS A WEEKDAY. The daily draws from four special days, QUIET
//   SUNDAY among them. A week draws its own deck — two ordinary days, a match,
//   a market, the city's day — shuffled, so no week is five festivals and
//   no Tuesday is a Sunday.
//
//   LEAVING IS CLOCKING OUT. A shift is recorded as it goes, not when it ends,
//   and a shift that was started and left pays what it had earned when you
//   left. A run you can reload out of a bad morning is not a run.
//
//   STANDING BELONGS TO THE WEEK. Regulars start every week at nothing and
//   remember you until Friday; the map you learn (visited stops) is yours for
//   good, because that is knowledge a real courier keeps.
//
// Pure: no DOM, no clock, storage injected — test/week.mjs holds all of it in
// bare node.
import {offers as kitOffers,BY_ID as KIT_BY_ID} from './kit.js?v=1';
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export const KEY='tokoMoveWeek';
export const LENGTH=5;
export const DAY_NAMES=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];
// A shift's score in euros. Scores run in the hundreds to low thousands; a
// morning's courier work is tens of euros, and a number that reads as money is
// the whole point of calling it rent.
export const PER_EURO=10;
export const euros=score=>Math.max(0,Math.round((Number(score)||0)/PER_EURO));
// RENT is measured, not picked (VERSIONS.md v2.47, `shifts.cjs --weeks=40`):
// at 350 a player who reads the fee pays 78% of weeks, one who takes the
// shortest job 58%, one who takes the first job and never walks 28%.
export const RENT=350;
export const DECK=['none','none','match','market','helsinki'];

// Seeded Fisher-Yates over the weekday deck.
export function weekDays(seed){const d=DECK.slice();let h=hash(`weekdays:${seed}`);
 for(let i=d.length-1;i>0;i--){h=Math.imul(h^(h>>>15),2246822507)>>>0;const j=h%(i+1);[d[i],d[j]]=[d[j],d[i]];}return d;}
// Seven digits, never inside the daily's six-digit range or a tester's `?shift=7`.
export function shiftSeedFor(seed,i){return 1000000+(hash(`week:${seed}:${i}`)%9000000);}

export function newWeek(rnd=Math.random){const seed=1000+Math.floor(rnd()*9000);
 return{seed,day:0,days:weekDays(seed),shifts:[],standing:{},started:null,live:null,kit:[],nights:{}};}

// ── the save ─────────────────────────────────────────────────────────────
const store=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function loadWeek(s=store()){try{const v=JSON.parse(s?.getItem(KEY)||'null');return v&&typeof v==='object'&&Array.isArray(v.shifts)?v:null;}catch{return null;}}
export function saveWeek(w,s=store()){try{s?.setItem(KEY,JSON.stringify(w));}catch{}return w;}
export function clearWeek(s=store()){try{s?.removeItem(KEY);}catch{}}

export const isOver=w=>!!w&&w.day>=LENGTH;
export const total=w=>(w?.shifts||[]).reduce((a,x)=>a+(x.euros||0),0);

// Where a week stands when the page opens. A shift that was STARTED and never
// finished is closed here with whatever it had banked — the reload is the
// clock-out. Returns the week to play (a fresh one when there is none, or when
// the last one is over and `fresh` is asked for).
export function resume(s=store(),rnd=Math.random){let w=loadWeek(s);
 if(w&&w.started!=null&&w.started===w.day){w=close(w,w.live||{score:0,results:[]},true);saveWeek(w,s);}
 if(!w){w=newWeek(rnd);saveWeek(w,s);}
 return w;}

// Today's shift, as the game needs it.
export function today(w){const i=Math.min(w.day,LENGTH-1);
 return{index:i,name:DAY_NAMES[i],seed:shiftSeedFor(w.seed,i),day:w.days[i]};}

// START SHIFT marks the day begun; every delivery after that updates `live`,
// so leaving at any moment leaves an honest record behind.
export function begin(w){if(isOver(w))return w;w.started=w.day;w.live={score:0,results:[]};return w;}
export function progress(w,{score,results}){if(w.started!==w.day)return w;w.live={score:score||0,results:[...(results||[])]};return w;}
// The shift ends — finished, or left. Only the day it belongs to can close it.
export function close(w,{score,results,drops=0,tips=0},left=false){if(isOver(w))return w;
 const i=w.day;w.shifts[i]={name:DAY_NAMES[i],day:w.days[i],score:score||0,euros:euros(score),results:[...(results||[])],drops,tips,left};
 w.day=i+1;w.started=null;w.live=null;return w;}

// Friday night.
export function verdict(w){const t=total(w);return{total:t,rent:RENT,paid:t>=RENT,over:t-RENT};}
// How far behind or ahead of a pace that pays the rent — the number that makes
// Wednesday's shift feel like Wednesday's.
export function pace(w){const done=w.shifts.length,t=total(w);return{done,total:t,need:Math.max(0,RENT-t),perDay:done<LENGTH?Math.ceil(Math.max(0,RENT-t)/(LENGTH-done)):0};}

// ── the kit, one night at a time (kit.js) ──────────────────────────────
// The night before shift `day` offers three things. The offer is SAVED the
// first time it is shown, so a reload cannot reroll it, and it is taken once.
// A week saved before v2.48 has no kit and gets it the first time it is asked.
export const owned=w=>w?.kit||[];
export function night(w){if(!w||isOver(w)||w.day<1)return null;w.nights=w.nights||{};w.kit=w.kit||[];
 const n=w.nights[w.day]||(w.nights[w.day]={offers:kitOffers(w.seed,w.day,w.kit),pick:null});return n;}
export const pending=w=>{const n=night(w);return !!(n&&!n.pick&&n.offers.length);};
export function choose(w,id){const n=night(w);if(!n||n.pick||!n.offers.includes(id))return false;n.pick=id;w.kit.push(id);return true;}

// ── the line you send ────────────────────────────────────────────────────
const GLYPH={ok:'🟩',late:'🟨',none:'⬛'};
export function dayGrid(results=[],target=3){let s='';for(let i=0;i<target;i++)s+=GLYPH[results[i]]||GLYPH.none;return s;}
export function shareText(w,url=''){const v=verdict(w);
 const rows=w.shifts.map(x=>`${x.name.slice(0,3)} ${dayGrid(x.results)} €${x.euros}${x.left?' (left)':''}`);
 const kit=owned(w).map(id=>KIT_BY_ID[id]?.glyph||'').join('');
 return [`Toko Move · week ${w.seed}`,...rows,kit?`kit ${kit}`:null,v.paid?`rent paid · €${v.over} over`:`short €${-v.over} on the rent`,url||null].filter(Boolean).join('\n');}

// A regulars store scoped to the week: the game's standing code reads and
// writes through it unchanged.
export function standingStore(w,s=store()){return{getItem:()=>JSON.stringify(w.standing||{}),setItem:(k,v)=>{try{w.standing=JSON.parse(v);}catch{}saveWeek(w,s);}};}
