// Toko Move — THE DAILY SHIFT (roadmap NEXT LEVEL, L3).
//
// One shift for everyone, today. The date is the seed, so every player who
// opens the game on the 24th gets the same city day, the same jobs, the same
// event deck and the same rival, and the result is a line they can paste to
// someone who played it too — Wordle's shape on a game that already had a
// shift number (v2.42). It is the cheapest reason this game could have to be
// opened tomorrow, and it is built out of nothing but that number.
//
// Three rules, each the answer to a way the shape goes wrong:
//
//   THE FIRST FINISH IS THE RESULT. Replaying today's shift is allowed and is
//   PRACTICE: it never overwrites the daily, because a result you can retry
//   until it is good is not a result anyone can compare.
//
//   THE DATE IS THE PLAYER'S OWN. Local calendar, as Wordle does it: a player
//   in Helsinki and one in Tokyo get "today" when their today starts, and two
//   people comparing results are almost always in the same place.
//
//   NOTHING LEAVES THE BROWSER. The result is kept in localStorage and the
//   share line is text you send yourself. No server, no leaderboard — the same
//   line the arcade's score wall holds.
//
// Pure: no DOM, no clock of its own (the date is passed in), storage injected,
// so test/daily.mjs asserts all of it in bare node.
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};

export const EPOCH='2026-09-23';          // daily No. 1 — the day it shipped
// A clock set before the epoch would read "Daily 0" or "Daily -4". The number
// is dropped rather than faked: two different days both called No. 1 would be
// worse than a daily with no number.
export const dailyName=number=>number>0?`Daily ${number}`:'Daily';
export const KEY='tokoMoveDaily';

export function dateKey(d=new Date()){const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
// Days between two calendar keys, counted on UTC midnights so a daylight-saving
// change can never make two consecutive dates 23 or 25 hours apart.
const dayIndex=k=>{const [y,m,d]=k.split('-').map(Number);return Math.round(Date.UTC(y,m-1,d)/86400000);};
export function dailyNumber(key){return dayIndex(key)-dayIndex(EPOCH)+1;}
// Six digits and never a small number, so a daily can never be the same shift
// as a pinned `?shift=7` a tester is holding in another tab.
export function dailySeed(key){return 100000+(hash(`daily:${key}`)%900000);}
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export function dateLabel(key){const [,m,d]=key.split('-').map(Number);return `${d} ${MONTHS[m-1]}`;}

// Which shift this visit is. `?shift=N` pins one (testers, bots, "try shift
// 4821"); `?shift=random` is a fresh one; no parameter is TODAY.
export function resolveShift(params,now=new Date(),rnd=Math.random){
 const raw=params?.get?.('shift');
 if(raw==='random')return{kind:'random',seed:1000+Math.floor(rnd()*9000)};
 const n=Number(raw);
 if(raw!=null&&raw!==''&&Number.isFinite(n)&&n>0)return{kind:'pinned',seed:Math.floor(n)};
 const key=dateKey(now);
 return{kind:'daily',seed:dailySeed(key),key,number:dailyNumber(key),label:dateLabel(key)};}

// ── the record ───────────────────────────────────────────────────────────
const store=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function loadDaily(s=store()){try{const v=JSON.parse(s?.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return{};}}
export function todayRecord(key,s=store()){return loadDaily(s)[key]||null;}
// Returns whether THIS finish became the day's result. Only the first does.
export function recordDaily(key,result,s=store()){const all=loadDaily(s);if(all[key])return{first:false,record:all[key]};
 all[key]={...result,at:Date.now()};
 // keep the last sixty days; a streak needs the recent past, not every day ever
 const keys=Object.keys(all).sort();for(const k of keys.slice(0,Math.max(0,keys.length-60)))delete all[k];
 try{s?.setItem(KEY,JSON.stringify(all));}catch{}
 return{first:true,record:all[key]};}
// Consecutive days with a result, counted back from TODAY — the arcade's own
// rule, learned there: counted from the most recent day instead, a streak that
// ended in March still shows in July.
export function streak(key,s=store()){const all=loadDaily(s);let n=0,k=dayIndex(key);
 const toKey=i=>{const d=new Date(i*86400000);const p=x=>String(x).padStart(2,'0');return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}`;};
 while(all[toKey(k)]){n++;k--;}return n;}

// ── the line you send ────────────────────────────────────────────────────
// A square per job on the shift's ask: on time, late, never delivered. Drops
// ride after it as a count, because they are extra and the grid is the ask.
export const GLYPH={ok:'🟩',late:'🟨',none:'⬛'};
export function grid(results=[],target=3){const out=[];for(let i=0;i<target;i++)out.push(GLYPH[results[i]]||GLYPH.none);return out.join('');}
export function shareText({number,label,dayName,results,target,drops=0,score=0,url=''}){
 const head=`Toko Move · ${dailyName(number)} · ${label}`;
 const body=`${grid(results,target)}${drops?` +${drops}📦`:''} · ${Number(score).toLocaleString('en-US')}`;
 return [head,dayName?`${dayName}`:null,body,url||null].filter(Boolean).join('\n');}
