// SKLTR v84 — clean screenshot-first death screen. Owns the full death layer.
let shown=false,wrap=null;
function data(){try{return window._skltrPlaytest?.()||JSON.parse(localStorage.getItem('skltr-last-playtest')||'{}')}catch{return {}}}
function fmt(sec){sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
function pct(n,d){return d>0?Math.round((n/d)*100):0}
function currentArena(){try{return window._skltrEncounter?.().name||document.getElementById('arena-name')?.textContent||'UNKNOWN'}catch{return'UNKNOWN'}}
function clear(){wrap?.remove();wrap=null;shown=false}
addEventListener('skltr-arena',()=>{if(shown)clear()});
function show(reason='DEATH'){
 if(shown)return;shown=true;
 setTimeout(()=>{
  const r=data(),secs=Math.max(1,(r.durationMs||0)/1000),kills=r.kills||0,melee=r.meleeKills||0,flow=pct(r.flowSeconds||0,secs),shots=r.enemyShots||0,ps=r.playerShots||0,kpm=(kills/(secs/60)).toFixed(1),epm=Math.round(shots/(secs/60)),meleeShare=pct(melee,kills);
  wrap=document.createElement('div');wrap.id='skltr-death-v84';Object.assign(wrap.style,{position:'fixed',inset:'0',zIndex:'2147483000',background:'rgba(2,4,8,.94)',display:'grid',placeItems:'center',padding:'20px',pointerEvents:'none'});
  wrap.innerHTML=`<div style="width:min(92vw,560px);padding:20px;border:1px solid #9bfff088;background:linear-gradient(180deg,#05070d,#05070df2);color:#dffcff;font:12px/1.5 monospace;letter-spacing:1px;box-shadow:0 0 50px #50ffdc22"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;border-bottom:1px solid #9bfff044;padding-bottom:10px;margin-bottom:11px"><div><div style="font-size:11px;letter-spacing:4px;color:#9bfff0">SKLTR v84 · ${reason}</div><div style="font-size:30px;line-height:1;color:#ff6f9d;font-weight:900">RUN DATA</div></div><div style="text-align:right;color:#9bfff0">${fmt(secs)}<br><span style="opacity:.75">${currentArena()}</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px 18px"><div><b>${kills}</b> KILLS</div><div><b>${kpm}</b> KILLS / MIN</div><div><b>${melee}</b> MELEE KILLS</div><div><b>${meleeShare}%</b> MELEE SHARE</div><div><b>${flow}%</b> FLOW UPTIME</div><div><b>${r.flowPeak||0}/3</b> FLOW PEAK</div><div><b>${r.hitsTaken||0}</b> HITS TAKEN</div><div><b>${Math.round(r.damageTaken||0)}</b> DAMAGE</div><div><b>${r.nearMisses||0}</b> MISSED SKIMS</div><div><b>${epm}</b> ENEMY SHOTS / MIN</div><div><b>${ps}</b> PLAYER SHOTS</div><div><b>${shots}</b> ENEMY SHOTS</div></div><div style="border-top:1px solid #9bfff033;margin-top:12px;padding-top:10px;font-size:10px;color:#b9ced3">FLOW ${flow}% · MELEE ${meleeShare}% · DAMAGE / HIT ${r.hitsTaken?((r.damageTaken||0)/r.hitsTaken).toFixed(1):'0.0'}<br>SCREENSHOT THIS REPORT FOR BALANCE TUNING</div></div>`;
  document.body.appendChild(wrap);
 },160);
}
addEventListener('skltr-victory',()=>show('COMPLETE'));
const obs=new MutationObserver(()=>{if(shown)return;const o=document.getElementById('overlay');if(o&&getComputedStyle(o).display!=='none'&&/\bDOWN\b/i.test(o.innerText||''))show('DEATH')});obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});
window._skltrShowDeathDump=()=>show('MANUAL');
