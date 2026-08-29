// Toko Live: always show only 3–4 numbered choices, driven by what is being discussed.
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const pick=a=>a[Math.floor(Math.random()*a.length)];
function transcript(){return [...document.querySelectorAll('.toko-chat .tc-log p')].slice(-10).map(n=>n.textContent||'').join(' ').trim()}
function projectIn(text){return PROJECTS.find(p=>text.toLowerCase().includes(p.toLowerCase()))||null}
function buildChoices(){
  const text=transcript(),p=projectIn(text),low=text.toLowerCase();
  const pool=[];
  if(p){
    pool.push(`What should we work on next in ${p}?`,`What's wrong with ${p}?`,`What did we decide about ${p}?`,`Why is ${p} designed this way?`);
  }
  if(/news|latest|today|current|industry|market|release|announcement/.test(low)){
    pool.push('What matters in the news right now?','What do you think about that news?','Anything else happening around this?');
  }
  if(/why|because|reason|intent|designed/.test(low)) pool.push('Why do you think that?','What is the design intent behind that?');
  if(/next|should|recommend|work on|priority/.test(low)) pool.push('What would you do next?','What should we prioritize first?');
  if(/wrong|problem|issue|bug|weak|critique/.test(low)) pool.push('What is the biggest problem with that?','How would you fix it?');
  if(/decid|agreed|remember|last time/.test(low)) pool.push('What did we decide exactly?','Has anything changed since that decision?');
  if(text) pool.push('Go on.','Why?','What else is connected to that?');
  else pool.push('What are you thinking about?','What changed recently?','What should we work on next?','Latest news');
  if(!pool.some(q=>/news/i.test(q)) && Math.random()<0.35) pool.push('Latest news');
  const unique=[...new Set(pool)];
  unique.sort(()=>Math.random()-.5);
  return unique.slice(0,3+Math.floor(Math.random()*2));
}
function submit(q){const i=document.querySelector('.toko-chat .tc-say-row input');if(!i)return;i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}
let painting=false;
function isOurs(menu){const bs=[...menu.children].filter(n=>n.tagName==='BUTTON');return bs.length>=3&&bs.length<=4&&bs.every((b,i)=>b.dataset.liveContext==='1'&&b.textContent.trim().startsWith(`${i+1}.`))}
function paint(root){
  if(painting)return;const menu=root.querySelector('.tc-menu');if(!menu||menu.hidden||isOurs(menu))return;
  painting=true;const qs=buildChoices();menu.replaceChildren(...qs.map((q,i)=>{const b=document.createElement('button');b.type='button';b.dataset.liveContext='1';const n=document.createElement('b');n.textContent=`${i+1}. `;b.append(n,document.createTextNode(q));b.addEventListener('click',()=>submit(q));return b}));
  const hint=root.querySelector('.tc-foot span:first-child');if(hint)hint.textContent='1-4 PICK · TYPE TO TALK · ESC LEAVE';painting=false;
}
function attach(root){const schedule=()=>queueMicrotask(()=>paint(root));new MutationObserver(schedule).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});schedule()}
function waitForChat(){const root=document.querySelector('.toko-chat');if(root){attach(root);return}const mo=new MutationObserver(()=>{const r=document.querySelector('.toko-chat');if(r){mo.disconnect();attach(r)}});mo.observe(document.body,{childList:true,subtree:true})}
waitForChat();
