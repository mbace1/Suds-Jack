import { Player } from './player.js?v=12';

// SKLTR v80 — screenshot-first death data dump with clean restart behavior.
let shown=false;
function data(){try{return window._skltrPlaytestFinalize?.()||window._skltrPlaytest?.()||JSON.parse(localStorage.getItem('skltr-last-playtest')||'{}')}catch{return {}}}
function fmt(sec){sec=Math.max(0,Math.round(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`}
function pct(n,d){return d>0?Math.round((n/d)*100):0}
function currentArena(){try{return window._skltrEncounter?.().name||document.getElementById('arena-name')?.textContent||'UNKNOWN'}catch{return 'UNKNOWN'}}
function killFeedbackUI(){const old=document.getElementById('skltr-test-report');if(old)old.style.display='none'}
function show(reason='DEATH'){
  if(shown)return;shown=true;
  setTimeout(()=>{
    killFeedbackUI();
    const r=data(),secs=Math.max(1,(r.durationMs||0)/1000),kills=r.kills||0,melee=r.meleeKills||0;
    const flow=pct(r.flowSeconds||0,secs),shots=r.enemyShots||0,ps=r.playerShots||0;
    const kpm=(kills/(secs/60)).toFixed(1),epm=Math.round(shots/(secs/60)),meleeShare=pct(melee,kills);
    const panel=document.createElement('div');panel.id='skltr-death-dump';
    Object.assign(panel.style,{position:'fixed',left:'50%',top:'47%',transform:'translate(-50%,-50%)',zIndex:'2147482500',width:'min(90vw,560px)',padding:'18px 18px 16px',border:'1px solid #9bfff088',background:'linear-gradient(180deg,#05070df2,#05070ddd)',color:'#dffcff',font:'12px/1.5 monospace',letterSpacing:'1px',textAlign:'left',boxShadow:'0 0 40px #50ffdc22',backdropFilter:'blur(5px)',pointerEvents:'none'});
    panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-end;border-bottom:1px solid #9bfff044;padding-bottom:9px;margin-bottom:10px"><div><div style="font-size:11px;letter-spacing:4px;color:#9bfff0">SKLTR v80 · ${reason}</div><div style="font-size:28px;line-height:1.1;color:#ff6f9d;font-weight:800">RUN DATA</div></div><div style="text-align:right;color:#9bfff0">${fmt(secs)}<br><span style="opacity:.7">${currentArena()}</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 18px"><div><b>${kills}</b> KILLS</div><div><b>${kpm}</b> KILLS / MIN</div><div><b>${melee}</b> MELEE KILLS</div><div><b>${meleeShare}%</b> MELEE SHARE</div><div><b>${flow}%</b> FLOW UPTIME</div><div><b>${r.flowPeak||0}/3</b> FLOW PEAK</div><div><b>${r.hitsTaken||0}</b> HITS TAKEN</div><div><b>${Math.round(r.damageTaken||0)}</b> DAMAGE</div><div><b>${r.nearMisses||0}</b> MISSED SKIMS</div><div><b>${epm}</b> ENEMY SHOTS / MIN</div><div><b>${ps}</b> PLAYER SHOTS</div><div><b>${shots}</b> ENEMY SHOTS</div></div><div style="border-top:1px solid #9bfff033;margin-top:11px;padding-top:9px;font-size:10px;line-height:1.55;color:#b9ced3">FLOW ${flow}% · MELEE ${meleeShare}% · DAMAGE / HIT ${r.hitsTaken?((r.damageTaken||0)/r.hitsTaken).toFixed(1):'0.0'}<br>SCREENSHOT THIS REPORT FOR BALANCE TUNING</div>`;
    document.body.appendChild(panel);
  },180);
}
addEventListener('skltr-victory',()=>show('COMPLETE'));
const deathObserver=new MutationObserver(()=>{if(shown)return;const o=document.getElementById('overlay');if(o&&getComputedStyle(o).display!=='none'&&/\bDOWN\b/i.test(o.innerText||''))show('DEATH')});
deathObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});
const oldReset=Player.prototype.reset;
Player.prototype.reset=function(...a){const out=oldReset.apply(this,a);shown=false;document.getElementById('skltr-death-dump')?.remove();return out};
window._skltrShowDeathDump=()=>show('MANUAL');
