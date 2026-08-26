// TOKO MIDORI GAMES — cross-game awareness.
// Reads the catalogue's declared score keys plus the shared local play log.
// No game-specific imports, no network, no hidden scanning of unrelated storage.
import { GAMES } from '../../hub/games.js';
import { readPlayLog, favourites, setFavourite } from '../../hub/playlog.js';

const getRaw=k=>{try{return localStorage.getItem(k)}catch{return null}};
const parse=v=>{if(v==null)return null;try{return JSON.parse(v)}catch{return v}};
const scoreOf=g=>{if(!g.score?.key)return null;const raw=parse(getRaw(g.score.key));const n=typeof raw==='number'?raw:parseFloat(raw);return Number.isFinite(n)&&n>0?n:null};
const label=g=>g.title||g.id;
const fmt=(g,n)=>g.score?.fmt==='secs'?`${Number(n).toFixed(2)} sec`:`${Math.round(n)} pts`;
const mins=s=>s<60?`${s}s`:`${Math.round(s/60)} min`;

export function snapshot(){
  const log=readPlayLog({limit:240}); const fav=new Set(favourites());
  const games=GAMES.map(g=>{
    const events=log.filter(x=>x.game===g.id), sessions=events.filter(x=>x.type==='session');
    const last=events.at(-1)||null;
    const sessionSeconds=sessions.map(x=>Number(x.seconds)||0).filter(Boolean);
    return {id:g.id,title:label(g),lineage:g.lineage||'',tags:g.tags||[],best:scoreOf(g),scoreFmt:g.score?.fmt||null,visits:events.filter(x=>x.type==='visit').length,runs:events.filter(x=>x.type==='run'||x.type==='start').length,failures:events.filter(x=>x.type==='failure'||x.type==='death'||x.type==='gameover').length,seconds:sessionSeconds.reduce((n,x)=>n+x,0),sessions:sessions.length,avgSession:sessionSeconds.length?Math.round(sessionSeconds.reduce((a,b)=>a+b,0)/sessionSeconds.length):0,lastPlayed:last?.at||null,favourite:fav.has(g.id)};
  });
  let days=[];try{days=parse(getRaw('sudsJackHubDays'))||[]}catch{}
  return {games,days:Array.isArray(days)?days:[],credits:Number(parse(getRaw('sudsJackHubCredits'))||0),tickets:Number(parse(getRaw('sudsJackHubTickets'))||0)};
}
export function playedGames(){return snapshot().games.filter(g=>g.best!=null||g.visits>0||g.runs>0||g.failures>0||g.seconds>0||g.favourite)}
export function findGame(raw){const q=String(raw||'').toLowerCase();return GAMES.find(g=>q.includes(g.id.toLowerCase())||q.includes(String(g.title||'').toLowerCase()))||null}
export function favouriteGame(raw,on=true){const g=findGame(raw);if(!g)return null;setFavourite(g.id,on);return {id:g.id,title:label(g),on}}

function observation(g,all){
  const byTime=all.slice().sort((a,b)=>b.seconds-a.seconds);
  const byVisits=all.slice().sort((a,b)=>b.visits-a.visits);
  if(g.seconds>0&&byTime[0]?.id===g.id&&all.filter(x=>x.seconds>0).length>1)return'YOU SPEND THE MOST TIME HERE.';
  if(g.visits>=3&&byVisits[0]?.id===g.id)return'YOU KEEP COMING BACK TO THIS ONE.';
  if(g.avgSession>=600)return'YOUR SESSIONS HERE ARE LONG. THIS IS NOT A DRIVE-BY GAME FOR YOU.';
  if(g.failures>=3)return'YOU HAVE FAILED HERE ENOUGH TIMES FOR IT TO BE INFORMATION, NOT AN ACCIDENT.';
  if(g.favourite)return'YOU CALLED THIS ONE A FAVOURITE. I WILL HOLD YOU TO THAT.';
  return null;
}

export function reflectionLines(){
  const played=playedGames();
  if(!played.length)return['NOT ENOUGH EVIDENCE YET.','PLAY SOMETHING. I WOULD RATHER LEARN FROM BEHAVIOUR THAN ASK YOU TO FILL OUT A PROFILE.'];
  const byTime=played.filter(x=>x.seconds>0).sort((a,b)=>b.seconds-a.seconds);
  const byReturn=played.slice().sort((a,b)=>b.visits-a.visits);
  const fav=played.filter(x=>x.favourite);
  const lines=['A FEW THINGS I NOTICE:'];
  if(byTime[0]) lines.push(`${byTime[0].title.toUpperCase()} GETS THE MOST OF YOUR TIME${byTime[0].avgSession?` — ABOUT ${mins(byTime[0].avgSession)} A SESSION`:''}.`);
  if(byReturn[0]?.visits>=3) lines.push(`${byReturn[0].title.toUpperCase()} IS THE ONE YOU RETURN TO MOST.`);
  if(fav.length) lines.push(`YOU HAVE CALLED ${fav.map(x=>x.title.toUpperCase()).join(', ')} ${fav.length===1?'A FAVOURITE':'FAVOURITES'}. THAT IS WHAT YOU SAY. THE TIME LOG IS WHAT YOU DO.`);
  const playedTags=new Map();for(const g of played)for(const t of g.tags||[])playedTags.set(t,(playedTags.get(t)||0)+1);
  const topTags=[...playedTags.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(([t])=>t);
  if(topTags.length)lines.push(`YOU KEEP TOUCHING ${topTags.map(x=>x.toUpperCase()).join(' / ')} GAMES.`);
  lines.push('THIS IS NOT A DIAGNOSIS. IT IS JUST A MIRROR MADE FROM BUTTON PRESSES.');
  return lines;
}

export function summaryLines(){
  const played=playedGames();
  if(!played.length)return['I CAN SEE THE CATALOGUE, BUT NOT ENOUGH PLAY HISTORY YET.','Scores already saved by the games will appear here. New sessions also leave coarse local visit and duration evidence.'];
  const ranked=played.slice().sort((a,b)=>(b.seconds/30+b.visits+b.runs+(b.best!=null?1:0))-(a.seconds/30+a.visits+a.runs+(a.best!=null?1:0)));
  const lines=[`I HAVE SIGNAL FROM ${played.length} GAME${played.length===1?'':'S'} ON THIS DEVICE.`];
  for(const g of ranked.slice(0,5)){
    const bits=[];if(g.best!=null)bits.push(`BEST ${fmt(GAMES.find(x=>x.id===g.id),g.best)}`);if(g.visits)bits.push(`${g.visits} VISIT${g.visits===1?'':'S'}`);if(g.seconds)bits.push(`${mins(g.seconds)} PLAY`);if(g.failures)bits.push(`${g.failures} FAILURE${g.failures===1?'':'S'}`);if(g.favourite)bits.push('FAVOURITE');lines.push(`${g.title.toUpperCase()} — ${bits.join(' · ')||'SEEN'}`);
  }
  const top=ranked[0], note=top&&observation(top,played);if(note)lines.push(note);return lines;
}
export function gameLines(raw){
  const g0=findGame(raw);if(!g0)return null;const all=snapshot().games,g=all.find(x=>x.id===g0.id);const lines=[g.title.toUpperCase()];
  if(g.best!=null)lines.push(`YOUR BEST HERE: ${fmt(g0,g.best)}.`);
  if(g.visits||g.runs||g.seconds)lines.push(`LOCAL LOG: ${g.visits} VISITS${g.runs?` · ${g.runs} RUNS`:''}${g.seconds?` · ${mins(g.seconds)} PLAY`:''}${g.avgSession?` · AVG ${mins(g.avgSession)}`:''}.`);
  if(g.failures)lines.push(`FAILURES REMEMBERED: ${g.failures}.`);
  if(g.favourite)lines.push('YOU MARKED THIS ONE AS A FAVOURITE.');
  const note=observation(g,all.filter(x=>x.visits||x.seconds||x.best!=null||x.favourite));if(note)lines.push(note);
  if(g.lineage)lines.push(`ITS DECLARED LINEAGE: ${g.lineage}.`);
  if(lines.length===1)lines.push('I KNOW THIS CABINET, BUT IT HAS NOT LEFT MUCH LOCAL EVIDENCE YET.');return lines;
}
const api={snapshot,playedGames,findGame,favouriteGame,summaryLines,gameLines,reflectionLines};globalThis.TokoPlayAwareness=api;export default api;
