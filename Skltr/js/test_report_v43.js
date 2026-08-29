import { Player } from './player.js?v=12';

// SKLTR v43 — tester-facing report. Keeps instrumentation invisible during play,
// then exposes the useful numbers on death or 10-minute completion so mobile tests
// can be reported without opening devtools.
let shown=false;
function report(){try{return window._skltrPlaytest?.()||JSON.parse(localStorage.getItem('skltr-last-playtest')||'{}')}catch{return {}}}
function pct(n,d){return d>0?Math.round(n/d*100):0}
function show(reason){
  if(shown)return;shown=true;
  setTimeout(()=>{
    const r=report(),secs=Math.max(1,(r.durationMs||0)/1000),flow=pct(r.flowSeconds||0,secs);
    const panel=document.createElement('div');panel.id='skltr-test-report';
    Object.assign(panel.style,{position:'fixed',left:'50%',bottom:'18px',transform:'translateX(-50%)',zIndex:'40',pointerEvents:'none',minWidth:'min(92vw,520px)',padding:'10px 14px',border:'1px solid #9bfff088',background:'#05070ddd',color:'#dffcff',font:'11px/1.45 monospace',letterSpacing:'1px',textAlign:'center',boxShadow:'0 0 24px #50ffdc26'});
    panel.innerHTML=`<div style="font-weight:800;letter-spacing:3px;color:#9bfff0">TEST REPORT · ${reason}</div><div>${r.kills||0} KILLS · ${r.meleeKills||0} MELEE · FLOW ${flow}% · PEAK ${r.flowPeak||0}/3</div><div>${r.hitsTaken||0} HITS · ${Math.round(r.damageTaken||0)} DMG · ${r.nearMisses||0} MISSED SKIMS</div><div>${r.playerShots||0} PLAYER SHOTS · ${r.enemyShots||0} ENEMY SHOTS</div>`;
    document.body.appendChild(panel);
  },120);
}
addEventListener('skltr-victory',()=>show('COMPLETE'));
const oldHurt=Player.prototype.hurt;
Player.prototype.hurt=function(...args){const was=this.alive,out=oldHurt.apply(this,args);if(was&&!this.alive)show('DEATH');return out};
window._skltrShowTestReport=()=>show('MANUAL');
