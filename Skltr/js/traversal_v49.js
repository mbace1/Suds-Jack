// SKLTR v49 — traversal links are now distance-earned. This module makes that rule visible.
let active=false,goal=0,label='';
const hud=document.createElement('div');
hud.id='skltr-traverse';
Object.assign(hud.style,{position:'fixed',left:'50%',top:'17%',transform:'translateX(-50%)',zIndex:'60',font:'700 11px/1.35 monospace',letterSpacing:'3px',color:'#9bfff0',textAlign:'center',textShadow:'0 0 12px #50ffdc',pointerEvents:'none',opacity:'0',transition:'opacity .2s'});
document.body.appendChild(hud);
addEventListener('skltr-arena',e=>{active=e.detail?.name==='TRAVERSE';goal=e.detail?.meters||0;label=e.detail?.arena||'TRAVERSE';hud.style.opacity=active?'.9':'0'});
function tick(){if(active){const s=window._skltrEncounter?.();const d=Math.min(goal,s?.travel||0),pct=goal?Math.round(d/goal*100):0;hud.innerHTML=`${label}<br><span style="font-size:9px;opacity:.75">${d} / ${goal}m · ${pct}%</span>`}requestAnimationFrame(tick)}tick();
