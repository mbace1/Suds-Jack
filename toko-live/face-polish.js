// Toko Live v35 — character performance polish. Uses the existing approved Toko character only.
function boot(){
  const stage=document.querySelector('.stage'),canvas=document.querySelector('#toko-stage');
  if(!stage||!canvas)return requestAnimationFrame(boot);
  const reduced=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if(reduced){canvas.style.transform='none';return;}
  let state=stage.dataset.state||'listening',reaction=stage.dataset.reaction||'curious',touch=0,lastTap=0,idleKick=0,nextIdle=performance.now()+7000+Math.random()*7000;
  const profile={listening:{y:0,rot:0,scale:1},thinking:{y:-2.3,rot:-.7,scale:1.004},talking:{y:.8,rot:.28,scale:1.006},pleased:{y:-1.1,rot:.55,scale:1.012},glitch:{y:0,rot:0,scale:1.008}};
  const reactions={agree:{y:-.8,rot:.32,scale:.003},disagree:{y:.2,rot:-.48,scale:0},uncertain:{y:-.25,rot:-.22,scale:.001},curious:{y:-.65,rot:.2,scale:.002},correct:{y:.15,rot:.52,scale:.001},considering:{y:-.2,rot:-.1,scale:0},settled:{y:.15,rot:0,scale:0}};
  let cur={y:0,rot:0,scale:1};
  new MutationObserver(()=>{state=stage.dataset.state||'listening';reaction=stage.dataset.reaction||reaction}).observe(stage,{attributes:true,attributeFilter:['data-state','data-reaction']});
  stage.addEventListener('pointerdown',()=>{touch=1;lastTap=performance.now()},{passive:true});
  function frame(t){
    const p=profile[state]||profile.listening,r=reactions[reaction]||reactions.considering;
    const breathe=Math.sin(t*.00135),slow=Math.sin(t*.00053+.8),fx=parseFloat(stage.style.getPropertyValue('--toko-focus-x'))||0;
    const talking=state==='talking'?Math.sin(t*.0105)*.85:0,pleased=state==='pleased'?Math.sin(t*.0032)*.55:0,think=state==='thinking'?Math.sin(t*.00105)*.28:0;
    const glitch=state==='glitch'?(Math.sin(t*.12)*1.4+Math.sin(t*.071)*.7):0;
    if(touch>0)touch=Math.max(0,1-(t-lastTap)/260);
    if(state==='listening'&&t>nextIdle){idleKick=1;nextIdle=t+8000+Math.random()*7000;}
    idleKick*=.965;
    const targetY=p.y+r.y+breathe*.72+talking+pleased+glitch*.35-touch*1.4-idleKick*.7;
    const targetRot=p.rot+r.rot+slow*.12+think+glitch*.18+fx*.22+idleKick*.24;
    const targetScale=p.scale+r.scale+breathe*.0018+touch*.006;
    cur.y+=(targetY-cur.y)*.075;cur.rot+=(targetRot-cur.rot)*.075;cur.scale+=(targetScale-cur.scale)*.075;
    canvas.style.transformOrigin='50% 52%';
    canvas.style.transform=`translateY(${cur.y.toFixed(2)}px) rotate(${cur.rot.toFixed(2)}deg) scale(${cur.scale.toFixed(4)})`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
boot();
