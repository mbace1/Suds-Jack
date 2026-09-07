// SKLTR v34 — melee feedback without interrupting movement.
// Screen-space slash, enemy-position burst cue, tiny audio transient and FLOW pulse.
let ctx=null;
function audio(){
  try{
    ctx ||= new (window.AudioContext||window.webkitAudioContext)();
    const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(72,t+.055);
    g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.065);
    o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+.07);
  }catch{}
}
function ensure(){
  if(document.getElementById('melee-fx'))return;
  const s=document.createElement('style');s.textContent=`
  #melee-fx{position:fixed;inset:0;pointer-events:none;z-index:20;overflow:hidden}
  .skltr-slash{position:absolute;left:50%;top:50%;width:28vw;height:2px;background:#fff;box-shadow:0 0 14px #fff,0 0 30px #50ffdc;transform:translate(-50%,-50%) rotate(var(--a)) scaleX(.1);opacity:0;animation:skltrSlash .11s ease-out forwards}
  .skltr-burst{position:absolute;left:50%;top:50%;width:18px;height:18px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 18px #50ffdc;transform:translate(-50%,-50%) scale(.2);opacity:0;animation:skltrBurst .18s ease-out forwards}
  @keyframes skltrSlash{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) scaleX(.1)}28%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) scaleX(1.25)}}
  @keyframes skltrBurst{0%{opacity:1;transform:translate(-50%,-50%) scale(.2)}100%{opacity:0;transform:translate(-50%,-50%) scale(4.2)}}`;
  document.head.appendChild(s);const fx=document.createElement('div');fx.id='melee-fx';document.body.appendChild(fx);
}
ensure();
addEventListener('skltr-melee-kill',()=>{
  ensure();audio();
  const fx=document.getElementById('melee-fx');
  const slash=document.createElement('div');slash.className='skltr-slash';slash.style.setProperty('--a',`${-28+Math.random()*56}deg`);fx.appendChild(slash);
  const burst=document.createElement('div');burst.className='skltr-burst';fx.appendChild(burst);
  setTimeout(()=>slash.remove(),160);setTimeout(()=>burst.remove(),240);
  const flow=document.getElementById('flow-state');if(flow){flow.classList.remove('pulse');void flow.offsetWidth;flow.classList.add('pulse');}
});
