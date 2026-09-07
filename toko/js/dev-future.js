// Toko development future: separates explicit queue facts from roadmap inference.
import { findProject } from './project-knowledge.js';

const clean=s=>String(s||'').trim();
export function parseQueue(md=''){
  const starts=[...String(md).matchAll(/^###\s+(Q-\d+)\s+—\s+(.+)$/gm)];const items=[];
  starts.forEach((m,i)=>{const body=String(md).slice((m.index||0)+m[0].length,starts[i+1]?.index??String(md).length);const status=(body.match(/^- status:\s*([^\n]+)/m)||[])[1]||'Unknown';const repo=(body.match(/^- repo:\s*([^\n]+)/m)||[])[1]||'unknown';items.push({id:m[1],title:clean(m[2]),status:clean(status.replace(/\*\*/g,'')),repo:clean(repo),body:clean(body)})});
  return items;
}
export async function loadQueue(url='../QUEUE.md'){
  try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return {ok:true,url,items:parseQueue(await r.text())}}catch(error){return {ok:false,url,items:[],error:String(error)}}
}
export function classifyQueue(items=[]){const bucket={queued:[],progress:[],blocked:[],landed:[],dropped:[]};for(const x of items){const s=x.status.toLowerCase();if(s.includes('in progress'))bucket.progress.push(x);else if(s.includes('blocked'))bucket.blocked.push(x);else if(s.includes('landed'))bucket.landed.push(x);else if(s.includes('dropped'))bucket.dropped.push(x);else if(s.includes('queued'))bucket.queued.push(x)}return bucket}
export async function queueLines(raw=''){
  const p=findProject(raw);const q=await loadQueue();if(!q.ok)return['QUEUE SOURCE UNAVAILABLE.','I WILL NOT INVENT A QUEUE FROM A ROADMAP.'];const b=classifyQueue(q.items);
  if(p&&p.id!=='tokodrop'&&p.id!=='toko-drop')return[`${p.title.toUpperCase()} HAS NO REGISTERED FORMAL QUEUE IN MY CURRENT SOURCE SET.`,`ITS ROADMAP IS NOT THE SAME THING AS QUEUED WORK. ASK "PREDICT ${p.title}" IF YOU WANT MY INFERENCE.`];
  const lines=['TOKO DROP — FORMAL QUEUE'];if(b.progress.length)lines.push(`IN PROGRESS: ${b.progress.map(x=>`${x.id} ${x.title}`).join(' · ')}`);if(b.queued.length)lines.push(`QUEUED: ${b.queued.map(x=>`${x.id} ${x.title}`).join(' · ')}`);if(!b.progress.length&&!b.queued.length)lines.push('NOTHING IS CURRENTLY QUEUED OR IN PROGRESS IN THE ROOT QUEUE.');if(b.blocked.length)lines.push(`BLOCKED: ${b.blocked.map(x=>x.id).join(', ')}`);if(b.landed.length)lines.push(`RECENT LANDED RECORDS: ${b.landed.slice(-4).map(x=>x.id).join(', ')}`);if(b.dropped.length)lines.push(`DROPPED BUT REMEMBERED: ${b.dropped.map(x=>x.id).join(', ')}`);lines.push('SOURCE: QUEUE.md · THIS IS FACT, NOT MY PREDICTION.');return lines
}
export function predictionLines(raw=''){
  const p=findProject(raw);if(!p)return['NAME A PROJECT AND I WILL TRY.'];const next=p.roadmap||[];if(!next.length)return[`${p.title.toUpperCase()} — MY GUESS`,'I DO NOT HAVE ENOUGH AUTHORED ROADMAP MATERIAL TO MAKE A USEFUL PREDICTION.'];const lines=[`${p.title.toUpperCase()} — LIKELY, NOT PROMISED`,next[0]];if(next[1])lines.push(`AFTER THAT, I WOULD WATCH: ${next[1]}`);if(p.constraints?.length)lines.push(`PRESSURE I WOULD NOT CROSS: ${p.constraints[0]}`);lines.push('SOURCE: ROADMAP/DESIGN SUMMARY · THIS IS TOKO INFERENCE, NOT QUEUED WORK.');return lines
}
const api={parseQueue,loadQueue,classifyQueue,queueLines,predictionLines};globalThis.TokoDevFuture=api;export default api;
