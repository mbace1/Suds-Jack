// THE DAILY-SHIFT GATE (v2.45). Bare node.
//
// A daily shift makes three promises and each one is checkable: everyone who
// opens the game on the same date gets the same shift; the first finish is the
// result and a later one never overwrites it; and the line you send says what
// happened. The fourth check is the one that makes the other three worth
// anything — the JOBS really do differ between two days. v2.42 made the city
// day and the event deck follow the shift and left the dispatch alone, so a
// daily without this would have dealt identical work every morning.
import assert from 'node:assert';
import {dailyName,EPOCH,KEY,dateKey,dailyNumber,dailySeed,dateLabel,resolveShift,loadDaily,todayRecord,recordDaily,streak,grid,shareText,GLYPH} from '../js/daily.js';
import {DeliveryChallenge} from '../js/deliveries.js';

let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};const eq=(a,b,m)=>{assert.strictEqual(a,b,m);n++;};
const mem=()=>{const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),raw:m};};
const P=q=>new URLSearchParams(q);

// ── the calendar ─────────────────────────────────────────────────────────
eq(dateKey(new Date(2026,8,24,0,1)),'2026-09-24','a date is its LOCAL calendar day, just after midnight');
eq(dateKey(new Date(2026,8,24,23,59)),'2026-09-24','and just before the next one');
eq(dailyNumber(EPOCH),1,'the epoch is daily No. 1');
eq(dailyNumber('2026-09-24'),2,'the day after is No. 2');
eq(dailyNumber('2026-10-23'),31,'thirty days on is No. 31');
eq(dailyNumber('2027-03-29')-dailyNumber('2027-03-27'),2,'a daylight-saving weekend is still two days (EU clocks change 2027-03-28)');
eq(dailyNumber('2026-10-26')-dailyNumber('2026-10-24'),2,'and so is the autumn one (2026-10-25)');
eq(dateLabel('2026-09-24'),'24 Sep','a date reads as a person says it');

// ── the seed ─────────────────────────────────────────────────────────────
eq(dailySeed('2026-09-24'),dailySeed('2026-09-24'),'the same date is the same shift for everyone');
{const seeds=new Set();for(let i=0;i<365;i++){const d=new Date(Date.UTC(2026,8,24+i));seeds.add(dailySeed(d.toISOString().slice(0,10)));}
 ok(seeds.size>=360,`a year of dailies is a year of different shifts (${seeds.size} distinct in 365)`);
 ok([...seeds].every(s=>s>=100000&&s<1000000),'and a daily is never a small number a tester might have pinned');}

// ── which shift a visit is ───────────────────────────────────────────────
{const now=new Date(2026,8,23,9,0);
 const d=resolveShift(P(''),now);eq(d.kind,'daily','no parameter is TODAY');eq(d.number,1,'with its number');eq(d.seed,dailySeed('2026-09-23'),'and its seed');
 eq(resolveShift(P(''),new Date(2026,8,20)).number<1,true,'a clock set before the epoch has no daily number');
 const p=resolveShift(P('shift=4821'),now);eq(p.kind,'pinned','?shift=N pins one');eq(p.seed,4821,'to that number');
 const r=resolveShift(P('shift=random'),now,()=>0.5);eq(r.kind,'random','?shift=random deals a fresh one');eq(r.seed,5500,'from the rng');
 eq(resolveShift(P('shift=abc'),now).kind,'daily','a nonsense shift falls back to today, not to shift NaN');
 eq(resolveShift(P('shift=0'),now).kind,'daily','and so does zero');
 eq(resolveShift(P('shift=-3'),now).kind,'daily','and a negative one');}

// ── THE JOBS FOLLOW THE SHIFT ────────────────────────────────────────────
{const flow={graph:{node:()=>({x:0,y:0})},clock:{tick:0,ticksPerDay:3000}};
 const deal=seed=>{const c=new DeliveryChallenge(flow,()=>{});if(seed!=null)c.shiftSeed=seed;c.refreshOffers();return c.offers.map(o=>`${o.stops[1]}:${o.cargo}`).join(',');};
 const a=deal(dailySeed('2026-09-24')),b=deal(dailySeed('2026-09-25'));
 ok(a.length>0,'a challenge deals offers');
 ok(a!==b,`two days deal different work (${a.slice(0,40)}… vs ${b.slice(0,40)}…)`);
 eq(deal(dailySeed('2026-09-24')),a,'and the same day deals the same work, twice');
 eq(deal(null),deal(undefined),'no shift is the old dispatch');
 {const days=new Set();for(let i=0;i<30;i++)days.add(deal(dailySeed(`2026-10-${String(i+1).padStart(2,'0')}`)));
  ok(days.size>=25,`a month of dailies is a month of different boards (${days.size} of 30 distinct)`);}}

// ── the result is the FIRST finish ───────────────────────────────────────
{const s=mem(),k='2026-09-24';
 eq(todayRecord(k,s),null,'nothing recorded before you play');
 const one=recordDaily(k,{results:['ok','late'],target:3,drops:2,score:1842},s);
 eq(one.first,true,'the first finish is the result');eq(todayRecord(k,s).score,1842,'and it is kept');
 const two=recordDaily(k,{results:['ok','ok','ok'],target:3,drops:4,score:9999},s);
 eq(two.first,false,'a second finish is practice');eq(two.record.score,1842,'and hands back the result that stands');
 eq(todayRecord(k,s).score,1842,'a better practice run does not overwrite the day');
 ok(!Number.isNaN(JSON.parse(s.getItem(KEY))[k].at),'the record carries when it was set');
 const bad={getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');}};
 eq(recordDaily(k,{score:1},bad).first,true,'blocked storage still finishes the shift rather than throwing');
 eq(todayRecord(k,bad),null,'and reads as nothing recorded');
 const junk={getItem:()=>'not json',setItem(){}};eq(Object.keys(loadDaily(junk)).length,0,'a corrupt record reads as empty');}

// ── the streak counts back from TODAY ────────────────────────────────────
{const s=mem();for(const k of ['2026-09-24','2026-09-25','2026-09-26'])recordDaily(k,{score:1},s);
 eq(streak('2026-09-26',s),3,'three days in a row is three');
 eq(streak('2026-09-27',s),0,'and a day not yet played breaks it — counted from today, not from the last day played');
 recordDaily('2026-09-28',{score:1},s);eq(streak('2026-09-28',s),1,'a gap starts it again');
 const t=mem();for(let i=0;i<70;i++){const d=new Date(Date.UTC(2026,8,24+i));recordDaily(d.toISOString().slice(0,10),{score:1},t);}
 ok(Object.keys(loadDaily(t)).length<=60,`the record keeps the recent past and not every day ever (${Object.keys(loadDaily(t)).length})`);}

// ── the line you send ────────────────────────────────────────────────────
eq(grid(['ok','late'],3),`${GLYPH.ok}${GLYPH.late}${GLYPH.none}`,'a square per job on the ask: on time, late, never delivered');
eq(grid([],3),GLYPH.none.repeat(3),'a shift with nothing delivered is three empties, not an empty line');
{const t=shareText({number:1,label:'24 Sep',dayName:'MARKET MORNING',results:['ok','ok','late'],target:3,drops:2,score:1842,url:'https://mbace1.github.io/Suds-Jack/toko-move/'});
 const lines=t.split('\n');
 eq(lines[0],'Toko Move · Daily 1 · 24 Sep','the first line says which daily');
 ok(!/Daily -?0/.test(shareText({number:-2,label:'20 Sep',results:[],target:3})),'and a pre-epoch clock never shares a Daily 0 or a negative one');
 eq(lines[1],'MARKET MORNING','the second says which day it was');
 ok(lines[2].startsWith(`${GLYPH.ok}${GLYPH.ok}${GLYPH.late}`)&&/\+2📦/.test(lines[2])&&/1,842/.test(lines[2]),'the third is the grid, the drops and the score');
 ok(/^https:\/\//.test(lines[3])&&!/[?&]shift=/.test(lines[3]),'and the link is to TODAY, never to a pinned shift');
 ok(!/@|mailto|token/i.test(t),'nothing personal rides in the line');}
{const t=shareText({number:3,label:'26 Sep',results:[],target:3,score:0});
 ok(!/undefined|null|NaN/.test(t),'a shift with no city day and no drops still reads cleanly');}

console.log(`daily: ${n} checks passed`);
