// TOKO MIDORI GAMES — live source adapters v1.
// Fetches only public JSON endpoints that are usable directly from a browser.
// RSS/Atom and private feeds can be registered later through the same adapter API.

import wire from './news-wire.js';

const STATE_KEY='tokoNewsSourceState.v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

const SOURCES=new Map();

export function registerSource(source){
  if(!source?.id||typeof source.fetch!=='function') throw new Error('news source needs id + fetch()');
  SOURCES.set(source.id,source); return source;
}
export function listSources(){return [...SOURCES.values()].map(({fetch,...s})=>s)}
export function sourceState(){return read(STATE_KEY,{})}
function stamp(id,patch){const s=sourceState();s[id]={...(s[id]||{}),...patch};write(STATE_KEY,s)}

async function getJSON(url,opts={}){
  const r=await fetch(url,{headers:{Accept:'application/json'},...opts});
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

registerSource({
  id:'hn', label:'HACKER NEWS', category:'technology', live:true,
  async fetch(){
    const data=await getJSON('https://hn.algolia.com/api/v1/search_by_date?tags=story&hitsPerPage=30');
    return (data.hits||[]).filter(x=>x.title).map(x=>({
      id:`hn:${x.objectID}`, title:x.title, url:x.url||`https://news.ycombinator.com/item?id=${x.objectID}`,
      summary:'', source:'Hacker News', category:'technology', published:x.created_at
    }));
  }
});

registerSource({
  id:'helsinki-events', label:'HELSINKI EVENTS', category:'helsinki', live:true,
  async fetch(){
    const start=new Date().toISOString().slice(0,10);
    const url=`https://api.hel.fi/linkedevents/v1/event/?start=${start}&sort=start_time&page_size=30`;
    const data=await getJSON(url);
    return (data.data||[]).map(x=>{
      const name=x.name?.en||x.name?.fi||x.name?.sv||'Helsinki event';
      const desc=(x.short_description?.en||x.short_description?.fi||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      return {id:`hel:${x.id}`,title:name,url:x.info_url?.en||x.info_url?.fi||null,summary:desc,source:'Helsinki Linked Events',category:'helsinki',published:x.start_time||new Date().toISOString()};
    });
  }
});

export function registerJSONSource({id,label,category,url,map,items=x=>x}){
  return registerSource({id,label,category,live:true,async fetch(){const data=await getJSON(url);return (items(data)||[]).map(map).filter(Boolean)}});
}

export async function refreshSource(id){
  const source=SOURCES.get(id); if(!source) throw new Error(`unknown news source: ${id}`);
  stamp(id,{status:'loading',attempted:new Date().toISOString(),error:null});
  try{
    const items=await source.fetch();
    const tagged=items.map(x=>({...x,category:x.category||source.category,source:x.source||source.label}));
    const all=wire.ingest(tagged,source.id);
    stamp(id,{status:'ok',updated:new Date().toISOString(),count:tagged.length,error:null});
    return {source:id,count:tagged.length,all};
  }catch(err){
    stamp(id,{status:'error',error:String(err?.message||err),failed:new Date().toISOString()});
    return {source:id,count:0,error:String(err?.message||err)};
  }
}

export async function refreshAll({parallel=true}={}){
  const ids=[...SOURCES.keys()];
  if(parallel) return Promise.all(ids.map(refreshSource));
  const out=[]; for(const id of ids) out.push(await refreshSource(id)); return out;
}

let booted=false;
export async function bootLiveNews(){
  if(booted)return[];booted=true;
  if(typeof navigator!=='undefined'&&navigator.onLine===false)return[];
  return refreshAll();
}

const api={registerSource,registerJSONSource,listSources,sourceState,refreshSource,refreshAll,bootLiveNews};
globalThis.TokoNewsSources=api;

// Loaded after mind.js on Toko pages. One best-effort refresh per page session;
// offline/CORS failures never block the counter and are only recorded in state.
queueMicrotask(()=>bootLiveNews().catch(()=>{}));

export default api;
