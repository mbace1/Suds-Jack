// Toko Live v35 — additive character reaction language and short-term continuity.
// No alternate artwork: this only annotates the existing stage for the performance layer.
function boot(){
  const stage=document.querySelector('.stage'),chat=document.querySelector('.toko-chat')||document.querySelector('#chat-slot');
  if(!stage||!chat)return requestAnimationFrame(boot);
  let holdUntil=0,last='curious';
  const classify=text=>{
    const s=(text||'').toLowerCase();
    if(/\b(no|wrong|disagree|not really|instead|but)\b/.test(s))return 'disagree';
    if(/\b(yes|exactly|agree|good|great|right)\b/.test(s))return 'agree';
    if(/\b(maybe|unclear|unsure|depends|could|might)\b/.test(s))return 'uncertain';
    if(/\b(why|how|what if|interesting|curious)\b|\?/.test(s))return 'curious';
    if(/\b(fix|correct|actually|rather|should)\b/.test(s))return 'correct';
    return 'considering';
  };
  const react=(text,who='user')=>{
    const next=classify(text);
    if(performance.now()<holdUntil&&next==='considering')return;
    last=next;holdUntil=performance.now()+(who==='user'?3200:1800);
    stage.dataset.reaction=next;
    stage.dataset.speaker=who;
  };
  new MutationObserver(records=>{
    for(const r of records)for(const n of r.addedNodes){
      if(n.nodeType!==1)continue;
      const text=n.textContent?.trim();if(!text)continue;
      const cls=(n.className||'').toString().toLowerCase();
      const who=/user|you|me/.test(cls)?'user':/assistant|toko|bot/.test(cls)?'toko':'unknown';
      if(who!=='unknown')react(text,who);
    }
  }).observe(chat,{childList:true,subtree:true});
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    stage.style.setProperty('--toko-focus-x',((e.clientX-r.left)/r.width-.5).toFixed(3));
    stage.style.setProperty('--toko-focus-y',((e.clientY-r.top)/r.height-.5).toFixed(3));
  },{passive:true});
  setInterval(()=>{if(performance.now()>holdUntil&&stage.dataset.state==='listening'){stage.dataset.reaction=last==='agree'?'settled':'curious';}},1200);
}
boot();
