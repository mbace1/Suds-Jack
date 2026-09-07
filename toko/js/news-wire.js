// TOKO MIDORI GAMES — shared news wire v1
// One normalized feed for Toko Assistant and Helsinki Free Radio.
// Feed facts stay separate from Toko's commentary.

const FEEDS_KEY='tokoNewsFeeds.v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

export const DEFAULT_FEEDS=[
  {id:'games',label:'GAMES',category:'games',enabled:true},
  {id:'industry',label:'INDUSTRY',category:'industry',enabled:true},
  {id:'technology',label:'TECH',category:'technology',enabled:true},
  {id:'art',label:'ART / CULTURE',category:'art',enabled:true},
  {id:'helsinki',label:'HELSINKI',category:'helsinki',enabled:true}
];

export function feedSettings(){return read(FEEDS_KEY,DEFAULT_FEEDS)}
export function setFeedEnabled(id,enabled){const feeds=feedSettings().map(f=>f.id===id?{...f,enabled:!!enabled}:f);write(FEEDS_KEY,feeds);return feeds}
export function normalizeStory(item,source='unknown'){
  const title=String(item?.title||'').trim(); if(!title)return null;
  return {id:item.id||`${source}:${item.url||title}`,title,url:item.url||null,summary:String(item.summary||'').trim(),source:item.source||source,category:item.category||'games',published:item.published||new Date().toISOString(),factual:true};
}
export function ingest(items,source='unknown'){
  const normalized=(Array.isArray(items)?items:[]).map(x=>normalizeStory(x,source)).filter(Boolean);
  return globalThis.TokoMind?.ingestNews?.(normalized,source)||normalized;
}

const COMMENTARY=[
  [/layoff|job cuts|redundan|closure|shut down/i,'A studio is people before it is a logo. Efficiency language can make human loss sound like a spreadsheet formatting change.'],
  [/acqui|merger|bought|purchase/i,'Ownership changes incentives before it changes pixels. Watch what becomes easier to approve, and what becomes harder.'],
  [/ai|artificial intelligence|generative/i,'The tool is less interesting than the responsibility chain: who chose it, who edited it, who is credited, and who answers for the result.'],
  [/live.service|battle.pass|season.pass|moneti|microtransaction/i,'Commerce is part of games. The problem begins when keeping the player becomes more important than giving the player something worth keeping.'],
  [/delay|delayed|postpone/i,'A delay is not automatically bad news. Shipping on a calendar is not a creative virtue.'],
  [/cancel|cancelled|canceled/i,'Cancellation hides two stories: the work that will never meet its audience, and what the organization learned too late.'],
  [/indie|independent/i,'Independent describes financing and control. It does not guarantee courage, originality or smallness.'],
  [/museum|gallery|exhibition|art /i,'Games belong comfortably beside other art when nobody asks them to disguise their rules, inputs and failures as cinema.'],
  [/helsinki|finland|finnish/i,'Local scenes matter because people, studios, bars, schools and accidents keep colliding in the same physical place. Culture needs geography sometimes.']
];
export function tokoCommentary(story){const hay=`${story?.title||''} ${story?.summary||''}`;for(const[re,line]of COMMENTARY)if(re.test(hay))return line;return 'A headline tells us what changed. The interesting part is what behaviour, incentive or possibility changes because of it.'}
export function storyLines(story,{withComment=true}={}){if(!story)return['NO STORY SELECTED.'];const age=story.published?new Date(story.published).toLocaleDateString():'';const lines=[story.title.toUpperCase(),`${story.source}${age?` · ${age}`:''}`,story.summary||'NO SUMMARY IN THE WIRE.'];if(withComment)lines.push('',`TOKO: ${tokoCommentary(story)}`);return lines}
export function radioItem(story){return {type:'news',headline:story.title,source:story.source,url:story.url,summary:story.summary,category:story.category,published:story.published,commentary:tokoCommentary(story)}}
export function radioQueue({limit=12,categories=null}={}){let stories=globalThis.TokoMind?.news?.({limit:120})||[];const enabled=new Set(feedSettings().filter(f=>f.enabled).map(f=>f.category));stories=stories.filter(s=>enabled.has(s.category));if(categories?.length)stories=stories.filter(s=>categories.includes(s.category));return stories.slice(0,limit).map(radioItem)}

const api={ingest,normalizeStory,feedSettings,setFeedEnabled,tokoCommentary,storyLines,radioItem,radioQueue};
globalThis.TokoNewsWire=api;
export default api;
