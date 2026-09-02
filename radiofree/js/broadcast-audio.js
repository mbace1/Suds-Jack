// Radio Free Helsinki — restrained station identity/event cues.
import { initAmbient } from './ambiences.js?v=61';
const state={last:0};
export function broadcastCue(kind='id',intensity=.35){
  initAmbient();
  const now=performance.now(); if(now-state.last<1800)return; state.last=now;
  const map={id:[880,.16,.025],field:[520,.22,.018],interference:[145,.09,.012],alert:[1040,.12,.018]};
  const [freq,len,gain]=map[kind]||map.id;
  const ctx=window.__RFH_AUDIO_CONTEXT__,out=window.__RFH_AUDIO_OUT__; if(!ctx||!out)return;
  const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;
  o.type=kind==='interference'?'square':'sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.72,t+len);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain*intensity,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+len);
  o.connect(g).connect(out);o.start(t);o.stop(t+len+.02);
}
