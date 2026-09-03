// SKLTR v115 — readable enemy missile pressure.
// Enemy homing missiles are deliberately slow; this layer makes the launch legible
// without adding another control or breaking movement flow.
const hud=document.createElement('div');hud.id='skltr-missile-warning';hud.textContent='MISSILE';
Object.assign(hud.style,{position:'fixed',left:'50%',top:'12%',transform:'translateX(-50%) scale(.92)',zIndex:'92',font:'900 12px/1 monospace',letterSpacing:'5px',color:'#ff8a68',textShadow:'0 0 8px #ff6f4d,0 0 22px #ff3c2e',pointerEvents:'none',opacity:'0',transition:'opacity .12s,transform .12s'});document.body.appendChild(hud);
let t=0,count=0;
addEventListener('skltr-enemy-missile',()=>{count++;t=1.15;hud.style.opacity='1';hud.style.transform='translateX(-50%) scale(1.08)';setTimeout(()=>hud.style.transform='translateX(-50%) scale(1)',90)});
function tick(){if(t>0){t=Math.max(0,t-.016);const p=.72+.28*Math.sin(performance.now()*.022);hud.style.opacity=String(Math.min(1,t*1.7)*p)}else hud.style.opacity='0';requestAnimationFrame(tick)}tick();
window._skltrMissileWarning115=()=>({warnings:count,active:t>0});
