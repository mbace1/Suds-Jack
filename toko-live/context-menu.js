// Toko Live v19: keep the Sierra 1–4 interaction, but make entry choices contextual.
// This is intentionally additive so the shared counter can still expose its deeper tree elsewhere.
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const POOLS={
  next:p=>`What should we work on next in ${p}?`,
  critique:p=>`What's wrong with ${p}?`,
  decision:p=>`What did we decide about ${p}?`,
  design:p=>`Tell me the design of ${p}`,
  why:p=>`Why is ${p} designed this way?`,
  news:()=>`Latest news`,
};
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function recentProject(){
  const text=[...document.querySelectorAll('.toko-chat .tc-log p')].slice(-6).map(n=>n.textContent||'').join(' ');
  return PROJECTS.find(p=>text.toLowerCase().includes(p.toLowerCase()))||pick(PROJECTS);
}
function questions(){
  const p=recentProject(),other=pick(PROJECTS.filter(x=>x!==p));
  const candidates=[POOLS.next(p),POOLS.critique(p),POOLS.decision(p),POOLS.design(p),POOLS.why(p),POOLS.next(other),POOLS.critique(other),POOLS.news()];
  return [...new Set(candidates.sort(()=>Math.random()-.5))].slice(0,4);
}
function submit(q){const i=document.querySelector('.toko-chat .tc-say-row input');if(!i)return;i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}
function paint(){
  const menu=document.querySelector('.toko-chat .tc-menu');if(!menu||menu.dataset.liveContext==='1')return;
  menu.dataset.liveContext='1';menu.textContent='';
  questions().forEach((q,i)=>{const b=document.createElement('button');b.type='button';const n=document.createElement('b');n.textContent=`${i+1}. `;b.append(n,document.createTextNode(q));b.onclick=()=>submit(q);menu.appendChild(b)});
  const hint=document.querySelector('.toko-chat .tc-foot span:first-child');if(hint)hint.textContent='1-4 PICK · TYPE TO TALK · ESC LEAVE';
}
const root=document.querySelector('.toko-chat');if(root){new MutationObserver(()=>{const m=root.querySelector('.tc-menu');if(m&&!m.hidden&&m.dataset.liveContext!=='1')queueMicrotask(paint)}).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});paint()}
