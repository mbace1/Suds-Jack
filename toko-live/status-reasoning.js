const ORDER={
'TINY HAWK':['right-stick load/flick reliability','low chase-camera readability','playable movement feel','visual polish'],
'EERI':['platform/run/jump/climb readability','machine interaction clarity','level readability for young players','environmental polish'],
'PIRITORI':['Era I feature completion','map/market/encounter loop','combat readability','diorama location fidelity'],
'BETTERMENT':['mobile Today UX','five-goal progress logic','functional nav destinations','companion/art polish'],
'HYPER DAGGER':['Devil Daggers feel parity','skull threat and mouth animation','weapon/enemy readability','background restraint'],
'SUDS JACK':['lower Tempest-like camera','ramp/topography depth','lane readability','versioned playable verification'],
'FLASH PRINCE':['fix jump/climb glitches','separate animation sets by character','shooting/shield mechanic','environment detail'],
'TOKO DROP':['round/dash/shoot core loop','combat readability','roguelite upgrade cadence','gelatin visual polish']};
function projectFrom(s){return Object.keys(ORDER).find(p=>String(s||'').toUpperCase().includes(p))||null}
function next(project){const ds=window.TokoDecisionMemory?.list(project)||[];const rejected=ds.filter(x=>x.type==='rejected').map(x=>x.text).join(' ');const approved=ds.filter(x=>x.type==='approved').map(x=>x.text).join(' ');const items=(ORDER[project]||[]).filter(x=>!rejected.toLowerCase().includes(x.toLowerCase())).slice(0,3);let text=`${project}: I would work on ${items.join(' → ')}.`;if(approved)text+=` I am preserving the approved direction in memory.`;if(rejected)text+=` I am avoiding previously rejected directions.`;return text}
addEventListener('keydown',e=>{const i=document.querySelector('.toko-chat .tc-say-row input');if(e.key!=='Enter'||e.target!==i)return;const q=i.value.trim(),p=projectFrom(q);if(!p||!/what should we work on|what'?s next|what is next|status|priority|priorities/i.test(q))return;e.stopImmediatePropagation();e.preventDefault();i.value='';const log=document.querySelector('.toko-chat .tc-log');if(log){const d=document.createElement('div');d.className='tc-me';d.textContent=next(p);log.appendChild(d);log.scrollTop=log.scrollHeight}},true);
window.TokoStatusReasoning={next};