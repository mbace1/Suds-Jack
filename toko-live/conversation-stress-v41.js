// Toko Live v41 — deterministic conversation stress checks + duplicate reply guard.
const CASES=[
['status','Where are we with Tiny Hawk?','TINY HAWK'],
['decision','What did we decide about Eeri?','EERI'],
['next','What is next for Piritori?','PIRITORI'],
['opinion','What do you think about Betterment?','BETTERMENT'],
['compare','Compare Hyper Dagger and Suds Jack',null],
['correction','No, Flash Prince should keep the new default animation set','FLASH PRINCE'],
['typo','whats nxt for toko drp','TOKO DROP'],
['followup','Why? ',null]
];
function detect(q){return window.TokoProjectState?.project?.(q)||window.TokoResponseEngine?.detectProject?.(q)||null}
function run(){const rows=CASES.map(([kind,q,want])=>{let answer=null;try{answer=window.TokoProjectState?.answer?.(q)||window.TokoEvidenceOpinion?.answer?.(q)||window.TokoResponseEngine?.answer?.(q)||null}catch{}const got=detect(q);return{kind,q,want,got,projectPass:!want||got===want,answered:!!answer}});const result={version:41,at:new Date().toISOString(),rows,pass:rows.every(x=>x.projectPass)};window.__tokoStress=result;return result}
function bootGuard(){const log=document.querySelector('.toko-chat .tc-log');if(!log)return requestAnimationFrame(bootGuard);let lastText='',lastAt=0;new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1||!n.classList.contains('tc-me'))continue;const text=(n.textContent||'').trim(),now=performance.now();if(text&&text===lastText&&now-lastAt<350){n.remove();continue}lastText=text;lastAt=now}}).observe(log,{childList:true});setTimeout(run,500)}bootGuard();
window.TokoConversationStress={version:41,run,cases:CASES};