// Toko Move v2.12 — explicit skill moments without a hidden scoring formula.
// These are feedback hooks first; future progression can consume the same events later.
export function mountSkillMoments(tm){
 const m=tm.mobility,ch=tm.challenge;if(!m||!ch||m.__momentsMounted)return;m.__momentsMounted=true;
 let walked=null,transferTick=null;
 const emit=(kind,text,data={})=>{const event={kind,text,tick:tm.flow.clock.tick,...data};(tm.skillMoments||(tm.skillMoments=[])).push(event);if(tm.skillMoments.length>24)tm.skillMoments.shift();ch.say?.(`${kind} · ${text}`);window.dispatchEvent(new CustomEvent('toko-move-moment',{detail:event}));return event;};
 const baseWalk=m.beginWalk.bind(m);m.beginWalk=link=>{const r=baseWalk(link);if(r?.walking)walked={to:r.walking.to,arriveTick:r.walking.arriveTick};return r;};
 const baseGetOff=m.getOff.bind(m);m.getOff=()=>{const r=baseGetOff();if(r?.transfer)transferTick=tm.flow.clock.tick;return r;};
 const baseCatch=ch.catchChoice.bind(ch);ch.catchChoice=(choice,vehicle)=>{const r=baseCatch(choice,vehicle);if(r?.error)return r;const now=tm.flow.clock.tick,line=choice?.legs?.[0]?.line?.label||'service';if(walked&&ch.currentFrom?.()===walked.to&&now-walked.arriveTick>=0&&now-walked.arriveTick<=8){emit('INTERCEPTED',`${line} after walking · ${now-walked.arriveTick}t margin`,{line,margin:now-walked.arriveTick});walked=null;}if(transferTick!=null&&now-transferTick<=6){emit('TIGHT CONNECTION',`${line} · ${now-transferTick}t transfer`,{line,margin:now-transferTick});transferTick=null;}return r;};
 tm.moments={emit,list:()=>[...(tm.skillMoments||[])]};
}
