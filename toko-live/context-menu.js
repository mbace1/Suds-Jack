// Toko Live v19: keep the Sierra 1–4 interaction and enforce it after every shared-counter render.
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
  const text=[...document.querySelectorAll('.toko-chat .tc-log p')].slice(-8).map(n=>n.textContent||'').join(' ');
  return PROJECTS.find(p=>text.toLowerCase().includes(p.toLowerCase()))||pick(PROJECTS);
}
function questions(){
  const p=recentProject(),other=pick(PROJECTS.filter(x=>x!==p));
  const candidates=[POOLS.next(p),POOLS.critique(p),POOLS.decision(p),POOLS.design(p),POOLS.why(p),POOLS.next(other),POOLS.critique(other),POOLS.news()];
  const shuffled=[...new Set(candidates)].sort(()=>Math.random()-.5);
  return shuffled.slice(0,3+Math.floor(Math.random()*2));
}
function submit(q){
  const i=document.querySelector('.toko-chat .tc-say-row input');if(!i)return;
  i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
}
let painting=false;
function isOurs(menu){
  const buttons=[...menu.querySelectorAll(':scope > button')];
  return buttons.length>=3&&buttons.length<=4&&buttons.every((b,i)=>b.dataset.liveContext==='1'&&b.textContent.trim().startsWith(`${i+1}.`));
}
function paint(){
  if(painting)return;
  const menu=document.querySelector('.toko-chat .tc-menu');if(!menu||menu.hidden||isOurs(menu))return;
  painting=true;
  const qs=questions();menu.textContent='';
  qs.forEach((q,i)=>{const b=document.createElement('button');b.type='button';b.dataset.liveContext='1';const n=document.createElement('b');n.textContent=`${i+1}. `;b.append(n,document.createTextNode(q));b.onclick=()=>submit(q);menu.appendChild(b)});
  const hint=document.querySelector('.toko-chat .tc-foot span:first-child');if(hint)hint.textContent='1-4 PICK · TYPE TO TALK · ESC LEAVE';
  painting=false;
}
const root=document.querySelector('.toko-chat');
if(root){
  const schedule=()=>queueMicrotask(paint);
  new MutationObserver(schedule).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
  paint();
}
