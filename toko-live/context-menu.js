// Toko Live: 3–4 numbered choices generated from the actual current answer/thread.
const PROJECTS=['Tiny Hawk','Eeri','Piritori','Betterment','Hyper Dagger','Suds Jack','Flash Prince','Toko Drop'];
const cap=s=>s?`${s.charAt(0).toUpperCase()}${s.slice(1)}`:'';
function ctx(){const c=window.TokoLiveContext?.snapshot?.()||{};const text=[...document.querySelectorAll('.toko-chat .tc-log .tc-you,.toko-chat .tc-log .tc-me')].slice(-14).map(n=>n.textContent||'').join(' ');const p=c.project||PROJECTS.find(x=>text.toLowerCase().includes(x.toLowerCase()))||null;return {...c,project:p,news:c.mode==='news'||/\b(news|headline|story|source|announcement)\b/i.test(c.lastToko||text),text}}
function semanticPrompts(c){const a=String(c.lastToko||''),low=a.toLowerCase(),out=[];
 if(/risk|problem|weak|failure|danger|glitch|issue|break/.test(low))out.push('How would you fix that?');
 if(/next|first|then|after|priority|move|action/.test(low))out.push('Why that first?');
 if(/camera|visual|art|style|look|silhouette|readability|contrast/.test(low))out.push('What should that look like in practice?');
 if(/control|movement|jump|climb|dash|shoot|combat|mechanic|system|loop/.test(low))out.push('How would you test whether that works?');
 if(/player|experience|feel|pressure|read|understand/.test(low))out.push('What should the player actually feel?');
 if(/avoid|resist|not |without|before/.test(low))out.push('What happens if we do the opposite?');
 const subject=(c.subjects||[]).find(x=>x.length>4);if(subject)out.push(`Go deeper on ${subject}.`);
 return out}
function buildChoices(){const c=ctx(),pool=[];
 if(c.news){pool.push('What do you think about that?','Why does it matter?','What is the source?','What does this change?')}
 else{pool.push(...semanticPrompts(c));if(c.project){pool.push(`What should we do next in ${c.project}?`,`What is the biggest risk in ${c.project}?`,`What did we decide about ${c.project}?`)}else if(c.lastToko||c.lastYou){pool.push('Why?','Go deeper.','What would you change?','What else is connected to that?')}}
 if(!pool.length){const ds=window.TokoDecisionMemory?.read?.()||[],recent=[...ds].reverse().find(x=>x.project&&x.project!=='GLOBAL');if(recent){const p=cap(recent.project.toLowerCase());pool.push(`What changed recently in ${p}?`,`What should we do next in ${p}?`)}pool.push('What should we work on next?','What changed recently?','Latest news')}
 if(!c.news&&Math.random()<.18)pool.push('Anything important in the news?');
 const unique=[...new Set(pool)].slice(0,8);for(let i=unique.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[unique[i],unique[j]]=[unique[j],unique[i]]}return unique.slice(0,Math.min(unique.length,3+Math.floor(Math.random()*2)))}
function submit(q){const i=document.querySelector('.toko-chat .tc-say-row input');if(!i)return;i.value=q;i.focus();i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))}
let painting=false,lastSig='';function ours(menu){const bs=[...menu.children].filter(n=>n.tagName==='BUTTON');return bs.length>=3&&bs.length<=4&&bs.every((b,i)=>b.dataset.liveContext==='1'&&b.textContent.trim().startsWith(`${i+1}.`))}
function paint(root,force=false){if(painting)return;const menu=root.querySelector('.tc-menu');if(!menu||menu.hidden)return;const c=ctx(),sig=`${c.lastToko}|${c.lastYou}|${c.project}|${c.mode}`;if(!force&&ours(menu)&&sig===lastSig)return;painting=true;const qs=buildChoices();menu.replaceChildren(...qs.map((q,i)=>{const b=document.createElement('button');b.type='button';b.dataset.liveContext='1';const n=document.createElement('b');n.textContent=`${i+1}. `;b.append(n,document.createTextNode(q));b.addEventListener('click',()=>submit(q));return b}));const hint=root.querySelector('.tc-foot span:first-child');if(hint)hint.textContent='1-4 PICK · TYPE TO TALK · ESC LEAVE';lastSig=sig;painting=false}
function attach(root){const schedule=()=>queueMicrotask(()=>paint(root));new MutationObserver(schedule).observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});addEventListener('toko:context',()=>queueMicrotask(()=>paint(root,true)));addEventListener('toko:deep-answer',()=>setTimeout(()=>paint(root,true),0));schedule()}
function wait(){const root=document.querySelector('.toko-chat');if(root)return attach(root);requestAnimationFrame(wait)}wait();