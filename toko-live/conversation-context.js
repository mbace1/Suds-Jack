// Toko Live conversation continuity. Local-only, small and inspectable.
const KEY='tokoLive.context.v2';
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}};
const projectFrom=s=>PROJECTS.find(p=>String(s||'').toLowerCase().includes(p.toLowerCase()))||null;
const isNews=s=>/\b(news|headline|story|source|announcement|release|industry|market|current events?)\b/i.test(String(s||''));
function snapshot(){
  const nodes=[...document.querySelectorAll('.toko-chat .tc-log .tc-you,.toko-chat .tc-log .tc-me')].slice(-14);
  const turns=nodes.map(n=>({who:n.classList.contains('tc-you')?'you':'toko',text:(n.textContent||'').trim()})).filter(x=>x.text);
  const previous=read();let project=previous.project||null,mode=previous.mode||'general';
  for(let i=turns.length-1;i>=0;i--){const p=projectFrom(turns[i].text);if(p){project=p;break}}
  const recent=turns.slice(-6).map(x=>x.text).join(' ');if(isNews(recent))mode='news';else if(project)mode='project';
  const lastYou=[...turns].reverse().find(x=>x.who==='you')?.text||previous.lastYou||'';
  const lastToko=[...turns].reverse().find(x=>x.who==='toko')?.text||previous.lastToko||'';
  const value={project,mode,lastYou,lastToko,updated:Date.now()};write(value);return value;
}
function boot(){const root=document.querySelector('.toko-chat');if(!root)return requestAnimationFrame(boot);const log=root.querySelector('.tc-log');if(!log)return requestAnimationFrame(boot);const refresh=()=>{const v=snapshot();dispatchEvent(new CustomEvent('toko:context',{detail:v}))};new MutationObserver(refresh).observe(log,{childList:true,subtree:true,characterData:true});refresh()}
window.TokoLiveContext={read,snapshot,projectFrom,isNews};boot();
