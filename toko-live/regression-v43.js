// Toko Live v43 — runtime regression diagnostics. Passive: never generates chat replies.
const CASES=[
 ['status','Where are we with Tiny Hawk?','TINY HAWK'],
 ['decision','What did we decide about Eeri?','EERI'],
 ['next','What is next for Piritori?','PIRITORI'],
 ['opinion','What do you think about Betterment?','BETTERMENT'],
 ['typo','whats nxt for toko drp','TOKO DROP'],
 ['switch','What is next for Flash Prince?','FLASH PRINCE']
];
const detect=q=>window.TokoProjectState?.project?.(q)||window.TokoResponseEngine?.detectProject?.(q)||null;
function run(){const rows=CASES.map(([kind,q,want])=>{const got=detect(q);let answer=null;try{answer=window.TokoProjectState?.answer?.(q)||window.TokoEvidenceOpinion?.answer?.(q)||window.TokoResponseEngine?.answer?.(q)||null}catch{}return{kind,q,want,got,projectPass:got===want,answered:!!answer}});const result={version:43,at:new Date().toISOString(),rows,pass:rows.every(r=>r.projectPass&&r.answered)};window.__tokoRegression=result;return result}
function boot(){const log=document.querySelector('.toko-chat .tc-log');if(!log)return requestAnimationFrame(boot);let lastUser='',replyCount=0,timer=0;new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.classList.contains('tc-you')){lastUser=(n.textContent||'').trim();replyCount=0;clearTimeout(timer);timer=setTimeout(()=>{if(replyCount>1)dispatchEvent(new CustomEvent('toko:regression-warning',{detail:{type:'multiple-replies',query:lastUser,count:replyCount}}))},700)}else if(n.classList.contains('tc-me'))replyCount++}}).observe(log,{childList:true});setTimeout(run,700)}
boot();window.TokoRegression={version:43,run,cases:CASES};