// Toko Live conversation continuity: keep a compact 20-turn semantic thread.
const KEY='tokoLive.context.v3';
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const STOP=new Set('the a an and or but if then this that these those it its they them their we you i me my our your is are was were be been being to of in on for with from at by as about what why how when where who do does did should would could can will more next go tell think thing things really just very'.split(' '));
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
const projectFrom=s=>PROJECTS.find(p=>String(s||'').toLowerCase().includes(p.toLowerCase()))||null;
const isNews=s=>/\b(news|headline|story|source|announcement|release|industry|market|current events?)\b/i.test(String(s||''));
function keywords(s){const counts={};String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).forEach(w=>{if(w.length<4||STOP.has(w))return;counts[w]=(counts[w]||0)+1});return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(x=>x[0])}
function snapshot(){
  const nodes=[...document.querySelectorAll('.toko-chat .tc-log .tc-you,.toko-chat .tc-log .tc-me')].slice(-40);
  const turns=nodes.map(n=>({who:n.classList.contains('tc-you')?'you':'toko',text:(n.textContent||'').trim()})).filter(x=>x.text);
  const previous=read();let project=previous.project||null,mode=previous.mode||'general';
  for(let i=turns.length-1;i>=0;i--){const p=projectFrom(turns[i].text);if(p){project=p;break}}
  const recent=turns.slice(-12).map(x=>x.text).join(' ');if(isNews(recent))mode='news';else if(project)mode='project';else mode='general';
  const lastYou=[...turns].reverse().find(x=>x.who==='you')?.text||previous.lastYou||'';
  const lastToko=[...turns].reverse().find(x=>x.who==='toko')?.text||previous.lastToko||'';
  const userTurns=turns.filter(x=>x.who==='you').slice(-10).map(x=>x.text),tokoTurns=turns.filter(x=>x.who==='toko').slice(-10).map(x=>x.text);
  const subjects=keywords([...userTurns,...tokoTurns].join(' '));
  const value={project,mode,lastYou,lastToko,subjects,userTurns,tokoTurns,turnCount:turns.length,updated:Date.now()};write(value);return value;
}
function boot(){const root=document.querySelector('.toko-chat');if(!root)return requestAnimationFrame(boot);const log=root.querySelector('.tc-log');if(!log)return requestAnimationFrame(boot);const refresh=()=>{const v=snapshot();dispatchEvent(new CustomEvent('toko:context',{detail:v}))};new MutationObserver(refresh).observe(log,{childList:true,subtree:true,characterData:true});refresh()}
window.TokoLiveContext={read,snapshot,projectFrom,isNews,keywords};boot();