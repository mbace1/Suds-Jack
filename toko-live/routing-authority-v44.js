// Toko Live v44 — single-answer authority for high-confidence project questions.
// Loaded before specialist handlers so one authoritative route wins and freeform still falls through.
const norm=s=>String(s||'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
const PROJECT_ALIASES=[
 ['TINY HAWK',/\b(?:tiny\s*hawk|tinyhawk|tiny\s*hok)\b/i],['EERI',/\beeri\b/i],['PIRITORI',/\b(?:piritori|piritorri|piritory)\b/i],
 ['BETTERMENT',/\b(?:betterment|bettermnt)\b/i],['HYPER DAGGER',/\b(?:hyper\s*dagger|hyperdagger|hyper\s*dagr)\b/i],
 ['SUDS JACK',/\b(?:suds\s*jack|sudsjack)\b/i],['FLASH PRINCE',/\b(?:flash\s*prince|flashprince|flash\s*prnce)\b/i],
 ['TOKO DROP',/\b(?:toko\s*drop|tokodrop|toko\s*drp)\b/i]
];
function explicitProject(q){for(const [p,re] of PROJECT_ALIASES)if(re.test(q))return p;return null}
function intent(q){const s=norm(q);if(/\b(what did we decide|decision memory|what have i approved|what did i reject|what was rejected|what changed|superseded|undecided|why did we decide|what do you remember)\b/.test(s))return'decision';if(/\b(what do you think|your opinion|do you agree|do you disagree|would you change|changed your mind|still think|convince me|should we)\b/.test(s))return'opinion';if(/\b(status|where are we|current state|state of)\b/.test(s))return'status';if(/\b(what(?:'s| is) next|whats nxt|what is nxt|next priority|work on next|do now|what now)\b/.test(s))return'next';return null}
function append(who,text){const log=document.querySelector('.toko-chat .tc-log');if(!log)return;const d=document.createElement('div');d.className=who==='you'?'tc-you':'tc-me';d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight}
function answer(q,k,p){if(k==='decision')return window.TokoDecisionMemory?.answer?.(q)||window.TokoDecisionMemory?.summary?.(p)||null;if(k==='opinion')return window.TokoEvidenceOpinion?.answer?.(q)||null;if(k==='status'||k==='next')return window.TokoProjectState?.answer?.(q)||null;return null}
function boot(){const input=document.querySelector('.toko-chat .tc-say-row input');if(!input)return requestAnimationFrame(boot);input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=input.value.trim();if(!q)return;const k=intent(q);if(!k)return;const p=explicitProject(q)||window.TokoProjectState?.project?.(q)||null;if(!p&&k!=='decision')return;const r=answer(q,k,p);if(!r)return;e.preventDefault();e.stopImmediatePropagation();append('you',q);input.value='';const st=document.querySelector('.stage');if(st){st.dataset.reaction=k==='decision'?'considering':k==='opinion'?'curious':'curious';st.dataset.route='v44-authority'}setTimeout(()=>append('toko',r),55)},true)}
boot();window.TokoRoutingAuthority={version:44,intent,explicitProject};