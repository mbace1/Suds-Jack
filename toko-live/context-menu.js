// Toko Live: enforce 3–4 numbered choices and derive them from the actual conversation.
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function ctx(){
  const c=window.TokoLiveContext?.snapshot?.()||window.TokoLiveContext?.read?.()||{};
  const text=[...document.querySelectorAll('.toko-chat .tc-log .tc-you,.toko-chat .tc-log .tc-me')].slice(-10).map(n=>n.textContent||'').join(' ');
  const p=c.project||PROJECTS.find(x=>text.toLowerCase().includes(x.toLowerCase()))||null;
  const news=c.mode==='news'||/\b(news|headline|story|source|announcement|current events?)\b/i.test(text);
  return {...c,project:p,news,text};
}
function buildChoices(){
  const c=ctx(),pool=[];
  // The current thread always gets first claim on the menu.
  if(c.news){
    pool.push('What do you think about that?','Why does it matter?','What is the source?','Next story.');
  } else if(c.project){
    pool.push('Why?','How would you fix it?',`What should we do next in ${c.project}?`,`What did we decide about ${c.project}?`);
    if(/design|intent|feel|look|mechanic|system/i.test(c.lastToko||c.text)) pool.push('What is the design intent behind that?');
    if(/problem|wrong|bug|weak|issue|glitch/i.test(c.lastToko||c.text)) pool.push('What is the biggest problem there?');
  } else if(c.lastToko||c.lastYou){
    pool.push('Go on.','Why?','What would you do next?','What else is connected to that?');
  }
  // Entry context: recent remembered work/decisions before generic discovery.
  if(!pool.length){
    const ds=window.TokoDecisionMemory?.read?.()||[];
    const recent=[...ds].reverse().find(x=>x.project&&x.project!=='GLOBAL');
    if(recent){const p=recent.project.replace(/\b\w/g,m=>m.toUpperCase());pool.push(`What changed recently in ${p}?`,`What did we decide about ${p}?`,`What should we do next in ${p}?`)}
    pool.push('What should we work on next?','What changed recently?','Latest news');
  }
  // News is available, but it does not hijack an active project discussion.
  if(!c.news&&Math.random()<0.22)pool.push('Anything important in the news?');
  const unique=[...new Set(pool)];
  // Keep strongest contextual items near the front, randomize only within that useful set.
  const head=unique.slice(0,Math.min(4,unique.length));
  for(let i=head.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[head[i],head[j]]=[head[j],head[i]]}
  const count=Math.min(head.length,3+Math.floor(Math.random()*2));
  return head.slice(0,Math.max(3,count));
}
function submit(q){const i=document.querySelector('.toko-chat .tc-say-row input');if(!i)return;i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}
let painting=false;
function ours(menu){const bs=[...menu.children].filter(n=>n.tagName==='BUTTON');return bs.length>=3&&bs.length<=4&&bs.every((b,i)=>b.dataset.liveContext==='1'&&b.textContent.trim().startsWith(`${i+1}.`))}
function paint(root){if(painting)return;const menu=root.querySelector('.tc-menu');if(!menu||menu.hidden||ours(menu))return;painting=true;const qs=buildChoices();menu.replaceChildren(...qs.map((q,i)=>{const b=document.createElement('button');b.type='button';b.dataset.liveContext='1';const n=document.createElement('b');n.textContent=`${i+1}. `;b.append(n,document.createTextNode(q));b.addEventListener('click',()=>submit(q));return b}));const hint=root.querySelector('.tc-foot span:first-child');if(hint)hint.textContent='1-4 PICK · TYPE TO TALK · ESC LEAVE';painting=false}
function attach(root){const schedule=()=>queueMicrotask(()=>paint(root));new MutationObserver(schedule).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});addEventListener('toko:context',schedule);schedule();setInterval(schedule,750)}
function wait(){const root=document.querySelector('.toko-chat');if(root)return attach(root);requestAnimationFrame(wait)}wait();
