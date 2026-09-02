// Toko Live v36 — bridge semantic understanding into character performance.
function boot(){
  const stage=document.querySelector('.stage'),log=document.querySelector('.toko-chat .tc-log');
  if(!stage||!log)return requestAnimationFrame(boot);
  let lastUserIntent='listen',lastProject='',until=0;
  const norm=s=>String(s||'').toLowerCase();
  const project=text=>window.TokoResponseEngine?.detectProject?.(text)||'';
  const intent=text=>{
    const s=norm(text);
    if(/^(no|actually|correction|wrong|not quite)|\b(disagree|remove|cut|broken|worse)\b/.test(s))return 'correct';
    if(/\b(why|how come|reason|because)\b/.test(s))return 'probe';
    if(/\b(compare|versus|\bvs\b|difference|between)\b/.test(s))return 'compare';
    if(/\b(next|what now|priority|prioritize|roadmap)\b/.test(s))return 'next';
    if(/\b(test|check|verify|bug|issue|problem|fix)\b/.test(s))return 'inspect';
    if(/\b(good|great|yes|exactly|keep|works|better)\b/.test(s))return 'agree';
    if(/\?|\b(think|opinion|idea|maybe|could)\b/.test(s))return 'curious';
    return 'listen';
  };
  const reactionFor={correct:'correct',probe:'curious',compare:'considering',next:'curious',inspect:'uncertain',agree:'agree',curious:'curious',listen:'settled'};
  function onUser(text){
    lastUserIntent=intent(text);lastProject=project(text)||lastProject;until=performance.now()+4200;
    stage.dataset.intent=lastUserIntent;stage.dataset.reaction=reactionFor[lastUserIntent]||'considering';
    if(lastProject)stage.dataset.project=String(lastProject).toLowerCase().replace(/\s+/g,'-');
  }
  function onToko(){
    // Toko's own prose must never redefine the user's project, intent or stored stance.
    stage.dataset.speaker='toko';
    if(performance.now()<until)stage.dataset.reaction=reactionFor[lastUserIntent]||stage.dataset.reaction;
  }
  new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;const nodes=n.matches?.('.tc-you,.tc-me')?[n]:[...(n.querySelectorAll?.('.tc-you,.tc-me')||[])];for(const el of nodes){const text=el.textContent?.trim();if(!text)continue;if(el.classList.contains('tc-you'))onUser(text);else if(el.classList.contains('tc-me'))onToko();}}}).observe(log,{childList:true,subtree:true});
  setInterval(()=>{if(performance.now()>until&&stage.dataset.state==='listening')stage.dataset.reaction='settled'},1000);
  window.TokoSemanticPerformance={intent,project,get state(){return{intent:lastUserIntent,project:lastProject}}};
}
boot();
